alter table public.import_jobs
  drop constraint if exists import_jobs_import_type_check;
alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list',
    'welding_procedure',
    'welder_qualification',
    'thickness_flange',
    'nde_matrix',
    'spooling_definition',
    'flange_progress',
    'test_pack_composition',
    'tracking_scan'
  ));

create or replace function public.apply_tracking_scan_import_job(
  target_job_id uuid,
  confirm_conflicts boolean default false
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  imported_row public.import_job_rows;
  resolved_spool_id uuid;
  resolved_location_id uuid;
  resolved_device_id uuid;
  resolved_operator_membership_id uuid;
  external_event_id text;
  source_key text;
  imported_event public.spool_location_events;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found or job.import_type <> 'tracking_scan' then
    raise exception 'Tracking scan import job was not found' using errcode = 'PQC12';
  end if;
  if not public.can_administer_project(job.project_id) then
    raise exception 'Project administration is required for tracking imports' using errcode = '42501';
  end if;
  if job.applied_at is not null or job.status = 'applied' then
    return job;
  end if;
  if job.status <> 'validated' then
    raise exception 'Import job must be validated before it can be applied' using errcode = 'PQC11';
  end if;
  if exists (
    select 1 from public.import_job_issues issue
    where issue.job_id = target_job_id and issue.severity = 'blocker'
  ) then
    raise exception 'Import cannot be applied while blocking issues remain' using errcode = 'PQC13';
  end if;

  for imported_row in
    select * from public.import_job_rows
    where job_id = target_job_id and action <> 'skip'
    order by row_number
  loop
    select spool.id into resolved_spool_id
    from public.isometrics iso
    join public.isometric_revisions iso_revision
      on iso_revision.isometric_id = iso.id
     and iso_revision.status = 'accepted'
    join public.spool_revisions spool_revision
      on spool_revision.isometric_revision_id = iso_revision.id
     and not spool_revision.is_removed
    join public.spools spool
      on spool.id = spool_revision.spool_id
     and spool.project_id = iso.project_id
    where iso.project_id = job.project_id
      and upper(iso.iso_number) = upper(imported_row.normalized_values ->> 'iso_number')
      and upper(spool.spool_number) = upper(imported_row.normalized_values ->> 'spool_number');
    if not found then
      raise exception 'Tracking import row % cannot resolve its accepted ISO and spool', imported_row.row_number using errcode = 'PQS01';
    end if;

    select location.id into resolved_location_id
    from public.project_locations location
    where location.project_id = job.project_id
      and location.status = 'active'
      and upper(location.code) = upper(imported_row.normalized_values ->> 'location_code');
    if not found then
      raise exception 'Tracking import row % has an unknown location', imported_row.row_number using errcode = 'PQS01';
    end if;

    select device.id into resolved_device_id
    from public.project_devices device
    where device.project_id = job.project_id
      and device.status = 'active'
      and upper(device.code) = upper(imported_row.normalized_values ->> 'device_code');
    if not found then
      raise exception 'Tracking import row % has an unknown device', imported_row.row_number using errcode = 'PQS03';
    end if;

    select membership.id into resolved_operator_membership_id
    from public.project_memberships membership
    join public.profiles profile on profile.id = membership.user_id
    where membership.project_id = job.project_id
      and membership.is_active
      and lower(profile.email) = lower(imported_row.normalized_values ->> 'operator_email');
    if not found then
      raise exception 'Tracking import row % has an unknown operator', imported_row.row_number using errcode = 'PQS03';
    end if;

    external_event_id := nullif(trim(coalesce(imported_row.normalized_values ->> 'external_event_id', '')), '');
    if external_event_id is not null then
      source_key := 'external:' || lower(external_event_id);
    else
      source_key := 'fingerprint:' || encode(digest(concat_ws('|',
        job.project_id::text,
        upper(imported_row.normalized_values ->> 'spool_number'),
        (imported_row.normalized_values ->> 'occurred_at')::timestamptz::text,
        lower(imported_row.normalized_values ->> 'direction'),
        upper(imported_row.normalized_values ->> 'location_code'),
        upper(imported_row.normalized_values ->> 'device_code')
      ), 'sha256'), 'hex');
    end if;

    imported_event := public.record_location_event_invariant(
      job.project_id,
      resolved_spool_id,
      resolved_location_id,
      resolved_device_id,
      (imported_row.normalized_values ->> 'direction')::public.tracking_direction,
      (imported_row.normalized_values ->> 'occurred_at')::timestamptz,
      null,
      null,
      'scan_import',
      job.id,
      resolved_operator_membership_id,
      auth.uid(),
      source_key
    );

    if imported_event.source_import_job_id = job.id
      and not imported_event.id = any(affected)
    then
      affected := affected || imported_event.id;
      written := written + 1;
    end if;
  end loop;

  update public.import_jobs
  set status = 'applied',
      applied_at = timezone('utc', now()),
      completed_at = timezone('utc', now()),
      applied_row_count = written,
      affected_entity_ids = affected,
      conflicts_confirmed = coalesce(confirm_conflicts, false)
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state)
  values (job.project_id, auth.uid(), 'import_jobs', job.id, 'apply_tracking_scan_import_job', to_jsonb(job));

  return job;
end;
$$;

revoke all on function public.apply_tracking_scan_import_job(uuid, boolean) from public, anon;
grant execute on function public.apply_tracking_scan_import_job(uuid, boolean) to authenticated;
