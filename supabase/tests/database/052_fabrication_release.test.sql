begin;
select plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000521', 'authenticated', 'authenticated', 'rel.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000522', 'authenticated', 'authenticated', 'rel.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000521';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000521', 'REL-A', 'Release A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000521');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '10000000-0000-0000-0000-000000000522', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000521', 'material_type', 'CS2', 'Carbon steel 2')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '53000000-0000-0000-0000-000000000521', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'BW', 'Butt weld');

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'CS2', 'Carbon steel 2');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'A1',
        '54000000-0000-0000-0000-000000000521');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '50000000-0000-0000-0000-000000000521', '53000000-0000-0000-0000-000000000521',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
   '50000000-0000-0000-0000-000000000521', 'W-1', 'Welder One', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000522', '30000000-0000-0000-0000-000000000521',
   '50000000-0000-0000-0000-000000000521', 'W-2', 'Welder Two', date '2027-01-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000521', '56000000-0000-0000-0000-000000000521'),
  ('57000000-0000-0000-0000-000000000522', '56000000-0000-0000-0000-000000000521');

-- RT 100 only, no PWHT: the shortest complete path
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '51000000-0000-0000-0000-000000000521', '52000000-0000-0000-0000-000000000521',
        'shop', 100, false);

insert into public.project_line_services (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'LS-1', 'Line service 1');

insert into public.project_ral_codes (id, project_id, line_service_id, color_code, ral_code)
values ('5a000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '59000000-0000-0000-0000-000000000521', 'GREY', 'RAL7035');

insert into public.project_paint_matrix_rules (
  id, project_id, line_service_id, ral_code_id, blasting_required, primer_required,
  intermediate_coat_count, final_coat_count, required_final_dft_microns)
values ('5b000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '59000000-0000-0000-0000-000000000521', '5a000000-0000-0000-0000-000000000521',
        true, true, 1, 1, 240);

insert into public.project_location_categories (id, project_id, code, description)
values ('5c000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'YARD', 'Yard');

insert into public.project_locations (id, project_id, category_id, code, description)
values ('5d000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '5c000000-0000-0000-0000-000000000521', 'YARD-1', 'Yard bay 1');

-- Definition graph: one spool, one weld, one support, two bill lines
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'ISO-0521');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SP-0521-A');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'W-0521-01');

insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SUP-0521-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000521', '40000000-0000-0000-0000-000000000521', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000521', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000521', '41000000-0000-0000-0000-000000000521',
        '42000000-0000-0000-0000-000000000521', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000521', '46000000-0000-0000-0000-000000000521',
        '43000000-0000-0000-0000-000000000521', '52000000-0000-0000-0000-000000000521', 'shop', 6, 8);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000521', '47000000-0000-0000-0000-000000000521', 'root', 1),
  ('48000000-0000-0000-0000-000000000522', '47000000-0000-0000-0000-000000000521', 'cap', 2);

insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000521', '49000000-0000-0000-0000-000000000521',
        '43000000-0000-0000-0000-000000000521', 'shoe', 1);

insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000521', '43000000-0000-0000-0000-000000000521',
        'IDN-100', 3, 'm', 'HEAT-100');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        'MRR-1', 'IDN-100', 'HEAT-100');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000522', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000522","role":"authenticated"}', true);

select has_view('public', 'spool_fabrication_readiness', 'the readiness view exists');

-- Nothing done yet
select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  false,
  'an untouched spool is not fabricated'
);
select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10')$$,
  'PQC32', null,
  'QC release is refused while material check is incomplete'
);

-- Walk the golden path
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000521', 'fabrication', 'start_fab', date '2026-08-04');
select public.record_material_check(
  '43000000-0000-0000-0000-000000000521', date '2026-08-05',
  '[{"ident_code":"IDN-100","trace_number":"HEAT-100","quantity":3}]'::jsonb);
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000521',
  '50000000-0000-0000-0000-000000000521',
  '56000000-0000-0000-0000-000000000521',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000521",
     "completion_percent":50,"welded_on":"2026-08-06"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000522",
     "completion_percent":50,"welded_on":"2026-08-06"}]'::jsonb,
  '{"weld_on":"2026-08-06"}'::jsonb);
select public.record_support_progress('4a000000-0000-0000-0000-000000000521', date '2026-08-07');

select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  true,
  'material check, welds and supports derive Fabricated'
);
select is(
  (select fabricated_on from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  date '2026-08-07',
  'the fabrication date is the latest of its three inputs'
);
select is(
  (select is_releasable from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  false,
  'a fabricated spool with a pending obligation is not releasable'
);

-- Dossier 30 prohibition 8
select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10')$$,
  'PQC37', null,
  'QC release is refused while an NDE obligation is outstanding'
);

select public.record_nde_obligation_outcome(
  (select id from public.nde_obligations
   where spool_revision_id = '43000000-0000-0000-0000-000000000521' and method = 'rt'),
  'satisfied');

select is(
  (select is_releasable from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  true,
  'satisfying the obligation makes the spool releasable'
);

select lives_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10', null, 'Released')$$,
  'the spool is QC released'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000521', 'qc_release'),
  date '2026-08-10',
  'the release wrote its own ledger event'
);

-- Paint follows Sent to Paint, and nothing else
select throws_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12"}'::jsonb)$$,
  'PQC32', null,
  'painting is refused before Sent to Paint'
);

select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000521', 'fabrication', 'sent_to_paint', date '2026-08-11');

select throws_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12","measured_dft_microns":200,"w10p_form_number":"W10P-1"}'::jsonb)$$,
  '23514', null,
  'a DFT below the paint matrix requirement is refused'
);

select lives_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12","final_qc_on":"2026-08-13","measured_dft_microns":260,
        "w10p_form_number":"W10P-1","intermediate_coats":1,"final_coats":1}'::jsonb)$$,
  'painting with a compliant DFT is accepted'
);
select is(
  (select required_final_dft_microns from public.paint_progress_records
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  240::numeric,
  'the paint record snapshots the DFT requirement'
);

select lives_ok(
  $$select public.record_laydown(
      '43000000-0000-0000-0000-000000000521', '5d000000-0000-0000-0000-000000000521',
      date '2026-08-14')$$,
  'the spool reaches laydown'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000521', 'laydown'),
  date '2026-08-14',
  'the whole fabrication path is on the ledger'
);

-- A superseded revision accepts nothing
set local role postgres;
update public.isometric_revisions set status = 'superseded', superseded_at = now()
where id = '42000000-0000-0000-0000-000000000521';
set local role authenticated;

select throws_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000521', 'fabrication', 'start_fab', date '2026-08-15')$$,
  'PQC31', null,
  'a superseded revision refuses new progress'
);

select * from finish();
rollback;
