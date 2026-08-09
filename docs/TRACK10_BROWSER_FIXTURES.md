# Track 10 local browser fixtures

The bootstrap is deliberately local-only and does not print, persist, or accept credentials in its arguments. It prepares `TRACK01-A` after the prerequisite fixture chain has run.

Required environment, supplied out of band in the shell:

- `SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY` (local service-role key)

Run from the repository root:

```bash
npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track03-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track05-browser-fixtures
npm run bootstrap:track06-browser-fixtures
npm run bootstrap:track07-browser-fixtures
npm run bootstrap:track09-browser-fixtures
npm run bootstrap:track10-browser-fixtures
npm run bootstrap:track10-browser-fixtures
```

Both Track 10 runs must report the same project, `mainIsometricId`, `blockedIsometricId`, project `references`, `TP-T10-BLOCKED`, `P-T10-001`, and five team codes (`T10-LC-01`, `T10-FIN-01`, `T10-BL-01`, `T10-RI-01`, `T10-J-01`). The bootstrap intentionally does **not** create `TP-T10-001`: the browser walkthrough creates it with the printed main ISO. It does create `TP-T10-BLOCKED`, containing the printed non-RFT ISO for the rejected-Blinding check.

The bootstrap also grants `track01.reader-qc@example.test` read-only `testpack.view` access to both `TRACK01-A` and `TRACK01-B`. Its controls must remain disabled in the browser. The operator persona is `track01.qc-editor@example.test` in `TRACK01-A`.

The script does not create Line Check results, punches, clearances, Blinding records, Testing events, or Reinstatement records; those are created by the browser walkthrough. Run this preparation only against a clean fixture database: if `TP-T10-001` already exists, the bootstrap stops rather than overwriting browser evidence.

If prerequisites are missing, the script stops with a specific message. Never point it at a hosted Supabase URL. Enter the browser operator credentials interactively in the local app; do not add them to `.env`, this document, shell history, or Git.
