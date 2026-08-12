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

## 8. Подключение оператора или другого AI-агента

Этот раздел нужен, когда работу продолжает новый человек, Claude Code, Gemini
CLI или другой агент. Он должен получить отдельные авторизации владельца; не
копируйте личные токены, `.env.local` или каталог настроек Codex на другую
машину. Агент может выполнить технические действия, но владелец подтверждает
деструктивные операции: reset demo-стенда, изменение Auth и production deploy.

### Минимальная карта подключений

```text
AI agent / operator terminal
        |
        +-- git + GitHub credentials --> vvnezapnopwnz1/piping (source, branches, main)
        |
        +-- Vercel CLI ---------- OAuth/device login --> pipe-qc-shell-layout
        |                                             (builds, deploys, logs, env metadata)
        |
        +-- Supabase CLI -------- Personal Access Token --> lmjkqcdmxehknipeoeye
        |                                              (migrations, link, reset)
        |
        +-- Vercel MCP ---------- OAuth --> Vercel management/read diagnostics
        |
        +-- Supabase MCP -------- optional --> local development stack by default;
                                                   use a separately configured,
                                                   project-scoped remote connection
                                                   only for approved diagnostics
```

The source repository is `https://github.com/vvnezapnopwnz1/piping.git`.
The target Vercel project is `pipe-qc-shell-layout` in the
`vvnezapnopwnzs-projects` team. The only permitted hosted Supabase project ref
for demo operations is `lmjkqcdmxehknipeoeye` (`pipeqc-hosted-demo`). Verify
these names before every state-changing command.

### First-time setup on a new machine

Install the repository dependencies, Vercel CLI and Supabase CLI according to
the platform's official instructions. Then clone and establish only explicit
links:

```zsh
git clone https://github.com/vvnezapnopwnz1/piping.git pipe-qc-shell-layout
cd pipe-qc-shell-layout
npm install

# Vercel: complete the browser/device authentication as the owning account.
vercel login
vercel whoami
vercel link --yes --team vvnezapnopwnzs-projects --project pipe-qc-shell-layout
vercel project inspect pipe-qc-shell-layout --scope vvnezapnopwnzs-projects

# Supabase: create a Personal Access Token in the owner's Supabase account,
# then enter it interactively. Never add this token to a shell history or file.
/opt/homebrew/bin/supabase login
/opt/homebrew/bin/supabase projects list
/opt/homebrew/bin/supabase link --project-ref lmjkqcdmxehknipeoeye
/opt/homebrew/bin/supabase migration list --linked
```

`supabase login` opens a browser by default. When the CLI explicitly requests a
token, paste the PAT into its prompt; for non-browser flows use the CLI's
`--token` input only in an interactive/secret-aware environment. A successful
login must be verified by listing project metadata, not by echoing the token.

For a local app session, use a locally supplied `.env.local` containing only
the public project URL/publishable key plus local fixture values. Do not run
`vercel env pull` casually: it replaces `.env.local`, and the hosted stand
intentionally has only public Supabase variables in Vercel.

### Vercel MCP setup for Codex

On the present Codex installation, Vercel MCP is the remote endpoint
`https://mcp.vercel.com` and uses OAuth. A fresh Codex operator checks and
authenticates it as follows:

```zsh
codex mcp list
codex mcp login vercel
codex mcp get vercel
```

After the browser OAuth consent completes, the agent can use Vercel MCP for
project/deployment inspection, logs and environment metadata where its enabled
tools permit it. The command-line Vercel login remains the portable and
authoritative route for the deployment itself:

```zsh
vercel --prod --yes
vercel inspect https://pipe-qc-shell-layout.vercel.app/
vercel logs https://pipe-qc-shell-layout.vercel.app/
```

For Claude Code or Gemini, configure an MCP client entry pointing to the same
streamable HTTP endpoint and complete that client's OAuth browser flow. Exact
configuration syntax is client-specific; the invariant is the endpoint,
OAuth-based authorization and verification against the project name above.
Do not turn an OAuth session/token into a committed MCP configuration file.

### Supabase MCP: scope and safe configuration

The current local Codex configuration points Supabase MCP at
`http://127.0.0.1:54321/mcp`, which is the **local** Supabase development
stack. It is useful for local schema/query/log diagnostics but it is not the
hosted demo project and must not be mistaken for it.

For a remote Supabase MCP connection, a new agent must use its Supabase MCP
provider's supported project-scoping mechanism and explicitly select project
ref `lmjkqcdmxehknipeoeye`. First use only read-only capabilities (schema,
migration state, logs, advisors). Confirm the selected ref in every response.
Do not build deploy, migration or Auth-user creation workflows on MCP: the
repository's guarded scripts and Supabase CLI own those state changes.

Examples of safe local checks:

```zsh
codex mcp list
codex mcp get supabase
/opt/homebrew/bin/supabase migration list --linked
npm run demo:check:hosted
```

The final command needs `SUPABASE_URL` and an interactively entered
`SUPABASE_SECRET_KEY`, as shown in section 5. It is read-only; do not place
that secret in MCP arguments or agent prompts.

### Agent handoff protocol

Before allowing an agent to mutate production, give it this compact brief:

```text
Repository: vvnezapnopwnz1/piping; production branch: main.
Public URL: https://pipe-qc-shell-layout.vercel.app/.
Vercel project/team: pipe-qc-shell-layout / vvnezapnopwnzs-projects.
Hosted Supabase ref: lmjkqcdmxehknipeoeye only.
Normal schema update: add migration, test locally, then supabase db push.
Never use db reset unless the owner explicitly requests a fresh demo baseline.
Never put service/admin secrets in Git, Vercel NEXT_PUBLIC variables, MCP
arguments, screenshots or chat. Verify project/ref before every mutation.
```

Require the agent to report: branch and commit, migration list before/after
when applicable, Vercel deployment URL/status, the stable URL result, and the
separate browser acceptance result. This prevents a generic “deployed” claim
from hiding an update to the wrong service or project.
