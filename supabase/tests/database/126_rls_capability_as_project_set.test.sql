-- N5: read policies test project membership as a set built once per query. A policy that calls
-- current_user_has_capability(project_id, '...') row by row is a regression of the 6-10x that cost;
-- new policies should use private.user_project_ids('...') the same way.
begin;
select plan(2);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and cmd in ('SELECT', 'ALL')
     and qual ~ 'current_user_has_capability\(((?:[a-z_]+\.)?project_id), ''[a-z_.]+''::text\)'),
  0,
  'no read policy calls the capability check for every row with a plain project_id');

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and qual like '%private.user_project_ids%') >= 50,
  'the read policies use the project set');

select * from finish();
rollback;
