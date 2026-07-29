# Supabase Real Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current demo by default and add a flag-controlled Supabase mode whose session, role and project are sourced from Auth and `project_memberships`.

**Architecture:** A pure parser resolves `NEXT_PUBLIC_PIPEQC_MODE` to `demo` or `supabase`; a provider exposes that result to the UI. In real mode an Auth provider loads the authenticated user and a single active membership, then renders either login, access-pending, or the normal shell. The existing Zustand stores stay untouched in this increment; `RoleProvider` receives a read-only role in Supabase mode so the UI cannot locally switch a database-derived role.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase JS 2, Zustand, Tailwind/shadcn, local `tsx` assertion scripts, Supabase DB tests.

---

## File map

| File | Responsibility |
| --- | --- |
| `lib/app-mode.ts` | Parse the public build flag without importing browser-only code. |
| `lib/app-mode.test.ts` | Executable assertions for absent, valid and invalid flag values. |
| `contexts/app-mode-context.tsx` | Client context exposing the resolved mode. |
| `lib/supabase/browser-client.ts` | Lazily create and cache the typed browser client only in real mode. |
| `lib/supabase/browser-client.test.ts` | Assert the client factory does not read environment until it is called. |
| `contexts/supabase-auth-context.tsx` | Auth subscription and active-membership loading state. |
| `components/auth/login-screen.tsx` | Email/password sign-in surface. |
| `components/auth/access-pending-screen.tsx` | Explicit no-membership state. |
| `components/pipeqc/app-shell.tsx` | Select access screen or the existing PipeQC shell. |
| `contexts/role-context.tsx` | Support a database-locked role while preserving current demo semantics. |
| `components/pipeqc/top-nav.tsx` | Hide mock project/role/reset controls in Supabase mode. |
| `app/layout.tsx` | Replace the unconditional shell with `AppShell`. |
| `docs/SUPABASE_BOOTSTRAP.md` | Safe first platform-admin/project bootstrap procedure. |

### Task 1: Mode parsing and context

**Files:**
- Create: `lib/app-mode.ts`
- Create: `lib/app-mode.test.ts`
- Create: `contexts/app-mode-context.tsx`

- [ ] **Step 1: Write the failing mode-parser test.**

```ts
import assert from "node:assert/strict"
import { parseAppMode } from "./app-mode"

assert.equal(parseAppMode(undefined), "demo")
assert.equal(parseAppMode("demo"), "demo")
assert.equal(parseAppMode("supabase"), "supabase")
assert.equal(parseAppMode("SUPABASE"), "demo")
```

- [ ] **Step 2: Run the test to verify it fails because the module is absent.**

Run: `./node_modules/.bin/tsx lib/app-mode.test.ts`

Expected: `Cannot find module './app-mode'`.

- [ ] **Step 3: Implement the pure parser and provider.**

```ts
// lib/app-mode.ts
export type AppMode = "demo" | "supabase"

export function parseAppMode(value: string | undefined): AppMode {
  return value === "supabase" ? "supabase" : "demo"
}
```

```tsx
// contexts/app-mode-context.tsx
"use client"

import { createContext, useContext } from "react"
import { parseAppMode, type AppMode } from "@/lib/app-mode"

const AppModeContext = createContext<AppMode>("demo")

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const mode = parseAppMode(process.env.NEXT_PUBLIC_PIPEQC_MODE)
  return <AppModeContext.Provider value={mode}>{children}</AppModeContext.Provider>
}

export function useAppMode() {
  return useContext(AppModeContext)
}
```

- [ ] **Step 4: Re-run the test.**

Run: `./node_modules/.bin/tsx lib/app-mode.test.ts`

Expected: exit code `0`.

- [ ] **Step 5: Verify strict TypeScript.**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code `0`.

### Task 2: Lazy typed Supabase browser client

**Files:**
- Modify: `lib/supabase/browser-client.ts`
- Create: `lib/supabase/browser-client.test.ts`

- [ ] **Step 1: Write the failing test for a lazy client factory.**

```ts
import assert from "node:assert/strict"

const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const { getSupabaseBrowserClient } = await import("./browser-client")
assert.throws(() => getSupabaseBrowserClient(), /NEXT_PUBLIC_SUPABASE_URL/)

process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey
```

- [ ] **Step 2: Run the test to verify it fails against the eager module client.**

Run: `./node_modules/.bin/tsx lib/supabase/browser-client.test.ts`

Expected: the import throws before `assert.throws`, because `browser-client.ts` reads the environment at module evaluation.

- [ ] **Step 3: Replace the eager singleton with a lazy factory.**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabasePublicConfig } from "./config"
import type { Database } from "./database.types"

let browserClient: SupabaseClient<Database> | undefined

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient
  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
  browserClient = createClient<Database>(config.url, config.publishableKey)
  return browserClient
}
```

- [ ] **Step 4: Re-run the browser-client and public-config tests.**

Run: `./node_modules/.bin/tsx lib/supabase/browser-client.test.ts && ./node_modules/.bin/tsx lib/supabase/config.test.ts`

Expected: exit code `0`.

- [ ] **Step 5: Verify strict TypeScript.**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code `0`.

### Task 3: Auth and active-membership provider

**Files:**
- Create: `contexts/supabase-auth-context.tsx`
- Modify: `contexts/role-context.tsx`

- [ ] **Step 1: Write a failing pure state-mapping test.**

Create `contexts/supabase-auth-state.test.ts`:

```ts
import assert from "node:assert/strict"
import { deriveSupabaseAccessState } from "./supabase-auth-state"

assert.equal(deriveSupabaseAccessState(null, null), "unauthenticated")
assert.equal(deriveSupabaseAccessState({ id: "user" }, null), "no_membership")
assert.equal(
  deriveSupabaseAccessState({ id: "user" }, { projectId: "project", role: "qc_engineer" }),
  "authorized"
)
```

- [ ] **Step 2: Run it to confirm the missing module failure.**

Run: `./node_modules/.bin/tsx contexts/supabase-auth-state.test.ts`

Expected: `Cannot find module './supabase-auth-state'`.

- [ ] **Step 3: Implement state mapping and the provider.**

Create `contexts/supabase-auth-state.ts` with `SupabaseAccessState` equal to
`"loading" | "unauthenticated" | "no_membership" | "authorized"`; return
`"unauthenticated"`, `"no_membership"`, or `"authorized"` according to the
test cases. Create `contexts/supabase-auth-context.tsx` that:

```ts
const { data: { session } } = await client.auth.getSession()
const { data, error } = await client
  .from("project_memberships")
  .select("id, role, project:projects(id, activity_code, title)")
  .eq("user_id", session.user.id)
  .eq("is_active", true)
  .limit(1)
  .maybeSingle()
```

Store `user`, normalized `{ membershipId, projectId, activityCode, title,
role }`, `error`, and access state. Subscribe through
`client.auth.onAuthStateChange`, clear the membership on sign-out, and clean up
the subscription. Do not call the client while `useAppMode()` is `"demo"`.

Extend `RoleProvider` with an optional `lockedRole?: Role`. When set, expose
that role and make `setCurrentRole` a no-op; when absent, preserve the current
stateful demo selector exactly.

- [ ] **Step 4: Re-run the state-mapping test.**

Run: `./node_modules/.bin/tsx contexts/supabase-auth-state.test.ts`

Expected: exit code `0`.

- [ ] **Step 5: Verify strict TypeScript.**

Run: `npx tsc --noEmit --incremental false`

Expected: exit code `0`.

### Task 4: Login, access-pending, and application shell

**Files:**
- Create: `components/auth/login-screen.tsx`
- Create: `components/auth/access-pending-screen.tsx`
- Create: `components/pipeqc/app-shell.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing access-screen state test.**

Create `components/pipeqc/app-shell-state.test.ts`:

```ts
import assert from "node:assert/strict"
import { screenForSupabaseAccessState } from "./app-shell-state"

assert.equal(screenForSupabaseAccessState("loading"), "loading")
assert.equal(screenForSupabaseAccessState("unauthenticated"), "login")
assert.equal(screenForSupabaseAccessState("no_membership"), "access_pending")
assert.equal(screenForSupabaseAccessState("authorized"), "shell")
```

- [ ] **Step 2: Run it to verify the missing-module failure.**

Run: `./node_modules/.bin/tsx components/pipeqc/app-shell-state.test.ts`

Expected: `Cannot find module './app-shell-state'`.

- [ ] **Step 3: Implement access surfaces and shell selection.**

Create `app-shell-state.ts` with the four mappings above. `LoginScreen` has
email/password inputs, calls `getSupabaseBrowserClient().auth.signInWithPassword`,
and shows the returned error inline. `AccessPendingScreen` renders the signed-in
email and a sign-out button. `AppShell` renders the existing `SidebarProvider`,
`SidebarNav`, `SidebarInset`, `TopNav`, `Toaster`, `IsoWatcherMount`, and
`SpoolRFTWatcherMount` only for demo or authorized Supabase mode. For all other
Supabase states it renders only the relevant access component.

Replace the current body contents in `app/layout.tsx` with:

```tsx
<AppModeProvider>
  <SupabaseAuthProvider>
    <AppShell>{children}</AppShell>
  </SupabaseAuthProvider>
</AppModeProvider>
```

`AppShell` owns `RoleProvider`: no `lockedRole` in demo; pass the membership
role in authorized Supabase mode. Keep `<Analytics />` outside this branch.

- [ ] **Step 4: Re-run the access-screen test.**

Run: `./node_modules/.bin/tsx components/pipeqc/app-shell-state.test.ts`

Expected: exit code `0`.

- [ ] **Step 5: Verify strict TypeScript and demo build.**

Run: `NEXT_PUBLIC_PIPEQC_MODE=demo npx tsc --noEmit --incremental false && npm run build`

Expected: exit code `0`; no Supabase environment value is required in demo mode.

### Task 5: Top navigation real-mode rules

**Files:**
- Modify: `components/pipeqc/top-nav.tsx`
- Create: `components/pipeqc/top-nav-state.test.ts`

- [ ] **Step 1: Write a failing pure visibility-policy test.**

```ts
import assert from "node:assert/strict"
import { getTopNavDisplay } from "./top-nav-state"

assert.deepEqual(getTopNavDisplay("demo", { membership: null, email: undefined, roleLabel: "" }), {
  kind: "demo",
})
assert.deepEqual(
  getTopNavDisplay("supabase", {
    membership: { activityCode: "PIPEQC-01", title: "PipeQC" },
    email: "user@example.com",
    roleLabel: "QC Engineer",
  }),
  {
    kind: "supabase",
    project: { activityCode: "PIPEQC-01", title: "PipeQC" },
    email: "user@example.com",
    roleLabel: "QC Engineer",
  }
)
```

- [ ] **Step 2: Run the test to verify the missing-module failure.**

Run: `./node_modules/.bin/tsx components/pipeqc/top-nav-state.test.ts`

Expected: `Cannot find module './top-nav-state'`.

- [ ] **Step 3: Implement the visibility policy and apply it to `TopNav`.**

Create `top-nav-state.ts` with a pure display mapper. In `TopNav`, read
`useAppMode()` and `useSupabaseAuth()`. Replace the static `projects` selector,
DEMO MODE badge, Reset button, and role dropdown with conditional rendering
from the mapped display. In Supabase mode show `membership.activityCode`,
`membership.title`, `user.email`, and `roleInfo.label` as non-editable text.
Keep the existing demo rendering byte-for-byte where possible.

- [ ] **Step 4: Re-run the visibility test.**

Run: `./node_modules/.bin/tsx components/pipeqc/top-nav-state.test.ts`

Expected: exit code `0`.

- [ ] **Step 5: Verify strict TypeScript and a demo production build.**

Run: `NEXT_PUBLIC_PIPEQC_MODE=demo npx tsc --noEmit --incremental false && npm run build`

Expected: exit code `0`.

### Task 6: Bootstrap runbook and full verification

**Files:**
- Create: `docs/SUPABASE_BOOTSTRAP.md`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`

- [ ] **Step 1: Write the runbook content.**

Document these exact deployment-only steps:

1. Create the first Auth user through Supabase Dashboard or an admin-only
   server operation.
2. In SQL Editor running as an administrative database role, set only that
   user as the initial platform administrator:

```sql
update public.profiles
set is_platform_admin = true
where id = '<auth-user-uuid>';
```

3. Create the first project through the authenticated platform-admin UI once
   Task 5's real mode is available, or through a reviewed migration/SQL change
   that sets `created_by` to that UUID.
4. Insert active `project_memberships` for each user; never expose the service
   role key to the browser.

Include a warning that this SQL must not be embedded in the application or
executed with public client credentials. Update the foundation document to
mark typed client scaffolding and real-mode design as complete, and Project
Definition CRUD as the next unstarted vertical slice.

- [ ] **Step 2: Start the local Supabase stack only for database verification.**

Run: `/opt/homebrew/bin/supabase start`

Expected: containers report healthy.

- [ ] **Step 3: Apply the schema to a clean local database.**

Run: `/opt/homebrew/bin/supabase db reset`

Expected: migration `project_settings_and_referentials` applies without error.

- [ ] **Step 4: Run all DB, pure-module and production-build checks.**

Run: `/opt/homebrew/bin/supabase test db && ./node_modules/.bin/tsx lib/app-mode.test.ts && ./node_modules/.bin/tsx lib/supabase/config.test.ts && ./node_modules/.bin/tsx lib/supabase/browser-client.test.ts && ./node_modules/.bin/tsx contexts/supabase-auth-state.test.ts && ./node_modules/.bin/tsx components/pipeqc/app-shell-state.test.ts && ./node_modules/.bin/tsx components/pipeqc/top-nav-state.test.ts && NEXT_PUBLIC_PIPEQC_MODE=demo npx tsc --noEmit --incremental false && npm run build`

Expected: DB tests and all assertion scripts pass; typecheck and build exit `0`.

- [ ] **Step 5: Stop the local stack after verification.**

Run: `/opt/homebrew/bin/supabase stop`

Expected: local development containers stop; local Docker volume remains available.

## Plan self-review

- Spec coverage: Tasks 1–5 cover the mode flag, secure Auth/membership access
  states, locked real role/project, demo preservation, and TopNav rules. Task
  6 covers the required safe first-admin bootstrap and all verification.
- Placeholder scan: no unresolved task or implementation placeholder remains;
  deferred multi-project switching and operational data migration are explicit
  non-goals from the approved design.
- Type consistency: the canonical mode is `AppMode`; access state is
  `SupabaseAccessState`; membership normalizes to `projectId`, `activityCode`,
  `title`, and the existing `Role` union.
