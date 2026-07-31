begin;
select plan(7);

-- Ensure test user and profile exist. Use an email unique to this test file so the
-- fixture bootstrap script cannot collide with it via users_email_partial_key.
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000023',
  'authenticated',
  'authenticated',
  'track02.blockers-fix@example.test',
  'not-used',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles(id, email, full_name, is_platform_admin)
values ('00000000-0000-0000-0000-000000000023', 'track02.blockers-fix@example.test', 'Blockers Fix Admin', true)
on conflict (id) do update set is_platform_admin = true;

-- Create Project A and Project B as superuser / migration role
insert into public.projects(id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'PROJ-BLOCKER-A', 'Project A', 'Owner A', 'Contractor A', 1, '00000000-0000-0000-0000-000000000023'),
  ('b0000000-0000-0000-0000-000000000002', 'PROJ-BLOCKER-B', 'Project B', 'Owner B', 'Contractor B', 1, '00000000-0000-0000-0000-000000000023');

-- Subcontractor in Project A and Subcontractor in Project B
insert into public.project_subcontractors(id, project_id, code, description)
values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SUB-A', 'Subcontractor A'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'SUB-B', 'Subcontractor B');

-- Line Service in Project A and Project B
insert into public.project_line_services(id, project_id, code, description)
values
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'LS-A', 'Line Service A'),
  ('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'LS-B', 'Line Service B');

-- Set authenticated user context
select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000023',
  'email', 'track02.blockers-fix@example.test'
)::text, true);
set local role authenticated;

-- ----------------------------------------------------
-- B1. CROSS-PROJECT TRIGGER TESTS
-- ----------------------------------------------------

-- PDS Area in Project A pointing to Subcontractor in Project B MUST FAIL
select throws_ok(
  $$
    insert into public.project_pds_areas(project_id, code, description, field_subcontractor_id)
    values ('a0000000-0000-0000-0000-000000000001', 'PDS-CROSS', 'Cross-project PDS', 'b1000000-0000-0000-0000-000000000002');
  $$,
  '23503',
  NULL,
  'PDS area cannot use subcontractor from another project'
);

-- RAL Code in Project A pointing to Line Service in Project B MUST FAIL
select throws_ok(
  $$
    insert into public.project_ral_codes(project_id, line_service_id, color_code, ral_code)
    values ('a0000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002', 'BLUE', 'RAL-5010');
  $$,
  '23503',
  NULL,
  'RAL code cannot use line service from another project'
);

-- Valid same-project PDS area MUST SUCCEED
select lives_ok(
  $$
    insert into public.project_pds_areas(project_id, code, description, field_subcontractor_id)
    values ('a0000000-0000-0000-0000-000000000001', 'PDS-VALID', 'Valid PDS', 'a1000000-0000-0000-0000-000000000001');
  $$,
  'Same-project PDS area insertion succeeds'
);

-- ----------------------------------------------------
-- B2. PROGRESS WEIGHTS MULTIPLE SAVES TEST
-- ----------------------------------------------------

-- First save
select lives_ok(
  $$
    select * from public.set_project_progress_weights(
      'a0000000-0000-0000-0000-000000000001',
      'prefabrication',
      '[{"activity": "FIT_UP", "weight": 40}, {"activity": "WELDING", "weight": 60}]'::jsonb
    );
  $$,
  'First progress weights save succeeds'
);

-- Second save with same activities (MUST NOT fail with duplicate key error)
select lives_ok(
  $$
    select * from public.set_project_progress_weights(
      'a0000000-0000-0000-0000-000000000001',
      'prefabrication',
      '[{"activity": "FIT_UP", "weight": 30}, {"activity": "WELDING", "weight": 70}]'::jsonb
    );
  $$,
  'Second progress weights save with same activities succeeds'
);

-- Verify count of active rows is 2 and count of archived rows is 2
select is(
  (select count(*)::int from public.project_progress_weights where project_id = 'a0000000-0000-0000-0000-000000000001' and status = 'active'),
  2,
  'Two active weight rows remain after second save'
);

select is(
  (select count(*)::int from public.project_progress_weights where project_id = 'a0000000-0000-0000-0000-000000000001' and status = 'archived'),
  2,
  'Two archived weight rows exist from previous save'
);

select * from finish();
rollback;
