# Task: PipeQC Track B, Phase B2 — Engineering

reference tabs (WPS · NDE Matrix · Rework Codes ·
Joint Categories)

Read `docs/PIPEQC_CONTEXT.md` first (Track B section,
§3 of the manual). Track A (A1–A6) and Track B Phase
B1 (Admin shell + Teams + Subcontractors + Welder
Qualifications) are merged. Do not break either.

This slice adds **four read-only reference tabs** to
the existing admin shell. These are engineering-spec
referentials — they come from project setup documents
(WPS list, NDE matrix from contract, rework code
library, joint category definitions). In real EPC
projects these are imported from IDS or contract
documents, not edited per project. For the demo we
display them read-only with the same "header note"
pattern used for Welder Qualifications in B1.

After B2, the admin shell will have **7 tabs**. After
B3 (the rest of §3) it will reach the full set of 26
referentials, but B2 already covers the most
demo-relevant engineering data.

## Goal

- Add 4 new tabs to `/admin`: **WPS · NDE Matrix ·
  Rework Codes · Joint Categories**.
- New seed module `lib/engineering-references.ts`
  holding all 4 datasets (static, not in a store —
  never mutated).
- Each tab is read-only with a one-line "source note"
  header (same pattern as Welder Qualifications:
  "Imported from §X.Y — edit via IDS import flow").
- Tabs reuse the existing `Tabs` shell wired in B1
  (`app/admin/admin-tabs.tsx`).
- `?tab=` URL sync continues to work for the new
  tabs.

## Business context (manual §3.5, §3.9, §3.10, §3.13)

| §    | Referential                               | Why it matters in the demo |
| ---- | ----------------------------------------- | -------------------------- |
| §3.5 | **WPS** (Welding Procedure Specification) |

Each weld is performed per a WPS. Welder
Qualifications (B1) already references WPS codes —
this tab is the source of those codes. |
| §3.9 | **NDE Matrix** | Decides which
non-destructive examination method (RT / UT / PT / MT
/ VT) is required per pipe diameter × thickness ×
material class. This drives NDE batch eligibility in
the existing NDE module. |
| §3.10 | **Rework Codes** | Standardised reasons a
weld fails NDE (porosity, crack, slag inclusion,
undercut, etc.). QC engineer picks one when a weld is
rejected. |
| §3.13 | **Joint Categories X / Y / Z** | The whole
Track A flow hinges on these: X blocks blinding, Y is
reinstated after hydrotest, Z is reinstated after
pre-commissioning. This tab is the canonical
definition. |

For the demo we don't wire these into any other
screen — they're a reference library shown for
breadth. **Exception:** the Joint Categories tab gets
a small "Used in:" footer that lists the screens
where X / Y / Z gating actually fires (helps the
pitch narrative).

## New file: `lib/engineering-references.ts`

Export 4 const arrays + their TS types. Use
realistic-looking data; quantities below.

### 1. WPS List (8 rows)

```ts
export interface WPSRecord {
  code: string                  // "WPS-001" or
process-material-position style
  process: "GTAW" | "SMAW" | "GMAW" | "FCAW" | "SAW"
  baseMaterial: string          // e.g. "P91",
"A106-Gr.B", "316L SS", "Duplex 2205"
  fillerMaterial: string        // e.g. "ER90S-B9",
"E7018", "ER316L"
  positions: string[]           // e.g. ["1G", "2G",
"5G", "6G"]
  thicknessRange: string        // e.g. "3.0–25.0 mm"
  diameterRange: string         // e.g. "DN 25–300"
  revision: string              // "Rev. 2"
  approvedDate: string          // ISO date
  status: "Active" | "Superseded"
}
```

Seed 8 rows. Required: include `WPS-001 / GTAW / P91
  / ER90S-B9 / [1G, 2G, 5G, 6G]` (matches the welder
qualifications seeded in B1 — verify codes match
`WELDER_QUALIFICATIONS`). The rest can be varied
across SMAW/GMAW/FCAW/SAW with realistic
material/filler combos. One row should have `status:
  "Superseded"` to demonstrate the pill.

### 2. NDE Matrix (6 rows)

Flat row-based representation — not a 2D grid
(simpler to render in a table).

```ts
export interface NDEMatrixRecord {
  id: string                    // "NDE-MTX-001"
  serviceClass: "Class 1" | "Class 2" | "Class 3" |
"Utility"
  diameterRange: string         // e.g. "DN 25–50"
  thicknessRange: string        // e.g. "≤ 10 mm"
  primaryMethod: "RT" | "UT" | "PT" | "MT" | "VT"
  primaryCoverage: string       // "100%", "10%",
"Spot"
  secondaryMethod?: "RT" | "UT" | "PT" | "MT" | "VT"
  secondaryCoverage?: string
  acceptanceCriterion: string   // e.g. "ASME B31.3
§341.3.2"
}
```

Seed 6 rows covering Class 1 / Class 2 / Class 3 /
Utility. At least one Class 1 row should require RT
100% + PT 100% (this is the "expensive critical weld"
scenario PMs care about).

### 3. Rework Codes (10 rows)

```ts
export interface ReworkCode {
  code: string; // "RW-001"
  shortName: string; // "Porosity"
  description: string; // full one-liner
  category:
    | "Surface defect"
    | "Internal defect"
    | "Geometry"
    | "Material"
    | "Procedure";
  severity: "Minor" | "Major" | "Critical";
  defaultAction:
    | "Grind & re-weld"
    | "Cut-out"
    | "Re-test"
    | "Repair-weld"
    | "Document & accept";
}
```

Seed 10 rows: Porosity (RW-001), Crack (RW-002,
Critical, Cut-out), Slag inclusion, Undercut,
Incomplete fusion, Incomplete penetration, Excess
reinforcement, Underfill, Arc strike, Misalignment.
Spread across categories and severities.

### 4. Joint Categories X / Y / Z (3 rows)

```ts
export interface JointCategory {
  code: "X" | "Y" | "Z"
  name: string                  // "Test-blocking",
"Post-test", "Post-commissioning"
  description: string           // full sentence —
what defines this category
  examples: string[]            // e.g. ["Defective
weld on pressure boundary", "Missing support"]
  resolutionRequired: string    // "Before hydrotest"
 | "After hydrotest, before pre-commissioning" |
"After pre-commissioning"
  enforcedIn: string[]          // e.g. ["Item
Clearance", "Blinding eligibility gate"]
}
```

Hardcode all 3 rows. `enforcedIn` field is the bridge
to the "Used in:" footer.

## Screens

Add 4 new tab components and wire them into
`app/admin/admin-tabs.tsx`.

### Tab files (all in `components/admin/`)

- `wps-tab.tsx`
- `nde-matrix-tab.tsx`
- `rework-codes-tab.tsx`
- `joint-categories-tab.tsx`

### Common pattern for all 4

```
[header note in muted text]
[KPI strip — 2–3 chips]
[search box, where it makes sense]
[table]
```

No `+ Add` button on any of these. No kebab menu.
Pure display.

### WPS tab specifics

- Header note: `"Welding Procedure Specifications —
imported from §3.5. Edit via the IDS import flow."`
- KPI strip: `Total WPS: N · Active: N · Superseded:
N`.
- Search: free-text across `code · baseMaterial ·
fillerMaterial`.
- Table columns: `Code · Process · Base Material ·
Filler · Positions · Thickness · Diameter · Revision
· Approved · Status`.
- Positions render as comma-joined chips, max 4
  visible + "+N more".
- Status as pill: `Active` (emerald), `Superseded`
  (slate).

### NDE Matrix tab specifics

- Header note: `"NDE method matrix — derived from
§3.9 (ASME B31.3 service class). Edit via project
setup."`
- KPI strip: `Rows: N · Service classes covered:
{distinct count}`.
- No search (only 6 rows).
- Table columns: `Service Class · Diameter ·
Thickness · Primary Method · Coverage · Secondary ·
Coverage · Acceptance`.
- Service class as pill: Class 1 (red-tinted), Class
  2 (amber), Class 3 (sky), Utility (slate).
- Empty secondary cells render as `—`.

### Rework Codes tab specifics

- Header note: `"Weld rework reasons — §3.10. Used by
QC engineers when rejecting an NDE batch."`
- KPI strip: `Total codes: N · Critical: N · Major: N
· Minor: N`.
- Search across `code · shortName · description`.
- Filter chip row: `Category: All | Surface |
Internal | Geometry | Material | Procedure`.
- Table columns: `Code · Short Name · Description ·
Category · Severity · Default Action`.
- Severity as pill: Minor (slate), Major (amber),
  Critical (red).

### Joint Categories tab specifics

- Header note: `"Punch item categories — §3.13. These
 categories determine when an item must be resolved
relative to hydrotest."`
- KPI strip: `Categories: 3` (just for visual
  consistency).
- No search (3 rows).
- Render as a **card layout, not a table** — 3 large
  cards side by side (each card = X, Y, Z). Each card
  shows:
  - Big code letter at top (X red / Y amber / Z
    slate)
  - Name
  - Description
  - "Examples:" bullet list
  - "Resolution required:" line
  - "Enforced in:" pill list pointing to the screens
- **Footer note** below the cards: `"In this demo,
Category X blocks the Blinding eligibility gate;
Category Y appears in Reinstatement Preparation only
after testingDoneDate is set; Category Z appears only
 after preCommDate is set."`

## Wire into admin shell

In `app/admin/admin-tabs.tsx`:

- Extend `TabsList` to 7 tabs: `Teams |
Subcontractors | Welder Qualifications | WPS | NDE
Matrix | Rework Codes | Joint Categories`.
- Extend `?tab=` URL sync to recognise `wps`,
  `nde-matrix`, `rework-codes`, `joint-categories`
  (kebab-case in URL).
- Default tab stays `teams`.
- If the existing tab list is getting visually
  crowded (likely with 7 items), wrap `TabsList` to
  allow horizontal scroll on narrow viewports — use
  `overflow-x-auto` + `whitespace-nowrap`. Don't
  introduce a "More" dropdown — keep it flat.

## Navigation polish

- `routeLabels` in `components/pipeqc/top-nav.tsx` —
  no change needed (admin stays single-segment).
- Breadcrumb still reads `Admin` regardless of tab.

## Constraints

1. No new npm dependencies.
2. All new components `"use client"` where they use
   hooks (`useSearchParams`); pure display components
   can stay server.
3. Reuse shadcn primitives.
4. No mutations, no toasts, no delays — these tabs
   are read-only.
5. No backend, no fetch.
6. **Track A and Track B Phase B1 regression must
   pass.** Specifically:
   - Existing B1 tabs (Teams / Subcontractors /
     Welder Qualifications) still render identically.
   - Adding/toggling teams or subcontractors in B1
     still works.
   - Track A full demo flow (A1→A6 on TP-205) still
     completes with identical request IDs and
     notifications.
7. **Don't move the existing
   `lib/welder-qualifications.ts` data into the new
   `engineering-references.ts` file** — leave it where
   it is. WPS data is _separate_ from welder
   qualifications; both reference the same WPS codes by
   string but they're distinct tables.
8. Static data only — no `useEffect`, no `useState`
   for the data itself, no persistence.

## Acceptance test

Fresh localStorage, `npm run dev`:

1. Navigate to `/admin`. Tab strip now shows 7 tabs
   in order: `Teams · Subcontractors · Welder
Qualifications · WPS · NDE Matrix · Rework Codes ·
Joint Categories`. Default tab is Teams.
2. Click **WPS** tab. URL updates to
   `/admin?tab=wps`. 8 rows render. Header note visible.
   KPI strip reads `Total WPS: 8 · Active: 7 ·
Superseded: 1`. Search "P91" filters to the matching
   WPS rows.
3. Click **NDE Matrix** tab. 6 rows render. Service
   class pills colored correctly. Header note visible.
4. Click **Rework Codes** tab. 10 rows render.
   Severity pill colors correct (Crack = Critical red,
   Porosity = Major amber, etc.). Click "Critical"
   filter chip → table filters down to Critical rows
   only. Search "porosity" → finds RW-001.
5. Click **Joint Categories** tab. 3 cards render
   side by side (responsive: stack on narrow viewport).
   X card is red-tinted, Y amber, Z slate. Each shows
   examples, resolution timing, and "Enforced in:"
   pills. Footer note visible.
6. Direct URL `/admin?tab=joint-categories` → opens
   that tab on cold load.
7. Switch back to **Welder Qualifications** tab —
   B1's read-only display is intact.
8. Switch back to **Teams**. Click `[+ Add Team]`.
   Add `LC-05 / Line Check Team Echo` of type Line
   Check. Toast fires. Row appears. KPI shows Line
   Check: 5. (B1 regression.)
9. Navigate to
   `/testpack/pressure-test/line-check/preparation`. The
   `Assign to:` dropdown contains `LC-05`. (B1 picker
   wiring still works.)
10. Reset Demo from top nav. `/admin?tab=teams` shows
    4 line-check teams again (admin reset works).
    `/admin?tab=wps` still shows the same 8 WPS rows
    (static data, not affected by reset — this is
    correct).
11. Full Track A regression: run A1→A6 on TP-205.
    Climax notification "TP-205: hydrotest passed" fires.
    Composite badge on Explorer → 🟢 FULLY COMMISSIONED.
12. `npx tsc --noEmit` clean.
13. `npm run build` clean. All static pages generate
    (admin is still a single route with `<Suspense>`
    wrapper from B1).

## Definition of done

- All 13 acceptance steps pass manually (or as many
  as can be verified without a browser; flag any that
  need manual run).
- B1 and Track A regressions intact.
- New files:
  - `lib/engineering-references.ts`
  - `components/admin/wps-tab.tsx`
  - `components/admin/nde-matrix-tab.tsx`
  - `components/admin/rework-codes-tab.tsx`
  - `components/admin/joint-categories-tab.tsx`
- Modified files: `app/admin/admin-tabs.tsx`
  (extended TabsList + URL sync).
- `docs/PIPEQC_CONTEXT.md` Track B section: append a
  note that B2 is merged, with the 4 new tabs listed
  and §3 cross-references updated.
  B1's read-only display is intact.

8. Switch back to **Teams**. Click `[+ Add Team]`.
   Add `LC-05 / Line Check Team Echo` of type Line
   Check. Toast fires. Row appears. KPI shows Line
   Check: 5. (B1 regression.)
9. Navigate to
   `/testpack/pressure-test/line-check/preparation`. The
   `Assign to:` dropdown contains `LC-05`. (B1 picker
   wiring still works.)
10. Reset Demo from top nav. `/admin?tab=teams` shows
    4 line-check teams again (admin reset works).
    `/admin?tab=wps` still shows the same 8 WPS rows
    (static data, not affected by reset — this is
    correct).
11. Full Track A regression: run A1→A6 on TP-205.
    Climax notification "TP-205: hydrotest passed" fires.
    Composite badge on Explorer → 🟢 FULLY COMMISSIONED.
12. `npx tsc --noEmit` clean.
13. `npm run build` clean. All static pages generate
    (admin is still a single route with `<Suspense>`
    wrapper from B1).

## Definition of done

- All 13 acceptance steps pass manually (or as many
  as can be verified without a browser; flag any that
  need manual run).
- B1 and Track A regressions intact.
- New files:
  - `lib/engineering-references.ts`
  - `components/admin/wps-tab.tsx`
  - `components/admin/nde-matrix-tab.tsx`
  - `components/admin/rework-codes-tab.tsx`
  - `components/admin/joint-categories-tab.tsx`
- Modified files: `app/admin/admin-tabs.tsx`
  (extended TabsList + URL sync).
- `docs/PIPEQC_CONTEXT.md` Track B section: append a
  note that B2 is merged, with the 4 new tabs listed
  and §3 cross-references updated.

Report files created/modified, deviations, and any
acceptance step you could not verify manually.
