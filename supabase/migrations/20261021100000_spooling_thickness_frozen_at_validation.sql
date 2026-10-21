-- The thickness a person checked is the thickness that is applied.
--
-- 20261020101000 filled an empty weld thickness inside spooling_staging, which every check, the preview and
-- the apply read (about twenty times per apply). So the value was decided at each read: change the project's
-- thickness rule between the check and the apply, and the apply stored a different thickness than the
-- preview showed; and a second import of a file with no thickness compared the rule's value with what the
-- project already held and showed a change of thickness that no one made.
--
-- Now the fill happens once, when the rows are stored (record_spooling_validation), and the row keeps the
-- value. spooling_staging goes back to a plain read of the stored rows (its body in 20260803092000). The
-- consequence is deliberate: a rule that appears AFTER the check does not reach that job; the job has to be
-- checked again to pick it up. Nothing the person has not seen is ever applied, and revalidate_spooling_import_job
-- keeps such a weld blocked (SRV_THICKNESS_MISSING, with a sentence that says to check again) instead of letting the
-- apply store an empty thickness.
--
-- Same signatures, same grants. Tests: 135_spooling_thickness_from_rule.test.sql,
-- 138_spooling_thickness_frozen_at_validation.test.sql.

create or replace function public.spooling_staging(target_job_id uuid)
returns table (
  staging_row_number integer,
  entity_kind text,
  entity_values jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select r.row_number,
         r.normalized_values ->> 'entity_type',
         r.normalized_values
  from public.import_job_rows r
  where r.job_id = target_job_id
    and r.action <> 'skip'
  order by r.row_number;
$$;

revoke all on function public.spooling_staging(uuid) from public, anon;
grant execute on function public.spooling_staging(uuid) to authenticated;

-- The body is 20261020103000's, with the thickness fill added after the rows are stored.
create or replace function public.record_spooling_validation(
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
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job is not a SpoolGen import' using errcode = 'PQC24';
  end if;
  -- The same rule as apply_spooling_import_job_core below.
  if not exists (
    select 1 from public.import_files
    where job_id = target_job_id and file_role in ('weld', 'pcf')
  ) then
    raise exception 'A weld file or a PCF file is required before validation' using errcode = 'PQC25';
  end if;
  if job.status not in ('uploaded', 'validating', 'validated') then
    raise exception 'This import cannot be validated in its current state' using errcode = 'PQC24';
  end if;

  delete from public.import_job_rows where job_id = target_job_id;
  delete from public.import_job_issues where job_id = target_job_id;
  -- Re-validating invalidates every decision: the diff the user judged is gone.
  delete from public.import_revision_decisions where job_id = target_job_id;

  insert into public.import_job_rows (job_id, row_number, raw_values, normalized_values, action)
  select
    target_job_id,
    (entry ->> 'row_number')::integer,
    coalesce(entry -> 'raw_values', '{}'::jsonb),
    coalesce(entry -> 'normalized_values', '{}'::jsonb),
    coalesce(entry ->> 'action', 'create')
  from jsonb_array_elements(coalesce(parsed_rows, '[]'::jsonb)) as entry;

  -- A weld with no thickness takes the thickness of the project's active rule for its service class and diameter,
  -- once, here, and the row keeps it. Every later check, the preview and the apply read the stored value, so what
  -- the person saw is what is applied. A thickness the file gives is kept; a weld with no rule stays empty and is
  -- blocked by SRV_THICKNESS_MISSING. The welds are grouped by class and diameter text (a few dozen keys per job) so
  -- engineering_numeric and the rule lookup run once per key, not once per row.
  with weld_key as (
    select r.normalized_values ->> 'service_class' as service_class,
           r.normalized_values ->> 'diameter_inch' as diameter_text,
           public.engineering_numeric(r.normalized_values ->> 'diameter_inch') as diameter_inch
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and r.normalized_values ->> 'entity_type' = 'weld_joint'
      and nullif(btrim(r.normalized_values ->> 'thickness_mm'), '') is null
    group by 1, 2
  ),
  fill as (
    select k.service_class, k.diameter_text, t.thickness_mm::text as thickness
    from weld_key k
    join public.project_service_classes c on c.project_id = job.project_id and c.code = k.service_class
    join public.project_thickness_flange_rules t
      on t.project_id = job.project_id
     and t.service_class_id = c.id
     and t.diameter_inch = k.diameter_inch
     and t.status = 'active'
  )
  update public.import_job_rows r
  set normalized_values = r.normalized_values || jsonb_build_object('thickness_mm', f.thickness)
  from fill f
  where r.job_id = target_job_id
    and r.action <> 'skip'
    and r.normalized_values ->> 'entity_type' = 'weld_joint'
    and nullif(btrim(r.normalized_values ->> 'thickness_mm'), '') is null
    and f.service_class = r.normalized_values ->> 'service_class'
    and f.diameter_text = r.normalized_values ->> 'diameter_inch';

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message, file_name)
  select
    target_job_id,
    nullif(entry ->> 'row_number', '')::integer,
    nullif(entry ->> 'column_name', ''),
    (entry ->> 'severity')::public.import_issue_severity,
    entry ->> 'code',
    entry ->> 'message',
    nullif(entry ->> 'file_name', '')
  from jsonb_array_elements(coalesce(parsed_issues, '[]'::jsonb)) as entry;

  update public.import_jobs
  set status = 'validated',
      validated_at = timezone('utc', now()),
      conflicts_confirmed = false
  where id = target_job_id
  returning * into job;

  -- Server-side issues are derived immediately so the preview the user sees is the
  -- same set apply will enforce.
  perform public.revalidate_spooling_import_job(target_job_id);

  return job;
end;
$$;

-- The body is 20261018130000's, with one more blocker: a weld the check left without a thickness although a rule
-- covers it now. The other functions that revalidate go through here.
create or replace function public.revalidate_spooling_import_job(target_job_id uuid)
returns table (blocker_count integer, warning_count integer, unresolved_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  joint_limit integer := public.spooling_job_joint_limit();
  joint_count integer;
begin
  perform public.revalidate_spooling_import_job_base(target_job_id);

  insert into public.import_job_issues (
    job_id, row_number, column_name, severity, code, message
  )
  select
    target_job_id,
    null,
    null,
    'blocker',
    'SRV_SPOOLING_SPINE_MISSING',
    'The SpoolGen submission must contain at least one isometric, spool and weld joint.'
  where not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'isometric'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'spool'
        )
     or not exists (
          select 1 from public.spooling_staging(target_job_id)
          where entity_kind = 'weld_joint'
        );

  -- A weld whose stored thickness is empty while a rule now covers its class and diameter: the rule was added after
  -- the check, which filled nothing for it. The base raises SRV_THICKNESS_MISSING only for a weld no rule covers, so
  -- without this the apply would store an empty thickness. Same code, so the same screens show it; the sentence says
  -- what to do. A weld no rule covers is the base's, and is not raised twice.
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'thickness_mm', 'blocker', 'SRV_THICKNESS_MISSING',
         format('The thickness rule for service class "%s" at %s inch was added after these files were checked. Check the files again to use it.',
                s.entity_values ->> 'service_class', s.entity_values ->> 'diameter_inch')
  from public.spooling_staging(target_job_id) s
  join public.import_jobs j on j.id = target_job_id
  where s.entity_kind = 'weld_joint'
    and nullif(btrim(s.entity_values ->> 'thickness_mm'), '') is null
    and exists (
      select 1
      from public.project_thickness_flange_rules r
      join public.project_service_classes c on c.id = r.service_class_id
      where r.project_id = j.project_id
        and c.code = s.entity_values ->> 'service_class'
        and r.diameter_inch = public.engineering_numeric(s.entity_values ->> 'diameter_inch')
        and r.status = 'active'
    );

  if joint_limit is not null then
    select count(*)::integer into joint_count
    from public.spooling_staging(target_job_id)
    where entity_kind = 'weld_joint';

    if joint_count > joint_limit then
      insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
      values (
        target_job_id, null, null, 'blocker', 'SRV_SPOOLING_JOB_TOO_LARGE',
        format('This file set has %s weld joints; one job applies at most %s. Split the SpoolGen export by area and import the parts one after another.',
               joint_count, joint_limit)
      );
    end if;
  end if;

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'warning'),
    (select count(*)::integer from public.preview_spooling_import(target_job_id) item
     where item.requires_decision and item.decision is null);
end;
$$;

-- Same grants as the function had (20260803092000).
revoke all on function public.record_spooling_validation(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.record_spooling_validation(uuid, jsonb, jsonb) to authenticated;
