begin;
select plan(19);

-- Fixture setup
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000001151', 'authenticated', 'authenticated', 'idempotency.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001152', 'authenticated', 'authenticated', 'idempotency.qc@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001151', 'IDEM-115', 'Idempotency', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001151');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', '10000000-0000-0000-0000-000000001151', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000001152', '30000000-0000-0000-0000-000000001151', '10000000-0000-0000-0000-000000001152', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'PDS-115', 'Area 115');

insert into public.system_reference_entries (id, kind, code, description)
values
  ('40000000-0000-0000-0000-000000001151', 'material_type', 'MAT-115', 'Material')
on conflict do nothing;

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001152', '30000000-0000-0000-0000-000000001151', 'SUB-115', 'Subcontractor 115');

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', '40000000-0000-0000-0000-000000001151', 'SC-115', 'Service class');

insert into public.project_weld_types (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'BW', 'Butt weld');

insert into public.isometrics (id, project_id, iso_number)
values ('51000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'ISO-115');

insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('52000000-0000-0000-0000-000000001151', '51000000-0000-0000-0000-000000001151', 'R0', 1, 'accepted', '50000000-0000-0000-0000-000000001151', '43000000-0000-0000-0000-000000001151');

insert into public.spools (id, project_id, spool_number)
values ('53000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'SP-115');

insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values ('54000000-0000-0000-0000-000000001151', '53000000-0000-0000-0000-000000001151', '52000000-0000-0000-0000-000000001151');

insert into public.weld_joints (id, project_id, weld_number)
values ('55000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'W-115-01');

insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('56000000-0000-0000-0000-000000001151', '55000000-0000-0000-0000-000000001151', '54000000-0000-0000-0000-000000001151', '44000000-0000-0000-0000-000000001151', 'shop', 6, 8);

insert into public.weld_joints (id, project_id, weld_number)
values ('55000000-0000-0000-0000-000000001152', '30000000-0000-0000-0000-000000001151', 'W-115-02');

insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('56000000-0000-0000-0000-000000001152', '55000000-0000-0000-0000-000000001152', '54000000-0000-0000-0000-000000001151', '44000000-0000-0000-0000-000000001151', 'shop', 6, 8);

-- -----------------------------------------------------------------------------
-- 1. claim_command_receipt with payload verification (B9)
-- -----------------------------------------------------------------------------
select is(
  (public.claim_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"a": 1, "b": "hello"}'::jsonb
  ) ->> 'status'),
  'claimed',
  'claim_command_receipt with payload claims new key'
);

select throws_ok(
  $$select public.claim_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"a": 2, "b": "changed"}'::jsonb
  )$$,
  'PQC60',
  null,
  'claim_command_receipt rejects reused key with differing payload'
);

select throws_ok(
  $$select public.claim_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"a": 1, "b": "hello"}'::jsonb
  )$$,
  'PQC38',
  null,
  'claim_command_receipt reports in-flight on replay of identical payload'
);

select lives_ok(
  $$select public.complete_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"result_id": "res-1"}'::jsonb
  )$$,
  'complete_command_receipt completes receipt'
);

select is(
  public.claim_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"a": 1, "b": "hello"}'::jsonb
  ) -> 'result',
  '{"result_id": "res-1"}'::jsonb,
  'replaying completed receipt with matching payload returns stored result'
);

select throws_ok(
  $$select public.claim_command_receipt(
    '30000000-0000-0000-0000-000000001151'::uuid, 'generic_command', 'test-key-1', '{"a": 999}'::jsonb
  )$$,
  'PQC60',
  null,
  'replaying completed receipt with differing payload is rejected with PQC60'
);

-- -----------------------------------------------------------------------------
-- 2. NDE batch commands: allocate, issue, close idempotency (F6)
-- -----------------------------------------------------------------------------
insert into public.nde_batches (
  id, project_id, batch_number, method, coverage_regime, status, created_by
) values (
  '60000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151',
  'BATCH-115-01', 'rt', 'mandatory_100', 'draft', '10000000-0000-0000-0000-000000001151'
);

insert into public.nde_obligations (
  id, project_id, weld_joint_revision_id, spool_revision_id, method, required_coverage, selection_mode, coverage_regime, disposition, cycle_kind, cycle_ordinal
) values (
  '61000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151',
  '56000000-0000-0000-0000-000000001151', '54000000-0000-0000-0000-000000001151', 'rt', 100, 'full', 'mandatory_100', 'pending', 'original', 0
);

insert into public.nde_batch_items (id, batch_id, obligation_id)
values (
  '62000000-0000-0000-0000-000000001151',
  '60000000-0000-0000-0000-000000001151',
  '61000000-0000-0000-0000-000000001151'
);

insert into public.nde_batches (
  id, project_id, batch_number, method, coverage_regime, status, created_by
) values (
  '60000000-0000-0000-0000-000000001153', '30000000-0000-0000-0000-000000001151',
  'BATCH-115-ALLOC', 'rt', 'mandatory_100', 'draft', '10000000-0000-0000-0000-000000001151'
);

insert into public.nde_obligations (
  id, project_id, weld_joint_revision_id, spool_revision_id, method, required_coverage, selection_mode, coverage_regime, disposition, cycle_kind, cycle_ordinal
) values (
  '61000000-0000-0000-0000-000000001153', '30000000-0000-0000-0000-000000001151',
  '56000000-0000-0000-0000-000000001152', '54000000-0000-0000-0000-000000001151', 'rt', 100, 'full', 'mandatory_100', 'pending', 'original', 0
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001152', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001152","role":"authenticated"}', true);

-- Allocation computes a count from candidates. Its retry must return the saved count
-- instead of rechecking a now-empty candidate set.
select is(
  public.allocate_nde_batch_candidates('60000000-0000-0000-0000-000000001153', 100, 'allocate-key-1'),
  1,
  'allocate_nde_batch_candidates allocates the eligible candidate'
);

select is(
  public.allocate_nde_batch_candidates('60000000-0000-0000-0000-000000001153', 100, 'allocate-key-1'),
  1,
  'replaying allocation with the same key returns its original count'
);

-- Issue batch with key
select is(
  (public.issue_nde_batch('60000000-0000-0000-0000-000000001151', 'issue-key-1')).status,
  'issued',
  'issue_nde_batch moves batch to issued status'
);

-- Replay issue batch with SAME key: must return issued batch instead of PQC41
select is(
  (public.issue_nde_batch('60000000-0000-0000-0000-000000001151', 'issue-key-1')).status,
  'issued',
  'replaying issue_nde_batch with same key returns issued batch without throwing PQC41'
);

-- -----------------------------------------------------------------------------
-- 3. record_nde_result idempotency & replay (F6)
-- -----------------------------------------------------------------------------
select is(
  (public.record_nde_result(
    '61000000-0000-0000-0000-000000001151',
    'accepted',
    date '2026-08-01',
    'REP-115-01',
    null,
    null,
    'All good',
    'nde-result-key-1'
  )).outcome,
  'accepted',
  'record_nde_result records accepted result'
);

-- Replay record_nde_result with SAME key: must return stored result instead of PQC42
select is(
  (public.record_nde_result(
    '61000000-0000-0000-0000-000000001151',
    'accepted',
    date '2026-08-01',
    'REP-115-01',
    null,
    null,
    'All good',
    'nde-result-key-1'
  )).outcome,
  'accepted',
  'replaying record_nde_result with same key returns stored result without throwing PQC42'
);

-- Replay record_nde_result with SAME key but DIFFERENT parameters: must throw PQC60
select throws_ok(
  $$select public.record_nde_result(
    '61000000-0000-0000-0000-000000001151',
    'accepted',
    date '2026-08-02',
    'REP-DIFFERENT',
    null,
    null,
    'Changed date and report',
    'nde-result-key-1'
  )$$,
  'PQC60',
  null,
  'replaying record_nde_result with differing parameters throws PQC60'
);

-- -----------------------------------------------------------------------------
-- 4. close_nde_batch idempotency & replay (F6)
-- -----------------------------------------------------------------------------
select is(
  (public.close_nde_batch('60000000-0000-0000-0000-000000001151', null, null, 'close-key-1')).status,
  'closed',
  'close_nde_batch closes examined batch'
);

-- Replay close_nde_batch with SAME key: must return closed batch instead of PQC41
select is(
  (public.close_nde_batch('60000000-0000-0000-0000-000000001151', null, null, 'close-key-1')).status,
  'closed',
  'replaying close_nde_batch with same key returns closed batch without throwing PQC41'
);

-- -----------------------------------------------------------------------------
-- 5. record_pressure_test_stage idempotency replay when superseded (F6)
-- -----------------------------------------------------------------------------
reset role;

insert into public.project_systems (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'SYS-115', 'System');
insert into public.project_subsystems (id, project_id, system_id, code, description)
values ('42000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', '41000000-0000-0000-0000-000000001151', 'SUB-115', 'Subsystem');
insert into public.project_line_services (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'LS-115', 'Line service');
insert into public.project_pressure_units (project_id, unit)
values ('30000000-0000-0000-0000-000000001151', 'bar') on conflict do nothing;

insert into public.test_packs (
  id, project_id, test_pack_number, system_id, subsystem_id, service_class_id, line_service_id,
  pressure_unit, planned_start_on, planned_end_on, priority, test_medium, test_pressure, location, created_by
) values (
  '70000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151',
  'TP-115-01', '41000000-0000-0000-0000-000000001151', '42000000-0000-0000-0000-000000001151',
  '43000000-0000-0000-0000-000000001151', '45000000-0000-0000-0000-000000001151',
  'bar', date '2026-08-01', date '2026-08-15', 'high', 'H', 15.0, 'Site 115', '10000000-0000-0000-0000-000000001151'
);

insert into public.test_pack_isometrics (project_id, test_pack_id, isometric_id, assigned_isometric_revision_id, source_kind)
values ('30000000-0000-0000-0000-000000001151', '70000000-0000-0000-0000-000000001151', '51000000-0000-0000-0000-000000001151', '52000000-0000-0000-0000-000000001151', 'manual');

insert into public.project_teams (id, project_id, team_type, code, description)
values ('46000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151', 'blinding', 'BL-115', 'Blinding');

insert into public.pressure_test_requests (id, project_id, request_type, test_pack_id, test_pack_revision_no, team_id, assigned_on, request_number, created_by)
values ('60000000-0000-0000-0000-000000001152', '30000000-0000-0000-0000-000000001151', 'blinding', '70000000-0000-0000-0000-000000001151', 0, '46000000-0000-0000-0000-000000001151', date '2026-08-01', 'BL-000115', '10000000-0000-0000-0000-000000001151');

insert into public.blinding_records (id, project_id, request_id, test_pack_id, completed_on, recorded_by)
values (
  '71000000-0000-0000-0000-000000001151', '30000000-0000-0000-0000-000000001151',
  '60000000-0000-0000-0000-000000001152', '70000000-0000-0000-0000-000000001151',
  date '2026-08-02', '10000000-0000-0000-0000-000000001151'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001152', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001152","role":"authenticated"}', true);

-- Record testing_started
select is(
  (public.record_pressure_test_stage(
    '70000000-0000-0000-0000-000000001151', 'testing_started', date '2026-08-05', 'pt-start-key'
  )).stage,
  'testing_started',
  'record_pressure_test_stage records testing_started'
);

-- Record testing_completed on later date
select is(
  (public.record_pressure_test_stage(
    '70000000-0000-0000-0000-000000001151', 'testing_completed', date '2026-08-07', 'pt-complete-key'
  )).stage,
  'testing_completed',
  'record_pressure_test_stage records testing_completed'
);

-- Replay testing_started: must return testing_started instead of PQT12 monotonicity failure
select is(
  (public.record_pressure_test_stage(
    '70000000-0000-0000-0000-000000001151', 'testing_started', date '2026-08-05', 'pt-start-key'
  )).stage,
  'testing_started',
  'replaying record_pressure_test_stage with same key returns original event without PQT12 monotonicity error'
);

reset role;
update public.test_packs
set lifecycle = 'archived'
where id = '70000000-0000-0000-0000-000000001151';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001152', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001152","role":"authenticated"}', true);

select is(
  (public.record_pressure_test_stage(
    '70000000-0000-0000-0000-000000001151', 'testing_started', date '2026-08-05', 'pt-start-key'
  )).stage,
  'testing_started',
  'a completed pressure-test receipt returns before an archived-pack lifecycle check'
);

select * from finish();
rollback;
