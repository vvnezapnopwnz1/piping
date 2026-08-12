begin;

select plan(13);

select has_table('public', 'roles', 'role catalog exists');
select has_table('public', 'capabilities', 'capability catalog exists');
select has_table('public', 'role_capabilities', 'role grants exist');
select has_table(
  'public',
  'project_membership_functional_roles',
  'memberships support several functional roles'
);
select has_column(
  'public',
  'project_memberships',
  'access_role_code',
  'membership has one access role'
);
select col_not_null(
  'public',
  'project_memberships',
  'access_role_code',
  'access role is required after backfill'
);
select results_eq(
  $$select count(*)::bigint from public.roles where kind = 'access'$$,
  array[5::bigint],
  'five manual project access roles are seeded'
);
select results_eq(
  $$select count(*)::bigint from public.roles where kind = 'functional'$$,
  array[7::bigint],
  'seven initial functional roles are seeded'
);
select results_eq(
  $$select count(*)::bigint from public.capabilities$$,
  array[28::bigint],
  'canonical capability catalog is seeded'
);
select is(
  public.legacy_access_role('project_manager'),
  'project_reader',
  'legacy project manager receives Reader ceiling'
);
select is(
  public.legacy_functional_role('project_manager'),
  'project_manager',
  'legacy project manager keeps its functional persona'
);
select is(
  public.legacy_access_role('subcontractor'),
  'subcontractor',
  'legacy subcontractor keeps restricted access'
);
select is(
  public.legacy_functional_role('subcontractor'),
  null::text,
  'legacy subcontractor receives no guessed functional capability'
);

select * from finish();

rollback;
