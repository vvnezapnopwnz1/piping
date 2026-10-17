begin;
select plan(22);

-- 1. The three document projections run with the reader's rights and only authenticated reads them.
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.weld_log_rows'::regclass),
  'weld_log_rows is security_invoker'
);
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.nde_register_rows'::regclass),
  'nde_register_rows is security_invoker'
);
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.test_pack_document_rows'::regclass),
  'test_pack_document_rows is security_invoker'
);
select ok(not has_table_privilege('anon', 'public.weld_log_rows', 'select'), 'anon cannot read weld_log_rows');
select ok(not has_table_privilege('anon', 'public.nde_register_rows', 'select'), 'anon cannot read nde_register_rows');
select ok(not has_table_privilege('anon', 'public.test_pack_document_rows', 'select'), 'anon cannot read test_pack_document_rows');
select ok(has_table_privilege('authenticated', 'public.weld_log_rows', 'select'), 'authenticated reads weld_log_rows');
select ok(has_table_privilege('authenticated', 'public.nde_register_rows', 'select'), 'authenticated reads nde_register_rows');
select ok(has_table_privilege('authenticated', 'public.test_pack_document_rows', 'select'), 'authenticated reads test_pack_document_rows');

-- 2. Fixture: ISO-118 has a superseded R0 and an accepted R1; W-3 is removed in R1.
--    ISO-118B was in TP-118 and has been taken out of it.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000118', 'authenticated', 'authenticated', 'documents.member@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001118', 'authenticated', 'authenticated', 'documents.outsider@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000118', 'DOCS-118', 'Documents 118', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000118')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', '10000000-0000-0000-0000-000000000118', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000118', 'material_type', 'MAT-118', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description) values ('41000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'SYS-118', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description) values ('42000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', '41000000-0000-0000-0000-000000000118', 'SUB-118', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description) values ('43000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', '40000000-0000-0000-0000-000000000118', 'SC-118', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description) values ('44000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'LS-118', 'Line service') on conflict (id) do nothing;
insert into public.project_subcontractors (id, project_id, code, description) values ('44100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'NDT-118', 'NDT Lab 118') on conflict (id) do nothing;

insert into public.isometrics (id, project_id, iso_number)
values
  ('46000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'ISO-118'),
  ('46100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'ISO-118B');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, line_number)
values
  ('47000000-0000-0000-0000-000000000118', '46000000-0000-0000-0000-000000000118', 'R0', 1, 'superseded', 'L-OLD'),
  ('47100000-0000-0000-0000-000000000118', '46000000-0000-0000-0000-000000000118', 'R1', 2, 'accepted', 'L-118'),
  ('47200000-0000-0000-0000-000000000118', '46100000-0000-0000-0000-000000000118', 'R0', 1, 'accepted', 'L-118B');

insert into public.spools (id, project_id, spool_number)
values
  ('48000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'SP-118'),
  ('48100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'SP-118B');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values
  ('49000000-0000-0000-0000-000000000118', '48000000-0000-0000-0000-000000000118', '47000000-0000-0000-0000-000000000118', 1),
  ('49100000-0000-0000-0000-000000000118', '48000000-0000-0000-0000-000000000118', '47100000-0000-0000-0000-000000000118', 1),
  ('49200000-0000-0000-0000-000000000118', '48100000-0000-0000-0000-000000000118', '47200000-0000-0000-0000-000000000118', 1);

insert into public.weld_joints (id, project_id, weld_number)
values
  ('50000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'W-1'),
  ('50100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'W-2'),
  ('50200000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'W-3'),
  ('50300000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'W-1B');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm, is_removed)
values
  ('51000000-0000-0000-0000-000000000118', '50000000-0000-0000-0000-000000000118', '49000000-0000-0000-0000-000000000118', 'shop', 6, 7.11, false),
  ('51100000-0000-0000-0000-000000000118', '50000000-0000-0000-0000-000000000118', '49100000-0000-0000-0000-000000000118', 'shop', 6, 7.11, false),
  ('51200000-0000-0000-0000-000000000118', '50100000-0000-0000-0000-000000000118', '49100000-0000-0000-0000-000000000118', 'field', 6, 7.11, false),
  ('51300000-0000-0000-0000-000000000118', '50200000-0000-0000-0000-000000000118', '49100000-0000-0000-0000-000000000118', 'shop', 6, 7.11, true),
  ('51400000-0000-0000-0000-000000000118', '50300000-0000-0000-0000-000000000118', '49200000-0000-0000-0000-000000000118', 'shop', 4, 6.02, false);

insert into public.nde_obligations (id, project_id, weld_joint_revision_id, spool_revision_id, method, required_coverage, selection_mode, disposition)
values
  ('52000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', '51100000-0000-0000-0000-000000000118', '49100000-0000-0000-0000-000000000118', 'rt', 100, 'full', 'satisfied'),
  ('52100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', '51200000-0000-0000-0000-000000000118', '49100000-0000-0000-0000-000000000118', 'vt', 100, 'full', 'pending');
insert into public.nde_batches (id, project_id, batch_number, method, coverage_regime, ndt_subcontractor_id, status, report_number)
values
  ('53000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'RT-118', 'rt', 'mandatory_100', '44100000-0000-0000-0000-000000000118', 'returned', 'RT-BATCH'),
  ('53100000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'VT-118', 'vt', 'mandatory_100', '44100000-0000-0000-0000-000000000118', 'issued', 'VT-BATCH');
insert into public.nde_batch_items (batch_id, obligation_id)
values
  ('53000000-0000-0000-0000-000000000118', '52000000-0000-0000-0000-000000000118'),
  ('53100000-0000-0000-0000-000000000118', '52100000-0000-0000-0000-000000000118');
insert into public.nde_results (project_id, obligation_id, outcome, examined_on, report_number)
values ('30000000-0000-0000-0000-000000000118', '52000000-0000-0000-0000-000000000118', 'accepted', date '2026-10-01', 'RT-RES-1');

insert into public.test_packs (id, project_id, test_pack_number, system_id, subsystem_id, service_class_id, line_service_id,
  pressure_unit, planned_start_on, planned_end_on, priority, test_medium, test_pressure, location)
values ('54000000-0000-0000-0000-000000000118', '30000000-0000-0000-0000-000000000118', 'TP-118', '41000000-0000-0000-0000-000000000118',
  '42000000-0000-0000-0000-000000000118', '43000000-0000-0000-0000-000000000118', '44000000-0000-0000-0000-000000000118',
  'bar', date '2026-10-05', date '2026-10-10', 'High', 'H', 15, 'Site 1');
insert into public.test_pack_isometrics (project_id, test_pack_id, isometric_id, assigned_isometric_revision_id, assigned_by, removed_at, removed_by)
values
  ('30000000-0000-0000-0000-000000000118', '54000000-0000-0000-0000-000000000118', '46000000-0000-0000-0000-000000000118', '47100000-0000-0000-0000-000000000118', '10000000-0000-0000-0000-000000000118', null, null),
  ('30000000-0000-0000-0000-000000000118', '54000000-0000-0000-0000-000000000118', '46100000-0000-0000-0000-000000000118', '47200000-0000-0000-0000-000000000118', '10000000-0000-0000-0000-000000000118', now(), '10000000-0000-0000-0000-000000000118');
insert into public.pressure_test_stage_events (project_id, test_pack_id, stage, occurred_on, recorded_by)
values ('30000000-0000-0000-0000-000000000118', '54000000-0000-0000-0000-000000000118', 'testing_started', date '2026-10-08', '10000000-0000-0000-0000-000000000118');

-- 3. A project member reads the documents.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000118', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000118","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select weld_number, revision_number, line_number from public.weld_log_rows
    where isometric_id = '46000000-0000-0000-0000-000000000118' order by weld_number$$,
  $$values ('W-1', 'R1', 'L-118'), ('W-2', 'R1', 'L-118')$$,
  'weld log lists only the welds of the accepted revision, without the removed one'
);
select is(
  (select nde_methods from public.weld_log_rows where weld_joint_revision_id = '51100000-0000-0000-0000-000000000118'),
  array['rt'],
  'weld log carries the NDE methods of the weld'
);
select is(
  (select report_number from public.nde_register_rows where obligation_id = '52000000-0000-0000-0000-000000000118'),
  'RT-RES-1',
  'NDE register takes the report number from the result'
);
select is(
  (select report_number from public.nde_register_rows where obligation_id = '52100000-0000-0000-0000-000000000118'),
  'VT-BATCH',
  'NDE register falls back to the batch report number while there is no result'
);
select results_eq(
  $$select disposition, outcome, batch_number, ndt_subcontractor_name from public.nde_register_rows
    where obligation_id = '52100000-0000-0000-0000-000000000118'$$,
  $$values ('pending'::text, null::text, 'VT-118'::text, 'NDT Lab 118'::text)$$,
  'a pending obligation has no outcome and shows its batch and laboratory'
);
select is(
  (select test_pack_number from public.weld_log_rows where weld_joint_revision_id = '51100000-0000-0000-0000-000000000118'),
  'TP-118',
  'a weld of an ISO in a test pack carries the pack number'
);
select is(
  (select test_pack_id from public.weld_log_rows where weld_joint_revision_id = '51400000-0000-0000-0000-000000000118'),
  null,
  'a weld of an ISO taken out of the pack has no test pack'
);
select is(
  (select testing_started_on from public.test_pack_document_rows where test_pack_id = '54000000-0000-0000-0000-000000000118'),
  date '2026-10-08',
  'test pack document row carries the testing_started date'
);
select results_eq(
  $$select iso_count, line_numbers, weld_total, system_code, subsystem_code from public.test_pack_document_rows
    where test_pack_id = '54000000-0000-0000-0000-000000000118'$$,
  $$values (1, array['L-118'], 2, 'SYS-118'::text, 'SUB-118'::text)$$,
  'test pack document row counts active ISOs, their lines and their welds'
);

-- 4. Someone outside the project reads nothing.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001118', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001118","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.weld_log_rows where project_id = '30000000-0000-0000-0000-000000000118'),
  0,
  'an outsider sees no weld log rows'
);
select is(
  (select count(*)::int from public.nde_register_rows where project_id = '30000000-0000-0000-0000-000000000118'),
  0,
  'an outsider sees no NDE register rows'
);
select is(
  (select count(*)::int from public.test_pack_document_rows where project_id = '30000000-0000-0000-0000-000000000118'),
  0,
  'an outsider sees no test pack document rows'
);
select is(
  (select count(*)::int from public.test_pack_document_rows where test_pack_number = 'TP-118'),
  0,
  'an outsider cannot find the pack by number either'
);

select * from finish();
rollback;
