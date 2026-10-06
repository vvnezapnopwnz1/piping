-- Migration: material_check_workbench
-- Narrow operational reads for Material Check workspace and trace candidate search,
-- and UUID identity validation in record_material_check with legacy fallback.

create or replace function public.record_material_check(
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
  item_bom_id uuid;
  item_pml_id uuid;
  bom_match_count integer;
  seen_bom_ids uuid[] := array[]::uuid[];
  bom_row public.spool_revision_materials;
  pml_row public.piping_material_records;
  prior_checked_item public.material_check_items;
  derived_event public.construction_progress_events;
  before_snapshot jsonb;
  after_snapshot jsonb;
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

    begin
      item_bom_id := nullif(item_value ->> 'spool_revision_material_id', '')::uuid;
      item_pml_id := nullif(item_value ->> 'piping_material_record_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Material reference IDs must be UUIDs' using errcode = '23514';
    end;

    if (item_value ? 'spool_revision_material_id' and item_bom_id is null)
       or (item_value ? 'piping_material_record_id' and item_pml_id is null) then
      raise exception 'Provided material reference IDs must not be empty' using errcode = '23514';
    end if;

    begin
      item_quantity := case when item_value ? 'quantity' then (item_value ->> 'quantity')::numeric(12, 3) else null end;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Material quantity is invalid' using errcode = '23514';
    end;
    if item_quantity is not null and (item_quantity < 0 or item_quantity = 'NaN'::numeric) then
      raise exception 'Material quantity must be a non-negative finite number' using errcode = '23514';
    end if;

    if item_bom_id is null then
      select count(*) into bom_match_count
      from public.spool_revision_materials material
      where material.spool_revision_id = target_spool_revision_id
        and material.ident_code = item_ident_code
        and (material.trace_number is null or material.trace_number = item_trace_number);
      if bom_match_count > 1 then
        raise exception 'Specify the BOM row for this material check' using errcode = 'PQC58';
      end if;
      select material.id into item_bom_id
      from public.spool_revision_materials material
      where material.spool_revision_id = target_spool_revision_id
        and material.ident_code = item_ident_code
        and (material.trace_number is null or material.trace_number = item_trace_number);
    end if;

    select * into bom_row from public.spool_revision_materials material
    where material.id = item_bom_id
      and material.spool_revision_id = target_spool_revision_id
      and material.ident_code = item_ident_code
      and (material.trace_number is null or material.trace_number = item_trace_number);
    if not found then
      raise exception 'Material row is not in this spool revision BOM' using errcode = 'PQC30';
    end if;
    if bom_row.id = any(seen_bom_ids) then
      raise exception 'Each BOM row may appear only once per command' using errcode = '23514';
    end if;
    seen_bom_ids := array_append(seen_bom_ids, bom_row.id);

    select * into pml_row from public.piping_material_records pml
    where pml.project_id = context.project_id and pml.ident_code = item_ident_code
      and pml.trace_number = item_trace_number and pml.status = 'active'
      and (item_pml_id is null or pml.id = item_pml_id);
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

create or replace function public.assert_material_check_read_target(target_spool_revision_id uuid)
returns public.spool_context
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  project_id uuid;
  required_view text;
  context public.spool_context;
begin
  select iso.project_id into project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;
  if project_id is null then
    raise exception 'Construction target is missing' using errcode = 'PQC30';
  end if;
  if public.current_user_has_capability(project_id, 'fabrication.view') then
    required_view := 'fabrication.view';
  elsif public.current_user_has_capability(project_id, 'erection.view') then
    required_view := 'erection.view';
  else
    raise exception 'Material target is outside your authorized scope' using errcode = '42501';
  end if;
  context := public.assert_construction_target(target_spool_revision_id, required_view);
  if not public.current_user_has_capability(context.project_id, 'project_referential.view') then
    raise exception 'Project referential read is unavailable' using errcode = '42501';
  end if;
  return context;
end;
$$;

revoke all on function public.assert_material_check_read_target(uuid) from public, anon, authenticated;

create or replace function public.read_material_check_workspace(
  target_spool_revision_id uuid,
  after_id uuid default null,
  page_size integer default 200
)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  context public.spool_context;
  take_count integer := greatest(1, least(coalesce(page_size, 200), 500));
  result jsonb;
begin
  context := public.assert_material_check_read_target(target_spool_revision_id);
  with page as (
    select material.* from public.spool_revision_materials material
    where material.spool_revision_id = target_spool_revision_id
      and (after_id is null or material.id > after_id)
    order by material.id limit take_count + 1
  ), visible as (
    select * from page order by id limit take_count
  )
  select jsonb_build_object(
    'lines', coalesce((select jsonb_agg(jsonb_build_object(
      'spoolRevisionMaterialId', material.id, 'identCode', material.ident_code,
      'description', material.description, 'quantity', material.quantity,
      'unit', material.unit, 'expectedTraceNumber', material.trace_number,
      'accepted', case when checked.id is null then null else jsonb_build_object(
        'materialCheckItemId', checked.id, 'spoolRevisionMaterialId', material.id,
        'pipingMaterialRecordId', checked.piping_material_record_id,
        'traceNumber', pml.trace_number, 'mrrNumber', pml.mrr_number,
        'status', pml.status, 'quantity', checked.checked_quantity
      ) end
    ) order by material.id)
    from visible material
    left join public.material_check_records record
      on record.spool_revision_id = target_spool_revision_id
    left join public.material_check_items checked
      on checked.material_check_record_id = record.id
      and checked.spool_revision_material_id = material.id
    left join public.piping_material_records pml
      on pml.id = checked.piping_material_record_id and pml.project_id = context.project_id
    ), '[]'::jsonb),
    'record', (select jsonb_build_object(
      'id', record.id, 'checkedOn', record.checked_on,
      'qc13Form', case when form.id is null then null else jsonb_build_object(
        'id', form.id, 'formNumber', form.form_number, 'requestedOn', form.requested_on
      ) end
    ) from public.material_check_records record
    left join public.qc13_progress_forms form
      on form.id = record.qc13_form_id and form.project_id = context.project_id
    where record.spool_revision_id = target_spool_revision_id),
    'latestQc13Form', (select jsonb_build_object(
      'id', form.id, 'formNumber', form.form_number, 'requestedOn', form.requested_on
    ) from public.qc13_progress_forms form
    where form.spool_revision_id = target_spool_revision_id and form.project_id = context.project_id
    order by form.requested_on desc, form.created_at desc, form.id desc limit 1),
    'hasMore', (select count(*) > take_count from page),
    'nextAfterId', case when (select count(*) > take_count from page)
      then (select id from visible order by id desc limit 1) else null end
  ) into result;
  return result;
end;
$$;

create or replace function public.search_material_trace_candidates(
  target_spool_revision_material_id uuid,
  search_text text default '',
  after_trace text default null,
  after_id uuid default null,
  page_size integer default 25
)
returns table(id uuid, ident_code text, trace_number text, mrr_number text,
  status public.project_reference_status)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  material public.spool_revision_materials;
  context public.spool_context;
  needle text := lower(trim(coalesce(search_text, '')));
  take_count integer := greatest(1, least(coalesce(page_size, 25), 100));
begin
  select * into material from public.spool_revision_materials
  where spool_revision_materials.id = target_spool_revision_material_id;
  if not found then
    raise exception 'Material target is missing' using errcode = 'PQC30';
  end if;
  context := public.assert_material_check_read_target(material.spool_revision_id);
  if (after_trace is null) <> (after_id is null) then
    raise exception 'Both material cursor fields are required' using errcode = '23514';
  end if;
  return query
  select pml.id, pml.ident_code, pml.trace_number, pml.mrr_number, pml.status
  from public.piping_material_records pml
  where pml.project_id = context.project_id and pml.ident_code = material.ident_code
    and pml.status = 'active'
    and (material.trace_number is null or pml.trace_number = material.trace_number)
    and (needle = '' or strpos(lower(pml.trace_number), needle) > 0
      or strpos(lower(pml.mrr_number), needle) > 0)
    and (after_id is null or (pml.trace_number, pml.id) > (after_trace, after_id))
  order by pml.trace_number, pml.id limit take_count + 1;
end;
$$;

revoke all on function public.read_material_check_workspace(uuid, uuid, integer),
  public.search_material_trace_candidates(uuid, text, text, uuid, integer) from public, anon;
grant execute on function public.read_material_check_workspace(uuid, uuid, integer),
  public.search_material_trace_candidates(uuid, text, text, uuid, integer) to authenticated;
