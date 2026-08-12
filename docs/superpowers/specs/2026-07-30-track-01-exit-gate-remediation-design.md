# Track 01 exit-gate remediation

## Purpose

Close the verified review findings without changing the access-capability data
model, RLS policies, or production workflow scope.

## Changes

1. Access Rights form errors preserve the open dialog and all entered values.
   The screen coordinator must rethrow a failed mutation after showing the
   toast; the dialog closes only after its `onSave` promise resolves.
2. `useScopeLock` calls every React hook on every render. In Supabase mode it
   returns the existing capability-context scope result; demo calculations are
   still selected only for demo mode.
3. Role-matrix documentation explicitly separates functional personas, access
   roles, scope and authoritative Supabase behavior. It must label legacy demo
   behavior versus implemented Supabase behavior.
4. The next-agent handoff records the actual Track 01 migrations, compatibility
   column, RPC-driven auth context, 93 pgTAP assertions, verified automated
   checks, and the remaining demo-runtime/browser boundary.
5. Task 12 checkboxes record only verified automated evidence. Browser matrix
   and browser-dependent exit criteria remain unchecked and explicitly
   unverified.

## Testing

- Add an isolated unit test for the dialog-close decision so rejected save
  promises cannot close the dialog.
- Run the Track 01 unit command, full pgTAP suite, strict TypeScript, fixture
  validation, and diff check.
- Do not claim manual browser verification.

## Out of scope

- New capabilities, role grants, migrations, RLS changes, or operational
  workflow persistence.
- Running destructive database resets or modifying user identities/projects.
