begin;
select plan(19);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000116', 'authenticated', 'authenticated', 'revision.copy@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000116';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000116', 'REV-116', 'Revision copy', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000116');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'PDS-116', 'Revision copy area');
insert into public.project_subcontractors (id, project_id, code, description)
values ('32000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'SUB-116', 'Fabricator');
insert into public.system_reference_entries (id, kind, code, description)
values ('33000000-0000-0000-0000-000000000116', 'material_type', 'CS-116', 'Carbon steel')
on conflict do nothing;
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
) values (
  '34000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116',
  '32000000-0000-0000-0000-000000000116', '33000000-0000-0000-0000-000000000116',
  'WPS-116', 'GTAW', 1, 12, 1, 20, 'R0', date '2026-01-01'
);
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('35000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', '32000000-0000-0000-0000-000000000116', 'W-ROOT', 'Root welder', date '2027-01-01'),
  ('35000000-0000-0000-0000-000000000117', '30000000-0000-0000-0000-000000000116', '32000000-0000-0000-0000-000000000116', 'W-CAP', 'Cap welder', date '2027-01-01');

insert into public.isometrics (id, project_id, iso_number)
values ('36000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'ISO-116');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id)
values
  ('37000000-0000-0000-0000-000000000116', '36000000-0000-0000-0000-000000000116', 'R0', 1, 'superseded', '31000000-0000-0000-0000-000000000116'),
  ('37000000-0000-0000-0000-000000000117', '36000000-0000-0000-0000-000000000116', 'R1', 2, 'accepted', '31000000-0000-0000-0000-000000000116');
insert into public.spools (id, project_id, spool_number)
values ('38000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'SP-116');
insert into public.spool_revisions (id, spool_id, isometric_revision_id)
values
  ('39000000-0000-0000-0000-000000000116', '38000000-0000-0000-0000-000000000116', '37000000-0000-0000-0000-000000000116'),
  ('39000000-0000-0000-0000-000000000117', '38000000-0000-0000-0000-000000000116', '37000000-0000-0000-0000-000000000117');
insert into public.weld_joints (id, project_id, weld_number)
values ('3a000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'W-116');
insert into public.weld_joint_revisions (id, weld_joint_id, spool_revision_id, weld_location, diameter_inch, thickness_mm)
values
  ('3b000000-0000-0000-0000-000000000116', '3a000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', 'shop', 6, 10),
  ('3b000000-0000-0000-0000-000000000117', '3a000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000117', 'shop', 6, 10);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('3c000000-0000-0000-0000-000000000116', '3b000000-0000-0000-0000-000000000116', 'root', 1),
  ('3c000000-0000-0000-0000-000000000117', '3b000000-0000-0000-0000-000000000116', 'cap', 2),
  ('3c000000-0000-0000-0000-000000000118', '3b000000-0000-0000-0000-000000000117', 'root', 1),
  ('3c000000-0000-0000-0000-000000000119', '3b000000-0000-0000-0000-000000000117', 'cap', 2);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values
  ('3d000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', 'MAT-116', 2, 'ea', 'TRACE-116'),
  ('3d000000-0000-0000-0000-000000000117', '39000000-0000-0000-0000-000000000117', 'MAT-116', 2, 'ea', 'TRACE-116');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('3e000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'MRR-116', 'MAT-116', 'TRACE-116');

insert into public.weld_progress_records (
  id, project_id, weld_joint_revision_id, spool_revision_id, subcontractor_id, welding_procedure_id,
  cutting_on, beveling_on, fitup_on, preheat_on, weld_on, dwir_number, qc_form_number, recorded_by
) values (
  '3f000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116',
  '3b000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116',
  '32000000-0000-0000-0000-000000000116', '34000000-0000-0000-0000-000000000116',
  date '2026-02-01', date '2026-02-02', date '2026-02-03', date '2026-02-04', date '2026-02-05',
  'DWIR-116', 'QC-116', '10000000-0000-0000-0000-000000000116'
);
insert into public.weld_point_assignments (weld_progress_record_id, weld_point_id, point_type, welder_qualification_id, completion_percent, welded_on)
values
  ('3f000000-0000-0000-0000-000000000116', '3c000000-0000-0000-0000-000000000116', 'root', '35000000-0000-0000-0000-000000000116', 50, date '2026-02-05'),
  ('3f000000-0000-0000-0000-000000000116', '3c000000-0000-0000-0000-000000000117', 'cap', '35000000-0000-0000-0000-000000000117', 50, date '2026-02-06');
insert into public.material_check_records (id, project_id, spool_revision_id, checked_on, checked_by)
values ('40000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', date '2026-02-02', '10000000-0000-0000-0000-000000000116');
insert into public.material_check_items (material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity)
values ('40000000-0000-0000-0000-000000000116', '3d000000-0000-0000-0000-000000000116', '3e000000-0000-0000-0000-000000000116', 2);

insert into public.supports (id, project_id, support_number)
values ('42000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', 'SUP-116');
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values
  ('43000000-0000-0000-0000-000000000116', '42000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', 'SHOE', 1),
  ('43000000-0000-0000-0000-000000000117', '42000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000117', 'SHOE', 1);
insert into public.support_progress_records (id, project_id, support_revision_id, spool_revision_id, phase, installed_on, recorded_by)
values ('44000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116', '43000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', 'fabrication', date '2026-02-07', '10000000-0000-0000-0000-000000000116');

insert into public.revision_change_items (
  id, project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
  entity_type, entity_id, entity_key, change_type
) values (
  '41000000-0000-0000-0000-000000000116', '30000000-0000-0000-0000-000000000116',
  '36000000-0000-0000-0000-000000000116', '37000000-0000-0000-0000-000000000117',
  '37000000-0000-0000-0000-000000000116', 'spool', '38000000-0000-0000-0000-000000000116', 'SP-116', 'unchanged'
);
insert into public.revision_decisions (change_item_id, decision, decided_by)
values ('41000000-0000-0000-0000-000000000116', 'done_without_modification', '10000000-0000-0000-0000-000000000116');
insert into public.revision_progress_copies (change_item_id, source_spool_revision_id, target_spool_revision_id, progress_kind, copied_by)
values
  ('41000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000116', '39000000-0000-0000-0000-000000000117', 'fabrication_start', '10000000-0000-0000-0000-000000000116');

select is(
  (select array_agg(progress_kind order by progress_kind)::text from public.revision_progress_copies where change_item_id = '41000000-0000-0000-0000-000000000116'),
  '{fabrication_start,material_check,support_progress,weld_progress}',
  'done-without-modification authorizes material, weld and support copying alongside construction progress'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000116', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000116","role":"authenticated"}', true);
select is(public.materialize_progress_copies('37000000-0000-0000-0000-000000000117', 'revision-copy-116'), 3,
  'done-without-modification materializes the material, weld and support records');
reset role;

select is((select count(*)::int from public.material_check_records where spool_revision_id = '39000000-0000-0000-0000-000000000117'), 1,
  'material check is copied to the replacement spool revision');
select is((select checked_on from public.material_check_records where spool_revision_id = '39000000-0000-0000-0000-000000000117'), date '2026-02-02',
  'material-check date is retained');
select is((select count(*)::int from public.material_check_items item join public.material_check_records record on record.id = item.material_check_record_id where record.spool_revision_id = '39000000-0000-0000-0000-000000000117'), 1,
  'material-check evidence is copied');
select is((select spool_revision_material_id from public.material_check_items item join public.material_check_records record on record.id = item.material_check_record_id where record.spool_revision_id = '39000000-0000-0000-0000-000000000117'), '3d000000-0000-0000-0000-000000000117'::uuid,
  'material-check evidence points at the target BOM line');
select is((select count(*)::int from public.construction_progress_events where spool_revision_id = '39000000-0000-0000-0000-000000000117' and stage = 'material_check' and source = 'revision_copy'), 1,
  'material check carries its revision-copy progress event');
select is((select count(*)::int from public.weld_progress_records where weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), 1,
  'weld progress is copied to the corresponding target joint');
select is((select weld_on from public.weld_progress_records where weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), date '2026-02-05',
  'weld progress retains its work dates');
select is((select welding_procedure_id from public.weld_progress_records where weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), '34000000-0000-0000-0000-000000000116'::uuid,
  'weld progress retains its WPS');
select is((select count(*)::int from public.weld_point_assignments assignment join public.weld_progress_records record on record.id = assignment.weld_progress_record_id where record.weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), 2,
  'all weld-point assignments are copied');
select is((select array_agg(welder_qualification_id order by point_type)::text from public.weld_point_assignments assignment join public.weld_progress_records record on record.id = assignment.weld_progress_record_id where record.weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), '{35000000-0000-0000-0000-000000000117,35000000-0000-0000-0000-000000000116}',
  'weld-point assignments retain the qualified welders');
select is((select array_agg(point_type order by point_type)::text from public.weld_point_assignments assignment join public.weld_progress_records record on record.id = assignment.weld_progress_record_id where record.weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), '{cap,root}',
  'weld-point types are retained');
select is((select count(*)::int from public.nde_obligations where weld_joint_revision_id = '3b000000-0000-0000-0000-000000000117'), 0,
  'weld-progress copying does not fabricate NDE outcomes');
select is((select count(*)::int from public.revision_progress_copies where change_item_id = '41000000-0000-0000-0000-000000000116' and copied_payload <> '{}'::jsonb), 3,
  'each copied record keeps materialization provenance');

select is((select count(*)::int from public.support_progress_records where support_revision_id = '43000000-0000-0000-0000-000000000117'), 1,
  'an installed support stays installed on the replacement revision');
select is((select installed_on from public.support_progress_records where support_revision_id = '43000000-0000-0000-0000-000000000117'), date '2026-02-07',
  'the support keeps its installation date');
select is((select phase::text from public.support_progress_records where support_revision_id = '43000000-0000-0000-0000-000000000117'), 'fabrication',
  'the support keeps the phase it was installed in');
select is((select support_recorded from public.fabrication_spool_projections where spool_revision_id = '39000000-0000-0000-0000-000000000117'), 1,
  'the replacement spool projection counts the carried support');

select * from finish();
rollback;
