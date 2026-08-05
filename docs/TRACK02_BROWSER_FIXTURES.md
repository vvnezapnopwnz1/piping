# Track 02 Browser Fixtures — there are none

**There is no Track 02 fixture bootstrap. Do not look for one.**

`scripts/bootstrap-track02-browser-fixtures.ts` and its `npm run bootstrap:track02-browser-fixtures`
script were deleted on 2026-08-05. This file previously described them as reconciling an
idempotent master reference dataset. They never did: the script built a plan of subcontractors,
material types, service classes and weld types, verified that project `TRACK01-A` existed, and
printed `Track 02 browser fixtures completed successfully!` without inserting a single row. Its
unit test asserted the plan's *shape*, so it passed. The Track 01–02 audit of 2026-07-31 already
recorded this — `docs/audits/track_1_2_audit_31_07_2026.md`, "Task 16 не выполнен" — and it stayed
that way for five weeks because nothing depended on it.

Nothing depended on it because the Track 02 referentials are created **through the UI**, which is
the actual subject of `docs/qa/tracks-01-05-agent-walkthrough.md`. Seeding them by script would
have made that walkthrough's own cases vacuous. Later tracks seed their own codes: `SUB-T5`,
`SC-T4`, `BW-T4`, `CAT-T5` come from `bootstrap:track05-browser-fixtures`.

## Where project referentials come from now

| Referential | Created by |
| --- | --- |
| Subcontractors, units, area classifications, PDS areas | `/admin/project-referential`, Project Geography tab |
| Service classes, weld types, welders, thickness/flange rules, NDE matrix rules, defect codes, PML records | `/admin/project-referential`, Welding & Quality tab |
| Welding procedures (WPS) | `/admin/project-referential`, its own editor |
| Teams, systems, subsystems | `/admin/project-referential`, Execution tab |
| Devices, assembly settings | `/admin/project-referential`, Extended tab |
| Track 04–07 test data | `bootstrap:track0{4,5,6,7}-browser-fixtures` |

Five of those are not optional for a working project — each blocks a documented server-side
check when absent. `modules/project-setup/ui/referential-dialogs.test.ts` pins that their dialogs
exist, and the reasoning is recorded at the top of `welding-quality-tabs.tsx`.

## The fixture chain

```zsh
npm run bootstrap:track01-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures &&
npm run bootstrap:track04-browser-fixtures &&
npm run bootstrap:track05-browser-fixtures &&
npm run bootstrap:track06-browser-fixtures &&
npm run bootstrap:track07-browser-fixtures
```

The gap at 02 is deliberate. `docs/qa/local-supabase-browser-runbook.md` is the policy document
for running any of it.
