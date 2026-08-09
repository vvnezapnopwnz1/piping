begin;
select plan(21);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000951', 'authenticated', 'authenticated', 'linecheck.manager@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000951', 'LINECHECK-103', 'Line Check', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000951') on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', '10000000-0000-0000-0000-000000000951', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000951', 'material_type', 'MAT-103', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'SYS-103', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', '41000000-0000-0000-0000-000000000951', 'SUB-103', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', '40000000-0000-0000-0000-000000000951', 'SC-103', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'LS-103', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000000951', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'PDS-103', 'Area') on conflict (id) do nothing;
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'ISO-103') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000951', '46000000-0000-0000-0000-000000000951', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000000951', '43000000-0000-0000-0000-000000000951') on conflict (id) do nothing;
insert into public.project_teams (id, project_id, team_type, code, description)
values
  ('48000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'line_check', 'LC-103', 'Line Check team'),
  ('48000000-0000-0000-0000-000000000952', '30000000-0000-0000-0000-000000000951', 'finishing', 'FIN-103', 'Finishing team')
on conflict (id) do nothing;
insert into public.project_punch_codes (id, project_id, code, description)
values ('49000000-0000-0000-0000-000000000951', '30000000-0000-0000-0000-000000000951', 'X-103', 'Missing support') on conflict (id) do nothing;

select has_table('public', 'pressure_test_requests', 'pressure test request table exists');
select has_table('public', 'line_check_results', 'line check result table exists');
select has_table('public', 'punch_items', 'punch item table exists');
select has_function('public', 'assign_line_check', array['uuid','uuid[]','uuid','date','text'], 'line check assignment RPC exists');
select has_function('public', 'record_line_check_result', array['uuid','uuid','date','jsonb','text'], 'line check result RPC exists');
select has_function('public', 'assign_item_clearance', array['uuid','uuid[]','uuid','date','text'], 'clearance assignment RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000951', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000951","role":"authenticated"}', true);
set local role authenticated;
select public.create_test_pack('30000000-0000-0000-0000-000000000951', 'TP-103', '41000000-0000-0000-0000-000000000951', '42000000-0000-0000-0000-000000000951', '43000000-0000-0000-0000-000000000951', '44000000-0000-0000-0000-000000000951', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-103');
select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-103'), '46000000-0000-0000-0000-000000000951', 'manual', null, 'compose-103');
select lives_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-103'), array['46000000-0000-0000-0000-000000000951']::uuid[], '48000000-0000-0000-0000-000000000951', date '2026-08-13', 'assign-103')$$, 'active line check team can receive an ISO assignment');
select is((select count(*)::int from public.pressure_test_requests where request_type = 'line_check'), 1, 'one durable line check request exists');
select is((select request_number from public.pressure_test_requests where request_type = 'line_check'), 'LC-000001', 'request number is server generated');
select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-103'), array['46000000-0000-0000-0000-000000000951']::uuid[], '48000000-0000-0000-0000-000000000951', date '2026-08-13', 'assign-duplicate-103')$$,
  'PQC99', null, 'duplicate open ISO assignment is rejected');
select lives_ok($$select public.record_line_check_result(
  (select id from public.pressure_test_requests where request_type = 'line_check'),
  '46000000-0000-0000-0000-000000000951', date '2026-08-14',
  jsonb_build_array(jsonb_build_object('punch_code_id', '49000000-0000-0000-0000-000000000951', 'description', 'Support missing', 'checking_date', '2026-08-14')),
  'result-103')$$, 'assigned ISO can receive one result and an X punch atomically');
select is((select count(*)::int from public.line_check_results), 1, 'one line check result is durable');
select is((select count(*)::int from public.punch_items where category = 'X'), 1, 'one Category X punch is durable');
select is((select item_number from public.punch_items limit 1), 'X-000001', 'punch item number is server generated');
reset role;
select is(public.test_pack_composition_is_locked((select id from public.test_packs where test_pack_number = 'TP-103'), '46000000-0000-0000-0000-000000000951'), true, 'Line Check facts lock active composition changes');
set local role authenticated;
select throws_ok($$select public.record_line_check_result(
  (select id from public.pressure_test_requests where request_type = 'line_check'),
  '46000000-0000-0000-0000-000000000951', date '2026-08-14', '[]'::jsonb, 'result-duplicate-103')$$,
  'PQT03', null, 'an ISO result cannot be recorded twice');
select lives_ok($$select public.assign_item_clearance((select id from public.test_packs where test_pack_number = 'TP-103'), array[(select id from public.punch_items limit 1)]::uuid[], '48000000-0000-0000-0000-000000000952', date '2026-08-15', 'clear-assign-103')$$,
  'active finishing team can receive an X clearance assignment');
select lives_ok($$select public.record_punch_clearance((select id from public.pressure_test_requests where request_type = 'item_clearance'), (select id from public.punch_items limit 1), date '2026-08-16', 'clear-result-103')$$,
  'assigned punch can be cleared once');
select throws_ok($$select public.record_punch_clearance((select id from public.pressure_test_requests where request_type = 'item_clearance'), (select id from public.punch_items limit 1), date '2026-08-16', 'clear-duplicate-103')$$,
  '23505', null, 'punch clearance is immutable and unique');
select throws_ok($$insert into public.punch_items(project_id, test_pack_id, isometric_id, punch_code_id, item_number, description, checking_date) values ('30000000-0000-0000-0000-000000000951', (select id from public.test_packs where test_pack_number = 'TP-103'), '46000000-0000-0000-0000-000000000951', '49000000-0000-0000-0000-000000000951', 'DIRECT', 'direct write', current_date)$$,
  '42501', null, 'authenticated users cannot insert punch facts directly');
select is((select count(*)::int from public.pressure_test_request_details where request_type = 'line_check'), 1, 'request details view is available');

reset role;
select * from finish();
rollback;
