-- Track 03: import command surface. Every mutation of import_jobs, import_job_rows
-- and import_job_issues happens here, under an explicit capability check.

create or replace function public.create_import_job(
  target_project_id uuid,
  requested_import_type text,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if not public.current_user_has_capability(target_project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if coalesce(trim(file_name), '') = '' then
    raise exception 'Source file name is required' using errcode = '23514';
  end if;

  if coalesce(size_bytes, 0) <= 0 then
    raise exception 'Source file size must be positive' using errcode = '23514';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by,
    source_file_name, source_media_type, source_size_bytes, source_checksum
  )
  values (
    target_project_id, requested_import_type, requested_import_type, 'draft', auth.uid(),
    trim(file_name), media_type, size_bytes, checksum
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_import_job', null, to_jsonb(created_job)
  );

  return created_job;
end;
$$;

create or replace function public.mark_import_job_uploaded(
  target_job_id uuid,
  object_path text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status <> 'draft' then
    raise exception 'Import job is not awaiting upload' using errcode = 'PQC11';
  end if;

  update public.import_jobs
  set status = 'uploaded', storage_path = object_path
  where id = target_job_id
  returning * into job;

  return job;
end;
$$;

-- Replaces rows and issues atomically. Client-submitted issues are advisory only:
-- apply_import_job re-derives every referential check server-side.
create or replace function public.record_import_validation(
  target_job_id uuid,
  parsed_rows jsonb,
  parsed_issues jsonb
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status not in ('uploaded', 'validating', 'validated') then
    raise exception 'Import job cannot be validated in its current state' using errcode = 'PQC11';
  end if;

  delete from public.import_job_rows where job_id = target_job_id;
  delete from public.import_job_issues where job_id = target_job_id;

  insert into public.import_job_rows (job_id, row_number, raw_values, normalized_values, action)
  select
    target_job_id,
    (entry ->> 'row_number')::integer,
    coalesce(entry -> 'raw_values', '{}'::jsonb),
    coalesce(entry -> 'normalized_values', '{}'::jsonb),
    coalesce(entry ->> 'action', 'create')
  from jsonb_array_elements(coalesce(parsed_rows, '[]'::jsonb)) as entry;

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select
    target_job_id,
    nullif(entry ->> 'row_number', '')::integer,
    nullif(entry ->> 'column_name', ''),
    (entry ->> 'severity')::public.import_issue_severity,
    entry ->> 'code',
    entry ->> 'message'
  from jsonb_array_elements(coalesce(parsed_issues, '[]'::jsonb)) as entry;

  update public.import_jobs
  set status = 'validated',
      validated_at = timezone('utc', now()),
      conflicts_confirmed = false
  where id = target_job_id
  returning * into job;

  return job;
end;
$$;

create or replace function public.cancel_import_job(target_job_id uuid)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status in ('applied', 'failed', 'canceled') then
    raise exception 'Import job is already in a terminal state' using errcode = 'PQC11';
  end if;

  update public.import_jobs
  set status = 'canceled', canceled_at = timezone('utc', now())
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'cancel_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function
  public.create_import_job(uuid, text, text, text, bigint, text),
  public.mark_import_job_uploaded(uuid, text),
  public.record_import_validation(uuid, jsonb, jsonb),
  public.cancel_import_job(uuid)
from public, anon;

grant execute on function
  public.create_import_job(uuid, text, text, text, bigint, text),
  public.mark_import_job_uploaded(uuid, text),
  public.record_import_validation(uuid, jsonb, jsonb),
  public.cancel_import_job(uuid)
to authenticated;

-- Server-side re-validation. Returns the number of blocker and conflict issues it
-- persisted. The client's own issue list is never trusted for the apply decision.
create or replace function public.revalidate_import_job(target_job_id uuid)
returns table (blocker_count integer, conflict_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;

  -- Drop only server-derived issues; keep the client's warnings for display.
  delete from public.import_job_issues
  where job_id = target_job_id and code like 'SRV_%';

  if job.import_type = 'piping_material_list' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'ident_code', 'blocker', 'SRV_REQUIRED',
      'Ident code, MRR number and trace number are all mandatory'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and (
        coalesce(trim(r.normalized_values ->> 'ident_code'), '') = ''
        or coalesce(trim(r.normalized_values ->> 'mrr_number'), '') = ''
        or coalesce(trim(r.normalized_values ->> 'trace_number'), '') = ''
      );

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'trace_number', 'conflict', 'SRV_OVERWRITE',
      'This ident code and trace number already exist and will be overwritten'
    from public.import_job_rows r
    join public.piping_material_records existing
      on existing.project_id = job.project_id
     and existing.ident_code = r.normalized_values ->> 'ident_code'
     and existing.trace_number = r.normalized_values ->> 'trace_number'
    where r.job_id = target_job_id and r.action <> 'skip';
  end if;

  if job.import_type = 'thickness_flange' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'service_class', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Service class does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_service_classes sc
        where sc.project_id = job.project_id
          and sc.code = r.normalized_values ->> 'service_class'
          and sc.status = 'active'
      );
  end if;

  if job.import_type = 'nde_matrix' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'service_class', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Service class does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_service_classes sc
        where sc.project_id = job.project_id
          and sc.code = r.normalized_values ->> 'service_class'
          and sc.status = 'active'
      );

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'weld_type', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Weld type does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_weld_types wt
        where wt.project_id = job.project_id
          and wt.code = r.normalized_values ->> 'weld_type'
          and wt.status = 'active'
      );
  end if;

  if job.import_type = 'welding_procedure' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'subcontractor', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Subcontractor does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_subcontractors sub
        where sub.project_id = job.project_id
          and sub.code = r.normalized_values ->> 'subcontractor'
          and sub.status = 'active'
      );
  end if;

  if job.import_type = 'welder_qualification' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'wps_codes', 'blocker', 'SRV_REQUIRED',
      'A welder qualification requires at least one existing WPS'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and coalesce(jsonb_array_length(r.normalized_values -> 'wps_codes'), 0) = 0;
  end if;

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'conflict');
end;
$$;

create or replace function public.apply_import_job(
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
  blockers integer;
  conflicts integer;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  row_rec record;
  new_id uuid;
begin
  -- The row lock plus the status guard is what makes double-apply impossible even
  -- under concurrent calls.
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;

  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if job.applied_at is not null or job.status = 'applied' then
    raise exception 'Import job has already been applied' using errcode = 'PQC10';
  end if;

  if job.status <> 'validated' then
    raise exception 'Import job must be validated before it can be applied' using errcode = 'PQC11';
  end if;

  select r.blocker_count, r.conflict_count into blockers, conflicts
  from public.revalidate_import_job(target_job_id) r;

  if blockers > 0 then
    raise exception 'Import cannot be applied while blocking issues remain' using errcode = 'PQC13';
  end if;

  if conflicts > 0 and not coalesce(confirm_conflicts, false) then
    raise exception 'Import has unconfirmed overwrite conflicts' using errcode = 'PQC14';
  end if;

  for row_rec in
    select * from public.import_job_rows
    where job_id = target_job_id and action <> 'skip'
    order by row_number
  loop
    if job.import_type = 'piping_material_list' then
      insert into public.piping_material_records (project_id, mrr_number, ident_code, trace_number)
      values (
        job.project_id,
        row_rec.normalized_values ->> 'mrr_number',
        row_rec.normalized_values ->> 'ident_code',
        row_rec.normalized_values ->> 'trace_number'
      )
      on conflict (project_id, ident_code, trace_number) do update
        set mrr_number = excluded.mrr_number,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'thickness_flange' then
      insert into public.project_thickness_flange_rules (
        project_id, service_class_id, diameter_inch, thickness_mm, flange_rating
      )
      values (
        job.project_id,
        (select id from public.project_service_classes
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'service_class'),
        (row_rec.normalized_values ->> 'diameter_inch')::numeric,
        (row_rec.normalized_values ->> 'thickness_mm')::numeric,
        row_rec.normalized_values ->> 'flange_rating'
      )
      on conflict (project_id, service_class_id, diameter_inch) do update
        set thickness_mm = excluded.thickness_mm,
            flange_rating = excluded.flange_rating,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'nde_matrix' then
      insert into public.nde_matrix_rules (
        project_id, service_class_id, weld_type_id, weld_location,
        rt_coverage, ut_coverage, mt_coverage, pt_coverage, pmi_coverage, ht_coverage
      )
      values (
        job.project_id,
        (select id from public.project_service_classes
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'service_class'),
        (select id from public.project_weld_types
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'weld_type'),
        row_rec.normalized_values ->> 'weld_location',
        coalesce((row_rec.normalized_values ->> 'rt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'ut_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'mt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'pt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'pmi_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'ht_coverage')::numeric, 0)
      )
      on conflict (project_id, service_class_id, weld_type_id, weld_location) do update
        set rt_coverage = excluded.rt_coverage,
            ut_coverage = excluded.ut_coverage,
            mt_coverage = excluded.mt_coverage,
            pt_coverage = excluded.pt_coverage,
            pmi_coverage = excluded.pmi_coverage,
            ht_coverage = excluded.ht_coverage,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'welding_procedure' then
      insert into public.project_welding_procedures (
        project_id, subcontractor_id, material_type_id, code, description, process,
        diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
      )
      values (
        job.project_id,
        (select id from public.project_subcontractors
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'subcontractor'),
        coalesce(
          (select id from public.system_reference_entries
           where kind = 'material_type' and (code = row_rec.normalized_values ->> 'material_type' or description = row_rec.normalized_values ->> 'material_type') limit 1),
          '00000000-0000-0000-0000-000000000001'::uuid
        ),
        coalesce(row_rec.normalized_values ->> 'wps_code', row_rec.normalized_values ->> 'code'),
        coalesce(row_rec.normalized_values ->> 'description', row_rec.normalized_values ->> 'wps_code', row_rec.normalized_values ->> 'code'),
        coalesce(row_rec.normalized_values ->> 'process', 'SMAW'),
        coalesce((row_rec.normalized_values ->> 'diameter_from_inch')::numeric, (row_rec.normalized_values ->> 'diameter_from')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'diameter_to_inch')::numeric, (row_rec.normalized_values ->> 'diameter_to')::numeric, 999),
        coalesce((row_rec.normalized_values ->> 'thickness_from_mm')::numeric, (row_rec.normalized_values ->> 'thickness_from')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'thickness_to_mm')::numeric, (row_rec.normalized_values ->> 'thickness_to')::numeric, 999),
        coalesce(row_rec.normalized_values ->> 'revision', '0'),
        coalesce((row_rec.normalized_values ->> 'approved_on')::date, current_date)
      )
      on conflict (project_id, code) do update
        set subcontractor_id = excluded.subcontractor_id,
            material_type_id = excluded.material_type_id,
            diameter_from = excluded.diameter_from,
            diameter_to = excluded.diameter_to,
            thickness_from = excluded.thickness_from,
            thickness_to = excluded.thickness_to,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'welder_qualification' then
      select public.save_welder_qualification(
        job.project_id,
        null,
        jsonb_build_object(
          'welder_code', row_rec.normalized_values ->> 'welder_code',
          'full_name', coalesce(row_rec.normalized_values ->> 'welder_name', row_rec.normalized_values ->> 'full_name', row_rec.normalized_values ->> 'welder_code'),
          'subcontractor_id', (
            select sub.id from public.project_subcontractors sub
            where sub.project_id = job.project_id
              and sub.code = row_rec.normalized_values ->> 'subcontractor'
          ),
          'expires_on', coalesce(row_rec.normalized_values ->> 'expires_on', (now() + interval '1 year')::date::text)
        ),
        array(
          select wp.id from public.project_welding_procedures wp
          where wp.project_id = job.project_id
            and wp.code in (
              select jsonb_array_elements_text(row_rec.normalized_values -> 'wps_codes')
            )
        )
      ) into new_id;

    else
      raise exception 'Unsupported import type %', job.import_type using errcode = '23514';
    end if;

    affected := affected || new_id;
    written := written + 1;
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

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'apply_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function
  public.revalidate_import_job(uuid),
  public.apply_import_job(uuid, boolean)
from public, anon;

grant execute on function
  public.revalidate_import_job(uuid),
  public.apply_import_job(uuid, boolean)
to authenticated;

create unique index if not exists project_welding_procedures_project_code_key
  on public.project_welding_procedures (project_id, code);


