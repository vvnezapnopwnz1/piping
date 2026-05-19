# Task: PipeQC Track I, Phase I8 — Field Flange Bolt Progress (§19.2 torque assign + record)

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track_list.md`, and `docs/manual_testing/manual_i2.md` (rows 166 + 200–209) first. Track I phases **I1–I7** are merged or in working tree (I2 = To Site, I3 = Erected, I4 = Welded/Bolted, I5 = Supported, I6 = RFT, I7 = Field Material Check). I7 (data + store + stage gate) is the **hard prerequisite** — I8 reuses the same rollup hook (`store/erection-rollup.ts`) and the same per-field-joint discipline.

I8 is the eighth and final pre-rework slice of Track I. After I8 the eight stages of Easy Piping §12 + §19.2 are all visible end-to-end in PipeQC; anything stage-level that's still off (e.g. gating I4 on torque verification, surfacing flange progress in the funnel as a separate stage, or hooking it into RFT prerequisites) is deliberately deferred to **I9 — "Erection module manual reconciliation"** so that I8 ships cleanly without retroactive changes to I4 / I6 seeds.

This slice does one thing: **stand up `/erection/flange-progress` — a field-joint-level workflow that captures torque assignment, bolt-up execution, and torque verification per the Easy Piping §19.2.1 manual** for the flange-bolt field joints already present in `lib/erection-weld-data.ts` (`fieldJointType === "Flange Bolt"`). No mutations to existing stage derivation, no changes to the funnel layout, no changes to I4 / I5 / I6 gates. **Lens-only overlay.**

Size: **~0.4 day**; ~350–450 LOC across 1 new persisted store + 4 new files + small edits to `erection-rollup.ts`, `erection-dashboard.tsx`, `welded-bolted-detail-panel.tsx`, `navigation.ts`, `demo-store.ts`, `store/index.ts`.

---

## Why this slice exists (manual + demo narrative)

Easy Piping §19.2.1 "Bolted joint installation" mandates that for every flange-bolt joint in the field:

1. A **target torque value** (Nm) and **bolting method** (Manual / Hydraulic Wrench / Pneumatic) are assigned in advance by QC.
2. **Execution** is recorded: bolt-up date, jointer code, tag number, report number.
3. **Independent verification** is signed off by a QC inspector with the torque tool ID logged for traceability.

Today PipeQC has flange-bolt joints in `FIELD_WELD_DATA` carrying `fieldJointType: "Flange Bolt"` and an `erectionStatus` already at `"Bolted"` for several of them — but there is **no audit trail behind the "Bolted" state**: no torque value, no torque tool, no inspector, no W-form. The Welded/Bolted screen (I4) merely counts `boltedJointCount`, treating the seed status as proof.

I8 closes that gap. After I8 the demo can answer: *"For the flange bolts on `PL-TK100-003-A` that are already at `Bolted` in the seed — were they actually torqued to spec, and by whom?"* Today: silence. After I8: assigned 540 Nm hydraulic, bolted-up by JTR-04 on 2025-05-17 (W-19-2025-0211), verified by QC-ENG-02 with tool TT-09.

> *Anna opens `/erection/flange-progress`, switches to `Awaiting Torque` chip → picks `FJ-2007` (`PL-FU300-007-A`) → assigns target 480 Nm + Hydraulic Wrench + records "QC-ENG-01" as the assigner. Switches to `Torque Assigned` → same joint surfaces → records bolt-up: jointer `JTR-04`, tag `TAG-FJ2007`, report `BR-19-2025-0207`. Switches to `Bolted` → verifies with `QC-ENG-02` + tool `TT-09`. Joint flips to `Verified`. Home notification fires for Hassan: "FJ-2007 torque verified — PL-FU300-007-A bolt-up audited."*

This is the answer to the recurring manual-walkthrough question: *"do you record torque values per bolt joint?"* Today: no. Post-I8: yes, with full audit trail.

**Out of scope for I8 (deliberately deferred to I9):**

- Gating I4 `Welded/Bolted` "Ready to Confirm" on every flange-bolt being `Verified`. Today's I4 seed has bolted joints without torque records — flipping the gate now would break the `WELDED_BOLTED_SEED` (`PL-TK100-003-A` + `PL-CW200-005-A` + `PL-FU300-007-A` currently sit as Confirmed). I9 must (a) seed `FLANGE_BOLT_SEED` with matching verified records first, (b) widen I4 gate, (c) re-verify acceptance flow end-to-end.
- Inserting a new "Flange Torque" stage between Erected and Welded/Bolted in `SpoolErectionStage`. The manual treats torque as a sub-discipline of Welded/Bolted, not a separate funnel stage. If a future user-test demands a tile, defer to I9.
- Feeding flange-progress signal into RFT eligibility (`isSpoolRFTEligible`). I6 currently keys RFT off `supportedRecord` only; expanding the predicate is I9 work.
- Backfilling field-joint flange bolts into testpack-side `lib/flange-data.ts` / `/flange` browse. That is the **testpack** flange dataset — `FJ-XXX` IDs with `testpackId` keys — and lives under §19.2.2 (testpack bolting). I8 stays strictly on the erection side (`fj-XXX` IDs with `spoolNo` keys).

---

## Goal

1. **Data model** — extend `lib/erection-stage.ts` with `FlangeBoltProgressRecord`, `BoltingMethod`, `FlangeBoltStatus`, `FLANGE_BOLT_SEED`, plus a pure rollup `computeSpoolFlangeBoltRollup(spoolNo, fieldWelds, records)`.
2. **Persisted store** — new `store/flange-bolt-progress-store.ts` mirroring `store/field-material-check-store.ts`. Persist key `pipeqc-flange-bolt`, version `1`. Cascade `resetFlangeBoltProgress()` into `store/demo-store.ts:resetAll()`.
3. **Rollup hook** — extend `store/erection-rollup.ts` to subscribe to flange-bolt records and expose `useSpoolFlangeBoltRollup(spoolNo)` + `useFlangeBoltProgressByJoint(fieldJointId)`. Do NOT pass the new rollup into `deriveSpoolErectionStage`.
4. **New route** `/erection/flange-progress` — list + detail Sheet. Five chips: `All / Awaiting Torque / Torque Assigned / Bolted / Verified`. Internal status chips, not stage chips (G1.1 contract).
5. **Detail panel** — three-mode Sheet (`Assign` → `Record` → `Verify`) + `Done` read-only state.
6. **Dashboard KPI** — small card on `/erection/dashboard` under the funnel: *"Flange bolt verification — X / Y verified"* with link to `/erection/flange-progress`. Non-clickable when total is 0.
7. **Bridge (read-only)** — in `components/erection/welded-bolted-detail-panel.tsx` add a compact "Flange bolt audit" card showing assigned / bolted / verified counts for the spool's flange-bolt joints. Display only — does **not** affect the Confirm button.
8. **Sidebar nav** — insert `Flange Progress` after `Welded / Bolted` under the Erection group.

**Do not** touch `lib/flange-data.ts`, `store/flange-store.ts`, `app/flange/*`, `components/flange/*`. **Do not** alter `deriveSpoolErectionStage` or `ERECTION_STAGE_ORDER`. **Do not** alter the I4 Confirm gate. **Do not** change seeds for any other I-phase store.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/manual_testing/manual_i2.md` rows 200–209 | Track I phase plan that scoped I8 = §19.2 torque assign + record. |
| `lib/erection-stage.ts` (entire file) | Pattern for record types + seeds + rollup helpers (`FieldMaterialCheckRecord`, `computeSpoolFieldMCRollup`, `SUPPORT_SEED`). Mirror its conventions exactly. |
| `lib/erection-weld-data.ts` (`FIELD_WELD_DATA`) | Source of truth for which joints are flange bolts. Find every entry with `fieldJointType === "Flange Bolt"` — that is your I8 input set. Read their `id`, `jointNo`, `spoolNo`, `diaInch`, `materialType`, `areaZone`, `erectionStatus`. |
| `store/field-material-check-store.ts` | Reference shape for `flange-bolt-progress-store.ts` — persist middleware, seed clone, per-joint getter, `resetX()` cascade target. |
| `store/erection-rollup.ts` | Where the new selector lands. **Do not** widen `deriveSpoolErectionStage` here — only add the new `useSpoolFlangeBoltRollup` / `useFlangeBoltProgressByJoint` hooks. |
| `components/erection/welded-bolted-detail-panel.tsx` | Pattern for the bridge card + the existing `boltedJointCount` count surface. Mirror density. |
| `components/erection/supported-detail-panel.tsx` | Pattern for an editable items table inside the Sheet (per-row inline action + 200 ms toast cadence). I8 reuses the same row-action shape. |
| `components/erection/rft-view.tsx` | List-view pattern with chips + URL sync + search + side panel. |
| `components/erection-dashboard.tsx` (lines 260–346) | Funnel layout. I8 does **not** add a tile; it adds an aux KPI card below the funnel. Find the empty slot under `<div className="grid grid-cols-2 ... xl:grid-cols-6">`. |
| `config/navigation.ts` (Erection group) | Sidebar insertion point, right after `Welded / Bolted`. |
| `store/notifications-store.ts` | `pushNotification` signature for the verification event. |
| `store/demo-store.ts` | Reset cascade — add `resetFlangeBoltProgress()` after the existing erection reset calls. |

---

## 1. Data model — extend `lib/erection-stage.ts`

Append below `FIELD_MC_SEED` (do NOT touch existing types):

```ts
// ---------------------------------------------------------------------------
// Field Flange Bolt Progress data model (I8) — Easy Piping §19.2.1
// ---------------------------------------------------------------------------

export type BoltingMethod = "Manual" | "Hydraulic Wrench" | "Pneumatic"

export const BOLTING_METHODS: BoltingMethod[] = [
  "Manual",
  "Hydraulic Wrench",
  "Pneumatic",
]

export const TORQUE_TOOLS = [
  "TT-01",
  "TT-04",
  "TT-09",
  "TT-12",
] as const
export type TorqueTool = (typeof TORQUE_TOOLS)[number]

export type FlangeBoltStatus =
  | "Awaiting Torque"
  | "Torque Assigned"
  | "Bolted"
  | "Verified"

export interface FlangeBoltProgressRecord {
  fieldJointId: string         // FK → FIELD_WELD_DATA.id (only when fieldJointType === "Flange Bolt")
  spoolNo: string              // denormalised — must equal the field-weld's spoolNo

  // §19.2.1 step 1: torque assignment
  targetTorqueNm?: number
  boltingMethod?: BoltingMethod
  assignedBy?: string          // from QC_INSPECTORS
  assignedDate?: string        // ISO date

  // §19.2.1 step 2: execution
  boltedDate?: string          // ISO date
  jointer?: string             // free text (jointer code, e.g. "JTR-04")
  tagNo?: string               // free text (e.g. "TAG-FJ2010")
  reportNo?: string            // free text (e.g. "BR-19-2025-0207")

  // §19.2.1 step 3: verification
  verifiedDate?: string        // ISO date
  verifiedBy?: string          // from QC_INSPECTORS
  torqueTool?: TorqueTool

  // free-text observations (visible in Done mode)
  remark?: string
}

export function deriveFlangeBoltStatus(
  record: FlangeBoltProgressRecord | undefined,
): FlangeBoltStatus {
  if (!record) return "Awaiting Torque"
  if (record.verifiedDate) return "Verified"
  if (record.boltedDate) return "Bolted"
  if (record.targetTorqueNm && record.boltingMethod && record.assignedBy) {
    return "Torque Assigned"
  }
  return "Awaiting Torque"
}

export interface SpoolFlangeBoltRollup {
  totalBolts: number
  assigned: number
  bolted: number
  verified: number
  allVerified: boolean
}

export function computeSpoolFlangeBoltRollup(
  spoolNo: string,
  fieldWelds: Pick<FieldWeldJoint, "spoolNo" | "id" | "fieldJointType">[],
  records: Pick<FlangeBoltProgressRecord, "fieldJointId" | "targetTorqueNm" | "boltingMethod" | "assignedBy" | "boltedDate" | "verifiedDate">[],
): SpoolFlangeBoltRollup {
  const flangeJoints = fieldWelds.filter(
    (w) => w.spoolNo === spoolNo && w.fieldJointType === "Flange Bolt",
  )
  const totalBolts = flangeJoints.length
  const jointIds = new Set(flangeJoints.map((j) => j.id))

  let assigned = 0
  let bolted = 0
  let verified = 0

  for (const record of records) {
    if (!jointIds.has(record.fieldJointId)) continue
    if (record.verifiedDate) {
      verified += 1
      bolted += 1
      assigned += 1
      continue
    }
    if (record.boltedDate) {
      bolted += 1
      assigned += 1
      continue
    }
    if (record.targetTorqueNm && record.boltingMethod && record.assignedBy) {
      assigned += 1
    }
  }

  const allVerified = totalBolts > 0 && verified === totalBolts

  return { totalBolts, assigned, bolted, verified, allVerified }
}
```

### Seed

Walk `FIELD_WELD_DATA`, list every `Flange Bolt` joint (today: `fj-2006`, `fj-2007`, `fj-2010`, `fj-2011`, possibly more — grep the file). For each:

- If its `erectionStatus` ∈ `{"Bolted", "Supported", "RFT"}` → seed a `Verified` record (full audit trail).
- If its `erectionStatus === "Welded"` (impossible for `Flange Bolt`, sanity check) → skip.
- Otherwise (e.g. `Not Started`, `To Site`, `Erected`) → seed at most one `Torque Assigned` record (no `boltedDate`) so the `Torque Assigned` chip lights up; leave the rest unseeded so the `Awaiting Torque` chip lights up on first render.

Aim for distribution **on first render**: ≥ 1 `Awaiting Torque` joint, ≥ 1 `Torque Assigned` joint, ≥ 1 `Bolted` joint (assigned + bolted but not verified — pick the most-advanced spool's bolt that isn't in `WELDED_BOLTED_SEED`), and ≥ 2 `Verified` joints. If the current seed naturally yields fewer than 1 of any bucket, force-seed one record to fill the gap (document this in the PR).

```ts
export const FLANGE_BOLT_SEED: FlangeBoltProgressRecord[] = [
  // Verified — matches the seeded "Bolted" erectionStatus on this joint
  {
    fieldJointId: "fj-2010",
    spoolNo: "PL-FU300-009-A",
    targetTorqueNm: 320,
    boltingMethod: "Hydraulic Wrench",
    assignedBy: "QC-ENG-01",
    assignedDate: "2025-05-14",
    boltedDate: "2025-05-15",
    jointer: "JTR-02",
    tagNo: "TAG-FJ2010",
    reportNo: "BR-19-2025-0210",
    verifiedDate: "2025-05-15",
    verifiedBy: "QC-ENG-02",
    torqueTool: "TT-09",
    remark: "Torque values recorded per §19.2.1.",
  },
  // Verified — second pre-bolted joint
  {
    fieldJointId: "fj-2011",
    spoolNo: "PL-TK100-003-A",
    targetTorqueNm: 540,
    boltingMethod: "Hydraulic Wrench",
    assignedBy: "QC-ENG-01",
    assignedDate: "2025-05-08",
    boltedDate: "2025-05-09",
    jointer: "JTR-04",
    tagNo: "TAG-FJ2011",
    reportNo: "BR-19-2025-0211",
    verifiedDate: "2025-05-09",
    verifiedBy: "QC-ENG-03",
    torqueTool: "TT-04",
    remark: "Cross-pattern torque-up, 4 passes.",
  },
  // Torque Assigned — but no bolt-up yet
  {
    fieldJointId: "fj-2007",
    spoolNo: "PL-FU300-007-A",
    targetTorqueNm: 480,
    boltingMethod: "Hydraulic Wrench",
    assignedBy: "QC-ENG-01",
    assignedDate: "2025-05-17",
  },
  // Awaiting Torque is implicit — no record needed for fj-2006 etc.
]
```

**If your grep of `FIELD_WELD_DATA` finds a Flange Bolt joint that does NOT appear above**, leave it unseeded — the `Awaiting Torque` chip needs candidates. Confirm in the PR description the joint IDs and their starting buckets.

---

## 2. Store — `store/flange-bolt-progress-store.ts` (new)

Mirror `store/field-material-check-store.ts`:

```ts
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  FLANGE_BOLT_SEED,
  type FlangeBoltProgressRecord,
  type BoltingMethod,
  type TorqueTool,
} from "@/lib/erection-stage"

interface FlangeBoltProgressState {
  records: FlangeBoltProgressRecord[]

  getRecord: (fieldJointId: string) => FlangeBoltProgressRecord | undefined
  getRecordsBySpool: (spoolNo: string) => FlangeBoltProgressRecord[]

  assignTorque: (args: {
    fieldJointId: string
    spoolNo: string
    targetTorqueNm: number
    boltingMethod: BoltingMethod
    assignedBy: string
  }) => void

  recordBoltUp: (args: {
    fieldJointId: string
    jointer: string
    tagNo: string
    reportNo: string
  }) => void

  verifyTorque: (args: {
    fieldJointId: string
    verifiedBy: string
    torqueTool: TorqueTool
    remark?: string
  }) => void

  resetFlangeBoltProgress: () => void
}
```

Behaviours:

- `assignTorque` upserts a record. If a record already exists for that `fieldJointId`, **only** patch `targetTorqueNm`, `boltingMethod`, `assignedBy`, `assignedDate`. Never overwrite `boltedDate` or `verifiedDate`. (Re-assign is allowed before bolt-up; locked after.)
- `recordBoltUp` requires `targetTorqueNm` + `boltingMethod` set on the existing record. Patches `boltedDate = today`, `jointer`, `tagNo`, `reportNo`. No-op if record missing or already has `boltedDate` (UI gates this; defensive).
- `verifyTorque` requires `boltedDate` set. Patches `verifiedDate = today`, `verifiedBy`, `torqueTool`, optionally `remark`. No-op if record missing or already has `verifiedDate`. After this mutation, push the home notification (see §5 below); the store does NOT push the notification itself — that's the panel's job, to keep the store pure.
- `resetFlangeBoltProgress` re-seeds from `JSON.parse(JSON.stringify(FLANGE_BOLT_SEED))`. Persist key `"pipeqc-flange-bolt"`, version `1`.

Wire `useFlangeBoltProgressStore.getState().resetFlangeBoltProgress()` into `store/demo-store.ts:resetAll()` immediately after `resetFieldMaterialCheck()` (or whatever the existing last erection-side reset is — read the file).

Barrel re-export from `store/index.ts`:

```ts
export { useFlangeBoltProgressStore } from "./flange-bolt-progress-store"
export { useSpoolFlangeBoltRollup, useFlangeBoltProgressByJoint } from "./erection-rollup"
```

---

## 3. Rollup hook — extend `store/erection-rollup.ts`

Subscribe to flange-bolt records in the existing module (alongside `mcRecords`):

```ts
import { useFlangeBoltProgressStore } from "@/store/flange-bolt-progress-store"
import {
  computeSpoolFlangeBoltRollup,
  type SpoolFlangeBoltRollup,
} from "@/lib/erection-stage"

export function useSpoolFlangeBoltRollup(spoolNo: string): SpoolFlangeBoltRollup {
  const records = useFlangeBoltProgressStore((state) => state.records)
  return computeSpoolFlangeBoltRollup(spoolNo, FIELD_WELD_DATA, records)
}

export function useFlangeBoltProgressByJoint(fieldJointId: string) {
  return useFlangeBoltProgressStore((state) => state.getRecord(fieldJointId))
}
```

**Critical**: do **not** add `useFlangeBoltProgressStore.records` to the existing `deriveSpoolErectionStage` call site. The stage map remains a pure function of `fieldWelds + toSite + erected + weldedBolted + supported + rft + mcRollup`. I8 is a parallel lens; widening the stage derivation is **I9**.

Add an aggregate selector for the dashboard KPI:

```ts
export function useFleetFlangeBoltCounts(): { total: number; assigned: number; bolted: number; verified: number } {
  const records = useFlangeBoltProgressStore((state) => state.records)
  const allFlangeJoints = FIELD_WELD_DATA.filter((w) => w.fieldJointType === "Flange Bolt")
  const total = allFlangeJoints.length
  const validJointIds = new Set(allFlangeJoints.map((j) => j.id))

  let assigned = 0, bolted = 0, verified = 0
  for (const r of records) {
    if (!validJointIds.has(r.fieldJointId)) continue
    if (r.verifiedDate) { verified++; bolted++; assigned++; continue }
    if (r.boltedDate)   { bolted++; assigned++; continue }
    if (r.targetTorqueNm && r.boltingMethod && r.assignedBy) assigned++
  }
  return { total, assigned, bolted, verified }
}
```

---

## 4. Page — `app/erection/flange-progress/page.tsx` (new)

Thin Suspense wrapper, mirror `app/erection/rft/page.tsx`:

```tsx
"use client"
import { Suspense } from "react"
import { FlangeProgressView } from "@/components/erection/flange-progress-view"

export default function FlangeProgressPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <FlangeProgressView />
    </Suspense>
  )
}
```

---

## 5. List view — `components/erection/flange-progress-view.tsx` (new)

Layout mirrors `components/erection/rft-view.tsx` (chips + search + URL sync + side panel).

- **Header**: `Flange Bolt Progress` · subtitle *"§19.2.1 — torque assignment, bolt-up, and verification per field joint"*.
- **Status chips** with counts: `All / Awaiting Torque / Torque Assigned / Bolted / Verified`. Default `Awaiting Torque`. URL: `?status=Awaiting|Assigned|Bolted|Verified|All`; absence → `Awaiting`.
- **Source rows**: every `FIELD_WELD_DATA` entry with `fieldJointType === "Flange Bolt"`. Joint status = `deriveFlangeBoltStatus(record)` against the persisted store. Filter by chip.
- **Search input**: matches `jointNo`, `spoolNo`, `areaZone`. Plain `.toLowerCase().includes`.
- **Table** columns (one shared header, conditional cells):
  | Column | Awaiting | Assigned | Bolted | Verified |
  | --- | --- | --- | --- | --- |
  | Joint No | ✅ mono | ✅ | ✅ | ✅ |
  | Spool No | ✅ | ✅ | ✅ | ✅ |
  | Area Zone | ✅ | ✅ | ✅ | ✅ |
  | Dia / Material | ✅ | ✅ | ✅ | ✅ |
  | Torque (Nm) | — | record.targetTorqueNm | record.targetTorqueNm | record.targetTorqueNm |
  | Method | — | record.boltingMethod | record.boltingMethod | record.boltingMethod |
  | Bolted | — | — | RelativeDate(record.boltedDate) | RelativeDate(record.boltedDate) |
  | Verified | — | — | — | RelativeDate(record.verifiedDate) |
  | Status pill | derived | derived | derived | derived |
- **Click row** → `?joint=fj-2007` (preserves `?status`).
- **Empty state**:
  - `Awaiting Torque`: *"No flange bolts awaiting torque assignment."*
  - `Torque Assigned`: *"No flange bolts in bolt-up queue."*
  - `Bolted`: *"No flange bolts awaiting verification."*
  - `Verified`: *"No verified flange bolts yet."*
  - `All`: *"No flange-bolt field joints in the seed."*

Mount `<FlangeProgressDetailPanel fieldJointId={?joint} open={!!?joint} onOpenChange={...} />` at the end.

---

## 6. Detail panel — `components/erection/flange-progress-detail-panel.tsx` (new)

Right-side `Sheet` `sm:max-w-[640px]`. Four modes (derived from `deriveFlangeBoltStatus(record)`):

- **Header**: joint number (mono) + spool number (muted) + status pill matching chip colour.
- **Bridge card (always visible)**: read-only summary of the underlying field-weld — `Dia`, `Material`, `Area Zone`, `WPS`, `erectionStatus` from `FIELD_WELD_DATA`. This is the only place we surface `FIELD_WELD_DATA` to the user in I8.

### Mode A — Assign mode (`"Awaiting Torque"` or partial assignment)

- **Target torque (Nm)** — number input, integer 50–2000, step 10. Required.
- **Bolting method** — `Select` over `BOLTING_METHODS`. Required.
- **Assigned by** — `Select` over `QC_INSPECTORS`. Required.
- Footer button `Assign torque`. Disabled until all three fields set; helper *"Set torque, method, and assigner."*
- On click: 600–800 ms artificial delay → `useFlangeBoltProgressStore.getState().assignTorque({...})` → toast `"${jointNo} torque assigned at ${target} Nm"`. **No notification** at this step. Panel switches to Record mode (don't close).

### Mode B — Record mode (`"Torque Assigned"`)

- Read-only summary card: *"540 Nm · Hydraulic Wrench · assigned by QC-ENG-01 on 2025-05-08"*.
- **Bolt-up date** — date input, default today. Required (cannot be in the future).
- **Jointer** — free-text input, max 16 chars. Required (suggest *"JTR-XX"* placeholder).
- **Tag No** — free-text input, max 24 chars. Required.
- **Report No** — free-text input, max 24 chars. Required.
- Footer button `Record bolt-up`. Disabled until all four fields valid; helper text mirrors missing field.
- On click: 600–800 ms delay → `recordBoltUp({...})` → toast `"${jointNo} bolt-up recorded"` → panel switches to Verify mode.

### Mode C — Verify mode (`"Bolted"`)

- Read-only summary cards: torque + bolt-up.
- **Verified by** — `Select` over `QC_INSPECTORS`. Required.
- **Torque tool** — `Select` over `TORQUE_TOOLS`. Required.
- **Remark** — `Textarea`, optional, max 240 chars.
- Footer button `Verify torque`. Disabled until verifier + tool set.
- On click: 600–800 ms delay → `verifyTorque({...})` → toast `"${jointNo} torque verified"` → **panel closes** → home notification:

```ts
pushNotification({
  severity: "success",
  category: "erection",
  title: `${jointNo}: torque verified`,
  description: `${spoolNo} — ${target} Nm verified by ${verifiedBy} (${torqueTool})`,
  href: `/erection/flange-progress?status=Verified&joint=${fieldJointId}`,
})
```

After verify: `router.replace("/erection/flange-progress?status=Verified")`.

### Mode D — Done mode (`"Verified"`)

All three summary cards read-only. Footer shows muted summary: *"Verified 2025-05-15 by QC-ENG-02 (TT-09) — audit trail locked"*. Close button only. No re-edit affordance.

---

## 7. Dashboard KPI card — edit `components/erection-dashboard.tsx`

**Do NOT touch the funnel grid or its tiles.** Add a single new aux card **immediately below** the funnel grid (after the closing `</div>` of `<div className="grid grid-cols-2 ... xl:grid-cols-6">`):

```tsx
{(() => {
  const counts = useFleetFlangeBoltCounts()
  if (counts.total === 0) return null
  const pct = Math.round((counts.verified / counts.total) * 100)
  return (
    <Card
      className="mt-3 cursor-pointer border bg-white"
      onClick={() => router.push("/erection/flange-progress")}
      title="Open flange bolt progress"
    >
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Flange bolt verification (§19.2.1)
          </p>
          <p className="text-sm text-slate-800">
            <span className="text-2xl font-semibold text-slate-900">{counts.verified}</span>
            <span className="text-slate-500"> / {counts.total} verified</span>
            {counts.assigned - counts.verified > 0 && (
              <span className="ml-3 text-slate-500">
                · {counts.assigned - counts.bolted} assigned · {counts.bolted - counts.verified} bolted
              </span>
            )}
          </p>
        </div>
        <Badge variant="secondary" className="border-transparent bg-slate-100 text-slate-700">
          {pct}%
        </Badge>
      </CardContent>
    </Card>
  )
})()}
```

(Import `useFleetFlangeBoltCounts` from `@/store`.)

Constraint: when `total === 0`, render nothing. Do not bend the dashboard layout — this card lives in the same vertical column as the funnel grid.

---

## 8. Bridge card — edit `components/erection/welded-bolted-detail-panel.tsx`

Below the existing read-only joints rollup table, **above** the large weld/bolt counters, insert a compact "Flange bolt audit" card. Read-only. Subscribe via the rollup hook:

```tsx
const flangeRollup = useSpoolFlangeBoltRollup(spoolNo)

{flangeRollup.totalBolts > 0 && (
  <div className="rounded-md border bg-slate-50 p-3">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        Flange bolt audit (§19.2.1)
      </p>
      <Link
        href={`/erection/flange-progress?status=All&spool=${encodeURIComponent(spoolNo)}`}
        className="text-xs text-sky-600 hover:underline"
        // open in this tab; no _blank
      >
        Open audit →
      </Link>
    </div>
    <p className="mt-1 text-sm text-slate-800">
      <span className="font-semibold">{flangeRollup.verified}</span>
      <span className="text-slate-500"> / {flangeRollup.totalBolts} verified</span>
      <span className="ml-2 text-slate-500">
        · {flangeRollup.assigned} assigned · {flangeRollup.bolted} bolted
      </span>
    </p>
  </div>
)}
```

**Constraint**: this card does NOT gate the Confirm button. It is display-only. If `flangeRollup.allVerified === false` while the spool is at `"Ready to Confirm"` in I4, the Confirm button still works. The mismatch is *intentional* and surfaces in I9 as the gate widening.

The flange-progress list view should also accept `?spool=PL-XXX` and pre-filter the table — add a one-line read of `searchParams.get("spool")` in `flange-progress-view.tsx` and `.filter((row) => !spoolFilter || row.spoolNo === spoolFilter)`. When present, render a small clearable chip above the table mirroring the E2.3 pattern.

---

## 9. Sidebar nav — `config/navigation.ts`

Insert under the Erection group, **immediately after** `Welded / Bolted` and **before** `Supported`:

```ts
{
  title: 'Flange Progress',
  href: '/erection/flange-progress',
  icon: Bolt,  // import from lucide-react
},
```

Same role visibility as `Welded / Bolted`. Add `Bolt` to the existing lucide import line.

---

## 10. Constraints

1. No new npm dependencies.
2. New persisted store key `"pipeqc-flange-bolt"`, version `1`. Do not bump existing store versions.
3. Demo cadence: 600–800 ms artificial delay before every mutation (Assign / Record / Verify).
4. **No changes** to `lib/flange-data.ts`, `store/flange-store.ts`, `app/flange/page.tsx`, `components/flange/*`. The testpack-side flange browse stays unchanged.
5. **No changes** to `lib/erection-weld-data.ts` (`FIELD_WELD_DATA` static seed remains). The Flange Bolt joint set is read-only input to I8.
6. **No changes** to `deriveSpoolErectionStage`, `ERECTION_STAGE_ORDER`, `ERECTION_STAGE_COLOR`, or any other I-phase seed (`TO_SITE_SEED`, `ERECTED_SEED`, `WELDED_BOLTED_SEED`, `SUPPORTED_SEED`, `RFT_SEED`, `FIELD_MC_SEED`, `SUPPORT_SEED`).
7. **No changes** to the I4 Confirm gate. A spool can still pass `Ready to Confirm → Confirmed` even if its flange-bolt joints are not all `Verified`. That gate widening is **I9**.
8. **No new funnel tile**. Adding a stage to `ERECTION_STAGE_ORDER` is I9 territory.
9. SSR-safe: relative dates client-only-mounted (`useEffect` for `formatDistanceToNow`).
10. `Reset Demo` restores the flange-bolt seed exactly — same record distribution on first reset as on first cold load.
11. Don't preempt anything: I9 is the umbrella for any change that needs to touch existing seeds, the funnel, or stage derivation. Flag candidates in the PR description (see §13).

---

## 11. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Sidebar shows `Flange Progress` under Erection, between `Welded / Bolted` and `Supported`. Icon `Bolt`. Click → `/erection/flange-progress` loads, default chip `Awaiting Torque` active.
2. List renders every Flange Bolt joint in `FIELD_WELD_DATA` that has no record (per seed). Count matches `(all flange bolts) − (seeded records)`.
3. Click `Torque Assigned` chip → URL `?status=Assigned`. Shows exactly the seeded *assigned-but-not-bolted* joints (per the seed, that's at least `fj-2007`).
4. Click `Verified` chip → URL `?status=Verified`. Shows at least 2 joints (`fj-2010`, `fj-2011` per seed).
5. Click `Bolted` chip → URL `?status=Bolted`. Shows 0 joints from the seed (none seeded in this bucket). Empty state visible.
6. Click `All` → URL `?status=All`. Count equals total flange-bolt joints in `FIELD_WELD_DATA`.
7. **End-to-end flow A (Assign → Record → Verify)**: from the `Awaiting Torque` chip, pick any unseeded flange bolt (e.g. `fj-2006` if present). Panel opens in Assign mode.
8. Type 480 Nm + Hydraulic Wrench + QC-ENG-01. Helper clears. Click `Assign torque` → ~700 ms → toast → panel switches to Record mode (still open). URL unchanged. Chip counts update: `Awaiting Torque` −1, `Torque Assigned` +1.
9. In Record mode: type today + JTR-04 + TAG-TEST + BR-TEST. Click `Record bolt-up` → ~700 ms → toast → panel switches to Verify mode. Chip counts: `Torque Assigned` −1, `Bolted` +1.
10. In Verify mode: pick QC-ENG-02 + TT-09 + remark. Click `Verify torque` → ~700 ms → toast → **panel closes** → home notification fires with body `"…torque verified by QC-ENG-02 (TT-09)"` and `href=/erection/flange-progress?status=Verified&joint=fj-XXXX`. URL is now `/erection/flange-progress?status=Verified`. `Bolted` count −1, `Verified` count +1.
11. Click the newly-verified joint → panel re-opens in **Done mode**: all fields read-only, footer muted summary, no primary action.
12. **End-to-end flow B (re-assignment before bolt-up is allowed)**: pick a `Torque Assigned` joint (e.g. `fj-2007`). Panel opens with values pre-filled in Record mode summary. The Assign-mode form is **not** offered as a re-edit step (deliberate — re-assign happens by clearing the record). Confirm: there is no "Edit assignment" button visible in Record mode. Closing without action leaves the record unchanged.
13. **Dashboard KPI**: navigate to `/erection/dashboard`. Below the funnel grid, the new card reads e.g. *"Flange bolt verification (§19.2.1) — 3 / N verified · X assigned · Y bolted · 25%"*. Click → routes to `/erection/flange-progress`.
14. **Welded/Bolted bridge**: open `/erection/welded-bolted` → click any spool that has flange bolts (e.g. `PL-TK100-003-A`). In the detail panel, the new "Flange bolt audit" card shows the spool's flange-bolt rollup with an `Open audit →` link. Click → routes to `/erection/flange-progress?status=All&spool=PL-TK100-003-A`. List pre-filters to that spool; a clearable spool chip appears above the table.
15. **Critical regression guard — I4 Confirm still works**: from a spool with `flangeRollup.verified < flangeRollup.totalBolts`, the I4 Confirm button is still enabled when all field welds are at rank ≥ 3. The flange-bolt mismatch does NOT block Confirm. (This proves the bridge card is display-only.)
16. **Critical regression guard — funnel unchanged**: the Erection dashboard funnel still has exactly 7 tiles (Awaiting Release / To Site / Field Material Check / Erected / Welded/Bolted / Supported / RFT). No new tile, no count drift in any existing tile.
17. **Critical regression guard — testpack `/flange` unchanged**: visit `/flange` → the existing browse table renders the testpack flange joints (`FJ-001`, `FJ-002`, …) exactly as before. None of the new erection-side `fj-XXXX` joints appear here.
18. **Reset Demo** from top nav → all state returns to seed. Flange-bolt store back to seed distribution. The joint from step 7–10 returns to `Awaiting Torque`. Dashboard KPI card recomputes to seed values.

### Build

19. `npx tsc --noEmit` clean.
20. `npm run build` clean — no Suspense or `useSearchParams` warnings.
21. No hydration warnings after 3 hard refreshes.

---

## 12. Definition of done

- **New files**:
  - `lib/erection-stage.ts` additions: types + `BOLTING_METHODS` + `TORQUE_TOOLS` + `FLANGE_BOLT_SEED` + `deriveFlangeBoltStatus` + `computeSpoolFlangeBoltRollup` + `SpoolFlangeBoltRollup`.
  - `store/flange-bolt-progress-store.ts` — persisted store + mutations.
  - `app/erection/flange-progress/page.tsx` — thin Suspense + view mount.
  - `components/erection/flange-progress-view.tsx` — list view.
  - `components/erection/flange-progress-detail-panel.tsx` — detail Sheet (Assign / Record / Verify / Done modes).
- **Modified files**:
  - `store/erection-rollup.ts` — subscribe to flange-bolt store, expose `useSpoolFlangeBoltRollup`, `useFlangeBoltProgressByJoint`, `useFleetFlangeBoltCounts`. **No** widening of `deriveSpoolErectionStage` call site.
  - `store/demo-store.ts` — cascade `resetFlangeBoltProgress()` into `resetAll()`.
  - `store/index.ts` — barrel re-export.
  - `components/erection-dashboard.tsx` — add KPI card below the funnel grid. No other edits.
  - `components/erection/welded-bolted-detail-panel.tsx` — add the "Flange bolt audit" read-only card.
  - `config/navigation.ts` — add `Flange Progress` sidebar entry, import `Bolt`.
  - `docs/PIPEQC_CONTEXT.md` — append merge-log entry for I8; bump §"Manual cross-reference" row §19 to say *"§19.2.1 Field flange bolt progress (I8) — assign + record + verify per joint; gate-widening deferred to I9"*.
  - `docs/tracks/track_list.md` — note `I8 Flange progress merged; I9 = manual reconciliation`.
- All 21 acceptance criteria pass.
- PR description lists:
  - Exact list of `Flange Bolt` joint IDs in `FIELD_WELD_DATA` and their starting buckets (Awaiting / Assigned / Bolted / Verified) on first render.
  - Confirmation that I4 / I5 / I6 seeds are byte-identical to pre-I8 state (`git diff lib/erection-stage.ts` should only show appended exports + the new seed, no in-place edits to existing seeds).
  - I9 candidate list:
    1. Gate I4 `Ready to Confirm` on `flangeRollup.allVerified` (requires seeding `WELDED_BOLTED_SEED` ↔ `FLANGE_BOLT_SEED` consistency).
    2. Optionally add a "Flange Verification" sub-stage between Erected and Welded/Bolted in `ERECTION_STAGE_ORDER` (requires funnel/colour rework + a manual re-read of §12).
    3. Feed `flangeRollup.allVerified` into `isSpoolRFTEligible` (requires re-seeding `RFT_SEED` predecessors and re-running the I6 watcher dry-run).
    4. Backfill I7 UI — the Field Material Check screen is the matching peer of I8 and is currently data-only.

---

## 13. Manual self-check before reporting done

1. **Funnel-tile-count check** (AC #16): `git diff components/erection-dashboard.tsx` shows only the appended KPI card and the `useFleetFlangeBoltCounts` import — no edits to the `ERECTION_STAGE_ORDER.map(...)` block.
2. **Bridge is read-only** (AC #15): `git diff components/erection/welded-bolted-detail-panel.tsx` shows additions only; the Confirm button's `disabled` predicate is byte-identical to pre-I8.
3. **Reset Demo round-trip** (AC #18): seed distribution on first reset matches the count documented in the PR description.
4. **Joint coverage**: `grep -c 'fieldJointType: "Flange Bolt"' lib/erection-weld-data.ts` equals `useFleetFlangeBoltCounts().total` on first cold load.
5. **Stage derivation unchanged**: `grep -n 'flange\|Flange' lib/erection-stage.ts` shows the new exports only; `deriveSpoolErectionStage` body is byte-identical to pre-I8.
6. **Testpack `/flange` untouched** (AC #17): `git diff --stat lib/flange-data.ts store/flange-store.ts components/flange/ app/flange/` returns 0.
7. **Size sanity**: 350–450 LOC net delta. Under 250 → you skipped the bridge card or the KPI card. Over 600 → you over-scoped (no I4 gate widening, no funnel changes, no I9 features creeping in).
8. **No new top-level screens beyond `/erection/flange-progress`**: `git diff --stat app/` should show only the new `app/erection/flange-progress/` directory.
9. **Manual fidelity check**: re-read Easy Piping §19.2.1 from the user's reference docs (or `docs/manual_testing/manual_i2.md` row 200–204) — confirm the three-stage workflow (assign → record → verify) is what the manual mandates. If the manual prescribes additional steps (e.g. anti-seize log, washer count, gasket lot trace), flag them in the PR as **I9 candidates** rather than expanding I8.

Report files created/modified, the per-bucket joint distribution on first render, the LOC delta, the explicit list of I9 candidates surfaced during implementation, and any acceptance step you could not verify in-browser (flag honestly if running terminal-only).
