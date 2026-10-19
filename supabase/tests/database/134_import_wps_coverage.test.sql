begin;
select plan(7);

-- The import warns when no WPS covers a new joint (manual 3.5 and 14.2). "Covers" is the joint's diameter,
-- thickness and material type, and, once the PDS area names the subcontractor for the joint's location, a WPS
-- that subcontractor can use. It used to look at diameter and thickness only, so a shop subcontractor's WPS
-- covered a field joint and a carbon-steel WPS covered a stainless spool.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001341', 'authenticated', 'authenticated', 'wps.cover@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001341';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001341', 'WPSCOV-134', 'WPS coverage', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001341');

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341', 'SHOP-134', 'Shop'),
       ('50000000-0000-0000-0000-000000001342', '30000000-0000-0000-0000-000000001341', 'FIELD-134', 'Field');
insert into public.project_pds_areas (id, project_id, code, description, shop_subcontractor_id, field_subcontractor_id)
values ('31000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341', 'PDS-SUB', 'Area with subcontractors',
        '50000000-0000-0000-0000-000000001341', '50000000-0000-0000-0000-000000001342'),
       ('31000000-0000-0000-0000-000000001342', '30000000-0000-0000-0000-000000001341', 'PDS-OPEN', 'Area without', null, null);

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001341', 'material_type', 'CS-134', 'Carbon steel 134'),
       ('53000000-0000-0000-0000-000000001342', 'material_type', 'SS-134', 'Stainless 134')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341',
        '53000000-0000-0000-0000-000000001341', 'SC-134', 'Service class 134');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341', 'BW', 'Butt weld');
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341', 'CS-134', 'Carbon steel 134'),
       ('54000000-0000-0000-0000-000000001342', '30000000-0000-0000-0000-000000001341', 'SS-134', 'Stainless 134');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341', 'CS',
        '54000000-0000-0000-0000-000000001341'),
       ('55000000-0000-0000-0000-000000001342', '30000000-0000-0000-0000-000000001341', 'SS',
        '54000000-0000-0000-0000-000000001342');
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001341', '51000000-0000-0000-0000-000000001341', 6, 8, '150');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001341', '51000000-0000-0000-0000-000000001341', '52000000-0000-0000-0000-000000001341', 'shop', 10),
       ('30000000-0000-0000-0000-000000001341', '51000000-0000-0000-0000-000000001341', '52000000-0000-0000-0000-000000001341', 'field', 10);

-- One carbon-steel WPS, qualified for the shop subcontractor.
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values ('56000000-0000-0000-0000-000000001341', '30000000-0000-0000-0000-000000001341',
        '50000000-0000-0000-0000-000000001341', '53000000-0000-0000-0000-000000001341',
        'WPS-SHOP-134', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001341', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001341","role":"authenticated"}', true);

select public.create_spooling_import_job('30000000-0000-0000-0000-000000001341', 'WPS coverage');
create temporary table cover_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001341' and status = 'draft';
select public.register_spooling_import_file((select id from cover_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-134', 'p/j/weld.txt');

-- ISO-1 is in the area that names subcontractors: a carbon-steel spool with a shop and a field joint, and a
-- stainless spool with a shop joint. ISO-2 is in the area that names none: a field joint on carbon steel.
select lives_ok($f$select public.record_spooling_validation((select id from cover_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-134-1","revision_number":"R0","pds_area":"PDS-SUB","service_class":"SC-134","line_number":"L-1","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-134-1","spool_number":"SP-CS","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-134-1","spool_number":"SP-SS","sequence_number":"2","weight_kg":"10","material_class":"SS"}},
  {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-134-1","spool_number":"SP-CS","weld_number":"W-SHOP-CS","weld_type":"BW","weld_location":"shop","service_class":"SC-134","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":5,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-134-1","spool_number":"SP-CS","weld_number":"W-FIELD-CS","weld_type":"BW","weld_location":"field","service_class":"SC-134","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":6,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-134-1","spool_number":"SP-SS","weld_number":"W-SHOP-SS","weld_type":"BW","weld_location":"shop","service_class":"SC-134","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":7,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-134-2","revision_number":"R0","pds_area":"PDS-OPEN","service_class":"SC-134","line_number":"L-2","sheet_number":"1"}},
  {"row_number":8,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-134-2","spool_number":"SP-OPEN","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":9,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-134-2","spool_number":"SP-OPEN","weld_number":"W-FIELD-OPEN","weld_type":"BW","weld_location":"field","service_class":"SC-134","diameter_inch":"6","thickness_mm":"8"}}
]$json$::jsonb, '[]'::jsonb)$f$, 'the file set validates');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING' and message like '%W-SHOP-CS%'),
  0, 'a shop joint the shop subcontractor''s WPS covers raises no warning');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING' and message like '%W-FIELD-CS%'),
  1, 'a shop subcontractor''s WPS does not cover a field joint of an area that names a field subcontractor');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING' and message like '%W-SHOP-SS%'),
  1, 'a carbon-steel WPS does not cover a stainless spool');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING' and message like '%W-FIELD-OPEN%'),
  0, 'an area that names no subcontractor accepts any WPS of the right size and material');

-- The field subcontractor gets its own WPS.
reset role;
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values ('56000000-0000-0000-0000-000000001342', '30000000-0000-0000-0000-000000001341',
        '50000000-0000-0000-0000-000000001342', '53000000-0000-0000-0000-000000001341',
        'WPS-FIELD-134', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001341', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001341","role":"authenticated"}', true);
select * from public.revalidate_spooling_import_job((select id from cover_job));

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING' and message like '%W-FIELD-CS%'),
  0, 'the field joint is covered once the field subcontractor has a WPS');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from cover_job) and code = 'SRV_WPS_MISSING'),
  1, 'only the stainless joint still lacks a WPS');

reset role;
select * from finish();
rollback;
