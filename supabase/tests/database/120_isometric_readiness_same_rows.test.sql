-- N2: isometric_readiness must return the same rows after it reads the projection instead of
-- spool_fabrication_readiness. The oracle is the previous definition, run without RLS.
begin;
select plan(6);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001191', 'authenticated', 'authenticated',
        'field.weld.119@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000001191';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001191', 'WELD-07', 'Field weld parity', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001191');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'PDS-07', 'Track 07 PDS');
insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'SUB-07', 'Field subcontractor');
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001191', 'material_type', 'CS-07', 'Carbon steel 07')
on conflict do nothing;
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191',
        '53000000-0000-0000-0000-000000001191', 'SC-07', 'Service class 07');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'BW-07', 'Butt weld 07');
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'CS-07', 'Carbon steel 07');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'A7',
        '54000000-0000-0000-0000-000000001191');
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on
)
values ('56000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191',
        '50000000-0000-0000-0000-000000001191', '53000000-0000-0000-0000-000000001191',
        'WPS-07', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on
)
values
  ('57000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191',
   '50000000-0000-0000-0000-000000001191', 'WF-ROOT', 'Field root', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000732', '30000000-0000-0000-0000-000000001191',
   '50000000-0000-0000-0000-000000001191', 'WF-CAP', 'Field cap', date '2027-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000001191', '56000000-0000-0000-0000-000000001191'),
  ('57000000-0000-0000-0000-000000000732', '56000000-0000-0000-0000-000000001191');
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required
)
values ('58000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191',
        '51000000-0000-0000-0000-000000001191', '52000000-0000-0000-0000-000000001191',
        'field', 100, 10, false);
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'ISO-07-F');
insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, pds_area_id,
  service_class_id, accepted_at
)
values ('42000000-0000-0000-0000-000000001191', '40000000-0000-0000-0000-000000001191', 'R0', 1,
        'accepted', '31000000-0000-0000-0000-000000001191',
        '51000000-0000-0000-0000-000000001191', now());
insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'SP-07-F');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000001191', '41000000-0000-0000-0000-000000001191',
        '42000000-0000-0000-0000-000000001191', 1, 'A7');
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001191', 'WF-07');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm
)
values ('47000000-0000-0000-0000-000000001191', '46000000-0000-0000-0000-000000001191',
        '43000000-0000-0000-0000-000000001191', '52000000-0000-0000-0000-000000001191',
        'field', 6, 8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000001191', '47000000-0000-0000-0000-000000001191', 'root', 1),
  ('48000000-0000-0000-0000-000000000732', '47000000-0000-0000-0000-000000001191', 'cap', 2);


insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001192', 'authenticated', 'authenticated',
        'erection.progress.119@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000001192';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001192', 'ERECT-07', 'Erection progress', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000001192');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001192', 'PDS-07', 'Track 07 PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001192', 'ISO-07-E');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000001192', '33000000-0000-0000-0000-000000001192', 'R0', 1, 'accepted',
        '31000000-0000-0000-0000-000000001192', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001192', 'SP-07-E');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000001192', '35000000-0000-0000-0000-000000001192',
        '34000000-0000-0000-0000-000000001192', 1);
insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001192', 'SUP-07-E');
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000001192', '49000000-0000-0000-0000-000000001192',
        '36000000-0000-0000-0000-000000001192', 'shoe', 1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000001192', '36000000-0000-0000-0000-000000001192', 'IDN-07', 1, 'ea', 'HEAT-07');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001192',
        'MRR-07', 'IDN-07', 'HEAT-07');


-- Project 3: no spools at all.
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000001193', 'EMPTY-119', 'Empty', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001191');

-- A project-scoped member of project 1 (not a platform admin).
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000001193', 'authenticated', 'authenticated', 'member.119@example.test', 'not-used', now(), now(), now());
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000001193', '30000000-0000-0000-0000-000000001191', '10000000-0000-0000-0000-000000001193', 'qc_engineer', 'project_admin', true);

-- A bare spool, a spool with a field weld and open NDE, a spool with material, support and events.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001191', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001191","role":"authenticated"}', true);
select public.record_construction_progress('43000000-0000-0000-0000-000000001191', 'fabrication', 'start_fab', date '2026-08-10', '{}'::jsonb, 'f119-fab');
select public.record_erection_progress('43000000-0000-0000-0000-000000001191', 'to_site', date '2026-08-11', '{}'::jsonb, 'f119-site');
select public.record_erection_progress('43000000-0000-0000-0000-000000001191', 'erected', date '2026-08-12', '{}'::jsonb, 'f119-erected');
select public.record_weld_progress(
  'erection',
  '47000000-0000-0000-0000-000000001191',
  '50000000-0000-0000-0000-000000001191',
  '56000000-0000-0000-0000-000000001191',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000001191","completion_percent":50,"welded_on":"2026-08-12"},{"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000732","completion_percent":50,"welded_on":"2026-08-12"}]'::jsonb,
  '{"weld_on":"2026-08-12"}'::jsonb,
  'field-weld');
select public.record_erection_progress('43000000-0000-0000-0000-000000001191', 'welded_bolted', date '2026-08-13', '{}'::jsonb, 'f119-welded');

select public.record_erection_progress('36000000-0000-0000-0000-000000001192', 'to_site', date '2026-08-10', '{}'::jsonb, 'f119-b-site');
select public.record_erection_progress('36000000-0000-0000-0000-000000001192', 'erected', date '2026-08-11', '{}'::jsonb, 'f119-b-erected');
select public.record_field_material_check('36000000-0000-0000-0000-000000001192', date '2026-08-12',
  '[{"spool_revision_material_id":"44000000-0000-0000-0000-000000001192","piping_material_record_id":"45000000-0000-0000-0000-000000001192"}]'::jsonb, null, 'f119-b-material');
select public.record_field_support_progress('4a000000-0000-0000-0000-000000001192', date '2026-08-13', 'f119-b-support');

-- Oracle: the definition before 20261018101000 (spool_fabrication_readiness joined live), without RLS.
set local role postgres;
create temp view isometric_oracle as
select * from (
WITH current_revision AS (
         SELECT iso.id AS isometric_id,
            iso.project_id,
            revision.id AS isometric_revision_id,
            revision.pds_area_id
           FROM (isometrics iso
             JOIN isometric_revisions revision ON (((revision.isometric_id = iso.id) AND (revision.status = 'accepted'::revision_status))))
        ), spool_facts AS (
         SELECT current_revision_1.isometric_id,
            (count(spool_revision.id))::integer AS spool_total,
            (count(spool_revision.id) FILTER (WHERE COALESCE(erection.is_rft, false)))::integer AS spool_complete,
            (COALESCE(sum(fabrication.weld_total), (0)::bigint))::integer AS weld_total,
            (COALESCE(sum(fabrication.weld_complete), (0)::bigint))::integer AS weld_complete,
            (COALESCE(sum(fabrication.support_total), (0)::bigint))::integer AS support_total,
            (COALESCE(sum(fabrication.support_recorded), (0)::bigint))::integer AS support_complete,
            (COALESCE(sum(erection.nde_pending), (0)::bigint))::integer AS nde_pending,
            (COALESCE(sum(erection.pwht_pending), (0)::bigint))::integer AS pwht_pending,
            bool_and(COALESCE(fabrication.is_releasable, false)) AS qc_released,
            max(erection.rft_on) AS rft_on
           FROM (((current_revision current_revision_1
             LEFT JOIN spool_revisions spool_revision ON (((spool_revision.isometric_revision_id = current_revision_1.isometric_revision_id) AND (NOT spool_revision.is_removed))))
             LEFT JOIN spool_erection_readiness erection ON ((erection.spool_revision_id = spool_revision.id)))
             LEFT JOIN spool_fabrication_readiness fabrication ON ((fabrication.spool_revision_id = spool_revision.id)))
          GROUP BY current_revision_1.isometric_id
        ), flange_facts AS (
         SELECT current_revision_1.isometric_id,
            (count(flange.flange_joint_revision_id))::integer AS flange_total,
            (count(flange.flange_joint_revision_id) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)))::integer AS flange_complete,
            COALESCE(sum(flange.calculated_ut) FILTER (WHERE (flange.effective_progress_id IS NOT NULL)), (0)::numeric) AS unit_time
           FROM (current_revision current_revision_1
             LEFT JOIN flange_joint_readiness flange ON (((flange.isometric_id = current_revision_1.isometric_id) AND (flange.revision_status = 'accepted'::revision_status) AND (NOT flange.is_removed))))
          GROUP BY current_revision_1.isometric_id
        ), line_facts AS (
         SELECT member.isometric_id,
            (count(*))::integer AS line_check_assigned,
            (count(*) FILTER (WHERE (result.id IS NOT NULL)))::integer AS line_check_completed
           FROM ((line_check_request_items member
             JOIN pressure_test_requests request ON (((request.id = member.request_id) AND (request.cancelled_at IS NULL))))
             LEFT JOIN line_check_results result ON (((result.request_id = member.request_id) AND (result.isometric_id = member.isometric_id))))
          GROUP BY member.isometric_id
        ), punch_facts AS (
         SELECT punch.isometric_id,
            (count(*))::integer AS open_x_count
           FROM (punch_items punch
             LEFT JOIN punch_item_clearances clearance ON ((clearance.punch_item_id = punch.id)))
          WHERE (clearance.id IS NULL)
          GROUP BY punch.isometric_id
        )
 SELECT current_revision.isometric_id,
    current_revision.project_id,
    current_revision.isometric_revision_id,
    current_revision.pds_area_id,
    COALESCE(spool_facts.spool_total, 0) AS spool_total,
    COALESCE(spool_facts.spool_complete, 0) AS spool_complete,
    COALESCE(spool_facts.weld_total, 0) AS weld_total,
    COALESCE(spool_facts.weld_complete, 0) AS weld_complete,
    COALESCE(spool_facts.support_total, 0) AS support_total,
    COALESCE(spool_facts.support_complete, 0) AS support_complete,
    COALESCE(flange_facts.flange_total, 0) AS flange_total,
    COALESCE(flange_facts.flange_complete, 0) AS flange_complete,
    COALESCE(spool_facts.nde_pending, 0) AS nde_pending,
    COALESCE(spool_facts.pwht_pending, 0) AS pwht_pending,
    COALESCE(line_facts.line_check_assigned, 0) AS line_check_assigned,
    COALESCE(line_facts.line_check_completed, 0) AS line_check_completed,
    COALESCE(punch_facts.open_x_count, 0) AS open_x_count,
    COALESCE(flange_facts.unit_time, (0)::numeric) AS unit_time,
    COALESCE(spool_facts.qc_released, false) AS is_qc_released,
    jsonb_build_object('NO_CURRENT_REVISION', 0, 'NO_SPOOLS',
        CASE
            WHEN (COALESCE(spool_facts.spool_total, 0) = 0) THEN 1
            ELSE 0
        END, 'WELD_OR_SUPPORT_PENDING', (GREATEST((COALESCE(spool_facts.weld_total, 0) - COALESCE(spool_facts.weld_complete, 0)), 0) + GREATEST((COALESCE(spool_facts.support_total, 0) - COALESCE(spool_facts.support_complete, 0)), 0)), 'FLANGE_PENDING', GREATEST((COALESCE(flange_facts.flange_total, 0) - COALESCE(flange_facts.flange_complete, 0)), 0), 'NDE_PENDING', COALESCE(spool_facts.nde_pending, 0), 'PWHT_PENDING', COALESCE(spool_facts.pwht_pending, 0), 'LINE_CHECK_PENDING',
        CASE
            WHEN ((COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed)) THEN 0
            ELSE 1
        END, 'X_OPEN', COALESCE(punch_facts.open_x_count, 0)) AS blocker_counts,
    ((COALESCE(spool_facts.spool_total, 0) > 0) AND (COALESCE(spool_facts.weld_total, 0) = COALESCE(spool_facts.weld_complete, 0)) AND (COALESCE(spool_facts.support_total, 0) = COALESCE(spool_facts.support_complete, 0)) AND (COALESCE(flange_facts.flange_total, 0) = COALESCE(flange_facts.flange_complete, 0)) AND (COALESCE(spool_facts.nde_pending, 0) = 0) AND (COALESCE(spool_facts.pwht_pending, 0) = 0) AND (COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed) AND (COALESCE(punch_facts.open_x_count, 0) = 0)) AS is_complete,
    ((COALESCE(spool_facts.spool_total, 0) > 0) AND (COALESCE(spool_facts.spool_total, 0) = COALESCE(spool_facts.spool_complete, 0)) AND (COALESCE(spool_facts.weld_total, 0) = COALESCE(spool_facts.weld_complete, 0)) AND (COALESCE(spool_facts.support_total, 0) = COALESCE(spool_facts.support_complete, 0)) AND (COALESCE(flange_facts.flange_total, 0) = COALESCE(flange_facts.flange_complete, 0)) AND (COALESCE(spool_facts.nde_pending, 0) = 0) AND (COALESCE(spool_facts.pwht_pending, 0) = 0) AND (COALESCE(line_facts.line_check_assigned, 0) > 0) AND (line_facts.line_check_assigned = line_facts.line_check_completed) AND (COALESCE(punch_facts.open_x_count, 0) = 0) AND COALESCE(spool_facts.qc_released, false)) AS is_rft,
        CASE
            WHEN (COALESCE(spool_facts.rft_on, NULL::date) IS NOT NULL) THEN spool_facts.rft_on
            ELSE NULL::date
        END AS rft_on
   FROM ((((current_revision
     LEFT JOIN spool_facts ON ((spool_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN flange_facts ON ((flange_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN line_facts ON ((line_facts.isometric_id = current_revision.isometric_id)))
     LEFT JOIN punch_facts ON ((punch_facts.isometric_id = current_revision.isometric_id)))
) previous
where project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001193');
grant select on isometric_oracle to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001191', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001191","role":"authenticated"}', true);

select is((select count(*)::int from public.isometric_readiness where project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192')),
          2, 'one row per accepted isometric: both fixture isometrics, once each');
select results_eq(
  $$select * from public.isometric_readiness where project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192') order by isometric_id$$,
  $$select * from isometric_oracle where project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192') order by isometric_id$$,
  'a platform admin reads the same rows and values as the previous definition');
select is((select count(*)::int from public.isometric_readiness where project_id = '30000000-0000-0000-0000-000000001193'),
          0, 'a project without isometrics answers an empty set, not an error');
select is((select spool_total from public.isometric_readiness where project_id = '30000000-0000-0000-0000-000000001191'),
          1, 'the spool of the first project is counted');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001193', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001193","role":"authenticated"}', true);
select results_eq(
  $$select isometric_id from public.isometric_readiness order by isometric_id$$,
  $$select isometric_id from isometric_oracle where project_id = '30000000-0000-0000-0000-000000001191' order by isometric_id$$,
  'a project member reads exactly the isometrics of their own project');
select results_eq(
  $$select * from public.isometric_readiness order by isometric_id$$,
  $$select * from isometric_oracle where project_id = '30000000-0000-0000-0000-000000001191' order by isometric_id$$,
  'a project member reads the same values as the previous definition');

select * from finish();
rollback;
