-- N5: row-level security asks "may this user do X in this row's project" once per query, not once per row.
--
-- 128 read policies called current_user_has_capability(project_id, 'cap') for every row they looked at. That
-- function joins six tables, so a screen that reads a few thousand spools, joints and facts spent most of its
-- time in it: isometric_readiness on a 480-ISO project took 1.5-2.5 s, and the cost grew with every row of
-- every table the policy chain touched (Supabase RLS guide: call functions through a subquery so Postgres
-- evaluates them once, and compare against an indexed set).
--
-- private.user_project_ids(cap) returns the projects in which the caller has the capability, by calling the
-- same function for each project (a handful), and the policies test `project_id IN (SELECT ...)`: an
-- uncorrelated subquery, so one hashed set per statement. The predicate is the same: a row is visible
-- exactly when current_user_has_capability(row.project_id, cap) was true. The same isometric_readiness
-- read now takes 0.25 s. Policies that pass anything but a plain project_id column (spool_revisions reads the
-- project through isometric_revision_project_id) and the PDS-scope checks are left as they are.
--
-- Policies written after this migration keep the old call until they are rewritten the same way;
-- 126_rls_capability_as_project_set.test.sql counts what is left.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.user_project_ids(requested_capability text)
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select project.id
  from public.projects project
  where public.current_user_has_capability(project.id, requested_capability)
$$;

revoke all on function private.user_project_ids(text) from public;
grant execute on function private.user_project_ids(text) to anon, authenticated;

do $$
declare
  policy_row record;
  rewritten text;
  total integer := 0;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual
    from pg_policies
    where schemaname = 'public'
      and cmd in ('SELECT', 'ALL')
      and qual like '%current_user_has_capability(%'
  loop
    rewritten := regexp_replace(
      policy_row.qual,
      'current_user_has_capability\(((?:[a-z_]+\.)?project_id), ''([a-z_.]+)''::text\)',
      '(\1 IN (SELECT private.user_project_ids(''\2''::text)))',
      'g'
    );
    if rewritten <> policy_row.qual then
      execute format('alter policy %I on %I.%I using (%s)', policy_row.policyname, policy_row.schemaname, policy_row.tablename, rewritten);
      total := total + 1;
    end if;
  end loop;
  raise notice 'rewrote % policies', total;
end
$$;
