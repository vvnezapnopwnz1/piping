# Task: PipeQC Track G, Phase G5 — Laydown stage + funnel deep-link cleanup

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` (parts 5 and 7) first.
Tracks A, B, E2 (E2.1/E2.3/E2.5), N (N1+N2), F2+E2.4, C1, **G1**, **G2**, **G1.1**, **G3**, **G4** are merged. **G4 is a hard prerequisite** — its `paint-store`, `PaintRecord` data model, and the three-bucket internal-chip pattern are what this slice extends. After G5, Track G is **complete**: all 7 active stages of §7 Spool Fabrication Lifecycle have a real screen, persisted state, and an audit trail.

This slice does two things in one shippable change:

1. **Activate the last stage** of §7 — **Laydown** — the holding pattern between paint return and erection dispatch. After paint sign-off, a spool is placed on the laydown yard with a yard-location code; later it is released to site (and from then on `useSpoolReadiness` + the Erection dashboard's E2.3 "Spool delivery readiness" card take over). The Laydown record carries the yard location and the release-to-site timestamp.
2. **Fix the funnel deep-link bug** introduced incrementally by G3 and G4: every funnel tile currently lands on `/fabrication/<screen>` with the screen's *default* chip, regardless of which tile was clicked. Result today: clicking `Sent to Paint` lands on `Awaiting Dispatch`, clicking `QC Release` lands on `Awaiting Release`, etc. This is a real demo bug — the audience sees a tile labeled "Sent to Paint: 1 spool" then a screen labeled "Awaiting Dispatch: 0 spools" and has to switch chips manually. Fix: every tile deep-links to the chip that matches its stage. **No tile is rerouted to a different screen** — only `?status=` is added.

Today: stage `Laydown` exists in the `SpoolFabStage` enum (G1) and the funnel renders it as an inert grey tile. There is no record, no action screen, no audit trail.

Size: **~0.35 day** (was originally scoped 0.25d; funnel deep-link cleanup adds ~0.1d); ~250–350 LOC across 1 new persisted store + 4 new files + edits to `spool-data.ts`, `spool-stage.ts`, `fabrication-dashboard.tsx`, `navigation.ts`, `demo-store.ts`, `store/index.ts`. Smaller than G3/G4 because the Laydown record is a single mutation per spool (place on yard); the release-to-site action is optional polish for the demo and can be left out without losing the §7 completion narrative.

---

## Why this slice exists (demo narrative)

Today the demo can drive a spool from Material Check → Weld Progress → QC Release → Paint, but then the trail goes cold. Hassan (the erection superintendent in `track-upstream.md` §2) sees painted spools without knowing where they physically are. G5 closes the gap.

> *Anna signs off final QC on `PL-TK100-002-A`. The spool flips to `Painted`. She switches to the **Laydown** screen, picks the spool from "Awaiting Placement", types yard location `YARD-A-12` (or picks from a small dropdown), clicks "Place on yard". The spool flips to `Laydown`. The funnel updates. The Erection dashboard's "Spool delivery readiness" card (E2.3) now treats it as physically present and ready to dispatch. Optional final beat: click "Release to site" on a yard-placed spool → a home notification fires for Hassan: "PL-TK100-002-A released from laydown — ready for erection".*

This is the answer to the recurring question: *"how do you know which painted spools are physically in your yard vs. still at the paint shop's pickup gate?"* Today: nothing. Post-G5: yard location + audit trail per spool.

---

## Goal

1. **Data model**: extend `lib/spool-data.ts` with `LaydownRecord`, `YARD_LOCATIONS`, `LAYDOWN_SEED`.
2. **Stage derivation**: widen `deriveFabStage(readiness, mcRecord?, qcRecord?, paintRecord?, laydownRecord?)`. New rule (highest priority): `laydownRecord?.placedDate` set → `"Laydown"`.
3. **Persisted store**: new `store/laydown-store.ts` mirroring `paint-store.ts`. Persist key `pipeqc-laydown`, version 1. Cascade `resetLaydown()` into `demo-store.ts:resetAll()`.
4. **Selector hook**: extend `store/spool-stage.ts` `useSpoolStages` to subscribe to laydown records and pass `laydownRecord` into `deriveFabStage`. Add `useLaydownRecord(spoolNo)`.
5. **New route** `/fabrication/laydown` — list view + detail Sheet. Three buckets: **Awaiting Placement** (spools at `Painted`), **In Yard** (spools at `Laydown` without `releasedToSiteDate`), **Released to Site** (spools at `Laydown` with `releasedToSiteDate`). Internal status chips, not stage chips (G1.1 contract).
6. **Funnel deep-link cleanup**: change `STAGE_SCREENS` from `Partial<Record<SpoolFabStage, string>>` to `Partial<Record<SpoolFabStage, { href: string }>>` (or just to a function), so each tile carries an explicit `?status=` query that matches the tile's stage. Apply to *all six* current entries — not just the new Laydown one. See §7 for the full mapping.
7. **Sidebar nav**: insert `Laydown` after `Paint` under the Fabrication group. Same role visibility as `Paint`.

**Do not** touch Erection, NDE, Testpack, Track A/B/C/D screens. **Do not** alter Material Check / QC Release / Paint screens except for the reset cascade. **Do not** add new top-level screens beyond `/fabrication/laydown`. **Do not** rewrite the `FunnelSection` component beyond the `STAGE_SCREENS` shape change.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/PIPEQC_TRACK_G_EXPLAINED.md` parts 5 (stage table) and 7 (G5 description) | Plain-language definition of Laydown: yard handoff, bridge to Erection. |
| `docs/prompts/PipeQC_Track_G_Phase_G4.md` | Pattern this prompt mirrors (store shape, three-bucket list view, internal status chips). G5 differs: one mutation (place) + an optional second (release-to-site), no DFT/dropdowns. |
| `store/paint-store.ts` | Reference shape for `laydown-store.ts` — persist middleware, seed clone, mutation signatures. Mirror it. |
| `lib/spool-data.ts` (current `deriveFabStage`) | Where the new rule (insertion above paint rules) goes. Read the existing cascade — preserve order. |
| `store/spool-stage.ts` | `useSpoolStages` to widen with a fifth subscription. |
| `components/fabrication/paint-view.tsx` | Layout pattern for list view with three internal status chips + conditional column rendering. Mirror density and chip styles. |
| `components/fabrication/paint-detail-panel.tsx` | Sheet layout with mode-switched footer. Mirror — but G5 only has two modes (Place / Done), no "in transit" middle mode. |
| `components/fabrication-dashboard.tsx` `STAGE_SCREENS` + `FunnelSection` | Where the deep-link cleanup lands. |
| `store/welds-store.ts` `useSpoolReadiness` | Read-only — needed to confirm Laydown does NOT alter the E2.3 readiness story; placed spools are still "Ready for delivery" per readiness, but their `fabStage` is now `Laydown` (which trumps `Fabricated`/`Painted` for funnel display purposes only). |
| `components/erection-dashboard.tsx` (E2.3 "Spool delivery readiness" card) | Read-only — confirm G5's `Laydown` stage does not break the existing readiness rollup. The card reads from `useSpoolReadiness` (weld-acceptance based), NOT from `useSpoolStages` — so they remain decoupled. **Do not touch this file.** |
| `store/demo-store.ts` | Reset cascade — add `resetLaydown()` after `resetPaint()`. |
| `config/navigation.ts` | Sidebar insertion point. |
| `store/notifications-store.ts` | `pushNotification` signature for the place + release events. |

---

## 1. Data model — extend `lib/spool-data.ts`

Append (do NOT redeclare G1/G2/G3/G4 exports):

```ts
export const YARD_LOCATIONS = [
  "YARD-A-01",
  "YARD-A-12",
  "YARD-B-04",
  "YARD-B-09",
  "YARD-C-02",
  "YARD-C-15",
] as const
export type YardLocation = (typeof YARD_LOCATIONS)[number]

export interface LaydownRecord {
  spoolNo: string
  yardLocation: YardLocation        // required at placement time
  placedDate: string                 // ISO date — set on placement
  placedBy: string                   // from QC_INSPECTORS — captured at placement
  releasedToSiteDate?: string        // optional — set on release-to-site
  releasedBy?: string                // captured at release
}

function makeLaydownRecord(
  spoolNo: string,
  patch: Partial<Omit<LaydownRecord, "spoolNo">> & { yardLocation: YardLocation; placedDate: string; placedBy: string },
): LaydownRecord {
  return { spoolNo, ...patch }
}

export const LAYDOWN_SEED: LaydownRecord[] = [
  // 1 spool currently on yard (no release yet) — uses PL-CW200-005-A from PAINT_SEED (already Painted in seed)
  makeLaydownRecord("PL-CW200-005-A", {
    yardLocation: "YARD-A-12",
    placedDate: "2025-05-15",
    placedBy: "QC-ENG-02",
  }),
]
```

**Seed rationale**: keep it minimal — exactly **1 placed spool** so the screen lights up on first render, and **no** "released to site" spool (so the optional release-to-site action has visible demo space). The Pass-with-remark anchor (`PL-TK100-001-A`) is intentionally NOT in the laydown seed — it remains a candidate for the live demo (Material Check → QC Release → Paint → Laydown end-to-end).

### Widen `deriveFabStage`

```ts
export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
  qcRecord?: QCReleaseRecord,
  paintRecord?: PaintRecord,
  laydownRecord?: LaydownRecord,
): SpoolFabStage
```

Rule cascade (apply top-down, first match wins). Preserve all existing rules. Insertion point:

1. **(NEW G5)** If `laydownRecord?.placedDate` is set → `"Laydown"`.
2. (G4) If `paintRecord?.finalQCSignedOffDate` is set → `"Painted"`.
3. (G4) If `paintRecord?.dispatchDate` is set → `"Sent to Paint"`.
4. (G3) If `qcRecord?.signedOffDate` is set → `"QC Release"`.
5. (G2) If `mcRecord` exists with no `signedOffDate` OR any `Pending` piece → `"Material Check"`.
6. (G2) If `mcRecord` is signed off AND `readiness.status === "Ready for delivery"` → `"Fabricated"`.
7. (G2) If `mcRecord` is signed off AND `readiness.status` is `"In fabrication" | "Blocked"` → `"Weld Progress"`.
8. (G1 fallback) No `mcRecord`: derive from `readiness` alone.

A `releasedToSiteDate` on the laydown record does **not** change the stage — released spools stay at `"Laydown"`. The "Released to Site" bucket is a *sub-state* of the Laydown stage, surfaced via the internal chip on the screen but invisible to the funnel.

All existing call sites must pass the new param. `useSpoolStages` is the only one — update in §3.

---

## 2. Store — `store/laydown-store.ts` (new)

Mirror `store/paint-store.ts`:

```ts
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  LAYDOWN_SEED,
  type LaydownRecord,
  type YardLocation,
} from "@/lib/spool-data"

interface LaydownState {
  records: LaydownRecord[]

  getRecord: (spoolNo: string) => LaydownRecord | undefined

  // Mutations
  placeOnYard: (args: {
    spoolNo: string
    yardLocation: YardLocation
    placedBy: string
  }) => void
  releaseToSite: (args: {
    spoolNo: string
    releasedBy: string
  }) => void
  resetLaydown: () => void
}
```

Behaviors:

- `placeOnYard` auto-creates the record if missing, writes `yardLocation`, `placedDate = today`, `placedBy`. Idempotent: re-placing overwrites only if `releasedToSiteDate` is not set (the UI gates this).
- `releaseToSite` writes `releasedToSiteDate = today`, `releasedBy`. Requires an existing record with `placedDate` set — if missing, no-op (defensive only).
- `resetLaydown` re-seeds from `JSON.parse(JSON.stringify(LAYDOWN_SEED))`. Persist key `"pipeqc-laydown"`, version `1`.

Wire `useLaydownStore.getState().resetLaydown()` into `store/demo-store.ts:resetAll()` immediately after the existing `resetPaint()` call.

Barrel re-export from `store/index.ts`:

```ts
export { useLaydownStore } from "./laydown-store"
export { useLaydownRecord } from "./spool-stage"
```

---

## 3. Selector update — `store/spool-stage.ts`

Subscribe to laydown records in `useSpoolStages` and pass them into `deriveFabStage`:

```ts
import { useLaydownStore } from "@/store/laydown-store"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const mcRecords = useSpoolsStore((s) => s.records)
  const qcRecords = useQCReleaseStore((s) => s.records)
  const paintRecords = usePaintStore((s) => s.records)
  const laydownRecords = useLaydownStore((s) => s.records)

  return useMemo(() => {
    const mcMap = new Map(mcRecords.map((r) => [r.spoolNo, r]))
    const qcMap = new Map(qcRecords.map((r) => [r.spoolNo, r]))
    const paintMap = new Map(paintRecords.map((r) => [r.spoolNo, r]))
    const laydownMap = new Map(laydownRecords.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()

    for (const r of readiness) {
      map.set(
        r.spoolNo,
        deriveFabStage(
          r,
          mcMap.get(r.spoolNo),
          qcMap.get(r.spoolNo),
          paintMap.get(r.spoolNo),
          laydownMap.get(r.spoolNo),
        ),
      )
    }
    for (const rec of mcRecords) {
      if (!map.has(rec.spoolNo)) {
        map.set(
          rec.spoolNo,
          deriveFabStage(
            undefined,
            rec,
            qcMap.get(rec.spoolNo),
            paintMap.get(rec.spoolNo),
            laydownMap.get(rec.spoolNo),
          ),
        )
      }
    }
    return map
  }, [readiness, mcRecords, qcRecords, paintRecords, laydownRecords])
}
```

`useSpoolStageCounts` and `useSpoolsAtStage` signatures unchanged. Add:

```ts
export function useLaydownRecord(spoolNo: string): LaydownRecord | undefined {
  return useLaydownStore((s) => s.getRecord(spoolNo))
}
```

---

## 4. Page — `app/fabrication/laydown/page.tsx` (new)

Thin Suspense wrapper, mirror `app/fabrication/paint/page.tsx`:

```tsx
"use client"
import { Suspense } from "react"
import { LaydownView } from "@/components/fabrication/laydown-view"

export default function LaydownPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <LaydownView />
    </Suspense>
  )
}
```

---

## 5. List view — `components/fabrication/laydown-view.tsx` (new)

Layout mirrors `paint-view.tsx` (internal status chips, NOT stage chips).

- **Header**: `Laydown` · subtitle *"Yard placement and release to site"*.
- **Status chips** with counts: `All / Awaiting Placement / In Yard / Released to Site`. Default `Awaiting Placement`. URL: `?status=Awaiting|InYard|Released`; absence → `Awaiting`.
  - `Awaiting Placement` = spools at `fabStage === "Painted"` (no laydown record).
  - `In Yard` = spools at `fabStage === "Laydown"` AND no `releasedToSiteDate`.
  - `Released to Site` = spools at `fabStage === "Laydown"` AND `releasedToSiteDate` is set.
  - `All` = union. **Other stages excluded.**
- **Search input**: matches `spoolNo`. (No yard-location search on this slice.)
- **Table** columns (conditional by chip — duplicate three `<TableHeader>` variants, as in G4):
  | Column | Awaiting Placement | In Yard | Released to Site |
  | --- | --- | --- | --- |
  | Spool No | ✅ mono | ✅ mono | ✅ mono |
  | Stage | StagePill | StagePill | StagePill |
  | Yard location | — | record.yardLocation | record.yardLocation |
  | Placed | — | RelativeDate(placedDate) | RelativeDate(placedDate) |
  | Placed by | — | record.placedBy | record.placedBy |
  | Released | — | — | RelativeDate(releasedToSiteDate) |
  | Released by | — | — | record.releasedBy |
- **Click row** → `?spool=PL-XXX` (preserves `?status`).
- **Empty state**:
  - `Awaiting Placement`: *"No spools awaiting yard placement."*
  - `In Yard`: *"No spools currently in the laydown yard."*
  - `Released to Site`: *"No spools released to site yet."*
  - `All`: *"No spools in any laydown stage."*

Mount `<LaydownDetailPanel spoolNo={?spool} open={!!?spool} onOpenChange={...} />` at the end.

---

## 6. Detail panel — `components/fabrication/laydown-detail-panel.tsx` (new)

Right-side `Sheet` `sm:max-w-[560px]` (narrower than paint — fewer fields). Two modes only:

- **Header**: spool number (mono) + StagePill.
- **Place mode** — when no laydown record:
  - **Yard location** dropdown (`YARD_LOCATIONS`).
  - **Placed by** dropdown (`QC_INSPECTORS`).
  - Footer button `Place on yard`. Disabled when either is empty, helper *"Pick a yard location and a placer."*
  - On click: 700 ms delay → `useLaydownStore.getState().placeOnYard({ spoolNo, yardLocation, placedBy })` → close panel → toast `"${spoolNo} placed at ${yardLocation}"` → home notification (severity `info`):
    ```ts
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${spoolNo}: placed in laydown yard`,
      description: `Location ${yardLocation} (${placedBy})`,
      href: "/fabrication/laydown",
    })
    ```
  - After place: `router.replace("/fabrication/laydown?status=InYard")`.
- **Release mode** — when `placedDate` is set AND no `releasedToSiteDate`:
  - Read-only summary card: *"Placed 2025-05-15 at YARD-A-12 by QC-ENG-02"*.
  - **Released by** dropdown (`QC_INSPECTORS`).
  - Footer button `Release to site`. Disabled when `Released by` is empty, helper *"Pick the releaser."*
  - On click: 700 ms delay → `useLaydownStore.getState().releaseToSite({ spoolNo, releasedBy })` → close panel → toast `"${spoolNo} released to site"` → home notification:
    ```ts
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${spoolNo}: released to site`,
      description: `Cleared by ${releasedBy} — ready for erection`,
      href: "/erection/dashboard",
    })
    ```
  - After release: `router.replace("/fabrication/laydown?status=Released")`.
- **Done mode** — when `releasedToSiteDate` is set:
  - All fields read-only. Footer shows muted summary: *"Released 2025-05-16 by QC-ENG-02 from YARD-A-12 — handed to Erection"*. Close button only.

---

## 7. Funnel deep-link cleanup — `components/fabrication-dashboard.tsx`

**This section is what the user explicitly asked for in addition to G5.** It is a small refactor to the existing `STAGE_SCREENS` map so that every tile lands the user on the chip that matches the tile they clicked.

Today (after G4):

```ts
const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check",
  "Weld Progress":  "/fabrication/weld-progress",
  Fabricated:       "/fabrication/qc-release",            // lands on Awaiting Release — happens to match
  "QC Release":     "/fabrication/qc-release",            // lands on Awaiting Release — WRONG (should be Released)
  "Sent to Paint":  "/fabrication/paint",                  // lands on Awaiting Dispatch — WRONG (should be InShop)
  Painted:          "/fabrication/paint",                  // lands on Awaiting Dispatch — WRONG (should be Painted)
}
```

After G5:

```ts
const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check?status=Pending",
  "Weld Progress":  "/fabrication/weld-progress",
  Fabricated:       "/fabrication/qc-release?status=Awaiting",
  "QC Release":     "/fabrication/qc-release?status=Released",
  "Sent to Paint":  "/fabrication/paint?status=InShop",
  Painted:          "/fabrication/paint?status=Painted",
  Laydown:          "/fabrication/laydown?status=InYard",       // NEW
}
```

**Constraint**: do NOT change the screens' default chips. The default behavior (no `?status=` → screen-specific default) must remain — that is how the sidebar nav entries behave when clicked directly.

**Sanity check on `Material Check`**: the MC view supports `?status=Pending|Approved|NC` (per G1.1). Confirm `Pending` is a valid chip name. If the implementation uses a different token (e.g. `Pending` vs `Awaiting`), match exactly. Read `material-check-view.tsx` for the chip parsing logic before committing the deep-link value.

**Funnel rendering**: no changes to `FunnelSection` JSX beyond reading the `STAGE_SCREENS[stage]` string and dropping it into `<Link href=...>`. The existing "non-clickable for missing entries" logic still applies — only `Not Started` remains without an entry.

---

## 8. Sidebar nav — `config/navigation.ts`

Insert under the Fabrication group, **after** `Paint`:

```ts
{
  title: "Laydown",
  href: "/fabrication/laydown",
  icon: Warehouse,  // import from lucide-react
}
```

Same role visibility as `Paint`. Add the `Warehouse` import next to `Paintbrush`.

---

## 9. Constraints

1. No new npm dependencies.
2. New persisted store key `"pipeqc-laydown"`, version `1`. Do not bump existing store versions.
3. Demo cadence: 600–800 ms artificial delay before every mutation (Place and Release).
4. **No changes** to `store/welds-store.ts`, `store/batches-store.ts`, `store/erection-store.ts`, `store/testpack-store.ts`, `store/spools-store.ts`, `store/qc-release-store.ts`, `store/paint-store.ts`.
5. **No changes** to `components/fabrication/material-check-*.tsx`, `components/fabrication/qc-release-*.tsx`, `components/fabrication/paint-*.tsx` — read only, mirror their patterns in the new Laydown files.
6. **No changes** to `components/erection-dashboard.tsx`. The E2.3 "Spool delivery readiness" card continues to read from `useSpoolReadiness` (weld-acceptance signal). G5 does NOT alter spool readiness or the E2.3 card. The fact that a spool reached `Laydown` is shown only on the new screen and the funnel.
7. SSR-safe: relative dates client-only-mounted (`useEffect` for `formatDistanceToNow`).
8. `Reset Demo` restores the laydown seed exactly — 1 placed spool, no released spools.
9. Don't add a "remove from yard" or "edit yard location" mutation — out of scope for this slice. Yard location is set once at placement.
10. Don't preempt anything: Track G is complete after G5. No new stages, no new screens beyond `/fabrication/laydown`.
11. **Funnel deep-link cleanup** applies to all 6 existing tiles + the new Laydown tile. Do not skip any.

---

## 10. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Sidebar shows `Laydown` under Fabrication, after `Paint`. Icon `Warehouse`. Click → `/fabrication/laydown` loads, default chip `Awaiting Placement` active.
2. List renders the Painted spools without a laydown record. With the seed, `PL-CW200-005-A` is the only seed-painted spool but is placed in the seed laydown record, so `Awaiting Placement` is empty (empty state visible).
3. Click `In Yard` chip → URL `?status=InYard`. Shows exactly 1 spool: `PL-CW200-005-A` at `YARD-A-12`, placed by `QC-ENG-02`.
4. Click `Released to Site` chip → URL `?status=Released`. Empty state *"No spools released to site yet."*
5. Click `All` chip → URL `?status=All`. Shows the single seed laydown spool plus any "Painted" spools awaiting placement.
6. **End-to-end flow** (the demo beat): from Reset Demo, drive `PL-TK100-002-A` through G4 sign-off → spool flips to `Painted` → switch to `/fabrication/laydown?status=Awaiting` → `PL-TK100-002-A` now appears under `Awaiting Placement`.
7. Click `PL-TK100-002-A`. Panel opens in **Place mode**: empty yard-location + placed-by dropdowns. Footer `Place on yard` disabled, helper *"Pick a yard location and a placer."*
8. Pick `YARD-B-04` + `QC-ENG-01`. Helper clears. Button enables.
9. Click `Place on yard` → ~700 ms delay → panel closes → toast `"PL-TK100-002-A placed at YARD-B-04"` → home notification *"PL-TK100-002-A: placed in laydown yard — Location YARD-B-04 (QC-ENG-01)"*.
10. URL is now `/fabrication/laydown?status=InYard`. `In Yard` chip count increased by 1. `Awaiting Placement` count decreased by 1.
11. Funnel: `Painted` count − 1, `Laydown` count + 1.
12. Click `PL-CW200-005-A` (seed). Panel opens in **Release mode**: read-only summary `"Placed 2025-05-15 at YARD-A-12 by QC-ENG-02"`, released-by dropdown empty. Footer `Release to site` disabled.
13. Pick `QC-ENG-03`. Button enables. Click → 700 ms delay → panel closes → toast `"PL-CW200-005-A released to site"` → home notification *"PL-CW200-005-A: released to site — Cleared by QC-ENG-03 — ready for erection"*.
14. URL is now `/fabrication/laydown?status=Released`. `Released to Site` chip count = 1.
15. Open the released spool again → panel opens in **Done mode**: all read-only, footer shows muted summary, no primary action.
16. **Funnel deep-link sanity**: from `/fabrication/dashboard`, click each populated tile and verify the chip on the destination matches the tile's stage:
    - `Material Check` tile → `/fabrication/material-check?status=Pending` — `Pending` chip active.
    - `Weld Progress` tile → `/fabrication/weld-progress` (no `?status` — that screen has no chip).
    - `Fabricated` tile → `/fabrication/qc-release?status=Awaiting` — `Awaiting Release` chip active.
    - `QC Release` tile → `/fabrication/qc-release?status=Released` — `Released` chip active.
    - `Sent to Paint` tile → `/fabrication/paint?status=InShop` — `In Paint Shop` chip active.
    - `Painted` tile → `/fabrication/paint?status=Painted` — `Painted` chip active.
    - `Laydown` tile → `/fabrication/laydown?status=InYard` — `In Yard` chip active.
    - `Not Started` tile remains non-clickable.
17. **Reset Demo** from top nav → all state returns to seed. Laydown back to 1 placed spool. The spool from step 9 returns to `Painted`. Funnel counts revert.

### Regression

18. `/fabrication/qc-release` (G3) — both default chip behavior (sidebar click → `Awaiting Release`) and deep-linked behavior (funnel `QC Release` click → `Released`) work. The screen's own chip-click logic still updates the URL on intra-screen navigation.
19. `/fabrication/paint` (G4) — sidebar click → `Awaiting Dispatch` chip default; funnel deep-links land on the matching chip.
20. `/fabrication/material-check` (G2) — sidebar click → screen's own default; funnel deep-link from `Material Check` tile lands on `Pending` chip (verify token matches the existing chip URL contract; if not, adjust the `STAGE_SCREENS` value to whatever token the screen actually uses).
21. `/fabrication/weld-progress` — no chip; `?spool=` still renders the spool chip (E2.3 regression).
22. `/erection/dashboard`, `/nde`, `/tracking`, `/testpack/*` untouched.
23. E2.3 "Spool delivery readiness" card on `/erection/dashboard` still reads from `useSpoolReadiness` — placed spools (`fabStage === "Laydown"`) still show in the existing readiness table per their weld-acceptance state, with no behavioral changes.
24. `/home` — E2.5 ISO-welded notification still fires.

### Build

25. `npx tsc --noEmit` clean.
26. `npm run build` clean — no Suspense or `useSearchParams` warnings.
27. No hydration warnings after 3 hard refreshes.

---

## 11. Definition of done

- **New files**:
  - `lib/spool-data.ts` additions: types + `YARD_LOCATIONS` + `LAYDOWN_SEED` + widened `deriveFabStage`.
  - `store/laydown-store.ts` — persisted store + selectors.
  - `app/fabrication/laydown/page.tsx` — thin Suspense + view mount.
  - `components/fabrication/laydown-view.tsx` — list view.
  - `components/fabrication/laydown-detail-panel.tsx` — detail Sheet (Place / Release / Done modes).
- **Modified files**:
  - `store/spool-stage.ts` — subscribe to laydown store, pass `laydownRecord` into `deriveFabStage`, add `useLaydownRecord`.
  - `store/demo-store.ts` — cascade `resetLaydown()` into `resetAll()`.
  - `store/index.ts` — barrel re-export `useLaydownStore`, `useLaydownRecord`.
  - `components/fabrication-dashboard.tsx` — **rewrite `STAGE_SCREENS` map** with `?status=` for all 6 existing entries + new `Laydown` entry.
  - `config/navigation.ts` — add `Laydown` sidebar entry, import `Warehouse`.
  - `docs/PIPEQC_CONTEXT.md` — append merge-log entry for G5; bump §"Manual cross-reference" row §7 to say *"Fabrication module (§7) — Weld Progress + Dashboard funnel + Material Check + QC Release + Paint + Laydown (G1+G2+G1.1+G3+G4+G5) — Track G complete"*.
  - `docs/tracks/track_list.md` §7 — note `G5 Laydown merged; Track G complete (7/7 active stages live)`.
- All 27 acceptance criteria pass.
- PR description lists:
  - Whether the `Material Check` deep-link uses `?status=Pending` or another token (depends on the screen's chip contract — read before writing).
  - The Awaiting / InYard / Released distribution on first render (should be `0 / 1 / 0` from seed).
  - Confirmation that Track G is now complete: 7/7 active stages have a real screen.

---

## 12. Manual self-check before reporting done

1. **Funnel-sums-to-total check**: distinct `spoolNo` count in `useWeldsStore` equals the sum of all funnel tile counts. If not, the new `useSpoolStages` subscription dropped a row.
2. **Reset Demo round-trip** (AC #17): `PL-CW200-005-A` is back at `In Yard` (placed seed) after reset.
3. **Stage transition checks** (AC #9 and #13): place and release each move the spool out of one bucket and into the next without refresh, AND the funnel updates live.
4. **Rule-order check**: a spool with all of paint-signed-off AND laydown-placed lands at `Laydown` (not `Painted`). G5 rule runs above G4.
5. **Deep-link token verification** (AC #20): confirm the `Material Check` screen's chip URL contract before committing. If the screen uses `?status=Pending|Approved|NC`, the funnel link `?status=Pending` is correct. If it uses different tokens, update both consistently — the funnel and the screen must agree on the token set.
6. **E2.3 unchanged**: `git diff --stat components/erection-dashboard.tsx` returns 0. The Erection dashboard's spool readiness card is unchanged.
7. **Size sanity**: 250–350 LOC net delta. Under 200 → you skipped the release-to-site mode or the deep-link cleanup. Over 500 → you over-scoped (no E2.3 wiring, no new admin tabs).
8. **No new screens beyond `/fabrication/laydown`**: `git diff --stat app/` should show only the new `app/fabrication/laydown/` directory.

Report files created/modified, the Awaiting/InYard/Released distribution on first render, the LOC delta, and any acceptance step you could not verify in-browser (flag honestly if running terminal-only).
