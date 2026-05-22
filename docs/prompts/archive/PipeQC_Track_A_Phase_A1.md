# Task: PipeQC Track A, Phase A1 — Line Check workflow

You are implementing a slice of an industrial piping QC demo app.
**Read `docs/PIPEQC_CONTEXT.md` first — it has the tech stack,
conventions, design system, and full track plan.** Do not skip this.

## Goal of this slice

Build the first activity of the Pressure Test module — **Line Check**
— end-to-end:

1. New Zustand store `testpack-store` with the readiness model.
2. Two new screens: Line Check **Preparation** and Line Check
   **Progress**.
3. Wire the existing pressure-test homepage so the **Open Preparation
   →** and **Open Progress →** buttons for Line Check actually navigate
   (currently they only fire `toast.info`).
4. Seed data wide enough that the demo scenario in section "Acceptance
   test" below runs end-to-end.

**Out of scope for this phase:** Item Clearance, Blinding, Testing,
Reinstatement. Do not build them. Leave the other 4 activity buttons
firing their existing `toast.info` calls — we'll wire them in later
phases.

## Domain model (from manual §16.1–16.2)

A **test pack** groups several **ISOs** (isometrics). Each ISO has
spools and welds. Line Check is a per-ISO (or per-testpack) activity.
Workflow:

```
ISO is eligible for line check when:
  - all spools are "supported"
  - all weld joints are "welded"

Preparation: PM assigns N eligible ISOs to a Line Checker team →
generates a "Checking Request" (CR-YYYY-NNN)
Progress:    Line checker reports back per ISO with:
               - check date (mandatory)
               - 0..N punch items: { code, description, category
(X/Y/Z), localization (iso/spool), originator }
             Marking line-check-done is gated on having a checking
date.
             Category X items must be cleared before testpack can go
to test.
```

## Files to create

### `store/testpack-store.ts`

```ts
type LineCheckStatus =
  | "NotEligible"
  | "Eligible"
  | "Assigned"
  | "InProgress"
  | "Done";
type PunchCategory = "X" | "Y" | "Z";

interface PunchItem {
  id: string; // PI-001 sequential
  code: string; // referential code, e.g. "PC-12"
  description: string;
  category: PunchCategory;
  isoId: string;
  spoolId?: string;
  originator: string; // line-checker team code
  createdAt: string; // ISO date
  clearedAt?: string;
  clearedBy?: string; // finishing team — comes in phase
  A2;
}

interface CheckingRequest {
  id: string; // CR-2026-014
  createdAt: string;
  assignedTo: string; // line-checker team code, e.g.
  "LC-01";
  isoIds: string[];
}

interface ISORecord {
  id: string; // ISO-1004
  testpackId: string; // TP-205
  spoolsSupported: boolean;
  allWeldsWelded: boolean;
  lineCheckStatus: LineCheckStatus;
  lineCheckAssignedTo?: string;
  lineCheckRequestId?: string;
  lineCheckDate?: string;
  punchItemIds: string[];
}

interface TestPackRecord {
  id: string; // TP-205
  no: string;
  subsystem: string;
  system: string;
  location: string;
  priority: "High" | "Medium" | "Low";
  isoIds: string[];
  // readiness gates (derived but cached for KPI speed)
  readyForTest: boolean;
}
```

Actions on the store:

- `assignLineCheck(isoIds: string[], team: string) => { requestId:
string }` — sets status to Assigned, creates request, **600–800ms
  artificial delay before commit**, returns the request id.
- `recordLineCheck(isoId: string, payload: { date: string; punchItems:
Omit<PunchItem, 'id' | 'createdAt' | 'isoId'>[] })` — sets status to
  Done, creates PIs.
- `getEligibleISOs()` — selector returning ISOs where `lineCheckStatus
=== 'Eligible'`.
- `getAssignedISOs(team?: string)` — selector for the Progress screen.
- KPI hook `useLineCheckKPIs()` → `{ eligibleCount, assignedCount,
doneCount, openPunchX, openPunchY, openPunchZ }`.

Persist key: `pipeqc-testpack`. Use the same persist + reset pattern
as `batches-store.ts`. Wire reset into `demo-store.ts:resetAll()`.

### `lib/testpack-seed.ts` (NEW — don't bloat `testpack-data.ts`)

Seed:

- 6 test packs (TP-201..TP-206), 1 already with all gates green (for
  explorer demo), 1 (**TP-205**) sized for the hero scenario — 5 ISOs
  eligible for line check.
- ~18 ISOs across them. TP-205 must have 5 eligible ISOs including
  **ISO-1004** which the demo script names.
- 1 historical checking request (CR-2026-013) already done — gives
  Progress screen non-empty initial state.
- 4 Line Checker teams: `LC-01..LC-04` (reuse §3.21 referential — for
  now just an array exported from this file).
- 6 punch codes referential: PC-01 "Missing gasket", PC-02 "Bolts
  short", PC-03 "Wrong torque", PC-04 "Rust on support", PC-05 "Tag
  missing", PC-06 "Insulation damaged". Categories per code preset but
  overridable.

Keep seed self-contained — no I/O, exported as plain consts.

### `app/testpack/pressure-test/line-check/preparation/page.tsx`

Server-component wrapper; the actual UI in
`components/testpack/line-check/preparation-view.tsx`.

UI requirements (match `weld-table.tsx` density, `filter-sidebar.tsx`
pattern):

- **Left panel (sidebar):** filters — Test Pack, System/Subsystem, PDS
  Area, Area Classification, Location. Use multi-select where it makes
  sense. KPI strip on top: "Eligible: N · Assigned: N · Done: N".
- **Main:** table of **Eligible** ISOs only (id, testpack, system,
  subsystem, spools count, welds count). Each row has a checkbox.
- **Floating action bar** (matches `release-work-dialog.tsx` cue):
  when ≥1 row checked, shows "{n} ISOs selected · Assign to: [team
  dropdown] · [Generate Checking Request]".
- On click: 600–800ms delay, store mutation, sonner toast
  `success("Checking Request CR-2026-014 created · 5 ISOs assigned to 
LC-01")` with an action button "View in Progress" → navigates to
  `/testpack/pressure-test/line-check/progress?request=CR-2026-014`.
- Empty state: "No eligible ISOs — all current work is already
  assigned or completed."

### `app/testpack/pressure-test/line-check/progress/page.tsx`

Reads optional `?request=` and `?team=` query params.

UI:

- **Top:** request filter chip (clearable) + team filter dropdown +
  KPI strip "Assigned: N · In Progress: N · Done: N".
- **Main:** table of ISOs whose status is `Assigned` or `InProgress`,
  columns: id, testpack, assigned-to, assigned-on, status badge.
- **Click row → side panel** (match `weld-detail-panel.tsx`): readonly
  ISO metadata + form:
  - Check date (date picker, required)
  - Punch items list with inline add: `[code select] [description 
(auto from code, editable)] [category X/Y/Z radio] [localization: 
ISO|Spool select] [originator pre-filled from team] [×]`
  - Save button — disabled while date invalid. On save: 600–800ms
    delay, store mutation, toast.
- After save, the row disappears from the Assigned list and **a
  notification is added** to notifications-store:
  - If any X punch item created → severity `warning`: "ISO {id} line
    check done — {n} category-X items blocking {testpack}"
  - Else → severity `success`: "ISO {id} line check complete · 0
    blocking items"

### Wire homepage

In `components/testpack/pressure-test-homepage.tsx` find the activity
card for **Line Check** (the buttons currently fire
`toast.info(\`Opening ${activity.name} Preparation\`)`).

Replace those two onClick handlers with `router.push(...)` calls to
the two new routes. Leave the other 4 activities' toasts untouched.

The KPI numbers shown on that card must come from `useLineCheckKPIs()`
(live), not the static seed. Other activities keep their static
numbers for now.

### Navigation

`config/navigation.ts` — no changes needed (Pressure Test entry
already exists), the sub-pages are nested routes under it.

## Constraints — DO NOT VIOLATE

1. **No new npm dependencies.** Use what's already installed (zustand,
   sonner, lucide-react, recharts, shadcn/ui).
2. **All new components `"use client"`.** Same as the rest of the app.
3. **Reuse, don't reinvent:** `status-badge.tsx` for badges,
   `weld-table.tsx` for table density, `weld-detail-panel.tsx` for side
   panel, `release-work-dialog.tsx` for the "selected N · action" footer
   pattern.
4. **600–800ms delay before every mutation.** This is a demo
   authenticity rule — see `PIPEQC_CONTEXT.md` conventions §5.
5. **No real backend, no fetch.** All state in Zustand, persisted to
   localStorage.
6. **No refactors outside this slice.** Don't touch unrelated files.
   If you find a bug in an unrelated file, leave a comment but do not fix
   it here.
7. **Don't generate documentation files.** Update
   `docs/PIPEQC_CONTEXT.md` only if a top-level fact about the project
   changed (e.g., file structure section needs the new routes added).
8. Categories X/Y/Z are domain terms — preserve casing exactly.

## Acceptance test (the demo script must work end-to-end)

After `npm run dev`, with fresh localStorage:

1. Land on `/`. Notifications feed must include "TP-205: 5 ISOs ready
   for line check" (add this seed notification).
2. Go to `/testpack/pressure-test`. Line Check card must show
   **Eligible: 5** (live).
3. Click **Open Preparation →**. Lands on the Prep screen with 5 ISOs
   visible.
4. Check all 5 rows. Footer appears "5 ISOs selected · Assign to:
   [select] · [Generate]".
5. Pick LC-01, click Generate. Spinner ~700ms, toast appears with
   request number and "View in Progress" action.
6. Click the action. Lands on Progress screen filtered to CR-2026-014,
   showing 5 rows.
7. Click ISO-1004 row. Side panel opens. Set check date = today. Click
   "+ Add punch item" twice:
   - Row 1: code PC-01, category X, ISO-localization, originator
     LC-01.
   - Row 2: code PC-04, category Y, spool-localization (pick any
     spool), originator LC-01.
     Click Save. ~700ms, toast `"ISO-1004 line check recorded"`, panel
     closes, row disappears.
8. Go back to `/`. The notifications feed must now include "ISO-1004
   line check done · 1 category-X item blocking TP-205" with **warning**
   severity.
9. Go back to `/testpack/pressure-test`. Line Check KPIs must be
   **Eligible: 4 · Assigned: 4 · Done: 1**.
10. Hit "Reset demo" in top nav. All counters return to initial seed
    values. Notification feed reverts.

If any of these 10 steps fails, the slice is not done.

## Definition of done

- All 10 acceptance steps pass when run manually.
- `npm run build` succeeds with no type errors.
- No ESLint errors introduced (warnings OK if consistent with
  codebase).
- New files use existing imports / aliases (`@/components`, `@/store`,
  `@/lib`).
- `docs/PIPEQC_CONTEXT.md` file-structure section reflects the new
  routes/components/store (one-line additions only — don't rewrite the
  file).

When you're done, report:

- List of files created/modified.
- Any deviations from this spec and why.
- Any acceptance steps you weren't able to verify manually and why.
