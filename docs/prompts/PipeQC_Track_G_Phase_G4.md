# Task: PipeQC Track G, Phase G4 — Paint stages (Sent to Paint + Painted)

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` (parts 5 and 7) first.
Tracks A, B, E2 (E2.1/E2.3/E2.5), N (N1+N2), F2+E2.4, C1, **G1**, **G2**, **G1.1**, **G3** are merged. **G3 is a hard prerequisite** — its `qc-release-store`, `QCReleaseRecord` data model, and the `Awaiting Release / Released` chip pattern are what this slice extends. The `STAGE_SCREENS` map introduced in G1.1 and extended in G3 is the funnel surface G4 plugs into next.

This slice lights up the **5th and 6th stages** of §7 Spool Fabrication Lifecycle — **Sent to Paint** and **Painted** — together, because in real EPC workflow these two states are halves of one inter-company handoff: dispatch to the paint subcontractor and return from it. After QC Release, a spool is dispatched to the paint shop; later it comes back coated, gets final-QC verified for dry-film thickness (DFT), and then waits for Laydown (G5).

Today: stages `Sent to Paint` and `Painted` exist in the `SpoolFabStage` enum (G1) and the funnel renders them as inert grey tiles ("Coming in G3/G4/G5"). There is no record, no action screen, no audit trail, no dispatch/return workflow.

Size: **~0.5 day**; ~400–550 LOC across 1 new persisted store + 4 new files + edits to `spool-data.ts`, `spool-stage.ts`, `fabrication-dashboard.tsx`, `navigation.ts`, `demo-store.ts`, `store/index.ts`.

---

## Why this slice exists (demo narrative)

The paint handoff is the one stage in spool fabrication that *leaves the company*. Paint is almost always a separate subcontractor — different DOT-painting cert, different inspectors, often a different yard across town. This is exactly the kind of seam where Excel-based projects lose track of dozens of spools per month. G4 puts it on screen.

> *Anna's QC Release on `PL-TK100-001-A` is signed. The funnel funnel now shows it under `QC Release`. She switches to the **Paint** screen, picks the spool from "Awaiting Dispatch", chooses paint system `PS-3A (Zinc Primer + Epoxy)` and subcontractor `ColorPro Coatings`, hits "Dispatch to paint shop". The spool flips to `Sent to Paint` — funnel updates, home notification fires. A week later, the truck returns. She opens the same spool under "In Paint Shop", enters DFT `285 µm`, picks the final-QC inspector, signs off. The spool flips to `Painted` and is now visible under "Painted" — ready for Laydown (G5).*

This is the answer to the recurring EPC question: *"how do you track paint subcontractor handoffs?"* Today: nothing. Post-G4: dispatch + return workflow with DFT audit trail, plus inter-company subcontractor capture.

---

## Goal

1. **Data model**: extend `lib/spool-data.ts` with `PaintRecord`, `PAINT_SYSTEMS`, `PAINT_SUBCONTRACTORS`, `PAINT_SEED`.
2. **Stage derivation**: widen `deriveFabStage(readiness, mcRecord?, qcRecord?, paintRecord?)`. New rules (highest priority among "good" outcomes, *above* the existing G3 QC-Release rule):
   - `paintRecord.finalQCSignedOffDate` set → `"Painted"`.
   - `paintRecord.dispatchDate` set (no `finalQCSignedOffDate`) → `"Sent to Paint"`.
   - Otherwise fall through to existing G3 logic.
3. **Persisted store**: new `store/paint-store.ts` mirroring `qc-release-store.ts`. Persist key `pipeqc-paint`, version 1. Cascade `resetPaint()` into `demo-store.ts:resetAll()`.
4. **Selector hook**: extend `store/spool-stage.ts` `useSpoolStages` to subscribe to paint records and pass `paintRecord` into `deriveFabStage`. Add `usePaintRecord(spoolNo)`.
5. **New route** `/fabrication/paint` — list view + detail Sheet. Three buckets: **Awaiting Dispatch** (spools at `QC Release` — eligible to dispatch), **In Paint Shop** (spools at `Sent to Paint`), **Painted** (spools at `Painted`). Internal status chips, not stage chips (G1.1 contract).
6. **Funnel update**: extend G1.1/G3's `STAGE_SCREENS` map — both `Sent to Paint` and `Painted` tiles route to `/fabrication/paint`. **Also wire `QC Release` tile to keep pointing to `/fabrication/qc-release`** (unchanged) — the dispatch starts from the Paint screen's "Awaiting Dispatch" bucket, not from QC Release. Other tiles unchanged.
7. **Sidebar nav**: insert `Paint` between `QC Release` and `Weld Progress` under the Fabrication group. Same role visibility as `QC Release`.

**Do not** touch Erection, NDE, Testpack, Track A/B/C/D screens. **Do not** preempt Laydown stage (G5). **Do not** alter Material Check or QC Release screens except for the reset cascade.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/PIPEQC_TRACK_G_EXPLAINED.md` parts 5 (stage table) and 7 (G4 description) | Plain-language definition of Paint stages: inter-company handoff, DFT, demo angle. |
| `docs/prompts/PipeQC_Track_G_Phase_G3.md` | Pattern this prompt mirrors 1:1 (store shape, list view buckets, detail Sheet, funnel wiring, sidebar entry). G4 differs only in: 3 buckets instead of 2, and **two** mutations (dispatch + sign-off) instead of one. |
| `store/qc-release-store.ts` | Reference shape for the new `paint-store.ts` — persist middleware, seed deep-clone, mutation signatures, auto-create record on first patch. Mirror it. |
| `lib/spool-data.ts` (current `deriveFabStage`, current `QC_RELEASE_SEED`) | Where the new type, seed, and rule-cascade widening live. Read the existing rule cascade — preserve order, *insert above* the QC-Release rule. |
| `store/spool-stage.ts` | `useSpoolStages` to widen with a fourth subscription. |
| `components/fabrication/qc-release-view.tsx` | Layout pattern for list view with internal status chips. Reuse density, chip styles, `RelativeDate` helper. |
| `components/fabrication/qc-release-detail-panel.tsx` | Sheet layout, footer with inspector dropdown + Save Draft + Sign off, validation pattern. Mirror it — but with two distinct footer modes (dispatch / receive). |
| `components/fabrication-dashboard.tsx` `FunnelSection` + `STAGE_SCREENS` | Where the two new tile entries land. |
| `store/admin-store.ts` (`useSubcontractors`) | Source of subcontractor names. We do NOT add a new "paint subcontractors" referential — we hardcode a small list in `lib/spool-data.ts:PAINT_SUBCONTRACTORS` for the demo. Real-world this would live in admin/B3. |
| `store/demo-store.ts` | Reset cascade — add `resetPaint()` after `resetQCRelease()`. |
| `config/navigation.ts` | Sidebar insertion point. |
| `store/notifications-store.ts` | `pushNotification` signature for the dispatch + sign-off events. |

---

## 1. Data model — extend `lib/spool-data.ts`

Append (do NOT redeclare G1/G2/G3 exports):

```ts
export const PAINT_SYSTEMS = [
  "PS-1A: Zinc Primer only",
  "PS-2B: Epoxy 2-coat",
  "PS-3A: Zinc Primer + Epoxy (250 µm)",
  "PS-4C: High-temp Silicone (cryo lines)",
] as const
export type PaintSystem = (typeof PAINT_SYSTEMS)[number]

export const PAINT_SUBCONTRACTORS = [
  "ColorPro Coatings Inc",
  "Apex Industrial Painting",
  "PetroCoat Services",
] as const
export type PaintSubcontractor = (typeof PAINT_SUBCONTRACTORS)[number]

export interface PaintRecord {
  spoolNo: string
  paintSystem?: PaintSystem
  subcontractor?: PaintSubcontractor
  dispatchDate?: string         // ISO date — set on dispatch
  returnDate?: string            // ISO date — set on sign-off
  dftMicrons?: number            // dry-film thickness, µm
  finalQCInspector?: string      // from QC_INSPECTORS (reuse from G2/G3)
  finalQCSignedOffDate?: string  // ISO date — set on sign-off
  dispatchRemark?: string        // optional note captured on dispatch
}
```

### Seed: `PAINT_SEED`

Cover 2 anchor states so the screen lights up on first render:

- **1 spool currently `Sent to Paint`** — `dispatchDate` set, no `returnDate` / `finalQCSignedOffDate`. Pick `PL-TK100-002-A` (it is a pre-released QC spool from `QC_RELEASE_SEED`). Use `paintSystem: "PS-3A: Zinc Primer + Epoxy (250 µm)"`, `subcontractor: "ColorPro Coatings Inc"`, `dispatchDate: "2025-05-13"`.
- **1 spool already `Painted`** — full record. Pick `PL-CW200-005-A` (also pre-released in QC). Use `paintSystem: "PS-2B: Epoxy 2-coat"`, `subcontractor: "Apex Industrial Painting"`, `dispatchDate: "2025-05-11"`, `returnDate: "2025-05-14"`, `dftMicrons: 285`, `finalQCInspector: "QC-ENG-02"`, `finalQCSignedOffDate: "2025-05-14"`.
- **Anchor spool `PL-TK100-001-A`** (the Pass-with-remark from G3) — leave NO paint record. It will appear under "Awaiting Dispatch" so the demo can open the panel and dispatch live.

Helper:

```ts
function makePaintRecord(
  spoolNo: string,
  patch: Partial<Omit<PaintRecord, "spoolNo">>,
): PaintRecord {
  return { spoolNo, ...patch }
}

export const PAINT_SEED: PaintRecord[] = [
  makePaintRecord("PL-TK100-002-A", {
    paintSystem: "PS-3A: Zinc Primer + Epoxy (250 µm)",
    subcontractor: "ColorPro Coatings Inc",
    dispatchDate: "2025-05-13",
  }),
  makePaintRecord("PL-CW200-005-A", {
    paintSystem: "PS-2B: Epoxy 2-coat",
    subcontractor: "Apex Industrial Painting",
    dispatchDate: "2025-05-11",
    returnDate: "2025-05-14",
    dftMicrons: 285,
    finalQCInspector: "QC-ENG-02",
    finalQCSignedOffDate: "2025-05-14",
  }),
]
```

### Widen `deriveFabStage`

```ts
export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
  qcRecord?: QCReleaseRecord,
  paintRecord?: PaintRecord,
): SpoolFabStage
```

Rule cascade (apply top-down, first match wins). Preserve all existing G1/G2/G3 rules. Insertion points:

1. **(NEW G4)** If `paintRecord?.finalQCSignedOffDate` is set → `"Painted"`.
2. **(NEW G4)** If `paintRecord?.dispatchDate` is set (and not painted-signed-off) → `"Sent to Paint"`.
3. (G3) If `qcRecord?.signedOffDate` is set → `"QC Release"`.
4. (G2) If `mcRecord` exists with no `signedOffDate` OR any `Pending` piece → `"Material Check"`.
5. (G2) If `mcRecord` is signed off AND `readiness.status === "Ready for delivery"` → `"Fabricated"`.
6. (G2) If `mcRecord` is signed off AND `readiness.status` is `"In fabrication" | "Blocked"` → `"Weld Progress"`.
7. (G1 fallback) No `mcRecord`: derive from `readiness` alone.

A paint record with `paintSystem`/`subcontractor` set but no `dispatchDate` does **not** advance the stage — the spool stays at `QC Release`. This supports the "draft dispatch form before submitting" flow.

Stages 7–8 (`Painted` is now active; `Laydown` remains unreachable — G5 will introduce its record).

All existing call sites must pass the new param. `useSpoolStages` is the only one — update in §3.

---

## 2. Store — `store/paint-store.ts` (new)

Mirror `store/qc-release-store.ts` exactly:

```ts
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  PAINT_SEED,
  type PaintRecord,
  type PaintSystem,
  type PaintSubcontractor,
} from "@/lib/spool-data"

interface PaintState {
  records: PaintRecord[]

  getRecord: (spoolNo: string) => PaintRecord | undefined

  // Mutations
  dispatch: (args: {
    spoolNo: string
    paintSystem: PaintSystem
    subcontractor: PaintSubcontractor
    remark?: string
  }) => void
  signOffPaint: (args: {
    spoolNo: string
    dftMicrons: number
    finalQCInspector: string
  }) => void
  resetPaint: () => void
}
```

Behaviors:

- `dispatch` auto-creates the record if missing, then writes `paintSystem`, `subcontractor`, `dispatchDate = today`, optional `dispatchRemark`. Does NOT mutate `finalQC*` fields. Idempotent — re-dispatching overwrites the previous draft only when the record has no `returnDate` (it should never be called on a Painted spool; the UI gates this).
- `signOffPaint` writes `returnDate = today`, `dftMicrons`, `finalQCInspector`, `finalQCSignedOffDate = today`. Requires an existing record with `dispatchDate` set — if missing, no-op (the UI gates this; defensive only).
- `resetPaint` re-seeds from `JSON.parse(JSON.stringify(PAINT_SEED))`. Persist key `"pipeqc-paint"`, version `1`.

Wire `useResetPaint().resetPaint()` into `store/demo-store.ts:resetAll()` immediately after the existing `resetQCRelease()` call.

Barrel re-export from `store/index.ts`:

```ts
export { usePaintStore } from "./paint-store"
export { usePaintRecord } from "./spool-stage"
```

---

## 3. Selector update — `store/spool-stage.ts`

Subscribe to paint records in `useSpoolStages` and pass them into `deriveFabStage`:

```ts
import { usePaintStore } from "@/store/paint-store"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const mcRecords = useSpoolsStore((s) => s.records)
  const qcRecords = useQCReleaseStore((s) => s.records)
  const paintRecords = usePaintStore((s) => s.records)

  return useMemo(() => {
    const mcMap = new Map(mcRecords.map((r) => [r.spoolNo, r]))
    const qcMap = new Map(qcRecords.map((r) => [r.spoolNo, r]))
    const paintMap = new Map(paintRecords.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()

    for (const r of readiness) {
      map.set(
        r.spoolNo,
        deriveFabStage(r, mcMap.get(r.spoolNo), qcMap.get(r.spoolNo), paintMap.get(r.spoolNo)),
      )
    }
    // Defensive: spools with MC records but no welds yet
    for (const rec of mcRecords) {
      if (!map.has(rec.spoolNo)) {
        map.set(
          rec.spoolNo,
          deriveFabStage(undefined, rec, qcMap.get(rec.spoolNo), paintMap.get(rec.spoolNo)),
        )
      }
    }
    return map
  }, [readiness, mcRecords, qcRecords, paintRecords])
}
```

`useSpoolStageCounts` and `useSpoolsAtStage` signatures unchanged. Add:

```ts
export function usePaintRecord(spoolNo: string): PaintRecord | undefined {
  return usePaintStore((s) => s.getRecord(spoolNo))
}
```

---

## 4. Page — `app/fabrication/paint/page.tsx` (new)

Thin Suspense wrapper, mirror `app/fabrication/qc-release/page.tsx`:

```tsx
"use client"
import { Suspense } from "react"
import { PaintView } from "@/components/fabrication/paint-view"

export default function PaintPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <PaintView />
    </Suspense>
  )
}
```

---

## 5. List view — `components/fabrication/paint-view.tsx` (new)

Layout mirrors `qc-release-view.tsx` (internal status chips, NOT stage chips).

- **Header**: `Paint` · subtitle *"Subcontractor coating dispatch and return inspection"*.
- **Status chips** with counts: `All / Awaiting Dispatch / In Paint Shop / Painted`. Default `Awaiting Dispatch` — the QC engineer's actionable bucket. URL: `?status=Awaiting|InShop|Painted`; absence → `Awaiting`.
  - `Awaiting Dispatch` = spools at `fabStage === "QC Release"` AND no paint record (or paint record with no `dispatchDate`). These are eligible for the dispatch action.
  - `In Paint Shop` = spools at `fabStage === "Sent to Paint"`.
  - `Painted` = spools at `fabStage === "Painted"`.
  - `All` = union of the three. **The screen never lists spools at other stages** — Material Check / Weld Progress / Fabricated / Laydown / Not Started have their own homes.
- **Search input**: matches `spoolNo`. No subcontractor search on this slice.
- **Table** columns (vary by chip — keep one shared table, hide irrelevant columns conditionally):
  | Column | Awaiting Dispatch | In Paint Shop | Painted |
  | --- | --- | --- | --- |
  | Spool No | ✅ mono | ✅ mono | ✅ mono |
  | Stage | StagePill | StagePill | StagePill |
  | Paint system | — | record.paintSystem | record.paintSystem |
  | Subcontractor | — | record.subcontractor | record.subcontractor |
  | Dispatched | — | RelativeDate(dispatchDate) | RelativeDate(dispatchDate) |
  | Returned | — | — | RelativeDate(returnDate) |
  | DFT | — | — | `${dftMicrons} µm` |
  | Inspector | — | — | record.finalQCInspector |

  Implementation hint: render conditionally per chip with three small `<TableHeader>` variants — simpler than building a dynamic column system. Code duplication of ~30 lines is acceptable.
- **Click row** → `?spool=PL-XXX` (preserves `?status`).
- **Empty state**:
  - `Awaiting Dispatch`: *"No spools awaiting paint dispatch."*
  - `In Paint Shop`: *"No spools currently at the paint subcontractor."*
  - `Painted`: *"No painted spools yet."*
  - `All`: *"No spools in any paint stage."*

Mount `<PaintDetailPanel spoolNo={?spool} open={!!?spool} onOpenChange={...} />` at the end (same pattern as MC / QC views).

---

## 6. Detail panel — `components/fabrication/paint-detail-panel.tsx` (new)

Right-side `Sheet` `sm:max-w-[640px]`. Layout mirrors `qc-release-detail-panel.tsx`, but the body and footer change based on the spool's current stage:

- **Header**: spool number (mono) + StagePill of current stage.
- **Body**:
  - Always show a **Paint system** dropdown (`PAINT_SYSTEMS`) and **Subcontractor** dropdown (`PAINT_SUBCONTRACTORS`).
  - If the record has `dispatchDate`, render a read-only summary card above the dropdowns: *"Dispatched 2025-05-13 to ColorPro Coatings Inc"*. In that case the dropdowns become **read-only** (disabled but visible).
  - Optional `Dispatch remark` `Textarea` — visible only in the dispatch flow (no `dispatchDate` yet).
  - If `fabStage === "Sent to Paint"`, render a second body section: **Return from paint shop** with:
    - `DFT (µm)` numeric input. Required for sign-off. Inline red helper if empty or `< 50` or `> 800` (sanity bounds).
    - `Final QC inspector` dropdown (`QC_INSPECTORS`).
  - If `fabStage === "Painted"`, render the same Return section, all read-only with seed values.
- **Footer** (mutually exclusive):
  - **Dispatch mode** — when no `dispatchDate`:
    - `Dispatch to paint shop` button. Disabled when `paintSystem` or `subcontractor` is empty. Inline helper *"Pick a paint system and subcontractor before dispatch."*
    - On click: 700 ms delay → `usePaintStore.getState().dispatch({ spoolNo, paintSystem, subcontractor, remark })` → close panel → toast `"${spoolNo} dispatched to ${subcontractor}"` → home notification (severity `info`):
      ```ts
      pushNotification({
        severity: "info",
        category: "weld_progress",
        title: `${spoolNo}: dispatched to paint shop`,
        description: `Sent to ${subcontractor} (${paintSystem})`,
        href: "/fabrication/paint",
      })
      ```
    - After dispatch: `router.replace("/fabrication/paint?status=InShop")` so the user lands on the bucket they just populated.
  - **Sign-off mode** — when `dispatchDate` is set AND no `finalQCSignedOffDate`:
    - `Sign off final QC` button. Disabled when DFT empty / out of bounds OR inspector empty.
    - Inline helpers: *"Enter DFT between 50 and 800 µm."* / *"Pick a final QC inspector."*
    - On click: 700 ms delay → `usePaintStore.getState().signOffPaint({ spoolNo, dftMicrons, finalQCInspector })` → close panel → toast `"${spoolNo} painted (DFT ${dft} µm)"` → home notification:
      ```ts
      pushNotification({
        severity: "info",
        category: "weld_progress",
        title: `${spoolNo}: painted`,
        description: `Final QC signed by ${inspector} (DFT ${dft} µm)`,
        href: "/fabrication/paint",
      })
      ```
    - After sign-off: `router.replace("/fabrication/paint?status=Painted")`.
  - **Done mode** — when `finalQCSignedOffDate` is set:
    - No primary action. Footer shows a single muted line: *"Painted on 2025-05-14 — DFT 285 µm — QC-ENG-02"*. Close button only.

Existing record handling: when the panel mounts and the store record is `undefined`, build a transient form initialized empty. Patches go into local state until the action button pushes them through `dispatch()` (which also handles auto-create). Mirror the `useEffect` clone pattern from the QC panel.

---

## 7. Funnel update — `components/fabrication-dashboard.tsx`

Extend the existing `STAGE_SCREENS` map:

```ts
const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check",
  "Weld Progress":  "/fabrication/weld-progress",
  "Fabricated":     "/fabrication/qc-release",
  "QC Release":     "/fabrication/qc-release",
  "Sent to Paint":  "/fabrication/paint",  // NEW
  "Painted":        "/fabrication/paint",  // NEW
}
```

Both new tiles link to the same screen — its internal chips disambiguate (`In Paint Shop` vs `Painted`). No `?status=` param in the funnel href — the screen's own default (`Awaiting Dispatch`) is what the user wants when arriving from the dashboard. If they came from the `Sent to Paint` tile, they will switch to the `In Paint Shop` chip themselves; the click counts as "show me the Paint screen". Acceptable for demo. The `Laydown` tile stays non-clickable per G1.1 (G5 will activate it).

---

## 8. Sidebar nav — `config/navigation.ts`

Insert under the Fabrication group, **between** `QC Release` and `Weld Progress`:

```ts
{
  title: "Paint",
  href: "/fabrication/paint",
  icon: Paintbrush,  // import from lucide-react
}
```

Same role visibility as `QC Release` (inherited from the section's `roles` array — no changes needed). Add the `Paintbrush` import next to `ShieldCheck`.

---

## 9. Constraints

1. No new npm dependencies.
2. New persisted store key `"pipeqc-paint"`, version `1`. Do not bump existing store versions.
3. Demo cadence: 600–800 ms artificial delay before every mutation (Dispatch and Sign off).
4. **No changes** to `store/welds-store.ts`, `store/batches-store.ts`, `store/erection-store.ts`, `store/testpack-store.ts`, `store/spools-store.ts`, `store/qc-release-store.ts`. Read-only access only via existing hooks.
5. **No changes** to `components/fabrication/material-check-*.tsx` or `components/fabrication/qc-release-*.tsx`. (Optionally re-extract `RelativeDate` to `components/fabrication/_shared.tsx` if not already done in G3, but only if the duplication grows past three copies — otherwise duplicate.)
6. **No changes** to G1.1/G3 funnel wiring beyond the two new `STAGE_SCREENS` entries. Tiles for `Laydown` and `Not Started` remain non-clickable.
7. SSR-safe: relative dates client-only-mounted (`useEffect` for `formatDistanceToNow`).
8. `Reset Demo` restores the paint seed exactly — including the 1 dispatched and 1 painted spool, and the absence of a record on `PL-TK100-001-A`.
9. Don't preempt Laydown: no new entries in `STAGE_SCREENS` for `Laydown`, no new sidebar items, no new stores for that stage.
10. Don't expose paint subcontractors in admin/B-tabs — `PAINT_SUBCONTRACTORS` stays hardcoded in `lib/spool-data.ts`.
11. DFT input is a `<Input type="number">`; clamp the validation in the panel (50–800 µm), not in the store mutation. The store accepts any positive number defensively.

---

## 10. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Sidebar shows `Paint` under Fabrication, between `QC Release` and `Weld Progress`. Icon `Paintbrush`. Click → `/fabrication/paint` loads, default chip `Awaiting Dispatch` active.
2. List renders the QC-Released spools without a paint record (count matches funnel `QC Release` tile minus the 2 seed paint records). No console errors. No hydration warnings.
3. Click `In Paint Shop` chip → URL `?status=InShop`. Shows exactly 1 spool: `PL-TK100-002-A`. Columns show `PS-3A`, `ColorPro Coatings Inc`, dispatched date.
4. Click `Painted` chip → URL `?status=Painted`. Shows exactly 1 spool: `PL-CW200-005-A`. Columns show `PS-2B`, `Apex`, dispatch + return dates, `285 µm`, `QC-ENG-02`.
5. Click `Awaiting Dispatch` chip → shows `PL-TK100-001-A` among others (the G3 Pass-with-remark anchor). Click it. Panel opens in **Dispatch mode**: empty paint system + subcontractor dropdowns, dispatch remark textarea, footer `Dispatch to paint shop` disabled with helper *"Pick a paint system and subcontractor before dispatch."*
6. Pick `PS-3A: Zinc Primer + Epoxy (250 µm)` + `PetroCoat Services`. Helper clears. Button enables. Type `Anti-corrosion priority lot` in the remark.
7. Click `Dispatch to paint shop` → ~700 ms delay → panel closes → toast `"PL-TK100-001-A dispatched to PetroCoat Services"` → home notification *"PL-TK100-001-A: dispatched to paint shop — Sent to PetroCoat Services (PS-3A: Zinc Primer + Epoxy (250 µm))"*.
8. URL is now `/fabrication/paint?status=InShop`. Chip count `In Paint Shop` increased by 1 (now 2: `PL-TK100-002-A` + `PL-TK100-001-A`). Chip count `Awaiting Dispatch` decreased by 1.
9. `/fabrication/dashboard` funnel: `QC Release` count − 1, `Sent to Paint` count + 1. Funnel tile counts still sum to the total distinct `spoolNo` count.
10. Click `PL-TK100-002-A` (the seed dispatched spool). Panel opens in **Sign-off mode**: read-only summary `"Dispatched 2025-05-13 to ColorPro Coatings Inc"`, DFT input empty, final QC inspector empty. Footer `Sign off final QC` disabled, helpers *"Enter DFT between 50 and 800 µm."* and *"Pick a final QC inspector."*
11. Type DFT `45`. Helper *"Enter DFT between 50 and 800 µm."* remains (out-of-bounds). Change to `285`. Helper clears for DFT.
12. Pick `QC-ENG-01`. Sign off button enables. Click → ~700 ms delay → panel closes → toast `"PL-TK100-002-A painted (DFT 285 µm)"` → home notification *"PL-TK100-002-A: painted — Final QC signed by QC-ENG-01 (DFT 285 µm)"*.
13. URL is now `/fabrication/paint?status=Painted`. Chip count `Painted` increased by 1 (now 2). Funnel: `Sent to Paint` − 1, `Painted` + 1.
14. Click `Painted` chip, open `PL-CW200-005-A`. Panel opens in **Done mode**: dropdowns disabled with seed values, DFT/inspector section all read-only, footer shows muted *"Painted on 2025-05-14 — DFT 285 µm — QC-ENG-02"*, no primary action button.
15. Open the funnel: `Sent to Paint` tile is clickable, hover highlight, click → `/fabrication/paint` (default chip `Awaiting Dispatch`). Same for `Painted` tile. `Laydown` tile stays non-clickable with `Coming in G3/G4/G5` title.
16. **Reset Demo** from top nav → all paint state returns to seed. `PL-TK100-002-A` back to `Sent to Paint`, `PL-CW200-005-A` back to `Painted`, `PL-TK100-001-A` back under `Awaiting Dispatch` with no paint record.

### Regression

17. `/fabrication/qc-release` (G3) — `Awaiting Release` and `Released` chips, sign-off flow, Pass-with-remark anchor on `PL-TK100-001-A`. All intact.
18. `/fabrication/material-check` (G2) — sign-off flow, NC remark, advance to Weld Progress. All intact.
19. `/fabrication/weld-progress` — no stage chip; `?spool=` still renders the spool chip (E2.3 regression).
20. `/erection/dashboard`, `/nde`, `/tracking`, `/testpack/*` untouched.
21. `/home` — E2.5 ISO-welded notification still fires.

### Build

22. `npx tsc --noEmit` clean.
23. `npm run build` clean — no Suspense or `useSearchParams` warnings.
24. No hydration warnings after 3 hard refreshes.

---

## 11. Definition of done

- **New files**:
  - `lib/spool-data.ts` additions: types + `PAINT_SYSTEMS` + `PAINT_SUBCONTRACTORS` + `PAINT_SEED` + widened `deriveFabStage`.
  - `store/paint-store.ts` — persisted store + selectors.
  - `app/fabrication/paint/page.tsx` — thin Suspense + view mount.
  - `components/fabrication/paint-view.tsx` — list view.
  - `components/fabrication/paint-detail-panel.tsx` — detail Sheet with three modes (Dispatch / Sign-off / Done).
- **Modified files**:
  - `store/spool-stage.ts` — subscribe to paint store, pass `paintRecord` into `deriveFabStage`, add `usePaintRecord`.
  - `store/demo-store.ts` — cascade `resetPaint()` into `resetAll()`.
  - `store/index.ts` — barrel re-export `usePaintStore`, `usePaintRecord`.
  - `components/fabrication-dashboard.tsx` — add `Sent to Paint` + `Painted` entries to `STAGE_SCREENS`.
  - `config/navigation.ts` — add `Paint` sidebar entry, import `Paintbrush`.
  - `docs/PIPEQC_CONTEXT.md` — append merge-log entry for G4; bump §"Manual cross-reference" row §7 to say *"Fabrication module (§7) — Weld Progress + Dashboard funnel + Material Check + QC Release + Paint (G1+G2+G1.1+G3+G4)"*.
  - `docs/tracks/track_list.md` §7 — note `G4 Paint merged; G5 Laydown next` and 6/7 stages live.
- All 24 acceptance criteria pass.
- PR description lists:
  - Which spools got the paint seed records (recommend `PL-TK100-002-A` dispatched + `PL-CW200-005-A` painted).
  - The Awaiting / InShop / Painted distribution on first render.
  - Whether `RelativeDate` is now centralized or still duplicated.

---

## 12. Manual self-check before reporting done

1. **Funnel-sums-to-total check**: distinct `spoolNo` count in `useWeldsStore` equals the sum of all funnel tile counts. If not, the new `useSpoolStages` subscription dropped a row.
2. **Reset Demo round-trip** (AC #16): the seed anchors (`PL-TK100-002-A` `Sent to Paint` + `PL-CW200-005-A` `Painted`) come back exactly. If they don't, `resetPaint` is shallow-cloning.
3. **Stage transition checks** (AC #7–8 and #12–13): dispatch and sign-off each move the spool out of one bucket and into the next without refresh, AND the funnel updates live.
4. **Rule-order check**: a spool with both a signed-off QC record AND a paint record with `finalQCSignedOffDate` lands at `Painted` (not `QC Release`). G4 rules must run *above* G3 in the cascade.
5. **Don't touch QC Release screen**: `git diff --stat components/fabrication/qc-release-view.tsx components/fabrication/qc-release-detail-panel.tsx` should be 0 (or only show the `RelativeDate` re-extraction if you chose to centralize it).
6. **Size sanity**: 400–550 LOC net delta. Under 300 → you skipped a detail-panel mode or the seed. Over 700 → you preempted Laydown or rewrote the funnel beyond the two `STAGE_SCREENS` entries.
7. **`grep -rn "Laydown" components/fabrication/ store/ app/fabrication/ | grep -v spool-data.ts`** returns 0 matches — that stage remains enum-only.
8. **DFT bounds check**: typing DFT `49` or `801` in the panel keeps the sign-off button disabled with the inline helper. The store-level mutation does not enforce bounds — the panel does.

Report files created/modified, the seed distribution on first render, the LOC delta, and any acceptance step you could not verify in-browser (flag honestly if running terminal-only).
