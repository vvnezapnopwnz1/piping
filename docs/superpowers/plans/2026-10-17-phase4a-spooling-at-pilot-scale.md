# Phase 4a: Spooling at Pilot Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new site can load its references and its spooling at pilot size (up to ~20,000 joints) on the KZ stand without a timeout, with no silently cut-off project list and no invented dates in the WPS and welder references.

**Architecture:** Most of the volume work is already done (N2 read views, N3 spooling apply, N5 RLS-as-a-set; see "State at start"). This plan therefore measures first, fixes only what the measurement shows, and adds the one real format change left: F2, WPS and welder import with dates taken from the file instead of invented by the server. Progress import, NDE result import and reference editing are **not** in this plan (phase 4b, on a pilot signal).

**Tech Stack:** Postgres/Supabase (migrations, pgTAP on `.pgtap-stack`), `tsx` scripts in `scripts/upg/`, Next.js app, `messages/{en,ru}/*.json`.

**Spec:** `docs/audits/2026-10-14-project-review-and-roadmap.md` §5 "Фаза 4" (blocks 1-3 deferred, block 4 and F2 here); measurements in `docs/acceptance/2026-10-17-import-timings.md` and `docs/acceptance/2026-10-17-read-path-timings.md`.

## State at start (do not redo)

- Spooling apply: 14,400 joints (1,000 ISO) in 8.0 s locally; 6,900 joints in 3.6 s (`20261018108000`-`20261018111000`, test `124`).
- Read views: pilot-size project opens every test-pack screen in under 1 s locally (N5, `20261018122000`).
- `selectAllRows` (`lib/supabase/select-all-rows.ts`) reads past `max_rows = 1000`; `lib/supabase/project-wide-loaders.test.ts` pins the loaders that use it.
- **Another session has uncommitted work in the tree:** keyset pagination for the fabrication and erection spool lists (`modules/construction/infrastructure/projection-keyset.ts`, `modules/construction/ui/use-keyset-spool-page.ts`, `*-spool-query.ts`) and a test-pack/NDE redesign (`.superpowers/sdd/2026-10-17-testpacks-nde-redesign`). Do not touch those files; start this plan's execution only after they are committed, or take only Tasks 1, 2 and 4, which touch none of them.
- No measurement on KZ exists. The agent may not connect to the KZ server; the owner runs the KZ column.

## Global Constraints

- CLAUDE.md "Backend: keep one rule in one place": reads are plain selects; the server owns the rule and returns reason codes; **one payload format, every caller updated in the same change, no legacy fallback**.
- Never seed `import_jobs`, `isometrics`, `spools` or progress tables on `TRACK01-A` / `TRACK01-B`; never reset or reseed `SHOWCASE-1`. Volume runs use the measurement project `PERF-1` and delete it afterwards (as `demo:time-import` does).
- pgTAP only on the isolated `.pgtap-stack`; migrations on a live stand only via `migration up`; no `supabase db push --linked`, no `supabase link`, no `vercel deploy` (frozen cloud project).
- Never print or write a secret; local scripts read `.env.local` through npm scripts, no inline credentials.
- Every string a person reads lives in `messages/en/<area>.json` and `messages/ru/<area>.json`; Russian terms follow `docs/i18n/glossary-ru.md`.
- Migration timestamps continue after `20261018123000`.
- A plan touching `supabase/` loads `supabase-postgres-best-practices` first (done for this plan).
- Pilot size targets: 300-800 ISO, 5-15 thousand joints; ceiling for this phase 20 thousand joints (~1,400 ISO of the UPG shape).

## Review Focus

1. Re-importing the same WPS or welder file after F2: must be a no-op or a clear conflict, never a second row or a changed date (idempotency contract, `PQC60` on a changed payload).
2. A WPS or welder row with an empty date cell: rejected at validation with the row number and column named, never stored with today's date.
3. A welder whose `expires_on` is already in the past: accepted into the reference but shown as expired, so weld recording refuses them (`isWelderCurrentlyQualified`), not silently dropped.
4. A project list at exactly 1,000 and 1,001 rows: both show all rows or an honest "N of M"; no list silently stops at 1,000.
5. Validation of a 20k-joint job: the apply command is fast, but the 14.4k run once failed in **validation** on a timeout; the whole path (register, validate, preview, apply) must finish inside the role timeout.

---

### Task 1: Measure the whole spooling path at 20k joints

**Files:**
- Modify: `scripts/upg/time-import.ts` (add `--isos <n>` to take a target ISO count instead of `--copies`; print register, validate, preview and apply times separately)
- Create: `docs/acceptance/2026-10-18-upg-20k-import.md`
- Test: `scripts/upg/time-import.test.ts`

**Interfaces:**
- Produces: `parseTimeImportArgs(argv: string[]): { copies: number; perJob: number }` where `--isos 1400` resolves to `copies = Math.ceil(1400 / UPG_ISOS.length)`; the doc's table is what Tasks 2 and 3 read to decide.

- [ ] **Step 1: Write the failing test** `parseTimeImportArgs resolves --isos to copies`: `--isos 1400` gives `copies 35` (40 ISO per copy), `--copies 5 --per-job 5` is unchanged, `--isos` together with `--copies` throws.
- [ ] **Step 2: Run** `node --import tsx --test scripts/upg/time-import.test.ts`; expect FAIL (`parseTimeImportArgs` is not exported).
- [ ] **Step 3: Implement** `parseTimeImportArgs` and use it in the script; add per-phase timers around the four repository calls already imported there.
- [ ] **Step 4: Run** the test; expect PASS.
- [ ] **Step 5: Run on the local stand** `npm run demo:time-import -- --isos 1400 --per-job 5`; record in the doc: ISO and joint counts, time of each phase, role `statement_timeout`, and (from `pg_stat_user_functions`) the three heaviest functions. Then delete `PERF-1` as the script's cleanup does and confirm the row counts of the other projects are unchanged.
- [ ] **Step 6: Write the owner's KZ command** into the doc (the same script, remote target flag if the script supports it, otherwise the `explain (analyze)` route used in the read-path doc) and leave the "KZ" column empty with the date it was requested.
- [ ] **Step 7: Commit** `perf(import): time the whole spooling path at 20k joints`.

### Task 2: Fix what Task 1 shows, nothing more

**Files:** decided by the measurement; candidates in order of likelihood:
- Create: `supabase/migrations/2026101813xxxx_<name>.sql`
- Create: `supabase/tests/database/127_<name>.test.sql`

**Interfaces:**
- Consumes: the Task 1 table. Decision rule: a phase over 50 % of the role timeout locally gets a fix; a phase under 25 % is left alone. KZ ran ~8x slower than local on view reads, so 8 s locally is not safe on KZ at 30 s.
- Produces: either a faster command, or a documented per-job cap.

- [ ] **Step 1: Load `supabase-postgres-best-practices` and `EXPLAIN (ANALYZE, BUFFERS)` the slowest function** from the Task 1 profile on the PERF-1 data; paste the plan lines that justify the change into the migration header comment.
- [ ] **Step 2: Write the pgTAP test first** in the "same rows" style of test `124`: the import result (rows in `isometrics`, `spools`, `weld_joints`, diff counters) is identical before and after the change.
- [ ] **Step 3: Run it on `.pgtap-stack` and confirm it fails or passes as expected** for the baseline.
- [ ] **Step 4: Implement the change.** Per-row triggers are already deferred to one pass (`…108000`); if validation is the slow phase, apply the same pattern there (read once into a temp table). If the only gap is KZ, prefer `alter function … set statement_timeout` on the import commands over a higher global role timeout, and say so in the migration.
- [ ] **Step 5: Run the full pgTAP suite** on `.pgtap-stack`, then repeat Task 1 step 5 and add the "after" column to the doc.
- [ ] **Step 6: Commit** `perf(import): <what the measurement showed>`. If the table shows nothing over 50 %, make no migration and commit only the doc note "no change needed at 20k locally".

### Task 3: F2, WPS and welder import with the dates from the file

**Files:**
- Create: `supabase/migrations/2026101813xxxx_reference_import_requires_dates.sql`
- Modify: the validation that stages WPS and welder rows (find it with `grep -rn "approved_on" supabase/migrations/*import*`; the apply side is `20261009180000_welder_import_apply_fix.sql` lines 126-172 where `coalesce(..., current_date)` and `(now() + interval '1 year')` invent the values)
- Modify: `scripts/upg/files.ts` (the UPG WPS and welder sheets carry real dates), `scripts/upg/setup-references.ts` (remove the `backdate-wps` phase and `backdateUpgWps`), `modules/imports/…` error-code mapping, `messages/en/imports.json`, `messages/ru/imports.json`
- Test: `supabase/tests/database/110_welder_import_apply.test.sql` (update), `supabase/tests/database/128_reference_import_dates.test.sql` (create), `scripts/upg/references.test.ts` (update)

**Interfaces:**
- Produces: new validation reason codes `PQC71` (`wps.approved_on` missing or not a date) and `PQC72` (`welder.expires_on` missing or not a date), each carrying row number and column name in the existing staging-error shape; the client maps them to words in `messages/*/imports.json` and never re-derives the rule.
- WPS sheet columns `approved_on`, welder sheet column `expires_on` become required. One payload format; the template in the UI and in `scripts/upg/files.ts` change together.

- [ ] **Step 1: Write the failing pgTAP tests** in `128`: (a) a WPS row without `approved_on` is rejected at validation with `PQC71`, row number 2, column `approved_on`; (b) a welder row without `expires_on` gives `PQC72`; (c) a row with both dates stores exactly those dates; (d) re-applying the same file leaves `approved_on` and `expires_on` unchanged (Review Focus 1); (e) a welder with a past `expires_on` is stored and `isWelderCurrentlyQualified`-equivalent server check reports expired (Review Focus 3).
- [ ] **Step 2: Run on `.pgtap-stack`**; expect FAIL on (a) and (b), because today the server fills the dates.
- [ ] **Step 3: Write the migration:** validation emits `PQC71` / `PQC72`; the apply bodies lose both `coalesce` fallbacks and read the dates as given.
- [ ] **Step 4: Update the UPG fixture files** so every WPS and welder row has a date from the manifest start date, drop `backdateUpgWps`, and update `scripts/upg/references.test.ts` to assert the sheets carry both columns.
- [ ] **Step 5: Add the two message codes** in en and ru; run `npm run test:unit` (the i18n key-parity and no-literal checks must pass).
- [ ] **Step 6: Run the full pgTAP suite and `npm run demo:check`** (84 checks green) on a freshly prepared local stand (`npm run demo:prepare -- --confirm-local-reset`, then `npm run verify`, then `npm run demo:showcase`, in that order).
- [ ] **Step 7: Commit** `fix(import): WPS and welder dates come from the file, not from the server clock`.

### Task 4: No project list stops at 1,000 without saying so

**Files:**
- Modify: `lib/supabase/project-wide-loaders.test.ts` (extend the `LOADERS` table)
- Modify: the loaders the audit finds that still use a plain `.select()` on a project-wide table (audit starting points: `modules/quality/infrastructure/supabase-quality-repository.ts:111`, the report repository `weld_log_rows` / `nde_register_rows` reads, `loadErectionReadinessForProject`)
- Test: `lib/supabase/project-wide-loaders.test.ts`

**Interfaces:**
- Consumes: `selectAllRows(fetchPage, pageSize = 1000)` from `lib/supabase/select-all-rows.ts`. Lists shown through the keyset hook (`useKeysetSpoolPage`) already carry `totalCount`; this task does not change them.
- Produces: every project-wide read either goes through `selectAllRows` or is keyset-paged with a visible total.

- [ ] **Step 1: Audit.** List every `.from("<table or view>")` in `modules/*/infrastructure/` and `lib/supabase/` without `.eq("<id>"…)` on a single object and without `selectAllRows` / `.range(` / keyset; write the list to the scratchpad and keep only project-wide reads. Do not edit the keyset files of the other session; list them as "covered by keyset".
- [ ] **Step 2: Write the failing test rows** in `LOADERS` for each unprotected loader found (the existing regexp asserts `selectAllRows(... from("<table>") ... .range(from, to)`); add a behavioural test `selectAllRows reads 1,001 rows over two pages` if one does not exist, using a fake `fetchPage`.
- [ ] **Step 3: Run** `node --import tsx --test lib/supabase/project-wide-loaders.test.ts`; expect FAIL for the new rows.
- [ ] **Step 4: Switch each loader to `selectAllRows`** with a unique `order` key.
- [ ] **Step 5: Run the test and `npm run test:unit`**; expect PASS.
- [ ] **Step 6: Commit** `fix(reads): project-wide loaders read past the 1,000-row cap`.

### Task 5: Write down the non-functional requirements and the known limits

**Files:**
- Create: `docs/architecture/non-functional-requirements.md`
- Modify: `docs/audits/2026-10-14-project-review-and-roadmap.md` ("Статус на 17.10": phase 4a result)

**Interfaces:**
- Produces: the §4.1 table of the roadmap (isolation, correctness, traceability, availability 99.5 %, RPO ≤ 1 h / RTO ≤ 4 h, KZ data residency, RU then KK, online from the office) with the measured numbers from the three acceptance docs, and a "Known limits" section: (1) cross-project aggregate cost (`nde_register_rows` with 34,000 foreign joints: 4.9 s) acceptable for one large project per database, revisit if a second one arrives; (2) per-row PDS-zone checks left as they are; (3) stored isometric readiness not built, to be reconsidered above 3-5 thousand ISO.

- [ ] **Step 1: Write the document** from the sources above, numbers copied from the acceptance docs, no new claims.
- [ ] **Step 2: Update the roadmap status** with one paragraph: what 4a closed, what the KZ column still lacks, that 4b (progress import, NDE result import, reference editing under Q4) is open and waits for a pilot signal.
- [ ] **Step 3: Commit** `docs(phase4a): non-functional requirements and known limits`.

## Done when

- `docs/acceptance/2026-10-18-upg-20k-import.md` shows the whole path at ~20k joints inside the role timeout locally, and the KZ column is filled by the owner or marked as outstanding.
- A WPS or welder file without dates is rejected with row and column; the UPG fixtures need no `backdate-wps`.
- `lib/supabase/project-wide-loaders.test.ts` lists every project-wide loader.
- Full pgTAP on `.pgtap-stack`, `npm run verify` and `npm run demo:check` are green.

## Self-review

- Spec coverage: roadmap block 4 (volume) is Tasks 1, 2, 4, 5; F2 is Task 3; blocks 1-3 (progress import, NDE import, reference editing) are stated as out of scope. "UPG-20k imports on hosted without timeout" is only fully proven once the owner supplies the KZ column; the plan says so rather than claiming it.
- Open assumption: I did not trace the TypeScript side of the import template for WPS and welders (Task 3 step 3 starts with a grep to find it); the exact migration file names get their timestamps at execution.
