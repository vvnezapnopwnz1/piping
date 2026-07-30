# Track 01 Exit-gate Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve Access Rights form input on failed mutations, make scope hooks structurally safe, and accurately document Track 01 verification state.

**Architecture:** Authorization and RPC contracts do not change. A pure dialog-close decision receives a unit test; the scope hook calls all React hooks before selecting demo or Supabase behavior. Handoff documents only verified facts.

**Tech Stack:** Next.js, React 19, TypeScript strict, Node test runner, Supabase pgTAP, Markdown.

---

### Task 1: Preserve Access Rights form state on mutation error

**Files:**
- Create: `modules/access/ui/access-member-dialog-state.ts`
- Create: `modules/access/ui/access-member-dialog-state.test.ts`
- Modify: `modules/access/ui/access-member-dialog.tsx`
- Modify: `modules/access/ui/access-rights-screen.tsx`

- [x] **Step 1: Write the RED contract.**

```ts
import assert from "node:assert/strict"
import { shouldCloseAccessMemberDialog } from "./access-member-dialog-state"

assert.equal(shouldCloseAccessMemberDialog("saved"), true)
assert.equal(shouldCloseAccessMemberDialog("failed"), false)
```

- [x] **Step 2: Run RED.**

Run `node --import tsx modules/access/ui/access-member-dialog-state.test.ts`.
Expected: module-not-found failure.

- [x] **Step 3: Implement the minimal state boundary.**

```ts
export type AccessMemberSaveState = "saved" | "failed"

export function shouldCloseAccessMemberDialog(state: AccessMemberSaveState) {
  return state === "saved"
}
```

Have the screen return `"failed"` after its toast/error path. The dialog only
closes when the resolved state is `"saved"`.

- [x] **Step 4: Run GREEN.**

Run `node --import tsx modules/access/ui/access-member-dialog-state.test.ts`.
Expected: exit `0`.

### Task 2: Remove conditional hooks from `useScopeLock`

**Files:**
- Modify: `lib/scope-lock.ts`

- [x] **Step 1: Calculate demo scope before branching by app mode.**

Keep the existing `useMemo` and its dependencies unconditionally invoked.
After it, return the existing Supabase scope result for Supabase mode and the
existing demo result otherwise. No scope semantics or storage keys change.

- [x] **Step 2: Verify strict type checking.**

Run `npx tsc --noEmit --incremental false`.
Expected: exit `0`.

### Task 3: Complete role-matrix and handoff documentation

**Files:**
- Modify: `docs/role_matrix/README.md`
- Modify: `docs/role_matrix/chat_gpt_on_role_matrix_aproach.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`
- Modify: `docs/superpowers/plans/2026-07-31-track-01-access-capabilities.md`

- [x] **Step 1: Label functional/domain documents and authorization truth.**

Add explicit Demo-only and Supabase-implemented status language; retain
persona, access and scope as separate axes and RLS/capabilities as authority.

- [x] **Step 2: Replace stale handoff facts.**

Record migrations `20260731090000`, `20260731091000`, `20260731092000`, the
compatibility `access_role_code`, RPC-driven auth context, Access Rights RPCs,
93 pgTAP assertions, current automated checks and the remaining runtime/browser
boundary.

- [x] **Step 3: Mark only demonstrated Task 12 evidence.**

After fresh commands, mark automated steps 1–4 complete. Leave browser matrix
unchecked and mark only the explicit unrun-browser reporting criterion done.

### Task 4: Verify the remediation

**Files:**
- Modify only if a command exposes a defect in the files above.

- [x] **Step 1: Run access unit contracts.**

Run the Task 12 Node test command plus the new dialog-state test.

- [x] **Step 2: Run database and static checks.**

Run `/opt/homebrew/bin/supabase test db`, `npx tsc --noEmit --incremental false`,
`npm run validate:fixtures`, and `git diff --check`.

- [x] **Step 3: Run the authorization grep audit.**

Only historical migration compatibility and explicit demo bridge matches may
remain. Do not run `supabase db reset`; browser acceptance stays unverified.
