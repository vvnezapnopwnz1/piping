# Erection Drawer — Overlay Drawer & Path to Ready for Test Design Spec

Implemented locally on 2026-10-06, executing the implementation plan (`docs/superpowers/plans/2026-10-06-erection-drawer-workflow-polish.md`).

## 1. Layout Decision & Overlay Contract

The Erection module now uses the unified right-hand overlay drawer matching Fabrication:
- **Table invariant width:** The field spool table underneath is never pushed, reflowed, or squeezed; its width remains 100% invariant before and after opening the drawer (`delta = 0px`, verified via Playwright).
- **Desktop & Mobile:** On desktop, the drawer is fixed to the right viewport edge occupying `70vw` (and `100vw` when expanded via Maximize/Restore). On mobile (`390x844`), it opens full-screen with a `← Spools` return button, producing zero horizontal overflow (`scrollWidth <= clientWidth`). Backdrop and `Escape` key close the drawer.
- **Persistent Process Navigation:** The `SpoolTimeline` presents the 6 erection process groups in sequence:
  1. `To site`
  2. `Field material`
  3. `Erected`
  4. `Welded / Bolted`
  5. `Supported`
  6. `Ready for Test`
- **Milestone & Evidence Separation:** Four recorded milestones (`to_site`, `erected`, `welded_bolted`, `supported`). `Field material` is shared evidence (QC-13 / BOM trace). `Ready for Test` is strictly derived and has no manual record button.

---

## 2. Workflow Polish across Operations

### 2.1 URL & Safe Selection Ownership (`erection-selection.ts`, `use-erection-readiness.ts`)
- `erectionOperationForPath(pathname, op, legacyStep)` ensures `op` is canonical while legacy `step` query links and standalone routes (`/erection/to-site`, `/erection/welded-bolted`, etc.) continue to resolve correctly.
- `selectErectionRow` strictly validates that the chosen spool revision belongs to the active `projectId`.
- `useErectionReadiness` enforces generation refs and project ownership: changing projects never leaks stale spools or skeletons into the new project.
- Background refresh errors preserve confirmed current-project rows and expose a Retry option with `dataCurrent: boolean` guarding business mutations.
- Unselecting or clearing selection does not reload the project table.

### 2.2 To Site, Erected and Milestone Corrections (`erection-stage-card.tsx`, `erection-stage-screen.tsx`)
- Server stage dates are prominently displayed at the top of the card.
- Milestone corrections are fully supported: when a date already exists, the CTA displays `Record correction` with clear explanation of effective dates.
- Missing predecessor detection: when predecessors are missing (e.g. attempting Erected before To Site), a guided banner with `Go to <Predecessor> →` enables one-click navigation to the blocking step.
- Synchronized command locking via `useErectionCommands` prevents double-submits.
- Protected by `useMarkInputsRecorded` and `data-explicit-unsaved-commit="true"`.

### 2.3 Field Material Check (`field-material-check-screen.tsx`)
- Displays Start Fab / To Site summary, traced lines ratio, and attached QC-13 form at the top.
- Traces table cleanly distinguishes `recordedTraces` and working drafts with badges (`Recorded`, `Edited, not recorded`, `Not recorded`).
- Predecessor check: if To Site is not recorded, an action banner offers `Go to To site →`.
- Re-confirming material traces in the field safely updates the shared record and advances its date without invalidating shop evidence.

### 2.4 Welded / Bolted (`field-weld-progress-screen.tsx`)
- Divided into two mounted sub-panels via `evidenceNav`:
  - `Field joints`: browse joints with local `browsingJoints` folding table; selecting a joint folds the table and provides `Change joint` in `IdentityHeadline`; server facts strip shows Weld number, Weld date, WPS, Welders, Lock status, NDE obligations, and PWHT status. Switching joints safely resets inputs via `useRequestLeave`.
  - `Spool milestone`: direct access to `ErectionStageCard` for the `welded_bolted` milestone without scrolling through the joints table.
- Both sub-panels remain mounted so unrecorded drafts are preserved across tabs.

### 2.5 Supported (`field-support-progress-screen.tsx`)
- Divided into two mounted sub-panels:
  - `Field supports`: lists supports with Support number, Type, Qty, Installed date, and Recorded phase badge. Actions clearly state target intent: `Record in field` for shop records, `Record correction` for field records, `Record installed` for open supports.
  - `Spool milestone`: direct access to `ErectionStageCard` for the `supported` milestone.

### 2.6 Ready for Test Panel (`erection-rft-panel.tsx`)
- Evaluates the 4 RFT criteria: Welded / Bolted, Supported, NDE obligations, and PWHT.
- Open criteria provide direct resolution actions:
  - Welded / Bolted shortfall: `Resolve →` switches drawer directly to the Welded / Bolted operation.
  - Supported shortfall: `Resolve →` switches drawer directly to the Supported operation.
  - NDE shortfall: `Manage in NDE →` deep-link with return context.
  - PWHT shortfall: `Open QC release →` deep-link to QC Release.
- If `isRft` is false and all criteria are met, an actionable discrepancy banner with `Retry refresh` is displayed instead of a false "Ready".

---

## 3. Verification & Screenshots

### 3.1 Automated Verification Script
Automated Playwright verification script at `scripts/verify-erection-drawer.ts`:
- Authenticates using fixture credentials loaded via `tsx --env-file-if-exists=.env.local`.
- Opens `/erection?p=SHOWCASE-1`.
- Measures field spool table bounding box before and after drawer opening (asserting `delta === 0px`).
- Verifies and navigates through all 6 drawer operations: `To site`, `Field material`, `Erected`, `Welded / Bolted`, `Supported`, `Ready for Test`.
- Verifies joint selection and `Change joint` folding.
- Verifies support phase distinctions (`Record in field` vs `Record installed`).
- Verifies RFT blocker actions on blocked spool `SP-1002-A`.
- Tests mobile viewport (`390x844`) asserting zero horizontal overflow (`scrollWidth <= clientWidth`).
- Verifies Fabrication drawer regression check (`Fabrication process` label and drawer remain fully intact).

### 3.2 Captured Artifacts & Screenshots
Located in `docs/superpowers/specs/screenshots/` and persistent artifact directory:
- `erection-desktop-overview.png` — Desktop layout showing full-width table underneath, 70vw overlay drawer, FactsStrip, 6-step Erection process timeline, and Ready for Test verdict.
- `erection-selected-field-joint.png` — Welded / Bolted operation with Field joints tab, selected joint `WJ-1001-A-06`, `Change joint` affordance, server facts strip, and welder form.
- `erection-supported-phase-evidence.png` — Supported operation showing Field supports tab, `fabrication` phase badge, and `Record in field` action button.
- `erection-rft-blockers.png` — Ready for Test screen on blocked spool `SP-1002-A` showing open blockers with `Resolve →` navigation buttons.
- `erection-mobile-drawer-390.png` — Mobile viewport (`390x844`) showing responsive full-width drawer with `← Spools` button and zero horizontal overflow.

---

## 4. Commands to Reproduce

```zsh
# 1. Typecheck
npm run typecheck

# 2. Targeted Unit Tests (5 passing)
node --import tsx --test \
  modules/construction/ui/erection/erection-operations.test.ts \
  modules/construction/ui/erection/erection-selection.test.ts \
  modules/construction/application/describe-erection-readiness.test.ts

# 3. Full Unit Test Suite (531 passing)
npm run test:unit

# 4. Targeted ESLint (0 errors, 0 warnings)
npx eslint \
  modules/construction/ui/spool-drawer.tsx \
  modules/construction/ui/erection/erection-workbench.tsx \
  modules/construction/ui/erection/erection-operations.ts \
  modules/construction/ui/erection/erection-operations.test.ts \
  modules/construction/ui/erection/erection-selection.ts \
  modules/construction/ui/erection/erection-selection.test.ts \
  modules/construction/ui/erection/use-erection-readiness.ts \
  modules/construction/ui/erection/erection-screen-shell.tsx \
  modules/construction/ui/erection/erection-stage-screen.tsx \
  modules/construction/ui/erection/erection-stage-card.tsx \
  modules/construction/ui/erection/field-material-check-screen.tsx \
  modules/construction/ui/erection/field-weld-progress-screen.tsx \
  modules/construction/ui/erection/field-support-progress-screen.tsx \
  modules/construction/ui/erection/erection-rft-panel.tsx \
  modules/construction/ui/spool-list-coverage.test.ts

# 5. Production Next.js build
npm run build

# 6. Browser verification & screenshots
npx tsx --env-file-if-exists=.env.local scripts/verify-erection-drawer.ts
```

---

## 5. Non-functional & Architectural Boundaries Maintained

- **Database / SQL / RLS:** Zero changes made to Supabase SQL, RPCs, migrations, or permissions. No DB resets or seeding commands executed.
- **Capabilities & Gates:** Domain gates (`describeErectionStageGate`, `describeFieldMaterialCheckGate`, `describeFieldWeldProgressGate`) and permissions preserved.
- **Fabrication Integrity:** Shared components (`SpoolDrawer`, `SpoolTimeline`, `FactsStrip`) backward-compatible; tested with automated regression check confirming Fabrication behavior is preserved.
- **Git State:** No commits, pushes, branches, or PRs executed.
