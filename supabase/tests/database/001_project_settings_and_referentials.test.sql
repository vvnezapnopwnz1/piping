begin;

select plan(49);

select has_table('public', 'projects', 'projects exists');
select has_table('public', 'project_memberships', 'memberships exist');
select has_table('public', 'project_welding_procedures', 'WPS referential exists');
select has_table('public', 'nde_matrix_rules', 'NDE matrix exists');
select has_table('public', 'piping_material_records', 'PML referential exists');
select has_table('public', 'audit_events', 'audit skeleton exists');
select col_is_pk('public', 'project_pressure_units', 'project_id', 'one pressure unit per project');
select ok(
  has_table_privilege('authenticated', 'public.project_memberships', 'select'),
  'authenticated can read project memberships before RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.projects', 'select'),
  'authenticated can read projects before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'activity_code', 'update'),
  'authenticated can update project definition activity code before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'title', 'update'),
  'authenticated can update project definition title before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'owner_name', 'update'),
  'authenticated can update project definition owner before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'contractor_name', 'update'),
  'authenticated can update project definition contractor before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'owner_logo_path', 'update'),
  'authenticated can update project definition owner logo path before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'contractor_logo_path', 'update'),
  'authenticated can update project definition contractor logo path before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'maximum_transit_time_days', 'update'),
  'authenticated can update project definition transit time before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'created_by', 'update'),
  'authenticated cannot reassign a project creator before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.projects', 'status', 'update'),
  'authenticated cannot change a project status before RLS applies'
);

select ok(
  has_table_privilege('authenticated', 'public.system_reference_entries', 'select'),
  'authenticated can read system referential entries before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'kind', 'insert'),
  'authenticated can set a system reference kind when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'code', 'insert'),
  'authenticated can set a system reference code when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'description', 'insert'),
  'authenticated can set a system reference description when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'code', 'update'),
  'authenticated can update a system reference code before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'description', 'update'),
  'authenticated can update a system reference description before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'status', 'update'),
  'authenticated can update a system reference status before RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.system_reference_entries', 'delete'),
  'authenticated can request system reference deletion before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'kind', 'update'),
  'authenticated cannot reclassify a system reference kind'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'attributes', 'update'),
  'authenticated cannot overwrite unmodelled system reference attributes'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'created_at', 'update'),
  'authenticated cannot alter a system reference creation timestamp'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'updated_at', 'update'),
  'authenticated cannot alter a system reference update timestamp'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'system_reference_entries'
      and policyname = 'platform admins insert material types only'
      and permissive = 'RESTRICTIVE'
      and cmd = 'INSERT'
      and with_check like '%material_type%'
  ),
  'only material_type can be inserted through the browser role'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'system_reference_entries'
      and policyname = 'platform admins update material types only'
      and permissive = 'RESTRICTIVE'
      and cmd = 'UPDATE'
      and qual like '%material_type%'
      and with_check like '%material_type%'
  ),
  'only material_type can be updated through the browser role'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'system_reference_entries'
      and policyname = 'platform admins delete material types only'
      and permissive = 'RESTRICTIVE'
      and cmd = 'DELETE'
      and qual like '%material_type%'
  ),
  'only material_type can be deleted through the browser role'
);

select col_not_null(
  'public', 'project_welding_procedures', 'subcontractor_id',
  'a WPS must belong to a subcontractor'
);
select ok(
  has_table_privilege('authenticated', 'public.project_welding_procedures', 'select'),
  'authenticated can read WPS rows before RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.project_subcontractors', 'select'),
  'authenticated can read project subcontractors before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'project_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'subcontractor_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'material_type_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'code', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'process', 'insert'),
  'authenticated can set required WPS identity fields on insert before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_from', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_to', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_from', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_to', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'revision', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'approved_on', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'insert'),
  'authenticated can set WPS bounds, revision, date and lifecycle on insert before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'subcontractor_id', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'material_type_id', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'code', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'description', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'process', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_from', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_to', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_from', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_to', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'revision', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'approved_on', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'update'),
  'authenticated can update only WPS business fields before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'project_id', 'update'),
  'authenticated cannot move a WPS to another project'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'created_at', 'update')
  and not has_column_privilege('authenticated', 'public.project_welding_procedures', 'updated_at', 'update'),
  'authenticated cannot alter WPS audit timestamps'
);
select ok(
  not has_table_privilege('authenticated', 'public.project_welding_procedures', 'delete'),
  'authenticated cannot hard-delete WPS records'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.project_welding_procedures'::regclass
      and tgname = 'project_wps_subcontractor_tenant'
  ),
  'WPS subcontractor stays constrained to the WPS project'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.project_welding_procedures'::regclass
      and tgname = 'project_wps_material_type_kind'
  ),
  'WPS material type stays constrained to the material_type system kind'
);

select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'description', 'insert'),
  'authenticated can set optional WPS description on insert before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'id', 'insert'),
  'authenticated cannot choose a WPS primary key'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'created_at', 'insert')
  and not has_column_privilege('authenticated', 'public.project_welding_procedures', 'updated_at', 'insert'),
  'authenticated cannot choose WPS audit timestamps on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'id', 'update'),
  'authenticated cannot alter a WPS primary key'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'update'),
  'authenticated can request a WPS lifecycle change before RLS applies'
);

select * from finish();

rollback;
