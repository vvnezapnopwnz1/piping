# Track 02 Browser Fixtures Runbook

This runbook documents how to bootstrap idempotent master reference fixtures for manual and browser verification of Track 02 (Project Referentials).

## Safety Guards

The bootstrap script enforces safety rules:

- **Localhost only**: Rejects execution against non-local URLs (`127.0.0.1`, `localhost`, `::1`).
- **No row deletion**: Reconciles by stable project-scoped code; never deletes existing user data.
- **Service Role Key isolation**: Requires `SUPABASE_SERVICE_ROLE_KEY` provided out-of-band; never commit keys to repository files or export into client environment variables (`NEXT_PUBLIC_*`).

## Execution Command

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
npm run bootstrap:track02-browser-fixtures
```

## Idempotency Verification

Run the bootstrap command twice in succession. The second execution must exit cleanly with `0` without creating duplicate records or throwing constraint errors.

SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
TRACK01_FIXTURE_PASSWORD='Password123!' \
npx tsx scripts/bootstrap-track01-browser-fixtures.ts

SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
TRACK01_FIXTURE_PASSWORD='Password123!' \
npx tsx scripts/bootstrap-track02-browser-fixtures.ts
