-- Track 04: SpoolGen multi-file import on top of the Track 03 import platform.

create type public.spoolgen_file_role as enum ('weld', 'trace', 'bolt', 'supp');

-- Roadmap 9.3 names import_files. Track 03 kept one file per job on import_jobs
-- because every type it handled was a single workbook; SpoolGen needs up to four.
create table public.import_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  file_role public.spoolgen_file_role not null,
  file_name text not null check (length(trim(file_name)) > 0),
  media_type text,
  -- Dossier 14.3: 4 MB per file. Enforced here, in the bucket, and in the browser.
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 4194304),
  checksum text,
  storage_path text,
  uploaded_at timestamptz not null default timezone('utc', now()),
  unique (job_id, file_role)
);

create index import_files_job_idx on public.import_files (job_id);

-- Decisions taken before apply are keyed by business numbers, because the revision
-- rows they will govern do not exist until apply runs.
create table public.import_revision_decisions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  iso_number text not null,
  entity_type public.engineering_entity_type not null,
  entity_key text not null,
  decision public.revision_decision not null,
  comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default timezone('utc', now()),
  unique (job_id, entity_type, entity_key)
);

create index import_revision_decisions_job_idx
  on public.import_revision_decisions (job_id, iso_number);

alter table public.import_jobs
  drop constraint if exists import_jobs_import_type_check;

alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list',
    'welding_procedure',
    'welder_qualification',
    'thickness_flange',
    'nde_matrix',
    'spooling_definition'
  ));

alter table public.import_files enable row level security;
alter table public.import_revision_decisions enable row level security;

create policy "read import files" on public.import_files
  for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_files.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

create policy "read import revision decisions" on public.import_revision_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_revision_decisions.job_id
        and public.current_user_has_capability(job.project_id, 'spooling.view')
    )
  );

grant select on public.import_files, public.import_revision_decisions to authenticated;
revoke insert, update, delete, truncate
  on public.import_files, public.import_revision_decisions
  from authenticated, anon;

-- Job creation and file registration ------------------------------------------

create or replace function public.create_spooling_import_job(
  target_project_id uuid,
  job_comment text default null
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if not public.current_user_has_capability(target_project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by, failure_reason
  )
  values (
    target_project_id, 'spooling_definition', 'spooling_definition', 'draft', auth.uid(), null
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_spooling_import_job',
    null,
    to_jsonb(created_job) || jsonb_build_object('comment', job_comment)
  );

  return created_job;
end;
$$;

create or replace function public.register_spooling_import_file(
  target_job_id uuid,
  role public.spoolgen_file_role,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text,
  object_path text
)
returns public.import_files
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  registered public.import_files;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job does not accept SpoolGen files' using errcode = 'PQC24';
  end if;
  if job.status not in ('draft', 'uploaded') then
    raise exception 'Files can only be attached before validation' using errcode = 'PQC24';
  end if;
  if coalesce(size_bytes, 0) <= 0 or size_bytes > 4194304 then
    raise exception 'A SpoolGen file must be between 1 byte and 4 MB' using errcode = '23514';
  end if;

  insert into public.import_files (
    job_id, file_role, file_name, media_type, size_bytes, checksum, storage_path
  )
  values (
    target_job_id, role, trim(file_name), media_type, size_bytes, checksum, object_path
  )
  on conflict (job_id, file_role) do update
    set file_name = excluded.file_name,
        media_type = excluded.media_type,
        size_bytes = excluded.size_bytes,
        checksum = excluded.checksum,
        storage_path = excluded.storage_path,
        uploaded_at = timezone('utc', now())
  returning * into registered;

  update public.import_jobs
  set status = 'uploaded',
      source_file_name = coalesce(job.source_file_name, trim(file_name)),
      source_media_type = coalesce(job.source_media_type, media_type)
  where id = target_job_id;

  return registered;
end;
$$;

revoke all on function
  public.create_spooling_import_job(uuid, text),
  public.register_spooling_import_file(uuid, public.spoolgen_file_role, text, text, bigint, text, text)
from public, anon;

grant execute on function
  public.create_spooling_import_job(uuid, text),
  public.register_spooling_import_file(uuid, public.spoolgen_file_role, text, text, bigint, text, text)
to authenticated;
