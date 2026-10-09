begin;
select plan(5);

-- spool_revisions.sequence_number is the spool's position in the SpoolGen package the parser
-- read (1, 2, … across the whole package). It is not shown anywhere and depends on what else the
-- package holds, so no rule may read it: a revision of one ISO must not report its spools as
-- revised, and the Test Pack import must not compare its Spool Revision column with it.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001111', 'authenticated', 'authenticated', 'sequence.rule@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001111', 'SEQ-111', 'Sequence is not a rule', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001111');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001111', '30000000-0000-0000-0000-000000001111', '10000000-0000-0000-0000-000000001111', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set role = 'system_admin', access_role_code = 'project_admin', is_active = true;

insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000001111', 'material_type', 'CS-111', 'Carbon steel')
on conflict do nothing;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000001111', '30000000-0000-0000-0000-000000001111', 'PDS-111', 'Area');
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000001111', '30000000-0000-0000-0000-000000001111', '40000000-0000-0000-0000-000000001111', 'SC-111', 'Class');

-- ISO-111 R0 was imported in a package with other ISOs: its spools got sequence numbers 34 and 35.
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000001111', '30000000-0000-0000-0000-000000001111', 'ISO-111');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000001111', '46000000-0000-0000-0000-000000001111', 'R0', 1, 'accepted',
        '45000000-0000-0000-0000-000000001111', '43000000-0000-0000-0000-000000001111');
insert into public.spools (id, project_id, spool_number)
values
  ('48000000-0000-0000-0000-000000001111', '30000000-0000-0000-0000-000000001111', 'SP-111-1'),
  ('48000000-0000-0000-0000-000000001112', '30000000-0000-0000-0000-000000001111', 'SP-111-2');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, weight_kg, material_class)
values
  ('49000000-0000-0000-0000-000000001111', '48000000-0000-0000-0000-000000001111', '47000000-0000-0000-0000-000000001111', 34, 140.0, 'CS'),
  ('49000000-0000-0000-0000-000000001112', '48000000-0000-0000-0000-000000001112', '47000000-0000-0000-0000-000000001111', 35, 50.0, 'CS');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001111', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001111","role":"authenticated"}', true);
set local role authenticated;

-- R1 arrives alone in its package, so the parser numbers its spools 1 and 2. Only SP-111-2 changes.
select public.create_spooling_import_job('30000000-0000-0000-0000-000000001111', 'R1 of ISO-111 alone');
create temporary table seq_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001111' and status = 'draft';
select public.register_spooling_import_file((select id from seq_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-111', 'p/j/weld.txt');
select public.record_spooling_validation((select id from seq_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":
    {"entity_type":"isometric","iso_number":"ISO-111","revision_number":"R1",
     "pds_area":"PDS-111","service_class":"SC-111","line_number":"L-111","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":
    {"entity_type":"spool","iso_number":"ISO-111","spool_number":"SP-111-1",
     "sequence_number":"1","weight_kg":"140.0","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":
    {"entity_type":"spool","iso_number":"ISO-111","spool_number":"SP-111-2",
     "sequence_number":"2","weight_kg":"60.0","material_class":"CS"}}
]$json$::jsonb, '[]'::jsonb);

select is(
  (select change_type::text from public.preview_spooling_import((select id from seq_job))
   where entity_type = 'spool' and entity_key = 'SP-111-1'),
  'unchanged',
  'a spool whose only difference is its package position is unchanged'
);

select is(
  (select change_type::text from public.preview_spooling_import((select id from seq_job))
   where entity_type = 'spool' and entity_key = 'SP-111-2'),
  'revised',
  'a spool whose weight changed is still revised'
);

-- The Test Pack import names the spool by ISO, ISO revision and spool number. Its Spool Revision
-- column holds what the user knows (here the ISO revision), never the package position.
select public.create_import_job('30000000-0000-0000-0000-000000001111', 'test_pack_composition', 'tp-111.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 100, 'checksum-111');
create temporary table tp_job as
select id from public.import_jobs where source_file_name = 'tp-111.xlsx';
select public.mark_import_job_uploaded((select id from tp_job), '30000000-0000-0000-0000-000000001111/job/tp-111.xlsx');
select public.record_import_validation((select id from tp_job), '[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":
    {"test_pack_number":"TP-111","iso_number":"ISO-111","iso_revision":"R0","spool_number":"SP-111-1","spool_revision":"R0"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":
    {"test_pack_number":"TP-111","iso_number":"ISO-111","iso_revision":"R0","spool_number":"SP-111-9","spool_revision":"R0"}}
]'::jsonb, '[]'::jsonb);
select public.revalidate_test_pack_import_job((select id from tp_job));

select is(
  (select count(*)::int from public.import_job_issues where job_id = (select id from tp_job) and row_number = 1 and severity = 'blocker'),
  0,
  'a known spool passes whatever its Spool Revision column says'
);

select is(
  (select code from public.import_job_issues where job_id = (select id from tp_job) and row_number = 2 and severity = 'blocker'),
  'SRV_TP_UNKNOWN_SPOOL',
  'a spool that is not in the accepted ISO revision is still a blocker'
);

select is(
  (select count(*)::int from public.import_job_issues where job_id = (select id from tp_job) and severity = 'blocker'),
  1,
  'the unknown spool is the only blocker'
);

reset role;
select * from finish();
rollback;
