# Supabase Project Definition Design

## Goal

Replace the persisted Zustand mock on `/admin/project-definition` only in
`supabase` mode with a read/update workflow for the project selected by the
authenticated membership. Demo mode remains unchanged.

## Scope

The screen reads and updates exactly these `public.projects` fields:

- `activity_code`
- `title`
- `owner_name`
- `contractor_name`
- `owner_logo_path`
- `contractor_logo_path`
- `maximum_transit_time_days`

The form continues to validate uppercase activity codes, non-empty identity
fields, and a transit time of at least one day. It displays `updated_at` from
the database after a successful save.

## Access model

The browser reads the project by `membership.projectId`; it never selects a
project by an arbitrary route or query parameter. It asks the existing
security-definer `can_administer_project(projectId)` function whether saving
is available. The database remains authoritative: the existing RLS update
policy still makes the final decision.

A new migration grants `authenticated` only the column-level `UPDATE`
privileges needed by this screen. It does not grant mutation of `id`,
`created_by`, `status`, timestamps, or unrelated project columns. The existing
read grants remain in place.

## UI behaviour

- Demo mode keeps the existing Zustand implementation and its mock project.
- Supabase mode shows a loading state during the project/capability fetch.
- A successful read populates the existing summary and form with database
  values.
- A user who cannot administer the selected project sees read-only fields and
  an explanation; the save action is absent.
- Read/save failures show a generic retryable message and do not expose raw
  database error content.
- Logos remain URL/path strings. Storage upload and image validation are out
  of scope.

## Explicit non-goals

- Creating, deleting, listing, archiving, or switching projects.
- Multiple active project selection. The current Auth contract deliberately
  resolves one membership; a real selector is a separate later vertical slice.
- System/project referentials, membership administration, Storage, or
  operational records.

## Verification

Database tests prove the required `SELECT` and column-level `UPDATE` grants.
Pure tests cover mapping/validation and prohibit a project ID or protected
columns in an update payload. Browser verification uses the locally bootstrapped
system administrator to change a permitted field, reload, and observe the
persisted value; demo mode is checked separately.
