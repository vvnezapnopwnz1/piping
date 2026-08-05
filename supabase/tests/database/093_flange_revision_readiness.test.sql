begin;
select plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000931', 'authenticated', 'authenticated', 'flange.revision@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000931', 'FLANGE-093', 'Flange revision', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000931')
on conflict (id) do nothing;
insert into public.project_memberships (project_id, user_id, role, access_role_code, is_active)
values ('30000000-0000-0000-0000-000000000931', '10000000-0000-0000-0000-000000000931', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code;
insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'PDS-093', 'Area 093');
insert into public.isometrics (id, project_id, iso_number)
values ('51000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'ISO-093');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id)
values
  ('52000000-0000-0000-0000-000000000931', '51000000-0000-0000-0000-000000000931', 'R0', 1, 'superseded', '50000000-0000-0000-0000-000000000931'),
  ('52000000-0000-0000-0000-000000000932', '51000000-0000-0000-0000-000000000931', 'R1', 2, 'accepted', '50000000-0000-0000-0000-000000000931');
insert into public.spools (id, project_id, spool_number)
values ('53000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'SP-093');
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values
  ('54000000-0000-0000-0000-000000000931', '53000000-0000-0000-0000-000000000931', '52000000-0000-0000-0000-000000000931'),
  ('54000000-0000-0000-0000-000000000932', '53000000-0000-0000-0000-000000000931', '52000000-0000-0000-0000-000000000932');
insert into public.flange_joints (id, project_id, flange_number)
values ('55000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'F-093');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id, flange_rating, diameter_inch)
values
  ('56000000-0000-0000-0000-000000000931', '55000000-0000-0000-0000-000000000931', '54000000-0000-0000-0000-000000000931', '150#', 6),
  ('56000000-0000-0000-0000-000000000932', '55000000-0000-0000-0000-000000000931', '54000000-0000-0000-0000-000000000932', '150#', 6);
insert into public.system_reference_entries (id, kind, code, description)
values ('57000000-0000-0000-0000-000000000931', 'torquing_requirement', 'TORQUE-093', 'Torque');
insert into public.project_joint_categories (id, project_id, joint_definition, timing, category_code, reason, coefficient)
values ('59000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'Flange', 'before_pressure_test', 'Y', 'Reinstatement', 0.5);
insert into public.project_unit_time_references (id, project_id, activity, project_ut, standard_reference)
values ('5a000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'FLANGE_JOINTING', 10, 'STD-093');
insert into public.project_teams (id, project_id, team_type, code, description)
values ('5b000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931', 'jointer', 'J-093', 'Jointer 093');
insert into public.flange_progress_records (
  id, project_id, flange_joint_revision_id, joint_category_id, torquing_requirement_id,
  jointing_method_snapshot, jointing_value, joint_date, report_number, tag_number,
  source_kind, ut_project_quantity, ut_coefficient_diameter, ut_coefficient_rating,
  ut_coefficient_punch, calculated_ut, recorded_by
) values (
  '5c000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931',
  '56000000-0000-0000-0000-000000000931', '59000000-0000-0000-0000-000000000931',
  '57000000-0000-0000-0000-000000000931', 'TORQUE-093', 100, current_date - 1,
  'R-093', 'TAG-093', 'manual', 10, 2, 3, 0.5, 30,
  '10000000-0000-0000-0000-000000000931'
);
insert into public.flange_jointer_assignments (progress_record_id, jointer_team_id, jointer_code_snapshot, jointer_name_snapshot)
select '5c000000-0000-0000-0000-000000000931', id, code, description
from public.project_teams where id = '5b000000-0000-0000-0000-000000000931';
insert into public.revision_change_items (
  id, project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
  entity_type, entity_id, entity_key, change_type
) values (
  '5d000000-0000-0000-0000-000000000931', '30000000-0000-0000-0000-000000000931',
  '51000000-0000-0000-0000-000000000931', '52000000-0000-0000-0000-000000000932',
  '52000000-0000-0000-0000-000000000931', 'flange_joint',
  '55000000-0000-0000-0000-000000000931', 'F-093', 'unchanged'
);
insert into public.revision_decisions (change_item_id, decision, decided_by)
values ('5d000000-0000-0000-0000-000000000931', 'done_without_modification', '10000000-0000-0000-0000-000000000931');
insert into public.revision_progress_copies (change_item_id, source_spool_revision_id, target_spool_revision_id, progress_kind, copied_by)
values ('5d000000-0000-0000-0000-000000000931', '54000000-0000-0000-0000-000000000931', '54000000-0000-0000-0000-000000000932', 'flange_progress', '10000000-0000-0000-0000-000000000931');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000931', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000931","role":"authenticated"}', true);
set local role authenticated;

select has_column('public', 'revision_progress_copies', 'progress_kind', 'revision copies retain a kind discriminator');
select lives_ok($$select public.materialize_flange_progress_copies('30000000-0000-0000-0000-000000000931', 'flange-copy-093')$$, 'authorized flange progress copy materializes');
select is((select count(*)::int from public.flange_progress_records where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 1, 'target revision receives one copied record');
select is((select source_kind::text from public.flange_progress_records where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 'revision_copy', 'copy is marked as revision copy');
select is((select calculated_ut from public.flange_progress_records where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 30::numeric, 'copy retains the original UT snapshot');
select is((select copied_payload ->> 'materialized' from public.revision_progress_copies limit 1), 'true', 'copy authorization is marked materialized');
select lives_ok($$select public.materialize_flange_progress_copies('30000000-0000-0000-0000-000000000931', 'flange-copy-093')$$, 'materialization is idempotent');
select is((select count(*)::int from public.flange_progress_records where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 1, 'idempotent materialization does not duplicate');
select has_view('public', 'flange_joint_readiness', 'flange readiness view is published');
select is((select progress_state from public.flange_joint_readiness where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 'completed', 'readiness is complete for the current revision');
select is((select requires_reinstatement from public.flange_joint_readiness where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), true, 'Y category requires reinstatement');
select is((select timing from public.flange_joint_readiness where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 'before_pressure_test', 'readiness exposes category timing');
select is((select reason from public.flange_joint_readiness where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 'Reinstatement', 'readiness exposes category reason');
select is((select calculated_ut from public.flange_joint_readiness where flange_joint_revision_id = '56000000-0000-0000-0000-000000000932'), 30::numeric, 'readiness exposes calculated UT');
select lives_ok(
  $$select public.create_manual_revision('51000000-0000-0000-0000-000000000931', 'R2', 'carry flange progress', '[{"entity_type":"spool","entity_key":"SP-093","decision":"done_without_modification"}]'::jsonb)$$,
  'manual revision acceptance authorizes a flange progress copy');
select is((select count(*)::int from public.revision_progress_copies where progress_kind = 'flange_progress'), 2, 'manual revision adds one flange progress authorization');

select * from finish();
rollback;
