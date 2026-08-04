# Track 07 Erection Browser Walkthrough — Agent Execution Script

This script covers the live Erection projection: To Site, field material, field weld quality,
support progress and derived RFT. It must be run against `http://localhost:3000` only after
the Track 07 fixture bootstrap. It is intentionally UI-only: no SQL, Studio, service key,
source edits, Git operations or direct Supabase calls from the browser agent.

## Agent contract

Use Playwright MCP. Every mutation must be a real click on a real PipeQC control. Never retry
an ambiguous mutation; reload and report BLOCKED. For every case report case ID, PASS/FAIL/
BLOCKED, URL, persona, expected result, actual result, and the first console/request failure.
Do not expose credentials.

## Stand preparation

Run the Track 01–06 bootstrap chain, then `npm run bootstrap:track07-browser-fixtures`, with
local credentials supplied out of band. Start the app with `NEXT_PUBLIC_PIPEQC_MODE=supabase`
and open `http://localhost:3000`.

## Fixture reference

| Object | Value |
| --- | --- |
| Isometric | `ISO-T7-001`, accepted `R0` |
| Spool | `SP-T7-001-A` |
| Field joint | `W-T7-001` (open until T07-03) |
| Field welders | `W-T7-FIELD-ROOT`, `W-T7-FIELD-CAP` |
| Site location | `SITE-T7` |

## Cases (continuous state)

1. **T07-00 baseline** — open `/erection/dashboard`; no demo badge/numbers, table names ISO
   and spool, and the fixture row is present with RFT false.
2. **T07-01 To Site** — open `/erection/to-site`, select `ISO-T7-001 / SP-T7-001-A`, click
   `Record To Site`, reload, and verify `to_site_on` is durable.
3. **T07-02 field material** — open `/erection/material-check`, select the same spool, click
   `Record field material check`, reload, and verify the field line count is checked.
4. **T07-03 field weld** — open `/erection/weld-progress`; the table must name ISO, spool and
   joint `W-T7-001`. Record field weld and verify the row has a weld date and pending field
   NDE obligations.
5. **T07-04 rejected weld result** — use `/nde` to issue the field joint's obligation and
   record a rejected result with a defect code. Verify the field spool is not RFT and the
   repair obligation is visible.
6. **T07-05 accepted repair** — record the repair result as accepted. Verify the original
   rejected obligation is superseded, the repair is satisfied, and outstanding NDE is zero.
7. **T07-06 erected/support/RFT** — record `Erected`, then `/erection/supported` record
   support, then `/erection/welded-bolted` record the milestone. Verify `/erection/rft` and
   `/erection/field-qc-release` show RFT only when welded/bolted + supported + NDE/PWHT
   pending are all closed; there is no manual RFT flag.
8. **T07-07 regressions** — re-walk the Track 05 golden path to laydown and Track 06 NDE
   cases on a clean fixture stand. A broken path is a Track 07 failure, not a deferred item.

## Known-good behaviour

- Assembly is absent from navigation and command controls; `PQC50` refuses it server-side.
- A field weld goes through the same weld/NDE obligation machinery as a shop weld.
- RFT is read-only and derived from authoritative dates and outstanding quality obligations.
- Refreshing any screen preserves the selected project's ISO/spool/joint state.

## Report template and stop conditions

Record each case as `T07-0x — PASS/FAIL/BLOCKED — URL — persona — expected — actual`.
Stop after two consecutive tool failures, an unexpected auth prompt, an unhandled dialog, an
ambiguous mutation, or any non-local URL. The report must include observed counts and dates,
not values inferred from source.

## Current execution note

The fixture and application checks are automated and green. Browser acceptance, including the
rejected-field-weld → accepted-repair sequence and Track 05/06 re-walk, remains **BLOCKED**
until a local Supabase fixture stand is bootstrapped with operator credentials and a browser
session is available. Do not mark these cases PASS from static code inspection.
