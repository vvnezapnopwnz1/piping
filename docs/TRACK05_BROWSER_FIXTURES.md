# Track 05 Browser Fixtures Runbook

## Overview

This script reconciles fixture data required by Track 05 fabrication workflows into the local Supabase database (`TRACK01-A` project).

### Prerequisites

Run the previous track bootstraps in order:
1. `npm run bootstrap:track01-browser-fixtures`
2. `npm run bootstrap:track02-browser-fixtures`
3. `npm run bootstrap:track03-browser-fixtures`
4. `npm run bootstrap:track04-browser-fixtures`

### Provisioned Referentials

- `project_subcontractors` (`SUB-T5`)
- `project_welding_procedures` (`WPS-T5`)
- `welder_qualifications` (`W-T5-1`, `W-T5-2`)
- `welder_wps_qualifications` (links `W-T5-1` and `W-T5-2` to `WPS-T5`)
- `piping_material_records` (`IDN-T5-100` / `HEAT-T5-100`, `IDN-T5-200` / `HEAT-T5-200`)
- `project_locations` (`YARD-T5`)
- `project_paint_matrix_rules` (240 µm final DFT)

## Usage

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
npm run bootstrap:track05-browser-fixtures
```

## Security & Protection Guards

1. **Localhost Guard**: Refuses to run against non-local Supabase URLs (prevents accidental production mutation).
2. **Idempotency**: Uses `upsert(...)`. Re-running the script produces identical state without duplicate key errors.
3. **Secret Protection**: Secrets must be supplied out of band via environment variables. Never commit service role keys to git repository.

## Manual Acceptance Click Path (Task 26)

1. Open `/fabrication/material-check` and select spool `SP-T4-01`. Click **Record Start Fab**, enter trace numbers `HEAT-T5-100` and `HEAT-T5-200`, click **Record traces**, then click **Issue QC-13**.
2. Open `/fabrication/weld-progress` and select spool `SP-T4-01`. Select joint `W-01`, subcontractor `SUB-T5`, WPS `WPS-T5`, root welder `W-T5-1`, cap welder `W-T5-2`, and click **Record weld progress**.
3. Open `/fabrication/qc-release` and select spool `SP-T4-01`. Click **Mark installed** for support, click **Mark accepted** for NDE obligation, enter chart number `CHART-T5-1` and click **Record accepted** for PWHT, then click **QC release spool**.
4. Open `/fabrication/paint` and select spool `SP-T4-01`. Click **Record Sent to Paint**, select line service, enter measured DFT `250` µm and form number `W10P-T5-1`, and click **Record painting**.
5. Open `/fabrication/laydown` and select spool `SP-T4-01`. Select location `YARD-T5` and click **Record laydown**.
