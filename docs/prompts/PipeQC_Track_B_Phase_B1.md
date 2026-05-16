# Task: PipeQC Track B, Phase B1 — Admin shell + first 3 referentials (Teams + Subcontractors + Welder

Qualifications)

Read `docs/PIPEQC_CONTEXT.md` first (Track B section §3 of the manual). Track A (Pressure Test, all 6 phases A1–A6)
is merged — do not break it.

This slice replaces the `/admin` placeholder with a real tabbed admin shell and ships the first 3 referential tabs.
Two of them (Teams, Subcontractors) are **read + add** to give the "I could set this up myself" demo affordance.
The third (Welder Qualifications) is read-only — it represents engineering-spec data.

A critical secondary goal: **Track A's team-picker dropdowns** (BT-XX in Blinding Preparation, FT-XX in Item
Clearance, LC-XX in Line Check, RT-XX in Reinstatement, J-XXX in Reinstatement) must now read from the admin store
rather than directly importing the seed constants. Adding a new team in admin must make it appear in those pickers
on the next mount.

## Goal

- `/admin` becomes a tabbed page with 3 tabs: **Teams · Subcontractors · Welder Qualifications**.
- Each tab is a single screen with a header, KPI strip, filter row (optional), data table, and (for the first two)
  a `+ Add` action that opens a modal form.
- A new persisted Zustand store `store/admin-store.ts` is the single source of truth for teams + subcontractors.
  Welder Qualifications stays in `lib/welder-qualifications.ts` (read-only — wrap it in a thin selector hook).
- All existing Track A team-pickers switch to reading from the admin store.

## Business context (manual §3, summarised)

A real PipeQC project setup happens before any fabrication: project admin (system_admin role) enters the
**referentials** that the rest of the system uses as drop-down options. This includes subcontractor companies,
welder qualifications, work crews (line check, blinding, finishing, reinstatement), jointers, WPS list, NDE matrix,
rework codes, joint categories X/Y/Z, systems/subsystems, and a dozen other lookup tables.

For the demo we cover only the user-facing ones in B1. Engineering-spec referentials (WPS, NDE Matrix, Rework
Codes) come in B2. Plant taxonomy (Systems/Subsystems, Material Class, Areas) comes in B3.

## Store changes — `store/admin-store.ts` (new file)

```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TeamType =
  | "lineCheck"
  | "blinding"
  | "finishing"
  | "reinstatement"
  | "jointer";

export interface Team {
  code: string; // "BT-01", "LC-02", "J-001"
  name: string; // "Blinding Team Alpha" — for jointers, same as code or full name
  type: TeamType;
  active: boolean; // default true. Inactive teams hidden from pickers but kept in admin
  createdAt: string;
}

export interface Subcontractor {
  code: string; // "SUB-001"
  name: string; // "Acme Welding Ltd."
  scope: (
    | "fabrication"
    | "erection"
    | "lineCheck"
    | "blinding"
    | "finishing"
    | "reinstatement"
    | "nde"
  )[];
  contact: string; // free text — "John Smith / +971 ..."
  active: boolean;
  createdAt: string;
}

interface AdminState {
  teams: Team[];
  subcontractors: Subcontractor[];

  // selectors
  getTeamsByType: (type: TeamType) => Team[];
  getActiveTeamsByType: (type: TeamType) => Team[];

  // mutations
  addTeam: (payload: Omit<Team, "createdAt" | "active">) => void;
  toggleTeamActive: (code: string) => void;
  addSubcontractor: (
    payload: Omit<Subcontractor, "createdAt" | "active">,
  ) => void;
  toggleSubcontractorActive: (code: string) => void;

  // demo reset
  resetAdmin: () => void;
}
```

### Seed initial state from existing constants

On first mount (no persisted state) seed from `lib/testpack-seed.ts`:

- `LINE_CHECKER_TEAMS` → 4 Team rows, type `"lineCheck"`, name `"Line Check Team {Alpha|Bravo|Charlie|Delta}"`
  (currently they have only codes — synthesize names).
- `FINISHING_TEAMS` → 4 Team rows, type `"finishing"`.
- `BLINDING_TEAMS` → 4 Team rows, type `"blinding"`.
- `REINSTATEMENT_TEAMS` → 3 Team rows, type `"reinstatement"`.
- `JOINTER_LIST` → 5 Team rows, type `"jointer"`, `name === code` (jointers are individuals, the code IS the name
  in our demo).

For subcontractors, seed 5 plausible rows (they don't exist in any current file — invent them):

```ts
[
  { code: "SUB-001", name: "Acme Welding Ltd.",       scope: ["fabrication","nde"],               contact: "John
Smith / +971 50 111 1111" },
  { code: "SUB-002", name: "Gulf Erectors LLC",        scope: ["erection","lineCheck"],            contact: "Ahmed
Hassan / +971 50 222 2222" },
  { code: "SUB-003", name: "Pioneer Hydrotest Co.",    scope: ["blinding","finishing"],            contact: "Marko
Petrović / +971 50 333 3333" },
  { code: "SUB-004", name: "Apex Reinstatement",       scope: ["reinstatement"],                   contact: "Liu
Wei / +971 50 444 4444" },
  { code: "SUB-005", name: "Falcon NDT Services",      scope: ["nde"],                             contact: "Carlos
 García / +971 50 555 5555" },
]
```

Persist key `pipeqc-admin`, version: 1.

### Helper hooks (export from same file)

```ts
export const useTeams = (type: TeamType) =>
  useAdminStore((s) => s.getActiveTeamsByType(type));
export const useAllTeams = (type: TeamType) =>
  useAdminStore((s) => s.getTeamsByType(type));
export const useSubcontractors = () => useAdminStore((s) => s.subcontractors);
```

Wire `resetAdmin` into the existing demo-store's `resetAll` (see `store/demo-store.ts`) so the "Reset Demo" top-nav
button also resets admin.

## Switch Track A pickers to read from admin store

In each of these files, **replace** the import of the seed constant with `useTeams("...")`:

| File                                                          | Currently uses                                        | Switch to               |
| ------------------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| `components/testpack/line-check/preparation-view.tsx`         | `LINE_CHECKER_TEAMS` from seed                        | `useTeams("lineCheck")` |
| — codes only, but render as `${code} — ${name}` in the select |
| `components/testpack/item-clearance/preparation-view.tsx`     | `FINISHING_TEAMS`                                     | `useTeams("finishing")` |
| `components/testpack/blinding/preparation-view.tsx`           | `BLINDING_TEAMS`                                      | `useTeams("blinding")`  |
| `components/testpack/reinstatement/preparation-view.tsx`      | `REINSTATEMENT_TEAMS` + `JOINTER_LIST` (jointer is on |
| Progress side)                                                | `useTeams("reinstatement")`                           |
| `components/testpack/reinstatement/progress-view.tsx`         | `JOINTER_LIST`                                        | `useTeams("jointer")`   |

Verify after the switch that the existing Track A flow still produces the same `BR-2026-001`, `FR-2026-001`,
`RR-2026-001` request IDs and that the team chips in toasts show team **codes** (BT-01, FT-01, …), not names —
toasts already use codes, so this should be a no-op visually unless someone broke it.

## Screens

### Page shell: `app/admin/page.tsx`

Replace the placeholder. Layout:

```
<h1>Admin · Project Referential</h1>
<p className="text-muted-foreground">Set up subcontractors, work crews, and engineering references for the
project.</p>

<Tabs defaultValue="teams">
  <TabsList>
    <TabsTrigger value="teams">Teams</TabsTrigger>
    <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
    <TabsTrigger value="welder-qualifications">Welder Qualifications</TabsTrigger>
  </TabsList>
  <TabsContent value="teams"><TeamsTab /></TabsContent>
  <TabsContent value="subcontractors"><SubcontractorsTab /></TabsContent>
  <TabsContent value="welder-qualifications"><WelderQualificationsTab /></TabsContent>
</Tabs>
```

Reuse shadcn `Tabs`. Active tab persists in URL via `?tab=teams|subcontractors|welder-qualifications` (use
`useSearchParams` + `router.replace`).

Components:

- `components/admin/teams-tab.tsx`
- `components/admin/subcontractors-tab.tsx`
- `components/admin/welder-qualifications-tab.tsx`
- `components/admin/add-team-dialog.tsx`
- `components/admin/add-subcontractor-dialog.tsx`

### Tab 1 — Teams

- KPI strip: 5 chips, one per type. `Line Check: 4 · Blinding: 4 · Finishing: 4 · Reinstatement: 3 · Jointers: 5`.
  Numbers reflect **active** teams only.
- Filter row: a segmented control to filter the table by type (`All · Line Check · Blinding · Finishing ·
Reinstatement · Jointer`), plus a free-text search on code/name.
- Table columns: `Code · Name · Type · Status (Active/Inactive pill) · Created · Actions`. Reuse `weld-table`
  density.
- Actions cell per row: a kebab menu with `Deactivate` / `Reactivate` (toggle).
- Top-right: `[+ Add Team]` button → opens `AddTeamDialog`:
  - Type select (required): one of the 5 types
  - Code (required, must be unique, validate against existing codes — show inline error)
  - Name (required for non-jointer types; for jointer type the name defaults to code and the field is hidden)
  - "Add Team" → 400–600 ms delay → store mutation → toast `"Team {code} added"` → dialog closes → row appears.

### Tab 2 — Subcontractors

- KPI strip: `Total: N · Active: N · Scopes covered: {set}`.
- Table columns: `Code · Name · Scope (chips) · Contact · Status · Created · Actions`.
- Kebab actions: `Deactivate` / `Reactivate`.
- Top-right: `[+ Add Subcontractor]`:
  - Code (unique, validated)
  - Name (required)
  - Scope (multi-select checkbox group of the 7 scope types)
  - Contact (free text)
  - "Add Subcontractor" → 400–600 ms delay → toast → row appears.

### Tab 3 — Welder Qualifications (read-only)

- Header note: `"Welder qualifications are derived from §3.6 records. Edit via the IDS import flow."` (sets the
  read-only expectation visibly.)
- KPI strip: `Total welders: N · Qualified WPS codes: {distinct count} · Expiring this quarter: N` (compute
  "expiring" if the data has expiry dates — otherwise show `—`).
- Table columns from `WELDER_QUALIFICATIONS`: `Welder Code · Name · Qualified WPS · Qualification Date · Expiry ·
Status`. Render `qualifiedWPS` array as comma-joined chips, truncate to 3 + "+N more".
- No actions column.
- Empty-state row at the bottom if list is short.

## Navigation polish

- In `components/pipeqc/top-nav.tsx`, add to `routeLabels`:
  ```ts
  admin: "Admin",
  ```
- Verify `/admin` already appears in `config/navigation.ts` (it does — keep its existing roles/icon).
- Breadcrumb on `/admin` reads: `Admin` (single segment).
- Each tab is just URL state, not a route, so no further breadcrumb work.

## Constraints

1. No new npm dependencies.
2. All new components `"use client"`.
3. Reuse shadcn primitives (`Dialog`, `Tabs`, `Input`, `Select`, `Checkbox`, `Button`, `Badge`).
4. 400–600 ms delay before every add mutation (matches Track A cadence, but slightly faster — these are admin
   operations, not field work).
5. No backend, no fetch.
6. **Track A regression must pass end-to-end.** Specifically: after switching pickers to `useTeams(...)`, the full
   A1→A6 demo flow on TP-205 must still complete with identical request IDs and notifications.
7. Persisted store version: 1 (this is a new store).
8. Don't delete the existing seed constants in `lib/testpack-seed.ts` (`LINE_CHECKER_TEAMS`, `FINISHING_TEAMS`,
   `BLINDING_TEAMS`, `REINSTATEMENT_TEAMS`, `JOINTER_LIST`) — they are the seed source for admin store. Leave them.
   Just no longer import them in the picker components.

## Acceptance test

Fresh localStorage, `npm run dev`:

1. Navigate to `/admin`. Page renders with header and 3 tabs. Default tab: **Teams**.
2. KPI strip on Teams reads `Line Check: 4 · Blinding: 4 · Finishing: 4 · Reinstatement: 3 · Jointers: 5`. Table
   shows 20 rows total.
3. Filter segmented control → click `Blinding`. Table now shows 4 rows (BT-01..BT-04). Search box filters further.
4. Click `[+ Add Team]`. Dialog opens. Pick type `Blinding`, code `BT-05`, name `Blinding Team Echo`. Click `Add
Team`. ~500 ms → dialog closes → toast `"Team BT-05 added"` → row appears in table.
5. KPI strip now reads `Blinding: 5`.
6. Navigate to `/testpack/pressure-test/blinding/preparation`. The `Assign to:` dropdown in the floating action bar
   now contains `BT-05` as a selectable option. Verify the previous 4 codes are still listed.
7. Try to add `BT-01` again in admin → inline error "Code must be unique".
8. Switch to **Subcontractors** tab. URL updates to `/admin?tab=subcontractors`. Table shows 5 seed subcontractors
   with scope chips.
9. Add a new subcontractor (`SUB-006 · Reliable QC Services · scopes: nde, lineCheck · contact text`). Verify toast
   and row appearance.
10. Switch to **Welder Qualifications** tab. Read-only table renders. No `+ Add` button. Header note visible.
11. **Full Track A regression**: Reset Demo → run A1→A6 on TP-205 → all notifications fire including climax
    `"TP-205: hydrotest passed"` → composite badge on Explorer reads 🟢 **FULLY COMMISSIONED**.
12. After Reset Demo, the admin store also resets: added rows (BT-05, SUB-006) are gone; original seed teams +
    subcontractors restored.
13. Navigate to `/admin?tab=teams` directly via URL — Teams tab opens.
14. Breadcrumb on `/admin` shows `Admin` (Title Case, not lowercase).
15. `npx tsc --noEmit` and `npm run build` are clean.

## Definition of done

- All 15 acceptance steps pass manually.
- Track A regression intact (step 11 is the critical one).
- New files:
  - `store/admin-store.ts`
  - `components/admin/teams-tab.tsx`
  - `components/admin/subcontractors-tab.tsx`
  - `components/admin/welder-qualifications-tab.tsx`
  - `components/admin/add-team-dialog.tsx`
  - `components/admin/add-subcontractor-dialog.tsx`
- Modified files: `app/admin/page.tsx`, the 5 Track A picker views, `components/pipeqc/top-nav.tsx`,
  `store/demo-store.ts` (resetAll wiring).
- `docs/PIPEQC_CONTEXT.md` Track B section: add a short note that B1 is merged, listing what landed.

Report files created/modified, deviations, and any acceptance step you could not verify manually.
