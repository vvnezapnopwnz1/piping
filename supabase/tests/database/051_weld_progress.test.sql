begin;
select plan(34);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000511', 'authenticated', 'authenticated', 'weld.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000512', 'authenticated', 'authenticated', 'weld.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000511';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000511', 'WLD-A', 'Welding A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000511');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '10000000-0000-0000-0000-000000000512', 'system_admin', 'project_admin', true);

-- Referentials
insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000511', 'material_type', 'CS', 'Carbon steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '53000000-0000-0000-0000-000000000511', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'CS', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'A1',
        '54000000-0000-0000-0000-000000000511');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '50000000-0000-0000-0000-000000000511', '53000000-0000-0000-0000-000000000511',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-1', 'Welder One', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-2', 'Welder Two', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-3', 'Expired Welder', date '2026-02-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000511', '56000000-0000-0000-0000-000000000511'),
  ('57000000-0000-0000-0000-000000000512', '56000000-0000-0000-0000-000000000511'),
  ('57000000-0000-0000-0000-000000000513', '56000000-0000-0000-0000-000000000511');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required, pwht_thickness_threshold)
values ('58000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '51000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511', 'shop',
        100, 10, true, 10);

-- Definition graph
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'ISO-0511');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SP-0511-A');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'W-0511-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000511', '40000000-0000-0000-0000-000000000511', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000511', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000511', '41000000-0000-0000-0000-000000000511',
        '42000000-0000-0000-0000-000000000511', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000511', '46000000-0000-0000-0000-000000000511',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'shop', 6, 12);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000511', '47000000-0000-0000-0000-000000000511', 'root', 1),
  ('48000000-0000-0000-0000-000000000512', '47000000-0000-0000-0000-000000000511', 'cap', 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000512', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000512","role":"authenticated"}', true);

select has_table('public', 'weld_progress_records', 'weld_progress_records table exists');
select has_table('public', 'weld_point_assignments', 'weld_point_assignments table exists');
select has_table('public', 'nde_obligations', 'nde_obligations table exists');
select has_table('public', 'pwht_requirements', 'pwht_requirements table exists');

select is(relrowsecurity, true, 'weld_progress_records has RLS')
from pg_class where oid = 'public.weld_progress_records'::regclass;

select is(
  has_table_privilege('authenticated', 'public.weld_progress_records', 'UPDATE'),
  false,
  'authenticated cannot update weld progress directly'
);
select is(
  has_table_privilege('authenticated', 'public.nde_obligations', 'INSERT'),
  false,
  'authenticated cannot insert obligations directly'
);

select is(
  (public.weld_joint_context('47000000-0000-0000-0000-000000000511')).weld_location,
  'shop',
  'the weld context resolves the joint location'
);
select is(
  (public.weld_joint_context('47000000-0000-0000-0000-000000000511')).service_class_id,
  '51000000-0000-0000-0000-000000000511'::uuid,
  'the weld context resolves the service class from the ISO revision'
);

-- Start Fab so the spool is a legitimate fabrication target
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000511', 'fabrication', 'start_fab', date '2026-08-04');

-- Happy path: two points, two welders, one WPS, Root + Cap = 100
select lives_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05","dwir_number":"DWIR-1"}'::jsonb)$$,
  'a qualified multi-welder joint is recorded'
);

select is(
  (select count(*)::int from public.weld_point_assignments),
  2,
  'both weld points are assigned'
);

-- Dossier 11.9: RT 100 and UT 10 produce two obligations, full and spot
select is(
  (select count(*)::int from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  2,
  'the matrix generated one obligation per covered method'
);
select is(
  (select selection_mode from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'rt'),
  'full',
  'a 100 percent coverage is a full obligation'
);
select is(
  (select selection_mode from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'ut'),
  'spot',
  'a partial coverage is a spot obligation'
);
select is(
  (select count(*)::int from public.pwht_requirements
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  1,
  'a 12 mm joint over a 10 mm threshold generates a PWHT requirement'
);

-- Re-recording is idempotent for obligations
select lives_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":60,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":40,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'the joint can be corrected while it is unlocked'
);
select is(
  (select count(*)::int from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  2,
  're-recording did not duplicate obligations'
);

-- Root + Cap must be exactly 100
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":70,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC35', null,
  'Root plus Cap over 100 percent is refused'
);

-- The same welder cannot take both points
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  '23505', null,
  'one welder cannot hold two points of the same joint'
);

-- Expired qualification on the date of the work
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000513",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null,
  'a welder whose qualification expired before the weld date is refused'
);

-- WPS out of range
set local role postgres;
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511',
        '50000000-0000-0000-0000-000000000511', '53000000-0000-0000-0000-000000000511',
        'WPS-SMALL', 'GTAW', 1, 2, 2, 4, 'R0', date '2026-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000000511', '56000000-0000-0000-0000-000000000512');
set local role authenticated;

select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000512',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":100,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null,
  'a WPS that does not cover the joint diameter is refused'
);

-- A field joint is not Shop Weld Progress
set local role postgres;
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511', 'W-0511-02');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000512', '46000000-0000-0000-0000-000000000512',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'field', 6, 12);
set local role authenticated;

select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000512',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[]'::jsonb, '{}'::jsonb)$$,
  'PQC30', null,
  'a field joint is refused by Shop Weld Progress'
);

-- Restore a clean welded record after the negative cases above
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000511',
  '50000000-0000-0000-0000-000000000511',
  '56000000-0000-0000-0000-000000000511',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
     "completion_percent":50,"welded_on":"2026-08-05"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
     "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
  '{"weld_on":"2026-08-05"}'::jsonb);

select is(
  (select is_locked from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  false,
  'a welded joint starts unlocked'
);

-- Accepting the first obligation locks the joint
select lives_ok(
  format($$select public.record_nde_obligation_outcome(%L, 'satisfied')$$,
    (select id from public.nde_obligations
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'rt')),
  'the RT obligation is satisfied'
);
select is(
  (select is_locked from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  true,
  'the first accepted NDE result locks the joint'
);

-- Dossier 30 prohibition 4
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC36', null,
  'a locked joint refuses ordinary weld progress'
);

-- The correction path works, and only with a reason
select throws_ok(
  format($$select public.correct_weld_progress(
      '47000000-0000-0000-0000-000000000511', %s,
      '{"dwir_number":"DWIR-2"}'::jsonb, '   ')$$,
    (select version from public.weld_progress_records
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511')),
  '23514', null,
  'a correction without a reason is refused'
);
select lives_ok(
  format($$select public.correct_weld_progress(
      '47000000-0000-0000-0000-000000000511', %s,
      '{"dwir_number":"DWIR-2"}'::jsonb, 'Transcription error on the DWIR number')$$,
    (select version from public.weld_progress_records
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511')),
  'a reasoned correction passes the lock'
);
select is(
  (select dwir_number from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  'DWIR-2',
  'the correction was applied'
);
select is(
  (select count(*)::int from public.audit_events
   where action = 'correct_weld_progress'),
  1,
  'the correction is in the audit trail'
);

-- Remediation task 5: PQC39 and the PQC34 branches the TypeScript mirror covers but the
-- authoritative SQL copy did not. A fresh joint, because W-0511-01 is locked by now.
reset role;
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511', 'W-0511-03');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000513', '46000000-0000-0000-0000-000000000513',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'shop', 6, 12);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000515', '47000000-0000-0000-0000-000000000513', 'root', 1),
  ('48000000-0000-0000-0000-000000000516', '47000000-0000-0000-0000-000000000513', 'cap', 2);
insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511',
        'SUB-OTHER', 'Another fabricator');

-- A WPS approved after the weld date is refused (dossier 11.6).
update public.project_welding_procedures set approved_on = date '2030-01-01'
where id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a WPS approved after the weld date is refused');
reset role;
update public.project_welding_procedures set approved_on = date '2026-01-01'
where id = '56000000-0000-0000-0000-000000000511';

-- A WPS qualified for a different subcontractor is refused (dossier 11.6).
update public.project_welding_procedures
set subcontractor_id = '50000000-0000-0000-0000-000000000513'
where id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a WPS qualified for another subcontractor is refused');
reset role;
update public.project_welding_procedures
set subcontractor_id = '50000000-0000-0000-0000-000000000511'
where id = '56000000-0000-0000-0000-000000000511';

-- A welder with no welder_wps_qualifications row for this WPS is refused (dossier 11.7).
delete from public.welder_wps_qualifications
where welder_qualification_id = '57000000-0000-0000-0000-000000000512'
  and wps_id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a welder not linked to the WPS is refused');
reset role;
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000000512', '56000000-0000-0000-0000-000000000511');

-- PQC39: the matrix rule was archived after the definition was imported, so obligation
-- generation has nothing to key on.
update public.nde_matrix_rules set status = 'archived'
where id = '58000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC39', null, 'an archived NDE matrix rule is reported as a missing referential');
reset role;
update public.nde_matrix_rules set status = 'active'
where id = '58000000-0000-0000-0000-000000000511';

select * from finish();
rollback;
