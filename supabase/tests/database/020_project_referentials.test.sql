begin;
select plan(24);

select has_table('public', 'system_film_quantity_rules', 'system_film_quantity_rules table exists');
select has_table('public', 'system_ut_calculation_rules', 'system_ut_calculation_rules table exists');
select has_table('public', 'project_devices', 'project_devices table exists');
select has_table('public', 'project_device_users', 'project_device_users table exists');
select has_table('public', 'project_spooling_material_types', 'project_spooling_material_types table exists');
select has_table('public', 'project_spooling_material_classes', 'project_spooling_material_classes table exists');
select has_table('public', 'project_spooling_checklist_items', 'project_spooling_checklist_items table exists');
select has_table('public', 'project_ral_codes', 'project_ral_codes table exists');
select has_table('public', 'project_paint_matrix_rules', 'project_paint_matrix_rules table exists');
select has_table('public', 'project_assembly_settings', 'project_assembly_settings table exists');

select has_column('public', 'project_pds_areas', 'assembly_subcontractor_id', 'project_pds_areas has assembly_subcontractor_id');
select ok(
  exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.project_pds_areas'::regclass
      and constraint_row.contype = 'f'
      and pg_get_constraintdef(constraint_row.oid)
        like '%(assembly_subcontractor_id)%project_subcontractors(id)%'
  ),
  'assembly subcontractor references project subcontractors'
);

select col_type_is(
  'public', 'project_devices', 'status',
  'public.project_reference_status',
  'project_devices status column is project_reference_status enum'
);
select col_type_is(
  'public', 'project_ral_codes', 'line_service_id', 'uuid',
  'project_ral_codes line_service_id is uuid'
);
select col_type_is(
  'public', 'project_paint_matrix_rules',
  'required_final_dft_microns', 'numeric(10,3)',
  'project_paint_matrix_rules required_final_dft_microns is numeric(10,3)'
);

select has_index(
  'public', 'system_film_quantity_rules',
  'system_film_quantity_rules_lookup_idx',
  'system_film_quantity_rules has lookup index'
);
select has_index(
  'public', 'nde_matrix_rules',
  'nde_matrix_rules_lookup_idx',
  'nde_matrix_rules has lookup index'
);

-- Own project, so the test does not depend on rows already present in the database.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated',
        'referentials.020@example.test', 'not-used', now(), now(), now());

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000201', 'P-TEST-020-AS', 'P', 'O', 'C', 1,
        '10000000-0000-0000-0000-000000000201');

select lives_ok(
  $$insert into public.project_assembly_settings(project_id, enabled)
    values ('30000000-0000-0000-0000-000000000201', false)$$,
  'can insert project_assembly_settings row'
);

select throws_ok(
  $$
    with p as (insert into public.projects(activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by) values ('P-TEST-020', 'P', 'O', 'C', 1, gen_random_uuid()) returning id),
         ls as (insert into public.project_line_services(project_id, code, description) select id, 'LS-T', 'LS' from p returning id),
         rc as (insert into public.project_ral_codes(project_id, line_service_id, color_code, ral_code) select p.id, ls.id, 'C', 'R-1000' from p, ls returning id)
    insert into public.project_paint_matrix_rules(
      project_id, line_service_id, ral_code_id,
      blasting_required, primer_required,
      intermediate_coat_count, final_coat_count,
      required_final_dft_microns
    )
    select p.id, ls.id, rc.id, true, true, -1, 1, 250 from p, ls, rc;
  $$,
  '23514'
);

select throws_ok(
  $$insert into public.system_film_quantity_rules(
      diameter_from_inch, diameter_to_inch,
      thickness_from_mm, thickness_to_mm, film_count
    ) values (4, 2, 1, 2, 2)$$,
  '23514'
);

select throws_ok(
  $$insert into public.system_ut_calculation_rules(
      diameter_from_inch, diameter_to_inch,
      coefficient_diameter, coefficient_rating
    ) values (1, 2, -1, 1)$$,
  '23514'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.nde_matrix_rules'::regclass
      and pg_get_constraintdef(oid) like '%assembly%'
  ),
  'NDE Matrix accepts assembly location'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_progress_weights'::regclass
      and pg_get_constraintdef(oid) like '%assembly%'
  ),
  'progress weights accept assembly phase'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_custom_field_definitions'::regclass
      and pg_get_constraintdef(oid) like '%assembly%'
  ),
  'custom fields accept assembly scope'
);

select * from finish();
rollback;
