begin;
select plan(15);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000411', 'authenticated', 'authenticated', 'rev.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000412', 'authenticated', 'authenticated', 'rev.admin.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000413', 'authenticated', 'authenticated', 'rev.admin.b@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000411';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000411', 'REV-A', 'Revision A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000411'),
  ('30000000-0000-0000-0000-000000000412', 'REV-B', 'Revision B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000411');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', '10000000-0000-0000-0000-000000000412', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000412', '30000000-0000-0000-0000-000000000412', '10000000-0000-0000-0000-000000000413', 'system_admin', 'project_admin', true);

-- Definition graph for project A
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', 'ISO-0411');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', 'SP-0411-A');

insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, accepted_at)
values ('42000000-0000-0000-0000-000000000411', '40000000-0000-0000-0000-000000000411', 'R0', 1, 'accepted', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('43000000-0000-0000-0000-000000000411', '41000000-0000-0000-0000-000000000411', '42000000-0000-0000-0000-000000000411', 1);

select has_table('public', 'revision_change_items', 'revision_change_items table exists');
select has_table('public', 'revision_decisions', 'revision_decisions table exists');
select has_table('public', 'revision_progress_copies', 'revision_progress_copies table exists');

select is(relrowsecurity, true, 'isometric_revisions has RLS')
from pg_class where oid = 'public.isometric_revisions'::regclass;
select is(relrowsecurity, true, 'revision_change_items has RLS')
from pg_class where oid = 'public.revision_change_items'::regclass;

select is(
  has_table_privilege('authenticated', 'public.isometric_revisions', 'INSERT'),
  false,
  'authenticated cannot insert revisions directly'
);
select is(
  has_table_privilege('authenticated', 'public.spool_revisions', 'UPDATE'),
  false,
  'authenticated cannot update spool revisions directly'
);
select is(
  has_table_privilege('authenticated', 'public.revision_decisions', 'DELETE'),
  false,
  'authenticated cannot delete revision decisions directly'
);

-- An accepted revision is still editable by the owning command
select lives_ok(
  $$update public.spool_revisions set weight_kg = 120.5
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'an accepted revision may still be completed by the owning transaction'
);

-- Supersede, then prove immutability
update public.isometric_revisions
set status = 'superseded', superseded_at = now()
where id = '42000000-0000-0000-0000-000000000411';

select throws_ok(
  $$update public.spool_revisions set weight_kg = 999
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded spool revision cannot be updated'
);

select throws_ok(
  $$delete from public.spool_revisions
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded spool revision cannot be deleted'
);

select throws_ok(
  $$update public.isometric_revisions set comment = 'edited'
    where id = '42000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded isometric revision cannot be edited'
);

-- Cross-project read isolation
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000413', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000413","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.isometrics),
  0,
  'project B admin sees no project A isometrics'
);

select is(
  (select count(*)::int from public.isometric_revisions),
  0,
  'project B admin sees no project A revisions'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000412', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000412","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.isometrics),
  1,
  'project A admin sees the project A isometric'
);

select * from finish();
rollback;
