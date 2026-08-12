begin;

select plan(12);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000901', 'authenticated', 'authenticated', 'flange.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000902', 'authenticated', 'authenticated', 'flange.admin@example.test', 'not-used', now(), now(), now())
on conflict (id) do nothing;

update public.profiles
set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000901';

insert into public.projects(
  id, activity_code, title, owner_name, contractor_name,
  maximum_transit_time_days, created_by
)
values (
  '30000000-0000-0000-0000-000000000901', 'FLANGE-090', 'Flange referentials',
  'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000901'
)
on conflict (id) do nothing;

insert into public.projects(
  id, activity_code, title, owner_name, contractor_name,
  maximum_transit_time_days, created_by
)
values (
  '30000000-0000-0000-0000-000000000902', 'FLANGE-090-B', 'Flange other project',
  'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000901'
)
on conflict (id) do nothing;

insert into public.project_memberships(
  id, project_id, user_id, role, access_role_code, is_active
)
values (
  '20000000-0000-0000-0000-000000000901',
  '30000000-0000-0000-0000-000000000901',
  '10000000-0000-0000-0000-000000000902',
  'system_admin', 'project_admin', true
)
on conflict (id) do nothing;

select has_column(
  'public', 'system_ut_calculation_rules', 'flange_rating',
  'UT rules have an optional flange rating dimension'
);
select has_index(
  'public', 'system_ut_calculation_rules',
  'system_ut_calculation_rules_flange_lookup_idx',
  'UT rules have a rating-aware lookup index'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000901', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000901","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.system_reference_entries(kind, code, description, status)
    values ('torquing_requirement', 'TORQUE-090', 'Manual torqueing', 'active')$$,
  'platform admin can create a torquing requirement'
);
select lives_ok(
  $$insert into public.system_ut_calculation_rules(
      diameter_from_inch, diameter_to_inch, flange_rating,
      coefficient_diameter, coefficient_rating
    ) values (2, 4, null, 0.5, 1.2)$$,
  'platform admin can create a wildcard UT rule'
);
select lives_ok(
  $$insert into public.system_ut_calculation_rules(
      diameter_from_inch, diameter_to_inch, flange_rating,
      coefficient_diameter, coefficient_rating
    ) values (2, 4, '150#', 0.5, 1.3)$$,
  'platform admin can create a rating-specific UT rule'
);
select throws_ok(
  $$insert into public.system_ut_calculation_rules(
      diameter_from_inch, diameter_to_inch, flange_rating,
      coefficient_diameter, coefficient_rating
    ) values (2, 4, ' 150# ', 0.5, 1.3)$$,
  '23505', null,
  'duplicate normalized rating-specific UT rule is rejected'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000902', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000902","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$insert into public.system_reference_entries(kind, code, description, status)
    values ('torquing_requirement', 'TORQUE-090-BAD', 'Should fail', 'active')$$,
  '42501', null,
  'ordinary project admin cannot create global torquing requirements'
);
select throws_ok(
  $$insert into public.system_ut_calculation_rules(
      diameter_from_inch, diameter_to_inch, flange_rating,
      coefficient_diameter, coefficient_rating
    ) values (6, 8, null, 0.5, 1.2)$$,
  '42501', null,
  'ordinary project admin cannot create global UT rules'
);
select lives_ok(
  $$insert into public.project_unit_time_references(
      project_id, activity, project_ut, standard_reference
    ) values ('30000000-0000-0000-0000-000000000901', 'FLANGE_JOINTING', 12, 'STD-090')$$,
  'project admin can create a same-project flange unit-time reference'
);
select throws_ok(
  $$insert into public.project_unit_time_references(
      project_id, activity, project_ut, standard_reference
    ) values ('30000000-0000-0000-0000-000000000902', 'FLANGE_JOINTING', 12, 'STD-090-BAD')$$,
  '42501', null,
  'project admin cannot create a cross-project unit-time reference'
);

reset role;
select results_eq(
  $$select count(*)::int from public.system_ut_calculation_rules
    where diameter_from_inch = 2 and diameter_to_inch = 4 and flange_rating is null$$,
  array[1],
  'wildcard UT rule remains represented by a null rating'
);
select results_eq(
  $$select count(*)::int from public.system_ut_calculation_rules
    where diameter_from_inch = 2 and diameter_to_inch = 4$$,
  array[2],
  'wildcard and rating-specific UT rules coexist'
);

select * from finish();
rollback;
