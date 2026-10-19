begin;
select plan(8);

-- The weld screens show the subcontractor read-only (manual 7.3 and 12.3): it is the shop or field
-- subcontractor of the isometric's PDS area (manual 3.4), not a free choice. The command refuses any other
-- subcontractor when the area names one for the weld's location, and stays open where the area names none.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001321', 'authenticated', 'authenticated', 'weld.area@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001321';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001321', 'AREA-132', 'Weld subcontractor from area', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001321');

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'SHOP-132', 'Shop subcontractor'),
       ('50000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321', 'FIELD-132', 'Field subcontractor');
insert into public.project_pds_areas (id, project_id, code, description, shop_subcontractor_id, field_subcontractor_id)
values ('31000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'PDS-A', 'Area with subcontractors',
        '50000000-0000-0000-0000-000000001321', '50000000-0000-0000-0000-000000001322'),
       ('31000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321', 'PDS-B', 'Area without subcontractors',
        null, null);

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001321', 'material_type', 'CS-132', 'Carbon steel 132')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321',
        '53000000-0000-0000-0000-000000001321', 'SC-132', 'Service class 132');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'BW-132', 'Butt weld 132');
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'CS-132', 'Carbon steel 132');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'A132',
        '54000000-0000-0000-0000-000000001321');

-- One WPS and two welders per subcontractor.
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values
  ('56000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001321', '53000000-0000-0000-0000-000000001321',
   'WPS-SHOP', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01'),
  ('56000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001322', '53000000-0000-0000-0000-000000001321',
   'WPS-FIELD', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001321', 'WS-ROOT', 'Shop root', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001321', 'WS-CAP', 'Shop cap', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000001323', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001322', 'WF-ROOT', 'Field root', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000001324', '30000000-0000-0000-0000-000000001321',
   '50000000-0000-0000-0000-000000001322', 'WF-CAP', 'Field cap', date '2027-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000001321', '56000000-0000-0000-0000-000000001321'),
  ('57000000-0000-0000-0000-000000001322', '56000000-0000-0000-0000-000000001321'),
  ('57000000-0000-0000-0000-000000001323', '56000000-0000-0000-0000-000000001322'),
  ('57000000-0000-0000-0000-000000001324', '56000000-0000-0000-0000-000000001322');
insert into public.nde_matrix_rules (id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, pwht_required)
values
  ('58000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321',
   '51000000-0000-0000-0000-000000001321', '52000000-0000-0000-0000-000000001321', 'shop', 10, 10, false),
  ('58000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321',
   '51000000-0000-0000-0000-000000001321', '52000000-0000-0000-0000-000000001321', 'field', 10, 10, false);

-- ISO-A in the area with subcontractors: one spool, one shop weld and one field weld.
-- ISO-B in the area without: one spool, one shop weld.
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'ISO-132-A'),
       ('40000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321', 'ISO-132-B');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000001321', '40000000-0000-0000-0000-000000001321', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001321', '51000000-0000-0000-0000-000000001321', now()),
       ('42000000-0000-0000-0000-000000001322', '40000000-0000-0000-0000-000000001322', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001322', '51000000-0000-0000-0000-000000001321', now());
insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'SP-132-A'),
       ('41000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321', 'SP-132-B');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000001321', '41000000-0000-0000-0000-000000001321',
        '42000000-0000-0000-0000-000000001321', 1, 'A132'),
       ('43000000-0000-0000-0000-000000001322', '41000000-0000-0000-0000-000000001322',
        '42000000-0000-0000-0000-000000001322', 1, 'A132');
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000001321', '30000000-0000-0000-0000-000000001321', 'WS-132-A'),
       ('46000000-0000-0000-0000-000000001322', '30000000-0000-0000-0000-000000001321', 'WF-132-A'),
       ('46000000-0000-0000-0000-000000001323', '30000000-0000-0000-0000-000000001321', 'WS-132-B');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000001321', '46000000-0000-0000-0000-000000001321',
        '43000000-0000-0000-0000-000000001321', '52000000-0000-0000-0000-000000001321', 'shop', 6, 8),
       ('47000000-0000-0000-0000-000000001322', '46000000-0000-0000-0000-000000001322',
        '43000000-0000-0000-0000-000000001321', '52000000-0000-0000-0000-000000001321', 'field', 6, 8),
       ('47000000-0000-0000-0000-000000001323', '46000000-0000-0000-0000-000000001323',
        '43000000-0000-0000-0000-000000001322', '52000000-0000-0000-0000-000000001321', 'shop', 6, 8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values ('48000000-0000-0000-0000-000000001321', '47000000-0000-0000-0000-000000001321', 'root', 1),
       ('48000000-0000-0000-0000-000000001322', '47000000-0000-0000-0000-000000001321', 'cap', 2),
       ('48000000-0000-0000-0000-000000001323', '47000000-0000-0000-0000-000000001322', 'root', 1),
       ('48000000-0000-0000-0000-000000001324', '47000000-0000-0000-0000-000000001322', 'cap', 2),
       ('48000000-0000-0000-0000-000000001325', '47000000-0000-0000-0000-000000001323', 'root', 1),
       ('48000000-0000-0000-0000-000000001326', '47000000-0000-0000-0000-000000001323', 'cap', 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001321', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001321","role":"authenticated"}', true);
select public.record_construction_progress('43000000-0000-0000-0000-000000001321', 'fabrication', 'start_fab', date '2026-08-10', '{}'::jsonb, 'area-fab-a');
select public.record_construction_progress('43000000-0000-0000-0000-000000001322', 'fabrication', 'start_fab', date '2026-08-10', '{}'::jsonb, 'area-fab-b');
select public.record_erection_progress('43000000-0000-0000-0000-000000001321', 'to_site', date '2026-08-11', '{}'::jsonb, 'area-site-a');

-- Shop weld in the area with subcontractors: the field subcontractor is refused, the shop one is accepted.
select throws_ok($$select public.record_weld_progress(
  'fabrication', '47000000-0000-0000-0000-000000001321',
  '50000000-0000-0000-0000-000000001322', '56000000-0000-0000-0000-000000001322',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001323","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001324","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'area-shop-wrong')$$,
  'PQC61', null, 'a shop weld refuses the area''s field subcontractor');

select is(
  (select count(*)::int from public.weld_progress_records where weld_joint_revision_id = '47000000-0000-0000-0000-000000001321'),
  0, 'the refused shop weld wrote nothing');

select lives_ok($$select public.record_weld_progress(
  'fabrication', '47000000-0000-0000-0000-000000001321',
  '50000000-0000-0000-0000-000000001321', '56000000-0000-0000-0000-000000001321',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001321","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001322","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'area-shop-right')$$,
  'a shop weld accepts the area''s shop subcontractor');

-- Field weld: the reverse.
select throws_ok($$select public.record_weld_progress(
  'erection', '47000000-0000-0000-0000-000000001322',
  '50000000-0000-0000-0000-000000001321', '56000000-0000-0000-0000-000000001321',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001321","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001322","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'area-field-wrong')$$,
  'PQC61', null, 'a field weld refuses the area''s shop subcontractor');

select lives_ok($$select public.record_weld_progress(
  'erection', '47000000-0000-0000-0000-000000001322',
  '50000000-0000-0000-0000-000000001322', '56000000-0000-0000-0000-000000001322',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001323","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001324","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'area-field-right')$$,
  'a field weld accepts the area''s field subcontractor');

-- An area that names no subcontractor leaves the choice open, as before.
select lives_ok($$select public.record_weld_progress(
  'fabrication', '47000000-0000-0000-0000-000000001323',
  '50000000-0000-0000-0000-000000001322', '56000000-0000-0000-0000-000000001322',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001323","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001324","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'area-open')$$,
  'an area with no subcontractor accepts any project subcontractor');

select is(
  (select subcontractor_id from public.weld_progress_records where weld_joint_revision_id = '47000000-0000-0000-0000-000000001321'),
  '50000000-0000-0000-0000-000000001321'::uuid,
  'the record keeps the shop subcontractor of the area');

select is(
  (select count(*)::int from public.weld_progress_records where project_id = '30000000-0000-0000-0000-000000001321'),
  3, 'three welds recorded in all, the two refused ones left no row');

reset role;
select * from finish();
rollback;
