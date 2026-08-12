-- Project creation from the browser. The INSERT policy "authenticated users can create projects"
-- and the add_creator_as_project_admin trigger have existed since the first migration, but no
-- INSERT privilege was ever granted to `authenticated`, so PostgreSQL refused the statement
-- before RLS was ever consulted. These tests pin both halves of the contract.

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
  ('11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'creator@example.test', 'not-used', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'member@example.test', 'not-used', now(), now(), now());

update public.profiles
set is_platform_admin = true
where id = '11000000-0000-0000-0000-000000000001';

select plan(21);

-- The seven fields the Create Project form owns.
select ok(
  has_column_privilege('authenticated', 'public.projects', 'activity_code', 'insert'),
  'authenticated can insert an activity code'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'title', 'insert'),
  'authenticated can insert a title'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'owner_name', 'insert'),
  'authenticated can insert an owner name'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'contractor_name', 'insert'),
  'authenticated can insert a contractor name'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'contract_number', 'insert'),
  'authenticated can insert a contract number'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'maximum_transit_time_days', 'insert'),
  'authenticated can insert a maximum transit time'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'created_by', 'insert'),
  'authenticated can insert the creator the policy checks against auth.uid()'
);

-- Everything the server owns stays on its default. A grant here would let a creator file a
-- project as already archived, or forge its identity and timestamps.
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'id', 'insert'),
  'authenticated cannot choose a project id'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'status', 'insert'),
  'authenticated cannot choose a project status'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'created_at', 'insert'),
  'authenticated cannot backdate a project'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'updated_at', 'insert'),
  'authenticated cannot forge a project update stamp'
);
-- Logos are uploaded to storage and written back by the branding path, never typed into a form.
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'owner_logo_path', 'insert'),
  'authenticated cannot set an owner logo path at creation'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'contractor_logo_path', 'insert'),
  'authenticated cannot set a contractor logo path at creation'
);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.projects (
      activity_code, title, owner_name, contractor_name, contract_number,
      maximum_transit_time_days, created_by
    )
    values (
      'TRACK-SETUP-CHECK', 'Setup check', 'Owner', 'Contractor', 'C-1',
      2, '11000000-0000-0000-0000-000000000001'
    )
  $$,
  'a platform administrator creates a project as itself'
);

select results_eq(
  $$
    select activity_code
    from public.projects
    where activity_code = 'TRACK-SETUP-CHECK'
  $$,
  array['TRACK-SETUP-CHECK'::text],
  'the created project is readable by its creator'
);

select results_eq(
  $$
    select membership.access_role_code
    from public.project_memberships membership
    join public.projects project on project.id = membership.project_id
    where project.activity_code = 'TRACK-SETUP-CHECK'
  $$,
  array['project_admin'::text],
  'the trigger files the creator as Project Admin'
);

select results_eq(
  $$
    select membership.role::text, membership.is_active
    from public.project_memberships membership
    join public.projects project on project.id = membership.project_id
    where project.activity_code = 'TRACK-SETUP-CHECK'
  $$,
  $$ values ('system_admin'::text, true) $$,
  'the creator membership is active with the compatibility role'
);

-- Re-submitting the form must not produce a second project.
select throws_ok(
  $$
    insert into public.projects (
      activity_code, title, owner_name, contractor_name,
      maximum_transit_time_days, created_by
    )
    values (
      'TRACK-SETUP-CHECK', 'Setup check again', 'Owner', 'Contractor',
      2, '11000000-0000-0000-0000-000000000001'
    )
  $$,
  '23505',
  null,
  'a duplicate activity code is refused'
);

-- created_by is what the policy compares to auth.uid(), so it cannot be pointed at someone else.
select throws_ok(
  $$
    insert into public.projects (
      activity_code, title, owner_name, contractor_name,
      maximum_transit_time_days, created_by
    )
    values (
      'TRACK-SETUP-OTHER', 'Filed for someone else', 'Owner', 'Contractor',
      2, '11000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'a platform administrator cannot file a project as another user'
);

reset role;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    insert into public.projects (
      activity_code, title, owner_name, contractor_name,
      maximum_transit_time_days, created_by
    )
    values (
      'TRACK-SETUP-DENIED', 'Not a platform admin', 'Owner', 'Contractor',
      2, '11000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  null,
  'a non-platform user cannot create a project'
);

reset role;

select is_empty(
  $$select 1 from public.projects where activity_code in ('TRACK-SETUP-OTHER', 'TRACK-SETUP-DENIED')$$,
  'no refused project reached the table'
);

select * from finish();
rollback;
