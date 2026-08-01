begin;
select plan(80);

select has_table('public', 'command_receipts', 'shared command receipts exist');
select has_table('public', 'construction_progress_events', 'construction progress is an event ledger');
select has_table('public', 'qc13_progress_forms', 'QC-13 forms exist');
select has_table('public', 'material_check_records', 'material check records exist');
select has_table('public', 'material_check_items', 'material check evidence items exist');
select has_type('public', 'construction_phase', 'construction phases are enumerated');
select has_type('public', 'construction_stage', 'construction stages are enumerated');
select has_type('public', 'spool_context', 'spool context is a composite type');

select has_function('public', 'claim_command_receipt', array['uuid', 'text', 'text'], 'receipt claim RPC exists');
select has_function('public', 'complete_command_receipt', array['uuid', 'text', 'text', 'jsonb'], 'receipt completion RPC exists');
select has_function('public', 'assert_construction_target', array['uuid', 'text'], 'target authorization guard exists');
select has_function('public', 'construction_stage_ordinal', array['construction_stage'], 'stage ordinal helper exists');
select has_function('public', 'effective_stage_date', array['uuid', 'construction_stage'], 'effective stage helper exists');
select has_function('public', 'record_construction_progress', array['uuid', 'construction_phase', 'construction_stage', 'date', 'jsonb', 'text'], 'manual progress RPC exists');
select has_function('public', 'request_qc13_form', array['uuid', 'date', 'text'], 'QC-13 request RPC exists');
select has_function('public', 'materialize_progress_copies', array['uuid', 'text'], 'revision-copy materialization RPC exists');
select has_function('public', 'record_material_check', array['uuid', 'date', 'jsonb', 'uuid', 'text'], 'material-check RPC exists');
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('public.record_material_check(uuid, date, jsonb, uuid, text)'::regprocedure)) > 0,
  'material-check RPC serializes concurrent commands for one spool revision'
);

select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.construction_progress_events')), false),
  'progress events have RLS'
);
select is(
  coalesce(has_table_privilege('authenticated', to_regclass('public.construction_progress_events'), 'INSERT'), false),
  false,
  'authenticated cannot mutate the event ledger directly'
);
select is(
  coalesce(has_table_privilege('authenticated', to_regclass('public.qc13_progress_forms'), 'UPDATE'), false),
  false,
  'authenticated cannot mutate QC-13 forms directly'
);
select ok(coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.material_check_records')), false),
  'material checks have RLS');
select is(coalesce(has_table_privilege('authenticated', to_regclass('public.material_check_records'), 'INSERT'), false), false,
  'authenticated cannot create material checks directly');
select is(coalesce(has_table_privilege('authenticated', to_regclass('public.material_check_items'), 'UPDATE'), false), false,
  'authenticated cannot mutate material-check evidence directly');

-- Behavioral coverage: a project admin has the fabrication capability and PDS scope.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000501', 'authenticated', 'authenticated', 'progress.admin@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000501';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000501', 'P05-A', 'Progress A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000501');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'PDS-05', 'Track 05 PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'ISO-05-A');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000501', '33000000-0000-0000-0000-000000000501', 'R0', 1, 'accepted', '31000000-0000-0000-0000-000000000501', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'SP-05-A');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000501', '35000000-0000-0000-0000-000000000501', '34000000-0000-0000-0000-000000000501', 1);

select is(
  has_function_privilege('authenticated', 'public.claim_command_receipt(uuid, text, text)', 'EXECUTE'), false,
  'authenticated cannot invoke the internal receipt claim helper'
);
select is(has_function_privilege('authenticated', 'public.complete_command_receipt(uuid, text, text, jsonb)', 'EXECUTE'), false,
  'authenticated cannot invoke the internal receipt completion helper');
select is(has_function_privilege('authenticated', 'public.effective_stage_date(uuid, public.construction_stage)', 'EXECUTE'), false,
  'authenticated cannot invoke the internal effective-stage helper');
select is(has_function_privilege('authenticated', 'public.assert_construction_target(uuid, text)', 'EXECUTE'), false,
  'authenticated cannot invoke the internal construction-target helper');
select lives_ok($$select public.claim_command_receipt('30000000-0000-0000-0000-000000000501', 'receipt-test', 'receipt-1')$$,
  'an internal receipt can be claimed once');
select throws_ok($$select public.claim_command_receipt('30000000-0000-0000-0000-000000000501', 'receipt-test', 'receipt-1')$$,
  'PQC38', null, 'an incomplete receipt is always in flight on replay');
select lives_ok($$select public.complete_command_receipt('30000000-0000-0000-0000-000000000501', 'receipt-test', 'receipt-1', '{"ok":true}'::jsonb)$$,
  'an internal receipt can be completed');
select is(
  public.claim_command_receipt('30000000-0000-0000-0000-000000000501', 'receipt-test', 'receipt-1') -> 'result',
  '{"ok": true}'::jsonb, 'a completed receipt replays its stored result'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_construction_progress('00000000-0000-0000-0000-000000000000', 'fabrication', 'start_fab', current_date, '{}'::jsonb, null)$$,
  'PQC30', null, 'a missing construction target is rejected');
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'fabricated', current_date, '{}'::jsonb, null)$$,
  'PQC32', null, 'derived fabrication stages cannot be manually recorded');
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'sent_to_paint', current_date, '{}'::jsonb, null)$$,
  'PQC32', null, 'painting requires fabrication start');
select lives_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', date '2026-08-04', '{}'::jsonb, 'start-1')$$,
  'fabrication start is recorded by the command');
reset role;
select is(public.effective_stage_date('36000000-0000-0000-0000-000000000501', 'start_fab'), date '2026-08-04',
  'effective stage uses the surviving event date');

insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on, source, compensates_event_id)
select project_id, spool_revision_id, phase, stage, occurred_on, 'compensation', id
from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000501' and stage = 'start_fab';
select is(public.effective_stage_date('36000000-0000-0000-0000-000000000501', 'start_fab'), null::date,
  'a compensating event removes the original stage from effective projection');
insert into public.qc13_progress_forms (project_id, spool_revision_id, form_number, requested_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000501', 'QC13-TEST-01', current_date);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit) values
  ('39000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000501', 'MAT-05-A', 1, 'ea'),
  ('39000000-0000-0000-0000-000000000502', '36000000-0000-0000-0000-000000000501', 'MAT-05-B', 2, 'ea');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number) values
  ('3a000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'MRR-05-A', 'MAT-05-A', 'TRACE-05-A'),
  ('3a000000-0000-0000-0000-000000000502', '30000000-0000-0000-0000-000000000501', 'MRR-05-B', 'MAT-05-B', 'TRACE-05-B');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"}]'::jsonb, null, null)$$,
  'PQC32', null, 'material checking requires fabrication start');
reset role;
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '{"ident_code":"MAT-05-A"}'::jsonb, null, null)$$,
  '23514', null, 'material-check items must be a JSON array');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"UNKNOWN","trace_number":"TRACE-X"}]'::jsonb, null, null)$$,
  'PQC30', null, 'an ident outside the revision BOM is rejected');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-WRONG"}]'::jsonb, null, null)$$,
  'PQC33', null, 'an inactive or missing PML trace is rejected');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1}]'::jsonb, (select id from public.qc13_progress_forms where form_number = 'QC13-TEST-01'), 'material-partial')$$,
  'partial BOM evidence is recorded');
reset role;
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000501' and stage = 'material_check'), 0,
  'partial evidence does not derive material-check progress');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-B","trace_number":"TRACE-05-B","quantity":2}]'::jsonb, null, 'material-full')$$,
  'full BOM evidence completes the material check');
reset role;
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000501' and stage = 'material_check'), 1,
  'complete evidence derives material-check progress once');
select is((select source::text from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000501' and stage = 'material_check'), 'derived',
  'material-check progress persists its derived source');
select ok((select count(*) = 2 and bool_and(spool_revision_material_id is not null and piping_material_record_id is not null)
  from public.material_check_items), 'material checks retain non-null BOM and PML evidence FKs');
select ok((
  select after_state @> '{"submitted_items":[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1}],"evidence":{"items":[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"}]}}'::jsonb
  from public.audit_events
  where entity_type = 'material_check_records' and action = 'record_material_check'
  order by created_at, id limit 1
), 'the initial material-check audit preserves submitted and accepted ident-trace evidence');
select ok((
  select before_state @> '{"evidence":{"items":[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"}]}}'::jsonb
     and after_state @> '{"evidence":{"items":[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"},{"ident_code":"MAT-05-B","trace_number":"TRACE-05-B"}]}}'::jsonb
  from public.audit_events
  where entity_type = 'material_check_records' and action = 'record_material_check'
  order by created_at desc, id desc limit 1
), 'a later material-check audit retains prior evidence and the expanded accepted evidence');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select is((public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1}]'::jsonb, null, 'material-partial')).id,
  (select id from public.material_check_records), 'an idempotency replay returns the original material check');
select lives_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"}]'::jsonb, null, 'material-complete-retry')$$,
  'a completed material check can be retried under a new idempotency key');
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000501' and stage = 'material_check'), 1,
  'a completed material-check retry does not duplicate derived progress');
reset role;
select is((select count(*)::int from public.audit_events where entity_type = 'material_check_records' and action = 'record_material_check'), 3,
  'material-check commands are audited once per completed command');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":2}]'::jsonb, null, 'material-quantity-rewrite')$$,
  '23514', null, 'accepted material quantity cannot be rewritten');
reset role;
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('3a000000-0000-0000-0000-000000000503', '30000000-0000-0000-0000-000000000501', 'MRR-05-A2', 'MAT-05-A', 'TRACE-05-A2');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, null, null, null)$$,
  '23514', null, 'material-check items cannot be SQL NULL');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A2","quantity":1}]'::jsonb, null, 'material-evidence-rewrite')$$,
  '23514', null, 'accepted material evidence cannot be rewritten');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1},{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A","quantity":1}]'::jsonb, null, 'material-duplicate-ident')$$,
  '23514', null, 'a material-check command cannot repeat an ident code');
reset role;
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000503', '30000000-0000-0000-0000-000000000501', 'SP-05-EMPTY');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000504', '35000000-0000-0000-0000-000000000503', '34000000-0000-0000-0000-000000000501', 1);
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000504', 'fabrication', 'start_fab', current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000504', current_date, null, null, null)$$,
  '23514', null, 'an empty BOM cannot derive material check from SQL NULL evidence');
reset role;
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000504' and stage = 'material_check'), 0,
  'an empty BOM has no derived material-check event');
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000504', '30000000-0000-0000-0000-000000000501', 'SP-05-NAN');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000505', '35000000-0000-0000-0000-000000000504', '34000000-0000-0000-0000-000000000501', 1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit)
values ('39000000-0000-0000-0000-000000000503', '36000000-0000-0000-0000-000000000505', 'MAT-05-NAN', 1, 'ea');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('3a000000-0000-0000-0000-000000000504', '30000000-0000-0000-0000-000000000501', 'MRR-05-NAN', 'MAT-05-NAN', 'TRACE-05-NAN');
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000505', 'fabrication', 'start_fab', current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000505', current_date, '[{"ident_code":"MAT-05-NAN","trace_number":"TRACE-05-NAN","quantity":"NaN"}]'::jsonb, null, null)$$,
  '23514', null, 'material quantity cannot be numeric NaN');
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000505', current_date, '[{"ident_code":"MAT-05-NAN","trace_number":"TRACE-05-NAN","quantity":"Infinity"}]'::jsonb, null, null)$$,
  '23514', null, 'material quantity cannot be numeric infinity');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000502', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000502","role":"authenticated"}', true);
select is((select count(*)::int from public.material_check_records), 0,
  'a user without fabrication.view cannot read material checks');
reset role;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000502', 'authenticated', 'authenticated', 'progress.no-fabrication@example.test', 'not-used', now(), now(), now());
insert into public.project_memberships (project_id, user_id, role, access_role_code, is_active)
values ('30000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000502', 'qc_engineer', 'project_editor', true);
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000503', 'authenticated', 'authenticated', 'progress.out-of-pds@example.test', 'not-used', now(), now(), now());
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('32000000-0000-0000-0000-000000000503', '30000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000503', 'subcontractor', 'subcontractor', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('32000000-0000-0000-0000-000000000503', 'fabrication_contributor');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000502', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000502","role":"authenticated"}', true);
select is((select count(*)::int from public.construction_progress_events), 0,
  'a user without fabrication.view cannot read progress events');
select is((select count(*)::int from public.qc13_progress_forms), 0,
  'a user without fabrication.view cannot read QC-13 forms');
select throws_ok($$select count(*) from public.command_receipts$$, '42501', null,
  'authenticated cannot read internal command receipts directly');
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', current_date, '{}'::jsonb, null)$$,
  '42501', null, 'a user lacking fabrication.progress.record is rejected');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000503', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000503","role":"authenticated"}', true);
select is((select count(*)::int from public.material_check_records), 0,
  'material-check visibility is constrained to the target PDS scope');
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', current_date, '{}'::jsonb, null)$$,
  '42501', null, 'a capable user outside the target PDS scope is rejected');
reset role;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000504', 'authenticated', 'authenticated', 'progress.in-pds@example.test', 'not-used', now(), now(), now());
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('32000000-0000-0000-0000-000000000504', '30000000-0000-0000-0000-000000000501', '10000000-0000-0000-0000-000000000504', 'subcontractor', 'subcontractor', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('32000000-0000-0000-0000-000000000504', 'fabrication_contributor');
insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('32000000-0000-0000-0000-000000000504', '31000000-0000-0000-0000-000000000501');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000504', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000504","role":"authenticated"}', true);
select is((select count(*)::int from public.material_check_records), 1,
  'an in-scope fabrication-only user can read material checks without spooling.view');
reset role;

-- An accepted replacement revision receives each copy once, even when retried.
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000502', '30000000-0000-0000-0000-000000000501', 'ISO-05-COPY');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, superseded_at)
values ('34000000-0000-0000-0000-000000000502', '33000000-0000-0000-0000-000000000502', 'R0', 1, 'superseded', '31000000-0000-0000-0000-000000000501', now());
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000503', '33000000-0000-0000-0000-000000000502', 'R1', 2, 'accepted', '31000000-0000-0000-0000-000000000501', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000502', '30000000-0000-0000-0000-000000000501', 'SP-05-COPY');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number) values
  ('36000000-0000-0000-0000-000000000502', '35000000-0000-0000-0000-000000000502', '34000000-0000-0000-0000-000000000502', 1),
  ('36000000-0000-0000-0000-000000000503', '35000000-0000-0000-0000-000000000502', '34000000-0000-0000-0000-000000000503', 1);
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000502', 'fabrication', 'start_fab', date '2026-08-01');
insert into public.revision_change_items (id, project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id, entity_type, entity_id, entity_key, change_type)
values ('37000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', '33000000-0000-0000-0000-000000000502', '34000000-0000-0000-0000-000000000503', '34000000-0000-0000-0000-000000000502', 'spool', '35000000-0000-0000-0000-000000000502', 'SP-05-COPY', 'unchanged');
insert into public.revision_progress_copies (id, change_item_id, source_spool_revision_id, target_spool_revision_id, progress_kind)
values ('38000000-0000-0000-0000-000000000501', '37000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000502', '36000000-0000-0000-0000-000000000503', 'fabrication_start');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
create or replace function pg_temp.materialize_result(target_revision uuid, target_key text)
returns integer language plpgsql as $$
declare result integer;
begin
  execute 'select public.materialize_progress_copies($1, $2)' into result using target_revision, target_key;
  return result;
exception when undefined_function then return null;
end;
$$;
select is(pg_temp.materialize_result('34000000-0000-0000-0000-000000000503', 'copy-1'), 1,
  'a pending progress copy materializes once');
select is(pg_temp.materialize_result('34000000-0000-0000-0000-000000000503', 'copy-1'), 1,
  'an idempotent materialize retry replays its result');
reset role;
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '36000000-0000-0000-0000-000000000503' and source = 'revision_copy'), 1,
  'retrying revision copy does not duplicate its event');
select is((select count(*)::int from public.audit_events where entity_type = 'revision_progress_copies' and entity_id = '38000000-0000-0000-0000-000000000501'), 1,
  'materializing a copy is audited');
insert into public.qc13_progress_forms (project_id, spool_revision_id, form_number, requested_on)
values ('30000000-0000-0000-0000-000000000501', '36000000-0000-0000-0000-000000000503', 'QC13-OTHER-SPOOL', current_date);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_material_check('36000000-0000-0000-0000-000000000501', current_date, '[{"ident_code":"MAT-05-A","trace_number":"TRACE-05-A"}]'::jsonb, (select id from public.qc13_progress_forms where form_number = 'QC13-OTHER-SPOOL'), null)$$,
  'PQC30', null, 'a QC-13 form for another spool revision is rejected');
reset role;
update public.spool_revisions set is_removed = true where id = '36000000-0000-0000-0000-000000000501';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', current_date, '{}'::jsonb, null)$$,
  'PQC31', null, 'a removed spool revision is rejected as stale');
reset role;
update public.spool_revisions set is_removed = false where id = '36000000-0000-0000-0000-000000000501';
update public.isometric_revisions set status = 'superseded', superseded_at = now()
where id = '34000000-0000-0000-0000-000000000501';
set local role authenticated;
select throws_ok($$select public.record_construction_progress('36000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', current_date, '{}'::jsonb, null)$$,
  'PQC31', null, 'a superseded construction target is rejected as stale');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000501', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
select ok((select count(*) from public.construction_progress_events) > 0,
  'a permitted in-scope user can read progress events');
select ok((select count(*) from public.qc13_progress_forms) > 0,
  'a permitted in-scope user can read QC-13 forms');
select throws_ok($$select count(*) from public.command_receipts$$, '42501', null,
  'a permitted user still cannot read internal command receipts directly');
reset role;

select * from finish();
rollback;
