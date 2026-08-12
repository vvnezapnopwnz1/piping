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

-- Staging helpers ------------------------------------------------------------

-- A cast that returns null instead of raising. The browser parser already flags
-- non-numeric cells as blockers; the server must survive them regardless.
create or replace function public.engineering_numeric(value text)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return value::numeric;
exception
  when others then
    return null;
end;
$$;

-- Numbers are compared as trimmed text so 120.5 and 120.500 do not read as a change.
create or replace function public.engineering_numeric_key(value numeric)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(trim_scale(round(value, 3))::text, '');
$$;

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

revoke all on function
  public.engineering_numeric(text),
  public.engineering_numeric_key(numeric),
  public.spooling_staging(uuid)
from public, anon;

grant execute on function
  public.engineering_numeric(text),
  public.engineering_numeric_key(numeric),
  public.spooling_staging(uuid)
to authenticated;

-- Validation ------------------------------------------------------------------

-- Mirrors record_import_validation, with two differences: the capability is
-- spooling.manage, and a job without a weld file cannot be validated at all.
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
  if not exists (
    select 1 from public.import_files
    where job_id = target_job_id and file_role = 'weld'
  ) then
    raise exception 'weld.txt is required before validation' using errcode = 'PQC25';
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

  -- Server-side issues are derived immediately so the preview the user sees is the
  -- same set apply will enforce.
  perform public.revalidate_spooling_import_job(target_job_id);

  return job;
end;
$$;

revoke all on function public.record_spooling_validation(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.record_spooling_validation(uuid, jsonb, jsonb) to authenticated;

-- Preview ---------------------------------------------------------------------

create or replace function public.preview_spooling_import(target_job_id uuid)
returns table (
  iso_number text,
  entity_type public.engineering_entity_type,
  entity_key text,
  change_type public.revision_change_type,
  requires_decision boolean,
  decision public.revision_decision,
  previous_payload jsonb,
  next_payload jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  return query
  with staged as (
    select s.entity_kind, s.entity_values from public.spooling_staging(target_job_id) s
  ),
  -- The accepted revision of every ISO named by the file set, if there is one.
  previous_revision as (
    select distinct on (iso.iso_number)
      iso.iso_number,
      rev.id as revision_id
    from staged st
    join public.isometrics iso
      on iso.project_id = job.project_id
     and iso.iso_number = st.entity_values ->> 'iso_number'
    join public.isometric_revisions rev
      on rev.isometric_id = iso.id and rev.status = 'accepted'
  ),
  staged_spool as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'spool_number' as entity_key,
      jsonb_build_object(
        'sequence_number', coalesce(st.entity_values ->> 'sequence_number', '1'),
        'weight_kg', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'weight_kg')),
        'material_class', coalesce(st.entity_values ->> 'material_class', '')
      ) as payload
    from staged st where st.entity_kind = 'spool'
  ),
  previous_spool as (
    select
      pr.iso_number,
      sp.spool_number as entity_key,
      jsonb_build_object(
        'sequence_number', sr.sequence_number::text,
        'weight_kg', public.engineering_numeric_key(sr.weight_kg),
        'material_class', coalesce(sr.material_class, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    where sr.is_removed = false
  ),
  staged_weld as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'weld_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'weld_type', coalesce(st.entity_values ->> 'weld_type', ''),
        'weld_location', coalesce(st.entity_values ->> 'weld_location', 'shop'),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'thickness_mm', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'thickness_mm'))
      ) as payload
    from staged st where st.entity_kind = 'weld_joint'
  ),
  previous_weld as (
    select
      pr.iso_number,
      wj.weld_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'weld_type', coalesce(wt.code, ''),
        'weld_location', wjr.weld_location,
        'diameter_inch', public.engineering_numeric_key(wjr.diameter_inch),
        'thickness_mm', public.engineering_numeric_key(wjr.thickness_mm)
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.weld_joint_revisions wjr on wjr.spool_revision_id = sr.id
    join public.weld_joints wj on wj.id = wjr.weld_joint_id
    left join public.project_weld_types wt on wt.id = wjr.weld_type_id
    where wjr.is_removed = false
  ),
  staged_support as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'support_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'support_type', coalesce(st.entity_values ->> 'support_type', ''),
        'quantity', coalesce(st.entity_values ->> 'quantity', '1')
      ) as payload
    from staged st where st.entity_kind = 'support'
  ),
  previous_support as (
    select
      pr.iso_number,
      su.support_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'support_type', coalesce(supr.support_type, ''),
        'quantity', supr.quantity::text
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.support_revisions supr on supr.spool_revision_id = sr.id
    join public.supports su on su.id = supr.support_id
    where supr.is_removed = false
  ),
  staged_flange as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'flange_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'flange_rating', coalesce(st.entity_values ->> 'flange_rating', ''),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'bolt_size', coalesce(st.entity_values ->> 'bolt_size', ''),
        'bolt_quantity', coalesce(st.entity_values ->> 'bolt_quantity', ''),
        'joint_type', coalesce(st.entity_values ->> 'joint_type', '')
      ) as payload
    from staged st where st.entity_kind = 'flange_joint'
  ),
  previous_flange as (
    select
      pr.iso_number,
      fj.flange_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'flange_rating', coalesce(fjr.flange_rating, ''),
        'diameter_inch', public.engineering_numeric_key(fjr.diameter_inch),
        'bolt_size', coalesce(fjr.bolt_size, ''),
        'bolt_quantity', coalesce(fjr.bolt_quantity::text, ''),
        'joint_type', coalesce(fjr.joint_type, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.flange_joint_revisions fjr on fjr.spool_revision_id = sr.id
    join public.flange_joints fj on fj.id = fjr.flange_joint_id
    where fjr.is_removed = false
  ),
  combined as (
    select 'spool'::public.engineering_entity_type as et,
           coalesce(s.iso_number, p.iso_number) as iso_number,
           coalesce(s.entity_key, p.entity_key) as entity_key,
           p.payload as previous_payload, s.payload as next_payload
    from staged_spool s full outer join previous_spool p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'weld_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_weld s full outer join previous_weld p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'support', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_support s full outer join previous_support p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'flange_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_flange s full outer join previous_flange p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
  ),
  typed as (
    select
      c.iso_number,
      c.et,
      c.entity_key,
      case
        when c.previous_payload is null then 'new'
        when c.next_payload is null then 'removed'
        when c.previous_payload = c.next_payload then 'unchanged'
        else 'revised'
      end::public.revision_change_type as change_type,
      c.previous_payload,
      c.next_payload,
      exists (select 1 from previous_revision pr where pr.iso_number = c.iso_number) as iso_is_revised
    from combined c
  ),
  spool_decision as (
    select d.entity_key, d.decision
    from public.import_revision_decisions d
    where d.job_id = target_job_id and d.entity_type = 'spool'
  )
  select
    t.iso_number,
    t.et,
    t.entity_key,
    t.change_type,
    case
      -- Dossier 15.2: every spool of a revised ISO needs a decision.
      when t.et = 'spool' then t.iso_is_revised
      -- Dossier 15.3: a weld needs its own decision only inside a rework spool.
      when t.et = 'weld_joint' then t.iso_is_revised and exists (
        select 1 from spool_decision sd
        where sd.decision = 'rework'
          and sd.entity_key = coalesce(
            t.next_payload ->> 'spool_number', t.previous_payload ->> 'spool_number')
      )
      else false
    end as requires_decision,
    (select d.decision from public.import_revision_decisions d
     where d.job_id = target_job_id and d.entity_type = t.et and d.entity_key = t.entity_key),
    t.previous_payload,
    t.next_payload
  from typed t
  order by t.iso_number, t.et, t.entity_key;
end;
$$;

revoke all on function public.preview_spooling_import(uuid) from public, anon;
grant execute on function public.preview_spooling_import(uuid) to authenticated;

-- Server-side authority --------------------------------------------------------

-- Deletes and re-derives every SRV_ issue. Client-submitted issues keep their own
-- codes and are left alone: they are advisory, this function is authoritative.
create or replace function public.revalidate_spooling_import_job(target_job_id uuid)
returns table (blocker_count integer, warning_count integer, unresolved_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  delete from public.import_job_issues
  where job_id = target_job_id and code like 'SRV\_%';

  -- 1. PDS area must exist (dossier 14.1, blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'pds_area', 'blocker', 'SRV_PDS_MISSING',
         format('PDS area "%s" does not exist in this project.', s.entity_values ->> 'pds_area')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'isometric'
    and not exists (
      select 1 from public.project_pds_areas a
      where a.project_id = job.project_id
        and a.code = s.entity_values ->> 'pds_area'
        and a.status = 'active'
    );

  -- 2. Service class must exist (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'service_class', 'blocker', 'SRV_SERVICE_CLASS_MISSING',
         format('Service class "%s" does not exist in this project.', s.entity_values ->> 'service_class')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'isometric'
    and not exists (
      select 1 from public.project_service_classes c
      where c.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and c.status = 'active'
    );

  -- 3. Weld type must exist (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_type', 'blocker', 'SRV_WELD_TYPE_MISSING',
         format('Weld type "%s" does not exist in this project.', s.entity_values ->> 'weld_type')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1 from public.project_weld_types t
      where t.project_id = job.project_id
        and t.code = s.entity_values ->> 'weld_type'
        and t.status = 'active'
    );

  -- 4. A thickness rule must cover service class + diameter (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'thickness_mm', 'blocker', 'SRV_THICKNESS_MISSING',
         format('No thickness rule covers service class "%s" at %s inch.',
                s.entity_values ->> 'service_class', s.entity_values ->> 'diameter_inch')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1
      from public.project_thickness_flange_rules r
      join public.project_service_classes c on c.id = r.service_class_id
      where r.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and r.diameter_inch = public.engineering_numeric(s.entity_values ->> 'diameter_inch')
        and r.status = 'active'
    );

  -- 5. An NDE matrix rule must cover class + weld type + location (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_type', 'blocker', 'SRV_NDE_MATRIX_MISSING',
         format('No NDE matrix rule covers %s / %s / %s.',
                s.entity_values ->> 'service_class',
                s.entity_values ->> 'weld_type',
                coalesce(s.entity_values ->> 'weld_location', 'shop'))
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1
      from public.nde_matrix_rules m
      join public.project_service_classes c on c.id = m.service_class_id
      join public.project_weld_types t on t.id = m.weld_type_id
      where m.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and t.code = s.entity_values ->> 'weld_type'
        and m.weld_location = coalesce(s.entity_values ->> 'weld_location', 'shop')
        and m.status = 'active'
    );

  -- 6. Covering WPS. Dossier 11.6 and 14.2: WARNING, never a blocker.
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_number', 'warning', 'SRV_WPS_MISSING',
         format('No approved WPS covers weld %s at %s inch / %s mm. The import may still proceed.',
                s.entity_values ->> 'weld_number',
                s.entity_values ->> 'diameter_inch',
                s.entity_values ->> 'thickness_mm')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1 from public.project_welding_procedures wp
      where wp.project_id = job.project_id
        and wp.status = 'active'
        and public.engineering_numeric(s.entity_values ->> 'diameter_inch')
              between wp.diameter_from and wp.diameter_to
        and public.engineering_numeric(s.entity_values ->> 'thickness_mm')
              between wp.thickness_from and wp.thickness_to
    );

  -- 7. One line number and one service class per ISO (dossier 14.1, blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, null, 'line_number', 'blocker', 'SRV_ISO_MIXED_LINE',
         format('Isometric %s carries more than one line number.', grouped.iso_number)
  from (
    select s.entity_values ->> 'iso_number' as iso_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'isometric'
    group by 1
    having count(distinct coalesce(s.entity_values ->> 'line_number', '')) > 1
  ) grouped;

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, null, 'service_class', 'blocker', 'SRV_ISO_MIXED_SERVICE_CLASS',
         format('Isometric %s carries more than one service class.', grouped.iso_number)
  from (
    select s.entity_values ->> 'iso_number' as iso_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'weld_joint'
    group by 1
    having count(distinct coalesce(s.entity_values ->> 'service_class', '')) > 1
  ) grouped;

  -- 8. Cross-file consistency: no orphan spool in trace / bolt / supp (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'spool_number', 'blocker', 'SRV_ORPHAN_SPOOL',
         format('Spool %s is referenced by %s data but is absent from weld.txt.',
                s.entity_values ->> 'spool_number', s.entity_kind)
  from public.spooling_staging(target_job_id) s
  where s.entity_kind in ('support', 'flange_joint', 'material')
    and not exists (
      select 1 from public.spooling_staging(target_job_id) w
      where w.entity_kind = 'spool'
        and w.entity_values ->> 'spool_number' = s.entity_values ->> 'spool_number'
        and w.entity_values ->> 'iso_number' = s.entity_values ->> 'iso_number'
    );

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'warning'),
    (select count(*)::integer from public.preview_spooling_import(target_job_id) p
     where p.requires_decision and p.decision is null);
end;
$$;

create or replace function public.record_revision_decision(
  target_job_id uuid,
  target_iso_number text,
  target_entity_type public.engineering_entity_type,
  target_entity_key text,
  chosen_decision public.revision_decision,
  decision_comment text default null
)
returns public.import_revision_decisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  recorded public.import_revision_decisions;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.status <> 'validated' then
    raise exception 'Decisions can only be recorded on a validated import' using errcode = 'PQC24';
  end if;

  insert into public.import_revision_decisions (
    job_id, iso_number, entity_type, entity_key, decision, comment, decided_by
  )
  values (
    target_job_id, target_iso_number, target_entity_type, target_entity_key,
    chosen_decision, decision_comment, auth.uid()
  )
  on conflict (job_id, entity_type, entity_key) do update
    set decision = excluded.decision,
        comment = excluded.comment,
        decided_by = excluded.decided_by,
        decided_at = timezone('utc', now())
  returning * into recorded;

  -- Changing a spool away from rework strands its weld decisions; drop them so the
  -- unresolved counter and the workbench agree.
  if target_entity_type = 'spool' and chosen_decision <> 'rework' then
    delete from public.import_revision_decisions
    where job_id = target_job_id
      and entity_type = 'weld_joint'
      and iso_number = target_iso_number;
  end if;

  return recorded;
end;
$$;

revoke all on function
  public.revalidate_spooling_import_job(uuid),
  public.record_revision_decision(uuid, text, public.engineering_entity_type, text, public.revision_decision, text)
from public, anon;

grant execute on function
  public.revalidate_spooling_import_job(uuid),
  public.record_revision_decision(uuid, text, public.engineering_entity_type, text, public.revision_decision, text)
to authenticated;

-- Apply -----------------------------------------------------------------------

create or replace function public.apply_spooling_import_job(target_job_id uuid)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  blockers integer;
  warnings integer;
  unresolved integer;
  iso_rec record;
  spool_rec record;
  child_rec record;
  isometric_row public.isometrics;
  previous_revision_id uuid;
  new_revision_id uuid;
  next_ordinal integer;
  staged_revision_number text;
  spool_row public.spools;
  new_spool_revision_id uuid;
  previous_spool_revision_id uuid;
  spool_decision public.revision_decision;
  weld_decision public.revision_decision;
  weld_joint_row public.weld_joints;
  new_weld_revision_id uuid;
  support_row public.supports;
  flange_row public.flange_joints;
  change_item_id uuid;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  progress_kind text;
begin
  -- The row lock plus the applied_at guard is what makes double-apply impossible.
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
  if job.applied_at is not null or job.status = 'applied' then
    raise exception 'This import has already been applied' using errcode = 'PQC10';
  end if;
  if job.status <> 'validated' then
    raise exception 'The import must be validated before it can be applied' using errcode = 'PQC24';
  end if;
  if not exists (
    select 1 from public.import_files where job_id = target_job_id and file_role = 'weld'
  ) then
    raise exception 'weld.txt is required before apply' using errcode = 'PQC25';
  end if;

  select r.blocker_count, r.warning_count, r.unresolved_count
  into blockers, warnings, unresolved
  from public.revalidate_spooling_import_job(target_job_id) r;

  if blockers > 0 then
    raise exception 'The import still has blocking issues' using errcode = 'PQC26';
  end if;
  if unresolved > 0 then
    raise exception 'Every revised spool and reworked weld needs a decision' using errcode = 'PQC22';
  end if;

  for iso_rec in
    select
      s.entity_values ->> 'iso_number' as iso_number,
      s.entity_values ->> 'revision_number' as revision_number,
      s.entity_values ->> 'pds_area' as pds_area,
      s.entity_values ->> 'service_class' as service_class,
      s.entity_values ->> 'line_number' as line_number,
      s.entity_values ->> 'sheet_number' as sheet_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'isometric'
    order by 1
  loop
    insert into public.isometrics (project_id, iso_number)
    values (job.project_id, iso_rec.iso_number)
    on conflict (project_id, iso_number) do update
      set updated_at = timezone('utc', now())
    returning * into isometric_row;

    select id into previous_revision_id
    from public.isometric_revisions
    where isometric_id = isometric_row.id and status = 'accepted';

    staged_revision_number := coalesce(nullif(trim(iso_rec.revision_number), ''), 'R0');

    if exists (
      select 1 from public.isometric_revisions
      where isometric_id = isometric_row.id and revision_number = staged_revision_number
    ) then
      raise exception 'Isometric % already has revision %',
        iso_rec.iso_number, staged_revision_number using errcode = 'PQC23';
    end if;

    select coalesce(max(revision_ordinal), 0) + 1 into next_ordinal
    from public.isometric_revisions where isometric_id = isometric_row.id;

    insert into public.isometric_revisions (
      isometric_id, revision_number, revision_ordinal, status,
      pds_area_id, service_class_id, line_number, sheet_number,
      source_import_job_id, created_by
    )
    values (
      isometric_row.id, staged_revision_number, next_ordinal, 'draft',
      (select id from public.project_pds_areas
        where project_id = job.project_id and code = iso_rec.pds_area),
      (select id from public.project_service_classes
        where project_id = job.project_id and code = iso_rec.service_class),
      iso_rec.line_number, iso_rec.sheet_number,
      target_job_id, auth.uid()
    )
    returning id into new_revision_id;

    affected := affected || new_revision_id;
    written := written + 1;

    -- Every spool the new revision must contain: staged spools plus, for a revised
    -- ISO, the spools of the accepted revision that the file set dropped.
    for spool_rec in
      select p.entity_key as spool_number, p.change_type, p.decision,
             p.previous_payload, p.next_payload
      from public.preview_spooling_import(target_job_id) p
      where p.entity_type = 'spool' and p.iso_number = iso_rec.iso_number
      order by p.entity_key
    loop
      spool_decision := spool_rec.decision;

      insert into public.spools (project_id, spool_number)
      values (job.project_id, spool_rec.spool_number)
      on conflict (project_id, spool_number) do update set spool_number = excluded.spool_number
      returning * into spool_row;

      select sr.id into previous_spool_revision_id
      from public.spool_revisions sr
      where sr.spool_id = spool_row.id
        and sr.isometric_revision_id = previous_revision_id;

      -- Dossier 15.2: a cancelled or dropped spool is carried as removed, so the new
      -- revision alone answers "what is in scope" without joining to history.
      insert into public.spool_revisions (
        spool_id, isometric_revision_id, sequence_number, weight_kg, material_class, is_removed
      )
      values (
        spool_row.id,
        new_revision_id,
        coalesce((spool_rec.next_payload ->> 'sequence_number')::integer, 1),
        public.engineering_numeric(spool_rec.next_payload ->> 'weight_kg'),
        nullif(spool_rec.next_payload ->> 'material_class', ''),
        coalesce(spool_rec.change_type = 'removed' or spool_decision = 'cancelled', false)
      )
      returning id into new_spool_revision_id;

      written := written + 1;

      insert into public.revision_change_items (
        project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
        entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
        source_import_job_id
      )
      values (
        job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
        'spool', spool_row.id, spool_rec.spool_number, spool_rec.change_type,
        spool_rec.previous_payload, spool_rec.next_payload, target_job_id
      )
      returning id into change_item_id;

      if spool_decision is not null then
        insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
        select change_item_id, spool_decision, d.comment, d.decided_by
        from public.import_revision_decisions d
        where d.job_id = target_job_id and d.entity_type = 'spool'
          and d.entity_key = spool_rec.spool_number;
      end if;

      -- Plan section 3.8: authorize progress carry-over, do not fabricate progress rows.
      if previous_spool_revision_id is not null
         and spool_decision in ('done_without_modification', 'rework') then
        foreach progress_kind in array array['fabrication_start', 'sent_to_paint', 'paint']
        loop
          insert into public.revision_progress_copies (
            change_item_id, source_spool_revision_id, target_spool_revision_id,
            progress_kind, copied_by
          )
          values (
            change_item_id, previous_spool_revision_id, new_spool_revision_id,
            progress_kind, auth.uid()
          );
        end loop;
      end if;

      if coalesce(spool_rec.change_type = 'removed' or spool_decision = 'cancelled', false) then
        continue;
      end if;

      -- Weld joints
      for child_rec in
        select p.entity_key as weld_number, p.change_type, p.decision,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'weld_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        weld_decision := child_rec.decision;

        insert into public.weld_joints (project_id, weld_number)
        values (job.project_id, child_rec.weld_number)
        on conflict (project_id, weld_number) do update set weld_number = excluded.weld_number
        returning * into weld_joint_row;

        insert into public.weld_joint_revisions (
          weld_joint_id, spool_revision_id, weld_type_id, weld_location,
          diameter_inch, thickness_mm, is_removed
        )
        values (
          weld_joint_row.id,
          new_spool_revision_id,
          (select id from public.project_weld_types
            where project_id = job.project_id
              and code = child_rec.next_payload ->> 'weld_type'),
          coalesce(nullif(child_rec.next_payload ->> 'weld_location', ''), 'shop'),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          public.engineering_numeric(child_rec.next_payload ->> 'thickness_mm'),
          coalesce(child_rec.change_type = 'removed' or weld_decision = 'cancelled', false)
        )
        returning id into new_weld_revision_id;

        written := written + 1;

        -- Dossier 7.3: Root and Cap always exist; Heat and Fill are optional and are
        -- attached by fabrication, not by the definition.
        if child_rec.change_type <> 'removed' and coalesce(weld_decision, 'not_done') <> 'cancelled' then
          insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
          values (new_weld_revision_id, 'root', 1), (new_weld_revision_id, 'cap', 2);
        end if;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'weld_joint', weld_joint_row.id, child_rec.weld_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        )
        returning id into change_item_id;

        if weld_decision is not null then
          insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
          select change_item_id, weld_decision, d.comment, d.decided_by
          from public.import_revision_decisions d
          where d.job_id = target_job_id and d.entity_type = 'weld_joint'
            and d.entity_key = child_rec.weld_number;
        end if;
      end loop;

      -- Supports
      for child_rec in
        select p.entity_key as support_number, p.change_type,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'support'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.supports (project_id, support_number)
        values (job.project_id, child_rec.support_number)
        on conflict (project_id, support_number) do update set support_number = excluded.support_number
        returning * into support_row;

        insert into public.support_revisions (
          support_id, spool_revision_id, support_type, quantity, is_removed
        )
        values (
          support_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'support_type', ''),
          coalesce((child_rec.next_payload ->> 'quantity')::integer, 1),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'support', support_row.id, child_rec.support_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Flange joints
      for child_rec in
        select p.entity_key as flange_number, p.change_type,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'flange_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.flange_joints (project_id, flange_number)
        values (job.project_id, child_rec.flange_number)
        on conflict (project_id, flange_number) do update set flange_number = excluded.flange_number
        returning * into flange_row;

        insert into public.flange_joint_revisions (
          flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
          bolt_size, bolt_quantity, joint_type, is_removed
        )
        values (
          flange_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'flange_rating', ''),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          nullif(child_rec.next_payload ->> 'bolt_size', ''),
          nullif(child_rec.next_payload ->> 'bolt_quantity', '')::integer,
          nullif(child_rec.next_payload ->> 'joint_type', ''),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'flange_joint', flange_row.id, child_rec.flange_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Materials from trace.txt
      insert into public.spool_revision_materials (
        spool_revision_id, ident_code, description, quantity, unit, trace_number
      )
      select
        new_spool_revision_id,
        s.entity_values ->> 'ident_code',
        nullif(s.entity_values ->> 'description', ''),
        public.engineering_numeric(s.entity_values ->> 'quantity'),
        nullif(s.entity_values ->> 'unit', ''),
        nullif(s.entity_values ->> 'trace_number', '')
      from public.spooling_staging(target_job_id) s
      where s.entity_kind = 'material'
        and s.entity_values ->> 'iso_number' = iso_rec.iso_number
        and s.entity_values ->> 'spool_number' = spool_rec.spool_number
      on conflict do nothing;
    end loop;

    -- Supersede first, accept second: the partial unique index allows only one
    -- accepted revision, and the read-only trigger reads OLD.status, still 'accepted'.
    if previous_revision_id is not null then
      update public.isometric_revisions
      set status = 'superseded', superseded_at = timezone('utc', now())
      where id = previous_revision_id;
    end if;

    update public.isometric_revisions
    set status = 'accepted', accepted_at = timezone('utc', now())
    where id = new_revision_id;
  end loop;

  update public.import_jobs
  set status = 'applied',
      applied_at = timezone('utc', now()),
      completed_at = timezone('utc', now()),
      applied_row_count = written,
      affected_entity_ids = affected
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'apply_spooling_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function public.apply_spooling_import_job(uuid) from public, anon;
grant execute on function public.apply_spooling_import_job(uuid) to authenticated;
