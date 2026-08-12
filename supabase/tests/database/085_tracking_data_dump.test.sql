begin;
select plan(9);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000850', 'authenticated', 'authenticated', 'tracking.dump.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000851', 'authenticated', 'authenticated', 'tracking.dump.operator@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000852', 'authenticated', 'authenticated', 'tracking.dump.reader@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
update public.profiles set full_name = 'Dump Operator' where id = '10000000-0000-0000-0000-000000000851';
insert into public.projects(id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000850', 'TRACK-085-A', 'Tracking dump A', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000850'),
  ('30000000-0000-0000-0000-000000000851', 'TRACK-085-B', 'Tracking dump B', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000850')
on conflict (id) do nothing;
insert into public.project_memberships(id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000851', '30000000-0000-0000-0000-000000000850', '10000000-0000-0000-0000-000000000851', 'qc_engineer', 'project_editor', true),
  ('20000000-0000-0000-0000-000000000852', '30000000-0000-0000-0000-000000000850', '10000000-0000-0000-0000-000000000852', 'project_manager', 'project_reader', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.project_location_categories(id, project_id, code, description)
values
  ('40000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', 'YARD-A', 'Yard A'),
  ('40000000-0000-0000-0000-000000000851', '30000000-0000-0000-0000-000000000851', 'YARD-B', 'Yard B')
on conflict (id) do nothing;
insert into public.project_locations(id, project_id, category_id, code, description, capacity)
values
  ('41000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', '40000000-0000-0000-0000-000000000850', 'LOC-085-A', 'Location A', 10),
  ('41000000-0000-0000-0000-000000000851', '30000000-0000-0000-0000-000000000851', '40000000-0000-0000-0000-000000000851', 'LOC-085-B', 'Location B', 10)
on conflict (id) do nothing;
insert into public.project_devices(id, project_id, code, description)
values ('42000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', 'PDA-085', 'PDA')
on conflict (id) do nothing;
insert into public.project_device_users(id, project_id, membership_id, device_id)
values ('43000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', '20000000-0000-0000-0000-000000000851', '42000000-0000-0000-0000-000000000850')
on conflict (project_id, membership_id) do update set device_id = excluded.device_id, status = 'active';

insert into public.isometrics(id, project_id, iso_number)
values ('50000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', 'ISO-085')
on conflict (id) do nothing;
insert into public.isometric_revisions(id, isometric_id, revision_number, revision_ordinal, status, created_by, accepted_at)
values ('51000000-0000-0000-0000-000000000850', '50000000-0000-0000-0000-000000000850', 'A', 1, 'accepted', '10000000-0000-0000-0000-000000000850', now())
on conflict (id) do nothing;
insert into public.spools(id, project_id, spool_number)
values ('52000000-0000-0000-0000-000000000850', '30000000-0000-0000-0000-000000000850', 'SP-085')
on conflict (id) do nothing;
insert into public.spool_revisions(id, spool_id, isometric_revision_id)
values ('53000000-0000-0000-0000-000000000850', '52000000-0000-0000-0000-000000000850', '51000000-0000-0000-0000-000000000850')
on conflict (id) do nothing;
insert into public.construction_progress_events(project_id, spool_revision_id, phase, stage, occurred_on, actor_id)
values ('30000000-0000-0000-0000-000000000850', '53000000-0000-0000-0000-000000000850', 'fabrication', 'start_fab', '2026-08-01', '10000000-0000-0000-0000-000000000850');

select has_function('public', 'get_tracking_data_dump', array['uuid'], 'tracking data-dump RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000852', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000852","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850')$$, '42501', null, 'reader cannot export tracking data');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000850', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000850","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850')$$, 'administrator can export tracking data');
select results_eq($$select (public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850') ?& array['active_spools','sub_locations','pda_users'])$$, $$values (true)$$, 'dump exposes the three manual files');
select results_eq($$select jsonb_array_length(public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850') -> 'active_spools')$$, $$values (1)$$, 'dump contains active stable spools');
select results_eq($$select jsonb_array_length(public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850') -> 'sub_locations')$$, $$values (1)$$, 'dump contains project sub-locations');
select results_eq($$select jsonb_array_length(public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850') -> 'pda_users')$$, $$values (1)$$, 'dump contains assigned PDA users');
select results_eq($$select public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850') #>> '{pda_users,0,email}'$$, $$values ('tracking.dump.operator@example.test'::text)$$, 'PDA user profile is resolved inside the RPC');
select results_eq($$select position('LOC-085-B' in public.get_tracking_data_dump('30000000-0000-0000-0000-000000000850')::text)$$, $$values (0)$$, 'another project is absent from the dump');

reset role;
select * from finish();
rollback;
