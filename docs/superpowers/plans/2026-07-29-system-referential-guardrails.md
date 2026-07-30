# System Referential Guardrails Implementation Plan

> **For agentic workers:** Execute tasks sequentially; retain all changes for user review.

**Goal:** Close the database and browser error-handling gaps in System Referential management.

**Architecture:** Restrictive RLS policies enforce the mutable-kind boundary in PostgreSQL. The typed browser API verifies a returned deletion, and UI maps infrastructure failures to generic text.

**Tech Stack:** Supabase PostgreSQL/RLS, pgTAP, Next.js, TypeScript.

---

### Task 1: Prove and enforce the database boundary

**Files:**
- Create: `supabase/migrations/20260729173000_restrict_system_referential_mutations.sql`
- Modify: `supabase/tests/database/001_project_settings_and_referentials.test.sql`

- [ ] Add failing pgTAP assertions for restrictive INSERT, UPDATE, and DELETE policies that require `kind = material_type`.
- [ ] Run `/opt/homebrew/bin/supabase test db`; expect a plan-count failure before the migration exists.
- [ ] Add command-specific restrictive policies and rerun the test; expect PASS.

### Task 2: Verify actual deletion

**Files:**
- Modify: `lib/supabase/system-referentials.ts`
- Modify: `lib/supabase/system-referentials.test.ts`

- [ ] Make the fake delete test expect `.select('id').single()` and add an empty-result rejection case.
- [ ] Run `node --import tsx lib/supabase/system-referentials.test.ts`; expect failure.
- [ ] Return and validate the deleted row in the API; rerun the test and expect PASS.

### Task 3: Do not render infrastructure errors

**Files:**
- Modify: `components/admin/supabase-system-referential-view.tsx`

- [ ] Replace raw load-error rendering with a fixed user-facing message while retaining Retry.

### Task 4: Correct the operational documentation and verify

**Files:**
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`

- [ ] Remove the unsafe reset/stopped-stack instruction and document non-destructive verification.
- [ ] Run database tests, two relevant TypeScript tests, `npx tsc --noEmit --incremental false`, and `git diff --check`.
