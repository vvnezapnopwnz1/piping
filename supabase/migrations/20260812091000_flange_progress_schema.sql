-- Track 09: append-only flange progress and scoped read models.

create type public.flange_progress_source as enum ('manual', 'import', 'revision_copy');

create table public.flange_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  flange_joint_revision_id uuid not null references public.flange_joint_revisions(id) on delete restrict,
  joint_category_id uuid not null references public.project_joint_categories(id) on delete restrict,
  torquing_requirement_id uuid not null references public.system_reference_entries(id) on delete restrict,
  jointing_method_snapshot text not null check (length(trim(jointing_method_snapshot)) > 0),
  jointing_value numeric(14, 4) not null check (jointing_value > 0),
  joint_date date not null check (joint_date <= current_date),
  report_number text not null check (length(trim(report_number)) > 0),
  tag_number text not null check (length(trim(tag_number)) > 0),
  source_kind public.flange_progress_source not null default 'manual',
  source_import_job_id uuid references public.import_jobs(id) on delete set null,
  source_revision_progress_copy_id uuid references public.revision_progress_copies(id) on delete set null,
  supersedes_record_id uuid references public.flange_progress_records(id) on delete restrict,
  superseded_at timestamptz,
  ut_project_quantity numeric(14, 6),
  ut_coefficient_diameter numeric(14, 6),
  ut_coefficient_rating numeric(14, 6),
  ut_coefficient_punch numeric(14, 6),
  ut_formula_version text not null default 'flange-ut-v1',
  calculated_ut numeric(18, 6),
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default timezone('utc', now()),
  check (source_kind <> 'revision_copy' or source_revision_progress_copy_id is not null),
  check (calculated_ut is null or calculated_ut >= 0),
  check (
    (ut_project_quantity is null and ut_coefficient_diameter is null and ut_coefficient_rating is null and ut_coefficient_punch is null and calculated_ut is null)
    or (ut_project_quantity is not null and ut_coefficient_diameter is not null and ut_coefficient_rating is not null and ut_coefficient_punch is not null)
  )
);

create unique index flange_progress_records_one_effective_idx
  on public.flange_progress_records(flange_joint_revision_id)
  where superseded_at is null;

create index flange_progress_records_project_revision_idx
  on public.flange_progress_records(project_id, flange_joint_revision_id, recorded_at desc);

create table public.flange_jointer_assignments (
  id uuid primary key default gen_random_uuid(),
  progress_record_id uuid not null references public.flange_progress_records(id) on delete restrict,
  jointer_team_id uuid not null references public.project_teams(id) on delete restrict,
  jointer_code_snapshot text not null check (length(trim(jointer_code_snapshot)) > 0),
  jointer_name_snapshot text not null check (length(trim(jointer_name_snapshot)) > 0),
  assigned_at timestamptz not null default timezone('utc', now())
);

create unique index flange_jointer_assignments_unique_jointer_idx
  on public.flange_jointer_assignments(progress_record_id, jointer_team_id);

create or replace function public.assert_flange_progress_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare revision_project_id uuid;
begin
  select iso.project_id into revision_project_id
  from public.flange_joint_revisions fjr
  join public.spool_revisions sr on sr.id = fjr.spool_revision_id
  join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = ir.isometric_id
  where fjr.id = new.flange_joint_revision_id;
  if revision_project_id is distinct from new.project_id then
    raise exception 'Flange progress and revision must belong to the same project' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace function public.assert_flange_jointer_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare progress_project_id uuid; jointer_project_id uuid;
begin
  select project_id into progress_project_id from public.flange_progress_records where id = new.progress_record_id;
  select project_id into jointer_project_id from public.project_teams where id = new.jointer_team_id;
  if progress_project_id is distinct from jointer_project_id then
    raise exception 'Flange jointer must belong to the same project' using errcode = '23503';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_flange_progress_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.superseded_at is null
     and new.superseded_at is not null
     and new.project_id = old.project_id
     and new.flange_joint_revision_id = old.flange_joint_revision_id
     and new.joint_category_id = old.joint_category_id
     and new.torquing_requirement_id = old.torquing_requirement_id
     and new.jointing_method_snapshot = old.jointing_method_snapshot
     and new.jointing_value = old.jointing_value
     and new.joint_date = old.joint_date
     and new.report_number = old.report_number
     and new.tag_number = old.tag_number
     and new.source_kind = old.source_kind
     and new.source_import_job_id is not distinct from old.source_import_job_id
     and new.source_revision_progress_copy_id is not distinct from old.source_revision_progress_copy_id
     and new.supersedes_record_id is not distinct from old.supersedes_record_id
     and new.ut_project_quantity is not distinct from old.ut_project_quantity
     and new.ut_coefficient_diameter is not distinct from old.ut_coefficient_diameter
     and new.ut_coefficient_rating is not distinct from old.ut_coefficient_rating
     and new.ut_coefficient_punch is not distinct from old.ut_coefficient_punch
     and new.ut_formula_version = old.ut_formula_version
     and new.calculated_ut is not distinct from old.calculated_ut
     and new.recorded_by is not distinct from old.recorded_by
     and new.recorded_at = old.recorded_at
     and current_setting('pipeqc.flange_progress_command', true) = 'on'
  then
    return new;
  end if;
  raise exception 'Flange progress business history is append-only' using errcode = 'PQC79';
end;
$$;

create or replace function public.enforce_flange_jointer_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'Flange jointer history is append-only' using errcode = 'PQC79';
  end if;
  return new;
end;
$$;

create trigger flange_progress_records_project_guard
  before insert on public.flange_progress_records
  for each row execute function public.assert_flange_progress_project();
create trigger flange_progress_records_append_only
  before update or delete on public.flange_progress_records
  for each row execute function public.enforce_flange_progress_append_only();
create trigger flange_jointer_assignments_project_guard
  before insert on public.flange_jointer_assignments
  for each row execute function public.assert_flange_jointer_project();
create trigger flange_jointer_assignments_append_only
  before update or delete on public.flange_jointer_assignments
  for each row execute function public.enforce_flange_jointer_append_only();

-- A stable helper avoids recursive policy evaluation while the read policies traverse
-- engineering revisions to establish the PDS boundary.
create or replace function public.flange_revision_in_pds_scope(target_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.flange_joint_revisions fjr
    join public.spool_revisions sr on sr.id = fjr.spool_revision_id
    join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
    join public.isometrics iso on iso.id = ir.isometric_id
    where fjr.id = target_revision_id
      and public.current_user_in_pds_scope(iso.project_id, ir.pds_area_id)
  );
$$;

revoke all on function public.flange_revision_in_pds_scope(uuid) from public, anon;
grant execute on function public.flange_revision_in_pds_scope(uuid) to authenticated;

-- Flange readers can traverse the existing engineering definition, while revision-side
-- rows remain bounded by the accepted revision's PDS scope.
drop policy if exists "read isometrics" on public.isometrics;
create policy "read isometrics" on public.isometrics for select to authenticated
using (public.current_user_has_capability(project_id, 'spooling.view') or public.current_user_has_capability(project_id, 'flange.view'));

drop policy if exists "read spools" on public.spools;
create policy "read spools" on public.spools for select to authenticated
using (public.current_user_has_capability(project_id, 'spooling.view') or public.current_user_has_capability(project_id, 'flange.view'));

drop policy if exists "read flange joints" on public.flange_joints;
create policy "read flange joints" on public.flange_joints for select to authenticated
using (public.current_user_has_capability(project_id, 'spooling.view') or public.current_user_has_capability(project_id, 'flange.view'));

drop policy if exists "read isometric revisions" on public.isometric_revisions;
create policy "read isometric revisions" on public.isometric_revisions for select to authenticated
using (
  exists (
    select 1 from public.isometrics iso
    where iso.id = isometric_revisions.isometric_id
      and (
        public.current_user_has_capability(iso.project_id, 'spooling.view')
        or (public.current_user_has_capability(iso.project_id, 'flange.view') and public.current_user_in_pds_scope(iso.project_id, isometric_revisions.pds_area_id))
      )
  )
);

drop policy if exists "read spool revisions" on public.spool_revisions;
create policy "read spool revisions" on public.spool_revisions for select to authenticated
using (
  public.current_user_has_capability(public.spool_revision_project_id(spool_revisions.id), 'spooling.view')
  or (public.current_user_has_capability(public.spool_revision_project_id(spool_revisions.id), 'flange.view') and exists (
    select 1 from public.isometric_revisions ir
    where ir.id = spool_revisions.isometric_revision_id
      and public.flange_revision_in_pds_scope((select fjr.id from public.flange_joint_revisions fjr where fjr.spool_revision_id = spool_revisions.id limit 1))
  ))
);

drop policy if exists "read flange joint revisions" on public.flange_joint_revisions;
create policy "read flange joint revisions" on public.flange_joint_revisions for select to authenticated
using (
  public.current_user_has_capability(public.spool_revision_project_id(flange_joint_revisions.spool_revision_id), 'spooling.view')
  or (public.current_user_has_capability(public.spool_revision_project_id(flange_joint_revisions.spool_revision_id), 'flange.view') and public.flange_revision_in_pds_scope(flange_joint_revisions.id))
);

alter table public.flange_progress_records enable row level security;
alter table public.flange_jointer_assignments enable row level security;

create policy "read flange progress records" on public.flange_progress_records for select to authenticated
using (public.current_user_has_capability(project_id, 'flange.view') and public.flange_revision_in_pds_scope(flange_joint_revision_id));

create policy "read flange jointer assignments" on public.flange_jointer_assignments for select to authenticated
using (exists (
  select 1 from public.flange_progress_records progress
  where progress.id = flange_jointer_assignments.progress_record_id
));

grant select on public.flange_progress_records, public.flange_jointer_assignments to authenticated;
revoke insert, update, delete, truncate on public.flange_progress_records, public.flange_jointer_assignments from authenticated, anon;

create or replace view public.flange_joint_worklist
with (security_invoker = true)
as
select
  fj.id as flange_joint_id,
  fj.flange_number,
  fjr.id as flange_joint_revision_id,
  fjr.flange_rating,
  fjr.diameter_inch,
  fjr.bolt_size,
  fjr.bolt_quantity,
  fjr.joint_type,
  fjr.is_removed,
  sr.id as spool_revision_id,
  s.spool_number,
  iso.id as isometric_id,
  iso.iso_number,
  ir.revision_number,
  ir.status as revision_status,
  ir.pds_area_id,
  pds.code as pds_code,
  ir.line_number,
  sc.code as service_class_code,
  progress.id as effective_progress_id,
  progress.joint_category_id,
  progress.torquing_requirement_id,
  progress.jointing_method_snapshot,
  progress.jointing_value,
  progress.joint_date,
  progress.report_number,
  progress.tag_number,
  progress.calculated_ut,
  progress.ut_formula_version,
  case
    when ir.status <> 'accepted' or fjr.is_removed then 'revision_mismatch'
    when progress.id is null then 'not_started'
    else 'completed'
  end as progress_state
from public.flange_joint_revisions fjr
join public.flange_joints fj on fj.id = fjr.flange_joint_id
join public.spool_revisions sr on sr.id = fjr.spool_revision_id
join public.spools s on s.id = sr.spool_id
join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = ir.isometric_id
left join public.project_pds_areas pds on pds.id = ir.pds_area_id
left join public.project_service_classes sc on sc.id = ir.service_class_id
left join public.flange_progress_records progress
  on progress.flange_joint_revision_id = fjr.id and progress.superseded_at is null;

create or replace view public.flange_progress_history
with (security_invoker = true)
as
select
  progress.*,
  coalesce(jsonb_agg(jsonb_build_object(
    'id', assignment.jointer_team_id,
    'code', assignment.jointer_code_snapshot,
    'name', assignment.jointer_name_snapshot
  ) order by assignment.jointer_code_snapshot) filter (where assignment.id is not null), '[]'::jsonb) as jointers
from public.flange_progress_records progress
left join public.flange_jointer_assignments assignment on assignment.progress_record_id = progress.id
group by progress.id;

grant select on public.flange_joint_worklist, public.flange_progress_history to authenticated;
