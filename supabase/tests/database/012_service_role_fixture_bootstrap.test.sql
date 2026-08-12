begin;

-- Minimal fixture project for the get_project_setup_readiness role-bypass check below. No
-- membership is created: the whole point is that service_role must be able to call this RPC
-- without any project membership, the same way it already bypasses RLS on every table it reads.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('90000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'track12-readiness-fixture@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('90000000-0000-0000-0000-000000000002', 'TRACK12-READINESS-FIXTURE', 'Track 12 readiness fixture', 'Owner', 'Contractor', 1, '90000000-0000-0000-0000-000000000001');

select plan(44);

select ok(has_table_privilege('service_role', 'public.profiles', 'UPDATE'), 'service role can promote local fixture profiles');
select ok(has_table_privilege('service_role', 'public.projects', 'INSERT'), 'service role can create local fixture projects');
select ok(has_table_privilege('service_role', 'public.project_memberships', 'INSERT'), 'service role can create fixture memberships');
select ok(has_table_privilege('service_role', 'public.project_membership_functional_roles', 'INSERT'), 'service role can assign fixture functional roles');
select ok(has_table_privilege('service_role', 'public.project_subcontractors', 'INSERT'), 'service role can create fixture subcontractors');
select ok(has_table_privilege('service_role', 'public.project_pds_areas', 'INSERT'), 'service role can create fixture PDS areas');
select ok(has_table_privilege('service_role', 'public.membership_subcontractor_scopes', 'INSERT'), 'service role can assign subcontractor scope');
select ok(has_table_privilege('service_role', 'public.membership_pds_area_scopes', 'INSERT'), 'service role can assign PDS scope');
select ok(has_table_privilege('service_role', 'public.roles', 'SELECT'), 'service role can read roles for membership validation triggers');
select ok(has_table_privilege('service_role', 'public.project_thickness_flange_rules', 'INSERT'), 'service role can create Track 04 thickness fixtures');
select ok(has_table_privilege('service_role', 'public.nde_matrix_rules', 'INSERT'), 'service role can create Track 04 NDE fixtures');
select ok(has_table_privilege('service_role', 'public.system_film_quantity_rules', 'INSERT'), 'service role can create Track 12 film quantity fixtures');
select ok(has_table_privilege('service_role', 'public.project_units', 'INSERT'), 'service role can create Track 12 unit fixtures');
select ok(has_table_privilege('service_role', 'public.project_area_classifications', 'INSERT'), 'service role can create Track 12 area classification fixtures');
select ok(has_table_privilege('service_role', 'public.project_systems', 'INSERT'), 'service role can create Track 12 system fixtures');
select ok(has_table_privilege('service_role', 'public.project_subsystems', 'INSERT'), 'service role can create Track 12 subsystem fixtures');
select ok(has_table_privilege('service_role', 'public.project_pressure_units', 'INSERT'), 'service role can create Track 12 pressure unit fixtures');
select ok(has_table_privilege('service_role', 'public.project_progress_weights', 'INSERT'), 'service role can create Track 12 progress weight fixtures');
select ok(has_table_privilege('service_role', 'public.project_assembly_settings', 'INSERT'), 'service role can create Track 12 assembly setting fixtures');
select ok(has_table_privilege('service_role', 'public.project_spooling_material_types', 'INSERT'), 'service role can create Track 12 spooling material type fixtures');
select ok(has_table_privilege('service_role', 'public.project_spooling_material_classes', 'INSERT'), 'service role can create Track 12 spooling material class fixtures');
select ok(has_table_privilege('service_role', 'public.project_spooling_checklist_items', 'INSERT'), 'service role can create Track 12 spooling checklist item fixtures');
select ok(has_table_privilege('service_role', 'public.project_devices', 'INSERT'), 'service role can create Track 12 device fixtures');
select ok(has_table_privilege('service_role', 'public.project_device_users', 'INSERT'), 'service role can create Track 12 device assignment fixtures');
select ok(has_table_privilege('service_role', 'public.import_jobs', 'SELECT'), 'service role can read import jobs for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.construction_progress_events', 'SELECT'), 'service role can read construction events for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.material_check_records', 'SELECT'), 'service role can read material check records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.weld_progress_records', 'SELECT'), 'service role can read weld progress records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.pwht_requirements', 'SELECT'), 'service role can read PWHT requirements for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.pwht_results', 'SELECT'), 'service role can read PWHT results for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.paint_progress_records', 'SELECT'), 'service role can read paint progress records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.quality_release_records', 'SELECT'), 'service role can read quality release records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.laydown_records', 'SELECT'), 'service role can read laydown records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.support_progress_records', 'SELECT'), 'service role can read support progress records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.nde_batches', 'SELECT'), 'service role can read NDE batches for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.nde_results', 'SELECT'), 'service role can read NDE results for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.flange_reinstatement_records', 'SELECT'), 'service role can read flange reinstatement records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.line_check_results', 'SELECT'), 'service role can read line check results for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.punch_items', 'SELECT'), 'service role can read punch items for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.blinding_records', 'SELECT'), 'service role can read blinding records for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.pressure_test_requests', 'SELECT'), 'service role can read pressure test requests for Track 12 absence preflight');
select ok(has_table_privilege('service_role', 'public.pressure_test_stage_events', 'SELECT'), 'service role can read pressure test stage events for Track 12 absence preflight');
select ok(has_function_privilege('service_role', 'public.get_project_setup_readiness(uuid)', 'EXECUTE'), 'service role can call get_project_setup_readiness for Track 12 preflight');

set local role service_role;
select lives_ok(
  $$select * from public.get_project_setup_readiness('90000000-0000-0000-0000-000000000002')$$,
  'service role can read project setup readiness for Track 12 preflight without a membership'
);
reset role;

select * from finish();

rollback;
