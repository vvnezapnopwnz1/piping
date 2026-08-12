# Track 01 Access Roles, Functional Roles and Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not dispatch subagents unless the user explicitly requests delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-role authorization model with global platform
authority, one project access role, multiple functional roles, effective
capabilities and deny-by-default subcontractor/PDS scope.

**Architecture:** Supabase remains the authorization authority. PostgreSQL
stores role/capability catalogs, computes effective access and enforces project
and scope boundaries; the Next.js application consumes a normalized access
context for navigation, direct-route UX and action affordances. The legacy
`app_role` membership column and demo `RoleProvider` remain temporary
compatibility surfaces but are removed from Supabase authorization decisions.

**Tech Stack:** PostgreSQL 15, Supabase Auth/RLS/PostgREST RPC, pgTAP,
Next.js 16 App Router, React 19, strict TypeScript, `@supabase/supabase-js`,
Node test runner with `tsx`, existing shadcn UI.

**Approved design:** `docs/superpowers/specs/2026-07-30-access-capabilities-design.md`

---

## Execution policy

1. Work in the current checkout only after verifying `pwd`, branch, HEAD and
   `git status --short`.
2. The current worktree already contains user changes. Never reset, restore,
   delete or overwrite unrelated files.
3. Do not stage, commit, create a branch, create a worktree or push unless the
   user explicitly asks. The commit boundaries below are handoff boundaries,
   not permission to run Git mutations.
4. Use test-first steps. Record RED output before adding implementation.
5. Run database commands only against the local Supabase stack. Never use
   `--linked`.
6. Do not start ISO, spool, weld, NDE, tracking or test-pack persistence in
   this track.
7. Raw role strings may remain in demo mode, fixtures and the compatibility
   column. They must not remain in Supabase RLS, Supabase-backed mutation
   authorization, navigation or direct-route authorization.

## Required business decisions

- `profiles.is_platform_admin` is global System Admin.
- Project memberships have exactly one access role:
  `project_admin`, `site_admin`, `project_editor`, `subcontractor` or
  `project_reader`.
- Functional roles are many-to-many:
  `project_manager`, `qc_engineer`, `nde_inspector`, `spooling_team`,
  `fabrication_contributor`, `erection_contributor`, `tracking_operator`.
- Functional-role grants cannot elevate a Project Reader to write access.
- A Subcontractor membership requires an explicit functional role plus
  subcontractor and PDS scopes before operational mutation.
- Existing legacy Subcontractor memberships are not granted a guessed
  functional role during backfill.
- In the first implementation `site_admin` and `project_admin` have the same
  project capability ceiling. They remain separate audited concepts; a future
  site aggregate may narrow `site_admin`.
- Access Rights manages existing Supabase profiles by exact email. Auth invite
  and password management are outside this track.
- Archived/inactive projects allow authorized historical reads but no
  capability marked as mutating.

## File map

### Database

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260731090000_access_capability_catalog.sql` | Role/capability catalogs, membership access role, functional assignments and compatibility backfill. |
| `supabase/migrations/20260731091000_access_capability_security.sql` | Effective-capability/scope functions, project listing RPC and RLS replacement. |
| `supabase/migrations/20260731092000_access_management_rpc.sql` | Atomic Access Rights commands and audit events. |
| `supabase/tests/database/010_access_capabilities.test.sql` | Catalog, backfill, capability-ceiling and mutation-status behavior. |
| `supabase/tests/database/011_project_scope_isolation.test.sql` | Real JWT-context isolation for two projects and two subcontractor scopes. |
| `lib/supabase/database.types.ts` | Generated local schema types after migrations. |

### Access domain and infrastructure

| File | Responsibility |
| --- | --- |
| `modules/access/domain/capability.ts` | Stable TypeScript access-role, functional-role and capability vocabulary. |
| `modules/access/domain/effective-access.ts` | Pure effective-access and fail-closed scope predicates. |
| `modules/access/domain/effective-access.test.ts` | Pure access/scope behavior. |
| `modules/access/infrastructure/supabase-access-repository.ts` | Typed RPC adapter and row normalization. |
| `modules/access/infrastructure/supabase-access-repository.test.ts` | RPC name/payload/error mapping contract. |
| `modules/access/ui/access-context.tsx` | Supabase effective-access provider and hooks. |
| `modules/access/ui/capability-guard.tsx` | Reusable action/section guard. |

### Auth shell and navigation

| File | Responsibility |
| --- | --- |
| `contexts/supabase-auth-state.ts` | Pure active-project selection over project-access rows. |
| `contexts/supabase-auth-state.test.ts` | Platform-project, membership and stale-selection behavior. |
| `contexts/supabase-auth-context.tsx` | Loads `list_current_user_projects`, selects active access context and reloads it. |
| `config/route-capabilities.ts` | Single route-prefix to capability catalog. |
| `config/route-capabilities.test.ts` | Most-specific route resolution and public-route behavior. |
| `config/navigation.ts` | Navigation tree without embedded role arrays. |
| `components/pipeqc/sidebar-nav.tsx` | Filters the tree through capabilities. |
| `components/pipeqc/route-capability-guard.tsx` | Direct-route 403 UX using the same route catalog. |
| `components/auth/forbidden-screen.tsx` | Stable forbidden state without leaking database details. |
| `components/pipeqc/app-shell.tsx` | Installs `AccessProvider`, route guard and a marked legacy persona shim. |
| `components/pipeqc/top-nav-state.ts` | Displays access role and functional-role summary. |
| `components/pipeqc/top-nav-state.test.ts` | Supabase top-nav access labels and project switching. |
| `components/pipeqc/top-nav.tsx` | Removes Supabase dependence on `ROLES` and `roleInfo`. |

### Access Rights

| File | Responsibility |
| --- | --- |
| `modules/access/domain/access-rights.ts` | Form types and Subcontractor/access-role validation. |
| `modules/access/domain/access-rights.test.ts` | Validation and scope-clearing rules. |
| `modules/access/infrastructure/supabase-access-rights-repository.ts` | Typed list/add/update/deactivate RPC adapter. |
| `modules/access/infrastructure/supabase-access-rights-repository.test.ts` | Adapter query and generic-error contract. |
| `modules/access/ui/access-rights-screen.tsx` | Load/reload/error orchestration. |
| `modules/access/ui/access-members-table.tsx` | Project membership table and action entry points. |
| `modules/access/ui/access-member-dialog.tsx` | Add/edit access role, functions and scope. |
| `app/admin/access-rights/page.tsx` | Chooses demo or Supabase Access Rights view. |

### Documentation

| File | Responsibility |
| --- | --- |
| `docs/role_matrix/README.md` | Explains access role vs functional persona vs scope. |
| `docs/role_matrix/system_admin.md` | Marks the merged admin description as legacy and links to split access roles. |
| `docs/role_matrix/subcontractor.md` | Removes the implication that every subcontractor automatically owns QC and NDE capabilities. |
| `docs/role_matrix/project_manager.md` | Marks PM as a functional persona whose default access profile is Reader. |
| `docs/SUPABASE_BACKEND_FOUNDATION.md` | Records the verified new authorization foundation. |

---

## Task 1: Add the canonical TypeScript vocabulary and fail-closed predicates

**Files:**
- Create: `modules/access/domain/capability.ts`
- Create: `modules/access/domain/effective-access.ts`
- Create: `modules/access/domain/effective-access.test.ts`

- [x] **Step 1: Write the RED test.**

Create `modules/access/domain/effective-access.test.ts` with assertions for:

```ts
import assert from "node:assert/strict"

import {
  hasCapability,
  hasFunctionalRole,
  isPdsAreaInScope,
  isSubcontractorInScope,
  type EffectiveAccess,
} from "./effective-access"

const reader: EffectiveAccess = {
  projectId: "project-a",
  membershipId: "membership-reader",
  isPlatformAdmin: false,
  accessRole: "project_reader",
  functionalRoles: ["qc_engineer"],
  capabilities: ["project.view", "fabrication.view"],
  subcontractorIds: [],
  pdsAreaIds: [],
}

assert.equal(hasCapability(reader, "fabrication.view"), true)
assert.equal(hasCapability(reader, "fabrication.progress.record"), false)
assert.equal(hasFunctionalRole(reader, "qc_engineer"), true)

const scoped: EffectiveAccess = {
  ...reader,
  accessRole: "subcontractor",
  functionalRoles: ["nde_inspector"],
  capabilities: ["project.view", "nde.view", "nde.result.record"],
  subcontractorIds: ["sub-a"],
  pdsAreaIds: ["pds-a"],
}

assert.equal(isSubcontractorInScope(scoped, "sub-a"), true)
assert.equal(isSubcontractorInScope(scoped, "sub-b"), false)
assert.equal(isSubcontractorInScope(scoped, undefined), false)
assert.equal(isPdsAreaInScope(scoped, "pds-a"), true)
assert.equal(isPdsAreaInScope(scoped, undefined), false)

const platformAdmin: EffectiveAccess = {
  ...reader,
  membershipId: null,
  isPlatformAdmin: true,
  accessRole: null,
  functionalRoles: [],
  capabilities: [],
}

assert.equal(hasCapability(platformAdmin, "access_rights.manage"), true)
assert.equal(isSubcontractorInScope(platformAdmin, undefined), true)
assert.equal(isPdsAreaInScope(platformAdmin, undefined), true)
```

- [x] **Step 2: Run RED.**

Run:

```bash
node --import tsx modules/access/domain/effective-access.test.ts
```

Expected: `ERR_MODULE_NOT_FOUND` for the new domain modules.

- [x] **Step 3: Add the exact domain vocabulary.**

Create `modules/access/domain/capability.ts` with:

```ts
export const PROJECT_ACCESS_ROLES = [
  "project_admin",
  "site_admin",
  "project_editor",
  "subcontractor",
  "project_reader",
] as const

export type ProjectAccessRole = (typeof PROJECT_ACCESS_ROLES)[number]

export const FUNCTIONAL_ROLES = [
  "project_manager",
  "qc_engineer",
  "nde_inspector",
  "spooling_team",
  "fabrication_contributor",
  "erection_contributor",
  "tracking_operator",
] as const

export type FunctionalRole = (typeof FUNCTIONAL_ROLES)[number]

export const CAPABILITIES = [
  "project.view",
  "project.definition.manage",
  "system_referential.view",
  "system_referential.manage",
  "project_referential.view",
  "project_referential.manage",
  "access_rights.manage",
  "spooling.view",
  "spooling.manage",
  "fabrication.view",
  "fabrication.progress.record",
  "fabrication.qc.release",
  "nde.view",
  "nde.batch.manage",
  "nde.result.record",
  "erection.view",
  "erection.progress.record",
  "tracking.view",
  "tracking.event.record",
  "testpack.view",
  "testpack.manage",
  "flange.view",
  "flange.manage",
  "reports.view",
  "reports.export",
  "settings.view",
] as const

export type Capability = (typeof CAPABILITIES)[number]
```

- [x] **Step 4: Implement the pure access object.**

Create `modules/access/domain/effective-access.ts`:

```ts
import type {
  Capability,
  FunctionalRole,
  ProjectAccessRole,
} from "./capability"

export interface EffectiveAccess {
  projectId: string
  membershipId: string | null
  isPlatformAdmin: boolean
  accessRole: ProjectAccessRole | null
  functionalRoles: FunctionalRole[]
  capabilities: Capability[]
  subcontractorIds: string[]
  pdsAreaIds: string[]
}

export function hasCapability(
  access: EffectiveAccess,
  capability: Capability,
): boolean {
  return access.isPlatformAdmin || access.capabilities.includes(capability)
}

export function hasFunctionalRole(
  access: EffectiveAccess,
  role: FunctionalRole,
): boolean {
  return access.functionalRoles.includes(role)
}

export function isSubcontractorInScope(
  access: EffectiveAccess,
  subcontractorId: string | undefined,
): boolean {
  if (access.isPlatformAdmin || access.accessRole !== "subcontractor") return true
  return Boolean(
    subcontractorId && access.subcontractorIds.includes(subcontractorId),
  )
}

export function isPdsAreaInScope(
  access: EffectiveAccess,
  pdsAreaId: string | undefined,
): boolean {
  if (access.isPlatformAdmin || access.accessRole !== "subcontractor") return true
  return Boolean(pdsAreaId && access.pdsAreaIds.includes(pdsAreaId))
}
```

- [x] **Step 5: Run GREEN and typecheck.**

Run:

```bash
node --import tsx modules/access/domain/effective-access.test.ts
npx tsc --noEmit --incremental false
```

Expected: both commands exit `0`.

**Suggested commit boundary:** `feat: define access capability domain`

---

## Task 2: Create role/capability catalogs and migrate current memberships

**Files:**
- Create: `supabase/migrations/20260731090000_access_capability_catalog.sql`
- Create: `supabase/tests/database/010_access_capabilities.test.sql`

- [x] **Step 1: Write schema/backfill assertions first.**

Start `010_access_capabilities.test.sql` with a transaction and assertions:

```sql
begin;

select plan(18);

select has_table('public', 'roles', 'role catalog exists');
select has_table('public', 'capabilities', 'capability catalog exists');
select has_table('public', 'role_capabilities', 'role grants exist');
select has_table(
  'public',
  'project_membership_functional_roles',
  'memberships support several functional roles'
);
select has_column(
  'public',
  'project_memberships',
  'access_role_code',
  'membership has one access role'
);
select col_not_null(
  'public',
  'project_memberships',
  'access_role_code',
  'access role is required after backfill'
);
select results_eq(
  $$select count(*)::bigint from public.roles where kind = 'access'$$,
  array[5::bigint],
  'five manual project access roles are seeded'
);
select results_eq(
  $$select count(*)::bigint from public.roles where kind = 'functional'$$,
  array[7::bigint],
  'seven initial functional roles are seeded'
);
select results_eq(
  $$select count(*)::bigint from public.capabilities$$,
  array[26::bigint],
  'canonical capability catalog is seeded'
);
```

Assert the immutable compatibility mapping used by the migration:

```sql
select is(
  public.legacy_access_role('project_manager'),
  'project_reader',
  'legacy project manager receives Reader ceiling'
);
select is(
  public.legacy_functional_role('project_manager'),
  'project_manager',
  'legacy project manager keeps its functional persona'
);
select is(
  public.legacy_access_role('subcontractor'),
  'subcontractor',
  'legacy subcontractor keeps restricted access'
);
select is(
  public.legacy_functional_role('subcontractor'),
  null,
  'legacy subcontractor receives no guessed functional capability'
);
select is(
  (
    select count(*)::integer
    from public.project_memberships
    where access_role_code is null
  ),
  0,
  'the migration leaves no membership without an access role'
);
```

Close with `select * from finish(); rollback;`.

- [x] **Step 2: Run RED.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
```

Expected: missing-table and missing-column failures.

- [x] **Step 3: Create the catalogs and membership shape.**

In `20260731090000_access_capability_catalog.sql` add:

```sql
create type public.role_kind as enum ('access', 'functional');

create table public.roles (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(trim(label)) > 0),
  kind public.role_kind not null,
  bypasses_functional_gate boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.capabilities (
  code text primary key check (code ~ '^[a-z][a-z0-9_.]*$'),
  description text not null check (length(trim(description)) > 0),
  is_mutating boolean not null,
  requires_functional_role boolean not null
);

create table public.role_capabilities (
  role_code text not null references public.roles(code) on delete restrict,
  capability_code text not null references public.capabilities(code) on delete restrict,
  primary key (role_code, capability_code)
);

alter table public.project_memberships
  add column access_role_code text references public.roles(code) on delete restrict;

create table public.project_membership_functional_roles (
  membership_id uuid not null
    references public.project_memberships(id) on delete cascade,
  role_code text not null references public.roles(code) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (membership_id, role_code)
);
```

- [x] **Step 4: Seed all access and functional roles.**

Use one explicit insert:

```sql
insert into public.roles (code, label, kind, bypasses_functional_gate)
values
  ('project_admin', 'Project Admin', 'access', true),
  ('site_admin', 'Site Admin', 'access', true),
  ('project_editor', 'Project Editor', 'access', false),
  ('subcontractor', 'Subcontractor', 'access', false),
  ('project_reader', 'Project Reader', 'access', true),
  ('project_manager', 'Project Manager', 'functional', false),
  ('qc_engineer', 'QC Engineer', 'functional', false),
  ('nde_inspector', 'NDE Inspector', 'functional', false),
  ('spooling_team', 'Spooling Team', 'functional', false),
  ('fabrication_contributor', 'Fabrication Contributor', 'functional', false),
  ('erection_contributor', 'Erection Contributor', 'functional', false),
  ('tracking_operator', 'Tracking Operator', 'functional', false);
```

- [x] **Step 5: Seed the 26 capabilities.**

Insert every code from `CAPABILITIES` with the following flags:

```sql
insert into public.capabilities
  (code, description, is_mutating, requires_functional_role)
values
  ('project.view', 'View an authorized project', false, false),
  ('project.definition.manage', 'Manage Project Definition', true, false),
  ('system_referential.view', 'View global system referentials', false, false),
  ('system_referential.manage', 'Manage global system referentials', true, false),
  ('project_referential.view', 'View project referentials', false, false),
  ('project_referential.manage', 'Manage project referentials', true, false),
  ('access_rights.manage', 'Manage project membership, roles and scope', true, false),
  ('spooling.view', 'View spooling workflow', false, true),
  ('spooling.manage', 'Mutate spooling workflow', true, true),
  ('fabrication.view', 'View fabrication workflow', false, true),
  ('fabrication.progress.record', 'Record fabrication progress', true, true),
  ('fabrication.qc.release', 'Sign fabrication QC release', true, true),
  ('nde.view', 'View NDE workflow', false, true),
  ('nde.batch.manage', 'Create and manage NDE batches', true, true),
  ('nde.result.record', 'Record NDE results', true, true),
  ('erection.view', 'View erection workflow', false, true),
  ('erection.progress.record', 'Record erection progress', true, true),
  ('tracking.view', 'View spool tracking', false, true),
  ('tracking.event.record', 'Record spool tracking events', true, true),
  ('testpack.view', 'View test packs', false, true),
  ('testpack.manage', 'Manage test-pack workflow', true, true),
  ('flange.view', 'View flange workflow', false, true),
  ('flange.manage', 'Manage flange workflow', true, true),
  ('reports.view', 'View project reports', false, false),
  ('reports.export', 'Export project reports', false, false),
  ('settings.view', 'View personal settings and documentation', false, false);
```

- [x] **Step 6: Seed access-role ceilings.**

Use explicit set-based grants:

```sql
insert into public.role_capabilities (role_code, capability_code)
select role_code, capability_code
from (
  select r.code as role_code, c.code as capability_code
  from public.roles r
  cross join public.capabilities c
  where r.code in ('project_admin', 'site_admin')
    and c.code <> 'system_referential.manage'

  union all

  select r.code, c.code
  from public.roles r
  cross join public.capabilities c
  where r.code in ('project_editor', 'subcontractor')
    and c.code not in (
      'project.definition.manage',
      'system_referential.manage',
      'project_referential.manage',
      'access_rights.manage'
    )

  union all

  select 'project_reader', c.code
  from public.capabilities c
  where c.is_mutating = false
) grants;
```

Do not seed a project access role for platform System Admin.

- [x] **Step 7: Seed functional grants.**

Use explicit arrays so future reviews can see exactly what each persona owns:

```sql
insert into public.role_capabilities (role_code, capability_code)
values
  ('project_manager', 'spooling.view'),
  ('project_manager', 'fabrication.view'),
  ('project_manager', 'nde.view'),
  ('project_manager', 'erection.view'),
  ('project_manager', 'tracking.view'),
  ('project_manager', 'testpack.view'),
  ('project_manager', 'flange.view'),
  ('qc_engineer', 'fabrication.view'),
  ('qc_engineer', 'fabrication.progress.record'),
  ('qc_engineer', 'fabrication.qc.release'),
  ('qc_engineer', 'nde.view'),
  ('qc_engineer', 'nde.batch.manage'),
  ('qc_engineer', 'erection.view'),
  ('qc_engineer', 'erection.progress.record'),
  ('qc_engineer', 'testpack.view'),
  ('qc_engineer', 'testpack.manage'),
  ('qc_engineer', 'flange.view'),
  ('qc_engineer', 'flange.manage'),
  ('nde_inspector', 'nde.view'),
  ('nde_inspector', 'nde.batch.manage'),
  ('nde_inspector', 'nde.result.record'),
  ('nde_inspector', 'testpack.view'),
  ('spooling_team', 'spooling.view'),
  ('spooling_team', 'spooling.manage'),
  ('fabrication_contributor', 'fabrication.view'),
  ('fabrication_contributor', 'fabrication.progress.record'),
  ('erection_contributor', 'erection.view'),
  ('erection_contributor', 'erection.progress.record'),
  ('tracking_operator', 'tracking.view'),
  ('tracking_operator', 'tracking.event.record');
```

- [x] **Step 8: Enforce role kind and backfill compatibility rows.**

Add two trigger functions that read `roles.kind` and raise SQLSTATE `23514`
when the wrong kind is assigned. Attach them to
`project_memberships.access_role_code` and
`project_membership_functional_roles.role_code`.

Add immutable mapping helpers:

```sql
create function public.legacy_access_role(legacy_role public.app_role)
returns text
language sql
immutable
set search_path = public
as $$
  select case legacy_role
    when 'system_admin' then 'project_admin'
    when 'project_manager' then 'project_reader'
    when 'qc_engineer' then 'project_editor'
    when 'nde_inspector' then 'project_editor'
    when 'spooling_team' then 'project_editor'
    when 'subcontractor' then 'subcontractor'
  end;
$$;

create function public.legacy_functional_role(legacy_role public.app_role)
returns text
language sql
immutable
set search_path = public
as $$
  select case legacy_role
    when 'project_manager' then 'project_manager'
    when 'qc_engineer' then 'qc_engineer'
    when 'nde_inspector' then 'nde_inspector'
    when 'spooling_team' then 'spooling_team'
    else null
  end;
$$;
```

Backfill through those helpers:

```sql
update public.project_memberships
set access_role_code = public.legacy_access_role(role);

insert into public.project_membership_functional_roles
  (membership_id, role_code)
select id, public.legacy_functional_role(role)
from public.project_memberships
where public.legacy_functional_role(role) is not null;

alter table public.project_memberships
  alter column access_role_code set not null;
```

Replace `add_creator_as_project_admin()` so a new creator receives both legacy
`role = 'system_admin'` and `access_role_code = 'project_admin'`.

- [x] **Step 9: Add indexes and immutable catalog privileges.**

Add:

```sql
create index project_memberships_access_role_idx
  on public.project_memberships (access_role_code)
  where is_active;

create index project_membership_functional_roles_role_idx
  on public.project_membership_functional_roles (role_code, membership_id);

revoke all on public.roles from anon, authenticated;
revoke all on public.capabilities from anon, authenticated;
revoke all on public.role_capabilities from anon, authenticated;
revoke all on public.project_membership_functional_roles from anon, authenticated;

grant select on public.roles, public.capabilities, public.role_capabilities
  to authenticated;
```

- [x] **Step 10: Apply locally and run GREEN.**

First verify `supabase status` reports the local stack. Then run:

```bash
/opt/homebrew/bin/supabase db reset
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
```

Expected: reset applies all migrations and the new test exits `0`.

**Suggested commit boundary:** `feat: add role and capability catalogs`

---

## Task 3: Compute effective capabilities and fail-closed scope in PostgreSQL

**Files:**
- Create: `supabase/migrations/20260731091000_access_capability_security.sql`
- Modify: `supabase/tests/database/010_access_capabilities.test.sql`
- Create: `supabase/tests/database/011_project_scope_isolation.test.sql`

- [x] **Step 1: Add RED capability assertions.**

Create test users/project memberships representing:

- platform administrator without membership;
- Project Admin A;
- Project Editor A + QC Engineer;
- Project Reader A + QC Engineer;
- Subcontractor A + NDE Inspector;
- user with inactive membership;
- user in Project B.

Create this test-local helper near the top of both behavioral test files:

```sql
create function pg_temp.authenticate_as(actor_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;
```

Use fixed UUIDs in the `10000000-...` range, for example:

```sql
select pg_temp.authenticate_as(
  '10000000-0000-0000-0000-000000000003'::uuid
);
```

Reset to the test owner before changing fixture data with `reset role`.

Assert:

```sql
select ok(
  public.current_user_has_capability(
    '30000000-0000-0000-0000-000000000001',
    'fabrication.progress.record'
  ),
  'QC editor receives fabrication progress through both gates'
);

select ok(
  not public.current_user_has_capability(
    '30000000-0000-0000-0000-000000000001',
    'access_rights.manage'
  ),
  'QC editor cannot manage access'
);

select ok(
  not public.current_user_has_capability(
    '30000000-0000-0000-0000-000000000001',
    'fabrication.progress.record'
  ),
  'Reader cannot write even with QC functional role'
);

select ok(
  public.current_user_has_capability(
    '30000000-0000-0000-0000-000000000001',
    'project_referential.manage'
  ),
  'Project Admin bypasses the functional gate inside the project'
);
```

For an archived project assert `project.view = true` and every tested mutating
capability is false.

- [x] **Step 2: Run RED.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
```

Expected: missing-function failures for `current_user_has_capability`.

- [x] **Step 3: Implement `current_user_has_capability`.**

Add a stable security-definer SQL function that:

1. validates the requested capability exists;
2. returns true immediately for `is_platform_admin()`;
3. finds the caller's active membership and access role;
4. checks the access-role ceiling;
5. applies the functional gate;
6. denies mutating capabilities when `projects.status <> 'active'`.

The central query must have this shape:

```sql
create function public.current_user_has_capability(
  target_project_id uuid,
  requested_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.capabilities capability
      on capability.code = requested_capability
    where p.id = target_project_id
      and (not capability.is_mutating or p.status = 'active')
      and (
        public.is_platform_admin()
        or exists (
          select 1
          from public.project_memberships m
          join public.roles access_role
            on access_role.code = m.access_role_code
           and access_role.kind = 'access'
           and access_role.is_active
          join public.role_capabilities access_grant
            on access_grant.role_code = access_role.code
           and access_grant.capability_code = capability.code
          where m.project_id = target_project_id
            and m.user_id = auth.uid()
            and m.is_active
            and (
              not capability.requires_functional_role
              or access_role.bypasses_functional_gate
              or exists (
                select 1
                from public.project_membership_functional_roles assigned
                join public.roles functional_role
                  on functional_role.code = assigned.role_code
                 and functional_role.kind = 'functional'
                 and functional_role.is_active
                join public.role_capabilities functional_grant
                  on functional_grant.role_code = assigned.role_code
                 and functional_grant.capability_code = capability.code
                where assigned.membership_id = m.id
              )
            )
        )
      )
  );
$$;

revoke all on function public.current_user_has_capability(uuid, text)
  from public;
grant execute on function public.current_user_has_capability(uuid, text)
  to authenticated;
```

- [x] **Step 4: Replace legacy admin comparisons.**

Replace `can_administer_project` with:

```sql
create or replace function public.can_administer_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_has_capability(
    target_project_id,
    'project_referential.manage'
  );
$$;
```

Drop/recreate the Project Definition update policy so it checks
`project.definition.manage`. Drop/recreate membership management policies so
they check `access_rights.manage`.

- [x] **Step 5: Implement both scope helpers.**

For non-Subcontractor access roles, scope helpers return true after confirming
active project access. For Subcontractor, they require an explicit matching
scope row and reject null IDs:

```sql
create function public.current_user_in_subcontractor_scope(
  target_project_id uuid,
  target_subcontractor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships m
      where m.project_id = target_project_id
        and m.user_id = auth.uid()
        and m.is_active
        and (
          m.access_role_code <> 'subcontractor'
          or (
            target_subcontractor_id is not null
            and exists (
              select 1
              from public.membership_subcontractor_scopes scope
              where scope.membership_id = m.id
                and scope.subcontractor_id = target_subcontractor_id
            )
          )
        )
    );
$$;
```

Implement the PDS helper explicitly:

```sql
create function public.current_user_in_pds_scope(
  target_project_id uuid,
  target_pds_area_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.project_memberships m
      where m.project_id = target_project_id
        and m.user_id = auth.uid()
        and m.is_active
        and (
          m.access_role_code <> 'subcontractor'
          or (
            target_pds_area_id is not null
            and exists (
              select 1
              from public.membership_pds_area_scopes scope
              where scope.membership_id = m.id
                and scope.pds_area_id = target_pds_area_id
            )
          )
        )
    );
$$;

revoke all on function public.current_user_in_subcontractor_scope(uuid, uuid)
  from public;
revoke all on function public.current_user_in_pds_scope(uuid, uuid)
  from public;
grant execute on function public.current_user_in_subcontractor_scope(uuid, uuid)
  to authenticated;
grant execute on function public.current_user_in_pds_scope(uuid, uuid)
  to authenticated;
```

- [x] **Step 6: Let members read their own assignments and scopes.**

Enable RLS for `project_membership_functional_roles`. Add select policies:

- owner membership may read its own functional assignments;
- project access administrators may read assignments in that project;
- owner membership may read its own subcontractor and PDS scope rows;
- access administrators may read scope rows in that project.

Keep direct insert/update/delete revoked; writes happen through Task 4 RPCs.

- [x] **Step 7: Scope the existing referentials that carry scope keys.**

Drop the broad generic member-read policy and create specialized select
policies for:

- `project_subcontractors` using
  `current_user_in_subcontractor_scope(project_id, id)`;
- `project_pds_areas` using
  `current_user_in_pds_scope(project_id, id)`;
- `project_welding_procedures` using
  `current_user_in_subcontractor_scope(project_id, subcontractor_id)`;
- `welder_qualifications` using
  `current_user_in_subcontractor_scope(project_id, subcontractor_id)`.

Do not add guessed scope filters to tables that have no subcontractor or PDS
identity. Future operational migrations must add the correct identity before
claiming scope enforcement.

- [x] **Step 8: Implement the project/access-context listing RPC.**

Create `list_current_user_projects()` returning:

```sql
table (
  membership_id uuid,
  project_id uuid,
  activity_code text,
  title text,
  project_status public.project_reference_status,
  access_role_code text,
  functional_role_codes text[],
  capability_codes text[],
  subcontractor_ids uuid[],
  pds_area_ids uuid[],
  is_platform_admin boolean
)
```

Behavior:

- platform admin branch returns all active projects and `membership_id` /
  `access_role_code` as null;
- member branch returns active projects with active memberships;
- arrays are empty arrays, never null;
- capability codes are calculated through
  `current_user_has_capability(project_id, code)`;
- rows are ordered by activity code, title and project ID;
- caller identity always comes from `auth.uid()`.

Use this query:

```sql
create function public.list_current_user_projects()
returns table (
  membership_id uuid,
  project_id uuid,
  activity_code text,
  title text,
  project_status public.project_reference_status,
  access_role_code text,
  functional_role_codes text[],
  capability_codes text[],
  subcontractor_ids uuid[],
  pds_area_ids uuid[],
  is_platform_admin boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (
    select public.is_platform_admin() as platform_admin
  ),
  available as (
    select
      null::uuid as membership_id,
      p.id as project_id,
      p.activity_code,
      p.title,
      p.status as project_status,
      null::text as access_role_code,
      caller.platform_admin
    from public.projects p
    cross join caller
    where caller.platform_admin
      and p.status = 'active'

    union all

    select
      m.id,
      p.id,
      p.activity_code,
      p.title,
      p.status,
      m.access_role_code,
      caller.platform_admin
    from public.project_memberships m
    join public.projects p on p.id = m.project_id
    cross join caller
    where not caller.platform_admin
      and m.user_id = auth.uid()
      and m.is_active
      and p.status = 'active'
  )
  select
    available.membership_id,
    available.project_id,
    available.activity_code,
    available.title,
    available.project_status,
    available.access_role_code,
    case
      when available.membership_id is null then array[]::text[]
      else coalesce(
        (
          select array_agg(assigned.role_code order by assigned.role_code)
          from public.project_membership_functional_roles assigned
          where assigned.membership_id = available.membership_id
        ),
        array[]::text[]
      )
    end as functional_role_codes,
    coalesce(
      (
        select array_agg(capability.code order by capability.code)
        from public.capabilities capability
        where public.current_user_has_capability(
          available.project_id,
          capability.code
        )
      ),
      array[]::text[]
    ) as capability_codes,
    case
      when available.membership_id is null then array[]::uuid[]
      else coalesce(
        (
          select array_agg(scope.subcontractor_id order by scope.subcontractor_id)
          from public.membership_subcontractor_scopes scope
          where scope.membership_id = available.membership_id
        ),
        array[]::uuid[]
      )
    end as subcontractor_ids,
    case
      when available.membership_id is null then array[]::uuid[]
      else coalesce(
        (
          select array_agg(scope.pds_area_id order by scope.pds_area_id)
          from public.membership_pds_area_scopes scope
          where scope.membership_id = available.membership_id
        ),
        array[]::uuid[]
      )
    end as pds_area_ids,
    available.platform_admin as is_platform_admin
  from available
  order by available.activity_code, available.title, available.project_id;
$$;

revoke all on function public.list_current_user_projects() from public;
grant execute on function public.list_current_user_projects() to authenticated;
```

- [x] **Step 9: Prove scope isolation through actual SELECTs.**

In `011_project_scope_isolation.test.sql`, seed:

- Project A and Project B;
- Sub A and Sub B in Project A;
- PDS A and PDS B;
- one WPS and one welder for each subcontractor;
- an NDE Subcontractor membership scoped only to Sub A/PDS A;
- an internal Project Editor;
- a user with no membership.

Under `set local role authenticated`, assert:

- Sub A user sees only Sub A, PDS A, WPS A and Welder A;
- forged Project B IDs return zero rows;
- scope helper returns false for null;
- internal editor sees both Project A referential rows;
- user without membership sees zero Project A rows;
- platform admin sees all active projects from the listing RPC without
  membership rows.

- [x] **Step 10: Run both database tests.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
/opt/homebrew/bin/supabase test db supabase/tests/database/011_project_scope_isolation.test.sql
```

Expected: both files pass with no skipped assertions.

**Suggested commit boundary:** `feat: enforce effective capabilities and scope`

---

## Task 4: Add atomic Access Rights commands and audit

**Files:**
- Create: `supabase/migrations/20260731092000_access_management_rpc.sql`
- Modify: `supabase/tests/database/010_access_capabilities.test.sql`
- Modify: `supabase/tests/database/011_project_scope_isolation.test.sql`

- [x] **Step 1: Add RED command tests.**

Test these exact outcomes:

1. Project Admin can add an existing profile by exact email.
2. Reader receives SQLSTATE `42501`.
3. Unknown email returns stable application code `PQC01`.
4. Wrong-kind role assignment returns `PQC02`.
5. Subcontractor without functional role or either scope returns `PQC03`.
6. Cross-project scope IDs return `PQC04`.
7. Updating away from Subcontractor clears both scope tables.
8. Non-platform user cannot modify their own membership.
9. One successful command creates exactly one `audit_events` row with actor,
   membership and before/after JSON.

- [x] **Step 2: Run RED.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
```

Expected: missing-function failures for the management RPCs.

- [x] **Step 3: Add a normalized read model RPC.**

Create `get_project_access_matrix(target_project_id uuid)` that requires
`access_rights.manage` and returns:

```sql
table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  is_active boolean,
  access_role_code text,
  functional_role_codes text[],
  subcontractor_ids uuid[],
  pds_area_ids uuid[]
)
```

Aggregate child rows with ordered `array_agg(distinct ...)` and return empty
arrays via `coalesce`. Do not expose profiles outside the requested project.

- [x] **Step 4: Add `add_project_member_by_email`.**

Signature:

```sql
add_project_member_by_email(
  target_project_id uuid,
  target_email text,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns setof public.project_memberships
```

The function must:

- check `access_rights.manage`;
- normalize email with `lower(trim(...))`;
- resolve exactly one existing profile;
- reject an existing membership instead of silently replacing it;
- validate access and functional role kinds;
- validate all scope IDs belong to the target project;
- require at least one functional role, one subcontractor and one PDS area
  when access role is `subcontractor`;
- insert the membership with a compatibility `role` mapping:
  - Project Admin/Site Admin → `system_admin`;
  - Project Reader → `project_manager`;
  - Project Editor → first known functional legacy role or `qc_engineer`;
  - Subcontractor → `subcontractor`;
- insert functional and scope rows;
- write one `audit_events` record;
- return the new membership.

- [x] **Step 5: Add `update_project_member_access`.**

Signature:

```sql
update_project_member_access(
  target_membership_id uuid,
  requested_access_role text,
  requested_functional_roles text[],
  requested_subcontractor_ids uuid[],
  requested_pds_area_ids uuid[]
)
returns setof public.project_memberships
```

Use `select ... for update`. Reject self-modification for non-platform
administrators. Capture the complete normalized before state, replace role and
scope sets in one transaction, update the compatibility role, capture after
state and write one audit event.

When the requested access role is not `subcontractor`, ignore supplied scope
arrays and leave both scope tables empty.

- [x] **Step 6: Add `set_project_member_active`.**

Signature:

```sql
set_project_member_active(
  target_membership_id uuid,
  requested_active boolean
)
returns setof public.project_memberships
```

Reject:

- non-admin callers;
- non-platform self-deactivation;
- cross-project target access;
- deactivation of the last active Project Admin when no platform admin is
  performing the command.

Write one audit event with action `membership.activated` or
`membership.deactivated`.

- [x] **Step 7: Lock down the write surface.**

Revoke direct insert/update/delete for authenticated users on:

- `project_memberships`;
- `project_membership_functional_roles`;
- `membership_subcontractor_scopes`;
- `membership_pds_area_scopes`.

Grant execute only on the four read/write RPCs to `authenticated`. Revoke
function execution from `public` and `anon`.

- [x] **Step 8: Run command and audit tests.**

Run:

```bash
/opt/homebrew/bin/supabase test db supabase/tests/database/010_access_capabilities.test.sql
/opt/homebrew/bin/supabase test db supabase/tests/database/011_project_scope_isolation.test.sql
```

Expected: capability, command, audit and scope assertions all pass.

**Suggested commit boundary:** `feat: add audited access management commands`

---

## Task 5: Regenerate database types and add the typed Supabase access adapter

**Files:**
- Modify: `lib/supabase/database.types.ts`
- Create: `modules/access/infrastructure/supabase-access-repository.ts`
- Create: `modules/access/infrastructure/supabase-access-repository.test.ts`

- [x] **Step 1: Regenerate types from the local schema.**

Run after the local reset:

```bash
/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

Verify generated types contain:

```bash
rg -n "list_current_user_projects|current_user_has_capability|access_role_code|project_membership_functional_roles" lib/supabase/database.types.ts
```

Expected: all four names are present.

- [x] **Step 2: Write a RED adapter contract.**

The test double must record RPC calls and assert:

```ts
assert.deepEqual(calls[0], {
  fn: "list_current_user_projects",
  args: {},
})
```

Provide a row containing null membership/access role for a platform admin and
assert normalization produces:

```ts
{
  membershipId: null,
  projectId: "project-a",
  activityCode: "PQ-001",
  title: "Alpha",
  projectStatus: "active",
  accessRole: null,
  functionalRoles: [],
  capabilities: [],
  subcontractorIds: [],
  pdsAreaIds: [],
  isPlatformAdmin: true,
}
```

Assert unknown role/capability codes produce a generic
`AccessContractError`, not unchecked casts.

- [x] **Step 3: Run RED.**

Run:

```bash
node --import tsx modules/access/infrastructure/supabase-access-repository.test.ts
```

Expected: missing-module failure.

- [x] **Step 4: Implement the typed adapter.**

Export:

```ts
export interface ProjectAccessSummary extends EffectiveAccess {
  activityCode: string
  title: string
  projectStatus: "active" | "inactive" | "archived"
}

export async function listCurrentUserProjects(
  client: SupabaseClient<Database>,
): Promise<ProjectAccessSummary[]>
```

Call:

```ts
const { data, error } = await client.rpc("list_current_user_projects")
```

Normalize every array with `?? []`. Validate every access role, functional
role and capability against the constant arrays from Task 1. Throw a generic
`AccessLoadError` for PostgREST failures and `AccessContractError` for unknown
catalog values.

- [x] **Step 5: Run GREEN.**

Run:

```bash
node --import tsx modules/access/infrastructure/supabase-access-repository.test.ts
npx tsc --noEmit --incremental false
```

Expected: both commands exit `0`.

**Suggested commit boundary:** `feat: load typed Supabase access context`

---

## Task 6: Replace membership-role auth state with project access summaries

**Files:**
- Modify: `contexts/supabase-auth-state.ts`
- Modify: `contexts/supabase-auth-state.test.ts`
- Modify: `contexts/supabase-auth-context.tsx`
- Create: `modules/access/ui/access-context.tsx`
- Create: `modules/access/ui/capability-guard.tsx`

- [x] **Step 1: Change auth-state tests before provider code.**

Replace role-bearing membership fixtures with `ProjectAccessSummary` fixtures.
Add assertions:

- a platform admin project row with `membershipId = null` is authorized;
- preferred project selection remains validated against the RPC rows;
- an empty project list gives `no_membership`;
- switching from QC Project A to Reader Project B changes the entire access
  summary, not only a role string.

- [x] **Step 2: Run RED.**

Run:

```bash
node --import tsx contexts/supabase-auth-state.test.ts
```

Expected: type/export failures caused by the old membership shape.

- [x] **Step 3: Rename the pure state vocabulary.**

In `supabase-auth-state.ts`:

- replace `SupabaseAccessMembership` with an interface requiring only
  `projectId`;
- rename `SupabaseMembershipDisplay` to `SupabaseProjectAccessDisplay`;
- retain stable sort, untrusted preference validation and storage-key rules;
- keep the access-state values unchanged.

Do not place capability computation in this file.

- [x] **Step 4: Load the RPC instead of direct membership rows.**

In `supabase-auth-context.tsx`:

- replace `SupabaseMembership` with `ProjectAccessSummary`;
- call `listCurrentUserProjects(client)`;
- remove the direct
  `.from("project_memberships").select("id, role, project:projects(...)")`
  query;
- keep request-version and disposed guards;
- expose `projectAccesses`, active `access`, `selectProject`,
  `reloadAccess`, `signOut` and `synchronizeProjectDisplay`;
- persist only the project UUID and revalidate it on every reload;
- after access mutation, call `reloadAccess()` instead of patching roles
  locally.

- [x] **Step 5: Add the UI access context.**

`AccessProvider` receives one `EffectiveAccess` value and exposes:

```ts
interface AccessContextValue {
  access: EffectiveAccess
  can: (capability: Capability) => boolean
  hasFunctionalRole: (role: FunctionalRole) => boolean
  isSubcontractorInScope: (id: string | undefined) => boolean
  isPdsAreaInScope: (id: string | undefined) => boolean
}
```

`useAccess()` throws when used outside the provider. `CapabilityGuard` accepts
`capability`, `children` and optional `fallback`, and renders nothing by
default when denied.

- [x] **Step 6: Run GREEN.**

Run:

```bash
node --import tsx contexts/supabase-auth-state.test.ts
node --import tsx modules/access/domain/effective-access.test.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit `0`.

**Suggested commit boundary:** `refactor: drive auth context from effective access`

---

## Task 7: Move navigation and direct-route UX to capabilities

**Files:**
- Create: `config/route-capabilities.ts`
- Create: `config/route-capabilities.test.ts`
- Modify: `config/navigation.ts`
- Modify: `components/pipeqc/sidebar-nav.tsx`
- Create: `components/pipeqc/route-capability-guard.tsx`
- Create: `components/auth/forbidden-screen.tsx`
- Modify: `components/pipeqc/app-shell.tsx`
- Modify: `components/pipeqc/top-nav-state.ts`
- Modify: `components/pipeqc/top-nav-state.test.ts`
- Modify: `components/pipeqc/top-nav.tsx`

- [x] **Step 1: Write route-resolution tests.**

Assert the most-specific matching behavior:

```ts
assert.equal(
  requiredCapabilityForPath("/admin/system-referential"),
  "system_referential.manage",
)
assert.equal(
  requiredCapabilityForPath("/fabrication/weld-progress"),
  "fabrication.view",
)
assert.equal(requiredCapabilityForPath("/nde/batch/123"), "nde.view")
assert.equal(requiredCapabilityForPath("/unknown"), null)
```

Also prove `/admin/access-rights` does not fall back to a weaker generic admin
rule.

- [x] **Step 2: Run RED.**

Run:

```bash
node --import tsx config/route-capabilities.test.ts
```

Expected: missing-module failure.

- [x] **Step 3: Create the route catalog.**

Use a longest-prefix-first array:

```ts
export const ROUTE_CAPABILITIES = [
  ["/admin/system-referential", "system_referential.manage"],
  ["/admin/project-definition", "project.definition.manage"],
  ["/admin/project-referential", "project_referential.manage"],
  ["/admin/access-rights", "access_rights.manage"],
  ["/admin/import-settings", "project_referential.manage"],
  ["/admin", "project_referential.manage"],
  ["/spooling", "spooling.view"],
  ["/fabrication", "fabrication.view"],
  ["/erection", "erection.view"],
  ["/tracking", "tracking.view"],
  ["/nde", "nde.view"],
  ["/testpack", "testpack.view"],
  ["/flange", "flange.view"],
  ["/reports", "reports.view"],
  ["/settings", "settings.view"],
  ["/documentation", "settings.view"],
] as const satisfies readonly (readonly [string, Capability])[]
```

`requiredCapabilityForPath` returns the first exact/prefix match and `null`
for `/` and unknown paths.

- [x] **Step 4: Remove role arrays from navigation.**

Delete `roles: Role[]` from `NavSection` and each config section. Add a pure
recursive filter:

```ts
export function getVisibleNavigation(
  can: (capability: Capability) => boolean,
): NavSection[]
```

An item is visible when:

- its route has no catalog requirement; or
- the caller has the required capability; or
- at least one descendant remains visible.

Do not keep a second role-to-route table.

- [x] **Step 5: Update SidebarNav and direct-route behavior.**

`SidebarNav` calls `useAccess().can` in Supabase mode and keeps the current
role filter only in demo mode. Put the mode switch in one small adapter rather
than branching inside every item.

`RouteCapabilityGuard`:

- reads `usePathname()`;
- resolves the required capability;
- renders children for unknown/public paths;
- renders `ForbiddenScreen` when denied.

The forbidden screen shows the project code, required section label and a link
to Home. It does not show raw capability arrays or database errors.

- [x] **Step 6: Install AccessProvider in AppShell.**

In Supabase shell state:

```tsx
<AccessProvider access={access}>
  <PipeQCShell>
    <RouteCapabilityGuard>{children}</RouteCapabilityGuard>
  </PipeQCShell>
</AccessProvider>
```

Keep `RoleProvider` only:

- around demo mode; and
- as a clearly named `LegacyPersonaBridge` for demo-only components still
  rendered in Supabase mode before Track 3.

The bridge may derive a display persona from functional roles, but no
Supabase-backed authorization or navigation may read it.

- [x] **Step 7: Update top-nav access labels.**

Replace `roleLabel` with:

- access role label;
- zero-or-more functional role labels;
- `System Admin` when `isPlatformAdmin`.

Project choices must carry effective-access labels returned by the RPC. Remove
Supabase use of `ROLES.find(...)`.

- [x] **Step 8: Run navigation and shell checks.**

Run:

```bash
node --import tsx config/route-capabilities.test.ts
node --import tsx components/pipeqc/top-nav-state.test.ts
node --import tsx components/pipeqc/app-shell-state.test.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit `0`.

**Suggested commit boundary:** `feat: guard navigation and routes by capability`

---

## Task 8: Implement real Supabase Access Rights domain and repository

**Files:**
- Create: `modules/access/domain/access-rights.ts`
- Create: `modules/access/domain/access-rights.test.ts`
- Create: `modules/access/infrastructure/supabase-access-rights-repository.ts`
- Create: `modules/access/infrastructure/supabase-access-rights-repository.test.ts`

- [x] **Step 1: Write RED validation tests.**

Cover:

- non-Subcontractor input clears supplied scopes;
- Subcontractor requires one or more functional roles;
- Subcontractor requires one or more subcontractor IDs;
- Subcontractor requires one or more PDS area IDs;
- email is trimmed/lowercased for add;
- duplicate arrays are normalized to unique stable order.

- [x] **Step 2: Implement validation types.**

Export:

```ts
export interface AccessMemberInput {
  accessRole: ProjectAccessRole
  functionalRoles: FunctionalRole[]
  subcontractorIds: string[]
  pdsAreaIds: string[]
}

export interface AccessMemberRow extends AccessMemberInput {
  membershipId: string
  userId: string
  fullName: string
  email: string
  isActive: boolean
}
```

Return a discriminated validation result with field errors. Do not throw for
normal form validation.

- [x] **Step 3: Write RED repository tests.**

Assert exact RPC calls:

```ts
["get_project_access_matrix", { target_project_id: "project-a" }]
["add_project_member_by_email", {
  target_project_id: "project-a",
  target_email: "person@example.com",
  requested_access_role: "subcontractor",
  requested_functional_roles: ["nde_inspector"],
  requested_subcontractor_ids: ["sub-a"],
  requested_pds_area_ids: ["pds-a"],
}]
```

Add corresponding expectations for update and active-state RPCs. Verify raw
PostgREST messages are converted to:

- `AccessDeniedError`;
- `AccessConfigurationError`;
- generic `AccessMutationError`.

- [x] **Step 4: Implement the repository.**

Export:

```ts
loadProjectAccessMatrix(client, projectId)
addProjectMember(client, projectId, email, input)
updateProjectMember(client, membershipId, input)
setProjectMemberActive(client, membershipId, active)
```

Normalize returned arrays and validate catalog codes through Task 1 constants.
Never query `auth.users` or use a service key.

- [x] **Step 5: Run GREEN.**

Run:

```bash
node --import tsx modules/access/domain/access-rights.test.ts
node --import tsx modules/access/infrastructure/supabase-access-rights-repository.test.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit `0`.

**Suggested commit boundary:** `feat: add Access Rights domain and adapter`

---

## Task 9: Replace the Supabase Access Rights demo with a real matrix

**Files:**
- Create: `modules/access/ui/access-rights-screen.tsx`
- Create: `modules/access/ui/access-members-table.tsx`
- Create: `modules/access/ui/access-member-dialog.tsx`
- Modify: `app/admin/access-rights/page.tsx`
- Keep: `components/admin/access-rights-view.tsx`

- [x] **Step 1: Build the screen coordinator.**

`AccessRightsScreen` receives `projectId`, loads matrix rows and the active
project's subcontractor/PDS options, and owns:

- `loading`;
- `load_error`;
- `ready`;
- `saving`.

Use `createRequestVersion()` from `lib/request-version.ts` so a project switch
cannot display or save stale rows. After every successful mutation:

1. reload matrix;
2. call `reloadAccess()` in case the current user's visible access changed;
3. show success only after both authoritative reloads finish.

- [x] **Step 2: Build a presentation-only table.**

Columns:

- Name/email;
- Access role;
- Functional roles;
- Subcontractor scope;
- PDS scope;
- Active state;
- Edit/deactivate action.

Do not place Supabase calls in the table. Disable editing the signed-in user's
own row for non-platform callers and show the server-enforced reason.

- [x] **Step 3: Build the add/edit dialog.**

Add mode fields:

- exact existing-user email;
- access role;
- functional roles;
- subcontractor scope;
- PDS scope.

Edit mode omits email. Show scope selectors only for `subcontractor`. When the
access role changes away from Subcontractor, clear both scope selections
before save. Render the exact field errors returned by domain validation.

- [x] **Step 4: Select demo vs Supabase explicitly.**

In `app/admin/access-rights/page.tsx`:

- demo mode renders the existing `AccessRightsView`;
- Supabase mode requires active access plus `access_rights.manage`;
- Supabase mode renders `AccessRightsScreen`;
- update the header text so it never says a real Supabase matrix is
  “configuration display only”.

Do not delete the demo component or demo fixtures.

- [x] **Step 5: Verify TypeScript and focused behavior.**

Run:

```bash
node --import tsx modules/access/domain/access-rights.test.ts
node --import tsx modules/access/infrastructure/supabase-access-rights-repository.test.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit `0`.

- [ ] **Step 6: Perform a local browser verification.**

With the local Supabase stack and Next dev server:

1. sign in as Project Admin A;
2. open `/admin/access-rights`;
3. add an existing user as Project Reader;
4. sign in as that user and verify direct admin URL shows Forbidden;
5. assign QC functional role while keeping Reader and verify mutation remains
   denied;
6. change access role to Project Editor and verify fabrication navigation
   appears;
7. configure a scoped NDE Subcontractor and verify another PDS/WPS is absent;
8. verify the audit row exists.

Record browser verification separately from automated tests.

**Suggested commit boundary:** `feat: connect Access Rights to Supabase`

---

## Task 10: Remove Supabase authorization dependence on legacy role hooks

**Files:**
- Modify: `contexts/role-context.tsx`
- Modify: `lib/pm-write-lock.ts`
- Modify: `lib/scope-lock.ts`
- Modify: `components/reports/reports-view.tsx`
- Modify: `components/notifications/notifications-feed.tsx`
- Modify: `components/pipeqc/app-shell.tsx`

- [x] **Step 1: Mark RoleContext as demo compatibility.**

Rename exported descriptions and comments so `Role` is
`DemoFunctionalPersona` internally. Retain the existing public `Role` alias
only to avoid rewriting demo fixtures in this track.

Add a development-only invariant: Supabase-backed adapters and guards must not
import `contexts/role-context.tsx`.

- [x] **Step 2: Make write/scope hooks mode-aware and fail closed.**

For demo mode, preserve current behavior.

For Supabase mode:

- `usePmWriteLock` returns locked unless the caller supplies an explicit
  capability through a new `useWriteCapability(capability)` hook;
- `useScopeLock` delegates to `useAccess` and rejects missing PDS IDs for
  Subcontractor;
- no Supabase path reads `pipeqc-active-sub` from localStorage.

Do not bulk-map every demo mutation to a guessed capability. Components
without an explicit capability remain disabled in Supabase mode until their
own operational track migrates them.

- [x] **Step 3: Move remaining navigation/report checks.**

Replace `useRole` checks in reports and notifications with exact capabilities.
The top nav manual role switch remains rendered only in demo mode.

- [x] **Step 4: Prove no authoritative legacy imports remain.**

Run:

```bash
rg -n "role ===|currentRole ===|can_administer_project.*role|pipeqc-active-sub" \
  modules contexts config lib/supabase app/admin components/pipeqc
```

Expected:

- demo compatibility files may match;
- Supabase adapters, access context, route guards and Access Rights have no
  role-string or localStorage authorization checks.

- [x] **Step 5: Run focused checks.**

Run:

```bash
node --import tsx modules/access/domain/effective-access.test.ts
node --import tsx config/route-capabilities.test.ts
npx tsc --noEmit --incremental false
```

Expected: all commands exit `0`.

**Suggested commit boundary:** `refactor: isolate legacy demo role behavior`

---

## Task 11: Reclassify the role matrix without losing domain research

**Files:**
- Create: `docs/role_matrix/README.md`
- Modify: `docs/role_matrix/system_admin.md`
- Modify: `docs/role_matrix/subcontractor.md`
- Modify: `docs/role_matrix/project_manager.md`
- Modify: `docs/role_matrix/chat_gpt_on_role_matrix_aproach.md`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`

- [x] **Step 1: Add the role-matrix architecture note.**

`README.md` must state:

- role-matrix files are target functional-persona/domain maps;
- Manual access roles are a separate authorization axis;
- one membership has one access role and several functional roles;
- scope is a third independent axis;
- capability and RLS behavior are authoritative;
- implementation-status badges must distinguish demo state from Supabase
  production behavior.

Include the example mappings:

| Person | Access | Function | Scope |
| --- | --- | --- | --- |
| PM | Project Reader | Project Manager | Project |
| Internal QC | Project Editor | QC Engineer | Project |
| NDE laboratory user | Subcontractor | NDE Inspector | Subcontractor + PDS |
| Platform administrator | Global System Admin | none required | All projects |

- [x] **Step 2: Correct the three ambiguous role documents.**

- `system_admin.md`: mark “merged System/Project/Site Admin” as the legacy demo
  model and link to the design spec.
- `subcontractor.md`: replace “operationally identical to QC + NDE” with
  “restricted access profile whose commands come from explicit functional
  assignments”.
- `project_manager.md`: state that PM is a functional persona with Project
  Reader as the safe default, not an immutable access tier.
- `chat_gpt_on_role_matrix_aproach.md`: add an opening note that the domain-map
  strategy remains valid while authorization is now split across access,
  function and scope.

Do not delete user stories, gap tables, source references or product
priorities.

- [x] **Step 3: Update backend foundation status only with verified facts.**

After all tests pass, document:

- migrations applied;
- compatibility column retained;
- effective-access RPC used by auth context;
- Access Rights real-mode boundary;
- scope tests executed;
- remaining Track 3 demo-runtime limitation.

**Suggested commit boundary:** `docs: separate access roles from functional personas`

---

## Task 12: Full verification and exit-gate audit

**Files:**
- Modify only if verification finds a defect in files already owned by this plan.

- [x] **Step 1: Run every unit contract in the access slice.**

Run:

```bash
node --import tsx --test \
  modules/access/domain/*.test.ts \
  modules/access/infrastructure/*.test.ts \
  contexts/supabase-auth-state.test.ts \
  config/route-capabilities.test.ts \
  components/pipeqc/app-shell-state.test.ts \
  components/pipeqc/top-nav-state.test.ts
```

Expected: all tests pass, no unhandled rejection.

- [x] **Step 2: Run the complete database suite.**

Run:

```bash
/opt/homebrew/bin/supabase test db
```

Expected: existing 49 assertions plus the new access/scope assertions pass.

- [x] **Step 3: Run type and fixture checks.**

Run:

```bash
npx tsc --noEmit --incremental false
npm run validate:fixtures
git diff --check
```

Expected: all commands exit `0`.

If `npm run lint` still fails because the repository has no installed ESLint
binary, report it as the existing tooling baseline; do not describe source
lint as passed.

- [x] **Step 4: Run the authorization grep audit.**

Run:

```bash
rg -n "role = 'system_admin'|role === \"system_admin\"|role === \"project_manager\"|pipeqc-active-sub" \
  supabase/migrations modules/access contexts config app/admin components/pipeqc lib/supabase
```

Allowed matches:

- compatibility backfill;
- creator compatibility value;
- demo-only context/bridge;
- test fixture proving legacy migration.

Every other match must be replaced by a capability or scope predicate before
closing the track.

- [ ] **Step 5: Re-run the manual browser matrix.**

Verify:

- System Admin without membership sees all active projects and all sections;
- Project Admin A cannot see Project B rows;
- Project Reader sees read routes but cannot mutate;
- Project Editor + QC sees QC routes and not spooling administration;
- NDE Subcontractor sees only assigned subcontractor/PDS rows;
- direct forbidden URL and hidden navigation agree;
- changing access in Access Rights changes the target user's behavior after
  reload;
- demo mode still has the manual role switcher and existing demo data.

- [x] **Step 6: Update checkboxes and handoff state.**

Mark a task complete only when its RED/GREEN evidence and acceptance criteria
are present. Update `docs/SUPABASE_NEXT_AGENT_CONTEXT.md` with:

- final migration names;
- test counts;
- browser paths actually checked;
- retained compatibility constraints;
- the next roadmap task.

Do not claim browser verification if it was not run.

---

## Track exit criteria

- [x] Platform System Admin lists every active project without synthetic memberships.
- [x] Every non-platform project membership has exactly one access role.
- [x] Functional roles are many-to-many and cannot elevate the access ceiling.
- [x] Project Reader cannot mutate even with QC/NDE functional assignments.
- [x] Project Editor receives only capabilities from assigned functional roles.
- [x] Subcontractor without function or scope fails closed.
- [x] Subcontractor A cannot read or mutate Subcontractor/PDS B records.
- [x] Existing setup RLS no longer authorizes through legacy role comparisons.
- [ ] Navigation and direct-route UX resolve through one capability catalog.
- [x] Access Rights updates real membership/role/scope rows through audited RPCs.
- [x] Supabase authorization does not depend on localStorage role/subcontractor values.
- [ ] Demo mode remains functional and explicitly non-authoritative.
- [x] Database, unit, type and diff checks pass.
- [x] Unrun browser behavior is reported as unverified.

## Follow-on boundary

After this track passes, execute the runtime source-of-truth track before
allowing Supabase users to mutate demo-only operational stores. Project
Referential completion may proceed in parallel only where its RLS policies use
the capability and scope helpers created here.
