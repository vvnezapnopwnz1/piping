begin;
select plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000401', 'authenticated', 'authenticated', 'eng.platform@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000401';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000401', 'ENG-A', 'Engineering A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000401');

-- Stable tables
select has_table('public', 'isometrics', 'isometrics table exists');
select has_table('public', 'spools', 'spools table exists');
select has_table('public', 'weld_joints', 'weld_joints table exists');
select has_table('public', 'supports', 'supports table exists');
select has_table('public', 'flange_joints', 'flange_joints table exists');

-- Revision tables
select has_table('public', 'isometric_revisions', 'isometric_revisions table exists');
select has_table('public', 'spool_revisions', 'spool_revisions table exists');
select has_table('public', 'weld_joint_revisions', 'weld_joint_revisions table exists');
select has_table('public', 'weld_points', 'weld_points table exists');
select has_table('public', 'support_revisions', 'support_revisions table exists');
select has_table('public', 'flange_joint_revisions', 'flange_joint_revisions table exists');
select has_table('public', 'spool_revision_materials', 'spool_revision_materials table exists');

-- Track 02 already owns Assembly ownership in the PDS mapping; assert, do not rebuild.
select has_column('public', 'project_pds_areas', 'assembly_subcontractor_id',
  'PDS areas carry assembly ownership from Track 02');
select is(
  (select count(*)::int from information_schema.check_constraints
   where constraint_name = 'nde_matrix_rules_weld_location_check'
     and check_clause like '%assembly%'),
  1,
  'nde_matrix_rules accepts the assembly weld location'
);

-- Business identity is unique per project
insert into public.isometrics (project_id, iso_number)
values ('30000000-0000-0000-0000-000000000401', 'ISO-0401');

select throws_ok(
  $$insert into public.isometrics (project_id, iso_number)
    values ('30000000-0000-0000-0000-000000000401', 'ISO-0401')$$,
  '23505',
  null,
  'a project cannot hold two isometrics with the same number'
);

-- Exactly one accepted revision per isometric
insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
select id, 'R0', 1, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401';

select throws_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
    select id, 'R1', 2, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401'$$,
  '23505',
  null,
  'an isometric cannot hold two accepted revisions'
);

-- A superseded revision does not occupy the accepted slot
update public.isometric_revisions
set status = 'superseded', superseded_at = now()
where revision_number = 'R0';

select lives_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
    select id, 'R1', 2, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401'$$,
  'a new revision may be accepted once the previous one is superseded'
);

select throws_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status)
    select id, 'R1', 3, 'draft' from public.isometrics where iso_number = 'ISO-0401'$$,
  '23505',
  null,
  'a revision number cannot repeat inside one isometric'
);

select is(
  (select count(*)::int from public.isometric_revisions where status = 'accepted'),
  1,
  'exactly one accepted revision survives'
);

select is(
  (select revision_number from public.isometric_revisions where status = 'accepted'),
  'R1',
  'the accepted revision is the newest one'
);

select * from finish();
rollback;
