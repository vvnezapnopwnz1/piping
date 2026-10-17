-- Phase 5: the document projections read each table once per project instead of once per weld.
-- Measured on UPG-1 (578 welds) as an operator: weld_log_rows took 6.8 s and test_pack_document_rows ran into
-- the 8 s statement timeout (70 s with a literal project id), because correlated subqueries re-ran the RLS checks
-- for every weld and pack.
-- Per-weld and per-spool facts now come from subqueries grouped by (project_id, key) and joined on both, so the
-- reader's project filter is pushed into each of them. Columns, their order and their meaning do not change.

create or replace view public.weld_log_rows with (security_invoker = true) as
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
  welders.welder_codes,
  progress.weld_on,
  nde.nde_methods,
  coalesce(nde.nde_pending, 0) as nde_pending,
  coalesce(nde.nde_rejected, 0) as nde_rejected,
  (requirement.id is not null) as pwht_required,
  (accepted.id is not null) as pwht_accepted,
  traces.trace_numbers,
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
left join public.pwht_requirements requirement on requirement.weld_joint_revision_id = wjr.id
left join public.pwht_results accepted on accepted.pwht_requirement_id = requirement.id and accepted.outcome = 'accepted'
left join public.test_pack_isometrics member on member.isometric_id = iso.id and member.removed_at is null
left join public.test_packs pack on pack.id = member.test_pack_id
left join (
  select
    record.project_id,
    assignment.weld_progress_record_id,
    array_agg(qualification.welder_code order by assignment.point_type) as welder_codes
  from public.weld_point_assignments assignment
  join public.weld_progress_records record on record.id = assignment.weld_progress_record_id
  join public.welder_qualifications qualification on qualification.id = assignment.welder_qualification_id
  group by record.project_id, assignment.weld_progress_record_id
) welders on welders.project_id = iso.project_id and welders.weld_progress_record_id = progress.id
left join (
  select
    obligation.project_id,
    obligation.weld_joint_revision_id,
    array_agg(distinct obligation.method::text order by obligation.method::text) as nde_methods,
    (count(*) filter (where obligation.disposition in ('pending', 'issued')))::integer as nde_pending,
    (count(result.id) filter (where result.outcome = 'rejected'))::integer as nde_rejected
  from public.nde_obligations obligation
  left join public.nde_results result on result.obligation_id = obligation.id
  group by obligation.project_id, obligation.weld_joint_revision_id
) nde on nde.project_id = iso.project_id and nde.weld_joint_revision_id = wjr.id
left join (
  select
    record.project_id,
    record.spool_revision_id,
    array_agg(distinct material.trace_number order by material.trace_number) as trace_numbers
  from public.material_check_records record
  join public.material_check_items item on item.material_check_record_id = record.id
  join public.piping_material_records material on material.id = item.piping_material_record_id
  group by record.project_id, record.spool_revision_id
) traces on traces.project_id = iso.project_id and traces.spool_revision_id = sr.id
where not wjr.is_removed;

create or replace view public.test_pack_document_rows with (security_invoker = true) as
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
  coalesce(welds.weld_total, 0) as weld_total,
  coalesce(welds.weld_done, 0) as weld_done,
  coalesce(readiness.x_open_count, 0) as open_x_count
from public.test_packs pack
left join public.project_systems system_ref on system_ref.id = pack.system_id
left join public.project_subsystems subsystem on subsystem.id = pack.subsystem_id
left join public.project_service_classes service_class on service_class.id = pack.service_class_id
left join public.project_line_services line_service on line_service.id = pack.line_service_id
left join public.test_pack_readiness readiness on readiness.test_pack_id = pack.id
-- Weld counts per pack use the same "current weld" rule as weld_log_rows (accepted ISO revision, spool and weld
-- not removed); pgTAP 118 checks they agree. Grouping weld_log_rows itself made the planner re-run it per pack.
left join (
  select
    member.project_id,
    member.test_pack_id,
    count(wjr.id)::integer as weld_total,
    count(progress.weld_on)::integer as weld_done
  from public.test_pack_isometrics member
  join public.isometric_revisions rev on rev.isometric_id = member.isometric_id and rev.status = 'accepted'
  join public.spool_revisions sr on sr.isometric_revision_id = rev.id and not sr.is_removed
  join public.weld_joint_revisions wjr on wjr.spool_revision_id = sr.id and not wjr.is_removed
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where member.removed_at is null
  group by member.project_id, member.test_pack_id
) welds on welds.project_id = pack.project_id and welds.test_pack_id = pack.id;
