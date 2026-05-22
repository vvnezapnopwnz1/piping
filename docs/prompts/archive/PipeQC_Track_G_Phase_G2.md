# Task: PipeQC Track G, Phase G2 — Material Check screen (§7 stage 2)

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track-upstream.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` first.
Tracks A (A1–A6), B (B1–B2), E2 (E2.1, E2.3, E2.5), N (N1+N2), F2 + E2.4 are merged. **Track G Phase G1 (foundation + funnel widget) is a prerequisite** — confirm it is merged before starting G2. G1 introduces `SpoolFabStage`, `STAGE_ORDER`, `STAGE_COLOR`, `deriveFabStage`, and the selector hooks `useSpoolStages` / `useSpoolStageCounts` / `useSpoolsAtStage`. G2 **extends** these, it does not duplicate them.

This slice is **Track G Phase G2** — the first user-facing stage of the Spool Fabrication Lifecycle (`track_list.md` §7). The manual describes a 7-stage pipeline per spool: `Start Fab → Material Check → Weld Progress → Fabricated → QC Release → Sent to Paint → Painted/Final QC/Laydown`. After G1, only **Weld Progress** has a screen and the dashboard funnel visualizes the empty stages. G2 closes the **Material Check** gap — the stage *before* welding, where heat numbers are verified against mill certificates and material is signed off as fit-for-fab.

G2 is the natural first user-facing stage of Track G because:

1. **Demo-relevant**: heat-number traceability is a top question from any EPC audience. Without it the pitch line *"every joint is auditable"* doesn't survive scrutiny.
2. **Self-contained**: works on the existing spool universe (set of distinct `spoolNo` values in `welds-store`). No new data sources needed.
3. **Lights up the first empty funnel tile from G1**: post-merge, `Material Check` is no longer an empty placeholder — it shows live counts and a real screen.

Size: ~0.75 day; ~400–550 LOC across 1 new persisted store + 1 new seed file + 1 new page + 2 new components + 1 extension to G1's `deriveFabStage` + sidebar nav entry.

---

## Why this slice exists (demo narrative)

Today the demo opens at `/fabrication/weld-progress` and shows welders doing their thing. There is no answer to *"how did the material get there?"*. Sergey (the foreman from `track-upstream.md` §2) implicitly assumes pipe is on the floor with verified heat numbers — but the audience can't see that step.

After G2:

> *Sergey starts the day in **Material Check**. Five spools arrived from the warehouse: TC-001, TC-002, TC-003, FU-004, CW-005. He clicks TC-001 — the screen shows 3 pieces of pipe with heat numbers `HT-CS-A106B-22847`, `HT-CS-A106B-22849`, `HT-CS-A106B-22912`, each with a mill cert reference. He scans through, sees one piece is missing the cert (red banner), files a non-conformance, clears the other 4, signs off. TC-001 advances to **Weld Progress** — and from there everything we already showed today plays out.*

This becomes opening beat #1 of the upstream story, before the existing weld-progress flow.

---

## Goal

1. **Add per-spool persisted state** in a new `store/spools-store.ts`. The store holds `MaterialCheckRecord` per spool: heat-number list, mill-cert refs, inspector, sign-off date, status. Persist under `pipeqc-spools`.
2. **Add a derived `fabStage` selector** on top of the new store + existing `welds-store`. Stages: `Not Started | Material Check | Weld Progress | Fabricated | QC Release | Sent to Paint | Painted | Laydown`. G2 only **populates** the first 3 actively; stages 4–7 are inferred but inert (G3–G5 will activate them).
3. **New route `/fabrication/material-check`** with two views:
   - **List view**: table of spools, grouped by current `fabStage`, filterable. Default shows only spools at `Material Check` stage.
   - **Detail panel (right-side `Sheet`)**: per-spool MC form — heat numbers table, mill cert refs, NC flag per row, inspector dropdown, sign-off action.
4. **Sign-off action**: ≥1 piece must be cleared (`status: Cleared`) for the spool to advance. NC pieces stay flagged but don't block advance — they cascade to `notifications-store` as warnings. On sign-off: 600–800 ms delay → spool's `fabStage` advances to `Weld Progress` → toast + home notification.
5. **Funnel widget on `/fabrication/dashboard`**: one new row of 7 small cards (one per stage) showing the current spool count at each stage. Click a card → `/fabrication/material-check?stage=<Stage>`. **Read-only** on this slice — clicking does not advance anything.
6. **Sidebar nav**: add **Material Check** under the Fabrication group in `config/navigation.ts`, visible to `qc_engineer`, `project_manager`, `subcontractor`.

**Do not** touch the Erection module, NDE module, Testpack, or any Track A/B screens. Smallest possible footprint outside the Fabrication group.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/tracks/track_list.md` §7 + §218 | The spool lifecycle gap this slice closes. |
| `store/welds-store.ts` (lines 195–258) | `useSpoolReadiness` — the read-side spool rollup added in E2.3. Reuse the spool-grouping shape; do not duplicate. |
| `store/erection-store.ts` | Reference for the persisted-store pattern (E2.1). G2's `spools-store.ts` mirrors this shape: `persist` middleware, unique localStorage key, KPI selector, action set. |
| `store/admin-store.ts` | Reference for read-only referential pattern (B1) + how inspectors are exposed via a hook. |
| `store/demo-store.ts` | Must cascade `resetSpools()` into `resetAll()`. |
| `lib/welder-qualifications.ts` | Pattern for a `validate*()` helper — apply the same shape for `validateMaterialCheck()`. |
| `lib/weld-data.ts` | Source for the spool universe — distinct `spoolNo` values, plus material info (`materialType`, `diaInch`, `wpsNo`). |
| `components/erection-dashboard.tsx` (lines 415–445) | E2.3 row-click navigate pattern — match for the funnel cards. |
| `components/weld-detail-panel.tsx` | Reference for inspector dropdown + signed-off date input + WLD-099 validation pattern (apply same red-helper-text style to NC heat-number rows). |
| `components/erection/field-weld-detail-panel.tsx` | Reference for a Sheet-based detail panel with form + sign-off button (E2.1 pattern). |
| `app/fabrication/weld-progress/page.tsx` | Reference for `?param=` URL sync with Suspense — `?stage=` mirrors the `?spool=` chip pattern from E2.3. |
| `config/navigation.ts` | Where the new sidebar entry goes. Keep `/fabrication/dashboard`, `/fabrication/weld-progress` siblings. |

---

## 1. Data model — extend `lib/spool-data.ts` (already exists from G1)

G1 already exports `SpoolFabStage`, `STAGE_ORDER`, `STAGE_COLOR`, and a basic `deriveFabStage(readiness)` that knows only about Not Started / Weld Progress / Fabricated. **Do not re-declare** these. G2 **adds** the Material Check data model and **widens** `deriveFabStage` to take an optional MC record.

Add to `lib/spool-data.ts`:

```ts
export type MaterialCheckStatus = "Pending" | "Cleared" | "Non-conformance"

export interface HeatPiece {
  id: string                    // "HP-TC-001-1"
  heatNumber: string            // "HT-CS-A106B-22847"
  materialGrade: string         // "CS A106B"
  diaInch: string               // "6"" or "4""
  lengthM: number               // 6.0
  millCertRef?: string          // "MILL-2026-2284" — optional; absence triggers NC
  status: MaterialCheckStatus   // default "Pending"
  ncRemark?: string             // populated when status === "Non-conformance"
}

export interface MaterialCheckRecord {
  spoolNo: string
  pieces: HeatPiece[]
  inspector?: string            // "QC-ENG-01" / "QC-ENG-02" — set on sign-off
  signedOffDate?: string        // ISO — set on sign-off
  nonConformanceCount: number   // derived field, kept on record for cheap KPI queries
}
```

Seed: export `MATERIAL_CHECK_SEED: MaterialCheckRecord[]` covering the distinct spool universe from `lib/weld-data.ts`. For each unique `spoolNo`:

- 2–4 `HeatPiece` entries (vary diameter / grade to match existing welds on that spool).
- Heat numbers in format `HT-<grade-tokens>-<5 digits>`.
- Mill cert refs `MILL-2026-<4 digits>`. **One spool in the seed has a missing cert** (status `"Non-conformance"`, ncRemark `"Mill certificate not yet received from supplier"`) — pick `CW200-S-001` or whichever spool has 2+ welds. This is the demo moment.
- 2 spools pre-signed-off (status `Cleared`, inspector + signedOffDate populated) — these will continue to land on `Weld Progress` stage at first render.
- 3–4 spools left in `Pending` state — these are what populates the new Material Check stage.

### Widen `deriveFabStage`

G1's signature is `deriveFabStage(readiness): SpoolFabStage`. Widen to:

```ts
export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
): SpoolFabStage
```

Rules (apply top-down, first match wins). **All call sites that passed only `readiness` continue to work** (the new param is optional and defaults to undefined, which falls back to the G1 rules):

1. If `mcRecord` exists and `signedOffDate` is **not** set → `"Material Check"`.
2. If `mcRecord` exists and any piece is `"Pending"` (regardless of signedOff) → `"Material Check"`.
3. If `mcRecord` is signed off and `readiness.status === "Ready for delivery"` → `"Fabricated"`.
4. If `mcRecord` is signed off and `readiness.status === "In fabrication" | "Blocked"` → `"Weld Progress"`.
5. If no `mcRecord` → fall back to G1 rules (Not Started / Weld Progress / Fabricated based purely on readiness).

Stages 5–8 (`QC Release`, `Sent to Paint`, `Painted`, `Laydown`) remain unreachable in G2 — G3–G5 will introduce the records that populate them. The enum is already complete from G1 so funnel rendering doesn't change.

---

## 2. Store — `store/spools-store.ts` (new)

`"use client"`. Same shape as `erection-store.ts`:

```ts
interface SpoolsState {
  records: MaterialCheckRecord[]

  // Selectors
  getRecord: (spoolNo: string) => MaterialCheckRecord | undefined
  getPieces: (spoolNo: string) => HeatPiece[]

  // Mutations
  updatePiece: (spoolNo: string, pieceId: string, patch: Partial<HeatPiece>) => void
  flagNC: (spoolNo: string, pieceId: string, remark: string) => void
  clearPiece: (spoolNo: string, pieceId: string) => void
  signOffMaterialCheck: (spoolNo: string, inspector: string) => void
  resetSpools: () => void
}
```

- `persist` middleware, key `"pipeqc-spools"`, version `1`.
- `resetSpools()` re-seeds from `MATERIAL_CHECK_SEED`.
- Wire `useSpoolsStore.getState().resetSpools()` into `demo-store.ts:resetAll()` (one new line, after `resetErection`).
- Export a barrel-friendly hook on `store/index.ts`.

### Update selector hooks in `store/spool-stage.ts` (already exists from G1)

G1 created `useSpoolStages`, `useSpoolStageCounts`, `useSpoolsAtStage` using `deriveFabStage(readiness)`. G2 wires the MC record into them:

- Inside `useSpoolStages`, also subscribe to `useSpoolsStore(s => s.records)` and pass the matching record into `deriveFabStage(readiness, mcRecord)`. Now spools at MC actually show at MC stage in the funnel.
- `useSpoolsAtStage(stage)` keeps the same signature; G2 makes its result richer by exposing the record alongside if convenient (a separate helper `useSpoolMCRecord(spoolNo)` is cleaner — add that instead of widening the return type, so existing callers stay intact).

---

## 3. Page — `app/fabrication/material-check/page.tsx` (new)

```tsx
"use client"
import { Suspense } from "react"
import { MaterialCheckView } from "@/components/fabrication/material-check-view"

export default function MaterialCheckPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <MaterialCheckView />
    </Suspense>
  )
}
```

Suspense is mandatory — `MaterialCheckView` uses `useSearchParams()` for `?stage=` + `?spool=` sync (mirror E2.3 `?spool=` pattern).

---

## 4. List view — `components/fabrication/material-check-view.tsx` (new)

`"use client"`. Layout:

- **Header**: title `Material Check`; subtitle *"Verify heat numbers and mill certificates before welding"*.
- **Top filter strip**: stage chips `All / Material Check (N) / Weld Progress (N) / Fabricated (N)` (skip later stages until G3–G5 light them up). Active chip `bg-sky-600 text-white`. Default `Material Check`. URL synced via `?stage=`.
- **Search input**: filters by spool number or heat number (matches any piece's `heatNumber`).
- **Table** (match `weld-table.tsx` density). Columns:
  - Spool No (mono)
  - Stage (pill — color from token table: Material Check = amber, Weld Progress = sky, Fabricated = emerald, others slate)
  - Pieces (e.g. `3 pieces · 1 NC` with NC count in red when >0)
  - Inspector (or `—` if not signed off)
  - Signed off (relative date or `—`)
  - empty header — click row opens detail panel on the right
- **Detail panel** mounts when `?spool=<spoolNo>` is set in URL. Click any row → set the query param via `router.replace(`/fabrication/material-check?stage=${stage}&spool=${spoolNo}`)`. The panel is the second file below.

URL params:
- `?stage=Material Check` (default)
- `?spool=TC-001` (optional — opens detail)
- Both are URL-synced via `useSearchParams` + `router.replace`. No browser-back trap (replace, not push).

Empty state: *"No spools at this stage."* (different copy per stage if you want).

---

## 5. Detail panel — `components/fabrication/material-check-detail-panel.tsx` (new)

`"use client"`. Right-side `Sheet` `sm:max-w-[640px]`. Mounted by the list view when `?spool=` is set.

**Header**:
- `Spool TC-001` (mono)
- StatusPill with current fabStage
- Subtext: total pieces · NC count · pending count

**Body — pieces table**, one row per `HeatPiece`:

| Column | Content |
| --- | --- |
| Heat # | mono input (`HT-CS-A106B-22847`) — editable while status is Pending |
| Grade | read-only chip (`CS A106B`) |
| Dia × Length | read-only (`6" × 6.0 m`) |
| Mill cert | small input, optional — empty cert auto-flags NC suggestion |
| Status | segmented control `Pending` / `Cleared` / `Non-conformance` |
| NC remark | inline textarea, only shown when status === `Non-conformance`; required to confirm |

Validation: if any piece has status `Non-conformance` without a remark, the sign-off button is disabled with red helper text *"Add a remark for every non-conformance row before sign-off."* — match the WLD-099 inline-validation pattern.

**Footer**:
- Inspector dropdown — list of QC engineers (hardcoded array in `lib/spool-data.ts` for now: `QC-ENG-01..QC-ENG-04`, or pull from the existing welder-qualifications data if there's a clean QC subset).
- `Sign off` button — disabled when:
  - 0 pieces are `Cleared` (must clear at least one to advance), OR
  - any NC piece is missing a remark.
- On click: 600–800 ms artificial delay → `signOffMaterialCheck(spoolNo, inspector)` mutation → toast `"Material Check signed off for ${spoolNo} (${ncCount} NCs)"` → home notification (severity `info` if NC count is 0, `warning` if NC count > 0) *"${spoolNo}: Material Check complete · ${ncCount} non-conformance${plural} · advanced to Weld Progress"* → close the panel via `router.replace(\`/fabrication/material-check?stage=Material Check\`)` (clears `?spool=`).

A second action: `Save draft` — persists piece edits without sign-off. No stage change. Toast `"Draft saved"`.

---

## 6. Repoint the funnel widget (already exists from G1)

G1 placed the funnel on `/fabrication/dashboard` with tiles linking to `/fabrication/weld-progress?stage=<Stage>`. G2 changes the `Material Check` tile's destination to `/fabrication/material-check?stage=Material Check` so clicking it lands on the new MC screen, not on weld-progress. All other tiles continue to point at weld-progress with the `?stage=` chip from G1.

Smallest change inside `components/fabrication-dashboard.tsx`: branch the `href` per stage — `"Material Check"` → MC route, everything else → weld-progress route as before. Do not rebuild the tile component.

---

## 7. Sidebar nav

`config/navigation.ts` — add an entry under the Fabrication group:

```ts
{
  label: "Material Check",
  href: "/fabrication/material-check",
  icon: "ClipboardCheck", // or whatever lucide name fits — match existing pattern
  roles: ["qc_engineer", "project_manager", "subcontractor"],
}
```

Position it **between** `/fabrication/dashboard` and `/fabrication/weld-progress` — visually it sits before welding in the spool lifecycle.

---

## 8. Constraints

1. No new npm dependencies.
2. New persisted store under unique key `pipeqc-spools`. Version `1`.
3. Demo cadence: 600–800 ms artificial delay before every mutation.
4. **No changes** to `store/welds-store.ts`, `store/erection-store.ts`, `store/batches-store.ts`, `store/testpack-store.ts`. Read-only access only.
5. **No changes** to any Track A/B/E2/N screens. The only touched dashboard is `fabrication-dashboard.tsx` (funnel widget add).
6. The new sidebar item must respect the role-based visibility — verify `nde_inspector` and `spooling_team` and `system_admin` don't see it (or do, if that's the convention — match `/fabrication/weld-progress` visibility).
7. SSR hydration: relative-date display in the table (`"signed 2 days ago"`) must be client-only. Apply the `7fda1c9` pattern (render absolute date initially, swap to relative in `useEffect`).
8. The `Reset Demo` flow must restore the seed exactly — including the one seed NC piece.

---

## 9. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Sidebar shows **Material Check** under Fabrication. Click it → `/fabrication/material-check` loads, default chip `Material Check` active.
2. Table renders N spools (whichever count is at MC stage on first load — likely 3–5 from the seed). No console errors. No hydration warnings.
3. The spool with the seed NC piece (`CW200-S-001` or whichever you chose) shows `1 NC` in red in the Pieces column.
4. Click that spool row. Detail panel opens on the right. URL becomes `/fabrication/material-check?stage=Material Check&spool=CW200-S-001`.
5. Pieces table shows 2–4 rows. One has status `Non-conformance` with the seed remark visible.
6. Edit a `Pending` piece: type a heat number, select `Cleared`. Click `Save draft`. ~700 ms delay → toast `"Draft saved"` → panel stays open → reopened from list, piece persists.
7. Try clicking `Sign off` while 0 pieces are cleared. Button is disabled, helper text visible.
8. Clear 1 piece. Add a remark to the NC row. Inspector dropdown defaults to `QC-ENG-01`. `Sign off` enables. Click it.
9. ~700 ms delay → toast `"Material Check signed off for CW200-S-001 (1 NCs)"` → panel closes → URL drops `?spool=` → row in the list updates: Inspector populated, Signed off shows `today`, Stage pill flips to `Weld Progress`.
10. Top filter strip count updates: `Material Check (N-1)` and `Weld Progress (M+1)`.
11. Click the `Weld Progress` chip. The just-signed spool appears at the top.
12. Open `/` (Home). New info or warning notification — *"CW200-S-001: Material Check complete · 1 non-conformance · advanced to Weld Progress"*.
13. Open `/fabrication/dashboard`. New funnel strip is visible above existing KPIs. Counts match the list-view chip counts.
14. Click the `Material Check` tile in the funnel → navigates to `/fabrication/material-check?stage=Material Check`. Click `Weld Progress` tile → navigates to `?stage=Weld Progress`.
15. Refresh the page on `/fabrication/material-check?stage=Weld Progress&spool=CW200-S-001`. State persists, panel reopens.
16. `Reset Demo` from top nav → list returns to seed (the just-cleared spool is back at MC stage with the seed NC piece). Run the same flow again — still works.

### Regression

17. `/fabrication/weld-progress?spool=TC-001` still loads with the E2.3 chip.
18. `/erection/dashboard` still shows the Spool delivery readiness card.
19. `/nde` still shows Source pills from F2+E2.4.
20. F2 regression: open a weld detail panel → `Send to NDE` → wizard opens on Step 2 preselected.
21. E2.5 regression: complete all welds on `ISO-1001` → notification `"ISO-1001: welded — Ready for line check on TP-201"` still fires.
22. Sidebar nav remains unchanged for other roles (e.g. `nde_inspector` sees the same items as before plus or minus Material Check per the role policy).

### Build

23. `npx tsc --noEmit` clean.
24. `npm run build` clean — no new warnings, especially no `useSearchParams() should be wrapped in suspense` warnings.
25. No hydration warnings in DevTools after 3 hard refreshes.

---

## 10. Definition of done

- New files:
  - `lib/spool-data.ts` — types + `MATERIAL_CHECK_SEED` + `deriveFabStage` helper.
  - `store/spools-store.ts` — persisted store + selectors.
  - `app/fabrication/material-check/page.tsx` — thin Suspense + view mount.
  - `components/fabrication/material-check-view.tsx` — list view.
  - `components/fabrication/material-check-detail-panel.tsx` — detail Sheet.
- Modified files:
  - `components/fabrication-dashboard.tsx` — add funnel strip (smallest possible change).
  - `config/navigation.ts` — add sidebar entry.
  - `store/demo-store.ts` — cascade `resetSpools()` into `resetAll()`.
  - `store/index.ts` — barrel re-export.
  - `docs/PIPEQC_CONTEXT.md` — flip `/fabrication/material-check` to ✅ in file-structure + add merge log entry for G2.
  - `docs/tracks/track_list.md` §7 — mark Material Check ✅ (1/7 stages); update the "Кандидат на новый Track G" line.
- All 25 acceptance criteria pass.
- PR description lists: which spools landed at each stage on first render (sanity check the seed distribution), which lucide icon was chosen for the sidebar, and any acceptance step that needed a browser to verify.

---

## 11. Manual self-check before reporting done

1. **The seed-distribution sanity check**: on first load (post Reset Demo), the funnel strip should show at least 2 spools at MC, ≥3 at Weld Progress, and 0 at later stages. If everything piles up at one stage, the `deriveFabStage` rules are mis-ordered.
2. **The hydration test** (step 25): relative dates must be client-only-mounted. Hard refresh 3 times — zero console warnings.
3. **The "no other module touched" check**: `git diff --stat main` should only touch files under `app/fabrication/material-check/`, `components/fabrication/`, `lib/spool-data.ts`, `store/spools-store.ts`, `store/demo-store.ts`, `store/index.ts`, `config/navigation.ts`, `components/fabrication-dashboard.tsx`, `docs/`. If anything else changed — revert it.
4. **Size sanity**: ~500–650 LOC net added. If under 350, you skipped the funnel widget or shipped a stub detail panel. If over 800, you started over-engineering the stage model (G3–G5 will handle later stages; do not preempt them).
5. **Reset Demo round-trip** (step 16): the seed NC piece must come back. If `resetSpools()` doesn't re-seed correctly, the demo will lose its anchor moment after the first reset.

Report files created/modified, the spool chosen for the seed NC, the funnel layout choice (1-row vs 2-row), and any acceptance step that required a browser to verify.
