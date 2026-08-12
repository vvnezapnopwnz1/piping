begin;
select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'imp.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'imp.admin.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'imp.reader.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'imp.admin.b@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000101';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000101', 'IMP-A', 'Import A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000101'),
  ('30000000-0000-0000-0000-000000000102', 'IMP-B', 'Import B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000101');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000101', '30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000102', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000103', 'qc_engineer', 'project_reader', true),
  ('20000000-0000-0000-0000-000000000103', '30000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000104', 'system_admin', 'project_admin', true);

-- Schema shape
select has_table('public', 'import_job_rows', 'import_job_rows table exists');
select has_table('public', 'import_job_issues', 'import_job_issues table exists');
select has_column('public', 'import_jobs', 'import_type', 'import_jobs has import_type');
select has_column('public', 'import_jobs', 'source_checksum', 'import_jobs has source_checksum');
select has_column('public', 'import_jobs', 'applied_at', 'import_jobs has applied_at');
select has_column('public', 'import_jobs', 'applied_row_count', 'import_jobs has applied_row_count');

-- RLS is enabled on every new table
select is(relrowsecurity, true, 'import_job_rows has RLS')
from pg_class where oid = 'public.import_job_rows'::regclass;
select is(relrowsecurity, true, 'import_job_issues has RLS')
from pg_class where oid = 'public.import_job_issues'::regclass;

-- authenticated may never write these tables directly
select is(
  has_table_privilege('authenticated', 'public.import_jobs', 'INSERT'),
  false,
  'authenticated cannot insert import_jobs directly'
);
select is(
  has_table_privilege('authenticated', 'public.import_jobs', 'TRUNCATE'),
  false,
  'authenticated cannot truncate import_jobs'
);

-- Capabilities exist and are not granted to readers
select is(
  (select count(*)::int from public.capabilities where code in ('imports.view', 'imports.manage')),
  2,
  'import capabilities are seeded'
);
select is(
  (select count(*)::int from public.role_capabilities
   where role_code = 'project_reader' and capability_code = 'imports.manage'),
  0,
  'project_reader does not receive imports.manage'
);

-- Project Admin A can create a job
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000102', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000102","role":"authenticated"}', true);

select lives_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'pml.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-aaa'
    )$$,
  'project admin can create an import job'
);

select is(
  (select status from public.import_jobs where source_checksum = 'checksum-aaa'),
  'draft',
  'new job starts in draft'
);

-- Reader cannot create a job
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000103', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000103","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'pml.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-reader'
    )$$,
  '42501',
  'Import management capability is required',
  'reader cannot create an import job'
);

-- Admin of project B cannot create a job in project A
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000104', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000104","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'cross.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-cross'
    )$$,
  '42501',
  'Import management capability is required',
  'cross-project import creation is rejected'
);

-- Cancel is terminal
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000102', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000102","role":"authenticated"}', true);

select lives_ok(
  $$select public.cancel_import_job(
      (select id from public.import_jobs where source_checksum = 'checksum-aaa')
    )$$,
  'project admin can cancel a draft job'
);

select throws_ok(
  $$select public.cancel_import_job(
      (select id from public.import_jobs where source_checksum = 'checksum-aaa')
    )$$,
  'PQC11',
  'Import job is already in a terminal state',
  'cancelling a canceled job is rejected'
);

reset role;

select * from finish();
rollback;
