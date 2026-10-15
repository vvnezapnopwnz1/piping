begin;
select plan(3);

-- Two projects; the reader of the second must not see candidates of a batch in the first.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('10000000-0000-0000-0000-000000001141', 'authenticated', 'authenticated', 'nde.owner@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001142', 'authenticated', 'authenticated', 'nde.outsider@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by) values
  ('30000000-0000-0000-0000-000000001141', 'NDE-ACCESS-A', 'NDE access A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001141'),
  ('30000000-0000-0000-0000-000000001142', 'NDE-ACCESS-B', 'NDE access B', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001142')
on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active) values
  ('20000000-0000-0000-0000-000000001141', '30000000-0000-0000-0000-000000001141', '10000000-0000-0000-0000-000000001141', 'qc_engineer', 'project_admin', true),
  ('20000000-0000-0000-0000-000000001142', '30000000-0000-0000-0000-000000001142', '10000000-0000-0000-0000-000000001142', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.nde_batches (id, project_id, batch_number, method)
values ('70000000-0000-0000-0000-000000001141', '30000000-0000-0000-0000-000000001141', 'RT-114', 'rt');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001142', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001142","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from public.nde_batch_candidates('70000000-0000-0000-0000-000000001141')$$,
  '42501', null, 'a member of another project cannot read the candidates of a batch');

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001141', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001141","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select * from public.nde_batch_candidates('70000000-0000-0000-0000-000000001141')$$,
  'an NDE member of the batch project reads its candidates');
select is((select count(*)::int from public.nde_batch_candidates('70000000-0000-0000-0000-000000001141')), 0,
  'a batch with no pending obligations has no candidates');

reset role;
select * from finish();
rollback;
