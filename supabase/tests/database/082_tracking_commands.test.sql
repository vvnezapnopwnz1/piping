begin;
select plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000820', 'authenticated', 'authenticated', 'tracking.command.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000821', 'authenticated', 'authenticated', 'tracking.command.operator@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000822', 'authenticated', 'authenticated', 'tracking.command.reader@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000820', 'TRACK-082', 'Tracking command', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000820')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000821', '30000000-0000-0000-0000-000000000820', '10000000-0000-0000-0000-000000000821', 'qc_engineer', 'project_editor', true),
  ('20000000-0000-0000-0000-000000000822', '30000000-0000-0000-0000-000000000820', '10000000-0000-0000-0000-000000000822', 'project_manager', 'project_reader', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.project_membership_functional_roles(membership_id, role_code)
values ('20000000-0000-0000-0000-000000000821', 'tracking_operator')
on conflict do nothing;

insert into public.project_location_categories(id, project_id, code, description)
values ('40000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', 'TRACK', 'Tracking')
on conflict (id) do nothing;
insert into public.project_locations(id, project_id, category_id, code, description, capacity)
values
  ('41000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', '40000000-0000-0000-0000-000000000820', 'LOC-082-A', 'Location A', 10),
  ('41000000-0000-0000-0000-000000000821', '30000000-0000-0000-0000-000000000820', '40000000-0000-0000-0000-000000000820', 'LOC-082-B', 'Location B', 10)
on conflict (id) do nothing;
insert into public.project_devices(id, project_id, code, description)
values
  ('42000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', 'PDA-082', 'Assigned PDA'),
  ('42000000-0000-0000-0000-000000000821', '30000000-0000-0000-0000-000000000820', 'PDA-082-X', 'Unassigned PDA')
on conflict (id) do nothing;
insert into public.project_device_users(id, project_id, membership_id, device_id)
values ('43000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', '20000000-0000-0000-0000-000000000821', '42000000-0000-0000-0000-000000000820')
on conflict (project_id, membership_id) do update set device_id = excluded.device_id, status = 'active';

insert into public.isometrics(id, project_id, iso_number)
values ('50000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', 'ISO-082')
on conflict (id) do nothing;
insert into public.isometric_revisions(id, isometric_id, revision_number, revision_ordinal, status, created_by, accepted_at)
values ('51000000-0000-0000-0000-000000000820', '50000000-0000-0000-0000-000000000820', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000820', now())
on conflict (id) do nothing;
insert into public.spools(id, project_id, spool_number)
values ('52000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', 'SP-082')
on conflict (id) do nothing;
insert into public.spool_revisions(id, spool_id, isometric_revision_id)
values ('53000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '51000000-0000-0000-0000-000000000820')
on conflict (id) do nothing;

insert into public.spool_location_events(id, project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, source_event_key, recorded_by)
values ('60000000-0000-0000-0000-000000000820', '30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '53000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000820', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000820' and user_id = '10000000-0000-0000-0000-000000000820'), 'in', '2026-08-01T08:00:00Z', 'manual', 'seed-in-082', '10000000-0000-0000-0000-000000000820');

select has_function('public', 'record_location_event', array['uuid','uuid','uuid','uuid','tracking_direction','timestamp with time zone','text','uuid','text'], 'public tracking command exists');
select has_function('public', 'record_location_event_invariant', array['uuid','uuid','uuid','uuid','tracking_direction','timestamp with time zone','text','uuid','tracking_event_source','uuid','uuid','uuid','text'], 'private invariant exists');
select ok(not has_function_privilege('authenticated', 'public.record_location_event_invariant(uuid,uuid,uuid,uuid,tracking_direction,timestamp with time zone,text,uuid,tracking_event_source,uuid,uuid,uuid,text)', 'EXECUTE'), 'browser role cannot execute private invariant');
select hasnt_function('public', 'record_location_event', array['uuid','uuid','uuid','uuid','tracking_direction','timestamp with time zone','text','uuid','text','tracking_event_source'], 'public command has no provenance argument');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000821', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000821","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000820', '42000000-0000-0000-0000-000000000820', 'out', '2026-08-01T09:00:00Z', null, null, 'operator-out-082')$$, 'operator records departure');
select results_eq($$select source::text from public.spool_location_events where source_event_key = 'operator-out-082'$$, $$values ('manual'::text)$$, 'public command forces manual provenance');
select results_eq($$select spool_revision_id from public.spool_location_events where source_event_key = 'operator-out-082'$$, $$values ('53000000-0000-0000-0000-000000000820'::uuid)$$, 'accepted revision is resolved server-side');
select lives_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000820', '42000000-0000-0000-0000-000000000820', 'out', '2026-08-01T09:00:00Z', null, null, 'operator-out-082')$$, 'same idempotency key returns the existing event');
select results_eq($$select count(*)::bigint from public.spool_location_events where source_event_key = 'operator-out-082'$$, $$values (1::bigint)$$, 'idempotent retry creates one row');
select throws_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000820', '42000000-0000-0000-0000-000000000820', 'out', '2026-08-01T09:05:00Z', null, null, 'operator-out-again-082')$$, 'PQS04', null, 'second departure is rejected');
select lives_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000821', '42000000-0000-0000-0000-000000000820', 'in', '2026-08-01T10:00:00Z', null, null, 'operator-in-082')$$, 'operator records arrival while in transit');
select throws_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000821', '42000000-0000-0000-0000-000000000821', 'out', '2026-08-01T11:00:00Z', null, null, 'wrong-device-082')$$, 'PQS03', null, 'unassigned device is rejected');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000822', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000822","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000821', null, 'out', '2026-08-01T11:00:00Z', null, null, 'reader-out-082')$$, '42501', null, 'reader cannot record tracking events');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000820', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000820","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000820', null, 'manual', '2026-08-01T12:00:00Z', 'Administrator adjustment', null, 'admin-manual-082')$$, 'administrator can set location manually');
select lives_ok($$select public.record_location_event('30000000-0000-0000-0000-000000000820', '52000000-0000-0000-0000-000000000820', '41000000-0000-0000-0000-000000000821', null, 'manual', '2026-08-01T12:05:00Z', 'Corrected administrator adjustment', (select id from public.spool_location_events where source_event_key = 'admin-manual-082'), 'admin-correction-082')$$, 'administrator correction appends a compensation event');
select results_eq($$select source::text from public.spool_location_events where source_event_key = 'admin-correction-082'$$, $$values ('compensation'::text)$$, 'correction provenance is server-derived');

reset role;
select * from finish();
rollback;
