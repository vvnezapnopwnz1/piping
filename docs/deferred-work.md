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

### T07-D1 — Browser Gate D is pending a bootstrapped local stand

**Missing.** The Playwright walkthrough has not yet been executed against a live browser
session, so the field rejected-weld → accepted-repair path and Track 05/06 regressions have
no browser evidence in this checkout.

**Covered today by.** `070`–`072` pgTAP tests, repository/domain tests, the fixture invariant
test and `npm run verify` cover the database and application contracts. The runbook explicitly
labels the browser cases BLOCKED rather than inferring PASS from source.

**Breaks if never done.** A route-level integration defect, inaccessible control or stale
read-after-refresh state could remain undiscovered even though the RPC contracts pass.

**Trigger.** Bootstrap the local fixture chain with the operator credentials and run
`docs/qa/track-07-agent-walkthrough.md` in Playwright before presenting the demo.

**Risk if left.** Medium for demo readiness; low for the verified database contract.

## Conventions

- One heading per track, newest at the top of its track's section.
- Entry IDs are `T<NN>-D<n>`, stable once written. Reference them from commit messages and
  plans rather than restating the item.
- When an entry is done, delete it and say so in the commit that closes it. This file is a
  list of open debts, not a history — git already has the history.
