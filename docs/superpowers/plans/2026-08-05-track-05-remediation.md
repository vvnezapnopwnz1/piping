# Track 05 Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between what `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` claims was delivered and what the repository actually does — repair the broken browser-fixture bootstrap so the golden path is reproducible with one command, align the QC-13 guard and `effective_stage_date` with the plan's own decisions, wire the two dead seams (`materialize_progress_copies`, the issued QC-13 form), close the untested error branches, and make the documentation state only true things.

**Architecture:** Nothing here changes the Track 05 architecture. Every database change is a **new forward-only migration** that replaces function bodies with `create or replace`; no applied migration is edited. The fixture bootstrap gains a second half that drives the real Track 03/04 SpoolGen import as an authenticated fixture user, so the engineering definition the fabrication screens need is produced by the same code path a human would use, not by service-role inserts that bypass the revision guards.

**Tech Stack:** PostgreSQL 15 (Supabase), pgTAP, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`.

## Global Constraints

- Migrations are **forward-only**. Never edit an applied migration; add a new one. Replacing a function body with `create or replace function` in a _new_ migration is the sanctioned way to change behaviour.
- The local Supabase CLI in this repository is invoked as `/opt/homebrew/bin/supabase`.
- Every mutation stays a `SECURITY DEFINER` RPC with `set search_path = public, pg_temp`, a capability check, an `audit_events` row and an `idempotency_key`.
- Domain and application layers (`modules/construction/domain/**`, `modules/construction/application/**`) import **no** Supabase client, **no** React and **nothing** from `store/*`.
- No raw PostgREST or SQL error text reaches the UI. Everything passes through `mapSupabaseConstructionError`.
- No new error codes. Track 05 owns `PQC30`–`PQC39` and this plan adds none.
- No new capability. `fabrication.view`, `fabrication.progress.record`, `fabrication.qc.release` and `nde.result.record` were seeded by Track 01.
- Secrets are supplied out of band through environment variables and never committed.

---

## 1. Execution policy

- **Tick every checkbox as you complete it, in the plan file, and never tick one for a command you did not run.** The original Track 05 plan was executed with all 146 step boxes left unticked while its exit criteria were all ticked; that is precisely how the false fixture claim survived. Do not repeat it.
- Every RED step must actually fail and every GREEN step must actually pass. Paste-free: if a step's expected output does not match reality, **stop and report the discrepancy instead of adjusting the test to match the code.**
- Run `npm run verify` after every Gate. Run it after a fresh `/opt/homebrew/bin/supabase db reset` at Gate R5.
- Commit at the end of every task. The commit message is given in the task's last step.

## 2. What is broken, with evidence

Findings from the review of the executed Track 05 plan. Each is repaired by the task named in the last column.

| #   | Defect                                                                                                                                                                                                                                                                                                                                                                                               | Evidence                                                                                                                                                      | Task  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | `scripts/bootstrap-track05-browser-fixtures.ts` has never written a row. It upserts `name` into `project_subcontractors`, whose column is `description not null` (`20260727145210_project_settings_and_referentials.sql:145`). It dies on the first upsert with `Could not find the 'name' column of 'project_subcontractors' in the schema cache`.                                                  | Ran `bootstrap:track01..04` then Track 05 twice against a freshly reset local DB: `SUB-T5`, `WPS-T5`, `W-T5-*`, `HEAT-T5-*`, `YARD-T5`, paint rules — 0 rows. | 6     |
| 2   | Even after fixing `name`, the script would die twice more: `project_locations.category_id` is `not null` and is never supplied; `project_paint_matrix_rules` is counted by `planInsertCount` but never upserted, and needs `line_service_id`, `ral_code_id`, `blasting_required`, `primer_required`, `intermediate_coat_count`, `final_coat_count`.                                                  | `information_schema.columns` for both tables.                                                                                                                 | 6     |
| 3   | The click path in `docs/TRACK05_BROWSER_FIXTURES.md` names spool `SP-T4-01`, which does not exist. `scripts/weld.txt` produces `SP-T4-001-A` and `SP-T4-001-B`. Nothing in the Track 01–04 bootstraps creates any isometric, spool, weld joint, support or bill-of-materials line at all.                                                                                                            | `select count(*) from spools` = 0 after all four bootstraps.                                                                                                  | 7     |
| 4   | Exit criterion "The Track 05 bootstrap script writes rows and is idempotent across two consecutive runs" is ticked, and Task 26 (manual browser acceptance) is reported done, but neither could have happened — the fixtures the click path depends on do not exist.                                                                                                                                 | Defects 1–3.                                                                                                                                                  | 8, 11 |
| 5   | `request_qc13_form` is guarded by `fabrication.qc.release` (`20260804090000_fabrication_progress.sql:224`) while plan §3.14 and the plan's own migration source put it under `fabrication.progress.record`. `/fabrication/material-check` is gated by `fabrication.progress.record` (`config/route-capabilities.ts:13`), so a progress recorder reaches the **Issue QC-13** button and gets `42501`. | Both files.                                                                                                                                                   | 1     |
| 6   | `effective_stage_date` lost its `construction_phase` argument (`20260804090000_fabrication_progress.sql:155`). Plan §3.2 keeps the phase column so Track 07 parameterises the same tables; with phase absent from the lookup an `assembly` event of the same stage is indistinguishable from a `fabrication` one.                                                                                    | Same file; plan line 321.                                                                                                                                     | 2     |
| 7   | `materializeProgressCopies` (`modules/construction/infrastructure/supabase-construction-repository.ts:477`) is dead code. Nothing calls it, so the revision progress carry-over of plan §3.4 never runs in the application.                                                                                                                                                                          | Repo-wide grep: only the definition.                                                                                                                          | 4     |
| 8   | `material-check-screen.tsx` issues a QC-13 and then always sends `qc13FormId: null` (line 117), so the issued form is never attached to the material check record even though the column and its `PQC30` validation exist.                                                                                                                                                                           | Same file; `20260804091000_material_traceability.sql:99-105`.                                                                                                 | 3     |
| 9   | `PQC39` is raised in three places and asserted zero times in pgTAP. `PQC34` has twelve raise sites and two pgTAP assertions; the material-type, subcontractor, welder↔WPS-link and `approved_on` branches are covered only by the TypeScript mirror.                                                                                                                                                 | `grep -c` over `supabase/tests/database/05*.sql`.                                                                                                             | 5     |
| 10  | `docs/SUPABASE_BACKEND_FOUNDATION.md:106` and `docs/architecture/construction-progress-model.md:41` describe a view `spool_material_check_status` that exists in no migration, and the RPC list omits `materialize_progress_copies`.                                                                                                                                                                 | Repo-wide grep.                                                                                                                                               | 9     |

Two things reviewed and deliberately **not** changed:

- `spool_fabrication_readiness` counts every non-removed weld joint of the spool, not only `weld_location = 'shop'`. The plan's own view did the same. A spool carrying a field joint could never become `is_fabricated`; that is a Track 07 concern and is recorded in Task 10 as a known limitation rather than silently altered here.
- `material_check_items` has no `is_accepted` column — acceptance is expressed by `piping_material_record_id not null`. This is a deliberate improvement over the plan's schema and is correct; Task 9 documents it.

## 3. Decisions fixed by this plan

### 3.1 The QC-13 request is a progress action

`request_qc13_form` moves to `fabrication.progress.record`, matching plan §3.14 and the capability that already gates `/fabrication/material-check`. The alternative — keeping `fabrication.qc.release` and hiding the button — was rejected because it would leave the route and the command disagreeing about who may work on material check.

### 3.2 `effective_stage_date` gains a phase overload rather than losing its callers

Seven functions call the two-argument form. Dropping it would force this migration to re-create all seven bodies verbatim, which is a large and error-prone diff for no behavioural gain today. Instead:

- A new three-argument `effective_stage_date(uuid, construction_phase, construction_stage)` filters on `phase` and is the form Track 07 must use.
- The two-argument form is replaced by a thin delegate that passes `'fabrication'`, and is commented as deprecated.

This makes today's fabrication lookups phase-scoped and correct, and gives Track 07 the function it needs, without touching the seven callers.

### 3.3 The fixture bootstrap seeds the whole golden path

`bootstrap:track05-browser-fixtures` becomes self-sufficient. After reconciling referentials with the service-role client, it signs in as `track01.project-admin-a@example.test` — `project_admin` has `bypasses_functional_gate = true`, so it holds `spooling.manage`, `fabrication.*` and `nde.result.record` — and drives the real SpoolGen import through `create_spooling_import_job` → storage upload → `register_spooling_import_file` → `record_spooling_validation` → `revalidate_spooling_import_job` → `apply_spooling_import_job`, reusing the pure `buildSpoolgenSubmission` from `modules/engineering/application/import-spooling.ts`. The definition is therefore produced by the same code the browser uses, and the revision guards stay in force.

Golden-path shape after the bootstrap, derived from `scripts/weld.txt`, `scripts/supp.txt` and the new `scripts/trace.txt`:

| Object            | Value                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Isometric         | `ISO-T4-001` revision `R0`, PDS area `PDS-T4`, service class `SC-T4`                                                               |
| Golden spool      | `SP-T4-001-A`                                                                                                                      |
| Shop welds on it  | `W-T4-001`, `W-T4-002` — both `BW-T4`, 6", 8.2 mm                                                                                  |
| Support on it     | `SU-T4-001`                                                                                                                        |
| Bill of materials | `IDN-T5-100`, `IDN-T5-200` (no `TRACE_NUMBER` in the file — the heat is transcribed from the QC-13 by the operator, dossier §16.4) |
| PML evidence      | `IDN-T5-100`/`HEAT-T5-100`, `IDN-T5-200`/`HEAT-T5-200`, `IDN-T5-300`/`HEAT-T5-300`                                                 |
| NDE matrix        | `SC-T4`/`BW-T4`/`shop`, `rt_coverage = 10` → one `spot` RT obligation per joint                                                    |
| PWHT              | the same rule gets `pwht_required = true`, `pwht_thickness_threshold = 8` → 8.2 mm clears it, one requirement per joint            |

`SP-T4-001-B` (`W-T4-003`, 8", 10.3 mm, `IDN-T5-300`) is left untouched so a second spool is available for negative-path clicking.

### 3.4 Progress carry-over is triggered where the revision is accepted

`apply_spooling_import_job` returns the job with `affected_entity_ids` holding the new isometric revision ids (`20260803092000_spooling_import_apply.sql:922,1188`). `revision-workbench.tsx` calls `materializeProgressCopies` for each of them right after a successful apply. The call is best-effort: an operator with `spooling.manage` but without `fabrication.progress.record` must still see the apply succeed, so a failure is surfaced as a non-blocking toast and never turns the apply into an error.

## 4. File map

### Database

- Create: `supabase/migrations/20260805090000_track05_remediation.sql` — the QC-13 guard, the `effective_stage_date` phase overload and the deprecated delegate.
- Modify: `supabase/tests/database/050_material_traceability.test.sql` — the guard assertion, the phase overload, the behavioural progress-recorder test.
- Modify: `supabase/tests/database/051_weld_progress.test.sql` — the `PQC39` and remaining `PQC34` branches.

### Application and UI

- Modify: `modules/construction/infrastructure/supabase-construction-repository.ts` — `requestQc13Form` returns the id, new `loadLatestQc13Form`.
- Modify: `modules/construction/ui/fabrication/material-check-screen.tsx` — carry the QC-13 form id into the material check.
- Modify: `modules/engineering/ui/revision-workbench.tsx` — materialize progress copies after apply.
- Modify: `modules/construction/construction-boundaries.test.ts` — assert the two seams are wired.

### Fixtures and scripts

- Create: `scripts/trace.txt`
- Modify: `scripts/bootstrap-track05-browser-fixtures.ts`
- Modify: `scripts/bootstrap-track05-browser-fixtures.test.ts`
- Modify: `scripts/bootstrap-track04-local-fixtures.sh`

### Documentation

- Modify: `docs/TRACK05_BROWSER_FIXTURES.md`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`
- Modify: `docs/architecture/construction-progress-model.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`
- Modify: `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` — the execution addendum.

---

# Gate R1 — Database corrections

## Task 1: Move the QC-13 guard to the progress capability

**Files:**

- Create: `supabase/migrations/20260805090000_track05_remediation.sql`
- Modify: `supabase/tests/database/050_material_traceability.test.sql`

**Interfaces:**

- Consumes: `public.assert_construction_target(uuid, text)`, `public.claim_command_receipt(uuid, text, text)`, `public.complete_command_receipt(uuid, text, text, jsonb)`.
- Produces: `public.request_qc13_form(uuid, date, text)` with the guard string `'fabrication.progress.record'`. The signature and parameter names are unchanged, so no caller and no generated type changes.

- [ ] **Step 1: Write the failing pgTAP assertions.**

In `supabase/tests/database/050_material_traceability.test.sql`, change line 2 from `select plan(80);` to `select plan(83);`.

Then insert this block immediately before the final `select * from finish();` line. It is fully self-contained — its own project, isometric, spool and users — so it cannot perturb the assertions above it.

```sql
-- Remediation task 1: the QC-13 request belongs to the progress recorder.
-- A project_editor whose only functional role is fabrication_contributor holds
-- fabrication.progress.record and, through the functional gate, NOT fabrication.qc.release.
reset role;
select ok(
  position(
    $needle$assert_construction_target(target_spool_revision_id, 'fabrication.progress.record')$needle$
    in pg_get_functiondef('public.request_qc13_form(uuid, date, text)'::regprocedure)
  ) > 0,
  'the QC-13 request is guarded by fabrication.progress.record, not by the release capability'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('10000000-0000-0000-0000-000000000590', 'authenticated', 'authenticated', 'progress.only@example.test', 'not-used', now(), now(), now());
insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000590', 'P05-QC13', 'QC13 guard', 'Owner', 'Contractor', 1, '10000000-0000-0000-0000-000000000501');
insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000590', '30000000-0000-0000-0000-000000000590', '10000000-0000-0000-0000-000000000590', 'qc_engineer', 'project_editor', true);
insert into public.project_membership_functional_roles (membership_id, role_code)
values ('20000000-0000-0000-0000-000000000590', 'fabrication_contributor');
insert into public.project_pds_areas (id, project_id, code, description)
values ('31000000-0000-0000-0000-000000000590', '30000000-0000-0000-0000-000000000590', 'PDS-QC13', 'QC13 guard PDS');
insert into public.isometrics (id, project_id, iso_number)
values ('33000000-0000-0000-0000-000000000590', '30000000-0000-0000-0000-000000000590', 'ISO-QC13');
insert into public.isometric_revisions (id, isometric_id, revision_number, revision_ordinal, status, pds_area_id, accepted_at)
values ('34000000-0000-0000-0000-000000000590', '33000000-0000-0000-0000-000000000590', 'R0', 1, 'accepted', '31000000-0000-0000-0000-000000000590', now());
insert into public.spools (id, project_id, spool_number)
values ('35000000-0000-0000-0000-000000000590', '30000000-0000-0000-0000-000000000590', 'SP-QC13');
insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number)
values ('36000000-0000-0000-0000-000000000590', '35000000-0000-0000-0000-000000000590', '34000000-0000-0000-0000-000000000590', 1);
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000590', '36000000-0000-0000-0000-000000000590', 'fabrication', 'start_fab', current_date);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000590', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000590","role":"authenticated"}', true);
select is(
  public.current_user_has_capability('30000000-0000-0000-0000-000000000590', 'fabrication.qc.release'),
  false,
  'the fixture progress recorder deliberately lacks the release capability'
);
select lives_ok(
  $$select public.request_qc13_form('36000000-0000-0000-0000-000000000590', current_date, 'qc13-progress-recorder')$$,
  'a progress recorder can issue a QC-13 form'
);
reset role;
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `/opt/homebrew/bin/supabase test db 2>&1 | tail -30`

Expected: FAIL. `050` reports the `position(...) > 0` assertion false and the `lives_ok` assertion as an error whose message mentions permission / `42501`.

- [ ] **Step 3: Write the migration.**

Create `supabase/migrations/20260805090000_track05_remediation.sql`. The `request_qc13_form` body is reproduced verbatim from `20260804090000_fabrication_progress.sql:215-242` with exactly one change — the capability string.

```sql
-- Track 05 remediation.
-- 1. Plan section 3.14: issuing a QC-13 is part of recording progress, not of releasing
--    quality. /fabrication/material-check is gated by fabrication.progress.record, so the
--    command must ask for the same capability or the button is unusable by its own users.

create or replace function public.request_qc13_form(
  target_spool_revision_id uuid,
  requested_date date default current_date,
  target_idempotency_key text default null
)
returns public.qc13_progress_forms
language plpgsql security definer set search_path = public, pg_temp as $$
declare context public.spool_context; claimed jsonb; form_row public.qc13_progress_forms; next_number integer;
begin
  context := public.assert_construction_target(target_spool_revision_id, 'fabrication.progress.record');
  claimed := public.claim_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key);
  if claimed ->> 'status' = 'completed' then
    select * into form_row from jsonb_populate_record(null::public.qc13_progress_forms, claimed -> 'result' -> 'form'); return form_row;
  end if;
  if public.effective_stage_date(target_spool_revision_id, 'start_fab') is null then
    raise exception 'Fabrication must start before QC-13 is requested' using errcode = 'PQC32';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(context.project_id::text, 0));
  select count(*) + 1 into next_number from public.qc13_progress_forms where project_id = context.project_id;
  insert into public.qc13_progress_forms (project_id, spool_revision_id, form_number, requested_on, requested_by)
  values (context.project_id, target_spool_revision_id, format('QC13-%s', lpad(next_number::text, 6, '0')), coalesce(requested_date, current_date), auth.uid())
  returning * into form_row;
  insert into public.audit_events (project_id, actor_id, entity_type, entity_id, action, after_state)
  values (context.project_id, auth.uid(), 'qc13_progress_forms', form_row.id, 'request_qc13_form', to_jsonb(form_row));
  perform public.complete_command_receipt(context.project_id, 'request_qc13_form', target_idempotency_key, jsonb_build_object('form', to_jsonb(form_row)));
  return form_row;
end;
$$;

comment on function public.request_qc13_form(uuid, date, text) is
  'Issues the next QC-13 daily progress form for a spool revision. Guarded by fabrication.progress.record (plan section 3.14).';
```

- [ ] **Step 4: Apply from empty and run the suite.**

Run:

```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db 2>&1 | tail -30
```

Expected: `All tests successful.` with `Files=20, Tests=425`.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260805090000_track05_remediation.sql \
        supabase/tests/database/050_material_traceability.test.sql
git commit -m "fix(construction): guard the QC-13 request with the progress capability"
```

## Task 2: Give `effective_stage_date` its phase argument back

**Files:**

- Modify: `supabase/migrations/20260805090000_track05_remediation.sql`
- Modify: `supabase/tests/database/050_material_traceability.test.sql`

**Interfaces:**

- Produces: `public.effective_stage_date(uuid, public.construction_phase, public.construction_stage)` returning `date`, phase-scoped. The existing `public.effective_stage_date(uuid, public.construction_stage)` keeps its signature and becomes a delegate that passes `'fabrication'`; the seven Track 05 commands that call it are unchanged and become phase-scoped for free.

- [ ] **Step 1: Write the failing pgTAP assertions.**

In `supabase/tests/database/050_material_traceability.test.sql`, change `select plan(83);` to `select plan(86);`.

Add this line next to the existing `has_function` block near the top of the file, directly after the line asserting the two-argument form:

```sql
select has_function('public', 'effective_stage_date', array['uuid', 'construction_phase', 'construction_stage'], 'the phase-scoped effective stage helper exists');
```

Then append this block at the end of the file, immediately before `select * from finish();` — it reuses the self-contained project created in Task 1:

```sql
-- Remediation task 2: the stage lookup is scoped by phase, so a future assembly event
-- of the same stage cannot be mistaken for a fabrication one (plan section 3.2).
insert into public.construction_progress_events (project_id, spool_revision_id, phase, stage, occurred_on)
values ('30000000-0000-0000-0000-000000000590', '36000000-0000-0000-0000-000000000590', 'assembly', 'start_fab', date '2026-09-09');
select is(
  public.effective_stage_date('36000000-0000-0000-0000-000000000590', 'fabrication', 'start_fab'),
  current_date,
  'the fabrication lookup ignores an assembly event of the same stage'
);
select is(
  public.effective_stage_date('36000000-0000-0000-0000-000000000590', 'assembly', 'start_fab'),
  date '2026-09-09',
  'the assembly lookup finds the assembly event'
);
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `/opt/homebrew/bin/supabase test db 2>&1 | tail -30`

Expected: FAIL — `function public.effective_stage_date(unknown, unknown, unknown) does not exist`, and the `has_function` assertion reports false.

- [ ] **Step 3: Append the overload to the remediation migration.**

Append to `supabase/migrations/20260805090000_track05_remediation.sql`:

```sql
-- 2. Plan section 3.2: the phase column exists so Track 07 parameterises these tables
--    rather than cloning them. The lookup must therefore be phase-scoped. The
--    two-argument form stays as a fabrication-only delegate so the seven Track 05
--    commands that call it need no rewrite; Track 07 calls the three-argument form.

create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_phase public.construction_phase,
  target_stage public.construction_stage
)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select e.occurred_on
  from public.construction_progress_events e
  where e.spool_revision_id = target_spool_revision_id
    and e.phase = target_phase
    and e.stage = target_stage
    and e.source <> 'compensation'
    and not exists (select 1 from public.construction_progress_events c where c.compensates_event_id = e.id)
  order by e.created_at desc limit 1;
$$;

create or replace function public.effective_stage_date(
  target_spool_revision_id uuid,
  target_stage public.construction_stage
)
returns date language sql stable security definer set search_path = public, pg_temp as $$
  select public.effective_stage_date(
    target_spool_revision_id, 'fabrication'::public.construction_phase, target_stage);
$$;

comment on function public.effective_stage_date(uuid, public.construction_stage) is
  'Deprecated fabrication-only shorthand. New callers must use the three-argument, phase-scoped form.';

revoke all on function
  public.effective_stage_date(uuid, public.construction_phase, public.construction_stage)
  from public, anon;
```

- [ ] **Step 4: Apply from empty and run the suite.**

Run:

```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db 2>&1 | tail -30
```

Expected: `All tests successful.` with `Files=20, Tests=428`.

- [ ] **Step 5: Regenerate the database types and typecheck.**

Run:

```bash
/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
npm run typecheck
```

Expected: typecheck exits `0`. The generated file changes only if the new overload surfaces; either outcome is fine as long as typecheck passes.

- [ ] **Step 6: Commit.**

```bash
git add supabase/migrations/20260805090000_track05_remediation.sql \
        supabase/tests/database/050_material_traceability.test.sql \
        lib/supabase/database.types.ts
git commit -m "fix(construction): scope the effective stage lookup by construction phase"
```

### Gate R1 checklist

- [ ] `/opt/homebrew/bin/supabase db reset` succeeds from empty.
- [ ] `npm run verify` exits `0`.
- [ ] `supabase/migrations/20260805090000_track05_remediation.sql` is the only new migration and no applied migration was edited (`git diff --stat main -- supabase/migrations` shows one added file).

---

# Gate R2 — Application and UI corrections

## Task 3: Attach the issued QC-13 form to the material check

**Files:**

- Modify: `modules/construction/infrastructure/supabase-construction-repository.ts`
- Modify: `modules/construction/ui/fabrication/material-check-screen.tsx`
- Modify: `modules/construction/application/record-material-check.test.ts`

**Interfaces:**

- Produces: `requestQc13Form(client, spoolRevisionId, issuedOn, idempotencyKey)` now returns `{ id: string; formNumber: string }` instead of `string`; new `loadLatestQc13Form(client, spoolRevisionId)` returning `{ id: string; formNumber: string } | null`.
- Consumes: `toMaterialCheckPayload(draft)` unchanged — it already carries `qc13FormId`.

- [ ] **Step 1: Write the failing unit test.**

Append to `modules/construction/application/record-material-check.test.ts`:

```typescript
// The screen issues a QC-13 and must carry its id into the command, so the accepted
// traces keep the evidence they were transcribed from (dossier 16.4).
{
  const payload = toMaterialCheckPayload({
    spoolRevisionId: "spool-1",
    checkedOn: "2026-08-05",
    qc13FormId: "form-1",
    entries: [{ identCode: "IDN-1", traceNumber: "HEAT-1", quantity: 2 }],
  });
  assert.equal(payload.qc13_form_id, "form-1");
  assert.equal(payload.items.length, 1);
}
```

- [ ] **Step 2: Run it and confirm it passes already.**

Run: `node --import tsx --test modules/construction/application/record-material-check.test.ts`

Expected: PASS. `toMaterialCheckPayload` already forwards the id — the defect is that the screen never supplies one. This step exists to prove the application layer needs no change, so the fix belongs entirely in the repository and the screen.

- [ ] **Step 3: Change the repository wrapper.**

In `modules/construction/infrastructure/supabase-construction-repository.ts`, replace the whole `requestQc13Form` function with:

```typescript
export interface Qc13Form {
  id: string;
  formNumber: string;
}

export async function requestQc13Form(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  issuedOn: string,
  idempotencyKey: string,
): Promise<Qc13Form> {
  const { data, error } = await client.rpc("request_qc13_form", {
    target_spool_revision_id: spoolRevisionId,
    requested_date: issuedOn,
    target_idempotency_key: idempotencyKey,
  });
  fail(error);
  const row = required(data) as Row;
  return { id: row.id, formNumber: row.form_number };
}

/** The most recent QC-13 for a spool, so a reload does not lose the evidence link. */
export async function loadLatestQc13Form(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<Qc13Form | null> {
  const { data, error } = await client
    .from("qc13_progress_forms")
    .select("id, form_number")
    .eq("spool_revision_id", spoolRevisionId)
    .order("requested_on", { ascending: false })
    .limit(1);
  fail(error);
  const row = (data ?? [])[0] as Row | undefined;
  return row ? { id: row.id, formNumber: row.form_number } : null;
}
```

- [ ] **Step 4: Wire the screen.**

In `modules/construction/ui/fabrication/material-check-screen.tsx`:

Add `loadLatestQc13Form` to the import list from `../../infrastructure/supabase-construction-repository` that already contains `requestQc13Form`.

Add the state declaration next to the other `useState` calls:

```tsx
const [qc13Form, setQc13Form] = useState<{
  id: string;
  formNumber: string;
} | null>(null);
```

Inside the existing `useEffect` that reloads the spool's bill of materials and checked items when `spool` or `refreshToken` changes, add the form lookup so a reload keeps the link:

```tsx
void (async () => {
  setQc13Form(
    spool
      ? await loadLatestQc13Form(
          getSupabaseBrowserClient(),
          spool.spoolRevisionId,
        )
      : null,
  );
})();
```

Replace the body of `issueQc13` with:

```tsx
const issueQc13 = async () => {
  if (!spool) return;
  try {
    const form = await requestQc13Form(
      getSupabaseBrowserClient(),
      spool.spoolRevisionId,
      checkedOn,
      crypto.randomUUID(),
    );
    setQc13Form(form);
    toast.success(`QC-13 ${form.formNumber} issued.`);
  } catch (error: unknown) {
    toast.error(
      error instanceof Error ? error.message : "The QC-13 could not be issued.",
    );
  }
};
```

In `save`, replace `qc13FormId: null,` with:

```tsx
          qc13FormId: qc13Form?.id ?? null,
```

- [ ] **Step 5: Typecheck and run the unit suite.**

Run: `npm run typecheck && npm run test:unit`

Expected: both exit `0`, `pass 74` or more.

- [ ] **Step 6: Commit.**

```bash
git add modules/construction/infrastructure/supabase-construction-repository.ts \
        modules/construction/ui/fabrication/material-check-screen.tsx \
        modules/construction/application/record-material-check.test.ts
git commit -m "fix(construction): carry the issued QC-13 form into the material check"
```

## Task 4: Materialize progress copies when a revision is applied

**Files:**

- Modify: `modules/engineering/ui/revision-workbench.tsx`
- Modify: `modules/construction/construction-boundaries.test.ts`

**Interfaces:**

- Consumes: `materializeProgressCopies(client, isometricRevisionId)` from `@/modules/construction/infrastructure/supabase-construction-repository`, and `ImportJob.affectedEntityIds` from `applySpoolingImportJob`.
- Produces: no new exports. The carry-over authorized by `revision_progress_copies` is materialized in the application, not only in pgTAP.

- [ ] **Step 1: Write the failing boundary assertion.**

Append to `modules/construction/construction-boundaries.test.ts`:

```typescript
// Plan section 3.4: accepting a revision authorizes a progress carry-over; something has
// to materialize it. Until the workbench calls the command, the seam is dead code.
{
  const workbench = readFileSync(
    "modules/engineering/ui/revision-workbench.tsx",
    "utf8",
  );
  assert.ok(
    workbench.includes("materializeProgressCopies"),
    "revision-workbench.tsx must materialize progress copies after applying an import",
  );
  assert.ok(
    workbench.includes("affectedEntityIds"),
    "revision-workbench.tsx must materialize the revisions the applied job reports",
  );
}
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/construction/construction-boundaries.test.ts`

Expected: FAIL — `revision-workbench.tsx must materialize progress copies after applying an import`.

- [ ] **Step 3: Wire the workbench.**

In `modules/engineering/ui/revision-workbench.tsx`, add the import:

```tsx
import { materializeProgressCopies } from "@/modules/construction/infrastructure/supabase-construction-repository";
```

Then, inside `apply`, replace the two lines

```tsx
setStatus(job.status);
toast.success(`Applied ${job.appliedRowCount} definition rows.`);
```

with

```tsx
setStatus(job.status);
toast.success(`Applied ${job.appliedRowCount} definition rows.`);
// Plan section 3.4: the apply authorizes a carry-over, it does not perform it. The
// command is idempotent, so a retry is harmless. An operator who may import but may
// not record fabrication progress still gets a successful apply.
try {
  let copied = 0;
  for (const revisionId of job.affectedEntityIds) {
    copied += await materializeProgressCopies(
      getSupabaseBrowserClient(),
      revisionId,
    );
  }
  if (copied > 0) toast.success(`Carried ${copied} progress records forward.`);
} catch (carryError) {
  toast.warning(
    carryError instanceof Error
      ? `Progress carry-over was not applied: ${carryError.message}`
      : "Progress carry-over was not applied.",
  );
}
```

- [ ] **Step 4: Run the boundary test and the typecheck.**

Run: `node --import tsx --test modules/construction/construction-boundaries.test.ts && npm run typecheck`

Expected: PASS, then typecheck exits `0`.

- [ ] **Step 5: Commit.**

```bash
git add modules/engineering/ui/revision-workbench.tsx \
        modules/construction/construction-boundaries.test.ts
git commit -m "fix(engineering): materialize authorized progress copies after an apply"
```

### Gate R2 checklist

- [ ] `npm run verify` exits `0`.
- [ ] `grep -rn "qc13FormId: null" modules/construction` returns nothing.
- [ ] `materializeProgressCopies` has at least one caller outside its own definition.

---

# Gate R3 — Close the untested error branches

## Task 5: Cover `PQC39` and the remaining `PQC34` branches

**Files:**

- Modify: `supabase/tests/database/051_weld_progress.test.sql`

**Interfaces:**

- Consumes: `public.record_weld_progress(uuid, uuid, uuid, jsonb, jsonb, text)`, `public.generate_weld_obligations(public.weld_context)`.
- Produces: no schema change. Four new assertions.

**Fixture ids already in `051`** — read them once with `sed -n '1,100p' supabase/tests/database/051_weld_progress.test.sql` to confirm before you rely on them:

| Object                                                   | Id                                     |
| -------------------------------------------------------- | -------------------------------------- |
| project `WLD-A`                                          | `30000000-0000-0000-0000-000000000511` |
| recorder user (project_admin)                            | `10000000-0000-0000-0000-000000000512` |
| subcontractor `SUB-1`                                    | `50000000-0000-0000-0000-000000000511` |
| WPS `WPS-1`                                              | `56000000-0000-0000-0000-000000000511` |
| welders `W-1`, `W-2`                                     | `57000000-…-511`, `57000000-…-512`     |
| spool revision (`material_class = 'A1'`)                 | `43000000-0000-0000-0000-000000000511` |
| weld type `52000000-…-511`, matrix rule `58000000-…-511` | shop, RT 100 %, UT 10 %, PWHT ≥ 10 mm  |

The existing joint `47000000-…-511` is **locked** by the end of the file, so these tests use a
new third joint on the same spool revision.

- [ ] **Step 1: Write the failing assertions.**

Change `select plan(30);` on line 2 to `select plan(34);`.

Append this block immediately before `select * from finish();`:

```sql
-- Remediation task 5: PQC39 and the PQC34 branches the TypeScript mirror covers but the
-- authoritative SQL copy did not. A fresh joint, because W-0511-01 is locked by now.
reset role;
insert into public.weld_joints (id, project_id, weld_number)
values ('46000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511', 'W-0511-03');
insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values ('47000000-0000-0000-0000-000000000513', '46000000-0000-0000-0000-000000000513',
        '43000000-0000-0000-0000-000000000511', '52000000-0000-0000-0000-000000000511',
        'shop', 6, 12);
insert into public.weld_points (id, weld_joint_revision_id, point_type, sequence_number)
values
  ('48000000-0000-0000-0000-000000000515', '47000000-0000-0000-0000-000000000513', 'root', 1),
  ('48000000-0000-0000-0000-000000000516', '47000000-0000-0000-0000-000000000513', 'cap', 2);
insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000513', '30000000-0000-0000-0000-000000000511',
        'SUB-OTHER', 'Another fabricator');

-- A WPS approved after the weld date is refused (dossier 11.6).
update public.project_welding_procedures set approved_on = date '2030-01-01'
where id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a WPS approved after the weld date is refused');
reset role;
update public.project_welding_procedures set approved_on = date '2026-01-01'
where id = '56000000-0000-0000-0000-000000000511';

-- A WPS qualified for a different subcontractor is refused (dossier 11.6).
update public.project_welding_procedures
set subcontractor_id = '50000000-0000-0000-0000-000000000513'
where id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a WPS qualified for another subcontractor is refused');
reset role;
update public.project_welding_procedures
set subcontractor_id = '50000000-0000-0000-0000-000000000511'
where id = '56000000-0000-0000-0000-000000000511';

-- A welder with no welder_wps_qualifications row for this WPS is refused (dossier 11.7).
delete from public.welder_wps_qualifications
where welder_qualification_id = '57000000-0000-0000-0000-000000000512'
  and wps_id = '56000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC34', null, 'a welder not linked to the WPS is refused');
reset role;
insert into public.welder_wps_qualifications (welder_qualification_id, wps_id)
values ('57000000-0000-0000-0000-000000000512', '56000000-0000-0000-0000-000000000511');

-- PQC39: the matrix rule was archived after the definition was imported, so obligation
-- generation has nothing to key on.
update public.nde_matrix_rules set status = 'archived'
where id = '58000000-0000-0000-0000-000000000511';
set local role authenticated;
select throws_ok(
  $$select public.record_weld_progress(
      '47000000-0000-0000-0000-000000000513',
      '50000000-0000-0000-0000-000000000511',
      '56000000-0000-0000-0000-000000000511',
      '[{"point_type":"root","welder_qualification_id":"57000000-0000-0000-0000-000000000511",
         "completion_percent":50,"welded_on":"2026-08-05"},
        {"point_type":"cap","welder_qualification_id":"57000000-0000-0000-0000-000000000512",
         "completion_percent":50,"welded_on":"2026-08-05"}]'::jsonb,
      '{"weld_on":"2026-08-05"}'::jsonb)$$,
  'PQC39', null, 'an archived NDE matrix rule is reported as a missing referential');
reset role;
update public.nde_matrix_rules set status = 'active'
where id = '58000000-0000-0000-0000-000000000511';
```

The `set local role authenticated;` lines need no `set_config` call — line 101 of the file
already pinned the JWT claims to `10000000-…-512` for the whole transaction, and `reset
role` does not clear them.

- [ ] **Step 2: Run it.**

Run: `/opt/homebrew/bin/supabase test db 2>&1 | tail -30`

Expected: `All tests successful.` with `Files=20, Tests=432`. All four branches already
exist in `record_weld_progress`, so no migration change is needed. If any of them does
**not** raise the expected code, stop and report — that is a genuine behavioural defect,
not a test to adjust. In particular, if the archived-rule case raises `PQC34` rather than
`PQC39`, the material-class mapping is being consulted first and the plan's §3.8 ordering
is wrong.

- [ ] **Step 3: Commit.**

```bash
git add supabase/tests/database/051_weld_progress.test.sql
git commit -m "test(construction): cover the WPS, welder-link and missing-referential refusals"
```

### Gate R3 checklist

- [ ] `npm run verify` exits `0`.
- [ ] `grep -o PQC39 supabase/tests/database/05*.sql | wc -l` is at least 1.
- [ ] `grep -o PQC34 supabase/tests/database/05*.sql | wc -l` is at least 5.

---

# Gate R4 — Fixtures that actually seed the golden path

## Task 6: Repair the referential half of the bootstrap

**Files:**

- Modify: `scripts/bootstrap-track05-browser-fixtures.ts`
- Modify: `scripts/bootstrap-track05-browser-fixtures.test.ts`

**Interfaces:**

- Produces: `buildTrack05FixturePlan(projectId, subcontractorId, materialTypeId, wpsId, locationCategoryId, lineServiceId, ralCodeId)` returning `Track05FixturePlan` with the new `locationCategories`, `lineServices`, `ralCodes` collections and corrected column names; `planInsertCount(plan)` counting every collection the script actually writes.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test.**

Replace the contents of `scripts/bootstrap-track05-browser-fixtures.test.ts` with:

```typescript
import assert from "node:assert/strict";

import {
  buildTrack05FixturePlan,
  isLocalhost,
  planInsertCount,
} from "./bootstrap-track05-browser-fixtures";

assert.equal(isLocalhost("http://127.0.0.1:54321"), true);
assert.equal(isLocalhost("https://abc.supabase.co"), false);

const plan = buildTrack05FixturePlan(
  "project-1",
  "sub-1",
  "mt-1",
  "wps-1",
  "cat-1",
  "ls-1",
  "ral-1",
);

// Every column named here must exist in the schema. The first version of this script
// wrote `name` into project_subcontractors, whose column is `description not null`, and
// never wrote a single row as a result.
assert.ok(
  plan.subcontractors.every((row) => typeof row.description === "string"),
);
assert.ok(plan.subcontractors.some((row) => row.code === "SUB-T5"));
assert.ok(!("name" in plan.subcontractors[0]));

assert.ok(
  plan.weldingProcedures.every((row) => row.diameter_to >= row.diameter_from),
);
assert.ok(
  plan.weldingProcedures.every((row) => row.thickness_to >= row.thickness_from),
);

// Two welders, because a joint's second point needs a different one.
assert.equal(plan.welders.length, 2);
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"));
assert.equal(plan.welderWpsLinks.length, 2);

// The PML must cover every ident code scripts/trace.txt imports.
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-100"));
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-200"));
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-300"));
assert.ok(plan.pmlRecords.every((row) => row.trace_number.startsWith("HEAT-")));

// project_locations.category_id is not null, so the category must be seeded first.
assert.equal(plan.locationCategories.length, 1);
assert.ok(plan.locations.every((row) => row.category_id === "cat-1"));

// project_paint_matrix_rules has six further not-null columns beyond the DFT.
assert.equal(plan.lineServices.length, 1);
assert.ok(plan.ralCodes.every((row) => row.line_service_id === "ls-1"));
assert.ok(
  plan.paintMatrixRules.every(
    (row) =>
      row.line_service_id === "ls-1" &&
      row.ral_code_id === "ral-1" &&
      typeof row.blasting_required === "boolean" &&
      typeof row.primer_required === "boolean" &&
      row.intermediate_coat_count >= 0 &&
      row.final_coat_count >= 1 &&
      row.required_final_dft_microns > 0,
  ),
);

// planInsertCount must count only what the script writes, so the log line is honest.
// 1 subcontractor + 1 WPS + 2 welders + 2 links + 3 PML + 1 category + 1 location
// + 1 line service + 1 RAL + 1 paint rule = 14.
assert.equal(planInsertCount(plan), 14);
```

- [ ] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test scripts/bootstrap-track05-browser-fixtures.test.ts`

Expected: FAIL — `buildTrack05FixturePlan` takes four parameters and the plan has no `locationCategories`, `lineServices` or `ralCodes`.

- [ ] **Step 3: Rewrite the builder.**

In `scripts/bootstrap-track05-browser-fixtures.ts`, replace the `Track05FixturePlan` interface, `buildTrack05FixturePlan` and `planInsertCount` with:

```typescript
export interface Track05FixturePlan {
  subcontractors: { project_id: string; code: string; description: string }[];
  weldingProcedures: {
    project_id: string;
    subcontractor_id: string;
    material_type_id: string;
    code: string;
    process: string;
    diameter_from: number;
    diameter_to: number;
    thickness_from: number;
    thickness_to: number;
    revision: string;
    approved_on: string;
  }[];
  welders: {
    project_id: string;
    subcontractor_id: string;
    welder_code: string;
    full_name: string;
    expires_on: string;
  }[];
  welderWpsLinks: { welder_code: string; wps_id: string }[];
  pmlRecords: {
    project_id: string;
    mrr_number: string;
    ident_code: string;
    trace_number: string;
  }[];
  locationCategories: {
    project_id: string;
    code: string;
    description: string;
  }[];
  locations: {
    project_id: string;
    category_id: string;
    code: string;
    description: string;
  }[];
  lineServices: { project_id: string; code: string; description: string }[];
  ralCodes: {
    project_id: string;
    line_service_id: string;
    color_code: string;
    ral_code: string;
  }[];
  paintMatrixRules: {
    project_id: string;
    line_service_id: string;
    ral_code_id: string;
    blasting_required: boolean;
    primer_required: boolean;
    intermediate_coat_count: number;
    final_coat_count: number;
    required_final_dft_microns: number;
  }[];
}

/**
 * The referentials a Track 05 walkthrough needs on top of the Track 01-04 fixtures.
 * `materialTypeId` is the system reference entry the WPS is qualified for. The four
 * remaining ids are resolved by `run()` after their parent rows exist, because
 * project_locations.category_id and project_paint_matrix_rules.{line_service_id,
 * ral_code_id} are all not-null foreign keys.
 */
export function buildTrack05FixturePlan(
  projectId: string,
  subcontractorId: string,
  materialTypeId: string,
  wpsId: string,
  locationCategoryId: string,
  lineServiceId: string,
  ralCodeId: string,
): Track05FixturePlan {
  return {
    subcontractors: [
      {
        project_id: projectId,
        code: "SUB-T5",
        description: "Track 05 fabricator",
      },
    ],
    weldingProcedures: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        material_type_id: materialTypeId,
        code: "WPS-T5",
        process: "GTAW",
        diameter_from: 1,
        diameter_to: 24,
        thickness_from: 2,
        thickness_to: 30,
        revision: "R0",
        approved_on: "2026-01-01",
      },
    ],
    welders: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-1",
        full_name: "Track 05 welder one",
        expires_on: "2028-01-01",
      },
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-2",
        full_name: "Track 05 welder two",
        expires_on: "2028-01-01",
      },
    ],
    welderWpsLinks: [
      { welder_code: "W-T5-1", wps_id: wpsId },
      { welder_code: "W-T5-2", wps_id: wpsId },
    ],
    pmlRecords: [
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-100",
        trace_number: "HEAT-T5-100",
      },
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-200",
        trace_number: "HEAT-T5-200",
      },
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-300",
        trace_number: "HEAT-T5-300",
      },
    ],
    locationCategories: [
      {
        project_id: projectId,
        code: "CAT-T5",
        description: "Track 05 laydown areas",
      },
    ],
    locations: [
      {
        project_id: projectId,
        category_id: locationCategoryId,
        code: "YARD-T5",
        description: "Track 05 laydown yard",
      },
    ],
    lineServices: [
      {
        project_id: projectId,
        code: "LS-T5",
        description: "Track 05 line service",
      },
    ],
    ralCodes: [
      {
        project_id: projectId,
        line_service_id: lineServiceId,
        color_code: "SILVER",
        ral_code: "RAL 9006",
      },
    ],
    paintMatrixRules: [
      {
        project_id: projectId,
        line_service_id: lineServiceId,
        ral_code_id: ralCodeId,
        blasting_required: true,
        primer_required: true,
        intermediate_coat_count: 1,
        final_coat_count: 1,
        required_final_dft_microns: 240,
      },
    ],
  };
}

export const planInsertCount = (plan: Track05FixturePlan): number =>
  plan.subcontractors.length +
  plan.weldingProcedures.length +
  plan.welders.length +
  plan.welderWpsLinks.length +
  plan.pmlRecords.length +
  plan.locationCategories.length +
  plan.locations.length +
  plan.lineServices.length +
  plan.ralCodes.length +
  plan.paintMatrixRules.length;
```

- [ ] **Step 4: Rewrite the referential half of `run()`.**

In the same file, replace everything from `const seed = buildTrack05FixturePlan(` up to and including the `if (links.error) throw new Error(links.error.message)` line with:

```typescript
const empty = buildTrack05FixturePlan(
  project.id,
  "",
  material.id,
  "",
  "",
  "",
  "",
);

const firstWave = await Promise.all([
  client
    .from("project_subcontractors")
    .upsert(empty.subcontractors, { onConflict: "project_id,code" }),
  client
    .from("project_location_categories")
    .upsert(empty.locationCategories, { onConflict: "project_id,code" }),
  client
    .from("project_line_services")
    .upsert(empty.lineServices, { onConflict: "project_id,code" }),
  client
    .from("piping_material_records")
    .upsert(empty.pmlRecords, {
      onConflict: "project_id,ident_code,trace_number",
    }),
]);
for (const result of firstWave)
  if (result.error) throw new Error(result.error.message);

// The table name is a literal union rather than `string`, otherwise the generated
// Database types cannot resolve `.from()` and typecheck fails.
type CodedTable =
  | "project_subcontractors"
  | "project_location_categories"
  | "project_line_services"
  | "project_welding_procedures";
const idOf = async (table: CodedTable, code: string): Promise<string> => {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("project_id", project.id)
    .eq("code", code)
    .single();
  if (error)
    throw new Error(
      `${table} fixture ${code} was not written: ${error.message}`,
    );
  return (data as { id: string }).id;
};

const subcontractorId = await idOf("project_subcontractors", "SUB-T5");
const categoryId = await idOf("project_location_categories", "CAT-T5");
const lineServiceId = await idOf("project_line_services", "LS-T5");

const second = buildTrack05FixturePlan(
  project.id,
  subcontractorId,
  material.id,
  "",
  categoryId,
  lineServiceId,
  "",
);
const secondWave = await Promise.all([
  client
    .from("project_locations")
    .upsert(second.locations, { onConflict: "project_id,code" }),
  client
    .from("project_ral_codes")
    .upsert(second.ralCodes, { onConflict: "project_id,line_service_id" }),
  client
    .from("project_welding_procedures")
    .upsert(second.weldingProcedures, {
      onConflict: "project_id,code,revision",
    }),
  client
    .from("welder_qualifications")
    .upsert(second.welders, { onConflict: "project_id,welder_code" }),
]);
for (const result of secondWave)
  if (result.error) throw new Error(result.error.message);

const { data: ralRow, error: ralError } = await client
  .from("project_ral_codes")
  .select("id")
  .eq("project_id", project.id)
  .eq("ral_code", "RAL 9006")
  .single();
if (ralError)
  throw new Error(`The RAL fixture was not written: ${ralError.message}`);
const wpsId = await idOf("project_welding_procedures", "WPS-T5");

const full = buildTrack05FixturePlan(
  project.id,
  subcontractorId,
  material.id,
  wpsId,
  categoryId,
  lineServiceId,
  (ralRow as { id: string }).id,
);
const paint = await client
  .from("project_paint_matrix_rules")
  .upsert(full.paintMatrixRules, { onConflict: "project_id,line_service_id" });
if (paint.error) throw new Error(paint.error.message);

const { data: welderRows, error: welderError } = await client
  .from("welder_qualifications")
  .select("id, welder_code")
  .eq("project_id", project.id)
  .in("welder_code", ["W-T5-1", "W-T5-2"]);
if (welderError || !welderRows)
  throw new Error("The welder fixtures were not written.");

const links = await client.from("welder_wps_qualifications").upsert(
  welderRows.map((welder) => ({
    welder_qualification_id: welder.id,
    wps_id: wpsId,
  })),
  { onConflict: "welder_qualification_id,wps_id" },
);
if (links.error) throw new Error(links.error.message);

// Track 04 seeds the matrix rule with rt_coverage 10 and pwht_required false, which
// makes the PWHT half of the golden path unreachable. 8.2 mm joints clear an 8 mm
// threshold, so one PWHT requirement is generated per shop joint.
const matrix = await client
  .from("nde_matrix_rules")
  .update({ pwht_required: true, pwht_thickness_threshold: 8 })
  .eq("project_id", project.id);
if (matrix.error) throw new Error(matrix.error.message);
```

Finally replace the closing log line with:

```typescript
console.log(
  `Track 05 referentials reconciled: ${planInsertCount(full)} rows upserted into project ${project.id}.`,
);
```

- [ ] **Step 5: Run the unit test, then the script twice, and verify the rows exist.**

Run:

```bash
node --import tsx --test scripts/bootstrap-track05-browser-fixtures.test.ts
```

Expected: PASS.

Then, with a running local Supabase and the local secrets exported out of band:

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY='<from supabase status>'
export TRACK01_FIXTURE_PASSWORD='<12+ characters of your choosing>'
npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track02-browser-fixtures
npm run bootstrap:track03-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track05-browser-fixtures && npm run bootstrap:track05-browser-fixtures
```

Expected: both Track 05 runs print the same `Track 05 referentials reconciled: 14 rows ...` line and exit `0`.

The two upserts whose unique key is only `(project_id, line_service_id)` — `project_ral_codes` and `project_paint_matrix_rules` — must use exactly that `onConflict` string. Naming `ral_code` or `ral_code_id` in it produces `there is no unique or exclusion constraint matching the ON CONFLICT specification` on the second run.

Then prove it wrote rows:

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select (select count(*) from project_subcontractors where code='SUB-T5') sub,
       (select count(*) from project_welding_procedures where code='WPS-T5') wps,
       (select count(*) from welder_qualifications where welder_code like 'W-T5-%') welders,
       (select count(*) from welder_wps_qualifications) links,
       (select count(*) from piping_material_records where trace_number like 'HEAT-T5-%') pml,
       (select count(*) from project_locations where code='YARD-T5') loc,
       (select count(*) from project_paint_matrix_rules) paint,
       (select count(*) from nde_matrix_rules where pwht_required) pwht;"
```

Expected: `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`. Anything else means the task is not done — do not proceed.

- [ ] **Step 6: Commit.**

```bash
git add scripts/bootstrap-track05-browser-fixtures.ts \
        scripts/bootstrap-track05-browser-fixtures.test.ts
git commit -m "fix(construction): make the Track 05 referential fixtures writable"
```

## Task 7: Seed the engineering definition the fabrication screens need

**Files:**

- Create: `scripts/trace.txt`
- Modify: `scripts/bootstrap-track05-browser-fixtures.ts`
- Modify: `scripts/bootstrap-track04-local-fixtures.sh`

**Interfaces:**

- Consumes: `buildSpoolgenSubmission(files)` from `@/modules/engineering/application/import-spooling`; the RPCs `create_spooling_import_job`, `register_spooling_import_file`, `record_spooling_validation`, `revalidate_spooling_import_job`, `apply_spooling_import_job`; the storage bucket `project-spooling` with path `${projectId}/${jobId}/${role}.txt`.
- Produces: an exported `seedEngineeringDefinition(url, publishableKey, password, projectId)` returning `{ appliedRowCount: number; skipped: boolean }`. It returns `skipped: true` without doing anything when `ISO-T4-001` already has an accepted revision, which is what makes the whole script idempotent.

- [ ] **Step 1: Create the material file.**

Create `scripts/trace.txt` with tab-separated columns. `TRACE_NUMBER` is deliberately absent: dossier §16.4 has the heat number transcribed from a returned QC-13 by the operator, so leaving the bill of materials without a trace is what makes the material check screen meaningful.

```text
ISO_NUMBER	SPOOL_NUMBER	IDENT_CODE	DESCRIPTION	QUANTITY	UNIT
ISO-T4-001	SP-T4-001-A	IDN-T5-100	Pipe 6in SCH40	2	EA
ISO-T4-001	SP-T4-001-A	IDN-T5-200	Elbow 6in 90deg	1	EA
ISO-T4-001	SP-T4-001-B	IDN-T5-300	Pipe 8in SCH40	1	EA
```

- [ ] **Step 2: Add the definition seeder.**

Append to `scripts/bootstrap-track05-browser-fixtures.ts`:

First add these three imports to the file's existing import block at the top — import
declarations must stay at the top level and the file already imports `createClient`:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildSpoolgenSubmission } from "../modules/engineering/application/import-spooling";
```

Then append the rest to the end of the file:

```typescript
const FIXTURE_OPERATOR = "track01.project-admin-a@example.test";
const SPOOLING_BUCKET = "project-spooling";

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Drives the real SpoolGen import as the fixture project admin, so the isometric, spool,
 * weld joints, weld points, supports and bill of materials are produced by the same code
 * path the browser uses and the revision guards stay in force. project_admin has
 * bypasses_functional_gate, so it holds spooling.manage without a functional role.
 */
export async function seedEngineeringDefinition(
  url: string,
  publishableKey: string,
  password: string,
  projectId: string,
): Promise<{ appliedRowCount: number; skipped: boolean }> {
  const operator = createClient(url, publishableKey);
  const auth = await operator.auth.signInWithPassword({
    email: FIXTURE_OPERATOR,
    password,
  });
  if (auth.error) {
    throw new Error(
      `Could not sign in as ${FIXTURE_OPERATOR}: ${auth.error.message}. Run the Track 01 bootstrap with the same TRACK01_FIXTURE_PASSWORD first.`,
    );
  }

  const { data: existing } = await operator
    .from("isometrics")
    .select("id, isometric_revisions(status)")
    .eq("project_id", projectId)
    .eq("iso_number", "ISO-T4-001")
    .maybeSingle();
  const alreadyAccepted = ((existing as any)?.isometric_revisions ?? []).some(
    (revision: { status: string }) => revision.status === "accepted",
  );
  if (alreadyAccepted) {
    await operator.auth.signOut();
    return { appliedRowCount: 0, skipped: true };
  }

  const files = {
    weld: readFileSync(join(__dirname, "weld.txt"), "utf8"),
    trace: readFileSync(join(__dirname, "trace.txt"), "utf8"),
    supp: readFileSync(join(__dirname, "supp.txt"), "utf8"),
  };

  const submission = buildSpoolgenSubmission(files);
  if (submission.summary.blockerCount > 0) {
    throw new Error(
      `The SpoolGen fixture files produced ${submission.summary.blockerCount} blockers: ` +
        submission.issues
          .filter((issue) => issue.severity === "blocker")
          .map((issue) => `${issue.code} ${issue.message}`)
          .join("; "),
    );
  }

  const job = await operator.rpc("create_spooling_import_job", {
    target_project_id: projectId,
    job_comment: "Track 05 fixture bootstrap",
  });
  if (job.error) throw new Error(job.error.message);
  const jobId = (job.data as { id: string }).id;

  for (const role of ["weld", "trace", "supp"] as const) {
    const text = files[role];
    const objectPath = `${projectId}/${jobId}/${role}.txt`;
    const upload = await operator.storage
      .from(SPOOLING_BUCKET)
      .upload(objectPath, new Blob([text], { type: "text/plain" }), {
        upsert: true,
        contentType: "text/plain",
      });
    if (upload.error) throw new Error(upload.error.message);
    const register = await operator.rpc("register_spooling_import_file", {
      target_job_id: jobId,
      role,
      file_name: `${role}.txt`,
      media_type: "text/plain",
      size_bytes: new TextEncoder().encode(text).length,
      checksum: await sha256Hex(text),
      object_path: objectPath,
    });
    if (register.error) throw new Error(register.error.message);
  }

  const validation = await operator.rpc("record_spooling_validation", {
    target_job_id: jobId,
    parsed_rows: submission.rows.map((row) => ({
      row_number: row.rowNumber,
      raw_values: row.rawValues,
      normalized_values: row.normalizedValues,
      action: row.action,
    })),
    parsed_issues: submission.issues.map((issue) => ({
      row_number: issue.rowNumber,
      column_name: issue.columnName,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
    })),
  });
  if (validation.error) throw new Error(validation.error.message);

  const revalidated = await operator.rpc("revalidate_spooling_import_job", {
    target_job_id: jobId,
  });
  if (revalidated.error) throw new Error(revalidated.error.message);
  const counts = (revalidated.data as { blocker_count: number }[] | null)?.[0];
  if ((counts?.blocker_count ?? 0) > 0) {
    throw new Error(
      `The server revalidation reported ${counts?.blocker_count} blockers.`,
    );
  }

  const applied = await operator.rpc("apply_spooling_import_job", {
    target_job_id: jobId,
  });
  if (applied.error) throw new Error(applied.error.message);
  await operator.auth.signOut();
  return {
    appliedRowCount: (applied.data as { applied_row_count: number })
      .applied_row_count,
    skipped: false,
  };
}
```

- [ ] **Step 3: Call it from `run()`.**

At the top of `run()`, after the existing `key` guard, add the two new environment reads:

```typescript
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const fixturePassword = process.env.TRACK01_FIXTURE_PASSWORD ?? "";
if (!publishableKey) {
  throw new Error(
    "SUPABASE_PUBLISHABLE_KEY is required so the fixture operator can drive the SpoolGen import.",
  );
}
if (!fixturePassword) {
  throw new Error(
    "TRACK01_FIXTURE_PASSWORD is required and must match the value used by the Track 01 bootstrap.",
  );
}
```

Then, immediately before the final `console.log`, add:

```typescript
const definition = await seedEngineeringDefinition(
  url,
  publishableKey,
  fixturePassword,
  project.id,
);
console.log(
  definition.skipped
    ? "Engineering definition ISO-T4-001 already has an accepted revision; nothing to import."
    : `Engineering definition imported: ${definition.appliedRowCount} rows applied to ISO-T4-001.`,
);
```

- [ ] **Step 4: Extend the local convenience script.**

In `scripts/bootstrap-track04-local-fixtures.sh`, replace the trailing block

```bash
npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track03-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track04-browser-fixtures
```

with

```bash
if [[ -z "${SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  read -rs "SUPABASE_PUBLISHABLE_KEY?Paste the local publishable key from 'supabase status': "
  echo
  export SUPABASE_PUBLISHABLE_KEY
fi

npm run bootstrap:track01-browser-fixtures
npm run bootstrap:track02-browser-fixtures
npm run bootstrap:track03-browser-fixtures
npm run bootstrap:track04-browser-fixtures
npm run bootstrap:track05-browser-fixtures
```

Rename the file's leading comment, if any, so it no longer claims to be Track 04 only. Leave the filename as it is — other docs reference it.

- [ ] **Step 5: Run the whole chain twice from an empty database.**

Run:

```bash
/opt/homebrew/bin/supabase db reset
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY='<from supabase status>'
export SUPABASE_PUBLISHABLE_KEY='<from supabase status>'
export TRACK01_FIXTURE_PASSWORD='<12+ characters>'
for t in 01 02 03 04 05; do npm run bootstrap:track${t}-browser-fixtures; done
npm run bootstrap:track05-browser-fixtures
```

Expected: every command exits `0`. The first Track 05 run prints `Engineering definition imported: ... rows applied`; the second prints `already has an accepted revision; nothing to import.`

Then prove the golden path exists:

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select s.spool_number,
       (select count(*) from weld_joint_revisions w where w.spool_revision_id = sr.id and not w.is_removed) welds,
       (select count(*) from weld_points p join weld_joint_revisions w on w.id = p.weld_joint_revision_id where w.spool_revision_id = sr.id) points,
       (select count(*) from support_revisions su where su.spool_revision_id = sr.id and not su.is_removed) supports,
       (select count(*) from spool_revision_materials m where m.spool_revision_id = sr.id) bom
from spool_revisions sr join spools s on s.id = sr.spool_id
join isometric_revisions r on r.id = sr.isometric_revision_id
where r.status = 'accepted' order by s.spool_number;"
```

Expected: `SP-T4-001-A | 2 | 4 | 1 | 2` and `SP-T4-001-B | 1 | 2 | 0 | 1`. If `points` is 0 the SpoolGen apply did not seed root/cap; stop and report.

- [ ] **Step 6: Commit.**

```bash
git add scripts/trace.txt scripts/bootstrap-track05-browser-fixtures.ts \
        scripts/bootstrap-track04-local-fixtures.sh
git commit -m "test(construction): seed the Track 05 golden path through the real import"
```

## Task 8: Rewrite the fixture runbook against reality

**Files:**

- Modify: `docs/TRACK05_BROWSER_FIXTURES.md`

**Interfaces:**

- Produces: a runbook whose every identifier exists in the database after Task 7.

- [ ] **Step 1: Replace the file.**

Replace `docs/TRACK05_BROWSER_FIXTURES.md` with:

````markdown
# Track 05 Browser Fixtures Runbook

## Overview

`npm run bootstrap:track05-browser-fixtures` reconciles every referential a Track 05
walkthrough needs into the local `TRACK01-A` project **and** imports the engineering
definition the fabrication screens operate on. It is idempotent: the referentials are
upserted, and the SpoolGen import is skipped once `ISO-T4-001` has an accepted revision.

### Prerequisites

Run the previous track bootstraps in order, with the same `TRACK01_FIXTURE_PASSWORD`:

1. `npm run bootstrap:track01-browser-fixtures`
2. `npm run bootstrap:track02-browser-fixtures`
3. `npm run bootstrap:track03-browser-fixtures`
4. `npm run bootstrap:track04-browser-fixtures`

`scripts/bootstrap-track04-local-fixtures.sh` runs all five in order and prompts for the
secrets.

### Usage

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local service-role secret>' \
SUPABASE_PUBLISHABLE_KEY='<local publishable key>' \
TRACK01_FIXTURE_PASSWORD='<same value used for Track 01>' \
npm run bootstrap:track05-browser-fixtures
```

The publishable key and the fixture password are needed because the second half of the
script signs in as `track01.project-admin-a@example.test` and drives the real SpoolGen
import through the same RPCs the browser calls. Secrets are supplied out of band and are
never committed.

### Provisioned referentials

- `project_subcontractors` — `SUB-T5`
- `project_welding_procedures` — `WPS-T5` (1"–24", 2–30 mm, approved 2026-01-01)
- `welder_qualifications` — `W-T5-1`, `W-T5-2`, both linked to `WPS-T5`
- `piping_material_records` — `IDN-T5-100`/`HEAT-T5-100`, `IDN-T5-200`/`HEAT-T5-200`, `IDN-T5-300`/`HEAT-T5-300`
- `project_location_categories` — `CAT-T5`; `project_locations` — `YARD-T5`
- `project_line_services` — `LS-T5`; `project_ral_codes` — `RAL 9006`
- `project_paint_matrix_rules` — 240 µm final DFT, blasting and primer required, 1 intermediate + 1 final coat
- `nde_matrix_rules` — the Track 04 rule for `SC-T4`/`BW-T4`/`shop` is updated to `pwht_required = true`, `pwht_thickness_threshold = 8`

### Provisioned definition

Imported from `scripts/weld.txt`, `scripts/trace.txt` and `scripts/supp.txt`:

| Object       | Value                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Isometric    | `ISO-T4-001` revision `R0` (accepted), PDS area `PDS-T4`, service class `SC-T4`                                                         |
| Golden spool | `SP-T4-001-A` — shop welds `W-T4-001` and `W-T4-002` (6", 8.2 mm), support `SU-T4-001`, bill of materials `IDN-T5-100` and `IDN-T5-200` |
| Second spool | `SP-T4-001-B` — shop weld `W-T4-003` (8", 10.3 mm), bill of materials `IDN-T5-300`                                                      |

`trace.txt` deliberately carries no `TRACE_NUMBER`. Dossier §16.4 has the heat number
transcribed from a returned QC-13 by the operator, so the bill of materials arrives
without one and the material check screen is where it is supplied.

### Protection guards

1. **Localhost guard** — the script refuses to run against a non-local Supabase URL.
2. **Idempotency** — referentials are upserted; the import is skipped once an accepted
   revision exists. Two consecutive runs leave identical state.
3. **Secret protection** — every secret comes from an environment variable.

## Manual acceptance click path

Sign in as `track01.project-admin-a@example.test` and select project `TRACK01-A` in
Supabase mode. The spool picker on every screen below offers `SP-T4-001-A`.

1. **`/fabrication/material-check`** — select `SP-T4-001-A`. Click **Record Start Fab**.
   Click **Issue QC-13** and note the form number in the toast. Enter `HEAT-T5-100` against
   `IDN-T5-100` and `HEAT-T5-200` against `IDN-T5-200`, then click **Record traces**. The
   stage timeline gains **Material check**; with only one trace filled it must not.
2. **`/fabrication/weld-progress`** — select `SP-T4-001-A`. For joint `W-T4-001` choose
   subcontractor `SUB-T5`, WPS `WPS-T5`, root welder `W-T5-1`, cap welder `W-T5-2`, weld
   date today, and click **Record weld progress**. Repeat for `W-T4-002`. Each joint now
   shows one pending RT obligation and one PWHT requirement.
3. **`/fabrication/qc-release`** — select `SP-T4-001-A`. Click **Mark installed** on
   `SU-T4-001`. The release button is still disabled and names the outstanding NDE and
   PWHT counts. Click **Mark accepted** on both RT obligations. Enter chart number
   `CHART-T5-1` and click **Record accepted** for both PWHT requirements. The release
   button enables; click **QC release spool**.
4. **`/fabrication/paint`** — select `SP-T4-001-A`. Click **Record Sent to Paint**. Choose
   line service `LS-T5`, enter measured DFT `250` µm and W10P number `W10P-T5-1`, then
   click **Record painting**. Entering `200` µm must be refused with the paint-matrix
   message before you enter `250`.
5. **`/fabrication/laydown`** — select `SP-T4-001-A`, choose location `YARD-T5` and click
   **Record laydown**.
6. **`/fabrication/dashboard`** — `SP-T4-001-A` shows the full stage history.

### Negative paths worth clicking

- On `/fabrication/weld-progress`, try joint `W-T4-003` of `SP-T4-001-B` with two points
  totalling 90 % — the allocation message appears before the request is sent.
- Sign in as `track01.reader-qc@example.test`; `/fabrication/qc-release` must not be
  reachable.
````

- [ ] **Step 2: Walk the click path in a browser.**

Start the app with `npm run dev`, sign in as the fixture operator and perform every step of
the click path above against the local Supabase. Do not tick this step from reading the
document — perform it.

Expected: every step succeeds and every negative path is refused with a sentence, never a
raw SQL or PostgREST message.

- [ ] **Step 3: Verify durability.**

Hard-refresh `/fabrication/dashboard`, then open it in a private window signed in as
`track01.qc-editor@example.test`.

Expected: both sessions show the same stage dates for `SP-T4-001-A`.

- [ ] **Step 4: Commit.**

```bash
git add docs/TRACK05_BROWSER_FIXTURES.md
git commit -m "docs(construction): rewrite the Track 05 fixture runbook against the real fixtures"
```

### Gate R4 checklist

- [ ] Two consecutive full bootstrap chains from `supabase db reset` both exit `0`.
- [ ] The row-count query in Task 6 Step 5 returns `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`.
- [ ] The definition query in Task 7 Step 5 returns the expected spool shape.
- [ ] The click path in `docs/TRACK05_BROWSER_FIXTURES.md` was performed end to end.

---

# Gate R5 — Documentation truth and plan hygiene

## Task 9: Delete the phantom view from the documentation

**Files:**

- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`
- Modify: `docs/architecture/construction-progress-model.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`

**Interfaces:**

- Produces: documentation that names only objects present in `supabase/migrations`.

- [ ] **Step 1: Confirm the real view list.**

Run:

```bash
grep -hn "^create view" supabase/migrations/20260804*.sql
```

Expected: `spool_fabrication_readiness`, `spool_stage_events`, `spool_progress_dates`, `spool_construction_status`, `weld_progress_summary` — five views, and no `spool_material_check_status`.

- [ ] **Step 2: Fix the foundation document.**

In `docs/SUPABASE_BACKEND_FOUNDATION.md`, replace the Track 05 bullet with:

```markdown
- **Track 05:** Event ledger `construction_progress_events`, command receipts `command_receipts`, readiness view `spool_fabrication_readiness`, presentation views `spool_stage_events`, `spool_progress_dates`, `spool_construction_status`, `weld_progress_summary`. Fabrication RPCs: `record_construction_progress`, `request_qc13_form`, `materialize_progress_copies`, `record_material_check`, `record_weld_progress`, `correct_weld_progress`, `record_support_progress`, `record_nde_obligation_outcome`, `record_pwht_result`, `release_quality_record`, `record_paint_progress`, `record_laydown`.
```

- [ ] **Step 3: Fix the architecture document.**

In `docs/architecture/construction-progress-model.md`, replace the `spool_material_check_status` bullet with:

```markdown
- **Material check is derived inside `spool_fabrication_readiness`**: its `bill` lateral reconciles `spool_revision_materials` against `material_check_items`, and an item exists only when the trace resolved to an `active` `piping_material_records` row. There is no separate `is_accepted` flag — the presence of `piping_material_record_id` _is_ the acceptance, and the presence of an item _is_ the checked line.
```

Then, in the same document, add a **Known limitations** section at the end:

```markdown
## Known limitations

- `spool_fabrication_readiness` counts every non-removed weld joint of a spool, not only
  `weld_location = 'shop'`. A spool carrying a field or assembly joint can therefore never
  become `is_fabricated` through Shop Weld Progress alone. Track 07 owns those joints and
  must either widen the recording surface or narrow this count.
- `effective_stage_date(uuid, construction_stage)` is a deprecated fabrication-only
  delegate. Track 07 must call
  `effective_stage_date(uuid, construction_phase, construction_stage)`.
```

- [ ] **Step 4: Fix the completion note.**

In `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`, replace the Track 05 completion line with:

```markdown
> **Track 05 Completion (2026-08-04, remediated 2026-08-05):** Track 05 (Fabrication Progress) is complete and verified. The browser fixtures and the QC-13 guard were repaired by `docs/superpowers/plans/2026-08-05-track-05-remediation.md`; `npm run bootstrap:track05-browser-fixtures` now seeds the whole golden path including the engineering definition.
```

- [ ] **Step 5: Prove no phantom remains.**

Run: `grep -rn "spool_material_check_status" docs/ supabase/ modules/ lib/`

Expected: matches only inside `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` (the historical plan, which Task 10 annotates rather than rewrites).

- [ ] **Step 6: Commit.**

```bash
git add docs/SUPABASE_BACKEND_FOUNDATION.md \
        docs/architecture/construction-progress-model.md \
        docs/SUPABASE_NEXT_AGENT_CONTEXT.md
git commit -m "docs(construction): describe the views and helpers that actually exist"
```

## Task 10: Annotate the original Track 05 plan with what really happened

**Files:**

- Modify: `docs/superpowers/plans/2026-08-04-track-05-fabrication.md`

**Interfaces:**

- Produces: an execution addendum, and two exit criteria whose tick now reflects reality.

- [ ] **Step 1: Correct the two false exit criteria.**

In `docs/superpowers/plans/2026-08-04-track-05-fabrication.md`, find the two lines

```markdown
- [x] One spool travels `start_fab → material_check → fabricated → qc_release → sent_to_paint → painted → final_qc → laydown` entirely through Supabase RPCs (pgTAP `052`, and Task 26 step 4 in the browser).
```

and

```markdown
- [x] The Track 05 bootstrap script writes rows and is idempotent across two consecutive runs.
```

and append ` Verified in the browser only after the 2026-08-05 remediation.` to the first and ` Repaired and verified by the 2026-08-05 remediation plan; the original script never wrote a row.` to the second. Leave them ticked — they are true now.

- [ ] **Step 2: Add the addendum.**

Append to the same file, at the very end:

```markdown
---

## Execution addendum (2026-08-05)

This plan was executed over 24 commits, `4651eaf..643743e`. Gates A–D were implemented
faithfully; Gate E was not. What follows is the record, so a later track does not trust a
tick that was never earned.

**Executed as specified, verified independently:** `npm run verify` exits `0` from a fresh
`supabase db reset` with 20 pgTAP files, 422 assertions and 74 unit tests; all 34 files of
§4 exist; `lib/supabase/database.types.ts` is in sync with the local schema; every RPC is
`security definer` with `set search_path`, an `audit_events` row and an idempotency key;
`PQC30`–`PQC39` behave as §3.13 describes.

**Not executed, though reported as done:**

- Task 22 Step 5 — the bootstrap script was committed without ever being run. It wrote
  `name` into `project_subcontractors`, whose column is `description`, and produced zero
  rows. Two further schema mismatches sat behind it.
- Task 26 — the manual browser acceptance could not have taken place: the fixtures its
  click path names did not exist, and no Track 01–04 bootstrap creates a spool.
- All 146 step checkboxes were left unticked while all 32 exit criteria were ticked. The
  document therefore recorded no evidence of what had actually been run.

**Deviations from the written plan, resolved on 2026-08-05:**

| Deviation                                                                                                      | Resolution                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `request_qc13_form` guarded by `fabrication.qc.release` instead of `fabrication.progress.record` (§3.14)       | Aligned to the plan in `20260805090000_track05_remediation.sql`.                                                |
| `effective_stage_date` lost its `construction_phase` argument (§3.2)                                           | A phase-scoped three-argument form was added; the two-argument form is a deprecated fabrication delegate.       |
| `materialize_progress_copies` had no caller in the application (§3.4)                                          | `revision-workbench.tsx` now materializes the copies each applied import authorizes.                            |
| The screen issued a QC-13 and discarded its id (§3.5)                                                          | The form id is carried into `record_material_check`.                                                            |
| `materialize_progress_copies` takes an isometric revision id, not a spool revision id                          | Kept; the repository, the pgTAP fixture and this addendum agree on the signature.                               |
| `material_check_items` has no `is_accepted` / `checked_on`; acceptance is `piping_material_record_id not null` | Kept — it is stricter than the plan's schema. Documented in `docs/architecture/construction-progress-model.md`. |
| `NDT_METHODS` includes `vt`, which has no matrix column                                                        | Kept and commented in the source.                                                                               |
| The fixture test asserted `planInsertCount === 12` where the plan's own builder returned 10                    | The plan was internally inconsistent. The count is now 14 and matches the collections the script writes.        |

**Known limitation carried forward to Track 07:** `spool_fabrication_readiness` counts all
non-removed weld joints, not only shop joints, so a spool with a field or assembly joint
can never reach `is_fabricated` through Shop Weld Progress.
```

- [ ] **Step 3: Commit.**

```bash
git add docs/superpowers/plans/2026-08-04-track-05-fabrication.md
git commit -m "docs(construction): record what the Track 05 execution actually delivered"
```

## Task 11: Full verification from empty

**Files:** none.

- [ ] **Step 1: Reset and verify.**

Run:

```bash
/opt/homebrew/bin/supabase db reset && npm run verify
```

Expected: exit `0`. Record the actual counts printed by `supabase test db` (`Files=`,
`Tests=`) and by the node runner (`pass`).

- [ ] **Step 2: Confirm the generated types are still in sync.**

Run:

```bash
/opt/homebrew/bin/supabase gen types typescript --local > /tmp/pipeqc-types-check.ts
diff -q lib/supabase/database.types.ts /tmp/pipeqc-types-check.ts && echo "types in sync"
```

Expected: `types in sync`.

- [ ] **Step 3: Run the whole fixture chain twice and confirm idempotency.**

Run the command block from Task 7 Step 5, then run the Track 05 bootstrap a third time.

Expected: exit `0` every time; the third run reports the definition as already imported.

- [ ] **Step 4: Confirm no dead seams remain.**

Run:

```bash
grep -rn "materializeProgressCopies" modules | grep -v "supabase-construction-repository.ts"
grep -rn "qc13FormId" modules/construction/ui
```

Expected: the first prints the `revision-workbench.tsx` call site and the boundary test;
the second shows `qc13Form?.id ?? null`, not `null`.

- [ ] **Step 5: Commit the checked plan.**

```bash
git add docs/superpowers/plans/2026-08-05-track-05-remediation.md
git commit -m "docs(construction): close the Track 05 remediation plan"
```

### Gate R5 checklist

- [ ] `npm run verify` exits `0` after a fresh `supabase db reset`, with the counts recorded in Task 11 Step 1.
- [ ] `grep -rn "spool_material_check_status" docs/SUPABASE_BACKEND_FOUNDATION.md docs/architecture/` returns nothing.
- [ ] Every step checkbox in this plan is ticked, and each one was ticked after the command was run.

---

## 5. Exit criteria

- [ ] `npm run verify` exits `0` after a fresh `/opt/homebrew/bin/supabase db reset`.
- [ ] `npm run bootstrap:track05-browser-fixtures` writes rows, is idempotent across three consecutive runs, and its row counts are proven by the SQL in Task 6 Step 5 and Task 7 Step 5.
- [ ] After the bootstrap chain, `SP-T4-001-A` exists with two shop welds, four weld points, one support and two bill-of-materials lines.
- [ ] The click path in `docs/TRACK05_BROWSER_FIXTURES.md` was performed end to end in a browser against Supabase mode, and a hard refresh plus a second signed-in user show the same result.
- [ ] A member holding only `fabrication.progress.record` can issue a QC-13 form (pgTAP `050`).
- [ ] `effective_stage_date` is phase-scoped, and an `assembly` event of the same stage does not affect a fabrication lookup (pgTAP `050`).
- [ ] Applying a SpoolGen import materializes the progress copies it authorizes, and a failure to do so does not turn a successful apply into an error.
- [ ] A material check records the id of the QC-13 form the screen issued.
- [ ] `PQC39` and the WPS-approval-date, WPS-subcontractor and welder↔WPS-link branches of `PQC34` are asserted in pgTAP.
- [ ] No document names `spool_material_check_status`, and the Track 05 plan carries an execution addendum stating what was and was not delivered.

## 6. Explicitly outside this plan

- Narrowing `spool_fabrication_readiness` to shop joints. Recorded as a Track 07 limitation.
- Replacing the interim `record_nde_obligation_outcome`. Track 06 owns that.
- Retiring the two-argument `effective_stage_date`. It stays until Track 07 needs assembly progress.
- Deleting the demo stores. Demo mode still needs them; plan §3.15 stands.
- Any change to `modules/construction/domain/**` or `modules/construction/application/**` beyond the test appended in Task 3 — the domain layer was reviewed and found correct.


---

## Close-out status (2026-08-06)

Verified by `docs/superpowers/plans/2026-08-06-track-05-close-out.md`. The step boxes above
were never ticked contemporaneously and are **deliberately left unticked** — retro-ticking
would assert that a command ran at a time it did not. This block is the evidence instead.

**A golden-path-blocking defect that every automated check passed over.** A browser walk on
2026-08-02 found `loadMaterialCheckItems` selecting `ident_code`, `trace_number` and
`quantity` from `material_check_items`, which has none of them. PostgREST answered `400`,
the rejected promise took the bill of materials down with it, and the screen reported
"This spool revision has no bill of materials to check" — the opposite of the truth. No
heat number could be entered, so Material Check, QC Release, Paint and Laydown were all
unreachable. `npm run verify` was green throughout: `@supabase/supabase-js` 2.110.8 does
not type-check `.select()` strings (measured: a deliberately wrong select compiles with
`tsc` exiting `0`), pgTAP tests SQL rather than PostgREST, and the unit tests mock the
client. Fixed, and the class is now guarded by
`modules/construction/infrastructure/construction-select-columns.test.ts`, which checks all
16 repository selects against the generated types and was verified to fail on the original
query.

**Verified by execution on 2026-08-02:**

- `supabase db reset` applies all 35 migrations including both `20260805*` files.
  `npm run verify` exits `0`: pgTAP **Files=21, Tests=436** (was 20/422), unit **75 pass /
  0 fail**, fixtures **0 issues**. `database.types.ts` matches `supabase gen types --local`.
- `effective_stage_date` has two overloads, `request_qc13_form` is guarded by
  `fabrication.progress.record`, and no `spool_material_check_status` view exists — probe
  returns `2 | t | 0`.
- Track 04's SpoolGen import was performed **through the real UI**: missing-`weld.txt`
  refusal with `import_jobs = 0`; a 6 MB file rejected with `storage.objects = 0`, so the
  refusal precedes any Storage write; `PDS-NOPE` blocked with Apply disabled; a clean
  `Validated 10 rows: 0 errors, 3 warnings`; `Applied 7 definition rows`; R1 revision
  decisions with Rework toggling weld decisions on and off; R1 accepted and R0 superseded.
  Definition shape `SP-T4-001-A: 2 welds / 4 points / 1 support / 2 bom` and
  `SP-T4-001-B: 1 / 2 / 0 / 1`.
- The Track 05 bootstrap prints `14 rows upserted` — **14, not the 13 the remediation
  addendum claimed** — skips the import when an accepted revision exists, and writes
  `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`.
- The golden path was walked end to end in the browser. `spool_stage_events` for
  `SP-T4-001-A` holds exactly
  `start_fab → material_check → qc_release → sent_to_paint → painted → final_qc → laydown`,
  with **`fabricated` absent by design**. A partial material check produced no event. The
  QC release button stayed disabled while naming its outstanding counts and enabled only
  when the last obligation closed. A DFT of 200 µm was refused against the 240 µm matrix
  rule before any request; 250 µm was accepted.
- `material_check_records.qc13_form_id` holds `QC13-000001`, the form the screen issued —
  remediation Task 3's fix confirmed end to end for the first time.
- `PQC31` refuses the superseded revision: `Construction target revision is not current`.
- The shop-joint limitation is pinned by
  `supabase/tests/database/054_readiness_shop_joint_limitation.test.sql`, verified to fail
  assertions 1 and 4 when the view is narrowed.

**Also found and fixed by the same walk:** the fabrication spool picker listed superseded
revisions under labels identical to the accepted ones; `/` presented demo figures as real
in Supabase mode; the revision-decision message miscounted; `127.0.0.1:3000` never loaded.

**Measured, not assumed:** with the full Track 01-05 bootstrap data present,
`supabase test db` gives `Files=20, Tests=354` and fails in `040_engineering_identity`,
`042_spooling_apply` and `051_weld_progress`. Every test file ends in `rollback`, so the
conflict runs one way only — bootstrap data breaks pgTAP, never the reverse.

**Not exercised:** T01, T02, T03, T04-10..12 and S01. They cover Tracks 01-03, which this
close-out did not touch.
