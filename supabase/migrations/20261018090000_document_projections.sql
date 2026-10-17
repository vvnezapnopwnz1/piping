-- Phase 5: rows for the handover documents (weld log, NDE register, test pack dossier and summary).
-- Every view is security_invoker, so the policies on the underlying tables decide who reads what.
-- "Current" means the spool revision of the accepted ISO revision; removed spools and welds are left out.
-- Per-row facts are scalar subqueries, so a reader that does not select them does not pay for them.

create view public.weld_log_rows with (security_invoker = true) as
select
  wjr.id as weld_joint_revision_id,
  iso.project_id,
  iso.id as isometric_id,
  iso.iso_number,
  rev.revision_number,
  rev.line_number,
  spool.spool_number,
  wj.weld_number,
  wjr.weld_location,
  weld_type.code as weld_type_code,
  wjr.diameter_inch,
  wjr.thickness_mm,
  wps.code as wps_code,
  (
    select array_agg(qualification.welder_code order by assignment.point_type)
    from public.weld_point_assignments assignment
    join public.welder_qualifications qualification on qualification.id = assignment.welder_qualification_id
    where assignment.weld_progress_record_id = progress.id
  ) as welder_codes,
  progress.weld_on,
  (
    select array_agg(distinct obligation.method::text order by obligation.method::text)
    from public.nde_obligations obligation
    where obligation.weld_joint_revision_id = wjr.id
  ) as nde_methods,
  (
    select count(*)::integer
    from public.nde_obligations obligation
    where obligation.weld_joint_revision_id = wjr.id and obligation.disposition in ('pending', 'issued')
  ) as nde_pending,
  (
    select count(*)::integer
    from public.nde_obligations obligation
    join public.nde_results result on result.obligation_id = obligation.id
    where obligation.weld_joint_revision_id = wjr.id and result.outcome = 'rejected'
  ) as nde_rejected,
  exists (
    select 1 from public.pwht_requirements requirement where requirement.weld_joint_revision_id = wjr.id
  ) as pwht_required,
  exists (
    select 1
    from public.pwht_requirements requirement
    join public.pwht_results accepted on accepted.pwht_requirement_id = requirement.id and accepted.outcome = 'accepted'
    where requirement.weld_joint_revision_id = wjr.id
  ) as pwht_accepted,
  (
    select array_agg(distinct material.trace_number order by material.trace_number)
    from public.material_check_records record
    join public.material_check_items item on item.material_check_record_id = record.id
    join public.piping_material_records material on material.id = item.piping_material_record_id
    where record.spool_revision_id = sr.id
  ) as trace_numbers,
  member.test_pack_id,
  pack.test_pack_number
from public.weld_joint_revisions wjr
join public.spool_revisions sr on sr.id = wjr.spool_revision_id and not sr.is_removed
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id and rev.status = 'accepted'
join public.isometrics iso on iso.id = rev.isometric_id
join public.weld_joints wj on wj.id = wjr.weld_joint_id
left join public.project_weld_types weld_type on weld_type.id = wjr.weld_type_id
left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
left join public.project_welding_procedures wps on wps.id = progress.welding_procedure_id
left join public.test_pack_isometrics member on member.isometric_id = iso.id and member.removed_at is null
left join public.test_packs pack on pack.id = member.test_pack_id
where not wjr.is_removed;

revoke all on public.weld_log_rows from anon, authenticated;
grant select on public.weld_log_rows to authenticated;

-- One row per NDE obligation of a current weld. The result's report number wins over the batch's.
create view public.nde_register_rows with (security_invoker = true) as
select
  obligation.id as obligation_id,
  obligation.project_id,
  log.isometric_id,
  log.iso_number,
  log.spool_number,
  log.weld_number,
  log.weld_location,
  log.welder_codes,
  obligation.method::text as method,
  obligation.selection_mode,
  obligation.required_coverage,
  obligation.disposition,
  batch.batch_number,
  batch.status as batch_status,
  laboratory.description as ndt_subcontractor_name,
  result.examined_on,
  result.outcome,
  coalesce(result.report_number, batch.report_number) as report_number,
  defect.code as defect_code,
  log.test_pack_id,
  log.test_pack_number
from public.nde_obligations obligation
join public.weld_log_rows log on log.weld_joint_revision_id = obligation.weld_joint_revision_id
left join public.nde_batch_items item on item.obligation_id = obligation.id
left join public.nde_batches batch on batch.id = item.batch_id
left join public.project_subcontractors laboratory on laboratory.id = batch.ndt_subcontractor_id
left join public.nde_results result on result.obligation_id = obligation.id
left join public.project_rework_codes defect on defect.id = result.defect_rework_code_id;

revoke all on public.nde_register_rows from anon, authenticated;
grant select on public.nde_register_rows to authenticated;

-- One row per test pack: definition, readiness from test_pack_readiness, stage dates and composition.
create view public.test_pack_document_rows with (security_invoker = true) as
select
  pack.id as test_pack_id,
  pack.project_id,
  pack.test_pack_number,
  pack.revision_no,
  pack.lifecycle,
  system_ref.code as system_code,
  system_ref.description as system_description,
  subsystem.code as subsystem_code,
  subsystem.description as subsystem_description,
  service_class.code as service_class_code,
  line_service.code as line_service_code,
  pack.test_medium,
  pack.test_pressure,
  pack.pressure_unit,
  pack.location,
  pack.planned_start_on,
  pack.planned_end_on,
  coalesce(readiness.is_rft, false) as is_rft,
  readiness.rft_on,
  (
    select event.occurred_on from public.pressure_test_stage_events event
    where event.test_pack_id = pack.id and event.stage = 'testing_started'
  ) as testing_started_on,
  (
    select event.occurred_on from public.pressure_test_stage_events event
    where event.test_pack_id = pack.id and event.stage = 'testing_completed'
  ) as testing_completed_on,
  (
    select event.occurred_on from public.pressure_test_stage_events event
    where event.test_pack_id = pack.id and event.stage = 'precommissioning_completed'
  ) as precommissioning_completed_on,
  (
    select count(*)::integer from public.test_pack_isometrics member
    where member.test_pack_id = pack.id and member.removed_at is null
  ) as iso_count,
  (
    select array_agg(distinct rev.line_number order by rev.line_number)
    from public.test_pack_isometrics member
    join public.isometric_revisions rev on rev.id = member.assigned_isometric_revision_id
    where member.test_pack_id = pack.id and member.removed_at is null and rev.line_number is not null
  ) as line_numbers,
  (
    select count(*)::integer from public.weld_log_rows log where log.test_pack_id = pack.id
  ) as weld_total,
  (
    select count(*)::integer from public.weld_log_rows log where log.test_pack_id = pack.id and log.weld_on is not null
  ) as weld_done,
  coalesce(readiness.x_open_count, 0) as open_x_count
from public.test_packs pack
left join public.project_systems system_ref on system_ref.id = pack.system_id
left join public.project_subsystems subsystem on subsystem.id = pack.subsystem_id
left join public.project_service_classes service_class on service_class.id = pack.service_class_id
left join public.project_line_services line_service on line_service.id = pack.line_service_id
left join public.test_pack_readiness readiness on readiness.test_pack_id = pack.id;

revoke all on public.test_pack_document_rows from anon, authenticated;
grant select on public.test_pack_document_rows to authenticated;
