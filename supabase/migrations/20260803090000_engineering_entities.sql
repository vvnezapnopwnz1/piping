-- Track 04: engineering identity and revision definition.
-- Stable tables hold project scope and the business number only. Everything that can
-- change between revisions - including the parent link - lives on the revision row.

create type public.revision_status as enum ('draft', 'accepted', 'superseded');

create type public.engineering_entity_type as enum (
  'spool', 'weld_joint', 'support', 'flange_joint'
);

create table public.isometrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  iso_number text not null check (length(trim(iso_number)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, iso_number)
);

create table public.spools (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_number text not null check (length(trim(spool_number)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, spool_number)
);

create table public.weld_joints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_number text not null check (length(trim(weld_number)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, weld_number)
);

create table public.supports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  support_number text not null check (length(trim(support_number)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, support_number)
);

create table public.flange_joints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  flange_number text not null check (length(trim(flange_number)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, flange_number)
);

create table public.isometric_revisions (
  id uuid primary key default gen_random_uuid(),
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  revision_number text not null check (length(trim(revision_number)) > 0),
  revision_ordinal integer not null check (revision_ordinal > 0),
  status public.revision_status not null default 'draft',
  pds_area_id uuid references public.project_pds_areas(id) on delete restrict,
  service_class_id uuid references public.project_service_classes(id) on delete restrict,
  line_number text,
  sheet_number text,
  source_import_job_id uuid references public.import_jobs(id) on delete set null,
  comment text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  superseded_at timestamptz,
  unique (isometric_id, revision_number),
  unique (isometric_id, revision_ordinal)
);

-- The whole "one active definition" invariant is this index. Never re-implement it in SQL bodies.
create unique index isometric_revisions_one_accepted
  on public.isometric_revisions (isometric_id)
  where status = 'accepted';

create index isometric_revisions_isometric_idx
  on public.isometric_revisions (isometric_id, revision_ordinal desc);

create table public.spool_revisions (
  id uuid primary key default gen_random_uuid(),
  spool_id uuid not null references public.spools(id) on delete restrict,
  isometric_revision_id uuid not null
    references public.isometric_revisions(id) on delete cascade,
  sequence_number integer not null default 1 check (sequence_number > 0),
  weight_kg numeric(12, 3) check (weight_kg is null or weight_kg >= 0),
  material_class text,
  is_removed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (isometric_revision_id, spool_id)
);

create index spool_revisions_spool_idx on public.spool_revisions (spool_id);

create table public.weld_joint_revisions (
  id uuid primary key default gen_random_uuid(),
  weld_joint_id uuid not null references public.weld_joints(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete cascade,
  weld_type_id uuid references public.project_weld_types(id) on delete restrict,
  weld_location text not null default 'shop'
    check (weld_location in ('shop', 'assembly', 'field')),
  diameter_inch numeric(8, 3) check (diameter_inch is null or diameter_inch > 0),
  thickness_mm numeric(8, 3) check (thickness_mm is null or thickness_mm > 0),
  is_removed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id, weld_joint_id)
);

create index weld_joint_revisions_joint_idx on public.weld_joint_revisions (weld_joint_id);

-- Dossier 7.3: a physical joint carries one or more weld points. The definition seeds
-- Root and Cap; Track 05 attaches welders and percentages to these rows.
create table public.weld_points (
  id uuid primary key default gen_random_uuid(),
  weld_joint_revision_id uuid not null
    references public.weld_joint_revisions(id) on delete cascade,
  point_type text not null check (point_type in ('root', 'hot', 'fill', 'cap')),
  sequence_number integer not null check (sequence_number between 1 and 4),
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id, point_type)
);

create table public.support_revisions (
  id uuid primary key default gen_random_uuid(),
  support_id uuid not null references public.supports(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete cascade,
  support_type text,
  quantity integer not null default 1 check (quantity > 0),
  is_removed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id, support_id)
);

create table public.flange_joint_revisions (
  id uuid primary key default gen_random_uuid(),
  flange_joint_id uuid not null references public.flange_joints(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete cascade,
  flange_rating text,
  diameter_inch numeric(8, 3) check (diameter_inch is null or diameter_inch > 0),
  bolt_size text,
  bolt_quantity integer check (bolt_quantity is null or bolt_quantity > 0),
  joint_type text,
  is_removed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id, flange_joint_id)
);

-- Plan section 3.3: the spool bill of materials is part of the definition, so Track 05
-- can check received material against it rather than the other way round.
create table public.spool_revision_materials (
  id uuid primary key default gen_random_uuid(),
  spool_revision_id uuid not null references public.spool_revisions(id) on delete cascade,
  ident_code text not null check (length(trim(ident_code)) > 0),
  description text,
  quantity numeric(12, 3) check (quantity is null or quantity >= 0),
  unit text,
  trace_number text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index spool_revision_materials_key
  on public.spool_revision_materials
  (spool_revision_id, ident_code, coalesce(trace_number, ''));
