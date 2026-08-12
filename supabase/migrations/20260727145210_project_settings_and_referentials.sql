-- PipeQC configuration foundation. Domain source: Easy Piping User Manual §§1–4.
-- This migration intentionally creates no demo/operational seed data.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'system_admin', 'project_manager', 'qc_engineer', 'nde_inspector',
  'spooling_team', 'subcontractor'
);

create type public.system_reference_kind as enum (
  'material_type', 'film_quantity', 'ut_calculation', 'torquing_requirement'
);

create type public.team_type as enum (
  'line_check', 'blinding', 'finishing', 'reinstatement', 'jointer'
);

create type public.pressure_unit as enum ('bar', 'psi');

create type public.ndt_method as enum ('rt', 'ut', 'mt', 'pt', 'pmi', 'ht', 'vt');

create type public.area_environment as enum ('above_ground', 'underground');

create type public.project_reference_status as enum ('active', 'inactive', 'archived');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_creates_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  activity_code text not null check (activity_code ~ '^[A-Z0-9-]+$'),
  title text not null check (length(trim(title)) > 0),
  owner_name text not null check (length(trim(owner_name)) > 0),
  contractor_name text not null check (length(trim(contractor_name)) > 0),
  contract_number text,
  owner_logo_path text,
  contractor_logo_path text,
  maximum_transit_time_days integer not null check (maximum_transit_time_days >= 1),
  status public.project_reference_status not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (activity_code)
);

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, user_id)
);

create function public.add_creator_as_project_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_memberships (project_id, user_id, role)
  values (new.id, new.created_by, 'system_admin');
  return new;
end;
$$;

create trigger projects_add_creator_as_admin
  after insert on public.projects
  for each row execute procedure public.add_creator_as_project_admin();

create table public.system_reference_entries (
  id uuid primary key default gen_random_uuid(),
  kind public.system_reference_kind not null,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (kind, code)
);

create table public.project_custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  scope text not null check (scope in ('prefabrication', 'erection', 'pds_area', 'spool_category')),
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(trim(label)) > 0),
  data_type text not null check (data_type in ('date', 'text', 'number', 'boolean')),
  sort_order smallint not null check (sort_order >= 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, scope, field_key),
  unique (project_id, scope, sort_order)
);

create table public.project_subcontractors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  contact_details text,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_area_classifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  unit_id uuid references public.project_units(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_pds_areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  shop_subcontractor_id uuid references public.project_subcontractors(id) on delete restrict,
  field_subcontractor_id uuid references public.project_subcontractors(id) on delete restrict,
  area_classification_id uuid references public.project_area_classifications(id) on delete restrict,
  environment public.area_environment,
  is_unit boolean,
  is_rack boolean,
  custom_values jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_values) = 'object'),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  team_type public.team_type not null,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, team_type, code)
);

create table public.project_systems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_subsystems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  system_id uuid not null references public.project_systems(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_line_services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_service_classes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  material_type_id uuid not null references public.system_reference_entries(id) on delete restrict,
  code text not null,
  description text,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_weld_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  counts_in_dia_inch boolean not null default true,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_welding_procedures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  subcontractor_id uuid references public.project_subcontractors(id) on delete restrict,
  material_type_id uuid not null references public.system_reference_entries(id) on delete restrict,
  code text not null,
  description text,
  process text not null,
  diameter_from numeric(8, 3) not null check (diameter_from >= 0),
  diameter_to numeric(8, 3) not null check (diameter_to >= diameter_from),
  thickness_from numeric(8, 3) not null check (thickness_from >= 0),
  thickness_to numeric(8, 3) not null check (thickness_to >= thickness_from),
  revision text not null,
  approved_on date not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code, revision)
);

create table public.welder_qualifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  subcontractor_id uuid not null references public.project_subcontractors(id) on delete restrict,
  welder_code text not null,
  full_name text not null,
  certificate_number text,
  expires_on date not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, welder_code)
);

create table public.welder_wps_qualifications (
  welder_qualification_id uuid not null references public.welder_qualifications(id) on delete restrict,
  wps_id uuid not null references public.project_welding_procedures(id) on delete restrict,
  primary key (welder_qualification_id, wps_id)
);

create table public.nde_matrix_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  service_class_id uuid not null references public.project_service_classes(id) on delete restrict,
  weld_type_id uuid not null references public.project_weld_types(id) on delete restrict,
  weld_location text not null check (weld_location in ('shop', 'field')),
  rt_coverage numeric(5, 2) not null default 0 check (rt_coverage between 0 and 100),
  ut_coverage numeric(5, 2) not null default 0 check (ut_coverage between 0 and 100),
  mt_coverage numeric(5, 2) not null default 0 check (mt_coverage between 0 and 100),
  pt_coverage numeric(5, 2) not null default 0 check (pt_coverage between 0 and 100),
  pmi_coverage numeric(5, 2) not null default 0 check (pmi_coverage between 0 and 100),
  ht_coverage numeric(5, 2) not null default 0 check (ht_coverage between 0 and 100),
  pwht_required boolean not null default false,
  pwht_thickness_threshold numeric(8, 3),
  material_traceability_required boolean not null default false,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, service_class_id, weld_type_id, weld_location)
);

create table public.project_rework_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_thickness_flange_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  service_class_id uuid not null references public.project_service_classes(id) on delete restrict,
  diameter_inch numeric(8, 3) not null check (diameter_inch > 0),
  thickness_mm numeric(8, 3) not null check (thickness_mm > 0),
  flange_rating text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, service_class_id, diameter_inch),
  unique (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
);

create table public.piping_material_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  mrr_number text not null,
  ident_code text not null,
  trace_number text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, ident_code, trace_number)
);

create table public.project_joint_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  joint_definition text not null,
  timing text not null check (timing in ('before_pressure_test', 'before_precommissioning', 'after_precommissioning')),
  category_code text not null,
  reason text not null,
  coefficient numeric(10, 4),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, category_code, reason)
);

create table public.project_unit_time_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  activity text not null,
  project_ut numeric(12, 4) not null check (project_ut >= 0),
  standard_reference text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, activity)
);

create table public.project_location_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null,
  description text not null,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  category_id uuid not null references public.project_location_categories(id) on delete restrict,
  code text not null,
  description text not null,
  mapped_progress_columns jsonb not null default '[]'::jsonb check (jsonb_typeof(mapped_progress_columns) = 'array'),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_pressure_units (
  project_id uuid primary key references public.projects(id) on delete restrict,
  unit public.pressure_unit not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.project_progress_weights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  phase text not null check (phase in ('prefabrication', 'painting', 'erection')),
  activity text not null,
  weight numeric(7, 4) not null check (weight >= 0 and weight <= 100),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, phase, activity)
);

create table public.membership_subcontractor_scopes (
  membership_id uuid not null references public.project_memberships(id) on delete restrict,
  subcontractor_id uuid not null references public.project_subcontractors(id) on delete restrict,
  primary key (membership_id, subcontractor_id)
);

create table public.membership_pds_area_scopes (
  membership_id uuid not null references public.project_memberships(id) on delete restrict,
  pds_area_id uuid not null references public.project_pds_areas(id) on delete restrict,
  primary key (membership_id, pds_area_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  kind text not null,
  status text not null check (status in ('queued', 'validating', 'failed', 'completed')),
  storage_path text,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- A project-scoped relationship must never cross a tenant boundary. Normal
-- UUID foreign keys prove that a parent exists; these triggers also prove that
-- it belongs to the same project as the child.
create function public.assert_same_project_reference()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  reference_id uuid;
  parent_project_id uuid;
begin
  reference_id := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  if reference_id is null then
    return new;
  end if;

  execute format('select project_id from public.%I where id = $1', tg_argv[1])
    into parent_project_id using reference_id;

  if parent_project_id is distinct from new.project_id then
    raise exception 'Reference %.% must belong to project %', tg_argv[1], tg_argv[0], new.project_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

create function public.assert_welder_wps_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  welder_project_id uuid;
  wps_project_id uuid;
begin
  select project_id into welder_project_id from public.welder_qualifications where id = new.welder_qualification_id;
  select project_id into wps_project_id from public.project_welding_procedures where id = new.wps_id;
  if welder_project_id is distinct from wps_project_id then
    raise exception 'Welder qualification and WPS must belong to the same project' using errcode = '23503';
  end if;
  return new;
end;
$$;

create function public.assert_system_reference_kind()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actual_kind public.system_reference_kind;
begin
  select kind into actual_kind from public.system_reference_entries where id = new.material_type_id;
  if actual_kind is distinct from 'material_type'::public.system_reference_kind then
    raise exception 'material_type_id must reference a material_type system referential' using errcode = '23503';
  end if;
  return new;
end;
$$;

create function public.assert_membership_scope_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  membership_project_id uuid;
  scope_project_id uuid;
  scope_id uuid;
begin
  select project_id into membership_project_id from public.project_memberships where id = new.membership_id;
  scope_id := nullif(to_jsonb(new) ->> tg_argv[1], '')::uuid;
  execute format('select project_id from public.%I where id = $1', tg_argv[0])
    into scope_project_id using scope_id;
  if membership_project_id is distinct from scope_project_id then
    raise exception 'Membership scope must belong to the membership project' using errcode = '23503';
  end if;
  return new;
end;
$$;

create function public.prevent_project_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'project_id is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger project_area_classifications_project_tenant
  before insert or update of project_id, unit_id on public.project_area_classifications
  for each row execute procedure public.assert_same_project_reference('unit_id', 'project_units');
create trigger project_pds_areas_shop_subcontractor_tenant
  before insert or update of project_id, shop_subcontractor_id on public.project_pds_areas
  for each row execute procedure public.assert_same_project_reference('shop_subcontractor_id', 'project_subcontractors');
create trigger project_pds_areas_field_subcontractor_tenant
  before insert or update of project_id, field_subcontractor_id on public.project_pds_areas
  for each row execute procedure public.assert_same_project_reference('field_subcontractor_id', 'project_subcontractors');
create trigger project_pds_areas_classification_tenant
  before insert or update of project_id, area_classification_id on public.project_pds_areas
  for each row execute procedure public.assert_same_project_reference('area_classification_id', 'project_area_classifications');
create trigger project_subsystems_system_tenant
  before insert or update of project_id, system_id on public.project_subsystems
  for each row execute procedure public.assert_same_project_reference('system_id', 'project_systems');
create trigger project_wps_subcontractor_tenant
  before insert or update of project_id, subcontractor_id on public.project_welding_procedures
  for each row execute procedure public.assert_same_project_reference('subcontractor_id', 'project_subcontractors');
create trigger welder_qualifications_subcontractor_tenant
  before insert or update of project_id, subcontractor_id on public.welder_qualifications
  for each row execute procedure public.assert_same_project_reference('subcontractor_id', 'project_subcontractors');
create trigger nde_matrix_rules_service_class_tenant
  before insert or update of project_id, service_class_id on public.nde_matrix_rules
  for each row execute procedure public.assert_same_project_reference('service_class_id', 'project_service_classes');
create trigger nde_matrix_rules_weld_type_tenant
  before insert or update of project_id, weld_type_id on public.nde_matrix_rules
  for each row execute procedure public.assert_same_project_reference('weld_type_id', 'project_weld_types');
create trigger thickness_flange_rules_service_class_tenant
  before insert or update of project_id, service_class_id on public.project_thickness_flange_rules
  for each row execute procedure public.assert_same_project_reference('service_class_id', 'project_service_classes');
create trigger project_locations_category_tenant
  before insert or update of project_id, category_id on public.project_locations
  for each row execute procedure public.assert_same_project_reference('category_id', 'project_location_categories');
create trigger welder_wps_qualifications_project_tenant
  before insert or update on public.welder_wps_qualifications
  for each row execute procedure public.assert_welder_wps_same_project();
create trigger project_service_classes_material_type_kind
  before insert or update of material_type_id on public.project_service_classes
  for each row execute procedure public.assert_system_reference_kind();
create trigger project_wps_material_type_kind
  before insert or update of material_type_id on public.project_welding_procedures
  for each row execute procedure public.assert_system_reference_kind();
create trigger membership_subcontractor_scopes_project_tenant
  before insert or update on public.membership_subcontractor_scopes
  for each row execute procedure public.assert_membership_scope_same_project('project_subcontractors', 'subcontractor_id');
create trigger membership_pds_area_scopes_project_tenant
  before insert or update on public.membership_pds_area_scopes
  for each row execute procedure public.assert_membership_scope_same_project('project_pds_areas', 'pds_area_id');

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create function public.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.project_memberships
    where project_id = target_project_id and user_id = auth.uid() and is_active
  );
$$;

create function public.can_administer_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.project_memberships
    where project_id = target_project_id
      and user_id = auth.uid()
      and role = 'system_admin'
      and is_active
  );
$$;

grant execute on function public.has_project_access(uuid) to authenticated;
grant execute on function public.can_administer_project(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, email) on public.profiles to authenticated;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects', 'project_memberships', 'system_reference_entries',
    'project_custom_field_definitions', 'project_subcontractors', 'project_units',
    'project_area_classifications', 'project_pds_areas', 'project_teams',
    'project_systems', 'project_subsystems', 'project_line_services',
    'project_service_classes', 'project_weld_types', 'project_welding_procedures',
    'welder_qualifications', 'nde_matrix_rules', 'project_rework_codes',
    'project_thickness_flange_rules', 'piping_material_records',
    'project_joint_categories', 'project_unit_time_references',
    'project_location_categories', 'project_locations', 'project_pressure_units',
    'project_progress_weights'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;

create index project_memberships_user_project_idx on public.project_memberships (user_id, project_id) where is_active;
create index nde_matrix_rules_lookup_idx on public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location) where status = 'active';
create index piping_material_records_trace_lookup_idx on public.piping_material_records (project_id, trace_number) where status = 'active';
create index audit_events_project_created_idx on public.audit_events (project_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.system_reference_entries enable row level security;

create policy "profiles are visible to their owner" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_platform_admin());
create policy "profiles are updated by their owner" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

create policy "members can read their projects" on public.projects
  for select to authenticated using (public.has_project_access(id));
create policy "authenticated users can create projects" on public.projects
  for insert to authenticated with check (created_by = auth.uid() and public.is_platform_admin());
create policy "project admins update projects" on public.projects
  for update to authenticated using (public.can_administer_project(id))
  with check (public.can_administer_project(id));

create policy "members read project memberships" on public.project_memberships
  for select to authenticated using (public.has_project_access(project_id));
create policy "project admins manage memberships" on public.project_memberships
  for all to authenticated using (public.can_administer_project(project_id))
  with check (public.can_administer_project(project_id));

create policy "authenticated users read system referentials" on public.system_reference_entries
  for select to authenticated using (true);
create policy "platform admins manage system referentials" on public.system_reference_entries
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'project_custom_field_definitions', 'project_subcontractors', 'project_units',
    'project_area_classifications', 'project_pds_areas', 'project_teams',
    'project_systems', 'project_subsystems', 'project_line_services',
    'project_service_classes', 'project_weld_types', 'project_welding_procedures',
    'welder_qualifications', 'nde_matrix_rules', 'project_rework_codes',
    'project_thickness_flange_rules', 'piping_material_records',
    'project_joint_categories', 'project_unit_time_references',
    'project_location_categories', 'project_locations', 'project_pressure_units',
    'project_progress_weights', 'import_jobs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_project_access(project_id))', table_name || '_members_read', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.can_administer_project(project_id)) with check (public.can_administer_project(project_id))', table_name || '_admins_write', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'project_memberships', 'project_custom_field_definitions',
    'project_subcontractors', 'project_units', 'project_area_classifications',
    'project_pds_areas', 'project_teams', 'project_systems',
    'project_subsystems', 'project_line_services', 'project_service_classes',
    'project_weld_types', 'project_welding_procedures', 'welder_qualifications',
    'nde_matrix_rules', 'project_rework_codes', 'project_thickness_flange_rules',
    'piping_material_records', 'project_joint_categories',
    'project_unit_time_references', 'project_location_categories',
    'project_locations', 'project_progress_weights', 'import_jobs'
  ] loop
    execute format('create trigger %I before update of project_id on public.%I for each row execute procedure public.prevent_project_id_change()', table_name || '_project_id_immutable', table_name);
  end loop;
end;
$$;

alter table public.welder_wps_qualifications enable row level security;
create policy "project members read welder WPS coverage" on public.welder_wps_qualifications
  for select to authenticated using (
    exists (select 1 from public.welder_qualifications w where w.id = welder_qualification_id and public.has_project_access(w.project_id))
  );
create policy "project admins manage welder WPS coverage" on public.welder_wps_qualifications
  for all to authenticated using (
    exists (select 1 from public.welder_qualifications w where w.id = welder_qualification_id and public.can_administer_project(w.project_id))
  ) with check (
    exists (select 1 from public.welder_qualifications w where w.id = welder_qualification_id and public.can_administer_project(w.project_id))
  );

alter table public.membership_subcontractor_scopes enable row level security;
alter table public.membership_pds_area_scopes enable row level security;
create policy "project admins read subcontractor scopes" on public.membership_subcontractor_scopes
  for select to authenticated using (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  );
create policy "project admins read PDS area scopes" on public.membership_pds_area_scopes
  for select to authenticated using (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  );
create policy "project admins manage subcontractor scopes" on public.membership_subcontractor_scopes
  for all to authenticated using (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  ) with check (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  );
create policy "project admins manage PDS area scopes" on public.membership_pds_area_scopes
  for all to authenticated using (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  ) with check (
    exists (select 1 from public.project_memberships m where m.id = membership_id and public.can_administer_project(m.project_id))
  );

alter table public.audit_events enable row level security;
create policy "project admins read audit events" on public.audit_events
  for select to authenticated using (project_id is not null and public.can_administer_project(project_id));

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
