# Supabase Active-Project Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an authenticated user with several active project memberships to
select the current project safely in Supabase mode, while leaving demo mode
unchanged.

**Architecture:** `project_memberships` remains the only authority for the
projects and role available to a user. The auth provider loads every active
membership allowed by RLS, restores a user-scoped browser preference only when
it still appears in that authoritative list, and otherwise chooses a stable
first membership. Selecting a project updates client context and the
preference; it never writes a membership row or widens authorization. Every
project-specific API continues to receive the selected UUID explicitly, so RLS
is the final tenant-isolation boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict,
`@supabase/supabase-js`, existing shadcn `DropdownMenu`, local `tsx`
assertion scripts, existing local Supabase stack.

---

## Scope and non-negotiable rules

1. This slice replaces the current arbitrary `.limit(1).maybeSingle()`
   membership load. It must fetch **all** active memberships for the signed-in
   user.
2. The selected project is a UI context, not an authorization grant. Do not add
   an `active_project_id` column, do not update `project_memberships`, and do
   not add a privileged browser RPC.
3. Persist only the preferred project UUID in `localStorage`, under a key that
   includes the authenticated user UUID. Treat it as untrusted: validate it
   against the just-loaded active memberships on every session load.
4. If the stored project is missing, inactive, or no longer authorized, choose
   the first membership in a stable display order and overwrite/remove the
   stale preference. A user with no memberships remains on Access Pending.
5. The active membership's role alone is passed to `RoleProvider` in Supabase
   mode. Changing project may therefore change the locked UI role; it must not
   expose a manual role switcher.
6. Preserve every demo behavior, including mock project switching, demo reset,
   and local Zustand state. Do not add dependencies, seed data, or a database
   migration for this slice.
7. Do not render raw PostgREST errors. Keep the current app-shell error path
   and show generic user-facing failures.

## File map

| File | Responsibility |
| --- | --- |
| `contexts/supabase-auth-state.ts` | Pure normalisation, stable sorting, active-membership resolution, and safe storage-key helpers. |
| `contexts/supabase-auth-state.test.ts` | Assertion coverage for one/many/no memberships and stale preference fallback. |
| `contexts/supabase-auth-context.tsx` | Loads all memberships, owns selected membership, validates/restores the preference, and exposes selection. |
| `components/pipeqc/top-nav-state.ts` | Pure shape that distinguishes a locked single project from selectable Supabase projects. |
| `components/pipeqc/top-nav-state.test.ts` | Tests demo isolation and Supabase project-switch display input. |
| `components/pipeqc/top-nav.tsx` | Renders the real project dropdown only when several memberships exist and invokes context selection. |
| `app/admin/project-definition/page.tsx` | No new data source: confirm it continues using `membership.projectId` and reloads when selection changes. |
| `docs/SUPABASE_BACKEND_FOUNDATION.md` | Records the completed multi-membership context and names the next vertical slice. |

## Task 1: Define a pure, untrusted-preference selection contract

**Files:**
- Modify: `contexts/supabase-auth-state.ts`
- Modify: `contexts/supabase-auth-state.test.ts`

- [ ] **Step 1: Add failing tests before changing provider code.**

Extend the existing assertion script with a small local `memberships` fixture:

```ts
const memberships = [
  {
    membershipId: "membership-b",
    projectId: "project-b",
    activityCode: "PQ-020",
    title: "Beta Project",
    role: "qc_engineer" as const,
  },
  {
    membershipId: "membership-a",
    projectId: "project-a",
    activityCode: "PQ-010",
    title: "Alpha Project",
    role: "project_manager" as const,
  },
]

assert.equal(resolveActiveMembership(memberships, "project-b")?.projectId, "project-b")
assert.equal(resolveActiveMembership(memberships, "missing-project")?.projectId, "project-a")
assert.equal(resolveActiveMembership(memberships, null)?.projectId, "project-a")
assert.equal(resolveActiveMembership([], "project-a"), null)
assert.equal(activeProjectStorageKey("user-1"), "pipeqc.active-project:user-1")
```

Add an assertion proving `sortMembershipsForDisplay` returns a new array in
`activityCode`, then `title`, then `membershipId` order and does not mutate the
input array.

- [ ] **Step 2: Run RED.**

Run:

```bash
node --import tsx contexts/supabase-auth-state.test.ts
```

Expected: a missing-export failure for `resolveActiveMembership`,
`sortMembershipsForDisplay`, and `activeProjectStorageKey`.

- [ ] **Step 3: Implement the bounded helpers.**

Keep the existing access-state and project-display helpers. Add a shared
membership interface with the existing five fields and add:

```ts
export function sortMembershipsForDisplay<Membership extends SupabaseMembershipDisplay>(
  memberships: readonly Membership[],
): Membership[] {
  return [...memberships].sort((left, right) =>
    left.activityCode.localeCompare(right.activityCode) ||
    left.title.localeCompare(right.title) ||
    left.membershipId.localeCompare(right.membershipId),
  )
}

export function resolveActiveMembership<Membership extends SupabaseMembershipDisplay>(
  memberships: readonly Membership[],
  preferredProjectId: string | null,
): Membership | null {
  const sorted = sortMembershipsForDisplay(memberships)
  return sorted.find((membership) => membership.projectId === preferredProjectId)
    ?? sorted[0]
    ?? null
}

export function activeProjectStorageKey(userId: string): string {
  return `pipeqc.active-project:${userId}`
}
```

Do not put `localStorage` reads or writes in this pure module. The generic
signature must preserve `SupabaseMembership` rather than returning a reduced
display type, because the selected role is needed by `RoleProvider`.

- [ ] **Step 4: Run GREEN.**

Run:

```bash
node --import tsx contexts/supabase-auth-state.test.ts
npx tsc --noEmit --incremental false
```

Expected: both commands exit `0`.

## Task 2: Load every authorized membership and expose active-project context

**Files:**
- Modify: `contexts/supabase-auth-context.tsx`
- Modify: `contexts/supabase-auth-state.test.ts`

- [ ] **Step 1: Expand the public context contract.**

Replace the single-source `membership` state model with:

```ts
interface SupabaseAuthContextValue {
  user: User | null
  memberships: SupabaseMembership[]
  membership: SupabaseMembership | null
  error: Error | null
  accessState: SupabaseAccessState
  selectProject: (projectId: string) => void
  signOut: () => Promise<void>
  synchronizeProjectDisplay: (
    projectId: string,
    project: Pick<SupabaseMembership, "activityCode" | "title">,
  ) => void
}
```

`membership` stays as the active value so existing project-specific screens do
not gain an implicit fallback or use the entire list accidentally.

- [ ] **Step 2: Change the membership query and normalisation.**

Replace the current `.limit(1).maybeSingle()` request with a multi-row request:

```ts
const { data, error: membershipError } = await client
  .from("project_memberships")
  .select("id, role, project:projects(id, activity_code, title)")
  .eq("user_id", sessionUser.id)
  .eq("is_active", true)
```

Change `normalizeMembership` into `normalizeMemberships(rows)` that drops only
rows whose joined project is unexpectedly `null`, then calls
`sortMembershipsForDisplay`. Do not call `.order()` on the query: the pure
sorter gives a deterministic UI order even if PostgREST join ordering changes.

- [ ] **Step 3: Restore only a valid preference.**

Inside the existing version/disposal guard, after a successful query:

```ts
const memberships = normalizeMemberships(data ?? [])
const storageKey = activeProjectStorageKey(sessionUser.id)
const preferredProjectId = safelyReadLocalStorage(storageKey)
const activeMembership = resolveActiveMembership(memberships, preferredProjectId)

setMemberships(memberships)
setMembership(activeMembership)
setAccessState(deriveSupabaseAccessState(sessionUser, activeMembership))
safelyWriteOrRemoveLocalStorage(storageKey, activeMembership?.projectId ?? null)
```

Implement the local helper functions in this `.tsx` file, not a new global
storage abstraction:

```ts
function safelyReadLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safelyWriteOrRemoveLocalStorage(key: string, projectId: string | null) {
  try {
    if (projectId) window.localStorage.setItem(key, projectId)
    else window.localStorage.removeItem(key)
  } catch {
    // Browser storage is a preference only; context remains usable without it.
  }
}
```

The provider is client-only, but these helpers must still tolerate blocked
storage. Clear both `memberships` and `membership` before unauthenticated,
loading, error, or demo states. Never retain the prior user's selection during
an auth event.

- [ ] **Step 4: Implement `selectProject` as a local, validated switch.**

Use a callback with functional state, so the UI can only select an item from
the current RLS-loaded list:

```ts
const selectProject = React.useCallback((projectId: string) => {
  if (appMode !== "supabase" || !user) return

  setMemberships((currentMemberships) => {
    const next = currentMemberships.find((item) => item.projectId === projectId)
    if (!next) return currentMemberships

    setMembership(next)
    safelyWriteOrRemoveLocalStorage(activeProjectStorageKey(user.id), next.projectId)
    return currentMemberships
  })
}, [appMode, user])
```

Do not query Supabase or write a row in this callback. A forged project UUID is
a no-op. In `synchronizeProjectDisplay`, map over `memberships` to update the
matching display fields and apply `synchronizeMembershipProjectDisplay` to the
active membership; preserve IDs and roles in both cases.

- [ ] **Step 5: Verify provider boundary with typecheck and focused code review.**

Run:

```bash
node --import tsx contexts/supabase-auth-state.test.ts
npx tsc --noEmit --incremental false
```

Confirm by inspection that the only membership query still has both
`.eq("user_id", sessionUser.id)` and `.eq("is_active", true)`, and that no
`insert`, `update`, `delete`, service-role key, or `active_project_id` appears
in the diff.

## Task 3: Render the real project selector without changing demo navigation

**Files:**
- Modify: `components/pipeqc/top-nav-state.ts`
- Modify: `components/pipeqc/top-nav-state.test.ts`
- Modify: `components/pipeqc/top-nav.tsx`

- [ ] **Step 1: Write failing pure display tests.**

Replace the Supabase input fixture with explicit active and available projects:

```ts
const projects = [
  { projectId: "project-a", activityCode: "PQ-010", title: "Alpha", role: "Project Manager" },
  { projectId: "project-b", activityCode: "PQ-020", title: "Beta", role: "QC Engineer" },
]

assert.deepEqual(
  getTopNavDisplay("supabase", {
    membership: projects[0],
    memberships: projects,
    email: "person@example.com",
    roleLabel: "Project Manager",
  }),
  {
    kind: "supabase",
    project: projects[0],
    projects,
    canSwitchProject: true,
    email: "person@example.com",
    roleLabel: "Project Manager",
  },
)
```

Add a single-project case expecting `canSwitchProject: false`, and retain the
existing assertion that demo mode returns exactly `{ kind: "demo" }` even when
real membership data is present.

- [ ] **Step 2: Run RED.**

Run:

```bash
node --import tsx components/pipeqc/top-nav-state.test.ts
```

Expected: failure because `memberships` and `canSwitchProject` are not yet in
the pure Supabase display model.

- [ ] **Step 3: Extend the pure display model.**

Define a `TopNavProjectChoice` containing `projectId`, `activityCode`,
`title`, and `roleLabel`. Change the Supabase branch to return:

```ts
{
  kind: "supabase",
  project: input.membership ?? fallbackProject,
  projects: input.memberships,
  canSwitchProject: input.memberships.length > 1,
  email: input.email ?? "Authenticated user",
  roleLabel: input.roleLabel,
}
```

Build `projects` in `TopNav` from `memberships` and the existing `ROLES`
metadata rather than passing database role IDs into presentation labels.

- [ ] **Step 4: Update `TopNav`.**

Read `memberships` and `selectProject` from `useSupabaseAuth()`. Keep the
existing demo dropdown untouched. For Supabase mode:

- render the existing static project text when `canSwitchProject` is false;
- render a `DropdownMenu` when it is true, using the same compact trigger
  visual as demo mode but never using mock `projects`;
- map `topNavDisplay.projects` to items with activity code, title and role
  label; highlight the active `projectId` with `bg-accent`;
- invoke `selectProject(project.projectId)` on click;
- do not show an optimistic toast, manual role controls, or a project creation
  action.

The selection must be reachable by keyboard via the existing shadcn menu. Keep
the right-side account dropdown and Sign out unchanged.

- [ ] **Step 5: Run GREEN.**

Run:

```bash
node --import tsx components/pipeqc/top-nav-state.test.ts
npx tsc --noEmit --incremental false
```

Expected: both commands exit `0`.

## Task 4: Make project-specific screens react to context changes

**Files:**
- Modify: `app/admin/project-definition/page.tsx` only if dependency handling is incomplete
- Test: `lib/project-definition.test.ts`

- [ ] **Step 1: Inspect, do not duplicate the data layer.**

The existing Supabase Project Definition view must derive its load callback
from `membership?.projectId`. It must cancel/ignore an in-flight response from
Project A after selection changes to Project B, clear Project A form state
while loading Project B, and never use `membership` from a stale closure.

- [ ] **Step 2: Add a focused pure regression only if the existing state helper needs it.**

If the page already gives `projectId` to `loadProjectDefinition` and guards
request versions, do not add a redundant test. If it does not, extract a pure
request-version helper in `lib/project-definition.ts`, write a failing
assertion that an older request cannot replace newer project state, then wire
the page to it. Do not introduce routing or a global store merely for this
screen.

- [ ] **Step 3: Verify exact project scoping.**

Run:

```bash
node --import tsx lib/project-definition.test.ts
npx tsc --noEmit --incremental false
```

Expected: exit `0`. Inspect the Supabase API and confirm every project read or
save still uses explicit `.eq("id", projectId)`; the selector must not become
an authorization substitute.

## Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`

- [ ] **Step 1: Update the implementation status.**

Replace the “next unstarted vertical slice” paragraph with a statement that
real mode loads all active memberships, persists only a validated per-user
project preference, and continues to enforce access through RLS. Name the next
vertical as **one project-scoped configuration referential**, beginning with
WPS CRUD, rather than claiming all project referentials are ready.

- [ ] **Step 2: Run automated checks without resetting local data.**

Run:

```bash
/opt/homebrew/bin/supabase test db
node --import tsx lib/app-mode.test.ts
node --import tsx lib/supabase/config.test.ts
node --import tsx lib/supabase/browser-client.test.ts
node --import tsx contexts/supabase-auth-state.test.ts
node --import tsx components/pipeqc/app-shell-state.test.ts
node --import tsx components/pipeqc/top-nav-state.test.ts
node --import tsx lib/project-definition.test.ts
npx tsc --noEmit --incremental false
NEXT_PUBLIC_PIPEQC_MODE=demo npm run build
git diff --check
```

Expected: every command exits `0`. Do not run `supabase db reset` and do not
stop the local stack unless the owner asks.

- [ ] **Step 3: Perform manual Supabase-mode acceptance.**

Use a controlled second active `project_memberships` row created through the
reviewed bootstrap/SQL-admin path for the same user; do not create it from the
browser. Then:

1. Start the app with `NEXT_PUBLIC_PIPEQC_MODE=supabase npm run dev`.
2. Sign in and verify the top bar lists exactly both RLS-visible projects.
3. Select Project B; confirm the top bar and locked role change immediately.
4. Open Project Definition; confirm it loads Project B, not Project A.
5. Reload; confirm Project B remains selected for this user.
6. Remove/deactivate the Project B membership through the reviewed admin path,
   reload, and confirm the app falls back to Project A without an error.
7. Sign out, sign in as another user (or clear the session and use a user with
   a different membership set), and confirm the first user's local preference
   is not reused.
8. Restart in demo mode and confirm mock project switching, reset, and mock
   role switching still behave exactly as before.

- [ ] **Step 4: Handoff.**

Leave changes unstaged unless the repository owner explicitly requests staging
or a commit. Report automated results separately from the manual acceptance
steps that require the owner’s local users and memberships.
