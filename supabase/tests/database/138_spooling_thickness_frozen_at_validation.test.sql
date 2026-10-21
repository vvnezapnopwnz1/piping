begin;
select plan(8);

-- The thickness a person checked is the thickness that is applied. The fill from the project's rule happens when
-- the check is recorded and the row keeps it: change the rule afterwards and neither the staged rows nor the apply
-- see the new value. A rule that appears after the check does not reach that job either; a new check picks it up.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001381', 'authenticated', 'authenticated', 'thickness.frozen@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001381';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001381', 'THKFROZEN-138', 'Thickness frozen', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001381');

insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001381', '30000000-0000-0000-0000-000000001381', 'PDS-138', 'Area 138');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001381', 'material_type', 'CS-138', 'Carbon steel 138')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001381', '30000000-0000-0000-0000-000000001381',
        '53000000-0000-0000-0000-000000001381', 'SC-138', 'Service class 138');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001381', '30000000-0000-0000-0000-000000001381', 'BW', 'Butt weld');
-- SC-138 at 6 inch is 7.11 mm; there is no rule at 8 inch when the check is recorded.
insert into public.project_thickness_flange_rules (id, project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('54000000-0000-0000-0000-000000001381', '30000000-0000-0000-0000-000000001381', '51000000-0000-0000-0000-000000001381', 6, 7.11, '150');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001381', '51000000-0000-0000-0000-000000001381', '52000000-0000-0000-0000-000000001381', 'shop', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001381', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001381","role":"authenticated"}', true);

select public.create_spooling_import_job('30000000-0000-0000-0000-000000001381', 'Frozen thickness');
create temporary table frozen_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001381' and status = 'draft';
select public.register_spooling_import_file((select id from frozen_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-138', 'p/j/weld.txt');

select lives_ok($f$select public.record_spooling_validation((select id from frozen_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-138-1","revision_number":"R0","pds_area":"PDS-138","service_class":"SC-138","line_number":"L-1","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-138-1","spool_number":"SP-138-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-138-1","spool_number":"SP-138-1","weld_number":"W-138-6IN","weld_type":"BW","weld_location":"shop","service_class":"SC-138","diameter_inch":"6","thickness_mm":""}},
  {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-138-1","spool_number":"SP-138-1","weld_number":"W-138-8IN","weld_type":"BW","weld_location":"shop","service_class":"SC-138","diameter_inch":"8","thickness_mm":""}}
]$json$::jsonb, '[]'::jsonb)$f$, 'the file set is checked with the rule at 7.11 mm');

reset role;
-- After the check: the rule at 6 inch changes, and a rule appears at 8 inch.
update public.project_thickness_flange_rules set thickness_mm = 9.53 where id = '54000000-0000-0000-0000-000000001381';
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001381', '51000000-0000-0000-0000-000000001381', 8, 12.7, '150');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001381', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001381","role":"authenticated"}', true);

select is(
  (select public.engineering_numeric(s.entity_values ->> 'thickness_mm')
   from public.spooling_staging((select id from frozen_job)) s where s.staging_row_number = 3),
  7.110::numeric,
  'the staged thickness is the one checked, not the changed rule');

select is(
  (select r.normalized_values ->> 'thickness_mm' from public.import_job_rows r
   where r.job_id = (select id from frozen_job) and r.row_number = 3),
  '7.110',
  'the stored row holds the thickness that was shown');

select is(
  (select s.entity_values ->> 'thickness_mm'
   from public.spooling_staging((select id from frozen_job)) s where s.staging_row_number = 4),
  '',
  'a rule that appeared after the check does not reach the job');

select * from public.revalidate_spooling_import_job((select id from frozen_job));

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from frozen_job) and row_number = 4 and code = 'SRV_THICKNESS_MISSING'),
  1,
  'the weld without a thickness at the check is still blocked until the job is checked again');

select ok(
  (select message ~ 'Check the files again' from public.import_job_issues
   where job_id = (select id from frozen_job) and row_number = 4 and code = 'SRV_THICKNESS_MISSING'),
  'the blocker says that the files are to be checked again, not that no rule exists');

-- Checking again picks the new rule up: that is the deliberate way to get a changed rule into a job.
select lives_ok($f$select public.record_spooling_validation((select id from frozen_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-138-1","revision_number":"R0","pds_area":"PDS-138","service_class":"SC-138","line_number":"L-1","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-138-1","spool_number":"SP-138-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-138-1","spool_number":"SP-138-1","weld_number":"W-138-6IN","weld_type":"BW","weld_location":"shop","service_class":"SC-138","diameter_inch":"6","thickness_mm":""}},
  {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-138-1","spool_number":"SP-138-1","weld_number":"W-138-8IN","weld_type":"BW","weld_location":"shop","service_class":"SC-138","diameter_inch":"8","thickness_mm":""}}
]$json$::jsonb, '[]'::jsonb)$f$, 'the same files are checked again after the rule changed');

select is(
  (select array_agg(public.engineering_numeric(s.entity_values ->> 'thickness_mm') order by s.staging_row_number)
   from public.spooling_staging((select id from frozen_job)) s where s.entity_kind = 'weld_joint'),
  array[9.530::numeric, 12.700::numeric],
  'a new check takes the rules as they are now');

reset role;
select * from finish();
rollback;
