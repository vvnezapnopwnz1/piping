# Setup Home — Ordered Setup Steps and Readiness Panel

> **For agentic workers:** Execute tasks one by one (`Task 1` -> `Task 2`). Run verification checks after each task. Do not change any file outside the specified list.

**Goal:** Redesign the Setup Home screen (`/admin`) into a single ordered list of six navigable setup steps, surface incomplete setup items for the active project via the existing `SetupReadinessPanel`, make `AdminPageHeader` compact, and standardize all Project Setup page titles to match their navigation tab labels without the `Admin · ` prefix.

**Architecture:** Pure frontend UI consolidation. No database schema changes, no migrations, no new RPCs or endpoints. Reuses `loadProjectSetupReadiness` and `SetupReadinessPanel` without modifying them. Step items preserve active project context with `withProject(href, code)` and disable navigation for forbidden steps using `canVisit(href, can)`.

**Tech Stack:** Next.js 16, React 19, next-intl 4, Tailwind 4, shadcn/ui.

**Reference Implementation:** `modules/project-setup/ui/setup-readiness-panel.tsx`, `modules/project-setup/ui/project-referential-screen.tsx`, `components/pipeqc/project-url.ts`, and `components/pipeqc/navigation-model.ts`.

---

## Findings (UX Evaluation based on Nielsen & Krug Heuristics)

| # | Finding | Heuristic | Severity (1–4) |
|---|---|---|---|
| 1 | Setup Home duplicates concepts with 5 cards and 4 static sequence steps, fragmenting operator focus | Aesthetic & minimalist design | 3 |
| 2 | The sequence card renders static `<li>` boxes without links, forcing users to look elsewhere to navigate | Flexibility & efficiency of use | 3 |
| 3 | Progress weights (`/admin/progress-weights`) is missing completely from Setup Home | Visibility of system status | 2 |
| 4 | Import settings card links to `/admin/import-settings`, an obsolete route that immediately redirects to `/admin/imports` | Consistency and standards | 2 |
| 5 | Page titles duplicate the tab name and prepend `Admin · ` / `Администрирование · `, wasting vertical space | Aesthetic & minimalist design | 2 |
| 6 | Existing card links drop the active project query parameter (`?p=`), requiring project re-resolution | Error prevention | 3 |
| 7 | The readiness title reads «не заполнен 25 справочников»: the verb does not agree with the number | Match between system and the real world | 1 |

---

## Global Constraints

- **Scope boundary:** Only modify `components/admin/admin-module-ui.tsx`, `messages/en/admin.json`, `messages/ru/admin.json`, `messages/en/access.json`, `messages/ru/access.json`, `messages/en/projectSetup.json`, `messages/ru/projectSetup.json`, and rewrite `app/admin/page.tsx`. Do not modify `config/navigation.ts`, `modules/project-setup/ui/setup-readiness-panel.tsx`, shell layouts, or any file under `supabase/`.
- **Interface localization:** Every human-readable string must reside in `messages/en/*.json` and `messages/ru/*.json`, never hard-coded in `.tsx`. Russian terminology must strictly follow `docs/i18n/glossary-ru.md`.
- **Database preservation:** Never run database mutations or resets: no `supabase db reset`, `demo:*`, `npm run verify`, or `test:db`.
- **Branch & Git policy:** Work on the active branch without creating new branches or pushing remote commits.
- **Verification checks:** Run `npm run typecheck`, `npx eslint <changed files>`, and `npm run test:unit` after each task.
- **Commit attribution:** Every commit message must conclude with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## Review Focus

1. **No active project:** When `projectId` is undefined or null (e.g. initial landing or unassigned user), the page renders the 6-step list without crashing, omits the readiness panel and load error, and links degrade cleanly without `?p=`.
2. **Access permission gate (`canVisit === false`):** When the operator lacks capability for a step (e.g. missing `access_rights.manage`), the item renders as a disabled plain text row without an `ArrowRight` icon.
3. **Readiness fetch failure:** If `loadProjectSetupReadiness` rejects, the page renders a single muted text line with `failedToLoad`, leaving the ordered step list interactive.
4. **Fully configured project (`missingCodes.length === 0`):** `SetupReadinessPanel` returns `null` when no configuration is missing, keeping Setup Home clean without permanent banners.
5. **Active project persistence (`?p=`):** Clicking any accessible step or readiness requirement chip carries `?p=<code>` so project context is preserved across tab navigations.

---

## Task Split Rationale

Task 1 tightens `AdminPageHeader` layout and standardizes all Project Setup page titles to their tab labels across the English and Russian message catalogs. Task 2 replaces the card grid and static sequence on Setup Home with the unified ordered steps list, integrates `SetupReadinessPanel`, and removes unused message keys.

---

### Task 1: Compact AdminPageHeader and Clean Project Setup Page Titles

**Files:**
- Modify: `components/admin/admin-module-ui.tsx`
- Modify: `messages/en/admin.json`
- Modify: `messages/ru/admin.json`
- Modify: `messages/en/access.json`
- Modify: `messages/ru/access.json`
- Modify: `messages/en/projectSetup.json`
- Modify: `messages/ru/projectSetup.json`

- [ ] **Step 1: Compact `AdminPageHeader` in `components/admin/admin-module-ui.tsx`.**

In `components/admin/admin-module-ui.tsx`, replace the `AdminPageHeader` implementation (lines 26–39) with the compact typography and wrapper spacing:

Exact replacement:

Replace:
```tsx
export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
```
with:
```tsx
export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
```

- [ ] **Step 2: Update Page Title Message Keys.**

Update page titles and descriptions to match navigation tab labels without the `Admin · ` / `Администрирование · ` prefix:

| Key Path | English | Russian |
|---|---|---|
| `admin.overview.title` | `"Project Setup"` | `"Настройка проекта"` |
| `admin.overview.description` | `"What a project needs before work starts, in order."` | `"Что нужно настроить в проекте до начала работ, по порядку."` |
| `access.page.title` | `"Access Rights"` | `"Права доступа"` |
| `projectSetup.adminPages.projectReferentialTitle` | `"Project Referential"` | `"Справочники проекта"` |
| `projectSetup.adminPages.progressWeightsTitle` | `"Progress Weights"` | `"Веса прогресса"` |
| `projectSetup.adminPages.systemReferentialTitle` | `"System Referential"` | `"Системные справочники"` |
| `projectSetup.projectDefinition.headerTitle` | `"Project Definition"` | `"Описание проекта"` |

In `messages/en/admin.json` (inside `"overview"`):
Replace:
```json
    "title": "Admin · Overview",
    "description": "Setup workspace for project definition, master data, access mapping, and import configuration.",
```
with:
```json
    "title": "Project Setup",
    "description": "What a project needs before work starts, in order.",
```

In `messages/ru/admin.json` (inside `"overview"`):
Replace:
```json
    "title": "Администрирование · Обзор",
    "description": "Рабочее пространство для описания проекта, справочников, настройки доступа и параметров импорта.",
```
with:
```json
    "title": "Настройка проекта",
    "description": "Что нужно настроить в проекте до начала работ, по порядку.",
```

In `messages/en/access.json` (inside `"page"`):
Replace:
```json
    "title": "Admin · Access Rights",
```
with:
```json
    "title": "Access Rights",
```

In `messages/ru/access.json` (inside `"page"`):
Replace:
```json
    "title": "Администрирование · Права доступа",
```
with:
```json
    "title": "Права доступа",
```

In `messages/en/projectSetup.json` (inside `"adminPages"` and `"projectDefinition"`):
In `"adminPages"`:
Replace:
```json
    "projectReferentialTitle": "Admin · Project Referential",
    "projectReferentialDesc": "Project-level master data for spooling, fabrication, erection, testpack, tracking, and painting.",
    "selectProjectReferential": "Select a project to manage its referentials.",
    "progressWeightsTitle": "Admin · Progress Weights",
    "progressWeightsDesc": "Configure progress weight allocations across project phases.",
    "selectProjectWeights": "Select a project to manage its progress weights.",
    "systemReferentialTitle": "Admin · System Referential",
```
with:
```json
    "projectReferentialTitle": "Project Referential",
    "projectReferentialDesc": "Project-level master data for spooling, fabrication, erection, testpack, tracking, and painting.",
    "selectProjectReferential": "Select a project to manage its referentials.",
    "progressWeightsTitle": "Progress Weights",
    "progressWeightsDesc": "Configure progress weight allocations across project phases.",
    "selectProjectWeights": "Select a project to manage its progress weights.",
    "systemReferentialTitle": "System Referential",
```

In `"projectDefinition"`:
Replace:
```json
    "headerTitle": "Admin · Project Definition",
```
with:
```json
    "headerTitle": "Project Definition",
```

In `messages/ru/projectSetup.json` (inside `"adminPages"` and `"projectDefinition"`):
In `"adminPages"`:
Replace:
```json
    "projectReferentialTitle": "Администрирование · Справочники проекта",
    "projectReferentialDesc": "Справочники уровня проекта для раскроя, изготовления, монтажа, тест-пакетов, перемещений и покраски.",
    "selectProjectReferential": "Выберите проект для управления справочниками.",
    "progressWeightsTitle": "Администрирование · Веса прогресса",
    "progressWeightsDesc": "Настройка распределения весов прогресса по этапам проекта.",
    "selectProjectWeights": "Выберите проект для управления весами прогресса.",
    "systemReferentialTitle": "Администрирование · Системные справочники",
```
with:
```json
    "projectReferentialTitle": "Справочники проекта",
    "projectReferentialDesc": "Справочники уровня проекта для раскроя, изготовления, монтажа, тест-пакетов, перемещений и покраски.",
    "selectProjectReferential": "Выберите проект для управления справочниками.",
    "progressWeightsTitle": "Веса прогресса",
    "progressWeightsDesc": "Настройка распределения весов прогресса по этапам проекта.",
    "selectProjectWeights": "Выберите проект для управления весами прогресса.",
    "systemReferentialTitle": "Системные справочники",
```

In `"projectDefinition"`:
Replace:
```json
    "headerTitle": "Администрирование · Определение проекта",
```
with:
```json
    "headerTitle": "Описание проекта",
```

- [ ] **Step 2b: Russian agreement of the readiness title.**
In `messages/ru/projectSetup.json`, key `readiness.incomplete`, the verb must agree with the number
(today the panel reads «не заполнен 25 справочников»). Replace the value with exactly:
```json
    "incomplete": "Настройка не завершена — {count, plural, one {не заполнен # справочник} few {не заполнены # справочника} many {не заполнено # справочников} other {не заполнено # справочника}}",
```
The English value stays as it is.

- [ ] **Step 3: Verification.**
Run:
```zsh
npm run typecheck
npx eslint components/admin/admin-module-ui.tsx
npm run test:unit
```

- [ ] **Step 4: Reviewer checks in browser.**
1. Navigate to `/admin`: Header title displays "Project Setup" / «Настройка проекта» and description is compact (`text-sm text-muted-foreground`).
2. Navigate to `/admin/project-definition`: Header title displays "Project Definition" / «Описание проекта» without "Admin · ".
3. Navigate to `/admin/system-referential`: Header title displays "System Referential" / «Системные справочники».
4. Navigate to `/admin/project-referential`: Header title displays "Project Referential" / «Справочники проекта».
5. Navigate to `/admin/progress-weights`: Header title displays "Progress Weights" / «Веса прогресса».
6. Navigate to `/admin/access-rights`: Header title displays "Access Rights" / «Права доступа».
7. Toggle language between EN and RU to verify that titles and descriptions match navigation tab names.

- [ ] **Step 5: Commit.**
```zsh
git add components/admin/admin-module-ui.tsx messages/en/admin.json messages/ru/admin.json messages/en/access.json messages/ru/access.json messages/en/projectSetup.json messages/ru/projectSetup.json
git commit -m "fix(setup): page titles are the tab names, the header is lower

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Setup Home Ordered Steps List and Readiness Panel

**Files:**
- Modify: `messages/en/admin.json`
- Modify: `messages/ru/admin.json`
- Rewrite: `app/admin/page.tsx`

- [ ] **Step 1: Update `messages/{en,ru}/admin.json` overview structure.**

Remove obsolete message keys under `admin.overview`:
- `cards.projectDefinition`
- `cards.systemReferential`
- `cards.projectReferential`
- `cards.accessRights`
- `cards.importSettings`
- `sequence.title`
- `sequence.description`
- `sequence.step1Label`
- `sequence.step1Text`
- `sequence.step2Label`
- `sequence.step2Text`
- `sequence.step3Label`
- `sequence.step3Text`
- `sequence.step4Label`
- `sequence.step4Text`

Add new step descriptions under `admin.overview.steps`:

| Key Path | English | Russian |
|---|---|---|
| `steps.projectDefinition` | `"Project identity, client and contractor parties, logos, and transit timing."` | `"Идентификаторы проекта, стороны, логотипы и допустимое время перемещения."` |
| `steps.systemReferential` | `"Cross-project standards: material types, torquing methods, film counts, and flange unit times."` | `"Общесистемные стандарты: типы материалов, методы затяжки, нормы плёнок и нормы времени фланцев."` |
| `steps.projectReferential` | `"Project master data for spooling, fabrication, erection, test packs, and tracking."` | `"Справочники проекта для раскроя, цеха, монтажа, тест-пакетов и перемещений."` |
| `steps.progressWeights` | `"Activity weight percentages for fabrication, painting, assembly, and erection phases."` | `"Веса технологических операций для изготовления, покраски, сборки и монтажа."` |
| `steps.accessRights` | `"Project members, access roles, functional roles, and subcontractor or area scoping."` | `"Участники проекта, роли доступа, функциональные роли и ограничения по субподрядчикам и зонам."` |
| `steps.imports` | `"Validate and import piping materials, welding procedures, and welder qualifications."` | `"Проверка и импорт ведомостей материалов, процедур WPS и допусков сварщиков."` |

In `messages/en/admin.json`:
Replace the entire `"overview"` object:
```json
  "overview": {
    "title": "Project Setup",
    "description": "What a project needs before work starts, in order.",
    "cards": {
      "projectDefinition": {
        "title": "Project Definition",
        "description": "Create and configure the active project record."
      },
      "systemReferential": {
        "title": "System Referential",
        "description": "Maintain cross-project references for system-admin scope."
      },
      "projectReferential": {
        "title": "Project Referential",
        "description": "Manage project-level master data used by all modules."
      },
      "accessRights": {
        "title": "Access Rights",
        "description": "Review roles, PipeQC mappings, and subcontractor scoping."
      },
      "importSettings": {
        "title": "Import Settings",
        "description": "Prepare Excel/template import configuration."
      }
    },
    "sequence": {
      "title": "Setup sequence",
      "description": "Recommended order for configuring PipeQC before operational use.",
      "step1Label": "Step 1",
      "step1Text": "Project definition",
      "step2Label": "Step 2",
      "step2Text": "System and project referentials",
      "step3Label": "Step 3",
      "step3Text": "Access rights",
      "step4Label": "Step 4",
      "step4Text": "Import settings"
    }
  },
```
with:
```json
  "overview": {
    "title": "Project Setup",
    "description": "What a project needs before work starts, in order.",
    "steps": {
      "projectDefinition": "Project identity, client and contractor parties, logos, and transit timing.",
      "systemReferential": "Cross-project standards: material types, torquing methods, film counts, and flange unit times.",
      "projectReferential": "Project master data for spooling, fabrication, erection, test packs, and tracking.",
      "progressWeights": "Activity weight percentages for fabrication, painting, assembly, and erection phases.",
      "accessRights": "Project members, access roles, functional roles, and subcontractor or area scoping.",
      "imports": "Validate and import piping materials, welding procedures, and welder qualifications."
    }
  },
```

In `messages/ru/admin.json`:
Replace the entire `"overview"` object:
```json
  "overview": {
    "title": "Настройка проекта",
    "description": "Что нужно настроить в проекте до начала работ, по порядку.",
    "cards": {
      "projectDefinition": {
        "title": "Описание проекта",
        "description": "Создание и настройка записи активного проекта."
      },
      "systemReferential": {
        "title": "Системные справочники",
        "description": "Ведение межпроектных справочников уровня системного администратора."
      },
      "projectReferential": {
        "title": "Справочники проекта",
        "description": "Управление справочниками проекта для всех модулей."
      },
      "accessRights": {
        "title": "Права доступа",
        "description": "Просмотр ролей, назначений PipeQC и ограничений субподрядчиков."
      },
      "importSettings": {
        "title": "Настройки импорта",
        "description": "Подготовка конфигурации импорта Excel/шаблонов."
      }
    },
    "sequence": {
      "title": "Порядок настройки",
      "description": "Рекомендуемый порядок настройки PipeQC перед началом работы.",
      "step1Label": "Шаг 1",
      "step1Text": "Описание проекта",
      "step2Label": "Шаг 2",
      "step2Text": "Системные справочники и справочники проекта",
      "step3Label": "Шаг 3",
      "step3Text": "Права доступа",
      "step4Label": "Шаг 4",
      "step4Text": "Настройки импорта"
    }
  },
```
with:
```json
  "overview": {
    "title": "Настройка проекта",
    "description": "Что нужно настроить в проекте до начала работ, по порядку.",
    "steps": {
      "projectDefinition": "Идентификаторы проекта, стороны, логотипы и допустимое время перемещения.",
      "systemReferential": "Общесистемные стандарты: типы материалов, методы затяжки, нормы плёнок и нормы времени фланцев.",
      "projectReferential": "Справочники проекта для раскроя, цеха, монтажа, тест-пакетов и перемещений.",
      "progressWeights": "Веса технологических операций для изготовления, покраски, сборки и монтажа.",
      "accessRights": "Участники проекта, роли доступа, функциональные роли и ограничения по субподрядчикам и зонам.",
      "imports": "Проверка и импорт ведомостей материалов, процедур WPS и допусков сварщиков."
    }
  },
```

- [ ] **Step 2: Rewrite `app/admin/page.tsx`.**

Replace `app/admin/page.tsx` in full with the ordered list of setup steps and the conditional `SetupReadinessPanel`:

```tsx
// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import type { ProjectSetupReadiness } from "@/modules/project-setup/domain/setup-readiness"
import { loadProjectSetupReadiness } from "@/modules/project-setup/infrastructure/supabase-setup-readiness-repository"
import { SetupReadinessPanel } from "@/modules/project-setup/ui/setup-readiness-panel"

/** The setup pages in the order a project is configured; each title is the page's tab name. */
const SETUP_STEPS = [
  { key: "projectDefinition", href: "/admin/project-definition" },
  { key: "systemReferential", href: "/admin/system-referential" },
  { key: "projectReferential", href: "/admin/project-referential" },
  { key: "progressWeights", href: "/admin/progress-weights" },
  { key: "accessRights", href: "/admin/access-rights" },
  { key: "imports", href: "/admin/imports" },
] as const

export default function AdminPage() {
  const t = useTranslations("admin.overview")
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

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {current && !current.readiness ? (
        <p className="text-muted-foreground text-sm">{tReferential("failedToLoad")}</p>
      ) : null}

      {current?.readiness ? (
        <SetupReadinessPanel
          readiness={current.readiness}
          hrefForReference={(key) => withProject(`/admin/project-referential?ref=${key}`, activityCode)}
        />
      ) : null}

      <ol className="space-y-2">
        {SETUP_STEPS.map((step, index) => {
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
                  href={withProject(step.href, activityCode)}
                  className="hover:bg-accent border-border flex items-center justify-between gap-4 rounded-md border p-3 transition-colors"
                >
                  {body}
                  <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              ) : (
                <div className="border-border rounded-md border p-3 opacity-60">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 3: Verification.**
Run:
```zsh
npm run typecheck
npx eslint app/admin/page.tsx
npm run test:unit
```

- [ ] **Step 4: Reviewer checks in browser.**
1. Open `/admin`:
   - Confirm Setup Home renders an ordered list of 6 steps in exact sequence:
     1. Project definition (`/admin/project-definition`)
     2. System referential (`/admin/system-referential`)
     3. Project referential (`/admin/project-referential`)
     4. Progress weights (`/admin/progress-weights`)
     5. Access rights (`/admin/access-rights`)
     6. Imports (`/admin/imports`)
   - Confirm each step displays its number, title from `nav.json`, description, and an `ArrowRight` icon.
2. Select an unconfigured or partially configured project:
   - Observe `SetupReadinessPanel` appearing above the steps list showing missing referentials as clickable chips.
   - Click a requirement chip (e.g. "Material Types"): verify navigation preserves `?p=<code>` and leads directly to the appropriate configuration section.
3. Select a fully configured project:
   - Verify `SetupReadinessPanel` renders nothing extra above the list (no empty banners).
4. Deselect project (no active project):
   - Confirm only the 6-step list renders without loading spinners or error text.
5. Check step link destinations:
   - Click each step and verify the active project query parameter (`?p=<code>`) is preserved in the URL.
6. Verify restricted permissions:
   - For an operator without access to a step (e.g. `access_rights.manage`), verify the step renders as static text without `hover:bg-accent` and without an arrow.

- [ ] **Step 5: Commit.**
```zsh
git add messages/en/admin.json messages/ru/admin.json app/admin/page.tsx
git commit -m "feat(setup): setup home is one list of steps with what is still missing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Out of Plan

- Top shell and module tab bar height adjustments.
- Navigation changes in `config/navigation.ts`.
- Readiness evaluation rules for access rights and imports (no backend readiness codes exist for them).
- Dynamic per-step completion check marks or progress status indicators.
