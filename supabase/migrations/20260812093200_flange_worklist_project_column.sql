-- The worklist must carry its project key so repository reads remain explicitly scoped.
create or replace view public.flange_joint_worklist
with (security_invoker = true)
as
select
  fj.id as flange_joint_id,
  fj.flange_number,
  fjr.id as flange_joint_revision_id,
  fjr.flange_rating,
  fjr.diameter_inch,
  fjr.bolt_size,
  fjr.bolt_quantity,
  fjr.joint_type,
  fjr.is_removed,
  sr.id as spool_revision_id,
  s.spool_number,
  iso.id as isometric_id,
  iso.iso_number,
  ir.revision_number,
  ir.status as revision_status,
  ir.pds_area_id,
  pds.code as pds_code,
  ir.line_number,
  sc.code as service_class_code,
  progress.id as effective_progress_id,
  progress.joint_category_id,
  progress.torquing_requirement_id,
  progress.jointing_method_snapshot,
  progress.jointing_value,
  progress.joint_date,
  progress.report_number,
  progress.tag_number,
  progress.calculated_ut,
  progress.ut_formula_version,
  case
    when ir.status <> 'accepted' or fjr.is_removed then 'revision_mismatch'
    when progress.id is null then 'not_started'
    else 'completed'
  end as progress_state,
  iso.project_id
from public.flange_joint_revisions fjr
join public.flange_joints fj on fj.id = fjr.flange_joint_id
join public.spool_revisions sr on sr.id = fjr.spool_revision_id
join public.spools s on s.id = sr.spool_id
join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = ir.isometric_id
left join public.project_pds_areas pds on pds.id = ir.pds_area_id
left join public.project_service_classes sc on sc.id = ir.service_class_id
left join public.flange_progress_records progress
  on progress.flange_joint_revision_id = fjr.id and progress.superseded_at is null;

grant select on public.flange_joint_worklist to authenticated;
