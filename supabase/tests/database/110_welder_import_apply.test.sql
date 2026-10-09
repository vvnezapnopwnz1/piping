begin;
select plan(5);

-- A welder qualification Excel import applies: the welder is written with its WPS links.
-- save_welder_qualification returns the whole row, and apply_import_job used to assign that row
-- to a uuid variable, so every welder import failed with 22P02.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('11000000-0000-0000-0000-000000001101', 'authenticated', 'authenticated', 'welder.import@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('31000000-0000-0000-0000-000000001101', 'WELDER-IMP', 'Welder import', 'Owner', 'Contractor', 1, '11000000-0000-0000-0000-000000001101');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('21000000-0000-0000-0000-000000001101', '31000000-0000-0000-0000-000000001101', '11000000-0000-0000-0000-000000001101', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set role = 'system_admin', access_role_code = 'project_admin', is_active = true;

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001101', '31000000-0000-0000-0000-000000001101', 'FAB-110', 'Fabricator');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001101', 'material_type', 'CS-110', 'Carbon steel')
on conflict do nothing;

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values
  ('56000000-0000-0000-0000-000000001101', '31000000-0000-0000-0000-000000001101', '50000000-0000-0000-0000-000000001101',
   '53000000-0000-0000-0000-000000001101', 'WPS-110-A', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01'),
  ('56000000-0000-0000-0000-000000001102', '31000000-0000-0000-0000-000000001101', '50000000-0000-0000-0000-000000001101',
   '53000000-0000-0000-0000-000000001101', 'WPS-110-B', 'SMAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000001101', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000001101","role":"authenticated"}', true);

select public.create_import_job(
  '31000000-0000-0000-0000-000000001101', 'welder_qualification', 'welders.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'welder-import-110'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'welder-import-110'),
  '31000000-0000-0000-0000-000000001101/x/welders.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'welder-import-110'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
     {"welder_code":"W-110","welder_name":"Welder One","subcontractor":"FAB-110","wps_codes":["WPS-110-A","WPS-110-B"]}}]'::jsonb,
  '[]'::jsonb
);

select lives_ok(
  $$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'welder-import-110'), false)$$,
  'a welder qualification job applies'
);

select is(
  (select full_name from public.welder_qualifications
   where project_id = '31000000-0000-0000-0000-000000001101' and welder_code = 'W-110'),
  'Welder One',
  'the welder is written with its name'
);

select is(
  (select count(*)::int from public.welder_wps_qualifications link
   join public.welder_qualifications welder on welder.id = link.welder_qualification_id
   where welder.welder_code = 'W-110' and welder.project_id = '31000000-0000-0000-0000-000000001101'),
  2,
  'the welder is qualified for both WPS of the row'
);

select is(
  (select applied_row_count from public.import_jobs where source_checksum = 'welder-import-110'),
  1,
  'applied_row_count is recorded'
);

select is(
  (select affected_entity_ids from public.import_jobs where source_checksum = 'welder-import-110'),
  array[(select id from public.welder_qualifications
         where project_id = '31000000-0000-0000-0000-000000001101' and welder_code = 'W-110')],
  'affected_entity_ids holds the welder id'
);

select * from finish();
rollback;
