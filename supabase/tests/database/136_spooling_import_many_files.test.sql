begin;
select plan(15);

-- One spooling import takes many files: several PCF files (one per isometric), Excel or CSV tables, or the
-- four SpoolGen files. A file is one per job, role and name; the same name again replaces it. A job holds at
-- most 300 files. Validation and apply need a weld file or a PCF file. Every issue the browser reports may
-- name its file, and the name is kept with the issue.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001361', 'authenticated', 'authenticated', 'many.files@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001361';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001361', 'MANYFILES-136', 'Many files', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001361');

insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001361', '30000000-0000-0000-0000-000000001361', 'PDS-136', 'Area 136');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001361', 'material_type', 'CS-136', 'Carbon steel 136')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001361', '30000000-0000-0000-0000-000000001361',
        '53000000-0000-0000-0000-000000001361', 'SC-136', 'Service class 136');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001361', '30000000-0000-0000-0000-000000001361', 'BW', 'Butt weld');
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001361', '51000000-0000-0000-0000-000000001361', 6, 7.11, '150');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001361', '51000000-0000-0000-0000-000000001361', '52000000-0000-0000-0000-000000001361', 'shop', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001361', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001361","role":"authenticated"}', true);

-- Two PCF files in one job --------------------------------------------------------------------------------

create temporary table pcf_job as
select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001361', 'PCF files')).id;

select public.register_spooling_import_file((select id from pcf_job), 'pcf', 'ISO-136-1.pcf', 'text/plain', 1024, 'sum-1', 'p/j/pcf/000-ISO-136-1.pcf');
select public.register_spooling_import_file((select id from pcf_job), 'pcf', 'ISO-136-2.pcf', 'text/plain', 1024, 'sum-2', 'p/j/pcf/001-ISO-136-2.pcf');

select is(
  (select count(*)::int from public.import_files where job_id = (select id from pcf_job) and file_role = 'pcf'),
  2,
  'two PCF files with different names are both kept in one job');

select public.register_spooling_import_file((select id from pcf_job), 'pcf', 'ISO-136-1.pcf', 'text/plain', 2048, 'sum-1b', 'p/j/pcf/000-ISO-136-1.pcf');

select is(
  (select count(*)::int from public.import_files where job_id = (select id from pcf_job)),
  2,
  'the same name again replaces the file, it does not add one');

select is(
  (select checksum || '/' || size_bytes from public.import_files
   where job_id = (select id from pcf_job) and file_name = 'ISO-136-1.pcf'),
  'sum-1b/2048',
  'the replaced file keeps the new checksum and size');

-- Validation needs a weld file or a PCF file --------------------------------------------------------------

create temporary table empty_job as
select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001361', 'No files')).id;

select throws_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, '[]'::jsonb)$$, (select id from empty_job)),
  'PQC25',
  'A weld file or a PCF file is required before validation',
  'a job without a weld file and without a PCF file cannot be validated');

-- Issue 1 names its file; issue 2 sends an empty name; issue 3 sends no name at all.
select lives_ok($f$select public.record_spooling_validation((select id from pcf_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-136-1","revision_number":"R0","pds_area":"PDS-136","service_class":"SC-136","line_number":"L-1","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-136-1","spool_number":"SP-136-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-136-1","spool_number":"SP-136-1","weld_number":"W-136-1","weld_type":"BW","weld_location":"shop","service_class":"SC-136","diameter_inch":"6"}}
]$json$::jsonb, $json$[
  {"row_number":12,"column_name":"spool_number","severity":"warning","code":"PCF_SPOOL_FROM_FILE_NAME","message":"PCF_SPOOL_FROM_FILE_NAME","file_name":"ISO-136-2.pcf"},
  {"row_number":13,"column_name":"spool_number","severity":"warning","code":"PCF_SPOOL_FROM_FILE_NAME","message":"PCF_SPOOL_FROM_FILE_NAME","file_name":""},
  {"row_number":14,"column_name":"spool_number","severity":"warning","code":"PCF_SPOOL_FROM_FILE_NAME","message":"PCF_SPOOL_FROM_FILE_NAME"}
]$json$::jsonb)$f$, 'a job with PCF files and no weld file validates');

select is(
  (select file_name from public.import_job_issues where job_id = (select id from pcf_job) and row_number = 12),
  'ISO-136-2.pcf',
  'an issue keeps the name of the file it was found in');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from pcf_job) and row_number in (13, 14) and file_name is null),
  2,
  'an issue with an empty or missing file name stores no name');

select throws_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, %L::jsonb)$$, (select id from pcf_job),
         '[{"row_number":1,"severity":"warning","code":"PCF_SPOOL_FROM_FILE_NAME","message":"x","file_name":"' || repeat('a', 256) || '"}]'),
  '23514',
  null,
  'an issue file name longer than 255 characters is refused');

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from pcf_job)),
  'a job with PCF files and no weld file applies');

reset role;

select is(
  (select count(*)::int from public.weld_joints
   where project_id = '30000000-0000-0000-0000-000000001361' and weld_number = 'W-136-1'),
  1,
  'the weld from the PCF-only job exists after apply');

-- At most 300 files in one job ----------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001361', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001361","role":"authenticated"}', true);

create temporary table big_job as
select (public.create_spooling_import_job('30000000-0000-0000-0000-000000001361', 'Many PCF files')).id;

select lives_ok(
  format($$select count(public.register_spooling_import_file(%L, 'pcf', format('ISO-%%s.pcf', g), 'text/plain', 10, 'sum', format('p/j/pcf/%%s.pcf', g)))
           from generate_series(1, 300) g$$, (select id from big_job)),
  'a job takes 300 files');

select is(
  (select count(*)::int from public.import_files where job_id = (select id from big_job)),
  300,
  'all 300 files are registered');

select throws_ok(
  format($$select public.register_spooling_import_file(%L, 'pcf', 'ISO-301.pcf', 'text/plain', 10, 'sum', 'p/j/pcf/301.pcf')$$,
         (select id from big_job)),
  '23514',
  'A spooling import takes at most 300 files',
  'the 301st file is refused');

select lives_ok(
  format($$select public.register_spooling_import_file(%L, 'pcf', 'ISO-1.pcf', 'text/plain', 20, 'sum-new', 'p/j/pcf/1.pcf')$$,
         (select id from big_job)),
  'at the limit, a file already in the job can still be replaced');

reset role;

-- The bucket takes Excel workbooks ------------------------------------------------------------------------

select ok(
  (select allowed_mime_types from storage.buckets where id = 'project-spooling')
    @> array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
  'the spooling bucket accepts .xlsx and .xls files');

select * from finish();
rollback;
