begin;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000941', 'authenticated', 'authenticated', 'testpack.import@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000941', 'TESTPACK-IMPORT-102', 'Test Pack import', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000941')
on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', '10000000-0000-0000-0000-000000000941', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000941', 'material_type', 'MAT-102', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'SYS-102', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', '41000000-0000-0000-0000-000000000941', 'SUB-102', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', '40000000-0000-0000-0000-000000000941', 'SC-102', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'LS-102', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000000941', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'PDS-102', 'Area') on conflict (id) do nothing;
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'ISO-102') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000941', '46000000-0000-0000-0000-000000000941', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000000941', '43000000-0000-0000-0000-000000000941') on conflict (id) do nothing;
insert into public.spools (id, project_id, spool_number)
values ('48000000-0000-0000-0000-000000000941', '30000000-0000-0000-0000-000000000941', 'SP-102') on conflict (id) do nothing;
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('49000000-0000-0000-0000-000000000941', '48000000-0000-0000-0000-000000000941', '47000000-0000-0000-0000-000000000941', 1) on conflict (id) do nothing;

select has_function('public', 'revalidate_test_pack_import_job', array['uuid'], 'Test Pack import revalidation RPC exists');
select has_function('public', 'apply_test_pack_import_job', array['uuid','boolean'], 'Test Pack import apply RPC exists');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000941', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000941","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.create_import_job('30000000-0000-0000-0000-000000000941', 'test_pack_composition', 'tp-102.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100, 'checksum-102')$$,
  'Test Pack composition job can be created');
select is((select import_type from public.import_jobs where source_file_name = 'tp-102.xlsx'), 'test_pack_composition', 'job keeps the dedicated import type');
select lives_ok($$select public.mark_import_job_uploaded((select id from public.import_jobs where source_file_name = 'tp-102.xlsx'), '30000000-0000-0000-0000-000000000941/job/tp-102.xlsx')$$, 'uploaded composition job can be validated');

select lives_ok($$select public.record_import_validation(
  (select id from public.import_jobs where source_file_name = 'tp-102.xlsx'),
  '[{"row_number":1,"raw_values":{},"normalized_values":{"system":"SYS-102","subsystem":"SUB-102","test_pack_number":"TP-102","test_pack_revision":"0","test_medium":"P","test_pressure":12,"planned_start_on":"2026-08-10","planned_end_on":"2026-08-12","priority":"HIGH","service_class":"SC-102","line_service":"LS-102","volume_m3":10,"test_pack_location":"UNIT 1","iso_number":"ISO-102","iso_revision":"R0","spool_number":"SP-102","spool_revision":"1"},"action":"create"}]'::jsonb,
  '[]'::jsonb)$$, 'normalized composition rows can be recorded');
select is((select blocker_count from public.revalidate_test_pack_import_job((select id from public.import_jobs where source_file_name = 'tp-102.xlsx'))), 0, 'server revalidation has no blockers');
select is((select conflict_count from public.revalidate_test_pack_import_job((select id from public.import_jobs where source_file_name = 'tp-102.xlsx'))), 0, 'server revalidation has no conflicts');
select lives_ok($$select public.apply_test_pack_import_job((select id from public.import_jobs where source_file_name = 'tp-102.xlsx'), false)$$, 'composition import applies atomically');
select is((select count(*)::int from public.test_packs where test_pack_number = 'TP-102'), 1, 'import creates one stable Test Pack');
select is((select count(*)::int from public.test_pack_isometrics member join public.test_packs pack on pack.id = member.test_pack_id where pack.test_pack_number = 'TP-102' and member.removed_at is null), 1, 'import composes the whole ISO once');
select is((select status from public.import_jobs where source_file_name = 'tp-102.xlsx'), 'applied', 'import job reaches applied state');
select throws_ok($$select public.apply_test_pack_import_job((select id from public.import_jobs where source_file_name = 'tp-102.xlsx'), false)$$,
  'PQC11', null, 'reapplying an applied composition job is rejected');
select is((select count(*)::int from public.audit_events where action = 'apply_test_pack_import_job'), 1, 'composition apply writes an audit event');

reset role;
select * from finish();
rollback;
