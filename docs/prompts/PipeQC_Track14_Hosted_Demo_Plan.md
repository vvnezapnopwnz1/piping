# Prompt: write an implementation plan for the hosted PipeQC demo release

**You are writing a PLAN, not code.** Do not edit, create, or delete any application source file,
migration, or test. Do not provision anything, do not run `vercel integration add`, do not touch
git. Your only deliverable is one new plan markdown file. A later, separate session will execute
whatever plan you produce.

## Context

Track 12 closed on 2026-08-12 as `CLOSED — Demo Lite`
(`docs/superpowers/plans/2026-08-10-track-12-demo-release.md`,
`docs/acceptance/track-12-demo-release.md` §7). Track 13 (UX findings polish) has since been
executed. What Track 12 delivered is a **local-only** demo stand: one guarded command
`npm run demo:prepare -- --confirm-local-reset` builds a rich `TRACK01-A` starting state (36
referential families, 6 users with roles and scopes) plus a deliberately sparse `TRACK01-B`
isolation control, all from a versioned manifest.

The roadmap is explicit that production deployment was **not** part of Track 12
(`docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` §24: *"It explicitly does
not deliver: production deployment or configuration…"*).

**The goal of this new track:** publish that exact same stand — filled referentials and created
users with roles — at a public URL, so it can be shown without a laptop and a local Supabase stack.

Read as primary sources, in full, before planning:

- `docs/superpowers/plans/2026-08-10-track-12-demo-release.md` — the local release this extends,
  and the structural example for your own plan's format;
- `docs/acceptance/track-12-demo-release.md` — what was actually proven, especially §4 (known
  limitations) and the Phase B start-state evidence;
- `scripts/demo/` in full — this is the code you are extending;
- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` §24 and §27.4.

## Decisions already made — treat these as closed

These were settled in a design conversation with the product owner. Do not reopen them; plan
against them.

1. **The stand is a disposable showcase.** Data created on it during a demo is expendable. No
   backups, no restore rehearsal, no data-preserving migrations. Re-seeding to a known start state
   is a normal, expected operation.
2. **Access: fixed accounts, sign-up disabled.** The link is public; Supabase sign-up is turned
   off. The only way in is the six manifest accounts, whose passwords the owner hands out
   personally. No open registration, no SMTP, no invite flow.
3. **Lifecycle: long-lived, re-seeded manually.** Code deploys automatically from git. Migrations
   and re-seeding are explicit commands run from the owner's machine. **No automatic destructive
   action in CI, and no reset button inside the application.**
4. **Platform: Vercel + Supabase via the Vercel Marketplace integration, free tier.**
5. **Free-tier pausing is accepted, not engineered around.** Free projects pause after 7 days of
   inactivity; the owner will restore from the dashboard when needed. Do **not** plan a keep-alive
   cron, a ping endpoint, or a Pro upgrade. One honest paragraph in the runbook instead.
6. **Reset mechanism: `supabase db reset --linked`, behind a project-ref guard.** Chosen because it
   needs no new SQL object in the shipped schema and reproduces the local "clean migration replay"
   semantics exactly, so the existing preflight's zero-count expectations hold unchanged. **This
   requires live verification first — see Phase 0 below.**
7. **`typescript: { ignoreBuildErrors: true }` comes out of `next.config.mjs`.** A published build
   must not silently ship type errors.

## Research already done — verify, but don't re-derive

Every claim below was checked on 2026-08-12 against the working tree or live sources. **Re-verify
each one before you rely on it** — treat these as leads with evidence, not as gospel — but do not
spend the session rediscovering them from scratch.

### The Vercel Marketplace Supabase integration

- It is a native integration (`vercel integration discover supabase` → slug `supabase`).
- The projects it creates are ordinary Supabase projects: *"When you create an organization and
  projects through Vercel Marketplace, they function like those created directly within Supabase."*
  Pricing is identical to Supabase direct, including the free tier.
- **It injects 13 environment variables, two of which match this codebase exactly:**
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are precisely the two
  names `lib/supabase/config.ts` requires (note: `PUBLISHABLE_KEY`, not `ANON_KEY`). **No code
  change and no env aliasing is needed to connect the app to the database.** Confirm this against
  `lib/supabase/config.ts` yourself.
- The other eleven include `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD`,
  `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`. **The application reads none of them** — `SERVICE_ROLE`
  does not appear anywhere in `app/`, `lib/`, `modules/`, `components/` or `config/`. On a public
  showcase these are pure leak surface; the plan must remove them from the Vercel project
  environment and include a check that proves they are gone.
- Known constraints: projects can only be created **through the Vercel dashboard** (so provisioning
  is not fully CLI-drivable and needs a human browser step); the Supabase organization is 1:1 with
  the Vercel team and can only be removed by uninstalling the integration; billing runs through
  Vercel; Supabase custom domains are unsupported.
- Source: `https://supabase.com/docs/guides/integrations/vercel-marketplace`.

### Tooling present on the machine

`vercel` CLI 54.1.0, authenticated as `vvnezapnopwnz`. `supabase` CLI at `/opt/homebrew/bin/supabase`.
**`psql` is NOT installed** — do not plan any step that shells out to `psql`.

Note the CLI surface has drifted from some documentation: `vercel integration categories` does not
exist in 54.1.0. Valid subcommands are `add | accept-terms | open | list | installations | discover
| guide | balance | remove | update`, and `discover` takes a bare query, not `--category`. Verify
any Vercel CLI invocation you put in the plan by running its `--help` first.

### Supabase MCP

The official server (`https://mcp.supabase.com/mcp`, added with
`claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp"`) can apply
migrations, run SQL, list tables, return project URL and keys, generate TypeScript types, and read
logs and security advisors. It supports `read_only=true` and `?project_ref=<id>` scoping.

**It cannot manage Auth users.** Creating the six accounts with their roles therefore stays in this
repository's service-role code and cannot be delegated to MCP. Treat MCP as an optional, read-only
debugging aid for the live stand — plan it as such or leave it out, but do not build the seeding
path on it.

### State of the code you are extending

- `scripts/demo/manifest.ts`, `scripts/demo/prepare.ts` and `scripts/demo/preflight.ts` contain **no
  localhost assumptions** (grepped for `localhost`, `127.0.0.1`, `::1`, `http://` — no hits). The
  pure orchestrator `prepareDemoStand(port, password, preparedOn)` and the evaluator
  `evaluateDemoStand(snapshot)` should need **zero changes**.
- **The localhost guard is not confined to the CLI.**
  `scripts/demo/supabase-demo-stand.ts:5234` — `createSupabaseDemoStandCore(url, serviceRoleKey,
  gatewayFactory)` calls `assertLocalSupabaseTarget(url)` directly. This is the single blocking
  change: the guard must become injectable, defaulting to the local one so Track 12's behaviour is
  bit-for-bit unchanged.
- `scripts/demo/supabase-demo-stand.ts` is **5245 lines**. Do not plan a rewrite or a broad
  refactor of it. Plan the narrowest possible extraction that lets the guard be injected; if you
  believe a larger split is warranted, argue for it explicitly rather than smuggling it in.
- `netlify.toml` is a dead artifact from commit `3e0f92e` (it sets
  `NETLIFY_NEXT_PLUGIN_SKIP = "true"` while also enabling `@netlify/plugin-nextjs`). The repo
  targets Vercel — `@vercel/analytics` is a dependency and is mounted in `app/layout.tsx:63`. Plan
  its deletion.
- `NEXT_PUBLIC_PIPEQC_MODE` is **no longer read by any code** — the demo-mode split is gone and the
  app is Supabase-only. Do not set it. Older docs still mention it; those references are stale.
- There is **no `middleware.ts`**. Auth is client-side and RLS is the real security boundary. That
  is consistent with this project's extensive pgTAP coverage, but the plan's acceptance phase must
  exercise role and project isolation against the **public** URL, not assume local results carry
  over.
- There are 93 migrations in `supabase/migrations/`. There is no `supabase/seed.sql`.
- The current branch is `feat/supabase-real-mode`, not `main`.

## What the plan must decide

1. **Phase 0 — prove the reset mechanism before anything depends on it.** Verify live that
   `supabase db reset --linked` actually works against a Marketplace-provisioned project. If it is
   restricted or unavailable, the fallback is to delete the Supabase resource and provision a fresh
   one — the integration re-injects the environment variables and the public application URL does
   not change. The plan must specify how this is verified and what the decision rule is, and no
   later task may assume the answer.
2. **The production branch.** Vercel deploys production from one branch; the repo is on
   `feat/supabase-real-mode`. Decide and justify: merge to `main` first, or point Vercel's
   production branch at the feature branch. Consider `superpowers:finishing-a-development-branch`.
3. **Where the expected project ref lives.** The remote guard must compare the target against an
   expected, committed value so a mis-linked CLI cannot seed or wipe the wrong database. Decide the
   file and shape. Note the guard for the cloud must be *stricter* than the local one: local only
   asks "is this localhost", the remote one must pin one specific project.
4. **Track numbering and naming.** Check the master roadmap's numbered T0–T12 scheme and the
   ad-hoc tracks that followed (Track 12, Track 13). Pick something that collides with neither and
   state your reasoning.
5. **Auth configuration steps.** Disabling sign-up, Site URL, and the redirect allow-list are
   dashboard actions, not code. Decide how they are recorded so they are reproducible and
   verifiable — and how the plan proves sign-up is actually off rather than assuming it.
   Note: `admin.createUser({ email_confirm: true })` sends no mail, so the manifest's
   `@example.test` addresses work without SMTP; the accepted cost is that these accounts have no
   password recovery. Confirm the manifest's actual email domain rather than trusting this line.

## What the plan must contain

Follow this repository's plan conventions — use
`docs/superpowers/plans/2026-08-10-track-12-demo-release.md` as the structural example (Goal,
Architecture, Tech Stack, sources and fixed scope, execution preconditions, file map, numbered Tasks
with checkbox `- [ ]` Steps, a final verification matrix, a completion definition). Use the
`superpowers:writing-plans` skill if available; otherwise match that file's structure and rigor by
hand.

Specific requirements:

- **Test-first, matching Track 12's discipline.** The new guard and the new CLI's argument parsing
  are pure functions and must have failing tests written before implementation, in the style of
  `scripts/demo/local-target.test.ts`.
- **Prove Track 12's local path still works.** Making the guard injectable touches a shared
  constructor. The plan needs an explicit regression check that `npm run demo:prepare --
  --confirm-local-reset` and `npm run demo:check` behave exactly as before.
- **A guard test that proves the dangerous case is impossible**, not merely untested: a remote
  target whose project ref differs from the expected one must be rejected before any reset,
  network call, or auth-admin operation happens.
- **Secret discipline.** The service role key exists only in the operator's shell during a
  re-seed. It must never enter the Vercel environment, the repository, runbook text, command output,
  or screenshots. Carry Track 12's masked-input convention forward.
- **Phased gates**, in the style of Track 12's Phase A/B/C:
  - Phase 0: reset-mechanism verification (above);
  - Phase A: the existing local gates unchanged — lint, typecheck, unit, build, full pgTAP,
    generated-type diff, `git diff --check`;
  - Phase B: publish to the hosted stand, then the read-only remote check run **twice** with
    identical output, proving it mutates nothing;
  - Phase C: browser acceptance against the **public URL**, reusing `docs/runbooks/track-12-demo.md`
    rather than inventing different business values, plus role denial and `TRACK01-A`/`TRACK01-B`
    isolation, plus a check that the eleven unused environment variables are absent.
- **A presenter-facing runbook** for the hosted stand: how to publish, how to re-seed, what to do
  when the free-tier project is paused, and which two accounts to demo with. It must not duplicate
  `track-12-demo.md`'s business script — reference it.
- **Honest scope exclusions**, carried from Track 12 and extended: no backups, no offline/PWA, no
  Storage-backed report artifacts, no monitoring, no load testing, no custom domain, no scheduled
  re-seeding, no open registration.
- **A task that removes `ignoreBuildErrors`** from `next.config.mjs` and deals with whatever type
  errors that surfaces. Treat the size of that fallout as unknown: the plan must include a step
  that measures it first (`npm run typecheck` already runs `tsc --noEmit`) and must state what
  happens if it turns out large — this task must not be allowed to silently swallow the track.

## Output

One new file: `docs/superpowers/plans/2026-08-12-track14-hosted-demo-release.md` (adjust the
filename if you land on a different track name/number per the section above — keep the date prefix).
Do not modify any other file. Do not run tests, do not start the dev server, do not provision
anything, do not touch git.

When you're done, report back a short summary: the track name/number you chose and why, how many
tasks, what you decided about the production branch, and — most importantly — anything in the
"Research already done" section above that you checked and found to be **wrong or out of date**.
