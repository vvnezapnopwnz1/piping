# PipeQC — project instructions

## Local stand credentials: never invent them

`TRACK01_FIXTURE_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` for the **local**
stand live in `.env.local` (gitignored). The local npm scripts load that file themselves via
`tsx --env-file-if-exists=.env.local`, so they need **no exports and no inline values**:

```zsh
npm run demo:prepare -- --confirm-local-reset   # supabase db reset + users + referentials
npm run demo:check                              # 84 contract checks, exit 0 when green
npm run bootstrap:track01-browser-fixtures      # per-track fixtures, same rule
```

Rules:

- **Never** generate, guess, or substitute a fixture password. If `.env.local` is missing a value,
  stop and ask — do not pick one. A made-up password silently overwrites every account's password
  in `auth.users` and locks the operator out of their own stand.
- **Never** pass `TRACK01_FIXTURE_PASSWORD=…` or `SUPABASE_SERVICE_ROLE_KEY=…` inline on a command
  line. Inline values land in shell history and in `.claude/settings.local.json` permission entries.
- Shell exports still win over `.env.local`, which is what the hosted flow relies on
  (`set -a; . ~/.pipeqc-hosted.env; set +a`) — so never export local values before a `:hosted` command.
- Never print, echo, or write a secret value into a file, doc, screenshot, or commit.

The interactive `read -r -s` procedure in the runbooks is for a **human presenter** at a TTY. An
agent has no TTY: it reads `.env.local` through the npm scripts instead, and never improvises.

## Local stand reset

`npm run demo:prepare -- --confirm-local-reset` refuses any non-local Supabase origin. It seeds
users, projects, access, system references and project referentials, and deliberately leaves the
engineering tables (`import_jobs`, `isometrics`, `spools`, and every progress table in
`EMPTY_AT_DEMO_START` in `scripts/demo/manifest.ts`) empty — the spooling import is performed live
in the UI. **Never seed those tables on `TRACK01-A` or `TRACK01-B`.**

`SHOWCASE-1` is a third, deliberately **populated** project holding the seeded dataset the
dashboards read. It is listed in `EXEMPT_FROM_EMPTY_AT_DEMO_START`, so the empty-at-start rule
skips it while `demo:check` still verifies it exists. It is built by `npm run demo:showcase`
**after** `demo:prepare` — never inside it, because `demo:prepare` runs `supabase db reset`.

**Order matters: run `npm run verify` before `demo:showcase`, not after.** The pgTAP suite asserts
against globally empty engineering tables (for example
`supabase/tests/database/050_material_traceability.test.sql` counts `material_check_records`
project-wide), which held only while every stand started empty. A seeded `SHOWCASE-1` makes those
assertions fail. The whole sequence is:

```zsh
npm run demo:prepare -- --confirm-local-reset
npm run verify          # lint, typecheck, unit, pgTAP — needs the empty stand
npm run demo:showcase   # seeds SHOWCASE-1; demo:check stays green afterwards
```

`npm run demo:check` is unaffected and stays green either way.

Example projects (`UPG-1`, `NPS-1`, `PCF-1`; specs in `scripts/upg`, `scripts/nps`, `scripts/pcf`) are loaded after
`demo:prepare` with `demo:project-load -- --dataset X`. `EXAMPLE_PROJECT_CODES` in `scripts/demo/manifest.ts` makes
`demo:check` ignore them and the memberships in them: it neither requires them nor counts them as unexpected. Any other
extra project still fails the check.

The hosted stand is separate and holds curated acceptance data. Never re-seed it unprompted.

Since 2026-10-17 the hosted stand is the self-hosted Supabase on the KZ server (hoster.kz, `ssh mextech`):
app `https://app.piping-qc-work.shop`, API `https://supabase.piping-qc-work.shop`. Releases follow
`docs/runbooks/hosted-stand-operations.md`: migrations before the app image. The cloud project
`lmjkqcdmxehknipeoeye` and the Vercel deployment are **frozen**: never `supabase db push --linked`,
`supabase link` or `vercel deploy` to them.

## Backend: keep one rule in one place

The backend is meant to be simple to read and change. Check every new function, view, policy and
loader against these rules. The reasoning and the open findings are in
`docs/audits/2026-10-06-backend-simplification.md`.

1. **Reads are plain selects.** Read from tables, or from views declared
   `with (security_invoker = true)`, so that RLS applies and `database.types.ts` types the result.
   RPCs are only for commands that write.
2. **Access lives only in RLS policies.** Narrowing checks go in policies declared `as restrictive`
   (see below). Do not add a `SECURITY DEFINER` function that returns data to the user. It bypasses
   every policy and gives a second answer to "who can read this".
3. **A command takes IDs and derives the rest.** The server reads Ident, trace and the like from the
   rows those IDs point to. Each command has one payload format. When the format changes, update
   every caller (app, scripts, tests) in the same change. Do not keep a legacy fallback.
4. **The server owns the rule and the reason.** The SQL command or projection computes readiness and
   eligibility and returns reason codes. The client maps codes to labels. It never re-derives the
   rule in TypeScript.
5. **A screen about one object reads one view, or a few.** Do not join a dozen queries on the
   client.
6. **No pagination or cursors without a measured need.** Data scoped to one spool or one test pack
   is read in a single query.

When a plan touches `supabase/`, load the `supabase-postgres-best-practices` skill first.

## Interface text: English and Russian

Every string a person reads lives in `messages/en/<area>.json` and `messages/ru/<area>.json`, never
in a `.tsx`. `npm run test:unit` fails on hard-coded English in screen code
(`scripts/i18n/find-ui-literals.ts`) and on a Russian file that misses a key, an argument or a
plural branch (`i18n/messages.test.ts`). Domain and application code return codes; the interface
picks the words. Russian terms follow `docs/i18n/glossary-ru.md`. Server error messages are still
English and are shown under a translated title (`errorDetail` in `i18n/format.ts`).

## RLS: a narrowing check must be RESTRICTIVE

PERMISSIVE policies combine with **OR**. A row filter that is meant to narrow access
(`current_user_in_pds_scope`, `current_user_in_subcontractor_scope`) is defeated the moment a
second PERMISSIVE policy grants the same command without it — which is how a scoped
subcontractor came to read every PDS area of the project.

Put narrowing checks in a policy declared `as restrictive`; those are AND-ed with the whole
permissive set and keep holding when a new read path is added later. See
`supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql` and its test
`supabase/tests/database/014_pds_area_scope_rls.test.sql`.
