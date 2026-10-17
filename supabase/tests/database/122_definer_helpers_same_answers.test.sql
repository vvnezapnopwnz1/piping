-- N2: the three definer helpers behind material-check, QC13 and flange policies keep their answers.
-- The expectations were taken from the SQL-language versions before they became plpgsql
-- (a SQL function body is re-planned on every call; plpgsql keeps its plan).
begin;
select plan(32);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
 ('10000000-0000-0000-0000-000000001211','authenticated','authenticated','scope.admin.121@example.test','x',now(),now(),now()),
 ('10000000-0000-0000-0000-000000001212','authenticated','authenticated','scope.sub.121@example.test','x',now(),now(),now()),
 ('10000000-0000-0000-0000-000000001213','authenticated','authenticated','scope.reader.121@example.test','x',now(),now(),now()),
 ('10000000-0000-0000-0000-000000001214','authenticated','authenticated','scope.outsider.121@example.test','x',now(),now(),now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001211';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001211','SCOPE-121','Scope 121','Owner','Contractor',1,'10000000-0000-0000-0000-000000001211');
insert into public.project_subcontractors (id, project_id, code, description) values ('50000000-0000-0000-0000-000000001211','30000000-0000-0000-0000-000000001211','SUB-121','Sub');
insert into public.project_pds_areas (id, project_id, code, description) values
 ('56000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','AREA-A','Area A'),
 ('56000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','AREA-B','Area B');
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active) values
 ('20000000-0000-0000-0000-000000001212','30000000-0000-0000-0000-000000001211','10000000-0000-0000-0000-000000001212','system_admin','subcontractor',true),
 ('20000000-0000-0000-0000-000000001213','30000000-0000-0000-0000-000000001211','10000000-0000-0000-0000-000000001213','qc_engineer','project_reader',true);
insert into public.membership_subcontractor_scopes (membership_id, subcontractor_id) values ('20000000-0000-0000-0000-000000001212','50000000-0000-0000-0000-000000001211');
insert into public.membership_pds_area_scopes (membership_id, pds_area_id) values ('20000000-0000-0000-0000-000000001212','56000000-0000-0000-0000-00000000121a');
insert into public.project_membership_functional_roles (membership_id, role_code) values ('20000000-0000-0000-0000-000000001212','spooling_team');
-- Area A and area B, each with one accepted isometric, spool, weld, support, material line, flange joint.
insert into public.isometrics (id, project_id, iso_number) values
 ('40000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','ISO-A'),
 ('40000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','ISO-B');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at) values
 ('42000000-0000-0000-0000-00000000121a','40000000-0000-0000-0000-00000000121a','R0',1,'accepted','56000000-0000-0000-0000-00000000121a',now()),
 ('42000000-0000-0000-0000-00000000121b','40000000-0000-0000-0000-00000000121b','R0',1,'accepted','56000000-0000-0000-0000-00000000121b',now());
insert into public.spools (id, project_id, spool_number) values
 ('41000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','SP-A'),
 ('41000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','SP-B');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number) values
 ('43000000-0000-0000-0000-00000000121a','41000000-0000-0000-0000-00000000121a','42000000-0000-0000-0000-00000000121a',1),
 ('43000000-0000-0000-0000-00000000121b','41000000-0000-0000-0000-00000000121b','42000000-0000-0000-0000-00000000121b',1);
insert into public.weld_joints (id, project_id, weld_number) values
 ('46000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','W-A'),
 ('46000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','W-B');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm) values
 ('47000000-0000-0000-0000-00000000121a','46000000-0000-0000-0000-00000000121a','43000000-0000-0000-0000-00000000121a','shop',6,8),
 ('47000000-0000-0000-0000-00000000121b','46000000-0000-0000-0000-00000000121b','43000000-0000-0000-0000-00000000121b','shop',6,8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number) values
 ('48000000-0000-0000-0000-00000000121a','47000000-0000-0000-0000-00000000121a','root',1),
 ('48000000-0000-0000-0000-00000000121b','47000000-0000-0000-0000-00000000121b','root',1);
insert into public.supports (id, project_id, support_number) values
 ('49000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','SUP-A'),
 ('49000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','SUP-B');
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity) values
 ('4a000000-0000-0000-0000-00000000121a','49000000-0000-0000-0000-00000000121a','43000000-0000-0000-0000-00000000121a','shoe',1),
 ('4a000000-0000-0000-0000-00000000121b','49000000-0000-0000-0000-00000000121b','43000000-0000-0000-0000-00000000121b','shoe',1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number) values
 ('44000000-0000-0000-0000-00000000121a','43000000-0000-0000-0000-00000000121a','IDN-A',1,'ea','H-A'),
 ('44000000-0000-0000-0000-00000000121b','43000000-0000-0000-0000-00000000121b','IDN-B',1,'ea','H-B');
insert into public.flange_joints (id, project_id, flange_number) values
 ('4b000000-0000-0000-0000-00000000121a','30000000-0000-0000-0000-000000001211','F-A'),
 ('4b000000-0000-0000-0000-00000000121b','30000000-0000-0000-0000-000000001211','F-B');
insert into public.flange_joint_revisions (id, flange_joint_id, spool_revision_id) values
 ('4c000000-0000-0000-0000-00000000121a','4b000000-0000-0000-0000-00000000121a','43000000-0000-0000-0000-00000000121a'),
 ('4c000000-0000-0000-0000-00000000121b','4b000000-0000-0000-0000-00000000121b','43000000-0000-0000-0000-00000000121b');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001211', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001211","role":"authenticated"}', true);
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121a'), true, 'a platform admin: fabrication read of spool A is True');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121a'), '30000000-0000-0000-0000-000000001211'::uuid, 'a platform admin: construction project of spool A is 30000000-0000-0000-0000-000000001211');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121a'), true, 'a platform admin: flange PDS scope of area A is True');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121b'), true, 'a platform admin: fabrication read of spool B is True');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121b'), '30000000-0000-0000-0000-000000001211'::uuid, 'a platform admin: construction project of spool B is 30000000-0000-0000-0000-000000001211');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121b'), true, 'a platform admin: flange PDS scope of area B is True');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', gen_random_uuid()), false, 'a platform admin: an unknown spool is never readable');
select is(public.construction_spool_project_id(gen_random_uuid()), null::uuid, 'a platform admin: an unknown spool has no construction project');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001212', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001212","role":"authenticated"}', true);
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121a'), false, 'a PDS-scoped subcontractor: fabrication read of spool A is False');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121a'), null::uuid, 'a PDS-scoped subcontractor: construction project of spool A is None');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121a'), true, 'a PDS-scoped subcontractor: flange PDS scope of area A is True');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121b'), false, 'a PDS-scoped subcontractor: fabrication read of spool B is False');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121b'), null::uuid, 'a PDS-scoped subcontractor: construction project of spool B is None');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121b'), false, 'a PDS-scoped subcontractor: flange PDS scope of area B is False');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', gen_random_uuid()), false, 'a PDS-scoped subcontractor: an unknown spool is never readable');
select is(public.construction_spool_project_id(gen_random_uuid()), null::uuid, 'a PDS-scoped subcontractor: an unknown spool has no construction project');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001213', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001213","role":"authenticated"}', true);
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121a'), true, 'a project reader: fabrication read of spool A is True');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121a'), '30000000-0000-0000-0000-000000001211'::uuid, 'a project reader: construction project of spool A is 30000000-0000-0000-0000-000000001211');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121a'), true, 'a project reader: flange PDS scope of area A is True');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121b'), true, 'a project reader: fabrication read of spool B is True');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121b'), '30000000-0000-0000-0000-000000001211'::uuid, 'a project reader: construction project of spool B is 30000000-0000-0000-0000-000000001211');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121b'), true, 'a project reader: flange PDS scope of area B is True');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', gen_random_uuid()), false, 'a project reader: an unknown spool is never readable');
select is(public.construction_spool_project_id(gen_random_uuid()), null::uuid, 'a project reader: an unknown spool has no construction project');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001214', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001214","role":"authenticated"}', true);
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121a'), false, 'a user outside the project: fabrication read of spool A is False');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121a'), null::uuid, 'a user outside the project: construction project of spool A is None');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121a'), false, 'a user outside the project: flange PDS scope of area A is False');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', '43000000-0000-0000-0000-00000000121b'), false, 'a user outside the project: fabrication read of spool B is False');
select is(public.construction_spool_project_id('43000000-0000-0000-0000-00000000121b'), null::uuid, 'a user outside the project: construction project of spool B is None');
select is(public.flange_revision_in_pds_scope('4c000000-0000-0000-0000-00000000121b'), false, 'a user outside the project: flange PDS scope of area B is False');
select is(public.current_user_can_read_fabrication_spool('30000000-0000-0000-0000-000000001211', gen_random_uuid()), false, 'a user outside the project: an unknown spool is never readable');
select is(public.construction_spool_project_id(gen_random_uuid()), null::uuid, 'a user outside the project: an unknown spool has no construction project');

select * from finish();
rollback;
