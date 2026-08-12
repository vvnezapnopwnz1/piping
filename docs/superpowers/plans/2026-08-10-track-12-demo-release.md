# Track 12 Demo Release Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Tracks 01–11 into a deterministic local Demo Lite release that a product owner can prepare with one guarded command and present through the real UI in 30–40 minutes, including a real four-file SpoolGen import and two downloadable reports.

**Architecture:** A reset-based local preparation CLI builds only identities, projects, access, and rich referential prerequisites from a versioned manifest. A separate read-only preflight compares the live stand with that manifest and proves that engineering imports and operational outcomes are still empty. The presenter then performs the complete business story through the existing UI; browser tooling is used only for release acceptance, never as a presentation dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Node 22 test runner, `tsx`, Supabase/PostgreSQL with RLS and pgTAP, `@supabase/supabase-js`, the existing SpoolGen parser/import application, XLSX, jsPDF, and Markdown runbooks.

---

## Sources and fixed scope

Implement the approved contract in:

- `docs/superpowers/specs/2026-08-10-track-12-demo-release-design.md`;
- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`;
- `docs/qa/local-supabase-browser-runbook.md` and the Track 01–11 walkthroughs as historical acceptance evidence;
- current migrations, `lib/supabase/database.types.ts`, route capabilities, and live UI as the current implementation contract.

The following decisions are closed for this plan:

1. Track 12 is an integration/release track, not a new business module.
2. `TRACK01-A` is the golden project; `TRACK01-B` is a sparse isolation control; `TRACK-SETUP-CHECK` is created only in the optional UI setup walkthrough.
3. `npm run demo:prepare -- --confirm-local-reset` is the only presenter-facing data preparation command. It replaces the per-track bootstrap chain and always starts with a guarded local reset.
4. `npm run demo:check` is read-only and may be rerun at any time.
5. Preparation must leave `import_jobs`, engineering definitions, and every operational outcome empty. It must not call `importSpoolgenDefinition`, a Track 05–10 bootstrap, an operational RPC, or a browser test.
6. The repository contains `weld.txt`, `trace.txt`, `bolt.txt`, and `supp.txt` under `demo-data/spoolgen/`. The main walkthrough uploads all four through `/spooling/import`.
7. This is structured engineering-output import, not native 3D geometry import.
8. No Playwright test suite is added. The agent walkthrough is a manual browser protocol and the product owner can run the same business steps without browser automation.
9. No migration, generated-type change, or UI change is planned up front. Such a change is allowed only after a reproducible Track 12 gate proves a blocking defect.
10. Production deployment, offline/PWA behavior, durable generated-document history, report Storage artifacts, dossier ZIPs, monitoring, load testing, and production backup rehearsal stay out of scope.

## Execution preconditions

- Work in the current checkout. Preserve unrelated user changes.
- At plan-writing time `feat/supabase-real-mode` is one local commit ahead of its remote. Do not stage, commit, push, reset, restore, create a branch, or create a worktree unless the user separately authorizes Git operations.
- Use `npm` because the repository owns `package-lock.json`.
- Keep secrets out of source, runbooks, screenshots, command output, and Git. Continue using `.env.local` for public local configuration and masked interactive shell input for `SUPABASE_SERVICE_ROLE_KEY` and `TRACK01_FIXTURE_PASSWORD`.
- Run Phase A on a clean reset before loading demo data. pgTAP and browser/demo data intentionally do not share one database state.
- Use `http://localhost:3000` for the browser. Do not make direct Supabase/SQL mutations during Phase C.

## File map

### New preparation and contract files

- `scripts/demo/local-target.ts`
- `scripts/demo/local-target.test.ts`
- `scripts/demo/manifest.ts`
- `scripts/demo/manifest.test.ts`
- `scripts/demo/spoolgen-package.test.ts`
- `scripts/demo/preflight.ts`
- `scripts/demo/preflight.test.ts`
- `scripts/demo/supabase-demo-stand.ts`
- `scripts/demo/prepare.ts`
- `scripts/demo/prepare.test.ts`
- `scripts/prepare-track12-demo.ts`
- `scripts/check-track12-demo.ts`

### New presenter input files

- `demo-data/spoolgen/weld.txt`
- `demo-data/spoolgen/trace.txt`
- `demo-data/spoolgen/bolt.txt`
- `demo-data/spoolgen/supp.txt`

### New release documents

- `docs/runbooks/track-12-demo.md`
- `docs/runbooks/track-12-setup-walkthrough.md`
- `docs/qa/track-12-agent-walkthrough.md`
- `docs/acceptance/track-12-demo-release.md`

### Existing files changed by the planned implementation

- `package.json`
- `docs/qa/local-supabase-browser-runbook.md`
- `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md` during evidence-based closeout
- `docs/deferred-work.md` during evidence-based closeout only if the release run identifies a real deferred limitation

## Manifest contract

`scripts/demo/manifest.ts` is the single source of truth for stable identifiers, relationships, relative dates, expected import shape, and absence checks. Do not duplicate these values in preparation or preflight code.

### Stable users and access

| Key | Email | `TRACK01-A` access | Functional roles / scope | `TRACK01-B` access |
| --- | --- | --- | --- | --- |
| `platform_admin` | `track01.platform-admin@example.test` | Project Admin through creator membership | platform admin | Project Admin through creator membership |
| `platform_observer` | `track01.platform-observer@example.test` | none | platform admin, no membership | none |
| `project_admin_a` | `track01.project-admin-a@example.test` | Project Admin | no functional role required | Project Reader, for isolation switching |
| `qc_editor` | `track01.qc-editor@example.test` | Project Editor | `qc_engineer`, `nde_inspector`, `spooling_team`, `fabrication_contributor`, `erection_contributor`, `tracking_operator` | none |
| `reader_qc` | `track01.reader-qc@example.test` | Project Reader | `qc_engineer` | none |
| `nde_subcontractor` | `track01.nde-subcontractor@example.test` | Subcontractor | `nde_inspector`, scoped to `NDE-A` and `PDS-100` | none |

### Rich `TRACK01-A` referentials

The implementation must insert the exact active/inactive status and relationships below. Descriptions are business-facing English labels, not `Track XX fixture` labels.

| Family / table | Exact manifest rows |
| --- | --- |
| `system_reference_entries`, material type | `CS`, `SS316`, `DSS` active |
| `system_film_quantity_rules` | 1–3 in / 3–10 mm / 2 films; 4–12 in / 3–20 mm / 3 films |
| `system_ut_calculation_rules` | 1–3 in / `150#` / coefficients 1.0 and 1.0; 4–8 in / `150#` / 2.0 and 3.0; 9–16 in / `300#` / 3.0 and 4.0 |
| `system_reference_entries`, torquing requirement | `MANUAL-TORQUE`, `HYDRAULIC-TORQUE`, `HYDRAULIC-TENSION` active |
| `project_subcontractors` | `FAB-A` active, `NDE-A` active, `LEGACY-CONTRACTOR` inactive |
| `project_units` | `U-100`, `U-200` active |
| `project_area_classifications` | `PROCESS` under `U-100`; `UTILITIES` under `U-200` |
| `project_pds_areas` | `PDS-100` under `PROCESS`, shop `FAB-A`, field `FAB-A`; `PDS-200` under `UTILITIES`, shop `FAB-A`, field `FAB-A`; `PDS-300` under `PROCESS`, shop `FAB-A`, field `FAB-A` |
| `project_service_classes` | `SC-CS150` linked to system material `CS`; `SC-SS300` linked to `SS316` |
| `project_weld_types` | `BW`, `SW`, `FW` active; `BW` and `SW` count in diameter-inch |
| `project_welding_procedures` | `WPS-CS-GTAW-01`, `WPS-CS-SMAW-02`, `WPS-SS-GTAW-03` active; `WPS-LEGACY-04` inactive; all linked to `FAB-A`, with 1–24 in and 2–30 mm coverage and a preparation-relative approval date |
| `welder_qualifications` | `WDR-001` through `WDR-004`, active through preparation date +365 days; each linked through `welder_wps_qualifications` to at least one active WPS |
| `nde_matrix_rules` | `SC-CS150/BW/shop` RT 100%; `SC-CS150/BW/field` RT 0%; `SC-CS150/SW/shop` PT 100%; `SC-SS300/BW/shop` RT 100%; material traceability true for shop rules; PWHT false for the Demo Lite path |
| `piping_material_records` | `ID-DEMO-100`/`HEAT-100-A`, `ID-DEMO-200`/`HEAT-200-A`, `ID-DEMO-300`/`HEAT-300-A`, `ID-DEMO-400`/`HEAT-400-A`, `ID-DEMO-500`/`HEAT-500-A` |
| `project_thickness_flange_rules` | `SC-CS150` 4 in / 6.0 mm / `150#`; `SC-CS150` 6 in / 8.2 mm / `150#`; `SC-SS300` 8 in / 10.3 mm / `300#` |
| `project_rework_codes` | `POR`, `LOF`, `CRK` active |
| `project_joint_categories` | `X` / before pressure test; `Y` / before pre-commissioning; `Z` / after pre-commissioning; `joint_definition = Flange`, distinct reasons, coefficient 0.5 |
| `project_teams` | `LC-TEAM-A`/line_check, `BLIND-TEAM-A`/blinding, `REINSTATE-TEAM-A`/reinstatement, `BOLT-TEAM-A`/jointer |
| `project_systems` | `SYS-PROCESS`, `SYS-UTILITIES` active |
| `project_subsystems` | `SUB-FEED` and `SUB-PRODUCT` under `SYS-PROCESS`; `SUB-AIR` under `SYS-UTILITIES` |
| `project_line_services` | `PROCESS`, `AIR`, `WATER` active |
| `project_pressure_units` | `bar` |
| `project_location_categories` | `YARD`, `SITE`, `HOLD` active |
| `project_locations` | `FAB-SHOP`, `PAINT-SHOP`, `LAYDOWN-A`, `SITE-A`, `TEST-AREA` active; `OLD-YARD` inactive; categories resolve by the manifest |
| `project_unit_time_references` | `FLANGE_JOINTING` 10.0; `LINE_CHECK` 8.0; `BLINDING` 6.0; `REINSTATEMENT` 7.0 |
| `project_progress_weights` | prefabrication `spool_fabrication/material_check/weld_progress/qc_release = 30/20/30/20`; painting `blasting/primer/intermediate/final = 20/20/30/30`; erection `to_site/material_check/weld_progress/supported/welded_bolted = 20/20/30/15/15`; every active phase totals 100 |
| `project_assembly_settings` | disabled, so readiness does not require assembly NDE/weights |
| `project_spooling_material_types` | `CS`, `SS` active |
| `project_spooling_material_classes` | `CS150 → CS`, `CS300 → CS`, `SS300 → SS` active |
| `project_spooling_checklist_items` | `DRAWING`, `MATERIAL`, `FITUP`, `WELD`, `DIMENSION`, sort 10–50, required |
| `project_ral_codes` | `PROCESS/RAL 9006`, `AIR/RAL 5015`, `WATER/RAL 6018` active |
| `project_paint_matrix_rules` | one active rule for each RAL row; blasting and primer required; 1 intermediate and 1 final coat; DFT 240/200/220 µm |
| `project_devices` | `SCN-001`, `SCN-002`, `SCN-003` active |
| `project_device_users` | `SCN-001` assigned to `qc_editor`; `SCN-002` assigned to `project_admin_a`; `SCN-003` intentionally unassigned |

`TRACK01-B` contains only its project definition plus the two memberships listed above. It contains zero rows in every project-referential and operational family checked by preflight.

### Demo SpoolGen package

The four files describe exactly:

- `ISO-DEMO-1001/R0`, `PDS-100`, `SC-CS150`, line `P-1001`, with spools `SP-DEMO-1001-A` and `SP-DEMO-1001-B`;
- `ISO-DEMO-2001/R0`, `PDS-200`, `SC-CS150`, line `P-2001`, with spool `SP-DEMO-2001-A`;
- five weld joints: three shop joints on `ISO-DEMO-1001`, two field joints on `ISO-DEMO-2001`;
- five material rows using the five PML ident codes above;
- three flange definitions, all `150#`, spread across the `ISO-DEMO-1001` spools;
- two support definitions, one on `SP-DEMO-1001-A` and one on `SP-DEMO-2001-A`.

The parser therefore yields exactly 20 staging rows: 2 isometrics, 3 spools, 5 weld joints, 5 materials, 3 flange joints, and 2 supports, with zero blocking issues.

## Task 1: Add the manifest, relative-date helper, and local-target guard

**Files:**

- Create: `scripts/demo/local-target.ts`
- Create: `scripts/demo/local-target.test.ts`
- Create: `scripts/demo/manifest.ts`
- Create: `scripts/demo/manifest.test.ts`

- [ ] **Step 1: Write the failing local-target tests.**

  Cover `http://localhost`, `http://127.0.0.1`, and `http://[::1]` as allowed targets. Reject HTTPS, missing input, malformed URLs, credentials in the URL, non-root paths, query/hash fragments, and every non-local hostname.

  ```ts
  import assert from "node:assert/strict"
  import test from "node:test"

  import { assertLocalSupabaseTarget } from "./local-target"

  test("accepts only explicit local HTTP Supabase origins", () => {
    for (const value of ["http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321"]) {
      assert.equal(assertLocalSupabaseTarget(value).origin, value)
    }
  })

  test("rejects targets that are not an exact local origin", () => {
    for (const value of [
      "",
      "not-a-url",
      "https://localhost:54321",
      "http://example.com:54321",
      "http://localhost:54321/rest/v1",
      "http://user:secret@localhost:54321",
      "http://localhost:54321?x=1",
    ]) {
      assert.throws(() => assertLocalSupabaseTarget(value), /local Supabase/i)
    }
  })
  ```

  Run:

  ```bash
  node --import tsx --test scripts/demo/local-target.test.ts
  ```

  Expected: FAIL because `scripts/demo/local-target.ts` does not exist.

- [ ] **Step 2: Implement the minimal guard.**

  ```ts
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

  export function assertLocalSupabaseTarget(value: string): URL {
    let target: URL
    try {
      target = new URL(value)
    } catch {
      throw new Error("A valid local Supabase URL is required.")
    }
    const exactOrigin = target.pathname === "/" && target.search === "" && target.hash === ""
    const noCredentials = target.username === "" && target.password === ""
    if (target.protocol !== "http:" || !LOCAL_HOSTS.has(target.hostname) || !exactOrigin || !noCredentials) {
      throw new Error("Demo preparation requires an exact local Supabase HTTP origin.")
    }
    return target
  }
  ```

- [ ] **Step 3: Write the failing manifest tests.**

  Test the exact family counts, unique codes/composite keys, inactive lifecycle examples, three 100% progress phases, two projects, six users, the four SpoolGen roles, the 20-row import shape, and the operational absence-table list. Test date resolution with a fixed UTC base date.

  ```ts
  import assert from "node:assert/strict"
  import test from "node:test"

  import { DEMO_MANIFEST, resolveDemoDates } from "./manifest"

  test("locks the approved rich starting-state contract", () => {
    assert.equal(DEMO_MANIFEST.projects.golden.activityCode, "TRACK01-A")
    assert.equal(DEMO_MANIFEST.projects.isolation.activityCode, "TRACK01-B")
    assert.equal(DEMO_MANIFEST.users.length, 6)
    assert.equal(DEMO_MANIFEST.references.subcontractors.length, 3)
    assert.equal(DEMO_MANIFEST.references.weldingProcedures.length, 4)
    assert.equal(DEMO_MANIFEST.references.welders.length, 4)
    assert.equal(DEMO_MANIFEST.references.locations.length, 6)
    assert.equal(DEMO_MANIFEST.references.devices.length, 3)
    assert.equal(DEMO_MANIFEST.references.deviceAssignments.length, 2)
    for (const phase of DEMO_MANIFEST.references.progressWeights) {
      assert.equal(phase.items.reduce((total, item) => total + item.weight, 0), 100)
    }
    assert.deepEqual(DEMO_MANIFEST.spoolgen.roles, ["weld", "trace", "bolt", "supp"])
    assert.equal(DEMO_MANIFEST.spoolgen.expectedStagingRows, 20)
  })

  test("resolves dates from preparation day without local timezone drift", () => {
    assert.deepEqual(resolveDemoDates(new Date("2026-08-10T23:30:00.000Z")), {
      approvedOn: "2026-02-11",
      welderExpiresOn: "2027-08-10",
    })
  })
  ```

  Expected: FAIL because the manifest does not exist.

- [ ] **Step 4: Implement the complete typed manifest.**

  Use readonly literal data and reference parent rows by stable code, never by hard-coded UUID. The date helper must use UTC date arithmetic:

  ```ts
  export function addUtcDays(base: Date, offset: number): string {
    const value = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()))
    value.setUTCDate(value.getUTCDate() + offset)
    return value.toISOString().slice(0, 10)
  }

  export function resolveDemoDates(base: Date) {
    return {
      approvedOn: addUtcDays(base, -180),
      welderExpiresOn: addUtcDays(base, 365),
    }
  }
  ```

  Transcribe every row from **Manifest contract** into `DEMO_MANIFEST`. Add `expectedCount`, `key`, and `status` data needed by preflight rather than deriving expectations from database output.

- [ ] **Step 5: Run focused verification.**

  ```bash
  node --import tsx --test scripts/demo/local-target.test.ts scripts/demo/manifest.test.ts
  ```

  Expected: all pass.

- [ ] **Step 6: Suggested checkpoint.**

  If Git operations are authorized later, suggested commit message: `test(demo): lock Track 12 stand contract`.

## Task 2: Create and contract-test the four-file presenter package

**Files:**

- Create: `demo-data/spoolgen/weld.txt`
- Create: `demo-data/spoolgen/trace.txt`
- Create: `demo-data/spoolgen/bolt.txt`
- Create: `demo-data/spoolgen/supp.txt`
- Create: `scripts/demo/spoolgen-package.test.ts`

- [ ] **Step 1: Write the failing repository-package test.**

  Read the four files from the repository and pass them through the same `buildSpoolgenSubmission` function used by the real UI. Assert zero blockers and exact entity counts/identifiers.

  ```ts
  import assert from "node:assert/strict"
  import { readFileSync } from "node:fs"
  import test from "node:test"
  import { join } from "node:path"

  import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"

  const root = join(process.cwd(), "demo-data", "spoolgen")
  const submission = buildSpoolgenSubmission({
    weld: readFileSync(join(root, "weld.txt"), "utf8"),
    trace: readFileSync(join(root, "trace.txt"), "utf8"),
    bolt: readFileSync(join(root, "bolt.txt"), "utf8"),
    supp: readFileSync(join(root, "supp.txt"), "utf8"),
  })

  test("the Track 12 package is accepted by the production parser", () => {
    assert.equal(submission.summary.blockerCount, 0)
    assert.equal(submission.canSubmit, true)
    assert.equal(submission.rows.length, 20)
    const counts = new Map<string, number>()
    for (const row of submission.rows) {
      const kind = row.normalizedValues.entity_type
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    assert.deepEqual(Object.fromEntries(counts), {
      isometric: 2,
      spool: 3,
      weld_joint: 5,
      support: 2,
      flange_joint: 3,
      material: 5,
    })
  })
  ```

  Run:

  ```bash
  node --import tsx --test scripts/demo/spoolgen-package.test.ts
  ```

  Expected: FAIL because the four files do not exist.

- [ ] **Step 2: Create `weld.txt`.**

  Use canonical tab-separated headers. Create the exact two-ISO, three-spool, five-weld contract above. Keep all `ISO-DEMO-1001` rows uniform for revision, PDS, service class, and line, and do the same for `ISO-DEMO-2001`. Use `MATERIAL_CLASS = CS150` so the imported definition resolves the prepared spooling class.

- [ ] **Step 3: Create `trace.txt`, `bolt.txt`, and `supp.txt`.**

  Every child row must reference a spool present in `weld.txt`. Use each `ID-DEMO-*` ident exactly once. Leave `TRACE_NUMBER` empty so the material-check workflow visibly proves heat-number traceability against PML rather than importing the result. Use `Flange` as `JOINT_TYPE` and the exact flange ratings covered by the prepared thickness and UT rules.

- [ ] **Step 4: Add semantic assertions.**

  Extend the test to assert the exact ISO/spool identifiers, that `ISO-DEMO-1001` contains only shop welds, `ISO-DEMO-2001` contains only field welds, every material ident is in the manifest, and all four file roles are non-empty and below `SPOOLGEN_MAX_FILE_BYTES`.

- [ ] **Step 5: Run focused verification.**

  ```bash
  node --import tsx --test scripts/demo/spoolgen-package.test.ts modules/engineering/domain/spoolgen-file.test.ts modules/engineering/domain/spoolgen-contract.test.ts modules/engineering/domain/parsers/spoolgen-parser.test.ts
  ```

  Expected: all pass.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `test(demo): add presenter SpoolGen package`.

## Task 3: Build the pure preflight evaluator

**Files:**

- Create: `scripts/demo/preflight.ts`
- Create: `scripts/demo/preflight.test.ts`

- [ ] **Step 1: Write failing tests for success and diagnostics.**

  Model a `DemoStandSnapshot` containing project/user/access rows, codes by referential family, readiness, package file hashes/shape, and per-project operational counts. Prove that the evaluator:

  - reports success only when every manifest section matches;
  - reports missing and unexpected stable codes separately;
  - reports expected versus actual count;
  - permits the four deliberate inactive/unassigned lifecycle examples;
  - fails when `TRACK01-B` contains any golden reference;
  - fails when any engineering or operational table count is non-zero;
  - returns the safe recovery command without leaking snapshot payloads.

  ```ts
  export interface DemoCheckResult {
    id: string
    ok: boolean
    expected: string
    actual: string
    recovery: string
  }

  export interface DemoPreflightReport {
    ok: boolean
    checks: DemoCheckResult[]
  }
  ```

  Run:

  ```bash
  node --import tsx --test scripts/demo/preflight.test.ts
  ```

  Expected: FAIL because the evaluator does not exist.

- [ ] **Step 2: Implement deterministic comparisons.**

  Sort codes before comparing them and emit one check per manifest family. Do not throw for a business mismatch; return a failed report. Throw only for an unreadable stand or invalid programmer input.

  ```ts
  const recovery = "npm run demo:prepare -- --confirm-local-reset"

  export function evaluateDemoStand(snapshot: DemoStandSnapshot): DemoPreflightReport {
    const checks = [
      checkProjects(snapshot),
      checkUsersAndAccess(snapshot),
      ...checkReferenceFamilies(snapshot),
      checkReadiness(snapshot),
      checkIsolation(snapshot),
      ...checkOperationalAbsence(snapshot),
      checkSpoolgenPackage(snapshot),
    ].flat()
    return { ok: checks.every((check) => check.ok), checks }
  }
  ```

- [ ] **Step 3: Lock the absence contract.**

  The manifest must check project-scoped zero counts at least for:

  ```ts
  export const EMPTY_AT_DEMO_START = [
    "import_jobs",
    "isometrics",
    "construction_progress_events",
    "material_check_records",
    "weld_progress_records",
    "pwht_results",
    "paint_progress_records",
    "quality_release_records",
    "laydown_records",
    "support_progress_records",
    "nde_batches",
    "nde_results",
    "spool_location_events",
    "flange_progress_records",
    "flange_reinstatement_records",
    "test_packs",
    "line_check_results",
    "punch_items",
    "blinding_records",
    "pressure_test_requests",
    "pressure_test_stage_events",
  ] as const
  ```

  When a listed child table has no `project_id`, query it through its project-scoped parent; do not remove the check or use a cross-project global count.

- [ ] **Step 4: Run focused verification.**

  ```bash
  node --import tsx --test scripts/demo/preflight.test.ts scripts/demo/manifest.test.ts
  ```

  Expected: all pass.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `feat(demo): add manifest preflight evaluator`.

## Task 4: Implement the Supabase stand adapter for users, projects, access, and reads

**Files:**

- Create: `scripts/demo/supabase-demo-stand.ts`
- Create: `scripts/demo/prepare.ts`
- Create: `scripts/demo/prepare.test.ts`

- [ ] **Step 1: Define a narrow injectable port and write a failing orchestration test.**

  The pure orchestrator owns stage order. The Supabase adapter owns I/O and UUID resolution.

  ```ts
  export interface DemoStandPort {
    prepareUsers(password: string): Promise<void>
    prepareProjects(): Promise<void>
    prepareAccess(): Promise<void>
    prepareSystemReferences(): Promise<void>
    prepareProjectReferences(preparedOn: Date): Promise<void>
    readSnapshot(): Promise<DemoStandSnapshot>
  }

  export async function prepareDemoStand(port: DemoStandPort, password: string, preparedOn: Date) {
    await port.prepareUsers(password)
    await port.prepareProjects()
    await port.prepareAccess()
    await port.prepareSystemReferences()
    await port.prepareProjectReferences(preparedOn)
    return evaluateDemoStand(await port.readSnapshot())
  }
  ```

  The fake port test must assert this exact order and prove that the function stops after the first thrown stage.

  Run:

  ```bash
  node --import tsx --test scripts/demo/prepare.test.ts
  ```

  Expected: FAIL because the files do not exist.

- [ ] **Step 2: Implement secret-safe client construction.**

  Accept `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as function arguments. Validate the URL before constructing the client. Configure `autoRefreshToken: false` and `persistSession: false`. Error messages may name a stage/table/stable code, but must never stringify environment values, Supabase request headers, row payloads, or auth responses.

- [ ] **Step 3: Implement `prepareUsers`.**

  Reuse the stable account semantics from the Track 01 script without invoking its CLI. For each manifest account, list/find by exact email, create or update with the out-of-band password, confirm email, and set the business-facing full name. Set `profiles.is_platform_admin` exactly from the manifest, including resetting false for non-platform users.

- [ ] **Step 4: Implement `prepareProjects`.**

  Create `TRACK01-A` and `TRACK01-B` with the platform admin as creator, titles `PipeQC Demo Project` and `PipeQC Isolation Control`, owner `Demo Owner`, contractor `Demo EPC`, contract numbers `DEMO-A-001` and `DEMO-B-001`, and transit limit 3 days. Resolve their generated UUIDs by `activity_code` and keep them in an adapter-local map.

- [ ] **Step 5: Implement `prepareAccess`.**

  Reconcile `project_memberships`, replace `project_membership_functional_roles`, and replace subcontractor/PDS scopes exactly as listed in the manifest. Because subcontractor and PDS parents are prepared in Task 5, split the NDE subcontractor scope into a final `resolveAccessScopes` call at the end of `prepareProjectReferences`; do not insert null or guessed UUIDs.

- [ ] **Step 6: Implement `readSnapshot` for identities, projects, and emptiness.**

  Read only columns required by the manifest. Use `{ count: "exact", head: true }` for absence tables. Resolve child-only tables through their project-scoped parents. Return normalized, sorted stable codes and counts; never return secret-bearing auth objects.

- [ ] **Step 7: Run focused verification.**

  ```bash
  node --import tsx --test scripts/demo/prepare.test.ts scripts/demo/preflight.test.ts
  ```

  Expected: all pass without a live database.

- [ ] **Step 8: Suggested checkpoint.**

  Suggested commit message: `feat(demo): prepare local identities and projects`.

## Task 5: Add rich system and project referential preparation

**Files:**

- Modify: `scripts/demo/supabase-demo-stand.ts`
- Modify: `scripts/demo/prepare.test.ts`
- Modify: `scripts/demo/manifest.test.ts`

- [ ] **Step 1: Add failing stage-plan assertions.**

  Export a pure `buildDemoReferencePlan(resolvedIds, preparedOn)` from the adapter module or a colocated pure section. Assert exact table row counts, statuses, relative dates, and all stable-code parent references before any database write.

- [ ] **Step 2: Implement system-reference writes in dependency order.**

  Insert `system_reference_entries` for material and torquing entries, then film and UT rules. On the clean reset stand, fail on unexpected duplicate/composite rows rather than silently widening the contract. Resolve material UUIDs by `(kind, code)` for project service classes and WPS.

- [ ] **Step 3: Implement the first project-reference wave.**

  Insert independent/parent rows for `TRACK01-A`: subcontractors, units, weld types, line services, location categories, systems, teams, rework codes, unit-time references, pressure unit, spooling material types, checklist items, PML, assembly settings, and devices.

- [ ] **Step 4: Resolve parent IDs and insert dependent geography/welding rows.**

  Resolve parents by `(project_id, stable code)` and insert area classifications, PDS areas, service classes, WPS, welders, welder-WPS links, thickness rules, and all four NDE matrix rules. Use `resolveDemoDates(preparedOn)` for WPS approval and welder qualification dates.

- [ ] **Step 5: Insert extended references.**

  Insert systems/subsystems, locations, spooling material classes, RAL rows, paint matrix rules, joint categories, and device assignments. Resolve every FK through the stable-code map. Leave `SCN-003` active and unassigned.

- [ ] **Step 6: Insert progress weights as one valid project configuration.**

  Write the exact three 100% phase sets from the manifest. Assert totals in TypeScript before sending any row. Because assembly is disabled, do not create an assembly weight set or an assembly NDE rule.

- [ ] **Step 7: Finalize NDE subcontractor scopes.**

  Resolve `NDE-A` and `PDS-100`, replace the scoped membership rows, and assert no second subcontractor/PDS scope exists.

- [ ] **Step 8: Forbid accidental workflow seeding in code review and tests.**

  `prepareProjectReferences` may call only table writes for the approved starting-state tables. Add a source-level contract assertion that `scripts/prepare-track12-demo.ts`, `scripts/demo/prepare.ts`, and `scripts/demo/supabase-demo-stand.ts` contain none of these strings:

  ```ts
  const forbiddenPreparationCalls = [
    "importSpoolgenDefinition",
    "record_fabrication_progress",
    "record_material_check",
    "record_weld_progress",
    "record_nde_result",
    "record_erection_progress",
    "record_spool_tracking_event",
    "record_flange_progress",
    "create_test_pack",
    "record_pressure_test_stage",
  ]
  ```

  This is a boundary test, not a substitute for the live zero-count preflight.

- [ ] **Step 9: Run focused verification.**

  ```bash
  node --import tsx --test scripts/demo/manifest.test.ts scripts/demo/prepare.test.ts scripts/demo/preflight.test.ts
  ```

  Expected: all pass.

- [ ] **Step 10: Suggested checkpoint.**

  Suggested commit message: `feat(demo): prepare rich referential catalog`.

## Task 6: Add the guarded reset CLI, read-only check CLI, and package commands

**Files:**

- Create: `scripts/prepare-track12-demo.ts`
- Create: `scripts/check-track12-demo.ts`
- Modify: `scripts/demo/prepare.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing argument/reset-runner tests.**

  Extract and test `parsePrepareArguments(argv)` and `runLocalReset(spawn)`. Require exactly `--confirm-local-reset`; reject misspellings and unrelated flags. Assert that target validation occurs before the reset runner is called. Assert that a non-zero reset status stops preparation.

  ```ts
  export function parsePrepareArguments(argv: string[]): { confirmed: true } {
    if (argv.length !== 1 || argv[0] !== "--confirm-local-reset") {
      throw new Error("Pass --confirm-local-reset to replace the local demo database.")
    }
    return { confirmed: true }
  }
  ```

- [ ] **Step 2: Implement reset without a shell.**

  Use `spawnSync("supabase", ["db", "reset"], { stdio: "inherit" })`; do not use `shell: true`, string interpolation, or an environment-provided argument list. Print only the validated local origin and a clear warning that local data will be replaced. Return non-zero on spawn error or non-zero status.

- [ ] **Step 3: Implement the prepare CLI order.**

  1. Read required environment values.
  2. Validate URL, password length ≥12, service key presence, and confirmation flag.
  3. Print safe target/warning.
  4. Reset the local database.
  5. Build the Supabase adapter.
  6. Prepare all manifest stages.
  7. Evaluate the fresh snapshot.
  8. Print checks and exit non-zero unless all pass.

  Do not catch an error merely to continue. Prefix errors with `reset`, `users`, `projects`, `access`, `system references`, `project references`, or `preflight`.

- [ ] **Step 4: Implement the check CLI.**

  Validate the local target and service key, read a snapshot, evaluate it, print one line per check, and set `process.exitCode = 1` on any mismatch. It must perform no insert/update/delete/RPC/auth-admin mutation and must not invoke reset.

- [ ] **Step 5: Add package scripts.**

  ```json
  {
    "scripts": {
      "demo:prepare": "tsx scripts/prepare-track12-demo.ts",
      "demo:check": "tsx scripts/check-track12-demo.ts"
    }
  }
  ```

  Insert the keys into the existing scripts object without changing dependencies or unrelated scripts.

- [ ] **Step 6: Run focused verification and CLI negative checks.**

  ```bash
  node --import tsx --test scripts/demo/*.test.ts
  npm run demo:prepare
  SUPABASE_URL=https://example.com SUPABASE_SERVICE_ROLE_KEY=not-used TRACK01_FIXTURE_PASSWORD=not-used npm run demo:prepare -- --confirm-local-reset
  ```

  Expected: tests pass; both CLI calls fail before invoking reset. The first names the missing confirmation; the second refuses the non-local target.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `feat(demo): add safe prepare and preflight commands`.

## Task 7: Write the presenter-owned 30–40 minute business runbook

**Files:**

- Create: `docs/runbooks/track-12-demo.md`

- [ ] **Step 1: Write stand setup with no per-track fixture commands.**

  Document one-time local stack/config setup, masked secret/password entry, then exactly:

  ```bash
  npm run demo:prepare -- --confirm-local-reset
  npm run dev
  ```

  State that rerunning prepare discards the completed local rehearsal and restores the known start. Never paste or show secret values.

- [ ] **Step 2: Add a timed story map.**

  Use this budget and target objects:

  | Section | Time | Stable target | Visible checkpoint |
  | --- | ---: | --- | --- |
  | Login, project, readiness | 2 min | `TRACK01-A` | active project and green setup readiness |
  | Rich referentials | 3 min | selected catalog tabs | populated real rows plus inactive examples |
  | Four-file engineering import | 5 min | `ISO-DEMO-1001`, `ISO-DEMO-2001` | zero blockers, R0 accepted, 3 spools/5 welds/5 BOM/3 flanges/2 supports |
  | Fabrication and QC | 7 min | `SP-DEMO-1001-A`, then required companion spool | durable fabrication stages and QC release |
  | NDE and repair | 5 min | named `ISO-DEMO-1001` welds | one accepted result and one rejected/repaired/resolved path |
  | Erection | 4 min | `SP-DEMO-2001-A` | To Site, field work, support/welded-bolted evidence |
  | Tracking and flange | 4 min | named spool movement and `ISO-DEMO-1001` flange | current location/history and UT-calculated flange record |
  | Test Pack | 7 min | `TP-DEMO-001` with explicitly listed ready ISO membership | Line Check, X clearance, RFT, blinding, testing, pre-commissioning, reinstatement |
  | Reports and persistence | 3 min | Fabrication XLSX and Test Pack PDF | both open; refreshed screens retain state |

- [ ] **Step 3: Pin exact routes, actors, accessible labels, and values.**

  For every mutation, name the route, persona, exact input values, visible control label from current source, expected toast/state, and hard-refresh check. State explicitly whenever the narrative switches ISO/spool so the presenter never claims unrelated rows are one physical object.

- [ ] **Step 4: Add presenter narration.**

  Give each section two short lines: what the user just did and why the business cares. Describe the import as output from a SpoolGen-like 3D piping system, while stating that PipeQC does not display/import native geometry in this release.

- [ ] **Step 5: Add recovery rules.**

  For an ambiguous mutation, refresh and inspect durable state before any retry. For a polluted or irrecoverable rehearsal, stop the server if necessary and rerun `demo:prepare`. Do not prescribe SQL, Studio, source edits, or a hidden fixture command.

- [ ] **Step 6: Review the document against source.**

  Use `rg` to confirm every route and literal control label. No browser run is claimed in this task; the live dry run occurs in Task 12.

- [ ] **Step 7: Suggested checkpoint.**

  Suggested commit message: `docs(demo): add Track 12 presenter runbook`.

## Task 8: Write the optional UI-only setup walkthrough and replace the stale local entry point

**Files:**

- Create: `docs/runbooks/track-12-setup-walkthrough.md`
- Modify: `docs/qa/local-supabase-browser-runbook.md`

- [ ] **Step 1: Write the setup walkthrough.**

  Starting from a freshly prepared stand, use only visible UI controls to create `TRACK-SETUP-CHECK`, assign one Project Admin, one Project Editor, and one Project Reader, and build one valid dependency chain across system/project referentials. Pin exact routes, control labels, values, and expected readiness changes.

- [ ] **Step 2: Prove access and isolation in the walkthrough.**

  Verify the Reader cannot edit or reach mutating routes, the new project's data is absent in `TRACK01-A`, and golden-project rows are absent from the setup project. The documented cleanup is `npm run demo:prepare -- --confirm-local-reset`; do not invent a project-delete flow.

- [ ] **Step 3: Rewrite the local browser runbook entry point.**

  Replace the stale claim that Tracking, Flange, Test Pack, and Reports are placeholders. Make Track 12 the recommended integrated path and keep Track 01–11 documents as focused historical/regression references. Separate operator responsibilities from browser-agent permissions.

- [ ] **Step 4: State the two supported human modes.**

  - Main demo: run `demo:prepare`, then follow `track-12-demo.md`.
  - From-scratch setup smoke: run `demo:prepare`, then follow `track-12-setup-walkthrough.md`, then reset again before the main demo.

  Neither mode requires Playwright or a per-track bootstrap.

- [ ] **Step 5: Suggested checkpoint.**

  Suggested commit message: `docs(demo): add setup walkthrough and local entry point`.

## Task 9: Write the expanded browser acceptance protocol and evidence template

**Files:**

- Create: `docs/qa/track-12-agent-walkthrough.md`
- Create: `docs/acceptance/track-12-demo-release.md`

- [ ] **Step 1: Add the browser-agent operating contract.**

  Restrict the agent to `http://localhost:3000`, UI gestures, listed `TRACK01-A/B` actions, DOM/network/console reads, and screenshots on failure. Forbid `.env` reads, secrets, SQL/Studio, service keys, reset, Git, source edits, direct Supabase calls, and automatic retry of ambiguous mutations.

- [ ] **Step 2: Reuse the presenter path as the positive spine.**

  Reference the exact section IDs from `track-12-demo.md` rather than duplicating different business values. Add PASS/FAIL/BLOCKED evidence fields for URL, actor, project, expected state, actual state, first safe network/console error, and refresh result.

- [ ] **Step 3: Add the mandatory negative matrix.**

  Include exact cases for:

  - invalid SpoolGen input first, followed by the valid four-file apply;
  - one forbidden workflow transition before prerequisites;
  - one duplicate idempotency path and one stale-state path already exposed by current UI;
  - Reader direct-route denial and absence of mutating controls;
  - `TRACK01-A`/`TRACK01-B` isolation for referentials, imports, worklists, tracking history, Test Packs, and reports;
  - refresh persistence after import, fabrication QC release, NDE result/repair, tracking movement, flange progress, Test Pack stage, and report generation;
  - no unmarked demo-store numbers, fake success, placeholder buttons, or hidden direct-database step on every visited route.

- [ ] **Step 4: Add artifact acceptance.**

  Record the downloaded filenames, non-zero sizes, successful open in a spreadsheet/PDF viewer, and visible `TRACK01-A`/selected-row content. Do not commit the downloaded artifacts.

- [ ] **Step 5: Create the acceptance document as an unclaimed template.**

  Include environment/commit/migration head, Phase A/B/C commands, per-case statuses, report-open result, known limitations, product-owner sign-off, and final decision. Its initial status must be `NOT RUN`; do not prefill PASS.

- [ ] **Step 6: Suggested checkpoint.**

  Suggested commit message: `docs(qa): define Track 12 release acceptance`.

## Task 10: Execute Phase A — clean code and database gate

**Files:**

- Modify: `docs/acceptance/track-12-demo-release.md` with actual evidence only
- Modify only a focused code/migration/type file if this gate proves a reproducible release blocker

- [ ] **Step 1: Record the exact Git commit and migration head.**

  Record `git rev-parse HEAD`, `git status --short`, and `/opt/homebrew/bin/supabase migration list --local`. Do not record environment values.

- [ ] **Step 2: Reset to a clean migration state.**

  ```bash
  /opt/homebrew/bin/supabase db reset
  ```

  Expected: every migration applies successfully. Do not run `demo:prepare` before the full database suite.

- [ ] **Step 3: Run all code gates.**

  ```bash
  npm run lint
  npm run typecheck
  npm run test:unit
  npm run build
  ```

  Expected: zero lint errors, typecheck pass, all unit tests pass, production build pass.

- [ ] **Step 4: Run the full pgTAP suite.**

  ```bash
  /opt/homebrew/bin/supabase test db --local
  ```

  Expected: all current database test files and assertions pass on the clean reset.

- [ ] **Step 5: Prove generated types are current without overwriting them.**

  ```bash
  generated_types_file="$(mktemp)"
  /opt/homebrew/bin/supabase gen types typescript --local > "$generated_types_file"
  diff -u lib/supabase/database.types.ts "$generated_types_file"
  types_status=$?
  rm "$generated_types_file"
  exit "$types_status"
  ```

  Expected: no diff. If there is a diff caused by an already-committed migration, regenerate through the normal command and review the complete type diff; do not hand-edit generated types.

- [ ] **Step 6: Run repository hygiene.**

  ```bash
  git diff --check
  ```

  Expected: pass.

- [ ] **Step 7: Handle failures narrowly.**

  Classify each failure as Track 12 regression, pre-existing baseline failure, or environment blocker with exact evidence. A code fix requires a failing focused test first, the smallest correction, rerun of that focused test, and complete rerun of this phase. Do not turn the gate into broad cleanup.

## Task 11: Execute Phase B — prepared-stand contract gate

**Files:**

- Modify: `docs/acceptance/track-12-demo-release.md` with actual evidence only
- Modify: preparation/preflight files only if this gate proves a defect

- [ ] **Step 1: Load local configuration and enter secrets interactively.**

  Follow the secret-safe shell procedure from the runbook. Confirm the URL points to localhost before continuing. Do not paste hidden prompt commands together with secret values.

- [ ] **Step 2: Run the one-command preparation.**

  ```bash
  npm run demo:prepare -- --confirm-local-reset
  ```

  Expected: local guard passes, reset succeeds, every preparation stage succeeds, and the embedded preflight prints PASS for all checks.

- [ ] **Step 3: Run focused contract tests after preparation.**

  ```bash
  node --import tsx --test scripts/demo/*.test.ts
  ```

  Expected: all guard/manifest/package/preflight/orchestrator tests pass.

- [ ] **Step 4: Run the independent read-only check twice.**

  ```bash
  npm run demo:check
  npm run demo:check
  ```

  Expected: identical successful diagnostics. The second run changes no count, timestamp, user, membership, reference, import, or operational row.

- [ ] **Step 5: Record the start-state proof.**

  Record exact expected/actual counts for every manifest family, green `TRACK01-A` readiness, sparse `TRACK01-B`, four lifecycle examples, package parser shape, and zero counts for engineering/operational tables. Do not include row UUIDs or secret-bearing output.

- [ ] **Step 6: Re-run `git diff --check`.**

  The preparation/check commands must not create tracked files or modify source.

## Task 12: Execute Phase C — integrated browser release gate and owner rehearsal

**Files:**

- Modify: `docs/acceptance/track-12-demo-release.md` with actual evidence
- Modify: `docs/runbooks/track-12-demo.md` only for verified label/value corrections
- Modify: `docs/qa/track-12-agent-walkthrough.md` only for verified browser-protocol corrections
- Modify focused production files only after a reproduced blocker and RED test

- [ ] **Step 1: Start the application and complete browser baseline.**

  ```bash
  npm run dev
  ```

  Open `http://localhost:3000`, sign in out of band, select `TRACK01-A`, and run baseline, navigation, readiness, Reader denial, and Project B isolation cases.

- [ ] **Step 2: Run the complete positive story once.**

  Follow `docs/runbooks/track-12-demo.md` in order. Use only UI controls. Record actual elapsed time by section, stable object IDs, visible outcomes, and refresh persistence. Do not repair state with SQL, Studio, service-role calls, or fixtures.

- [ ] **Step 3: Run the expanded negative matrix.**

  Follow `docs/qa/track-12-agent-walkthrough.md`. For an ambiguous mutation, inspect the durable UI state and mark BLOCKED rather than clicking twice. Capture a screenshot and first safe console/network failure for each FAIL.

- [ ] **Step 4: Open both downloaded files.**

  Verify the Fabrication Progress XLSX and Test Pack RFT Pursuit PDF open without repair warnings and contain the selected project/object data. Record filenames and viewer result; do not commit the files.

- [ ] **Step 5: Run the optional setup walkthrough on a fresh stand.**

  Re-run `demo:prepare`, execute `track-12-setup-walkthrough.md` manually through UI, verify roles/readiness/isolation, then re-run `demo:prepare` before a final golden rehearsal.

- [ ] **Step 6: Perform the product-owner rehearsal.**

  The product owner repeats the presenter runbook without Playwright, per-track fixtures, SQL, or source edits and records whether it remains within 30–40 minutes. The Track cannot close solely on an agent browser run.

- [ ] **Step 7: Apply the gate failure policy.**

  If a gate reveals a reproducible blocker or misleading product claim:

  1. record the exact case and durable evidence;
  2. add a focused failing unit/pgTAP test;
  3. make the smallest migration/type/UI/runbook correction;
  4. rerun the focused test;
  5. rerun Phase A on a clean reset, Phase B on a new prepared stand, and the affected Phase C path.

  Record non-blocking findings in known limitations or deferred work. Do not broaden Track 12 into a refactor.

## Task 13: Close out Track 12 from evidence

**Files:**

- Modify: `docs/acceptance/track-12-demo-release.md`
- Modify: `docs/superpowers/plans/2026-07-30-pipeqc-supabase-master-roadmap.md`
- Modify: `docs/deferred-work.md` only for evidenced deferrals

- [ ] **Step 1: Complete the acceptance record.**

  Fill every Phase A/B/C result with date, commit, status, and concise evidence. Keep user-reported file-open evidence explicitly labeled as product-owner evidence. Do not mark skipped cases PASS.

- [ ] **Step 2: Decide release status.**

  Track 12 is `CLOSED — Demo Lite` only when all eleven exit criteria from the approved design are satisfied. Otherwise use `BLOCKED` with the exact unsatisfied criteria; do not weaken the contract to close the roadmap.

- [ ] **Step 3: Update the master roadmap.**

  Link this plan and the approved design/acceptance documents, update the Track 12 status, and describe the delivered release as local Supabase-backed Demo Lite. Preserve the distinction between this close and future production/offline/dossier work.

- [ ] **Step 4: Refresh deferred work only from findings.**

  Keep Track 08 offline and Track 11 durable-document/storage items deferred. Add a new item only when Phase C produced concrete evidence and a future trigger.

- [ ] **Step 5: Run final document and repository checks.**

  ```bash
  rg -n "NOT RUN|BLOCKED|FAIL|placeholder|fixture|Playwright" docs/runbooks/track-12-demo.md docs/runbooks/track-12-setup-walkthrough.md docs/qa/track-12-agent-walkthrough.md docs/acceptance/track-12-demo-release.md
  git diff --check
  git status --short
  ```

  Review every hit in context. `fixture` and `Playwright` may appear only in explicit statements that the presenter does not require them; acceptance may retain truthful FAIL/BLOCKED entries. Remove no truthful evidence.

- [ ] **Step 6: Suggested final checkpoint.**

  If all gates pass and Git operations are authorized, suggested commit message: `docs(release): close Track 12 Demo Lite`.

## Final verification matrix

| Gate | Database state | Required proof | Must remain separate from |
| --- | --- | --- | --- |
| A — clean automation | clean migration replay | lint, typecheck, unit, build, full pgTAP, generated-type diff, diff-check | all demo data |
| B — start-state contract | fresh `demo:prepare` reset | manifest counts/codes/statuses, readiness, isolation, zero engineering/outcomes, stable double `demo:check` | browser mutations |
| C — business release | prepared stand mutated only through UI | positive story, negatives, roles, isolation, refresh, opened XLSX/PDF, owner timing/sign-off | SQL, Studio, service-role mutation, per-track fixture chain |

## Completion definition

Implementation is complete only when:

- a non-local or unconfirmed reset is demonstrably impossible;
- `demo:prepare` recreates the stand and `demo:check` is repeatable/read-only;
- the rich catalog matches the manifest and `TRACK01-B` remains sparse;
- no engineering or operational outcome exists before the UI walkthrough;
- all four files validate and apply through the actual import UI;
- the business flow reaches durable reports in 30–40 minutes without hidden tooling;
- role, negative-transition, duplicate/stale, project-isolation, and refresh checks pass;
- both exports open and contain current project data;
- the optional from-scratch project/referential walkthrough passes;
- Phase A, B, and C evidence is recorded honestly;
- the roadmap calls the result Demo Lite, not production/offline/dossier delivery.
