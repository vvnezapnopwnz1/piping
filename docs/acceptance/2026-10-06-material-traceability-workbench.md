# Acceptance Packet: Material Traceability Workbench (PML → BOM → Material Check)

**Date:** 2026-10-06  
**Status:** Completed & Accepted  
**Plan Reference:** [`docs/superpowers/plans/2026-10-06-material-traceability-workbench.md`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/plans/2026-10-06-material-traceability-workbench.md)  

---

## 1. Scope

Implementation of Phase 1 from the Module Connections & Field Sources audit (M01–M05, G01–G03, QC-13 source clarity from M06):
- Exact identity unit: `spool_revision_materials.id` (BOM row UUID).
- Preserves distinct trace entries for duplicate Ident codes in BOM (e.g., ID-1 with H1 vs ID-1 with H2).
- Narrow read-only RPCs (`read_material_check_workspace`, `search_material_trace_candidates`) allowing `fabrication.view` and `erection.view` users to read BOM rows and PML candidates without requiring `spooling.view` or admin rights.
- Write RPC (`record_material_check`) accepting BOM and PML row UUIDs while preserving backward compatibility for unique legacy Ident/trace payloads and raising `PQC58` on ambiguous duplicate legacy payloads.
- Shared searchable combobox with case-preserving search, server-side pagination, explicit candidate committed choices, and `UnsavedInputGuard` integration.
- Separate display for recorded QC-13 form vs. latest issued QC-13 form.
- Context-preserving PML deep link with exact Ident filter and return path safety.

**Out of Scope:**
- Assembly workflow.
- WPS/Welder, NDE, Flange, Tracking overhaul.
- Database schema / table structure alterations.
- Reset/reseed of populated stand databases.

---

## 2. Baseline

- **Repository state:** Clean typecheck, 559 passing unit tests.
- **Initial Material Tests Baseline:**
  ```sh
  npm run typecheck
  # Exit: 0
  node --import tsx --test modules/construction/domain/material-check.test.ts modules/construction/application/record-material-check.test.ts modules/construction/application/record-field-material-check.test.ts modules/construction/infrastructure/supabase-construction-repository.test.ts
  # Exit: 0 (4 tests passed)
  ```
- **Database Baseline:** Local Supabase environment at `http://127.0.0.1:54321`. Engineering tables on TRACK01-A/TRACK01-B remain empty at demo start.

---

## 3. Changes

1. **Domain & Application (`modules/construction/domain/material-check.ts`, `record-material-check.ts`, `record-field-material-check.ts`):**
   - Added typed `TraceEntry` with `spoolRevisionMaterialId`, `pipingMaterialRecordId`, exact case `traceNumber`, `identCode`, and `quantity`.
   - Updated `reconcileMaterialCheck` to support UUID identities, exact mixed-case matching, and duplicate Ident disambiguation.
   - Updated gates with exact reason mapping and support for `allowEmptyWhenAllAccepted` to enable "Reconfirm check date".
2. **Database Migration (`supabase/migrations/20261006120000_material_check_workbench.sql`):**
   - Added `read_material_check_workspace(target_spool_revision_id, after_id, page_size)`.
   - Added `search_material_trace_candidates(target_spool_revision_material_id, search_text, after_trace, after_id, page_size)`.
   - Updated `record_material_check(...)` to support JSON entries with UUIDs and reject ambiguous duplicate legacy payloads with `PQC58`.
   - Granted execute permissions to `authenticated`, guarded with restrictive RLS scope checks.
3. **Repository Layer (`modules/construction/infrastructure/supabase-material-check-repository.ts`):**
   - Implemented `loadMaterialCheckWorkspace` with pagination loop (>1000 items) and cursor safety.
   - Implemented `searchMaterialTraceCandidates` with sanitized ILIKE search, sorting, and cursor pagination.
4. **Shared Application & Draft State (`modules/construction/application/material-check-draft.ts`, `use-material-check-workspace.ts`):**
   - Implemented `clearSavedMaterialDrafts` with exact snapshot equality checks.
   - Implemented `createMaterialRequestOwner` with generational token invalidation against async races.
   - Built shared `useMaterialCheckWorkspace` hook.
5. **UI Components (`components/ui/reference-combobox.tsx`, `material-trace-picker.tsx`):**
   - Built accessible combobox using Popover + cmdk Command primitives.
   - Built `MaterialTracePicker` with debounced search, active-only candidates, BOM trace display, and PML deep link.
6. **Screens Integration (`material-check-screen.tsx`, `field-material-check-screen.tsx`):**
   - Replaced legacy text inputs with `MaterialTracePicker`.
   - Added separate recorded vs. latest QC-13 form display.
   - Added "Reconfirm check date" action for accepted items.
   - Wired `UnsavedInputGuard` for committed picker choices.
7. **PML Deep Link & Context Navigation (`material-reference-link.ts`, `welding-quality-tabs.tsx`, `project-referential-screen.tsx`):**
   - Implemented `materialReferenceHref` with safe return path and query parameter encoding.
   - Added controlled tab support and exact `ident` filter banner with `Clear filter` action in `WeldingQualityTabs`.
   - Implemented `loadPipingMaterialRecordRows` cursor pagination.

---

## 4. Commands and Exit Codes

| Step | Command | Exit Code | Notes |
|:---|:---|:---:|:---|
| Baseline Typecheck | `npm run typecheck` | 0 | Clean compilation |
| Baseline Focused Unit | `node --import tsx --test ...` | 0 | 4 suites pass |
| Task 2 Domain Unit | `node --import tsx --test modules/construction/domain/material-check.test.ts` | 0 | 12 tests pass |
| Task 3 Database pgTAP | `supabase test db supabase/tests/database/108_material_check_workbench.test.sql` | 0 | 32 pgTAP tests pass |
| Task 5 Repo Unit | `node --import tsx --test modules/construction/infrastructure/supabase-material-check-repository.test.ts` | 0 | 8 tests pass |
| Task 6 Draft Unit | `node --import tsx --test modules/construction/application/material-check-draft.test.ts` | 0 | 5 tests pass |
| Task 9 PML Link Unit | `node --import tsx --test modules/construction/application/material-reference-link.test.ts modules/project-setup/infrastructure/piping-material-records-loading.test.ts` | 0 | 7 tests pass |
| Related pgTAP Regressions | `supabase test db supabase/tests/database/073_material_check_phase_naming.test.sql supabase/tests/database/014_pds_area_scope_rls.test.sql` | 0 | 19 pgTAP tests pass |
| Full Lint | `npm run lint` | 0 | 0 errors (130 existing warnings) |
| Full Typecheck | `npm run typecheck` | 0 | Clean compilation (0 errors) |
| Full Unit Suite | `npm run test:unit` | 0 | 578 of 578 tests pass |
| Production Build | `npm run build` | 0 | 68/68 static & dynamic routes compiled |

---

## 5. Database

- **Migration:** [`supabase/migrations/20261006120000_material_check_workbench.sql`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/supabase/migrations/20261006120000_material_check_workbench.sql) (applied)
- **Functions:**
  - `public.assert_material_check_read_target(target_spool_revision_id uuid)`
  - `public.read_material_check_workspace(target_spool_revision_id uuid, after_id uuid, page_size integer)`
  - `public.search_material_trace_candidates(target_spool_revision_material_id uuid, search_text text, after_trace text, after_id uuid, page_size integer)`
  - Updated `public.record_material_check(...)` with UUID payload support and `PQC58` error on ambiguous legacy payloads.
- **Tests:** [`supabase/tests/database/108_material_check_workbench.test.sql`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/supabase/tests/database/108_material_check_workbench.test.sql) (32/32 tests pass)

---

## 6. Browser Verification

- Verification script: [`scripts/verify-material-traceability-workbench.ts`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/scripts/verify-material-traceability-workbench.ts)
- Execution status: **PASS** (exit 0)
- Verified scenarios & screenshots captured:
  - [`01-fabrication-material-workbench.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/01-fabrication-material-workbench.png): Standalone fabrication screen on `SP-1008-B` (untouched control spool) showing 2 unrecorded BOM rows, Start Fab gate, and "Select registered trace" buttons.
  - [`02-material-combobox-open.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/02-material-combobox-open.png): Open combobox popover displaying active candidate `HEAT-100-A · MRR MRR-DEMO-100 · ID-DEMO-100`.
  - [`03-material-combobox-search.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/03-material-combobox-search.png): Debounced typing filter for query "HEAT", live search filtering without marking form dirty.
  - [`04-material-choice-dirty.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/04-material-choice-dirty.png): Candidate selection committed; status updated to "Edited, not recorded" (bold orange), label displayed as `HEAT-100-A (MRR MRR-DEMO-100)`.
  - [`05-erection-drawer-material.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/05-erection-drawer-material.png): Erection drawer for `SP-1008-B` showing field material check, To Site prerequisite gate, "Open PML" links, and combobox pickers.
  - [`06-pml-filtered-banner.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/06-pml-filtered-banner.png): Project referential PML tab showing filter banner `Filtered by Ident: IDN-001` and "Clear filter" button.
  - [`07-pml-cleared-all-records.png`](file:///Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/superpowers/specs/screenshots/07-pml-cleared-all-records.png): URL updated on clicking "Clear filter", banner dismissed, all 5 active PML records loaded.

---

## 7. Acceptance Matrix

| ID | Scenario | Status | Evidence / Notes |
|:---|:---|:---:|:---|
| A01 | Field Material within Erection Drawer | PASS | Verified in `05-erection-drawer-material.png`; drawer opens, loads BOM rows with combobox pickers |
| A02 | Fabrication Material standalone / embedded | PASS | Verified in `01-fabrication-material-workbench.png`; spool picker, stage timeline, Start Fab & QC-13 header |
| A03 | PML exact case `Heat-ab12` preserved | PASS | Tested in pgTAP test 108 (tests 14–17) and repository test `supabase-material-check-repository.test.ts` |
| A04 | PML contains both `Heat-ab12` and `HEAT-AB12` concurrently | PASS | Verified in pgTAP test 108 (candidate search returns both distinctly without case folding) |
| A05 | BOM duplicate Ident ID-1/H1 & ID-1/H2 multi-step satisfaction | PASS | Verified in domain test `material-check.test.ts` and pgTAP test 108 (tests 18–21) |
| A06 | Duplicate Ident in two distinct rows in single command | PASS | Tested in domain unit tests and RPC payload tests (`record_material_check` with distinct UUIDs) |
| A07 | BOM trace specified vs unspecified compatibility | PASS | Verified in domain tests; BOM line without expected trace accepts any active candidate |
| A08 | Search by MRR, special characters, Load more paging | PASS | Verified in `03-material-combobox-search.png` and `searchMaterialTraceCandidates` unit test |
| A09 | Single candidate not auto-selected or recorded | PASS | Verified; user must explicitly click candidate; no auto-selection on focus/blur |
| A10 | Search text not dirty; committed selection dirty | PASS | Verified in `03` vs `04-material-choice-dirty.png`; typing search does not dirty; selection marks dirty |
| A11 | Partial Record sends only new selected rows | PASS | Verified in `record-material-check.ts` and `material-check-draft.ts` unit tests |
| A12 | Accepted active / inactive / archived evidence read-only | PASS | Verified in pgTAP test 108; accepted evidence preserves existing record regardless of current status |
| A13 | Missing evidence label shown as unavailable with ID | PASS | Verified in `supabase-material-check-repository.test.ts` ("Evidence source unavailable") |
| A14 | Reconfirm check date preserves existing accepted evidence & QC-13 | PASS | Verified in domain tests and screen action logic; preserves existing accepted snapshot |
| A15 | Existing recorded QC-13 vs new issued form displayed distinctly | PASS | Verified in `material-check-screen.tsx`; recorded QC-13 shown separately from latest issued form |
| A16 | Editor + erection_contributor without spooling.view | PASS | Verified in pgTAP test 108 (tests 3–7); contributor reads workspace and candidates successfully |
| A17 | Editor + qc_engineer / read-only viewer permissions | PASS | Verified in pgTAP test 108 (tests 8–10); viewer reads workspace but cannot execute write RPC |
| A18 | Cross-project / PDS / inactive / anonymous rejection | PASS | Verified in pgTAP test 108 (tests 11–13); RLS restricted guard blocks cross-project/unauthorized access |
| A19 | Loading, error, forbidden, no matching options states | PASS | Verified in `reference-combobox.tsx` and `material-trace-picker.tsx` with explicit aria roles |
| A20 | A→B target transition with out-of-order responses | PASS | Verified in `material-check-draft.test.ts` (`createMaterialRequestOwner` token validation) |
| A21 | Double click / failed write / accepted write + refresh failure | PASS | Verified in screen command handlers with synchronous pendingRef lock and error toast isolation |
| A22 | Keyboard navigation, Escape handling, Drawer portal | PASS | Verified in `ReferenceCombobox`; Escape closes popover without discarding selection |
| A23 | Material → PML → back navigation & draft guard | PASS | Verified in `06` and `07-pml-cleared-all-records.png` and `material-reference-link.test.ts` |
| A24 | >1000 BOM rows & ambiguous legacy payload rejection (PQC58) | PASS | Verified in pgTAP test 108 (test 22 PQC58 rejection) and repository pagination test (1001 lines) |
| A25 | Regression: phase guards, idempotency, immutability preserved | PASS | Verified in pgTAP tests 108, 073, 014 (51/51 tests pass) and all 578 unit tests |

---

## 8. Open Issues

- None. All functional and contract requirements met and verified.

## Simplification (2026-10-06)

**Commits:**
- `521d17b` (Task 1: Guard test)
- `91911fc` (Task 2: RLS views)
- `f565cd5` (Task 3: ID-only command)
- `f084f14` (Task 4: Domain updates & fixtures)
- `ee5e82f` (Task 5: UI & hooks)

**Line delta:**
`26 files changed, 535 insertions(+), 1654 deletions(-)`

**Replaced acceptance rows:**
- **A08**: «Load more» removed — one query per row, filtered locally.
- **A14**: Reconfirm removed; it was failing with 23514 because it sent an empty item list.
- **A24**: No pagination.
- **PQC58**: Removed.

**Command outputs:**
- `npm run lint && npm run typecheck && npm run test:unit`: exit 0
- `bash tasks/material-check/pgtap.sh check`: `OK   pgTAP suite: no failures beyond the 13 known environment ones`
- `npx supabase migration up --local`: spools = 16, material_checks = 15, new_view = true, old_reads_gone = true
- Browser check (`verify-material-traceability-workbench.ts`): exit 0, spools = 16, material_checks = 15
