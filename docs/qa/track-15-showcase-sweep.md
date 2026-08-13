# Track 15 — showcase dataset sweep and edit pass

Three passes prove the seeded `SHOWCASE-1` dataset is correct, complete and safely editable. Run
them in order; each answers a different question.

## Why the row counts matter

The shared data-table footer prints `N of M` (`components/ui/data-table/data-table.tsx:356`), where
`M` is the number of rows actually fetched. PostgREST truncates every response at
`max_rows = 1000` (`supabase/config.toml:18`) **with no error**, and the repositories do not
paginate server-side — there is one `.limit()` call in all of `modules/*/infrastructure/`. A footer
lower than the expected count is therefore the only visible symptom of silent truncation.

A count of **zero** on a screen that should hold rows means something different: RLS is hiding the
rows, not that the seed failed. The showcase memberships are deliberately unscoped, so a zero here
points at a missing membership or a restrictive policy, never at PDS scoping.

At the seeded size the ceiling is nowhere near — the largest view carries 112 rows against a
1000-row cap — so any mismatch is a real defect rather than a capacity problem.

## Expected counts

Measured on the stand built by `demo:prepare` + `demo:showcase`. `SHOWCASE_EXPECTED_COUNTS` in
`scripts/demo/showcase-dataset.ts` holds the structural half of these and the unit tests enforce
them.

| Read model | Rows | Screens that read it |
|---|---|---|
| `isometrics` | 8 | `/spooling/browse` |
| `spool_construction_status` | 16 | `/fabrication/dashboard`, fabrication worklists |
| `spool_erection_readiness` | 16 | `/erection/dashboard`, `/erection/rft` |
| `weld_progress_summary` | 112 | `/fabrication/weld-progress`, `/erection/weld-progress` |
| `nde_obligations` | 82 | `/nde`, `/nde/dashboard` |
| `nde_results` | 62 | `/nde`, `/nde/dashboard` |
| `nde_batches` | 2 | `/nde` |

Distribution the screens should reflect:

| Dimension | Expected |
|---|---|
| Spools by current stage | `laydown` 4, `qc_release` 3, `painted` 3, `material_check` 5, not started 1 |
| PDS areas | `PDS-100` 3 ISO, `PDS-200` 3 ISO, `PDS-300` 2 ISO |
| Weld progress records | 82 of 112 joints (30 field/unwelded joints remain open) |
| Locked vs unlocked welds | 62 locked, 20 unlocked |
| Spools deriving RFT | exactly 1 (`SP-1001-A`) |
| Weekly buckets carrying progress | 11 of 12 |

## Pass 1 — regression: the Track 12 walkthrough, with the showcase data present

Run the positive spine (§3) and negative matrix N1–N8 of `docs/qa/track-12-agent-walkthrough.md`
against **`TRACK01-A`**, exactly as written. Do not re-point it at `SHOWCASE-1`: it is written
against an empty stand with a live import and would be meaningless there.

Run it **after** seeding. That ordering is the point — it is the only pass that proves a populated
third project is invisible from `TRACK01-A`. Any showcase row appearing under `TRACK01-A` is a
missing `project_id` filter in a repository, a blocking defect to fix rather than a reason to drop
the seed.

Two expected, non-failing deviations, to be recorded rather than raised:

- the project picker now lists a third project;
- any step whose wording says the only other project is `TRACK01-B` is now stale.

| Field | Value |
|---|---|
| Date run | |
| Result | |
| Cross-project leaks | |
| Deviations | |

## Pass 2 — module sweep on `SHOWCASE-1`

Sign in as `track01.project-admin-a@example.test`, switch to `SHOWCASE-1`, and visit each route.
Record the footer count beside the expected one. A mismatch is a blocker: establish which of the two
causes above it is before continuing.

| Route | Expect | Observed | Notes |
|---|---|---|---|
| `/` | module cards, no roll-up numbers | | |
| `/spooling/browse` | 8 isometrics | | |
| `/fabrication/dashboard` | 16 spools, six stage buckets | | |
| `/fabrication/weld-progress` | 112 joints, 82 with progress | | |
| `/fabrication/material-check` | 15 checked spools | | |
| `/fabrication/qc-release` | 10 released spools | | |
| `/fabrication/paint` | 7 painted spools | | |
| `/fabrication/laydown` | 4 laid-down spools | | |
| `/nde` | 2 batches, 82 obligations | | |
| `/nde/dashboard` | 62 satisfied, 20 pending | | |
| `/erection/dashboard` | 16 spools, 4 with erection progress | | |
| `/erection/to-site` | 4 spools | | |
| `/erection/rft` | 1 spool | | |
| `/tracking` | empty — tracking is out of scope | | |
| `/testpack` | empty — test packs are out of scope | | |
| `/reports` | renders | | |

## Pass 3 — edit pass

Proves the seeded data is genuinely editable, which is the property the seeder's
write-through-commands design exists to guarantee.

1. **Untouched spool.** Open `SP-1008-B` — the one spool with nothing recorded — and record
   `start_fab` through the UI. Confirm the toast, hard-refresh, confirm the date persisted.
2. **Open joint.** On a spool in the `material_check` group, record weld progress on an open joint.
   Confirm `/fabrication/dashboard` moves.
3. **Locked weld.** Open a joint carrying an accepted NDE result and attempt to change its WPS.
   Confirm the UI surfaces `PQC36` ("WPS, subcontractor and weld date are locked after an accepted
   NDE result") comprehensibly rather than as a raw error string, and record the exact text shown.
   This is intended behaviour worth showing on a demo, not a defect.

| Case | Result | Evidence |
|---|---|---|
| 1 — record `start_fab` on `SP-1008-B` | | |
| 2 — weld progress on an open joint | | |
| 3 — `PQC36` on a locked weld | | |

## Order of operations

`npm run verify` must run **before** `demo:showcase`. The pgTAP suite asserts against globally
empty engineering tables, which held only while every stand started empty; a seeded `SHOWCASE-1`
makes those assertions fail. `npm run demo:check` is unaffected and stays green either way.

```zsh
npm run demo:prepare -- --confirm-local-reset
npm run verify
npm run demo:showcase
npm run demo:check
```
