# Track 06 Gate D5 — Browser Walkthrough — 2026-08-04

Mode: full chain (Track 01–05 bootstrap)
App: http://localhost:3000
Project: TRACK01-A
Agent: Claude Opus 5 (Playwright MCP)
Stand: clean `supabase db reset` + Track 01–05 bootstrap, re-run after the two
defects below were fixed
Persona: `track01.project-admin-a@example.test` (Project Admin A)

## Summary

Cases run: 9  PASS: 9  FAIL: 0 (after fixes)  BLOCKED: 0
Defects found and fixed during the run: 2, both blocking
Golden path reached stage: **`laydown`**

Stage ladder for `SP-T4-001-A`, walked with a rejection and a repair in the
middle:

```text
Start Fab      2026-08-03
Material Check 2026-08-03
Fabricated     2026-08-03
QC Release     2026-08-03
Sent to Paint  2026-08-03
Painted        2026-08-03
Final QC       2026-08-03
Laydown        2026-08-03   <- Current
```

## Results

| Case | Status | URL | Expected | Actual |
| --- | --- | --- | --- | --- |
| D5-01 Real empty state | PASS | `/nde` | No demo figures in Supabase mode | "Batches (0)", "No NDE batches created yet.", "NDE Obligations (0)". Route is behind auth; nothing fabricated is shown. |
| D5-02 Real dashboard | PASS | `/nde/dashboard` | Projections, not demo numbers | Total 0 / Open 0 / Pending 0 / Satisfied 0 against an empty project. |
| D5-03 Manual joint status | PASS | `/nde` | Manual 19.6 codes derived, not stored | Two 10 % RT obligations render `S`; after allocation the selected one renders `SS` and the other stays `S`; tracer renders `T1` then `T1S`; repair renders `R1`; a satisfied spot obligation renders `NR`. |
| D5-04 Allocation percentage | PASS | `/nde` | `target_percentage` honoured | 50 % over two candidates allocated exactly one. Before the fix the parameter was ignored and both were taken. |
| D5-05 Rejection is recordable | PASS | `/nde` | Defect code and welder offered | Defect dropdown lists POR/CRK/LOF/SLG; welder dropdown lists only `W-T5-1` and `W-T5-2`, the two welders actually on the joint (plan 3.5). Save is disabled until a defect code is chosen. |
| D5-06 Cascade on screen | PASS | `/nde` | Rejection produces R1 and tracers | Obligations went 2 → 4: original `rejected`, `R1` created at 100 % coverage (manual 19.8), `T1` tracer created on the other joint. |
| D5-07 Spool becomes unreleasable | PASS | `/fabrication/qc-release` | Refusal named as a sentence | "Supports are incomplete: 0 of 1 installed. 4 NDE obligations are still outstanding. 2 joints still need an accepted PWHT result." — the NDE count rose from 2 to 4 because of the cascade. |
| D5-08 Repair closes the joint out | PASS | `/nde` | Accepted repair releases the joint | After R1 was accepted the rejected original moved to `superseded` and the joint stopped holding the spool. **This failed on the first run — see D5-F1.** |
| D5-09 Interim RPC retired | PASS | `/fabrication/qc-release` | No "Mark accepted" | The obligations table shows Joint / Method / Cycle / Coverage / Selection / Status with the full lineage (Original, repair (R1), tracer (T1)) and a "Manage in NDE" link. |

## Failures found during the run, both fixed

### D5-F1 — a rejection made a spool permanently unreleasable

- Expected: after the mandatory R1 repair is accepted, the joint is sound and
  the spool can be QC released.
- Actual: QC release stayed disabled with "1 NDE obligations are still
  outstanding". The rejected original never left the `rejected` disposition, and
  `spool_fabrication_readiness` counts everything that is not `satisfied`,
  `waived` or `superseded`. Any spool that ever saw one rejection could never be
  released again.
- Cause: the plan's section 3.2 put `superseded` in the vocabulary for exactly
  this and nothing ever wrote it. The same walk showed the other half — a
  rejected *tracer* got no repair at all, so it blocked its own spool forever.
- Fix: `20260809092000_nde_repair_supersedes_parent.sql`. An accepted repair
  supersedes the cycle it repaired and that cycle's ancestors; a rejected tracer
  now earns its repair. Pinned by three assertions in `064`.

### D5-F2 — a rejection could not be recorded at all on the stand

- Expected: the "Defect code" dropdown offers the project's rework codes.
- Actual: the dropdown was empty, so Save stayed disabled and the whole repair
  and tracer cascade was unreachable through the UI.
- Failing request (before the UI fix): `POST /rest/v1/rpc/record_nde_result` →
  400, `PQC42`.
- Cause: Track 06 makes a defect code mandatory and no bootstrap ever seeded
  `project_rework_codes`. Task 10 step 4 anticipated this case ("extend the
  Track 05 bootstrap only if Track 06 needs a referential it does not already
  write — note it explicitly if so") and it was never done.
- Fix: the Track 05 bootstrap now writes POR/CRK/LOF/SLG, and
  `20260809091000_grant_track06_fixture_referentials.sql` grants the table to
  `service_role`.

## Observations, not defects

- The New NDE Batch dialog keeps the last coverage regime between opens. Twice
  this produced a Spot batch where a 100 % batch was meant, and issuing the empty
  result refused with `PQC41` as its sentence. Correct refusal, mildly surprising
  form behaviour.
- The escalation banner was not exercised: the fixture has two shop joints, so a
  population large enough for four rejections or a second-level tracer cannot be
  built on this stand. The escalation and its effect are covered by `062` and
  `064` instead.
- Only one first-level tracer was created rather than two, because the project
  has exactly one other eligible joint. That is the documented behaviour: fewer
  than two candidates yields fewer than two tracers, so a rejection stays
  recordable in a small project.

## Not run

- Erection, Tracking, Test Pack, Flange and Reports — outside Track 06.
- Second-user durability and the revision carry-over from
  `docs/qa/track-05-catchup-brief.md` — unchanged by Track 06 and not re-walked.
