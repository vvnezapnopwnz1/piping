begin;

-- Fixtures setup
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin_a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'reader_a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin_b@example.test', 'not-used', now(), now(), now());

update public.profiles
set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000001';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000001', 'PROJ-A', 'Project A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'PROJ-B', 'Project B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000001');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'qc_engineer', 'project_reader', true),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SUB-A', 'Sub A'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'SUB-B', 'Sub B');

insert into public.project_line_services (id, project_id, code, description)
values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'LS-A', 'Line Service A'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'LS-B', 'Line Service B');

insert into public.project_pds_areas (id, project_id, code, description, shop_subcontractor_id)
values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PDS-A', 'PDS Area A', '40000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'PDS-B', 'PDS Area B', '40000000-0000-0000-0000-000000000002');

select plan(22);

-- Test 1: Project Admin A reads project A references
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.project_subcontractors
    where project_id = '30000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'Project Admin A reads project A references'
);

select is_empty(
  $$select id from public.project_subcontractors
    where project_id = '30000000-0000-0000-0000-000000000002'$$,
  'Project Admin A cannot read project B references'
);

select throws_ok(
  $$insert into public.project_subcontractors(
      project_id, code, description
    ) values ('30000000-0000-0000-0000-000000000002', 'ILLEGAL', 'Cross-project')$$,
  '42501',
  NULL,
  'Project Admin A cannot insert into project B'
);

select throws_ok(
  $$delete from public.project_subcontractors
    where project_id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'Project Admin A cannot hard delete reference rows'
);

select throws_ok(
  $$insert into public.project_pds_areas(
      project_id, code, description, shop_subcontractor_id
    ) values (
      '30000000-0000-0000-0000-000000000001', 'BAD-PDS', 'Bad',
      '40000000-0000-0000-0000-000000000002'
    )$$,
  '23503',
  NULL,
  'PDS area cannot reference subcontractor from another project'
);

reset role;

-- Test 2: Project Reader A permissions
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.project_subcontractors
    where project_id = '30000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'Reader A can select project A references'
);

select throws_ok(
  $$insert into public.project_subcontractors(
      project_id, code, description
    ) values ('30000000-0000-0000-0000-000000000001', 'READONLY', 'Fail')$$,
  '42501',
  NULL,
  'Reader A cannot insert reference rows'
);

-- RLS filters out rows on update so 0 rows are updated
update public.project_subcontractors
set status = 'archived'
where id = '40000000-0000-0000-0000-000000000001';

select results_eq(
  $$select status from public.project_subcontractors
    where id = '40000000-0000-0000-0000-000000000001'$$,
  array['active'::public.project_reference_status],
  'Reader A cannot update reference status (remains active)'
);

reset role;

-- Test 3: Platform Admin and System Referentials
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select * from public.system_film_quantity_rules$$,
  'Platform Admin can read system rules'
);

select lives_ok(
  $$insert into public.system_reference_entries(kind, code, description)
    values ('material_type', 'SYS-MAT-1', 'System Material 1')$$,
  'Platform Admin can insert system_reference_entries'
);

reset role;

-- Project Admin A cannot mutate system referentials
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$insert into public.system_reference_entries(kind, code, description)
    values ('material_type', 'SYS-MAT-BAD', 'Fail')$$,
  '42501',
  NULL,
  'Project Admin A cannot insert system_reference_entries'
);

reset role;

-- Test 4: Custom Field Enforcements
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select lives_ok(
  $$insert into public.project_custom_field_definitions(project_id, scope, field_key, label, data_type, sort_order)
    values
      ('30000000-0000-0000-0000-000000000001', 'prefabrication', 'field_1', 'Field 1', 'text', 1),
      ('30000000-0000-0000-0000-000000000001', 'prefabrication', 'field_2', 'Field 2', 'text', 2),
      ('30000000-0000-0000-0000-000000000001', 'prefabrication', 'field_3', 'Field 3', 'text', 3)$$,
  'Can insert up to three custom fields per scope'
);

select throws_ok(
  $$insert into public.project_custom_field_definitions(project_id, scope, field_key, label, data_type, sort_order)
    values ('30000000-0000-0000-0000-000000000001', 'prefabrication', 'field_4', 'Field 4', 'text', 4)$$,
  '23514',
  NULL,
  'Cannot insert 4th active custom field in scope'
);

select throws_ok(
  $$update public.project_custom_field_definitions
    set field_key = 'field_1_changed'
    where project_id = '30000000-0000-0000-0000-000000000001' and field_key = 'field_1'$$,
  '23514',
  NULL,
  'Custom field key cannot be changed'
);

-- Archive field_3 and insert a replacement
select lives_ok(
  $$update public.project_custom_field_definitions
    set status = 'archived'
    where project_id = '30000000-0000-0000-0000-000000000001' and field_key = 'field_3'$$
);

select lives_ok(
  $$insert into public.project_custom_field_definitions(project_id, scope, field_key, label, data_type, sort_order)
    values ('30000000-0000-0000-0000-000000000001', 'prefabrication', 'field_4', 'Field 4', 'text', 4)$$,
  'Archived field does not count towards max-three'
);

reset role;

-- Audit verification test
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select lives_ok(
  $$update public.project_subcontractors
    set description = 'Sub A Updated'
    where id = '40000000-0000-0000-0000-000000000001'$$
);

reset role;

select results_eq(
  $$select count(*)::bigint from public.audit_events
    where project_id = '30000000-0000-0000-0000-000000000001'
      and actor_id = '10000000-0000-0000-0000-000000000002'
      and entity_type = 'project_subcontractors'$$,
  array[1::bigint],
  'Audit event written on reference update'
);

-- Task 4 assertions for progress weights and setup readiness
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$select public.set_project_progress_weights(
      '30000000-0000-0000-0000-000000000001',
      'prefabrication',
      '[{"activity":"material_check","weight":40},
        {"activity":"weld_progress","weight":50}]'::jsonb
    )$$,
  '23514',
  NULL,
  'Progress weights must total exactly 100'
);

select lives_ok(
  $$select public.set_project_progress_weights(
      '30000000-0000-0000-0000-000000000001',
      'prefabrication',
      '[{"activity":"material_check","weight":40},
        {"activity":"weld_progress","weight":60}]'::jsonb
    )$$
);

select results_eq(
  $$select sum(weight)::numeric
    from public.project_progress_weights
    where project_id = '30000000-0000-0000-0000-000000000001'
      and phase = 'prefabrication'
      and status = 'active'$$,
  array[100::numeric]
);

select results_eq(
  $$select ready_for_import
    from public.get_project_setup_readiness('30000000-0000-0000-0000-000000000001')$$,
  array[false]
);

reset role;

select * from finish();
rollback;
