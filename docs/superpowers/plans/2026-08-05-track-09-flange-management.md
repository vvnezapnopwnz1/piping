# Track 09 Flange Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the smallest manual-aligned flange-progress workflow: configure its required referentials, record or import one effective progress entry with one or more jointers, preserve correction and revision history, and publish a bolting-readiness fact for Track 10.

**Architecture:** Reuse Track 04 flange identities and shared revision decisions, Track 03 import jobs, Track 01 capabilities/PDS scope, and existing project referentials. Keep business history append-only behind database commands; expose scoped read models to the browser. Both manual entry and XLSX apply call one private database routine so eligibility and UT calculation cannot diverge.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase/PostgreSQL, pgTAP, Node test runner, XLSX import infrastructure, ESLint.

---

## Delivery rules

- Implement only the workflow approved in `docs/superpowers/specs/2026-08-05-track-09-flange-management-design.md`.
- Do not add torque assignment, separate torque verification, Test Pack assignment, reinstatement commands, Assembly, generated reports, or a configurable state machine.
- Treat the Easy Piping manual as normative intent and migrations/generated types/runtime as the current contract.
- Add forward-only migrations after `20260811090000_erection_readiness_material_naming.sql`; never edit an applied migration.
- Write a failing focused test before each production change, run it to observe the intended failure, make the smallest implementation, then rerun the focused test.
- Do not run `supabase db reset` without explicit approval because it destroys local data. Focused pgTAP uses `/opt/homebrew/bin/supabase test db --local <path>`.
- Do not stage, commit, branch, push, reset, restore, or create a worktree unless the user explicitly authorizes Git operations. The commit boundaries below are handoff suggestions only.
- Keep browser acceptance separate from automated verification and record PASS, FAIL, or BLOCKED with evidence.
- Never put local credentials in source, fixtures, docs, screenshots, or shell history. Browser code receives only the public Supabase URL and publishable key.

## Fixed product and data decisions

| Decision | Track 09 contract |
|---|---|
| Operational states | Derived `not_started`, `completed`, `revision_mismatch` only |
| Progress ownership | One effective append-only record per `flange_joint_revision_id` |
| Correction | Insert a replacement and close only the old row's supersession metadata |
| Jointing method | Active `system_reference_entries(kind = 'torquing_requirement')` row |
| Joint category | Active same-project `project_joint_categories` row |
| Jointers | One or more active same-project `project_teams(team_type = 'jointer')` rows |
| Project UT activity | Exact canonical value `FLANGE_JOINTING` |
| UT rule selection | Exact normalized flange rating first, wildcard rule second |
| Missing UT input | Persist `calculated_ut = null`; show/import a warning; do not block progress |
| Revision carry-over | Existing Track 04 decision plus `revision_progress_copies.progress_kind = 'flange_progress'` |
| Definition import | Existing Track 04 SpoolGen `bolt.txt`; Track 09 does not duplicate it |
| Progress import | Track 03 import type `flange_progress`, atomic apply, confirmed conflicts supersede history |
| Downstream output | Read-only `flange_joint_readiness`; Track 10 owns Test Packs and reinstatement |
| Error namespace | `PQC70` through `PQC78` |

## Planned file map

New files:

- `supabase/migrations/20260812090000_flange_referential_prerequisites.sql`
- `supabase/migrations/20260812090500_flange_referential_unique_fix.sql`
- `supabase/migrations/20260812090600_flange_legacy_policy_compat.sql`
- `supabase/migrations/20260812091000_flange_progress_schema.sql`
- `supabase/migrations/20260812091500_flange_policy_recursion_fix.sql`
- `supabase/migrations/20260812092000_flange_progress_commands.sql`
- `supabase/migrations/20260812093000_flange_revision_readiness.sql`
- `supabase/migrations/20260812093100_flange_copy_snapshot_forward_fix.sql`
- `supabase/migrations/20260812093200_flange_worklist_project_column.sql`
- `supabase/migrations/20260812094000_flange_progress_import.sql`
- `supabase/migrations/20260812094100_flange_legacy_policy_forward_fix.sql`
- `supabase/migrations/20260812094200_flange_import_spooling_compat.sql`
- `supabase/tests/database/090_flange_referential_prerequisites.test.sql`
- `supabase/tests/database/091_flange_progress_schema.test.sql`
- `supabase/tests/database/092_flange_progress_commands.test.sql`
- `supabase/tests/database/093_flange_revision_readiness.test.sql`
- `supabase/tests/database/094_flange_progress_import.test.sql`
- `modules/flange/domain/flange-progress.ts`
- `modules/flange/domain/flange-progress.test.ts`
- `modules/flange/domain/ut-calculation.ts`
- `modules/flange/domain/ut-calculation.test.ts`
- `modules/flange/application/record-flange-progress.ts`
- `modules/flange/application/record-flange-progress.test.ts`
- `modules/flange/infrastructure/supabase-flange-errors.ts`
- `modules/flange/infrastructure/supabase-flange-errors.test.ts`
- `modules/flange/infrastructure/supabase-flange-repository.ts`
- `modules/flange/infrastructure/supabase-flange-repository.test.ts`
- `modules/flange/ui/flange-worklist-screen.tsx`
- `modules/flange/ui/flange-worklist-screen.test.ts`
- `modules/flange/ui/flange-progress-form.tsx`
- `modules/flange/ui/flange-progress-form.test.ts`
- `modules/flange/ui/flange-history-panel.tsx`
- `scripts/bootstrap-track09-browser-fixtures.ts`
- `scripts/bootstrap-track09-browser-fixtures.test.ts`
- `docs/TRACK09_BROWSER_FIXTURES.md`
- `docs/qa/track-09-agent-walkthrough.md`

Existing files changed only where listed in a task:

- Track 02 referential domain/repositories/screens and their focused tests;
- Track 03 import type/parser/repository/workbench and focused tests;
- `lib/supabase/database.types.ts` after migrations;
- `config/route-capabilities.ts`, its test, and `config/navigation.ts`;
- `app/flange/page.tsx`, `app/erection/flange-progress/page.tsx`, and `app/page.tsx`;
- `package.json`, the master roadmap, and `docs/deferred-work.md` during closeout.

## Task 1: Make the four required referentials configurable

**Files:**

- Create: `supabase/migrations/20260812090000_flange_referential_prerequisites.sql`
- Create: `supabase/tests/database/090_flange_referential_prerequisites.test.sql`
- Modify: `modules/project-setup/domain/system-referential.ts`
- Modify: `modules/project-setup/domain/system-referential.test.ts`
- Modify: `modules/project-setup/domain/execution-reference.ts`
- Modify: `modules/project-setup/domain/execution-reference.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-system-referential-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-system-referential-repository.test.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.ts`
- Modify: `modules/project-setup/infrastructure/supabase-execution-reference-repository.test.ts`

- [ ] **Step 1: Add failing domain tests for the exact create contracts.**

  Assert that `SystemReferenceEntry.kind` accepts both `material_type` and `torquing_requirement`; a torquing requirement requires non-empty normalized `code` and `description`; a UT rule accepts positive finite coefficients and an optional trimmed uppercase `flangeRating`; and a unit-time reference normalizes its activity to `FLANGE_JOINTING`.

  Run:

  ```bash
  node --import tsx --test modules/project-setup/domain/system-referential.test.ts modules/project-setup/domain/execution-reference.test.ts
  ```

  Expected: FAIL because torquing create input, rating-aware UT input, and the canonical flange activity are not modeled yet.

- [ ] **Step 2: Add the smallest domain contracts.**

  Export `FLANGE_JOINTING_ACTIVITY = "FLANGE_JOINTING"`. Extend the system entry kind union. Add validators that return trimmed values and reject empty text, non-finite numbers, non-positive coefficients, reversed diameter ranges, and a blank rating when the optional rating field is supplied.

- [ ] **Step 3: Add failing repository tests.**

  Specify these calls and payloads:

  ```ts
  createTorquingRequirement(client, { code, description })
  createUtCalculationRule(client, {
    diaFrom,
    diaTo,
    flangeRating,
    coefficientDiameter,
    coefficientRating,
  })
  createUnitTimeReference(client, projectId, {
    activity: FLANGE_JOINTING_ACTIVITY,
    projectUt,
    standardReference,
  })
  ```

  Expected tables are `system_reference_entries`, `system_ut_calculation_rules`, and `project_unit_time_references`. Repository errors must pass through the existing referential error mapper.

- [ ] **Step 4: Write the prerequisite migration and pgTAP test.**

  The migration must:

  - add nullable `flange_rating text` to `system_ut_calculation_rules`;
  - add a check that a non-null rating is not blank;
  - replace the diameter-only uniqueness with a unique expression index on `dia_from`, `dia_to`, and `coalesce(upper(btrim(flange_rating)), '*')`;
  - preserve existing rows as wildcard rules rather than backfilling guessed ratings;
  - add create policies for platform admins on torquing requirements and UT rules using the existing platform-admin helper;
  - retain read access and existing material-type behavior;
  - add the same project-admin create authorization pattern used by other `project_unit_time_references` rows;
  - keep browsers from directly modifying operational flange data.

  The repository must load `torquing_requirement` rows from the table and stop using `TORQUING_METHODS` as the runtime source. A static list may remain only as migration/bootstrap input if an existing caller still needs it during the transition.

  The pgTAP test must prove platform admin creation, ordinary-user refusal, project-admin same-project unit-time creation, cross-project refusal, rating-specific plus wildcard uniqueness, and preservation of a legacy wildcard row.

  Run:

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/090_flange_referential_prerequisites.test.sql
  ```

  Expected before the migration: FAIL on the missing column/policies. Expected after it: all assertions pass.

- [ ] **Step 5: Implement repository methods and rerun focused tests.**

  Run the two Node test files from Step 1 plus both repository test files. Expected: PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message if Git authorization is later granted: `feat(project-setup): configure flange prerequisites`.

## Task 2: Expose create-only referential UI

**Files:**

- Modify: `modules/project-setup/ui/system-referential-screen.tsx`
- Modify: `modules/project-setup/ui/execution-reference-tabs.tsx`
- Modify: `modules/project-setup/ui/welding-quality-tabs.tsx`
- Modify: `modules/project-setup/ui/referential-dialogs.test.ts`

- [ ] **Step 1: Extend the failing source-guard test.**

  Require visible labels and callable create handlers for:

  - `Add torquing requirement` with Code and Description;
  - `Add UT calculation rule` with Diameter from/to, optional Flange rating, Diameter coefficient, Rating coefficient;
  - `Add flange unit time` fixed to activity `FLANGE_JOINTING` with Project quantity and Standard reference;
  - `Add joint category` with Joint definition, Timing, Category X/Y/Z, Reason, Coefficient, and Status.

  Require `canManage` to hide or disable all four mutations for readers. Do not require edit, archive, bulk upload, or delete controls.

  Run:

  ```bash
  node --import tsx --test modules/project-setup/ui/referential-dialogs.test.ts
  ```

  Expected: FAIL because only part of these create flows is wired today.

- [ ] **Step 2: Wire the four forms to existing/new repository methods.**

  Reuse the current dialog, validation-message, loading, durable refresh, and capability patterns. Joint category must call the existing `createJointCategory`; do not create a second repository method. The unit-time form must submit the fixed canonical activity rather than asking the user to type it.

- [ ] **Step 3: Verify focused behavior.**

  Run:

  ```bash
  node --import tsx --test modules/project-setup/ui/referential-dialogs.test.ts modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.test.ts
  npm run typecheck
  ```

  Expected: PASS. Manual smoke later must create one row through each screen so the demo is not dependent on hidden SQL.

- [ ] **Step 4: Suggested checkpoint.**

  Suggested commit message: `feat(project-setup): add flange referential forms`.

## Task 3: Define the pure flange domain

**Files:**

- Create: `modules/flange/domain/flange-progress.ts`
- Create: `modules/flange/domain/flange-progress.test.ts`
- Create: `modules/flange/domain/ut-calculation.ts`
- Create: `modules/flange/domain/ut-calculation.test.ts`

- [ ] **Step 1: Write the UT truth table first.**

  Use the exact formula:

  ```ts
  calculatedUt = projectQuantity
    * coefficientDiameter
    * coefficientRating
    * coefficientPunch
  ```

  Assert a normal result, decimal inputs, each missing coefficient returning `null`, zero/negative/non-finite input rejection, exact rating winning over wildcard, and no matching diameter range returning the non-blocking `UT not configured` warning.

- [ ] **Step 2: Write progress normalization tests.**

  Assert trimming of report/tag, ISO date preservation, stable jointer de-duplication by UUID/code, rejection of an empty jointer list, duplicate jointers, future dates, non-positive values, and blank required strings. Assert derived states for no progress, effective progress, and a non-current/removed revision.

  Run:

  ```bash
  node --import tsx --test modules/flange/domain/flange-progress.test.ts modules/flange/domain/ut-calculation.test.ts
  ```

  Expected: FAIL because the files do not exist.

- [ ] **Step 3: Implement framework-free functions and types.**

  Domain files may import only other domain files. They must not import React, Supabase, stores, route modules, or generated database types. Export explicit `FlangeProgressState`, `FlangeProgressInput`, `FlangeUtInputs`, `FlangeUtSnapshot`, normalization result, warning, and calculation types.

- [ ] **Step 4: Rerun focused tests.**

  Expected: PASS with no database or browser setup.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `feat(flange): define progress and UT domain`.

## Task 4: Add append-only progress schema and scoped read models

**Files:**

- Create: `supabase/migrations/20260812091000_flange_progress_schema.sql`
- Create: `supabase/tests/database/091_flange_progress_schema.test.sql`

- [ ] **Step 1: Write failing schema/RLS tests.**

  Cover table/column/type existence, foreign keys, positive finite jointing value, non-future date, one effective record per flange revision, unique jointer per record, select grants, no authenticated insert/update/delete grants, PDS-scoped reads, cross-project refusal, and immutable business fields/assignments.

- [ ] **Step 2: Create the schema.**

  Add enum `flange_progress_source` with `manual`, `import`, `revision_copy` and table `flange_progress_records` containing:

  ```text
  id, project_id, flange_joint_revision_id, joint_category_id,
  torquing_requirement_id, jointing_method_snapshot, jointing_value,
  joint_date, report_number, tag_number, source_kind,
  source_import_job_id, supersedes_record_id, superseded_at,
  ut_project_quantity, ut_coefficient_diameter,
  ut_coefficient_rating, ut_coefficient_punch,
  ut_formula_version, calculated_ut, recorded_by, recorded_at
  ```

  Add `flange_jointer_assignments(progress_record_id, jointer_team_id, jointer_code_snapshot, jointer_name_snapshot)`. Use a partial unique index on `flange_joint_revision_id where superseded_at is null`. Use triggers to reject direct changes to business columns, reject assignment update/delete, and permit only the command's narrowly defined supersession transition.

- [ ] **Step 3: Add scoped read views.**

  Create security-invoker views for:

  - `flange_joint_worklist`: current accepted engineering definition plus effective progress and derived status;
  - `flange_progress_history`: all versions and aggregated jointers, newest first.

  Forward-replace engineering read policies needed by these views so `flange.view` is sufficient and PDS scope stays fail-closed. Do not require `spooling.view` merely to use Flange Management. Prove a flange-only role can see in-scope rows and cannot see an out-of-scope PDS.

- [ ] **Step 4: Run focused pgTAP.**

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/091_flange_progress_schema.test.sql
  ```

  Expected: PASS with an exact planned assertion count and no diagnostics.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `feat(flange): add append-only progress schema`.

## Task 5: Implement the single progress command

**Files:**

- Create: `supabase/migrations/20260812092000_flange_progress_commands.sql`
- Create: `supabase/tests/database/092_flange_progress_commands.test.sql`

- [ ] **Step 1: Write command tests before SQL.**

  Test this public signature:

  ```sql
  public.record_flange_progress(
    target_project_id uuid,
    target_flange_joint_revision_id uuid,
    target_joint_category_id uuid,
    target_torquing_requirement_id uuid,
    target_jointing_value numeric,
    target_joint_date date,
    target_report_number text,
    target_tag_number text,
    target_jointer_ids uuid[],
    target_idempotency_key text,
    target_replaces_progress_id uuid default null
  ) returns jsonb
  ```

  Assertions must cover:

  - `flange.manage` required and `flange.view` alone refused;
  - current accepted, non-removed flange revision required;
  - project and PDS scope required;
  - active same-project category/method/jointers required;
  - at least one jointer and duplicate refusal;
  - invalid value/date/text refusal;
  - successful record with two jointers;
  - exact UT snapshot and `flange-ut-v1`;
  - missing UT rule/category coefficient produces a successful null UT;
  - retry with the same idempotency key returns the original receipt/result;
  - a second first-record attempt is refused;
  - correction requires the current effective ID;
  - correction inserts a new row, retains old payload/jointers, and closes the old row;
  - a stale correction target is refused;
  - audit event and shared command receipt are durable.

- [ ] **Step 2: Implement one private invariant routine.**

  Add a non-browser-executable helper used later by import and revision copy. It must resolve and lock the target, validate all referentials, normalize the exact rating then wildcard UT lookup, calculate/snapshot UT, insert progress and assignments, and apply a correction only to the current row. The public function wraps this helper with capability, scope, idempotency receipt, audit, and stable error mapping.

  Use transaction-scoped advisory locking keyed by project plus flange revision. Revoke the helper from `public`, `anon`, and `authenticated`; grant only the public command to `authenticated`.

- [ ] **Step 3: Assign stable error meanings.**

  Use this non-overlapping catalog:

  | Code | Meaning |
  |---|---|
  | `PQC70` | missing `flange.manage` |
  | `PQC71` | project/PDS scope mismatch |
  | `PQC72` | stale, removed, or non-current flange revision |
  | `PQC73` | missing/inactive/wrong-project referential |
  | `PQC74` | invalid field shape, value, or future date |
  | `PQC75` | empty, duplicate, inactive, or wrong-project jointer set |
  | `PQC76` | effective record exists or correction target is stale |
  | `PQC77` | import job state, blocker, or unconfirmed conflict |
  | `PQC78` | revision copy absent, invalid, or already materialized |

- [ ] **Step 4: Run focused and nearby regression pgTAP.**

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/092_flange_progress_commands.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/041_revision_workflow.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/042_spooling_apply.test.sql
  ```

  Expected: all pass.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `feat(flange): record immutable progress`.

## Task 6: Add revision carry-over and readiness publication

**Files:**

- Create: `supabase/migrations/20260812093000_flange_revision_readiness.sql`
- Create: `supabase/tests/database/093_flange_revision_readiness.test.sql`

- [ ] **Step 1: Write failing revision/readiness tests.**

  Prove that `done_without_modification` can authorize flange progress copy to the matching stable `flange_joint_id`; `not_done`, `cancelled`, rework/changed, removed target, and a missing target do not copy. A copy must retain business values, jointers, and original UT snapshot, set `source_kind = 'revision_copy'`, keep provenance, and materialize once.

  Prove readiness changes from incomplete to complete only for the current accepted revision and exposes category/timing/reason, `requires_reinstatement` for Y/Z, effective progress/date, calculated UT, and formula version. It must not write ISO RFT or any Test Pack state.

- [ ] **Step 2: Extend the shared revision authorization.**

  Extend the `revision_progress_copies.progress_kind` check with `flange_progress`. Forward-replace both latest forms of `create_manual_revision` and `apply_spooling_import_job` so eligible flange change items insert that authorization alongside existing kinds.

  Before adding the new kind, forward-replace `materialize_progress_copies` so it explicitly filters only `fabrication_start`, `sent_to_paint`, and `paint`. This prevents its current fallback branch from treating `flange_progress` as painted fabrication progress.

- [ ] **Step 3: Add dedicated materialization and readiness view.**

  Add `materialize_flange_progress_copies(target_project_id uuid, target_idempotency_key text) returns jsonb`. Require `flange.manage`, use the shared receipt/audit pattern, select only authorized unmaterialized flange copies, match source/target by stable flange identity, and call the private progress invariant routine.

  Publish security-invoker view `flange_joint_readiness` with only facts defined by the approved design. Grant select through `flange.view` and preserve PDS scope.

- [ ] **Step 4: Run focused and regression tests.**

  ```bash
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/093_flange_revision_readiness.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/053_construction_projections.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/070_construction_phase_transitions.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/072_erection_rft.test.sql
  ```

  Expected: all pass; Track 07 erection RFT remains derived only from Track 07 facts.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `feat(flange): carry revision progress and publish readiness`.

## Task 7: Add the TypeScript application and repository boundary

**Files:**

- Create: `modules/flange/application/record-flange-progress.ts`
- Create: `modules/flange/application/record-flange-progress.test.ts`
- Create: `modules/flange/infrastructure/supabase-flange-errors.ts`
- Create: `modules/flange/infrastructure/supabase-flange-errors.test.ts`
- Create: `modules/flange/infrastructure/supabase-flange-repository.ts`
- Create: `modules/flange/infrastructure/supabase-flange-repository.test.ts`
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Specify the port and use case in failing tests.**

  The application port exposes `listFlangeWorklist`, `listFlangeHistory`, `listFlangeFormOptions`, `recordFlangeProgress`, and `materializeFlangeProgressCopies`. The use case validates/normalizes with domain functions, creates one idempotency key per user action, submits no UI-only fields, and returns the durable database result.

- [ ] **Step 2: Specify Supabase query/RPC guards.**

  Repository tests must assert exact view names, selected fields, project filters, generated RPC argument names, and no direct insert/update/delete against progress tables. Error tests map `PQC70`–`PQC78` to concise user messages and map unknown failures to one generic message without exposing SQL text.

  Run:

  ```bash
  node --import tsx --test modules/flange/application/record-flange-progress.test.ts modules/flange/infrastructure/supabase-flange-errors.test.ts modules/flange/infrastructure/supabase-flange-repository.test.ts
  ```

  Expected: FAIL because the module does not exist.

- [ ] **Step 3: Generate types after all migrations through Task 6 are applied.**

  Run:

  ```bash
  /opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
  ```

  Expected: `lib/supabase/database.types.ts` contains the new tables, views, enums, and functions. Review the diff and confirm no unrelated schema drift before continuing.

- [ ] **Step 4: Implement the use case, repository, and error catalog.**

  Keep conversion functions explicit and tolerant at display boundaries. Do not cast open database text directly to a narrow UI union without a visible fallback.

- [ ] **Step 5: Verify boundaries.**

  ```bash
  node --import tsx --test modules/flange/application/record-flange-progress.test.ts modules/flange/infrastructure/supabase-flange-errors.test.ts modules/flange/infrastructure/supabase-flange-repository.test.ts
  npm run typecheck
  ```

  Expected: PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(flange): add Supabase application boundary`.

## Task 8: Add Track 03 flange-progress import

**Files:**

- Create: `supabase/migrations/20260812094000_flange_progress_import.sql`
- Create: `supabase/tests/database/094_flange_progress_import.test.sql`
- Modify: `modules/imports/domain/import-type.ts`
- Modify: `modules/imports/domain/import-type.test.ts`
- Modify: `modules/imports/domain/parsers/registry.ts`
- Modify: `modules/imports/domain/parsers/registry.test.ts`
- Modify: `modules/imports/domain/parsers/rules.ts`
- Modify: `modules/imports/domain/parsers/rules.test.ts`
- Modify: `modules/imports/infrastructure/xlsx-workbook.ts`
- Modify: `modules/imports/infrastructure/xlsx-workbook.test.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.ts`
- Modify: `modules/imports/infrastructure/supabase-import-repository.test.ts`
- Modify: `modules/imports/infrastructure/supabase-import-errors.ts`
- Modify: `modules/imports/infrastructure/supabase-import-errors.test.ts`
- Modify: `modules/imports/ui/import-workbench.tsx`

- [ ] **Step 1: Add failing type/parser/template tests.**

  Add `flange_progress` to `IMPORT_TYPES` and label it `Flange progress`. Define this exact template order:

  ```text
  ISO Number, Revision, BT Number, Jointing Method, Jointing Value,
  Joint Category, Reason, Joint Date, Report Number, Jointer Codes, Tag Number
  ```

  Parse `Jointer Codes` as a comma-separated trimmed list with case-stable de-duplication. Unit tests must distinguish blockers for missing required cells/invalid number/date/duplicate jointer code from a UT configuration warning.

- [ ] **Step 2: Write atomic apply pgTAP first.**

  Add `flange_progress` to the database import-type check. Test job ownership/project scope, required `imports.manage` plus `flange.manage`, validated-state requirement, server revalidation, blocker refusal, warning acceptance, unconfirmed existing-progress conflict, confirmed superseding conflict, multi-row rollback when one row fails, accurate applied count/IDs, audit, retained source metadata, and idempotent replay.

- [ ] **Step 3: Implement a dedicated apply RPC.**

  Create `apply_flange_progress_import_job(target_job_id uuid, confirm_conflicts boolean default false) returns import_jobs`. It must lock the job, derive issues again from staged rows, resolve ISO/revision/BT/category+reason/method/jointers, and call the same private invariant routine from Task 5 for every row in one transaction. Confirmed conflicts pass the current progress ID as the replacement target. UT gaps remain warnings.

- [ ] **Step 4: Dispatch from the repository by import type.**

  Change `applyImportJob` to receive the import type or the loaded job, call `apply_flange_progress_import_job` only for `flange_progress`, and retain `apply_import_job` for existing types. Update the workbench caller and tests. Do not rewrite the generic import lifecycle.

- [ ] **Step 5: Run focused verification.**

  ```bash
  node --import tsx --test modules/imports/domain/import-type.test.ts modules/imports/domain/parsers/registry.test.ts modules/imports/domain/parsers/rules.test.ts modules/imports/infrastructure/xlsx-workbook.test.ts modules/imports/infrastructure/supabase-import-repository.test.ts modules/imports/infrastructure/supabase-import-errors.test.ts
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/094_flange_progress_import.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/030_import_lifecycle.test.sql
  /opt/homebrew/bin/supabase test db --local supabase/tests/database/031_import_apply_atomicity.test.sql
  ```

  Expected: all pass and existing import types still use their original apply path.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `feat(imports): apply flange progress workbooks`.

## Task 9: Replace both flange placeholders with one shared UI

**Files:**

- Create: `modules/flange/ui/flange-worklist-screen.tsx`
- Create: `modules/flange/ui/flange-worklist-screen.test.ts`
- Create: `modules/flange/ui/flange-progress-form.tsx`
- Create: `modules/flange/ui/flange-progress-form.test.ts`
- Create: `modules/flange/ui/flange-history-panel.tsx`
- Modify: `app/flange/page.tsx`
- Modify: `app/erection/flange-progress/page.tsx`
- Modify: `app/page.tsx`
- Modify: `config/navigation.ts`
- Modify: `config/route-capabilities.ts`
- Modify: `config/route-capabilities.test.ts`

- [ ] **Step 1: Add failing route-capability tests.**

  Assert both `/flange` and the more specific `/erection/flange-progress` require `flange.view`. Insert the specific route before the generic `/erection` entry because matching is first-prefix-wins. Assert unrelated Track 07 erection routes retain their current capabilities.

  Run:

  ```bash
  node --import tsx --test config/route-capabilities.test.ts
  ```

  Expected: FAIL because the dedicated erection flange route currently inherits `erection.view`.

- [ ] **Step 2: Build one shared worklist, not two state stores.**

  First add failing source/behavior tests proving browse and operational modes import the same screen/repository contract, project changes invalidate stale requests, and durable refresh follows a successful command. Prove the operational mode renders the required fields, repeatable jointer controls, correction target, UT warning, and disabled reasons; prove the browse mode has no mutation form.

  Run:

  ```bash
  node --import tsx --test modules/flange/ui/flange-worklist-screen.test.ts modules/flange/ui/flange-progress-form.test.ts
  ```

  Expected: FAIL because the components do not exist.

  Then implement the shared screen. `/flange` renders browse mode: KPI counts, filters, accepted/history definitions, effective progress, and immutable history. `/erection/flange-progress` renders operational mode over the same repository/read model and adds the form. Project changes must invalidate outstanding loads through request versioning/effect cleanup.

- [ ] **Step 3: Implement the minimum form.**

  Include category, method, positive jointing value, date, report number, tag number, and repeatable jointer selectors. Show calculated preview or `UT not configured`. Label actions exactly `Record progress` and `Correct progress`. A correction must carry the currently displayed effective progress ID and must refresh durable state after success.

  Disable mutation with a visible reason for missing `flange.manage`, stale/removed revision, missing required referential options, or out-of-scope rows. Do not show controls or labels for assigned/bolted/verified/reinstated stages.

- [ ] **Step 4: Implement worklist/history presentation.**

  Show ISO, revision, line, PDS, BT number, diameter/rating, bolt details, category, method/value, jointers, date, report, tag, UT, status, actor, time, source, and revision-copy provenance. Unknown shared text values render as their raw safe label or `Unknown`, never crash through a narrow cast.

- [ ] **Step 5: Update navigation/landing status.**

  Remove the Track 09 planned badge only from routes now implemented. Keep Track 10/11 links planned. Replace the Track 07 signpost copy at `/erection/flange-progress` with the operational screen.

- [ ] **Step 6: Verify route/UI source and types.**

  ```bash
  node --import tsx --test modules/flange/ui/flange-worklist-screen.test.ts modules/flange/ui/flange-progress-form.test.ts
  node --import tsx --test config/route-capabilities.test.ts
  npm run lint
  npm run typecheck
  npm run build
  ```

  Expected: PASS; build contains both real flange routes.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(flange): ship worklist progress and history UI`.

## Task 10: Add deterministic local fixtures and the browser walkthrough

**Files:**

- Create: `scripts/bootstrap-track09-browser-fixtures.ts`
- Create: `scripts/bootstrap-track09-browser-fixtures.test.ts`
- Create: `docs/TRACK09_BROWSER_FIXTURES.md`
- Create: `docs/qa/track-09-agent-walkthrough.md`
- Modify: `package.json`

- [ ] **Step 1: Write fixture source-guard tests.**

  Require a local-Supabase guard, deterministic fixture prefix, idempotent rerun, Track 04 bolting definition created through real import/revision contracts, active jointers/category/method/UT rules, one clean joint, one already-completed conflict joint, one stale-revision joint, and workbook rows that yield exactly one blocker, one warning, and one confirmable conflict.

  The fixture script may use local service-role bootstrap only for deterministic setup. It must not read `.env`, print tokens, modify source, invoke Git, or reset the database.

- [ ] **Step 2: Add the package command and fixture guide.**

  Add:

  ```json
  "bootstrap:track09-browser-fixtures": "tsx scripts/bootstrap-track09-browser-fixtures.ts"
  ```

  Document prerequisites and exact order. On an existing local stack, run the earlier fixture bootstraps required by the Track 04/Track 09 script contract, then Track 09. Do not claim a clean-replay result unless a reset was explicitly authorized and actually run.

- [ ] **Step 3: Write an exact manual walkthrough.**

  Include localhost URLs, account roles without passwords, exact fixture identifiers, controls to click, expected labels, refresh/durable-state checks, negative paths, source-import retention, and a PASS/FAIL/BLOCKED evidence table. Cover:

  1. platform admin creates a torquing requirement and UT rule;
  2. project admin creates flange unit time, joint category, and two jointers;
  3. reader views `/flange` but cannot mutate;
  4. manager records progress with two jointers at `/erection/flange-progress`;
  5. refresh preserves method/value, jointers, UT, report, tag, and completed state;
  6. correction retains the first version in history;
  7. stale revision is disabled in UI and refused by the command;
  8. XLSX preview shows one blocker, one warning, and one conflict;
  9. confirmed apply supersedes without rewriting history;
  10. readiness changes to complete while Track 07 Erection RFT is unchanged.

- [ ] **Step 4: Verify fixture tests and execute the bootstrap.**

  ```bash
  node --import tsx --test scripts/bootstrap-track09-browser-fixtures.test.ts
  npm run bootstrap:track09-browser-fixtures
  ```

  Expected: tests pass; bootstrap ends with stable fixture IDs/counts and no secrets. Run it a second time and confirm the same durable counts.

- [ ] **Step 5: Execute browser acceptance.**

  Follow `docs/qa/track-09-agent-walkthrough.md` exactly. Capture evidence for every case. Browser acceptance is not replaced by unit, build, or pgTAP success.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `test(flange): add local browser acceptance`.

## Task 11: Full regression, clean replay gate, and documentation closeout

**Files:**

- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Modify: `docs/deferred-work.md`
- Modify: `docs/superpowers/specs/2026-08-05-track-09-flange-management-design.md`

- [ ] **Step 1: Run the full non-destructive verification suite.**

  ```bash
  npm run verify
  npm run build
  git diff --check
  ```

  Expected: lint, typecheck, unit tests, all database tests, build, and whitespace check pass. Record exact failing command/output if an unrelated baseline failure exists; do not report it as Track 09 success.

- [ ] **Step 2: Run focused cross-track regressions.**

  Recheck Track 03 import lifecycle, Track 04 SpoolGen/revision workflow, and Track 07 readiness/routes because Track 09 touches all three contracts. At minimum rerun database files `030`, `031`, `041`, `042`, `053`, `070`, `072`, route-capability tests, and the browser smoke steps named in the Track 09 walkthrough.

- [ ] **Step 3: Perform clean replay only after explicit approval.**

  If approval is granted:

  ```bash
  /opt/homebrew/bin/supabase db reset --local
  npm run verify
  npm run bootstrap:track09-browser-fixtures
  ```

  Expected: every migration applies in timestamp order, full verification passes, and fixtures rebuild from zero. If approval is not granted, mark clean replay `BLOCKED — destructive reset not authorized`; do not infer PASS from focused tests.

- [ ] **Step 4: Close documentation only from evidence.**

  Update the design status and master-roadmap Track 09 link/status. Resolve `T02-D4` in `docs/deferred-work.md` only when all four create paths are proven; leave edit/archive observations deferred. Record automated gates and browser Gate D separately, including any blocked item.

- [ ] **Step 5: Confirm the scope did not expand.**

  Search:

  ```bash
  rg -n "Torque Assigned|Torque Verified|Reinstated|flange_revision_resolutions|test_pack" modules/flange app/flange app/erection/flange-progress supabase/migrations/20260812*.sql
  ```

  Expected: no new workflow/state/table for excluded Track 10/11 behavior. A read-only comment explaining that Track 10 consumes readiness is acceptable; executable Test Pack or reinstatement behavior is not.

- [ ] **Step 6: Suggested final checkpoint.**

  Suggested commit message: `docs(flange): close Track 09 evidence`.

## Final acceptance checklist

- [ ] All four prerequisite referentials can be created through authorized UI without SQL console use.
- [ ] Track 04 `bolt.txt` remains the only bolting-definition import.
- [ ] `/flange` and `/erection/flange-progress` are Supabase-backed and share one worklist.
- [ ] Manual and XLSX paths share server-side invariants and UT calculation.
- [ ] Two jointers, refresh persistence, correction history, and confirmed import conflict are browser-proven.
- [ ] Old business payload and jointer assignments remain immutable.
- [ ] Stale revision, cross-project, out-of-PDS, and capability failures are database-proven.
- [ ] Revision copy is authorized only by the shared Track 04 decision contract.
- [ ] `flange_joint_readiness` publishes facts without mutating Track 07 RFT or Track 10 state.
- [ ] Focused tests, full `npm run verify`, build, and `git diff --check` pass.
- [ ] Clean replay and browser acceptance are each reported as PASS, FAIL, or BLOCKED from actual evidence.
- [ ] No secret, source workbook payload, or local credential is committed or printed.
- [ ] No excluded torque-verification, Test Pack, reinstatement, report-generation, or Assembly feature was introduced.
