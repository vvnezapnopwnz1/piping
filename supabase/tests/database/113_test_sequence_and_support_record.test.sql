begin;
select plan(16);

-- Fixture: one project, one admin, a Test Pack whose ISO carries a Y and a Z flange, a spool with
-- two supports, and a second ISO that has no accepted revision.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001131', 'authenticated', 'authenticated', 'sequence.manager@example.test', 'not-used', now(), now(), now()) on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001131', 'SEQUENCE-113', 'Sequence', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001131') on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', '10000000-0000-0000-0000-000000001131', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000001131', 'material_type', 'MAT-113', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description) values ('41000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'SYS-113', 'System');
insert into public.project_subsystems (id, project_id, system_id, code, description) values ('42000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', '41000000-0000-0000-0000-000000001131', 'SUB-113', 'Subsystem');
insert into public.project_service_classes (id, project_id, material_type_id, code, description) values ('43000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', '40000000-0000-0000-0000-000000001131', 'SC-113', 'Service class');
insert into public.project_line_services (id, project_id, code, description) values ('44000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'LS-113', 'Line service');
insert into public.project_pressure_units (project_id, unit) values ('30000000-0000-0000-0000-000000001131', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_teams (id, project_id, team_type, code, description) values
  ('45000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'blinding', 'BL-113', 'Blinding'),
  ('45000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', 'reinstatement', 'RI-113', 'Reinstatement'),
  ('45000000-0000-0000-0000-000000001133', '30000000-0000-0000-0000-000000001131', 'jointer', 'JT-113', 'Jointer');
insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'PDS-113', 'Area 113');

insert into public.isometrics (id, project_id, iso_number)
values ('51000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'ISO-113');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id)
values ('52000000-0000-0000-0000-000000001131', '51000000-0000-0000-0000-000000001131', 'R0', 1, 'accepted', '50000000-0000-0000-0000-000000001131');
insert into public.spools (id, project_id, spool_number)
values ('53000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'SP-113');
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values ('54000000-0000-0000-0000-000000001131', '53000000-0000-0000-0000-000000001131', '52000000-0000-0000-0000-000000001131');

insert into public.flange_joints (id, project_id, flange_number) values
  ('55000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'F-113-Y'),
  ('55000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', 'F-113-Z');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch) values
  ('56000000-0000-0000-0000-000000001131', '55000000-0000-0000-0000-000000001131', '54000000-0000-0000-0000-000000001131', '150#', 6),
  ('56000000-0000-0000-0000-000000001132', '55000000-0000-0000-0000-000000001132', '54000000-0000-0000-0000-000000001131', '150#', 6);
insert into public.system_reference_entries (id, kind, code, description)
values ('57000000-0000-0000-0000-000000001131', 'torquing_requirement', 'TORQUE-113', 'Torque');
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient) values
  ('58000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'Flange before pre-commissioning', 'before_precommissioning', 'Y', 'Reinstatement', 0.5),
  ('58000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', 'Flange after pre-commissioning', 'after_precommissioning', 'Z', 'Reinstatement', 0.5);
insert into public.flange_progress_records (id, project_id, flange_joint_revision_id, joint_category_id, torquing_requirement_id, jointing_method_snapshot, jointing_value, joint_date, report_number, tag_number, source_kind, ut_project_quantity, ut_coefficient_diameter, ut_coefficient_rating, ut_coefficient_punch, calculated_ut, recorded_by) values
  ('59000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', '56000000-0000-0000-0000-000000001131', '58000000-0000-0000-0000-000000001131', '57000000-0000-0000-0000-000000001131', 'TORQUE-113', 100, date '2026-08-01', 'R-113-Y', 'TAG-113-Y', 'manual', 10, 2, 3, 0.5, 30, '10000000-0000-0000-0000-000000001131'),
  ('59000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', '56000000-0000-0000-0000-000000001132', '58000000-0000-0000-0000-000000001132', '57000000-0000-0000-0000-000000001131', 'TORQUE-113', 100, date '2026-08-01', 'R-113-Z', 'TAG-113-Z', 'manual', 10, 2, 3, 0.5, 30, '10000000-0000-0000-0000-000000001131');

insert into public.supports (id, project_id, support_number) values
  ('62000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'S-113-SHOP'),
  ('62000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', 'S-113-SITE');
insert into public.support_revisions (id, support_id, spool_revision_id) values
  ('63000000-0000-0000-0000-000000001131', '62000000-0000-0000-0000-000000001131', '54000000-0000-0000-0000-000000001131'),
  ('63000000-0000-0000-0000-000000001132', '62000000-0000-0000-0000-000000001132', '54000000-0000-0000-0000-000000001131');
insert into public.support_progress_records (project_id, support_revision_id, spool_revision_id, phase, installed_on) values
  ('30000000-0000-0000-0000-000000001131', '63000000-0000-0000-0000-000000001131', '54000000-0000-0000-0000-000000001131', 'fabrication', date '2026-08-02'),
  ('30000000-0000-0000-0000-000000001131', '63000000-0000-0000-0000-000000001132', '54000000-0000-0000-0000-000000001131', 'erection', date '2026-08-20');

-- A second ISO whose only revision was superseded: it has no accepted revision.
insert into public.isometrics (id, project_id, iso_number)
values ('51000000-0000-0000-0000-000000001132', '30000000-0000-0000-0000-000000001131', 'ISO-113-NOREV');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, superseded_at)
values ('52000000-0000-0000-0000-000000001132', '51000000-0000-0000-0000-000000001132', 'R0', 1, 'superseded', '50000000-0000-0000-0000-000000001131', timezone('utc', now()));

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001131', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001131","role":"authenticated"}', true);
set local role authenticated;
select public.create_test_pack('30000000-0000-0000-0000-000000001131', 'TP-113', '41000000-0000-0000-0000-000000001131', '42000000-0000-0000-0000-000000001131', '43000000-0000-0000-0000-000000001131', '44000000-0000-0000-0000-000000001131', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-113');
select public.create_test_pack('30000000-0000-0000-0000-000000001131', 'TP-113-NOREV', '41000000-0000-0000-0000-000000001131', '42000000-0000-0000-0000-000000001131', '43000000-0000-0000-0000-000000001131', '44000000-0000-0000-0000-000000001131', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-113-norev');

reset role;
insert into public.test_pack_isometrics (project_id, test_pack_id, isometric_id, assigned_isometric_revision_id, source_kind) values
  ('30000000-0000-0000-0000-000000001131', (select id from public.test_packs where test_pack_number = 'TP-113'), '51000000-0000-0000-0000-000000001131', '52000000-0000-0000-0000-000000001131', 'manual'),
  ('30000000-0000-0000-0000-000000001131', (select id from public.test_packs where test_pack_number = 'TP-113-NOREV'), '51000000-0000-0000-0000-000000001132', '52000000-0000-0000-0000-000000001132', 'manual');
set local role authenticated;

-- 1. Testing cannot start before blinding.
select throws_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-113'), 'testing_started', date '2026-08-15', 'start-113-no-blinding')$$,
  'PQT09', null, 'testing cannot start before blinding is completed');
select is((select count(*)::int from public.pressure_test_stage_events where test_pack_id = (select id from public.test_packs where test_pack_number = 'TP-113')), 0,
  'the refused start leaves no stage fact');

reset role;
insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('60000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', 'blinding', (select id from public.test_packs where test_pack_number = 'TP-113'), 0, '45000000-0000-0000-0000-000000001131', date '2026-08-13', 'BL-000113', '10000000-0000-0000-0000-000000001131');
insert into public.blinding_request_items (request_id, project_id, test_pack_id)
values ('60000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', (select id from public.test_packs where test_pack_number = 'TP-113'));
insert into public.blinding_records (id, project_id, request_id, test_pack_id, completed_on, recorded_by)
values ('61000000-0000-0000-0000-000000001131', '30000000-0000-0000-0000-000000001131', '60000000-0000-0000-0000-000000001131', (select id from public.test_packs where test_pack_number = 'TP-113'), date '2026-08-14', '10000000-0000-0000-0000-000000001131');
set local role authenticated;

select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-113'), 'testing_started', date '2026-08-15', 'start-113')$$,
  'testing starts once blinding is completed');

-- 2. Y flanges wait for the completed test, Z flanges for completed pre-commissioning.
select throws_ok($$select public.assign_reinstatement((select id from public.test_packs where test_pack_number = 'TP-113'), array['56000000-0000-0000-0000-000000001131'::uuid], '45000000-0000-0000-0000-000000001132', date '2026-08-15', 'y-113-early')$$,
  'PQT17', null, 'a Y flange cannot be reinstated while testing is still running');
select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-113'), 'testing_completed', date '2026-08-16', 'complete-113')$$,
  'testing completes');
select lives_ok($$select public.assign_reinstatement((select id from public.test_packs where test_pack_number = 'TP-113'), array['56000000-0000-0000-0000-000000001131'::uuid], '45000000-0000-0000-0000-000000001132', date '2026-08-16', 'y-113')$$,
  'a Y flange is reinstated after testing is completed');
select throws_ok($$select public.assign_reinstatement((select id from public.test_packs where test_pack_number = 'TP-113'), array['56000000-0000-0000-0000-000000001132'::uuid], '45000000-0000-0000-0000-000000001132', date '2026-08-16', 'z-113-early')$$,
  'PQT18', null, 'a Z flange cannot be reinstated before pre-commissioning is completed');
select throws_ok($$select public.assign_reinstatement((select id from public.test_packs where test_pack_number = 'TP-113'), array['56000000-0000-0000-0000-000000001131'::uuid, '56000000-0000-0000-0000-000000001132'::uuid], '45000000-0000-0000-0000-000000001132', date '2026-08-16', 'yz-113-early')$$,
  'PQT18', null, 'one early Z flange refuses the whole request');
select lives_ok($$select public.record_reinstatement((select id from public.pressure_test_requests where request_type = 'reinstatement' and test_pack_id = (select id from public.test_packs where test_pack_number = 'TP-113')), '56000000-0000-0000-0000-000000001131', date '2026-08-17', 'RI-113-Y', '45000000-0000-0000-0000-000000001133', 'TAG-113-Y', 'y-record-113')$$,
  'the Y reinstatement is recorded');
select lives_ok($$select public.record_pressure_test_stage((select id from public.test_packs where test_pack_number = 'TP-113'), 'precommissioning_completed', date '2026-08-18', 'precomm-113')$$,
  'pre-commissioning completes once every Y flange is back');
select lives_ok($$select public.assign_reinstatement((select id from public.test_packs where test_pack_number = 'TP-113'), array['56000000-0000-0000-0000-000000001132'::uuid], '45000000-0000-0000-0000-000000001132', date '2026-08-18', 'z-113')$$,
  'a Z flange is reinstated after pre-commissioning is completed');

-- 3. A support record is never rewritten by the other phase.
select throws_ok($$select public.record_field_support_progress('63000000-0000-0000-0000-000000001131', date '2026-08-25', 'field-over-shop-113')$$,
  'PQC59', null, 'site cannot overwrite a support the shop recorded');
select is((select phase::text || ' ' || installed_on::text from public.support_progress_records where support_revision_id = '63000000-0000-0000-0000-000000001131'), 'fabrication 2026-08-02',
  'the shop record keeps its phase and date');
select throws_ok($$select public.record_support_progress('63000000-0000-0000-0000-000000001132', date '2026-08-03', 'shop-over-field-113')$$,
  'PQC59', null, 'the shop cannot overwrite a support recorded on site');

-- 4. A member without an accepted revision keeps the pack from RFT, without a null in between.
select is((select is_rft from public.test_pack_readiness where test_pack_number = 'TP-113-NOREV'), false,
  'a pack whose member has no accepted revision is not RFT');
select is((select rft_on from public.test_pack_readiness where test_pack_number = 'TP-113-NOREV'), null::date,
  'a pack that is not RFT has no RFT date');

reset role;
select * from finish();
rollback;
