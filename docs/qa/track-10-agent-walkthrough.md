# Track 10 browser Gate D

Run the app against the local Supabase stack, sign in with a project user that has `testpack.view` and `testpack.manage`, and use the IDs printed by the fixture bootstrap. Record each case as `PASS`, `FAIL`, or `BLOCKED` with a screenshot and the durable ID shown by the page.

1. Open `/testpack/builder`. Create `TP-T10-001` with the project references, `High`, `H`, pressure `10`, location `Track 10 browser QA`, planned dates `2026-08-05` to `2026-08-31`, then select one eligible ISO and choose **Create and compose**. Refresh: the pack and member remain, revision is `0`.
2. Select the second ISO and **Add selected ISOs**. Attempt to add the first ISO again; the server must reject the active duplicate and the UI must show the mapped conflict.
3. Open `/testpack/pressure-test/line-check/preparation?testPackId=<pack-id>`, select `T10-LC-01`, select an ISO, and assign. Open the printable request link, note its durable request ID, and refresh the progress page.
4. Complete the Line Check with date `2026-08-05` and punch code `P-T10-001`, description `X-T10-001`; refresh `/testpack/explorer?testPackId=<pack-id>`. RFT must remain false and the ISO must show open X.
5. Open Item Clearance preparation, choose `T10-FIN-01`, assign the open X item, clear it, and refresh Explorer. RFT must become true from the projection without a toggle.
6. On the blocked candidate (the ISO with upstream blockers), attempt Blinding. The server must reject it as not RFT.
7. Open Blinding preparation for `TP-T10-001`, assign `T10-BL-01`, complete it on `2026-08-06`, and refresh. The printable request must resolve by its request ID.
8. Open Testing / Pre-commissioning progress. Record **Start testing** on `2026-08-07`, then **Complete testing** on `2026-08-08`.
9. Attempt Pre-commissioning before Y reinstatement on a fixture with Y joints; the server must reject the transition.
10. Assign Y reinstatement to `T10-RI-01`, record the joint with report `R-T10-Y-001`, jointer `T10-J-01`, and tag `TAG-T10-Y-001`. Complete Pre-commissioning, then assign and record Z with `R-T10-Z-001`/`TAG-T10-Z-001`.
11. Open each Line Check, Item Clearance, Blinding, and Reinstatement print URL by durable request ID; reload every progress page and confirm completed state remains.
12. Sign in as a read-only user. `/testpack`, Builder, and Explorer remain readable, but create/add/remove/archive/assign/complete controls are disabled. Switch projects and verify no rows from the prior project flash or remain.
13. Re-run the Track 06 rejected-repair, Track 07 derived-RFT, and Track 09 flange-history browser cases. Report them separately from Track 10.

Automated pgTAP, typecheck, unit tests, and build do not substitute for this gate. If no authenticated local browser is available, mark Gate D `BLOCKED` and include the missing environment rather than marking Track 10 accepted.
