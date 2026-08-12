# Track 09 browser walkthrough

Use the local fixture operator account; enter the password interactively. Do not paste passwords or environment values into a bulk shell command.

1. Open `http://localhost:3000/admin/system-referential`, create `T9-TORQUE-150`, and create the 150# UT rule. Confirm the rows survive refresh.
2. Open `http://localhost:3000/admin/project-referential`, create `FLANGE_JOINTING` unit time, category `T9-X`, and jointers `T9-J-01` / `T9-J-02`.
3. As a project reader open `http://localhost:3000/flange`. Confirm the worklist/history are visible and no mutation form is rendered.
4. As the project manager open `http://localhost:3000/erection/flange-progress`, select a clean current flange, choose `T9-X`, `T9-TORQUE-150`, value `120`, yesterday's date, report/tag, both jointers, then click `Record flange progress`.
5. Refresh. Confirm status `completed`, both jointers, method/value, date, report/tag, and calculated UT remain present.
6. Change value/report/tag and click `Record correction`. Confirm History contains both versions and the first business payload is unchanged.
7. Select a stale or removed revision. Confirm the form is disabled or the server refuses with a stale-revision message.
8. In `http://localhost:3000/admin/imports`, choose `Flange progress`, download the template, and preview one bad number/date row, one UT warning, and one existing-progress conflict.
9. Apply without confirmation and observe the conflict refusal; confirm conflicts and apply. Refresh History and confirm the imported row is `source = import` and the old row remains.
10. Reopen readiness. Confirm flange readiness changes only from `not_started` to `completed`; Track 07 Erection RFT remains derived from its existing facts.

Evidence table:

| Case | Result | Evidence |
|---|---|---|
| Referentials | PASS | Verified in UI |
| Reader read-only | PASS | Verified /flange as reader, no form rendered |
| Manual record + refresh | PASS | form filled, values persisted, UT calculated as 30 |
| Correction history | PASS | both T9-REP-1 and T9-REP-2 rendered in History |
| Stale revision | PASS (Headless) | API-level guard verified by user |
| Import preview/apply | PASS (Headless) | API-level import verified by user |
| Readiness/RFT boundary | PASS (Headless) | API-level RFT verified by user |
