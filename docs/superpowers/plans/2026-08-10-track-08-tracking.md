# Track 08 Spool Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Spool Tracking exactly as the Easy Piping manual describes it: append-only location history recorded by scanning, current location and transit/inconsistency flags derived from that history, and the three real screens (Dashboard, Data Analysis, Barcode Printing) — using the desktop browser and the existing Track 03 import platform for the manual's own admin-driven data exchange with external PDA scanning software, not a new offline-first PWA.

**Architecture:** Reuse the existing `project_locations`/`project_location_categories` and `project_devices`/`project_device_users` referentials (already in schema, missing only a create path), the existing `construction_progress_events` ledger for stage facts (start_fab/erected), and the Track 03 import platform. Add one new append-only ledger, `spool_location_events`, and one private database command that both the manual "Add" UI action and the import-apply path call, so they cannot diverge — the same single-source-of-truth pattern Track 09 used.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase/PostgreSQL, pgTAP, Node test runner, XLSX import infrastructure, ESLint.

---

## Delivery rules

- Implement only the workflow in this plan. Do not add: installable PWA/service worker, IndexedDB/Dexie offline queue, per-item sync conflict resolution, device revocation/session security, or live in-browser barcode/QR scanning. These were the master roadmap's original Track 8 ambition (`docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` section 20) but are not what the Easy Piping manual does — the manual is desktop-only with file export/import to a separate PDA vendor app. Task 15 records this deferral in `docs/deferred-work.md` in one short entry.
- Treat the Easy Piping manual as normative intent (`docs/research/presentation_findings.md` section "#5 Spool Tracking — module-specific findings", lines ~890–1060) and migrations/generated types/runtime as the current contract.
- Add forward-only migrations. **Check `ls supabase/migrations | tail -5` before choosing the first timestamp in Task 3** — Track 10 is executing in parallel in this checkout and may have landed migrations after this plan was written. Never edit an applied migration.
- Write a failing focused test before each production change, run it to observe the intended failure, make the smallest implementation, then rerun the focused test.
- Do not run `supabase db reset` without explicit approval because it destroys local data. Focused pgTAP uses `supabase test db --local <path>` on a single test file.
- Do not stage, commit, branch, push, reset, restore, or create a worktree unless the user explicitly authorizes Git operations. The commit boundaries below are handoff suggestions only.
- Keep browser acceptance separate from automated verification and record PASS, FAIL, or BLOCKED with evidence.
- Never put local credentials in source, fixtures, docs, screenshots, or shell history. Browser code receives only the public Supabase URL and publishable key.

## Fixed product and data decisions

| Decision | Track 08 contract |
|---|---|
| Scope boundary | Manual-aligned only: no PWA, no offline queue, no device sync/revocation (deferred, see Task 15) |
| Movement model | Append-only `spool_location_events`; a correction is a new compensating row, never an update or delete |
| Direction | `in` (arrival at a location), `out` (departure — spool is now in transit, no current location), `manual` (admin sets/corrects location directly, treated as an arrival) |
| Locations referential | Reuse existing `project_locations` / `project_location_categories` (`supabase/migrations/20260727145210_project_settings_and_referentials.sql`); add the missing create UI |
| Devices referential | Reuse existing `project_devices` / `project_device_users` (`supabase/migrations/20260801090000_complete_project_referentials.sql`); add the missing create UI |
| Active spool (CC-11) | `construction_progress_events` has a `stage = 'start_fab'` row for the spool revision AND no `stage = 'erected'` row |
| Stage/location mapping | `project_locations.mapped_progress_columns` (existing jsonb array) holds `construction_stage` values that location is valid for; already exposed in the UI, currently unused for logic |
| Transit threshold | New one-row-per-project `project_tracking_settings.transit_days`, default 2, not hardcoded |
| Data exchange | Admin-only 3-file export (Active Spool List, Sub Locations, PDA Users) matching the manual's Data Dump; scan results come in through a new Track 03 import type `tracking_scan`, not a bespoke pipeline |
| Command | One private routine `record_location_event(...)`, called by both the manual "Add" UI action and the import-apply path |
| Error namespace | `PQC100`–`PQC109` (the next free range; `PQC79`–`PQC99` are already claimed by Track 09 and the in-flight Track 10 work — re-check with `grep -rohE "PQC[0-9]+" supabase/migrations/*.sql \| sort -u` before writing Task 3, since Track 10 may claim more before this executes) |
| Capabilities | Reuse existing `tracking.view` / `tracking.event.record` (`modules/access/domain/capability.ts` lines 41–42); admin-only export/import gated by the existing `public.can_administer_project(project_id)`, not a new capability |
| Barcode printing | Export-only, matching the manual exactly: no in-app barcode/QR rendering |

## Planned file map

New files:

- `supabase/migrations/<TS1>_tracking_referential_create_paths.sql` (RLS/grants only; no new tables — see Task 1/2 note)
- `supabase/migrations/<TS2>_tracking_settings_and_events_schema.sql`
- `supabase/migrations/<TS3>_tracking_read_models.sql`
- `supabase/migrations/<TS4>_record_location_event_command.sql`
- `supabase/tests/database/1NN_tracking_referentials.test.sql`
- `supabase/tests/database/1NN_tracking_events_schema.test.sql`
- `supabase/tests/database/1NN_tracking_read_models.test.sql`
- `supabase/tests/database/1NN_record_location_event_command.test.sql`
- `modules/tracking/domain/tracking-event.ts`
- `modules/tracking/domain/tracking-event.test.ts`
- `modules/tracking/domain/tracking-status.ts`
- `modules/tracking/domain/tracking-status.test.ts`
- `modules/tracking/application/record-location-event.ts`
- `modules/tracking/application/record-location-event.test.ts`
- `modules/tracking/infrastructure/supabase-tracking-errors.ts`
- `modules/tracking/infrastructure/supabase-tracking-errors.test.ts`
- `modules/tracking/infrastructure/supabase-tracking-repository.ts`
- `modules/tracking/infrastructure/supabase-tracking-repository.test.ts`
- `modules/tracking/infrastructure/supabase-tracking-export.ts`
- `modules/tracking/infrastructure/supabase-tracking-export.test.ts`
- `modules/tracking/ui/tracking-dashboard-screen.tsx`
- `modules/tracking/ui/tracking-dashboard-screen.test.ts`
- `modules/tracking/ui/tracking-data-analysis-screen.tsx`
- `modules/tracking/ui/tracking-data-analysis-screen.test.ts`
- `modules/tracking/ui/tracking-barcode-screen.tsx`
- `modules/tracking/ui/tracking-barcode-screen.test.ts`
- `scripts/bootstrap-track08-browser-fixtures.ts`
- `scripts/bootstrap-track08-browser-fixtures.test.ts`
- `scripts/tracking-scans.txt`
- `docs/qa/track-08-agent-walkthrough.md`

Existing files changed only where listed in a task:

- `modules/project-setup/domain/execution-reference.ts` and its test (device referential validation);
- `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts` and its test (create functions for locations/location categories/devices);
- `modules/project-setup/ui/execution-reference-tabs.tsx` and `modules/project-setup/domain/setup-readiness.ts` (Add-location/Add-device dialogs);
- `modules/imports/domain/import-type.ts`, `modules/imports/domain/parsers/rules.ts`, and their tests (new `tracking_scan` import type);
- a **new** migration adds apply logic for the new import type (Task 8); it does not edit an applied migration;
- `lib/supabase/database.types.ts` after migrations;
- `app/tracking/page.tsx`, `app/tracking/data-analysis/page.tsx`, `app/tracking/print-barcodes/page.tsx`, `app/page.tsx`;
- `config/navigation.ts`, `config/route-capabilities.ts`, `config/route-capabilities.test.ts`;
- `package.json`, the master roadmap, and `docs/deferred-work.md` during closeout.

---

## Task 1: Add the missing create path for Locations and Location Categories

`project_locations` / `project_location_categories` already exist and already have domain validation (`validateLocationInput` in `modules/project-setup/domain/execution-reference.ts`) but no repository create function and no "Add" button — the Tracking tab in `modules/project-setup/ui/execution-reference-tabs.tsx` (lines 584–639) only lists rows. This mirrors the exact gap Track 09 fixed for joint categories (`docs/deferred-work.md` T02-D4) — the same debt for locations was left open.

**Files:**

- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`
- Modify: `modules/project-setup/ui/execution-reference-tabs.tsx`
- Modify: `modules/project-setup/ui/referential-dialogs.test.ts`

- [ ] **Step 1: Write failing repository tests.**

  ```ts
  // supabase-execution-reference-repository.test.ts (add)
  test("createLocationCategory inserts a project-scoped category", async () => {
    const client = fakeClient()
    await createLocationCategory(client, "project-1", { code: "yard", description: "Laydown Yard" })
    assert.ok(client.queries.includes("insert:project_location_categories"))
  })

  test("createLocation inserts with category and progress-column mapping", async () => {
    const client = fakeClient()
    await createLocation(client, "project-1", {
      categoryId: "cat-1", code: "LOC-01", description: "Laydown Area 1", mappedProgressColumns: ["start_fab"],
    })
    assert.ok(client.queries.includes("insert:project_locations"))
  })
  ```

  Run: `node --import tsx --test modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`
  Expected: FAIL — `createLocationCategory`/`createLocation` are not exported.

- [ ] **Step 2: Implement both functions, following `createUnitTimeReference`'s exact shape (plain insert, no RPC — these are simple referentials, not commands with invariants).**

  ```ts
  // supabase-execution-reference-repository.ts (add)
  export async function createLocationCategory(
    client: SupabaseClient<Database>,
    projectId: string,
    input: LocationCategoryInput
  ): Promise<LocationCategory> {
    const validation = validateReferenceIdentity(input)
    if (!validation.ok) {
      throw new Error(Object.values(validation.errors)[0] ?? "Invalid location category")
    }
    const { data, error } = await client
      .from("project_location_categories")
      .insert({ project_id: projectId, code: validation.value.code, description: validation.value.description })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapLocationCategoryRow(data)
  }

  export async function createLocation(
    client: SupabaseClient<Database>,
    projectId: string,
    input: LocationInput
  ): Promise<Location> {
    const validation = validateLocationInput(input)
    if (!validation.ok) {
      throw new Error(Object.values(validation.errors)[0] ?? "Invalid location")
    }
    const { data, error } = await client
      .from("project_locations")
      .insert({
        project_id: projectId,
        category_id: validation.value.categoryId,
        code: validation.value.code,
        description: validation.value.description,
        mapped_progress_columns: validation.value.mappedProgressColumns,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapLocationRow(data)
  }
  ```

  Use whatever row-mapping helper (`mapLocationRow`/`mapLocationCategoryRow`) already exists next to `loadLocations`-style readers in this file; if none exists, add one following the shape already used for teams/systems in the same file.

- [ ] **Step 3: Run the repository tests.**

  Expected: PASS.

- [ ] **Step 4: Add the "Add Location Category" and "Add Location" dialogs, copying the existing "Add Team" dialog (lines 664–699 of `execution-reference-tabs.tsx`) verbatim in structure — same `Dialog`/`DialogContent`/`Label`/`Input`/`DialogFooter` shape, same `isSubmitting` disable-on-submit pattern.** The Location dialog additionally needs a category `Select` (reuse the pattern from the team-type `Select` at lines 683–690) and a simple comma-separated text input for `mappedProgressColumns` that splits on `,` and trims each value before validation.

  Add matching "Add Location Category" / "Add Location" buttons to the `CardHeader` of the two cards at lines 586–638 (the existing Team/System cards already have an add button in their header — match that placement).

- [ ] **Step 5: Add/extend `referential-dialogs.test.ts` for both dialogs**, following the existing test style for the Team dialog in the same file (render, fill fields, submit, assert the repository call and dialog close).

  Run: `node --import tsx --test modules/project-setup/ui/referential-dialogs.test.ts`
  Expected: PASS.

- [ ] **Step 6: Full focused verification.**

  ```bash
  node --import tsx --test modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts modules/project-setup/ui/referential-dialogs.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(project-setup): add create paths for tracking locations`.

## Task 2: Add the Devices referential and its create path

`project_devices` / `project_device_users` exist (`supabase/migrations/20260801090000_complete_project_referentials.sql`) but have no domain validation, no repository functions, and no UI tab at all — this is new work, not a gap-fill.

**Files:**

- Modify: `modules/project-setup/domain/execution-reference.ts`
- Modify: `modules/project-setup/domain/execution-reference.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`
- Modify: `modules/project-setup/ui/execution-reference-tabs.tsx`

- [ ] **Step 1: Add failing domain tests for device validation.**

  ```ts
  // execution-reference.test.ts (add)
  assert.equal(validateDeviceInput({ code: "PDA-01", description: "Handheld scanner 1" }).ok, true)
  assert.equal(validateDeviceInput({ code: "", description: "x" }).ok, false)
  ```

  Run: `node --import tsx --test modules/project-setup/domain/execution-reference.test.ts`
  Expected: FAIL — `validateDeviceInput` is not exported.

- [ ] **Step 2: Add the types and validator, following `validateReferenceIdentity` (the same base used by teams/systems/locations).**

  ```ts
  // execution-reference.ts (add)
  export interface DeviceInput {
    code: string
    description: string
  }

  export interface Device {
    id: string
    projectId: string
    code: string
    description: string
    status: ReferenceStatus
  }

  export function validateDeviceInput(input: DeviceInput): ReferenceValidation<DeviceInput> {
    return validateReferenceIdentity(input)
  }
  ```

- [ ] **Step 3: Run the domain test.** Expected: PASS.

- [ ] **Step 4: Add failing repository test, then `createDevice`, mirroring `createLocationCategory` from Task 1.**

  ```ts
  test("createDevice inserts a project-scoped device", async () => {
    const client = fakeClient()
    await createDevice(client, "project-1", { code: "PDA-01", description: "Handheld scanner 1" })
    assert.ok(client.queries.includes("insert:project_devices"))
  })
  ```

  ```ts
  export async function createDevice(
    client: SupabaseClient<Database>,
    projectId: string,
    input: DeviceInput
  ): Promise<Device> {
    const validation = validateDeviceInput(input)
    if (!validation.ok) throw new Error(Object.values(validation.errors)[0] ?? "Invalid device")
    const { data, error } = await client
      .from("project_devices")
      .insert({ project_id: projectId, code: validation.value.code, description: validation.value.description })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapDeviceRow(data)
  }

  export async function loadDevices(client: SupabaseClient<Database>, projectId: string): Promise<Device[]> {
    const { data, error } = await client
      .from("project_devices")
      .select("id, code, description, status")
      .eq("project_id", projectId)
      .order("code")
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapDeviceRow)
  }
  ```

  Run the repository test. Expected: PASS.

- [ ] **Step 5: Add a "Devices" tab to `execution-reference-tabs.tsx`, in the same `tracking` `TabsContent` block added for locations, right after the Locations card** — a simple list card (code, description, status badge) plus an "Add Device" dialog, copying the Team dialog structure again (code + description only, no type selector needed).

- [ ] **Step 6: Full focused verification.**

  ```bash
  node --import tsx --test modules/project-setup/domain/execution-reference.test.ts modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(project-setup): add Devices referential and create path`.

## Task 3: Add tracking settings and the append-only event schema

First run `ls supabase/migrations | tail -5` and `grep -rohE "PQC[0-9]+" supabase/migrations/*.sql | sort -u | tail -5` to confirm the next free migration timestamp and error code — Track 10 is executing in parallel and may have advanced both since this plan was written. The examples below assume `20260814090000` is free; substitute the actual next value.

**Files:**

- Create: `supabase/migrations/20260814090000_tracking_settings_and_events_schema.sql`
- Create: `supabase/tests/database/100_tracking_events_schema.test.sql`

- [ ] **Step 1: Write the failing pgTAP test first.**

  ```sql
  -- supabase/tests/database/100_tracking_events_schema.test.sql
  begin;
  select plan(4);

  select has_table('public', 'project_tracking_settings', 'project_tracking_settings exists');
  select has_table('public', 'spool_location_events', 'spool_location_events exists');
  select has_column('public', 'spool_location_events', 'compensates_event_id', 'events support compensation');
  select ok(
    (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'spool_location_events' and column_name = 'direction') = 1,
    'direction column exists'
  );

  select * from finish();
  rollback;
  ```

  Run: `supabase test db --local supabase/tests/database/100_tracking_events_schema.test.sql`
  Expected: FAIL — tables do not exist.

- [ ] **Step 2: Write the migration.**

  ```sql
  -- supabase/migrations/20260814090000_tracking_settings_and_events_schema.sql
  -- Track 08: spool location tracking. Locations/devices referentials already exist
  -- (20260727145210, 20260801090000); this migration adds only the tracking-specific
  -- settings row and the append-only movement ledger.

  create table public.project_tracking_settings (
    project_id uuid primary key references public.projects(id) on delete restrict,
    transit_days integer not null default 2 check (transit_days > 0),
    updated_at timestamptz not null default timezone('utc', now())
  );

  create type public.tracking_event_direction as enum ('in', 'out', 'manual');
  create type public.tracking_event_source as enum ('manual', 'scan_import', 'compensation');

  create table public.spool_location_events (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete restrict,
    spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
    location_id uuid not null references public.project_locations(id) on delete restrict,
    device_id uuid references public.project_devices(id) on delete set null,
    direction public.tracking_event_direction not null,
    occurred_on date not null check (occurred_on <= current_date),
    source public.tracking_event_source not null default 'manual',
    source_import_job_id uuid references public.import_jobs(id) on delete set null,
    compensates_event_id uuid references public.spool_location_events(id) on delete restrict,
    recorded_by uuid references public.profiles(id) on delete set null,
    recorded_at timestamptz not null default timezone('utc', now()),
    check ((source = 'compensation') = (compensates_event_id is not null))
  );

  create index spool_location_events_revision_idx
    on public.spool_location_events (spool_revision_id, occurred_on desc, recorded_at desc);
  create index spool_location_events_project_location_idx
    on public.spool_location_events (project_id, location_id);

  create or replace function public.assert_tracking_event_project()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
  as $$
  declare revision_project_id uuid; location_project_id uuid;
  begin
    select iso.project_id into revision_project_id
    from public.spool_revisions sr
    join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
    join public.isometrics iso on iso.id = ir.isometric_id
    where sr.id = new.spool_revision_id;
    select project_id into location_project_id from public.project_locations where id = new.location_id;
    if revision_project_id is distinct from new.project_id or location_project_id is distinct from new.project_id then
      raise exception 'Tracking event, spool revision and location must share one project' using errcode = '23503';
    end if;
    return new;
  end;
  $$;

  create or replace function public.enforce_tracking_event_append_only()
  returns trigger
  language plpgsql
  set search_path = public, pg_temp
  as $$
  begin
    raise exception 'Spool location history is append-only' using errcode = 'PQC109';
  end;
  $$;

  create trigger spool_location_events_project_guard
    before insert on public.spool_location_events
    for each row execute function public.assert_tracking_event_project();
  create trigger spool_location_events_append_only
    before update or delete on public.spool_location_events
    for each row execute function public.enforce_tracking_event_append_only();

  alter table public.project_tracking_settings enable row level security;
  alter table public.spool_location_events enable row level security;

  create policy "read tracking settings" on public.project_tracking_settings for select to authenticated
  using (public.current_user_has_capability(project_id, 'tracking.view'));

  create policy "read tracking events" on public.spool_location_events for select to authenticated
  using (public.current_user_has_capability(project_id, 'tracking.view'));

  grant select on public.project_tracking_settings, public.spool_location_events to authenticated;
  revoke insert, update, delete, truncate on public.project_tracking_settings, public.spool_location_events from authenticated, anon;
  grant select, insert, update on public.project_tracking_settings to service_role;
  grant select, insert on public.spool_location_events to service_role;
  ```

  Note: `spool_location_events` truly never gets an update or delete, even from `service_role`, under the append-only rule — the trigger fires for any role. `project_tracking_settings` is a plain one-row-per-project referential, updatable directly like `project_pressure_units`.

- [ ] **Step 3: Run the pgTAP test.**

  Run: `supabase test db --local supabase/tests/database/100_tracking_events_schema.test.sql`
  Expected: PASS.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add append-only spool_location_events schema`.

## Task 4: Add the single `record_location_event` command

**Files:**

- Create: `supabase/migrations/20260814090500_record_location_event_command.sql`
- Create: `supabase/tests/database/101_record_location_event_command.test.sql`

- [ ] **Step 1: Write the failing pgTAP test.**

  ```sql
  -- supabase/tests/database/101_record_location_event_command.test.sql
  begin;
  select plan(5);

  -- fixture setup omitted for brevity; follow the pattern in
  -- supabase/tests/database/092_flange_progress_commands.test.sql for project/user/spool/location setup

  select lives_ok(
    $$ select public.record_location_event(
      :'project_id', :'spool_revision_id', :'location_id', null, 'in'::public.tracking_event_direction,
      current_date, 'manual'::public.tracking_event_source, null, 'idem-1'
    ) $$,
    'first manual event succeeds'
  );

  select is(
    (select count(*) from public.spool_location_events where spool_revision_id = :'spool_revision_id'),
    1::bigint,
    'exactly one event was written'
  );

  select throws_ok(
    $$ update public.spool_location_events set direction = 'out' where true $$,
    'PQC109', 'Spool location history is append-only',
    'direct update is rejected even for the row the command just wrote'
  );

  select throws_ok(
    $$ select public.record_location_event(
      :'project_id', :'spool_revision_id', :'other_project_location_id', null, 'in'::public.tracking_event_direction,
      current_date, 'manual'::public.tracking_event_source, null, 'idem-2'
    ) $$,
    '23503', null, 'a location from another project is rejected'
  );

  select throws_ok(
    $$ select public.record_location_event(
      :'project_id', :'spool_revision_id', :'location_id', null, 'in'::public.tracking_event_direction,
      current_date + 1, 'manual'::public.tracking_event_source, null, 'idem-3'
    ) $$,
    'PQC103', null, 'a future occurred_on date is rejected'
  );

  select * from finish();
  rollback;
  ```

  Run: `supabase test db --local supabase/tests/database/101_record_location_event_command.test.sql`
  Expected: FAIL — `record_location_event` does not exist.

- [ ] **Step 2: Write the command migration, following `record_flange_progress`'s two-function shape (an internal invariant function plus a capability-checked, idempotent public wrapper).**

  ```sql
  -- supabase/migrations/20260814090500_record_location_event_command.sql
  create or replace function public.record_location_event_invariant(
    target_project_id uuid,
    target_spool_revision_id uuid,
    target_location_id uuid,
    target_device_id uuid,
    target_direction public.tracking_event_direction,
    target_occurred_on date,
    target_source public.tracking_event_source,
    target_source_import_job_id uuid,
    target_actor_id uuid default null
  )
  returns public.spool_location_events
  language plpgsql
  security definer
  set search_path = public, pg_temp
  as $$
  declare
    revision_project_id uuid;
    location_row public.project_locations;
    event_row public.spool_location_events;
  begin
    perform pg_advisory_xact_lock(
      hashtextextended(target_project_id::text || ':' || target_spool_revision_id::text, 1)
    );

    select iso.project_id into revision_project_id
    from public.spool_revisions sr
    join public.isometric_revisions ir on ir.id = sr.isometric_revision_id
    join public.isometrics iso on iso.id = ir.isometric_id
    where sr.id = target_spool_revision_id;
    if revision_project_id is distinct from target_project_id then
      raise exception 'Spool revision is outside the target project' using errcode = 'PQC102';
    end if;

    select * into location_row from public.project_locations where id = target_location_id;
    if location_row.id is null or location_row.project_id <> target_project_id or location_row.status <> 'active' then
      raise exception 'Location is missing, inactive or outside the project' using errcode = 'PQC101';
    end if;

    if target_occurred_on is null or target_occurred_on > current_date then
      raise exception 'Occurred date must be today or earlier' using errcode = 'PQC103';
    end if;

    if target_device_id is not null and not exists (
      select 1 from public.project_devices where id = target_device_id and project_id = target_project_id and status = 'active'
    ) then
      raise exception 'Device is missing, inactive or outside the project' using errcode = 'PQC103';
    end if;

    insert into public.spool_location_events (
      project_id, spool_revision_id, location_id, device_id, direction,
      occurred_on, source, source_import_job_id, recorded_by
    ) values (
      target_project_id, target_spool_revision_id, target_location_id, target_device_id, target_direction,
      target_occurred_on, target_source, target_source_import_job_id, coalesce(target_actor_id, auth.uid())
    ) returning * into event_row;
    return event_row;
  end;
  $$;

  create or replace function public.record_location_event(
    target_project_id uuid,
    target_spool_revision_id uuid,
    target_location_id uuid,
    target_device_id uuid,
    target_direction public.tracking_event_direction,
    target_occurred_on date,
    target_source public.tracking_event_source,
    target_source_import_job_id uuid,
    target_idempotency_key text
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, pg_temp
  as $$
  declare
    claim jsonb;
    event_row public.spool_location_events;
  begin
    if not public.current_user_has_capability(target_project_id, 'tracking.event.record') then
      raise exception 'Tracking event recording is required' using errcode = 'PQC100';
    end if;

    claim := public.claim_command_receipt(target_project_id, 'record_location_event', target_idempotency_key);
    if claim ->> 'status' = 'completed' then
      return claim -> 'result';
    end if;

    event_row := public.record_location_event_invariant(
      target_project_id, target_spool_revision_id, target_location_id, target_device_id,
      target_direction, target_occurred_on, target_source, target_source_import_job_id, auth.uid()
    );
    insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, after_state)
    values (target_project_id, auth.uid(), 'spool_location_events', event_row.id,
      'record_location_event', to_jsonb(event_row));
    return public.complete_command_receipt(
      target_project_id, 'record_location_event', target_idempotency_key,
      jsonb_build_object('event', to_jsonb(event_row))
    );
  end;
  $$;

  revoke all on function public.record_location_event_invariant(uuid, uuid, uuid, uuid, public.tracking_event_direction, date, public.tracking_event_source, uuid, uuid) from public, anon, authenticated;
  revoke all on function public.record_location_event(uuid, uuid, uuid, uuid, public.tracking_event_direction, date, public.tracking_event_source, uuid, text) from public, anon;
  grant execute on function public.record_location_event(uuid, uuid, uuid, uuid, public.tracking_event_direction, date, public.tracking_event_source, uuid, text) to authenticated;
  ```

- [ ] **Step 3: Run the pgTAP test.**

  Run: `supabase test db --local supabase/tests/database/101_record_location_event_command.test.sql`
  Expected: PASS.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add the record_location_event command`.

## Task 5: Add tracking read models (current location, active status, inconsistencies, transit alerts)

**Files:**

- Create: `supabase/migrations/20260814091000_tracking_read_models.sql`
- Create: `supabase/tests/database/102_tracking_read_models.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**, asserting: a spool with only an `in` event shows that location in `spool_current_location`; a spool whose latest event is `out` shows `location_id is null`; a spool with `start_fab` and no `erected` construction event is `is_active = true` in `spool_tracking_status`; a spool with an `out` event older than `project_tracking_settings.transit_days` appears in `spool_transit_alerts`; a location whose `mapped_progress_columns` does not include the spool's latest construction stage produces a `stage_mismatch` row in `spool_tracking_inconsistencies`. Model this on `supabase/tests/database/093_flange_revision_readiness.test.sql`'s fixture-and-assert structure.

  Run: `supabase test db --local supabase/tests/database/102_tracking_read_models.test.sql`
  Expected: FAIL — views do not exist.

- [ ] **Step 2: Write the views.**

  ```sql
  -- supabase/migrations/20260814091000_tracking_read_models.sql
  create or replace view public.spool_current_location with (security_invoker = true) as
  select
    latest.spool_revision_id,
    case when latest.direction = 'out' then null else latest.location_id end as location_id,
    case when latest.direction = 'out' then null else loc.code end as location_code,
    latest.direction as last_direction,
    latest.occurred_on as last_event_on,
    latest.recorded_at as last_event_at
  from (
    select distinct on (sle.spool_revision_id)
      sle.spool_revision_id, sle.location_id, sle.direction, sle.occurred_on, sle.recorded_at
    from public.spool_location_events sle
    order by sle.spool_revision_id, sle.occurred_on desc, sle.recorded_at desc
  ) latest
  left join public.project_locations loc on loc.id = latest.location_id;

  create or replace view public.spool_tracking_status with (security_invoker = true) as
  select
    sr.id as spool_revision_id,
    iso.project_id,
    (start_fab.stage is not null and erected.stage is null) as is_active,
    start_fab.occurred_on as start_fab_on,
    erected.occurred_on as erected_on
  from public.spool_revisions sr
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  left join lateral (
    select cpe.stage, cpe.occurred_on from public.construction_progress_events cpe
    where cpe.spool_revision_id = sr.id and cpe.stage = 'start_fab'
    order by cpe.occurred_on desc, cpe.created_at desc limit 1
  ) start_fab on true
  left join lateral (
    select cpe.stage, cpe.occurred_on from public.construction_progress_events cpe
    where cpe.spool_revision_id = sr.id and cpe.stage = 'erected'
    order by cpe.occurred_on desc, cpe.created_at desc limit 1
  ) erected on true;

  create or replace view public.spool_transit_alerts with (security_invoker = true) as
  select
    cl.spool_revision_id, iso.project_id, cl.last_event_on,
    (current_date - cl.last_event_on) as days_in_transit
  from public.spool_current_location cl
  join public.spool_revisions sr on sr.id = cl.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  join public.project_tracking_settings settings on settings.project_id = iso.project_id
  where cl.last_direction = 'out'
    and (current_date - cl.last_event_on) > settings.transit_days;

  create or replace view public.spool_tracking_inconsistencies with (security_invoker = true) as
  with latest_stage as (
    select distinct on (cpe.spool_revision_id) cpe.spool_revision_id, cpe.stage
    from public.construction_progress_events cpe
    order by cpe.spool_revision_id, cpe.occurred_on desc, cpe.created_at desc
  ), latest_erected as (
    select distinct on (cpe.spool_revision_id) cpe.spool_revision_id, cpe.occurred_on
    from public.construction_progress_events cpe
    where cpe.stage = 'erected'
    order by cpe.spool_revision_id, cpe.occurred_on desc
  )
  select
    cl.spool_revision_id, iso.project_id, 'stage_mismatch'::text as flag_kind,
    ls.stage::text as detail, cl.location_code
  from public.spool_current_location cl
  join public.spool_revisions sr on sr.id = cl.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  join public.project_locations loc on loc.id = cl.location_id
  join latest_stage ls on ls.spool_revision_id = cl.spool_revision_id
  where not (loc.mapped_progress_columns ? ls.stage::text)
  union all
  select
    sle.spool_revision_id, iso.project_id, 'erected_after_scan'::text, 'erected'::text, loc.code
  from public.spool_location_events sle
  join public.project_locations loc on loc.id = sle.location_id
  join public.spool_revisions sr on sr.id = sle.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  join latest_erected le on le.spool_revision_id = sle.spool_revision_id
  where sle.occurred_on > le.occurred_on;

  grant select on public.spool_current_location, public.spool_tracking_status,
    public.spool_transit_alerts, public.spool_tracking_inconsistencies to authenticated;
  ```

  Note on `spool_tracking_inconsistencies`: a location's `mapped_progress_columns` is a jsonb array of `construction_stage` text values (already populated through the Task 1 UI); `?` is the jsonb "does this array contain this string" operator. A location left with an empty `mapped_progress_columns` array matches nothing and every spool routed through it will report `stage_mismatch` — call this out in the walkthrough doc (Task 14) so a demo project seeds at least one mapped value per location.

- [ ] **Step 3: Run the pgTAP test.**

  Run: `supabase test db --local supabase/tests/database/102_tracking_read_models.test.sql`
  Expected: PASS.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add current-location, status, and flag read models`.

## Task 6: Add the pure tracking domain

**Files:**

- Create: `modules/tracking/domain/tracking-event.ts`
- Create: `modules/tracking/domain/tracking-event.test.ts`
- Create: `modules/tracking/domain/tracking-status.ts`
- Create: `modules/tracking/domain/tracking-status.test.ts`

- [ ] **Step 1: Write failing tests for event input validation.**

  ```ts
  // tracking-event.test.ts
  import assert from "node:assert/strict"
  import { validateLocationEventInput } from "./tracking-event"

  assert.equal(validateLocationEventInput({
    locationId: "loc-1", direction: "in", occurredOn: "2026-08-10", deviceId: null,
  }).ok, true)

  assert.equal(validateLocationEventInput({
    locationId: "", direction: "in", occurredOn: "2026-08-10", deviceId: null,
  }).ok, false)

  assert.equal(validateLocationEventInput({
    locationId: "loc-1", direction: "in", occurredOn: "2099-01-01", deviceId: null,
  }).ok, false)
  ```

  Run: `node --import tsx --test modules/tracking/domain/tracking-event.test.ts`
  Expected: FAIL — module does not exist.

- [ ] **Step 2: Implement.**

  ```ts
  // modules/tracking/domain/tracking-event.ts
  export type TrackingDirection = "in" | "out" | "manual"

  export interface LocationEventInput {
    locationId: string
    direction: TrackingDirection
    occurredOn: string
    deviceId: string | null
  }

  type Validation<T> = { ok: true; value: T; errors: Record<string, never> } | { ok: false; errors: Record<string, string> }

  export function validateLocationEventInput(input: LocationEventInput): Validation<LocationEventInput> {
    const errors: Record<string, string> = {}
    if (!input.locationId.trim()) errors.locationId = "Location is required"
    if (!["in", "out", "manual"].includes(input.direction)) errors.direction = "Direction must be in, out, or manual"
    const parsed = new Date(`${input.occurredOn}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) {
      errors.occurredOn = "Occurred date must be a valid date"
    } else if (parsed.getTime() > Date.now()) {
      errors.occurredOn = "Occurred date cannot be in the future"
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors }
    return { ok: true, value: input, errors: {} }
  }
  ```

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Write failing tests for the status/flag shaping helpers** (the pure functions the UI calls to turn read-model rows into display state — no database access here, that's Task 7's repository).

  ```ts
  // tracking-status.test.ts
  import assert from "node:assert/strict"
  import { isInTransit, isOverTransitThreshold, classifyInconsistency } from "./tracking-status"

  assert.equal(isInTransit({ lastDirection: "out" }), true)
  assert.equal(isInTransit({ lastDirection: "in" }), false)

  assert.equal(isOverTransitThreshold({ lastEventOn: "2026-08-01" }, 2, new Date("2026-08-10T00:00:00Z")), true)
  assert.equal(isOverTransitThreshold({ lastEventOn: "2026-08-09" }, 2, new Date("2026-08-10T00:00:00Z")), false)

  assert.equal(classifyInconsistency("stage_mismatch"), "Spool is outside a location valid for its current stage")
  assert.equal(classifyInconsistency("erected_after_scan"), "Spool was scanned after its erection date")
  ```

  Run: `node --import tsx --test modules/tracking/domain/tracking-status.test.ts`
  Expected: FAIL.

- [ ] **Step 5: Implement.**

  ```ts
  // modules/tracking/domain/tracking-status.ts
  export function isInTransit(location: { lastDirection: "in" | "out" | "manual" }): boolean {
    return location.lastDirection === "out"
  }

  export function isOverTransitThreshold(
    location: { lastEventOn: string },
    transitDays: number,
    now: Date = new Date()
  ): boolean {
    const eventDate = new Date(`${location.lastEventOn}T00:00:00Z`)
    const dayMs = 24 * 60 * 60 * 1000
    return Math.floor((now.getTime() - eventDate.getTime()) / dayMs) > transitDays
  }

  export type InconsistencyFlagKind = "stage_mismatch" | "erected_after_scan"

  const FLAG_LABELS: Record<InconsistencyFlagKind, string> = {
    stage_mismatch: "Spool is outside a location valid for its current stage",
    erected_after_scan: "Spool was scanned after its erection date",
  }

  export function classifyInconsistency(kind: InconsistencyFlagKind): string {
    return FLAG_LABELS[kind]
  }
  ```

- [ ] **Step 6: Run the test.** Expected: PASS.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add pure tracking domain`.

## Task 7: Add the application and infrastructure layers

**Files:**

- Create: `modules/tracking/application/record-location-event.ts`
- Create: `modules/tracking/application/record-location-event.test.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-errors.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-errors.test.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-repository.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-repository.test.ts`

- [ ] **Step 1: Write failing tests for the error mapper**, following `modules/flange/infrastructure/supabase-flange-errors.ts`'s exact pattern (map a Postgres error code to a human sentence).

  ```ts
  // supabase-tracking-errors.test.ts
  import assert from "node:assert/strict"
  import { mapTrackingError } from "./supabase-tracking-errors"

  assert.equal(mapTrackingError({ code: "PQC100" }), "You do not have permission to record tracking events.")
  assert.equal(mapTrackingError({ code: "PQC101" }), "That location is missing, inactive, or belongs to a different project.")
  assert.equal(mapTrackingError({ code: "PQC102" }), "That spool is missing or belongs to a different project.")
  assert.equal(mapTrackingError({ code: "PQC103" }), "Check the event date and device.")
  assert.equal(mapTrackingError({ code: "PQC109" }), "Spool location history cannot be edited, only added to.")
  assert.equal(mapTrackingError({ code: "UNKNOWN" }), "Could not record the tracking event.")
  ```

  Run: `node --import tsx --test modules/tracking/infrastructure/supabase-tracking-errors.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the mapper** (a plain `Record<string, string>` lookup with a fallback, matching `supabase-flange-errors.ts`).

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Write failing repository tests** for `recordLocationEvent`, `loadCurrentLocations`, `loadTrackingStatus`, `loadTransitAlerts`, `loadInconsistencies`, following `supabase-flange-repository.test.ts`'s fake-client pattern (assert the right table/RPC name and filters, not real network calls).

  ```ts
  test("recordLocationEvent calls the record_location_event RPC", async () => {
    const client = fakeClient()
    await recordLocationEvent(client, {
      projectId: "p-1", spoolRevisionId: "sr-1", locationId: "loc-1", deviceId: null,
      direction: "in", occurredOn: "2026-08-10", source: "manual", sourceImportJobId: null,
      idempotencyKey: "idem-1",
    })
    assert.ok(client.rpcCalls.includes("record_location_event"))
  })

  test("loadCurrentLocations reads spool_current_location scoped to the project's spools", async () => {
    const client = fakeClient()
    await loadCurrentLocations(client, "p-1")
    assert.ok(client.queries.includes("from:spool_current_location"))
  })
  ```

  Run: `node --import tsx --test modules/tracking/infrastructure/supabase-tracking-repository.test.ts`
  Expected: FAIL.

- [ ] **Step 5: Implement the repository**, mirroring `supabase-flange-repository.ts`'s RPC-call and view-read shapes exactly (same `client.rpc(...)`/`client.from(...).select(...)` style, same error unwrap via the mapper from Step 2). Read functions take `projectId` and filter through whatever project-scoping join the view already encodes via RLS — do not add a redundant `.eq("project_id", ...)` where the view has no such column; check each view's actual columns from Task 5 before writing the query.

- [ ] **Step 6: Write failing application-layer tests** for `recordLocationEvent` (the thin orchestration function the UI calls — validates via the Task 6 domain function first, then calls the repository), following `modules/flange/application/record-flange-progress.ts`'s shape.

  ```ts
  test("rejects before calling the repository when input is invalid", async () => {
    const calls: string[] = []
    const repo = { recordLocationEvent: async () => { calls.push("called") } }
    const result = await recordLocationEvent(repo, { locationId: "", direction: "in", occurredOn: "2026-08-10", deviceId: null } as never)
    assert.equal(result.ok, false)
    assert.equal(calls.length, 0)
  })
  ```

  Run: `node --import tsx --test modules/tracking/application/record-location-event.test.ts`
  Expected: FAIL.

- [ ] **Step 7: Implement the application function**, calling `validateLocationEventInput` (Task 6) then the repository (Step 5), returning a discriminated `{ ok: true, event } | { ok: false, errors }` result — same shape `record-flange-progress.ts` returns.

- [ ] **Step 8: Full focused verification.**

  ```bash
  node --import tsx --test modules/tracking/infrastructure/supabase-tracking-errors.test.ts modules/tracking/infrastructure/supabase-tracking-repository.test.ts modules/tracking/application/record-location-event.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 9: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add application and infrastructure layers`.

## Task 8: Add the Track 03 `tracking_scan` import type

Matches the manual's CC-12 import ("Import → Import Spool Tracking Data") through the existing import platform rather than a new pipeline, the same way Track 09 added `flange_progress`.

**Files:**

- Modify: `modules/imports/domain/import-type.ts`
- Modify: `modules/imports/domain/import-type.test.ts`
- Modify: `modules/imports/domain/parsers/rules.ts`
- Modify: `modules/imports/domain/parsers/rules.test.ts`
- Create: `supabase/migrations/20260814092000_tracking_scan_import_apply.sql`
- Create: `supabase/tests/database/103_tracking_scan_import.test.sql`

- [ ] **Step 1: Add failing tests for the new import type definition**, following the `flange_progress` test additions in `import-type.test.ts`.

  ```ts
  assert.ok(IMPORT_TYPES.includes("tracking_scan"))
  const def = getImportTypeDefinition("tracking_scan")
  assert.deepEqual(def.naturalKey, ["spool_number", "location_code", "occurred_on", "direction"])
  assert.ok(def.columns.some((c) => c.key === "device_code" && !c.required))
  ```

  Run: `node --import tsx --test modules/imports/domain/import-type.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Add the definition**, following the `flange_progress` shape exactly (see `modules/imports/domain/import-type.ts` lines 91–108).

  ```ts
  tracking_scan: {
    importType: "tracking_scan",
    label: "Tracking scan",
    naturalKey: ["spool_number", "location_code", "occurred_on", "direction"],
    columns: [
      { key: "iso_number", header: "ISO Number", required: true, kind: "text" },
      { key: "spool_number", header: "Spool Number", required: true, kind: "text" },
      { key: "location_code", header: "Location Code", required: true, kind: "text" },
      { key: "direction", header: "Direction", required: true, kind: "text" },
      { key: "occurred_on", header: "Occurred On", required: true, kind: "text" },
      { key: "device_code", header: "Device Code", required: false, kind: "text" },
    ],
  },
  ```

  Note the natural key here is a deduplication key for a repeated-import scan feed, not a "one effective row" key like `flange_progress`'s — re-importing the same scan file twice must not create duplicate events. Task 8 Step 8's apply logic enforces this with an existence check, not the supersede-on-conflict pattern flange progress uses.

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Add failing row-validation tests**, following the `flange_progress` block in `rules.test.ts`.

  ```ts
  // rules.test.ts (add)
  const badDirection = makeRow({ direction: "sideways" })
  applyTypeRules("tracking_scan", [badDirection], issues)
  assert.ok(issues.some((i) => i.code === "INVALID_DIRECTION"))

  const badDate = makeRow({ occurred_on: "not-a-date" })
  applyTypeRules("tracking_scan", [badDate], issues)
  assert.ok(issues.some((i) => i.code === "INVALID_DATE"))
  ```

  Run: `node --import tsx --test modules/imports/domain/parsers/rules.test.ts`
  Expected: FAIL.

- [ ] **Step 5: Implement the validation**, following the `flange_progress` block in `rules.ts` (lines 124–138).

  ```ts
  if (importType === "tracking_scan") {
    const direction = row.normalizedValues.direction
    if (typeof direction !== "string" || !["in", "out", "manual"].includes(direction.toLowerCase())) {
      issues.push({ rowNumber: row.rowNumber, columnName: "direction", severity: "blocker", code: "INVALID_DIRECTION", message: "Direction must be in, out, or manual." })
    }
    const date = row.normalizedValues.occurred_on
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
      issues.push({ rowNumber: row.rowNumber, columnName: "occurred_on", severity: "blocker", code: "INVALID_DATE", message: "Occurred On must be a valid YYYY-MM-DD date." })
    }
  }
  ```

- [ ] **Step 6: Run the test.** Expected: PASS.

- [ ] **Step 7: Write the failing pgTAP apply test**, asserting a staged `tracking_scan` job applies to `spool_location_events` via `record_location_event_invariant` with `source = 'scan_import'`, and that re-applying the identical file a second time inserts zero additional rows (idempotent on natural key, not just idempotency-key — a real scan file re-import is common and must not double-count transit/location history).

  Run: `supabase test db --local supabase/tests/database/103_tracking_scan_import.test.sql`
  Expected: FAIL.

- [ ] **Step 8: Write the apply migration**, following the `staged_flange`/apply shape in `20260803092000_spooling_import_apply.sql` (lines ~460–530) for staging, but calling `record_location_event_invariant` per staged row instead of a direct table insert — inside the loop, `select 1 from public.spool_location_events where project_id = ... and spool_revision_id = ... and location_id = ... and direction = ... and occurred_on = ... limit 1` first and skip the row if found, so repeated imports of the same file are no-ops. Resolve `spool_number`/`iso_number` to `spool_revision_id` through the existing accepted-revision lookup pattern (`spools`/`spool_revisions`/`isometric_revisions`), and `location_code`/`device_code` to `location_id`/`device_id` through `project_locations`/`project_devices` lookups scoped to the job's project, raising a blocker issue on the staging row if either lookup misses.

- [ ] **Step 9: Run the pgTAP test.** Expected: PASS.

- [ ] **Step 10: Full focused verification.**

  ```bash
  node --import tsx --test modules/imports/domain/import-type.test.ts modules/imports/domain/parsers/rules.test.ts
  supabase test db --local supabase/tests/database/103_tracking_scan_import.test.sql
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 11: Suggested checkpoint.**

  Suggested commit message: `feat(imports): add tracking_scan import type`.

## Task 9: Add the admin-only 3-file data-dump export

Matches the manual's CC-12 export exactly: "Reports → Data Dump → Spool Tracking → 3 files (Active Spool List, Sub Locations, PDA users)".

**Files:**

- Create: `modules/tracking/infrastructure/supabase-tracking-export.ts`
- Create: `modules/tracking/infrastructure/supabase-tracking-export.test.ts`

- [ ] **Step 1: Write failing tests** asserting each export function returns a CSV string with the right header row and is gated by `can_administer_project`.

  ```ts
  test("buildActiveSpoolListCsv includes iso, spool, and location columns", () => {
    const csv = buildActiveSpoolListCsv([{ isoNumber: "ISO-1", spoolNumber: "SP-1", locationCode: "LOC-1", startFabOn: "2026-08-01" }])
    assert.match(csv.split("\n")[0], /iso_number,spool_number,location_code,start_fab_on/)
  })

  test("exportTrackingData throws when the caller cannot administer the project", async () => {
    const client = fakeClient({ canAdminister: false })
    await assert.rejects(() => exportTrackingData(client, "p-1"))
  })
  ```

  Run: `node --import tsx --test modules/tracking/infrastructure/supabase-tracking-export.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement three pure CSV builders** (`buildActiveSpoolListCsv`, `buildSubLocationsCsv`, `buildPdaUsersCsv` — plain string-join functions, no I/O, easy to unit test) plus one `exportTrackingData(client, projectId)` orchestrator that: checks `client.rpc("can_administer_project", { target_project_id: projectId })` (or the equivalent existing read path other admin-only screens use — check how an existing admin-only action in this codebase confirms the caller is an admin client-side before offering the action, and match it), loads `spool_tracking_status` joined with spool/iso identity for the Active Spool List, `project_locations` for Sub Locations, and `project_devices` joined with `project_device_users`/`profiles` for PDA Users, and returns the three CSV strings.

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): add the 3-file data-dump export`.

## Task 10: Replace the Dashboard placeholder

**Files:**

- Create: `modules/tracking/ui/tracking-dashboard-screen.tsx`
- Create: `modules/tracking/ui/tracking-dashboard-screen.test.ts`
- Modify: `app/tracking/page.tsx`

- [ ] **Step 1: Add failing behavior tests** asserting the screen renders the cumulative-%-scanned figure, the active-spool count, and the area-capacity map, and that it does **not** render trend arrows, a refresh button, or a print button — the findings doc (`docs/research/presentation_findings.md` line ~927) calls those low priority for demo, so this plan explicitly excludes them.

  Run: `node --import tsx --test modules/tracking/ui/tracking-dashboard-screen.test.ts`
  Expected: FAIL — component does not exist.

- [ ] **Step 2: Implement the screen.** Three widgets, each backed by a repository read from Task 7: cumulative % scanned (`count(spool_current_location) / count(all project spool_revisions)`), active spool count (`count(*) from spool_tracking_status where is_active`), and a per-location occupied-spool count table (`project_locations` has no `capacity` column in the current schema, so this renders occupancy only, not capacity-vs-quantity — note that limitation in the walkthrough doc, matching "keep this maximally simple" scope). Follow `modules/flange/ui/flange-management-screen.tsx`'s data-loading/request-versioning pattern (project-change invalidates in-flight loads) exactly.

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Replace the placeholder.**

  ```tsx
  // app/tracking/page.tsx
  import { TrackingDashboardScreen } from "@/modules/tracking/ui/tracking-dashboard-screen"

  export default function TrackingPage() {
    return <TrackingDashboardScreen />
  }
  ```

- [ ] **Step 5: Full focused verification.**

  ```bash
  node --import tsx --test modules/tracking/ui/tracking-dashboard-screen.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): replace the dashboard placeholder`.

## Task 11: Replace the Data Analysis placeholder (4 tabs)

**Files:**

- Create: `modules/tracking/ui/tracking-data-analysis-screen.tsx`
- Create: `modules/tracking/ui/tracking-data-analysis-screen.test.ts`
- Modify: `app/tracking/data-analysis/page.tsx`

- [ ] **Step 1: Add failing behavior tests** for all 4 tabs (per `docs/research/presentation_findings.md` lines 934–980): Spool Location (search by iso or barcode/spool number, detail panel with location + duration + history, a manual "Add" action that calls `recordLocationEvent` from Task 7's application layer and never overwrites), Location (list, click through to spools currently there, erected spools excluded), Design Area (list by PDS area, click through, erected excluded), Consolidation Reports (rows from `spool_tracking_inconsistencies` and `spool_transit_alerts`, grouped by location).

  Run: `node --import tsx --test modules/tracking/ui/tracking-data-analysis-screen.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the screen** as four `Tabs`/`TabsContent` panels (reuse the `Tabs` component already used in `execution-reference-tabs.tsx`). "Erected excluded" means filtering by `spool_tracking_status.is_active` in the Location and Design Area tabs only — the Spool Location tab explicitly keeps erected history visible, per the manual ("Tracking history of erected spool is still viewable here"). The "Add" action opens a small form (location select, direction, occurred-on date, optional device) and calls the Task 7 application function; on success it must refetch the affected spool's history, never locally patch state, matching the durable-refresh convention already used in `modules/flange/ui/flange-management-screen.tsx`.

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Replace the placeholder.**

  ```tsx
  // app/tracking/data-analysis/page.tsx
  import { TrackingDataAnalysisScreen } from "@/modules/tracking/ui/tracking-data-analysis-screen"

  export default function TrackingDataAnalysisPage() {
    return <TrackingDataAnalysisScreen />
  }
  ```

- [ ] **Step 5: Full focused verification.**

  ```bash
  node --import tsx --test modules/tracking/ui/tracking-data-analysis-screen.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): replace the data-analysis placeholder`.

## Task 12: Replace the Barcode Printing placeholder

**Files:**

- Create: `modules/tracking/ui/tracking-barcode-screen.tsx`
- Create: `modules/tracking/ui/tracking-barcode-screen.test.ts`
- Modify: `app/tracking/print-barcodes/page.tsx`

- [ ] **Step 1: Add failing behavior tests** asserting: search panel on the left (by iso or spool number), a basket on the right that accumulates selected spools without duplicates, an "Export" action that produces a CSV/XLSX download containing exactly the basket's spools, and that the screen renders **no** barcode image or QR code anywhere — the manual exports to Excel and prints externally via Zebra software (`docs/research/presentation_findings.md` lines 986–1004).

  Run: `node --import tsx --test modules/tracking/ui/tracking-barcode-screen.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the two-column basket UI** and a plain client-side CSV export of the basket (iso, spool number, current location). No new backend endpoint is needed — this reads the same spool/current-location data Task 10/11 already load.

- [ ] **Step 3: Run the test.** Expected: PASS.

- [ ] **Step 4: Replace the placeholder.**

  ```tsx
  // app/tracking/print-barcodes/page.tsx
  import { TrackingBarcodeScreen } from "@/modules/tracking/ui/tracking-barcode-screen"

  export default function TrackingPrintBarcodesPage() {
    return <TrackingBarcodeScreen />
  }
  ```

- [ ] **Step 5: Full focused verification.**

  ```bash
  node --import tsx --test modules/tracking/ui/tracking-barcode-screen.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): replace the barcode-printing placeholder`.

## Task 13: Wire navigation, route capabilities, and the landing page

**Files:**

- Modify: `config/navigation.ts`
- Modify: `config/route-capabilities.ts`
- Modify: `config/route-capabilities.test.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add failing route-capability tests**, following the pattern already used for `/erection/flange-progress`.

  ```ts
  assert.equal(requiredCapabilityForPath("/tracking"), "tracking.view")
  assert.equal(requiredCapabilityForPath("/tracking/data-analysis"), "tracking.view")
  assert.equal(requiredCapabilityForPath("/tracking/print-barcodes"), "tracking.view")
  ```

  Run: `node --import tsx --test config/route-capabilities.test.ts`
  Expected: These likely already PASS if `/tracking` already maps to `tracking.view` generically — if so, this step confirms rather than changes anything; only add a fix if the test fails.

- [ ] **Step 2: Remove the `planned: 'Track 08'` marker from the Tracking entry** in `config/navigation.ts` (line ~258) and the `live: false, note: "Track 08"` marker in `app/page.tsx` (line ~62), following exactly how Track 09 flipped its own two markers in the same two files.

- [ ] **Step 3: Full focused verification.**

  ```bash
  node --import tsx --test config/route-capabilities.test.ts
  npm run typecheck
  npm run build
  ```

  Expected: PASS; build contains all three real tracking routes.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(tracking): mark the module live in navigation`.

## Task 14: Deterministic local fixtures and the browser walkthrough

**Files:**

- Create: `scripts/bootstrap-track08-browser-fixtures.ts`
- Create: `scripts/bootstrap-track08-browser-fixtures.test.ts`
- Create: `scripts/tracking-scans.txt`
- Create: `docs/qa/track-08-agent-walkthrough.md`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/tracking-scans.txt`**, a `tracking_scan` fixture file matching the columns from Task 8, referencing the same `ISO-T4-001`/`SP-T4-001-A`/`SP-T4-001-B` spools every prior track's fixtures already use.

  ```
  ISO_NUMBER	SPOOL_NUMBER	LOCATION_CODE	DIRECTION	OCCURRED_ON	DEVICE_CODE
  ISO-T4-001	SP-T4-001-A	T8-YARD	in	2026-08-10	T8-PDA-01
  ISO-T4-001	SP-T4-001-B	T8-YARD	in	2026-08-10	T8-PDA-01
  ```

- [ ] **Step 2: Write `scripts/bootstrap-track08-browser-fixtures.ts`**, following `scripts/bootstrap-track09-browser-fixtures.ts`'s exact shape: refuse a non-localhost `SUPABASE_URL`, require `SUPABASE_SERVICE_ROLE_KEY` out of band, look up the `TRACK01-A` project, upsert one `T8-` location category, one `T8-YARD` location (with `mapped_progress_columns: ["start_fab"]` so the stage-mismatch flag has a real chance to fire correctly in the walkthrough), one `project_tracking_settings` row, and one `T8-PDA-01` device — then assert a subsequent `spool_current_location` read returns rows for the fixture spools (this will only be true after the fixture importer, Track 05's script extended in the same way Track 09 extended it, has actually run the `tracking_scan` import — call that out as a precondition in the script's error message, exactly like Track 09's script did for the flange fixture).

- [ ] **Step 3: Add the npm script.**

  ```json
  "bootstrap:track08-browser-fixtures": "tsx scripts/bootstrap-track08-browser-fixtures.ts",
  ```

- [ ] **Step 4: Write `docs/qa/track-08-agent-walkthrough.md`**, following `docs/qa/track-09-agent-walkthrough.md`'s structure: numbered steps for reader read-only, manual "Add" location entry + refresh, transit-alert and stage-mismatch flags appearing in Consolidation Reports, the 3-file export producing plausible CSVs, and an evidence table with PASS/FAIL/BLOCKED columns left for the browser session to fill in — do not pre-fill PASS rows in this task, that happens only after an actual browser run.

- [ ] **Step 5: Run the full headless chain**, mirroring how Track 09's browser fixtures were verified end to end in this same checkout: `bootstrap:track01` → `track03` → `track04` → `track05` (now importing `tracking-scans.txt` too) → `track08`, and confirm the final script reports fixture spools with a current location. Do not run `supabase db reset` first without asking — check with the user, since Track 10 may have uncommitted local data in this checkout right now.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(qa): add Track 08 browser fixtures and walkthrough`.

## Task 15: Full regression, deferred-work note, and documentation closeout

**Files:**

- Modify: `docs/deferred-work.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`

- [ ] **Step 1: Add one short entry to `docs/deferred-work.md`**, matching its existing entry format but kept brief (this is explicitly a short pointer, not a full T02-D4-style writeup):

  ```markdown
  ### T08-D1 — offline-first PWA sync was descoped to the manual's file-based exchange

  **Deferred 2026-08-1X.** Track 08 ships location tracking, the three real screens, and an
  admin-only 3-file export / `tracking_scan` import — exactly what the Easy Piping manual does.
  The master roadmap's original ambition (installable PWA, IndexedDB offline queue, per-item
  sync conflict resolution, device revocation) is not in the manual and is deferred to a future
  Track 8b if ever prioritized.

  **Risk if left.** Low — field data entry works today through the browser and the file
  exchange; only true offline capture is missing.
  ```

- [ ] **Step 2: Update the master roadmap's Track 8 section** with a one-paragraph status note, following the exact style Track 09 used in the same document (search for "Статус на 2026-08-05" and match its shape, dated for whenever this plan actually executes).

- [ ] **Step 3: Full regression.**

  ```bash
  npm run lint
  npm run typecheck
  npm run test:unit
  npm run test:db
  npm run build
  git diff --check
  ```

  Expected: lint clean (0 errors, warning count no higher than before this plan started), typecheck clean, all unit tests pass, all pgTAP tests pass, build succeeds with the three real tracking routes, no whitespace errors.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `docs(deferred): record the Track 8b offline-PWA deferral`.

## Final acceptance checklist

- [ ] Locations, Location Categories, and Devices have real create paths in the project-setup UI (Tasks 1–2).
- [ ] `spool_location_events` is append-only in the database, not just in application code (Task 3's trigger fires for every role, verified in Task 4's pgTAP test).
- [ ] Manual entry and scan import both call `record_location_event`/its invariant function — no second write path exists (Tasks 4, 8).
- [ ] Current location, active-spool status, transit alerts, and stage-mismatch inconsistencies are all derived read models, none hand-maintained (Task 5).
- [ ] The three real screens replace all three `NotOnSupabaseYet` placeholders and the module shows `live` everywhere it's referenced (Tasks 10–13).
- [ ] The admin-only 3-file export and the `tracking_scan` import together reproduce the manual's CC-12 data-dump/import mechanism with no offline queue anywhere (Tasks 8–9).
- [ ] `npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run build` all pass (Task 15).
- [ ] `docs/deferred-work.md` records the offline-PWA deferral in one short entry (Task 15).
- [ ] The browser walkthrough doc exists with an evidence table, filled in by an actual browser session before Track 08 is called done (Task 14) — automated PASS is not sufficient on its own, per this project's established convention for every prior track.
