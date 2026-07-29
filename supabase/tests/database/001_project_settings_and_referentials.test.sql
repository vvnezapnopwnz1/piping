begin;

select plan(18);

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

select * from finish();

rollback;
