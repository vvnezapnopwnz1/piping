# PipeQC — Project Context for Claude Code

> Read this file fully before starting work. It contains everything you need
> to understand the project, the conventions, the current state, and the
> immediate task.

---

## What we're building

PipeQC is a demo-quality prototype of an industrial piping construction
QC management system, modeled on TechnipFMC's **Easy Piping** (a system
used on large EPC projects — LNG plants, refineries, petrochemical units).

**Goal:** investor/client demo fidelity, presented in ~1 week.
**Not goal:** production code, real backend, multi-user.

The Easy Piping User Manual (TechnipFMC, 156 pages) is the source of truth
for all domain logic. When in doubt about a workflow, terminology, or UI
expectation, refer to the manual — not to your training data.

Supplementary domain research (presentations, role matrices) lives under
`docs/research/` and `docs/role_matrix/` — use when the manual is silent
on operational context, competitive framing, or per-role capability scope.

---

## Domain research & planning (2026-05-19 — 2026-05-22)

| Artifact | Path | What it captures |
| -------- | ---- | ---------------- |
| Presentation findings | `docs/research/presentation_findings.md` | All **10** Easy Piping sales/training decks read sequentially (#1 PSMS overview → #10 Painting). Cross-cutting findings CC-1…CC-23 (RFT formula, punch X/Y/Z gates, Generate Request pattern, role hierarchy, SpoolGen/Marian data flow, competitive positioning). Module-specific gaps per deck. |
| Role matrices | `docs/role_matrix/*.md` | Per-role function inventories with ✅ live / ⚠ partial / 📋 planned / ❌ missing tags: `qc_engineer`, `nde_inspector`, `project_manager`, `spooling_team`, `subcontractor`, `system_admin` (+ approach notes in `chat_gpt_on_role_matrix_aproach.md`). Ground truth for **what to build next** — triage consolidated in each matrix's gap table. |
| Roadmap v3 | `docs/roadmap_v3.md` | Module-by-module delivery order (Phase 0 Admin → … → Phase 7 polish). Replaces capability-first v2 sequencing. **Current focus after Phase 0:** Phase 1 Spooling. |
| Archived phase prompts | `docs/prompts/archive/` | Completed track prompts (A*, G*, I*, N*, etc.) moved out of `docs/prompts/` root during docs housekeeping. |

**Recent merge milestones (not yet in older agent context):**

- **G6 / I10** (2026-05-20) — Fabrication + Erection sidebar trees realigned to manual §7 / §12 peer sections; recursive `sidebar-nav.tsx`.
- **I8 + I9a/b/c** (2026-05-19) — Field flange bolt progress (`/erection/flange-progress`); I4 Confirm gated on all flange bolts Verified; RFT eligibility includes `flangeRollup.allVerified`; NC chip on Field MC; expanded flange-bolt seed coverage.
- **Phase 0 Admin** (2026-05-22) — All 9 roadmap slices merged: project definition, system referential, WPS / welder qual / NDE matrix / PDS areas / heat registry / rework codes / joint categories / teams CRUD in `admin-store` v3.

---

## Tech stack

| Layer      | Choice                                | Notes                                |
| ---------- | ------------------------------------- | ------------------------------------ |
| Framework  | Next.js 16.2.6 App Router             | All routes under `app/`              |
| Language   | TypeScript (strict)                   |                                      |
| Styling    | Tailwind CSS                          | No CSS modules, no styled-components |
| Components | shadcn/ui (style: "new-york")         | Already installed                    |
| Icons      | `lucide-react`                        |                                      |
| Charts     | `recharts`                            |                                      |
| State      | `zustand@5.0.13` + persist middleware | localStorage backed                  |
| Toasts     | `sonner`                              | Already wired                        |

Do **not** add new dependencies without confirming with the user first.

---

## Design system

Color tokens (Tailwind classes):

| Role                  | Color                                                         |
| --------------------- | ------------------------------------------------------------- |
| Primary               | `sky-600` / `#2563EB`                                         |
| Success               | `emerald-500`, `emerald-600`, `emerald-50` (bg)               |
| Warning               | `amber-500`, `amber-600`, `amber-50`                          |
| Danger                | `red-500`, `red-600`, `red-50`                                |
| Info / neutral accent | `sky-500`, `sky-50`                                           |
| In-review / special   | `violet-500`, `violet-50`                                     |
| Surface               | `slate-50` background, `slate-200` borders                    |
| Text                  | `slate-900` primary, `slate-600` secondary, `slate-500` muted |

**Status badge pattern:** use `components/status-badge.tsx`. Don't roll your own.
**Table density:** match `components/weld-table.tsx`.
**Dashboard density:** match `components/fabrication-dashboard.tsx`.
**Side panel pattern:** match `components/weld-detail-panel.tsx`.

---

## File structure — current state (verified 2026-05-22)

```
app/
  page.tsx                              # Home — notifications dashboard ✅
  fabrication/
    dashboard/page.tsx                  # Fabrication Dashboard ✅
    material-check/page.tsx             # Material Check (G2) ✅
    paint/page.tsx                        # Paint dispatch & sign-off (G4) ✅
    qc-release/page.tsx                 # QC Release (G3) ✅
    weld-progress/page.tsx              # Weld Progress + CRUD ✅
    laydown/page.tsx                      # Laydown yard placement & release (G5) ✅
  nde/page.tsx                          # NDE Batch Management ✅
  tracking/page.tsx                     # Spool Tracking ✅
  erection/
    dashboard/page.tsx                  # Erection Dashboard ✅
    to-site/page.tsx                    # To Site receipt confirmation (I2) ✅
    weld-progress/page.tsx              # Site Weld Progress ✅
    flange-progress/page.tsx            # ✅ Field Flange Bolt Progress (I8)
    material-check/page.tsx             # Field Material Check (I7)
    erected/page.tsx                    # I3
    welded-bolted/page.tsx              # I4 (I9b flange gate)
    supported/page.tsx                  # I5
    rft/page.tsx                        # I6
  testpack/
    page.tsx                            # ⚠ shell only — needs overview/landing
    pressure-test/page.tsx              # ✅ Pressure Test Homepage (sum view)
    pressure-test/line-check/page.tsx   # redirect → /testpack/pressure-test
    pressure-test/line-check/preparation/page.tsx  # Line Check Preparation (A1)
    pressure-test/line-check/progress/page.tsx     # Line Check Progress (A1)
    pressure-test/item-clearance/page.tsx # redirect → /testpack/pressure-test
    pressure-test/item-clearance/preparation/page.tsx  # Item Clearance Preparation (A2)
    pressure-test/item-clearance/progress/page.tsx     # Item Clearance Progress (A2)
    pressure-test/blinding/page.tsx     # redirect → /testpack/pressure-test
    pressure-test/blinding/preparation/page.tsx  # Blinding Preparation (A4)
    pressure-test/blinding/progress/page.tsx     # Blinding Progress (A4)
    pressure-test/testing-precomm/page.tsx # redirect → /testpack/pressure-test
    pressure-test/testing-precomm/progress/page.tsx  # Testing & Pre-comm Progress (A5)
    pressure-test/reinstatement/page.tsx # redirect → /testpack/pressure-test
    pressure-test/reinstatement/preparation/page.tsx  # Reinstatement Preparation (A6)
    pressure-test/reinstatement/progress/page.tsx     # Reinstatement Progress (A6)
    explorer/page.tsx                   # ✅ Testpack Explorer (3 levels × 4 tabs)
  flange/page.tsx                       # ✅ Flange Browse + Detail Panel
  admin/page.tsx                        # ✅ Admin overview (5 sub-module cards)
  admin/project-definition/page.tsx     # ✅ Phase 0.1 — project definition form (store-backed)
  admin/system-referential/page.tsx     # ✅ Phase 0.7 — 4 system-ref cards + inline add
  admin/project-referential/page.tsx    # ✅ Phase 0 — <AdminTabs /> + Piping Material List tab
  admin/access-rights/page.tsx          # ⚠ shell — role/scope UI scaffold
  admin/import-settings/page.tsx        # ⚠ shell — Excel import templates (Phase 7 defer)
  admin/admin-tabs.tsx                  # ✅ 8-tab referential CRUD with ?tab= URL sync
  spooling/page.tsx                     # ✅ IA1 home hub (links to 3 sub-routes)
  spooling/engineering-transmittals/      # ⚠ placeholder
  spooling/iso-workflow/                # ⚠ placeholder (+ demo import elsewhere)
  spooling/spooling-transmittal/          # ⚠ placeholder
  reports/page.tsx                      # ⚠ placeholder (header only)
  documentation/page.tsx                # ✅ 4-tab devlog (Overview / What works / Modules / Tracks & Stories)
  settings/                             # ⚠ placeholder

components/
  pipeqc/
    sidebar-nav.tsx                     # role-based nav
    top-nav.tsx                         # role switcher, reset, demo badge
  fabrication/
    paint-view.tsx                        # Paint list (G4)
    paint-detail-panel.tsx                # Paint dispatch / sign-off Sheet (G4)
    laydown-view.tsx                      # Laydown list (G5)
    laydown-detail-panel.tsx              # Place on yard / release Sheet (G5)
  fabrication-dashboard.tsx             # ← reference dashboard pattern
  weld-table.tsx                        # ← reference table pattern
  weld-detail-panel.tsx                 # ← reference side panel pattern
  filter-sidebar.tsx
  status-badge.tsx                      # ← always use this
  nde/
    batch-management-view.tsx
    batch-detail-panel.tsx
    create-batch-dialog.tsx             # ✅ N1 — 2-step Create Batch wizard
    receive-results-panel.tsx           # ✅ N2 — per-weld Receive Results sheet
  erection/
    erection-status-badge.tsx
    field-filter-sidebar.tsx
    field-weld-table.tsx
    field-weld-detail-panel.tsx         # ✅ store-backed after E2.1
    to-site-view.tsx                    # To Site list (I2)
    to-site-detail-panel.tsx            # W-24 receipt Sheet (I2)
    flange-progress-view.tsx            # ✅ Field flange bolt progress (I8)
    flange-progress-detail-panel.tsx    # assign / record / verify torque per joint
  erection-dashboard.tsx                # ✅ live KPIs + clickable funnel (I1 + I2) + flange aux KPI (I8)
  admin/
    teams-tab.tsx                       # ✅ 5 collapsible team sections (B9)
    subcontractors-tab.tsx
    pds-area-tab.tsx                    # ✅ PDS × subcontractor matrix (B4)
    welder-qualifications-tab.tsx
    wps-tab.tsx                         # ✅ store-backed WPS CRUD (B5)
    nde-matrix-tab.tsx
    rework-codes-tab.tsx                # ✅ store-backed CRUD (B8)
    joint-categories-tab.tsx            # ✅ edit description/examples (B8)
    piping-material-list-tab.tsx        # ✅ heat registry (B7)
    add-team-dialog.tsx
    add-subcontractor-dialog.tsx
    add-wps-dialog.tsx
    add-rework-code-dialog.tsx
    edit-joint-category-dialog.tsx
  spool-tracking-dashboard.tsx
  testpack/
    pressure-test-homepage.tsx          # 480 LOC
    testpack-explorer.tsx               # 1455 LOC (largest screen)
    iso-level-view.tsx                  # drill-down ISO panel
    release-work-dialog.tsx             # work-release modal
    line-check/
      preparation-view.tsx              # Line Check Preparation UI (A1)
      progress-view.tsx                 # Line Check Progress UI (A1)
    item-clearance/
      preparation-view.tsx              # Item Clearance Preparation UI (A2)
      progress-view.tsx                 # Item Clearance Progress UI (A2)
    blinding/
      preparation-view.tsx              # Blinding Preparation UI (A4)
      progress-view.tsx                 # Blinding Progress UI (A4)
    testing-precomm/
      progress-view.tsx                 # Testing & Pre-comm Progress UI (A5)
    reinstatement/
      preparation-view.tsx              # Reinstatement Preparation UI (A6)
      progress-view.tsx                 # Reinstatement Progress UI (A6)
  flange/
    flange-browse.tsx                   # 435 LOC
    flange-detail-panel.tsx             # 203 LOC

store/                                  # Zustand stores
  welds-store.ts                        # shop welds (15 seed)
  batches-store.ts                      # NDE batches (6 seed)
  notifications-store.ts
  demo-store.ts                         # resetAll() cascades to every store
  testpack-store.ts                     # testpack readiness + line check + item-clearance + blinding + testing + reinstatement (Track A)
  admin-store.ts                        # Phase 0 complete — persist v3 (B1–B9 slices)
  erection-store.ts                     # field welds (E2.1) — persisted, mirrors welds-store shape
  to-site-store.ts                      # site receipt (I2)
  erected-store.ts / welded-bolted-store.ts / supports-store.ts / rft-store.ts  # I3–I6
  field-material-check-store.ts         # I7
  flange-bolt-progress-store.ts         # I8 field flange bolts — persisted
  paint-store.ts / laydown-store.ts / qc-release-store.ts / spools-store.ts  # G2–G5
  flange-store.ts                       # testpack §19 browse / Y-Z reinstatement
  spooling-store.ts                     # IA1 demo import + revision state
  iso-rollup.ts                         # E2.5 ISO weld watcher (no persist)
  erection-rollup.ts                    # spool stages + I6 RFT watcher + I8 flange rollups
  spool-stage.ts                        # G1 fabrication funnel selectors
  index.ts
  # Pressure-test activity tallies are derived from testpack-store — no separate store.

lib/
  weld-data.ts                          # 15 seed weld joints
  welder-qualifications.ts              # 17 welders (9 shop + 8 field) + validateWelder()
  erection-weld-data.ts                 # field welds (FieldWeldJoint extends WeldJoint)
  nde-data.ts                           # NDE seed
  testpack-data.ts                      # testpacks + ISOs + spools
  testpack-seed.ts                      # 18 ISOs / 6 test packs seed for testpack-store
  pressure-test-data.ts                 # activity tallies
  flange-data.ts                        # bolted-flange joints
  engineering-references.ts             # B2 read-only refs: WPS, NDE matrix, REWORK_CODES (RW-001..RW-010), Joint Categories
  utils.ts                              # cn() helper

config/
  navigation.ts                         # sidebar items + role visibility
                                        # (Testpack/Flange already wired)

contexts/
  role-context.tsx                      # 6 roles
```

---

## Hero demo flow (works end-to-end)

1. **Home** → user sees notification about an NDE rejection
2. **Weld Progress** → user clicks joint `J-1029`
3. **Smart validation** → user tries welder `WLD-099`; system rejects
   (expired qualification, restricted to CS A106B only)
4. **Send to NDE** → user picks valid welder, hits Send to NDE; batch
   created with 600–800ms artificial delay; toast shows action button
5. **NDE module** → user opens the new batch
6. **Mark for Rework** → on rejected welds → **DOMINO EFFECT**: weld
   status flips to Rework in welds store automatically
7. **Manager role** → switch role, see Fabrication Dashboard KPIs updated
8. **Erection Dashboard** → "and here's what's happening on site"

### Roles (`contexts/role-context.tsx`)

`qc_engineer`, `nde_inspector`, `project_manager`, `spooling_team`,
`subcontractor`, `system_admin`

`config/navigation.ts` controls per-role visibility. Some screens are
hidden from certain roles.

---

## State management — Zustand stores (current)

All app state lives in `/store`. Each store uses `persist` middleware
with a unique localStorage key, exports a main hook and a KPI hook.

### `welds-store.ts`

- 15 seed records from `lib/weld-data.ts`
- Actions: `updateWeld`, `markForRework`, `markAccepted`, `markRejected`, `lockWeld`
- KPI hook: `useWeldsKPIs()` → `{ acceptanceRate, reworkCount, rejectedCount, completedCount }`
- Persist key: `pipeqc-welds`

### `batches-store.ts`

- 6 seed batches across lifecycle stages
- Actions: `createBatch`, `issueBatch`, `receiveResults`, `markForRework`, `closeBatch`
- `markForRework` **cascades to welds-store** — the domino effect from the hero flow
- After N2 merge: `receiveResults` is per-weld (Accepted / Rejected + RW-NNN code from `REWORK_CODES`); the panel that calls it also cascades to welds-store on Rejected
- Persist key: `pipeqc-batches`

### `admin-store.ts` (Phase 0 complete — slices 0.1–0.9)

- Slices: `teams`, `subcontractors`, `projectDefinition`, `systemReferentials`, `welderQualifications`, `ndeMatrix`, `wpsList`, `pdsAreas`, `pipingMaterialList`, `reworkCodes`, `jointCategories`
- CRUD highlights: WPS `addWps` / `updateWps` / `supersededWps` · Welder qual add/edit/deactivate · NDE matrix add/edit/delete · PDS `addPdsArea` / `assignPdsArea` / `togglePdsAreaActive` · Heat registry `addHeatRecord` / `toggleHeatRecordActive` · Rework full CRUD · Joint categories edit-only · Teams add/edit/deactivate
- Hooks: `useTeams()`, `useSubcontractors()`, `useActiveWelderQualifications()`, `useActivePipingMaterialList()`, `useProjectDefinition()`
- UI: 8 tabs in `<AdminTabs />` on `/admin/project-referential`; heat registry in `PipingMaterialListTab` on same page; project definition on `/admin/project-definition`; system referential on `/admin/system-referential`
- Persist key: `pipeqc-admin`, **version 3** (migrates older localStorage to seeded v3 slices)
- **Deferred (Phase 7):** Access Rights scope-lock editor, Import Settings Excel templates, project archive — see `system_admin.md` gap table

### `erection-store.ts` (E2.1)

- Field welds, persisted; mirrors welds-store shape
- Actions: `updateFieldWeld`, `setErectionStatus`, `setRootPercent`, `setCapPercent`, `setForemanConfirmed`, `bulkUpdateErectionStatus`, `resetErection`
- KPI hook: `useErectionKPIs()` — consumed by the live erection dashboard (I1)
- Persist key: `pipeqc-erection`

### `to-site-store.ts` (I2)

- Site receipt confirmation per spool (`ToSiteRecord`)
- Actions: `markReceived`, `getRecord`, `resetToSite`
- Persist key: `pipeqc-to-site`

### `testpack-store.ts` (Track A)

- 6 seed test packs (TP-201..TP-206), 18 ISOs, line-check / item-clearance / blinding / testing / reinstatement workflow state
- Cascading status transitions match §18 Release Tracking gates
- Persist key: `pipeqc-testpack`

### `notifications-store.ts`

- 6 seed notifications driving home feed
- Severity: `error | warning | success | info`

### `demo-store.ts`

- `demoMode: boolean` (shows DEMO MODE badge in top nav)
- `resetAll()` — cascading reset across all stores (re-hydrates seed data)

### `flange-bolt-progress-store.ts` (I8)

- Per field-joint torque records (`FlangeBoltProgressRecord`); seed `FLANGE_BOLT_SEED` in `lib/erection-stage.ts`
- Actions: `assignTorque`, `recordBolting`, `verifyBolting`, `getRecord`
- Consumed by `/erection/flange-progress`, `useSpoolFlangeBoltRollup()` in `erection-rollup.ts`, I4 Confirm gate (I9b), `isSpoolRFTEligible` (I9b)
- Persist key: `pipeqc-flange-bolt-progress`

### `flange-store.ts` (testpack §19 browse)

- Shared persisted testpack-side flange joints; Y/Z reinstatement reads categories from here
- `/flange` browse + detail mutations wired; distinct from erection field flange bolts (I8)

### ⚠ Remaining store gaps

- None blocking demo hero flow; deepest gaps are NDE penalty-shoot/tracer depth and Spooling transmittal workflows (see `roadmap_v3.md` Phase 1+)

---

## Conventions — read this before writing code

1. **Reuse existing patterns.** Before building a new table, look at
   `weld-table.tsx`. Before a new dashboard, look at
   `fabrication-dashboard.tsx`. Match density, spacing, colors exactly.
2. **All components are `"use client"`.** No server components.
3. **Hardcoded mock data.** Seed data lives at the top of `lib/*-data.ts`.
4. **Static dashboards are OK** for pure visualizations.
5. **Artificial delays for fidelity** on mutations:
   ```ts
   await new Promise((r) => setTimeout(r, 600 + Math.random() * 200));
   ```
   _before_ updating the store, then show a Sonner toast.
6. **Validation feedback.** Inline red helper text; disable Save while invalid.
   See `weld-detail-panel.tsx` for the WLD-099 pattern.
7. **Status colors:** `sky`=info, `amber`=pending, `emerald`=done,
   `red`=rejected, `violet`=in-review, `slate`=not started.
8. **No real auth.** Role switching via top-nav dropdown.
9. **Don't refactor unrelated files.** Smallest possible change.
10. **Update `config/navigation.ts` when adding new top-level screens.**

---

## Manual cross-reference (for new work)

Page numbers below refer to the Easy Piping User Manual PDF (156 pp).

| Manual §      | Topic                                 | PipeQC status                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1–§2         | Project definition + System ref       | ✅ Phase 0.1 + 0.7 — `/admin/project-definition`, `/admin/system-referential` (store-backed CRUD on 4 system-ref cards)                                                                                                                                           |
| §3 (3.1–3.26) | **Project Referential** — 26 entities | ✅ Phase 0 core — 8 CRUD tabs + heat registry on `/admin/project-referential`; team pickers site-wide read `admin-store`. Remaining §3 items (systems, line service, devices, …) still shell/grouped placeholders on same page |
| §4            | Access Rights                         | ⚠ shell `/admin/access-rights` — scope-lock **configured** via PDS×subcontractor matrix (0.5), full role matrix editor deferred                                                                                                                                  |
| §5            | Import settings (NDE matrix, PMC)     | ⚠ shell `/admin/import-settings` — live CRUD covers matrix + PML without Excel; bulk import deferred Phase 7                                                                                                                                                        |
| §6            | Spooling (Ident Code, Marian, Browse) | ⚠ partial — IA1 sidebar (Home / Engineering In / ISO Workflow / Spooling Out) + `spooling-store` demo import; 3 sub-routes placeholder. See `spooling_team.md` + Phase 1 in `roadmap_v3.md`                                                                       |
| §7            | Fabrication module (Start Fab → QC)   | Fabrication module (§7) — Weld Progress + Dashboard funnel + Material Check + QC Release + Paint + Laydown (G1+G2+G1.1+G3+G4+G5+G6); sidebar realigned to manual §7 peer sections (Spool Fabrication / Welding); shop-only filter on `/fabrication/weld-progress` |
| §9            | Fabrication reports                   | not built                                                                                                                                                                                                                                                         |
| §10           | Spool Tracking + Dashboard            | ✅ /tracking                                                                                                                                                                                                                                                      |
| §11           | NDE Management (batch lifecycle)      | ✅ /nde — N1 Create Batch wizard + N2 per-weld Receive Results merged                                                                                                                                                                                             |
| §12           | Erection module                       | ✅ substantial — I1–I10: full spool-erection pipeline (To Site → Field MC → Erected → W/B → Supported → RFT), Site Weld Progress, Field Flange Progress (I8), sidebar §12 peer sections (I10); I9b gates on flange verification + RFT                                                                                                                                 |
| §13           | Erection reports                      | not built                                                                                                                                                                                                                                                         |
| §14–§15       | Testpack management + Preparation     | partially — Explorer + Pressure Test A1–A6 prep/progress screens merged                                                                                                                                                                                           |
| §16           | **Pressure Test (5 activities × 2)**  | ✅ homepage + 8 sub-screens merged (A1 line-check, A2 item-clearance, A4 blinding, A5 testing, A6 reinst.)                                                                                                                                                        |
| §17           | Testpack homepage (bar graph)         | ✅ /testpack/pressure-test                                                                                                                                                                                                                                        |
| §18           | Testpack Explorer (3 levels × 4 tabs) | ✅ /testpack/explorer — Release Tracking tab now wired to live `useTestpackStore` data for TP-201..TP-206                                                                                                                                                         |
| §19           | Flange management (browse + progress) | ✅ `/flange` browse (testpack joints, `flange-store`) + `/erection/flange-progress` (field bolts, I8); I9b: I4 Confirm + RFT require all flange bolts Verified                                                                                                                                                                    |
| §20           | Testpack reports                      | not built                                                                                                                                                                                                                                                         |

### §16 Pressure Test — merged sub-screen reference

**Status: merged (Track A complete).** Each activity has two screens:
**Preparation** (assign workload to a team) and **Progress** (record completion).

| Activity                 | Preparation §16.x | Progress §16.x    | Team referential                        |
| ------------------------ | ----------------- | ----------------- | --------------------------------------- |
| Line Check               | 16.1              | 16.2              | Line Checker (§3.21)                    |
| Item Clearance           | 16.3              | 16.4              | Finishing (§3.17)                       |
| Blinding                 | 16.5              | 16.6              | Blinding (§3.16)                        |
| Testing & Pre-commission | —                 | 16.7 (dates only) | —                                       |
| Reinstatement            | 16.8              | 16.9              | Reinstatement (§3.18) + Jointer (§3.15) |

Workflow gating (from §18.2 "Release Tracking"):
`welded → bolted → NDE-tested → ISO complete → line-checked → item-X cleared → QC released → Ready For Test → blinded → tested → reinstated (Y after test, Z after pre-comm)`

**Explorer live-gates wiring (Phase A3):**

- Store testpacks (TP-201..TP-206) appear in the Explorer list with a **LIVE** pill.
- The **Release Tracking** tab renders 11 live gates computed from `useTestpackStore` (ISO line-check status, open X punch items, blinding status, testing dates, reinstatement items).
- Each clickable gate deep-links to the corresponding A1–A6 screen with `?testpack={id}`.
- All 8 prep/progress screens accept `?testpack=` and auto-filter + show a clearable chip.
- Static testpacks (TP-207+) keep hardcoded gate numbers; other tabs remain static.

---

## Module status & what to do next

> **Authoritative sequencing:** `docs/roadmap_v3.md` (module-by-module).
> Legacy capability tracks (A / G / I / N / …) remain documented in the
> merge log below and in `docs/prompts/archive/`.

Snapshot **2026-05-22**:

| Phase | Module | Status | Next gaps (see role matrix + roadmap) |
| ----- | ------ | ------ | ------------------------------------- |
| **0** | Admin | ✅ **Phase 0 complete** — 9/9 slices in `admin-store` v3 | Access Rights editor, Import Settings Excel, remaining §3 placeholder groups |
| **1** | Spooling | ⚠ partial — IA1 nav + demo store | Transmittal receipt, checkout, multi-round check, holds, outbound batch (Phase 1.1–1.7) |
| **2** | Fabrication | ✅ substantial — G1–G6 complete | Welder qual soft alert, PML validation depth, PWHT flow |
| **3** | NDE | ⚠ partial — N1–N2 merged | Per-weld dialog polish, tracer, penalty shoot, reports |
| **4** | Erection | ✅ substantial — I1–I10 + E2.x | Reuse Phase 3 NDE upgrades for field welds; PM write-lock |
| **5** | Spool Tracking | ⚠ shell `/tracking` | Yard map, movement audit, inconsistency flags |
| **6** | Test Pack | ✅ substantial — A1–A6 + Explorer gates | Testpack Builder, dossier PDF, client examination |
| **7** | Reports + polish | ⚠ shell `/reports` | Real report generation, notifications upgrade |

**Completed legacy tracks (no longer "next"):** Track A (Pressure Test §16),
Track G (Fabrication funnel §7), Track I (Erection §12 + §19.2.1 field flanges).

**Hero demo flow** still valid end-to-end: Home → Weld Progress → NDE cascade →
Fabrication dashboard → Erection dashboard → (optional) Pressure Test storyline.

When starting a new agent session: read this file → `roadmap_v3.md` current
phase → the relevant `docs/role_matrix/<role>.md` for function-level gaps.

---

## Source documents

| Document | Use when |
| -------- | -------- |
| `docs/Easy Piping User Manual.pdf` | Canonical workflow, terminology, screen expectations (156 pp) |
| `docs/PIPEQC_CONTEXT.md` | This file — stack, stores, merge log, module snapshot |
| `docs/roadmap_v3.md` | **What to build next** — phase order + slice checklist |
| `docs/research/presentation_findings.md` | Domain insights from 10 TechnipFMC decks (CC-1…CC-23, per-module gaps) |
| `docs/role_matrix/*.md` | Per-role ✅/⚠/📋/❌ function inventory + gap triage |
| `docs/prompts/archive/` | Historical implementation prompts for merged tracks |
| `docs/tracks/gapmap_and_roadmap.md` | Earlier gap map (superseded for sequencing by v3; still useful for IDs) |

Manual § pointers: Admin **§1–§5** · Spooling **§6** · Fabrication **§7, §9** ·
NDE **§11** · Erection **§12–§13** · Test Pack **§14–§20** · Tracking **§10**.

---

## Merge log

- **E2.1** — Erection store (`store/erection-store.ts`) created and wired.
  Field weld edits now persist to localStorage (`pipeqc-erection` key).
  `resetAll()` re-seeds from `lib/erection-weld-data.ts`.
- **N1 + N2** — Track N MVP merged together (per `track-upstream.md` §8 recommendation).
  - N1: 2-step Create Batch wizard (`components/nde/create-batch-dialog.tsx`) replaces the `Coming soon` placeholder. Step 1 picks method / subcontractor (from admin-store) / matrix ref / inspector; Step 2 selects welds from `useWeldsStore` with Completed default + `Show Rework` toggle + exclusion of welds already in non-Closed batches.
  - N2: per-weld Receive Results panel (`components/nde/receive-results-panel.tsx`) opens as a nested Sheet over the batch detail. Accept / Reject per weld; Reject requires a Rework Code from `REWORK_CODES`. On submit: 600–800 ms delay → `receiveResults` → `markForRework` cascade on welds-store for Rejected → home notification _"BTH-XXXX: N welds rejected — rework cascaded to fabrication"_.
  - Type bridge **Option A** chosen: `ReworkCode` in `batches-store.ts` widened to `string`, `REWORK_CODE_LABELS` deleted, legacy 3-letter seed codes migrated (POR→RW-001, CRK→RW-002, SLG→RW-003, UNC→RW-004, LOF→RW-005). `engineering-references.ts:REWORK_CODES` is now the single source of truth for code labels.
  - `nde-data.ts:rejectionLibrary` migrated to RW-NNN to stay consistent with the store.
- **E2.3** — Spool readiness gate (F↔E handoff). New selector `useSpoolReadiness()` in `store/welds-store.ts` groups welds by `spoolNo` and derives per-spool status: Ready for delivery / Blocked / In fabrication / Not started. Erection dashboard (`components/erection-dashboard.tsx`) now shows a 5th KPI tile "Spools ready for delivery" and a "Spool delivery readiness" card with a sortable table. Clicking a spool row deep-links to `/fabrication/weld-progress?spool=<spoolNo>` where the page auto-filters and renders a clearable chip. No new state or dependencies — pure read-side derivation.
- **E2.5** — ISO weld rollup + Track A bridge. New file `store/iso-rollup.ts` exports `useIsoWeldRollup()` (pure derivation from welds-store + erection-store) and `useIsoWeldedWatcher()` (mounted in `app/layout.tsx` via `<IsoWatcherMount />`). When all shop + field welds for an ISO reach accepted/done, the watcher calls `recordIsoWelded()` in testpack-store, which flips `ISORecord.allWeldsWelded = true`, recomputes `lineCheckStatus` to "Eligible" (if `spoolsSupported`), and updates `TestPack.readyForTest`. A success notification `"ISO-XXXX: welded — Ready for line check on TP-YYY"` is pushed. **Option A** ISO-ID reconciliation: 6 ISOs renamed in `lib/weld-data.ts` and `lib/erection-weld-data.ts` to match testpack-seed IDs (`ISO-TK100-P-001 R2` → `ISO-1001`, etc.). Seed pre-conditions adjusted: `ISO-1001` and `ISO-1003` now have `spoolsSupported: true` to enable visible eligibility transitions.
- **I1** — Erection lifecycle foundation + live dashboard funnel. New `lib/erection-stage.ts` defines spool-level erection stages (`Not Started → To Site → Erected → Welded/Bolted → Supported → RFT`), shared order/colors, and `deriveSpoolErectionStage()` as a pure rollup from field-joint `erectionStatus`. New `store/erection-rollup.ts` exposes `useSpoolErectionStages()`, `useSpoolErectionStageCounts()`, and `useSpoolsAtErectionStage(stage)` with no new persisted state. `components/erection-dashboard.tsx` now consumes `useErectionKPIs()` for live KPI tiles, adds a non-clickable funnel above the KPI grid (5 active stages + muted `Not Started`), and clearly labels the remaining charts as `Static`. Seed statuses in `lib/erection-weld-data.ts` were rebalanced so the demo shows non-zero counts across all live erection stages and `resetAll()` restores that distribution.
- **G1** — Spool fabrication lifecycle foundation + funnel widget. New `lib/spool-data.ts` defines `SpoolFabStage` enum (8 stages from Not Started to Laydown), `STAGE_ORDER`, `STAGE_COLOR`, and `deriveFabStage()` which maps `SpoolReadiness` to stage using existing weld data only. New `store/spool-stage.ts` exports `useSpoolStages()`, `useSpoolStageCounts()`, and `useSpoolsAtStage(stage)` — all pure derivations, no new persisted store. `components/fabrication-dashboard.tsx` gets a read-only 8-tile funnel above the existing KPI grid. Clicking a populated tile deep-links to `/fabrication/weld-progress?stage=<Stage>` where the page filters welds by spool stage and renders a clearable chip. Empty stages (Material Check, QC Release, Sent to Paint, Painted, Laydown) show 0 with contextual "lands in Phase Gx" copy. No new routes, no sidebar changes, no store persistence changes.
- **G2** — Material Check screen + persisted spools store. New `store/spools-store.ts` holds `MaterialCheckRecord` per spool with `HeatPiece[]`, inspector, signed-off date, and NC tracking. Persisted under `pipeqc-spools` key; cascades into `resetAll()`. `lib/spool-data.ts` extended with `MaterialCheckRecord`, `HeatPiece`, `MATERIAL_CHECK_SEED` (15 records covering all spools — 4 at MC, 7 at Weld Progress, 4 at Fabricated), and widened `deriveFabStage(readiness, mcRecord)` that places spools at Material Check when unsigned or pending. New route `/fabrication/material-check` with list view (`components/fabrication/material-check-view.tsx`) and detail Sheet (`components/fabrication/material-check-detail-panel.tsx`). List shows stage chips, search, and clickable rows. Detail panel allows editing heat numbers / mill certs / status per piece, saving drafts, and signing off (≥1 Cleared piece required, NC remarks mandatory). Sign-off pushes a notification and advances the spool to Weld Progress. Sidebar nav updated with Material Check entry between Dashboard and Weld Progress. Funnel `Material Check` tile now links to the new route.
- **G1.1** — Funnel navigation cleanup. Fixes the G1/G2 structural navigation mistake where every funnel tile linked to `/fabrication/weld-progress?stage=<Stage>`. Funnel tiles for stages without a screen (`Fabricated`, `QC Release`, `Sent to Paint`, `Painted`, `Laydown`, `Not Started`) are now non-clickable with `cursor-not-allowed` and a native `title="Coming in G3/G4/G5"` tooltip. Only `Weld Progress` and `Material Check` tiles remain clickable, linking directly to their own routes without `?stage=`. `/fabrication/weld-progress` drops all `?stage=` plumbing (chip, filter, empty-state copy) while keeping the `?spool=` chip from E2.3 intact. `/fabrication/material-check` replaces stage chips with MC-status chips (`All / Pending / Approved / NC`) driven by `deriveMCStatus(record)`, uses `?status=` URL sync, and iterates `records` instead of all spools. `useSpoolsAtStage` selector remains untouched in `store/spool-stage.ts` for future G3/G4/G5 screens.
- **G3** — QC Release screen + Fabricated → Released advancement. New `store/qc-release-store.ts` persisted under `pipeqc-qc-release` key; cascades into `resetAll()`. `lib/spool-data.ts` extended with `QCReleaseRecord`, `QCChecklistEntry`, `QC_CHECKLIST`, `QC_RELEASE_SEED` (3 records: 2 pre-released + 1 Pass-with-remark anchor on `PL-TK100-001-A`). `deriveFabStage()` widened with `qcRecord` param; signed-off QC record takes highest priority → `"QC Release"`. New route `/fabrication/qc-release` with list view (`components/fabrication/qc-release-view.tsx`) and detail Sheet (`components/fabrication/qc-release-detail-panel.tsx`). List shows `All / Awaiting Release / Released` internal chips, spool search, and clickable rows. Detail panel has a 4-item checklist (Dimensional, Visual, Documentation, Traceability) with `Pending / Pass / Pass with remark` segmented controls, remark textarea for "Pass with remark", inspector dropdown, Save Draft, and Sign off. Sign-off validates no Pending items and no empty remarks. Funnel `Fabricated` and `QC Release` tiles now link to `/fabrication/qc-release`. Sidebar nav updated with `QC Release` entry between `Material Check` and `Weld Progress`.
- **G4** — Paint stages (Sent to Paint + Painted). New `store/paint-store.ts` persisted under `pipeqc-paint` key; cascades into `resetAll()`. `lib/spool-data.ts` extended with `PaintRecord`, `PAINT_SYSTEMS`, `PAINT_SUBCONTRACTORS`, `PAINT_SEED` (2 records: `PL-TK100-002-A` dispatched to ColorPro + `PL-CW200-005-A` painted by Apex). `deriveFabStage()` widened with `paintRecord` param; paint-signed-off → `"Painted"`, dispatched → `"Sent to Paint"`, both above the existing G3 QC-Release rule. New route `/fabrication/paint` with list view (`components/fabrication/paint-view.tsx`) and detail Sheet (`components/fabrication/paint-detail-panel.tsx`). List shows `All / Awaiting Dispatch / In Paint Shop / Painted` internal chips, spool search, and conditional columns per chip. Detail panel has three modes: Dispatch (paint system + subcontractor dropdowns + remark), Sign-off (read-only dispatch summary + DFT input + inspector dropdown), and Done (all read-only). Funnel `Sent to Paint` and `Painted` tiles now link to `/fabrication/paint`. Sidebar nav updated with `Paint` entry between `QC Release` and `Weld Progress`.
- **G5** — Laydown stage (yard placement + release to site). New `store/laydown-store.ts` persisted under `pipeqc-laydown` key; cascades into `resetAll()`. `lib/spool-data.ts` extended with `LaydownRecord`, `YARD_LOCATIONS`, `LAYDOWN_SEED` (1 record: `PL-CW200-005-A` placed at `YARD-A-12`). `deriveFabStage()` widened with `laydownRecord` param; placed → `"Laydown"` as highest priority, above all paint rules. New route `/fabrication/laydown` with list view (`components/fabrication/laydown-view.tsx`) and detail Sheet (`components/fabrication/laydown-detail-panel.tsx`). List shows `All / Awaiting Placement / In Yard / Released to Site` internal chips, spool search, and conditional columns per chip. Detail panel has two modes: Place (yard location + placer dropdowns) and Release (releaser dropdown); released spools show read-only summary. On place: 700 ms delay → toast + home notification. On release: 700 ms delay → toast + home notification with href `/erection/dashboard`. Funnel `Laydown` tile now links to `/fabrication/laydown`. Sidebar nav updated with `Laydown` entry between `Paint` and `Weld Progress`. **Funnel deep-link cleanup:** all 6 existing tiles now carry `?status=` matching their chip (e.g. `Sent to Paint` → `?status=InShop`, `Painted` → `?status=Painted`). Track G is **complete** — all 7 active stages of §7 have real screens, persisted state, and audit trail.
- **I2** — To Site screen (§12.4) + persisted receipt store. New `store/to-site-store.ts` persists `ToSiteRecord` under `pipeqc-to-site` and cascades into `resetAll()`. `lib/erection-stage.ts` now defines `ToSiteRecord`, `AREA_SUPERVISORS`, `TO_SITE_SEED`, and widens `deriveSpoolErectionStage(spoolNo, fieldWelds, toSiteRecord)` so a recorded site receipt lifts a spool to `"To Site"` unless field weld data already proves a later stage. `store/erection-rollup.ts` now reads both field welds and to-site receipts. New route `/erection/to-site` adds list/detail flow: `components/erection/to-site-view.tsx` shows `All / Awaiting Receipt / Received` chips, search, released-from-laydown rows, and URL sync; `components/erection/to-site-detail-panel.tsx` mirrors the laydown sheet with W-24 form capture, area-supervisor confirmation, toast, and home notification to `/erection/dashboard`. `LAYDOWN_SEED` now includes multiple released spools so the demo shows both awaiting and received handoffs, sidebar nav adds `To Site`, and the dashboard funnel tile for `To Site` deep-links to the new screen.
- **I3** — Erected screen (§12.5) + persisted erection record store. New `store/erected-store.ts` persists `ErectedRecord` under `pipeqc-erected` and cascades into `resetAll()`. `lib/erection-stage.ts` re-exports `AREA_ZONES` as `PLACEMENT_LOCATIONS` with type `PlacementLocation`, defines `ErectedRecord`, `ERECTED_SEED`, and widens `deriveSpoolErectionStage(spoolNo, fieldWelds, toSiteRecord, erectedRecord)` so an erected record lifts a spool to `"Erected"` only when no field weld already proves a later stage (Welded+). `store/erection-rollup.ts` now reads erected records too. New route `/erection/erected` adds list/detail flow: `components/erection/erected-view.tsx` shows `All / Awaiting Erection / Erected` chips, search, received-spool rows, and URL sync; `components/erection/erected-detail-panel.tsx` shows to-site bridge, placement-location select, optional elevation, W-24 form, supervisor select, and remark. Submit validates required fields, delays 600–800 ms, then `markErected` → toast + home notification. Read-only mode displays all fields. `TO_SITE_SEED` expanded to 5 records and `ERECTED_SEED` seeded with 3 records so the demo shows 2 awaiting + 2 erected (with field-welds ≤ Erected) + 1 erected spool with field-welds already Welded (proving stage never downgrades). Sidebar nav adds `Erected` between `To Site` and `Site Weld Progress`; dashboard funnel tile `Erected` is now clickable and remaining tiles (`Welded/Bolted`, `Supported`, `RFT`) carry `title="Coming in I4/I5/I6"`.
- **I4** — Welded/Bolted screen (§12.6) + gating sign-off store. New `store/welded-bolted-store.ts` persists `WeldedBoltedRecord` under `pipeqc-welded-bolted` and cascades into `resetAll()`. `lib/erection-stage.ts` extended with `WeldedBoltedRecord`, `SpoolWBRollup`, `computeSpoolWBRollup(spoolNo, fieldWelds)` (pure function), `WELDED_BOLTED_SEED`, and widens `deriveSpoolErectionStage(..., weldedBoltedRecord?)` so `"Welded/Bolted"` stage is gated: it is reached **only** when an explicit QC sign-off record exists. Without the record, even if all field joints are welded/bolted, the stage stays at `"Erected"` (or lower). `store/erection-rollup.ts` now reads welded/bolted records too. New route `/erection/welded-bolted` adds list/detail flow: `components/erection/welded-bolted-view.tsx` shows `All / In Progress / Ready to Confirm / Confirmed` chips, search, erected-spool rows with weld/bolt progress chips, and URL sync; `components/erection/welded-bolted-detail-panel.tsx` shows erected summary bridge, read-only joints rollup table, large weld/bolt counters, and three modes — In Progress (banner explaining remaining joints, disabled confirm button), Ready to Confirm (QC inspector dropdown reusing `QC_INSPECTORS`, W-24 form input, optional remark), and Confirmed (read-only badge + snapshot counts). Submit validates inspector + W-24, delays 600–800 ms, then `confirmWeldedBolted` with snapshot counts → toast + home notification. Seed `FIELD_WELD_DATA` adjusted so 1 erected spool is Confirmed, 1 is Ready, 1 is In Progress. Sidebar nav adds `Welded / Bolted` between `Erected` and `Site Weld Progress`; dashboard funnel tile `Welded/Bolted` is now clickable and remaining tiles (`Supported`, `RFT`) carry `title="Coming in I5/I6"`.
- **I5** — Supported screen (§12.7) + support-item rollup + W-23 sign-off. New `store/supports-store.ts` persists `SupportItem[]` and `SupportedRecord[]` under `pipeqc-supports` (version 1) and cascades into `resetAll()`. `lib/erection-stage.ts` extended with `SupportType`, `SupportStatus`, `SupportItem`, `SupportedRecord`, `SpoolSupportRollup`, `computeSpoolSupportRollup(spoolNo, supportItems)` (pure function), `SUPPORT_SEED` (3–5 items per spool covering all 4 filter chips), and `SUPPORTED_SEED` (1 confirmed record for the most advanced spool). `deriveSpoolErectionStage(..., supportedRecord?)` now gates `"Supported"` stage: it is reached **only** when an explicit W-23 sign-off record exists, regardless of field-weld status rank. `store/erection-rollup.ts` now reads supported records too. New route `/erection/supported` adds list/detail flow: `components/erection/supported-view.tsx` shows `All / In Progress / Ready to Confirm / Confirmed` chips, search, welded/bolted rows with support progress chips, and URL sync; `components/erection/supported-detail-panel.tsx` shows W&B summary bridge, editable supports table (Tag / Type / Status inline Select with 200 ms delay + toast), large erected/welded counters, and three modes — In Progress (banner explaining remaining supports), Ready to Confirm (area-supervisor dropdown reusing `AREA_SUPERVISORS`, W-23 form input, optional remark), and Confirmed (read-only badge + snapshot `totalSupports`). Submit validates all supports welded + supervisor + W-23, delays 600–800 ms, then `confirmSupported` with `totalSupports` snapshot → toast + home notification. `WELDED_BOLTED_SEED` expanded to 3 records so the demo shows 1 Confirmed + 1 Ready + 1 In Progress. Sidebar nav adds `Supported` between `Welded / Bolted` and `Site Weld Progress` using `Anchor` icon; `Erected` icon switched to `MapPin`. Dashboard funnel tile `Supported` is now clickable (links to `/erection/supported`) and `RFT` tile carries `title="Coming in I6"`.

- **I6** — RFT auto-derivation. New `store/rft-store.ts` persists `RFTRecord` under `pipeqc-rft` key; cascades into `resetAll()`. `lib/erection-stage.ts` extended with `RFTRecord`, `RFT_SEED`, `isSpoolRFTEligible()` pure helper, and widens `deriveSpoolErectionStage()` with optional 7th `rftRecord` param — returns `"RFT"` immediately if record present. `SpoolErectionStage` type renamed `"Not Started"` → `"Awaiting Release"` throughout (type, order array, colors map, derive function return paths). `lib/testpack-seed.ts` — `ISORecord` gains `spoolsRFT: string[]` field; all 18 seed records updated; `applyHistoricalOverrides` unchanged. `store/testpack-store.ts` adds `recordSpoolRFT(spoolNo)` mutation (idempotent append to all ISOs' `spoolsRFT`); persist version bumped to 5. `store/erection-rollup.ts` adds `useSpoolRFTWatcher()` hook: skips seed-already-recorded spools on first mount (via `initialized` ref), iterates `supportedRecords`, checks `isSpoolRFTEligible`, calls `recordRFT` + `pushNotification` + `recordSpoolRFT`. New `components/spool-rft-watcher-mount.tsx` mounts the watcher; added to `app/layout.tsx`. New route `/erection/rft` with `components/erection/rft-view.tsx` — read-only list, `All / RFT / Pending` filter chips, search, URL sync (`?filter=`), side panel with predecessor audit trail. `config/navigation.ts` adds `RFT` nav item (CheckCircle2 icon) between Supported and Site Weld Progress. `components/erection-dashboard.tsx` funnel upgraded: feed-stock summary block (Total / Awaiting Release / Active in erection / RFT counts) added above funnel; `Awaiting Release` tile links to `/fabrication/laydown`; `RFT` tile links to `/erection/rft`. Devlog `/documentation` page updated: I5 + I6 added to mergedTracks, stale nextTracks entries removed.

- **Devlog page** — `app/documentation/page.tsx` rewritten from a 3-line placeholder into a 4-tab devlog (`"use client"`). Tab 1 (Overview): project purpose, audience, stack badges, prominent disclaimer about mock data / Zustand-only persistence. Tab 2 (What works): 4 hero-flow checklists (Anna's day / WLD-099 rework cascade / Track G funnel / Field handoff loop), each step is a `Checkbox` + `Link` to the live route + plain-English action→expected text; state is local `useState`, not persisted. Tab 3 (Modules): scrollable table of every sidebar route with color-coded `live / partial / placeholder` badges and a "what is fake / what works" column; sourced by reading actual page/component code. Tab 4 (Tracks & Stories): merged tracks mirror `docs/tracks/track_list.md` (A1–A6, B1–B2, E2.1, E2.3, N1–N2, G4–G5) with self-check checkboxes; Next/Backlog (E2.5, F1–F3, E2.2, E2.4, N3–N4, B3) listed as not-implemented. No new dependencies; uses existing shadcn `Tabs`, `Badge`, `Checkbox`, `Card`, `Link`. Build and `tsc --noEmit` pass clean.

- **I7** — Field Material Check screen (§12.3) + per-joint material-check store. New `store/field-material-check-store.ts` persists `FieldMaterialCheckRecord[]` under `pipeqc-field-material-check` key; cascades into `resetAll()`. `lib/erection-stage.ts` extended with `FieldHeatPiece`, `FieldMaterialCheckStatus`, `FieldMaterialCheckRecord`, `SpoolFieldMCRollup`, `computeSpoolFieldMCRollup(spoolNo, fieldWelds, mcRecords)` (pure function), and `FIELD_MC_SEED` (3 records: 1 Cleared `PL-TK100-003-A`, 1 Ready to Sign `PL-TK100-004-A`, 1 Awaiting MC with NC `PL-CW200-005-B`). `deriveSpoolErectionStage()` widened with optional 8th `fieldMCRollup` param — inserted between `"To Site"` and `"Erected"`: if `toSiteRecord` exists and rollup exists with `totalJoints > 0`, returns `"Field Material Check"` when `!allCleared` or when `allCleared && !erectedRecord`; legacy spools with no MC records fall through unchanged. `store/erection-rollup.ts` now reads field-material-check records and passes rollup into derivation; exports `useFieldMaterialCheckByJoint(fieldJointId)` hook. New route `/erection/material-check` with list view (`components/erection/field-material-check-view.tsx`) and detail Sheet (`components/erection/field-material-check-detail-panel.tsx`). List shows `All / Awaiting MC / Ready to Sign / Cleared` chips, search, per-spool rows with progress chip (`cleared/total joints`), NC count badge, and To Site bridge date; URL sync (`?status=`, `?spool=`). Detail panel shows To Site bridge, per-joint heat-piece tables (Tag / Type / Heat # / Cert / Status / NC remark), with inline editing when not signed off and read-only when signed. Sign-off form validates `≥1 Cleared` piece per joint, no empty NC remarks, W-MC form number, and inspector selection; delays 700 ms then `signOffSpoolMC` → toast + home notification (`severity: warning` if NCs exist, else `success`) with href `/erection/material-check`. `components/erection/erected-detail-panel.tsx` now gates erection confirmation: if a spool has field joints and MC is not cleared, an amber banner blocks the form and validation fails with "Field Material Check must be cleared before erection." `components/erection-dashboard.tsx` funnel upgraded to 7 tiles (`xl:grid-cols-7`); `Field Material Check` tile is clickable and links to `/erection/material-check`; `activeInErection` KPI now includes the new stage. `config/navigation.ts` adds `Field Material Check` (ClipboardCheck icon) between `To Site` and `Erected`. `app/documentation/page.tsx` updated with I7 module entry and merged track entry.

- **I10** — Erection module sidebar realignment to manual §12 structure + recursive sidebar renderer. `config/navigation.ts` Erection `children` restructured into nested sections matching manual §12 peer sections (§12.1 Spool Erection, §12.3 Welding, §12.4 Flange): Dashboard at top level, then `Spool Erection` subsection with six stages (To Site → Field Material Check → Erected → Welded/Bolted → Supported → RFT), then `Welding` subsection with Site Weld Progress, then `Flange` subsection with Flange Progress. The invented `ERECTION ANALYTICS` top-level group retired; Site Weld Progress moved back into Erection. `components/pipeqc/sidebar-nav.tsx` upgraded with recursive `NavTreeItem` / `NavTreeSubItem` renderers supporting arbitrary nesting depth via `isPathUnderItem()` helper, preserving active-state highlighting and collapsible behavior at every level. Routes unchanged (`/erection/weld-progress`, `/erection/flange-progress`, etc.); role visibility unchanged; no store/seed/component changes. Manual cross-reference §12 row updated to reflect peer-section structure with Field Material Check as documented standalone-screen deviation.
- **G6** — Fabrication module sidebar realignment to manual §7 structure, mirroring I10. `config/navigation.ts` Fabrication `children` restructured into nested sections matching manual §7 peer tiles (§7.1 Spool Fabrication, §7.3 Welding): Dashboard at top level, then `Spool Fabrication` subsection with four stages (Material Check → QC Release → Paint → Laydown), then `Welding` subsection with `Shop Weld Progress` (renamed from "Weld Progress" to match Erection's "Site Weld Progress" symmetry). `app/fabrication/weld-progress/page.tsx` gains a defensive shop-only filter using `jointNo` naming convention (`FJ-` prefix = field) and a visible "Shop joints only" badge. Routes unchanged (`/fabrication/weld-progress`, etc.); no store/seed/component changes. Manual cross-reference §7 row updated.

- **I8** — Field Flange Bolt Progress (§19.2.1). New `store/flange-bolt-progress-store.ts` + `FLANGE_BOLT_SEED`; route `/erection/flange-progress` with list (`All / Assigned / Bolted / Verified` chips, `?status=` + `?spool=` URL sync) and detail Sheet (assign torque + method, record bolting W-19, verify with tool ref). `computeSpoolFlangeBoltRollup()` in `lib/erection-stage.ts`; `useSpoolFlangeBoltRollup()` in `erection-rollup.ts`. Erection dashboard aux KPI card for flange verification backlog. I4 panel shows read-only `FlangeBoltAuditCard` (display-only in I8; gate widening deferred to I9).

- **I9a** — Seed coverage + Field MC NC chip. Expanded `FIELD_WELD_DATA` flange-bolt joints for demo spools; `field-material-check-view.tsx` surfaces `Non-conformance` filter chip when any piece has NC status.

- **I9b** — Cross-stage flange gates. `welded-bolted-detail-panel.tsx` blocks Confirm until `flangeRollup.allVerified`; `isSpoolRFTEligible()` requires verified flange bolts in addition to supported sign-off; matching `FLANGE_BOLT_SEED` verified records for Confirmed spools in seed data.

- **I9c** — Site Weld Progress filter parity. `/erection/weld-progress` gains the same status chip row + URL sync pattern as other I-screens (supersedes I9.4/I9.5 sidebar experiments — fully retired by I10).

- **Phase 0 Admin (2026-05-22)** — Roadmap v3 Phase 0 closure. `admin-store` v3: slices 0.2 WPS CRUD, 0.5 PDS×subcontractor matrix tab, 0.6 piping material / heat registry, 0.8 rework + joint category CRUD, completing 0.1/0.3/0.4/0.7/0.9 from prior work. Eight referential tabs in `<AdminTabs />` + `PipingMaterialListTab` on project-referential page. Prompts archived to `docs/prompts/archive/`; active remaining-work prompt: `docs/prompts/PipeQC_Phase0_Admin_Remaining.md` → **superseded/complete**.

- **Docs housekeeping (2026-05-22)** — `roadmap_v3.md` added; legacy track prompts moved to `docs/prompts/archive/`; role matrices + presentation findings referenced from this context file.

## Manual-alignment notes (2026-05-22)

- Testpack Release Tracking gates 1–3 are derived from live data (weld/flange/NDE), no longer hardcoded green.
- Reinstatement is based on flange joints categories Y/Z (after test / after pre-commissioning).
- **Two flange domains:** testpack browse uses `store/flange-store.ts`; erection field bolts use `store/flange-bolt-progress-store.ts` (I8/I9b).
- RFT formula (from presentation #7): `ISO_RFT = QC_RELEASED ∧ ISO_COMPLETE ∧ LINE_CHECK_DONE ∧ (all Cat-X cleared)`; PipeQC implements spool-level RFT via supported sign-off + flange verification (I9b) + testpack bridge (`recordSpoolRFT`).
- Punch categories X/Y/Z are **sequencer gates** (X blocks testing, Y blocks pre-comm, Z blocks closeout) — not decorative tags (CC-20).
- NDE includes manual-facing state vocabulary and tracer demo behavior; full Penalty Shoot / auto-allocation depth deferred to Phase 3 roadmap.
- Fabrication QC Release, Sent to Paint, Painted, and Laydown are wired (Track G complete); sidebar matches §7 peer sections (G6).
- Erection sidebar matches §12 peer sections (I10); Field Material Check is a documented standalone-screen deviation from strict manual tile order.
- Admin Phase 0 covers the 9 referentials required before Spooling/Fab/NDE demos; Excel import templates remain Phase 7.
