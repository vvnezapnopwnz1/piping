begin;
select plan(9);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000880', 'authenticated', 'authenticated', 'tracking.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000881', 'authenticated', 'authenticated', 'tracking.reader@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000882', 'authenticated', 'authenticated', 'tracking.operator@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

update public.profiles
set full_name = case id
  when '10000000-0000-0000-0000-000000000880' then 'Tracking Admin'
  when '10000000-0000-0000-0000-000000000881' then 'Tracking Reader'
  else 'Tracking Operator'
end
where id in (
  '10000000-0000-0000-0000-000000000880',
  '10000000-0000-0000-0000-000000000881',
  '10000000-0000-0000-0000-000000000882'
);

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000880', 'TRACK-080-A', 'Tracking A', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000880'),
  ('30000000-0000-0000-0000-000000000881', 'TRACK-080-B', 'Tracking B', 'Owner', 'Contractor', 2, '10000000-0000-0000-0000-000000000880')
on conflict (id) do nothing;

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000880', '30000000-0000-0000-0000-000000000880', '10000000-0000-0000-0000-000000000880', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000881', '30000000-0000-0000-0000-000000000880', '10000000-0000-0000-0000-000000000881', 'project_manager', 'project_reader', true),
  ('20000000-0000-0000-0000-000000000882', '30000000-0000-0000-0000-000000000880', '10000000-0000-0000-0000-000000000882', 'qc_engineer', 'project_editor', true)
on conflict (project_id, user_id) do update
set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;

insert into public.project_location_categories (id, project_id, code, description)
values ('40000000-0000-0000-0000-000000000880', '30000000-0000-0000-0000-000000000880', 'YARD', 'Laydown yard')
on conflict (id) do nothing;

insert into public.project_devices (id, project_id, code, description)
values ('41000000-0000-0000-0000-000000000880', '30000000-0000-0000-0000-000000000880', 'PDA-080', 'Tracking PDA')
on conflict (id) do nothing;

insert into public.project_device_users (id, project_id, membership_id, device_id)
values ('42000000-0000-0000-0000-000000000880', '30000000-0000-0000-0000-000000000880', '20000000-0000-0000-0000-000000000882', '41000000-0000-0000-0000-000000000880')
on conflict (project_id, membership_id) do update set device_id = excluded.device_id;

select has_column('public', 'project_locations', 'capacity', 'tracking locations expose capacity');
select col_type_is('public', 'project_locations', 'capacity', 'integer', 'capacity is an integer');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.project_locations'::regclass
      and pg_get_constraintdef(oid) like '%capacity > 0%'
  ),
  'capacity has a positive-value constraint'
);
select lives_ok(
  $$insert into public.project_locations(project_id, category_id, code, description, capacity)
    values ('30000000-0000-0000-0000-000000000880', '40000000-0000-0000-0000-000000000880', 'YARD-01', 'Yard 1', 25)$$,
  'positive capacity is accepted'
);
select throws_ok(
  $$insert into public.project_locations(project_id, category_id, code, description, capacity)
    values ('30000000-0000-0000-0000-000000000880', '40000000-0000-0000-0000-000000000880', 'YARD-00', 'Invalid yard', 0)$$,
  '23514',
  null,
  'zero capacity is rejected'
);
select has_function(
  'public',
  'list_tracking_device_user_candidates',
  array['uuid'],
  'tracking device-user candidate RPC exists'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000880', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000880","role":"authenticated"}', true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.list_tracking_device_user_candidates('30000000-0000-0000-0000-000000000880')$$,
  $$values (3::bigint)$$,
  'administrator sees only active candidates from the requested project'
);
select results_eq(
  $$select device_code from public.list_tracking_device_user_candidates('30000000-0000-0000-0000-000000000880') where membership_id = '20000000-0000-0000-0000-000000000882'$$,
  $$values ('PDA-080'::text)$$,
  'candidate rows include the current device assignment'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000881', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000881","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select * from public.list_tracking_device_user_candidates('30000000-0000-0000-0000-000000000880')$$,
  '42501',
  null,
  'reader cannot enumerate device-user candidates'
);

reset role;
select * from finish();
rollback;
