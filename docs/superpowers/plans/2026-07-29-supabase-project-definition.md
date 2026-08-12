# Supabase Project Definition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/admin/project-definition` read and update the authenticated
member's current project in Supabase mode, while preserving the demo store.

**Architecture:** A small typed Supabase API maps `public.projects` to a
UI-shaped record and derives edit capability from the existing database
function. The page chooses its data source by app mode. PostgreSQL grants only
the update columns this form can write; RLS remains the final authorization
boundary.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict,
`@supabase/supabase-js`, Supabase migrations/pgTAP, Zustand demo store.

---

## File map

| File | Responsibility |
| --- | --- |
| `supabase/migrations/*_grant_project_definition_updates.sql` | Minimal column-level database privilege for this screen. |
| `supabase/tests/database/001_project_settings_and_referentials.test.sql` | Assert the grants required before RLS applies. |
| `lib/project-definition.ts` | Pure form model, validation, and DB update mapper. |
| `lib/project-definition.test.ts` | Assertion tests for validation and safe update payloads. |
| `lib/supabase/project-definition.ts` | Typed load/capability/save calls scoped to an explicit project ID. |
| `app/admin/project-definition/page.tsx` | Demo/Supabase UI adapter and loading/read-only/error states. |

### Task 1: Add the least database privilege needed for project definition

**Files:**
- Create: `supabase/migrations/<timestamp>_grant_project_definition_updates.sql`
- Modify: `supabase/tests/database/001_project_settings_and_referentials.test.sql`

- [ ] Add two pgTAP assertions before the implementation:

```sql
select ok(
  has_column_privilege('authenticated', 'public.projects', 'activity_code', 'update'),
  'authenticated can update project definition activity code before RLS applies'
);
select ok(
  has_column_privilege('authenticated', 'public.projects', 'maximum_transit_time_days', 'update'),
  'authenticated can update project definition transit time before RLS applies'
);
```

- [ ] Run `/opt/homebrew/bin/supabase test db`; it must fail on those new
  assertions before the migration exists.

- [ ] Create the migration:

```sql
grant update (
  activity_code,
  title,
  owner_name,
  contractor_name,
  owner_logo_path,
  contractor_logo_path,
  maximum_transit_time_days
) on public.projects to authenticated;
```

- [ ] Apply it non-destructively with
  `/opt/homebrew/bin/supabase migration up --local`, then rerun
  `/opt/homebrew/bin/supabase test db`; all assertions must pass.

### Task 2: Define and test the browser-safe project definition contract

**Files:**
- Create: `lib/project-definition.ts`
- Create: `lib/project-definition.test.ts`

- [ ] Write failing assertion cases for:
  - mapping a `projects` row into the UI form model;
  - uppercasing/validating an activity code;
  - rejecting empty title, owner, contractor, and transit time below one;
  - an update payload containing only the seven allowed mutable columns.

- [ ] Implement `toProjectDefinition`, `validateProjectDefinition`, and
  `toProjectDefinitionUpdate`. The update type must not include `id`,
  `created_by`, `status`, `created_at`, or `updated_at`.

- [ ] Run `node --import tsx lib/project-definition.test.ts`; it must pass.

### Task 3: Add typed Supabase read/capability/update operations

**Files:**
- Create: `lib/supabase/project-definition.ts`

- [ ] Implement `loadProjectDefinition(client, projectId)` using an exact
  primary-key filter and the seven display fields plus `updated_at`.
- [ ] In parallel with the read, call
  `client.rpc('can_administer_project', { target_project_id: projectId })`.
- [ ] Implement `saveProjectDefinition(client, projectId, input)` with
  `.update(toProjectDefinitionUpdate(input)).eq('id', projectId).select(...).single()`.
- [ ] Return errors to the page as `Error` values; the page must decide the
  user-facing generic wording and must never substitute demo data on failure.

### Task 4: Wire the existing page by app mode

**Files:**
- Modify: `app/admin/project-definition/page.tsx`

- [ ] Preserve the existing Zustand read/save path when `useAppMode()` is
  `demo`.
- [ ] In `supabase` mode, use `useSupabaseAuth().membership.projectId` and the
  typed API to populate local form state from the database.
- [ ] Render loading, generic load failure with retry, and read-only states.
  A false `can_administer_project` result disables/omits Save; no role string
  in the browser is treated as authorization.
- [ ] On a permitted successful save, replace both form and summary state with
  the returned row and show the existing success toast. On failure, retain form
  input and show a generic failure toast.

### Task 5: Verify both modes and database protection

**Files:**
- Test: `supabase/tests/database/001_project_settings_and_referentials.test.sql`
- Test: `lib/project-definition.test.ts`

- [ ] Run the database tests and pure project-definition test.
- [ ] Run all existing Supabase pure tests, `npx tsc --noEmit --incremental false`,
  and `NEXT_PUBLIC_PIPEQC_MODE=demo npm run build`.
- [ ] Browser-check Supabase mode: change `maximum_transit_time_days`, save,
  reload, and confirm persistence. Browser-check demo mode separately to
  confirm its local mock still saves without a Supabase client.
- [ ] Stop the local Supabase stack only after the user has completed browser
  verification, unless they ask to stop it earlier.
