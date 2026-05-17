# Task: PipeQC Manual Alignment — P0/P1 fixes after Easy Piping audit

Read this prompt fully before editing code.

You are continuing PipeQC / Easy Piping work after a manual-vs-implementation audit. The goal is to fix the most misleading mismatches with `docs/marker-output/Easy Piping User Manual.md`, especially where the current app shows false readiness or mixes up domain concepts.

**Important scope exclusion:** do **not** implement or modify the Fabrication lifecycle slice for **QC Release, Sent to Paint, Painted, Final QC, Laydown**. That work is owned separately. In particular, avoid touching the Track G/G3 files unless a tiny import/type fix is unavoidable and explicitly justified.

Expected size: multi-slice implementation. Prefer small commits per task. Keep the demo polished but prioritize domain correctness over cosmetic breadth.

---

## 0. Current audit verdict

The previous audit and Claude Code verification agree on these facts:

1. `components/testpack/testpack-explorer.tsx` has Release Tracking gates 1-3 hardcoded green/zero:
   - "Welded joints to be welded"
   - "Flange joints to be bolted"
   - "Welded joints still to be NDE-tested"
2. `QC released for test` is currently calculated as `lineCheckRemaining === 0 && openXItems === 0`, which ignores NDE/PWHT and flange readiness.
3. Reinstatement currently uses `punchItems` category `Y`/`Z`, but the Easy Piping manual describes reinstatement of **flange joints** category `Y`/`Z`.
4. NDE batch management is simplified: no `Joint to Select`, no `Awaiting NDE`, no `Released`, no `S/SS/NR/T1/T2`, no tracer logic, no automatic batch allocation from NDE Matrix.
5. Spooling is a placeholder.
6. Flange Browse uses local component state over seed data and is not connected to Testpack Release Tracking.
7. `docs/PIPEQC_CONTEXT.md` is stale: Next/React versions and module status do not match current code.

The highest-risk issue is false readiness in Testpack Explorer. Fix that first.

---

## 1. Manual source of truth

Use the manual as the primary domain reference:

- `docs/marker-output/Easy Piping User Manual.md`

Key manual sections:

| Manual section | Topic | Why it matters |
| --- | --- | --- |
| §5 | Import Settings | Validation patterns for templates/reference data |
| §6 | Spooling | Source-of-truth import, Browse Latest/History, revision conflicts |
| §7 | Fabrication | Read only for context; do not implement the excluded lifecycle slice |
| §11 | NDE Management | Batch lifecycle, statuses, tracer logic |
| §12 | Erection | Field weld/spool status context |
| §14-18 | Testpack / Pressure Test / Explorer | Release Tracking gates and pressure-test flow |
| §19 | Flange Management | Bolting, progress, flange categories X/Y/Z, reinstatement |
| §20 | Testpack Reports | Report shell context only |

Recommended searches inside the manual:

```bash
rg -n "Release Tracking|Ready For Test|flange joints still to be bolted|NDE-tested|Reinstatement|Category Y|Category Z|Joint to Select|tracer|Browse Latest|Spooling" docs/marker-output/Easy\ Piping\ User\ Manual.md
```

---

## 2. Mandatory files to read first

Read these files before changing anything:

| File | Why |
| --- | --- |
| `docs/PIPEQC_CONTEXT.md` | Current project context, but stale in places; update after implementation |
| `docs/gpt_analysis.md` | Audit narrative and prioritization |
| `config/navigation.ts` | Current module surface and role visibility |
| `store/index.ts` | Store exports |
| `store/testpack-store.ts` | Pressure-test entities, line check, punch items, blinding/testing/reinstatement |
| `components/testpack/testpack-explorer.tsx` | Release Tracking UI and hardcoded gates |
| `store/welds-store.ts` | Shop welds, status, spool readiness |
| `store/batches-store.ts` | Current NDE batches/results |
| `store/erection-store.ts` | Field welds and field NDE send-out |
| `store/iso-rollup.ts` | Existing ISO rollup bridge; may already expose useful counts |
| `lib/flange-data.ts` | Current flange seed data/types |
| `components/flange/flange-browse.tsx` | Current local-state Browse screen |
| `components/flange/flange-detail-panel.tsx` | Flange detail/edit surface |
| `app/spooling/page.tsx` | Placeholder to replace with spooling shell |
| `package.json` | Actual stack versions for docs update |

Also inspect current git status. There may be uncommitted Fabrication QC Release work by the user. Do not overwrite it.

```bash
git status --short
```

---

## 3. Non-goals and guardrails

### Do not touch this scope

Do **not** implement:

- Fabrication QC Release screen
- Fabrication Sent to Paint
- Fabrication Painted
- Fabrication Final QC
- Fabrication Laydown
- Paint handoff workflows
- Laydown location workflows

Do **not** edit unless absolutely necessary:

- `components/fabrication-dashboard.tsx`
- `lib/spool-data.ts`
- `store/spool-stage.ts`
- `store/qc-release-store.ts`
- `components/fabrication/qc-release-*`
- `app/fabrication/qc-release/*`

If these files have user changes, leave them alone.

### Do not build a backend

This project is currently a local Next/Zustand demo. Keep the implementation in the existing style:

- TypeScript
- Next.js App Router
- React 19
- Zustand persisted stores
- Tailwind/shadcn-style components
- seed data in `lib/*`

### Do not overfit to production

The goal is not a full enterprise clone. The goal is to remove the most misleading demo inaccuracies and create credible manual-aligned workflows.

---

## 4. Architecture target

### Current problem

The app has useful demo data, but it is scattered:

- welds in `welds-store`
- field welds in `erection-store`
- NDE batches in `batches-store`
- testpack/ISO/punch/blinding/testing in `testpack-store`
- flange joints in local `useState` seed inside `FlangeBrowse`
- spooling placeholder

Release Tracking currently papers over missing integration by hardcoding green gates.

### Target architecture

Implement lightweight domain bridges instead of a major data migration:

1. `flange-store` becomes the shared source for flange joints.
2. `testpack-store` remains the source for ISO/testpack pressure-test progress.
3. A small derived selector layer computes Release Tracking gate metrics from existing stores:
   - shop welds
   - field welds
   - NDE batches
   - flange store
   - testpack line check / X items / blinding / testing / precomm
4. Reinstatement uses flange category `Y`/`Z`, not punch items.
5. Spooling becomes a credible shell with import validation/revision UI, but does not need to fully replace all seed data yet.
6. NDE gains manual vocabulary and tracer demo behavior without requiring a full algorithmic rebuild.

---

# Implementation Plan

## Task 1 — Add shared `flange-store` and stop using local-only flange state

### Goal

Make flange joints persistent and available to Testpack Explorer and Reinstatement. This is the prerequisite for fixing gates and replacing punch-item Y/Z reinstatement.

### Files

- Create: `store/flange-store.ts`
- Modify: `store/index.ts`
- Modify: `components/flange/flange-browse.tsx`
- Modify: `components/flange/flange-detail-panel.tsx`
- Read/possibly modify: `lib/flange-data.ts`
- Modify: `store/demo-store.ts` if there is a global reset pattern

### Requirements

1. Move runtime flange state from `useState(seedJoints)` into a persisted Zustand store.
2. Keep existing `FlangeBrowse` UI behavior and filters working.
3. Preserve existing detail panel edit behavior.
4. Add fields needed by Testpack/Reinstatement if missing:
   - `testpackId?: string`
   - `isoId?: string`
   - `category?: "X" | "Y" | "Z"`
   - `boltingStatus?: "Not Started" | "Bolted" | "Reinstatement Required" | "Reinstated"`
   - `jointDate?: string`
   - `reinstatedAt?: string`
   - `jointer?: string`
   - `reportNo?: string`
   - `tagNo?: string`
5. If current `FlangeJoint` uses different names, do not rename everything. Add compatibility helpers instead.

### Suggested store shape

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { flangeJoints as seedFlangeJoints, type FlangeJoint } from "@/lib/flange-data";

interface FlangeStore {
  joints: FlangeJoint[];
  updateJoint: (jointId: string, patch: Partial<FlangeJoint>) => void;
  markBolted: (jointId: string, payload: { jointDate: string; jointer: string; reportNo?: string }) => void;
  markReinstated: (jointId: string, payload: { reinstatedAt: string; jointer: string; reportNo?: string; tagNo?: string }) => void;
  resetFlanges: () => void;
}

const cloneSeed = () => structuredClone(seedFlangeJoints);

export const useFlangeStore = create<FlangeStore>()(
  persist(
    (set) => ({
      joints: cloneSeed(),
      updateJoint: (jointId, patch) =>
        set((state) => ({
          joints: state.joints.map((joint) =>
            joint.id === jointId ? { ...joint, ...patch } : joint,
          ),
        })),
      markBolted: (jointId, payload) =>
        set((state) => ({
          joints: state.joints.map((joint) =>
            joint.id === jointId
              ? { ...joint, boltingStatus: "Bolted", ...payload }
              : joint,
          ),
        })),
      markReinstated: (jointId, payload) =>
        set((state) => ({
          joints: state.joints.map((joint) =>
            joint.id === jointId
              ? { ...joint, boltingStatus: "Reinstated", ...payload }
              : joint,
          ),
        })),
      resetFlanges: () => set({ joints: cloneSeed() }),
    }),
    {
      name: "pipeqc-flanges",
      version: 1,
    },
  ),
);
```

Adapt field names to the actual `FlangeJoint` type.

### Acceptance checks

- Reloading the page preserves flange edits.
- `FlangeBrowse` no longer owns `seedJoints` in local `useState`.
- `store/index.ts` exports the flange store.
- Global demo reset, if present, resets flange state.
- `npm run lint` passes.

### Commit

```bash
git add store/flange-store.ts store/index.ts store/demo-store.ts components/flange lib/flange-data.ts
git commit -m "feat: persist flange joints in shared store"
```

If user has asked not to commit, skip commit and report changed files.

---

## Task 2 — Fix Testpack Release Tracking gates 1-3 and QC Release readiness

### Goal

Remove false green gates from Testpack Explorer. Release Tracking must reflect actual blockers from welds, flange joints, and NDE batches.

### Files

- Modify: `components/testpack/testpack-explorer.tsx`
- Possibly create: `lib/testpack-release-tracking.ts`
- Possibly modify: `store/iso-rollup.ts`
- Read: `store/welds-store.ts`
- Read: `store/erection-store.ts`
- Read: `store/batches-store.ts`
- Read: `store/flange-store.ts`
- Read: `store/testpack-store.ts`

### Manual alignment

Release Tracking must expose these concepts from manual §18.2:

1. welded joints still to be welded
2. flange joints still to be bolted
3. welded joints still to be NDE-tested
4. isometrics to complete / line check
5. category X items to clear
6. QC release
7. Ready For Test

### Implementation guidance

Prefer creating a small pure helper in `lib/testpack-release-tracking.ts` so the calculations are testable and the Explorer component stays readable.

Suggested types:

```ts
export interface ReleaseTrackingMetrics {
  jointsToBeWelded: number;
  flangeJointsToBeBolted: number;
  jointsAwaitingNde: number;
  isosToComplete: number;
  isosToReturnFromLineCheck: number;
  itemsCatXToClear: number;
  isosToQcRelease: number;
  isosReadyForTest: number;
  qcReleased: boolean;
  readyForTest: boolean;
}
```

Use available link fields where they exist:

- testpack contains `isoIds`
- welds usually contain ISO/spool references
- flange joints should now include or derive ISO/testpack references
- batches contain selected weld IDs and result statuses

If exact ISO linkage is imperfect in seed data, implement explicit demo mapping helpers instead of hardcoding all-green:

```ts
const TESTPACK_ISO_ALIASES: Record<string, string[]> = {
  TP001: ["ISO-100-001", "ISO-100-002"],
};
```

But first inspect existing seeds. Prefer real fields over aliases.

### Calculation rules

#### Welded joints still to be welded

Count shop/field welds linked to the testpack ISO set where welding is not complete.

Treat as incomplete if:

- status is not `"Completed"` / accepted equivalent
- or field weld root/cap requirements are incomplete, if field weld data has those fields

Do not include welds that are explicitly deleted/cancelled if such status exists.

#### Flange joints still to be bolted

Count flange joints linked to the testpack ISO set where:

- bolting status is not `"Bolted"` and not `"Reinstated"`
- and category is not only a post-test reinstatement marker

If the existing data distinguishes initial bolting vs reinstatement, use initial bolting for this gate.

#### Welded joints still to be NDE-tested

Count welds requiring NDE where no accepted/released NDE result exists.

Minimum demo rule:

- if weld has an accepted RT/UT/etc result, it is clear;
- if a batch contains the weld and its result is `"Accepted"`, it is clear;
- if a batch contains the weld and result is missing/rejected/rework, it is not clear;
- if weld has no batch/result and requires NDE, it is not clear.

Do not mark this gate green just because there are no batches.

#### QC released

`qcReleased` must be true only when:

- `jointsToBeWelded === 0`
- `flangeJointsToBeBolted === 0`
- `jointsAwaitingNde === 0`
- `isosToReturnFromLineCheck === 0`
- `itemsCatXToClear === 0`

If PWHT fields exist and indicate pending PWHT, include them in NDE/PWHT blockers.

#### Ready For Test

`readyForTest` must require `qcReleased` plus blinding eligibility/assignment/done, following the existing app concept.

### UI requirements

1. Gates 1-3 must no longer be hardcoded `metric: 0`.
2. Red/amber/green state must be based on calculated metrics.
3. Gate rows should navigate where useful:
   - welded blockers -> relevant weld progress screen, filtered if possible
   - flange blockers -> `/flange`
   - NDE blockers -> `/nde`
4. Badge text must not show "QC RELEASED" or "READY FOR TEST" while any upstream blocker remains.
5. If seed data has no link to compute a metric confidently, show amber with explanatory text rather than green.

### Acceptance checks

- In `testpack-explorer.tsx`, there is no `metric: 0, state: "green"` for gates 1-3.
- Changing a linked flange joint to unbolted changes the relevant gate.
- A testpack with pending NDE does not show `QC released for test`.
- A testpack with line check done and X cleared but pending NDE stays blocked.
- `npm run lint` passes.

### Suggested manual QA

1. Open `/testpack/explorer`.
2. Select a testpack that has line-check progress.
3. Verify gates 1-3 show actual nonzero blockers if seed data has pending weld/flange/NDE.
4. Open `/flange`, change a linked flange back to not bolted, return to Explorer.
5. Confirm the flange gate changes.
6. Open `/nde`, set/clear a result if current UI supports it, return to Explorer.
7. Confirm the NDE gate changes.

### Commit

```bash
git add components/testpack/testpack-explorer.tsx lib/testpack-release-tracking.ts store/iso-rollup.ts
git commit -m "fix: derive testpack release gates from live data"
```

Adjust file list to actual changes.

---

## Task 3 — Move Reinstatement from punch items Y/Z to flange joints Y/Z

### Goal

Align Reinstatement Preparation/Progress with manual §17.5: reinstatement is about flange joints category Y/Z after testing/pre-commissioning, not punch items.

### Files

- Modify: `store/testpack-store.ts`
- Modify: `components/testpack/pressure-test/reinstatement/*` or actual reinstatement components
- Modify/read: `store/flange-store.ts`
- Modify/read: `lib/flange-data.ts`
- Read: routes under `app/testpack/pressure-test/reinstatement/`

### Current incorrect behavior

`getReinstatementEligibleItems()` currently filters `punchItems` by category `Y`/`Z`.

Replace this concept with flange joints:

- Category `Y`: eligible after testing/hydrotest date exists
- Category `Z`: eligible after pre-commissioning date exists

### Requirements

1. Keep punch items category `X` for Item Clearance before test.
2. Stop using punch items category `Y`/`Z` as reinstatement source.
3. Add/select flange joint categories:
   - `X`: before test / must be resolved before Ready For Test if applicable
   - `Y`: after test, before pre-commissioning
   - `Z`: after pre-commissioning
4. Reinstatement Preparation must list eligible flange joints:
   - category `Y` if `testingDoneDate` exists and not reinstated
   - category `Z` if `preCommDate` exists and not reinstated
5. Reinstatement Progress must allow marking flange joints reinstated with:
   - date
   - jointer
   - report number
   - tag number when applicable
6. Testpack Explorer reinstatement remaining count must use open flange Y/Z reinstatements.

### Suggested helper names

In `store/flange-store.ts`:

```ts
getReinstatementEligibleJoints: (testpackId: string, phase: "after-test" | "after-precomm") => FlangeJoint[];
getOpenReinstatementCount: (testpackId: string, testingDone: boolean, preCommDone: boolean) => number;
```

If Zustand store does not currently use selector methods, pure helper functions in `lib/flange-reinstatement.ts` are also acceptable.

### UI copy

Use explicit labels so the demo teaches the correct domain:

- "Flange reinstatement"
- "Category Y — after test"
- "Category Z — after pre-commissioning"
- "Punch category X remains in Item Clearance"

Avoid wording that suggests Y/Z are punch items.

### Acceptance checks

- Searching `store/testpack-store.ts` should no longer show reinstatement eligibility based on `punchItems` Y/Z.
- Item Clearance still uses punch items category `X`.
- Reinstatement screens show flange joint IDs, not punch item IDs.
- Testpack Explorer "Reinstatement complete" gate changes when flange joints are marked reinstated.
- `npm run lint` passes.

### Commit

```bash
git add store/testpack-store.ts store/flange-store.ts lib/flange-data.ts components/testpack app/testpack
git commit -m "fix: base reinstatement on flange joints"
```

Adjust file list to actual changes.

---

## Task 4 — Add NDE manual vocabulary and tracer-demo behavior

### Goal

Make NDE management look and behave closer to manual §11 without rebuilding the entire automatic NDE allocation engine.

### Files

- Modify: `store/batches-store.ts`
- Modify: `components/nde/batch-management-view.tsx`
- Modify: `components/nde/batch-detail-panel.tsx`
- Modify: `components/nde/receive-results-panel.tsx`
- Possibly create: `lib/nde-status.ts`
- Read: `components/nde/create-batch-dialog.tsx`
- Read: `components/weld-detail-panel.tsx`
- Read: `components/erection/field-weld-detail-panel.tsx`

### Manual concepts to introduce

Batch status vocabulary:

- `Joint to Select`
- `Awaiting NDE`
- `Released`

Joint selection/result vocabulary:

- `S` = selected
- `SS` = selected by subcontractor / system selection variant if needed
- `NR` = not required / not rejected depending current manual usage context
- `T1` = first tracer
- `T2` = second tracer
- `T1S` / `T2S` = selected tracer variants if needed

Do not delete existing statuses immediately if it creates too much churn. Instead map current statuses to manual-facing labels.

### Minimum acceptable implementation

1. Add manual-facing batch status labels and chips.
2. Add manual-facing joint tags inside batch detail:
   - normal selected welds show `S`
   - tracer welds show `T1` or `T2`
   - non-required/remaining welds show `NR` if displayed
3. When receiving a rejected result:
   - mark the rejected weld as needing repair/rework as today
   - create tracer candidates or tracer records for the same welder/location/category if available
   - show a "Tracer required" section in the batch detail
4. Allow selecting/confirming two tracer welds for a rejection if candidate welds exist.
5. If candidates do not exist in seed data, show an explicit "No available tracer candidates in demo seed" message, not silent success.
6. If rejected count reaches threshold, show "NDE 100 required" banner for the batch/welder group.

### Suggested data additions

In `store/batches-store.ts` or `lib/nde-status.ts`:

```ts
export type ManualNdeBatchState = "Joint to Select" | "Awaiting NDE" | "Released";
export type ManualNdeJointCode = "S" | "SS" | "NR" | "T1" | "T2" | "T1S" | "T2S";

export interface TracerSelection {
  sourceRejectedWeldId: string;
  tracerWeldId: string;
  level: "T1" | "T2";
  selectedAt: string;
  selectedBy: string;
  result?: "Accepted" | "Rejected";
}
```

If the existing batch item model can be extended directly, do that. If not, keep a `tracerSelections` array on the batch.

### Automatic batch creation

Full automatic batch creation from weld progress + NDE Matrix is **not required** in this task. But add a clear seam:

```ts
allocateWeldToNdeQueue(weldId: string, source: "shop" | "field"): void
```

The function can currently create a "Joint to Select" queue entry or no-op with comments, but the UI should no longer imply that manual batch wizard is the only real Easy Piping workflow.

### Acceptance checks

- Batch list shows manual-facing states or a clear mapping to them.
- Rejecting a weld creates visible tracer requirement.
- Tracer candidates can be selected when seed data permits.
- NDE 100 warning appears after threshold rejection count.
- Existing Send to NDE from shop/field still works.
- `npm run lint` passes.

### Commit

```bash
git add store/batches-store.ts components/nde lib/nde-status.ts components/weld-detail-panel.tsx components/erection/field-weld-detail-panel.tsx
git commit -m "feat: add NDE tracer demo workflow"
```

Adjust file list to actual changes.

---

## Task 5 — Replace Spooling placeholder with manual-aligned import/revision shell

### Goal

Make `/spooling` a credible source-of-truth module shell aligned to manual §6, without fully migrating all seed data.

### Files

- Modify: `app/spooling/page.tsx`
- Create: `components/spooling/spooling-view.tsx`
- Create: `components/spooling/spooling-import-panel.tsx`
- Create: `components/spooling/spooling-validation-table.tsx`
- Create: `components/spooling/spooling-revision-panel.tsx`
- Possibly create: `store/spooling-store.ts`
- Possibly modify: `store/index.ts`
- Read: `lib/engineering-references.ts`

### Required tabs or sections

Implement a single page with tabs/cards for:

1. Import Spooling Data
2. Browse Latest
3. Browse History
4. Manual Revision Management
5. Validation Issues

Optional if quick:

6. Ident Code
7. Bolting Report Import

### Import shell behavior

This does not need real Excel parsing. Provide a manual-aligned import simulation:

- Upload/dropzone UI or "Load demo import" button
- preview rows
- validation result table
- "Accept clean rows" button
- "Export error file" toast/mock action

### Validation rules to represent

Show these checks explicitly:

- PDS Area exists
- Service Class exists
- Weld Type exists
- Thickness exists
- NDE Matrix exists
- WPS exists / warning if missing
- Pipeline consistency per ISO
- Service class consistency per ISO
- Revision conflict detected

### Revision conflict shell

Implement a small wizard/card for:

- current revision
- incoming revision
- changed welds/flanges
- removed items
- action:
  - accept new revision
  - hold for review
  - reject import

### Acceptance checks

- `/spooling` is no longer a placeholder.
- Page explains that Spooling is the source of weld/ISO/flange data.
- Validation rows reflect manual terms, not generic upload errors.
- Revision conflict UI exists.
- No downstream migration is required yet.
- `npm run lint` passes.

### Commit

```bash
git add app/spooling components/spooling store/spooling-store.ts store/index.ts
git commit -m "feat: add spooling import and revision shell"
```

Adjust file list to actual changes.

---

## Task 6 — Update documentation and manual coverage matrix

### Goal

Prevent future agents from relying on stale context. Document exactly what is manual-accurate, demo-simplified, and intentionally out of scope.

### Files

- Modify: `docs/PIPEQC_CONTEXT.md`
- Create: `docs/MANUAL_COVERAGE_MATRIX.md`
- Possibly update: `docs/gpt_analysis.md` only if the team wants the audit superseded

### `PIPEQC_CONTEXT.md` updates

Correct at least:

1. Tech stack:
   - Next.js `16.2.6`
   - React `19`
   - Zustand `5`
2. Reports are no longer a placeholder.
3. Spooling now has an import/revision shell after Task 5.
4. Testpack Release Tracking gates are live-derived after Task 2.
5. Reinstatement is based on flange joints after Task 3.
6. Flange state is persisted after Task 1.
7. NDE remains demo-simplified unless Task 4 fully closes tracer/selection logic.
8. Fabrication QC Release/Paint/Laydown is explicitly separate and not part of this plan.

### Coverage matrix format

Create `docs/MANUAL_COVERAGE_MATRIX.md`:

```md
# PipeQC Manual Coverage Matrix

| Manual section | Manual requirement | Current implementation | Status | Risk | Next action |
| --- | --- | --- | --- | --- | --- |
| §6 Spooling | Import spooling, validation, revision management | Spooling shell with validation/revision demo | Demo shell | Medium | Full Excel parser later |
| §11 NDE | Auto batches, S/SS/NR/T1/T2, tracers | Manual-facing labels + tracer demo | Partial | High | Auto allocation later |
| §18.2 Release Tracking | Live blockers for weld/flange/NDE/ISO/line check/X/QC/RFT | Live derived gates | Improved | Medium | Harden seed linkages |
```

Statuses:

- `Manual-aligned`
- `Demo shell`
- `Partial`
- `Placeholder`
- `Out of scope`

### Acceptance checks

- `PIPEQC_CONTEXT.md` no longer says Next 14.
- Docs do not claim Fabrication QC Release/Paint/Laydown was done by this plan.
- Coverage matrix exists and distinguishes manual-accurate from demo-simplified.
- `npm run lint` still passes.

### Commit

```bash
git add docs/PIPEQC_CONTEXT.md docs/MANUAL_COVERAGE_MATRIX.md
git commit -m "docs: update manual coverage context"
```

---

## Task 7 — Final verification

Run these checks after implementation:

```bash
npm run lint
npm run build
git status --short
```

Manual QA routes:

```text
/testpack/explorer
/testpack/pressure-test/reinstatement/preparation
/testpack/pressure-test/reinstatement/progress
/flange
/nde
/spooling
```

Regression checks:

1. Testpack Explorer no longer has hardcoded green gates 1-3.
2. Testpack cannot become QC Released while NDE/flange/weld blockers remain.
3. Reinstatement screens show flange joints Y/Z, not punch items Y/Z.
4. Flange edits persist through reload.
5. NDE rejection visibly creates tracer obligation or "no candidates" message.
6. Spooling route is a useful shell, not placeholder.
7. Existing Pressure Test line check/item clearance/blinding/testing screens still load.
8. Fabrication QC Release/Paint/Laydown work was not modified by this plan.

If `npm run build` fails because of unrelated pre-existing work, document exact errors and confirm whether they are in files touched by this plan.

---

# Suggested execution order

1. Task 1 — shared `flange-store`
2. Task 2 — live Testpack Release Tracking gates
3. Task 3 — flange-based Reinstatement
4. Task 6 partial — update docs for completed P0 fixes
5. Task 4 — NDE tracer demo
6. Task 5 — Spooling shell
7. Task 6 final — coverage matrix / context cleanup
8. Task 7 — final verification

Reasoning:

- Tasks 1-3 remove the dangerous false-readiness behavior.
- Docs should be updated once P0 is fixed so future agents stop compounding stale assumptions.
- NDE and Spooling are bigger fidelity improvements and can follow.

---

# Handoff prompt for the implementing agent

Use this exact instruction when starting the next agent:

> You are implementing `docs/prompts/PipeQC_Manual_Alignment_P0_P2.md`.
> First read the whole prompt, then inspect current git status. There may be user-owned Fabrication QC Release changes in the worktree; do not overwrite or reformat them.
> Start with Task 1 and Task 2 only. After Task 2, run `npm run lint`, summarize changed files, and stop for review unless explicitly told to continue.
> Do not implement Fabrication QC Release, Paint, or Laydown. The user will do that separately.
