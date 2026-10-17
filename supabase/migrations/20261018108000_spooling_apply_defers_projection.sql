-- N3: applying a spooling import recomputes each spool's projection once, not once per row it inserts.
--
-- Every insert into weld_joint_revisions, support_revisions, spool_revision_materials and
-- spool_revisions fires a row trigger that recomputes the fabrication projection of its spool (about
-- 6 ms) and then the erection projection (about 10 ms). Applying R0 of UPG-1 (94 spools, 577 joints)
-- ran about 1,200 of these and took 7.7 s of the 8 s the role allows; a pilot import of 5,000 joints
-- would need minutes. While an import is applied the recompute only marks the spool; the wrapper
-- recomputes every marked spool once at the end of the same transaction. Nothing outside apply defers.
--
-- Same rows as before: a spool is recomputed from the facts that exist when apply finishes.
-- Test: 123_spooling_apply_defers_projection.test.sql.

alter function public.recompute_fabrication_spool_projection(uuid)
  rename to recompute_fabrication_spool_projection_now;

create function public.recompute_fabrication_spool_projection(target_spool_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('pipeqc.defer_projection', true) = 'on' then
    create temp table if not exists pipeqc_dirty_spool_projection (spool_revision_id uuid primary key) on commit drop;
    insert into pipeqc_dirty_spool_projection (spool_revision_id) values (target_spool_revision_id)
    on conflict do nothing;
    return;
  end if;
  perform public.recompute_fabrication_spool_projection_now(target_spool_revision_id);
end;
$$;

revoke all on function public.recompute_fabrication_spool_projection(uuid) from public, anon, authenticated;
grant execute on function public.recompute_fabrication_spool_projection(uuid) to service_role;

create function public.flush_deferred_spool_projections()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dirty_id uuid;
  flushed integer := 0;
begin
  if to_regclass('pg_temp.pipeqc_dirty_spool_projection') is null then
    return 0;
  end if;
  perform set_config('pipeqc.defer_projection', 'off', true);
  for dirty_id in select spool_revision_id from pipeqc_dirty_spool_projection loop
    perform public.recompute_fabrication_spool_projection_now(dirty_id);
    flushed := flushed + 1;
  end loop;
  delete from pipeqc_dirty_spool_projection;
  return flushed;
end;
$$;

revoke all on function public.flush_deferred_spool_projections() from public, anon, authenticated;
grant execute on function public.flush_deferred_spool_projections() to service_role;

-- The command keeps its name and signature; the old body becomes the core it wraps.
alter function public.apply_spooling_import_job(uuid) rename to apply_spooling_import_job_core;
revoke all on function public.apply_spooling_import_job_core(uuid) from public, anon, authenticated;

create function public.apply_spooling_import_job(target_job_id uuid)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  applied public.import_jobs;
begin
  perform set_config('pipeqc.defer_projection', 'on', true);
  applied := public.apply_spooling_import_job_core(target_job_id);
  perform public.flush_deferred_spool_projections();
  perform set_config('pipeqc.defer_projection', 'off', true);
  return applied;
end;
$$;

revoke all on function public.apply_spooling_import_job(uuid) from public, anon;
grant execute on function public.apply_spooling_import_job(uuid) to authenticated;
