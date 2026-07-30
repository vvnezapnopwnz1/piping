# Track 01 local browser fixtures

This helper creates or reconciles local-only users and records for the Track 01
manual verification matrix. It refuses every URL except `http://localhost...`
or `http://127.0.0.1...`; do not adapt it for a remote Supabase project.

Prerequisites: local Supabase is running and Track 01 migrations, including
`20260731100000_grant_service_role_fixture_bootstrap.sql`, are applied:

```bash
/opt/homebrew/bin/supabase migration up --local
```
Set the local API **Secret** from the **Authentication Keys** block of
`supabase status` only in the terminal session. Do **not** use the similarly
named S3 **Storage Secret Key**. Never put the API secret in a `NEXT_PUBLIC_*`
variable, source file or git commit.

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='Authentication Keys → Secret value' \
TRACK01_FIXTURE_PASSWORD='choose-a-local-password' \
npx tsx scripts/bootstrap-track01-browser-fixtures.ts
```

The script is idempotent for the following fixture email addresses and project
codes. Re-running it restores their membership role/function/scope setup and
resets those fixture accounts to the supplied `TRACK01_FIXTURE_PASSWORD`.

| Account | Email | Expected access |
| --- | --- | --- |
| Platform Admin | `track01.platform-admin@example.test` | Platform admin, projects A and B |
| Platform Observer | `track01.platform-observer@example.test` | Platform admin, no membership |
| Project Admin A | `track01.project-admin-a@example.test` | Project Admin in TRACK01-A only |
| Reader QC | `track01.reader-qc@example.test` | Project Reader + QC Engineer in A |
| QC Editor | `track01.qc-editor@example.test` | Project Editor + QC Engineer in A |
| NDE Subcontractor | `track01.nde-subcontractor@example.test` | Subcontractor + NDE Inspector, only TRACK01-SUB-A / TRACK01-PDS-A |

The script creates `TRACK01-A`, `TRACK01-B`, two subcontractors and two PDS
areas. It does not create operational fabrication/NDE data, does not reset the
database and does not modify remote Supabase.
