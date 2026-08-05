# Track 06 NDE Browser Walkthrough — Agent Execution Script

A self-contained execution script for a browser agent (Playwright MCP) that walks the NDE
quality aggregate: batches, spot allocation, results, the mandatory repair cycle, tracers,
the NDE100 escalation, and the effect all of it has on fabrication readiness.

- `docs/qa/local-supabase-browser-runbook.md` is the **policy** document: scope, safety, personas.
- `docs/qa/tracks-01-05-agent-walkthrough.md` is the script for everything before this one.
- **This file is the Track 06 script.** Every value in it was recorded from a real run on
  2026-08-04, not derived from the source. Where a document disagrees with this file, run it
  and see.

Label convention:

- **Bold** — the literal accessible name, verified against a live snapshot. Match it exactly.
- _Italic_ — described by function only. Locate the control by role and nearby text, and
  record in the report what you actually clicked.

---

## 1. Agent contract

Paste this verbatim to the executing agent as its task framing.

```text
You are executing docs/qa/track-06-agent-walkthrough.md against a local development stand.

Use Playwright MCP only, and only http://localhost:3000. Do not use http://127.0.0.1:3000 —
Next.js blocks it as a cross-origin dev resource and the page never leaves "Loading PipeQC…".

You may: navigate, snapshot, click, type, select, read console messages, read network
requests, take screenshots, and read the DOM with browser_evaluate.

You may NOT: read .env, .env.local, shell history or any secret; print, copy, upload or
persist credentials; run SQL, open Supabase Studio, use a service key, run supabase db reset,
run git, or edit any source file; use browser_evaluate (or browser_run_code_unsafe) to mutate
application state, call Supabase directly, or bypass a disabled control. Every mutation must
go through a real user gesture on a real control.

Permitted side effects are exactly the UI actions listed in this script, inside fixture
project TRACK01-A on a local stand. Stop before any action that is not listed.

For every case return: case ID, PASS / FAIL / BLOCKED, URL, active persona, expected result,
actual result. On FAIL add one screenshot, the first console error, and the first failing
request as method + path + HTTP status (never the Authorization header).

Do not retry a mutation that already succeeded or whose outcome is unclear — report BLOCKED
and move on. Execute the cases in the order given: this script builds one continuous state
and a later case cannot be reached without the earlier ones.
```

---

## 2. Hard rules

1. **`http://localhost:3000` only.** `127.0.0.1` hangs on the loading screen.
2. **No SQL, no Studio, no service key, no `db reset`.** Every assertion in this script is
   observable in the browser.
3. **No secret ever leaves the browser.** The fixture password is supplied by the operator out
   of band; never type it into a report, a screenshot caption, or a log line.
4. **No `browser_evaluate` mutations.** Reading `disabled`, text content or computed state is
   fine. Clicking a disabled button through JS invalidates the whole run.
5. **A mutation is recorded once.** An NDE result cannot be un-recorded through this UI. If a
   click's outcome is ambiguous, hard-refresh and read the state rather than clicking again.
6. **Order is not optional.** The escalation in T06-07 depends on four rejections recorded in
   one batch by T06-04 through T06-06. Skipping one makes every later case meaningless.
7. **Stop and report** after two consecutive failures of the same tool call, an unexpected
   authentication prompt, an unhandled dialog, or any state not described here.

---

## 3. Stand preparation (operator, not agent)

The agent does not run these. It verifies the outcome from the browser.

```zsh
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
/opt/homebrew/bin/supabase db reset          # only on a disposable local stand
/opt/homebrew/bin/supabase start
set -a; source .env.local; set +a
export NEXT_PUBLIC_PIPEQC_MODE=supabase
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
read -r -s "SUPABASE_SERVICE_ROLE_KEY?Local Supabase API Secret: "; echo
read -r -s "TRACK01_FIXTURE_PASSWORD?Fixture password (12+ chars): "; echo
export SUPABASE_SERVICE_ROLE_KEY TRACK01_FIXTURE_PASSWORD

npm run bootstrap:track01-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures &&
npm run bootstrap:track04-browser-fixtures &&
npm run bootstrap:track05-browser-fixtures &&
npm run bootstrap:track06-browser-fixtures &&
npm run dev
```

**`db reset` restarts the containers, and the Track 01 bootstrap fails with a
`findOrCreateUser` stack trace if it runs before GoTrue is listening.** It is a race, not a
defect. Re-run the chain; it succeeds the second time.

Two constraints carried over from Track 05:

- **Fixtures and pgTAP do not coexist.** Reset before `supabase test db`; re-bootstrap after.
- **A bootstrap does not undo NDE results.** Replaying this script needs a reset. If `/nde`
  shows any batch at T06-00, you are not on a clean stand — report BLOCKED rather than
  working around it.

---

## 4. Fixture reference

### 4.1 Accounts — all share `TRACK01_FIXTURE_PASSWORD`

| Persona | Email | Track 06 relevance |
| --- | --- | --- |
| Project Admin A | `track01.project-admin-a@example.test` | **the default actor** — holds `nde.view`, `nde.batch.manage`, `nde.result.record` |
| Reader QC | `track01.reader-qc@example.test` | Project Reader + QC Engineer — holds `nde.view` **only**; used in T06-10 |
| QC Editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer; used for the durability check in T06-11 |

**Why Reader QC holds only `nde.view`, despite the `qc_engineer` functional role granting
`nde.batch.manage`:** `current_user_has_capability` requires the **access** role to grant the
capability, and the functional role only lifts the gate on top of it. `project_reader` grants
`nde.view` and nothing more. A functional role can never add a capability the access role
lacks. Do not report this as a defect.

### 4.2 The Track 06 population — from the Track 06 bootstrap

| Object | Value |
| --- | --- |
| Isometric | `ISO-T6-001` revision `R0`, PDS `PDS-T4`, service class `SC-T4` |
| Spool A | `SP-T6-001-A` — `W-T6-001` … `W-T6-006` |
| Spool B | `SP-T6-001-B` — `W-T6-007` … `W-T6-012` |
| Joints | all `BW-T4`, `shop`, 6″, 6.0 mm, welded by `W-T6-1` (root) + `W-T6-2` (cap) |
| Obligations | 12 × RT, 10 %, regime `Spot`, disposition `pending`, manual status `S` |
| PWHT | **none** — 6.0 mm is below the 8 mm threshold. An empty PWHT table on the QC release screen is correct. |

`SP-T4-001-A` and `SP-T4-001-B` from Track 05 are also present and must stay untouched.

### 4.3 The manual's joint status labels — derived, never stored

`nde_joint_status_label` spells `disposition` + `cycle_kind` the way Easy Piping manual §19.6
does. The **Status (manual)** column shows it. It cannot disagree with **Disposition**,
because it is computed from it.

| Label | Means |
| --- | --- |
| `S` | spot candidate, not yet selected into a batch |
| `SS` | spot candidate selected into an issued batch |
| `NR` | satisfied, released with the batch |
| `H` | mandatory 100 %, not yet selected |
| `HS` | mandatory 100 %, selected |
| `R1` / `R2` | repair cycle 1 / 2 |
| `T1` / `T2` | tracer candidate, first / second level |
| `T1S` / `T2S` | that tracer, selected into an issued batch |

---

## 5. Playwright MCP technique notes

Read this once before starting.

| Situation | Technique |
| --- | --- |
| Reading state | `browser_snapshot` is the primary evidence. Screenshot only on FAIL. |
| The obligations table | Columns are **Spool**, **Joint**, **Method**, **Status (manual)**, **Cycle**, **Coverage**, **Disposition**, **Action**. Address a row by its **Joint** cell: `tr:has-text("W-T6-003") button:has-text("Record Result")`. Never by row index — the table is sorted by spool then joint then cycle, and a repair appears next to its original. |
| Two tables on `/nde` | `table >> nth=0` is Batches, `table >> nth=1` is Obligations. A bare `table` selector is a strict-mode violation. |
| Dropdowns | Native `<select>`. Use `browser_select_option`. Inside a dialog they are positional: `[role=dialog] select >> nth=0` is Outcome, `nth=1` is Defect code (only present when Outcome is Rejected), `nth=2` is Responsible welder. |
| The result dialog title | Names the joint and its status: `Record NDE Result — W-T6-002 (SS)`. Use it to confirm you opened the row you meant. |
| **Record Result** button | Appears **only** while a row's disposition is `issued`. A `pending` row has no button, and that is correct — a result belongs to an issued batch. |
| Toasts | `sonner`, auto-dismissing. Snapshot `[data-sonner-toaster]` immediately after a click. |
| Escalation banner | `[role=status]`, above the Batches card. Absent until the fourth rejection. |
| Batch numbers | Generated as `NB-<YYYYMMDD>-000N`, N counting every batch in the project. On a clean stand the first is `NB-<today>-0001`. Record the real value; do not assume the date. |
| A `400`/`403`/`500` anywhere | Record it even if the case still passes visually. |

---

## 6. Execution order

```text
T06-00  baseline
 └─ T06-01  spot batch and 50 % allocation
     └─ T06-02  issue the batch
         └─ T06-03  accept one, reject one — the cascade appears
             └─ T06-04..06  rejections two, three and four
                 └─ T06-07  the escalation
                     └─ T06-08  the 100 % batch
                         └─ T06-09  the repair closes its parent out
                             └─ T06-10  negatives
                                 └─ T06-11  fabrication regression and durability
```

---

## 7. T06-00 — Baseline

**Actor:** Project Admin A, project `TRACK01-A`.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/nde`. | **No DEMO MODE badge.** Heading **NDE Batch Management**. |
| 2 | Read the Batches card. | `Batches (0)` and the row `No NDE batches created yet.` Any batch present means the stand is dirty → **BLOCKED**. |
| 3 | Read the Obligations card. | `NDE Obligations (12)`. |
| 4 | Read all twelve rows. | `SP-T6-001-A` carries `W-T6-001` … `W-T6-006`, `SP-T6-001-B` carries `W-T6-007` … `W-T6-012`. Every row: method `rt`, status `S`, cycle `Original`, coverage `10%`, disposition `pending`, **no** Record Result button. |
| 5 | Open `/nde/dashboard`. | Total Batches `0`, Open Batches `0`, Pending Obligations `12`, Satisfied Obligations `0`. These are projections of the twelve real obligations, not demo figures. |

**PASS:** no uncaught console error, twelve real obligations, no demo numbers.

---

## 8. T06-01 — Spot batch and a 50 % allocation

**URL** `/nde`.

1. Click **Create Batch**. A dialog **New NDE Batch** opens with **NDT Method** and
   **Coverage regime**.
2. Assert the dialog opens with **RT (Radiographic Testing)** and **Mandatory 100 %**
   selected — it resets on every open, so a regime chosen in a previous attempt never leaks
   into the next batch.
3. Set **Coverage regime** to **Spot rate (10 % / 20 %)**. Leave the method at RT.
4. Click **Create**. Toast `NDE Batch created successfully`.
5. Expected: one batch row, number `NB-<today>-0001`, method `rt`, regime `Spot`, status
   `draft`, Issued On `—`, and three controls: a **Coverage percentage** number input
   (defaulting to `100`), **Allocate Candidates**, **Issue Batch**.
6. Set **Coverage percentage** to `50`. Click **Allocate Candidates**. Toast
   `Candidates allocated to batch at 50% coverage`.
7. **The assertion this case exists for:** the obligations table is unchanged — allocation
   selects, it does not issue. Every row still reads `S` / `pending`.

Exactly six of the twelve are now in the batch, chosen as `ceil(12 × 50 / 100)` in
`(weld date, weld number)` order. All twelve share a weld date, so the six are
`W-T6-001` … `W-T6-006`. That becomes visible in T06-02, which is where it is asserted.

---

## 9. T06-02 — Issue the batch

1. Click **Issue Batch**. Toast `NDE Batch issued`.
2. Expected on the batch row: status `issued`, Issued On today, and the actions replaced by a
   single **Close Batch**.
3. Expected in the obligations table — **this is the allocation assertion**:

| Joints | Status (manual) | Disposition | Record Result button |
| --- | --- | --- | --- |
| `W-T6-001` … `W-T6-006` | `SS` | `issued` | present |
| `W-T6-007` … `W-T6-012` | `S` | `pending` | absent |

Any other split means `target_percentage` was not honoured. Six `SS` and six `S`, in weld
number order, is the pass.

---

## 10. T06-03 — One acceptance, one rejection, and the cascade

### T06-03a — Accept `W-T6-001`

1. Click **Record Result** on the `W-T6-001` row. The dialog title must read
   `Record NDE Result — W-T6-001 (SS)`.
2. Assert the dialog: **Outcome** defaults to **Accepted**, **Examined On** is today,
   **Report Number** is **empty**, and **Responsible welder** offers exactly three options —
   *The report does not name a welder*, `W-T6-1 — Track 06 root welder`,
   `W-T6-2 — Track 06 cap welder`. **No other welder may be offered**; `W-T5-1` and `W-T5-2`
   appearing here is a FAIL. There is no **Defect code** field while the outcome is Accepted.
3. Type `RPT-T6-001` into **Report Number**. Click **Save Result**. Toast
   `Result recorded: accepted`.
4. Expected: `W-T6-001` becomes `NR` / `satisfied`, and its Record Result button disappears.

### T06-03b — Reject `W-T6-002`

1. Click **Record Result** on `W-T6-002`. Title `Record NDE Result — W-T6-002 (SS)`.
2. Assert **Report Number is empty** — it must not carry `RPT-T6-001` over from T06-03a.
3. Set **Outcome** to **Rejected**. A **Defect code** dropdown appears, listing
   `CRK — Crack`, `LOF — Lack of fusion`, `POR — Porosity`, `SLG — Slag inclusion`, with the
   note *A rejected result must carry a defect code.*
4. **`[P0]` Assert **Save Result** is disabled** while the defect code is unchosen, and take a
   `browser_network_requests` snapshot to prove **no request is sent**. This is the client-side
   half of `PQC42`.
5. Choose defect code **POR — Porosity** and responsible welder
   **W-T6-1 — Track 06 root welder**. Click **Save Result**. Toast `Result recorded: rejected`.

### T06-03c — Read the cascade

Expected: `NDE Obligations (12)` becomes **`(15)`**, and three rows are new.

| Joint | Cycle | Coverage | Status | Disposition | Why |
| --- | --- | --- | --- | --- | --- |
| `W-T6-002` | Original | `10%` | `SS` | `rejected` | the result just recorded |
| `W-T6-002` | `repair (R1)` | **`100%`** | `R1` | `pending` | a rejected original forces a repair, examined in full |
| `W-T6-001` | `tracer (T1)` | `10%` | `T1` | `pending` | first-level tracer |
| `W-T6-003` | `tracer (T1)` | `10%` | `T1` | `pending` | second first-level tracer |

**Two tracers, on two other joints of the same welder.** The repair is at 100 % coverage
while the tracers stay at the original spot rate. Neither tracer has a Record Result button
yet: they are `pending` and belong to no batch.

---

## 11. T06-04 to T06-06 — Rejections two, three and four

Repeat the T06-03b procedure exactly, always naming **W-T6-1** as the responsible welder —
the escalation counts per welder, and naming a different one restarts the count.

| Case | Rejection # | Joint | Defect code | After it, obligations total |
| --- | --- | --- | --- | --- |
| T06-04 | second | `W-T6-003` | `LOF — Lack of fusion` | 18 |
| T06-05 | third | `W-T6-004` | `CRK — Crack` | 21 |
| T06-06 | fourth | `W-T6-005` | `SLG — Slag inclusion` | 24 |

Each rejection adds exactly three rows — one repair and two tracers — so the count runs
12 → 15 → 18 → 21 → 24. This population is large enough that every rejection finds its two
eligible tracer joints; a smaller one would yield fewer, which is documented behaviour rather
than a defect.

**`[P0]` The assertion that matters here:** after **T06-05 — the third rejection — there is
still no escalation banner.** `[role=status]` must be absent. The manual escalates on the
fourth, and an escalation on the third would be the rule misread. Record this explicitly.

---

## 12. T06-07 — The escalation

Recorded from a real run; the sentence must match apart from the batch number and date.

1. After T06-06 (the **fourth** rejection), hard-refresh `/nde`.
2. Expected: a `[role=status]` banner above the Batches card reading:

   > **Penalty shoot: 100 % control in force**
   > Batch `NB-<today>-0001` escalated on `<today>` because it reached four rejected joints.
   > Every remaining joint of that welder is now examined at 100 %.

3. **`[P0]` Expected in the obligations table — the escalation must actually escalate:**

| Joints | Coverage before | Coverage after | Status after |
| --- | --- | --- | --- |
| `W-T6-007` … `W-T6-012` | `10%` | **`100%`** | `H` |
| `W-T6-006` | `10%` | **`100%`** | `HS` (it is in the issued batch) |
| every `tracer (T1)` | `10%` | **`100%`** | `T1` |

The four rejected originals keep their `10%`: they are historical records of an examination
that already happened. Everything the welder still owes a result on is now at 100 %.

A banner with no coverage change is the defect this case exists to catch — an earlier
version of Track 06 wrote the penalty population and then read it with nothing.

---

## 13. T06-08 — The 100 % batch

The repairs and tracers are `pending`, so none can be given a result yet. They need a batch,
and their regime is now `mandatory_100`, which a `Spot` batch will not accept.

1. Click **Create Batch**. Leave both fields at their defaults — **RT** and
   **Mandatory 100 %**. Click **Create**.
2. Expected: a second row `NB-<today>-0002`, regime `100 %`, status `draft`. The first batch
   still shows `issued` with its **Close Batch** button.
3. Leave **Coverage percentage** at `100`. Click **Allocate Candidates**, then **Issue Batch**.
4. Expected: every `R1` and every `T1` row moves to `issued` and gains a **Record Result**
   button. Each tracer's manual status changes from `T1` to **`T1S`** — the manual's suffix
   for a selected tracer. The `H` rows become `HS`.

---

## 14. T06-09 — An accepted repair closes its parent out

**`[P0]` This is the regression case for the defect the 2026-08-04 Gate D5 run found: before
the fix, any spool that ever saw one rejection could never be released again.**

1. Click **Record Result** on the `W-T6-002` **`repair (R1)`** row — not the original. The
   dialog title must read `Record NDE Result — W-T6-002 (R1)`.
2. Leave **Outcome** at **Accepted**. Click **Save Result**.
3. Expected, on the two `W-T6-002` rows:

| Cycle | Disposition | Status |
| --- | --- | --- |
| `repair (R1)` | `satisfied` | `R1` |
| Original | **`superseded`** | `SS` |

A rejected original that stays `rejected` after its repair is accepted is a **FAIL**:
`spool_fabrication_readiness` counts everything that is not `satisfied`, `waived` or
`superseded`, so the joint would hold its spool forever.

---

## 15. T06-10 — Negatives

| Case | Step | Expected |
| --- | --- | --- |
| **`[P0]`** T06-10a | As **Reader QC**, open `/nde`. | The route **is** reachable — Reader QC holds `nde.view`. The obligations table renders. This is not a defect; see §4.1. |
| **`[P0]`** T06-10b | Still as Reader QC, click **Create Batch**, then **Create**. | Refused with the sentence *"You do not have permission to record this NDE work."* The Batches count does **not** change. A raw SQL string or an error code shown bare is a FAIL. Record the HTTP status — it is `403` on `POST /rest/v1/rpc/create_nde_batch`. |
| T06-10c | Still as Reader QC, look for a **Record Result** button on any `issued` row. | It renders, and clicking through to **Save Result** is refused the same way. Reader QC lacks `nde.result.record`. |
| T06-10d | Back as Project Admin A, click **Record Result** on an already-`satisfied` row. | There is no button on a satisfied row. If one is present, report it. |
| T06-10e | Create a third batch and click **Issue Batch** without allocating anything. | Refused — an empty batch cannot be issued (`PQC41`). The batch stays `draft`. |

**Note on T06-10b.** The **Create Batch** button is offered to a user whose command will
always be refused. Record it as an observation. It is a UI affordance question, not a
security hole — the refusal is enforced server-side, which is where it counts.

---

## 16. T06-11 — Fabrication regression and durability

**`[P0]` Track 06 replaced the interim NDE seam Track 05 depended on. This case proves it did
not break the screen Track 05 proved.**

### T06-11a — The read model on `/fabrication/qc-release`

1. Open `/fabrication/qc-release`, select `SP-T6-001-A`.
2. Expected in the **NDE obligations** card: columns **Joint**, **Method**, **Cycle**,
   **Coverage**, **Selection**, **Status**, and a **Manage in NDE** link per row. The full
   lineage is visible — `Original`, `repair (R1)`, `tracer (T1)` — and the closing sentence
   reads *NDE obligations are managed through NDE inspection batches.*
3. **There must be no "Mark accepted" button.** The interim `record_nde_obligation_outcome`
   RPC was retired in Track 06; a button that calls it would 404.
4. Expected: **QC release spool** is disabled, with a sentence naming the outstanding counts —
   on a walked stand, *"Material check is incomplete: 0 of 1 bill lines traced. N NDE
   obligations are still outstanding."* The NDE count must have **risen** from the twelve of
   T06-00, because the cascade added repairs and tracers.
5. Expected: the **PWHT** table is empty. Track 06 joints are 6.0 mm, below the 8 mm
   threshold. Not a defect.

### T06-11b — Track 05's golden path is untouched

1. Select `SP-T4-001-A`. Expected: stage `not started`, and its own NDE obligations —
   **two**, both `Original`, `10%`, `pending`. Nothing from the Track 06 escalation reached it.
2. This is the whole reason Track 06 has its own welders. If `SP-T4-001-A`'s obligations show
   `100%` coverage, the escalation crossed populations and that is a **FAIL**.

### T06-11c — Second signed-in user

In a separate browser profile, sign in as `track01.qc-editor@example.test`, select
`TRACK01-A`, open `/nde`. Expected: the same obligation count, the same statuses, and the same
escalation banner. This proves the state is in the database, not in one browser's memory.

---

## 17. Known-good behaviour that is not a defect

Do not report these as failures.

1. **Reader QC can open `/nde` and sees a Create Batch button.** `project_reader` grants
   `nde.view`; the mutation is refused server-side. See §4.1.
2. **The dashboard's "Pending Obligations" counts everything that is not satisfied, waived or
   superseded** — including `issued` and `rejected`. It is the same definition the release
   gate uses, so the number is right even though the word is loose.
3. **A `pending` obligation has no Record Result button.** A result belongs to an issued batch.
4. **The four rejected originals keep their 10 % coverage after the escalation.** They record
   an examination that already happened.
5. **Fewer than two tracers per rejection, late in the walk.** Tracers come from other
   eligible joints of the same welder; once most joints carry one, there are fewer to take.
6. **An empty PWHT table on `SP-T6-001-A`.** 6.0 mm is below the threshold.
7. **`/fabrication/pwht-release` renders the same screen as `/fabrication/qc-release`.**
   Carried over from Track 05, by design.
8. **`SP-T6-001-A` and `-B` appear in the fabrication spool picker as `not started`.** They
   are real spools; Track 06 simply never walks their fabrication stages.

---

## 18. Report template

```md
# Track 06 NDE Browser Walkthrough — YYYY-MM-DD

App: http://localhost:3000
Project: TRACK01-A
Agent: <name / model>
Stand: clean reset at <time> | pre-existing
Batch numbers observed: <NB-...-0001>, <NB-...-0002>

## Summary
Cases run: N   PASS: N   FAIL: N   BLOCKED: N   Not run: N
Obligation count: 12 at baseline -> N at the end
Escalation reached: yes / no   Banner text observed: <verbatim>

## Results
| Case | Persona | Status | URL | Expected | Actual |
| --- | --- | --- | --- | --- | --- |
| T06-00 | Project Admin A | PASS | /nde | ... | ... |

## Failures
### <case ID>
- Expected:
- Actual:
- Screenshot:
- First console error:
- Failing request: METHOD /path → STATUS

## Not run / blocked
- <case ID> — reason

## Observations outside the script
- Anything noticed that no case covers. Do not act on it; just record it.
```

---

## 19. Stop conditions

Report and halt, rather than improvising, when:

- the app shows a DEMO MODE badge at any point in this run;
- `/nde` shows any batch at T06-00 (the stand is not clean);
- a mutation's outcome is unclear after one attempt;
- the same tool call fails twice in a row;
- a browser dialog appears (they freeze the automation channel);
- the escalation fires on the third rejection, or fails to fire on the fourth;
- anything asks for a credential a second time.

---

## 20. References

- `docs/TRACK06_BROWSER_FIXTURES.md` — the fixture, its four design decisions, and the bootstrap
- `docs/qa/local-supabase-browser-runbook.md` — policy, safety, personas
- `docs/qa/tracks-01-05-agent-walkthrough.md` — the script for Tracks 01–05
- `docs/qa/track-06-gate-d5-report.md` — the 2026-08-04 walk that found the two blocking defects
- `docs/superpowers/plans/2026-08-07-track-06-nde-quality.md` — the Track 06 plan, its error
  codes and its escalation arithmetic
