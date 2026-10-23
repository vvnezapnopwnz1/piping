begin;
select plan(16);

-- copy_project_references copies the referentials of one project into an empty one: every row new, a reference
-- from a copied row to another copied row pointed at the copy, a system entry left alone, nothing outside the
-- referentials (no spools, no memberships). It refuses a target that already has referentials, the same project,
-- and a caller who may not manage the target or view the source.

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000001391', 'authenticated', 'authenticated', 'copy.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000001392', 'authenticated', 'authenticated', 'copy.stranger@example.test', 'not-used', now(), now(), now());
update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000001391';
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000001391', 'COPYSRC-139', 'Source', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001391'),
  ('30000000-0000-0000-0000-000000001392', 'COPYDST-139', 'Target', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001391'),
  ('30000000-0000-0000-0000-000000001393', 'COPYOTH-139', 'Other', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000001391');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000001391', 'material_type', 'CS-139', 'Carbon steel 139')
on conflict do nothing;

-- The source project's referentials, with references between them.
insert into public.project_subcontractors (id, project_id, code, description) values
  ('41000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'SHOP-139', 'Shop'),
  ('41000000-0000-0000-0000-000000001392', '30000000-0000-0000-0000-000000001391', 'FIELD-139', 'Field');
insert into public.project_units (id, project_id, code, description)
values ('42000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'U-139', 'Unit');
insert into public.project_area_classifications (id, project_id, unit_id, code, description)
values ('43000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '42000000-0000-0000-0000-000000001391', 'AC-139', 'Area class');
insert into public.project_pds_areas (id, project_id, code, description, shop_subcontractor_id, field_subcontractor_id, area_classification_id)
values ('44000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'PDS-139', 'Area',
        '41000000-0000-0000-0000-000000001391', '41000000-0000-0000-0000-000000001392', '43000000-0000-0000-0000-000000001391');
insert into public.project_weld_types (id, project_id, code, description)
values ('45000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'BW', 'Butt weld');
insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('46000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '53000000-0000-0000-0000-000000001391', 'SC-139', 'Service class');
insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000001391', '46000000-0000-0000-0000-000000001391', 6, 7.11, '150#');
insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000001391', '46000000-0000-0000-0000-000000001391', '45000000-0000-0000-0000-000000001391', 'shop', 10);
insert into public.project_welding_procedures (id, project_id, subcontractor_id, material_type_id, code, process, diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('47000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '41000000-0000-0000-0000-000000001391',
        '53000000-0000-0000-0000-000000001391', 'WPS-139', 'GTAW', 1, 24, 2, 40, '0', date '2026-01-01');
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values ('48000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '41000000-0000-0000-0000-000000001391', 'W-139', 'Welder 139', date '2030-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('48000000-0000-0000-0000-000000001391', '47000000-0000-0000-0000-000000001391');
insert into public.project_line_services (id, project_id, code, description)
values ('49000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'PROC', 'Process');
insert into public.project_ral_codes (id, project_id, line_service_id, color_code, ral_code)
values ('4a000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '49000000-0000-0000-0000-000000001391', 'Grey', 'RAL 7035');
insert into public.project_paint_matrix_rules (project_id, line_service_id, ral_code_id, blasting_required, primer_required, intermediate_coat_count, final_coat_count, required_final_dft_microns)
values ('30000000-0000-0000-0000-000000001391', '49000000-0000-0000-0000-000000001391', '4a000000-0000-0000-0000-000000001391', true, true, 1, 1, 250);
insert into public.project_systems (id, project_id, code, description)
values ('4b000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', '100', 'System');
insert into public.project_subsystems (project_id, system_id, code, description)
values ('30000000-0000-0000-0000-000000001391', '4b000000-0000-0000-0000-000000001391', '100-01', 'Subsystem');
insert into public.project_location_categories (id, project_id, code, description)
values ('4c000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391', 'LAY', 'Laydown');
insert into public.project_locations (project_id, category_id, code, description)
values ('30000000-0000-0000-0000-000000001391', '4c000000-0000-0000-0000-000000001391', 'LAY-A', 'Laydown A');
insert into public.project_pressure_units (project_id, unit) values ('30000000-0000-0000-0000-000000001391', 'bar');

-- A project with referentials of its own, for the "target is not empty" case.
insert into public.project_subcontractors (project_id, code, description)
values ('30000000-0000-0000-0000-000000001393', 'OWN-139', 'Own');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001391', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001391","role":"authenticated"}', true);

create temporary table copied as
select public.copy_project_references('30000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001392') as rows;
grant all on copied to authenticated;

select is((select rows from copied), 20, 'the command reports every row it copied, the welder-procedure link included');

select is((select count(*)::int from public.project_subcontractors where project_id = '30000000-0000-0000-0000-000000001392'), 2, 'subcontractors are copied');
select is((select count(*)::int from public.project_welding_procedures where project_id = '30000000-0000-0000-0000-000000001392'), 1, 'procedures are copied although a user cannot insert them');
select is((select count(*)::int from public.welder_wps_qualifications q join public.welder_qualifications w on w.id = q.welder_qualification_id where w.project_id = '30000000-0000-0000-0000-000000001392'), 1, 'the welder-procedure link follows the copies');

select is(
  (select count(*)::int from public.project_pds_areas a
     join public.project_subcontractors s on s.id = a.shop_subcontractor_id
     join public.project_subcontractors f on f.id = a.field_subcontractor_id
     join public.project_area_classifications c on c.id = a.area_classification_id
    where a.project_id = '30000000-0000-0000-0000-000000001392'
      and s.project_id = '30000000-0000-0000-0000-000000001392'
      and f.project_id = '30000000-0000-0000-0000-000000001392'
      and c.project_id = '30000000-0000-0000-0000-000000001392'),
  1, 'a PDS area points at the copies of its subcontractors and area class, not at the source');

select is(
  (select count(*)::int from public.nde_matrix_rules r
     join public.project_service_classes c on c.id = r.service_class_id and c.project_id = r.project_id
     join public.project_weld_types w on w.id = r.weld_type_id and w.project_id = r.project_id
    where r.project_id = '30000000-0000-0000-0000-000000001392'),
  1, 'an NDE rule points at the copied class and weld type');

select is(
  (select count(*)::int from public.project_service_classes where project_id = '30000000-0000-0000-0000-000000001392' and material_type_id = '53000000-0000-0000-0000-000000001391'),
  1, 'a system entry is referenced as it is, not copied');

select is(
  (select count(*)::int from public.project_paint_matrix_rules p
     join public.project_ral_codes r on r.id = p.ral_code_id and r.project_id = p.project_id
     join public.project_line_services l on l.id = p.line_service_id and l.project_id = p.project_id
    where p.project_id = '30000000-0000-0000-0000-000000001392'),
  1, 'a paint rule points at the copied RAL code and line service');

select is((select count(*)::int from public.project_locations l join public.project_location_categories c on c.id = l.category_id where l.project_id = '30000000-0000-0000-0000-000000001392' and c.project_id = l.project_id), 1, 'a location points at the copied category');
select is((select unit from public.project_pressure_units where project_id = '30000000-0000-0000-0000-000000001392'), 'bar', 'a table with no id of its own is copied too');

select is((select count(*)::int from public.project_subcontractors where project_id = '30000000-0000-0000-0000-000000001391'), 2, 'the source is unchanged');
select is(
  (select count(*)::int from public.project_subcontractors a join public.project_subcontractors b on a.id = b.id where a.project_id = '30000000-0000-0000-0000-000000001391' and b.project_id = '30000000-0000-0000-0000-000000001392'),
  0, 'every copied row has a new id');
select is((select count(*)::int from public.project_memberships where project_id = '30000000-0000-0000-0000-000000001392'), 1, 'only the creator is a member of the target: memberships are not copied');

select throws_ok(
  $$select public.copy_project_references('30000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001392')$$,
  '23514', null, 'a target that already has referentials is refused');
select throws_ok(
  $$select public.copy_project_references('30000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001391')$$,
  '23514', null, 'a project cannot copy itself');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000001392', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000001392","role":"authenticated"}', true);
select throws_ok(
  $$select public.copy_project_references('30000000-0000-0000-0000-000000001391', '30000000-0000-0000-0000-000000001393')$$,
  '42501', null, 'a user with no access to the projects is refused');

select * from finish();
rollback;
