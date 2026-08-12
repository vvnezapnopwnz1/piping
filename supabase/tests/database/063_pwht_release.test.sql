-- 063: PWHT Quality Gate (PQC47)
-- Task 9: no chart refuses; rejected chart followed by accepted one releases; accepted releases.
begin;
select plan(5);

-- ─── Fixture ──────────────────────────────────────────────────────────────────
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000631', 'authenticated', 'authenticated', 'pwht.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000632', 'authenticated', 'authenticated', 'pwht.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000631';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000631', 'PWHT-A', 'PWHT Gate A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000631');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        '10000000-0000-0000-0000-000000000632', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'SUB-PWHT', 'PWHT Sub');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000631', 'material_type', 'CS-PWHT', 'Carbon steel PWHT')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        '53000000-0000-0000-0000-000000000631', 'SC-PWHT', 'Service class PWHT');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'CS-PWHT', 'Carbon steel PWHT');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'A1',
        '54000000-0000-0000-0000-000000000631');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        '50000000-0000-0000-0000-000000000631', '53000000-0000-0000-0000-000000000631',
        'WPS-PWHT', 'GTAW', 1, 12, 6, 30, 'R0', date '2026-01-01');

insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
   '50000000-0000-0000-0000-000000000631', 'W-PWHT1', 'Welder PWHT 1', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000632', '30000000-0000-0000-0000-000000000631',
   '50000000-0000-0000-0000-000000000631', 'W-PWHT2', 'Welder PWHT 2', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000631', '56000000-0000-0000-0000-000000000631'),
  ('57000000-0000-0000-0000-000000000632', '56000000-0000-0000-0000-000000000631');

-- PWHT required rule
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        '51000000-0000-0000-0000-000000000631', '52000000-0000-0000-0000-000000000631', 'shop',
        100, 0, true);

insert into public.project_rework_codes (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'RW-PWHT', 'Inclusion');

insert into public.project_location_categories (id, project_id, code, description)
values ('5c000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'YARD', 'Yard');

insert into public.project_locations (id, project_id, category_id, code, description)
values ('5d000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        '5c000000-0000-0000-0000-000000000631', 'YARD-PWHT', 'Yard PWHT');

-- Graph
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'ISO-PWHT-631');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'SP-PWHT-631');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631', 'W-PWHT-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000631', '40000000-0000-0000-0000-000000000631', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000631', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000631', '41000000-0000-0000-0000-000000000631',
        '42000000-0000-0000-0000-000000000631', 1, 'A1');

-- Thickness 20mm triggers PWHT requirement
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000631', '46000000-0000-0000-0000-000000000631',
        '43000000-0000-0000-0000-000000000631', '52000000-0000-0000-0000-000000000631', 'shop', 8, 20);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000631', '47000000-0000-0000-0000-000000000631', 'root', 1),
  ('48000000-0000-0000-0000-000000000632', '47000000-0000-0000-0000-000000000631', 'cap', 2);

-- One bill line for material check
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000631', '43000000-0000-0000-0000-000000000631',
        'IDN-PWHT', 1, 'pcs', 'HT-PWHT');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000631', '30000000-0000-0000-0000-000000000631',
        'MRR-PWHT', 'IDN-PWHT', 'HT-PWHT');

-- ─── Walk the golden path up to (but not through) quality release ──────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000632', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000632","role":"authenticated"}', true);

select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000631', 'fabrication', 'start_fab', date '2026-08-01');

select public.record_material_check(
  '43000000-0000-0000-0000-000000000631', date '2026-08-02',
  '[{"ident_code":"IDN-PWHT","trace_number":"HT-PWHT","quantity":1}]'::jsonb);

select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000631',
  '50000000-0000-0000-0000-000000000631',
  '56000000-0000-0000-0000-000000000631',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000631","completion_percent":50,"welded_on":"2026-08-01"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000632","completion_percent":50,"welded_on":"2026-08-01"}]'::jsonb,
  '{"weld_on":"2026-08-01"}'::jsonb
);

-- Satisfy the NDE obligation so it's not blocking
do $$
declare
  ob_id uuid;
  batch_id uuid;
begin
  perform public.create_nde_batch(
    '30000000-0000-0000-0000-000000000631', 'rt'::public.ndt_method,
    'mandatory_100', null, null, 'BATCH-PWHT-1'
  );
  select id into batch_id from public.nde_batches where batch_number = 'BATCH-PWHT-1';
  perform public.allocate_nde_batch_candidates(batch_id);
  perform public.issue_nde_batch(batch_id);
  select id into ob_id from public.nde_obligations
  where spool_revision_id = '43000000-0000-0000-0000-000000000631' and disposition = 'issued';
  perform public.record_nde_result(
    ob_id, 'accepted', date '2026-08-02', 'RPT-PWHT-NDE', null,
    '57000000-0000-0000-0000-000000000631'
  );
end;
$$;

-- Verify PWHT requirement was created
select ok(
  exists (select 1 from public.pwht_requirements
          where spool_revision_id = '43000000-0000-0000-0000-000000000631'),
  'PWHT requirement was generated for thick joint'
);

-- Assertion 1: No chart → PQC47 refuses quality release
select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000631',
      date '2026-08-03'
    )$$,
  'PQC47', null,
  'No PWHT chart → PQC47 refuses quality release'
);

-- Assertion 2: Rejected PWHT chart → still PQC47
select public.record_pwht_result(
  (select id from public.pwht_requirements where spool_revision_id = '43000000-0000-0000-0000-000000000631'),
  'CHT-PWHT-001', date '2026-08-02', 'rejected'
);

select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000631',
      date '2026-08-03'
    )$$,
  'PQC47', null,
  'Rejected PWHT chart → still PQC47'
);

-- Assertion 3: Accepted PWHT chart → quality release succeeds
select public.record_pwht_result(
  (select id from public.pwht_requirements where spool_revision_id = '43000000-0000-0000-0000-000000000631'),
  'CHT-PWHT-002', date '2026-08-03', 'accepted'
);

select lives_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000631',
      date '2026-08-04'
    )$$,
  'Accepted PWHT chart → quality release succeeds'
);

-- Assertion 4: Quality release record exists
select is(
  (select count(*)::int from public.quality_release_records
   where spool_revision_id = '43000000-0000-0000-0000-000000000631'),
  1,
  'Quality release record persisted after PWHT gate cleared'
);

select * from finish();
rollback;
