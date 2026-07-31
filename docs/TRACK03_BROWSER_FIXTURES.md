# Track 03 Browser Fixtures Runbook

## Overview

This script reconciles fixture data required by Track 03 import features into the local Supabase database (`TRACK01-A` project).

Specifically, it provisions:
- `project_subcontractors` (`SUB-IMP-A`, `SUB-IMP-B`)
- `project_service_classes` (`SC-IMP-1`, `SC-IMP-2`)
- `project_weld_types` (`WT-IMP-BW`, `WT-IMP-SW`)

## Usage

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
npm run bootstrap:track03-browser-fixtures
```

## Security & Protection Guards

1. **Localhost Guard**: Refuses to run against non-local Supabase URLs (prevents accidental production mutation).
2. **Idempotency**: Uses `upsert(..., { onConflict: "project_id,code" })`. Re-running the script produces identical state without duplicate key errors.
3. **Secret Protection**: Secrets must be supplied out of band via environment variables. Never commit service role keys to git repository.
