begin;
select plan(5);

-- 1. Test profiles.email cannot be updated by authenticated role
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000001',
  'email', 'test@example.com'
)::text, true);

select throws_ok(
  $$update public.profiles set email = 'hacked@example.com' where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated role cannot update profiles.email'
);

-- 2. Test TRUNCATE on project_memberships is rejected for authenticated role
select throws_ok(
  $$truncate table public.project_memberships$$,
  '42501',
  null,
  'authenticated role cannot truncate project_memberships'
);

-- 3. Test TRUNCATE on membership_subcontractor_scopes is rejected for authenticated role
select throws_ok(
  $$truncate table public.membership_subcontractor_scopes$$,
  '42501',
  null,
  'authenticated role cannot truncate membership_subcontractor_scopes'
);

-- Reset role to superuser for schema inspection
reset role;

-- 4. Test legacy policies are dropped from project_subcontractors
select is_empty(
  $$select policyname from pg_policies where tablename = 'project_subcontractors' and policyname in ('project_subcontractors_members_read', 'project_subcontractors_admins_write')$$,
  'legacy permissive policies are dropped from project_subcontractors'
);

-- 5. Test unique index profiles_email_lower_idx exists
select ok(
  exists(
    select 1 from pg_indexes
    where tablename = 'profiles' and indexname = 'profiles_email_lower_idx'
  ),
  'profiles_email_lower_idx exists'
);

select * from finish();
rollback;
