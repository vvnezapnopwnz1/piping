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

# Gate B — Validation, preview, decisions and apply

Tasks 6–9 all append to `supabase/migrations/20260803092000_spooling_import_apply.sql`, in order.
Append; never rewrite the earlier half.

## Task 6: Add the staging helpers and record the validation

**Files:**
- Modify: `supabase/migrations/20260803092000_spooling_import_apply.sql` (append)

- [x] **Step 1: Append the helpers and the validation RPC.**

```sql
-- Staging helpers ------------------------------------------------------------

-- A cast that returns null instead of raising. The browser parser already flags
-- non-numeric cells as blockers; the server must survive them regardless.
create or replace function public.engineering_numeric(value text)
returns numeric
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return value::numeric;
exception
  when others then
    return null;
end;
$$;

-- Numbers are compared as trimmed text so 120.5 and 120.500 do not read as a change.
create or replace function public.engineering_numeric_key(value numeric)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(trim_scale(round(value, 3))::text, '');
$$;

create or replace function public.spooling_staging(target_job_id uuid)
returns table (
  staging_row_number integer,
  entity_kind text,
  entity_values jsonb
)
language sql
stable
set search_path = public, pg_temp
as $$
  select r.row_number,
         r.normalized_values ->> 'entity_type',
         r.normalized_values
  from public.import_job_rows r
  where r.job_id = target_job_id
    and r.action <> 'skip'
  order by r.row_number;
$$;

revoke all on function
  public.engineering_numeric(text),
  public.engineering_numeric_key(numeric),
  public.spooling_staging(uuid)
from public, anon;

grant execute on function
  public.engineering_numeric(text),
  public.engineering_numeric_key(numeric),
  public.spooling_staging(uuid)
to authenticated;

-- Validation ------------------------------------------------------------------

-- Mirrors record_import_validation, with two differences: the capability is
-- spooling.manage, and a job without a weld file cannot be validated at all.
create or replace function public.record_spooling_validation(
  target_job_id uuid,
  parsed_rows jsonb,
  parsed_issues jsonb
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job is not a SpoolGen import' using errcode = 'PQC24';
  end if;
  if job.status not in ('uploaded', 'validating', 'validated') then
    raise exception 'This import cannot be validated in its current state' using errcode = 'PQC24';
  end if;
  if not exists (
    select 1 from public.import_files
    where job_id = target_job_id and file_role = 'weld'
  ) then
    raise exception 'weld.txt is required before validation' using errcode = 'PQC25';
  end if;

  delete from public.import_job_rows where job_id = target_job_id;
  delete from public.import_job_issues where job_id = target_job_id;
  -- Re-validating invalidates every decision: the diff the user judged is gone.
  delete from public.import_revision_decisions where job_id = target_job_id;

  insert into public.import_job_rows (job_id, row_number, raw_values, normalized_values, action)
  select
    target_job_id,
    (entry ->> 'row_number')::integer,
    coalesce(entry -> 'raw_values', '{}'::jsonb),
    coalesce(entry -> 'normalized_values', '{}'::jsonb),
    coalesce(entry ->> 'action', 'create')
  from jsonb_array_elements(coalesce(parsed_rows, '[]'::jsonb)) as entry;

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select
    target_job_id,
    nullif(entry ->> 'row_number', '')::integer,
    nullif(entry ->> 'column_name', ''),
    (entry ->> 'severity')::public.import_issue_severity,
    entry ->> 'code',
    entry ->> 'message'
  from jsonb_array_elements(coalesce(parsed_issues, '[]'::jsonb)) as entry;

  update public.import_jobs
  set status = 'validated',
      validated_at = timezone('utc', now()),
      conflicts_confirmed = false
  where id = target_job_id
  returning * into job;

  -- Server-side issues are derived immediately so the preview the user sees is the
  -- same set apply will enforce.
  perform public.revalidate_spooling_import_job(target_job_id);

  return job;
end;
$$;

revoke all on function public.record_spooling_validation(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.record_spooling_validation(uuid, jsonb, jsonb) to authenticated;
```

`record_spooling_validation` calls `revalidate_spooling_import_job`, which Task 8 creates. The
migration will not apply until Task 8 is done — that is expected, because PostgreSQL resolves
function bodies at call time, not at creation time. Step 2 proves the file still applies.

- [ ] **Step 2: Apply the migration.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: exit `0`. The forward reference does not break `create function`.

- [ ] **Step 3: Commit.**

```bash
git add supabase/migrations/20260803092000_spooling_import_apply.sql
git commit -m "feat(engineering): record SpoolGen validation into import staging"
```

---

## Task 7: Add the read-only import preview

**Files:**
- Modify: `supabase/migrations/20260803092000_spooling_import_apply.sql` (append)

The preview computes the new/revised/unchanged/removed diff **without writing anything**. It is
the single source of the change-type rule; apply reuses the same function so the user can never be
shown one diff and get another.

- [x] **Step 1: Append the preview function.**

```sql
-- Preview ---------------------------------------------------------------------

create or replace function public.preview_spooling_import(target_job_id uuid)
returns table (
  iso_number text,
  entity_type public.engineering_entity_type,
  entity_key text,
  change_type public.revision_change_type,
  requires_decision boolean,
  decision public.revision_decision,
  previous_payload jsonb,
  next_payload jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  return query
  with staged as (
    select s.entity_kind, s.entity_values from public.spooling_staging(target_job_id) s
  ),
  -- The accepted revision of every ISO named by the file set, if there is one.
  previous_revision as (
    select distinct on (iso.iso_number)
      iso.iso_number,
      rev.id as revision_id
    from staged st
    join public.isometrics iso
      on iso.project_id = job.project_id
     and iso.iso_number = st.entity_values ->> 'iso_number'
    join public.isometric_revisions rev
      on rev.isometric_id = iso.id and rev.status = 'accepted'
  ),
  staged_spool as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'spool_number' as entity_key,
      jsonb_build_object(
        'sequence_number', coalesce(st.entity_values ->> 'sequence_number', '1'),
        'weight_kg', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'weight_kg')),
        'material_class', coalesce(st.entity_values ->> 'material_class', '')
      ) as payload
    from staged st where st.entity_kind = 'spool'
  ),
  previous_spool as (
    select
      pr.iso_number,
      sp.spool_number as entity_key,
      jsonb_build_object(
        'sequence_number', sr.sequence_number::text,
        'weight_kg', public.engineering_numeric_key(sr.weight_kg),
        'material_class', coalesce(sr.material_class, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    where sr.is_removed = false
  ),
  staged_weld as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'weld_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'weld_type', coalesce(st.entity_values ->> 'weld_type', ''),
        'weld_location', coalesce(st.entity_values ->> 'weld_location', 'shop'),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'thickness_mm', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'thickness_mm'))
      ) as payload
    from staged st where st.entity_kind = 'weld_joint'
  ),
  previous_weld as (
    select
      pr.iso_number,
      wj.weld_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'weld_type', coalesce(wt.code, ''),
        'weld_location', wjr.weld_location,
        'diameter_inch', public.engineering_numeric_key(wjr.diameter_inch),
        'thickness_mm', public.engineering_numeric_key(wjr.thickness_mm)
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.weld_joint_revisions wjr on wjr.spool_revision_id = sr.id
    join public.weld_joints wj on wj.id = wjr.weld_joint_id
    left join public.project_weld_types wt on wt.id = wjr.weld_type_id
    where wjr.is_removed = false
  ),
  staged_support as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'support_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'support_type', coalesce(st.entity_values ->> 'support_type', ''),
        'quantity', coalesce(st.entity_values ->> 'quantity', '1')
      ) as payload
    from staged st where st.entity_kind = 'support'
  ),
  previous_support as (
    select
      pr.iso_number,
      su.support_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'support_type', coalesce(supr.support_type, ''),
        'quantity', supr.quantity::text
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.support_revisions supr on supr.spool_revision_id = sr.id
    join public.supports su on su.id = supr.support_id
    where supr.is_removed = false
  ),
  staged_flange as (
    select
      st.entity_values ->> 'iso_number' as iso_number,
      st.entity_values ->> 'flange_number' as entity_key,
      jsonb_build_object(
        'spool_number', coalesce(st.entity_values ->> 'spool_number', ''),
        'flange_rating', coalesce(st.entity_values ->> 'flange_rating', ''),
        'diameter_inch', public.engineering_numeric_key(
          public.engineering_numeric(st.entity_values ->> 'diameter_inch')),
        'bolt_size', coalesce(st.entity_values ->> 'bolt_size', ''),
        'bolt_quantity', coalesce(st.entity_values ->> 'bolt_quantity', ''),
        'joint_type', coalesce(st.entity_values ->> 'joint_type', '')
      ) as payload
    from staged st where st.entity_kind = 'flange_joint'
  ),
  previous_flange as (
    select
      pr.iso_number,
      fj.flange_number as entity_key,
      jsonb_build_object(
        'spool_number', sp.spool_number,
        'flange_rating', coalesce(fjr.flange_rating, ''),
        'diameter_inch', public.engineering_numeric_key(fjr.diameter_inch),
        'bolt_size', coalesce(fjr.bolt_size, ''),
        'bolt_quantity', coalesce(fjr.bolt_quantity::text, ''),
        'joint_type', coalesce(fjr.joint_type, '')
      ) as payload
    from previous_revision pr
    join public.spool_revisions sr on sr.isometric_revision_id = pr.revision_id
    join public.spools sp on sp.id = sr.spool_id
    join public.flange_joint_revisions fjr on fjr.spool_revision_id = sr.id
    join public.flange_joints fj on fj.id = fjr.flange_joint_id
    where fjr.is_removed = false
  ),
  combined as (
    select 'spool'::public.engineering_entity_type as et,
           coalesce(s.iso_number, p.iso_number) as iso_number,
           coalesce(s.entity_key, p.entity_key) as entity_key,
           p.payload as previous_payload, s.payload as next_payload
    from staged_spool s full outer join previous_spool p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'weld_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_weld s full outer join previous_weld p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'support', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_support s full outer join previous_support p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
    union all
    select 'flange_joint', coalesce(s.iso_number, p.iso_number),
           coalesce(s.entity_key, p.entity_key), p.payload, s.payload
    from staged_flange s full outer join previous_flange p
      on p.iso_number = s.iso_number and p.entity_key = s.entity_key
  ),
  typed as (
    select
      c.iso_number,
      c.et,
      c.entity_key,
      case
        when c.previous_payload is null then 'new'
        when c.next_payload is null then 'removed'
        when c.previous_payload = c.next_payload then 'unchanged'
        else 'revised'
      end::public.revision_change_type as change_type,
      c.previous_payload,
      c.next_payload,
      exists (select 1 from previous_revision pr where pr.iso_number = c.iso_number) as iso_is_revised
    from combined c
  ),
  spool_decision as (
    select d.entity_key, d.decision
    from public.import_revision_decisions d
    where d.job_id = target_job_id and d.entity_type = 'spool'
  )
  select
    t.iso_number,
    t.et,
    t.entity_key,
    t.change_type,
    case
      -- Dossier 15.2: every spool of a revised ISO needs a decision.
      when t.et = 'spool' then t.iso_is_revised
      -- Dossier 15.3: a weld needs its own decision only inside a rework spool.
      when t.et = 'weld_joint' then t.iso_is_revised and exists (
        select 1 from spool_decision sd
        where sd.decision = 'rework'
          and sd.entity_key = coalesce(
            t.next_payload ->> 'spool_number', t.previous_payload ->> 'spool_number')
      )
      else false
    end as requires_decision,
    (select d.decision from public.import_revision_decisions d
     where d.job_id = target_job_id and d.entity_type = t.et and d.entity_key = t.entity_key),
    t.previous_payload,
    t.next_payload
  from typed t
  order by t.iso_number, t.et, t.entity_key;
end;
$$;

revoke all on function public.preview_spooling_import(uuid) from public, anon;
grant execute on function public.preview_spooling_import(uuid) to authenticated;
```

- [ ] **Step 2: Apply the migration.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: exit `0`.

- [ ] **Step 3: Confirm the function is read-only.**

Run:
```bash
grep -n "insert into\|update public\|delete from" supabase/migrations/20260803092000_spooling_import_apply.sql | sed -n '/preview_spooling_import/,$p'
```
Expected: no write statement between `create or replace function public.preview_spooling_import`
and its closing `$$;`. Read the region if the grep is ambiguous — the point is that preview writes
nothing.

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations/20260803092000_spooling_import_apply.sql
git commit -m "feat(engineering): add read-only SpoolGen import preview"
```

---

## Task 8: Add server-side revalidation and decision recording

**Files:**
- Modify: `supabase/migrations/20260803092000_spooling_import_apply.sql` (append)

This is the authority function. Whatever the browser submitted, these checks decide whether the
import may be applied.

- [x] **Step 1: Append the revalidation function.**

```sql
-- Server-side authority --------------------------------------------------------

-- Deletes and re-derives every SRV_ issue. Client-submitted issues keep their own
-- codes and are left alone: they are advisory, this function is authoritative.
create or replace function public.revalidate_spooling_import_job(target_job_id uuid)
returns table (blocker_count integer, warning_count integer, unresolved_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.view') then
    raise exception 'Spooling view capability is required' using errcode = '42501';
  end if;

  delete from public.import_job_issues
  where job_id = target_job_id and code like 'SRV\_%';

  -- 1. PDS area must exist (dossier 14.1, blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'pds_area', 'blocker', 'SRV_PDS_MISSING',
         format('PDS area "%s" does not exist in this project.', s.entity_values ->> 'pds_area')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'isometric'
    and not exists (
      select 1 from public.project_pds_areas a
      where a.project_id = job.project_id
        and a.code = s.entity_values ->> 'pds_area'
        and a.status = 'active'
    );

  -- 2. Service class must exist (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'service_class', 'blocker', 'SRV_SERVICE_CLASS_MISSING',
         format('Service class "%s" does not exist in this project.', s.entity_values ->> 'service_class')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'isometric'
    and not exists (
      select 1 from public.project_service_classes c
      where c.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and c.status = 'active'
    );

  -- 3. Weld type must exist (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_type', 'blocker', 'SRV_WELD_TYPE_MISSING',
         format('Weld type "%s" does not exist in this project.', s.entity_values ->> 'weld_type')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1 from public.project_weld_types t
      where t.project_id = job.project_id
        and t.code = s.entity_values ->> 'weld_type'
        and t.status = 'active'
    );

  -- 4. A thickness rule must cover service class + diameter (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'thickness_mm', 'blocker', 'SRV_THICKNESS_MISSING',
         format('No thickness rule covers service class "%s" at %s inch.',
                s.entity_values ->> 'service_class', s.entity_values ->> 'diameter_inch')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1
      from public.project_thickness_flange_rules r
      join public.project_service_classes c on c.id = r.service_class_id
      where r.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and r.diameter_inch = public.engineering_numeric(s.entity_values ->> 'diameter_inch')
        and r.status = 'active'
    );

  -- 5. An NDE matrix rule must cover class + weld type + location (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_type', 'blocker', 'SRV_NDE_MATRIX_MISSING',
         format('No NDE matrix rule covers %s / %s / %s.',
                s.entity_values ->> 'service_class',
                s.entity_values ->> 'weld_type',
                coalesce(s.entity_values ->> 'weld_location', 'shop'))
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1
      from public.nde_matrix_rules m
      join public.project_service_classes c on c.id = m.service_class_id
      join public.project_weld_types t on t.id = m.weld_type_id
      where m.project_id = job.project_id
        and c.code = s.entity_values ->> 'service_class'
        and t.code = s.entity_values ->> 'weld_type'
        and m.weld_location = coalesce(s.entity_values ->> 'weld_location', 'shop')
        and m.status = 'active'
    );

  -- 6. Covering WPS. Dossier 11.6 and 14.2: WARNING, never a blocker.
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'weld_number', 'warning', 'SRV_WPS_MISSING',
         format('No approved WPS covers weld %s at %s inch / %s mm. The import may still proceed.',
                s.entity_values ->> 'weld_number',
                s.entity_values ->> 'diameter_inch',
                s.entity_values ->> 'thickness_mm')
  from public.spooling_staging(target_job_id) s
  where s.entity_kind = 'weld_joint'
    and not exists (
      select 1 from public.project_welding_procedures wp
      where wp.project_id = job.project_id
        and wp.status = 'active'
        and public.engineering_numeric(s.entity_values ->> 'diameter_inch')
              between wp.diameter_from and wp.diameter_to
        and public.engineering_numeric(s.entity_values ->> 'thickness_mm')
              between wp.thickness_from and wp.thickness_to
    );

  -- 7. One line number and one service class per ISO (dossier 14.1, blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, null, 'line_number', 'blocker', 'SRV_ISO_MIXED_LINE',
         format('Isometric %s carries more than one line number.', grouped.iso_number)
  from (
    select s.entity_values ->> 'iso_number' as iso_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'isometric'
    group by 1
    having count(distinct coalesce(s.entity_values ->> 'line_number', '')) > 1
  ) grouped;

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, null, 'service_class', 'blocker', 'SRV_ISO_MIXED_SERVICE_CLASS',
         format('Isometric %s carries more than one service class.', grouped.iso_number)
  from (
    select s.entity_values ->> 'iso_number' as iso_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'weld_joint'
    group by 1
    having count(distinct coalesce(s.entity_values ->> 'service_class', '')) > 1
  ) grouped;

  -- 8. Cross-file consistency: no orphan spool in trace / bolt / supp (blocker).
  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select target_job_id, s.staging_row_number, 'spool_number', 'blocker', 'SRV_ORPHAN_SPOOL',
         format('Spool %s is referenced by %s data but is absent from weld.txt.',
                s.entity_values ->> 'spool_number', s.entity_kind)
  from public.spooling_staging(target_job_id) s
  where s.entity_kind in ('support', 'flange_joint', 'material')
    and not exists (
      select 1 from public.spooling_staging(target_job_id) w
      where w.entity_kind = 'spool'
        and w.entity_values ->> 'spool_number' = s.entity_values ->> 'spool_number'
        and w.entity_values ->> 'iso_number' = s.entity_values ->> 'iso_number'
    );

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'warning'),
    (select count(*)::integer from public.preview_spooling_import(target_job_id) p
     where p.requires_decision and p.decision is null);
end;
$$;

create or replace function public.record_revision_decision(
  target_job_id uuid,
  target_iso_number text,
  target_entity_type public.engineering_entity_type,
  target_entity_key text,
  chosen_decision public.revision_decision,
  decision_comment text default null
)
returns public.import_revision_decisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  recorded public.import_revision_decisions;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.status <> 'validated' then
    raise exception 'Decisions can only be recorded on a validated import' using errcode = 'PQC24';
  end if;

  insert into public.import_revision_decisions (
    job_id, iso_number, entity_type, entity_key, decision, comment, decided_by
  )
  values (
    target_job_id, target_iso_number, target_entity_type, target_entity_key,
    chosen_decision, decision_comment, auth.uid()
  )
  on conflict (job_id, entity_type, entity_key) do update
    set decision = excluded.decision,
        comment = excluded.comment,
        decided_by = excluded.decided_by,
        decided_at = timezone('utc', now())
  returning * into recorded;

  -- Changing a spool away from rework strands its weld decisions; drop them so the
  -- unresolved counter and the workbench agree.
  if target_entity_type = 'spool' and chosen_decision <> 'rework' then
    delete from public.import_revision_decisions
    where job_id = target_job_id
      and entity_type = 'weld_joint'
      and iso_number = target_iso_number;
  end if;

  return recorded;
end;
$$;

revoke all on function
  public.revalidate_spooling_import_job(uuid),
  public.record_revision_decision(uuid, text, public.engineering_entity_type, text, public.revision_decision, text)
from public, anon;

grant execute on function
  public.revalidate_spooling_import_job(uuid),
  public.record_revision_decision(uuid, text, public.engineering_entity_type, text, public.revision_decision, text)
to authenticated;
```

- [ ] **Step 2: Apply the migration.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: exit `0`.

- [ ] **Step 3: Confirm the WPS rule is a warning, not a blocker.**

Run:
```bash
grep -n "SRV_WPS_MISSING" supabase/migrations/20260803092000_spooling_import_apply.sql
```
Expected: the matching line's severity literal is `'warning'`. If it reads `'blocker'`, fix it —
dossier §14.2 is explicit and Task 12 asserts it.

- [ ] **Step 4: Commit.**

```bash
git add supabase/migrations/20260803092000_spooling_import_apply.sql
git commit -m "feat(engineering): add server-side SpoolGen revalidation and decision recording"
```

---

## Task 9: Add the atomic, single-use spooling apply

**Files:**
- Modify: `supabase/migrations/20260803092000_spooling_import_apply.sql` (append)

- [x] **Step 1: Append the apply function.**

```sql
-- Apply -----------------------------------------------------------------------

create or replace function public.apply_spooling_import_job(target_job_id uuid)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  blockers integer;
  warnings integer;
  unresolved integer;
  iso_rec record;
  spool_rec record;
  child_rec record;
  isometric_row public.isometrics;
  previous_revision_id uuid;
  new_revision_id uuid;
  next_ordinal integer;
  staged_revision_number text;
  spool_row public.spools;
  new_spool_revision_id uuid;
  previous_spool_revision_id uuid;
  spool_decision public.revision_decision;
  weld_decision public.revision_decision;
  weld_joint_row public.weld_joints;
  new_weld_revision_id uuid;
  support_row public.supports;
  flange_row public.flange_joints;
  change_item_id uuid;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  progress_kind text;
begin
  -- The row lock plus the applied_at guard is what makes double-apply impossible.
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if job.import_type <> 'spooling_definition' then
    raise exception 'This job is not a SpoolGen import' using errcode = 'PQC24';
  end if;
  if job.applied_at is not null or job.status = 'applied' then
    raise exception 'This import has already been applied' using errcode = 'PQC10';
  end if;
  if job.status <> 'validated' then
    raise exception 'The import must be validated before it can be applied' using errcode = 'PQC24';
  end if;
  if not exists (
    select 1 from public.import_files where job_id = target_job_id and file_role = 'weld'
  ) then
    raise exception 'weld.txt is required before apply' using errcode = 'PQC25';
  end if;

  select r.blocker_count, r.warning_count, r.unresolved_count
  into blockers, warnings, unresolved
  from public.revalidate_spooling_import_job(target_job_id) r;

  if blockers > 0 then
    raise exception 'The import still has blocking issues' using errcode = 'PQC26';
  end if;
  if unresolved > 0 then
    raise exception 'Every revised spool and reworked weld needs a decision' using errcode = 'PQC22';
  end if;

  for iso_rec in
    select
      s.entity_values ->> 'iso_number' as iso_number,
      s.entity_values ->> 'revision_number' as revision_number,
      s.entity_values ->> 'pds_area' as pds_area,
      s.entity_values ->> 'service_class' as service_class,
      s.entity_values ->> 'line_number' as line_number,
      s.entity_values ->> 'sheet_number' as sheet_number
    from public.spooling_staging(target_job_id) s
    where s.entity_kind = 'isometric'
    order by 1
  loop
    insert into public.isometrics (project_id, iso_number)
    values (job.project_id, iso_rec.iso_number)
    on conflict (project_id, iso_number) do update
      set updated_at = timezone('utc', now())
    returning * into isometric_row;

    select id into previous_revision_id
    from public.isometric_revisions
    where isometric_id = isometric_row.id and status = 'accepted';

    staged_revision_number := coalesce(nullif(trim(iso_rec.revision_number), ''), 'R0');

    if exists (
      select 1 from public.isometric_revisions
      where isometric_id = isometric_row.id and revision_number = staged_revision_number
    ) then
      raise exception 'Isometric % already has revision %',
        iso_rec.iso_number, staged_revision_number using errcode = 'PQC23';
    end if;

    select coalesce(max(revision_ordinal), 0) + 1 into next_ordinal
    from public.isometric_revisions where isometric_id = isometric_row.id;

    insert into public.isometric_revisions (
      isometric_id, revision_number, revision_ordinal, status,
      pds_area_id, service_class_id, line_number, sheet_number,
      source_import_job_id, created_by
    )
    values (
      isometric_row.id, staged_revision_number, next_ordinal, 'draft',
      (select id from public.project_pds_areas
        where project_id = job.project_id and code = iso_rec.pds_area),
      (select id from public.project_service_classes
        where project_id = job.project_id and code = iso_rec.service_class),
      iso_rec.line_number, iso_rec.sheet_number,
      target_job_id, auth.uid()
    )
    returning id into new_revision_id;

    affected := affected || new_revision_id;
    written := written + 1;

    -- Every spool the new revision must contain: staged spools plus, for a revised
    -- ISO, the spools of the accepted revision that the file set dropped.
    for spool_rec in
      select p.entity_key as spool_number, p.change_type, p.decision,
             p.previous_payload, p.next_payload
      from public.preview_spooling_import(target_job_id) p
      where p.entity_type = 'spool' and p.iso_number = iso_rec.iso_number
      order by p.entity_key
    loop
      spool_decision := spool_rec.decision;

      insert into public.spools (project_id, spool_number)
      values (job.project_id, spool_rec.spool_number)
      on conflict (project_id, spool_number) do update set spool_number = excluded.spool_number
      returning * into spool_row;

      select sr.id into previous_spool_revision_id
      from public.spool_revisions sr
      where sr.spool_id = spool_row.id
        and sr.isometric_revision_id = previous_revision_id;

      -- Dossier 15.2: a cancelled or dropped spool is carried as removed, so the new
      -- revision alone answers "what is in scope" without joining to history.
      insert into public.spool_revisions (
        spool_id, isometric_revision_id, sequence_number, weight_kg, material_class, is_removed
      )
      values (
        spool_row.id,
        new_revision_id,
        coalesce((spool_rec.next_payload ->> 'sequence_number')::integer, 1),
        public.engineering_numeric(spool_rec.next_payload ->> 'weight_kg'),
        nullif(spool_rec.next_payload ->> 'material_class', ''),
        spool_rec.change_type = 'removed' or spool_decision = 'cancelled'
      )
      returning id into new_spool_revision_id;

      written := written + 1;

      insert into public.revision_change_items (
        project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
        entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
        source_import_job_id
      )
      values (
        job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
        'spool', spool_row.id, spool_rec.spool_number, spool_rec.change_type,
        spool_rec.previous_payload, spool_rec.next_payload, target_job_id
      )
      returning id into change_item_id;

      if spool_decision is not null then
        insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
        select change_item_id, spool_decision, d.comment, d.decided_by
        from public.import_revision_decisions d
        where d.job_id = target_job_id and d.entity_type = 'spool'
          and d.entity_key = spool_rec.spool_number;
      end if;

      -- Plan section 3.8: authorize progress carry-over, do not fabricate progress rows.
      if previous_spool_revision_id is not null
         and spool_decision in ('done_without_modification', 'rework') then
        foreach progress_kind in array array['fabrication_start', 'sent_to_paint', 'paint']
        loop
          insert into public.revision_progress_copies (
            change_item_id, source_spool_revision_id, target_spool_revision_id,
            progress_kind, copied_by
          )
          values (
            change_item_id, previous_spool_revision_id, new_spool_revision_id,
            progress_kind, auth.uid()
          );
        end loop;
      end if;

      if spool_rec.change_type = 'removed' or spool_decision = 'cancelled' then
        continue;
      end if;

      -- Weld joints
      for child_rec in
        select p.entity_key as weld_number, p.change_type, p.decision,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'weld_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        weld_decision := child_rec.decision;

        insert into public.weld_joints (project_id, weld_number)
        values (job.project_id, child_rec.weld_number)
        on conflict (project_id, weld_number) do update set weld_number = excluded.weld_number
        returning * into weld_joint_row;

        insert into public.weld_joint_revisions (
          weld_joint_id, spool_revision_id, weld_type_id, weld_location,
          diameter_inch, thickness_mm, is_removed
        )
        values (
          weld_joint_row.id,
          new_spool_revision_id,
          (select id from public.project_weld_types
            where project_id = job.project_id
              and code = child_rec.next_payload ->> 'weld_type'),
          coalesce(nullif(child_rec.next_payload ->> 'weld_location', ''), 'shop'),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          public.engineering_numeric(child_rec.next_payload ->> 'thickness_mm'),
          child_rec.change_type = 'removed' or weld_decision = 'cancelled'
        )
        returning id into new_weld_revision_id;

        written := written + 1;

        -- Dossier 7.3: Root and Cap always exist; Heat and Fill are optional and are
        -- attached by fabrication, not by the definition.
        if child_rec.change_type <> 'removed' and coalesce(weld_decision, 'not_done') <> 'cancelled' then
          insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
          values (new_weld_revision_id, 'root', 1), (new_weld_revision_id, 'cap', 2);
        end if;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'weld_joint', weld_joint_row.id, child_rec.weld_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        )
        returning id into change_item_id;

        if weld_decision is not null then
          insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
          select change_item_id, weld_decision, d.comment, d.decided_by
          from public.import_revision_decisions d
          where d.job_id = target_job_id and d.entity_type = 'weld_joint'
            and d.entity_key = child_rec.weld_number;
        end if;
      end loop;

      -- Supports
      for child_rec in
        select p.entity_key as support_number, p.change_type,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'support'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.supports (project_id, support_number)
        values (job.project_id, child_rec.support_number)
        on conflict (project_id, support_number) do update set support_number = excluded.support_number
        returning * into support_row;

        insert into public.support_revisions (
          support_id, spool_revision_id, support_type, quantity, is_removed
        )
        values (
          support_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'support_type', ''),
          coalesce((child_rec.next_payload ->> 'quantity')::integer, 1),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'support', support_row.id, child_rec.support_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Flange joints
      for child_rec in
        select p.entity_key as flange_number, p.change_type,
               p.previous_payload, p.next_payload
        from public.preview_spooling_import(target_job_id) p
        where p.entity_type = 'flange_joint'
          and p.iso_number = iso_rec.iso_number
          and coalesce(p.next_payload ->> 'spool_number',
                       p.previous_payload ->> 'spool_number') = spool_rec.spool_number
        order by p.entity_key
      loop
        insert into public.flange_joints (project_id, flange_number)
        values (job.project_id, child_rec.flange_number)
        on conflict (project_id, flange_number) do update set flange_number = excluded.flange_number
        returning * into flange_row;

        insert into public.flange_joint_revisions (
          flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
          bolt_size, bolt_quantity, joint_type, is_removed
        )
        values (
          flange_row.id, new_spool_revision_id,
          nullif(child_rec.next_payload ->> 'flange_rating', ''),
          public.engineering_numeric(child_rec.next_payload ->> 'diameter_inch'),
          nullif(child_rec.next_payload ->> 'bolt_size', ''),
          nullif(child_rec.next_payload ->> 'bolt_quantity', '')::integer,
          nullif(child_rec.next_payload ->> 'joint_type', ''),
          child_rec.change_type = 'removed'
        );

        written := written + 1;

        insert into public.revision_change_items (
          project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
          entity_type, entity_id, entity_key, change_type, previous_payload, next_payload,
          source_import_job_id
        )
        values (
          job.project_id, isometric_row.id, new_revision_id, previous_revision_id,
          'flange_joint', flange_row.id, child_rec.flange_number, child_rec.change_type,
          child_rec.previous_payload, child_rec.next_payload, target_job_id
        );
      end loop;

      -- Materials from trace.txt
      insert into public.spool_revision_materials (
        spool_revision_id, ident_code, description, quantity, unit, trace_number
      )
      select
        new_spool_revision_id,
        s.entity_values ->> 'ident_code',
        nullif(s.entity_values ->> 'description', ''),
        public.engineering_numeric(s.entity_values ->> 'quantity'),
        nullif(s.entity_values ->> 'unit', ''),
        nullif(s.entity_values ->> 'trace_number', '')
      from public.spooling_staging(target_job_id) s
      where s.entity_kind = 'material'
        and s.entity_values ->> 'iso_number' = iso_rec.iso_number
        and s.entity_values ->> 'spool_number' = spool_rec.spool_number
      on conflict do nothing;
    end loop;

    -- Supersede first, accept second: the partial unique index allows only one
    -- accepted revision, and the read-only trigger reads OLD.status, still 'accepted'.
    if previous_revision_id is not null then
      update public.isometric_revisions
      set status = 'superseded', superseded_at = timezone('utc', now())
      where id = previous_revision_id;
    end if;

    update public.isometric_revisions
    set status = 'accepted', accepted_at = timezone('utc', now())
    where id = new_revision_id;
  end loop;

  update public.import_jobs
  set status = 'applied',
      applied_at = timezone('utc', now()),
      completed_at = timezone('utc', now()),
      applied_row_count = written,
      affected_entity_ids = affected
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'apply_spooling_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function public.apply_spooling_import_job(uuid) from public, anon;
grant execute on function public.apply_spooling_import_job(uuid) to authenticated;
```

- [ ] **Step 2: Apply the migration.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: exit `0`.

- [ ] **Step 3: Commit.**

```bash
git add supabase/migrations/20260803092000_spooling_import_apply.sql
git commit -m "feat(engineering): apply SpoolGen imports atomically into revisions"
```

---

## Task 10: Add manual revision and harden the generic import entry point

**Files:**
- Create: `supabase/migrations/20260803093000_revision_commands.sql`

- [x] **Step 1: Write the migration.**

Create `supabase/migrations/20260803093000_revision_commands.sql`:

```sql
-- Track 04: manual revision (dossier 15.5) and the guard that keeps the Track 03
-- generic import path away from spooling definitions.

-- Dossier 15.5: the same semantics without a new .txt. The accepted revision is
-- cloned, per-spool decisions are applied, and the old revision goes to history.
create or replace function public.create_manual_revision(
  target_isometric_id uuid,
  new_revision_number text,
  revision_comment text default null,
  decisions jsonb default '[]'::jsonb
)
returns public.isometric_revisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  isometric_row public.isometrics;
  previous_revision public.isometric_revisions;
  new_revision public.isometric_revisions;
  next_ordinal integer;
  spool_rec record;
  new_spool_revision_id uuid;
  spool_decision public.revision_decision;
  change_item_id uuid;
  progress_kind text;
begin
  select * into isometric_row from public.isometrics where id = target_isometric_id;
  if not found then
    raise exception 'Isometric was not found' using errcode = 'PQC20';
  end if;
  if not public.current_user_has_capability(isometric_row.project_id, 'spooling.manage') then
    raise exception 'Spooling management capability is required' using errcode = '42501';
  end if;
  if coalesce(trim(new_revision_number), '') = '' then
    raise exception 'A revision number is required' using errcode = '23514';
  end if;

  select * into previous_revision
  from public.isometric_revisions
  where isometric_id = target_isometric_id and status = 'accepted'
  for update;

  if not found then
    raise exception 'This isometric has no accepted revision to revise' using errcode = 'PQC20';
  end if;

  if exists (
    select 1 from public.isometric_revisions
    where isometric_id = target_isometric_id
      and revision_number = trim(new_revision_number)
  ) then
    raise exception 'Revision % already exists for this isometric', trim(new_revision_number)
      using errcode = 'PQC23';
  end if;

  select coalesce(max(revision_ordinal), 0) + 1 into next_ordinal
  from public.isometric_revisions where isometric_id = target_isometric_id;

  insert into public.isometric_revisions (
    isometric_id, revision_number, revision_ordinal, status,
    pds_area_id, service_class_id, line_number, sheet_number, comment, created_by
  )
  values (
    target_isometric_id, trim(new_revision_number), next_ordinal, 'draft',
    previous_revision.pds_area_id, previous_revision.service_class_id,
    previous_revision.line_number, previous_revision.sheet_number,
    revision_comment, auth.uid()
  )
  returning * into new_revision;

  for spool_rec in
    select sr.*, sp.spool_number
    from public.spool_revisions sr
    join public.spools sp on sp.id = sr.spool_id
    where sr.isometric_revision_id = previous_revision.id
    order by sp.spool_number
  loop
    select (entry ->> 'decision')::public.revision_decision into spool_decision
    from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
    where entry ->> 'entity_type' = 'spool'
      and entry ->> 'entity_key' = spool_rec.spool_number
    limit 1;

    spool_decision := coalesce(spool_decision, 'done_without_modification');

    insert into public.spool_revisions (
      spool_id, isometric_revision_id, sequence_number, weight_kg, material_class, is_removed
    )
    values (
      spool_rec.spool_id, new_revision.id, spool_rec.sequence_number,
      spool_rec.weight_kg, spool_rec.material_class,
      spool_decision = 'cancelled' or spool_rec.is_removed
    )
    returning id into new_spool_revision_id;

    insert into public.revision_change_items (
      project_id, isometric_id, isometric_revision_id, previous_isometric_revision_id,
      entity_type, entity_id, entity_key, change_type, previous_payload, next_payload
    )
    values (
      isometric_row.project_id, target_isometric_id, new_revision.id, previous_revision.id,
      'spool', spool_rec.spool_id, spool_rec.spool_number,
      case when spool_decision = 'cancelled' then 'removed'
           when spool_decision = 'done_without_modification' then 'unchanged'
           else 'revised' end,
      jsonb_build_object('spool_number', spool_rec.spool_number),
      jsonb_build_object('spool_number', spool_rec.spool_number)
    )
    returning id into change_item_id;

    insert into public.revision_decisions (change_item_id, decision, comment, decided_by)
    values (change_item_id, spool_decision, revision_comment, auth.uid());

    if spool_decision in ('done_without_modification', 'rework') then
      foreach progress_kind in array array['fabrication_start', 'sent_to_paint', 'paint']
      loop
        insert into public.revision_progress_copies (
          change_item_id, source_spool_revision_id, target_spool_revision_id,
          progress_kind, copied_by
        )
        values (change_item_id, spool_rec.id, new_spool_revision_id, progress_kind, auth.uid());
      end loop;
    end if;

    if spool_decision = 'cancelled' then
      continue;
    end if;

    insert into public.weld_joint_revisions (
      weld_joint_id, spool_revision_id, weld_type_id, weld_location,
      diameter_inch, thickness_mm, is_removed
    )
    select wjr.weld_joint_id, new_spool_revision_id, wjr.weld_type_id, wjr.weld_location,
           wjr.diameter_inch, wjr.thickness_mm, wjr.is_removed
    from public.weld_joint_revisions wjr
    where wjr.spool_revision_id = spool_rec.id;

    insert into public.weld_points (weld_joint_revision_id, point_type, sequence_number)
    select new_wjr.id, old_point.point_type, old_point.sequence_number
    from public.weld_joint_revisions new_wjr
    join public.weld_joint_revisions old_wjr
      on old_wjr.weld_joint_id = new_wjr.weld_joint_id
     and old_wjr.spool_revision_id = spool_rec.id
    join public.weld_points old_point on old_point.weld_joint_revision_id = old_wjr.id
    where new_wjr.spool_revision_id = new_spool_revision_id;

    insert into public.support_revisions (
      support_id, spool_revision_id, support_type, quantity, is_removed
    )
    select supr.support_id, new_spool_revision_id, supr.support_type, supr.quantity, supr.is_removed
    from public.support_revisions supr
    where supr.spool_revision_id = spool_rec.id;

    insert into public.flange_joint_revisions (
      flange_joint_id, spool_revision_id, flange_rating, diameter_inch,
      bolt_size, bolt_quantity, joint_type, is_removed
    )
    select fjr.flange_joint_id, new_spool_revision_id, fjr.flange_rating, fjr.diameter_inch,
           fjr.bolt_size, fjr.bolt_quantity, fjr.joint_type, fjr.is_removed
    from public.flange_joint_revisions fjr
    where fjr.spool_revision_id = spool_rec.id;

    insert into public.spool_revision_materials (
      spool_revision_id, ident_code, description, quantity, unit, trace_number
    )
    select new_spool_revision_id, m.ident_code, m.description, m.quantity, m.unit, m.trace_number
    from public.spool_revision_materials m
    where m.spool_revision_id = spool_rec.id;
  end loop;

  update public.isometric_revisions
  set status = 'superseded', superseded_at = timezone('utc', now())
  where id = previous_revision.id;

  update public.isometric_revisions
  set status = 'accepted', accepted_at = timezone('utc', now())
  where id = new_revision.id
  returning * into new_revision;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    isometric_row.project_id, auth.uid(), 'isometric_revisions', new_revision.id,
    'create_manual_revision', to_jsonb(previous_revision), to_jsonb(new_revision)
  );

  return new_revision;
end;
$$;

revoke all on function public.create_manual_revision(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_manual_revision(uuid, text, text, jsonb) to authenticated;

-- Plan section 3.10: imports.manage must not open a spooling definition job through
-- the Track 03 generic path. Replacing the function in a new migration is the
-- forward-only way to harden it.
create or replace function public.create_import_job(
  target_project_id uuid,
  requested_import_type text,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if requested_import_type = 'spooling_definition' then
    raise exception 'SpoolGen imports are created through create_spooling_import_job'
      using errcode = 'PQC24';
  end if;

  if not public.current_user_has_capability(target_project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if coalesce(trim(file_name), '') = '' then
    raise exception 'Source file name is required' using errcode = '23514';
  end if;

  if coalesce(size_bytes, 0) <= 0 then
    raise exception 'Source file size must be positive' using errcode = '23514';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by,
    source_file_name, source_media_type, source_size_bytes, source_checksum
  )
  values (
    target_project_id, requested_import_type, requested_import_type, 'draft', auth.uid(),
    trim(file_name), media_type, size_bytes, checksum
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_import_job', null, to_jsonb(created_job)
  );

  return created_job;
end;
$$;
```

- [ ] **Step 2: Apply the migration.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: exit `0`, and the Track 03 tests `030`–`032` still pass — the replaced
`create_import_job` keeps its old behaviour for every non-spooling type.

- [ ] **Step 3: Commit.**

```bash
git add supabase/migrations/20260803093000_revision_commands.sql
git commit -m "feat(engineering): add manual revision and guard the generic import path"
```

---

## Task 11: Prove the apply behaviour with pgTAP

**Files:**
- Create: `supabase/tests/database/042_spooling_apply.test.sql`

This is the most important test file in the track. It must fail for the right reason before it
passes — if any assertion passes on the first run without you having written the corresponding
code, stop and find out why.

- [x] **Step 1: Write the test.**

Create `supabase/tests/database/042_spooling_apply.test.sql`:

```sql
begin;
select plan(22);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000421', 'authenticated', 'authenticated', 'spl.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000422', 'authenticated', 'authenticated', 'spl.admin@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000423', 'authenticated', 'authenticated', 'spl.reader@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000421';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000421', 'SPL-A', 'Spooling A', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000421');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000422', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000422', '30000000-0000-0000-0000-000000000421', '10000000-0000-0000-0000-000000000423', 'qc_engineer', 'project_reader', true);

-- Referentials the validation resolves against
insert into public.project_pds_areas (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'PDS-A', 'Area A');

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
select '51000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', e.id, 'SC-A', 'Class A'
from public.system_reference_entries e where e.kind = 'material_type' limit 1;

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000421', '30000000-0000-0000-0000-000000000421', 'BW', 'Butt weld');

insert into public.project_thickness_flange_rules (project_id, service_class_id, diameter_inch, thickness_mm, flange_rating)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', 6, 8.2, '150');

insert into public.nde_matrix_rules (project_id, service_class_id, weld_type_id, weld_location, rt_coverage)
values ('30000000-0000-0000-0000-000000000421', '51000000-0000-0000-0000-000000000421', '52000000-0000-0000-0000-000000000421', 'shop', 10);

-- Act as the Project Admin for the rest of the file
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000422', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000422","role":"authenticated"}', true);

-- R0 import ------------------------------------------------------------------

select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R0 load')$$,
  'a project admin can open a SpoolGen import job'
);

create temporary table spl_job as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
order by created_at desc limit 1;

select throws_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, '[]'::jsonb)$$,
         (select id from spl_job)),
  'PQC25',
  null,
  'validation is refused while weld.txt is missing'
);

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld',
      '30000000-0000-0000-0000-000000000421/job/weld.txt')$$,
    (select id from spl_job)),
  'weld.txt can be registered'
);

select throws_ok(
  format($$select public.register_spooling_import_file(
      %L, 'trace', 'trace.txt', 'text/plain', 5000000, 'sum-trace', 'p/j/trace.txt')$$,
    (select id from spl_job)),
  '23514',
  null,
  'a file larger than 4 MB is refused'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, %L::jsonb, '[]'::jsonb)$$,
    (select id from spl_job),
    $json$[
      {"row_number":1,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R0",
         "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
      {"row_number":2,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-A1",
         "sequence_number":"1","weight_kg":"100.5","material_class":"CS"}},
      {"row_number":3,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
         "weld_number":"W-A1","weld_type":"BW","weld_location":"shop",
         "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
    ]$json$),
  'a clean R0 file set validates'
);

-- Dossier 14.2: a missing WPS is a warning, never a blocker.
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and code = 'SRV_WPS_MISSING' and severity = 'warning'),
  1,
  'a missing covering WPS is recorded as a warning'
);
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_job) and severity = 'blocker'),
  0,
  'a clean file set produces no blockers even with no WPS'
);

-- A new ISO needs no decisions.
select is(
  (select unresolved_count from public.revalidate_spooling_import_job((select id from spl_job))),
  0,
  'a brand-new isometric requires no revision decisions'
);
select is(
  (select count(*)::int from public.preview_spooling_import((select id from spl_job))
   where change_type = 'new'),
  3,
  'the preview reports three new entities'
);

-- Preview writes nothing.
select is(
  (select count(*)::int from public.isometrics where project_id = '30000000-0000-0000-0000-000000000421'),
  0,
  'preview did not create any isometric'
);

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job)),
  'the R0 import applies'
);

select is(
  (select count(*)::int from public.isometric_revisions rev
   join public.isometrics iso on iso.id = rev.isometric_id
   where iso.iso_number = 'ISO-A' and rev.status = 'accepted'),
  1,
  'R0 is the accepted revision'
);
select is(
  (select count(*)::int from public.weld_points wp
   join public.weld_joint_revisions wjr on wjr.id = wp.weld_joint_revision_id),
  2,
  'the weld joint was seeded with a root and a cap point'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job)),
  'PQC10',
  null,
  'the same job cannot be applied twice'
);

-- R1 import ------------------------------------------------------------------

select lives_ok(
  $$select public.create_spooling_import_job('30000000-0000-0000-0000-000000000421', 'R1 load')$$,
  'a second SpoolGen job can be opened'
);

create temporary table spl_job2 as
select id from public.import_jobs
where project_id = '30000000-0000-0000-0000-000000000421'
order by created_at desc limit 1;

select lives_ok(
  format($$select public.register_spooling_import_file(
      %L, 'weld', 'weld.txt', 'text/plain', 2048, 'sum-weld-2', 'p/j2/weld.txt')$$,
    (select id from spl_job2)),
  'weld.txt can be registered on the second job'
);

select lives_ok(
  format($$select public.record_spooling_validation(%L, %L::jsonb, '[]'::jsonb)$$,
    (select id from spl_job2),
    $json$[
      {"row_number":1,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"isometric","iso_number":"ISO-A","revision_number":"R1",
         "pds_area":"PDS-A","service_class":"SC-A","line_number":"L-1","sheet_number":"1"}},
      {"row_number":2,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"spool","iso_number":"ISO-A","spool_number":"SP-A1",
         "sequence_number":"1","weight_kg":"140.0","material_class":"CS"}},
      {"row_number":3,"raw_values":{},"action":"create","normalized_values":
        {"entity_type":"weld_joint","iso_number":"ISO-A","spool_number":"SP-A1",
         "weld_number":"W-A1","weld_type":"BW","weld_location":"shop",
         "service_class":"SC-A","diameter_inch":"6","thickness_mm":"8.2"}}
    ]$json$),
  'the R1 file set validates'
);

select is(
  (select change_type::text from public.preview_spooling_import((select id from spl_job2))
   where entity_type = 'spool' and entity_key = 'SP-A1'),
  'revised',
  'the changed spool weight is reported as revised'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'PQC22',
  null,
  'a revised isometric cannot be applied while a spool decision is missing'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'spool', 'SP-A1', 'rework', 'weld reworked')$$,
    (select id from spl_job2)),
  'a spool decision can be recorded'
);

select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'PQC22',
  null,
  'a rework spool still needs a weld decision'
);

select lives_ok(
  format($$select public.record_revision_decision(
      %L, 'ISO-A', 'weld_joint', 'W-A1', 'done_without_modification', null)$$,
    (select id from spl_job2)),
  'a weld decision can be recorded'
);

select lives_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_job2)),
  'the R1 import applies once every decision exists'
);

select is(
  (select rev.revision_number from public.isometric_revisions rev
   join public.isometrics iso on iso.id = rev.isometric_id
   where iso.iso_number = 'ISO-A' and rev.status = 'accepted'),
  'R1',
  'R1 replaced R0 as the accepted revision'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the tests.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `042_spooling_apply.test.sql` reports `ok 1` … `ok 22`, no failures.

When an assertion fails, read the raised `errcode` before changing anything. A `PQC22` where
`PQC26` was expected means the validation ordering is wrong, not that the test is wrong.

- [ ] **Step 3: Prove the failure path leaves nothing behind.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
then, in `psql` against the local database, repeat the R1 flow but skip
`record_revision_decision`, and after the `PQC22` failure confirm:

```sql
select count(*) from public.isometric_revisions where revision_number = 'R1';
```
Expected: `0`. A failed apply rolls back every write it made.

- [ ] **Step 4: Commit.**

```bash
git add supabase/tests/database/042_spooling_apply.test.sql
git commit -m "test(engineering): cover SpoolGen apply atomicity, severity and decisions"
```

---

## Task 12: Regenerate database types for the Gate B surface

**Files:**
- Modify: `lib/supabase/database.types.ts`

- [x] **Step 1: Regenerate.**

Run:
```bash
/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

- [ ] **Step 2: Verify the RPC surface exists.**

Run:
```bash
grep -c "create_spooling_import_job\|register_spooling_import_file\|record_spooling_validation\|preview_spooling_import\|record_revision_decision\|apply_spooling_import_job\|create_manual_revision" lib/supabase/database.types.ts
```
Expected: a number `>= 7`.

- [ ] **Step 3: Typecheck.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`.

- [ ] **Step 4: Commit.**

```bash
git add lib/supabase/database.types.ts
git commit -m "chore(engineering): regenerate database types for the spooling import surface"
```

### Checkpoint 2 — Gate B complete

- [ ] Run `npm run verify`. Expected: exit `0`, 17 pgTAP files pass.
- [ ] Report to the reviewer: which `PQC` codes are exercised by `042`, and the outcome of
      Task 11 Step 3 — the manual proof that a failed apply left no revision behind.

---

# Gate C — Domain and application

Every file in this gate is pure TypeScript: no `@supabase/*`, no `react`, no `@/store`. Task 31
Step 3 greps for violations, so do not reach for a Supabase type "just for convenience".

**Normalized values are always strings.** The SQL side reads staging with `->>`, so a JSON number
and a JSON string are indistinguishable to it — but a number would round-trip through
`jsonb` differently on the two sides of the diff. Emit strings and let the database cast.

## Task 13: Model engineering entities and SpoolGen file roles

**Files:**
- Create: `modules/engineering/domain/entity.ts`
- Create: `modules/engineering/domain/spoolgen-file.ts`
- Test: `modules/engineering/domain/spoolgen-file.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/spoolgen-file.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  SPOOLGEN_FILE_ROLES,
  SPOOLGEN_MAX_FILE_BYTES,
  isSpoolgenFileRole,
  missingRequiredRoles,
  describeFileSet,
  checkFileSize,
} from "./spoolgen-file"
import { STAGING_ENTITY_KINDS, stagingOrderOf, isDecidableEntity } from "./entity"

function run() {
  assert.equal(SPOOLGEN_FILE_ROLES.length, 4)
  assert.equal(SPOOLGEN_MAX_FILE_BYTES, 4194304)

  assert.equal(isSpoolgenFileRole("weld"), true)
  assert.equal(isSpoolgenFileRole("marian"), false)

  // Only weld.txt is mandatory: the manual describes three tabs, the presentation four.
  assert.deepEqual(missingRequiredRoles([]), ["weld"])
  assert.deepEqual(missingRequiredRoles(["weld"]), [])

  const partial = describeFileSet(["weld", "trace"])
  assert.equal(partial.complete, false)
  assert.deepEqual(partial.missingRequired, [])
  assert.deepEqual(partial.optionalMissing, ["bolt", "supp"])

  const full = describeFileSet(["weld", "trace", "bolt", "supp"])
  assert.equal(full.complete, true)

  // Dossier 14.3: 4 MB per file.
  assert.equal(checkFileSize("weld", "weld.txt", 1024), null)
  const tooBig = checkFileSize("weld", "weld.txt", SPOOLGEN_MAX_FILE_BYTES + 1)
  assert.equal(tooBig?.severity, "blocker")
  assert.equal(tooBig?.code, "FILE_TOO_LARGE")
  const empty = checkFileSize("trace", "trace.txt", 0)
  assert.equal(empty?.code, "FILE_EMPTY")

  // Staging order guarantees a parent row is applied before its children.
  assert.equal(STAGING_ENTITY_KINDS.length, 6)
  assert.ok(stagingOrderOf("isometric") < stagingOrderOf("spool"))
  assert.ok(stagingOrderOf("spool") < stagingOrderOf("weld_joint"))
  assert.ok(stagingOrderOf("flange_joint") < stagingOrderOf("material"))

  assert.equal(isDecidableEntity("spool"), true)
  assert.equal(isDecidableEntity("weld_joint"), true)
  assert.equal(isDecidableEntity("isometric"), false)
  assert.equal(isDecidableEntity("material"), false)

  console.log("All spoolgen-file.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/spoolgen-file.test.ts
```
Expected: FAIL — `Cannot find module './spoolgen-file'`.

- [ ] **Step 3: Write `entity.ts`.**

Create `modules/engineering/domain/entity.ts`:

```ts
// Mirrors the public.engineering_entity_type enum: only these four take decisions
// and appear in revision_change_items.
export const ENGINEERING_ENTITY_TYPES = [
  "spool",
  "weld_joint",
  "support",
  "flange_joint",
] as const

export type EngineeringEntityType = (typeof ENGINEERING_ENTITY_TYPES)[number]

// The staging vocabulary is wider: an isometric header row and a material row are
// staged too, but they never carry a decision.
export const STAGING_ENTITY_KINDS = [
  "isometric",
  "spool",
  "weld_joint",
  "support",
  "flange_joint",
  "material",
] as const

export type StagingEntityKind = (typeof STAGING_ENTITY_KINDS)[number]

// apply_spooling_import_job walks staging rows in row_number order, so emitting rows
// in this order is what guarantees a parent exists before its children.
export function stagingOrderOf(kind: StagingEntityKind): number {
  return STAGING_ENTITY_KINDS.indexOf(kind)
}

export function isDecidableEntity(kind: StagingEntityKind): kind is EngineeringEntityType {
  return (ENGINEERING_ENTITY_TYPES as readonly string[]).includes(kind)
}
```

- [ ] **Step 4: Write `spoolgen-file.ts`.**

Create `modules/engineering/domain/spoolgen-file.ts`:

```ts
import type { ImportIssue } from "@/modules/imports/domain/import-issue"

export const SPOOLGEN_FILE_ROLES = ["weld", "trace", "bolt", "supp"] as const

export type SpoolgenFileRole = (typeof SPOOLGEN_FILE_ROLES)[number]

// weld.txt carries the ISO/spool/weld spine; the other three decorate it.
export const SPOOLGEN_REQUIRED_ROLES: readonly SpoolgenFileRole[] = ["weld"]

// Dossier 14.3. Also enforced by the import_files check constraint and the bucket.
export const SPOOLGEN_MAX_FILE_BYTES = 4 * 1024 * 1024

export function isSpoolgenFileRole(value: string): value is SpoolgenFileRole {
  return (SPOOLGEN_FILE_ROLES as readonly string[]).includes(value)
}

export function missingRequiredRoles(
  present: readonly SpoolgenFileRole[]
): SpoolgenFileRole[] {
  return SPOOLGEN_REQUIRED_ROLES.filter((role) => !present.includes(role))
}

export interface FileSetDescription {
  complete: boolean
  missingRequired: SpoolgenFileRole[]
  optionalMissing: SpoolgenFileRole[]
}

export function describeFileSet(present: readonly SpoolgenFileRole[]): FileSetDescription {
  const missingRequired = missingRequiredRoles(present)
  const optionalMissing = SPOOLGEN_FILE_ROLES.filter(
    (role) => !present.includes(role) && !SPOOLGEN_REQUIRED_ROLES.includes(role)
  )
  return {
    complete: missingRequired.length === 0 && optionalMissing.length === 0,
    missingRequired,
    optionalMissing,
  }
}

export function checkFileSize(
  role: SpoolgenFileRole,
  fileName: string,
  sizeBytes: number
): ImportIssue | null {
  if (sizeBytes <= 0) {
    return {
      rowNumber: null,
      columnName: role,
      severity: "blocker",
      code: "FILE_EMPTY",
      message: `${fileName} is empty.`,
    }
  }
  if (sizeBytes > SPOOLGEN_MAX_FILE_BYTES) {
    return {
      rowNumber: null,
      columnName: role,
      severity: "blocker",
      code: "FILE_TOO_LARGE",
      message: `${fileName} is larger than the 4 MB limit for SpoolGen files.`,
    }
  }
  return null
}
```

- [ ] **Step 5: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/spoolgen-file.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add modules/engineering/domain/entity.ts modules/engineering/domain/spoolgen-file.ts modules/engineering/domain/spoolgen-file.test.ts
git commit -m "feat(engineering): model engineering entities and SpoolGen file roles"
```

---

## Task 14: Define the SpoolGen column contract

**Files:**
- Create: `modules/engineering/domain/spoolgen-contract.ts`
- Test: `modules/engineering/domain/spoolgen-contract.test.ts`
- Create: `docs/architecture/spoolgen-file-contract.md`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/spoolgen-contract.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  SPOOLGEN_CONTRACT,
  normalizeHeader,
  resolveColumns,
  numericKeysFor,
  requiredKeysFor,
} from "./spoolgen-contract"

function run() {
  // Header matching must survive whatever punctuation SpoolGen emits.
  assert.equal(normalizeHeader("ISO No."), "ISONO")
  assert.equal(normalizeHeader("  iso_number "), "ISONUMBER")
  assert.equal(normalizeHeader("Diameter (inch)"), "DIAMETERINCH")

  const weldColumns = SPOOLGEN_CONTRACT.weld
  assert.ok(weldColumns.some((column) => column.key === "iso_number"))
  assert.ok(weldColumns.some((column) => column.key === "weld_number"))
  assert.ok(weldColumns.some((column) => column.key === "thickness_mm"))

  const resolved = resolveColumns("weld", [
    "ISO No.",
    "Rev",
    "PDS Area",
    "Service Class",
    "Spool No.",
    "Weld No.",
    "Weld Type",
    "Diameter (inch)",
    "Thickness (mm)",
  ])
  assert.deepEqual(resolved.missingRequired, [])
  assert.equal(resolved.indexes.get("iso_number"), 0)
  assert.equal(resolved.indexes.get("weld_number"), 5)
  assert.equal(resolved.indexes.get("thickness_mm"), 8)

  const broken = resolveColumns("weld", ["ISO No.", "Spool No."])
  assert.ok(broken.missingRequired.includes("weld_number"))
  assert.ok(broken.missingRequired.includes("revision_number"))

  assert.deepEqual(numericKeysFor("supp"), ["quantity"])
  assert.ok(numericKeysFor("weld").includes("diameter_inch"))
  assert.ok(requiredKeysFor("trace").includes("ident_code"))

  console.log("All spoolgen-contract.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/spoolgen-contract.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the contract.**

Create `modules/engineering/domain/spoolgen-contract.ts`:

```ts
import type { SpoolgenFileRole } from "./spoolgen-file"

export interface SpoolgenColumn {
  key: string
  canonicalHeader: string
  aliases: readonly string[]
  required: boolean
  numeric?: boolean
}

// Punctuation, spacing and case carry no meaning in a SpoolGen header, so they are
// stripped before matching. This is the single point that has to change when a real
// export arrives with different spellings.
export function normalizeHeader(header: string): string {
  return header.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

const ISO_COLUMN: SpoolgenColumn = {
  key: "iso_number",
  canonicalHeader: "ISO_NUMBER",
  aliases: ["ISO", "ISONO", "ISONUMBER", "ISOMETRIC", "ISOMETRICNUMBER"],
  required: true,
}

const SPOOL_COLUMN: SpoolgenColumn = {
  key: "spool_number",
  canonicalHeader: "SPOOL_NUMBER",
  aliases: ["SPOOL", "SPOOLNO", "SPOOLNUMBER", "SPOOLID"],
  required: true,
}

export const SPOOLGEN_CONTRACT: Record<SpoolgenFileRole, readonly SpoolgenColumn[]> = {
  weld: [
    ISO_COLUMN,
    {
      key: "revision_number",
      canonicalHeader: "ISO_REVISION",
      aliases: ["REV", "REVISION", "ISOREV", "ISOREVISION"],
      required: true,
    },
    {
      key: "pds_area",
      canonicalHeader: "PDS_AREA",
      aliases: ["PDS", "PDSAREA", "DESIGNAREA", "AREA"],
      required: true,
    },
    {
      key: "service_class",
      canonicalHeader: "SERVICE_CLASS",
      aliases: ["SERVICECLASS", "SVCCLASS", "CLASS"],
      required: true,
    },
    {
      key: "line_number",
      canonicalHeader: "LINE_NUMBER",
      aliases: ["LINE", "LINENO", "LINENUMBER", "PIPELINE", "PIPELINENUMBER"],
      required: false,
    },
    {
      key: "sheet_number",
      canonicalHeader: "SHEET_NUMBER",
      aliases: ["SHEET", "SHEETNO", "SHEETNUMBER"],
      required: false,
    },
    SPOOL_COLUMN,
    {
      key: "spool_weight_kg",
      canonicalHeader: "SPOOL_WEIGHT_KG",
      aliases: ["WEIGHT", "WEIGHTKG", "SPOOLWEIGHT"],
      required: false,
      numeric: true,
    },
    {
      key: "material_class",
      canonicalHeader: "MATERIAL_CLASS",
      aliases: ["MATERIAL", "MATCLASS", "MATERIALCLASS"],
      required: false,
    },
    {
      key: "weld_number",
      canonicalHeader: "WELD_NUMBER",
      aliases: ["WELD", "WELDNO", "WELDNUMBER", "JOINT", "JOINTNO"],
      required: true,
    },
    {
      key: "weld_type",
      canonicalHeader: "WELD_TYPE",
      aliases: ["WELDTYPE", "JOINTTYPE", "TYPE"],
      required: true,
    },
    {
      key: "weld_location",
      canonicalHeader: "WELD_LOCATION",
      aliases: ["LOCATION", "WELDLOC", "SHOPFIELD"],
      required: false,
    },
    {
      key: "diameter_inch",
      canonicalHeader: "DIAMETER_INCH",
      aliases: ["DIA", "DIAMETER", "DIAINCH", "NPS"],
      required: true,
      numeric: true,
    },
    {
      key: "thickness_mm",
      canonicalHeader: "THICKNESS_MM",
      aliases: ["THK", "THICKNESS", "THKMM", "WALLTHICKNESS"],
      required: true,
      numeric: true,
    },
  ],
  trace: [
    ISO_COLUMN,
    SPOOL_COLUMN,
    {
      key: "ident_code",
      canonicalHeader: "IDENT_CODE",
      aliases: ["IDENT", "IDENTCODE", "ITEMCODE", "MATERIALCODE"],
      required: true,
    },
    {
      key: "description",
      canonicalHeader: "DESCRIPTION",
      aliases: ["DESC", "ITEMDESCRIPTION"],
      required: false,
    },
    {
      key: "quantity",
      canonicalHeader: "QUANTITY",
      aliases: ["QTY", "QUANTITY"],
      required: false,
      numeric: true,
    },
    {
      key: "unit",
      canonicalHeader: "UNIT",
      aliases: ["UOM", "UNITOFMEASURE"],
      required: false,
    },
    {
      key: "trace_number",
      canonicalHeader: "TRACE_NUMBER",
      aliases: ["TRACE", "TRACENO", "TRACENUMBER", "HEATNUMBER"],
      required: false,
    },
  ],
  bolt: [
    ISO_COLUMN,
    SPOOL_COLUMN,
    {
      key: "flange_number",
      canonicalHeader: "FLANGE_NUMBER",
      aliases: ["FLANGE", "FLANGENO", "FLANGENUMBER", "BOLTEDJOINT"],
      required: true,
    },
    {
      key: "flange_rating",
      canonicalHeader: "FLANGE_RATING",
      aliases: ["RATING", "FLANGERATING", "CLASSRATING"],
      required: false,
    },
    {
      key: "diameter_inch",
      canonicalHeader: "DIAMETER_INCH",
      aliases: ["DIA", "DIAMETER", "DIAINCH", "NPS"],
      required: false,
      numeric: true,
    },
    {
      key: "bolt_size",
      canonicalHeader: "BOLT_SIZE",
      aliases: ["BOLT", "BOLTSIZE", "STUDSIZE"],
      required: false,
    },
    {
      key: "bolt_quantity",
      canonicalHeader: "BOLT_QUANTITY",
      aliases: ["BOLTQTY", "BOLTQUANTITY", "NOOFBOLTS"],
      required: false,
      numeric: true,
    },
    {
      key: "joint_type",
      canonicalHeader: "JOINT_TYPE",
      aliases: ["JOINTTYPE", "FLANGETYPE"],
      required: false,
    },
  ],
  supp: [
    ISO_COLUMN,
    SPOOL_COLUMN,
    {
      key: "support_number",
      canonicalHeader: "SUPPORT_NUMBER",
      aliases: ["SUPPORT", "SUPPNO", "SUPPORTNO", "SUPPORTNUMBER"],
      required: true,
    },
    {
      key: "support_type",
      canonicalHeader: "SUPPORT_TYPE",
      aliases: ["SUPPORTTYPE", "SUPPTYPE"],
      required: false,
    },
    {
      key: "quantity",
      canonicalHeader: "QUANTITY",
      aliases: ["QTY", "NOOFF"],
      required: false,
      numeric: true,
    },
  ],
}

export interface ResolvedColumns {
  indexes: Map<string, number>
  missingRequired: string[]
}

export function resolveColumns(
  role: SpoolgenFileRole,
  headerRow: readonly string[]
): ResolvedColumns {
  const normalizedHeaders = headerRow.map(normalizeHeader)
  const indexes = new Map<string, number>()
  const missingRequired: string[] = []

  for (const column of SPOOLGEN_CONTRACT[role]) {
    const candidates = [normalizeHeader(column.canonicalHeader), ...column.aliases]
    const index = normalizedHeaders.findIndex((header) => candidates.includes(header))
    if (index === -1) {
      if (column.required) missingRequired.push(column.key)
      continue
    }
    indexes.set(column.key, index)
  }

  return { indexes, missingRequired }
}

export function requiredKeysFor(role: SpoolgenFileRole): string[] {
  return SPOOLGEN_CONTRACT[role].filter((column) => column.required).map((column) => column.key)
}

export function numericKeysFor(role: SpoolgenFileRole): string[] {
  return SPOOLGEN_CONTRACT[role]
    .filter((column) => column.numeric === true)
    .map((column) => column.key)
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/spoolgen-contract.test.ts
```
Expected: PASS.

- [ ] **Step 5: Document the contract.**

Create `docs/architecture/spoolgen-file-contract.md`:

````markdown
# SpoolGen file contract

PipeQC has no API link to SpoolGen; per CC-25 the integration is operator-mediated. The operator
exports up to four text files and uploads them on `/spooling/import`.

This document is the contract PipeQC implements. It was **defined by PipeQC**, not extracted from
a SpoolGen specification — no sample export exists in this repository. When a real export arrives,
change only the `aliases` arrays in `modules/engineering/domain/spoolgen-contract.ts`. No schema,
RPC or UI change is required.

## Shape

- Tab-delimited. A comma-delimited file is accepted: the delimiter is chosen by whichever
  character occurs more often in the first line.
- The first non-blank line is the header row.
- Blank lines are skipped. Cells are trimmed. A UTF-8 BOM is stripped.
- Maximum 4 MB per file (dossier §14.3), enforced in the browser, in
  `import_files.size_bytes` and by the `project-spooling` bucket.

## Header matching

Headers are normalized — uppercased with every non-alphanumeric character removed — before being
matched against the canonical header and its aliases. `ISO No.`, `iso_number` and `ISONO` all
resolve to the `iso_number` key.

## `weld.txt` — required

| Key | Canonical header | Required | Numeric |
| --- | --- | --- | --- |
| `iso_number` | `ISO_NUMBER` | yes | no |
| `revision_number` | `ISO_REVISION` | yes | no |
| `pds_area` | `PDS_AREA` | yes | no |
| `service_class` | `SERVICE_CLASS` | yes | no |
| `line_number` | `LINE_NUMBER` | no | no |
| `sheet_number` | `SHEET_NUMBER` | no | no |
| `spool_number` | `SPOOL_NUMBER` | yes | no |
| `spool_weight_kg` | `SPOOL_WEIGHT_KG` | no | yes |
| `material_class` | `MATERIAL_CLASS` | no | no |
| `weld_number` | `WELD_NUMBER` | yes | no |
| `weld_type` | `WELD_TYPE` | yes | no |
| `weld_location` | `WELD_LOCATION` | no | no |
| `diameter_inch` | `DIAMETER_INCH` | yes | yes |
| `thickness_mm` | `THICKNESS_MM` | yes | yes |

`weld_location` accepts `shop`, `assembly` or `field` and defaults to `shop`.

## `trace.txt` — optional

`iso_number`, `spool_number`, `ident_code` (required), `description`, `quantity` (numeric),
`unit`, `trace_number`.

## `bolt.txt` — optional

`iso_number`, `spool_number`, `flange_number` (required), `flange_rating`,
`diameter_inch` (numeric), `bolt_size`, `bolt_quantity` (numeric), `joint_type`.

## `supp.txt` — optional

`iso_number`, `spool_number`, `support_number` (required), `support_type`, `quantity` (numeric).

## Cross-file rule

Every `(iso_number, spool_number)` pair named in `trace.txt`, `bolt.txt` or `supp.txt` must exist
in `weld.txt`. An orphan is a blocker, raised client-side as `ORPHAN_SPOOL` and again server-side
as `SRV_ORPHAN_SPOOL`.

## Example

```text
ISO_NUMBER	ISO_REVISION	PDS_AREA	SERVICE_CLASS	LINE_NUMBER	SPOOL_NUMBER	WELD_NUMBER	WELD_TYPE	WELD_LOCATION	DIAMETER_INCH	THICKNESS_MM
ISO-CW200-01	R0	PDS-A	CW	CW200-01	SP-CW200-01-A	W-001	BW	shop	6	8.2
ISO-CW200-01	R0	PDS-A	CW	CW200-01	SP-CW200-01-A	W-002	BW	shop	6	8.2
```
````

- [ ] **Step 6: Commit.**

```bash
git add modules/engineering/domain/spoolgen-contract.ts modules/engineering/domain/spoolgen-contract.test.ts docs/architecture/spoolgen-file-contract.md
git commit -m "feat(engineering): define and document the SpoolGen column contract"
```

---

## Task 15: Read delimited text

**Files:**
- Create: `modules/engineering/domain/parsers/delimited.ts`
- Test: `modules/engineering/domain/parsers/delimited.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/parsers/delimited.test.ts`:

```ts
import assert from "node:assert/strict"
import { detectDelimiter, parseDelimited } from "./delimited"

function run() {
  assert.equal(detectDelimiter("A\tB\tC"), "\t")
  assert.equal(detectDelimiter("A,B,C"), ",")
  // A tie goes to tab: SpoolGen is tab-delimited by contract.
  assert.equal(detectDelimiter("A\tB,C"), "\t")
  assert.equal(detectDelimiter("SINGLE"), "\t")

  const rows = parseDelimited("A\tB\r\n1\t2\r\n\r\n3\t4\n")
  assert.deepEqual(rows, [
    ["A", "B"],
    ["1", "2"],
    ["3", "4"],
  ])

  // The BOM must not become part of the first header.
  const withBom = parseDelimited("﻿ISO\tREV\n X \t Y \n")
  assert.deepEqual(withBom, [
    ["ISO", "REV"],
    ["X", "Y"],
  ])

  assert.deepEqual(parseDelimited(""), [])
  assert.deepEqual(parseDelimited("   \n\n"), [])

  console.log("All delimited.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/delimited.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the reader.**

Create `modules/engineering/domain/parsers/delimited.ts`:

```ts
export type Delimiter = "\t" | ","

// SpoolGen is tab-delimited by contract; comma is a tolerated fallback for files that
// went through a spreadsheet on the way. A tie resolves to tab.
export function detectDelimiter(firstLine: string): Delimiter {
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return commas > tabs ? "," : "\t"
}

export function parseDelimited(text: string): string[][] {
  const withoutBom = text.replace(/^﻿/, "")
  const lines = withoutBom
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length === 0) return []

  const delimiter = detectDelimiter(lines[0])
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()))
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/delimited.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/engineering/domain/parsers/delimited.ts modules/engineering/domain/parsers/delimited.test.ts
git commit -m "feat(engineering): read tab and comma delimited SpoolGen text"
```

---

## Task 16: Parse a single SpoolGen file

**Files:**
- Create: `modules/engineering/domain/parsers/spoolgen-parser.ts`
- Test: `modules/engineering/domain/parsers/spoolgen-parser.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/parsers/spoolgen-parser.test.ts`:

```ts
import assert from "node:assert/strict"
import { parseSpoolgenFile } from "./spoolgen-parser"

const WELD_HEADER =
  "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tSPOOL_NUMBER\tWELD_NUMBER\tWELD_TYPE\tDIAMETER_INCH\tTHICKNESS_MM"

function run() {
  const good = parseSpoolgenFile(
    "weld",
    `${WELD_HEADER}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\t6\t8.2\n`
  )
  assert.equal(good.issues.length, 0)
  assert.equal(good.records.length, 1)
  assert.equal(good.records[0].values.iso_number, "ISO-A")
  assert.equal(good.records[0].values.thickness_mm, "8.2")
  assert.equal(good.records[0].lineNumber, 1)

  const empty = parseSpoolgenFile("weld", "")
  assert.equal(empty.records.length, 0)
  assert.equal(empty.issues[0].code, "EMPTY_FILE")
  assert.equal(empty.issues[0].severity, "blocker")

  const missingColumn = parseSpoolgenFile("weld", "ISO_NUMBER\tSPOOL_NUMBER\nISO-A\tSP-1\n")
  assert.ok(missingColumn.issues.some((issue) => issue.code === "MISSING_COLUMN"))
  // A file whose header is broken yields no records at all: row-level issues would be noise.
  assert.equal(missingColumn.records.length, 0)

  const missingValue = parseSpoolgenFile(
    "weld",
    `${WELD_HEADER}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\t\tBW\t6\t8.2\n`
  )
  const valueIssue = missingValue.issues.find((issue) => issue.code === "MISSING_VALUE")
  assert.equal(valueIssue?.severity, "blocker")
  assert.equal(valueIssue?.columnName, "weld_number")
  assert.equal(valueIssue?.rowNumber, 1)

  const badNumber = parseSpoolgenFile(
    "weld",
    `${WELD_HEADER}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\tsix\t8.2\n`
  )
  const numberIssue = badNumber.issues.find((issue) => issue.code === "INVALID_NUMBER")
  assert.equal(numberIssue?.columnName, "diameter_inch")
  assert.equal(numberIssue?.severity, "blocker")

  // An optional column that is absent is not an issue.
  const noOptional = parseSpoolgenFile(
    "supp",
    "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-1\tSU-1\n"
  )
  assert.equal(noOptional.issues.length, 0)
  assert.equal(noOptional.records[0].values.support_type, "")

  console.log("All spoolgen-parser.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/spoolgen-parser.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the parser.**

Create `modules/engineering/domain/parsers/spoolgen-parser.ts`:

```ts
import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import {
  SPOOLGEN_CONTRACT,
  numericKeysFor,
  requiredKeysFor,
  resolveColumns,
} from "../spoolgen-contract"
import { parseDelimited } from "./delimited"

export interface SpoolgenRecord {
  role: SpoolgenFileRole
  lineNumber: number
  values: Record<string, string>
}

export interface SpoolgenParseResult {
  records: SpoolgenRecord[]
  issues: ImportIssue[]
}

function isNumeric(value: string): boolean {
  if (value === "") return true
  return Number.isFinite(Number(value))
}

export function parseSpoolgenFile(
  role: SpoolgenFileRole,
  text: string
): SpoolgenParseResult {
  const issues: ImportIssue[] = []
  const matrix = parseDelimited(text)

  if (matrix.length === 0) {
    issues.push({
      rowNumber: null,
      columnName: role,
      severity: "blocker",
      code: "EMPTY_FILE",
      message: `${role}.txt contains no rows.`,
    })
    return { records: [], issues }
  }

  const { indexes, missingRequired } = resolveColumns(role, matrix[0])

  if (missingRequired.length > 0) {
    for (const key of missingRequired) {
      const column = SPOOLGEN_CONTRACT[role].find((entry) => entry.key === key)
      issues.push({
        rowNumber: null,
        columnName: key,
        severity: "blocker",
        code: "MISSING_COLUMN",
        message: `${role}.txt is missing the required column "${
          column?.canonicalHeader ?? key
        }".`,
      })
    }
    // Every row would fail the same way; one header issue is the useful message.
    return { records: [], issues }
  }

  const required = requiredKeysFor(role)
  const numeric = numericKeysFor(role)
  const records: SpoolgenRecord[] = []

  for (let line = 1; line < matrix.length; line++) {
    const cells = matrix[line]
    const values: Record<string, string> = {}

    for (const column of SPOOLGEN_CONTRACT[role]) {
      const index = indexes.get(column.key)
      values[column.key] = index === undefined ? "" : cells[index] ?? ""
    }

    if (Object.values(values).every((value) => value === "")) continue

    const lineNumber = line

    for (const key of required) {
      if (values[key] === "") {
        issues.push({
          rowNumber: lineNumber,
          columnName: key,
          severity: "blocker",
          code: "MISSING_VALUE",
          message: `${role}.txt row ${lineNumber}: "${key}" is required.`,
        })
      }
    }

    for (const key of numeric) {
      if (!isNumeric(values[key])) {
        issues.push({
          rowNumber: lineNumber,
          columnName: key,
          severity: "blocker",
          code: "INVALID_NUMBER",
          message: `${role}.txt row ${lineNumber}: "${values[key]}" is not a number.`,
        })
      }
    }

    records.push({ role, lineNumber, values })
  }

  return { records, issues }
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/spoolgen-parser.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/engineering/domain/parsers/spoolgen-parser.ts modules/engineering/domain/parsers/spoolgen-parser.test.ts
git commit -m "feat(engineering): parse a SpoolGen file into typed records and issues"
```

---

## Task 17: Check cross-file and per-ISO consistency

**Files:**
- Create: `modules/engineering/domain/parsers/cross-file.ts`
- Test: `modules/engineering/domain/parsers/cross-file.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/parsers/cross-file.test.ts`:

```ts
import assert from "node:assert/strict"
import { emptyFileSet, checkCrossFileConsistency, checkIsoUniformity } from "./cross-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

function weldRecord(
  lineNumber: number,
  overrides: Record<string, string> = {}
): SpoolgenRecord {
  return {
    role: "weld",
    lineNumber,
    values: {
      iso_number: "ISO-A",
      revision_number: "R0",
      pds_area: "PDS-A",
      service_class: "SC-A",
      line_number: "L-1",
      sheet_number: "1",
      spool_number: "SP-1",
      spool_weight_kg: "10",
      material_class: "CS",
      weld_number: "W-1",
      weld_type: "BW",
      weld_location: "shop",
      diameter_inch: "6",
      thickness_mm: "8.2",
      ...overrides,
    },
  }
}

function run() {
  const clean = {
    ...emptyFileSet(),
    weld: [weldRecord(1)],
    supp: [
      {
        role: "supp" as const,
        lineNumber: 1,
        values: { iso_number: "ISO-A", spool_number: "SP-1", support_number: "SU-1", support_type: "", quantity: "1" },
      },
    ],
  }
  assert.deepEqual(checkCrossFileConsistency(clean), [])

  const orphan = {
    ...emptyFileSet(),
    weld: [weldRecord(1)],
    bolt: [
      {
        role: "bolt" as const,
        lineNumber: 1,
        values: { iso_number: "ISO-A", spool_number: "SP-9", flange_number: "FL-1", flange_rating: "", diameter_inch: "", bolt_size: "", bolt_quantity: "", joint_type: "" },
      },
    ],
  }
  const orphanIssues = checkCrossFileConsistency(orphan)
  assert.equal(orphanIssues.length, 1)
  assert.equal(orphanIssues[0].code, "ORPHAN_SPOOL")
  assert.equal(orphanIssues[0].severity, "blocker")
  assert.equal(orphanIssues[0].rowNumber, 1)

  // Dossier 14.1: one line number and one service class per ISO.
  assert.deepEqual(checkIsoUniformity([weldRecord(1), weldRecord(2)]), [])

  const mixed = checkIsoUniformity([
    weldRecord(1),
    weldRecord(2, { service_class: "SC-B" }),
    weldRecord(3, { line_number: "L-2" }),
    weldRecord(4, { revision_number: "R1" }),
  ])
  assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_SERVICE_CLASS"))
  assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_LINE"))
  assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_REVISION"))
  assert.ok(mixed.every((issue) => issue.severity === "blocker"))

  console.log("All cross-file.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/cross-file.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the checks.**

Create `modules/engineering/domain/parsers/cross-file.ts`:

```ts
import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

export type SpoolgenFileSet = Record<SpoolgenFileRole, readonly SpoolgenRecord[]>

export function emptyFileSet(): SpoolgenFileSet {
  return { weld: [], trace: [], bolt: [], supp: [] }
}

function spoolKey(record: SpoolgenRecord): string {
  return `${record.values.iso_number}::${record.values.spool_number}`
}

// The database repeats this as SRV_ORPHAN_SPOOL. Doing it here too means the user sees
// the problem before uploading, not after.
export function checkCrossFileConsistency(set: SpoolgenFileSet): ImportIssue[] {
  const known = new Set(set.weld.map(spoolKey))
  const issues: ImportIssue[] = []

  for (const role of ["trace", "bolt", "supp"] as const) {
    for (const record of set[role]) {
      if (known.has(spoolKey(record))) continue
      issues.push({
        rowNumber: record.lineNumber,
        columnName: "spool_number",
        severity: "blocker",
        code: "ORPHAN_SPOOL",
        message: `${role}.txt row ${record.lineNumber}: spool "${record.values.spool_number}" of isometric "${record.values.iso_number}" is not present in weld.txt.`,
      })
    }
  }

  return issues
}

function distinctValues(records: readonly SpoolgenRecord[], key: string): string[] {
  return Array.from(new Set(records.map((record) => record.values[key] ?? "")))
}

// Dossier 14.1: an ISO carries exactly one pipeline number, one service class and, by
// construction, one revision number.
export function checkIsoUniformity(weld: readonly SpoolgenRecord[]): ImportIssue[] {
  const issues: ImportIssue[] = []
  const byIso = new Map<string, SpoolgenRecord[]>()

  for (const record of weld) {
    const iso = record.values.iso_number
    const bucket = byIso.get(iso)
    if (bucket) bucket.push(record)
    else byIso.set(iso, [record])
  }

  for (const [iso, records] of byIso) {
    const checks: readonly [string, string, string][] = [
      ["service_class", "ISO_MIXED_SERVICE_CLASS", "service class"],
      ["line_number", "ISO_MIXED_LINE", "line number"],
      ["revision_number", "ISO_MIXED_REVISION", "revision number"],
    ]

    for (const [key, code, label] of checks) {
      const values = distinctValues(records, key)
      if (values.length <= 1) continue
      issues.push({
        rowNumber: records[0].lineNumber,
        columnName: key,
        severity: "blocker",
        code,
        message: `Isometric "${iso}" carries more than one ${label}: ${values.join(", ")}.`,
      })
    }
  }

  return issues
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/parsers/cross-file.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/engineering/domain/parsers/cross-file.ts modules/engineering/domain/parsers/cross-file.test.ts
git commit -m "feat(engineering): check SpoolGen cross-file and per-ISO consistency"
```

---

## Task 18: Model the revision vocabulary and progress-copy policy

**Files:**
- Create: `modules/engineering/domain/revision.ts`
- Create: `modules/engineering/domain/diff.ts`
- Test: `modules/engineering/domain/revision.test.ts`

`diff.ts` deliberately holds **only** the change-type vocabulary and summarizing helpers. The diff
itself is computed by `preview_spooling_import` in SQL, and `apply_spooling_import_job` consumes
that same function — reimplementing the comparison in TypeScript would give the user one answer
and the database another the first time the two drifted.

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/domain/revision.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  REVISION_DECISIONS,
  REVISION_STATUSES,
  PROGRESS_KINDS,
  isRevisionEditable,
  progressKindsFor,
  keepsEntity,
  requiresWeldReview,
  isDuplicateRevisionNumber,
} from "./revision"
import { CHANGE_TYPES, summarizeChanges, changeTypeLabel } from "./diff"

function run() {
  assert.equal(REVISION_STATUSES.length, 3)
  assert.equal(REVISION_DECISIONS.length, 4)
  assert.equal(PROGRESS_KINDS.length, 3)

  assert.equal(isRevisionEditable("draft"), true)
  assert.equal(isRevisionEditable("accepted"), true)
  assert.equal(isRevisionEditable("superseded"), false)

  // Dossier 15.2: only these two decisions carry progress forward.
  assert.deepEqual(progressKindsFor("not_done"), [])
  assert.deepEqual(progressKindsFor("cancelled"), [])
  assert.deepEqual(progressKindsFor("done_without_modification"), [
    "fabrication_start",
    "sent_to_paint",
    "paint",
  ])
  assert.deepEqual(progressKindsFor("rework"), [
    "fabrication_start",
    "sent_to_paint",
    "paint",
  ])

  assert.equal(keepsEntity("cancelled"), false)
  assert.equal(keepsEntity("not_done"), true)
  assert.equal(keepsEntity("rework"), true)

  // Dossier 15.3: welds are reviewed one by one only inside a rework spool.
  assert.equal(requiresWeldReview("rework"), true)
  assert.equal(requiresWeldReview("done_without_modification"), false)

  assert.equal(isDuplicateRevisionNumber(["R0", "R1"], "R1"), true)
  assert.equal(isDuplicateRevisionNumber(["R0", "R1"], " r1 "), true)
  assert.equal(isDuplicateRevisionNumber(["R0", "R1"], "R2"), false)

  assert.equal(CHANGE_TYPES.length, 4)
  assert.equal(changeTypeLabel("revised"), "Revised")
  assert.deepEqual(
    summarizeChanges([
      { isoNumber: "A", entityType: "spool", entityKey: "S1", spoolNumber: "S1", changeType: "new", requiresDecision: false, decision: null },
      { isoNumber: "A", entityType: "spool", entityKey: "S2", spoolNumber: "S2", changeType: "revised", requiresDecision: true, decision: null },
      { isoNumber: "A", entityType: "spool", entityKey: "S3", spoolNumber: "S3", changeType: "removed", requiresDecision: true, decision: "cancelled" },
    ]),
    { new: 1, revised: 1, unchanged: 0, removed: 1 }
  )

  console.log("All revision.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/domain/revision.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `revision.ts`.**

Create `modules/engineering/domain/revision.ts`:

```ts
// Mirrors public.revision_status.
export const REVISION_STATUSES = ["draft", "accepted", "superseded"] as const
export type RevisionStatus = (typeof REVISION_STATUSES)[number]

// Mirrors public.revision_decision. Dossier 15.2.
export const REVISION_DECISIONS = [
  "not_done",
  "cancelled",
  "done_without_modification",
  "rework",
] as const
export type RevisionDecision = (typeof REVISION_DECISIONS)[number]

// Mirrors the revision_progress_copies.progress_kind check constraint.
export const PROGRESS_KINDS = ["fabrication_start", "sent_to_paint", "paint"] as const
export type ProgressKind = (typeof PROGRESS_KINDS)[number]

const DECISION_LABELS: Record<RevisionDecision, string> = {
  not_done: "Not Done",
  cancelled: "Cancelled",
  done_without_modification: "Done without Modification",
  rework: "Rework",
}

export function decisionLabel(decision: RevisionDecision): string {
  return DECISION_LABELS[decision]
}

export function isRevisionEditable(status: RevisionStatus): boolean {
  return status !== "superseded"
}

// Dossier 15.2: Rework copies Fabrication Start, Sent to Paint and Paint; Done without
// Modification copies progress wholesale; Not Done and Cancelled copy nothing.
export function progressKindsFor(decision: RevisionDecision): readonly ProgressKind[] {
  if (decision === "done_without_modification" || decision === "rework") {
    return PROGRESS_KINDS
  }
  return []
}

export function keepsEntity(decision: RevisionDecision): boolean {
  return decision !== "cancelled"
}

export function requiresWeldReview(decision: RevisionDecision): boolean {
  return decision === "rework"
}

// Dossier 15.5: a duplicate revision number is refused. Comparison ignores case and
// surrounding whitespace, matching what create_manual_revision does after trim().
export function isDuplicateRevisionNumber(
  existing: readonly string[],
  candidate: string
): boolean {
  const normalized = candidate.trim().toUpperCase()
  return existing.some((value) => value.trim().toUpperCase() === normalized)
}
```

- [ ] **Step 4: Write `diff.ts`.**

Create `modules/engineering/domain/diff.ts`:

```ts
import type { EngineeringEntityType } from "./entity"
import type { RevisionDecision } from "./revision"

// Mirrors public.revision_change_type. The comparison that produces these values lives
// in preview_spooling_import; duplicating it here would let the UI and the database
// disagree about what changed.
export const CHANGE_TYPES = ["new", "revised", "unchanged", "removed"] as const
export type ChangeType = (typeof CHANGE_TYPES)[number]

export interface PreviewChangeItem {
  isoNumber: string
  entityType: EngineeringEntityType
  entityKey: string
  spoolNumber: string | null
  changeType: ChangeType
  requiresDecision: boolean
  decision: RevisionDecision | null
}

export interface ChangeSummary {
  new: number
  revised: number
  unchanged: number
  removed: number
}

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  new: "New",
  revised: "Revised",
  unchanged: "Unchanged",
  removed: "Removed",
}

export function changeTypeLabel(changeType: ChangeType): string {
  return CHANGE_TYPE_LABELS[changeType]
}

export function summarizeChanges(items: readonly PreviewChangeItem[]): ChangeSummary {
  const summary: ChangeSummary = { new: 0, revised: 0, unchanged: 0, removed: 0 }
  for (const item of items) {
    summary[item.changeType] += 1
  }
  return summary
}
```

- [ ] **Step 5: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/domain/revision.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add modules/engineering/domain/revision.ts modules/engineering/domain/diff.ts modules/engineering/domain/revision.test.ts
git commit -m "feat(engineering): model revision statuses, decisions and change types"
```

---

## Task 19: Build the staging submission from a file set

**Files:**
- Create: `modules/engineering/domain/definition.ts`
- Create: `modules/engineering/application/import-spooling.ts`
- Test: `modules/engineering/application/import-spooling.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/application/import-spooling.test.ts`:

```ts
import assert from "node:assert/strict"
import { buildSpoolgenSubmission } from "./import-spooling"

const WELD = [
  "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tLINE_NUMBER\tSPOOL_NUMBER\tSPOOL_WEIGHT_KG\tWELD_NUMBER\tWELD_TYPE\tWELD_LOCATION\tDIAMETER_INCH\tTHICKNESS_MM",
  "ISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-1\tBW\tshop\t6\t8.2",
  "ISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-2\tBW\tshop\t6\t8.2",
].join("\n")

const SUPP = [
  "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\tSUPPORT_TYPE\tQUANTITY",
  "ISO-A\tSP-1\tSU-1\tSHOE\t2",
].join("\n")

function run() {
  const submission = buildSpoolgenSubmission({ weld: WELD, supp: SUPP })

  assert.equal(submission.canSubmit, true)
  assert.equal(submission.summary.blockerCount, 0)

  // One isometric, one spool, two welds, one support.
  const kinds = submission.rows.map((row) => row.normalizedValues.entity_type)
  assert.deepEqual(kinds, ["isometric", "spool", "weld_joint", "weld_joint", "support"])

  // row_number is monotonic from 1 and parents precede children.
  assert.deepEqual(
    submission.rows.map((row) => row.rowNumber),
    [1, 2, 3, 4, 5]
  )

  const isometric = submission.rows[0].normalizedValues
  assert.equal(isometric.iso_number, "ISO-A")
  assert.equal(isometric.revision_number, "R0")
  assert.equal(isometric.pds_area, "PDS-A")
  assert.equal(isometric.service_class, "SC-A")

  const spool = submission.rows[1].normalizedValues
  assert.equal(spool.spool_number, "SP-1")
  assert.equal(spool.weight_kg, "100.5")
  assert.equal(spool.sequence_number, "1")

  const weld = submission.rows[2].normalizedValues
  assert.equal(weld.weld_number, "W-1")
  // The weld carries its ISO's service class so the server can resolve referentials
  // without joining back to the isometric row.
  assert.equal(weld.service_class, "SC-A")
  assert.equal(weld.weld_location, "shop")

  // Every normalized value is a string: the SQL side reads them with ->>.
  for (const row of submission.rows) {
    for (const value of Object.values(row.normalizedValues)) {
      assert.equal(typeof value, "string")
    }
  }

  // Without weld.txt nothing can be submitted.
  const noWeld = buildSpoolgenSubmission({ supp: SUPP })
  assert.equal(noWeld.canSubmit, false)
  assert.ok(noWeld.issues.some((issue) => issue.code === "MISSING_REQUIRED_FILE"))

  // An orphan spool in supp.txt is a blocker but the job is still submittable, so the
  // user gets a durable issue list to work from.
  const orphan = buildSpoolgenSubmission({
    weld: WELD,
    supp: "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-9\tSU-9",
  })
  assert.equal(orphan.canSubmit, true)
  assert.ok(orphan.summary.blockerCount > 0)
  assert.ok(orphan.issues.some((issue) => issue.code === "ORPHAN_SPOOL"))

  console.log("All import-spooling.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/application/import-spooling.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write `definition.ts`.**

Create `modules/engineering/domain/definition.ts`:

```ts
import type { StagingEntityKind } from "./entity"
import type { SpoolgenFileSet } from "./parsers/cross-file"

// A staging row is exactly what record_spooling_validation writes into import_job_rows.
// Every value is a string: the SQL side reads them with ->> and casts explicitly.
export interface StagingRow {
  rowNumber: number
  rawValues: Record<string, string>
  normalizedValues: Record<string, string>
  action: "create"
}

function stagingRow(
  rowNumber: number,
  kind: StagingEntityKind,
  values: Record<string, string>,
  rawValues: Record<string, string>
): StagingRow {
  return {
    rowNumber,
    rawValues,
    normalizedValues: { entity_type: kind, ...values },
    action: "create",
  }
}

// Rows are emitted isometric -> spool -> weld -> support -> flange -> material so that
// apply_spooling_import_job, which walks them in row_number order, always sees a parent
// before its children.
export function buildStagingRows(set: SpoolgenFileSet): StagingRow[] {
  const rows: StagingRow[] = []
  let rowNumber = 0
  const next = () => (rowNumber += 1)

  const isoSeen = new Set<string>()
  for (const record of set.weld) {
    const iso = record.values.iso_number
    if (isoSeen.has(iso)) continue
    isoSeen.add(iso)
    rows.push(
      stagingRow(
        next(),
        "isometric",
        {
          iso_number: iso,
          revision_number: record.values.revision_number,
          pds_area: record.values.pds_area,
          service_class: record.values.service_class,
          line_number: record.values.line_number,
          sheet_number: record.values.sheet_number,
        },
        record.values
      )
    )
  }

  const spoolSeen = new Set<string>()
  let sequence = 0
  for (const record of set.weld) {
    const key = `${record.values.iso_number}::${record.values.spool_number}`
    if (spoolSeen.has(key)) continue
    spoolSeen.add(key)
    sequence += 1
    rows.push(
      stagingRow(
        next(),
        "spool",
        {
          iso_number: record.values.iso_number,
          spool_number: record.values.spool_number,
          sequence_number: String(sequence),
          weight_kg: record.values.spool_weight_kg,
          material_class: record.values.material_class,
        },
        record.values
      )
    )
  }

  for (const record of set.weld) {
    rows.push(
      stagingRow(
        next(),
        "weld_joint",
        {
          iso_number: record.values.iso_number,
          spool_number: record.values.spool_number,
          weld_number: record.values.weld_number,
          weld_type: record.values.weld_type,
          weld_location: record.values.weld_location || "shop",
          service_class: record.values.service_class,
          diameter_inch: record.values.diameter_inch,
          thickness_mm: record.values.thickness_mm,
        },
        record.values
      )
    )
  }

  for (const record of set.supp) {
    rows.push(
      stagingRow(
        next(),
        "support",
        {
          iso_number: record.values.iso_number,
          spool_number: record.values.spool_number,
          support_number: record.values.support_number,
          support_type: record.values.support_type,
          quantity: record.values.quantity || "1",
        },
        record.values
      )
    )
  }

  for (const record of set.bolt) {
    rows.push(
      stagingRow(
        next(),
        "flange_joint",
        {
          iso_number: record.values.iso_number,
          spool_number: record.values.spool_number,
          flange_number: record.values.flange_number,
          flange_rating: record.values.flange_rating,
          diameter_inch: record.values.diameter_inch,
          bolt_size: record.values.bolt_size,
          bolt_quantity: record.values.bolt_quantity,
          joint_type: record.values.joint_type,
        },
        record.values
      )
    )
  }

  for (const record of set.trace) {
    rows.push(
      stagingRow(
        next(),
        "material",
        {
          iso_number: record.values.iso_number,
          spool_number: record.values.spool_number,
          ident_code: record.values.ident_code,
          description: record.values.description,
          quantity: record.values.quantity,
          unit: record.values.unit,
          trace_number: record.values.trace_number,
        },
        record.values
      )
    )
  }

  return rows
}
```

- [ ] **Step 4: Write `import-spooling.ts`.**

Create `modules/engineering/application/import-spooling.ts`:

```ts
import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import { SPOOLGEN_FILE_ROLES, missingRequiredRoles, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import {
  emptyFileSet,
  checkCrossFileConsistency,
  checkIsoUniformity,
  type SpoolgenFileSet,
} from "../domain/parsers/cross-file"
import { buildStagingRows, type StagingRow } from "../domain/definition"

export interface SpoolgenSubmission {
  rows: StagingRow[]
  issues: ImportIssue[]
  summary: { blockerCount: number; warningCount: number }
  canSubmit: boolean
}

export function buildSpoolgenSubmission(
  files: Partial<Record<SpoolgenFileRole, string>>
): SpoolgenSubmission {
  const issues: ImportIssue[] = []
  const set: SpoolgenFileSet = emptyFileSet()
  const present: SpoolgenFileRole[] = []

  for (const role of SPOOLGEN_FILE_ROLES) {
    const text = files[role]
    if (text === undefined) continue
    present.push(role)
    const parsed = parseSpoolgenFile(role, text)
    set[role] = parsed.records
    issues.push(...parsed.issues)
  }

  for (const role of missingRequiredRoles(present)) {
    issues.push({
      rowNumber: null,
      columnName: role,
      severity: "blocker",
      code: "MISSING_REQUIRED_FILE",
      message: `${role}.txt is required before a SpoolGen import can be validated.`,
    })
  }

  issues.push(...checkIsoUniformity(set.weld))
  issues.push(...checkCrossFileConsistency(set))

  let blockerCount = 0
  let warningCount = 0
  for (const issue of issues) {
    if (issue.severity === "blocker") blockerCount += 1
    else if (issue.severity === "warning") warningCount += 1
  }

  return {
    rows: buildStagingRows(set),
    issues,
    summary: { blockerCount, warningCount },
    // A job with blockers is still recorded, so the user gets a durable issue list.
    // Without weld.txt the server refuses validation outright, so do not try.
    canSubmit: missingRequiredRoles(present).length === 0,
  }
}
```

- [ ] **Step 5: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/application/import-spooling.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add modules/engineering/domain/definition.ts modules/engineering/application/import-spooling.ts modules/engineering/application/import-spooling.test.ts
git commit -m "feat(engineering): build the SpoolGen staging submission"
```

---

## Task 20: Compose the revision decision gate

**Files:**
- Create: `modules/engineering/application/resolve-revision.ts`
- Test: `modules/engineering/application/resolve-revision.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `modules/engineering/application/resolve-revision.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  describeRevisionApplyGate,
  unresolvedItems,
  groupByIsometric,
  weldItemsForSpool,
} from "./resolve-revision"
import type { PreviewChangeItem } from "../domain/diff"

const items: PreviewChangeItem[] = [
  { isoNumber: "ISO-A", entityType: "spool", entityKey: "SP-1", spoolNumber: "SP-1", changeType: "revised", requiresDecision: true, decision: "rework" },
  { isoNumber: "ISO-A", entityType: "weld_joint", entityKey: "W-1", spoolNumber: "SP-1", changeType: "revised", requiresDecision: true, decision: null },
  { isoNumber: "ISO-A", entityType: "weld_joint", entityKey: "W-2", spoolNumber: "SP-1", changeType: "unchanged", requiresDecision: true, decision: "not_done" },
  { isoNumber: "ISO-B", entityType: "spool", entityKey: "SP-9", spoolNumber: "SP-9", changeType: "new", requiresDecision: false, decision: null },
]

function run() {
  assert.deepEqual(
    unresolvedItems(items).map((item) => item.entityKey),
    ["W-1"]
  )

  const grouped = groupByIsometric(items)
  assert.deepEqual(Array.from(grouped.keys()), ["ISO-A", "ISO-B"])
  assert.equal(grouped.get("ISO-A")?.length, 3)

  assert.deepEqual(
    weldItemsForSpool(items, "ISO-A", "SP-1").map((item) => item.entityKey),
    ["W-1", "W-2"]
  )

  const blocked = describeRevisionApplyGate({
    status: "validated",
    alreadyApplied: false,
    blockerCount: 2,
    unresolvedCount: 0,
  })
  assert.equal(blocked.allowed, false)
  assert.match(blocked.reason ?? "", /blocking/)

  const undecided = describeRevisionApplyGate({
    status: "validated",
    alreadyApplied: false,
    blockerCount: 0,
    unresolvedCount: 3,
  })
  assert.equal(undecided.allowed, false)
  assert.match(undecided.reason ?? "", /3/)

  const applied = describeRevisionApplyGate({
    status: "applied",
    alreadyApplied: true,
    blockerCount: 0,
    unresolvedCount: 0,
  })
  assert.equal(applied.allowed, false)
  assert.match(applied.reason ?? "", /already been applied/)

  const notValidated = describeRevisionApplyGate({
    status: "uploaded",
    alreadyApplied: false,
    blockerCount: 0,
    unresolvedCount: 0,
  })
  assert.equal(notValidated.allowed, false)

  const ready = describeRevisionApplyGate({
    status: "validated",
    alreadyApplied: false,
    blockerCount: 0,
    unresolvedCount: 0,
  })
  assert.equal(ready.allowed, true)
  assert.equal(ready.reason, null)

  // A missing WPS is a warning, so it must never close the gate.
  const warned = describeRevisionApplyGate({
    status: "validated",
    alreadyApplied: false,
    blockerCount: 0,
    unresolvedCount: 0,
    warningCount: 7,
  })
  assert.equal(warned.allowed, true)

  console.log("All resolve-revision.test.ts assertions passed!")
}

run()
```

- [ ] **Step 2: Run it and watch it fail.**

Run:
```bash
node --import tsx --test modules/engineering/application/resolve-revision.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the gate.**

Create `modules/engineering/application/resolve-revision.ts`:

```ts
import type { PreviewChangeItem } from "../domain/diff"

export interface RevisionApplyGate {
  status: string
  alreadyApplied: boolean
  blockerCount: number
  unresolvedCount: number
  // Present so callers can pass the full summary; warnings never close the gate.
  warningCount?: number
}

export interface RevisionApplyGateDescription {
  allowed: boolean
  reason: string | null
}

export function unresolvedItems(
  items: readonly PreviewChangeItem[]
): PreviewChangeItem[] {
  return items.filter((item) => item.requiresDecision && item.decision === null)
}

export function groupByIsometric(
  items: readonly PreviewChangeItem[]
): Map<string, PreviewChangeItem[]> {
  const grouped = new Map<string, PreviewChangeItem[]>()
  for (const item of items) {
    const bucket = grouped.get(item.isoNumber)
    if (bucket) bucket.push(item)
    else grouped.set(item.isoNumber, [item])
  }
  return grouped
}

export function weldItemsForSpool(
  items: readonly PreviewChangeItem[],
  isoNumber: string,
  spoolNumber: string
): PreviewChangeItem[] {
  return items.filter(
    (item) =>
      item.entityType === "weld_joint" &&
      item.isoNumber === isoNumber &&
      item.spoolNumber === spoolNumber
  )
}

export function describeRevisionApplyGate(
  gate: RevisionApplyGate
): RevisionApplyGateDescription {
  if (gate.alreadyApplied || gate.status === "applied") {
    return {
      allowed: false,
      reason: "This import has already been applied. Start a new import to load the files again.",
    }
  }

  if (gate.status === "failed" || gate.status === "canceled") {
    return { allowed: false, reason: "This import is closed and can no longer be applied." }
  }

  if (gate.status !== "validated") {
    return { allowed: false, reason: "Upload and validate the SpoolGen files before applying them." }
  }

  if (gate.blockerCount > 0) {
    return {
      allowed: false,
      reason: `${gate.blockerCount} blocking issues must be fixed in the source files before this import can be applied.`,
    }
  }

  if (gate.unresolvedCount > 0) {
    return {
      allowed: false,
      reason: `${gate.unresolvedCount} revised spools or reworked welds still need a decision.`,
    }
  }

  return { allowed: true, reason: null }
}
```

- [ ] **Step 4: Run the test and watch it pass.**

Run:
```bash
node --import tsx --test modules/engineering/application/resolve-revision.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/engineering/application/resolve-revision.ts modules/engineering/application/resolve-revision.test.ts
git commit -m "feat(engineering): compose the revision decision and apply gate"
```

### Checkpoint 3 — Gate C complete

- [ ] Run `npm run verify`. Expected: exit `0`.
- [ ] Run the layering audit:
```bash
grep -rn "@supabase\|from \"react\"\|@/store" modules/engineering/domain/ modules/engineering/application/
```
Expected: no output.
- [ ] Report to the reviewer: the number of unit test files added and the assertion that the WPS
      rule is a warning in both the SQL (`SRV_WPS_MISSING`) and the apply gate.

---
