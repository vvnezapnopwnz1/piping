# Supabase WPS CRUD Implementation Plan

> **For agentic workers:** Execute task-by-task and check off only verified steps. The owner controls staging, commits, and pushes; do not perform Git write operations.

**Goal:** Deliver a real-mode, project-scoped WPS List CRUD vertical while leaving the current Zustand demo WPS UI unchanged.

**Architecture:** public.project_welding_procedures stays the source of truth. A pure module normalizes and validates form input; a typed Supabase adapter receives the explicit active project ID and is the only path that creates database write payloads. AdminTabs switches between the preserved demo tab and a new Supabase-only tab. PostgreSQL grants, RLS, constraints, triggers, and FKs remain final authority.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, @supabase/supabase-js, Supabase migrations/pgTAP, shadcn UI, Zustand demo mode.

---

## Approved contract and non-goals

| Form field | Database column | Rule |
| --- | --- | --- |
| Code | code | Required, trimmed; unique with revision within a project. |
| Description | description | Optional; blank becomes null. |
| Process | process | Required, trimmed free text; do not invent a demo-only catalog. |
| Material Type | material_type_id | Required active global material_type entry. |
| Subcontractor | subcontractor_id | Required active subcontractor from the explicit active project. |
| Diameter From / To | diameter_from / diameter_to | Required finite non-negative decimals; to >= from. |
| Thickness From / To | thickness_from / thickness_to | Required finite non-negative decimals; to >= from. |
| Revision | revision | Required, trimmed. |
| Approval date | approved_on | Required ISO date. |
| Lifecycle | status | New WPS is active; admin may set inactive or archived and reactivate to active. |

The forward migration changes subcontractor_id to NOT NULL. It must refuse if existing WPS rows contain NULL; it must not select an arbitrary subcontractor or rewrite historical rows.

Do not add demo-only baseMaterial, fillerMaterial, positions, string ranges, simulated latency, or Superseded. There is deliberately no hard delete control or DELETE privilege. Inactive/archived rows stay readable as history, which preserves the ON DELETE RESTRICT boundary for current/future welder_wps_qualifications. Import coverage warnings and Welder Qualification CRUD are out of scope.

## File map

| File | Responsibility |
| --- | --- |
| supabase/migrations/20260729190000_wps_crud_contract.sql | Null-data guard, mandatory subcontractor, and least-privilege grants. |
| supabase/tests/database/001_project_settings_and_referentials.test.sql | pgTAP contract/privilege assertions. |
| lib/welding-procedures.ts | Pure types, mapping, validation, and safe payload builders. |
| lib/welding-procedures.test.ts | Pure contract checks. |
| lib/supabase/welding-procedures.ts | Typed reads, capability check, create/update/lifecycle mutations. |
| lib/supabase/welding-procedures.test.ts | Fake-client query shape and error checks. |
| components/admin/supabase-wps-tab.tsx | Supabase-only WPS UI. |
| components/admin/admin-tabs.tsx | Narrow app-mode adapter at the WPS tab boundary. |
| docs/SUPABASE_BACKEND_FOUNDATION.md | Verified completion record after acceptance. |

## Task 1: Lock the database contract before UI work

**Files:**

- Create: supabase/migrations/20260729190000_wps_crud_contract.sql
- Modify: supabase/tests/database/001_project_settings_and_referentials.test.sql

- [ ] **Step 1: Add failing pgTAP assertions.**

Change the existing plan count from 33 to 49. Before finish(), assert:

~~~sql
select col_not_null(
  'public', 'project_welding_procedures', 'subcontractor_id',
  'a WPS must belong to a subcontractor'
);
select ok(
  has_table_privilege('authenticated', 'public.project_welding_procedures', 'select'),
  'authenticated can read WPS rows before RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.project_subcontractors', 'select'),
  'authenticated can read project subcontractors before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'project_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'subcontractor_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'material_type_id', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'code', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'process', 'insert'),
  'authenticated can set required WPS identity fields on insert before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_from', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_to', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_from', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_to', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'revision', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'approved_on', 'insert')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'insert'),
  'authenticated can set WPS bounds, revision, date and lifecycle on insert before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'subcontractor_id', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'material_type_id', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'code', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'description', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'process', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_from', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'diameter_to', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_from', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'thickness_to', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'revision', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'approved_on', 'update')
  and has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'update'),
  'authenticated can update only WPS business fields before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'project_id', 'update'),
  'authenticated cannot move a WPS to another project'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'created_at', 'update')
  and not has_column_privilege('authenticated', 'public.project_welding_procedures', 'updated_at', 'update'),
  'authenticated cannot alter WPS audit timestamps'
);
select ok(
  not has_table_privilege('authenticated', 'public.project_welding_procedures', 'delete'),
  'authenticated cannot hard-delete WPS records'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.project_welding_procedures'::regclass
      and tgname = 'project_wps_subcontractor_tenant'
  ),
  'WPS subcontractor stays constrained to the WPS project'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.project_welding_procedures'::regclass
      and tgname = 'project_wps_material_type_kind'
  ),
  'WPS material type stays constrained to the material_type system kind'
);
~~~

Add these five assertions immediately after the block. Together with the eleven assertions above, they bring the plan from 33 to 49:

~~~sql
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'description', 'insert'),
  'authenticated can set optional WPS description on insert before RLS applies'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'id', 'insert'),
  'authenticated cannot choose a WPS primary key'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'created_at', 'insert')
  and not has_column_privilege('authenticated', 'public.project_welding_procedures', 'updated_at', 'insert'),
  'authenticated cannot choose WPS audit timestamps on insert'
);
select ok(
  not has_column_privilege('authenticated', 'public.project_welding_procedures', 'id', 'update'),
  'authenticated cannot alter a WPS primary key'
);
select ok(
  has_column_privilege('authenticated', 'public.project_welding_procedures', 'status', 'update'),
  'authenticated can request a WPS lifecycle change before RLS applies'
);
~~~

- [ ] **Step 2: Verify RED without resetting local data.**

Run:

~~~bash
/opt/homebrew/bin/supabase test db
~~~

Expected: only the new WPS assertions fail. Never run supabase db reset: the local stack has accepted user/project data.

- [ ] **Step 3: Write the forward-only migration.**

~~~sql
do $$
begin
  if exists (
    select 1
    from public.project_welding_procedures
    where subcontractor_id is null
  ) then
    raise exception
      'Cannot require WPS subcontractor: existing project_welding_procedures rows have NULL subcontractor_id'
      using errcode = '23502';
  end if;
end;
$$;

alter table public.project_welding_procedures
  alter column subcontractor_id set not null;

grant select on public.project_welding_procedures to authenticated;
grant select on public.project_subcontractors to authenticated;

grant insert (
  project_id, subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision,
  approved_on, status
) on public.project_welding_procedures to authenticated;

grant update (
  subcontractor_id, material_type_id, code, description, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision,
  approved_on, status
) on public.project_welding_procedures to authenticated;
~~~

Do not grant DELETE, project_id update, id, created_at, or updated_at. Do not create a new permissive RLS policy: the existing project read/admin-write policies, tenant trigger, material-type-kind trigger, project-ID immutability trigger, and RLS remain the boundaries.

- [ ] **Step 4: Apply and verify GREEN.**

~~~bash
/opt/homebrew/bin/supabase migration up --local
/opt/homebrew/bin/supabase test db
~~~

Expected: only the new migration applies and all 49 checks pass. If the null-data guard rejects it, stop. Report affected WPS IDs with a read-only query and obtain an explicit mapping decision; do not add an automatic remediation migration.

## Task 2: Build the pure WPS contract

**Files:**

- Create: lib/welding-procedures.ts
- Create: lib/welding-procedures.test.ts

- [ ] **Step 1: Write failing tests.**

~~~ts
assert.deepEqual(
  validateWeldingProcedure({
    code: " WPS-001 ", description: " Root pass ", process: " GTAW ",
    materialTypeId: "material-1", subcontractorId: "subcontractor-1",
    diameterFrom: "25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25",
    revision: " Rev.0 ", approvedOn: "2026-07-29",
  }),
  {
    isValid: true, errors: {},
    value: {
      code: "WPS-001", description: "Root pass", process: "GTAW",
      materialTypeId: "material-1", subcontractorId: "subcontractor-1",
      diameterFrom: 25, diameterTo: 300, thicknessFrom: 3, thicknessTo: 25,
      revision: "Rev.0", approvedOn: "2026-07-29",
    },
  },
)
assert.deepEqual(Object.keys(toWeldingProcedureInsert("project-1", validInput)).sort(), [
  "approved_on", "code", "description", "diameter_from", "diameter_to",
  "material_type_id", "process", "project_id", "revision", "status",
  "subcontractor_id", "thickness_from", "thickness_to",
])
assert.deepEqual(Object.keys(toWeldingProcedureUpdate(validInput)).sort(), [
  "approved_on", "code", "description", "diameter_from", "diameter_to",
  "material_type_id", "process", "revision", "subcontractor_id",
  "thickness_from", "thickness_to",
])
~~~

Include blank code/process/revision/date/material/subcontractor; non-numeric, Infinity, negative, and reversed ranges; invalid calendar date; blank description maps to null; and raw database statuses map unchanged without Superseded.

- [ ] **Step 2: Verify RED.**

~~~bash
node --import tsx lib/welding-procedures.test.ts
~~~

Expected: failure because the module is absent.

- [ ] **Step 3: Implement pure types and mapping.**

~~~ts
import type { Database } from "@/lib/supabase/database.types"

type WpsRow = Database["public"]["Tables"]["project_welding_procedures"]["Row"]
export type WpsStatus = Database["public"]["Enums"]["project_reference_status"]

export interface WeldingProcedureInput {
  code: string; description: string; process: string
  materialTypeId: string; subcontractorId: string
  diameterFrom: string; diameterTo: string
  thicknessFrom: string; thicknessTo: string
  revision: string; approvedOn: string
}

export function validateWeldingProcedure(input: WeldingProcedureInput): WeldingProcedureValidation
export function toWeldingProcedure(row: Pick<WpsRow,
  "id" | "project_id" | "subcontractor_id" | "material_type_id" | "code" |
  "description" | "process" | "diameter_from" | "diameter_to" |
  "thickness_from" | "thickness_to" | "revision" | "approved_on" |
  "status" | "created_at" | "updated_at"
>): WeldingProcedure
export function toWeldingProcedureInsert(projectId: string, input: ValidWeldingProcedureInput): WpsInsert
export function toWeldingProcedureUpdate(input: ValidWeldingProcedureInput): WpsUpdate
~~~

Use Number with Number.isFinite(value) && value >= 0. Compare parsed values. Validate ISO dates through a calendar-safe round trip. The form input has no project ID, row ID, timestamps, or lifecycle key. Only the insert mapper takes the explicit project ID; only the lifecycle API constructs a status payload.

- [ ] **Step 4: Verify GREEN.**

~~~bash
node --import tsx lib/welding-procedures.test.ts
npx tsc --noEmit --incremental false
~~~

Expected: both exit 0.

## Task 3: Add the typed project-scoped Supabase adapter

**Files:**

- Create: lib/supabase/welding-procedures.ts
- Create: lib/supabase/welding-procedures.test.ts

- [ ] **Step 1: Write fake-client tests first.**

Prove that loadWeldingProcedures(client, projectId) runs in parallel:

- WPS select uses an explicit selected-column constant, filters .eq("project_id", projectId), and orders code then revision.
- Material Type select filters global system_reference_entries to kind material_type.
- Subcontractor select filters .eq("project_id", projectId).
- The capability call is rpc("can_administer_project", { target_project_id: projectId }).
- Choice lists retain only active Material Types and active Subcontractors; WPS history is loaded for every WPS status.
- Create sends the pure insert payload, update has both id and project_id filters and sends the pure update payload, status update has both filters and sends exactly { status }.
- Read/capability/mutation errors reject as Error and never return fixtures or data for a different project.

- [ ] **Step 2: Verify RED.**

~~~bash
node --import tsx lib/supabase/welding-procedures.test.ts
~~~

Expected: failure because the adapter is absent.

- [ ] **Step 3: Implement the adapter.**

~~~ts
export const WELDING_PROCEDURE_SELECT =
  "id, project_id, subcontractor_id, material_type_id, code, description, process, diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on, status, created_at, updated_at"

export async function loadWeldingProcedures(
  client: SupabaseClient<Database>, projectId: string,
): Promise<LoadedWeldingProcedures>

export async function createWeldingProcedure(
  client: SupabaseClient<Database>, projectId: string, input: ValidWeldingProcedureInput,
): Promise<WeldingProcedure>

export async function updateWeldingProcedure(
  client: SupabaseClient<Database>, projectId: string, wpsId: string, input: ValidWeldingProcedureInput,
): Promise<WeldingProcedure>

export async function setWeldingProcedureStatus(
  client: SupabaseClient<Database>, projectId: string, wpsId: string, status: WpsStatus,
): Promise<WeldingProcedure>
~~~

LoadedWeldingProcedures contains procedures, materialTypes, subcontractors, and canEdit. canEdit is true only when the RPC returns exactly true, never inferred from membership.role. Every WPS read/mutation retains the explicit active project filter even though RLS independently enforces it.

- [ ] **Step 4: Verify GREEN.**

~~~bash
node --import tsx lib/welding-procedures.test.ts
node --import tsx lib/supabase/welding-procedures.test.ts
npx tsc --noEmit --incremental false
~~~

Expected: all exit 0.

## Task 4: Build the real-mode WPS view and retain demo mode

**Files:**

- Create: components/admin/supabase-wps-tab.tsx
- Modify: components/admin/admin-tabs.tsx

- [ ] **Step 1: Add a narrow mode adapter.**

Keep the existing WpsTab import. Add SupabaseWpsTab and useAppMode, then replace only the WPS tab content:

~~~tsx
function WpsModeAdapter() {
  const appMode = useAppMode()
  return appMode === "demo" ? <WpsTab /> : <SupabaseWpsTab />
}

// existing WPS TabsContent:
<WpsModeAdapter />
~~~

Do not edit components/admin/wps-tab.tsx, components/admin/add-wps-dialog.tsx, store/admin-store.ts, demo fixtures, or other tabs.

- [ ] **Step 2: Implement state and active-project safety.**

SupabaseWpsTab reads membership and accessState via useSupabaseAuth. It loads only with a Supabase active membership and passes membership.projectId to the adapter. Use the same disposed/request-version pattern as the accepted system referential view so a response for project A cannot replace state after selecting project B.

Render a loading skeleton, generic error plus Retry, a real empty state, a prerequisite message when no active Material Type or Subcontractor exists, a read-only notice when canEdit is false, and generic failure toasts. Do not fall back to demo rows.

- [ ] **Step 3: Implement the database-shaped list and form.**

Use controlled Code, Description, Process, Material Type, Subcontractor, four range inputs, Revision, and Approval Date fields. Show code, process, labels for Material Type/Subcontractor, numeric ranges, revision, date, and lifecycle; show description only when present. Use the row UUID as React key.

Create/edit must validate via validateWeldingProcedure, then append/replace the returned database row. Disable the in-flight form/action. Lifecycle actions are Deactivate, Archive, and Reactivate; archive needs a confirmation dialog. There is no Delete action. Keep inactive/archived rows visible and labeled.

- [ ] **Step 4: Verify before browser work.**

~~~bash
npx tsc --noEmit --incremental false
npm run build
git diff --check
~~~

Expected: TypeScript and diff checks exit 0; build succeeds. If a Next build fails only downloading a remote font/network asset, record it separately and do not call browser behavior verified.

## Task 5: Acceptance and handoff

**Files:**

- Modify: docs/SUPABASE_BACKEND_FOUNDATION.md

- [ ] **Step 1: Run the focused verification set.**

~~~bash
/opt/homebrew/bin/supabase test db
node --import tsx lib/welding-procedures.test.ts
node --import tsx lib/supabase/welding-procedures.test.ts
npx tsc --noEmit --incremental false
npm run build
git diff --check
~~~

Expected: all local checks pass; report a network/font build limitation separately.

- [ ] **Step 2: Manually accept demo mode.**

With NEXT_PUBLIC_PIPEQC_MODE=demo, open /admin/project-referential?tab=wps. Confirm the existing table, add/edit dialog, demo Supersede behavior, and fixtures have not changed.

- [ ] **Step 3: Manually accept Supabase mode.**

With NEXT_PUBLIC_PIPEQC_MODE=supabase:

1. An empty project shows an empty state, never fixtures.
2. Invalid numbers/reversed ranges are rejected before network writes.
3. An admin can create, edit, deactivate/archive/reactivate a WPS and it persists after reload.
4. Switching active project isolates WPS rows and Subcontractor choices.
5. A non-admin sees permitted WPS rows but no mutation controls; a direct browser write is rejected by PostgreSQL/RLS.
6. Cross-project subcontractors and non-material-type references cannot be used, and no hard delete exists.

- [ ] **Step 4: Document only verified completion.**

Add the WPS vertical to docs/SUPABASE_BACKEND_FOUNDATION.md only after every automated/manual check passes. Record mandatory subcontractor, explicit-project API scope, active/inactive/archived lifecycle, no hard delete, exact verification results, and any build-network limitation. Do not claim import coverage or Welder Qualification support.

- [ ] **Step 5: Handoff with no Git writes.**

Report changed files, applied migrations, results, and unrun browser checks. Leave changes unstaged; do not commit, push, reset, checkout, or reset the database.

## Plan self-review

- The real database columns are mapped; mandatory subcontractor and lifecycle are deliberate.
- Browser privileges are narrow, no delete is granted, and RLS remains authoritative.
- Demo UI/store is preserved behind one tab adapter.
- The plan has explicit TDD, pgTAP, TypeScript, build, diff, and two-mode acceptance gates.
