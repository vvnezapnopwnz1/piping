create or replace function public.record_location_event_invariant(
  p_project_id uuid,
  p_spool_id uuid,
  p_location_id uuid,
  p_device_id uuid,
  p_direction public.tracking_direction,
  p_occurred_at timestamptz,
  p_reason text,
  p_compensates_event_id uuid,
  p_source public.tracking_event_source,
  p_source_import_job_id uuid,
  p_operator_membership_id uuid,
  p_recorded_by uuid,
  p_source_event_key text
)
returns public.spool_location_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted_revision_id uuid;
  accepted_revision_count integer;
  existing_event public.spool_location_events;
  current_event public.spool_location_events;
  target_event public.spool_location_events;
  inserted_event public.spool_location_events;
begin
  if p_source_event_key is null or length(trim(p_source_event_key)) = 0 then
    raise exception 'A tracking idempotency key is required' using errcode = 'PQS08';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_spool_id::text, 0));

  select event.* into existing_event
  from public.spool_location_events event
  where event.project_id = p_project_id
    and event.source = p_source
    and event.source_event_key = p_source_event_key;

  if found then
    if existing_event.spool_id is distinct from p_spool_id
      or existing_event.location_id is distinct from p_location_id
      or existing_event.direction is distinct from p_direction
      or existing_event.compensates_event_id is distinct from p_compensates_event_id
    then
      raise exception 'Tracking idempotency key was reused with another payload' using errcode = 'PQS08';
    end if;
    return existing_event;
  end if;

  if not exists (
    select 1 from public.spools spool
    where spool.id = p_spool_id and spool.project_id = p_project_id
  ) then
    raise exception 'Spool is not available in this project' using errcode = 'PQS01';
  end if;

  select count(*)::integer, min(revision.id)
    into accepted_revision_count, accepted_revision_id
  from public.spool_revisions revision
  join public.isometric_revisions iso_revision on iso_revision.id = revision.isometric_revision_id
  join public.isometrics iso on iso.id = iso_revision.isometric_id
  where revision.spool_id = p_spool_id
    and not revision.is_removed
    and iso_revision.status = 'accepted'
    and iso.project_id = p_project_id;

  if accepted_revision_count <> 1 or accepted_revision_id is null then
    raise exception 'Spool must have exactly one current accepted revision' using errcode = 'PQS02';
  end if;

  if not exists (
    select 1 from public.project_locations location
    where location.id = p_location_id
      and location.project_id = p_project_id
      and location.status = 'active'
  ) then
    raise exception 'Tracking location is not active in this project' using errcode = 'PQS01';
  end if;

  if not exists (
    select 1 from public.project_memberships membership
    where membership.id = p_operator_membership_id
      and membership.project_id = p_project_id
      and membership.is_active
  ) then
    raise exception 'Tracking operator is not an active project member' using errcode = 'PQS03';
  end if;

  if p_device_id is not null and not exists (
    select 1
    from public.project_device_users assignment
    join public.project_devices device
      on device.id = assignment.device_id
     and device.project_id = assignment.project_id
    where assignment.project_id = p_project_id
      and assignment.membership_id = p_operator_membership_id
      and assignment.device_id = p_device_id
      and assignment.status = 'active'
      and device.status = 'active'
  ) then
    raise exception 'Tracking device is not assigned to this operator' using errcode = 'PQS03';
  end if;

  if (p_source = 'scan_import') <> (p_source_import_job_id is not null) then
    raise exception 'Tracking import provenance is invalid' using errcode = 'PQS06';
  end if;

  if p_source_import_job_id is not null and not exists (
    select 1 from public.import_jobs import_job
    where import_job.id = p_source_import_job_id and import_job.project_id = p_project_id
  ) then
    raise exception 'Tracking import job belongs to another project' using errcode = 'PQS06';
  end if;

  if p_source = 'compensation' then
    if p_direction <> 'manual' or length(trim(coalesce(p_reason, ''))) = 0 or p_compensates_event_id is null then
      raise exception 'A correction requires manual direction, target event, and reason' using errcode = 'PQS07';
    end if;
    select event.* into target_event
    from public.spool_location_events event
    where event.id = p_compensates_event_id
      and event.project_id = p_project_id
      and event.spool_id = p_spool_id
      and not exists (
        select 1 from public.spool_location_events correction
        where correction.compensates_event_id = event.id
      );
    if not found then
      raise exception 'Correction target is missing or already compensated' using errcode = 'PQS07';
    end if;
  elsif p_compensates_event_id is not null then
    raise exception 'Only a compensation may reference another event' using errcode = 'PQS07';
  end if;

  select event.* into current_event
  from public.spool_location_events event
  where event.project_id = p_project_id
    and event.spool_id = p_spool_id
    and not exists (
      select 1 from public.spool_location_events correction
      where correction.compensates_event_id = event.id
    )
  order by event.occurred_at desc, event.recorded_at desc, event.id desc
  limit 1;

  if p_source <> 'compensation' then
    if p_direction = 'out' and (
      current_event.id is null
      or current_event.direction = 'out'
      or current_event.location_id is distinct from p_location_id
    ) then
      raise exception 'Departure requires the spool at the stated location' using errcode = 'PQS04';
    end if;

    if p_direction = 'in' and current_event.id is not null and current_event.direction <> 'out' then
      raise exception 'Arrival requires a spool in transit' using errcode = 'PQS05';
    end if;

    if p_direction = 'manual' and length(trim(coalesce(p_reason, ''))) = 0 then
      raise exception 'Manual adjustment requires a reason' using errcode = 'PQS06';
    end if;
  end if;

  insert into public.spool_location_events (
    project_id,
    spool_id,
    spool_revision_id,
    location_id,
    device_id,
    operator_membership_id,
    direction,
    occurred_at,
    source,
    source_import_job_id,
    source_event_key,
    compensates_event_id,
    reason,
    recorded_by
  ) values (
    p_project_id,
    p_spool_id,
    accepted_revision_id,
    p_location_id,
    p_device_id,
    p_operator_membership_id,
    p_direction,
    p_occurred_at,
    p_source,
    p_source_import_job_id,
    trim(p_source_event_key),
    p_compensates_event_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    p_recorded_by
  )
  returning * into inserted_event;

  return inserted_event;
end;
$$;

revoke all on function public.record_location_event_invariant(
  uuid, uuid, uuid, uuid, public.tracking_direction, timestamptz, text, uuid,
  public.tracking_event_source, uuid, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.record_location_event_invariant(
  uuid, uuid, uuid, uuid, public.tracking_direction, timestamptz, text, uuid,
  public.tracking_event_source, uuid, uuid, uuid, text
) to service_role;

create or replace function public.record_location_event(
  p_project_id uuid,
  p_spool_id uuid,
  p_location_id uuid,
  p_device_id uuid,
  p_direction public.tracking_direction,
  p_occurred_at timestamptz,
  p_reason text,
  p_compensates_event_id uuid,
  p_idempotency_key text
)
returns public.spool_location_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  actor_membership_id uuid;
  derived_source public.tracking_event_source;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select membership.id into actor_membership_id
  from public.project_memberships membership
  where membership.project_id = p_project_id
    and membership.user_id = actor_id
    and membership.is_active;

  if actor_membership_id is null then
    raise exception 'Active project membership is required' using errcode = '42501';
  end if;

  if p_compensates_event_id is not null or p_direction = 'manual' then
    if not public.can_administer_project(p_project_id) then
      raise exception 'Project administration is required for tracking corrections' using errcode = '42501';
    end if;
    derived_source := case when p_compensates_event_id is null then 'manual' else 'compensation' end;
  else
    if not public.current_user_has_capability(p_project_id, 'tracking.event.record') then
      raise exception 'Tracking event permission is required' using errcode = '42501';
    end if;
    derived_source := 'manual';
  end if;

  return public.record_location_event_invariant(
    p_project_id,
    p_spool_id,
    p_location_id,
    p_device_id,
    p_direction,
    p_occurred_at,
    p_reason,
    p_compensates_event_id,
    derived_source,
    null,
    actor_membership_id,
    actor_id,
    p_idempotency_key
  );
end;
$$;

revoke all on function public.record_location_event(
  uuid, uuid, uuid, uuid, public.tracking_direction, timestamptz, text, uuid, text
) from public, anon;
grant execute on function public.record_location_event(
  uuid, uuid, uuid, uuid, public.tracking_direction, timestamptz, text, uuid, text
) to authenticated;
