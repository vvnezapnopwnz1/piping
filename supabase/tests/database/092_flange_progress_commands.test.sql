begin;
select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000921', 'authenticated', 'authenticated', 'flange.manager@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000922', 'authenticated', 'authenticated', 'flange.reader@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000921', 'FLANGE-092', 'Flange progress', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000921')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', '10000000-0000-0000-0000-000000000921', 'qc_engineer', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000922', '30000000-0000-0000-0000-000000000921', '10000000-0000-0000-0000-000000000922', 'qc_engineer', 'project_reader', true)
on conflict (project_id, user_id) do update
set access_role_code = excluded.access_role_code, role = excluded.role, is_active = excluded.is_active;

insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'PDS-092', 'Area 092');
insert into public.isometrics (id, project_id, iso_number)
values ('51000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'ISO-092');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id)
values ('52000000-0000-0000-0000-000000000921', '51000000-0000-0000-0000-000000000921', 'R0', 1, 'accepted', '50000000-0000-0000-0000-000000000921');
insert into public.spools (id, project_id, spool_number)
values ('53000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'SP-092');
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values ('54000000-0000-0000-0000-000000000921', '53000000-0000-0000-0000-000000000921', '52000000-0000-0000-0000-000000000921');
insert into public.flange_joints (id, project_id, flange_number)
values ('55000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'F-092');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch)
values ('56000000-0000-0000-0000-000000000921', '55000000-0000-0000-0000-000000000921', '54000000-0000-0000-0000-000000000921', '150#', 6);
insert into public.flange_joints (id, project_id, flange_number)
values ('55000000-0000-0000-0000-000000000922', '30000000-0000-0000-0000-000000000921', 'F-092-B');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch)
values ('56000000-0000-0000-0000-000000000922', '55000000-0000-0000-0000-000000000922', '54000000-0000-0000-0000-000000000921', '300#', 6);

insert into public.system_reference_entries (id, kind, code, description)
values ('57000000-0000-0000-0000-000000000921', 'torquing_requirement', 'TORQUE-092', 'Torque 150#');
insert into public.system_ut_calculation_rules (id, diameter_from_inch, diameter_to_inch, flange_rating, coefficient_diameter, coefficient_rating)
values ('58000000-0000-0000-0000-000000000921', 2, 8, '150#', 2, 3);
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient)
values ('59000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'Flange', 'before_pressure_test', 'FC-092', 'Normal', 0.5);
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient)
values ('59000000-0000-0000-0000-000000000922', '30000000-0000-0000-0000-000000000921', 'Flange', 'before_pressure_test', 'FC-092-B', 'No UT coefficient', null);
insert into public.project_unit_time_references (id, project_id, activity, project_ut, standard_reference)
values ('5a000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'FLANGE_JOINTING', 10, 'STD-092');
insert into public.project_teams (id, project_id, team_type, code, description)
values
  ('5b000000-0000-0000-0000-000000000921', '30000000-0000-0000-0000-000000000921', 'jointer', 'J-01', 'Jointer one'),
  ('5b000000-0000-0000-0000-000000000922', '30000000-0000-0000-0000-000000000921', 'jointer', 'J-02', 'Jointer two');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000922', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000922","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 120, current_date - 1, 'R-0', 'TAG-0', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'reader-1')$$,
  'PQC70', null, 'reader without flange.manage is refused');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000921', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000921","role":"authenticated"}', true);
select lives_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 120, current_date - 1, 'R-0', 'TAG-0', array['5b000000-0000-0000-0000-000000000921','5b000000-0000-0000-0000-000000000922']::uuid[], 'manual-1')$$,
  'manager can record flange progress with two jointers');
select is((select count(*)::int from public.flange_progress_records), 1, 'one effective progress row was written');
select is((select calculated_ut from public.flange_progress_records limit 1), 30::numeric, 'UT is snapshotted from project quantity, rating and category coefficient');
select is((select ut_formula_version from public.flange_progress_records limit 1), 'flange-ut-v1', 'UT formula version is durable');
select is((select count(*)::int from public.flange_jointer_assignments), 2, 'both jointers are snapshotted');
reset role;
select is((select count(*)::int from public.audit_events where action = 'record_flange_progress'), 1, 'audit event is durable');
select is((select count(*)::int from public.command_receipts where command_name = 'record_flange_progress' and completed_at is not null), 1, 'command receipt is completed');
set local role authenticated;
select lives_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 120, current_date - 1, 'R-0', 'TAG-0', array['5b000000-0000-0000-0000-000000000921','5b000000-0000-0000-0000-000000000922']::uuid[], 'manual-1')$$,
  'same idempotency key returns the completed command');
select throws_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 121, current_date - 1, 'R-1', 'TAG-1', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-2')$$,
  'PQC76', null, 'second effective record needs a correction reference');
select lives_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 130, current_date - 1, 'R-1', 'TAG-1', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-3', (select id from public.flange_progress_records limit 1))$$,
  'correction appends a new row');
select is((select count(*)::int from public.flange_progress_records), 2, 'correction preserves history');
select is((select count(*)::int from public.flange_progress_records where superseded_at is null), 1, 'correction leaves one effective row');
select throws_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 140, current_date - 1, 'R-2', 'TAG-2', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-4', (select id from public.flange_progress_records where superseded_at is not null limit 1))$$,
  'PQC76', null, 'stale correction cannot replace superseded history');
select throws_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 0, current_date - 1, 'R-3', 'TAG-3', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-5')$$,
  'PQC74', null, 'non-positive jointing value is refused');
select throws_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000921', '59000000-0000-0000-0000-000000000921', '57000000-0000-0000-0000-000000000921', 140, current_date - 1, 'R-4', 'TAG-4', array['5b000000-0000-0000-0000-000000000921','5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-6')$$,
  'PQC75', null, 'duplicate jointer is refused');
select lives_ok(
  $$select public.record_flange_progress('30000000-0000-0000-0000-000000000921', '56000000-0000-0000-0000-000000000922', '59000000-0000-0000-0000-000000000922', '57000000-0000-0000-0000-000000000921', 140, current_date - 1, 'R-5', 'TAG-5', array['5b000000-0000-0000-0000-000000000921']::uuid[], 'manual-7')$$,
  'missing UT coefficient remains recordable');
select is((select calculated_ut from public.flange_progress_records where flange_joint_revision_id = '56000000-0000-0000-0000-000000000922'), null::numeric, 'missing UT configuration produces null snapshot');

reset role;
select * from finish();
rollback;
