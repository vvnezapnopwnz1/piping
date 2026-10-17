-- N2: spool_erection_readiness must return the same rows after it stops re-running RLS per row.
-- The oracle is the pre-optimisation definition (20261017124000), run without RLS; the view,
-- read as a platform admin, must match it column for column.
begin;
select plan(8);

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

-- Oracle: the old view body, security definer semantics (no RLS), only for the three fixture projects.
set local role postgres;
create temp view erection_oracle as
select
  sr.id as spool_revision_id, iso.project_id, iso.iso_number, spool.spool_number, rev.revision_number,
  rev.status as revision_status,
  material.material_line_total, material.material_line_checked, material.material_checked_on,
  welds.field_weld_total, welds.field_weld_complete, welds.last_field_weld_on,
  supports.field_support_total, supports.field_support_recorded, supports.last_field_support_on,
  dates.to_site_on, dates.erected_on, dates.welded_bolted_on, dates.supported_on,
  quality.nde_pending, quality.pwht_pending,
  coalesce(fsp.is_rft, false) as is_rft, fsp.rft_on, coalesce(fsp.rft_blockers, '[]'::jsonb) as rft_blockers
from public.spool_revisions sr
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
left join public.fabrication_spool_projections fsp on fsp.spool_revision_id = sr.id
cross join lateral (
  select count(line.id)::int as material_line_total,
         count(distinct item.spool_revision_material_id)::int as material_line_checked,
         max(mcr.checked_on) as material_checked_on
  from public.spool_revision_materials line
  left join public.material_check_records mcr on mcr.spool_revision_id = sr.id
  left join public.material_check_items item on item.material_check_record_id = mcr.id and item.spool_revision_material_id = line.id
  where line.spool_revision_id = sr.id
) material
cross join lateral (
  select count(wjr.id)::int as field_weld_total,
         count(progress.id) filter (where progress.phase = 'erection' and progress.weld_on is not null)::int as field_weld_complete,
         max(progress.weld_on) filter (where progress.phase = 'erection') as last_field_weld_on
  from public.weld_joint_revisions wjr
  left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id and wjr.weld_location = 'field' and not wjr.is_removed
) welds
cross join lateral (
  select count(supr.id)::int as field_support_total,
         count(progress.id) filter (where progress.phase = 'erection')::int as field_support_recorded,
         max(progress.installed_on) filter (where progress.phase = 'erection') as last_field_support_on
  from public.support_revisions supr
  left join public.support_progress_records progress on progress.support_revision_id = supr.id
  where supr.spool_revision_id = sr.id and not supr.is_removed
) supports
cross join lateral (
  select max(event.occurred_on) filter (where event.stage = 'to_site') as to_site_on,
         max(event.occurred_on) filter (where event.stage = 'erected') as erected_on,
         max(event.occurred_on) filter (where event.stage = 'welded_bolted') as welded_bolted_on,
         max(event.occurred_on) filter (where event.stage = 'supported') as supported_on
  from public.construction_progress_events event
  where event.spool_revision_id = sr.id and event.phase = 'erection' and event.source <> 'compensation'
    and not exists (select 1 from public.construction_progress_events cancel
                    where cancel.source = 'compensation' and cancel.compensates_event_id = event.id)
) dates
cross join lateral (
  select count(o.id) filter (where o.disposition not in ('satisfied', 'waived', 'superseded'))::int as nde_pending,
         count(q.id) filter (where not exists (select 1 from public.pwht_results result where result.pwht_requirement_id = q.id and result.outcome = 'accepted'))::int as pwht_pending
  from public.weld_joint_revisions j
  left join public.nde_obligations o on o.weld_joint_revision_id = j.id
  left join public.pwht_requirements q on q.weld_joint_revision_id = j.id
  where j.spool_revision_id = sr.id and j.weld_location = 'field' and not j.is_removed
) quality
where iso.project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192', '30000000-0000-0000-0000-000000001193');
grant select on erection_oracle to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001191","role":"authenticated"}', true);

select is((select count(*)::int from public.spool_erection_readiness
           where project_id in ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192')),
          2, 'one row per spool revision: both fixture spools, once each');
select results_eq(
  $$select * from public.spool_erection_readiness where project_id in
      ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192') order by spool_revision_id$$,
  $$select * from erection_oracle where project_id in
      ('30000000-0000-0000-0000-000000001191', '30000000-0000-0000-0000-000000001192') order by spool_revision_id$$,
  'a platform admin reads the same rows and values as the pre-optimisation definition');
select is((select count(*)::int from public.spool_erection_readiness
           where project_id = '30000000-0000-0000-0000-000000001193'),
          0, 'a project with no spools answers an empty set, not an error');
select is((select material_line_checked from public.spool_erection_readiness
           where spool_revision_id = '36000000-0000-0000-0000-000000001192'),
          1, 'the field material check is counted');
select is((select nde_pending from public.spool_erection_readiness
           where spool_revision_id = '43000000-0000-0000-0000-000000001191'),
          2, 'open field NDE obligations are counted');
select is((select last_field_support_on from public.spool_erection_readiness
           where spool_revision_id = '36000000-0000-0000-0000-000000001192'),
          date '2026-08-13', 'the last field support date is carried');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001193', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001193","role":"authenticated"}', true);
select results_eq(
  $$select spool_revision_id from public.spool_erection_readiness order by spool_revision_id$$,
  $$select spool_revision_id from erection_oracle where project_id = '30000000-0000-0000-0000-000000001191' order by spool_revision_id$$,
  'a project member reads exactly the rows of their own project');
select results_eq(
  $$select * from public.spool_erection_readiness order by spool_revision_id$$,
  $$select * from erection_oracle where project_id = '30000000-0000-0000-0000-000000001191' order by spool_revision_id$$,
  'a project member reads the same values as the pre-optimisation definition');

select * from finish();
rollback;
