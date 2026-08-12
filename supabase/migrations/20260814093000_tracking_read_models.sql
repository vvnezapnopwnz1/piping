create view public.spool_effective_location_events
with (security_invoker = true) as
select event.*
from public.spool_location_events event
where not exists (
  select 1
  from public.spool_location_events correction
  where correction.compensates_event_id = event.id
);

create view public.spool_current_location
with (security_invoker = true) as
with ranked as (
  select
    event.*,
    row_number() over (
      partition by event.project_id, event.spool_id
      order by event.occurred_at desc, event.recorded_at desc, event.id desc
    ) as event_rank
  from public.spool_effective_location_events event
)
select
  ranked.project_id,
  ranked.spool_id,
  ranked.spool_revision_id,
  ranked.id as event_id,
  ranked.direction,
  ranked.location_id as event_location_id,
  case when ranked.direction = 'out' then null else ranked.location_id end as current_location_id,
  case when ranked.direction = 'out' then null else location.code end as current_location_code,
  case when ranked.direction = 'out' then null else location.description end as current_location_description,
  ranked.direction = 'out' as is_in_transit,
  ranked.occurred_at as last_event_at,
  ranked.source as last_event_source,
  ranked.device_id as last_device_id,
  ranked.operator_membership_id as last_operator_membership_id
from ranked
join public.project_locations location on location.id = ranked.location_id
where ranked.event_rank = 1;

create view public.spool_tracking_worklist
with (security_invoker = true) as
select
  spool.project_id,
  spool.id as spool_id,
  revision.id as spool_revision_id,
  iso.id as isometric_id,
  iso.iso_number,
  spool.spool_number,
  iso_revision.revision_number,
  iso_revision.pds_area_id,
  pds.code as pds_area_code,
  pds.description as pds_area_description,
  current_state.event_id as current_event_id,
  current_state.current_location_id,
  current_state.current_location_code,
  current_state.current_location_description,
  coalesce(current_state.is_in_transit, false) as is_in_transit,
  current_state.last_event_at,
  exists (
    select 1 from public.spool_location_events history
    where history.project_id = spool.project_id and history.spool_id = spool.id
  ) as has_ever_scanned,
  exists (
    select 1 from public.spool_stage_events stage_event
    where stage_event.project_id = spool.project_id
      and stage_event.spool_revision_id = revision.id
      and stage_event.stage = 'start_fab'
  )
  and not exists (
    select 1 from public.spool_stage_events stage_event
    where stage_event.project_id = spool.project_id
      and stage_event.spool_revision_id = revision.id
      and stage_event.stage = 'erected'
  ) as is_active,
  case
    when exists (
      select 1 from public.spool_stage_events stage_event
      where stage_event.project_id = spool.project_id
        and stage_event.spool_revision_id = revision.id
        and stage_event.stage = 'erected'
    ) then 'erected'
    when exists (
      select 1 from public.spool_stage_events stage_event
      where stage_event.project_id = spool.project_id
        and stage_event.spool_revision_id = revision.id
        and stage_event.stage = 'start_fab'
    ) then 'active'
    else 'not_started'
  end as construction_status
from public.spools spool
join public.spool_revisions revision
  on revision.spool_id = spool.id
 and not revision.is_removed
join public.isometric_revisions iso_revision
  on iso_revision.id = revision.isometric_revision_id
 and iso_revision.status = 'accepted'
join public.isometrics iso
  on iso.id = iso_revision.isometric_id
 and iso.project_id = spool.project_id
left join public.project_pds_areas pds on pds.id = iso_revision.pds_area_id
left join public.spool_current_location current_state
  on current_state.project_id = spool.project_id
 and current_state.spool_id = spool.id;

create view public.spool_transit_alerts
with (security_invoker = true) as
select
  worklist.project_id,
  worklist.spool_id,
  worklist.spool_revision_id,
  worklist.isometric_id,
  worklist.iso_number,
  worklist.spool_number,
  current_state.event_location_id as departure_location_id,
  departure.code as departure_location_code,
  worklist.last_event_at as transit_started_at,
  greatest(0, floor(extract(epoch from (timezone('utc', now()) - worklist.last_event_at)) / 86400))::integer as transit_days,
  project.maximum_transit_time_days,
  timezone('utc', now()) > worklist.last_event_at + make_interval(days => project.maximum_transit_time_days) as is_overdue
from public.spool_tracking_worklist worklist
join public.projects project on project.id = worklist.project_id
join public.spool_current_location current_state
  on current_state.project_id = worklist.project_id
 and current_state.spool_id = worklist.spool_id
left join public.project_locations departure on departure.id = current_state.event_location_id
where worklist.is_in_transit;

create view public.spool_tracking_inconsistencies
with (security_invoker = true) as
with sequenced as (
  select
    event.*,
    lag(event.direction) over (
      partition by event.project_id, event.spool_id
      order by event.occurred_at, event.recorded_at, event.id
    ) as previous_direction
  from public.spool_effective_location_events event
)
select
  sequenced.project_id,
  sequenced.spool_id,
  sequenced.spool_revision_id,
  sequenced.id as event_id,
  sequenced.occurred_at,
  case
    when sequenced.direction = 'out' and sequenced.previous_direction = 'out' then 'repeated_departure'
    when sequenced.direction = 'in' and sequenced.previous_direction in ('in', 'manual') then 'arrival_without_transit'
  end as issue_code
from sequenced
where (sequenced.direction = 'out' and sequenced.previous_direction = 'out')
   or (sequenced.direction = 'in' and sequenced.previous_direction in ('in', 'manual'));

create view public.tracking_location_occupancy
with (security_invoker = true) as
select
  location.project_id,
  location.id as location_id,
  location.category_id,
  category.code as category_code,
  location.code as location_code,
  location.description as location_description,
  location.capacity,
  count(current_state.spool_id)::bigint as current_count,
  case when location.capacity is null then null else location.capacity - count(current_state.spool_id)::integer end as remaining_capacity
from public.project_locations location
join public.project_location_categories category
  on category.id = location.category_id
 and category.project_id = location.project_id
left join public.spool_current_location current_state
  on current_state.project_id = location.project_id
 and current_state.current_location_id = location.id
where location.status = 'active'
group by location.project_id, location.id, location.category_id, category.code,
  location.code, location.description, location.capacity;

create view public.tracking_device_usage
with (security_invoker = true) as
select
  event.project_id,
  event.device_id,
  device.code as device_code,
  device.description as device_description,
  event.operator_membership_id,
  event.location_id,
  location.code as location_code,
  count(*)::bigint as scan_count,
  max(event.occurred_at) as last_used_at
from public.spool_effective_location_events event
join public.project_devices device
  on device.id = event.device_id
 and device.project_id = event.project_id
join public.project_locations location
  on location.id = event.location_id
 and location.project_id = event.project_id
where event.device_id is not null
group by event.project_id, event.device_id, device.code, device.description,
  event.operator_membership_id, event.location_id, location.code;

drop policy if exists "tracking users read isometrics" on public.isometrics;
create policy "tracking users read isometrics" on public.isometrics for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read spools" on public.spools;
create policy "tracking users read spools" on public.spools for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read isometric revisions" on public.isometric_revisions;
create policy "tracking users read isometric revisions" on public.isometric_revisions for select to authenticated
using (exists (select 1 from public.isometrics iso where iso.id = isometric_id and public.current_user_has_capability(iso.project_id, 'tracking.view')));
drop policy if exists "tracking users read spool revisions" on public.spool_revisions;
create policy "tracking users read spool revisions" on public.spool_revisions for select to authenticated
using (exists (select 1 from public.spools spool where spool.id = spool_id and public.current_user_has_capability(spool.project_id, 'tracking.view')));
drop policy if exists "tracking users read construction events" on public.construction_progress_events;
create policy "tracking users read construction events" on public.construction_progress_events for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read PDS areas" on public.project_pds_areas;
create policy "tracking users read PDS areas" on public.project_pds_areas for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read locations" on public.project_locations;
create policy "tracking users read locations" on public.project_locations for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read location categories" on public.project_location_categories;
create policy "tracking users read location categories" on public.project_location_categories for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));
drop policy if exists "tracking users read devices" on public.project_devices;
create policy "tracking users read devices" on public.project_devices for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));

grant select on public.spool_effective_location_events,
  public.spool_current_location,
  public.spool_tracking_worklist,
  public.spool_transit_alerts,
  public.spool_tracking_inconsistencies,
  public.tracking_location_occupancy,
  public.tracking_device_usage
to authenticated, service_role;
