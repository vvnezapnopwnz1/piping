begin;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000531', 'authenticated', 'authenticated', 'proj.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000532', 'authenticated', 'authenticated', 'proj.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000531';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000531', 'PRJ-A', 'Projection A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000531');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '10000000-0000-0000-0000-000000000532', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000531', 'material_type', 'CS2', 'Carbon steel 2')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '53000000-0000-0000-0000-000000000531', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'CS2', 'Carbon steel 2');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'A1',
        '54000000-0000-0000-0000-000000000531');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '50000000-0000-0000-0000-000000000531', '53000000-0000-0000-0000-000000000531',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
   '50000000-0000-0000-0000-000000000531', 'W-1', 'Welder One', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000532', '30000000-0000-0000-0000-000000000531',
   '50000000-0000-0000-0000-000000000531', 'W-2', 'Welder Two', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000531', '56000000-0000-0000-0000-000000000531'),
  ('57000000-0000-0000-0000-000000000532', '56000000-0000-0000-0000-000000000531');

-- RT 100 only, no PWHT: the shortest complete path
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '51000000-0000-0000-0000-000000000531', '52000000-0000-0000-0000-000000000531',
        'shop', 100, false);

insert into public.project_line_services (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'LS-1', 'Line service 1');

insert into public.project_ral_codes (id, project_id, line_service_id, color_code, ral_code)
values ('5a000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '59000000-0000-0000-0000-000000000531', 'GREY', 'RAL7035');

insert into public.project_paint_matrix_rules (
  id, project_id, line_service_id, ral_code_id, blasting_required, primer_required,
  intermediate_coat_count, final_coat_count, required_final_dft_microns)
values ('5b000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '59000000-0000-0000-0000-000000000531', '5a000000-0000-0000-0000-000000000531',
        true, true, 1, 1, 240);

insert into public.project_location_categories (id, project_id, code, description)
values ('5c000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'YARD', 'Yard');

insert into public.project_locations (id, project_id, category_id, code, description)
values ('5d000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        '5c000000-0000-0000-0000-000000000531', 'YARD-1', 'Yard bay 1');

-- Definition graph: one spool, one weld, one support, two bill lines
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'ISO-0531');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'SP-0531-A');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'W-0531-01');

insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531', 'SUP-0531-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000531', '40000000-0000-0000-0000-000000000531', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000531', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000531', '41000000-0000-0000-0000-000000000531',
        '42000000-0000-0000-0000-000000000531', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000531', '46000000-0000-0000-0000-000000000531',
        '43000000-0000-0000-0000-000000000531', '52000000-0000-0000-0000-000000000531', 'shop', 6, 8);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000531', '47000000-0000-0000-0000-000000000531', 'root', 1),
  ('48000000-0000-0000-0000-000000000532', '47000000-0000-0000-0000-000000000531', 'cap', 2);

insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000531', '49000000-0000-0000-0000-000000000531',
        '43000000-0000-0000-0000-000000000531', 'shoe', 1);

insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000531', '43000000-0000-0000-0000-000000000531',
        'IDN-100', 3, 'm', 'HEAT-100');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000531', '30000000-0000-0000-0000-000000000531',
        'MRR-1', 'IDN-100', 'HEAT-100');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000532', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000532","role":"authenticated"}', true);

select has_view('public', 'spool_construction_status', 'the status projection exists');
select has_view('public', 'weld_progress_summary', 'the weld projection exists');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  null,
  'a spool with no events has no current stage'
);

select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000531', 'fabrication', 'start_fab', date '2026-08-04');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  'start_fab'::public.construction_stage,
  'the current stage follows the ledger'
);

select public.record_material_check(
  '43000000-0000-0000-0000-000000000531', date '2026-08-05',
  '[{"ident_code":"IDN-100","trace_number":"HEAT-100","quantity":3}]'::jsonb);
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000531',
  '50000000-0000-0000-0000-000000000531',
  '56000000-0000-0000-0000-000000000531',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000531",
     "completion_percent":50,"welded_on":"2026-08-06"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000532",
     "completion_percent":50,"welded_on":"2026-08-06"}]'::jsonb,
  '{"weld_on":"2026-08-06"}'::jsonb);
select public.record_support_progress('4a000000-0000-0000-0000-000000000531', date '2026-08-07');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  'fabricated'::public.construction_stage,
  'Fabricated appears in the projection without any event row'
);
select is(
  (select count(*)::int from public.construction_progress_events
   where spool_revision_id = '43000000-0000-0000-0000-000000000531' and stage = 'fabricated'),
  0,
  'no fabricated event was ever written'
);

select is(
  (select array_length(welders, 1) from public.weld_progress_summary
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000531'),
  2,
  'the weld projection lists both welders'
);
select is(
  (select obligation_pending from public.weld_progress_summary
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000531'),
  1,
  'the weld projection counts the outstanding obligation'
);

-- A compensating event cancels its target
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000531', 'fabrication', 'start_fab', date '2026-08-01');

set local role postgres;
insert into public.construction_progress_events (
  project_id, spool_revision_id, phase, stage, occurred_on, source, compensates_event_id)
select project_id, spool_revision_id, phase, stage, occurred_on, 'compensation', id
from public.construction_progress_events
where spool_revision_id = '43000000-0000-0000-0000-000000000531'
  and stage = 'start_fab' and occurred_on = date '2026-08-01';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000532', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000532","role":"authenticated"}', true);

select is(
  (select start_fab_on from public.spool_progress_dates
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  date '2026-08-04',
  'a compensated event no longer contributes to the projection'
);

select is(
  (select count(*)::int from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  1,
  'the status projection returns one row per spool revision'
);

select * from finish();
rollback;
