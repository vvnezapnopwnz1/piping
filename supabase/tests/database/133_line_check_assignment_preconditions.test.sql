begin;
select plan(9);

-- Line Check Preparation lists only the ISOs that are ready: the spools are supported and the weld joints are
-- welded (manual 16.1). An ISO the pack does not hold cannot be assigned through that pack. The command used
-- to check neither.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001331', 'authenticated', 'authenticated', 'linecheck.ready@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001331';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001331', 'LCREADY-133', 'Line check preconditions', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001331');

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'SUB-133', 'Subcontractor');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'PDS-133', 'Area');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001331', 'material_type', 'CS-133', 'Carbon steel 133')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331',
        '53000000-0000-0000-0000-000000001331', 'SC-133', 'Service class 133');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'BW-133', 'Butt weld 133');
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'CS-133', 'Carbon steel 133');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'A133',
        '54000000-0000-0000-0000-000000001331');
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values ('56000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331',
        '50000000-0000-0000-0000-000000001331', '53000000-0000-0000-0000-000000001331',
        'WPS-133', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values ('57000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331',
        '50000000-0000-0000-0000-000000001331', 'W-ROOT-133', 'Root', date '2027-01-01'),
       ('57000000-0000-0000-0000-000000001332', '30000000-0000-0000-0000-000000001331',
        '50000000-0000-0000-0000-000000001331', 'W-CAP-133', 'Cap', date '2027-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000001331', '56000000-0000-0000-0000-000000001331'),
       ('57000000-0000-0000-0000-000000001332', '56000000-0000-0000-0000-000000001331');
insert into public.nde_matrix_rules (id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331',
        '51000000-0000-0000-0000-000000001331', '52000000-0000-0000-0000-000000001331', 'shop', 10, 10, false),
       ('58000000-0000-0000-0000-000000001332', '30000000-0000-0000-0000-000000001331',
        '51000000-0000-0000-0000-000000001331', '52000000-0000-0000-0000-000000001331', 'field', 10, 10, false);

insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'SYS-133', 'System');
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', '41000000-0000-0000-0000-000000001331', 'SUBSYS-133', 'Subsystem');
insert into public.project_line_services (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'LS-133', 'Line service');
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000001331', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_teams (id, project_id, team_type, code, description)
values ('48000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'line_check', 'LC-133', 'Line Check team');

-- ISO-A is in the pack: a spool with one shop weld, one field weld and one support.
-- ISO-B is not in the pack and has nothing on it.
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'ISO-133-A'),
       ('46000000-0000-0000-0000-000000001332', '30000000-0000-0000-0000-000000001331', 'ISO-133-B');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id, accepted_at)
values ('47000000-0000-0000-0000-000000001331', '46000000-0000-0000-0000-000000001331', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001331', '51000000-0000-0000-0000-000000001331', now()),
       ('47000000-0000-0000-0000-000000001332', '46000000-0000-0000-0000-000000001332', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001331', '51000000-0000-0000-0000-000000001331', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'SP-133');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000001331', '35000000-0000-0000-0000-000000001331',
        '47000000-0000-0000-0000-000000001331', 1, 'A133');
insert into public.weld_joints (id, project_id, weld_number)
values ('4a000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'WS-133'),
       ('4a000000-0000-0000-0000-000000001332', '30000000-0000-0000-0000-000000001331', 'WF-133');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('4b000000-0000-0000-0000-000000001331', '4a000000-0000-0000-0000-000000001331',
        '43000000-0000-0000-0000-000000001331', '52000000-0000-0000-0000-000000001331', 'shop', 6, 8),
       ('4b000000-0000-0000-0000-000000001332', '4a000000-0000-0000-0000-000000001332',
        '43000000-0000-0000-0000-000000001331', '52000000-0000-0000-0000-000000001331', 'field', 6, 8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values ('4c000000-0000-0000-0000-000000001331', '4b000000-0000-0000-0000-000000001331', 'root', 1),
       ('4c000000-0000-0000-0000-000000001332', '4b000000-0000-0000-0000-000000001331', 'cap', 2),
       ('4c000000-0000-0000-0000-000000001333', '4b000000-0000-0000-0000-000000001332', 'root', 1),
       ('4c000000-0000-0000-0000-000000001334', '4b000000-0000-0000-0000-000000001332', 'cap', 2);
insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000001331', '30000000-0000-0000-0000-000000001331', 'SUP-133');
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4d000000-0000-0000-0000-000000001331', '49000000-0000-0000-0000-000000001331',
        '43000000-0000-0000-0000-000000001331', 'shoe', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001331', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001331","role":"authenticated"}', true);
select public.create_test_pack('30000000-0000-0000-0000-000000001331', 'TP-133', '41000000-0000-0000-0000-000000001331',
  '42000000-0000-0000-0000-000000001331', '51000000-0000-0000-0000-000000001331', '44000000-0000-0000-0000-000000001331',
  date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-133');
select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-133'),
  '46000000-0000-0000-0000-000000001331', 'manual', null, 'compose-133');
select public.record_construction_progress('43000000-0000-0000-0000-000000001331', 'fabrication', 'start_fab', date '2026-08-10', '{}'::jsonb, 'lc-fab');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001332']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-20', 'lc-outside')$$,
  'PQC62', null, 'an ISO the pack does not hold cannot be assigned through it');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001331']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-20', 'lc-nothing')$$,
  'PQC63', null, 'an ISO with unwelded joints and an unrecorded support is not ready');

select public.record_weld_progress('fabrication', '4b000000-0000-0000-0000-000000001331',
  '50000000-0000-0000-0000-000000001331', '56000000-0000-0000-0000-000000001331',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001331","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001332","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb, 'lc-shop-weld');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001331']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-20', 'lc-shop-only')$$,
  'PQC63', null, 'a welded shop joint is not enough while the field joint and the support are open');

select public.record_support_progress('4d000000-0000-0000-0000-000000001331', date '2026-08-12', 'lc-support');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001331']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-20', 'lc-no-field')$$,
  'PQC63', null, 'an unwelded field joint blocks the assignment too');

select is((select count(*)::int from public.pressure_test_requests where request_type = 'line_check'), 0,
  'the refused assignments wrote nothing');

select public.record_erection_progress('43000000-0000-0000-0000-000000001331', 'to_site', date '2026-08-13', '{}'::jsonb, 'lc-site');
select public.record_weld_progress('erection', '4b000000-0000-0000-0000-000000001332',
  '50000000-0000-0000-0000-000000001331', '56000000-0000-0000-0000-000000001331',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001331","completion_percent":50,"welded_on":"2026-08-14"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000001332","completion_percent":50,"welded_on":"2026-08-14"}]'::jsonb,
  '{"weld_on":"2026-08-14"}'::jsonb, 'lc-field-weld');

select lives_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001331']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-20', 'lc-ready')$$,
  'an ISO of the pack with every joint welded and every support recorded can be assigned');

select is((select count(*)::int from public.line_check_request_items where isometric_id = '46000000-0000-0000-0000-000000001331'), 1,
  'the ready ISO is on the Line Check request');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array['46000000-0000-0000-0000-000000001331']::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-21', 'lc-again')$$,
  'PQC99', null, 'the existing duplicate rule still holds');

select throws_ok($$select public.assign_line_check((select id from public.test_packs where test_pack_number = 'TP-133'),
  array[]::uuid[], '48000000-0000-0000-0000-000000001331', date '2026-08-21', 'lc-empty')$$,
  'PQC98', null, 'an empty list is still refused');

reset role;
select * from finish();
rollback;
