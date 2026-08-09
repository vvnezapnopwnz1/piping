# Track 08 — Tracking Implementation Plan

> **Status:** ready for implementation after Track 07 and Track 10 automated gates. Browser acceptance remains a separate exit gate.

## Goal

Implement the manual's Tracking module as a simple online workflow over Supabase:

- append-only spool location history;
- current location and transit alerts derived by the database;
- Dashboard, Data Analysis, Barcode Printing, and Mobile Device Management;
- manual file exchange for scanner events;
- no PWA, offline queue, browser-side synchronization engine, or in-app barcode rendering.

The implementation must remain explainable in a demo: every number and status comes from a named database projection, every write is one command, and corrections add an audit event instead of editing history.

## Scope decisions

### In scope

- Stable tracking identity is `spools.id`; `spool_revision_id` is captured as an event-time snapshot.
- The current accepted spool revision supplies ISO, design area, PDS, and status details.
- A spool is active when effective construction history contains Start Fab and does not contain Erected.
- Transit duration uses the existing `projects.maximum_transit_time_days` field.
- Barcode value is the stable `spool_number`.
- Scanner exchange is a text/XLSX import through the existing import workbench.
- Barcode Printing produces an XLSX workbook for external Zebra software.
- Spool and design images show an explicit unavailable state until a media-ingestion contract exists.

### Out of scope

- PWA installation, offline storage, background synchronization, and device revocation.
- Camera scanning and direct Zebra integration.
- In-app barcode image generation.
- Spool/design image ingestion.
- Rewriting construction progress or Track 05 event contracts.

## Non-negotiable contracts

1. `spool_location_events` is append-only. Updates and deletes are rejected.
2. Browser callers cannot choose event provenance or an import job.
3. Public commands resolve the current accepted revision server-side.
4. Imports use a private invariant function and a database unique key for concurrency-safe idempotence.
5. Effective tracking views remove a compensated original and retain its compensation event.
6. Every read view exposes `project_id`; every frontend query also filters by `project_id`.
7. Construction state is read from the existing effective `spool_stage_events` view, never raw construction events.
8. Existing import types remain valid, including `spooling_definition`, `flange_progress`, and `test_pack_composition`.
9. SQLSTATE values are five characters: Track 08 owns `PQS01` through `PQS09`.
10. Fixed browser-fixture timestamps are in the past so transit assertions do not depend on the day of execution.

## Delivery sequence

### Task 0: Keep repository verification scoped to the repository

**Files**

- Modify: `eslint.config.mjs`

**Steps**

1. Add `.claude/**` to the global ESLint ignores. The ignored nested worktree is tooling state, not application source.
2. Run `npm run lint` and confirm ESLint no longer scans `.claude/worktrees/**`.
3. Run `npm run typecheck` to ensure the configuration edit has no side effect.

**Exit evidence**

- `npm run lint` exits zero without an extra CLI ignore flag.

### Task 1: Complete tracking referentials without duplicating project settings

**Files**

- Create: `supabase/migrations/20260814090000_tracking_referential_completion.sql`
- Create: `supabase/tests/080_tracking_referentials.test.sql`
- Modify: `modules/project-setup/domain/execution-reference.ts`
- Modify: `modules/project-setup/domain/execution-reference.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`
- Modify: `modules/project-setup/ui/execution-reference-tabs.tsx`
- Modify: `modules/project-setup/domain/extended-reference.ts`
- Modify: `modules/project-setup/domain/extended-reference.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-extended-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-extended-reference-repository.test.ts`
- Modify: `modules/project-setup/ui/extended-reference-tabs.tsx`

**Database contract**

- Add nullable `project_locations.capacity integer check (capacity > 0)` for backward compatibility.
- Do not add `project_tracking_settings`; use `projects.maximum_transit_time_days`.
- Add `list_tracking_device_user_candidates(p_project_id uuid)` as a security-definer RPC gated by `project_referential.manage`.
- Candidate rows contain membership id, profile display name/email, current device id/code, and assignment state for the requested project only.
- Preserve the existing unique `(project_id, membership_id)` assignment rule in `project_device_users`.

**TDD steps**

1. In `080_tracking_referentials.test.sql`, first assert the capacity constraint, project isolation, candidate-RPC authorization, and device-user assignment uniqueness.
2. Run `/opt/homebrew/bin/supabase test db --local supabase/tests/080_tracking_referentials.test.sql`; confirm the new assertions fail.
3. Add the migration and grants. Re-run the focused database test.
4. Add failing domain/repository tests for positive location capacity and `assignDeviceUser`.
5. Extend the existing location create/edit forms. New locations require a positive capacity; legacy null capacity displays `Not configured` and can be repaired through Edit.
6. Extend the existing Tracking Devices section with PDA user assignment. Reuse existing `DeviceInput`, `createDevice`, and device UI; do not build a second device CRUD path.
7. Re-run the focused unit tests and `npm run typecheck`.

**Exit evidence**

- An administrator can set location capacity and assign a project member to a PDA device.
- A non-administrator cannot enumerate candidates or change assignments.

### Task 2: Create the append-only tracking ledger

**Files**

- Create: `supabase/migrations/20260814091000_tracking_events_schema.sql`
- Create: `supabase/tests/081_tracking_events_schema.test.sql`

**Schema**

Create enums for direction (`in`, `out`, `manual`) and source (`manual`, `scan_import`, `compensation`), then create `spool_location_events` with:

- `id uuid primary key`;
- `project_id uuid not null`;
- `spool_id uuid not null`;
- `spool_revision_id uuid not null` as the accepted-revision snapshot;
- `location_id uuid`;
- `device_id uuid`;
- `operator_membership_id uuid`;
- `direction`;
- `occurred_at timestamptz not null`;
- `source`;
- `source_import_job_id uuid`;
- `source_event_key text`;
- `compensates_event_id uuid`;
- `reason text`;
- `recorded_by uuid not null`;
- `recorded_at timestamptz not null default now()`.

Add foreign keys and validation triggers that prove all referenced records belong to `project_id`, and that `spool_revision_id` belongs to `spool_id`. Enforce:

- compensation source if and only if `compensates_event_id` is present;
- an import job only for `scan_import`;
- nonblank reason for manual adjustment or compensation;
- partial unique `(project_id, source, source_event_key)` where `source_event_key is not null`;
- one compensation per target event;
- no self-compensation;
- a target and its compensation belong to the same project and spool.

Install update/delete rejection triggers. Enable RLS: project readers can select; direct inserts, updates, and deletes are denied to authenticated users. Writes go through commands only.

**TDD steps**

1. Write failing pgTAP coverage for schema shape, cross-project rejection, revision mismatch, compensation rules, unique source keys, RLS, and immutable history.
2. Run the focused test and retain the initial failure as evidence.
3. Add the schema, indexes, triggers, grants, and policies.
4. Re-run `081_tracking_events_schema.test.sql` until green.

### Task 3: Add one safe public write command and one private invariant

**Files**

- Create: `supabase/migrations/20260814092000_tracking_commands.sql`
- Create: `supabase/tests/082_tracking_commands.test.sql`

**Public command**

Create `record_location_event` with arguments:

```text
p_project_id
p_spool_id
p_location_id
p_device_id
p_direction
p_occurred_at
p_reason
p_compensates_event_id
p_idempotency_key
```

The browser never supplies source, import job, revision id, operator identity, or recorder identity. The function:

- verifies `tracking.event.record` for `in`/`out`;
- requires project administration for `manual` or correction;
- derives source as `manual` or `compensation`;
- resolves the current accepted `spool_revision_id`;
- binds the authenticated member and recorder;
- validates the device assignment when a device is supplied;
- serializes writes for one spool with a transaction advisory lock;
- rejects impossible transitions with `PQS01`–`PQS09`;
- returns the existing receipt for a repeated idempotency key.

Transition rules stay small:

- `out` requires a current location and that location must match `p_location_id`;
- `in` requires no current location (in transit or never scanned);
- `manual` sets the stated location and requires a reason;
- a compensation references one earlier effective event and expresses the corrected state as a new event.

Create an internal invariant function for trusted migration/import code. It accepts source, import job, operator, and source key, applies the same project and transition checks, and has `EXECUTE` revoked from `authenticated` and `anon`.

**TDD steps**

1. Add failing tests for authorization, accepted-revision resolution, advisory serialization behavior, transition errors, idempotency, correction visibility, and inability to spoof provenance.
2. Add the functions and minimal grants.
3. Run `082_tracking_commands.test.sql`.
4. Confirm an authenticated caller cannot execute the private invariant or directly insert ledger rows.

### Task 4: Build project-scoped effective read models

**Files**

- Create: `supabase/migrations/20260814093000_tracking_read_models.sql`
- Create: `supabase/tests/083_tracking_read_models.test.sql`

**Views**

- `spool_effective_location_events`: excludes a compensated original, includes its compensation, and retains audit identifiers.
- `spool_current_location`: latest effective state per `project_id, spool_id`; `out` means transit and has no current location.
- `spool_tracking_worklist`: one row per stable spool with current accepted revision, ISO number, spool number, PDS/design area, construction status, current location, ever-scanned flag, active flag, and latest event time.
- `spool_transit_alerts`: transit age compared with `projects.maximum_transit_time_days`.
- `spool_tracking_inconsistencies`: transition and referential anomalies that remain visible for administration.
- `tracking_location_occupancy`: current count and configured capacity per location.
- `tracking_device_usage`: event counts and last use per device, operator, and location.

All views expose `project_id` and use security-invoker behavior. Active status uses the existing effective `spool_stage_events` view: Start Fab is present and Erected is absent. Dashboard totals count distinct stable spools on current accepted revisions, not all revisions.

**TDD steps**

1. Add failing pgTAP fixtures for accepted-revision changes, compensated history, active/erected spools, transit threshold, occupancy, usage ranking, and two-project isolation.
2. Create the views and their supporting indexes.
3. Run `083_tracking_read_models.test.sql`.
4. Query every view as a project reader and verify no row from a second project is returned.

### Task 5: Add deterministic scan-file import

**Files**

- Create: `supabase/migrations/20260814094000_tracking_scan_import.sql`
- Create: `supabase/tests/084_tracking_scan_import.test.sql`
- Modify: `modules/imports/domain/import-type.ts`
- Modify: `modules/imports/domain/import-type.test.ts`
- Modify: `modules/imports/domain/parsers/registry.ts`
- Modify: `modules/imports/domain/parsers/registry.test.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.test.ts`

Add import type `tracking_scan` without replacing or narrowing any existing type. Accepted columns are:

```text
ISO Number
Spool Number
Location Code
Direction
Occurred At
Device Code
Operator Email
External Event ID
```

Rules:

- Direction is `in` or `out`; manual corrections are not imported.
- `Occurred At` is a complete ISO-8601 timestamp parsed as `timestamptz`.
- ISO and spool resolve one stable project spool and its current accepted revision.
- Location, device, and operator resolve inside the same project.
- A supplied External Event ID becomes the normalized source key.
- Without it, the source key is a normalized fingerprint of project, spool number, occurred timestamp, direction, location code, and device code.
- The database partial unique index, not a pre-insert `exists` check, provides concurrency-safe deduplication.
- Apply is administrator-only and calls the private invariant with `scan_import` provenance and the current import job id.
- Reapplying the same file produces skipped/duplicate receipts, not duplicate events.

**TDD steps**

1. Add parser tests for exact headers, timestamps, direction, optional external id, and stable normalization.
2. Add repository tests proving `tracking_scan` dispatches to its dedicated apply RPC while existing types keep their current dispatch.
3. Add pgTAP coverage for admin-only apply, project resolution, invalid transition, duplicate external id, duplicate fingerprint, and two concurrent-equivalent rows.
4. Implement parser, type registration, repository dispatch, SQL staging/apply function, and receipt mapping.
5. Run the focused unit and database tests.

### Task 6: Add a secure three-file data dump

**Files**

- Create: `supabase/migrations/20260814095000_tracking_data_dump.sql`
- Create: `supabase/tests/085_tracking_data_dump.test.sql`
- Create: `modules/tracking/domain/tracking.ts`
- Create: `modules/tracking/domain/tracking.test.ts`
- Create: `modules/tracking/application/export-tracking-data.ts`
- Create: `modules/tracking/application/export-tracking-data.test.ts`

Create admin-only `get_tracking_data_dump(p_project_id uuid)` returning one JSON object with:

- `active_spools`: ISO, spool number, PDS/design area, status, location, last event;
- `sub_locations`: location code/name/category, capacity, occupancy;
- `pda_users`: membership, display name/email, device code, last use.

The security-definer function resolves profile data without broadening profile-table RLS and returns only members of the requested project. The TypeScript application layer converts each array into a separately downloaded UTF-8 CSV with RFC 4180 quoting and deterministic column order.

Write failing pgTAP authorization/isolation tests and TypeScript quoting/empty-export tests before implementation. Run `085_tracking_data_dump.test.sql` and the focused unit tests.

### Task 7: Implement the project-scoped repository and command layer

**Files**

- Create: `modules/tracking/application/manage-tracking.ts`
- Create: `modules/tracking/application/manage-tracking.test.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-repository.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-repository.test.ts`

Repository operations:

- load dashboard metrics, occupancy, transit alerts, and usage;
- load worklist and event history;
- record in/out/manual/correction through `record_location_event`;
- load Data Analysis projections;
- request the admin data dump.

Every query takes `projectId`, selects `project_id`, and applies `.eq("project_id", projectId)` even when RLS already scopes rows. Use request versioning or effect cleanup so a response for project A cannot populate project B after an active-project switch.

Tests must cover open shared-field parsing, null capacity, project filters, RPC payloads without provenance fields, project-switch stale-response suppression, and normalized error messages for `PQS01`–`PQS09`.

### Task 8: Replace the Tracking dashboard placeholder

**Files**

- Modify: `app/tracking/page.tsx`
- Create: `modules/tracking/ui/tracking-dashboard-screen.tsx`
- Create: `modules/tracking/ui/tracking-dashboard-screen.test.tsx`

Display only real projections:

- cumulative distinct spools scanned;
- active spools;
- scans in the current month;
- spools currently in transit and overdue;
- location occupancy versus capacity, with `Not configured` for legacy null capacity;
- most-used device, operator, and location;
- recent activity.

Add Refresh and Print actions. Refresh refetches all dashboard queries; Print invokes the browser print flow. Do not display fabricated battery, connectivity, or synchronization health.

UI tests cover loading, empty, error, null capacity, project switch, refresh, and print.

### Task 9: Implement all four Data Analysis tabs

**Files**

- Modify: `app/tracking/data-analysis/page.tsx`
- Create: `modules/tracking/ui/tracking-data-analysis-screen.tsx`
- Create: `modules/tracking/ui/tracking-data-analysis-screen.test.tsx`

Tabs:

1. **Spool Location** — worklist, filters, event history, and authorized Add Event/Correction dialog.
2. **Location** — current occupancy, capacity, transit, and spool drill-down.
3. **Design Area** — active spool counts and location distribution grouped by real PDS/design-area data.
4. **Consolidation** — inconsistencies, overdue transit, never-scanned active spools, and admin data dump.

Erected spools remain visible in history but are excluded from active Location and Design Area totals. A successful command closes the dialog and refetches durable database state; it never patches a local-only result. Spool/design image panels explicitly say that no managed image is available.

Tests cover all tabs, reader/operator/admin capabilities, successful durable refetch, invalid transition feedback, correction reason, empty images, print, and export filenames.

### Task 10: Implement XLSX Barcode Printing

**Files**

- Modify: `app/tracking/print-barcodes/page.tsx`
- Create: `modules/tracking/application/export-barcode-workbook.ts`
- Create: `modules/tracking/application/export-barcode-workbook.test.ts`
- Create: `modules/tracking/ui/tracking-barcode-screen.tsx`
- Create: `modules/tracking/ui/tracking-barcode-screen.test.tsx`

Use the existing `xlsx` dependency to generate an `.xlsx` workbook containing stable spool number, ISO, PDS/design area, current location, and the barcode value equal to spool number. Allow project-scoped filtering and selection. The screen explains that the workbook is consumed by external Zebra software; it does not render a barcode or claim direct printer control.

Tests open the generated workbook and assert sheet name, headers, cell values, selected rows, and `.xlsx` filename.

### Task 11: Add Mobile Device Management and complete navigation

**Files**

- Create: `app/tracking/devices/page.tsx`
- Create: `modules/tracking/ui/tracking-device-screen.tsx`
- Create: `modules/tracking/ui/tracking-device-screen.test.tsx`
- Modify: `config/navigation.ts`
- Modify: `config/route-capabilities.ts`
- Modify: `config/route-capabilities.test.ts`

The screen shows device usage, most frequent operator, most frequent location, last-use time, and assignment state. Provide an **Edit users** link to `/admin/project-referential`; creation and assignment remain in the existing referential UI.

The Tracking navigation must expose exactly the manual-facing sections:

- Dashboard;
- Data Analysis;
- Barcode Printing;
- Mobile Device Management.

Keep route guards capability-based: readers can view analytics/export, tracking operators can record normal scans, and administrators can correct history, import, dump, and manage assignments.

### Task 12: Add deterministic local fixtures and browser acceptance

**Files**

- Create: `scripts/bootstrap-track08-browser-fixtures.ts`
- Create: `scripts/bootstrap-track08-browser-fixtures.test.ts`
- Create: `docs/qa/track-08-agent-walkthrough.md`
- Modify: `package.json`

The bootstrap must refuse non-local Supabase URLs and use deterministic identities/source keys. It may use service-role writes only for local fixture creation. It must not modify Track 05 fixtures.

Use fixed timestamps such as `2026-08-01T08:00:00Z`, `2026-08-01T09:00:00Z`, and `2026-08-02T10:00:00Z`. Create:

- one active spool at a location;
- one active spool in normal transit;
- one active spool in overdue transit;
- one erected spool with retained history;
- one compensated location event;
- locations with configured capacity and one legacy null capacity;
- assigned and unassigned devices/users;
- a `tracking-scans.txt` import with one valid event, one duplicate, and one invalid row.

Document prerequisite fixture order:

```bash
npm run fixtures:track01
npm run fixtures:track03
npm run fixtures:track04
npm run fixtures:track05
npm run fixtures:track07
npm run fixtures:track08
```

The walkthrough records exact localhost URLs, control names, fixture values, and PASS/FAIL/BLOCKED evidence for:

- reader dashboard and all four Data Analysis tabs;
- operator in/out write followed by refresh and durable persistence;
- operator rejection for correction/import/assignment;
- administrator correction and audit-history visibility;
- import preview, apply, duplicate reapply, and invalid-row reporting;
- three CSV data-dump downloads;
- XLSX barcode workbook;
- Mobile Device Management analytics and Edit users link;
- active-project switch with no stale data;
- sign-out/sign-in persistence.

Do not read `.env`, use Studio/direct API for acceptance, edit source from the browser agent, or bypass a non-local URL guard.

### Task 13: Close Track 08 with fresh evidence

**Files**

- Modify: `docs/tracks/gapmap_and_roadmap.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Create: `docs/qa/track-08-deferred-items.md`

Run, in order:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run build
npm run verify
git diff --check
```

Run the focused database files individually before the full suite:

```bash
/opt/homebrew/bin/supabase test db --local supabase/tests/080_tracking_referentials.test.sql
/opt/homebrew/bin/supabase test db --local supabase/tests/081_tracking_events_schema.test.sql
/opt/homebrew/bin/supabase test db --local supabase/tests/082_tracking_commands.test.sql
/opt/homebrew/bin/supabase test db --local supabase/tests/083_tracking_read_models.test.sql
/opt/homebrew/bin/supabase test db --local supabase/tests/084_tracking_scan_import.test.sql
/opt/homebrew/bin/supabase test db --local supabase/tests/085_tracking_data_dump.test.sql
```

A clean migration replay with `supabase db reset` is destructive and requires explicit user approval. Without that approval, record the clean-replay gate as BLOCKED rather than resetting local data.

Track 08 is complete only when:

- automated checks pass on the intended checkout;
- focused and full database suites pass on a known-clean runtime;
- the browser walkthrough is PASS for reader, operator, and administrator;
- refresh and re-authentication prove durable state;
- roadmap status distinguishes automated completion from browser acceptance;
- deferred items contain only PWA/offline/device-revocation and managed image ingestion.

## Demo narrative

1. Open Dashboard and explain that all counters are project-scoped database projections.
2. Open Data Analysis and locate one active spool by stable spool number.
3. Record an out event, refresh, and show the spool in transit.
4. Record an in event, refresh, and show location occupancy change.
5. As administrator, correct one event and show both immutable audit rows plus the corrected effective state.
6. Import the scanner file twice and show that the second apply is idempotent.
7. Export the three data-dump CSV files and the Zebra-compatible XLSX workbook.
8. Open Mobile Device Management and follow Edit users to the existing project referential screen.

This is deliberately the simplest manual-aligned design: one ledger, one public command, trusted import reuse of the same invariant, database-derived reads, and ordinary online refresh.
