# PipeQC — эксплуатация удалённого demo stand

**Статус:** Track 01–12 (реальный Supabase-путь и бизнес-модули) и Track 14
(публичный demo stand) подготовлены. Публичная пользовательская приёмка пройдена
12–13 августа 2026 года: вход, импорт/валидация, CRUD справочников и fabrication
проверены вручную.

Этот документ описывает, как дальше безопасно менять приложение, базу и
демонстрационные данные. Это не инструкция по созданию нового окружения.

## 1. Постоянный адрес и инфраструктура

Публичный адрес для всех пользователей всегда один:

`https://pipe-qc-shell-layout.vercel.app/`

Каждый production deploy Vercel создаёт также технический URL конкретной сборки
вида `https://pipe-qc-shell-layout-<deployment>.vercel.app`. Его используют для
диагностики, проверки и rollback; никому его не нужно рассылать. Production alias
выше автоматически переключается на новую успешную сборку.

```text
                            GitHub repository
                         main = production source
                                   |
                     reviewed and verified change
                                   |
                   +---------------+----------------+
                   |                                |
             Vercel production                 Supabase project
        Next.js application + public URL       PostgreSQL + RLS + Auth
                   |                                |
   NEXT_PUBLIC_SUPABASE_URL/key only       migrations + business data
                   +---------------+----------------+
                                   |
                  users at pipe-qc-shell-layout.vercel.app
```

### What is deployed where

| Concern | Source of truth | How it changes |
| --- | --- | --- |
| UI, routes, client commands, reports | Git branch → `main` | Vercel production deploy |
| Tables, constraints, RLS, functions, RPC | `supabase/migrations/` | Supabase CLI `db push` |
| Demo users, projects, referentials and business results | hosted PostgreSQL/Auth | normal UI commands, or explicit demo re-seed |
| Login registration policy and redirect configuration | Supabase Dashboard → Authentication | explicit dashboard change |
| Browser Supabase URL and publishable key | Vercel Production environment | change value, then deploy again |

There is currently one remote Supabase demo project and one Vercel production
environment. There is no remote staging database yet. Therefore a preview or a
local experiment must never be pointed at the production demo database for
write testing.

## 2. Branch and release model

The `feat/supabase-real-mode` implementation is already included in `main`:
the hosted release merge contains it as its parent history. This is intentional:
the public stand runs the real Supabase/RLS application rather than a mock-mode
copy.

For subsequent work use a short-lived branch and merge only an accepted change
to `main`:

```text
main ──┬── fix/import-validation-message ── review/tests ── merge to main
       └── feat/next-module ──────────────── review/tests ── merge to main
                                                                  |
                                                          production deploy
```

The current release is intentionally a controlled manual release: a merge or
push alone is not treated as proof that production has changed. From the
checkout linked to the Vercel project, run `vercel --prod --yes` after the
required checks. We can later add GitHub-triggered preview/production CI, but
it needs a separate preview Supabase project first.

## 3. Standard application-only update

Use this when a change affects React/Next.js, validation, a report template or
other code but requires no new database migration.

```zsh
git switch main
git pull --ff-only
git switch -c fix/short-description

# edit and exercise the affected path locally
npm run lint
npm run typecheck
npm run test:unit
npm run build

# commit, review and merge the accepted change into main
git switch main
git pull --ff-only

# run from the directory containing .vercel/
vercel --prod --yes
vercel inspect https://pipe-qc-shell-layout.vercel.app/
```

Then check the public URL in a signed-in browser using the exact bug path.
The stable alias remains `https://pipe-qc-shell-layout.vercel.app/`.

If that deployment is bad, roll back the application only:

```zsh
vercel rollback
```

Vercel rollback does **not** undo a database migration or user-entered data.

## 4. Update that includes a database migration

Use this for a new/changed table, column, index, RLS policy, SQL function,
trigger or RPC. Never edit a migration that has already been applied remotely;
add a new timestamped migration under `supabase/migrations/`.

### Required compatibility rule

Production can briefly serve the previous and new application deployments at
the same time. Make migrations additive first:

1. Add a nullable field, new table, function or policy that is compatible with
   the old application.
2. Apply the migration to the hosted project.
3. Deploy the new UI that starts using it.
4. Backfill or tighten constraints later in a separate, deliberate migration.

Do not couple a destructive column/table removal to the same release as its UI
replacement.

### Release sequence

```zsh
# on the feature branch, after adding the migration and tests
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run build

# after merge to main, link only the expected hosted project
/opt/homebrew/bin/supabase link --project-ref lmjkqcdmxehknipeoeye
/opt/homebrew/bin/supabase db push

# verify the changed database path, then publish the UI
vercel --prod --yes
vercel inspect https://pipe-qc-shell-layout.vercel.app/
```

`supabase db push` applies only pending migrations and preserves existing Auth
users, imported files, referentials and business history. It is the normal
remote schema-update command.

If a migration fails, stop. Inspect migration history and the database error,
then add a corrective forward migration. Do not use `db reset`, do not edit a
previous migration and do not blindly retry an ambiguous mutation.

## 5. Demo-data modes

The demo stand intentionally has a reset-based baseline. Choose the desired
state before sharing a link or presenting; do not leave accidental test data as
the story.

| Desired state | What the reviewer sees | How to get it |
| --- | --- | --- |
| **Baseline** — populated referentials, no engineering import | Projects `TRACK01-A`/`TRACK01-B`, users and rich project/system referentials; no isometrics, import jobs or operational results | hosted demo re-seed |
| **Curated journey** | A deliberately completed import and selected fabrication/QC/NDE/Test Pack evidence | perform the agreed presenter story once, then stop editing it |
| **Temporary investigation** | Any current manual test data | use only while investigating; convert to curated state or re-seed before external review |

The requested “filled referentials, but files have not yet been imported” state
is exactly the **Baseline** state. It is ideal when you want to demonstrate the
import journey live from a clean start.

### Re-seed to the baseline

This is intentionally destructive: it removes hosted Auth identities and all
business/demo rows, reapplies migrations and recreates the fixed accounts,
projects and referentials. Do not run it during or immediately before a
rehearsal whose state you want to preserve.

Enter secrets only in an owner-machine terminal; never in Vercel, Git, chat,
screenshots or a committed `.env` file.

```zsh
export SUPABASE_URL="https://lmjkqcdmxehknipeoeye.supabase.co"
read -r -s "SUPABASE_SECRET_KEY?Hosted Supabase secret key: "
echo
read -r -s "TRACK01_FIXTURE_PASSWORD?Demo password (12+ characters): "
echo
export SUPABASE_SECRET_KEY TRACK01_FIXTURE_PASSWORD

npm run demo:prepare:hosted -- --confirm-hosted-reset

unset SUPABASE_SECRET_KEY TRACK01_FIXTURE_PASSWORD
```

The hosted command hard-pins the project ref before any reset. It is the only
approved reset path for this disposable demo project.

After a re-seed, perform the read-only health check twice. Both runs must be
all `PASS` and identical in meaning:

```zsh
# export SUPABASE_URL and enter SUPABASE_SECRET_KEY as above
npm run demo:check:hosted
npm run demo:check:hosted
```

## 6. Operations cases and response

| Situation | Correct response | Do not do |
| --- | --- | --- |
| UI-only bug on public site | fix → tests → merge to `main` → `vercel --prod --yes` | manually edit deployed assets |
| Bug also needs SQL/RLS change | new migration → local DB tests → `supabase db push` → public deployment | edit old migration or reset the stand |
| Bad UI release | `vercel rollback`, then make a forward code fix | assume the rollback changed the database |
| Bad database release | investigate and ship a corrective forward migration; keep old/new UI compatible | run `db reset` to undo it |
| Demo data became messy | either curate it into the intended story or re-seed to Baseline | re-seed merely “to be safe” without agreeing to lose results |
| Supabase free-tier project pauses | resume it in Supabase Dashboard; run `demo:check:hosted`; re-seed only if checks fail | create another project silently or change the public URL |
| Supabase public URL/key changes | update the two Vercel **Production** variables, then deploy again | put server/admin keys in `NEXT_PUBLIC_*` variables |
| Need an external reviewer | share the stable URL and a reader account via a separate secure channel | enable public registration or place a password in the URL |

## 7. Release checklist

Before an external link or production update:

- [ ] The target branch is merged into `main` and the working tree is clean.
- [ ] Relevant local tests passed; database work includes `npm run test:db`.
- [ ] Schema changes, if any, have been applied with `supabase db push`.
- [ ] `vercel --prod --yes` completed and the stable URL responds.
- [ ] The changed user path was checked at the public URL.
- [ ] The selected demo-data mode is intentional (Baseline or Curated journey).
- [ ] Email sign-up is disabled and the Site/Redirect URL remains the public
      Vercel URL.
- [ ] No server/service-role secret was put in Git, Vercel browser variables,
      screenshots or shared notes.

For detailed account names, presenter sequence and recovery commands, use
[Track 14 hosted demo runbook](./track-14-hosted-demo.md) together with
[Track 12 demo walkthrough](./track-12-demo.md).
