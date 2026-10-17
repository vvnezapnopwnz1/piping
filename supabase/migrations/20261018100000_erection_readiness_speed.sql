-- N2: spool_erection_readiness stops running row-level security on every joined table for every spool.
--
-- Measured on UPG-1 (94 spools, docs/acceptance/2026-10-17-read-path-timings.md): 1.4 s locally, 11.5 s on KZ.
-- The cost is not the capability check itself but spool_revision_project_id(), a security-invoker helper:
-- each call re-evaluates the row-level security of spool_revisions (a hashed scan of every spool the caller
-- can see) before the capability is even looked at, about 2 ms per row, on every row of weld_joint_revisions,
-- spool_revision_materials and the other tables the view joined.
--
-- Chosen technique: read the readiness from fabrication_spool_projections, which already stores the
-- erection facts and answers RLS with one project-level capability check per row (13 ms for the same 96
-- spools). The projection gains the five facts the view still computed live; recompute_erection_spool_projection
-- fills them with the formulas the view used, and it already runs after every fabrication refresh, which in
-- turn runs on every weld, support, NDE, PWHT, material and ledger write.
--
-- Access: the view now follows the projection policies (fabrication.view or erection.view, plus the
-- restrictive PDS-area scope) instead of the per-table policies of the tables it used to join.
-- Same columns, same types, same order: the dependent views (isometric_readiness, test_pack_spool_status
-- and the phase-five document projections) are replaced in place, never dropped.

alter table public.fabrication_spool_projections
  add column if not exists material_line_total integer not null default 0,
  add column if not exists material_line_checked integer not null default 0,
  add column if not exists material_checked_on date,
  add column if not exists last_field_weld_on date,
  add column if not exists last_field_support_on date;

CREATE OR REPLACE FUNCTION public.recompute_erection_spool_projection(target_spool_revision_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      material_line_total = facts.material_line_total, material_line_checked = facts.material_line_checked,
      material_checked_on = facts.material_checked_on,
      last_field_weld_on = facts.last_weld_on, last_field_support_on = facts.last_support_on,
      updated_at = timezone('utc', now())
  from (
    select sr.id,
      dates.to_site_on, dates.erected_on, dates.welded_bolted_on, dates.supported_on,
      welds.field_weld_total, welds.field_weld_complete, supports.field_support_total, supports.field_support_recorded,
      quality.nde_pending, quality.pwht_pending,
      material.material_line_total, material.material_line_checked, material.material_checked_on,
      welds.last_weld_on, supports.last_support_on,
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
      select count(line.id)::int as material_line_total,
             count(distinct item.spool_revision_material_id)::int as material_line_checked,
             max(mcr.checked_on) as material_checked_on
      from public.spool_revision_materials line
      left join public.material_check_records mcr on mcr.spool_revision_id = sr.id
      left join public.material_check_items item
        on item.material_check_record_id = mcr.id and item.spool_revision_material_id = line.id
      where line.spool_revision_id = sr.id
    ) material
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
end; $function$;

-- Fill the new facts for every existing projection row, from the same function that maintains them.
do $$
declare target uuid;
begin
  for target in select spool_revision_id from public.fabrication_spool_projections loop
    perform public.recompute_erection_spool_projection(target);
  end loop;
end $$;

create or replace view public.spool_erection_readiness with (security_invoker = true) as
select
  fsp.spool_revision_id,
  fsp.project_id,
  fsp.iso_number,
  fsp.spool_number,
  fsp.revision_number,
  fsp.revision_status::public.revision_status as revision_status,
  fsp.material_line_total,
  fsp.material_line_checked,
  fsp.material_checked_on,
  fsp.field_weld_total,
  fsp.field_weld_complete,
  fsp.last_field_weld_on,
  fsp.field_support_total,
  fsp.field_support_recorded,
  fsp.last_field_support_on,
  fsp.to_site_on,
  fsp.erected_on,
  fsp.welded_bolted_on,
  fsp.supported_on,
  fsp.field_nde_pending as nde_pending,
  fsp.field_pwht_pending as pwht_pending,
  fsp.is_rft,
  fsp.rft_on,
  fsp.rft_blockers
from public.fabrication_spool_projections fsp;

revoke all on public.spool_erection_readiness from anon, authenticated;
grant select on public.spool_erection_readiness to authenticated;
