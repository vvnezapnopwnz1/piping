-- Track 05: material checks retain the BOM and PML evidence that justified progress.

alter table public.construction_progress_events
  drop constraint construction_progress_events_source_check,
  add constraint construction_progress_events_source_check
    check (source in ('manual', 'derived', 'revision_copy', 'compensation'));

create table public.material_check_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null unique references public.spool_revisions(id) on delete restrict,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  checked_on date not null,
  checked_by uuid references public.profiles(id) on delete set null,
  command_receipt_id uuid references public.command_receipts(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.material_check_items (
  id uuid primary key default gen_random_uuid(),
  material_check_record_id uuid not null references public.material_check_records(id) on delete cascade,
  spool_revision_material_id uuid not null references public.spool_revision_materials(id) on delete restrict,
  piping_material_record_id uuid not null references public.piping_material_records(id) on delete restrict,
  checked_quantity numeric(12, 3) check (
    checked_quantity is null
    or (checked_quantity >= 0 and checked_quantity <> 'NaN'::numeric)
  ),
  created_at timestamptz not null default timezone('utc', now()),
  unique (material_check_record_id, spool_revision_material_id)
);

create index material_check_items_pml_idx on public.material_check_items (piping_material_record_id);

-- Read policies cannot traverse the engineering definition tables directly: their RLS is
-- intentionally guarded by spooling.view, while fabrication users need only fabrication.view.
create function public.current_user_can_read_fabrication_spool(
  target_project_id uuid,
  target_spool_revision_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.spool_revisions spool_revision
    join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
    join public.isometrics iso on iso.id = revision.isometric_id
    where spool_revision.id = target_spool_revision_id
      and iso.project_id = target_project_id
      and public.current_user_has_capability(target_project_id, 'fabrication.view')
      and public.current_user_in_pds_scope(target_project_id, revision.pds_area_id)
  );
$$;

create or replace function public.record_material_check(
  target_spool_revision_id uuid,
  target_checked_on date,
  target_items jsonb,
  target_qc13_form_id uuid default null,
  target_idempotency_key text default null
)
returns public.material_check_records
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  context public.spool_context;
  claimed jsonb;
  record_row public.material_check_records;
  item_value jsonb;
  item_ident_code text;
  item_trace_number text;
  item_quantity numeric(12, 3);
  bom_row public.spool_revision_materials;
  pml_row public.piping_material_records;
  prior_checked_item public.material_check_items;
  derived_event public.construction_progress_events;
  before_snapshot jsonb;
  after_snapshot jsonb;
  seen_ident_codes text[] := array[]::text[];
begin
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_material_check', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into record_row from jsonb_populate_record(null::public.material_check_records, claimed -> 'result' -> 'record');
    return record_row;
  end if;

  if target_checked_on is null
     or coalesce(jsonb_typeof(target_items), '') <> 'array'
     or coalesce(jsonb_array_length(target_items), 0) = 0 then
    raise exception 'A checked date and non-empty material item array are required' using errcode = '23514';
  end if;
  if public.effective_stage_date(target_spool_revision_id, 'start_fab') is null then
    raise exception 'Fabrication must start before material checking' using errcode = 'PQC32';
  end if;
  if target_qc13_form_id is not null and not exists (
    select 1 from public.qc13_progress_forms form
    where form.id = target_qc13_form_id and form.project_id = context.project_id
      and form.spool_revision_id = target_spool_revision_id
  ) then
    raise exception 'QC-13 form does not belong to this spool revision' using errcode = 'PQC30';
  end if;

  -- One spool's snapshots, evidence upserts, derived event, and audit must be ordered
  -- together so a later command cannot base its before_state on a stale item set.
  perform pg_advisory_xact_lock(hashtextextended(target_spool_revision_id::text, 0));

  select jsonb_build_object(
    'record', to_jsonb(existing_record),
    'evidence', jsonb_build_object('items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'material_check_item_id', existing_item.id,
        'spool_revision_material_id', existing_item.spool_revision_material_id,
        'piping_material_record_id', existing_item.piping_material_record_id,
        'ident_code', existing_material.ident_code,
        'trace_number', existing_pml.trace_number,
        'quantity', existing_item.checked_quantity
      ) order by existing_material.ident_code, existing_pml.trace_number)
      from public.material_check_items existing_item
      join public.spool_revision_materials existing_material on existing_material.id = existing_item.spool_revision_material_id
      join public.piping_material_records existing_pml on existing_pml.id = existing_item.piping_material_record_id
      where existing_item.material_check_record_id = existing_record.id
    ), '[]'::jsonb))
  ) into before_snapshot
  from public.material_check_records existing_record
  where existing_record.spool_revision_id = target_spool_revision_id;

  insert into public.material_check_records (
    project_id, spool_revision_id, qc13_form_id, checked_on, checked_by, command_receipt_id
  ) values (
    context.project_id, target_spool_revision_id, target_qc13_form_id, target_checked_on, auth.uid(),
    nullif(claimed ->> 'receipt_id', '')::uuid
  )
  on conflict (spool_revision_id) do update
    set qc13_form_id = coalesce(excluded.qc13_form_id, material_check_records.qc13_form_id),
        checked_on = excluded.checked_on,
        checked_by = excluded.checked_by,
        updated_at = timezone('utc', now())
  returning * into record_row;

  for item_value in select value from jsonb_array_elements(target_items)
  loop
    if jsonb_typeof(item_value) <> 'object'
       or coalesce(trim(item_value ->> 'ident_code'), '') = ''
       or coalesce(trim(item_value ->> 'trace_number'), '') = '' then
      raise exception 'Every material item needs ident_code and trace_number' using errcode = '23514';
    end if;
    item_ident_code := trim(item_value ->> 'ident_code');
    item_trace_number := trim(item_value ->> 'trace_number');
    if item_ident_code = any(seen_ident_codes) then
      raise exception 'Each material ident code may appear only once per command' using errcode = '23514';
    end if;
    seen_ident_codes := array_append(seen_ident_codes, item_ident_code);
    begin
      item_quantity := case when item_value ? 'quantity' then (item_value ->> 'quantity')::numeric(12, 3) else null end;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Material quantity is invalid' using errcode = '23514';
    end;
    if item_quantity is not null
       and (item_quantity < 0 or item_quantity = 'NaN'::numeric) then
      raise exception 'Material quantity must be a non-negative finite number' using errcode = '23514';
    end if;

    select * into bom_row from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
      and material.ident_code = item_ident_code
      and (material.trace_number is null or material.trace_number = item_trace_number)
    order by material.trace_number nulls last
    limit 1;
    if not found then
      raise exception 'Material ident is not in this spool revision BOM' using errcode = 'PQC30';
    end if;
    select * into pml_row from public.piping_material_records pml
    where pml.project_id = context.project_id and pml.ident_code = item_ident_code
      and pml.trace_number = item_trace_number and pml.status = 'active';
    if not found then
      raise exception 'Active piping material evidence is missing' using errcode = 'PQC33';
    end if;
    select * into prior_checked_item
    from public.material_check_items checked
    where checked.material_check_record_id = record_row.id
      and checked.spool_revision_material_id = bom_row.id;
    if found then
      if prior_checked_item.piping_material_record_id <> pml_row.id then
        raise exception 'Accepted material evidence cannot be rewritten' using errcode = '23514';
      end if;
      if item_quantity is not null
         and prior_checked_item.checked_quantity is distinct from item_quantity then
        raise exception 'Accepted material quantity cannot be rewritten' using errcode = '23514';
      end if;
    else
      insert into public.material_check_items (
        material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity
      ) values (record_row.id, bom_row.id, pml_row.id, item_quantity);
    end if;
  end loop;

  select jsonb_build_object(
    'record', to_jsonb(record_row),
    'evidence', jsonb_build_object('items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'material_check_item_id', accepted_item.id,
        'spool_revision_material_id', accepted_item.spool_revision_material_id,
        'piping_material_record_id', accepted_item.piping_material_record_id,
        'ident_code', accepted_material.ident_code,
        'trace_number', accepted_pml.trace_number,
        'quantity', accepted_item.checked_quantity
      ) order by accepted_material.ident_code, accepted_pml.trace_number)
      from public.material_check_items accepted_item
      join public.spool_revision_materials accepted_material on accepted_material.id = accepted_item.spool_revision_material_id
      join public.piping_material_records accepted_pml on accepted_pml.id = accepted_item.piping_material_record_id
      where accepted_item.material_check_record_id = record_row.id
    ), '[]'::jsonb)),
    'counters', jsonb_build_object(
      'accepted_item_count', (select count(*) from public.material_check_items where material_check_record_id = record_row.id),
      'bom_item_count', (select count(*) from public.spool_revision_materials where spool_revision_id = target_spool_revision_id)
    )
  ) into after_snapshot;

  if exists (
    select 1 from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
  ) and not exists (
    select 1 from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
      and not exists (
        select 1 from public.material_check_items checked
        where checked.material_check_record_id = record_row.id
          and checked.spool_revision_material_id = material.id
      )
  ) and not exists (
    select 1 from public.construction_progress_events event
    where event.spool_revision_id = target_spool_revision_id and event.stage = 'material_check'
      and event.source <> 'compensation'
      and not exists (select 1 from public.construction_progress_events compensation where compensation.compensates_event_id = event.id)
  ) then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, payload, source, actor_id
    ) values (
      context.project_id, target_spool_revision_id, 'fabrication', 'material_check', target_checked_on,
      jsonb_build_object('material_check_record_id', record_row.id), 'derived', auth.uid()
    ) returning * into derived_event;
    insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
    values (context.project_id, auth.uid(), 'construction_progress_events', derived_event.id, 'derive_material_check', to_jsonb(derived_event));
  end if;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (
    context.project_id, auth.uid(), 'material_check_records', record_row.id, 'record_material_check', before_snapshot,
    after_snapshot || jsonb_build_object('submitted_items', target_items)
  );
  perform public.complete_command_receipt(
    context.project_id, 'record_material_check', target_idempotency_key,
    jsonb_build_object('record', to_jsonb(record_row))
  );
  return record_row;
end;
$$;

alter table public.material_check_records enable row level security;
alter table public.material_check_items enable row level security;

create policy "read material check records" on public.material_check_records for select to authenticated
  using (public.current_user_can_read_fabrication_spool(project_id, spool_revision_id));
create policy "read material check items" on public.material_check_items for select to authenticated
  using (exists (
    select 1 from public.material_check_records record
    where record.id = material_check_items.material_check_record_id
      and public.current_user_can_read_fabrication_spool(record.project_id, record.spool_revision_id)
  ));

grant select on public.material_check_records, public.material_check_items to authenticated;
revoke insert, update, delete, truncate on public.material_check_records, public.material_check_items from authenticated, anon;
revoke all on function public.current_user_can_read_fabrication_spool(uuid, uuid) from public, anon;
revoke all on function public.record_material_check(uuid, date, jsonb, uuid, text) from public, anon;
grant execute on function public.current_user_can_read_fabrication_spool(uuid, uuid) to authenticated;
grant execute on function public.record_material_check(uuid, date, jsonb, uuid, text) to authenticated;
