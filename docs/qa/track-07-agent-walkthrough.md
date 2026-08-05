# Track 07 Erection Browser Walkthrough — Agent Execution Script

A self-contained execution script for a browser agent (Playwright MCP) that walks the field
erection aggregate: the four-stage chain To Site → Erected → Welded / Bolted → Supported, the
field material check, field weld progress through the shared NDE machinery, per-support
installation, and the derived Ready For Test that all of it produces.

- `docs/qa/local-supabase-browser-runbook.md` is the **policy** document: scope, safety, personas.
- `docs/qa/tracks-01-05-agent-walkthrough.md` is the script for everything before Track 06.
- `docs/qa/track-06-agent-walkthrough.md` is the NDE script. **This script depends on it** for
  the mechanics of the `/nde` screen; T07-07 below points at the exact sections.
- **This file is the Track 07 script.**

> **Status: not yet executed.** Every expectation below was derived from the source of the ten
> screens under `modules/construction/ui/erection/`, the `spool_erection_readiness` view and the
> Track 07 bootstrap — not from a live run. The Track 06 script, by contrast, records values
> observed on 2026-08-04. Treat a disagreement between this file and the running app as a
> finding to report, not as an obvious defect in the app: the script may be the thing that is
> wrong. Once a full run is green, replace this note with the run date.

Label convention:

- **Bold** — a literal string that appears in the source of the screen. Match it exactly.
- _Italic_ — described by function only. Locate the control by role and nearby text, and record
  in the report what you actually clicked.

---

## 1. Agent contract

Paste this verbatim to the executing agent as its task framing.

```text
You are executing docs/qa/track-07-agent-walkthrough.md against a local development stand.

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

This script has never been run before. Where the app disagrees with it, report the difference
in both directions: what the script expected and what the screen actually says. Do not assume
the app is wrong.
```

---

## 2. Hard rules

1. **`http://localhost:3000` only.** `127.0.0.1` hangs on the loading screen.
2. **No SQL, no Studio, no service key, no `db reset`.** Every assertion here is observable in
   the browser.
3. **No secret ever leaves the browser.** The fixture password is supplied by the operator out
   of band; never type it into a report, a screenshot caption, or a log line.
4. **No `browser_evaluate` mutations.** Reading `disabled`, text content or computed state is
   fine. Clicking a disabled button through JS invalidates the whole run.
5. **Order is not optional.** The stage chain is enforced server-side (PQC53/PQC54): Supported
   cannot be recorded before Welded / Bolted, and neither can be recorded before Erected. A
   skipped case makes every later case meaningless.
6. **A stage is never un-recorded.** Recording a stage again files a *correcting* event and the
   later date wins; there is no undo. If a click's outcome is ambiguous, hard-refresh and read
   the state rather than clicking again.
7. **Ready For Test is never clicked.** It is a projection. If you find any control that sets
   it, that is a finding — report it and stop.
8. **Stop and report** after two consecutive failures of the same tool call, an unexpected
   authentication prompt, an unhandled dialog, or any state not described here.

---

## 3. Stand preparation (operator, not agent)

The agent does not run these. It verifies the outcome from the browser.

```zsh
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
/opt/homebrew/bin/supabase db reset          # only on a disposable local stand
/opt/homebrew/bin/supabase start
set -a; source .env.local; set +a
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
npm run bootstrap:track07-browser-fixtures &&
npm run dev
```

**There is no longer a `NEXT_PUBLIC_PIPEQC_MODE`.** The demo implementation and the mode switch
were removed in Track 07; Supabase is the only implementation. If you find that variable in an
older document, ignore it — exporting it does nothing. Consequently **there is no DEMO MODE
badge to check for.** Earlier scripts assert its absence; on this branch that assertion is
vacuous and passes trivially.

**`db reset` restarts the containers, and the Track 01 bootstrap fails with a
`findOrCreateUser` stack trace if it runs before GoTrue is listening.** It is a race, not a
defect. Re-run the chain; it succeeds the second time.

Three constraints carried over:

- **Fixtures and pgTAP do not coexist.** Reset before `supabase test db`; re-bootstrap after.
- **A bootstrap does not undo recorded progress.** Replaying this script needs a reset. If
  `/erection/dashboard` shows `SP-T7-001-A` past **to site** at T07-00, you are not on a clean
  stand — report BLOCKED rather than working around it.
- **Track 07's bootstrap depends on Track 05's referentials** (`SUB-T5`, `WPS-T5`, `SC-T4`,
  `BW-T4`, `CAT-T5`). Run the whole chain, in order.

---

## 4. Fixture reference

### 4.1 Accounts — all share `TRACK01_FIXTURE_PASSWORD`

| Persona | Email | Track 07 relevance |
| --- | --- | --- |
| Project Admin A | `track01.project-admin-a@example.test` | **the default actor** — holds `erection.view` and `erection.progress.record` |
| Reader QC | `track01.reader-qc@example.test` | Project Reader + QC Engineer — holds `erection.view` **only**; used in T07-09 |
| QC Editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer — holds both; used for the durability check in T07-10 |

**Why Reader QC holds only `erection.view`, despite the `qc_engineer` functional role granting
`erection.progress.record`:** `current_user_has_capability` requires the **access** role to
grant the capability, and the functional role only lifts the gate on top of it. `project_reader`
is granted every non-mutating capability and nothing else. A functional role can never add a
capability the access role lacks. Do not report this as a defect — it is the same rule the
Track 06 script explains for `nde.batch.manage`.

### 4.2 The Track 07 population — from the Track 07 bootstrap

| Object | Value |
| --- | --- |
| Isometric | `ISO-T7-001` revision `R0` accepted, PDS `PDS-T4`, service class `SC-T4` |
| **Walk spool** | `SP-T7-001-A` — field joint `W-T7-001`, one BOM line `IDN-T5-100`, supports `SU-T7-001` (SHOE ×2) and `SU-T7-002` (GUIDE ×1) |
| **Gate spool** | `SP-T7-002-A` — field joint `W-T7-002`, one BOM line `IDN-T5-100`, **no supports, no erection progress at all** |
| Joints | both `BW-T4`, **`field`**, 6″, 6.0 mm |
| Field welders | `W-T7-FIELD-ROOT`, `W-T7-FIELD-CAP`, both under `SUB-T5` |
| WPS | `WPS-T5` |
| Site location | `SITE-T7` |
| Field NDE rule | `SC-T4` / `BW-T4` / `field`: **RT 100 %**, no PWHT, material traceability not required |

Seeded by the bootstrap on the **walk spool only**:

- **To Site** recorded, dated the day the bootstrap ran.
- The **field material check** recorded, so its one BOM line already carries evidence.

`SP-T7-002-A` is deliberately left untouched. It is the only way this script can prove the To
Site precondition, because a precondition cannot be observed on a spool that already satisfies
it.

**PWHT is absent by design.** 6.0 mm is below the threshold and the field rule does not require
it, so `pwht_pending` is 0 throughout. An empty PWHT contribution to RFT is correct.

Fixtures from earlier tracks (`SP-T4-001-A`, `SP-T4-001-B`, `SP-T6-001-A`, `SP-T6-001-B`) are
also present and must stay untouched. They are **shop** spools, so they should not appear in any
erection screen's spool list at all — T07-00 checks that.

### 4.3 The stage chain and what RFT actually depends on

```text
to_site ──▶ erected ──▶ welded_bolted ──▶ supported ──▶ (rft, derived)
```

`is_rft` is true when, and only when, all four of these hold:

1. `welded_bolted_on` is not null
2. `supported_on` is not null
3. `nde_pending = 0`
4. `pwht_pending = 0`

Three consequences the script tests directly:

- **`erected` is not part of the RFT formula** even though the chain requires it first. It gates
  ordering, not readiness.
- **The support *count* is not part of the formula either.** `field_support_recorded` /
  `field_support_total` is evidence a human reads; RFT reads the `supported` stage date.
- **Recording the field weld moves RFT further away, not closer.** `record_weld_progress`
  generates the NDE obligations from the matrix rule, so `nde_pending` goes 0 → 1 the moment the
  weld is recorded. T07-06 and T07-07 exist to make that visible.

---

## 5. Playwright MCP technique notes

Read this once before starting.

| Situation | Technique |
| --- | --- |
| Reading state | `browser_snapshot` is the primary evidence. Screenshot only on FAIL. |
| **The spool picker** | Every erection screen except the three read-only ones renders a **Field spools** card on the left: a filter input placeholder **Filter by ISO or spool number**, then one `<button>` per spool showing `SP-T7-001-A · R0` and a badge with its current stage. Select a spool by clicking that button. The badge text is one of `not started`, `to site`, `erected`, `welded/bolted`, `supported`, `rft`. |
| **A selection is per-screen, not global** | The picker's state lives in the screen's own hook. After every navigation, re-select the spool before asserting anything about it. The hook selects the **first** row on load, which may not be the spool you want. |
| The stage timeline | An `<ol>` of five badges — **To Site**, **Erected**, **Welded / Bolted**, **Supported**, **Ready for Test** — each carrying its date once reached. This is the fastest way to read the whole chain in one snapshot. |
| The stage card | Titled **Record \<Stage\>**, with a `type="date"` input labelled **Date \<Stage\> happened**, defaulted to today, and a submit button also reading **Record \<Stage\>**. When the stage is already recorded the card additionally says **is already recorded on** \<date\>. |
| Date inputs | Native `type="date"`. Fill with `browser_type` in `YYYY-MM-DD`, or `browser_fill_form`. Verify the value read back before clicking Record — a mistyped date is recorded silently and cannot be undone. |
| Dropdowns | Native `<select>` on the field weld form. Use `browser_select_option`. The six controls are, in DOM order: **Subcontractor**, **WPS**, **Root welder**, **Cap welder**, **Root percent** (number), **Weld date** (date). |
| **A blocked action shows its reason** | Every erection screen renders the gate's sentence next to the disabled button rather than only greying it out. When a case expects a refusal, **assert the sentence**, not just `disabled`. The exact strings are given per case. |
| Tables | `/erection/weld-progress` has two tables; `/erection/supported` has one. Address a row by its identifier cell (`tr:has-text("SU-T7-001")`), never by index. |
| The field joints table | Columns **Joint**, **Dia**, **Thk**, **WPS**, **Welders**, **Weld date**, **NDE**, **Status**. Clicking anywhere in a row selects it, which reveals the **Record \<joint\>** form card below. |
| Toasts | `sonner`, auto-dismissing. Snapshot `[data-sonner-toaster]` immediately after a click. |
| A `400`/`403`/`500` anywhere | Record it even if the case still passes visually. |

---

## 6. Execution order

```text
T07-00  baseline: the readiness table, and shop spools absent
 └─ T07-01  the To Site precondition on the gate spool (three refusals)
     └─ T07-02  To Site on the gate spool, recorded for the first time
         └─ T07-03  the correcting event on the walk spool
             └─ T07-04  field material check re-confirmation
                 └─ T07-05  Erected, and the out-of-order refusals
                     └─ T07-06  the field weld — and NDE pending goes 0 → 1
                         └─ T07-07  close the NDE obligation in /nde
                             └─ T07-08  Welded / Bolted, supports, Supported → RFT
                                 └─ T07-09  the reader persona
                                     └─ T07-10  durability, regressions, and the placeholders
```

---

## 7. T07-00 — Baseline

**Actor:** Project Admin A, project `TRACK01-A`.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection`. | Redirects to `/erection/dashboard`. |
| 2 | Read the heading. | **Erection Dashboard**, subtitle **Live field-spool progress from the Supabase construction ledger.** |
| 3 | Read the card title. | **Field spool readiness** followed by **0/2 ready for test**. |
| 4 | Read the table header. | Exactly seven columns: **ISO**, **Spool**, **Material**, **Field welds**, **Field supports**, **Stage**, **RFT**. |
| 5 | Count the rows. | **Two**, both `ISO-T7-001`. |
| 6 | Confirm no shop spool is listed. | `SP-T4-001-A`, `SP-T4-001-B`, `SP-T6-001-A`, `SP-T6-001-B` are **absent**. They have no field joints. If any appears, that is a FAIL worth stopping for. |
| 7 | Read the `SP-T7-001-A` row. | Material **1/1** · Field welds **0/1** · Field supports **0/2** · Stage **to site** · RFT **Welded / Bolted is not recorded; Supported is not recorded.** |
| 8 | Read the `SP-T7-002-A` row. | Material **0/1** · Field welds **0/1** · Field supports **0/0** · Stage **not started** · the same RFT sentence. |
| 9 | Look for a release control. | **There is none.** No button, link or switch anywhere on this screen sets RFT. Read the closing paragraph: **Ready For Test is derived, never stored**. |
| 10 | Open `/erection/rft`, then `/erection/field-qc-release`. | The same table, under headings **Ready For Test** and **Field QC Release**. Both are read-only. |
| 11 | Record the row values from steps 7 and 8 in the report. | Every later case is a delta against them. |

**Note on step 8's `0/1` material.** The gate spool's BOM line exists but carries no evidence.
That the two spools differ here is the whole point of the fixture.

---

## 8. T07-01 — The To Site precondition

**Actor:** Project Admin A. **Target: the gate spool `SP-T7-002-A`.**

This case records nothing. It proves that the screens refuse work the server would refuse, and
name the reason.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/weld-progress`. | Heading **Field Weld Progress**. |
| 2 | In **Field spools**, click `SP-T7-002-A` (badge **not started**). | The right-hand pane switches to it; the stage timeline shows all five badges unreached. |
| 3 | In the **Field joints** table, click the `W-T7-002` row. | A card titled **Record W-T7-002** appears. |
| 4 | Fill the form: Subcontractor `SUB-T5`, WPS `WPS-T5`, Root welder `W-T7-FIELD-ROOT`, Cap welder `W-T7-FIELD-CAP`, Root percent `50`, Weld date today. | The helper line reads **Root and Cap always total 100 percent; the cap takes 50.** |
| 5 | Read the message above the submit button. | Exactly: **Record To Site before recording field welds.** |
| 6 | Read the submit button. | **Record field weld progress**, and `disabled`. Do **not** click it, and do **not** enable it through JS. |
| 7 | Open `/erection/material-check`, select `SP-T7-002-A`. | Heading **Field Material Check**. The **Material traceability** table lists one row, `IDN-T5-100`. |
| 8 | Type any heat number into that row's **Heat / trace number** input, e.g. `HEAT-GATE-1`. | The value is accepted into the field. |
| 9 | Read the message above the submit button. | Exactly: **Record To Site before checking field material.** |
| 10 | Read the submit button. | **Record field traces**, and `disabled`. |
| 11 | Open `/erection/supported`, select `SP-T7-002-A`. | The **Supports on this spool** table says **This spool revision has no supports.** |
| 12 | Read the **Record Supported** card's message. | **Record To Site before Supported.** |

**Step 12 is the one to read carefully.** `firstMissingPredecessor` walks the chain in order and
returns the **earliest** gap, so To Site — not Erected, not Welded / Bolted — is the step the
screen must name. If it names Erected or Welded / Bolted instead, the ordering logic is not
returning the earliest gap and that is a real finding. Report the literal string either way.

---

## 9. T07-02 — To Site, recorded for the first time

**Actor:** Project Admin A. **Target: `SP-T7-002-A`.**

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/to-site`, select `SP-T7-002-A`. | Heading **To Site**, subtitle mentioning **Every later erection step depends on it.** |
| 2 | Read the **Record To Site** card. | A date input **Date To Site happened** defaulted to today. **No** "already recorded" line. |
| 3 | Set the date to `2026-08-01`. | The input reads back `2026-08-01`. |
| 4 | Click **Record To Site**. | A success toast naming the spool: **To Site recorded for SP-T7-002-A.** |
| 5 | Without navigating or reloading, read the stage timeline. | The **To Site** badge is now filled and carries `2026-08-01`. **This is the refresh assertion:** the card calls `refresh()` after the command, so the timeline must update in place. |
| 6 | Read the card again. | It now says **To Site is already recorded on 2026-08-01**, and that recording again files a correcting event. |
| 7 | Hard-refresh the page and re-select the spool. | `2026-08-01` survives. |
| 8 | Open `/erection/dashboard`. | The `SP-T7-002-A` row's Stage badge is now **to site**. |
| 9 | Return to `/erection/weld-progress`, select `SP-T7-002-A`, re-select `W-T7-002`, refill the form. | The refusal from T07-01 step 5 is **gone**, and **Record field weld progress** is now enabled. **Do not click it** — the gate spool stays unwelded so the dashboard keeps a second, less advanced row to compare against. |

---

## 10. T07-03 — The correcting event

**Actor:** Project Admin A. **Target: the walk spool `SP-T7-001-A`.**

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/to-site`, select `SP-T7-001-A`. | The card says **To Site is already recorded on** \<the bootstrap's date\>. Record that date in the report. |
| 2 | Set the date input to `2026-08-02`. | Reads back `2026-08-02`. |
| 3 | Click **Record To Site**. | Success toast. **No duplicate error**: each click carries its own idempotency key, and a repeat is a correcting event, not a conflict. |
| 4 | Read the timeline without reloading. | **To Site** now carries `2026-08-02` — the later date takes effect. |
| 5 | Hard-refresh. | `2026-08-02` survives. |

If step 3 fails with a server error, capture the code. `PQC53`/`PQC54` here would mean the chain
refuses a correction, which contradicts the card's own sentence and is a Track 07 defect.

---

## 11. T07-04 — Field material check re-confirmation

**Actor:** Project Admin A. **Target: `SP-T7-001-A`.**

The bootstrap already recorded this spool's material check. This case proves the one-record
shape (T07-D2) is what the screen says it is.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/material-check`, select `SP-T7-001-A`. | Heading **Field Material Check**. |
| 2 | Read the summary line. | **1/1 lines carry accepted evidence · last checked** \<bootstrap date\>. |
| 3 | Read the explanatory note below it. | **A spool revision carries one material check whichever phase performed it**, and recording here re-confirms it and takes over its date. |
| 4 | Read the `IDN-T5-100` row's trace input. | **Pre-filled** with the existing trace number, not empty: the screen loads the recorded items. |
| 5 | Set **Date checked** to `2026-08-03` and click **Record field traces**. | Success toast **Field material traces recorded.** |
| 6 | Read the summary line without reloading. | **last checked 2026-08-03**. |
| 7 | Open `/erection/dashboard`. | `SP-T7-001-A` Material still **1/1** — a re-confirmation does not double-count. |
| 8 | Read the closing note on the material screen. | **Material Check is derived, not entered** — it reaches the ledger under the erection phase once every ident code carries a trace the PML accepts. |

**Do not** try to prove the phase from this screen. The record is shared; the phase lives in the
progress ledger, which this UI does not surface. That limitation is recorded as T07-D2 and is
not a finding.

---

## 12. T07-05 — Erected, and the out-of-order refusals

**Actor:** Project Admin A. **Target: `SP-T7-001-A`.**

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/supported`, select `SP-T7-001-A`, and read the **Record Supported** card *before* recording anything. | **Record Erected before Supported.** — To Site is satisfied now, so Erected is the earliest gap. Compare with the string recorded in T07-01 step 12: it must have moved. |
| 2 | Open `/erection/welded-bolted`, select `SP-T7-001-A`, read the **Record Welded / Bolted** card. | **Record Erected before Welded / Bolted.** |
| 3 | Open `/erection/erected`, select `SP-T7-001-A`. | Heading **Erected**. |
| 4 | Set the date to `2026-08-04`, click **Record Erected**. | Toast **Erected recorded for SP-T7-001-A.** Timeline updates without a reload. |
| 5 | Return to `/erection/supported`, re-select the spool. | The card now says **Record Welded / Bolted before Supported.** The gap moved one step down the chain. |
| 6 | Open `/erection/dashboard`. | `SP-T7-001-A` Stage badge is **erected**. **The RFT sentence is unchanged** — still naming Welded / Bolted and Supported. This is the case that shows Erected is not part of the RFT formula. |

---

## 13. T07-06 — The field weld, and NDE pending 0 → 1

**Actor:** Project Admin A. **Target: `SP-T7-001-A`, joint `W-T7-001`.**

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/weld-progress`, select `SP-T7-001-A`. | The summary line reads **0/1 field joints welded · 0 NDE and 0 PWHT obligation(s) open.** Record it. |
| 2 | Read the **Field joints** table. | One row, `W-T7-001`, Dia `6`, Thk `6`, WPS `—`, Welders `—`, Weld date `—`, NDE `0/0`, Status blank. |
| 3 | Click the `W-T7-001` row. | Card **Record W-T7-001** appears. |
| 4 | Select Subcontractor `SUB-T5`. | — |
| 5 | Select WPS `WPS-T5`. | — |
| 6 | Select Root welder `W-T7-FIELD-ROOT` and Cap welder `W-T7-FIELD-CAP`. | **They must be different.** |
| 7 | Set Root percent to `60`. | The helper line becomes **the cap takes 40**. Use 60 rather than the default 50 so the recorded split proves the number came from the form. |
| 8 | Set Weld date to `2026-08-05`. | — |
| 9 | Confirm no refusal sentence is shown, then click **Record field weld progress**. | Toast **Field weld W-T7-001 recorded.** |
| 10 | Read the joints table without reloading. | `W-T7-001` now shows WPS `WPS-T5`, both welder codes, Weld date `2026-08-05`, and **NDE 1/1**. |
| 11 | Read the summary line. | **1/1 field joints welded · 1 NDE and 0 PWHT obligation(s) open.** |
| 12 | Open `/erection/dashboard`. | Field welds **1/1**, and the RFT sentence has **grown** to include **1 NDE obligation(s) open**. |

**Step 12 is the important one.** Recording the weld made the spool *less* ready, because the
RT-100 % matrix rule generated an obligation. If the RFT sentence does not gain the NDE clause,
either the obligation was not generated or the readiness view is not counting it — either is a
real defect.

**If step 9 fails with a message of the form "This is a field weld and belongs to the … module"**,
stop and report it as a regression of the Track 07 phase fix: the domain rule compares the
joint's location against the *phase argument*, and that sentence means it has reverted to a
shop-only check.

---

## 14. T07-07 — Close the NDE obligation

**Actor:** Project Admin A. **Screen: `/nde`.**

This case is deliberately thin: `/nde` is Track 06's surface and its script owns the mechanics.
Follow **§5** (technique notes) and **§7 onward** of `docs/qa/track-06-agent-walkthrough.md` for
how to drive batches and results. What this case adds is that a **field** joint goes through
exactly the same machinery as a shop joint.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/nde`. | The obligations table now includes a row for `SP-T7-001-A` / `W-T7-001`, method `RT`. |
| 2 | Read its **Coverage** and **Status (manual)** cells. | Coverage **100**, status **H** — mandatory 100 %, not yet selected. Not `S`: the field rule is 100 %, not a spot rate. |
| 3 | Create a batch containing that obligation and issue it, per the Track 06 script. | Status becomes **HS**; disposition becomes `issued`; a **Record Result** button appears on the row. |
| 4 | Record an **accepted** result for `W-T7-001`, responsible welder `W-T7-FIELD-ROOT`. | Disposition **satisfied**, status **NR**. No repair obligation is created. |
| 5 | Open `/erection/dashboard`. | The `SP-T7-001-A` RFT sentence has **lost** the NDE clause and names only **Welded / Bolted** and **Supported**. |
| 6 | Open `/erection/weld-progress`, select the spool. | Summary line now reads **0 NDE and 0 PWHT obligation(s) open**; the joints table NDE cell reads **0/1**. |

If a rejection path is wanted, use the Track 06 script's T06-03 through T06-06 against this
joint instead of step 4 — but then the repair must be accepted before T07-08 can reach RFT, and
that must be recorded as a deviation from this script.

---

## 15. T07-08 — Welded / Bolted, supports, Supported, and RFT

**Actor:** Project Admin A. **Target: `SP-T7-001-A`.**

This is the case the whole script exists for: the last two milestones, and the projection
flipping on its own.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/welded-bolted`, select `SP-T7-001-A`. | Heading **Welded / Bolted**. The screen shows the **same** field-joint table and form as `/erection/weld-progress`, **plus** a **Record Welded / Bolted** card at the bottom. |
| 2 | Read that card's message. | **None** — Erected is recorded, so nothing is refused. |
| 3 | Set the date to `2026-08-06`, click **Record Welded / Bolted**. | Toast **Welded / Bolted recorded for SP-T7-001-A.** Timeline updates in place. |
| 4 | Open `/erection/dashboard`. | Stage **welded/bolted**; the RFT sentence now names **only** **Supported is not recorded.** |
| 5 | Open `/erection/supported`, select `SP-T7-001-A`. | Heading **Supported**. The **Supports on this spool** table lists **two** rows: `SU-T7-001` (SHOE, qty 2) and `SU-T7-002` (GUIDE, qty 1). Installed `—`, Recorded in `—`, Action **Record installed**. |
| 6 | Read the summary line. | **0/2 supports installed in the field.** |
| 7 | Set **Installation date** to `2026-08-06`. | One date input serves both rows — it is shared on purpose. |
| 8 | Click **Record installed** on the `SU-T7-001` row. | Toast **Support SU-T7-001 recorded as installed.** That row's Installed becomes `2026-08-06`, **Recorded in** becomes a filled `erection` badge, and its button becomes **Re-record**. |
| 9 | Read the summary line without reloading. | **1/2 supports installed in the field.** |
| 10 | Click **Record installed** on the `SU-T7-002` row. | The same, and the summary reads **2/2**. |
| 11 | Read the note under the table. | **A support carries one installation record**, so a shop-installed support shows its fabrication phase and is not counted as field evidence. |
| 12 | Read the **Record Supported** card. | No refusal. Set the date to `2026-08-07` and click **Record Supported**. |
| 13 | Read the timeline without reloading. | **All five badges filled**: To Site `2026-08-02`, Erected `2026-08-04`, Welded / Bolted `2026-08-06`, Supported `2026-08-07`, **Ready for Test** with a date. |
| 14 | Open `/erection/dashboard`. | The card title reads **1/2 ready for test**. The `SP-T7-001-A` RFT cell reads **Ready** with a date, not a shortfall sentence. |
| 15 | Read the RFT date. | It is `greatest(welded_bolted_on, supported_on, last_field_weld_on, last_field_support_on, material_checked_on)` = **`2026-08-07`**. If it shows a different date, report which. |
| 16 | Open `/erection/rft` and `/erection/field-qc-release`. | Both show **Ready** for this spool. Still no release control anywhere. |
| 17 | Confirm `SP-T7-002-A` is untouched. | Stage **to site**, Field welds **0/1**, Field supports **0/0**, still not RFT. |

**Step 14 is the exit criterion of Track 07.** RFT was never clicked. It became true because the
four facts underneath it did.

---

## 16. T07-09 — The reader persona

**Actor:** Reader QC (`track01.reader-qc@example.test`), project `TRACK01-A`.

The operator switches the account; the agent asks for the switch and never handles credentials.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/dashboard`. | The table renders in full. Reader QC holds `erection.view`, so **nothing is hidden**, including `SP-T7-001-A` showing **Ready**. |
| 2 | Open `/erection/to-site`, select `SP-T7-001-A`. | The spool picker works; the **Record To Site** card renders. |
| 3 | Read the card's message. | Exactly: **Recording erection progress needs the erection.progress.record capability.** |
| 4 | Read the **Record To Site** button. | `disabled`. Do not click it, and do not enable it through JS. |
| 5 | Repeat steps 2–4 on `/erection/erected`, `/erection/welded-bolted` and `/erection/supported`. | The same sentence on each stage card. |
| 6 | On `/erection/supported`, read the message on the spool summary card. | **Recording support installation needs the erection.progress.record capability.** — a different sentence from the stage card's, because it is a different action. |
| 7 | On `/erection/supported`, read every row's Action button. | All `disabled`. |
| 8 | Open `/erection/weld-progress`, select a spool and a joint. | The message reads **Recording a field weld needs the erection.progress.record capability.** and **Record field weld progress** is `disabled`. |
| 9 | Open `/erection/material-check`, select a spool. | **Recording a field material check needs the erection.progress.record capability.**, and **Record field traces** is `disabled`. |
| 10 | Count: how many distinct capability sentences did you see? | **Four** — stage, support, weld, material. Each screen states the action it cannot perform rather than a generic denial. Report any screen that greys a control out with no sentence at all. |

**This case and T07-01 are the two that `docs/deferred-work.md` names as unproven.** Give them
the most careful reporting.

---

## 17. T07-10 — Durability, regressions, and the placeholders

**Actor:** QC Editor (`track01.qc-editor@example.test`) for steps 1–3, then Project Admin A.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/erection/dashboard`. | `SP-T7-001-A` is **Ready**. Everything recorded by another account is visible to this one — the state is in the database, not in a session. |
| 2 | Open `/erection/supported`, select `SP-T7-001-A`. | Both supports show `2026-08-06` and an `erection` badge. QC Editor holds `erection.progress.record`, so the buttons are **enabled** and read **Re-record**. Do not click them. |
| 3 | Open `/erection/weld-progress`, select `SP-T7-001-A`. | `W-T7-001` shows WPS `WPS-T5`, both welders, `2026-08-05`, NDE `0/1`. |
| 4 | Switch to Project Admin A. Open `/erection/flange-progress`. | Heading **Flange / Bolt Progress**, the same readiness table, and the note **Flange and bolt-up progress itself is built in Track 09**. This route is a signpost, not a feature. |
| 5 | Open `/erection/spool-erection`. | Redirects to `/erection/dashboard`. |
| 6 | Open `/tracking`. | An honest placeholder naming **Track 08** — not a demo screen and not a crash. |
| 7 | Check the sidebar. | No **Tracking**, **Test Pack**, **Flange** or **Reports** entry: routes without an implementation are hidden rather than offered. `/tracking` is still reachable by URL — that is intentional. |
| 8 | Re-walk the Track 05 fabrication golden path to laydown on `SP-T4-001-A`. | Unbroken. Track 07 made the phase an explicit argument to `record_weld_progress`; a shop weld that now refuses is a Track 07 regression, not a Track 05 issue. |
| 9 | Re-walk the Track 06 NDE cases on `SP-T6-001-A`. | Unbroken. |
| 10 | Read the browser console for the whole run. | Report every error and warning, with the case it occurred in. |

---

## 18. Reporting

Return one table plus the deltas.

| Case | Verdict | URL | Persona | Notes |
| --- | --- | --- | --- | --- |
| T07-00 … T07-10 | PASS / FAIL / BLOCKED | | | |

Then, separately:

1. **The two readiness snapshots** — the `SP-T7-001-A` row at T07-00 and at T07-08 step 14, cell
   by cell. This is the evidence that the projection tracked every command.
2. **Every literal string that differed** from this script, with the case number, the expected
   string and the observed string. This script has never been run; string drift is expected and
   is the most useful thing you can report.
3. **Every refresh that did not happen in place** — any case where a value appeared only after a
   manual reload. Each of those is a missing `refresh()` call, and T07-D1 exists specifically
   because that has never been checked.
4. **Every console error or non-2xx request**, with method, path and status.
5. **Anything you found that this script does not describe.**

---

## 19. Known-good behaviour — do not report these as defects

- **Assembly is absent** from navigation and from every command. `PQC50` refuses it server-side.
  It is a deliberate, disabled extension point, not missing Track 07 work.
- **A field weld goes through the same weld and NDE machinery as a shop weld.**
  `071_field_weld_parity.test.sql` pins that parity; the field screen adds only the To Site
  precondition and the erection capability.
- **Ready For Test is read-only everywhere.** Four routes render the readiness table and none of
  them can set it.
- **The material columns are phase-agnostic.** `Material 1/1` on an erection screen may have been
  earned by a shop check. This is the accepted shape (T07-D2), documented on the view itself.
- **The support count does not gate RFT**; the `supported` stage date does.
- **`erected` does not gate RFT**; it gates ordering.
- **No DEMO MODE badge exists to be absent.** The demo implementation is gone from this branch.
- **`/erection/dashboard`, `/erection/rft` and `/erection/field-qc-release` are the same screen**
  with three titles. They are told apart in Track 11, when release documents exist.
