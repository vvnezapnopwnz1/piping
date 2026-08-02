-- Characterization test, not an endorsement.
--
-- spool_fabrication_readiness counts every non-removed weld joint of the spool, not only
-- weld_location = 'shop'. Shop Weld Progress refuses field and assembly joints with PQC30,
-- so a spool carrying one can never reach is_fabricated through the fabrication screens.
--
-- Recorded as a Track 07 limitation in both Track 05 execution addenda. Pinned here so
-- that when Track 07 narrows the view this file fails loudly and its author learns what
-- the behaviour was and that changing it is the point.
--
-- The three Track 05 browser fixtures in scripts/weld.txt are all shop joints, so this
-- limitation affects no fixture in this repository today.

begin;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000541', 'authenticated', 'authenticated', 'lim.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000542', 'authenticated', 'authenticated', 'lim.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000541';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000541', 'LIM-A', 'Limitation A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000541');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '10000000-0000-0000-0000-000000000542', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000541', 'material_type', 'CS2', 'Carbon steel 2')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '53000000-0000-0000-0000-000000000541', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'BW', 'Butt weld');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '50000000-0000-0000-0000-000000000541', '53000000-0000-0000-0000-000000000541',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

-- Definition graph: one spool, ONE SHOP JOINT AND ONE FIELD JOINT, one support, one bill line
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'ISO-0541');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SP-0541-A');

insert into public.weld_joints (id, project_id, weld_number)
values
  ('46000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'W-0541-01'),
  ('46000000-0000-0000-0000-000000000542', '30000000-0000-0000-0000-000000000541', 'W-0541-02');

insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SUP-0541-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000541', '40000000-0000-0000-0000-000000000541', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000541', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000541', '41000000-0000-0000-0000-000000000541',
        '42000000-0000-0000-0000-000000000541', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values
  ('47000000-0000-0000-0000-000000000541', '46000000-0000-0000-0000-000000000541',
   '43000000-0000-0000-0000-000000000541', '52000000-0000-0000-0000-000000000541', 'shop', 6, 8),
  ('47000000-0000-0000-0000-000000000542', '46000000-0000-0000-0000-000000000542',
   '43000000-0000-0000-0000-000000000541', '52000000-0000-0000-0000-000000000541', 'field', 6, 8);

insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000541', '49000000-0000-0000-0000-000000000541',
        '43000000-0000-0000-0000-000000000541', 'shoe', 1);

insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541',
        'IDN-100', 3, 'm', 'HEAT-100');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        'MRR-1', 'IDN-100', 'HEAT-100');

-- Everything except the field joint is complete: material check done, support installed,
-- and the SHOP joint welded. The field joint is the only outstanding item.
insert into public.material_check_records (id, project_id, spool_revision_id, checked_on)
values ('60000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '43000000-0000-0000-0000-000000000541', date '2026-02-01');

insert into public.material_check_items (
  id, material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity)
values ('61000000-0000-0000-0000-000000000541', '60000000-0000-0000-0000-000000000541',
        '44000000-0000-0000-0000-000000000541', '45000000-0000-0000-0000-000000000541', 3);

insert into public.support_progress_records (id, project_id, support_revision_id, spool_revision_id, installed_on)
values ('62000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '4a000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541', date '2026-02-02');

insert into public.weld_progress_records (
  id, project_id, weld_joint_revision_id, spool_revision_id,
  subcontractor_id, welding_procedure_id, weld_on)
values ('63000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '47000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541',
        '50000000-0000-0000-0000-000000000541', '56000000-0000-0000-0000-000000000541',
        date '2026-02-03');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000542', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000542","role":"authenticated"}', true);

select is(
  (select weld_total from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  2::int,
  'weld_total counts the field joint as well as the shop joint (Track 07 limitation)'
);

select is(
  (select weld_complete from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  1::int,
  'only the shop joint carries weld progress, because Shop Weld Progress refuses field joints with PQC30'
);

select is(
  (select is_material_checked from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  true,
  'the bill of materials is fully checked, so the material clause does not confound this test'
);

select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  false,
  'the uncountable field joint alone blocks is_fabricated; narrowing the view to shop joints is a Track 07 decision'
);

select * from finish();
rollback;
