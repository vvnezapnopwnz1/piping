-- Track 07: authoritative field erection readiness. RFT is a projection, never a flag.

create view public.spool_erection_readiness with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  iso.iso_number,
  spool.spool_number,
  rev.revision_number,
  rev.status as revision_status,
  material.field_line_total,
  material.field_line_checked,
  material.field_material_checked_on,
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
      material.field_material_checked_on
    )
  end as rft_on
from public.spool_revisions sr
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
cross join lateral (
  select
    count(line.id)::int as field_line_total,
    count(distinct item.spool_revision_material_id)::int as field_line_checked,
    max(mcr.checked_on) as field_material_checked_on
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
  where supr.spool_revision_id = sr.id
    and not supr.is_removed
) supports
cross join lateral (
  select
    max(event.occurred_on) filter (where event.stage = 'to_site') as to_site_on,
    max(event.occurred_on) filter (where event.stage = 'erected') as erected_on,
    max(event.occurred_on) filter (where event.stage = 'welded_bolted') as welded_bolted_on,
    max(event.occurred_on) filter (where event.stage = 'supported') as supported_on
  from public.spool_stage_events event
  where event.spool_revision_id = sr.id and event.phase = 'erection'
) dates
cross join lateral (
  select
    count(obligation.id) filter (
      where obligation.disposition not in ('satisfied', 'waived', 'superseded')
    )::int as nde_pending,
    count(requirement.id) filter (
      where not exists (
        select 1 from public.pwht_results result
        where result.pwht_requirement_id = requirement.id and result.outcome = 'accepted'
      )
    )::int as pwht_pending
  from public.weld_joint_revisions wjr
  left join public.nde_obligations obligation
    on obligation.weld_joint_revision_id = wjr.id
  left join public.pwht_requirements requirement
    on requirement.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id
    and wjr.weld_location = 'field'
    and not wjr.is_removed
) quality
where not sr.is_removed;

grant select on public.spool_erection_readiness to authenticated;
