create function public.fabrication_progress_by_pds_area(target_project_id uuid)
returns table (
  pds_area_id uuid,
  pds_area_code text,
  complete_count bigint,
  in_progress_count bigint,
  not_started_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(target_project_id, 'fabrication.view') then
    raise exception 'Fabrication view permission is required' using errcode = '42501';
  end if;

  return query
  select
    area.id,
    area.code,
    count(projection.spool_revision_id) filter (where projection.current_stage = 'laydown'),
    count(projection.spool_revision_id) filter (
      where projection.current_stage is not null and projection.current_stage <> 'laydown'
    ),
    count(projection.spool_revision_id) filter (where projection.current_stage is null)
  from public.project_pds_areas area
  left join public.fabrication_spool_projections projection
    on projection.project_id = area.project_id
    and projection.pds_area_id = area.id
    and projection.revision_status = 'accepted'
    and not projection.is_removed
  where area.project_id = target_project_id
    and area.status = 'active'
    and public.current_user_in_pds_scope(target_project_id, area.id)
  group by area.id, area.code
  order by area.code;
end;
$$;

revoke all on function public.fabrication_progress_by_pds_area(uuid) from public, anon;
grant execute on function public.fabrication_progress_by_pds_area(uuid) to authenticated;
