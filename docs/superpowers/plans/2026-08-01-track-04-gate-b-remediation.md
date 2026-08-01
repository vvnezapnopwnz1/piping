# Track 04 Gate B Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent empty SpoolGen imports, preserve removed-spool history, and enforce manual-revision decisions before accepting Gate B.

**Architecture:** Keep all existing migrations immutable. Add one forward-only migration that replaces only the two affected RPC bodies, and extend the Gate B pgTAP contract with regression scenarios. Validation records server-derived blocker issues; apply remains the only promotion path and returns `PQC26` while a blocker remains.

**Tech Stack:** PostgreSQL 15, Supabase migrations, pgTAP, Supabase CLI.

---

### Task 1: Specify the Gate B regressions

**Files:**
- Modify: `supabase/tests/database/042_spooling_apply.test.sql`

- [ ] **Step 1: Add the empty-import test cases and raise the plan.**

```sql
select plan(30);

-- A registered file alone is not an engineering definition.
select lives_ok(
  format($$select public.record_spooling_validation(%L, '[]'::jsonb, '[]'::jsonb)$$,
    (select id from spl_empty_job)),
  'an empty submission is recorded for user-visible validation'
);
select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from spl_empty_job)
     and code = 'SRV_SPOOLING_SPINE_MISSING' and severity = 'blocker'),
  1,
  'an empty submission has a server-derived engineering-spine blocker'
);
select throws_ok(
  format($$select public.apply_spooling_import_job(%L)$$, (select id from spl_empty_job)),
  'PQC26', null,
  'an empty submission cannot become an applied import'
);
```

- [ ] **Step 2: Add removal-history and manual-decision test cases.**

```sql
select is(
  (select count(*)::int from public.revision_change_items
   where isometric_revision_id = (select accepted_revision_id from spl_removed_revision)
     and entity_type in ('support', 'flange_joint') and change_type = 'removed'),
  2,
  'removing a spool retains removed support and flange change items'
);

select throws_ok(
  format($$select public.create_manual_revision(%L, 'R2', null,
    '[{"entity_type":"spool","entity_key":"SP-A1","decision":"rework"}]'::jsonb)$$,
    (select isometric_id from spl_r1_isometric)),
  'PQC22', null,
  'a reworked manual spool requires decisions for every weld'
);
```

- [ ] **Step 3: Run the focused pgTAP file before production changes.**

Run: `/opt/homebrew/bin/supabase test db --file supabase/tests/database/042_spooling_apply.test.sql`

Expected: FAIL because empty data currently becomes `applied`, removed child history is skipped, and a manual rework accepts without weld decisions.

### Task 2: Add a forward-only database repair migration

**Files:**
- Create: `supabase/migrations/20260801100000_gate_b_integrity_fixes.sql`

- [ ] **Step 1: Replace `revalidate_spooling_import_job` to record an engineering-spine blocker.**

```sql
insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
select target_job_id, null, null, 'blocker', 'SRV_SPOOLING_SPINE_MISSING',
       'The SpoolGen submission must contain at least one isometric, spool and weld joint.'
where not exists (select 1 from public.spooling_staging(target_job_id) where entity_kind = 'isometric')
   or not exists (select 1 from public.spooling_staging(target_job_id) where entity_kind = 'spool')
   or not exists (select 1 from public.spooling_staging(target_job_id) where entity_kind = 'weld_joint');
```

- [ ] **Step 2: Replace `apply_spooling_import_job` so removal materializes child tombstones before skipping normal child creation.**

```sql
if spool_rec.change_type = 'removed' or spool_decision = 'cancelled' then
  -- Insert `is_removed = true` rows and revision_change_items for every previous
  -- weld, support and flange under this spool; use previous_payload for attributes.
  -- Continue only after all child history has been written.
  perform public.copy_removed_spool_children(
    target_job_id, job.project_id, isometric_row.id, new_revision_id,
    previous_revision_id, spool_rec.spool_number, new_spool_revision_id
  );
  continue;
end if;
```

- [ ] **Step 3: Replace `create_manual_revision` to validate choices before creating its draft revision.**

```sql
if exists (
  select 1 from public.spool_revisions sr
  join public.spools sp on sp.id = sr.spool_id
  where sr.isometric_revision_id = previous_revision.id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(decisions, '[]'::jsonb)) entry
      where entry ->> 'entity_type' = 'spool' and entry ->> 'entity_key' = sp.spool_number
    )
) then
  raise exception 'Every spool needs a decision' using errcode = 'PQC22';
end if;
```

For each spool chosen as `rework`, require an entry for every current weld joint; write its `revision_change_items` and `revision_decisions` while cloning it.

- [ ] **Step 4: Apply from empty and rerun the focused test.**

Run: `/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db --file supabase/tests/database/042_spooling_apply.test.sql`

Expected: all assertions pass.

### Task 3: Complete Gate B verification

**Files:**
- Modify: `docs/superpowers/plans/2026-08-03-track-04-engineering-revisions.md` (only Gate B evidence/count corrections)

- [ ] **Step 1: Regenerate and inspect types.**

Run: `/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts && rg -n "create_spooling_import_job|create_manual_revision" lib/supabase/database.types.ts`

Expected: all Gate B RPCs remain generated.

- [ ] **Step 2: Run the final verification after a fresh reset.**

Run: `/opt/homebrew/bin/supabase db reset && npm run verify`

Expected: exit `0`; record the actual pgTAP file and assertion counts.

- [ ] **Step 3: Correct Gate B's stale expected assertion/file counts and mark only executed checklist items.**

```markdown
- [x] Run `npm run verify`. Actual: 16 pgTAP files, <actual assertion count> assertions.
```

- [ ] **Step 4: Review the diff without staging or committing.**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; preserve unrelated working-tree edits.
