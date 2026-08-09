-- Fix PL/pgSQL variable/column ambiguity in the Track 10 import apply command.
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
    select * into existing_pack from public.test_packs where project_id = job.project_id and upper(test_packs.test_pack_number) = upper(row_rec.test_pack_number) for update;
    if found then
      pack := existing_pack;
      update public.test_packs set priority = trim(row_rec.priority), test_medium = row_rec.test_medium::public.test_pack_medium, test_pressure = row_rec.test_pressure,
        planned_start_on = row_rec.planned_start_on, planned_end_on = row_rec.planned_end_on, location = trim(row_rec.test_pack_location), volume_m3 = row_rec.volume_m3,
        revision_no = test_packs.revision_no + 1, updated_by = auth.uid(), updated_at = timezone('utc', now()) where test_packs.id = pack.id returning test_packs.* into pack;
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
  update public.import_jobs set status = 'applied', applied_at = timezone('utc', now()), completed_at = timezone('utc', now()), applied_row_count = written, affected_entity_ids = ids, conflicts_confirmed = coalesce(confirm_conflicts, false) where import_jobs.id = target_job_id returning import_jobs.* into job;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state) values (job.project_id, auth.uid(), 'import_jobs', job.id, 'apply_test_pack_import_job', to_jsonb(job));
  return job;
end;
$$;
