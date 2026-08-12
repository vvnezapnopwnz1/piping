begin;
select plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000961', 'authenticated', 'authenticated', 'readiness.manager@example.test', 'not-used', now(), now(), now()) on conflict (id) do nothing;
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000961', 'READINESS-104', 'Readiness', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000961') on conflict (id) do nothing;
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', '10000000-0000-0000-0000-000000000961', 'qc_engineer', 'project_admin', true)
on conflict (project_id, user_id) do update set access_role_code = excluded.access_role_code, role = excluded.role, is_active = true;
insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000000961', 'material_type', 'MAT-104', 'Material') on conflict (id) do nothing;
insert into public.project_systems (id, project_id, code, description) values ('41000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', 'SYS-104', 'System') on conflict (id) do nothing;
insert into public.project_subsystems (id, project_id, system_id, code, description) values ('42000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', '41000000-0000-0000-0000-000000000961', 'SUB-104', 'Subsystem') on conflict (id) do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description) values ('43000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', '40000000-0000-0000-0000-000000000961', 'SC-104', 'Service class') on conflict (id) do nothing;
insert into public.project_line_services (id, project_id, code, description) values ('44000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', 'LS-104', 'Line service') on conflict (id) do nothing;
insert into public.project_pressure_units (project_id, unit) values ('30000000-0000-0000-0000-000000000961', 'bar') on conflict (project_id) do update set unit = excluded.unit;
insert into public.project_pds_areas (id, project_id, code, description) values ('45000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', 'PDS-104', 'Area') on conflict (id) do nothing;
insert into public.isometrics (id, project_id, iso_number) values ('46000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', 'ISO-104') on conflict (id) do nothing;
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000961', '46000000-0000-0000-0000-000000000961', 'R0', 1, 'accepted', '45000000-0000-0000-0000-000000000961', '43000000-0000-0000-0000-000000000961') on conflict (id) do nothing;

select has_view('public', 'isometric_readiness', 'ISO readiness projection exists');
select has_view('public', 'test_pack_readiness', 'Test Pack readiness projection exists');
select has_view('public', 'test_pack_release_backlog', 'release backlog projection exists');
select has_view('public', 'test_pack_iso_status', 'ISO status projection exists');
select has_view('public', 'test_pack_spool_status', 'spool status projection exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000961', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000961","role":"authenticated"}', true);
set local role authenticated;
select public.create_test_pack('30000000-0000-0000-0000-000000000961', 'TP-104', '41000000-0000-0000-0000-000000000961', '42000000-0000-0000-0000-000000000961', '43000000-0000-0000-0000-000000000961', '44000000-0000-0000-0000-000000000961', date '2026-08-10', date '2026-08-12', 'High', 'P', 12, 'Unit', null, 'tp-104');
select public.compose_test_pack((select id from public.test_packs where test_pack_number = 'TP-104'), '46000000-0000-0000-0000-000000000961', 'manual', null, 'compose-104');
select is((select isometric_revision_id from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), '47000000-0000-0000-0000-000000000961'::uuid, 'readiness resolves the accepted revision');
select is((select spool_total from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), 0, 'no current spools is a visible blocker');
select is((select (blocker_counts ->> 'NO_SPOOLS')::int from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), 1, 'NO_SPOOLS blocker is derived');
select is((select member_count from public.test_pack_readiness where test_pack_number = 'TP-104'), 1, 'Test Pack readiness counts active members');
select is((select is_rft from public.test_pack_readiness where test_pack_number = 'TP-104'), false, 'an incomplete member cannot be RFT');
select is((select count(*)::int from public.test_pack_release_backlog where test_pack_number = 'TP-104'), 1, 'incomplete Test Pack is in release backlog');

reset role;
insert into public.spools (id, project_id, spool_number) values ('48000000-0000-0000-0000-000000000961', '30000000-0000-0000-0000-000000000961', 'SP-104');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number) values ('49000000-0000-0000-0000-000000000961', '48000000-0000-0000-0000-000000000961', '47000000-0000-0000-0000-000000000961', 1);
set local role authenticated;
select is((select spool_total from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), 1, 'readiness changes from current upstream spool facts without pack mutation');
select is((select (blocker_counts ->> 'NO_SPOOLS')::int from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), 0, 'NO_SPOOLS clears immediately');

reset role;
update public.isometric_revisions set status = 'superseded', superseded_at = timezone('utc', now()) where id = '47000000-0000-0000-0000-000000000961';
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000000962', '46000000-0000-0000-0000-000000000961', 'R1', 2, 'accepted', '45000000-0000-0000-0000-000000000961', '43000000-0000-0000-0000-000000000961');
set local role authenticated;
select is((select isometric_revision_id from public.isometric_readiness where isometric_id = '46000000-0000-0000-0000-000000000961'), '47000000-0000-0000-0000-000000000962'::uuid, 'stable ISO membership follows the new accepted revision');
select is((select is_rft from public.test_pack_readiness where test_pack_number = 'TP-104'), false, 'stale prior revision evidence does not leak into RFT');
select public.archive_test_pack((select id from public.test_packs where test_pack_number = 'TP-104'), 'archive-104');
select is((select is_rft from public.test_pack_readiness where test_pack_number = 'TP-104'), false, 'archived Test Pack is never RFT');
select is(has_table_privilege('authenticated', 'public.test_packs', 'INSERT'), false, 'readiness consumers retain no direct Test Pack write grant');

reset role;
select * from finish();
rollback;
