# Track 10 browser Gate D — CLOSED

**Status:** PASS, 12 / 12 cases on 2026-08-09. See [Track 10 Gate D report](track-10-gate-d-report.md).
The runbook remains the repeatable procedure for the final Track 12 regression, but it is no
longer an open Track 10 gate.

Run the app against the local Supabase stack only (`http://localhost:3000`). The human operator must first run the exact preparation chain in `docs/TRACK10_BROWSER_FIXTURES.md` and provide the common fixture password interactively; the browser agent must not run bootstrap commands, read `.env`, use SQL/Studio/direct API, edit source, or perform Git actions.

Use `track01.qc-editor@example.test` for T10-01 through T10-11. Use `track01.reader-qc@example.test` for T10-12. From the final Track 10 bootstrap output, retain `mainIsometricId`, `blockedIsometricId`, and `references`. Record every case as `PASS`, `FAIL`, or `BLOCKED`, with URL, persona, expected versus actual, one screenshot for a failure, and each durable request ID shown by the page. If prerequisites or credentials are unavailable, mark the gate `BLOCKED` without changing data.

1. Open `/testpack/builder`. Create `TP-T10-001` with the printed `references`, `High`, `H`, pressure `10`, location `Track 10 browser QA`, planned dates `2026-08-05` to `2026-08-31`, then select `mainIsometricId` and choose **Create and compose**. Refresh: the pack and member remain, revision is `0`.
2. Confirm `mainIsometricId` is now a current member and no longer appears in **Available accepted ISOs**. Active duplicate rejection remains covered by pgTAP `101_test_pack_composition.test.sql`; do not manufacture duplicate state during the browser gate.
3. Open `/testpack/pressure-test/line-check/preparation?testPackId=<pack-id>`, select `T10-LC-01`, select an ISO, and assign. Open the printable request link, note its durable request ID, and refresh the progress page.
4. Complete the Line Check with date `2026-08-05` and punch code `P-T10-001`, description `X-T10-001`; refresh `/testpack/explorer?testPackId=<pack-id>`. RFT must remain false and the ISO must show open X.
5. Open Item Clearance preparation, choose `T10-FIN-01`, assign the open X item, clear it, and refresh Explorer. RFT must become true from the projection without a toggle.
6. Open Blinding preparation with `TP-T10-BLOCKED` selected (it contains the printed `blockedIsometricId`) and attempt assignment with `T10-BL-01`. The server must reject it as not RFT.
7. Open Blinding preparation for `TP-T10-001`, assign `T10-BL-01`, complete it on `2026-08-06`, and refresh. The printable request must resolve by its request ID.
8. Open Testing / Pre-commissioning progress. Record **Start testing** on `2026-08-07`, then **Complete testing** on `2026-08-08`.
9. Attempt Pre-commissioning before Y reinstatement on a fixture with Y joints; the server must reject the transition.
10. Assign Y reinstatement to `T10-RI-01`, record the joint with report `R-T10-Y-001`, jointer `T10-J-01`, and tag `TAG-T10-Y-001`. Complete Pre-commissioning, then assign and record Z with `R-T10-Z-001`/`TAG-T10-Z-001`.
11. Open each Line Check, Item Clearance, Blinding, and Reinstatement print URL by durable request ID; reload every progress page and confirm completed state remains.
12. Sign in as `track01.reader-qc@example.test`. `/testpack`, Builder, and Explorer remain readable, but create/add/remove/archive/assign/complete controls are disabled. Switch from `TRACK01-A` to `TRACK01-B`, wait for loading to settle, and verify no rows from `TRACK01-A` flash or remain.
13. This gate covers Track 10 only. Track 06 rejected-repair, Track 07 derived-RFT, and Track 09 flange-history have their own browser runbooks; report any separate re-runs under their own tracks.

Automated pgTAP, typecheck, unit tests, and build do not substitute for this gate. If no authenticated local browser is available, mark Gate D `BLOCKED` and include the missing environment rather than marking Track 10 accepted.
