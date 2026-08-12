# Track 10 Browser Acceptance Gate D — PASS

**Date:** 2026-08-09
**Environment:** `http://localhost:3000` (local Supabase stack)
**Verdict:** **PASSED — 12 / 12 cases**

The authenticated walkthrough in [track-10-agent-walkthrough.md](track-10-agent-walkthrough.md)
was run sequentially through the browser. All mutations were made through the UI; no SQL, direct
API mutation, or source edit was used during the run.

| Cases | Result | Evidence retained by the run |
| --- | --- | --- |
| T10-01–02 Builder composition | PASS | `TP-T10-001`, revision 0, one ISO persists after refresh |
| T10-03–05 Line Check, X punch, Item Clearance, derived RFT | PASS | `LC-000001`, `IC-000001`; Explorer changed from X-blocked to `RFT: Yes · 12` |
| T10-06–07 Blinding | PASS | non-RFT rejection (`PQT06`), then `BL-000001` completed |
| T10-08–10 Testing, Y guard, Y/Z reinstatement | PASS | server rejected pre-commissioning before Y; `RI-000001` and `RI-000002` completed |
| T10-11 Durable print views | PASS | Line Check, Item Clearance, Blinding, and both Reinstatement URLs resolved and survived refresh |
| T10-12 Reader and project switching | PASS | mutation controls disabled; `TRACK01-B` showed no leaked `TRACK01-A` rows |

The run specifically proved the two defects found in the earlier partial run are closed:

- pre-commissioning is rejected until every required Y reinstatement is complete;
- all request print routes resolve by durable request ID under the current Next.js App Router.

Track 10 is closed. The Track 12 final regression will re-run the application as a whole; it is
not a pending Track 10 acceptance condition.
