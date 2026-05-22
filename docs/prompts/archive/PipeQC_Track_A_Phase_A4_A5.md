# Task: PipeQC Track A, Phase A4+A5 + Navigation polish

Read `docs/PIPEQC_CONTEXT.md` first. Phases A1 (Line Check) and A2
(Item Clearance) are merged — reuse their patterns. This slice has two
parts:

- **Part 1 — Navigation fixes** (small, do first)
- **Part 2 — Blinding workflow (A4)** + **Testing & Pre-comm (A5)**

## Part 1 — Navigation fixes

### 1.1 Breadcrumb labels

In `components/pipeqc/top-nav.tsx`, the `routeLabels` map is missing
all new route segments. Add:

```ts
testpack: "Testpack",
"pressure-test": "Pressure Test",
"line-check": "Line Check",
"item-clearance": "Item Clearance",
blinding: "Blinding",
"testing-precomm": "Testing & Pre-comm",
reinstatement: "Reinstatement",
preparation: "Preparation",
progress: "Progress",
explorer: "Explorer",
flange: "Flange Management",
erection: "Erection",
"site-weld-progress": "Site Weld Progress",
```

### 1.2 Fix 404 on intermediate breadcrumb segments

Breadcrumb makes every non-leaf segment a link. Currently clicking
`Line Check` or `Item Clearance` segments leads to 404 because no
`page.tsx` exists at those paths.

Create **redirect pages** at:

- `app/testpack/pressure-test/line-check/page.tsx`
- `app/testpack/pressure-test/item-clearance/page.tsx`
- `app/testpack/pressure-test/blinding/page.tsx` (Part 2 will create
  the children)
- `app/testpack/pressure-test/testing-precomm/page.tsx` (Part 2)
- `app/testpack/pressure-test/reinstatement/page.tsx` (placeholder —
  empty redirect for future)

Each page uses Next.js server-side redirect:

```tsx
import { redirect } from "next/navigation";
export default function Page() {
  redirect("/testpack/pressure-test");
}
```

That way clicking the breadcrumb segment cleanly bounces back to the
Pressure Test homepage instead of 404.

### 1.3 "Back to Pressure Test" link on every sub-screen

At the top of each of these views, **above the existing H1**, add a
back-link row:

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
// ...
<Link
  href="/testpack/pressure-test"
  className="inline-flex items-center gap-1 text-xs text-slate-500
hover:text-sky-600 mb-3"
>
  <ArrowLeft className="h-3.5 w-3.5" />
  Back to Pressure Test
</Link>;
```

Add this to **all 4 existing sub-screens**:

- `components/testpack/line-check/preparation-view.tsx`
- `components/testpack/line-check/progress-view.tsx`
- `components/testpack/item-clearance/preparation-view.tsx`
- `components/testpack/item-clearance/progress-view.tsx`

And to all 3 new screens you create in Part 2.

### 1.4 Acceptance for navigation

- Click breadcrumb segment **"Line Check"** from
  `/testpack/pressure-test/line-check/preparation` → lands on
  `/testpack/pressure-test` (no 404).
- Same for "Item Clearance", "Blinding", "Testing & Pre-comm".
- Breadcrumb on the same page reads: `Testpack › Pressure Test › Line
Check › Preparation` (not `testpack › pressure-test › line-check ›
preparation`).
- "← Back to Pressure Test" link is visible at the top of every
  sub-screen.

---

## Part 2 — Blinding (A4) + Testing & Pre-comm (A5)

### Business context (manual §16.5–16.7)

A test pack flows: `ready for blinding → blinded → tested →
  pre-commissioned`.

- **Blinding** (заглушение): a Blinding Team installs temporary blind
  plates on testpack ends so pressure won't escape during hydrotest. Has
  Preparation + Progress.
- **Testing & Pre-commissioning**: just dates. Per manual §16.7, Easy
  Piping does NOT manage Preparation — only records `testing start
date`, `testing done date`, `pre-comm date`. So Testing has Progress
  only (one screen).

A testpack is **eligible for Blinding** when:

- `openX == 0` on its ISOs (all category-X punch items cleared)

A testpack is **eligible for Testing** when:

- `blindingStatus === "Done"` (`blindingDate` is set).

A testpack is **eligible for Pre-comm date entry** when:

- `testingDoneDate` is set.

### Store changes (`store/testpack-store.ts` + `lib/testpack-seed.ts`)

Add to `TestPackRecord`:

```ts
blindingStatus: "NotEligible" | "Eligible" | "Assigned" | "Done"
blindingAssignedTo?: string
blindingRequestId?: string
blindingDate?: string
testingStartDate?: string
testingDoneDate?: string
preCommDate?: string
```

Initialize these on every seed testpack. Set `blindingStatus` based on
whether the testpack already had X-blockers at seed time:

- TP-205 starts `blindingStatus: "NotEligible"` (has 2 historical
  X-blockers on ISO-1003).
- TP-201..TP-204, TP-206: set to `"NotEligible"` for now (don't muddy
  the demo).

Add `SEED_BLINDING_TEAMS` (4 teams BT-01..BT-04, "Blinding Team Alpha"
/ Bravo / Charlie / Delta) and `SEED_BLINDING_REQUESTS = []`.

Add to state shape: `blindingRequests: BlindingRequest[]`,
`BlindingRequest = { id: "BR-YYYY-NNN", createdAt, assignedTo,
  testpackIds }`.

**Eligibility recomputation:** create an internal helper
`recomputeBlindingEligibility(state)` that loops testpacks and sets
`blindingStatus = "Eligible"` for any testpack where `blindingStatus
  === "NotEligible"` and the testpack has 0 open X punch items on its
ISOs. Call this helper:

- inside `markPunchItemsCleared` (after the existing notification
  logic)
- inside `recordLineCheck` (after committing punch items — so adding
  X-items can demote a testpack back to NotEligible too: if a previously
  Eligible testpack gets a new X-item, demote it back to NotEligible,
  but only if it's not yet Assigned/Done)

New selectors:

- `getEligibleForBlinding()` — testpacks with `blindingStatus ===
"Eligible"`
- `getAssignedForBlinding(team?: string)` — `blindingStatus ===
"Assigned"`
- `getTestableTestpacks()` — `blindingStatus === "Done"` AND
  `testingStartDate` not set OR `testingDoneDate` not set (still need
  work)
- `getTestpacksAwaitingPreComm()` — `testingDoneDate` set AND
  `preCommDate` not set

New mutations:

- `assignBlinding(testpackIds: string[], team: string) => { requestId:
string }` — sets `blindingStatus = "Assigned"`, `blindingAssignedTo =
team`, `blindingRequestId`, creates `BlindingRequest`.
- `recordBlindingDate(testpackId: string, date: string)` — sets
  `blindingDate`, `blindingStatus = "Done"`. Triggers a notification
  (see below).
- `setTestingDates(testpackId: string, payload: { testingStartDate?,
testingDoneDate?, preCommDate? })` — partial update. Triggers
  notifications on `testingDoneDate` and `preCommDate` set.

Bump persist `version: 3` with `migrate: return undefined` (full reset
OK for demo).

New KPI hooks:

- `useBlindingKPIs()` → `{ eligibleCount, assignedCount, doneCount }`
- `useTestingKPIs()` → `{ readyForTestingCount,
testingInProgressCount, testedCount, preCommedCount }`

Wire `resetDemo` and the demo-store's `resetAll` to reset blinding
requests.

### Screens

#### Blinding — Preparation

- Route: `/testpack/pressure-test/blinding/preparation`
- Component: `components/testpack/blinding/preparation-view.tsx`
- Pattern: clone Line Check Preparation but rows = **testpacks** (not
  ISOs).
- Sidebar filters: Test Pack location, System/Subsystem, PDS Area,
  Area Classification, Date RFT (Ready For Test — alias for
  `blindingStatus === "Eligible"` here, just a date filter on
  `lineCheckDate` of the testpack's youngest ISO, optional).
- KPI strip: `Eligible: N · Assigned: N · Done: N`.
- Table columns: `Testpack No · System · Subsystem · Location ·
Priority · # ISOs · # Welds`.
- Floating action bar: `{n} testpacks selected · Assign to: [BT
select] · [Generate Blinding Request]` → 600–800 ms → toast `"Blinding
 Request BR-2026-001 created · 1 testpacks assigned to BT-01"` with
  action `View in Progress` →
  `/testpack/pressure-test/blinding/progress?request=BR-2026-001`.

#### Blinding — Progress

- Route: `/testpack/pressure-test/blinding/progress`
- Component: `components/testpack/blinding/progress-view.tsx`
- Reads `?request=` and `?team=`.
- KPI strip: `Assigned: N · Done: N`.
- Table of `Assigned` testpacks, click row → side panel:
  - readonly metadata (testpack no, system, location, priority,
    assigned-to, assigned-on)
  - `Blinding date` (date picker, required, default today)
  - `Save blinding record` → 600–800 ms → store update → toast → row
    leaves table.
- Below: "Recently blinded" section listing last 10 `Done` testpacks
  (dimmed).
- **Notification on save (success severity):**
  `"TP-{no}: blinded — ready for hydrotest"`

#### Testing & Pre-comm — Progress (single screen)

- Route: `/testpack/pressure-test/testing-precomm/progress`
- Component: `components/testpack/testing-precomm/progress-view.tsx`
- No Preparation screen — per manual §16.7.
- KPI strip: `Ready for testing: N · In test: N · Tested: N ·
Pre-commissioned: N`.
- Table of testpacks that are `blindingStatus === "Done"` (i.e.
  relevant to testing/pre-comm), columns: `Testpack · System · Location
· Blinded on · Test start · Test done · Pre-comm`.
  - Empty cells render as `—`. Filled cells render formatted date.
- Click row → side panel with 3 date inputs:
  - **Testing start date** (any date)
  - **Testing done date** (must be ≥ start date; disabled if start not
    set)
  - **Pre-commissioning date** (must be ≥ done date; disabled if done
    not set)
- Save button is `[Save dates]`. 600–800 ms delay before commit. Toast
  `"TP-{no}: dates updated"`.
- **Notification cascade on save:**
  - If `testingDoneDate` newly set: **success** notification
    `"TP-{no}: hydrotest passed (pressure held — ready for
pre-commissioning)"`. This is the demo climax — make sure it actually
    fires.
  - If `preCommDate` newly set: **success** notification `"TP-{no}:
pre-commissioning complete"`.

### Wire homepage

In `components/testpack/pressure-test-homepage.tsx`:

- Blinding card: read live numbers from `useBlindingKPIs()`. Replace
  `toast.info` with `router.push` to the two routes.
- Testing & Pre-comm card: read live numbers from `useTestingKPIs()`.
  The card has only one action button — "Open Progress →" pointing to
  `/testpack/pressure-test/testing-precomm/progress`. **Remove or hide
  the Preparation button** for this card only (Testing has no
  Preparation phase).
- Reinstatement card stays toast.info for now (Phase A6).

### Constraints

1. No new npm dependencies.
2. All new components `"use client"`.
3. Reuse `status-badge.tsx`, `weld-table.tsx` density,
   `weld-detail-panel.tsx` side-panel pattern.
4. 600–800 ms delay before every mutation.
5. No backend, no fetch.
6. **Don't break A1 or A2 acceptance tests.** The full A1→A2→A4→A5
   chain must run end-to-end after this slice.
7. **All sub-screens get the "← Back to Pressure Test" link** (Part
   1.3 retroactively applied to A1/A2 too).

### Acceptance test (full demo flow)

Fresh localStorage, `npm run dev`:

1. `/` — see seed notification "TP-205: 5 ISOs ready for line check".
2. `/testpack/pressure-test` — Line Check **Eligible: 5**, Item
   Clearance **Open X: 2**, Blinding **Eligible: 0**, Testing **Ready:
   0**.
3. Run A1 flow (assign all 5 TP-205 ISOs to LC-01, mark ISO-1004 done
   with 1 X PC-01 + 1 Y PC-04).
4. Run A2 flow (assign all 3 X items to FT-01, mark all 3 cleared).
5. After step 4 the success notification "TP-205: all category-X items
   cleared — ready for blinding" fires.
6. `/testpack/pressure-test` — Blinding card now shows **Eligible: 1**
   (TP-205).
7. Click **Open Preparation →** on Blinding → lands on Blinding
   Preparation, sees TP-205.
8. Check TP-205, pick BT-01, click Generate. Toast `BR-2026-001 …`
   with View in Progress.
9. Click action → Progress screen filtered to BR-2026-001 shows TP-205
   row.
10. Click row → side panel. Pick today's date. Save.
11. Notification "TP-205: blinded — ready for hydrotest" appears on
    `/`.
12. `/testpack/pressure-test` — Blinding **Done: 1**, Testing **Ready
    for testing: 1**.
13. Click **Open Progress →** on Testing & Pre-comm. (Preparation
    button is absent.)
14. Find TP-205 row, click → side panel. Set test start = today, save.
15. Reopen the same row. Set test done = today, save.
16. Notification **"TP-205: hydrotest passed (pressure held — ready
    for pre-commissioning)"** appears on `/`. **THIS IS THE DEMO CLIMAX —
    verify it fires.**
17. Reopen TP-205, set pre-comm date = today, save.
18. Notification "TP-205: pre-commissioning complete" appears.
19. `/testpack/pressure-test` — Testing **Pre-commissioned: 1**.
20. Navigation check: from
    `/testpack/pressure-test/blinding/progress`, click breadcrumb segment
    **Blinding** → redirects to `/testpack/pressure-test`, not 404.
21. Navigation check: same for **Line Check**, **Item Clearance**,
    **Testing & Pre-comm** segments.
22. Navigation check: every sub-screen has a visible "← Back to
    Pressure Test" link at the top.
23. Breadcrumb labels read in Title Case (e.g. "Line Check", not
    "line-check").
24. Reset Demo from top nav → all counts return to seed values.

### Definition of done

- All 24 acceptance steps pass manually.
- `npm run build` and `npx tsc --noEmit` both clean.
- A1 and A2 acceptance tests still pass (regression).
- `docs/PIPEQC_CONTEXT.md` file-structure section updated.

Report files created/modified, deviations, and any steps you could not
verify manually.
