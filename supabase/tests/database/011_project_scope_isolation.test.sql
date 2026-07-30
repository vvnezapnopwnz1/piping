begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'qc@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'reader@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'nde-sub@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'inactive@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'outside@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'admin@example.test', 'not-used', now(), now(), now());

update public.profiles
set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000001';

insert into public.projects (
  id,
  activity_code,
  title,
  owner_name,
  contractor_name,
  maximum_transit_time_days,
  created_by
)
values
  ('30000000-0000-0000-0000-000000000001', 'PQ-A', 'Project A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'PQ-B', 'Project B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000001');

insert into public.project_memberships (
  id,
  project_id,
  user_id,
  role,
  access_role_code,
  is_active
)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'qc_engineer', 'project_editor', true),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'qc_engineer', 'project_reader', true),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'subcontractor', 'subcontractor', true),
  ('20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'qc_engineer', 'project_editor', false),
  ('20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'system_admin', 'project_admin', true);

insert into public.project_membership_functional_roles (membership_id, role_code)
values
  ('20000000-0000-0000-0000-000000000001', 'qc_engineer'),
  ('20000000-0000-0000-0000-000000000002', 'qc_engineer'),
  ('20000000-0000-0000-0000-000000000003', 'nde_inspector');

insert into public.project_subcontractors (id, project_id, code, description)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SUB-A', 'Subcontractor A'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'SUB-B', 'Subcontractor B'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'SUB-C', 'Subcontractor C');

insert into public.project_pds_areas (id, project_id, code, description)
values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PDS-A', 'PDS Area A'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'PDS-B', 'PDS Area B');

insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id)
values ('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001');

insert into public.membership_pds_area_scopes (membership_id, pds_area_id)
values ('20000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001');

select plan(32);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select ok(
  public.current_user_has_capability('30000000-0000-0000-0000-000000000001', 'system_referential.manage'),
  'platform administrator has global capability without a membership'
);
select lives_ok(
  $$select * from public.get_project_access_matrix('30000000-0000-0000-0000-000000000001')$$,
  'platform administrator can load a project access matrix'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000007', true);
set local role authenticated;
select lives_ok(
  $$select public.add_project_member_by_email(
    '30000000-0000-0000-0000-000000000001',
    'outside@example.test',
    'project_editor',
    array['qc_engineer'],
    array[]::uuid[],
    array[]::uuid[]
  )$$,
  'Project Admin can add an existing profile by exact email'
);
select results_eq(
  $$
    select access_role_code
    from public.project_memberships
    where project_id = '30000000-0000-0000-0000-000000000001'
      and user_id = '10000000-0000-0000-0000-000000000006'
  $$,
  array['project_editor'::text],
  'access command stores requested access role'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.audit_events
    where project_id = '30000000-0000-0000-0000-000000000001'
      and actor_id = '10000000-0000-0000-0000-000000000007'
      and entity_type = 'project_membership'
      and action = 'membership.created'
  $$,
  array[1::bigint],
  'membership command writes one audit event'
);
select lives_ok(
  $$select public.update_project_member_access(
    (select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'),
    'subcontractor',
    array['nde_inspector'],
    array['40000000-0000-0000-0000-000000000001'::uuid],
    array['50000000-0000-0000-0000-000000000001'::uuid]
  )$$,
  'Project Admin can change a membership to scoped subcontractor access'
);
select lives_ok(
  $$select public.update_project_member_access(
    (select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'),
    'project_reader',
    array[]::text[],
    array['40000000-0000-0000-0000-000000000001'::uuid],
    array['50000000-0000-0000-0000-000000000001'::uuid]
  )$$,
  'changing away from Subcontractor accepts no scopes'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.membership_subcontractor_scopes
    where membership_id = (select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006')
  $$,
  array[0::bigint],
  'changing away from Subcontractor clears subcontractor scopes'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.membership_pds_area_scopes
    where membership_id = (select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006')
  $$,
  array[0::bigint],
  'changing away from Subcontractor clears PDS scopes'
);
select throws_ok(
  $$select public.add_project_member_by_email('30000000-0000-0000-0000-000000000001', 'missing@example.test', 'project_reader', array[]::text[], array[]::uuid[], array[]::uuid[])$$,
  'PQC01',
  'Profile email was not found or is ambiguous',
  'unknown email has a stable application error'
);
select throws_ok(
  $$select public.update_project_member_access((select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'), 'qc_engineer', array[]::text[], array[]::uuid[], array[]::uuid[])$$,
  'PQC02',
  'Requested access role is invalid',
  'functional role cannot be used as an access role'
);
select throws_ok(
  $$select public.update_project_member_access((select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'), 'subcontractor', array['nde_inspector'], array[]::uuid[], array[]::uuid[])$$,
  'PQC03',
  'Subcontractor requires functional role and both scopes',
  'Subcontractor without both scopes is rejected'
);
select throws_ok(
  $$select public.update_project_member_access((select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'), 'subcontractor', array['nde_inspector'], array['40000000-0000-0000-0000-000000000003'::uuid], array['50000000-0000-0000-0000-000000000001'::uuid])$$,
  'PQC04',
  'Scope ID belongs to another project or does not exist',
  'cross-project scope is rejected'
);
select throws_ok(
  $$select public.update_project_member_access('20000000-0000-0000-0000-000000000005', 'project_reader', array[]::text[], array[]::uuid[], array[]::uuid[])$$,
  '42501',
  'Non-platform users cannot modify their own membership',
  'non-platform Project Admin cannot modify their own membership'
);
select ok(not has_table_privilege('authenticated', 'public.project_memberships', 'INSERT'), 'authenticated cannot insert memberships directly');
select ok(not has_table_privilege('authenticated', 'public.project_membership_functional_roles', 'INSERT'), 'authenticated cannot insert functional roles directly');
select ok(not has_table_privilege('authenticated', 'public.membership_subcontractor_scopes', 'INSERT'), 'authenticated cannot insert subcontractor scopes directly');
select ok(not has_table_privilege('authenticated', 'public.membership_pds_area_scopes', 'INSERT'), 'authenticated cannot insert PDS scopes directly');
select lives_ok(
  $$select public.set_project_member_active((select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006'), false)$$,
  'Project Admin can deactivate another project member'
);
select results_eq(
  $$
    select count(*)::bigint from public.audit_events
    where entity_id = (select id from public.project_memberships where user_id = '10000000-0000-0000-0000-000000000006')
      and action = 'membership.deactivated'
      and before_state is not null
      and after_state is not null
  $$,
  array[1::bigint],
  'deactivation writes an audit event with before and after state'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$select public.get_project_access_matrix('30000000-0000-0000-0000-000000000001')$$,
  '42501',
  'Access rights management is required',
  'Reader cannot load the project access matrix'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select ok(
  public.current_user_has_capability('30000000-0000-0000-0000-000000000001', 'fabrication.progress.record'),
  'QC editor receives fabrication mutation capability'
);
select ok(
  not public.current_user_has_capability('30000000-0000-0000-0000-000000000001', 'access_rights.manage'),
  'QC editor cannot manage access rights'
);
select ok(
  not public.current_user_has_capability('30000000-0000-0000-0000-000000000002', 'fabrication.progress.record'),
  'Project A membership does not grant Project B capability'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select ok(
  not public.current_user_has_capability('30000000-0000-0000-0000-000000000001', 'fabrication.progress.record'),
  'Reader cannot write even with QC functional role'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select ok(
  public.current_user_has_capability('30000000-0000-0000-0000-000000000001', 'nde.result.record'),
  'scoped NDE subcontractor receives assigned functional capability'
);
select ok(
  public.current_user_in_subcontractor_scope('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  'subcontractor is in its own subcontractor scope'
);
select ok(
  not public.current_user_in_subcontractor_scope('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002'),
  'subcontractor is outside another subcontractor scope'
);
select ok(
  not public.current_user_in_pds_scope('30000000-0000-0000-0000-000000000001', null),
  'subcontractor fails closed for a missing PDS area'
);
select results_eq(
  $$select code from public.project_subcontractors order by code$$,
  array['SUB-A'::text],
  'subcontractor reads only its scoped subcontractor row'
);
select results_eq(
  $$select code from public.project_pds_areas order by code$$,
  array['PDS-A'::text],
  'subcontractor reads only its scoped PDS row'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select results_eq(
  $$
    select activity_code
    from public.list_current_user_projects()
    where activity_code in ('PQ-A', 'PQ-B')
    order by activity_code
  $$,
  array['PQ-A'::text, 'PQ-B'::text],
  'platform administrator lists active projects without memberships'
);
reset role;

select * from finish();

rollback;
