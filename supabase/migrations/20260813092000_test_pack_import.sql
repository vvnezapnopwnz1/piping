-- Track 10: Test Pack composition import reuses the Track 03 job lifecycle.

alter table public.import_jobs drop constraint if exists import_jobs_import_type_check;
alter table public.import_jobs add constraint import_jobs_import_type_check
check (import_type in (
  'piping_material_list', 'welding_procedure', 'welder_qualification', 'thickness_flange',
  'nde_matrix', 'spooling_definition', 'flange_progress', 'test_pack_composition'
));

create or replace function public.revalidate_test_pack_import_job(target_job_id uuid)
returns table (blocker_count integer, conflict_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare job public.import_jobs; row_rec record; accepted record; pack public.test_packs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found or job.import_type <> 'test_pack_composition' then raise exception 'Test Pack import job was not found' using errcode = 'PQC12'; end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') or not public.current_user_has_capability(job.project_id, 'testpack.manage') then
    raise exception 'Test Pack import needs both import and Test Pack management permissions' using errcode = 'PQC92';
  end if;
  delete from public.import_job_issues where job_id = target_job_id and code like 'SRV_TP_%';

  for row_rec in select * from public.import_job_rows where job_id = target_job_id and action <> 'skip' order by row_number loop
    select iso.id, iso.project_id, revision.id as revision_id, revision.revision_number, revision.pds_area_id
      into accepted
      from public.isometrics iso join public.isometric_revisions revision on revision.isometric_id = iso.id and revision.status = 'accepted'
      where iso.project_id = job.project_id and upper(iso.iso_number) = upper(row_rec.normalized_values ->> 'iso_number')
      order by revision.revision_ordinal desc limit 1;
    if not found then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_number', 'blocker', 'SRV_TP_UNKNOWN_ISO', 'ISO does not exist in this project or has no accepted revision');
      continue;
    end if;
    if upper(coalesce(row_rec.normalized_values ->> 'iso_revision', '')) <> upper(accepted.revision_number) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_revision', 'blocker', 'SRV_TP_REVISION_MISMATCH', 'ISO revision is not the current accepted revision');
    end if;
    if not public.current_user_in_pds_scope(job.project_id, accepted.pds_area_id) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'iso_number', 'blocker', 'SRV_TP_OUT_OF_SCOPE', 'ISO is outside the current user PDS scope');
    end if;
    if not exists (
      select 1 from public.spools spool join public.spool_revisions spool_revision on spool_revision.spool_id = spool.id
      where spool.project_id = job.project_id and spool_revision.isometric_revision_id = accepted.revision_id
        and upper(spool.spool_number) = upper(row_rec.normalized_values ->> 'spool_number')
        and spool_revision.sequence_number::text = coalesce(row_rec.normalized_values ->> 'spool_revision', '')
    ) then
      insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
      values (target_job_id, row_rec.row_number, 'spool_number', 'blocker', 'SRV_TP_UNKNOWN_SPOOL', 'Spool is not part of the accepted ISO revision');
    end if;
  end loop;

  for row_rec in
    select min(row_number) as row_number, normalized_values ->> 'test_pack_number' as test_pack_number
    from public.import_job_rows where job_id = target_job_id and action <> 'skip'
    group by normalized_values ->> 'test_pack_number'
  loop
    select * into pack from public.test_packs where project_id = job.project_id and upper(test_pack_number) = upper(row_rec.test_pack_number);
    if found then
      if not coalesce((select bool_and(upper(normalized_values ->> 'test_pack_revision') = pack.revision_no::text) from public.import_job_rows where job_id = target_job_id and normalized_values ->> 'test_pack_number' = row_rec.test_pack_number), false) then
        insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
        values (target_job_id, row_rec.row_number, 'test_pack_revision', 'conflict', 'SRV_TP_METADATA_CONFLICT', 'Existing Test Pack revision differs from the import');
      end if;
      if exists (
        select 1 from public.import_job_rows imported
        join public.isometrics iso on upper(iso.iso_number) = upper(imported.normalized_values ->> 'iso_number') and iso.project_id = job.project_id
        where imported.job_id = target_job_id and imported.normalized_values ->> 'test_pack_number' = row_rec.test_pack_number
          and not exists (select 1 from public.test_pack_isometrics member where member.test_pack_id = pack.id and member.isometric_id = iso.id and member.removed_at is null)
      ) then
        insert into public.import_job_issues(job_id, row_number, column_name, severity, code, message)
        values (target_job_id, row_rec.row_number, 'iso_number', 'conflict', 'SRV_TP_MANUAL_ADD_REQUIRED', 'Adding an ISO to an existing Test Pack is a manual Builder action');
      end if;
    end if;
  end loop;

  select count(*) filter (where severity = 'blocker')::integer, count(*) filter (where severity = 'conflict')::integer
    into blocker_count, conflict_count from public.import_job_issues where job_id = target_job_id;
  return next;
end;
$$;

create or replace function public.apply_test_pack_import_job(target_job_id uuid, confirm_conflicts boolean default false)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare job public.import_jobs; counts record; row_rec record; pack public.test_packs; iso record; existing_pack public.test_packs; member public.test_pack_isometrics; v_system_id uuid; v_subsystem_id uuid; v_service_class_id uuid; v_line_service_id uuid; ids uuid[] := array[]::uuid[]; written integer := 0;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then raise exception 'Import job was not found' using errcode = 'PQC12'; end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') or not public.current_user_has_capability(job.project_id, 'testpack.manage') then raise exception 'Test Pack import needs both import and Test Pack management permissions' using errcode = 'PQC92'; end if;
  if job.status <> 'validated' then raise exception 'Import job must be validated before it can be applied' using errcode = 'PQC11'; end if;
  select * into counts from public.revalidate_test_pack_import_job(target_job_id);
  if counts.blocker_count > 0 then raise exception 'Test Pack import has blocking issues' using errcode = 'PQC13'; end if;
  if counts.conflict_count > 0 and not coalesce(confirm_conflicts, false) then raise exception 'Test Pack import has unconfirmed conflicts' using errcode = 'PQC96'; end if;

  for row_rec in
    select min(row_number) as row_number, normalized_values ->> 'test_pack_number' as test_pack_number,
      max(normalized_values ->> 'system') as system_code, max(normalized_values ->> 'subsystem') as subsystem_code,
      max(normalized_values ->> 'service_class') as service_class_code, max(normalized_values ->> 'line_service') as line_service_code,
      max(normalized_values ->> 'test_medium') as test_medium, max(normalized_values ->> 'test_pressure')::numeric as test_pressure,
      max(normalized_values ->> 'planned_start_on')::date as planned_start_on, max(normalized_values ->> 'planned_end_on')::date as planned_end_on,
      max(normalized_values ->> 'priority') as priority, max(normalized_values ->> 'volume_m3')::numeric as volume_m3, max(normalized_values ->> 'test_pack_location') as test_pack_location
    from public.import_job_rows where job_id = target_job_id and action <> 'skip'
    group by normalized_values ->> 'test_pack_number'
  loop
    select * into existing_pack from public.test_packs where project_id = job.project_id and upper(test_pack_number) = upper(row_rec.test_pack_number) for update;
    if found then
      pack := existing_pack;
      update public.test_packs set priority = trim(row_rec.priority), test_medium = row_rec.test_medium::public.test_pack_medium, test_pressure = row_rec.test_pressure,
        planned_start_on = row_rec.planned_start_on, planned_end_on = row_rec.planned_end_on, location = trim(row_rec.test_pack_location), volume_m3 = row_rec.volume_m3,
        revision_no = revision_no + 1, updated_by = auth.uid(), updated_at = timezone('utc', now()) where id = pack.id returning * into pack;
    else
      select system.id into v_system_id from public.project_systems system where system.project_id = job.project_id and upper(system.code) = upper(row_rec.system_code) and system.status = 'active';
      if not found then raise exception 'System is missing in the import' using errcode = 'PQC80'; end if;
      select subsystem.id into v_subsystem_id from public.project_subsystems subsystem where subsystem.project_id = job.project_id and subsystem.system_id = v_system_id and upper(subsystem.code) = upper(row_rec.subsystem_code) and subsystem.status = 'active';
      if not found then raise exception 'Subsystem is missing in the import' using errcode = 'PQC81'; end if;
      select service_class.id into v_service_class_id from public.project_service_classes service_class where service_class.project_id = job.project_id and upper(service_class.code) = upper(row_rec.service_class_code) and service_class.status = 'active';
      if not found then raise exception 'Service class is missing in the import' using errcode = 'PQC82'; end if;
      select line_service.id into v_line_service_id from public.project_line_services line_service where line_service.project_id = job.project_id and upper(line_service.code) = upper(row_rec.line_service_code) and line_service.status = 'active';
      if not found then raise exception 'Line service is missing in the import' using errcode = 'PQC83'; end if;
      pack := public.create_test_pack(job.project_id, row_rec.test_pack_number, v_system_id, v_subsystem_id, v_service_class_id, v_line_service_id, row_rec.planned_start_on, row_rec.planned_end_on, row_rec.priority, row_rec.test_medium::public.test_pack_medium, row_rec.test_pressure, row_rec.test_pack_location, row_rec.volume_m3, format('import-%s', target_job_id));
    end if;
    ids := array_append(ids, pack.id);
    written := written + 1;
    for iso in
      select distinct iso_record.id as isometric_id
      from public.import_job_rows imported join public.isometrics iso_record on iso_record.project_id = job.project_id and upper(iso_record.iso_number) = upper(imported.normalized_values ->> 'iso_number')
      where imported.job_id = target_job_id and imported.normalized_values ->> 'test_pack_number' = row_rec.test_pack_number
    loop
      if exists (select 1 from public.test_pack_isometrics where test_pack_id = pack.id and isometric_id = iso.isometric_id and removed_at is null) then continue; end if;
      if existing_pack.id is not null then raise exception 'Adding an ISO to an existing Test Pack requires a manual Builder action' using errcode = 'PQC96'; end if;
      member := public.compose_test_pack(pack.id, iso.isometric_id, 'import', target_job_id, format('import-%s-%s', target_job_id, iso.isometric_id));
    end loop;
  end loop;
  update public.import_jobs set status = 'applied', applied_at = timezone('utc', now()), completed_at = timezone('utc', now()), applied_row_count = written, affected_entity_ids = ids, conflicts_confirmed = coalesce(confirm_conflicts, false) where id = target_job_id returning * into job;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state) values (job.project_id, auth.uid(), 'import_jobs', job.id, 'apply_test_pack_import_job', to_jsonb(job));
  return job;
end;
$$;

revoke all on function public.revalidate_test_pack_import_job(uuid), public.apply_test_pack_import_job(uuid, boolean) from public, anon;
grant execute on function public.revalidate_test_pack_import_job(uuid), public.apply_test_pack_import_job(uuid, boolean) to authenticated;
