-- Phase 1, Step 8 (B6/B7): Server owns readiness reason codes and workflow state.
--
-- 1. fabrication_spool_projections stores release_blockers and rft_blockers.
-- 2. spool_fabrication_readiness exposes release_blockers.
-- 3. spool_erection_readiness exposes rft_blockers.
-- 4. erection_rft_blocker_distribution uses stored rft_blockers.
-- 5. New test_pack_workflow view (security_invoker) exposes canonical_state,
--    stage states, blockers and available_operations.

-- 1. Extend fabrication_spool_projections table
alter table public.fabrication_spool_projections
  add column if not exists release_blockers jsonb not null default '[]'::jsonb,
  add column if not exists rft_blockers jsonb not null default '[]'::jsonb;

-- Grant select and add RLS policies on fabrication_spool_projections
grant select on public.fabrication_spool_projections to authenticated;

drop policy if exists "fabrication spool projections scoped" on public.fabrication_spool_projections;
create policy "fabrication spool projections scoped"
  on public.fabrication_spool_projections
  for select to authenticated
  using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'erection.view')
  );

drop policy if exists "fabrication spool projections pds scope restrictive" on public.fabrication_spool_projections;
create policy "fabrication spool projections pds scope restrictive"
  on public.fabrication_spool_projections
  as restrictive
  for select to authenticated
  using (
    public.current_user_in_pds_scope(project_id, pds_area_id)
  );

-- Update recompute_fabrication_spool_projection to compute release_blockers
create or replace function public.recompute_fabrication_spool_projection(target_spool_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_spool_revision_id::text, 0));

  insert into public.fabrication_spool_projections (
    spool_revision_id, project_id, pds_area_id, iso_number, spool_number, revision_number,
    revision_status, is_removed,
    start_fab_on, material_check_on, fabricated_on, qc_release_on, sent_to_paint_on,
    painted_on, final_qc_on, laydown_on, current_stage,
    is_fabricated, is_releasable,
    line_total, line_checked, weld_total, weld_complete, support_total, support_recorded,
    nde_pending, pwht_pending, release_blockers
  )
  select
    sr.id,
    iso.project_id,
    rev.pds_area_id,
    iso.iso_number,
    spool.spool_number,
    rev.revision_number::text,
    rev.status::text,
    sr.is_removed,
    stages.start_fab_on,
    stages.material_check_on,
    readiness.fabricated_on,
    stages.qc_release_on,
    stages.sent_to_paint_on,
    stages.painted_on,
    stages.final_qc_on,
    stages.laydown_on,
    case
      when stages.laydown_on is not null then 'laydown'
      when stages.final_qc_on is not null then 'final_qc'
      when stages.painted_on is not null then 'painted'
      when stages.sent_to_paint_on is not null then 'sent_to_paint'
      when stages.qc_release_on is not null then 'qc_release'
      when readiness.is_fabricated then 'fabricated'
      when stages.material_check_on is not null then 'material_check'
      when stages.start_fab_on is not null then 'start_fab'
    end::public.construction_stage,
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
    rel_blockers.release_blockers
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  join public.spools spool on spool.id = sr.spool_id
  cross join lateral (
    select
      max(event.occurred_on) filter (where event.stage = 'start_fab') as start_fab_on,
      max(event.occurred_on) filter (where event.stage = 'material_check') as material_check_on,
      max(event.occurred_on) filter (where event.stage = 'qc_release') as qc_release_on,
      max(event.occurred_on) filter (where event.stage = 'sent_to_paint') as sent_to_paint_on,
      max(event.occurred_on) filter (where event.stage = 'painted') as painted_on,
      max(event.occurred_on) filter (where event.stage = 'final_qc') as final_qc_on,
      max(event.occurred_on) filter (where event.stage = 'laydown') as laydown_on
    from public.construction_progress_events event
    where event.spool_revision_id = sr.id
      and event.phase = 'fabrication'
      and event.source <> 'compensation'
      and not exists (
        select 1
        from public.construction_progress_events cancel
        where cancel.source = 'compensation'
          and cancel.compensates_event_id = event.id
      )
  ) stages
  cross join lateral (
    select
      bill.line_total,
      bill.line_checked,
      welds.weld_total,
      welds.weld_complete,
      supports.support_total,
      supports.support_recorded,
      obligations.nde_pending,
      obligations.pwht_pending,
      (
        bill.line_total > 0
        and bill.line_total = bill.line_checked
        and welds.weld_total = welds.weld_complete
        and supports.support_total = supports.support_recorded
      ) as is_fabricated,
      case
        when bill.line_total > 0
          and bill.line_total = bill.line_checked
          and welds.weld_total = welds.weld_complete
          and supports.support_total = supports.support_recorded
        then greatest(bill.material_checked_on, welds.last_weld_on, supports.last_support_on)
      end as fabricated_on,
      (
        rev.status = 'accepted'
        and bill.line_total > 0
        and bill.line_total = bill.line_checked
        and welds.weld_total = welds.weld_complete
        and supports.support_total = supports.support_recorded
        and obligations.nde_pending = 0
        and obligations.pwht_pending = 0
      ) as is_releasable
    from lateral (
      select
        count(line.id)::int as line_total,
        count(distinct item.spool_revision_material_id)::int as line_checked,
        max(record.checked_on) as material_checked_on
      from public.spool_revision_materials line
      left join public.material_check_items item on item.spool_revision_material_id = line.id
      left join public.material_check_records record on record.id = item.material_check_record_id
      where line.spool_revision_id = sr.id
    ) bill
    cross join lateral (
      select
        count(joint.id)::int as weld_total,
        count(progress.id) filter (where progress.weld_on is not null)::int as weld_complete,
        max(progress.weld_on) as last_weld_on
      from public.weld_joint_revisions joint
      left join public.weld_progress_records progress on progress.weld_joint_revision_id = joint.id
      where joint.spool_revision_id = sr.id
        and not joint.is_removed
        and joint.weld_location = 'shop'
    ) welds
    cross join lateral (
      select
        count(support.id)::int as support_total,
        count(progress.id)::int as support_recorded,
        max(progress.installed_on) as last_support_on
      from public.support_revisions support
      left join public.support_progress_records progress on progress.support_revision_id = support.id
      where support.spool_revision_id = sr.id and not support.is_removed
    ) supports
    cross join lateral (
      select
        (
          select count(*)::int
          from public.nde_obligations obligation
          where obligation.spool_revision_id = sr.id
            and obligation.disposition not in ('satisfied', 'waived', 'superseded')
        ) as nde_pending,
        (
          select count(*)::int
          from public.pwht_requirements requirement
          where requirement.spool_revision_id = sr.id
            and not exists (
              select 1
              from public.pwht_results result
              where result.pwht_requirement_id = requirement.id
                and result.outcome = 'accepted'
            )
        ) as pwht_pending
    ) obligations
  ) readiness
  cross join lateral (
    select
      coalesce(jsonb_agg(blocker), '[]'::jsonb) as release_blockers
    from (
      select jsonb_build_object('code', 'revision_not_accepted', 'values', jsonb_build_object('status', rev.status::text)) as blocker
      where rev.status <> 'accepted'
      union all
      select jsonb_build_object(
        'code', 'material_incomplete',
        'values', case when readiness.line_total = 0 then jsonb_build_object() else jsonb_build_object('checked', readiness.line_checked, 'total', readiness.line_total) end
      ) as blocker
      where readiness.line_total = 0 or readiness.line_checked < readiness.line_total
      union all
      select jsonb_build_object(
        'code', 'welding_incomplete',
        'values', case when readiness.weld_total = 0 then jsonb_build_object() else jsonb_build_object('complete', readiness.weld_complete, 'total', readiness.weld_total) end
      ) as blocker
      where readiness.weld_complete < readiness.weld_total
      union all
      select jsonb_build_object(
        'code', 'supports_incomplete',
        'values', case when readiness.support_total = 0 then jsonb_build_object() else jsonb_build_object('recorded', readiness.support_recorded, 'total', readiness.support_total) end
      ) as blocker
      where readiness.support_recorded < readiness.support_total
      union all
      select jsonb_build_object(
        'code', 'nde_open',
        'values', jsonb_build_object('count', readiness.nde_pending)
      ) as blocker
      where readiness.nde_pending > 0
      union all
      select jsonb_build_object(
        'code', 'pwht_open',
        'values', jsonb_build_object('count', readiness.pwht_pending)
      ) as blocker
      where readiness.pwht_pending > 0
    ) b
  ) rel_blockers
  where sr.id = target_spool_revision_id
  on conflict (spool_revision_id) do update
    set project_id = excluded.project_id,
        pds_area_id = excluded.pds_area_id,
        iso_number = excluded.iso_number,
        spool_number = excluded.spool_number,
        revision_number = excluded.revision_number,
        revision_status = excluded.revision_status,
        is_removed = excluded.is_removed,
        start_fab_on = excluded.start_fab_on,
        material_check_on = excluded.material_check_on,
        fabricated_on = excluded.fabricated_on,
        qc_release_on = excluded.qc_release_on,
        sent_to_paint_on = excluded.sent_to_paint_on,
        painted_on = excluded.painted_on,
        final_qc_on = excluded.final_qc_on,
        laydown_on = excluded.laydown_on,
        current_stage = excluded.current_stage,
        is_fabricated = excluded.is_fabricated,
        is_releasable = excluded.is_releasable,
        line_total = excluded.line_total,
        line_checked = excluded.line_checked,
        weld_total = excluded.weld_total,
        weld_complete = excluded.weld_complete,
        support_total = excluded.support_total,
        support_recorded = excluded.support_recorded,
        nde_pending = excluded.nde_pending,
        pwht_pending = excluded.pwht_pending,
        release_blockers = excluded.release_blockers,
        projection_version = public.fabrication_spool_projections.projection_version + 1,
        updated_at = timezone('utc', now());
end;
$$;

-- Update recompute_erection_spool_projection to compute rft_blockers
create or replace function public.recompute_erection_spool_projection(target_spool_revision_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_spool_revision_id::text, 1));
  update public.fabrication_spool_projections projection
  set to_site_on = facts.to_site_on, erected_on = facts.erected_on,
      welded_bolted_on = facts.welded_bolted_on, supported_on = facts.supported_on,
      current_erection_stage = facts.current_erection_stage, is_rft = facts.is_rft, rft_on = facts.rft_on,
      field_weld_total = facts.field_weld_total, field_weld_complete = facts.field_weld_complete,
      field_support_total = facts.field_support_total, field_support_recorded = facts.field_support_recorded,
      field_nde_pending = facts.nde_pending, field_pwht_pending = facts.pwht_pending,
      rft_blockers = facts.rft_blockers,
      updated_at = timezone('utc', now())
  from (
    select sr.id,
      dates.to_site_on, dates.erected_on, dates.welded_bolted_on, dates.supported_on,
      welds.field_weld_total, welds.field_weld_complete, supports.field_support_total, supports.field_support_recorded,
      quality.nde_pending, quality.pwht_pending,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then true else false end as is_rft,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then greatest(dates.welded_bolted_on, dates.supported_on, welds.last_weld_on, supports.last_support_on) end as rft_on,
      case when dates.welded_bolted_on is not null and dates.supported_on is not null and quality.nde_pending = 0 and quality.pwht_pending = 0 then 'rft'::public.construction_stage
           when dates.supported_on is not null then 'supported'::public.construction_stage
           when dates.welded_bolted_on is not null then 'welded_bolted'::public.construction_stage
           when dates.erected_on is not null then 'erected'::public.construction_stage
           when dates.to_site_on is not null then 'to_site'::public.construction_stage end as current_erection_stage,
      coalesce(rft_b.rft_blockers, '[]'::jsonb) as rft_blockers
    from public.spool_revisions sr
    cross join lateral (select max(occurred_on) filter (where stage = 'to_site') as to_site_on, max(occurred_on) filter (where stage = 'erected') as erected_on, max(occurred_on) filter (where stage = 'welded_bolted') as welded_bolted_on, max(occurred_on) filter (where stage = 'supported') as supported_on from public.spool_stage_events where spool_revision_id = sr.id and phase = 'erection') dates
    cross join lateral (select count(j.id)::int as field_weld_total, count(p.id) filter (where p.phase = 'erection' and p.weld_on is not null)::int as field_weld_complete, max(p.weld_on) filter (where p.phase = 'erection') as last_weld_on from public.weld_joint_revisions j left join public.weld_progress_records p on p.weld_joint_revision_id = j.id where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed) welds
    cross join lateral (select count(s.id)::int as field_support_total, count(p.id) filter (where p.phase = 'erection')::int as field_support_recorded, max(p.installed_on) filter (where p.phase = 'erection') as last_support_on from public.support_revisions s left join public.support_progress_records p on p.support_revision_id = s.id where s.spool_revision_id = sr.id and not s.is_removed) supports
    cross join lateral (select count(o.id) filter (where o.disposition not in ('satisfied','waived','superseded'))::int as nde_pending, count(q.id) filter (where not exists (select 1 from public.pwht_results result where result.pwht_requirement_id = q.id and result.outcome = 'accepted'))::int as pwht_pending from public.weld_joint_revisions j left join public.nde_obligations o on o.weld_joint_revision_id = j.id left join public.pwht_requirements q on q.weld_joint_revision_id = j.id where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed) quality
    cross join lateral (
      select coalesce(jsonb_agg(blocker), '[]'::jsonb) as rft_blockers
      from (
        select jsonb_build_object('kind', 'welded_bolted') as blocker
        where dates.welded_bolted_on is null
        union all
        select jsonb_build_object('kind', 'supported') as blocker
        where dates.supported_on is null
        union all
        select jsonb_build_object('kind', 'nde', 'count', quality.nde_pending) as blocker
        where quality.nde_pending > 0
        union all
        select jsonb_build_object('kind', 'pwht', 'count', quality.pwht_pending) as blocker
        where quality.pwht_pending > 0
      ) b
    ) rft_b
    where sr.id = target_spool_revision_id
  ) facts where projection.spool_revision_id = facts.id;
end; $$;

-- 2. Update spool_fabrication_readiness view to expose release_blockers
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
  (
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
  ) as is_fabricated,
  case
    when bill.line_total > 0 and bill.line_total = bill.line_checked
      and welds.weld_total = welds.weld_complete
      and sup.support_total = sup.support_recorded
    then greatest(bill.material_checked_on, welds.last_weld_on, sup.last_support_on)
  end as fabricated_on,
  (
    rev.status = 'accepted'
    and bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
    and quality.nde_pending = 0
    and quality.pwht_pending = 0
  ) as is_releasable,
  coalesce(rel_blockers.release_blockers, '[]'::jsonb) as release_blockers
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
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
) quality
cross join lateral (
  select
    coalesce(jsonb_agg(blocker), '[]'::jsonb) as release_blockers
  from (
    select jsonb_build_object('code', 'revision_not_accepted', 'values', jsonb_build_object('status', rev.status::text)) as blocker
    where rev.status <> 'accepted'
    union all
    select jsonb_build_object(
      'code', 'material_incomplete',
      'values', case when bill.line_total = 0 then jsonb_build_object() else jsonb_build_object('checked', bill.line_checked, 'total', bill.line_total) end
    ) as blocker
    where bill.line_total = 0 or bill.line_checked < bill.line_total
    union all
    select jsonb_build_object(
      'code', 'welding_incomplete',
      'values', case when welds.weld_total = 0 then jsonb_build_object() else jsonb_build_object('complete', welds.weld_complete, 'total', welds.weld_total) end
    ) as blocker
    where welds.weld_complete < welds.weld_total
    union all
    select jsonb_build_object(
      'code', 'supports_incomplete',
      'values', case when sup.support_total = 0 then jsonb_build_object() else jsonb_build_object('recorded', sup.support_recorded, 'total', sup.support_total) end
    ) as blocker
    where sup.support_recorded < sup.support_total
    union all
    select jsonb_build_object(
      'code', 'nde_open',
      'values', jsonb_build_object('count', quality.nde_pending)
    ) as blocker
    where quality.nde_pending > 0
    union all
    select jsonb_build_object(
      'code', 'pwht_open',
      'values', jsonb_build_object('count', quality.pwht_pending)
    ) as blocker
    where quality.pwht_pending > 0
  ) b
) rel_blockers;

-- 3. Update spool_erection_readiness view to expose rft_blockers
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
  (
    dates.welded_bolted_on is not null
    and dates.supported_on is not null
    and quality.nde_pending = 0
    and quality.pwht_pending = 0
  ) as is_rft,
  case
    when dates.welded_bolted_on is not null
      and dates.supported_on is not null
      and quality.nde_pending = 0
      and quality.pwht_pending = 0
    then greatest(
      dates.welded_bolted_on,
      dates.supported_on,
      welds.last_field_weld_on,
      supports.last_field_support_on,
      material.material_checked_on
    )
  end as rft_on,
  coalesce(rft_b.rft_blockers, '[]'::jsonb) as rft_blockers
from public.spool_revisions sr
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
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
) quality
cross join lateral (
  select coalesce(jsonb_agg(blocker), '[]'::jsonb) as rft_blockers
  from (
    select jsonb_build_object('kind', 'welded_bolted') as blocker
    where dates.welded_bolted_on is null
    union all
    select jsonb_build_object('kind', 'supported') as blocker
    where dates.supported_on is null
    union all
    select jsonb_build_object('kind', 'nde', 'count', quality.nde_pending) as blocker
    where quality.nde_pending > 0
    union all
    select jsonb_build_object('kind', 'pwht', 'count', quality.pwht_pending) as blocker
    where quality.pwht_pending > 0
  ) b
) rft_b;

-- 4. Update erection_rft_blocker_distribution to read from stored rft_blockers
create or replace function public.erection_rft_blocker_distribution(target_project_id uuid)
returns table (blocker text, blocker_order integer, spool_count bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.current_user_has_capability(target_project_id, 'erection.view') then
    raise exception 'Erection view permission is required' using errcode = '42501';
  end if;
  return query
  with scoped as (
    select * from public.fabrication_spool_projections p
    where p.project_id = target_project_id
      and p.revision_status = 'accepted'
      and not p.is_removed
      and not p.is_rft
      and public.current_user_in_pds_scope(p.project_id, p.pds_area_id)
  ), blockers(blocker, blocker_order) as (
    values ('welded_bolted'::text, 0), ('supported', 1), ('nde', 2), ('pwht', 3)
  )
  select
    b.blocker,
    b.blocker_order,
    count(*) filter (where exists (
      select 1 from jsonb_array_elements(p.rft_blockers) elem
      where elem ->> 'kind' = b.blocker
    ))
  from blockers b
  cross join scoped p
  group by b.blocker, b.blocker_order
  order by b.blocker_order;
end;
$$;

-- 5. Update list_fabrication_spools to return release_blockers and rft_blockers
drop function if exists public.list_fabrication_spools(uuid, text, text, text, uuid, integer);

create function public.list_fabrication_spools(
  target_project_id uuid,
  target_stage text default null,
  after_iso_number text default null,
  after_spool_number text default null,
  after_spool_revision_id uuid default null,
  page_limit integer default 50
)
returns table (
  spool_revision_id uuid,
  project_id uuid,
  iso_number text,
  spool_number text,
  revision_number text,
  pds_area_id uuid,
  current_stage public.construction_stage,
  start_fab_on date,
  material_check_on date,
  fabricated_on date,
  qc_release_on date,
  sent_to_paint_on date,
  painted_on date,
  final_qc_on date,
  laydown_on date,
  is_fabricated boolean,
  is_releasable boolean,
  line_total integer,
  line_checked integer,
  weld_total integer,
  weld_complete integer,
  support_total integer,
  support_recorded integer,
  nde_pending integer,
  pwht_pending integer,
  release_blockers jsonb,
  rft_blockers jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if page_limit < 1 or page_limit > 100 then
    raise exception 'The fabrication page limit must be between 1 and 100' using errcode = '23514';
  end if;
  if not public.current_user_has_capability(target_project_id, 'fabrication.view') then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;
  if after_spool_revision_id is not null
     and (after_iso_number is null or after_spool_number is null) then
    raise exception 'A fabrication cursor must include ISO and spool numbers' using errcode = '23514';
  end if;

  return query
  select
    projection.spool_revision_id,
    projection.project_id,
    projection.iso_number,
    projection.spool_number,
    projection.revision_number,
    projection.pds_area_id,
    projection.current_stage,
    projection.start_fab_on,
    projection.material_check_on,
    projection.fabricated_on,
    projection.qc_release_on,
    projection.sent_to_paint_on,
    projection.painted_on,
    projection.final_qc_on,
    projection.laydown_on,
    projection.is_fabricated,
    projection.is_releasable,
    projection.line_total,
    projection.line_checked,
    projection.weld_total,
    projection.weld_complete,
    projection.support_total,
    projection.support_recorded,
    projection.nde_pending,
    projection.pwht_pending,
    projection.release_blockers,
    projection.rft_blockers
  from public.fabrication_spool_projections projection
  where projection.project_id = target_project_id
    and projection.revision_status = 'accepted'
    and not projection.is_removed
    and public.current_user_in_pds_scope(projection.project_id, projection.pds_area_id)
    and (target_stage is null or projection.current_stage::text = target_stage)
    and (
      after_spool_revision_id is null
      or (projection.iso_number, projection.spool_number, projection.spool_revision_id)
           > (after_iso_number, after_spool_number, after_spool_revision_id)
    )
  order by projection.iso_number, projection.spool_number, projection.spool_revision_id
  limit page_limit;
end;
$$;

revoke all on function public.list_fabrication_spools(uuid, text, text, text, uuid, integer) from public, anon;
grant execute on function public.list_fabrication_spools(uuid, text, text, text, uuid, integer) to authenticated;

-- 6. Create test_pack_workflow view (security_invoker = true)
create or replace view public.test_pack_workflow
with (security_invoker = true)
as
with pack_facts as (
  select
    pack.id as test_pack_id,
    pack.project_id,
    pack.test_pack_number,
    pack.revision_no,
    pack.lifecycle,
    coalesce(readiness.is_rft, false) as is_rft,
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
    case when d.blinding_completed and not d.testing_started then 'testing_start' end,
    case when d.testing_started and not d.testing_completed then 'testing_complete' end,
    case when d.testing_completed and d.y_eligible and not d.y_reinstated then 'y_reinstatement' end,
    case when d.testing_completed and (not d.y_eligible or d.y_reinstated) and not d.precommissioned then 'precommissioning' end,
    case when d.precommissioned and d.z_eligible and not d.z_reinstated then 'z_reinstatement' end
  ], null) as available_operations
from derived d;

revoke all on public.test_pack_workflow from anon, authenticated;
grant select on public.test_pack_workflow to authenticated;

-- 7. Backfill existing fabrication_spool_projections rows
do $$
declare r record;
begin
  for r in select spool_revision_id from public.fabrication_spool_projections loop
    perform public.recompute_fabrication_spool_projection(r.spool_revision_id);
    perform public.recompute_erection_spool_projection(r.spool_revision_id);
  end loop;
end;
$$;
