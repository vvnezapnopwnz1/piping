# Task: PipeQC Track G, Phase G3 — QC Release screen + Fabricated → Released advancement

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` (parts 5–7) first.
Tracks A, B, E2 (E2.1/E2.3/E2.5), N (N1+N2), F2+E2.4, C1, G1, G2, **G1.1** are merged. G1.1 is a hard prerequisite — its funnel cleanup + `STAGE_SCREENS` map is the surface G3 extends.

This slice lights up the **4th stage** of §7 Spool Fabrication Lifecycle — **QC Release** — and gives the auto-derived `Fabricated` stage its first real workspace. After all welds on a spool pass NDE and Material Check is signed off, the spool sits at `Fabricated` waiting for a QC engineer to walk the piece: dimensional check, visual inspection, paperwork verification, heat-number traceability cross-check, signature. Sign-off advances the spool to `QC Release` stage — the prerequisite for paint handoff in G4.

Today: `Fabricated` is auto-derived from `useSpoolReadiness().status === "Ready for delivery"` plus a signed-off MC record. There is no action screen, no checklist, no signature, no audit trail.

Size: **~0.5 day**; ~350–500 LOC across 1 new persisted store + 4 new files + edits to `spool-data.ts`, `spool-stage.ts`, `fabrication-dashboard.tsx`, `navigation.ts`, `demo-store.ts`, `store/index.ts`.

---

## Why this slice exists (demo narrative)

Adds a beat between Mikhail's NDE acceptance and Hassan's spool delivery readiness:

> *Sergey finishes welding `PL-TK100-001-A`. All welds pass NDE. The dashboard funnel shows the spool sitting at `Fabricated`. Sergey hands off to a QC engineer (Anna). She opens the **QC Release** screen, sees `PL-TK100-001-A` under "Awaiting Release", clicks it. A 4-item checklist opens: Dimensional, Visual, Documentation, Heat-number Traceability. She passes Visual and Documentation, marks Dimensional as "Pass with remark" ("0.3 mm out on flange face — within tolerance per spec 12-PIP-002"), passes Traceability. Picks herself as inspector. Signs off. The spool flips to `QC Release` stage. The funnel updates live; Hassan's erection dashboard now treats it as eligible for delivery.*

This is the answer to the recurring EPC question: *"how do you prove a spool was QC-released before it left the fab shop?"* Today: nothing on screen. Post-G3: 4-item checklist + signed audit trail.

---

## Goal

1. **Data model**: extend `lib/spool-data.ts` with `QCReleaseRecord`, `QCChecklistEntry`, `QCChecklistStatus`, the canonical `QC_CHECKLIST` array, and `QC_RELEASE_SEED`.
2. **Stage derivation**: widen `deriveFabStage(readiness, mcRecord?, qcRecord?)`. New rule: signed-off QC record → `"QC Release"` (highest priority among "good" outcomes).
3. **Persisted store**: new `store/qc-release-store.ts` mirroring `spools-store.ts`. Persist key `pipeqc-qc-release`, version 1. Cascade `resetQCRelease()` into `demo-store.ts:resetAll()`.
4. **Selector hook**: extend `store/spool-stage.ts` `useSpoolStages` to subscribe to the QC-release records and pass `qcRecord` into `deriveFabStage`. Add `useQCReleaseRecord(spoolNo)`.
5. **New route** `/fabrication/qc-release` — list view + detail Sheet. Two buckets only: **Awaiting Release** (spools at `Fabricated`) and **Released** (spools at `QC Release`). Internal status chips, not stage chips (G1.1 contract).
6. **Funnel update**: extend G1.1's `STAGE_SCREENS` map — both `Fabricated` and `QC Release` tiles now route to `/fabrication/qc-release`. Other tiles unchanged.
7. **Sidebar nav**: insert `QC Release` between `Material Check` and `Weld Progress` under the Fabrication group. Same role visibility as Material Check.

**Do not** touch Erection, NDE, Testpack, Track A/B/C/D screens. **Do not** preempt Paint or Laydown stages (those are G4/G5). **Do not** alter Material Check screen except for the reset cascade.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/PIPEQC_TRACK_G_EXPLAINED.md` parts 5 (stage table) and 7 (G3 description) | Plain-language definition of QC Release: who does it, why it matters, demo angle. |
| `docs/prompts/PipeQC_Track_G_Phase_G1.1.md` | Funnel `STAGE_SCREENS` map and the "internal-status-chips, not stage-chips" contract that this prompt continues. |
| `store/spools-store.ts` | Reference shape for the new `qc-release-store.ts` — persist middleware, seed deep-clone, mutation signatures. Mirror it 1:1. |
| `lib/spool-data.ts` (current `deriveFabStage`) | Where the new type, seed, and widening live. Read the existing rule cascade — preserve order. |
| `store/spool-stage.ts` | `useSpoolStages` to widen with a third subscription. |
| `components/fabrication/material-check-view.tsx` (post-G1.1) | Layout pattern for list view with internal status chips. Reuse density, chip styles, RelativeDate helper. |
| `components/fabrication/material-check-detail-panel.tsx` | Sheet layout, footer with inspector dropdown + Save Draft + Sign off, validation pattern. Mirror it. |
| `components/fabrication-dashboard.tsx` `FunnelSection` (post-G1.1) | Where the `STAGE_SCREENS` map gains two entries. |
| `store/welds-store.ts` `useSpoolReadiness` | Source of the "all welds done" signal that puts a spool at `Fabricated`. |
| `store/demo-store.ts` | Reset cascade — add `resetQCRelease()` after `resetSpools()`. |
| `config/navigation.ts` | Sidebar insertion point. |

---

## 1. Data model — extend `lib/spool-data.ts`

Append (do NOT redeclare any G1/G2 export):

```ts
export type QCChecklistKey = "dimensional" | "visual" | "documentation" | "traceability"

export interface QCChecklistItem {
  key: QCChecklistKey
  label: string
  description: string
}

export const QC_CHECKLIST: QCChecklistItem[] = [
  { key: "dimensional",   label: "Dimensional check",       description: "Length, flange face, bolt-hole orientation against ISO" },
  { key: "visual",        label: "Visual inspection",        description: "Surface defects, weld spatter, alignment" },
  { key: "documentation", label: "Documentation review",     description: "WPS, welder logs, NDE reports all on file" },
  { key: "traceability",  label: "Heat-number traceability", description: "All pieces match the Material Check record" },
]

export type QCChecklistStatus = "Pending" | "Pass" | "Pass with remark"

export interface QCChecklistEntry {
  key: QCChecklistKey
  status: QCChecklistStatus
  remark?: string  // required when status === "Pass with remark"
}

export interface QCReleaseRecord {
  spoolNo: string
  entries: QCChecklistEntry[]   // length 4, one per QC_CHECKLIST item
  inspector?: string             // set on sign-off
  signedOffDate?: string         // ISO date — set on sign-off
}
```

### Seed: `QC_RELEASE_SEED`

Cover the spools that land at `Fabricated` from the G2 seed (after the MC sign-off cascade). Read `MATERIAL_CHECK_SEED` to identify them — currently the signed-off-MC spools are the ones in the `--- Signed-off spools` block (~9 entries: `PL-TK100-001-A/B`, `PL-FU300-007-A`, `PL-TK100-002-A`, `PL-CW200-005-A`, `PL-TK100-003-A`, `PL-FU300-009-A`, `PL-TK100-004-A`, `PL-FU300-011-A`). Only those whose welds in `lib/weld-data.ts` are all completed end up at `Fabricated`; verify against `useSpoolReadiness` on a fresh load (console-log once during dev).

Distribution target:

- **2 pre-released spools** — `signedOffDate` + `inspector` populated, all 4 entries `Pass`. These land at `QC Release` stage on first render. Pick `PL-TK100-002-A` and `PL-CW200-005-A`.
- **1 anchor spool with a "Pass with remark"** entry — `signedOffDate` populated, `inspector` populated, 3 entries `Pass`, Dimensional entry `Pass with remark` with `"0.3 mm out on flange face — within tolerance per spec 12-PIP-002"`. Pick `PL-TK100-001-A`. This is the demo anchor (the audit-trail moment).
- **Remaining Fabricated spools** — no record at all. They show on the screen under "Awaiting Release" with a `0/4` checklist progress.

Helper:

```ts
function makeQCRecord(
  spoolNo: string,
  entries: Partial<Record<QCChecklistKey, { status: QCChecklistStatus; remark?: string }>>,
  opts?: { inspector?: string; signedOffDate?: string },
): QCReleaseRecord {
  return {
    spoolNo,
    entries: QC_CHECKLIST.map((item) => ({
      key: item.key,
      status: entries[item.key]?.status ?? "Pending",
      remark: entries[item.key]?.remark,
    })),
    inspector: opts?.inspector,
    signedOffDate: opts?.signedOffDate,
  }
}
```

### Widen `deriveFabStage`

```ts
export function deriveFabStage(
  readiness: SpoolReadiness | undefined,
  mcRecord?: MaterialCheckRecord,
  qcRecord?: QCReleaseRecord,
): SpoolFabStage
```

Rule cascade (apply top-down, first match wins). Preserve all existing G1/G2 rules — the only insertion is rule 1 below:

1. **(NEW G3)** If `qcRecord?.signedOffDate` is set → `"QC Release"`.
2. (G2) If `mcRecord` exists with no `signedOffDate` OR any `Pending` piece → `"Material Check"`.
3. (G2) If `mcRecord` is signed off AND `readiness.status === "Ready for delivery"` → `"Fabricated"`.
4. (G2) If `mcRecord` is signed off AND `readiness.status` is `"In fabrication" | "Blocked"` → `"Weld Progress"`.
5. (G1 fallback) No `mcRecord`: derive from `readiness` alone (`"Ready for delivery"` → `"Fabricated"`, `"Not started"` → `"Not Started"`, else `"Weld Progress"`).

A QC record with entries filled but no `signedOffDate` does **not** affect stage — the spool stays at `Fabricated`. Stages 6–8 (`Sent to Paint`, `Painted`, `Laydown`) remain unreachable; G4/G5 will introduce their records.

All existing call sites (`useSpoolStages`) pass `undefined` for the new param today — they keep working until updated in §3 below.

---

## 2. Store — `store/qc-release-store.ts` (new)

Mirror `store/spools-store.ts` exactly:

```ts
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  QC_CHECKLIST,
  QC_RELEASE_SEED,
  type QCChecklistEntry,
  type QCChecklistKey,
  type QCReleaseRecord,
} from "@/lib/spool-data"

interface QCReleaseState {
  records: QCReleaseRecord[]

  getRecord: (spoolNo: string) => QCReleaseRecord | undefined

  // Mutations
  upsertEntry: (spoolNo: string, key: QCChecklistKey, patch: Partial<QCChecklistEntry>) => void
  signOffQCRelease: (spoolNo: string, inspector: string) => void
  resetQCRelease: () => void
}
```

Behaviors:

- `upsertEntry` auto-creates the record if missing, seeding entries with `Pending` for every `QC_CHECKLIST` key, then patches the targeted entry. This is what powers the "no seed record → user opens panel → clicks Pass" flow.
- `signOffQCRelease` writes `signedOffDate = new Date().toISOString().split("T")[0]` and `inspector`. It does NOT mutate `entries` — callers are expected to upsert entries first (the detail panel does both: upserts each entry, then signs off).
- `resetQCRelease` re-seeds from `JSON.parse(JSON.stringify(QC_RELEASE_SEED))`. Persist key `"pipeqc-qc-release"`, version `1`.

Wire `useQCReleaseStore.getState().resetQCRelease()` into `store/demo-store.ts:resetAll()` immediately after the existing `resetSpools()` call.

Barrel re-export from `store/index.ts`:

```ts
export { useQCReleaseStore } from "./qc-release-store"
export { useQCReleaseRecord } from "./spool-stage"
```

---

## 3. Selector update — `store/spool-stage.ts`

Subscribe to QC records in `useSpoolStages` and pass them into `deriveFabStage`:

```ts
import { useQCReleaseStore } from "@/store/qc-release-store"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const mcRecords = useSpoolsStore((s) => s.records)
  const qcRecords = useQCReleaseStore((s) => s.records)

  return useMemo(() => {
    const mcMap = new Map(mcRecords.map((r) => [r.spoolNo, r]))
    const qcMap = new Map(qcRecords.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()

    for (const r of readiness) {
      map.set(r.spoolNo, deriveFabStage(r, mcMap.get(r.spoolNo), qcMap.get(r.spoolNo)))
    }
    // Defensive: spools with MC records but no welds yet (carried over from G2)
    for (const rec of mcRecords) {
      if (!map.has(rec.spoolNo)) {
        map.set(rec.spoolNo, deriveFabStage(undefined, rec, qcMap.get(rec.spoolNo)))
      }
    }
    return map
  }, [readiness, mcRecords, qcRecords])
}
```

`useSpoolStageCounts` and `useSpoolsAtStage` signatures unchanged. Add:

```ts
export function useQCReleaseRecord(spoolNo: string): QCReleaseRecord | undefined {
  return useQCReleaseStore((s) => s.getRecord(spoolNo))
}
```

---

## 4. Page — `app/fabrication/qc-release/page.tsx` (new)

Thin Suspense wrapper, mirror `app/fabrication/material-check/page.tsx`:

```tsx
"use client"
import { Suspense } from "react"
import { QCReleaseView } from "@/components/fabrication/qc-release-view"

export default function QCReleasePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <QCReleaseView />
    </Suspense>
  )
}
```

---

## 5. List view — `components/fabrication/qc-release-view.tsx` (new)

Layout mirrors `material-check-view.tsx` post-G1.1 (internal status chips, NOT stage chips).

- **Header**: `QC Release` · subtitle *"Final dimensional and documentary inspection before paint handoff"*.
- **Status chips** with counts: `All / Awaiting Release / Released`. Default `Awaiting Release` — that is the QC engineer's actionable bucket. URL: `?status=Awaiting|Released`; absence → `Awaiting`.
  - `Awaiting Release` = spools whose current `fabStage === "Fabricated"`.
  - `Released` = spools whose current `fabStage === "QC Release"`.
  - `All` = union of the two buckets above. **The screen never lists spools at other stages** (Material Check, Weld Progress, Painted, Laydown, Not Started) — those have their own home in G2/G4/G5.
- **Search input**: matches `spoolNo`. (No heat-number search — that's a Material Check concern.)
- **Table** columns:
  | Column | Content |
  | --- | --- |
  | Spool No | mono |
  | Stage | StagePill (Fabricated = emerald, QC Release = violet, from `STAGE_COLOR`) |
  | Checklist progress | derived `"P/4 passed · R remark"` (P = Pass + Pass-with-remark, R = Pass-with-remark count). When no record: `"0/4"`. |
  | Inspector | from `record.inspector` or `—` |
  | Released | from `record.signedOffDate` via `RelativeDate` helper (client-only mounted; reuse the helper from `material-check-view.tsx` either by extraction into `components/fabrication/_shared.tsx` or by duplicating — duplication is fine for ~10 LOC) |
  | (empty header) — row click opens detail panel |
- **Click row** → `?spool=PL-XXX` (preserves `?status`).
- **Empty state**:
  - `Awaiting Release`: *"No spools awaiting QC release."*
  - `Released`: *"No spools released yet."*
  - `All`: *"No Fabricated or Released spools."*

Mount `<QCReleaseDetailPanel spoolNo={?spool} open={!!?spool} onOpenChange={...} />` at the end (same pattern as MC view).

---

## 6. Detail panel — `components/fabrication/qc-release-detail-panel.tsx` (new)

Right-side `Sheet` `sm:max-w-[640px]`. Layout mirrors `material-check-detail-panel.tsx`.

- **Header**: spool number (mono) + StagePill of current stage + subhead `"P pending · Q passed · R with remark"`.
- **Body**: one section per `QC_CHECKLIST` item, in order. Each section:
  - Item label (font-semibold) + description (text-xs slate-500).
  - **Segmented control**: `Pending` / `Pass` / `Pass with remark`.
  - If status === `Pass with remark`: `Textarea` (required), helper text *"Remark visible in audit trail"*. Inline red helper on submit attempt when empty.
- **Footer**:
  - Inspector dropdown (`QC_INSPECTORS` from `spool-data.ts`).
  - `Save draft` — 700 ms artificial delay → upsert every entry → toast `"Draft saved"`. No stage change.
  - `Sign off` — disabled when:
    - any entry is `Pending`, OR
    - any `Pass with remark` entry has an empty remark.
    Red helper text under the footer when disabled, same pattern as MC panel (`"Resolve all checklist items before sign-off."` / `"Add a remark for every Pass-with-remark entry."`).
  - On click: 700 ms delay → `upsertEntry` for each entry → `signOffQCRelease(spoolNo, inspector)` → close panel → toast `"QC Release signed for ${spoolNo}"` → home notification (severity `info`):
    ```ts
    pushNotification({
      severity: "info",
      category: "weld_progress",
      title: `${spoolNo}: QC Release complete`,
      description: `Advanced to Released by ${inspector}`,
      href: "/fabrication/qc-release",
    })
    ```
  - After sign-off: `router.replace("/fabrication/qc-release?status=Awaiting")` so the user lands on the bucket they were working through (now one shorter).

Existing record handling: when the panel mounts and the store record is `undefined`, build a transient `form` initialized with the 4 `Pending` entries. Patches go into local state until Save Draft / Sign off pushes them through `upsertEntry`. Mirror the `useEffect` deep-clone pattern from the MC panel.

---

## 7. Funnel update — `components/fabrication-dashboard.tsx`

Extend the G1.1 `STAGE_SCREENS` map:

```ts
const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check",
  "Weld Progress":  "/fabrication/weld-progress",
  "Fabricated":     "/fabrication/qc-release",  // NEW — workspace for Fabricated spools
  "QC Release":     "/fabrication/qc-release",  // NEW
}
```

Both tiles link to the same screen — its internal chips disambiguate (`Awaiting Release` vs `Released`). No additional `?status=` param in the funnel href — the screen's own default (`Awaiting Release`) is what the user wants when they click either tile from the dashboard. The other tiles (`Sent to Paint`, `Painted`, `Laydown`, `Not Started`) stay non-clickable per G1.1.

---

## 8. Sidebar nav — `config/navigation.ts`

Insert under the Fabrication group, **between** `Material Check` and `Weld Progress`:

```ts
{
  title: "QC Release",
  href: "/fabrication/qc-release",
  icon: ShieldCheck,  // import from lucide-react
}
```

Same role visibility as Material Check (inherited from the section's `roles` array — no changes needed). Add the `ShieldCheck` import next to `ClipboardCheck`.

---

## 9. Constraints

1. No new npm dependencies.
2. New persisted store key `"pipeqc-qc-release"`, version `1`. Do not bump existing store versions.
3. Demo cadence: 600–800 ms artificial delay before every mutation (Save Draft and Sign off).
4. **No changes** to `store/welds-store.ts`, `store/batches-store.ts`, `store/erection-store.ts`, `store/testpack-store.ts`, `store/spools-store.ts`. Read-only access only via existing hooks.
5. **No changes** to `components/fabrication/material-check-*.tsx` except possibly factoring out `RelativeDate` into `components/fabrication/_shared.tsx`. If that introduces noise, just duplicate the 12-line helper into the QC view.
6. **No changes** to G1.1 funnel beyond the two new `STAGE_SCREENS` entries. Tiles for `Sent to Paint`, `Painted`, `Laydown`, `Not Started` remain non-clickable.
7. SSR-safe: relative dates client-only-mounted (`useEffect` for `formatDistanceToNow`), follow the `7fda1c9` pattern.
8. `Reset Demo` restores the QC release seed exactly — including the 2 pre-released spools and the Pass-with-remark anchor.
9. Don't preempt Paint or Laydown: no new entries in `STAGE_SCREENS` for stages 6/7/8, no new sidebar items, no new stores for those stages.
10. Don't widen the QC Release screen into a "post-weld universal list" — it's strictly the Fabricated + QC Release buckets.

---

## 10. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Sidebar shows `QC Release` under Fabrication, between `Material Check` and `Weld Progress`. Icon `ShieldCheck`. Click → `/fabrication/qc-release` loads, default chip `Awaiting Release` active.
2. List renders the Fabricated spools from seed (count matches the funnel `Fabricated` tile after Reset Demo). No console errors. No hydration warnings.
3. Click `Released` chip → URL `?status=Released`. Shows exactly the 2 pre-released seed spools (`PL-TK100-002-A`, `PL-CW200-005-A`).
4. Click `PL-TK100-001-A` (the Pass-with-remark anchor — currently under `Released` because it has `signedOffDate`). Detail panel opens. The Dimensional entry is `Pass with remark` with the seed remark visible. The other 3 entries are `Pass`.
5. Close panel. Click `Awaiting Release` chip. Pick any Fabricated spool with no record (e.g. `PL-TK100-001-B`). Detail panel opens; all 4 entries are `Pending`. `Sign off` disabled with helper text *"Resolve all checklist items before sign-off."*
6. Click `Pass` on each of the 4 entries. `Sign off` enables.
7. Set Dimensional to `Pass with remark` but leave remark empty. `Sign off` disables; red helper *"Add a remark for every Pass-with-remark entry."*
8. Fill remark `"Test remark"`. `Sign off` re-enables. Click. ~700 ms delay → panel closes → toast `"QC Release signed for PL-TK100-001-B"` → home notification *"PL-TK100-001-B: QC Release complete — Advanced to Released by QC-ENG-01"* (or whichever inspector was picked).
9. After sign-off, URL is `/fabrication/qc-release?status=Awaiting`. Chip count `Awaiting Release` decreased by 1; `Released` increased by 1.
10. `/fabrication/dashboard` funnel: `Fabricated` count − 1, `QC Release` count + 1. Funnel tile counts still sum to the total distinct `spoolNo` count.
11. Click `Fabricated` tile → `/fabrication/qc-release` (default chip `Awaiting Release`). Click `QC Release` tile → also `/fabrication/qc-release` (chip stays at `Awaiting Release`; user clicks the `Released` chip themselves).
12. **Save Draft flow**: open `PL-FU300-007-A` (a Fabricated spool with no record). Set 2 entries to `Pass`. Click `Save draft` → toast `"Draft saved"` → panel stays open → close → reopen the same spool → 2 `Pass` entries persist, 2 still `Pending`, `signedOffDate` empty, spool still at `Awaiting Release`. Refresh page → still persisted.
13. **Reset Demo** from top nav → all QC-release state returns to seed. 2 pre-released spools back, Pass-with-remark anchor intact on `PL-TK100-001-A`, the spool from step 8 returns to `Awaiting Release` with no record.

### Regression

14. `/fabrication/material-check` — G2 demo flow + G1.1 MC-status chips still work end-to-end. Open `PL-CW200-003-A`, add NC remark, clear another piece, sign off — toast + notification fire as in G2; spool flips to `Weld Progress`.
15. `/fabrication/weld-progress` — no stage chip; `?spool=PL-CW200-006-A` still renders the spool chip (E2.3 regression).
16. `/erection/dashboard`, `/nde`, `/tracking`, `/testpack/*` untouched.
17. `/home` — E2.5 ISO-welded notification still fires when all welds on `ISO-1001` are completed.
18. Sidebar nav for other roles unchanged (e.g. `nde_inspector` sees the same items as today plus the new `QC Release` per role policy — confirm visibility matches `Material Check`).

### Build

19. `npx tsc --noEmit` clean.
20. `npm run build` clean — no Suspense or `useSearchParams` warnings.
21. No hydration warnings after 3 hard refreshes.

---

## 11. Definition of done

- **New files**:
  - `lib/spool-data.ts` additions: types + `QC_CHECKLIST` + `QC_RELEASE_SEED` + widened `deriveFabStage`.
  - `store/qc-release-store.ts` — persisted store + selectors.
  - `app/fabrication/qc-release/page.tsx` — thin Suspense + view mount.
  - `components/fabrication/qc-release-view.tsx` — list view.
  - `components/fabrication/qc-release-detail-panel.tsx` — detail Sheet.
- **Modified files**:
  - `store/spool-stage.ts` — subscribe to QC store, pass `qcRecord` into `deriveFabStage`, add `useQCReleaseRecord`.
  - `store/demo-store.ts` — cascade `resetQCRelease()` into `resetAll()`.
  - `store/index.ts` — barrel re-export `useQCReleaseStore`, `useQCReleaseRecord`.
  - `components/fabrication-dashboard.tsx` — add `Fabricated` + `QC Release` entries to `STAGE_SCREENS`.
  - `config/navigation.ts` — add `QC Release` sidebar entry, import `ShieldCheck`.
  - `docs/PIPEQC_CONTEXT.md` — append merge-log entry for G3; bump §"Manual cross-reference" row §7 to say *"Fabrication module (§7) — Weld Progress + Dashboard funnel + Material Check + QC Release (G1+G2+G1.1+G3)"*.
  - `docs/tracks/track_list.md` §7 — note `G3 QC Release merged; G4 Paint next` and 4/7 stages live.
- All 21 acceptance criteria pass.
- PR description lists:
  - Which spool got the Pass-with-remark seed (recommend `PL-TK100-001-A`).
  - The Fabricated vs Released distribution on first render (sanity check the seed).
  - Whether `RelativeDate` was factored out or duplicated.

---

## 12. Manual self-check before reporting done

1. **Funnel-sums-to-total check**: distinct `spoolNo` count in `useWeldsStore` equals the sum of all funnel tile counts. If not, the new `useSpoolStages` subscription dropped a row.
2. **Reset Demo round-trip** (AC #13): the seed anchor on `PL-TK100-001-A` (Pass-with-remark on Dimensional) must come back exactly. If it doesn't, `resetQCRelease` is shallow-cloning.
3. **Stage transition check** (AC #9–10): sign off a spool and verify it leaves `Awaiting Release` and enters `Released` without a refresh, AND the funnel updates live.
4. **Don't touch material-check screen**: `git diff --stat components/fabrication/material-check-view.tsx components/fabrication/material-check-detail-panel.tsx` should be 0 (or only show the `RelativeDate` extraction if you chose to factor it out).
5. **Size sanity**: 350–500 LOC net delta. Under 250 → you skipped the detail panel or the seed. Over 700 → you preempted Paint/Laydown or rewrote the funnel beyond the two `STAGE_SCREENS` entries.
6. **`grep -rn "Sent to Paint\|Painted\|Laydown" components/fabrication/ store/ app/fabrication/ | grep -v spool-data.ts`** returns 0 matches — those stages remain enum-only.

Report files created/modified, the seed distribution on first render, the LOC delta, and any acceptance step you could not verify in-browser (flag honestly if running terminal-only).
