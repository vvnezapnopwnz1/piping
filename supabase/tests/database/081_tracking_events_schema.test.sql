begin;
select plan(21);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000810', 'authenticated', 'authenticated', 'tracking.schema@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000810', 'TRACK-081-A', 'Tracking schema A', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000810'),
  ('30000000-0000-0000-0000-000000000811', 'TRACK-081-B', 'Tracking schema B', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000810')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', '10000000-0000-0000-0000-000000000810', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, is_active = true;

insert into public.project_location_categories (id, project_id, code, description)
values
  ('40000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', 'YARD-A', 'Yard A'),
  ('40000000-0000-0000-0000-000000000811', '30000000-0000-0000-0000-000000000811', 'YARD-B', 'Yard B')
on conflict (id) do nothing;
insert into public.project_locations (id, project_id, category_id, code, description, capacity)
values
  ('41000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', '40000000-0000-0000-0000-000000000810', 'LOC-A', 'Location A', 10),
  ('41000000-0000-0000-0000-000000000811', '30000000-0000-0000-0000-000000000811', '40000000-0000-0000-0000-000000000811', 'LOC-B', 'Location B', 10)
on conflict (id) do nothing;
insert into public.project_devices (id, project_id, code, description)
values ('42000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', 'PDA-081', 'PDA')
on conflict (id) do nothing;

insert into public.isometrics (id, project_id, iso_number)
values
  ('50000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', 'ISO-081-A'),
  ('50000000-0000-0000-0000-000000000811', '30000000-0000-0000-0000-000000000811', 'ISO-081-B')
on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, created_by, accepted_at)
values
  ('51000000-0000-0000-0000-000000000810', '50000000-0000-0000-0000-000000000810', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000810', now()),
  ('51000000-0000-0000-0000-000000000811', '50000000-0000-0000-0000-000000000811', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000810', now())
on conflict (id) do nothing;
insert into public.spools (id, project_id, spool_number)
values
  ('52000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', 'SP-081-A'),
  ('52000000-0000-0000-0000-000000000811', '30000000-0000-0000-0000-000000000811', 'SP-081-B')
on conflict (id) do nothing;
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values
  ('53000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '51000000-0000-0000-0000-000000000810'),
  ('53000000-0000-0000-0000-000000000811', '52000000-0000-0000-0000-000000000811', '51000000-0000-0000-0000-000000000811')
on conflict (id) do nothing;

select has_table('public', 'spool_location_events', 'tracking event ledger exists');
select has_type('public', 'tracking_direction', 'tracking direction enum exists');
select has_type('public', 'tracking_event_source', 'tracking source enum exists');
select has_column('public', 'spool_location_events', 'spool_id', 'stable spool identity is stored');
select has_column('public', 'spool_location_events', 'spool_revision_id', 'event-time revision snapshot is stored');
select col_type_is('public', 'spool_location_events', 'occurred_at', 'timestamp with time zone', 'event time is timestamptz');
select has_index('public', 'spool_location_events', 'spool_location_events_source_key_uq', 'source-event idempotency index exists');
select has_index('public', 'spool_location_events', 'spool_location_events_compensation_uq', 'one compensation per event is enforced');
select has_trigger('public', 'spool_location_events', 'spool_location_events_validate', 'cross-project validation trigger exists');
select has_trigger('public', 'spool_location_events', 'spool_location_events_append_only', 'append-only trigger exists');
select ok(has_table_privilege('authenticated', 'public.spool_location_events', 'SELECT'), 'authenticated may select through RLS');
select ok(not has_table_privilege('authenticated', 'public.spool_location_events', 'INSERT'), 'authenticated cannot insert directly');
select ok(not has_table_privilege('authenticated', 'public.spool_location_events', 'UPDATE'), 'authenticated cannot update history');
select ok(not has_table_privilege('authenticated', 'public.spool_location_events', 'DELETE'), 'authenticated cannot delete history');

select lives_ok($$insert into public.spool_location_events(id, project_id, spool_id, spool_revision_id, location_id, device_id, operator_membership_id, direction, occurred_at, source, source_event_key, recorded_by)
  values ('60000000-0000-0000-0000-000000000810', '30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000810', '41000000-0000-0000-0000-000000000810', '42000000-0000-0000-0000-000000000810', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'in', '2026-08-01T08:00:00Z', 'manual', 'schema-valid', '10000000-0000-0000-0000-000000000810')$$, 'valid same-project event is accepted');
select throws_ok($$insert into public.spool_location_events(project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, recorded_by)
  values ('30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000810', '41000000-0000-0000-0000-000000000811', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'in', now(), 'manual', '10000000-0000-0000-0000-000000000810')$$, '23503', null, 'cross-project location is rejected');
select throws_ok($$insert into public.spool_location_events(project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, recorded_by)
  values ('30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000811', '41000000-0000-0000-0000-000000000810', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'in', now(), 'manual', '10000000-0000-0000-0000-000000000810')$$, '23503', null, 'revision snapshot must belong to the stable spool');
select lives_ok($$insert into public.spool_location_events(id, project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, source_event_key, compensates_event_id, reason, recorded_by)
  values ('60000000-0000-0000-0000-000000000811', '30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000810', '41000000-0000-0000-0000-000000000810', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'manual', '2026-08-01T08:05:00Z', 'compensation', 'schema-compensation', '60000000-0000-0000-0000-000000000810', 'Corrected scan', '10000000-0000-0000-0000-000000000810')$$, 'a correction is a new compensating event');
select throws_ok($$insert into public.spool_location_events(project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, compensates_event_id, reason, recorded_by)
  values ('30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000810', '41000000-0000-0000-0000-000000000810', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'manual', now(), 'compensation', '60000000-0000-0000-0000-000000000810', 'Second correction', '10000000-0000-0000-0000-000000000810')$$, '23505', null, 'one event cannot be compensated twice');
select throws_ok($$update public.spool_location_events set reason = 'mutated' where id = '60000000-0000-0000-0000-000000000810'$$, 'PQS09', null, 'business history cannot be updated');
select throws_ok($$insert into public.spool_location_events(project_id, spool_id, spool_revision_id, location_id, operator_membership_id, direction, occurred_at, source, recorded_by)
  values ('30000000-0000-0000-0000-000000000810', '52000000-0000-0000-0000-000000000810', '53000000-0000-0000-0000-000000000810', '41000000-0000-0000-0000-000000000810', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000810' and user_id = '10000000-0000-0000-0000-000000000810'), 'in', now(), 'scan_import', '10000000-0000-0000-0000-000000000810')$$, '23514', null, 'scan-import provenance requires an import job');

select * from finish();
rollback;
