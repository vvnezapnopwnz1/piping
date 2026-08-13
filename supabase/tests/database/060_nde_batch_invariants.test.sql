-- 060: NDE Batch Invariants and Lifecycle Test
begin;
select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000601', 'authenticated', 'authenticated', 'batch.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000602', 'authenticated', 'authenticated', 'batch.user@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000601';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000601', 'BTC-A', 'Batch A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000601');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601',
        '10000000-0000-0000-0000-000000000602', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000601', 'material_type', 'CS-060', 'Carbon steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601',
        '53000000-0000-0000-0000-000000000601', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'CS-060', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'A1',
        '54000000-0000-0000-0000-000000000601');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601',
        '50000000-0000-0000-0000-000000000601', '53000000-0000-0000-0000-000000000601',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601',
   '50000000-0000-0000-0000-000000000601', 'W-1', 'Welder One', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000601', '56000000-0000-0000-0000-000000000601');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601',
        '51000000-0000-0000-0000-000000000601', '52000000-0000-0000-0000-000000000601', 'shop',
        100, 10, false);

-- Spool graph
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'ISO-0601');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'SP-0601-A');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000601', '30000000-0000-0000-0000-000000000601', 'W-0601-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000601', '40000000-0000-0000-0000-000000000601', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000601', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000601', '41000000-0000-0000-0000-000000000601',
        '42000000-0000-0000-0000-000000000601', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000601', '46000000-0000-0000-0000-000000000601',
        '43000000-0000-0000-0000-000000000601', '52000000-0000-0000-0000-000000000601', 'shop', 6, 8);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values ('48000000-0000-0000-0000-000000000601', '47000000-0000-0000-0000-000000000601', 'root', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000602', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000602","role":"authenticated"}', true);

-- Record weld progress to generate obligations
select lives_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000601',
      '50000000-0000-0000-0000-000000000601',
      '56000000-0000-0000-0000-000000000601',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000601","completion_percent":100,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'weld progress recorded'
);

select is(
  (select count(*)::int from public.nde_obligations where weld_joint_revision_id = '47000000-0000-0000-0000-000000000601'),
  2,
  'generated 2 obligations (RT 100% full -> NDE100, UT 10% spot -> S)'
);

-- Test 1: Create NDE Batch
select lives_ok(
  $$select public.create_nde_batch('30000000-0000-0000-0000-000000000601', 'rt'::public.ndt_method, 'mandatory_100', null, null, 'BATCH-001')$$,
  'create_nde_batch creates a draft batch'
);

select is(
  (select status from public.nde_batches where batch_number = 'BATCH-001'),
  'draft',
  'batch status is draft'
);

-- Test 2: Candidate Allocation
select is(
  (select public.allocate_nde_batch_candidates(id) from public.nde_batches where batch_number = 'BATCH-001'),
  1,
  'allocated 1 obligation into draft batch'
);

-- Test 3: Issue Batch
select lives_ok(
  $$select public.issue_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-001'$$,
  'issue_nde_batch updates batch to issued'
);

select is(
  (select disposition from public.nde_obligations where coverage_regime = 'mandatory_100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000601'),
  'issued',
  'obligation disposition updated to issued'
);

-- Test 4: Issued obligation keeps spool unreleasable
select is(
  (select nde_pending from public.spool_fabrication_readiness where spool_revision_id = '43000000-0000-0000-0000-000000000601'),
  2::int,
  'issued batch obligation still counts towards nde_pending'
);

-- Test 5: Cannot close batch before recording results (PQC41)
select throws_ok(
  $$select public.close_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-001'$$,
  'PQC41', null,
  'unexamined batch items prevent batch closing'
);

-- Test 6: Record Result
select lives_ok(
  $$select public.record_nde_result(
      (select id from public.nde_obligations where coverage_regime = 'mandatory_100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000601'),
      'accepted', date '2026-08-06', 'RPT-001', null, '57000000-0000-0000-0000-000000000601'
    )$$,
  'record_nde_result records accepted result'
);

select is(
  (select disposition from public.nde_obligations where coverage_regime = 'mandatory_100' and weld_joint_revision_id = '47000000-0000-0000-0000-000000000601'),
  'satisfied',
  'accepted obligation disposition becomes satisfied'
);

-- Test 7: Close Batch now succeeds
select lives_ok(
  $$select public.close_nde_batch(id) from public.nde_batches where batch_number = 'BATCH-001'$$,
  'batch closes after all items have results'
);

select * from finish();
rollback;
