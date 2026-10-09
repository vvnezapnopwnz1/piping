-- Migration: welder_import_apply_fix
-- A welder qualification Excel import never applied: save_welder_qualification returns the whole
-- welder_qualifications row, and apply_import_job selected that row into the uuid new_id (22P02).
-- Same function as 20260802092000_apply_import_commands.sql, except the welder branch now reads
-- the id of the saved row. Test: supabase/tests/database/110_welder_import_apply.test.sql.

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
      select saved.id into new_id
      from public.save_welder_qualification(
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
