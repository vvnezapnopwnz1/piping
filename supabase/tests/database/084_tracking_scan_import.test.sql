begin;
select plan(16);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000840', 'authenticated', 'authenticated', 'tracking.import.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000841', 'authenticated', 'authenticated', 'tracking.import.operator@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000842', 'authenticated', 'authenticated', 'tracking.import.reader@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects(id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000840', 'TRACK-084', 'Tracking import', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000840')
on conflict (id) do nothing;
insert into public.project_memberships(id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000841', '30000000-0000-0000-0000-000000000840', '10000000-0000-0000-0000-000000000841', 'qc_engineer', 'project_editor', true),
  ('20000000-0000-0000-0000-000000000842', '30000000-0000-0000-0000-000000000840', '10000000-0000-0000-0000-000000000842', 'project_manager', 'project_reader', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.project_membership_functional_roles(membership_id, role_code)
values ('20000000-0000-0000-0000-000000000841', 'tracking_operator')
on conflict do nothing;

insert into public.project_location_categories(id, project_id, code, description)
values ('40000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', 'TRACK', 'Tracking')
on conflict (id) do nothing;
insert into public.project_locations(id, project_id, category_id, code, description, capacity)
values
  ('41000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', '40000000-0000-0000-0000-000000000840', 'LOC-A', 'Location A', 10),
  ('41000000-0000-0000-0000-000000000841', '30000000-0000-0000-0000-000000000840', '40000000-0000-0000-0000-000000000840', 'LOC-B', 'Location B', 10)
on conflict (id) do nothing;
insert into public.project_devices(id, project_id, code, description)
values ('42000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', 'PDA-084', 'PDA')
on conflict (id) do nothing;
insert into public.project_device_users(id, project_id, membership_id, device_id)
values ('43000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', '20000000-0000-0000-0000-000000000841', '42000000-0000-0000-0000-000000000840')
on conflict (project_id, membership_id) do update set device_id = excluded.device_id, status = 'active';
insert into public.isometrics(id, project_id, iso_number)
values ('50000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', 'ISO-084')
on conflict (id) do nothing;
insert into public.isometric_revisions(id, isometric_id, revision_number, revision_ordinal, status, created_by, accepted_at)
values ('51000000-0000-0000-0000-000000000840', '50000000-0000-0000-0000-000000000840', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000840', now())
on conflict (id) do nothing;
insert into public.spools(id, project_id, spool_number)
values ('52000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', 'SP-084')
on conflict (id) do nothing;
insert into public.spool_revisions(id, spool_id, isometric_revision_id)
values ('53000000-0000-0000-0000-000000000840', '52000000-0000-0000-0000-000000000840', '51000000-0000-0000-0000-000000000840')
on conflict (id) do nothing;
insert into public.spool_location_events(id, project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, source_event_key, recorded_by)
values ('60000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', '52000000-0000-0000-0000-000000000840', '53000000-0000-0000-0000-000000000840', '41000000-0000-0000-0000-000000000840', '20000000-0000-0000-0000-000000000841', 'in', '2026-08-01T08:00:00Z', 'manual', 'seed-import-084', '10000000-0000-0000-0000-000000000840');

insert into public.import_jobs(id, project_id, import_type, status, requested_by, source_file_name)
values
  ('70000000-0000-0000-0000-000000000840', '30000000-0000-0000-0000-000000000840', 'tracking_scan', 'validated', '10000000-0000-0000-0000-000000000840', 'tracking-external.txt'),
  ('70000000-0000-0000-0000-000000000841', '30000000-0000-0000-0000-000000000840', 'tracking_scan', 'validated', '10000000-0000-0000-0000-000000000840', 'tracking-duplicate.txt'),
  ('70000000-0000-0000-0000-000000000842', '30000000-0000-0000-0000-000000000840', 'tracking_scan', 'validated', '10000000-0000-0000-0000-000000000840', 'tracking-fingerprint.txt');
insert into public.import_job_rows(job_id, row_number, raw_values, normalized_values, action)
values
  ('70000000-0000-0000-0000-000000000840', 1, '{}'::jsonb, '{"iso_number":"ISO-084","spool_number":"SP-084","location_code":"LOC-A","direction":"out","occurred_at":"2026-08-01T09:00:00.000Z","device_code":"PDA-084","operator_email":"tracking.import.operator@example.test","external_event_id":"SCAN-084-1"}'::jsonb, 'create'),
  ('70000000-0000-0000-0000-000000000841', 1, '{}'::jsonb, '{"iso_number":"ISO-084","spool_number":"SP-084","location_code":"LOC-A","direction":"out","occurred_at":"2026-08-01T09:00:00.000Z","device_code":"PDA-084","operator_email":"tracking.import.operator@example.test","external_event_id":"SCAN-084-1"}'::jsonb, 'create'),
  ('70000000-0000-0000-0000-000000000842', 1, '{}'::jsonb, '{"iso_number":"ISO-084","spool_number":"SP-084","location_code":"LOC-B","direction":"in","occurred_at":"2026-08-01T10:00:00.000Z","device_code":"PDA-084","operator_email":"tracking.import.operator@example.test","external_event_id":null}'::jsonb, 'create'),
  ('70000000-0000-0000-0000-000000000842', 2, '{}'::jsonb, '{"iso_number":"ISO-084","spool_number":"SP-084","location_code":"LOC-B","direction":"in","occurred_at":"2026-08-01T10:00:00.000Z","device_code":"PDA-084","operator_email":"tracking.import.operator@example.test","external_event_id":null}'::jsonb, 'create');

select ok((select pg_get_constraintdef(oid) from pg_constraint where conname = 'import_jobs_import_type_check') like all (array['%spooling_definition%', '%flange_progress%', '%test_pack_composition%', '%tracking_scan%']), 'tracking import preserves every shared import type');
select has_function('public', 'apply_tracking_scan_import_job', array['uuid','boolean'], 'tracking apply RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000842', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000842","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.apply_tracking_scan_import_job('70000000-0000-0000-0000-000000000840', false)$$, '42501', null, 'reader cannot apply tracking imports');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000840', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000840","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.apply_tracking_scan_import_job('70000000-0000-0000-0000-000000000840', false)$$, 'administrator applies tracking scan');
select results_eq($$select source::text from public.spool_location_events where source_event_key = 'external:scan-084-1'$$, $$values ('scan_import'::text)$$, 'import provenance is server-owned');
select results_eq($$select occurred_at from public.spool_location_events where source_event_key = 'external:scan-084-1'$$, $$values ('2026-08-01T09:00:00Z'::timestamptz)$$, 'full scan timestamp is retained');
select results_eq($$select source_import_job_id from public.spool_location_events where source_event_key = 'external:scan-084-1'$$, $$values ('70000000-0000-0000-0000-000000000840'::uuid)$$, 'event is linked to its import job');
select results_eq($$select applied_row_count from public.import_jobs where id = '70000000-0000-0000-0000-000000000840'$$, $$values (1)$$, 'new external event is counted once');
select lives_ok($$select public.apply_tracking_scan_import_job('70000000-0000-0000-0000-000000000841', false)$$, 'duplicate file applies idempotently');
select results_eq($$select applied_row_count from public.import_jobs where id = '70000000-0000-0000-0000-000000000841'$$, $$values (0)$$, 'existing external event is reported as duplicate');
select results_eq($$select count(*)::bigint from public.spool_location_events where source = 'scan_import' and source_event_key = 'external:scan-084-1'$$, $$values (1::bigint)$$, 'database unique key prevents duplicate external events');
select lives_ok($$select public.apply_tracking_scan_import_job('70000000-0000-0000-0000-000000000842', false)$$, 'fingerprint rows apply idempotently');
select results_eq($$select applied_row_count from public.import_jobs where id = '70000000-0000-0000-0000-000000000842'$$, $$values (1)$$, 'duplicate fingerprint rows create one event');
select results_eq($$select count(*)::bigint from public.spool_location_events where source = 'scan_import' and source_event_key like 'fingerprint:%'$$, $$values (1::bigint)$$, 'stable fingerprint is stored in the unique source key');
select results_eq($$select operator_membership_id from public.spool_location_events where source_event_key = 'external:scan-084-1'$$, $$values ('20000000-0000-0000-0000-000000000841'::uuid)$$, 'operator email resolves inside the project');
select lives_ok($$select public.apply_tracking_scan_import_job('70000000-0000-0000-0000-000000000842', false)$$, 'same applied job returns without another mutation');

reset role;
select * from finish();
rollback;
