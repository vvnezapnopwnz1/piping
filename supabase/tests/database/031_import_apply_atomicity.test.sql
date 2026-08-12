begin;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'apply.platform@example.test', 'not-used', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'apply.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '11000000-0000-0000-0000-000000000201';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('31000000-0000-0000-0000-000000000201', 'APPLY-A', 'Apply A', 'Owner', 'Contractor', 1, '11000000-0000-0000-0000-000000000201');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('21000000-0000-0000-0000-000000000201', '31000000-0000-0000-0000-000000000201', '11000000-0000-0000-0000-000000000202', 'system_admin', 'project_admin', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000202', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000202","role":"authenticated"}', true);

-- Job 1: two valid PML rows
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'ok.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-ok'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-ok'),
  '31000000-0000-0000-0000-000000000201/x/ok.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-ok'),
  '[
    {"row_number":1,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-1","ident_code":"ID-1","trace_number":"HT-1"}},
    {"row_number":2,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-2","ident_code":"ID-2","trace_number":"HT-2"}}
  ]'::jsonb,
  '[]'::jsonb
);

select lives_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-ok'), false)$$,
  'valid PML job applies'
);

select is(
  (select count(*)::int from public.piping_material_records
   where project_id = '31000000-0000-0000-0000-000000000201'),
  2,
  'both PML rows were written'
);

select is(
  (select applied_row_count from public.import_jobs where source_checksum = 'apply-ok'),
  2,
  'applied_row_count is recorded'
);

select is(
  (select array_length(affected_entity_ids, 1) from public.import_jobs where source_checksum = 'apply-ok'),
  2,
  'affected entity ids are recorded'
);

-- Applying twice is refused
select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-ok'), false)$$,
  'PQC10',
  'Import job has already been applied',
  'a job cannot be applied twice'
);

-- Job 2: server-side blocker, even though the client submitted no issues
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'bad.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-bad'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-bad'),
  '31000000-0000-0000-0000-000000000201/y/bad.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-bad'),
  '[
    {"row_number":1,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-9","ident_code":"ID-9","trace_number":"HT-9"}},
    {"row_number":2,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"","ident_code":"","trace_number":""}}
  ]'::jsonb,
  '[]'::jsonb
);
select public.revalidate_import_job((select id from public.import_jobs where source_checksum = 'apply-bad'));

select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-bad'), false)$$,
  'PQC13',
  'Import cannot be applied while blocking issues remain',
  'server-side validation rejects a blank required field the client did not flag'
);

select is(
  (select count(*)::int from public.piping_material_records
   where project_id = '31000000-0000-0000-0000-000000000201'),
  2,
  'the failed apply wrote no rows at all'
);

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from public.import_jobs where source_checksum = 'apply-bad')
     and severity = 'blocker'),
  1,
  'the server-derived blocker was persisted for the user'
);

-- Job 3: unconfirmed conflict blocks apply
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'dup.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-dup'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-dup'),
  '31000000-0000-0000-0000-000000000201/z/dup.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-dup'),
  '[{"row_number":1,"action":"update","raw_values":{},"normalized_values":{"mrr_number":"MRR-1-NEW","ident_code":"ID-1","trace_number":"HT-1"}}]'::jsonb,
  '[]'::jsonb
);

select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-dup'), false)$$,
  'PQC14',
  'Import has unconfirmed overwrite conflicts',
  'an unconfirmed overwrite is refused'
);

select lives_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-dup'), true)$$,
  'the same overwrite succeeds once confirmed'
);

reset role;
select * from finish();
rollback;
