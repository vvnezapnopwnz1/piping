begin;
select plan(30);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000931', 'authenticated', 'authenticated', 'testpack.manager@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000932', 'authenticated', 'authenticated', 'testpack.reader@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000931', 'TESTPACK-101', 'Test Pack composition', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000931')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', '10000000-0000-0000-0000-000000000931', 'qc_engineer', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000932', '30000000-0000-0000-0000-000000000931', '10000000-0000-0000-0000-000000000932', 'project_manager', 'project_reader', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = excluded.is_active;

insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000931', 'material_type', 'MAT-101', 'Test material')
on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'SYS-101', 'System 101')
on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', '41000000-0000-0000-0000-000000000931', 'SUB-101', 'Subsystem 101')
on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', '40000000-0000-0000-0000-000000000931', 'SC-101', 'Service class 101')
on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'LS-101', 'Line service 101')
on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000000931', 'bar')
on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'PDS-101', 'Area 101')
on conflict (id) do nothing;

insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'ISO-101')
on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000931', '46000000-0000-0000-0000-000000000931', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000000931', '43000000-0000-0000-0000-000000000931')
on conflict (id) do nothing;

select has_table('public', 'test_packs', 'stable Test Pack table exists');
select has_table('public', 'test_pack_isometrics', 'Test Pack ISO membership table exists');
select col_not_null('public', 'test_packs', 'pressure_unit', 'pressure unit snapshot is required');
select col_not_null('public', 'test_packs', 'revision_no', 'revision number is required');
select col_not_null('public', 'test_pack_isometrics', 'assigned_isometric_revision_id', 'accepted revision snapshot is required');
select has_index('public', 'test_pack_isometrics', 'test_pack_isometrics_one_active', 'one active Test Pack per ISO is enforced');
select has_function('public', 'create_test_pack', array['uuid','text','uuid','uuid','uuid','uuid','date','date','text','public.test_pack_medium','numeric','text','numeric','text'], 'create RPC exists');
select has_function('public', 'compose_test_pack', array['uuid','uuid','text','uuid','text'], 'compose RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000931', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000931","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$select public.create_test_pack(
  '30000000-0000-0000-0000-000000000931', 'TP-101',
  '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931',
  '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931',
  date '2026-08-10', date '2026-08-12', 'High', 'P', 12.5, 'Unit 1', 10, 'tp-101')$$,
  'manager can create a stable Test Pack');
select is((select revision_no from public.test_packs where test_pack_number = 'TP-101'), 0, 'create starts at revision zero');
select is((select pressure_unit::text from public.test_packs where test_pack_number = 'TP-101'), 'bar', 'pressure unit is resolved server-side');
select is((select lifecycle from public.test_packs where test_pack_number = 'TP-101'), 'active', 'lifecycle is server-owned');

select lives_ok($$select public.create_test_pack(
  '30000000-0000-0000-0000-000000000931', 'TP-101',
  '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931',
  '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931',
  date '2026-08-10', date '2026-08-12', 'High', 'P', 12.5, 'Unit 1', 10, 'tp-101')$$,
  'same create key is idempotent');
select throws_ok($$select public.create_test_pack(
  '30000000-0000-0000-0000-000000000931', 'TP-102',
  '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931',
  '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931',
  date '2026-08-10', date '2026-08-12', 'High', 'P', 12.5, 'Unit 1', 10, 'tp-101')$$,
  'PQC76', null, 'different payload with same key is rejected');

select lives_ok($$select public.update_test_pack(
  (select id from public.test_packs where test_pack_number = 'TP-101'),
  '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931',
  '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931',
  date '2026-08-11', date '2026-08-13', 'Normal', 'P', 13, 'Unit 1', 11, 'tp-update-101')$$,
  'metadata update is atomic');
select is((select revision_no from public.test_packs where test_pack_number = 'TP-101'), 1, 'metadata update increments revision');
reset role;
select is((select count(*)::int from public.audit_events where entity_type = 'test_packs' and action = 'update_test_pack'), 1, 'metadata update writes an audit event');

set local role authenticated;
select lives_ok($$select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-101'), '46000000-0000-0000-0000-000000000931', 'manual', null, 'compose-101')$$,
  'accepted ISO can be composed');
select is((select count(*)::int from public.test_pack_isometrics where removed_at is null), 1, 'one active ISO membership exists');
select is((select assigned_isometric_revision_id from public.test_pack_isometrics where removed_at is null), '47000000-0000-0000-0000-000000000931'::uuid, 'accepted revision is snapshotted');
select throws_ok($$select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-101'), '46000000-0000-0000-0000-000000000931', 'manual', null, 'compose-duplicate')$$,
  '23505', null, 'an ISO cannot belong to two active packs');
select lives_ok($$select public.remove_test_pack_isometric((select id from public.test_packs where test_pack_number = 'TP-101'), '46000000-0000-0000-0000-000000000931', 'remove-101')$$,
  'membership removal retains history');
select is((select count(*)::int from public.test_pack_isometrics where removed_at is not null), 1, 'removed membership is retained');
select lives_ok($$select public.archive_test_pack((select id from public.test_packs where test_pack_number = 'TP-101'), 'archive-101')$$,
  'archive command succeeds');
select is((select lifecycle from public.test_packs where test_pack_number = 'TP-101'), 'archived', 'archive is server-owned');
select throws_ok($$select public.update_test_pack(
  (select id from public.test_packs where test_pack_number = 'TP-101'),
  '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931',
  '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931',
  date '2026-08-11', date '2026-08-13', 'Normal', 'P', 13, 'Unit 1', 11, 'update-archived')$$,
  'PQC89', null, 'archived Test Pack is read-only');

select throws_ok($$insert into public.test_packs (project_id, test_pack_number, system_id, subsystem_id, service_class_id, line_service_id, pressure_unit, planned_start_on, planned_end_on, priority, test_medium, test_pressure, location) values ('30000000-0000-0000-0000-000000000931', 'DIRECT', '41000000-0000-0000-0000-000000000931', '42000000-0000-0000-0000-000000000931', '43000000-0000-0000-0000-000000000931', '44000000-0000-0000-0000-000000000931', 'bar', current_date, current_date, 'High', 'P', 1, 'Unit')$$,
  '42501', null, 'authenticated users cannot insert Test Packs directly');
reset role;
select is(has_table_privilege('authenticated', 'public.test_packs', 'INSERT'), false, 'authenticated role has no Test Pack INSERT grant');
select is(has_table_privilege('authenticated', 'public.test_pack_isometrics', 'UPDATE'), false, 'authenticated role has no membership UPDATE grant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000932', true);
select is((select count(*)::int from public.test_pack_catalog), 1, 'reader can see a complete scoped Test Pack catalog');
reset role;
select * from finish();
rollback;
