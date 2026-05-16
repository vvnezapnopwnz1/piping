# Task: PipeQC Track E2, Phase E2.1 — Erection Store (persistence layer)

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first. Tracks A (A1–A6) and B (B1–B2) are merged.
Erection module exists but is **broken** in the demo-critical sense: `app/erection/weld-progress/page.tsx` uses
`useState<FieldWeldJoint[]>(FIELD_WELD_DATA)` — local component state, **not persisted**. Any field weld edit
(erection status change, root%/cap% update, foreman confirmation, remark) is lost on page refresh. This is the #1
demo-killer in the upstream stack.

This slice creates a persisted Zustand store mirroring the existing `store/welds-store.ts` pattern and switches the
erection page + detail panel + table off local state onto the store. No new UX, no new features — just the data
layer.

## Goal

- New file `store/erection-store.ts` — persisted Zustand store, seeded from
  `lib/erection-weld-data.ts:FIELD_WELD_DATA`.
- Mirror the surface area of `store/welds-store.ts` (mutations, selectors, KPI hook), adapted to `FieldWeldJoint`
  fields.
- Switch `app/erection/weld-progress/page.tsx`, `components/erection/field-weld-table.tsx`, and
  `components/erection/field-weld-detail-panel.tsx` from local `useState` / `setWelds()` to store reads + store
  mutations.
- Wire `resetErection()` into `store/demo-store.ts:resetAll`.
- New KPI hook `useErectionKPIs()` ready for Track E2.2 (dashboard wiring) but not yet consumed.
- **Do not change any UI behavior** — same filters, same columns, same detail-panel fields, same save semantics. Only
  the underlying state changes.

## Reference: `store/welds-store.ts` pattern

Read this file first. The new store should match it structurally:

- Zustand `create()` + `persist` middleware
- Persist key `pipeqc-erection`, version `1`, `migrate: () => undefined` (full reset OK for demo)
- State shape exposes `welds` array + selectors as getters + mutations as setters
- Exports both `useErectionStore` (the hook) and granular hooks (e.g. `useErectionKPIs`)

## Store surface (`store/erection-store.ts`)

```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FIELD_WELD_DATA, type FieldWeldJoint } from "@/lib/erection-weld-data";

// re-export type for component consumers
export type { FieldWeldJoint } from "@/lib/erection-weld-data";

interface ErectionState {
  fieldWelds: FieldWeldJoint[];

  // selectors (return live snapshots)
  getById: (id: string) => FieldWeldJoint | undefined;
  getByErectionStatus: (
    status: FieldWeldJoint["erectionStatus"],
  ) => FieldWeldJoint[];
  getBySpool: (spoolNo: string) => FieldWeldJoint[];
  getByAreaZone: (areaZone: string) => FieldWeldJoint[];

  // mutations
  updateFieldWeld: (id: string, updates: Partial<FieldWeldJoint>) => void;
  setErectionStatus: (
    id: string,
    status: FieldWeldJoint["erectionStatus"],
  ) => void;
  setRootPercent: (id: string, pct: number) => void;
  setCapPercent: (id: string, pct: number) => void;
  setForemanConfirmed: (id: string, confirmed: boolean) => void;
  bulkUpdateErectionStatus: (
    ids: string[],
    status: FieldWeldJoint["erectionStatus"],
  ) => void;

  // demo reset
  resetErection: () => void;
}
```

### Implementation notes

- `fieldWelds` initial state: deep-clone `FIELD_WELD_DATA` (`JSON.parse(JSON.stringify(...))`). Same pattern as
  welds-store does for `WELD_DATA`. This prevents the seed array from being mutated in place if anyone forgets
  immutability.
- `updateFieldWeld` is the generic primitive; the typed setters (`setErectionStatus`, `setRootPercent`, etc.) are
  thin convenience wrappers that delegate to it. This matches the welds-store ergonomics where components can pick
  either the generic or the typed call.
- `setRootPercent` / `setCapPercent` must clamp the value to `[0, 100]` and round to integer.
- `bulkUpdateErectionStatus` updates multiple welds in a single `set()` call (one state transition, not N). Used by
  future selection-bar features; safe to include now.
- `resetErection` resets `fieldWelds` to the deep-cloned seed array.

### KPI hook

```ts
export const useErectionKPIs = () => {
  const fieldWelds = useErectionStore((s) => s.fieldWelds);
  // memoized derive — but useMemo not needed because the array reference only
  // changes when the store changes
  const total = fieldWelds.length;
  const toSite = fieldWelds.filter(
    (w) => w.erectionStatus === "To Site",
  ).length;
  const erected = fieldWelds.filter(
    (w) => w.erectionStatus === "Erected",
  ).length;
  const welded = fieldWelds.filter((w) => w.erectionStatus === "Welded").length;
  const bolted = fieldWelds.filter((w) => w.erectionStatus === "Bolted").length;
  const supported = fieldWelds.filter(
    (w) => w.erectionStatus === "Supported",
  ).length;
  const rft = fieldWelds.filter((w) => w.erectionStatus === "RFT").length;
  const notStarted = fieldWelds.filter(
    (w) => w.erectionStatus === "Not Started",
  ).length;
  const foremanConfirmedCount = fieldWelds.filter(
    (w) => w.foremanConfirmed,
  ).length;

  // average weld completion progress across non-terminal welds
  const inProgress = fieldWelds.filter(
    (w) => w.erectionStatus !== "RFT" && w.erectionStatus !== "Not Started",
  );
  const weldProgressPercent =
    inProgress.length === 0
      ? 0
      : Math.round(
          inProgress.reduce(
            (sum, w) => sum + (w.rootPercent + w.capPercent) / 2,
            0,
          ) / inProgress.length,
        );

  return {
    total,
    toSite,
    erected,
    welded,
    bolted,
    supported,
    rft,
    notStarted,
    foremanConfirmedCount,
    weldProgressPercent,
  };
};
```

Inspect `FieldWeldJoint`'s actual field names before finalising — if any of `rootPercent`, `capPercent`,
`foremanConfirmed` differ in spelling, adapt.

## Wire into existing files

### 1. `store/index.ts`

Add `export * from "./erection-store"`.

### 2. `store/demo-store.ts`

Import `useErectionStore`. Inside `resetAll()` (where `resetDemo`, `resetAdmin`, batches/welds resets live), add:

```ts
useErectionStore.getState().resetErection();
```

Order: after fabrication/NDE resets, before testpack reset (doesn't strictly matter, but keep
upstream-then-downstream).

### 3. `app/erection/weld-progress/page.tsx`

- Remove `const [welds, setWelds] = useState<FieldWeldJoint[]>(FIELD_WELD_DATA)`.
- Read from store: `const fieldWelds = useErectionStore(s => s.fieldWelds)`.
- The filter-sidebar local state (selected filters, search query, etc.) stays in `useState` — that's UI state, not
  domain state. Don't move it.
- The derived `filteredWelds` (welds × filters) is computed on every render from store data + filter state. Same as
  today, only the source array changes.
- The `setWelds` prop passed to child components (table, detail panel) goes away. Children now mutate via store
  directly.

### 4. `components/erection/field-weld-table.tsx`

- Receives a `data: FieldWeldJoint[]` prop (filtered list) — keep this contract. The page passes the filtered subset.
- Remove any `onSetWelds` / `setWelds` props if they exist — the table doesn't mutate, it only displays + emits
  row-click.
- No other changes needed.

### 5. `components/erection/field-weld-detail-panel.tsx`

This is the big change.

- Remove the `setWelds` prop entirely from the component signature.
- Replace every local mutation (`setWelds(prev => prev.map(...))`) with a call to the store. Concretely:
  - Erection status select → `useErectionStore.getState().setErectionStatus(id, newStatus)`
  - Root % input → `setRootPercent(id, n)`
  - Cap % input → `setCapPercent(id, n)`
  - Foreman confirmed toggle → `setForemanConfirmed(id, bool)`
  - Generic remark/notes edits → `updateFieldWeld(id, { remarks: newText })` (or whatever the existing field is —
    preserve current behavior)
- The detail panel must continue to read the **current** weld from the store every render, not from a snapshot —
  otherwise edits won't reflect after save. Pattern:
  ```ts
  const selectedId = props.selectedId;
  const weld = useErectionStore((s) =>
    s.fieldWelds.find((w) => w.id === selectedId),
  );
  ```
- Preserve the existing save delay (if any). If today's panel does instant `setWelds`, also do instant store mutation
  — don't artificially add delays. The 600–800 ms cadence belongs to Track A workflows (assign/generate-request
  actions); raw field edits are immediate.
- Preserve any existing toast feedback on save.

## Constraints

1. No new npm dependencies.
2. `"use client"` on the new store file (matches welds-store).
3. No backend, no fetch, no new lib data.
4. **Do not** mutate `FIELD_WELD_DATA` in `lib/erection-weld-data.ts` — it stays as the seed source for
   `resetErection()`. Components no longer import it directly.
5. **No UI changes.** Same columns, same filters, same fields in the detail panel, same save flow. A user opening the
   page should not be able to tell the data source changed — until they refresh and discover their edits persist.
6. **Track A, B, and existing erection regression must pass.**
7. Don't touch the erection dashboard (`components/erection-dashboard.tsx`) — that's E2.2's job. Its static charts
   stay as-is for now.

## Acceptance test

Fresh localStorage, `npm run dev`:

1. Navigate to `/erection/weld-progress`. Table renders ~100 field welds. Filters work as before.
2. Pick any field weld with `erectionStatus: "To Site"`. Click row → detail panel opens.
3. Change erection status to `Erected`. Verify the table row updates to show "Erected".
4. Change root % to 75, cap % to 50. Confirm UI reflects the change.
5. **Hard refresh the page** (Cmd+R / F5). The same weld still shows `Erected · root 75% · cap 50%`. (This is the
   whole point of this slice — it must work.)
6. Verify in DevTools → Application → Local Storage → key `pipeqc-erection` exists and contains the updated field
   weld.
7. Apply filter: `Erection Status = Erected`. The weld appears in the filtered subset.
8. Click another weld, set foreman confirmed = true. Refresh. Still confirmed.
9. Reset Demo from top nav. Navigate back to `/erection/weld-progress`. All edits gone — original seed values
   restored.
10. Verify `pipeqc-erection` in localStorage has been re-seeded (or the persisted state matches the seed).
11. **Track A regression:** Run a partial A1 flow (assign 5 ISOs of TP-205 to LC-01, mark ISO-1004 done with 1 X + 1
    Y). Notification "TP-205: …" fires as before. No interference from erection store.
12. **Track B regression:** `/admin?tab=teams` — add a new team. Navigate to
    `/testpack/pressure-test/blinding/preparation` — the team is selectable. (Confirms admin-store + reset wiring still
    intact.)
13. `npx tsc --noEmit` clean.
14. `npm run build` clean.

## Definition of done

- All 14 acceptance steps pass.
- New file: `store/erection-store.ts`.
- Modified files: `store/index.ts`, `store/demo-store.ts`, `app/erection/weld-progress/page.tsx`,
  `components/erection/field-weld-table.tsx`, `components/erection/field-weld-detail-panel.tsx`.
- `FIELD_WELD_DATA` in `lib/erection-weld-data.ts` **unchanged** (still serves as the seed).
- `docs/PIPEQC_CONTEXT.md`: append a note that E2.1 is merged (Erection store backing; persistence enabled).
- `docs/tracks/track-upstream.md`: in the Track E2 table, mark E2.1 status as ✅ Merged.

Report files created/modified, deviations, and any acceptance step you could not verify manually (steps 1–10 require
a browser; flag them honestly if running in a terminal-only environment).

---

После того как агент это закроет:

1. Самопроверка в браузере: пункт 5 (refresh после edit) — это критерий который отделяет «работает» от «не работает».
   Если refresh теряет данные, агент что-то не дописал.
2. Размер слайса должен быть малый (~0.5 дня в моём приоритете). Если ответ агента приходит с тоннами правок в
   dashboard или фильтрах — это значит он залез не туда; такой PR надо отбить.
3. `npm run build` clean.

## Definition of done

- All 14 acceptance steps pass.
- New file: `store/erection-store.ts`.
- Modified files: `store/index.ts`, `store/demo-store.ts`, `app/erection/weld-progress/page.tsx`,
  `components/erection/field-weld-table.tsx`, `components/erection/field-weld-detail-panel.tsx`.
- `FIELD_WELD_DATA` in `lib/erection-weld-data.ts` **unchanged** (still serves as the seed).
- `docs/PIPEQC_CONTEXT.md`: append a note that E2.1 is merged (Erection store backing; persistence enabled).
- `docs/tracks/track-upstream.md`: in the Track E2 table, mark E2.1 status as ✅ Merged.

Report files created/modified, deviations, and any acceptance step you could not verify manually (steps 1–10 require
a browser; flag them honestly if running in a terminal-only environment).
