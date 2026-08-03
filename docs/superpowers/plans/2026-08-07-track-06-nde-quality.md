# Track 06 — NDE, Repair, Tracer & PWHT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement
> this plan task by task. Steps use checkbox (`- [ ]`) syntax. **Tick a box only after running
> its command and seeing the stated output**, and paste the real numbers into the step.

**Goal:** replace the interim NDE seam Track 05 left behind with the canonical Quality
aggregate — obligations generated from the matrix, batches, per-joint results, mandatory repair
cycles, tracer selection and the NDE100 escalation — without breaking the fabrication golden
path that Track 05 verified in a browser on 2026-08-03.

**Architecture:** Track 06 **modifies what Track 05 created**. `nde_obligations`,
`pwht_requirements` and `pwht_results` already exist. The obligation stays the single unit of
NDE work: a repair or a tracer is *another obligation on the same joint*, distinguished by
`cycle_kind` and `cycle_ordinal`, never a parallel table. Every mutation keeps the Track 05
contract — `SECURITY DEFINER`, `set search_path = public, pg_temp`, a
`current_user_has_capability` check, a `current_user_in_pds_scope` check, an `audit_events`
row, and an `idempotency_key` replayed through `command_receipts`.

**Tech stack:** PostgreSQL 15 (Supabase local), pgTAP, PostgREST, `@supabase/supabase-js`
2.110.8, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`.

---

## 1. Execution policy

Three Track 05 plans were reported complete before they were run, and the 2026-08-02 browser
walk found a defect that `typecheck`, pgTAP and the unit suite all passed over. Therefore:

- **A step whose output differs from "Expected" is a stop-and-report**, never a prompt to
  adjust the expectation to match the code.
- **`npm run verify` passing is not evidence that a screen works.** Gate D5 is not optional and
  cannot be replaced by any automated suite.
- **Migrations are forward-only.** Never edit an applied migration; `create or replace` in a
  *new* file is the sanctioned change mechanism.
- **No new capability** is invented: `nde.view`, `nde.batch.manage` and `nde.result.record`
  already exist in the Track 01 capability set. If a step appears to need a fourth, stop and
  report.
- Commit at the end of every task, with the message given in the task's last step.

## 2. Global constraints

- Supabase CLI is `/opt/homebrew/bin/supabase`; the database container is
  `supabase_db_pipe-qc-shell-layout`; SQL runs through
  `docker exec … psql -U postgres -d postgres`.
- New migration timestamps must sort after `20260805091000`.
- Error codes: Track 05 owns `PQC30`–`PQC39`. **Track 06 uses `PQC40`–`PQC47`** (§4).
- Secrets come from the environment; never printed, never committed.
- `supabase db reset` before `supabase test db`. Browser-fixture data breaks pgTAP one-way —
  measured `Files=20, Tests=354` with three failing files. Re-bootstrap afterwards if the
  browser stand is needed.
- The app is reachable at **`http://localhost:3000` only**; `127.0.0.1` is blocked as a
  cross-origin dev resource.

---

## 3. Decisions taken before any code

### 3.1 The unique constraint is the whole model

`nde_obligations` carries `unique (weld_joint_revision_id, method)`
(`20260804092000_weld_progress_commands.sql:60`). Repair R1/R2 and tracer T1/T2 **are
additional obligations on the same joint and the same method**, so this constraint forbids the
entire track. It is widened, not bypassed with a second table:

```sql
alter table public.nde_obligations
  add column cycle_kind text not null default 'original'
    check (cycle_kind in ('original', 'repair', 'tracer')),
  add column cycle_ordinal smallint not null default 0
    check (cycle_ordinal >= 0 and cycle_ordinal <= 2),
  add column parent_obligation_id uuid
    references public.nde_obligations(id) on delete restrict,
  add column category_code text not null default 'S',
  add column responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  add constraint nde_obligations_cycle_lineage check (
    (cycle_kind = 'original' and cycle_ordinal = 0 and parent_obligation_id is null)
    or (cycle_kind <> 'original' and cycle_ordinal between 1 and 2
        and parent_obligation_id is not null)
  );

alter table public.nde_obligations
  drop constraint nde_obligations_weld_joint_revision_id_method_key,
  add constraint nde_obligations_cycle_key
    unique (weld_joint_revision_id, method, cycle_kind, cycle_ordinal);
```

An original is `('original', 0, null)`; R1/R2 and T1/T2 are `(kind, 1|2, parent)`. The check
makes lineage structurally impossible to lose — there is no such thing as an orphan repair.

### 3.2 Changing `disposition` changes the release gate

`spool_fabrication_readiness.nde_pending` counts `disposition = 'pending'`, and both
`is_releasable` and the `PQC37` refusal depend on it (`20260804093000_fabrication_release.sql`).
Any new value in that vocabulary silently changes who may be QC released. The view is therefore
replaced **in the same migration** that widens the vocabulary.

New vocabulary: `pending`, `issued`, `satisfied`, `rejected`, `waived`, `superseded`.
`nde_pending` counts everything that is **not** `satisfied`, `waived` or `superseded` — so an
`issued` batch and an open `rejected` repair both keep the spool unreleasable, which is the
whole point.

**The same replacement narrows the weld count to shop joints.** Today the view counts every
non-removed joint, so a spool carrying one `field` or `assembly` joint can never reach
`is_fabricated`. Assembly ships disabled (`project_assembly_settings.enabled` defaults to
`false`), so this is live behaviour, not a hypothetical. The `welds` lateral gains
`and wjr.weld_location = 'shop'`. `060` asserts both halves: a spool whose only outstanding
joint is a field joint **is** fabricable, and its field joint still appears in the erection
backlog.

### 3.3 Deleting the interim RPC breaks a screen that currently works

`record_nde_obligation_outcome` (`20260804092200_weld_progress_locks.sql:137`) is what the
**Mark accepted** button on `/fabrication/qc-release` calls, through
`recordNdeObligationOutcome` in `supabase-construction-repository.ts`. Its own comment says
Track 06 replaces it. **Dropping it without replacing the UI path breaks the golden path Track
05 proved.** Therefore:

- Task 7 lands the batch and result UI **first**;
- Task 8 drops the RPC and rewires `/fabrication/qc-release` to the new read model **in the same
  commit**;
- Gate D5 re-walks the Track 05 golden path to `laydown`. If it no longer arrives, Track 06 is
  not done.

### 3.4 Escalation arithmetic

Counted per **population** = `(project_id, responsible_welder_qualification_id, category_code)`:

- rejected original → **R1 is mandatory**, plus two first-level tracer obligations;
- rejected R1 → R2 per policy;
- accepted T1 or T2 → **no** escalation;
- rejected second-level tracer → NDE100 escalation;
- the **fourth** rejection in the population → NDE100; the **third** does not;
- merely *assigning* a T2 is not a rejection and must never count.

NDE100 snapshots the remaining eligible population at creation time into
`nde_penalty_populations`; welds made afterwards do not retroactively join it.

### 3.5 Who owns a rejection

A joint has at least two weld points with **different** welders (root and cap — Track 05
enforces it). A rejection therefore cannot be attributed automatically without inventing an
answer. The decision:

- `record_nde_result` takes an explicit `responsible_welder_qualification_id`;
- it must be one of the welders actually on that joint's points, else `PQC42`;
- when the NDT report does not name one, the caller passes `null` and the result is recorded,
  but **no penalty is counted** — an unattributed rejection still forces R1 and tracers, since
  the weld is bad regardless of who made it.

This keeps the disciplinary mechanism defensible in front of a subcontractor: no welder
accumulates a penalty the report did not assign to them.

### 3.6 Category codes are an open question — confirm before Task 2

The roadmap names six categories: `S`, `SS`, `NR`, `H`, `HS`, `NDE100`. **The schema models none
of them**, and this plan does not invent their semantics. Task 2 step 1 is a stop-and-report
confirmation against the Easy Piping manual §11.9. Until then the column is
`category_code text not null default 'S'` with a check over exactly those six codes, sourced
from the matrix rule's regime. If the manual disagrees with this list, the correct action is to
stop and report, not to widen the check quietly.

### 3.7 Batch composition

A batch is a homogeneous unit of work handed to an NDT subcontractor. It is refused (`PQC40`)
if its items mix `method`, `category_code` or `responsible_welder_qualification_id`, or if any
obligation belongs to another project or a superseded revision (`PQC45`). Allocation up to the
required spot percentage is automatic **and reproducible**: candidates are ordered by
`(welded_on, weld_number)`, never randomly, so the same population always yields the same
selection and a QC engineer can explain to a subcontractor why a given joint was picked.

### 3.8 What Track 06 does not do

Assembly (§19 of the roadmap — an opt-in module that ships disabled), erection quality, and
Examination Request / Client Examination progress beyond the obligation lifecycle. If a step
appears to need them, stop and report.

---

## 4. Error codes

| Code | Meaning | User-facing sentence |
| --- | --- | --- |
| `PQC40` | Heterogeneous batch | A batch must cover one method, one category and one welder. Split this selection. |
| `PQC41` | Wrong batch state | This batch is not in a state that allows that action. Reload it and check its status. |
| `PQC42` | Invalid result | That obligation is not in this batch, already has a result, or names a welder who did not weld this joint. |
| `PQC43` | Ineligible tracer | That joint cannot serve as a tracer: it is already used, or outside the eligible population. |
| `PQC44` | Repair policy | This repair cycle is not allowed. R2 follows a rejected R1; there is no R3. |
| `PQC45` | Out of scope | That obligation belongs to another project or to a superseded revision. |
| `PQC46` | Penalty population | The NDE100 population snapshot is missing or empty. |
| `PQC47` | PWHT gate | This spool has an outstanding PWHT requirement and cannot be quality released. |

`PQC48`/`PQC49` stay free for Track 06 follow-ups. Every code gets a sentence in the
construction/quality error map and an assertion that the map covers it.

---

## 5. File map

**Migrations** (new files only):

| File | Contents |
| --- | --- |
| `20260807090000_nde_obligation_lifecycle.sql` | §3.1 columns, lineage check and widened key; §3.2 vocabulary + replaced `spool_fabrication_readiness` incl. the shop narrowing; `PQC44`, `PQC45` |
| `20260807091000_nde_batches_results.sql` | `nde_batches`, `nde_batch_items`, `nde_results`; `create_nde_batch`, `allocate_nde_batch_candidates`, `issue_nde_batch`, `record_nde_result`, `close_nde_batch`; `PQC40`–`PQC42` |
| `20260807092000_nde_repair_tracer.sql` | `derive_repair_and_tracers`, `eligible_tracer_candidates`; `PQC43` |
| `20260807093000_nde_penalty_commands.sql` | `nde_penalty_populations`, `evaluate_nde_penalty`; `PQC46` |
| `20260807094000_pwht_quality_gate.sql` | PWHT obligation/result joined to quality release; `PQC47` |

**pgTAP:** `060_nde_batch_invariants.test.sql`, `061_nde_repair_tracer_truth_table.test.sql`,
`062_nde_penalty.test.sql`, `063_pwht_release.test.sql`.

**Modules:** `modules/quality/domain/{nde-obligation,nde-batch,repair-cycle,tracer,penalty-escalation}.ts`,
`modules/quality/application/{create-batch,record-results,assign-tracers}.ts`,
`modules/quality/infrastructure/supabase-quality-repository.ts`, `modules/quality/ui/`.

**Guard test:** `modules/quality/infrastructure/quality-select-columns.test.ts` — the
`modules/construction/infrastructure/construction-select-columns.test.ts` analogue.
`supabase-js` 2.110.8 does **not** type-check `.select()` column strings; without this, Track 06
can ship exactly the defect that made the Track 05 material-check screen unusable.

**Routes:** `/nde` (Batch Management) and `/nde/dashboard` — today both render demo components
unconditionally, with **no `useAppMode` branch at all** (`app/nde/page.tsx`,
`app/nde/dashboard/page.tsx`). In Supabase mode they present fabricated figures as real. Task 7
adds the branch; Task 10 re-checks it.

---

## 6. Tasks

### Task 1 — Obligation lifecycle and the readiness replacement

- [ ] **Step 1.** Write `20260807090000_nde_obligation_lifecycle.sql` with the §3.1 DDL.
- [ ] **Step 2.** Backfill: every existing row is `('original', 0, null)` — that is what the
      column defaults give, so assert it rather than writing an update.
      Expected: `select count(*) from nde_obligations where cycle_kind <> 'original'` → `0`.
- [ ] **Step 3.** Widen `disposition` to the §3.2 vocabulary and `create or replace` the
      `spool_fabrication_readiness` view: `nde_pending` counts everything not in
      (`satisfied`, `waived`, `superseded`), and the `welds` lateral gains
      `and wjr.weld_location = 'shop'`.
- [ ] **Step 4.** `supabase db reset`. Expected: every migration applies; no error.
- [ ] **Step 5.** Extend `054_readiness_shop_joint_limitation.test.sql` — it currently pins the
      *old* behaviour. It must now assert the narrowed count and **fail if the predicate is
      removed**. This is a stop-and-report if the existing test cannot be inverted cleanly.
- [ ] **Step 6.** `supabase test db`. Expected: all files pass; assertion count above the
      previous total.
- [ ] **Step 7.** Commit: `feat(quality): widen the NDE obligation lifecycle and narrow shop readiness`.

### Task 2 — Obligations carry their category

- [ ] **Step 1. Stop-and-report.** Confirm the six category codes and their meaning against the
      Easy Piping manual §11.9 (§3.6). Record the confirmed list in this step before writing
      code. If the manual disagrees with `S`, `SS`, `NR`, `H`, `HS`, `NDE100`, stop.
- [ ] **Step 2.** Extend `generate_weld_obligations`
      (`20260804092100_record_weld_progress.sql:7`) to persist `category_code` from the matrix
      rule regime rather than re-deriving it at read time. `selection_mode` stays: it answers
      *how much*, `category_code` answers *which population*.
- [ ] **Step 3.** Assert a 100 % coverage rule still produces `selection_mode = 'full'` and
      category `NDE100` from the start, as the existing comment promises.
- [ ] **Step 4.** `supabase test db`; commit: `feat(quality): persist the NDE category on the obligation`.

### Gate D1

- [ ] `supabase db reset` applies all migrations from empty.
- [ ] `060` proves a spool with an open repair is **not** releasable.
- [ ] `054` proves the shop narrowing and fails when the predicate is removed.
- [ ] `npm run verify` exits `0`; record `Files=`, `Tests=`, unit count, fixture result.

### Task 3 — Batches

- [ ] **Step 1.** `20260807091000_nde_batches_results.sql`:

```sql
create table public.nde_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  batch_number text not null,
  method public.ndt_method not null,
  category_code text not null,
  responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  ndt_subcontractor_id uuid references public.project_subcontractors(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'returned', 'closed')),
  issued_on date, returned_on date, closed_on date,
  report_number text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, batch_number)
);

create table public.nde_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.nde_batches(id) on delete cascade,
  obligation_id uuid not null references public.nde_obligations(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (obligation_id)
);
```

  `unique (obligation_id)` — an obligation is examined by exactly one batch. A re-examination is
  a new obligation (a repair or tracer), never a second batch item on the same one.
- [ ] **Step 2.** `create_nde_batch(project_id, method, category_code, welder_id, subcontractor_id, idempotency_key)`
      — capability `nde.batch.manage`, PDS scope, audit row, receipt.
- [ ] **Step 3.** `allocate_nde_batch_candidates(batch_id, target_percentage, idempotency_key)`
      — §3.7 deterministic ordering. Refuse a heterogeneous selection with `PQC40`, an
      out-of-scope obligation with `PQC45`.
- [ ] **Step 4.** `issue_nde_batch` — `draft → issued`, sets every item's obligation to
      `disposition = 'issued'`. Any other source state is `PQC41`.
- [ ] **Step 5.** Commit: `feat(quality): add NDE batches and deterministic candidate allocation`.

### Task 4 — Results, per joint

- [ ] **Step 1.**

```sql
create table public.nde_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  obligation_id uuid not null references public.nde_obligations(id) on delete restrict,
  batch_item_id uuid references public.nde_batch_items(id) on delete restrict,
  outcome text not null check (outcome in ('accepted', 'rejected')),
  examined_on date not null,
  report_number text,
  defect_rework_code_id uuid references public.project_rework_codes(id) on delete restrict,
  responsible_welder_qualification_id uuid
    references public.welder_qualifications(id) on delete restrict,
  comment text,
  receipt_id uuid references public.command_receipts(id) on delete set null,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (obligation_id)
);
```

- [ ] **Step 2.** `record_nde_result(obligation_id, outcome, examined_on, report_number,
      defect_code_id, responsible_welder_id, idempotency_key)` — capability
      `nde.result.record`, PDS scope, receipt, audit. Refuse with `PQC42` when the obligation is
      not in an issued batch, already has a result, or names a welder who is not on that joint's
      weld points (§3.5). A rejected result **must** carry a defect code.
- [ ] **Step 3.** A bulk accept with no joint selection is impossible by construction — the RPC
      takes one obligation. Assert there is no set-based variant anywhere in the migration.
- [ ] **Step 4.** Accepted → `disposition = 'satisfied'`. Rejected → `disposition = 'rejected'`
      and `derive_repair_and_tracers` is called (Task 5).
- [ ] **Step 5.** `close_nde_batch` — every item has a result, else `PQC41`.
- [ ] **Step 6.** Commit: `feat(quality): record NDE results per joint`.

### Gate D2

- [ ] `060` passes: heterogeneous batch refused, allocation deterministic across two runs with
      the same population, `issued` keeps a spool unreleasable.
- [ ] The batch domain unit tests pass.
- [ ] The same population yields the identical candidate list twice — paste both lists.

### Task 5 — Repair and tracer derivation

- [ ] **Step 1.** `derive_repair_and_tracers(rejected_obligation_id)`:
      a rejected `original` creates R1 (`cycle_kind = 'repair'`, ordinal 1, parent = original)
      **and** two tracer obligations (`cycle_kind = 'tracer'`, ordinal 1). A rejected R1 creates
      R2. A rejected R2 raises `PQC44` — there is no R3.
- [ ] **Step 2.** `eligible_tracer_candidates(obligation_id)` — joints of the same population
      (§3.4) not already used as a tracer and not themselves rejected. Selecting an ineligible
      or used candidate is `PQC43`.
- [ ] **Step 3.** Every derived obligation inherits `method`, `category_code` and
      `responsible_welder_qualification_id` from its parent, so the population is stable down the
      chain.
- [ ] **Step 4.** Commit: `feat(quality): derive mandatory repairs and tracer obligations`.

### Task 6 — NDE100 escalation

- [ ] **Step 1.** `nde_penalty_populations` — `(project_id, welder_qualification_id,
      category_code, triggered_by_obligation_id, snapshot_taken_at)` plus a member table holding
      the joints eligible **at that moment** (§3.4). Later welds do not join.
- [ ] **Step 2.** `evaluate_nde_penalty(population)` — called after every rejected result.
      Creates NDE100 when a second-level tracer is rejected, or on the **fourth** rejection in
      the population. Assigning a T2 must not count as a rejection.
- [ ] **Step 3.** An empty or missing snapshot is `PQC46`, never a silent no-op.
- [ ] **Step 4.** Commit: `feat(quality): escalate to NDE100 with a population snapshot`.

### Gate D3

- [ ] `061` and `062` pass with **all eight truth-table rows of §7 as separately named
      assertions**. Paste the assertion names.
- [ ] Row 6 (four rejections → NDE100) and row 7 (three → none) are asserted against the same
      fixture, differing only in the fourth result.

### Task 7 — Quality UI

- [ ] **Step 1.** `modules/quality/**` domain and application layers, pure, unit-tested — no
      Supabase import below `infrastructure/`.
- [ ] **Step 2.** `supabase-quality-repository.ts` plus
      `quality-select-columns.test.ts` (§5). Prove the guard: break one `.select()` on purpose,
      watch the test fail, restore it, watch it pass. Record both outputs.
- [ ] **Step 3.** Batch management on `/nde`: create, allocate, issue, record results, close.
      Every refusal in §4 must reach the user as its sentence, never as raw SQL.
- [ ] **Step 4.** `/nde/dashboard` from database projections.
- [ ] **Step 5.** Add the `useAppMode` branch both routes are missing today, so demo figures can
      never be presented as real in Supabase mode.
- [ ] **Step 6.** Remove Supabase-mode use of `batches-store` and the NDE mutation in
      `welds-store`.
- [ ] **Step 7.** Commit: `feat(quality): move NDE batch management onto Supabase`.

### Task 8 — Retire the interim RPC

- [ ] **Step 1.** Rewire `/fabrication/qc-release` to the new read model: obligations are shown
      with their cycle and disposition; **Mark accepted** is replaced by a link into the batch
      that owns the obligation.
- [ ] **Step 2.** Drop `record_nde_obligation_outcome` and remove
      `recordNdeObligationOutcome` from `supabase-construction-repository.ts` — **same commit**
      (§3.3).
- [ ] **Step 3.** `grep -rn "record_nde_obligation_outcome" supabase/ modules/ app/` → only the
      dropping migration matches.
- [ ] **Step 4.** Commit: `refactor(quality): retire the interim NDE outcome command`.

### Task 9 — PWHT quality gate

- [ ] **Step 1.** `20260807094000_pwht_quality_gate.sql`: a PWHT requirement with no accepted
      result blocks quality release with `PQC47`, replacing the Track 05 counting.
- [ ] **Step 2.** `063` covers: accepted chart releases; rejected chart followed by an accepted
      one releases; no chart refuses.
- [ ] **Step 3.** Commit: `feat(quality): gate release on the PWHT result`.

### Task 10 — Verification and close

- [ ] **Step 1.** `supabase db reset && npm run verify` → `0`. Record all four counts.
- [ ] **Step 2.** `supabase gen types typescript --local` → empty diff.
- [ ] **Step 3.** `git status` shows no modification under `supabase/migrations/` to any file
      dated before `20260807`.
- [ ] **Step 4.** Bootstrap the browser stand; extend
      `scripts/bootstrap-track05-browser-fixtures.ts` only if Track 06 needs a referential it
      does not already write — note it explicitly if so.

### Gate D4

- [ ] `npm run verify` exits `0` from a fresh reset; pgTAP assertion count recorded and higher
      than Track 05's.
- [ ] `database.types.ts` is in sync.
- [ ] `quality-select-columns.test.ts` demonstrably fails on a broken `.select()`.

### Gate D5 — browser, not optional

- [ ] Every new Quality screen walked per the conventions in
      `docs/qa/tracks-01-05-agent-walkthrough.md`, with a report in its §15 template.
- [ ] `/nde` and `/nde/dashboard` show a real empty state on a project with no batches — no
      demo figures.
- [ ] **The Track 05 golden path is re-walked end to end and still reaches `laydown`** after
      Task 8. Paste the resulting stage ladder.
- [ ] A rejected result visibly produces R1 and two tracers on screen, and the spool becomes
      unreleasable again.
- [ ] Every `PQC40`–`PQC47` refusal that a screen can trigger is shown as its sentence.

---

## 7. Mandatory truth table

Each row is one named pgTAP assertion in `061`/`062` **and** one domain unit test.

| # | Given | Then |
| --- | --- | --- |
| 1 | Original accepted | Obligation `satisfied`; no repair, no tracer |
| 2 | Original rejected | R1 created **and mandatory**, plus two first-level tracer obligations |
| 3 | R1 rejected | R2 created per policy; a rejected R2 raises `PQC44` |
| 4 | T1 or T2 accepted | No escalation |
| 5 | Second-level tracer rejected | NDE100 escalation created |
| 6 | Four rejections in one `(welder, category)` population | NDE100 created |
| 7 | Three rejections in that population | NDE100 **not** created |
| 8 | Result for another project or a superseded revision | Refused with `PQC45` |

## 8. Exit criteria

- Batch selection is reproducible and explainable to a QC engineer, not a black box.
- Repair and tracer lineage is traceable from the original result to the current one, in the
  database and on screen.
- Quality release consumes obligations, not an ad-hoc status column.
- Shop and field share one Quality context; the erection surface consumes it unchanged in T7.
- The truth table passes in both the domain unit suite and pgTAP.
- **The Track 05 fabrication golden path still reaches `laydown` in a browser after Task 8.**
- No screen presents demo data as real in Supabase mode.

## 9. Prerequisites from Track 05

`docs/qa/track-05-catchup-brief.md` — cases A and B. The revision carry-over
(`materialize_progress_copies`) and the second-user durability check have never been walked in a
browser, and Task 1 replaces the readiness view both of them read from. Run the brief before
Task 1, not after.
