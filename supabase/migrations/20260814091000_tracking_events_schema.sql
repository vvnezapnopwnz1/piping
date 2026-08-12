create type public.tracking_direction as enum ('in', 'out', 'manual');
create type public.tracking_event_source as enum ('manual', 'scan_import', 'compensation');

create table public.spool_location_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_id uuid not null references public.spools(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  location_id uuid not null references public.project_locations(id) on delete restrict,
  device_id uuid references public.project_devices(id) on delete restrict,
  operator_membership_id uuid not null references public.project_memberships(id) on delete restrict,
  direction public.tracking_direction not null,
  occurred_at timestamptz not null,
  source public.tracking_event_source not null,
  source_import_job_id uuid references public.import_jobs(id) on delete restrict,
  source_event_key text,
  compensates_event_id uuid references public.spool_location_events(id) on delete restrict,
  reason text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default timezone('utc', now()),
  constraint spool_location_events_import_provenance check (
    (source = 'scan_import') = (source_import_job_id is not null)
  ),
  constraint spool_location_events_compensation_provenance check (
    (source = 'compensation') = (compensates_event_id is not null)
  ),
  constraint spool_location_events_reason_required check (
    (direction <> 'manual' and source <> 'compensation')
    or length(trim(coalesce(reason, ''))) > 0
  ),
  constraint spool_location_events_source_key_not_blank check (
    source_event_key is null or length(trim(source_event_key)) > 0
  ),
  constraint spool_location_events_not_self_compensation check (
    compensates_event_id is null or compensates_event_id <> id
  )
);

create unique index spool_location_events_source_key_uq
  on public.spool_location_events(project_id, source, source_event_key)
  where source_event_key is not null;

create unique index spool_location_events_compensation_uq
  on public.spool_location_events(compensates_event_id)
  where compensates_event_id is not null;

create index spool_location_events_project_time_idx
  on public.spool_location_events(project_id, occurred_at desc, recorded_at desc);

create index spool_location_events_spool_time_idx
  on public.spool_location_events(project_id, spool_id, occurred_at desc, recorded_at desc);

create or replace function public.validate_spool_location_event()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  stable_spool_project_id uuid;
  revision_spool_id uuid;
  revision_project_id uuid;
  location_project_id uuid;
  device_project_id uuid;
  operator_project_id uuid;
  import_project_id uuid;
  target_project_id uuid;
  target_spool_id uuid;
begin
  select spool.project_id into stable_spool_project_id
  from public.spools spool where spool.id = new.spool_id;

  select revision.spool_id, iso.project_id
    into revision_spool_id, revision_project_id
  from public.spool_revisions revision
  join public.isometric_revisions iso_revision on iso_revision.id = revision.isometric_revision_id
  join public.isometrics iso on iso.id = iso_revision.isometric_id
  where revision.id = new.spool_revision_id;

  select location.project_id into location_project_id
  from public.project_locations location where location.id = new.location_id;

  if new.device_id is not null then
    select device.project_id into device_project_id
    from public.project_devices device where device.id = new.device_id;
  end if;

  select membership.project_id into operator_project_id
  from public.project_memberships membership where membership.id = new.operator_membership_id;

  if new.source_import_job_id is not null then
    select import_job.project_id into import_project_id
    from public.import_jobs import_job where import_job.id = new.source_import_job_id;
  end if;

  if stable_spool_project_id is distinct from new.project_id
    or revision_project_id is distinct from new.project_id
    or revision_spool_id is distinct from new.spool_id
    or location_project_id is distinct from new.project_id
    or (new.device_id is not null and device_project_id is distinct from new.project_id)
    or operator_project_id is distinct from new.project_id
    or (new.source_import_job_id is not null and import_project_id is distinct from new.project_id)
  then
    raise exception 'Tracking event references must belong to the same project and spool'
      using errcode = '23503';
  end if;

  if new.compensates_event_id is not null then
    select target.project_id, target.spool_id into target_project_id, target_spool_id
    from public.spool_location_events target where target.id = new.compensates_event_id;
    if target_project_id is distinct from new.project_id or target_spool_id is distinct from new.spool_id then
      raise exception 'A correction must target an event for the same project and spool'
        using errcode = '23503';
    end if;
  end if;

  return new;
end;
$$;

create trigger spool_location_events_validate
  before insert on public.spool_location_events
  for each row execute function public.validate_spool_location_event();

create or replace function public.reject_spool_location_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Spool location history is append-only' using errcode = 'PQS09';
end;
$$;

create trigger spool_location_events_append_only
  before update or delete on public.spool_location_events
  for each row execute function public.reject_spool_location_event_mutation();

alter table public.spool_location_events enable row level security;

create policy "tracking users read location events"
on public.spool_location_events for select to authenticated
using (public.current_user_has_capability(project_id, 'tracking.view'));

revoke all on public.spool_location_events from public, anon, authenticated;
grant select on public.spool_location_events to authenticated;
grant all on public.spool_location_events to service_role;
