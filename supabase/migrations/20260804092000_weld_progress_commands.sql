-- Track 05: shop weld progress, the obligations it generates, and the locks that protect it.
-- Dossier 7.3 and 16.5.

create table public.weld_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  subcontractor_id uuid not null references public.project_subcontractors(id) on delete restrict,
  welding_procedure_id uuid not null references public.project_welding_procedures(id) on delete restrict,
  cutting_on date,
  beveling_on date,
  fitup_on date,
  preheat_on date,
  weld_on date,
  dwir_number text,
  qc_form_number text,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  rework_code_id uuid references public.project_rework_codes(id) on delete restrict,
  is_locked boolean not null default false,
  locked_at timestamptz,
  version integer not null default 1 check (version > 0),
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id),
  check (is_locked = (locked_at is not null))
);

create index weld_progress_records_spool_idx on public.weld_progress_records (spool_revision_id);

create table public.weld_point_assignments (
  id uuid primary key default gen_random_uuid(),
  weld_progress_record_id uuid not null references public.weld_progress_records(id) on delete cascade,
  weld_point_id uuid not null references public.weld_points(id) on delete restrict,
  point_type text not null check (point_type in ('root', 'hot', 'fill', 'cap')),
  welder_qualification_id uuid not null references public.welder_qualifications(id) on delete restrict,
  completion_percent numeric(5, 2) not null check (completion_percent >= 0 and completion_percent <= 100),
  welded_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_progress_record_id, weld_point_id),
  unique (weld_progress_record_id, welder_qualification_id)
);

create table public.nde_obligations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  method public.ndt_method not null,
  required_coverage numeric(5, 2) not null check (required_coverage > 0 and required_coverage <= 100),
  selection_mode text not null check (selection_mode in ('full', 'spot')),
  disposition text not null default 'pending' check (disposition in ('pending', 'satisfied', 'waived')),
  source_matrix_rule_id uuid references public.nde_matrix_rules(id) on delete restrict,
  satisfied_at timestamptz,
  satisfied_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id, method)
);

create index nde_obligations_spool_idx on public.nde_obligations (spool_revision_id, disposition);

create table public.pwht_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  thickness_threshold_mm numeric(8, 3),
  source_matrix_rule_id uuid references public.nde_matrix_rules(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id)
);

create index pwht_requirements_spool_idx on public.pwht_requirements (spool_revision_id);

create type public.weld_context as (
  weld_joint_revision_id uuid,
  weld_joint_id uuid,
  weld_number text,
  spool_revision_id uuid,
  isometric_revision_id uuid,
  project_id uuid,
  pds_area_id uuid,
  service_class_id uuid,
  weld_type_id uuid,
  weld_location text,
  diameter_inch numeric,
  thickness_mm numeric,
  material_class text,
  revision_status public.revision_status,
  is_removed boolean
);

create or replace function public.weld_joint_context(target_weld_joint_revision_id uuid)
returns public.weld_context
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
begin
  select wjr.id, wjr.weld_joint_id, wj.weld_number, sr.id, rev.id, iso.project_id,
         rev.pds_area_id, rev.service_class_id, wjr.weld_type_id, wjr.weld_location,
         wjr.diameter_inch, wjr.thickness_mm, sr.material_class, rev.status, wjr.is_removed
    into ctx
  from public.weld_joint_revisions wjr
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where wjr.id = target_weld_joint_revision_id;

  if ctx.weld_joint_revision_id is null then
    raise exception 'The weld joint revision was not found' using errcode = 'PQC30';
  end if;

  return ctx;
end;
$$;

alter table public.weld_progress_records enable row level security;
alter table public.weld_point_assignments enable row level security;
alter table public.nde_obligations enable row level security;
alter table public.pwht_requirements enable row level security;

create policy "read weld progress records" on public.weld_progress_records
  for select to authenticated using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read weld point assignments" on public.weld_point_assignments
  for select to authenticated using (exists (
    select 1 from public.weld_progress_records parent
    where parent.id = weld_point_assignments.weld_progress_record_id
      and public.current_user_has_capability(parent.project_id, 'fabrication.view')
  ));

create policy "read nde obligations" on public.nde_obligations
  for select to authenticated using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'nde.view')
  );

create policy "read pwht requirements" on public.pwht_requirements
  for select to authenticated using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'nde.view')
  );

grant select on public.weld_progress_records, public.weld_point_assignments,
  public.nde_obligations, public.pwht_requirements to authenticated;

revoke insert, update, delete, truncate on public.weld_progress_records,
  public.weld_point_assignments, public.nde_obligations, public.pwht_requirements from authenticated, anon;

revoke all on function public.weld_joint_context(uuid) from public, anon;
grant execute on function public.weld_joint_context(uuid) to authenticated;
