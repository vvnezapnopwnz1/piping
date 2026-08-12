begin;
select plan(10);

select has_table('public', 'project_punch_codes', 'project punch-code table exists');
select has_column('public', 'project_punch_codes', 'project_id', 'punch codes are project scoped');
select has_column('public', 'project_punch_codes', 'code', 'punch code has code');
select has_column('public', 'project_punch_codes', 'description', 'punch code has description');
select has_column('public', 'project_punch_codes', 'status', 'punch code has lifecycle status');
select has_index('public', 'project_punch_codes', 'project_punch_codes_project_code_uq', 'punch code uniqueness is project scoped and case insensitive');
select has_trigger('public', 'project_punch_codes', 'project_punch_codes_set_updated_at', 'punch code updates refresh timestamp');
select has_trigger('public', 'project_punch_codes', 'project_punch_codes_audit', 'punch code changes are audited');

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_punch_codes'
      and policyname = 'test pack users read punch codes'
  ),
  'testpack.view read policy exists'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_punch_codes'
      and policyname = 'project admins update punch codes'
  ),
  'project referential management policy exists'
);

select * from finish();
rollback;
