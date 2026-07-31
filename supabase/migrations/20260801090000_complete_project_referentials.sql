create table public.system_film_quantity_rules (
  id uuid primary key default gen_random_uuid(),
  diameter_from_inch numeric(8,3) not null check (diameter_from_inch > 0),
  diameter_to_inch numeric(8,3) not null
    check (diameter_to_inch >= diameter_from_inch),
  thickness_from_mm numeric(8,3) not null check (thickness_from_mm >= 0),
  thickness_to_mm numeric(8,3) not null
    check (thickness_to_mm >= thickness_from_mm),
  film_count smallint not null check (film_count > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (
    diameter_from_inch, diameter_to_inch,
    thickness_from_mm, thickness_to_mm
  )
);

create table public.system_ut_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  diameter_from_inch numeric(8,3) not null check (diameter_from_inch > 0),
  diameter_to_inch numeric(8,3) not null
    check (diameter_to_inch >= diameter_from_inch),
  coefficient_diameter numeric(12,6) not null
    check (coefficient_diameter >= 0),
  coefficient_rating numeric(12,6) not null
    check (coefficient_rating >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (diameter_from_inch, diameter_to_inch)
);

alter table public.project_pds_areas
  add column assembly_subcontractor_id uuid
  references public.project_subcontractors(id) on delete restrict;

alter table public.nde_matrix_rules
  drop constraint nde_matrix_rules_weld_location_check,
  add constraint nde_matrix_rules_weld_location_check
    check (weld_location in ('shop', 'assembly', 'field'));

alter table public.project_progress_weights
  drop constraint project_progress_weights_phase_check,
  add constraint project_progress_weights_phase_check
    check (phase in ('prefabrication', 'painting', 'assembly', 'erection'));

alter table public.project_custom_field_definitions
  drop constraint project_custom_field_definitions_scope_check,
  add constraint project_custom_field_definitions_scope_check
    check (scope in (
      'prefabrication', 'painting', 'assembly', 'erection', 'weld',
      'pds_area', 'spool_category'
    ));

alter table public.project_custom_field_definitions
  drop constraint if exists project_custom_field_definitions_project_id_scope_sort_order_key,
  drop constraint if exists project_custom_field_definitions_project_id_scope_sort_o_key;

create unique index project_custom_fields_active_sort_order_idx
  on public.project_custom_field_definitions(project_id, scope, sort_order)
  where status <> 'archived';

create table public.project_devices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_device_users (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  membership_id uuid not null
    references public.project_memberships(id) on delete restrict,
  device_id uuid references public.project_devices(id) on delete restrict,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, membership_id)
);

create table public.project_spooling_material_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code)
);

create table public.project_spooling_material_classes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  external_class_code text not null check (length(trim(external_class_code)) > 0),
  material_type_id uuid not null
    references public.project_spooling_material_types(id) on delete restrict,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, external_class_code)
);

create table public.project_spooling_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  sort_order smallint not null check (sort_order >= 0),
  is_required boolean not null default true,
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, code),
  unique (project_id, sort_order)
);

create table public.project_ral_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  line_service_id uuid not null
    references public.project_line_services(id) on delete restrict,
  color_code text not null check (length(trim(color_code)) > 0),
  ral_code text not null check (length(trim(ral_code)) > 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, line_service_id)
);

create table public.project_paint_matrix_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  line_service_id uuid not null
    references public.project_line_services(id) on delete restrict,
  ral_code_id uuid not null
    references public.project_ral_codes(id) on delete restrict,
  blasting_required boolean not null,
  primer_required boolean not null,
  intermediate_coat_count smallint not null
    check (intermediate_coat_count between 0 and 20),
  final_coat_count smallint not null check (final_coat_count between 0 and 20),
  required_final_dft_microns numeric(10,3) not null
    check (required_final_dft_microns > 0),
  status public.project_reference_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, line_service_id)
);

create table public.project_assembly_settings (
  project_id uuid primary key references public.projects(id) on delete restrict,
  enabled boolean not null default false,
  default_subcontractor_id uuid
    references public.project_subcontractors(id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  check (enabled or default_subcontractor_id is null)
);

create index system_film_quantity_rules_lookup_idx
  on public.system_film_quantity_rules (
    diameter_from_inch, diameter_to_inch,
    thickness_from_mm, thickness_to_mm
  );
