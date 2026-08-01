# Track 05 Fabrication and Material Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete production vertical slice — from an accepted spool revision through material traceability, shop weld progress, derived fabrication completion, NDE/PWHT obligations, QC release, paint and laydown — so one spool can travel the whole path against Supabase alone, with an actor, a date, a revision and evidence behind every step.

**Architecture:** Progress is an append-only event ledger plus derived read projections; there is no mutable "stage" column anywhere. Every progress row is bound to a concrete `spool_revision_id`, so a superseded definition can never accept new work. Referential validation — PML, WPS ranges, welder qualification, NDE matrix, paint matrix — is re-derived inside `SECURITY DEFINER` RPCs, never trusted from the browser. Derived states (Material Check, Fabricated, releasable) are computed by views over the ledger and the definition graph, and the commands refuse to record them by hand.

**Tech Stack:** PostgreSQL 15 (Supabase), pgTAP, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`, Zustand (demo mode only, being retired here).

## Global Constraints

- Migrations are **forward-only**. Never edit an applied migration; add a new one. Replacing a function body with `create or replace function` in a *new* migration is the sanctioned way to change behaviour.
- The local Supabase CLI in this repository is invoked as `/opt/homebrew/bin/supabase`.
- Every mutation is a `SECURITY DEFINER` RPC. `authenticated` gets `select` on tables and `execute` on RPCs, and never `insert`/`update`/`delete`.
- Every RPC starts with `set search_path = public, pg_temp` and a `public.current_user_has_capability(project_id, …)` check.
- Every RPC writes one row to `public.audit_events` with `before_state` / `after_state`.
- Every mutating RPC accepts an `idempotency_key text default null` and replays through `public.command_receipts`.
- Domain and application layers (`modules/construction/domain/**`, `modules/construction/application/**`) import **no** Supabase client, **no** React and **nothing** from `store/*`.
- No raw PostgREST or SQL error text reaches the UI. Everything passes through `mapSupabaseConstructionError`.
- New error codes stay inside the `PQC30`–`PQC39` band reserved for this track.
- Track 05 adds **no new capability**. `fabrication.view`, `fabrication.progress.record` and `fabrication.qc.release` were seeded by Track 01.

---

## 1. Execution policy

- Run the full verification command after every Gate. Never mark a checkbox for a command you did not run.
- Do **not** mark a step complete because the code "looks right". Every RED step must actually fail, and every GREEN step must actually pass.
- If a step's expected output does not match reality, stop and report the discrepancy instead of adjusting the test to match the code.
- After any migration that changes the RPC or table surface, regenerate `lib/supabase/database.types.ts` (Task 8 and Task 25 both do this).
- Commit at the end of every task. The commit message is given in the task's last step.

## 2. Prerequisite state

This plan assumes Tracks 01–04 are merged. Concretely it depends on:

**Access (Track 01)**
- `public.current_user_has_capability(uuid, text)` — `20260731091000_access_capability_security.sql:1`.
- `public.current_user_in_pds_scope(uuid, uuid)` and `public.current_user_in_subcontractor_scope(uuid, uuid)` — same file, lines 67 and 99.
- Capabilities `fabrication.view`, `fabrication.progress.record`, `fabrication.qc.release`, `nde.view`, `nde.result.record` — seeded with `requires_functional_role = true` in `20260731090000_access_capability_catalog.sql:67-72`.
- `public.audit_events` — `20260727145210_project_settings_and_referentials.sql:454`.

**Project referentials (Tracks 02)**
- `piping_material_records(project_id, mrr_number, ident_code, trace_number, status)` — the PML.
- `project_welding_procedures(project_id, subcontractor_id, material_type_id, code, process, diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on, status)`.
- `welder_qualifications(project_id, subcontractor_id, welder_code, full_name, expires_on, status)` and the join table `welder_wps_qualifications(welder_qualification_id, wps_id)`.
- `nde_matrix_rules(project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, mt_coverage, pt_coverage, pmi_coverage, ht_coverage, pwht_required, pwht_thickness_threshold, material_traceability_required)` — `weld_location` already accepts `'assembly'` (`20260801090000_complete_project_referentials.sql:37-39`).
- `project_spooling_material_types` and `project_spooling_material_classes(external_class_code, material_type_id)`.
- `project_ral_codes(line_service_id, color_code, ral_code)` and `project_paint_matrix_rules(line_service_id, ral_code_id, blasting_required, primer_required, intermediate_coat_count, final_coat_count, required_final_dft_microns)`.
- `project_locations`, `project_rework_codes`, `project_subcontractors`, `project_pds_areas` (with `assembly_subcontractor_id`).
- `project_progress_weights.phase` already accepts `'assembly'` (`20260801090000_complete_project_referentials.sql:41-44`).
- `project_custom_field_definitions.scope = 'prefabrication'` with the max-three invariant — this is where dossier §16.2's "up to three date-based custom stages" lives. Track 05 reads it; it does not extend it.

**Engineering definition (Track 04)**
- `isometrics` / `isometric_revisions` with `status ∈ {draft, accepted, superseded}` and the partial unique index `isometric_revisions_one_accepted`.
- `spool_revisions`, `weld_joint_revisions` (with `weld_location`, `diameter_inch`, `thickness_mm`, `weld_type_id`), `weld_points` (`root|hot|fill|cap`), `support_revisions`, `flange_joint_revisions`, `spool_revision_materials(ident_code, trace_number, quantity, unit)`.
- `public.spool_revision_project_id(uuid)` and `public.isometric_revision_project_id(uuid)` — RLS helpers reused verbatim.
- `public.assert_revision_mutable()` and its `*_read_only` triggers.
- `revision_progress_copies(change_item_id, source_spool_revision_id, target_spool_revision_id, progress_kind, copied_payload)` — the authorization ledger Track 04 left for this track to consume.

Two things that do **not** exist yet and this track creates:

1. `public.command_receipts`. Roadmap §9.1 lists it under Access, but Track 01 never built it. Track 05 is the first track whose commands are retried from a form, so it lands here. It is created as a **project-agnostic shared table**, not a construction table, so Tracks 06–11 adopt it without a second implementation.
2. `public.nde_obligations`. Roadmap §9.6 assigns it to Track 06, but roadmap §17 assigns *"generate NDE obligations from the Matrix after weld completion"* and *"block QC Release on outstanding NDE/PWHT"* to Track 05. See §3.8.

## 3. Decisions fixed by this plan

### 3.1 Track 05 owns Construction and nothing else

Track 05 reads the Track 04 definition graph and the Track 02 referentials. It writes only the tables listed in §4. It never inserts, updates or deletes a row in `isometrics`, `*_revisions`, `weld_points` or any `project_*` referential. The one exception is `revision_progress_copies.copied_payload`, which Track 04 created empty specifically so this track could stamp it (§3.4).

### 3.2 Progress is an event ledger with derived projections

`construction_progress_events` is append-only. An `update` or `delete` raises `PQC31`. Correcting a mistaken record is a **compensating event** (`is_compensating = true`, `compensates_event_id` pointing at the mistake), exactly as roadmap §9.7 requires for tracking. Every read is a view over the surviving events.

Canonical fabrication stage order — dossier §16.2:

```text
start_fab → material_check → fabricated → qc_release → sent_to_paint → painted → final_qc → laydown
```

`construction_phase ∈ {fabrication, assembly, erection}` (roadmap §9.5). Track 05 only writes `fabrication`; the enum and the phase column exist so Track 07 parameterises the same tables rather than cloning them.

### 3.3 Three of those stages are derived and cannot be recorded by hand

| Stage | Produced by |
| --- | --- |
| `start_fab` | `record_construction_progress` — a real user decision, the only free-standing one |
| `material_check` | `record_material_check`, once every bill-of-materials line is accepted |
| `fabricated` | **nothing** — derived by `spool_fabrication_readiness`; no event row exists |
| `qc_release` | `release_quality_record` |
| `sent_to_paint` | `record_construction_progress` — a real user decision after the QC declaration |
| `painted`, `final_qc` | `record_paint_progress` |
| `laydown` | `record_laydown` |

`record_construction_progress` accepts **only** `start_fab` and `sent_to_paint`. Any other stage raises `PQC32` with a message naming the command that owns it. This is roadmap §17's *"Fabricated stage as derived completion, not a manual flag"*, taken to its conclusion: there is no row to forge.

`fabricated_on` is `greatest(material_checked_on, last_weld_on, last_support_on)` and is `null` while any of the three is incomplete.

### 3.4 Revision binding and progress carry-over

Every construction row carries `spool_revision_id`. A command whose target spool revision belongs to an `isometric_revisions.status <> 'accepted'` raises `PQC31`. That is roadmap §17's *"progress on superseded revision"* negative path, and it is checked in SQL, not in the browser.

When Track 04 accepts a new revision it writes `revision_progress_copies` rows authorizing `fabrication_start`, `sent_to_paint` and `paint` to carry from the old spool revision to the new one, with `copied_payload = '{}'`. Track 05 materializes them:

| `revision_progress_copies.progress_kind` | `construction_stage` |
| --- | --- |
| `fabrication_start` | `start_fab` |
| `sent_to_paint` | `sent_to_paint` |
| `paint` | `painted` |

`materialize_progress_copies(target_spool_revision_id)` copies the surviving source event of each authorized kind into a new event on the target revision with `source_record_type = 'revision_copy'`, then stamps `copied_payload` with the source event id and date. A non-empty `copied_payload` means "already materialized" and the function skips it, so the call is idempotent. Nothing else may write `copied_payload`.

Material checks, weld progress and QC releases are **not** carried. Dossier §15.2 authorizes only those three progress kinds; a reworked weld must be re-recorded against the new revision.

### 3.5 Material Check is derived from validated traces

Dossier §16.4: heat numbers come off the QC-13, are checked against the PML, an invalid heat is refused, and the spool's Material Check updates automatically once the traces are valid.

- `material_check_items` references `spool_revision_materials` — the ident codes Track 04 imported from `trace.txt`. An ident code that is not on the spool's bill of materials raises `PQC30`.
- `(project_id, ident_code, trace_number)` must resolve to an `active` `piping_material_records` row, and the item stores that row's id as its evidence. No match raises `PQC33`. This is dossier §30 prohibition 3: *"an invalid heat/ident trace cannot be accepted."*
- `is_material_checked` is `count(bill lines) > 0 and count(bill lines) = count(accepted items)`. The `material_check` event is written by the command only in the transaction where that flips true.

### 3.6 Weld points, WPS and welders

Dossier §7.3 and §16.5, resolved into schema:

- **One WPS per joint.** `welding_procedure_id` lives on `weld_progress_records`, not on the point. That is *"a shared WPS for the points; the second point inherits it and it becomes read-only"* expressed as a column position rather than as a rule to enforce.
- **One welder per point, distinct across the joint.** `weld_point_assignments` is unique on `(record, weld_point_id)` and on `(record, welder_qualification_id)`. That is *"the second point requires a different welder."*
- **Root + Cap = 100 exactly.** Heat + Fill ∈ {0, 100}. Violations raise `PQC35`.
- A point may only be assigned if a matching `weld_points` row exists on the joint's revision (Track 04 seeds `root` and `cap`; `hot` and `fill` are permitted by the schema).
- Shop Weld Progress covers `weld_location = 'shop'` only (dossier §16.5). A `field` or `assembly` joint raises `PQC30` — Track 07 owns those.

WPS and welder validation, all inside `record_weld_progress`, all raising `PQC34` with a field-specific message:

| Check | Source |
| --- | --- |
| WPS belongs to the project and is `active` | `project_welding_procedures.status` |
| `diameter_from <= joint.diameter_inch <= diameter_to` | dossier §11.6 |
| `thickness_from <= joint.thickness_mm <= thickness_to` | dossier §11.6 |
| `approved_on <= weld date` | dossier §11.6 |
| WPS material type = the spool's material class mapped through `project_spooling_material_classes` | dossier §11.6 |
| WPS subcontractor is null or equals the record's subcontractor | dossier §11.6 |
| Welder is `active` and belongs to the project | dossier §11.7 |
| Welder's subcontractor equals the record's subcontractor | dossier §11.7 |
| `welder_qualifications.expires_on >= welded_on` **of that point** | dossier §11.7 |
| A `welder_wps_qualifications` row links welder and WPS | dossier §11.7 |

Note the expiry check is per point, against that point's own `welded_on`, not against the record's header date. A qualification that expired between the root and the cap invalidates the cap only.

**This is a hard block, not a warning.** Dossier §31.5 flags the ambiguity: a missing covering WPS during the *spooling import* is a warning (Track 04 implemented it that way), but recording actual welding without a valid qualification is refused. Roadmap §8.4 decision 6 states it in one line and this plan follows it.

### 3.7 Protected fields lock after NDE

Dossier §30 prohibition 4: WPS and welder cannot change after NDE selection or examination.

- `weld_progress_records.is_locked` flips to `true` the first time an obligation on that joint is satisfied.
- While locked, an update that changes `welding_procedure_id`, `weld_on` or `subcontractor_id`, or any insert/update/delete on that record's `weld_point_assignments`, raises `PQC36`.
- The escape hatch is `correct_weld_progress`, a separate command that requires `fabrication.qc.release` (a higher bar than `fabrication.progress.record`), demands a non-empty reason, and writes the full before/after into `audit_events`. This is roadmap §17's *"correction is performed by a separate command."*

Track 06 will additionally lock on batch **selection**. It sets the same column; nothing here needs to change.

### 3.8 The NDE obligation seam

Roadmap §9.6 lists `nde_obligations` under Quality/NDE, but §17 gives Track 05 both *"generate NDE obligations from the Matrix after weld completion"* and *"block QC Release on outstanding NDE/PWHT"*, and the exit criteria demand that one spool completes the whole golden path. A gate with no key is untestable, so Track 05 owns the obligation record and the minimum needed to close it:

| Object | Track 05 | Track 06 |
| --- | --- | --- |
| `nde_obligations` table | creates it | extends it (batch link, result link) |
| Obligation generation from the matrix | owns | reuses |
| `nde_batches`, `nde_batch_items`, `nde_results` | — | owns |
| Repairs, tracers, penalty escalation | — | owns |
| Closing an obligation | `record_nde_obligation_outcome` — **interim** | `record_nde_results` replaces it |

`record_nde_obligation_outcome(obligation_id, disposition, …)` requires `nde.result.record`, accepts `satisfied` or `waived`, and is explicitly marked in the migration comment as the seam Track 06 supersedes. It exists so that "QC Release is blocked until NDE is accepted" is a *provable* statement in Track 05's pgTAP rather than an assertion deferred to a later track.

Generation rule, from `nde_matrix_rules` keyed by `(service_class_id of the ISO revision, weld_type_id of the joint, weld_location of the joint)`:

- One obligation per method whose coverage `> 0`, with `required_coverage` copied from the rule.
- `selection_mode = 'full'` when coverage is 100, `'spot'` otherwise. Dossier §11.9: a 100% requirement is an NDE100 obligation from the start; a spot percentage is what Track 06 allocates into batches.
- No matching matrix rule raises `PQC39`. Track 04 already blocks the import in that case, so reaching this branch means a referential was archived after import — a real condition worth a clear error.
- Generation runs inside `record_weld_progress` at the moment the record first gets a `weld_on` date, and is idempotent through `unique (weld_joint_revision_id, method)`.

### 3.9 PWHT

`pwht_requirements` and `pwht_results` are roadmap §9.5 Construction tables, so Track 05 owns them outright.

- A requirement is created alongside the obligations when the matrix rule has `pwht_required = true` **and** either `pwht_thickness_threshold` is null or the joint's `thickness_mm >= pwht_thickness_threshold`.
- `record_pwht_result` stores the chart number, the date and `accepted` / `rejected`. A partial unique index allows exactly one `accepted` result per requirement, so a rejected run can be followed by a good one without a delete.
- A requirement with no accepted result blocks QC release.

### 3.10 QC Release

Dossier §16.7 and §29: *"QC Release is updated only when every joint of the spool has completed NDE"*, and PWHT counts too. `release_quality_record` refuses unless all four hold, each with its own message under `PQC37` / `PQC32`:

1. The spool revision is the accepted one (`PQC31`).
2. `is_fabricated` is true — material check complete, every non-removed shop weld welded, every support installed (`PQC32`).
3. Zero `nde_obligations` with `disposition = 'pending'` on the spool (`PQC37`).
4. Zero `pwht_requirements` without an accepted result (`PQC37`).

The UI reads the same view. Roadmap §17's exit criterion *"UI disable and RPC rejection express the same invariant"* is satisfied by construction: the button's `disabled` prop and the RPC's guard both read `spool_fabrication_readiness.is_releasable`.

### 3.11 Paint has no automatic line-service link — the record carries it

`project_paint_matrix_rules` and `project_ral_codes` are keyed by `line_service_id`, but Track 04's `isometric_revisions` carries `line_number` as free text and no `line_service_id`. Rather than add a column to a Track 04 table that no importer would populate, `paint_progress_records` carries `line_service_id` chosen by the user, and the matrix rule plus RAL code are resolved from it inside the command. The record stores `required_final_dft_microns` as a **snapshot**, so a later referential change does not rewrite history — the same principle roadmap §9.9 states for flange UT.

Validation: measured DFT `>=` the snapshot requirement, coat counts `>=` the rule's counts, and `sent_to_paint` must already be on the ledger. Dossier §16.8: DFT is captured through the W10P, so `w10p_form_number` is required.

### 3.12 Idempotency and optimistic concurrency

Roadmap §8.4 decision 15 — *"a success notification is shown only after a durable result"* — and AD-08.

- `command_receipts` is unique on `(project_id, command_name, idempotency_key)`.
- A command starts with `public.claim_command_receipt(project_id, command_name, key)`. It returns a `(receipt_id, replayed_result)` pair. A non-null `replayed_result` means this exact command already succeeded: return it without doing the work again. A claimed-but-unfinished receipt raises `PQC38`.
- The command ends with `public.complete_command_receipt(receipt_id, result_jsonb)`.
- A null key skips the mechanism entirely, which keeps pgTAP fixtures readable.
- `weld_progress_records` and `quality_release_records` carry `version integer`; `correct_weld_progress` takes `expected_version` and raises `23514` on a mismatch. The other commands are insert-only or naturally single-shot through a unique constraint, so they need no version.

### 3.13 Error codes

Track 01 used `PQC01`–`PQC05`, Track 03 `PQC10`–`PQC14`, Track 04 `PQC20`–`PQC26`. Track 05 takes `PQC30`–`PQC39`.

| Code | Meaning |
| --- | --- |
| `PQC30` | Construction target not found or out of scope for this command |
| `PQC31` | The target revision is not the accepted one, or an event was updated/deleted |
| `PQC32` | Stage predecessor missing, or the stage is derived and cannot be recorded |
| `PQC33` | Material trace is not accepted by the project PML |
| `PQC34` | WPS or welder qualification rejects this work record |
| `PQC35` | Weld point allocation is invalid |
| `PQC36` | A protected weld field is locked after NDE |
| `PQC37` | QC release is blocked by outstanding NDE or PWHT |
| `PQC38` | A command with this idempotency key is still in flight |
| `PQC39` | A required project referential is missing |

### 3.14 Capability and scope boundary

- `fabrication.view` guards every read policy.
- `fabrication.progress.record` guards `record_construction_progress`, `record_material_check`, `record_weld_progress`, `record_support_progress`, `record_paint_progress`, `record_laydown`, `request_qc13_form`, `materialize_progress_copies`.
- `fabrication.qc.release` guards `release_quality_record`, `record_pwht_result` and `correct_weld_progress`.
- `nde.result.record` guards the interim `record_nde_obligation_outcome`.
- Every mutating command additionally calls `current_user_in_pds_scope(project_id, iso_revision.pds_area_id)`. A subcontractor outside the PDS area is refused with `42501`, satisfying dossier §30 prohibition 12. A record whose PDS area is null is a data error, not an open door — roadmap §8.4 decision 3 — so a null area fails the scope check for subcontractors and passes for everyone else, which is exactly what `current_user_in_pds_scope` already implements.

### 3.15 Legacy fabrication stores

Roadmap §17 requires removing Supabase-mode usage of `spools-store`, `welds-store`, `qc-release-store`, `paint-store`, `laydown-store` and `pwht-store`. Following Track 04's precedent, the stores are **not deleted** — demo mode still needs them. Task 25 makes every `/fabrication/**` page branch on `useAppMode()`: Supabase mode renders the new `modules/construction/ui` screens, demo mode renders the existing `components/fabrication/*` views unchanged. A single `assertNoConstructionStoreImports` unit test proves no file under `modules/construction/**` imports from `store/*`.

## 4. File map

### Database

- Create: `supabase/migrations/20260804090000_fabrication_progress.sql` — `command_receipts`, receipt helpers, `construction_phase` / `construction_stage` enums, `construction_progress_events`, the append-only guard, stage-predecessor policy, `qc13_progress_forms`, `record_construction_progress`, `request_qc13_form`, `materialize_progress_copies`.
- Create: `supabase/migrations/20260804091000_material_traceability.sql` — `material_check_records`, `material_check_items`, `record_material_check`.
- Create: `supabase/migrations/20260804092000_weld_progress_commands.sql` — `weld_progress_records`, `weld_point_assignments`, `nde_obligations`, `pwht_requirements`.
- Create: `supabase/migrations/20260804092100_record_weld_progress.sql` — `record_weld_progress` and the obligation/PWHT generation it performs.
- Create: `supabase/migrations/20260804092200_weld_progress_locks.sql` — the protected-field trigger, `correct_weld_progress`, and the interim `record_nde_obligation_outcome`.
- Create: `supabase/migrations/20260804093000_fabrication_release.sql` — `quality_release_records`, `pwht_results`, `paint_progress_records`, `laydown_records`, `support_progress_records`, the **readiness views** they gate on, and their commands.
- Create: `supabase/migrations/20260804094000_construction_projections.sql` — the presentation views (`spool_stage_events`, `spool_progress_dates`, `spool_construction_status`, `weld_progress_summary`) and their grants. Roadmap §17 lists four migration files; the read model is split into a fifth so a projection change never forces a re-read of the command logic. Track 04 split its storage policies the same way.

**Migration ordering rule.** Each table's RLS policies and grants live in the same migration that creates the table, so every task is independently reviewable. Readiness views are in `093000` rather than `094000` because `release_quality_record` and `record_paint_progress` gate on them and a function cannot reference a later migration.
- Create: `supabase/tests/database/050_material_traceability.test.sql`
- Create: `supabase/tests/database/051_weld_progress.test.sql`
- Create: `supabase/tests/database/052_fabrication_release.test.sql`
- Create: `supabase/tests/database/053_construction_projections.test.sql`

### Domain — no Supabase, no React, no `store/*`

- Create: `modules/construction/domain/construction-phase.ts` — phases, stages, canonical order, predecessor policy.
- Create: `modules/construction/domain/material-check.ts` — bill-of-materials reconciliation.
- Create: `modules/construction/domain/weld-progress.ts` — point allocation and qualification rules.
- Create: `modules/construction/domain/nde-obligation.ts` — matrix coverage → obligation list.
- Create: `modules/construction/domain/quality-release.ts` — release eligibility.

### Application

- Create: `modules/construction/application/record-material-check.ts`
- Create: `modules/construction/application/record-weld-progress.ts`
- Create: `modules/construction/application/release-spool.ts`

### Infrastructure

- Create: `modules/construction/infrastructure/supabase-construction-errors.ts`
- Create: `modules/construction/infrastructure/supabase-construction-repository.ts`

### UI

- Create: `modules/construction/ui/fabrication/spool-stage-timeline.tsx`
- Create: `modules/construction/ui/fabrication/spool-picker.tsx`
- Create: `modules/construction/ui/fabrication/material-check-screen.tsx`
- Create: `modules/construction/ui/fabrication/weld-progress-screen.tsx`
- Create: `modules/construction/ui/fabrication/qc-release-screen.tsx`
- Create: `modules/construction/ui/fabrication/paint-laydown-screen.tsx`
- Create: `modules/construction/ui/fabrication/fabrication-overview.tsx`
- Modify: `app/fabrication/material-check/page.tsx`, `app/fabrication/weld-progress/page.tsx`, `app/fabrication/qc-release/page.tsx`, `app/fabrication/pwht-release/page.tsx`, `app/fabrication/paint/page.tsx`, `app/fabrication/laydown/page.tsx`, `app/fabrication/dashboard/page.tsx`
- Modify: `config/route-capabilities.ts`, `config/route-capabilities.test.ts`
- Create: `modules/construction/construction-boundaries.test.ts` — the executable form of §3.15.
- Create: `components/fabrication/weld-progress-demo-view.tsx` — the current inline demo weld screen, moved out of `app/fabrication/weld-progress/page.tsx` unchanged.

### Fixtures, scripts and docs

- Create: `scripts/bootstrap-track05-browser-fixtures.ts`
- Create: `scripts/bootstrap-track05-browser-fixtures.test.ts`
- Create: `docs/TRACK05_BROWSER_FIXTURES.md`
- Create: `docs/architecture/construction-progress-model.md`
- Modify: `package.json` — add `bootstrap:track05-browser-fixtures`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`, `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`, `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`

---

# Gate A — Construction schema and commands

## Task 1: Command receipts, the progress ledger and the QC-13 loop

**Files:**
- Create: `supabase/migrations/20260804090000_fabrication_progress.sql`
- Create: `supabase/tests/database/050_material_traceability.test.sql`

**Interfaces:**
- Consumes: `public.spool_revisions`, `public.isometric_revisions`, `public.isometrics`, `public.revision_progress_copies` (Track 04); `public.current_user_has_capability(uuid, text)`, `public.current_user_in_pds_scope(uuid, uuid)`, `public.audit_events` (Track 01).
- Produces: type `public.spool_context`; enums `public.construction_phase`, `public.construction_stage`; tables `public.command_receipts`, `public.construction_progress_events`, `public.qc13_progress_forms`; functions `public.claim_command_receipt(uuid, text, text)`, `public.complete_command_receipt(uuid, jsonb)`, `public.assert_construction_target(uuid, text)`, `public.construction_stage_ordinal(public.construction_stage)`, `public.effective_stage_date(uuid, public.construction_phase, public.construction_stage)`, `public.record_construction_progress(uuid, public.construction_phase, public.construction_stage, date, text, text)`, `public.request_qc13_form(uuid, date, text)`, `public.materialize_progress_copies(uuid)`.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804090000_fabrication_progress.sql`:

```sql
-- Track 05: the construction progress ledger.
-- Progress is append-only events plus derived projections. There is no mutable stage column
-- anywhere in this track, and three of the eight stages have no command at all.

-- Shared command infrastructure ------------------------------------------------
-- Roadmap AD-08. Track 01 never built this; Track 05 is the first track whose commands
-- are retried from a form, so it lands here as a shared table, not a construction table.

create table public.command_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  command_name text not null check (length(trim(command_name)) > 0),
  idempotency_key text not null check (length(trim(idempotency_key)) > 0),
  actor_id uuid references public.profiles(id) on delete set null,
  result jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  unique (project_id, command_name, idempotency_key)
);

create index command_receipts_project_idx
  on public.command_receipts (project_id, created_at desc);

-- Returns (receipt_id, replayed_result). A non-null replayed_result means the command
-- already ran to completion: return it and do nothing else. A claimed but unfinished
-- receipt means a concurrent attempt is in flight.
create or replace function public.claim_command_receipt(
  target_project_id uuid,
  target_command_name text,
  key text
)
returns table (receipt_id uuid, replayed_result jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed public.command_receipts;
  existing public.command_receipts;
begin
  if key is null or trim(key) = '' then
    return query select null::uuid, null::jsonb;
    return;
  end if;

  insert into public.command_receipts (project_id, command_name, idempotency_key, actor_id)
  values (target_project_id, target_command_name, trim(key), auth.uid())
  on conflict (project_id, command_name, idempotency_key) do nothing
  returning * into claimed;

  if claimed.id is not null then
    return query select claimed.id, null::jsonb;
    return;
  end if;

  select * into existing
  from public.command_receipts
  where project_id = target_project_id
    and command_name = target_command_name
    and idempotency_key = trim(key);

  if existing.completed_at is null then
    raise exception 'An identical request is still being processed' using errcode = 'PQC38';
  end if;

  return query select existing.id, existing.result;
end;
$$;

create or replace function public.complete_command_receipt(
  target_receipt_id uuid,
  command_result jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.command_receipts
  set result = command_result, completed_at = timezone('utc', now())
  where id = target_receipt_id;
$$;

-- Construction vocabulary ------------------------------------------------------

create type public.construction_phase as enum ('fabrication', 'assembly', 'erection');

-- Dossier 16.2. Project-specific extra stages are date custom fields on
-- project_custom_field_definitions(scope = 'prefabrication'), not new enum values.
create type public.construction_stage as enum (
  'start_fab',
  'material_check',
  'fabricated',
  'qc_release',
  'sent_to_paint',
  'painted',
  'final_qc',
  'laydown'
);

create type public.spool_context as (
  spool_revision_id uuid,
  spool_id uuid,
  spool_number text,
  isometric_revision_id uuid,
  isometric_id uuid,
  project_id uuid,
  pds_area_id uuid,
  service_class_id uuid,
  revision_status public.revision_status,
  is_removed boolean
);

-- Every construction command begins here. Existence, capability, PDS scope and revision
-- currency are one call, so no command can forget one of them.
create or replace function public.assert_construction_target(
  target_spool_revision_id uuid,
  required_capability text
)
returns public.spool_context
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
begin
  select sr.id, sr.spool_id, sp.spool_number, rev.id, rev.isometric_id, iso.project_id,
         rev.pds_area_id, rev.service_class_id, rev.status, sr.is_removed
    into ctx
  from public.spool_revisions sr
  join public.spools sp on sp.id = sr.spool_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where sr.id = target_spool_revision_id;

  if ctx.spool_revision_id is null then
    raise exception 'The spool revision was not found' using errcode = 'PQC30';
  end if;

  if not public.current_user_has_capability(ctx.project_id, required_capability) then
    raise exception 'You do not have permission to perform this action on this project'
      using errcode = '42501';
  end if;

  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This spool is outside your PDS area scope' using errcode = '42501';
  end if;

  if ctx.revision_status <> 'accepted' then
    raise exception 'This spool revision is % and no longer accepts progress', ctx.revision_status
      using errcode = 'PQC31';
  end if;

  if ctx.is_removed then
    raise exception 'This spool was cancelled in the current revision' using errcode = 'PQC31';
  end if;

  return ctx;
end;
$$;

-- The progress ledger ----------------------------------------------------------

create table public.construction_progress_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null,
  stage public.construction_stage not null,
  occurred_on date not null,
  source_record_type text not null default 'manual'
    check (source_record_type in (
      'manual', 'material_check', 'quality_release', 'paint', 'laydown', 'revision_copy'
    )),
  source_record_id uuid,
  is_compensating boolean not null default false,
  compensates_event_id bigint references public.construction_progress_events(id) on delete restrict,
  comment text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default timezone('utc', now()),
  check (is_compensating = (compensates_event_id is not null))
);

create index construction_progress_events_spool_idx
  on public.construction_progress_events (spool_revision_id, stage);

create index construction_progress_events_project_idx
  on public.construction_progress_events (project_id, recorded_at desc);

-- Append-only. Roadmap 9.7 states the rule for tracking; it holds for construction too.
-- Correcting a mistake is a compensating event, never an update.
create or replace function public.assert_progress_event_append_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Progress events are append-only. Record a compensating event instead'
    using errcode = 'PQC31';
end;
$$;

create trigger construction_progress_events_append_only
  before update or delete on public.construction_progress_events
  for each row execute function public.assert_progress_event_append_only();

create or replace function public.construction_stage_ordinal(stage public.construction_stage)
returns integer
language sql
immutable
as $$
  select case stage
    when 'start_fab' then 1
    when 'material_check' then 2
    when 'fabricated' then 3
    when 'qc_release' then 4
    when 'sent_to_paint' then 5
    when 'painted' then 6
    when 'final_qc' then 7
    when 'laydown' then 8
  end;
$$;

-- The surviving date of one stage. "Surviving" means the event has not been cancelled by a
-- compensating event. The spool_stage_events view in migration 094000 repeats this predicate;
-- it is three lines and duplicating it keeps this migration free of a forward reference.
create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage
)
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select max(event.occurred_on)
  from public.construction_progress_events event
  where event.spool_revision_id = target_spool_revision_id
    and event.phase = target_phase
    and event.stage = target_stage
    and event.is_compensating = false
    and not exists (
      select 1 from public.construction_progress_events cancel
      where cancel.is_compensating and cancel.compensates_event_id = event.id
    );
$$;

-- QC-13 daily progress form ----------------------------------------------------
-- Dossier 16.3. The durable request/progress record lives here; PDF rendering and the
-- bulk Excel generator are document concerns and stay with Track 11.

create table public.qc13_progress_forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  form_number text not null check (length(trim(form_number)) > 0),
  issued_on date not null,
  issued_by uuid references public.profiles(id) on delete set null,
  status text not null default 'issued' check (status in ('issued', 'returned', 'closed')),
  returned_on date,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, form_number)
);

create index qc13_progress_forms_spool_idx
  on public.qc13_progress_forms (spool_revision_id, issued_on desc);

-- Commands ---------------------------------------------------------------------

-- Only start_fab and sent_to_paint are free-standing user decisions. Everything else is
-- produced by the command that owns the evidence, and 'fabricated' has no row at all.
create or replace function public.record_construction_progress(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage,
  occurred_on date,
  comment text default null,
  idempotency_key text default null
)
returns public.construction_progress_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  created public.construction_progress_events;
  predecessor_date date;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_construction_progress', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.construction_progress_events
    where id = (claim.replayed_result ->> 'event_id')::bigint;
    return created;
  end if;

  if target_stage not in ('start_fab', 'sent_to_paint') then
    raise exception
      'Stage % is derived from its evidence and cannot be recorded directly', target_stage
      using errcode = 'PQC32';
  end if;

  if occurred_on is null then
    raise exception 'A progress date is required' using errcode = '23514';
  end if;

  if target_stage = 'sent_to_paint' then
    predecessor_date := public.effective_stage_date(
      target_spool_revision_id, target_phase, 'qc_release');
    if predecessor_date is null then
      raise exception 'This spool has not been QC released yet' using errcode = 'PQC32';
    end if;
    if occurred_on < predecessor_date then
      raise exception 'Sent to Paint cannot precede the QC release date' using errcode = 'PQC32';
    end if;
  end if;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on,
    source_record_type, comment, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, target_phase, target_stage, occurred_on,
    'manual', comment, claim.receipt_id, auth.uid()
  )
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'construction_progress_events', null,
    'record_construction_progress', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('event_id', created.id));
  end if;

  return created;
end;
$$;

create or replace function public.request_qc13_form(
  target_spool_revision_id uuid,
  issued_on date default null,
  idempotency_key text default null
)
returns public.qc13_progress_forms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  created public.qc13_progress_forms;
  activity_code text;
  next_sequence integer;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'request_qc13_form', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.qc13_progress_forms
    where id = (claim.replayed_result ->> 'form_id')::uuid;
    return created;
  end if;

  -- Dossier 16.3 step 1: the form follows Start Fab, it does not precede it.
  if public.effective_stage_date(target_spool_revision_id, 'fabrication', 'start_fab') is null then
    raise exception 'Record Start Fab before issuing a QC-13 form' using errcode = 'PQC32';
  end if;

  select project.activity_code into activity_code
  from public.projects project where project.id = ctx.project_id;

  select coalesce(max(substring(form.form_number from '[0-9]+$')::integer), 0) + 1
    into next_sequence
  from public.qc13_progress_forms form
  where form.project_id = ctx.project_id;

  insert into public.qc13_progress_forms (
    project_id, spool_revision_id, form_number, issued_on, issued_by, receipt_id
  )
  values (
    ctx.project_id, target_spool_revision_id,
    format('QC13-%s-%s', activity_code, lpad(next_sequence::text, 5, '0')),
    coalesce(issued_on, current_date), auth.uid(), claim.receipt_id
  )
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'qc13_progress_forms', created.id,
    'request_qc13_form', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('form_id', created.id));
  end if;

  return created;
end;
$$;

-- Plan section 3.4: Track 04 wrote the authorization ledger with an empty payload.
-- This is the only function permitted to fill it in.
create or replace function public.materialize_progress_copies(
  target_spool_revision_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  copy_row record;
  mapped_stage public.construction_stage;
  source_date date;
  created_id bigint;
  copied_count integer := 0;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  for copy_row in
    select copies.*
    from public.revision_progress_copies copies
    where copies.target_spool_revision_id = target_spool_revision_id
      and copies.copied_payload = '{}'::jsonb
    order by copies.progress_kind
  loop
    mapped_stage := case copy_row.progress_kind
      when 'fabrication_start' then 'start_fab'::public.construction_stage
      when 'sent_to_paint' then 'sent_to_paint'::public.construction_stage
      when 'paint' then 'painted'::public.construction_stage
    end;

    source_date := public.effective_stage_date(
      copy_row.source_spool_revision_id, 'fabrication', mapped_stage);

    if source_date is null then
      continue;
    end if;

    if public.effective_stage_date(
         target_spool_revision_id, 'fabrication', mapped_stage) is not null then
      continue;
    end if;

    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on,
      source_record_type, comment, recorded_by
    )
    values (
      ctx.project_id, target_spool_revision_id, 'fabrication', mapped_stage, source_date,
      'revision_copy',
      format('Carried from the previous revision by decision on %s', copy_row.progress_kind),
      auth.uid()
    )
    returning id into created_id;

    update public.revision_progress_copies
    set copied_payload = jsonb_build_object(
          'event_id', created_id,
          'occurred_on', source_date,
          'source_spool_revision_id', copy_row.source_spool_revision_id),
        copied_at = timezone('utc', now())
    where id = copy_row.id;

    copied_count := copied_count + 1;
  end loop;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'spool_revisions', target_spool_revision_id,
    'materialize_progress_copies', null, jsonb_build_object('copied_count', copied_count)
  );

  return copied_count;
end;
$$;

-- RLS and grants ---------------------------------------------------------------

alter table public.command_receipts enable row level security;
alter table public.construction_progress_events enable row level security;
alter table public.qc13_progress_forms enable row level security;

create policy "read command receipts" on public.command_receipts
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'project.view'));

create policy "read construction progress events" on public.construction_progress_events
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read qc13 forms" on public.qc13_progress_forms
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

grant select on
  public.command_receipts,
  public.construction_progress_events,
  public.qc13_progress_forms
to authenticated;

revoke insert, update, delete, truncate on
  public.command_receipts,
  public.construction_progress_events,
  public.qc13_progress_forms
from authenticated, anon;

revoke all on function
  public.claim_command_receipt(uuid, text, text),
  public.complete_command_receipt(uuid, jsonb),
  public.assert_construction_target(uuid, text),
  public.effective_stage_date(uuid, public.construction_phase, public.construction_stage),
  public.record_construction_progress(
    uuid, public.construction_phase, public.construction_stage, date, text, text),
  public.request_qc13_form(uuid, date, text),
  public.materialize_progress_copies(uuid)
from public, anon;

-- claim/complete are internal plumbing: only the SECURITY DEFINER commands call them.
revoke all on function
  public.claim_command_receipt(uuid, text, text),
  public.complete_command_receipt(uuid, jsonb)
from authenticated;

grant execute on function
  public.assert_construction_target(uuid, text),
  public.effective_stage_date(uuid, public.construction_phase, public.construction_stage),
  public.construction_stage_ordinal(public.construction_stage),
  public.record_construction_progress(
    uuid, public.construction_phase, public.construction_stage, date, text, text),
  public.request_qc13_form(uuid, date, text),
  public.materialize_progress_copies(uuid)
to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: the reset completes with no error and the new migration is listed as applied.

- [ ] **Step 3: Write the ledger half of the pgTAP file.**

Create `supabase/tests/database/050_material_traceability.test.sql`. Task 2 appends the material half and raises the plan count; write exactly this for now:

```sql
begin;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000501', 'authenticated', 'authenticated', 'fab.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000502', 'authenticated', 'authenticated', 'fab.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000501';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000501', 'FAB-A', 'Fabrication A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000501');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501',
        '10000000-0000-0000-0000-000000000502', 'system_admin', 'project_admin', true);

insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'ISO-0501');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501', 'SP-0501-A');

insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, accepted_at)
values ('42000000-0000-0000-0000-000000000501', '40000000-0000-0000-0000-000000000501', 'R0', 1, 'accepted', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('43000000-0000-0000-0000-000000000501', '41000000-0000-0000-0000-000000000501',
        '42000000-0000-0000-0000-000000000501', 1);

-- Same session-switching form Track 04 uses in 042_spooling_apply.test.sql:41-43.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000502', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000502","role":"authenticated"}', true);

select has_table('public', 'command_receipts', 'command_receipts table exists');
select has_table('public', 'construction_progress_events', 'construction_progress_events table exists');
select has_table('public', 'qc13_progress_forms', 'qc13_progress_forms table exists');

select is(relrowsecurity, true, 'construction_progress_events has RLS')
from pg_class where oid = 'public.construction_progress_events'::regclass;

select is(
  has_table_privilege('authenticated', 'public.construction_progress_events', 'INSERT'),
  false,
  'authenticated cannot insert progress events directly'
);

-- start_fab is the one free-standing decision
select lives_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab', date '2026-08-04')$$,
  'start fab is recorded'
);

select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000501', 'fabrication', 'start_fab'),
  date '2026-08-04',
  'the ledger reports the start fab date'
);

-- Derived stages have no command
select throws_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000501', 'fabrication', 'fabricated', date '2026-08-05')$$,
  'PQC32', null,
  'fabricated cannot be recorded by hand'
);
select throws_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000501', 'fabrication', 'qc_release', date '2026-08-05')$$,
  'PQC32', null,
  'qc release cannot be recorded through the generic progress command'
);
select throws_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000501', 'fabrication', 'sent_to_paint', date '2026-08-05')$$,
  'PQC32', null,
  'sent to paint is refused before the spool is QC released'
);

-- Append-only
select throws_ok(
  $$update public.construction_progress_events set occurred_on = date '2026-01-01'
    where spool_revision_id = '43000000-0000-0000-0000-000000000501'$$,
  'PQC31', null,
  'a progress event cannot be updated'
);

-- Idempotency
select lives_ok(
  $$select public.request_qc13_form(
      '43000000-0000-0000-0000-000000000501', date '2026-08-04', 'qc13-key-1')$$,
  'the first QC-13 request succeeds'
);
select lives_ok(
  $$select public.request_qc13_form(
      '43000000-0000-0000-0000-000000000501', date '2026-08-04', 'qc13-key-1')$$,
  'the retried QC-13 request replays instead of failing'
);
select is(
  (select count(*)::int from public.qc13_progress_forms
   where spool_revision_id = '43000000-0000-0000-0000-000000000501'),
  1,
  'the retry produced no second QC-13 form'
);

select * from finish();
rollback;
```

- [ ] **Step 4: Run the pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/050_material_traceability.test.sql
```

Expected: 14 of 14 assertions pass.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804090000_fabrication_progress.sql \
        supabase/tests/database/050_material_traceability.test.sql
git commit -m "feat(construction): add command receipts and the append-only progress ledger"
```

## Task 2: Material traceability against the PML

**Files:**
- Create: `supabase/migrations/20260804091000_material_traceability.sql`
- Modify: `supabase/tests/database/050_material_traceability.test.sql`

**Interfaces:**
- Consumes: `public.assert_construction_target(uuid, text)`, `public.claim_command_receipt(uuid, text, text)`, `public.complete_command_receipt(uuid, jsonb)`, `public.effective_stage_date(uuid, public.construction_phase, public.construction_stage)` (Task 1); `public.spool_revision_materials`, `public.piping_material_records`.
- Produces: tables `public.material_check_records`, `public.material_check_items`; function `public.record_material_check(uuid, date, jsonb, uuid, text)` returning `public.material_check_records`. `items` is a JSON array of `{"ident_code": text, "trace_number": text, "quantity": number|null}`.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804091000_material_traceability.sql`:

```sql
-- Track 05: material traceability.
-- Dossier 16.4: heat numbers come off the QC-13, are checked against the PML, an invalid
-- heat is refused, and Material Check follows automatically once every line is valid.

create table public.material_check_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  checked_on date not null,
  checked_by uuid references public.profiles(id) on delete set null,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

-- One row per accepted trace. spool_revision_material_id proves the ident code belongs to
-- this spool's bill of materials; piping_material_record_id proves the trace is in the PML.
-- Both are hard foreign keys, so the evidence cannot rot away silently.
create table public.material_check_items (
  id uuid primary key default gen_random_uuid(),
  material_check_record_id uuid not null
    references public.material_check_records(id) on delete cascade,
  spool_revision_material_id uuid not null
    references public.spool_revision_materials(id) on delete restrict,
  piping_material_record_id uuid not null
    references public.piping_material_records(id) on delete restrict,
  ident_code text not null check (length(trim(ident_code)) > 0),
  trace_number text not null check (length(trim(trace_number)) > 0),
  mrr_number text,
  quantity numeric(12, 3) check (quantity is null or quantity >= 0),
  is_accepted boolean not null default true,
  checked_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (material_check_record_id, spool_revision_material_id, trace_number)
);

create index material_check_items_record_idx
  on public.material_check_items (material_check_record_id);

create or replace function public.record_material_check(
  target_spool_revision_id uuid,
  checked_on date,
  items jsonb,
  qc13_form_id uuid default null,
  idempotency_key text default null
)
returns public.material_check_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  record_row public.material_check_records;
  item jsonb;
  ident text;
  trace text;
  bill_line public.spool_revision_materials;
  pml_row public.piping_material_records;
  bill_total integer;
  accepted_total integer;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_material_check', idempotency_key);

  if claim.replayed_result is not null then
    select * into record_row from public.material_check_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return record_row;
  end if;

  if checked_on is null then
    raise exception 'A material check date is required' using errcode = '23514';
  end if;

  if jsonb_typeof(coalesce(items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(items) = 0 then
    raise exception 'At least one material trace is required' using errcode = '23514';
  end if;

  -- Dossier 16.3 step 1: material traces are transcribed from a returned QC-13, which
  -- only exists after Start Fab.
  if public.effective_stage_date(target_spool_revision_id, 'fabrication', 'start_fab') is null then
    raise exception 'Record Start Fab before recording material traces' using errcode = 'PQC32';
  end if;

  if qc13_form_id is not null and not exists (
    select 1 from public.qc13_progress_forms form
    where form.id = qc13_form_id and form.spool_revision_id = target_spool_revision_id
  ) then
    raise exception 'That QC-13 form does not belong to this spool' using errcode = 'PQC30';
  end if;

  insert into public.material_check_records (
    project_id, spool_revision_id, qc13_form_id, checked_on, checked_by, receipt_id
  )
  values (
    ctx.project_id, target_spool_revision_id, qc13_form_id, checked_on, auth.uid(), claim.receipt_id
  )
  on conflict (spool_revision_id) do update
    set checked_on = excluded.checked_on,
        qc13_form_id = coalesce(excluded.qc13_form_id, public.material_check_records.qc13_form_id)
  returning * into record_row;

  for item in select value from jsonb_array_elements(items)
  loop
    ident := trim(item ->> 'ident_code');
    trace := trim(item ->> 'trace_number');

    if coalesce(ident, '') = '' or coalesce(trace, '') = '' then
      raise exception 'Every material line needs an ident code and a trace number'
        using errcode = '23514';
    end if;

    select * into bill_line
    from public.spool_revision_materials line
    where line.spool_revision_id = target_spool_revision_id
      and line.ident_code = ident
    limit 1;

    if bill_line.id is null then
      raise exception 'Ident code % is not on this spool revision bill of materials', ident
        using errcode = 'PQC30';
    end if;

    -- Dossier 30 prohibition 3. This is the whole point of the PML.
    select * into pml_row
    from public.piping_material_records pml
    where pml.project_id = ctx.project_id
      and pml.ident_code = ident
      and pml.trace_number = trace
      and pml.status = 'active'
    limit 1;

    if pml_row.id is null then
      raise exception 'Trace number % is not registered in the PML for ident code %', trace, ident
        using errcode = 'PQC33';
    end if;

    insert into public.material_check_items (
      material_check_record_id, spool_revision_material_id, piping_material_record_id,
      ident_code, trace_number, mrr_number, quantity, checked_on
    )
    values (
      record_row.id, bill_line.id, pml_row.id, ident, trace, pml_row.mrr_number,
      nullif(item ->> 'quantity', '')::numeric, checked_on
    )
    on conflict (material_check_record_id, spool_revision_material_id, trace_number)
    do update set quantity = excluded.quantity, checked_on = excluded.checked_on;
  end loop;

  -- Plan section 3.5: Material Check is derived. The event appears in the transaction where
  -- the last outstanding bill line is satisfied, and never before.
  select count(*)::int into bill_total
  from public.spool_revision_materials
  where spool_revision_id = target_spool_revision_id;

  select count(distinct item_row.spool_revision_material_id)::int into accepted_total
  from public.material_check_items item_row
  where item_row.material_check_record_id = record_row.id and item_row.is_accepted;

  if bill_total > 0 and bill_total = accepted_total
     and public.effective_stage_date(
           target_spool_revision_id, 'fabrication', 'material_check') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on,
      source_record_type, source_record_id, receipt_id, recorded_by
    )
    values (
      ctx.project_id, target_spool_revision_id, 'fabrication', 'material_check', checked_on,
      'material_check', record_row.id, claim.receipt_id, auth.uid()
    );
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'material_check_records', record_row.id,
    'record_material_check', null,
    jsonb_build_object('record', to_jsonb(record_row),
                       'bill_total', bill_total, 'accepted_total', accepted_total)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', record_row.id));
  end if;

  return record_row;
end;
$$;

alter table public.material_check_records enable row level security;
alter table public.material_check_items enable row level security;

create policy "read material check records" on public.material_check_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read material check items" on public.material_check_items
  for select to authenticated
  using (
    exists (
      select 1 from public.material_check_records parent
      where parent.id = material_check_items.material_check_record_id
        and public.current_user_has_capability(parent.project_id, 'fabrication.view')
    )
  );

grant select on public.material_check_records, public.material_check_items to authenticated;
revoke insert, update, delete, truncate
  on public.material_check_records, public.material_check_items
  from authenticated, anon;

revoke all on function public.record_material_check(uuid, date, jsonb, uuid, text)
  from public, anon;
grant execute on function public.record_material_check(uuid, date, jsonb, uuid, text)
  to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error.

- [ ] **Step 3: Extend the pgTAP file with the material half.**

In `supabase/tests/database/050_material_traceability.test.sql`, change the plan line to `select plan(25);` and add the following **before** `select * from finish();`:

```sql
-- Bill of materials and PML fixtures
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, description, quantity, unit, trace_number)
values
  ('44000000-0000-0000-0000-000000000501', '43000000-0000-0000-0000-000000000501',
   'IDN-100', 'Pipe 6in', 3, 'm', 'HEAT-100'),
  ('44000000-0000-0000-0000-000000000502', '43000000-0000-0000-0000-000000000501',
   'IDN-200', 'Elbow 6in', 2, 'ea', 'HEAT-200');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values
  ('45000000-0000-0000-0000-000000000501', '30000000-0000-0000-0000-000000000501',
   'MRR-1', 'IDN-100', 'HEAT-100'),
  ('45000000-0000-0000-0000-000000000502', '30000000-0000-0000-0000-000000000501',
   'MRR-1', 'IDN-200', 'HEAT-200');

select has_table('public', 'material_check_records', 'material_check_records table exists');
select has_table('public', 'material_check_items', 'material_check_items table exists');
select is(
  has_table_privilege('authenticated', 'public.material_check_items', 'UPDATE'),
  false,
  'authenticated cannot update material check items directly'
);

-- An ident code that is not on this spool
select throws_ok(
  $$select public.record_material_check(
      '43000000-0000-0000-0000-000000000501', date '2026-08-05',
      '[{"ident_code":"IDN-999","trace_number":"HEAT-100"}]'::jsonb)$$,
  'PQC30', null,
  'an ident code outside the bill of materials is refused'
);

-- Dossier 30 prohibition 3
select throws_ok(
  $$select public.record_material_check(
      '43000000-0000-0000-0000-000000000501', date '2026-08-05',
      '[{"ident_code":"IDN-100","trace_number":"HEAT-BOGUS"}]'::jsonb)$$,
  'PQC33', null,
  'a trace number that is not in the PML is refused'
);

-- A partial check does not derive Material Check
select lives_ok(
  $$select public.record_material_check(
      '43000000-0000-0000-0000-000000000501', date '2026-08-05',
      '[{"ident_code":"IDN-100","trace_number":"HEAT-100","quantity":3}]'::jsonb)$$,
  'the first valid trace is accepted'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000501', 'fabrication', 'material_check'),
  null,
  'material check is not derived while a bill line is outstanding'
);

-- Completing the bill derives the stage
select lives_ok(
  $$select public.record_material_check(
      '43000000-0000-0000-0000-000000000501', date '2026-08-06',
      '[{"ident_code":"IDN-200","trace_number":"HEAT-200","quantity":2}]'::jsonb)$$,
  'the second valid trace is accepted'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000501', 'fabrication', 'material_check'),
  date '2026-08-06',
  'material check is derived once every bill line is traced'
);
select is(
  (select count(*)::int from public.material_check_items),
  2,
  'both traces are stored with their PML evidence'
);
select is(
  (select count(*)::int from public.material_check_items where piping_material_record_id is null),
  0,
  'every accepted trace carries its PML record id'
);
```

- [ ] **Step 4: Run the pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/050_material_traceability.test.sql
```

Expected: 25 of 25 assertions pass.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804091000_material_traceability.sql \
        supabase/tests/database/050_material_traceability.test.sql
git commit -m "feat(construction): validate material traces against the project PML"
```

## Task 3: Weld progress schema, NDE obligations and PWHT requirements

**Files:**
- Create: `supabase/migrations/20260804092000_weld_progress_commands.sql` — tables only. The command lands in `…092100` (Task 4) and the locks in `…092200` (Task 5), as separate migrations, because the forward-only rule applies from the moment a migration is committed.
- Create: `supabase/tests/database/051_weld_progress.test.sql`

**Interfaces:**
- Consumes: `public.weld_joint_revisions`, `public.weld_points` (Track 04); `public.nde_matrix_rules`, `public.project_welding_procedures`, `public.welder_qualifications` (Track 02).
- Produces: tables `public.weld_progress_records`, `public.weld_point_assignments`, `public.nde_obligations`, `public.pwht_requirements`; function `public.weld_joint_context(uuid)` returning `public.weld_context`; type `public.weld_context`.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804092000_weld_progress_commands.sql`:

```sql
-- Track 05: shop weld progress, the obligations it generates, and the locks that protect it.
-- Dossier 7.3 and 16.5.

-- One WPS per joint (dossier 7.3: "the second point inherits the WPS and it becomes
-- read-only"). Expressing that as a column on the record removes the rule entirely.
create table public.weld_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null
    references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  subcontractor_id uuid not null
    references public.project_subcontractors(id) on delete restrict,
  welding_procedure_id uuid not null
    references public.project_welding_procedures(id) on delete restrict,
  cutting_on date,
  beveling_on date,
  fitup_on date,
  preheat_on date,
  weld_on date,
  dwir_number text,
  qc_form_number text,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  rework_code_id uuid references public.project_rework_codes(id) on delete restrict,
  is_locked boolean not null default false,
  locked_at timestamptz,
  version integer not null default 1 check (version > 0),
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id),
  check (is_locked = (locked_at is not null))
);

create index weld_progress_records_spool_idx
  on public.weld_progress_records (spool_revision_id);

-- One welder per point, distinct across the joint (dossier 7.3: "the second point requires
-- a different welder"). Both rules are unique constraints, not procedural checks.
create table public.weld_point_assignments (
  id uuid primary key default gen_random_uuid(),
  weld_progress_record_id uuid not null
    references public.weld_progress_records(id) on delete cascade,
  weld_point_id uuid not null references public.weld_points(id) on delete restrict,
  point_type text not null check (point_type in ('root', 'hot', 'fill', 'cap')),
  welder_qualification_id uuid not null
    references public.welder_qualifications(id) on delete restrict,
  completion_percent numeric(5, 2) not null
    check (completion_percent >= 0 and completion_percent <= 100),
  welded_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_progress_record_id, weld_point_id),
  unique (weld_progress_record_id, welder_qualification_id)
);

-- Plan section 3.8: the obligation record is the seam with Track 06. Track 05 generates it
-- and blocks release on it; Track 06 adds batches, results, repairs and tracers.
create table public.nde_obligations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null
    references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  method public.ndt_method not null,
  required_coverage numeric(5, 2) not null
    check (required_coverage > 0 and required_coverage <= 100),
  selection_mode text not null check (selection_mode in ('full', 'spot')),
  disposition text not null default 'pending'
    check (disposition in ('pending', 'satisfied', 'waived')),
  source_matrix_rule_id uuid references public.nde_matrix_rules(id) on delete restrict,
  satisfied_at timestamptz,
  satisfied_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id, method)
);

create index nde_obligations_spool_idx
  on public.nde_obligations (spool_revision_id, disposition);

create table public.pwht_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  weld_joint_revision_id uuid not null
    references public.weld_joint_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  thickness_threshold_mm numeric(8, 3),
  source_matrix_rule_id uuid references public.nde_matrix_rules(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (weld_joint_revision_id)
);

create index pwht_requirements_spool_idx
  on public.pwht_requirements (spool_revision_id);

-- Joint-level context, the weld-side twin of spool_context.
create type public.weld_context as (
  weld_joint_revision_id uuid,
  weld_joint_id uuid,
  weld_number text,
  spool_revision_id uuid,
  isometric_revision_id uuid,
  project_id uuid,
  pds_area_id uuid,
  service_class_id uuid,
  weld_type_id uuid,
  weld_location text,
  diameter_inch numeric,
  thickness_mm numeric,
  material_class text,
  revision_status public.revision_status,
  is_removed boolean
);

create or replace function public.weld_joint_context(target_weld_joint_revision_id uuid)
returns public.weld_context
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
begin
  select wjr.id, wjr.weld_joint_id, wj.weld_number, sr.id, rev.id, iso.project_id,
         rev.pds_area_id, rev.service_class_id, wjr.weld_type_id, wjr.weld_location,
         wjr.diameter_inch, wjr.thickness_mm, sr.material_class, rev.status, wjr.is_removed
    into ctx
  from public.weld_joint_revisions wjr
  join public.weld_joints wj on wj.id = wjr.weld_joint_id
  join public.spool_revisions sr on sr.id = wjr.spool_revision_id
  join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
  join public.isometrics iso on iso.id = rev.isometric_id
  where wjr.id = target_weld_joint_revision_id;

  if ctx.weld_joint_revision_id is null then
    raise exception 'The weld joint revision was not found' using errcode = 'PQC30';
  end if;

  return ctx;
end;
$$;

alter table public.weld_progress_records enable row level security;
alter table public.weld_point_assignments enable row level security;
alter table public.nde_obligations enable row level security;
alter table public.pwht_requirements enable row level security;

create policy "read weld progress records" on public.weld_progress_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read weld point assignments" on public.weld_point_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.weld_progress_records parent
      where parent.id = weld_point_assignments.weld_progress_record_id
        and public.current_user_has_capability(parent.project_id, 'fabrication.view')
    )
  );

create policy "read nde obligations" on public.nde_obligations
  for select to authenticated
  using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'nde.view')
  );

create policy "read pwht requirements" on public.pwht_requirements
  for select to authenticated
  using (
    public.current_user_has_capability(project_id, 'fabrication.view')
    or public.current_user_has_capability(project_id, 'nde.view')
  );

grant select on
  public.weld_progress_records,
  public.weld_point_assignments,
  public.nde_obligations,
  public.pwht_requirements
to authenticated;

revoke insert, update, delete, truncate on
  public.weld_progress_records,
  public.weld_point_assignments,
  public.nde_obligations,
  public.pwht_requirements
from authenticated, anon;

revoke all on function public.weld_joint_context(uuid) from public, anon;
grant execute on function public.weld_joint_context(uuid) to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error.

- [ ] **Step 3: Write the fixture header and schema assertions of the weld pgTAP file.**

Create `supabase/tests/database/051_weld_progress.test.sql`. Task 4 and Task 5 extend the plan count; write exactly this for now:

```sql
begin;
select plan(9);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000511', 'authenticated', 'authenticated', 'weld.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000512', 'authenticated', 'authenticated', 'weld.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000511';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000511', 'WLD-A', 'Welding A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000511');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '10000000-0000-0000-0000-000000000512', 'system_admin', 'project_admin', true);

-- Referentials
insert into public.project_subcontractors (id, project_id, code, name)
values ('50000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SUB-1', 'Fab Sub 1');

insert into public.project_service_classes (id, project_id, code, description)
values ('51000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'BW', 'Butt weld');

insert into public.system_reference_entries (id, kind, code, label)
values ('53000000-0000-0000-0000-000000000511', 'material_type', 'CS', 'Carbon steel')
on conflict do nothing;

insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'CS', 'Carbon steel');

insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'A1',
        '54000000-0000-0000-0000-000000000511');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '50000000-0000-0000-0000-000000000511', '53000000-0000-0000-0000-000000000511',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

insert into public.welder_qualifications (
  id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-1', 'Welder One', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-2', 'Welder Two', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511',
   '50000000-0000-0000-0000-000000000511', 'W-3', 'Expired Welder', date '2026-02-01');

insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000511', '56000000-0000-0000-0000-000000000511'),
  ('57000000-0000-0000-0000-000000000512', '56000000-0000-0000-0000-000000000511'),
  ('57000000-0000-0000-0000-000000000513', '56000000-0000-0000-0000-000000000511');

insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location,
  rt_coverage, ut_coverage, pwht_required, pwht_thickness_threshold)
values ('58000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511',
        '51000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511', 'shop',
        100, 10, true, 10);

-- Definition graph
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'ISO-0511');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'SP-0511-A');

insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000511', '30000000-0000-0000-0000-000000000511', 'W-0511-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000511', '40000000-0000-0000-0000-000000000511', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000511', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000511', '41000000-0000-0000-0000-000000000511',
        '42000000-0000-0000-0000-000000000511', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000511', '46000000-0000-0000-0000-000000000511',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'shop', 6, 12);

insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000511', '47000000-0000-0000-0000-000000000511', 'root', 1),
  ('48000000-0000-0000-0000-000000000512', '47000000-0000-0000-0000-000000000511', 'cap', 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000512', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000512","role":"authenticated"}', true);

select has_table('public', 'weld_progress_records', 'weld_progress_records table exists');
select has_table('public', 'weld_point_assignments', 'weld_point_assignments table exists');
select has_table('public', 'nde_obligations', 'nde_obligations table exists');
select has_table('public', 'pwht_requirements', 'pwht_requirements table exists');

select is(relrowsecurity, true, 'weld_progress_records has RLS')
from pg_class where oid = 'public.weld_progress_records'::regclass;

select is(
  has_table_privilege('authenticated', 'public.weld_progress_records', 'UPDATE'),
  false,
  'authenticated cannot update weld progress directly'
);
select is(
  has_table_privilege('authenticated', 'public.nde_obligations', 'INSERT'),
  false,
  'authenticated cannot insert obligations directly'
);

select is(
  (public.weld_joint_context('47000000-0000-0000-0000-000000000511')).weld_location,
  'shop',
  'the weld context resolves the joint location'
);
select is(
  (public.weld_joint_context('47000000-0000-0000-0000-000000000511')).service_class_id,
  '51000000-0000-0000-0000-000000000511'::uuid,
  'the weld context resolves the service class from the ISO revision'
);

select * from finish();
rollback;
```

- [ ] **Step 4: Run the pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/051_weld_progress.test.sql
```

Expected: 9 of 9 assertions pass. If a referential insert fails on a `not null` column this fixture omits, add the column with a literal value — do not weaken the table.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804092000_weld_progress_commands.sql \
        supabase/tests/database/051_weld_progress.test.sql
git commit -m "feat(construction): add weld progress, NDE obligation and PWHT requirement tables"
```

## Task 4: The `record_weld_progress` command

**Files:**
- Create: `supabase/migrations/20260804092100_record_weld_progress.sql`
- Modify: `supabase/tests/database/051_weld_progress.test.sql`

**Interfaces:**
- Consumes: `public.weld_joint_context(uuid)`, `public.assert_construction_target(uuid, text)`, `public.claim_command_receipt(uuid, text, text)`, `public.complete_command_receipt(uuid, jsonb)`.
- Produces: `public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)` returning `public.weld_progress_records`, and `public.generate_weld_obligations(public.weld_context)` returning `integer`.
  - `points` is a JSON array of `{"point_type": "root"|"hot"|"fill"|"cap", "welder_qualification_id": uuid, "completion_percent": number, "welded_on": "YYYY-MM-DD"}`.
  - `dates` is a JSON object of `{"cutting_on": date, "beveling_on": date, "fitup_on": date, "preheat_on": date, "weld_on": date, "dwir_number": text, "qc_form_number": text, "rework_code_id": uuid, "qc13_form_id": uuid}`; every key optional.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804092100_record_weld_progress.sql`:

```sql
-- Track 05: the shop weld progress command.
-- Every referential rule in dossier 16.5 is re-derived here. The browser's copy of these
-- rules exists to disable buttons; this copy is the one that decides.

-- Dossier 11.9: one obligation per method with coverage > 0. 100 percent is an NDE100
-- obligation from the start; a spot percentage is what Track 06 allocates into batches.
create or replace function public.generate_weld_obligations(ctx public.weld_context)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rule public.nde_matrix_rules;
  method_name text;
  coverage numeric;
  created_count integer := 0;
begin
  select * into rule
  from public.nde_matrix_rules matrix
  where matrix.project_id = ctx.project_id
    and matrix.service_class_id = ctx.service_class_id
    and matrix.weld_type_id = ctx.weld_type_id
    and matrix.weld_location = ctx.weld_location
    and matrix.status = 'active';

  if rule.id is null then
    raise exception
      'No active NDE matrix rule covers this service class, weld type and location'
      using errcode = 'PQC39';
  end if;

  foreach method_name in array array['rt', 'ut', 'mt', 'pt', 'pmi', 'ht']
  loop
    coverage := case method_name
      when 'rt' then rule.rt_coverage
      when 'ut' then rule.ut_coverage
      when 'mt' then rule.mt_coverage
      when 'pt' then rule.pt_coverage
      when 'pmi' then rule.pmi_coverage
      when 'ht' then rule.ht_coverage
    end;

    if coalesce(coverage, 0) <= 0 then
      continue;
    end if;

    insert into public.nde_obligations (
      project_id, weld_joint_revision_id, spool_revision_id, method,
      required_coverage, selection_mode, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      method_name::public.ndt_method, coverage,
      case when coverage >= 100 then 'full' else 'spot' end, rule.id
    )
    on conflict (weld_joint_revision_id, method) do nothing;

    if found then
      created_count := created_count + 1;
    end if;
  end loop;

  if rule.pwht_required
     and (rule.pwht_thickness_threshold is null
          or coalesce(ctx.thickness_mm, 0) >= rule.pwht_thickness_threshold) then
    insert into public.pwht_requirements (
      project_id, weld_joint_revision_id, spool_revision_id,
      thickness_threshold_mm, source_matrix_rule_id
    )
    values (
      ctx.project_id, ctx.weld_joint_revision_id, ctx.spool_revision_id,
      rule.pwht_thickness_threshold, rule.id
    )
    on conflict (weld_joint_revision_id) do nothing;
  end if;

  return created_count;
end;
$$;

create or replace function public.record_weld_progress(
  target_weld_joint_revision_id uuid,
  subcontractor_id uuid,
  welding_procedure_id uuid,
  points jsonb,
  dates jsonb default '{}'::jsonb,
  idempotency_key text default null
)
returns public.weld_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  claim record;
  wps public.project_welding_procedures;
  welder public.welder_qualifications;
  record_row public.weld_progress_records;
  existing public.weld_progress_records;
  point jsonb;
  point_type text;
  point_row public.weld_points;
  welded_on date;
  weld_date date;
  material_type_id uuid;
  root_cap_total numeric := 0;
  hot_fill_total numeric := 0;
begin
  ctx := public.weld_joint_context(target_weld_joint_revision_id);

  -- Capability, PDS scope and revision currency come from the spool-side guard so that a
  -- weld and a spool command can never disagree about who may write.
  perform public.assert_construction_target(ctx.spool_revision_id, 'fabrication.progress.record');

  if ctx.is_removed then
    raise exception 'This weld joint was removed in the current revision' using errcode = 'PQC31';
  end if;

  -- Dossier 16.5: Shop Weld Progress covers shop joints only.
  if ctx.weld_location <> 'shop' then
    raise exception
      'Joint % is a % weld and belongs to the assembly or erection module, not Shop Weld Progress',
      ctx.weld_number, ctx.weld_location
      using errcode = 'PQC30';
  end if;

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_weld_progress', idempotency_key);

  if claim.replayed_result is not null then
    select * into record_row from public.weld_progress_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return record_row;
  end if;

  select * into existing from public.weld_progress_records
  where weld_joint_revision_id = target_weld_joint_revision_id;

  if existing.is_locked then
    raise exception
      'This joint has an accepted NDE result. Use the correction command to change it'
      using errcode = 'PQC36';
  end if;

  if not public.current_user_in_subcontractor_scope(ctx.project_id, subcontractor_id) then
    raise exception 'That subcontractor is outside your scope' using errcode = '42501';
  end if;

  weld_date := nullif(dates ->> 'weld_on', '')::date;

  -- WPS validation, dossier 11.6 -------------------------------------------------
  select * into wps from public.project_welding_procedures
  where id = welding_procedure_id and project_id = ctx.project_id;

  if wps.id is null then
    raise exception 'That WPS does not belong to this project' using errcode = 'PQC34';
  end if;
  if wps.status <> 'active' then
    raise exception 'WPS % is not active', wps.code using errcode = 'PQC34';
  end if;
  if wps.subcontractor_id is not null and wps.subcontractor_id <> subcontractor_id then
    raise exception 'WPS % is qualified for a different subcontractor', wps.code
      using errcode = 'PQC34';
  end if;
  if ctx.diameter_inch is null
     or ctx.diameter_inch < wps.diameter_from or ctx.diameter_inch > wps.diameter_to then
    raise exception 'WPS % does not cover a diameter of %"', wps.code, ctx.diameter_inch
      using errcode = 'PQC34';
  end if;
  if ctx.thickness_mm is null
     or ctx.thickness_mm < wps.thickness_from or ctx.thickness_mm > wps.thickness_to then
    raise exception 'WPS % does not cover a thickness of % mm', wps.code, ctx.thickness_mm
      using errcode = 'PQC34';
  end if;
  if weld_date is not null and wps.approved_on > weld_date then
    raise exception 'WPS % was approved on %, after the weld date', wps.code, wps.approved_on
      using errcode = 'PQC34';
  end if;

  -- The spool material class maps to a material type through the Track 02 referential.
  select mapped.material_type_id into material_type_id
  from public.project_spooling_material_classes mapped
  join public.project_spooling_material_types mtype on mtype.id = mapped.material_type_id
  where mapped.project_id = ctx.project_id
    and mapped.external_class_code = ctx.material_class
    and mapped.status = 'active';

  if ctx.material_class is not null and material_type_id is null then
    raise exception 'Material class % is not mapped to a material type', ctx.material_class
      using errcode = 'PQC39';
  end if;

  if material_type_id is not null and not exists (
    select 1 from public.project_spooling_material_types mtype
    join public.system_reference_entries entry on entry.code = mtype.code
    where mtype.id = material_type_id and entry.id = wps.material_type_id
  ) then
    raise exception 'WPS % is not qualified for the material of this spool', wps.code
      using errcode = 'PQC34';
  end if;

  -- The record ------------------------------------------------------------------
  insert into public.weld_progress_records (
    project_id, weld_joint_revision_id, spool_revision_id, subcontractor_id,
    welding_procedure_id, cutting_on, beveling_on, fitup_on, preheat_on, weld_on,
    dwir_number, qc_form_number, qc13_form_id, rework_code_id, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_weld_joint_revision_id, ctx.spool_revision_id, subcontractor_id,
    welding_procedure_id,
    nullif(dates ->> 'cutting_on', '')::date,
    nullif(dates ->> 'beveling_on', '')::date,
    nullif(dates ->> 'fitup_on', '')::date,
    nullif(dates ->> 'preheat_on', '')::date,
    weld_date,
    nullif(dates ->> 'dwir_number', ''),
    nullif(dates ->> 'qc_form_number', ''),
    nullif(dates ->> 'qc13_form_id', '')::uuid,
    nullif(dates ->> 'rework_code_id', '')::uuid,
    claim.receipt_id, auth.uid()
  )
  on conflict (weld_joint_revision_id) do update
    set subcontractor_id = excluded.subcontractor_id,
        welding_procedure_id = excluded.welding_procedure_id,
        cutting_on = excluded.cutting_on,
        beveling_on = excluded.beveling_on,
        fitup_on = excluded.fitup_on,
        preheat_on = excluded.preheat_on,
        weld_on = excluded.weld_on,
        dwir_number = excluded.dwir_number,
        qc_form_number = excluded.qc_form_number,
        qc13_form_id = excluded.qc13_form_id,
        rework_code_id = excluded.rework_code_id,
        version = public.weld_progress_records.version + 1,
        updated_at = timezone('utc', now())
  returning * into record_row;

  delete from public.weld_point_assignments where weld_progress_record_id = record_row.id;

  -- Points, dossier 7.3 and 16.5 -------------------------------------------------
  for point in select value from jsonb_array_elements(coalesce(points, '[]'::jsonb))
  loop
    point_type := point ->> 'point_type';
    welded_on := nullif(point ->> 'welded_on', '')::date;

    if welded_on is null then
      raise exception 'Every weld point needs a welded-on date' using errcode = '23514';
    end if;

    select * into point_row from public.weld_points
    where weld_joint_revision_id = target_weld_joint_revision_id
      and weld_points.point_type = point_type;

    if point_row.id is null then
      raise exception 'This joint has no % weld point in its definition', point_type
        using errcode = 'PQC35';
    end if;

    select * into welder from public.welder_qualifications
    where id = (point ->> 'welder_qualification_id')::uuid and project_id = ctx.project_id;

    if welder.id is null then
      raise exception 'That welder is not registered on this project' using errcode = 'PQC34';
    end if;
    if welder.status <> 'active' then
      raise exception 'Welder % is not active', welder.welder_code using errcode = 'PQC34';
    end if;
    if welder.subcontractor_id <> subcontractor_id then
      raise exception 'Welder % belongs to a different subcontractor', welder.welder_code
        using errcode = 'PQC34';
    end if;
    -- Per point, against that point's own date: a qualification that expired between the
    -- root and the cap invalidates the cap only.
    if welder.expires_on < welded_on then
      raise exception 'Welder % qualification expired on %', welder.welder_code, welder.expires_on
        using errcode = 'PQC34';
    end if;
    if not exists (
      select 1 from public.welder_wps_qualifications link
      where link.welder_qualification_id = welder.id and link.wps_id = welding_procedure_id
    ) then
      raise exception 'Welder % is not qualified for WPS %', welder.welder_code, wps.code
        using errcode = 'PQC34';
    end if;

    insert into public.weld_point_assignments (
      weld_progress_record_id, weld_point_id, point_type,
      welder_qualification_id, completion_percent, welded_on
    )
    values (
      record_row.id, point_row.id, point_type, welder.id,
      coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0), welded_on
    );

    if point_type in ('root', 'cap') then
      root_cap_total := root_cap_total
        + coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0);
    else
      hot_fill_total := hot_fill_total
        + coalesce(nullif(point ->> 'completion_percent', '')::numeric, 0);
    end if;
  end loop;

  -- Allocation totals only bind once the joint claims to be welded. A fit-up-only record
  -- carries no points and must stay recordable.
  if weld_date is not null then
    if root_cap_total <> 100 then
      raise exception 'Root and Cap must total 100 percent, not %', root_cap_total
        using errcode = 'PQC35';
    end if;
    if hot_fill_total not in (0, 100) then
      raise exception 'Heat and Fill must total either 0 or 100 percent, not %', hot_fill_total
        using errcode = 'PQC35';
    end if;

    perform public.generate_weld_obligations(ctx);
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'weld_progress_records', record_row.id,
    'record_weld_progress', to_jsonb(existing), to_jsonb(record_row)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', record_row.id));
  end if;

  return record_row;
end;
$$;

revoke all on function
  public.generate_weld_obligations(public.weld_context),
  public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)
from public, anon;

-- generate_weld_obligations is internal: obligations follow welding, they are not requested.
revoke all on function public.generate_weld_obligations(public.weld_context) from authenticated;

grant execute on function public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)
  to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error.

- [ ] **Step 3: Extend the weld pgTAP file with the validation matrix.**

In `supabase/tests/database/051_weld_progress.test.sql`, change the plan line to `select plan(22);` and add before `select * from finish();`:

```sql
-- Start Fab so the spool is a legitimate fabrication target
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000511', 'fabrication', 'start_fab', date '2026-08-04');

-- Happy path: two points, two welders, one WPS, Root + Cap = 100
select lives_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05","dwir_number":"DWIR-1"}'::jsonb)$$,
  'a qualified multi-welder joint is recorded'
);

select is(
  (select count(*)::int from public.weld_point_assignments),
  2,
  'both weld points are assigned'
);

-- Dossier 11.9: RT 100 and UT 10 produce two obligations, full and spot
select is(
  (select count(*)::int from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  2,
  'the matrix generated one obligation per covered method'
);
select is(
  (select selection_mode from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'rt'),
  'full',
  'a 100 percent coverage is a full obligation'
);
select is(
  (select selection_mode from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'ut'),
  'spot',
  'a partial coverage is a spot obligation'
);
select is(
  (select count(*)::int from public.pwht_requirements
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  1,
  'a 12 mm joint over a 10 mm threshold generates a PWHT requirement'
);

-- Re-recording is idempotent for obligations
select lives_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":60,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":40,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'the joint can be corrected while it is unlocked'
);
select is(
  (select count(*)::int from public.nde_obligations
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  2,
  're-recording did not duplicate obligations'
);

-- Root + Cap must be exactly 100
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":70,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC35', null,
  'Root plus Cap over 100 percent is refused'
);

-- The same welder cannot take both points
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  '23505', null,
  'one welder cannot hold two points of the same joint'
);

-- Expired qualification on the date of the work
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000513",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null,
  'a welder whose qualification expired before the weld date is refused'
);

-- WPS out of range
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511',
        '50000000-0000-0000-0000-000000000511', '53000000-0000-0000-0000-000000000511',
        'WPS-SMALL', 'GTAW', 1, 2, 2, 4, 'R0', date '2026-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000000511', '56000000-0000-0000-0000-000000000512');

select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000512',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":100,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null,
  'a WPS that does not cover the joint diameter is refused'
);

-- A field joint is not Shop Weld Progress
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000512', '30000000-0000-0000-0000-000000000511', 'W-0511-02');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000512', '46000000-0000-0000-0000-000000000512',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'field', 6, 12);

select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000512',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[]'::jsonb, '{}'::jsonb)$$,
  'PQC30', null,
  'a field joint is refused by Shop Weld Progress'
);
```

- [ ] **Step 4: Run the pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/051_weld_progress.test.sql
```

Expected: 22 of 22 assertions pass.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804092100_record_weld_progress.sql \
        supabase/tests/database/051_weld_progress.test.sql
git commit -m "feat(construction): validate WPS, welder and point allocation on weld progress"
```

## Task 5: Protected-field locks, corrections and the interim NDE outcome

**Files:**
- Create: `supabase/migrations/20260804092200_weld_progress_locks.sql`
- Modify: `supabase/tests/database/051_weld_progress.test.sql`

**Interfaces:**
- Produces: trigger function `public.assert_weld_progress_unlocked()`; `public.correct_weld_progress(uuid, integer, jsonb, text, text)` returning `public.weld_progress_records`; `public.record_nde_obligation_outcome(uuid, text, text)` returning `public.nde_obligations`.
  - `corrections` is a JSON object accepting `welding_procedure_id`, `subcontractor_id`, `weld_on`, `dwir_number`, `qc_form_number`, `rework_code_id`.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804092200_weld_progress_locks.sql`:

```sql
-- Track 05: dossier 30 prohibition 4 - WPS and welder cannot change after NDE.
-- The lock is a column the trigger reads, so Track 06 can set it on batch selection
-- without touching any of this logic.

create or replace function public.assert_weld_progress_unlocked()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  owning_record public.weld_progress_records;
begin
  if tg_table_name = 'weld_progress_records' then
    if old.is_locked
       and (new.welding_procedure_id is distinct from old.welding_procedure_id
            or new.subcontractor_id is distinct from old.subcontractor_id
            or new.weld_on is distinct from old.weld_on)
       -- correct_weld_progress announces itself by bumping the version and nothing else
       -- can, because authenticated has no direct update privilege on this table.
       and current_setting('pipeqc.weld_correction', true) is distinct from 'on' then
      raise exception 'WPS, subcontractor and weld date are locked after an accepted NDE result'
        using errcode = 'PQC36';
    end if;
    return new;
  end if;

  select * into owning_record from public.weld_progress_records
  where id = coalesce(new.weld_progress_record_id, old.weld_progress_record_id);

  if owning_record.is_locked
     and current_setting('pipeqc.weld_correction', true) is distinct from 'on' then
    raise exception 'Weld point assignments are locked after an accepted NDE result'
      using errcode = 'PQC36';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger weld_progress_records_locked
  before update on public.weld_progress_records
  for each row execute function public.assert_weld_progress_unlocked();

create trigger weld_point_assignments_locked
  before insert or update or delete on public.weld_point_assignments
  for each row execute function public.assert_weld_progress_unlocked();

-- Roadmap 17: "a correction is performed by a separate command". Higher capability,
-- mandatory reason, full before/after in the audit trail, optimistic concurrency.
create or replace function public.correct_weld_progress(
  target_weld_joint_revision_id uuid,
  expected_version integer,
  corrections jsonb,
  reason text,
  idempotency_key text default null
)
returns public.weld_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  claim record;
  existing public.weld_progress_records;
  updated public.weld_progress_records;
begin
  ctx := public.weld_joint_context(target_weld_joint_revision_id);
  perform public.assert_construction_target(ctx.spool_revision_id, 'fabrication.qc.release');

  if coalesce(trim(reason), '') = '' then
    raise exception 'A correction requires a reason' using errcode = '23514';
  end if;

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'correct_weld_progress', idempotency_key);

  if claim.replayed_result is not null then
    select * into updated from public.weld_progress_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return updated;
  end if;

  select * into existing from public.weld_progress_records
  where weld_joint_revision_id = target_weld_joint_revision_id;

  if existing.id is null then
    raise exception 'This joint has no weld progress to correct' using errcode = 'PQC30';
  end if;
  if existing.version <> expected_version then
    raise exception 'This record changed since you loaded it. Reload and try again'
      using errcode = '23514';
  end if;

  perform set_config('pipeqc.weld_correction', 'on', true);

  update public.weld_progress_records
  set welding_procedure_id = coalesce(
        nullif(corrections ->> 'welding_procedure_id', '')::uuid, welding_procedure_id),
      subcontractor_id = coalesce(
        nullif(corrections ->> 'subcontractor_id', '')::uuid, subcontractor_id),
      weld_on = coalesce(nullif(corrections ->> 'weld_on', '')::date, weld_on),
      dwir_number = coalesce(nullif(corrections ->> 'dwir_number', ''), dwir_number),
      qc_form_number = coalesce(nullif(corrections ->> 'qc_form_number', ''), qc_form_number),
      rework_code_id = coalesce(
        nullif(corrections ->> 'rework_code_id', '')::uuid, rework_code_id),
      version = version + 1,
      updated_at = timezone('utc', now())
  where id = existing.id
  returning * into updated;

  perform set_config('pipeqc.weld_correction', 'off', true);

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'weld_progress_records', updated.id,
    'correct_weld_progress',
    to_jsonb(existing),
    jsonb_build_object('record', to_jsonb(updated), 'reason', reason)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', updated.id));
  end if;

  return updated;
end;
$$;

-- INTERIM COMMAND - plan section 3.8.
-- Track 06 replaces this with record_nde_results, which will close obligations through
-- batches and results. It exists here so "QC release is blocked until NDE is accepted"
-- is a provable statement in Track 05 rather than an assertion deferred to Track 06.
-- Do not build UI beyond the single QC action screen on top of it.
create or replace function public.record_nde_obligation_outcome(
  target_obligation_id uuid,
  chosen_disposition text,
  idempotency_key text default null
)
returns public.nde_obligations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.weld_context;
  claim record;
  obligation public.nde_obligations;
  updated public.nde_obligations;
begin
  select * into obligation from public.nde_obligations where id = target_obligation_id;
  if obligation.id is null then
    raise exception 'The NDE obligation was not found' using errcode = 'PQC30';
  end if;

  ctx := public.weld_joint_context(obligation.weld_joint_revision_id);

  if not public.current_user_has_capability(ctx.project_id, 'nde.result.record') then
    raise exception 'You do not have permission to record NDE outcomes' using errcode = '42501';
  end if;
  if not public.current_user_in_pds_scope(ctx.project_id, ctx.pds_area_id) then
    raise exception 'This joint is outside your PDS area scope' using errcode = '42501';
  end if;
  if chosen_disposition not in ('satisfied', 'waived') then
    raise exception 'An obligation outcome must be satisfied or waived' using errcode = '23514';
  end if;

  select * into claim
  from public.claim_command_receipt(
    ctx.project_id, 'record_nde_obligation_outcome', idempotency_key);

  if claim.replayed_result is not null then
    select * into updated from public.nde_obligations
    where id = (claim.replayed_result ->> 'obligation_id')::uuid;
    return updated;
  end if;

  update public.nde_obligations
  set disposition = chosen_disposition,
      satisfied_at = timezone('utc', now()),
      satisfied_by = auth.uid()
  where id = target_obligation_id
  returning * into updated;

  -- Dossier 7.3: the joint is frozen once an examination has happened.
  if chosen_disposition = 'satisfied' then
    perform set_config('pipeqc.weld_correction', 'on', true);
    update public.weld_progress_records
    set is_locked = true, locked_at = coalesce(locked_at, timezone('utc', now()))
    where weld_joint_revision_id = obligation.weld_joint_revision_id and not is_locked;
    perform set_config('pipeqc.weld_correction', 'off', true);
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'nde_obligations', updated.id,
    'record_nde_obligation_outcome', to_jsonb(obligation), to_jsonb(updated)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('obligation_id', updated.id));
  end if;

  return updated;
end;
$$;

revoke all on function
  public.correct_weld_progress(uuid, integer, jsonb, text, text),
  public.record_nde_obligation_outcome(uuid, text, text)
from public, anon;

grant execute on function
  public.correct_weld_progress(uuid, integer, jsonb, text, text),
  public.record_nde_obligation_outcome(uuid, text, text)
to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error.

- [ ] **Step 3: Extend the weld pgTAP file with the lock behaviour.**

In `supabase/tests/database/051_weld_progress.test.sql`, change the plan line to `select plan(30);` and add before `select * from finish();`:

```sql
-- Restore a clean welded record after the negative cases above
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000511',
  '50000000-0000-0000-0000-000000000511',
  '56000000-0000-0000-0000-000000000511',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
     "completion_percent":50,"welded_on":"2026-08-05"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
     "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
  '{"weld_on":"2026-08-05"}'::jsonb);

select is(
  (select is_locked from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  false,
  'a welded joint starts unlocked'
);

-- Accepting the first obligation locks the joint
select lives_ok(
  format($$select public.record_nde_obligation_outcome(%L, 'satisfied')$$,
    (select id from public.nde_obligations
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511' and method = 'rt')),
  'the RT obligation is satisfied'
);
select is(
  (select is_locked from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  true,
  'the first accepted NDE result locks the joint'
);

-- Dossier 30 prohibition 4
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000511',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC36', null,
  'a locked joint refuses ordinary weld progress'
);

-- The correction path works, and only with a reason
select throws_ok(
  format($$select public.correct_weld_progress(
      '47000000-0000-0000-0000-000000000511', %s,
      '{"dwir_number":"DWIR-2"}'::jsonb, '   ')$$,
    (select version from public.weld_progress_records
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511')),
  '23514', null,
  'a correction without a reason is refused'
);
select lives_ok(
  format($$select public.correct_weld_progress(
      '47000000-0000-0000-0000-000000000511', %s,
      '{"dwir_number":"DWIR-2"}'::jsonb, 'Transcription error on the DWIR number')$$,
    (select version from public.weld_progress_records
     where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511')),
  'a reasoned correction passes the lock'
);
select is(
  (select dwir_number from public.weld_progress_records
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000511'),
  'DWIR-2',
  'the correction was applied'
);
select is(
  (select count(*)::int from public.audit_events
   where action = 'correct_weld_progress'),
  1,
  'the correction is in the audit trail'
);
```

- [ ] **Step 4: Run the pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/051_weld_progress.test.sql
```

Expected: 30 of 30 assertions pass.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804092200_weld_progress_locks.sql \
        supabase/tests/database/051_weld_progress.test.sql
git commit -m "feat(construction): lock protected weld fields after an accepted NDE result"
```

## Task 6: Readiness views, QC release, PWHT results, paint, laydown and supports

**Files:**
- Create: `supabase/migrations/20260804093000_fabrication_release.sql`
- Create: `supabase/tests/database/052_fabrication_release.test.sql`

**Interfaces:**
- Produces: tables `public.support_progress_records`, `public.quality_release_records`, `public.pwht_results`, `public.paint_progress_records`, `public.laydown_records`; view `public.spool_fabrication_readiness`; functions `public.record_support_progress(uuid, date, text)`, `public.record_pwht_result(uuid, text, date, text, text)`, `public.release_quality_record(uuid, date, uuid, text, text)`, `public.record_paint_progress(uuid, uuid, jsonb, text)`, `public.record_laydown(uuid, uuid, date, text)`.
- `spool_fabrication_readiness` columns consumed by later tasks: `spool_revision_id`, `project_id`, `line_total`, `line_checked`, `is_material_checked`, `weld_total`, `weld_complete`, `support_total`, `support_recorded`, `nde_pending`, `pwht_pending`, `is_fabricated`, `fabricated_on`, `is_releasable`.

- [ ] **Step 1: Write the tables and the readiness view.**

Create `supabase/migrations/20260804093000_fabrication_release.sql` with this first half:

```sql
-- Track 05: the release half of fabrication.
-- Dossier 16.6, 16.7 and 16.8. The derived states live in one view so the RPC guard and the
-- UI disabled state read the same expression - roadmap 17 requires them to agree.

create table public.support_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  support_revision_id uuid not null references public.support_revisions(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  installed_on date not null,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (support_revision_id)
);

create table public.pwht_results (
  id uuid primary key default gen_random_uuid(),
  pwht_requirement_id uuid not null
    references public.pwht_requirements(id) on delete restrict,
  chart_number text not null check (length(trim(chart_number)) > 0),
  performed_on date not null,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  comment text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- A rejected run may be followed by a good one; exactly one acceptance survives.
create unique index pwht_results_one_accepted
  on public.pwht_results (pwht_requirement_id)
  where outcome = 'accepted';

create table public.quality_release_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  phase public.construction_phase not null default 'fabrication',
  released_on date not null,
  released_by uuid references public.profiles(id) on delete set null,
  qc13_form_id uuid references public.qc13_progress_forms(id) on delete restrict,
  weld_count integer not null check (weld_count >= 0),
  obligation_count integer not null check (obligation_count >= 0),
  comment text,
  version integer not null default 1 check (version > 0),
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

-- Plan section 3.11: the record carries the line service and a snapshot of the DFT
-- requirement, so a later referential change cannot rewrite what was inspected.
create table public.paint_progress_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  line_service_id uuid not null references public.project_line_services(id) on delete restrict,
  paint_matrix_rule_id uuid not null
    references public.project_paint_matrix_rules(id) on delete restrict,
  ral_code_id uuid not null references public.project_ral_codes(id) on delete restrict,
  required_final_dft_microns numeric(10, 3) not null check (required_final_dft_microns > 0),
  measured_dft_microns numeric(10, 3) check (measured_dft_microns is null or measured_dft_microns >= 0),
  blasting_on date,
  primer_on date,
  intermediate_coats smallint check (intermediate_coats is null or intermediate_coats >= 0),
  final_coats smallint check (final_coats is null or final_coats >= 0),
  w10p_form_number text,
  painted_on date,
  final_qc_on date,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

create table public.laydown_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  spool_revision_id uuid not null references public.spool_revisions(id) on delete restrict,
  location_id uuid not null references public.project_locations(id) on delete restrict,
  stored_on date not null,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (spool_revision_id)
);

-- The single source of derived fabrication truth ------------------------------
-- security_invoker keeps the caller's RLS in force; without it this view would be a
-- capability bypass for every construction table it touches.
create view public.spool_fabrication_readiness with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  rev.status as revision_status,
  bill.line_total,
  bill.line_checked,
  (bill.line_total > 0 and bill.line_total = bill.line_checked) as is_material_checked,
  bill.material_checked_on,
  welds.weld_total,
  welds.weld_complete,
  welds.last_weld_on,
  sup.support_total,
  sup.support_recorded,
  sup.last_support_on,
  quality.nde_pending,
  quality.pwht_pending,
  (
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
  ) as is_fabricated,
  case
    when bill.line_total > 0 and bill.line_total = bill.line_checked
      and welds.weld_total = welds.weld_complete
      and sup.support_total = sup.support_recorded
    then greatest(bill.material_checked_on, welds.last_weld_on, sup.last_support_on)
  end as fabricated_on,
  (
    bill.line_total > 0 and bill.line_total = bill.line_checked
    and welds.weld_total = welds.weld_complete
    and sup.support_total = sup.support_recorded
    and quality.nde_pending = 0
    and quality.pwht_pending = 0
  ) as is_releasable
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
cross join lateral (
  select
    count(line.id)::int as line_total,
    count(distinct item.spool_revision_material_id)::int as line_checked,
    max(item.checked_on) as material_checked_on
  from public.spool_revision_materials line
  left join public.material_check_items item
    on item.spool_revision_material_id = line.id and item.is_accepted
  where line.spool_revision_id = sr.id
) bill
cross join lateral (
  select
    count(wjr.id)::int as weld_total,
    count(progress.id) filter (where progress.weld_on is not null)::int as weld_complete,
    max(progress.weld_on) as last_weld_on
  from public.weld_joint_revisions wjr
  left join public.weld_progress_records progress
    on progress.weld_joint_revision_id = wjr.id
  where wjr.spool_revision_id = sr.id and not wjr.is_removed
) welds
cross join lateral (
  select
    count(supr.id)::int as support_total,
    count(progress.id)::int as support_recorded,
    max(progress.installed_on) as last_support_on
  from public.support_revisions supr
  left join public.support_progress_records progress
    on progress.support_revision_id = supr.id
  where supr.spool_revision_id = sr.id and not supr.is_removed
) sup
cross join lateral (
  select
    (select count(*)::int from public.nde_obligations obligation
     where obligation.spool_revision_id = sr.id and obligation.disposition = 'pending')
      as nde_pending,
    (select count(*)::int from public.pwht_requirements requirement
     where requirement.spool_revision_id = sr.id
       and not exists (
         select 1 from public.pwht_results result
         where result.pwht_requirement_id = requirement.id and result.outcome = 'accepted'
       ))
      as pwht_pending
) quality;
```

- [ ] **Step 2: Append the commands to the same migration file.**

Continue `supabase/migrations/20260804093000_fabrication_release.sql`:

```sql
create or replace function public.record_support_progress(
  target_support_revision_id uuid,
  installed_on date,
  idempotency_key text default null
)
returns public.support_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owning_spool_revision_id uuid;
  ctx public.spool_context;
  claim record;
  created public.support_progress_records;
begin
  select supr.spool_revision_id into owning_spool_revision_id
  from public.support_revisions supr where supr.id = target_support_revision_id;

  if owning_spool_revision_id is null then
    raise exception 'The support revision was not found' using errcode = 'PQC30';
  end if;

  ctx := public.assert_construction_target(
    owning_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_support_progress', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.support_progress_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return created;
  end if;

  if installed_on is null then
    raise exception 'An installation date is required' using errcode = '23514';
  end if;

  insert into public.support_progress_records (
    project_id, support_revision_id, spool_revision_id, installed_on, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_support_revision_id, owning_spool_revision_id, installed_on,
    claim.receipt_id, auth.uid()
  )
  on conflict (support_revision_id) do update set installed_on = excluded.installed_on
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'support_progress_records', created.id,
    'record_support_progress', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', created.id));
  end if;

  return created;
end;
$$;

create or replace function public.record_pwht_result(
  target_requirement_id uuid,
  chart_number text,
  performed_on date,
  outcome text,
  idempotency_key text default null
)
returns public.pwht_results
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requirement public.pwht_requirements;
  ctx public.spool_context;
  claim record;
  created public.pwht_results;
begin
  select * into requirement from public.pwht_requirements where id = target_requirement_id;
  if requirement.id is null then
    raise exception 'The PWHT requirement was not found' using errcode = 'PQC30';
  end if;

  ctx := public.assert_construction_target(
    requirement.spool_revision_id, 'fabrication.qc.release');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_pwht_result', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.pwht_results
    where id = (claim.replayed_result ->> 'result_id')::uuid;
    return created;
  end if;

  if coalesce(trim(chart_number), '') = '' then
    raise exception 'A PWHT chart number is required' using errcode = '23514';
  end if;
  if outcome not in ('accepted', 'rejected') then
    raise exception 'A PWHT outcome must be accepted or rejected' using errcode = '23514';
  end if;

  insert into public.pwht_results (
    pwht_requirement_id, chart_number, performed_on, outcome, receipt_id, recorded_by
  )
  values (
    target_requirement_id, trim(chart_number), performed_on, outcome,
    claim.receipt_id, auth.uid()
  )
  returning * into created;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'pwht_results', created.id,
    'record_pwht_result', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('result_id', created.id));
  end if;

  return created;
end;
$$;

-- Dossier 16.7 and 30 prohibition 8. Four gates, each with its own message.
create or replace function public.release_quality_record(
  target_spool_revision_id uuid,
  released_on date,
  qc13_form_id uuid default null,
  comment text default null,
  idempotency_key text default null
)
returns public.quality_release_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  readiness public.spool_fabrication_readiness;
  created public.quality_release_records;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.qc.release');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'release_quality_record', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.quality_release_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return created;
  end if;

  select * into readiness from public.spool_fabrication_readiness
  where spool_revision_id = target_spool_revision_id;

  if not readiness.is_material_checked then
    raise exception 'Material check is incomplete: % of % bill lines traced',
      readiness.line_checked, readiness.line_total
      using errcode = 'PQC32';
  end if;
  if readiness.weld_complete < readiness.weld_total then
    raise exception 'Welding is incomplete: % of % joints welded',
      readiness.weld_complete, readiness.weld_total
      using errcode = 'PQC32';
  end if;
  if readiness.support_recorded < readiness.support_total then
    raise exception 'Supports are incomplete: % of % installed',
      readiness.support_recorded, readiness.support_total
      using errcode = 'PQC32';
  end if;
  if readiness.nde_pending > 0 then
    raise exception '% NDE obligations on this spool are still outstanding',
      readiness.nde_pending
      using errcode = 'PQC37';
  end if;
  if readiness.pwht_pending > 0 then
    raise exception '% joints still need an accepted PWHT result', readiness.pwht_pending
      using errcode = 'PQC37';
  end if;

  if released_on is null then
    raise exception 'A release date is required' using errcode = '23514';
  end if;
  if released_on < readiness.fabricated_on then
    raise exception 'The release date cannot precede the fabrication completion date'
      using errcode = 'PQC32';
  end if;

  insert into public.quality_release_records (
    project_id, spool_revision_id, released_on, released_by, qc13_form_id,
    weld_count, obligation_count, comment, receipt_id
  )
  values (
    ctx.project_id, target_spool_revision_id, released_on, auth.uid(), qc13_form_id,
    readiness.weld_total,
    (select count(*)::int from public.nde_obligations
     where spool_revision_id = target_spool_revision_id),
    comment, claim.receipt_id
  )
  returning * into created;

  insert into public.construction_progress_events (
    project_id, spool_revision_id, phase, stage, occurred_on,
    source_record_type, source_record_id, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, 'fabrication', 'qc_release', released_on,
    'quality_release', created.id, claim.receipt_id, auth.uid()
  );

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'quality_release_records', created.id,
    'release_quality_record', to_jsonb(readiness), to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', created.id));
  end if;

  return created;
end;
$$;

-- Dossier 16.8. DFT is captured through the W10P, so the form number is mandatory once a
-- measurement exists, and the measurement must clear the snapshot requirement.
create or replace function public.record_paint_progress(
  target_spool_revision_id uuid,
  line_service_id uuid,
  details jsonb default '{}'::jsonb,
  idempotency_key text default null
)
returns public.paint_progress_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  rule public.project_paint_matrix_rules;
  created public.paint_progress_records;
  sent_on date;
  painted_on date;
  final_qc_on date;
  measured numeric;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_paint_progress', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.paint_progress_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return created;
  end if;

  sent_on := public.effective_stage_date(target_spool_revision_id, 'fabrication', 'sent_to_paint');
  if sent_on is null then
    raise exception 'Record Sent to Paint before recording painting activities'
      using errcode = 'PQC32';
  end if;

  select * into rule from public.project_paint_matrix_rules
  where project_id = ctx.project_id and project_paint_matrix_rules.line_service_id = record_paint_progress.line_service_id
    and status = 'active';

  if rule.id is null then
    raise exception 'No active paint matrix rule exists for that line service'
      using errcode = 'PQC39';
  end if;

  painted_on := nullif(details ->> 'painted_on', '')::date;
  final_qc_on := nullif(details ->> 'final_qc_on', '')::date;
  measured := nullif(details ->> 'measured_dft_microns', '')::numeric;

  if painted_on is not null and painted_on < sent_on then
    raise exception 'The painted date cannot precede the Sent to Paint date' using errcode = 'PQC32';
  end if;
  if final_qc_on is not null and painted_on is null then
    raise exception 'Record the painted date before the final QC date' using errcode = 'PQC32';
  end if;
  if measured is not null then
    if coalesce(trim(details ->> 'w10p_form_number'), '') = '' then
      raise exception 'A DFT measurement requires the W10P form number' using errcode = '23514';
    end if;
    if measured < rule.required_final_dft_microns then
      raise exception 'The measured DFT of % microns is below the required % microns',
        measured, rule.required_final_dft_microns
        using errcode = '23514';
    end if;
  end if;

  insert into public.paint_progress_records (
    project_id, spool_revision_id, line_service_id, paint_matrix_rule_id, ral_code_id,
    required_final_dft_microns, measured_dft_microns, blasting_on, primer_on,
    intermediate_coats, final_coats, w10p_form_number, painted_on, final_qc_on,
    receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, line_service_id, rule.id, rule.ral_code_id,
    rule.required_final_dft_microns, measured,
    nullif(details ->> 'blasting_on', '')::date,
    nullif(details ->> 'primer_on', '')::date,
    nullif(details ->> 'intermediate_coats', '')::smallint,
    nullif(details ->> 'final_coats', '')::smallint,
    nullif(details ->> 'w10p_form_number', ''),
    painted_on, final_qc_on, claim.receipt_id, auth.uid()
  )
  on conflict (spool_revision_id) do update
    set line_service_id = excluded.line_service_id,
        paint_matrix_rule_id = excluded.paint_matrix_rule_id,
        ral_code_id = excluded.ral_code_id,
        required_final_dft_microns = excluded.required_final_dft_microns,
        measured_dft_microns = excluded.measured_dft_microns,
        blasting_on = excluded.blasting_on,
        primer_on = excluded.primer_on,
        intermediate_coats = excluded.intermediate_coats,
        final_coats = excluded.final_coats,
        w10p_form_number = excluded.w10p_form_number,
        painted_on = excluded.painted_on,
        final_qc_on = excluded.final_qc_on,
        updated_at = timezone('utc', now())
  returning * into created;

  if painted_on is not null
     and public.effective_stage_date(
           target_spool_revision_id, 'fabrication', 'painted') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on,
      source_record_type, source_record_id, receipt_id, recorded_by
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'painted', painted_on,
            'paint', created.id, claim.receipt_id, auth.uid());
  end if;

  if final_qc_on is not null
     and public.effective_stage_date(
           target_spool_revision_id, 'fabrication', 'final_qc') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on,
      source_record_type, source_record_id, receipt_id, recorded_by
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'final_qc', final_qc_on,
            'paint', created.id, claim.receipt_id, auth.uid());
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'paint_progress_records', created.id,
    'record_paint_progress', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', created.id));
  end if;

  return created;
end;
$$;

create or replace function public.record_laydown(
  target_spool_revision_id uuid,
  location_id uuid,
  stored_on date,
  idempotency_key text default null
)
returns public.laydown_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ctx public.spool_context;
  claim record;
  created public.laydown_records;
  final_qc_on date;
begin
  ctx := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');

  select * into claim
  from public.claim_command_receipt(ctx.project_id, 'record_laydown', idempotency_key);

  if claim.replayed_result is not null then
    select * into created from public.laydown_records
    where id = (claim.replayed_result ->> 'record_id')::uuid;
    return created;
  end if;

  final_qc_on := public.effective_stage_date(target_spool_revision_id, 'fabrication', 'final_qc');
  if final_qc_on is null then
    raise exception 'Record the final QC before moving the spool to laydown'
      using errcode = 'PQC32';
  end if;
  if stored_on < final_qc_on then
    raise exception 'The laydown date cannot precede the final QC date' using errcode = 'PQC32';
  end if;
  if not exists (
    select 1 from public.project_locations location
    where location.id = location_id and location.project_id = ctx.project_id
      and location.status = 'active'
  ) then
    raise exception 'That laydown location does not belong to this project' using errcode = 'PQC30';
  end if;

  insert into public.laydown_records (
    project_id, spool_revision_id, location_id, stored_on, receipt_id, recorded_by
  )
  values (
    ctx.project_id, target_spool_revision_id, location_id, stored_on, claim.receipt_id, auth.uid()
  )
  on conflict (spool_revision_id) do update
    set location_id = excluded.location_id, stored_on = excluded.stored_on
  returning * into created;

  if public.effective_stage_date(target_spool_revision_id, 'fabrication', 'laydown') is null then
    insert into public.construction_progress_events (
      project_id, spool_revision_id, phase, stage, occurred_on,
      source_record_type, source_record_id, receipt_id, recorded_by
    )
    values (ctx.project_id, target_spool_revision_id, 'fabrication', 'laydown', stored_on,
            'laydown', created.id, claim.receipt_id, auth.uid());
  end if;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    ctx.project_id, auth.uid(), 'laydown_records', created.id,
    'record_laydown', null, to_jsonb(created)
  );

  if claim.receipt_id is not null then
    perform public.complete_command_receipt(
      claim.receipt_id, jsonb_build_object('record_id', created.id));
  end if;

  return created;
end;
$$;

-- RLS and grants ---------------------------------------------------------------

alter table public.support_progress_records enable row level security;
alter table public.pwht_results enable row level security;
alter table public.quality_release_records enable row level security;
alter table public.paint_progress_records enable row level security;
alter table public.laydown_records enable row level security;

create policy "read support progress" on public.support_progress_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read pwht results" on public.pwht_results
  for select to authenticated
  using (
    exists (
      select 1 from public.pwht_requirements requirement
      where requirement.id = pwht_results.pwht_requirement_id
        and (public.current_user_has_capability(requirement.project_id, 'fabrication.view')
             or public.current_user_has_capability(requirement.project_id, 'nde.view'))
    )
  );

create policy "read quality release records" on public.quality_release_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read paint progress" on public.paint_progress_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

create policy "read laydown records" on public.laydown_records
  for select to authenticated
  using (public.current_user_has_capability(project_id, 'fabrication.view'));

grant select on
  public.support_progress_records,
  public.pwht_results,
  public.quality_release_records,
  public.paint_progress_records,
  public.laydown_records,
  public.spool_fabrication_readiness
to authenticated;

revoke insert, update, delete, truncate on
  public.support_progress_records,
  public.pwht_results,
  public.quality_release_records,
  public.paint_progress_records,
  public.laydown_records
from authenticated, anon;

revoke all on function
  public.record_support_progress(uuid, date, text),
  public.record_pwht_result(uuid, text, date, text, text),
  public.release_quality_record(uuid, date, uuid, text, text),
  public.record_paint_progress(uuid, uuid, jsonb, text),
  public.record_laydown(uuid, uuid, date, text)
from public, anon;

grant execute on function
  public.record_support_progress(uuid, date, text),
  public.record_pwht_result(uuid, text, date, text, text),
  public.release_quality_record(uuid, date, uuid, text, text),
  public.record_paint_progress(uuid, uuid, jsonb, text),
  public.record_laydown(uuid, uuid, date, text)
to authenticated;
```

- [ ] **Step 3: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error. A failure on `record_paint_progress` naming the ambiguous `line_service_id` means the qualified form `project_paint_matrix_rules.line_service_id = record_paint_progress.line_service_id` was not copied verbatim — fix that rather than renaming the column.

- [ ] **Step 4: Write the release pgTAP file — the full golden path plus every block.**

Create `supabase/tests/database/052_fabrication_release.test.sql`:

```sql
begin;
select plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000521', 'authenticated', 'authenticated', 'rel.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000522', 'authenticated', 'authenticated', 'rel.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000521';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000521', 'REL-A', 'Release A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000521');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '10000000-0000-0000-0000-000000000522', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, name)
values ('50000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SUB-1', 'Fab Sub 1');
insert into public.project_service_classes (id, project_id, code, description)
values ('51000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SC-1', 'Service class 1');
insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'BW', 'Butt weld');
insert into public.system_reference_entries (id, kind, code, label)
values ('53000000-0000-0000-0000-000000000521', 'material_type', 'CS2', 'Carbon steel 2')
on conflict do nothing;
insert into public.project_spooling_material_types (id, project_id, code, description)
values ('54000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'CS2', 'Carbon steel 2');
insert into public.project_spooling_material_classes (id, project_id, external_class_code, material_type_id)
values ('55000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'A1',
        '54000000-0000-0000-0000-000000000521');
insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '50000000-0000-0000-0000-000000000521', '53000000-0000-0000-0000-000000000521',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');
insert into public.welder_qualifications (id, project_id, subcontractor_id, welder_code, full_name, expires_on)
values
  ('57000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
   '50000000-0000-0000-0000-000000000521', 'W-1', 'Welder One', date '2027-01-01'),
  ('57000000-0000-0000-0000-000000000522', '30000000-0000-0000-0000-000000000521',
   '50000000-0000-0000-0000-000000000521', 'W-2', 'Welder Two', date '2027-01-01');
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values
  ('57000000-0000-0000-0000-000000000521', '56000000-0000-0000-0000-000000000521'),
  ('57000000-0000-0000-0000-000000000522', '56000000-0000-0000-0000-000000000521');

-- RT 100 only, no PWHT: the shortest complete path
insert into public.nde_matrix_rules (
  id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, pwht_required)
values ('58000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '51000000-0000-0000-0000-000000000521', '52000000-0000-0000-0000-000000000521',
        'shop', 100, false);

insert into public.project_line_services (id, project_id, code, description)
values ('59000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'LS-1', 'Line service 1');
insert into public.project_ral_codes (id, project_id, line_service_id, color_code, ral_code)
values ('5a000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '59000000-0000-0000-0000-000000000521', 'GREY', 'RAL7035');
insert into public.project_paint_matrix_rules (
  id, project_id, line_service_id, ral_code_id, blasting_required, primer_required,
  intermediate_coat_count, final_coat_count, required_final_dft_microns)
values ('5b000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '59000000-0000-0000-0000-000000000521', '5a000000-0000-0000-0000-000000000521',
        true, true, 1, 1, 240);
insert into public.project_location_categories (id, project_id, code, description)
values ('5c000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'YARD', 'Yard');
insert into public.project_locations (id, project_id, location_category_id, code, description)
values ('5d000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        '5c000000-0000-0000-0000-000000000521', 'YARD-1', 'Yard bay 1');

-- Definition graph: one spool, one weld, one support, two bill lines
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'ISO-0521');
insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SP-0521-A');
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'W-0521-01');
insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521', 'SUP-0521-01');
insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000521', '40000000-0000-0000-0000-000000000521', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000521', now());
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000521', '41000000-0000-0000-0000-000000000521',
        '42000000-0000-0000-0000-000000000521', 1, 'A1');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000521', '46000000-0000-0000-0000-000000000521',
        '43000000-0000-0000-0000-000000000521', '52000000-0000-0000-0000-000000000521', 'shop', 6, 8);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000521', '47000000-0000-0000-0000-000000000521', 'root', 1),
  ('48000000-0000-0000-0000-000000000522', '47000000-0000-0000-0000-000000000521', 'cap', 2);
insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000521', '49000000-0000-0000-0000-000000000521',
        '43000000-0000-0000-0000-000000000521', 'shoe', 1);
insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000521', '43000000-0000-0000-0000-000000000521',
        'IDN-100', 3, 'm', 'HEAT-100');
insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000521', '30000000-0000-0000-0000-000000000521',
        'MRR-1', 'IDN-100', 'HEAT-100');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000522', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000522","role":"authenticated"}', true);

select has_view('public', 'spool_fabrication_readiness', 'the readiness view exists');

-- Nothing done yet
select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  false,
  'an untouched spool is not fabricated'
);
select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10')$$,
  'PQC32', null,
  'QC release is refused while material check is incomplete'
);

-- Walk the golden path
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000521', 'fabrication', 'start_fab', date '2026-08-04');
select public.record_material_check(
  '43000000-0000-0000-0000-000000000521', date '2026-08-05',
  '[{"ident_code":"IDN-100","trace_number":"HEAT-100","quantity":3}]'::jsonb);
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000521',
  '50000000-0000-0000-0000-000000000521',
  '56000000-0000-0000-0000-000000000521',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000521",
     "completion_percent":50,"welded_on":"2026-08-06"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000522",
     "completion_percent":50,"welded_on":"2026-08-06"}]'::jsonb,
  '{"weld_on":"2026-08-06"}'::jsonb);
select public.record_support_progress('4a000000-0000-0000-0000-000000000521', date '2026-08-07');

select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  true,
  'material check, welds and supports derive Fabricated'
);
select is(
  (select fabricated_on from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  date '2026-08-07',
  'the fabrication date is the latest of its three inputs'
);
select is(
  (select is_releasable from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  false,
  'a fabricated spool with a pending obligation is not releasable'
);

-- Dossier 30 prohibition 8
select throws_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10')$$,
  'PQC37', null,
  'QC release is refused while an NDE obligation is outstanding'
);

select public.record_nde_obligation_outcome(
  (select id from public.nde_obligations
   where spool_revision_id = '43000000-0000-0000-0000-000000000521' and method = 'rt'),
  'satisfied');

select is(
  (select is_releasable from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  true,
  'satisfying the obligation makes the spool releasable'
);

select lives_ok(
  $$select public.release_quality_record(
      '43000000-0000-0000-0000-000000000521', date '2026-08-10', null, 'Released')$$,
  'the spool is QC released'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000521', 'fabrication', 'qc_release'),
  date '2026-08-10',
  'the release wrote its own ledger event'
);

-- Paint follows Sent to Paint, and nothing else
select throws_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12"}'::jsonb)$$,
  'PQC32', null,
  'painting is refused before Sent to Paint'
);

select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000521', 'fabrication', 'sent_to_paint', date '2026-08-11');

select throws_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12","measured_dft_microns":200,"w10p_form_number":"W10P-1"}'::jsonb)$$,
  '23514', null,
  'a DFT below the paint matrix requirement is refused'
);

select lives_ok(
  $$select public.record_paint_progress(
      '43000000-0000-0000-0000-000000000521', '59000000-0000-0000-0000-000000000521',
      '{"painted_on":"2026-08-12","final_qc_on":"2026-08-13","measured_dft_microns":260,
        "w10p_form_number":"W10P-1","intermediate_coats":1,"final_coats":1}'::jsonb)$$,
  'painting with a compliant DFT is accepted'
);
select is(
  (select required_final_dft_microns from public.paint_progress_records
   where spool_revision_id = '43000000-0000-0000-0000-000000000521'),
  240::numeric,
  'the paint record snapshots the DFT requirement'
);

select lives_ok(
  $$select public.record_laydown(
      '43000000-0000-0000-0000-000000000521', '5d000000-0000-0000-0000-000000000521',
      date '2026-08-14')$$,
  'the spool reaches laydown'
);
select is(
  public.effective_stage_date(
    '43000000-0000-0000-0000-000000000521', 'fabrication', 'laydown'),
  date '2026-08-14',
  'the whole fabrication path is on the ledger'
);

-- A superseded revision accepts nothing
update public.isometric_revisions set status = 'superseded', superseded_at = now()
where id = '42000000-0000-0000-0000-000000000521';

select throws_ok(
  $$select public.record_construction_progress(
      '43000000-0000-0000-0000-000000000521', 'fabrication', 'start_fab', date '2026-08-15')$$,
  'PQC31', null,
  'a superseded revision refuses new progress'
);

select * from finish();
rollback;
```

- [ ] **Step 5: Run the release pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/052_fabrication_release.test.sql
```

Expected: 17 of 17 assertions pass.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20260804093000_fabrication_release.sql \
        supabase/tests/database/052_fabrication_release.test.sql
git commit -m "feat(construction): derive fabrication completion and gate QC release on NDE and PWHT"
```

## Task 7: The construction read model

**Files:**
- Create: `supabase/migrations/20260804094000_construction_projections.sql`
- Create: `supabase/tests/database/053_construction_projections.test.sql`

**Interfaces:**
- Produces: views `public.spool_stage_events`, `public.spool_progress_dates`, `public.spool_construction_status`, `public.weld_progress_summary`.
- `spool_construction_status` columns consumed by the UI: `spool_revision_id`, `project_id`, `iso_number`, `spool_number`, `pds_area_id`, `revision_number`, `start_fab_on`, `material_check_on`, `fabricated_on`, `qc_release_on`, `sent_to_paint_on`, `painted_on`, `final_qc_on`, `laydown_on`, `current_stage`, `is_fabricated`, `is_releasable`, `nde_pending`, `pwht_pending`.
- `weld_progress_summary` columns: `weld_joint_revision_id`, `project_id`, `spool_revision_id`, `weld_number`, `spool_number`, `weld_location`, `diameter_inch`, `thickness_mm`, `wps_code`, `welders`, `weld_on`, `is_locked`, `obligation_total`, `obligation_pending`, `pwht_required`, `pwht_accepted`.

- [ ] **Step 1: Write the migration.**

Create `supabase/migrations/20260804094000_construction_projections.sql`:

```sql
-- Track 05: the construction read model.
-- Every view is security_invoker, so a reader sees exactly the rows their capabilities and
-- PDS scope allow. Nothing here is a source of truth; drop and rebuild freely.

-- A surviving event is one no compensating event has cancelled. effective_stage_date()
-- in migration 090000 applies the same predicate for the single-value case.
create view public.spool_stage_events with (security_invoker = true) as
select event.*
from public.construction_progress_events event
where event.is_compensating = false
  and not exists (
    select 1 from public.construction_progress_events cancel
    where cancel.is_compensating and cancel.compensates_event_id = event.id
  );

create view public.spool_progress_dates with (security_invoker = true) as
select
  spool_revision_id,
  max(occurred_on) filter (where stage = 'start_fab') as start_fab_on,
  max(occurred_on) filter (where stage = 'material_check') as material_check_on,
  max(occurred_on) filter (where stage = 'qc_release') as qc_release_on,
  max(occurred_on) filter (where stage = 'sent_to_paint') as sent_to_paint_on,
  max(occurred_on) filter (where stage = 'painted') as painted_on,
  max(occurred_on) filter (where stage = 'final_qc') as final_qc_on,
  max(occurred_on) filter (where stage = 'laydown') as laydown_on
from public.spool_stage_events
where phase = 'fabrication'
group by spool_revision_id;

create view public.spool_construction_status with (security_invoker = true) as
select
  sr.id as spool_revision_id,
  iso.project_id,
  iso.iso_number,
  spool.spool_number,
  rev.revision_number,
  rev.pds_area_id,
  dates.start_fab_on,
  dates.material_check_on,
  readiness.fabricated_on,
  dates.qc_release_on,
  dates.sent_to_paint_on,
  dates.painted_on,
  dates.final_qc_on,
  dates.laydown_on,
  readiness.is_fabricated,
  readiness.is_releasable,
  readiness.line_total,
  readiness.line_checked,
  readiness.weld_total,
  readiness.weld_complete,
  readiness.support_total,
  readiness.support_recorded,
  readiness.nde_pending,
  readiness.pwht_pending,
  case
    when dates.laydown_on is not null then 'laydown'
    when dates.final_qc_on is not null then 'final_qc'
    when dates.painted_on is not null then 'painted'
    when dates.sent_to_paint_on is not null then 'sent_to_paint'
    when dates.qc_release_on is not null then 'qc_release'
    when readiness.is_fabricated then 'fabricated'
    when dates.material_check_on is not null then 'material_check'
    when dates.start_fab_on is not null then 'start_fab'
  end::public.construction_stage as current_stage
from public.spool_revisions sr
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
join public.spools spool on spool.id = sr.spool_id
join public.spool_fabrication_readiness readiness on readiness.spool_revision_id = sr.id
left join public.spool_progress_dates dates on dates.spool_revision_id = sr.id
where not sr.is_removed;

create view public.weld_progress_summary with (security_invoker = true) as
select
  wjr.id as weld_joint_revision_id,
  iso.project_id,
  wjr.spool_revision_id,
  wj.weld_number,
  spool.spool_number,
  wjr.weld_location,
  wjr.diameter_inch,
  wjr.thickness_mm,
  wps.code as wps_code,
  welders.welder_codes as welders,
  progress.weld_on,
  coalesce(progress.is_locked, false) as is_locked,
  obligations.obligation_total,
  obligations.obligation_pending,
  (requirement.id is not null) as pwht_required,
  (accepted.id is not null) as pwht_accepted
from public.weld_joint_revisions wjr
join public.spool_revisions sr on sr.id = wjr.spool_revision_id
join public.spools spool on spool.id = sr.spool_id
join public.isometric_revisions rev on rev.id = sr.isometric_revision_id
join public.isometrics iso on iso.id = rev.isometric_id
join public.weld_joints wj on wj.id = wjr.weld_joint_id
left join public.weld_progress_records progress on progress.weld_joint_revision_id = wjr.id
left join public.project_welding_procedures wps on wps.id = progress.welding_procedure_id
left join public.pwht_requirements requirement on requirement.weld_joint_revision_id = wjr.id
left join public.pwht_results accepted
  on accepted.pwht_requirement_id = requirement.id and accepted.outcome = 'accepted'
cross join lateral (
  select array_agg(qualification.welder_code order by assignment.point_type) as welder_codes
  from public.weld_point_assignments assignment
  join public.welder_qualifications qualification
    on qualification.id = assignment.welder_qualification_id
  where assignment.weld_progress_record_id = progress.id
) welders
cross join lateral (
  select
    count(*)::int as obligation_total,
    count(*) filter (where obligation.disposition = 'pending')::int as obligation_pending
  from public.nde_obligations obligation
  where obligation.weld_joint_revision_id = wjr.id
) obligations
where not wjr.is_removed;

grant select on
  public.spool_stage_events,
  public.spool_progress_dates,
  public.spool_construction_status,
  public.weld_progress_summary
to authenticated;
```

- [ ] **Step 2: Apply the migration from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```

Expected: applied with no error.

- [ ] **Step 3: Write the projection pgTAP file.**

Create `supabase/tests/database/053_construction_projections.test.sql`. It reuses the Task 6 fixture verbatim through the `record_laydown` call, so copy the fixture block from `052_fabrication_release.test.sql` — everything from the first `insert into auth.users` to the `set_config` calls — replacing the id suffix `521`/`522` with `531`/`532` and the activity code `REL-A` with `PRJ-A`. Then walk the same golden path and assert the projection:

```sql
begin;
select plan(10);

-- <fixture block copied from 052 with the 531/532 id suffix and activity_code 'PRJ-A'>

select has_view('public', 'spool_construction_status', 'the status projection exists');
select has_view('public', 'weld_progress_summary', 'the weld projection exists');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  null,
  'a spool with no events has no current stage'
);

select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000531', 'fabrication', 'start_fab', date '2026-08-04');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  'start_fab'::public.construction_stage,
  'the current stage follows the ledger'
);

select public.record_material_check(
  '43000000-0000-0000-0000-000000000531', date '2026-08-05',
  '[{"ident_code":"IDN-100","trace_number":"HEAT-100","quantity":3}]'::jsonb);
select public.record_weld_progress(
  '47000000-0000-0000-0000-000000000531',
  '50000000-0000-0000-0000-000000000531',
  '56000000-0000-0000-0000-000000000531',
  '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000531",
     "completion_percent":50,"welded_on":"2026-08-06"},
    {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000532",
     "completion_percent":50,"welded_on":"2026-08-06"}]'::jsonb,
  '{"weld_on":"2026-08-06"}'::jsonb);
select public.record_support_progress('4a000000-0000-0000-0000-000000000531', date '2026-08-07');

select is(
  (select current_stage from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  'fabricated'::public.construction_stage,
  'Fabricated appears in the projection without any event row'
);
select is(
  (select count(*)::int from public.construction_progress_events
   where spool_revision_id = '43000000-0000-0000-0000-000000000531' and stage = 'fabricated'),
  0,
  'no fabricated event was ever written'
);

select is(
  (select array_length(welders, 1) from public.weld_progress_summary
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000531'),
  2,
  'the weld projection lists both welders'
);
select is(
  (select obligation_pending from public.weld_progress_summary
   where weld_joint_revision_id = '47000000-0000-0000-0000-000000000531'),
  1,
  'the weld projection counts the outstanding obligation'
);

-- A compensating event cancels its target
select public.record_construction_progress(
  '43000000-0000-0000-0000-000000000531', 'fabrication', 'start_fab', date '2026-08-01');
insert into public.construction_progress_events (
  project_id, spool_revision_id, phase, stage, occurred_on, is_compensating, compensates_event_id)
select project_id, spool_revision_id, phase, stage, occurred_on, true, id
from public.construction_progress_events
where spool_revision_id = '43000000-0000-0000-0000-000000000531'
  and stage = 'start_fab' and occurred_on = date '2026-08-01';

select is(
  (select start_fab_on from public.spool_progress_dates
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  date '2026-08-04',
  'a compensated event no longer contributes to the projection'
);

select is(
  (select count(*)::int from public.spool_construction_status
   where spool_revision_id = '43000000-0000-0000-0000-000000000531'),
  1,
  'the status projection returns one row per spool revision'
);

select * from finish();
rollback;
```

Note: the compensating insert runs as `postgres` because pgTAP files start unprivileged only after the `set local role authenticated` call — place this block **after** a `reset role;` line, then restore the authenticated session with the same three `set_config` lines before the final assertions. Writing a compensating event from SQL is a fixture shortcut; there is no Track 05 command for it, which is deliberate — the compensating command belongs to Track 08 with the tracking corrections.

- [ ] **Step 4: Run the projection pgTAP file.**

Run:
```bash
/opt/homebrew/bin/supabase test db --file supabase/tests/database/053_construction_projections.test.sql
```

Expected: 10 of 10 assertions pass.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260804094000_construction_projections.sql \
        supabase/tests/database/053_construction_projections.test.sql
git commit -m "feat(construction): add the fabrication read model"
```

## Task 8: Regenerate database types and close Gate A

**Files:**
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Reset and regenerate.**

Run:
```bash
/opt/homebrew/bin/supabase db reset \
  && /opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

Expected: the file is rewritten with no error.

- [ ] **Step 2: Verify the new surface is present.**

Run:
```bash
rg -n "record_material_check|record_weld_progress|release_quality_record|record_paint_progress|record_laydown|record_support_progress|record_pwht_result|correct_weld_progress|record_nde_obligation_outcome|materialize_progress_copies|request_qc13_form|spool_construction_status|spool_fabrication_readiness|weld_progress_summary" lib/supabase/database.types.ts | wc -l
```

Expected: a non-zero count covering every name. If any RPC is missing, it was not granted to `authenticated` — fix the grant in a new migration rather than hand-editing the types.

- [ ] **Step 3: Run the whole database suite.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```

Expected: every pgTAP file passes, including the Track 01–04 files. Record the actual file and assertion counts in the Gate A checklist below.

- [ ] **Step 4: Typecheck.**

Run:
```bash
npm run typecheck
```

Expected: exit `0`. The regenerated types must not break any Track 01–04 code.

- [ ] **Step 5: Commit.**

```bash
git add lib/supabase/database.types.ts
git commit -m "feat(types): regenerate database types for Track 05 construction"
```

### Gate A checklist

- [ ] `/opt/homebrew/bin/supabase db reset` succeeds from empty.
- [ ] `/opt/homebrew/bin/supabase test db` passes. Actual: ___ pgTAP files, ___ assertions.
- [ ] `npm run typecheck` exits `0`.
- [ ] No table created in this gate grants `insert`, `update` or `delete` to `authenticated`.

# Gate B — Construction domain

Every module in this gate is pure TypeScript. It imports nothing from `@supabase/*`, nothing from `react`, and nothing from `store/*`. Tests are bare `node:assert/strict` assertions at module top level, matching `modules/access/domain/*.test.ts`, and run through `npm run test:unit`.

## Task 9: Phases, stages and the predecessor policy

**Files:**
- Create: `modules/construction/domain/construction-phase.ts`
- Create: `modules/construction/domain/construction-phase.test.ts`

**Interfaces:**
- Produces: `CONSTRUCTION_PHASES`, `ConstructionPhase`, `CONSTRUCTION_STAGES`, `ConstructionStage`, `stageLabel(stage)`, `stageOrdinal(stage)`, `DERIVED_STAGES`, `isDerivedStage(stage)`, `isRecordableStage(stage)`, `predecessorOf(stage)`, `type StageDates = Partial<Record<ConstructionStage, string | null>>`, `currentStage(dates, isFabricated)`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/domain/construction-phase.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  CONSTRUCTION_PHASES,
  CONSTRUCTION_STAGES,
  currentStage,
  isDerivedStage,
  isRecordableStage,
  predecessorOf,
  stageLabel,
  stageOrdinal,
} from "./construction-phase"

assert.deepEqual(CONSTRUCTION_PHASES, ["fabrication", "assembly", "erection"])
assert.equal(CONSTRUCTION_STAGES.length, 8)
assert.equal(CONSTRUCTION_STAGES[0], "start_fab")
assert.equal(CONSTRUCTION_STAGES[7], "laydown")

assert.equal(stageLabel("start_fab"), "Start Fab")
assert.equal(stageLabel("qc_release"), "QC Release")
assert.equal(stageOrdinal("fabricated"), 3)
assert.ok(stageOrdinal("laydown") > stageOrdinal("final_qc"))

// Plan section 3.3: only two stages are free-standing user decisions.
assert.equal(isRecordableStage("start_fab"), true)
assert.equal(isRecordableStage("sent_to_paint"), true)
assert.equal(isRecordableStage("qc_release"), false)
assert.equal(isRecordableStage("fabricated"), false)

// Fabricated has no event row at all; the other two have an owning command.
assert.equal(isDerivedStage("fabricated"), true)
assert.equal(isDerivedStage("material_check"), false)

assert.equal(predecessorOf("start_fab"), null)
assert.equal(predecessorOf("qc_release"), "fabricated")
assert.equal(predecessorOf("laydown"), "final_qc")

assert.equal(currentStage({}, false), null)
assert.equal(currentStage({ start_fab: "2026-08-04" }, false), "start_fab")
assert.equal(
  currentStage({ start_fab: "2026-08-04", material_check: "2026-08-05" }, true),
  "fabricated",
)
assert.equal(
  currentStage({ start_fab: "2026-08-04", qc_release: "2026-08-10" }, true),
  "qc_release",
)
// A null date is not a recorded stage.
assert.equal(currentStage({ start_fab: "2026-08-04", laydown: null }, false), "start_fab")
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/domain/construction-phase.test.ts`

Expected: FAIL — `Cannot find module './construction-phase'`.

- [ ] **Step 3: Write the module.**

Create `modules/construction/domain/construction-phase.ts`:

```typescript
export const CONSTRUCTION_PHASES = ["fabrication", "assembly", "erection"] as const
export type ConstructionPhase = (typeof CONSTRUCTION_PHASES)[number]

/** Dossier 16.2, in order. The ordinal of a stage is its index plus one. */
export const CONSTRUCTION_STAGES = [
  "start_fab",
  "material_check",
  "fabricated",
  "qc_release",
  "sent_to_paint",
  "painted",
  "final_qc",
  "laydown",
] as const
export type ConstructionStage = (typeof CONSTRUCTION_STAGES)[number]

const STAGE_LABELS: Record<ConstructionStage, string> = {
  start_fab: "Start Fab",
  material_check: "Material Check",
  fabricated: "Fabricated",
  qc_release: "QC Release",
  sent_to_paint: "Sent to Paint",
  painted: "Painted",
  final_qc: "Final QC",
  laydown: "Laydown",
}

/**
 * Stages a user records directly. Everything else is written by the command that owns the
 * evidence, and `fabricated` is never written at all — see plan section 3.3.
 */
const RECORDABLE_STAGES: readonly ConstructionStage[] = ["start_fab", "sent_to_paint"]

/** Stages with no row anywhere: computed from the definition graph and the ledger. */
export const DERIVED_STAGES: readonly ConstructionStage[] = ["fabricated"]

export type StageDates = Partial<Record<ConstructionStage, string | null>>

export function stageLabel(stage: ConstructionStage): string {
  return STAGE_LABELS[stage]
}

export function stageOrdinal(stage: ConstructionStage): number {
  return CONSTRUCTION_STAGES.indexOf(stage) + 1
}

export function isRecordableStage(stage: ConstructionStage): boolean {
  return RECORDABLE_STAGES.includes(stage)
}

export function isDerivedStage(stage: ConstructionStage): boolean {
  return DERIVED_STAGES.includes(stage)
}

export function predecessorOf(stage: ConstructionStage): ConstructionStage | null {
  const index = CONSTRUCTION_STAGES.indexOf(stage)
  return index <= 0 ? null : CONSTRUCTION_STAGES[index - 1]
}

/**
 * The furthest stage the spool has reached. `isFabricated` is passed in rather than derived
 * from dates because it comes from `spool_fabrication_readiness`, not from the ledger.
 */
export function currentStage(
  dates: StageDates,
  isFabricated: boolean,
): ConstructionStage | null {
  for (let index = CONSTRUCTION_STAGES.length - 1; index >= 0; index -= 1) {
    const stage = CONSTRUCTION_STAGES[index]
    if (stage === "fabricated") {
      if (isFabricated) return stage
      continue
    }
    if (dates[stage]) return stage
  }
  return null
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/domain/construction-phase.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/domain/construction-phase.ts \
        modules/construction/domain/construction-phase.test.ts
git commit -m "feat(construction): model construction phases and the fabrication stage order"
```

## Task 10: Bill-of-materials reconciliation

**Files:**
- Create: `modules/construction/domain/material-check.ts`
- Create: `modules/construction/domain/material-check.test.ts`

**Interfaces:**
- Produces: `interface BillLine { spoolRevisionMaterialId: string; identCode: string; description: string | null; quantity: number | null; unit: string | null; expectedTraceNumber: string | null }`, `interface TraceEntry { identCode: string; traceNumber: string; quantity: number | null }`, `normalizeTrace(value)`, `reconcileMaterialCheck(lines, entries)` returning `MaterialCheckReconciliation`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/domain/material-check.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  normalizeTrace,
  reconcileMaterialCheck,
  type BillLine,
  type TraceEntry,
} from "./material-check"

const lines: BillLine[] = [
  {
    spoolRevisionMaterialId: "line-1",
    identCode: "IDN-100",
    description: "Pipe 6in",
    quantity: 3,
    unit: "m",
    expectedTraceNumber: "HEAT-100",
  },
  {
    spoolRevisionMaterialId: "line-2",
    identCode: "IDN-200",
    description: "Elbow 6in",
    quantity: 2,
    unit: "ea",
    expectedTraceNumber: null,
  },
]

assert.equal(normalizeTrace("  heat-100 "), "HEAT-100")

const empty = reconcileMaterialCheck(lines, [])
assert.equal(empty.isComplete, false)
assert.equal(empty.checkedCount, 0)
assert.deepEqual(empty.outstanding.map((line) => line.identCode), ["IDN-100", "IDN-200"])
assert.deepEqual(empty.unknownIdentCodes, [])

const partial = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: " heat-100 ", quantity: 3 },
])
assert.equal(partial.isComplete, false)
assert.equal(partial.checkedCount, 1)
assert.deepEqual(partial.outstanding.map((line) => line.identCode), ["IDN-200"])

const complete = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: "HEAT-100", quantity: 3 },
  { identCode: "IDN-200", traceNumber: "HEAT-200", quantity: 2 },
])
assert.equal(complete.isComplete, true)
assert.equal(complete.checkedCount, 2)
assert.deepEqual(complete.outstanding, [])

// An ident code outside the bill of materials is reported, not silently dropped.
const stray = reconcileMaterialCheck(lines, [
  { identCode: "IDN-999", traceNumber: "HEAT-999", quantity: 1 },
])
assert.deepEqual(stray.unknownIdentCodes, ["IDN-999"])
assert.equal(stray.isComplete, false)

// Two heats against one line still satisfy that line once.
const split = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: "HEAT-100", quantity: 1 },
  { identCode: "IDN-100", traceNumber: "HEAT-101", quantity: 2 },
  { identCode: "IDN-200", traceNumber: "HEAT-200", quantity: 2 },
])
assert.equal(split.checkedCount, 2)
assert.equal(split.isComplete, true)

// An empty bill of materials is never complete: dossier 16.4 needs traced material.
assert.equal(reconcileMaterialCheck([], []).isComplete, false)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/domain/material-check.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/domain/material-check.ts`:

```typescript
/** One line of the spool bill of materials, imported from `trace.txt` by Track 04. */
export interface BillLine {
  spoolRevisionMaterialId: string
  identCode: string
  description: string | null
  quantity: number | null
  unit: string | null
  expectedTraceNumber: string | null
}

/** One heat/trace transcribed from a returned QC-13. */
export interface TraceEntry {
  identCode: string
  traceNumber: string
  quantity: number | null
}

export interface MaterialCheckReconciliation {
  lineTotal: number
  checkedCount: number
  isComplete: boolean
  outstanding: BillLine[]
  unknownIdentCodes: string[]
}

export function normalizeTrace(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Dossier 16.4: Material Check is derived from valid traces, not entered as a date.
 * A line counts as checked as soon as one trace names its ident code — a single line may be
 * satisfied by several heats.
 */
export function reconcileMaterialCheck(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
): MaterialCheckReconciliation {
  const byIdentCode = new Map(lines.map((line) => [normalizeTrace(line.identCode), line]))
  const satisfied = new Set<string>()
  const unknown = new Set<string>()

  for (const entry of entries) {
    const identCode = normalizeTrace(entry.identCode)
    if (byIdentCode.has(identCode)) {
      satisfied.add(identCode)
    } else {
      unknown.add(entry.identCode.trim())
    }
  }

  const outstanding = lines.filter((line) => !satisfied.has(normalizeTrace(line.identCode)))

  return {
    lineTotal: lines.length,
    checkedCount: satisfied.size,
    isComplete: lines.length > 0 && outstanding.length === 0,
    outstanding,
    unknownIdentCodes: [...unknown],
  }
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/domain/material-check.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/domain/material-check.ts \
        modules/construction/domain/material-check.test.ts
git commit -m "feat(construction): reconcile material traces against the spool bill of materials"
```

## Task 11: Weld point allocation and qualification rules

**Files:**
- Create: `modules/construction/domain/weld-progress.ts`
- Create: `modules/construction/domain/weld-progress.test.ts`

**Interfaces:**
- Produces: `WELD_POINT_TYPES`, `WeldPointType`, `interface PointAssignment { pointType: WeldPointType; welderQualificationId: string; completionPercent: number; weldedOn: string }`, `interface JointDefinition { weldLocation: string; diameterInch: number | null; thicknessMm: number | null; availablePointTypes: WeldPointType[] }`, `interface WeldingProcedure { id: string; code: string; status: string; subcontractorId: string | null; materialTypeId: string; diameterFrom: number; diameterTo: number; thicknessFrom: number; thicknessTo: number; approvedOn: string }`, `interface WelderQualification { id: string; welderCode: string; status: string; subcontractorId: string; expiresOn: string; wpsIds: string[] }`, `validateAllocation(points, isWelded)`, `validateProcedure(procedure, joint, subcontractorId, weldOn)`, `validateWelder(welder, procedure, subcontractorId, weldedOn)`, `validateWeldProgress(input)` returning `ValidationIssue[]`.
- `interface ValidationIssue { field: string; message: string }` — an empty array means valid.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/domain/weld-progress.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  validateAllocation,
  validateProcedure,
  validateWeldProgress,
  validateWelder,
  type JointDefinition,
  type PointAssignment,
  type WelderQualification,
  type WeldingProcedure,
} from "./weld-progress"

const joint: JointDefinition = {
  weldLocation: "shop",
  diameterInch: 6,
  thicknessMm: 12,
  availablePointTypes: ["root", "cap"],
}

const wps: WeldingProcedure = {
  id: "wps-1",
  code: "WPS-1",
  status: "active",
  subcontractorId: "sub-1",
  materialTypeId: "mat-1",
  diameterFrom: 1,
  diameterTo: 12,
  thicknessFrom: 2,
  thicknessTo: 20,
  approvedOn: "2026-01-01",
}

const welderOne: WelderQualification = {
  id: "welder-1",
  welderCode: "W-1",
  status: "active",
  subcontractorId: "sub-1",
  expiresOn: "2027-01-01",
  wpsIds: ["wps-1"],
}

const welderTwo: WelderQualification = { ...welderOne, id: "welder-2", welderCode: "W-2" }

const points: PointAssignment[] = [
  { pointType: "root", welderQualificationId: "welder-1", completionPercent: 50, weldedOn: "2026-08-05" },
  { pointType: "cap", welderQualificationId: "welder-2", completionPercent: 50, weldedOn: "2026-08-05" },
]

// Dossier 7.3: Root + Cap = 100, Heat + Fill is 0 or 100, one welder per point.
assert.deepEqual(validateAllocation(points, true), [])
assert.deepEqual(validateAllocation([], false), [])
assert.equal(validateAllocation([], true).length, 1)
assert.equal(
  validateAllocation(
    [
      { ...points[0], completionPercent: 50 },
      { ...points[1], completionPercent: 70 },
    ],
    true,
  ).length,
  1,
)
assert.equal(
  validateAllocation(
    [
      ...points,
      { pointType: "hot", welderQualificationId: "welder-3", completionPercent: 40, weldedOn: "2026-08-05" },
    ],
    true,
  ).length,
  1,
)
assert.deepEqual(
  validateAllocation(
    [
      ...points,
      { pointType: "hot", welderQualificationId: "welder-3", completionPercent: 60, weldedOn: "2026-08-05" },
      { pointType: "fill", welderQualificationId: "welder-4", completionPercent: 40, weldedOn: "2026-08-05" },
    ],
    true,
  ),
  [],
)
// The second point requires a different welder.
assert.equal(
  validateAllocation(
    [points[0], { ...points[1], welderQualificationId: "welder-1" }],
    true,
  ).length,
  1,
)

// Dossier 11.6
assert.deepEqual(validateProcedure(wps, joint, "sub-1", "2026-08-05"), [])
assert.equal(validateProcedure({ ...wps, status: "archived" }, joint, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, { ...joint, diameterInch: 24 }, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, { ...joint, thicknessMm: 30 }, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, joint, "sub-2", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, joint, "sub-1", "2025-12-31").length, 1)

// Dossier 11.7 — expiry is checked against the point's own date.
assert.deepEqual(validateWelder(welderOne, wps, "sub-1", "2026-08-05"), [])
assert.equal(validateWelder({ ...welderOne, expiresOn: "2026-08-04" }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, wpsIds: [] }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, subcontractorId: "sub-2" }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, status: "inactive" }, wps, "sub-1", "2026-08-05").length, 1)

// The whole record
assert.deepEqual(
  validateWeldProgress({
    joint,
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }),
  [],
)
// Dossier 16.5: shop joints only.
assert.equal(
  validateWeldProgress({
    joint: { ...joint, weldLocation: "field" },
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }).length,
  1,
)
// A point the definition does not have.
assert.equal(
  validateWeldProgress({
    joint: { ...joint, availablePointTypes: ["root"] },
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }).length,
  1,
)
// Dossier 30 prohibition 4.
assert.equal(
  validateWeldProgress({
    joint,
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: true,
  }).length,
  1,
)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/domain/weld-progress.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/domain/weld-progress.ts`:

```typescript
export const WELD_POINT_TYPES = ["root", "hot", "fill", "cap"] as const
export type WeldPointType = (typeof WELD_POINT_TYPES)[number]

export interface ValidationIssue {
  field: string
  message: string
}

export interface PointAssignment {
  pointType: WeldPointType
  welderQualificationId: string
  completionPercent: number
  weldedOn: string
}

export interface JointDefinition {
  weldLocation: string
  diameterInch: number | null
  thicknessMm: number | null
  availablePointTypes: WeldPointType[]
}

export interface WeldingProcedure {
  id: string
  code: string
  status: string
  subcontractorId: string | null
  materialTypeId: string
  diameterFrom: number
  diameterTo: number
  thicknessFrom: number
  thicknessTo: number
  approvedOn: string
}

export interface WelderQualification {
  id: string
  welderCode: string
  status: string
  subcontractorId: string
  expiresOn: string
  wpsIds: string[]
}

export interface WeldProgressInput {
  joint: JointDefinition
  procedure: WeldingProcedure
  subcontractorId: string
  weldOn: string | null
  points: readonly PointAssignment[]
  welders: readonly WelderQualification[]
  isLocked: boolean
}

const sum = (points: readonly PointAssignment[], types: readonly WeldPointType[]): number =>
  points
    .filter((point) => types.includes(point.pointType))
    .reduce((total, point) => total + point.completionPercent, 0)

/**
 * Dossier 7.3. The totals only bind once the joint claims to be welded — a fit-up-only
 * record carries no points and stays valid.
 */
export function validateAllocation(
  points: readonly PointAssignment[],
  isWelded: boolean,
): ValidationIssue[] {
  if (!isWelded) return []

  const issues: ValidationIssue[] = []

  if (points.length === 0) {
    issues.push({ field: "points", message: "A welded joint needs at least one weld point." })
    return issues
  }

  const rootCap = sum(points, ["root", "cap"])
  if (rootCap !== 100) {
    issues.push({
      field: "points",
      message: `Root and Cap must total 100 percent, not ${rootCap}.`,
    })
  }

  const hotFill = sum(points, ["hot", "fill"])
  if (hotFill !== 0 && hotFill !== 100) {
    issues.push({
      field: "points",
      message: `Heat and Fill must total either 0 or 100 percent, not ${hotFill}.`,
    })
  }

  const welderIds = points.map((point) => point.welderQualificationId)
  if (new Set(welderIds).size !== welderIds.length) {
    issues.push({
      field: "points",
      message: "Each weld point of a joint needs a different welder.",
    })
  }

  const pointTypes = points.map((point) => point.pointType)
  if (new Set(pointTypes).size !== pointTypes.length) {
    issues.push({ field: "points", message: "A weld point can only be assigned once." })
  }

  return issues
}

/** Dossier 11.6. A WPS is a range qualification, not a code from a list. */
export function validateProcedure(
  procedure: WeldingProcedure,
  joint: JointDefinition,
  subcontractorId: string,
  weldOn: string | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (procedure.status !== "active") {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} is not active.`,
    })
  }
  if (procedure.subcontractorId && procedure.subcontractorId !== subcontractorId) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} is qualified for a different subcontractor.`,
    })
  }
  if (
    joint.diameterInch === null ||
    joint.diameterInch < procedure.diameterFrom ||
    joint.diameterInch > procedure.diameterTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} does not cover a diameter of ${joint.diameterInch ?? "unknown"}".`,
    })
  }
  if (
    joint.thicknessMm === null ||
    joint.thicknessMm < procedure.thicknessFrom ||
    joint.thicknessMm > procedure.thicknessTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} does not cover a thickness of ${joint.thicknessMm ?? "unknown"} mm.`,
    })
  }
  if (weldOn && procedure.approvedOn > weldOn) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} was approved on ${procedure.approvedOn}, after the weld date.`,
    })
  }

  return issues
}

/** Dossier 11.7. Expiry is judged on the date the point was welded, not today. */
export function validateWelder(
  welder: WelderQualification,
  procedure: WeldingProcedure,
  subcontractorId: string,
  weldedOn: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (welder.status !== "active") {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} is not active.`,
    })
  }
  if (welder.subcontractorId !== subcontractorId) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} belongs to a different subcontractor.`,
    })
  }
  if (welder.expiresOn < weldedOn) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} qualification expired on ${welder.expiresOn}.`,
    })
  }
  if (!welder.wpsIds.includes(procedure.id)) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} is not qualified for WPS ${procedure.code}.`,
    })
  }

  return issues
}

/**
 * The browser's copy of every rule the `record_weld_progress` RPC enforces. It exists to
 * disable the Save button and name the offending field; the database still decides.
 */
export function validateWeldProgress(input: WeldProgressInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (input.isLocked) {
    issues.push({
      field: "record",
      message: "This joint has an accepted NDE result. Use the correction action instead.",
    })
  }

  // Dossier 16.5: Shop Weld Progress covers shop joints only.
  if (input.joint.weldLocation !== "shop") {
    issues.push({
      field: "joint",
      message: `This is a ${input.joint.weldLocation} weld and belongs to the assembly or erection module.`,
    })
  }

  issues.push(
    ...validateProcedure(input.procedure, input.joint, input.subcontractorId, input.weldOn),
  )

  const byId = new Map(input.welders.map((welder) => [welder.id, welder]))
  for (const point of input.points) {
    if (!input.joint.availablePointTypes.includes(point.pointType)) {
      issues.push({
        field: "points",
        message: `This joint has no ${point.pointType} weld point in its definition.`,
      })
      continue
    }
    const welder = byId.get(point.welderQualificationId)
    if (!welder) {
      issues.push({ field: "points", message: "That welder is not registered on this project." })
      continue
    }
    issues.push(
      ...validateWelder(welder, input.procedure, input.subcontractorId, point.weldedOn),
    )
  }

  issues.push(...validateAllocation(input.points, input.weldOn !== null))

  return issues
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/domain/weld-progress.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/domain/weld-progress.ts \
        modules/construction/domain/weld-progress.test.ts
git commit -m "feat(construction): model weld point allocation and qualification rules"
```

## Task 12: NDE obligations from the matrix

**Files:**
- Create: `modules/construction/domain/nde-obligation.ts`
- Create: `modules/construction/domain/nde-obligation.test.ts`

**Interfaces:**
- Produces: `NDT_METHODS`, `NdtMethod`, `interface NdeMatrixRule { id: string; rtCoverage: number; utCoverage: number; mtCoverage: number; ptCoverage: number; pmiCoverage: number; htCoverage: number; pwhtRequired: boolean; pwhtThresholdMm: number | null }`, `interface DerivedObligation { method: NdtMethod; requiredCoverage: number; selectionMode: "full" | "spot" }`, `deriveObligations(rule)`, `requiresPwht(rule, thicknessMm)`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/domain/nde-obligation.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  NDT_METHODS,
  deriveObligations,
  requiresPwht,
  type NdeMatrixRule,
} from "./nde-obligation"

const emptyRule: NdeMatrixRule = {
  id: "rule-1",
  rtCoverage: 0,
  utCoverage: 0,
  mtCoverage: 0,
  ptCoverage: 0,
  pmiCoverage: 0,
  htCoverage: 0,
  pwhtRequired: false,
  pwhtThresholdMm: null,
}

assert.equal(NDT_METHODS.length, 7)

assert.deepEqual(deriveObligations(emptyRule), [])

// Dossier 11.9: a 100 percent requirement is an NDE100 obligation from the start.
assert.deepEqual(deriveObligations({ ...emptyRule, rtCoverage: 100 }), [
  { method: "rt", requiredCoverage: 100, selectionMode: "full" },
])
assert.deepEqual(deriveObligations({ ...emptyRule, utCoverage: 10 }), [
  { method: "ut", requiredCoverage: 10, selectionMode: "spot" },
])
assert.equal(
  deriveObligations({ ...emptyRule, rtCoverage: 100, utCoverage: 10, mtCoverage: 5 }).length,
  3,
)
// vt has no coverage column in the matrix, so it is never derived.
assert.equal(
  deriveObligations({ ...emptyRule, rtCoverage: 100 }).some((item) => item.method === "vt"),
  false,
)

// PWHT: required with no threshold applies to every thickness.
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true }, 4), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 12), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 10), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 8), false)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, null), false)
assert.equal(requiresPwht(emptyRule, 30), false)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/domain/nde-obligation.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/domain/nde-obligation.ts`:

```typescript
/** Matches the `public.ndt_method` enum. `vt` exists in the enum but has no matrix column. */
export const NDT_METHODS = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"] as const
export type NdtMethod = (typeof NDT_METHODS)[number]

export interface NdeMatrixRule {
  id: string
  rtCoverage: number
  utCoverage: number
  mtCoverage: number
  ptCoverage: number
  pmiCoverage: number
  htCoverage: number
  pwhtRequired: boolean
  pwhtThresholdMm: number | null
}

export interface DerivedObligation {
  method: NdtMethod
  requiredCoverage: number
  selectionMode: "full" | "spot"
}

const COVERAGE_FIELDS: readonly (readonly [NdtMethod, keyof NdeMatrixRule])[] = [
  ["rt", "rtCoverage"],
  ["ut", "utCoverage"],
  ["mt", "mtCoverage"],
  ["pt", "ptCoverage"],
  ["pmi", "pmiCoverage"],
  ["ht", "htCoverage"],
]

/**
 * Dossier 11.9. One obligation per covered method. A full obligation must be examined; a
 * spot obligation is what Track 06 allocates into batches. This mirrors
 * `public.generate_weld_obligations`; the database copy is the authority.
 */
export function deriveObligations(rule: NdeMatrixRule): DerivedObligation[] {
  const obligations: DerivedObligation[] = []

  for (const [method, field] of COVERAGE_FIELDS) {
    const coverage = Number(rule[field] ?? 0)
    if (coverage <= 0) continue
    obligations.push({
      method,
      requiredCoverage: coverage,
      selectionMode: coverage >= 100 ? "full" : "spot",
    })
  }

  return obligations
}

/** A null thickness cannot clear a threshold, so it does not create a requirement. */
export function requiresPwht(rule: NdeMatrixRule, thicknessMm: number | null): boolean {
  if (!rule.pwhtRequired) return false
  if (rule.pwhtThresholdMm === null) return true
  if (thicknessMm === null) return false
  return thicknessMm >= rule.pwhtThresholdMm
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/domain/nde-obligation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/domain/nde-obligation.ts \
        modules/construction/domain/nde-obligation.test.ts
git commit -m "feat(construction): derive NDE obligations and PWHT requirements from the matrix"
```

## Task 13: Release eligibility

**Files:**
- Create: `modules/construction/domain/quality-release.ts`
- Create: `modules/construction/domain/quality-release.test.ts`

**Interfaces:**
- Produces: `interface FabricationReadiness { lineTotal: number; lineChecked: number; weldTotal: number; weldComplete: number; supportTotal: number; supportRecorded: number; ndePending: number; pwhtPending: number; revisionStatus: string }`, `interface ReleaseEligibility { isFabricated: boolean; isReleasable: boolean; blockers: string[] }`, `evaluateReleaseEligibility(readiness)`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/domain/quality-release.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "./quality-release"

const ready: FabricationReadiness = {
  lineTotal: 2,
  lineChecked: 2,
  weldTotal: 3,
  weldComplete: 3,
  supportTotal: 1,
  supportRecorded: 1,
  ndePending: 0,
  pwhtPending: 0,
  revisionStatus: "accepted",
}

const full = evaluateReleaseEligibility(ready)
assert.equal(full.isFabricated, true)
assert.equal(full.isReleasable, true)
assert.deepEqual(full.blockers, [])

// Dossier 30 prohibition 8: NDE and PWHT gate the release, not the fabrication.
const pendingNde = evaluateReleaseEligibility({ ...ready, ndePending: 2 })
assert.equal(pendingNde.isFabricated, true)
assert.equal(pendingNde.isReleasable, false)
assert.equal(pendingNde.blockers.length, 1)
assert.match(pendingNde.blockers[0], /2 NDE/)

const pendingPwht = evaluateReleaseEligibility({ ...ready, pwhtPending: 1 })
assert.equal(pendingPwht.isReleasable, false)
assert.match(pendingPwht.blockers[0], /PWHT/)

const partialMaterial = evaluateReleaseEligibility({ ...ready, lineChecked: 1 })
assert.equal(partialMaterial.isFabricated, false)
assert.match(partialMaterial.blockers[0], /1 of 2/)

const partialWelds = evaluateReleaseEligibility({ ...ready, weldComplete: 1 })
assert.equal(partialWelds.isFabricated, false)
assert.match(partialWelds.blockers[0], /1 of 3/)

const partialSupports = evaluateReleaseEligibility({ ...ready, supportRecorded: 0 })
assert.equal(partialSupports.isFabricated, false)

// An empty bill of materials is never fabricated.
assert.equal(
  evaluateReleaseEligibility({ ...ready, lineTotal: 0, lineChecked: 0 }).isFabricated,
  false,
)

// A superseded revision blocks everything, whatever the counts say.
const superseded = evaluateReleaseEligibility({ ...ready, revisionStatus: "superseded" })
assert.equal(superseded.isReleasable, false)
assert.match(superseded.blockers[0], /revision/)

// Every blocker is reported, not just the first.
assert.equal(
  evaluateReleaseEligibility({ ...ready, lineChecked: 0, ndePending: 1 }).blockers.length,
  2,
)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/domain/quality-release.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/domain/quality-release.ts`:

```typescript
/** Mirrors one row of `public.spool_fabrication_readiness`. */
export interface FabricationReadiness {
  lineTotal: number
  lineChecked: number
  weldTotal: number
  weldComplete: number
  supportTotal: number
  supportRecorded: number
  ndePending: number
  pwhtPending: number
  revisionStatus: string
}

export interface ReleaseEligibility {
  isFabricated: boolean
  isReleasable: boolean
  blockers: string[]
}

/**
 * Dossier 16.6 and 16.7. The same four gates `release_quality_record` applies, so the
 * disabled button and the RPC rejection say the same thing — roadmap 17 requires it.
 */
export function evaluateReleaseEligibility(
  readiness: FabricationReadiness,
): ReleaseEligibility {
  const blockers: string[] = []

  if (readiness.revisionStatus !== "accepted") {
    blockers.push(
      `This spool revision is ${readiness.revisionStatus} and no longer accepts progress.`,
    )
  }
  if (readiness.lineTotal === 0 || readiness.lineChecked < readiness.lineTotal) {
    blockers.push(
      `Material check is incomplete: ${readiness.lineChecked} of ${readiness.lineTotal} bill lines traced.`,
    )
  }
  if (readiness.weldComplete < readiness.weldTotal) {
    blockers.push(
      `Welding is incomplete: ${readiness.weldComplete} of ${readiness.weldTotal} joints welded.`,
    )
  }
  if (readiness.supportRecorded < readiness.supportTotal) {
    blockers.push(
      `Supports are incomplete: ${readiness.supportRecorded} of ${readiness.supportTotal} installed.`,
    )
  }
  if (readiness.ndePending > 0) {
    blockers.push(`${readiness.ndePending} NDE obligations are still outstanding.`)
  }
  if (readiness.pwhtPending > 0) {
    blockers.push(`${readiness.pwhtPending} joints still need an accepted PWHT result.`)
  }

  const isFabricated =
    readiness.revisionStatus === "accepted" &&
    readiness.lineTotal > 0 &&
    readiness.lineChecked >= readiness.lineTotal &&
    readiness.weldComplete >= readiness.weldTotal &&
    readiness.supportRecorded >= readiness.supportTotal

  return { isFabricated, isReleasable: blockers.length === 0, blockers }
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/domain/quality-release.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the whole unit suite and commit.**

Run: `npm run test:unit`

Expected: exit `0`.

```bash
git add modules/construction/domain/quality-release.ts \
        modules/construction/domain/quality-release.test.ts
git commit -m "feat(construction): evaluate QC release eligibility from fabrication readiness"
```

### Gate B checklist

- [ ] `npm run test:unit` exits `0`.
- [ ] `npm run typecheck` exits `0`.
- [ ] `rg -n "@supabase|from \"react\"|store/" modules/construction/domain/` returns nothing.

# Gate C — Application and infrastructure

## Task 14: The three application services

**Files:**
- Create: `modules/construction/application/record-material-check.ts`
- Create: `modules/construction/application/record-material-check.test.ts`
- Create: `modules/construction/application/record-weld-progress.ts`
- Create: `modules/construction/application/record-weld-progress.test.ts`
- Create: `modules/construction/application/release-spool.ts`
- Create: `modules/construction/application/release-spool.test.ts`

These three are one task because each is a thin orchestration over Gate B and none is worth a separate review gate on its own.

**Interfaces:**
- `record-material-check.ts` produces `interface MaterialCheckDraft { spoolRevisionId: string; checkedOn: string; qc13FormId: string | null; entries: TraceEntry[] }`, `describeMaterialCheckGate(lines, entries, startFabOn)` returning `{ allowed: boolean; reason: string | null }`, `toMaterialCheckPayload(draft)` returning `{ target_spool_revision_id: string; checked_on: string; items: { ident_code: string; trace_number: string; quantity: number | null }[]; qc13_form_id: string | null }`.
- `record-weld-progress.ts` produces `toWeldProgressPayload(draft)` returning the `points` and `dates` JSON the RPC expects, and `describeWeldProgressGate(input)`.
- `release-spool.ts` produces `describeReleaseGate(readiness)` and `describePaintGate(sentToPaintOn, requiredDft, measuredDft, w10pFormNumber)`.

- [ ] **Step 1: Write the failing tests.**

Create `modules/construction/application/record-material-check.test.ts`:

```typescript
import assert from "node:assert/strict"

import type { BillLine } from "../domain/material-check"
import {
  describeMaterialCheckGate,
  toMaterialCheckPayload,
} from "./record-material-check"

const lines: BillLine[] = [
  {
    spoolRevisionMaterialId: "line-1",
    identCode: "IDN-100",
    description: null,
    quantity: 3,
    unit: "m",
    expectedTraceNumber: null,
  },
]

assert.deepEqual(describeMaterialCheckGate(lines, [], null), {
  allowed: false,
  reason: "Record Start Fab before recording material traces.",
})
assert.deepEqual(describeMaterialCheckGate(lines, [], "2026-08-04"), {
  allowed: false,
  reason: "Enter at least one material trace.",
})
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [{ identCode: "IDN-999", traceNumber: "HEAT-1", quantity: null }],
    "2026-08-04",
  ),
  {
    allowed: false,
    reason: "IDN-999 is not on this spool revision bill of materials.",
  },
)
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [{ identCode: "IDN-100", traceNumber: "HEAT-1", quantity: 3 }],
    "2026-08-04",
  ),
  { allowed: true, reason: null },
)
assert.deepEqual(
  describeMaterialCheckGate([], [], "2026-08-04"),
  { allowed: false, reason: "This spool revision has no bill of materials to check." },
)

assert.deepEqual(
  toMaterialCheckPayload({
    spoolRevisionId: "spool-rev-1",
    checkedOn: "2026-08-05",
    qc13FormId: null,
    entries: [{ identCode: " idn-100 ", traceNumber: " heat-1 ", quantity: 3 }],
  }),
  {
    target_spool_revision_id: "spool-rev-1",
    checked_on: "2026-08-05",
    items: [{ ident_code: "IDN-100", trace_number: "HEAT-1", quantity: 3 }],
    qc13_form_id: null,
  },
)
```

Create `modules/construction/application/record-weld-progress.test.ts`:

```typescript
import assert from "node:assert/strict"

import type {
  JointDefinition,
  WelderQualification,
  WeldingProcedure,
} from "../domain/weld-progress"
import { describeWeldProgressGate, toWeldProgressPayload } from "./record-weld-progress"

const joint: JointDefinition = {
  weldLocation: "shop",
  diameterInch: 6,
  thicknessMm: 12,
  availablePointTypes: ["root", "cap"],
}
const procedure: WeldingProcedure = {
  id: "wps-1",
  code: "WPS-1",
  status: "active",
  subcontractorId: "sub-1",
  materialTypeId: "mat-1",
  diameterFrom: 1,
  diameterTo: 12,
  thicknessFrom: 2,
  thicknessTo: 20,
  approvedOn: "2026-01-01",
}
const welders: WelderQualification[] = [
  {
    id: "welder-1",
    welderCode: "W-1",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
  {
    id: "welder-2",
    welderCode: "W-2",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
]
const points = [
  { pointType: "root" as const, welderQualificationId: "welder-1", completionPercent: 50, weldedOn: "2026-08-05" },
  { pointType: "cap" as const, welderQualificationId: "welder-2", completionPercent: 50, weldedOn: "2026-08-05" },
]

assert.deepEqual(
  describeWeldProgressGate({
    joint,
    procedure,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders,
    isLocked: false,
  }),
  { allowed: true, reason: null },
)

const blocked = describeWeldProgressGate({
  joint,
  procedure,
  subcontractorId: "sub-1",
  weldOn: "2026-08-05",
  points: [{ ...points[0], completionPercent: 30 }, points[1]],
  welders,
  isLocked: false,
})
assert.equal(blocked.allowed, false)
assert.match(blocked.reason ?? "", /Root and Cap/)

assert.deepEqual(
  toWeldProgressPayload({
    weldJointRevisionId: "wjr-1",
    subcontractorId: "sub-1",
    weldingProcedureId: "wps-1",
    points,
    dates: {
      cuttingOn: "2026-08-01",
      bevelingOn: null,
      fitupOn: "2026-08-03",
      preheatOn: null,
      weldOn: "2026-08-05",
      dwirNumber: " DWIR-1 ",
      qcFormNumber: null,
      qc13FormId: null,
      reworkCodeId: null,
    },
  }),
  {
    target_weld_joint_revision_id: "wjr-1",
    subcontractor_id: "sub-1",
    welding_procedure_id: "wps-1",
    points: [
      { point_type: "root", welder_qualification_id: "welder-1", completion_percent: 50, welded_on: "2026-08-05" },
      { point_type: "cap", welder_qualification_id: "welder-2", completion_percent: 50, welded_on: "2026-08-05" },
    ],
    dates: {
      cutting_on: "2026-08-01",
      fitup_on: "2026-08-03",
      weld_on: "2026-08-05",
      dwir_number: "DWIR-1",
    },
  },
)
```

Create `modules/construction/application/release-spool.test.ts`:

```typescript
import assert from "node:assert/strict"

import type { FabricationReadiness } from "../domain/quality-release"
import { describePaintGate, describeReleaseGate } from "./release-spool"

const ready: FabricationReadiness = {
  lineTotal: 1,
  lineChecked: 1,
  weldTotal: 1,
  weldComplete: 1,
  supportTotal: 0,
  supportRecorded: 0,
  ndePending: 0,
  pwhtPending: 0,
  revisionStatus: "accepted",
}

assert.deepEqual(describeReleaseGate(ready), { allowed: true, reason: null })

const blocked = describeReleaseGate({ ...ready, ndePending: 3 })
assert.equal(blocked.allowed, false)
assert.match(blocked.reason ?? "", /3 NDE/)

// Several blockers collapse into one sentence the user can act on.
const multiple = describeReleaseGate({ ...ready, lineChecked: 0, pwhtPending: 1 })
assert.equal(multiple.allowed, false)
assert.match(multiple.reason ?? "", /Material check/)
assert.match(multiple.reason ?? "", /PWHT/)

assert.deepEqual(describePaintGate(null, 240, null, null), {
  allowed: false,
  reason: "Record Sent to Paint before recording painting activities.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 200, "W10P-1"), {
  allowed: false,
  reason: "The measured DFT of 200 microns is below the required 240 microns.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, null), {
  allowed: false,
  reason: "A DFT measurement requires the W10P form number.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, "W10P-1"), {
  allowed: true,
  reason: null,
})
assert.deepEqual(describePaintGate("2026-08-11", 240, null, null), {
  allowed: true,
  reason: null,
})
```

- [ ] **Step 2: Run all three and watch them fail.**

Run: `node --import tsx --test "modules/construction/application/*.test.ts"`

Expected: FAIL — three missing modules.

- [ ] **Step 3: Write the modules.**

Create `modules/construction/application/record-material-check.ts`:

```typescript
import {
  normalizeTrace,
  reconcileMaterialCheck,
  type BillLine,
  type TraceEntry,
} from "../domain/material-check"

export interface MaterialCheckDraft {
  spoolRevisionId: string
  checkedOn: string
  qc13FormId: string | null
  entries: TraceEntry[]
}

export interface Gate {
  allowed: boolean
  reason: string | null
}

export interface MaterialCheckPayload {
  target_spool_revision_id: string
  checked_on: string
  items: { ident_code: string; trace_number: string; quantity: number | null }[]
  qc13_form_id: string | null
}

export function describeMaterialCheckGate(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
  startFabOn: string | null,
): Gate {
  if (lines.length === 0) {
    return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  }
  if (!startFabOn) {
    return { allowed: false, reason: "Record Start Fab before recording material traces." }
  }
  if (entries.length === 0) {
    return { allowed: false, reason: "Enter at least one material trace." }
  }

  const reconciliation = reconcileMaterialCheck(lines, entries)
  if (reconciliation.unknownIdentCodes.length > 0) {
    return {
      allowed: false,
      reason: `${reconciliation.unknownIdentCodes[0]} is not on this spool revision bill of materials.`,
    }
  }

  return { allowed: true, reason: null }
}

export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload {
  return {
    target_spool_revision_id: draft.spoolRevisionId,
    checked_on: draft.checkedOn,
    items: draft.entries.map((entry) => ({
      ident_code: normalizeTrace(entry.identCode),
      trace_number: normalizeTrace(entry.traceNumber),
      quantity: entry.quantity,
    })),
    qc13_form_id: draft.qc13FormId,
  }
}
```

Create `modules/construction/application/record-weld-progress.ts`:

```typescript
import {
  validateWeldProgress,
  type PointAssignment,
  type WeldProgressInput,
} from "../domain/weld-progress"
import type { Gate } from "./record-material-check"

export interface WeldProgressDates {
  cuttingOn: string | null
  bevelingOn: string | null
  fitupOn: string | null
  preheatOn: string | null
  weldOn: string | null
  dwirNumber: string | null
  qcFormNumber: string | null
  qc13FormId: string | null
  reworkCodeId: string | null
}

export interface WeldProgressDraft {
  weldJointRevisionId: string
  subcontractorId: string
  weldingProcedureId: string
  points: readonly PointAssignment[]
  dates: WeldProgressDates
}

export interface WeldProgressPayload {
  target_weld_joint_revision_id: string
  subcontractor_id: string
  welding_procedure_id: string
  points: {
    point_type: string
    welder_qualification_id: string
    completion_percent: number
    welded_on: string
  }[]
  dates: Record<string, string>
}

export function describeWeldProgressGate(input: WeldProgressInput): Gate {
  const issues = validateWeldProgress(input)
  return issues.length === 0
    ? { allowed: true, reason: null }
    : { allowed: false, reason: issues.map((issue) => issue.message).join(" ") }
}

const DATE_KEYS: readonly (readonly [keyof WeldProgressDates, string])[] = [
  ["cuttingOn", "cutting_on"],
  ["bevelingOn", "beveling_on"],
  ["fitupOn", "fitup_on"],
  ["preheatOn", "preheat_on"],
  ["weldOn", "weld_on"],
  ["dwirNumber", "dwir_number"],
  ["qcFormNumber", "qc_form_number"],
  ["qc13FormId", "qc13_form_id"],
  ["reworkCodeId", "rework_code_id"],
]

/** Null and blank fields are omitted, so the RPC's `nullif(... , '')` guards never fire. */
export function toWeldProgressPayload(draft: WeldProgressDraft): WeldProgressPayload {
  const dates: Record<string, string> = {}
  for (const [key, column] of DATE_KEYS) {
    const value = draft.dates[key]
    if (value === null) continue
    const trimmed = value.trim()
    if (trimmed === "") continue
    dates[column] = trimmed
  }

  return {
    target_weld_joint_revision_id: draft.weldJointRevisionId,
    subcontractor_id: draft.subcontractorId,
    welding_procedure_id: draft.weldingProcedureId,
    points: draft.points.map((point) => ({
      point_type: point.pointType,
      welder_qualification_id: point.welderQualificationId,
      completion_percent: point.completionPercent,
      welded_on: point.weldedOn,
    })),
    dates,
  }
}
```

Create `modules/construction/application/release-spool.ts`:

```typescript
import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "../domain/quality-release"
import type { Gate } from "./record-material-check"

export function describeReleaseGate(readiness: FabricationReadiness): Gate {
  const eligibility = evaluateReleaseEligibility(readiness)
  return eligibility.isReleasable
    ? { allowed: true, reason: null }
    : { allowed: false, reason: eligibility.blockers.join(" ") }
}

/** Dossier 16.8: DFT is captured on the W10P and must clear the paint matrix requirement. */
export function describePaintGate(
  sentToPaintOn: string | null,
  requiredDftMicrons: number,
  measuredDftMicrons: number | null,
  w10pFormNumber: string | null,
): Gate {
  if (!sentToPaintOn) {
    return {
      allowed: false,
      reason: "Record Sent to Paint before recording painting activities.",
    }
  }
  if (measuredDftMicrons !== null) {
    if (measuredDftMicrons < requiredDftMicrons) {
      return {
        allowed: false,
        reason: `The measured DFT of ${measuredDftMicrons} microns is below the required ${requiredDftMicrons} microns.`,
      }
    }
    if (!w10pFormNumber || w10pFormNumber.trim() === "") {
      return { allowed: false, reason: "A DFT measurement requires the W10P form number." }
    }
  }
  return { allowed: true, reason: null }
}
```

- [ ] **Step 4: Run them and watch them pass.**

Run: `node --import tsx --test "modules/construction/application/*.test.ts"`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/application
git commit -m "feat(construction): add material check, weld progress and release application services"
```

## Task 15: The error mapper

**Files:**
- Create: `modules/construction/infrastructure/supabase-construction-errors.ts`
- Create: `modules/construction/infrastructure/supabase-construction-errors.test.ts`

**Interfaces:**
- Produces: `mapSupabaseConstructionError(error)` returning `string`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/infrastructure/supabase-construction-errors.test.ts`:

```typescript
import assert from "node:assert/strict"

import { mapSupabaseConstructionError } from "./supabase-construction-errors"

const generic = mapSupabaseConstructionError(null)
assert.match(generic, /could not be completed/)

assert.match(mapSupabaseConstructionError({ code: "PQC30" }), /could not be found/)
assert.match(mapSupabaseConstructionError({ code: "PQC31" }), /revision/)
assert.match(mapSupabaseConstructionError({ code: "PQC32" }), /step/)
assert.match(mapSupabaseConstructionError({ code: "PQC33" }), /PML/)
assert.match(mapSupabaseConstructionError({ code: "PQC34" }), /WPS|welder/i)
assert.match(mapSupabaseConstructionError({ code: "PQC35" }), /weld point/i)
assert.match(mapSupabaseConstructionError({ code: "PQC36" }), /locked/)
assert.match(mapSupabaseConstructionError({ code: "PQC37" }), /NDE|PWHT/)
assert.match(mapSupabaseConstructionError({ code: "PQC38" }), /already/)
assert.match(mapSupabaseConstructionError({ code: "PQC39" }), /referential|project setup/i)
assert.match(mapSupabaseConstructionError({ code: "42501" }), /permission/)
assert.match(mapSupabaseConstructionError({ code: "23505" }), /already/)

// A server message is never shown verbatim.
const raw = mapSupabaseConstructionError({
  code: "42P01",
  message: 'relation "public.weld_progress_records" does not exist',
})
assert.equal(raw, generic)
assert.equal(raw.includes("relation"), false)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/infrastructure/supabase-construction-errors.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/infrastructure/supabase-construction-errors.ts`:

```typescript
const GENERIC = "The fabrication action could not be completed. Please try again."

/**
 * Plan section 3.13. Every `PQC3x` code the construction RPCs raise has a sentence a site
 * engineer can act on. Anything else collapses to GENERIC — a PostgREST or SQL message
 * never reaches the screen.
 */
export function mapSupabaseConstructionError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error) return GENERIC
  switch (error.code) {
    case "PQC30":
      return "That spool, joint or record could not be found, or it does not belong to this spool."
    case "PQC31":
      return "This spool revision is no longer the accepted one. Reload the spool and record the work against the current revision."
    case "PQC32":
      return "An earlier step is missing. Complete the previous fabrication step before recording this one."
    case "PQC33":
      return "That heat or trace number is not registered in the project PML for this ident code."
    case "PQC34":
      return "The WPS or the welder qualification does not cover this joint. Check the diameter, thickness, material, subcontractor and expiry date."
    case "PQC35":
      return "The weld point allocation is not valid. Root and Cap must total 100 percent, Heat and Fill must total 0 or 100, and each point needs a different welder."
    case "PQC36":
      return "This joint is locked because an NDE result has been accepted. Use the correction action, which records a reason."
    case "PQC37":
      return "This spool still has outstanding NDE obligations or PWHT results and cannot be QC released."
    case "PQC38":
      return "The same request is already being processed. Wait for it to finish before retrying."
    case "PQC39":
      return "A project referential this action depends on is missing or archived. Check the NDE matrix, paint matrix and material class mapping in project setup."
    case "42501":
      return "You do not have permission to record this fabrication work, or the spool is outside your scope."
    case "23505":
      return "That record already exists for this spool or joint."
    case "23514":
      return "One of the values entered is not allowed by the project rules."
    case "23503":
      return "A referenced value does not exist in this project."
    default:
      return GENERIC
  }
}
```

- [ ] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/construction/infrastructure/supabase-construction-errors.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/infrastructure/supabase-construction-errors.ts \
        modules/construction/infrastructure/supabase-construction-errors.test.ts
git commit -m "feat(construction): map construction error codes to user-facing sentences"
```

## Task 16: The Supabase construction repository

**Files:**
- Create: `modules/construction/infrastructure/supabase-construction-repository.ts`
- Create: `modules/construction/infrastructure/supabase-construction-repository.test.ts`

**Interfaces:**
- Produces the row mappers `toSpoolStatus(row)`, `toWeldSummary(row)`, `toBillLine(row)`, `toWelderQualification(row)`, `toWeldingProcedure(row)`, `toReadiness(row)` and one async function per read and per RPC. Every async function either returns typed data or throws an `Error` whose message came from `mapSupabaseConstructionError`.
- Exported types: `SpoolStatus`, `WeldSummary`, `ObligationRow`, `PwhtRow`, `PaintOption`, `LocationOption`, `SupportRow`, `WeldFormReferentials`.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/infrastructure/supabase-construction-repository.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  toBillLine,
  toReadiness,
  toSpoolStatus,
  toWeldSummary,
  toWelderQualification,
  toWeldingProcedure,
} from "./supabase-construction-repository"

const status = toSpoolStatus({
  spool_revision_id: "spool-rev-1",
  project_id: "project-1",
  iso_number: "ISO-A",
  spool_number: "SP-1",
  revision_number: "R0",
  pds_area_id: "pds-1",
  start_fab_on: "2026-08-04",
  material_check_on: null,
  fabricated_on: null,
  qc_release_on: null,
  sent_to_paint_on: null,
  painted_on: null,
  final_qc_on: null,
  laydown_on: null,
  current_stage: "start_fab",
  is_fabricated: false,
  is_releasable: false,
  line_total: 2,
  line_checked: 0,
  weld_total: 1,
  weld_complete: 0,
  support_total: 0,
  support_recorded: 0,
  nde_pending: 0,
  pwht_pending: 0,
})
assert.equal(status.spoolNumber, "SP-1")
assert.equal(status.currentStage, "start_fab")
assert.equal(status.dates.start_fab, "2026-08-04")
assert.equal(status.dates.material_check, null)
assert.equal(status.isReleasable, false)

const weld = toWeldSummary({
  weld_joint_revision_id: "wjr-1",
  project_id: "project-1",
  spool_revision_id: "spool-rev-1",
  weld_number: "W-1",
  spool_number: "SP-1",
  weld_location: "shop",
  diameter_inch: "6",
  thickness_mm: "12",
  wps_code: "WPS-1",
  welders: ["W-1", "W-2"],
  weld_on: "2026-08-05",
  is_locked: true,
  obligation_total: 2,
  obligation_pending: 1,
  pwht_required: true,
  pwht_accepted: false,
})
assert.equal(weld.diameterInch, 6)
assert.equal(weld.thicknessMm, 12)
assert.deepEqual(weld.welders, ["W-1", "W-2"])
assert.equal(weld.isLocked, true)
assert.equal(weld.obligationPending, 1)

// A joint with no progress yet comes back with nulls, not zeros.
const bare = toWeldSummary({
  weld_joint_revision_id: "wjr-2",
  project_id: "project-1",
  spool_revision_id: "spool-rev-1",
  weld_number: "W-2",
  spool_number: "SP-1",
  weld_location: "shop",
  diameter_inch: null,
  thickness_mm: null,
  wps_code: null,
  welders: null,
  weld_on: null,
  is_locked: false,
  obligation_total: 0,
  obligation_pending: 0,
  pwht_required: false,
  pwht_accepted: false,
})
assert.equal(bare.diameterInch, null)
assert.deepEqual(bare.welders, [])

const line = toBillLine({
  id: "line-1",
  ident_code: "IDN-100",
  description: "Pipe",
  quantity: "3",
  unit: "m",
  trace_number: "HEAT-100",
})
assert.equal(line.spoolRevisionMaterialId, "line-1")
assert.equal(line.quantity, 3)
assert.equal(line.expectedTraceNumber, "HEAT-100")

const procedure = toWeldingProcedure({
  id: "wps-1",
  code: "WPS-1",
  status: "active",
  subcontractor_id: null,
  material_type_id: "mat-1",
  diameter_from: "1",
  diameter_to: "12",
  thickness_from: "2",
  thickness_to: "20",
  approved_on: "2026-01-01",
})
assert.equal(procedure.diameterTo, 12)
assert.equal(procedure.subcontractorId, null)

const welder = toWelderQualification({
  id: "welder-1",
  welder_code: "W-1",
  status: "active",
  subcontractor_id: "sub-1",
  expires_on: "2027-01-01",
  welder_wps_qualifications: [{ wps_id: "wps-1" }, { wps_id: "wps-2" }],
})
assert.deepEqual(welder.wpsIds, ["wps-1", "wps-2"])

const readiness = toReadiness({
  line_total: 2,
  line_checked: 2,
  weld_total: 1,
  weld_complete: 1,
  support_total: 0,
  support_recorded: 0,
  nde_pending: 1,
  pwht_pending: 0,
  revision_status: "accepted",
})
assert.equal(readiness.ndePending, 1)
assert.equal(readiness.revisionStatus, "accepted")
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/infrastructure/supabase-construction-repository.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the module.**

Create `modules/construction/infrastructure/supabase-construction-repository.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import type { ConstructionStage, StageDates } from "../domain/construction-phase"
import type { BillLine } from "../domain/material-check"
import type { NdtMethod } from "../domain/nde-obligation"
import type { FabricationReadiness } from "../domain/quality-release"
import type { WelderQualification, WeldingProcedure } from "../domain/weld-progress"
import type { MaterialCheckPayload } from "../application/record-material-check"
import type { WeldProgressPayload } from "../application/record-weld-progress"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

type Row = Record<string, any>

const fail = (error: { code?: string; message?: string } | null): void => {
  if (error) throw new Error(mapSupabaseConstructionError(error))
}

const required = <T>(data: T | null | undefined): T => {
  if (data === null || data === undefined) throw new Error(mapSupabaseConstructionError(null))
  return data
}

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === "" ? null : Number(value)

export interface SpoolStatus {
  spoolRevisionId: string
  projectId: string
  isoNumber: string
  spoolNumber: string
  revisionNumber: string
  pdsAreaId: string | null
  currentStage: ConstructionStage | null
  dates: StageDates
  isFabricated: boolean
  isReleasable: boolean
  lineTotal: number
  lineChecked: number
  weldTotal: number
  weldComplete: number
  supportTotal: number
  supportRecorded: number
  ndePending: number
  pwhtPending: number
}

export function toSpoolStatus(row: Row): SpoolStatus {
  return {
    spoolRevisionId: row.spool_revision_id,
    projectId: row.project_id,
    isoNumber: row.iso_number,
    spoolNumber: row.spool_number,
    revisionNumber: row.revision_number,
    pdsAreaId: row.pds_area_id ?? null,
    currentStage: (row.current_stage as ConstructionStage | null) ?? null,
    dates: {
      start_fab: row.start_fab_on ?? null,
      material_check: row.material_check_on ?? null,
      fabricated: row.fabricated_on ?? null,
      qc_release: row.qc_release_on ?? null,
      sent_to_paint: row.sent_to_paint_on ?? null,
      painted: row.painted_on ?? null,
      final_qc: row.final_qc_on ?? null,
      laydown: row.laydown_on ?? null,
    },
    isFabricated: row.is_fabricated === true,
    isReleasable: row.is_releasable === true,
    lineTotal: row.line_total ?? 0,
    lineChecked: row.line_checked ?? 0,
    weldTotal: row.weld_total ?? 0,
    weldComplete: row.weld_complete ?? 0,
    supportTotal: row.support_total ?? 0,
    supportRecorded: row.support_recorded ?? 0,
    ndePending: row.nde_pending ?? 0,
    pwhtPending: row.pwht_pending ?? 0,
  }
}

export interface WeldSummary {
  weldJointRevisionId: string
  spoolRevisionId: string
  weldNumber: string
  spoolNumber: string
  weldLocation: string
  diameterInch: number | null
  thicknessMm: number | null
  wpsCode: string | null
  welders: string[]
  weldOn: string | null
  isLocked: boolean
  obligationTotal: number
  obligationPending: number
  pwhtRequired: boolean
  pwhtAccepted: boolean
}

export function toWeldSummary(row: Row): WeldSummary {
  return {
    weldJointRevisionId: row.weld_joint_revision_id,
    spoolRevisionId: row.spool_revision_id,
    weldNumber: row.weld_number,
    spoolNumber: row.spool_number,
    weldLocation: row.weld_location,
    diameterInch: toNumber(row.diameter_inch),
    thicknessMm: toNumber(row.thickness_mm),
    wpsCode: row.wps_code ?? null,
    welders: row.welders ?? [],
    weldOn: row.weld_on ?? null,
    isLocked: row.is_locked === true,
    obligationTotal: row.obligation_total ?? 0,
    obligationPending: row.obligation_pending ?? 0,
    pwhtRequired: row.pwht_required === true,
    pwhtAccepted: row.pwht_accepted === true,
  }
}

export function toBillLine(row: Row): BillLine {
  return {
    spoolRevisionMaterialId: row.id,
    identCode: row.ident_code,
    description: row.description ?? null,
    quantity: toNumber(row.quantity),
    unit: row.unit ?? null,
    expectedTraceNumber: row.trace_number ?? null,
  }
}

export function toWeldingProcedure(row: Row): WeldingProcedure {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    subcontractorId: row.subcontractor_id ?? null,
    materialTypeId: row.material_type_id,
    diameterFrom: Number(row.diameter_from),
    diameterTo: Number(row.diameter_to),
    thicknessFrom: Number(row.thickness_from),
    thicknessTo: Number(row.thickness_to),
    approvedOn: row.approved_on,
  }
}

export function toWelderQualification(row: Row): WelderQualification {
  return {
    id: row.id,
    welderCode: row.welder_code,
    status: row.status,
    subcontractorId: row.subcontractor_id,
    expiresOn: row.expires_on,
    wpsIds: (row.welder_wps_qualifications ?? []).map((link: Row) => link.wps_id),
  }
}

export function toReadiness(row: Row): FabricationReadiness {
  return {
    lineTotal: row.line_total ?? 0,
    lineChecked: row.line_checked ?? 0,
    weldTotal: row.weld_total ?? 0,
    weldComplete: row.weld_complete ?? 0,
    supportTotal: row.support_total ?? 0,
    supportRecorded: row.support_recorded ?? 0,
    ndePending: row.nde_pending ?? 0,
    pwhtPending: row.pwht_pending ?? 0,
    revisionStatus: row.revision_status ?? "accepted",
  }
}

export interface ObligationRow {
  id: string
  weldJointRevisionId: string
  weldNumber: string
  method: NdtMethod
  requiredCoverage: number
  selectionMode: string
  disposition: string
}

export interface PwhtRow {
  id: string
  weldJointRevisionId: string
  weldNumber: string
  thresholdMm: number | null
  acceptedOn: string | null
}

export interface PaintOption {
  lineServiceId: string
  lineServiceCode: string
  ralCode: string
  requiredFinalDftMicrons: number
  intermediateCoatCount: number
  finalCoatCount: number
}

export interface LocationOption {
  id: string
  code: string
  description: string | null
}

export interface SupportRow {
  supportRevisionId: string
  supportNumber: string
  supportType: string | null
  quantity: number
  installedOn: string | null
}

export interface WeldFormReferentials {
  subcontractors: { id: string; code: string; name: string }[]
  procedures: WeldingProcedure[]
  welders: WelderQualification[]
  reworkCodes: { id: string; code: string; description: string }[]
}

// Reads -----------------------------------------------------------------------

export async function loadSpoolStatuses(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<SpoolStatus[]> {
  const { data, error } = await client
    .from("spool_construction_status")
    .select("*")
    .eq("project_id", projectId)
    .order("iso_number")
    .order("spool_number")
  fail(error)
  return (data ?? []).map(toSpoolStatus)
}

export async function loadSpoolStatus(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<SpoolStatus> {
  const { data, error } = await client
    .from("spool_construction_status")
    .select("*")
    .eq("spool_revision_id", spoolRevisionId)
    .single()
  fail(error)
  return toSpoolStatus(required(data))
}

export async function loadReadiness(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<FabricationReadiness> {
  const { data, error } = await client
    .from("spool_fabrication_readiness")
    .select("line_total, line_checked, weld_total, weld_complete, support_total, support_recorded, nde_pending, pwht_pending, revision_status")
    .eq("spool_revision_id", spoolRevisionId)
    .single()
  fail(error)
  return toReadiness(required(data))
}

export async function loadBillOfMaterials(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<BillLine[]> {
  const { data, error } = await client
    .from("spool_revision_materials")
    .select("id, ident_code, description, quantity, unit, trace_number")
    .eq("spool_revision_id", spoolRevisionId)
    .order("ident_code")
  fail(error)
  return (data ?? []).map(toBillLine)
}

export async function loadMaterialCheckItems(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<{ identCode: string; traceNumber: string; quantity: number | null }[]> {
  const { data, error } = await client
    .from("material_check_items")
    .select("ident_code, trace_number, quantity, material_check_records!inner(spool_revision_id)")
    .eq("material_check_records.spool_revision_id", spoolRevisionId)
  fail(error)
  return (data ?? []).map((row: Row) => ({
    identCode: row.ident_code,
    traceNumber: row.trace_number,
    quantity: toNumber(row.quantity),
  }))
}

export async function loadWeldSummaries(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<WeldSummary[]> {
  const { data, error } = await client
    .from("weld_progress_summary")
    .select("*")
    .eq("spool_revision_id", spoolRevisionId)
    .order("weld_number")
  fail(error)
  return (data ?? []).map(toWeldSummary)
}

export async function loadWeldFormReferentials(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<WeldFormReferentials> {
  const [subcontractors, procedures, welders, reworkCodes] = await Promise.all([
    client
      .from("project_subcontractors")
      .select("id, code, name")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
    client
      .from("project_welding_procedures")
      .select("id, code, status, subcontractor_id, material_type_id, diameter_from, diameter_to, thickness_from, thickness_to, approved_on")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
    client
      .from("welder_qualifications")
      .select("id, welder_code, status, subcontractor_id, expires_on, welder_wps_qualifications(wps_id)")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("welder_code"),
    client
      .from("project_rework_codes")
      .select("id, code, description")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
  ])

  fail(subcontractors.error)
  fail(procedures.error)
  fail(welders.error)
  fail(reworkCodes.error)

  return {
    subcontractors: (subcontractors.data ?? []) as WeldFormReferentials["subcontractors"],
    procedures: (procedures.data ?? []).map(toWeldingProcedure),
    welders: (welders.data ?? []).map(toWelderQualification),
    reworkCodes: (reworkCodes.data ?? []) as WeldFormReferentials["reworkCodes"],
  }
}

export async function loadObligations(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<ObligationRow[]> {
  const { data, error } = await client
    .from("nde_obligations")
    .select("id, weld_joint_revision_id, method, required_coverage, selection_mode, disposition, weld_joint_revisions(weld_joints(weld_number))")
    .eq("spool_revision_id", spoolRevisionId)
    .order("method")
  fail(error)
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    weldJointRevisionId: row.weld_joint_revision_id,
    weldNumber: row.weld_joint_revisions?.weld_joints?.weld_number ?? "",
    method: row.method as NdtMethod,
    requiredCoverage: Number(row.required_coverage),
    selectionMode: row.selection_mode,
    disposition: row.disposition,
  }))
}

export async function loadPwhtRequirements(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<PwhtRow[]> {
  const { data, error } = await client
    .from("pwht_requirements")
    .select("id, weld_joint_revision_id, thickness_threshold_mm, weld_joint_revisions(weld_joints(weld_number)), pwht_results(outcome, performed_on)")
    .eq("spool_revision_id", spoolRevisionId)
  fail(error)
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    weldJointRevisionId: row.weld_joint_revision_id,
    weldNumber: row.weld_joint_revisions?.weld_joints?.weld_number ?? "",
    thresholdMm: toNumber(row.thickness_threshold_mm),
    acceptedOn:
      (row.pwht_results ?? []).find((result: Row) => result.outcome === "accepted")
        ?.performed_on ?? null,
  }))
}

export async function loadSupports(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<SupportRow[]> {
  const { data, error } = await client
    .from("support_revisions")
    .select("id, support_type, quantity, supports(support_number), support_progress_records(installed_on)")
    .eq("spool_revision_id", spoolRevisionId)
    .eq("is_removed", false)
  fail(error)
  return (data ?? []).map((row: Row) => ({
    supportRevisionId: row.id,
    supportNumber: row.supports?.support_number ?? "",
    supportType: row.support_type ?? null,
    quantity: row.quantity ?? 1,
    installedOn: row.support_progress_records?.[0]?.installed_on ?? null,
  }))
}

export async function loadPaintOptions(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<PaintOption[]> {
  const { data, error } = await client
    .from("project_paint_matrix_rules")
    .select("line_service_id, required_final_dft_microns, intermediate_coat_count, final_coat_count, project_line_services(code), project_ral_codes(ral_code)")
    .eq("project_id", projectId)
    .eq("status", "active")
  fail(error)
  return (data ?? []).map((row: Row) => ({
    lineServiceId: row.line_service_id,
    lineServiceCode: row.project_line_services?.code ?? "",
    ralCode: row.project_ral_codes?.ral_code ?? "",
    requiredFinalDftMicrons: Number(row.required_final_dft_microns),
    intermediateCoatCount: row.intermediate_coat_count ?? 0,
    finalCoatCount: row.final_coat_count ?? 0,
  }))
}

export async function loadLocations(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<LocationOption[]> {
  const { data, error } = await client
    .from("project_locations")
    .select("id, code, description")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("code")
  fail(error)
  return (data ?? []) as LocationOption[]
}

// Commands ---------------------------------------------------------------------

export async function recordConstructionProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  stage: "start_fab" | "sent_to_paint",
  occurredOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_construction_progress", {
    target_spool_revision_id: spoolRevisionId,
    target_phase: "fabrication",
    target_stage: stage,
    occurred_on: occurredOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function requestQc13Form(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  issuedOn: string,
  idempotencyKey: string,
): Promise<string> {
  const { data, error } = await client.rpc("request_qc13_form", {
    target_spool_revision_id: spoolRevisionId,
    issued_on: issuedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
  return (required(data) as Row).form_number
}

export async function materializeProgressCopies(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<number> {
  const { data, error } = await client.rpc("materialize_progress_copies", {
    target_spool_revision_id: spoolRevisionId,
  })
  fail(error)
  return Number(data ?? 0)
}

export async function recordMaterialCheck(
  client: SupabaseClient<Database>,
  payload: MaterialCheckPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_material_check", {
    ...payload,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordWeldProgress(
  client: SupabaseClient<Database>,
  payload: WeldProgressPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_weld_progress", {
    ...payload,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function correctWeldProgress(
  client: SupabaseClient<Database>,
  weldJointRevisionId: string,
  expectedVersion: number,
  corrections: Record<string, string>,
  reason: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("correct_weld_progress", {
    target_weld_joint_revision_id: weldJointRevisionId,
    expected_version: expectedVersion,
    corrections,
    reason,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordSupportProgress(
  client: SupabaseClient<Database>,
  supportRevisionId: string,
  installedOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_support_progress", {
    target_support_revision_id: supportRevisionId,
    installed_on: installedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordNdeObligationOutcome(
  client: SupabaseClient<Database>,
  obligationId: string,
  disposition: "satisfied" | "waived",
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_nde_obligation_outcome", {
    target_obligation_id: obligationId,
    chosen_disposition: disposition,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordPwhtResult(
  client: SupabaseClient<Database>,
  requirementId: string,
  chartNumber: string,
  performedOn: string,
  outcome: "accepted" | "rejected",
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_pwht_result", {
    target_requirement_id: requirementId,
    chart_number: chartNumber,
    performed_on: performedOn,
    outcome,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function releaseQualityRecord(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  releasedOn: string,
  comment: string | null,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("release_quality_record", {
    target_spool_revision_id: spoolRevisionId,
    released_on: releasedOn,
    comment: comment ?? undefined,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordPaintProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  lineServiceId: string,
  details: Record<string, string | number>,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_paint_progress", {
    target_spool_revision_id: spoolRevisionId,
    line_service_id: lineServiceId,
    details,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordLaydown(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  locationId: string,
  storedOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_laydown", {
    target_spool_revision_id: spoolRevisionId,
    location_id: locationId,
    stored_on: storedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}
```

- [ ] **Step 4: Run the test and the typecheck.**

Run:
```bash
node --import tsx --test modules/construction/infrastructure/supabase-construction-repository.test.ts \
  && npm run typecheck
```

Expected: PASS and exit `0`. If the generated types reject an RPC argument name, the argument name in the migration and the call must be reconciled — change the call, not the migration, unless the migration is wrong.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/infrastructure/supabase-construction-repository.ts \
        modules/construction/infrastructure/supabase-construction-repository.test.ts
git commit -m "feat(construction): add the Supabase construction repository"
```

### Gate C checklist

- [ ] `npm run test:unit` exits `0`.
- [ ] `npm run typecheck` exits `0`.
- [ ] `rg -n "@supabase|from \"react\"" modules/construction/application/` returns nothing.
- [ ] Every RPC in §4's migration list has exactly one wrapper in the repository.

# Gate D — Fabrication screens

Every screen in this gate follows the same shape, established by Track 04's
`modules/engineering/ui/engineering-browser.tsx`:

- `"use client"` at the top; data comes from `getSupabaseBrowserClient()`.
- The page component reads `useAppMode()` and `useOptionalAccess()`; it renders the demo
  component in demo mode and the Supabase screen in `supabase` mode.
- Errors surface with `toast.error(message)` where the message already came through
  `mapSupabaseConstructionError`.
- Every mutating button is disabled by the same gate function the RPC enforces, and passes a
  `crypto.randomUUID()` idempotency key.
- A success toast fires **after** the awaited call resolves, never before — roadmap §8.4
  decision 15.

## Task 17: The spool picker, the stage timeline and the fabrication overview

**Files:**
- Create: `modules/construction/ui/fabrication/spool-stage-timeline.tsx`
- Create: `modules/construction/ui/fabrication/spool-picker.tsx`
- Create: `modules/construction/ui/fabrication/fabrication-overview.tsx`
- Modify: `app/fabrication/dashboard/page.tsx`

**Interfaces:**
- Produces `<SpoolStageTimeline status={SpoolStatus} />`, `<SpoolPicker projectId value onChange />`, `<FabricationOverview projectId />`.
- `SpoolPicker` calls `onChange(status: SpoolStatus)` and is reused by every later screen, so its props must not change after this task.

- [ ] **Step 1: Write the timeline.**

Create `modules/construction/ui/fabrication/spool-stage-timeline.tsx`:

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { CONSTRUCTION_STAGES, stageLabel } from "../../domain/construction-phase"
import type { SpoolStatus } from "../../infrastructure/supabase-construction-repository"

/**
 * Dossier 16.2's eight stages, in order. `fabricated` has no date of its own until the
 * readiness view derives one, which is exactly what this timeline shows.
 */
export function SpoolStageTimeline({ status }: { status: SpoolStatus }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {CONSTRUCTION_STAGES.map((stage) => {
        const date = status.dates[stage] ?? null
        const isCurrent = status.currentStage === stage
        return (
          <li key={stage} className="min-w-32 rounded border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{stageLabel(stage)}</span>
              {isCurrent ? <Badge variant="outline">Current</Badge> : null}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{date ?? "—"}</p>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 2: Write the picker.**

Create `modules/construction/ui/fabrication/spool-picker.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadSpoolStatuses,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"

interface SpoolPickerProps {
  projectId: string
  value: string | null
  onChange: (status: SpoolStatus) => void
  refreshToken?: number
}

export function SpoolPicker({ projectId, value, onChange, refreshToken = 0 }: SpoolPickerProps) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [filter, setFilter] = useState("")

  useEffect(() => {
    void loadSpoolStatuses(getSupabaseBrowserClient(), projectId)
      .then(setStatuses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Spools could not be loaded."),
      )
  }, [projectId, refreshToken])

  const needle = filter.trim().toUpperCase()
  const visible = needle
    ? statuses.filter(
        (status) =>
          status.spoolNumber.toUpperCase().includes(needle) ||
          status.isoNumber.toUpperCase().includes(needle),
      )
    : statuses

  return (
    <div className="space-y-2">
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by ISO or spool number"
      />
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {visible.map((status) => (
          <li key={status.spoolRevisionId}>
            <button
              type="button"
              onClick={() => onChange(status)}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                value === status.spoolRevisionId ? "bg-muted" : ""
              }`}
            >
              <span className="font-mono text-xs">{status.spoolNumber}</span>
              <Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="px-2 py-1 text-sm text-muted-foreground">
            No spool matches that filter.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Write the overview.**

Create `modules/construction/ui/fabrication/fabrication-overview.tsx`:

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { CONSTRUCTION_STAGES, stageLabel } from "../../domain/construction-phase"
import {
  loadSpoolStatuses,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"

/**
 * Roadmap §17 exit criterion: the dashboard is built from database projections, never from
 * fixtures. Every number here comes from `spool_construction_status`.
 */
export function FabricationOverview({ projectId }: { projectId: string }) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])

  useEffect(() => {
    void loadSpoolStatuses(getSupabaseBrowserClient(), projectId)
      .then(setStatuses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "The overview could not be loaded."),
      )
  }, [projectId])

  const counts = useMemo(() => {
    const byStage = new Map<string, number>()
    for (const status of statuses) {
      const key = status.currentStage ?? "not_started"
      byStage.set(key, (byStage.get(key) ?? 0) + 1)
    }
    return byStage
  }, [statuses])

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {["not_started", ...CONSTRUCTION_STAGES].map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stage === "not_started"
                  ? "Not started"
                  : stageLabel(stage as (typeof CONSTRUCTION_STAGES)[number])}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {counts.get(stage) ?? 0}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ISO</TableHead>
                <TableHead>Spool</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Welds</TableHead>
                <TableHead>Supports</TableHead>
                <TableHead>NDE outstanding</TableHead>
                <TableHead>PWHT outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((status) => (
                <TableRow key={status.spoolRevisionId}>
                  <TableCell className="font-mono text-xs">{status.isoNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{status.spoolNumber}</TableCell>
                  <TableCell>{status.revisionNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
                  </TableCell>
                  <TableCell>
                    {status.lineChecked}/{status.lineTotal}
                  </TableCell>
                  <TableCell>
                    {status.weldComplete}/{status.weldTotal}
                  </TableCell>
                  <TableCell>
                    {status.supportRecorded}/{status.supportTotal}
                  </TableCell>
                  <TableCell>{status.ndePending}</TableCell>
                  <TableCell>{status.pwhtPending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Rewire the dashboard route.**

Replace `app/fabrication/dashboard/page.tsx` entirely:

```tsx
"use client"

import { FabricationDashboard } from "@/components/fabrication-dashboard"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { FabricationOverview } from "@/modules/construction/ui/fabrication/fabrication-overview"

export default function FabricationDashboardPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <FabricationDashboard />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a project to see fabrication progress.
      </p>
    )
  }

  return <FabricationOverview projectId={projectId} />
}
```

- [ ] **Step 5: Typecheck and commit.**

Run: `npm run typecheck`

Expected: exit `0`.

```bash
git add modules/construction/ui/fabrication/spool-stage-timeline.tsx \
        modules/construction/ui/fabrication/spool-picker.tsx \
        modules/construction/ui/fabrication/fabrication-overview.tsx \
        app/fabrication/dashboard/page.tsx
git commit -m "feat(construction): build the fabrication overview from database projections"
```

## Task 18: The material check screen

**Files:**
- Create: `modules/construction/ui/fabrication/material-check-screen.tsx`
- Modify: `app/fabrication/material-check/page.tsx`

**Interfaces:**
- Consumes `SpoolPicker`, `SpoolStageTimeline`, `describeMaterialCheckGate`, `toMaterialCheckPayload`, `loadBillOfMaterials`, `loadMaterialCheckItems`, `recordMaterialCheck`, `recordConstructionProgress`, `requestQc13Form`.
- Produces `<MaterialCheckScreen projectId />`.

- [ ] **Step 1: Write the screen.**

Create `modules/construction/ui/fabrication/material-check-screen.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeMaterialCheckGate, toMaterialCheckPayload } from "../../application/record-material-check"
import type { BillLine, TraceEntry } from "../../domain/material-check"
import {
  loadBillOfMaterials,
  loadMaterialCheckItems,
  loadSpoolStatus,
  recordConstructionProgress,
  recordMaterialCheck,
  requestQc13Form,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function MaterialCheckScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [lines, setLines] = useState<BillLine[]>([])
  const [traces, setTraces] = useState<Record<string, string>>({})
  const [checkedOn, setCheckedOn] = useState(today())
  const [refreshToken, setRefreshToken] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!spool) return
    const client = getSupabaseBrowserClient()
    void Promise.all([
      loadBillOfMaterials(client, spool.spoolRevisionId),
      loadMaterialCheckItems(client, spool.spoolRevisionId),
    ])
      .then(([billLines, existing]) => {
        setLines(billLines)
        setTraces(
          Object.fromEntries(existing.map((item) => [item.identCode, item.traceNumber])),
        )
      })
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "The bill of materials could not be loaded.",
        ),
      )
  }, [spool, refreshToken])

  const reload = useCallback(async () => {
    if (!spool) return
    setSpool(await loadSpoolStatus(getSupabaseBrowserClient(), spool.spoolRevisionId))
    setRefreshToken((token) => token + 1)
  }, [spool])

  const entries: TraceEntry[] = lines
    .filter((line) => (traces[line.identCode] ?? "").trim() !== "")
    .map((line) => ({
      identCode: line.identCode,
      traceNumber: traces[line.identCode],
      quantity: line.quantity,
    }))

  const gate = describeMaterialCheckGate(lines, entries, spool?.dates.start_fab ?? null)

  const startFab = async () => {
    if (!spool) return
    try {
      await recordConstructionProgress(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        "start_fab",
        checkedOn,
        crypto.randomUUID(),
      )
      await reload()
      toast.success("Start Fab recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Start Fab could not be recorded.")
    }
  }

  const issueQc13 = async () => {
    if (!spool) return
    try {
      const formNumber = await requestQc13Form(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        checkedOn,
        crypto.randomUUID(),
      )
      toast.success(`QC-13 ${formNumber} issued.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The QC-13 could not be issued.")
    }
  }

  const save = async () => {
    if (!spool || !gate.allowed) return
    setIsSaving(true)
    try {
      await recordMaterialCheck(
        getSupabaseBrowserClient(),
        toMaterialCheckPayload({
          spoolRevisionId: spool.spoolRevisionId,
          checkedOn,
          qc13FormId: null,
          entries,
        }),
        crypto.randomUUID(),
      )
      await reload()
      toast.success("Material traces recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The traces could not be recorded.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      {spool ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {spool.isoNumber} / {spool.spoolNumber} ({spool.revisionNumber})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpoolStageTimeline status={spool} />
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  Date
                  <Input
                    type="date"
                    value={checkedOn}
                    onChange={(event) => setCheckedOn(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void startFab()}
                  disabled={spool.dates.start_fab !== null}
                >
                  Record Start Fab
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void issueQc13()}
                  disabled={spool.dates.start_fab === null}
                >
                  Issue QC-13
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Material traceability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ident code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Heat / trace number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.spoolRevisionMaterialId}>
                      <TableCell className="font-mono text-xs">{line.identCode}</TableCell>
                      <TableCell>{line.description ?? "—"}</TableCell>
                      <TableCell>
                        {line.quantity ?? "—"} {line.unit ?? ""}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={traces[line.identCode] ?? ""}
                          onChange={(event) =>
                            setTraces((current) => ({
                              ...current,
                              [line.identCode]: event.target.value,
                            }))
                          }
                          placeholder={line.expectedTraceNumber ?? "Heat number from the QC-13"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {gate.reason ? (
                <p className="text-sm text-muted-foreground">{gate.reason}</p>
              ) : null}
              <Button type="button" onClick={() => void save()} disabled={!gate.allowed || isSaving}>
                Record traces
              </Button>
              <p className="text-xs text-muted-foreground">
                Material Check is derived: it appears on the timeline once every ident code
                carries a trace number the PML accepts.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to record material traces.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewire the route.**

Replace `app/fabrication/material-check/page.tsx` entirely:

```tsx
"use client"

import { Suspense } from "react"

import { MaterialCheckView } from "@/components/fabrication/material-check-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { MaterialCheckScreen } from "@/modules/construction/ui/fabrication/material-check-screen"

export default function MaterialCheckPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <MaterialCheckView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a project to record material traces.
      </p>
    )
  }

  return <MaterialCheckScreen projectId={projectId} />
}
```

- [ ] **Step 3: Typecheck and commit.**

Run: `npm run typecheck`

Expected: exit `0`.

```bash
git add modules/construction/ui/fabrication/material-check-screen.tsx \
        app/fabrication/material-check/page.tsx
git commit -m "feat(construction): add the Supabase material check screen"
```

## Task 19: The shop weld progress screen

**Files:**
- Create: `modules/construction/ui/fabrication/weld-progress-screen.tsx`
- Modify: `app/fabrication/weld-progress/page.tsx`

**Interfaces:**
- Consumes `SpoolPicker`, `describeWeldProgressGate`, `toWeldProgressPayload`, `loadWeldSummaries`, `loadWeldFormReferentials`, `recordWeldProgress`.
- Produces `<WeldProgressScreen projectId />`.

- [ ] **Step 1: Write the screen.**

Create `modules/construction/ui/fabrication/weld-progress-screen.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeWeldProgressGate, toWeldProgressPayload } from "../../application/record-weld-progress"
import type { PointAssignment, WeldPointType } from "../../domain/weld-progress"
import {
  loadWeldFormReferentials,
  loadWeldSummaries,
  recordWeldProgress,
  type SpoolStatus,
  type WeldFormReferentials,
  type WeldSummary,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_REFERENTIALS: WeldFormReferentials = {
  subcontractors: [],
  procedures: [],
  welders: [],
  reworkCodes: [],
}

export function WeldProgressScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [welds, setWelds] = useState<WeldSummary[]>([])
  const [selected, setSelected] = useState<WeldSummary | null>(null)
  const [referentials, setReferentials] = useState<WeldFormReferentials>(EMPTY_REFERENTIALS)
  const [subcontractorId, setSubcontractorId] = useState("")
  const [procedureId, setProcedureId] = useState("")
  const [weldOn, setWeldOn] = useState(today())
  const [rootWelderId, setRootWelderId] = useState("")
  const [capWelderId, setCapWelderId] = useState("")
  const [rootPercent, setRootPercent] = useState(50)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    void loadWeldFormReferentials(getSupabaseBrowserClient(), projectId)
      .then(setReferentials)
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Welding referentials could not be loaded.",
        ),
      )
  }, [projectId])

  const reloadWelds = useCallback(async () => {
    if (!spool) return
    setWelds(await loadWeldSummaries(getSupabaseBrowserClient(), spool.spoolRevisionId))
  }, [spool])

  useEffect(() => {
    if (!spool) return
    void reloadWelds().catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Weld joints could not be loaded."),
    )
  }, [spool, refreshToken, reloadWelds])

  const points: PointAssignment[] =
    rootWelderId && capWelderId
      ? [
          {
            pointType: "root" as WeldPointType,
            welderQualificationId: rootWelderId,
            completionPercent: rootPercent,
            weldedOn: weldOn,
          },
          {
            pointType: "cap" as WeldPointType,
            welderQualificationId: capWelderId,
            completionPercent: 100 - rootPercent,
            weldedOn: weldOn,
          },
        ]
      : []

  const procedure = referentials.procedures.find((item) => item.id === procedureId)

  const gate =
    selected && procedure && subcontractorId
      ? describeWeldProgressGate({
          joint: {
            weldLocation: selected.weldLocation,
            diameterInch: selected.diameterInch,
            thicknessMm: selected.thicknessMm,
            availablePointTypes: ["root", "cap"],
          },
          procedure,
          subcontractorId,
          weldOn,
          points,
          welders: referentials.welders,
          isLocked: selected.isLocked,
        })
      : { allowed: false, reason: "Select a joint, a subcontractor and a WPS." }

  const save = async () => {
    if (!selected || !gate.allowed) return
    try {
      await recordWeldProgress(
        getSupabaseBrowserClient(),
        toWeldProgressPayload({
          weldJointRevisionId: selected.weldJointRevisionId,
          subcontractorId,
          weldingProcedureId: procedureId,
          points,
          dates: {
            cuttingOn: null,
            bevelingOn: null,
            fitupOn: null,
            preheatOn: null,
            weldOn,
            dwirNumber: null,
            qcFormNumber: null,
            qc13FormId: null,
            reworkCodeId: null,
          },
        }),
        crypto.randomUUID(),
      )
      setRefreshToken((token) => token + 1)
      toast.success(`Weld ${selected.weldNumber} recorded.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The weld could not be recorded.")
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={(status) => {
              setSpool(status)
              setSelected(null)
            }}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Shop weld joints</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joint</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Thk</TableHead>
                  <TableHead>WPS</TableHead>
                  <TableHead>Welders</TableHead>
                  <TableHead>Weld date</TableHead>
                  <TableHead>NDE</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {welds.map((weld) => (
                  <TableRow
                    key={weld.weldJointRevisionId}
                    onClick={() => setSelected(weld)}
                    className={selected?.weldJointRevisionId === weld.weldJointRevisionId ? "bg-muted" : ""}
                  >
                    <TableCell className="font-mono text-xs">{weld.weldNumber}</TableCell>
                    <TableCell>{weld.diameterInch ?? "—"}</TableCell>
                    <TableCell>{weld.thicknessMm ?? "—"}</TableCell>
                    <TableCell>{weld.wpsCode ?? "—"}</TableCell>
                    <TableCell>{weld.welders.join(", ") || "—"}</TableCell>
                    <TableCell>{weld.weldOn ?? "—"}</TableCell>
                    <TableCell>
                      {weld.obligationPending}/{weld.obligationTotal}
                    </TableCell>
                    <TableCell>
                      {weld.isLocked ? <Badge variant="outline">Locked</Badge> : null}
                      {weld.weldLocation !== "shop" ? (
                        <Badge variant="outline">{weld.weldLocation}</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>Record {selected.weldNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Subcontractor
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={subcontractorId}
                    onChange={(event) => setSubcontractorId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {referentials.subcontractors.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  WPS
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={procedureId}
                    onChange={(event) => setProcedureId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {referentials.procedures.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Root welder
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={rootWelderId}
                    onChange={(event) => setRootWelderId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {referentials.welders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.welderCode}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Cap welder
                  <select
                    className="mt-1 w-full rounded border px-2 py-1"
                    value={capWelderId}
                    onChange={(event) => setCapWelderId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {referentials.welders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.welderCode}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Root percent
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={rootPercent}
                    onChange={(event) => setRootPercent(Number(event.target.value))}
                  />
                </label>
                <label className="text-sm">
                  Weld date
                  <Input
                    type="date"
                    value={weldOn}
                    onChange={(event) => setWeldOn(event.target.value)}
                  />
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                Root and Cap always total 100 percent; the cap takes {100 - rootPercent}.
              </p>
              {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
              <Button type="button" onClick={() => void save()} disabled={!gate.allowed}>
                Record weld progress
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewire the route.**

Replace `app/fabrication/weld-progress/page.tsx` with the mode switch. Keep the existing 190-line demo component by moving it into `components/fabrication/weld-progress-demo-view.tsx` unchanged (a pure `git mv` plus an export rename to `WeldProgressDemoView`), then:

```tsx
"use client"

import { WeldProgressDemoView } from "@/components/fabrication/weld-progress-demo-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { WeldProgressScreen } from "@/modules/construction/ui/fabrication/weld-progress-screen"

export default function WeldProgressPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <WeldProgressDemoView />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">Select a project to record weld progress.</p>
    )
  }

  return <WeldProgressScreen projectId={projectId} />
}
```

- [ ] **Step 3: Typecheck and commit.**

Run: `npm run typecheck`

Expected: exit `0`.

```bash
git add modules/construction/ui/fabrication/weld-progress-screen.tsx \
        components/fabrication/weld-progress-demo-view.tsx \
        app/fabrication/weld-progress/page.tsx
git commit -m "feat(construction): add the Supabase shop weld progress screen"
```

## Task 20: The QC release screen, supports, PWHT and obligations

**Files:**
- Create: `modules/construction/ui/fabrication/qc-release-screen.tsx`
- Modify: `app/fabrication/qc-release/page.tsx`
- Modify: `app/fabrication/pwht-release/page.tsx`

**Interfaces:**
- Consumes `SpoolPicker`, `SpoolStageTimeline`, `describeReleaseGate`, `loadReadiness`, `loadObligations`, `loadPwhtRequirements`, `loadSupports`, `recordSupportProgress`, `recordNdeObligationOutcome`, `recordPwhtResult`, `releaseQualityRecord`.
- Produces `<QcReleaseScreen projectId />`. The same screen backs `/fabrication/qc-release` and `/fabrication/pwht-release`; both routes are views of one gate, and splitting them would duplicate the readiness panel.

- [ ] **Step 1: Write the screen.**

Create `modules/construction/ui/fabrication/qc-release-screen.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeReleaseGate } from "../../application/release-spool"
import type { FabricationReadiness } from "../../domain/quality-release"
import {
  loadObligations,
  loadPwhtRequirements,
  loadReadiness,
  loadSpoolStatus,
  loadSupports,
  recordNdeObligationOutcome,
  recordPwhtResult,
  recordSupportProgress,
  releaseQualityRecord,
  type ObligationRow,
  type PwhtRow,
  type SpoolStatus,
  type SupportRow,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function QcReleaseScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [readiness, setReadiness] = useState<FabricationReadiness | null>(null)
  const [obligations, setObligations] = useState<ObligationRow[]>([])
  const [pwht, setPwht] = useState<PwhtRow[]>([])
  const [supports, setSupports] = useState<SupportRow[]>([])
  const [releasedOn, setReleasedOn] = useState(today())
  const [chartNumber, setChartNumber] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  const reload = useCallback(async () => {
    if (!spool) return
    const client = getSupabaseBrowserClient()
    const [status, nextReadiness, nextObligations, nextPwht, nextSupports] = await Promise.all([
      loadSpoolStatus(client, spool.spoolRevisionId),
      loadReadiness(client, spool.spoolRevisionId),
      loadObligations(client, spool.spoolRevisionId),
      loadPwhtRequirements(client, spool.spoolRevisionId),
      loadSupports(client, spool.spoolRevisionId),
    ])
    setSpool(status)
    setReadiness(nextReadiness)
    setObligations(nextObligations)
    setPwht(nextPwht)
    setSupports(nextSupports)
  }, [spool])

  useEffect(() => {
    if (!spool) return
    void reload().catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "The spool could not be loaded."),
    )
    // reload closes over `spool`; refreshToken is what forces a re-run after a mutation.
  }, [spool?.spoolRevisionId, refreshToken])

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action()
      setRefreshToken((token) => token + 1)
      toast.success(success)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : failure)
    }
  }

  const gate = readiness
    ? describeReleaseGate(readiness)
    : { allowed: false, reason: "Select a spool." }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      {spool ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {spool.isoNumber} / {spool.spoolNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpoolStageTimeline status={spool} />
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  Release date
                  <Input
                    type="date"
                    value={releasedOn}
                    onChange={(event) => setReleasedOn(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  disabled={!gate.allowed || spool.dates.qc_release !== null}
                  onClick={() =>
                    void run(
                      () =>
                        releaseQualityRecord(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          releasedOn,
                          null,
                          crypto.randomUUID(),
                        ),
                      "The spool is QC released.",
                      "The QC release could not be recorded.",
                    )
                  }
                >
                  QC release spool
                </Button>
              </div>
              {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Support</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supports.map((support) => (
                    <TableRow key={support.supportRevisionId}>
                      <TableCell className="font-mono text-xs">{support.supportNumber}</TableCell>
                      <TableCell>{support.supportType ?? "—"}</TableCell>
                      <TableCell>{support.quantity}</TableCell>
                      <TableCell>{support.installedOn ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={support.installedOn !== null}
                          onClick={() =>
                            void run(
                              () =>
                                recordSupportProgress(
                                  getSupabaseBrowserClient(),
                                  support.supportRevisionId,
                                  releasedOn,
                                  crypto.randomUUID(),
                                ),
                              "Support installation recorded.",
                              "The support could not be recorded.",
                            )
                          }
                        >
                          Mark installed
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>NDE obligations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Selection</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((obligation) => (
                    <TableRow key={obligation.id}>
                      <TableCell className="font-mono text-xs">{obligation.weldNumber}</TableCell>
                      <TableCell className="uppercase">{obligation.method}</TableCell>
                      <TableCell>{obligation.requiredCoverage}%</TableCell>
                      <TableCell>{obligation.selectionMode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{obligation.disposition}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={obligation.disposition !== "pending"}
                          onClick={() =>
                            void run(
                              () =>
                                recordNdeObligationOutcome(
                                  getSupabaseBrowserClient(),
                                  obligation.id,
                                  "satisfied",
                                  crypto.randomUUID(),
                                ),
                              "The obligation is satisfied.",
                              "The obligation could not be closed.",
                            )
                          }
                        >
                          Mark accepted
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                Closing obligations here is an interim action. Track 06 replaces it with NDE
                batches and results.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PWHT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm">
                Chart number
                <Input
                  value={chartNumber}
                  onChange={(event) => setChartNumber(event.target.value)}
                  placeholder="Chart number from the PWHT record"
                />
              </label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pwht.map((requirement) => (
                    <TableRow key={requirement.id}>
                      <TableCell className="font-mono text-xs">{requirement.weldNumber}</TableCell>
                      <TableCell>{requirement.thresholdMm ?? "any"}</TableCell>
                      <TableCell>{requirement.acceptedOn ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={requirement.acceptedOn !== null || chartNumber.trim() === ""}
                          onClick={() =>
                            void run(
                              () =>
                                recordPwhtResult(
                                  getSupabaseBrowserClient(),
                                  requirement.id,
                                  chartNumber,
                                  releasedOn,
                                  "accepted",
                                  crypto.randomUUID(),
                                ),
                              "PWHT result recorded.",
                              "The PWHT result could not be recorded.",
                            )
                          }
                        >
                          Record accepted
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to review its QC release.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewire both routes.**

Replace `app/fabrication/qc-release/page.tsx`:

```tsx
"use client"

import { Suspense } from "react"

import { QCReleaseView } from "@/components/fabrication/qc-release-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { QcReleaseScreen } from "@/modules/construction/ui/fabrication/qc-release-screen"

export default function QCReleasePage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <QCReleaseView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to review QC release.</p>
  }

  return <QcReleaseScreen projectId={projectId} />
}
```

Replace `app/fabrication/pwht-release/page.tsx`:

```tsx
"use client"

import { PWHTReleaseView } from "@/components/fabrication/pwht-release-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { QcReleaseScreen } from "@/modules/construction/ui/fabrication/qc-release-screen"

export default function PWHTReleasePage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <PWHTReleaseView />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to review PWHT.</p>
  }

  return <QcReleaseScreen projectId={projectId} />
}
```

If `components/fabrication/pwht-release-view.tsx` does not export `PWHTReleaseView`, use the name it does export — do not rename the demo component.

- [ ] **Step 3: Typecheck and commit.**

Run: `npm run typecheck`

Expected: exit `0`.

```bash
git add modules/construction/ui/fabrication/qc-release-screen.tsx \
        app/fabrication/qc-release/page.tsx app/fabrication/pwht-release/page.tsx
git commit -m "feat(construction): add the Supabase QC release, supports, NDE and PWHT screen"
```

## Task 21: Paint, laydown and the route wiring

**Files:**
- Create: `modules/construction/ui/fabrication/paint-laydown-screen.tsx`
- Modify: `app/fabrication/paint/page.tsx`
- Modify: `app/fabrication/laydown/page.tsx`
- Modify: `config/route-capabilities.ts`
- Modify: `config/route-capabilities.test.ts`

**Interfaces:**
- Consumes `SpoolPicker`, `SpoolStageTimeline`, `describePaintGate`, `loadPaintOptions`, `loadLocations`, `recordConstructionProgress`, `recordPaintProgress`, `recordLaydown`.
- Produces `<PaintLaydownScreen projectId mode="paint" | "laydown" />`.

- [ ] **Step 1: Write the screen.**

Create `modules/construction/ui/fabrication/paint-laydown-screen.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describePaintGate } from "../../application/release-spool"
import {
  loadLocations,
  loadPaintOptions,
  loadSpoolStatus,
  recordConstructionProgress,
  recordLaydown,
  recordPaintProgress,
  type LocationOption,
  type PaintOption,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function PaintLaydownScreen({
  projectId,
  mode,
}: {
  projectId: string
  mode: "paint" | "laydown"
}) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [paintOptions, setPaintOptions] = useState<PaintOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [lineServiceId, setLineServiceId] = useState("")
  const [paintedOn, setPaintedOn] = useState(today())
  const [finalQcOn, setFinalQcOn] = useState("")
  const [measuredDft, setMeasuredDft] = useState("")
  const [w10p, setW10p] = useState("")
  const [locationId, setLocationId] = useState("")
  const [storedOn, setStoredOn] = useState(today())
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const client = getSupabaseBrowserClient()
    void Promise.all([loadPaintOptions(client, projectId), loadLocations(client, projectId)])
      .then(([options, locationRows]) => {
        setPaintOptions(options)
        setLocations(locationRows)
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Referentials could not be loaded."),
      )
  }, [projectId])

  const reload = useCallback(async () => {
    if (!spool) return
    setSpool(await loadSpoolStatus(getSupabaseBrowserClient(), spool.spoolRevisionId))
    setRefreshToken((token) => token + 1)
  }, [spool])

  const option = paintOptions.find((item) => item.lineServiceId === lineServiceId)
  const measured = measuredDft.trim() === "" ? null : Number(measuredDft)
  const gate = option
    ? describePaintGate(spool?.dates.sent_to_paint ?? null, option.requiredFinalDftMicrons, measured, w10p)
    : { allowed: false, reason: "Select the line service so the paint matrix rule can be resolved." }

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action()
      await reload()
      toast.success(success)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : failure)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      {spool ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {spool.isoNumber} / {spool.spoolNumber}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpoolStageTimeline status={spool} />
            </CardContent>
          </Card>

          {mode === "paint" ? (
            <Card>
              <CardHeader>
                <CardTitle>Painting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={spool.dates.qc_release === null || spool.dates.sent_to_paint !== null}
                  onClick={() =>
                    void run(
                      () =>
                        recordConstructionProgress(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          "sent_to_paint",
                          paintedOn,
                          crypto.randomUUID(),
                        ),
                      "Sent to Paint recorded.",
                      "Sent to Paint could not be recorded.",
                    )
                  }
                >
                  Record Sent to Paint
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Line service
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={lineServiceId}
                      onChange={(event) => setLineServiceId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {paintOptions.map((item) => (
                        <option key={item.lineServiceId} value={item.lineServiceId}>
                          {item.lineServiceCode} — {item.ralCode} ({item.requiredFinalDftMicrons} µm)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Painted on
                    <Input
                      type="date"
                      value={paintedOn}
                      onChange={(event) => setPaintedOn(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Final QC on
                    <Input
                      type="date"
                      value={finalQcOn}
                      onChange={(event) => setFinalQcOn(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Measured DFT (µm)
                    <Input
                      type="number"
                      value={measuredDft}
                      onChange={(event) => setMeasuredDft(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    W10P form number
                    <Input value={w10p} onChange={(event) => setW10p(event.target.value)} />
                  </label>
                </div>

                {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
                <Button
                  type="button"
                  disabled={!gate.allowed}
                  onClick={() =>
                    void run(
                      () =>
                        recordPaintProgress(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          lineServiceId,
                          {
                            painted_on: paintedOn,
                            ...(finalQcOn ? { final_qc_on: finalQcOn } : {}),
                            ...(measured !== null ? { measured_dft_microns: measured } : {}),
                            ...(w10p ? { w10p_form_number: w10p } : {}),
                          },
                          crypto.randomUUID(),
                        ),
                      "Painting recorded.",
                      "Painting could not be recorded.",
                    )
                  }
                >
                  Record painting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Laydown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Location
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={locationId}
                      onChange={(event) => setLocationId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {locations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Stored on
                    <Input
                      type="date"
                      value={storedOn}
                      onChange={(event) => setStoredOn(event.target.value)}
                    />
                  </label>
                </div>
                {spool.dates.final_qc === null ? (
                  <p className="text-sm text-destructive">
                    Record the final QC before moving the spool to laydown.
                  </p>
                ) : null}
                <Button
                  type="button"
                  disabled={locationId === "" || spool.dates.final_qc === null}
                  onClick={() =>
                    void run(
                      () =>
                        recordLaydown(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          locationId,
                          storedOn,
                          crypto.randomUUID(),
                        ),
                      "Laydown recorded.",
                      "Laydown could not be recorded.",
                    )
                  }
                >
                  Record laydown
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewire both routes.**

`app/fabrication/paint/page.tsx`:

```tsx
"use client"

import { Suspense } from "react"

import { PaintView } from "@/components/fabrication/paint-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { PaintLaydownScreen } from "@/modules/construction/ui/fabrication/paint-laydown-screen"

export default function PaintPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <PaintView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to record painting.</p>
  }

  return <PaintLaydownScreen projectId={projectId} mode="paint" />
}
```

`app/fabrication/laydown/page.tsx` is the same file with `LaydownView`, `mode="laydown"` and the message "Select a project to record laydown."

- [ ] **Step 3: Add the sub-route capabilities.**

The `/fabrication` prefix already maps to `fabrication.view` in `config/route-capabilities.ts:13`. Recording work needs more than viewing, so add the two write routes **above** the `/fabrication` entry (`requiredCapabilityForPath` returns the first prefix match, so order matters):

```typescript
  ["/fabrication/weld-progress", "fabrication.progress.record"],
  ["/fabrication/material-check", "fabrication.progress.record"],
  ["/fabrication/qc-release", "fabrication.qc.release"],
  ["/fabrication/pwht-release", "fabrication.qc.release"],
  ["/fabrication", "fabrication.view"],
```

Then add to `config/route-capabilities.test.ts`:

```typescript
assert.equal(requiredCapabilityForPath("/fabrication"), "fabrication.view")
assert.equal(requiredCapabilityForPath("/fabrication/dashboard"), "fabrication.view")
assert.equal(requiredCapabilityForPath("/fabrication/material-check"), "fabrication.progress.record")
assert.equal(requiredCapabilityForPath("/fabrication/weld-progress"), "fabrication.progress.record")
assert.equal(requiredCapabilityForPath("/fabrication/qc-release"), "fabrication.qc.release")
assert.equal(requiredCapabilityForPath("/fabrication/pwht-release"), "fabrication.qc.release")
```

`config/navigation.ts` already lists every one of these routes (lines 140–186); no navigation change is needed. Verify by reading it rather than by editing it.

- [ ] **Step 4: Run the config test and typecheck.**

Run:
```bash
node --import tsx --test config/route-capabilities.test.ts && npm run typecheck
```

Expected: PASS and exit `0`.

- [ ] **Step 5: Commit.**

```bash
git add modules/construction/ui/fabrication/paint-laydown-screen.tsx \
        app/fabrication/paint/page.tsx app/fabrication/laydown/page.tsx \
        config/route-capabilities.ts config/route-capabilities.test.ts
git commit -m "feat(construction): add the Supabase paint and laydown screens"
```

### Gate D checklist

- [ ] `npm run typecheck` exits `0`.
- [ ] `npm run test:unit` exits `0`.
- [ ] Every `/fabrication/**` route renders the demo component in demo mode and a `modules/construction` screen in Supabase mode.
- [ ] Every mutating button passes `crypto.randomUUID()` as its idempotency key.
- [ ] Every success toast fires after an awaited call resolves.

# Gate E — Fixtures, retirement and verification

## Task 22: Track 05 browser fixtures

**Files:**
- Create: `scripts/bootstrap-track05-browser-fixtures.ts`
- Create: `scripts/bootstrap-track05-browser-fixtures.test.ts`
- Create: `docs/TRACK05_BROWSER_FIXTURES.md`
- Modify: `package.json`

**Interfaces:**
- Produces `isLocalhost(url)`, `buildTrack05FixturePlan(projectId, subcontractorId, serviceClassId, wpsId)` returning `Track05FixturePlan`, `planInsertCount(plan)`. It follows `scripts/bootstrap-track04-browser-fixtures.ts` exactly: pure builders that are unit tested, plus a `run()` that only executes when the file is the entry point.

- [ ] **Step 1: Write the failing test.**

Create `scripts/bootstrap-track05-browser-fixtures.test.ts`:

```typescript
import assert from "node:assert/strict"

import {
  buildTrack05FixturePlan,
  isLocalhost,
  planInsertCount,
} from "./bootstrap-track05-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://abc.supabase.co"), false)

const plan = buildTrack05FixturePlan("project-1", "sub-1", "sc-1", "wps-1")

assert.ok(plan.subcontractors.some((row) => row.code === "SUB-T5"))
assert.ok(plan.weldingProcedures.every((row) => row.diameter_to >= row.diameter_from))
assert.ok(plan.weldingProcedures.every((row) => row.thickness_to >= row.thickness_from))
// Two welders, because a joint's second point needs a different one.
assert.equal(plan.welders.length, 2)
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"))
assert.equal(plan.welderWpsLinks.length, 2)
// The PML must cover the ident codes Track 04's SpoolGen fixture imports.
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-100"))
assert.ok(plan.pmlRecords.every((row) => row.trace_number.startsWith("HEAT-")))
assert.ok(plan.locations.length > 0)
assert.ok(plan.paintMatrixRules.every((row) => row.required_final_dft_microns > 0))
assert.equal(planInsertCount(plan), 12)
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test scripts/bootstrap-track05-browser-fixtures.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the script.**

Create `scripts/bootstrap-track05-browser-fixtures.ts`:

```typescript
import { createClient } from "@supabase/supabase-js"

export const isLocalhost = (url: string): boolean => {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export interface Track05FixturePlan {
  subcontractors: { project_id: string; code: string; name: string }[]
  weldingProcedures: {
    project_id: string
    subcontractor_id: string
    material_type_id: string
    code: string
    process: string
    diameter_from: number
    diameter_to: number
    thickness_from: number
    thickness_to: number
    revision: string
    approved_on: string
  }[]
  welders: {
    project_id: string
    subcontractor_id: string
    welder_code: string
    full_name: string
    expires_on: string
  }[]
  welderWpsLinks: { welder_code: string; wps_id: string }[]
  pmlRecords: {
    project_id: string
    mrr_number: string
    ident_code: string
    trace_number: string
  }[]
  locations: { project_id: string; code: string; description: string }[]
  paintMatrixRules: { project_id: string; required_final_dft_microns: number }[]
}

/**
 * The referentials a Track 05 walkthrough needs on top of the Track 01–04 fixtures.
 * `materialTypeId` comes from the same system reference entry the Track 04 fixture used, so
 * the WPS material check passes for the imported spools.
 */
export function buildTrack05FixturePlan(
  projectId: string,
  subcontractorId: string,
  materialTypeId: string,
  wpsId: string,
): Track05FixturePlan {
  return {
    subcontractors: [{ project_id: projectId, code: "SUB-T5", name: "Track 05 fabricator" }],
    weldingProcedures: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        material_type_id: materialTypeId,
        code: "WPS-T5",
        process: "GTAW",
        diameter_from: 1,
        diameter_to: 24,
        thickness_from: 2,
        thickness_to: 30,
        revision: "R0",
        approved_on: "2026-01-01",
      },
    ],
    welders: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-1",
        full_name: "Track 05 welder one",
        expires_on: "2028-01-01",
      },
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-2",
        full_name: "Track 05 welder two",
        expires_on: "2028-01-01",
      },
    ],
    welderWpsLinks: [
      { welder_code: "W-T5-1", wps_id: wpsId },
      { welder_code: "W-T5-2", wps_id: wpsId },
    ],
    pmlRecords: [
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-100",
        trace_number: "HEAT-T5-100",
      },
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-200",
        trace_number: "HEAT-T5-200",
      },
    ],
    locations: [{ project_id: projectId, code: "YARD-T5", description: "Track 05 laydown yard" }],
    paintMatrixRules: [{ project_id: projectId, required_final_dft_microns: 240 }],
  }
}

export const planInsertCount = (plan: Track05FixturePlan): number =>
  plan.subcontractors.length +
  plan.weldingProcedures.length +
  plan.welders.length +
  plan.welderWpsLinks.length +
  plan.pmlRecords.length +
  plan.locations.length +
  plan.paintMatrixRules.length

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }

  const client = createClient(url, key)

  const { data: project } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()
  if (!project) throw new Error("Project TRACK01-A was not found. Run the Track 01 bootstrap first.")

  const { data: material } = await client
    .from("system_reference_entries")
    .select("id")
    .eq("kind", "material_type")
    .limit(1)
    .maybeSingle()
  if (!material) throw new Error("No material_type system reference entry exists.")

  const seed = buildTrack05FixturePlan(project.id, "", material.id, "")

  const subcontractors = await client
    .from("project_subcontractors")
    .upsert(seed.subcontractors, { onConflict: "project_id,code" })
  const locations = await client
    .from("project_locations")
    .upsert(seed.locations, { onConflict: "project_id,code" })
  const pml = await client
    .from("piping_material_records")
    .upsert(seed.pmlRecords, { onConflict: "project_id,ident_code,trace_number" })
  if (subcontractors.error || locations.error || pml.error) {
    throw new Error(
      subcontractors.error?.message ?? locations.error?.message ?? pml.error?.message,
    )
  }

  const { data: subcontractor } = await client
    .from("project_subcontractors")
    .select("id")
    .eq("project_id", project.id)
    .eq("code", "SUB-T5")
    .single()
  if (!subcontractor) throw new Error("The subcontractor fixture was not written.")

  const withSubcontractor = buildTrack05FixturePlan(project.id, subcontractor.id, material.id, "")
  const procedures = await client
    .from("project_welding_procedures")
    .upsert(withSubcontractor.weldingProcedures, { onConflict: "project_id,code,revision" })
  const welders = await client
    .from("welder_qualifications")
    .upsert(withSubcontractor.welders, { onConflict: "project_id,welder_code" })
  if (procedures.error || welders.error) {
    throw new Error(procedures.error?.message ?? welders.error?.message)
  }

  const { data: wps } = await client
    .from("project_welding_procedures")
    .select("id")
    .eq("project_id", project.id)
    .eq("code", "WPS-T5")
    .single()
  const { data: welderRows } = await client
    .from("welder_qualifications")
    .select("id, welder_code")
    .eq("project_id", project.id)
    .in("welder_code", ["W-T5-1", "W-T5-2"])
  if (!wps || !welderRows) throw new Error("The WPS or welder fixtures were not written.")

  const links = await client.from("welder_wps_qualifications").upsert(
    welderRows.map((welder) => ({ welder_qualification_id: welder.id, wps_id: wps.id })),
    { onConflict: "welder_qualification_id,wps_id" },
  )
  if (links.error) throw new Error(links.error.message)

  const plan = buildTrack05FixturePlan(project.id, subcontractor.id, material.id, wps.id)
  console.log(
    `Track 05 fixtures reconciled: ${planInsertCount(plan)} rows upserted into project ${project.id}.`,
  )
}

if (process.argv[1]?.endsWith("bootstrap-track05-browser-fixtures.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Add the npm script.**

In `package.json`, after the `bootstrap:track04-browser-fixtures` line:

```json
    "bootstrap:track05-browser-fixtures": "tsx scripts/bootstrap-track05-browser-fixtures.ts",
```

- [ ] **Step 5: Run the test, then the script twice.**

Run:
```bash
node --import tsx --test scripts/bootstrap-track05-browser-fixtures.test.ts
```

Expected: PASS.

Then, with a running local Supabase and the service role key exported out of band:
```bash
npm run bootstrap:track05-browser-fixtures && npm run bootstrap:track05-browser-fixtures
```

Expected: both runs print the same reconciliation line and exit `0` — the script is idempotent.

- [ ] **Step 6: Write the fixture guide.**

Create `docs/TRACK05_BROWSER_FIXTURES.md` following `docs/TRACK04_BROWSER_FIXTURES.md`. It must state: the prerequisite bootstraps (Track 01 through 04, in order), the exported environment variables, the fixture codes this script writes (`SUB-T5`, `WPS-T5`, `W-T5-1`, `W-T5-2`, `IDN-T5-100`, `IDN-T5-200`, `YARD-T5`), and the exact click path of the manual acceptance in Task 26.

- [ ] **Step 7: Commit.**

```bash
git add scripts/bootstrap-track05-browser-fixtures.ts \
        scripts/bootstrap-track05-browser-fixtures.test.ts \
        docs/TRACK05_BROWSER_FIXTURES.md package.json
git commit -m "test(construction): add Track 05 browser fixtures"
```

## Task 23: Retire the demo stores from Supabase mode

**Files:**
- Create: `modules/construction/construction-boundaries.test.ts`
- Modify: any `/fabrication/**` page still importing a store directly

**Interfaces:**
- Produces a boundary test that reads the module source and fails on a forbidden import. It is the executable form of roadmap §17's *"remove Supabase mode usage of `spools-store`, `welds-store`, `qc-release-store`, `paint-store`, `laydown-store`, `pwht-store`"*.

- [ ] **Step 1: Write the failing test.**

Create `modules/construction/construction-boundaries.test.ts`:

```typescript
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const MODULE_ROOT = "modules/construction"
const APP_ROOT = "app/fabrication"

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const sources = walk(MODULE_ROOT).filter(
  (path) => path.endsWith(".ts") || path.endsWith(".tsx"),
)

// Plan section 3.15: the construction module never reaches into demo state.
for (const path of sources) {
  const source = readFileSync(path, "utf8")
  assert.equal(
    /from "@\/store\//.test(source),
    false,
    `${path} must not import from store/`,
  )
}

// Domain and application stay free of infrastructure.
for (const path of sources.filter(
  (candidate) => candidate.includes("/domain/") || candidate.includes("/application/"),
)) {
  const source = readFileSync(path, "utf8")
  assert.equal(/@supabase\//.test(source), false, `${path} must not import Supabase`)
  assert.equal(/from "react"/.test(source), false, `${path} must not import React`)
}

// Every fabrication page must branch on the app mode rather than assume demo state.
const RETIRED_STORES = [
  "spools-store",
  "welds-store",
  "qc-release-store",
  "paint-store",
  "laydown-store",
  "pwht-store",
]

for (const path of walk(APP_ROOT).filter((candidate) => candidate.endsWith("page.tsx"))) {
  const source = readFileSync(path, "utf8")
  assert.ok(source.includes("useAppMode"), `${path} must branch on the app mode`)
  for (const store of RETIRED_STORES) {
    assert.equal(
      source.includes(store),
      false,
      `${path} must not import ${store} directly; the demo component owns it`,
    )
  }
}
```

- [ ] **Step 2: Run it and see what it catches.**

Run: `node --import tsx --test modules/construction/construction-boundaries.test.ts`

Expected: it either passes (Gate D already rewired every page) or names the exact file still importing a store. Fix the named file by moving the store usage into the demo component under `components/fabrication/`, never by deleting the store — demo mode still needs it.

- [ ] **Step 3: Confirm the stores survive for demo mode.**

Run:
```bash
rg -l "spools-store|welds-store|qc-release-store|paint-store|laydown-store|pwht-store" components/ app/ | sort
```

Expected: hits only under `components/`, never under `app/fabrication/`.

- [ ] **Step 4: Commit.**

```bash
git add modules/construction/construction-boundaries.test.ts app/fabrication
git commit -m "refactor(construction): keep demo stores out of Supabase mode"
```

## Task 24: The construction progress model document

**Files:**
- Create: `docs/architecture/construction-progress-model.md`

- [ ] **Step 1: Write the document.**

Create `docs/architecture/construction-progress-model.md`. It is the reference Track 06, 07 and 08 will read before extending these tables, so it must contain, with no forward references to code that does not exist:

1. **The ledger.** `construction_progress_events` is append-only; a correction is a compensating event. The `phase` column exists so Track 07 parameterises rather than clones.
2. **The eight stages** and which command owns each, copied from plan §3.3 — including the fact that `fabricated` has no row.
3. **The derived states** and the exact view that computes each: `spool_material_check_status` inputs inside `spool_fabrication_readiness`, `is_fabricated`, `fabricated_on`, `is_releasable`.
4. **Revision binding.** Every construction row carries `spool_revision_id`; `PQC31` is what a superseded revision raises; `materialize_progress_copies` is the only writer of `revision_progress_copies.copied_payload`.
5. **The NDE seam.** What Track 05 owns, what Track 06 replaces, and the explicit warning that `record_nde_obligation_outcome` is interim.
6. **Idempotency.** How `claim_command_receipt` / `complete_command_receipt` work, and the rule that every new command in later tracks uses them.
7. **The `PQC30`–`PQC39` table** from plan §3.13.

- [ ] **Step 2: Commit.**

```bash
git add docs/architecture/construction-progress-model.md
git commit -m "docs(construction): document the construction progress model"
```

## Task 25: Full automated verification

**Files:** none — this task runs commands and records results.

- [ ] **Step 1: Reset the database and regenerate types.**

Run:
```bash
/opt/homebrew/bin/supabase db reset \
  && /opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

Expected: no error, and `git diff --stat lib/supabase/database.types.ts` shows no change since Task 8 unless a later task added a migration.

- [ ] **Step 2: Run the whole verification suite.**

Run:
```bash
npm run verify
```

Expected: exit `0`. This runs `typecheck`, `test:unit`, `test:db` and `validate:fixtures` in sequence.

- [ ] **Step 3: Record the actual counts.**

Fill in the Gate A checklist and the exit criteria below with the numbers this run produced. Do not copy numbers from an earlier run.

- [ ] **Step 4: Lint.**

Run: `npm run lint`

Expected: exit `0`. Fix anything it reports in the files this track created; do not fix unrelated pre-existing findings.

- [ ] **Step 5: Review the diff and commit any type or lint fixes.**

Run: `git diff --check && git status --short`

Expected: no whitespace errors, and no unrelated working-tree edits lost.

```bash
git add -A
git commit -m "chore(construction): verify Track 05 end to end"
```

## Task 26: Manual browser acceptance

**Files:** none — this task drives the running application.

Roadmap §17 exit criteria state that a spool must travel the whole path through Supabase alone, that a refresh or a second user sees the result, and that the dashboard is built from projections. Only a browser run proves those three.

- [ ] **Step 1: Start the stack.**

Run:
```bash
/opt/homebrew/bin/supabase start && npm run dev
```

with `NEXT_PUBLIC_PIPEQC_MODE=supabase` in the environment.

- [ ] **Step 2: Seed every track's fixtures in order.**

Run:
```bash
npm run bootstrap:track01-browser-fixtures \
  && npm run bootstrap:track02-browser-fixtures \
  && npm run bootstrap:track03-browser-fixtures \
  && npm run bootstrap:track04-browser-fixtures \
  && npm run bootstrap:track05-browser-fixtures
```

Expected: five reconciliation lines, no error.

- [ ] **Step 3: Import a SpoolGen file set so there is an accepted revision.**

Sign in as the Track 01 project admin, open `/spooling/import`, upload the Track 04 sample files, validate, resolve any decisions and apply. Confirm on `/spooling/browse` that the ISO has one accepted revision with at least one spool, one weld joint, one support and two ident codes.

- [ ] **Step 4: Walk the golden path.**

In order, and confirming the stage timeline advances after each:

1. `/fabrication/material-check` — select the spool, **Record Start Fab**, **Issue QC-13**, enter both heat numbers, **Record traces**. The Material Check tile gains a date without you typing one.
2. `/fabrication/weld-progress` — select the joint, choose the subcontractor, `WPS-T5`, `W-T5-1` for root and `W-T5-2` for cap, weld date today, **Record weld progress**. The NDE column shows the obligations the matrix generated.
3. `/fabrication/qc-release` — **Mark installed** on the support. The Fabricated tile now has a date. **QC release spool** is still disabled and the page names the outstanding obligation.
4. Same screen — **Mark accepted** on every obligation and, if the matrix required PWHT, enter a chart number and **Record accepted**. **QC release spool** becomes enabled. Click it.
5. `/fabrication/paint` — **Record Sent to Paint**, choose the line service, enter a DFT **below** the requirement and confirm the refusal message, then a compliant DFT with a W10P number and **Record painting**.
6. `/fabrication/laydown` — choose `YARD-T5` and **Record laydown**.

- [ ] **Step 5: Prove durability.**

Hard-refresh `/fabrication/dashboard`. Expected: the spool's row shows `laydown` as its current stage and every count reflects the work, with no local storage involved. Open the same page in a private window signed in as a second project member and confirm the same numbers.

- [ ] **Step 6: Prove the negative paths in the browser.**

1. Try to record weld progress on the joint again. Expected: the screen refuses with the locked-joint message, not a raw SQL error.
2. Create a new manual revision for that ISO on `/spooling/revisions`, then return to `/fabrication/material-check` and try to record a trace against the **old** spool revision. Expected: the revision message from `PQC31`, phrased for a site engineer.
3. Sign in as a user holding `fabrication.view` only and confirm `/fabrication/qc-release` is not reachable from the navigation and the release button is absent.

- [ ] **Step 7: Record the outcome.**

Write the result of each of the six steps into `docs/TRACK05_BROWSER_FIXTURES.md` under a "Manual acceptance run" heading, with the date and the app version. If any step failed, stop and fix it before Task 27.

```bash
git add docs/TRACK05_BROWSER_FIXTURES.md
git commit -m "docs(construction): record the Track 05 manual acceptance run"
```

## Task 27: Documentation and Track 05 exit

**Files:**
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Modify: `docs/superpowers/plans/2026-08-04-track-05-fabrication.md`

- [ ] **Step 1: Update the backend foundation document.**

Add the Track 05 tables, views and RPCs to `docs/SUPABASE_BACKEND_FOUNDATION.md` in the same shape the Track 04 entries use: table name, owning context, who may read it, and which command writes it.

- [ ] **Step 2: Update the next-agent context.**

In `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`, state that Track 05 is complete, that `command_receipts` is now the shared idempotency mechanism every later track must use, and that `record_nde_obligation_outcome` is an interim command Track 06 must replace rather than build on.

- [ ] **Step 3: Tick the roadmap.**

In `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` §17, mark every Track 05 task checkbox that this plan actually delivered. Leave unticked anything listed in §6 below, and add a one-line note next to it pointing at that section.

- [ ] **Step 4: Complete this plan's exit criteria.**

Tick §5 below only for criteria you personally verified, and paste the real command output counts.

- [ ] **Step 5: Final verification and commit.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && npm run verify
```

Expected: exit `0`.

```bash
git add docs
git commit -m "docs(construction): mark Track 05 complete"
```

## 5. Exit criteria

Track 05 is complete when all of the following are demonstrably true:

- [ ] `npm run verify` exits `0` after a fresh `/opt/homebrew/bin/supabase db reset`. Actual: ___ pgTAP files, ___ assertions.
- [ ] One spool travels `start_fab → material_check → fabricated → qc_release → sent_to_paint → painted → final_qc → laydown` entirely through Supabase RPCs (pgTAP `052`, and Task 26 step 4 in the browser).
- [ ] A hard refresh and a second signed-in user see the same result (Task 26 step 5).
- [ ] Material Check is derived: it appears only when every bill-of-materials line carries a PML-valid trace, and a partial check produces no event (pgTAP `050`).
- [ ] An invalid heat or trace number is refused with `PQC33` (pgTAP `050`).
- [ ] An ident code outside the spool's bill of materials is refused with `PQC30` (pgTAP `050`).
- [ ] Fabricated has **no** event row and is computed by `spool_fabrication_readiness` (pgTAP `053`).
- [ ] Root + Cap ≠ 100 is refused with `PQC35`; Heat + Fill outside {0, 100} is refused (pgTAP `051`, `weld-progress.test.ts`).
- [ ] One welder cannot hold two points of the same joint (pgTAP `051`).
- [ ] A welder whose qualification expired before that point's weld date is refused with `PQC34` (pgTAP `051`).
- [ ] A WPS outside the joint's diameter or thickness range is refused with `PQC34` (pgTAP `051`).
- [ ] A field or assembly joint is refused by Shop Weld Progress with `PQC30` (pgTAP `051`).
- [ ] NDE obligations are generated from the matrix on weld completion, one per covered method, `full` at 100 % and `spot` below it, and re-recording does not duplicate them (pgTAP `051`).
- [ ] A PWHT requirement is generated when the matrix requires it and the thickness clears the threshold (pgTAP `051`).
- [ ] After the first accepted NDE result, the joint's WPS, subcontractor and weld date are locked with `PQC36`, and only `correct_weld_progress` — with a mandatory reason and a full audit entry — can change them (pgTAP `051`).
- [ ] QC release is refused with `PQC37` while any obligation is `pending` or any PWHT requirement lacks an accepted result (pgTAP `052`).
- [ ] QC release is refused with `PQC32` while material check, welding or supports are incomplete, and the message names the counts (pgTAP `052`).
- [ ] The disabled state of the QC release button and the RPC rejection come from the same expression (`describeReleaseGate` over `spool_fabrication_readiness`).
- [ ] Painting is refused before Sent to Paint, a DFT below the paint matrix requirement is refused, and the record snapshots `required_final_dft_microns` (pgTAP `052`).
- [ ] Laydown is refused before Final QC (pgTAP `052`).
- [ ] Progress against a superseded spool revision is refused with `PQC31` (pgTAP `052`).
- [ ] A progress event cannot be updated or deleted; a compensating event is the only correction, and a compensated event stops contributing to the projection (pgTAP `050`, `053`).
- [ ] Retrying a command with the same idempotency key replays the previous result instead of creating a second row (pgTAP `050`).
- [ ] `materialize_progress_copies` fills `revision_progress_copies.copied_payload` exactly once per authorized kind and creates no duplicate events.
- [ ] Every construction table denies `insert`, `update` and `delete` to `authenticated`, and every read policy requires `fabrication.view` (pgTAP `050`–`052`).
- [ ] Every view is `security_invoker`, so a reader outside the project or PDS scope sees nothing.
- [ ] `modules/construction/domain/` and `modules/construction/application/` import no Supabase, no React and nothing from `store/*` (`construction-boundaries.test.ts`).
- [ ] No `/fabrication/**` page imports a retired store directly; each branches on `useAppMode()` (`construction-boundaries.test.ts`).
- [ ] No raw PostgREST or SQL error text reaches the UI (`supabase-construction-errors.test.ts`).
- [ ] The fabrication dashboard is built from `spool_construction_status`, not from fixtures.
- [ ] `/fabrication/qc-release` and `/fabrication/pwht-release` require `fabrication.qc.release`; `/fabrication/material-check` and `/fabrication/weld-progress` require `fabrication.progress.record` (`route-capabilities.test.ts`).
- [ ] The Track 05 bootstrap script writes rows and is idempotent across two consecutive runs.

## 6. Explicitly outside Track 05

- **NDE batches, results, repairs, tracers and penalty escalation** (roadmap §18). Track 05 creates the obligation and blocks release on it; everything downstream of the obligation is Track 06. `record_nde_obligation_outcome` is an interim command and must be **replaced**, not extended.
- **Assembly and Erection progress.** The `construction_phase` enum and the `phase` columns exist and default to `fabrication`; Track 07 parameterises the same tables. No assembly-specific stage policy is written here.
- **Progress imports** — Prefabrication, Erection and Weld progress templates (dossier §12.4 and §17). They write the tables this track creates, through the Track 03 import platform, and are a track of their own. Dossier §17.2's per-import date formats must be settled before that work starts.
- **QC-13 and W10P document rendering.** `qc13_progress_forms` records the request and the returned form; `paint_progress_records` records the W10P number. Generating the PDFs, the bulk 50-spool Excel generator (dossier §16.3) and the template catalogue are Track 11. The existing `components/fabrication/qc13-pdf-button.tsx` stays on demo data.
- **Spool tracking events.** `laydown_records` records the storage decision; `spool_location_events` and the PDA sync are Track 08.
- **The compensating-event command.** The ledger supports compensation and pgTAP proves the projection honours it, but no RPC issues one. Track 08 introduces it together with the tracking corrections, which have the same shape.
- **Custom fabrication stages.** Dossier §16.2 allows up to three project-defined date stages. `project_custom_field_definitions(scope = 'prefabrication')` already models them and Track 02 enforces the max-three invariant; surfacing them on the timeline is deferred until a project actually defines one.
- **Dia-inch weighted progress reporting.** `project_weld_types.counts_in_dia_inch` and `project_progress_weights` exist; turning them into a weighted percentage is a reporting concern and belongs to Track 11.
- **`project_spooling_checklist_items`.** Track 02 created the referential; dossier does not tie it to a fabrication command, so nothing in this track consumes it. Confirm with the business before wiring it to Material Check.
- **WPS welding position.** Roadmap §17 lists *"validate WPS range/material/position/date"*, but `project_welding_procedures` has no position column — dossier §11.6 lists material type, diameter range, thickness range, subcontractor and code as the mandatory dimensions, and nothing else. Track 05 validates the five that exist. Adding position means a Track 02 referential change first; do not invent the column inside a construction migration.
- **`nde_matrix_rules.material_traceability_required`.** Track 05 always requires a full material check before Fabricated, so the flag is currently redundant. Making the material check optional for rules that clear it is a behaviour change that needs a business decision, not a schema one.
