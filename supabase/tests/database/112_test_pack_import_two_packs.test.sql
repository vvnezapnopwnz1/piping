begin;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001121', 'authenticated', 'authenticated', 'testpack.two@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001121', 'TESTPACK-IMPORT-112', 'Two Test Packs', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001121')
on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', '10000000-0000-0000-0000-000000001121', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000001121', 'material_type', 'MAT-112', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', 'SYS-112', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', '41000000-0000-0000-0000-000000001121', 'SUB-112', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', '40000000-0000-0000-0000-000000001121', 'SC-112', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', 'LS-112', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000001121', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', 'PDS-112', 'Area') on conflict (id) do nothing;
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', 'ISO-112') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000001121', '46000000-0000-0000-0000-000000001121', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000001121', '43000000-0000-0000-0000-000000001121') on conflict (id) do nothing;
insert into public.spools (id, project_id, spool_number)
values ('48000000-0000-0000-0000-000000001121', '30000000-0000-0000-0000-000000001121', 'SP-112') on conflict (id) do nothing;
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('49000000-0000-0000-0000-000000001121', '48000000-0000-0000-0000-000000001121', '47000000-0000-0000-0000-000000001121', 1) on conflict (id) do nothing;

insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000001122', '30000000-0000-0000-0000-000000001121', 'ISO-112-B') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000001122', '46000000-0000-0000-0000-000000001122', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000001121', '43000000-0000-0000-0000-000000001121') on conflict (id) do nothing;
insert into public.spools (id, project_id, spool_number)
values ('48000000-0000-0000-0000-000000001122', '30000000-0000-0000-0000-000000001121', 'SP-112-B') on conflict (id) do nothing;
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('49000000-0000-0000-0000-000000001122', '48000000-0000-0000-0000-000000001122', '47000000-0000-0000-0000-000000001122', 2) on conflict (id) do nothing;

-- One composition file usually holds several Test Packs. Each pack is created with its own
-- idempotency key: one key per job made the second pack replay the first pack's receipt (PQC76).

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001121', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001121","role":"authenticated"}', true);
set local role authenticated;
select public.create_import_job('30000000-0000-0000-0000-000000001121', 'test_pack_composition', 'tp-112.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100, 'checksum-112');
select public.mark_import_job_uploaded((select id from public.import_jobs where source_file_name = 'tp-112.xlsx'), '30000000-0000-0000-0000-000000001121/job/tp-112.xlsx');
select public.record_import_validation((select id from public.import_jobs where source_file_name = 'tp-112.xlsx'),
  '[{"row_number":1,"raw_values":{},"action":"create","normalized_values":{"system":"SYS-112","subsystem":"SUB-112","test_pack_number":"TP-112-A","test_pack_revision":"0","test_medium":"P","test_pressure":12,"planned_start_on":"2026-08-10","planned_end_on":"2026-08-12","priority":"HIGH","service_class":"SC-112","line_service":"LS-112","volume_m3":10,"test_pack_location":"UNIT 1","iso_number":"ISO-112","iso_revision":"R0","spool_number":"SP-112","spool_revision":"R0"}},
    {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"system":"SYS-112","subsystem":"SUB-112","test_pack_number":"TP-112-B","test_pack_revision":"0","test_medium":"P","test_pressure":12,"planned_start_on":"2026-08-10","planned_end_on":"2026-08-12","priority":"HIGH","service_class":"SC-112","line_service":"LS-112","volume_m3":10,"test_pack_location":"UNIT 1","iso_number":"ISO-112-B","iso_revision":"R0","spool_number":"SP-112-B","spool_revision":"R0"}}]'::jsonb, '[]'::jsonb);

select lives_ok($$select public.apply_test_pack_import_job((select id from public.import_jobs where source_file_name = 'tp-112.xlsx'), false)$$,
  'a composition file with two Test Packs applies');
select is((select count(*)::int from public.test_packs where project_id = '30000000-0000-0000-0000-000000001121'), 2, 'both Test Packs are created');
select is((select array_agg(pack.test_pack_number order by pack.test_pack_number)::text from public.test_pack_isometrics member
           join public.test_packs pack on pack.id = member.test_pack_id where pack.project_id = '30000000-0000-0000-0000-000000001121' and member.removed_at is null),
  '{TP-112-A,TP-112-B}', 'each pack holds its own ISO');
select is((select applied_row_count from public.import_jobs where source_file_name = 'tp-112.xlsx'), 2, 'applied_row_count counts both packs');

reset role;
select * from finish();
rollback;
