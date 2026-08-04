-- Track 07: erection progress commands and shared field material/support evidence.

create or replace function public.record_erection_progress(
  target_spool_revision_id uuid,
  target_stage public.construction_stage,
  target_occurred_on date,
  target_payload jsonb default '{}'::jsonb,
  target_idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  claimed jsonb;
  event_row public.construction_progress_events;
  policy_row public.construction_phase_stages;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'erection.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_erection_progress', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into event_row
    from jsonb_populate_record(null::public.construction_progress_events, claimed -> 'result' -> 'event');
    return event_row;
  end if;

  select * into policy_row
  from public.construction_phase_stages
  where phase = 'erection' and stage = target_stage;
  if policy_row.phase is null then
    raise exception 'This stage does not belong to the erection phase' using errcode = 'PQC52';
  end if;
  if target_stage = 'rft' then
    raise exception 'RFT is derived and cannot be set by hand' using errcode = 'PQC55';
  end if;
  if not policy_row.is_recordable then
    raise exception 'This stage is derived or does not belong to this phase, and cannot be recorded manually'
      using errcode = 'PQC52';
  end if;
  if target_occurred_on is null or jsonb_typeof(coalesce(target_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'A date and object payload are required' using errcode = '23514';
  end if;
  if target_stage <> 'to_site'
     and public.effective_stage_date(target_spool_revision_id, 'erection', 'to_site') is null then
    raise exception 'The spool must be recorded To Site before this erection step' using errcode = 'PQC54';
  end if;
  if target_stage in ('welded_bolted', 'supported')
     and public.effective_stage_date(target_spool_revision_id, 'erection', 'erected') is null then
    raise exception 'An earlier erection step has not been recorded for this spool' using errcode = 'PQC53';
  end if;
  if target_stage = 'supported'
     and public.effective_stage_date(target_spool_revision_id, 'erection', 'welded_bolted') is null then
    raise exception 'An earlier erection step has not been recorded for this spool' using errcode = 'PQC53';
  end if;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on, payload, actor_id
  )
  values (
    context.project_id, target_spool_revision_id, 'erection', target_stage,
    target_occurred_on, coalesce(target_payload, '{}'::jsonb), auth.uid()
  )
  returning * into event_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'construction_progress_events', event_row.id,
          'record_erection_progress', to_jsonb(event_row));
  perform public.complete_command_receipt(
    context.project_id, 'record_erection_progress', target_idempotency_key,
    jsonb_build_object('event', to_jsonb(event_row))
  );
  return event_row;
end;
$$;

-- Let the shared material validation be used by an erection contributor while preserving
-- fabrication's existing capability and command contract.
create or replace function public.current_user_can_read_fabrication_spool(
  target_project_id uuid,
  target_spool_revision_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.spool_revisions spool_revision
    join public.isometric_revisions revision on revision.id = spool_revision.isometric_revision_id
    join public.isometrics iso on iso.id = revision.isometric_id
    where spool_revision.id = target_spool_revision_id
      and iso.project_id = target_project_id
      and (public.current_user_has_capability(target_project_id, 'fabrication.view')
           or public.current_user_has_capability(target_project_id, 'erection.view'))
      and public.current_user_in_pds_scope(target_project_id, revision.pds_area_id)
  );
$$;

-- The phase is an argument, not a guess. Inferring it from the caller's capabilities made a
-- field check by anyone who also holds fabrication.progress.record take the fabrication branch.
drop function if exists public.record_material_check(uuid, date, jsonb, uuid, text);

create function public.record_material_check(
  target_spool_revision_id uuid,
  target_checked_on date,
  target_items jsonb,
  target_qc13_form_id uuid default null,
  target_idempotency_key text default null,
  target_phase public.construction_phase default 'fabrication'
)
returns public.material_check_records
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  target_project_id uuid;
  required_capability text;
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
  select iso.project_id into target_project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;
  if target_project_id is null then
    raise exception 'Construction target is missing' using errcode = 'PQC30';
  end if;
  if target_phase not in ('fabrication', 'erection') then
    raise exception 'Assembly is not enabled on this project' using errcode = 'PQC50';
  end if;
  required_capability := case target_phase
    when 'erection' then 'erection.progress.record'
    else 'fabrication.progress.record'
  end;
  context := public.assert_construction_target(target_spool_revision_id, required_capability);
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
  if target_phase = 'fabrication'
     and public.effective_stage_date(target_spool_revision_id, 'fabrication', 'start_fab') is null then
    raise exception 'Fabrication must start before material checking' using errcode = 'PQC32';
  end if;
  if target_phase = 'erection'
     and public.effective_stage_date(target_spool_revision_id, 'erection', 'to_site') is null then
    raise exception 'The spool must be recorded To Site before field material checking' using errcode = 'PQC54';
  end if;
  if target_qc13_form_id is not null and not exists (
    select 1 from public.qc13_progress_forms form
    where form.id = target_qc13_form_id and form.project_id = context.project_id
      and form.spool_revision_id = target_spool_revision_id
  ) then
    raise exception 'QC-13 form does not belong to this spool revision' using errcode = 'PQC30';
  end if;

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
        checked_on = excluded.checked_on, checked_by = excluded.checked_by,
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
    if item_quantity is not null and (item_quantity < 0 or item_quantity = 'NaN'::numeric) then
      raise exception 'Material quantity must be a non-negative finite number' using errcode = '23514';
    end if;
    select * into bom_row from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
      and material.ident_code = item_ident_code
      and (material.trace_number is null or material.trace_number = item_trace_number)
    order by material.trace_number nulls last limit 1;
    if not found then
      raise exception 'Material ident is not in this spool revision BOM' using errcode = 'PQC30';
    end if;
    select * into pml_row from public.piping_material_records pml
    where pml.project_id = context.project_id and pml.ident_code = item_ident_code
      and pml.trace_number = item_trace_number and pml.status = 'active';
    if not found then
      raise exception 'Active piping material evidence is missing' using errcode = 'PQC33';
    end if;
    select * into prior_checked_item from public.material_check_items checked
    where checked.material_check_record_id = record_row.id
      and checked.spool_revision_material_id = bom_row.id;
    if found then
      if prior_checked_item.piping_material_record_id <> pml_row.id then
        raise exception 'Accepted material evidence cannot be rewritten' using errcode = '23514';
      end if;
      if item_quantity is not null and prior_checked_item.checked_quantity is distinct from item_quantity then
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

  if exists (select 1 from public.spool_revision_materials material where material.spool_revision_id = target_spool_revision_id)
     and not exists (
       select 1 from public.spool_revision_materials material
       where material.spool_revision_id = target_spool_revision_id
         and not exists (
           select 1 from public.material_check_items checked
           where checked.material_check_record_id = record_row.id
             and checked.spool_revision_material_id = material.id
         )
     )
     and not exists (
       select 1 from public.construction_progress_events event
       where event.spool_revision_id = target_spool_revision_id
         and event.phase = target_phase
         and event.stage = 'material_check'
         and event.source <> 'compensation'
         and not exists (select 1 from public.construction_progress_events compensation where compensation.compensates_event_id = event.id)
     ) then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on, payload, source, actor_id
    ) values (
      context.project_id, target_spool_revision_id, target_phase,
      'material_check', target_checked_on,
      jsonb_build_object('material_check_record_id', record_row.id), 'derived', auth.uid()
    ) returning * into derived_event;
    insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
    values (context.project_id, auth.uid(), 'construction_progress_events', derived_event.id,
            'derive_material_check', to_jsonb(derived_event));
  end if;

  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, before_state, after_state)
  values (
    context.project_id, auth.uid(), 'material_check_records', record_row.id, 'record_material_check',
    before_snapshot, after_snapshot || jsonb_build_object('submitted_items', target_items)
  );
  perform public.complete_command_receipt(
    context.project_id, 'record_material_check', target_idempotency_key,
    jsonb_build_object('record', to_jsonb(record_row))
  );
  return record_row;
end;
$$;

-- The field screen makes the phase explicit, then delegates all PML/BOM validation to the
-- shared record_material_check contract.
create or replace function public.record_field_material_check(
  target_spool_revision_id uuid,
  target_checked_on date,
  target_items jsonb,
  target_qc13_form_id uuid default null,
  target_idempotency_key text default null
)
returns public.material_check_records
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  return public.record_material_check(
    target_spool_revision_id, target_checked_on, target_items,
    target_qc13_form_id, target_idempotency_key, 'erection'
  );
end;
$$;

create or replace function public.record_field_support_progress(
  target_support_revision_id uuid,
  installed_on date,
  idempotency_key text default null
)
returns public.support_progress_records
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  owning_spool_revision_id uuid;
  context public.spool_context;
  claimed jsonb;
  created public.support_progress_records;
begin
  select support.spool_revision_id into owning_spool_revision_id
  from public.support_revisions support
  where support.id = target_support_revision_id;
  if owning_spool_revision_id is null then
    raise exception 'The support revision was not found' using errcode = 'PQC30';
  end if;
  context := public.assert_construction_target(owning_spool_revision_id, 'erection.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'record_field_support_progress', idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into created from public.support_progress_records
    where id = (claimed -> 'result' ->> 'record_id')::uuid;
    return created;
  end if;
  if installed_on is null then
    raise exception 'An installation date is required' using errcode = '23514';
  end if;
  insert into public.support_progress_records (
    project_id, support_revision_id, spool_revision_id, phase, installed_on,
    receipt_id, recorded_by
  ) values (
    context.project_id, target_support_revision_id, owning_spool_revision_id, 'erection', installed_on,
    nullif(claimed ->> 'receipt_id', '')::uuid, auth.uid()
  )
  on conflict (support_revision_id) do update
    set phase = excluded.phase, installed_on = excluded.installed_on
  returning * into created;
  insert into public.audit_events (
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    context.project_id, auth.uid(), 'support_progress_records', created.id,
    'record_field_support_progress', null, to_jsonb(created)
  );
  perform public.complete_command_receipt(
    context.project_id, 'record_field_support_progress', idempotency_key,
    jsonb_build_object('record_id', created.id)
  );
  return created;
end;
$$;

drop policy if exists "read support progress" on public.support_progress_records;
create policy "read support progress" on public.support_progress_records
  for select to authenticated using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'erection.view')
  );

-- record_material_check was dropped and recreated above, so it needs its Track 05 grants back.
revoke all on function
  public.record_material_check(uuid, date, jsonb, uuid, text, public.construction_phase),
  public.record_erection_progress(uuid, public.construction_stage, date, jsonb, text),
  public.record_field_material_check(uuid, date, jsonb, uuid, text),
  public.record_field_support_progress(uuid, date, text)
from public, anon;
grant execute on function
  public.record_material_check(uuid, date, jsonb, uuid, text, public.construction_phase),
  public.record_erection_progress(uuid, public.construction_stage, date, jsonb, text),
  public.record_field_material_check(uuid, date, jsonb, uuid, text),
  public.record_field_support_progress(uuid, date, text)
to authenticated;
