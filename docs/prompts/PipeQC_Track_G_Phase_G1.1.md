# Task: PipeQC Track G, Phase G1.1 — Funnel navigation fix

Read `docs/PIPEQC_CONTEXT.md`, `docs/tracks/track_list.md`, and `docs/PIPEQC_TRACK_G_EXPLAINED.md` first.
Tracks A, B, E2 (E2.1/E2.3/E2.5), N (N1+N2), F2+E2.4, C1, G1 + G2 are merged.

This is a **small cleanup slice** that fixes a structural mistake in G1/G2 navigation. No new screens, no new persisted state, no enum changes. ~150–250 LOC net delta across 3 files.

---

## Why this exists (the bug in G1/G2 navigation)

G1 routed every funnel tile to `/fabrication/weld-progress?stage=<Stage>` — i.e. weld-progress was treated as a "universal list of welds filtered by spool stage". G2 carved Material Check out into its own route (`/fabrication/material-check`) but kept the same pattern internally — the MC screen has **stage chips** `All / Material Check / Weld Progress / Fabricated` and acts as a "spool list filtered by stage", not as a Material Check workspace.

The result is a confused mental model:

1. Tiles like `Fabricated`, `QC Release`, `Sent to Paint`, `Painted`, `Laydown` all point at `/fabrication/weld-progress?stage=<Stage>` — but a "welds-at-Fabricated" view is meaningless (weld-progress is for editing weld records, not browsing spools).
2. `/fabrication/material-check` *is* the Material Check workspace, yet its filter chips force the user to think in terms of cross-stage navigation. The MC-internal axis (which spools are Pending / NC / Approved) is invisible.
3. When G3 ships its own QC Release screen, the same mistake will repeat (QC Release screen with stage chips that overlap the funnel) — locking us in.

G1.1 cleans both planes:

- **Funnel** = pure status display + 1:1 launcher for stages whose screen exists. Stages without a screen are visibly inert with a "coming in G3/G4/G5" tooltip.
- **`/fabrication/material-check`** owns the Material Check axis only. Internal chips reflect the *MC record status*, not the cross-stage funnel position.
- **`/fabrication/weld-progress`** drops `?stage=` entirely — it stops pretending to be a universal list. `?spool=` (E2.3) stays.

`useSpoolsAtStage` selector stays in `store/spool-stage.ts` — G3/G4/G5 will use it when each of their stages gets its own screen.

---

## Goal

1. **Dashboard funnel** — tiles without their own screen become non-clickable (greyed, `cursor-not-allowed`, native `title` tooltip `"Coming in G3/G4/G5"`). Only `Weld Progress` and `Material Check` tiles are clickable, rendered as plain `<Link>` to their own routes **without** any `?stage=` query.
2. **`/fabrication/weld-progress`** — remove all `?stage=` plumbing (state, useEffect branch, filter, chip, per-stage empty-state copy, `useSpoolsAtStage` import). `?spool=` chip from E2.3 stays exactly as today.
3. **`/fabrication/material-check`** — remove stage chips and `?stage=` URL sync. Add internal status chips `All / Pending / Approved / NC` computed from the MC record. Replace `?stage=` URL param with `?status=`.
4. **`useSpoolsAtStage`** selector stays untouched in `store/spool-stage.ts`. G3/G4/G5 will consume it from their own screens.
5. **Do not** modify the enum, `STAGE_ORDER`, `STAGE_COLOR`, `deriveFabStage`, the spools store, the welds store, or `config/navigation.ts`.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `components/fabrication-dashboard.tsx` (lines 212–269, `FunnelSection`) | The funnel. Only this section is touched. |
| `app/fabrication/weld-progress/page.tsx` | `?stage=` handling to remove. Mind the `?spool=` path — must stay. |
| `components/fabrication/material-check-view.tsx` | Stage chips + URL sync to rework into MC-status chips. |
| `lib/spool-data.ts` | `MaterialCheckRecord` — read-only source for the new status derivation. |
| `store/spool-stage.ts` | `useSpoolsAtStage` lives here — confirm it stays as-is and remains re-exported. |

---

## 1. Funnel changes — `components/fabrication-dashboard.tsx`

Replace the `href` branching inside `FunnelSection` with an explicit screen map. Pseudo:

```tsx
const STAGE_SCREENS: Partial<Record<SpoolFabStage, string>> = {
  "Material Check": "/fabrication/material-check",
  "Weld Progress":  "/fabrication/weld-progress",
  // Fabricated / QC Release / Sent to Paint / Painted / Laydown / Not Started
  // — no screen yet; G3/G4/G5 will add them.
}

const tile = (...) // existing JSX

const screen = STAGE_SCREENS[stage]
if (!screen) {
  return (
    <div
      key={stage}
      className={[
        "cursor-not-allowed opacity-60",
        count === 0 ? "opacity-40" : "",
      ].join(" ")}
      title="Coming in G3/G4/G5"
    >
      {tile}
    </div>
  )
}

return (
  <Link key={stage} href={screen} className="block">
    {tile}
  </Link>
)
```

Notes:

- Drop the existing `if (isEmpty) { ... }` early return — clickability is no longer driven by count. A populated `Fabricated` tile still renders non-clickable; an empty `Material Check` tile still renders as a `<Link>` (so the user can click into the empty screen and see "no spools at this status").
- The `Coming in G3/G4/G5` tooltip is a native `title` attribute — no shadcn tooltip needed, no extra deps.
- The color rail, count, and subtitle stay exactly as today. The visual change is: 6 of 8 tiles get a slightly dimmer treatment and `cursor-not-allowed`.

---

## 2. weld-progress changes — `app/fabrication/weld-progress/page.tsx`

Remove every line that references `stage`:

- `useState<SpoolFabStage | null>(null)` for `stageFilter` — delete.
- `searchParams.get("stage")` branch in the `useEffect` — delete.
- `useSpoolsAtStage(stageFilter ?? "Not Started")` call — delete.
- `clearStageFilter` function — delete.
- The `stageFilter && !spoolsAtStage.includes(joint.spoolNo)` line inside `filteredJoints` — delete.
- The `{stageFilter && (<div>... Stage: ... </div>)}` chip block — delete.
- The `{filteredJoints.length === 0 && stageFilter && (...) }` empty-state block — delete entirely (the table's own empty rendering takes over).
- The `type SpoolFabStage` import — delete if no other use remains.
- The `useSpoolsAtStage` import — delete from this file (the selector itself stays in `store/spool-stage.ts`).

`?spool=` plumbing (state, useEffect branch, chip JSX, clear button, filter condition) stays exactly as today.

After the edit, the imports section likely shrinks to `useWeldsStore` only from `@/store`.

---

## 3. material-check changes — `components/fabrication/material-check-view.tsx`

Replace the stage axis with an MC-status axis. The screen becomes a true Material Check workspace listing **only spools that have an MC record** (today it iterates all stages → all spools; switch to `records.map(...)`).

### New status derivation

```tsx
type MCStatus = "All" | "Pending" | "Approved" | "NC"

function deriveMCStatus(rec: MaterialCheckRecord): Exclude<MCStatus, "All"> {
  if (rec.pieces.some((p) => p.status === "Non-conformance")) return "NC"
  if (rec.signedOffDate) return "Approved"
  return "Pending"
}
```

Semantics:
- **NC** wins over Approved (an NC piece is loud even if other pieces are cleared and the spool was signed off — rare in seed, but the rule must hold).
- **Approved** = `signedOffDate` is set AND no NC piece.
- **Pending** = no `signedOffDate` AND no NC piece (typically: pieces still in `Pending` or partially `Cleared`, sign-off not yet performed).

### Chips

Replace `FILTER_STAGES`, `StageChip`, and `setStage` with:

```tsx
const MC_STATUSES: MCStatus[] = ["All", "Pending", "Approved", "NC"]

// counts: { All: N, Pending: a, Approved: b, NC: c } from records.map(deriveMCStatus)
```

Render as a chip strip — keep the same visual treatment (`bg-sky-600 text-white` active, count pill on the right). Default active chip: `All`. URL sync: `?status=Pending|Approved|NC`; absence of the param or unknown value → `All`.

### Table

- Iterate `records` instead of `[...stages.entries()]` — only spools with an MC record are shown.
- Filter rows by the active `MCStatus`.
- Search input: matches `spoolNo` OR any piece's `heatNumber` (unchanged).
- Keep the **Stage** column (using `useSpoolStages().get(spoolNo)` per row) — it's informative; the user wants to know that an Approved spool is now sitting at "Weld Progress". Stage column is read-only, no longer used for filtering.
- Other columns (Pieces with NC count, Inspector, Signed off, row-click → opens panel) — unchanged.

### URL params

- `?status=Pending|Approved|NC` (default `All` when absent).
- `?spool=PL-XXX` (unchanged; opens detail panel; coexists with `?status`).

Empty state: `"No spools at this status."`

`MaterialCheckDetailPanel` mount and `closePanel()` behavior unchanged — but the redirect inside the panel needs one tiny edit: `router.replace("/fabrication/material-check?stage=Material%20Check")` (sign-off handler) → change to `router.replace("/fabrication/material-check?status=Pending")` so the user lands back on the Pending bucket after sign-off (which will now be one shorter).

---

## 4. Constraints

1. No new npm dependencies. No new files. Modify only the 3 files listed below + 2 doc updates.
2. **Do not** change `lib/spool-data.ts`, `store/spools-store.ts`, `store/spool-stage.ts`, `store/welds-store.ts`, `config/navigation.ts`, or any other store/lib.
3. `useSpoolsAtStage` must remain exported from `store/spool-stage.ts` and re-exported from `store/index.ts` — G3/G4/G5 need it.
4. SSR-safe: no new `Date` usage outside `useEffect`.
5. No regression to G2 sign-off, NC remarks, Save Draft, detail panel notification, or seed.

---

## 5. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. `/fabrication/dashboard` funnel renders 8 tiles. Only `Weld Progress` and `Material Check` show a pointer cursor and respond to clicks; the other 6 show `cursor-not-allowed` and a native tooltip `"Coming in G3/G4/G5"` on hover. Clicking one of them does nothing.
2. Click `Material Check` tile → navigates to `/fabrication/material-check` (no query string). Default chip `All` is active. All spools with an MC record are listed.
3. Click `Pending` chip → URL becomes `/fabrication/material-check?status=Pending`. Only spools where the MC record has no `signedOffDate` AND no NC piece appear.
4. Click `NC` chip → only spools with ≥1 `Non-conformance` piece appear. With fresh seed, `PL-CW200-003-A` is in this list.
5. Click `Approved` chip → only spools with `signedOffDate` set AND no NC piece (the pre-signed-off seed spools).
6. Click a spool row → detail panel opens. URL becomes `?status=<current>&spool=PL-XXX`. Sign off / Save Draft / NC remark validation still work as in G2.
7. After sign-off, panel closes; URL becomes `?status=Pending` (drops `?spool=`); the just-signed spool disappears from the `Pending` chip view and appears under `Approved` after a chip click.
8. Click `Weld Progress` funnel tile → `/fabrication/weld-progress` (no query string). Page loads with the standard FilterBar + weld table; no stage chip rendered.
9. Paste `/fabrication/weld-progress?stage=Material%20Check` into the URL — the param is ignored; no chip, no per-stage empty-state copy; welds list renders unfiltered (or per FilterBar defaults).
10. `/fabrication/weld-progress?spool=PL-CW200-006-A` — spool chip still renders, table filters to that spool only (E2.3 regression).

### Regression

11. `/fabrication/material-check` — G2 demo flow still works end-to-end: open `PL-CW200-003-A` (NC spool) → add remark for the NC piece → clear another piece → sign off → toast + home notification fire as before. Spool's `fabStage` flips to `Weld Progress`; it disappears from `Pending`/`NC`, appears under `Approved`.
12. `/erection/dashboard`, `/nde`, `/tracking`, `/testpack/*` untouched — visual + interaction parity with current main.
13. `Reset Demo` from top nav — funnel + MC list both revert to seed distribution; the NC anchor is back.

### Build

14. `npx tsc --noEmit` clean.
15. `npm run build` clean — no new warnings.
16. No hydration warnings on first load (DevTools console).

---

## 6. Definition of done

- Modified files (no new files):
  - `components/fabrication-dashboard.tsx` — `STAGE_SCREENS` map + clickability branch.
  - `app/fabrication/weld-progress/page.tsx` — strip all `?stage=` plumbing.
  - `components/fabrication/material-check-view.tsx` — replace stage axis with MC-status axis; iterate `records` not `stages`; tweak post-sign-off redirect.
  - `components/fabrication/material-check-detail-panel.tsx` — one-line redirect target change (`?status=Pending` instead of `?stage=Material%20Check`).
  - `docs/PIPEQC_CONTEXT.md` — append merge-log entry for G1.1.
  - `docs/tracks/track_list.md` §7 — note `G1.1 funnel-nav cleanup merged`.
- All 16 acceptance criteria pass.
- ~150–250 LOC net delta. If over 350, you over-refactored.

---

## 7. Manual self-check before reporting done

1. **Cursor check (AC #1)**: hover all 8 tiles in the funnel. Only 2 give a pointer cursor.
2. **Demo flow check (AC #11)**: run the full G2 NC sign-off flow by hand. The MC notification still fires.
3. **`git diff --stat main`** touches only the 4 files above plus the 2 docs.
4. `grep -rn "stageFilter\|setStageFilter" app/fabrication/weld-progress/` returns 0 matches.
5. `grep -rn "useSpoolsAtStage" .` still finds the export in `store/spool-stage.ts` and the re-export in `store/index.ts` — both intact for future G3/G4/G5 consumers.
6. `grep -rn "FILTER_STAGES\|StageChip" components/fabrication/` returns 0 matches.

Report files modified, the LOC delta, and confirmation that the `?spool=` chip on weld-progress still works.
