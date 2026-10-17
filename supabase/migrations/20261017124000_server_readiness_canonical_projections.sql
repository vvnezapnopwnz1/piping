-- Migration: 20261017124000_server_readiness_canonical_projections.sql
-- Description: Unify readiness views to read canonical verdicts and blockers from fabrication_spool_projections
--              and expand test_pack_workflow.available_operations with UI-expected operation codes.

-- 1. Redefine spool_fabrication_readiness to read canonical readiness from fabrication_spool_projections
create or replace view public.spool_fabrication_readiness with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  rev.status as revision_status,
  bill.line_total,
  bill.line_checked,
  (bill.line_total > 0 and bill.line_total = bill.line_checked) as is_material_checked,
  bill.material_checked_on,
  welds.weld_total,
  welds.weld_complete,
  welds.last_weld_on,
  sup.support_total,
  sup.support_recorded,
  sup.last_support_on,
  quality.nde_pending,
  quality.pwht_pending,
  coalesce(fsp.is_fabricated, false) as is_fabricated,
  fsp.fabricated_on,
  coalesce(fsp.is_releasable, false) as is_releasable,
  coalesce(fsp.release_blockers, '[]'::jsonb) as release_blockers
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
left join public.fabrication_spool_projections fsp on fsp.spool_revision_id = sr.id
cross join lateral (
  select
    count(line.id)::int as line_total,
    count(distinct item.spool_revision_material_id)::int as line_checked,
    max(mcr.checked_on) as material_checked_on
  from public.spool_revision_materials line
  left join public.material_check_items item
    on item.spool_revision_material_id = line.id
  left join public.material_check_records mcr
    on mcr.id = item.material_check_record_id
  where line.spool_revision_id = sr.id
) bill
cross join lateral (
  select
    count(wjr.id)::int as weld_total,
    count(progress.id) filter (where progress.weld_on is not null)::int as weld_complete,
    max(progress.weld_on) as last_weld_on
  from public.weld_joint_revisions wjr
  left join public.weld_progress_records progress
    on progress.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id and not wjr.is_removed and wjr.weld_location = 'shop'
) welds
cross join lateral (
  select
    count(supr.id)::int as support_total,
    count(progress.id)::int as support_recorded,
    max(progress.installed_on) as last_support_on
  from public.support_revisions supr
  left join public.support_progress_records progress
    on progress.support_revision_id = supr.id
  where supr.spool_revision_id = sr.id and not supr.is_removed
) sup
cross join lateral (
  select
    (select count(*)::int from public.nde_obligations obligation
     where obligation.spool_revision_id = sr.id
       and obligation.disposition not in ('satisfied', 'waived', 'superseded')) as nde_pending,
    (select count(*)::int from public.pwht_requirements requirement
     where requirement.spool_revision_id = sr.id
       and not exists (
         select 1 from public.pwht_results result
         where result.pwht_requirement_id = requirement.id
           and result.outcome = 'accepted'
       )) as pwht_pending
) quality;

revoke all on public.spool_fabrication_readiness from anon, authenticated;
grant select on public.spool_fabrication_readiness to authenticated;

-- 2. Redefine spool_erection_readiness to read canonical readiness from fabrication_spool_projections
create or replace view public.spool_erection_readiness with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  iso.iso_number,
  spool.spool_number,
  rev.revision_number,
  rev.status as revision_status,
  material.material_line_total,
  material.material_line_checked,
  material.material_checked_on,
  welds.field_weld_total,
  welds.field_weld_complete,
  welds.last_field_weld_on,
  supports.field_support_total,
  supports.field_support_recorded,
  supports.last_field_support_on,
  dates.to_site_on,
  dates.erected_on,
  dates.welded_bolted_on,
  dates.supported_on,
  quality.nde_pending,
  quality.pwht_pending,
  coalesce(fsp.is_rft, false) as is_rft,
  fsp.rft_on,
  coalesce(fsp.rft_blockers, '[]'::jsonb) as rft_blockers
from public.spool_revisions sr
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
left join public.fabrication_spool_projections fsp on fsp.spool_revision_id = sr.id
cross join lateral (
  select
    count(line.id)::int as material_line_total,
    count(distinct item.spool_revision_material_id)::int as material_line_checked,
    max(mcr.checked_on) as material_checked_on
  from public.spool_revision_materials line
  left join public.material_check_records mcr
    on mcr.spool_revision_id = sr.id
  left join public.material_check_items item
    on item.material_check_record_id = mcr.id
   and item.spool_revision_material_id = line.id
  where line.spool_revision_id = sr.id
) material
cross join lateral (
  select
    count(wjr.id)::int as field_weld_total,
    count(progress.id) filter (
      where progress.phase = 'erection' and progress.weld_on is not null
    )::int as field_weld_complete,
    max(progress.weld_on) filter (where progress.phase = 'erection') as last_field_weld_on
  from public.weld_joint_revisions wjr
  left join public.weld_progress_records progress
    on progress.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id
    and wjr.weld_location = 'field'
    and not wjr.is_removed
) welds
cross join lateral (
  select
    count(supr.id)::int as field_support_total,
    count(progress.id) filter (where progress.phase = 'erection')::int as field_support_recorded,
    max(progress.installed_on) filter (where progress.phase = 'erection') as last_field_support_on
  from public.support_revisions supr
  left join public.support_progress_records progress
    on progress.support_revision_id = supr.id
  where supr.spool_revision_id = sr.id and not supr.is_removed
) supports
cross join lateral (
  select
    max(event.occurred_on) filter (where event.stage = 'to_site') as to_site_on,
    max(event.occurred_on) filter (where event.stage = 'erected') as erected_on,
    max(event.occurred_on) filter (where event.stage = 'welded_bolted') as welded_bolted_on,
    max(event.occurred_on) filter (where event.stage = 'supported') as supported_on
  from public.construction_progress_events event
  where event.spool_revision_id = sr.id
    and event.phase = 'erection'
    and event.source <> 'compensation'
    and not exists (
      select 1 from public.construction_progress_events cancel
      where cancel.source = 'compensation'
        and cancel.compensates_event_id = event.id
    )
) dates
cross join lateral (
  select
    count(o.id) filter (where o.disposition not in ('satisfied', 'waived', 'superseded'))::int as nde_pending,
    count(q.id) filter (where not exists (
      select 1 from public.pwht_results result where result.pwht_requirement_id = q.id and result.outcome = 'accepted'
    ))::int as pwht_pending
  from public.weld_joint_revisions j
  left join public.nde_obligations o on o.weld_joint_revision_id = j.id
  left join public.pwht_requirements q on q.weld_joint_revision_id = j.id
  where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed
) quality;

revoke all on public.spool_erection_readiness from anon, authenticated;
grant select on public.spool_erection_readiness to authenticated;

-- 3. Update test_pack_workflow to ensure available_operations includes testing and its sub-actions
create or replace view public.test_pack_workflow with (security_invoker = true) as
with pack_facts as (
  select
    pack.id as test_pack_id,
    pack.project_id,
    pack.test_pack_number,
    pack.revision_no,
    pack.lifecycle,
    readiness.is_rft,
    jsonb_build_object(
      'NO_SPOOLS', coalesce(readiness.no_spools_count, 0),
      'WELD_OR_SUPPORT_PENDING', coalesce(readiness.weld_or_support_pending_count, 0),
      'FLANGE_PENDING', coalesce(readiness.flange_pending_count, 0),
      'NDE_PENDING', coalesce(readiness.nde_pending_count, 0),
      'PWHT_PENDING', coalesce(readiness.pwht_pending_count, 0),
      'LINE_CHECK_PENDING', coalesce(readiness.line_check_pending_count, 0),
      'X_OPEN', coalesce(readiness.x_open_count, 0)
    ) as rft_blocker_counts,
    readiness.rft_on
  from public.test_packs pack
  left join public.test_pack_readiness readiness on readiness.test_pack_id = pack.id
), blinding_facts as (
  select
    pack.test_pack_id,
    exists (
      select 1
      from public.pressure_test_requests req
      where req.test_pack_id = pack.test_pack_id
        and req.request_type = 'blinding'
        and req.cancelled_at is null
    ) as blinding_assigned,
    exists (
      select 1
      from public.blinding_records rec
      where rec.test_pack_id = pack.test_pack_id
    ) as blinding_completed,
    (
      select max(rec.completed_on)
      from public.blinding_records rec
      where rec.test_pack_id = pack.test_pack_id
    ) as blinding_completed_on
  from pack_facts pack
), stage_event_facts as (
  select
    pack.test_pack_id,
    max(ev.occurred_on) filter (where ev.stage = 'testing_started') as testing_started_on,
    max(ev.occurred_on) filter (where ev.stage = 'testing_completed') as testing_completed_on,
    max(ev.occurred_on) filter (where ev.stage = 'precommissioning_completed') as precommissioning_completed_on
  from pack_facts pack
  left join public.pressure_test_stage_events ev on ev.test_pack_id = pack.test_pack_id
  group by pack.test_pack_id
), flange_facts as (
  select
    pack.test_pack_id,
    count(flange.flange_joint_revision_id) filter (where flange.category_code = 'Y')::int as y_target_count,
    count(flange.flange_joint_revision_id) filter (
      where flange.category_code = 'Y' and exists (
        select 1
        from public.flange_reinstatement_records rec
        where rec.flange_joint_revision_id = flange.flange_joint_revision_id
          and rec.superseded_at is null
      )
    )::int as y_completed_count,
    count(flange.flange_joint_revision_id) filter (where flange.category_code = 'Z')::int as z_target_count,
    count(flange.flange_joint_revision_id) filter (
      where flange.category_code = 'Z' and exists (
        select 1
        from public.flange_reinstatement_records rec
        where rec.flange_joint_revision_id = flange.flange_joint_revision_id
          and rec.superseded_at is null
      )
    )::int as z_completed_count
  from pack_facts pack
  left join public.test_pack_isometrics member
    on member.test_pack_id = pack.test_pack_id
   and member.removed_at is null
  left join public.flange_joint_readiness flange
    on flange.isometric_id = member.isometric_id
   and flange.revision_status = 'accepted'
   and not flange.is_removed
   and flange.requires_reinstatement
  group by pack.test_pack_id
), prep_worklist_facts as (
  select
    pack.test_pack_id,
    count(lc.isometric_id)::int as line_check_total,
    count(lc.isometric_id) filter (where lc.result_id is not null)::int as line_check_completed,
    count(ic.punch_item_id)::int as item_clearance_total,
    count(ic.punch_item_id) filter (where ic.clearance_id is not null)::int as item_clearance_cleared
  from pack_facts pack
  left join public.line_check_worklist lc
    on lc.test_pack_id = pack.test_pack_id and lc.cancelled_at is null
  left join public.item_clearance_worklist ic
    on ic.test_pack_id = pack.test_pack_id and ic.cancelled_at is null
  group by pack.test_pack_id
), derived as (
  select
    pf.test_pack_id,
    pf.project_id,
    pf.test_pack_number,
    pf.revision_no,
    pf.lifecycle,
    pf.is_rft,
    pf.rft_on,
    pf.rft_blocker_counts,
    bf.blinding_assigned,
    bf.blinding_completed,
    bf.blinding_completed_on,
    (ef.testing_started_on is not null) as testing_started,
    ef.testing_started_on,
    (ef.testing_completed_on is not null) as testing_completed,
    ef.testing_completed_on,
    (ef.precommissioning_completed_on is not null) as precommissioned,
    ef.precommissioning_completed_on,
    coalesce(ff.y_target_count, 0) as y_target_count,
    coalesce(ff.y_completed_count, 0) as y_completed_count,
    coalesce(ff.z_target_count, 0) as z_target_count,
    coalesce(ff.z_completed_count, 0) as z_completed_count,
    coalesce(pw.line_check_total, 0) as line_check_total,
    coalesce(pw.line_check_completed, 0) as line_check_completed,
    coalesce(pw.item_clearance_total, 0) as item_clearance_total,
    coalesce(pw.item_clearance_cleared, 0) as item_clearance_cleared,
    (coalesce(ff.y_target_count, 0) > 0) as y_eligible,
    (coalesce(ff.y_target_count, 0) > 0 and coalesce(ff.y_completed_count, 0) >= coalesce(ff.y_target_count, 0)) as y_reinstated,
    (coalesce(ff.z_target_count, 0) > 0) as z_eligible,
    (coalesce(ff.z_target_count, 0) > 0 and coalesce(ff.z_completed_count, 0) >= coalesce(ff.z_target_count, 0)) as z_reinstated
  from pack_facts pf
  left join blinding_facts bf on bf.test_pack_id = pf.test_pack_id
  left join stage_event_facts ef on ef.test_pack_id = pf.test_pack_id
  left join flange_facts ff on ff.test_pack_id = pf.test_pack_id
  left join prep_worklist_facts pw on pw.test_pack_id = pf.test_pack_id
)
select
  d.test_pack_id,
  d.project_id,
  d.test_pack_number,
  d.revision_no,
  d.lifecycle,
  d.is_rft,
  d.rft_on,
  d.blinding_assigned,
  d.blinding_completed,
  d.blinding_completed_on,
  d.testing_started,
  d.testing_started_on,
  d.testing_completed,
  d.testing_completed_on,
  d.precommissioned,
  d.precommissioning_completed_on,
  d.y_target_count,
  d.y_completed_count,
  d.z_target_count,
  d.z_completed_count,
  d.line_check_total,
  d.line_check_completed,
  d.item_clearance_total,
  d.item_clearance_cleared,
  case when d.is_rft then 'completed' else 'blocked' end as rft_state,
  case
    when d.blinding_completed then 'completed'
    when not d.is_rft then 'blocked'
    when d.blinding_assigned then 'ongoing'
    else 'ready'
  end as blinding_state,
  case
    when d.testing_completed then 'completed'
    when not d.blinding_completed then 'blocked'
    when d.testing_started then 'ongoing'
    else 'ready'
  end as testing_state,
  case
    when not d.y_eligible then 'not_applicable'
    when d.y_reinstated then 'completed'
    when not d.testing_completed then 'blocked'
    when d.y_completed_count > 0 then 'ongoing'
    else 'ready'
  end as y_state,
  case
    when d.precommissioned then 'completed'
    when not (d.testing_completed and (not d.y_eligible or d.y_reinstated)) then 'blocked'
    else 'ready'
  end as precomm_state,
  case
    when not d.z_eligible then 'not_applicable'
    when d.z_reinstated then 'completed'
    when not d.precommissioned then 'blocked'
    when d.z_completed_count > 0 then 'ongoing'
    else 'ready'
  end as z_state,
  case
    when not d.is_rft then 'awaiting_rft'
    when not (d.blinding_assigned and d.blinding_completed) then 'blinding_assigned'
    when not d.testing_started then 'blinded'
    when not d.testing_completed then 'testing'
    when d.y_eligible and not d.y_reinstated then 'awaiting_y_reinstatement'
    when not d.precommissioned then 'ready_for_precommissioning'
    when d.z_eligible and not d.z_reinstated then 'awaiting_z_reinstatement'
    else 'complete'
  end as canonical_state,
  jsonb_build_object(
    'rft', case when not d.is_rft then coalesce(d.rft_blocker_counts, '{}'::jsonb) else '{}'::jsonb end,
    'blinding', case when not d.is_rft then jsonb_build_array('rft_pending') else '[]'::jsonb end,
    'testing', case when not d.blinding_completed then jsonb_build_array('blinding_pending') else '[]'::jsonb end,
    'y_reinstatement', case when not d.testing_completed then jsonb_build_array('testing_pending') else '[]'::jsonb end,
    'precommissioning', case
      when not d.testing_completed then jsonb_build_array('testing_pending')
      when d.y_eligible and not d.y_reinstated then jsonb_build_array('y_reinstatement_pending')
      else '[]'::jsonb
    end,
    'z_reinstatement', case when not d.precommissioned then jsonb_build_array('precommissioning_pending') else '[]'::jsonb end
  ) as blockers,
  array_remove(array[
    case when d.is_rft and not d.blinding_completed then 'blinding' end,
    case when d.blinding_completed and not d.testing_started then 'testing' end,
    case when d.blinding_completed and not d.testing_started then 'testing_start' end,
    case when d.testing_started and not d.testing_completed then 'testing' end,
    case when d.testing_started and not d.testing_completed then 'testing_complete' end,
    case when d.testing_completed and d.y_eligible and not d.y_reinstated then 'y_reinstatement' end,
    case when d.testing_completed and (not d.y_eligible or d.y_reinstated) and not d.precommissioned then 'precommissioning' end,
    case when d.precommissioned and d.z_eligible and not d.z_reinstated then 'z_reinstatement' end
  ], null) as available_operations
from derived d;

revoke all on public.test_pack_workflow from anon, authenticated;
grant select on public.test_pack_workflow to authenticated;
