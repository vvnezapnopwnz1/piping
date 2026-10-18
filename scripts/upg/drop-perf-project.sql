-- Removes the measurement project PERF-1 and everything that hangs off it, on the LOCAL stand only.
--
--   docker exec -i supabase_db_pipe-qc-shell-layout psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
--     < scripts/upg/drop-perf-project.sql
--
-- Needs the superuser: append-only triggers and the FKs without ON DELETE CASCADE are switched off with
-- session_replication_role = replica, and rows are removed child tables first by walking pg_constraint.
-- Storage objects of the project's import jobs are removed by the row (the volume file is left behind).
-- Never run it anywhere but the local development stack.
begin;
set local session_replication_role = replica;

create or replace function pg_temp.drop_rows(target regclass, predicate text, seen oid[]) returns void
language plpgsql as $$
declare
  fk record;
  child_predicate text;
begin
  for fk in
    select c.conrelid, c.conkey, c.confkey
    from pg_constraint c
    where c.contype = 'f' and c.confrelid = target and c.conrelid <> target and not (c.conrelid = any(seen))
  loop
    select format('(%s) in (select %s from %s where %s)',
             (select string_agg(format('%I', a.attname), ', ' order by k.ord) from unnest(fk.conkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = fk.conrelid and a.attnum = k.attnum),
             (select string_agg(format('%I', a.attname), ', ' order by k.ord) from unnest(fk.confkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = target and a.attnum = k.attnum),
             target, predicate)
    into child_predicate;
    perform pg_temp.drop_rows(fk.conrelid::regclass, child_predicate, seen || fk.conrelid);
  end loop;
  execute format('delete from %s where %s', target, predicate);
end $$;

do $$
declare
  perf uuid := (select id from public.projects where activity_code = 'PERF-1');
begin
  if perf is null then raise notice 'PERF-1 does not exist'; return; end if;
  delete from storage.objects where name like perf::text || '/%';
  perform pg_temp.drop_rows('public.projects'::regclass, format('id = %L', perf), array['public.projects'::regclass::oid]);
end $$;

select count(*) as projects_left from public.projects;
commit;
