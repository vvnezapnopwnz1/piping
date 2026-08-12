alter table public.project_locations
  add column if not exists capacity integer;

alter table public.project_locations
  drop constraint if exists project_locations_capacity_positive;

alter table public.project_locations
  add constraint project_locations_capacity_positive
  check (capacity > 0);

create or replace function public.list_tracking_device_user_candidates(p_project_id uuid)
returns table (
  membership_id uuid,
  full_name text,
  email text,
  device_user_id uuid,
  device_id uuid,
  device_code text,
  is_assigned boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_has_capability(p_project_id, 'project_referential.manage') then
    raise exception 'Project referential management is required' using errcode = '42501';
  end if;

  return query
  select
    membership.id,
    profile.full_name,
    profile.email,
    assignment.id,
    assignment.device_id,
    device.code,
    assignment.id is not null and assignment.status = 'active'
  from public.project_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  left join public.project_device_users assignment
    on assignment.project_id = membership.project_id
   and assignment.membership_id = membership.id
  left join public.project_devices device
    on device.project_id = membership.project_id
   and device.id = assignment.device_id
  where membership.project_id = p_project_id
    and membership.is_active
  order by profile.email nulls last, membership.id;
end;
$$;

revoke all on function public.list_tracking_device_user_candidates(uuid) from public, anon;
grant execute on function public.list_tracking_device_user_candidates(uuid) to authenticated;
