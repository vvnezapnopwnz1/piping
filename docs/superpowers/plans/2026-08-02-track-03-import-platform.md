# Track 03 Import Platform and Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the browser-only XLSX dialogs with one reusable, durable import lifecycle — upload to private Storage, validate into typed issues, preview, then apply in a single all-or-nothing SQL transaction that can never run twice.

**Architecture:** `import_jobs` becomes a state machine with child `import_job_rows` and `import_job_issues` tables. The browser parses the workbook and submits normalized rows plus advisory issues; the database re-validates every row against project referentials inside `apply_import_job` and refuses to apply if any blocker survives. Client-side validation is a UX affordance only — the database is the sole authority. Every mutation goes through a SECURITY DEFINER RPC; `authenticated` holds only `SELECT` on the tables.

**Tech Stack:** PostgreSQL 15 (Supabase), pgTAP, Supabase Storage, Next.js 16 App Router, React 19, TypeScript strict, `xlsx` (already a dependency), Node test runner via `tsx`.

---

## 1. Execution policy

- Migrations are **forward-only**. Never edit a migration that has been applied; add a new one.
- After any migration, regenerate `lib/supabase/database.types.ts` (Task 6 and Task 24 both do this).
- Run the full verification command after every Gate. Never mark a checkbox for a command you did not run.
- Do **not** mark a step complete because the code "looks right". Every RED step must actually fail, and every GREEN step must actually pass.
- If a step's expected output does not match reality, stop and report the discrepancy instead of adjusting the test to match the code.

## 2. Prerequisite state

This plan assumes Track 01 and Track 02 are merged, including the blocker fixes in
`20260801094000_track02_blockers_fix.sql` and `20260801095000_security_and_policy_cleanup.sql`.

Two known defects are inherited and are fixed by **Task 0** of this plan, because Track 03
cannot be verified while the test suite is red:

1. `supabase/tests/database/023_track02_blockers_fix.test.sql:5-7` inserts
   `auth.users` with `on conflict (id) do nothing`, but the constraint that actually fires is
   `users_email_partial_key` on `email`. The email `track01.platform-admin@example.test` already
   exists on any database where `npm run bootstrap:track01-browser-fixtures` has run, so
   `supabase test db` fails there and passes on a clean database.
2. `docs/TRACK02_BROWSER_FIXTURES.md` contains a literal `sb_secret_...` service-role key and a
   fixture password, contradicting its own line 11.

## 3. Decisions fixed by this plan

### 3.1 Lifecycle

```text
draft ──► uploaded ──► validating ──► validated ──► applying ──► applied
  │           │            │              │             │
  └───────────┴────────────┴──────────────┴─────────────┴──► failed
  └───────────┴────────────┴──────────────┴────────────────► canceled
```

- `applied`, `failed`, `canceled` are **terminal and read-only**. No RPC transitions out of them.
- `draft` exists only between "job row created" and "file uploaded to Storage", so the client
  knows the `job_id` that forms the Storage path before it uploads.

### 3.2 Issue severity

Three distinct severities, per dossier §12.2, modelled as an enum — not as a boolean or a string blob:

| Severity | Colour in UI | Meaning | Blocks apply? |
| --- | --- | --- | --- |
| `blocker` | red | invalid value or missing referential | Yes, always |
| `conflict` | yellow | row overwrites an existing DB value | Yes, until the user confirms overwrite |
| `warning` | grey | advisory, e.g. missing covering WPS | No |

Per dossier §11.6 and §14.2, a missing covering WPS is a `warning`, never a `blocker`.

### 3.3 Atomicity and idempotency

- `apply_import_job` takes `for update` on the `import_jobs` row, asserts `status = 'validated'`
  and `applied_at is null`, then applies every row. A single `raise` anywhere aborts the whole
  function, and PostgreSQL rolls back every write it made. Dossier §12.5.
- A second call sees `status = 'applied'` and raises `PQC10`. Retry after a failure is safe
  because a failed apply left no rows behind.

### 3.4 Validation authority

The browser parses XLSX and posts rows plus issues. `apply_import_job` **re-derives every
referential check server-side** and raises if a blocker exists, regardless of what the client
submitted. A client that posts an empty issue list still cannot apply an invalid row.

### 3.5 Scope of import types in Track 03

Five XLSX types, all from dossier §12.3:

| `import_type` | Target table | Natural key |
| --- | --- | --- |
| `piping_material_list` | `piping_material_records` | `ident_code` + `trace_number` |
| `welding_procedure` | `project_welding_procedures` | `wps_code` |
| `welder_qualification` | `welder_qualifications` | `welder_code` |
| `thickness_flange` | `project_thickness_flange_rules` | `service_class` + `diameter_inch` |
| `nde_matrix` | `nde_matrix_rules` | `service_class` + `weld_type` + `weld_location` |

**Explicitly deferred to Track 04:** Spooling Images ZIP (4 MB, dossier §14.3) and Spooling
Material Type / Class imports. The ZIP path belongs with SpoolGen file handling; the spooling
material referentials have no CRUD yet, so importing into them would be premature.

### 3.6 Deviation from the roadmap: no edge function

Roadmap §15 lists `supabase/functions/process-import/index.ts`. This plan does **not** create it.

Reason: the repository has no Deno/edge-function toolchain, no local edge runtime in the verify
loop, and `xlsx` already runs in the browser. Introducing an edge function would add an untested
deployment axis to a track whose exit criteria are all about durability and atomicity — both of
which live in the database either way. Parsing happens in the browser; **authority stays in
`apply_import_job`**, which is stronger than parsing server-side and trusting the result.

If asynchronous processing of large files becomes necessary, it is an additive change: the
`record_import_validation` RPC contract does not change when the caller moves from browser to
edge function.

### 3.7 Storage

- Bucket `project-imports`, private, 10 MB limit, XLSX/CSV mime types only.
- Object path: `<project_id>/<import_job_id>/<original_file_name>`.
- Path segment 1 is compared **as text** against `project_id::text`, never cast to `uuid` in a
  policy. Task 5 also retrofits this to the `project-branding` policies, which currently cast
  `(storage.foldername(name))[1]::uuid` and are missing `to authenticated`.

### 3.8 Capabilities

Two new capability codes, following the existing naming in `20260731090000`:

- `imports.view` — non-mutating, no functional role required.
- `imports.manage` — mutating, no functional role required.

Granted to `project_admin`, `site_admin` and `project_editor`. Not granted to `project_reader`
or `subcontractor`.

## 4. File map

### Database

- Create: `supabase/migrations/20260802090000_import_platform.sql`
- Create: `supabase/migrations/20260802091000_import_storage_policies.sql`
- Create: `supabase/migrations/20260802092000_apply_import_commands.sql`
- Create: `supabase/tests/database/030_import_lifecycle.test.sql`
- Create: `supabase/tests/database/031_import_apply_atomicity.test.sql`
- Create: `supabase/tests/database/032_import_storage_policies.test.sql`
- Modify: `supabase/tests/database/023_track02_blockers_fix.test.sql:4-11`

### Access catalog

- Modify: `modules/access/domain/capability.ts` — add the two new capability codes to the
  `CAPABILITIES` tuple. `config/route-capabilities.ts` is declared
  `satisfies readonly (readonly [string, Capability])[]`, so a route entry for a capability that
  is not in this union is a **typecheck failure**, not a silent mismatch.

### Domain (no Supabase, no React, no `store/*` imports)

- Create: `modules/imports/domain/import-job.ts`
- Create: `modules/imports/domain/import-job.test.ts`
- Create: `modules/imports/domain/import-issue.ts`
- Create: `modules/imports/domain/import-issue.test.ts`
- Create: `modules/imports/domain/import-type.ts`
- Create: `modules/imports/domain/import-type.test.ts`
- Create: `modules/imports/domain/parsers/piping-material-list.ts`
- Create: `modules/imports/domain/parsers/piping-material-list.test.ts`
- Create: `modules/imports/domain/parsers/welding-procedure.ts`
- Create: `modules/imports/domain/parsers/welding-procedure.test.ts`
- Create: `modules/imports/domain/parsers/welder-qualification.ts`
- Create: `modules/imports/domain/parsers/welder-qualification.test.ts`
- Create: `modules/imports/domain/parsers/thickness-flange.ts`
- Create: `modules/imports/domain/parsers/thickness-flange.test.ts`
- Create: `modules/imports/domain/parsers/nde-matrix.ts`
- Create: `modules/imports/domain/parsers/nde-matrix.test.ts`
- Create: `modules/imports/domain/parsers/registry.ts`
- Create: `modules/imports/domain/parsers/registry.test.ts`

### Application

- Create: `modules/imports/application/create-import.ts`
- Create: `modules/imports/application/create-import.test.ts`
- Create: `modules/imports/application/apply-import.ts`
- Create: `modules/imports/application/apply-import.test.ts`

### Infrastructure

- Create: `modules/imports/infrastructure/supabase-import-repository.ts`
- Create: `modules/imports/infrastructure/supabase-import-repository.test.ts`
- Create: `modules/imports/infrastructure/supabase-import-errors.ts`
- Create: `modules/imports/infrastructure/supabase-import-errors.test.ts`
- Create: `modules/imports/infrastructure/xlsx-workbook.ts`
- Create: `modules/imports/infrastructure/xlsx-workbook.test.ts`

### UI

- Create: `modules/imports/ui/import-workbench.tsx`
- Create: `modules/imports/ui/import-issue-list.tsx`
- Create: `modules/imports/ui/import-conflict-dialog.tsx`
- Create: `modules/imports/ui/import-history.tsx`
- Create: `app/admin/imports/page.tsx`
- Modify: `config/route-capabilities.ts`
- Modify: `config/navigation.ts`

### Fixtures, scripts and docs

- Create: `scripts/bootstrap-track03-browser-fixtures.ts`
- Create: `scripts/bootstrap-track03-browser-fixtures.test.ts`
- Create: `docs/TRACK03_BROWSER_FIXTURES.md`
- Modify: `docs/TRACK02_BROWSER_FIXTURES.md`
- Modify: `package.json`
- Modify: `lib/supabase/database.types.ts`
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`

---

## Task 0: Repair the inherited red build

**Files:**
- Modify: `supabase/tests/database/023_track02_blockers_fix.test.sql:4-11`
- Modify: `docs/TRACK02_BROWSER_FIXTURES.md`
- Modify: `package.json`

There is no migration in this task. The Task 0 migration filename listed in the file map is a
placeholder that is **not** created — the two defects are a test bug and a documentation leak.

- [x] **Step 1: Reproduce the failure.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```

Expected on a database where the Track 01 fixtures have been bootstrapped:
```
023_track02_blockers_fix.test.sql:7: ERROR:  duplicate key value violates unique constraint "users_email_partial_key"
Result: FAIL
```

If it instead passes, you are on a clean database. Run
`npm run bootstrap:track01-browser-fixtures` first (see `docs/TRACK02_BROWSER_FIXTURES.md`
for the command shape) and repeat, so you are fixing a failure you have actually seen.

- [x] **Step 2: Give test 023 its own identity.**

Replace lines 4-11 of `supabase/tests/database/023_track02_blockers_fix.test.sql`:

```sql
-- Ensure test user and profile exist. Use an email unique to this test file so the
-- fixture bootstrap script cannot collide with it via users_email_partial_key.
insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'track02.blockers@example.test',
  'not-used',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles(id, email, full_name)
values ('00000000-0000-0000-0000-000000000001', 'track02.blockers@example.test', 'Blocker Fix Admin')
on conflict (id) do nothing;
```

Then update line 39, which asserts on the email, to `'track02.blockers@example.test'`.

- [x] **Step 3: Verify test 023 is green.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: `Result: PASS`, 9 files.

- [x] **Step 4: Remove the committed service-role secret.**

In `docs/TRACK02_BROWSER_FIXTURES.md`, replace every literal occurrence of the
`sb_secret_...` value with `<local-service-role-secret>` and every literal
`TRACK01_FIXTURE_PASSWORD` value with `<fixture-password>`. Verify:

```bash
grep -c "sb_secret_" docs/TRACK02_BROWSER_FIXTURES.md
```
Expected: `0`.

Tell the user to rotate the local key with `supabase stop && supabase start`, because the value
was written to disk.

- [x] **Step 5: Add the missing verification scripts.**

In `package.json`, add to `"scripts"`:

```json
"typecheck": "tsc --noEmit --incremental false",
"test:unit": "node --import tsx --test \"modules/**/*.test.ts\" \"lib/**/*.test.ts\" \"config/**/*.test.ts\" \"contexts/**/*.test.ts\" \"components/**/*.test.ts\" \"scripts/**/*.test.ts\"",
"test:db": "supabase test db",
"verify": "npm run typecheck && npm run test:unit && npm run test:db && npm run validate:fixtures"
```

- [x] **Step 6: Run the new verify command.**

Run:
```bash
npm run verify
```
Expected: exit `0`. This is now the single command referenced by every later Gate.

- [x] **Step 7: Commit.**

```bash
git add supabase/tests/database/023_track02_blockers_fix.test.sql docs/TRACK02_BROWSER_FIXTURES.md package.json
git commit -m "fix: repair test 023 isolation, remove committed secret, add verify scripts"
```

---

# Gate A — Import platform database

## Task 1: Evolve `import_jobs` into a lifecycle with rows and issues

**Files:**
- Create: `supabase/migrations/20260802090000_import_platform.sql`
- Create: `supabase/tests/database/030_import_lifecycle.test.sql`

- [x] **Step 1: Write the failing pgTAP contract.**

Create `supabase/tests/database/030_import_lifecycle.test.sql`:

```sql
begin;
select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'imp.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'imp.admin.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'imp.reader.a@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'imp.admin.b@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '10000000-0000-0000-0000-000000000101';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values
  ('30000000-0000-0000-0000-000000000101', 'IMP-A', 'Import A', 'Owner A', 'Contractor A', 1, '10000000-0000-0000-0000-000000000101'),
  ('30000000-0000-0000-0000-000000000102', 'IMP-B', 'Import B', 'Owner B', 'Contractor B', 1, '10000000-0000-0000-0000-000000000101');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values
  ('20000000-0000-0000-0000-000000000101', '30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000102', 'system_admin', 'project_admin', true),
  ('20000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000103', 'qc_engineer', 'project_reader', true),
  ('20000000-0000-0000-0000-000000000103', '30000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000104', 'system_admin', 'project_admin', true);

-- Schema shape
select has_table('public', 'import_job_rows', 'import_job_rows table exists');
select has_table('public', 'import_job_issues', 'import_job_issues table exists');
select has_column('public', 'import_jobs', 'import_type', 'import_jobs has import_type');
select has_column('public', 'import_jobs', 'source_checksum', 'import_jobs has source_checksum');
select has_column('public', 'import_jobs', 'applied_at', 'import_jobs has applied_at');
select has_column('public', 'import_jobs', 'applied_row_count', 'import_jobs has applied_row_count');

-- RLS is enabled on every new table
select is(relrowsecurity, true, 'import_job_rows has RLS')
from pg_class where oid = 'public.import_job_rows'::regclass;
select is(relrowsecurity, true, 'import_job_issues has RLS')
from pg_class where oid = 'public.import_job_issues'::regclass;

-- authenticated may never write these tables directly
select is(
  has_table_privilege('authenticated', 'public.import_jobs', 'INSERT'),
  false,
  'authenticated cannot insert import_jobs directly'
);
select is(
  has_table_privilege('authenticated', 'public.import_jobs', 'TRUNCATE'),
  false,
  'authenticated cannot truncate import_jobs'
);

-- Capabilities exist and are not granted to readers
select is(
  (select count(*)::int from public.capabilities where code in ('imports.view', 'imports.manage')),
  2,
  'import capabilities are seeded'
);
select is(
  (select count(*)::int from public.role_capabilities
   where role_code = 'project_reader' and capability_code = 'imports.manage'),
  0,
  'project_reader does not receive imports.manage'
);

select * from finish();
rollback;
```

- [x] **Step 2: Run RED.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: `030_import_lifecycle.test.sql` fails — `relation "public.import_job_rows" does not exist`.

- [x] **Step 3: Write the migration.**

Create `supabase/migrations/20260802090000_import_platform.sql`:

```sql
-- Track 03: import platform lifecycle, rows and issues.

create type public.import_issue_severity as enum ('blocker', 'conflict', 'warning');

-- Evolve import_jobs. `kind` becomes a compatibility column, mirroring how Track 01
-- retired project_memberships.role in favour of access_role_code.
alter table public.import_jobs
  add column if not exists import_type text,
  add column if not exists source_file_name text,
  add column if not exists source_media_type text,
  add column if not exists source_size_bytes bigint,
  add column if not exists source_checksum text,
  add column if not exists conflicts_confirmed boolean not null default false,
  add column if not exists validated_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists applied_row_count integer not null default 0,
  add column if not exists affected_entity_ids uuid[] not null default array[]::uuid[],
  add column if not exists canceled_at timestamptz,
  add column if not exists failure_reason text;

update public.import_jobs set import_type = kind where import_type is null;

alter table public.import_jobs
  alter column import_type set not null,
  alter column kind drop not null;

alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check
  check (status in ('draft', 'uploaded', 'validating', 'validated', 'applying', 'applied', 'failed', 'canceled'));

alter table public.import_jobs
  add constraint import_jobs_import_type_check
  check (import_type in (
    'piping_material_list',
    'welding_procedure',
    'welder_qualification',
    'thickness_flange',
    'nde_matrix'
  ));

create index if not exists import_jobs_project_created_idx
  on public.import_jobs (project_id, created_at desc);

create table public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_values jsonb not null check (jsonb_typeof(raw_values) = 'object'),
  normalized_values jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_values) = 'object'),
  action text not null check (action in ('create', 'update', 'unchanged', 'skip')),
  target_entity_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (job_id, row_number)
);

create index import_job_rows_job_idx on public.import_job_rows (job_id, row_number);

create table public.import_job_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer check (row_number is null or row_number > 0),
  column_name text,
  severity public.import_issue_severity not null,
  code text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index import_job_issues_job_idx on public.import_job_issues (job_id, severity);

-- Capabilities
insert into public.capabilities (code, description, is_mutating, requires_functional_role)
values
  ('imports.view', 'View import jobs and their history', false, false),
  ('imports.manage', 'Create, validate, apply and cancel import jobs', true, false)
on conflict (code) do nothing;

insert into public.role_capabilities (role_code, capability_code)
values
  ('project_admin', 'imports.view'),
  ('project_admin', 'imports.manage'),
  ('site_admin', 'imports.view'),
  ('site_admin', 'imports.manage'),
  ('project_editor', 'imports.view'),
  ('project_editor', 'imports.manage'),
  ('project_reader', 'imports.view')
on conflict (role_code, capability_code) do nothing;
```

- [x] **Step 4: Add RLS and grants to the same migration.**

Append to `supabase/migrations/20260802090000_import_platform.sql`:

```sql
alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.import_job_issues enable row level security;

drop policy if exists "import jobs are read by capability" on public.import_jobs;
create policy "import jobs are read by capability"
  on public.import_jobs for select to authenticated
  using (public.current_user_has_capability(project_id, 'imports.view'));

drop policy if exists "import job rows are read by capability" on public.import_job_rows;
create policy "import job rows are read by capability"
  on public.import_job_rows for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_job_rows.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

drop policy if exists "import job issues are read by capability" on public.import_job_issues;
create policy "import job issues are read by capability"
  on public.import_job_issues for select to authenticated
  using (
    exists (
      select 1 from public.import_jobs job
      where job.id = import_job_issues.job_id
        and public.current_user_has_capability(job.project_id, 'imports.view')
    )
  );

-- Every mutation goes through a SECURITY DEFINER RPC. Reads only for authenticated.
revoke all on public.import_jobs, public.import_job_rows, public.import_job_issues
  from anon, authenticated;

grant select on public.import_jobs, public.import_job_rows, public.import_job_issues
  to authenticated;
```

- [x] **Step 5: Run GREEN.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `Result: PASS`, 10 files, `030_import_lifecycle.test.sql .. ok`.

The `db reset` is required here because this task adds an enum type and a `not null`
constraint that cannot be re-applied on top of a partially migrated database.

- [x] **Step 6: Commit.**

```bash
git add supabase/migrations/20260802090000_import_platform.sql supabase/tests/database/030_import_lifecycle.test.sql
git commit -m "feat(imports): add import job lifecycle schema, RLS and capabilities"
```

---

## Task 2: Add the create, validate and cancel RPCs

**Files:**
- Create: `supabase/migrations/20260802092000_apply_import_commands.sql`
- Modify: `supabase/tests/database/030_import_lifecycle.test.sql`

Do not edit `20260802090000_import_platform.sql` — it has already been applied. The new file
created here also receives the apply RPC in Task 3, so both land in
`20260802092000_apply_import_commands.sql`.

- [x] **Step 1: Extend the pgTAP contract.**

In `supabase/tests/database/030_import_lifecycle.test.sql`, change `select plan(12);` to
`select plan(18);` and insert these assertions immediately before `select * from finish();`:

```sql
-- Project Admin A can create a job
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000102', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000102","role":"authenticated"}', true);

select lives_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'pml.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-aaa'
    )$$,
  'project admin can create an import job'
);

select is(
  (select status from public.import_jobs where source_checksum = 'checksum-aaa'),
  'draft',
  'new job starts in draft'
);

-- Reader cannot create a job
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000103', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000103","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'pml.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-reader'
    )$$,
  '42501',
  'Import management capability is required',
  'reader cannot create an import job'
);

-- Admin of project B cannot create a job in project A
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000104', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000104","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_import_job(
      '30000000-0000-0000-0000-000000000101',
      'piping_material_list',
      'cross.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      2048,
      'checksum-cross'
    )$$,
  '42501',
  'Import management capability is required',
  'cross-project import creation is rejected'
);

-- Cancel is terminal
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000102', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000102","role":"authenticated"}', true);

select lives_ok(
  $$select public.cancel_import_job(
      (select id from public.import_jobs where source_checksum = 'checksum-aaa')
    )$$,
  'project admin can cancel a draft job'
);

select throws_ok(
  $$select public.cancel_import_job(
      (select id from public.import_jobs where source_checksum = 'checksum-aaa')
    )$$,
  'PQC11',
  'Import job is already in a terminal state',
  'cancelling a canceled job is rejected'
);

reset role;
```

- [x] **Step 2: Run RED.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: failure — `function public.create_import_job(...) does not exist`.

- [x] **Step 3: Write the RPCs.**

Create `supabase/migrations/20260802092000_apply_import_commands.sql`:

```sql
-- Track 03: import command surface. Every mutation of import_jobs, import_job_rows
-- and import_job_issues happens here, under an explicit capability check.

create or replace function public.create_import_job(
  target_project_id uuid,
  requested_import_type text,
  file_name text,
  media_type text,
  size_bytes bigint,
  checksum text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_job public.import_jobs;
begin
  if not public.current_user_has_capability(target_project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if coalesce(trim(file_name), '') = '' then
    raise exception 'Source file name is required' using errcode = '23514';
  end if;

  if coalesce(size_bytes, 0) <= 0 then
    raise exception 'Source file size must be positive' using errcode = '23514';
  end if;

  insert into public.import_jobs (
    project_id, kind, import_type, status, requested_by,
    source_file_name, source_media_type, source_size_bytes, source_checksum
  )
  values (
    target_project_id, requested_import_type, requested_import_type, 'draft', auth.uid(),
    trim(file_name), media_type, size_bytes, checksum
  )
  returning * into created_job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    target_project_id, auth.uid(), 'import_jobs', created_job.id,
    'create_import_job', null, to_jsonb(created_job)
  );

  return created_job;
end;
$$;

create or replace function public.mark_import_job_uploaded(
  target_job_id uuid,
  object_path text
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status <> 'draft' then
    raise exception 'Import job is not awaiting upload' using errcode = 'PQC11';
  end if;

  update public.import_jobs
  set status = 'uploaded', storage_path = object_path
  where id = target_job_id
  returning * into job;

  return job;
end;
$$;

-- Replaces rows and issues atomically. Client-submitted issues are advisory only:
-- apply_import_job re-derives every referential check server-side.
create or replace function public.record_import_validation(
  target_job_id uuid,
  parsed_rows jsonb,
  parsed_issues jsonb
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status not in ('uploaded', 'validating', 'validated') then
    raise exception 'Import job cannot be validated in its current state' using errcode = 'PQC11';
  end if;

  delete from public.import_job_rows where job_id = target_job_id;
  delete from public.import_job_issues where job_id = target_job_id;

  insert into public.import_job_rows (job_id, row_number, raw_values, normalized_values, action)
  select
    target_job_id,
    (entry ->> 'row_number')::integer,
    coalesce(entry -> 'raw_values', '{}'::jsonb),
    coalesce(entry -> 'normalized_values', '{}'::jsonb),
    coalesce(entry ->> 'action', 'create')
  from jsonb_array_elements(coalesce(parsed_rows, '[]'::jsonb)) as entry;

  insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
  select
    target_job_id,
    nullif(entry ->> 'row_number', '')::integer,
    nullif(entry ->> 'column_name', ''),
    (entry ->> 'severity')::public.import_issue_severity,
    entry ->> 'code',
    entry ->> 'message'
  from jsonb_array_elements(coalesce(parsed_issues, '[]'::jsonb)) as entry;

  update public.import_jobs
  set status = 'validated',
      validated_at = timezone('utc', now()),
      conflicts_confirmed = false
  where id = target_job_id
  returning * into job;

  return job;
end;
$$;

create or replace function public.cancel_import_job(target_job_id uuid)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;
  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;
  if job.status in ('applied', 'failed', 'canceled') then
    raise exception 'Import job is already in a terminal state' using errcode = 'PQC11';
  end if;

  update public.import_jobs
  set status = 'canceled', canceled_at = timezone('utc', now())
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'cancel_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function
  public.create_import_job(uuid, text, text, text, bigint, text),
  public.mark_import_job_uploaded(uuid, text),
  public.record_import_validation(uuid, jsonb, jsonb),
  public.cancel_import_job(uuid)
from public, anon;

grant execute on function
  public.create_import_job(uuid, text, text, text, bigint, text),
  public.mark_import_job_uploaded(uuid, text),
  public.record_import_validation(uuid, jsonb, jsonb),
  public.cancel_import_job(uuid)
to authenticated;
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: `Result: PASS`, `030_import_lifecycle.test.sql .. ok` with 18 assertions.

- [x] **Step 5: Commit.**

```bash
git add supabase/migrations/20260802092000_apply_import_commands.sql supabase/tests/database/030_import_lifecycle.test.sql
git commit -m "feat(imports): add create, upload, validate and cancel import RPCs"
```

---

## Task 3: Add the atomic, single-use apply RPC

**Files:**
- Modify: `supabase/migrations/20260802092000_apply_import_commands.sql`
- Create: `supabase/tests/database/031_import_apply_atomicity.test.sql`

- [x] **Step 1: Write the failing atomicity contract.**

Create `supabase/tests/database/031_import_apply_atomicity.test.sql`:

```sql
begin;
select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'apply.platform@example.test', 'not-used', now(), now(), now()),
  ('11000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'apply.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true where id = '11000000-0000-0000-0000-000000000201';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('31000000-0000-0000-0000-000000000201', 'APPLY-A', 'Apply A', 'Owner', 'Contractor', 1, '11000000-0000-0000-0000-000000000201');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('21000000-0000-0000-0000-000000000201', '31000000-0000-0000-0000-000000000201', '11000000-0000-0000-0000-000000000202', 'system_admin', 'project_admin', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000202', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000202","role":"authenticated"}', true);

-- Job 1: two valid PML rows
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'ok.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-ok'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-ok'),
  '31000000-0000-0000-0000-000000000201/x/ok.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-ok'),
  '[
    {"row_number":1,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-1","ident_code":"ID-1","trace_number":"HT-1"}},
    {"row_number":2,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-2","ident_code":"ID-2","trace_number":"HT-2"}}
  ]'::jsonb,
  '[]'::jsonb
);

select lives_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-ok'), false)$$,
  'valid PML job applies'
);

select is(
  (select count(*)::int from public.piping_material_records
   where project_id = '31000000-0000-0000-0000-000000000201'),
  2,
  'both PML rows were written'
);

select is(
  (select applied_row_count from public.import_jobs where source_checksum = 'apply-ok'),
  2,
  'applied_row_count is recorded'
);

select is(
  (select array_length(affected_entity_ids, 1) from public.import_jobs where source_checksum = 'apply-ok'),
  2,
  'affected entity ids are recorded'
);

-- Applying twice is refused
select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-ok'), false)$$,
  'PQC10',
  'Import job has already been applied',
  'a job cannot be applied twice'
);

-- Job 2: server-side blocker, even though the client submitted no issues
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'bad.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-bad'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-bad'),
  '31000000-0000-0000-0000-000000000201/y/bad.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-bad'),
  '[
    {"row_number":1,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"MRR-9","ident_code":"ID-9","trace_number":"HT-9"}},
    {"row_number":2,"action":"create","raw_values":{},"normalized_values":{"mrr_number":"","ident_code":"","trace_number":""}}
  ]'::jsonb,
  '[]'::jsonb
);

select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-bad'), false)$$,
  'PQC13',
  'Import cannot be applied while blocking issues remain',
  'server-side validation rejects a blank required field the client did not flag'
);

select is(
  (select count(*)::int from public.piping_material_records
   where project_id = '31000000-0000-0000-0000-000000000201'),
  2,
  'the failed apply wrote no rows at all'
);

select is(
  (select count(*)::int from public.import_job_issues
   where job_id = (select id from public.import_jobs where source_checksum = 'apply-bad')
     and severity = 'blocker'),
  1,
  'the server-derived blocker was persisted for the user'
);

-- Job 3: unconfirmed conflict blocks apply
select public.create_import_job(
  '31000000-0000-0000-0000-000000000201', 'piping_material_list', 'dup.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024, 'apply-dup'
);
select public.mark_import_job_uploaded(
  (select id from public.import_jobs where source_checksum = 'apply-dup'),
  '31000000-0000-0000-0000-000000000201/z/dup.xlsx'
);
select public.record_import_validation(
  (select id from public.import_jobs where source_checksum = 'apply-dup'),
  '[{"row_number":1,"action":"update","raw_values":{},"normalized_values":{"mrr_number":"MRR-1-NEW","ident_code":"ID-1","trace_number":"HT-1"}}]'::jsonb,
  '[]'::jsonb
);

select throws_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-dup'), false)$$,
  'PQC14',
  'Import has unconfirmed overwrite conflicts',
  'an unconfirmed overwrite is refused'
);

select lives_ok(
  $$select public.apply_import_job(
      (select id from public.import_jobs where source_checksum = 'apply-dup'), true)$$,
  'the same overwrite succeeds once confirmed'
);

reset role;
select * from finish();
rollback;
```

- [x] **Step 2: Run RED.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: failure — `function public.apply_import_job(uuid, boolean) does not exist`.

- [x] **Step 3: Write the apply RPC.**

Append to `supabase/migrations/20260802092000_apply_import_commands.sql`:

```sql
-- Server-side re-validation. Returns the number of blocker and conflict issues it
-- persisted. The client's own issue list is never trusted for the apply decision.
create or replace function public.revalidate_import_job(target_job_id uuid)
returns table (blocker_count integer, conflict_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
begin
  select * into job from public.import_jobs where id = target_job_id;

  -- Drop only server-derived issues; keep the client's warnings for display.
  delete from public.import_job_issues
  where job_id = target_job_id and code like 'SRV_%';

  if job.import_type = 'piping_material_list' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'ident_code', 'blocker', 'SRV_REQUIRED',
      'Ident code, MRR number and trace number are all mandatory'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and (
        coalesce(trim(r.normalized_values ->> 'ident_code'), '') = ''
        or coalesce(trim(r.normalized_values ->> 'mrr_number'), '') = ''
        or coalesce(trim(r.normalized_values ->> 'trace_number'), '') = ''
      );

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'trace_number', 'conflict', 'SRV_OVERWRITE',
      'This ident code and trace number already exist and will be overwritten'
    from public.import_job_rows r
    join public.piping_material_records existing
      on existing.project_id = job.project_id
     and existing.ident_code = r.normalized_values ->> 'ident_code'
     and existing.trace_number = r.normalized_values ->> 'trace_number'
    where r.job_id = target_job_id and r.action <> 'skip';
  end if;

  if job.import_type = 'thickness_flange' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'service_class', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Service class does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_service_classes sc
        where sc.project_id = job.project_id
          and sc.code = r.normalized_values ->> 'service_class'
          and sc.status = 'active'
      );
  end if;

  if job.import_type = 'nde_matrix' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'service_class', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Service class does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_service_classes sc
        where sc.project_id = job.project_id
          and sc.code = r.normalized_values ->> 'service_class'
          and sc.status = 'active'
      );

    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'weld_type', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Weld type does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_weld_types wt
        where wt.project_id = job.project_id
          and wt.code = r.normalized_values ->> 'weld_type'
          and wt.status = 'active'
      );
  end if;

  if job.import_type = 'welding_procedure' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'subcontractor', 'blocker', 'SRV_UNKNOWN_REFERENCE',
      'Subcontractor does not exist in this project'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and not exists (
        select 1 from public.project_subcontractors sub
        where sub.project_id = job.project_id
          and sub.code = r.normalized_values ->> 'subcontractor'
          and sub.status = 'active'
      );
  end if;

  if job.import_type = 'welder_qualification' then
    insert into public.import_job_issues (job_id, row_number, column_name, severity, code, message)
    select
      target_job_id, r.row_number, 'wps_codes', 'blocker', 'SRV_REQUIRED',
      'A welder qualification requires at least one existing WPS'
    from public.import_job_rows r
    where r.job_id = target_job_id
      and r.action <> 'skip'
      and coalesce(jsonb_array_length(r.normalized_values -> 'wps_codes'), 0) = 0;
  end if;

  return query
  select
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'blocker'),
    (select count(*)::integer from public.import_job_issues
     where job_id = target_job_id and severity = 'conflict');
end;
$$;

create or replace function public.apply_import_job(
  target_job_id uuid,
  confirm_conflicts boolean default false
)
returns public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.import_jobs;
  blockers integer;
  conflicts integer;
  affected uuid[] := array[]::uuid[];
  written integer := 0;
  row_rec record;
  new_id uuid;
begin
  -- The row lock plus the status guard is what makes double-apply impossible even
  -- under concurrent calls.
  select * into job from public.import_jobs where id = target_job_id for update;
  if not found then
    raise exception 'Import job was not found' using errcode = 'PQC12';
  end if;

  if not public.current_user_has_capability(job.project_id, 'imports.manage') then
    raise exception 'Import management capability is required' using errcode = '42501';
  end if;

  if job.applied_at is not null or job.status = 'applied' then
    raise exception 'Import job has already been applied' using errcode = 'PQC10';
  end if;

  if job.status <> 'validated' then
    raise exception 'Import job must be validated before it can be applied' using errcode = 'PQC11';
  end if;

  select r.blocker_count, r.conflict_count into blockers, conflicts
  from public.revalidate_import_job(target_job_id) r;

  if blockers > 0 then
    raise exception 'Import cannot be applied while blocking issues remain' using errcode = 'PQC13';
  end if;

  if conflicts > 0 and not coalesce(confirm_conflicts, false) then
    raise exception 'Import has unconfirmed overwrite conflicts' using errcode = 'PQC14';
  end if;

  for row_rec in
    select * from public.import_job_rows
    where job_id = target_job_id and action <> 'skip'
    order by row_number
  loop
    if job.import_type = 'piping_material_list' then
      insert into public.piping_material_records (project_id, mrr_number, ident_code, trace_number)
      values (
        job.project_id,
        row_rec.normalized_values ->> 'mrr_number',
        row_rec.normalized_values ->> 'ident_code',
        row_rec.normalized_values ->> 'trace_number'
      )
      on conflict (project_id, ident_code, trace_number) do update
        set mrr_number = excluded.mrr_number,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'thickness_flange' then
      insert into public.project_thickness_flange_rules (
        project_id, service_class_id, diameter_inch, thickness_mm, flange_rating
      )
      values (
        job.project_id,
        (select id from public.project_service_classes
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'service_class'),
        (row_rec.normalized_values ->> 'diameter_inch')::numeric,
        (row_rec.normalized_values ->> 'thickness_mm')::numeric,
        row_rec.normalized_values ->> 'flange_rating'
      )
      on conflict (project_id, service_class_id, diameter_inch) do update
        set thickness_mm = excluded.thickness_mm,
            flange_rating = excluded.flange_rating,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'nde_matrix' then
      insert into public.nde_matrix_rules (
        project_id, service_class_id, weld_type_id, weld_location,
        rt_coverage, ut_coverage, mt_coverage, pt_coverage, pmi_coverage, ht_coverage
      )
      values (
        job.project_id,
        (select id from public.project_service_classes
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'service_class'),
        (select id from public.project_weld_types
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'weld_type'),
        row_rec.normalized_values ->> 'weld_location',
        coalesce((row_rec.normalized_values ->> 'rt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'ut_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'mt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'pt_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'pmi_coverage')::numeric, 0),
        coalesce((row_rec.normalized_values ->> 'ht_coverage')::numeric, 0)
      )
      on conflict (project_id, service_class_id, weld_type_id, weld_location) do update
        set rt_coverage = excluded.rt_coverage,
            ut_coverage = excluded.ut_coverage,
            mt_coverage = excluded.mt_coverage,
            pt_coverage = excluded.pt_coverage,
            pmi_coverage = excluded.pmi_coverage,
            ht_coverage = excluded.ht_coverage,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'welding_procedure' then
      insert into public.project_welding_procedures (
        project_id, subcontractor_id, wps_code, material_type,
        diameter_from_inch, diameter_to_inch, thickness_from_mm, thickness_to_mm
      )
      values (
        job.project_id,
        (select id from public.project_subcontractors
         where project_id = job.project_id
           and code = row_rec.normalized_values ->> 'subcontractor'),
        row_rec.normalized_values ->> 'wps_code',
        row_rec.normalized_values ->> 'material_type',
        (row_rec.normalized_values ->> 'diameter_from_inch')::numeric,
        (row_rec.normalized_values ->> 'diameter_to_inch')::numeric,
        (row_rec.normalized_values ->> 'thickness_from_mm')::numeric,
        (row_rec.normalized_values ->> 'thickness_to_mm')::numeric
      )
      on conflict (project_id, wps_code) do update
        set material_type = excluded.material_type,
            diameter_from_inch = excluded.diameter_from_inch,
            diameter_to_inch = excluded.diameter_to_inch,
            thickness_from_mm = excluded.thickness_from_mm,
            thickness_to_mm = excluded.thickness_to_mm,
            status = 'active',
            updated_at = timezone('utc', now())
      returning id into new_id;

    elsif job.import_type = 'welder_qualification' then
      select public.save_welder_qualification(
        job.project_id,
        null,
        jsonb_build_object(
          'welder_code', row_rec.normalized_values ->> 'welder_code',
          'welder_name', row_rec.normalized_values ->> 'welder_name',
          'subcontractor_code', row_rec.normalized_values ->> 'subcontractor'
        ),
        array(
          select wp.id from public.project_welding_procedures wp
          where wp.project_id = job.project_id
            and wp.wps_code in (
              select jsonb_array_elements_text(row_rec.normalized_values -> 'wps_codes')
            )
        )
      ) into new_id;

    else
      raise exception 'Unsupported import type %', job.import_type using errcode = '23514';
    end if;

    affected := affected || new_id;
    written := written + 1;
  end loop;

  update public.import_jobs
  set status = 'applied',
      applied_at = timezone('utc', now()),
      completed_at = timezone('utc', now()),
      applied_row_count = written,
      affected_entity_ids = affected,
      conflicts_confirmed = coalesce(confirm_conflicts, false)
  where id = target_job_id
  returning * into job;

  insert into public.audit_events(
    project_id, actor_id, entity_type, entity_id, action, before_state, after_state
  ) values (
    job.project_id, auth.uid(), 'import_jobs', job.id,
    'apply_import_job', null, to_jsonb(job)
  );

  return job;
end;
$$;

revoke all on function
  public.revalidate_import_job(uuid),
  public.apply_import_job(uuid, boolean)
from public, anon;

grant execute on function
  public.revalidate_import_job(uuid),
  public.apply_import_job(uuid, boolean)
to authenticated;
```

- [x] **Step 4: Add the WPS uniqueness the apply RPC depends on.**

`on conflict (project_id, wps_code)` requires a matching unique constraint. Append to the same
migration:

```sql
create unique index if not exists project_welding_procedures_project_code_key
  on public.project_welding_procedures (project_id, wps_code);
```

- [x] **Step 5: Run GREEN.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `Result: PASS`, 11 files, `031_import_apply_atomicity.test.sql .. ok`.

If `save_welder_qualification` has a different signature than
`(uuid, uuid, jsonb, uuid[])`, read
`supabase/migrations/20260801091000_referential_invariants.sql` and adjust the call, then
re-run. Do not change the test to match.

- [x] **Step 6: Commit.**

```bash
git add supabase/migrations/20260802092000_apply_import_commands.sql supabase/tests/database/031_import_apply_atomicity.test.sql
git commit -m "feat(imports): add atomic single-use apply with server-side revalidation"
```

---

## Task 4: Add the private imports bucket and fix the branding policy mine

**Files:**
- Create: `supabase/migrations/20260802091000_import_storage_policies.sql`
- Create: `supabase/tests/database/032_import_storage_policies.test.sql`

The `project-branding` policies from Track 02 cast `(storage.foldername(name))[1]::uuid` inside
`USING`. PostgreSQL does not guarantee `AND` short-circuits, so adding a second bucket whose
first path segment is not a UUID can make that cast raise
`invalid input syntax for type uuid` on unrelated objects. Those policies are also missing
`to authenticated`, so they currently apply to `PUBLIC` including `anon`. Both are fixed here.

- [x] **Step 1: Write the failing policy contract.**

Create `supabase/tests/database/032_import_storage_policies.test.sql`:

```sql
begin;
select plan(8);

select is(
  (select public from storage.buckets where id = 'project-imports'),
  false,
  'project-imports bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'project-imports'),
  10485760::bigint,
  'project-imports bucket has a 10 MB limit'
);

-- Every branding and imports policy must be scoped to authenticated, not PUBLIC.
select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects'
     and p.polname like '%project branding%'
     and p.polroles = '{0}'),
  0,
  'no project-branding policy is left applying to PUBLIC'
);

select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects'
     and p.polname like '%project import%'
     and p.polroles = '{0}'),
  0,
  'no project-imports policy applies to PUBLIC'
);

-- The path helper must never raise on a non-uuid first segment.
select lives_ok(
  $$select public.storage_path_project_id('not-a-uuid/whatever.xlsx')$$,
  'the path helper tolerates a non-uuid first segment'
);

select is(
  public.storage_path_project_id('not-a-uuid/whatever.xlsx'),
  null,
  'a non-uuid first segment resolves to null'
);

select is(
  public.storage_path_project_id('31000000-0000-0000-0000-000000000201/job/file.xlsx'),
  '31000000-0000-0000-0000-000000000201'::uuid,
  'a uuid first segment resolves to that project'
);

select is(
  (select count(*)::int
   from pg_policy p
   join pg_class c on c.oid = p.polrelid
   where c.relname = 'objects' and p.polname like '%project import%'),
  4,
  'project-imports has select, insert, update and delete policies'
);

select * from finish();
rollback;
```

- [x] **Step 2: Run RED.**

Run:
```bash
/opt/homebrew/bin/supabase test db
```
Expected: failure — `function public.storage_path_project_id(text) does not exist`.

- [x] **Step 3: Write the migration.**

Create `supabase/migrations/20260802091000_import_storage_policies.sql`:

```sql
-- A cast inside a policy USING clause can raise on objects that belong to another
-- bucket, because AND is not guaranteed to short-circuit. This helper returns null
-- instead of raising, so one bucket's path convention can never break another's policy.
create or replace function public.storage_path_project_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  if first_segment is null then
    return null;
  end if;
  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.storage_path_project_id(text) from public;
grant execute on function public.storage_path_project_id(text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-imports',
  'project-imports',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Replace the Track 02 branding policies: add `to authenticated` and drop the raw cast.
drop policy if exists "Allow project members to read project branding objects" on storage.objects;
drop policy if exists "Allow project admins to upload project branding objects" on storage.objects;
drop policy if exists "Allow project admins to update project branding objects" on storage.objects;
drop policy if exists "Allow project admins to delete project branding objects" on storage.objects;

create policy "Read project branding objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.view')
  );

create policy "Insert project branding objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

create policy "Update project branding objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  )
  with check (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

create policy "Delete project branding objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-branding'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'project.definition.manage')
  );

-- project-imports policies
create policy "Read project import objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.view')
  );

create policy "Insert project import objects"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );

create policy "Update project import objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  )
  with check (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );

create policy "Delete project import objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-imports'
    and public.current_user_has_capability(
      public.storage_path_project_id(name), 'imports.manage')
  );
```

Note: `current_user_has_capability(null, ...)` returns `false`, because its `where p.id = null`
matches no row. A null project id therefore fails closed.

- [x] **Step 4: Run GREEN.**

Run:
```bash
/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db
```
Expected: `Result: PASS`, 12 files.

- [x] **Step 5: Commit.**

```bash
git add supabase/migrations/20260802091000_import_storage_policies.sql supabase/tests/database/032_import_storage_policies.test.sql
git commit -m "feat(imports): add private project-imports bucket and safe storage path helper"
```

---

## Task 5: Regenerate database types

**Files:**
- Modify: `lib/supabase/database.types.ts`

- [x] **Step 1: Regenerate.**

Run:
```bash
/opt/homebrew/bin/supabase gen types typescript --local > lib/supabase/database.types.ts
```

- [x] **Step 2: Verify the new surface exists.**

Run:
```bash
grep -c "import_job_rows\|import_job_issues\|apply_import_job\|create_import_job" lib/supabase/database.types.ts
```
Expected: a number `>= 4`.

- [x] **Step 3: Typecheck.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`.

- [x] **Step 4: Commit.**

```bash
git add lib/supabase/database.types.ts
git commit -m "chore(imports): regenerate database types for import platform"
```

### Checkpoint 1 — Gate A complete

- [x] Run `npm run verify`. Expected: exit `0`, 12 pgTAP files pass.
- [x] Report to the reviewer: number of pgTAP assertions, and confirmation that
      `supabase db reset` was used at least once so the migrations were proven from empty.

---

# Gate B — Domain, parsers and templates

## Task 6: Model the import job lifecycle

**Files:**
- Create: `modules/imports/domain/import-job.ts`
- Create: `modules/imports/domain/import-job.test.ts`

- [x] **Step 1: Write the failing test.**

Create `modules/imports/domain/import-job.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  IMPORT_JOB_STATUSES,
  isTerminalStatus,
  canTransition,
  canApply,
} from "./import-job"

function run() {
  assert.equal(IMPORT_JOB_STATUSES.length, 8)

  assert.equal(isTerminalStatus("applied"), true)
  assert.equal(isTerminalStatus("failed"), true)
  assert.equal(isTerminalStatus("canceled"), true)
  assert.equal(isTerminalStatus("validated"), false)

  assert.equal(canTransition("draft", "uploaded"), true)
  assert.equal(canTransition("uploaded", "validated"), true)
  assert.equal(canTransition("validated", "applying"), true)
  assert.equal(canTransition("applied", "validating"), false)
  assert.equal(canTransition("canceled", "uploaded"), false)

  // Apply is only possible from validated, with no blockers, and conflicts confirmed.
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 0, conflictsConfirmed: false }),
    true
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 1, conflictCount: 0, conflictsConfirmed: true }),
    false
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 2, conflictsConfirmed: false }),
    false
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 2, conflictsConfirmed: true }),
    true
  )
  assert.equal(
    canApply({ status: "applied", blockerCount: 0, conflictCount: 0, conflictsConfirmed: true }),
    false
  )

  console.log("All import-job.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/domain/import-job.test.ts
```
Expected: `Cannot find module './import-job'`.

- [x] **Step 3: Implement.**

Create `modules/imports/domain/import-job.ts`:

```ts
export const IMPORT_JOB_STATUSES = [
  "draft",
  "uploaded",
  "validating",
  "validated",
  "applying",
  "applied",
  "failed",
  "canceled",
] as const

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number]

const TERMINAL_STATUSES: ReadonlySet<ImportJobStatus> = new Set([
  "applied",
  "failed",
  "canceled",
])

const ALLOWED_TRANSITIONS: Record<ImportJobStatus, readonly ImportJobStatus[]> = {
  draft: ["uploaded", "canceled", "failed"],
  uploaded: ["validating", "validated", "canceled", "failed"],
  validating: ["validated", "failed", "canceled"],
  validated: ["validating", "applying", "canceled", "failed"],
  applying: ["applied", "failed"],
  applied: [],
  failed: [],
  canceled: [],
}

export interface ImportJob {
  id: string
  projectId: string
  importType: string
  status: ImportJobStatus
  sourceFileName: string | null
  sourceMediaType: string | null
  sourceSizeBytes: number | null
  sourceChecksum: string | null
  storagePath: string | null
  conflictsConfirmed: boolean
  appliedRowCount: number
  affectedEntityIds: string[]
  failureReason: string | null
  createdAt: string
  validatedAt: string | null
  appliedAt: string | null
  canceledAt: string | null
}

export function isTerminalStatus(status: ImportJobStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function canTransition(from: ImportJobStatus, to: ImportJobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export interface ApplyGate {
  status: ImportJobStatus
  blockerCount: number
  conflictCount: number
  conflictsConfirmed: boolean
}

export function canApply(gate: ApplyGate): boolean {
  if (gate.status !== "validated") return false
  if (gate.blockerCount > 0) return false
  if (gate.conflictCount > 0 && !gate.conflictsConfirmed) return false
  return true
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/domain/import-job.test.ts
```
Expected: `All import-job.test.ts assertions passed!` and exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/domain/import-job.ts modules/imports/domain/import-job.test.ts
git commit -m "feat(imports): add import job lifecycle domain model"
```

---

## Task 7: Model import issues

**Files:**
- Create: `modules/imports/domain/import-issue.ts`
- Create: `modules/imports/domain/import-issue.test.ts`

- [x] **Step 1: Write the failing test.**

Create `modules/imports/domain/import-issue.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  summarizeIssues,
  issuesForRow,
  highestSeverity,
} from "./import-issue"
import type { ImportIssue } from "./import-issue"

const ISSUES: ImportIssue[] = [
  { rowNumber: 1, columnName: "ident_code", severity: "blocker", code: "REQUIRED", message: "Ident code is required" },
  { rowNumber: 2, columnName: "trace_number", severity: "conflict", code: "OVERWRITE", message: "Will overwrite" },
  { rowNumber: 2, columnName: null, severity: "warning", code: "NO_WPS", message: "No covering WPS" },
  { rowNumber: null, columnName: null, severity: "warning", code: "SHEET", message: "Extra sheet ignored" },
]

function run() {
  const summary = summarizeIssues(ISSUES)
  assert.equal(summary.blockerCount, 1)
  assert.equal(summary.conflictCount, 1)
  assert.equal(summary.warningCount, 2)

  assert.equal(issuesForRow(ISSUES, 2).length, 2)
  assert.equal(issuesForRow(ISSUES, 3).length, 0)

  assert.equal(highestSeverity(issuesForRow(ISSUES, 1)), "blocker")
  assert.equal(highestSeverity(issuesForRow(ISSUES, 2)), "conflict")
  assert.equal(highestSeverity([]), null)

  console.log("All import-issue.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/domain/import-issue.test.ts
```
Expected: `Cannot find module './import-issue'`.

- [x] **Step 3: Implement.**

Create `modules/imports/domain/import-issue.ts`:

```ts
export type ImportIssueSeverity = "blocker" | "conflict" | "warning"

export interface ImportIssue {
  rowNumber: number | null
  columnName: string | null
  severity: ImportIssueSeverity
  code: string
  message: string
}

export interface ImportIssueSummary {
  blockerCount: number
  conflictCount: number
  warningCount: number
}

const SEVERITY_RANK: Record<ImportIssueSeverity, number> = {
  blocker: 3,
  conflict: 2,
  warning: 1,
}

export function summarizeIssues(issues: readonly ImportIssue[]): ImportIssueSummary {
  const summary: ImportIssueSummary = { blockerCount: 0, conflictCount: 0, warningCount: 0 }
  for (const issue of issues) {
    if (issue.severity === "blocker") summary.blockerCount += 1
    else if (issue.severity === "conflict") summary.conflictCount += 1
    else summary.warningCount += 1
  }
  return summary
}

export function issuesForRow(issues: readonly ImportIssue[], rowNumber: number): ImportIssue[] {
  return issues.filter((issue) => issue.rowNumber === rowNumber)
}

export function highestSeverity(issues: readonly ImportIssue[]): ImportIssueSeverity | null {
  let best: ImportIssueSeverity | null = null
  for (const issue of issues) {
    if (best === null || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[best]) {
      best = issue.severity
    }
  }
  return best
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/domain/import-issue.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/domain/import-issue.ts modules/imports/domain/import-issue.test.ts
git commit -m "feat(imports): add import issue severity model"
```

---

## Task 8: Define import types, columns and templates

**Files:**
- Create: `modules/imports/domain/import-type.ts`
- Create: `modules/imports/domain/import-type.test.ts`

- [x] **Step 1: Write the failing test.**

Create `modules/imports/domain/import-type.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  IMPORT_TYPES,
  getImportTypeDefinition,
  templateHeaderRow,
  requiredColumnKeys,
} from "./import-type"

function run() {
  assert.deepEqual(
    [...IMPORT_TYPES],
    [
      "piping_material_list",
      "welding_procedure",
      "welder_qualification",
      "thickness_flange",
      "nde_matrix",
    ]
  )

  const pml = getImportTypeDefinition("piping_material_list")
  assert.equal(pml.label, "Project Piping Material List")
  assert.deepEqual(pml.naturalKey, ["ident_code", "trace_number"])
  assert.deepEqual(templateHeaderRow("piping_material_list"), [
    "MRR Number",
    "Ident Code",
    "Trace Number",
  ])
  assert.deepEqual(requiredColumnKeys("piping_material_list"), [
    "mrr_number",
    "ident_code",
    "trace_number",
  ])

  // Dossier 11.10: all four thickness/flange fields are mandatory.
  assert.deepEqual(requiredColumnKeys("thickness_flange"), [
    "service_class",
    "diameter_inch",
    "thickness_mm",
    "flange_rating",
  ])

  assert.throws(() => getImportTypeDefinition("nope" as never), /Unknown import type/)

  console.log("All import-type.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/domain/import-type.test.ts
```
Expected: `Cannot find module './import-type'`.

- [x] **Step 3: Implement.**

Create `modules/imports/domain/import-type.ts`:

```ts
export const IMPORT_TYPES = [
  "piping_material_list",
  "welding_procedure",
  "welder_qualification",
  "thickness_flange",
  "nde_matrix",
] as const

export type ImportType = (typeof IMPORT_TYPES)[number]

export type ImportColumnKind = "text" | "number" | "textList"

export interface ImportColumn {
  key: string
  header: string
  required: boolean
  kind: ImportColumnKind
}

export interface ImportTypeDefinition {
  importType: ImportType
  label: string
  columns: readonly ImportColumn[]
  naturalKey: readonly string[]
}

const DEFINITIONS: Record<ImportType, ImportTypeDefinition> = {
  piping_material_list: {
    importType: "piping_material_list",
    label: "Project Piping Material List",
    naturalKey: ["ident_code", "trace_number"],
    columns: [
      { key: "mrr_number", header: "MRR Number", required: true, kind: "text" },
      { key: "ident_code", header: "Ident Code", required: true, kind: "text" },
      { key: "trace_number", header: "Trace Number", required: true, kind: "text" },
    ],
  },
  welding_procedure: {
    importType: "welding_procedure",
    label: "Welding Procedure Specification",
    naturalKey: ["wps_code"],
    columns: [
      { key: "wps_code", header: "WPS Code", required: true, kind: "text" },
      { key: "subcontractor", header: "Subcontractor", required: true, kind: "text" },
      { key: "material_type", header: "Material Type", required: true, kind: "text" },
      { key: "diameter_from_inch", header: "Diameter From", required: true, kind: "number" },
      { key: "diameter_to_inch", header: "Diameter To", required: true, kind: "number" },
      { key: "thickness_from_mm", header: "Thickness From", required: true, kind: "number" },
      { key: "thickness_to_mm", header: "Thickness To", required: true, kind: "number" },
    ],
  },
  welder_qualification: {
    importType: "welder_qualification",
    label: "Welder Qualification",
    naturalKey: ["welder_code"],
    columns: [
      { key: "welder_code", header: "Welder Code", required: true, kind: "text" },
      { key: "welder_name", header: "Welder Name", required: true, kind: "text" },
      { key: "subcontractor", header: "Subcontractor", required: true, kind: "text" },
      { key: "wps_codes", header: "WPS Codes", required: true, kind: "textList" },
    ],
  },
  thickness_flange: {
    importType: "thickness_flange",
    label: "Weld Thickness and Flange Rating",
    naturalKey: ["service_class", "diameter_inch"],
    columns: [
      { key: "service_class", header: "Service Class", required: true, kind: "text" },
      { key: "diameter_inch", header: "Dia Inch", required: true, kind: "number" },
      { key: "thickness_mm", header: "Thickness", required: true, kind: "number" },
      { key: "flange_rating", header: "Flange Rating", required: true, kind: "text" },
    ],
  },
  nde_matrix: {
    importType: "nde_matrix",
    label: "NDE Matrix",
    naturalKey: ["service_class", "weld_type", "weld_location"],
    columns: [
      { key: "service_class", header: "Service Class", required: true, kind: "text" },
      { key: "weld_type", header: "Weld Type", required: true, kind: "text" },
      { key: "weld_location", header: "Weld Location", required: true, kind: "text" },
      { key: "rt_coverage", header: "RT %", required: false, kind: "number" },
      { key: "ut_coverage", header: "UT %", required: false, kind: "number" },
      { key: "mt_coverage", header: "MT %", required: false, kind: "number" },
      { key: "pt_coverage", header: "PT %", required: false, kind: "number" },
      { key: "pmi_coverage", header: "PMI %", required: false, kind: "number" },
      { key: "ht_coverage", header: "HT %", required: false, kind: "number" },
    ],
  },
}

export function getImportTypeDefinition(importType: ImportType): ImportTypeDefinition {
  const definition = DEFINITIONS[importType]
  if (!definition) throw new Error(`Unknown import type: ${importType}`)
  return definition
}

export function templateHeaderRow(importType: ImportType): string[] {
  return getImportTypeDefinition(importType).columns.map((column) => column.header)
}

export function requiredColumnKeys(importType: ImportType): string[] {
  return getImportTypeDefinition(importType)
    .columns.filter((column) => column.required)
    .map((column) => column.key)
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/domain/import-type.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/domain/import-type.ts modules/imports/domain/import-type.test.ts
git commit -m "feat(imports): define import type catalog and template headers"
```

---

## Task 9: Build the generic row parser

**Files:**
- Create: `modules/imports/domain/parsers/registry.ts`
- Create: `modules/imports/domain/parsers/registry.test.ts`

One generic parser driven by `ImportTypeDefinition` replaces five hand-written parsers. Each
import type then needs only its type-specific rules, added in Task 10.

- [x] **Step 1: Write the failing test.**

Create `modules/imports/domain/parsers/registry.test.ts`:

```ts
import assert from "node:assert/strict"
import { parseSheet } from "./registry"

function run() {
  // Happy path: headers map to keys, values normalize by kind.
  const ok = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "ID-1", "HT-1"],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(ok.rows.length, 2)
  assert.equal(ok.rows[0].rowNumber, 1)
  assert.deepEqual(ok.rows[0].normalizedValues, {
    mrr_number: "MRR-1",
    ident_code: "ID-1",
    trace_number: "HT-1",
  })
  assert.equal(ok.issues.length, 0)

  // A missing required header is a sheet-level blocker with a null row number.
  const missingHeader = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code"],
    ["MRR-1", "ID-1"],
  ])
  assert.equal(missingHeader.issues.length, 1)
  assert.equal(missingHeader.issues[0].severity, "blocker")
  assert.equal(missingHeader.issues[0].code, "MISSING_COLUMN")
  assert.equal(missingHeader.issues[0].rowNumber, null)
  assert.equal(missingHeader.rows.length, 0)

  // A blank required cell is a row-level blocker, but parsing continues.
  const blankCell = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "", "HT-1"],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(blankCell.rows.length, 2)
  assert.equal(blankCell.issues.length, 1)
  assert.equal(blankCell.issues[0].severity, "blocker")
  assert.equal(blankCell.issues[0].rowNumber, 1)
  assert.equal(blankCell.issues[0].columnName, "ident_code")

  // Non-numeric input in a number column is a blocker, not a silent NaN.
  const badNumber = parseSheet("thickness_flange", [
    ["Service Class", "Dia Inch", "Thickness", "Flange Rating"],
    ["SC-1", "abc", "5.5", "150#"],
  ])
  assert.equal(badNumber.issues.some((i) => i.code === "NOT_A_NUMBER"), true)
  assert.equal(badNumber.issues[0].severity, "blocker")

  // textList splits on comma and trims.
  const list = parseSheet("welder_qualification", [
    ["Welder Code", "Welder Name", "Subcontractor", "WPS Codes"],
    ["W-1", "Ivan", "SUB-A", "WPS-1, WPS-2"],
  ])
  assert.deepEqual(list.rows[0].normalizedValues.wps_codes, ["WPS-1", "WPS-2"])

  // Fully blank lines are skipped, not reported as errors.
  const blankLine = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["", "", ""],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(blankLine.rows.length, 1)
  assert.equal(blankLine.rows[0].normalizedValues.ident_code, "ID-2")
  assert.equal(blankLine.issues.length, 0)

  // An empty sheet is a sheet-level blocker.
  const empty = parseSheet("piping_material_list", [])
  assert.equal(empty.issues[0].code, "EMPTY_SHEET")
  assert.equal(empty.issues[0].severity, "blocker")

  console.log("All registry.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/domain/parsers/registry.test.ts
```
Expected: `Cannot find module './registry'`.

- [x] **Step 3: Implement.**

Create `modules/imports/domain/parsers/registry.ts`:

```ts
import { getImportTypeDefinition, type ImportType } from "../import-type"
import type { ImportIssue } from "../import-issue"

export interface ParsedRow {
  rowNumber: number
  rawValues: Record<string, string>
  normalizedValues: Record<string, unknown>
  action: "create" | "update" | "unchanged" | "skip"
}

export interface ParseOutcome {
  rows: ParsedRow[]
  issues: ImportIssue[]
}

export type SheetMatrix = readonly (readonly unknown[])[]

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

export function parseSheet(importType: ImportType, sheet: SheetMatrix): ParseOutcome {
  const definition = getImportTypeDefinition(importType)
  const issues: ImportIssue[] = []

  if (sheet.length === 0) {
    issues.push({
      rowNumber: null,
      columnName: null,
      severity: "blocker",
      code: "EMPTY_SHEET",
      message: "The selected sheet is empty.",
    })
    return { rows: [], issues }
  }

  const headerRow = sheet[0].map(cellToString)
  const headerIndexByKey = new Map<string, number>()

  for (const column of definition.columns) {
    const index = headerRow.findIndex(
      (header) => header.toLowerCase() === column.header.toLowerCase()
    )
    if (index === -1) {
      if (column.required) {
        issues.push({
          rowNumber: null,
          columnName: column.key,
          severity: "blocker",
          code: "MISSING_COLUMN",
          message: `The required column "${column.header}" is missing from the sheet.`,
        })
      }
      continue
    }
    headerIndexByKey.set(column.key, index)
  }

  if (issues.some((issue) => issue.code === "MISSING_COLUMN")) {
    return { rows: [], issues }
  }

  const rows: ParsedRow[] = []
  let rowNumber = 0

  for (let lineIndex = 1; lineIndex < sheet.length; lineIndex++) {
    const line = sheet[lineIndex]
    const rawValues: Record<string, string> = {}
    let hasAnyValue = false

    for (const column of definition.columns) {
      const index = headerIndexByKey.get(column.key)
      const raw = index === undefined ? "" : cellToString(line[index])
      rawValues[column.key] = raw
      if (raw !== "") hasAnyValue = true
    }

    if (!hasAnyValue) continue

    rowNumber += 1
    const normalizedValues: Record<string, unknown> = {}

    for (const column of definition.columns) {
      const raw = rawValues[column.key]

      if (raw === "") {
        if (column.required) {
          issues.push({
            rowNumber,
            columnName: column.key,
            severity: "blocker",
            code: "REQUIRED",
            message: `"${column.header}" is mandatory.`,
          })
        }
        normalizedValues[column.key] = column.kind === "textList" ? [] : null
        continue
      }

      if (column.kind === "number") {
        const parsed = Number(raw)
        if (!Number.isFinite(parsed)) {
          issues.push({
            rowNumber,
            columnName: column.key,
            severity: "blocker",
            code: "NOT_A_NUMBER",
            message: `"${column.header}" must be numeric, received "${raw}".`,
          })
          normalizedValues[column.key] = null
          continue
        }
        normalizedValues[column.key] = parsed
        continue
      }

      if (column.kind === "textList") {
        normalizedValues[column.key] = raw
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "")
        continue
      }

      normalizedValues[column.key] = raw
    }

    rows.push({ rowNumber, rawValues, normalizedValues, action: "create" })
  }

  return { rows, issues }
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/domain/parsers/registry.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/domain/parsers/registry.ts modules/imports/domain/parsers/registry.test.ts
git commit -m "feat(imports): add generic definition-driven sheet parser"
```

---

## Task 10: Add per-type domain rules

**Files:**
- Create: `modules/imports/domain/parsers/rules.ts`
- Create: `modules/imports/domain/parsers/rules.test.ts`

The generic parser handles shape. These rules handle the dossier's type-specific semantics that
shape alone cannot express.

- [x] **Step 1: Write the failing test.**

Create `modules/imports/domain/parsers/rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { applyTypeRules } from "./rules"
import type { ParsedRow } from "./registry"

function row(rowNumber: number, values: Record<string, unknown>): ParsedRow {
  return { rowNumber, rawValues: {}, normalizedValues: values, action: "create" }
}

function run() {
  // Dossier 11.6: WPS ranges must satisfy to >= from.
  const wps = applyTypeRules("welding_procedure", [
    row(1, { diameter_from_inch: 2, diameter_to_inch: 1, thickness_from_mm: 3, thickness_to_mm: 9 }),
    row(2, { diameter_from_inch: 1, diameter_to_inch: 4, thickness_from_mm: 9, thickness_to_mm: 3 }),
    row(3, { diameter_from_inch: 1, diameter_to_inch: 4, thickness_from_mm: 3, thickness_to_mm: 9 }),
  ])
  assert.equal(wps.length, 2)
  assert.equal(wps[0].rowNumber, 1)
  assert.equal(wps[0].columnName, "diameter_to_inch")
  assert.equal(wps[0].severity, "blocker")
  assert.equal(wps[1].rowNumber, 2)
  assert.equal(wps[1].columnName, "thickness_to_mm")

  // Dossier 11.9: coverages are percentages.
  const nde = applyTypeRules("nde_matrix", [
    row(1, { weld_location: "shop", rt_coverage: 120 }),
    row(2, { weld_location: "field", rt_coverage: 100 }),
  ])
  assert.equal(nde.length, 1)
  assert.equal(nde[0].code, "OUT_OF_RANGE")
  assert.equal(nde[0].rowNumber, 1)

  // weld_location must be one of the three supported values.
  const badLocation = applyTypeRules("nde_matrix", [row(1, { weld_location: "orbital" })])
  assert.equal(badLocation.some((i) => i.code === "INVALID_VALUE"), true)

  // Dossier 11.10: thickness and diameter must be positive.
  const thickness = applyTypeRules("thickness_flange", [
    row(1, { diameter_inch: 0, thickness_mm: 5 }),
    row(2, { diameter_inch: 6, thickness_mm: -1 }),
  ])
  assert.equal(thickness.length, 2)
  assert.equal(thickness[0].severity, "blocker")

  // Duplicate natural keys inside one file are a blocker, not a silent last-wins.
  const dupes = applyTypeRules("piping_material_list", [
    row(1, { ident_code: "ID-1", trace_number: "HT-1" }),
    row(2, { ident_code: "ID-1", trace_number: "HT-1" }),
  ])
  assert.equal(dupes.length, 1)
  assert.equal(dupes[0].code, "DUPLICATE_IN_FILE")
  assert.equal(dupes[0].rowNumber, 2)

  // PML rows with no type-specific defects produce nothing.
  assert.equal(applyTypeRules("piping_material_list", [row(1, { ident_code: "A", trace_number: "B" })]).length, 0)

  console.log("All rules.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/domain/parsers/rules.test.ts
```
Expected: `Cannot find module './rules'`.

- [x] **Step 3: Implement.**

Create `modules/imports/domain/parsers/rules.ts`:

```ts
import { getImportTypeDefinition, type ImportType } from "../import-type"
import type { ImportIssue } from "../import-issue"
import type { ParsedRow } from "./registry"

const WELD_LOCATIONS = new Set(["shop", "assembly", "field"])

const COVERAGE_KEYS = [
  "rt_coverage",
  "ut_coverage",
  "mt_coverage",
  "pt_coverage",
  "pmi_coverage",
  "ht_coverage",
] as const

function numberAt(row: ParsedRow, key: string): number | null {
  const value = row.normalizedValues[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function checkRange(
  row: ParsedRow,
  fromKey: string,
  toKey: string,
  label: string,
  issues: ImportIssue[]
): void {
  const from = numberAt(row, fromKey)
  const to = numberAt(row, toKey)
  if (from === null || to === null) return
  if (to < from) {
    issues.push({
      rowNumber: row.rowNumber,
      columnName: toKey,
      severity: "blocker",
      code: "INVALID_RANGE",
      message: `${label} "to" must be greater than or equal to "from".`,
    })
  }
}

function checkPositive(row: ParsedRow, key: string, label: string, issues: ImportIssue[]): void {
  const value = numberAt(row, key)
  if (value === null) return
  if (value <= 0) {
    issues.push({
      rowNumber: row.rowNumber,
      columnName: key,
      severity: "blocker",
      code: "OUT_OF_RANGE",
      message: `${label} must be greater than zero.`,
    })
  }
}

function checkDuplicateNaturalKeys(
  importType: ImportType,
  rows: readonly ParsedRow[],
  issues: ImportIssue[]
): void {
  const naturalKey = getImportTypeDefinition(importType).naturalKey
  const seen = new Set<string>()

  for (const row of rows) {
    const parts = naturalKey.map((key) => String(row.normalizedValues[key] ?? ""))
    if (parts.some((part) => part === "")) continue
    const composite = parts.join(" ")
    if (seen.has(composite)) {
      issues.push({
        rowNumber: row.rowNumber,
        columnName: naturalKey[0],
        severity: "blocker",
        code: "DUPLICATE_IN_FILE",
        message: `This ${naturalKey.join(" + ")} appears more than once in the file.`,
      })
      continue
    }
    seen.add(composite)
  }
}

export function applyTypeRules(
  importType: ImportType,
  rows: readonly ParsedRow[]
): ImportIssue[] {
  const issues: ImportIssue[] = []

  for (const row of rows) {
    if (importType === "welding_procedure") {
      checkRange(row, "diameter_from_inch", "diameter_to_inch", "Diameter", issues)
      checkRange(row, "thickness_from_mm", "thickness_to_mm", "Thickness", issues)
    }

    if (importType === "thickness_flange") {
      checkPositive(row, "diameter_inch", "Dia Inch", issues)
      checkPositive(row, "thickness_mm", "Thickness", issues)
    }

    if (importType === "nde_matrix") {
      const location = row.normalizedValues.weld_location
      if (typeof location === "string" && location !== "" && !WELD_LOCATIONS.has(location)) {
        issues.push({
          rowNumber: row.rowNumber,
          columnName: "weld_location",
          severity: "blocker",
          code: "INVALID_VALUE",
          message: 'Weld Location must be one of "shop", "assembly" or "field".',
        })
      }
      for (const key of COVERAGE_KEYS) {
        const value = numberAt(row, key)
        if (value === null) continue
        if (value < 0 || value > 100) {
          issues.push({
            rowNumber: row.rowNumber,
            columnName: key,
            severity: "blocker",
            code: "OUT_OF_RANGE",
            message: "Coverage must be between 0 and 100.",
          })
        }
      }
    }
  }

  checkDuplicateNaturalKeys(importType, rows, issues)

  return issues
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/domain/parsers/rules.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/domain/parsers/rules.ts modules/imports/domain/parsers/rules.test.ts
git commit -m "feat(imports): add per-type domain validation rules from the dossier"
```

### Checkpoint 2 — Gate B domain complete

- [x] Run `npm run verify`. Expected: exit `0`.
- [x] Confirm no file under `modules/imports/domain/` imports `@supabase`, `react`, or `@/store`:

```bash
grep -rn "@supabase\|from \"react\"\|@/store" modules/imports/domain/
```
Expected: no output.

---

# Gate C — Infrastructure and UI

## Task 11: Isolate the XLSX boundary

**Files:**
- Create: `modules/imports/infrastructure/xlsx-workbook.ts`
- Create: `modules/imports/infrastructure/xlsx-workbook.test.ts`

`xlsx` is touched in exactly one file so the domain stays library-free and the parser can be
tested with plain arrays.

- [x] **Step 1: Write the failing test.**

Create `modules/imports/infrastructure/xlsx-workbook.test.ts`:

```ts
import assert from "node:assert/strict"
import { buildTemplateWorkbook, readFirstSheetMatrix } from "./xlsx-workbook"

async function run() {
  const bytes = buildTemplateWorkbook("piping_material_list")
  assert.ok(bytes.byteLength > 0, "template workbook has content")

  const matrix = readFirstSheetMatrix(bytes)
  assert.deepEqual(matrix[0], ["MRR Number", "Ident Code", "Trace Number"])

  // Round-trip a data row through the same boundary.
  const withData = buildTemplateWorkbook("thickness_flange")
  const headers = readFirstSheetMatrix(withData)[0]
  assert.deepEqual(headers, ["Service Class", "Dia Inch", "Thickness", "Flange Rating"])

  console.log("All xlsx-workbook.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/infrastructure/xlsx-workbook.test.ts
```
Expected: `Cannot find module './xlsx-workbook'`.

- [x] **Step 3: Implement.**

Create `modules/imports/infrastructure/xlsx-workbook.ts`:

```ts
import * as XLSX from "xlsx"
import { templateHeaderRow, type ImportType } from "../domain/import-type"
import type { SheetMatrix } from "../domain/parsers/registry"

export function buildTemplateWorkbook(importType: ImportType): Uint8Array {
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaderRow(importType)])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as Uint8Array
}

export function readFirstSheetMatrix(bytes: ArrayBuffer | Uint8Array): SheetMatrix {
  const workbook = XLSX.read(bytes, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const worksheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
}

export async function computeChecksum(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/infrastructure/xlsx-workbook.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/infrastructure/xlsx-workbook.ts modules/imports/infrastructure/xlsx-workbook.test.ts
git commit -m "feat(imports): isolate xlsx access behind a single boundary module"
```

---

## Task 12: Map import errors to user-facing text

**Files:**
- Create: `modules/imports/infrastructure/supabase-import-errors.ts`
- Create: `modules/imports/infrastructure/supabase-import-errors.test.ts`

Roadmap T3 forbids showing raw parser or SQL errors to the user.

- [x] **Step 1: Write the failing test.**

Create `modules/imports/infrastructure/supabase-import-errors.test.ts`:

```ts
import assert from "node:assert/strict"
import { mapSupabaseImportError } from "./supabase-import-errors"

function run() {
  assert.equal(
    mapSupabaseImportError({ code: "PQC10" }),
    "This import has already been applied. Start a new import to load the file again."
  )
  assert.equal(
    mapSupabaseImportError({ code: "PQC13" }),
    "Some rows still have blocking errors. Fix them in the source file and upload it again."
  )
  assert.equal(
    mapSupabaseImportError({ code: "PQC14" }),
    "This import overwrites existing records. Confirm the overwrite to continue."
  )
  assert.equal(
    mapSupabaseImportError({ code: "42501" }),
    "You do not have permission to manage imports for this project."
  )

  // Raw SQL and parser detail must never reach the user.
  const raw = mapSupabaseImportError({
    code: "42P01",
    message: 'relation "public.secret_table" does not exist',
  })
  assert.equal(raw, "The import could not be completed. Please try again.")
  assert.equal(raw.includes("secret_table"), false)
  assert.equal(mapSupabaseImportError(null).includes("relation"), false)

  console.log("All supabase-import-errors.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/infrastructure/supabase-import-errors.test.ts
```
Expected: `Cannot find module './supabase-import-errors'`.

- [x] **Step 3: Implement.**

Create `modules/imports/infrastructure/supabase-import-errors.ts`:

```ts
const GENERIC = "The import could not be completed. Please try again."

export function mapSupabaseImportError(
  error: { code?: string; message?: string } | null | undefined
): string {
  if (!error) return GENERIC

  switch (error.code) {
    case "PQC10":
      return "This import has already been applied. Start a new import to load the file again."
    case "PQC11":
      return "This import is not in a state where that action is allowed."
    case "PQC12":
      return "The import job could not be found."
    case "PQC13":
      return "Some rows still have blocking errors. Fix them in the source file and upload it again."
    case "PQC14":
      return "This import overwrites existing records. Confirm the overwrite to continue."
    case "42501":
      return "You do not have permission to manage imports for this project."
    case "23514":
      return "The file contains a value the project rules do not allow."
    case "23503":
      return "A referenced value in the file does not exist in this project."
    default:
      return GENERIC
  }
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/infrastructure/supabase-import-errors.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/infrastructure/supabase-import-errors.ts modules/imports/infrastructure/supabase-import-errors.test.ts
git commit -m "feat(imports): map import RPC errors to safe user-facing messages"
```

---

## Task 13: Implement the Supabase import repository

**Files:**
- Create: `modules/imports/infrastructure/supabase-import-repository.ts`
- Create: `modules/imports/infrastructure/supabase-import-repository.test.ts`

The Track 02 review found that mock-shaped tests missed a wrong column name because they only
asserted which table was queried. This test asserts the **payload**, and covers the error branch.

- [x] **Step 1: Write the failing test.**

Create `modules/imports/infrastructure/supabase-import-repository.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  createImportJob,
  markImportJobUploaded,
  recordImportValidation,
  applyImportJob,
  loadImportHistory,
  importObjectPath,
} from "./supabase-import-repository"

function createFakeClient(overrides: Record<string, any> = {}) {
  const rpcCalls: { name: string; args: any }[] = []
  const client: any = {
    rpc(name: string, args: any) {
      rpcCalls.push({ name, args })
      if (overrides[name]) return Promise.resolve(overrides[name])
      return Promise.resolve({
        data: { id: "job-1", project_id: "proj-1", status: "draft" },
        error: null,
      })
    },
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return {
                order() {
                  return Promise.resolve({
                    data: [
                      {
                        id: "job-1",
                        project_id: "proj-1",
                        import_type: "piping_material_list",
                        status: "applied",
                        source_file_name: "pml.xlsx",
                        source_media_type: null,
                        source_size_bytes: 10,
                        source_checksum: "abc",
                        storage_path: "proj-1/job-1/pml.xlsx",
                        conflicts_confirmed: true,
                        applied_row_count: 2,
                        affected_entity_ids: ["e1", "e2"],
                        failure_reason: null,
                        created_at: "2026-08-02T00:00:00Z",
                        validated_at: "2026-08-02T00:01:00Z",
                        applied_at: "2026-08-02T00:02:00Z",
                        canceled_at: null,
                      },
                    ],
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
  }
  return { client, rpcCalls }
}

async function run() {
  // The Storage path convention is what the RLS policy depends on.
  assert.equal(importObjectPath("proj-1", "job-1", "pml.xlsx"), "proj-1/job-1/pml.xlsx")
  assert.equal(importObjectPath("proj-1", "job-1", "a b/c.xlsx"), "proj-1/job-1/a-b-c.xlsx")

  const { client, rpcCalls } = createFakeClient()

  await createImportJob(client, {
    projectId: "proj-1",
    importType: "piping_material_list",
    fileName: "pml.xlsx",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 2048,
    checksum: "abc",
  })

  const created = rpcCalls.find((call) => call.name === "create_import_job")
  assert.ok(created, "create_import_job was called")
  assert.deepEqual(created!.args, {
    target_project_id: "proj-1",
    requested_import_type: "piping_material_list",
    file_name: "pml.xlsx",
    media_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 2048,
    checksum: "abc",
  })

  await markImportJobUploaded(client, "job-1", "proj-1/job-1/pml.xlsx")
  const uploaded = rpcCalls.find((call) => call.name === "mark_import_job_uploaded")
  assert.deepEqual(uploaded!.args, {
    target_job_id: "job-1",
    object_path: "proj-1/job-1/pml.xlsx",
  })

  await recordImportValidation(
    client,
    "job-1",
    [{ rowNumber: 1, rawValues: {}, normalizedValues: { ident_code: "ID-1" }, action: "create" }],
    [{ rowNumber: 1, columnName: "ident_code", severity: "warning", code: "X", message: "m" }]
  )
  const validated = rpcCalls.find((call) => call.name === "record_import_validation")
  assert.equal(validated!.args.target_job_id, "job-1")
  assert.deepEqual(validated!.args.parsed_rows, [
    { row_number: 1, raw_values: {}, normalized_values: { ident_code: "ID-1" }, action: "create" },
  ])
  assert.deepEqual(validated!.args.parsed_issues, [
    { row_number: 1, column_name: "ident_code", severity: "warning", code: "X", message: "m" },
  ])

  await applyImportJob(client, "job-1", true)
  const applied = rpcCalls.find((call) => call.name === "apply_import_job")
  assert.deepEqual(applied!.args, { target_job_id: "job-1", confirm_conflicts: true })

  const history = await loadImportHistory(client, "proj-1")
  assert.equal(history.length, 1)
  assert.equal(history[0].appliedRowCount, 2)
  assert.deepEqual(history[0].affectedEntityIds, ["e1", "e2"])
  assert.equal(history[0].storagePath, "proj-1/job-1/pml.xlsx")

  // The error branch must surface mapped text, never the raw message.
  const failing = createFakeClient({
    apply_import_job: { data: null, error: { code: "PQC10", message: 'relation "x" does not exist' } },
  })
  await assert.rejects(
    () => applyImportJob(failing.client, "job-1", false),
    /already been applied/
  )

  console.log("All supabase-import-repository.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/infrastructure/supabase-import-repository.test.ts
```
Expected: `Cannot find module './supabase-import-repository'`.

- [x] **Step 3: Implement.**

Create `modules/imports/infrastructure/supabase-import-repository.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { ImportJob, ImportJobStatus } from "../domain/import-job"
import type { ImportIssue } from "../domain/import-issue"
import type { ImportType } from "../domain/import-type"
import type { ParsedRow } from "../domain/parsers/registry"
import { mapSupabaseImportError } from "./supabase-import-errors"

export const IMPORT_BUCKET = "project-imports"

export interface CreateImportJobInput {
  projectId: string
  importType: ImportType
  fileName: string
  mediaType: string
  sizeBytes: number
  checksum: string
}

// The Storage RLS policy resolves the project from the first path segment, so the
// path shape is a contract, not a convenience.
export function importObjectPath(projectId: string, jobId: string, fileName: string): string {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]+/g, "-")
  return `${projectId}/${jobId}/${safeName}`
}

function toImportJob(row: any): ImportJob {
  return {
    id: row.id,
    projectId: row.project_id,
    importType: row.import_type,
    status: row.status as ImportJobStatus,
    sourceFileName: row.source_file_name ?? null,
    sourceMediaType: row.source_media_type ?? null,
    sourceSizeBytes: row.source_size_bytes ?? null,
    sourceChecksum: row.source_checksum ?? null,
    storagePath: row.storage_path ?? null,
    conflictsConfirmed: row.conflicts_confirmed === true,
    appliedRowCount: row.applied_row_count ?? 0,
    affectedEntityIds: row.affected_entity_ids ?? [],
    failureReason: row.failure_reason ?? null,
    createdAt: row.created_at,
    validatedAt: row.validated_at ?? null,
    appliedAt: row.applied_at ?? null,
    canceledAt: row.canceled_at ?? null,
  }
}

export async function createImportJob(
  client: SupabaseClient<Database>,
  input: CreateImportJobInput
): Promise<ImportJob> {
  const { data, error } = await client.rpc("create_import_job" as never, {
    target_project_id: input.projectId,
    requested_import_type: input.importType,
    file_name: input.fileName,
    media_type: input.mediaType,
    size_bytes: input.sizeBytes,
    checksum: input.checksum,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function uploadImportFile(
  client: SupabaseClient<Database>,
  objectPath: string,
  file: File
): Promise<void> {
  const { error } = await client.storage
    .from(IMPORT_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(mapSupabaseImportError(error as never))
}

export async function markImportJobUploaded(
  client: SupabaseClient<Database>,
  jobId: string,
  objectPath: string
): Promise<ImportJob> {
  const { data, error } = await client.rpc("mark_import_job_uploaded" as never, {
    target_job_id: jobId,
    object_path: objectPath,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function recordImportValidation(
  client: SupabaseClient<Database>,
  jobId: string,
  rows: readonly ParsedRow[],
  issues: readonly ImportIssue[]
): Promise<ImportJob> {
  const { data, error } = await client.rpc("record_import_validation" as never, {
    target_job_id: jobId,
    parsed_rows: rows.map((row) => ({
      row_number: row.rowNumber,
      raw_values: row.rawValues,
      normalized_values: row.normalizedValues,
      action: row.action,
    })),
    parsed_issues: issues.map((issue) => ({
      row_number: issue.rowNumber,
      column_name: issue.columnName,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
    })),
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function applyImportJob(
  client: SupabaseClient<Database>,
  jobId: string,
  confirmConflicts: boolean
): Promise<ImportJob> {
  const { data, error } = await client.rpc("apply_import_job" as never, {
    target_job_id: jobId,
    confirm_conflicts: confirmConflicts,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function cancelImportJob(
  client: SupabaseClient<Database>,
  jobId: string
): Promise<ImportJob> {
  const { data, error } = await client.rpc("cancel_import_job" as never, {
    target_job_id: jobId,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function loadImportHistory(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ImportJob[]> {
  const { data, error } = await client
    .from("import_jobs")
    .select(
      "id, project_id, import_type, status, source_file_name, source_media_type, source_size_bytes, source_checksum, storage_path, conflicts_confirmed, applied_row_count, affected_entity_ids, failure_reason, created_at, validated_at, applied_at, canceled_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(mapSupabaseImportError(error))
  return (data ?? []).map(toImportJob)
}

export async function loadImportIssues(
  client: SupabaseClient<Database>,
  jobId: string
): Promise<ImportIssue[]> {
  const { data, error } = await client
    .from("import_job_issues")
    .select("row_number, column_name, severity, code, message")
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })

  if (error) throw new Error(mapSupabaseImportError(error))
  return (data ?? []).map((row: any) => ({
    rowNumber: row.row_number,
    columnName: row.column_name,
    severity: row.severity,
    code: row.code,
    message: row.message,
  }))
}

export async function getImportFileSignedUrl(
  client: SupabaseClient<Database>,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(IMPORT_BUCKET)
    .createSignedUrl(storagePath, 300)

  if (error) return null
  return data?.signedUrl ?? null
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/infrastructure/supabase-import-repository.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Typecheck and commit.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`.

```bash
git add modules/imports/infrastructure/supabase-import-repository.ts modules/imports/infrastructure/supabase-import-repository.test.ts
git commit -m "feat(imports): add supabase import repository with payload-level tests"
```

---

## Task 14: Compose the create-and-validate application flow

**Files:**
- Create: `modules/imports/application/create-import.ts`
- Create: `modules/imports/application/create-import.test.ts`

- [x] **Step 1: Write the failing test.**

Create `modules/imports/application/create-import.test.ts`:

```ts
import assert from "node:assert/strict"
import { validateSheet } from "./create-import"

function run() {
  // Shape issues and type-rule issues arrive in one list.
  const outcome = validateSheet("welding_procedure", [
    ["WPS Code", "Subcontractor", "Material Type", "Diameter From", "Diameter To", "Thickness From", "Thickness To"],
    ["WPS-1", "SUB-A", "CS", "2", "1", "3", "9"],
    ["WPS-2", "SUB-A", "CS", "1", "4", "3", "9"],
  ])

  assert.equal(outcome.rows.length, 2)
  assert.equal(outcome.issues.length, 1)
  assert.equal(outcome.issues[0].code, "INVALID_RANGE")
  assert.equal(outcome.summary.blockerCount, 1)
  assert.equal(outcome.summary.conflictCount, 0)
  assert.equal(outcome.canSubmit, true, "a file with blockers may still be submitted for the record")

  const clean = validateSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "ID-1", "HT-1"],
  ])
  assert.equal(clean.issues.length, 0)
  assert.equal(clean.summary.blockerCount, 0)

  // A structurally broken sheet yields zero rows and one blocker.
  const broken = validateSheet("piping_material_list", [["Wrong"], ["x"]])
  assert.equal(broken.rows.length, 0)
  assert.equal(broken.summary.blockerCount > 0, true)

  console.log("All create-import.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/application/create-import.test.ts
```
Expected: `Cannot find module './create-import'`.

- [x] **Step 3: Implement.**

Create `modules/imports/application/create-import.ts`:

```ts
import type { ImportType } from "../domain/import-type"
import { parseSheet, type ParsedRow, type SheetMatrix } from "../domain/parsers/registry"
import { applyTypeRules } from "../domain/parsers/rules"
import {
  summarizeIssues,
  type ImportIssue,
  type ImportIssueSummary,
} from "../domain/import-issue"

export interface ValidationOutcome {
  rows: ParsedRow[]
  issues: ImportIssue[]
  summary: ImportIssueSummary
  canSubmit: boolean
}

export function validateSheet(importType: ImportType, sheet: SheetMatrix): ValidationOutcome {
  const parsed = parseSheet(importType, sheet)
  const ruleIssues = applyTypeRules(importType, parsed.rows)
  const issues = [...parsed.issues, ...ruleIssues]

  return {
    rows: parsed.rows,
    issues,
    summary: summarizeIssues(issues),
    // A job is always recorded, even when it has blockers: the user needs the
    // durable issue list to fix the file. Apply is what the blockers gate.
    canSubmit: true,
  }
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/application/create-import.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/application/create-import.ts modules/imports/application/create-import.test.ts
git commit -m "feat(imports): compose sheet validation into one application entry point"
```

---

## Task 15: Compose the apply decision

**Files:**
- Create: `modules/imports/application/apply-import.ts`
- Create: `modules/imports/application/apply-import.test.ts`

- [x] **Step 1: Write the failing test.**

Create `modules/imports/application/apply-import.test.ts`:

```ts
import assert from "node:assert/strict"
import { describeApplyGate } from "./apply-import"

function run() {
  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    { allowed: true, requiresConfirmation: false, reason: null }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 3,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: "3 rows have blocking errors that must be fixed in the source file.",
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 0,
      conflictCount: 2,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: true,
      reason: "2 rows overwrite existing records. Confirm the overwrite to continue.",
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "applied",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: true,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: "This import has already been applied.",
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "draft",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: "Upload and validate the file before applying it.",
    }
  )

  console.log("All apply-import.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx modules/imports/application/apply-import.test.ts
```
Expected: `Cannot find module './apply-import'`.

- [x] **Step 3: Implement.**

Create `modules/imports/application/apply-import.ts`:

```ts
import { canApply, isTerminalStatus, type ApplyGate } from "../domain/import-job"

export interface ApplyGateDescription {
  allowed: boolean
  requiresConfirmation: boolean
  reason: string | null
}

export function describeApplyGate(gate: ApplyGate): ApplyGateDescription {
  if (gate.status === "applied") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "This import has already been applied.",
    }
  }

  if (isTerminalStatus(gate.status)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "This import is closed and can no longer be applied.",
    }
  }

  if (gate.status !== "validated") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Upload and validate the file before applying it.",
    }
  }

  if (gate.blockerCount > 0) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `${gate.blockerCount} rows have blocking errors that must be fixed in the source file.`,
    }
  }

  if (gate.conflictCount > 0 && !gate.conflictsConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `${gate.conflictCount} rows overwrite existing records. Confirm the overwrite to continue.`,
    }
  }

  return {
    allowed: canApply(gate),
    requiresConfirmation: false,
    reason: null,
  }
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx modules/imports/application/apply-import.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Commit.**

```bash
git add modules/imports/application/apply-import.ts modules/imports/application/apply-import.test.ts
git commit -m "feat(imports): describe the apply gate as a pure decision"
```

---

## Task 16: Build the import issue list and conflict dialog

**Files:**
- Create: `modules/imports/ui/import-issue-list.tsx`
- Create: `modules/imports/ui/import-conflict-dialog.tsx`

These are presentational; their logic already has coverage via `import-issue.ts` and
`apply-import.ts`. No new unit test is added here — the behaviour they render is already tested.

- [x] **Step 1: Create the issue list.**

Create `modules/imports/ui/import-issue-list.tsx`:

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import type { ImportIssue, ImportIssueSeverity } from "../domain/import-issue"

const SEVERITY_STYLE: Record<ImportIssueSeverity, string> = {
  blocker: "bg-red-100 text-red-900 border-red-300",
  conflict: "bg-amber-100 text-amber-900 border-amber-300",
  warning: "bg-slate-100 text-slate-700 border-slate-300",
}

const SEVERITY_LABEL: Record<ImportIssueSeverity, string> = {
  blocker: "Error",
  conflict: "Overwrite",
  warning: "Warning",
}

export function ImportIssueList({ issues }: { issues: readonly ImportIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">No issues were found in this file.</p>
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue, index) => (
        <li
          key={`${issue.code}-${issue.rowNumber ?? "sheet"}-${index}`}
          className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${SEVERITY_STYLE[issue.severity]}`}
        >
          <Badge variant="outline">{SEVERITY_LABEL[issue.severity]}</Badge>
          <span className="font-mono text-xs">
            {issue.rowNumber === null ? "Sheet" : `Row ${issue.rowNumber}`}
            {issue.columnName ? ` · ${issue.columnName}` : ""}
          </span>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  )
}
```

- [x] **Step 2: Create the conflict dialog.**

Create `modules/imports/ui/import-conflict-dialog.tsx`:

```tsx
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function ImportConflictDialog({
  open,
  conflictCount,
  onCancel,
  onConfirm,
}: {
  open: boolean
  conflictCount: number
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm overwrite</AlertDialogTitle>
          <AlertDialogDescription>
            {conflictCount} row{conflictCount === 1 ? "" : "s"} in this file already exist in the
            project. Applying the import replaces the stored values with the values from the
            spreadsheet. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep existing values</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Overwrite {conflictCount} rows</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [x] **Step 3: Typecheck.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`. `components/ui/alert-dialog.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`,
`select.tsx` and `table.tsx` all exist in this repository, so no substitution should be needed.

- [x] **Step 4: Commit.**

```bash
git add modules/imports/ui/import-issue-list.tsx modules/imports/ui/import-conflict-dialog.tsx
git commit -m "feat(imports): add issue list and overwrite confirmation dialog"
```

---

## Task 17: Build the import workbench

**Files:**
- Create: `modules/imports/ui/import-workbench.tsx`

- [x] **Step 1: Create the workbench.**

Create `modules/imports/ui/import-workbench.tsx`:

```tsx
"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  IMPORT_TYPES,
  getImportTypeDefinition,
  type ImportType,
} from "../domain/import-type"
import type { ImportIssue } from "../domain/import-issue"
import type { ParsedRow } from "../domain/parsers/registry"
import { validateSheet } from "../application/create-import"
import { describeApplyGate } from "../application/apply-import"
import {
  buildTemplateWorkbook,
  readFirstSheetMatrix,
  computeChecksum,
} from "../infrastructure/xlsx-workbook"
import {
  createImportJob,
  uploadImportFile,
  markImportJobUploaded,
  recordImportValidation,
  applyImportJob,
  importObjectPath,
} from "../infrastructure/supabase-import-repository"
import { ImportIssueList } from "./import-issue-list"
import { ImportConflictDialog } from "./import-conflict-dialog"

type Stage = "idle" | "validated" | "applied"

export function ImportWorkbench({
  projectId,
  canManage,
  onApplied,
}: {
  projectId: string
  canManage: boolean
  onApplied: () => void
}) {
  const [importType, setImportType] = useState<ImportType>("piping_material_list")
  const [jobId, setJobId] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [stage, setStage] = useState<Stage>("idle")
  const [busy, setBusy] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

  const definition = useMemo(() => getImportTypeDefinition(importType), [importType])

  const summary = useMemo(() => {
    let blockerCount = 0
    let conflictCount = 0
    for (const issue of issues) {
      if (issue.severity === "blocker") blockerCount += 1
      else if (issue.severity === "conflict") conflictCount += 1
    }
    return { blockerCount, conflictCount }
  }, [issues])

  const gate = useMemo(
    () =>
      describeApplyGate({
        status: stage === "validated" ? "validated" : stage === "applied" ? "applied" : "draft",
        blockerCount: summary.blockerCount,
        conflictCount: summary.conflictCount,
        conflictsConfirmed: false,
      }),
    [stage, summary]
  )

  const downloadTemplate = useCallback(() => {
    const bytes = buildTemplateWorkbook(importType)
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${importType}-template.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [importType])

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true)
      try {
        const client = getSupabaseBrowserClient()
        const buffer = await file.arrayBuffer()
        const checksum = await computeChecksum(buffer)
        const matrix = readFirstSheetMatrix(buffer)
        const outcome = validateSheet(importType, matrix)

        const job = await createImportJob(client, {
          projectId,
          importType,
          fileName: file.name,
          mediaType: file.type,
          sizeBytes: file.size,
          checksum,
        })

        const objectPath = importObjectPath(projectId, job.id, file.name)
        await uploadImportFile(client, objectPath, file)
        await markImportJobUploaded(client, job.id, objectPath)
        await recordImportValidation(client, job.id, outcome.rows, outcome.issues)

        setJobId(job.id)
        setRows(outcome.rows)
        setIssues(outcome.issues)
        setStage("validated")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The file could not be processed.")
      } finally {
        setBusy(false)
      }
    },
    [importType, projectId]
  )

  const runApply = useCallback(
    async (confirmConflicts: boolean) => {
      if (!jobId) return
      setBusy(true)
      try {
        const client = getSupabaseBrowserClient()
        const applied = await applyImportJob(client, jobId, confirmConflicts)
        setStage("applied")
        toast.success(`Applied ${applied.appliedRowCount} rows.`)
        onApplied()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The import could not be applied.")
      } finally {
        setBusy(false)
        setConflictDialogOpen(false)
      }
    },
    [jobId, onApplied]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import {definition.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={importType}
            onValueChange={(next) => {
              setImportType(next as ImportType)
              setStage("idle")
              setRows([])
              setIssues([])
              setJobId(null)
            }}
          >
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPORT_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {getImportTypeDefinition(value).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={downloadTemplate}>
            Download template
          </Button>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={!canManage || busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ""
            }}
          />
        </div>

        {stage !== "idle" && (
          <div className="space-y-3">
            <p className="text-sm">
              {rows.length} rows parsed · {summary.blockerCount} errors ·{" "}
              {summary.conflictCount} overwrites
            </p>

            <ImportIssueList issues={issues} />

            <div className="flex items-center gap-3">
              <Button
                disabled={!canManage || busy || stage === "applied" || summary.blockerCount > 0}
                onClick={() => {
                  if (summary.conflictCount > 0) {
                    setConflictDialogOpen(true)
                    return
                  }
                  void runApply(false)
                }}
              >
                Apply import
              </Button>
              {gate.reason && <span className="text-sm text-muted-foreground">{gate.reason}</span>}
            </div>
          </div>
        )}

        <ImportConflictDialog
          open={conflictDialogOpen}
          conflictCount={summary.conflictCount}
          onCancel={() => setConflictDialogOpen(false)}
          onConfirm={() => void runApply(true)}
        />
      </CardContent>
    </Card>
  )
}
```

- [x] **Step 2: Typecheck.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`. `getSupabaseBrowserClient` is the confirmed export of
`lib/supabase/browser-client.ts:8`, returning `SupabaseClient<Database>`.

- [x] **Step 3: Commit.**

```bash
git add modules/imports/ui/import-workbench.tsx
git commit -m "feat(imports): add import workbench with template, preview and apply"
```

---

## Task 18: Build import history with source-file download

**Files:**
- Create: `modules/imports/ui/import-history.tsx`

Roadmap exit criterion: "the source file can be downloaded from history given the capability".

- [x] **Step 1: Create the history view.**

Create `modules/imports/ui/import-history.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { getImportTypeDefinition, type ImportType } from "../domain/import-type"
import type { ImportJob } from "../domain/import-job"
import { isTerminalStatus } from "../domain/import-job"
import {
  loadImportHistory,
  getImportFileSignedUrl,
  cancelImportJob,
} from "../infrastructure/supabase-import-repository"

export function ImportHistory({
  projectId,
  canManage,
  refreshToken,
}: {
  projectId: string
  canManage: boolean
  refreshToken: number
}) {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const client = getSupabaseBrowserClient()
      setJobs(await loadImportHistory(client, projectId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "History could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  const download = useCallback(async (job: ImportJob) => {
    if (!job.storagePath) return
    const client = getSupabaseBrowserClient()
    const url = await getImportFileSignedUrl(client, job.storagePath)
    if (!url) {
      toast.error("The source file is no longer available.")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  const cancel = useCallback(
    async (job: ImportJob) => {
      try {
        const client = getSupabaseBrowserClient()
        await cancelImportJob(client, job.id)
        await reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The import could not be cancelled.")
      }
    },
    [reload]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import history</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No imports have been run for this project.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows applied</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    {getImportTypeDefinition(job.importType as ImportType).label}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.sourceFileName}</TableCell>
                  <TableCell>
                    <Badge variant={job.status === "applied" ? "default" : "outline"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.appliedRowCount}</TableCell>
                  <TableCell className="text-xs">{job.createdAt}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => void download(job)}>
                      Download source
                    </Button>
                    {canManage && !isTerminalStatus(job.status) && (
                      <Button size="sm" variant="ghost" onClick={() => void cancel(job)}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
```

- [x] **Step 2: Typecheck and commit.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`.

```bash
git add modules/imports/ui/import-history.tsx
git commit -m "feat(imports): add read-only import history with signed source download"
```

---

## Task 19: Wire the route, capability and navigation

**Files:**
- Create: `app/admin/imports/page.tsx`
- Modify: `config/route-capabilities.ts`
- Modify: `config/navigation.ts`

- [x] **Step 1: Create the page.**

Create `app/admin/imports/page.tsx`:

```tsx
"use client"

import { useCallback, useState } from "react"
import { AdminTabs } from "../admin-tabs"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { ImportWorkbench } from "@/modules/imports/ui/import-workbench"
import { ImportHistory } from "@/modules/imports/ui/import-history"
import { ImportSettingsView } from "@/components/admin/import-settings-view"

export default function ImportsPage() {
  const appMode = useAppMode()
  const access = useOptionalAccess()
  const [refreshToken, setRefreshToken] = useState(0)

  const onApplied = useCallback(() => setRefreshToken((token) => token + 1), [])

  if (appMode === "demo") {
    return (
      <div className="space-y-4">
        <AdminTabs />
        <ImportSettingsView />
      </div>
    )
  }

  // Use can(), not capabilities.includes(): hasCapability() also honours
  // isPlatformAdmin, which is never present in the capabilities array.
  const projectId = access?.access.projectId ?? null
  const canManage = access?.can("imports.manage") ?? false

  if (!projectId) {
    return (
      <div className="space-y-4">
        <AdminTabs />
        <p className="text-sm text-muted-foreground">
          Select a project to run imports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminTabs />
      <ImportWorkbench projectId={projectId} canManage={canManage} onApplied={onApplied} />
      <ImportHistory projectId={projectId} canManage={canManage} refreshToken={refreshToken} />
    </div>
  )
}
```

Note the Supabase branch never renders `ImportSettingsView`, which reads `store/admin-store`.
That is the roadmap requirement "move PML/WPS/Welder imports off `admin-store`".

- [x] **Step 2: Extend the capability union.**

`config/route-capabilities.ts` is typed
`as const satisfies readonly (readonly [string, Capability])[]`, so a route entry naming a
capability absent from the union fails `tsc`. In `modules/access/domain/capability.ts`, add the
two codes to the end of the `CAPABILITIES` tuple, immediately after `"settings.view"`:

```ts
  "settings.view",
  "imports.view",
  "imports.manage",
] as const
```

These strings must match the codes seeded in `20260802090000_import_platform.sql` exactly.

- [x] **Step 3: Add the route capability in the correct position.**

`requiredCapabilityForPath` returns the **first** matching prefix, and `["/admin", ...]` already
sits at line 9. Insert the new entry **above** it, next to the other `/admin/*` entries:

```ts
export const ROUTE_CAPABILITIES = [
  ["/admin/system-referential", "system_referential.manage"],
  ["/admin/project-definition", "project.definition.manage"],
  ["/admin/project-referential", "project_referential.manage"],
  ["/admin/access-rights", "access_rights.manage"],
  ["/admin/import-settings", "project_referential.manage"],
  ["/admin/imports", "imports.view"],
  ["/admin", "project_referential.manage"],
  // ... the remaining entries are unchanged
```

- [x] **Step 4: Add navigation.**

In `config/navigation.ts`, add an `Imports` child under the Admin node pointing at
`/admin/imports`, following the shape of the neighbouring entries. Navigation visibility is
already derived from `requiredCapabilityForPath`, so no extra visibility code is needed.

- [x] **Step 5: Verify the capability mapping resolves correctly.**

Add to `config/route-capabilities.test.ts`:

```ts
assert.equal(requiredCapabilityForPath("/admin/imports"), "imports.view")
assert.equal(requiredCapabilityForPath("/admin/project-referential"), "project_referential.manage")
```

Run:
```bash
node --import tsx config/route-capabilities.test.ts
```
Expected: exit `0`. If it fails with `project_referential.manage` for `/admin/imports`, the
ordering in Step 3 is wrong — fix the ordering, not the test.

- [x] **Step 6: Typecheck the union change.**

Run:
```bash
npm run typecheck
```
Expected: exit `0`. A failure here means the capability string in
`config/route-capabilities.ts` does not match the one added to `CAPABILITIES`.

- [x] **Step 7: Commit.**

```bash
git add app/admin/imports modules/access/domain/capability.ts config/route-capabilities.ts config/route-capabilities.test.ts config/navigation.ts
git commit -m "feat(imports): expose the import workbench route behind imports.view"
```

### Checkpoint 3 — Gate C complete

- [x] Run `npm run verify`. Expected: exit `0`.
- [x] Run `grep -rn "admin-store" app/admin/imports/`. Expected: no output.

---

# Gate D — Fixtures, verification and exit

## Task 20: Add working Track 03 browser fixtures

**Files:**
- Create: `scripts/bootstrap-track03-browser-fixtures.ts`
- Create: `scripts/bootstrap-track03-browser-fixtures.test.ts`
- Create: `docs/TRACK03_BROWSER_FIXTURES.md`

The Track 02 bootstrap script printed "completed successfully" without inserting a single row.
This one must actually reconcile data, and the test must prove it does.

- [x] **Step 1: Write the failing test.**

Create `scripts/bootstrap-track03-browser-fixtures.test.ts`:

```ts
import assert from "node:assert/strict"
import {
  isLocalhost,
  buildTrack03FixturePlan,
  planInsertCount,
} from "./bootstrap-track03-browser-fixtures"

function run() {
  assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
  assert.equal(isLocalhost("http://localhost:54321"), true)
  assert.equal(isLocalhost("https://abcdef.supabase.co"), false)

  const plan = buildTrack03FixturePlan("proj-1")

  // Service classes and weld types are what the NDE matrix and thickness imports
  // resolve against, so the fixture must create them.
  assert.ok(plan.serviceClasses.length >= 2, "plan seeds service classes")
  assert.ok(plan.weldTypes.length >= 2, "plan seeds weld types")
  assert.ok(plan.subcontractors.length >= 1, "plan seeds subcontractors")
  assert.equal(plan.serviceClasses.every((sc) => sc.project_id === "proj-1"), true)

  // Guards against the Track 02 regression: a plan that inserts nothing.
  assert.ok(planInsertCount(plan) > 0, "the plan actually inserts rows")

  console.log("All bootstrap-track03-browser-fixtures.test.ts assertions passed!")
}

run()
```

- [x] **Step 2: Run RED.**

Run:
```bash
node --import tsx scripts/bootstrap-track03-browser-fixtures.test.ts
```
Expected: `Cannot find module './bootstrap-track03-browser-fixtures'`.

- [x] **Step 3: Implement.**

Create `scripts/bootstrap-track03-browser-fixtures.ts`:

```ts
import { createClient } from "@supabase/supabase-js"

export function isLocalhost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
  } catch {
    return false
  }
}

export interface Track03FixturePlan {
  subcontractors: { project_id: string; code: string; description: string }[]
  serviceClasses: { project_id: string; code: string; description: string }[]
  weldTypes: { project_id: string; code: string; description: string }[]
}

export function buildTrack03FixturePlan(projectId: string): Track03FixturePlan {
  return {
    subcontractors: [
      { project_id: projectId, code: "SUB-IMP-A", description: "Import fixture subcontractor A" },
      { project_id: projectId, code: "SUB-IMP-B", description: "Import fixture subcontractor B" },
    ],
    serviceClasses: [
      { project_id: projectId, code: "SC-IMP-1", description: "Import fixture service class 1" },
      { project_id: projectId, code: "SC-IMP-2", description: "Import fixture service class 2" },
    ],
    weldTypes: [
      { project_id: projectId, code: "WT-IMP-BW", description: "Butt weld" },
      { project_id: projectId, code: "WT-IMP-SW", description: "Socket weld" },
    ],
  }
}

export function planInsertCount(plan: Track03FixturePlan): number {
  return plan.subcontractors.length + plan.serviceClasses.length + plan.weldTypes.length
}

async function runBootstrap(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

  if (!isLocalhost(url)) {
    throw new Error("Refusing to run against a non-local Supabase URL.")
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }

  const client = createClient(url, serviceRoleKey)

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()

  if (projectError) throw new Error(projectError.message)
  if (!project) {
    throw new Error("Project TRACK01-A was not found. Run the Track 01 bootstrap first.")
  }

  const plan = buildTrack03FixturePlan(project.id)
  let written = 0

  const upsert = async (table: string, rows: Record<string, unknown>[]) => {
    const { error } = await client
      .from(table)
      .upsert(rows, { onConflict: "project_id,code", ignoreDuplicates: false })
    if (error) throw new Error(`${table}: ${error.message}`)
    written += rows.length
  }

  await upsert("project_subcontractors", plan.subcontractors)
  await upsert("project_service_classes", plan.serviceClasses)
  await upsert("project_weld_types", plan.weldTypes)

  console.log(`Track 03 fixtures reconciled: ${written} rows upserted into project ${project.id}.`)
}

const invokedDirectly = process.argv[1]?.includes("bootstrap-track03-browser-fixtures")
if (invokedDirectly) {
  runBootstrap().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
```

- [x] **Step 4: Run GREEN.**

Run:
```bash
node --import tsx scripts/bootstrap-track03-browser-fixtures.test.ts
```
Expected: exit `0`.

- [x] **Step 5: Add the npm script and the runbook.**

In `package.json`, add:
```json
"bootstrap:track03-browser-fixtures": "tsx scripts/bootstrap-track03-browser-fixtures.ts"
```

Create `docs/TRACK03_BROWSER_FIXTURES.md` documenting the localhost guard, the upsert-by-code
reconciliation, and the run command. Use `<local-service-role-secret>` as the placeholder —
never a literal key.

- [x] **Step 6: Prove the script actually writes.**

Run:
```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY='<local-service-role-secret>' \
npm run bootstrap:track03-browser-fixtures
```
Expected: `Track 03 fixtures reconciled: 6 rows upserted into project <uuid>.`

Run it a second time. Expected: the same message, exit `0`, and no duplicate-key error —
that is the idempotency proof.

- [x] **Step 7: Commit.**

```bash
git add scripts/bootstrap-track03-browser-fixtures.ts scripts/bootstrap-track03-browser-fixtures.test.ts docs/TRACK03_BROWSER_FIXTURES.md package.json
git commit -m "feat(imports): add idempotent Track 03 browser fixtures"
```

---

## Task 21: Full automated verification

**Files:**
- Modify only if a command exposes a defect.

- [x] **Step 1: Prove the migrations work from empty.**

Run:
```bash
/opt/homebrew/bin/supabase db reset
```
Expected: every migration applies, exit `0`.

- [x] **Step 2: Run the full verification.**

Run:
```bash
npm run verify
```
Expected: exit `0`. Record the pgTAP file count and assertion count from the output.

- [x] **Step 3: Audit for layering violations.**

Run:
```bash
grep -rn "@supabase\|from \"react\"\|@/store" modules/imports/domain/ modules/imports/application/
```
Expected: no output. Domain and application must stay free of Supabase, React and the demo store.

- [x] **Step 4: Audit for leaked secrets.**

Run:
```bash
grep -rn "sb_secret_\|service_role" docs/ scripts/ | grep -v "SUPABASE_SERVICE_ROLE_KEY" | grep -v "<local-service-role-secret>"
```
Expected: no literal key values.

- [x] **Step 5: Confirm no whitespace damage.**

Run:
```bash
git diff --check
```
Expected: no output.

- [x] **Step 6: Commit any fixes.**

```bash
git add -A
git commit -m "chore(imports): resolve verification findings"
```

---

## Task 22: Manual browser acceptance

**Files:** none. This task produces evidence, not code.

Run the app with `npm run dev` and sign in as the Track 01 fixture Project Admin.

- [x] **Step 1: Template download.** On `/admin/imports`, pick "Project Piping Material List",
      click "Download template". Confirm the file opens and its header row is exactly
      `MRR Number | Ident Code | Trace Number`.

- [x] **Step 2: Red blocker path.** Fill the template with three rows, leaving `Ident Code`
      blank on row 2. Upload. Confirm: row 2 shows a red "Error" entry, and the "Apply import"
      button is disabled.

- [x] **Step 3: Fix and apply.** Fill in the missing cell, upload the corrected file.
      Confirm zero errors, then click "Apply import". Confirm the success toast reports 3 rows.

- [x] **Step 4: Durability.** Reload the page (F5). Open Project Referential → Piping Material
      List. Confirm all three rows are present. **This is the step that distinguishes a durable
      write from optimistic UI.**

- [x] **Step 5: Double apply.** In Import history, the job shows `applied`. Confirm no
      "Apply" control is offered for it, and that re-running the same file creates a *new* job
      rather than mutating the applied one.

- [x] **Step 6: Yellow overwrite path.** Upload the same file again as a new job. Confirm the
      rows are reported as overwrites in amber, that clicking "Apply import" opens the
      confirmation dialog, that "Keep existing values" aborts, and that
      "Overwrite N rows" succeeds.

- [x] **Step 7: Source download.** In history, click "Download source" on an applied job.
      Confirm the original file downloads.

- [x] **Step 8: Capability denial.** Sign in as the Track 01 fixture Project Reader.
      Confirm `/admin/imports` is not offered in navigation, that visiting the URL directly
      shows the forbidden screen, and that history — if reachable — offers no Apply or Cancel.

- [x] **Step 9: Cross-project isolation.** Sign in as the Project B admin fixture. Confirm the
      import history shows no jobs from project A.

- [x] **Step 10: Record the result.** Write down which steps passed. Do **not** mark a step
      complete that you did not perform in a browser.

---

## Task 23: Documentation and Track 03 exit

**Files:**
- Modify: `docs/SUPABASE_BACKEND_FOUNDATION.md`
- Modify: `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`

The Track 02 review found documentation claiming coverage that did not exist. Do not repeat it.

- [x] **Step 1: Record only demonstrated facts.**

In `docs/SUPABASE_BACKEND_FOUNDATION.md`, document: the four new migrations, the
`import_jobs` lifecycle, the two new capabilities, the `project-imports` bucket, the
`storage_path_project_id` helper and why it exists, and the **actual** pgTAP file and assertion
counts from Task 21 Step 2. Do not describe a test that does not exist.

- [x] **Step 2: Update the handoff context.**

In `docs/SUPABASE_NEXT_AGENT_CONTEXT.md`, state which Track 03 exit criteria were verified
automatically and which were verified in a browser, and name anything left unverified.
Do not write "100% complete".

- [x] **Step 3: Tick the roadmap.**

In the master roadmap §15, tick only the Task checkboxes whose work exists in the tree. Add an
explicit note that the `supabase/functions/process-import/` edge function was deliberately not
built, with the reasoning from §3.6 of this plan.

- [x] **Step 4: Commit.**

```bash
git add docs/
git commit -m "docs: record Track 03 import platform state and verified evidence"
```

---

## 5. Exit criteria

Track 03 is complete when all of the following are demonstrably true:

- [x] `npm run verify` exits `0` after a fresh `supabase db reset`.
- [x] The source file of an applied job can be downloaded from history by a user holding
      `imports.view`, and cannot by a user without it.
- [x] Preview never writes to domain tables: uploading a file with blockers leaves
      `piping_material_records` unchanged (pgTAP `031`, "the failed apply wrote no rows at all").
- [x] Apply is all-or-nothing: one invalid row aborts the entire job.
- [x] One job cannot be applied twice (`PQC10`, pgTAP `031`).
- [x] A blocker prevents apply even when the client submitted no issues (`PQC13`, pgTAP `031`).
- [x] An overwrite conflict requires explicit confirmation (`PQC14`, pgTAP `031`).
- [x] PML, WPS and Welder imports show the same durable result after a page refresh.
- [x] `app/admin/imports/**` contains no `store/admin-store` import in the Supabase branch.
- [x] `modules/imports/domain/` and `modules/imports/application/` import no Supabase, React or
      `store/*`.
- [x] No raw parser or SQL error text reaches the UI (`supabase-import-errors.test.ts`).
- [x] No `storage.objects` policy applies to `PUBLIC` (pgTAP `032`).
- [x] The Track 03 bootstrap script writes rows and is idempotent across two consecutive runs.

## 6. Explicitly outside Track 03

- Spooling Images ZIP upload and the 4 MB per-file limit — Track 04.
- Spooling Material Type and Spooling Class Material imports — they have no CRUD yet.
- Progress imports (Prefabrication, Erection, Weld progress, Spool Definition Category,
  dossier §12.4) — they depend on engineering entities that do not exist until Track 04.
- The `supabase/functions/process-import/` edge function — see §3.6.
- Export of the validation result to Excel (dossier §12.2 final bullet) — the issue list is
  durable in `import_job_issues`, so export is additive and belongs with reporting in Track 11.
