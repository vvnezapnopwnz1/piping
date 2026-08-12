# Track 11 Demo Lite browser walkthrough

Run only against `http://localhost:3000` with the local Supabase fixture stand. The operator supplies credentials interactively. Do not use `.env`, Studio, SQL, direct API calls, source edits, or Git actions during the walkthrough.

## Preconditions

- Complete the local preparation chain in `docs/TRACK10_BROWSER_FIXTURES.md` through the Track 10 bootstrap.
- Sign in as `track01.qc-editor@example.test` and select `TRACK01-A`.
- Complete Track 10 cases through the RFT transition if the Test Pack PDF is expected to show an RFT-ready `TP-T10-001` row. Otherwise use the blocker values visible in the current fixture stand as the expected PDF evidence.

## T11-01 — visible catalog and Fabrication Progress

1. Open `/reports`.
2. Confirm the active-project label is `TRACK01-A` and there are exactly two cards: **Fabrication Progress** (`RPT-F-001`, XLSX) and **Test Pack RFT Pursuit** (`RPT-T-001`, PDF).
3. Confirm no Welder Performance, NDE Batch Status, disabled cards, fake file sizes, or document-history controls appear.
4. Click **Download XLSX** on Fabrication Progress. Wait for the browser download.
5. Open the downloaded file. It must open without a repair prompt and display the project code, generation timestamp, and spreadsheet headers `Spool`, `Weld`, `Location`, `WPS`, `Welders`, `Welded On`, `NDE Pending`, `NDE Total`.
6. If Track 05 fixture data is present, verify the workbook contains `SP-T4-001-A` and a weld from the accepted revision. If the local project has no rows, verify the header-only workbook opens successfully.

## T11-02 — Test Pack RFT Pursuit

1. On `/reports`, click **Download PDF** on Test Pack RFT Pursuit.
2. Open the download. It must open without a repair prompt and show the active project code and generation timestamp.
3. For each visible Test Pack row, compare its number and blocker values against `/testpack/explorer` after a refresh. In particular, for `TP-T10-001`, verify the PDF RFT state matches the Explorer projection after the Track 10 Line Check/X-clearance sequence.
4. If no Test Packs exist, verify the PDF reads `No Test Packs in this project.`

## T11-03 — project isolation

1. Start a report download in `TRACK01-A`, then immediately switch the active project to `TRACK01-B` before the result appears.
2. Expected: no file from the old project is downloaded after the switch; `/reports` resets for the new project.
3. Generate each report in `TRACK01-B`. Any downloaded file must use the `TRACK01-B` filename prefix and contain only that project’s data or an empty valid artifact.

Record every case as `PASS`, `FAIL`, or `BLOCKED`, including URL, active project, expected versus actual result, and a screenshot on failure. Automated tests do not replace this browser/file-viewer gate.

## Execution evidence — 2026-08-10

Fixture stand: local `http://localhost:3000`; authenticated operator: `track01.qc-editor@example.test`; active project: `TRACK01-A`.

| Case | Result | Evidence |
| --- | --- | --- |
| T11-01 | PASS | `/reports` showed exactly `RPT-F-001` Fabrication Progress (XLSX) and `RPT-T-001` Test Pack RFT Pursuit (PDF), with no additional/disabled report cards, fake sizes, or history controls. The UI confirmed both downloads from the current project snapshot. The operator opened the XLSX without a repair prompt and confirmed that it contained report information. |
| T11-02 | PASS | `/testpack/explorer` showed `TP-T10-001` with `RFT: Yes · 12`; the UI confirmed the PDF download from the current project snapshot. The operator opened the PDF without a repair prompt and confirmed that it contained report information. |
| T11-03 | NOT RUN — accepted residual risk | The current `track01.qc-editor@example.test` UI exposed no active-project selector, so an A-to-B switch could not be performed through the approved browser-only path. No database reset, bootstrap, or direct state manipulation was used. The product owner accepted Demo Lite close-out with this browser case unexercised. |

Fresh automated verification for this close-out: `npm run typecheck`, targeted ESLint for the Reports slice, and 13 focused unit tests all passed. Track 11 Demo Lite is closed; it remains explicitly limited to current-data browser exports rather than durable document management.
