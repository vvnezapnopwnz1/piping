-- Migration: material_check_simplify
-- Material Check works on BOM rows. Reads go through RLS (one policy helper, two policies and two
-- security_invoker views) instead of the SECURITY DEFINER reads of 20261006120000;
-- record_material_check takes BOM-row and PML-record IDs only (added below the views).

drop function if exists public.search_material_trace_candidates(uuid, text, text, uuid, integer);
drop function if exists public.read_material_check_workspace(uuid, uuid, integer);
drop function if exists public.assert_material_check_read_target(uuid);
revoke execute on function public.effective_stage_date(uuid, public.construction_phase, public.construction_stage) from authenticated;

-- The project of a spool revision, returned only to a caller who may read that spool as a
-- Construction user (fabrication.view or erection.view, inside their PDS scope). Used by the BOM
-- read policy and by material_trace_candidates.
create or replace function public.construction_spool_project_id(target_spool_revision_id uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id
    and public.current_user_can_read_fabrication_spool(iso.project_id, sr.id);
$$;
revoke all on function public.construction_spool_project_id(uuid) from public, anon;
grant execute on function public.construction_spool_project_id(uuid) to authenticated;

create policy "construction users read spool revision materials" on public.spool_revision_materials
  for select to authenticated
  using (public.construction_spool_project_id(spool_revision_id) is not null);

-- QC-13 forms follow the same rule as the material check records they belong to.
drop policy if exists "read QC13 progress forms" on public.qc13_progress_forms;
create policy "read QC13 progress forms" on public.qc13_progress_forms for select to authenticated
  using (public.current_user_can_read_fabrication_spool(project_id, spool_revision_id));

-- One row per BOM line with its accepted evidence, if any.
create view public.material_check_lines with (security_invoker = true) as
select
  material.id as spool_revision_material_id,
  material.spool_revision_id,
  material.ident_code,
  material.description,
  material.quantity,
  material.unit,
  material.trace_number as expected_trace_number,
  item.piping_material_record_id as accepted_piping_material_record_id,
  pml.trace_number as accepted_trace_number,
  pml.mrr_number as accepted_mrr_number,
  pml.status as accepted_status
from public.spool_revision_materials material
left join public.material_check_records record on record.spool_revision_id = material.spool_revision_id
left join public.material_check_items item
  on item.material_check_record_id = record.id and item.spool_revision_material_id = material.id
left join public.piping_material_records pml on pml.id = item.piping_material_record_id;

-- The one definition of "eligible PML evidence for a BOM row": same project, same Ident, active,
-- and the exact BOM trace when the BOM names one. record_material_check checks against it too.
create view public.material_trace_candidates with (security_invoker = true) as
select
  material.id as spool_revision_material_id,
  material.spool_revision_id,
  pml.id as piping_material_record_id,
  pml.trace_number,
  pml.mrr_number
from public.spool_revision_materials material
join public.piping_material_records pml
  on pml.project_id = public.construction_spool_project_id(material.spool_revision_id)
 and pml.ident_code = material.ident_code
 and pml.status = 'active'
 and (material.trace_number is null or pml.trace_number = material.trace_number);

revoke all on public.material_check_lines, public.material_trace_candidates from anon;
grant select on public.material_check_lines, public.material_trace_candidates to authenticated;
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
  item_bom_id uuid;
  item_pml_id uuid;
  seen_bom_ids uuid[] := array[]::uuid[];
  bom_row public.spool_revision_materials;
  prior_pml_id uuid;
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
    set qc13_form_id = coalesce(material_check_records.qc13_form_id, excluded.qc13_form_id),
        checked_on = excluded.checked_on, checked_by = excluded.checked_by,
        updated_at = timezone('utc', now())
  returning * into record_row;

  for item_value in select value from jsonb_array_elements(target_items)
  loop
    begin
      item_bom_id := (item_value ->> 'spool_revision_material_id')::uuid;
      item_pml_id := (item_value ->> 'piping_material_record_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Material reference IDs must be UUIDs' using errcode = '23514';
    end;
    if item_bom_id is null or item_pml_id is null then
      raise exception 'Every material item needs spool_revision_material_id and piping_material_record_id'
        using errcode = '23514';
    end if;

    select * into bom_row from public.spool_revision_materials material
    where material.id = item_bom_id and material.spool_revision_id = target_spool_revision_id;
    if not found then
      raise exception 'Material row is not in this spool revision BOM' using errcode = 'PQC30';
    end if;
    if bom_row.id = any(seen_bom_ids) then
      raise exception 'Each BOM row may appear only once per command' using errcode = '23514';
    end if;
    seen_bom_ids := array_append(seen_bom_ids, bom_row.id);

    select checked.piping_material_record_id into prior_pml_id
    from public.material_check_items checked
    where checked.material_check_record_id = record_row.id
      and checked.spool_revision_material_id = bom_row.id;
    if found then
      if prior_pml_id <> item_pml_id then
        raise exception 'Accepted material evidence cannot be rewritten' using errcode = '23514';
      end if;
      continue;
    end if;

    if not exists (
      select 1 from public.material_trace_candidates candidate
      where candidate.spool_revision_material_id = bom_row.id
        and candidate.piping_material_record_id = item_pml_id
    ) then
      raise exception 'Active piping material evidence is missing' using errcode = 'PQC33';
    end if;

    insert into public.material_check_items (
      material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity
    ) values (record_row.id, bom_row.id, item_pml_id, bom_row.quantity);
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
