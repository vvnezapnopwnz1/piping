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

The hosted stand is separate and holds curated acceptance data. Never re-seed it unprompted.

## RLS: a narrowing check must be RESTRICTIVE

PERMISSIVE policies combine with **OR**. A row filter that is meant to narrow access
(`current_user_in_pds_scope`, `current_user_in_subcontractor_scope`) is defeated the moment a
second PERMISSIVE policy grants the same command without it — which is how a scoped
subcontractor came to read every PDS area of the project.

Put narrowing checks in a policy declared `as restrictive`; those are AND-ed with the whole
permissive set and keep holding when a new read path is added later. See
`supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql` and its test
`supabase/tests/database/014_pds_area_scope_rls.test.sql`.
