# Track 06 — NDE, Repair, Tracer & PWHT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans`. Steps use
> checkbox (`- [ ]`) syntax. Tick a box only after running its command and seeing the stated
> output.

**Goal:** replace the interim NDE seam Track 05 left behind with the canonical Quality
aggregate — obligations generated from the matrix, batches, per-joint results, mandatory
repair cycles, tracer selection, and the NDE100 escalation — without breaking the fabrication
golden path that Track 05 verified in a browser on 2026-08-03.

**Architecture:** Track 06 **modifies what Track 05 created**. `nde_obligations`,
`pwht_requirements` and `pwht_results` already exist. The obligation stays the single unit of
NDE work; a repair or a tracer is another obligation on the same joint, distinguished by
`cycle_kind` and `cycle_ordinal`, not a parallel table. Every mutation keeps the Track 05
contract: `SECURITY DEFINER`, `set search_path = public, pg_temp`, a
`current_user_has_capability` check, a PDS-scope check, an `audit_events` row, and an
`idempotency_key` through `command_receipts`.

**Tech stack:** PostgreSQL 15 (Supabase local), pgTAP, PostgREST, `@supabase/supabase-js`
2.110.8, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`.

---

## 1. Execution policy

Three Track 05 plans were reported complete before they were run, and the browser walk found
a defect that `typecheck`, pgTAP and the unit suite all passed over. Therefore:

- **A step whose output differs from "Expected" is a stop-and-report**, never a prompt to
  adjust the expectation.
- **`npm run verify` passing is not evidence that a screen works.** Gate D5 is not optional.
- **Migrations are forward-only.** `create or replace` in a *new* file is the change mechanism.
- Commit at the end of every task.

## 2. Global constraints

- Supabase CLI is `/opt/homebrew/bin/supabase`; the DB container is
  `supabase_db_pipe-qc-shell-layout`.
- New migration timestamps must sort after `20260805091000`.
- Error codes: Track 05 owns `PQC30`–`PQC39`. **Track 06 starts at `PQC40`.**
- Secrets come from the environment and are never printed or committed.
- `supabase db reset` before `supabase test db` — bootstrap fixture data breaks pgTAP one-way
  (measured: `Files=20, Tests=354`, three failing files).

## 3. Decisions taken before any code

### 3.1 The unique constraint is the whole model

`nde_obligations` carries `unique (weld_joint_revision_id, method)`. Repair R1/R2 and tracer
T1/T2 **are additional obligations on the same joint and the same method**, so this constraint
forbids the entire track. It is widened, not worked around with a second table:

```sql
alter table public.nde_obligations
  add column cycle_kind text not null default 'original'
    check (cycle_kind in ('original', 'repair', 'tracer')),
  add column cycle_ordinal smallint not null default 0
    check (cycle_ordinal >= 0),
  add column parent_obligation_id uuid
    references public.nde_obligations(id) on delete restrict,
  drop constraint nde_obligations_weld_joint_revision_id_method_key,
  add constraint nde_obligations_cycle_key
    unique (weld_joint_revision_id, method, cycle_kind, cycle_ordinal);
```

`cycle_ordinal` is `0` for an original, `1`/`2` for R1/R2 and T1/T2. A repair or tracer must
carry `parent_obligation_id`; an original must not — enforced by a check, so lineage cannot be
lost.

### 3.2 Changing `disposition` changes the release gate

`spool_fabrication_readiness.nde_pending` counts `disposition = 'pending'`, and
`is_releasable` plus the `PQC37` refusal depend on it. Any new value in that vocabulary
silently changes who can be QC released. Therefore the view is replaced **in the same
migration** that touches the vocabulary, and `060_nde_batch_invariants.test.sql` asserts that a
spool with an open repair is not releasable — the exact regression this risks.

New vocabulary: `pending`, `issued`, `satisfied`, `rejected`, `waived`, `superseded`.
`nde_pending` counts everything that is not `satisfied`, `waived` or `superseded`.

### 3.3 Deleting the interim RPC breaks a screen that currently works

`record_nde_obligation_outcome` is what the **Mark accepted** button on
`/fabrication/qc-release` calls (`qc-release-screen.tsx`, via
`recordNdeObligationOutcome`). The roadmap says to delete it. **Deleting it without replacing
the UI path breaks the verified Track 05 golden path.** So:

- Task 7 lands the batch/result UI first.
- Task 8 removes the interim RPC and rewires the QC release screen to the new read model in
  the same commit.
- Gate D5 re-walks the Track 05 golden path end to end. If it no longer reaches `laydown`,
  Track 06 is not done.

### 3.4 Escalation arithmetic

Counted per `(welder_qualification_id, category)` population:

- rejected original → **R1 is mandatory**, plus two first-level tracer obligations;
- rejected R1 → R2 per policy;
- accepted T1 or T2 → **no** escalation;
- rejected second-level tracer → NDE100 escalation;
- the **fourth** rejection in the population → NDE100; the third does **not**;
- merely *assigning* a T2 is not a rejection and must not count.

NDE100 snapshots the remaining eligible population at creation time; later welds do not
retroactively join it.

## 4. File map

**Migrations** — new files only:

- `20260807090000_nde_obligation_lifecycle.sql` — §3.1 columns and key, §3.2 vocabulary and the
  replaced `spool_fabrication_readiness`, `PQC40`–`PQC43`
- `20260807091000_nde_batches_results.sql` — `nde_batches`, `nde_batch_items`, `nde_results`,
  `create_nde_batch`, `issue_nde_batch`, `record_nde_result`
- `20260807092000_nde_repair_tracer.sql` — repair/tracer derivation, tracer candidate selection
- `20260807093000_nde_penalty_commands.sql` — NDE100 escalation and its population snapshot
- `20260807094000_pwht_quality_gate.sql` — PWHT obligation/result joined to quality release

**pgTAP:** `060_nde_batch_invariants`, `061_nde_repair_tracer_truth_table`, `062_nde_penalty`,
`063_pwht_release`.

**Modules:** `modules/quality/domain/{nde-obligation,nde-batch,repair-cycle,tracer,penalty-escalation}.ts`,
`modules/quality/application/{create-batch,record-results,assign-tracers}.ts`,
`modules/quality/infrastructure/supabase-quality-repository.ts`, `modules/quality/ui/`.

**Guard test:** `modules/quality/infrastructure/quality-select-columns.test.ts`, the
`modules/construction/infrastructure/construction-select-columns.test.ts` analogue.
`supabase-js` does not type-check `.select()` strings; without this, Track 06 can ship the same
class of defect Track 05 shipped.

## 5. Tasks and gates

- [ ] **Task 1 — Obligation lifecycle.** §3.1 and §3.2 in one migration. Replace
      `spool_fabrication_readiness`. Backfill existing rows to `cycle_kind = 'original'`,
      `cycle_ordinal = 0`.
- [ ] **Task 2 — Obligations from the matrix snapshot.** Persist category `S`, `SS`, `NR`, `H`,
      `HS`, `NDE100` explicitly rather than re-deriving it at read time.
- [ ] **Gate D1** — `supabase db reset` applies every migration; `060` proves a spool with an
      open repair is not releasable; `npm run verify` exits 0.
- [ ] **Task 3 — Batches.** `nde_batches` + items. Refuse a batch mixing welders, categories or
      methods. Automatic candidate allocation up to the required percentage/count.
- [ ] **Task 4 — Lifecycle and results.** issued → returned → results received → closed. A
      result is recorded **per joint**; a bulk accept with no joint selection is refused.
- [ ] **Gate D2** — `060` and the batch domain unit tests pass; allocation is reproducible for a
      fixed seed and explainable in the UI.
- [ ] **Task 5 — Repair and tracer.** §3.4. Link every repair to its original weld and a
      defect/rework code. Refuse a tracer already used or ineligible.
- [ ] **Task 6 — Escalation.** NDE100 with its population snapshot.
- [ ] **Gate D3** — `061` and `062` pass, all eight truth-table rows below, each as a named
      assertion.
- [ ] **Task 7 — Quality UI.** NDE dashboard, batch management and history on Supabase. Remove
      Supabase-mode use of `batches-store` and the NDE mutation in `welds-store`.
- [ ] **Task 8 — Retire the interim RPC.** §3.3: drop `record_nde_obligation_outcome` and
      rewire `/fabrication/qc-release` in the same commit.
- [ ] **Task 9 — PWHT gate.** PWHT obligation/result joined to quality release.
- [ ] **Gate D4** — `063` passes; `npm run verify` exits 0 from a fresh reset; the generated
      types diff is empty; `quality-select-columns.test.ts` fails on a deliberately broken
      `.select()` and passes on the real one.
- [ ] **Gate D5 — browser.** Every new screen walked per
      `docs/qa/tracks-01-05-agent-walkthrough.md` conventions, **and** the Track 05 golden path
      re-walked end to end to `laydown` after Task 8. Not optional, not replaceable by any
      automated suite.

## 6. Mandatory truth table

Each row is one named pgTAP assertion in `061`, and one domain unit test.

| # | Given | Then |
| --- | --- | --- |
| 1 | Original accepted | Obligation closed; no repair, no tracer |
| 2 | Original rejected | R1 created **and mandatory**, plus two first-level tracer obligations |
| 3 | R1 rejected | R2 created per policy |
| 4 | T1 or T2 accepted | No escalation |
| 5 | Second-level tracer rejected | NDE100 escalation created |
| 6 | Four rejections in the welder/category population | NDE100 created |
| 7 | Three rejections | NDE100 **not** created |
| 8 | Result from another project or a superseded revision | Refused |

## 7. Exit criteria

- Batch selection is reproducible and explainable to a QC engineer, not a black box.
- Repair and tracer lineage is visible from the original result to the current one.
- Quality release consumes obligations, not an ad-hoc status column.
- Shop, assembly and field share one Quality context.
- The truth table passes in both the domain unit suite and pgTAP.
- The Track 05 golden path still reaches `laydown` in a browser after Task 8.

## 8. Prerequisites from Track 05

`docs/qa/track-05-catchup-brief.md` — cases A and B. The revision carry-over
(`materialize_progress_copies`) and the second-user durability check have never been walked in
a browser, and Task 1 replaces the readiness view they both read from.
