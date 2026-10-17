begin;
select plan(5);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000123', 'authenticated', 'authenticated', 'defer.projection@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000123';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000123', 'DEF-123', 'Deferred projection', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000123');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', 'PDS-123', 'Deferred projection area');
insert into public.project_subcontractors (id, project_id, code, description)
values ('32000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', 'SUB-123', 'Fabricator');
insert into public.system_reference_entries (id, kind, code, description)
values ('33000000-0000-0000-0000-000000000123', 'material_type', 'CS-123', 'Carbon steel')
on conflict do nothing;
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
) values (
  '34000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123',
  '32000000-0000-0000-0000-000000000123', '33000000-0000-0000-0000-000000000123',
  'WPS-123', 'GTAW', 1, 12, 1, 20, 'R0', date '2026-01-01'
);
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('35000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', '32000000-0000-0000-0000-000000000123', 'W-ROOT-123', 'Root welder', date '2027-01-01'),
  ('35000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000123', '32000000-0000-0000-0000-000000000123', 'W-CAP-123', 'Cap welder', date '2027-01-01');

insert into public.isometrics (id, project_id, iso_number)
values ('36000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', 'ISO-123');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id)
values
  ('37000000-0000-0000-0000-000000000123', '36000000-0000-0000-0000-000000000123', 'R0', 1, 'superseded', '31000000-0000-0000-0000-000000000123'),
  ('37000000-0000-0000-0000-000000000117', '36000000-0000-0000-0000-000000000123', 'R1', 2, 'accepted', '31000000-0000-0000-0000-000000000123');
insert into public.spools (id, project_id, spool_number)
values ('38000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', 'SP-123');
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values
  ('39000000-0000-0000-0000-000000000123', '38000000-0000-0000-0000-000000000123', '37000000-0000-0000-0000-000000000123'),
  ('39000000-0000-0000-0000-000000000117', '38000000-0000-0000-0000-000000000123', '37000000-0000-0000-0000-000000000117');
insert into public.weld_joints (id, project_id, weld_number)
values
  ('3a000000-0000-0000-0000-000000000123', '30000000-0000-0000-0000-000000000123', 'W-123-1'),
  ('3a000000-0000-0000-0000-000000000124', '30000000-0000-0000-0000-000000000123', 'W-123-2');

-- Outside an import every row recomputes its spool at once.
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm)
values ('3b000000-0000-0000-0000-000000000123', '3a000000-0000-0000-0000-000000000123', '39000000-0000-0000-0000-000000000123', 'shop', 6, 10);
select is((select weld_total from public.fabrication_spool_projections where spool_revision_id = '39000000-0000-0000-0000-000000000123'), 1,
  'a row recomputes its spool immediately when no import is being applied');

-- While an import is applied the spool is only marked.
select set_config('pipeqc.defer_projection', 'on', true);
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm)
values ('3b000000-0000-0000-0000-000000000124', '3a000000-0000-0000-0000-000000000124', '39000000-0000-0000-0000-000000000123', 'shop', 6, 10);
select is((select weld_total from public.fabrication_spool_projections where spool_revision_id = '39000000-0000-0000-0000-000000000123'), 1,
  'while deferred, the new row is not yet in the projection');
select is(public.flush_deferred_spool_projections(), 1, 'the flush recomputes each marked spool once');
select is((select weld_total from public.fabrication_spool_projections where spool_revision_id = '39000000-0000-0000-0000-000000000123'), 2,
  'after the flush the projection has the facts that exist');
select is(public.flush_deferred_spool_projections(), 0, 'a second flush finds nothing marked');

select * from finish();
rollback;
