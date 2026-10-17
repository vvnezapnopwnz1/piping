-- The API roles run with pg_safeupdate: a DELETE without WHERE is refused, and the flush from
-- 20261018108000 ended with one, so the apply command failed through the API (not for a superuser,
-- which is why pgTAP did not see it).

create or replace function public.flush_deferred_spool_projections()
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
  delete from pipeqc_dirty_spool_projection where true;
  return flushed;
end;
$$;
