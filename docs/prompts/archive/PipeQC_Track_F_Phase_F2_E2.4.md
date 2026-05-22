# Task: PipeQC Track F + E2 — F2 (Send shop welds to NDE) + E2.4 (Send field welds to NDE)

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first.
Tracks A (A1–A6), B (B1–B2), E2.1 / E2.3 / E2.5, and N1+N2 are merged. The MVP upstream demo narrative already runs end-to-end on seed data.

This slice covers **two symmetric handoffs** that are listed separately in `track-upstream.md` §8 (sprints 6 and 7) but share the same primitives — the CreateBatchDialog from N1, the batches-store `createBatch` mutation, the same Sonner cadence. Per the same pattern used for N1+N2 (one prompt, one merge), they ship together.

- **F2** unblocks demo step 5 *from the fabrication side*: today Mikhail must open `/nde` and pick welds by hand. After F2, Sergey can push a single weld (or an entire spool) into a new batch directly from `weld-detail-panel.tsx`, with the wizard pre-populated. This is the natural F→N handoff the audience expects after a re-weld.
- **E2.4** unblocks demo step 9 *from the erection side*: field welds go to "Site NDE" the same way shop welds go to "Shop NDE". The new batch is tagged `source: "field"` so the audience can see it separated on `/nde` (and so N3 — Source filter — has data to filter on later).

## Why this slice exists

Today both detail panels already have a `Send to NDE` button (`weld-detail-panel.tsx:566–578`, `field-weld-detail-panel.tsx:184–217`), but both bypass the wizard and create a **silent single-weld batch** with auto-derived method + auto-synthesized matrix ref. That's enough to demo a one-off, but it breaks two parts of the narrative:

1. **Demo step 5** (Mikhail batches WLD-099 + 4 others): there is no UI affordance to add more welds at this entry point. The user has to navigate to `/nde` and use the N1 wizard, which makes the F→N handoff invisible.
2. **Demo step 9** (FW-022 in a field-side batch BTH-2025-0158): the resulting batch is **indistinguishable** from a shop batch on `/nde`. Hassan and Mikhail are supposed to use the same screen; the audience needs to *see* shop vs field, otherwise the "single funnel" pitch line lands flat.

F2 + E2.4 fix both. Total size: ~0.75 day; ~250–350 LOC of changes spread across 1 new helper, 2 modified panels, 1 modified dialog, 1 modified store, 1 modified list view.

---

## Goal

1. **Tag every NDE batch with `source: "shop" | "field"`.** Add the field to `NdeBatch` and `CreateBatchInput` in `store/batches-store.ts`. Default existing seed batches to `"shop"`. Render a small source badge (Shop / Field) as a new column in the `/nde` batches table.
2. **F2 — shop send-to-NDE upgrade.** Replace the direct single-weld create in `weld-detail-panel.tsx` with "open `CreateBatchDialog` pre-filled". Add a secondary action `Send entire spool` that preselects every Completed weld on the same spool. Both call paths flow through the existing wizard, so the user can still tweak method / subcontractor / add or remove welds before submitting.
3. **E2.4 — field send-to-NDE.** Keep the direct single-weld flow on the field side (the field detail panel is the only place a single field weld is graded; multi-weld batching from field is rare) — but route it through `createBatch(...)` with `source: "field"`, fix the toast wording to *"Site NDE"*, and emit a different home notification. Optionally also extend `CreateBatchDialog` to support `source="field"` so future use cases (e.g. a "Send all RFT welds in this area" button later) can reuse the same dialog. **If the dialog change is non-trivial, ship a minimal direct-create on the field side and leave the wizard at `source="shop"` only.** State the choice in the PR description.

Do **not** touch the erection or testpack stores, dashboards (F1/E2.2 are separate slices), Track A screens, or the admin tab shell. Smallest possible change that delivers demo steps 5 and 9 with visible separation between shop and field NDE.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `components/weld-detail-panel.tsx` (lines 180–222 + 566–610) | Current shop send-to-NDE button + handler. Replace, don't rewrite the rest of the panel. |
| `components/erection/field-weld-detail-panel.tsx` (lines 184–217 + button mount near line 695–700) | Current field send-to-NDE handler. Same shape as shop, but reads from erection-store + uses `setSendToNDEPanel` label "Send to Site NDE". |
| `components/nde/create-batch-dialog.tsx` | The N1 wizard. Already reads from `useWeldsStore`. Add `preselectedWeldIds?: string[]`, `defaultMethod?: NdeMethod`, and `source?: "shop" \| "field"` props (default `"shop"`). When source is `"shop"` keep current behavior. When `"field"`, you have two options — see "E2.4 dialog mode" below. |
| `components/nde/batch-management-view.tsx` (lines 446–520 ish — table header + row) | Add a `Source` column header + a per-row badge. |
| `store/batches-store.ts` (lines 35–96, 110, `INITIAL_BATCHES` seed) | Add `source` to types and seed. `createBatch` must accept the new optional field and default to `"shop"`. |
| `lib/nde-data.ts` (mirror types around line 35) | Keep the lib types in sync so static-data consumers still type-check. |
| `lib/weld-data.ts` / `lib/erection-weld-data.ts` | Confirm `WeldJoint` and `FieldWeldJoint extends WeldJoint` fields used when building `NdeBatchWeld` records (`jointNo`, `spoolNo`, `isoNo`, `welderCode`, `dwirNo`, `materialType`, `wpsNo`, `diaInch`). |
| `lib/welder-qualifications.ts` | `determineNDEMethods(weld)` returns `{ primary, additional }`. Use `primary` as the dialog's defaultMethod when opening from a panel. |
| `store/welds-store.ts` | Source for the shop weld pool the dialog already reads. |
| `store/erection-store.ts` | If you choose dialog mode B for E2.4, the wizard's Step 2 reads field welds from here when `source === "field"`. |
| `docs/prompts/PipeQC_Track_N_Phase_N1_N2.md` | Type-bridge background (RW-NNN codes) — touched here only via not breaking anything. |

---

## 1. Source field on `NdeBatch`

### Type changes

In `store/batches-store.ts`:

```ts
export type NdeBatchSource = "shop" | "field"

export interface NdeBatch {
  // ... existing fields
  source: NdeBatchSource  // required, no `?:`
}

export interface CreateBatchInput {
  // ... existing fields
  source?: NdeBatchSource  // defaults to "shop" inside createBatch
}
```

Mirror the same `NdeBatchSource` + `source: NdeBatchSource` addition in `lib/nde-data.ts:NdeBatch`. The lib types are imported by `components/nde/*` and several pages — keep them aligned.

### Seed migration

`INITIAL_BATCHES` in `store/batches-store.ts` — add `source: "shop"` to every existing seed batch (6 batches). If `lib/nde-data.ts` has its own seed array, mirror the same. **Do not** change any other seed field; this is a pure additive migration.

### `createBatch` mutation

Inside `createBatch`, set `source: input.source ?? "shop"` when building the new `NdeBatch` object. Everything else stays the same.

### List rendering

In `components/nde/batch-management-view.tsx`:

- Add a new column header `Source` between `Method` and `Subcontractor` (or wherever fits the existing widths without forcing a horizontal scrollbar — use your eye, match `weld-table.tsx` density).
- Per-row cell: render a tiny pill — `"Shop"` (slate-100 / slate-700) or `"Site"` (sky-100 / sky-700). Use `<Badge>` if the file already imports it, otherwise inline span with Tailwind utilities matching `status-badge.tsx`.
- Filter sidebar (if there is one for batches — check `batch-management-view.tsx`) gets a *deferred* Source filter: **do not** wire it now. That's Track N3. Just make the column visible.

---

## 2. F2 — Shop send-to-NDE upgrade

### Trigger surface (weld detail panel)

Replace the existing `<Button onClick={handleSendToNDE} ...>` block in `components/weld-detail-panel.tsx:566–578`. New layout: a single primary button `Send to NDE` plus a small secondary action `Send entire spool` rendered immediately below it (only when the current weld has at least one *other* Completed peer on the same spool).

```tsx
{joint.status === "Completed" && !joint.rtNo && (
  <div className="flex flex-col gap-2">
    <Button variant="outline" onClick={() => openWizard([joint.id])} className="...">
      <Scan className="h-4 w-4" />
      Send to NDE
    </Button>
    {peerCount > 0 && (
      <button
        type="button"
        onClick={() => openWizard(spoolPeerIds)}
        className="text-xs text-slate-500 hover:text-sky-600 underline-offset-2 hover:underline self-start"
      >
        Send entire spool ({peerCount + 1} welds)
      </button>
    )}
  </div>
)}
```

`spoolPeerIds` = all `useWeldsStore` welds where `spoolNo === joint.spoolNo` AND `status === "Completed"` AND not already in a non-Closed batch. `peerCount` excludes the current joint itself. Compute once via `useMemo`.

### Wizard launch

Local state inside the panel:

```ts
const [wizardOpen, setWizardOpen] = useState(false)
const [preselectedIds, setPreselectedIds] = useState<string[]>([])

const openWizard = (ids: string[]) => {
  setPreselectedIds(ids)
  setWizardOpen(true)
}
```

Render at the bottom of the panel (sibling to the existing JSX root):

```tsx
<CreateBatchDialog
  open={wizardOpen}
  onOpenChange={setWizardOpen}
  onCreated={(batch) => {
    toast.success(`${batch.batchNo} created`, {
      description: `${batch.method} examination · ${batch.welds.length} weld${batch.welds.length === 1 ? "" : "s"}`,
      action: { label: "View in NDE", onClick: () => router.push(`/nde?batch=${batch.id}`) },
      duration: 5000,
    })
    onClose()
  }}
  source="shop"
  preselectedWeldIds={preselectedIds}
  defaultMethod={determineNDEMethods(joint).primary}
/>
```

Delete the old `handleSendToNDE` function (lines 182–222) and the `isSending` state — the dialog now owns the delay + spinner.

### CreateBatchDialog changes

Add props to `components/nde/create-batch-dialog.tsx`:

```ts
interface CreateBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (batch: NdeBatch) => void
  source?: NdeBatchSource          // default "shop"
  preselectedWeldIds?: string[]    // default []
  defaultMethod?: NdeMethod        // default "RT"
}
```

Behavior changes:

1. When `preselectedWeldIds.length > 0`, on `open` transition initialize `selectedIds = new Set(preselectedWeldIds)` AND **skip Step 1** — open directly on Step 2. The user can still go `Back` to edit method / subcontractor / matrix.
2. When `defaultMethod` is provided, initialize `method = defaultMethod` and `matrixRef = defaultMatrixByMethod[defaultMethod]` (instead of always `"RT"`).
3. On submit, pass `source` into the `createBatch(...)` call.
4. If `preselectedWeldIds` references welds that are already in a non-Closed batch (race: another tab batched them), surface a non-blocking warning at the top of Step 2 — *"2 of the preselected welds are already in batch BTH-XXXX and were unselected."* — and silently drop them from `selectedIds`. Do not abort.

When `open` transitions from `false` to `true` (use a `useEffect` keyed on `open`), reset and re-initialize from the new props. When `open` transitions to `false`, clear `selectedIds`, reset `step` to 1, clear search/showRework — same as today's Cancel reset.

---

## 3. E2.4 — Field send-to-NDE

### Two implementation modes — pick one

**Mode A (minimal, recommended for this slice).** Keep the direct single-weld create in `field-weld-detail-panel.tsx`. Just update the existing `handleSendToNDE` to:

- Pass `source: "field"` to `createBatch(...)`.
- Toast wording: `"Batch ${batch.batchNo} created (Site NDE)"`.
- After toast, also emit a home notification through `notifications-store.ts`:
  - severity `info`, category `nde_overdue` (or whichever existing category matches "new batch"; reuse what N2 used if there was one),
  - title `${batch.batchNo}: Site NDE batch created for ${weld.jointNo}`,
  - detail `${primary} examination · ${weld.diaInch} ${weld.materialType} · ${weld.areaZone}`,
  - href `/nde?batch=${batch.id}`.
- Button label stays `Send to Site NDE`.

**Mode B (stretch).** Route through `CreateBatchDialog` with `source="field"`, just like F2. To make this work, Step 2 of the dialog must read from `useErectionStore` when `source === "field"`, with field-specific columns (`erectionStatus`, `areaZone` instead of `dwirNo`). This is ~80–120 extra LOC of conditional logic.

**Default to Mode A.** Pick Mode B only if it adds <30 min to the slice. Document the choice + reasoning in the PR.

### Field weld → NdeBatchWeld mapping

`FieldWeldJoint extends WeldJoint`, so all the fields `NdeBatchWeld` needs are already on the object. Map identically to the shop side. The `inspector` field defaults to `"NDE-INS-09"` (site NDE inspector) — use this when synthesizing the batch's history event. If `weld.dwirNo` is empty, synthesize `DWIR-FW-${Date.now().toString().slice(-5)}` so the field never lands as `undefined`.

### Toast / notification copy (Mode A)

```ts
toast.success(`Batch ${batch.batchNo} created (Site NDE)`, {
  description: `${primary} examination · ${weld.jointNo} (${weld.diaInch} ${weld.materialType})`,
  action: { label: "View in NDE", onClick: () => router.push(`/nde?batch=${batch.id}`) },
  duration: 5000,
})

useNotificationsStore.getState().addNotification({
  severity: "info",
  category: "nde_overdue", // or whatever already exists for "batch lifecycle" — reuse, don't invent
  title: `${batch.batchNo}: Site NDE batch created`,
  detail: `${primary} examination · ${weld.jointNo} · ${weld.areaZone}`,
  href: `/nde?batch=${batch.id}`,
})
```

Inspect `notifications-store.ts` first — if it already exposes `addNotification`, use it; if not, **do not** add one in this slice (N2 should have already added it). If no `addNotification` exists, silently drop the notification step and only show the toast. Document this in the PR.

---

## 4. Constraints

1. No new npm dependencies.
2. Smallest possible change in `weld-detail-panel.tsx` and `field-weld-detail-panel.tsx` — only the send-to-NDE button cluster + dialog mount. Do not refactor unrelated sections (form fields, validation, lock states).
3. Demo cadence stays the same: 600–800 ms artificial delay inside the dialog (already there from N1) or inside the field handler (already there at line 187). Do not stack delays.
4. The existing N1 wizard end-to-end flow (open from `+ Create new batch`, no preselect, no defaultMethod) must continue to work unchanged. That is the regression to watch.
5. Existing Mark-for-rework cascade from N2 must continue to work unchanged.
6. `Send to NDE` button visibility rule is unchanged: shop side shows when `status === "Completed"` and no `rtNo`; field side keeps its existing condition (read the file — likely `erectionStatus === "Welded"` or similar).
7. The new `Source` column on the `/nde` table must not push other columns off-screen on a 1280×800 viewport. If width is tight, shrink the `Created` or `Matrix ref` column rather than removing the new one.
8. No backend, no fetch.

---

## 5. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

### F2 — shop side

1. Navigate to `/fabrication/weld-progress`. Open WLD-099 (or any `Completed` weld without `rtNo`). Detail panel opens.
2. Bottom of the panel: `Send to NDE` button visible; underneath, secondary link `Send entire spool (N welds)` if the spool has additional completed peers (try a weld on spool `TC-001` with multiple completed siblings — if none qualify, the secondary link is hidden).
3. Click `Send to NDE`. Wizard opens **directly on Step 2** with the current weld checked. Header summary at top of the dialog shows the prefilled method (e.g. `RT`) and the default subcontractor.
4. Click `Back`. Step 1 form is editable with the prefilled values. Click `Next` — still on Step 2 with the preselect intact.
5. Add 2 more welds via the picker. Click `Create batch (3)`. ~700 ms delay → dialog closes → toast `"BTH-XXXX created — RT examination · 3 welds"` with `View in NDE` action → the side panel closes.
6. Click the toast's `View in NDE` → land on `/nde?batch=BTH-XXXX` and the new batch row appears in the table with the **`Shop`** pill in the new Source column. Open the batch — 3 welds, all `Pending`, history `Batch created`.
7. Refresh page. Batch persists. Source still `Shop`.
8. From WLD-099 detail panel again (open a different completed weld on the same spool), click **Send entire spool**. Step 2 opens with **all completed peers preselected** (count visible in submit button). Submitting creates a single multi-weld shop batch.
9. Edge case: try Send-to-NDE on a weld where the spool peers are *already* in an open batch. The non-blocking warning appears at top of Step 2: *"N of the preselected welds are already in batch BTH-XXXX and were unselected."* Submit still works on the remainder.
10. Cancel from Step 2 closes; reopen from another weld — wizard re-initializes with the new preselect (no stale state from the previous open).

### E2.4 — field side

11. Navigate to `/erection/weld-progress`. Open a field weld with `erectionStatus = "Welded"` (or whatever existing condition makes `Send to Site NDE` enabled — match current behavior).
12. Click `Send to Site NDE`. ~800 ms delay → toast `"BTH-XXXX created (Site NDE) — RT examination · FW-022 (4" SS 316L)"` with `View in NDE` action.
13. (Mode A) Home page now shows a new info notification *"BTH-XXXX: Site NDE batch created — RT examination · FW-022 · Area B - Boiler House"*. If `notifications-store.ts` has no `addNotification`, this step is skipped and the PR documents it.
14. Open `/nde`. The new batch appears with the **`Site`** pill in the Source column. Shop batches still show `Shop`.
15. Open the new batch. Standard batch detail — 1 weld, `Pending`. Issue → Receive results (per-weld, accept all) → Close. Full N1+N2 lifecycle still works on a field batch.
16. After Close, refresh — batch persists with `source: "field"` and `status: "Closed"`.

### Regression

17. Click `+ Create new batch` on `/nde` (the original N1 entry point with no preselect). Wizard opens on **Step 1** as before. Method picker defaults to `RT`. Step 2 has no preselected welds. Full flow still creates a `source: "shop"` batch.
18. Seed batch `BTH-2025-0156` (the one with the rejected weld from N2 acceptance criteria 17) still renders correctly with `Shop` in the Source column. Rework cascade from receiving results still works.
19. **E2.3 regression**: `/erection/dashboard` — Spool delivery readiness card still renders; clicking a row still deep-links to `/fabrication/weld-progress?spool=...`.
20. **E2.5 regression**: complete all welds on `ISO-1001` if not already done. The iso-welded watcher still emits the home notification `"ISO-1001: welded — Ready for line check on TP-201"`. Track A pressure-test screens still react to that ISO.
21. **A1 + Track B regression**: assign a team in `/testpack/pressure-test/line-check/preparation`. Picker reads from admin-store correctly.
22. `Reset Demo` from the top nav. All new batches disappear, seed batches return with `source: "shop"` on every row. Run F2 again — still works.

### Build

23. `npx tsc --noEmit` clean. New `source` field is required on `NdeBatch` so any code that constructs an `NdeBatch` literal (mock data, helpers, tests) must be updated.
24. `npm run build` clean — no new warnings.
25. `grep -rn "source: \"shop\"\|source: \"field\"" store/ components/ lib/` returns matches in the expected files only (seed data + the two `createBatch` call sites + the row badge renderer).

---

## 6. Definition of done

- Modified files (expected):
  - `components/weld-detail-panel.tsx` — replace handler + button block, mount `<CreateBatchDialog>`.
  - `components/erection/field-weld-detail-panel.tsx` — update handler to pass `source: "field"` + new toast wording + (Mode A) emit notification.
  - `components/nde/create-batch-dialog.tsx` — add `source` / `preselectedWeldIds` / `defaultMethod` props; init from props on open; pass `source` to `createBatch`.
  - `components/nde/batch-management-view.tsx` — add `Source` column header + per-row badge.
  - `store/batches-store.ts` — add `NdeBatchSource`, extend types + `INITIAL_BATCHES` seed (6 rows tagged `source: "shop"`) + `createBatch` default.
  - `lib/nde-data.ts` — mirror the type change. If there is a seed array here, add `source: "shop"`.
- New files: none expected.
- `docs/PIPEQC_CONTEXT.md` — append a merge log entry summarizing F2 + E2.4. Note the dialog mode choice (A or B).
- `docs/tracks/track-upstream.md` — mark F2 and E2.4 ✅ Merged in §4 and §6 tables; in §8 priority table mark sprints 6 and 7 done. Update §3 demo step 9 to note the `source=field` tag.
- All 25 acceptance criteria pass.
- PR description states the mode chosen for E2.4 (A or B) and which existing notification category was reused (or that notifications were skipped because the store has no `addNotification`).

---

## 7. Manual self-check before reporting done

1. **Hero flow**: run the full demo scenario from `track-upstream.md` §3 steps 1 → 11 by hand. Steps 5 and 9 must work *without* navigating to `/nde` first — entry from the fabrication / erection panels respectively. If you ran terminal-only, say so.
2. **Step 22 (Reset Demo)**: easy to skip mentally, easy to break. Verify the seed batches all come back with `source: "shop"`. A missing `source` on seed → TS errors on first render.
3. **Step 23 (`tsc --noEmit`)**: because `source` is required on `NdeBatch`, any literal that constructs a batch (search `as NdeBatch`, `: NdeBatch =`, `INITIAL_BATCHES`) must be updated. Run `grep -rn ": NdeBatch\| as NdeBatch" store/ lib/ components/` and confirm zero unhandled call sites.
4. **Size sanity**: this slice should add roughly 250–350 LOC net. If you're over 500 LOC of changes, you're refactoring something you shouldn't be. If you're under 150, you probably skipped the dialog prop wiring or the source column. Re-read §1–§3.
5. **Don't touch dashboards**: `fabrication-dashboard.tsx` and `erection-dashboard.tsx` are out of scope for this slice. F1 / E2.2 are separate.

Report files created/modified, the dialog mode chosen (A or B), the notification category reused, and any acceptance step you could not verify manually (steps 1–22 require a browser; flag honestly if running terminal-only).
