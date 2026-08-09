# Track 10 local browser fixtures

The bootstrap is deliberately local-only and does not print, persist, or accept credentials in its arguments. It reconciles the existing `TRACK01-A` project after the Track 01–09 migrations and fixture bootstraps have run.

Required environment, supplied out of band in the shell:

- `SUPABASE_URL=http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY` (local service-role key)

Run from the repository root:

```bash
npm run bootstrap:track10-browser-fixtures
npm run bootstrap:track10-browser-fixtures
```

Both runs must report the same project, `TP-T10-001`, two accepted ISO IDs, `P-T10-001`, and five team codes (`T10-LC-01`, `T10-FIN-01`, `T10-BL-01`, `T10-RI-01`, `T10-J-01`). The second run inserts no duplicate active membership. The script does not create Line Check results, punches, clearances, Blinding records, Testing events, or Reinstatement records; those are created by the browser walkthrough.

If prerequisites are missing, the script stops with a specific message. Never point it at a hosted Supabase URL. Enter the browser operator credentials interactively in the local app; do not add them to `.env`, this document, shell history, or Git.
