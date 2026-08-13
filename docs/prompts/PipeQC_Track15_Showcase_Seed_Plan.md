# Prompt: write an implementation plan for the showcase demo dataset

**You are writing a PLAN, not code.** Do not edit, create, or delete any application source file,
migration, script, or test. Do not run `demo:prepare`, do not touch the hosted stand, do not touch
git. Your only deliverable is one new plan markdown file. A later, separate session will execute
whatever plan you produce.

## Context

PipeQC's demo stands deliberately start empty. `EMPTY_AT_DEMO_START`
(`scripts/demo/manifest.ts:352-374`) lists twenty-one engineering and progress tables that
`npm run demo:prepare` leaves at zero rows, because the SpoolGen import is performed live in the UI
during the walkthrough. The fixture that import consumes is tiny: `demo-data/spoolgen/*.txt` is
nineteen lines total — five weld joints, roughly three spools, two isometrics.

That is correct for the live-import demo and useless for anything that needs a shape. Before the
Supabase migration the app carried rich dashboards — `components/fabrication-dashboard.tsx` (951
lines: planned-vs-actual line chart, cumulative weld area chart, first-time-pass radial gauge,
defect pie, weld-status matrix), `components/erection-dashboard.tsx` (1168 lines),
`components/tracking/tracking-scan-trend.tsx`, and radial gauges in the test-pack screens. All of
them were deleted in `dc221f5` ("feat(erection): real screens, and the demo implementation
removed") because every series was a hardcoded array. The reasoning is preserved verbatim in
`app/page.tsx:6-14`: the old home page "reported 'Welds requiring action 1' and 'NDE batches active
4' — figures a reader had no way to tell were invented."

The chart infrastructure survived that deletion and is currently unused: `recharts@2.15.0` is still
a dependency and `components/ui/chart.tsx` (351 lines — `ChartContainer`, `ChartTooltip`,
`ChartLegend`, `ChartStyle`) is intact. Restoring charts therefore costs zero new dependencies.

**What blocks charts is not chart code — it is that there is no data with time depth to chart.**
This track produces that data. Charts themselves are the *next* track and are explicitly out of
scope here; see "Scope boundary" below.

## Decisions already made — treat these as closed

Settled in a design conversation with the product owner. Do not reopen them; plan against them.

1. **Small on purpose.** 5–10 isometrics, not sixty. Target shape: ~8 ISO, ~16 spools, ~100–120
   weld joints, spread over the three PDS areas the manifest already defines (`PDS-100`, `PDS-200`,
   `PDS-300` — `scripts/demo/manifest.ts:690-709`). The owner explicitly asked for a dataset small
   enough to be obviously safe.
2. **Time depth is the point, not row count.** Progress events must be backdated across roughly
   twelve weeks. Ten isometrics whose progress all lands on one date produce a vertical line, not an
   S-curve; the same ten spread over twelve weekly buckets produce a readable one. If you trade
   anything away while planning, do not trade away the backdating.
3. **A separate project, never TRACK01-A.** The live-import walkthrough on `TRACK01-A` stays
   exactly as it is — it is the strongest part of the demo. The showcase dataset lives in its own
   project, reached by switching projects in the UI.
4. **Seeded data is honestly seeded.** It is never presented as something imported in front of the
   viewer. This is a hard constraint from the acceptance protocol, not a preference — see
   `docs/qa/track-12-agent-walkthrough.md:285` (N8), which makes any unmarked number a FAIL.
5. **The seed writes through the same commands the UI uses**, wherever a command exists. Rationale
   in "Landmine 4" below. This is the single most important design decision in the track.
6. **Mixed states by construction.** The dataset must contain spools at different pipeline stages
   (some through to laydown, some mid-fabrication, some untouched) and both NDE-locked and still-open
   weld joints. Reasons in "Landmine 5".
7. **Idempotent, with an explicit rebuild flag.** Create-if-absent by default; refuse to touch an
   existing showcase project unless an explicit `--reset-showcase`-style flag is passed, mirroring
   the existing `--confirm-local-reset` guard.

## Landmines — verify each yourself, then plan around it

These were found by reading the tree during the design conversation. Every `file:line` below must be
re-verified against the current working tree before you rely on it; cite what you actually find.

**1. `demo:check` fails on a third project — this is the one that changes the shape of the work.**
`projectCheck` (`scripts/demo/preflight.ts:324-374`) compares the observed project set against
`[golden, isolation]` with an exact-set match: `expectedRows.length === actualRows.length &&
difference.unexpected.length === 0` (lines 351-355). A third project reports `unexpected
codes=…` and goes red.

The emptiness checks, by contrast, *are* project-scoped and safe: `emptyTableChecks`
(`preflight.ts:716-737`) iterates `PROJECT_DEFINITIONS`, and `emptyCounts` is keyed by
`activityCode` (`scripts/demo/supabase-demo-stand.ts:2905-2927`), where `PROJECT_DEFINITIONS` is
just `[golden, isolation]` (`supabase-demo-stand.ts:2215-2218`).

So the showcase project must be **declared in the manifest as a third project** and **explicitly
exempted from `EMPTY_AT_DEMO_START`** — it is by design the one project that holds data. That means
planned changes to `manifest.ts`, `supabase-demo-stand.ts` and `preflight.ts`, plus new checks
asserting the showcase project's *expected* row counts rather than zero. The stand's total check
count moves off 84; state the new expected number in your plan, and note that the count is written
into the project instructions at `CLAUDE.md:11` ("84 contract checks, exit 0 when green"), which
must be updated in the same slice that changes it.

**2. `max_rows = 1000` (`supabase/config.toml:18`) truncates silently.** PostgREST caps every
response at a thousand rows. Repositories essentially never paginate — one `.limit()` call in all of
`modules/*/infrastructure/` — and the shared table paginates *client-side after fetching everything*
(`components/ui/data-table/data-table.tsx:146-152`). A dataset that pushes any view past the cap
shows wrong data with no error. At the sizes in decision 1 the largest view (`weld_progress_summary`,
~120 rows) has enormous headroom, so this is not a blocker — but your plan must state the expected
row count per view and treat those numbers as assertions, because they are what proves the ceiling
was never approached.

**3. `supabase db reset` wipes everything.** `scripts/prepare-track12-demo.ts:72` spawns it. The
showcase seed therefore cannot be a one-off manual step; it must be a scripted, idempotent command
that runs *after* `demo:prepare`, following the established `bootstrap:trackNN-browser-fixtures`
pattern (ten such scripts already exist; `package.json` shows the `tsx --env-file-if-exists=.env.local`
invocation they share). Decide and state whether it becomes a new npm script, a flag on
`demo:prepare`, or a step in the runbook.

**4. Ordering rules live inside the RPCs, not in the schema — this is why decision 5 exists.**
`record_construction_progress` raises `PQC32` ("Fabrication must start before painting is sent") in
the function body; the progress tables carry no ordering constraints. Meanwhile the existing
bootstrap scripts write almost entirely with direct inserts (track10: 14, track08: 10, track05: 10,
track09: 5) and barely any RPC. That is fine for small hand-written fixtures and wrong for a
programmatically generated twelve-week history: direct inserts can produce states the UI believes
impossible, and the user who then clicks a stage gets a `PQC32` wall that makes no sense against
what the screen shows. Writing through `record_construction_progress`, `record_erection_progress`,
`record_field_material_check`, `record_field_support_progress` and the weld/NDE/test-pack commands
guarantees every seeded state is reachable through the UI — which is exactly the property that makes
the data safely editable. Direct writes stay allowed for the engineering baseline (isometrics,
spools, weld joints), which already has an RPC path in `scripts/spoolgen-fixture-import.ts`.

**5. Some seeded rows will be read-only by design, and that must be deliberate.** Weld joints taken
through an accepted NDE result lock: `is_locked = true`, enforced by real DB triggers
(`supabase/migrations/20260804092200_weld_progress_locks.sql:43-49`) that fire for every writer
including `service_role`, with `PQC36` raised on any attempt to change WPS, subcontractor or weld
date outside `correct_weld_progress`. Clicking a "finished" weld during a demo will therefore
produce an error. Seed a deliberate mix so there is always something editable to click, and record
the locked ones in the walkthrough as an intended behaviour to *show* ("the system will not let you
rewrite history after NDE"), not a rough edge to avoid.

**6. Editing seeded data is otherwise safe — confirm this and say so in the plan**, because it is the
reassurance the walkthrough is designed to prove. Construction progress is append-only events
(`construction_progress_events` plus views computing `max(occurred_on) filter (where stage = …)` in
`supabase/migrations/20260804094000_construction_projections.sql`), and `authenticated` holds no
direct write privilege on the progress tables at all (`20260804090000_fabrication_progress.sql:310`,
`20260804092000_weld_progress_commands.sql:155`), so every browser write goes through a
`SECURITY DEFINER` command.

**7. RLS.** The showcase project needs memberships and access rows, and the restrictive PDS-area
guard (`supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql`) means you must
decide explicitly which manifest users see the whole showcase scope. Get this wrong and screens
render empty, which reads as a broken feature rather than a permissions gap.

## Scope boundary

This track delivers **the dataset and the proof that it is safe** — nothing visual. No chart
components, no dashboard screens, no changes to `components/ui/chart.tsx`, no new
`recharts` usage. The follow-up track consumes what this one produces.

Your plan must nonetheless state, in one short section, the **chart-shaped requirements the dataset
must satisfy**, so the seed is designed against them rather than blindly: cumulative stage dates
across the twelve weeks (S-curve), spread across the three PDS areas (per-area comparison), a
non-trivial NDE accepted/rejected split (quality charts), several distinct welders carrying enough
joints each to compare (welder performance), and location/tracking events if they are cheap to add.
Name the read models each requirement lands on — `spool_construction_status`,
`spool_erection_readiness`, `weld_progress_summary`, `tracking_location_occupancy` and friends
already carry the needed columns.

## Verification the plan must design

Three passes, in this order, and the plan must say what evidence each produces:

1. **Regression on the untouched path** — the existing golden path
   (`docs/qa/track-12-agent-walkthrough.md`, positive spine §3 plus negative matrix N1–N8) run on
   `TRACK01-A`, proving the showcase project changed nothing about the live-import demo. Note that
   this walkthrough is written against an empty stand with live import and must **not** be
   re-pointed at the showcase project.
2. **A new short module sweep on the showcase project** — every module screen opened, and the row
   count in each table's footer compared against the seed's expected counts. This is the pass that
   catches silent `max_rows` truncation and empty-from-RLS screens, and it is cheap precisely because
   the footer already prints `N of M`.
3. **An edit pass** — open the showcase project, record progress on a couple of spools through the
   real UI, confirm the command succeeds and the derived views move. This is what catches any state
   the seed reached by going around the commands, and it must include one deliberate attempt at a
   locked weld to confirm `PQC36` surfaces as a comprehensible message.

## What the plan needs to contain

Follow this repository's plan conventions — `docs/superpowers/plans/2026-08-12-track14-hosted-demo-release.md`
and `docs/superpowers/plans/2026-08-10-track-12-demo-release.md` are the structural examples (Goal,
Architecture, Tech Stack, file map, numbered Tasks with checkbox Steps, definition of done). Use the
`superpowers:writing-plans` skill if available; otherwise match those files' structure and rigor by
hand. Include:

1. **The dataset specification** — exact counts (ISO, spools, weld joints, welders, areas), the
   twelve-week event distribution, which spools sit at which stage, which welds end up locked, and
   the resulting expected row count for every view the module sweep will check.
2. **The manifest/preflight changes** from landmine 1, stated as a file map with the new expected
   check count.
3. **The seeding mechanism** — which commands are called in what order, what stays a direct write and
   why, how idempotency and the rebuild flag work, and where it hooks into the demo flow given
   landmine 3.
4. **The showcase project's identity** — activity code, title, and which manifest users get which
   access, resolving landmine 7 explicitly. Any code other than `TRACK01-A`/`TRACK01-B` is free.
5. **Sequencing**, with the three verification passes placed as real tasks rather than a trailing
   "test it" step.
6. **Track numbering** — `docs/superpowers/plans/` currently runs to track 14
   (`2026-08-12-track14-hosted-demo-release.md`), so 15 is the obvious next number; confirm nothing
   else has claimed it and state your reasoning.
7. **An explicit non-goals section** naming charts, server-side pagination and any `max_rows` change
   as out of scope, with a pointer to which future track owns each.

## Output

One new file: `docs/superpowers/plans/2026-08-13-track15-showcase-seed.md` (adjust the name if you
land on a different track number per item 6 — keep the date prefix). Do not modify any other file.
Do not run tests, do not start the dev server, do not touch git. When you're done, report back
briefly: the final dataset shape you specified, the new `demo:check` count, how many slices, and any
landmine above that you found to be stated incorrectly once you verified it against the tree.
