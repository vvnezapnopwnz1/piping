# Track 07 — Erection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement
> this plan task by task. Steps use checkbox (`- [ ]`) syntax. **Tick a box only after running
> its command and seeing the stated output**, and paste the real numbers into the step.

**Goal:** make erection a first-class construction phase — To Site → Erected → Welded/Bolted
→ Supported → RFT — reusing the Construction and Quality contracts Tracks 05 and 06 built,
without breaking the fabrication golden path or the NDE aggregate that already pass in a
browser.

**Architecture:** Track 07 **unlocks what Track 05 built and locked to one phase**. The event
ledger `construction_progress_events` already carries `phase`; `record_construction_progress`
refuses every phase but `fabrication`. The weld command already handles multi-welder points,
WPS validation and post-NDE locking; it refuses every joint but `shop`. Track 07 removes those
two refusals under an explicit phase policy — it does not build a parallel erection stack.

**Tech stack:** PostgreSQL 15 (Supabase local), pgTAP, PostgREST, `@supabase/supabase-js`
2.110.8, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`.

---

## 1. Execution policy

Carried over from Track 06, because it worked:

- **A step whose output differs from "Expected" is a stop-and-report**, never a prompt to
  adjust the expectation to match the code.
- **`npm run verify` passing is not evidence that a screen works.** Gate D is not optional
  and cannot be replaced by any automated suite. The 2026-08-02 walk found a defect that
  typecheck, pgTAP and the unit suite all passed over; the 2026-08-04 walk found two more.
- **Migrations are forward-only.** Never edit an applied migration; `create or replace` in a
  *new* file is the sanctioned change mechanism.
- **No new capability is invented.** `erection.view` and `erection.progress.record` already
  exist in the Track 01 set. If a step appears to need a third, **stop and report** — §3.5
  explains why it almost certainly does not.
- Commit at the end of every task, with the message given in the task's last step.
- Record anything consciously not done in `docs/deferred-work.md`, with its trigger.

## 2. Global constraints

- Supabase CLI is `/opt/homebrew/bin/supabase`; the database container is
  `supabase_db_pipe-qc-shell-layout`; SQL runs through
  `docker exec … psql -U postgres -d postgres`.
- New migration timestamps must sort after `20260809092000`.
- Error codes: Track 05 owns `PQC30`–`PQC39`, Track 06 owns `PQC40`–`PQC47`, `PQC48`/`PQC49`
  are reserved for Track 06 follow-ups. **Track 07 uses `PQC50`–`PQC57`** (§4).
- Secrets come from the environment; never printed, never committed.
- `supabase db reset` before `supabase test db`. Browser-fixture data breaks pgTAP one-way.
  After a reset the Track 01 bootstrap can fail once with a `findOrCreateUser` stack trace —
  a race with GoTrue, not a defect; re-run the chain.
- The app is reachable at **`http://localhost:3000` only**; `127.0.0.1` is blocked as a
  cross-origin dev resource.

---

## 3. Decisions taken before any code

### 3.1 Assembly is out of scope, and the roadmap contradicts itself about it

The roadmap's §19 prose says Assembly is **not** in T7: the original Easy Piping from Technip
shipped without it, `project_assembly_settings.enabled` defaults to `false`
(`20260801090000_complete_project_referentials.sql:155`), and `assert_project_setup_ready`
demands assembly referentials only when that flag is on.

Its own task list then says *"Добавить Assembly navigation/routes/dashboard"* and its exit
criteria say *"Assembly присутствует как отдельная фаза"*. **Both cannot be true.**

**Decision: the prose wins; Assembly is out.** It is the position supported by the schema, by
the dossier (§21 marks Assembly as secondary-presentation evidence only), and by the default
that ships. Therefore:

- `modules/construction/ui/assembly/` is **not** written;
- `app/(protected)/assembly/**` is **not** created;
- no command accepts `phase = 'assembly'`; `PQC50` refuses it by name;
- `assembly` stays in the `construction_phase` enum as the extension point it already is.

The three roadmap task lines and the exit criterion that contradict this are **struck in the
roadmap as part of Task 1**, so the next reader does not re-litigate it. This plan title drops
"Assembly" for the same reason, though the filename the roadmap links to is kept.

**This is the one decision to reverse if the client asks for modular construction.** The
phase policy in §3.2 is written so that enabling assembly is adding rows to a table, not
rewriting commands.

### 3.2 One ladder table, one policy, two phases

`construction_progress_events` already has `phase construction_phase` and
`stage construction_stage`. The `construction_stage` enum holds only the eight fabrication
stages. Erection's five stages are added to the same enum and the same ledger:

```sql
alter type public.construction_stage add value 'to_site';
alter type public.construction_stage add value 'erected';
alter type public.construction_stage add value 'welded_bolted';
alter type public.construction_stage add value 'supported';
alter type public.construction_stage add value 'rft';
```

**Not a second table.** A spool has one construction history; splitting it by phase means
every read that wants "where is this spool" unions two tables, and Track 08's tracking work
would inherit that union. The ledger's `phase` column exists precisely so it does not have to.

Which stage belongs to which phase, and which are recordable, becomes **data**, not a chain
of `if` statements:

```sql
create table public.construction_phase_stages (
  phase public.construction_phase not null,
  stage public.construction_stage not null,
  ordinal smallint not null check (ordinal > 0),
  is_recordable boolean not null,
  primary key (phase, stage),
  unique (phase, ordinal)
);
```

`record_construction_progress` replaces its
`if target_phase <> 'fabrication' or target_stage not in (...)` with a lookup against this
table. Fabrication's existing behaviour is preserved by seeding it with exactly what the
command hardcodes today — `start_fab` and `sent_to_paint` recordable, the rest not. **A pgTAP
assertion must prove the seeded fabrication rows reproduce the old refusals**, or this
refactor is a silent behaviour change to a path that already passed a browser walk.

`alter type ... add value` cannot run inside a transaction block in the same statement that
uses the new value. Put the enum additions in their **own migration file**, ahead of the file
that references them.

### 3.3 RFT is derived, and Field QC Release is not a stage — stop-and-report

The dossier is explicit twice (§20.2, §20.6). The spool-level ladder is:

```text
To Site → Erected → Welded/Bolted → Supported → RFT
```

and RFT is *"automatic, когда completed all predecessor steps"*, refined by the Erection deck
to:

```text
Welded/Bolted AND Supported AND all joint NDE/PWHT released → spool RFT
```

So **RFT is derived, exactly as `fabricated` is derived in Track 05** — a view column with no
ledger event and no manual flag. The roadmap agrees: *"Запретить ручной RFT flag."*

But the repository already carries `app/erection/field-qc-release/` and a
`field-qc-release-store`, and the roadmap says *"Вычислять Erection QC Release/RFT из progress
+ accepted Quality obligations."* Fabrication has a real `qc_release` **event** with its own
capability. Erection's dossier ladder has no such stage.

**Task 2 Step 1 is a stop-and-report.** Confirm against the manual whether field QC release is
(a) a distinct recorded event as in fabrication, or (b) merely the screen from which a QC
engineer reads the derived RFT state and the outstanding obligations. Until confirmed, this
plan assumes **(b)**: `field_qc_release` is **not** added to the enum, the screen is a
read-only gate view, and `is_rft` is the derived column. If the manual says (a), stop — it
changes the enum, the phase-stage seed and the capability question in §3.5 all at once.

### 3.4 Field welds use the same command, the same matrix and the same Quality context

`record_weld_progress` refuses a non-shop joint with `PQC30`
(`20260804092100_record_weld_progress.sql:121`). That refusal was correct for Track 05, whose
screen was Shop Weld Progress. Dossier §20.5 says field welding has **the same** fields and
the same multi-welder rules: cutting/beveling/fit-up/preheat/weld, form number, rework, weld
points, WPS/welder, Root/Cap, Heat/Fill, post-NDE lock.

**Decision: one command, widened; not a second command.** The refusal becomes a check that the
joint's `weld_location` matches the phase the caller claims:

| `weld_location` | Recordable in phase |
| --- | --- |
| `shop` | `fabrication` |
| `field` | `erection` |
| `assembly` | none — `PQC50` while assembly is disabled |

A mismatch raises `PQC51`. This keeps one implementation of the allocation invariant, the WPS
range checks and the post-NDE lock, which is the thing Track 05 got right and must not be
forked.

`generate_weld_obligations` already resolves its matrix rule by `ctx.weld_location`, so a
field joint picks up the `field` matrix rule with no change. **Assert that**, do not assume it:
if no active rule covers `SC-*`/`BW-*`/`field`, the command raises `PQC39` and the erection
walk stops at its first weld. Task 6 seeds the fixture rule; the readiness for it is a Gate B
check.

### 3.5 No third capability, unless §3.3 resolves to (a)

`erection.view` and `erection.progress.record` exist and are already granted to
`erection_contributor`, `project_admin`, `project_editor`, `qc_engineer`, `site_admin` and
`subcontractor`. Fabrication's third capability, `fabrication.qc.release`, exists because
fabrication has a **release command**. If RFT is derived (§3.3 case b) there is no erection
release command, so there is nothing for a third capability to guard — reading the gate screen
is `erection.view`.

If §3.3 resolves to (a), a release event needs `erection.qc.release`, which is a Track 01
capability-set change and a **stop-and-report**, not a quiet insert.

### 3.6 Erection readiness is its own view, mirroring fabrication

Track 06 narrowed `spool_fabrication_readiness` to `weld_location = 'shop'` precisely so a
field joint would stop blocking shop readiness. The mirror image is a new
`spool_erection_readiness` counting **field** joints:

| Column | Meaning |
| --- | --- |
| `field_line_total` / `field_line_checked` | field material check against the PML |
| `field_weld_total` / `field_weld_complete` | field joints with a weld date |
| `field_support_total` / `field_support_recorded` | supports installed in the field |
| `nde_pending` / `pwht_pending` | from the **same** Quality obligations Track 06 owns, filtered to field joints |
| `is_rft` | `welded_bolted` and `supported` dates present **and** `nde_pending = 0` **and** `pwht_pending = 0` |
| `rft_on` | the greatest contributing date, `null` unless `is_rft` |

`nde_pending` must use Track 06's vocabulary — everything **not** in
(`satisfied`, `waived`, `superseded`) — and not re-derive it. Two definitions of "outstanding"
is how a repaired joint holds a spool forever, which is the defect Gate D5 found.

### 3.7 What Track 07 does not do

Assembly (§3.1). Flange bolt-up progress beyond what the erection weld path already writes —
`/erection/flange-progress` stays a smoke route for Track 09. Test Pack readiness, which
consumes RFT but is Track 10. Offline and device sync, which is Track 08. If a step appears to
need one of these, stop and report.

---

## 4. Error codes

| Code | Meaning | User-facing sentence |
| --- | --- | --- |
| `PQC50` | Assembly disabled | Assembly is not enabled on this project. |
| `PQC51` | Wrong phase for this joint | This joint belongs to a different construction phase. Record it on that phase's screen. |
| `PQC52` | Stage not recordable in this phase | This stage is derived or does not belong to this phase, and cannot be recorded manually. |
| `PQC53` | Erection predecessor missing | An earlier erection step has not been recorded for this spool. |
| `PQC54` | Spool not delivered to site | The spool must be recorded To Site before this step. |
| `PQC55` | RFT is derived | RFT cannot be set by hand. It follows from progress and accepted quality results. |
| `PQC56` | Field material check | That heat number does not match the project material list for this ident code. |
| `PQC57` | Erection scope | That spool or joint belongs to another project or to a superseded revision. |

Every code gets a sentence in `modules/construction/infrastructure/supabase-construction-errors.ts`
and an assertion that the map covers it — the pattern
`supabase-quality-errors.test.ts` already uses.

---

## 5. File map

**Migrations** (new files only):

| File | Contents |
| --- | --- |
| `20260810090000_erection_stage_enum.sql` | the five `alter type ... add value` statements, alone in their own file (§3.2) |
| `20260810091000_construction_phase_policy.sql` | `construction_phase_stages` + seed; `record_construction_progress` replaced to read it; `PQC50`, `PQC52` |
| `20260810092000_field_weld_progress.sql` | `record_weld_progress` widened to field joints under the phase/location map; `PQC51` |
| `20260810093000_erection_progress_commands.sql` | `record_erection_progress`, field material check, field support install; `PQC53`, `PQC54`, `PQC56`, `PQC57` |
| `20260810094000_erection_readiness.sql` | `spool_erection_readiness`; `PQC55` guard against a manual RFT write |

**pgTAP:** `070_construction_phase_transitions.test.sql`, `071_field_weld_parity.test.sql`,
`072_erection_rft.test.sql`.

**Modules:**
`modules/construction/domain/{phase-policy,erection-stage,rft}.ts`,
`modules/construction/application/{record-erection-progress,record-field-material-check}.ts`,
`modules/construction/infrastructure/supabase-erection-repository.ts` +
its `erection-select-columns.test.ts` guard,
`modules/construction/ui/erection/`.

**Routes:** the ten existing `app/erection/**` pages are adapters over demo components today.
Each gains a `useAppMode` branch, exactly as Track 06 did for `/nde`.

**Stores to stop using in Supabase mode:** `to-site-store`, `erected-store`,
`welded-bolted-store`, `supports-store`, `field-material-check-store`,
`field-qc-release-store`, `rft-store`, `erection-store`.

---

## 6. Tasks

### Task 1 — Settle the scope contradiction, then the phase policy

- [ ] **Step 1.** Amend the roadmap §19: strike the Assembly task lines and the Assembly exit
      criterion that contradict its own prose (§3.1). Record the decision in one sentence.
- [ ] **Step 2.** Write `20260810090000_erection_stage_enum.sql` with the five enum values and
      nothing else. Expected: `supabase db reset` applies cleanly.
- [ ] **Step 3.** Write `20260810091000_construction_phase_policy.sql`: the
      `construction_phase_stages` table, its seed, and `create or replace` of
      `record_construction_progress` reading it.
- [ ] **Step 4.** Seed fabrication with exactly today's behaviour — `start_fab` and
      `sent_to_paint` recordable, the other six not.
      Expected: `select count(*) from construction_phase_stages where phase='fabrication'` → `8`.
- [ ] **Step 5.** `070` asserts the **parity**: every refusal the old hardcoded command made
      for fabrication is still made. This is the step that makes the refactor safe; a plain
      "new stages work" test does not.
- [ ] **Step 6.** `supabase test db`. Expected: all files pass, assertion count above the
      previous total. Commit: `feat(construction): make the phase and stage policy data`.

### Task 2 — Erection progress commands

- [ ] **Step 1. Stop-and-report.** Resolve §3.3: is field QC release a recorded event or a
      read-only gate screen? Record the answer and its manual reference in this step before
      writing code. Assume the read-only gate until confirmed.
- [ ] **Step 2.** `record_erection_progress` for `to_site`, `erected`, `welded_bolted`,
      `supported`, with `PQC53`/`PQC54` ordering rules. Same contract as every Track 05
      command: `SECURITY DEFINER`, `set search_path`, capability check, PDS-scope check,
      `audit_events` row, `command_receipts` idempotency.
- [ ] **Step 3.** `PQC55`: `rft` can never be inserted into the ledger. Assert the refusal.
- [ ] **Step 4.** Field material check against the PML, mirroring
      `20260804091000_material_traceability.sql`. Reuse its validation; do not restate it.
- [ ] **Step 5.** `supabase test db`; commit: `feat(construction): record erection progress`.

### Task 3 — Field welds through the shop command

- [ ] **Step 1.** Replace the `weld_location <> 'shop'` refusal with the §3.4 phase/location
      map. `PQC51` on a mismatch, `PQC50` for assembly.
- [ ] **Step 2.** `071_field_weld_parity.test.sql`: a field joint recorded through this command
      produces the **same** shape as a shop joint — same allocation invariant, same WPS checks,
      same post-NDE lock, same obligation generation. Assert the obligations come from the
      `field` matrix rule.
- [ ] **Step 3.** Assert the negative that protects Track 05: a **field** joint recorded with
      `phase = 'fabrication'` is refused, and a **shop** joint with `phase = 'erection'` is
      refused.
- [ ] **Step 4.** `supabase test db`; commit: `feat(construction): widen weld progress to field joints`.

### Gate B — the seam is sound before any UI

- [ ] `supabase db reset` applies every migration from empty.
- [ ] `070` proves fabrication's refusals are unchanged.
- [ ] `071` proves a field joint generates obligations from the `field` matrix rule.
- [ ] The Track 05 and Track 06 pgTAP files still pass untouched.
- [ ] `npm run verify` exits `0`; record `Files=`, `Tests=`, unit count, fixture result.

### Task 4 — Erection readiness and RFT

- [ ] **Step 1.** `spool_erection_readiness` per §3.6, reusing Track 06's `nde_pending`
      vocabulary verbatim.
- [ ] **Step 2.** `072_erection_rft.test.sql`: RFT appears only when welded/bolted **and**
      supported **and** every field NDE and PWHT obligation is closed. Include the Track 06
      regression — a **repaired** field joint whose R1 is accepted must not hold RFT, because
      its superseded original is not "outstanding".
- [ ] **Step 3.** Assert a spool with an open field repair is **not** RFT.
- [ ] **Step 4.** `supabase test db`; commit: `feat(construction): derive erection RFT`.

### Task 5 — Repository, domain and the select guard

- [ ] **Step 1.** `modules/construction/domain/{phase-policy,erection-stage,rft}.ts` with unit
      tests. The erection ladder and its ordinals are domain knowledge, not screen knowledge.
- [ ] **Step 2.** `supabase-erection-repository.ts` and
      **`erection-select-columns.test.ts`**. This is not optional: `supabase-js` 2.110.8 does
      not type-check `.select()` strings, and this exact gap produced the Track 05 defect that
      broke the material-check screen while typecheck, pgTAP and unit tests all passed. Copy
      the Track 06 version — it walks nested embeds, which the original did not.
- [ ] **Step 3.** `npm run verify`; commit: `feat(construction): erection read model`.

### Task 6 — Screens and the fixture

- [ ] **Step 1.** Add the `useAppMode` branch to all ten `app/erection/**` routes. In Supabase
      mode none may render a demo figure — the Track 05 close-out defect 5 was unmarked demo
      numbers on a real dashboard.
- [ ] **Step 2.** `modules/construction/ui/erection/` screens for To Site, Erected,
      Welded/Bolted, Supported, Field Material Check, Field Weld Progress, and the Field QC
      release gate view.
- [ ] **Step 3.** Every screen names its joint and spool in its tables. The Track 06 walk could
      not be written until `/nde` did this; do not repeat that.
- [ ] **Step 4.** `bootstrap:track07-browser-fixtures`: an isometric carrying **field** joints,
      an active `field` NDE matrix rule, and a site location. Model it on
      `scripts/bootstrap-track06-browser-fixtures.ts` — its own welders, its own ISO, real RPCs,
      idempotent, localhost-guarded, with a `.test.ts` pinning the fixture's invariants.
- [ ] **Step 5.** Stop using the eight erection stores in Supabase mode.
- [ ] **Step 6.** Fix the collapsed-sidebar parent routes so `/fabrication/spool-fabrication`
      and `/erection/spool-erection` either land or are correctly non-link branches.
- [ ] **Step 7.** `npm run verify`; commit: `feat(construction): erection screens on Supabase`.

### Gate D — the browser walk

- [ ] **Step 1.** Write `docs/qa/track-07-agent-walkthrough.md` and
      `docs/TRACK07_BROWSER_FIXTURES.md` in the shape of the Track 06 pair: agent contract,
      hard rules, stand preparation, fixture reference, technique notes, cases, a
      known-good-behaviour list, a report template, stop conditions.
- [ ] **Step 2.** Walk it yourself, in a browser, and **write the script from what happened**,
      not from the source. Every count and sentence in it must have been observed.
- [ ] **Step 3.** The walk must reach **RFT** on a field spool, with a rejected field weld and
      an accepted repair in the middle — the Track 06 cascade proven end-to-end on the erection
      side.
- [ ] **Step 4.** Re-walk the Track 05 golden path to `laydown` and the Track 06 NDE script.
      Track 07 changed `record_construction_progress` and `record_weld_progress`, which both
      paths depend on. **If either no longer arrives, Track 07 is not done.**
- [ ] **Step 5.** Record every defect found and fix it. Record everything consciously not
      fixed in `docs/deferred-work.md` with its trigger.
- [ ] **Step 6.** `npm run verify`; commit the report.

### Exit criteria

- Field weld uses the same Quality context as shop weld, proven by `071`.
- RFT is derived from authoritative records; no manual flag exists and `PQC55` proves it.
- Fabrication's stage refusals are unchanged after the policy refactor, proven by `070`.
- No erection store is persistence in Supabase mode.
- The Track 05 golden path and the Track 06 NDE walk both still pass in a browser.
- Assembly is absent from the UI and refused by the commands, and the roadmap no longer says
  otherwise.

---

## 7. The three things most likely to go wrong

1. **The phase-policy refactor silently changes fabrication.** `record_construction_progress`
   is on the golden path. Task 1 Step 5 exists because a test that only proves the new stages
   work would not notice.
2. **Two definitions of "outstanding NDE".** If `spool_erection_readiness` re-derives it
   instead of reusing Track 06's, a repaired field joint blocks RFT forever — the same defect
   Gate D5 found on the fabrication side, rediscovered.
3. **No `field` NDE matrix rule on the stand.** `generate_weld_obligations` raises `PQC39` and
   the first field weld fails. It reads like a command defect and is a fixture gap. Task 6
   Step 4 seeds it; Gate B checks it before any screen is written.

---

## 8. References

- `docs/superpowers/plans/2026-08-07-track-06-nde-quality.md` — the Quality contracts reused here
- `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` — the Construction contracts reused here
- `docs/architecture/construction-progress-model.md` — ledger, stages, `PQC30`–`PQC39`
- `docs/research/2026-07-30-easy-piping-documentation-dossier.md` §20 — the erection ladder,
  W-24/W-23, field material check, field weld progress and the RFT rule
- `docs/qa/track-06-agent-walkthrough.md` — the shape Gate D must produce
- `docs/deferred-work.md` — where anything left undone is recorded
