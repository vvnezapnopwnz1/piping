begin;
select plan(7);

-- A spool is "unchanged" in the revision preview only when nothing inside it changed either. It used to be
-- judged on its own fields (weight, material class), so a spool that gained a weld read "Unchanged" next to
-- a decision list that offers "Done without modification". A weld or support moved out of a spool changes
-- both spools.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001301', 'authenticated', 'authenticated', 'children.diff@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001301', 'CHILD-130', 'Spool revised by its children', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001301');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001301', '30000000-0000-0000-0000-000000001301', '10000000-0000-0000-0000-000000001301', 'system_admin', 'project_admin', true)
on conflict (project_id, user_id) do update set role = 'system_admin', access_role_code = 'project_admin', is_active = true;

insert into public.system_reference_entries (id, kind, code, description)
values ('40000000-0000-0000-0000-000000001301', 'material_type', 'CS-130', 'Carbon steel')
on conflict do nothing;
insert into public.project_pds_areas (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000001301', '30000000-0000-0000-0000-000000001301', 'PDS-130', 'Area');
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('43000000-0000-0000-0000-000000001301', '30000000-0000-0000-0000-000000001301', '40000000-0000-0000-0000-000000001301', 'SC-130', 'Class');
insert into public.project_weld_types (id, project_id, code, description)
values ('44000000-0000-0000-0000-000000001301', '30000000-0000-0000-0000-000000001301', 'BW', 'Butt weld');

-- ISO-130 R0, accepted: five spools, five welds.
--   SP-1: W-1   SP-2: W-2   SP-3: W-3   SP-4: W-4   SP-5: nothing
insert into public.isometrics (id, project_id, iso_number)
values ('46000000-0000-0000-0000-000000001301', '30000000-0000-0000-0000-000000001301', 'ISO-130');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, service_class_id)
values ('47000000-0000-0000-0000-000000001301', '46000000-0000-0000-0000-000000001301', 'R0', 1, 'accepted',
        '45000000-0000-0000-0000-000000001301', '43000000-0000-0000-0000-000000001301');
insert into public.spools (id, project_id, spool_number)
select ('48000000-0000-0000-0000-00000000130' || n)::uuid, '30000000-0000-0000-0000-000000001301', 'SP-130-' || n
from generate_series(1, 5) n;
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, weight_kg, material_class)
select ('49000000-0000-0000-0000-00000000130' || n)::uuid, ('48000000-0000-0000-0000-00000000130' || n)::uuid,
       '47000000-0000-0000-0000-000000001301', n, 10.0, 'CS'
from generate_series(1, 5) n;
insert into public.weld_joints (id, project_id, weld_number)
select ('4a000000-0000-0000-0000-00000000130' || n)::uuid, '30000000-0000-0000-0000-000000001301', 'W-' || n
from generate_series(1, 4) n;
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
select ('4b000000-0000-0000-0000-00000000130' || n)::uuid, ('4a000000-0000-0000-0000-00000000130' || n)::uuid,
       ('49000000-0000-0000-0000-00000000130' || n)::uuid, '44000000-0000-0000-0000-000000001301', 'shop', 6, 8
from generate_series(1, 4) n;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001301', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001301","role":"authenticated"}', true);
set local role authenticated;

-- R1 repeats every spool as it was and changes only what is inside them:
--   SP-1 gains W-9        (new weld)
--   SP-2 loses W-2        (removed weld)
--   SP-3 keeps W-3        (nothing changed)
--   SP-4 hands W-4 to SP-5 (moved weld: both spools change)
select public.create_spooling_import_job('30000000-0000-0000-0000-000000001301', 'R1 of ISO-130');
create temporary table child_job as
select id from public.import_jobs where project_id = '30000000-0000-0000-0000-000000001301' and status = 'draft';
select public.register_spooling_import_file((select id from child_job), 'weld', 'weld.txt', 'text/plain', 1024, 'sum-130', 'p/j/weld.txt');
select public.record_spooling_validation((select id from child_job), $json$[
  {"row_number":1,"raw_values":{},"action":"create","normalized_values":
    {"entity_type":"isometric","iso_number":"ISO-130","revision_number":"R1",
     "pds_area":"PDS-130","service_class":"SC-130","line_number":"L-130","sheet_number":"1"}},
  {"row_number":2,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-130","spool_number":"SP-130-1","sequence_number":"1","weight_kg":"10.0","material_class":"CS"}},
  {"row_number":3,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-130","spool_number":"SP-130-2","sequence_number":"2","weight_kg":"10.0","material_class":"CS"}},
  {"row_number":4,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-130","spool_number":"SP-130-3","sequence_number":"3","weight_kg":"10.0","material_class":"CS"}},
  {"row_number":5,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-130","spool_number":"SP-130-4","sequence_number":"4","weight_kg":"10.0","material_class":"CS"}},
  {"row_number":6,"raw_values":{},"action":"create","normalized_values":{"entity_type":"spool","iso_number":"ISO-130","spool_number":"SP-130-5","sequence_number":"5","weight_kg":"10.0","material_class":"CS"}},
  {"row_number":7,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-130","spool_number":"SP-130-1","weld_number":"W-1","weld_type":"BW","weld_location":"shop","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":8,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-130","spool_number":"SP-130-1","weld_number":"W-9","weld_type":"BW","weld_location":"shop","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":9,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-130","spool_number":"SP-130-3","weld_number":"W-3","weld_type":"BW","weld_location":"shop","diameter_inch":"6","thickness_mm":"8"}},
  {"row_number":10,"raw_values":{},"action":"create","normalized_values":{"entity_type":"weld_joint","iso_number":"ISO-130","spool_number":"SP-130-5","weld_number":"W-4","weld_type":"BW","weld_location":"shop","diameter_inch":"6","thickness_mm":"8"}}
]$json$::jsonb, '[]'::jsonb);

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and entity_key = 'SP-130-1'),
  'revised',
  'a spool that gained a weld is revised, not unchanged');

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and entity_key = 'SP-130-2'),
  'revised',
  'a spool that lost a weld is revised');

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and entity_key = 'SP-130-3'),
  'unchanged',
  'a spool whose own fields and welds all match stays unchanged');

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and entity_key = 'SP-130-4'),
  'revised',
  'the spool a weld moved out of is revised');

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and entity_key = 'SP-130-5'),
  'revised',
  'the spool a weld moved into is revised');

select is(
  (select change_type::text from public.preview_spooling_import((select id from child_job))
   where entity_type = 'weld_joint' and entity_key = 'W-9'),
  'new',
  'the weld rows keep their own change type');

select is(
  (select count(*)::int from public.preview_spooling_import((select id from child_job))
   where entity_type = 'spool' and requires_decision),
  5,
  'every spool of a revised ISO still needs its decision');

reset role;
select * from finish();
rollback;
