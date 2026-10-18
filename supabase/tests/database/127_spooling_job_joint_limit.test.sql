begin;
select plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000421', 'authenticated', 'authenticated', 'spl.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000422', 'authenticated', 'authenticated', 'spl.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000423', 'authenticated', 'authenticated', 'spl.reader@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000421';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000421', 'SPL-A', 'Spooling A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000421');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000422', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000422', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000423', 'qc_engineer', 'project_reader', true);

-- Referentials the validation resolves against
insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'PDS-A', 'Area A');

insert into public.system_reference_entries (id, kind, code, description)
values ('50100000-0000-0000-0000-000000000421', 'material_type', 'CS-042', 'Carbon Steel')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', '50100000-0000-0000-0000-000000000421', 'SC-A', 'Class A');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'BW', 'Butt weld');

insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', 6, 8.2, '150');

insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', '52000000-0000-0000-0000-000000000421', 'shop', 10);

-- Act as the Project Admin for the rest of the file
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000422', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000422","role":"authenticated"}', true);

-- R0 import ------------------------------------------------------------------

select is(public.spooling_job_joint_limit(), null, 'with no statement timeout there is no limit');

set local statement_timeout = '8s';
select is(public.spooling_job_joint_limit(), 8000, 'an 8 s role timeout allows 8,000 joints in one job');
set local statement_timeout = '30s';
select is(public.spooling_job_joint_limit(), 30000, 'the 30 s KZ timeout allows 30,000');
set local statement_timeout = 0;

select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R0 load');
create temporary table spl_job as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
order by created_at desc limit 1;

select public.register_spooling_import_file(
  (select id from spl_job), 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld',
  '30000000-0000-0000-0000-000000000421/job/weld.txt');

select public.record_spooling_validation(
  (select id from spl_job),
  $json$[
    {"row_number":1,"raw_values":{},"action":"create","normalized_values":
      {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R0",
       "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
    {"row_number":2,"raw_values":{},"action":"create","normalized_values":
      {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-A1",
       "sequence_number":"1","weight_kg":"100.5","material_class":"CS"}},
    {"row_number":3,"raw_values":{},"action":"create","normalized_values":
      {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
       "weld_number":"W-A1","weld_type":"BW","weld_location":"shop",
       "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}},
    {"row_number":4,"raw_values":{},"action":"create","normalized_values":
      {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
       "weld_number":"W-A2","weld_type":"BW","weld_location":"shop",
       "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
  ]$json$::jsonb,
  '[]'::jsonb);

select set_config('pipeqc.spooling_joint_limit', '2', true);
select public.revalidate_spooling_import_job((select id from spl_job));
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_SPOOLING_JOB_TOO_LARGE'),
  0,
  'two joints in a limit of two is within the limit'
);

select set_config('pipeqc.spooling_joint_limit', '1', true);
select public.revalidate_spooling_import_job((select id from spl_job));
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_SPOOLING_JOB_TOO_LARGE' and severity = 'blocker'),
  1,
  'two joints in a limit of one is a blocker named by its code'
);
select alike(
  (select message from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_SPOOLING_JOB_TOO_LARGE'),
  '%2 weld joints; one job applies at most 1%',
  'the message gives the count and the limit'
);

select set_config('pipeqc.spooling_joint_limit', '', true);
select public.revalidate_spooling_import_job((select id from spl_job));
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_SPOOLING_JOB_TOO_LARGE'),
  0,
  'a revalidation under the limit clears the blocker again'
);

select * from finish();
rollback;
