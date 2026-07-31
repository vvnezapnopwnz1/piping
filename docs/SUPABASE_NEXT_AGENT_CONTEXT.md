# PipeQC Supabase — context for the next planning session

Updated: 2026-08-02 (Track 03 Complete — Ready for Track 04)

> **Track 03 Completion (2026-08-02):** Track 03 (Import Platform & Engineering Definition) is complete and verified.
> Added database migrations `20260802090000_import_platform.sql`, `20260802091000_import_storage_policies.sql`, and `20260802092000_apply_import_commands.sql`.
> The pgTAP database test suite contains 201 passing assertions across 12 test files (`030`, `031`, `032` for import lifecycle, server-side apply atomicity, and storage RLS).
> All 49 unit test suites pass cleanly, along with strict TypeScript (`npx tsc --noEmit`) and fixture validation (`validate:fixtures`).
>
> **Next Roadmap Boundary:** Track 04 — ISO & Spool Pipeline (Engineering transmittals, spool fabrication, material checks).

> **Track 01 supersession (2026-07-30):** the historical membership-role
> passages below predate the access-capability model. Current Supabase auth
> loads `list_current_user_projects()` summaries, not `membership.role`.
> Each non-platform membership has one `access_role_code`, zero or more
> functional roles and optional explicit subcontractor/PDS scope. The retained
> `role` column is compatibility-only. Browser authorization uses capabilities;
> PostgreSQL RLS and RPC checks remain final authority.

> **Verified automated evidence:** migrations `20260731090000_access_capability_catalog.sql`,
> `20260731091000_access_capability_security.sql` and
> `20260731092000_access_management_rpc.sql` are present in the local schema;
> the current full database suite has 103 pgTAP assertions. Unit access contracts,
> strict TypeScript, fixture validation and diff validation were run. The Track
> 01 browser matrix remains unverified in this handoff. Do not call demo
> operational screens Supabase production behavior; the next roadmap boundary
> is the runtime source-of-truth track.

## What has been accepted manually

The local Supabase real mode is running and has been manually accepted for:

1. Auth → membership-gated shell → Sign out → Login.
2. Supabase-backed Project Definition: a permitted update persists after reload.
3. System Referential: Material Type is mutable only for platform admins;
   Film Quantity, UT Calculation and Torquing Requirement are read-only.
4. Active-project selection: the owner created a second project and active
   membership in Studio, signed in, selected the other project in the top bar,
   and confirmed that Project Definition changed to that project's data.

Do not repeat these as unverified assumptions. Browser acceptance has happened;
future work still needs its own focused verification.

## Current technical baseline

- Repository: `pipe-qc-shell-layout`; branch used for the work:
  `feat/supabase-real-mode`.
- Framework: Next.js 16 App Router, React 19, TypeScript strict, shadcn,
  Zustand for demo mode, Supabase JS in browser mode.
- `NEXT_PUBLIC_PIPEQC_MODE=demo` is the safe default. Exact value `supabase`
  enables the real path. Never make Supabase the implicit default.
- Browser code contains only the Supabase URL and publishable key. Never add a
  service-role key, JWT secret, database password or other secret to browser
  code or committed environment files.
- The local Supabase stack has real user/project data. Never run
  `supabase db reset` as a normal verification step. Apply only additive
  migrations with `supabase migration up --local` after review.

## Implemented Supabase slices

### Auth, shell and roles

`contexts/supabase-auth-context.tsx` reads Auth session plus active
`project_memberships`; `components/pipeqc/app-shell.tsx` shows login,
access-pending, error or shell. In Supabase mode the active membership role is
passed as `lockedRole` to `RoleProvider`; mock role switching must remain demo
only.

### Project Definition

`app/admin/project-definition/page.tsx` chooses Zustand in demo mode and a
typed Supabase API in real mode. The active `membership.projectId` is passed
explicitly to database calls. It has loading, generic error, read-only and
request-cancellation behavior. Do not substitute mock data after a real-mode
error.

### System Referential

`public.system_reference_entries` is global, never filtered by the active
project. Only `material_type` is browser-mutable. Migration
`20260729173000_restrict_system_referential_mutations.sql` adds restrictive
RLS policies for INSERT/UPDATE/DELETE, so even a platform admin cannot mutate
the three currently static kinds through a direct browser request.

### Active-project selection

The provider loads **all** active memberships for the authenticated user; it
does not use `.limit(1)`. `contexts/supabase-auth-state.ts` sorts memberships
by activity code, title and membership ID, and resolves a preferred project.
The preference key is `pipeqc.active-project:<user UUID>` in localStorage.
It is untrusted and is accepted only if the project exists in the RLS-loaded
active list. `selectProject` changes in-memory context and this preference;
it must not write a membership, call an elevated RPC or grant access.

`components/pipeqc/top-nav.tsx` renders a Supabase project dropdown only when
there are multiple memberships. The demo project dropdown is a separate,
unchanged branch.

## Database status and boundaries

Applied local migrations include:

- `20260727145210_project_settings_and_referentials.sql`
- `20260729130500_grant_authenticated_project_reads.sql`
- `20260729130501_grant_project_definition_updates.sql`
- `20260729170000_grant_system_referential_privileges.sql`
- `20260729173000_restrict_system_referential_mutations.sql`

`supabase test db` currently passes 33 pgTAP assertions. Those checks cover
the foundation grants and system-referential restrictive policies. New slices
must add their own grant/RLS/constraint assertions rather than treating the
existing count as broad coverage.

RLS is the final authority. UI visibility, selected project and localStorage
are usability features, never security controls. Project-specific API calls
must always accept an explicit `projectId` and filter by it. Every browser
write needs PostgreSQL privileges **and** an RLS policy; one does not replace
the other.

## Recommended next planning target: project WPS CRUD

The next vertical should be exactly one project-scoped referential:
`public.project_welding_procedures` (WPS List), before Welder Qualification.
This order follows the Easy Piping manual:

- WPS is approved by Quality and is then selected in Welder Qualification.
- A WPS requires material type, diameter range, thickness range and
  subcontractor; all WPS fields are mandatory in Manual §3.5
  (`docs/marker-output/manual.md:878`).
- The system later checks whether a WPS covers a joint's material/diameter/
  thickness, but missing coverage is a warning during import, not an import
  blocker. That future import rule is **out of scope** for CRUD.

### Important schema-versus-demo warning

Do not copy `components/admin/wps-tab.tsx`, `add-wps-dialog.tsx`, or the
Zustand `WPSRecord` into Supabase as a data contract. They are demo fixtures.
They include `baseMaterial`, `fillerMaterial`, welding positions and a
`Superseded` status that do not exist in the current database model.

The actual table (`supabase/migrations/20260727145210_project_settings_and_referentials.sql:264`)
has:

```text
id, project_id, subcontractor_id (currently nullable), material_type_id,
code, description, process,
diameter_from, diameter_to, thickness_from, thickness_to,
revision, approved_on, status(active|inactive|archived), timestamps
```

It has `unique(project_id, code, revision)`, a tenant-consistency trigger for
the subcontractor, a material-type-kind trigger, project-ID immutability and
generic project read/admin-write RLS policies. The manual's “all fields are
mandatory” conflicts with the current nullable `subcontractor_id`; the planner
must explicitly decide whether to align the schema with a forward migration or
document why the product deliberately permits a project-wide WPS. Do not make
that decision implicitly in a UI form.

The plan must also decide the lifecycle semantics. The current enum has only
`active`, `inactive`, `archived`; do not claim demo's “Superseded” status is
persisted unless a separately justified migration and dependency policy are
approved.

## Requirements for the next agent's plan

The agent should inspect the manual, schema, generated database types,
existing WPS demo UI and existing Project Definition/System Referential
Supabase patterns. Then write a detailed, execution-ready plan under
`docs/superpowers/plans/` before changing code.

The plan should include, at minimum:

1. A deliberate, documented WPS form contract that maps exactly to the chosen
   database columns and resolves the mandatory-subcontractor/lifecycle gaps.
2. Additive migration(s) only if that contract requires schema, privilege or
   RLS changes; pgTAP tests first and non-destructive local application.
3. A pure mapping/validation module: numeric finite non-negative ranges,
   `to >= from`, required code/process/revision/date/material, and any chosen
   subcontractor rule. Safe write payloads must exclude `project_id`, IDs and
   audit timestamps supplied by the UI.
4. Typed Supabase reads/mutations scoped to the current explicit `projectId`.
   Capability must come from `can_administer_project(projectId)`, while RLS
   remains final enforcement. Load the global Material Type list and
   project-scoped subcontractors only as needed for selects; do not use demo
   values as fallback.
5. A Supabase-only WPS view with loading, empty, generic-error/retry,
   read-only and mutation states. Preserve current demo WPS UI intact behind
   the app-mode adapter.
6. A decision for deletion/deactivation informed by future
   `welder_wps_qualifications` foreign keys. Do not bypass `ON DELETE RESTRICT`
   or erase dependent qualifications.
7. TDD-style pure/API tests, pgTAP tests for new database behavior, strict
   TypeScript, demo build, `git diff --check`, and manual acceptance in both
   modes. Report network/font build failures separately from code failures.

## Working-tree caution

The active worktree contains uncommitted changes from the completed System
Referential and active-project slices, including migrations, source, tests and
plans. Preserve them. Do not use `git reset --hard`, broad checkout, or a
database reset. The owner decides staging, commits and pushes.
