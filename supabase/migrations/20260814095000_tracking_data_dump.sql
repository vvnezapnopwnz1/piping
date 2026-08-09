create or replace function public.get_tracking_data_dump(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.can_administer_project(p_project_id) then
    raise exception 'Project administrator access is required'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'active_spools', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'iso_number', worklist.iso_number,
          'spool_number', worklist.spool_number,
          'pds_area_code', worklist.pds_area_code,
          'construction_status', worklist.construction_status,
          'current_location_code', worklist.current_location_code,
          'last_event_at', worklist.last_event_at
        ) order by worklist.iso_number, worklist.spool_number
      )
      from public.spool_tracking_worklist worklist
      where worklist.project_id = p_project_id
        and worklist.is_active
    ), '[]'::jsonb),
    'sub_locations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'location_code', occupancy.location_code,
          'location_description', occupancy.location_description,
          'category_code', occupancy.category_code,
          'capacity', occupancy.capacity,
          'current_count', occupancy.current_count
        ) order by occupancy.category_code, occupancy.location_code
      )
      from public.tracking_location_occupancy occupancy
      where occupancy.project_id = p_project_id
    ), '[]'::jsonb),
    'pda_users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'membership_id', assignment.membership_id,
          'full_name', profile.full_name,
          'email', profile.email,
          'device_code', device.code,
          'last_used_at', usage.last_used_at
        ) order by profile.full_name, assignment.membership_id
      )
      from public.project_device_users assignment
      join public.project_memberships membership
        on membership.id = assignment.membership_id
       and membership.project_id = assignment.project_id
      join public.profiles profile on profile.id = membership.user_id
      left join public.project_devices device
        on device.id = assignment.device_id
       and device.project_id = assignment.project_id
      left join lateral (
        select max(device_usage.last_used_at) as last_used_at
        from public.tracking_device_usage device_usage
        where device_usage.project_id = assignment.project_id
          and device_usage.operator_membership_id = assignment.membership_id
          and device_usage.device_id is not distinct from assignment.device_id
      ) usage on true
      where assignment.project_id = p_project_id
        and assignment.status = 'active'
        and membership.is_active
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_tracking_data_dump(uuid) from public, anon;
grant execute on function public.get_tracking_data_dump(uuid) to authenticated, service_role;
