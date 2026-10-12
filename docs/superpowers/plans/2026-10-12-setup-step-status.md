# Setup Step Status — Inline Step Indicators Without Warning Card

> **For agentic workers:** Execute tasks one by one (`Task 1` -> `Task 2`). Run verification checks after each task. Do not change any file outside the specified list.

**Goal:** Replace the standalone `SetupReadinessPanel` warning card on Setup Home (`/admin`) and Project Referential (`/admin/project-referential`) with inline, per-step status indicators on Setup Home. Incomplete reference steps show missing counts and deep-link directly to the first unconfigured reference; completed steps show a clean check mark; the reference screen relies entirely on its existing navigation dots.

**Architecture:** Pure frontend UI refactoring. No database schema changes, migrations, RPCs, or shell changes. Extends `modules/project-setup/ui/reference-catalog.ts` with a pure `setupStepStatus` aggregator function. Reuses loaded `ProjectSetupReadiness` on Setup Home to render compact inline indicators alongside step rows. Completely removes `SetupReadinessPanel` and deletes unused readiness message keys.

**Tech Stack:** Next.js 16, React 19, next-intl 4, Tailwind 4, Lucide React (`ArrowRight`, `Check`).

**Reference Implementation:** `modules/project-setup/ui/reference-catalog.ts`, `modules/project-setup/ui/reference-catalog.test.ts`, `app/admin/page.tsx`, and `modules/project-setup/ui/project-referential-screen.tsx`.

---

## Findings (UX Evaluation based on Nielsen & Krug Heuristics)

| # | Finding | Heuristic | Severity (1–4) |
|---|---|---|---|
| 1 | Setup Home renders a loud orange card with up to 25 chips, which is noisy for the standard state of a fresh project and duplicates the navigation below | Aesthetic & minimalist design | 3 |
| 2 | Setup steps convey zero completion status in the list, forcing operators to click into each screen to discover whether work remains | Visibility of system status | 3 |
| 3 | Clicking the Project Referential step always opens the default reference (`subcontractors`), even when that reference is already populated and a subsequent reference is missing | Flexibility & efficiency of use | 2 |
| 4 | The Project Referential page duplicates state by rendering the 25-chip card above a sidebar that already marks incomplete references with dots | Consistency & standards | 2 |

---

## Global Constraints

- **Scope boundary:** Only modify `modules/project-setup/ui/reference-catalog.ts`, `modules/project-setup/ui/reference-catalog.test.ts`, `messages/en/admin.json`, `messages/ru/admin.json`, rewrite `app/admin/page.tsx`, modify `modules/project-setup/ui/project-referential-screen.tsx`, delete `modules/project-setup/ui/setup-readiness-panel.tsx`, and prune unused keys in `messages/en/projectSetup.json` and `messages/ru/projectSetup.json`. Do not modify `config/navigation.ts`, `modules/project-setup/domain/setup-readiness.ts`, shell layouts, or any file under `supabase/`.
- **Interface localization:** Every human-readable string must reside in `messages/en/*.json` and `messages/ru/*.json`, never hard-coded in `.tsx`. Russian terminology must strictly follow `docs/i18n/glossary-ru.md`. All Russian plural branches (`one`, `few`, `many`, `other`) must be provided.
- **Database preservation:** Never run database mutations or resets: no `supabase db reset`, `demo:*`, `npm run verify`, or `test:db`.
- **Branch & Git policy:** Work on the active branch without creating new branches or pushing remote commits.
- **Verification checks:** Run `npm run typecheck`, `npx eslint <changed files>`, and `npm run test:unit` after each task.
- **Commit attribution:** Every commit message must conclude with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## Review Focus

1. **Codes with no target ignored:** Readiness codes returned by the server that do not map to any known reference or admin page (`readinessTarget(code) === null`) are safely ignored by `setupStepStatus`. They do not increment missing counters because there is no destination page to route the operator to.
2. **First missing reference deep-link:** When `projectReferential.missing > 0`, the step link directly opens `/admin/project-referential?ref=<firstKey>` using the first missing reference in `REFERENCE_GROUPS` order, combined with `withProject` to preserve `?p=<code>`. When missing count is 0, it links cleanly to `/admin/project-referential`.
3. **Pluralization & i18n safety:** Russian plural forms for `referentialsMissing` and `weightsMissing` provide all four CLDR plural branches (`one`, `few`, `many`, `other`) so `npm run test:unit` (`i18n/messages.test.ts`) passes and Russian grammar agrees correctly across all integer counts.
4. **Loading & error state degradation:** While readiness is loading, if no project is selected (`!projectId`), or if `loadProjectSetupReadiness` rejects, no status badges or dots appear on any step row. The steps remain accessible without flashing empty or inaccurate check marks.
5. **Layout & title wrapping:** Status indicators use `shrink-0` and `whitespace-nowrap` inside a flex container so status texts and icons never wrap to a second line or squeeze step titles.

---

## Task Split Rationale

Task 1 implements the pure status counting logic in `reference-catalog.ts` with comprehensive unit tests, introduces status message keys under `admin.overview.status`, and rewrites `app/admin/page.tsx` to display inline statuses without the orange readiness card. Task 2 removes the redundant readiness card from the Project Referential screen, deletes `setup-readiness-panel.tsx`, and cleans up the orphaned `projectSetup.readiness` message catalog blocks.

---

### Task 1: Inline Step Status on Setup Home

**Files:**
- Modify: `modules/project-setup/ui/reference-catalog.ts`
- Modify: `modules/project-setup/ui/reference-catalog.test.ts`
- Modify: `messages/en/admin.json`
- Modify: `messages/ru/admin.json`
- Rewrite: `app/admin/page.tsx`

- [ ] **Step 1: Implement `setupStepStatus` in `modules/project-setup/ui/reference-catalog.ts`.**

Add `setupStepStatus` and its return interface `SetupStepStatus` to `modules/project-setup/ui/reference-catalog.ts`:

Exact replacement in `modules/project-setup/ui/reference-catalog.ts`:

Replace:
```ts
export function referencesMissingData(missingCodes: readonly string[]): ReadonlySet<ReferenceKey> {
  const keys = new Set<ReferenceKey>()
  for (const code of missingCodes) {
    const target = readinessTarget(code)
    if (target?.kind === "reference") keys.add(target.key)
  }
  return keys
}
```
with:
```ts
export function referencesMissingData(missingCodes: readonly string[]): ReadonlySet<ReferenceKey> {
  const keys = new Set<ReferenceKey>()
  for (const code of missingCodes) {
    const target = readinessTarget(code)
    if (target?.kind === "reference") keys.add(target.key)
  }
  return keys
}

export interface SetupStepStatus {
  systemReferential: number
  projectReferential: {
    missing: number
    first: ReferenceKey | null
  }
  progressWeights: number
}

/**
 * Aggregates readiness missing codes into per-step status counts.
 * Project references count distinct missing reference keys and find the first
 * missing reference in REFERENCE_GROUPS display order.
 * Codes with no target are ignored.
 */
export function setupStepStatus(missingCodes: readonly string[]): SetupStepStatus {
  let systemReferential = 0
  let progressWeights = 0
  const missingRefs = new Set<ReferenceKey>()

  for (const code of missingCodes) {
    const target = readinessTarget(code)
    if (!target) continue

    if (target.kind === "reference") {
      missingRefs.add(target.key)
    } else if (target.kind === "page") {
      if (target.href === "/admin/system-referential") {
        systemReferential += 1
      } else if (target.href === "/admin/progress-weights") {
        progressWeights += 1
      }
    }
  }

  let first: ReferenceKey | null = null
  if (missingRefs.size > 0) {
    for (const group of REFERENCE_GROUPS) {
      const match = group.keys.find((key) => missingRefs.has(key))
      if (match) {
        first = match
        break
      }
    }
  }

  return {
    systemReferential,
    projectReferential: {
      missing: missingRefs.size,
      first,
    },
    progressWeights,
  }
}
```

- [ ] **Step 2: Add unit tests in `modules/project-setup/ui/reference-catalog.test.ts`.**

Update `modules/project-setup/ui/reference-catalog.test.ts` to import `setupStepStatus` and assert all edge cases:
- all complete
- only a system code
- NDE shop+assembly+field count as one reference
- first missing follows REFERENCE_GROUPS order
- an unknown code is ignored

Exact replacement in `modules/project-setup/ui/reference-catalog.test.ts`:

Replace:
```ts
import {
  DEFAULT_REFERENCE,
  REFERENCE_GROUPS,
  REFERENCE_IMPORT_TYPE,
  parseReferenceKey,
  readinessTarget,
  referenceGroupOf,
  referenceQuery,
  referencesMissingData,
} from "./reference-catalog"
```
with:
```ts
import {
  DEFAULT_REFERENCE,
  REFERENCE_GROUPS,
  REFERENCE_IMPORT_TYPE,
  parseReferenceKey,
  readinessTarget,
  referenceGroupOf,
  referenceQuery,
  referencesMissingData,
  setupStepStatus,
} from "./reference-catalog"
```

And append at the end of `modules/project-setup/ui/reference-catalog.test.ts`:
```ts
test("setupStepStatus counts missing items per step and finds the first missing reference", () => {
  // all complete
  assert.deepEqual(setupStepStatus([]), {
    systemReferential: 0,
    projectReferential: { missing: 0, first: null },
    progressWeights: 0,
  })

  // only a system code
  assert.deepEqual(setupStepStatus(["material_types"]), {
    systemReferential: 1,
    projectReferential: { missing: 0, first: null },
    progressWeights: 0,
  })

  // NDE shop+assembly+field count as one reference
  assert.deepEqual(
    setupStepStatus(["nde_matrix_shop", "nde_matrix_assembly", "nde_matrix_field"]),
    {
      systemReferential: 0,
      projectReferential: { missing: 1, first: "nde" },
      progressWeights: 0,
    },
  )

  // first missing follows REFERENCE_GROUPS order (welding before testpack, general before welding)
  const status = setupStepStatus(["teams", "weld_types", "subcontractors"])
  assert.deepEqual(status, {
    systemReferential: 0,
    projectReferential: { missing: 3, first: "subcontractors" },
    progressWeights: 0,
  })

  const statusWithoutGeneral = setupStepStatus(["teams", "weld_types"])
  assert.deepEqual(statusWithoutGeneral, {
    systemReferential: 0,
    projectReferential: { missing: 2, first: "weld-types" },
    progressWeights: 0,
  })

  // an unknown code is ignored
  assert.deepEqual(
    setupStepStatus(["unknown_code", "progress_weights_prefabrication"]),
    {
      systemReferential: 0,
      projectReferential: { missing: 0, first: null },
      progressWeights: 1,
    },
  )
})
```

- [ ] **Step 3: Add `admin.overview.status` message keys.**

Add the new status keys under `admin.overview.status` in both English and Russian:

| Key Path | English | Russian |
|---|---|---|
| `admin.overview.status.done` | `"done"` | `"готово"` |
| `admin.overview.status.referentialsMissing` | `"{count, plural, one {# referential missing} other {# referentials missing}}"` | `"{count, plural, one {не заполнен # справочник} few {не заполнены # справочника} many {не заполнено # справочников} other {не заполнено # справочника}}"` |
| `admin.overview.status.weightsMissing` | `"{count, plural, one {# weight set missing} other {# weight sets missing}}"` | `"{count, plural, one {не задан # набор весов} few {не заданы # набора весов} many {не задано # наборов весов} other {не задано # набора весов}}"` |
| `admin.overview.status.importBlocked` | `"fill the referentials first"` | `"сначала заполните справочники"` |

In `messages/en/admin.json`, inside `"overview"`, after the `"steps"` object (add a comma after its closing brace), add:
```json
    "status": {
      "done": "done",
      "referentialsMissing": "{count, plural, one {# referential missing} other {# referentials missing}}",
      "weightsMissing": "{count, plural, one {# weight set missing} other {# weight sets missing}}",
      "importBlocked": "fill the referentials first"
    }
```

In `messages/ru/admin.json`, inside `"overview"`, after the `"steps"` object (add a comma after its closing brace), add:
```json
    "status": {
      "done": "готово",
      "referentialsMissing": "{count, plural, one {не заполнен # справочник} few {не заполнены # справочника} many {не заполнено # справочников} other {не заполнено # справочника}}",
      "weightsMissing": "{count, plural, one {не задан # набор весов} few {не заданы # набора весов} many {не задано # наборов весов} other {не задано # набора весов}}",
      "importBlocked": "сначала заполните справочники"
    }
```

- [ ] **Step 4: Rewrite `app/admin/page.tsx`.**

Replace `app/admin/page.tsx` in full with inline step indicators, removing `SetupReadinessPanel`:

```tsx
// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, Check } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import type { ProjectSetupReadiness } from "@/modules/project-setup/domain/setup-readiness"
import { loadProjectSetupReadiness } from "@/modules/project-setup/infrastructure/supabase-setup-readiness-repository"
import { setupStepStatus } from "@/modules/project-setup/ui/reference-catalog"

/** The setup pages in the order a project is configured; each title is the page's tab name. */
const SETUP_STEPS = [
  { key: "projectDefinition", href: "/admin/project-definition" },
  { key: "systemReferential", href: "/admin/system-referential" },
  { key: "projectReferential", href: "/admin/project-referential" },
  { key: "progressWeights", href: "/admin/progress-weights" },
  { key: "accessRights", href: "/admin/access-rights" },
  { key: "imports", href: "/admin/imports" },
] as const

type StepKey = (typeof SETUP_STEPS)[number]["key"]

type StepStatus =
  | { kind: "done"; label: string }
  | { kind: "missing"; label: string }

function StepStatusBadge({ status }: { status: StepStatus }) {
  if (status.kind === "done") {
    return (
      <span className="text-success-fg flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap">
        <Check className="size-4 shrink-0" />
        <span>{status.label}</span>
      </span>
    )
  }
  return (
    <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap">
      <span className="bg-warning-fg size-2 shrink-0 rounded-full" />
      <span>{status.label}</span>
    </span>
  )
}

export default function AdminPage() {
  const t = useTranslations("admin.overview")
  const tStatus = useTranslations("admin.overview.status")
  const tNav = useTranslations("nav")
  const tReferential = useTranslations("projectSetup.projectReferential")

  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const projectId = auth.access?.projectId
  const activityCode = auth.access?.activityCode

  // `readiness: null` means the load failed. A result kept for another project is not shown.
  const [loaded, setLoaded] = useState<{ projectId: string; readiness: ProjectSetupReadiness | null } | null>(null)
  const current = loaded && loaded.projectId === projectId ? loaded : null

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    loadProjectSetupReadiness(getSupabaseBrowserClient(), projectId)
      .then((readiness) => {
        if (!cancelled) setLoaded({ projectId, readiness })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ projectId, readiness: null })
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const readiness = current?.readiness ?? null
  const stats = readiness ? setupStepStatus(readiness.missingCodes) : null
  const counted = (count: number, missing: string): StepStatus =>
    count === 0 ? { kind: "done", label: tStatus("done") } : { kind: "missing", label: missing }

  // Only the steps that have readiness codes say something; the others stay quiet.
  const statusOf = (key: StepKey): StepStatus | null => {
    if (!readiness || !stats) return null
    switch (key) {
      case "systemReferential":
        return counted(stats.systemReferential, tStatus("referentialsMissing", { count: stats.systemReferential }))
      case "projectReferential":
        return counted(stats.projectReferential.missing, tStatus("referentialsMissing", { count: stats.projectReferential.missing }))
      case "progressWeights":
        return counted(stats.progressWeights, tStatus("weightsMissing", { count: stats.progressWeights }))
      case "imports":
        return readiness.readyForImport ? null : { kind: "missing", label: tStatus("importBlocked") }
      default:
        return null
    }
  }

  // With references missing, the step opens the first of them rather than the top of the list.
  const hrefOf = (step: (typeof SETUP_STEPS)[number]): string =>
    step.key === "projectReferential" && stats?.projectReferential.first
      ? `/admin/project-referential?ref=${stats.projectReferential.first}`
      : step.href

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {current && !current.readiness ? (
        <p className="text-muted-foreground text-sm">{tReferential("failedToLoad")}</p>
      ) : null}

      <ol className="space-y-2">
        {SETUP_STEPS.map((step, index) => {
          const stepStatus = statusOf(step.key)
          const body = (
            <div className="flex min-w-0 items-start gap-4">
              <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="text-foreground font-medium">{tNav(step.key)}</div>
                <p className="text-muted-foreground text-sm">{t(`steps.${step.key}`)}</p>
              </div>
            </div>
          )

          return (
            <li key={step.key}>
              {access && canVisit(step.href, access.can) ? (
                <Link
                  href={withProject(hrefOf(step), activityCode)}
                  className="hover:bg-accent border-border flex items-center justify-between gap-4 rounded-md border p-3 transition-colors"
                >
                  {body}
                  <div className="flex shrink-0 items-center gap-3">
                    {stepStatus ? <StepStatusBadge status={stepStatus} /> : null}
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </div>
                </Link>
              ) : (
                <div className="border-border flex items-center justify-between gap-4 rounded-md border p-3 opacity-60">
                  {body}
                  {stepStatus ? (
                    <div className="flex shrink-0 items-center">
                      <StepStatusBadge status={stepStatus} />
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 5: Verification.**
Run:
```zsh
npm run typecheck
npx eslint modules/project-setup/ui/reference-catalog.ts modules/project-setup/ui/reference-catalog.test.ts app/admin/page.tsx
npm run test:unit
```

- [ ] **Step 6: Reviewer checks in browser.**
1. Select project `UPG-1` (fully configured):
   - Navigate to `/admin`: Confirm the orange `SetupReadinessPanel` card is absent.
   - Step 1 (Project definition): no status text, displays step number, title, description, and `ArrowRight`.
   - Step 2 (System referential): displays check icon with text `done` (EN) / `готово` (RU) in green (`text-success-fg`).
   - Step 3 (Project referential): displays check icon with text `done` (EN) / `готово` (RU) in green (`text-success-fg`). Link opens `/admin/project-referential?p=UPG-1`.
   - Step 4 (Progress weights): displays check icon with text `done` (EN) / `готово` (RU) in green (`text-success-fg`).
   - Step 5 (Access rights): no status text.
   - Step 6 (Imports): no status text (`readyForImport` is true).
2. Select project `TRACK01-B` (25 missing codes, 21 distinct references on the local stand):
   - Navigate to `/admin`: Confirm no orange card or chips banner appears.
   - Step 1: no status text.
   - Step 2 (System referential): check icon with `done` / `готово` (material types exist on the stand).
   - Step 3 (Project referential): warning dot with `21 referentials missing` / `не заполнен 21 справочник` — the same 21 references the list on the references page marks with a dot.
   - Click Step 3: verify the link navigates directly to `/admin/project-referential?ref=subcontractors&p=TRACK01-B` (the first missing reference in `REFERENCE_GROUPS` order).
   - Step 4 (Progress weights): warning dot with the number of missing weight sets (`… weight sets missing` / `не задано … наборов весов`).
   - Step 5 (Access rights): no status text.
   - Step 6 (Imports): displays warning dot with `fill the referentials first` / `сначала заполните справочники`.
3. Switch project to none (or observe during loading):
   - Verify step rows render with no status indicators (no false `done` checks or dots).

- [ ] **Step 7: Commit.**
```zsh
git add modules/project-setup/ui/reference-catalog.ts modules/project-setup/ui/reference-catalog.test.ts messages/en/admin.json messages/ru/admin.json app/admin/page.tsx
git commit -m "feat(setup): each setup step says what is missing, no warning card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Remove Readiness Panel and Clean Unused Messages

**Files:**
- Modify: `modules/project-setup/ui/project-referential-screen.tsx`
- Delete: `modules/project-setup/ui/setup-readiness-panel.tsx`
- Modify: `messages/en/projectSetup.json`
- Modify: `messages/ru/projectSetup.json`

- [ ] **Step 1: Remove `SetupReadinessPanel` from `modules/project-setup/ui/project-referential-screen.tsx`.**

In `modules/project-setup/ui/project-referential-screen.tsx`, remove the import of `SetupReadinessPanel` and remove its invocation from JSX.

Exact replacement in `modules/project-setup/ui/project-referential-screen.tsx`:

Replace:
```tsx
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { ReferenceNavigator } from "./reference-navigator"
```
with:
```tsx
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { ReferenceNavigator } from "./reference-navigator"
```

And replace:
```tsx
  return (
    <div className="space-y-6">
      <SetupReadinessPanel readiness={readiness} hrefForReference={hrefFor} />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ReferenceNavigator active={active} missing={referencesMissingData(readiness.missingCodes)} hrefFor={hrefFor} />
        <div className="min-w-0">
          {group === "general" && (
            <GeneralReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"general">} />
          )}
          {group === "welding" && (
            <WeldingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"welding">} />
          )}
          {group === "testpack" && (
            <TestpackReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"testpack">} />
          )}
          {group === "spooling" && (
            <SpoolingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"spooling">} />
          )}
        </div>
      </div>
    </div>
  )
```
with:
```tsx
  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <ReferenceNavigator active={active} missing={referencesMissingData(readiness.missingCodes)} hrefFor={hrefFor} />
      <div className="min-w-0">
        {group === "general" && (
          <GeneralReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"general">} />
        )}
        {group === "welding" && (
          <WeldingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"welding">} />
        )}
        {group === "testpack" && (
          <TestpackReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"testpack">} />
        )}
        {group === "spooling" && (
          <SpoolingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"spooling">} />
        )}
      </div>
    </div>
  )
```

- [ ] **Step 2: Delete `modules/project-setup/ui/setup-readiness-panel.tsx`.**

Delete the file `modules/project-setup/ui/setup-readiness-panel.tsx`. Verified that neither `app/admin/page.tsx` nor `project-referential-screen.tsx` nor any other component imports it.

- [ ] **Step 3: Remove unused `projectSetup.readiness` message block.**

Delete the obsolete `"readiness"` block from `messages/en/projectSetup.json` and `messages/ru/projectSetup.json`.

Exact keys removed from both languages:
- `projectSetup.readiness.incomplete`
- `projectSetup.readiness.readyForImport`
- `projectSetup.readiness.notReadyForImport`
- `projectSetup.readiness.descReady`
- `projectSetup.readiness.descNotReady`
- `projectSetup.readiness.requirements.material_types`
- `projectSetup.readiness.requirements.subcontractors`
- `projectSetup.readiness.requirements.pds_areas`
- `projectSetup.readiness.requirements.service_classes`
- `projectSetup.readiness.requirements.weld_types`
- `projectSetup.readiness.requirements.welding_procedures`
- `projectSetup.readiness.requirements.welder_qualifications`
- `projectSetup.readiness.requirements.nde_matrix_shop`
- `projectSetup.readiness.requirements.nde_matrix_assembly`
- `projectSetup.readiness.requirements.nde_matrix_field`
- `projectSetup.readiness.requirements.thickness_flange_rules`
- `projectSetup.readiness.requirements.piping_material_records`
- `projectSetup.readiness.requirements.teams`
- `projectSetup.readiness.requirements.systems`
- `projectSetup.readiness.requirements.subsystems`
- `projectSetup.readiness.requirements.line_services`
- `projectSetup.readiness.requirements.locations`
- `projectSetup.readiness.requirements.pressure_unit`
- `projectSetup.readiness.requirements.progress_weights_prefabrication`
- `projectSetup.readiness.requirements.progress_weights_painting`
- `projectSetup.readiness.requirements.progress_weights_assembly`
- `projectSetup.readiness.requirements.progress_weights_erection`
- `projectSetup.readiness.requirements.spooling_material_types`
- `projectSetup.readiness.requirements.spooling_material_classes`
- `projectSetup.readiness.requirements.spooling_checklist`
- `projectSetup.readiness.requirements.ral_codes`
- `projectSetup.readiness.requirements.paint_matrix`
- `projectSetup.readiness.requirements.devices`
- `projectSetup.readiness.requirements.unknown`

In `messages/en/projectSetup.json` and `messages/ru/projectSetup.json`, delete the whole top-level key `"readiness"` with its object
(`incomplete`, `readyForImport`, `notReadyForImport`, `descReady`, `descNotReady`, `requirements`). Keep the JSON valid: remove the
comma that separated it from its neighbour. Nothing else in these files changes.

- [ ] **Step 4: Verification.**
Run:
```zsh
npm run typecheck
npx eslint modules/project-setup/ui/project-referential-screen.tsx
npm run test:unit
```

- [ ] **Step 5: Reviewer checks in browser.**
1. Open `/admin/project-referential` with project `TRACK01-B`:
   - Verify the top orange card is gone. The screen immediately presents the reference table with the left navigator.
   - Verify that incomplete references in the left navigation still show warning dots (`bg-warning-fg size-2 shrink-0 rounded-full`).
2. Open `/admin/project-referential` with project `UPG-1`:
   - Verify no warning dots and no readiness banners appear.
3. Toggle between English and Russian to confirm no missing message key warnings occur.

- [ ] **Step 6: Commit.**
```zsh
git add modules/project-setup/ui/project-referential-screen.tsx messages/en/projectSetup.json messages/ru/projectSetup.json
git rm modules/project-setup/ui/setup-readiness-panel.tsx
git commit -m "refactor(setup): the references list dots replace the readiness card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Out of Plan

- Per-reference "required for import" markers inside reference table headers or rows.
- Dynamic readiness calculation rules for Project Definition and Access Rights (no backend readiness codes exist for them).
- The imports page (`/admin/imports`) validation checks and file upload flows.
