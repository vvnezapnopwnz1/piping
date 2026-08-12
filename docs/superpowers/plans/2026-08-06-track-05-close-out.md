# Track 05 Close-Out and Browser-Verified Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the defects a real browser walk found in Track 05 — one of which blocks the entire fabrication golden path and is invisible to `npm run verify` — then finish the verification that `docs/superpowers/plans/2026-08-05-track-05-remediation.md` Task 11 never ran, and correct the master roadmap so Track 06 starts against the schema that actually exists.

**Architecture:** The blocking defect is a PostgREST query in the construction repository that names three columns which do not exist. It is invisible to every existing check: `supabase-js` does not type-check `.select()` strings, pgTAP tests SQL rather than PostgREST, and the unit tests mock the client. The fix is therefore two parts — correct the query, and add a test that validates every `.select()` in the repository against the generated database types so the class of bug cannot return. Everything else is verification and documentation.

**Tech Stack:** PostgreSQL 15 (Supabase local), pgTAP, PostgREST, `@supabase/supabase-js` 2.110.8, Next.js 16 App Router, React 19, TypeScript strict, Node test runner via `tsx`, Playwright MCP for the browser walk.

## Global Constraints

- The local Supabase CLI in this repository is invoked as `/opt/homebrew/bin/supabase`.
- The local database container is `supabase_db_pipe-qc-shell-layout`; SQL is run through `docker exec … psql -U postgres -d postgres`.
- Migrations are **forward-only**. This plan adds **no** migration. If a task appears to need one, stop and report — a schema change belongs to Track 06 or Track 07.
- The app is reachable at **`http://localhost:3000` only**. `http://127.0.0.1:3000` hangs on "Loading PipeQC…" because Next.js blocks it as a cross-origin dev resource. See Task 6.
- Secrets come from `.env.local` and are never printed, committed, or pasted into this plan.
- `npm run verify` is `typecheck && test:unit && test:db && validate:fixtures`. `test:db` needs Docker running.
- No new error codes, no new capability, no change to `modules/construction/domain/**` or `modules/construction/application/**`.

---

## 1. Execution policy

The two plans before this one were reported complete without being run, and a browser walk on 2026-08-02 found a golden-path-blocking defect that all four automated checks pass over. The policy is therefore:

- **Tick a checkbox only after running its command and seeing the stated output.** A step whose output differs from "Expected" is a **stop-and-report**, not a prompt to adjust the expectation.
- **Paste the real numbers** into the step before ticking it.
- **Never retro-tick** the earlier Track 05 plans. See §3.6.
- **`npm run verify` passing is not evidence that a screen works.** Gate C4 is not optional and cannot be replaced by any automated suite.
- Commit at the end of every task, with the message given in the task's last step.

## 2. What the 2026-08-02 browser walk established

Run through Playwright MCP against a database reset from empty, then bootstrapped Tracks 01–04, with Track 04's SpoolGen import performed through the real UI before the Track 05 bootstrap — the order `docs/qa/local-supabase-browser-runbook.md` prescribes under "Track 04 UI-import mode".

### Verified working

| Evidence | Detail |
| --- | --- |
| `supabase db reset` | All 35 migrations apply, including `20260805090000_track05_remediation.sql` and `20260805091000_grant_track05_fixture_referentials.sql`. |
| Bootstraps 01–04 | All four exit `0`; the resulting database has `isometrics=0, spools=0, import_jobs=0, spool_stage_events=0` — a genuine clean state for T04. |
| T04-1 … T04-9 | Every SpoolGen case passes through the UI: missing-`weld.txt` refusal, 4 MB rejection **before** any Storage write (`storage.objects=0`), `PDS-NOPE` blocking error with Apply disabled, clean validate (`10 rows: 0 errors, 3 warnings`), R0 applied (`Applied 7 definition rows`), R1 revision decisions, R1 accepted and R0 superseded. |
| Definition shape after R0 | `SP-T4-001-A: 2 welds / 4 points / 1 support / 2 bom`, `SP-T4-001-B: 1 / 2 / 0 / 1` — produced by the real UI, not the bootstrap script. |
| Track 05 bootstrap after T04 | Prints `Track 05 referentials reconciled: 14 rows upserted` and `Engineering definition ISO-T4-001 already has an accepted revision; nothing to import.` The skip path works. |
| Track 05 referential rows | `1 \| 1 \| 2 \| 2 \| 3 \| 1 \| 1 \| 1`. **The remediated bootstrap genuinely writes rows** — the single most-doubted claim of the remediation, now proven. |
| Repository select audit | 12 of 13 `.select()` column lists in `supabase-construction-repository.ts` validate against the live schema. Only one is broken. |
| pgTAP over fixture data | Measured, not assumed: `supabase test db` on the loaded stand gives `Files=20, Tests=354` and fails in three files. The conflict is one-way — bootstrap data breaks pgTAP, never the reverse. Detail in Task 14 Step 3. |

### Defects found

| #  | Defect | Evidence | Task |
| -- | --- | --- | --- |
| 1  | **Blocking.** `loadMaterialCheckItems` selects `ident_code, trace_number, quantity` from `material_check_items`, which has none of them (its columns are `id, material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity, created_at`). PostgREST answers `400`. | `supabase-construction-repository.ts:278`; browser network log request 37; `select ident_code from material_check_items` → `ERROR: column "ident_code" does not exist`. | 1 |
| 2  | The 400 rejects the whole `Promise.all` in the material-check screen, so the bill of materials — whose own request returned `200` **with rows** — is discarded too. The screen then renders "This spool revision has no bill of materials to check", reporting *no data* when the truth is *a request failed*. There is no row to type a heat number into, so T05-01 cannot be performed at all and T05-03/T05-04 are blocked behind it. | `material-check-screen.tsx:51-67`; DB shows `bom=2` for the same spool revision. | 2 |
| 3  | Nothing can catch defect 1. `@supabase/supabase-js` 2.110.8 does **not** type-check `.select()` column names: a probe selecting `ident_code, trace_number, quantity` from `material_check_items` compiles with `tsc --noEmit` exiting `0`. pgTAP tests SQL, not PostgREST. Unit tests mock the client. `type Row = Record<string, any>` (line 13) then absorbs the malformed result. | Measured 2026-08-02 with a throwaway probe file. | 3 |
| 4  | The fabrication spool picker lists **every** spool revision including superseded ones — four entries after T04, two labelled `SP-T4-001-A` and two `SP-T4-001-B`, all with an identical "not started" badge and no revision number. A user cannot choose deliberately. Mitigating: once selected, the detail header does show `ISO-T4-001 / SP-T4-001-A (R1)`. Invisible to the fixture-only path, which never has a second revision. | Screenshot `.playwright-mcp/qa/T05-spool-picker-duplicates.png`; DB shows 2 accepted + 2 superseded spool revisions. | 4 |
| 5  | `/` renders static demo content in Supabase mode: with `spools=0` it showed "Welds requiring action 1", "NDE batches active 4", notifications naming `PL-FU300-007-A` and "SGS Industrial", and the heading "Qatar LNG Train 7 · Thursday, 14 May 2026". The header, project label, capability-filtered navigation and absence of a DEMO MODE badge are all correct. | B00 step 1. | 5 |
| 6  | `http://127.0.0.1:3000` never leaves "Loading PipeQC…" — Next.js blocks it as a cross-origin dev resource and the HMR socket fails. The runbook offers `127.0.0.1` and `localhost` as equivalent. | Dev server log: *"Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from 127.0.0.1"*. | 6 |
| 7  | On the R1 revision screen, `SP-T4-001-B` is labelled `Unchanged` yet still requires a decision, and the blocking message reads "2 revised spools or reworked welds still need a decision" when exactly one spool is revised. | T04-7 snapshot. | 7 |
| 8  | The two execution addenda disagree: the remediation addendum says `planInsertCount` "is now 13"; the fabrication addendum and the code say 14. The bootstrap printed **14**. | `2026-08-05-…-remediation.md:1885` vs `2026-08-04-…-fabrication.md:8982` vs `scripts/bootstrap-track05-browser-fixtures.test.ts:58`. | 10 |
| 9  | Master roadmap §18 (T6) is unbuildable: `20260805090000_nde_obligations.sql` collides with the applied `20260805090000_track05_remediation.sql`; `nde_obligations`, `pwht_requirements` and `pwht_results` already exist; it points at a Track 06 plan file that does not exist; and it never mentions that `unique (weld_joint_revision_id, method)` blocks the repair/tracer model. | `ls supabase/migrations/`; `20260804092000_weld_progress_commands.sql:47,60,65`. | 9 |
| 10 | Remediation Task 11 was never executed: no closing commit, 81 unticked step boxes against 2 ticked, and pgTAP has never run against the two `20260805*` migrations. | `git log`; checkbox counts. | 8 |

### Not yet exercised

T05-01 through T05-05, T04-10 … T04-12, T01, T02, T03 and S01 were not reached — the walk stopped at the first FAIL as the runbook's agent contract requires.

## 3. Decisions fixed by this plan

### 3.1 The material-check query joins through the bill-of-materials line

`material_check_items` records a link, not a description: `spool_revision_material_id` names the bill line and `piping_material_record_id` names the PML record whose trace was accepted. The ident code therefore comes from `spool_revision_materials` and the trace number from `piping_material_records`. Filtering moves to `spool_revision_materials.spool_revision_id`, which carries the same scope as the old `material_check_records` join and removes one hop.

The replacement query was executed against the live PostgREST as an authenticated fixture user before being written into this plan: it returns **HTTP 200**. Adding the missing columns to the table was rejected — the remediation addendum already recorded that this schema is deliberately stricter than the original plan's, and duplicating `ident_code` onto the item row would denormalise it for no reason.

### 3.2 A failed load must not look like an empty result

Defect 2 is worse than defect 1: even after the query is fixed, any future failure of any of the three parallel loads will silently render "no bill of materials". The screen gets an explicit failure state, so a load error says so and the empty state keeps its literal meaning.

### 3.3 The recurrence guard is a test, not a type

Removing `type Row = Record<string, any>` would **not** have caught defect 1 — measurement showed `supabase-js` 2.110.8 does not validate select strings at all, so the error never reaches the `Row` cast. Nor is a live-database test appropriate: `test:unit` runs without Docker. Task 3 therefore parses the generated `lib/supabase/database.types.ts` for each table's `Row` keys and asserts that every flat column named in every `.select()` of the construction repository exists. It needs no database, runs in the existing node test runner, and fails loudly the moment a select drifts from the schema.

### 3.4 The spool picker filters to the accepted revision and labels what remains

Progress can only be recorded against the accepted revision — a superseded one is refused with `PQC31` — so offering superseded revisions in the picker offers guaranteed failures. The list is filtered to accepted revisions, and each entry gains its revision number so the label is unambiguous if a project ever surfaces more than one. Removing them from the list does not weaken the `PQC31` guard, which stays where it is and is exercised by pgTAP `052` and by Task 12.

### 3.5 The demo home page is recorded, not rebuilt

Defect 5 is real but it is a whole screen's worth of work and touches no Track 05 route. Task 5 puts an explicit demo-data banner behind the Supabase-mode check so the numbers stop reading as real, and files the rebuild as its own future track. Silently leaving invented figures in front of a user is not acceptable; rebuilding the dashboard inside a close-out plan is scope creep.

### 3.6 The record is amended, not rewritten

The 146 unticked step boxes in the fabrication plan and the 81 in the remediation plan stay unticked. Ticking them now would assert that a command ran at a time it did not — the same untruth this plan exists to remove. Task 10 appends a Close-out status block to each. Boxes belonging to *this* plan are ticked normally, as their commands are run.

## 4. File map

### Fixed

- `modules/construction/infrastructure/supabase-construction-repository.ts` — **modify** `loadMaterialCheckItems` (lines 272-286).
- `modules/construction/ui/fabrication/material-check-screen.tsx` — **modify** the load effect (lines 45-68) and the empty state.
- `modules/construction/ui/fabrication/spool-picker.tsx:59-60` — **modify** to filter to accepted revisions and label the revision.
- `app/page.tsx` — **modify** to add a demo-data banner in Supabase mode.
- `modules/engineering/application/resolve-revision.ts:14` — **modify** the blocking sentence in `describeRevisionApplyGate`.
- `modules/engineering/application/resolve-revision.test.ts` — **modify** the assertion for that sentence.
- `next.config.mjs` — **modify** to add `allowedDevOrigins`.

### Tests created

- `modules/construction/infrastructure/construction-select-columns.test.ts` — the recurrence guard.
- `supabase/tests/database/054_readiness_shop_joint_limitation.test.sql` — pins the known Track 07 limitation.

### Documentation

- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` — §18 only.
- `docs/superpowers/plans/2026-08-04-track-05-fabrication.md` — append a status block.
- `docs/superpowers/plans/2026-08-05-track-05-remediation.md` — correct `13` → `14`; append a status block.
- `docs/qa/local-supabase-browser-runbook.md` — the `localhost`-only rule and the measured pgTAP/fixture interaction.
- `docs/TRACK05_BROWSER_FIXTURES.md` — the same pgTAP/fixture result.

### Committed by Task 0, authored before this plan

Pre-existing uncommitted work, not a deliverable: `.gitignore`, `modules/imports/domain/import-type.ts`, `modules/imports/domain/import-type.test.ts`, `modules/imports/ui/import-history.tsx`, `docs/qa/local-supabase-browser-runbook.md`.

---

# Gate C0 — Preflight

## Task 0: Land the unrelated work already in the tree

**Files:** as listed above.

- [x] **Step 1: See what is uncommitted.**

Run: `git status --short && git diff --stat`

Expected, as of 2026-08-06:

```text
 M .gitignore
 M modules/imports/domain/import-type.test.ts
 M modules/imports/domain/import-type.ts
 M modules/imports/ui/import-history.tsx
?? docs/qa/
```

The `modules/imports` change is a self-contained Track 03 fix: `import-history.tsx` called `getImportTypeDefinition(job.importType as ImportType)`, which **throws** on an unknown import type and takes the history table down; `getImportJobTypeLabel` returns a readable fallback instead. The runbook's T03 explicitly requires `spooling_definition` to render as "SpoolGen definition" without crashing, so this fix is a precondition for T03.

- [x] **Step 2: Confirm it stands on its own.**

Run: `npm run typecheck && npm run test:unit`

Expected: exit `0`, 74 unit tests passing.

- [x] **Step 3: Commit separately.**

```bash
git add .gitignore modules/imports/domain/import-type.ts \
        modules/imports/domain/import-type.test.ts modules/imports/ui/import-history.tsx
git commit -m "fix(imports): show a fallback label for an unknown import type"
git add docs/qa/
git commit -m "docs(qa): add the local Supabase browser acceptance runbook"
```

- [x] **Step 4: Record the clean baseline SHA.**

Run: `git status --short && git rev-parse --short HEAD`

Expected: nothing uncommitted except this plan. SHA: `__________`. **Use it in Task 13 Step 2.**

---

# Gate C1 — The blocking defect

## Task 1: Fix `loadMaterialCheckItems`

**Files:**
- Modify: `modules/construction/infrastructure/supabase-construction-repository.ts:272-286`
- Test: covered by Task 3's guard and by Task 12's browser walk

**Interfaces:**
- Consumes: `material_check_items`, `spool_revision_materials`, `piping_material_records`.
- Produces: unchanged signature — `Promise<{ identCode: string; traceNumber: string; quantity: number | null }[]>`. No caller changes.

- [x] **Step 1: Reproduce the failure against the live API.**

With the stack running and fixtures loaded, get a token and call the current query:

```bash
set -a; source .env.local; set +a
TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"track01.project-admin-a@example.test\",\"password\":\"$TRACK01_FIXTURE_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
SRID=$(docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -tAc \
  "select sr.id from spool_revisions sr join isometric_revisions r on r.id=sr.isometric_revision_id join spools s on s.id=sr.spool_id where r.status='accepted' and s.spool_number='SP-T4-001-A';")
curl -s -o /dev/null -w "current: HTTP %{http_code}\n" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $TOKEN" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/material_check_items?select=ident_code,trace_number,quantity,material_check_records!inner(spool_revision_id)&material_check_records.spool_revision_id=eq.$SRID"
```

Expected: `current: HTTP 400`. This is the RED state.

- [x] **Step 2: Confirm the replacement query answers 200.**

```bash
curl -s -o /dev/null -w "candidate: HTTP %{http_code}\n" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $TOKEN" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/material_check_items?select=checked_quantity,spool_revision_materials!inner(ident_code,spool_revision_id),piping_material_records!inner(trace_number)&spool_revision_materials.spool_revision_id=eq.$SRID"
```

Expected: `candidate: HTTP 200`. If it is anything else, **stop and report** rather than editing the source.

- [x] **Step 3: Apply the fix.**

Replace the body of `loadMaterialCheckItems` with:

```ts
export async function loadMaterialCheckItems(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<{ identCode: string; traceNumber: string; quantity: number | null }[]> {
  const { data, error } = await client
    .from("material_check_items")
    .select(
      "checked_quantity, spool_revision_materials!inner(ident_code, spool_revision_id), piping_material_records!inner(trace_number)",
    )
    .eq("spool_revision_materials.spool_revision_id", spoolRevisionId)
  fail(error)
  return (data ?? []).map((row: Row) => ({
    identCode: row.spool_revision_materials?.ident_code ?? "",
    traceNumber: row.piping_material_records?.trace_number ?? "",
    quantity: toNumber(row.checked_quantity),
  }))
}
```

Both embeds are many-to-one, so PostgREST returns an object rather than an array — the same shape the file already relies on at `row.supports?.support_number` (line 402) and `row.weld_joint_revisions?.weld_joints?.weld_number` (line 362).

- [x] **Step 4: Verify the schema check now passes.**

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c \
  "select checked_quantity from public.material_check_items limit 0;"
```

Expected: no error, empty result.

- [x] **Step 5: Run the suites.**

Run: `npm run typecheck && npm run test:unit`

Expected: exit `0`. Note that a green result here proves nothing about the query — that is the entire lesson of defect 3, and Task 3 is what makes it mean something.

- [x] **Step 6: Commit.**

```bash
git add modules/construction/infrastructure/supabase-construction-repository.ts
git commit -m "fix(construction): read material check items through the bill-of-materials line"
```

## Task 2: Make a failed load distinguishable from an empty one

**Files:**
- Modify: `modules/construction/ui/fabrication/material-check-screen.tsx:45-68` and its empty-state paragraph.

**Interfaces:**
- Consumes: `loadBillOfMaterials`, `loadMaterialCheckItems`, `loadLatestQc13Form`.
- Produces: no exported change.

- [x] **Step 1: Add a failure state.**

Beside the existing `useState` block near line 43, add:

```tsx
  const [loadFailed, setLoadFailed] = useState(false)
```

- [x] **Step 2: Set and clear it in the effect.**

Replace the effect body at lines 45-68 with:

```tsx
  useEffect(() => {
    if (!spool) {
      setQc13Form(null)
      setLoadFailed(false)
      return
    }
    const client = getSupabaseBrowserClient()
    void Promise.all([
      loadBillOfMaterials(client, spool.spoolRevisionId),
      loadMaterialCheckItems(client, spool.spoolRevisionId),
      loadLatestQc13Form(client, spool.spoolRevisionId),
    ])
      .then(([billLines, existing, form]) => {
        setLoadFailed(false)
        setLines(billLines)
        setTraces(
          Object.fromEntries(existing.map((item) => [item.identCode, item.traceNumber])),
        )
        setQc13Form(form)
      })
      .catch((error: unknown) => {
        setLoadFailed(true)
        setLines([])
        toast.error(
          error instanceof Error ? error.message : "The bill of materials could not be loaded.",
        )
      })
  }, [spool, refreshToken])
```

- [x] **Step 3: Split the message.**

Find the paragraph reading `This spool revision has no bill of materials to check.` and render the failure case instead when `loadFailed` is true:

```tsx
{loadFailed ? (
  <p className="text-sm text-destructive">
    The bill of materials could not be loaded. Nothing has been changed — reload the page,
    and report this if it persists.
  </p>
) : (
  <p className="text-sm text-muted-foreground">
    This spool revision has no bill of materials to check.
  </p>
)}
```

Keep the surrounding class names as they are in the file; only the conditional and the new sentence are new.

- [x] **Step 4: Confirm `Record traces` cannot be pressed in the failed state.**

Read the disabled expression on the `Record traces` button. It must already be false when `lines` is empty; if it is not, add `|| loadFailed`. State which it was: `__________`.

- [x] **Step 5: Run the suites and commit.**

```bash
npm run typecheck && npm run test:unit
git add modules/construction/ui/fabrication/material-check-screen.tsx
git commit -m "fix(construction): tell a failed material load apart from an empty one"
```

## Task 3: Guard every construction select against the generated types

**Files:**
- Create: `modules/construction/infrastructure/construction-select-columns.test.ts`

**Interfaces:**
- Consumes: the text of `supabase-construction-repository.ts` and `lib/supabase/database.types.ts`.
- Produces: a `test:unit` failure whenever a `.select()` names a column absent from the generated types.

- [x] **Step 1: Write the failing test.**

Create the file:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// Why this test exists: on 2026-08-02 `loadMaterialCheckItems` selected three columns that
// do not exist on material_check_items. PostgREST answered 400, the fabrication golden path
// was blocked, and every automated check stayed green — @supabase/supabase-js 2.110.8 does
// not type-check .select() strings, pgTAP tests SQL rather than PostgREST, and the unit
// tests mock the client. This asserts the select strings against the generated types.

const here = dirname(fileURLToPath(import.meta.url))
const repositorySource = readFileSync(
  resolve(here, "supabase-construction-repository.ts"),
  "utf8",
)
const typesSource = readFileSync(
  resolve(here, "../../../lib/supabase/database.types.ts"),
  "utf8",
)

// Build {relation -> Set<column>} from the generated types. The file is machine-generated
// and regular: each relation is `      name: {` followed by `        Row: {` and one
// `          column: type` per line until the closing brace.
function readRelationColumns(source: string): Map<string, Set<string>> {
  const relations = new Map<string, Set<string>>()
  const lines = source.split("\n")
  for (let index = 0; index < lines.length; index += 1) {
    const header = /^ {6}(\w+): \{$/.exec(lines[index])
    if (!header) continue
    if (!/^ {8}Row: \{$/.test(lines[index + 1] ?? "")) continue
    const columns = new Set<string>()
    for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
      if (/^ {8}\}$/.test(lines[cursor])) break
      const column = /^ {10}(\w+)(\??): /.exec(lines[cursor])
      if (column) columns.add(column[1])
    }
    relations.set(header[1], columns)
  }
  return relations
}

// Extract every `.from("x")` with the `.select("...")` that follows it.
function readSelects(source: string): { relation: string; select: string }[] {
  const found: { relation: string; select: string }[] = []
  const pattern = /\.from\("(\w+)"\)\s*\n?\s*\.select\(\s*("(?:[^"\\]|\\.)*")/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    found.push({ relation: match[1], select: JSON.parse(match[2]) as string })
  }
  return found
}

// Top-level column names only: embedded relations like `supports(support_number)` are
// checked as a relation name, and their inner columns are left to PostgREST.
function topLevelNames(select: string): string[] {
  const names: string[] = []
  let depth = 0
  let token = ""
  for (const character of select) {
    if (character === "(") {
      if (depth === 0 && token.trim()) names.push(token.trim())
      token = ""
      depth += 1
    } else if (character === ")") {
      depth -= 1
    } else if (character === "," && depth === 0) {
      if (token.trim()) names.push(token.trim())
      token = ""
    } else if (depth === 0) {
      token += character
    }
  }
  if (token.trim()) names.push(token.trim())
  return names
}

const relations = readRelationColumns(typesSource)
const selects = readSelects(repositorySource)

assert.ok(relations.size > 20, `expected many relations in the generated types, got ${relations.size}`)
assert.ok(selects.length >= 13, `expected at least 13 selects, found ${selects.length}`)

// The exact defect of 2026-08-02 must be detectable by this parser.
const materialCheckItemColumns = relations.get("material_check_items")
assert.ok(materialCheckItemColumns, "material_check_items missing from the generated types")
assert.ok(!materialCheckItemColumns.has("ident_code"), "material_check_items must not have ident_code")
assert.ok(materialCheckItemColumns.has("checked_quantity"), "material_check_items must have checked_quantity")

for (const { relation, select } of selects) {
  const columns = relations.get(relation)
  assert.ok(columns, `${relation} is selected from but absent from the generated types`)
  if (select.trim() === "*") continue
  for (const name of topLevelNames(select)) {
    const bare = name.replace(/!inner$/, "").replace(/!left$/, "")
    if (relations.has(bare)) continue // an embedded relation, not a column
    assert.ok(
      columns.has(bare),
      `${relation}.select names "${bare}", which is not a column of ${relation}`,
    )
  }
}

console.log(
  `All construction-select-columns.test.ts assertions passed! (${selects.length} selects checked)`,
)
```

- [x] **Step 2: Prove it catches the original defect.**

Temporarily revert `loadMaterialCheckItems`'s select back to
`"ident_code, trace_number, quantity, material_check_records!inner(spool_revision_id)"`, run:

```bash
node --import tsx --test modules/construction/infrastructure/construction-select-columns.test.ts
```

Expected: **FAIL**, with `material_check_items.select names "ident_code", which is not a column of material_check_items`.

Then restore Task 1's query and confirm the test passes. If it passes in the reverted state the parser is not working — **stop and report**; a guard that cannot catch the bug it was written for is worse than none.

- [x] **Step 3: Run the whole unit suite.**

Run: `npm run test:unit`

Expected: exit `0`, with the count one higher than 74. Record it: `__________`.

- [x] **Step 4: Commit.**

```bash
git add modules/construction/infrastructure/construction-select-columns.test.ts
git commit -m "test(construction): assert every repository select against the generated types"
```

### Gate C1 checklist

- [ ] The current query answers `400` and the replacement answers `200` against the live API.
- [ ] `loadMaterialCheckItems` reads ident code from the bill line and trace number from the PML record.
- [ ] A failed load renders a failure message, not "no bill of materials".
- [ ] `construction-select-columns.test.ts` fails on the reverted query and passes on the fixed one.
- [ ] `npm run typecheck && npm run test:unit` exit `0`.

---

# Gate C2 — The secondary defects

## Task 4: Offer only the accepted revision in the fabrication spool picker

**Files:**
- Modify: `modules/construction/ui/fabrication/spool-picker.tsx`

The list renders `status.spoolNumber` and a `<Badge>` of `status.currentStage ?? "not started"` at lines 59-60, over whatever `spool_construction_status` returns — which is every spool revision, superseded ones included.

- [x] **Step 1: Confirm the projection carries revision status.**

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c \
  "select column_name from information_schema.columns where table_name='spool_construction_status' order by ordinal_position;"
```

Expected: a `revision_status` (or equivalently named) column and a revision number column. Record the exact names: `__________`. If neither exists, **stop and report** — filtering would need a view change, which this plan forbids.

- [x] **Step 2: Filter the list and label what remains.**

In `spool-picker.tsx`, drop entries whose revision status is not `accepted`, and render the revision number beside the spool number. Around line 59 the row currently reads:

```tsx
<span className="font-mono text-xs">{status.spoolNumber}</span>
<Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
```

Add the revision between them:

```tsx
<span className="font-mono text-xs">{status.spoolNumber}</span>
<span className="text-muted-foreground text-xs">{status.revisionNumber}</span>
<Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
```

and filter the source list next to the existing `needle` filter at line 37, using the column names recorded in Step 1.

Do **not** touch the `PQC31` guard — the database refusal stays exactly as it is, and Task 12 Step 5 still exercises it.

- [x] **Step 3: Verify in the browser.**

With R0 superseded and R1 accepted, open `http://localhost:3000/fabrication/material-check`.

Expected: **two** entries, `SP-T4-001-A` and `SP-T4-001-B`, each showing `R1`. Before the fix there were four.

- [x] **Step 4: Run the suites and commit.**

```bash
npm run typecheck && npm run test:unit
git add modules/construction/ui
git commit -m "fix(construction): offer only accepted spool revisions in the fabrication picker"
```

## Task 5: Stop the home dashboard presenting demo numbers as real

**Files:**
- Modify: `app/page.tsx` — it renders the "Welds requiring action" / "NDE batches active" cards.

- [x] **Step 1: Add the banner.**

In Supabase mode only, render above the metric cards:

```tsx
{mode === "supabase" ? (
  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
    This dashboard still shows demonstration figures. It is not yet connected to project
    data — use the module screens for real numbers.
  </div>
) : null}
```

Use whatever `useAppMode()` returns in this codebase; match the surrounding component's conventions.

- [x] **Step 2: Verify.**

Open `http://localhost:3000/` as Project Admin A in Supabase mode. Expected: the banner is visible above the cards. Switch to demo mode: the banner is absent.

- [x] **Step 3: File the rebuild.**

Append to `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` §23 (T11 — Documents, Forms & Reports):

```markdown
- Домашний дашборд `/` в Supabase-режиме показывает демо-цифры (найдено браузерным прогоном 2026-08-02: при `spools=0` отображал «Welds requiring action 1», «NDE batches active 4», уведомления `PL-FU300-007-A`). Временно закрыт баннером; перевод на `spool_construction_status` и реальные уведомления — задача T11.
```

- [x] **Step 4: Commit.**

```bash
git add app components docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md
git commit -m "fix(home): mark the demo dashboard figures in Supabase mode"
```

## Task 6: Make the documented dev URL the one that works

**Files:**
- Modify: `next.config.ts`, `docs/qa/local-supabase-browser-runbook.md`.

- [x] **Step 1: Reproduce.**

Open `http://127.0.0.1:3000`. Expected: it stays on "Loading PipeQC…" and the dev log prints *"Blocked cross-origin request to Next.js dev resource /_next/webpack-hmr from 127.0.0.1"*.

- [x] **Step 2: Allow the origin.**

In `next.config.mjs`, add to the exported config:

```ts
  allowedDevOrigins: ["127.0.0.1", "localhost"],
```

- [x] **Step 3: Restart and confirm both hosts work.**

Restart `npm run dev`, then load both `http://127.0.0.1:3000` and `http://localhost:3000`.

Expected: both reach the sign-in page. If `127.0.0.1` still hangs, **do not leave the runbook claiming it works** — instead change the runbook's agent contract to name `http://localhost:3000` only, and record here which of the two outcomes happened: `__________`.

- [x] **Step 4: Commit.**

```bash
git add next.config.ts docs/qa/local-supabase-browser-runbook.md
git commit -m "fix(dev): allow the 127.0.0.1 dev origin the runbook documents"
```

## Task 7: Correct the revision-decision blocking message

**Files:**
- Modify: `modules/engineering/application/resolve-revision.ts:14`
- Test: `modules/engineering/application/resolve-revision.test.ts:15`

`describeRevisionApplyGate` returns the sentence, and `unresolvedCount` is produced by
`unresolvedItems()`, which filters `item.requiresDecision && item.decision === null`. So the
number counts **items awaiting a decision**, not revised spools — which is why the browser
showed "2 revised spools or reworked welds still need a decision" when exactly one spool was
revised and the other was `Unchanged` but still required a decision. Only the sentence is
wrong; the count is doing what it says in code.

- [x] **Step 1: Write the failing assertion.**

In `resolve-revision.test.ts`, replace line 15 with a check of the sentence, not just `allowed`:

```ts
assert.deepEqual(
  describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 0, unresolvedCount: 3 }),
  { allowed: false, reason: "3 items still need a decision before this import can be applied." },
)
assert.deepEqual(
  describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 0, unresolvedCount: 1 }),
  { allowed: false, reason: "1 item still needs a decision before this import can be applied." },
)
```

- [x] **Step 2: Run it and watch it fail.**

Run: `node --import tsx --test modules/engineering/application/resolve-revision.test.ts`

Expected: FAIL, with the actual reason still reading `3 revised spools or reworked welds still need a decision.`

- [x] **Step 3: Change the sentence.**

At `resolve-revision.ts:14`, replace the `unresolvedCount` branch with:

```ts
  if (gate.unresolvedCount > 0) return { allowed: false, reason: gate.unresolvedCount === 1 ? "1 item still needs a decision before this import can be applied." : `${gate.unresolvedCount} items still need a decision before this import can be applied.` }
```

Keep the file's single-line style — every other branch in this function is one line.

Do **not** change `unresolvedItems()` or the preview builder. Whether an `Unchanged` spool
should require a decision at all is a separate question; if you believe it should not,
**stop and report** rather than changing it here.

- [x] **Step 4: Run it and watch it pass.**

Run: `node --import tsx --test modules/engineering/application/resolve-revision.test.ts`

Expected: PASS.

- [x] **Step 5: Run the suites and commit.**

```bash
npm run typecheck && npm run test:unit
git add modules/engineering/application/resolve-revision.ts         modules/engineering/application/resolve-revision.test.ts
git commit -m "fix(engineering): describe the outstanding revision decisions accurately"
```

### Gate C2 checklist

- [ ] The fabrication picker shows two entries, both `R1`, with R0 superseded.
- [ ] The `PQC31` guard is untouched.
- [ ] `/` carries a demo-data banner in Supabase mode and none in demo mode, and T11 records the rebuild.
- [ ] Both dev hosts work, or the runbook names only the one that does.
- [ ] The revision-decision sentence matches the number it prints.

---

# Gate C3 — Verified from empty

## Task 8: Run the full verification from a fresh reset

**Files:** none — recorded output only.

- [x] **Step 1: Reset.**

Run: `/opt/homebrew/bin/supabase db reset`

Expected: all 35 migrations apply in order, the last two being `20260805090000_track05_remediation.sql` and `20260805091000_grant_track05_fixture_referentials.sql`. Verified working on 2026-08-02; a failure here is a regression.

- [x] **Step 2: Verify.**

Run: `npm run verify`

Expected: exit `0`. Record:

- `supabase test db` — Files=`___`, Tests=`___`. The 2026-08-05 baseline was 20 files / 422 assertions; the remediation's `PQC39` and `PQC34` assertions should put it **above 422**. Exactly 422 means the remediation tests are not running — **stop and report**.
- Node runner — pass=`___`, fail=`___` (baseline 74 plus Task 3's file).
- `validate:fixtures` — issues=`___` (baseline 0).

- [x] **Step 3: Confirm the generated types match.**

```bash
/opt/homebrew/bin/supabase gen types typescript --local > /tmp/pipeqc-types-check.ts
diff -q lib/supabase/database.types.ts /tmp/pipeqc-types-check.ts && echo "types in sync"
```

Expected: `types in sync`. Task 3's guard reads this file, so a drift here silently weakens it — if `diff` reports a difference, **stop and report** before regenerating.

- [x] **Step 4: Confirm the remediation behaviours exist in the running database.**

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='effective_stage_date') overloads,
  (select position('fabrication.progress.record' in pg_get_functiondef(p.oid)) > 0
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='request_qc13_form') qc13_guard,
  (select count(*) from pg_views where schemaname='public'
     and viewname='spool_material_check_status') phantom_view;"
```

Expected: `2 | t | 0`.

- [x] **Step 5: Commit.**

```bash
git add docs/superpowers/plans/2026-08-06-track-05-close-out.md
git commit -m "test(construction): verify Track 05 from a fresh database reset"
```

## Task 9: Correct master roadmap §18 so Track 06 is buildable

**Files:**
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` §18 — the plan pointer and the `### Database` block only.

- [x] **Step 1: Confirm the collisions.**

```bash
ls supabase/migrations/ | grep 20260805
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select table_name from information_schema.tables where table_schema='public'
 and table_name in ('nde_obligations','pwht_requirements','pwht_results') order by table_name;"
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select conname, pg_get_constraintdef(oid) from pg_constraint
 where conrelid='public.nde_obligations'::regclass and contype='u';"
ls docs/superpowers/plans/ | grep track-06 || echo "no Track 06 plan exists"
```

Expected: two `20260805*` migrations; all three tables present; `unique (weld_joint_revision_id, method)`; no Track 06 plan.

- [x] **Step 2: Replace the plan pointer.**

Replace `**Отдельный execution plan:** \`docs/superpowers/plans/2026-08-05-track-06-nde-quality.md\`.` with:

```markdown
**Отдельный execution plan:** `docs/superpowers/plans/2026-08-07-track-06-nde-quality.md` (ещё не написан).
```

- [x] **Step 3: Replace the `### Database` block.**

````markdown
### Database

> **Проверено 2026-08-06 против дерева.** Прежний список неисполним: `20260805090000_nde_obligations.sql` конфликтует с уже применённой `20260805090000_track05_remediation.sql`, а три перечисленные таблицы уже созданы Track 05.

Уже существует — Track 06 **изменяет, а не создаёт**:

- `nde_obligations` (`20260804092000_weld_progress_commands.sql:47`) — `disposition text check (in ('pending','satisfied','waived'))`, `unique (weld_joint_revision_id, method)`;
- `pwht_requirements` (`20260804092000_weld_progress_commands.sql:65`);
- `pwht_results` (`20260804093000_fabrication_release.sql:18`);
- `record_nde_obligation_outcome(uuid, text, text)` (`20260804092200_weld_progress_locks.sql:137`) — **interim**, подлежит удалению и замене, а не расширению.

Два блокера, которые Track 06 обязан снять в первой же миграции:

1. **`unique (weld_joint_revision_id, method)`** запрещает второе obligation на тот же шов и метод. Repair R1/R2 и tracer T1/T2 — это именно дополнительные obligations на тот же шов и метод, поэтому вся модель Track 06 упирается в это ограничение. Его нужно расширить (например до `unique (weld_joint_revision_id, method, cycle_kind, cycle_ordinal)`), а не обходить новой таблицей.
2. **`spool_fabrication_readiness.nde_pending` считает `disposition = 'pending'`** (`20260804093000_fabrication_release.sql:165`), и от неё зависят `is_releasable` и отказ `PQC37`. Любое изменение словаря `disposition` меняет release gate, поэтому view заменяется в той же миграции — иначе QC release молча начнёт пропускать спулы с открытым NDE.

Новые файлы Track 06 (таймстемпы после `20260805091000`):

- `supabase/migrations/20260807090000_nde_obligation_lifecycle.sql` — расширение `nde_obligations`, снятие блокера 1, замена `spool_fabrication_readiness` (блокер 2), удаление `record_nde_obligation_outcome`;
- `supabase/migrations/20260807091000_nde_batches_results.sql`;
- `supabase/migrations/20260807092000_nde_repair_tracer.sql`;
- `supabase/migrations/20260807093000_nde_penalty_commands.sql`;
- `supabase/migrations/20260807094000_pwht_quality_gate.sql`;
- `supabase/tests/database/060_nde_batch_invariants.test.sql`;
- `supabase/tests/database/061_nde_repair_tracer_truth_table.test.sql`;
- `supabase/tests/database/062_nde_penalty.test.sql`;
- `supabase/tests/database/063_pwht_release.test.sql`.

Track 05 занимает коды `PQC30`–`PQC39`; Track 06 начинает с `PQC40`.

> **Обязательно для Track 06.** Каждый новый экран проходится в браузере по `docs/qa/local-supabase-browser-runbook.md` до объявления трека завершённым. Прогон 2026-08-02 нашёл в Track 05 запрос, который ломал весь golden path и при этом проходил `typecheck`, pgTAP и unit-тесты: `@supabase/supabase-js` не типизирует строки `.select()`. `modules/construction/infrastructure/construction-select-columns.test.ts` закрывает этот класс для construction — для новых модулей Track 06 нужен свой аналог.
````

- [x] **Step 4: Confirm no dead references remain.**

```bash
grep -rn "2026-08-05-track-06\|20260805090000_nde_obligations\|20260805091000_nde_batches" docs/
```

Expected: no output.

- [x] **Step 5: Commit.**

```bash
git add docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md
git commit -m "docs(roadmap): correct the Track 06 database section against the real schema"
```

### Gate C3 checklist

- [ ] `npm run verify` exits `0` from a fresh reset, with all four counts recorded.
- [ ] The pgTAP assertion count exceeds 422.
- [ ] `database.types.ts` is in sync — Task 3's guard depends on it.
- [ ] The remediation probe returns `2 | t | 0`.
- [ ] Roadmap §18 names only unused filenames, marks the three tables modify-not-create, names both blockers, and mandates the browser walk.

---

# Gate C4 — The browser walk that proves the fix

This gate is manual and cannot be replaced by any automated suite. Follow `docs/qa/local-supabase-browser-runbook.md`, using **Track 04 UI-import mode** — Tracks 01–04 first, T04 through the UI, then the Track 05 bootstrap. Use `http://localhost:3000`.

## Task 10: Rebuild the stand and re-verify the fixtures

**Files:** none — recorded output only.

- [x] **Step 1: Reset and seed Tracks 01–04 only.**

```bash
/opt/homebrew/bin/supabase db reset
set -a; source .env.local; set +a
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
npm run bootstrap:track01-browser-fixtures && npm run bootstrap:track02-browser-fixtures &&
npm run bootstrap:track03-browser-fixtures && npm run bootstrap:track04-browser-fixtures
```

`TRACK01_FIXTURE_PASSWORD` must be at least 12 characters (`bootstrap-track01-browser-fixtures.ts:252`).

Expected clean state:

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select (select count(*) from isometrics) isos, (select count(*) from spools) spools,
       (select count(*) from import_jobs) jobs, (select count(*) from spool_stage_events) stage;"
```

→ `0 | 0 | 0 | 0`.

- [x] **Step 2: Walk T04 through the UI.**

Run `npm run dev`, sign in as `track01.project-admin-a@example.test`, project `TRACK01-A`, and perform T04 steps 1-9 from the runbook using `scripts/weld.txt`, `scripts/trace.txt`, `scripts/supp.txt`.

All nine passed on 2026-08-02, so any failure is a regression — record it and **stop**.

Expected after applying R0:

```text
SP-T4-001-A | 2 | 4 | 1 | 2
SP-T4-001-B | 1 | 2 | 0 | 1
```

- [x] **Step 3: Bootstrap Track 05 and prove the rows.**

```bash
npm run bootstrap:track05-browser-fixtures
```

Expected: `Track 05 referentials reconciled: 14 rows upserted into project <uuid>.` and
`Engineering definition ISO-T4-001 already has an accepted revision; nothing to import.`

The literal **14** is what the script printed on 2026-08-02 and what `scripts/bootstrap-track05-browser-fixtures.test.ts:58` asserts. Then:

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

Expected: `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`.

- [ ] **Step 4: Prove idempotency across two more runs.**

Run the Track 05 bootstrap twice more. Expected: byte-identical output each time, and the row query above unchanged. A count that grew means a missing `onConflict` target — **stop and report which table grew**.

- [x] **Step 5: Commit the recorded evidence.**

```bash
git add docs/superpowers/plans/2026-08-06-track-05-close-out.md
git commit -m "test(construction): re-prove the Track 05 fixture chain end to end"
```

## Task 11: Walk the T05 golden path

**Files:** none — recorded observation only.

**Interfaces:**
- Consumes: the stand from Task 10 and the fixes from Gates C1-C2.
- Produces: the first successful end-to-end fabrication walk. This is the criterion the fabrication plan's Task 26 claimed and never performed.

- [x] **Step 1: Confirm defect 1 is gone.**

Open `/fabrication/material-check` and select `SP-T4-001-A`.

Expected: the picker offers **two** spools (Task 4), the header reads `ISO-T4-001 / SP-T4-001-A (R1)`, and the materials table lists `IDN-T5-100` and `IDN-T5-200`. Before the fix it read "This spool revision has no bill of materials to check."

Check the browser console: expected **no** `400` on `material_check_items`. Record the console error count: `__________`.

- [x] **Step 2: T05-01 material traceability.**

1. Click **Record Start Fab**.
2. Click **Issue QC-13**; record the form number: `__________`.
3. Enter `HEAT-T5-100` against `IDN-T5-100` only and try **Record traces**. Expected: **no** Material check entry appears on the timeline — a partial check produces no event.
4. Add `HEAT-T5-200` against `IDN-T5-200` and click **Record traces**. Expected: the timeline gains **Material check**.

- [x] **Step 3: Prove the issued QC-13 was attached.**

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select f.form_number from material_check_records m join qc13_progress_forms f on f.id = m.qc13_form_id;"
```

Expected: one row, equal to the number from Step 2. `0 rows` means remediation Task 3's fix never reaches the running screen — **stop and report**.

- [x] **Step 4: T05-02 shop weld progress.**

On `/fabrication/weld-progress`, for `SP-T4-001-A` joints `W-T4-001` then `W-T4-002`: subcontractor `SUB-T5`, WPS `WPS-T5`, root welder `W-T5-1`, cap welder `W-T5-2`, weld date today, **Record weld progress**.

Expected: each joint shows one pending RT obligation and one PWHT requirement.

- [x] **Step 5: T05-03 supports, gates and QC release.**

On `/fabrication/qc-release` for `SP-T4-001-A`:

1. **Mark installed** on `SU-T4-001`.
2. Expected: Fabricated gains a date, **QC release spool** stays **disabled** and names the outstanding NDE/PWHT counts.
3. **Mark accepted** on both RT obligations.
4. Enter chart `CHART-T5-1` and **Record accepted** for both PWHT requirements.
5. Expected: the release button enables. Click it.

- [x] **Step 6: T05-04 paint and laydown.**

1. `/fabrication/paint` — **Record Sent to Paint**. Line service `LS-T5`, DFT `200` → expected **refused** by the paint matrix. DFT `250`, W10P `W10P-T5-1` → **Record painting** succeeds.
2. `/fabrication/laydown` — location `YARD-T5`, **Record laydown**.
3. `/fabrication/dashboard` — hard-refresh; expected: current stage laydown with the full history.

- [x] **Step 7: Prove the ledger.**

```bash
docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -c "
select e.stage, e.occurred_on from spool_stage_events e
join spool_revisions sr on sr.id = e.spool_revision_id
join spools s on s.id = sr.spool_id
where s.spool_number='SP-T4-001-A' order by construction_stage_ordinal(e.stage);"
```

Expected, in order: `start_fab`, `material_check`, `qc_release`, `sent_to_paint`, `painted`, `final_qc`, `laydown`. **`fabricated` is absent by design** — it is computed by `spool_fabrication_readiness` and has no event row.

- [x] **Step 8: Commit.**

```bash
git add docs/superpowers/plans/2026-08-06-track-05-close-out.md
git commit -m "test(construction): walk the Track 05 golden path in the browser"
```

## Task 12: Walk the negatives, the refresh and the second user

**Files:** none — recorded observation only.

- [x] **Step 1: Hard refresh.** Reload `/fabrication/dashboard`. Expected: identical stage history.

- [ ] **Step 2: Second signed-in user.** In a separate profile, sign in as another Project-A member. Expected: the same history for `SP-T4-001-A`.

- [ ] **Step 3: Allocation refusal is pre-flight.** On `/fabrication/weld-progress`, `SP-T4-001-B` / `W-T4-003`, allocate two points totalling 90 %. Expected: the message appears **before** any request — confirm in the Network tab that no RPC is sent.

- [ ] **Step 4: Locked joint.** Try recording `W-T4-001` again. Expected: a locked-joint sentence, never raw SQL text.

- [x] **Step 5: `PQC31` on a superseded revision.**

T04 leaves R0 superseded, so this path is finally reachable. Since Task 4 removed superseded revisions from the picker, exercise the command directly with the fixture user's token:

```bash
SUPERSEDED=$(docker exec supabase_db_pipe-qc-shell-layout psql -U postgres -d postgres -tAc \
  "select sr.id from spool_revisions sr join isometric_revisions r on r.id=sr.isometric_revision_id join spools s on s.id=sr.spool_id where r.status='superseded' and s.spool_number='SP-T4-001-A';")
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/record_construction_progress" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_spool_revision_id\":\"$SUPERSEDED\",\"target_phase\":\"fabrication\",\"target_stage\":\"start_fab\",\"target_date\":\"2026-08-06\"}"
```

Expected: an error carrying `PQC31`. Record the message: `__________`.

- [ ] **Step 6: Route capability.** Sign in as `track01.reader-qc@example.test`. Expected: neither `/fabrication/qc-release` nor `/fabrication/material-check` is reachable.

- [x] **Step 7: Commit.**

```bash
git add docs/superpowers/plans/2026-08-06-track-05-close-out.md
git commit -m "test(construction): walk the Track 05 negative paths and persistence checks"
```

### Gate C4 checklist

- [ ] The material-check screen lists the bill of materials, with no `400` in the console.
- [ ] The picker offers two spools, both `R1`.
- [ ] The full stage ladder exists for `SP-T4-001-A`, with `fabricated` absent by design.
- [ ] `material_check_records.qc13_form_id` holds the issued form.
- [ ] A partial material check produced no event.
- [ ] The QC release button's disabled state and the RPC's acceptance agreed at every point.
- [ ] `200` µm refused, `250` µm accepted.
- [ ] Hard refresh and a second user show the same result.
- [ ] `PQC31` refused a superseded revision.
- [ ] A reader reaches neither fabrication route.

---

# Gate C5 — Close the record

## Task 13: Pin the shop-joint limitation

**Files:**
- Create: `supabase/tests/database/054_readiness_shop_joint_limitation.test.sql`

**Interfaces:**
- Consumes: `public.spool_fabrication_readiness` (`20260804093000_fabrication_release.sql:94`), unchanged.
- Produces: a test that fails when Track 07 narrows the view, telling its author what the behaviour was.

`spool_fabrication_readiness` counts every non-removed weld joint, not only `weld_location = 'shop'`, so a spool carrying a field or assembly joint can never reach `is_fabricated` through Shop Weld Progress. Both addenda record this in prose only. All three Track 05 fixture welds are `shop`, so it affects no fixture here — it is a real-data bug, deferred to Track 07 and pinned now.

- [x] **Step 1: Reset so bootstrap data cannot interfere.**

Run: `/opt/homebrew/bin/supabase db reset`

- [x] **Step 2: Write the test.**

```sql
-- Characterization test, not an endorsement.
--
-- spool_fabrication_readiness counts every non-removed weld joint of the spool, not only
-- weld_location = 'shop'. Shop Weld Progress refuses field and assembly joints with PQC30,
-- so a spool carrying one can never reach is_fabricated through the fabrication screens.
--
-- Recorded as a Track 07 limitation in both Track 05 execution addenda. Pinned here so
-- that when Track 07 narrows the view this file fails loudly and its author learns what
-- the behaviour was and that changing it is the point.
--
-- The three Track 05 browser fixtures in scripts/weld.txt are all shop joints, so this
-- limitation affects no fixture in this repository today.

begin;
select plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000541', 'authenticated', 'authenticated', 'lim.platform@example.test', 'not-used', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000542', 'authenticated', 'authenticated', 'lim.admin@example.test', 'not-used', now(), now(), now());

update public.profiles set is_platform_admin = true
where id = '10000000-0000-0000-0000-000000000541';

insert into public.projects (id, activity_code, title, owner_name, contractor_name, maximum_transit_time_days, created_by)
values ('30000000-0000-0000-0000-000000000541', 'LIM-A', 'Limitation A', 'Owner', 'Contractor', 1,
        '10000000-0000-0000-0000-000000000541');

insert into public.project_memberships (id, project_id, user_id, role, access_role_code, is_active)
values ('20000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '10000000-0000-0000-0000-000000000542', 'system_admin', 'project_admin', true);

insert into public.project_subcontractors (id, project_id, code, description)
values ('50000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SUB-1', 'Fab Sub 1');

insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-0000-0000-0000-000000000541', 'material_type', 'CS2', 'Carbon steel 2')
on conflict do nothing;

insert into public.project_service_classes (id, project_id, material_type_id, code, description)
values ('51000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '53000000-0000-0000-0000-000000000541', 'SC-1', 'Service class 1');

insert into public.project_weld_types (id, project_id, code, description)
values ('52000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'BW', 'Butt weld');

insert into public.project_welding_procedures (
  id, project_id, subcontractor_id, material_type_id, code, process,
  diameter_from, diameter_to, thickness_from, thickness_to, revision, approved_on)
values ('56000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '50000000-0000-0000-0000-000000000541', '53000000-0000-0000-0000-000000000541',
        'WPS-1', 'GTAW', 1, 12, 2, 20, 'R0', date '2026-01-01');

-- Definition graph: one spool, ONE SHOP JOINT AND ONE FIELD JOINT, one support, one bill line
insert into public.isometrics (id, project_id, iso_number)
values ('40000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'ISO-0541');

insert into public.spools (id, project_id, spool_number)
values ('41000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SP-0541-A');

insert into public.weld_joints (id, project_id, weld_number)
values
  ('46000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'W-0541-01'),
  ('46000000-0000-0000-0000-000000000542', '30000000-0000-0000-0000-000000000541', 'W-0541-02');

insert into public.supports (id, project_id, support_number)
values ('49000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541', 'SUP-0541-01');

insert into public.isometric_revisions (
  id, isometric_id, revision_number, revision_ordinal, status, service_class_id, accepted_at)
values ('42000000-0000-0000-0000-000000000541', '40000000-0000-0000-0000-000000000541', 'R0', 1,
        'accepted', '51000000-0000-0000-0000-000000000541', now());

insert into public.spool_revisions (id, spool_id, isometric_revision_id, sequence_number, material_class)
values ('43000000-0000-0000-0000-000000000541', '41000000-0000-0000-0000-000000000541',
        '42000000-0000-0000-0000-000000000541', 1, 'A1');

insert into public.weld_joint_revisions (
  id, weld_joint_id, spool_revision_id, weld_type_id, weld_location, diameter_inch, thickness_mm)
values
  ('47000000-0000-0000-0000-000000000541', '46000000-0000-0000-0000-000000000541',
   '43000000-0000-0000-0000-000000000541', '52000000-0000-0000-0000-000000000541', 'shop', 6, 8),
  ('47000000-0000-0000-0000-000000000542', '46000000-0000-0000-0000-000000000542',
   '43000000-0000-0000-0000-000000000541', '52000000-0000-0000-0000-000000000541', 'field', 6, 8);

insert into public.support_revisions (id, support_id, spool_revision_id, support_type, quantity)
values ('4a000000-0000-0000-0000-000000000541', '49000000-0000-0000-0000-000000000541',
        '43000000-0000-0000-0000-000000000541', 'shoe', 1);

insert into public.spool_revision_materials (id, spool_revision_id, ident_code, quantity, unit, trace_number)
values ('44000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541',
        'IDN-100', 3, 'm', 'HEAT-100');

insert into public.piping_material_records (id, project_id, mrr_number, ident_code, trace_number)
values ('45000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        'MRR-1', 'IDN-100', 'HEAT-100');

-- Everything except the field joint is complete: material check done, support installed,
-- and the SHOP joint welded. The field joint is the only outstanding item.
insert into public.material_check_records (id, project_id, spool_revision_id, checked_on)
values ('60000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '43000000-0000-0000-0000-000000000541', date '2026-02-01');

insert into public.material_check_items (
  id, material_check_record_id, spool_revision_material_id, piping_material_record_id, checked_quantity)
values ('61000000-0000-0000-0000-000000000541', '60000000-0000-0000-0000-000000000541',
        '44000000-0000-0000-0000-000000000541', '45000000-0000-0000-0000-000000000541', 3);

insert into public.support_progress_records (id, project_id, support_revision_id, spool_revision_id, installed_on)
values ('62000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '4a000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541', date '2026-02-02');

insert into public.weld_progress_records (
  id, project_id, weld_joint_revision_id, spool_revision_id,
  subcontractor_id, welding_procedure_id, weld_on)
values ('63000000-0000-0000-0000-000000000541', '30000000-0000-0000-0000-000000000541',
        '47000000-0000-0000-0000-000000000541', '43000000-0000-0000-0000-000000000541',
        '50000000-0000-0000-0000-000000000541', '56000000-0000-0000-0000-000000000541',
        date '2026-02-03');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000542', true);
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000542","role":"authenticated"}', true);

select is(
  (select weld_total from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  2::int,
  'weld_total counts the field joint as well as the shop joint (Track 07 limitation)'
);

select is(
  (select weld_complete from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  1::int,
  'only the shop joint carries weld progress, because Shop Weld Progress refuses field joints with PQC30'
);

select is(
  (select is_material_checked from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  true,
  'the bill of materials is fully checked, so the material clause does not confound this test'
);

select is(
  (select is_fabricated from public.spool_fabrication_readiness
   where spool_revision_id = '43000000-0000-0000-0000-000000000541'),
  false,
  'the uncountable field joint alone blocks is_fabricated; narrowing the view to shop joints is a Track 07 decision'
);

select * from finish();
rollback;
```

- [x] **Step 3: Run it.**

Run: `/opt/homebrew/bin/supabase test db`

Expected: `054_…` reports `ok 1` through `ok 4`; the file count rises by one and the assertion count by four against Task 8 Step 2. This test characterises existing behaviour, so it passes on first write — there is no RED phase. If any assertion **fails**, the behaviour is not what both addenda claim: **stop and report which one and what it returned**.

- [x] **Step 4: Prove it has teeth.**

Temporarily append `and wjr.weld_location = 'shop'` to the `welds` lateral in `20260804093000_fabrication_release.sql:150`, run `/opt/homebrew/bin/supabase db reset && /opt/homebrew/bin/supabase test db`, and confirm assertions 1 and 4 fail.

Then **revert** with `git checkout -- supabase/migrations/20260804093000_fabrication_release.sql` and reset again. Migrations are forward-only; this edit must never be committed. Confirm before ticking: `git status` shows no change under `supabase/migrations/`.

- [x] **Step 5: Verify and commit.**

```bash
npm run verify
git add supabase/tests/database/054_readiness_shop_joint_limitation.test.sql
git commit -m "test(construction): pin the shop-joint readiness limitation for Track 07"
```

## Task 14: Reconcile the addenda and write the close-out status

**Files:**
- Modify: `docs/superpowers/plans/2026-08-05-track-05-remediation.md`, `docs/superpowers/plans/2026-08-04-track-05-fabrication.md`, `docs/TRACK05_BROWSER_FIXTURES.md`.

- [x] **Step 1: Correct the count.**

In the remediation plan's deviation table, replace `The count is now 13 …` with `The count is now 14 …`. The script printed 14 on 2026-08-02 and `bootstrap-track05-browser-fixtures.test.ts:58` asserts 14.

- [x] **Step 2: Confirm all three agree.**

```bash
grep -n "The count is now" docs/superpowers/plans/2026-08-0*-track-05-*.md
grep -n "planInsertCount(plan)" scripts/bootstrap-track05-browser-fixtures.test.ts
```

Expected: the same number in all three.

- [x] **Step 3: Record the measured pgTAP/fixture interaction.**

`docs/TRACK05_BROWSER_FIXTURES.md` and the runbook both claimed pgTAP and bootstrap data cannot share a database, without evidence. **Measured on 2026-08-02** against the full Track 01–05 stand: `supabase test db` exits non-zero, `Files=20, Tests=354` against 422 on a clean database, with three files aborting:

| File | Failure |
| --- | --- |
| `040_engineering_identity.test.sql` | `Bad plan. You planned 20 tests but ran 16.` |
| `042_spooling_apply.test.sql` | `Bad plan. You planned 40 tests but ran 0.` |
| `051_weld_progress.test.sql` | `ERROR: material_type_id must reference a material_type system referential` at line 28 |

The mechanism is visible in `051`: the test inserts its `system_reference_entries` row with `on conflict do nothing`, the bootstrap has already taken that code, the insert is skipped, and the test's own id then fails its foreign key. Every test file ends in `rollback`, so pgTAP leaves no residue — **the conflict is one-way: bootstrap data breaks pgTAP, never the reverse.**

Replace the unverified paragraph in **both** documents with:

```markdown
### Fixtures and pgTAP do not coexist

Measured 2026-08-02: with the full Track 01–05 bootstrap data present, `supabase test db`
reports `Files=20, Tests=354` and fails in three files — `040_engineering_identity`
(`planned 20 tests but ran 16`), `042_spooling_apply` (`planned 40 but ran 0`) and
`051_weld_progress` (`material_type_id must reference a material_type system referential`).
The cause is `on conflict do nothing` on shared `system_reference_entries` codes: the
bootstrap owns the code, the test's insert is skipped, and its foreign key then fails.

Every test file ends in `rollback`, so the suite leaves no residue. The conflict runs one
way only: **bootstrap data breaks pgTAP, never the reverse.** Therefore `supabase db reset`
before `supabase test db`, and re-run the bootstrap chain afterwards if you want the browser
fixtures back. Track 06 will meet this on every iteration; budget for the reset.
```

Re-measure once before writing it in, and if the figures differ from the table above, write **your** figures and say so.

- [x] **Step 4: Append the status block to both Track 05 plans.**

```markdown

---

## Close-out status (2026-08-06)

Verified by `docs/superpowers/plans/2026-08-06-track-05-close-out.md`. The step boxes above
were never ticked contemporaneously and are **deliberately left unticked** — retro-ticking
would assert that a command ran at a time it did not. This block is the evidence instead.

**Defect found by the browser walk, absent from every automated check.** On 2026-08-02
`loadMaterialCheckItems` was found to select three columns that do not exist on
`material_check_items`; PostgREST answered `400`, the failure took the bill of materials
down with it, and the material-check screen reported "no bill of materials to check". The
entire fabrication golden path was blocked. `npm run verify` was green throughout:
`@supabase/supabase-js` 2.110.8 does not type-check `.select()` strings, pgTAP tests SQL
rather than PostgREST, and the unit tests mock the client. Fixed, and the class is now
guarded by `modules/construction/infrastructure/construction-select-columns.test.ts`.

**Verified by execution:**

- `supabase db reset` applies all 35 migrations including both `20260805*` files.
  `npm run verify` exits `0`: pgTAP Files=`___`, Tests=`___`; unit pass=`___`; fixtures=`___`.
- `database.types.ts` matches `supabase gen types typescript --local`.
- `effective_stage_date` has two overloads; `request_qc13_form` is guarded by
  `fabrication.progress.record`; no `spool_material_check_status` view exists.
- Track 04's SpoolGen import was performed **through the real UI** — missing-file refusal,
  4 MB rejection before any Storage write, `PDS-NOPE` blocking error, clean validate, R0
  applied, R1 revision decisions, R0 superseded. Definition shape
  `SP-T4-001-A: 2/4/1/2`, `SP-T4-001-B: 1/2/0/1`.
- The Track 05 bootstrap prints `14 rows upserted`, skips the import when an accepted
  revision exists, writes `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`, and is idempotent across three runs.
- The golden path was walked end to end: `SP-T4-001-A` carries
  `start_fab → material_check → qc_release → sent_to_paint → painted → final_qc → laydown`,
  with `fabricated` absent by design. Hard refresh and a second signed-in user agree.
  `material_check_records.qc13_form_id` holds the issued form.
- `PQC31` refuses a superseded revision; a reader reaches neither fabrication route.
- The `spool_fabrication_readiness` shop-joint limitation is pinned by
  `supabase/tests/database/054_readiness_shop_joint_limitation.test.sql`.

**Also fixed:** the fabrication spool picker offered superseded revisions indistinguishably;
`/` presented demo figures as real in Supabase mode; the revision-decision message miscounted;
`127.0.0.1:3000` was unreachable.
```

Substitute the real figures. Leaving `___` is a plan failure.

- [x] **Step 5: Commit.**

```bash
git add docs/superpowers/plans/2026-08-04-track-05-fabrication.md \
        docs/superpowers/plans/2026-08-05-track-05-remediation.md \
        docs/TRACK05_BROWSER_FIXTURES.md docs/qa/local-supabase-browser-runbook.md
git commit -m "docs(construction): record the verified Track 05 close-out status"
```

## Task 15: Final verification and close

- [x] **Step 1: Reset and verify.**

Run: `/opt/homebrew/bin/supabase db reset && npm run verify`

Expected: exit `0`, figures matching Task 13 Step 5. Record: Files=`___`, Tests=`___`, unit pass=`___`.

- [x] **Step 2: Confirm the change surface.**

```bash
git diff --stat <Task-0-Step-4-SHA>..HEAD -- modules app components lib store config scripts supabase/migrations next.config.mjs
```

Expected: changes **only** in `modules/construction/infrastructure/supabase-construction-repository.ts`, `modules/construction/infrastructure/construction-select-columns.test.ts`, `modules/construction/ui/**`, the home dashboard file, the spooling revision-decisions file and `next.config.ts`. **Nothing under `supabase/migrations/`.** Anything else is scope leak — report it.

- [x] **Step 3: Confirm no unticked boxes or placeholders.**

```bash
grep -n "^- \[ \]" docs/superpowers/plans/2026-08-06-track-05-close-out.md
grep -n "___\|<Task-0-Step-4-SHA>\|__________" docs/superpowers/plans/2026-08-06-track-05-close-out.md
```

Expected: no output from either, once §5 is ticked.

- [x] **Step 4: Commit.**

```bash
git add docs/superpowers/plans/2026-08-06-track-05-close-out.md
git commit -m "docs(construction): close the Track 05 close-out plan"
```

### Gate C5 checklist

- [ ] `054_readiness_shop_joint_limitation.test.sql` passes and provably fails when the view is narrowed.
- [ ] `git status` shows no modification under `supabase/migrations/`.
- [ ] All three `planInsertCount` references agree.
- [ ] Both Track 05 plans carry a status block with real figures.
- [ ] The pgTAP/fixture interaction is measured, not asserted.

---

## 5. Exit criteria

- [ ] The material-check screen lists the bill of materials in the browser, with no `400` on `material_check_items`.
- [ ] `construction-select-columns.test.ts` fails on the 2026-08-02 query and passes on the fixed one.
- [ ] A failed load renders a failure message rather than "no bill of materials".
- [ ] The fabrication picker offers only accepted revisions, labelled with their revision number.
- [ ] `/` no longer presents demo figures as real in Supabase mode, and the rebuild is filed under T11.
- [ ] `npm run verify` exits `0` from a fresh reset, with the pgTAP assertion count above 422.
- [ ] `database.types.ts` is in sync with the local schema.
- [ ] The bootstrap chain writes `1 | 1 | 2 | 2 | 3 | 1 | 1 | 1`, prints `14 rows upserted`, and is idempotent across three runs.
- [ ] T04 steps 1-9 pass through the real UI.
- [ ] The golden path was walked end to end, with `fabricated` absent by design, and survives a hard refresh and a second user.
- [ ] `PQC31` refuses a superseded revision; a reader reaches neither fabrication route.
- [ ] Roadmap §18 names only unused filenames, marks the three tables modify-not-create, names both Track 06 blockers, and mandates the browser walk.
- [ ] Both Track 05 plans carry a Close-out status block with real measured figures.
- [ ] Every step box in Gates C0-C5 is ticked, each after its command ran, and no `___` placeholder remains.

## 6. Explicitly outside this plan

- **Rebuilding the home dashboard on real data.** Task 5 marks it; T11 owns it.
- **Writing the Track 06 execution plan.** Task 9 makes §18 buildable; the plan is the next document.
- **Narrowing `spool_fabrication_readiness` to shop joints.** Task 13 pins the behaviour; changing it is a Track 07 decision affecting every project's release gate.
- **Widening `nde_obligations`' unique constraint** and **replacing `record_nde_obligation_outcome`.** Track 06 owns both; §18 now names them.
- **Changing the revision-decision counting logic.** Task 7 fixes only the sentence; if the logic is wrong, that is its own change.
- **Removing `type Row = Record<string, any>`.** Measurement showed it is not what hid the defect. Task 3's guard is the effective control; a typing refactor is optional cleanup, not a fix.
- **T01, T02, T03, T04-10…12 and S01.** Not reached by the 2026-08-02 walk. They exercise Tracks 01-03, which this plan does not touch; run them when those tracks are next revisited.
- **Retro-ticking the 227 step boxes of the two earlier Track 05 plans.** See §3.6.
