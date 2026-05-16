# Task: PipeQC Track A, Phase A3 — Testpack Explorer Release Tracking

(live gates)

Read `docs/PIPEQC_CONTEXT.md` first. Phases A1–A6 are merged — Anna's
full business flow works end-to-end (line check → item clearance →
blinding → hydrotest → reinstatement). This phase adds the **manager
view**: a single screen showing TP-205's readiness as 7 clickable
gates.

## Goal

The existing `components/testpack/testpack-explorer.tsx` (1455 LOC)
drills down System → Subsystem → Testpack with tabs **General /
Release Tracking / Operation Management / Progress Status**, but it
reads from static `lib/testpack-data.ts` and the gates show hardcoded
numbers.

Wire the **Release Tracking tab** to live data from `useTestpackStore`
for testpacks that exist in the store (TP-201..TP-206). Make each
gate a **clickable row** that navigates to the corresponding A1–A6
screen pre-filtered to that testpack.

**Out of scope:** General / Operation Management / Progress Status
tabs (keep static). Other static testpacks (TP-207+) keep their
hardcoded gate numbers.

## The 7 gates (per manual §18.2, adapted to what we actually track)

Each gate has a state (`green` / `amber` / `red` / `slate`), a metric
(number or boolean), and a deep-link.

| #                              | Gate name                                          | Computation from store                               | Green when | Click target |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------- | ---------- | ------------ |
| 1                              | Welded joints to be welded                         | (stub — always 0)                                    | always     | — (no        |
| link)                          |
| 2                              | Flange joints to be bolted                         | (stub — always 0)                                    | always     | —            |
| 3                              | Welded joints still to be NDE-tested               | (stub — always 0)                                    |
| always                         | —                                                  |
| 4                              | **Line Check completion**                          | count of `iso.lineCheckStatus !==                    |
| "Done"` across testpack's ISOs | =0                                                 | `/testpack/pressure-test/line-ch                     |
| eck/{preparation               | progress}?testpack={id}` — preparation if count>0, |
| progress otherwise             |
| 5                              | **Open X punch items**                             | count of open X items on testpack's                  |
| ISOs                           | =0                                                 | `/testpack/pressure-test/item-clearance/{preparation | progr      |
| ess}?testpack={id}`            |
| 6                              | QC released for test                               | (stub — green when gates 1–5 are green)              |
| derived                        | —                                                  |
| 7                              | **Ready For Test**                                 | gates 1–6 all green AND `blindingStatus ===          |
| "Eligible"` (or further)       | yes/no                                             | composite — see below                                |

Plus 3 additional gates for the **post-RFT** workflow (since Anna's
demo goes beyond RFT):

| #                                                                | Gate name                  | Computation                     | Green when | Click target       |
| ---------------------------------------------------------------- | -------------------------- | ------------------------------- | ---------- | ------------------ |
| 8                                                                | **Blinded**                | `blindingStatus`                | === "Done" | `/testpack/pressur |
| e-test/blinding/{preparation                                     | progress}?testpack={id}`   |
| 9                                                                | **Hydrotest passed**       | `testingDoneDate` set           | yes        |
| `/testpack/pressure-test/testing-precomm/progress?testpack={id}` |
| 10                                                               | **Pre-commissioned**       | `preCommDate` set               | yes        |
| `/testpack/pressure-test/testing-precomm/progress?testpack={id}` |
| 11                                                               | **Reinstatement complete** | count of open Y items on tested |
| testpacks + open Z items on pre-commed testpacks                 | =0                         | `/testpack/pre                  |
| ssure-test/reinstatement/{preparation                            | progress}?testpack={id}`   |

## UI requirements for the Release Tracking section

When the user opens a testpack that exists in the store (e.g. TP-205),
show the existing static layout BUT replace the gate list with this
live block:

### Composite header badge (top of section)

A single big pill that synthesizes the overall state:

- 🔴 **"NOT READY FOR TEST · {N} blockers"** — if any of gates 4, 5 is
  non-zero (red/amber).
- 🟡 **"READY FOR TEST — awaiting blinding"** — if gates 4, 5 are
  green but blindingStatus is "Eligible" or "Assigned".
- 🔵 **"BLINDED — hydrotest in progress"** — if blinded but not yet
  tested-done.
- 🟢 **"HYDROTEST PASSED · awaiting reinstatement"** — if tested-done
  but Y/Z items still open.
- 🟢 **"FULLY COMMISSIONED"** — all gates green including
  reinstatement. **Big climax state.**

Use existing `status-badge.tsx` pattern.

### Gate list (vertical, below the badge)

Each row: `[status icon] {gate name} · {metric} · [→ chevron]`

Status icons (12×12):

- Green check (`emerald-500`) — gate done / passed
- Amber dot (`amber-500`) — in progress (e.g. line check has assigned
  ISOs but not all done)
- Red dot (`red-500`) — blocking (e.g. open X items exist)
- Slate dot (`slate-400`) — not applicable yet

Clickable rows (gates 4, 5, 8, 9, 10, 11) get hover state + chevron.
Click → `router.push(deepLink)`.

Static rows (1, 2, 3, 6, 7) are dimmed and non-clickable.

### Smart routing for the deep links

The target URL has two flavors per gate (Preparation vs Progress):

- If the gate's metric > 0 (work remaining) → **Preparation**.
- If the metric is 0 but historical state exists (e.g. blinded,
  tested) → **Progress** (to view records).
- For Testing/Pre-comm there's only a Progress screen — always go
  there.

## Make A1–A6 screens accept `?testpack=` query param

Currently the prep/progress screens accept `?request=` and `?team=`.
Add `?testpack=` support to all 8 screens:

- line-check (prep + progress)
- item-clearance (prep + progress)
- blinding (prep + progress)
- testing-precomm (progress)
- reinstatement (prep + progress)

When `?testpack=` is present, the sidebar filter "Test Pack" should
auto-select that value on mount, and the chip filter at the top should
show `testpack: TP-205` (clearable, same pattern as the existing
`?request=` chip).

## Surface store testpacks in the Explorer

The Explorer currently lists systems → subsystems from
`testpack-data.ts`. The store's 6 testpacks (TP-201..TP-206) reference
systems SYS-001..SYS-003 which may or may not exist in the static
data. To ensure **TP-205 is discoverable**:

**Simplest fix:** in the existing testpack list rows, add a small
**"LIVE"** pill next to testpacks that exist in `useTestpackStore`.
Don't change the data source for the list itself — just match by ID.
If `useTestpackStore.testPacks.find(tp => tp.no === row.no)` returns
truthy, show the LIVE pill. Clicking the row continues to the existing
detail view; the Release Tracking tab will pick up the live data
automatically.

If the static `testpack-data.ts` doesn't list TP-205, **append it
programmatically** at the top of the Explorer's testpack list (one
extra synthetic row, marked LIVE). This keeps the static fixture
untouched.

## Constraints (unchanged)

1. No new npm deps.
2. All new components `"use client"`.
3. Reuse `status-badge.tsx`, existing tab/table density from
   `testpack-explorer.tsx`.
4. No backend, no fetch.
5. **Don't break A1–A6 regression** — the full hero flow must still
   pass.
6. `?testpack=` should be an additive filter, not a replacement —
   combining with `?request=` is fine.

## Acceptance test

Fresh localStorage:

1. Run A1→A6 full flow on TP-205 (or at least up to a known state,
   e.g. just A1 done).
2. Sidebar → **Testpack › Explorer**.
3. Find TP-205 in the testpack list — it has a **LIVE** pill.
4. Click TP-205 → detail view opens.
5. Switch to **Release Tracking** tab.
6. Verify the composite header badge reflects current state (e.g.
   after only A1: 🔴 "NOT READY FOR TEST · open X items").
7. Each clickable gate has hover state + chevron. Clicking gate 5
   ("Open X punch items") with metric=2 navigates to
   `/testpack/pressure-test/item-clearance/preparation?testpack=TP-205`.
8. On the Item Clearance Preparation screen: sidebar Test Pack filter
   is preset to TP-205, a `testpack: TP-205` chip is visible at the top,
   clearable.
9. Return to Explorer (back-link). Run the full flow to completion
   (A1→A6).
10. The composite badge now reads 🟢 **"FULLY COMMISSIONED"**. All 11
    gate rows are green.
11. Click gate 4 ("Line Check completion") now → navigates to
    `…/line-check/progress?testpack=TP-205` (because metric=0, history
    exists).
12. Regression: A1–A6 flow without using Explorer still works
    identically.
13. `npx tsc --noEmit` and `npm run build` clean.

## Definition of done

- All 13 acceptance steps pass manually.
- A1–A6 regression intact.
- `docs/PIPEQC_CONTEXT.md` Explorer section updated with the
  live-gates wiring note.

Report files created/modified, deviations, and any steps you couldn't
verify manually.
