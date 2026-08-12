# Track 12 — Task 13: Close out Track 12 from evidence

**You are executing Task 13 of an already-approved plan. Do not re-plan, re-scope, or re-run any
browser/UI work. This is a documentation closeout task only, performed from evidence that already
exists.**

## Where the actual task spec lives

Task 13 is fully specified in
`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`, the section titled
**"Task 13: Close out Track 12 from evidence"** (Steps 1–6), immediately followed by the
**"Final verification matrix"** and **"Completion definition"** sections at the end of that same
file. Read all three sections before touching anything — they are short, and this prompt does not
repeat their exact wording, only the context and one open decision you must resolve.

Use `superpowers:executing-plans` if you want the checkpoint structure; the task itself is small
enough to execute directly against the six steps if you prefer.

## What already happened (your input evidence)

Phase A, Phase B, and Phase C (C1–C7) of Track 12 are complete. The full evidence record is in
`docs/acceptance/track-12-demo-release.md`, and it is already filled in for:

- Phase A (clean code/database gate) — `PASS`, including the one classified pre-existing baseline
  failure (§5 of that document).
- Phase B (prepared-stand contract gate) — `PASS`.
- Phase C1–C4 (browser acceptance: baseline, full positive spine, full negative matrix, artifact
  structural verification) — all `PASS`, executed by an agent session through the Chrome extension.
- Phase C5 (optional Mode B / setup walkthrough) — closed at **`PARTIAL`**. `track-12-setup-walkthrough.md`
  §5 was executed in full (project creation, three access roles, verified through the UI). §5's own
  open question (whether `demo:check` tolerates a third project) is now answered with real output —
  see acceptance §4. §6 (the 12-step referential dependency chain, which would have driven Gate B to
  *Ready for Import* and answered setup-walkthrough §11 items 3–9) was **not executed**. This was a
  deliberate product-owner decision made during C6, not an oversight or a failure — the product owner
  explicitly declined to redo it manually after already completing the timed golden rehearsal.
- Phase C6 (product-owner rehearsal) — **`PASS`**, independently re-run live through the UI by the
  product owner (not by an agent), within the 30–40 minute budget, both downloaded reports opened
  cleanly in real spreadsheet/PDF viewers, sign-off recorded in acceptance §6 as **"Accepted with
  reservations."**
- Phase C7 (gate-failure policy) — **N/A, not triggered**. No case across the entire Phase C run (C1–C4
  and C6 combined) produced a reproducible functional blocker.
- Twenty findings are recorded in acceptance §4, all classified cosmetic, UX, automation-side, or
  deferred product decisions — none are code defects, none blocked progression through any section.

**Do not re-verify any of this by running the app, SQL, or `demo:check` yourself.** Your job is to
read the recorded evidence and close the loop in the three target documents. If you find the
acceptance record internally inconsistent or missing a field Task 13 Step 1 requires, fix that
record from what's already written elsewhere in it — do not go generate new evidence to fill a gap.

## The one decision you must make explicitly, and reason about in writing

Task 13 Step 2 says: *"Track 12 is `CLOSED — Demo Lite` only when all eleven exit criteria from the
approved design are satisfied. Otherwise use `BLOCKED` with the exact unsatisfied criteria; do not
weaken the contract to close the roadmap."* The eleven criteria are the bullet list under
**"Completion definition"** at the end of the plan file. One of them reads: *"the optional
from-scratch project/referential walkthrough passes."*

That criterion is not fully satisfied — C5/Mode B is `PARTIAL` (§5 done, §6 not done), for the
reason described above. Before you decide `CLOSED` or `BLOCKED`, read
`docs/superpowers/specs/2026-08-10-track-12-demo-release-design.md` line 19, where the same
walkthrough is listed in the original design as **"one optional setup walkthrough"** — i.e. the
design itself calls it optional, which is in tension with it also appearing as one of eleven
mandatory closing criteria in the plan's own "Completion definition."

Resolve this yourself by reading both passages in full context (not just the two lines quoted
above) and decide, with your reasoning written into acceptance §7 *Final decision*:

- If you conclude "optional" in the design means this criterion does not gate closure (i.e. its
  presence in the eleven-item list is about the walkthrough *existing and being runnable*, not
  about it having been *fully driven to completion* every time) — close as `CLOSED — Demo Lite`,
  and say exactly why in §7, citing both source passages.
- If you conclude the plan's "Completion definition" is the binding contract regardless of what the
  design calls "optional" — close as `BLOCKED`, name this single unsatisfied criterion exactly, and
  say what finishing it would require (re-running `track-12-setup-walkthrough.md` §6 on a freshly
  Mode-B-prepared stand, per acceptance §5's own documented sequencing).

Either outcome is acceptable. What is not acceptable is silently rounding `PARTIAL` up to `PASS`,
or closing `CLOSED` without addressing this tension in writing. Do not touch any other criterion in
the eleven-item list — all ten of the others are satisfied per the acceptance record's own C1–C6
evidence; verify that claim by reading the record, don't take this prompt's word for it.

## Task 13 steps — do exactly these six, no more

Files in scope (do not touch any other file):

- Modify: `docs/acceptance/track-12-demo-release.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Modify: `docs/deferred-work.md` — only for deferrals with concrete Phase C evidence and a stated
  future trigger; an entry with no trigger is a wish, not deferred work — do not add it

1. **Complete the acceptance record.** Every Phase A/B/C result needs date, commit, status, and
   concise evidence — confirm this is already true (it should be) and fix anything that isn't. Never
   mark a skipped or partial case `PASS`.
2. **Decide release status** per the section above. Write it as `CLOSED — Demo Lite` or `BLOCKED`
   with exact unsatisfied criteria, into acceptance §7.
3. **Update the master roadmap.** Link this plan and the design/acceptance documents, update the
   Track 12 status line, describe the delivered release accurately as a **local Supabase-backed Demo
   Lite** — not production, not offline-capable, not a document-handover/dossier feature. Preserve
   that distinction explicitly; do not let the roadmap entry imply more than what was built.
4. **Refresh deferred work only from findings.** Keep the existing Track 08 offline and Track 11
   durable-document/storage entries as they are. Add a new entry only if a Phase C finding (acceptance
   §4, items 1–20) is genuinely a *consciously deferred capability gap* rather than a cosmetic/UX
   defect — most of the twenty are UX findings for a future polish pass, not deferred-work material;
   use judgment, don't mechanically transcribe all twenty.
5. **Run the final checks** and review every hit in context — `fixture`/`Playwright` may appear only
   in explicit statements that the presenter does not require them; truthful `FAIL`/`BLOCKED`
   entries must be preserved, not sanitized away:

   ```bash
   rg -n "NOT RUN|BLOCKED|FAIL|placeholder|fixture|Playwright" docs/runbooks/track-12-demo.md docs/runbooks/track-12-setup-walkthrough.md docs/qa/track-12-agent-walkthrough.md docs/acceptance/track-12-demo-release.md
   git diff --check
   git status --short
   ```

6. **Suggested final checkpoint only** — if all gates pass and the user has separately authorized
   Git operations for this session, the suggested commit message is
   `docs(release): close Track 12 Demo Lite`. **Do not commit, push, or stage anything unless the
   user in your session explicitly authorizes it in that session** — this prompt does not carry that
   authorization forward.

## Hard constraints

- Documentation-only task. No source file, migration, generated type, or test may be modified.
- No Playwright, no SQL, no Supabase Studio, no `demo:prepare`/`demo:check` re-run.
- No re-opening of Phase C browser work "to double-check" — the recorded evidence is authoritative.
- If you find something during this closeout that looks like it needs a *code* fix (not just a
  documentation correction), stop and report it rather than fixing it — that would be new scope,
  which Task 13 explicitly does not include (`docs/superpowers/plans/2026-08-11-track-12-phase-c-browser-acceptance.md`
  §6.4's gate-failure policy applies to Phase C, not to this closeout step, and re-triggering it here
  would mean Phase C didn't actually close — flag it back to the user instead of acting on it).
