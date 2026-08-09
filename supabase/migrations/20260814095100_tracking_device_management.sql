drop policy if exists "tracking users read device assignments" on public.project_device_users;
create policy "tracking users read device assignments"
on public.project_device_users for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));

create view public.tracking_device_management
with (security_invoker = true) as
select
  device.project_id,
  device.id as device_id,
  device.code as device_code,
  device.description as device_description,
  device.status as device_status,
  assignment.membership_id as assigned_membership_id,
  assignment.status as assignment_status,
  coalesce(usage.scan_count, 0::bigint) as scan_count,
  usage.most_frequent_operator_membership_id,
  usage.most_frequent_location_code,
  usage.last_used_at
from public.project_devices device
left join public.project_device_users assignment
  on assignment.project_id = device.project_id
 and assignment.device_id = device.id
 and assignment.status = 'active'
left join lateral (
  select
    sum(row.scan_count)::bigint as scan_count,
    (array_agg(row.operator_membership_id order by row.scan_count desc, row.last_used_at desc, row.operator_membership_id))[1] as most_frequent_operator_membership_id,
    (array_agg(row.location_code order by row.scan_count desc, row.last_used_at desc, row.location_code))[1] as most_frequent_location_code,
    max(row.last_used_at) as last_used_at
  from public.tracking_device_usage row
  where row.project_id = device.project_id and row.device_id = device.id
) usage on true;

grant select on public.tracking_device_management to authenticated, service_role;
