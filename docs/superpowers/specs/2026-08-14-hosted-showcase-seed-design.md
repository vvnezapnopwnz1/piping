# Hosted Showcase Seed Design

**Status:** approved for implementation on 2026-08-14.

## Goal

Make the fabrication/erection/NDE charts (shipped 2026-08-14, reading `fabrication_spool_projections`)
demonstrable on the public hosted stand. Today they cannot be: `SHOWCASE-1`, the project the charts
are built to read, exists only on the local stand. The only existing code path that creates it on
hosted is `npm run demo:prepare:hosted -- --confirm-hosted-reset`, which wipes every hosted Auth
identity and business row and rewrites every demo password — not something to reach for just to add
one project, and forbidden to run unprompted per `CLAUDE.md`.

## Product decision

Add `npm run demo:showcase:hosted`, a new, additive-only command that brings `SHOWCASE-1` onto the
hosted stand without touching anything else there: not `TRACK01-A`, not `TRACK01-B`, not any
existing user, project, referential, or password. It never calls `supabase db reset`. It is safe to
run more than once — every step it takes is already idempotent in the underlying code, or is made so
as part of this work.

It runs in two phases, both gated behind the same hosted-target assertion and an explicit
`--confirm-hosted-showcase-seed` flag every other hosted script in this repo uses.

### Phase 1 — ensure `SHOWCASE-1` exists

Three functions, none of them new logic — narrow extractions/filters of code that already runs
correctly against hosted today, scoped down to touch only the showcase project:

- `prepareShowcaseProject()` — upserts the one `SHOWCASE-1` project row. A filter of the existing
  `prepareProjects()` loop (`scripts/demo/supabase-demo-stand.ts:2639`) to `PROJECT_DEFINITIONS`'
  `showcase` entry only.
- `prepareShowcaseProjectReferences(preparedOn)` — extracted from the showcase-specific block
  already living inside `prepareProjectReferences()`
  (`scripts/demo/supabase-demo-stand.ts:2748-2775`), which already builds its own
  `buildDemoReferencePlan(..., showcaseProjectId)` and reconciles it independently of the
  `TRACK01-A`/`TRACK01-B` batch above it. Lifting it into its own method changes nothing about what
  it does — only that it can be called without also touching the other two projects' referentials.
- `prepareShowcaseAccess()` — new method, same shape as `prepareAccess()`
  (`scripts/demo/supabase-demo-stand.ts:2688`), but iterating only memberships where
  `membership.projectCode === "SHOWCASE-1"`.

Explicitly **not** called: `prepareSystemReferences()` (global, not per-project, already correct on
hosted since the 2026-08-13 baseline reset) and the whole-manifest `prepareProjects()` /
`prepareAccess()` / `prepareProjectReferences()`.

### Phase 2 — seed the engineering data

Reuses `scripts/bootstrap-showcase-dataset.ts` essentially unchanged: it is already idempotent (skips
when `SHOWCASE-1` already holds isometrics) and already drives every stage, weld, release, paint and
laydown through the same `SECURITY DEFINER` commands the browser uses — never a direct table write —
which is exactly the property that makes it safe to point at a real stand. Two changes only:

1. Its `isLocalhost` refusal (`scripts/bootstrap-showcase-dataset.ts:464`) is replaced by
   `assertHostedSupabaseTarget` for the hosted entrypoint (the local script keeps its own guard
   unchanged — this is a new, separate entrypoint, not a relaxation of the existing one).
2. Credential loading switches from `.env.local` to the hosted environment-variable pattern.

Dataset shape is unchanged from local: 8 isometrics, 16 spools, 112 weld joints, progress backdated
across twelve weekly buckets, three PDS areas — the same pure, tested generator
(`scripts/demo/showcase-dataset.ts`) that local seeding uses.

## Scope and safety

- No `supabase db reset`, ever, in this command.
- No write touches a row belonging to `TRACK01-A`, `TRACK01-B`, or any user/membership outside
  `SHOWCASE-1`.
- Gated behind `assertHostedSupabaseTarget` (rejects any non-hosted `SUPABASE_URL`) and
  `--confirm-hosted-showcase-seed`, matching `prepare-hosted-demo.ts` / `check-hosted-demo.ts`
  conventions.
- Idempotent end to end: re-running after a partial or full success is a no-op (project upsert,
  referential reconcile, and the isometrics-count skip in phase 2 are all already idempotent).

## Credentials

- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — from `~/.pipeqc-hosted.env`, loaded the same way
  `demo:check:hosted` already is (`set -a; . ~/.pipeqc-hosted.env; set +a`).
- Publishable key — non-secret (it already ships in the deployed browser bundle). Fetched at
  run-time via `supabase projects api-keys --project-ref lmjkqcdmxehknipeoeye`; no new file, no new
  secret.
- `TRACK01_FIXTURE_PASSWORD` — a real secret, and not present in `~/.pipeqc-hosted.env`. Per
  `CLAUDE.md`, this is never generated, guessed, or requested through chat. The user exports it
  themselves in their own terminal immediately before running the command, the same way the hosted
  reset runbook already asks for it interactively.

## Verification

- Unit tests for `prepareShowcaseProject`, `prepareShowcaseProjectReferences`, and
  `prepareShowcaseAccess` against a mocked gateway, matching the existing style in
  `scripts/demo/supabase-demo-stand.test.ts` — in particular, asserting they never call any
  gateway method with a `TRACK01-A`/`TRACK01-B` project id.
- Existing `showcase-dataset.test.ts` and `bootstrap-showcase-dataset` coverage is unaffected, since
  phase 2's seeding logic is not behaviorally changed — only its target-guard and credential source.
- `npm run lint && npm run typecheck && npm run test:unit` before any hosted run.
- After a hosted run: `npm run demo:check:hosted` should move from 82 PASS / 2 FAIL to 84 PASS / 0
  FAIL, run twice for identical results, matching the verification pattern already used for the
  2026-08-13 hosted baseline reset.
