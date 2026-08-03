-- Track 06: Persist NDE category code on obligation creation

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
      required_coverage, selection_mode, category_code, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      method_name::public.ndt_method, coverage,
      case when coverage >= 100 then 'full' else 'spot' end,
      case when coverage >= 100 then 'NDE100' else 'S' end,
      rule.id
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
