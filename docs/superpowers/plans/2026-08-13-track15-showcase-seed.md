# Track 15 — Showcase Demo Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed a third, permanently-populated demo project holding ~8 isometrics with twelve weeks of backdated progress, so the next track can draw charts from real read models instead of hardcoded arrays.

**Architecture:** A pure dataset generator produces SpoolGen file contents and a dated progress plan with no I/O, so the shape is unit-testable without a database. A thin applier drives that plan through the same `SECURITY DEFINER` commands the browser uses — never direct inserts into progress tables — which guarantees every seeded state is reachable, and therefore editable, through the UI. The demo manifest gains a third project declared as *expected to hold data*, which is what keeps `demo:check` green.

**Tech Stack:** TypeScript, `tsx`, `@supabase/supabase-js`, `node:test`, Supabase CLI (local Postgres + PostgREST).

**Spec:** `docs/prompts/PipeQC_Track15_Showcase_Seed_Plan.md`

**Track number:** 15. `docs/superpowers/plans/` runs to `2026-08-12-track14-hosted-demo-release.md`, and the numbered T1–T8 roadmap in `2026-07-30-pipeqc-supabase-master-roadmap.md` is a separate scheme that 15 does not collide with. Nothing else claims it.

## Global Constraints

- **Project code `SHOWCASE-1`.** Never seed into `TRACK01-A` or `TRACK01-B`.
- **Progress tables are written only through RPCs.** `construction_progress_events`, `weld_progress_records`, `material_check_records`, `paint_progress_records`, `quality_release_records`, `laydown_records`, `support_progress_records`, `nde_*` — no direct `.insert()` into any of these. Direct writes are allowed only for the engineering baseline, and even that goes through `importSpoolgenDefinition`.
- **Every RPC call passes an idempotency key** of the form `showcase-<command>-<stable-id>`. All the commands accept one (`target_idempotency_key` or `idempotency_key`).
- **Local only.** Every script guards with `isLocalhost(url)` and throws otherwise, matching `scripts/bootstrap-track07-browser-fixtures.ts:70`.
- **No secrets on the command line.** The npm script uses `tsx --env-file-if-exists=.env.local`; credentials come from `.env.local` only. See `CLAUDE.md`.
- **Row ceiling: `max_rows = 1000`** (`supabase/config.toml:18`). Every view the sweep touches must stay under it with room to spare; the generator's tests assert the counts.
- **Charts are out of scope.** No changes to `components/ui/chart.tsx`, no new `recharts` usage, no dashboard screens.

## Project isolation — where the showcase data can and cannot reach

The dataset goes into a **new** project, `SHOWCASE-1`. `TRACK01-A` keeps its twenty-one empty tables and its live-import walkthrough exactly as they are; nothing in this track writes a single engineering or progress row into `TRACK01-A` or `TRACK01-B`.

That leaves one genuine way the seed could touch the golden path, and it must be handled deliberately rather than assumed away:

**Shared membership.** The presenter switches projects rather than re-logging in, so `platform_admin`, `project_admin_a` and `qc_editor` hold membership on both `TRACK01-A` and `SHOWCASE-1` (Task 2, Step 6). Every screen is supposed to filter by the active project, so showcase rows must never appear while `TRACK01-A` is selected. If any repository is missing its `project_id` filter, this is exactly when it shows up — a screen that was empty on a clean stand suddenly listing showcase spools.

Treat that as **a real defect in the repository, not a reason to drop the seed.** The Track 12 walkthrough asserts empty states across `TRACK01-A`, so re-running it with the showcase project populated turns it into a cross-project leak detector, which is why Task 6 runs it *after* seeding rather than before.

The scoped personas — `nde_subcontractor` and the read-only QC reader — deliberately get **no** membership on `SHOWCASE-1`. They exist to prove subcontractor and PDS-area scoping on `TRACK01-A` (negative case N5, and the restrictive guard in `supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql`); giving them a second project would blur what those cases prove.

**Ordering.** `demo:prepare` runs `supabase db reset` (`scripts/prepare-track12-demo.ts:72`), which drops `SHOWCASE-1` along with everything else. The sequence is always: `demo:prepare` → `demo:showcase` → walkthrough → sweep. A showcase seed is never a prerequisite of `demo:prepare` and never runs inside it.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/demo/manifest.ts` | Add `projects.showcase`; add `SHOWCASE_POPULATED` marker list. Modify. |
| `scripts/demo/supabase-demo-stand.ts` | Add showcase to `PROJECT_DEFINITIONS`; parameterize `buildDemoReferencePlan` by target project. Modify. |
| `scripts/demo/preflight.ts` | Exempt showcase from `emptyTableChecks`. Modify. |
| `scripts/demo/showcase-dataset.ts` | **New.** Pure generator: SpoolGen TSV contents + dated progress plan. No I/O. |
| `scripts/demo/showcase-dataset.test.ts` | **New.** Unit tests for shape, dates, stage legality, row-count ceilings. |
| `scripts/bootstrap-showcase-dataset.ts` | **New.** Applier: signs in, imports, drives commands, `--reset-showcase`. |
| `package.json` | New `demo:showcase` script. Modify. |
| `CLAUDE.md` | Update the check count and document the showcase project. Modify. |
| `docs/qa/track-15-showcase-sweep.md` | **New.** The module sweep + edit-pass protocol. |

The generator/applier split is the same seam the existing bootstraps use — pure builders exported and tested (`buildTrack07FixturePlan`, `parseTrack07WeldFixture`), side-effecting `run()` untested. Follow it.

---

### Task 1: Declare the showcase project and keep `demo:check` green

`projectCheck` (`scripts/demo/preflight.ts:324-374`) is an exact-set comparison — `expectedRows.length === actualRows.length && difference.unexpected.length === 0`. A third project fails it until the manifest declares one. Conversely `emptyTableChecks` (`preflight.ts:716-737`) would then start asserting the showcase project is *empty*, which is the opposite of its purpose, so it must skip it.

**Files:**
- Modify: `scripts/demo/manifest.ts:411-433` (the `projects` block)
- Modify: `scripts/demo/supabase-demo-stand.ts:2215-2218` (`PROJECT_DEFINITIONS`)
- Modify: `scripts/demo/preflight.ts:716-737` (`emptyTableChecks`)
- Modify: `CLAUDE.md:11`
- Test: `scripts/demo/manifest.test.ts`, `scripts/demo/preflight.test.ts`

**Interfaces:**
- Produces: `DEMO_MANIFEST.projects.showcase` with `activityCode: "SHOWCASE-1"`; `SHOWCASE_PROJECT_CODE` exported from `manifest.ts`.

- [ ] **Step 1: Write the failing manifest test**

In `scripts/demo/manifest.test.ts`, add:

```typescript
test("the manifest declares a showcase project that is exempt from the empty-at-start rule", () => {
  assert.equal(DEMO_MANIFEST.projects.showcase.activityCode, "SHOWCASE-1")
  assert.equal(SHOWCASE_PROJECT_CODE, "SHOWCASE-1")
  assert.notEqual(
    DEMO_MANIFEST.projects.showcase.activityCode,
    DEMO_MANIFEST.projects.golden.activityCode,
  )
  assert.equal(EXEMPT_FROM_EMPTY_AT_DEMO_START.includes(SHOWCASE_PROJECT_CODE), true)
  assert.equal(EXEMPT_FROM_EMPTY_AT_DEMO_START.includes("TRACK01-A"), false)
})
```

Add `SHOWCASE_PROJECT_CODE` and `EXEMPT_FROM_EMPTY_AT_DEMO_START` to the import list at the top of the file.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:unit -- --test-name-pattern="showcase project"`
Expected: FAIL — `SHOWCASE_PROJECT_CODE` is not exported from `./manifest`.

- [ ] **Step 3: Add the project and the exemption to the manifest**

In `scripts/demo/manifest.ts`, inside `DEMO_MANIFEST.projects`, after the `isolation` block:

```typescript
    showcase: {
      key: "showcase",
      activityCode: "SHOWCASE-1",
      title: "PipeQC Showcase Project",
      ownerName: "Demo Owner",
      contractorName: "Demo EPC",
      contractNumber: "DEMO-S-001",
      transitDays: 3,
      status: "active",
    },
```

Above `EMPTY_AT_DEMO_START`, add:

```typescript
export const SHOWCASE_PROJECT_CODE = "SHOWCASE-1"

/**
 * The showcase project exists to hold data — twelve weeks of backdated progress the charts
 * read. Asserting it is empty would assert the opposite of its purpose, so the empty-table
 * checks skip it. TRACK01-A and TRACK01-B keep the rule.
 */
export const EXEMPT_FROM_EMPTY_AT_DEMO_START = [SHOWCASE_PROJECT_CODE] as const
```

- [ ] **Step 4: Run the manifest test and watch it pass**

Run: `npm run test:unit -- --test-name-pattern="showcase project"`
Expected: PASS.

- [ ] **Step 5: Write the failing preflight test**

In `scripts/demo/preflight.test.ts`, add:

```typescript
test("the showcase project is checked for existence but never for emptiness", () => {
  const snapshot = buildSnapshot()
  const results = runDemoPreflight(snapshot)
  const emptyIds = results.filter((result) => result.id.startsWith("empty:")).map((r) => r.id)

  assert.equal(
    emptyIds.some((id) => id.startsWith("empty:SHOWCASE-1:")),
    false,
    "the showcase project must not be asserted empty",
  )
  assert.equal(
    emptyIds.some((id) => id.startsWith("empty:TRACK01-A:")),
    true,
    "the golden project must still be asserted empty",
  )
  assert.equal(results.find((result) => result.id === "projects")?.ok, true)
})
```

Reuse whatever snapshot factory the file already defines for its other cases rather than inventing a new one — read the top of `preflight.test.ts` and extend the existing fixture with the third project.

- [ ] **Step 6: Run it and watch it fail**

Run: `npm run test:unit -- --test-name-pattern="showcase project is checked"`
Expected: FAIL — `empty:SHOWCASE-1:*` checks are present, and/or `projects` is `false`.

- [ ] **Step 7: Add showcase to `PROJECT_DEFINITIONS` and exempt it from the empty checks**

In `scripts/demo/supabase-demo-stand.ts:2215`:

```typescript
const PROJECT_DEFINITIONS = [
  DEMO_MANIFEST.projects.golden,
  DEMO_MANIFEST.projects.isolation,
  DEMO_MANIFEST.projects.showcase,
] as const
```

In `scripts/demo/preflight.ts`, change `emptyTableChecks` to skip exempt projects:

```typescript
function emptyTableChecks(snapshot: DemoStandSnapshot): DemoCheckResult[] {
  const checks: DemoCheckResult[] = []
  const projectCodes: readonly DemoProjectCode[] = DEMO_PROJECT_CODES

  for (const projectCode of projectCodes) {
    if (EXEMPT_FROM_EMPTY_AT_DEMO_START.includes(projectCode)) continue
    for (const table of EMPTY_AT_DEMO_START) {
      // ...unchanged body...
    }
  }

  return checks
}
```

Import `EXEMPT_FROM_EMPTY_AT_DEMO_START` from `./manifest`. Then follow the type errors: `DemoProjectCode`, `DEMO_PROJECT_CODES`, and the `emptyCounts` record type in `supabase-demo-stand.ts` all need the third code. In `readCoreSnapshot`, skip counting for exempt projects rather than counting and discarding — the counts are round-trips.

- [ ] **Step 8: Run the full unit suite and typecheck**

Run: `npm run test:unit && npm run typecheck`
Expected: PASS. Fix any test that hardcoded a two-project expectation.

- [ ] **Step 9: Update the documented check count**

Run `npm run demo:prepare -- --confirm-local-reset` then `npm run demo:check`, read the actual total off the output, and update `CLAUDE.md:11` from `84 contract checks` to the observed number. In the same edit, add a sentence to the "Local stand reset" section:

```markdown
`SHOWCASE-1` is a third, deliberately **populated** project holding the seeded dataset the
dashboards read. It is exempt from the empty-at-start rule and is built by
`npm run demo:showcase` after `demo:prepare`. Never seed engineering data into `TRACK01-A`.
```

- [ ] **Step 10: Commit**

```bash
git add scripts/demo/manifest.ts scripts/demo/supabase-demo-stand.ts scripts/demo/preflight.ts scripts/demo/manifest.test.ts scripts/demo/preflight.test.ts CLAUDE.md
git commit -m "feat(demo): declare a populated showcase project the empty-start rule exempts"
```

---

### Task 2: Seed project referentials into the showcase project

`buildDemoReferencePlan` hardcodes `resolvedIds.goldenProjectId` (`scripts/demo/supabase-demo-stand.ts:1358`), so all 36 referential families land on `TRACK01-A` only — which is why the isolation project is deliberately reference-free. The showcase project needs the same referentials (service classes, PDS areas, weld types, welding procedures, welders, subcontractors, locations, NDE matrix rules, paint matrix, progress weights) or the SpoolGen import and every downstream command will fail validation.

The membership scope replacement stays golden-only: showcase users get unscoped access, so the restrictive PDS guard (`supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql`) never hides showcase rows.

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts:1352-1372` (`buildDemoReferencePlan`), `:2714-2729` (`prepareProjectReferences`)
- Test: `scripts/demo/supabase-demo-stand.test.ts` (create if absent, else extend)

**Interfaces:**
- Consumes: `DEMO_MANIFEST.projects.showcase` from Task 1.
- Produces: `buildDemoReferencePlan(resolvedIds, preparedOn, targetProjectId?)` — third parameter defaults to `resolvedIds.goldenProjectId`, so every existing call site is unchanged.

- [ ] **Step 1: Write the failing test**

```typescript
test("the reference plan can be built for a project other than golden", () => {
  const resolvedIds = buildResolvedIdsFixture() // reuse the file's existing fixture
  const golden = buildDemoReferencePlan(resolvedIds, new Date("2026-08-13T00:00:00Z"))
  const showcase = buildDemoReferencePlan(
    resolvedIds,
    new Date("2026-08-13T00:00:00Z"),
    "showcase-project-id",
  )

  assert.equal(golden.project_pds_areas[0].project_id, resolvedIds.goldenProjectId)
  assert.equal(showcase.project_pds_areas[0].project_id, "showcase-project-id")
  assert.equal(showcase.project_pds_areas.length, golden.project_pds_areas.length)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:unit -- --test-name-pattern="other than golden"`
Expected: FAIL — `buildDemoReferencePlan` takes two arguments.

- [ ] **Step 3: Parameterize the builder**

At `scripts/demo/supabase-demo-stand.ts:1352`:

```typescript
export function buildDemoReferencePlan(
  resolvedIds: DemoReferenceResolvedIds,
  preparedOn: Date,
  targetProjectId: string = resolvedIds.goldenProjectId,
): DemoReferencePlan {
  assertDemoProgressWeightTotals()
  const references = DEMO_MANIFEST.references
  const projectId = targetProjectId
  // ...rest unchanged...
```

Leave the `scopedMembership` lookup bound to golden — scopes are a golden-only concern.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test:unit -- --test-name-pattern="other than golden"`
Expected: PASS.

- [ ] **Step 5: Apply referentials to the showcase project during prepare**

At `scripts/demo/supabase-demo-stand.ts:2714`:

```typescript
  async prepareProjectReferences(preparedOn: Date): Promise<void> {
    const plan = buildDemoReferencePlan(this.referenceResolvedIds(), preparedOn)
    await this.reconcileReferenceBatches(projectReferenceBatches(plan))
    await safely(
      "Preparing demo membership scopes",
      "NDE-A/PDS-100",
      () =>
        this.referenceGateway().replaceMembershipScopes({
          subcontractorScopes: plan.membership_subcontractor_scopes,
          pdsAreaScopes: plan.membership_pds_area_scopes,
        }),
    )

    const showcaseProjectId = this.projectIds.get(SHOWCASE_PROJECT_CODE)
    if (!showcaseProjectId) {
      throw new Error(`${SHOWCASE_PROJECT_CODE} was not created before its referentials.`)
    }
    // Same referentials, different project. No scope replacement: showcase members are
    // unscoped on purpose, so the restrictive PDS guard never hides seeded rows.
    const showcasePlan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
      showcaseProjectId,
    )
    await this.reconcileReferenceBatches(projectReferenceBatches(showcasePlan))
  }
```

- [ ] **Step 6: Give the manifest users membership on the showcase project**

In `scripts/demo/manifest.ts`, add a `projectCode: "SHOWCASE-1"` membership to `platform_admin`, `project_admin_a` and `qc_editor`, mirroring their `TRACK01-A` entries (same `role`, same `functionalRoles`, **no** `scopes`). Leave `nde_subcontractor` and the reader off showcase — the scoped personas exist to prove scoping on `TRACK01-A`, and adding them here would blur that.

- [ ] **Step 7: Verify against a real stand**

Run: `npm run demo:prepare -- --confirm-local-reset && npm run demo:check`
Expected: exit 0, all checks pass, and the showcase project exists with referentials. Confirm by hand:

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
  -c "select p.activity_code, count(a.id) as pds_areas
      from projects p left join project_pds_areas a on a.project_id = p.id
      group by 1 order by 1;"
```
Expected: `SHOWCASE-1` shows 3 PDS areas, same as `TRACK01-A`; `TRACK01-B` shows 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/demo/manifest.ts scripts/demo/supabase-demo-stand.test.ts
git commit -m "feat(demo): seed project referentials into the showcase project"
```

---

### Task 3: The pure dataset generator

No I/O. Given a base date it returns the four SpoolGen file contents and a fully-dated progress plan. This is where the twelve-week shape and the row-count ceilings are decided, and where they get tested without a database.

**Dataset specification — implement exactly this:**

- **8 isometrics** `SHOW-1001` … `SHOW-1008`, revision `R0`.
- **PDS areas:** 1001–1003 → `PDS-100`; 1004–1006 → `PDS-200`; 1007–1008 → `PDS-300`.
- **Service class** `SC-CS150`, **material class** `CS150` throughout (both exist in the manifest references).
- **2 spools per isometric** = 16 spools, named `SP-<iso-suffix>-A` / `-B`.
- **7 weld joints per spool** = 112 weld joints. Weld numbers `WJ-<spool>-01`…`-07`. Types alternate `BW`/`SW` from the manifest's weld types; location `shop` for fabrication spools, `field` for the erection ones.
- **12 weekly buckets**, `week[0]` = `baseDate − 77 days` … `week[11]` = `baseDate`. All dates are UTC dates via the existing `addUtcDays` helper in `manifest.ts`.

**Stage ladder** — 16 spools distributed to produce a rising S-curve rather than a step:

| Spools | Reached stage | Weeks used |
|---|---|---|
| 4 (`1001-A/B`, `1002-A/B`) | `laydown` (full fabrication) | 0–5 |
| 3 (`1003-A/B`, `1004-A`) | `painted`, awaiting final QC | 1–7 |
| 3 (`1004-B`, `1005-A/B`) | `qc_release`, not painted | 3–8 |
| 3 (`1006-A/B`, `1007-A`) | welding in progress, not fabricated | 5–10 |
| 2 (`1007-B`, `1008-A`) | `material_check` only | 9–11 |
| 1 (`1008-B`) | nothing recorded | — |

**Erection:** the four `laydown` spools continue — `to_site` → `erected` → `welded_bolted` → `supported` across weeks 6–11; `1001-A` alone reaches all four so exactly one spool derives `is_rft = true`.

**Welders:** the manifest's welder qualifications, round-robin across weld joints so each carries a comparable share.

**Files:**
- Create: `scripts/demo/showcase-dataset.ts`
- Test: `scripts/demo/showcase-dataset.test.ts`

**Interfaces:**
- Consumes: `addUtcDays` from `./manifest`.
- Produces:
  - `SHOWCASE_ISO_NUMBERS: readonly string[]`
  - `buildShowcaseSpoolgenFiles(isoNumber: string): { weld: string; trace: string; supp: string; bolt: string }`
  - `buildShowcaseProgressPlan(baseDate: Date): ShowcaseProgressPlan`
  - `SHOWCASE_EXPECTED_COUNTS: { isometrics: number; spoolRevisions: number; weldJointRevisions: number; constructionEvents: number; weldProgressRecords: number }`
  - `type ShowcaseSpoolPlan = { isoNumber: string; spoolNumber: string; stages: readonly { phase: "fabrication" | "erection"; stage: string; occurredOn: string }[]; weldedJoints: readonly { weldNumber: string; weldedOn: string; welderKey: string }[] }`
  - `type ShowcaseProgressPlan = { readonly spools: readonly ShowcaseSpoolPlan[] }`

- [ ] **Step 1: Write the failing shape test**

Create `scripts/demo/showcase-dataset.test.ts`:

```typescript
import assert from "node:assert/strict"
import test from "node:test"

import {
  SHOWCASE_ISO_NUMBERS,
  SHOWCASE_EXPECTED_COUNTS,
  buildShowcaseSpoolgenFiles,
  buildShowcaseProgressPlan,
} from "./showcase-dataset"

const BASE = new Date("2026-08-13T00:00:00Z")

test("the dataset is eight isometrics across three PDS areas", () => {
  assert.equal(SHOWCASE_ISO_NUMBERS.length, 8)
  const areas = new Set(
    SHOWCASE_ISO_NUMBERS.flatMap((iso) =>
      buildShowcaseSpoolgenFiles(iso)
        .weld.trim()
        .split("\n")
        .slice(1)
        .map((row) => row.split("\t")[2]),
    ),
  )
  assert.deepEqual([...areas].sort(), ["PDS-100", "PDS-200", "PDS-300"])
})

test("every view the sweep reads stays far below the PostgREST max_rows ceiling", () => {
  for (const [name, count] of Object.entries(SHOWCASE_EXPECTED_COUNTS)) {
    assert.ok(count < 700, `${name}=${count} leaves no headroom under max_rows=1000`)
  }
  assert.equal(SHOWCASE_EXPECTED_COUNTS.weldJointRevisions, 112)
  assert.equal(SHOWCASE_EXPECTED_COUNTS.spoolRevisions, 16)
})

test("progress is spread across twelve distinct weeks, not clustered on one date", () => {
  const plan = buildShowcaseProgressPlan(BASE)
  const dates = plan.spools.flatMap((spool) => spool.stages.map((stage) => stage.occurredOn))
  const weeks = new Set(
    dates.map((date) =>
      Math.floor((BASE.getTime() - new Date(`${date}T00:00:00Z`).getTime()) / (7 * 86_400_000)),
    ),
  )
  assert.ok(weeks.size >= 10, `progress covers only ${weeks.size} weekly buckets`)
  assert.ok(Math.max(...dates.map((d) => Date.parse(d))) <= BASE.getTime(), "no future dates")
})

test("only stages the phase policy marks recordable are ever emitted", () => {
  // Mirrors public.construction_phase_stages seeded in
  // supabase/migrations/20260810091000_construction_phase_policy.sql
  const recordable = new Set(["start_fab", "sent_to_paint", "to_site", "erected", "welded_bolted", "supported"])
  for (const spool of buildShowcaseProgressPlan(BASE).spools) {
    for (const stage of spool.stages) {
      assert.ok(
        recordable.has(stage.stage),
        `${stage.stage} is derived and cannot be recorded through record_construction_progress`,
      )
    }
  }
})

test("exactly one spool has nothing recorded, so the sweep has an untouched control", () => {
  const plan = buildShowcaseProgressPlan(BASE)
  const untouched = plan.spools.filter((spool) => spool.stages.length === 0)
  assert.equal(untouched.length, 1)
  assert.equal(untouched[0].spoolNumber, "SP-1008-B")
})
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npm run test:unit -- --test-name-pattern="dataset|ceiling|twelve|recordable|untouched"`
Expected: FAIL — cannot find module `./showcase-dataset`.

- [ ] **Step 3: Implement the generator**

Create `scripts/demo/showcase-dataset.ts`. Structure it as: area map → spool ladder table → TSV builders → progress plan builder. The critical correctness point is the fourth test: `material_check`, `fabricated`, `qc_release`, `painted`, `final_qc` and `laydown` are **derived** (`is_recordable = false`) and must never be emitted as `stages` — they are produced by `record_material_check`, `record_weld_progress`, `release_quality_record`, `record_paint_progress` and `record_laydown`, which Task 4 calls. Only `start_fab` and `sent_to_paint` (fabrication) and the four erection stages go through `record_construction_progress`.

Headers must match `demo-data/spoolgen/*.txt` exactly, tab-separated:

```typescript
const WELD_HEADER = [
  "ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "LINE_NUMBER", "SPOOL_NUMBER",
  "SPOOL_WEIGHT_KG", "MATERIAL_CLASS", "WELD_NUMBER", "WELD_TYPE", "WELD_LOCATION",
  "DIAMETER_INCH", "THICKNESS_MM",
].join("\t")
const TRACE_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE", "DESCRIPTION", "QUANTITY", "UNIT", "TRACE_NUMBER"].join("\t")
const SUPP_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "SUPPORT_NUMBER", "SUPPORT_TYPE", "QUANTITY"].join("\t")
const BOLT_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "FLANGE_NUMBER", "FLANGE_RATING", "DIAMETER_INCH", "BOLT_SIZE", "BOLT_QUANTITY", "JOINT_TYPE"].join("\t")
```

Read `demo-data/spoolgen/weld.txt` and its siblings for exact value formats (e.g. `SPOOL_WEIGHT_KG` as `120.5`, `THICKNESS_MM` as `8.2`) and keep the generated rows in the same shape — the importer validates them.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npm run test:unit -- --test-name-pattern="dataset|ceiling|twelve|recordable|untouched"`
Expected: PASS, five tests.

- [ ] **Step 5: Prove the generated files survive the real validator**

Add one more test that runs the generated content through the same builder the importer uses, so a header or column mistake fails here rather than mid-seed:

```typescript
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"

test("generated SpoolGen files pass validation with zero blockers", () => {
  for (const iso of SHOWCASE_ISO_NUMBERS) {
    const submission = buildSpoolgenSubmission(buildShowcaseSpoolgenFiles(iso))
    assert.equal(
      submission.summary.blockerCount,
      0,
      `${iso}: ${submission.issues.filter((i) => i.severity === "blocker").map((i) => `${i.code} ${i.message}`).join("; ")}`,
    )
  }
})
```

Run: `npm run test:unit -- --test-name-pattern="zero blockers"`
Expected: PASS. If it fails, the message names the exact column the generator got wrong — fix the generator, not the test.

- [ ] **Step 6: Commit**

```bash
git add scripts/demo/showcase-dataset.ts scripts/demo/showcase-dataset.test.ts
git commit -m "feat(demo): generate the showcase dataset shape as a pure, tested function"
```

---

### Task 4: The applier

Drives the plan through real commands. Idempotent by construction: `importSpoolgenDefinition` already skips isometrics carrying an accepted revision (`scripts/spoolgen-fixture-import.ts:60-69`), and every command call passes an idempotency key.

**Files:**
- Create: `scripts/bootstrap-showcase-dataset.ts`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: `buildShowcaseSpoolgenFiles`, `buildShowcaseProgressPlan`, `SHOWCASE_ISO_NUMBERS` (Task 3); `signInFixtureOperator`, `importSpoolgenDefinition`, `isLocalhost` from `./spoolgen-fixture-import`; `SHOWCASE_PROJECT_CODE` (Task 1).

**Command reference — exact signatures, verified against the migrations:**

```
record_construction_progress(target_spool_revision_id uuid, target_phase, target_stage,
  target_occurred_on date, target_payload jsonb = '{}', target_idempotency_key text = null)
record_material_check(target_spool_revision_id uuid, target_checked_on date, target_items jsonb,
  target_qc13_form_id uuid = null, target_idempotency_key text = null)
record_weld_progress(target_weld_joint_revision_id uuid, subcontractor_id uuid,
  welding_procedure_id uuid, points jsonb, dates jsonb = '{}', idempotency_key text = null)
release_quality_record(target_spool_revision_id uuid, released_on date, qc13_form_id uuid = null,
  comment text = null, idempotency_key text = null)
record_paint_progress(target_spool_revision_id uuid, line_service_id uuid, details jsonb = '{}',
  idempotency_key text = null)
record_laydown(target_spool_revision_id uuid, location_id uuid, stored_on date,
  idempotency_key text = null)
record_erection_progress(target_spool_revision_id uuid, target_stage, target_occurred_on date,
  target_payload jsonb = '{}', target_idempotency_key text = null)
record_field_material_check(target_spool_revision_id uuid, target_checked_on date,
  target_items jsonb, target_qc13_form_id uuid = null, target_idempotency_key text = null)
record_field_support_progress(target_support_revision_id uuid, installed_on date,
  idempotency_key text = null)
```

- [ ] **Step 1: Write the script skeleton with the local guard**

Create `scripts/bootstrap-showcase-dataset.ts`, modelled on `scripts/bootstrap-track07-browser-fixtures.ts`:

```typescript
import { createClient } from "@supabase/supabase-js"

import { SHOWCASE_PROJECT_CODE } from "./demo/manifest"
import {
  SHOWCASE_ISO_NUMBERS,
  buildShowcaseProgressPlan,
  buildShowcaseSpoolgenFiles,
} from "./demo/showcase-dataset"
import { importSpoolgenDefinition, isLocalhost, signInFixtureOperator } from "./spoolgen-fixture-import"

export { isLocalhost }

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!serviceKey || !publishableKey || !password) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.")
  }

  const reset = process.argv.includes("--reset-showcase")
  const admin = createClient(url, serviceKey)
  const { data: project } = await admin
    .from("projects").select("id").eq("activity_code", SHOWCASE_PROJECT_CODE).maybeSingle()
  if (!project) {
    throw new Error(`${SHOWCASE_PROJECT_CODE} does not exist. Run npm run demo:prepare -- --confirm-local-reset first.`)
  }

  const { count } = await admin
    .from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", project.id)
  if ((count ?? 0) > 0 && !reset) {
    console.log(`${SHOWCASE_PROJECT_CODE} already holds ${count} isometrics; nothing to do. Pass --reset-showcase to rebuild.`)
    return
  }
  if ((count ?? 0) > 0 && reset) {
    await admin.from("isometrics").delete().eq("project_id", project.id)
    console.log(`${SHOWCASE_PROJECT_CODE}: cleared ${count} isometrics for a rebuild.`)
  }

  const operator = await signInFixtureOperator(url, publishableKey, password)
  try {
    await seedShowcase(operator, admin, project.id)
  } finally {
    await operator.auth.signOut()
  }
}

if (process.argv[1]?.endsWith("bootstrap-showcase-dataset.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
```

Before writing the delete, confirm that `isometrics` cascades to revisions, spools, welds and progress — check the FK definitions in `supabase/migrations/*engineering*` and `*construction*`. If any table does not cascade, delete it explicitly, most-dependent first, and say so in a comment.

- [ ] **Step 2: Import the engineering baseline**

```typescript
async function seedShowcase(operator: SupabaseClient, admin: SupabaseClient, projectId: string) {
  for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
    const result = await importSpoolgenDefinition(
      operator, projectId, isoNumber,
      buildShowcaseSpoolgenFiles(isoNumber),
      `Showcase dataset ${isoNumber}`,
    )
    console.log(`${isoNumber}: ${result.skipped ? "already present" : `imported ${result.appliedRowCount} rows`}`)
  }
```

- [ ] **Step 3: Run it and confirm the baseline lands**

Run: `npm run demo:prepare -- --confirm-local-reset && npx tsx --env-file-if-exists=.env.local scripts/bootstrap-showcase-dataset.ts`
Expected: eight "imported N rows" lines, no errors. Verify: 8 isometrics, 16 spool revisions, 112 weld joint revisions on `SHOWCASE-1` — compare against `SHOWCASE_EXPECTED_COUNTS`. If a count is off, the generator is wrong; fix Task 3 and re-run with `--reset-showcase`.

- [ ] **Step 4: Drive the progress plan**

Resolve the referential ids once (welding procedure, subcontractor, welder qualifications, laydown location, line service) by querying the showcase project's referentials, then walk the plan:

```typescript
for (const spool of buildShowcaseProgressPlan(new Date()).spools) {
  const revisionId = spoolRevisionIds.get(spool.spoolNumber)
  if (!revisionId) throw new Error(`${spool.spoolNumber} was not imported.`)

  for (const stage of spool.stages) {
    if (stage.phase === "fabrication") {
      await call("record_construction_progress", {
        target_spool_revision_id: revisionId,
        target_phase: "fabrication",
        target_stage: stage.stage,
        target_occurred_on: stage.occurredOn,
        target_idempotency_key: `showcase-progress-${spool.spoolNumber}-${stage.stage}`,
      }, `${spool.spoolNumber}/${stage.stage}`)
    } else {
      await call("record_erection_progress", {
        target_spool_revision_id: revisionId,
        target_stage: stage.stage,
        target_occurred_on: stage.occurredOn,
        target_idempotency_key: `showcase-erection-${spool.spoolNumber}-${stage.stage}`,
      }, `${spool.spoolNumber}/${stage.stage}`)
    }
  }

  for (const joint of spool.weldedJoints) {
    await call("record_weld_progress", {
      target_weld_joint_revision_id: weldJointIds.get(joint.weldNumber),
      subcontractor_id: subcontractorId,
      welding_procedure_id: procedureId,
      points: buildWeldPoints(welderIds.get(joint.welderKey), joint.weldedOn),
      dates: { weld_on: joint.weldedOn },
      idempotency_key: `showcase-weld-${joint.weldNumber}`,
    }, `${spool.spoolNumber}/${joint.weldNumber}`)
  }
}
```

`call` is a thin wrapper that throws with the context string when `error` is set — a silent failure here produces a half-seeded stand that looks fine until the sweep:

```typescript
async function call(fn: string, args: Record<string, unknown>, context: string) {
  const { data, error } = await operator.rpc(fn, args)
  if (error) throw new Error(`${fn} failed for ${context}: ${error.message}`)
  return data
}
```

Model `buildWeldPoints` on `buildTrack07WeldPoints` in `scripts/bootstrap-track07-browser-fixtures.ts:45` — read it and match the `points` jsonb shape it produces, since `record_weld_progress` validates it.

The derived stages are produced by the remaining commands, in this order per spool, skipping any the spool's ladder never reaches:

| Order | Command | Derived stage it produces | Note |
|---|---|---|---|
| after `start_fab` | `record_material_check` | `material_check` | items read from `spool_revision_materials`, exactly as `bootstrap-track07-browser-fixtures.ts` does for the field variant |
| after the joints are welded | *(none — `record_weld_progress` above)* | `fabricated` | derived once every joint on the spool carries progress |
| after `fabricated` | `release_quality_record` | `qc_release` | |
| after `sent_to_paint` | `record_paint_progress` | `painted` | needs `line_service_id` from the showcase referentials |
| last | `record_laydown` | `laydown` | needs `location_id` from the showcase referentials |

For the erection spools, add `record_field_material_check` and `record_field_support_progress` where the spool's plan includes them; `rft` is derived and is never recorded.

Every call goes through `call(...)` so no failure is silent, and every idempotency key follows `showcase-<command>-<spoolNumber|weldNumber>`.

- [ ] **Step 5: Re-run twice and prove idempotency**

Run the script twice in a row without `--reset-showcase`.
Expected: the second run prints the "already holds N isometrics" line and exits 0, changing nothing. Then run with `--reset-showcase` and confirm the counts come back identical to the first run.

- [ ] **Step 6: Add the npm script**

In `package.json`, after `demo:check`:

```json
    "demo:showcase": "tsx --env-file-if-exists=.env.local scripts/bootstrap-showcase-dataset.ts",
```

- [ ] **Step 7: Confirm `demo:check` is still green with a populated showcase**

Run: `npm run demo:check`
Expected: exit 0. This is the payoff of Task 1 — the seeded project is invisible to the empty-table rule while still being checked for existence.

- [ ] **Step 8: Commit**

```bash
git add scripts/bootstrap-showcase-dataset.ts package.json
git commit -m "feat(demo): seed showcase progress through the real construction commands"
```

---

### Task 5: NDE outcomes and a deliberate lock mix

Charts need an accepted/rejected split, and the sweep needs both locked and unlocked welds — locked ones to prove `PQC36` surfaces comprehensibly, unlocked ones so there is always something editable to click. Accepting an NDE result sets `is_locked = true` through the trigger at `supabase/migrations/20260804092200_weld_progress_locks.sql:43-49`, which fires for every writer including `service_role`.

**Target:** of the ~80 welded joints, roughly 30 carry NDE results — about 24 accepted (locked), about 6 rejected (defect codes, feeding the rejection-rate chart). The remaining ~50 welded joints stay unlocked.

**Files:**
- Modify: `scripts/bootstrap-showcase-dataset.ts`
- Modify: `scripts/demo/showcase-dataset.ts` (add the NDE plan to the pure generator)
- Test: `scripts/demo/showcase-dataset.test.ts`

**Interfaces:**
- Produces: `buildShowcaseNdePlan(baseDate: Date): { batches: readonly { method: string; categoryCode: string; coverage: number; issuedOn: string }[]; outcomes: readonly { weldNumber: string; outcome: "accepted" | "rejected"; examinedOn: string }[] }`

**Command reference:**

```
create_nde_batch(target_project_id uuid, method public.ndt_method, category_code text,
  welder_id uuid = null, subcontractor_id uuid = null, batch_number_override text = null,
  idempotency_key text = null)
allocate_nde_batch_candidates(target_batch_id uuid, target_percentage numeric = 100,
  idempotency_key text = null)  -- returns integer
issue_nde_batch(target_batch_id uuid, idempotency_key text = null)
record_nde_result(target_obligation_id uuid, outcome text, examined_on date,
  report_number text = null, defect_rework_code_id uuid = null,
  responsible_welder_qualification_id uuid = null, comment text = null,
  idempotency_key text = null)
```

- [ ] **Step 1: Write the failing test for the lock mix**

```typescript
test("the NDE plan leaves most welded joints unlocked and rejects a minority", () => {
  const plan = buildShowcaseNdePlan(BASE)
  const accepted = plan.outcomes.filter((o) => o.outcome === "accepted")
  const rejected = plan.outcomes.filter((o) => o.outcome === "rejected")

  assert.ok(rejected.length >= 4, "too few rejections to draw a rejection rate")
  assert.ok(rejected.length / plan.outcomes.length < 0.35, "an implausible rejection rate")
  assert.ok(
    plan.outcomes.length < buildShowcaseProgressPlan(BASE).spools.flatMap((s) => s.weldedJoints).length,
    "every welded joint would be locked, leaving nothing editable in the sweep",
  )
  assert.equal(new Set(plan.outcomes.map((o) => o.weldNumber)).size, plan.outcomes.length)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:unit -- --test-name-pattern="NDE plan"`
Expected: FAIL — `buildShowcaseNdePlan` is not exported.

- [ ] **Step 3: Implement `buildShowcaseNdePlan` and make the test pass**

Three batches across the twelve weeks, drawing joints only from spools that reached `fabricated` or beyond. Use the manifest's NDT methods and joint categories; pick defect codes from `references.reworkCodes`.

Run: `npm run test:unit -- --test-name-pattern="NDE plan"`
Expected: PASS.

- [ ] **Step 4: Apply the NDE plan in the seeder**

Per batch: `create_nde_batch` → `allocate_nde_batch_candidates` → `issue_nde_batch`, then `record_nde_result` per obligation, reading obligation ids back from `nde_obligations` filtered to the batch. Rejections pass `defect_rework_code_id` and `responsible_welder_qualification_id`; acceptances pass neither.

- [ ] **Step 5: Verify the lock mix on a real stand**

Run: `npm run demo:showcase -- --reset-showcase`, then:

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
  -c "select w.is_locked, count(*)
      from weld_progress_records w
      join weld_joint_revisions wjr on wjr.id = w.weld_joint_revision_id
      join spool_revisions sr on sr.id = wjr.spool_revision_id
      join isometric_revisions rev on rev.id = sr.isometric_revision_id
      join isometrics iso on iso.id = rev.isometric_id
      join projects p on p.id = iso.project_id
      where p.activity_code = 'SHOWCASE-1' group by 1;"
```
Expected: both `true` and `false` rows, with `false` the larger group.

- [ ] **Step 6: Commit**

```bash
git add scripts/demo/showcase-dataset.ts scripts/demo/showcase-dataset.test.ts scripts/bootstrap-showcase-dataset.ts
git commit -m "feat(demo): seed NDE outcomes with a deliberate locked/unlocked mix"
```

---

### Task 6: Prove it — regression, sweep, edit pass

Three passes. The first proves nothing broke; the second proves nothing is silently truncated or hidden by RLS; the third proves the seeded data is genuinely editable.

**Files:**
- Create: `docs/qa/track-15-showcase-sweep.md`

- [ ] **Step 1: Regression — the existing golden path, with the showcase data present**

Run the positive spine (§3) and negative matrix N1–N8 of `docs/qa/track-12-agent-walkthrough.md` against `TRACK01-A`, exactly as written. **Do not re-point it at `SHOWCASE-1`** — it is written against an empty stand with a live import and would be meaningless there.

Run it **after** the showcase seed, not before. That ordering is the point: it is the only pass that proves a populated third project is invisible from `TRACK01-A`. See "Project isolation" above — any showcase row appearing under `TRACK01-A` is a blocking leak bug in a repository, not a seeding problem, and must be fixed rather than worked around by dropping the seed.

Two expected, non-failing deviations to record rather than raise:

- the project picker now lists a third project;
- any step that says "the only other project is `TRACK01-B`" is now stale wording.

Record the result in the new sweep doc as "Track 12 walkthrough re-run: PASS/FAIL, date, deviations".

- [ ] **Step 2: Write the sweep protocol**

Create `docs/qa/track-15-showcase-sweep.md` with a table of every module route (`/fabrication/dashboard`, `/fabrication/weld-progress`, `/fabrication/qc-release`, `/fabrication/paint`, `/fabrication/laydown`, `/erection/dashboard`, `/erection/to-site`, `/erection/erected`, `/erection/weld-progress`, `/erection/supported`, `/erection/rft`, `/nde`, `/nde/dashboard`, `/tracking`, `/testpack`, `/spooling/browse`, `/reports`) against its expected footer count from `SHOWCASE_EXPECTED_COUNTS`. State plainly at the top why the count matters:

```markdown
The data-table footer prints `N of M` (`components/ui/data-table/data-table.tsx:356`). `M` is the
number of rows actually fetched. PostgREST truncates at `max_rows = 1000`
(`supabase/config.toml:18`) with no error, and the repositories do not paginate server-side, so a
footer lower than the expected count is the only visible symptom of silent truncation. A count of
zero on a screen that should hold rows means RLS is hiding them, not that the seed failed.
```

- [ ] **Step 3: Run the sweep**

Sign in as the project admin, switch to `SHOWCASE-1`, visit every route in the table, and record the observed footer count beside the expected one. Any mismatch is a blocker: investigate before proceeding, and record which of the two causes it was.

- [ ] **Step 4: Run the edit pass**

On `SHOWCASE-1`:

1. Open `SP-1008-B` — the deliberately untouched spool — and record `start_fab` through the UI. Confirm the toast, then hard-refresh and confirm the date persisted.
2. Open a spool in the welding-in-progress group and record weld progress on an open joint. Confirm `/fabrication/dashboard` moves.
3. Open a weld joint that carries an **accepted** NDE result and attempt to change its WPS. Confirm the UI surfaces the `PQC36` message comprehensibly rather than a raw error string, and record the exact text shown.

Record all three in the sweep doc with the evidence-field schema from `docs/qa/track-12-agent-walkthrough.md:63`.

- [ ] **Step 5: Record the result and commit**

```bash
git add docs/qa/track-15-showcase-sweep.md
git commit -m "docs(qa): record the Track 15 showcase sweep and edit pass"
```

---

## Definition of Done

- [ ] `npm run verify` passes (lint, typecheck, unit, db tests).
- [ ] `npm run demo:prepare -- --confirm-local-reset && npm run demo:check` exits 0, and `CLAUDE.md:11` quotes the new check count.
- [ ] `npm run demo:showcase` builds the dataset from a clean stand; a second run without `--reset-showcase` changes nothing; `--reset-showcase` reproduces identical counts.
- [ ] `SHOWCASE-1` holds 8 isometrics, 16 spool revisions, 112 weld joint revisions, spools at six distinct stages, one spool with nothing recorded, and both locked and unlocked welds.
- [ ] Progress dates span at least ten of the twelve weekly buckets, and no date is in the future.
- [ ] The Track 12 walkthrough still passes on `TRACK01-A`.
- [ ] Every route in the sweep shows a footer count matching the expected count.
- [ ] The edit pass succeeded on the untouched spool and produced a comprehensible `PQC36` on a locked one.

## Non-Goals

| Out of scope | Owner |
|---|---|
| Any chart, gauge or dashboard visual; `recharts` usage; `components/ui/chart.tsx` | Track 16 — the follow-up this dataset exists for |
| Server-side pagination in the repositories | Deferred; record in `docs/deferred-work.md`. Only becomes urgent if a dataset approaches `max_rows` |
| Raising or removing `max_rows = 1000` | Deferred — this track stays under the ceiling by design rather than moving it |
| Seeding the hosted stand | Track 14 owns hosted provisioning; do not touch it here |
| Tracking scan events and test packs on `SHOWCASE-1` | Optional stretch; add only if Task 4 lands early, and give them their own task rather than widening one |

## Chart-Shaped Requirements This Dataset Must Satisfy

Stated so the seed is designed against real consumers rather than blindly. Track 16 reads:

| Chart | Read model | What the dataset guarantees |
|---|---|---|
| Fabrication S-curve (cumulative, weighted) | `spool_construction_status` — `start_fab_on` … `laydown_on` | 16 spools laddered across 12 weekly buckets |
| Progress by area | `spool_construction_status.pds_area_id` | 3 areas at deliberately different completion levels |
| Stage funnel / donut | `spool_construction_status` | Six distinct stages populated, plus one not-started |
| NDE accepted vs rejected | `nde_results`, `weld_progress_summary.obligation_*` | ~30 results, ~20% rejected |
| Welder comparison | `weld_progress_summary.welders` | Joints round-robined across the manifest's welders |
| Erection RFT burn-up | `spool_erection_readiness.is_rft`, `rft_on` | Exactly one spool derives RFT; three more partway |
