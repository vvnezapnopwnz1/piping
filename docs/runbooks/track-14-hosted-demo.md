# Track 14 — hosted PipeQC demo

The public stand is served at `https://pipe-qc-shell-layout.vercel.app/` and
uses only the disposable Supabase project `lmjkqcdmxehknipeoeye`. It extends
the business walkthrough in [Track 12](./track-12-demo.md); use that document
for the presenter story and controls.

## One-time dashboard configuration

In Supabase Dashboard, open **Authentication → Providers → Email** for
`pipeqc-hosted-demo` and disable **Allow new users to sign up**. No SMTP,
invites, or password recovery are configured for this display-only stand.

Then open **Authentication → URL Configuration** and set:

- Site URL: `https://pipe-qc-shell-layout.vercel.app/`
- Redirect URL allow-list: `https://pipe-qc-shell-layout.vercel.app/**`

Save each page. Confirm that the public login form offers sign-in but no sign-up
action. The six fixed accounts are created by the reseed command with confirmed
email addresses, so they do not require email delivery.

## Reseed from an owner machine

Reseeding removes every demo result, Auth identity, and relational row from the
hosted stand, then replays all migrations and restores the fixed Track 12
starting state. It is normal recovery for this intentionally disposable demo.
Do not run it during a rehearsal whose state you want to keep.

The Supabase CLI must already be logged in with an account that owns the
Marketplace-created project. Enter the two secrets interactively; never put
them in Vercel, a committed file, screenshots, or chat.

```zsh
cd /path/to/pipe-qc-shell-layout
export SUPABASE_URL="https://lmjkqcdmxehknipeoeye.supabase.co"
read -r -s "SUPABASE_SECRET_KEY?Hosted Supabase secret key: "
echo
read -r -s "TRACK01_FIXTURE_PASSWORD?Demo password (12+ characters): "
echo
export SUPABASE_SECRET_KEY TRACK01_FIXTURE_PASSWORD
npm run demo:prepare:hosted -- --confirm-hosted-reset
unset SUPABASE_SECRET_KEY TRACK01_FIXTURE_PASSWORD
```

The command pins the URL and `supabase link` project ref before any reset. It
rejects every other project before a CLI reset, network gateway, or Auth Admin
call. A successful run prints only `PASS check=...` lines.

For a safe, read-only health check, enter the same `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`, then run:

```zsh
npm run demo:check:hosted
```

Run the check twice before a presentation. It must print the same all-PASS
contract both times. The command performs no reset, inserts, updates, deletes,
RPC calls, or Auth mutations.

## Presenter accounts

Use the same password entered at reseed time for all fixed accounts. The normal
story starts as `track01.project-admin-a@example.test`, switches to
`track01.qc-editor@example.test` for operational evidence, and uses
`track01.reader-qc@example.test` only for denied-action checks. Their exact
roles and the complete 40-minute walkthrough remain in the Track 12 runbook.

## Hosting boundaries

Vercel production keeps only `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No database password, JWT secret,
service-role JWT, or `SUPABASE_SECRET_KEY` belongs there.

The Supabase free tier may pause after inactivity. This is accepted for the
demo: restore/resume the project from its Supabase dashboard, run the read-only
health check, and reseed only if the check is not all PASS. There is no keep
alive, scheduled reseed, backup/restore routine, custom domain, monitoring,
offline mode, or open registration in this release.
