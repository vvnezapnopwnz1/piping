begin;
select plan(45);

-- 1. Schema checks for spool readiness blockers in fabrication_spool_projections and spool_erection_readiness
select has_column('public', 'fabrication_spool_projections', 'release_blockers', 'fabrication_spool_projections stores release_blockers');
select has_column('public', 'fabrication_spool_projections', 'rft_blockers', 'fabrication_spool_projections stores rft_blockers');
select has_column('public', 'spool_erection_readiness', 'rft_blockers', 'spool_erection_readiness view exposes rft_blockers');

-- 2. Schema checks for test_pack_workflow view
select has_view('public', 'test_pack_workflow', 'test_pack_workflow projection exists');
select has_column('public', 'test_pack_workflow', 'test_pack_id', 'test_pack_workflow has test_pack_id');
select has_column('public', 'test_pack_workflow', 'canonical_state', 'test_pack_workflow has canonical_state');
select has_column('public', 'test_pack_workflow', 'rft_state', 'test_pack_workflow has rft_state');
select has_column('public', 'test_pack_workflow', 'blinding_state', 'test_pack_workflow has blinding_state');
select has_column('public', 'test_pack_workflow', 'testing_state', 'test_pack_workflow has testing_state');
select has_column('public', 'test_pack_workflow', 'y_state', 'test_pack_workflow has y_state');
select has_column('public', 'test_pack_workflow', 'precomm_state', 'test_pack_workflow has precomm_state');
select has_column('public', 'test_pack_workflow', 'z_state', 'test_pack_workflow has z_state');
select has_column('public', 'test_pack_workflow', 'blockers', 'test_pack_workflow has blockers');
select has_column('public', 'test_pack_workflow', 'available_operations', 'test_pack_workflow has available_operations');

-- 3. Behavioral checks for Test Pack Workflow
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000117', 'authenticated', 'authenticated', 'workflow.tester@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000117', 'WORKFLOW-117', 'Workflow 117', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000117')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', '10000000-0000-0000-0000-000000000117', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000117', 'material_type', 'MAT-117', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description) values ('41000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'SYS-117', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description) values ('42000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', '41000000-0000-0000-0000-000000000117', 'SUB-117', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description) values ('43000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', '40000000-0000-0000-0000-000000000117', 'SC-117', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description) values ('44000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'LS-117', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit) values ('30000000-0000-0000-0000-000000000117', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description) values ('45000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'PDS-117', 'Area') on conflict (id) do nothing;
insert into public.isometrics (id, project_id, iso_number) values ('46000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'ISO-117') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000117', '46000000-0000-0000-0000-000000000117', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000000117', '43000000-0000-0000-0000-000000000117') on conflict (id) do nothing;

insert into public.spools (id, project_id, spool_number) values ('48000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'SP-117');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number) values ('49000000-0000-0000-0000-000000000117', '48000000-0000-0000-0000-000000000117', '47000000-0000-0000-0000-000000000117', 1);

insert into public.project_teams (id, project_id, team_type, code, description)
values
  ('48100000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'line_check', 'LC-117', 'Line Check'),
  ('48200000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'blinding', 'BL-117', 'Blinding'),
  ('48300000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'jointer', 'JT-117', 'Jointer')
on conflict (id) do nothing;

-- Recompute projections for SP-117
select public.recompute_fabrication_spool_projection('49000000-0000-0000-0000-000000000117');
select public.recompute_erection_spool_projection('49000000-0000-0000-0000-000000000117');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000117', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000117","role":"authenticated"}', true);
set local role authenticated;

-- Check spool blockers in fabrication_spool_projections
select is(
  (select is_releasable from public.fabrication_spool_projections where spool_revision_id = '49000000-0000-0000-0000-000000000117'),
  false,
  'empty spool is not releasable'
);

select is(
  (select jsonb_path_exists(release_blockers, '$[*] ? (@.code == "material_incomplete")')
   from public.fabrication_spool_projections where spool_revision_id = '49000000-0000-0000-0000-000000000117'),
  true,
  'spool release_blockers contains material_incomplete reason code'
);

select is(
  (select is_rft from public.fabrication_spool_projections where spool_revision_id = '49000000-0000-0000-0000-000000000117'),
  false,
  'unerected spool is not RFT'
);

select is(
  (select jsonb_path_exists(rft_blockers, '$[*] ? (@.kind == "welded_bolted")')
   from public.fabrication_spool_projections where spool_revision_id = '49000000-0000-0000-0000-000000000117'),
  true,
  'spool rft_blockers contains welded_bolted shortfall code'
);

select is(
  (select jsonb_path_exists(rft_blockers, '$[*] ? (@.kind == "supported")')
   from public.spool_erection_readiness where spool_revision_id = '49000000-0000-0000-0000-000000000117'),
  true,
  'spool_erection_readiness exposes rft_blockers with supported code'
);

-- Check Test Pack Workflow
select public.create_test_pack('30000000-0000-0000-0000-000000000117', 'TP-117', '41000000-0000-0000-0000-000000000117', '42000000-0000-0000-0000-000000000117', '43000000-0000-0000-0000-000000000117', '44000000-0000-0000-0000-000000000117', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-117');

select is(
  (select canonical_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'awaiting_rft',
  'a new test pack without completed members is in canonical awaiting_rft'
);

select is(
  (select rft_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'blocked',
  'new test pack rft_state is blocked'
);

select is(
  (select blinding_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'blocked',
  'blinding is blocked while pack is not RFT'
);

select is(
  (select blockers -> 'blinding' from public.test_pack_workflow where test_pack_number = 'TP-117'),
  '["rft_pending"]'::jsonb,
  'server provides rft_pending reason code for blocked blinding'
);

-- 4. Check consistency: readiness views return verdict/blockers directly matching stored projection
select results_eq(
  'select is_releasable, release_blockers from public.spool_fabrication_readiness where spool_revision_id = ''49000000-0000-0000-0000-000000000117''',
  'select is_releasable, release_blockers from public.fabrication_spool_projections where spool_revision_id = ''49000000-0000-0000-0000-000000000117''',
  'spool_fabrication_readiness verdict and blockers match stored projection'
);

select results_eq(
  'select is_rft, rft_blockers from public.spool_erection_readiness where spool_revision_id = ''49000000-0000-0000-0000-000000000117''',
  'select is_rft, rft_blockers from public.fabrication_spool_projections where spool_revision_id = ''49000000-0000-0000-0000-000000000117''',
  'spool_erection_readiness verdict and blockers match stored projection'
);

-- 5. Full test_pack_workflow lifecycle: testing -> Y -> precommissioning -> Z/complete
-- Stage 2: Pack with RFT member and blinding
reset role;
select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-117'), '46000000-0000-0000-0000-000000000117', 'manual', null, 'compose-117');

-- Complete line check for ISO-117 so ISO-117 is RFT
insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('59000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'line_check', (select id from public.test_packs where test_pack_number = 'TP-117'), 0, '48100000-0000-0000-0000-000000000117', date '2026-08-01', 'LC-000117', '10000000-0000-0000-0000-000000000117');
insert into public.line_check_request_items (request_id, project_id, test_pack_id, isometric_id)
values ('59000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), '46000000-0000-0000-0000-000000000117');
insert into public.line_check_results (project_id, request_id, test_pack_id, isometric_id, completed_on, recorded_by)
values ('30000000-0000-0000-0000-000000000117', '59000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), '46000000-0000-0000-0000-000000000117', date '2026-08-01', '10000000-0000-0000-0000-000000000117');

-- Insert erection stage events so SP-117 achieves RFT
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on, payload, source)
values
  ('30000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', 'erection', 'to_site', date '2026-08-01', '{}'::jsonb, 'manual'),
  ('30000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', 'erection', 'erected', date '2026-08-01', '{}'::jsonb, 'manual'),
  ('30000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', 'erection', 'welded_bolted', date '2026-08-01', '{}'::jsonb, 'manual'),
  ('30000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', 'erection', 'supported', date '2026-08-01', '{}'::jsonb, 'manual');

-- Set projection to releasable
update public.fabrication_spool_projections
set is_releasable = true, release_blockers = '[]'::jsonb
where spool_revision_id = '49000000-0000-0000-0000-000000000117';
set local role authenticated;

select is(
  (select rft_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'completed',
  'test_pack_workflow rft_state is completed when members are RFT'
);

select is(
  (select blinding_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ready',
  'test_pack_workflow blinding_state is ready once RFT'
);

select is(
  (select 'blinding' = any(available_operations) from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'blinding is in available_operations when ready'
);

-- Complete blinding
reset role;
insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('60000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'blinding', (select id from public.test_packs where test_pack_number = 'TP-117'), 0, '48200000-0000-0000-0000-000000000117', date '2026-08-01', 'BL-000117', '10000000-0000-0000-0000-000000000117');

insert into public.blinding_records (project_id, request_id, test_pack_id, completed_on, recorded_by)
values ('30000000-0000-0000-0000-000000000117', '60000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), date '2026-08-02', '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select blinding_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'completed',
  'test_pack_workflow blinding_state is completed'
);

select is(
  (select testing_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ready',
  'test_pack_workflow testing_state is ready'
);

select is(
  (select 'testing' = any(available_operations) and 'testing_start' = any(available_operations)
   from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'testing and testing_start are in available_operations when testing is ready'
);

-- Start testing
reset role;
insert into public.pressure_test_stage_events (project_id, test_pack_id, stage, occurred_on, recorded_by)
values ('30000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), 'testing_started', date '2026-08-03', '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select testing_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ongoing',
  'test_pack_workflow testing_state is ongoing after testing_started'
);

select is(
  (select 'testing' = any(available_operations) and 'testing_complete' = any(available_operations)
   from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'testing and testing_complete are in available_operations when testing is ongoing'
);

-- Complete testing and insert Y flange requirement
reset role;
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient)
values
  ('58000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'Flange', 'before_precommissioning', 'Y', 'Reinstatement', 0.5),
  ('58100000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'Flange', 'after_precommissioning', 'Z', 'Reinstatement', 0.5)
on conflict (id) do nothing;

insert into public.system_reference_entries (id, kind, code, description)
values ('57000000-0000-0000-0000-000000000117', 'torquing_requirement', 'TORQUE-117', 'Torque')
on conflict (id) do nothing;

insert into public.pressure_test_stage_events (project_id, test_pack_id, stage, occurred_on, recorded_by)
values ('30000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), 'testing_completed', date '2026-08-04', '10000000-0000-0000-0000-000000000117');

insert into public.flange_joints (id, project_id, flange_number)
values ('51000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'FJ-Y-117');

insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch)
values ('52000000-0000-0000-0000-000000000117', '51000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', '150#', 6);

insert into public.flange_progress_records (id, project_id, flange_joint_revision_id, joint_category_id, torquing_requirement_id, jointing_method_snapshot, jointing_value, joint_date, report_number, tag_number, source_kind, ut_project_quantity, ut_coefficient_diameter, ut_coefficient_rating, ut_coefficient_punch, calculated_ut, recorded_by)
values ('59100000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', '52000000-0000-0000-0000-000000000117', '58000000-0000-0000-0000-000000000117', '57000000-0000-0000-0000-000000000117', 'TORQUE-117', 100, date '2026-08-04', 'R-117-Y', 'TAG-117-Y', 'manual', 10, 2, 3, 0.5, 30, '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select y_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ready',
  'y_state is ready after testing completed with Y requirement'
);

select is(
  (select precomm_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'blocked',
  'precomm_state is blocked while Y reinstatement is pending'
);

select is(
  (select 'y_reinstatement' = any(available_operations) from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'y_reinstatement is in available_operations'
);

-- Complete Y reinstatement
reset role;
insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('61000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'reinstatement', (select id from public.test_packs where test_pack_number = 'TP-117'), 0, '48300000-0000-0000-0000-000000000117', date '2026-08-04', 'RN-000117', '10000000-0000-0000-0000-000000000117');

insert into public.flange_reinstatement_records (project_id, request_id, flange_joint_revision_id, category_snapshot, timing_snapshot, joint_date, report_number, jointer_team_id, tag_number, recorded_by)
values ('30000000-0000-0000-0000-000000000117', '61000000-0000-0000-0000-000000000117', '52000000-0000-0000-0000-000000000117', 'Y', 'before_precommissioning', date '2026-08-05', 'REP-Y', '48300000-0000-0000-0000-000000000117', 'TAG-Y', '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select y_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'completed',
  'y_state is completed'
);

select is(
  (select precomm_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ready',
  'precomm_state is ready once Y is completed'
);

select is(
  (select 'precommissioning' = any(available_operations) from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'precommissioning is in available_operations'
);

-- Complete precommissioning and add Z flange
reset role;
insert into public.pressure_test_stage_events (project_id, test_pack_id, stage, occurred_on, recorded_by)
values ('30000000-0000-0000-0000-000000000117', (select id from public.test_packs where test_pack_number = 'TP-117'), 'precommissioning_completed', date '2026-08-06', '10000000-0000-0000-0000-000000000117');

insert into public.flange_joints (id, project_id, flange_number)
values ('53000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'FJ-Z-117');

insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch)
values ('54000000-0000-0000-0000-000000000117', '53000000-0000-0000-0000-000000000117', '49000000-0000-0000-0000-000000000117', '150#', 6);

insert into public.flange_progress_records (id, project_id, flange_joint_revision_id, joint_category_id, torquing_requirement_id, jointing_method_snapshot, jointing_value, joint_date, report_number, tag_number, source_kind, ut_project_quantity, ut_coefficient_diameter, ut_coefficient_rating, ut_coefficient_punch, calculated_ut, recorded_by)
values ('59200000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', '54000000-0000-0000-0000-000000000117', '58100000-0000-0000-0000-000000000117', '57000000-0000-0000-0000-000000000117', 'TORQUE-117', 100, date '2026-08-06', 'R-117-Z', 'TAG-117-Z', 'manual', 10, 2, 3, 0.5, 30, '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select z_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'ready',
  'z_state is ready after precommissioning with Z requirement'
);

select is(
  (select 'z_reinstatement' = any(available_operations) from public.test_pack_workflow where test_pack_number = 'TP-117'),
  true,
  'z_reinstatement is in available_operations'
);

-- Complete Z reinstatement
reset role;
insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('62000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000117', 'reinstatement', (select id from public.test_packs where test_pack_number = 'TP-117'), 0, '48300000-0000-0000-0000-000000000117', date '2026-08-06', 'RN-000118', '10000000-0000-0000-0000-000000000117');

insert into public.flange_reinstatement_records (project_id, request_id, flange_joint_revision_id, category_snapshot, timing_snapshot, joint_date, report_number, jointer_team_id, tag_number, recorded_by)
values ('30000000-0000-0000-0000-000000000117', '62000000-0000-0000-0000-000000000117', '54000000-0000-0000-0000-000000000117', 'Z', 'after_precommissioning', date '2026-08-07', 'REP-Z', '48300000-0000-0000-0000-000000000117', 'TAG-Z', '10000000-0000-0000-0000-000000000117');
set local role authenticated;

select is(
  (select z_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'completed',
  'z_state is completed'
);

select is(
  (select canonical_state from public.test_pack_workflow where test_pack_number = 'TP-117'),
  'complete',
  'canonical_state is complete when all stages are completed'
);

-- 6. Check RLS on fabrication_spool_projections for user outside PDS scope
reset role;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000118', 'authenticated', 'authenticated', 'outside.scope@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000117', '10000000-0000-0000-0000-000000000118', 'subcontractor', 'subcontractor', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

-- Scope this subcontractor to a different PDS area
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000000999', '30000000-0000-0000-0000-000000000117', 'PDS-OTHER', 'Other Area')
on conflict (id) do nothing;

insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('20000000-0000-0000-0000-000000000118', '45000000-0000-0000-0000-000000000999')
on conflict do nothing;

insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000118', 'fabrication_contributor')
on conflict do nothing;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000118', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000118","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.fabrication_spool_projections where project_id = '30000000-0000-0000-0000-000000000117'),
  0,
  'user outside PDS scope sees 0 rows in fabrication_spool_projections'
);

select is(
  (select count(*)::int from public.spool_fabrication_readiness where project_id = '30000000-0000-0000-0000-000000000117'),
  0,
  'user outside PDS scope sees 0 rows in spool_fabrication_readiness'
);

reset role;
select * from finish();
rollback;
