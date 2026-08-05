# Track 09 Flange Management Design

**Status:** approved direction; detailed implementation plan follows after review of this spec.

**Goal:** deliver the smallest complete Flange Management workflow supported by the Easy Piping manual: revision-bound flange definitions, manual and bulk progress entry, one or more jointers, reproducible UT, immutable history, and a published bolting-readiness fact for Track 10.

**Normative sources:** `docs/Easy Piping User Manual.pdf` §§19.1–19.2.4, represented in `docs/marker-output/manual.md:5598-6044`; `docs/research/2026-07-30-easy-piping-documentation-dossier.md` §26. The master roadmap supplies architectural constraints but does not override the manual's business flow.

---

## 1. Product decision

Track 09 follows the manual's single progress workflow. It does **not** introduce the demo-only sequence `Assign torque → Bolt-up → Torque Verified`, a separate QC-verification command, or a project-configurable state machine.

A flange joint has:

1. a versioned engineering definition imported from SpoolGen `bolt.txt`;
2. execution parameters selected from existing system/project referentials;
3. one effective append-only progress record;
4. one or more jointers attached to that progress record;
5. immutable superseded progress records retained as history.

The visible operational states are derived:

- `not_started` — no effective progress record exists for the current accepted flange revision;
- `completed` — one valid effective progress record exists;
- `revision_mismatch` — the requested flange revision is removed, superseded, or not under the current accepted isometric revision.

There is no manually stored `ready`, `verified`, or `reinstated` flag.

## 2. Scope

### 2.1 Included

- consume the stable `flange_joints` and versioned `flange_joint_revisions` created by Track 04;
- browse accepted and historical flange definitions by ISO and flange number;
- record jointing method/value, joint category, execution date, report number, tag number, and one or more jointers;
- correct progress without rewriting history;
- apply flange progress from XLSX through the Track 03 import lifecycle;
- validate active accepted revision, project/PDS scope, referentials, capability, and idempotency in the database;
- calculate UT from current referentials and persist the formula inputs/result snapshot on each progress record;
- carry progress to a new revision only when the existing Track 04 revision decision authorizes it;
- publish a read model consumed later by Track 10;
- replace the placeholders at `/flange` and `/erection/flange-progress` with Supabase-backed screens;
- provide local fixtures and a browser acceptance walkthrough.

### 2.2 Explicitly excluded

- a separate torque-assignment or independent torque-verification stage;
- Test Pack composition or assignment of flange joints to Test Packs;
- X/Y/Z reinstatement requests and reinstatement progress, owned by Track 10;
- generated torquing programs, history PDFs, XLSX reports, and dossier output, owned by Track 11;
- a second flange-specific revision aggregate or decision table;
- a dedicated manual-ISO-revision creator; Track 04 already owns ISO revision creation and decisions;
- Assembly UI or Assembly commands;
- deletion or in-place update of accepted progress history.

## 3. Existing contracts to reuse

### 3.1 Engineering identity and revision

Track 04 already supplies:

- `flange_joints(project_id, flange_number)` as stable identity;
- `flange_joint_revisions` as the revision-bound definition;
- `isometric_revisions`, `spool_revisions`, and the one-accepted-revision invariant;
- `revision_change_items`, including `entity_type = 'flange_joint'`;
- `revision_decisions` and `revision_progress_copies` as the shared revision-decision and copy-provenance contracts;
- SpoolGen `bolt.txt` parsing, preview, blockers, and atomic apply.

Track 09 must not duplicate the bolting-definition import. The manual's “Import Bolting Report Data” maps to the existing Track 04 `bolt.txt` path. Track 09 adds **progress import**, not another definition parser.

### 3.2 Referential data

Track 09 reuses:

- `system_reference_entries(kind = 'torquing_requirement')` for allowed jointing methods;
- `system_ut_calculation_rules` for diameter/rating coefficients, extended only as needed to make rating selection unambiguous;
- `project_joint_categories` for timing, category X/Y/Z, reason, and punch coefficient;
- `project_unit_time_references` for project UT/reference quantity;
- `project_teams(team_type = 'jointer')` for execution actors;
- `project_thickness_flange_rules` for the accepted diameter/rating combination;
- Track 01 capability and PDS-scope helpers.

The form selects one `project_joint_categories` row. Timing, category, reason, and coefficient are displayed from that row rather than maintained as four independently editable fields.

### 3.3 Access and commands

- `flange.view` permits worklist, definition, history, and readiness reads.
- `flange.manage` permits manual progress, corrections, and revision-authorized copy materialization.
- An XLSX progress import requires both `imports.manage` and `flange.manage` at apply time.
- Browser users receive `SELECT` only on exposed read models. Operational writes happen through `SECURITY DEFINER` commands.

## 4. Data model

### 4.1 `flange_progress_records`

Each row is an immutable version of the effective progress for one `flange_joint_revision_id`.

Required business fields:

- `id`;
- `project_id`;
- `flange_joint_revision_id`;
- `joint_category_id`;
- `torquing_requirement_id`;
- `jointing_method_snapshot`;
- `jointing_value`;
- `joint_date`;
- `report_number`;
- `tag_number`;
- `source_kind` (`manual`, `import`, or `revision_copy`);
- nullable `source_import_job_id`;
- nullable `supersedes_record_id` and `superseded_at` metadata;
- `recorded_by`, `recorded_at`;
- UT snapshot columns from §6.

Constraints:

- every referenced row belongs to the same project;
- the flange revision belongs to the current accepted, non-removed isometric/spool revision when manually recorded or imported;
- `jointing_value` is positive and finite;
- date, report number, tag number, category, method, and at least one jointer are required;
- one progress row may supersede only the current effective row for the same flange revision;
- an old row's business payload and jointer assignments are never updated or deleted; the command may close the row only by setting its supersession metadata;
- a partial unique index permits exactly one non-superseded effective record per flange revision.

### 4.2 `flange_jointer_assignments`

Each row attaches one active project team with `team_type = 'jointer'` to a progress record.

Constraints:

- at least one assignment is required before the command completes;
- one jointer may appear only once on a progress record;
- jointer and progress record must belong to the same project;
- archived/inactive jointers remain readable in history but cannot be selected for a new record.

### 4.3 Effective history

Corrections use the same command with an explicit `replaces_progress_id`. The command locks the current row, verifies that the supplied ID is still effective, inserts the replacement and its jointers, then sets only the old row's `superseded_at` metadata. The old business payload and assignments stay immutable. A stale correction is rejected rather than silently overwriting a newer change.

The read model returns:

- the effective record;
- all superseded records in reverse chronological order;
- actor/time/source for every version;
- jointers and UT snapshot for every version.

## 5. Command contract

One public business command owns manual progress and corrections:

```ts
interface RecordFlangeProgressInput {
  projectId: string
  flangeJointRevisionId: string
  jointCategoryId: string
  torquingRequirementId: string
  jointingValue: number
  jointDate: string
  reportNumber: string
  tagNumber: string
  jointerIds: string[]
  replacesProgressId?: string
  idempotencyKey: string
}
```

`record_flange_progress` performs, in one transaction:

1. capability and fail-closed PDS-scope checks;
2. current accepted revision and non-removed checks;
3. active same-project referential validation;
4. duplicate-jointer and input-shape validation;
5. transaction-scoped locking for the flange revision;
6. current-record/concurrency validation;
7. UT calculation and snapshot capture;
8. progress and jointer inserts;
9. supersession link when correcting;
10. `audit_events` and shared `command_receipts` completion.

The command returns the durable effective record and receipt. Raw SQL/PostgREST messages do not reach the UI. Track 09 owns error codes `PQC70`–`PQC78`, leaving the `PQC60` range available for Track 08.

## 6. UT calculation

The manual formula is:

```text
UT = project/reference quantity × diameter coefficient × rating coefficient × punch coefficient
```

At record time the system resolves and saves:

- project/reference quantity;
- diameter coefficient;
- rating coefficient;
- punch/category coefficient;
- formula version `flange-ut-v1`;
- calculated UT.

The effective worklist may preview UT from current active referentials. The accepted progress record uses its stored snapshot so later referential changes cannot rewrite history.

If no punch/category coefficient or another UT rule is configured, UT is `null` and the UI says `UT not configured`. This does **not** block flange progress because the manual explicitly allows null UT when the punch coefficient is undefined. The missing coefficient is a warning in manual entry/import preview, not a blocker.

## 7. Revision behavior

Track 09 reuses the Track 04 revision workflow.

- Progress cannot be recorded against a superseded, removed, draft, or otherwise non-current flange revision.
- A new accepted revision starts without flange progress unless an existing `revision_change_item` and `revision_decision` authorize carry-over.
- `done_without_modification` may materialize a new progress record on the target flange revision, preserving business fields, jointers, and the original UT snapshot while recording `source_kind = 'revision_copy'` and copy provenance.
- `not_done`, `cancelled`, and changed/rework cases do not silently copy progress.
- `revision_progress_copies.progress_kind` is extended with `flange_progress`; no `flange_revision_resolutions` table is added.

This gives one revision decision model across Engineering, Fabrication, and Flange Management.

## 8. Progress import

The Track 03 import platform gains `flange_progress` as a first-class import type.

Required columns:

- ISO Number;
- Revision;
- BT Number;
- Jointing Method;
- Jointing Value;
- Joint Category;
- Reason;
- Joint Date;
- Report Number;
- Jointer Codes;
- Tag Number.

Multiple jointers are represented as a comma-separated list and normalized into stable unique codes.

Preview and server revalidation identify:

- unknown ISO/revision/BT number;
- non-current or removed flange revision;
- unknown/inactive category, method, or jointer;
- category/reason mismatch;
- duplicate jointers;
- invalid numeric/date values;
- current-record conflicts requiring explicit confirmation;
- missing UT coefficient as a warning.

Apply is atomic for the whole job. It invokes the same internal validation/calculation routine as `record_flange_progress`; manual and bulk paths cannot disagree about eligibility or UT. A confirmed conflict creates a superseding progress record, retains the previous business payload and assignments, and changes only its supersession metadata.

## 9. Read models and published contract

### 9.1 Flange worklist

The worklist is project/PDS-scoped and returns:

- stable flange and current revision IDs;
- ISO, revision, spool, line, PDS, service class;
- BT/flange number, diameter, rating, bolt size/quantity, joint type;
- effective category/method/value;
- jointers, date, report, tag;
- UT preview/effective snapshot;
- derived status and revision eligibility.

### 9.2 `flange_joint_readiness`

Track 09 publishes facts, not Test Pack decisions:

- `flange_joint_revision_id`;
- `project_id` and scope identifiers;
- `is_current_revision`;
- `bolting_complete`;
- category/timing/reason snapshot;
- `requires_reinstatement` for Y/Z categories;
- effective progress ID/date;
- `calculated_ut` and formula version.

Track 10 decides how these facts affect Test Pack readiness, Testing/Precommissioning, and Y/Z reinstatement. Track 09 does not mark a Test Pack or ISO RFT.

## 10. UI

### 10.1 `/flange`

Read-focused browse/history screen:

- KPI cards: total, completed, not started, revision blocked;
- filters by ISO, line, PDS, service class, category, status, and jointer;
- ISO → flange-joint hierarchy;
- effective progress summary;
- immutable history panel, including revision-copy provenance and superseded corrections.

### 10.2 `/erection/flange-progress`

Operational screen:

- the same scoped worklist without duplicate state;
- one progress form with category, method/value, date, report, tag;
- a repeatable jointer selector using `Add jointer` / `Remove`;
- current UT preview and a non-blocking missing-UT warning;
- `Record progress` for a first record and `Correct progress` for an explicit replacement;
- disabled mutation controls with a clear reason for readers, stale revisions, removed joints, and out-of-scope records;
- refresh after durable success; no optimistic fake completion.

The UI does not expose `Torque Assigned`, `Bolted`, `Torque Verified`, or `Reinstated` states.

### 10.3 Import UI

The existing import workbench supports the `flange_progress` template, preview, conflict confirmation, apply, history, and retained source file. No separate upload framework is created.

## 11. Error handling

User-facing failures distinguish:

- missing `flange.manage` capability;
- out-of-scope project/PDS;
- stale/removed/revision-mismatched flange;
- missing or inactive referential;
- invalid method/category/reason combination;
- invalid or duplicate jointers;
- invalid date/value/input shape;
- stale correction target;
- import blockers and unconfirmed conflicts.

All database errors map through a Track 09 error catalog. Unknown failures produce one generic flange-progress error and retain technical detail only in development logging without secrets or source-file payloads.

## 12. Verification strategy

### Domain tests

- UT truth table, including missing punch coefficient;
- stable jointer normalization and duplicate rejection;
- derived status/readiness;
- category/timing mapping;
- revision-copy eligibility.

### Application tests

- capability and scope intent passed to the repository;
- manual and import inputs normalize to the same command payload;
- stale correction and typed error mapping;
- no Supabase/React/store imports in domain/application files.

### pgTAP

- schema constraints and append-only history;
- one effective record per flange revision;
- accepted/current/non-removed revision gate;
- cross-project and PDS-scope refusal;
- active same-project method/category/jointer validation;
- multiple jointers and duplicate refusal;
- UT snapshot and null-UT warning semantics;
- idempotency and correction concurrency;
- revision-authorized copy and forbidden copy cases;
- RLS/grants and immutable audit/progress rows;
- atomic progress-import apply.

### Browser acceptance

The fixture walk proves:

1. a flange from Track 04 `bolt.txt` appears under its accepted revision;
2. a reader can inspect it but cannot mutate it;
3. a manager records progress with two jointers;
4. refresh preserves `completed`, both jointers, UT, report, and tag;
5. a correction retains the previous version in history;
6. a stale revision is disabled and refused server-side;
7. XLSX preview reports one blocker, one warning, and one confirmable conflict;
8. confirmed apply creates durable progress without rewriting history;
9. the published readiness row changes from incomplete to complete;
10. Track 07 erection readiness remains unchanged except for the dedicated flange route.

## 13. Exit criteria

Track 09 is complete only when:

- both flange routes use Supabase and no demo/store persistence;
- manual and import paths share the same server-side invariants;
- multiple jointers survive refresh and appear in history;
- corrections and revision copies are append-only and auditable;
- stale revision and out-of-scope writes are refused by the database;
- UT is reproducible from a persisted formula snapshot;
- `flange_joint_readiness` exposes the sole published bolting fact for Track 10;
- no Test Pack/reinstatement behavior or separate torque-verification workflow leaked into Track 09;
- clean migration replay, focused/full pgTAP, typecheck, unit tests, build, and the dedicated browser walkthrough pass with recorded evidence.
