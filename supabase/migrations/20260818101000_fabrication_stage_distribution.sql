create function public.fabrication_stage_distribution(target_project_id uuid)
returns table (stage text, stage_order integer, spool_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'fabrication.view') then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;

  return query
  with stages(stage, stage_order) as (
    values
      ('not_started'::text, 0),
      ('start_fab', 1),
      ('material_check', 2),
      ('fabricated', 3),
      ('qc_release', 4),
      ('sent_to_paint', 5),
      ('painted', 6),
      ('final_qc', 7),
      ('laydown', 8)
  ), visible_counts as (
    select coalesce(projection.current_stage::text, 'not_started') as stage, count(*) as spool_count
    from public.fabrication_spool_projections projection
    where projection.project_id = target_project_id
      and projection.revision_status = 'accepted'
      and not projection.is_removed
      and public.current_user_in_pds_scope(projection.project_id, projection.pds_area_id)
    group by coalesce(projection.current_stage::text, 'not_started')
  )
  select stages.stage, stages.stage_order, coalesce(visible_counts.spool_count, 0)
  from stages
  left join visible_counts using (stage)
  order by stages.stage_order;
end;
$$;

revoke all on function public.fabrication_stage_distribution(uuid) from public, anon;
grant execute on function public.fabrication_stage_distribution(uuid) to authenticated;
