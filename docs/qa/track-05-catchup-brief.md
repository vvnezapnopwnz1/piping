# Track 05 Catch-Up Brief — the two cases that gate Track 06

The 2026-08-03 walk proved the fabrication golden path (verified in the database: seven
ledger events, `fabricated` correctly absent, `laydown` current). Two things it did not
run block Track 06. This brief is only those two. Everything else is in
`docs/qa/tracks-01-05-agent-walkthrough.md`, unchanged.

**Stand fact to know before starting:** the spool is on revision **R0**. The 2026-08-03 run
never created R1, so nothing below has ever been exercised in a browser.

Same contract, same rules as §1–§2 of the walkthrough. `http://localhost:3000` only.

---

## A — Revision carry-over and the superseded guard

Runs the walkthrough cases **T04-07, T04-08, T04-09** and then **T05-N3**, in that order.

1. `/spooling/import`. Upload a copy of `scripts/weld.txt` with `ISO_REVISION=R1` and one
   changed spool weight, plus `trace.txt` and `supp.txt`. Validate.
   **Expected:** the changed spool is **Revised**; Apply names the missing decisions, and the
   count in the blocking sentence equals the number of items actually needing one.
2. Set the changed spool to **Rework** → its welds require their own decisions. Then set it to
   **Done without Modification** → the weld decisions disappear.
3. Make every decision and apply R1.
   **Expected:** R1 accepted, R0 superseded, selectable, read-only. Watch for a second toast
   after the success one: `Carried N progress records forward.` That is
   `materialize_progress_copies` running from the workbench — it has never been seen in a
   browser. If it does not appear, say so and record whether any warning toast replaced it.
4. `/fabrication/material-check`. **Expected:** the picker offers **two** entries, both
   labelled `· R1`. Four entries, or any entry without a revision number, is a FAIL.
5. Select the R1 `SP-T4-001-A` and read the stage timeline.
   **Expected:** the eight stages carried over from R0 are present. Record exactly which cells
   carry a date and which show `—`; this is the observation the whole case exists for.
6. **T05-N3.** Reach the superseded R0 revision (via `/spooling/browse` → the R0 revision, or
   whatever path the UI offers) and try to record a trace against it.
   **Expected:** the plain-English `PQC31` sentence — this revision is no longer the accepted
   one, reload and record against the current one. Raw SQL or a bare error code is a FAIL.

## B — Second signed-in user `[P0]`

Runs walkthrough case **T05-D2**.

1. In a **separate browser profile** — do not sign out of the primary session — sign in as
   `track01.qc-editor@example.test` and select `TRACK01-A`.
2. Open `/fabrication/dashboard`.
   **Expected:** `SP-T4-001-A` shows the same stage and the same counts the first session sees:
   material `2/2`, welds `2/2`, supports `1/1`, NDE outstanding `0`, PWHT outstanding `0`.
   If case A ran first, the spool is on R1 — report the stage you actually see rather than
   assuming `laydown`.
3. Open `/fabrication/material-check`, select the spool, and read the timeline.
   **Expected:** the same dates as the first session. Any difference is a durability FAIL and
   is the single most important thing in this brief.

---

## Report

Use the walkthrough's template (§15). Five lines are enough per case, but state explicitly:

- whether the carry-over toast appeared, and its number;
- which timeline cells carried over to R1;
- the exact `PQC31` sentence;
- the exact counts the second user saw.

Do not fix anything. Do not re-run a mutation whose outcome is unclear — report BLOCKED.
