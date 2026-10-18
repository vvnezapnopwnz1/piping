begin;
select plan(19);

-- Phase 4a, F2: WPS approval and welder expiry dates come from the file. A row without a valid date is
-- refused at validation with its row and column; the server clock never fills them in.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('11000000-0000-0000-0000-000000001281', 'authenticated', 'authenticated', 'ref.dates@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('31000000-0000-0000-0000-000000001281', 'REF-DATES', 'Reference dates', 'Owner', 'Contractor', 1, '11000000-0000-0000-0000-000000001281');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('21000000-0000-0000-0000-000000001281', '31000000-0000-0000-0000-000000001281', '11000000-0000-0000-0000-000000001281', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set role = 'system_admin', access_role_code = 'project_admin', is_active = true;

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001281', '31000000-0000-0000-0000-000000001281', 'FAB-128', 'Fabricator');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001281', 'material_type', 'CS-128', 'Carbon steel')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000001281', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000001281","role":"authenticated"}', true);

reset role;
select is(public.is_iso_date('2026-02-30'), false, 'a calendar impossibility is not a date');
select is(public.is_iso_date('2026-10-01'), true, 'an ISO date is a date');
select is(public.is_iso_date(''), false, 'an empty cell is not a date');
set local role authenticated;

-- WPS without the approval date, and with a malformed one
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welding_procedure', 'wps.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'wps-dates-bad');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'wps-dates-bad'), '31000000-0000-0000-0000-000000001281/x/wps.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'wps-dates-bad'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"wps_code":"WPS-128-A","subcontractor":"FAB-128","material_type":"CS-128","diameter_from_inch":1,"diameter_to_inch":12,"thickness_from_mm":2,"thickness_to_mm":20}},
    {"row_number":2,"action":"create","raw_values":{},"normalized_values":
       {"wps_code":"WPS-128-B","subcontractor":"FAB-128","material_type":"CS-128","diameter_from_inch":1,"diameter_to_inch":12,"thickness_from_mm":2,"thickness_to_mm":20,"approved_on":"31/12/2026"}}]'::jsonb,
  '[]'::jsonb);
select public.revalidate_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-bad'));

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from public.import_jobs where source_checksum = 'wps-dates-bad')
     and row_number = 1 and column_name = 'approved_on' and code = 'SRV_REQUIRED' and severity = 'blocker'),
  1, 'a WPS row without approved_on is a blocker naming row 1 and the column');
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from public.import_jobs where source_checksum = 'wps-dates-bad')
     and row_number = 2 and column_name = 'approved_on' and code = 'SRV_INVALID_DATE' and severity = 'blocker'),
  1, 'a WPS row with a malformed date is a blocker naming row 2');
select throws_ok(
  $$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-bad'), false)$$,
  'PQC13', null, 'the file is not applied while the dates are missing');

-- Welder without the expiry
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welder_qualification', 'welders.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'welder-dates-bad');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'welder-dates-bad'), '31000000-0000-0000-0000-000000001281/x/welders.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'welder-dates-bad'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"welder_code":"W-128","welder_name":"No expiry","subcontractor":"FAB-128","wps_codes":["WPS-128-A"]}}]'::jsonb,
  '[]'::jsonb);
select public.revalidate_import_job((select id from public.import_jobs where source_checksum = 'welder-dates-bad'));
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from public.import_jobs where source_checksum = 'welder-dates-bad')
     and row_number = 1 and column_name = 'expires_on' and code = 'SRV_REQUIRED' and severity = 'blocker'),
  1, 'a welder row without expires_on is a blocker naming row 1 and the column');

-- Both with dates: stored as given
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welding_procedure', 'wps.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'wps-dates-ok');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'wps-dates-ok'), '31000000-0000-0000-0000-000000001281/x/wps2.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'wps-dates-ok'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"wps_code":"WPS-128-A","subcontractor":"FAB-128","material_type":"CS-128","diameter_from_inch":1,"diameter_to_inch":12,"thickness_from_mm":2,"thickness_to_mm":20,"approved_on":"2026-09-01"}}]'::jsonb,
  '[]'::jsonb);
select lives_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-ok'), false)$$,
  'a WPS file with the date applies');
select is(
  (select approved_on from public.project_welding_procedures
   where project_id = '31000000-0000-0000-0000-000000001281' and code = 'WPS-128-A'),
  date '2026-09-01', 'approved_on is the date of the file, not the day of the import');

select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welder_qualification', 'welders.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'welder-dates-ok');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'welder-dates-ok'), '31000000-0000-0000-0000-000000001281/x/welders2.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'welder-dates-ok'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"welder_code":"W-128","welder_name":"Expired","subcontractor":"FAB-128","wps_codes":["WPS-128-A"],"expires_on":"2025-01-31"}}]'::jsonb,
  '[]'::jsonb);
select lives_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'welder-dates-ok'), false)$$,
  'a welder file with the date applies, even when the qualification has already expired');
select is(
  (select expires_on from public.welder_qualifications
   where project_id = '31000000-0000-0000-0000-000000001281' and welder_code = 'W-128'),
  date '2025-01-31', 'expires_on is the date of the file, and it is in the past');

-- The same file again changes no date and adds no row
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welding_procedure', 'wps.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'wps-dates-again');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'wps-dates-again'), '31000000-0000-0000-0000-000000001281/x/wps3.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'wps-dates-again'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"wps_code":"WPS-128-A","subcontractor":"FAB-128","material_type":"CS-128","diameter_from_inch":1,"diameter_to_inch":12,"thickness_from_mm":2,"thickness_to_mm":20,"approved_on":"2026-09-01"}}]'::jsonb,
  '[]'::jsonb);
select public.apply_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-again'), false);
select is(
  (select count(*)::int from public.project_welding_procedures
   where project_id = '31000000-0000-0000-0000-000000001281' and code = 'WPS-128-A' and approved_on = date '2026-09-01'),
  1, 'applying the same file again leaves one WPS with the same date');

-- The same welders file again is a no-op, not a unique violation
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welder_qualification', 'welders.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'welder-dates-again');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'welder-dates-again'), '31000000-0000-0000-0000-000000001281/x/welders3.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'welder-dates-again'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"welder_code":"W-128","welder_name":"Expired","subcontractor":"FAB-128","wps_codes":["WPS-128-A"],"expires_on":"2025-01-31"}}]'::jsonb,
  '[]'::jsonb);
select lives_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'welder-dates-again'), false)$$,
  'the same welders file applies again without a conflict');
select is(
  (select count(*)::int from public.welder_qualifications where project_id = '31000000-0000-0000-0000-000000001281' and welder_code = 'W-128'),
  1, 'and leaves one welder');

-- A welder file with another expiry is a conflict the user confirms
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welder_qualification', 'welders.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'welder-dates-changed');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'welder-dates-changed'), '31000000-0000-0000-0000-000000001281/x/welders4.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'welder-dates-changed'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"welder_code":"W-128","welder_name":"Expired","subcontractor":"FAB-128","wps_codes":["WPS-128-A"],"expires_on":"2027-12-31"}}]'::jsonb,
  '[]'::jsonb);
select throws_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'welder-dates-changed'), false)$$,
  'PQC14', null, 'a changed expiry is an unconfirmed overwrite conflict');
select lives_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'welder-dates-changed'), true)$$,
  'and applies once confirmed');
select is(
  (select expires_on from public.welder_qualifications where project_id = '31000000-0000-0000-0000-000000001281' and welder_code = 'W-128'),
  date '2027-12-31', 'the confirmed expiry replaces the old one');

-- A WPS file with another approval date is a conflict, not a silent keep of the old date
select public.create_import_job('31000000-0000-0000-0000-000000001281', 'welding_procedure', 'wps.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'wps-dates-changed');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_checksum = 'wps-dates-changed'), '31000000-0000-0000-0000-000000001281/x/wps4.xlsx');
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'wps-dates-changed'),
  '[{"row_number":1,"action":"create","raw_values":{},"normalized_values":
       {"wps_code":"WPS-128-A","subcontractor":"FAB-128","material_type":"CS-128","diameter_from_inch":1,"diameter_to_inch":12,"thickness_from_mm":2,"thickness_to_mm":20,"approved_on":"2026-01-10"}}]'::jsonb,
  '[]'::jsonb);
select throws_ok($$select public.apply_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-changed'), false)$$,
  'PQC14', null, 'a changed approval date is an unconfirmed overwrite conflict');
select public.apply_import_job((select id from public.import_jobs where source_checksum = 'wps-dates-changed'), true);
select is(
  (select approved_on from public.project_welding_procedures where project_id = '31000000-0000-0000-0000-000000001281' and code = 'WPS-128-A'),
  date '2026-01-10', 'a typo in the date can be corrected by importing the right one and confirming');

select * from finish();
rollback;
