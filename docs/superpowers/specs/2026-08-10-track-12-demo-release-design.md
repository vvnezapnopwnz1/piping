# Track 12 Demo Release Lite Design

**Status:** approved for implementation planning on 2026-08-10.

**Goal:** turn the completed Tracks 01–11 into a reproducible local working demo that a product owner can prepare and present without running per-track fixture commands or a browser test runner.

**Product claim:** Track 12 delivers a local Supabase-backed demonstration release with a real file import, durable business commands, project/role isolation, and two current-data report exports. It does not claim production deployment, offline operation, or dossier-grade handover.

---

## 1. Product decision

Track 12 is a release and integration track, not another business module. It packages the existing product into:

1. one safe preparation command;
2. one rich and repeatable `TRACK01-A` starting state;
3. one manual 30–40 minute business walkthrough;
4. one expanded acceptance walkthrough;
5. one optional setup walkthrough from a blank project;
6. one evidence-based release decision.

The design uses a purpose-built demo preparation orchestrator. It may reuse existing bootstrap helpers, but it must not blindly chain browser fixtures that pre-complete operational workflows.

## 2. Scope

### 2.1 Included

- local-only reset and preparation of a known demo state;
- `TRACK01-A` as the stable golden project;
- `TRACK01-B` as a minimal project-isolation control;
- a visually credible set of system and project referentials;
- interactive SpoolGen-style file upload through the real UI;
- a manual business path from imported engineering definitions through Reports;
- a separate project/setup smoke walkthrough;
- clean automated verification before demo data is loaded;
- a demo-state contract/preflight after preparation;
- role, direct-route, project-isolation, negative-transition, and refresh-persistence checks;
- release runbooks, acceptance evidence, and known limitations.

### 2.2 Explicitly excluded

- production deployment or production environment configuration;
- offline PWA, encrypted device cache, reconnect synchronization, and conflict-resolution UI;
- durable generated-document history, server-side snapshots, checksums, dossier ZIPs, or handover bundles;
- Storage-backed report artifacts;
- production monitoring/alerting platforms;
- load testing and capacity certification;
- production backup/restore rehearsal;
- broad refactoring or backlog cleanup unrelated to a reproduced release defect;
- import of a native 3D model, PCF, RVM, NWD, or other geometry format.

Track 08 offline items and Track 11 durable document items remain deferred under their existing close-out documents. Track 12 must not quietly reintroduce them.

## 3. Demo environments and personas

### 3.1 Projects

- `TRACK01-A` is the only golden-story project. It receives the full referential catalog and all business actions performed during the main walkthrough.
- `TRACK01-B` is a deliberately sparse control project. It exists only to prove that another project does not expose `TRACK01-A` references, imports, worklists, history, or reports.
- The setup walkthrough creates a separate temporary project with the stable code `TRACK-SETUP-CHECK`. It must never be used as a prerequisite for the golden story.

### 3.2 Personas

The manifest must enumerate stable local accounts for these personas:

- System Admin for the system-referential smoke path;
- Project Admin for project definition, access, referentials, and imports;
- Project Editor/QC/Tracking Operator for the operational golden path;
- Reader QC for read-only and direct-route checks.

Credentials are supplied through the existing local preparation mechanism. Passwords must not be committed, printed, embedded in runbooks, or included in acceptance evidence.

## 4. Demo preparation architecture

### 4.1 Commands

Track 12 adds two top-level commands:

- `npm run demo:prepare` — destructive local reset followed by deterministic preparation and preflight;
- `npm run demo:check` — read-only preflight against an already prepared stand.

The implementation is split into focused units:

- `scripts/demo/manifest.ts` owns stable codes and the complete expected starting-state description;
- `scripts/prepare-track12-demo.ts` owns local guarding, reset orchestration, and preparation order;
- `scripts/check-track12-demo.ts` owns read-only state verification and human-readable diagnostics;
- existing track helpers may be reused only for prerequisite/source-data operations that match this specification.

### 4.2 Safety contract

`demo:prepare` must:

1. accept only local Supabase hosts: `localhost`, `127.0.0.1`, or `::1`;
2. refuse a missing, malformed, or non-local target before any destructive command;
3. require an explicit local-reset confirmation flag;
4. print the local target and the fact that local data will be replaced, without printing secrets;
5. run a clean migration replay;
6. stop on the first failed preparation stage;
7. end by running `demo:check`;
8. return a non-zero exit code unless the full starting-state contract is satisfied.

The command is intentionally reset-based rather than incrementally idempotent. If a rehearsal is polluted or a presenter performs an irreversible action, rerunning `demo:prepare` restores the known state. `demo:check` remains safe to rerun at any time.

### 4.3 Date policy

Business dates are calculated relative to the preparation date so the demo does not expire. Stable business identifiers remain fixed. The manifest owns relative offsets for planned dates, qualification validity, and any precondition timestamps; application code must not contain Track 12-specific dates.

## 5. Starting-state contract

### 5.1 Referential principle

The initial project is visually populated, not merely technically valid. Every row is stored in the real database and rendered by existing Supabase-backed screens. UI-only decoration and unrelated fake counters are forbidden.

The manifest enumerates the exact rows and relationships. Contract tests lock that list. The catalog must meet at least these visible counts:

| Referential family | Required visible minimum |
| --- | ---: |
| System material types | 3 |
| System film-quantity rules | 2 |
| System UT rules | 3 |
| System torquing requirements | 3 |
| Project subcontractors | 3 |
| Units / area classifications / PDS areas | 2 / 2 / 3 |
| Service classes / weld types / WPS | 2 / 3 / 4 |
| Qualified welders | 4 |
| NDE matrix rules | 4 |
| PML rows / thickness rules | 5 / 3 |
| Rework codes / joint categories | 3 / 3 |
| Teams / systems / subsystems / line services | 4 / 2 / 3 / 3 |
| Pressure units | 1 |
| Location categories / locations | 3 / 6 |
| Unit-time references | 4 |
| Progress-weight configuration | one valid 100% set |
| Spooling material types / classes / checklist items | 2 / 3 / 5 |
| RAL codes / paint-matrix rules | 3 / 3 |
| Tracking devices / active assignments | 3 / 2 |

The catalog contains lifecycle examples that are never selected by the golden path: one inactive subcontractor, one inactive WPS, one inactive tracking location, and one unassigned device. These examples must not make project readiness fail.

### 5.2 Data allowed before the walkthrough

Preparation may create:

- Auth identities, memberships, roles, and scopes;
- project definition and branding-safe metadata;
- system and project referentials from §5.1;
- source definitions that currently have no presenter-facing import path, when they are necessary for a downstream screen and do not represent completed work;
- `TRACK01-B` isolation-control data;
- the demo input files in the repository.

Preparation must not create:

- accepted ISO, spool, weld, BOM, flange, or support definitions that belong to the SpoolGen upload package;
- fabrication ledger events, material checks, weld progress, PWHT results, paint progress, QC release, or laydown events;
- NDE batches, selected joints, examination results, repairs, or tracer outcomes;
- erection, tracking, flange-progress, Test Pack, pressure-test, or reinstatement outcomes;
- generated report files or document history.

`demo:check` verifies both the required prerequisites and the absence of these outcomes.

## 6. Engineering-system import boundary

The demonstration starts with an export package from a SpoolGen-like 3D piping/spooling system. PipeQC imports structured engineering output, not 3D geometry.

The repository exposes presenter-friendly files under `demo-data/spoolgen/`:

- `weld.txt` — ISO revision, PDS/service context, spools, weld joints, weld points, dimensions, and locations;
- `trace.txt` — BOM/material lines;
- `bolt.txt` — flange and bolting definitions;
- `supp.txt` — support definitions.

These are the four roles already supported by the Track 04 contract. `weld.txt` is required by the application; the Demo Release package includes all four so downstream Fabrication, Flange, and Erection screens have a coherent source baseline.

The main walkthrough must:

1. open `/spooling/import` as Project Admin;
2. attach all four files through the visible controls;
3. validate them with zero blocking errors;
4. show the parsed preview and source summary;
5. apply the initial revision through the UI;
6. refresh `/spooling/browse` and confirm the accepted revision, spools, welds, BOM, flanges, and supports.

The exact expected row counts and identifiers are part of the manifest/runbook and must be asserted by contract tests. A native model viewer is not implied.

## 7. Main 30–40 minute walkthrough

The walkthrough is a curated business narrative, not a replay of every track's full regression script. It uses a small stable set of imported objects. More than one spool or ISO may be used where the current domain correctly separates shop, field, flange, or Test Pack work; the runbook must state each handoff explicitly and must not imply that unrelated records are one physical object.

The sequence is:

1. sign in, select `TRACK01-A`, and show project identity/readiness;
2. briefly show the populated Project Referential screens;
3. import and accept the four-file SpoolGen package from §6;
4. record Start Fabrication, material traces, shop weld progress, required quality evidence, and QC Release for the selected shop spool;
5. create an NDE batch and demonstrate one accepted result plus one rejection/repair path selected for the release story;
6. record the selected erection handoff/progress needed by the site story;
7. record one tracking movement and verify current location plus history;
8. record flange progress with jointers and UT evidence;
9. create/compose the selected Test Pack, execute Line Check and X clearance, observe derived RFT, then complete the selected Blinding, Pressure Test/Pre-commissioning, and reinstatement path;
10. generate Fabrication Progress XLSX and Test Pack RFT Pursuit PDF;
11. refresh the key screens and confirm durable state.

The runbook assigns an estimated duration and a visible checkpoint to every section. It includes a short presenter explanation for what changed and why it matters. Full tracer combinations, full role matrices, and exhaustive negative cases live in acceptance, not in the 30–40 minute presentation.

## 8. Setup walkthrough

The optional setup walkthrough verifies Tracks 01–02 independently from the golden story. Through the UI it:

1. creates `TRACK-SETUP-CHECK`;
2. assigns Project Admin, Editor, and Reader access;
3. creates one valid chain across the primary project-referential groups;
4. confirms the setup-readiness indicator updates from real data;
5. verifies Reader is read-only;
6. verifies the new project's rows are absent from `TRACK01-A` and vice versa.

The setup project is disposable. The documented cleanup is a new `demo:prepare`, not an application delete path.

## 9. Verification strategy

Verification is split into three isolated phases because pgTAP fixtures and demo data must not share a polluted database.

### 9.1 Phase A — clean code and database gate

Against a clean migration replay:

- repository lint completes with zero errors;
- TypeScript typecheck passes;
- unit tests pass;
- production build passes;
- the full pgTAP suite passes;
- generated Supabase types match the replayed schema;
- `git diff --check` passes.

Demo preparation is not run before this phase.

### 9.2 Phase B — demo-state gate

After a second clean reset:

1. run `demo:prepare`;
2. run the manifest/guard contract tests;
3. run `demo:check` independently;
4. confirm the rich referential counts and relationships;
5. confirm there are no imported engineering definitions or operational outcomes;
6. confirm a second run of `demo:check` is read-only and stable.

### 9.3 Phase C — browser/manual release gate

The browser agent and the product owner use the same business runbook. Acceptance additionally checks:

- one validation failure before the valid SpoolGen apply;
- one forbidden workflow transition;
- one stale/duplicate command path;
- Reader read-only behavior and direct-route denial;
- `TRACK01-A` versus `TRACK01-B` isolation;
- refresh persistence at the major handoffs;
- absence of fake success, placeholder actions, or unmarked demo-store values on visited routes;
- downloaded XLSX/PDF open successfully and contain the selected project data.

Playwright/browser tooling is a verification aid, not a runtime dependency of the presentation.

## 10. Error handling and diagnostics

Preparation and preflight errors must name the failed stage, expected stable code, and safe recovery command. They must not expose SQL payloads, keys, tokens, passwords, or full environment values.

Failure rules:

- non-local target: refuse before reset;
- migration/reset failure: stop; do not continue with partial preparation;
- account/project/referential failure: stop and identify the manifest section;
- preflight mismatch: print expected versus actual counts/codes and return non-zero;
- browser mutation ambiguity: do not retry automatically; inspect durable state first;
- unrecoverable rehearsal mistake: rerun `demo:prepare`.

Track 12 fixes a defect only when it is reproducible in a release gate and blocks or misrepresents the approved demo. Other findings are recorded as known limitations or deferred work.

## 11. Deliverables

- `scripts/demo/manifest.ts`;
- `scripts/prepare-track12-demo.ts`;
- `scripts/check-track12-demo.ts`;
- focused guard, manifest, and preflight tests;
- `demo-data/spoolgen/weld.txt`;
- `demo-data/spoolgen/trace.txt`;
- `demo-data/spoolgen/bolt.txt`;
- `demo-data/spoolgen/supp.txt`;
- package scripts `demo:prepare` and `demo:check`;
- `docs/runbooks/track-12-demo.md`;
- `docs/runbooks/track-12-setup-walkthrough.md`;
- `docs/qa/track-12-agent-walkthrough.md`;
- `docs/acceptance/track-12-demo-release.md`;
- only those migrations, generated types, or UI fixes proven necessary by the gates.

The broader master-roadmap ideas for a production pilot remain future work unless separately approved.

## 12. Exit criteria

Track 12 Demo Release Lite is complete only when:

1. `demo:prepare` safely recreates the local stand from a clean reset;
2. the rich `TRACK01-A` referential catalog and sparse `TRACK01-B` control match the manifest;
3. preparation leaves engineering imports and operational outcomes empty;
4. the four SpoolGen export files validate and apply through the UI;
5. the 30–40 minute business walkthrough reaches both Reports without direct database manipulation;
6. key states survive refresh;
7. negative, role, and project-isolation checks pass;
8. Phase A automated verification passes on a clean database;
9. Phase B demo preflight passes on a separately prepared database;
10. the product owner opens the XLSX/PDF and signs off the recorded acceptance result;
11. known limitations state clearly that the release is local Demo Lite, not production/offline/dossier delivery.
