# Local Supabase Browser Acceptance Runbook

**Document status: static source-verified; live Task 12 pending.** The Track 12 entry point below
was written from the current source tree, migrations and `scripts/demo/manifest.ts` on this branch.
No step in the Track 12 path has been executed in a browser or against a live database yet.

## Purpose and scope

This file is the **entry point** for local browser acceptance. It decides *which* procedure to run,
who is allowed to do what, and what must never happen. The step-by-step click paths live in the
documents it points at.

There is **one recommended integrated path — Track 12** — and a set of **historical, per-track
regression scripts (Tracks 01–11)** kept for narrow re-verification of a single subsystem.

### The two supported human modes

Both start from the same prepared stand and neither needs Playwright, a per-track fixture
bootstrap, or any direct database action.

**Mode A — main demo (default).**

```bash
npm run demo:prepare -- --confirm-local-reset
npm run dev
```

then follow [`docs/runbooks/track-12-demo.md`](../runbooks/track-12-demo.md) — login and readiness,
rich referentials, the four-file SpoolGen import, fabrication and QC evidence, NDE with a real
repair cycle, erection to derived Ready For Test, tracking and flange, a Test Pack through
pre-commissioning, and two real report downloads.

**Mode B — from-scratch setup smoke (optional).**

```bash
npm run demo:prepare -- --confirm-local-reset
npm run dev
```

then follow
[`docs/runbooks/track-12-setup-walkthrough.md`](../runbooks/track-12-setup-walkthrough.md) —
configuring a project (`TRACK-SETUP-CHECK`) with visible UI controls only, assigning a Project
Admin, a Project Editor and a Project Reader, and building one real dependency chain until the
readiness panel reports **Gate B: Ready for Import**.

**Mode B pollutes the stand on purpose**, so the order is not negotiable:

```text
demo:prepare  ->  setup walkthrough  ->  demo:prepare again  ->  main demo
```

Mode B intentionally leaves a third project, `TRACK-SETUP-CHECK`, on the stand, plus new
memberships on it for the setup-walkthrough personas (§3/§5 of the setup walkthrough). Neither
touches `TRACK01-B`, which remains the sparse isolation control throughout.

Skipping the second `demo:prepare` therefore means `npm run demo:check` is **not expected to report
a full PASS** before it runs: the `projects` check compares against exactly two projects and sees a
third (`scripts/demo/preflight.ts:324-374`), and the `users` check compares memberships exactly and
sees the added `TRACK-SETUP-CHECK` memberships (`scripts/demo/preflight.ts:421-470`). Both are
expected deviations after Mode B, not defects — static source review shows the `isolation` check
reads only `TRACK01-B`'s own reference rows and is unaffected by a third project existing elsewhere
(`scripts/demo/preflight.ts:696-714`), so it should not be declared failed on that basis without
actual live evidence to the contrary. The second `demo:prepare` is what removes the Mode B state and
restores the normal two-project main-demo baseline; that is exactly why the reset comes before the
main demo.

`npm run demo:check` is read-only and safe to run at any time, including mid-demo.

### What Tracks 01–11 are now

The per-track walkthroughs below remain valid as **focused historical / regression references** for
one subsystem at a time. They are **not** the entry point for a demo or for an end-to-end
acceptance run, and their `bootstrap:track0X-browser-fixtures` commands are **not** used by either
Track 12 mode.

- [`tracks-01-05-agent-walkthrough.md`](tracks-01-05-agent-walkthrough.md) — access, referentials,
  generic imports, revisions, the fabrication golden path.
- [`track-06-agent-walkthrough.md`](track-06-agent-walkthrough.md) — NDE batches, repairs, tracers,
  the escalation.
- [`track-07-agent-walkthrough.md`](track-07-agent-walkthrough.md) — field erection and derived
  Ready For Test.
- [`track-08-agent-walkthrough.md`](track-08-agent-walkthrough.md) — spool tracking.
- [`track-09-agent-walkthrough.md`](track-09-agent-walkthrough.md) — flange management.
- [`track-10-agent-walkthrough.md`](track-10-agent-walkthrough.md) — Test Pack build and pressure
  test.
- [`track-11-agent-walkthrough.md`](track-11-agent-walkthrough.md) — reports.

### Correction to earlier revisions of this file

An earlier revision stated that Tracking, Test Pack, Flange and Reports "have no implementation on
this branch", "render a placeholder naming the track that builds them", are "hidden from the
sidebar", and that there is "nothing there to smoke-test". **All four claims are wrong on this
branch and are withdrawn.** From source:

| Module | Real routes | Sidebar entry | Capability gate |
| --- | --- | --- | --- |
| Tracking | `/tracking`, `/tracking/data-analysis`, `/tracking/print-barcodes`, `/tracking/devices` | CONSTRUCTION → **Tracking** → **Dashboard**, **Data Analysis**, **Barcode Printing**, **Mobile Device Management** | `tracking.view` |
| Test Pack | `/testpack`, `/testpack/builder`, `/testpack/explorer`, `/testpack/pressure-test/**` | TESTING → **Testpack** | `testpack.view` |
| Flange | `/flange` (browse), `/erection/flange-progress` (operate) | TESTING → **Flange Management**, CONSTRUCTION → **Flange Progress** | `flange.view` |
| Reports | `/reports` | **REPORTS** → **Reports** | `reports.view` |

(`config/navigation.ts:141-357`, `config/route-capabilities.ts`.) Each is a Supabase-backed module
with durable commands, and each is exercised by the Track 12 main demo. A missing sidebar item
means the signed-in role lacks the capability, or the sidebar is collapsed to icons — expand it
with **Toggle Sidebar** in the top bar.

There is also **no mode switch**. The demo implementation, `lib/app-mode.ts` and every client-side
store were removed in Track 07; Supabase is the only implementation. Any instruction below or in an
older script to `export NEXT_PUBLIC_PIPEQC_MODE=supabase` is inert, and every "confirm there is no
DEMO MODE label" step now passes trivially because the label cannot exist.

## Who may do what

The two roles are separate on purpose, and the split is the same for Mode A, Mode B and any
Track 01–11 regression run.

### Human presenter / operator

May:

- enter secrets interactively at a masked prompt (`SUPABASE_SERVICE_ROLE_KEY`,
  `TRACK01_FIXTURE_PASSWORD`) and type an account password into the login form;
- run `npm run demo:prepare -- --confirm-local-reset`, `npm run dev` and `npm run demo:check`;
- decide when to re-prepare the stand;
- after preparation, drive the whole session through the UI alone — Mode A and Mode B require no
  further terminal command.

### Browser agent

May:

- open only `http://localhost:3000`;
- perform UI gestures — click, type, select, upload the four `demo-data/spoolgen/*.txt` files where
  the procedure says so;
- read the DOM, the network log and the console, and take screenshots.

Must not:

- read or write `.env`, `.env.local`, shell history, or any secret; request, print, copy, upload or
  persist a credential;
- use a service key, direct SQL, Supabase Studio, a direct Supabase client call, `supabase db
  reset`, `demo:prepare`, Git, or any source-file edit;
- perform any action outside the procedure it was given, or touch any non-local site;
- **retry an ambiguous mutation.** If a click produced no toast or the result is unclear: hard
  refresh, read the durable state, and report it. Never click again "to be sure".

It must ask the operator to change user when a case needs a different authenticated account.

Use this contract verbatim when delegating a run:

```text
Use only http://localhost:3000 (127.0.0.1 needs allowedDevOrigins in next.config.mjs; it is
configured, but localhost is the tested host).
Read docs/qa/local-supabase-browser-runbook.md, then execute the procedure you were given:
  - docs/runbooks/track-12-demo.md              (main demo), or
  - docs/runbooks/track-12-setup-walkthrough.md (setup smoke), or
  - one docs/qa/track-XX-agent-walkthrough.md   (historical regression).

Do not read .env, .env.local, shell history, or any secret. Do not request, print, copy,
upload, or persist credentials. Do not use direct SQL, Supabase Studio, service keys, direct
Supabase calls, db reset, demo:prepare, Git, or source-file edits. Do not change any non-local
website.

Permitted side effects are only the UI actions the chosen procedure lists, in its project.
Stop before any action that is not listed. For each case return PASS, FAIL, or BLOCKED with its
case ID, URL, actor, active project, expected result, actual result, and the first relevant
console or network error. Take a screenshot on every FAIL. Never retry a mutation after it
succeeded or after its state is unclear — refresh, inspect the durable state, and report.
```

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
- `demo:prepare` is **reset-based, not incremental**. Running it again destroys every result of a
  rehearsal and restores the known start state. It is the recovery tool of last resort, not a
  routine "just to be safe" step ten minutes before a demo.

## Accounts

Every account uses the password supplied interactively as `TRACK01_FIXTURE_PASSWORD`. It is typed
into the login form by the human presenter and appears in no document, slide, screenshot or
evidence file.

### Track 12 stand (Modes A and B)

Created by `npm run demo:prepare`. The authoritative list is
`scripts/demo/manifest.ts:435-540`; the roles below are read from it.

| Persona | Email | Access on the prepared stand |
| --- | --- | --- |
| Platform Admin | `track01.platform-admin@example.test` | platform admin; Project Admin on `TRACK01-A` and `TRACK01-B` |
| Platform Observer | `track01.platform-observer@example.test` | platform admin; no membership |
| Project Admin A | `track01.project-admin-a@example.test` | Project Admin on `TRACK01-A`; Project Reader on `TRACK01-B` |
| QC Editor | `track01.qc-editor@example.test` | Project Editor on `TRACK01-A` + QC Engineer, NDE Inspector, Spooling Team, Fabrication Contributor, Erection Contributor, Tracking Operator |
| Reader QC | `track01.reader-qc@example.test` | Project Reader on `TRACK01-A` + QC Engineer |
| NDE Subcontractor | `track01.nde-subcontractor@example.test` | Subcontractor on `TRACK01-A` + NDE Inspector, scoped to `NDE-A` / `PDS-100` |

Mode B changes three of these memberships on the setup project; see the setup walkthrough §3 and
§5.

### Track 01–11 bootstrap fixtures (historical only)

The per-track `bootstrap:track0X-browser-fixtures` scripts create the same six emails with
**different** project scoping — the NDE subcontractor is scoped to `TRACK01-SUB-A` /
`TRACK01-PDS-A` rather than `NDE-A` / `PDS-100`, and only `TRACK01-A`/`TRACK01-B` reference data
from those tracks exists. Read `docs/TRACK01_BROWSER_FIXTURES.md` for that access matrix. **Do not
mix the two stands in one session** — the Track 12 modes must never be run on top of a
per-track bootstrap, and vice versa.

## Start the local stack and seed every fixture (Tracks 01–11 only)

**Neither Track 12 mode uses this section.** For Mode A or Mode B, run
`npm run demo:prepare -- --confirm-local-reset` and `npm run dev` as described in
[`docs/runbooks/track-12-demo.md` §1](../runbooks/track-12-demo.md) and stop there. What follows is
the historical per-track bootstrap chain, kept for single-subsystem regression work.

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

## Browser scenarios (Tracks 01–11 regression only)

**These cases are not the demo path and are not an end-to-end acceptance run.** They exercise one
subsystem at a time against the per-track bootstrap fixtures. For an integrated run use Mode A; for
a from-scratch configuration run use Mode B. The Track 12 browser acceptance protocol is a separate
document produced under Task 9.

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
5. With no project selected, confirm the page reads *"Select a project to manage its progress
   weights."* rather than rendering an editor against a placeholder project id.

**Negative — Project Reader:** on the same URL the mutating controls (**Add Activity**,
**Save Weights**, the per-row inputs and delete actions) must be **absent**, not merely rejected on
submit. The page derives `canManage` from `project_referential.manage`, the capability
`set_project_progress_weights` itself enforces.

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
has a sensible empty/fixture state, and respects its guard.

This sweep proves reachability, nothing more. It is **not** evidence that a module lacks durable
business support, and the absence of data on a route under a per-track fixture set says nothing
about the module: Tracking, Test Pack, Flange and Reports all carry real Supabase-backed commands
and are exercised properly by the Track 12 main demo, not here.

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

Mode: Track 12 main demo | Track 12 setup smoke | Tracks 01-11 full chain | Track 04 UI-import
App URL: http://localhost:3000
Project: TRACK01-A | TRACK01-B | TRACK-SETUP-CHECK
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

Track 12 (the recommended path):

- [`docs/runbooks/track-12-demo.md`](../runbooks/track-12-demo.md) — Mode A, the presenter demo.
- [`docs/runbooks/track-12-setup-walkthrough.md`](../runbooks/track-12-setup-walkthrough.md) —
  Mode B, the UI-only setup smoke.
- [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](../superpowers/plans/2026-08-10-track-12-demo-release.md)
  and
  [`docs/superpowers/specs/2026-08-10-track-12-demo-release-design.md`](../superpowers/specs/2026-08-10-track-12-demo-release-design.md)
  — plan and design.
- `scripts/demo/manifest.ts` — the authoritative account, project and reference manifest.

Tracks 01–11 (historical / regression):

- `docs/TRACK01_BROWSER_FIXTURES.md` — local fixture users and access matrix.
- `docs/TRACK02_BROWSER_FIXTURES.md` and `docs/TRACK03_BROWSER_FIXTURES.md` — generic
  referential/import bootstrap contracts.
- `docs/TRACK05_BROWSER_FIXTURES.md` — golden fixture codes and fabrication click path.
- `docs/superpowers/plans/2026-08-03-track-04-engineering-revisions.md` — detailed Track 04
  import/revision acceptance rationale.
- `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` — construction workflow,
  acceptance gates and negative paths.
