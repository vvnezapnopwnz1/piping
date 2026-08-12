-- Track 03: import platform lifecycle, rows and issues.

create type public.import_issue_severity as enum ('blocker', 'conflict', 'warning');

-- Evolve import_jobs. `kind` becomes a compatibility column, mirroring how Track 01
-- retired project_memberships.role in favour of access_role_code.
alter table public.import_jobs
  add column if not exists import_type text,
  add column if not exists source_file_name text,
  add column if not exists source_media_type text,
  add column if not exists source_size_bytes bigint,
  add column if not exists source_checksum text,
  add column if not exists conflicts_confirmed boolean not null default false,
  add column if not exists validated_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists applied_row_count integer not null default 0,
  add column if not exists affected_entity_ids uuid[] not null default array[]::uuid[],
  add column if not exists canceled_at timestamptz,
  add column if not exists failure_reason text;

update public.import_jobs set import_type = kind where import_type is null;

alter table public.import_jobs
  alter column import_type set not null,
  alter column kind drop not null;

alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check
  check (status in ('draft', 'uploaded', 'validating', 'validated', 'applying', 'applied', 'failed', 'canceled'));

alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list',
    'welding_procedure',
    'welder_qualification',
    'thickness_flange',
    'nde_matrix'
  ));

create index if not exists import_jobs_project_created_idx
  on public.import_jobs (project_id, created_at desc);

create table public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_values jsonb not null check (jsonb_typeof(raw_values) = 'object'),
  normalized_values jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_values) = 'object'),
  action text not null check (action in ('create', 'update', 'unchanged', 'skip')),
  target_entity_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (job_id, row_number)
);

create index import_job_rows_job_idx on public.import_job_rows (job_id, row_number);

create table public.import_job_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer check (row_number is null or row_number > 0),
  column_name text,
  severity public.import_issue_severity not null,
  code text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index import_job_issues_job_idx on public.import_job_issues (job_id, severity);

-- Capabilities
insert into public.capabilities (code, description, is_mutating, requires_functional_role)
values
  ('imports.view', 'View import jobs and their history', false, false),
  ('imports.manage', 'Create, validate, apply and cancel import jobs', true, false)
on conflict (code) do nothing;

insert into public.role_capabilities (role_code, capability_code)
values
  ('project_admin', 'imports.view'),
  ('project_admin', 'imports.manage'),
  ('site_admin', 'imports.view'),
  ('site_admin', 'imports.manage'),
  ('project_editor', 'imports.view'),
  ('project_editor', 'imports.manage'),
  ('project_reader', 'imports.view')
on conflict (role_code, capability_code) do nothing;

alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.import_job_issues enable row level security;

drop policy if exists "import jobs are read by capability" on public.import_jobs;
create policy "import jobs are read by capability"
  on public.import_jobs for select to authenticated
  using (public.current_user_has_capability(project_id, 'imports.view'));

drop policy if exists "import job rows are read by capability" on public.import_job_rows;
create policy "import job rows are read by capability"
  on public.import_job_rows for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_job_rows.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

drop policy if exists "import job issues are read by capability" on public.import_job_issues;
create policy "import job issues are read by capability"
  on public.import_job_issues for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_job_issues.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

-- Every mutation goes through a SECURITY DEFINER RPC. Reads only for authenticated.
revoke all on public.import_jobs, public.import_job_rows, public.import_job_issues
  from anon, authenticated;

grant select on public.import_jobs, public.import_job_rows, public.import_job_issues
  to authenticated;
