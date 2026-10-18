-- Phase 4a: a spooling job too big for one transaction is refused at validation, with the reason, not
-- cancelled by the statement timeout in the middle of apply.
--
-- Measured on the local stand (docs/acceptance/2026-10-18-upg-20k-import.md): apply is linear at about
-- 0.55-0.65 ms per weld joint (14,400 joints 8.0 s, 20,195 joints 11-13 s) and has no single hot spot:
-- 20,195 row inserts into weld_joint_revisions 1.7 s, weld_points 0.8 s, revision_change_items 0.8 s,
-- projections 1.3 s, the revalidation apply repeats 1.6 s. The role's statement_timeout (8 s locally, 30 s
-- on KZ) is armed before the command starts, so a function-level `set statement_timeout` does not
-- lengthen it (tried: the apply was still cancelled at 8.0 s). A job above the limit therefore could never
-- finish and the user saw only "The engineering action could not be completed".
--
-- The limit is a rule the server owns: 1,000 joints per second of the role's statement_timeout, which is
-- 1 ms per joint against the 0.55-0.7 ms measured (9,800 joints took 6.9 s of 8 s), so about a third of
-- the time is margin (8 s -> 8,000 joints; 30 s -> 30,000). An operator who measured a different speed sets `pipeqc.spooling_joint_limit` on the database
-- (`alter database postgres set pipeqc.spooling_joint_limit = '20000'`); the setting wins when present.
-- A statement_timeout of 0 means no limit. The import is split by area and applied part by part.
--
-- Same rows as before for every job within the limit. Test: 127_spooling_job_joint_limit.test.sql.

create or replace function public.spooling_job_joint_limit()
returns integer
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  configured text := nullif(current_setting('pipeqc.spooling_joint_limit', true), '');
  timeout_seconds numeric;
begin
  if configured is not null then
    return configured::integer;
  end if;
  timeout_seconds := extract(epoch from nullif(current_setting('statement_timeout'), '0')::interval);
  if timeout_seconds is null then
    return null;
  end if;
  return greatest(floor(timeout_seconds * 1000), 1)::integer;
end;
$$;

revoke all on function public.spooling_job_joint_limit() from public, anon;
grant execute on function public.spooling_job_joint_limit() to authenticated;

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
