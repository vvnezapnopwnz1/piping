# Track 05 Browser Fixtures Runbook

## Overview

`npm run bootstrap:track05-browser-fixtures` reconciles every referential a Track 05
walkthrough needs into the local `TRACK01-A` project **and** imports the engineering
definition the fabrication screens operate on. It is idempotent: the referentials are
upserted, and the SpoolGen import is skipped once `ISO-T4-001` has an accepted revision.

### Prerequisites

Run the previous track bootstraps in order, with the same `TRACK01_FIXTURE_PASSWORD`:

1. `npm run bootstrap:track01-browser-fixtures`
2. `npm run bootstrap:track03-browser-fixtures`
3. `npm run bootstrap:track04-browser-fixtures`

`scripts/bootstrap-track04-local-fixtures.sh` runs all five in order and prompts for the
secrets. That file is gitignored, so check that your local copy runs tracks 01 through 05
before relying on it.

### Usage

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local service-role secret>' \
SUPABASE_PUBLISHABLE_KEY='<local publishable key>' \
TRACK01_FIXTURE_PASSWORD='<same value used for Track 01>' \
npm run bootstrap:track05-browser-fixtures
```

The publishable key and the fixture password are needed because the second half of the
script signs in as `track01.project-admin-a@example.test` and drives the real SpoolGen
import through the same RPCs the browser calls. Secrets are supplied out of band and are
never committed.

Expected output on a clean database:

```text
Track 05 referentials reconciled: 14 rows upserted into project <uuid>.
Engineering definition imported: 7 rows applied to ISO-T4-001.
```

A second run prints the same first line and
`Engineering definition ISO-T4-001 already has an accepted revision; nothing to import.`

### Provisioned referentials

- `project_subcontractors` — `SUB-T5`
- `project_welding_procedures` — `WPS-T5` (1"–24", 2–30 mm, approved 2026-01-01)
- `welder_qualifications` — `W-T5-1`, `W-T5-2`, both linked to `WPS-T5`
- `piping_material_records` — `IDN-T5-100`/`HEAT-T5-100`, `IDN-T5-200`/`HEAT-T5-200`, `IDN-T5-300`/`HEAT-T5-300`
- `project_location_categories` — `CAT-T5`; `project_locations` — `YARD-T5`
- `project_line_services` — `LS-T5`; `project_ral_codes` — `RAL 9006`
- `project_paint_matrix_rules` — 240 µm final DFT, blasting and primer required, 1 intermediate + 1 final coat
- `nde_matrix_rules` — the Track 04 rule for `SC-T4`/`BW-T4`/`shop` is updated to `pwht_required = true`, `pwht_thickness_threshold = 8`

### Provisioned definition

Imported from `scripts/weld.txt`, `scripts/trace.txt` and `scripts/supp.txt`:

| Object | Value |
| --- | --- |
| Isometric | `ISO-T4-001` revision `R0` (accepted), PDS area `PDS-T4`, service class `SC-T4` |
| Golden spool | `SP-T4-001-A` — shop welds `W-T4-001` and `W-T4-002` (6", 8.2 mm), support `SU-T4-001`, bill of materials `IDN-T5-100` and `IDN-T5-200` |
| Second spool | `SP-T4-001-B` — shop weld `W-T4-003` (8", 10.3 mm), bill of materials `IDN-T5-300` |

`trace.txt` deliberately carries no `TRACE_NUMBER`. Dossier §16.4 has the heat number
transcribed from a returned QC-13 by the operator, so the bill of materials arrives
without one and the material check screen is where it is supplied.

### Protection guards

1. **Localhost guard** — the script refuses to run against a non-local Supabase URL.
2. **Idempotency** — referentials are upserted; the import is skipped once an accepted
   revision exists. Two consecutive runs leave identical state.
3. **Secret protection** — every secret comes from an environment variable.

### Fixtures and pgTAP do not coexist

Measured 2026-08-02: with the full Track 01-05 bootstrap data present, `supabase test db`
reports `Files=20, Tests=354` (against 21/436 on a clean database) and fails in three
files - `040_engineering_identity` (`planned 20 tests but ran 16`), `042_spooling_apply`
(`planned 40 but ran 0`) and `051_weld_progress`
(`material_type_id must reference a material_type system referential`). The cause is
`on conflict do nothing` on shared `system_reference_entries` codes: the bootstrap owns the
code, the test's own insert is skipped, and its foreign key then fails.

Every test file ends in `rollback`, so the suite leaves no residue. The conflict runs one
way only: **bootstrap data breaks pgTAP, never the reverse.** So `supabase db reset` before
`supabase test db`, and re-run the bootstrap chain afterwards if you want the browser
fixtures back. Track 06 will meet this on every iteration; budget for the reset.

## Manual acceptance click path

Sign in as `track01.project-admin-a@example.test` and select project `TRACK01-A` in
Supabase mode. The spool picker on every screen below offers `SP-T4-001-A`.

1. **`/fabrication/material-check`** — select `SP-T4-001-A`. Click **Record Start Fab**.
   Click **Issue QC-13** and note the form number in the toast. Enter `HEAT-T5-100` against
   `IDN-T5-100` and `HEAT-T5-200` against `IDN-T5-200`, then click **Record traces**. The
   stage timeline gains **Material check**; with only one trace filled it must not.
2. **`/fabrication/weld-progress`** — select `SP-T4-001-A`. For joint `W-T4-001` choose
   subcontractor `SUB-T5`, WPS `WPS-T5`, root welder `W-T5-1`, cap welder `W-T5-2`, weld
   date today, and click **Record weld progress**. Repeat for `W-T4-002`. Each joint now
   shows one pending RT obligation and one PWHT requirement.
3. **`/fabrication/qc-release`** — select `SP-T4-001-A`. Click **Mark installed** on
   `SU-T4-001`. The release button is still disabled and names the outstanding NDE and
   PWHT counts. Click **Mark accepted** on both RT obligations. Enter chart number
   `CHART-T5-1` and click **Record accepted** for both PWHT requirements. The release
   button enables; click **QC release spool**.
4. **`/fabrication/paint`** — select `SP-T4-001-A`. Click **Record Sent to Paint**. Choose
   line service `LS-T5`, enter measured DFT `250` µm, W10P number `W10P-T5-1` and a
   **Final QC on** date, then click **Record painting**. Entering `200` µm must be refused
   with the paint-matrix message before you enter `250`. **Final QC on** starts empty and
   nothing prompts for it, but `record_laydown` refuses without it, so step 5 depends on it.
5. **`/fabrication/laydown`** — select `SP-T4-001-A`, choose location `YARD-T5` and click
   **Record laydown**.
6. **`/fabrication/dashboard`** — `SP-T4-001-A` shows the full stage history.

### Negative paths worth clicking

- On `/fabrication/weld-progress`, try joint `W-T4-003` of `SP-T4-001-B` with the same welder
  on root and cap — the allocation message appears before the request is sent. A root+cap total
  other than 100 cannot be reached from this screen: the cap is derived as `100 − root`.
- Sign in as `track01.reader-qc@example.test`; `/fabrication/qc-release` must not be
  reachable.
