-- Track 05: the construction read model.
-- Every view is security_invoker, so a reader sees exactly the rows their capabilities and
-- PDS scope allow. Nothing here is a source of truth; drop and rebuild freely.

-- A surviving event is one no compensating event has cancelled. effective_stage_date()
-- in migration 090000 applies the same predicate for the single-value case.
create view public.spool_stage_events with (security_invoker = true) as
select event.*
from public.construction_progress_events event
where event.source <> 'compensation'
  and not exists (
    select 1 from public.construction_progress_events cancel
    where cancel.source = 'compensation' and cancel.compensates_event_id = event.id
  );

create view public.spool_progress_dates with (security_invoker = true) as
select
  spool_revision_id,
  max(occurred_on) filter (where stage = 'start_fab') as start_fab_on,
  max(occurred_on) filter (where stage = 'material_check') as material_check_on,
  max(occurred_on) filter (where stage = 'qc_release') as qc_release_on,
  max(occurred_on) filter (where stage = 'sent_to_paint') as sent_to_paint_on,
  max(occurred_on) filter (where stage = 'painted') as painted_on,
  max(occurred_on) filter (where stage = 'final_qc') as final_qc_on,
  max(occurred_on) filter (where stage = 'laydown') as laydown_on
from public.spool_stage_events
where phase = 'fabrication'
group by spool_revision_id;

create view public.spool_construction_status with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  iso.iso_number,
  spool.spool_number,
  rev.revision_number,
  rev.pds_area_id,
  dates.start_fab_on,
  dates.material_check_on,
  readiness.fabricated_on,
  dates.qc_release_on,
  dates.sent_to_paint_on,
  dates.painted_on,
  dates.final_qc_on,
  dates.laydown_on,
  readiness.is_fabricated,
  readiness.is_releasable,
  readiness.line_total,
  readiness.line_checked,
  readiness.weld_total,
  readiness.weld_complete,
  readiness.support_total,
  readiness.support_recorded,
  readiness.nde_pending,
  readiness.pwht_pending,
  case
    when dates.laydown_on is not null then 'laydown'
    when dates.final_qc_on is not null then 'final_qc'
    when dates.painted_on is not null then 'painted'
    when dates.sent_to_paint_on is not null then 'sent_to_paint'
    when dates.qc_release_on is not null then 'qc_release'
    when readiness.is_fabricated then 'fabricated'
    when dates.material_check_on is not null then 'material_check'
    when dates.start_fab_on is not null then 'start_fab'
  end::public.construction_stage as current_stage
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
join public.spools spool on spool.id = sr.spool_id
join public.spool_fabrication_readiness readiness on readiness.spool_revision_id = sr.id
left join public.spool_progress_dates dates on dates.spool_revision_id = sr.id
where not sr.is_removed;

create view public.weld_progress_summary with (security_invoker = true) as
select
  wjr.id as weld_joint_revision_id,
  iso.project_id,
  wjr.spool_revision_id,
  wj.weld_number,
  spool.spool_number,
  wjr.weld_location,
  wjr.diameter_inch,
  wjr.thickness_mm,
  wps.code as wps_code,
  welders.welder_codes as welders,
  progress.weld_on,
  coalesce(progress.is_locked, false) as is_locked,
  obligations.obligation_total,
  obligations.obligation_pending,
  (requirement.id is not null) as pwht_required,
  (accepted.id is not null) as pwht_accepted
from public.weld_joint_revisions wjr
join public.spool_revisions sr on sr.id = wjr.spool_revision_id
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
join public.weld_joints wj on wj.id = wjr.weld_joint_id
left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
left join public.project_welding_procedures wps on wps.id = progress.welding_procedure_id
left join public.pwht_requirements requirement on requirement.weld_joint_revision_id = wjr.id
left join public.pwht_results accepted
  on accepted.pwht_requirement_id = requirement.id and accepted.outcome = 'accepted'
cross join lateral (
  select array_agg(qualification.welder_code order by assignment.point_type) as welder_codes
  from public.weld_point_assignments assignment
  join public.welder_qualifications qualification
    on qualification.id = assignment.welder_qualification_id
  where assignment.weld_progress_record_id = progress.id
) welders
cross join lateral (
  select
    count(*)::int as obligation_total,
    count(*) filter (where obligation.disposition = 'pending')::int as obligation_pending
  from public.nde_obligations obligation
  where obligation.weld_joint_revision_id = wjr.id
) obligations
where not wjr.is_removed;

grant select on
  public.spool_stage_events,
  public.spool_progress_dates,
  public.spool_construction_status,
  public.weld_progress_summary
to authenticated;
