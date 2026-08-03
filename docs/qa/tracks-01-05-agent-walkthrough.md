# Tracks 01–05 Browser Walkthrough — Agent Execution Script

A self-contained execution script for a browser agent (Playwright MCP) that walks the local
Supabase implementation of Tracks 01–05 end to end, including all eight fabrication stages.

- `docs/qa/local-supabase-browser-runbook.md` is the **policy** document: scope, safety, personas.
- **This file is the script**: exact routes, exact controls, exact fixture values, exact expected
  outcomes, and the assertion to make at each point. Read both; where they disagree, this file wins
  because it was written against the source.

Label convention:

- **Bold** — the literal accessible name, verified against the component source. Match it exactly.
- _Italic_ — described by function only. The label is not pinned; locate the control by role and
  nearby text, and record in the report what you actually clicked.

---

## 1. Agent contract

Paste this verbatim to the executing agent as its task framing.

```text
You are executing docs/qa/tracks-01-05-agent-walkthrough.md against a local development stand.

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
and move on. Execute the cases in the order given: later cases depend on earlier state.
```

---

## 2. Hard rules

1. **`http://localhost:3000` only.** `127.0.0.1` hangs on the loading screen.
2. **No SQL, no Studio, no service key, no `db reset`.** Every assertion in this script is
   observable in the browser. If something is only checkable in the database, it is not your case.
3. **No secret ever leaves the browser.** The fixture password is supplied by the operator out of
   band; never type it into a report, a screenshot caption, or a log line.
4. **No `browser_evaluate` mutations.** Reading `disabled`, text content or computed state is fine.
   Clicking a disabled button through JS, or calling `supabase.rpc(...)` from the console, invalidates
   the whole run.
5. **A mutation is recorded once.** If a click's result is ambiguous, hard-refresh and read the state
   rather than clicking again. Most commands are idempotent server-side, but a second click can mask
   a real defect.
6. **Stop and report** after two consecutive failures of the same tool call, an unexpected
   authentication prompt, an unhandled dialog, or any state not described here. Do not improvise a
   repair.

---

## 3. Stand preparation (operator, not agent)

The agent does not run these. It verifies the outcome from the browser.

### 3.1 Mode selection

| Mode | Bootstraps | Use when |
| --- | --- | --- |
| **Full chain** | Tracks 01→05 | You only need T01–T03, T05 and the smoke sweep. Track 05 creates the `ISO-T4-001/R0` definition itself, so the T04 upload UI cannot be proven. |
| **T04 UI-import** | Tracks 01→04, then browser T04, then Track 05 | The complete script below, including T04. **This is the mode this file assumes.** |

### 3.2 Commands

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
npm run bootstrap:track02-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures &&
npm run bootstrap:track04-browser-fixtures &&
npm run dev
```

After the browser has accepted R0 in **T04-06**, run in the same shell:

```zsh
npm run bootstrap:track05-browser-fixtures
```

Expected on a stand where the browser already created R0:

```text
Track 05 referentials reconciled: 14 rows upserted into project <uuid>.
Engineering definition ISO-T4-001 already has an accepted revision; nothing to import.
```

### 3.3 Two constraints that bite

- **Fixtures and pgTAP do not coexist.** With bootstrap data loaded, `supabase test db` reports
  `Files=20, Tests=354` and fails in `040_engineering_identity`, `042_spooling_apply` and
  `051_weld_progress` — shared `system_reference_entries` codes with `on conflict do nothing`.
  Reset before the database suite; re-bootstrap afterwards. The conflict is one-way: bootstrap
  breaks pgTAP, never the reverse.
- **A bootstrap does not undo fabrication events.** Replaying a completed golden path needs a
  reset. If `SP-T4-001-A` already shows a stage, you are not on a clean stand — report BLOCKED at
  T05-00 rather than working around it.

---

## 4. Fixture reference

### 4.1 Accounts — all share `TRACK01_FIXTURE_PASSWORD`

| Persona | Email | Scope |
| --- | --- | --- |
| Platform Admin | `track01.platform-admin@example.test` | Platform admin; Projects A and B |
| Platform Observer | `track01.platform-observer@example.test` | Platform admin; no membership |
| Project Admin A | `track01.project-admin-a@example.test` | Project Admin, `TRACK01-A` — **the default actor** |
| Reader QC | `track01.reader-qc@example.test` | Project Reader + QC Engineer, A |
| QC Editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer, A |
| NDE Subcontractor | `track01.nde-subcontractor@example.test` | NDE Inspector, `TRACK01-SUB-A` / `TRACK01-PDS-A` |

Sign-in is performed by the operator, or by the agent with a password the operator supplies out of
band, according to the operator's own policy. The agent must never echo it.

### 4.2 Track 05 referentials — written by the Track 05 bootstrap, 14 rows

| Kind | Code | Detail |
| --- | --- | --- |
| Subcontractor | `SUB-T5` | |
| WPS | `WPS-T5` | 1″–24″, 2–30 mm, approved 2026-01-01 |
| Welders | `W-T5-1`, `W-T5-2` | both linked to `WPS-T5` |
| PML records | `IDN-T5-100`/`HEAT-T5-100`, `IDN-T5-200`/`HEAT-T5-200`, `IDN-T5-300`/`HEAT-T5-300` | |
| Location | `YARD-T5` in category `CAT-T5` | |
| Line service / RAL | `LS-T5` / `RAL 9006` | |
| Paint matrix | **240 µm** final DFT | blasting + primer, 1 intermediate + 1 final coat |
| NDE matrix | `SC-T4`/`BW-T4`/`shop` | updated to `pwht_required = true`, threshold 8 mm |

### 4.3 Engineering definition — from `scripts/weld.txt`, `trace.txt`, `supp.txt`

| Object | Value |
| --- | --- |
| Isometric | `ISO-T4-001`, PDS area `PDS-T4`, service class `SC-T4` |
| Golden spool | `SP-T4-001-A` — welds `W-T4-001`, `W-T4-002` (6″, 8.2 mm); support `SU-T4-001`; BOM `IDN-T5-100`, `IDN-T5-200` |
| Second spool | `SP-T4-001-B` — weld `W-T4-003` (8″, 10.3 mm); BOM `IDN-T5-300` |

Expected shape after R0: `SP-T4-001-A: 2 welds / 4 points / 1 support / 2 bom`,
`SP-T4-001-B: 1 / 2 / 0 / 1`.

`trace.txt` deliberately carries **no** `TRACE_NUMBER` — heat numbers are transcribed from a
returned QC-13, so they are entered on the material-check screen, not imported.

### 4.4 Route capability map

| Route prefix | Required capability |
| --- | --- |
| `/admin/system-referential` | `system_referential.manage` |
| `/admin/project-definition` | `project.definition.manage` |
| `/admin/project-referential`, `/admin/import-settings`, `/admin` | `project_referential.manage` |
| `/admin/access-rights` | `access_rights.manage` |
| `/admin/imports` | `imports.view` |
| `/spooling` | `spooling.view` |
| `/fabrication/material-check`, `/fabrication/weld-progress` | `fabrication.progress.record` |
| `/fabrication/qc-release`, `/fabrication/pwht-release` | `fabrication.qc.release` |
| `/fabrication` | `fabrication.view` |

`/fabrication/pwht-release` renders the **same** screen as `/fabrication/qc-release`. That is by
design, not a defect.

---

## 5. Playwright MCP technique notes

Read this once before starting; it removes most of the guesswork.

| Situation | Technique |
| --- | --- |
| Reading state | `browser_snapshot` (accessibility tree) is the primary evidence. Screenshot only on FAIL. |
| Spool picker | A list of `<button>`s. The accessible name is `"<spool> · <revision>"` plus a stage badge, e.g. `SP-T4-001-A · R1` + `not started`. Filter first with the _Filter by ISO or spool number_ input if the list is long. |
| Dropdowns | Native `<select>` elements — use `browser_select_option`, not click-then-click. Options render as `CODE — Name`, e.g. `SUB-T5 — …`, `LS-T5 — RAL 9006 (240 µm)`. Welder and WPS options are the bare code. |
| Date inputs | `type="date"`; fill with `YYYY-MM-DD`. All of them default to today except **Final QC on**, which starts empty. |
| Toasts | `sonner`. They auto-dismiss — snapshot immediately after the click, or you will lose the QC-13 form number. |
| Disabled assertions | Read the `disabled` property via `browser_evaluate`, or trust the snapshot's disabled state. Never click through it. |
| "No request was sent" assertions | Take `browser_network_requests` **before** the action, perform it, take it again, and diff. This is how T05-N1 is proven. |
| A `400`/`500` anywhere | Record it even if the case still passes visually. A screen that renders while a request fails is exactly the class of defect this walk exists to catch. |
| Hard refresh | `browser_navigate` to the same URL, then re-select the spool. Selection is component state and does not survive a reload. |
| Second user | Use a separate browser context/profile. Do **not** sign out of the primary session mid-run. |

---

## 6. Execution order

```text
B00  baseline
 └─ T01  access rights          (5 cases)
     └─ T02  referentials       (4 cases)
         └─ T03  generic imports (7 cases)
             └─ T04  SpoolGen import + revisions (12 cases)   ← run Track 05 bootstrap after T04-06
                 └─ T05  fabrication golden path (8 stages + 5 negatives + 2 durability)
                     └─ S01  smoke sweep
```

T05 depends on T04 having produced the definition. Everything before T04 is independent and may be
re-ordered if a case blocks.

**Priority marks.** `[P0]` cases were never walked in the 2026-08-02 run and are the reason this
script exists. If time runs short, do B00, T05 and every `[P0]` case, and report the rest as not run.

---

## 7. B00 — Baseline and isolation

**Actor:** Project Admin A, project `TRACK01-A`.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/`. | The app loads in Supabase mode. The active-project label reads `TRACK01-A`. **No DEMO MODE badge.** |
| 2 | Read the dashboard figures. | Any demo-derived figure carries a visible marker saying it is demo data. Unmarked figures such as "Welds requiring action 1" or "NDE batches active 4" while the project has no spools are a **FAIL** — that was defect 5 of the close-out. |
| 3 | Reload. | The selected project and the navigation survive. |
| 4 | Read the sidebar. | Navigation is capability-filtered, not a static demo menu. |
| 5 | Switch to `TRACK01-B`, open `/admin/project-referential`. | No Project-A fixture value appears. |
| 6 | Switch back to `TRACK01-A`. | — |

**PASS:** no uncaught console error, project data isolated, no unmarked demo figures.

---

## 8. T01 — Access rights

**T01-01 — Reader denial.** As Reader QC, navigate directly to `/admin/access-rights`.
Expected: a Forbidden / access-denied state; no usable editor.

**T01-02 — Failed mutation preserves input.** As Project Admin A on `/admin/access-rights`, open the
editor for QC Editor, set access role to **Project Reader** while keeping the QC Engineer functional
role, and submit. Expected: refused, dialog stays open, every entered value still visible. Do not
submit a second time.

**T01-03 — Editor capability visibility.** As Project Admin A, set QC Editor to **Project Editor** +
QC Engineer and save. Sign in as QC Editor, select A. Expected: Fabrication navigation is present.
Restore the fixture default afterwards if you changed it.

**T01-04 — Subcontractor scope.** As NDE Subcontractor, open a screen with a WPS/PDS selector.
Expected: only `TRACK01-SUB-A` and `TRACK01-PDS-A` are offered, and a foreign value cannot be reached
by URL.

**T01-05 — Audit.** Operator-side only (`public.audit_events`). The agent reports this as
**not run — out of browser scope**.

---

## 9. T02 — Referentials

**T02-01 — System referential lifecycle.** As Platform Admin on `/admin/system-referential`: all four
sections load; create a uniquely named test Material Type, edit it, archive it, reactivate it; confirm
Film Quantity, UT Calculation and Torquing expose no physical delete; reload and confirm persistence.

**T02-02 — Project referential dependency.** As Project Admin A on `/admin/project-referential`:
every group loads and Gates B/C report ready. Archive the active `BW-T4` weld type. Expected: the
existing NDE matrix stays visible, active selectors no longer offer `BW-T4`, readiness reports the
missing dependency. **Reactivate `BW-T4` and confirm readiness recovers before continuing** — T05
depends on it.

**T02-03 — Progress weights.** On `/admin/progress-weights`: submit a total of 90 → invariant error,
dialog stays open. Submit 100 → accepted. Reload and confirm one replacement, not two.

**T02-04 — Branding isolation.** On `/admin/project-definition`: upload non-sensitive test images,
reload, confirm signed previews render, then confirm Project B cannot render A's object URL.

---

## 10. T03 — Generic project imports

**Actor:** Project Admin A, `/admin/imports`.

| Case | Step | Expected |
| --- | --- | --- |
| T03-01 | Select **Project Piping Material List**, download the template. | Template downloads. |
| T03-02 | Upload a three-row sheet with one empty **Ident Code**. | Blocker visible, Apply disabled. |
| T03-03 | Fill the ident code, re-upload, apply. | Applied. |
| T03-04 | Hard-refresh `/admin/imports`, then open Project Referential → Piping Material List. | Records persist. |
| T03-05 | In history, try to apply the same job twice; upload the same file as a new job. | Second apply refused; overwrite/conflict path is explicit; **Download source** works. |
| T03-06 | As Reader QC, navigate to `/admin/imports`. | Hidden or unavailable; a direct mutation attempt is refused. |
| T03-07 | Switch to Project B. | A's import history is absent. |

A `spooling_definition` row may appear in this history after T04/T05. It must be labelled
**SpoolGen definition** and must not crash the page.

---

## 11. T04 — SpoolGen import and revisions

**Mode:** T04 UI-import. **Actor:** Project Admin A. Files: `scripts/weld.txt`, `scripts/trace.txt`,
`scripts/supp.txt`.

| Case | Step | Expected |
| --- | --- | --- |
| T04-01 | `/spooling/browse` | Clean state: no imported isometrics. |
| T04-02 | `/spooling/import`, attach only `supp.txt`, validate. | Error names the missing `weld.txt`; no usable job. |
| T04-03 | Attach a `weld.txt` larger than 4 MB. | Rejected **before** any Storage upload. |
| T04-04 | Attach a copy with `PDS_AREA=PDS-NOPE`. | Red PDS error, Apply disabled. |
| T04-05 | Attach all three real files, validate. | `10 rows: 0 errors, 3 warnings`. WPS warnings are non-blocking; Apply enabled. |
| T04-06 | Apply R0. Hard-refresh, browse `ISO-T4-001`. | `Applied 7 definition rows`. R0 accepted. Shape matches §4.3 exactly. **← run the Track 05 bootstrap now.** |
| T04-07 | Upload a copy with `ISO_REVISION=R1` and one changed spool weight. | The changed spool is **Revised**; Apply names the missing decisions. The count in the blocking sentence must equal the number of items actually needing a decision. |
| T04-08 | Set the changed spool to **Rework**. | Its welds require their own decisions. Then set it to **Done without Modification** — weld decisions disappear. |
| T04-09 | Make every decision, apply R1. | R1 accepted; R0 superseded, selectable, read-only. |
| T04-10 | Try applying the job again; re-upload R1 unchanged. | Second apply refused; duplicate revision number refused. |
| T04-11 | As Reader QC, `/spooling/import`. | No working Validate control; a direct attempt is refused. |
| T04-12 | As a Project-B member, browse. | Project-A isometrics absent. |

---

## 12. T05 — Fabrication golden path

**Actor:** Project Admin A, `TRACK01-A`. **Spool:** `SP-T4-001-A`, revision **R1** after T04-09.

### 12.0 The eight stages and who writes them

| # | Stage (timeline label) | Written by | Ledger event? |
| --- | --- | --- | --- |
| 1 | **Start Fab** | **Record Start Fab** button | yes |
| 2 | **Material Check** | **Record traces**, and only once *every* BOM line has an accepted trace | yes |
| 3 | **Fabricated** | nothing — derived from material + welds + supports all complete | **no** |
| 4 | **QC Release** | **QC release spool** | yes |
| 5 | **Sent to Paint** | **Record Sent to Paint** | yes |
| 6 | **Painted** | **Record painting** | yes |
| 7 | **Final QC** | **Record painting**, and only when **Final QC on** is filled | yes |
| 8 | **Laydown** | **Record laydown** | yes |

Two consequences the agent must internalise:

- **Fabricated shows a date but has no event.** The timeline cell gets a date (the greatest of the
  material, weld and support dates) as soon as readiness is complete. There is no `fabricated` row in
  the event ledger and there never will be. Neither observation is a defect.
- **Laydown is blocked until Final QC exists.** `record_laydown` refuses without it, and the button is
  disabled. **Final QC on** is the one date field that starts empty — if you leave it blank at
  T05-06, T05-08 becomes unreachable and the correct verdict is a FAIL against T05-06, not a
  laydown bug.

### T05-00 — Preconditions

`/fabrication/dashboard`. Expected: two spools listed, `SP-T4-001-A` and `SP-T4-001-B`, both
revision **R1**, both stage `not started`, with columns ISO / Spool / Rev / Stage / Material / Welds /
Supports / NDE outstanding / PWHT outstanding. Superseded R0 rows must **not** appear.

Any spool already showing a stage means the stand is not clean → **BLOCKED**.

### T05-01 — Start Fab and QC-13 `[stage 1]`

URL `/fabrication/material-check`, select `SP-T4-001-A`.

1. Confirm the **Material traceability** table lists **two** rows: `IDN-T5-100` and `IDN-T5-200`,
   with descriptions and quantities. An empty table plus "This spool revision has no bill of
   materials to check" is the 2026-08-02 blocking defect — check the console for a `400` on
   `material_check_items` and report **FAIL** with the request.
2. Leave **Date** at today. Click **Record Start Fab**. Expected toast: `Start Fab recorded.`
   The timeline's **Start Fab** cell gains today's date. The button becomes disabled.
3. Click **Issue QC-13**. Expected toast `QC-13 <number> issued.` — **capture the number now**,
   the toast auto-dismisses.
4. Assert **Issue QC-13** was disabled before step 2 and enabled after it.

### T05-02 — Partial material check must not complete the stage

1. Enter `HEAT-T5-100` in the trace field of `IDN-T5-100` only. Leave `IDN-T5-200` empty.
2. Click **Record traces**. The button **is** enabled with one entry and the save **succeeds**
   (`Material traces recorded.`) — that is correct behaviour.
3. Expected: the timeline's **Material Check** cell still shows `—`, and the dashboard still shows
   `1/2` material. A completed stage here is a **FAIL**.

### T05-03 — Complete the material check `[stage 2]`

1. Enter `HEAT-T5-200` for `IDN-T5-200`. `HEAT-T5-100` must still be present in its field after the
   reload from T05-02 — an emptied field is a persistence defect, report it.
2. Click **Record traces**. Expected toast `Material traces recorded.`
3. Expected: **Material Check** gains today's date without anyone typing a stage date, and the
   current-stage badge moves to `material_check`.
4. Hard-refresh and re-select the spool. Expected: both heat numbers still in their fields, stage
   still `material_check`, and the QC-13 from T05-01 still linked — the screen reloads the latest
   form rather than losing it.

### T05-04 — Shop weld progress `[toward stage 3]`

URL `/fabrication/weld-progress`, select `SP-T4-001-A`. The **Shop weld joints** table lists
`W-T4-001` and `W-T4-002`, both 6″ / 8.2 mm, NDE `0/0`, no Locked badge.

For **each** joint — click its row first, which opens the **Record `<joint>`** card:

| Field | Value |
| --- | --- |
| **Subcontractor** | `SUB-T5` |
| **WPS** | `WPS-T5` |
| **Root welder** | `W-T5-1` |
| **Cap welder** | `W-T5-2` |
| **Root percent** | leave at `50` (the card states the cap takes the remaining 50) |
| **Weld date** | today |

Click **Record weld progress**. Expected toast `Weld W-T4-00n recorded.`

After both joints: each row shows the WPS, both welders, the weld date, and NDE `1/1` — one pending
RT obligation and one PWHT requirement per joint, produced by the `SC-T4`/`BW-T4`/`shop` matrix rule.

### T05-05 — Supports, gates and QC release `[stages 3 and 4]`

URL `/fabrication/qc-release`, select `SP-T4-001-A`.

1. Read **QC release spool** before doing anything: it must be **disabled**, with a red sentence
   naming the outstanding counts.
2. In **Supports**, click **Mark installed** on `SU-T4-001`. Expected toast
   `Support installation recorded.`, the Installed cell gains a date, the button disables.
3. Expected now: the **Fabricated** timeline cell gains a date (material + welds + supports all
   complete) **while QC release stays disabled**, because two NDE obligations and two PWHT
   requirements are still outstanding. Both halves of that sentence must hold.
4. In **NDE obligations**, click **Mark accepted** on both rows. Each disposition badge leaves
   `pending`. Toast: `The obligation is satisfied.`
5. In **PWHT**, type `CHART-T5-1` into **Chart number** — note that **Record accepted** stays
   disabled while the chart number is empty; assert that before typing. Then click **Record accepted**
   on both rows. Toast: `PWHT result recorded.`
6. Expected: **QC release spool** is now enabled. Click it. Toast `The spool is QC released.`, and
   the **QC Release** timeline cell gains the **Release date** value.

### T05-06 — Paint, DFT refusal, Final QC `[stages 5, 6, 7]`

URL `/fabrication/paint`, select `SP-T4-001-A`.

1. Click **Record Sent to Paint**. Toast `Sent to Paint recorded.`; **Sent to Paint** gains a date.
   (The button was disabled before QC release — assert that on `SP-T4-001-B` if you want the
   negative, not by clicking here twice.)
2. Select **Line service** `LS-T5 — RAL 9006 (240 µm)`.
3. Enter **Measured DFT (µm)** `200` and **W10P form number** `W10P-T5-1`. Expected: the red
   sentence *"The measured DFT of 200 microns is below the required 240 microns."*, **Record
   painting** disabled, and — check the network log — **no request is sent**. The refusal is
   client-side.
4. Clear the DFT and enter `250`. Expected: the sentence disappears, the button enables.
5. **Fill "Final QC on" with today.** It starts empty and nothing prompts you. Skipping it blocks
   stage 8 — see §12.0.
6. Click **Record painting**. Toast `Painting recorded.` Expected: **Painted** *and* **Final QC**
   both gain their dates.

### T05-07 — Laydown `[stage 8]`

URL `/fabrication/laydown`, select `SP-T4-001-A`.

1. If the red sentence *"Record the final QC before moving the spool to laydown."* is shown, T05-06
   step 5 was missed — fix it there, do not work around it here.
2. Select **Location** `YARD-T5`, leave **Stored on** at today.
3. Click **Record laydown**. Toast `Laydown recorded.`; **Laydown** gains its date and becomes the
   current stage.

### T05-08 — Full ladder and durability

1. `/fabrication/dashboard`, hard refresh. Expected: `SP-T4-001-A` stage `laydown`, material `2/2`,
   welds `2/2`, supports `1/1`, NDE outstanding `0`, PWHT outstanding `0`.
2. Re-open `/fabrication/material-check`, select `SP-T4-001-A`, read the timeline. Expected: **all
   eight cells carry a date** — including **Fabricated**, which is derived. Nothing shows `—`.
3. **`[P0]` T05-D2 — second signed-in user.** In a separate browser profile, sign in as another
   Project-A member (`track01.qc-editor@example.test`) and open `/fabrication/dashboard`. Expected:
   the same stage and the same counts. This proves the state is in the database, not in one
   browser's memory.

### T05 negatives

| Case | Step | Expected |
| --- | --- | --- |
| **`[P0]`** T05-N1 | `/fabrication/weld-progress`, spool `SP-T4-001-B`, joint `W-T4-003`. Choose `SUB-T5` and `WPS-T5`, then set **Root welder** *and* **Cap welder** both to `W-T5-1`. Snapshot the network log before and after. | The red sentence *"Each weld point of a joint needs a different welder."*, **Record weld progress** disabled, and **no RPC leaves the browser** — the before/after network diff must be empty. |
| **`[P0]`** T05-N2 | Return to `SP-T4-001-A`, joint `W-T4-001`, and try to record it again. | A locked-joint sentence in plain English. Raw SQL text or an error code shown bare is a **FAIL**. |
| T05-N3 | Create a manual revision at `/spooling/revisions`, then open the **superseded** spool revision on `/fabrication/material-check` and try to record a trace. | The `PQC31` site-engineer sentence: this revision is no longer the accepted one. |
| **`[P0]`** T05-N4 | Sign in as Reader QC. Navigate directly to `/fabrication/qc-release`, then `/fabrication/material-check`. | **Neither** is reachable; no release control is visible. Reader QC lacks both `fabrication.qc.release` and `fabrication.progress.record`. |
| T05-N5 | As Reader QC, check the sidebar. | Neither route is offered in navigation either. |

**Why T05-N1 is phrased that way.** Older runbooks ask for "two points totalling 90 %". That is
**unreachable through this screen**: the card derives the cap as `100 − root`, so root + cap is
always exactly 100 whatever you type. The same-welder rule is the allocation invariant the UI can
actually express, and it exercises the same pre-flight path. If you also want the numeric bound,
set **Root percent** to `150` and record what happens — but the same-welder case is the one that
must pass.

---

## 13. S01 — Smoke sweep

Open every route. For each record: renders / no uncaught console error / sensible empty state /
guard respected. Do **not** infer durable real-mode support from this pass.

- Erection: `/erection/dashboard`, `/to-site`, `/material-check`, `/erected`, `/welded-bolted`,
  `/supported`, `/field-qc-release`, `/rft`, `/weld-progress`, `/flange-progress`
- NDE: `/nde`, `/nde/dashboard`
- Tracking: `/tracking`, `/tracking/data-analysis`, `/tracking/print-barcodes`
- Reports `/reports`; Flange `/flange`
- Test Pack: `/testpack`, `/builder`, `/explorer`, `/pressure-test`, and for `line-check`,
  `item-clearance`, `blinding`, `testing-precomm`, `reinstatement` — each parent plus
  `/preparation` and `/progress`
- Config: `/settings`, `/documentation`
- Fabrication: `/fabrication`, `/fabrication/pwht-release` (renders the QC release screen — expected)

---

## 14. Known-good behaviour that is not a defect

Do not report these as failures.

1. **Fabricated has a date but no ledger event.** Derived in `spool_fabrication_readiness`.
2. **`/fabrication/pwht-release` and `/fabrication/qc-release` render the same screen.**
3. **Closing NDE obligations by hand** — the screen says so: it is an interim Track 05 action that
   Track 06 replaces with batches and results.
4. **`spooling_definition` appearing in generic import history**, labelled *SpoolGen definition*.
5. **A spool carrying a field or assembly joint can never reach Fabricated** through this screen.
   `spool_fabrication_readiness` counts every non-removed joint, not only `weld_location = 'shop'`.
   A known Track 07 limitation. It does not affect `SP-T4-001-A`, whose joints are all shop.
6. **WPS warnings during T04-05 validation** are non-blocking by design (3 warnings, 0 errors).
7. **Selecting a spool does not survive a reload.** Component state.

---

## 15. Report template

```md
# Tracks 01–05 Browser Walkthrough — YYYY-MM-DD

Mode: T04 UI-import | full chain
App: http://localhost:3000
Project: TRACK01-A
Agent: <name / model>
Stand: clean reset at <time> | pre-existing

## Summary
Cases run: N   PASS: N   FAIL: N   BLOCKED: N   Not run: N
Golden path reached stage: <stage name>

## Results
| Case | Persona | Status | URL | Expected | Actual |
| --- | --- | --- | --- | --- | --- |
| B00 | Project Admin A | PASS | / | ... | ... |

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

## 16. Stop conditions

Report and halt, rather than improvising, when:

- the app shows a DEMO MODE badge at any point in this run;
- a route that should be guarded renders its screen, or a guarded route 500s instead of refusing;
- any mutation's outcome is unclear after one attempt;
- the same tool call fails twice in a row;
- a browser dialog appears (they freeze the automation channel);
- the stand turns out not to be clean at T05-00;
- anything asks for a credential a second time.

---

## 17. References

- `docs/qa/local-supabase-browser-runbook.md` — policy, safety, personas
- `docs/TRACK05_BROWSER_FIXTURES.md` — fixture codes and the short click path
- `docs/architecture/construction-progress-model.md` — ledger, stages, `PQC30`–`PQC39`, limitations
- `docs/superpowers/plans/2026-08-06-track-05-close-out.md` — the 2026-08-02 walk and its defects
- `config/route-capabilities.ts` — the guard map in §4.4, verbatim
