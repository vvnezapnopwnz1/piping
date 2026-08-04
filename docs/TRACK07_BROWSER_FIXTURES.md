# Track 07 Browser Fixtures Runbook

`npm run bootstrap:track07-browser-fixtures` provisions the field-side population for the
Erection walk. It is deliberately separate from Track 05/06: ISO `ISO-T7-001`, field joint
`W-T7-001`, site location `SITE-T7`, and welders `W-T7-FIELD-ROOT` / `W-T7-FIELD-CAP`.

Run the Track 01–06 bootstraps first, then supply local credentials out of band:

```zsh
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local secret, never commit>' \
SUPABASE_PUBLISHABLE_KEY='<local publishable key>' \
TRACK01_FIXTURE_PASSWORD='<same Track 01 password>' \
npm run bootstrap:track07-browser-fixtures
```

The script refuses non-local URLs, upserts its own welders/location/active `field` NDE rule,
imports the field ISO through the normal import RPC, and records To Site and field material
through the user-facing RPCs. The field joint is intentionally left open so the browser can
record it and then walk the rejected-weld/accepted-repair cascade. Re-running it is idempotent by accepted
revision and command idempotency keys. It never prints a secret.

Fixtures and pgTAP do not coexist: reset and replay the bootstrap chain when switching from
database tests to browser acceptance.
