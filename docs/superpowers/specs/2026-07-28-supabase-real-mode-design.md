# Supabase Real Mode — Design

## Goal

Keep the present investor-demo experience intact while introducing a secure,
opt-in path to Supabase-backed authentication, project selection and role
resolution.

## Mode selection

`NEXT_PUBLIC_PIPEQC_MODE` is a build-time public environment flag. Its only
valid values are `demo` and `supabase`; absent or invalid values resolve to
`demo`. The default therefore preserves the current application behaviour.

The flag is intentionally not a URL parameter, cookie or localStorage value.
A browser user must not be able to promote a demo session into a mode intended
to be protected by Supabase RLS.

## Runtime model

`AppModeProvider` is the single boundary that exposes the selected mode to the
UI. It does not contain business data.

In `demo` mode, the existing `RoleProvider`, hard-coded project selector and
Zustand stores remain the source of UI state. The role switcher and Reset demo
button are unchanged.

In `supabase` mode, a session provider obtains the user from Supabase Auth and
loads only active `project_memberships`. The selected project and role must be
derived from that membership; client-provided role or project values are never
trusted. The browser client uses only `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Service-role credentials are never
included in client code.

## Access states

1. **Unauthenticated:** show the login screen. No application navigation or
   demo fallback is available.
2. **Authenticated, no active membership:** show an access-pending screen with
   the signed-in identity and instructions to contact a system administrator.
3. **Authenticated, active membership:** render PipeQC with the selected
   project and role from the membership.

The initial real-mode implementation supports one active membership at a time.
Multi-project switching is deferred until projects and membership management
are loaded from the database; it must not reuse the current mock project list.

## UI changes

`TopNav` branches only on the mode context:

- `demo`: preserve existing project and role dropdowns, DEMO MODE badge and
  Reset action.
- `supabase`: show the authenticated profile and active project; hide the
  project/role demo selectors and Reset action.

Existing operational screens remain Zustand-backed during this phase. Real
mode is introduced as an identity/access boundary first; no operational mock
record is copied into Supabase.

## Error handling and testing

- A pure mode parser has unit tests for absent, valid and invalid flag values.
- The public Supabase configuration remains validated before a browser client
  is created.
- Auth/loading/access states are explicit components, never an implicit switch
  to demo mode.
- DB tests continue to validate the RLS/membership schema. The local stack is
  started only when migration or database tests are required.

## Delivery sequence

1. Add and test the app-mode parser and `AppModeProvider`.
2. Add Supabase Auth session state and login/access-pending surfaces.
3. Make `TopNav` consume the mode and authenticated membership state.
4. Add a secure administrator bootstrap procedure for the first platform
   administrator and first project; this is a deployment operation, not a
   browser action.
5. Migrate Project Definition CRUD as the first Supabase-backed admin screen.

## Non-goals

- No migration of demo welds, spools, test packs or history.
- No service role in the browser.
- No switch from a real session back into demo by an end user.
- No automatic multi-project picker until membership data supplies it.
