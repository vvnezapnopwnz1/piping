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
