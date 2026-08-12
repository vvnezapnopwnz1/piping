-- Track 03: flange progress workbook import. This remains separate from generic
-- referential imports so one bad progress row rolls back the whole job.

alter table public.import_jobs
  drop constraint if exists import_jobs_import_type_check;
alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list', 'welding_procedure', 'welder_qualification',
    'thickness_flange', 'nde_matrix', 'spooling_definition', 'flange_progress'
  ));

create or replace function public.apply_flange_progress_import_job(
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
  row_rec record;
  iso_id uuid;
  revision_id uuid;
  flange_revision_id uuid;
  category_id uuid;
  requirement_id uuid;
  effective_id uuid;
  jointer_ids uuid[];
  new_record public.flange_progress_records;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  raw_date text;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then raise exception 'Import job was not found' using errcode = 'PQC12'; end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage')
     or not public.current_user_has_capability(job.project_id, 'flange.manage') then
    raise exception 'Import and flange management capabilities are required' using errcode = 'PQC70';
  end if;
  if job.import_type <> 'flange_progress' then
    raise exception 'This job is not a flange progress import' using errcode = 'PQC77';
  end if;
  if job.applied_at is not null or job.status = 'applied' then return job; end if;
  if job.status <> 'validated' then raise exception 'Import job must be validated before it can be applied' using errcode = 'PQC11'; end if;
  if exists (select 1 from public.import_job_issues where job_id = target_job_id and severity = 'blocker') then
    raise exception 'Import cannot be applied while blocking issues remain' using errcode = 'PQC13';
  end if;

  for row_rec in select * from public.import_job_rows where job_id = target_job_id and action <> 'skip' order by row_number loop
    select id into iso_id from public.isometrics where project_id = job.project_id and iso_number = row_rec.normalized_values ->> 'iso_number';
    select ir.id into revision_id from public.isometric_revisions ir where ir.isometric_id = iso_id and ir.revision_number = row_rec.normalized_values ->> 'revision' and ir.status = 'accepted';
    select fjr.id into flange_revision_id
    from public.flange_joint_revisions fjr
    join public.flange_joints fj on fj.id = fjr.flange_joint_id
    join public.spool_revisions sr on sr.id = fjr.spool_revision_id
    where sr.isometric_revision_id = revision_id and fj.flange_number = row_rec.normalized_values ->> 'bt_number' and not fjr.is_removed;
    select id into category_id from public.project_joint_categories
    where project_id = job.project_id and category_code = row_rec.normalized_values ->> 'joint_category'
      and reason = row_rec.normalized_values ->> 'reason' and status = 'active';
    select id into requirement_id from public.system_reference_entries
    where kind = 'torquing_requirement' and code = row_rec.normalized_values ->> 'jointing_method' and status = 'active';
    if iso_id is null or revision_id is null or flange_revision_id is null or category_id is null or requirement_id is null then
      raise exception 'Flange import row % could not resolve its ISO, revision, BT, category or method' , row_rec.row_number using errcode = 'PQC73';
    end if;
    raw_date := row_rec.normalized_values ->> 'joint_date';
    if raw_date !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Flange import row % has an invalid date', row_rec.row_number using errcode = 'PQC74'; end if;
    select p.id into effective_id from public.flange_progress_records p where p.flange_joint_revision_id = flange_revision_id and p.superseded_at is null for update;
    if effective_id is not null and not coalesce(confirm_conflicts, false) then
      raise exception 'Flange import row % conflicts with existing progress', row_rec.row_number using errcode = 'PQC77';
    end if;
    select array_agg(team.id order by team.id) into jointer_ids
    from jsonb_array_elements_text(coalesce(row_rec.normalized_values -> 'jointer_codes', '[]'::jsonb)) codes(value)
    join public.project_teams team on team.project_id = job.project_id and team.team_type = 'jointer' and team.status = 'active' and upper(team.code) = upper(codes.value);
    if coalesce(array_length(jointer_ids, 1), 0) <> coalesce(jsonb_array_length(row_rec.normalized_values -> 'jointer_codes'), 0) then
      raise exception 'Flange import row % has an unknown jointer', row_rec.row_number using errcode = 'PQC75';
    end if;
    new_record := public.record_flange_progress_invariant(
      job.project_id, flange_revision_id, category_id, requirement_id,
      (row_rec.normalized_values ->> 'jointing_value')::numeric, raw_date::date,
      row_rec.normalized_values ->> 'report_number', row_rec.normalized_values ->> 'tag_number',
      jointer_ids, 'import', target_job_id, null, effective_id, auth.uid()
    );
    affected := affected || new_record.id;
    written := written + 1;
  end loop;

  update public.import_jobs set status = 'applied', applied_at = timezone('utc', now()), completed_at = timezone('utc', now()), applied_row_count = written, affected_entity_ids = affected, conflicts_confirmed = coalesce(confirm_conflicts, false) where id = target_job_id returning * into job;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state)
  values (job.project_id, auth.uid(), 'import_jobs', job.id, 'apply_flange_progress_import_job', to_jsonb(job));
  return job;
end;
$$;

revoke all on function public.apply_flange_progress_import_job(uuid, boolean) from public, anon;
grant execute on function public.apply_flange_progress_import_job(uuid, boolean) to authenticated;
