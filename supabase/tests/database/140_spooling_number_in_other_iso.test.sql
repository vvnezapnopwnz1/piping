begin;
select plan(6);

-- A weld, spool, support or flange joint number names one thing of the project. A staged row that uses a number the
-- project holds under another isometric is refused (SRV_NUMBER_IN_OTHER_ISO, a blocker); the same isometric (a revision) is
-- not, and a different number is not.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001401', 'authenticated', 'authenticated', 'number.iso@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001401';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001401', 'NUMISO-140', 'Number in other isometric', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001401');
insert into public.project_pds_areas (id, project_id, code, description) values ('31000000-0000-0000-0000-000000001401', '30000000-0000-0000-0000-000000001401', 'PDS-140', 'Area');
insert into public.system_reference_entries (id, kind, code, description) values ('53000000-0000-0000-0000-000000001401', 'material_type', 'CS-140', 'Carbon steel 140') on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001401', '30000000-0000-0000-0000-000000001401', (select id from public.system_reference_entries where kind = 'material_type' and code = 'CS-140'), 'SC-140', 'Class');
insert into public.project_weld_types (id, project_id, code, description) values ('52000000-0000-0000-0000-000000001401', '30000000-0000-0000-0000-000000001401', 'BW', 'Butt');
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001401', '51000000-0000-0000-0000-000000001401', 6, 7.11, '150#');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001401', '51000000-0000-0000-0000-000000001401', '52000000-0000-0000-0000-000000001401', 'shop', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001401', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001401","role":"authenticated"}', true);

-- Job 1: isometric ISO-A with weld W-1, spool SP-1, support SU-1, flange FL-1. Applied.
create temporary table job1 as select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001401', 'first')).id;
select public.register_spooling_import_file((select id from job1), 'pcf', 'A.pcf', 'text/plain', 10, 's1', 'p/j/A.pcf');
select public.record_spooling_validation((select id from job1), $json$[
 {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R0","pds_area":"PDS-140","service_class":"SC-140","line_number":"L-A","sheet_number":"1"}},
 {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
 {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-1","weld_number":"W-1","weld_type":"BW","weld_location":"shop","service_class":"SC-140","diameter_inch":"6"}},
 {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"support","iso_number":"ISO-A","spool_number":"SP-1","support_number":"SU-1","support_type":"SHOE","quantity":"1"}},
 {"row_number":5,"raw_values":{},"action":"create","normalized_values":{"entity_type":"flange_joint","iso_number":"ISO-A","spool_number":"SP-1","flange_number":"FL-1","flange_rating":"150#","diameter_inch":"6","bolt_size":"3/4","bolt_quantity":"8","joint_type":"RF"}}
]$json$::jsonb, '[]'::jsonb);
select lives_ok(format($$select public.apply_spooling_import_job(%L)$$, (select id from job1)), 'the first isometric applies');

-- Job 2: ISO-B uses all four numbers of ISO-A.
create temporary table job2 as select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001401', 'second')).id;
select public.register_spooling_import_file((select id from job2), 'pcf', 'B.pcf', 'text/plain', 10, 's2', 'p/j/B.pcf');
select public.record_spooling_validation((select id from job2), $json$[
 {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-B","revision_number":"R0","pds_area":"PDS-140","service_class":"SC-140","line_number":"L-B","sheet_number":"1"}},
 {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-B","spool_number":"SP-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
 {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-B","spool_number":"SP-1","weld_number":"W-1","weld_type":"BW","weld_location":"shop","service_class":"SC-140","diameter_inch":"6"}},
 {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"support","iso_number":"ISO-B","spool_number":"SP-1","support_number":"SU-1","support_type":"SHOE","quantity":"1"}},
 {"row_number":5,"raw_values":{},"action":"create","normalized_values":{"entity_type":"flange_joint","iso_number":"ISO-B","spool_number":"SP-1","flange_number":"FL-1","flange_rating":"150#","diameter_inch":"6","bolt_size":"3/4","bolt_quantity":"8","joint_type":"RF"}}
]$json$::jsonb, '[]'::jsonb);
select public.revalidate_spooling_import_job((select id from job2));

select is(
  (select array_agg(row_number || ':' || column_name order by row_number) from public.import_job_issues
   where job_id = (select id from job2) and code = 'SRV_NUMBER_IN_OTHER_ISO'),
  array['2:spool_number', '3:weld_number', '4:support_number', '5:flange_number'],
  'weld, spool, support and flange numbers of another isometric are each refused, at their own row and column');
select is(
  (select min(severity::text) from public.import_job_issues where job_id = (select id from job2) and code = 'SRV_NUMBER_IN_OTHER_ISO'),
  'blocker', 'the issue is a blocker');
select ok(
  (select message from public.import_job_issues where job_id = (select id from job2) and code = 'SRV_NUMBER_IN_OTHER_ISO' and column_name = 'weld_number') like '%already belongs to isometric ISO-A%',
  'the message names the isometric that holds the number');

-- Job 3: a new revision of ISO-A keeps its own numbers: no issue.
create temporary table job3 as select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001401', 'revision')).id;
select public.register_spooling_import_file((select id from job3), 'pcf', 'A.pcf', 'text/plain', 10, 's3', 'p/j/A3.pcf');
select public.record_spooling_validation((select id from job3), $json$[
 {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R1","pds_area":"PDS-140","service_class":"SC-140","line_number":"L-A","sheet_number":"1"}},
 {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
 {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-1","weld_number":"W-1","weld_type":"BW","weld_location":"shop","service_class":"SC-140","diameter_inch":"6"}}
]$json$::jsonb, '[]'::jsonb);
select public.revalidate_spooling_import_job((select id from job3));
select is((select count(*)::int from public.import_job_issues where job_id = (select id from job3) and code = 'SRV_NUMBER_IN_OTHER_ISO'), 0, 'a revision of the same isometric is not refused');

-- Job 4: ISO-C with its own numbers: no issue.
create temporary table job4 as select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001401', 'own numbers')).id;
select public.register_spooling_import_file((select id from job4), 'pcf', 'C.pcf', 'text/plain', 10, 's4', 'p/j/C.pcf');
select public.record_spooling_validation((select id from job4), $json$[
 {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-C","revision_number":"R0","pds_area":"PDS-140","service_class":"SC-140","line_number":"L-C","sheet_number":"1"}},
 {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-C","spool_number":"SP-C1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
 {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-C","spool_number":"SP-C1","weld_number":"ISO-C-1","weld_type":"BW","weld_location":"shop","service_class":"SC-140","diameter_inch":"6"}}
]$json$::jsonb, '[]'::jsonb);
select public.revalidate_spooling_import_job((select id from job4));
select is((select count(*)::int from public.import_job_issues where job_id = (select id from job4) and code = 'SRV_NUMBER_IN_OTHER_ISO'), 0, 'numbers no isometric holds are not refused');

select * from finish();
rollback;
