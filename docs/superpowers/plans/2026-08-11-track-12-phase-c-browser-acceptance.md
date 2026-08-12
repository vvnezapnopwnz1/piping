# Track 12 — Phase C execution plan (manual browser release gate)

> **For agentic workers:** this plan executes Task 12 of
> [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](2026-08-10-track-12-demo-release.md).
> It adds no new scope: it only fixes the **order**, the **role/project choreography**, the
> **evidence cadence**, and the **stop conditions** for a run that the protocol
> [`docs/qa/track-12-agent-walkthrough.md`](../../qa/track-12-agent-walkthrough.md) already
> specifies case-by-case. Steps use checkbox (`- [ ]`) syntax.

**Goal:** turn every "Expected" line in `docs/qa/track-12-agent-walkthrough.md` and every item in
`docs/runbooks/track-12-demo.md` §17 into an **observed** result recorded in
`docs/acceptance/track-12-demo-release.md`, using only the application's own UI on
`http://localhost:3000`, with no SQL, no Studio, no service-role call, no fixture script and no
Playwright.

**Non-goals:** re-designing cases, inventing business values, broadening Track 12 into a refactor,
or closing the roadmap (that is Task 13).

---

## 0. Entry gate — do not start until this is true

**Hard rule: if Phase B is not a fully recorded `PASS`, Phase C does not begin.** No baseline case,
no sign-in, no `npm run dev` "just to look".

- [ ] **G1 — Phase A is PASS.** `docs/acceptance/track-12-demo-release.md` Phase A shows the
  authoritative rerun as PASS, with A5 (generated-types diff) classified as a *pre-existing baseline
  failure* in §5. That classification is accepted; it does not block Phase C.

- [ ] **G2 — Phase B is PASS.** Every row B1–B6 in the acceptance record is `PASS` with real output:
  `demo:prepare` reached an all-PASS embedded preflight; `node --import tsx --test scripts/demo/*.test.ts`
  passed; **two** `demo:check` runs produced identical successful diagnostics; the start-state proof
  (counts per manifest family, green `TRACK01-A` readiness, sparse `TRACK01-B`, four lifecycle
  examples, package parser shape, zero engineering/operational rows) is recorded; `git diff --check`
  clean.

  At the time this plan is written **Phase B is `NOT RUN`** — it was interrupted by the
  `system_film_quantity_rules` service-role grant regression, which was fixed
  (`supabase/migrations/20260815090100_...`) and closed out through a Phase A rerun. Phase B must be
  executed to completion first.

- [ ] **G3 — If any Phase B row is `FAIL` or `BLOCKED`: stop.** Apply the gate-failure policy
  (Task 11 / Task 10 Step 7): record the exact step and durable evidence in acceptance §5, add a
  focused failing test, make the smallest correction, rerun the focused test, then rerun **Phase A
  on a clean reset** and **Phase B on a newly prepared stand**. Re-evaluate G1–G3 afterwards. Phase C
  entry is re-decided from scratch; a partially green Phase B never authorises a "quick look" in the
  browser.

- [ ] **G4 — The stand has not been touched since Phase B.** Between the Phase B `demo:check` and
  the first browser action, nothing may have written to the database: no SQL, no Studio, no
  service-role script, no second `demo:prepare`, no other branch's dev server. If in doubt, re-run
  `npm run demo:prepare -- --confirm-local-reset` and re-do Phase B (B2–B6) rather than starting
  Phase C on an unknown stand.

- [ ] **G5 — Environment metadata captured** into acceptance §0 *before* the first case:
  `git rev-parse HEAD`, `git status --short`, `supabase migration list --local` (latest applied),
  date/time, operator, browser + version, and the confirmation that the app URL is
  `http://localhost:3000`.

### Browser-session preconditions

- [ ] Start the app: `npm run dev`. Keep a **second terminal** free for `npm run demo:check`
  (read-only, safe mid-run, per main runbook §14 rule 4). Record any mid-run `demo:check` you
  actually execute.
- [ ] Use `http://localhost:3000` only. **Never `127.0.0.1:3000`** — cross-origin, the shell hangs
  at "Loading PipeQC…" (main runbook §14 rule 8).
- [ ] Fresh browser profile or a clean window; **password manager / autofill disabled**, so no
  credential can appear in a screenshot.
- [ ] DevTools open on Console + Network with *Preserve log* enabled, for the "first safe
  network/console error" evidence field.
- [ ] Downloads directory set **outside the repository checkout**; a scratch directory outside the
  checkout reserved for FAIL/BLOCKED screenshots.
- [ ] Sidebar expanded (**Toggle Sidebar**) so navigation is demonstrated by clicking, not by typing
  routes. Address-bar navigation is a recovery path — and is the *deliberate* method only for the
  N5a/N5b direct-route denial cases.

### Who executes what

| Actor | May do | Must not do |
| --- | --- | --- |
| Human operator | enter secrets and passwords at the login form, sign personas in/out, run `demo:prepare`/`demo:check`, open the downloaded XLSX/PDF | — |
| Browser agent (manual driving or `claude-in-chrome` under the §1 contract) | click, type, select, upload the four `demo-data/spoolgen/*.txt`, read DOM/network/console, screenshot **only** on FAIL/BLOCKED | read `.env*`, see/type/persist any secret, use SQL/Studio/service key, run `demo:prepare`/`demo:check`/git/source edits, retry an ambiguous mutation, leave `localhost` |
| Product owner | C6 rehearsal and §6 sign-off | — (C6 cannot be substituted by an agent run; the track cannot close on an agent run alone) |

---

## 1. Run shape — why the order is what it is

The protocol lists cases by category; **execution order is driven by state prerequisites**, and
several negative cases are only reachable in a narrow window of the positive spine. The run is
therefore four persona blocks with the negatives interleaved at their only valid points, plus a
closing isolation sweep.

| Block | Persona | Cases, in order |
| --- | --- | --- |
| **C1 baseline** | `project-admin-a` → `reader-qc` → `project-admin-a` | S1.1, S1.2 (+ refresh), navigation sweep · sign out · **N5a, N5b, N5c** · sign out · **N6a pre-spine baseline** (switch to `TRACK01-B`, then back to `TRACK01-A`) |
| **C2a import** | `project-admin-a` | S2.1 · **N1a** (invalid 3-file set) · S3.1 · S3.2 · S3.3 + **N7a** |
| **C2b operations** | `qc-editor` | S4.1 · **N3** · S4.2–S4.5 · S5.1–S5.3 + **N7c** · S5.4 + **N7b** · S6.1, S6.2 · **N2** · S6.3–S6.6 · S7.1–S7.3 + **N7d** · **N4** · S7.4 + **N7e** · S8.1–S8.5 + **N7f(a)** · S8.6, S8.7 + **N7f(b)** |
| **C2c reports** | `project-admin-a` | S9.1, S9.2 · S9.3 + **N7g** |
| **C3 isolation sweep** | `project-admin-a` | **N6a–N6f** authoritative pass (A-side observation, switch to B, B-side observation, switch back) |

**N8** is not a case; it is a per-route property recorded as a `Placeholder/fake-success audit`
note on **every** row of C1–C3.

Ordering rationale, so the executing session does not "optimise" it away:

1. **N1a must precede S3.1.** The point is that the invalid state was refused *before* the valid
   apply. Once R0 is applied, the case is no longer clean.
2. **N3 must follow S4.1 immediately.** The duplicate control is only unreachable-by-design once
   `start_fab` is non-null.
3. **N2 must sit between S6.1 (To Site) and S6.3 (Erected).** Before To Site the refusal names a
   different predecessor; after Erected the case is gone forever on this spool — and there is no
   second spool to redo it on.
4. **N4 must sit between S7.3 and S7.4**, when `SP-DEMO-1001-A` is at `LAYDOWN-A` and `FAB-SHOP` is
   genuinely stale.
5. **N5a–N5c are read-only** and are placed early: a failure there is a security-class finding and
   is much cheaper to discover before 40 minutes of mutations.
6. **N6 is run twice on purpose.** In C1 it is a cheap pre-spine baseline (B is empty; A already has
   its rich referentials from `demo:prepare`). The **authoritative** N6a–N6f evidence is recorded in
   C3, after S9.3, because the assertion is *absence on B while A carries the full story* — before
   the spine runs, most of A's side of that assertion does not exist yet. Record C1's baseline as a
   note on the C3 rows, not as a separate case ID.
7. **Persona blocks are contiguous** to keep sign-outs to four. Do not re-order cases merely to
   avoid a sign-out.

---

## 2. Roles, project switching, and secret handling

- [ ] **Persona switch protocol.** Avatar menu → **Sign out** (top right), then the *operator*
  signs the next persona in. A browser agent never types a password, never asks for one, never
  guesses one; it stops and asks the operator by persona name. Passwords, `SUPABASE_SERVICE_ROLE_KEY`
  and `TRACK01_FIXTURE_PASSWORD` appear in no case record, no screenshot and no commit.
- [ ] **First action of every block is a verification, not a mutation:** read the top bar and
  confirm persona + `TRACK01-A · PipeQC Demo Project` before touching anything. Record the persona
  in the `Actor` column of every single row — an unlabelled row is not evidence.
- [ ] **Project switch is possible only for `project-admin-a`** (Project Admin on `TRACK01-A`,
  Project Reader on `TRACK01-B`). Use the top-bar dropdown. `qc-editor` has exactly one membership,
  so its top bar shows the project as **static text with no dropdown — that is correct, not a
  fault**, and must be recorded as such if the run is tempted to file it as a defect.
- [ ] **Never mutate while `TRACK01-B` is active.** All N6 sub-cases are read-only. After every
  B-side observation, switch back and re-confirm the `TRACK01-A` chip before the next case.
- [ ] **A blank "Select a project" screen** means the signed-in persona has no membership on the
  project you assume is active — check the top bar or the persona; it is not a case failure by
  itself (main runbook §14 rule 7).
- [ ] `reader-qc`'s sidebar is expected to be capability-filtered; N5c's route is expected to render
  **without** mutating controls in the DOM at all (not merely disabled). Verify the *absence* in the
  DOM, not just visually.

### Ambiguous mutation — the single decision tree

Applies to every mutating click in C2a/C2b/C2c. **Never click a second time "to be sure"**: most
commands are idempotency-keyed per click; a blind repeat is at best noise, at worst a second
business event with a different timestamp.

1. Click produced a clear toast **and** the expected durable state → PASS, continue.
2. Click produced a **business refusal** (blocked button, red gate line naming the missing
   prerequisite) → this is **not ambiguous**. For a negative case that is the expected result: record
   the literal refusal text as `Actual state`, PASS. For a positive case, satisfy the named
   prerequisite; do not work around it.
3. Click produced **no toast / unclear result** → do not click again. `Cmd+Shift+R`, then read the
   **durable** state (stage timeline, disposition badge, worklist row, history card, date field):
   - refreshed state shows the mutation landed → **PASS**, with `Refresh result` noting "verdict
     taken from refreshed state, no retry".
   - refreshed state proves nothing landed **and** no error or refusal was shown → this is exactly
     the N8 fake-success / dead-control failure class → **FAIL**, with screenshot and the first safe
     network/console error. Do not retry.
   - state cannot be determined from the refreshed screen → **BLOCKED**, with what was inspected.
     BLOCKED is not a synonym for FAIL.
4. Never repair state from outside the UI. If a branch is unrecoverable, the rehearsal is over:
   record it, then re-prepare (§6 stop conditions) — nothing carries over.
5. If a run is genuinely uncertain whether the *stand* drifted, `npm run demo:check` in the second
   terminal is safe and read-only; record its result verbatim in acceptance §5 if it was used.

---

## 3. Evidence collection into `docs/acceptance/track-12-demo-release.md`

- [ ] **Write after every case, not at the end of the run.** A 40-minute browser session that
  records evidence only at the end loses everything on a crash, a context break or an operator
  interruption — and re-running the spine to "recover" the evidence is impossible without a full
  re-prepare.
- [ ] **Fill all nine columns** of §1 (positive spine) and §2 (negative matrix) for every row:
  Case ID · URL · Actor · Active project · Expected state · Actual state · Refresh result · First
  safe console/network error · Screenshot path · Status.
  - `Expected state` is **copied** from the cited `track-12-demo.md` section or the protocol's
    source-cited expectation — never invented, never reworded into something weaker.
  - `Refresh result` is `not applicable` for read-only cases, and the actual post-`Cmd+Shift+R`
    state for every case carrying a durable-state claim.
  - `First safe console/network error` and `Screenshot path` are filled **only** on FAIL/BLOCKED;
    method, path, status and a safe message only — never an `Authorization` header value.
  - Append the **N8 `Placeholder/fake-success audit`** verdict to each row's `Actual state`.
- [ ] **Business codes only.** Record `SP-DEMO-1001-A`, `WJ-DEMO-1001-02`, `TP-DEMO-001`, `X-000001`,
  `FLG-DEMO-1001-01` and the like. Do not paste row UUIDs; where a worklist label itself prints a raw
  UUID (a known limitation), note that the label carries a UUID rather than transcribing it.
- [ ] **Record elapsed time per story section** during C2 (against the 2/3/5/7/5/4/4/7/3-minute
  budget in main runbook §2), so §17 item 14 ("does it fit 30–40 minutes") can be answered with a
  number rather than an impression. The agent run's timing is *indicative*; the binding number is
  C6's product-owner rehearsal.
- [ ] **Resolve the "expected → observed" checklists explicitly.** Phase C exists to close them:
  - `docs/runbooks/track-12-demo.md` §17 items 1–16 — every item gets a recorded verdict. Items 5
    (the exact `Applied N definition rows.` number) and 6 (verbatim toast strings) require
    transcribing what the UI actually said.
  - `docs/runbooks/track-12-setup-walkthrough.md` §11 items 1–16 — only if Mode B runs (§5). If Mode
    B is skipped, they stay open and are recorded as such in acceptance §4.
- [ ] **Update the Phase C table** (C1–C7) status cells as each block completes; `NOT RUN` must not
  survive the end of the run except where a step was deliberately skipped and labelled.
- [ ] **Two pre-identified cosmetic findings go to §4 Known limitations, not §2 as FAILs:** the
  stale home-page badges (*Spool Tracking* → `Track 08`, *Reports & Forms* → `Track 11`) and the raw
  UUIDs in the line-check / item-clearance / testing-precomm worklists. Confirm both were actually
  observed; if either is *not* present, say so — the documents predicted them from source.
- [ ] **Document corrections are allowed but bounded.** `track-12-demo.md` and
  `track-12-agent-walkthrough.md` may be edited **only** for a label/value/behaviour difference the
  browser actually showed. Every such edit is listed in the acceptance record with the case ID that
  proved it. A production-file change requires a reproduced blocker and a RED test first (§6).
- [ ] **Do not mark a skipped case PASS.** Do not pre-fill. Do not "carry over" a result from an
  earlier aborted attempt.
- [ ] **Closing hygiene:** `git status --short` must show no downloaded artifact and no screenshot
  inside the checkout; `git diff --check` clean.

---

## 4. The three checking layers, restated as execution rules

### 4.1 Negative matrix (protocol §4)

- [ ] **N1a** `/spooling/import` as `project-admin-a`: attach `trace.txt`, `bolt.txt`, `supp.txt`
  only. Expect the client-side guard to refuse *before any network call* with
  **"weld.txt is required before a SpoolGen import can be validated."**, no import job, no
  *Revision decisions* card. Confirm on the Network tab that no request was issued — that is half
  the assertion. Do not click **Validate files** twice; attach `weld.txt` and go straight to S3.1.
- [ ] **N2** `/erection/welded-bolted` as `qc-editor`, after S6.1 and before S6.3: expect a named
  refusal ("Record Erected before Welded / Bolted" pattern), not a silent failure. Then record
  Erected and continue the spine in order — N2 is *before* S6.4, never instead of it.
- [ ] **N3** `/fabrication/material-check` after S4.1: **Record Start Fab** must be *disabled* (the
  duplicate is unreachable, not merely rejected), and must still be disabled after a hard refresh
  with the Start Fab date unchanged.
- [ ] **N4** `/tracking/data-analysis` after S7.3: attempt Direction `Out` / Location `FAB-SHOP`.
  Expect refusal; then hard refresh, confirm current location is still `LAYDOWN-A` and the history
  card still shows exactly three events. Never re-attempt the stale event.
- [ ] **N5a / N5b** as `reader-qc`: direct address-bar navigation to `/admin/access-rights` and
  `/fabrication/qc-release`. Expect `ForbiddenScreen` — card **"Access denied"**, body
  **"You do not have access to … in project TRACK01-A."** — rendered *before* the editor mounts.
  Record the section name shown for each.
- [ ] **N5c** `/admin/progress-weights` as `reader-qc`: page renders, amber notice **"Project manager
  rights required to update progress weights. Read-only mode active."**, and **Add Activity**,
  **Save Weights** and the per-row inputs are **absent from the DOM**. Verify by DOM inspection, and
  say so in `Actual state`.
- [ ] **N6a–N6f** as `project-admin-a` with the top-bar switch, after S9.3. Each row records **both**
  an A-side and a B-side observation; the assertion is the *absence* on B. Cover all six surfaces:
  referentials, imports/browse, Test Pack worklists, tracking history, Test Packs, reports (including
  that a B-side report filename carries `TRACK01-B`'s own code and no `TRACK01-A` rows).
- [ ] **N8** on every visited route: no unmarked demo-store number, no success toast without a
  matching durable change on refresh, no button that issues no request, no implication of a server
  action outside the documented UI-triggered command. Anything beyond the two known cosmetic items
  is a genuine FAIL with full evidence.

### 4.2 Refresh checks (protocol §7 / N7)

Each is `Cmd+Shift+R` on the named route **immediately after** its spine case, re-reading durable
state — not a batch of refreshes at the end of the run.

- [ ] **N7a** after S3.3 → `/spooling/browse`: accepted R0 with its spools, welds, support, flange
  joints, ident codes, unchanged.
- [ ] **N7b** after S5.4 → `/fabrication/qc-release` and `/fabrication/dashboard`: QC Release date and
  disabled button persist; dashboard stage survives reload.
- [ ] **N7c** after S5.3 → `/nde`: reselect the RT/PT batches for `SP-DEMO-1001-A`; the `satisfied`
  disposition on the accepted repair and the `superseded` disposition on the original rejected
  obligation both persist. This checkpoint is an **addition** by the protocol, not a main-runbook
  correction — record it that way.
- [ ] **N7d** after S7.3 → `/tracking/data-analysis`: `LAYDOWN-A` plus all three history rows.
- [ ] **N7e** after S7.4 → `/erection/flange-progress`: `completed`, UT `30`, and the append-only
  history row.
- [ ] **N7f** after S8.5 → `/testpack` shows `RFT · 12`; after S8.7 →
  `/testpack/pressure-test/testing-precomm` shows `Complete`. Two separate observations, one row.
- [ ] **N7g** after S9.1–S9.2: the Reports page keeps **no** generated flag — Demo Lite "creates
  browser downloads only". The real persistence check is **S9.3**: hard-refresh `/spooling/browse`,
  `/fabrication/qc-release`, `/erection/rft`, `/testpack` and confirm the underlying data is
  unchanged. Do not invent a report-history assertion.

### 4.3 Artifact-open checks (protocol §5, acceptance §3)

- [ ] Trigger both downloads from `/reports` on `TRACK01-A` (S9.1, S9.2).
- [ ] Record the **exact saved filenames** — expected `TRACK01-A-fabrication-progress-<YYYY-MM-DD>.xlsx`
  and `TRACK01-A-test-pack-rft-pursuit-<YYYY-MM-DD>.pdf` — and the byte sizes (must be non-zero).
- [ ] Open the XLSX in a spreadsheet viewer and the PDF in a PDF viewer, **outside the browser
  download bar**. Both must open with **no repair/corruption warning**.
- [ ] XLSX: `TRACK01-A` visible, and the five `WJ-DEMO-*` weld-joint rows visible.
- [ ] PDF: the `TP-DEMO-001` row visible with its RFT state and outstanding-blocker counts.
- [ ] Save both **outside the repository working tree**; reference the external path in acceptance §3
  only. Confirm with `git status --short` that neither entered the tree. Clear the download directory
  afterwards.
- [ ] Opening files is an **operator action**; if the product owner opens them, label the evidence as
  product-owner evidence in acceptance §3.

---

## 5. Optional Mode B — and its mandatory cleanup

Mode B is `docs/runbooks/track-12-setup-walkthrough.md` (create `TRACK-SETUP-CHECK` through the UI,
set three access roles, build one dependency chain, prove Reader denial and isolation). It is
**optional** — but if it runs, its cleanup is **not**.

- [ ] **Sequencing rule: Mode B runs only after C1–C4 are fully recorded.** It re-prepares the
  database, which destroys the entire positive-spine state. Running it earlier means re-running the
  whole spine.
- [ ] **Mode B is executed on the same stand as the spine** (per Task 12 Step 5, `demo:prepare` is
  re-run *before* it — see the ordering choice below), through UI controls only.

  Two admissible sequences; pick one and record which:

  1. **Plan-literal:** re-run `demo:prepare -- --confirm-local-reset` → run Mode B on the fresh stand
     → re-run `demo:prepare -- --confirm-local-reset` → C6 golden rehearsal. Two re-preparations.
  2. **Reuse:** run Mode B directly on the post-spine stand (it only *adds* a third project; it never
     writes to `TRACK01-A`/`TRACK01-B`) → re-run `demo:prepare -- --confirm-local-reset` → C6. One
     re-preparation, but the Mode B observations are made on a stand carrying spine data, which must
     be stated in the evidence.

  Sequence 1 is the recommended default: it matches the plan and keeps Mode B's own isolation
  assertions clean.

- [ ] **Capture the pre-cleanup `demo:check` verbatim.** Before re-preparing, run `npm run demo:check`
  on the **three-project** stand and paste the exact check names and output into acceptance §4/§5.
  This is the only evidence that settles setup-walkthrough §11 item 14 and §12 blocker 3 — whether
  `demo:check` tolerates a third project or reports it. Either outcome is a valid finding.
- [ ] **Do not claim Mode B breaks `TRACK01-A`/`TRACK01-B` isolation** on the strength of a
  non-green `demo:check`. Acceptance §4 already warns about this: a non-green check on a
  deliberately-changed stand is expected, not a defect. The isolation claim requires the §11 item 15
  observation: `TRACK01-B` still reports zero reference rows and still carries its original title
  `PipeQC Isolation Control`, and `TRACK01-A` is unchanged.
- [ ] **Cleanup — the only supported one** (there is no project-delete flow, and none may be
  invented):

  ```bash
  npm run demo:prepare -- --confirm-local-reset
  npm run dev
  ```

- [ ] **Post-cleanup verification, recorded:** `npm run demo:check` twice → identical and green;
  three projects are back down to two; `TRACK-SETUP-CHECK` is gone. Only then is the stand a valid
  base for C6.
- [ ] **After cleanup, the spine evidence is not re-verifiable — and must not be re-run "to be
  sure".** The C1–C4 records made before Mode B are authoritative. Nothing carries over across a
  re-preparation, and a partial re-run would produce a second, differently-timestamped story.
- [ ] **If Mode B is skipped** (allowed — it is `NOT RUN / SKIPPED` in the acceptance template):
  mark C5 `SKIPPED` explicitly, and record in acceptance §4 that setup-walkthrough §11 items 1–16
  and §12 blockers 1–4 remain unresolved. Do not let a skip silently disappear.

---

## 6. Stop conditions

### 6.1 Entry (restated, because it is the one that matters most)

- **Phase B `FAIL` or `BLOCKED` → Phase C does not start.** Not partially, not "just the baseline
  cases". Fix, rerun Phase A on a clean reset, rerun Phase B on a fresh stand, then re-decide entry.
- **Phase B `NOT RUN` → Phase C does not start.** This is the current state.
- **Stand touched outside the UI after Phase B → Phase C does not start** until B2–B6 are re-done.

### 6.2 Mid-run hard stops (abort the run, record, apply the gate-failure policy)

- **S1.2 readiness badge amber.** The stand is not the prepared start state. Stop, run
  `npm run demo:check`, read which check failed. Never hand-fix referentials.
- **S3.1 does not report `Validated 20 rows: 0 errors, 0 warnings.`** Every downstream object in the
  story comes from this import; a different shape invalidates sections 4–9. Stop.
- **S3.2 apply fails or produces a different accepted revision.** Same reason. Stop.
- **Any N5 denial FAILs** (a Reader reaches a mutating route or a mutating control). This is a
  security-class finding: stop immediately, do not continue mutating the stand, escalate with full
  evidence.
- **A genuine N8 finding** — a success toast with no durable change after refresh, or a control that
  issues no request. Stop that branch and record it as a blocker (it is a misleading product claim,
  which the plan treats as gate-failing).
- **Any spine FAIL that removes a prerequisite for later cases** (e.g. QC release never becomes
  possible, the Test Pack never reaches RFT). Do not skip ahead to "collect" the remaining cases on
  broken state — later PASSes on an invalid predecessor are not evidence.
- **State becomes unrecoverable through the UI.** The rehearsal is over. Record, then re-prepare and
  restart Phase C from S1.1.

### 6.3 Continue-and-record (not stops)

- The two known cosmetic items (stale home-page badges, UUID labels in three worklists) → acceptance
  §4, run continues.
- A wording/label difference between the runbook and the UI → correct the runbook, cite the case ID,
  run continues.
- A `BLOCKED` case whose prerequisite is missing for a benign reason → record BLOCKED with what was
  inspected, continue with cases that do not depend on it.
- `qc-editor` showing the project as static text with no dropdown → expected, record and continue.
- A `demo:prepare` failure at the `users` stage right after a reset → known container race, re-run
  the same command (main runbook §14 rule 6).

### 6.4 After any fix

The policy is fixed and non-negotiable: record the exact case and durable evidence → add a focused
failing unit/pgTAP test → make the smallest migration/type/UI/runbook correction → rerun the focused
test → **rerun Phase A on a clean reset, Phase B on a new prepared stand, and the affected Phase C
path**. Because a reset destroys the stand, "the affected Phase C path" in practice means the whole
run from S1.1. Budget for that before starting a fix mid-run. Non-blocking findings go to known
limitations or deferred work; Track 12 does not widen into a refactor.

---

## 7. Definition of done for Phase C

- [ ] Acceptance §0 environment metadata complete (including browser + version).
- [ ] Acceptance Phase C table C1–C7: no row left `NOT RUN` except a deliberately labelled
  `SKIPPED` (only C5 may be skipped).
- [ ] Acceptance §1: all 35 spine rows carry a verdict with all nine columns filled.
- [ ] Acceptance §2: all 21 negative rows carry a verdict; N6 rows carry both an A-side and a B-side
  observation; N8 recorded per-route across the run.
- [ ] Acceptance §3: both artifacts — filename, non-zero size, clean open, visible `TRACK01-A`
  content, external path, and confirmation neither entered the git tree.
- [ ] Acceptance §4: known limitations finalised from observation, including the Mode B outcome or
  an explicit statement that Mode B was skipped and what stays unresolved.
- [ ] Acceptance §5: one evidence block per non-PASS row, secret-free.
- [ ] Main runbook §17 items 1–16 each answered from observation; setup walkthrough §11 items
  answered or explicitly left open.
- [ ] Acceptance §6 signed by the product owner, with the real rehearsal elapsed time.
- [ ] `git status --short` and `git diff --check` clean of artifacts and screenshots.
- [ ] §7 *Final decision* is **not** touched here — that is Task 13, decided from this evidence.

---

## 8. Related documents

- Track plan (Task 12 is the source of this plan):
  [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](2026-08-10-track-12-demo-release.md)
- Browser protocol (case definitions):
  [`docs/qa/track-12-agent-walkthrough.md`](../../qa/track-12-agent-walkthrough.md)
- Presenter runbook (positive spine source of truth):
  [`docs/runbooks/track-12-demo.md`](../../runbooks/track-12-demo.md)
- Optional setup smoke: [`docs/runbooks/track-12-setup-walkthrough.md`](../../runbooks/track-12-setup-walkthrough.md)
- Entry point and mode selection: [`docs/qa/local-supabase-browser-runbook.md`](../../qa/local-supabase-browser-runbook.md)
- Evidence target: [`docs/acceptance/track-12-demo-release.md`](../../acceptance/track-12-demo-release.md)
