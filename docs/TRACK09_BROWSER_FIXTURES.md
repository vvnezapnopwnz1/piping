# Track 09 local browser fixtures

Prerequisites: local Supabase, the earlier Track 01–04 fixture bootstraps, and the local fixture operator account. The script refuses non-local URLs, reads credentials only from environment variables supplied out of band, and never resets the database.

```bash
npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track09-browser-fixtures
npm run bootstrap:track09-browser-fixtures
```

The second Track 09 run must report the same project, two jointers and accepted Track 04 flange definitions. It creates/updates only the `T9-` referentials and never prints credentials.
