begin;
select plan(9);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000511', 'authenticated', 'authenticated', 'weld.platform@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000511';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000511', 'WLD-A', 'Welding A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000511');
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'ISO-0511');
insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SP-0511-A');
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'W-0511-01');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, accepted_at)
values ('42000000-0000-0000-0000-000000000511', '40000000-0000-0000-0000-000000000511', 'R0', 1, 'accepted', now());
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000511', '41000000-0000-0000-0000-000000000511', '42000000-0000-0000-0000-000000000511', 1, 'A1');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000511', '46000000-0000-0000-0000-000000000511', '43000000-0000-0000-0000-000000000511', 'shop', 6, 12);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000511', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000511","role":"authenticated"}', true);

select has_table('public', 'weld_progress_records', 'weld_progress_records table exists');
select has_table('public', 'weld_point_assignments', 'weld_point_assignments table exists');
select has_table('public', 'nde_obligations', 'nde_obligations table exists');
select has_table('public', 'pwht_requirements', 'pwht_requirements table exists');
select is(relrowsecurity, true, 'weld_progress_records has RLS')
from pg_class where oid = 'public.weld_progress_records'::regclass;
select is(has_table_privilege('authenticated', 'public.weld_progress_records', 'UPDATE'), false,
  'authenticated cannot update weld progress directly');
select is(has_table_privilege('authenticated', 'public.nde_obligations', 'INSERT'), false,
  'authenticated cannot insert obligations directly');
select is((public.weld_joint_context('47000000-0000-0000-0000-000000000511')).weld_location, 'shop',
  'the weld context resolves the joint location');
select is((public.weld_joint_context('47000000-0000-0000-0000-000000000511')).project_id,
  '30000000-0000-0000-0000-000000000511'::uuid, 'the weld context resolves the project');

select * from finish();
rollback;
