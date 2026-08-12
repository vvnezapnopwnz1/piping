begin;
select plan(17);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000830', 'authenticated', 'authenticated', 'tracking.read@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects(id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000830', 'TRACK-083-A', 'Tracking reads A', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000830'),
  ('30000000-0000-0000-0000-000000000831', 'TRACK-083-B', 'Tracking reads B', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000830')
on conflict (id) do nothing;

insert into public.project_location_categories(id, project_id, code, description)
values ('40000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', 'TRACK', 'Tracking')
on conflict (id) do nothing;
insert into public.project_locations(id, project_id, category_id, code, description, capacity)
values
  ('41000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', '40000000-0000-0000-0000-000000000830', 'LOC-A', 'Location A', 10),
  ('41000000-0000-0000-0000-000000000831', '30000000-0000-0000-0000-000000000830', '40000000-0000-0000-0000-000000000830', 'LOC-B', 'Location B', 2)
on conflict (id) do nothing;
insert into public.project_devices(id, project_id, code, description)
values ('42000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', 'PDA-083', 'PDA')
on conflict (id) do nothing;

insert into public.isometrics(id, project_id, iso_number)
values ('50000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', 'ISO-083')
on conflict (id) do nothing;
insert into public.isometric_revisions(id, isometric_id, revision_number, revision_ordinal, status, created_by, accepted_at)
values ('51000000-0000-0000-0000-000000000830', '50000000-0000-0000-0000-000000000830', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000830', now())
on conflict (id) do nothing;
insert into public.spools(id, project_id, spool_number)
values
  ('52000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', 'SP-083-LOC'),
  ('52000000-0000-0000-0000-000000000831', '30000000-0000-0000-0000-000000000830', 'SP-083-TRANSIT'),
  ('52000000-0000-0000-0000-000000000832', '30000000-0000-0000-0000-000000000830', 'SP-083-ERECTED')
on conflict (id) do nothing;
insert into public.spool_revisions(id, spool_id, isometric_revision_id, sequence_number)
values
  ('53000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000830', '51000000-0000-0000-0000-000000000830', 1),
  ('53000000-0000-0000-0000-000000000831', '52000000-0000-0000-0000-000000000831', '51000000-0000-0000-0000-000000000830', 2),
  ('53000000-0000-0000-0000-000000000832', '52000000-0000-0000-0000-000000000832', '51000000-0000-0000-0000-000000000830', 3)
on conflict (id) do nothing;

insert into public.construction_progress_events(project_id, spool_revision_id, phase, stage, occurred_on, actor_id)
values
  ('30000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000830', 'fabrication', 'start_fab', '2026-07-25', '10000000-0000-0000-0000-000000000830'),
  ('30000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000831', 'fabrication', 'start_fab', '2026-07-25', '10000000-0000-0000-0000-000000000830'),
  ('30000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000832', 'fabrication', 'start_fab', '2026-07-25', '10000000-0000-0000-0000-000000000830'),
  ('30000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000832', 'erection', 'erected', '2026-08-01', '10000000-0000-0000-0000-000000000830');

insert into public.spool_location_events(id, project_id, spool_id, spool_revision_id, location_id, device_id, operator_membership_id, direction, occurred_at, source, source_event_key, compensates_event_id, reason, recorded_by)
values
  ('60000000-0000-0000-0000-000000000830', '30000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000830', '41000000-0000-0000-0000-000000000830', null, (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000830' and user_id = '10000000-0000-0000-0000-000000000830'), 'in', '2026-08-01T08:00:00Z', 'manual', 'read-original', null, null, '10000000-0000-0000-0000-000000000830'),
  ('60000000-0000-0000-0000-000000000831', '30000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000830', '53000000-0000-0000-0000-000000000830', '41000000-0000-0000-0000-000000000831', '42000000-0000-0000-0000-000000000830', (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000830' and user_id = '10000000-0000-0000-0000-000000000830'), 'manual', '2026-08-01T08:05:00Z', 'compensation', 'read-correction', '60000000-0000-0000-0000-000000000830', 'Corrected location', '10000000-0000-0000-0000-000000000830'),
  ('60000000-0000-0000-0000-000000000832', '30000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000831', '53000000-0000-0000-0000-000000000831', '41000000-0000-0000-0000-000000000830', null, (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000830' and user_id = '10000000-0000-0000-0000-000000000830'), 'in', '2026-08-01T09:00:00Z', 'manual', 'read-transit-in', null, null, '10000000-0000-0000-0000-000000000830'),
  ('60000000-0000-0000-0000-000000000833', '30000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000831', '53000000-0000-0000-0000-000000000831', '41000000-0000-0000-0000-000000000830', null, (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000830' and user_id = '10000000-0000-0000-0000-000000000830'), 'out', '2026-08-01T10:00:00Z', 'manual', 'read-transit-out', null, null, '10000000-0000-0000-0000-000000000830'),
  ('60000000-0000-0000-0000-000000000834', '30000000-0000-0000-0000-000000000830', '52000000-0000-0000-0000-000000000832', '53000000-0000-0000-0000-000000000832', '41000000-0000-0000-0000-000000000831', null, (select id from public.project_memberships where project_id = '30000000-0000-0000-0000-000000000830' and user_id = '10000000-0000-0000-0000-000000000830'), 'in', '2026-08-01T11:00:00Z', 'manual', 'read-erected', null, null, '10000000-0000-0000-0000-000000000830');

select has_view('public', 'spool_effective_location_events', 'effective event view exists');
select has_view('public', 'spool_current_location', 'current-location view exists');
select has_view('public', 'spool_tracking_worklist', 'tracking worklist exists');
select has_view('public', 'spool_transit_alerts', 'transit alerts exist');
select has_view('public', 'spool_tracking_inconsistencies', 'inconsistency view exists');
select has_view('public', 'tracking_location_occupancy', 'location occupancy exists');
select has_view('public', 'tracking_device_usage', 'device usage exists');
select ok(not exists (select 1 from (values ('spool_effective_location_events'), ('spool_current_location'), ('spool_tracking_worklist'), ('spool_transit_alerts'), ('spool_tracking_inconsistencies'), ('tracking_location_occupancy'), ('tracking_device_usage')) required(name) where not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = required.name and column_name = 'project_id')), 'every tracking read model exposes project_id');
select results_eq($$select count(*)::bigint from public.spool_effective_location_events where project_id = '30000000-0000-0000-0000-000000000830'$$, $$values (4::bigint)$$, 'compensated original is excluded and correction remains');
select results_eq($$select current_location_code from public.spool_current_location where spool_id = '52000000-0000-0000-0000-000000000830'$$, $$values ('LOC-B'::text)$$, 'correction defines current location');
select results_eq($$select is_in_transit from public.spool_current_location where spool_id = '52000000-0000-0000-0000-000000000831'$$, $$values (true)$$, 'departure produces transit state');
select results_eq($$select count(*)::bigint from public.spool_tracking_worklist where project_id = '30000000-0000-0000-0000-000000000830'$$, $$values (3::bigint)$$, 'worklist counts stable current spools');
select results_eq($$select count(*)::bigint from public.spool_tracking_worklist where project_id = '30000000-0000-0000-0000-000000000830' and is_active$$, $$values (2::bigint)$$, 'erected spool is excluded from active count');
select results_eq($$select count(*)::bigint from public.spool_transit_alerts where project_id = '30000000-0000-0000-0000-000000000830' and is_overdue$$, $$values (1::bigint)$$, 'existing project transit threshold drives overdue alert');
select results_eq($$select current_count from public.tracking_location_occupancy where location_id = '41000000-0000-0000-0000-000000000831'$$, $$values (1::bigint)$$, 'occupancy counts active current locations and excludes erected spools');
select results_eq($$select scan_count from public.tracking_device_usage where device_id = '42000000-0000-0000-0000-000000000830'$$, $$values (1::bigint)$$, 'device usage is derived from effective events');
select results_eq($$select count(*)::bigint from public.spool_tracking_worklist where project_id = '30000000-0000-0000-0000-000000000831'$$, $$values (0::bigint)$$, 'project filter cannot leak another project');

select * from finish();
rollback;
