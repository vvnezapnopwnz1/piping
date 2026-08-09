create or replace view public.tracking_location_occupancy
with (security_invoker = true) as
select
  location.project_id,
  location.id as location_id,
  location.category_id,
  category.code as category_code,
  location.code as location_code,
  location.description as location_description,
  location.capacity,
  count(active_spool.spool_id)::bigint as current_count,
  case when location.capacity is null then null else location.capacity - count(active_spool.spool_id)::integer end as remaining_capacity
from public.project_locations location
join public.project_location_categories category
  on category.id = location.category_id
 and category.project_id = location.project_id
left join public.spool_current_location current_state
  on current_state.project_id = location.project_id
 and current_state.current_location_id = location.id
left join public.spool_tracking_worklist active_spool
  on active_spool.project_id = current_state.project_id
 and active_spool.spool_id = current_state.spool_id
 and active_spool.is_active
where location.status = 'active'
group by location.project_id, location.id, location.category_id, category.code,
  location.code, location.description, location.capacity;

grant select on public.tracking_location_occupancy to authenticated, service_role;
