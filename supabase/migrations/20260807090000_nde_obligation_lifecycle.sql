-- Track 06: NDE obligation lifecycle and readiness replacement

alter table public.nde_obligations
  add column cycle_kind text not null default 'original'
    check (cycle_kind in ('original', 'repair', 'tracer')),
  add column cycle_ordinal smallint not null default 0
    check (cycle_ordinal >= 0 and cycle_ordinal <= 2),
  add column parent_obligation_id uuid
    references public.nde_obligations(id) on delete restrict,
  add column category_code text not null default 'S'
    check (category_code in ('S', 'SS', 'NR', 'H', 'HS', 'NDE100')),
  add column responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  add constraint nde_obligations_cycle_lineage check (
    (cycle_kind = 'original' and cycle_ordinal = 0 and parent_obligation_id is null)
    or (cycle_kind <> 'original' and cycle_ordinal between 1 and 2
        and parent_obligation_id is not null)
  );

alter table public.nde_obligations
  drop constraint nde_obligations_weld_joint_revision_id_method_key,
  add constraint nde_obligations_cycle_key
    unique (weld_joint_revision_id, method, cycle_kind, cycle_ordinal);

-- Widen disposition vocabulary
alter table public.nde_obligations
  drop constraint nde_obligations_disposition_check,
  add constraint nde_obligations_disposition_check
    check (disposition in ('pending', 'issued', 'satisfied', 'rejected', 'waived', 'superseded'));

-- Update generate_weld_obligations ON CONFLICT target to match nde_obligations_cycle_key
create or replace function public.generate_weld_obligations(ctx public.weld_context)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rule public.nde_matrix_rules;
  method_name text;
  coverage numeric;
  created_count integer := 0;
begin
  select * into rule
  from public.nde_matrix_rules matrix
  where matrix.project_id = ctx.project_id
    and matrix.service_class_id = ctx.service_class_id
    and matrix.weld_type_id = ctx.weld_type_id
    and matrix.weld_location = ctx.weld_location
    and matrix.status = 'active';

  if rule.id is null then
    raise exception
      'No active NDE matrix rule covers this service class, weld type and location'
      using errcode = 'PQC39';
  end if;

  foreach method_name in array array['rt', 'ut', 'mt', 'pt', 'pmi', 'ht']
  loop
    coverage := case method_name
      when 'rt' then rule.rt_coverage
      when 'ut' then rule.ut_coverage
      when 'mt' then rule.mt_coverage
      when 'pt' then rule.pt_coverage
      when 'pmi' then rule.pmi_coverage
      when 'ht' then rule.ht_coverage
    end;

    if coalesce(coverage, 0) <= 0 then
      continue;
    end if;

    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      method_name::public.ndt_method, coverage,
      case when coverage >= 100 then 'full' else 'spot' end, rule.id
    )
    on conflict (weld_joint_revision_id, method, cycle_kind, cycle_ordinal) do nothing;

    if found then
      created_count := created_count + 1;
    end if;
  end loop;

  if rule.pwht_required
     and (rule.pwht_thickness_threshold is null
          or coalesce(ctx.thickness_mm, 0) >= rule.pwht_thickness_threshold) then
    insert into public.pwht_requirements (
      project_id, weld_joint_revision_id, spool_revision_id,
      thickness_threshold_mm, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      rule.pwht_thickness_threshold, rule.id
    )
    on conflict (weld_joint_revision_id) do nothing;
  end if;

  return created_count;
end;
$$;

-- Replace spool_fabrication_readiness view
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
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
    and quality.nde_pending = 0
    and quality.pwht_pending = 0
  ) as is_releasable
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
       and obligation.disposition not in ('satisfied', 'waived', 'superseded'))
      as nde_pending,
    (select count(*)::int from public.pwht_requirements requirement
     where requirement.spool_revision_id = sr.id
       and not exists (
         select 1 from public.pwht_results result
         where result.pwht_requirement_id = requirement.id and result.outcome = 'accepted'
       ))
      as pwht_pending
) quality;
