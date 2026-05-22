# Task: PipeQC Track A, Phase A2 — Item Clearance workflow

You are continuing an industrial piping QC demo. **Read
`docs/PIPEQC_CONTEXT.md` first.** Phase A1 (Line Check) is already
merged — see `store/testpack-store.ts`,
`components/testpack/line-check/*`,
`app/testpack/pressure-test/line-check/*`. Reuse its patterns 1:1.

## Goal of this slice

Build the **Item Clearance** activity end-to-end:

1. Extend `testpack-store` with: Finishing Team referential, Clearance
   Requests, punch-item clearance mutations and selectors.
2. Two new screens:
   `/testpack/pressure-test/item-clearance/preparation` and
   `/testpack/pressure-test/item-clearance/progress`.
3. Wire the Item Clearance card on `pressure-test-homepage.tsx`
   (currently fires `toast.info`).
4. **Tune the seed** so the homepage shows clean numbers for the demo
   (see "Seed adjustments" below).

**Out of scope:** Blinding, Testing, Reinstatement, Explorer changes.
Leave their toast.info handlers alone.

## Seed adjustments (do this FIRST)

In `lib/testpack-seed.ts`:

- Reduce `SEED_ISOS` so that **only 5 ISOs have `lineCheckStatus: 
"Eligible"`** at hydration time — all 5 must be in TP-205. ISOs in
  TP-201..TP-204, TP-206 should be `NotEligible` (set `spoolsSupported`
  or `allWeldsWelded` to `false`).
- Add a new seed array `SEED_FINISHING_TEAMS` (4 teams: `FT-01..FT-04`
  with names like "Finishing Team Alpha").
- Add 2 historical open punch items of category X attached to ISO-1003
  (which is already Done from A1's seed) — so the Item Clearance
  Progress screen has non-empty initial state. Codes/descriptions from
  the existing `PUNCH_CODES` referential.

After this change, the A1 acceptance test must still pass (the spec's
"5 in TP-205" requirement is now exactly met).

## Domain model extension (manual §16.3–16.4)

```
PunchItem already exists in testpack-store. Add:
  - clearedAt?: string         // already in type
  - clearedBy?: string         // finishing team code, was placeholder
  - clearanceRequestId?: string // new field

ClearanceRequest:
  id: string                   // ICR-2026-NNN
  createdAt: string
  assignedTo: string           // finishing team code
  punchItemIds: string[]

Workflow:
  Open X/Y/Z punch items → PM assigns N items to a Finishing Team
    → generate "Item Clearance Request" (ICR-YYYY-NNN)
  Finishing team reports back → PM marks each cleared (date +
clearedBy auto-filled from team)
  When the last X-blocking punch item of a testpack is cleared, the
testpack
  becomes one gate closer to "Ready For Test" (we won't compute
readyForTest fully
  until later phases — just expose a derived selector now).
```

## Store changes

In `store/testpack-store.ts`:

- Add `clearanceRequests: ClearanceRequest[]` state + seed.
- Selectors:
  - `getOpenPunchItems(category?: 'X' | 'Y' | 'Z')` — punch items
    without `clearedAt`.
  - `getAssignedPunchItems(team?: string)` — open, with
    `clearanceRequestId` set.
  - `getUnassignedPunchItems(category?)` — open, no
    `clearanceRequestId`.
  - `getNextClearanceRequestId()` — analogous to `getNextRequestId`.
- Mutations:
  - `assignItemClearance(punchItemIds: string[], team: string) => { 
requestId: string }` — creates ICR, sets `clearanceRequestId` on the
    punch items.
  - `markPunchItemsCleared(punchItemIds: string[], clearedBy: string, 
date: string)` — sets `clearedAt`, `clearedBy`. (Batch operation —
    typical workflow.)
- Extend `useLineCheckKPIs` is fine as-is. Add a new hook
  `useItemClearanceKPIs()` returning `{ openX, openY, openZ, 
assignedCount, clearedToday }`.
- Wire `resetDemo` to reset clearanceRequests.

Persist key, version, and migration: bump store version to `2` if you
change persisted shape (it does — new array). Provide a `migrate`
function in persist config that wipes old data (`return undefined`
triggers reset — acceptable for a demo).

## `app/testpack/pressure-test/item-clearance/preparation/page.tsx` +

view

Pattern: clone `components/testpack/line-check/preparation-view.tsx`,
adapt to punch items.

- **Sidebar filters:** Category (X/Y/Z multi-select, default X only),
  Test Pack, System, Area, Originator team.
- **KPI strip:** "Open X: N · Open Y: N · Open Z: N · Assigned today:
  N".
- **Table** of unassigned open punch items: columns `Punch ID · Code ·
 Description · Cat (badge) · ISO · Testpack · Originator · Created`.
  Checkboxes per row.
- **Floating action bar** when ≥1 row checked: `"{n} punch items 
selected · Assign to: [FT dropdown] · [Generate Item Clearance 
Request]"`.
- On submit: 600–800 ms delay, `assignItemClearance(...)`, toast
  `success("Item Clearance Request ICR-2026-001 created · 2 items 
assigned to FT-01")` with action "View in Progress" → `/testpack/press
ure-test/item-clearance/progress?request=ICR-2026-001`.
- Empty state: "No open punch items in the selected categories — all
  current punches are assigned or cleared."

## `app/testpack/pressure-test/item-clearance/progress/page.tsx` +

view

Pattern: clone `progress-view.tsx`.

- Reads `?request=` and `?team=`.
- KPI strip: same shape, but adds "Cleared today" count.
- Table of assigned-but-not-cleared punch items: columns `Punch ID · 
Code · Description · Cat · ISO · Testpack · Assigned-to · 
Assigned-on`. Multi-row select.
- **Bulk action bar** (different from A1 — clearance is typically
  batched): `"{n} items selected · Cleared by: [auto-filled from team] ·
 Date: [today] · [Mark Cleared]"`.
- On submit: 600–800 ms delay, `markPunchItemsCleared(...)`, toast
  `success("Marked 2 punch items as cleared")`. Bulk row removal.
- **Notification cascade:** if any cleared item was category X AND it
  was the last open X item on its testpack → add a `success`
  notification: `"TP-{id}: all category-X items cleared — ready for 
blinding"`.
- **Below the main table**, "Recently cleared" section (last 10
  cleared items, dimmed).

## Wire homepage

In `components/testpack/pressure-test-homepage.tsx`:

- Item Clearance card: read live numbers from
  `useItemClearanceKPIs()`.
- Replace the two `toast.info` calls with `router.push(...)` to the
  new routes.
- Visual: if `openX > 0`, the card's accent shifts to **amber-600**
  (warning) instead of slate. Use existing `status-badge` pattern.

## Acceptance test (must pass)

Fresh localStorage, `npm run dev`:

1. Land on `/`. The seed notification "TP-205: 5 ISOs ready for line
   check" is visible.
2. `/testpack/pressure-test` — Line Check card shows **Eligible: 5**
   (the A1 fix). Item Clearance card shows **Open X: 2 · Open Y: 0 · Open
   Z: 0** (from A2's seed PIs on ISO-1003).
3. Run the A1 flow: assign 5 ISOs of TP-205 to LC-01, mark ISO-1004
   done with 1 X-item (PC-01) + 1 Y-item (PC-04). Toast appears, warning
   notification fires.
4. `/testpack/pressure-test` — Item Clearance card now shows **Open X:
   3 · Open Y: 1 · Open Z: 0**.
5. Click **Open Preparation →** on Item Clearance card. Lands on Prep
   screen filtered to X by default — sees 3 X-items.
6. Filter sidebar: leave X only. Select all 3 X-items. Footer "3 punch
   items selected". Pick FT-01, click Generate. ~700 ms, toast with
   action.
7. Click action → lands on Progress screen filtered to that ICR — 3
   rows visible.
8. Select all 3, click "Mark Cleared". ~700 ms, toast "Marked 3 punch
   items as cleared", rows disappear.
9. A new success notification appears on `/`: "TP-205: all category-X
   items cleared — ready for blinding" (because ISO-1004's X-item was the
   last X-blocker on TP-205).
10. `/testpack/pressure-test` — Item Clearance card now shows **Open
    X: 0 · Open Y: 1 · Open Z: 0**.
11. Reset demo from top nav. All counts return to seed values.

## Constraints (unchanged from A1)

1. No new npm dependencies.
2. All new components `"use client"`.
3. Reuse `status-badge.tsx`, `weld-table.tsx` density,
   `weld-detail-panel.tsx` side-panel pattern, `release-work-dialog.tsx`
   floating-bar pattern.
4. 600–800 ms delay before every mutation.
5. No backend, no fetch — Zustand + localStorage only.
6. No refactors outside this slice.

## Definition of done

- All 11 acceptance steps pass manually.
- `npm run build` and `npx tsc --noEmit` both clean.
- A1 acceptance test still passes (regression).
- `docs/PIPEQC_CONTEXT.md` file-structure section updated with new
  routes/components.

When done, report files created/modified, deviations, and any steps
you could not verify.
