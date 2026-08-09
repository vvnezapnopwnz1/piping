# Track 08 Tracking Browser Walkthrough — Agent Execution Script

This is the self-contained browser acceptance script for Track 08. It covers the Tracking
dashboard, all four Data Analysis tabs, append-only movement commands and corrections, scanner
import idempotency, CSV/XLSX exports, device analytics, project switching and durable state.

> **Status: not yet executed.** Expected values are source- and fixture-derived. Record any
> disagreement as a finding; do not silently adapt the script or retry an ambiguous mutation.

## 1. Browser-agent contract

Paste this block verbatim to the executing agent:

```text
Execute docs/qa/track-08-agent-walkthrough.md against the prepared local PipeQC stand.

Use browser automation only and only http://localhost:3000. Do not use 127.0.0.1:3000.
You may navigate, snapshot, click, type, select, inspect visible DOM/console/network state,
download files and take screenshots. You may not read .env files or shell history, expose or
persist credentials, use Supabase Studio/SQL/direct API, edit source, run git, retry an
ambiguous mutation, bypass a disabled control, or visit a non-local Supabase URL.

Credentials are entered interactively by the operator and must never appear in evidence.
All mutations are limited to fixture project TRACK01-A and the exact cases below.

For every case return: case ID; PASS, FAIL or BLOCKED; URL; persona; expected; actual. On FAIL,
attach one screenshot, first console error, and first failing request as method/path/status only.
After two identical tool failures, unexpected authentication, or uncertain mutation outcome,
stop that mutation and report BLOCKED. Execute cases in order because later cases depend on
durable state from earlier cases.
```

## 2. Operator preparation

The browser agent does not run these commands. A human prepares a disposable local stand and
supplies secrets out of band. `supabase db reset` is deliberately absent; use it only after
separate approval.

```zsh
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
/opt/homebrew/bin/supabase start

# Supply local URL, publishable key, service-role key and fixture password interactively.
npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track03-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track05-browser-fixtures
npm run bootstrap:track07-browser-fixtures
npm run bootstrap:track08-browser-fixtures
npm run dev
```

The Track 08 bootstrap refuses non-local Supabase URLs and does not modify Track 05 fixture
rows. If any prerequisite fails, report preparation as BLOCKED rather than repairing data in
Studio. A rerun is idempotent, but it does not undo browser mutations from a previous walk.

## 3. Fixture reference

All personas use the password supplied under `TRACK01_FIXTURE_PASSWORD`.

| Persona | Email | Expected authority |
| --- | --- | --- |
| Reader QC | `track01.reader-qc@example.test` | View dashboard, analytics and XLSX; no commands, correction, import or assignment |
| Tracking Operator | `track01.qc-editor@example.test` | View and ordinary In/Out events; no correction, import or assignment |
| Project Admin A | `track01.project-admin-a@example.test` | Correction, import, CSV dump and Edit users |

Project: `TRACK01-A`. Track 08 objects:

| Object | Deterministic value / initial state |
| --- | --- |
| ISO | `ISO-T8-001`, accepted revision `R0` |
| Active at location | `SP-T8-ACTIVE`, effective location `T8-YARD-B`; immutable history contains the original `T8-YARD-A` event and its compensation |
| Normal transit | `SP-T8-TRANSIT`, departed `T8-YARD-A` at `2026-08-08T10:00:00Z` |
| Overdue transit | `SP-T8-OVERDUE`, departed `T8-YARD-B` at `2026-07-20T09:00:00Z` |
| Erected history | `SP-T8-ERECTED`, retained location event at `T8-LEGACY`, excluded from active totals |
| Locations | `T8-YARD-A` capacity 2; `T8-YARD-B` capacity 10; `T8-LEGACY` capacity null |
| Devices | assigned `PDA-T8-01`; unassigned `PDA-T8-UNASSIGNED` |
| Invalid preview file | `scripts/tracking-scans.txt`: two duplicate valid rows plus one invalid `sideways` row |
| Applicable file | `scripts/tracking-scans-valid.txt`: two rows with the same external event id `T8-SCAN-001` |

On 2026-08-09, before mutations, Dashboard should show: distinct spools scanned **4**,
active spools **3**, scans this month **5**, currently in transit **2**, overdue transit **1**.
If run after the normal-transit threshold has elapsed, record the changed time-derived overdue
count; all identity, authorization and durability expectations remain fixed.

## 4. Execution cases

### T08-00 — Reader dashboard and navigation

1. Sign in as Reader QC, choose project `TRACK01-A`, open `http://localhost:3000/tracking`.
2. Assert heading **Tracking Dashboard** and buttons **Refresh** and **Print**.
3. Assert the five real metric cards. No battery, connectivity or synchronization-health claim
   may appear.
4. Under **Location occupancy**, assert `T8-YARD-A` = `0 / 2`, `T8-YARD-B` = `1 / 10`, and
   `T8-LEGACY` = `0 / Not configured`. The erected spool must not count.
5. Click **Refresh** and confirm the same durable values.
6. Open the Tracking sidebar. It must contain exactly **Dashboard**, **Data Analysis**,
   **Barcode Printing**, and **Mobile Device Management**.

PASS requires all six observations. A load error or cross-project row is FAIL.

### T08-01 — Reader: all Data Analysis tabs and denial surface

1. Open `/tracking/data-analysis`; assert heading **Tracking Data Analysis**.
2. On **Spool Location**, filter `SP-T8-ACTIVE`, select its row, and assert history contains a
   manual compensation reason **Correct demo yard assignment** plus the retained original row.
3. Assert **Add Event**, **Add Correction**, and all three CSV download buttons are absent.
4. Open **Location**: assert the three fixture locations and configured/null capacities.
5. Open **Design Area**: assert active count excludes `SP-T8-ERECTED` and text
   **No managed design image is available.**
6. Open **Consolidation**: assert overdue transit includes `SP-T8-OVERDUE` and active
   never-scanned count is derived, not hard-coded.
7. Click **Print** and record that the browser print flow opens; cancel without printing.

### T08-02 — Reader XLSX export

1. Open `/tracking/print-barcodes`; assert heading **Barcode Printing** and the explanation that
   external Zebra software consumes the workbook.
2. Filter `SP-T8-ACTIVE`, check **Select SP-T8-ACTIVE**, click **Download XLSX (1)**.
3. Assert filename `TRACK01-A-spool-barcodes.xlsx` and, using the browser download artifact,
   sheet `Spool Barcodes` with headers **Spool Number**, **ISO Number**, **PDS Area**,
   **Current Location**, **Barcode Value**. Barcode Value must be `SP-T8-ACTIVE`.

### T08-03 — Reader device analytics

1. Open `/tracking/devices`; assert heading **Mobile Device Management**.
2. Assert rows `PDA-T8-01` and `PDA-T8-UNASSIGNED`.
3. Assigned PDA shows real scan count/operator/location/last use. The spare shows **0**,
   **No recorded usage**, **Never**, **Unassigned**.
4. Assert **Edit users** is absent and no battery/connectivity value is displayed.

### T08-04 — Tracking Operator durable Out/In commands

1. Sign out, sign in as Tracking Operator, choose `TRACK01-A`, open
   `/tracking/data-analysis`, tab **Spool Location**.
2. Filter and select `SP-T8-ACTIVE`. Assert **Add Event** exists and **Add Correction** does not.
3. Click **Add Event**; choose direction **Out**, location `T8-YARD-B`, device `PDA-T8-01`,
   and enter the current local date/time. Click **Save event** once.
4. Wait for toast **Tracking event recorded** and durable refetch. Row must show **In transit**.
5. Click **Refresh**; it must remain **In transit**.
6. Click **Add Event**; choose **In**, location `T8-YARD-A`, assigned device and a later time.
   Save once, wait for refetch, then assert current location `T8-YARD-A`.
7. Hard-refresh the page and assert `T8-YARD-A` remains. Sign out and back in as the same
   persona and assert it remains again.
8. Attempt no correction/import/assignment mutation. Verify `/admin/imports` offers no enabled
   file mutation and `/tracking/devices` has no **Edit users**.

If a save outcome is unclear, do not click again: hard-refresh and report BLOCKED with state.

### T08-05 — Project switch stale-response isolation

1. While signed in as a persona with both fixture projects, open `/tracking`, then switch from
   `TRACK01-A` to `TRACK01-B` while the dashboard is loading.
2. Assert no `ISO-T8-001`, `SP-T8-*`, `T8-YARD-*`, or `PDA-T8-*` value appears after project B
   settles.
3. Switch back to `TRACK01-A`; assert Track 08 rows return and the T08-04 location persists.

If the current persona has no project B membership, record this case BLOCKED, not FAIL.

### T08-06 — Administrator correction and append-only audit

1. Sign out and sign in as Project Admin A. Open `/tracking/data-analysis`, select
   `SP-T8-ACTIVE`, then click **Add Correction**.
2. Choose one uncompensated event under **Event to compensate (optional)**, keep direction
   **Manual**, choose the intended location, enter reason `T08 browser correction`, and a time
   later than the target. Click **Save event** once.
3. After refetch, assert history shows both the target immutable row and a new manual row with
   reason `T08 browser correction`; the target was not edited or deleted.
4. Click **Refresh**, then hard-refresh, and assert both audit rows and effective state remain.

### T08-07 — Invalid scanner preview, valid apply and duplicate reapply

1. As Project Admin A open `/admin/imports`.
2. In the import type selector choose **Tracking scanner events**.
3. Upload `scripts/tracking-scans.txt`. Assert **3 rows parsed · 1 errors** and visible
   direction error for `sideways`. **Apply import** must be disabled. This is the invalid-row
   reporting proof; do not bypass it.
4. Upload `scripts/tracking-scans-valid.txt`. Assert **2 rows parsed · 0 errors**; click
   **Apply import** once. Assert success toast **Applied 1 rows.**
5. Upload the same valid file again as a new job and apply once. Assert **Applied 0 rows.**
6. Return to `/tracking/data-analysis`, select `SP-T8-TRANSIT`, and assert exactly one effective
   `in` import event at `2026-08-09T07:00:00Z`; duplicates must not create extra history rows.

### T08-08 — Administrator CSV data dump

1. Open `/tracking/data-analysis`, tab **Consolidation**.
2. Click **Download active spools CSV**, **Download sub-locations CSV**, and
   **Download PDA users CSV** once each. Separate gestures avoid browser multiple-download
   blocking.
3. Assert three downloads with exact filenames:
   `TRACK01-A-active-spools.csv`, `TRACK01-A-sub-locations.csv`,
   `TRACK01-A-pda-users.csv`.
4. Inspect downloaded artifacts only. Each starts with a UTF-8 BOM and deterministic header;
   `active-spools` contains active `SP-T8-*` but excludes `SP-T8-ERECTED`; `sub-locations`
   contains the three locations; `pda-users` contains the assigned QC Editor only. No project B
   identity may appear.

### T08-09 — Administrator assignment handoff and final persistence

1. Open `/tracking/devices`; assert **Edit users** is present.
2. Click it and assert URL `/admin/project-referential` and the existing device/user assignment
   controls. Do not create a new assignment in this case.
3. Return to `/tracking`, click **Refresh**, and assert all prior durable command/import changes.
4. Sign out, sign in as Reader QC, return to Dashboard and Data Analysis, and assert the same
   effective state/history while all mutation controls are again absent.

## 5. Result template

```text
Stand date/time:
Branch/commit supplied by operator:
Preparation: PASS / FAIL / BLOCKED

T08-00 ... T08-09:
- Status:
- URL:
- Persona:
- Expected:
- Actual:
- Screenshot / console / request evidence (FAIL only):

Downloads observed:
Durability after refresh: PASS / FAIL / BLOCKED
Durability after re-authentication: PASS / FAIL / BLOCKED
Cross-project isolation: PASS / FAIL / BLOCKED
Overall Track 08 browser gate: PASS / FAIL / BLOCKED
```
