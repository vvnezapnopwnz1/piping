# Prompt: write an implementation plan for the fabrication charts

**You are writing a PLAN, not code.** Do not edit, create, or delete any application source file,
migration, script, or test. Do not run `demo:prepare`, do not touch the hosted stand, do not touch
git. Your only deliverable is one new plan markdown file. A later, separate session will execute
whatever plan you produce.

## Context

PipeQC's screens are tables. They are correct and dense, and they say nothing about *shape* — a
reader cannot tell from `/fabrication/dashboard` whether the project is accelerating or stalled.
Before the Supabase migration the app carried rich dashboards: `components/fabrication-dashboard.tsx`
(951 lines — planned-vs-actual line chart, cumulative weld area chart, first-time-pass radial gauge,
defect pie, weld-status matrix) and friends, all deleted in `dc221f5` because every series was a
hardcoded array. The reasoning is preserved verbatim at `app/page.tsx:6-14`: the old home page
"reported 'Welds requiring action 1' and 'NDE batches active 4' — figures a reader had no way to
tell were invented."

Two things have changed since, and together they unblock charts.

**Track 15 produced data with time depth.** `SHOWCASE-1` is a seeded, deliberately populated third
project: 8 isometrics, 16 spools, 112 weld joints, progress backdated across twelve weekly buckets,
three PDS areas. It is built by `npm run demo:showcase` after `demo:prepare`, exempted from the
empty-at-start rule, and it exists precisely so that dashboards have something honest to draw. See
`scripts/demo/showcase-dataset.ts` and `docs/qa/track-15-showcase-sweep.md`.

**A bounded read model now exists.** `public.fabrication_spool_projections`
(`supabase/migrations/20260818090000_fabrication_spool_projection.sql`) is a narrow, indexed table
carrying, per accepted spool revision: all eight fabrication stage dates (`start_fab_on`,
`material_check_on`, `fabricated_on`, `qc_release_on`, `sent_to_paint_on`, `painted_on`,
`final_qc_on`, `laydown_on`), `current_stage`, `pds_area_id`, and the counters `line_total/checked`,
`weld_total/complete`, `support_total/recorded`, `nde_pending`, `pwht_pending`. It is kept current by
ten triggers on the underlying ledgers
(`20260818091000_fabrication_spool_projection_refresh.sql:77-114`).

**Every chart this track needs is servable from that one table.** That is the central architectural
fact of the track and the reason it is small.

The chart infrastructure survived the 2026-08-05 deletion and is still unused: `recharts@2.15.0` is
a dependency (`package.json:78`) and `components/ui/chart.tsx` (351 lines — `ChartContainer`,
`ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`) is intact.
Charts cost zero new dependencies.

## Measured evidence you must plan against

Taken on the seeded `SHOWCASE-1` (16 spools, 112 welds) as an `authenticated` user, through
PostgREST, with RLS on:

| Source | Time | Rows |
|---|---|---|
| `fabrication_spool_stage_counts` RPC | **10 ms** | aggregate |
| `nde_obligations` / `nde_results` | 33 / 27 ms | 82 / 62 |
| `spool_erection_readiness` | 650 ms | 16 |
| `weld_progress_summary` | 979 ms | 112 |
| `spool_construction_status` | **8048 ms — `57014` statement timeout** | — |

`spool_construction_status` joins `spool_fabrication_readiness` on `spool_revision_id`; under RLS the
planner cannot hash that join, produces a nested loop at `loops = 256` for 16 spools, and re-runs the
readiness aggregates inside every iteration. It is O(n²) in visible spools. The fabrication screens
were moved off it onto the projection; the view still exists and is now referenced only by a comment
(`app/page.tsx:11`). `spool_erection_readiness` and `weld_progress_summary` carry the same defect,
undetonated, at 650 ms and 979 ms on a sixteen-spool project.

## Decisions already made — treat these as closed

Settled with the product owner. Do not reopen them; plan against them.

1. **Fabrication only.** Erection charts are a separate, later track — they need
   `spool_erection_readiness` fixed first, which is its own piece of work. The home-page roll-up is
   also a later track. Do not widen.
2. **Read `fabrication_spool_projections`, never `spool_construction_status`.** No chart may read
   `spool_erection_readiness` or `weld_progress_summary` either. If a chart you want cannot be served
   from the projection, it belongs to a later track — say so in the plan rather than reaching for a
   slow view.
3. **Aggregate in SQL, return tens of rows.** Every chart is fed by a `SECURITY DEFINER` RPC that
   mirrors `fabrication_spool_stage_counts`
   (`20260818094000_fabrication_projection_stage_counts.sql`) exactly: `current_user_has_capability(
   target_project_id, 'fabrication.view')` guard raising `42501`, `current_user_in_pds_scope(...)`
   in the predicate, `revoke all … from public, anon`, `grant execute … to authenticated`,
   `set search_path = public, pg_temp`. Reasons in landmine 2.
4. **Actual only — there is no baseline.** Verified: planned dates exist nowhere in the schema except
   test packs (`test_packs.planned_start_on/planned_end_on`,
   `20260813091000_test_pack_core.sql:20-21`). A planned-vs-actual curve cannot be drawn honestly.
   Do not invent, interpolate, or straight-line a plan series. The S-curve is labelled as actual
   cumulative progress and nothing else. Inventing this line is the exact failure that got the old
   dashboards deleted.
5. **The stage cards stay.** `fabrication-overview.tsx:87-102` renders six exact numbers from the
   10 ms aggregate. They are correct and readable. Charts are added *around* them, never as a
   replacement — a picture that costs the reader the exact figure is a downgrade.
6. **Every chart has an explicit empty state.** Not a flat line at zero, not an empty axis: a stated
   "no fabrication progress recorded yet". This is the common case, not the edge case —
   `TRACK01-A`, the project the live walkthrough runs on, is empty by design and stays that way.
7. **Three charts, in this order of priority.** All three are servable from the projection:
   - **Cumulative fabrication progress over time (the S-curve).** Weekly buckets over the project's
     recorded range; per bucket, the cumulative count of spools that had reached each milestone by
     then. This is the headline chart and the one an EPC reader looks for first.
   - **Stage distribution.** Where the spools stand now, drawn in pipeline order so the funnel shape
     is visible. Complements the cards: the cards give the figure, the chart gives the shape.
   - **Progress by PDS area.** Per area, spools complete vs in progress vs not started — the "where
     is the bottleneck" chart. `SHOWCASE-1` carries three areas at 3 / 3 / 2 ISO.

   A fourth is optional and only if the first three land cleanly: **weld completion by area**, from
   `weld_total` / `weld_complete`, which measures joints rather than spools and is therefore a
   genuinely different number rather than the same chart rescaled.

## Landmines — verify each yourself, then plan around it

Every `file:line` below must be re-verified against the current working tree before you rely on it;
cite what you actually find.

**1. The projection is populated by trigger, so an un-backfilled project charts as empty.** The
triggers fire on write; rows that predate the migration arrive through
`scripts/backfill-fabrication-spool-projection.ts`. A chart reading an unbackfilled project shows a
correct-looking empty state over data that exists, which is worse than an error. Your plan must say
how the verification pass distinguishes "genuinely no progress" from "projection not backfilled" —
`scripts/check-fabrication-projection.ts` exists and is the obvious lever.

**2. `max_rows = 1000` (`supabase/config.toml:18`) truncates silently, and the worklist is now a
cursor page.** Two independent reasons a chart must never be computed in the browser from rows the
screen already has: PostgREST caps responses at a thousand rows with no error, and
`loadFabricationSpoolPage` (`modules/construction/infrastructure/supabase-construction-repository.ts:258`)
returns one 50-row page, so a client-side reduce would chart the current page and silently relabel it
as the project. The comment at `fabrication-overview.tsx:18-21` already states this rule for the
cards; charts inherit it. State in the plan, per chart, the expected number of rows its RPC returns.

**3. `ChartContainer` has never been rendered in this codebase.** It has sat unused since the
dashboards were deleted, through upgrades to React 19 and Next 16. Do not assume it works. The plan's
first task must be a spike that renders one trivial chart and confirms it: recharts 2.15.0's
`ResponsiveContainer` is a long-standing source of SSR/hydration warnings and zero-height containers,
and the screens it must live in are client components (`"use client"` at
`fabrication-overview.tsx:1`). If it needs a fix or a wrapper, that is a task, not a footnote.

**4. The five chart tokens are one blue ramp.** `--chart-1 … --chart-5` are `#3b82f6 → #1e3a8a` in
light (`app/globals.css:45-49`) and `#60a5fa → #1e40af` in dark (`app/globals.css:104-108`). That is
correct for sequential data — a cumulative curve, an area stack — and unreadable for categorical
data, where five stages become five indistinguishable blues. Categorical series must take their
colour from `components/ui/status-tone.ts`, so that a stage is the same colour in the chart as on its
`StatusBadge` in the table beside it. Both themes must be checked; the tokens differ between them.

**5. Stage dates are dates, not events, and some are null.** The projection stores the eight stage
columns as `date`, any of which may be null, and a spool can skip a stage. Weekly bucketing must be
done in SQL over a generated series so that a week with no activity is a zero rather than a missing
point — recharts will happily connect across a gap and draw a straight line through a month nothing
happened in. State the bucket boundary rule (which day starts a week, UTC) explicitly; the seed
generator uses UTC dates (`scripts/demo/showcase-dataset.ts`).

**6. Weighted percent is available but the mapping is not.** `project_progress_weights`
(`20260727145210_project_settings_and_referentials.sql:418`) is a per-project referential with
`phase in ('prefabrication','painting','erection')`, an `activity` code and a `weight`. The demo
manifest seeds prefabrication as `spool_fabrication 30 / material_check 20 / weld_progress 30 /
qc_release 20` (`scripts/demo/manifest.ts:1312-1341`). So a weighted curve is buildable — but the map
from those activity codes to projection columns does not exist anywhere in the tree, weights are
per-project and editable at `/admin/progress-weights`, and a project may define activities that map
to nothing. Decide explicitly: either a count-based curve (simpler, obviously honest, and what the
cards already speak) or a weighted one (closer to how EPC progress is actually reported), and if
weighted, specify the mapping, where it lives, and the behaviour when a project's weights do not sum
to 100 or name an unknown activity. Do not leave this implicit.

**7. RLS is the reason the RPC shape is not negotiable.** The restrictive PDS guard
(`20260817091000_pds_area_scope_restrictive_guard.sql`) narrows by AND across the whole permissive
set. A chart RPC that omits `current_user_in_pds_scope` would show a PDS-scoped subcontractor the
whole project's curve — a silent data leak that no screen would reveal, because the chart has no row
list to cross-check. The plan must state which showcase persona each verification step signs in as;
note that `SHOWCASE-1`'s memberships are deliberately unscoped
(`scripts/demo/manifest.ts`), so proving the scoping works needs a scoped persona and possibly a new
membership.

**8. The pgTAP suite runs against an empty stand.** `npm run verify` must run **before**
`demo:showcase`, per `CLAUDE.md`; several database tests count engineering rows project-wide and fail
against a seeded `SHOWCASE-1`. New pgTAP tests for the chart RPCs must therefore build their own
fixtures inside the test transaction rather than assuming the showcase data is present.

## Scope boundary

In: the three charts above on the fabrication screens, their aggregation RPCs, their tests, and
whatever `components/ui/chart.tsx` needs to actually work.

Out, each with its owning future track named in the plan: erection charts and the
`spool_erection_readiness` performance defect; NDE quality charts (accept/reject, rejection rate by
welder) and the `weld_progress_summary` defect; the home-page cross-module roll-up; tracking and
test-pack charts; any change to `max_rows`; any baseline/planned-schedule feature.

## Verification the plan must design

1. **Numbers before pictures.** Each RPC gets a pgTAP test asserting its aggregate against fixtures
   it creates itself, plus the capability and PDS-scope guards (a caller without `fabrication.view`
   gets `42501`; a PDS-scoped caller sees only their area). This is the pass that makes the chart
   trustworthy; the rest is presentation.
2. **Unit tests on the shaping code.** Whatever turns RPC rows into series — bucket labels, cumulative
   running totals, empty-state detection, colour assignment — is a pure function and tested as one,
   the way `scripts/demo/showcase-dataset.test.ts` tests the seed generator. No renderer needed.
3. **A browser pass on `SHOWCASE-1` against known figures.** The seed's shape is documented and
   exact, so this is an assertion rather than an eyeball: stage distribution `laydown` 4,
   `qc_release` 3, `painted` 3, `material_check` 5, not started 1; three PDS areas at 3 / 3 / 2 ISO;
   eleven of twelve weekly buckets carrying progress; 16 spools total. Every chart must reproduce
   those. Record the observed values beside the expected ones the way
   `docs/qa/track-15-showcase-sweep.md` does.
4. **A browser pass on `TRACK01-A`**, which is empty, confirming every chart renders its empty state
   and none of them breaks the live-import walkthrough. Then a second look after the walkthrough's
   import step, confirming the charts populate from data imported in front of the viewer.
5. **A timing assertion.** The whole point of the projection is that the screen is fast. State the
   budget each chart RPC must meet on `SHOWCASE-1` and how it is measured; the existing figure to
   beat is the 10 ms of `fabrication_spool_stage_counts`. A chart that reintroduces a multi-second
   dashboard has failed regardless of how it looks.

## What the plan needs to contain

Follow this repository's plan conventions —
`docs/superpowers/plans/2026-08-13-track15-showcase-seed.md` and
`docs/superpowers/plans/2026-08-12-track14-hosted-demo-release.md` are the structural examples (Goal,
Architecture, Tech Stack, file map, numbered Tasks with checkbox Steps, definition of done). Use the
`superpowers:writing-plans` skill if available; otherwise match those files' structure and rigour by
hand. Include:

1. **The `ChartContainer` spike as task 1**, per landmine 3, with an explicit go/no-go: if the shadcn
   wrapper cannot be made to work, say what replaces it before any chart is designed on top of it.
2. **One migration per RPC**, with the exact `returns table (...)` signature, the guard clauses, and
   the grants — written out, not described.
3. **The series contract** between SQL and React: what each RPC returns, what the shaping function
   turns it into, what `ChartConfig` the component builds. Landmine 4's colour rule resolved
   concretely, per series.
4. **Where each chart lands on screen.** `/fabrication/dashboard` is the obvious home for all three,
   but three charts plus six cards plus a 50-row table is a long page — state the layout, what is
   above the fold, and whether any chart belongs on a worklist screen instead
   (`app/fabrication/` holds nine routes).
5. **The weighted-vs-count decision from landmine 6**, resolved with reasoning.
6. **Sequencing** that keeps the dashboard shippable after every task, with the verification passes
   as real tasks rather than a trailing "test it".
7. **Track numbering** — `docs/superpowers/plans/` runs to track 15
   (`2026-08-13-track15-showcase-seed.md`), so 16 is the obvious next number; confirm nothing else
   has claimed it.
8. **An explicit non-goals section** matching the scope boundary above, naming the owning track for
   each deferred item.

## Output

One new file: `docs/superpowers/plans/2026-08-13-track16-fabrication-charts.md` (adjust the name if
you land on a different track number per item 7 — keep the date prefix). Do not modify any other
file. Do not run tests, do not start the dev server, do not touch git. When you're done, report back
briefly: the three RPC signatures you specified, the weighted-vs-count decision and why, how many
tasks, and any landmine above that you found to be stated incorrectly once you verified it against
the tree.
