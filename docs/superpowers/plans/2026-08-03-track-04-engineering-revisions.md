# Track 04 Engineering Definition and Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the upstream operational spine — stable ISO/spool/weld/support/flange identity with immutable revisions — and the SpoolGen import plus revision-decision workflow that produces it, so every downstream track can reference one concrete, frozen engineering definition.

**Architecture:** Identity and definition are separated. A stable table (`isometrics`, `spools`, `weld_joints`, `supports`, `flange_joints`) holds only project + business number and never changes. A revision table holds the mutable engineering definition and is frozen the moment it is superseded. Exactly one `accepted` revision exists per isometric, enforced by a partial unique index rather than by application code. The SpoolGen import reuses the Track 03 `import_jobs` staging machinery — the browser parses up to four `.txt` files into `import_job_rows`, the database re-derives every referential check inside `apply_spooling_import_job`, and the whole promotion (create stable rows → create revisions → record change items and decisions → supersede the old revision) happens in one SQL transaction that cannot run twice.

**Tech Stack:** PostgreSQL 15 (Supabase), pgTAP, Supabase Storage, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`.

---

## 1. Execution policy

- Migrations are **forward-only**. Never edit a migration that has been applied; add a new one.
  Replacing an existing function with `create or replace function` in a *new* migration is allowed
  and is how Task 11 hardens a Track 03 function.
- After any migration, regenerate `lib/supabase/database.types.ts` (Task 5 and Task 13 both do this).
- Run the full verification command after every Gate. Never mark a checkbox for a command you did not run.
- Do **not** mark a step complete because the code "looks right". Every RED step must actually fail,
  and every GREEN step must actually pass.
- If a step's expected output does not match reality, stop and report the discrepancy instead of
  adjusting the test to match the code.
- The local Supabase CLI in this repository is invoked as `/opt/homebrew/bin/supabase`.

## 2. Prerequisite state

This plan assumes Tracks 01, 02 and 03 are merged. Concretely it depends on:

- `public.current_user_has_capability(uuid, text)` and the `capabilities` / `role_capabilities` catalog
  (`20260731090000_access_capability_catalog.sql`).
- The capabilities `spooling.view` and `spooling.manage`, **already seeded** by Track 01 with
  `requires_functional_role = true`. Track 04 adds **no new capability**; `project_admin` and
  `site_admin` reach them through `roles.bypasses_functional_gate`, and `spooling_team` holds
  both directly.
- `public.import_jobs` with the Track 03 lifecycle columns, `public.import_job_rows`,
  `public.import_job_issues` and the `public.import_issue_severity` enum
  (`20260802090000_import_platform.sql`).
- `public.storage_path_project_id(text)` (`20260802091000_import_storage_policies.sql`).
- Project referentials: `project_pds_areas`, `project_service_classes`, `project_weld_types`,
  `project_thickness_flange_rules`, `nde_matrix_rules`, `project_welding_procedures`.

Two roadmap §16 line items are **already satisfied** by Track 02 and must be verified, not rebuilt:

1. *"Добавить Assembly ownership в PDS mapping"* — `project_pds_areas.assembly_subcontractor_id`
   was added by `20260801090000_complete_project_referentials.sql:32-33` with a same-project trigger
   in `20260801094000_track02_blockers_fix.sql:17-19`. Task 1 asserts it in pgTAP instead of adding
   a duplicate column.
2. `nde_matrix_rules.weld_location` already accepts `'assembly'`
   (`20260801090000_complete_project_referentials.sql:37-39`), so `weld_location = 'assembly'` in
   engineering definitions resolves against the NDE matrix without further schema work.

## 3. Decisions fixed by this plan

### 3.1 Identity versus definition

The stable table holds **only** project scope and the business number. Every mutable attribute —
including the parent link — lives on the revision row. A weld joint that moves from spool A to
spool B between R1 and R2 keeps one `weld_joints` row and gains a second
`weld_joint_revisions` row under a different `spool_revision_id`.

```text
isometrics(project_id, iso_number)
└── isometric_revisions(revision_number, status, pds_area_id, service_class_id, …)
    └── spool_revisions(spool_id → spools)
        ├── weld_joint_revisions(weld_joint_id → weld_joints)
        │   └── weld_points(point_type: root|hot|fill|cap)
        ├── support_revisions(support_id → supports)
        ├── flange_joint_revisions(flange_joint_id → flange_joints)
        └── spool_revision_materials(ident_code, trace_number)
```

### 3.2 Revision status

`draft` → `accepted` → `superseded`. Only `accepted` and `superseded` are ever produced by this
track: `apply_spooling_import_job` and `create_manual_revision` insert a revision and accept it
inside the same transaction, so a half-built revision is never visible. `draft` exists in the enum
because Track 11 (document workflow) will need it; nothing in Track 04 writes it.

- **One accepted revision per isometric** is a partial unique index, not a check in application code.
- **Superseded revisions are read-only.** A `before update or delete` trigger raises `PQC21` on the
  revision row and on every child table whose owning `isometric_revisions.status = 'superseded'`.

### 3.3 Deviation from roadmap §9.4: `spool_revision_materials`

Roadmap §9.4 lists no table for `trace.txt` content. `material_check_items` in §9.5 is a *check
record* produced during fabrication, not a definition, so importing `trace.txt` into it would
invert the dependency direction — Track 05 must check material **against** the definition.

This plan therefore adds `spool_revision_materials` as part of the engineering definition, one row
per ident code per spool revision. It is an addition to §9.4, not a parallel model: nothing else
stores the spool bill of materials, and Track 05's `material_check_items` will reference it.

### 3.4 The SpoolGen file contract

The repository contains no SpoolGen sample and the manual documents no column layout, so this plan
**defines** the contract in `docs/architecture/spoolgen-file-contract.md` and implements it:

- Tab-delimited by default, comma accepted as a fallback, first line is the header row.
- Header matching is alias-driven and normalized (uppercase, non-alphanumerics stripped), so
  `ISO No.`, `iso_number` and `ISONO` all resolve to the `iso_number` key.
- When a real SpoolGen export arrives, only the alias table in `spoolgen-contract.ts` changes.
  No schema, RPC or UI change is required.

| File | Required | Content |
| --- | --- | --- |
| `weld.txt` | yes | ISO / spool / weld structure, the spine of the import |
| `trace.txt` | no | ident codes and material trace per spool |
| `bolt.txt` | no | flange joints and bolting |
| `supp.txt` | no | supports |

Dossier §14.3: each file is limited to **4 MB**, enforced in three places — the browser before
upload, the `import_files.size_bytes` check constraint, and the Storage bucket `file_size_limit`.

### 3.5 Validation severity

Straight from dossier §14.2. Nothing here is a judgement call:

| Validation | Severity | Blocks apply? |
| --- | --- | --- |
| PDS area missing | `blocker` | yes |
| Service class missing | `blocker` | yes |
| Weld type missing | `blocker` | yes |
| Thickness rule missing for class + diameter | `blocker` | yes |
| NDE matrix combination missing for class + weld type + location | `blocker` | yes |
| Mixed line number or service class inside one ISO | `blocker` | yes |
| Spool referenced by `trace`/`bolt`/`supp` but absent from `weld` | `blocker` | yes |
| **Covering WPS missing** | **`warning`** | **no** |
| File larger than 4 MB | `blocker` | yes |

The covering-WPS rule is the one that agents habitually get wrong. Dossier §11.6 and §14.2 are
explicit: *WPS coverage missing → warning, import may proceed.* A test in Task 12 asserts this.

### 3.6 Preview never writes domain tables

Track 03's invariant carries over unchanged. Validation writes **only** `import_job_rows` and
`import_job_issues`. The new-versus-revised diff is produced by the read-only function
`preview_spooling_import(job_id)`, which compares staging rows against the current accepted
revision and returns a result set. Decisions taken before apply are staged in
`import_revision_decisions`, keyed by *business numbers*, not by revision row IDs — because those
rows do not exist yet.

`apply_spooling_import_job` is the only function that touches engineering tables, and it does
everything in one transaction: create missing stable rows, insert the new revision graph, copy the
staged decisions into the durable `revision_change_items` / `revision_decisions` / 
`revision_progress_copies` history, and supersede the previous accepted revision.

### 3.7 Where decisions are required

Dossier §15.2–15.3. Decisions apply to a **revised ISO** — one that already has an accepted revision:

- Every spool of a revised ISO requires a decision: `not_done`, `cancelled`,
  `done_without_modification` or `rework`.
- A weld joint requires its own decision **only** when its spool was decided `rework`.
- Supports and flange joints follow their spool. They still produce change items, so history stays
  complete, but they never block apply.
- A brand-new ISO — no accepted revision — requires no decisions at all.

`apply_spooling_import_job` raises `PQC22` while any required decision is missing. That is dossier
§15.4: *import нельзя завершить, пока все ISO не resolved.*

### 3.8 Progress copy is a provenance ledger

Dossier §15.2 requires that `done_without_modification` and `rework` carry Fabrication Start, Sent
to Paint and Paint forward, while `not_done` and `cancelled` carry nothing.

Track 05 owns the progress tables; they do not exist yet. So `revision_progress_copies` records,
per change item, **which progress kinds are authorized to carry from which spool revision to which**.
Track 05 reads that ledger when it materializes progress rows. This is a deliberate seam, stated
here so nobody later mistakes an empty `copied_payload` for a bug:

| Decision | Progress kinds authorized | Entity survives into the new revision |
| --- | --- | --- |
| `not_done` | none | yes, with no progress |
| `cancelled` | none | no — `is_removed = true` |
| `done_without_modification` | fabrication_start, sent_to_paint, paint | yes |
| `rework` | fabrication_start, sent_to_paint, paint | yes, welds reviewed individually |

### 3.9 Error codes

Continuing the `PQC` series. Track 01 used `PQC01`–`PQC05`, Track 03 used `PQC10`–`PQC14`.

| Code | Meaning |
| --- | --- |
| `PQC10` | already applied (reused from Track 03) |
| `PQC12` | import job not found (reused from Track 03) |
| `PQC20` | isometric or engineering entity not found |
| `PQC21` | revision is superseded and read-only |
| `PQC22` | unresolved revision decisions remain |
| `PQC23` | duplicate revision number for this isometric |
| `PQC24` | spooling import job is not in a state that allows this action |
| `PQC25` | required SpoolGen file (`weld`) is missing |
| `PQC26` | blocking validation issues remain |

### 3.10 Capability boundary

`spooling.view` guards every read; `spooling.manage` guards every mutation, including creating and
applying a spooling import job. Track 03's `imports.manage` deliberately does **not** grant it —
Task 11 hardens `create_import_job` so a user holding only `imports.manage` cannot open a
`spooling_definition` job through the generic import path.

### 3.11 Legacy spooling UI

Per the scope decision for this track: build the new `modules/engineering` screens against Supabase,
fix the two named defects in the demo store so demo mode stops telling lies, and leave
`/spooling/engineering-transmittals`, `/spooling/iso-workflow` and `/spooling/spooling-transmittal`
on demo data behind the existing mode switch. Task 31 covers the defects:

1. `store/spooling-store.ts:411-425` — `composeAndSendTransmittal` marks every ISO in an outbound
   batch as `Superseded`. Sending a transmittal is a release event, not a revision event; the
   correct terminal status is `Released`.
2. `store/spooling-store.ts:427-448` — `applyRevision` appends a second record carrying the **same**
   `id` as the superseded one, so `isoRecords.find(i => i.id === isoId)` becomes order-dependent and
   every later mutation targets an arbitrary one of the two.

## 4. File map

### Database

- Create: `supabase/migrations/20260803090000_engineering_entities.sql` — stable and revision tables.
- Create: `supabase/migrations/20260803091000_engineering_revisions.sql` — change items, decisions,
  progress copies, read-only triggers, RLS and grants.
- Create: `supabase/migrations/20260803092000_spooling_import_apply.sql` — `import_files`,
  `import_revision_decisions`, the `spooling_definition` import type, validation, preview and apply.
- Create: `supabase/migrations/20260803093000_revision_commands.sql` — decision recording,
  manual revision, and the `create_import_job` hardening.
- Create: `supabase/migrations/20260803094000_spooling_storage_policies.sql` — `project-spooling`
  bucket and its policies. Roadmap §16 lists four migration files; the storage bucket is split into
  a fifth so a policy change never forces a re-read of the apply logic.
- Create: `supabase/tests/database/040_engineering_identity.test.sql`
- Create: `supabase/tests/database/041_revision_workflow.test.sql`
- Create: `supabase/tests/database/042_spooling_apply.test.sql`
- Create: `supabase/tests/database/043_spooling_storage_policies.test.sql`

### Domain (no Supabase, no React, no `store/*` imports)

- Create: `modules/engineering/domain/entity.ts` — engineering entity type union.
- Create: `modules/engineering/domain/spoolgen-file.ts` — file roles, 4 MB limit, required set.
- Create: `modules/engineering/domain/spoolgen-contract.ts` — per-role column contract and aliases.
- Create: `modules/engineering/domain/parsers/delimited.ts` — delimiter detection and row splitting.
- Create: `modules/engineering/domain/parsers/spoolgen-parser.ts` — text → typed records + issues.
- Create: `modules/engineering/domain/parsers/cross-file.ts` — cross-file and per-ISO consistency.
- Create: `modules/engineering/domain/definition.ts` — normalized definition shapes and builder.
- Create: `modules/engineering/domain/diff.ts` — new / revised / unchanged / removed.
- Create: `modules/engineering/domain/revision.ts` — statuses, decisions, progress-copy policy.

`ImportIssue` is reused from `modules/imports/domain/import-issue`. Both are pure domain modules
with no infrastructure dependency, so the cross-module import is intentional — a second, parallel
issue type would fragment the UI that renders them.

### Application

- Create: `modules/engineering/application/import-spooling.ts` — build the staging submission.
- Create: `modules/engineering/application/resolve-revision.ts` — decision gate and apply gate.

### Infrastructure

- Create: `modules/engineering/infrastructure/spoolgen-file-reader.ts` — `File` → text boundary.
- Create: `modules/engineering/infrastructure/supabase-engineering-errors.ts` — `PQC` → user text.
- Create: `modules/engineering/infrastructure/supabase-engineering-repository.ts` — every RPC call.

### UI

- Create: `modules/engineering/ui/spooling-import-screen.tsx`
- Create: `modules/engineering/ui/revision-decision-table.tsx`
- Create: `modules/engineering/ui/revision-workbench.tsx`
- Create: `modules/engineering/ui/engineering-browser.tsx`
- Create: `app/spooling/import/page.tsx`
- Create: `app/spooling/revisions/page.tsx`
- Create: `app/spooling/browse/page.tsx`
- Modify: `config/navigation.ts:100-131`
- Modify: `config/route-capabilities.ts:11`

### Fixtures, scripts and docs

- Create: `scripts/bootstrap-track04-browser-fixtures.ts`
- Create: `scripts/bootstrap-track04-browser-fixtures.test.ts`
- Create: `docs/architecture/spoolgen-file-contract.md`
- Create: `docs/TRACK04_BROWSER_FIXTURES.md`
- Modify: `package.json` — add `bootstrap:track04-browser-fixtures`.
- Modify: `store/spooling-store.ts:411-448`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`, `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`,
  `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`

---

# Gate A — Engineering schema

## Task 1: Create the stable identity and revision tables

**Files:**
- Create: `supabase/migrations/20260803090000_engineering_entities.sql`
- Create: `supabase/tests/database/040_engineering_identity.test.sql`

- [x] **Step 1: Write the migration.**

Create `supabase/migrations/20260803090000_engineering_entities.sql`:

```sql
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
```

- [x] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: every migration applies, exit `0`.

- [x] **Step 3: Write the failing pgTAP test.**

Create `supabase/tests/database/040_engineering_identity.test.sql`:

```sql
begin;
select plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000401', 'authenticated', 'authenticated', 'eng.platform@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000401';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000401', 'ENG-A', 'Engineering A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000401');

-- Stable tables
select has_table('public', 'isometrics', 'isometrics table exists');
select has_table('public', 'spools', 'spools table exists');
select has_table('public', 'weld_joints', 'weld_joints table exists');
select has_table('public', 'supports', 'supports table exists');
select has_table('public', 'flange_joints', 'flange_joints table exists');

-- Revision tables
select has_table('public', 'isometric_revisions', 'isometric_revisions table exists');
select has_table('public', 'spool_revisions', 'spool_revisions table exists');
select has_table('public', 'weld_joint_revisions', 'weld_joint_revisions table exists');
select has_table('public', 'weld_points', 'weld_points table exists');
select has_table('public', 'support_revisions', 'support_revisions table exists');
select has_table('public', 'flange_joint_revisions', 'flange_joint_revisions table exists');
select has_table('public', 'spool_revision_materials', 'spool_revision_materials table exists');

-- Track 02 already owns Assembly ownership in the PDS mapping; assert, do not rebuild.
select has_column('public', 'project_pds_areas', 'assembly_subcontractor_id',
  'PDS areas carry assembly ownership from Track 02');
select is(
  (select count(*)::int from information_schema.check_constraints
   where constraint_name = 'nde_matrix_rules_weld_location_check'
     and check_clause like '%assembly%'),
  1,
  'nde_matrix_rules accepts the assembly weld location'
);

-- Business identity is unique per project
insert into public.isometrics (project_id, iso_number)
values ('30000000-0000-0000-0000-000000000401', 'ISO-0401');

select throws_ok(
  $$insert into public.isometrics (project_id, iso_number)
    values ('30000000-0000-0000-0000-000000000401', 'ISO-0401')$$,
  '23505',
  null,
  'a project cannot hold two isometrics with the same number'
);

-- Exactly one accepted revision per isometric
insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
select id, 'R0', 1, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401';

select throws_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
    select id, 'R1', 2, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401'$$,
  '23505',
  null,
  'an isometric cannot hold two accepted revisions'
);

-- A superseded revision does not occupy the accepted slot
update public.isometric_revisions
set status = 'superseded', superseded_at = now()
where revision_number = 'R0';

select lives_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status, accepted_at)
    select id, 'R1', 2, 'accepted', now() from public.isometrics where iso_number = 'ISO-0401'$$,
  'a new revision may be accepted once the previous one is superseded'
);

select throws_ok(
  $$insert into public.isometric_revisions (isometric_id, revision_number, revision_ordinal, status)
    select id, 'R1', 3, 'draft' from public.isometrics where iso_number = 'ISO-0401'$$,
  '23505',
  null,
  'a revision number cannot repeat inside one isometric'
);

select is(
  (select count(*)::int from public.isometric_revisions where status = 'accepted'),
  1,
  'exactly one accepted revision survives'
);

select is(
  (select revision_number from public.isometric_revisions where status = 'accepted'),
  'R1',
  'the accepted revision is the newest one'
);

select * from finish();
rollback;
```

- [x] **Step 4: Run the test and watch it pass.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: `040_engineering_identity.test.sql` reports `ok 1` … `ok 20`, no failures.

If any assertion fails, fix the migration — not the test.

- [x] **Step 5: Commit.**

```bash
git add supabase/migrations/20260803090000_engineering_entities.sql supabase/tests/database/040_engineering_identity.test.sql
git commit -m "feat(engineering): add stable identity and revision definition tables"
```

---

## Task 2: Add the revision workflow tables, read-only guards, RLS and grants

**Files:**
- Create: `supabase/migrations/20260803091000_engineering_revisions.sql`
- Create: `supabase/tests/database/041_revision_workflow.test.sql`

- [x] **Step 1: Write the migration.**

Create `supabase/migrations/20260803091000_engineering_revisions.sql`:

```sql
-- Track 04: revision change history, decisions, progress-copy provenance,
-- read-only enforcement for superseded revisions, RLS and grants.

create type public.revision_change_type as enum ('new', 'revised', 'unchanged', 'removed');

create type public.revision_decision as enum (
  'not_done', 'cancelled', 'done_without_modification', 'rework'
);

create table public.revision_change_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  isometric_id uuid not null references public.isometrics(id) on delete restrict,
  isometric_revision_id uuid not null
    references public.isometric_revisions(id) on delete cascade,
  previous_isometric_revision_id uuid references public.isometric_revisions(id) on delete set null,
  entity_type public.engineering_entity_type not null,
  entity_id uuid not null,
  entity_key text not null,
  change_type public.revision_change_type not null,
  previous_payload jsonb,
  next_payload jsonb,
  source_import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (isometric_revision_id, entity_type, entity_id)
);

create index revision_change_items_project_idx
  on public.revision_change_items (project_id, created_at desc);

create table public.revision_decisions (
  id uuid primary key default gen_random_uuid(),
  change_item_id uuid not null
    references public.revision_change_items(id) on delete cascade,
  decision public.revision_decision not null,
  comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default timezone('utc', now()),
  unique (change_item_id)
);

-- Plan section 3.8: this is a provenance ledger, not a copy of progress rows.
-- Track 05 reads it to decide which progress it may materialize on the new revision.
create table public.revision_progress_copies (
  id uuid primary key default gen_random_uuid(),
  change_item_id uuid not null
    references public.revision_change_items(id) on delete cascade,
  source_spool_revision_id uuid not null
    references public.spool_revisions(id) on delete restrict,
  target_spool_revision_id uuid not null
    references public.spool_revisions(id) on delete cascade,
  progress_kind text not null
    check (progress_kind in ('fabrication_start', 'sent_to_paint', 'paint')),
  copied_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(copied_payload) = 'object'),
  copied_by uuid references public.profiles(id) on delete set null,
  copied_at timestamptz not null default timezone('utc', now()),
  unique (change_item_id, progress_kind)
);

-- Read-only enforcement -------------------------------------------------------

create or replace function public.assert_revision_mutable()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owning_status public.revision_status;
begin
  if tg_table_name = 'isometric_revisions' then
    owning_status := old.status;
  elsif tg_table_name = 'spool_revisions' then
    select rev.status into owning_status
    from public.isometric_revisions rev
    where rev.id = old.isometric_revision_id;
  elsif tg_table_name = 'spool_revision_materials' then
    select rev.status into owning_status
    from public.spool_revisions sr
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = old.spool_revision_id;
  elsif tg_table_name in ('weld_joint_revisions', 'support_revisions', 'flange_joint_revisions') then
    select rev.status into owning_status
    from public.spool_revisions sr
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where sr.id = old.spool_revision_id;
  elsif tg_table_name = 'weld_points' then
    select rev.status into owning_status
    from public.weld_joint_revisions wjr
    join public.spool_revisions sr on sr.id = wjr.spool_revision_id
    join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
    where wjr.id = old.weld_joint_revision_id;
  end if;

  if owning_status = 'superseded' then
    raise exception 'A superseded revision is read-only' using errcode = 'PQC21';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- isometric_revisions is exempt from the UPDATE guard on the transition into
-- 'superseded' itself: the trigger reads OLD.status, which is still 'accepted' then.
create trigger isometric_revisions_read_only
  before update or delete on public.isometric_revisions
  for each row execute function public.assert_revision_mutable();

create trigger spool_revisions_read_only
  before update or delete on public.spool_revisions
  for each row execute function public.assert_revision_mutable();

create trigger weld_joint_revisions_read_only
  before update or delete on public.weld_joint_revisions
  for each row execute function public.assert_revision_mutable();

create trigger weld_points_read_only
  before update or delete on public.weld_points
  for each row execute function public.assert_revision_mutable();

create trigger support_revisions_read_only
  before update or delete on public.support_revisions
  for each row execute function public.assert_revision_mutable();

create trigger flange_joint_revisions_read_only
  before update or delete on public.flange_joint_revisions
  for each row execute function public.assert_revision_mutable();

create trigger spool_revision_materials_read_only
  before update or delete on public.spool_revision_materials
  for each row execute function public.assert_revision_mutable();

-- Project resolution helper for RLS on revision-side tables --------------------

create or replace function public.isometric_revision_project_id(revision_id uuid)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.isometric_revisions rev
  join public.isometrics iso on iso.id = rev.isometric_id
  where rev.id = revision_id;
$$;

create or replace function public.spool_revision_project_id(spool_revision_id uuid)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select iso.project_id
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = spool_revision_id;
$$;

revoke all on function
  public.isometric_revision_project_id(uuid),
  public.spool_revision_project_id(uuid)
from public, anon;

grant execute on function
  public.isometric_revision_project_id(uuid),
  public.spool_revision_project_id(uuid)
to authenticated;

-- RLS -------------------------------------------------------------------------

alter table public.isometrics enable row level security;
alter table public.spools enable row level security;
alter table public.weld_joints enable row level security;
alter table public.supports enable row level security;
alter table public.flange_joints enable row level security;
alter table public.isometric_revisions enable row level security;
alter table public.spool_revisions enable row level security;
alter table public.weld_joint_revisions enable row level security;
alter table public.weld_points enable row level security;
alter table public.support_revisions enable row level security;
alter table public.flange_joint_revisions enable row level security;
alter table public.spool_revision_materials enable row level security;
alter table public.revision_change_items enable row level security;
alter table public.revision_decisions enable row level security;
alter table public.revision_progress_copies enable row level security;

create policy "read isometrics" on public.isometrics
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read spools" on public.spools
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read weld joints" on public.weld_joints
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read supports" on public.supports
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read flange joints" on public.flange_joints
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read isometric revisions" on public.isometric_revisions
  for select to authenticated
  using (
    exists (
      select 1 from public.isometrics iso
      where iso.id = isometric_revisions.isometric_id
        and public.current_user_has_capability(iso.project_id, 'spooling.view')
    )
  );

create policy "read spool revisions" on public.spool_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.isometric_revision_project_id(spool_revisions.isometric_revision_id),
      'spooling.view')
  );

create policy "read weld joint revisions" on public.weld_joint_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(weld_joint_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read weld points" on public.weld_points
  for select to authenticated
  using (
    exists (
      select 1 from public.weld_joint_revisions wjr
      where wjr.id = weld_points.weld_joint_revision_id
        and public.current_user_has_capability(
          public.spool_revision_project_id(wjr.spool_revision_id), 'spooling.view')
    )
  );

create policy "read support revisions" on public.support_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(support_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read flange joint revisions" on public.flange_joint_revisions
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(flange_joint_revisions.spool_revision_id),
      'spooling.view')
  );

create policy "read spool revision materials" on public.spool_revision_materials
  for select to authenticated
  using (
    public.current_user_has_capability(
      public.spool_revision_project_id(spool_revision_materials.spool_revision_id),
      'spooling.view')
  );

create policy "read revision change items" on public.revision_change_items
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'spooling.view'));

create policy "read revision decisions" on public.revision_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.revision_change_items item
      where item.id = revision_decisions.change_item_id
        and public.current_user_has_capability(item.project_id, 'spooling.view')
    )
  );

create policy "read revision progress copies" on public.revision_progress_copies
  for select to authenticated
  using (
    exists (
      select 1 from public.revision_change_items item
      where item.id = revision_progress_copies.change_item_id
        and public.current_user_has_capability(item.project_id, 'spooling.view')
    )
  );

-- Grants: authenticated reads, never writes. Every mutation is a SECURITY DEFINER RPC.

grant select on
  public.isometrics,
  public.spools,
  public.weld_joints,
  public.supports,
  public.flange_joints,
  public.isometric_revisions,
  public.spool_revisions,
  public.weld_joint_revisions,
  public.weld_points,
  public.support_revisions,
  public.flange_joint_revisions,
  public.spool_revision_materials,
  public.revision_change_items,
  public.revision_decisions,
  public.revision_progress_copies
to authenticated;

revoke insert, update, delete, truncate on
  public.isometrics,
  public.spools,
  public.weld_joints,
  public.supports,
  public.flange_joints,
  public.isometric_revisions,
  public.spool_revisions,
  public.weld_joint_revisions,
  public.weld_points,
  public.support_revisions,
  public.flange_joint_revisions,
  public.spool_revision_materials,
  public.revision_change_items,
  public.revision_decisions,
  public.revision_progress_copies
from authenticated, anon;
```

- [x] **Step 2: Write the failing pgTAP test.**

Create `supabase/tests/database/041_revision_workflow.test.sql`:

```sql
begin;
select plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000411', 'authenticated', 'authenticated', 'rev.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000412', 'authenticated', 'authenticated', 'rev.admin.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000413', 'authenticated', 'authenticated', 'rev.admin.b@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000411';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000411', 'REV-A', 'Revision A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000411'),
  ('30000000-0000-0000-0000-000000000412', 'REV-B', 'Revision B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000411');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', '10000000-0000-0000-0000-000000000412', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000412', '30000000-0000-0000-0000-000000000412', '10000000-0000-0000-0000-000000000413', 'system_admin', 'project_admin', true);

-- Definition graph for project A
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', 'ISO-0411');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000411', '30000000-0000-0000-0000-000000000411', 'SP-0411-A');

insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, accepted_at)
values ('42000000-0000-0000-0000-000000000411', '40000000-0000-0000-0000-000000000411', 'R0', 1, 'accepted', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('43000000-0000-0000-0000-000000000411', '41000000-0000-0000-0000-000000000411', '42000000-0000-0000-0000-000000000411', 1);

select has_table('public', 'revision_change_items', 'revision_change_items table exists');
select has_table('public', 'revision_decisions', 'revision_decisions table exists');
select has_table('public', 'revision_progress_copies', 'revision_progress_copies table exists');

select is(relrowsecurity, true, 'isometric_revisions has RLS')
from pg_class where oid = 'public.isometric_revisions'::regclass;
select is(relrowsecurity, true, 'revision_change_items has RLS')
from pg_class where oid = 'public.revision_change_items'::regclass;

select is(
  has_table_privilege('authenticated', 'public.isometric_revisions', 'INSERT'),
  false,
  'authenticated cannot insert revisions directly'
);
select is(
  has_table_privilege('authenticated', 'public.spool_revisions', 'UPDATE'),
  false,
  'authenticated cannot update spool revisions directly'
);
select is(
  has_table_privilege('authenticated', 'public.revision_decisions', 'DELETE'),
  false,
  'authenticated cannot delete revision decisions directly'
);

-- An accepted revision is still editable by the owning command
select lives_ok(
  $$update public.spool_revisions set weight_kg = 120.5
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'an accepted revision may still be completed by the owning transaction'
);

-- Supersede, then prove immutability
update public.isometric_revisions
set status = 'superseded', superseded_at = now()
where id = '42000000-0000-0000-0000-000000000411';

select throws_ok(
  $$update public.spool_revisions set weight_kg = 999
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded spool revision cannot be updated'
);

select throws_ok(
  $$delete from public.spool_revisions
    where id = '43000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded spool revision cannot be deleted'
);

select throws_ok(
  $$update public.isometric_revisions set comment = 'edited'
    where id = '42000000-0000-0000-0000-000000000411'$$,
  'PQC21',
  null,
  'a superseded isometric revision cannot be edited'
);

-- Cross-project read isolation
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000413', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000413","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.isometrics),
  0,
  'project B admin sees no project A isometrics'
);
select is(
  (select count(*)::int from public.isometric_revisions),
  0,
  'project B admin sees no project A revisions'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000412', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000412","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.isometrics),
  1,
  'project A admin sees the project A isometric'
);
select is(
  (select count(*)::int from public.spool_revisions),
  1,
  'project A admin sees the project A spool revision'
);

select * from finish();
rollback;
```

- [x] **Step 3: Run the tests.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `040` and `041` both pass, no failures anywhere.

- [x] **Step 4: Commit.**

```bash
git add supabase/migrations/20260803091000_engineering_revisions.sql supabase/tests/database/041_revision_workflow.test.sql
git commit -m "feat(engineering): add revision change history, read-only guards and RLS"
```

---

## Task 3: Extend the import platform for multi-file spooling jobs

**Files:**
- Create: `supabase/migrations/20260803092000_spooling_import_apply.sql` (first half)

This task adds only the tables and the job-creation surface. The validation, preview and apply
functions are appended to the **same file** by Tasks 6–9; do not create a second migration for them.

- [x] **Step 1: Write the first half of the migration.**

Create `supabase/migrations/20260803092000_spooling_import_apply.sql`:

```sql
-- Track 04: SpoolGen multi-file import on top of the Track 03 import platform.

create type public.spoolgen_file_role as enum ('weld', 'trace', 'bolt', 'supp');

-- Roadmap 9.3 names import_files. Track 03 kept one file per job on import_jobs
-- because every type it handled was a single workbook; SpoolGen needs up to four.
create table public.import_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  file_role public.spoolgen_file_role not null,
  file_name text not null check (length(trim(file_name)) > 0),
  media_type text,
  -- Dossier 14.3: 4 MB per file. Enforced here, in the bucket, and in the browser.
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 4194304),
  checksum text,
  storage_path text,
  uploaded_at timestamptz not null default timezone('utc', now()),
  unique (job_id, file_role)
);

create index import_files_job_idx on public.import_files (job_id);

-- Decisions taken before apply are keyed by business numbers, because the revision
-- rows they will govern do not exist until apply runs.
create table public.import_revision_decisions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  iso_number text not null,
  entity_type public.engineering_entity_type not null,
  entity_key text not null,
  decision public.revision_decision not null,
  comment text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default timezone('utc', now()),
  unique (job_id, entity_type, entity_key)
);

create index import_revision_decisions_job_idx
  on public.import_revision_decisions (job_id, iso_number);

alter table public.import_jobs
  drop constraint if exists import_jobs_import_type_check;

alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list',
    'welding_procedure',
    'welder_qualification',
    'thickness_flange',
    'nde_matrix',
    'spooling_definition'
  ));

alter table public.import_files enable row level security;
alter table public.import_revision_decisions enable row level security;

create policy "read import files" on public.import_files
  for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_files.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

create policy "read import revision decisions" on public.import_revision_decisions
  for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_revision_decisions.job_id
        and public.current_user_has_capability(job.project_id, 'spooling.view')
    )
  );

grant select on public.import_files, public.import_revision_decisions to authenticated;
revoke insert, update, delete, truncate
  on public.import_files, public.import_revision_decisions
  from authenticated, anon;

-- Job creation and file registration ------------------------------------------

create or replace function public.create_spooling_import_job(
  target_project_id uuid,
  job_comment text default null
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if not public.current_user_has_capability(target_project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by, failure_reason
  )
  values (
    target_project_id, 'spooling_definition', 'spooling_definition', 'draft', auth.uid(), null
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_spooling_import_job',
    null,
    to_jsonb(created_job) || jsonb_build_object('comment', job_comment)
  );

  return created_job;
end;
$$;

create or replace function public.register_spooling_import_file(
  target_job_id uuid,
  role public.spoolgen_file_role,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text,
  object_path text
)
returns public.import_files
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  registered public.import_files;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job does not accept SpoolGen files' using errcode = 'PQC24';
  end if;
  if job.status not in ('draft', 'uploaded') then
    raise exception 'Files can only be attached before validation' using errcode = 'PQC24';
  end if;
  if coalesce(size_bytes, 0) <= 0 or size_bytes > 4194304 then
    raise exception 'A SpoolGen file must be between 1 byte and 4 MB' using errcode = '23514';
  end if;

  insert into public.import_files (
    job_id, file_role, file_name, media_type, size_bytes, checksum, storage_path
  )
  values (
    target_job_id, role, trim(file_name), media_type, size_bytes, checksum, object_path
  )
  on conflict (job_id, file_role) do update
    set file_name = excluded.file_name,
        media_type = excluded.media_type,
        size_bytes = excluded.size_bytes,
        checksum = excluded.checksum,
        storage_path = excluded.storage_path,
        uploaded_at = timezone('utc', now())
  returning * into registered;

  update public.import_jobs
  set status = 'uploaded',
      source_file_name = coalesce(job.source_file_name, trim(file_name)),
      source_media_type = coalesce(job.source_media_type, media_type)
  where id = target_job_id;

  return registered;
end;
$$;

revoke all on function
  public.create_spooling_import_job(uuid, text),
  public.register_spooling_import_file(uuid, public.spoolgen_file_role, text, text, bigint, text, text)
from public, anon;

grant execute on function
  public.create_spooling_import_job(uuid, text),
  public.register_spooling_import_file(uuid, public.spoolgen_file_role, text, text, bigint, text, text)
to authenticated;
```

- [x] **Step 2: Apply and smoke-test manually.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: exit `0`.

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: `040` and `041` still pass. No new test file yet — Task 12 covers this migration.

- [x] **Step 3: Verify the 4 MB constraint exists.**

Run:
```bash
grep -c "4194304" supabase/migrations/20260803092000_spooling_import_apply.sql
```
Expected: `2` — one in the table constraint, one in the RPC guard.

- [x] **Step 4: Commit.**

```bash
git add supabase/migrations/20260803092000_spooling_import_apply.sql
git commit -m "feat(engineering): add multi-file SpoolGen import job surface"
```

---

## Task 4: Create the private SpoolGen storage bucket and policies

**Files:**
- Create: `supabase/migrations/20260803094000_spooling_storage_policies.sql`
- Create: `supabase/tests/database/043_spooling_storage_policies.test.sql`

- [x] **Step 1: Write the migration.**

Create `supabase/migrations/20260803094000_spooling_storage_policies.sql`:

```sql
-- Track 04: private bucket for SpoolGen .txt files.
-- Path contract: <project_id>/<import_job_id>/<file_role>.txt
-- Segment 1 is resolved by storage_path_project_id(), which returns null instead of
-- raising when another bucket's path is not a uuid.

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-spooling',
  'project-spooling',
  false,
  4194304,
  array['text/plain', 'text/csv', 'text/tab-separated-values', 'application/octet-stream']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Read project spooling objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.view')
  );

create policy "Insert project spooling objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );

create policy "Update project spooling objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  )
  with check (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );

create policy "Delete project spooling objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-spooling'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'spooling.manage')
  );
```

- [x] **Step 2: Write the failing pgTAP test.**

Create `supabase/tests/database/043_spooling_storage_policies.test.sql`:

```sql
begin;
select plan(7);

select is(
  (select public from storage.buckets where id = 'project-spooling'),
  false,
  'the spooling bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'project-spooling'),
  4194304::bigint,
  'the spooling bucket enforces the 4 MB dossier limit'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like '%project spooling objects%'),
  4,
  'the spooling bucket has exactly four policies'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like '%project spooling objects%'
     and roles::text not like '%authenticated%'),
  0,
  'every spooling storage policy is scoped to authenticated'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and roles::text like '%{public}%'),
  0,
  'no storage policy applies to PUBLIC'
);

-- The helper must tolerate a non-uuid first segment from any other bucket.
select is(
  public.storage_path_project_id('not-a-uuid/some/file.txt'),
  null,
  'a non-uuid path segment resolves to null rather than raising'
);

select is(
  public.storage_path_project_id('30000000-0000-0000-0000-000000000401/job/weld.txt'),
  '30000000-0000-0000-0000-000000000401'::uuid,
  'a uuid path segment resolves to the project id'
);

select * from finish();
rollback;
```

- [x] **Step 3: Run the tests.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `043` reports `ok 1` … `ok 7`.

- [x] **Step 4: Commit.**

```bash
git add supabase/migrations/20260803094000_spooling_storage_policies.sql supabase/tests/database/043_spooling_storage_policies.test.sql
git commit -m "feat(engineering): add private project-spooling bucket and policies"
```

---

## Task 5: Regenerate database types

**Files:**
- Modify: `lib/supabase/database.types.ts`

- [x] **Step 1: Regenerate.**

Run:
```bash
/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

- [x] **Step 2: Verify the new surface exists.**

Run:
```bash
grep -c "isometric_revisions\|spool_revisions\|import_files\|revision_change_items" lib/supabase/database.types.ts
```
Expected: a number `>= 4`.

- [x] **Step 3: Typecheck.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`.

- [x] **Step 4: Commit.**

```bash
git add lib/supabase/database.types.ts
git commit -m "chore(engineering): regenerate database types for engineering schema"
```

### Checkpoint 1 — Gate A complete

- [x] Run `npm run verify`. Expected: exit `0`, 16 pgTAP files pass.
- [x] Report to the reviewer: the pgTAP file and assertion counts, and confirmation that
      `supabase db reset` was used so the migrations were proven from empty.

---
