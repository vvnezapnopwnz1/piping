# System Referential Guardrails Design

## Goal

Enforce that only `material_type` is mutable in the Supabase-backed System
Referential vertical, while retaining read access to all four global lists.

## Design

The database remains the authority. A new restrictive RLS policy applies to
each mutation command and requires both platform-administrator capability and
`kind = 'material_type'`. The existing read policy remains unchanged.

The browser API verifies a delete returned one row, so an RLS-filtered request
cannot be presented as a successful deletion. The page displays a generic load
error rather than a raw PostgREST error. pgTAP tests assert the new policy
definitions; TypeScript fake-client tests assert returned-delete verification
and an isolated RPC failure.

## Non-goals

- No seed data or new structured contracts for the three static lists.
- No changes to the demo mode.
- No reset of the local Supabase database.
