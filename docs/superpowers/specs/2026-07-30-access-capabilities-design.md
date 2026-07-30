# PipeQC Access Roles, Functional Roles and Scope Design

**Status:** Approved for implementation planning
**Date:** 2026-07-30
**Scope:** Supabase real mode, project access, authorization, navigation and Access Rights
**Related roadmap:** `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`, Track T1

---

## 1. Decision

PipeQC will not replace the existing QC Engineer, NDE Inspector, Project
Manager and Spooling Team concepts with the coarse Easy Piping access roles.
It will separate four concepts that are currently compressed into one
`app_role` enum:

1. **Platform authority** — global System Admin.
2. **Project access role** — the maximum level of access inside one project.
3. **Functional role** — the work a person performs.
4. **Data scope** — the project records on which that work is allowed.

The existing documents in `docs/role_matrix/` remain the domain source for
functional personas and workflows. They stop being treated as a one-column
authorization model.

## 2. Source alignment

The design preserves both source families:

- Easy Piping defines System Admin, Project Admin, Site Admin, Project Editor,
  Subcontractor and Project Reader as access tiers.
- PipeQC role research defines Project Manager, QC Engineer, NDE Inspector and
  Spooling Team as functional personas.
- Easy Piping subcontractor access is restricted by subcontractor and PDS
  area, with the subcontractor field forced to the signed-in user's scope.
- Project membership and role assignment are project-specific.

The current `system_admin` project membership incorrectly combines platform,
project and site authority. The current `subcontractor` role incorrectly
combines an external access boundary with several possible professions.

## 3. Goals

- Preserve the detailed role-matrix workflows and persona language.
- Make platform System Admin independent from project membership.
- Give every active project membership exactly one access role.
- Allow zero or more functional roles per membership.
- Make a subcontractor membership unusable for mutations until both a
  functional assignment and a valid data scope exist.
- Use capabilities as the shared language for RLS helpers, application
  commands, route visibility and disabled UI actions.
- Make missing scope deny access instead of widening it.
- Keep the current `app_role` column only as a temporary migration aid.
- Provide a real Supabase-backed Access Rights screen for existing users.
- Record membership, role and scope changes in `audit_events`.

## 4. Non-goals

This track does not:

- implement ISO, spool, weld, NDE, tracking or test-pack persistence;
- make demo Zustand stores production data;
- implement Supabase Auth invitations or password administration;
- introduce a separate microservice;
- implement PDA users or offline synchronization;
- invent a site hierarchy not present in the current database;
- remove demo mode;
- drop the legacy `app_role` type or membership column in the same release.

User provisioning remains outside the browser. In this track an administrator
can add an existing profile to a project by exact email. A profile must already
exist through the normal Supabase Auth flow.

## 5. Domain model

### 5.1. Platform authority

`profiles.is_platform_admin` remains the only source for global System Admin.
A platform administrator:

- can list every active project without a membership row;
- has every capability in every project;
- can create projects;
- can mutate System Referential;
- can administer memberships, roles and scopes;
- is still recorded as the audit actor.

No project membership is created merely to make a platform administrator see
a project.

### 5.2. Project access roles

Every non-platform project membership has exactly one of:

| Code | Meaning |
| --- | --- |
| `project_admin` | Full selected-project administration and operation, excluding platform-only actions. |
| `site_admin` | Same capability ceiling in the first implementation, retained as a distinct audited role for future site boundaries. |
| `project_editor` | Operational editing only; no Administration mutations. |
| `subcontractor` | Operational editing allowed only through functional roles and assigned subcontractor/PDS scope. |
| `project_reader` | Read-only access to project modules and reports. |

`site_admin` is not silently mapped to a guessed PDS or site. Until a
first-class site aggregate exists, it has the same project boundary as
`project_admin`, but remains a distinct role in data and audit.

### 5.3. Functional roles

Functional roles are many-to-many assignments:

| Code | Initial responsibility |
| --- | --- |
| `project_manager` | Dashboards, reports and read-oriented drill-down. |
| `qc_engineer` | Fabrication/erection QC, weld progress, QC release and NDE coordination. |
| `nde_inspector` | NDE batches, examination progress and result entry. |
| `spooling_team` | Engineering-to-site ISO/spooling workflow. |
| `fabrication_contributor` | Fabrication progress entry without QC release authority. |
| `erection_contributor` | Erection progress entry without broad QC authority. |
| `tracking_operator` | Physical spool-location event entry. |

The catalog is extensible. Adding a functional role does not require changing
a PostgreSQL enum.

### 5.4. Data scope

The first implementation reuses:

- `membership_subcontractor_scopes`;
- `membership_pds_area_scopes`.

Rules:

- Project Admin, Site Admin, Project Editor and Project Reader have project
  scope unless a later bounded context adds a narrower assignment.
- A Subcontractor membership must have at least one subcontractor scope and at
  least one PDS area scope before it can mutate operational data.
- A Subcontractor record with no applicable scope is denied.
- A project record whose required `subcontractor_id` or `pds_area_id` is null
  is not treated as globally visible to a scoped user.
- Frontend scope arrays are presentation hints only. PostgreSQL policies and
  command functions are authoritative.

## 6. Capability model

Capabilities use stable lowercase dotted codes. The initial catalog covers
existing routes and near-term commands:

### Administration

- `project.view`
- `project.definition.manage`
- `system_referential.view`
- `system_referential.manage`
- `project_referential.view`
- `project_referential.manage`
- `access_rights.manage`

### Operational modules

- `spooling.view`
- `spooling.manage`
- `fabrication.view`
- `fabrication.progress.record`
- `fabrication.qc.release`
- `nde.view`
- `nde.batch.manage`
- `nde.result.record`
- `erection.view`
- `erection.progress.record`
- `tracking.view`
- `tracking.event.record`
- `testpack.view`
- `testpack.manage`
- `flange.view`
- `flange.manage`

### Reporting and common UI

- `reports.view`
- `reports.export`
- `settings.view`

Every capability records:

- whether it is a mutating capability;
- whether it requires a functional role in addition to the access-role
  ceiling.

Read routes and operational commands that identify a profession require a
functional role for Project Editor and Subcontractor. Project Admin, Site
Admin and Project Reader bypass that functional gate only for capabilities
already present in their access-role ceiling. This means:

- Project Reader can see all read-only project modules but receives no write
  capability;
- Project Admin and Site Admin have full project capability ceilings;
- Project Editor sees and edits only the functional modules assigned to it;
- Subcontractor receives the same functional capabilities as an internal
  editor, further intersected with scope;
- functional roles can never elevate a Project Reader to a writer.

## 7. Effective-access rule

For a non-platform user:

```text
allowed =
  active membership
  AND project access role grants the capability
  AND (
    capability does not require a functional role
    OR access role bypasses the functional gate
    OR one assigned functional role grants the capability
  )
  AND (
    capability is read-only
    OR project status is active
  )
  AND resource is inside required scope
```

Platform System Admin short-circuits the role and scope checks, but not
database invariants, foreign keys or audit.

Archived and inactive projects remain available for authorized historical
reads through explicit administration/history flows. Mutating capabilities
return false.

## 8. Database representation

### 8.1. Catalogs

The database adds:

- `roles(code, label, kind, bypasses_functional_gate, is_active)`;
- `capabilities(code, description, is_mutating,
  requires_functional_role)`;
- `role_capabilities(role_code, capability_code)`;
- `project_membership_functional_roles(membership_id, role_code)`.

`roles.kind` is `access` or `functional`.

`project_memberships` receives `access_role_code`. The existing
`role public.app_role` column remains temporarily and is renamed only in a
later cleanup after every application consumer has migrated.

Triggers reject:

- an access-role code whose catalog kind is not `access`;
- a functional-role assignment whose catalog kind is not `functional`;
- a scope row whose project differs from the membership project.

### 8.2. Compatibility backfill

Existing rows are migrated without privilege escalation:

| Legacy `role` | New access role | New functional role |
| --- | --- | --- |
| `system_admin` | `project_admin` | none |
| `project_manager` | `project_reader` | `project_manager` |
| `qc_engineer` | `project_editor` | `qc_engineer` |
| `nde_inspector` | `project_editor` | `nde_inspector` |
| `spooling_team` | `project_editor` | `spooling_team` |
| `subcontractor` | `subcontractor` | none; administrator must assign an exact function |

A `system_admin` membership does not set `profiles.is_platform_admin`.
Existing platform flags remain unchanged.

After backfill, `access_role_code` becomes non-null. New code stops using the
legacy column for authorization. The column is retained for rollback and
older-client compatibility during this track.

## 9. Database API

The browser receives only security-definer RPCs with explicit caller checks:

### Read APIs

- `list_current_user_projects()` — active project choices plus effective
  access summary; platform admins receive all active projects.
- `get_project_access_matrix(project_id)` — members, access roles, functional
  roles and scope; requires `access_rights.manage`.
- `current_user_capabilities(project_id)` — effective capability codes.

### Authorization helpers

- `current_user_has_capability(project_id, capability_code)`;
- `current_user_in_subcontractor_scope(project_id, subcontractor_id)`;
- `current_user_in_pds_scope(project_id, pds_area_id)`;
- compatibility `can_administer_project(project_id)` implemented through
  capabilities.

### Write APIs

- `add_project_member_by_email(...)`;
- `update_project_member_access(...)`;
- `set_project_member_active(...)`.

The write functions:

- lock the target membership;
- validate access and functional role kinds;
- validate all scope IDs against the target project;
- require scope for Subcontractor;
- clear scope when changing away from Subcontractor;
- replace functional-role and scope sets atomically;
- write one audit event containing before/after state;
- return the normalized updated access row.

Direct browser writes to role catalogs, role assignments and scope tables are
revoked.

## 10. RLS policy

- Users may read their own membership, functional assignments and scope rows.
- Project access administrators may read and manage the project's access
  matrix through RPCs.
- Platform System Admin may read all active projects without synthetic
  memberships.
- A Project Reader cannot invoke any mutation RPC.
- A user without an active membership receives no project rows.
- A Subcontractor receives no out-of-scope rows and cannot submit an
  out-of-scope foreign key.
- Existing setup-table policies migrate from the legacy
  `can_administer_project` role comparison to capability checks.

Future operational-table policies must call the same helpers; they must not
reimplement role strings.

## 11. Application model

Supabase mode receives a new `AccessProvider` whose value contains:

```ts
interface EffectiveAccess {
  projectId: string
  membershipId: string | null
  isPlatformAdmin: boolean
  accessRole: ProjectAccessRole | null
  functionalRoles: FunctionalRole[]
  capabilities: Capability[]
  subcontractorIds: string[]
  pdsAreaIds: string[]
}
```

It exposes:

- `can(capability)`;
- `hasFunctionalRole(role)`;
- `isSubcontractorScoped`;
- `isSubcontractorInScope(id)`;
- `isPdsAreaInScope(id)`.

Demo mode keeps `RoleProvider` and its manual role switcher. Supabase-backed
code must use `AccessProvider`; `RoleProvider` becomes a compatibility surface
for demo-only operational screens until the runtime-source-of-truth track
removes those screens from Supabase mode.

## 12. Navigation and direct routes

`config/navigation.ts` stops embedding role arrays. A separate
`config/route-capabilities.ts` maps route prefixes to capabilities.

The same catalog drives:

- sidebar visibility;
- direct-route 403 UX;
- action guards.

RLS remains the security boundary. The client route guard prevents misleading
UI access but is not presented as data security.

Because the current auth implementation is browser-session based, this track
uses an AppShell capability guard. A server-layout guard can replace it after
cookie-compatible Supabase auth is introduced without changing capability
codes.

## 13. Access Rights UI

Supabase mode replaces the demo Access Rights view with a real matrix:

- existing project members;
- active/inactive state;
- exactly one access role;
- zero or more functional roles;
- subcontractor and PDS scope;
- validation explaining why a Subcontractor assignment is incomplete;
- save/deactivate/reactivate actions backed by RPCs.

The add flow accepts an exact email for an existing Supabase profile. It does
not claim to send an invitation.

Demo mode keeps the existing `AccessRightsView`.

## 14. Error handling

- The UI never renders raw Postgres/PostgREST errors.
- Domain validation errors return stable RPC error codes.
- Authorization denial is shown as a 403-style screen.
- Missing membership remains Access Pending.
- Missing Subcontractor scope is shown as configuration incomplete and denies
  operational access.
- A stale active project preference is ignored and removed.
- Concurrent membership changes are resolved by reloading the authoritative
  access context after every mutation.

## 15. Verification

### Database behavior

Tests use real authenticated JWT contexts for:

- platform administrator;
- Project Admin;
- Site Admin;
- Project Editor with QC role;
- Project Reader with a functional role;
- internal NDE Inspector;
- NDE Subcontractor with scope;
- Fabrication Subcontractor with different scope;
- inactive membership;
- user without membership;
- two separate projects;
- inactive/archived project.

They prove reads and mutations, not only policy definitions.

### Application behavior

Pure tests cover:

- effective-access calculations;
- route-to-capability resolution;
- navigation filtering;
- stale request protection;
- project switch changing roles and capabilities;
- scope predicates denying missing identifiers.

Adapter tests prove exact RPC names and payloads. Browser verification covers
project switching, direct-route denial and an Access Rights mutation changing
the affected user's behavior after reload.

## 16. Rollout sequence

1. Add catalogs and nullable `access_role_code`.
2. Seed roles/capabilities and backfill all current memberships.
3. Add functional assignments and make `access_role_code` non-null.
4. Add capability/scope helpers and management RPCs.
5. Add behavioral database tests.
6. Regenerate TypeScript database types.
7. Load effective access through the new project-list RPC.
8. Switch navigation and direct-route UX to capabilities.
9. Switch Access Rights to Supabase RPCs.
10. Retain the legacy enum only as a compatibility column.
11. Reclassify `docs/role_matrix/` as functional-persona documentation.

No destructive role-column drop occurs in this track.

## 17. Exit criteria

- Platform System Admin sees every active project without memberships.
- Every membership has exactly one access role.
- A membership can have multiple functional roles.
- Project Reader cannot mutate even when assigned a functional editor role.
- Project Editor receives only assigned functional capabilities.
- Subcontractor without complete scope has no operational mutation access.
- Two subcontractors cannot read or mutate each other's scoped records.
- Navigation and direct-route UI use the same capability catalog.
- Existing setup policies no longer compare the legacy role string.
- Access Rights mutations change real Supabase/RLS outcomes.
- Membership/role/scope changes produce audit events.
- Demo mode behavior remains available and clearly separate.
- All pgTAP, TypeScript and focused unit tests pass.
