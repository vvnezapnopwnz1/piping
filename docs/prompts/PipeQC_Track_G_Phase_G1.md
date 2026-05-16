# Task: PipeQC Track G, Phase G1 — Spool fab lifecycle foundation + funnel widget

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track-upstream.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` first.
Tracks A (A1–A6), B (B1–B2), E2 (E2.1, E2.3, E2.5), N (N1+N2), F2 + E2.4 are merged.

This is **Phase G1 of Track G — Spool Fabrication Lifecycle (§7)**. The manual defines a 7-stage pipeline per spool: `Start Fab → Material Check → Weld Progress → Fabricated → QC Release → Sent to Paint → Painted/Final QC/Laydown`. Today only **Weld Progress** is implemented as a screen. Future phases G2–G5 will add active screens for the remaining stages.

**G1 ships only the foundation:** the stage enum, the rule that derives a spool's current stage from existing data, and a single read-only **funnel widget** on `/fabrication/dashboard` showing how many spools sit at each stage. No new screens. No new persisted store. No mutations. Just the **vocabulary + visualization** that G2–G5 will plug into.

G1 has standalone demo value (audience sees the full pipeline visually for the first time) *and* unblocks G2–G5 (which can reference `SpoolFabStage`, `deriveFabStage`, and the funnel pattern without rebuilding any of it).

Size: ~0.5 day; ~200–300 LOC across 1 new lib file + 1 new selector + 1 dashboard widget edit.

---

## Why this slice exists (in two sentences)

Today there is no answer to *"where is each spool in its fabrication lifecycle?"* — only per-weld status. G1 introduces the spool-stage concept and visualizes it as a 7-tile funnel on the fabrication dashboard, **deriving** stage from existing weld data without any new persistence. This lets the demo audience grasp the full lifecycle in one glance and gives G2–G5 a stable foundation to build on.

---

## Distinction from `/tracking` (don't confuse them)

`components/spool-tracking-dashboard.tsx` already has a `SpoolStatus` enum (`Fabricated | Painted | Final QC | Erected | In Transit`) — that page implements **§10 Spool Tracking** (where the spool physically *is*: fab shop / paint shop / laydown / erection area, scanned via barcode). It is a **static** demo page.

Track G implements **§7 Spool Fabrication Lifecycle** — *what stage of work* the spool is at. The two concepts overlap (e.g. a spool can be both `Painted` location-wise and `Painted` stage-wise) but are independent.

**Do not** modify `spool-tracking-dashboard.tsx`. **Do not** rename its `SpoolStatus` type. Treat it as a sibling system.

---

## Goal

1. Add `SpoolFabStage` enum + `STAGE_ORDER` array in a new `lib/spool-data.ts`.
2. Add a pure derivation `deriveFabStage(spoolNo, weldReadiness): SpoolFabStage` that takes the existing `useSpoolReadiness()` rollup (E2.3) and returns the current stage. **No new store. No new persisted state.** All seven stages are defined but only three (`Not Started`, `Weld Progress`, `Fabricated`) can be **reached** with the rules in G1 — the other four (`Material Check`, `QC Release`, `Sent to Paint`, `Painted`) remain empty until G2–G4 introduce the records that populate them.
3. Add selector hooks `useSpoolStages()` (Map<spoolNo, stage>) and `useSpoolStageCounts()` (Record<stage, number>).
4. Add a **funnel widget** to `components/fabrication-dashboard.tsx` — a single row above the existing KPI grid showing 7 tiles, one per stage, with a live count from `useSpoolStageCounts()`. Clicking a tile (only for non-empty stages) deep-links to `/fabrication/weld-progress?stage=<Stage>`.
5. Extend `/fabrication/weld-progress` to accept and honor `?stage=<Stage>` — when set, filter the existing weld table to welds belonging to spools at that stage, and render a clearable chip (mirror the E2.3 `?spool=` chip pattern). The other stages link to the same page with the same filter — clicking `Material Check` shows zero welds + chip "Stage: Material Check" with the empty-state copy *"No spools at this stage yet — G2 will populate it"*.
6. **Do not** add a sidebar entry. **Do not** create any new route. **Do not** modify `config/navigation.ts`. The only entry point in G1 is the dashboard funnel.

The "empty stages" are intentional and visible. They are the **promise** the audience can see being kept as G2–G5 ship.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/tracks/track_list.md` §7 + lines 214–220 | The gap this slice closes. |
| `docs/PIPEQC_TRACK_G_EXPLAINED.md` | Plain-language explanation of the 7 stages. **Read this if you don't know what "Material Check" means in EPC piping**, before deriving rules. |
| `store/welds-store.ts` (lines 195–258) | `useSpoolReadiness()` returns the per-spool weld rollup added in E2.3. G1 reads it and maps each row to a stage. **Do not duplicate the grouping logic.** |
| `components/erection-dashboard.tsx` (lines 415–445) | E2.3 funnel-card-clickable pattern. The G1 funnel mirrors this layout + click behavior. |
| `components/fabrication-dashboard.tsx` | Where the funnel goes. Currently 871 LOC, mostly static. Add the funnel as a new row at the **top** without touching the existing KPI grid below. |
| `app/fabrication/weld-progress/page.tsx` | Reference for `?param=` URL sync with Suspense. The new `?stage=` chip mirrors `?spool=` from E2.3 exactly. |
| `components/spool-tracking-dashboard.tsx` (lines 50–62) | Confirm the existing `SpoolStatus` is a **different** enum from `SpoolFabStage`. Do not unify them. |
| `lib/weld-data.ts` | Source of distinct `spoolNo` values used in the funnel. |

---

## 1. Data model — `lib/spool-data.ts` (new)

```ts
export type SpoolFabStage =
  | "Not Started"
  | "Material Check"
  | "Weld Progress"
  | "Fabricated"
  | "QC Release"
  | "Sent to Paint"
  | "Painted"
  | "Laydown"

export const STAGE_ORDER: SpoolFabStage[] = [
  "Not Started",
  "Material Check",
  "Weld Progress",
  "Fabricated",
  "QC Release",
  "Sent to Paint",
  "Painted",
  "Laydown",
]

// Color tokens per stage — used by the funnel and (future) badges.
// Match docs/PIPEQC_CONTEXT.md design system (sky/amber/emerald/violet/slate).
export const STAGE_COLOR: Record<SpoolFabStage, { bg: string; text: string; rail: string }> = {
  "Not Started":    { bg: "bg-slate-50",   text: "text-slate-600",   rail: "bg-slate-300"   },
  "Material Check": { bg: "bg-amber-50",   text: "text-amber-700",   rail: "bg-amber-500"   },
  "Weld Progress":  { bg: "bg-sky-50",     text: "text-sky-700",     rail: "bg-sky-500"     },
  "Fabricated":     { bg: "bg-emerald-50", text: "text-emerald-700", rail: "bg-emerald-500" },
  "QC Release":     { bg: "bg-violet-50",  text: "text-violet-700",  rail: "bg-violet-500"  },
  "Sent to Paint":  { bg: "bg-slate-50",   text: "text-slate-600",   rail: "bg-slate-400"   },
  "Painted":        { bg: "bg-slate-50",   text: "text-slate-600",   rail: "bg-slate-400"   },
  "Laydown":        { bg: "bg-slate-50",   text: "text-slate-600",   rail: "bg-slate-400"   },
}
```

### Derivation function

```ts
import type { SpoolReadiness } from "@/store/welds-store"

export function deriveFabStage(readiness: SpoolReadiness | undefined): SpoolFabStage {
  if (!readiness || readiness.total === 0) return "Not Started"

  // G1 cannot tell apart Material Check / QC Release / Paint stages from
  // weld data alone. G2 will introduce the MaterialCheckRecord that lets
  // a spool live at "Material Check" before its welds start. Until then:
  //   - Any spool with welds in flight → "Weld Progress"
  //   - Any spool fully welded (all Completed, no rework, no rejected) → "Fabricated"
  //   - Spool that has no weld activity yet → "Not Started"

  if (readiness.status === "Ready for delivery") return "Fabricated"
  if (readiness.status === "Not started")        return "Not Started"
  // Both "In fabrication" and "Blocked" map to Weld Progress —
  // Blocked is just Weld Progress with rework/rejected on board.
  return "Weld Progress"
}
```

The derivation is intentionally **pessimistic about middle stages** — they will only light up when G2/G3/G4 add the records that distinguish them. Do not invent rules to populate Material Check / Paint stages from weld data alone; the empty cards are a feature, not a bug.

---

## 2. Selector hooks

Place in `store/spool-stage.ts` (new) — separate file so G1 doesn't touch `welds-store.ts` and so G2 can extend the same module.

```ts
"use client"
import { useMemo } from "react"
import { useSpoolReadiness } from "@/store"
import { deriveFabStage, STAGE_ORDER, type SpoolFabStage } from "@/lib/spool-data"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  return useMemo(() => {
    const map = new Map<string, SpoolFabStage>()
    for (const r of readiness) map.set(r.spoolNo, deriveFabStage(r))
    return map
  }, [readiness])
}

export function useSpoolStageCounts(): Record<SpoolFabStage, number> {
  const stages = useSpoolStages()
  return useMemo(() => {
    const counts = Object.fromEntries(STAGE_ORDER.map(s => [s, 0])) as Record<SpoolFabStage, number>
    for (const s of stages.values()) counts[s]++
    return counts
  }, [stages])
}

export function useSpoolsAtStage(stage: SpoolFabStage): string[] {
  const stages = useSpoolStages()
  return useMemo(
    () => [...stages.entries()].filter(([, s]) => s === stage).map(([no]) => no).sort(),
    [stages, stage]
  )
}
```

Re-export from `store/index.ts` so consumers can do `import { useSpoolStageCounts } from "@/store"`.

---

## 3. Funnel widget on `/fabrication/dashboard`

In `components/fabrication-dashboard.tsx`:

- Add a new section **above** the existing KPI cards. **Do not rearrange** anything below it. Section title (small caps, slate-500 tracking-wider): `Spool fabrication pipeline`.
- 8 tiles in a single horizontal row (`Not Started`, `Material Check`, …, `Laydown`). On viewports < 1280px, wrap to 4 + 4.
- Each tile:
  - Color rail on the left edge (4px wide) using `STAGE_COLOR[stage].rail`.
  - Stage name (text-xs uppercase tracking-wider slate-500).
  - Count (text-2xl font-semibold slate-900).
  - Subtitle (text-xs slate-500): for empty stages render `"empty"`, for populated render `"N spool(s)"` (already shown by the count — pick one, don't duplicate).
- Tile is rendered as `<Link href={`/fabrication/weld-progress?stage=${encodeURIComponent(stage)}`}>` ONLY when count > 0. When count === 0, render as a static `<div>` with `opacity-50 cursor-default`.
- No new icons required. The color rail does the visual work.

Width budget: 8 tiles × ~150px ≈ 1200px. Match the existing dashboard `max-w` so it doesn't overflow.

---

## 4. `?stage=` chip on `/fabrication/weld-progress`

In `app/fabrication/weld-progress/page.tsx`:

- The page already accepts `?spool=<spoolNo>` (E2.3) and renders a clearable chip. Add a sibling `?stage=<SpoolFabStage>` chip.
- When `?stage=` is present, filter the weld table to welds whose `spoolNo` belongs to a spool at that stage (use `useSpoolsAtStage(stage)`).
- `?spool=` and `?stage=` can coexist — apply both filters (intersection). Either chip is independently clearable. Clicking a chip removes only its param.
- The chip label format: `Stage: Material Check` (Tailwind: same chip style as the existing `?spool=` chip).
- **Empty-state copy** when `?stage=Material Check` (or any G2–G5 stage) and the result is 0 welds:
  > "No spools at this stage yet. Material Check screens land in Track G Phase G2."
  (Adjust copy per stage: replace "Material Check" with the actual stage name and the corresponding upcoming phase name. For `Sent to Paint` / `Painted` / `Laydown` say "Track G Phase G4/G5".)
- For `Weld Progress` and `Fabricated`, normal results render — these are the stages G1 actually populates.

Suspense wrapping is already in place for `?spool=` — extend the same boundary; do not add a second one.

---

## 5. Constraints

1. No new npm dependencies.
2. **No new persisted store.** No localStorage keys touched. The persist version of `welds-store` is **not** bumped.
3. **No new sidebar entries.** `config/navigation.ts` is not modified.
4. **No changes** to `store/welds-store.ts`, `store/erection-store.ts`, `store/batches-store.ts`, `store/testpack-store.ts`, `store/admin-store.ts`. Read-only via existing hooks.
5. **No changes** to `components/spool-tracking-dashboard.tsx`. Its `SpoolStatus` enum stays as-is.
6. The funnel must be **read-only** in G1 — clicking a tile only navigates, it does not advance any spool's stage. Advancement happens in G2–G5.
7. Demo cadence not applicable (no mutations).
8. SSR hydration: no relative dates needed in this slice, so the hydration trap from E2.5 doesn't apply — but if you add anything `Date`-based, follow the `7fda1c9` pattern.
9. Smallest possible change to `fabrication-dashboard.tsx` — only insert the funnel section at the top.

---

## 6. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Open `/fabrication/dashboard`. New "Spool fabrication pipeline" section is visible **above** the existing KPI grid. 8 tiles render in a row.
2. Counts on the funnel match reality: the sum of all tile counts equals the number of distinct `spoolNo` values in `useWeldsStore`. 5 tiles show 0 (`Not Started` may or may not be 0 depending on seed; `Material Check`, `QC Release`, `Sent to Paint`, `Painted`, `Laydown` all show 0).
3. The `Weld Progress` and `Fabricated` tiles show positive counts matching the existing `useSpoolReadiness()` distribution (`In fabrication + Blocked → Weld Progress`, `Ready for delivery → Fabricated`).
4. Click the `Weld Progress` tile → navigate to `/fabrication/weld-progress?stage=Weld%20Progress`. Page loads with a chip `Stage: Weld Progress` and the weld table filtered to only welds on Weld-Progress spools.
5. Click the chip → query param drops, table returns to unfiltered view.
6. With both `?spool=TC-001&stage=Weld Progress` in the URL (manually paste), both chips render and the filter is the **intersection** (welds on TC-001 AND on a Weld-Progress spool — likely just TC-001's welds if that spool is at Weld Progress).
7. Click the `Material Check` tile — **it should not be clickable** (count is 0). Hover does not show a pointer cursor. Manually navigating to `/fabrication/weld-progress?stage=Material%20Check` renders the chip + the empty-state copy `"No spools at this stage yet. Material Check screens land in Track G Phase G2."` and zero rows.
8. Force a weld into rework via the existing F2 flow (Send to NDE → Mark for Rework or by manually editing in weld-progress). Its spool's funnel position should not move (Blocked still maps to Weld Progress per the G1 rules). Funnel counts adjust correctly across rework cascades.
9. `Reset Demo` from the top nav. Funnel counts revert to the seed distribution.

### Regression

10. `/erection/dashboard` still shows the Spool delivery readiness card from E2.3.
11. `/fabrication/weld-progress?spool=TC-001` still works exactly as before (E2.3 chip).
12. `/tracking` still shows the existing static spool tracking dashboard with its `Fabricated | Painted | Final QC | Erected | In Transit` location states. Nothing on that page changed.
13. `/nde` still shows Source pills from F2+E2.4.
14. E2.5 still emits ISO-welded notifications.

### Build

15. `npx tsc --noEmit` clean.
16. `npm run build` clean — no new warnings.
17. No hydration warnings on first load (DevTools console).

---

## 7. Definition of done

- New files:
  - `lib/spool-data.ts` — `SpoolFabStage`, `STAGE_ORDER`, `STAGE_COLOR`, `deriveFabStage`.
  - `store/spool-stage.ts` — `useSpoolStages`, `useSpoolStageCounts`, `useSpoolsAtStage`.
- Modified files:
  - `components/fabrication-dashboard.tsx` — funnel widget inserted at the top; rest untouched.
  - `app/fabrication/weld-progress/page.tsx` — extend `?spool=` chip handling to also accept `?stage=`; intersection filtering; empty-state copy per stage.
  - `store/index.ts` — barrel re-export the three new selector hooks.
  - `docs/PIPEQC_CONTEXT.md` — append a merge log entry for G1; update §"Manual cross-reference" row §7 to say *"Fabrication module (§7) — Weld Progress + Dashboard funnel (G1)"*.
  - `docs/tracks/track_list.md` §7 — note "G1 funnel merged; G2 Material Check next".
- All 17 acceptance criteria pass.
- PR description lists: the funnel layout choice (1-row vs 2-row wrap), and any spools that landed at unexpected stages on first render (sanity check the derivation).

---

## 8. Manual self-check before reporting done

1. **The funnel-sums-to-total check** (criterion 2): if the 8 tile counts don't add up to the number of distinct spools in `useWeldsStore`, something in `deriveFabStage` or `useSpoolStages` is dropping rows. Console-log it once during dev to confirm.
2. **The "empty stage is empty" check** (criterion 7): if `Material Check` or `Painted` shows a count > 0, you accidentally invented a derivation rule. Remove it — those stages must stay empty until G2–G4.
3. **The "weld-progress chip composition" check** (criterion 6): paste `?spool=TC-001&stage=Weld%20Progress` and verify both chips render and the filter is intersection (AND, not OR).
4. **Don't touch `/tracking`**: `git diff --stat main -- components/spool-tracking-dashboard.tsx` must be 0. That file lives in a different conceptual track.
5. **Size sanity**: ~200–300 LOC net added. If over 400, you over-built — G1 has no detail panel, no Sheet, no mutations.

Report files created/modified, the funnel layout, and the spool distribution on first render (count per stage).
