# Supabase System Referential Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo-only System Referential screen with Supabase-backed
global lists while preserving demo mode and allowing platform administrators to
manage Material Types safely.

**Architecture:** `public.system_reference_entries` remains the sole global
store for the four kinds. A pure module maps the database enum to screen
sections; a typed Supabase API loads all entries and obtains edit capability
from the existing `is_platform_admin()` database function. In `supabase` mode,
the page renders real data only. The existing demo cards and Zustand behavior
remain untouched behind the app-mode boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict,
`@supabase/supabase-js`, Supabase migrations/pgTAP, Zustand demo mode,
Tailwind/shadcn.

---

## Scope and non-negotiable domain rules

This is a **global**, cross-project referential. It must never be filtered by
the active project or by `membership.projectId`.

`docs/marker-output/manual.md` defines the four lists and their authority:

| Database kind | Screen title | Browser behavior in this slice |
| --- | --- | --- |
| `material_type` | Material Type | Platform administrator can create, edit, deactivate/reactivate, and delete. |
| `film_quantity` | Film Quantity per Diameter | All authenticated users may view; no browser mutations. |
| `ut_calculation` | UT Calculation | All authenticated users may view; no browser mutations. |
| `torquing_requirement` | Torquing Requirement | All authenticated users may view; no browser mutations. |

Do not invent structured fields for film quantity, UT calculation, or torque
rules: the current schema deliberately stores only `code`, `description`,
`attributes`, and `status`. Do not migrate mock rows or seed values. Empty
lists are a valid initial state.

Material Type deletion is intentionally attempted through the database only;
existing `ON DELETE RESTRICT` foreign keys protect material types already used
by `project_service_classes` or `project_welding_procedures`. The UI must show
a safe generic refusal if the database rejects the deletion. It must not delete
dependent project data.

The browser never treats membership role as authority. `is_platform_admin()`
is the capability source for UI affordances, while PostgreSQL grants and RLS
remain the final enforcement.

## File map

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260729170000_grant_system_referential_privileges.sql` | Least-privilege browser grants for reading all lists and managing allowed Material Type fields. |
| `supabase/tests/database/001_project_settings_and_referentials.test.sql` | Positive and negative pgTAP privilege assertions. |
| `lib/system-referentials.ts` | Pure enum-to-section map, validation, mapping, and safe Material Type payloads. |
| `lib/system-referentials.test.ts` | Pure contract tests. |
| `lib/supabase/system-referentials.ts` | Typed load/capability/create/update/status/delete calls. |
| `lib/supabase/system-referentials.test.ts` | Fake-client query-shape and error-path tests. |
| `components/admin/supabase-system-referential-view.tsx` | Supabase-only view: loading/error/read-only/manage-Material-Type UI. |
| `app/admin/system-referential/page.tsx` | App-mode switch: unchanged demo cards vs. new Supabase view. |
| `docs/SUPABASE_BACKEND_FOUNDATION.md` | Completion status and next vertical slice after acceptance. |

## Task 1: Add explicit database privileges without weakening RLS

**Files:**
- Create: `supabase/migrations/20260729170000_grant_system_referential_privileges.sql`
- Modify: `supabase/tests/database/001_project_settings_and_referentials.test.sql`

- [ ] **Step 1: Add failing pgTAP assertions before the migration.**

Increase the existing `plan(...)` count by 12 and add these assertions before
`finish()`:

```sql
select ok(
  has_table_privilege('authenticated', 'public.system_reference_entries', 'select'),
  'authenticated can read system referential entries before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'kind', 'insert'),
  'authenticated can set a system reference kind when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'code', 'insert'),
  'authenticated can set a system reference code when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'description', 'insert'),
  'authenticated can set a system reference description when inserting'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'code', 'update'),
  'authenticated can update a system reference code before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'description', 'update'),
  'authenticated can update a system reference description before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.system_reference_entries', 'status', 'update'),
  'authenticated can update a system reference status before RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.system_reference_entries', 'delete'),
  'authenticated can request system reference deletion before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'kind', 'update'),
  'authenticated cannot reclassify a system reference kind'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'attributes', 'update'),
  'authenticated cannot overwrite unmodelled system reference attributes'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'created_at', 'update'),
  'authenticated cannot alter a system reference creation timestamp'
);
select ok(
  not has_column_privilege('authenticated', 'public.system_reference_entries', 'updated_at', 'update'),
  'authenticated cannot alter a system reference update timestamp'
);
```

- [ ] **Step 2: Verify RED without resetting the local database.**

Run:

```bash
/opt/homebrew/bin/supabase test db
```

Expected: only the newly added system-referential privilege assertions fail.
Do not run `supabase db reset`: the local user and first project are test data
owned by the developer.

- [ ] **Step 3: Write the forward-only privilege migration.**

Create exactly this SQL:

```sql
grant select on public.system_reference_entries to authenticated;

grant insert (kind, code, description)
  on public.system_reference_entries to authenticated;

grant update (code, description, status)
  on public.system_reference_entries to authenticated;

grant delete on public.system_reference_entries to authenticated;
```

Do not add `attributes`, `kind` update, table-wide update, service-role keys,
or any new RLS policy. The existing `platform admins manage system
referentials` policy is the authorization boundary.

- [ ] **Step 4: Apply and verify GREEN.**

Run:

```bash
/opt/homebrew/bin/supabase migration up --local
/opt/homebrew/bin/supabase test db
```

Expected: only the new migration applies; all pgTAP checks pass.

## Task 2: Define the pure System Referential contract

**Files:**
- Create: `lib/system-referentials.ts`
- Create: `lib/system-referentials.test.ts`

- [ ] **Step 1: Write the failing assertion script.**

Create tests that require:

```ts
assert.equal(toSystemReferentialSection("material_type"), "materialTypes")
assert.equal(toSystemReferentialSection("film_quantity"), "filmQty")
assert.equal(toSystemReferentialSection("ut_calculation"), "utCalc")
assert.equal(toSystemReferentialSection("torquing_requirement"), "torquing")

assert.deepEqual(
  validateMaterialType({ code: " MAT-01 ", description: " Carbon steel " }),
  {
    isValid: true,
    errors: {},
    value: { code: "MAT-01", description: "Carbon steel" },
  },
)
```

Add invalid cases for a blank code and blank description. Add a payload-key
assertion proving `toMaterialTypeInsert` contains only `kind`, `code`, and
`description`, while `toMaterialTypeUpdate` contains only `code` and
`description`.

- [ ] **Step 2: Run RED.**

Run:

```bash
node --import tsx lib/system-referentials.test.ts
```

Expected: failure because the module is missing.

- [ ] **Step 3: Implement `lib/system-referentials.ts`.**

Use generated types:

```ts
type SystemReferenceRow = Database["public"]["Tables"]["system_reference_entries"]["Row"]
export type SystemReferenceKind = Database["public"]["Enums"]["system_reference_kind"]
```

Define these public values and functions:

```ts
export const SYSTEM_REFERENCE_SECTIONS = {
  materialTypes: { kind: "material_type", title: "Material Type", mutable: true },
  filmQty: { kind: "film_quantity", title: "Film Quantity per Diameter", mutable: false },
  utCalc: { kind: "ut_calculation", title: "UT Calculation", mutable: false },
  torquing: { kind: "torquing_requirement", title: "Torquing Requirement", mutable: false },
} as const

export function toSystemReferentialSection(kind: SystemReferenceKind): SystemReferentialSection
export function toSystemReferenceEntry(row: Pick<SystemReferenceRow, "id" | "kind" | "code" | "description" | "status" | "created_at" | "updated_at">): SystemReferenceEntry
export function validateMaterialType(input: MaterialTypeInput): MaterialTypeValidation
export function toMaterialTypeInsert(input: MaterialTypeInput): { kind: "material_type"; code: string; description: string }
export function toMaterialTypeUpdate(input: MaterialTypeInput): { code: string; description: string }
```

Trim but do not uppercase codes: the database only requires non-empty code and
existing material codes are not guaranteed to use one convention. Map DB
`status === "active"` to the UI `active` boolean only if the UI needs that
field; retain the raw status in the API model so deactivation maps exactly to
`inactive` and reactivation to `active`.

- [ ] **Step 4: Run GREEN and strict typecheck.**

Run:

```bash
node --import tsx lib/system-referentials.test.ts
npx tsc --noEmit --incremental false
```

Expected: both exit `0`.

## Task 3: Build typed global Supabase operations

**Files:**
- Create: `lib/supabase/system-referentials.ts`
- Create: `lib/supabase/system-referentials.test.ts`

- [ ] **Step 1: Write the fake-client tests before implementation.**

The fake client must record query shape and assert all of the following:

- `loadSystemReferentials` selects exactly
  `id, kind, code, description, status, created_at, updated_at`, orders by
  `kind` then `code`, and calls `rpc("is_platform_admin")` in parallel;
- `createMaterialType` inserts the safe three-key payload and returns the
  bounded selected row;
- `updateMaterialType` uses `.eq("id", entryId)` **and**
  `.eq("kind", "material_type")`;
- `setMaterialTypeStatus` updates only `{ status: "active" | "inactive" }`
  and has both exact filters;
- `deleteMaterialType` has both exact filters;
- read, capability, create, update, status, and delete errors reject as
  `Error` values and return no fallback data.

- [ ] **Step 2: Run RED.**

Run:

```bash
node --import tsx lib/supabase/system-referentials.test.ts
```

Expected: failure because the API module is absent.

- [ ] **Step 3: Implement the API.**

Create these functions, all accepting `SupabaseClient<Database>` explicitly:

```ts
export async function loadSystemReferentials(client): Promise<{
  entries: SystemReferenceEntry[]
  canManage: boolean
}>

export async function createMaterialType(client, input): Promise<SystemReferenceEntry>
export async function updateMaterialType(client, entryId, input): Promise<SystemReferenceEntry>
export async function setMaterialTypeStatus(client, entryId, status: "active" | "inactive"): Promise<SystemReferenceEntry>
export async function deleteMaterialType(client, entryId): Promise<void>
```

Use a single `SYSTEM_REFERENTIAL_SELECT` constant containing the seven listed
columns. `loadSystemReferentials` uses `Promise.all` for the select and the
`is_platform_admin` RPC. `canManage` is true only when the RPC returns exactly
`true`. Do not infer it from `membership.role`.

For mutation failures, convert the Supabase error into `Error`; callers must
show generic wording. In particular, do not expose the foreign-key detail when
deletion of an in-use Material Type is rejected.

- [ ] **Step 4: Run GREEN.**

Run:

```bash
node --import tsx lib/system-referentials.test.ts
node --import tsx lib/supabase/system-referentials.test.ts
npx tsc --noEmit --incremental false
```

Expected: all exit `0`.

## Task 4: Create the Supabase-only System Referential view

**Files:**
- Create: `components/admin/supabase-system-referential-view.tsx`

- [ ] **Step 1: Keep the existing demo component out of this view.**

Do not import `useAdminStore` or `SystemReferentialCard`. The component receives
no project ID and must use only `getSupabaseBrowserClient()` and the typed API.

- [ ] **Step 2: Implement load and view state.**

On mount, call `loadSystemReferentials(getSupabaseBrowserClient())`. Use a
disposed/request-version guard so a late response cannot overwrite Retry. Show:

- a short loading card while waiting;
- a generic error card with a `Retry` button on any load/capability error;
- the four section cards from `SYSTEM_REFERENCE_SECTIONS` after success;
- an explicit empty state per section, not demo rows;
- a read-only note whenever `canManage` is false.

All authenticated users can see all four lists. Do not hide the page merely
because the user cannot manage entries.

- [ ] **Step 3: Implement Material Type controls only when `canManage`.**

For the `materialTypes` section:

- inline Code + Description inputs and an Add button call
  `createMaterialType`;
- each entry has Edit, Deactivate/Reactivate, and Delete actions;
- edit opens a small controlled dialog or inline row editor with Code and
  Description, then calls `updateMaterialType`;
- delete uses an explicit confirmation dialog naming the code, then calls
  `deleteMaterialType`;
- all successful mutations replace that entry in local data (or append/remove
  it) and show a success toast;
- every mutation failure preserves the existing rows/form inputs, ends the
  busy state, and shows a generic toast such as `Unable to save material type`.

Render no Add/Edit/status/delete controls for the other three sections even
when `canManage` is true. This follows manual sections 2.2–2.4, which describe
them as static lists.

- [ ] **Step 4: Respect local status semantics.**

`Deactivate` writes `inactive`; `Reactivate` writes `active`. Do not archive
or delete from the status action. Delete is the only destructive action and is
limited to Material Type.

- [ ] **Step 5: Validate before each Material Type save.**

Use `validateMaterialType`. Render inline code/description errors for form and
editor. Do not rely on an in-memory duplicate lookup as a correctness check:
the database unique constraint `(kind, code)` is authoritative.

## Task 5: Switch the route by app mode without changing demo mode

**Files:**
- Modify: `app/admin/system-referential/page.tsx`

- [ ] **Step 1: Preserve the current render tree as a demo-only component.**

Keep the existing header and four `SystemReferentialCard` instances exactly for
`useAppMode() === "demo"`.

- [ ] **Step 2: Render the new Supabase view in real mode.**

Use:

```tsx
const appMode = useAppMode()

return (
  <div className="space-y-4">
    <AdminPageHeader
      title="Admin · System Referential"
      description="Cross-project referentials maintained at system-admin scope."
    />
    {appMode === "demo" ? <DemoSystemReferentialCards /> : <SupabaseSystemReferentialView />}
  </div>
)
```

Do not change `components/admin/system-referential-card.tsx` unless a TypeScript
import requires a type-only adjustment. Its existing Zustand behavior is the
demo contract.

## Task 6: Documentation and complete verification

**Files:**
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`

- [ ] **Step 1: Update delivery status after implementation.**

Mark Supabase-backed System Referential as complete only after all checks and
manual acceptance pass. State precisely that Material Type is managed by
platform administrators and the other three lists are read-only until their
structured domain contracts are introduced. Set the next unstarted slice to
**active-project selection / multi-membership context**, not project
referentials.

- [ ] **Step 2: Run the complete automated suite.**

Keep the local Supabase stack running. Run:

```bash
/opt/homebrew/bin/supabase test db
node --import tsx lib/app-mode.test.ts
node --import tsx lib/supabase/config.test.ts
node --import tsx lib/supabase/browser-client.test.ts
node --import tsx contexts/supabase-auth-state.test.ts
node --import tsx components/pipeqc/app-shell-state.test.ts
node --import tsx components/pipeqc/top-nav-state.test.ts
node --import tsx lib/project-definition.test.ts
node --import tsx lib/supabase/project-definition.test.ts
node --import tsx lib/system-referentials.test.ts
node --import tsx lib/supabase/system-referentials.test.ts
npx tsc --noEmit --incremental false
NEXT_PUBLIC_PIPEQC_MODE=demo npm run build
git diff --check
```

Expected: every command exits `0`. If the build cannot fetch Google Fonts in a
sandbox, rerun only the build with approved network access and report that
environmental limitation; do not change fonts merely to make the check pass.

- [ ] **Step 3: Manual browser acceptance in Supabase mode.**

With a platform-admin user:

1. Open `/admin/system-referential`; verify all four sections load from the
   database and display no demo rows.
2. Add a Material Type, edit its description, deactivate it, reactivate it,
   then delete it. Refresh after each operation where practical.
3. Create a Material Type that is referenced by a project service class or WPS
   only through a reviewed DB setup; attempt Delete and confirm the UI keeps
   the row and reports a generic refusal.
4. Verify Film Quantity, UT Calculation, and Torquing have no mutation
   controls.

With an authenticated non-platform-admin user:

5. Verify all lists remain visible but Material Type controls are absent and
   direct browser mutations receive no data change because RLS denies them.

- [ ] **Step 4: Manual demo acceptance.**

Restart Next.js with `NEXT_PUBLIC_PIPEQC_MODE=demo`. Confirm the existing four
demo cards still add/toggle local rows and no Supabase browser client is
initialized.

## Plan self-review

- Scope is deliberately one global referential screen; active-project selection,
  project referentials, Storage, imports, and operational data remain outside.
- Manual behavior is derived from `docs/marker-output/manual.md` §§2.1–2.4:
  Material Type is mutable; Film Quantity, UT Calculation, and Torquing are
  static.
- Every browser mutation has an explicit PostgreSQL privilege, RLS policy, safe
  typed payload, and test path. Browser capability is not an authority.
- The plan contains no mock-data migration and does not alter the user’s local
  account/project through `db reset`.
