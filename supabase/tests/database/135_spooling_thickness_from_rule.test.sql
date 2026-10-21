begin;
select plan(14);

-- A weld whose file gives no wall thickness takes it from the project's thickness rule for its service class
-- and diameter. The file's thickness, when there is one, is kept. The fill happens once, when the rows are stored
-- (record_spooling_validation), and the row keeps the value; every check, the preview and the apply read the
-- stored rows through spooling_staging. PCF files carry no thickness at all; a weld with no thickness and no
-- rule is still blocked by SRV_THICKNESS_MISSING. 138 holds the rule changing after the check.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001351', 'authenticated', 'authenticated', 'thickness.rule@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001351';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001351', 'THKRULE-135', 'Thickness from rule', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001351');

insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001351', '30000000-0000-0000-0000-000000001351', 'PDS-135', 'Area 135');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001351', 'material_type', 'CS-135', 'Carbon steel 135')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001351', '30000000-0000-0000-0000-000000001351',
        '53000000-0000-0000-0000-000000001351', 'SC-135', 'Service class 135');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001351', '30000000-0000-0000-0000-000000001351', 'BW', 'Butt weld');
-- One rule: SC-135 at 6 inch is 7.11 mm. There is no rule at 8 inch.
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001351', '51000000-0000-0000-0000-000000001351', 6, 7.11, '150');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001351', '51000000-0000-0000-0000-000000001351', '52000000-0000-0000-0000-000000001351', 'shop', 10);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001351', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001351","role":"authenticated"}', true);

select public.create_spooling_import_job('30000000-0000-0000-0000-000000001351', 'Thickness from rule');
create temporary table rule_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001351' and status = 'draft';
select public.register_spooling_import_file((select id from rule_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-135', 'p/j/weld.txt');

-- W-135-BLANK has an empty thickness cell (what the weld.txt parser stages), W-135-ABSENT has no thickness key
-- at all (what a PCF file gives), W-135-FILE has 9 mm in the file.
select lives_ok($f$select public.record_spooling_validation((select id from rule_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-135-1","revision_number":"R0","pds_area":"PDS-135","service_class":"SC-135","line_number":"L-1","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-135-1","spool_number":"SP-135-1","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-135-1","spool_number":"SP-135-1","weld_number":"W-135-BLANK","weld_type":"BW","weld_location":"shop","service_class":"SC-135","diameter_inch":"6","thickness_mm":""}},
  {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-135-1","spool_number":"SP-135-1","weld_number":"W-135-FILE","weld_type":"BW","weld_location":"shop","service_class":"SC-135","diameter_inch":"6","thickness_mm":"9"}},
  {"row_number":5,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-135-1","spool_number":"SP-135-1","weld_number":"W-135-ABSENT","weld_type":"BW","weld_location":"shop","service_class":"SC-135","diameter_inch":"6.0"}}
]$json$::jsonb, '[]'::jsonb)$f$, 'the file set validates');

select is(
  (select public.engineering_numeric(s.entity_values ->> 'thickness_mm')
   from public.spooling_staging((select id from rule_job)) s where s.staging_row_number = 3),
  7.110::numeric,
  'a weld with an empty thickness cell takes the thickness of its class and diameter rule');

select is(
  (select public.engineering_numeric(s.entity_values ->> 'thickness_mm')
   from public.spooling_staging((select id from rule_job)) s where s.staging_row_number = 5),
  7.110::numeric,
  'a weld whose row has no thickness at all takes it from the rule too');

select is(
  (select s.entity_values ->> 'thickness_mm'
   from public.spooling_staging((select id from rule_job)) s where s.staging_row_number = 4),
  '9',
  'the thickness the file gives is kept, not replaced by the rule');

select is(
  (select r.normalized_values ->> 'thickness_mm'
   from public.import_job_rows r where r.job_id = (select id from rule_job) and r.row_number = 3),
  '7.110',
  'the thickness is stored on the row when the check is recorded, not worked out at each read');

select * from public.revalidate_spooling_import_job((select id from rule_job));

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from rule_job) and code = 'SRV_THICKNESS_MISSING'),
  0,
  'a weld covered by a rule raises no SRV_THICKNESS_MISSING');

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from rule_job)),
  'the import applies');

reset role;

select is(
  (select wjr.thickness_mm from public.weld_joint_revisions wjr
   join public.weld_joints wj on wj.id = wjr.weld_joint_id
   where wj.project_id = '30000000-0000-0000-0000-000000001351' and wj.weld_number = 'W-135-BLANK'),
  7.11::numeric,
  'the applied weld stores the rule''s thickness');

select is(
  (select wjr.thickness_mm from public.weld_joint_revisions wjr
   join public.weld_joints wj on wj.id = wjr.weld_joint_id
   where wj.project_id = '30000000-0000-0000-0000-000000001351' and wj.weld_number = 'W-135-ABSENT'),
  7.11::numeric,
  'the applied weld without a thickness key stores the rule''s thickness');

select is(
  (select wjr.thickness_mm from public.weld_joint_revisions wjr
   join public.weld_joints wj on wj.id = wjr.weld_joint_id
   where wj.project_id = '30000000-0000-0000-0000-000000001351' and wj.weld_number = 'W-135-FILE'),
  9::numeric,
  'the applied weld stores the file''s thickness');

-- A weld at 8 inch: no thickness in the file and no rule to take it from.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001351', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001351","role":"authenticated"}', true);

select public.create_spooling_import_job('30000000-0000-0000-0000-000000001351', 'No rule');
create temporary table no_rule_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001351' and status = 'draft';
select public.register_spooling_import_file((select id from no_rule_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-135-2', 'p/j2/weld.txt');

select lives_ok($f$select public.record_spooling_validation((select id from no_rule_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":{"entity_type":"isometric","iso_number":"ISO-135-2","revision_number":"R0","pds_area":"PDS-135","service_class":"SC-135","line_number":"L-2","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-135-2","spool_number":"SP-135-2","sequence_number":"1","weight_kg":"10","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-135-2","spool_number":"SP-135-2","weld_number":"W-135-NORULE","weld_type":"BW","weld_location":"shop","service_class":"SC-135","diameter_inch":"8","thickness_mm":""}}
]$json$::jsonb, '[]'::jsonb)$f$, 'the file set without a rule validates');

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from no_rule_job) and row_number = 3 and code = 'SRV_THICKNESS_MISSING'),
  1,
  'a weld with no thickness and no rule is still blocked by SRV_THICKNESS_MISSING');

select is(
  (select s.entity_values ->> 'thickness_mm'
   from public.spooling_staging((select id from no_rule_job)) s where s.staging_row_number = 3),
  '',
  'with no rule to take it from, the staged thickness stays empty');

reset role;

-- Shape pin, like 124: every check reads spooling_staging, about twenty times per apply, so it reads the stored
-- rows and no rule. The one lookup, per class and diameter of the job and not per staged row, is made when the
-- check is recorded (a lookup per row let the planner evaluate engineering_numeric once per candidate rule of
-- every weld: 2-3.5 s per revalidate at 7,500 joints).
select ok(
  pg_get_functiondef('public.spooling_staging(uuid)'::regprocedure) !~* 'project_thickness_flange_rules'
  and pg_get_functiondef('public.record_spooling_validation(uuid, jsonb, jsonb)'::regprocedure) ~* 'group by'
  and pg_get_functiondef('public.record_spooling_validation(uuid, jsonb, jsonb)'::regprocedure) !~* 'join lateral',
  'staging reads stored rows; the rule is looked up once per class and diameter of the job when the check is recorded');
select * from finish();
rollback;
