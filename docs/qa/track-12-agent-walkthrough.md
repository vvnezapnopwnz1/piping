# Track 12 — Expanded Browser-Agent Acceptance Protocol

**Document status: static source-verified; live Task 12 pending.** Every route, control label,
capability rule and refusal behaviour below was read out of the current source tree and
migrations on this branch. **No case in this document has been executed in a browser or against a
live database.** Task 12 (Phase C of the Track 12 plan) is the gate that turns "expected" into
"observed"; until it closes, every "Expected" line here is a prediction derived from source, not
evidence.

## 0. Relationship to the presenter runbook

This document does **not** duplicate the presenter path. The positive spine in §3 is a table of
pointers into [`docs/runbooks/track-12-demo.md`](../runbooks/track-12-demo.md) ("the main
runbook") by its own section IDs (`S1.1` … `S9.3`). A browser agent executing the positive spine
reads the routes, controls, values and expected results directly from the main runbook section
named in each row; this document only adds the evidence-capture discipline and the case ID. Do not
invent alternate business values, alternate routes, or a parallel golden path — the main runbook is
the single source of truth for the positive story.

The negative matrix in §4 is new material: cases that the main runbook does not walk (it is a
40-minute presenter script, not a QA sweep) but that are confirmed, by source, to be reachable
through the same UI on the same prepared stand.

This document supersedes no other file. [`docs/qa/local-supabase-browser-runbook.md`](local-supabase-browser-runbook.md)
remains the entry point that routes an operator to Mode A (this protocol's positive spine, driven
manually as `track-12-demo.md`), Mode B (`docs/runbooks/track-12-setup-walkthrough.md`, a separate
optional smoke — not covered here and not duplicated here), or a Track 01–11 historical regression
script.

## 1. Browser-agent operating contract

A browser agent executing this protocol:

**May:**

- open only `http://localhost:3000` (not `127.0.0.1` — the dev server treats it as a
  cross-origin resource and the shell hangs at "Loading PipeQC…", per main runbook §14 rule 8);
- perform UI gestures: click, type, select, upload the four files named in a case;
- read the DOM, the network log and the console;
- take a screenshot **only when a case ends FAIL or BLOCKED**.

**Must not:**

- read `.env`, `.env.local`, shell history, or any secret; request, print, copy, upload or persist
  a credential;
- use a service key, direct SQL, Supabase Studio, or a direct Supabase client call;
- run `supabase db reset`, `npm run demo:prepare`, `npm run demo:check`, any Git command, or edit
  any source file;
- perform an action outside the case it is given, or navigate to any non-local site;
- **retry an ambiguous mutation.** If a click produces no toast, or the result is unclear: hard
  refresh the screen, read the durable state shown there, and record PASS/FAIL/BLOCKED from that
  refreshed state. Do not click a second time "to be sure" — most commands in this application are
  idempotency-keyed per click, and a blind repeat is at best noise and at worst a second business
  event with a different timestamp (main runbook §14 rule 1).

**Secrets stay with the human presenter.** `SUPABASE_SERVICE_ROLE_KEY` and
`TRACK01_FIXTURE_PASSWORD` are entered interactively by the operator before the agent starts (main
runbook §1.2). The agent never sees them, never types them, and never writes them — or any account
password — into a case record, a screenshot, or this document. If a case requires switching the
authenticated user, the agent stops and asks the operator to sign in as the named persona; it does
not attempt to obtain or guess a password.

## 2. Evidence field schema

Every case — positive or negative — is recorded with exactly these fields:

| Field | Meaning |
| --- | --- |
| Case ID | The section ID from `track-12-demo.md` (positive spine) or the `N`-prefixed ID from §4 (negative matrix) |
| URL | The route open at the moment of the assertion |
| Actor | The signed-in persona (email, from `scripts/demo/manifest.ts`) |
| Active project | `TRACK01-A` or `TRACK01-B` |
| Expected state | Copied from the cited section of `track-12-demo.md`, or from the source citation in this document — never invented |
| Actual state | What the agent observed |
| PASS / FAIL / BLOCKED | The verdict. BLOCKED means the case could not be attempted (missing prerequisite, ambiguous mutation not resolved by refresh) — it is not a synonym for FAIL |
| Refresh result | For any case with a durable-state claim: the state after `Cmd+Shift+R`, or "not applicable" for a read-only case |
| First safe network/console error | On FAIL/BLOCKED only: method, path, HTTP status and a safe response message (never an Authorization header value); or the first uncaught console error |
| Screenshot path | On FAIL/BLOCKED only: an absolute path **outside the repository working tree** (e.g. a local scratch directory). Never commit a screenshot. Leave blank on PASS |

## 3. Positive spine — pointers into `track-12-demo.md`

Do not re-describe routes, controls or business values here; each row points at the exact section
that has them. Record the evidence-schema fields in §2 while executing the linked section.

| Case ID | `track-12-demo.md` section | Story beat |
| --- | --- | --- |
| S1.1 | §4 | Sign in as Project Admin A; shell and capability-filtered sidebar load |
| S1.2 | §4 | `/admin/project-referential` readiness card; both gates green; hard-refresh checkpoint |
| S2.1 | §5 | Referential tabs tour (read-only); rich rows plus the four inactive/unassigned examples |
| S3.1 | §6 | Attach and validate the real four files; toast `Validated 20 rows: 0 errors, 0 warnings.` |
| S3.2 | §6 | Apply the first revision; toast `Applied N definition rows.` |
| S3.3 | §6 | `/spooling/browse` proves R0 landed; hard-refresh checkpoint |
| S4.1 | §7 | Record Start Fab on `SP-DEMO-1001-A` |
| S4.2 | §7 | Record material traces against the PML |
| S4.3 | §7 | First shop weld, RT obligation created |
| S4.4 | §7 | Second shop weld, PT obligation created |
| S4.5 | §7 | Support installed; QC release deliberately blocked; hard-refresh checkpoint |
| S5.1 | §8 | RT batch, accepted result |
| S5.2 | §8 | PT batch, rejected result, repair (R1) obligation created |
| S5.3 | §8 | Repair examined and accepted; original obligation superseded |
| S5.4 | §8 | Spool QC released; hard-refresh checkpoint on `/fabrication/qc-release` and `/fabrication/dashboard` |
| S6.1 | §9 | To Site on `SP-DEMO-2001-A` |
| S6.2 | §9 | Field material check |
| S6.3 | §9 | Erected; stage-order enforcement stated |
| S6.4 | §9 | Field joints and Welded / Bolted |
| S6.5 | §9 | Supports and Supported |
| S6.6 | §9 | Derived Ready for Test on `/erection/rft`; hard-refresh checkpoint |
| S7.1 | §10 | Arrival scan, `FAB-SHOP` |
| S7.2 | §10 | Departure scan, `In transit` |
| S7.3 | §10 | Arrival at `LAYDOWN-A`; hard-refresh checkpoint |
| S7.4 | §10 | Flange bolt-up on `FLG-DEMO-1001-01`; calculated UT `30`; hard-refresh checkpoint |
| S8.1 | §11 | Create and compose `TP-DEMO-001` with `ISO-DEMO-2001` only |
| S8.2 | §11 | Assign the Line Check |
| S8.3 | §11 | Complete Line Check, raise Category X punch `X-000001` |
| S8.4 | §11 | Assign and clear the punch item |
| S8.5 | §11 | Pack turns `RFT · 12`; hard-refresh checkpoint |
| S8.6 | §11 | Blinding |
| S8.7 | §11 | Testing and pre-commissioning; hard-refresh checkpoint |
| S9.1 | §12 | Download Fabrication Progress XLSX |
| S9.2 | §12 | Download Test Pack RFT Pursuit PDF |
| S9.3 | §12 | Persistence close across four routes; hard-refresh checkpoint |

## 4. Negative matrix

Every case below cites the source file(s) that confirm it is reachable through the current UI on
the prepared `TRACK01-A`/`TRACK01-B` stand. None of these cases has been executed; "Expected"
quotes or paraphrases the cited source, never a value invented for this document.

### N1 — Invalid SpoolGen input, then the valid four-file apply

**N1a — Missing `weld.txt`.**

- Route: `/spooling/import`
- Actor: `track01.project-admin-a@example.test` · `TRACK01-A`
- Action: attach only `demo-data/spoolgen/trace.txt`, `bolt.txt` and `supp.txt` (omit `weld.txt`),
  then click **Validate files**.
- Expected: the client-side submission check fails before any network call — `weld.txt` is the
  only required file — and the toast reads **"weld.txt is required before a SpoolGen import can be
  validated."** No import job is created; the *Revision decisions* card never appears.
  (`modules/engineering/ui/spooling-import-screen.tsx:97-104` — `submission.canSubmit` guard and
  literal toast text.)
- Do not click **Validate files** a second time on the same incomplete set; attach `weld.txt` and
  proceed directly to the valid case below.

**N1b — Valid four-file apply.**

Continue with the real files and record this as case `S3.1`–`S3.3` in §3; do not create a second,
differently-valued import. The point of N1a is only that the invalid state was reached and refused
*before* the valid one was attempted, in that order.

### N2 — Forbidden workflow transition before prerequisites

- Route: `/erection/welded-bolted`
- Actor: `track01.qc-editor@example.test` · `TRACK01-A`
- Prerequisite state: `SP-DEMO-2001-A` has completed `S6.1` (To Site) but **not** `S6.3` (Erected).
- Action: attempt to record the field weld progress and the Welded / Bolted milestone for
  `SP-DEMO-2001-A` before recording Erected.
- Expected: the milestone is refused and the screen names the missing predecessor rather than
  failing silently — the main runbook states the exact pattern: *"Record Erected before Welded /
  Bolted"* (`docs/runbooks/track-12-demo.md` §9 S6.3 note, §14 rule 2). Stage order is
  server-enforced (`supabase/migrations/20260810093000_erection_progress_commands.sql:43-53`,
  `modules/construction/domain/erection-stage.ts`).
- Recovery: do not retry the same click. Record Erected (`S6.3`), then continue the spine in
  order — this negative case must run *before* `S6.4`, not as a substitute for it.

### N3 — Duplicate / idempotency path

- Route: `/fabrication/material-check`
- Actor: `track01.qc-editor@example.test` · `TRACK01-A`
- Prerequisite state: `S4.1` already recorded Start Fab on `SP-DEMO-1001-A`.
- Action: reselect `SP-DEMO-1001-A` in the *Spools* picker and observe the **Record Start Fab**
  control.
- Expected: the control is disabled once `spool.dates.start_fab` is non-null — the duplicate
  mutation is unreachable by design, not merely rejected on submit
  (`modules/construction/ui/fabrication/material-check-screen.tsx:189`,
  `disabled={spool.dates.start_fab !== null}`).
- Refresh result: hard refresh `/fabrication/material-check`, reselect the spool; the control must
  still be disabled and the Start Fab date must be unchanged — confirms the guard reads durable
  state, not client cache.

### N4 — Stale-state path

- Route: `/tracking/data-analysis`
- Actor: `track01.qc-editor@example.test` · `TRACK01-A`
- Prerequisite state: `S7.3` already moved `SP-DEMO-1001-A` from `FAB-SHOP` through `In transit` to
  `LAYDOWN-A`.
- Action: open **Add Event** and attempt Direction `Out`, Location `FAB-SHOP` — the spool's earlier,
  now-stale location — instead of a valid event from `LAYDOWN-A`.
- Expected: the event is refused because a departure is only accepted from the location the spool
  is actually at; the main runbook states the exact rule and the recovery discipline: *"an arrival
  requires the spool to be in transit and a departure requires it to be at the stated location.
  Re-clicking will not help."* (`docs/runbooks/track-12-demo.md` §10 S7.3 note). Enforced server-side
  (`supabase/migrations/20260814092000_tracking_commands.sql:148-163`).
- Recovery: read the refusal, hard refresh, confirm the current location is still `LAYDOWN-A` and
  the history card still shows exactly the three prior events — then continue the spine at `S7.4`.
  Do not attempt the same stale event twice.

### N5 — Reader direct-route denial and absence of mutating controls

**N5a — Full route denial, `/admin/access-rights`.**

- Actor: `track01.reader-qc@example.test` · `TRACK01-A`
- Action: navigate directly to `/admin/access-rights`.
- Expected: `RouteCapabilityGuard` renders `ForbiddenScreen` before the Access Rights editor mounts,
  because the route requires `access_rights.manage` and Reader QC's access role (`project_reader`)
  never carries a mutating capability. Card title **"Access denied"**, body **"You do not have
  access to Access Rights in project TRACK01-A."**
  (`components/pipeqc/route-capability-guard.tsx:41-57`, `config/route-capabilities.ts:7`,
  `components/auth/forbidden-screen.tsx:24-27`, `app/admin/access-rights/page.tsx:10-17`).

**N5b — Full route denial, `/fabrication/qc-release`.**

- Actor: `track01.reader-qc@example.test` · `TRACK01-A`
- Action: navigate directly to `/fabrication/qc-release`.
- Expected: same guard, same `ForbiddenScreen`, sectioned as **"Fabrication"** — this route is
  gated by the mutating capability itself (`fabrication.qc.release`), not by a view-level
  capability, so it is fully unreachable for Reader QC even though QC Engineer is one of Reader
  QC's functional roles. `current_user_has_capability` requires the **access role** to carry the
  capability directly; a functional role only lifts the gate on top of an access role that already
  has it (`supabase/migrations/20260801094000_track02_blockers_fix.sql:85-120`). `project_reader`
  is granted only non-mutating capabilities
  (`supabase/migrations/20260731090000_access_capability_catalog.sql:106-111`, and
  `fabrication.qc.release` is declared `is_mutating = true` at line 69 of the same file).
  (`config/route-capabilities.ts:14`.)

**N5c — Reachable route, mutating controls absent.**

- Route: `/admin/progress-weights`
- Actor: `track01.reader-qc@example.test` · `TRACK01-A`
- Action: open the route with `TRACK01-A` active.
- Expected (**corrected 2026-08-11 from the executed Phase C run — the original prediction below
  was wrong**): the route is denied outright. `ROUTE_CAPABILITIES` has no *exact* entry for
  `/admin/progress-weights`, but it does carry the **prefix** entry `["/admin",
  "project_referential.manage"]` (`config/route-capabilities.ts:10`), and `RouteCapabilityGuard`
  matches by prefix — so `ForbiddenScreen` renders before `ProgressWeightsScreen` mounts, with card
  **"Access denied"** and body **"You do not have access to Project Referential in project
  TRACK01-A."** The page-level `canManage` computation
  (`app/admin/progress-weights/page.tsx:21`) and the `{canManage && …}` control rendering
  (`modules/project-setup/ui/progress-weights-screen.tsx:166-169,226-280`) are therefore never
  reached by a Reader; they remain the second line of defence for a persona that passes the route
  guard but lacks `project_referential.manage`.
- Original (superseded) prediction, kept for traceability: "the page renders (no `ForbiddenScreen`),
  shows the amber notice *Project manager rights required to update progress weights. Read-only
  mode active.* and the **Add Activity** / **Save Weights** controls are absent from the DOM." The
  observed behaviour is strictly stronger, not weaker: no mutating control is reachable either way.

### N6 — `TRACK01-A` / `TRACK01-B` isolation

**Actor (corrected 2026-08-12 from the executed Phase C run):** `track01.project-admin-a@example.test`
(Project Admin on `TRACK01-A`, Project Reader on `TRACK01-B`; `scripts/demo/manifest.ts:435-540`)
works for **N6b–N6f** — use the project switcher in the top bar. It does **not** work for **N6a**:
`/admin/project-referential` is gated on `project_referential.manage` (and every `/admin/*` route is
caught by the `/admin` prefix entry in `config/route-capabilities.ts:10`), which a Project Reader
never holds, so switching this persona to `TRACK01-B` yields `ForbiddenScreen` instead of an empty
referential catalogue. Run **N6a** as `track01.platform-admin@example.test`, who holds Project Admin
on both projects through creator membership.

| Case | Route | Expected isolation | Source |
| --- | --- | --- | --- |
| N6a Referentials | `/admin/project-referential` | None of `TRACK01-A`'s codes (`FAB-A`, `WPS-CS-GTAW-01`, `WDR-001`…, `SC-CS150` NDE matrix rows, etc.) appear on `TRACK01-B` | every referential query filters `.eq("project_id", projectId)` (`modules/project-setup/infrastructure/supabase-execution-reference-repository.ts:50-90,270`) |
| N6b Imports | `/spooling/import`, `/spooling/browse` | `TRACK01-B` shows no import jobs, no `ISO-DEMO-1001`/`ISO-DEMO-2001` | `loadSpoolingJobs` and `loadIsometrics` both filter `.eq("project_id", projectId)` (`modules/engineering/infrastructure/supabase-engineering-repository.ts:30,33`) |
| N6c Worklists | `/testpack/pressure-test/*/preparation` | The **Test Pack** selector on `TRACK01-B` never offers `TP-DEMO-001`; no worklist rows keyed to it exist | Test Pack catalog/readiness/backlog reads filter `.eq("project_id", projectId)` (`modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts:111,117,123`) |
| N6d Tracking history | `/tracking/data-analysis` | No `SP-DEMO-1001-A` row, no history rows, no `FAB-SHOP`/`LAYDOWN-A` occupancy on `TRACK01-B` | tracking reads filter `.eq("project_id", projectId)` (`modules/tracking/infrastructure/supabase-tracking-repository.ts:54`) |
| N6e Test Packs | `/testpack` | *Ready for Test* tile and *Release backlog* show no `TP-DEMO-001`; `TRACK01-B` has zero packs | same pressure-test repository citation as N6c |
| N6f Reports | `/reports` | Downloads from `TRACK01-B` are named with `TRACK01-B`'s own project code, not `TRACK01-A-…`, and contain no `TRACK01-A` joint or pack rows | filename formula `<projectCode>-<stem>-<date>` (`modules/documents/domain/report.ts:73-90`); report queries filter `.eq("project_id", request.projectId)` (`modules/documents/infrastructure/supabase-report-repository.ts:32,59`) |

Record each sub-case with both an A-side and a B-side observation in "Actual state" — the assertion
is the *absence* on B, not a value on A (A's values are already covered by the positive spine).

### N7 — Hard-refresh persistence

Each row below is `Cmd+Shift+R` on the named route, immediately after the cited spine case, with the
durable state re-read from the database rather than from client state.

| Case | After | Route | Expected persistence |
| --- | --- | --- | --- |
| N7a Import | `S3.3` | `/spooling/browse` | Accepted R0 and its spools/welds/support/flange joints/ident codes return unchanged (main runbook §6 S3.3 hard-refresh checkpoint) |
| N7b Fabrication QC release | `S5.4` | `/fabrication/qc-release`, `/fabrication/dashboard` | QC Release date and disabled button persist; dashboard stage survives reload (main runbook §8 S5.4 hard-refresh checkpoint) |
| N7c NDE result / repair | `S5.3` | `/nde` | Reselect the RT/PT batches for `SP-DEMO-1001-A`; the `satisfied` disposition on the accepted repair and the `superseded` disposition on the original rejected obligation both persist. This checkpoint is not named explicitly in the main runbook's NDE section — record it as an addition to this protocol, not as a main-runbook correction |
| N7d Tracking movement | `S7.3` | `/tracking/data-analysis` | Current location `LAYDOWN-A` and all three history rows return unchanged (main runbook §10 S7.3 hard-refresh checkpoint) |
| N7e Flange progress | `S7.4` | `/erection/flange-progress` | `completed` status, UT value `30`, and the append-only history row all return (main runbook §10 S7.4 hard-refresh checkpoint) |
| N7f Test Pack stage | `S8.5` and `S8.7` | `/testpack`, then `/testpack/pressure-test/testing-precomm` | `RFT · 12` persists after S8.5; `Complete` persists after S8.7 (main runbook §11 hard-refresh checkpoints) |
| N7g Report generation | `S9.1`–`S9.2` | `/reports` | The Reports page itself keeps no "generated" flag — the page states plainly that Demo Lite "creates browser downloads only; it keeps no document history, snapshots or handover artifacts" (main runbook §12 S9.2 note). The correct persistence check after report generation is `S9.3`: hard-refresh `/spooling/browse`, `/fabrication/qc-release`, `/erection/rft`, `/testpack` and confirm the underlying data the reports were generated from is unchanged |

### N8 — No unmarked demo-store numbers, fake success, placeholder buttons, or hidden database step

This is not a separate click sequence; it is a property checked on **every** route visited under
§3 and §4. Add a `Placeholder/fake-success audit` note to each case's evidence rather than opening
a new case ID.

Two source-confirmed items are already known and must be recorded as expected cosmetic findings,
not as new FAILs:

- the home page's *Spool Tracking* card still carries a stale `Track 08` badge and *Reports &
  Forms* still carries a stale `Track 11` badge, even though both modules are live and
  Supabase-backed (main runbook §12 correction note, §17 item 15);
- the line-check, item-clearance and testing-precomm worklists print a raw internal UUID in one
  label (`LC-000001 · ISO <uuid>`, `Test Pack <uuid>`) as a known rough edge, not a hidden
  data source (main runbook §8 S8.3, S8.7 notes, §17 item 16).

Any other unmarked number, a success toast with no corresponding durable-state change on refresh,
a button that performs no request, or any UI element that implies a server action happened via
means other than the documented UI-triggered Supabase command, is a genuine FAIL and must be
recorded with full evidence-schema fields, including the first safe network/console error.

## 5. Artifact acceptance

Applies to `S9.1` and `S9.2`.

1. Trigger both downloads from `/reports` on `TRACK01-A` as described in the linked sections.
2. Record the exact filenames the browser saved
   (`TRACK01-A-fabrication-progress-<YYYY-MM-DD>.xlsx`,
   `TRACK01-A-test-pack-rft-pursuit-<YYYY-MM-DD>.pdf`) and confirm both are non-zero bytes.
3. Open the XLSX in a spreadsheet viewer and the PDF in a PDF viewer, outside the browser download
   bar.
4. Confirm the XLSX opens without a repair/corruption warning, and visibly contains `TRACK01-A`
   weld-joint rows (the five `WJ-DEMO-*` joints, per main runbook §12 S9.1 content expectation).
5. Confirm the PDF opens without a repair/corruption warning, and visibly contains the
   `TP-DEMO-001` row with its RFT state and outstanding-blocker counts (main runbook §12 S9.2
   content expectation).
6. **Do not commit either file, and do not place either file inside this repository's working
   tree** — save them to a location outside the checkout (e.g. the browser's default downloads
   directory, cleared afterward) and reference that external path only in the acceptance evidence
   document, never here.

## 6. `NEEDS_CONTEXT`

None. Every required negative-matrix category in the Task 9 plan step (invalid SpoolGen input,
forbidden transition, duplicate/idempotency, stale-state, Reader denial and control absence,
`TRACK01-A`/`TRACK01-B` isolation across all six named surfaces, and refresh persistence across all
seven named events) was confirmed reachable through the current UI on the `TRACK01-A`/`TRACK01-B`
stand, with a source citation, without inventing a business value or a route not present in the
source tree.

## 7. References

- Presenter path (positive spine source): [`docs/runbooks/track-12-demo.md`](../runbooks/track-12-demo.md)
- Entry point and mode selection: [`docs/qa/local-supabase-browser-runbook.md`](local-supabase-browser-runbook.md)
- Optional setup smoke (not covered by this protocol): [`docs/runbooks/track-12-setup-walkthrough.md`](../runbooks/track-12-setup-walkthrough.md)
- Plan: [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](../superpowers/plans/2026-08-10-track-12-demo-release.md) (Task 9)
- Manifest (accounts, projects, reference data): `scripts/demo/manifest.ts`
- Route capability gate: `config/route-capabilities.ts`, `components/pipeqc/route-capability-guard.tsx`
- Access model: `supabase/migrations/20260731090000_access_capability_catalog.sql`,
  `supabase/migrations/20260801094000_track02_blockers_fix.sql`
