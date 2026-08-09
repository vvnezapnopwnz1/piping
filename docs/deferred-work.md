# Deferred Work

Work that a track consciously did **not** do, and why that was safe.

This is not the roadmap. `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
says what a track is meant to build; this file says what it left behind. A track may be
declared complete with entries here, but never with an entry whose **Risk** column says
anything other than what is written below — an item that turns out to be load-bearing gets
promoted into the next track's plan instead of staying here.

Every entry must carry: what is missing, what covers it today, what breaks if it is never
done, and the trigger that should make someone do it. An entry with no trigger is a wish,
not deferred work — delete it.

---

## Track 02–03 — project referentials

Opened and largely closed on 2026-08-05. ESLint's first run over the tree (T07-D4) surfaced the
first two; the third had already been recorded in the Track 01–02 audit of 2026-07-31 and simply
never actioned. What they had in common is that TypeScript compiles all of them and the unit tests
cover the domain validators and repository selects, which were correct: the break was in the
wiring between them and the screen.

**T02-D1 and T02-D2 are closed.** A project can now be configured end to end through the UI. The
remaining entry is the read-only tail.

### T02-D1 — closed: the Add PDS Area dialog

**What was wrong.** Two defects in one dialog. `handleCreatePds` submitted `env`, `isUnitFlag` and
`isRackFlag` for which no control existed, so every PDS area was filed as `above_ground`, not a
unit and not a rack; and `areaClassId` had no control either, which ESLint could not see because
the value was still being *reset* after submit. Worse, all three subcontractor selects rendered
`<SelectItem value="">` for "(None)", and Radix Select **throws during render** on an empty item
value — so the dialog crashed as soon as it was opened. PDS areas could not be created at all.

**Fixed by.** A `NO_SELECTION` sentinel mapped back to null on submit, plus controls for area
classification, environment, unit and rack.

**Pinned by.** `modules/project-setup/ui/referential-dialogs.test.ts` asserts that no `.tsx` in
the tree gives a `SelectItem` an empty value, and that each of the four PDS fields has a control
bound to it. Neither the type checker nor ESLint can see either defect, which is why the guard is
a source-scanning unit test rather than a rule.

### T02-D2 — closed: five referentials had no create dialog

**What was wrong.** `Add NDE Rule` and `Add PML Record` set their `isAdd…Open` state, but no
`<Dialog>` read it, so clicking them did nothing at all; their submit handlers were complete and
attached to no form. `Add Welder`, `Add Thickness Rule` and `Add Defect Code` had no button at
all. `Add Weld Type` offered no control for `countsInDiaInch`, so every weld type was created
counting towards dia-inch progress.

**Why it mattered.** Each of those five blocks a documented server-side check when absent, so a
project could only be configured by running a seeding script:

| Missing referential | What refuses the work |
| --- | --- |
| Thickness / flange rule | `SRV_THICKNESS_MISSING` — the SpoolGen import is rejected |
| NDE matrix rule | `SRV_NDE_MATRIX_MISSING` on import; `PQC39` on weld progress |
| Welder qualification | a weld needs a qualified root and cap welder |
| Defect (rework) code | `PQC42` refuses a rejected NDE result with no defect code |
| PML record | a material check cannot accept a trace number with no matching record |

**Fixed by.** Five dialogs in `modules/project-setup/ui/welding-quality-tabs.tsx`, three new
handlers, and the dia-inch checkbox. `loadWeldingQualityReferences` now also reads
`project_subcontractors` and `project_welding_procedures`, because a welder qualification cannot
be created without picking one of each and neither is managed on that screen.

**Pinned by.** `referential-dialogs.test.ts` asserts that every `setIsAdd…Open(true)` in the tree
has a component reading it as `open={…}` — the general form of the dead-button defect — and that
each of the seven create handlers is submitted by a form.

**Deliberately not built.** Joint categories stay read-only: nothing in the schema blocks on them.
The NDE location select offers shop and field only, never assembly, because `PQC50` refuses an
assembly weld and the screen's own coverage check expects two locations. Edit and archive paths
for all of these remain absent — this closed the create gap, not the full CRUD.

### T02-D3 — closed by deletion: the Track 02 fixture bootstrap

**What was wrong.** `scripts/bootstrap-track02-browser-fixtures.ts` built a plan of
subcontractors, material types, service classes and weld types, then verified that `TRACK01-A`
existed and printed `completed successfully` without inserting any of it. Its unit test asserted
only the plan's shape. Recorded in `docs/audits/track_1_2_audit_31_07_2026.md` on 2026-07-31
("Task 16 не выполнен"); ESLint's `no-unused-vars` on the orphaned `plan` local is what made it
impossible to keep ignoring.

**Closed by deleting it**, its test, its npm script and its references in the live runbooks.
Seeding those referentials would have made the Track 01–05 walkthrough's own cases vacuous —
creating them through the UI *is* that walkthrough's subject. `docs/TRACK02_BROWSER_FIXTURES.md`
now records that there is no Track 02 bootstrap and where each referential actually comes from.
The historical plans under `docs/superpowers/plans/` still reference the script; they are records
of what was planned on a date and were left alone.

### T02-D4 — four of Track 09's six referential dependencies cannot be populated (resolved 2026-08-05)

**Resolved for the Track 09 create-only scope 2026-08-05.** This entry was first written as "create-only screens, low risk until
pilot". Checking it against `docs/superpowers/specs/2026-08-05-track-09-flange-management-design.md`
§3.2 shows that is wrong: four of the six referentials Track 09 reuses have no way to get a row
into them, so they are a **Track 09 prerequisite**, not later tidiness.

| Track 09 dependency | Can a row be created today? |
| --- | --- |
| `project_thickness_flange_rules` | **yes** — dialog added with T02-D2 |
| `project_teams(team_type='jointer')` | **yes** — the Execution tab offers Jointer |
| `project_joint_categories` | **yes** — Track 09 create dialog calls the existing repository command |
| `project_unit_time_references` | **yes** — Track 09 create-only dialog uses canonical `FLANGE_JOINTING` |
| `system_reference_entries(kind='torquing_requirement')` | **yes** — platform-admin create path and policy |
| `system_ut_calculation_rules` | **yes** — platform-admin rating-aware create path and policy |

The system referentials remain platform-admin-only; project admins cannot mutate them. Track 09
now has the create paths and rating-aware RLS required to configure them without SQL.

**Still deferred, and not a Track 09 blocker.** No screen can edit or archive a referential it
created; `updateSubcontractorStatus` exists with no caller, so a subcontractor cannot be
deactivated. Paint matrix entries, pressure units, line services, location categories and
locations have no create flow, and for the last three no create command either. Locations matter
to Track 08, which needs them out of hardcode and into the project referential.

**Covered today by.** The Track 09 UI create paths, database policies/tests, and fixture bootstrap
which insert with the service key and therefore
bypass both the missing UI and the RLS grant. That is exactly why this went unnoticed: every
walkthrough runs on seeded data.

**Remaining observation.** Edit/archive flows are still intentionally deferred; the browser
walkthrough must prove the four create paths and the platform/project authorization boundary.

**Trigger.** Decide the `system_ut_calculation_rules` question while writing the Track 09 plan,
and carry the joint-category and unit/time-reference dialogs in that plan's scope — both are the
same shape as the five added on 2026-08-05, and `referential-dialogs.test.ts` already guards the
class of defect. Take locations in Track 08. Take edit and archive when a pilot first mistypes a
code; archive needs a per-referential in-use check that does not exist yet.

**Risk if left.** High for Track 09, which is blocked on four of them. Medium at pilot for the
rest.

## Track 06 — NDE, repair, tracer and PWHT

Closed 2026-08-04. Gate D5 walked to `laydown`; `docs/qa/track-06-agent-walkthrough.md` walks
the NDE aggregate itself.

### T06-D1 — `modules/quality/application/` was never created

**Missing.** The plan's file map (§5) lists
`modules/quality/application/{create-batch,record-results,assign-tracers}.ts`. They do not
exist. `modules/quality/ui/nde-batch-screen.tsx` calls the infrastructure repository directly,
so the use-case layer the other modules have is absent here.

**Covered today by.** The rules themselves live in the database — `create_nde_batch`,
`allocate_nde_batch_candidates`, `record_nde_result`, `derive_repair_and_tracers`,
`evaluate_nde_penalty` are all `SECURITY DEFINER` with capability, scope and idempotency
checks, and are pinned by `060`–`064`. The UI cannot bypass them; there is nowhere for a
business rule to hide in the missing layer.

**Breaks if never done.** Nothing functionally. It costs consistency: a reader who knows
`modules/construction/application/` will look for the analogue and not find it. The screen
also carries a little orchestration it should not own — reloading, toast text, the
`rejectionNeedsDefectCode` pre-flight.

**Trigger.** The first time a second caller needs the same NDE command — a mobile screen, a
report, a bulk action. Two callers is when the missing layer starts costing duplication
rather than tidiness.

**Risk if left.** Low. Structural, not behavioural.

### T06-D2 — the eight truth-table rows have no domain unit tests

**Missing.** The plan (§ Mandatory truth-table tests) asks for all eight rows in **both**
domain unit tests and pgTAP. Only pgTAP has them. `modules/quality/domain/` holds
`joint-status-label.test.ts` and `nde-method-parity.test.ts` — the cascade rules themselves
are untested in TypeScript.

**Covered today by.** `061_nde_repair_tracer_truth_table.test.sql` covers the cascade,
`062_nde_penalty.test.sql` the escalation arithmetic including the three-versus-four
rejection boundary, `064_track06_corrections.test.sql` the supersede rule. All eight rows are
asserted where the logic actually lives.

**Breaks if never done.** Nothing today. The cost is speed: a pgTAP run needs a database and
a reset, so a developer changing the cascade gets feedback in seconds only if the rules are
also modelled in the domain.

**Trigger.** Any move of cascade logic out of SQL into TypeScript. Then the domain tests stop
being a duplicate and become the only test.

**Risk if left.** Low, and it drops further with every pgTAP assertion added.

### T06-D3 — the second tracer level is not walked in a browser

**Missing.** `docs/qa/track-06-agent-walkthrough.md` reaches the NDE100 escalation through
four rejections in one batch (`four_rejections`). The other route into it — a rejected
**second-level** tracer (`second_level_tracer`) — has no case. Reaching it needs a T1 rejected
*after* the first escalation has already fired, which makes the fixture state harder to reason
about than the rest of the script.

**Covered today by.** `062_nde_penalty.test.sql` proves both escalation reasons and that an
accepted T1/T2 does not escalate. The banner renders `escalation_reason` for both values, so
only the `second_level_tracer` wording is unproven on screen.

**Breaks if never done.** A wrong sentence in the banner for one of two escalation reasons
would ship unnoticed. No data or gate is affected.

**Trigger.** Any change to the escalation banner, `evaluate_nde_penalty`, or the tracer
ordinal rules. Also worth doing opportunistically when the Track 06 script is next run and
passes cleanly — the state is already there.

**Risk if left.** Low. Cosmetic surface of a proven rule.

### T06-D4 — `/nde` offers Create Batch to a user who cannot create batches

**Missing.** Reader QC (`project_reader` + QC Engineer) holds `nde.view` and nothing more, but
the screen renders **Create Batch** and both batch action buttons regardless of capability.
Clicking is refused server-side with a proper sentence and a `403`.

**Covered today by.** `current_user_has_capability` inside every command. The refusal is real
and correctly worded; `docs/qa/track-06-agent-walkthrough.md` T06-10b asserts it.

**Breaks if never done.** Nothing security-relevant — the guard is server-side, which is where
it counts. It is an affordance defect: the screen invites an action it knows will fail, which
the Track 05 screens do not do (they disable the control and say why).

**Trigger.** Bundle it with the next `/nde` UI change. The capability set is already loaded
client-side for navigation filtering, so the fix is small; it was left out here only because
it is not what the Track 06 verification package was for.

**Risk if left.** Low, but it is the most user-visible of these four.

---

## Track 07 — Erection

T07-D2 and T07-D3 were closed on 2026-08-04. The erection screens are real forms rather than one
generic screen, and `spool_erection_readiness` names its material columns honestly; both are
pinned by `073_material_check_phase_naming.test.sql` and by gate tests in
`modules/construction/application/`. The same commit removed the demo implementation from this
branch — `main` still holds it — so nothing here carries two implementations any more.

**T07-D4 and T07-D7 were closed on 2026-08-05.** ESLint is installed and `npm run lint` exits 0
with zero errors; `npm run verify` now runs it first. `docs/qa/track-07-agent-walkthrough.md` is
rewritten against the ten new screens and the Track 07 fixture was extended so the whole script is
executable. What lint found on its first run is not all closed, though, and the two entries it
opened are recorded under **Track 02** below, not here: they are Track 02/03 referential defects
that had simply never been visible. IDs are retired, not reused.

### T07-D4 — two lint rules are warnings, not errors *(reduced from "lint does not run")*

**Closed part.** `eslint@9` and `eslint-config-next@16.2.6` are installed, `eslint.config.mjs`
exists, and `npm run lint` reports **0 errors**. `npm run verify` runs it before typecheck. The
first run found 92 errors; all are fixed or explicitly exempted at the site with a reason.

**Still deferred.** Two rules are set to `warn` rather than `error`, so 94 warnings remain:

| Rule | Count | Why it is not an error yet |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` | 65 in source (tests and scripts exempted) | Mostly the Supabase row boundary and `catch (err: any)`. Typing them is a mechanical but wide change, and `Row = Record<string, any>` in the repositories is a deliberate seam that `*-select-columns.test.ts` guards instead. `welding-quality-tabs.tsx` was converted to `catch (err: unknown)` while its dialogs were being built, which is the pattern the rest should follow. |
| `react-hooks/set-state-in-effect` | 25 | Every one is the same load-on-mount pattern, `useEffect(() => { void reload() }, [reload])`, used by every data screen in the app. It is flagged by `eslint-plugin-react-hooks@7` as a cascading-render risk. Changing it is a data-loading refactor across 25 screens that needs browser verification, not a lint fix. |

**Covered today by.** Both are visible in every `npm run lint` run rather than suppressed, and
neither can hide a new occurrence of the *error*-level rules.

**Breaks if never done.** Warning rot: 99 warnings is already enough that a hundredth would not be
noticed. Neither rule protects against a wrong record.

**Trigger.** Take `no-explicit-any` one module at a time, starting with
`modules/project-setup/infrastructure/`, and promote the rule to `error` when the count reaches
zero. Take `set-state-in-effect` when a track touches data loading anyway — Track 08's offline
queue is the natural moment, since it changes how screens read.

**Risk if left.** Low.

### T07-D5 — the UI kit carries about forty unused primitives

**Missing.** A reachability sweep from `app/`, `scripts/`, `supabase/` and every test finds 36
files under `components/ui/` plus `components/theme-provider.tsx` that nothing imports —
`calendar`, `carousel`, `chart`, `command`, `menubar`, `resizable` and the like.

**Covered today by.** Nothing needs to cover it: they are inert. They were kept deliberately
rather than deleted with the demo, because they are the shadcn design-system layer that Tracks
08–11 draw from, not demo data. The duplicate toast system (`components/ui/toast.tsx`,
`toaster.tsx`, `use-toast.ts`, `hooks/use-toast.ts`) *was* deleted, because the shell mounts
sonner and a second toast implementation is a competing answer rather than an unused part.

**Breaks if never done.** Nothing. It is bundle-irrelevant — unimported files are not compiled
into the app.

**Trigger.** Only if the design system is replaced, or if a primitive here starts disagreeing
with one a track has adapted. Otherwise leave them.

**Risk if left.** None.

### T07-D6 — the header keeps three buttons that do nothing

**Missing.** `components/pipeqc/top-nav.tsx` renders Search, Help and Settings icon buttons with
no handler. The notification bell beside them was removed because it counted rows in the deleted
demo store; these three were left because they were never demo-backed, only unfinished.

**Covered today by.** Nothing. They are visible and inert.

**Breaks if never done.** A user clicks and nothing happens — the same affordance defect as
T06-D4, in the chrome rather than in a module.

**Trigger.** Bundle with the first header change, or with Track 11 when notifications and reports
give two of the three something to do.

**Risk if left.** Low, and cosmetic, but it is on every screen.

### T07-D7 — `app/documentation` still describes the previous UI *(runbook part closed)*

**Closed part.** `docs/qa/track-07-agent-walkthrough.md` is rewritten: eleven cases against the
ten screens, with the literal gate sentences each screen renders, and the stale
`NEXT_PUBLIC_PIPEQC_MODE` instruction removed from it and from
`docs/qa/local-supabase-browser-runbook.md`. The runbook's scope paragraph no longer calls Erection
a smoke check.

**Still deferred.** `app/documentation/page.tsx` is a 603-line hand-maintained status page listing
which modules are live, partial or placeholder. It was written against the demo and has not been
revised.

**Covered today by.** `app/page.tsx` carries an accurate live/planned list per module and the
sidebar hides planned routes, so a reader has a correct source inside the app.

**Breaks if never done.** One page states things that are no longer true. It is linked from the
header's Settings area, which is itself inert (T07-D6), so few readers reach it.

**Trigger.** Revisit in Track 11, when generated documents give the page a real subject — or
delete it in favour of the landing page, which is the cheaper answer.

**Risk if left.** Low.

### T07-D1 — the erection screens have not been walked in a browser

**Missing.** No Playwright pass has been run against the erection routes. This was already open
before the screens were rebuilt, and rebuilding them widened it: the field weld form, the field
material form, the per-support recording and the four stage cards are all new surface, and the
runbook that existed walked the generic screen they replaced.

**Covered today by.** `070`–`073` pgTAP (549 database assertions pass on a clean reset), 99 unit
tests including gate tests for every refusal each screen renders, `npx tsc --noEmit`, and
`npm run build` compiling all 70 routes. Every rule the screens enforce is also enforced in the
database, so a screen defect can produce a confusing refusal but not a wrong record.

**Breaks if never done.** A route-level integration defect, an inaccessible control, or stale
read-after-refresh state could survive even though the contracts pass. Specifically unproven on
screen: that the readiness table refreshes after each of the six commands, and that the stage
cards disable correctly for a reader who holds `erection.view` without
`erection.progress.record`.

**Trigger.** The script now exists and is executable: `docs/qa/track-07-agent-walkthrough.md`,
eleven cases, T07-00 through T07-10. It has **never been run** — it was written from the source of
the screens, not from observation, and says so at the top. Bootstrap the chain through
`npm run bootstrap:track07-browser-fixtures` and hand the script to a browser agent before the
erection module is shown to anyone. T07-01 and T07-09 are the two cases that close the specific
gaps named above; T07-02 step 5, T07-06 step 10 and T07-08 step 9 are the in-place refresh
assertions.

**The fixture was extended on 2026-08-05 so the script could cover those cases.**
`scripts/supp-t7.txt` adds `SU-T7-001` and `SU-T7-002` to the walk spool — without supports the
Supported screen could only be walked as "this spool revision has no supports". `weld-t7.txt` and
`trace-t7.txt` gained a second spool, `SP-T7-002-A`, and the bootstrap now seeds To Site and the
material check on `SP-T7-001-A` **only**. A precondition cannot be observed on a spool that
already satisfies it, and before this change every spool in the fixture was pre-advanced.

**Risk if left.** Medium for demo readiness; low for the verified database contract.

## Track 10 — Test Pack & Pressure Test

### T10-D1 — CLOSED 2026-08-09: authenticated browser Gate D

The authenticated local browser walkthrough passed **12 / 12** cases. It recorded the full
Line Check → X clearance → derived RFT → Blinding → Testing/Pre-commissioning → Y/Z reinstatement
sequence, durable print URLs, refresh persistence, reader controls, and project-scope switching.
See [Track 10 Gate D report](qa/track-10-gate-d-report.md).

The final Track 12 whole-application browser regression and the product owner's manual walkthrough
remain planned release activities; they are not deferred Track 10 work.

## Cross-cutting

Not a track's debt: introduced by one track and carried by all of them. The conventions below say
one heading per track; this section is the exception, and entries here use an `XC-` prefix.

### XC-D1 — `audit_events` is written by 23 migrations and read by none

**Missing.** Every `SECURITY DEFINER` command inserts into `audit_events` — the table appears in 23
migrations — and no module, screen or report ever selects from it. There is no read surface at all.

**Covered today by.** Nothing reads it, so nothing depends on it being right. The writes themselves
are correct and cheap: they are inserts inside a transaction that is already open.

**Breaks if never done.** Two ways, both quiet. The trail may be recording the wrong shape — nobody
has had to consume `before_state`/`after_state` yet, so nobody has discovered a command that
snapshots too little. And P0-09 in the master plan asks for an audit trail; a trail nobody can read
does not satisfy an auditor.

**Why it was not resolved here.** The two available moves both cost more than they save today.
Deleting the writes would forfeit P0-09 and be expensive to reinstate across 23 migrations.
Building a read surface is Track 11 work with a real design question behind it — who may read whose
audit rows — that belongs with the documents and reports module, not with erection screens.

**Trigger.** Track 11, when report definitions are fixed. That is the first time a consumer exists
and therefore the first time the recorded shape can be checked against a need.

**Risk if left.** Low today, rising with each track that adds writes to a shape no reader has
validated.

### XC-D2 — `modules/quality/` still has no application layer while `modules/construction/` does

**Missing.** T06-D1 records that `modules/quality/application/` was never created. The erection
work widened the gap in the other direction: `modules/construction/application/` gained four more
files (`record-erection-progress`, `record-field-material-check`, `record-field-weld-progress`,
`describe-erection-readiness`), so the two modules now differ more than they did.

**Covered today by.** The NDE rules live in `SECURITY DEFINER` functions pinned by `060`–`064`, and
`modules/quality/ui/nde-batch-screen.tsx` calls the repository directly. Nothing can bypass them.

**Why it was not resolved here.** The construction files exist because each one carries a real
decision the screen needs before it calls the database — which predecessor stage is missing, whether
To Site has been recorded, which capability the refusal should name. NDE has no equivalent: its
screen has one caller and no pre-flight logic worth naming. Adding a layer that only forwards calls
would be the ceremony this cleanup was meant to remove, not a reduction in complexity. The
asymmetry is worth living with until T06-D1's own trigger fires.

**Trigger.** Unchanged from T06-D1: the second caller of an NDE command.

**Risk if left.** Low. Structural, and now documented as deliberate rather than accidental.

## Conventions

- One heading per track, newest at the top of its track's section.
- Entry IDs are `T<NN>-D<n>`, stable once written. Reference them from commit messages and
  plans rather than restating the item.
- When an entry is done, delete it and say so in the commit that closes it. This file is a
  list of open debts, not a history — git already has the history.
