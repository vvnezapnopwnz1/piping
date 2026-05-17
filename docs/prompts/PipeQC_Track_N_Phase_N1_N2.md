# Task: PipeQC Track N, Phases N1 + N2 — Create Batch wizard + per-weld Receive Results

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first. Tracks A (A1–A6), B (B1–B2), and E2.1 are merged.

This slice unblocks **two steps** of the upstream demo narrative simultaneously, because both screens share the same primitives (filtered weld picker, rework-code lookup, 600–800 ms cadence, toast feedback). Per `track-upstream.md` §8: _"N1 + N2 связаны: имеет смысл их делать одним промптом"_.

- **N1 — Create Batch wizard** unblocks demo step 5 (_"Mikhail creates a new batch BTH-2025-0157 with the re-welded WLD-099 + 4 others"_). Today the button just toasts `Coming soon`.
- **N2 — per-weld Receive Results panel** unblocks demo step 2 (_"Mikhail reviews per-weld results and rejects WLD-099 with POR"_). Today `handleReceiveResults` auto-accepts every weld in the batch — Mikhail cannot reject anything manually, only seeded rejections show up.

## Goal

Replace the placeholder Create dialog and the auto-accept Receive flow with the real workflows the demo narrative needs.

1. **N1**: 2-step Create Batch wizard (`components/nde/create-batch-dialog.tsx`) wired into the `+ Create new batch` button in `batch-management-view.tsx`. On submit calls `useBatchesStore.createBatch(...)`, closes, toasts, and scrolls/pulses the new row.
2. **N2**: per-weld Receive Results side-panel (`components/nde/receive-results-panel.tsx`) launched from the existing `Receive Results` button in `batch-detail-panel.tsx`. Lets the user mark each weld Accepted / Rejected; Rejected requires picking a Rework Code from `lib/engineering-references.ts:REWORK_CODES`. On submit: 600–800 ms delay → `receiveResults(...)` mutation → cascade to welds-store (already wired in `markForRework`).
3. Type-bridge the existing `ReworkCode` literal union in `batches-store.ts` to accept the new `RW-NNN` codes from B2 (`engineering-references.ts`). Pick **one** of the two options below in §"Type bridge" and document the choice in the PR description.
4. New notification on receive-with-rejections (Track N4 partial): if N rejected > 0, emit a `nde_result` notification _"BTH-XXXX: N welds rejected — rework cascaded to fabrication"_. This already partially exists for the seed batch BTH-2025-0156; ensure it fires for newly-created flows too.

**Do not** touch the erection store, dashboards, or any A/B-track screens. Smallest possible change that unblocks demo steps 2 and 5.

## Reference: existing files to read first

- `store/batches-store.ts` — already has `createBatch`, `receiveResults`, `updateWeldResult`, `markForRework`, and `getNextBatchNo`. Surface is complete — N1/N2 are pure UI plumbing.
- `store/welds-store.ts` — source for the weld picker. `useWeldsStore(s => s.welds)` gives the full list. Filter by `status` to surface candidates (typically `Completed` welds awaiting NDE, plus `Rework` welds being re-batched).
- `store/admin-store.ts` — `useSubcontractors()` hook returns the active subcontractors. Use these in the wizard's subcontractor select (do NOT hardcode `"Bureau Veritas"`).
- `lib/engineering-references.ts:REWORK_CODES` — RW-001 … RW-010 with description/category/severity/defaultAction.
- `components/nde/batch-management-view.tsx` (lines 196, 260, 440–465) — current placeholder dialog. Reuse `createDialogOpen` state.
- `components/nde/batch-detail-panel.tsx` (lines 202–213, 641) — current auto-accept handler and Receive button.
- `components/testpack/release-work-dialog.tsx` — reference UX for a 2-step dialog with a filtered selection table (use the same density and Cancel/Back/Submit footer pattern).
- `components/erection/field-weld-detail-panel.tsx` — reference for a side-panel inside an existing Sheet/Dialog (the Receive Results panel is a _secondary_ sheet over the batch detail Sheet, not a separate Dialog).

## Type bridge — pick one and stick to it

Today `batches-store.ts` defines:

```ts
export type ReworkCode = "POR" | "CRK" | "LOF" | "SLG" | "UNC"
export const REWORK_CODE_LABELS: Record<ReworkCode, string> = { ... }
```

…while `engineering-references.ts` defines `REWORK_CODES: { code: "RW-001", shortName: "Porosity", ... }[]` (10 codes, full domain dataset from §3.10).

**Option A (recommended):** Widen the store type to `string`, drop `REWORK_CODE_LABELS`, and look up the label/description from `REWORK_CODES` at render time. Smaller blast radius, preserves the B2 referential as the single source of truth. Existing seed batches in `INITIAL_BATCHES` use codes like `"POR"`, `"SLG"`, `"UNC"` — these stay valid because the type is now `string`, but they won't resolve in `REWORK_CODES`. Map the 5 legacy 3-letter codes to their `RW-NNN` equivalents in the seed data as a one-time data migration (POR→RW-001, CRK→RW-002, SLG→RW-003, UNC→RW-004, LOF→RW-005). Keep `REWORK_CODE_LABELS` deleted.

**Option B:** Keep the literal union and add a mapping helper `function ndeCodeFromReworkCode(rw: ReworkCode): "POR" | "CRK" | ...` that converts B2 codes back to store codes at the boundary. More code, but preserves type narrowness.

Pick A unless you find a concrete reason it breaks something. State your choice in the PR description and DO NOT silently switch midway through the slice.

## N1 — Create Batch wizard

### Trigger

`batch-management-view.tsx` line 441: `<Button size="sm" onClick={() => setCreateDialogOpen(true)}>`. The existing placeholder `<DialogContent>` (lines 445–464) gets replaced by `<CreateBatchDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={(batch) => { pulseBatch(batch.id); toast.success(`${batch.batchNo} created`); }} />`.

Delete `handleCreateNewBatch` (line 260) — its toast lives in the dialog.

### File: `components/nde/create-batch-dialog.tsx` (new)

`"use client"`. Receives `open`, `onOpenChange(open: boolean)`, `onCreated(batch: NdeBatch)`. Renders a single `Dialog` with a `DialogContent` sized `sm:max-w-[680px]`.

**Step 1 — Batch metadata.**

| Field         | Source                                              | Required | UI                                                                                         |
| ------------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ | --- | --- | --- | --- | --------------------- |
| NDE method    | enum `RT                                            | UT       | MT                                                                                         | PT  | PMI | HT` | yes | Radio group or Select |
| Subcontractor | `useSubcontractors()` filtered by `active === true` | yes      | Select; default = first active sub                                                         |
| Matrix ref    | free-text                                           | yes      | Input; default `"NDE-M-CS-A106B"` for RT, swap to `"NDE-M-SS-316L"` for UT, leave editable |
| Inspector     | free-text                                           | no       | Input; default `"NDE-INS-04"`                                                              |
| Created by    | free-text                                           | no       | Input; default `"QC-ENG-01"`                                                               |

`Next` button disabled until method + subcontractor + matrix ref are set.

**Step 2 — Pick welds.**

Filtered table from `useWeldsStore(s => s.welds)`. Columns: checkbox · `jointNo` · `spoolNo` · `isoNo` · `status` (pill) · welder · `wpsNo` · `diaInch` · `materialType`.

- Default filter: only show `status === "Completed"` AND welds NOT already in any non-Closed batch. Compute the exclusion set from `useBatchesStore.getState().batches` (any weld whose `id` appears in a batch with status ≠ `"Closed"`).
- Add a free-text search above the table (matches `jointNo OR spoolNo OR isoNo`).
- Add a `Show Rework welds` toggle that flips the default filter to `status === "Rework"` (so Mikhail can pick re-welded WLD-099 in demo step 5).
- Multi-row checkbox selection, header checkbox selects/deselects current filtered page (≤ 25 rows, no pagination — same density as `weld-table.tsx`).
- Empty state: _"No welds match. Try clearing filters or check Show Rework welds."_

Footer: `Back` · `Cancel` · `Create batch (N)` (disabled when `N === 0`). Button label updates with count: `Create batch (3)`.

### On submit

```ts
const newBatch = createBatch({
  method,
  subcontractor: subcontractorCode,
  matrixRef,
  createdBy: createdBy || undefined,
  welds: selectedWelds.map((w) => ({
    id: w.id,
    jointNo: w.jointNo,
    spoolNo: w.spoolNo,
    isoNo: w.isoNo,
    welder: w.welder,
    inspector: inspector || undefined,
    dwirNo: w.dwirNo ?? `DWIR-${Date.now().toString().slice(-4)}`,
    materialType: w.materialType ?? "CS A106B",
    diaInch: w.diaInch ?? '6"',
    wpsNo: w.wpsNo ?? "GTAW-P1-1G",
  })),
});

// 600–800 ms artificial delay BEFORE the createBatch call (matches WLD-099 pattern)
await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));

onCreated(newBatch);
onOpenChange(false);
// reset internal step + form state
```

Inspect the actual `WeldJoint` field names in `lib/weld-data.ts` and map them correctly — the snippet above uses likely names but `wpsNo` / `dwirNo` / `materialType` / `diaInch` may live under different keys. If a source weld doesn't carry a DWIR or WPS, synthesize a plausible value as in the seed data.

### Constraints (N1)

- No new dependencies.
- The dialog itself is `"use client"`; everything else stays as-is.
- The `+ Create new batch` button remains in the same DOM position (top of the batches table). Do not move it.
- Cancel from either step closes the dialog and resets internal state.
- `Esc` and overlay-click do the same thing as Cancel.

## N2 — Per-weld Receive Results panel

### Trigger

`batch-detail-panel.tsx` line 641: `<Button onClick={handleReceiveResults}>`. Replace `handleReceiveResults` (lines 202–213) with `() => setReceivePanelOpen(true)`. Mount `<ReceiveResultsPanel batch={batch} open={receivePanelOpen} onOpenChange={setReceivePanelOpen} onSubmitted={() => { /* toast already in panel */ }} />` as a sibling Sheet (nested over the existing Sheet — confirmed safe by shadcn since `Sheet` supports stacking).

### File: `components/nde/receive-results-panel.tsx` (new)

`"use client"`. Renders a right-side `Sheet` `sm:max-w-[640px]`.

**Header:** _"Receive results — BTH-XXXX"_ · `StatusPill status="Issued"` · subhead method + subcontractor.

**Body — one row per weld in `batch.welds`:**

| Column                    | Content                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Weld                      | `jointNo` (mono) · spool · ISO (muted)                                                                  |
| Welder                    | `welder` code                                                                                           |
| Result                    | Segmented control: `Pending` (default) · `Accepted` · `Rejected`                                        |
| If Rejected → Rework code | Select populated from `REWORK_CODES` (code · shortName). Required when result === Rejected.             |
| If Rejected → Remarks     | Textarea, optional, helper _"Optional — included in rework cascade."_                                   |
| Inspector                 | Single input above the list, applied to all welds; default `batch.welds[0]?.inspector ?? "NDE-INS-04"`. |

Validation: Submit disabled until **every** weld has `result !== "Pending"` AND every Rejected weld has a `reworkCode`. Show inline red helper text under rows missing rework code (same pattern as `weld-detail-panel.tsx` WLD-099 validation).

Quick actions in the header strip (above the list): `Accept all` and `Reset` (both apply to all currently-Pending welds; do not overwrite already-graded rows).

**Footer:**

- Left: live summary `N Accepted · M Rejected · K Pending`.
- Right: `Cancel` · `Submit results`.

### On submit

```ts
const inputs: WeldResultInput[] = batch.welds.map((w) => ({
  weldId: w.id,
  result: state[w.id].result, // "Accepted" | "Rejected"
  reworkCode: state[w.id].reworkCode, // RW-NNN if Option A
  remarks: state[w.id].remarks,
  inspector,
}));

await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));
useBatchesStore.getState().receiveResults(batch.id, inputs);

const rejected = inputs.filter((i) => i.result === "Rejected");
if (rejected.length > 0) {
  // Cascade to welds-store — receiveResults itself does NOT cascade today.
  // Re-use the same pattern that handleConfirmRework already uses (lines 215-230):
  const markForRework = useWeldsStore.getState().markForRework;
  rejected.forEach((r) => {
    const reasonLabel =
      REWORK_CODES.find((rc) => rc.code === r.reworkCode)?.shortName ??
      r.reworkCode;
    markForRework(
      r.weldId,
      r.remarks?.trim() || `Marked for rework via NDE — ${reasonLabel}`,
    );
  });

  // Emit notification (Track N4 partial)
  useNotificationsStore.getState().addNotification({
    severity: "warning",
    category: "nde_result",
    title: `${batch.batchNo}: ${rejected.length} weld${rejected.length === 1 ? "" : "s"} rejected`,
    detail: `Rework cascaded to fabrication — codes: ${[...new Set(rejected.map((r) => r.reworkCode))].join(", ")}`,
    href: `/nde?batch=${batch.id}`,
  });
}

toast.success(
  `${batch.batchNo} — ${accepted} accepted, ${rejected.length} rejected`,
);
onOpenChange(false);
```

Adapt the `addNotification` call shape to whatever `store/notifications-store.ts` actually exposes (read it first; field names may differ).

### What stays the same

- `markForRework` cascade in `handleConfirmRework` (the explicit "Mark for rework" button on the batch panel) continues to work unchanged.
- `closeBatch` button continues to require every weld Accepted.
- Existing seed batches that already have `result` filled in stay readable.

## Wire-up changes

1. **`components/nde/batch-management-view.tsx`**
   - Replace `<DialogContent>` placeholder (lines 445–464) with `<CreateBatchDialog ... />`. Keep the trigger button and `createDialogOpen` state.
   - Delete `handleCreateNewBatch` (line 260).
   - Keep the existing pulse-row animation on creation.

2. **`components/nde/batch-detail-panel.tsx`**
   - Add `useState<boolean>` for `receivePanelOpen`.
   - Replace `handleReceiveResults` body with `() => setReceivePanelOpen(true)`.
   - Mount `<ReceiveResultsPanel ... />` near the existing `<ConfirmReworkDialog>` mount point.

3. **`store/batches-store.ts`**
   - Apply Option A: change `ReworkCode` to `string`, delete `REWORK_CODE_LABELS`, migrate the 5 legacy 3-letter seeds (POR→RW-001, CRK→RW-002, SLG→RW-003, UNC→RW-004, LOF→RW-005). Touch the seed `INITIAL_BATCHES` and the per-weld `reworkCode` literals inside it.
   - Any external imports of `REWORK_CODE_LABELS` — replace with `REWORK_CODES.find(c => c.code === x)?.shortName ?? x`. Search the codebase: `grep -rn REWORK_CODE_LABELS components/ app/ lib/`.

4. **Notifications**
   - If `notifications-store.ts` lacks a generic `addNotification` action, add one (the minimum surface: `id` autogenerated, `createdAt: new Date().toISOString()`, all other fields from caller). Existing seed notifications stay as-is.

## Constraints

1. No new npm dependencies.
2. `"use client"` on both new components.
3. Demo cadence: 600–800 ms artificial delay BEFORE every store mutation; Sonner toast on success.
4. Smallest possible change to existing files — don't refactor the batch detail panel layout.
5. Do not break Track A, B, or E2.1 regression flows.
6. No backend, no fetch.

## Acceptance criteria

Fresh `localStorage`, `npm run dev`:

### N1 — Create Batch wizard

1. `/nde` loads. Click **+ Create new batch**. Step 1 form opens.
2. Pick method `RT`, subcontractor `Bureau Veritas`, leave defaults. `Next` enabled. Click.
3. Step 2 weld picker renders. Default filter shows only `Completed` welds not already in an open batch. Search box filters by jointNo. Select 3 welds via row checkboxes; header checkbox toggles all-on-current-view.
4. Toggle **Show Rework welds**. The list now shows Rework-status welds. Select one. Total selection is 4. Footer button reads `Create batch (4)`.
5. Click `Create batch (4)`. Spinner / disabled state for ~700 ms. Dialog closes, toast appears, the new row pulses in the batch table.
6. New row shows correct batch no (auto-incremented from `getNextBatchNo()`), method `RT`, subcontractor `Bureau Veritas`, status `Created`, weld count 4.
7. Click into the new batch — Overview tab shows the 4 welds, all `Pending`, History has one event `"Batch created"`.
8. Refresh page. New batch persists (it's in the store, so localStorage `pipeqc-batches` retains it).
9. Cancel from Step 1 closes without changes. Cancel from Step 2 returns to default state on next open (does not preserve half-filled form).

### N2 — Per-weld Receive Results

10. On the new batch from step 7, click `Issue batch` (existing flow) — status moves to `Issued`. Then click `Receive Results` — the new side-panel opens (nested over the batch sheet).
11. 4 weld rows render with `Pending` selected. Submit button disabled.
12. Set 3 to `Accepted`, 1 to `Rejected`. Submit still disabled (Rejected has no rework code yet).
13. Pick a rework code (e.g. RW-001 — Porosity) for the rejected weld. Submit enables. Optional remark added.
14. Click `Submit results`. ~700 ms delay → panel closes → toast `"BTH-XXXX — 3 accepted, 1 rejected"` → batch status moves to `Results Received` → home page shows new warning notification `"BTH-XXXX: 1 weld rejected — rework cascaded to fabrication"`.
15. Open `/fabrication/weld-progress`. The rejected weld now has status `Rework` (cascaded from welds-store via `markForRework`). Detail panel shows the remark text from step 13 (or the synthesized `Marked for rework via NDE — Porosity` if remark was empty).
16. Back on the batch detail panel: the rejected weld row shows `result=Rejected`, `reworkCode=RW-001`. The `Mark for rework` confirm button still works as before for the rejected weld.
17. Open an existing seed batch `BTH-2025-0156` (already has 1 rejected weld with code POR/RW-001 after the migration). It still renders correctly — the rework code label resolves to "Porosity" via `REWORK_CODES.find(...)`. No console errors.

### Regression

18. **E2.1**: `/erection/weld-progress` — edit a field weld erection status, refresh, edit persists.
19. **A1 + Track B**: assign 5 ISOs of TP-205 to LC-01 in `/testpack/pressure-test/line-check/preparation` — picker reads teams from admin-store correctly.
20. `Reset Demo` from top nav clears the new batch, restores seed batches, clears Track A state. Run a Create Batch flow again — still works (no stale state).

### Build

21. `grep -rn REWORK_CODE_LABELS components/ app/ lib/` returns no matches (only the deleted definition or none).
22. `npx tsc --noEmit` clean.
23. `npm run build` clean.

## Definition of done

- New files: `components/nde/create-batch-dialog.tsx`, `components/nde/receive-results-panel.tsx`.
- Modified files: `components/nde/batch-management-view.tsx`, `components/nde/batch-detail-panel.tsx`, `store/batches-store.ts` (type bridge + seed migration), possibly `store/notifications-store.ts` (only if `addNotification` doesn't already exist), `docs/PIPEQC_CONTEXT.md` (merge log).
- `docs/tracks/track-upstream.md` Track N table: mark N1 and N2 ✅ Merged. Update N4 to "partial — fires from N2 receive flow".
- All 23 acceptance criteria pass.
- PR description states which type-bridge option was chosen (A or B) and why.

## Manual self-check before reporting done

1. Step 5 (Create) and step 14 (Receive with rejection) — these are the two demo-killing flows. Run them by hand in the browser before claiming done. If you ran terminal-only, say so explicitly.
2. Step 18 (E2.1 persistence) — confirms you didn't break the previous slice. Easy to verify; do not skip.
3. Step 23 (`next build`) — clean output, no new warnings.
4. Size sanity: this slice should add ~600–800 LOC of new components + ~50 LOC of edits. If you are touching the erection store, the dashboard, or any A/B-track files — you are out of scope.

Report files created/modified, the type-bridge choice with rationale, and any acceptance step you could not verify manually (steps 1–17 require a browser; flag honestly if running terminal-only).

Почему N1+N2 одним промптом, а не два отдельно: в
track-upstream.md §8 ты сам зафиксировал — «N1 + N2 связаны:
имеет смысл их делать одним промптом — модальное окно Create
Batch и side-panel Receive Results используют одни и те же
примитивы». Они оба бьют по components/nde/, оба используют
выбор welds + rework-code picker из B2, оба разблокируют
разные шаги одного и того же демо-сценария (шаги 2 и 5).

  <!-- Что внутри промпта:
  - N1 — новый create-batch-dialog.tsx (2-step wizard:
  метод/субподрядчик/инспектор → выбор welds из welds-store с
  фильтром Completed + toggle Show Rework). Заменяет текущий
  toast.info("Coming soon") в batch-management-view.tsx:260.
  - N2 — новый receive-results-panel.tsx (per-weld
  Accepted/Rejected, при Rejected — обязательный picker из
  REWORK_CODES). Заменяет auto-accept-all handleReceiveResults в
   batch-detail-panel.tsx:202.
  - Type bridge — отдельная подсекция, где я выписал две опции
  (widen ReworkCode до string vs. mapping helper) и явно сказал
  агенту выбрать одну и зафиксировать в PR. Это та точка, где
  агент может уйти в сторону, если её не закрепить.
  - Каскад на welds-store при rejection + уведомление (Track N4
  частично).
  - 23 acceptance criteria, из них 9 для N1, 8 для N2, 3
  регрессии (включая E2.1 persistence — чтобы агент не сломал
  предыдущий слайс), 3 build/type-check. -->
