# Task: PipeQC Phase 0 — Admin Setup, remaining 5 slices

Read `docs/PIPEQC_CONTEXT.md` and `docs/roadmap_v3.md` first.

## Context

Phase 0 (Admin Setup) is partially done. The previous agent implemented:
- Slice 0.1 (B1): Project Definition form + store persist
- Slice 0.3 (B5): Welder Qualifications CRUD (add/edit-expiry/deactivate, store-backed)
- Slice 0.4 (B6): NDE Matrix CRUD (add/edit/delete rule dialog, store-backed)
- Slice 0.7 (B3): System Referential CRUD (4 cards, inline add row)

This prompt closes the remaining **5 slices** to complete Phase 0:

| Slice | B# | What |
|---|---|---|
| 0.2 | B5-WPS | WPS CRUD — Add / Edit / Supersede in store |
| 0.5 | B4 | PDS Area × Subcontractor assignment matrix |
| 0.6 | B7 | Project Piping Material List (heat number registry) |
| 0.8 | B8 | Rework Codes + Joint Categories store-backed CRUD |
| 0.9 | B9 | Testpack team refs CRUD |

---

## Existing architecture (read before writing anything)

### Store: `store/admin-store.ts`

Current state shape already has: `teams`, `subcontractors`, `projectDefinition`,
`systemReferentials`, `welderQualifications`, `ndeMatrix`.

Persist key: `"pipeqc-admin"`, `version: 2`.

### Pattern: subcontractors-tab.tsx (reference UX)

All new CRUD tabs must follow the established pattern:
1. KPI strip (3 chips)
2. Search bar + "Add" button (right-aligned)
3. Sticky-header table with status badges
4. Row actions via `DropdownMenu` (Edit / Deactivate or Delete)
5. Add/Edit via `Dialog` with simulated 400–600ms delay + `toast.success`

### Existing lib constants (read-only source of truth to seed from)

- `lib/engineering-references.ts` exports: `WPS_LIST` (WPSRecord[]), `REWORK_CODES`
  (ReworkCode[]), `JOINT_CATEGORIES` (JointCategory[])
- `lib/flange-data.ts` has `pdsAreas: ["All Areas", "PR-01", "CA-02", "RA-01",
  "VS-01", "UB-03", "HX-02"]` — use these as seed PDS areas

### Existing tabs (to upgrade from read-only to store-backed)

- `components/admin/wps-tab.tsx` — currently reads from `WPS_LIST` lib constant,
  no store, no CRUD
- `components/admin/rework-codes-tab.tsx` — reads from `REWORK_CODES` lib constant,
  no CRUD
- `components/admin/joint-categories-tab.tsx` — reads from `JOINT_CATEGORIES` lib
  constant, no CRUD

---

## Slice 0.2 — WPS CRUD (B5-WPS)

### Store additions (`store/admin-store.ts`)

Add `WPSRecord` type to store (re-export or import from `lib/engineering-references`
— do NOT duplicate the interface). Add to state:

```ts
wpsList: WPSRecord[]
```

Seed from `WPS_LIST` constant (copy values into store on init — do NOT keep reading
from lib after this).

New mutations:

```ts
addWps: (payload: Omit<WPSRecord, "approvedDate"> & { approvedDate?: string }) => void
updateWps: (code: string, patch: Partial<Omit<WPSRecord, "code">>) => void
supersededWps: (code: string) => void  // sets status → "Superseded"
```

Include `wpsList` in `resetAdmin`.

### UI: `components/admin/wps-tab.tsx`

Replace the current read-only tab with a store-backed CRUD version.

KPI strip: `Total WPS: N · Active: N · Superseded: N`

Add button → **Add WPS dialog** (`components/admin/add-wps-dialog.tsx`):

Fields:
- Code (text, required, unique check against existing codes)
- Process (select: GTAW / SMAW / GMAW / FCAW / SAW)
- Base Material (text)
- Filler Material (text)
- Positions (multi-select chips: 1G / 2G / 3G / 4G / 5G / 6G — allow multiple)
- Thickness Range (text, e.g. "3–25 mm")
- Diameter Range (text, e.g. "DN 25–DN 300")
- Revision (text, e.g. "Rev.0")
- Approved Date (date input, defaults to today)

On save: 400–600ms delay → `addWps()` → `toast.success("WPS {code} added")` →
dialog closes.

Row actions (DropdownMenu):
- **Edit** → same dialog pre-filled → `updateWps()` → `toast.success("WPS {code} updated")`
- **Supersede** → inline confirm (no separate dialog needed — just a DropdownMenuItem
  with a confirm step: `"Mark WPS-{code} as Superseded?"` via `window.confirm` or a
  small alert dialog) → `supersededWps()` → row gets Superseded badge

Table columns: Code · Process · Base Material · Filler · Positions · Thickness ·
Diameter · Revision · Approved · Status · Actions

---

## Slice 0.5 — PDS Area × Subcontractor Assignment Matrix (B4)

### Business context

This is the source of the CC-4 scope lock. Each PDS Area (e.g. "PR-01") is assigned
to exactly one Subcontractor. When a subcontractor user logs in, the system filters
all operational screens to show only records in their assigned areas.

### Store additions

Add to state:

```ts
pdsAreas: PdsArea[]
```

```ts
export interface PdsArea {
  code: string          // e.g. "PR-01"
  name: string          // e.g. "Process Area 01"
  assignedSubCode: string | null  // subcontractor.code or null if unassigned
  active: boolean
  createdAt: string
}
```

Seed from `flange-data.ts` PDS area codes (exclude "All Areas"):
- PR-01 → "Process Area 01"
- CA-02 → "Catalyst Area 02"
- RA-01 → "Reactor Area 01"
- VS-01 → "Vessel Area 01"
- UB-03 → "Utility Block 03"
- HX-02 → "Heat Exchanger Area 02"

Assign seeds sensibly using existing `SEED_SUBCONTRACTORS`:
- PR-01, CA-02 → SUB-001 (Acme Welding)
- RA-01, VS-01 → SUB-002 (Gulf Erectors)
- UB-03, HX-02 → null (unassigned — demo shows a realistic incomplete state)

New mutations:

```ts
addPdsArea: (payload: { code: string; name: string }) => void
assignPdsArea: (areaCode: string, subCode: string | null) => void
togglePdsAreaActive: (areaCode: string) => void
```

Include `pdsAreas` in `resetAdmin`.

### UI: new `components/admin/pds-area-tab.tsx`

Create a new tab in `components/admin/admin-tabs.tsx` (or wherever the General
tab tabs are rendered — look at the existing AdminTabs component) under the name
"PDS Areas".

KPI strip: `Total Areas: N · Assigned: N · Unassigned: N`

Table columns: Area Code · Area Name · Assigned Subcontractor · Status · Actions

Assignment cell: shows subcontractor name + badge if assigned, or a grey "— Unassigned"
chip if not.

Row actions (DropdownMenu):
- **Assign / Reassign** → small dialog with a `<Select>` of active subcontractors +
  a "Clear assignment" option → `assignPdsArea()` → `toast.success`
- **Deactivate** → `togglePdsAreaActive()`

Add PDS Area button → dialog: Area Code (text) + Area Name (text) + optional
initial assignment (subcontractor select) → `addPdsArea()` + optionally
`assignPdsArea()` → toast.

---

## Slice 0.6 — Project Piping Material List / Heat Number Registry (B7)

### Business context

Each pipe spool is made from material that has a "heat number" — a batch/cast
identifier from the steel mill. QC engineers must verify that the heat numbers used
in fabrication are on the approved PML. This slice creates the registry.

### Store additions

Add to state:

```ts
pipingMaterialList: HeatRecord[]
```

```ts
export interface HeatRecord {
  heatNo: string        // e.g. "HT-2024-001"
  material: string      // e.g. "CS-A106B" — ideally matches materialTypes codes
  grade: string         // e.g. "Grade B"
  millCertRef: string   // e.g. "CERT-2024-0012"
  supplier: string
  active: boolean
  createdAt: string
}
```

Seed with 8 realistic heat records (use material codes from `SEED_SYSTEM_REFERENTIALS.materialTypes`).

New mutations:

```ts
addHeatRecord: (payload: Omit<HeatRecord, "active" | "createdAt">) => void
toggleHeatRecordActive: (heatNo: string) => void
```

Export a selector for downstream use (Phase 2 Material Check):

```ts
export function useActivePipingMaterialList(): HeatRecord[]
```

Include `pipingMaterialList` in `resetAdmin`.

### UI: new `components/admin/piping-material-list-tab.tsx`

Add as a new tab under the Spooling group in project-referential (or wherever
Spooling refs are displayed — look at the existing tab structure).

KPI strip: `Total Heat Records: N · Active: N · Inactive: N`

Add button → **Add Heat Record dialog**:
- Heat No (text, required, unique check)
- Material (select from active `materialTypes` in systemReferentials — falls back to free text if empty)
- Grade (text)
- Mill Cert Ref (text)
- Supplier (text)

Row actions: **Deactivate** (soft-delete, keeps record for audit).

Table columns: Heat No · Material · Grade · Mill Cert Ref · Supplier · Status · Actions

---

## Slice 0.8 — Rework Codes + Joint Categories CRUD (B8)

### Business context

**Rework Codes** are used by NDE Inspectors when recording a weld rejection — they
pick the defect reason from this list. Currently hard-coded in lib.

**Joint Categories** (X / Y / Z) define testpack punch item severity levels.
Currently static display. For demo, these 3 categories are domain-fixed — no need
for Add/Delete. Only allow **Edit description / examples** (admin may need to
customise wording per project).

### Store additions

Add to state:

```ts
reworkCodes: ReworkCodeRecord[]
jointCategories: JointCategoryRecord[]
```

For rework codes — new type (do NOT reuse `lib/engineering-references` ReworkCode
directly; create a store type that can be mutated):

```ts
export interface ReworkCodeRecord {
  code: string
  shortName: string
  description: string
  category: "Surface defect" | "Internal defect" | "Geometry" | "Material" | "Procedure"
  severity: "Minor" | "Major" | "Critical"
  defaultAction: string
  active: boolean
  createdAt: string
}
```

Seed from `REWORK_CODES` lib constant (map each entry, `active: true`).

For joint categories — seed from `JOINT_CATEGORIES` lib constant. Only allow
editing `description` and `examples` (no add/delete — X/Y/Z are domain-fixed):

```ts
export interface JointCategoryRecord {
  code: "X" | "Y" | "Z"
  name: string
  description: string
  examples: string[]
  resolutionRequired: string
  enforcedIn: string[]
}
```

New mutations:

```ts
// Rework Codes
addReworkCode: (payload: Omit<ReworkCodeRecord, "active" | "createdAt">) => void
updateReworkCode: (code: string, patch: Partial<Omit<ReworkCodeRecord, "code" | "active" | "createdAt">>) => void
toggleReworkCodeActive: (code: string) => void

// Joint Categories (edit-only)
updateJointCategory: (code: "X" | "Y" | "Z", patch: { description?: string; examples?: string[] }) => void
```

Include both in `resetAdmin`.

### UI changes

**`components/admin/rework-codes-tab.tsx`** — upgrade from read-only to store-backed:
- Connect to store instead of `REWORK_CODES` lib constant
- Add button → add-rework-code-dialog: Code (text, unique) / Short Name / Description / Category (select) / Severity (select) / Default Action (text)
- Row actions: **Edit** → same dialog pre-filled / **Deactivate**

**`components/admin/joint-categories-tab.tsx`** — minimal upgrade:
- Connect to `jointCategories` store slice instead of `JOINT_CATEGORIES` lib constant
- Add **Edit** action per category card → small dialog: Description (textarea) + Examples (textarea, one per line, split on newline) → `updateJointCategory()` → toast
- No Add / Delete (3 categories are fixed)

---

## Slice 0.9 — Testpack Team Refs CRUD (B9)

### Business context

The testpack module reads team lists for: Line Check Teams, Blinding Teams,
Finishing Teams, Reinstatement Teams, Jointer List. These are currently seeded from
`lib/testpack-seed.ts` constants into the admin store's `teams` slice. The `teams`
slice already has `addTeam` / `toggleTeamActive` mutations. What's missing is a
**UI tab** where the admin can manage them.

### Store check

The `teams` slice in `store/admin-store.ts` already exists with `addTeam` and
`toggleTeamActive`. No new store mutations needed for this slice. ✅

### UI: new `components/admin/teams-tab.tsx`

This tab already exists (`TeamsTab`) — check whether it has CRUD UI or is still a
placeholder. If it's placeholder, upgrade it. If it already has CRUD, add only the
missing Jointer sub-section.

The tab should show **5 sub-sections** (one per team type), each as a collapsible
card or a tabbed sub-panel:

1. **Line Check Teams** (type: `"lineCheck"`)
2. **Blinding Teams** (type: `"blinding"`)
3. **Finishing Teams** (type: `"finishing"`)
4. **Reinstatement Teams** (type: `"reinstatement"`)
5. **Jointer List** (type: `"jointer"`)

Per sub-section:
- Small table: Code · Name · Status · Actions
- Add button → inline small dialog: Code (text, required) + Name (text, required)
  → `addTeam({ code, name, type })` → `toast.success("{name} added")`
- Row action: **Deactivate** → `toggleTeamActive(code)` → row gets Inactive badge

KPI at top of tab: `Total Members: N · Active: N` (across all team types)

---

## Store version bump

The store currently has `version: 2`. With these new slices you are adding 4 new
state slices: `wpsList`, `pdsAreas`, `pipingMaterialList`, `reworkCodes`,
`jointCategories`. Bump to `version: 3` with migration:

```ts
migrate: (persistedState, version) => {
  const state = (persistedState ?? {}) as Partial<AdminState>
  if (version < 3) {
    return {
      ...state,
      wpsList: state.wpsList ?? seedWpsList(),
      pdsAreas: state.pdsAreas ?? seedPdsAreas(),
      pipingMaterialList: state.pipingMaterialList ?? seedPipingMaterialList(),
      reworkCodes: state.reworkCodes ?? seedReworkCodes(),
      jointCategories: state.jointCategories ?? seedJointCategories(),
    } as AdminState
  }
  return state as AdminState
}
```

---

## Constraints

1. **No new npm dependencies.**
2. All new components: `"use client"`.
3. Follow the subcontractors-tab UX pattern exactly (KPI strip → search → table →
   row actions → dialog).
4. 400–600ms simulated delay before every mutation that shows a toast.
5. No backend, no fetch — Zustand store only.
6. **Do not break existing admin tabs** (Teams, Subcontractors, Welder
   Qualifications, NDE Matrix, System Referential, Project Definition). Run the full
   admin module manually after each slice.
7. **Do not modify `lib/engineering-references.ts`** — it stays as a read-only seed
   source; store takes over after seeding.

---

## Acceptance criteria

After all 5 slices are complete, the following must hold:

**0.2 WPS CRUD:**
- [ ] Add a new WPS record via dialog → appears in table with Active badge
- [ ] Edit an existing WPS → changes reflected immediately
- [ ] Supersede a WPS → status badge switches, row style dims
- [ ] KPI strip numbers update correctly

**0.5 PDS Areas:**
- [ ] See 6 seeded PDS areas with correct assignments (PR-01 → Acme, etc.)
- [ ] Assign UB-03 to SUB-003 → assignment cell updates
- [ ] Add a new PDS area via dialog
- [ ] Deactivate an area → row dims

**0.6 Piping Material List:**
- [ ] See 8 seed heat records
- [ ] Add a new heat record → appears in table
- [ ] Deactivate a record → row dims
- [ ] `useActivePipingMaterialList()` hook exported and returns only active records

**0.8 Rework Codes + Joint Categories:**
- [ ] Add a new rework code → appears in table
- [ ] Edit an existing rework code → updates in table
- [ ] Deactivate a rework code → row dims
- [ ] Edit Joint Category X description → card shows updated text

**0.9 Teams:**
- [ ] Add a new Line Check Team member → appears under "Line Check Teams" sub-section
- [ ] Deactivate a Blinding Team member → row dims
- [ ] Jointer List section visible with Add + Deactivate

**Overall:**
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean
- [ ] No regressions on any existing admin tab (WelderQualifications, NDE Matrix,
      System Referential, Project Definition, Subcontractors)
- [ ] `docs/PIPEQC_CONTEXT.md` file-structure section updated with new files

---

## Definition of done

All 5 slices merged, `docs/PIPEQC_CONTEXT.md` updated, `system_admin.md` matrix
statuses updated:

| B# | Was | Now |
|---|---|---|
| B4 | ⚠ partial | ✅ live |
| B5 (WPS) | ⚠ partial | ✅ live |
| B7 | ⚠ partial | ✅ live |
| B8 | ⚠ partial | ✅ live |
| B9 | 📋 planned | ✅ live |

Phase 0 closure: 9/9 slices ✅ (0.1–0.9 all live). Report all files created/modified
and any deviations from this spec.
