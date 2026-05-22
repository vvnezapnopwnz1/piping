# Task: PipeQC Track I, Phase I10 — Erection Module Structure Realignment to Manual §12

Read `docs/Easy Piping User Manual.pdf` pages 109–115 (§12.1–12.9), `docs/marker-output/manual.md` lines 3178–3186 (§11 NDE) + 4120–4360 (§12 Erection), `docs/PIPEQC_CONTEXT.md`, and `docs/prompts/PipeQC_Track_I_Phase_I9_Backlog.md` first. **Track I phases I1–I8 + I9a/I9b/I9c are merged.** I9d (`I9.7 — insert Flange Verification stage`) remains intentionally deferred and is **not** part of I10.

I10 is a **structure-realignment slice**, not a feature slice. It corrects a manual-fidelity drift introduced by I9c-option-B: we invented an `ERECTION ANALYTICS` sidebar group, moved `Site Weld Progress` out of the Erection group, and re-ordered `Flange Progress` to sit between `Erected` and `Welded / Bolted`. None of these are in Easy Piping §12. The manual organises the Erection module as **four peer sections** (Spool Erection / Welding / NDE / Flange) plus a Dashboard, where "Welding" is the field-joint weld progress screen and "Flange" is the field flange-joint screen. Our current sidebar groups them differently.

This slice **moves no business logic, changes no stores, mutates no seeds, and touches no acceptance behaviour**. It is purely the sidebar information architecture + section labels. ~80–150 LOC of diffs across `config/navigation.ts` (and possibly a small types tweak if grouping support is needed).

Size: **~0.15 day**.

---

## Why this slice exists (manual evidence)

### Manual §12 page 109 — "ARTICLE I. DIFFERENT SECTIONS DURING ERECTION PHASE"

The page shows four orange peer tiles under the **Erection** module header:

```
┌────────────────┬────────────┬──────┬────────┐
│ Spool erection │  Welding   │ NDE  │ Flange │
└────────────────┴────────────┴──────┴────────┘
   Prep + Progress (×4 — each section has Preparation and Progress sub-tabs)
```

The left-hand sidebar on the same screenshot lists, under both Preparation and Progress columns:

```
Preparation        Progress
Spool Erection     Spool Erection
Weld               Weld
NDE                NDE
Flange             Flange
```

§12.1 (page 109) defines "Spool Erection" as the section containing the spool-level progress steps:

> *"This screen contains two different sections which is preparation and progress. The preparation screen allows the user to plan and prepare the workload. The progress screen consists of several steps that user needs to follow… • To Site • Erected • Welded/Bolted • Supported • RFT"*

§12.3 (page 111) defines "Weld Progress":

> *"In the Erection module, the weld progress screen will show only the field joints. Welding progress is filled in the W-24 form…"*

§11 (page 85, line 3180 of `manual.md`):

> *"The NDE (Non Destructive Examination) Management is one of the important modules in Easy Piping… **This screen will appear in both Fabrication and Erection modules**."*

### What this means for our nav

Per manual, the Erection module is:

```
Erection
├── (1) Spool Erection
│       ├── To Site
│       ├── Erected
│       ├── Welded / Bolted
│       ├── Supported
│       └── RFT
├── (2) Welding              ← our "Site Weld Progress" (§12.3)
├── (3) NDE                  ← surfaced from §11 inside Erection (field welds only)
├── (4) Flange               ← our "Flange Progress" (§12.4 + §19.2)
└── Dashboard
```

Material Check (§12.2) is described in the manual as a **pop-up window inside Weld Progress** (page 110: *"In the weld progress screen, the user can access the 'material traceability' pop-up window"*) — not as a peer section. Our I7 made it a standalone screen, which is a UX upgrade over the manual; **we keep that deviation** (documented exception, not regression).

### What we currently have

```
[ERECTION]
  Dashboard
  To Site
  Field Material Check
  Erected
  Flange Progress          ← misplaced (peer per manual, not stage)
  Welded / Bolted
  Supported
  RFT

[ERECTION ANALYTICS]         ← invented label, not in manual
  Site Weld Progress         ← belongs inside Erection per manual

[NDE MODULE]   (top-level)   ← correct location for the standalone module
```

`ERECTION ANALYTICS` is our own invention from I9c-option-B. Per §12 it has no manual basis. **I10 retires the label and folds the screen back into Erection.**

---

## Goal

1. **Retire the `ERECTION ANALYTICS` sidebar group** entirely. Move `Site Weld Progress` back into the Erection group.
2. **Restore Flange Progress as a peer-section** of Spool Erection, not a stage between Erected and Welded/Bolted. Sit it after the spool-stage block.
3. **Visually express the four manual sections** inside the Erection group:
   - The five stage screens (To Site / Field Material Check / Erected / Welded / Bolted / Supported / RFT) collectively belong to the §12.1 "Spool Erection" section.
   - `Site Weld Progress` is the §12.3 "Welding" section.
   - `Flange Progress` is the §12.4/§19.2 "Flange" section.
   - The standalone NDE module stays as a top-level Erection-adjacent group (no change there). Optionally add a deep-link entry "Field NDE" inside Erection that routes to `/nde?scope=field` — **out of scope for I10** (call out as I11 candidate).
4. **Keep the existing Dashboard entry** at the top of the Erection group. It corresponds to §12.9 ERECTION DASH BOARD.
5. **Keep Field Material Check** as a standalone sidebar entry under the Spool Erection block (documented deviation from manual; better UX than pop-up).
6. **No changes** to any route paths, store, component, or acceptance behaviour. Routes stay at `/erection/weld-progress`, `/erection/flange-progress`, etc. — only sidebar structure changes.

---

## Two implementation options

Pick **A** unless a sidebar component refactor is acceptable. Both options ship the same manual fidelity; A is cheaper.

### Option A — Flat list with visual separators

Use the existing `config/navigation.ts` `children` array on the Erection group, keep it flat, but use the existing `divider` / label pattern that the sidebar component already supports (verify in `components/app-sidebar.tsx` or wherever the sidebar is rendered). If a divider isn't supported, add minimal support: an entry with `{ kind: 'divider', label: 'Spool Erection' }` rendered as a muted section header.

Result:

```
[ERECTION]
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

Pros: 1 file changed (`config/navigation.ts`), maybe a 10-line sidebar component tweak. Reversible. No type explosion.

Cons: visual hierarchy is implicit, not nested.

### Option B — Nested sub-sections

Extend the navigation type to support `children` two levels deep:

```ts
{
  title: 'Erection',
  children: [
    { title: 'Dashboard', href: '/erection/dashboard', icon: LayoutDashboard },
    {
      title: 'Spool Erection',
      children: [
        { title: 'To Site', href: '/erection/to-site' },
        // …
      ],
    },
    {
      title: 'Welding',
      children: [
        { title: 'Site Weld Progress', href: '/erection/weld-progress' },
      ],
    },
    {
      title: 'Flange',
      children: [
        { title: 'Flange Progress', href: '/erection/flange-progress' },
      ],
    },
  ],
}
```

Pros: 1:1 with manual structure. Future-proof if more peers added.

Cons: requires sidebar component to render two-level groups (current code likely supports only one level). Bigger touch, real refactor risk.

**Recommendation: Option A** unless the sidebar component already supports nested groups out of the box (audit first; if it does, do B).

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/Easy Piping User Manual.pdf` pp. 109–115 | Authoritative §12 structure. Pages 109 + 110 are the must-reads (section diagram + Material Check pop-up note). |
| `docs/marker-output/manual.md` lines 3178–3186 + 4120–4360 | Text version of §11 NDE + §12 Erection. |
| `config/navigation.ts` | Where the rewrite happens. Read end-to-end before editing; understand the existing nav-group + items type. |
| `components/app-sidebar.tsx` (or equivalent — locate via grep for `navigation` import) | Render layer. Check whether dividers/section headers are already supported. If yes, Option A is trivial. If no, decide: add divider support OR fall back to two-level nesting. |
| `docs/prompts/PipeQC_Track_I_Phase_I9_Backlog.md` | Confirm I10 doesn't re-open I9.4 / I9.5 / I9.6 work — those are done. I10 *partially reverts* I9.4-option-B (kills the Analytics group) and *re-evaluates* I9.5 (Flange Progress position) per manual evidence the audit didn't have at the time. |
| `docs/PIPEQC_CONTEXT.md` | Add an I10 merge-log entry; bump §12 manual-cross-reference row. |

---

## Constraints

1. **No route changes.** `/erection/weld-progress`, `/erection/flange-progress`, etc. stay byte-identical. URL deep-links from notifications, README, manual_i2.md must not break.
2. **No store, no seed, no rollup, no derive-function changes.** Pure information architecture.
3. **No new icons.** Reuse existing lucide imports (`Activity`, `Bolt`, etc.). If a section header uses an icon, prefer a generic `LayoutDashboard` / `Workflow` / `Layers` already present in the file.
4. **NDE stays top-level.** Do NOT move `/nde` under Erection. The manual treats NDE as a shared module that *surfaces* inside Erection — that surfacing is an optional future feature (I11 candidate: `/nde?scope=field` deep-link from inside Erection).
5. **Dashboard stays at the top of the Erection group.** First click after expanding Erection should remain `/erection/dashboard`.
6. **Field Material Check stays in the sidebar** as a peer of the other Spool Erection stages. Do not collapse it into a pop-up. The standalone-screen design is an accepted deviation from manual §12.2.
7. **Role visibility unchanged.** Whatever role gating exists on each entry today must carry over verbatim.
8. **Reversibility.** I10 is one tightly-scoped commit so it can be reverted cleanly if a downstream user objects to the nesting.

---

## Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. The sidebar no longer renders a top-level `ERECTION ANALYTICS` group. `grep -n "ERECTION ANALYTICS" config/navigation.ts` returns nothing.
2. The Erection group, in order from top to bottom, renders:
   - Dashboard
   - *(section header)* Spool Erection
   - To Site
   - Field Material Check
   - Erected
   - Welded / Bolted
   - Supported
   - RFT
   - *(section header)* Welding
   - Site Weld Progress
   - *(section header)* Flange
   - Flange Progress
3. Every entry is clickable and routes to the same path it routed to before I10. No 404s.
4. Section headers are not clickable links. They render with a muted style distinct from the entries.
5. NDE Module remains at its current top-level position; no children changes.
6. REPORTS / TRACKING / FABRICATION groups are byte-identical to pre-I10.
7. Funnel on `/erection/dashboard` unchanged — same 7 tiles, same counts, same colours.
8. Notification deep-links (`href: "/erection/dashboard"`, `href: "/erection/flange-progress?..."`) still resolve. Trigger a flange-progress verification → home notification → click → navigates correctly.
9. `git diff store/ lib/ app/` returns **zero diffs**. (Only `config/navigation.ts` and possibly the sidebar component file should appear in the diff.)
10. `npx tsc --noEmit` clean.
11. `npm run build` clean — no Suspense, `useSearchParams`, or unused-import warnings.
12. No hydration mismatch on the sidebar after 3 hard refreshes on `/erection/dashboard`.
13. Documentation devlog (`/documentation`) Modules tab still lists all 8 erection routes with correct paths. No "missing route" badges.

### Regression-style

14. **Erection narrative end-to-end** (the Hassan walkthrough): Reset Demo → `/erection/to-site` (receive) → `/erection/material-check` (verify) → `/erection/erected` (place) → `/erection/welded-bolted` (confirm; the I9b gate still requires all flange bolts Verified) → `/erection/supported` → `/erection/rft` auto-fires. No path regressions.
15. **Site Weld Progress** still renders the FieldFilterBar + the I9c-added chip row + field-weld table. Same filter behaviour.
16. **Flange Progress** still renders the I8 chips + Assign / Record / Verify panel modes. No behavioural drift.

---

## Definition of done

- **Modified files** (expected, exhaustive):
  - `config/navigation.ts` — restructure Erection `children`, retire the `ERECTION ANALYTICS` group.
  - Sidebar render component (locate first) — only if Option A requires divider rendering support.
  - `docs/PIPEQC_CONTEXT.md` — append I10 merge-log entry referencing pages 109–115 of the manual; bump §12 cross-reference row to read *"§12 Erection module — Spool Erection / Welding / Flange peer-sections per manual, with Field Material Check as a documented standalone-screen deviation"*.
  - `docs/prompts/PipeQC_Track_I_Phase_I9_Backlog.md` — mark I9.4 + I9.5 statuses as *"superseded by I10"* (keep history; don't delete).
- **No new files** beyond docs.
- All 16 acceptance criteria pass.
- PR description must include:
  - A side-by-side screenshot or ASCII before/after of the Erection sidebar.
  - Which option (A or B) was chosen and why.
  - Confirmation that `git diff store/ lib/ app/ components/erection/` returns zero diffs.
  - The list of nav entries with their roles, verifying role visibility is unchanged.

---

## Manual self-check before reporting done

1. **`grep -RIn "ERECTION ANALYTICS" .`** returns no matches outside backlog/history docs.
2. **Route stability**: `grep -RIn "/erection/weld-progress\|/erection/flange-progress" components/ app/` returns the same call sites as pre-I10. No href rewrites.
3. **Diff scope**: `git diff --stat` should show **only** `config/navigation.ts` (and possibly one sidebar component file + the two doc updates). If anything in `store/`, `lib/`, or `app/erection/` shows up — you over-scoped.
4. **Manual fidelity**: reopen the manual page 109 screenshot. The "Erection" peer tiles (Spool Erection / Welding / NDE / Flange) should map 1:1 to your section headers (NDE excepted — it stays top-level by design).
5. **Reversibility**: the change should be a single commit that `git revert` undoes cleanly without conflicts. If not, the touch is too broad.

Report files modified, the option chosen (A or B), the before/after sidebar structure, the diff stats, and any acceptance step you could not verify in-browser.

---

## I11 candidates surfaced by I10 (do NOT do now)

1. Add a deep-link entry "Field NDE" inside Erection that routes to `/nde?scope=field` and pre-filters the NDE module to field-side joints. Manual §11 / line 3180 says NDE appears in both Fabrication and Erection — this would honour that without duplicating the module.
2. Mirror the same peer-section structure inside Fabrication: per manual line 2393 picture text, Fabrication has *Spool fabrication / Welding / NDE / Painting* peer tiles. Today our Fabrication group is also flat. Apply the same I10 treatment to `/fabrication/*`.
3. Optionally collapse `Field Material Check` into a pop-up from `Site Weld Progress` to fully match manual §12.2. Not recommended — we already validated the standalone screen as the better UX. Document as a closed deviation.
