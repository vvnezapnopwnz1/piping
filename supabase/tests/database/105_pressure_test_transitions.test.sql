begin;
select plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000971', 'authenticated', 'authenticated', 'workflow.manager@example.test', 'not-used', now(), now(), now()) on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000971', 'WORKFLOW-105', 'Workflow', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000971') on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', '10000000-0000-0000-0000-000000000971', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000971', 'material_type', 'MAT-105', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description) values ('41000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', 'SYS-105', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description) values ('42000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', '41000000-0000-0000-0000-000000000971', 'SUB-105', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description) values ('43000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', '40000000-0000-0000-0000-000000000971', 'SC-105', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description) values ('44000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', 'LS-105', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit) values ('30000000-0000-0000-0000-000000000971', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_teams (id, project_id, team_type, code, description) values ('45000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', 'blinding', 'BL-105', 'Blinding') on conflict (id) do nothing;

select has_table('public', 'pressure_test_stage_events', 'pressure test stage event table exists');
select has_table('public', 'blinding_records', 'blinding result table exists');
select has_table('public', 'flange_reinstatement_records', 'reinstatement result table exists');
select has_function('public', 'assign_blinding', array['uuid','uuid','date','text'], 'blinding assignment RPC exists');
select has_function('public', 'record_pressure_test_stage', array['uuid','text','date','text'], 'stage transition RPC exists');
select has_function('public', 'assign_reinstatement', array['uuid','uuid[]','uuid','date','text'], 'reinstatement assignment RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000971', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000971","role":"authenticated"}', true);
set local role authenticated;
select public.create_test_pack('30000000-0000-0000-0000-000000000971', 'TP-105', '41000000-0000-0000-0000-000000000971', '42000000-0000-0000-0000-000000000971', '43000000-0000-0000-0000-000000000971', '44000000-0000-0000-0000-000000000971', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-105');
select throws_ok($$select public.assign_blinding((select id from public.test_packs where test_pack_number = 'TP-105'), '45000000-0000-0000-0000-000000000971', date '2026-08-13', 'blind-before-rft')$$,
  'PQT06', null, 'blinding before RFT is rejected');

reset role;
insert into public.pressure_test_requests(id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('46000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', 'blinding', (select id from public.test_packs where test_pack_number = 'TP-105'), 0, '45000000-0000-0000-0000-000000000971', date '2026-08-13', 'BL-000001', '10000000-0000-0000-0000-000000000971');
insert into public.blinding_request_items(request_id, project_id, test_pack_id) values ('46000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', (select id from public.test_packs where test_pack_number = 'TP-105'));
insert into public.blinding_records(id, project_id, request_id, test_pack_id, completed_on, recorded_by)
values ('47000000-0000-0000-0000-000000000971', '30000000-0000-0000-0000-000000000971', '46000000-0000-0000-0000-000000000971', (select id from public.test_packs where test_pack_number = 'TP-105'), date '2026-08-14', '10000000-0000-0000-0000-000000000971');
set local role authenticated;
select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-105'), 'testing_started', date '2026-08-15', 'start-105')$$, 'testing starts after blinding');
select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-105'), 'testing_completed', date '2026-08-16', 'complete-105')$$, 'testing completes after start');
select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-105'), 'precommissioning_completed', date '2026-08-17', 'precomm-105')$$, 'precommissioning completes after testing');
select is((select count(*)::int from public.pressure_test_stage_events where test_pack_id = (select id from public.test_packs where test_pack_number = 'TP-105')), 3, 'stage events are append-only facts');
select throws_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-105'), 'testing_started', date '2026-08-14', 'start-too-early-105')$$,
  'PQT12', null, 'stage dates cannot move backwards');
select throws_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-105'), 'testing_completed', date '2026-08-18', 'complete-duplicate-105')$$,
  '23505', null, 'a stage cannot be recorded twice');
select throws_ok($$insert into public.pressure_test_stage_events(project_id, test_pack_id, stage, occurred_on) values ('30000000-0000-0000-0000-000000000971', (select id from public.test_packs where test_pack_number = 'TP-105'), 'testing_started', current_date)$$,
  '42501', null, 'authenticated users cannot mutate stage facts directly');
select is((select count(*)::int from public.testing_precomm_worklist where test_pack_id = (select id from public.test_packs where test_pack_number = 'TP-105')), 1, 'testing/precommissioning worklist is available');
select is((select has_table_privilege('authenticated', 'public.pressure_test_stage_events', 'INSERT')), false, 'stage facts expose SELECT only');

reset role;
select * from finish();
rollback;
