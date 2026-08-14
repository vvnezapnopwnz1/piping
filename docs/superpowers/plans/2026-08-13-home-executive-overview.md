# Home Executive Overview Implementation Plan

**Goal:** turn Home into a live, permission-safe executive entry point for the Fabrication, NDE, and Erection demo story.

**Architecture:** keep Home client-side so it can use the active project and capabilities. A small Home repository invokes only the three existing aggregate RPCs; a pure domain mapper converts their rows into presentation-ready totals. The UI loads permitted aggregates independently and preserves the module navigation grid.

## Tasks

- [ ] Add a failing domain test that specifies how three aggregate distributions become Home totals and attention counts.
- [ ] Implement the minimal pure mapper and focused Supabase Home aggregate repository; do not add RPCs or query worklists.
- [ ] Replace the static Home header with a responsive executive overview that renders loading, no-project, unavailable-card, and live-data states; keep all module links.
- [ ] Add focused source-level UI/repository checks for the three existing RPC contracts and non-invented data rule.
- [ ] Verify focused tests, the complete unit suite, `npm run typecheck`, `npm run build`, and `git diff --check`.

## Boundaries

No Git operations, migrations, generated types, seeded data, database mutation, or browser automation are part of this implementation. Existing unrelated worktree changes remain untouched.
