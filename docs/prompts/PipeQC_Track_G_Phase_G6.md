# Task: PipeQC Track G, Phase G6 — Fabrication Module Structure Realignment to Manual §7

Read `docs/Easy Piping User Manual.pdf` pages 65–71 (§7.1–7.7) + page 75 (§9 Fabrication Reports), `docs/PIPEQC_CONTEXT.md`, `docs/prompts/PipeQC_Track_I_Phase_I10.md` (the parallel I10 slice that realigned Erection — G6 is its mirror image), and `docs/PIPING_FOR_NON_BUILDERS.md` (background concept: spool-level vs joint-level parallel pipelines) first. **Track G phases G1–G5 are all merged** (Spool Fabrication 8-stage funnel, Material Check, QC Release, Paint, Laydown).

G6 is a **structure-realignment slice**, not a feature slice. It corrects a manual-fidelity drift in the Fabrication sidebar that exactly parallels the Erection drift fixed by I10. It is explicitly listed as **I11 candidate #2** in the I10 prompt:

> *"Mirror the same peer-section structure inside Fabrication: per manual page 65 picture, Fabrication has Spool fabrication / Welding / NDE / Painting peer tiles. Today our Fabrication group is also flat. Apply the same I10 treatment to `/fabrication/*`."*

Additionally G6 closes a real shop/field asymmetry in the Fabrication Weld Progress screen — see "Goal" point 4 below — but the slice is still small: nav + one filter wire-up.

This slice **moves no business logic, changes no stores, mutates no seeds, and touches no acceptance behaviour** beyond a shop-only data filter on one existing screen. ~120–180 LOC of diffs across `config/navigation.ts` + `app/fabrication/weld-progress/page.tsx` (filter wiring) + one optional component-rename.

Size: **~0.2 day**.

---

## Why this slice exists (manual evidence)

### Manual §7 page 65 — "DIFFERENT SECTIONS DURING FABRICATION PHASE"

The page shows four orange peer tiles under the **Fabrication** module header:

```
┌───────────────────┬──────────┬─────┬──────────┐
│ Spool fabrication │  Welding │ NDE │ Painting │
└───────────────────┴──────────┴─────┴──────────┘
   Prep + Progress (×4 — each section has Preparation and Progress sub-tabs)
```

§7 SPOOL FABRICATION (page 65, body text) lists the 8 spool-level steps:

> *"… • Start fab • Material Check • Fabricated • QC release • Sent to paint • Painted • Final QC • Laydown"*

§7.3 Weld Progress (page 67) defines the Welding peer:

> *"In the fabrication module, the weld progress screen will shows only **shop joints only**. Welding progress is filled in the QC-13 form …"*

§11 (page 85, `manual.md` line 3180):

> *"The NDE … is one of the important modules in Easy Piping. **This screen will appear in both Fabrication and Erection modules**."*

### What this means for our nav

Per manual, the Fabrication module is:

```
Fabrication
├── (1) Spool Fabrication
│       ├── Start Fab          ← we currently surface only as "Not Started"/funnel
│       ├── Material Check     ← have screen (G2)
│       ├── Fabricated         ← funnel-only, no dedicated screen (acceptable — derived)
│       ├── QC Release         ← have screen (G3)
│       ├── Sent to Paint      ← part of Paint composite screen (G4)
│       ├── Painted            ← part of Paint composite screen (G4)
│       ├── Final QC           ← funnel-only, no dedicated screen (acceptable — derived)
│       └── Laydown            ← have screen (G5)
├── (2) Welding                ← our "Shop Weld Progress" (§7.3) — currently mis-titled "Weld Progress"
├── (3) NDE                    ← standalone /nde module, surfaced from §11 inside Fabrication
└── (4) Painting               ← our Paint composite screen (G4) doubles for this peer
```

### What we currently have

```
[CONSTRUCTION] / Fabrication
  Dashboard
  Material Check
  Weld Progress              ← unsanitised: shows ALL joints, not just shop
  QC Release
  Paint
  Laydown
```

Flat, no peer-section headers, no shop-only filter. Mirror of the pre-I10 Erection sidebar.

---

## Goal

1. **Restructure the Fabrication sidebar** to expose the four §7 peer sections via section headers (or nested groups — pick the same Option A vs B that I10 picked; consult `config/navigation.ts` to see which was chosen).
2. **Title symmetry with Erection.** The §7.3 screen is renamed in the sidebar from `Weld Progress` → **`Shop Weld Progress`** (mirror of `Site Weld Progress` in Erection). Route path stays `/fabrication/weld-progress` for back-link stability — only the sidebar label changes.
3. **Visually express the four manual sections** inside the Fabrication group:
   - The four stage screens (Material Check / QC Release / Paint / Laydown) collectively belong to the §7 "Spool Fabrication" section. Display in §7 manual order: Material Check → QC Release → Paint → Laydown. ("Start Fab", "Fabricated", "Final QC" are derived-only funnel stages; do **not** create new sidebar entries for them in G6.)
   - `Shop Weld Progress` is the §7.3 "Welding" section.
   - `Paint` doubles as the §7-Painting peer (it composites Sent to Paint + Painted + DFT today). Acceptable to leave Paint under "Spool Fabrication" header **and** mention the doubling in PR notes; do not duplicate the entry. Alternative: move Paint under a "Painting" header — pick whichever lands cleaner with how I10 handled the Material Check standalone-screen deviation.
   - The standalone NDE module stays as a top-level group (no change there). Per I10 constraint, do **not** move `/nde` under Fabrication. Optional `Field NDE` / `Shop NDE` deep-link entries are an explicit follow-up (G7 candidate), not part of G6.
4. **Fix the §7.3 manual-fidelity drift on the data side.** Page 67 says the Fabrication weld-progress screen "shows shop joints only". Today `/fabrication/weld-progress` renders the full `WeldTable` over `useWeldsStore` with no source filter, so field joints leak into it. Add a shop-only filter at the page level (mirror of the field-only treatment added to `/erection/weld-progress` in I9c). Identify the joint-source discriminator in `lib/weld-data.ts` (likely `source: 'shop' | 'field'` or a stage-prefix convention — confirm by grepping rather than guessing) and filter `filteredJoints` accordingly. If no discriminator exists yet, **stop and report** — adding a discriminator is a Track-G7 scope, not G6.
5. **Keep the existing Dashboard entry** at the top of the Fabrication group (corresponds to the Fabrication Dash Board described around §11.7 page 100).
6. **No new screens**, no new stages in `SpoolFabStage`, no changes to `STAGE_ORDER` in `lib/spool-data.ts`. Final QC / Start Fab promotion to first-class stages is G7 territory.
7. **Reversibility.** Single tightly-scoped commit. Same `git revert` discipline as I10.

---

## Implementation guidance

### Pick the same Option A / B that I10 chose

Read `config/navigation.ts` first. If I10 landed Option A (flat list with dividers / section headers), do A here. If I10 introduced two-level nested `children`, do B here. The Fabrication group must structurally match the Erection group so the sidebar reads coherently. **Do not invent a third style.**

Result (showing both Erection and Fabrication side-by-side for sanity, using Option A as illustration):

```
[CONSTRUCTION]

  Fabrication
    Dashboard
    — Spool Fabrication —
      Material Check
      QC Release
      Paint
      Laydown
    — Welding —
      Shop Weld Progress
    (Painting is doubled with Paint above — no separate entry)

  Erection
    Dashboard
    — Spool Erection —
      To Site
      Field Material Check
      Erected
      Welded / Bolted
      Supported
      RFT
    — Welding —
      Site Weld Progress
    — Flange —
      Flange Progress
```

Both halves: Dashboard at top, peer-section headers, stage entries under each.

### Shop-only filter on `/fabrication/weld-progress`

In `app/fabrication/weld-progress/page.tsx`:

1. Grep `lib/weld-data.ts` for a source-discriminating field (`source`, `weldSource`, `jointType`, `stage`, anything). If multiple candidates, prefer the one already used by `/erection/weld-progress` for its field-only filter.
2. Apply the filter inside the `filteredJoints` reducer **before** the user-controlled filters run — shop-only is an invariant of this screen, not a user choice.
3. Surface a small "Shop joints only" badge at the top of the table (mirror of the field chip in `/erection/weld-progress`) so the user understands why their search is scoped.
4. If field joints currently appear in the Fabrication weld table today, the badge + filter combination must remove them.

If `lib/weld-data.ts` does **not** already carry a shop/field discriminator (e.g. the seed treats both as same shape and only stage-derivation distinguishes them), **do not** invent a new field. Stop, document the gap in the PR, and propose G7 (add a `source` discriminator to `WeldJoint` + backfill seeds). G6 is a structural slice, not a data-model slice.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/Easy Piping User Manual.pdf` pp. 65–71 | Authoritative §7 structure. Page 65 (section diagram) + page 67 (§7.3 "shop joints only" sentence) are must-reads. |
| `docs/Easy Piping User Manual.pdf` pp. 109–115 | §12 Erection — to confirm the Spool Fab ↔ Spool Erection symmetry; helps with header copy. |
| `docs/PIPING_FOR_NON_BUILDERS.md` | Background concept: shop joint vs field joint, parallel pipelines, spool-level vs joint-level UoW. Read once if you've not internalised the spool/joint duality. |
| `docs/prompts/PipeQC_Track_I_Phase_I10.md` | Parallel slice. G6 must structurally mirror I10. Read all 270 lines — especially the "Two implementation options" + "Acceptance criteria" sections — and pick the same option. |
| `config/navigation.ts` | The rewrite site. Read end-to-end; confirm which Option I10 landed; reuse the same `children` / divider primitive. |
| `components/pipeqc/sidebar-nav.tsx` | Render layer for the sidebar. Check current divider / section-header rendering; only change if needed. |
| `app/fabrication/weld-progress/page.tsx` | Where the shop-only filter goes. |
| `app/erection/weld-progress/page.tsx` | Reference for how I9c added the field-only filter and its chip — mirror the pattern. |
| `lib/weld-data.ts` | Confirm whether a `source: 'shop' \| 'field'` (or similar) discriminator exists. |
| `lib/spool-data.ts` | Confirm `SpoolFabStage` set; verify "Start Fab" / "Final QC" status (derived vs first-class). Do **not** edit. |
| `docs/PIPEQC_CONTEXT.md` | Add a G6 merge-log entry; bump §7 manual-cross-reference row. |
| `docs/MANUAL_COVERAGE_MATRIX.md` | Bump §7 / §7.3 coverage cells. |

---

## Constraints

1. **No route changes.** `/fabrication/weld-progress`, `/fabrication/material-check`, `/fabrication/qc-release`, `/fabrication/paint`, `/fabrication/laydown` stay byte-identical. URL deep-links from notifications, README, devlog must not break.
2. **No store / seed / rollup / derive-function changes.** Pure information architecture + one read-side filter on an existing page.
3. **No new icons.** Reuse existing lucide imports (`Activity`, `Wrench`, `Paintbrush`, `Warehouse`, `ClipboardCheck`, `ShieldCheck` etc.).
4. **No new sidebar groups at the top level.** The change happens entirely inside the existing Fabrication item under `[CONSTRUCTION]`.
5. **NDE stays top-level.** Do NOT move `/nde` under Fabrication. (Same rule as I10.)
6. **Dashboard stays at the top of the Fabrication group.** First click after expanding Fabrication remains `/fabrication/dashboard`.
7. **Material Check stays in the sidebar** as a peer stage of Spool Fabrication. Do not collapse into a pop-up; same standalone-screen deviation we accepted in I10 for Field Material Check.
8. **Role visibility unchanged.** Whatever role gating exists on each entry today must carry over verbatim.
9. **Paint composite entry stays as-is.** Do not split it into Sent-to-Paint + Painted screens — that would be a feature slice, not a nav slice.
10. **`SpoolFabStage` type and `STAGE_ORDER` array in `lib/spool-data.ts` are read-only for this slice.** Adding "Start Fab" and "Final QC" as first-class stages is explicitly G7 scope.
11. **Reversibility.** One tightly-scoped commit. `git revert` should undo without conflicts.

---

## Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. The Fabrication group, in order from top to bottom, renders:
   - Dashboard
   - *(section header)* Spool Fabrication
   - Material Check
   - QC Release
   - Paint
   - Laydown
   - *(section header)* Welding
   - Shop Weld Progress
2. Section headers are not clickable, render with a muted style matching the I10 Erection headers (consistency check: open Fabrication and Erection groups side-by-side; the header treatment must be visually identical).
3. Every entry is clickable and routes to the same path it routed to before G6. No 404s.
4. The sidebar label for the Fabrication weld screen reads **`Shop Weld Progress`**. The route is still `/fabrication/weld-progress`.
5. `/fabrication/weld-progress` renders the same `WeldTable` + filter sidebar as before **but** with field joints filtered out at the page level. A "Shop joints only" badge/chip is visible near the table header.
6. Total joint count on `/fabrication/weld-progress` is strictly less than (or equal to, if seeds happen to be all-shop) the count on the same screen pre-G6. Field joints with `source === 'field'` (or whatever discriminator was confirmed) do not appear.
7. `/erection/weld-progress` is unchanged byte-for-byte (no accidental cross-side regressions).
8. `npx tsc --noEmit` clean.
9. `npm run build` clean — no Suspense, `useSearchParams`, or unused-import warnings.
10. No hydration mismatch on the sidebar after 3 hard refreshes on `/fabrication/dashboard`.
11. Documentation devlog (`/documentation`) Modules tab still lists all 6 Fabrication routes with correct paths. No "missing route" badges.

### Regression-style

12. **Fabrication narrative end-to-end**: Reset Demo → `/fabrication/material-check` (verify heat numbers) → `/fabrication/weld-progress` (shop-only joints visible) → `/fabrication/qc-release` (release) → `/fabrication/paint` (dispatch + sign-off + DFT) → `/fabrication/laydown` (place + release to site). Funnel on `/fabrication/dashboard` reflects each step. No regressions.
13. **Erection narrative end-to-end** unchanged (the Hassan walkthrough from I10). Smoke-test once.
14. Funnel on `/fabrication/dashboard` unchanged — same 8 stages, same counts, same colours.

---

## Definition of done

- **Modified files** (expected, exhaustive):
  - `config/navigation.ts` — restructure Fabrication `children` to mirror Erection's section-header layout from I10.
  - `app/fabrication/weld-progress/page.tsx` — add shop-only filter + visible badge.
  - Optionally `components/pipeqc/sidebar-nav.tsx` — only if I10 didn't already add divider/header support.
  - `docs/PIPEQC_CONTEXT.md` — append G6 merge-log entry referencing §7 pages 65–71 + the §7.3 shop-joints-only rule.
  - `docs/MANUAL_COVERAGE_MATRIX.md` — bump §7 / §7.3 cells.
- **No new files** beyond docs.
- All 14 acceptance criteria pass.
- PR description must include:
  - A side-by-side ASCII or screenshot of the **Erection** and **Fabrication** sidebars after G6, showing structural symmetry.
  - Confirmation of which option (A or B) was chosen and that it matches I10.
  - Confirmation that `/fabrication/weld-progress` now hides field joints (delta count: N before → M after, with M ≤ N).
  - Confirmation that `git diff store/ lib/ app/erection/` returns zero diffs.
  - The list of nav entries with their roles, verifying role visibility is unchanged.

---

## Manual self-check before reporting done

1. **`grep -RIn "Weld Progress" config/navigation.ts`** returns the renamed `Shop Weld Progress` label (mirror of `Site Weld Progress`).
2. **Route stability**: `grep -RIn "/fabrication/weld-progress" components/ app/ docs/` returns the same call sites as pre-G6. No href rewrites.
3. **Diff scope**: `git diff --stat` should show **only** `config/navigation.ts`, `app/fabrication/weld-progress/page.tsx`, possibly the sidebar component, and the two doc updates. If anything in `store/`, `lib/`, or `app/erection/` shows up — you over-scoped.
4. **Manual fidelity**: reopen manual page 65. The four peer tiles (Spool Fabrication / Welding / NDE / Painting) should map cleanly to your section headers + the standalone NDE top-level group, with Painting either as its own header or folded into Spool Fabrication's Paint entry (whichever you picked — document the choice).
5. **Symmetry with I10**: open the running app, expand both Fabrication and Erection groups. The structure should read as two columns of the same shape. If they diverge visually (different header style, different nesting depth, different separator height), one of the two slices is wrong.
6. **Reversibility**: `git revert` of the G6 commit must undo without conflicts.

Report files modified, the option chosen (A or B), the before/after sidebar structure, the shop/field discriminator name and pre/post joint counts on `/fabrication/weld-progress`, the diff stats, and any acceptance step you could not verify in-browser.

---

## G7 candidates surfaced by G6 (do NOT do now)

1. **Promote "Start Fab" and "Final QC" to first-class `SpoolFabStage` values** with dedicated screens (or at least dedicated funnel tiles + drilldown lists). Today they are only implied — "Start Fab" collapses into "Not Started", "Final QC" collapses into the gap between "Painted" and "Laydown". Manual §7 lists them explicitly.
2. **Add a `source: 'shop' | 'field'` discriminator to `WeldJoint`** if grep in step 4 of the implementation guidance reveals it doesn't exist yet. Backfill seeds. This is the data-model precondition that G6 may have to defer.
3. **Surface NDE inside Fabrication** via a `/nde?scope=shop` deep-link entry, mirroring the Field NDE candidate from I10's I11 list. Together those two would honour manual §11's "appears in both modules" sentence without duplicating the module itself.
4. **Split Paint composite into Sent-to-Paint + Painted screens** to match manual §7.6 / §7.7 exactly. Today they share one screen; the manual treats them as two stages. Low priority — current UX is arguably better, document as accepted deviation.
