# Track 12 — PipeQC Demo Lite presenter runbook

**Document status: static source-verified; live Task 12 pending.**
Every route, control label, persona, business code and expected outcome below was read out of the
current source tree, migrations and `scripts/demo/manifest.ts` on this branch. **No step in this
document has been executed in a browser or against a live database.** Task 12 (Phase C) is the gate
that turns "expected" into "observed"; until it closes, treat every "Expected" line as a prediction
derived from source, not as evidence.

**Owner:** the presenter (product owner). The walkthrough is fully manual: real UI, real Supabase,
no Playwright, no per-track fixture command, no SQL, no Supabase Studio.

**Product claim this demo supports:** a local Supabase-backed release with a real four-file
engineering import, durable business commands, role and project isolation, and two real report
downloads. It does **not** claim production deployment, offline operation, or dossier handover.

---

## 1. Prepare the stand

### 1.1 One-time local setup

You need the local Supabase stack running and `.env.local` present with the public browser config
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The preparation command
spawns `supabase db reset` directly, without a shell, so the `supabase` binary must be on `PATH`.

```zsh
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
supabase start

set -a
source .env.local
set +a

export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is missing in .env.local}"
```

### 1.2 Secrets — interactive only

Two values are entered interactively (masked) in the terminal and never written into this
document, a screenshot, a commit, or acceptance evidence:

- `SUPABASE_SERVICE_ROLE_KEY` — the local API Secret from `supabase status`;
- `TRACK01_FIXTURE_PASSWORD` — the local demo-account password, minimum 12 characters.

Enter each one on its own, one command at a time:

```zsh
read -r -s "SUPABASE_SERVICE_ROLE_KEY?Local Supabase API Secret: "
echo
```

```zsh
read -r -s "TRACK01_FIXTURE_PASSWORD?Demo account password (12+ characters): "
echo
export SUPABASE_SERVICE_ROLE_KEY TRACK01_FIXTURE_PASSWORD
```

The same password applies to every demo account. At sign-in the presenter types it directly into
the login form; it is never displayed on the slide, in the terminal, or in this runbook.

**If the values already live in `.env.local`, skip §1.1–§1.2 entirely.** The local npm scripts run
under `tsx --env-file-if-exists=.env.local` and read `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`TRACK01_FIXTURE_PASSWORD` from that gitignored file themselves — no `source`, no `export`, no
interactive prompt. Shell exports still take precedence when they are set, so the hosted procedure
(`set -a; . ~/.pipeqc-hosted.env; set +a`) is unaffected.

Whoever runs the preparation — presenter or agent — **must never invent a password**. `demo:prepare`
resets the password of every demo account to whatever `TRACK01_FIXTURE_PASSWORD` holds at that
moment, so a substituted value silently locks the stand's owner out until the next reset.

### 1.3 The only two commands

```bash
npm run demo:prepare -- --confirm-local-reset
npm run dev
```

`demo:prepare` prints the validated local origin, warns that local data will be replaced, runs a
clean `supabase db reset`, creates the identities, the two projects, access, and the full system and
project referential catalogue, then runs its own preflight and prints one `PASS check=…` line per
contract check. It exits non-zero if any check fails.

### 1.4 Optional safe verification

```bash
npm run demo:check
```

Read-only. It performs no insert, update, delete, RPC or auth mutation, and may be re-run at any
time — before the demo, in the middle of it, or after. It is the correct way to answer "is the
stand still what I think it is?" Its per-check output uses the same `PASS`/`FAIL` format.

### 1.5 What a second `demo:prepare` costs you

`demo:prepare` is **reset-based, not incremental**. Running it again destroys every result of the
rehearsal — the import, all fabrication and NDE evidence, erection, tracking, flange progress, the
Test Pack and its pressure-test history — and restores the known start state: rich referentials,
zero engineering definitions, zero operational outcomes. That is exactly what makes it the recovery
tool of last resort, and exactly why you must not run it "just to be safe" ten minutes before a
demo you have already rehearsed into a good state.

### 1.6 Start state you should see before speaking

- Two projects: `TRACK01-A` (golden) and `TRACK01-B` (sparse isolation control).
- `TRACK01-A` referential catalogue fully populated, including four deliberate lifecycle examples
  that the golden path never selects: inactive subcontractor `LEGACY-CONTRACTOR`, inactive
  procedure `WPS-LEGACY-04`, inactive location `OLD-YARD`, unassigned device `SCN-003`.
- No isometrics, no import jobs, no fabrication/NDE/erection/tracking/flange/Test Pack rows.

---

## 2. Timed story map

| # | Section | Time | Stable target | Visible checkpoint |
| --- | --- | ---: | --- | --- |
| 1 | Login, project, readiness | 2 min | `TRACK01-A` | active project in the top bar; both readiness gates green |
| 2 | Rich referentials | 3 min | Project Referential tabs | real rows plus the inactive/unassigned examples |
| 3 | SpoolGen-like four-file import | 5 min | `ISO-DEMO-1001`, `ISO-DEMO-2001` | 20 rows validated, 0 errors; R0 accepted; 3 spools / 5 welds / 5 BOM / 3 flanges / 2 supports |
| 4 | Fabrication and QC evidence | 7 min | `SP-DEMO-1001-A` | Start Fab, traces, two shop welds, support; QC Release visibly blocked by NDE |
| 5 | NDE, repair, and the QC release | 5 min | `WJ-DEMO-1001-01`, `WJ-DEMO-1001-02` | one accepted, one rejected → repair R1 accepted → spool QC released |
| 6 | Erection | 4 min | `SP-DEMO-2001-A` | To Site, field traces, Erected, Welded / Bolted, Supported, derived Ready for Test |
| 7 | Tracking and flange | 4 min | `SP-DEMO-1001-A`, `FLG-DEMO-1001-01` | current location + history; flange record with calculated UT |
| 8 | Test Pack to pre-commissioning | 7 min | `TP-DEMO-001` (member: `ISO-DEMO-2001` only) | Line Check + X punch, clearance, RFT · 12, blinding, testing, pre-commissioning |
| 9 | Reports and persistence | 3 min | XLSX + PDF | two files downloaded; refreshed screens keep their state |
| | **Total** | **40 min** | | |

Sections 4 and 5 are one continuous story on one spool: section 4 stops at a **blocked** QC Release
and section 5 unblocks it. Say so out loud, or the audience will think section 4 failed.

---

## 3. Personas

Passwords are entered interactively at the login form; they appear nowhere in this document.

| Role in the story | Email (from `scripts/demo/manifest.ts`) | Access on `TRACK01-A` | Used in sections |
| --- | --- | --- | --- |
| Project Admin | `track01.project-admin-a@example.test` | Project Admin (bypasses the functional-role gate) | 1, 2, 3, 9 |
| Quality / field editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer, NDE Inspector, Spooling Team, Fabrication Contributor, Erection Contributor, Tracking Operator | 4, 5, 6, 7, 8 |
| Read-only control | `track01.reader-qc@example.test` | Project Reader + QC Engineer | negative checks only (Task 12) |
| Platform admin | `track01.platform-admin@example.test` | platform admin; member of A and B | only if you want to show `/admin/system-referential` writes |

Why the switch at section 4: Project Admin can do everything, but the demo is more honest if the
operational evidence is recorded by the operational persona. Switch users with the avatar menu →
**Sign out** (top right), then sign in again.

**Project selection:** the top bar shows `TRACK01-A · PipeQC Demo Project` with a dropdown when the
signed-in user has more than one membership. `track01.qc-editor@example.test` has exactly one
membership, so its top bar shows the project as static text — that is correct, not a fault.

---

## 4. Section 1 — Login, active project, readiness (2 min)

**Narration**
1. "I signed in as the project administrator and PipeQC put me straight into the demo project."
2. "Before anyone imports a single drawing, the system already tells us whether this project is
   configured well enough to accept engineering data — configuration is a gate, not a wish."

**S1.1 — Sign in**
- Route: `http://localhost:3000`
- Persona: `track01.project-admin-a@example.test`
- Controls: **Email**, **Password**, **Sign in** (card title *Sign in to PipeQC*)
- Expected: the shell loads; the top bar shows `TRACK01-A · PipeQC Demo Project`; the left sidebar
  shows the sections the role is allowed to see: SETUP, PREPARATION, CONSTRUCTION, REPORTS,
  TESTING, CONFIGURATION.
- If the sidebar is collapsed to icons, expand it with the **Toggle Sidebar** control at the far
  left of the top bar (it also serves as the tooltip text). Typing a route into the address bar is a
  recovery path, not the demonstration.

**S1.2 — Show readiness (read-only, no mutation)**
- Route: `/admin/project-referential`
- Persona: Project Admin · project `TRACK01-A`
- Controls: the **Project Setup Readiness** card at the top of the page
- Expected: badge **Gate B: Ready for Import** and badge **Gate C: Referential Complete**, both
  green, plus the line "All project referential requirements are satisfied. The project is ready for
  engineering imports and execution."
- Hard refresh checkpoint: `Cmd+Shift+R`. Both badges must come back green — the panel is computed
  from database rows, not from page state.
- If a badge is amber: **stop the walkthrough**. The stand is not the prepared start state. Run
  `npm run demo:check` in the terminal and read which check failed. Do not "fix" referentials by
  hand during a demo.

---

## 5. Section 2 — The rich referentials (3 min)

**Narration**
1. "This is the project's master data — subcontractors, welding procedures, welders, NDE rules,
   materials, teams, systems, locations, coating rules, devices."
2. "Every later screen is driven by these rows. Nothing in the demo is a hard-coded list, and
   retired records stay visible but unusable, which is how audits actually work."

**S2.1 — Tour four tabs (no mutation)**
- Route: `/admin/project-referential`
- Persona: Project Admin · project `TRACK01-A`
- Controls: the tab strip **General**, **Welding & Quality**, **Testpack & Tracking**,
  **Spooling & Painting**, **System Referentials**, **Progress Weights**
- What to show, and the point to make:

| Tab | Card | Rows worth naming | Point |
| --- | --- | --- | --- |
| General | *Project Subcontractors* | `FAB-A`, `NDE-A`, `LEGACY-CONTRACTOR` (inactive) | lifecycle, not deletion |
| General | *PDS Areas* | `PDS-100`, `PDS-200`, `PDS-300` | the geography every ISO lands in |
| Welding & Quality | *Welder Qualifications* | `WDR-001` … `WDR-004` | a welder is a qualification with an expiry, not a name |
| Welding & Quality | *NDE Matrix Rules* | `SC-CS150`/`BW`/shop RT 100 %, `SC-CS150`/`BW`/field RT 0 % | the shop/field asymmetry that drives section 5 |
| Welding & Quality | *Piping Material List (PML)* | `ID-DEMO-100` … `ID-DEMO-500` | heat numbers are evidence, not free text |
| Testpack & Tracking | *Project Teams*, *Locations* | `LC-TEAM-A`, `FINISH-A`, `BLIND-TEAM-A`, `BOLT-TEAM-A`; `FAB-SHOP`, `LAYDOWN-A`, `OLD-YARD` (inactive) | teams and places used later |
| System Referentials | material types, UT rules | `CS`, `SS316`, `DSS`; 4–8 in / `150#` | cross-project rules the flange UT calculation reads |

- Expected: populated tables, each row a real database row; the inactive rows are rendered with a
  status badge and are not offered in the operational drop-downs later.
- Hard refresh checkpoint: none needed — this section performs no mutation. If a table is empty,
  the stand is wrong; see `demo:check`.
- The **Welding Procedures (WPS)** editor sits in its own card below the tabs on the same page:
  `WPS-CS-GTAW-01`, `WPS-CS-SMAW-02`, `WPS-SS-GTAW-03` active and `WPS-LEGACY-04` inactive.

---

## 6. Section 3 — The four-file SpoolGen-like import (5 min)

**Narration**
1. "I uploaded the four engineering export files a 3D piping and spooling system produces, and
   PipeQC validated them against this project's own rules before writing anything."
2. "This is the hand-off point between engineering and construction: from here on, every weld,
   flange, support and material line is a tracked object with a revision."

**Say this explicitly, because it is the most common misunderstanding:** these files are the
*structured output* of a SpoolGen-like 3D piping/spooling system — isometrics, spools, weld joints,
bolt/flange definitions, supports, bill of materials. **PipeQC does not display and does not import
native 3D geometry in this release.** There is no model viewer, and no PCF/RVM/NWD import.

**S3.1 — Attach and validate the four files**
- Route: `/spooling/import`
- Persona: `track01.project-admin-a@example.test` · project `TRACK01-A`
- Controls (literal, in order): **Upload weld.txt**, **Upload trace.txt**, **Upload bolt.txt**,
  **Upload supp.txt**, then **Validate files**. The card header is *SpoolGen import* with a badge
  that reads `4 of 4 files` once all four are attached.
- Files: `demo-data/spoolgen/weld.txt`, `demo-data/spoolgen/trace.txt`,
  `demo-data/spoolgen/bolt.txt`, `demo-data/spoolgen/supp.txt`
- Business content of the package: `ISO-DEMO-1001/R0` (`PDS-100`, `SC-CS150`, line `P-1001`, spools
  `SP-DEMO-1001-A` and `SP-DEMO-1001-B`) and `ISO-DEMO-2001/R0` (`PDS-200`, `SC-CS150`, line
  `P-2001`, spool `SP-DEMO-2001-A`).
- Expected durable result: an import job is created, the four files are uploaded and registered with
  their checksums, and the success toast reads **"Validated 20 rows: 0 errors, 0 warnings."**
  (20 staging rows = 2 isometrics + 3 spools + 5 weld joints + 5 material lines + 3 flange joints +
  2 supports. Zero warnings is expected because `WPS-CS-GTAW-01` covers 1–24 in and 2–30 mm, so no
  joint raises the `SRV_WPS_MISSING` warning.)
- If the toast reports blockers: do not re-click. Read the issue list rendered under the card, then
  see §14 Recovery.

**S3.2 — Apply the first revision**
- Route: `/spooling/import` (the *Revision decisions* card below the import card)
- Persona: Project Admin · project `TRACK01-A`
- Controls: **Apply import**
- Values: none. This is the first revision of both ISOs, so every preview row is `New` and its
  Decision cell reads `Not required` — decisions are only demanded when an existing ISO is revised.
- Expected durable result: a success toast **"Applied N definition rows."** The number counts the
  isometric, spool, weld-joint, support and flange-joint revision rows written; material lines are
  inserted in bulk and are not part of that count, so do not read it as "20". Both R0 revisions move
  to `accepted`.
- Hard refresh checkpoint: after §S3.3.

**S3.3 — Prove it landed**
- Route: `/spooling/browse`
- Persona: Project Admin · project `TRACK01-A`
- Controls: the *Isometrics* list, then the *Revision history* and *Spools* cards
- Expected: `ISO-DEMO-1001` and `ISO-DEMO-2001` in the Isometrics list, each with badge `R0`;
  selecting one auto-selects its accepted revision (status badge `accepted`); the Spools card shows
  `SP-DEMO-1001-A` with welds `WJ-DEMO-1001-01, WJ-DEMO-1001-02`, support `SUP-DEMO-1001-01`, flange
  joints `FLG-DEMO-1001-01, FLG-DEMO-1001-02` and ident codes `ID-DEMO-100, ID-DEMO-200`.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/spooling/browse`, then re-select `ISO-DEMO-1001`. The
  accepted R0 and its children must return unchanged.

---

## 7. Section 4 — Fabrication evidence on `SP-DEMO-1001-A` (7 min)

Switch persona now: sign out and sign in as `track01.qc-editor@example.test`.

**Narration**
1. "I started fabrication on one spool, recorded which heat of material actually went into it, and
   recorded who welded each joint under which procedure."
2. "Quality release is not a button somebody presses when they feel ready — the system refuses it
   until material, welds, supports and examinations are all satisfied."

Everything in this section is on **one physical object**: isometric `ISO-DEMO-1001`, spool
`SP-DEMO-1001-A`. Spool `SP-DEMO-1001-B` is deliberately left untouched.

**S4.1 — Record Start Fab**
- Route: `/fabrication/material-check`
- Persona: `track01.qc-editor@example.test` · project `TRACK01-A`
- Controls: the *Spools* picker (filter box **Filter by ISO or spool number**), then **Date**, then
  **Record Start Fab**
- Values: filter `SP-DEMO-1001-A`, select it; leave **Date** at today
- Expected durable result: toast **"Start Fab recorded."**; the stage timeline card
  `ISO-DEMO-1001 / SP-DEMO-1001-A (R0)` gains a Start Fab date and the button becomes disabled.

**S4.2 — Record the material traces**
- Route: `/fabrication/material-check` (same screen, *Material traceability* card)
- Persona: qc-editor · project `TRACK01-A`
- Controls: the **Heat / trace number** input on each row, then **Record traces**
- Values (these must match the project's PML exactly, or the database refuses the row):
  - `ID-DEMO-100` → `HEAT-100-A`
  - `ID-DEMO-200` → `HEAT-200-A`
- Expected durable result: toast **"Material traces recorded."**; the timeline shows Material Check
  as reached. The screen states the rule under the button: Material Check is derived, it appears
  once every ident code carries a trace number the PML accepts.
- The **Issue QC-13** button on this screen is optional colour for the story; the demo does not
  require it and nothing downstream depends on it.

**S4.3 — Record the first shop weld**
- Route: `/fabrication/weld-progress`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Spools* picker → the *Shop weld joints* table row → the *Record …* card fields
  **Subcontractor**, **WPS**, **Root welder**, **Cap welder**, **Root percent**, **Weld date**, then
  **Record weld progress**
- Values: spool `SP-DEMO-1001-A`; joint `WJ-DEMO-1001-01` (BW, 6 in, 8.2 mm); Subcontractor
  `FAB-A — Primary fabrication contractor`; WPS `WPS-CS-GTAW-01`; Root welder `WDR-001`; Cap welder
  `WDR-004`; Root percent `50`; Weld date today
- Expected durable result: toast **"Weld WJ-DEMO-1001-01 recorded."**; the row gains its WPS,
  welders and weld date, and the NDE column changes from `0/0` to `1/1` — the RT obligation the NDE
  matrix demands for a shop butt weld in `SC-CS150` was created by the weld record, not requested by
  anyone.
- Root and Cap must be two different welders; the screen states this and the database enforces it.

**S4.4 — Record the second shop weld**
- Route: `/fabrication/weld-progress`
- Persona: qc-editor · project `TRACK01-A`
- Controls: same as S4.3
- Values: joint `WJ-DEMO-1001-02` (SW, 4 in, 6.0 mm); Subcontractor `FAB-A`; WPS `WPS-CS-GTAW-01`;
  Root welder `WDR-001`; Cap welder `WDR-004`; Root percent `50`; Weld date today
- Expected durable result: toast **"Weld WJ-DEMO-1001-02 recorded."**; this joint's obligation is
  **PT**, not RT, because the matrix rule for a socket weld in the shop says so.

**S4.5 — Record the support, and hit the QC gate deliberately**
- Route: `/fabrication/qc-release`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Spools* picker → **Release date** → the *Supports* card button **Mark installed** →
  then look at (do not force) **QC release spool**
- Values: spool `SP-DEMO-1001-A`; support `SUP-DEMO-1001-01`; Release date today
- Expected durable result: toast **"Support installation recorded."**; the *NDE obligations* card
  lists `WJ-DEMO-1001-01` (RT) and `WJ-DEMO-1001-02` (PT) with disposition `pending`; **QC release
  spool is disabled** and the red gate line reads that NDE obligations are still outstanding.
- **This is the intended end of section 4.** Say it: "The system will not let me release this spool
  until the examinations exist and pass. Let's go and do them."
- Hard refresh checkpoint: `Cmd+Shift+R` on `/fabrication/qc-release`, re-select `SP-DEMO-1001-A`.
  Start Fab, Material Check, both welds and the installed support must all still be there.

---

## 8. Section 5 — NDE, the repair cycle, and the release (5 min)

**Narration**
1. "I issued the examination batches, accepted one weld, rejected the other with a defect code, and
   the system created the mandatory 100 % repair cycle by itself."
2. "The rejection did not disappear when the repair passed — it closed out. That trail is what a
   client's quality auditor comes to look for."

Still the same physical object: `SP-DEMO-1001-A`, joints `WJ-DEMO-1001-01` (RT) and
`WJ-DEMO-1001-02` (PT).

**S5.1 — RT batch, accepted result**
- Route: `/nde`
- Persona: `track01.qc-editor@example.test` · project `TRACK01-A`
- Controls, in order: **Create Batch** → dialog *New NDE Batch* fields **NDT Method** and
  **Coverage regime** → **Create**; then in the *Batches* table row: the **Coverage percentage**
  input, **Allocate Candidates**, **Issue Batch**; then in the *NDE Obligations* table: **Record
  Result** → dialog fields **Outcome**, **Examined On**, **Report Number**, **Responsible welder** →
  **Save Result**
- Values: Method `RT (Radiographic Testing)`; Coverage regime the 100 % option; coverage percentage
  `100`; obligation `WJ-DEMO-1001-01`; Outcome `Accepted`; Examined On today; Report Number
  `RT-DEMO-001`; Responsible welder `WDR-001 — Alex Morgan`
- Expected durable results, in order: toasts **"NDE Batch created successfully"**, **"Candidates
  allocated to batch at 100% coverage"**, **"NDE Batch issued"**, **"Result recorded: accepted"**;
  the obligation's Disposition badge becomes `satisfied` and the weld progress record for that joint
  becomes locked.
- Only obligations whose disposition is `issued` offer a **Record Result** button. If the button is
  missing, the batch was not issued — check the batch Status column rather than clicking again.

**S5.2 — PT batch, rejected result**
- Route: `/nde`
- Persona: qc-editor · project `TRACK01-A`
- Controls: same sequence as S5.1, plus the **Defect code** select that appears when Outcome is
  `Rejected`
- Values: Method `PT (Penetrant Testing)`; 100 % regime; coverage `100`; obligation
  `WJ-DEMO-1001-02`; Outcome `Rejected`; Examined On today; Report Number `PT-DEMO-001`; Defect code
  `LOF — Lack of fusion repair`; Responsible welder `WDR-001 — Alex Morgan`
- Expected durable result: toast **"Result recorded: rejected"**; the original obligation shows
  disposition `rejected`, and a **new** obligation appears for the same joint with cycle badge
  `repair (R1)`, method PT, coverage 100 %. No tracer obligations are expected here, because no
  other joint in this project carries a PT obligation yet.
- A rejected result cannot be saved without a defect code; the dialog blocks the button and the
  database refuses it.

**S5.3 — Examine and accept the repair**
- Route: `/nde`
- Persona: qc-editor · project `TRACK01-A`
- Controls: **Create Batch** (PT, 100 %) → **Allocate Candidates** (`100`) → **Issue Batch** →
  **Record Result** on the `repair (R1)` obligation → **Save Result**
- Values: Outcome `Accepted`; Examined On today; Report Number `PT-DEMO-002`; Responsible welder
  `WDR-001 — Alex Morgan`
- Expected durable result: toast **"Result recorded: accepted"**; the R1 obligation becomes
  `satisfied` **and** the original rejected obligation becomes `superseded` — an accepted repair
  closes out the cycle it repaired. Nothing on `SP-DEMO-1001-A` is left outstanding.
- Explain the model honestly: PipeQC records the repair as a new mandatory 100 % examination cycle
  on the same joint. It does not require a second weld-progress entry for the demo to proceed.

**S5.4 — Release the spool**
- Route: `/fabrication/qc-release`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Spools* picker → **Release date** → **QC release spool**
- Values: spool `SP-DEMO-1001-A`; Release date today
- Expected durable result: **QC release spool** is now enabled and the red gate line is gone; toast
  **"The spool is QC released."**; the stage timeline shows QC Release with today's date and the
  button disables itself.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/fabrication/qc-release` and on `/fabrication/dashboard`
  — the spool's stage in the dashboard table must survive the reload.

---

## 9. Section 6 — Erection on `SP-DEMO-2001-A` (4 min)

**Say the handover explicitly: this is a different physical spool.** Sections 4–5 were the shop
story on `ISO-DEMO-1001` / `SP-DEMO-1001-A`. Section 6 is the field story on `ISO-DEMO-2001` /
`SP-DEMO-2001-A`, which has no shop welds at all — its two joints are field joints, which is why it
is the spool that reaches the pressure-test package quickly.

**Narration**
1. "The second spool arrived at site, its material was re-verified in the field, it was erected,
   its field joints were welded and its permanent supports were installed."
2. "Ready for Test is never typed in by anyone — it is calculated from that evidence, which is why a
   test package cannot be quietly declared ready."

**S6.1 — To Site**
- Route: `/erection/to-site`
- Persona: `track01.qc-editor@example.test` · project `TRACK01-A`
- Controls: *Field spools* picker (filter **Filter by ISO or spool number**) → **Date To Site
  happened** → **Record To Site**
- Values: spool `SP-DEMO-2001-A`; date today
- Expected durable result: toast **"To Site recorded for SP-DEMO-2001-A."**; the stage badges at the
  top of the card show `To Site` filled with today's date.

**S6.2 — Field material check**
- Route: `/erection/material-check`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Field spools* picker → **Date checked** → the **Heat / trace number** inputs →
  **Record field traces**
- Values: `ID-DEMO-400` → `HEAT-400-A`; `ID-DEMO-500` → `HEAT-500-A`; date today
- Expected durable result: toast **"Field material traces recorded."**; the line above the table
  changes to `2/2 lines carry accepted evidence`.

**S6.3 — Erected**
- Route: `/erection/erected`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Field spools* picker → **Date Erected happened** → **Record Erected**
- Values: spool `SP-DEMO-2001-A`; date today
- Expected durable result: toast **"Erected recorded for SP-DEMO-2001-A."**
- The stage order is enforced server-side: To Site → Erected → Welded / Bolted → Supported. If you
  try one out of order the screen names the missing predecessor instead of failing silently.

**S6.4 — Field joints and the Welded / Bolted milestone**
- Route: `/erection/welded-bolted`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Field spools* picker → the *Field joints* table row → **Subcontractor**, **WPS**,
  **Root welder**, **Cap welder**, **Root percent**, **Weld date** → **Record field weld progress**;
  then the *Record Welded / Bolted* card: **Date Welded / Bolted happened** → **Record Welded /
  Bolted**
- Values: joint `WJ-DEMO-2001-01` (BW, 6 in, 8.2 mm); Subcontractor `FAB-A — Primary fabrication
  contractor`; WPS `WPS-CS-GTAW-01`; Root welder `WDR-002`; Cap welder `WDR-003`; Root percent `50`;
  Weld date today. Repeat for `WJ-DEMO-2001-02` with the same values **if time allows**; then record
  the milestone with today's date.
- Expected durable results: toast **"Field weld WJ-DEMO-2001-01 recorded."** per joint, then toast
  **"Welded / Bolted recorded for SP-DEMO-2001-A."**
- Honest note: the field NDE matrix rule for `SC-CS150`/`BW`/field is 0 % coverage, so these joints
  create **no** NDE obligations. Ready for Test depends on the milestones and on zero outstanding
  NDE/PWHT, not on the joint count — recording the second joint makes the story complete and the
  Fabrication report richer, it does not change the gate. If you are behind schedule, record one
  joint and say that the second is identical.
- If `WDR-002`/`WDR-003` are not offered or are refused, use `WDR-001` and `WDR-004`: every welder
  in the catalogue belongs to `FAB-A`, and `WDR-001`/`WDR-004` are qualified for `WPS-CS-GTAW-01`.

**S6.5 — Supports and the Supported milestone**
- Route: `/erection/supported`
- Persona: qc-editor · project `TRACK01-A`
- Controls: *Field spools* picker → **Installation date** → the *Supports on this spool* row button
  **Record installed** → then **Date Supported happened** → **Record Supported**
- Values: support `SUP-DEMO-2001-01`; dates today
- Expected durable results: toast **"Support SUP-DEMO-2001-01 recorded as installed."**, then toast
  **"Supported recorded for SP-DEMO-2001-A."**

**S6.6 — Show the derived Ready for Test**
- Route: `/erection/rft`
- Persona: qc-editor · project `TRACK01-A`
- Controls: the *Field spool readiness* table (read-only by design — there is no release button)
- Expected: the row for `SP-DEMO-2001-A` shows Material `2/2`, Field supports `1/1`, Stage
  `Supported`, and RFT `Ready` with a date.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/erection/rft`. The Ready state must be re-derived from
  the database and look identical.

---

## 10. Section 7 — Tracking and flange (4 min)

**Narration**
1. "I recorded where the fabricated spool physically is, and I recorded the bolt-up of a flange
   joint with its jointing team and its calculated unit time."
2. "Location and torque are the two things a site loses first on paper, and both are now durable,
   attributable records rather than a WhatsApp message."

Tracking uses `SP-DEMO-1001-A` (the shop spool from sections 4–5). The flange work uses
`FLG-DEMO-1001-01`, which belongs to the same spool. This section does **not** touch
`ISO-DEMO-2001`.

**S7.1 — Arrival scan**
- Route: `/tracking/data-analysis`
- Persona: `track01.qc-editor@example.test` · project `TRACK01-A`
- Controls: tab **Spool Location** → the filter **Filter by ISO, spool, area or location** → click
  the spool row → **Add Event** → dialog *Add tracking event* fields **Direction**, **Location**,
  **Device**, **Occurred at**, **Reason** → **Save event**
- Values: spool `SP-DEMO-1001-A`; Direction `In`; Location `FAB-SHOP`; Device `No device`; Occurred
  at today, any time; Reason blank (optional for a non-manual event)
- Expected durable result: toast **"Tracking event recorded"**; the spool row's Location column
  changes from `Not scanned` to `FAB-SHOP`, and the `SP-DEMO-1001-A history` card lists the event.
- Why Device is `No device`: the device drop-down is built from recorded scans, so on a fresh stand
  it is empty. The three scanners (`SCN-001`, `SCN-002`, `SCN-003`) live in
  `/tracking/devices` — show them there instead of claiming a device on the first scan.

**S7.2 — Departure**
- Route: `/tracking/data-analysis`
- Persona: qc-editor · project `TRACK01-A`
- Controls: same dialog via **Add Event**
- Values: Direction `Out`; Location `FAB-SHOP`; Occurred at later the same day
- Expected durable result: toast **"Tracking event recorded"**; the Location column now reads
  `In transit`. A departure is only accepted from the location the spool is actually at.

**S7.3 — Arrival at the laydown**
- Route: `/tracking/data-analysis`
- Persona: qc-editor · project `TRACK01-A`
- Controls: same dialog via **Add Event**
- Values: Direction `In`; Location `LAYDOWN-A`; Occurred at after S7.2
- Expected durable result: Location `LAYDOWN-A`, three rows in the history card, and on `/tracking`
  the *Location occupancy* table shows `LAYDOWN-A 1 / …`.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/tracking/data-analysis`, reselect the spool: three
  history rows and the current location must return.
- If a scan is refused, read the message before retrying: an arrival requires the spool to be in
  transit and a departure requires it to be at the stated location. Re-clicking will not help.

**S7.4 — Flange bolt-up**
- Route: `/erection/flange-progress` (this is the operating screen; `/flange` renders the same
  worklist in **browse** mode with no form — use it only to show the read-only view)
- Persona: qc-editor · project `TRACK01-A`
- Controls: the *Flange worklist* row → **Joint category**, **Torquing requirement**, **Jointing
  value**, **Joint date**, **Report number**, **Tag number**, the **Jointers** checkbox group →
  **Record flange progress**
- Values: flange `FLG-DEMO-1001-01` (`ISO-DEMO-1001 / SP-DEMO-1001-A`, rating `150#`, 6 in); Joint
  category `X — Complete before hydrostatic pressure testing`; Torquing requirement
  `MANUAL-TORQUE — Calibrated manual torque wrench`; Jointing value `8`; Joint date today (a future
  date is refused); Report number `FR-DEMO-001`; Tag number `TAG-DEMO-001`; Jointers
  `BOLT-TEAM-A — Flange jointing team`
- Expected durable result: toast **"Flange progress recorded."**; the worklist row's Status badge
  becomes `completed` and its **UT** column shows `30` — the server multiplies the project's
  `FLANGE_JOINTING` unit time (10.0) by the system UT rule for 4–8 in / `150#` (2.0 × 3.0) by the
  joint category coefficient (0.5). The *History* card gains an append-only row.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/erection/flange-progress`; the `completed` status, the
  UT value and the history row must all return.
- Note for the audience: the category is chosen **here, when the joint is recorded**. It is not
  carried in the imported flange definition. That choice is what later decides whether a joint needs
  reinstatement after the test (see §13).

---

## 11. Section 8 — Test Pack `TP-DEMO-001` to pre-commissioning (7 min)

**Narration**
1. "I built the test package for the completed line, ran the line check, raised and cleared a punch
   item, and took the pack through blinding, testing and pre-commissioning."
2. "Ready for Test at package level is an aggregate: one open Category X punch on one isometric is
   enough to hold the whole package, which is exactly the argument a commissioning manager needs."

### 11.1 The membership decision — read this before you click

`TP-DEMO-001` contains **exactly one isometric: `ISO-DEMO-2001`.**

Do **not** add `ISO-DEMO-1001` to this pack:

- it carries three flange joints (`FLG-DEMO-1001-01/02/03`), and package readiness requires every
  flange on a member isometric to have effective progress;
- it carries shop welds with RT/PT prerequisites on **both** its spools, and `SP-DEMO-1001-B` is
  deliberately left untouched by this walkthrough;
- pack readiness is aggregated over **all** members, so a single unfinished member blocks the whole
  pack.

Adding it would stall the RFT spine mid-demo with no way to recover inside the time budget. If you
want to show that aggregation rule, show it as a sentence, not as a click.

### 11.2 Business selectors, not identifiers

Every reference field in the Builder is a drop-down of business codes rendered as `CODE · description`.
The UI submits internal UUIDs to the server, but the presenter never sees, types or reads a UUID
here. Where the pressure-test worklists do print a raw identifier (see S8.3 and S8.4), say so
plainly — it is a known rough edge, not a hidden data source.

**S8.1 — Create the pack and compose it**
- Route: `/testpack/builder`
- Persona: `track01.qc-editor@example.test` · project `TRACK01-A`
- Controls: **New Test Pack** → the *Create Test Pack* form → the *Available accepted ISOs* card
  checkbox → **Create and compose**
- Values — the form's text fields are labelled with their field names:
  - `testPackNumber` = `TP-DEMO-001`
  - `location` = `TEST-AREA`
  - `priority` = `Normal`
  - `plannedStartOn` = today
  - `plannedEndOn` = today or later (an earlier end date is refused)
  - `pressure` = `10`
  - `volumeM3` = leave empty (the only optional field)
  - `medium` = `Hydro`
  - **System** = `SYS-UTILITIES · Plant utilities piping system`
  - **Subsystem** = `SUB-AIR · Plant air subsystem` (the Subsystem list stays empty and reads
    *Select a System first* until a System is chosen — a dependency worth pointing out)
  - **Service class** = `SC-CS150 · Carbon steel class 150 piping`
  - **Line service** = `AIR · Plant air service`
  - *Available accepted ISOs*: tick **`ISO-DEMO-2001`** only. It will be labelled `Blocked` at this
    moment — correct, because its line check has not happened yet. Leave `ISO-DEMO-1001` unticked.
- Expected durable result: the green notice **"Test Pack created and selected ISOs composed
  atomically."**; the pack appears in the left *Test Packs* list as `TP-DEMO-001` with `rev 1 · 1
  ISO`, and the *Current ISO members* card lists `ISO-DEMO-2001`.
- The **Add selected ISOs** button is the same operation for an already-selected pack; use it only
  if the compose step did not take.

**S8.2 — Assign the Line Check**
- Route: `/testpack/pressure-test/line-check/preparation`
- Persona: qc-editor · project `TRACK01-A`
- Controls: **Test Pack**, **Team**, **Assigned date**, the *ISO targets* checkbox, then **Assign
  request**; afterwards the link **Open progress**
- Values: Test Pack `TP-DEMO-001 · rev 1`; Team `LC-TEAM-A · Line check team`; Assigned date today;
  target `ISO-DEMO-2001`
- Expected durable result: a request is created and the printable-request link appears; the request
  number is `LC-000001` on a fresh stand.

**S8.3 — Complete the Line Check and raise a Category X punch**
- Route: `/testpack/pressure-test/line-check/progress?testPackId=…` (reached with **Open progress**)
- Persona: qc-editor · project `TRACK01-A`
- Controls: the worklist row's date input, **Punch code (optional)**, **Punch description**, then
  **Complete Line Check**
- Values: date today; **Punch code** = `X-DEMO · Category X punch raised during Line Check`;
  description `Support bracket missing at the tie-in`
- Expected durable result: the green notice **"Line Check result saved; readiness projection
  reloaded."**; the row flips from `Open` to `Completed`; a punch item numbered `X-000001` now
  exists against `ISO-DEMO-2001`.
- Honest note: this worklist row prints `LC-000001 · ISO <uuid>`. The UUID is the internal isometric
  id; with a single member there is no ambiguity, and the business identity you quote is the request
  number and the pack.

**S8.4 — Assign and record the item clearance**
- Route: `/testpack/pressure-test/item-clearance/preparation`, then
  `/testpack/pressure-test/item-clearance/progress`
- Persona: qc-editor · project `TRACK01-A`
- Controls: **Test Pack**, **Team**, **Assigned date**, the *Punch item targets* checkbox, **Assign
  request**; then on the progress screen **Event date** and **Clear**
- Values: Test Pack `TP-DEMO-001`; **Team** = `FINISH-A · Punch item finishing team`; Assigned date
  today; target the row beginning `X-000001`; Event date today
- Expected durable results: request `IC-000001` is created; then the green notice **"Punch clearance
  saved; readiness projection reloaded."** and the row shows `Cleared`.

**S8.5 — Show that the pack turned Ready For Test**
- Route: `/testpack`
- Persona: qc-editor · project `TRACK01-A`
- Controls: the *Ready for Test* tile and the *Release backlog* list
- Expected: `TP-DEMO-001` now reads **`RFT · 12`** instead of `Blocked · X 1`, and the *Ready for
  Test* count is 1. Optional detail: `/testpack/explorer?testPackId=…` → tab **Release Tracking**
  shows `NDE pending 0`, `Line Check pending 0`, `Open X 0`.
- Hard refresh checkpoint: `Cmd+Shift+R` on `/testpack`; the pack must still read `RFT · 12`.

**S8.6 — Blinding**
- Route: `/testpack/pressure-test/blinding/preparation`, then
  `/testpack/pressure-test/blinding/progress`
- Persona: qc-editor · project `TRACK01-A`
- Controls: **Test Pack**, **Team**, **Assigned date**, **Assign request**; then **Event date** and
  **Complete blinding**
- Values: Test Pack `TP-DEMO-001`; **Team** = `BLIND-TEAM-A · Isolation blinding team`; dates today.
  The target checkbox is intentionally disabled for blinding — the target *is* the pack.
- Expected durable results: request `BL-000001`; then the green notice **"Blinding completion
  saved."** and the row shows `Completed`.
- The server refuses a blinding assignment on a pack that is not RFT, which is why S8.5 comes first.

**S8.7 — Testing and pre-commissioning**
- Route: `/testpack/pressure-test/testing-precomm`
- Persona: qc-editor · project `TRACK01-A`
- Controls: **Event date**, then the single row button, which relabels itself after each event:
  **Start testing** → **Complete testing** → **Complete pre-commissioning**
- Values: Event date today for each of the three events (dates must not go backwards)
- Expected durable results: green notices **"testing_started saved."**, **"testing_completed
  saved."**, **"precommissioning_completed saved."**; the row finally reads `Complete`.
- The row is identified as `Test Pack <uuid>` on this screen — with one pack in the project there is
  no ambiguity, and this is the same rough edge noted in S8.3.
- Hard refresh checkpoint: `Cmd+Shift+R`; the row must still read `Complete`.

---

## 12. Section 9 — Reports and persistence (3 min)

**Correction to earlier documentation:** Reports is **not** a placeholder and is not hidden. It is a
capability-gated sidebar entry — section **REPORTS** → item **Reports**, route `/reports` — visible
to any member with `reports.view`. If the sidebar is collapsed to icons, expand it with **Toggle
Sidebar** in the top bar or hover the icon for its tooltip; typing `/reports` into the address bar
is a recovery path, not the demonstration. (The home page card *Reports & Forms* still carries a
stale `Track 11` badge; see §16.)

**Narration**
1. "I generated the two current reports straight from the data we produced in the last half hour."
2. "The figures in these files are not a snapshot someone maintains by hand — they are the same
   projections the screens read, exported at the moment I clicked."

**S9.1 — Fabrication Progress XLSX**
- Route: `/reports`
- Persona: `track01.project-admin-a@example.test` (or the qc-editor; both hold `reports.view`) ·
  project `TRACK01-A`
- Controls: the card **Fabrication Progress** (subtitle *Project snapshot of completed weld progress
  and NDE workload*, line `RPT-F-001 · XLSX`) → the button, which renders as **Download XLSX**
- Expected durable result: a browser download named
  `TRACK01-A-fabrication-progress-<YYYY-MM-DD>.xlsx`, and the green line **"File downloaded from the
  current project snapshot."** Content expectation: one row per weld joint in the project — the five
  `WJ-DEMO-*` joints — carrying spool number, weld location, WPS code, welder codes, weld date and
  the NDE pending/total counts.

**S9.2 — Test Pack RFT Pursuit PDF**
- Route: `/reports`
- Persona: same · project `TRACK01-A`
- Controls: the card **Test Pack RFT Pursuit** (line `RPT-T-001 · PDF`) → the button, which renders
  as **Download PDF**
- Expected durable result: a download named
  `TRACK01-A-test-pack-rft-pursuit-<YYYY-MM-DD>.pdf`. Content expectation: one row for
  `TP-DEMO-001` with its lifecycle, RFT state and the outstanding-blocker counts, all zero after
  section 8.
- Open both files in a spreadsheet viewer and a PDF viewer respectively. **This runbook does not
  claim either file has been opened yet** — proving that they open cleanly and carry `TRACK01-A`
  data is a Task 12 gate (§17).
- The page states its own limit under the cards: Demo Lite creates browser downloads only; it keeps
  no document history, snapshots or handover artifacts. Say that rather than letting someone assume
  a dossier feature exists.

**S9.3 — Persistence close**
- Routes, in order: `/spooling/browse`, `/fabrication/qc-release`, `/erection/rft`, `/testpack`
- Persona: any of the two · project `TRACK01-A`
- Action: hard refresh (`Cmd+Shift+R`) each one
- Expected: accepted R0 revisions; `SP-DEMO-1001-A` QC released; `SP-DEMO-2001-A` Ready;
  `TP-DEMO-001` `RFT · 12`. Nothing in this demo lived in browser state.

---

## 13. Extended branch — reinstatement (not part of `TP-DEMO-001`)

**This branch is deliberately outside the 40-minute walkthrough, and this runbook does not claim it
has been executed or tested.** Describe it verbally unless you have rehearsed it with extra time.

What it would require, from source:

1. Reinstatement targets are flange joints whose **recorded** joint category is `Y` or `Z`. The
   category is chosen when flange progress is recorded (S7.4), not carried by the imported flange
   definition — an imported flange has no category until somebody takes responsibility for one.
2. The reinstatement preparation screen only offers flanges that belong to an isometric **in the
   selected pack**. All three demo flanges are on `ISO-DEMO-1001`, so a reinstatement demo needs a
   pack that contains `ISO-DEMO-1001`.
3. A pack containing `ISO-DEMO-1001` is only usable once **that whole isometric** is ready: both
   spools, every shop weld with its RT/PT cycle satisfied, every support installed, and **all three**
   flange joints carrying effective progress.
4. Only then does the canonical order apply: RFT → Blinding → Testing → Y reinstatement →
   Pre-commissioning → Z reinstatement (the sentence is printed on `/testpack/pressure-test`).

Routes and controls if you do run it: `/testpack/pressure-test/reinstatement/preparation` (**Team** =
`REINSTATE-TEAM-A · System reinstatement team`, tick the `Y · FLG-DEMO-…` targets, **Assign
request** → `RI-000001`), then `/testpack/pressure-test/reinstatement/progress` (date, **Report
number**, jointer team, **Tag number**, **Record joint**).

---

## 14. Recovery rules

1. **Ambiguous mutation — refresh and inspect, never auto-retry.** If a click produced no toast, or
   you are not sure whether it landed: hard refresh the screen and read the durable state (the stage
   timeline, the disposition badge, the worklist row, the history card). Only act on what the
   refreshed screen says. Most commands here are idempotency-keyed per click, so a blind second
   click is at best noise and at worst a second business event with a different date.
2. **Read the refusal.** Blocked buttons and red gate lines state the missing prerequisite in
   business terms ("Record Start Fab before recording material traces", "2 NDE obligations are still
   outstanding", "Record Erected before Welded / Bolted"). The refusal is the answer; satisfy it
   rather than working around it.
3. **Never repair state from outside the UI.** No SQL, no Supabase Studio, no service-role script,
   no direct table edit. If the state cannot be reached through the UI, the rehearsal is over — see
   rule 5.
4. **Stand doubts — run the read-only check.** `npm run demo:check` in a second terminal answers
   "is the stand still the prepared start state?" without changing anything. It is safe mid-demo.
5. **Polluted or unrecoverable rehearsal — re-prepare.** Stop the dev server if it is running, then:

   ```bash
   npm run demo:prepare -- --confirm-local-reset
   npm run dev
   ```

   This destroys the rehearsal and restores the start state (§1.5). Budget for a full re-run of the
   walkthrough afterwards; nothing carries over.
6. **`demo:prepare` fails at the `users` stage immediately after a reset.** The reset restarts the
   local containers and the auth service may not be listening yet. Re-run the same command; this is
   a known race, not a defect.
7. **Blank screens saying "Select a project".** The user has no membership on the project you think
   is active. Check the top bar, or you are signed in as the wrong persona.
8. **Use `localhost:3000`, not `127.0.0.1:3000`.** The dev server treats the latter as a cross-origin
   dev resource and the shell can hang at "Loading PipeQC…".

---

## 15. Object continuity — do not mix these up

One line per section, so the presenter never claims two unrelated records are the same steel.

| Section | Isometric | Spool | Weld joints | Flange | Test Pack |
| --- | --- | --- | --- | --- | --- |
| 3 Import | `ISO-DEMO-1001`, `ISO-DEMO-2001` (both R0) | all three | all five defined | all three defined | — |
| 4 Fabrication | `ISO-DEMO-1001` | `SP-DEMO-1001-A` | `WJ-DEMO-1001-01` (BW/RT), `WJ-DEMO-1001-02` (SW/PT) | untouched | — |
| 5 NDE + release | `ISO-DEMO-1001` | `SP-DEMO-1001-A` | same two joints, plus the `repair (R1)` cycle on `WJ-DEMO-1001-02` | untouched | — |
| 6 Erection | `ISO-DEMO-2001` | `SP-DEMO-2001-A` | `WJ-DEMO-2001-01`, `WJ-DEMO-2001-02` (field, 0 % NDE) | none exist on this ISO | — |
| 7 Tracking | `ISO-DEMO-1001` | `SP-DEMO-1001-A` | — | `FLG-DEMO-1001-01` (category `X`) | — |
| 8 Test Pack | `ISO-DEMO-2001` **only** | `SP-DEMO-2001-A` | — | none | `TP-DEMO-001` |
| 9 Reports | both | all three | all five appear in the XLSX | — | `TP-DEMO-001` in the PDF |
| 13 Reinstatement (not run) | `ISO-DEMO-1001` | both its spools | all three shop joints | `Y`/`Z` categorised flanges | a different pack |

Never touched by this walkthrough: `SP-DEMO-1001-B`, `WJ-DEMO-1001-03`, `FLG-DEMO-1001-02`,
`FLG-DEMO-1001-03`, `SUP-DEMO-1001-01` beyond its shop installation, and the whole of `TRACK01-B`.

---

## 16. Source-audit appendix

Every route and literal label used above, with the file it was read from. This is what "static
source-verified" means in the status line.

| Route | Literal control / label quoted | Source |
| --- | --- | --- |
| `/` (login) | *Sign in to PipeQC*, **Email**, **Password**, **Sign in** | `components/auth/login-screen.tsx` |
| shell | **Toggle Sidebar**, project chip, **Sign out** | `components/ui/sidebar.tsx:277,289`, `components/pipeqc/top-nav.tsx` |
| sidebar | sections `SETUP`/`PREPARATION`/`CONSTRUCTION`/`REPORTS`/`TESTING`, item **Reports** → `/reports` | `config/navigation.ts:301-309` |
| route gating | `/reports` → `reports.view`; `/erection/flange-progress` → `flange.view`; `/testpack` → `testpack.view` | `config/route-capabilities.ts` |
| capability model | `project_admin` bypasses the functional gate; `qc_engineer` grants `testpack.manage`, `flange.manage` | `supabase/migrations/20260731090000_access_capability_catalog.sql` |
| `/admin/project-referential` | *Project Setup Readiness*, **Gate B: Ready for Import**, **Gate C: Referential Complete**; tabs **General**, **Welding & Quality**, **Testpack & Tracking**, **Spooling & Painting**, **System Referentials**, **Progress Weights**; card *Welding Procedures (WPS)* | `modules/project-setup/ui/setup-readiness-panel.tsx`, `modules/project-setup/ui/project-referential-screen.tsx:75-101`, `app/admin/project-referential/page.tsx` |
| `/spooling/import` | *SpoolGen import*, **Upload weld.txt** … **Upload supp.txt**, **Validate files**, toast `Validated N rows: X errors, Y warnings.` | `modules/engineering/ui/spooling-import-screen.tsx:32-43,126-128,196` |
| `/spooling/import` | *Revision decisions*, **Apply import**, toast `Applied N definition rows.`, `Not required` | `modules/engineering/ui/revision-workbench.tsx:101,171`, `modules/engineering/ui/revision-decision-table.tsx` |
| import validation | 20 staging rows; `SRV_WPS_MISSING` is a warning, never a blocker | `docs/superpowers/plans/2026-08-10-track-12-demo-release.md`, `supabase/migrations/20260803092000_spooling_import_apply.sql:669-686` |
| `/spooling/browse` | *Isometrics*, *Revision history*, *Spools*, `accepted` | `modules/engineering/ui/engineering-browser.tsx` |
| `/fabrication/material-check` | **Filter by ISO or spool number**, **Date**, **Record Start Fab**, **Issue QC-13**, **Heat / trace number**, **Record traces**, toasts `Start Fab recorded.` / `Material traces recorded.` | `modules/construction/ui/fabrication/material-check-screen.tsx:105,142,191,199,216,257`, `modules/construction/ui/fabrication/spool-picker.tsx:47` |
| PML enforcement | trace number must match an active `piping_material_records` row for the ident code | `supabase/migrations/20260804091000_material_traceability.sql:176-181` |
| `/fabrication/weld-progress` | *Shop weld joints*, **Subcontractor**, **WPS**, **Root welder**, **Cap welder**, **Root percent**, **Weld date**, **Record weld progress**, toast `Weld <n> recorded.` | `modules/construction/ui/fabrication/weld-progress-screen.tsx:139,167,220-296,304` |
| weld rules | two different welders; WPS range/subcontractor/date checks | `modules/construction/domain/weld-progress.ts` |
| obligations | created by a weld record from the NDE matrix; 0 % coverage creates none | `supabase/migrations/20260804092100_record_weld_progress.sql:316`, `supabase/migrations/20260807090000_nde_obligation_lifecycle.sql:58-87` |
| `/fabrication/qc-release` | **Release date**, **QC release spool**, *Supports* → **Mark installed**, *NDE obligations*, toasts `The spool is QC released.` / `Support installation recorded.` | `modules/construction/ui/fabrication/qc-release-screen.tsx:118,137,142,186,191,203` |
| release gate | material + welds + supports + zero NDE/PWHT pending | `modules/construction/domain/quality-release.ts` |
| `/nde` | **Create Batch**, *New NDE Batch*, **NDT Method**, **Coverage regime**, **Create**, **Coverage percentage**, **Allocate Candidates**, **Issue Batch**, **Record Result**, **Outcome**, **Examined On**, **Report Number**, **Defect code**, **Responsible welder**, **Save Result**; toasts `NDE Batch created successfully`, `Candidates allocated to batch at N% coverage`, `NDE Batch issued`, `Result recorded: <outcome>` | `modules/quality/ui/nde-batch-screen.tsx:143,160,171,209,247,255,270,284,366,376,383,465,493,505,514,524,545,570` |
| repair cycle | rejection derives a 100 % `repair` R1; an accepted repair supersedes its rejected ancestors | `supabase/migrations/20260809092000_nde_repair_supersedes_parent.sql:22-150,255-265` |
| `/erection/to-site`, `/erection/erected` | **Date <stage> happened**, **Record <stage>**, toast `<stage> recorded for <spool>.` | `modules/construction/ui/erection/erection-stage-card.tsx:68,73,81`, `app/erection/to-site/page.tsx`, `app/erection/erected/page.tsx` |
| stage order | To Site → Erected → Welded / Bolted → Supported, server-enforced | `supabase/migrations/20260810093000_erection_progress_commands.sql:43-53`, `modules/construction/domain/erection-stage.ts` |
| `/erection/material-check` | **Date checked**, **Record field traces**, `N/M lines carry accepted evidence` | `modules/construction/ui/erection/field-material-check-screen.tsx:124,148,234` |
| `/erection/welded-bolted` | *Field joints*, **Record field weld progress**, toast `Field weld <n> recorded.`, plus the *Record Welded / Bolted* card | `modules/construction/ui/erection/field-weld-progress-screen.tsx:189,218,369`, `app/erection/welded-bolted/page.tsx` |
| `/erection/supported` | *Supports on this spool*, **Installation date**, **Record installed**, toast `Support <n> recorded as installed.` | `modules/construction/ui/erection/field-support-progress-screen.tsx:86,110,132,176` |
| `/erection/rft` | *Field spool readiness*, `Ready`, no release control by design | `modules/construction/ui/erection/erection-readiness-screen.tsx`, `app/erection/rft/page.tsx` |
| RFT derivation | milestones + zero pending NDE/PWHT; never a stored flag | `supabase/migrations/20260811090000_erection_readiness_material_naming.sql:43-48` |
| `/tracking/data-analysis` | **Spool Location**, **Filter by ISO, spool, area or location**, **Add Event**, *Add tracking event*, **Direction**, **Location**, **Device**, **Occurred at**, **Reason**, **Save event**, toast `Tracking event recorded` | `modules/tracking/ui/tracking-data-analysis-screen.tsx` |
| scan ordering | departure requires presence at the location; arrival requires transit | `supabase/migrations/20260814092000_tracking_commands.sql:148-163` |
| device list | built from recorded scans (`tracking_device_usage`) | `supabase/migrations/20260814093000_tracking_read_models.sql:177-197` |
| `/erection/flange-progress` | *Flange worklist*, **Joint category**, **Torquing requirement**, **Jointing value**, **Joint date**, **Report number**, **Tag number**, **Jointers**, **Record flange progress**, toast `Flange progress recorded.` | `modules/flange/ui/flange-management-screen.tsx:85,107-111`, `app/erection/flange-progress/page.tsx` |
| `/flange` | same screen in `browse` mode, `canManage={false}` | `app/flange/page.tsx` |
| UT formula | `project_ut × coefficient_diameter × coefficient_rating × category coefficient` | `supabase/migrations/20260812092000_flange_progress_commands.sql:163-174`, `modules/flange/domain/ut-calculation.ts:62-69` |
| `/testpack/builder` | **New Test Pack**, *Create Test Pack*, fields `testPackNumber`/`location`/`priority`/`plannedStartOn`/`plannedEndOn`/`pressure`/`volumeM3`/`medium`, **System**, **Subsystem**, **Service class**, **Line service**, **Create and compose**, **Add selected ISOs**, *Current ISO members*, *Available accepted ISOs*, notice `Test Pack created and selected ISOs composed atomically.` | `modules/pressure-test/ui/test-pack-builder-screen.tsx:16-22,90,98,104` |
| option labels | `CODE · description`; teams render `code · description` | `modules/pressure-test/ui/test-pack-reference-model.ts:13-15`, `modules/pressure-test/ui/request-preparation-screen.tsx:31` |
| `/testpack/pressure-test/*/preparation` | **Test Pack**, **Team**, **Assigned date**, *<target> targets*, **Assign request**, **Open progress** | `modules/pressure-test/ui/request-preparation-screen.tsx:31` |
| `/testpack/pressure-test/*/progress` | **Event date**, *Server worklist*, **Complete Line Check**, **Punch code (optional)**, **Punch description**, **Clear**, **Complete blinding**, **Start testing**, **Complete testing**, **Complete pre-commissioning**, **Record joint** | `modules/pressure-test/ui/pressure-test-progress-screen.tsx:35` |
| request numbers | `LC-`/`IC-`/`BL-`/`RI-` + 6 digits; punch items `X-` + 6 digits | `supabase/migrations/20260813093000_line_check_punch.sql:136,175,207`, `supabase/migrations/20260813095000_pressure_test_workflow.sql:88,147` |
| pack readiness | aggregated over all members; blinding requires pack RFT; stage order enforced | `supabase/migrations/20260813094000_test_pack_readiness.sql`, `supabase/migrations/20260813095000_pressure_test_workflow.sql:80,117-121` |
| reinstatement eligibility | `requires_reinstatement` is `category_code in ('Y','Z')` from the recorded progress | `supabase/migrations/20260812093000_flange_revision_readiness.sql:196`, `supabase/migrations/20260813095000_pressure_test_workflow.sql:141` |
| `/testpack` | *Ready for Test*, *Release backlog*, `RFT · 12`, `Blocked · X n` | `modules/pressure-test/ui/test-pack-dashboard.tsx:52,54` |
| `/testpack/explorer` | tabs **General**, **Release Tracking**, … | `modules/pressure-test/ui/test-pack-explorer-screen.tsx:9` |
| `/reports` | *Fabrication Progress* (`RPT-F-001 · XLSX`), *Test Pack RFT Pursuit* (`RPT-T-001 · PDF`), button `Download {FORMAT}`, notice *File downloaded from the current project snapshot.*, the Demo-Lite limitation footer | `modules/documents/ui/reports-screen.tsx:95-109`, `modules/documents/domain/report.ts:54-71` |
| report filenames | `<projectCode>-<stem>-<YYYY-MM-DD>.<ext>` | `modules/documents/domain/report.ts:73-90` |
| report content | `weld_progress_summary` (all joints) and `test_pack_readiness` | `modules/documents/infrastructure/supabase-report-repository.ts` |
| personas, codes, teams, punch code, PML, locations, devices | every email, `SYS-*`, `SUB-*`, `SC-CS150`, `AIR`, `X-DEMO`, `FINISH-A`, `LC-TEAM-A`, `BLIND-TEAM-A`, `BOLT-TEAM-A`, `REINSTATE-TEAM-A`, `HEAT-*`, `ID-DEMO-*`, `FAB-SHOP`, `LAYDOWN-A`, `SCN-00x`, `WDR-00x`, `WPS-*` | `scripts/demo/manifest.ts` |
| package contents | `ISO-DEMO-1001`, `ISO-DEMO-2001`, spools, joints, flanges, supports, materials | `scripts/demo/manifest.ts` (`spoolgen.entities`), `demo-data/spoolgen/*.txt` |
| commands | `demo:prepare`, `demo:check` | `package.json`, `scripts/prepare-track12-demo.ts`, `scripts/check-track12-demo.ts` |

### Values verified against the manifest (not invented here)

`TRACK01-A`, `TRACK01-B`; the six account emails; `SYS-PROCESS`/`SYS-UTILITIES`;
`SUB-FEED`/`SUB-PRODUCT`/`SUB-AIR`; `SC-CS150`/`SC-SS300`; `PROCESS`/`AIR`/`WATER`;
`FAB-A`/`NDE-A`/`LEGACY-CONTRACTOR`; `PDS-100`/`PDS-200`/`PDS-300`;
`WPS-CS-GTAW-01`/`WPS-CS-SMAW-02`/`WPS-SS-GTAW-03`/`WPS-LEGACY-04`; `WDR-001`…`WDR-004`;
`ID-DEMO-100`…`ID-DEMO-500` with `HEAT-100-A`…`HEAT-500-A`; `POR`/`LOF`/`CRK`; joint categories
`X`/`Y`/`Z` with coefficient 0.5; `LC-TEAM-A`/`FINISH-A`/`BLIND-TEAM-A`/`REINSTATE-TEAM-A`/
`BOLT-TEAM-A`; `X-DEMO`; `FAB-SHOP`/`PAINT-SHOP`/`LAYDOWN-A`/`SITE-A`/`TEST-AREA`/`OLD-YARD`;
`SCN-001`/`SCN-002`/`SCN-003`; `FLANGE_JOINTING` 10.0; UT rule 4–8 in / `150#` → 2.0 and 3.0;
pressure unit `bar`; the whole SpoolGen package identity.

Values the presenter invents on the day (free text, no rule attached): report numbers
`RT-DEMO-001`, `PT-DEMO-001`, `PT-DEMO-002`, `FR-DEMO-001`; tag number `TAG-DEMO-001`; the punch
description; the jointing value `8`; the Test Pack `location`, `priority` and `pressure`.

---

## 17. Known live gates — what Task 12 must confirm

Until Phase C runs, the following are **expectations from source**, not observations. Task 12 must
confirm each and correct this runbook where reality differs:

1. `demo:prepare` reaches an all-`PASS` preflight on a clean local stack, and `demo:check` repeats
   it unchanged twice.
2. Sign-in works for each named persona and the top bar shows `TRACK01-A`.
3. Both readiness badges are actually green on the prepared stand (S1.2).
4. The four files upload through the real file inputs and the toast really reads
   `Validated 20 rows: 0 errors, 0 warnings.`
5. The exact number in `Applied N definition rows.` — this runbook deliberately does not assert it.
6. Every toast string quoted here appears verbatim, and every button label matches.
7. The RT/PT batch cycle behaves as described, including that the repair obligation appears with the
   `repair (R1)` cycle badge and no tracer obligations.
8. `QC release spool` is genuinely disabled before the NDE work and enabled after it.
9. `SP-DEMO-2001-A` reaches `Ready` on `/erection/rft` with only the steps listed in section 6.
10. The flange UT column really shows `30` for `FLG-DEMO-1001-01` with category `X`.
11. `TP-DEMO-001` flips from `Blocked · X 1` to `RFT · 12` after the punch clearance, and blinding is
    accepted only afterwards.
12. Both report files download, **open without repair warnings**, and contain `TRACK01-A` data.
13. Every hard-refresh checkpoint holds.
14. The section timings add up to 30–40 minutes for a product owner who has rehearsed once.
15. The stale badges on the home page (`Spool Tracking` → `Track 08`, `Reports & Forms` →
    `Track 11`) versus the live, Supabase-backed modules behind them — confirm and record as a
    cosmetic defect or fix it under the Task 12 gate-failure policy.
16. The raw UUIDs printed in the line-check, item-clearance and testing worklists — confirm and
    record as a known limitation.

---

## 18. No hidden steps

This walkthrough contains **no** fixture command, **no** Playwright or browser-automation step,
**no** SQL, **no** Supabase Studio action, **no** service-role script, and **no** direct database
write. The only commands a presenter runs are:

```bash
npm run demo:prepare -- --confirm-local-reset   # once, before the demo
npm run dev                                     # once, before the demo
npm run demo:check                              # optional, read-only, any time
```

Everything else in sections 4–12 happens through the application's own screens, as any user with
the same role could do it. The per-track `bootstrap:track0X-browser-fixtures` scripts still exist in
`package.json` for historical regression work; **the demo does not use them and must not.**

---

## 19. Related documents

- Plan: [`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`](../superpowers/plans/2026-08-10-track-12-demo-release.md)
- Design: [`docs/superpowers/specs/2026-08-10-track-12-demo-release-design.md`](../superpowers/specs/2026-08-10-track-12-demo-release-design.md)
- Historical acceptance context (Tracks 01–11, not required for this demo):
  [`docs/qa/local-supabase-browser-runbook.md`](../qa/local-supabase-browser-runbook.md),
  [`docs/qa/tracks-01-05-agent-walkthrough.md`](../qa/tracks-01-05-agent-walkthrough.md),
  [`docs/qa/track-06-agent-walkthrough.md`](../qa/track-06-agent-walkthrough.md),
  [`docs/qa/track-07-agent-walkthrough.md`](../qa/track-07-agent-walkthrough.md),
  [`docs/qa/track-08-agent-walkthrough.md`](../qa/track-08-agent-walkthrough.md),
  [`docs/qa/track-09-agent-walkthrough.md`](../qa/track-09-agent-walkthrough.md),
  [`docs/qa/track-10-agent-walkthrough.md`](../qa/track-10-agent-walkthrough.md),
  [`docs/qa/track-11-agent-walkthrough.md`](../qa/track-11-agent-walkthrough.md)
