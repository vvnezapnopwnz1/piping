# Local Supabase Browser Acceptance Runbook

## Purpose and scope

This runbook lets a human or a browser agent verify the local Supabase implementation
of Tracks 01–06. It is an acceptance procedure, not a substitute for `npm run verify`.
All mutations below are limited to local fixture data at `127.0.0.1` / `localhost`.

Two execution scripts sit under this policy. Read this file for scope, safety and personas;
read the script for the exact controls and expected values:

- `docs/qa/tracks-01-05-agent-walkthrough.md` — access, referentials, imports, revisions and
  the fabrication golden path.
- `docs/qa/track-06-agent-walkthrough.md` — NDE batches, repairs, tracers and the escalation.
- `docs/qa/track-07-agent-walkthrough.md` — the field erection chain and derived Ready For Test.

The supported durable flow is:

```text
Access and referentials -> generic imports -> SpoolGen engineering definition
  -> fabrication -> NDE -> field erection -> Ready For Test
```

The Tracking, Test Pack, Flange and Reports routes have no implementation on this branch. They
render a placeholder naming the track that builds them and are hidden from the sidebar, so there
is nothing there to smoke-test beyond the placeholder itself. **NDE and Erection are no longer
smoke checks**: since Track 06 and Track 07 each has its own fixture and its own walkthrough.

There is also **no longer a mode switch**. The demo implementation, `lib/app-mode.ts` and every
client-side store were removed in Track 07; Supabase is the only implementation. Any instruction
below or in an older script to `export NEXT_PUBLIC_PIPEQC_MODE=supabase` is inert, and every
"confirm there is no DEMO MODE label" step now passes trivially because the label cannot exist.

## Agent operating contract

Use this contract verbatim when delegating a run to Codex through Playwright MCP.

```text
Use Playwright MCP and only http://localhost:3000 (127.0.0.1 needs allowedDevOrigins in
next.config.mjs; it is configured, but localhost is the tested host).
Read docs/qa/local-supabase-browser-runbook.md and execute its requested mode.

Do not read .env, .env.local, shell history, or any secret. Do not request, print,
copy, upload, or persist credentials. Do not use direct SQL, Supabase Studio, service
keys, db reset, Git, or source-file edits. Do not change any non-local website.

Permitted side effects are only the explicitly listed UI actions in fixture project
TRACK01-A. Stop before any action that is not listed. For each case return PASS, FAIL,
or BLOCKED with its case ID, URL, expected result, actual result, and the first relevant
console or network error. Take a screenshot on every FAIL. Do not retry a mutation after
it succeeded or after its state is unclear.
```

The operator starts the stack and fixtures. The agent performs browser work only. It
must ask the operator to change user if a case requires a different authenticated account.

## Safety rules

- Local only. Every bootstrap rejects a non-local Supabase URL; do not bypass that guard.
- The API **Secret** belongs only in the current terminal environment. It is neither a
  browser value nor an agent input. Do not confuse it with the S3 Storage Secret Key.
- `TRACK01_FIXTURE_PASSWORD` must contain at least 12 characters. The scripts reset the
  fixture users to that value whenever Track 01 is run.
- Never commit `.env*`, browser storage state, fixture password, Secret, service key,
  screenshots containing secrets, or test reports with secrets.
- Do not run `supabase test db` against browser fixtures. Measured 2026-08-02: with the
  full Track 01-05 data present it reports `Files=20, Tests=354` (against 21/436 clean) and
  fails in `040_engineering_identity`, `042_spooling_apply` and `051_weld_progress`, the
  cause being `on conflict do nothing` on shared `system_reference_entries` codes. Every
  test file ends in `rollback`, so the conflict runs one way only: bootstrap data breaks
  pgTAP, never the reverse. Reset the local database before the database suite, then
  bootstrap browser fixtures again if they are needed.
- A fixture bootstrap is idempotent for its reference data, but it does **not** undo
  fabrication events already recorded by a browser workflow. Use a clean database when
  replaying a completed golden path.

## Fixture accounts

All use the password supplied as `TRACK01_FIXTURE_PASSWORD`.

| Persona | Email | Expected local access |
| --- | --- | --- |
| Platform Admin | `track01.platform-admin@example.test` | Platform admin; Projects A and B |
| Platform Observer | `track01.platform-observer@example.test` | Platform admin; no membership |
| Project Admin A | `track01.project-admin-a@example.test` | Project Admin, `TRACK01-A` only |
| Reader QC | `track01.reader-qc@example.test` | Project Reader + QC Engineer, A |
| QC Editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer, A |
| NDE Subcontractor | `track01.nde-subcontractor@example.test` | NDE Inspector, `TRACK01-SUB-A` / `TRACK01-PDS-A` only |

## Start the local stack and seed every fixture

Use one terminal. Do **not** paste the hidden `read` prompts together with the other
commands: enter each value manually when prompted.

### 1. Start services, apply pending local migrations and load public browser config

```zsh
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
set -euo pipefail

/opt/homebrew/bin/supabase start
/opt/homebrew/bin/supabase migration up --local

set -a
source .env.local
set +a

export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is missing in .env.local}"
export SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in .env.local}"
```

### 2. Enter local-only secrets interactively

Run these commands **one at a time**. The first value is the API Secret shown under
Authentication Keys by `supabase status`; the second is a new or existing local fixture
password of at least 12 characters.

```zsh
read -r -s "SUPABASE_SERVICE_ROLE_KEY?Local Supabase API Secret: "
echo
```

```zsh
read -r -s "TRACK01_FIXTURE_PASSWORD?Fixture-user password (12+ characters): "
echo
export SUPABASE_SERVICE_ROLE_KEY TRACK01_FIXTURE_PASSWORD
```

### 3. Full fixture chain and dev server

This is the normal fast path for acceptance. Track 05 writes the Track 05 referentials and
creates the accepted `ISO-T4-001/R0` engineering definition if it is absent. Track 06 adds
the NDE population — a second isometric of twelve already-welded shop joints — and is only
needed for a Track 06 walk.

```zsh
npm run bootstrap:track01-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures &&
npm run bootstrap:track04-browser-fixtures &&
npm run bootstrap:track05-browser-fixtures &&
npm run bootstrap:track06-browser-fixtures &&   # Track 06 and Track 07 walks
npm run bootstrap:track07-browser-fixtures &&   # Track 07 walks only
npm run dev
```

Expected Track 05 and Track 06 output on a clean local database:

```text
Track 05 referentials reconciled: 18 rows upserted into project <uuid>.
Engineering definition imported: 7 rows applied to ISO-T4-001.
Track 06 welders reconciled: 2 welders and 2 WPS links in project <uuid>.
Engineering definition imported: 15 rows applied to ISO-T6-001.
Weld progress recorded on 12 of 12 Track 06 joints; 12 NDE obligations now exist on ISO-T6-001.
```

**After `supabase db reset`, the Track 01 bootstrap can fail with a `findOrCreateUser` stack
trace.** `db reset` restarts the containers and the script can beat GoTrue to the port. It is
a race, not a defect: re-run the chain.

Open `http://localhost:3000`, sign in as Project Admin A and choose `TRACK01-A`.
The application must not show a DEMO MODE label. **Use `localhost`, never `127.0.0.1`** —
Next.js blocks the latter as a cross-origin dev resource and the page never leaves
"Loading PipeQC…".

### Clean replay of a completed golden path

`supabase db reset` destroys the whole **local** database. Run it only when its contents
are disposable and only after stopping any work that needs those rows:

```zsh
/opt/homebrew/bin/supabase db reset
```

Then repeat sections 1–3. Do not use reset as a routine repair step.

### Track 04 UI-import mode

The full chain above is not suitable for proving the positive Track 04 upload UI flow:
Track 05 creates R0 itself. To test upload/preview/apply through the browser, start only
Tracks 01–04 and the dev server first:

```zsh
npm run bootstrap:track01-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures &&
npm run bootstrap:track04-browser-fixtures &&
npm run dev
```

Run T04 below using exactly `scripts/weld.txt`, `scripts/trace.txt` and `scripts/supp.txt`.
After the browser has accepted R0, stop the dev server only if needed, then use the same
terminal environment to run:

```zsh
npm run bootstrap:track05-browser-fixtures
```

It adds Track 05 referentials and skips importing R0 because the browser has already
created the accepted definition.

## Universal evidence rules

For every scenario capture:

1. Case ID and final status: PASS, FAIL or BLOCKED.
2. Current URL and active fixture persona/project.
3. Expected and actual visible outcome.
4. On failure: one screenshot, the first console error, and the relevant failing request
   (method, path, HTTP status and safe response message; never include Authorization).
5. For a durable mutation: hard-refresh the named route and confirm the stated result.

## Browser scenarios

### B00 — Baseline and isolation

**Actor:** Project Admin A in `TRACK01-A`.

1. Open `/` and confirm Supabase mode, the active-project label and no DEMO MODE label.
2. Reload the page; the selected valid project and visible navigation remain stable.
3. Use the project switcher to select `TRACK01-B`; open `/admin/project-referential`.
   Project-A fixture values must not appear in B.
4. Switch back to A.

**PASS:** no uncaught browser error; project data is isolated; navigation is capability
filtered rather than a static demo menu.

### T01 — Access Rights and authorization

#### T01-01 — Reader denial

**Actor:** Reader QC, `TRACK01-A`. **URL:** `/admin/access-rights`.

1. Navigate directly to the URL.
2. Confirm a Forbidden/access-denied state; no Access Rights editor is usable.

#### T01-02 — Failed mutation preserves form input

**Actor:** Project Admin A. **URL:** `/admin/access-rights`.

1. Open the editor for QC Editor.
2. Set access role to Project Reader while retaining QC Engineer functional role.
3. Submit.
4. Confirm the mutation is refused, the dialog remains open and all entered values remain
   visible. Do not attempt a second identical mutation.

#### T01-03 — Editor capability visibility

**Actor:** Project Admin A. **URL:** `/admin/access-rights`.

1. Set QC Editor to Project Editor with QC Engineer role and save.
2. Sign in as QC Editor, select A and confirm Fabrication navigation is present.
3. Return QC Editor to its fixture default if it was changed differently.

#### T01-04 — Subcontractor scope

**Actor:** NDE Subcontractor. **URLs:** relevant WPS/PDS selectors, then a direct foreign
route if one is available.

1. Confirm only `TRACK01-SUB-A` and `TRACK01-PDS-A` are offered.
2. Confirm a foreign PDS/subcontractor value is absent and cannot be reached through URL
   navigation.

#### T01-05 — Audit

**Actor:** Platform Admin or operator in local Studio.

Confirm the completed Access Rights mutation appears in `public.audit_events` for
`TRACK01-A` with actor, action, before state and after state.

### T02 — System and project referentials

#### T02-01 — System Referential lifecycle

**Actor:** Platform Admin. **URL:** `/admin/system-referential`.

1. Confirm all four sections load.
2. Create one uniquely named test Material Type, edit it, archive it and reactivate it.
3. Confirm Film Quantity, UT Calculation and Torquing have no physical Delete action and
   are read-only where the UI states so.
4. Reload and confirm the Material Type lifecycle persisted.

#### T02-02 — Project Referential readiness and dependency

**Actor:** Project Admin A. **URL:** `/admin/project-referential`.

1. Confirm every reference group loads and Gates B/C report the expected ready state.
2. Locate the active `BW-T4` Weld Type used by the NDE Matrix. Archive it.
3. Confirm the existing matrix remains visible, active selectors no longer offer `BW-T4`,
   and readiness reports the missing dependency.
4. Reactivate `BW-T4`, reload and confirm readiness recovers **before continuing**.

#### T02-03 — Progress weights

**Actor:** Project Admin A. **URL:** `/admin/progress-weights`.

1. Submit weights totalling 90.
2. Confirm the invariant error appears and the dialog remains open.
3. Submit a valid total of 100.
4. Reload and confirm every phase row reflects the one successful replacement.

#### T02-04 — Branding and isolation

**Actor:** Project Admin A. **URL:** `/admin/project-definition`.

1. Upload only non-sensitive test owner/contractor image files.
2. Reload and confirm signed previews render.
3. Switch to Project B and confirm it cannot render A's object URL.

### T03 — Generic project imports

**Actor:** Project Admin A. **URL:** `/admin/imports`.

1. Select **Project Piping Material List** and download the template.
2. Prepare a three-row local test sheet with one empty **Ident Code**. Upload it.
   **PASS:** blocker is visible and Apply is disabled.
3. Fill the missing Ident Code and upload the corrected sheet. Apply it.
4. Hard-refresh `/admin/imports` and open Project Referential -> Piping Material List.
   **PASS:** the applied records persist.
5. In Import history confirm the applied job cannot be applied twice. Upload the same file
   as a new job and confirm the overwrite/conflict path is explicit. Confirm Download source
   works for a generic import job.
6. Repeat direct navigation as Reader QC. **PASS:** Imports is hidden/unavailable and
   mutation is refused.
7. Switch to Project B. **PASS:** A's import history is absent.

`spooling_definition` may appear in generic Import history after Track 04/05. It must be
labelled **SpoolGen definition** and must not crash the page.

### T04 — SpoolGen import and revisions

**Required mode:** Track 04 UI-import mode above; do this before Track 05 bootstrap.
**Actor:** Project Admin A. **URLs:** `/spooling/import`, `/spooling/browse`,
`/spooling/revisions`.

1. Open `/spooling/browse`. **PASS:** the clean state reports no imported isometrics.
2. On `/spooling/import`, attach only `scripts/supp.txt`, validate and confirm an error
   names missing `weld.txt`; no job is usable.
3. Attach a `weld.txt` larger than 4 MB. **PASS:** rejection happens before a Storage upload.
4. Attach a copy with `PDS_AREA=PDS-NOPE`. **PASS:** a red PDS error is shown and Apply is
   disabled.
5. Attach `scripts/weld.txt`, `scripts/trace.txt` and `scripts/supp.txt`. Validate.
   **PASS:** WPS warnings are non-blocking, error count is zero and Apply is enabled.
6. Apply R0. Hard-refresh and browse `ISO-T4-001`.
   **PASS:** accepted R0, both spools, welds, support and bill-of-material lines persist.
7. Upload a copy with `ISO_REVISION=R1` and one changed spool weight.
   **PASS:** changed spool is Revised and Apply names missing decisions.
8. Set the changed spool to Rework. **PASS:** its welds require their own decisions.
   Set it to Done without Modification instead. **PASS:** weld decisions disappear.
9. Make every required decision and apply R1.
   **PASS:** R1 is accepted; R0 is superseded, selectable and read-only.
10. Confirm applied job cannot be applied a second time. Re-upload R1 unchanged.
    **PASS:** duplicate revision number is refused.
11. Sign in as Reader QC and check `/spooling/import`.
    **PASS:** no working Validate control and a direct attempt is refused.
12. Sign in as a Project-B member and browse. **PASS:** Project-A isometrics are absent.

### T05 — Fabrication golden path

**Required state:** Track 05 full fixture chain, fresh material/fabrication event state.
**Actor:** Project Admin A, project `TRACK01-A`.

#### T05-01 — Material traceability

**URL:** `/fabrication/material-check`, spool `SP-T4-001-A`.

1. Click **Record Start Fab**.
2. Click **Issue QC-13** and note the form number in the success toast.
3. Enter `HEAT-T5-100` for `IDN-T5-100` only; try **Record traces**.
   **PASS:** Material Check does not appear yet.
4. Enter `HEAT-T5-200` for `IDN-T5-200`; click **Record traces**.
   **PASS:** stage timeline gains Material check without a manually entered stage date.

#### T05-02 — Shop weld progress

**URL:** `/fabrication/weld-progress`, spool `SP-T4-001-A`.

For each joint `W-T4-001`, then `W-T4-002`:

1. Choose subcontractor `SUB-T5`.
2. Choose WPS `WPS-T5`.
3. Choose root welder `W-T5-1` and cap welder `W-T5-2`.
4. Set weld date to today and click **Record weld progress**.
5. **PASS:** the joint shows one pending RT obligation and one PWHT requirement.

Negative check: select `SP-T4-001-B` / `W-T4-003` and choose the same welder for root and cap.
**PASS:** the allocation error is displayed before the browser sends a request. A root+cap total
other than 100 is not reachable from this screen — the card derives the cap as `100 − root`.

#### T05-03 — Support, NDE/PWHT gates and QC release

**URL:** `/fabrication/qc-release`, spool `SP-T4-001-A`.

1. Click **Mark installed** for `SU-T4-001`.
2. **PASS:** Fabricated gets a date, but **QC release spool** remains disabled and names
   outstanding NDE/PWHT counts.
3. Click **Mark accepted** for both RT obligations.
4. For both PWHT requirements enter chart `CHART-T5-1`, then click **Record accepted**.
5. **PASS:** **QC release spool** enables. Click it and confirm QC release appears.

#### T05-04 — Paint and laydown

1. **URL:** `/fabrication/paint`; choose `SP-T4-001-A`; click **Record Sent to Paint**.
2. Choose line service `LS-T5`, enter DFT `200` and a W10P number.
   **PASS:** paint-matrix refusal appears.
3. Enter DFT `250`, W10P `W10P-T5-1` **and a Final QC on date** — that field starts empty, and
   without it `record_laydown` refuses in step 4. Click **Record painting**.
   **PASS:** Painted and Final QC both gain their dates.
4. **URL:** `/fabrication/laydown`; choose `SP-T4-001-A`, location `YARD-T5`, then click
   **Record laydown**.
5. **URL:** `/fabrication/dashboard`; hard-refresh.
   **PASS:** current stage is laydown and the complete stage history is present.
6. In a second browser session signed in as another valid Project-A member, open the
   dashboard. **PASS:** the same durable result and counts are visible.

#### T05-05 — Fabrication negative paths

1. Try recording an already-welded joint again.
   **PASS:** locked-joint message, never raw SQL text.
2. Create a manual revision at `/spooling/revisions`, then use the old spool revision at
   `/fabrication/material-check` to try recording a trace.
   **PASS:** accepted-revision/PQC31 site-engineer error message.
3. Sign in as Reader QC and open `/fabrication/qc-release`.
   **PASS:** route is forbidden/unreachable and no release control is visible.

### T06 — NDE quality: batches, repairs, tracers and the escalation

**Scope:** `/nde` and `/nde/dashboard`, plus the effect NDE has on `/fabrication/qc-release`.
**Fixture:** `ISO-T6-001`, twelve already-welded shop joints — `npm run bootstrap:track06-browser-fixtures`.

The full case-by-case script is **`docs/qa/track-06-agent-walkthrough.md`**, written against a
real run. Do not paraphrase it here; run it. What this policy document adds:

1. **Track 06 mutations are irreversible through the UI.** An NDE result cannot be un-recorded,
   and a rejection cascades into repair and tracer obligations that no screen deletes. Replaying
   the walk needs `supabase db reset` and the whole bootstrap chain, not a tidy-up.
2. **Order is load-bearing.** The NDE100 escalation counts four rejections *inside one batch*
   attributed to *one welder*. A case executed out of order does not merely fail, it makes every
   later case meaningless.
3. **The Track 06 population has its own welders on purpose.** `W-T6-1` and `W-T6-2` are
   disjoint from Track 05's `W-T5-1`/`W-T5-2` so that an escalation raised in a Track 06 walk
   cannot change what `/fabrication/qc-release` demands of `SP-T4-001-A`. If a walk ever shows
   Track 05 obligations at 100 % coverage, stop: the populations have crossed.
4. **Reader QC reaches `/nde` and is refused every mutation.** `project_reader` grants
   `nde.view`; `current_user_has_capability` requires the *access* role to carry the capability,
   and a functional role such as QC Engineer only lifts the gate on top of it. A reachable
   `/nde` for Reader QC is correct, and so is the 403 on `create_nde_batch`.

### S01 — UI smoke-only route sweep

**Actor:** Project Admin A unless a route guard says otherwise.

Open every route below. For each, record whether it renders, has no uncaught browser error,
has a sensible empty/fixture state, and respects its guard. Do not infer durable real-mode
business support from this smoke pass.

- Erection: `/erection/dashboard`, `/erection/to-site`, `/erection/material-check`,
  `/erection/erected`, `/erection/welded-bolted`, `/erection/supported`,
  `/erection/field-qc-release`, `/erection/rft`, `/erection/weld-progress`,
  `/erection/flange-progress`.
- NDE: `/nde`, `/nde/dashboard`.
- Tracking: `/tracking`, `/tracking/data-analysis`, `/tracking/print-barcodes`.
- Reports: `/reports`. Flange: `/flange`.
- Test Pack: `/testpack`, `/testpack/builder`, `/testpack/explorer`, `/testpack/pressure-test`,
  and, for `line-check`, `item-clearance`, `blinding`, `testing-precomm`, `reinstatement`,
  each parent route plus `/preparation` and `/progress`.
- Configuration: `/settings`, `/documentation`.

## Agent report template

```md
# Local Supabase Browser Acceptance — YYYY-MM-DD

Mode: full chain | Track 04 UI-import mode
App URL: http://localhost:3000
Fixture project: TRACK01-A
Run by: human | agent name

| Case | Persona | Status | URL | Result / evidence |
| --- | --- | --- | --- | --- |
| B00 | Project Admin A | PASS | / | ... |
| T01-01 | Reader QC | PASS | /admin/access-rights | ... |

Failures:
- Case ID:
- Expected:
- Actual:
- Screenshot:
- Console error:
- Request method/path/status:

Not run / blocked:
- Case ID and reason.
```

## References

- `docs/TRACK01_BROWSER_FIXTURES.md` — local fixture users and access matrix.
- `docs/TRACK02_BROWSER_FIXTURES.md` and `docs/TRACK03_BROWSER_FIXTURES.md` — generic
  referential/import bootstrap contracts.
- `docs/TRACK05_BROWSER_FIXTURES.md` — golden fixture codes and fabrication click path.
- `docs/superpowers/plans/2026-08-03-track-04-engineering-revisions.md` — detailed Track 04
  import/revision acceptance rationale.
- `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` — construction workflow,
  acceptance gates and negative paths.
