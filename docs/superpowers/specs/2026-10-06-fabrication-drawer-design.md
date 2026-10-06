# Fabrication drawer — UX D continuation & Workflow Polish

Implemented locally on 2026-10-06, continuing the Claude session that introduced the spool drawer and executing the workflow polish plan (`docs/superpowers/plans/2026-10-06-fabrication-drawer-workflow-polish.md`).

## Layout decision & Overlay contract

The drawer is a modal overlay anchored to the right edge of the window, occupying `70vw` on desktop and full viewport height (`position: fixed`).
- **Table width preservation:** The spool table underneath is never reflowed or squeezed; its width remains 100% invariant before and after opening the drawer (`delta = 0px` verified via Playwright).
- **Desktop & Mobile:** On desktop, backdrop, close button and `Escape` key close the drawer. On mobile (`390px` viewport), the drawer opens full-screen with a `← Spools` return button, producing zero horizontal overflow (`scrollWidth <= clientWidth`).
- **Operation Stages:** The 5 fabrication operations (`Material` → `Shop welds` → `QC release` → `Paint` → `Laydown`) preserve their ordered progression. Erection remains strictly out of scope.

## Workflow Polish across Operations

### 1. QC Release & Readiness Blockers
- **Readiness projection (`release-checks.ts`):** A pure domain projection computing readiness states (`Revision`, `Material traces`, `Shop welds`, `Supports`, `NDE`, `PWHT`).
- **Actionable Blocker Links:**
  - If material traces are missing: presents an `Open Material` action button switching drawer to Material.
  - If shop welds are incomplete: presents an `Open Shop welds` action button switching drawer to Shop welds.
  - If supports are missing: presents a `Resolve in Supports` action button focusing the embedded Supports panel.
  - If NDE obligations are pending: presents `Manage in NDE →` with deep-link preserving context.
- **Release Decision Banner:** Clearly displays header status badges (`Loading release checks…`, `Blocked`, `Ready for QC release`, `QC released on <date>`). The `QC release spool` button is disabled whenever blockers exist.
- **Unit test coverage:** Comprehensive unit tests in `release-checks.test.ts` covering all blocker combinations.

### 2. Material Check Screen
- **Start Fab & QC-13 Summary:** Top fact banner displaying Start Fab date, traced lines ratio, and QC-13 form status.
- **Clear Next Steps:** Next-step banner offering `Open Shop welds →` as soon as all material lines are traced.
- **Trace Status Badges:** Clear separation between `recordedTraces` and working drafts with badges (`Recorded`, `Edited, not recorded`, `Not recorded`).
- **Input Protection:** Protected with `UnsavedInputGuard` and `useMarkInputsRecorded` preventing dirty loss.

### 3. Shop Welds Screen
- **Server Facts Strip:** Prominent banner above the active joint showing Weld number, Weld date, WPS, Welders, Lock status, NDE obligations, and PWHT status.
- **Draft Management:** Preserves user drafts for the selected joint while switching subtabs, and cleanly resets drafts upon selecting a new joint.
- **State Synchronization:** Parallel re-read of `loadSpoolStatus` and `loadWeldSummaries` ensuring the drawer header, timeline badges, and active joint facts update in unison.

### 4. Paint & Laydown Screen
- **Clear Stage Distinctions:** Full separation between `sentToPaintOn` and `paintedOn`.
- **Preceding Phase Guard:**
  - Paint validates QC release status, presenting a banner with a link to QC release when blocked.
  - Laydown validates Final QC / Paint status, presenting a banner with a link to Paint when blocked.
- **Completion Banner:** Displays an explicit success banner when the spool is placed in laydown: `Fabrication complete. The spool was placed in laydown on <date>.`

### 5. Unsaved Input Guard Hardening
- **Explicit Commit Marker:** `UnsavedInputGuard` supports `[data-explicit-unsaved-commit="true"]`.
- **Protection on Failed RPCs:** `useMarkInputsRecorded` ensures inputs are only re-baselined upon successful server mutation, preventing dirty state corruption on RPC rejection.
- **Control Affordance Compliance:** All operation buttons adhere to `control-affordance.test.ts` by using `<Button loading={pending}>Label</Button>` without swapping text strings.

## Verification & Screenshots

### Automated Verification Script
An automated Playwright verification script was established at `scripts/verify-fabrication-drawer.ts`:
- Signs in using fixture credentials loaded via `tsx --env-file-if-exists=.env.local`.
- Opens `/fabrication?p=SHOWCASE-1`.
- Measures Spool table bounding box before and after drawer opening (asserting `delta === 0px`).
- Navigates through all drawer operations: `QC release`, `Material`, `Shop welds`, `Paint`, `Laydown`.
- Tests blocker navigation by clicking `Open Shop welds` on a blocked spool (`SP-1006-A`).
- Tests mobile viewport (`390x844`) asserting `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

### Captured Artifacts & Screenshots
Located in `docs/superpowers/specs/screenshots/` and persistent artifact directory:
- `qc-release-blockers.png` — QC release screen on released spool with all checks complete and NDE status.
- `qc-release-blocked-spool.png` — QC release screen on blocked spool `SP-1006-A` showing `Blocked` badge, readiness checklist, and action buttons (`Open Shop welds`, `Resolve in Supports`, `Manage in NDE →`).
- `material-screen.png` — Material check screen showing Start Fab summary, `Open Shop welds →` link, and `Recorded` trace badges.
- `shop-welds-joint-form.png` — Shop welds screen showing joint facts strip, lock status, and welder inputs.
- `paint-screen.png` — Paint screen showing server facts strip, Sent to Paint date, and painting activities.
- `laydown-screen.png` — Laydown screen showing completion banner and storage inputs.
- `mobile-drawer-390.png` — Mobile viewport (390x844) showing responsive full-width drawer with zero horizontal overflow.

### Commands to Reproduce

```zsh
# 1. Typecheck
npm run typecheck

# 2. Unit tests (529 tests passing)
npm run test:unit

# 3. Targeted lint (0 errors, 0 warnings)
npx eslint modules/construction/ui/fabrication/release-checks.ts \
  modules/construction/ui/fabrication/release-checks.test.ts \
  modules/construction/ui/fabrication/qc-release-screen.tsx \
  modules/construction/ui/fabrication/material-check-screen.tsx \
  modules/construction/ui/fabrication/weld-progress-screen.tsx \
  modules/construction/ui/fabrication/paint-laydown-screen.tsx \
  modules/construction/ui/fabrication/fabrication-workbench.tsx \
  modules/construction/ui/fabrication/use-context-spool.ts \
  components/pipeqc/unsaved-input-guard.tsx \
  scripts/verify-fabrication-drawer.ts

# 4. Browser verification & screenshots
npx tsx --env-file-if-exists=.env.local scripts/verify-fabrication-drawer.ts
```
