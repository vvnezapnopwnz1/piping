-- Phase 4a, F2: the approval date of a WPS and the expiry of a welder qualification come from the file.
--
-- Until now an Excel row without them was stored with the server's clock: a WPS approved on
-- current_date (so it was not yet valid for work recorded before the import) and a welder qualified
-- for one year from the import. Both dates are what a QC engineer signs against, so inventing them is
-- the server answering a question nobody asked it. The template gets two required columns (Approved
-- On, Expires On; ISO YYYY-MM-DD, see modules/imports/domain/import-types.json) and the server
-- refuses a row without a valid date: SRV_REQUIRED when empty, SRV_INVALID_DATE when malformed, with
-- the row and column named. apply_import_job reads the dates as given. A welder whose expiry is already
-- in the past is stored as it is and shown as expired; weld recording refuses them, as before.
--
-- Importing a WPS or a welder that exists with another date is an overwrite conflict (SRV_OVERWRITE, the
-- user confirms), and the confirmed date replaces the old one, so a mistyped date can be corrected. The
-- same file again changes nothing: a welder that exists is updated in place instead of failing on the
-- unique (project_id, welder_code).
--
-- One payload format: the UPG fixtures, the template and the parser change in the same commit and the
-- "backdate-wps" phase of demo:project-setup is gone. Test: 128_reference_import_dates.test.sql.

create or replace function public.is_iso_date(value text)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if value is null or value !~ '^\d{4}-\d{2}-\d{2}$' then
    return false;
  end if;
  return to_char(value::date, 'YYYY-MM-DD') = value;
exception when others then
  return false;
end;
$$;

revoke all on function public.is_iso_date(text) from public, anon;
-- Used by the security definer import commands only; not part of the REST surface.
revoke all on function public.is_iso_date(text) from authenticated;

CREATE OR REPLACE FUNCTION public.revalidate_import_job(target_job_id uuid)
 RETURNS TABLE(blocker_count integer, conflict_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'approved_on', 'blocker',
      case when coalesce(trim(r.normalized_values ->> 'approved_on'), '') = '' then 'SRV_REQUIRED' else 'SRV_INVALID_DATE' end,
      case when coalesce(trim(r.normalized_values ->> 'approved_on'), '') = ''
           then 'The approval date of a WPS comes from the file; it is empty in this row'
           else 'The approval date must be a valid YYYY-MM-DD date' end
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not public.is_iso_date(r.normalized_values ->> 'approved_on');

    -- A WPS that exists with another approval date is an overwrite the user confirms; the same date is a no-op.
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'approved_on', 'conflict', 'SRV_OVERWRITE',
      'This WPS already exists with another approval date and will be overwritten'
    from public.import_job_rows r
    join public.project_welding_procedures existing
      on existing.project_id = job.project_id
     and existing.code = coalesce(r.normalized_values ->> 'wps_code', r.normalized_values ->> 'code')
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and public.is_iso_date(r.normalized_values ->> 'approved_on')
      and existing.approved_on is distinct from (r.normalized_values ->> 'approved_on')::date;
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

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'expires_on', 'blocker',
      case when coalesce(trim(r.normalized_values ->> 'expires_on'), '') = '' then 'SRV_REQUIRED' else 'SRV_INVALID_DATE' end,
      case when coalesce(trim(r.normalized_values ->> 'expires_on'), '') = ''
           then 'The qualification expiry of a welder comes from the file; it is empty in this row'
           else 'The qualification expiry must be a valid YYYY-MM-DD date' end
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not public.is_iso_date(r.normalized_values ->> 'expires_on');

    -- A welder that exists with another expiry is an overwrite the user confirms; the same expiry is a no-op.
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'expires_on', 'conflict', 'SRV_OVERWRITE',
      'This welder already exists with another qualification expiry and will be overwritten'
    from public.import_job_rows r
    join public.welder_qualifications existing
      on existing.project_id = job.project_id
     and existing.welder_code = upper(trim(r.normalized_values ->> 'welder_code'))
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and public.is_iso_date(r.normalized_values ->> 'expires_on')
      and existing.expires_on is distinct from (r.normalized_values ->> 'expires_on')::date;
  end if;

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'conflict');
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_import_job(target_job_id uuid, confirm_conflicts boolean DEFAULT false)
 RETURNS import_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  job public.import_jobs;
  blockers integer;
  conflicts integer;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  row_rec record;
  new_id uuid;
  existing_welder_id uuid;
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
        (row_rec.normalized_values ->> 'approved_on')::date
      )
      on conflict (project_id, code) do update
        set subcontractor_id = excluded.subcontractor_id,
            material_type_id = excluded.material_type_id,
            diameter_from = excluded.diameter_from,
            diameter_to = excluded.diameter_to,
            thickness_from = excluded.thickness_from,
            thickness_to = excluded.thickness_to,
            approved_on = excluded.approved_on,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'welder_qualification' then
      -- A welder that exists is updated in place: the same file again is a no-op, not a unique violation.
      select w.id into existing_welder_id
      from public.welder_qualifications w
      where w.project_id = job.project_id
        and w.welder_code = upper(trim(row_rec.normalized_values ->> 'welder_code'));

      select saved.id into new_id
      from public.save_welder_qualification(
        job.project_id,
        existing_welder_id,
        jsonb_build_object(
          'welder_code', row_rec.normalized_values ->> 'welder_code',
          'full_name', coalesce(row_rec.normalized_values ->> 'welder_name', row_rec.normalized_values ->> 'full_name', row_rec.normalized_values ->> 'welder_code'),
          'subcontractor_id', (
            select sub.id from public.project_subcontractors sub
            where sub.project_id = job.project_id
              and sub.code = row_rec.normalized_values ->> 'subcontractor'
          ),
          'expires_on', row_rec.normalized_values ->> 'expires_on'
        ),
        array(
          select wp.id from public.project_welding_procedures wp
          where wp.project_id = job.project_id
            and wp.code in (
              select jsonb_array_elements_text(row_rec.normalized_values -> 'wps_codes')
            )
        )
      ) as saved;

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
$function$;
