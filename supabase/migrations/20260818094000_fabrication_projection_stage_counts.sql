-- The dashboard cards must not derive their totals from the current cursor page.
-- This RPC aggregates the narrow, indexed projection under the same capability and PDS boundary
-- as the list endpoint.
create function public.fabrication_spool_stage_counts(target_project_id uuid)
returns table (current_stage text, spool_count bigint)
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
    coalesce(projection.current_stage::text, 'not_started'),
    count(*)
  from public.fabrication_spool_projections projection
  where projection.project_id = target_project_id
    and projection.revision_status = 'accepted'
    and not projection.is_removed
    and public.current_user_in_pds_scope(projection.project_id, projection.pds_area_id)
  group by coalesce(projection.current_stage::text, 'not_started');
end;
$$;

revoke all on function public.fabrication_spool_stage_counts(uuid) from public, anon;
grant execute on function public.fabrication_spool_stage_counts(uuid) to authenticated;
