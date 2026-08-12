# Track 02 Project and System Referentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to
> implement this plan task-by-task. Do not dispatch subagents unless the user
> explicitly requests delegation. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Make the complete Easy Piping Administration reference layer a real,
audited and project-isolated Supabase source of truth, so imports and
operational modules never depend on demo Zustand data or free-text substitutes.

**Architecture:** PostgreSQL owns reference identity, lifecycle, relationships,
cross-project invariants and audit history. Pure TypeScript modules own input
normalization and form validation; Supabase repositories map those domain
contracts to typed queries; React screens select demo or Supabase adapters only
at the route boundary. Reference groups are implemented in dependency order,
with an explicit import-readiness projection rather than an implied “setup is
complete” state.

**Tech Stack:** PostgreSQL 17, Supabase Auth/RLS/PostgREST RPC/Storage, pgTAP,
Next.js 16 App Router, React 19, strict TypeScript,
`@supabase/supabase-js`, Node test runner with `tsx`, existing shadcn UI.

**Approved sources:**

- `docs/research/2026-07-30-easy-piping-documentation-dossier.md`, sections
  9–11 and 30–32;
- `docs/Easy Piping User Manual.pdf`, sections 2 and 3;
- `docs/research/presentation_findings.md`, Administration, Painting and
  Assembly findings;
- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`,
  Track T2;
- live migrations, generated database types and current Supabase adapters.

---

## 1. Execution policy

1. Start by recording `pwd`, `git status --short`, current branch and migration
   list. The checkout already contains user-owned tracked and untracked work.
2. Do not reset, restore, stage, commit, branch, push or create a worktree.
   Checkpoints in this plan are review boundaries, not permission for Git
   mutations.
3. Use only additive migrations. Never edit the already-applied Track 01
   migrations to implement Track 02.
4. Use the local Supabase stack only. Do not run `--linked`, deploy functions,
   create remote buckets or mutate a remote project.
5. Use RED → GREEN for domain, adapter and database behavior. Do not mark a
   task complete from TypeScript alone when it changes RLS or an invariant.
6. Keep `NEXT_PUBLIC_PIPEQC_MODE=demo` behavior intact. In Supabase mode,
   Project Referential must not read or mutate `store/admin-store.ts`.
7. Do not add ISO, spool, weld-progress, NDE-batch, construction-progress or
   test-pack operational persistence in this track.
8. Do not copy demo seeds into production migrations. Local browser fixtures
   belong in `scripts/bootstrap-track02-browser-fixtures.ts`.
9. Never expose the service-role key to browser code. The fixture bootstrap is
   the only Track 02 code allowed to require it.
10. Preserve the Track 01 decisions: platform admin is global, project access
    is capability-based, and RLS is authoritative.

## 2. Scope and delivery gates

Track 02 is one coherent Admin setup track with three internal gates.

### Gate A — reference platform

- additive schema is applied;
- all reference tables use capability-based RLS;
- project identity cannot change on a reference row;
- authenticated users cannot hard-delete reference rows;
- create/update/status transitions write `audit_events`;
- generated TypeScript types match the local database.

### Gate B — ready for engineering import

The selected project has active:

- Material Type;
- Subcontractor;
- Unit/Area Classification/PDS Area ownership;
- Service Class;
- Weld Type;
- WPS;
- Welder Qualification with WPS coverage;
- NDE Matrix coverage for required shop/assembly/field combinations;
- Thickness/Flange rules;
- Piping Material List records.

This gate enables Track 03 import implementation. It does not itself import
engineering data.

### Gate C — Admin Module complete

In addition to Gate B:

- test-pack, tracking, painting, assembly and custom-field referentials are
  Supabase-backed;
- progress weights are changed atomically and sum to 100 per enabled phase;
- Project Definition logos use private project Storage objects;
- the UI shows missing setup dependencies;
- no Supabase Project Referential screen imports `useAdminStore`.

## 3. Decisions fixed by this plan

### 3.1 Lifecycle

- `active`, `inactive`, `archived` remains the common lifecycle.
- Browser users cannot physically delete setup records.
- An unused mistake may be archived immediately.
- A referenced record may be archived, but existing relationships remain
  readable; active dropdowns exclude it.
- Code uniqueness remains project-scoped and includes archived rows. A retired
  code is not silently reused.

### 3.2 System Referential

- Material Type is platform-admin managed.
- Film Quantity and UT Calculation are structured global rules and remain
  read-only in the application, matching the manual.
- Torquing methods are the static canonical values `Manual`, `Torquing` and
  `Tensioning`; Track 02 does not invent project-specific torque values.
- System-reference reads require `system_referential.view`; mutations require
  `system_referential.manage`.

### 3.3 Project Referential

- All reads and writes are scoped by `project_id`.
- Reads require `project_referential.view`; mutations require
  `project_referential.manage`.
- PDS ownership has separate shop, assembly and field subcontractors.
- NDE Matrix location is one of `shop`, `assembly`, `field`.
- Welder qualification is a welder record plus a many-to-many set of approved
  WPS records.
- Piping Material List preserves the manual contract:
  `MRR number + ident code + trace/heat number`.
- Device users link to existing active project memberships; Track 02 does not
  create a second identity system.
- RAL rules reference project Line Service instead of storing an unvalidated
  free-text fluid service.
- Paint Matrix is project setup by Line Service/RAL and defines blasting,
  primer, coat counts and required final DFT. ISO assignment belongs to Track
  03 after ISO identity exists.
- Assembly is enabled per project. When enabled, its default subcontractor and
  progress-weight set become required for setup completion.

### 3.4 Progress weights and reproducibility

- Prefabrication, Painting and Erection are always supported.
- Assembly is included only when Assembly is enabled.
- A phase is updated through one RPC receiving the complete weight set.
- The RPC rejects a sum other than exactly `100.0000`.
- Every replacement writes one audit event containing the previous and new
  phase arrays. Reports built later must snapshot the weight version used.

### 3.5 Custom fields

- Preserve the existing scopes `prefabrication`, `erection`, `pds_area` and
  `spool_category`.
- Add `painting`, `assembly` and `weld`.
- At most three non-archived custom fields exist per
  `(project_id, scope)`.
- Field keys are immutable after creation; label, sort order and status may
  change.

## 4. File map

### Database

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260801090000_complete_project_referentials.sql` | Structured system rules, missing project referential tables and Assembly extensions. |
| `supabase/migrations/20260801091000_referential_invariants.sql` | Cross-project triggers, custom-field/weight invariants, lifecycle grants and referential audit. |
| `supabase/migrations/20260801092000_project_branding_storage.sql` | Private project-branding bucket and owner/contractor object paths. |
| `supabase/tests/database/020_project_referentials.test.sql` | Schema, capability RLS, tenant isolation and dependency coverage. |
| `supabase/tests/database/021_referential_usage_guards.test.sql` | Lifecycle, audit, custom fields, progress weights and cross-project rejection. |
| `supabase/tests/database/022_project_branding_storage.test.sql` | Storage object ownership and project capability policies. |
| `lib/supabase/database.types.ts` | Generated schema types; never hand-edited. |

### Shared project-setup module

| File | Responsibility |
| --- | --- |
| `modules/project-setup/domain/reference.ts` | Status vocabulary, code normalization and common validation. |
| `modules/project-setup/domain/reference.test.ts` | Common lifecycle and normalization assertions. |
| `modules/project-setup/domain/setup-readiness.ts` | Pure Gate B/Gate C readiness projection. |
| `modules/project-setup/domain/setup-readiness.test.ts` | Missing-dependency and Assembly-conditional assertions. |
| `modules/project-setup/infrastructure/supabase-reference-errors.ts` | Stable Postgres/PostgREST error mapping for UI. |
| `modules/project-setup/infrastructure/supabase-reference-errors.test.ts` | Duplicate, FK, permission and invariant error mapping. |
| `modules/project-setup/ui/reference-status-badge.tsx` | Shared active/inactive/archived presentation. |
| `modules/project-setup/ui/setup-readiness-panel.tsx` | Visible import/admin completeness checklist. |

### System Referential

| File | Responsibility |
| --- | --- |
| `modules/project-setup/domain/system-referential.ts` | Material, film, UT and torquing domain rows. |
| `modules/project-setup/domain/system-referential.test.ts` | Film ranges and UT coefficient validation. |
| `modules/project-setup/infrastructure/supabase-system-referential-repository.ts` | Capability-aware global reads and Material Type writes. |
| `modules/project-setup/infrastructure/supabase-system-referential-repository.test.ts` | Exact table/query/payload/error contract. |
| `modules/project-setup/ui/system-referential-screen.tsx` | Real System Referential screen. |
| `app/admin/system-referential/page.tsx` | Demo/Supabase route adapter only. |

### Project Referential groups

| File | Responsibility |
| --- | --- |
| `modules/project-setup/domain/project-geography.ts` | Subcontractor, unit, area classification and PDS contracts. |
| `modules/project-setup/domain/project-geography.test.ts` | Required fields and assignment rules. |
| `modules/project-setup/infrastructure/supabase-project-geography-repository.ts` | Geography CRUD/status operations. |
| `modules/project-setup/infrastructure/supabase-project-geography-repository.test.ts` | Query and tenant-filter contract. |
| `modules/project-setup/ui/project-geography-tabs.tsx` | Supabase Subcontractor/PDS/area UI. |
| `modules/project-setup/domain/welding-quality-reference.ts` | Service Class, Weld Type, welder, NDE, thickness, PML, rework and joint-category contracts. |
| `modules/project-setup/domain/welding-quality-reference.test.ts` | Numeric ranges, NDE percentages and relationship validation. |
| `modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.ts` | Welding/QC setup persistence. |
| `modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.test.ts` | Joined loads, payloads and status operations. |
| `modules/project-setup/ui/welding-quality-tabs.tsx` | Supabase welding/QC tabs. |
| `modules/project-setup/domain/execution-reference.ts` | Teams, systems, locations, pressure and progress contracts. |
| `modules/project-setup/domain/execution-reference.test.ts` | Hierarchy and phase-weight validation. |
| `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts` | Test-pack/tracking/progress setup persistence and weight RPC. |
| `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts` | Exact hierarchy queries and RPC payload. |
| `modules/project-setup/ui/execution-reference-tabs.tsx` | Test-pack/tracking/progress UI. |
| `modules/project-setup/domain/extended-reference.ts` | Devices, spooling, RAL, Paint Matrix and Assembly contracts. |
| `modules/project-setup/domain/extended-reference.test.ts` | Paint-step and Assembly validation. |
| `modules/project-setup/infrastructure/supabase-extended-reference-repository.ts` | Extended reference persistence. |
| `modules/project-setup/infrastructure/supabase-extended-reference-repository.test.ts` | Relationship and payload contract. |
| `modules/project-setup/ui/extended-reference-tabs.tsx` | Spooling/painting/assembly/device UI. |
| `modules/project-setup/ui/project-referential-screen.tsx` | Loads active project, readiness and the grouped tabs. |
| `app/admin/project-referential/page.tsx` | Demo/Supabase route adapter only. |

### Branding and fixtures

| File | Responsibility |
| --- | --- |
| `modules/project-setup/infrastructure/supabase-project-branding.ts` | Upload, signed-read and replacement operations for project logos. |
| `modules/project-setup/infrastructure/supabase-project-branding.test.ts` | Object path and request contract. |
| `app/admin/project-definition/page.tsx` | Uses branding adapter in Supabase mode. |
| `scripts/bootstrap-track02-browser-fixtures.ts` | Idempotent local-only reference dataset. |
| `scripts/bootstrap-track02-browser-fixtures.test.ts` | Local-host guard and fixture topology assertions. |
| `docs/TRACK02_BROWSER_FIXTURES.md` | Local bootstrap and manual acceptance runbook. |
| `docs/SUPABASE_BACKEND_FOUNDATION.md` | Verified Track 02 status and remaining boundary. |
| `docs/SUPABASE_NEXT_AGENT_CONTEXT.md` | Next track handoff after Track 02 exit. |

---

## Task 1: Capture the Track 01 baseline

**Files:**
- Inspect only: current worktree, migrations, tests and generated types.

- [ ] **Step 1: Record the checkout without changing it.**

Run:

```bash
pwd
git status --short
git branch --show-current
/opt/homebrew/bin/supabase migration list
```

Expected:

- working directory is `pipe-qc-shell-layout`;
- branch is `feat/supabase-real-mode`;
- dirty user-owned Track 01 files remain present;
- local migration list ends with
  `20260731100000_grant_service_role_fixture_bootstrap.sql`.

- [ ] **Step 2: Run the accepted database baseline.**

Run:

```bash
/opt/homebrew/bin/supabase test db
```

Expected: four database test files pass with 103 assertions. If the count has
legitimately increased before execution, record the new passing count and do
not rewrite unrelated tests to force 103.

- [ ] **Step 3: Run the current focused TypeScript baseline.**

Run:

```bash
node --import tsx lib/app-mode.test.ts
node --import tsx lib/project-definition.test.ts
node --import tsx lib/system-referentials.test.ts
node --import tsx lib/welding-procedures.test.ts
node --import tsx lib/supabase/system-referentials.test.ts
node --import tsx lib/supabase/welding-procedures.test.ts
node --import tsx modules/access/domain/effective-access.test.ts
node --import tsx modules/access/domain/access-rights.test.ts
npx tsc --noEmit --incremental false
```

Expected: every command exits `0`.

### Checkpoint 1

Stop if a baseline failure is caused by existing code. Report it separately
before implementing Track 02. Do not disguise a baseline failure as Track 02
work.

---

## Task 2: Add the missing schema and Assembly extensions

**Files:**
- Create: `supabase/migrations/20260801090000_complete_project_referentials.sql`
- Create: `supabase/tests/database/020_project_referentials.test.sql`

- [ ] **Step 1: Write the RED pgTAP contract.**

Create `020_project_referentials.test.sql` with a transaction and assertions
for these exact objects:

```sql
begin;
select plan(24);

select has_table('public', 'system_film_quantity_rules');
select has_table('public', 'system_ut_calculation_rules');
select has_table('public', 'project_devices');
select has_table('public', 'project_device_users');
select has_table('public', 'project_spooling_material_types');
select has_table('public', 'project_spooling_material_classes');
select has_table('public', 'project_spooling_checklist_items');
select has_table('public', 'project_ral_codes');
select has_table('public', 'project_paint_matrix_rules');
select has_table('public', 'project_assembly_settings');

select has_column('public', 'project_pds_areas', 'assembly_subcontractor_id');
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
  'public.project_reference_status'
);
select col_type_is(
  'public', 'project_ral_codes', 'line_service_id', 'uuid'
);
select col_type_is(
  'public', 'project_paint_matrix_rules',
  'required_final_dft_microns', 'numeric'
);

select has_index(
  'public', 'system_film_quantity_rules',
  'system_film_quantity_rules_lookup_idx'
);
select has_index(
  'public', 'nde_matrix_rules',
  'nde_matrix_rules_lookup_idx'
);

select lives_ok(
  $$insert into public.project_assembly_settings(project_id, enabled)
    select id, false from public.projects limit 1$$
);

select throws_ok(
  $$insert into public.project_paint_matrix_rules(
      project_id, line_service_id, ral_code_id,
      blasting_required, primer_required,
      intermediate_coat_count, final_coat_count,
      required_final_dft_microns
    )
    values (
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      true, true, -1, 1, 250
    )$$,
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
```

- [ ] **Step 2: Run RED.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/020_project_referentials.test.sql
```

Expected: FAIL because the new tables and columns do not exist.

- [ ] **Step 3: Implement the additive schema.**

Create the migration with these exact contracts:

```sql
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
  drop constraint
    project_custom_field_definitions_project_id_scope_sort_order_key;

create unique index project_custom_fields_active_sort_order_idx
  on public.project_custom_field_definitions(project_id, scope, sort_order)
  where status <> 'archived';
```

Add the eight project tables from the fixed decisions:

```sql
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
```

Add the lookup index asserted by the test:

```sql
create index system_film_quantity_rules_lookup_idx
  on public.system_film_quantity_rules (
    diameter_from_inch, diameter_to_inch,
    thickness_from_mm, thickness_to_mm
  );
```

- [ ] **Step 4: Apply and run GREEN.**

Run:

```bash
/opt/homebrew/bin/supabase migration up --local
/opt/homebrew/bin/supabase test db supabase/tests/database/020_project_referentials.test.sql
```

Expected: migration applies once and all 23 assertions pass.

---

## Task 3: Enforce capability RLS, tenant relationships and lifecycle audit

**Files:**
- Create: `supabase/migrations/20260801091000_referential_invariants.sql`
- Create: `supabase/tests/database/021_referential_usage_guards.test.sql`

- [ ] **Step 1: Write RED tests for real JWT contexts.**

The test must create:

- Platform Admin;
- Project Admin A;
- Project Reader A;
- Project Admin B;
- projects A and B;
- one subcontractor, line service and PDS row per project.

Use the established `set_config('request.jwt.claims', ..., true)` pattern from
`011_project_scope_isolation.test.sql`. Assert:

```sql
select no_plan();

select results_eq(
  $$select count(*)::bigint from public.project_subcontractors
    where project_id = :'project_a'::uuid$$,
  array[1::bigint],
  'Project Admin A reads project A references'
);

select is_empty(
  $$select id from public.project_subcontractors
    where project_id = :'project_b'::uuid$$,
  'Project Admin A cannot read project B references'
);

select throws_ok(
  $$insert into public.project_subcontractors(
      project_id, code, description
    ) values (:'project_b'::uuid, 'ILLEGAL', 'Cross-project')$$,
  '42501'
);

select throws_ok(
  $$delete from public.project_subcontractors
    where project_id = :'project_a'::uuid$$,
  '42501'
);

select throws_ok(
  $$insert into public.project_pds_areas(
      project_id, code, description, shop_subcontractor_id
    ) values (
      :'project_a'::uuid, 'BAD-PDS', 'Bad',
      :'project_b_subcontractor'::uuid
    )$$,
  '23503'
);
```

Also assert:

- Reader A can select but cannot insert/update/archive;
- Project Admin A can create and archive an A reference;
- Platform Admin can read and manage System Referential;
- a project admin cannot mutate System Referential;
- a successful project-reference update creates one audit row;
- audit `before_state` and `after_state` contain the changed status;
- more than three active/inactive custom fields in one scope is rejected;
- archived fields do not occupy the max-three allowance;
- changing `field_key` is rejected;
- Assembly subcontractor, RAL/Line Service, Paint/RAL, device/membership and
  spooling class/material cross-project links are rejected.

Keep `select no_plan()` in this growing test file and end it with
`select * from finish();`; Task 4 adds more assertions to the same file.

- [ ] **Step 2: Run RED.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/021_referential_usage_guards.test.sql
```

Expected: FAIL because the new tables have no RLS/grants/triggers and the new
invariants do not exist.

- [ ] **Step 3: Add RLS and grants.**

Add one global-capability helper so System Referential does not depend on an
arbitrary active project selected in the browser:

```sql
create function public.current_user_has_global_capability(
  requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships membership
      where membership.user_id = auth.uid()
        and membership.is_active
        and public.current_user_has_capability(
          membership.project_id, requested_capability
        )
    );
$$;

revoke all on function
  public.current_user_has_global_capability(text) from public;
grant execute on function
  public.current_user_has_global_capability(text) to authenticated;
```

In the migration, build explicit arrays for:

```sql
-- Global read-only structured tables:
system_film_quantity_rules
system_ut_calculation_rules

-- Project-owned tables:
project_devices
project_device_users
project_spooling_material_types
project_spooling_material_classes
project_spooling_checklist_items
project_ral_codes
project_paint_matrix_rules
project_assembly_settings
```

For every project table:

```sql
alter table public.<table> enable row level security;

create policy "<table> capability read"
on public.<table>
for select to authenticated
using (
  public.current_user_has_capability(
    project_id, 'project_referential.view'
  )
);

create policy "<table> capability insert"
on public.<table>
for insert to authenticated
with check (
  public.current_user_has_capability(
    project_id, 'project_referential.manage'
  )
);

create policy "<table> capability update"
on public.<table>
for update to authenticated
using (
  public.current_user_has_capability(
    project_id, 'project_referential.manage'
  )
)
with check (
  public.current_user_has_capability(
    project_id, 'project_referential.manage'
  )
);
```

Revoke delete and grant only the required columns:

```sql
revoke all on public.<table> from anon, authenticated;
grant select, insert, update on public.<table> to authenticated;
```

Apply the same capability policy replacement to every pre-existing
project-reference table listed in the first migration. Do not leave
`has_project_access`/`can_administer_project` as a second authorization model.

For structured global tables:

```sql
create policy "system rules capability read"
on public.<table>
for select to authenticated
using (
  public.current_user_has_global_capability('system_referential.view')
);

revoke all on public.<table> from anon, authenticated;
grant select on public.<table> to authenticated;
```

Only service-role/local bootstrap SQL seeds the static Film/UT rules.

Replace the existing `system_reference_entries` policies as well:

```sql
drop policy "authenticated users read system referentials"
  on public.system_reference_entries;
drop policy "platform admins manage system referentials"
  on public.system_reference_entries;

create policy "system reference capability read"
on public.system_reference_entries
for select to authenticated
using (
  public.current_user_has_global_capability('system_referential.view')
);

create policy "system reference capability insert"
on public.system_reference_entries
for insert to authenticated
with check (
  public.current_user_has_global_capability('system_referential.manage')
);

create policy "system reference capability update"
on public.system_reference_entries
for update to authenticated
using (
  public.current_user_has_global_capability('system_referential.manage')
)
with check (
  public.current_user_has_global_capability('system_referential.manage')
);

revoke delete on public.system_reference_entries from authenticated;
```

- [ ] **Step 4: Add cross-project and custom-field guards.**

Reuse `assert_same_project_reference` for every project-owned UUID
relationship. Add a dedicated membership guard:

```sql
create function public.assert_device_membership_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  membership_project_id uuid;
begin
  select project_id into membership_project_id
  from public.project_memberships
  where id = new.membership_id;

  if membership_project_id is distinct from new.project_id then
    raise exception 'Device user membership must belong to the same project'
      using errcode = '23503';
  end if;
  return new;
end;
$$;
```

Enforce max-three and immutable key:

```sql
create function public.enforce_custom_field_definition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
begin
  if tg_op = 'UPDATE' and new.field_key is distinct from old.field_key then
    raise exception 'Custom field key cannot be changed'
      using errcode = '23514';
  end if;

  if new.status <> 'archived' then
    select count(*) into existing_count
    from public.project_custom_field_definitions field
    where field.project_id = new.project_id
      and field.scope = new.scope
      and field.status <> 'archived'
      and field.id <> coalesce(new.id, gen_random_uuid());

    if existing_count >= 3 then
      raise exception 'At most three custom fields are allowed per scope'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
```

- [ ] **Step 5: Add referential audit triggers.**

Create one trigger function that receives entity name and derives
`project_id`/`id` from `to_jsonb(new)`:

```sql
create function public.audit_project_reference_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  before_row jsonb;
  after_row jsonb;
  target_project_id uuid;
  target_entity_id uuid;
begin
  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  target_project_id := coalesce(
    nullif(after_row ->> 'project_id', '')::uuid,
    nullif(before_row ->> 'project_id', '')::uuid
  );
  target_entity_id := coalesce(
    nullif(after_row ->> 'id', '')::uuid,
    nullif(before_row ->> 'id', '')::uuid
  );

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id,
    action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), tg_argv[0], target_entity_id,
    lower(tg_op), before_row, after_row
  );
  return coalesce(new, old);
end;
$$;
```

Install it for insert/update on project referentials. Do not install browser
delete triggers because browser delete is revoked.

- [ ] **Step 6: Apply and run GREEN.**

Run:

```bash
/opt/homebrew/bin/supabase migration up --local
/opt/homebrew/bin/supabase test db supabase/tests/database/020_project_referentials.test.sql
/opt/homebrew/bin/supabase test db supabase/tests/database/021_referential_usage_guards.test.sql
```

Expected: all assertions pass.

### Checkpoint 2 — Gate A database review

Inspect policies with Studio or SQL. Confirm there is no authenticated DELETE
grant and no pre-Track-01 authorization helper left on reference tables.

---

## Task 4: Add atomic progress weights and setup-readiness RPCs

**Files:**
- Modify: `supabase/migrations/20260801091000_referential_invariants.sql`
- Modify: `supabase/tests/database/021_referential_usage_guards.test.sql`

- [ ] **Step 1: Extend RED tests.**

Add assertions for:

```sql
select throws_ok(
  $$select public.set_project_progress_weights(
      :'project_a'::uuid,
      'prefabrication',
      '[{"activity":"material_check","weight":40},
        {"activity":"weld_progress","weight":50}]'::jsonb
    )$$,
  '23514',
  'Progress weights must total exactly 100'
);

select lives_ok(
  $$select public.set_project_progress_weights(
      :'project_a'::uuid,
      'prefabrication',
      '[{"activity":"material_check","weight":40},
        {"activity":"weld_progress","weight":60}]'::jsonb
    )$$
);

select results_eq(
  $$select sum(weight)::numeric
    from public.project_progress_weights
    where project_id = :'project_a'::uuid
      and phase = 'prefabrication'
      and status = 'active'$$,
  array[100::numeric]
);

select results_eq(
  $$select ready_for_import
    from public.get_project_setup_readiness(:'project_a'::uuid)$$,
  array[false]
);
```

Assert Reader cannot call the weight command, Project Admin can, replacement
is atomic, duplicate activities are rejected, Assembly appears as missing only
when enabled, and the command writes an audit event.

- [ ] **Step 2: Run RED.**

Expected: functions are missing.

- [ ] **Step 3: Implement the weight command.**

Use this signature:

```sql
create function public.set_project_progress_weights(
  target_project_id uuid,
  target_phase text,
  weight_items jsonb
)
returns setof public.project_progress_weights
language plpgsql
security definer
set search_path = public, pg_temp;
```

The body must:

1. require `project_referential.manage`;
2. validate `jsonb_typeof(weight_items) = 'array'`;
3. parse with `jsonb_to_recordset` as `(activity text, weight numeric)`;
4. reject blank/duplicate activity;
5. reject any weight outside `0..100`;
6. reject a total other than `100.0000`;
7. reject Assembly when `project_assembly_settings.enabled` is false;
8. capture old rows as JSON;
9. archive old phase rows and insert the new rows in the same transaction;
10. write one `audit_events` row with action `replace_progress_weights`;
11. return the new active rows ordered by activity.

Revoke public execution and grant only to `authenticated`.

- [ ] **Step 4: Implement setup readiness.**

Use:

```sql
create function public.get_project_setup_readiness(target_project_id uuid)
returns table (
  ready_for_import boolean,
  admin_complete boolean,
  missing_codes text[]
)
language sql
stable
security definer
set search_path = public, pg_temp;
```

The fixed `missing_codes` vocabulary is:

```text
material_types
subcontractors
pds_areas
service_classes
weld_types
welding_procedures
welder_qualifications
nde_matrix_shop
nde_matrix_assembly
nde_matrix_field
thickness_flange_rules
piping_material_records
teams
systems
subsystems
line_services
locations
pressure_unit
progress_weights_prefabrication
progress_weights_painting
progress_weights_assembly
progress_weights_erection
spooling_material_types
spooling_material_classes
spooling_checklist
ral_codes
paint_matrix
devices
```

`ready_for_import` considers only Gate B codes.
`admin_complete` means the array is empty. Assembly codes are omitted when
Assembly is disabled. Require `project_referential.view`, revoke public
execution and grant `authenticated`.

- [ ] **Step 5: Run GREEN.**

Run the focused 021 test and full database suite.

Expected: all files pass and the test total increases by the new assertions.

---

## Task 5: Regenerate database types

**Files:**
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Generate from the applied local schema.**

Run:

```bash
/opt/homebrew/bin/supabase gen types typescript --local
```

Write the command output to `lib/supabase/database.types.ts` using the
repository’s established generation workflow; do not manually add table
shapes.

- [ ] **Step 2: Verify the generated vocabulary.**

Run:

```bash
rg -n "project_paint_matrix_rules|project_assembly_settings|set_project_progress_weights|get_project_setup_readiness" lib/supabase/database.types.ts
npx tsc --noEmit --incremental false
```

Expected: all four names exist and TypeScript exits `0`.

### Checkpoint 3 — Gate A complete

At this point schema, security, audit and generated types are authoritative.
Do not start UI work while generated types disagree with the local schema.

---

## Task 6: Add common domain validation and stable error mapping

**Files:**
- Create: `modules/project-setup/domain/reference.ts`
- Create: `modules/project-setup/domain/reference.test.ts`
- Create: `modules/project-setup/infrastructure/supabase-reference-errors.ts`
- Create: `modules/project-setup/infrastructure/supabase-reference-errors.test.ts`

- [ ] **Step 1: Write RED domain assertions.**

Test:

```ts
import assert from "node:assert/strict"
import {
  normalizeReferenceCode,
  validateReferenceIdentity,
  getReferenceStatusActions,
} from "./reference"

assert.equal(normalizeReferenceCode("  pds-a  "), "PDS-A")
assert.deepEqual(
  validateReferenceIdentity({ code: " ", description: "Area" }),
  { ok: false, errors: { code: "Code is required" } },
)
assert.deepEqual(getReferenceStatusActions("active"), [
  "deactivate",
  "archive",
])
assert.deepEqual(getReferenceStatusActions("archived"), ["reactivate"])
```

Error tests must map:

```ts
23505 -> "A reference with this code already exists."
23503 -> "This reference points outside the selected project or is in use."
23514 -> the safe database message for known Track 02 invariants
42501 -> "You do not have permission to manage this project."
all others -> "Unable to save reference changes. Please try again."
```

- [ ] **Step 2: Run RED.**

Run:

```bash
node --import tsx modules/project-setup/domain/reference.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-reference-errors.test.ts
```

Expected: module-not-found failures.

- [ ] **Step 3: Implement the common contracts.**

Define:

```ts
export type ReferenceStatus = "active" | "inactive" | "archived"
export type ReferenceStatusAction =
  | "deactivate"
  | "archive"
  | "reactivate"

export interface ReferenceIdentityInput {
  code: string
  description: string
}

export type ReferenceValidation<T> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, string> }
```

Normalize codes with `trim().toUpperCase()`. Normalize descriptions with
`trim()` but preserve case. Do not expose raw SQL, schema or policy names in
generic UI messages.

- [ ] **Step 4: Run GREEN and TypeScript.**

Expected: both focused tests and strict TypeScript pass.

---

## Task 7: Complete System Referential

**Files:**
- Create the three System Referential module files from the file map.
- Modify: `app/admin/system-referential/page.tsx`
- Retire from Supabase path:
  `components/admin/supabase-system-referential-view.tsx`
- Keep demo-only:
  `components/admin/system-referential-card.tsx`
- Modify tests:
  `lib/system-referentials.test.ts`,
  `lib/supabase/system-referentials.test.ts`

- [ ] **Step 1: Write RED domain tests.**

Define and test:

```ts
export interface FilmQuantityRule {
  id: string
  diameterFromInch: number
  diameterToInch: number
  thicknessFromMm: number
  thicknessToMm: number
  filmCount: number
}

export interface UtCalculationRule {
  id: string
  diameterFromInch: number
  diameterToInch: number
  coefficientDiameter: number
  coefficientRating: number
}

export const TORQUING_METHODS = [
  "Manual",
  "Torquing",
  "Tensioning",
] as const
```

Assert invalid descending ranges, negative coefficients and non-positive film
counts are rejected by pure validation.

- [ ] **Step 2: Write RED repository tests.**

The fake typed client must prove:

- entries query selects only Material Type and Torquing parent rows;
- Film Quantity queries `system_film_quantity_rules`;
- UT queries `system_ut_calculation_rules`;
- `canManage` calls
  `current_user_has_global_capability('system_referential.manage')`;
- Material Type create/update/status uses the existing table;
- no delete query is issued;
- static Film/UT/Torquing sections expose no mutation method.

- [ ] **Step 3: Implement the repository and screen.**

Repository result:

```ts
export interface LoadedSystemReferentials {
  materialTypes: SystemReferenceEntry[]
  filmQuantityRules: FilmQuantityRule[]
  utCalculationRules: UtCalculationRule[]
  torquingMethods: readonly ["Manual", "Torquing", "Tensioning"]
  canManage: boolean
}
```

The screen must:

- preserve the four-card structure;
- show loading, retry and empty states;
- allow Material Type create/edit/deactivate/archive/reactivate only when
  `canManage`;
- show Film/UT/Torquing as read-only tables;
- show no Delete action;
- update UI only after the durable Supabase result returns.

- [ ] **Step 4: Make the page the only mode boundary.**

`app/admin/system-referential/page.tsx` must have this shape:

```tsx
return appMode === "demo"
  ? <DemoSystemReferentialCards />
  : <SystemReferentialScreen />
```

No child System Referential component may call `useAdminStore`.

- [ ] **Step 5: Run focused tests and TypeScript.**

Expected: domain, repository, existing regression tests and TypeScript pass.

---

## Task 8: Implement Subcontractor, Unit, Area Classification and PDS Area

**Files:**
- Create project-geography domain/repository/UI files from the file map.
- Reuse visual structure from:
  `components/admin/subcontractors-tab.tsx`,
  `components/admin/pds-area-tab.tsx`,
  `components/admin/add-subcontractor-dialog.tsx`
- Modify: `app/admin/admin-tabs.tsx`

- [ ] **Step 1: Write RED domain tests.**

Use exact input contracts:

```ts
export interface SubcontractorInput {
  code: string
  description: string
  contactDetails: string | null
}

export interface AreaClassificationInput {
  code: string
  description: string
  unitId: string | null
}

export interface PdsAreaInput {
  code: string
  description: string
  shopSubcontractorId: string | null
  assemblySubcontractorId: string | null
  fieldSubcontractorId: string | null
  areaClassificationId: string | null
  environment: "above_ground" | "underground" | null
  isUnit: boolean | null
  isRack: boolean | null
  customValues: Record<string, string | number | boolean | null>
}
```

Assert code/description are required, at least one ownership subcontractor is
required for an active PDS Area, and `customValues` contains only keys loaded
from active definitions for `prefabrication`, `assembly` or `erection`.

- [ ] **Step 2: Write RED repository tests.**

Prove every query includes `.eq("project_id", projectId)`, dropdowns include
only active same-project rows, and status updates use both row ID and project
ID filters.

- [ ] **Step 3: Implement repository and UI.**

Load geography in dependency order:

```text
units
  → area classifications
subcontractors
  → PDS areas
custom field definitions
```

Preserve the existing Subcontractor and PDS visual flows, but replace
demo-only `scope[]` with actual project relationships. Functional permissions
remain in Access Rights; the Subcontractor referential describes the company,
not its user capabilities.

- [ ] **Step 4: Add real-mode adapters.**

In `app/admin/admin-tabs.tsx`, select demo or Supabase tabs at the tab-content
boundary. Do not place mode branches inside dialog submit handlers.

- [ ] **Step 5: Verify active-project switching.**

Use the request-version pattern from current Supabase screens. A response for
Project A must not replace Project B state after the user switches projects.

Run domain/repository tests and strict TypeScript.

---

## Task 9: Implement Service Class, Weld Type and Welder Qualification

**Files:**
- Create welding-quality domain/repository/UI files from the file map.
- Modify: `components/admin/supabase-wps-tab.tsx`
- Reuse visuals from:
  `components/admin/welder-qualifications-tab.tsx`,
  `components/admin/nde-matrix-tab.tsx`

- [ ] **Step 1: Write RED validation tests.**

Use:

```ts
export interface ServiceClassInput {
  code: string
  description: string | null
  materialTypeId: string
}

export interface WeldTypeInput {
  code: string
  description: string
  countsInDiaInch: boolean
}

export interface WelderQualificationInput {
  welderCode: string
  fullName: string
  subcontractorId: string
  certificateNumber: string | null
  expiresOn: string
  wpsIds: string[]
}
```

Assert:

- active Service Class requires active Material Type;
- welder code/name/subcontractor/expiry are required;
- an active welder requires at least one WPS;
- duplicate WPS IDs are normalized;
- expired qualification is valid historical data but reports
  `isCurrentlyQualified: false`.

- [ ] **Step 2: Write RED adapter tests.**

Welder save must be an RPC rather than two browser transactions. Require:

```sql
save_welder_qualification(
  target_project_id uuid,
  target_welder_id uuid,
  welder_payload jsonb,
  target_wps_ids uuid[]
)
```

The RPC checks `project_referential.manage`, verifies all subcontractor/WPS
rows belong to the project, upserts the welder, replaces WPS links and writes
one audit event atomically.

- [ ] **Step 3: Add the RPC and pgTAP assertions to the invariant migration.**

Test success, cross-project WPS rejection, empty WPS rejection, reader
rejection and rollback when any WPS is invalid.

- [ ] **Step 4: Implement the three Supabase tabs.**

The WPS tab must consume the same Subcontractor and Material Type records
exposed by this module. Remove duplicate option-loading logic from
`lib/supabase/welding-procedures.ts` only after regression tests prove the new
repository returns the same WPS contract.

- [ ] **Step 5: Run database, domain, adapter and TypeScript checks.**

Expected: all pass.

---

## Task 10: Implement NDE Matrix

**Files:**
- Modify welding-quality domain/repository/UI files.
- Reuse: `components/admin/nde-matrix-rule-dialog.tsx`
- Add pgTAP assertions to `020` and `021`.

- [ ] **Step 1: Write RED truth-table tests.**

Contract:

```ts
export interface NdeMatrixRuleInput {
  serviceClassId: string
  weldTypeId: string
  weldLocation: "shop" | "assembly" | "field"
  rtCoverage: number
  utCoverage: number
  mtCoverage: number
  ptCoverage: number
  pmiCoverage: number
  htCoverage: number
  pwhtRequired: boolean
  pwhtThicknessThreshold: number | null
  materialTraceabilityRequired: boolean
}
```

Assert every percentage is in `0..100`; a provided PWHT threshold is positive;
`pwhtRequired: true` with a null threshold means “always required”, while a
positive threshold means “required above thickness”. Assert Assembly is
accepted and the tuple
`serviceClassId + weldTypeId + weldLocation` is unique.

- [ ] **Step 2: Add an NDE coverage projection.**

Pure readiness input includes active Service Classes, Weld Types, Assembly
flag and active NDE rules. Return missing tuple codes in deterministic order.
The UI must show missing combinations, not only a single boolean.

- [ ] **Step 3: Implement Supabase list/create/update/status operations.**

All option lists must be active and same-project. The screen displays
service/weld codes rather than UUIDs and includes material traceability plus
the PWHT threshold state.

- [ ] **Step 4: Add pgTAP cross-project and percentage rejection.**

Run focused 020/021, domain/adapter tests and TypeScript.

### Checkpoint 4

Verify Project Admin can create a Service Class → Weld Type → WPS → Welder →
NDE rule chain without SQL Editor. Verify Reader sees no mutation actions.

---

## Task 11: Implement Thickness/Flange, PML, Rework and Joint Categories

**Files:**
- Modify welding-quality domain/repository/UI files.
- Reuse visuals from:
  `components/admin/piping-material-list-tab.tsx`,
  `components/admin/rework-codes-tab.tsx`,
  `components/admin/joint-categories-tab.tsx`

- [ ] **Step 1: Write RED validation tests.**

Exact contracts:

```ts
export interface ThicknessFlangeRuleInput {
  serviceClassId: string
  diameterInch: number
  thicknessMm: number
  flangeRating: string
}

export interface PipingMaterialRecordInput {
  mrrNumber: string
  identCode: string
  traceNumber: string
}

export interface ReworkCodeInput {
  code: string
  description: string
}

export interface JointCategoryInput {
  jointDefinition: string
  timing:
    | "before_pressure_test"
    | "before_precommissioning"
    | "after_precommissioning"
  categoryCode: string
  reason: string
  coefficient: number | null
}
```

Assert positive numeric dimensions, required codes, trimmed trace identity and
valid timing.

- [ ] **Step 2: Write RED repository tests.**

Prove:

- Thickness rules join Service Class;
- PML filters by MRR/ident/trace;
- Rework and Joint Category retain DB fields only;
- demo-only severity/default-action/examples are not silently written to
  description or JSON;
- all status changes use project and row ID.

- [ ] **Step 3: Implement the UI.**

If a demo field has no database/manual counterpart, omit it in Supabase mode
and keep it in demo mode. Do not expand the production schema to preserve
decorative demo data.

- [ ] **Step 4: Add database assertions.**

Assert uniqueness, cross-project Service Class rejection and physical delete
denial. Run all focused checks.

### Checkpoint 5 — Gate B

Create the complete import-prerequisite chain through UI and call
`get_project_setup_readiness`. `ready_for_import` must become true only after
all Gate B dependencies exist. Track 03 must not start if this checkpoint
fails.

---

## Task 12: Implement teams, systems, locations, pressure and progress weights

**Files:**
- Create execution-reference domain/repository/UI files.
- Reuse visual structure from `components/admin/teams-tab.tsx`.
- Modify `app/admin/project-referential/page.tsx`.

- [ ] **Step 1: Write RED domain tests.**

Contracts:

```ts
export type ProjectTeamType =
  | "line_check"
  | "blinding"
  | "finishing"
  | "reinstatement"
  | "jointer"

export interface CodeDescriptionInput {
  code: string
  description: string
}

export interface SubsystemInput extends CodeDescriptionInput {
  systemId: string
}

export interface LocationInput extends CodeDescriptionInput {
  categoryId: string
  mappedProgressColumns: string[]
}

export interface ProgressWeightInput {
  activity: string
  weight: number
}
```

Assert unique mapped columns, non-negative weights and exact local sum 100
before calling the RPC.

- [ ] **Step 2: Write repository tests.**

Cover `project_teams`, `project_systems`, `project_subsystems`,
`project_line_services`, `project_location_categories`,
`project_locations`, `project_pressure_units`,
`project_unit_time_references` and `project_progress_weights`.

- [ ] **Step 3: Implement grouped tabs.**

Render:

- Teams: five team types;
- Test Pack: System → Subsystem, Line Service, Pressure Unit;
- Flange: Unit of Time;
- Tracking: Location Category → Location;
- Progress Weights: one editor per enabled phase.

Child creation actions remain disabled until the parent exists.

- [ ] **Step 4: Use only `set_project_progress_weights` for phase save.**

Do not issue per-row insert/update requests from React. Keep the editor open
with its values and show the mapped invariant message if the RPC fails.

- [ ] **Step 5: Verify project switching and all focused tests.**

Expected: Project A hierarchy never appears after switching to empty Project B.

---

## Task 13: Implement devices, spooling, painting and Assembly

**Files:**
- Create extended-reference domain/repository/UI files.
- Modify `app/admin/project-referential/page.tsx`.

- [ ] **Step 1: Write RED domain tests.**

Contracts:

```ts
export interface DeviceInput extends CodeDescriptionInput {}

export interface DeviceUserInput {
  membershipId: string
  deviceId: string | null
}

export interface SpoolingMaterialClassInput {
  externalClassCode: string
  materialTypeId: string
}

export interface SpoolingChecklistItemInput extends CodeDescriptionInput {
  sortOrder: number
  isRequired: boolean
}

export interface RalCodeInput {
  lineServiceId: string
  colorCode: string
  ralCode: string
}

export interface PaintMatrixInput {
  lineServiceId: string
  ralCodeId: string
  blastingRequired: boolean
  primerRequired: boolean
  intermediateCoatCount: number
  finalCoatCount: number
  requiredFinalDftMicrons: number
}

export interface AssemblySettingsInput {
  enabled: boolean
  defaultSubcontractorId: string | null
}
```

Assert non-negative coat counts, positive DFT, same Line Service on RAL and
Paint Matrix, and default subcontractor required when Assembly is enabled.

- [ ] **Step 2: Add DB enforcement for Assembly default.**

The current table check permits enabled with null. Add a deferred constraint
trigger so a transaction may create the setting and subcontractor relation in
either order but cannot commit enabled Assembly without a default
subcontractor.

- [ ] **Step 3: Implement repository and UI.**

Grouped tabs:

- Spooling: material types, external class mapping, checklist;
- Painting: RAL and Paint Matrix;
- Assembly: enabled/default subcontractor plus PDS assignment visibility;
- Tracking Devices: devices and active project memberships as PDA users.

Device analytics, barcode sync and checklist execution are operational work
and remain outside this track.

- [ ] **Step 4: Run focused and full checks.**

Expected: domain, repository, pgTAP and TypeScript pass.

---

## Task 14: Add setup readiness orchestration and remove Supabase admin-store reads

**Files:**
- Create:
  `modules/project-setup/domain/setup-readiness.ts`,
  `modules/project-setup/domain/setup-readiness.test.ts`,
  `modules/project-setup/ui/setup-readiness-panel.tsx`,
  `modules/project-setup/ui/project-referential-screen.tsx`
- Modify:
  `app/admin/project-referential/page.tsx`,
  `app/admin/admin-tabs.tsx`

- [ ] **Step 1: Write RED readiness tests.**

Map RPC codes to fixed labels and route anchors:

```ts
export const SETUP_REQUIREMENTS = {
  material_types: { label: "Material Types", tab: "system" },
  subcontractors: {
    label: "Subcontractors",
    tab: "general",
  },
  pds_areas: {
    label: "PDS Areas",
    tab: "general",
  },
  service_classes: { label: "Service Classes", tab: "spooling" },
  weld_types: { label: "Weld Types", tab: "fabrication" },
  welding_procedures: { label: "Welding Procedures", tab: "fabrication" },
  welder_qualifications: {
    label: "Welder Qualifications",
    tab: "fabrication",
  },
  nde_matrix_shop: {
    label: "NDE Matrix — Shop",
    tab: "fabrication",
  },
  nde_matrix_assembly: {
    label: "NDE Matrix — Assembly",
    tab: "fabrication",
  },
  nde_matrix_field: {
    label: "NDE Matrix — Field",
    tab: "fabrication",
  },
  thickness_flange_rules: {
    label: "Thickness / Flange Rules",
    tab: "spooling",
  },
  piping_material_records: {
    label: "Project Piping Material List",
    tab: "spooling",
  },
  teams: { label: "Project Teams", tab: "testpack" },
  systems: { label: "Systems", tab: "testpack" },
  subsystems: { label: "Subsystems", tab: "testpack" },
  line_services: { label: "Line Services", tab: "testpack" },
  locations: { label: "Tracking Locations", tab: "tracking" },
  pressure_unit: { label: "Pressure Unit", tab: "testpack" },
  progress_weights_prefabrication: {
    label: "Prefabrication Weights",
    tab: "general",
  },
  progress_weights_painting: {
    label: "Painting Weights",
    tab: "general",
  },
  progress_weights_assembly: {
    label: "Assembly Weights",
    tab: "general",
  },
  progress_weights_erection: {
    label: "Erection Weights",
    tab: "general",
  },
  spooling_material_types: {
    label: "Spooling Material Types",
    tab: "spooling",
  },
  spooling_material_classes: {
    label: "Spooling Material Classes",
    tab: "spooling",
  },
  spooling_checklist: {
    label: "Spooling Checklist",
    tab: "spooling",
  },
  ral_codes: { label: "RAL Codes", tab: "painting" },
  paint_matrix: {
    label: "Paint Matrix",
    tab: "painting",
  },
  devices: { label: "Tracking Devices", tab: "tracking" },
} as const
```

Assert unknown server codes render as `Unknown setup requirement` without
crashing.

- [ ] **Step 2: Implement screen orchestration.**

The screen:

- reads `activeProjectId` and capabilities from the Track 01 context;
- loads readiness with the selected project;
- renders Gate B and Gate C progress;
- deep-links missing requirements to the correct tab;
- reloads readiness after a successful mutation;
- invalidates in-flight work on project switch;
- renders read-only state when `project_referential.manage` is absent.

- [ ] **Step 3: Make the route the single mode boundary.**

`app/admin/project-referential/page.tsx`:

```tsx
return appMode === "demo"
  ? <DemoProjectReferentialScreen />
  : <ProjectReferentialScreen />
```

- [ ] **Step 4: Prove there are no Supabase-path admin-store imports.**

Run:

```bash
rg -n "useAdminStore|store/admin-store" modules/project-setup app/admin
```

Expected: matches are confined to explicitly named demo components imported
only by `DemoProjectReferentialScreen`; no
`modules/project-setup/infrastructure`, Supabase screen or Supabase dialog
imports the store.

- [ ] **Step 5: Run all project-setup tests and TypeScript.**

Expected: pass.

---

## Task 15: Move Project Definition logos to private Storage

**Files:**
- Create:
  `supabase/migrations/20260801092000_project_branding_storage.sql`,
  `supabase/tests/database/022_project_branding_storage.test.sql`,
  `modules/project-setup/infrastructure/supabase-project-branding.ts`,
  `modules/project-setup/infrastructure/supabase-project-branding.test.ts`
- Modify:
  `app/admin/project-definition/page.tsx`,
  `lib/supabase/project-definition.ts`

- [ ] **Step 1: Write RED Storage policy tests.**

Assert private bucket `project-branding` exists and object paths follow:

```text
<project_id>/owner/logo.<extension>
<project_id>/contractor/logo.<extension>
```

Project member with `project.view` can read the selected project path.
`project.definition.manage` can insert/update/delete that project path.
Project A cannot read or write Project B path.

- [ ] **Step 2: Add the bucket and policies.**

Create the bucket with:

```sql
insert into storage.buckets(id, name, public, file_size_limit)
values ('project-branding', 'project-branding', false, 2097152)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;
```

Accept PNG, JPEG, WEBP and SVG only. Derive the first path segment as UUID and
check the matching project capability in each policy.

- [ ] **Step 3: Write and implement adapter tests.**

Adapter rules:

- maximum 2 MiB;
- deterministic owner/contractor object path;
- `upsert: true`;
- save the object path, not a signed URL, in `projects`;
- create a short-lived signed URL for display;
- replace durable DB path only after successful upload;
- remove the previous object only after the DB update succeeds.

- [ ] **Step 4: Integrate the Project Definition form.**

Demo mode keeps URL fields. Supabase mode shows upload/remove controls and
signed previews. A Reader sees previews without mutation controls.

- [ ] **Step 5: Run Storage pgTAP/integration checks and TypeScript.**

Expected: cross-project object access fails and valid project access passes.

---

## Task 16: Add idempotent Track 02 browser fixtures

**Files:**
- Create:
  `scripts/bootstrap-track02-browser-fixtures.ts`,
  `scripts/bootstrap-track02-browser-fixtures.test.ts`,
  `docs/TRACK02_BROWSER_FIXTURES.md`
- Modify: `package.json`

- [ ] **Step 1: Write RED fixture-shape tests.**

The script must export a pure `buildTrack02FixturePlan` and local-host guard.
Assert the plan contains:

- both `TRACK01-A` and `TRACK01-B`;
- Project A complete through Gate C;
- Project B intentionally missing Gate B dependencies;
- two subcontractors and shop/assembly/field PDS ownership;
- Material Type, Service Class, Weld Type, WPS, qualified welder;
- NDE Matrix for shop/assembly/field;
- Thickness/Flange and PML records;
- teams/system/subsystem/line service/location/pressure unit;
- all enabled phase weights totaling 100;
- spooling, RAL, Paint Matrix, Assembly and device records.

- [ ] **Step 2: Run RED.**

Expected: module-not-found.

- [ ] **Step 3: Implement local-only idempotent bootstrap.**

Use the same environment contract as Track 01 and reject every host except
`127.0.0.1`, `localhost` and `::1`. Reconcile by stable project-scoped code;
do not delete user-created rows. Use `upsert` only on declared unique keys.

Add:

```json
"bootstrap:track02-browser-fixtures": "tsx scripts/bootstrap-track02-browser-fixtures.ts"
```

- [ ] **Step 4: Document execution.**

The runbook must show:

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local Authentication Secret>' \
TRACK01_FIXTURE_PASSWORD='<local test password>' \
npm run bootstrap:track02-browser-fixtures
```

State explicitly that the Authentication Secret is not the Storage S3 secret
and must never be placed in browser environment variables or committed files.

- [ ] **Step 5: Verify tests and idempotency.**

Run the pure fixture test. With local credentials supplied by the user, run
bootstrap twice. Expected: second run succeeds without duplicates and keeps
the same row IDs where upsert semantics permit.

---

## Task 17: Full automated verification

**Files:**
- No new files unless a verified defect requires a focused regression test.

- [ ] **Step 1: Run every database test.**

```bash
/opt/homebrew/bin/supabase test db
```

Expected: all Track 01 and Track 02 pgTAP files pass.

- [ ] **Step 2: Run all focused project-setup tests.**

```bash
node --import tsx modules/project-setup/domain/reference.test.ts
node --import tsx modules/project-setup/domain/system-referential.test.ts
node --import tsx modules/project-setup/domain/project-geography.test.ts
node --import tsx modules/project-setup/domain/welding-quality-reference.test.ts
node --import tsx modules/project-setup/domain/execution-reference.test.ts
node --import tsx modules/project-setup/domain/extended-reference.test.ts
node --import tsx modules/project-setup/domain/setup-readiness.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-reference-errors.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-system-referential-repository.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-project-geography-repository.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-extended-reference-repository.test.ts
node --import tsx modules/project-setup/infrastructure/supabase-project-branding.test.ts
node --import tsx scripts/bootstrap-track02-browser-fixtures.test.ts
```

Expected: all exit `0`.

- [ ] **Step 3: Run regression checks.**

```bash
node --import tsx lib/project-definition.test.ts
node --import tsx lib/system-referentials.test.ts
node --import tsx lib/welding-procedures.test.ts
node --import tsx lib/supabase/system-referentials.test.ts
node --import tsx lib/supabase/welding-procedures.test.ts
node --import tsx modules/access/domain/effective-access.test.ts
node --import tsx modules/access/domain/access-rights.test.ts
npm run validate:fixtures
npx tsc --noEmit --incremental false
git diff --check
```

Expected: all exit `0`.

- [ ] **Step 4: Attempt lint and classify honestly.**

Run:

```bash
npm run lint
```

Expected only if tooling remains unchanged: baseline
`eslint: command not found`. Report it as an unverified tooling gap, not a
passing check and not a Track 02 code defect. If ESLint has been installed by
another approved track, require exit `0`.

---

## Task 18: Manual browser acceptance

**Files:**
- Update: `docs/TRACK02_BROWSER_FIXTURES.md`

Run the application with:

```bash
NEXT_PUBLIC_PIPEQC_MODE=supabase npm run dev
```

- [ ] **Platform Admin — System Referential.**

Sign in with the existing Track 01 Platform Admin fixture.

Verify:

- all four System Referential sections load;
- Material Type create/edit/archive/reactivate works;
- Film Quantity, UT Calculation and Torquing are read-only;
- no physical Delete action exists;
- Network requests use Supabase and no localStorage `pipeqc-admin-storage`
  mutation occurs.

- [ ] **Project Admin A — complete Project Referential.**

Verify every group loads from `TRACK01-A`, status changes persist after reload,
and Gate B/Gate C show complete after fixture bootstrap.

- [ ] **Project Admin A — dependency flow.**

Archive one active Weld Type used by NDE Matrix. Existing matrix remains
visible, active dropdowns stop offering the archived Weld Type, and readiness
shows the missing dependency. Reactivate it and confirm readiness recovers.

- [ ] **Project Reader A.**

Verify reference data can be read where the access profile permits it, no
create/edit/status/upload control is actionable, and direct mutation requests
return permission denied.

- [ ] **Project isolation.**

Switch between Projects A and B. Project A results must never appear in B.
Project B readiness must show the intentionally missing dependencies.

- [ ] **Assembly conditional behavior.**

Disable Assembly and confirm Assembly NDE/weights are no longer required.
Enable Assembly with a default subcontractor and confirm Assembly assignments,
NDE Matrix and weights become required.

- [ ] **Progress-weight atomicity.**

Submit weights totaling 90: dialog stays open and shows the invariant error.
Submit 100: all phase rows change together after one RPC succeeds.

- [ ] **Branding.**

Upload owner and contractor logos, reload, and confirm signed previews render.
Confirm another project cannot read the object URL.

- [ ] **Audit.**

In Studio, query:

```sql
select entity_type, action, before_state, after_state, created_at
from public.audit_events
where project_id = (
  select id from public.projects where activity_code = 'TRACK01-A'
)
order by created_at desc
limit 30;
```

Confirm UI mutations, progress-weight replacement and welder/WPS assignment
appear with the authenticated actor.

---

## Task 19: Documentation and Track 02 exit

**Files:**
- Modify:
  `docs/SUPABASE_BACKEND_FOUNDATION.md`,
  `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`,
  `docs/TRACK02_BROWSER_FIXTURES.md`
- Modify this plan by checking completed steps only after evidence exists.

- [ ] **Step 1: Update backend foundation with verified facts.**

Record:

- exact Track 02 migration names;
- exact pgTAP total;
- implemented System/Project referential groups;
- Storage bucket/path policy;
- Gate B/Gate C semantics;
- browser actors actually tested;
- lint status separately.

- [ ] **Step 2: Write the Track 03 handoff.**

State that the next track is Import Platform and Engineering Definition:

```text
reference validation
→ import job/file/row/issue lifecycle
→ ISO/spool/weld stable identity and revisions
→ apply command
```

Explicitly prohibit starting Fabrication persistence before ISO/spool/weld
identity and revision handling exist.

- [ ] **Step 3: Re-run final evidence.**

Run the full database suite, all focused domain/adapter tests, fixture
validation, strict TypeScript and `git diff --check` after documentation edits.

- [ ] **Step 4: Produce the execution report.**

Report in four sections:

1. implemented and browser-verified;
2. implemented and automated-only verified;
3. baseline/environmental failures;
4. files changed and manual follow-up.

Do not call Track 02 complete if any exit criterion below is unproven.

---

## 5. Exit criteria

Track 02 is complete only when all are true:

- [ ] Track 01 manual acceptance remains valid.
- [ ] All Track 02 migrations apply locally without editing older migrations.
- [ ] Full pgTAP suite passes.
- [ ] Strict TypeScript passes.
- [ ] Project A/B isolation is proven with JWT-context pgTAP.
- [ ] Project Reader mutation denial is proven.
- [ ] Browser users have no hard-delete grant on setup records.
- [ ] Referential create/update/status operations are audited.
- [ ] Cross-project reference relationships fail at the database boundary.
- [ ] Custom fields enforce max three per project/scope.
- [ ] Progress weights update atomically and total exactly 100.
- [ ] System Referential is fully real-mode and static sections are read-only.
- [ ] All manual Project Referential groups have a real Supabase screen.
- [ ] Gate B readiness is true only with the import prerequisite chain.
- [ ] Gate C readiness respects Assembly-enabled state.
- [ ] Supabase Project Referential does not read `admin-store`.
- [ ] Project logos are private Storage objects with project-scoped policies.
- [ ] Track 02 browser fixtures are local-only and idempotent.
- [ ] Platform Admin, Project Admin, Reader and project-switching browser
  scenarios are manually accepted.
- [ ] Documentation states the verified test totals and remaining boundary.

## 6. Explicitly outside Track 02

- Import files, previews, validation rows and apply lifecycle.
- ISO, spool, weld, flange or support identity/revision tables.
- Fabrication Material Check or Weld Progress persistence.
- NDE obligations, batches, results, repair cascade or tracer logic.
- Device sync, scan events, tracking analytics and barcode generation.
- Painting progress; Track 02 defines only RAL/Paint Matrix setup.
- Assembly/Erection progress; Track 02 defines only configuration.
- Test Pack operational records.
- Remote deployment, production seed data, backups and monitoring.

The next implementation plan is Track 03 Import Platform and Engineering
Definition. Fabrication begins only after that track establishes authoritative
ISO/spool/weld identities and revision-aware imports.
