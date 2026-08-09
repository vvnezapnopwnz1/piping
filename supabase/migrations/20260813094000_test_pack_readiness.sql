-- Track 10: readiness projections over current engineering and workflow facts.

create or replace view public.isometric_readiness
with (security_invoker = true)
as
with current_revision as (
  select iso.id as isometric_id, iso.project_id, revision.id as isometric_revision_id, revision.pds_area_id
  from public.isometrics iso
  join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
), spool_facts as (
  select current_revision.isometric_id,
    count(spool_revision.id)::int as spool_total,
    count(spool_revision.id) filter (where coalesce(erection.is_rft, false))::int as spool_complete,
    coalesce(sum(fabrication.weld_total), 0)::int as weld_total,
    coalesce(sum(fabrication.weld_complete), 0)::int as weld_complete,
    coalesce(sum(fabrication.support_total), 0)::int as support_total,
    coalesce(sum(fabrication.support_recorded), 0)::int as support_complete,
    coalesce(sum(erection.nde_pending), 0)::int as nde_pending,
    coalesce(sum(erection.pwht_pending), 0)::int as pwht_pending,
    bool_and(coalesce(fabrication.is_releasable, false)) as qc_released,
    max(erection.rft_on) as rft_on
  from current_revision
  left join public.spool_revisions spool_revision on spool_revision.isometric_revision_id = current_revision.isometric_revision_id and not spool_revision.is_removed
  left join public.spool_erection_readiness erection on erection.spool_revision_id = spool_revision.id
  left join public.spool_fabrication_readiness fabrication on fabrication.spool_revision_id = spool_revision.id
  group by current_revision.isometric_id
), flange_facts as (
  select current_revision.isometric_id,
    count(flange.flange_joint_revision_id)::int as flange_total,
    count(flange.flange_joint_revision_id) filter (where flange.effective_progress_id is not null)::int as flange_complete,
    coalesce(sum(flange.calculated_ut) filter (where flange.effective_progress_id is not null), 0)::numeric as unit_time
  from current_revision
  left join public.flange_joint_readiness flange on flange.isometric_id = current_revision.isometric_id and flange.revision_status = 'accepted' and not flange.is_removed
  group by current_revision.isometric_id
), line_facts as (
  select member.isometric_id,
    count(*)::int as line_check_assigned,
    count(*) filter (where result.id is not null)::int as line_check_completed
  from public.line_check_request_items member
  join public.pressure_test_requests request on request.id = member.request_id and request.cancelled_at is null
  left join public.line_check_results result on result.request_id = member.request_id and result.isometric_id = member.isometric_id
  group by member.isometric_id
), punch_facts as (
  select punch.isometric_id, count(*)::int as open_x_count
  from public.punch_items punch
  left join public.punch_item_clearances clearance on clearance.punch_item_id = punch.id
  where clearance.id is null
  group by punch.isometric_id
)
select current_revision.isometric_id, current_revision.project_id, current_revision.isometric_revision_id, current_revision.pds_area_id,
  coalesce(spool_facts.spool_total, 0) as spool_total, coalesce(spool_facts.spool_complete, 0) as spool_complete,
  coalesce(spool_facts.weld_total, 0) as weld_total, coalesce(spool_facts.weld_complete, 0) as weld_complete,
  coalesce(spool_facts.support_total, 0) as support_total, coalesce(spool_facts.support_complete, 0) as support_complete,
  coalesce(flange_facts.flange_total, 0) as flange_total, coalesce(flange_facts.flange_complete, 0) as flange_complete,
  coalesce(spool_facts.nde_pending, 0) as nde_pending, coalesce(spool_facts.pwht_pending, 0) as pwht_pending,
  coalesce(line_facts.line_check_assigned, 0) as line_check_assigned, coalesce(line_facts.line_check_completed, 0) as line_check_completed,
  coalesce(punch_facts.open_x_count, 0) as open_x_count, coalesce(flange_facts.unit_time, 0)::numeric as unit_time,
  coalesce(spool_facts.qc_released, false) as is_qc_released,
  jsonb_build_object(
    'NO_CURRENT_REVISION', 0,
    'NO_SPOOLS', case when coalesce(spool_facts.spool_total, 0) = 0 then 1 else 0 end,
    'WELD_OR_SUPPORT_PENDING', greatest(coalesce(spool_facts.weld_total, 0) - coalesce(spool_facts.weld_complete, 0), 0) + greatest(coalesce(spool_facts.support_total, 0) - coalesce(spool_facts.support_complete, 0), 0),
    'FLANGE_PENDING', greatest(coalesce(flange_facts.flange_total, 0) - coalesce(flange_facts.flange_complete, 0), 0),
    'NDE_PENDING', coalesce(spool_facts.nde_pending, 0),
    'PWHT_PENDING', coalesce(spool_facts.pwht_pending, 0),
    'LINE_CHECK_PENDING', case when coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed then 0 else 1 end,
    'X_OPEN', coalesce(punch_facts.open_x_count, 0)
  ) as blocker_counts,
  (
    coalesce(spool_facts.spool_total, 0) > 0
    and coalesce(spool_facts.weld_total, 0) = coalesce(spool_facts.weld_complete, 0)
    and coalesce(spool_facts.support_total, 0) = coalesce(spool_facts.support_complete, 0)
    and coalesce(flange_facts.flange_total, 0) = coalesce(flange_facts.flange_complete, 0)
    and coalesce(spool_facts.nde_pending, 0) = 0 and coalesce(spool_facts.pwht_pending, 0) = 0
    and coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed
    and coalesce(punch_facts.open_x_count, 0) = 0
  ) as is_complete,
  (
    coalesce(spool_facts.spool_total, 0) > 0
    and coalesce(spool_facts.weld_total, 0) = coalesce(spool_facts.weld_complete, 0)
    and coalesce(spool_facts.support_total, 0) = coalesce(spool_facts.support_complete, 0)
    and coalesce(flange_facts.flange_total, 0) = coalesce(flange_facts.flange_complete, 0)
    and coalesce(spool_facts.nde_pending, 0) = 0 and coalesce(spool_facts.pwht_pending, 0) = 0
    and coalesce(line_facts.line_check_assigned, 0) > 0 and line_facts.line_check_assigned = line_facts.line_check_completed
    and coalesce(punch_facts.open_x_count, 0) = 0
    and coalesce(spool_facts.qc_released, false)
  ) as is_rft,
  case when coalesce(spool_facts.rft_on, null) is not null then spool_facts.rft_on end as rft_on
from current_revision
left join spool_facts on spool_facts.isometric_id = current_revision.isometric_id
left join flange_facts on flange_facts.isometric_id = current_revision.isometric_id
left join line_facts on line_facts.isometric_id = current_revision.isometric_id
left join punch_facts on punch_facts.isometric_id = current_revision.isometric_id;

create or replace view public.test_pack_readiness
with (security_invoker = true)
as
select pack.id as test_pack_id, pack.project_id, pack.test_pack_number, pack.revision_no, pack.lifecycle,
  count(member.id) filter (where member.removed_at is null)::int as member_count,
  count(readiness.isometric_id)::int as current_member_count,
  coalesce(sum(readiness.spool_total), 0)::int as spool_total,
  coalesce(sum(readiness.weld_total), 0)::int as weld_total,
  coalesce(sum(readiness.flange_total), 0)::int as flange_total,
  coalesce(sum((readiness.blocker_counts ->> 'NO_SPOOLS')::int), 0)::int as no_spools_count,
  coalesce(sum((readiness.blocker_counts ->> 'WELD_OR_SUPPORT_PENDING')::int), 0)::int as weld_or_support_pending_count,
  coalesce(sum((readiness.blocker_counts ->> 'FLANGE_PENDING')::int), 0)::int as flange_pending_count,
  coalesce(sum((readiness.blocker_counts ->> 'NDE_PENDING')::int), 0)::int as nde_pending_count,
  coalesce(sum((readiness.blocker_counts ->> 'PWHT_PENDING')::int), 0)::int as pwht_pending_count,
  coalesce(sum((readiness.blocker_counts ->> 'LINE_CHECK_PENDING')::int), 0)::int as line_check_pending_count,
  coalesce(sum((readiness.blocker_counts ->> 'X_OPEN')::int), 0)::int as x_open_count,
  coalesce(sum(readiness.unit_time), 0)::numeric as unit_time,
  bool_and(readiness.is_rft) filter (where readiness.isometric_id is not null) and pack.lifecycle = 'active' and count(member.id) filter (where member.removed_at is null) > 0 as is_rft,
  min(readiness.rft_on) as rft_on
from public.test_packs pack
left join public.test_pack_isometrics member on member.test_pack_id = pack.id and member.removed_at is null
left join public.isometric_readiness readiness on readiness.isometric_id = member.isometric_id
group by pack.id;

create or replace view public.test_pack_release_backlog with (security_invoker = true) as
select * from public.test_pack_readiness where not is_rft;

create or replace view public.test_pack_iso_status with (security_invoker = true) as
select member.test_pack_id, member.project_id, member.isometric_id, readiness.is_complete, readiness.is_rft,
  case when readiness.is_rft then 12 else 0 end as status_code, readiness.blocker_counts
from public.test_pack_isometrics member join public.isometric_readiness readiness on readiness.isometric_id = member.isometric_id
where member.removed_at is null;

create or replace view public.test_pack_spool_status with (security_invoker = true) as
select member.test_pack_id, member.project_id, spool_revision.id as spool_revision_id, spool.spool_number,
  coalesce(erection.is_rft, false) as is_rft, erection.nde_pending, erection.pwht_pending
from public.test_pack_isometrics member
join public.isometric_revisions revision on revision.isometric_id = member.isometric_id and revision.status = 'accepted'
join public.spool_revisions spool_revision on spool_revision.isometric_revision_id = revision.id and not spool_revision.is_removed
join public.spools spool on spool.id = spool_revision.spool_id
left join public.spool_erection_readiness erection on erection.spool_revision_id = spool_revision.id
where member.removed_at is null;

revoke all on public.isometric_readiness, public.test_pack_readiness, public.test_pack_release_backlog, public.test_pack_iso_status, public.test_pack_spool_status from anon, authenticated;
grant select on public.isometric_readiness, public.test_pack_readiness, public.test_pack_release_backlog, public.test_pack_iso_status, public.test_pack_spool_status to authenticated;
