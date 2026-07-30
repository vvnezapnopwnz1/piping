# PipeQC — Supabase backend foundation

## Decision

Supabase is a suitable backend for PipeQC. PostgreSQL gives the project the
foreign keys, unique constraints, transaction boundaries and audit-friendly
history that quality-control workflows require. Row Level Security (RLS) can
enforce project isolation and subcontractor scope at the database boundary;
Storage is appropriate for logos, ISO files, certificates and generated
documents; Edge Functions/server routes can later own imports and workflow
commands.

The first increment deliberately contains no operational mock data. The
current Zustand seeds are a UI/demo fixture, not a domain source of truth.
The initial platform administrator is a deployment concern: it must be set
with the Supabase service role or SQL Editor, never by a browser user.

## Domain boundary for the first increment

The database starts with the configuration layer described in the Easy Piping
manual: project identity, cross-project system referentials, and project
referentials. ISO, spool, weld, NDE batch, flange and test-pack progress are
separate later migrations after their write rules are specified.

`projects` is the tenant root. Every project referential carries `project_id`.
Stable UUIDs are used in relationships, so a human-readable code can be
corrected without rewriting historical relationships. Referentials are
deactivated/archived rather than physically deleted once used.

## First migration

`supabase/migrations/20260727145210_project_settings_and_referentials.sql`
creates:

- profile, project and project-membership primitives;
- global system reference entries (material, RT film, UT and torquing);
- the manual's project configuration hierarchy: subcontractors, units, area
  classifications, PDS areas, systems/subsystems, teams, locations and line
  services;
- engineering controls: WPS, welder qualification coverage, service class,
  weld type, NDE matrix, material traceability, thickness/flange rules,
  rework, joint category and progress-weight references;
- timestamps, database constraints and RLS policies. A project creator becomes
  that project's `system_admin` automatically.

## Delivery tracks

1. **Foundation (current):** versioned schema, RLS, no seeds and no production
   backend dependency in the UI.
2. **Admin vertical slice:** add `@supabase/supabase-js` only after confirming
   the dependency; authenticate users, replace one Admin tab at a time, and
   retain the Zustand demo mode behind an explicit adapter while migrating.
3. **Imports:** server-owned import jobs, validation reports and file storage;
   import must validate WPS/NDE/thickness/material referentials before writing
   any operational row.
4. **Operational vertical slices:** introduce ISO/spool first, then weld and
   NDE, then erection/flange, then test pack. Each has its own migration,
   command API, history and RLS checks.
5. **Hardening:** immutable workflow events/audit, Storage policies, generated
   TypeScript database types, backups, monitoring and production RLS tests.

## Current implementation status

The typed Supabase browser-client scaffold and flag-controlled real-mode design
are complete. `NEXT_PUBLIC_PIPEQC_MODE=demo` remains the safe default; exact
`supabase` activates Auth/session and active-membership gating. In real mode
the project and role shown by the shell come from `project_memberships`, and
the role is read-only in the client. A user without a membership sees an
explicit access-pending state, never the mock-data shell.

Access-capability migrations are applied locally: `20260731090000_access_capability_catalog.sql`, `20260731091000_access_capability_security.sql` and `20260731092000_access_management_rpc.sql`. The legacy compatibility role column remains, while auth context uses `list_current_user_projects()` effective-access summaries. Access Rights has a real-mode RPC UI boundary. The full database suite currently executes 103 pgTAP assertions, including capability, audited membership-command, fail-closed scope and service-role fixture-bootstrap checks. Demo operational screens still retain Track 3 compatibility behavior and are not evidence of Supabase authorization.

The implementation includes session/membership access, configuration schema,
Supabase-backed Project Definition CRUD, and Supabase-backed global System
Referential management:

1. **Project Definition:** Platform administrators can manage project identity,
   parties, logos, and transit times backed by PostgreSQL RLS checks and RPC capability assertions.
2. **System Referential:** `public.system_reference_entries` serves as the global,
   cross-project store. Material Type is fully managed by platform administrators
   (create, update code/description, activate/deactivate, delete with RESTRICT protection),
   while Film Quantity per Diameter, UT Calculation, and Torquing Requirement remain read-only
   view lists for all authenticated users until their structured domain contracts are introduced.

3. **Active-Project Selection / Multi-Membership:** Real mode loads all active memberships allowed by RLS for the signed-in user, restores a validated per-user project preference, and switches active project context safely in the UI while continuing to enforce access through RLS on every project-scoped API call.

4. **WPS CRUD (Project-scoped referential):** Fully managed, including forward-only migration (no hard deletes, `active`/`inactive`/`archived` statuses) and column-level grants. Follows a **Pure Modules + Supabase Adapters** architecture:
   - **Pure Module** (`lib/welding-procedures.ts`): Domain data validation and mapping, independent of any backend.
   - **Supabase Adapter** (`lib/supabase/welding-procedures.ts`): Implements data access, mapping pure types to Supabase types.
   - **UI Adapter** (`WpsModeAdapter` in `admin-tabs.tsx`): Conditionally renders either the real `SupabaseWpsTab` or the legacy `WpsTab` demo view based on `useAppMode()`, keeping demo mode entirely intact.

**The next unstarted vertical slice** will continue with other project-scoped referentials or operational data.

See [the initial bootstrap runbook](SUPABASE_BOOTSTRAP.md) for the
deployment-only creation of the first administrator, project and membership.

## Rules that prevent rework

- Never move localStorage mock records into the database as seed truth.
- Keep schema migrations additive; use a new migration for every change.
- Enforce subcontractor/PDS restrictions with RLS, not with a disabled UI
  selector.
- Do not expose service-role credentials to the browser.
- Treat reference updates that affect reports or quality decisions as audited
  admin actions.
- Use `ON DELETE RESTRICT` for referential dependencies and deactivate entries
  instead of deleting them.

## Local verification

When the local Supabase stack is running, verify it with
`/opt/homebrew/bin/supabase test db`. If it is stopped, start it with
`/opt/homebrew/bin/supabase start` first. Do **not** use `supabase db reset`
as a routine verification command: it recreates the local database and removes
locally created accounts and project data.
The test specification under `supabase/tests/database/` checks the
project/membership foundation and the critical NDE constraint. The complete
real-mode verification also runs the pure checks in `lib/app-mode.test.ts`,
`lib/supabase/config.test.ts`, `lib/supabase/browser-client.test.ts`,
`contexts/supabase-auth-state.test.ts`,
`components/pipeqc/app-shell-state.test.ts`, and
`components/pipeqc/top-nav-state.test.ts`, followed by strict TypeScript and a
demo production build. Stop the stack with `/opt/homebrew/bin/supabase stop`
only when no one needs the local environment.
