# Track 10 Test Pack & Pressure Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Track 10 placeholder with one Supabase-backed Test Pack aggregate and a durable workflow from Line Check through X clearance, derived RFT, Blinding, Testing, Y reinstatement, Pre-commissioning, and Z reinstatement.

**Architecture:** A stable `test_packs` identity owns project-scoped metadata and active ISO membership; it never owns copied weld, NDE, erection, or flange truth. `isometric_readiness` and `test_pack_readiness` are security-invoker projections over the accepted engineering revision plus Track 06, Track 07, and Track 09 evidence. All operational changes go through capability-checked, idempotent RPCs and append-only request/result records; browser clients receive read access but no direct table writes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Supabase/PostgreSQL with RLS and pgTAP, `@supabase/supabase-js`, Node test runner, Tailwind/shadcn UI, XLSX import through the Track 03 import platform.

---

## Sources and settled decisions

This plan implements the already-approved Track 10 boundary in:

- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`, section 22;
- `docs/marker-output/manual.md`, sections 14–18;
- `docs/research/2026-07-30-easy-piping-documentation-dossier.md`, sections 22–25;
- `docs/research/presentation_findings.md`, “#7 Test Pack — module-specific findings”.

The following decisions are intentional and must not be reopened during execution unless the product owner changes the contract:

1. Composition is normalized at stable ISO identity. A current ISO can have at most one active Test Pack membership; its current accepted revision and spools are resolved by the read model. The legacy import's spool columns validate membership but cannot split one ISO between active Test Packs.
2. Metadata may be edited on any non-archived Test Pack and increments `revision_no`. ISO additions are allowed until testing starts. Removal or movement is allowed only while that ISO has no Line Check or downstream evidence. Any composition change is rejected after testing starts.
3. Import may create Test Packs, update metadata after explicit conflict confirmation, and compose new Test Packs. Adding an ISO to an existing Test Pack remains a manual Builder action, matching manual section 15.2.
4. ISO RFT is derived as `non-empty AND construction complete AND QC released AND Line Check done AND open X = 0`. Test Pack RFT is `non-empty AND every active member ISO is RFT`. Blinding and testing are downstream and never enter the RFT formula.
5. “Construction complete” includes Supported/Welded-Bolted evidence for every current spool and completed Track 09 bolt-up progress for every current flange joint. “QC released” means no outstanding NDE or PWHT obligation on current shop or field welds; it is not a second mutable release flag.
6. Only Category X punch items are created by Track 10 Line Check. Categories Y and Z are revision-bound flange categories published by Track 09 and drive reinstatement.
7. The canonical downstream order is `RFT → Blinding complete → Testing started → Testing complete → all Y reinstated → Pre-commissioning complete → all Z reinstated`. A missing Y or Z population satisfies only that category's quantity gate; it does not bypass earlier stages.
8. Request pages render printable HTML from durable request IDs. Generated PDFs, Storage artifacts, dossier bundles, signatures, and checksums remain Track 11 scope.
9. The only documented numeric Explorer code is `12 = Ready For Test`. Do not invent codes for intermediate states; show semantic labels and RAG badges until an authoritative code table exists.
10. Supabase mode must not import a mock/Zustand Test Pack store, store manual `readyForTest`, or use a watcher to mutate RFT.

## Execution preconditions

- Stabilize the current Track 09 working tree before starting Track 10. At plan-writing time the checkout contains uncommitted Track 09 files and migrations through `20260812094200_flange_import_spooling_compat.sql`; preserve that work and do not overlap it.
- Confirm Track 09 automated gates and its published `flange_joint_readiness` contract. Browser acceptance may remain a separately reported blocker, but schema and generated types must be stable before Track 10 migrations begin.
- Use migration versions after `20260812094200`; this plan reserves `20260813090000` through `20260813095000`.
- Do not create a branch, worktree, commit, push, reset, restore, or stage files unless the user separately authorizes Git operations.

## File map

### New database files

- `supabase/migrations/20260813090000_test_pack_referentials.sql`
- `supabase/migrations/20260813091000_test_pack_core.sql`
- `supabase/migrations/20260813092000_test_pack_import.sql`
- `supabase/migrations/20260813093000_line_check_punch.sql`
- `supabase/migrations/20260813094000_test_pack_readiness.sql`
- `supabase/migrations/20260813095000_pressure_test_workflow.sql`
- `supabase/tests/database/100_test_pack_referentials.test.sql`
- `supabase/tests/database/101_test_pack_composition.test.sql`
- `supabase/tests/database/102_test_pack_import.test.sql`
- `supabase/tests/database/103_line_check_punch.test.sql`
- `supabase/tests/database/104_test_pack_readiness.test.sql`
- `supabase/tests/database/105_pressure_test_transitions.test.sql`

### New TypeScript module

- `modules/pressure-test/domain/test-pack.ts`
- `modules/pressure-test/domain/test-pack.test.ts`
- `modules/pressure-test/domain/punch-item.ts`
- `modules/pressure-test/domain/punch-item.test.ts`
- `modules/pressure-test/domain/readiness.ts`
- `modules/pressure-test/domain/readiness.test.ts`
- `modules/pressure-test/domain/pressure-test-workflow.ts`
- `modules/pressure-test/domain/pressure-test-workflow.test.ts`
- `modules/pressure-test/application/manage-test-pack.ts`
- `modules/pressure-test/application/manage-test-pack.test.ts`
- `modules/pressure-test/application/manage-line-check.ts`
- `modules/pressure-test/application/manage-line-check.test.ts`
- `modules/pressure-test/application/manage-pressure-test.ts`
- `modules/pressure-test/application/manage-pressure-test.test.ts`
- `modules/pressure-test/infrastructure/supabase-pressure-test-errors.ts`
- `modules/pressure-test/infrastructure/supabase-pressure-test-errors.test.ts`
- `modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts`
- `modules/pressure-test/infrastructure/supabase-pressure-test-repository.test.ts`
- `modules/pressure-test/ui/test-pack-dashboard.tsx`
- `modules/pressure-test/ui/test-pack-dashboard.test.ts`
- `modules/pressure-test/ui/test-pack-builder-screen.tsx`
- `modules/pressure-test/ui/test-pack-builder-screen.test.ts`
- `modules/pressure-test/ui/test-pack-explorer-screen.tsx`
- `modules/pressure-test/ui/test-pack-explorer-screen.test.ts`
- `modules/pressure-test/ui/pressure-test-home-screen.tsx`
- `modules/pressure-test/ui/request-preparation-screen.tsx`
- `modules/pressure-test/ui/line-check-progress-screen.tsx`
- `modules/pressure-test/ui/item-clearance-progress-screen.tsx`
- `modules/pressure-test/ui/blinding-progress-screen.tsx`
- `modules/pressure-test/ui/testing-precomm-progress-screen.tsx`
- `modules/pressure-test/ui/reinstatement-progress-screen.tsx`
- `modules/pressure-test/ui/request-print-view.tsx`

### New fixture and QA files

- `scripts/bootstrap-track10-browser-fixtures.ts`
- `scripts/bootstrap-track10-browser-fixtures.test.ts`
- `docs/TRACK10_BROWSER_FIXTURES.md`
- `docs/qa/track-10-agent-walkthrough.md`

### Existing files changed

- Track 02 punch-code domain, repository, and Test Pack referential UI files named in Task 1;
- Track 03 import domain, parser, repository, workbench, and focused tests named in Task 3;
- `lib/supabase/database.types.ts` after all migrations;
- every existing `app/testpack/**/page.tsx` placeholder named in Tasks 8 and 9;
- `config/navigation.ts`, `config/route-capabilities.test.ts`, `app/page.tsx`, and `package.json`;
- the master roadmap and `docs/deferred-work.md` only during evidence-based closeout.

## Task 1: Add the missing punch-code referential

**Files:**

- Create: `supabase/migrations/20260813090000_test_pack_referentials.sql`
- Create: `supabase/tests/database/100_test_pack_referentials.test.sql`
- Modify: `modules/project-setup/domain/execution-reference.ts`
- Modify: `modules/project-setup/domain/execution-reference.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`
- Modify: `modules/project-setup/ui/execution-reference-tabs.tsx`
- Modify: `modules/project-setup/ui/referential-dialogs.test.ts`

- [x] **Step 1: Write failing domain and repository tests.**

  Add `PunchCodeInput`/`PunchCode` expectations with trimmed uppercase `code`, required trimmed `description`, and the shared active/inactive reference status. Specify `listPunchCodes(projectId)` and `createPunchCode(projectId, input)` against `project_punch_codes`.

  Run:

  ```bash
  node --import tsx --test modules/project-setup/domain/execution-reference.test.ts modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts
  ```

  Expected: FAIL because the punch-code contract and repository methods do not exist.

- [x] **Step 2: Write the failing pgTAP authorization test.**

  Prove that `project_punch_codes` is project-scoped, code uniqueness is case-insensitive per project, project admins with `project_referential.manage` can create/deactivate entries, ordinary Test Pack users can read active entries through `testpack.view`, and cross-project leakage is impossible.

  Run:

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/100_test_pack_referentials.test.sql
  ```

  Expected before migration: FAIL because `project_punch_codes` is missing.

- [x] **Step 3: Implement the referential migration.**

  Create `project_punch_codes(id, project_id, code, description, status, created_at, updated_at)`, a unique expression index on `(project_id, upper(btrim(code)))`, the same-project trigger pattern used by Track 02, RLS, read policy for `testpack.view`, management policy/command boundary for `project_referential.manage`, and reference-usage protection so a used code is deactivated rather than deleted.

- [x] **Step 4: Implement the domain/repository/UI path.**

  Add Punch Codes to the existing Test Pack tab in `execution-reference-tabs.tsx`. Reuse the existing reference dialog and status badge; do not build a second admin screen. Keep create/deactivate controls behind `project_referential.manage`.

- [x] **Step 5: Run focused verification.**

  Run the two Node test files, `modules/project-setup/ui/referential-dialogs.test.ts`, and pgTAP 100. Expected: all pass.

- [x] **Step 6: Suggested checkpoint.**

  Suggested commit message if Git authorization is later granted: `feat(project-setup): add test pack punch codes`.

## Task 2: Create the stable Test Pack aggregate and atomic composition commands

**Files:**

- Create: `supabase/migrations/20260813091000_test_pack_core.sql`
- Create: `supabase/tests/database/101_test_pack_composition.test.sql`
- Create: `modules/pressure-test/domain/test-pack.ts`
- Create: `modules/pressure-test/domain/test-pack.test.ts`

- [x] **Step 1: Write failing domain tests for Test Pack metadata and composition decisions.**

  Cover these exact rules:

  - `testPackNumber`, `location`, and `priority` are trimmed non-empty strings;
  - `medium` is `H`, `P`, or `V`;
  - pressure is positive and finite; volume is optional but, when present, positive and finite;
  - planned start and end are ISO dates and end is not before start;
  - system, subsystem, service class, and line service IDs are required;
  - pressure unit is not a browser-owned ID: the server resolves the project's single `project_pressure_units.unit` row and persists that enum value as a definition snapshot;
  - ISO IDs are non-empty, unique, and normalized without reordering the user's selection;
  - metadata edits increment the displayed revision; readiness and workflow state are absent from the mutation input.

  Run:

  ```bash
  node --import tsx --test modules/pressure-test/domain/test-pack.test.ts
  ```

  Expected: FAIL because the module does not exist.

- [x] **Step 2: Add the minimal domain contract.**

  Export `TestPackMedium`, `TestPackLifecycle`, `TestPackDefinition`, `TestPackMember`, `CreateTestPackInput`, `UpdateTestPackInput`, and `normalizeTestPackInput`. Keep DB column mapping out of the domain file.

- [x] **Step 3: Write the failing composition pgTAP test.**

  The test must exercise:

  - create with active same-project system/subsystem/service class/line service references and an existing project pressure-unit row;
  - rejection for inactive, mismatched, cross-project, and out-of-PDS references;
  - stable Test Pack number uniqueness and `revision_no = 0` on create;
  - metadata update increments `revision_no` and writes an audit event;
  - compose only a stable ISO with a current accepted, non-removed revision;
  - one active Test Pack per stable ISO under concurrent/duplicate calls;
  - same-key idempotent replay and different-payload receipt conflict;
  - removal/move while the ISO has no workflow evidence;
  - archive makes the pack read-only and releases active membership only through the archive command;
  - authenticated users have SELECT only; direct INSERT/UPDATE/DELETE fails.

  Run:

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/101_test_pack_composition.test.sql
  ```

  Expected before migration: FAIL on missing tables/functions.

- [x] **Step 4: Create the core tables.**

  `test_packs` must contain stable identity plus `project_id`, normalized `test_pack_number`, `revision_no`, system/subsystem/service-class/line-service IDs, the server-resolved `pressure_unit` enum snapshot, `planned_start_on`, `planned_end_on`, `priority`, `test_medium`, `test_pressure`, `location`, optional `volume_m3`, `lifecycle`, creator/updater timestamps, and no readiness/status flag.

  `test_pack_isometrics` must contain `project_id`, `test_pack_id`, stable `isometric_id`, `assigned_isometric_revision_id` as an audit snapshot, `assigned_at/by`, nullable `removed_at/by`, and source metadata (`manual` or `import`, optional `source_import_job_id`). A partial unique index on `isometric_id WHERE removed_at IS NULL` enforces the one-active-pack invariant.

- [x] **Step 5: Implement atomic RPCs.**

  Add `create_test_pack`, `update_test_pack`, `compose_test_pack`, `remove_test_pack_isometric`, `move_test_pack_isometric`, and `archive_test_pack`. Each RPC must:

  - use `SECURITY DEFINER`, fixed `search_path`, `testpack.manage`, active membership, and PDS checks;
  - validate every referenced row inside the transaction;
  - use `claim_command_receipt`/`complete_command_receipt` and an advisory transaction lock keyed by Test Pack or ISO;
  - never accept `revision_no`, lifecycle, readiness, or actor IDs from the browser;
  - retain removed membership rows for history;
  - call `test_pack_composition_is_locked(test_pack_id, isometric_id)`, introduced in core with only the facts available at that migration;
  - let migration 093 replace the helper to include Line Check/punch evidence and migration 095 replace it again to include Blinding/testing/reinstatement evidence;
  - never statically reference a table created by a later migration and never weaken the helper when replacing it.

- [x] **Step 6: Add scoped read models and RLS.**

  Create `test_pack_catalog` and `test_pack_member_worklist` security-invoker views. A scoped user must not see a partial Test Pack: return a pack only when every active member ISO passes `current_user_in_pds_scope`; an empty pack is visible to its creator/project-wide roles but has zero members and is never ready.

- [x] **Step 7: Run focused verification.**

  Run the domain test and pgTAP 101. Expected: all assertions pass.

- [x] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): add stable aggregate and composition`.

## Task 3: Add Test Pack XLSX import through Track 03

**Files:**

- Create: `supabase/migrations/20260813092000_test_pack_import.sql`
- Create: `supabase/tests/database/102_test_pack_import.test.sql`
- Modify: `modules/imports/domain/import-type.ts`
- Modify: `modules/imports/domain/import-type.test.ts`
- Modify: `modules/imports/domain/parsers/rules.ts`
- Modify: `modules/imports/domain/parsers/rules.test.ts`
- Modify: `modules/imports/infrastructure/supabase-import-errors.ts`
- Modify: `modules/imports/infrastructure/supabase-import-errors.test.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.test.ts`
- Modify: `modules/imports/ui/import-workbench.tsx`

- [x] **Step 1: Specify the exact import contract in failing tests.**

  Add `test_pack_composition` with natural key `test_pack_number + iso_number`. Columns are:

  ```text
  System, Subsystem, Test Pack, Test Pack Rev, Test Medium,
  Test Pressure, Planned Start, Planned End, Priority, Service Class,
  Line Service, Volume m3, Test Pack Location,
  ISO Number, ISO Revision, Spool Number, Spool Revision
  ```

  `Spool Number` and `Spool Revision` are required compatibility evidence but multiple rows are grouped into one whole-ISO membership. Client parsing must normalize `dd-MM-yyyy` to ISO dates, uppercase codes/medium, reject unknown medium, and flag inconsistent metadata within the same Test Pack as blockers.

  Run the four focused import domain/parser tests. Expected: FAIL because the import type is unknown.

- [x] **Step 2: Add the client-side definition and workbook rules.**

  Preserve generic history rendering for unknown future import types. The workbench must display a warning that existing Test Packs can be updated only after conflict confirmation and additional ISO membership is a manual Builder action.

- [x] **Step 3: Write failing pgTAP import tests.**

  Cover unknown system/subsystem/service class/line service, nonexistent ISO/spool, wrong accepted revisions, spool not belonging to ISO, partial ISO rows, duplicate active membership, cross-project/PDS data, metadata overwrite conflicts, and atomic rollback. Prove that apply requires both `imports.manage` and `testpack.manage` and that re-applying an applied job is rejected/idempotent according to the Track 03 lifecycle.

- [x] **Step 4: Implement server revalidation and apply.**

  Extend the `import_jobs` type constraint and add `revalidate_test_pack_import_job(job_id)` plus `apply_test_pack_import_job(job_id, confirm_conflicts boolean)`. Apply must group normalized rows by Test Pack and ISO, call the same invariant logic as the manual commands, create new packs/composition, update existing metadata only with confirmed conflicts, and emit a conflict instead of adding a new ISO to an existing Test Pack.

- [x] **Step 5: Wire repository dispatch.**

  Route only `test_pack_composition` to `apply_test_pack_import_job`; keep `flange_progress` on its dedicated RPC and all existing kinds on `apply_import_job`. Add error mappings for composition conflict, revision mismatch, and manual-add-required responses.

- [x] **Step 6: Run focused verification.**

  Run all modified import tests and pgTAP 102. Expected: all pass with existing import types unchanged.

- [x] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(imports): support test pack composition`.

## Task 4: Implement Line Check, Category X punch, and Item Clearance

**Files:**

- Create: `supabase/migrations/20260813093000_line_check_punch.sql`
- Create: `supabase/tests/database/103_line_check_punch.test.sql`
- Create: `modules/pressure-test/domain/punch-item.ts`
- Create: `modules/pressure-test/domain/punch-item.test.ts`

- [x] **Step 1: Write failing punch-domain tests.**

  Specify required checking/completion dates, current Test Pack membership, stable ISO, optional stable spool belonging to that ISO, active punch code, editable non-empty description snapshot, automatic item number, and Category X only. Specify clearance as a later immutable fact; a browser input cannot mark a punch cleared during creation.

- [x] **Step 2: Add the minimal punch domain model.**

  Export `PunchItem`, `LineCheckAssignment`, `LineCheckResult`, `ItemClearanceAssignment`, and normalization functions. Keep request-number generation and actor IDs server-owned.

- [x] **Step 3: Write the failing pgTAP workflow test.**

  Prove:

  - Line Check preparation accepts one or more active member ISOs whose current spools are Welded/Bolted and Supported;
  - selected team is active, same-project, and `team_type = 'line_check'`;
  - one durable request header has one or more ISO request items and a unique project/request number;
  - duplicate open assignment for the same Test Pack/ISO is rejected;
  - progress cannot precede assignment and records one completion plus zero or more X punches atomically;
  - item numbers are unique under concurrent calls;
  - Item Clearance preparation accepts only open X punches after Line Check completion and an active `finishing` team;
  - clearance progress is append-only, idempotent, and cannot clear a punch twice;
  - a request with no progress may be cancelled; a started request cannot be cancelled;
  - cross-project, out-of-scope, direct-write, and stale-membership attempts fail.

- [x] **Step 4: Create the durable request schema.**

  Add `pressure_test_requests` with `request_type IN ('line_check','item_clearance','blinding','reinstatement')`, `test_pack_id`, Test Pack revision snapshot, team, assigned date, request number, creator timestamps, and optional cancelled metadata. Do not store a mutable request status; read views derive it from target/result counts and cancellation metadata. Add type-specific target tables rather than a polymorphic unvalidated UUID:

  - `line_check_request_items(request_id, isometric_id)`;
  - `item_clearance_request_items(request_id, punch_item_id)`;
  - downstream target tables are added in migration 095.

  Add `line_check_results`, `punch_items`, and `punch_item_clearances`. All business facts are immutable; cancellation and correction use explicit metadata/events, not in-place payload edits.

  Replace `test_pack_composition_is_locked` so it returns true for an ISO once any Line Check request, result, punch, or clearance references that membership. Retain every lock condition from migration 091.

- [x] **Step 5: Implement commands.**

  Add `assign_line_check`, `record_line_check_result`, `assign_item_clearance`, `record_punch_clearance`, and `cancel_pressure_test_request`. Every command must re-read membership, accepted engineering revision, construction eligibility, capability, PDS scope, team type, and active referentials inside the transaction.

- [x] **Step 6: Add read models.**

  Create `line_check_worklist`, `item_clearance_worklist`, and `pressure_test_request_details` security-invoker views. The details view is the only data source for both progress UI and print routes.

- [x] **Step 7: Run focused verification.**

  Run the punch domain test and pgTAP 103. Expected: all pass.

- [x] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): add line check and X clearance`.

## Task 5: Build authoritative ISO and Test Pack readiness projections

**Files:**

- Create: `supabase/migrations/20260813094000_test_pack_readiness.sql`
- Create: `supabase/tests/database/104_test_pack_readiness.test.sql`
- Create: `modules/pressure-test/domain/readiness.ts`
- Create: `modules/pressure-test/domain/readiness.test.ts`

- [x] **Step 1: Write the mandatory domain truth table first.**

  Test `deriveIsometricReadiness` with the master-roadmap cases:

  | Non-empty | Complete | QC released | Line Check | X open | Blinding | RFT |
  | --- | --- | --- | --- | ---: | --- | --- |
  | yes | yes | yes | done | 0 | not started | yes |
  | yes | no | yes | done | 0 | done | no |
  | yes | yes | no | done | 0 | done | no |
  | yes | yes | yes | pending | 0 | done | no |
  | yes | yes | yes | done | 1 | done | no |
  | yes | yes | yes | done | 0 | done | yes |
  | no | yes | yes | done | 0 | done | no |

  Add Test Pack aggregation cases for zero members, one blocked member, all-ready members, and archived packs.

- [x] **Step 2: Implement the pure readiness functions.**

  Return blocker codes and counts as well as the boolean: `NO_CURRENT_REVISION`, `NO_SPOOLS`, `WELD_OR_SUPPORT_PENDING`, `FLANGE_PENDING`, `NDE_PENDING`, `PWHT_PENDING`, `LINE_CHECK_PENDING`, `X_OPEN`. Blinding/testing fields are not inputs.

- [x] **Step 3: Write the failing database truth-table test.**

  Build one accepted ISO revision with multiple spools, welds, supports, and flange joints. Advance one upstream fact at a time and assert the views change immediately without updating a Test Pack row. Include a revision replacement case to prove stable ISO membership resolves the new accepted definition and stale revision evidence does not leak forward.

- [x] **Step 4: Create `isometric_readiness`.**

  Aggregate only the current accepted, non-removed ISO/spool/weld/support/flange definitions. Expose totals/completed counts, NDE/PWHT pending counts, Line Check assigned/completed dates, open X count, blocker JSON, `is_complete`, `is_qc_released`, `is_rft`, and derived `rft_on`.

  Use Track 07 `spool_erection_readiness` for stage/field quality evidence and Track 09 `flange_joint_readiness` for current flange completion. Do not copy either source into Track 10 tables.

- [x] **Step 5: Create `test_pack_readiness` and Explorer views.**

  Aggregate active members only. Expose member/spool/weld/flange counts, every blocker count, `is_rft`, earliest/latest workflow dates, and derived `unit_time` as the sum of current flange `calculated_ut` snapshots. Add `test_pack_release_backlog`, `test_pack_iso_status`, and `test_pack_spool_status`; show numeric code `12` only when RFT.

- [x] **Step 6: Protect projection access.**

  Use `security_invoker = true`, grant SELECT only to authenticated, and preserve complete-pack PDS visibility rather than returning misleading partial aggregates.

- [x] **Step 7: Run focused verification.**

  Run the domain test and pgTAP 104. Expected: truth table and dynamic upstream changes all pass.

- [x] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): derive authoritative readiness`.

## Task 6: Implement Blinding, Testing, Y/Pre-commissioning/Z reinstatement

**Files:**

- Create: `supabase/migrations/20260813095000_pressure_test_workflow.sql`
- Create: `supabase/tests/database/105_pressure_test_transitions.test.sql`
- Create: `modules/pressure-test/domain/pressure-test-workflow.ts`
- Create: `modules/pressure-test/domain/pressure-test-workflow.test.ts`

- [x] **Step 1: Write failing state-machine tests.**

  Model these states and transitions:

  ```text
  awaiting_rft
    -> rft
    -> blinding_assigned
    -> blinded
    -> testing
    -> tested
    -> awaiting_y_reinstatement
    -> ready_for_precommissioning
    -> precommissioned
    -> awaiting_z_reinstatement
    -> complete
  ```

  The derived state skips `awaiting_y_reinstatement` or `awaiting_z_reinstatement` only when that category has zero eligible current flange joints. Dates must be monotonic. Reinstatement eligibility is Y after testing completion and Z after pre-commissioning completion.

- [x] **Step 2: Add the pure workflow model.**

  Export stage/event types, `derivePressureTestState`, and transition guards. Keep team, user, and database IDs out of the pure decision function.

- [x] **Step 3: Write failing pgTAP transition tests.**

  Cover the happy path plus rejections for Blinding before RFT, testing before Blinding completion, testing completion before start, pre-commissioning before all Y reinstatement, Y before test completion, Z before pre-commissioning, wrong flange category, stale flange revision, flange outside the Test Pack, wrong team type, direct mutation, and cross-project/PDS access.

  Also prove:

  - upstream regression after RFT blocks a new Blinding assignment until readiness is restored;
  - existing immutable request/history remains readable after an upstream revision;
  - same idempotency key returns the original result;
  - corrections create a superseding record and never edit the original payload.

- [x] **Step 4: Add downstream target/result tables.**

  Add `blinding_request_items(request_id, test_pack_id)`, `reinstatement_request_items(request_id, flange_joint_revision_id)`, `blinding_records`, append-only `pressure_test_stage_events`, and `flange_reinstatement_records`. Reinstatement records store joint date, report number, jointer team, tag number, category/timing snapshot, recorder, and optional superseded-record link.

  Replace `test_pack_composition_is_locked` again so any Blinding request/result, pressure-test stage, or reinstatement request/result freezes the whole pack composition. Retain the Line Check/punch conditions added by migration 093.

- [x] **Step 5: Implement Blinding commands.**

  `assign_blinding` requires current `test_pack_readiness.is_rft`, an active same-project `blinding` team, and no open/complete Blinding request. `record_blinding` requires the request and records one immutable completion date.

- [x] **Step 6: Implement Testing and Pre-commissioning commands.**

  `record_pressure_test_stage(test_pack_id, stage, occurred_on, idempotency_key)` accepts only `testing_started`, `testing_completed`, or `precommissioning_completed`, re-derives the predecessor state inside the transaction, and appends an event. It never accepts preparation/team data because the manual explicitly has no Testing preparation workflow.

- [x] **Step 7: Implement Y/Z reinstatement commands.**

  `assign_reinstatement` selects current Track 09 flange revision IDs from active member ISOs, checks `requires_reinstatement`, category, timing, and stage eligibility, and assigns an active `reinstatement` team. `record_reinstatement` requires the durable request item plus an active `jointer` team and writes an immutable progress record.

- [x] **Step 8: Create downstream worklists/projection.**

  Add `blinding_worklist`, `testing_precomm_worklist`, `reinstatement_worklist`, and `test_pack_operation_status`. These views derive Ready/Ongoing/Completed counts and never store a lifecycle flag on `test_packs`.

- [x] **Step 9: Run focused verification.**

  Run the workflow domain test and pgTAP 105. Expected: all transitions and negative paths pass.

- [x] **Step 10: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): add pressure test workflow`.

## Task 7: Add application services and the Supabase repository

**Files:**

- Create all application and infrastructure files listed in the File map.

- [x] **Step 1: Write failing repository contract tests.**

  Use the existing fake Supabase client pattern to specify exact view selects and RPC payloads for:

  - catalog, member worklist, Builder options, readiness, backlog, ISO/spool status;
  - create/update/compose/remove/move/archive;
  - request worklists/details;
  - Line Check/X, Blinding, Testing/Pre-commissioning, and Reinstatement commands.

  Assert every project list query includes `.eq("project_id", projectId)` even where RLS also applies.

- [x] **Step 2: Write failing error mapping tests.**

  Map database codes to actionable UI messages:

  - `PQC80`: invalid Test Pack/reference/scope;
  - `PQC81`: ISO membership conflict or composition locked;
  - `PQC82`: Line Check not eligible;
  - `PQC83`: Punch/clearance conflict;
  - `PQC84`: Test Pack is not RFT;
  - `PQC85`: invalid pressure-test transition;
  - `PQC86`: flange is not eligible for Y/Z reinstatement;
  - existing `42501`, `PQC10`, `PQC11`, and `PQC12` retain their shared access/project/idempotency meanings.

- [x] **Step 3: Implement the repository.**

  Keep row-to-domain mappers private and tolerant of nullable/open shared fields. Centralize select-column strings so schema changes cannot silently diverge between single and list reads.

- [x] **Step 4: Write failing application tests.**

  Specify validation-before-RPC, no repository call on invalid input, generated browser idempotency key when absent, and return shapes that force the UI to reload readiness after every successful command.

- [x] **Step 5: Implement three focused application services.**

  `manage-test-pack.ts` owns metadata/composition orchestration; `manage-line-check.ts` owns Line Check and X clearance; `manage-pressure-test.ts` owns downstream transitions. Do not create a generic “execute action” service with untyped payloads.

- [x] **Step 6: Add project-switch safety.**

  UI loaders in the next tasks must use `RequestVersion` or effect cleanup, clear stale rows immediately when `projectId` changes, and ignore late results from the previous project.

- [x] **Step 7: Run all module unit tests.**

  ```bash
  node --import tsx --test "modules/pressure-test/**/*.test.ts"
  ```

  Expected: all pass.

- [x] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): add Supabase application boundary`.

## Task 8: Replace the Test Pack dashboard, Builder, and Explorer placeholders

**Files:**

- Create the dashboard/Builder/Explorer UI files and tests listed in the File map.
- Modify: `app/testpack/page.tsx`
- Modify: `app/testpack/builder/page.tsx`
- Modify: `app/testpack/explorer/page.tsx`
- Modify: `config/navigation.ts`
- Modify: `config/route-capabilities.test.ts`
- Modify: `app/page.tsx`

- [x] **Step 1: Write failing screen-state tests.**

  Cover empty/loading/error/project-switch states, view-only vs `testpack.manage`, scoped visibility, and these critical interactions:

  - create Test Pack with exact general fields;
  - filter available ISOs by system/subsystem and add them atomically;
  - edit metadata and see `revision_no` increment;
  - remove/move only when the server reports eligible;
  - Explorer drilldown System/Subsystem → Test Pack → ISO → Spool;
  - blocker links navigate to the owning Fabrication/NDE/Erection/Flange/Pressure Test screen.

- [x] **Step 2: Implement `TestPackDashboard`.**

  Show Ready/Ongoing counts for Line Check, Item Clearance, Testing, and Reinstatement at Test Pack/ISO/flange levels, global filters, backlog tables, and links to Explorer/worklists. Read all figures from projections; no component-local KPI formulas.

- [x] **Step 3: Implement `TestPackBuilderScreen`.**

  Use one definition form and two lists: current members and available accepted ISOs. Display the whole-ISO composition rule, server blocker messages, and a confirmation dialog before move/archive. Disable all mutations without `testpack.manage` while retaining read access.

- [x] **Step 4: Implement `TestPackExplorerScreen`.**

  Implement the manual's seven tabs:

  - Test Pack: General, Release Tracking, Operation Management, Progress Status;
  - ISO: Spool Status, Isometric Status;
  - Spool: detailed status.

  General displays derived Unit Time. Release Tracking exposes weld/flange/NDE/PWHT/Line Check/X counts. Only RFT gets code `12`; intermediate statuses use labels and RAG without invented numeric codes.

- [x] **Step 5: Wire routes and navigation.**

  Replace `NotOnSupabaseYet`, obtain `projectId` and `can("testpack.manage")` from the access context, remove `planned: 'Track 10'`, keep `/testpack` under `testpack.view`, and mark the home-card module live only after the screens read Supabase successfully.

- [x] **Step 6: Run focused UI/unit tests and typecheck.**

  Run the three screen tests, `config/route-capabilities.test.ts`, and `npm run typecheck`. Expected: all pass.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): connect builder and explorer`.

## Task 9: Replace all Pressure Test and print placeholders

**Files:**

- Create the Pressure Test UI files listed in the File map.
- Modify every existing page under `app/testpack/pressure-test/**`.
- Modify every existing page under `app/testpack/print/**`.

- [x] **Step 1: Write failing view-model tests for the shared preparation shell.**

  Define a typed configuration for `line_check`, `item_clearance`, `blinding`, and `reinstatement`: title, eligibility columns, target label, required team type, assign application method, and print route. Reject unsupported request types at compile time.

- [x] **Step 2: Implement the Pressure Test home screen.**

  `/testpack/pressure-test` shows the canonical order and per-stage Ready/Ongoing/Completed counts. Section landing pages explain eligibility and link to Preparation/Progress, except Testing & Pre-commissioning which links only to Progress.

- [x] **Step 3: Implement the four Preparation screens.**

  Reuse `RequestPreparationScreen` for search, team selection, multi-select, assignment, durable request number, and “Open printable request”. Eligibility comes from server worklists; the browser must not infer or override it.

- [x] **Step 4: Implement specialized Progress screens.**

  - Line Check: completion date and zero or more X punch rows with ISO/spool, punch code, editable description.
  - Item Clearance: selected assigned X items and clearance date.
  - Blinding: assigned Test Pack and completion date.
  - Testing/Pre-commissioning: one permitted next stage/date at a time.
  - Reinstatement: assigned flange joints with joint date, report number, jointer, and tag number.

  Reload server projections after each mutation and preserve successful durable IDs across refresh.

- [x] **Step 5: Implement print views from durable request IDs.**

  Each `[requestId]` page loads `pressure_test_request_details`, verifies the path's request type, renders request number/project/Test Pack/revision/team/date/targets, and provides `window.print()`. Missing, cross-project, or wrong-type IDs render a safe not-found/error state. Do not generate a PDF or write Storage.

- [x] **Step 6: Wire every existing page.**

  Replace all placeholders under Line Check, Item Clearance, Blinding, Testing/Pre-commissioning, Reinstatement, and print routes. Keep capability gating centralized in `ROUTE_CAPABILITIES` and mutation buttons behind `testpack.manage`.

- [x] **Step 7: Run focused tests and build.**

  Run `node --import tsx --test "modules/pressure-test/**/*.test.ts"`, `npm run typecheck`, and `npm run build`. Expected: all pass and no client page exports server-only metadata.

- [ ] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(testpack): connect pressure test screens`.

## Task 10: Add deterministic local fixtures and authenticated browser acceptance

**Files:**

- Create: `scripts/bootstrap-track10-browser-fixtures.ts`
- Create: `scripts/bootstrap-track10-browser-fixtures.test.ts`
- Create: `docs/TRACK10_BROWSER_FIXTURES.md`
- Create: `docs/qa/track-10-agent-walkthrough.md`
- Modify: `package.json`

- [x] **Step 1: Write the failing fixture-contract test.**

  Assert local-only URL refusal, required environment variables, stable UUID/number constants, no credential logging, idempotent upserts, and preservation of the open workflow state needed by browser testing.

- [x] **Step 2: Build the fixture graph.** The bootstrap reconciles the existing `TRACK01-A` graph so Track 04–09 accepted revisions and published flange facts remain intact; it does not clone the entire engineering graph into a second project.

  Bootstrap Track 01/03/04/05/06/07/09 prerequisites, then create:

  - project `PipeQC Track 10 Browser QA`;
  - Test Pack candidate `TP-T10-001` with two accepted ISOs;
  - one ISO fully upstream-ready and one controlled blocker for the negative path;
  - one open Line Check path that creates `X-T10-001`;
  - completed current flange progress with one Y flange and one Z flange;
  - active Line Check, Finishing, Blinding, Reinstatement, and Jointer teams;
  - punch code `P-T10-001`.

  Do not pre-create Line Check completion, X clearance, Blinding, test dates, or reinstatement results; the browser walkthrough owns those mutations.

- [x] **Step 3: Add the package command and fixture documentation.**

  Add `bootstrap:track10-browser-fixtures`. Document exact local-only safety checks, required preceding migrations, how to enter credentials interactively without storing them, expected created IDs/numbers, and idempotent rerun behavior.

- [x] **Step 4: Write the exact browser walkthrough.**

  The runbook must include URLs, controls, fixture values, expected durable state, refresh checks, and PASS/FAIL/BLOCKED evidence for:

  1. create `TP-T10-001` and add the eligible ISO in `/testpack/builder`;
  2. confirm duplicate active ISO assignment is rejected;
  3. assign and complete Line Check with `X-T10-001`;
  4. confirm RFT remains false while X is open;
  5. assign/clear X and confirm ISO/Test Pack RFT becomes true without a manual toggle;
  6. prove Blinding before RFT is rejected on the blocked candidate;
  7. assign/complete Blinding on `TP-T10-001`;
  8. record Testing start/done;
  9. prove Pre-commissioning before Y reinstatement is rejected;
  10. assign/complete Y reinstatement, record Pre-commissioning, then assign/complete Z;
  11. open every printable request by durable ID and refresh all progress pages;
  12. verify a read-only user has no mutation controls and a scoped user sees no partial pack;
  13. re-run Track 06 rejected-repair, Track 07 derived-RFT, and Track 09 flange-history browser regressions.

- [ ] **Step 5: Run fixture verification twice.** (requires out-of-band local service key)

  ```bash
  node --import tsx --test scripts/bootstrap-track10-browser-fixtures.test.ts
  npm run bootstrap:track10-browser-fixtures
  npm run bootstrap:track10-browser-fixtures
  ```

  Expected: unit test passes; both bootstrap runs finish with the same fixture identities and no duplicated memberships/requests.

- [ ] **Step 6: Execute browser Gate D.** (not run in this session)

  Run the authenticated walkthrough in an isolated local browser profile. Record each case as PASS/FAIL/BLOCKED. Automated verification does not substitute for this gate.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `test(testpack): add browser acceptance fixtures`.

## Task 11: Regenerate types, run the full gates, and close the roadmap honestly

**Files:**

- Modify: `lib/supabase/database.types.ts`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Modify: `docs/deferred-work.md`

- [x] **Step 1: Regenerate database types after the final migration.**

  ```bash
  /opt/homebrew/bin/supabase gen types typescript --local > /private/tmp/track10-database.types.ts
  ```

  Inspect the generated diff, then replace `lib/supabase/database.types.ts` using `apply_patch` or the repository's approved mechanical generation workflow. Confirm all six migrations, views, and RPC signatures appear.

- [x] **Step 2: Run focused database tests in dependency order.**

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/100_test_pack_referentials.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/101_test_pack_composition.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/102_test_pack_import.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/103_line_check_punch.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/104_test_pack_readiness.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/105_pressure_test_transitions.test.sql
  ```

  Expected: all assertions pass.

- [ ] **Step 3: Run the complete automated gate.** (full lint/db retain baseline failures)

  ```bash
  npm run lint
  npm run typecheck
  npm run test:unit
  npm run test:db
  npm run build
  ```

  Expected: every command exits 0. Report any environment/baseline failure separately from Track 10 failures.

- [x] **Step 4: Inspect the final diff and forbidden patterns.**

  ```bash
  git diff --check
  rg -n "testpack-store|readyForTest|recordSpoolRFT|NotOnSupabaseYet" app/testpack modules/pressure-test
  ```

  Expected: `git diff --check` is clean; the pattern search returns no Supabase-mode store/watcher/manual-RFT/placeholder usage. Print-view `window.print` is allowed and is not part of this search.

- [x] **Step 5: Update roadmap and deferred work from evidence.**

  Mark Track 10 implementation/automated items complete only after their corresponding tests pass. Mark browser Gate D complete only after the authenticated walkthrough passes. If browser execution is unavailable, add one precise `T10-D1` entry with fixture command, runbook path, blocked cases, and required environment; do not label Track 10 fully accepted.

- [ ] **Step 6: Confirm exit criteria.** (browser Gate D remains open)

  Track 10 is complete only when:

  - Builder and Explorer read one database model;
  - one active ISO cannot belong to two active Test Packs;
  - upstream weld/NDE/PWHT/erection/flange changes alter readiness without watcher mutations;
  - the mandatory RFT truth table passes and empty packs remain not RFT;
  - invalid workflow transitions are rejected in RPCs;
  - the full browser sequence reaches Z reinstatement and survives refresh;
  - printable forms resolve durable request IDs;
  - Track 06/07/09 regression paths remain green;
  - automated and browser evidence are reported separately.

- [ ] **Step 7: Suggested final checkpoint.**

  Suggested commit message: `feat(testpack): complete Track 10 pressure test workflow`.

## Deliberately deferred to later tracks

- Track 11: generated PDFs, request checksums, signatures, dossier/handover ZIP, Weld History/NDE Clearance/Punch reports, Storage lifecycle.
- Track 08: barcode/QR and offline movement scanning; Track 10 composition does not wait on physical tracking.
- Track 12: performance/load tuning, production observability, backup/restore rehearsal, pilot release gates.
- Numeric Explorer codes other than documented `12 = Ready For Test`.
- Owner/client examination coordination; Track 06 remains the owner of NDE result acceptance.
- Splitting one ISO across multiple active Test Packs. Supporting that later requires a separate spool-membership aggregate and a revised RFT contract, not a hidden relaxation of the Track 10 invariant.
