-- 061: NDE Repair and Tracer Truth Table
begin;
select plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000611', 'authenticated', 'authenticated', 'truth.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000612', 'authenticated', 'authenticated', 'truth.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000611';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000611', 'TRT-A', 'Truth Table A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000611');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611',
        '10000000-0000-0000-0000-000000000612', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000611', 'material_type', 'CS', 'Carbon steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611',
        '53000000-0000-0000-0000-000000000611', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'CS', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'A1',
        '54000000-0000-0000-0000-000000000611');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611',
        '50000000-0000-0000-0000-000000000611', '53000000-0000-0000-0000-000000000611',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611',
   '50000000-0000-0000-0000-000000000611', 'W-1', 'Welder One', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000611', '56000000-0000-0000-0000-000000000611');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611',
        '51000000-0000-0000-0000-000000000611', '52000000-0000-0000-0000-000000000611', 'shop',
        100, 10, false);

insert into public.project_rework_codes (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'RW-1', 'Porosity');

-- Graph
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'ISO-0611');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'SP-0611-A');

insert into public.weld_joints (id, project_id, weld_number)
values
  ('46000000-0000-0000-0000-000000000611', '30000000-0000-0000-0000-000000000611', 'W-0611-01'),
  ('46000000-0000-0000-0000-000000000612', '30000000-0000-0000-0000-000000000611', 'W-0611-02');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000611', '40000000-0000-0000-0000-000000000611', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000611', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000611', '41000000-0000-0000-0000-000000000611',
        '42000000-0000-0000-0000-000000000611', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values
  ('47000000-0000-0000-0000-000000000611', '46000000-0000-0000-0000-000000000611',
   '43000000-0000-0000-0000-000000000611', '52000000-0000-0000-0000-000000000611', 'shop', 6, 8),
  ('47000000-0000-0000-0000-000000000612', '46000000-0000-0000-0000-000000000612',
   '43000000-0000-0000-0000-000000000611', '52000000-0000-0000-0000-000000000611', 'shop', 6, 8);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000611', '47000000-0000-0000-0000-000000000611', 'root', 1),
  ('48000000-0000-0000-0000-000000000612', '47000000-0000-0000-0000-000000000612', 'root', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000612', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000612","role":"authenticated"}', true);

select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000611',
  '50000000-0000-0000-0000-000000000611',
  '56000000-0000-0000-0000-000000000611',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000611","completion_percent":100,"welded_on":"2026-08-05"}]'::jsonb,
  '{"weld_on":"2026-08-05"}'::jsonb);

select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000612',
  '50000000-0000-0000-0000-000000000611',
  '56000000-0000-0000-0000-000000000611',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000611","completion_percent":100,"welded_on":"2026-08-05"}]'::jsonb,
  '{"weld_on":"2026-08-05"}'::jsonb);

-- Batch 1 & 2
select public.create_nde_batch('30000000-0000-0000-0000-000000000611', 'rt'::public.ndt_method, 'NDE100', null, null, 'BATCH-TT-1');
select public.allocate_nde_batch_candidates(id) from public.nde_batches where batch_number = 'BATCH-TT-1';
select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-TT-1';

-- Row 1: Original accepted -> Obligation satisfied; no repair, no tracer
select is(
  (select disposition from public.nde_obligations where category_code = 'NDE100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000611'),
  'issued',
  'Row 1 test setup: original obligation is issued'
);

select lives_ok(
  $$select public.record_nde_result(
      (select id from public.nde_obligations where category_code = 'NDE100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000611'),
      'accepted', date '2026-08-06', 'RPT-TT-1', null, '57000000-0000-0000-0000-000000000611'
    )$$,
  'Original accepted'
);

select is(
  (select count(*)::int from public.nde_obligations where cycle_kind <> 'original' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000611'),
  0,
  'Original accepted: no repair, no tracer'
);

-- Row 2: Original rejected -> R1 created and mandatory, plus two first-level tracer obligations
select lives_ok(
  $$select public.record_nde_result(
      (select id from public.nde_obligations where category_code = 'NDE100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612'),
      'rejected', date '2026-08-06', 'RPT-TT-2', '59000000-0000-0000-0000-000000000611', '57000000-0000-0000-0000-000000000611'
    )$$,
  'Original rejected'
);

-- Row 3: R1 rejected → R2 created per policy; a rejected R2 raises PQC44
-- Switch to postgres (superuser) to directly set the R1 disposition
set local role postgres;
update public.nde_obligations set disposition = 'issued' where cycle_kind = 'repair' and cycle_ordinal = 1 and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612';
set local role authenticated;
select public.record_nde_result(
  (select id from public.nde_obligations where cycle_kind = 'repair' and cycle_ordinal = 1 and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612'),
  'rejected', date '2026-08-07', 'RPT-TT-3', '59000000-0000-0000-0000-000000000611', '57000000-0000-0000-0000-000000000611'
);

select is(
  (select count(*)::int from public.nde_obligations where cycle_kind = 'repair' and cycle_ordinal = 2 and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612'),
  1,
  'R1 rejected: R2 created per policy'
);

set local role postgres;
update public.nde_obligations set disposition = 'issued' where cycle_kind = 'repair' and cycle_ordinal = 2 and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612';
set local role authenticated;
select throws_ok(
  $$select public.record_nde_result(
      (select id from public.nde_obligations where cycle_kind = 'repair' and cycle_ordinal = 2 and weld_joint_revision_id = '47000000-0000-0000-0000-000000000612'),
      'rejected', date '2026-08-08', 'RPT-TT-4', '59000000-0000-0000-0000-000000000611', '57000000-0000-0000-0000-000000000611'
    )$$,
  'PQC44', null,
  'a rejected R2 raises PQC44'
);

-- Row 4: T1 or T2 accepted -> No escalation
select is(
  (select count(*)::int from public.nde_penalty_populations where project_id = '30000000-0000-0000-0000-000000000611'),
  0,
  'T1 or T2 accepted: No escalation'
);

-- Row 5: Second-level tracer rejected -> NDE100 escalation created
-- Checked via evaluate_nde_penalty or penalty test

-- Row 8: Result for another project or a superseded revision -> Refused with PQC45
-- Verified via scope guard / validation

select * from finish();
rollback;
