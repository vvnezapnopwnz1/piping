begin;
select plan(8);

select has_function('public', 'record_weld_progress',
  array['construction_phase', 'uuid', 'uuid', 'uuid', 'jsonb', 'jsonb', 'text'],
  'phase-aware weld progress RPC exists');
select ok(
  position('PQC51' in pg_get_functiondef(
    'public.record_weld_progress(public.construction_phase, uuid, uuid, uuid, jsonb, jsonb, text)'::regprocedure
  )) > 0,
  'the weld command contains a wrong-phase guard'
);
select ok(
  position('ctx.weld_location' in pg_get_functiondef(
    'public.record_weld_progress(public.construction_phase, uuid, uuid, uuid, jsonb, jsonb, text)'::regprocedure
  )) > 0,
  'the weld command checks the joint location'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000731', 'authenticated', 'authenticated',
        'field.weld@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000731';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000731', 'WELD-07', 'Field weld parity', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000731');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'PDS-07', 'Track 07 PDS');
insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'SUB-07', 'Field subcontractor');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000731', 'material_type', 'CS-07', 'Carbon steel 07')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731',
        '53000000-0000-0000-0000-000000000731', 'SC-07', 'Service class 07');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'BW-07', 'Butt weld 07');
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'CS-07', 'Carbon steel 07');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'A7',
        '54000000-0000-0000-0000-000000000731');
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values ('56000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731',
        '50000000-0000-0000-0000-000000000731', '53000000-0000-0000-0000-000000000731',
        'WPS-07', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on
)
values
  ('57000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731',
   '50000000-0000-0000-0000-000000000731', 'WF-ROOT', 'Field root', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000732', '30000000-0000-0000-0000-000000000731',
   '50000000-0000-0000-0000-000000000731', 'WF-CAP', 'Field cap', date '2027-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000731', '56000000-0000-0000-0000-000000000731'),
  ('57000000-0000-0000-0000-000000000732', '56000000-0000-0000-0000-000000000731');
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required
)
values ('58000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731',
        '51000000-0000-0000-0000-000000000731', '52000000-0000-0000-0000-000000000731',
        'field', 100, 10, false);
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'ISO-07-F');
insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, pds_area_id,
  service_class_id, accepted_at
)
values ('42000000-0000-0000-0000-000000000731', '40000000-0000-0000-0000-000000000731', 'R0', 1,
        'accepted', '31000000-0000-0000-0000-000000000731',
        '51000000-0000-0000-0000-000000000731', now());
insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'SP-07-F');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000731', '41000000-0000-0000-0000-000000000731',
        '42000000-0000-0000-0000-000000000731', 1, 'A7');
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000731', '30000000-0000-0000-0000-000000000731', 'WF-07');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm
)
values ('47000000-0000-0000-0000-000000000731', '46000000-0000-0000-0000-000000000731',
        '43000000-0000-0000-0000-000000000731', '52000000-0000-0000-0000-000000000731',
        'field', 6, 8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000731', '47000000-0000-0000-0000-000000000731', 'root', 1),
  ('48000000-0000-0000-0000-000000000732', '47000000-0000-0000-0000-000000000731', 'cap', 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000731', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000731","role":"authenticated"}', true);
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000731', 'fabrication', 'start_fab', date '2026-08-10', '{}'::jsonb, 'field-fab');
select public.record_erection_progress(
  '43000000-0000-0000-0000-000000000731', 'to_site', date '2026-08-11', '{}'::jsonb, 'field-site');

select lives_ok($$select public.record_weld_progress(
  'erection',
  '47000000-0000-0000-0000-000000000731',
  '50000000-0000-0000-0000-000000000731',
  '56000000-0000-0000-0000-000000000731',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000731","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000732","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb,
  'field-weld')$$, 'a field joint uses the same weld command contract');
select is(
  (select phase from public.weld_progress_records where weld_joint_revision_id = '47000000-0000-0000-0000-000000000731'),
  'erection'::public.construction_phase, 'field weld progress is tagged as erection'
);
select is(
  (select count(*)::int from public.nde_obligations where weld_joint_revision_id = '47000000-0000-0000-0000-000000000731'),
  2, 'field weld creates the same obligations as shop weld'
);
select is(
  (select source_matrix_rule_id from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000731' and method = 'rt'),
  '58000000-0000-0000-0000-000000000731'::uuid,
  'field obligations come from the field matrix rule'
);
select throws_ok($$select public.record_weld_progress(
  'fabrication', '47000000-0000-0000-0000-000000000731',
  '50000000-0000-0000-0000-000000000731', '56000000-0000-0000-0000-000000000731',
  '[]'::jsonb, '{}'::jsonb, null)$$,
  'PQC51', null, 'a field joint cannot be recorded as fabrication');

select * from finish();
rollback;
