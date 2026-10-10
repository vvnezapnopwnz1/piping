# Справочники проекта: один список вместо вкладок — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** страница «Справочники проекта» (`/admin/project-referential`) открывает любой справочник одним
кликом из списка слева, и каждый справочник — одна таблица на общем `DataTable` с поиском, сортировкой
и страницами, а не карточки друг под другом за двумя рядами вкладок.

**Architecture:** чистый каталог справочников (`reference-catalog.ts`) задаёт группы, ключи, адрес
`?ref=<key>`, цели пунктов готовности и типы импорта Excel. Экран рисует слева `ReferenceNavigator`, справа —
компонент группы, который показывает только выбранный справочник. Каждая таблица — `ReferenceTable` поверх
существующего `components/ui/data-table`. Загрузка данных, диалоги добавления и действия над строками
остаются как есть: меняется только интерфейс.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, Tailwind 4, shadcn/ui (Radix),
`components/ui/data-table`, `node:test` через `tsx`.

**Spec:** разбор agy с проверкой Claude — `tasks/project-setup-ux/AGY-REPORT.md`; обход стенда —
`tasks/project-setup-ux/survey.ts`, снимки `tasks/project-setup-ux/survey/*.png`. Решения владельца — ниже.

## Решения владельца (10.10)

- Переделка — **только интерфейс**. Правка и деактивация строк, которых сейчас нет, — отдельной задачей
  с бэкендом. Новые RPC, миграции, правки `supabase/**` и `modules/*/infrastructure/**` не делаем.
- Вариант «список слева + таблица справа» (Procore Admin, Atlassian settings sidebar) — без вкладок внутри
  вкладок. Цель — проще, не больше функций.
- Excel — через уже существующий импорт (`/admin/imports`), кнопкой из таблицы справочника.

## Что нашли (обход стенда и кода 10.10)

1. Навигация в три этажа: меню админки (там уже есть «Системные справочники» и «Веса прогресса»), шесть
   вкладок страницы (те же «Системные справочники» и «Веса прогресса» ещё раз), под ними вкладки 2-го уровня
   двух разных видов (подчёркнутые и «таблетки»).
2. Около 30 справочников в пяти файлах. Во вкладках «Тест-пакет и перемещения» и «Раскрой и покраска»
   справочники — **списки карточек друг под другом** без заголовков столбцов, поиска и прокрутки: при
   сотнях подсистем «Службы линий» и «Единицы времени» уезжают на тысячи пикселей вниз. Это и есть
   «таблицы не тянут много строк из-за того, как устроен интерфейс».
3. В таблицах «Сварки и качества» все строки рисуются сразу, высота строки 47 px, вокруг — карточка с
   отступами: 30 записей PML = 1454 px. Карточка WPS приклеена под **каждой** вкладкой сварки, с двойным
   заголовком.
4. Поиск есть только у субподрядчиков, зон PDS и бригад; сортировки нет нигде.
5. Импорт Excel для PML, WPS, допусков сварщиков, толщин/фланцев и матрицы NDE существует, но живёт на
   отдельной странице «Импорт», из справочника к нему не попасть.
6. Пункты панели готовности ведут не туда: `service_classes`, `thickness_flange_rules`,
   `piping_material_records` указывают на вкладку `spooling`, `locations` и `devices` — на несуществующую
   `tracking`, `ral_codes` — на `painting`, веса прогресса — на `general` (`domain/setup-readiness.ts:8-35`).
7. В уже общем `components/ui/data-table` есть поиск, сортировка, фильтры и страницы по 50 строк — им
   пользуются 16 экранов. Новая библиотека таблиц не нужна.

## Global Constraints

- Работа в рабочей директории на ветке `feat/unified-workspace`, без новых веток и worktree, без `git push`.
- Не менять `supabase/**`, `lib/supabase/**`, `modules/*/infrastructure/**`, `package.json` и зависимости.
- Не трогать стенд: никаких `demo:prepare`, `demo:showcase`, `demo:week`, `supabase db reset`,
  `npm run verify`, `npm run test:db`. В браузере не нажимать кнопки записи.
- Пароль стенда — только из `.env.local` через `npx tsx --env-file-if-exists=.env.local …`; не печатать.
- Каждый видимый текст — в `messages/en/projectSetup.json` и `messages/ru/projectSetup.json` (ключи
  совпадают); русский — по `docs/i18n/glossary-ru.md` (катушка, монтажный стык, тест-пакет, NDE латиницей,
  замечание, Приёмка ОТК). Ключи, которые перестали использоваться, удалить из обоих файлов.
- Диалоги добавления, их валидация и вызовы `create*`/`save*`/`assign*`/`set*` остаются без изменений.
  Существующие действия над строками (деактивация кода замечания, вместимость места хранения, назначение
  пользователя ТСД, настройки сборки, правка/архив WPS) продолжают работать.
- Таблицы — только через `ReferenceTable` (Task 3) поверх `components/ui/data-table`. Своих `<table>` в
  `modules/project-setup/ui/*-references.tsx` нет.
- Проверки каждой задачи: `npm run typecheck`, `npx eslint app/admin modules/project-setup modules/imports
  modules/construction/application i18n`, `npm run test:unit`.

## Review Focus

1. Переход из проверки материала катушки в PML (`material-reference-link.ts`) открывает справочник PML с
   фильтром по Ident, плашкой фильтра и кнопкой сброса — как сейчас. Тест — Task 2, шаг 7.
2. Поиск, введённый в одном справочнике, не фильтрует следующий: переход по списку слева оставляет в адресе
   только `p` и `ref`. Тест на `referenceQuery` — Task 1.
3. Пункт готовности, ведущий на отдельную страницу («Системные справочники», «Веса прогресса»), у
   пользователя без права на эту страницу — простой текст, не ссылка. Код — Task 2, шаг 4.
4. Неизвестный или старый адрес (`?tab=fabrication&reference=pml`, `?ref=toString`) открывает справочник по
   умолчанию и не падает. Тест на `parseReferenceKey` и `readinessTarget("toString")` — Task 1.
5. Пустой справочник у пользователя без права правки: таблица показывает «нет записей», кнопок «Добавить» и
   «Загрузить из Excel» нет. Проверка — Task 8 (обход стенда под ролью без `project_referential.manage`
   недоступен, поэтому — по коду: каждая кнопка в `actions` обёрнута в `canManage`).

---

## Файловая структура

| Файл | Что делает |
|---|---|
| `modules/project-setup/ui/reference-catalog.ts` (новый) | группы и ключи справочников, `?ref=`, цели готовности, типы импорта |
| `modules/project-setup/ui/reference-catalog.test.ts` (новый) | тесты каталога |
| `modules/project-setup/ui/reference-navigator.tsx` (новый) | список слева; на узком экране — выпадающий список |
| `modules/project-setup/ui/reference-pane.tsx` (новый) | `ReferencePane` (заголовок, число, действия) и `ReferenceTable` |
| `modules/project-setup/ui/project-referential-screen.tsx` | раскладка: готовность, список, справочник |
| `modules/project-setup/ui/setup-readiness-panel.tsx` | пункты готовности — ссылки на справочник или страницу |
| `modules/project-setup/domain/setup-readiness.ts` | без `SETUP_REQUIREMENTS.tab` и `getRequirementDetails` |
| `modules/project-setup/ui/general-references.tsx` | бывший `project-geography-tabs.tsx` |
| `modules/project-setup/ui/welding-references.tsx` | бывший `welding-quality-tabs.tsx` |
| `modules/project-setup/ui/testpack-references.tsx` | бывший `execution-reference-tabs.tsx` |
| `modules/project-setup/ui/spooling-references.tsx` | бывший `extended-reference-tabs.tsx` |
| `modules/project-setup/ui/reference-layout.test.ts` (новый) | структурный тест: нет вкладок, каждый ключ отрисован |
| `modules/construction/application/material-reference-link.ts` | ссылка в PML — `ref=pml` |
| `modules/imports/ui/import-workbench.tsx`, `app/admin/imports/page.tsx` | `?type=` выбирает тип импорта |

`system-referential-screen.tsx` и `progress-weights-screen.tsx` не меняются: у них свои страницы в меню
админки.

---

### Task 1: Каталог справочников

**Files:**
- Create: `modules/project-setup/ui/reference-catalog.ts`
- Test: `modules/project-setup/ui/reference-catalog.test.ts`

**Interfaces:**
- Consumes: `ImportType` из `@/modules/imports/domain/import-type`, `PROJECT_PARAM` из
  `@/components/pipeqc/project-url`.
- Produces: `REFERENCE_GROUPS`, `ReferenceGroupId`, `ReferenceKey`, `ReferenceKeyOf<G>`,
  `DEFAULT_REFERENCE`, `REFERENCE_PARAM`, `parseReferenceKey(raw: string | null | undefined): ReferenceKey`,
  `referenceGroupOf(key: ReferenceKey): ReferenceGroupId`,
  `referenceQuery(current: URLSearchParams, key: ReferenceKey): string`,
  `REFERENCE_IMPORT_TYPE: Partial<Record<ReferenceKey, ImportType>>`, `ReadinessTarget`,
  `readinessTarget(code: string): ReadinessTarget | null`,
  `referencesMissingData(missingCodes: readonly string[]): ReadonlySet<ReferenceKey>`.

- [ ] **Step 1: Write the failing test**

```ts
// modules/project-setup/ui/reference-catalog.test.ts
import assert from "node:assert/strict"
import test from "node:test"

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
import { IMPORT_TYPES } from "@/modules/imports/domain/import-type"

const allKeys = REFERENCE_GROUPS.flatMap((group) => [...group.keys])

test("every reference key is unique and belongs to exactly one group", () => {
  assert.equal(new Set(allKeys).size, allKeys.length)
  for (const key of allKeys) {
    assert.equal(REFERENCE_GROUPS.filter((g) => (g.keys as readonly string[]).includes(key)).length, 1, key)
  }
  assert.equal(referenceGroupOf("pml"), "welding")
  assert.equal(referenceGroupOf("locations"), "testpack")
})

test("an unknown, empty or inherited key opens the default reference", () => {
  assert.equal(parseReferenceKey("welders"), "welders")
  for (const raw of [null, undefined, "", "fabrication", "toString", "__proto__"]) {
    assert.equal(parseReferenceKey(raw), DEFAULT_REFERENCE, String(raw))
  }
})

test("moving to another reference keeps the project and drops the previous reference's state", () => {
  const current = new URLSearchParams("p=UPG-1&ref=welders&q=ivanov&sort=code&ident=A1&spool=s&material=m&from=%2Ffabrication")
  const next = new URLSearchParams(referenceQuery(current, "pds-areas"))
  assert.deepEqual([...next.entries()], [["p", "UPG-1"], ["ref", "pds-areas"]])
  assert.equal(referenceQuery(new URLSearchParams(""), "teams"), "ref=teams")
})

test("every import type a reference points at exists", () => {
  for (const type of Object.values(REFERENCE_IMPORT_TYPE)) {
    assert.ok((IMPORT_TYPES as readonly string[]).includes(type!), type)
  }
})

test("every readiness code leads to a reference or an admin page", () => {
  assert.deepEqual(readinessTarget("piping_material_records"), { kind: "reference", key: "pml" })
  assert.deepEqual(readinessTarget("service_classes"), { kind: "reference", key: "service-classes" })
  assert.deepEqual(readinessTarget("locations"), { kind: "reference", key: "locations" })
  assert.deepEqual(readinessTarget("material_types"), { kind: "page", href: "/admin/system-referential" })
  assert.deepEqual(readinessTarget("progress_weights_erection"), { kind: "page", href: "/admin/progress-weights" })
  assert.equal(readinessTarget("no_such_code"), null)
  assert.equal(readinessTarget("toString"), null)
})

test("the three NDE matrix codes mark one reference", () => {
  const missing = referencesMissingData(["nde_matrix_shop", "nde_matrix_field", "material_types", "teams"])
  assert.deepEqual([...missing].sort(), ["nde", "teams"])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/project-setup/ui/reference-catalog.test.ts`
Expected: FAIL — `Cannot find module './reference-catalog'`.

- [ ] **Step 3: Write the implementation**

```ts
// modules/project-setup/ui/reference-catalog.ts
import { PROJECT_PARAM } from "@/components/pipeqc/project-url"
import type { ImportType } from "@/modules/imports/domain/import-type"

/**
 * Every project reference, in the order the list on the left shows them. One level: a group heading
 * and its references. They used to sit behind two rows of tabs, and some tabs stacked four lists on
 * top of each other, so a long list pushed the next one off the screen.
 */
export const REFERENCE_GROUPS = [
  { id: "general", keys: ["subcontractors", "units", "area-classifications", "pds-areas"] },
  {
    id: "welding",
    keys: ["service-classes", "weld-types", "welders", "wps", "nde", "thickness", "pml", "rework", "joint-categories"],
  },
  {
    id: "testpack",
    keys: [
      "teams", "punch-codes", "systems", "subsystems", "line-services",
      "unit-time", "location-categories", "locations", "pressure-unit",
    ],
  },
  {
    id: "spooling",
    keys: [
      "spooling-material-types", "spooling-material-classes", "spooling-checklist",
      "ral-codes", "paint-matrix", "assembly", "devices", "pda-users",
    ],
  },
] as const

type Group = (typeof REFERENCE_GROUPS)[number]
export type ReferenceGroupId = Group["id"]
export type ReferenceKey = Group["keys"][number]
export type ReferenceKeyOf<G extends ReferenceGroupId> = Extract<Group, { id: G }>["keys"][number]

export const DEFAULT_REFERENCE: ReferenceKey = "subcontractors"
export const REFERENCE_PARAM = "ref"

const ALL_KEYS: readonly string[] = REFERENCE_GROUPS.flatMap((group) => [...group.keys])

export function parseReferenceKey(raw: string | null | undefined): ReferenceKey {
  return raw && ALL_KEYS.includes(raw) ? (raw as ReferenceKey) : DEFAULT_REFERENCE
}

export function referenceGroupOf(key: ReferenceKey): ReferenceGroupId {
  const group = REFERENCE_GROUPS.find((candidate) => (candidate.keys as readonly string[]).includes(key))
  if (!group) throw new Error(`Unknown reference ${key}`)
  return group.id
}

/**
 * The query string of another reference. Keeps the project; drops the previous reference's search,
 * sort and page, and the PML deep-link context (`ident`, `spool`, `material`, `from`), so a search typed
 * in one table does not silently filter the next one.
 */
export function referenceQuery(current: URLSearchParams, key: ReferenceKey): string {
  const next = new URLSearchParams()
  const project = current.get(PROJECT_PARAM)
  if (project) next.set(PROJECT_PARAM, project)
  next.set(REFERENCE_PARAM, key)
  return next.toString()
}

/** References that already have an Excel import on `/admin/imports`. */
export const REFERENCE_IMPORT_TYPE: Partial<Record<ReferenceKey, ImportType>> = {
  welders: "welder_qualification",
  wps: "welding_procedure",
  nde: "nde_matrix",
  thickness: "thickness_flange",
  pml: "piping_material_list",
}

export type ReadinessTarget =
  | { kind: "reference"; key: ReferenceKey }
  | { kind: "page"; href: "/admin/system-referential" | "/admin/progress-weights" }

const reference = (key: ReferenceKey): ReadinessTarget => ({ kind: "reference", key })
const systemPage: ReadinessTarget = { kind: "page", href: "/admin/system-referential" }
const weightsPage: ReadinessTarget = { kind: "page", href: "/admin/progress-weights" }

const READINESS_TARGETS: Readonly<Record<string, ReadinessTarget>> = {
  material_types: systemPage,
  subcontractors: reference("subcontractors"),
  pds_areas: reference("pds-areas"),
  service_classes: reference("service-classes"),
  weld_types: reference("weld-types"),
  welding_procedures: reference("wps"),
  welder_qualifications: reference("welders"),
  nde_matrix_shop: reference("nde"),
  nde_matrix_assembly: reference("nde"),
  nde_matrix_field: reference("nde"),
  thickness_flange_rules: reference("thickness"),
  piping_material_records: reference("pml"),
  teams: reference("teams"),
  systems: reference("systems"),
  subsystems: reference("subsystems"),
  line_services: reference("line-services"),
  locations: reference("locations"),
  pressure_unit: reference("pressure-unit"),
  progress_weights_prefabrication: weightsPage,
  progress_weights_painting: weightsPage,
  progress_weights_assembly: weightsPage,
  progress_weights_erection: weightsPage,
  spooling_material_types: reference("spooling-material-types"),
  spooling_material_classes: reference("spooling-material-classes"),
  spooling_checklist: reference("spooling-checklist"),
  ral_codes: reference("ral-codes"),
  paint_matrix: reference("paint-matrix"),
  devices: reference("devices"),
}

export function readinessTarget(code: string): ReadinessTarget | null {
  return Object.hasOwn(READINESS_TARGETS, code) ? READINESS_TARGETS[code] : null
}

export function referencesMissingData(missingCodes: readonly string[]): ReadonlySet<ReferenceKey> {
  const keys = new Set<ReferenceKey>()
  for (const code of missingCodes) {
    const target = readinessTarget(code)
    if (target?.kind === "reference") keys.add(target.key)
  }
  return keys
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/project-setup/ui/reference-catalog.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add modules/project-setup/ui/reference-catalog.ts modules/project-setup/ui/reference-catalog.test.ts
git commit -m "feat(setup): one catalog of project references, their address and readiness targets"
```

---

### Task 2: Один список слева вместо двух рядов вкладок

Механический шаг: экран переходит на список слева и `?ref=`, компоненты групп перестают рисовать вкладки
и показывают только выбранный справочник. Карточки и таблицы внутри пока прежние — их заменяют Tasks 3–6.

**Files:**
- Create: `modules/project-setup/ui/reference-navigator.tsx`, `modules/project-setup/ui/reference-layout.test.ts`
- Rename (`git mv`) and modify:
  `project-geography-tabs.tsx` → `general-references.tsx` (export `GeneralReferences`),
  `welding-quality-tabs.tsx` → `welding-references.tsx` (export `WeldingReferences`),
  `execution-reference-tabs.tsx` → `testpack-references.tsx` (export `TestpackReferences`),
  `extended-reference-tabs.tsx` → `spooling-references.tsx` (export `SpoolingReferences`)
- Modify: `modules/project-setup/ui/project-referential-screen.tsx`,
  `modules/project-setup/ui/setup-readiness-panel.tsx`, `modules/project-setup/domain/setup-readiness.ts`,
  `modules/project-setup/domain/setup-readiness.test.ts`, `modules/project-setup/ui/referential-dialogs.test.ts`
  (пути к переименованным файлам), `modules/construction/application/material-reference-link.ts` и его тест,
  `messages/en/projectSetup.json`, `messages/ru/projectSetup.json`

**Interfaces:**
- Consumes: всё из Task 1.
- Produces: `ReferenceNavigator({ active, missing, hrefFor })`;
  `GeneralReferences({ projectId, canManage, reference: ReferenceKeyOf<"general"> })`, так же
  `WeldingReferences` (`"welding"`), `TestpackReferences` (`"testpack"`), `SpoolingReferences` (`"spooling"`);
  `SetupReadinessPanel({ readiness, hrefForReference: (key: ReferenceKey) => string })`.

- [ ] **Step 1: Write the failing structural test**

```ts
// modules/project-setup/ui/reference-layout.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { REFERENCE_GROUPS } from "./reference-catalog"

const FILES = {
  general: "modules/project-setup/ui/general-references.tsx",
  welding: "modules/project-setup/ui/welding-references.tsx",
  testpack: "modules/project-setup/ui/testpack-references.tsx",
  spooling: "modules/project-setup/ui/spooling-references.tsx",
} as const

test("the project references page has no tabs inside tabs", () => {
  for (const path of [...Object.values(FILES), "modules/project-setup/ui/project-referential-screen.tsx"]) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /<Tabs[\s>]|TabsList|TabsTrigger|TabsContent/, path)
  }
})

test("every reference of a group is drawn by that group's component", () => {
  for (const group of REFERENCE_GROUPS) {
    const source = readFileSync(FILES[group.id], "utf8")
    for (const key of group.keys) {
      assert.match(source, new RegExp(`reference === "${key}"`), `${FILES[group.id]} does not draw ${key}`)
    }
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/project-setup/ui/reference-layout.test.ts`
Expected: FAIL — `ENOENT ... general-references.tsx`.

- [ ] **Step 3: Rename the four group files**

```bash
git mv modules/project-setup/ui/project-geography-tabs.tsx modules/project-setup/ui/general-references.tsx
git mv modules/project-setup/ui/welding-quality-tabs.tsx modules/project-setup/ui/welding-references.tsx
git mv modules/project-setup/ui/execution-reference-tabs.tsx modules/project-setup/ui/testpack-references.tsx
git mv modules/project-setup/ui/extended-reference-tabs.tsx modules/project-setup/ui/spooling-references.tsx
```

Обнови пути в `modules/project-setup/ui/referential-dialogs.test.ts` (строки 67, 80, 89, 117, 141, 153,
166, 179) на новые имена файлов.

- [ ] **Step 4: Group components draw one reference, without tabs**

В каждом из четырёх файлов:

1. Переименуй экспорт (`ProjectGeographyTabs` → `GeneralReferences` и т. д.) и добавь проп
   `reference: ReferenceKeyOf<"general">` (`"welding"`, `"testpack"`, `"spooling"`).
2. Удали `<Tabs>`, `<TabsList>`, все `<TabsTrigger>` и `<TabsContent>` и импорт `@/components/ui/tabs`.
3. Каждую карточку справочника оберни в условие по её ключу. Соответствие карточек ключам:

| Файл | Карточка (заголовок) | Ключ |
|---|---|---|
| general | `subcontractorsTitle` | `subcontractors` |
| general | `unitsTitle` | `units` |
| general | `areaClassificationsTitle` | `area-classifications` |
| general | `pdsTitle` | `pds-areas` |
| welding | `serviceClassesTitle` / `weldTypesTitle` / `weldersTitle` / `ndeTitle` | `service-classes` / `weld-types` / `welders` / `nde` |
| welding | `thicknessTitle` / `pmlTitle` / `reworkTitle` / `jointCategoriesTitle` | `thickness` / `pml` / `rework` / `joint-categories` |
| welding | `<SupabaseWpsTab />` (перенести из экрана, без внешней `Card`) | `wps` |
| testpack | `teamsTitle` / `punchCodesTitle` | `teams` / `punch-codes` |
| testpack | `systemsTitle` / `subsystemsTitle` / `lineServicesTitle` / `unitTimeTitle` | `systems` / `subsystems` / `line-services` / `unit-time` |
| testpack | `locationCategoriesTitle` / `locationsTitle` / `pressureUnitTitle` | `location-categories` / `locations` / `pressure-unit` |
| spooling | `spoolingMaterialTypesTitle` / `spoolingMaterialClassesTitle` / `spoolingChecklistTitle` | `spooling-material-types` / `spooling-material-classes` / `spooling-checklist` |
| spooling | `ralCodesTitle` / `paintMatrixTitle` | `ral-codes` / `paint-matrix` |
| spooling | `assemblyConfigTitle` (форма настроек сборки) | `assembly` |
| spooling | `trackingDevicesTitle` / `pdaUsersTitle` | `devices` / `pda-users` |

   Форма: `{reference === "subcontractors" && (<Card>…</Card>)}`. Диалоги остаются вне условий, как сейчас.
4. В `welding-references.tsx` удали `value`, `onValueChange`, `internalTab`, `handleTabChange` и тип
   `WeldingQualityTab`. Плашку покрытия матрицы NDE (`tabs.ndeIncomplete` / `tabs.ndeComplete`) перенеси в
   `CardHeader` карточки `ndeTitle`, рядом с заголовком. Фильтр PML по `ident` (`identFilter`,
   `handleClearIdentFilter`) не трогай.

- [ ] **Step 5: Navigator**

```tsx
// modules/project-setup/ui/reference-navigator.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { REFERENCE_GROUPS, type ReferenceKey } from "./reference-catalog"

export function ReferenceNavigator({
  active,
  missing,
  hrefFor,
}: {
  active: ReferenceKey
  missing: ReadonlySet<ReferenceKey>
  hrefFor: (key: ReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.projectReferential")
  const router = useRouter()

  return (
    <>
      {/* A phone has no room for thirty links above the table: one select instead. */}
      <div className="lg:hidden">
        <Select value={active} onValueChange={(key) => router.replace(hrefFor(key as ReferenceKey), { scroll: false })}>
          <SelectTrigger aria-label={t("chooseReference")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERENCE_GROUPS.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{t(`groups.${group.id}`)}</SelectLabel>
                {group.keys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`references.${key}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav
        aria-label={t("navigatorLabel")}
        className="hidden space-y-4 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
        {REFERENCE_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium uppercase tracking-wide">
              {t(`groups.${group.id}`)}
            </p>
            <ul>
              {group.keys.map((key) => (
                <li key={key}>
                  <Link
                    href={hrefFor(key)}
                    replace
                    scroll={false}
                    aria-current={key === active ? "page" : undefined}
                    className={cn(
                      "hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                      key === active && "bg-accent font-medium",
                    )}
                  >
                    <span>{t(`references.${key}`)}</span>
                    {missing.has(key) ? (
                      <span role="img" aria-label={t("referenceIncomplete")} className="bg-warning-fg size-2 shrink-0 rounded-full" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 6: Screen and readiness panel**

`project-referential-screen.tsx` — замени `TABS`, `VALID_REFERENCES`, `setActiveTab`, `setActiveReference`
и весь `<Tabs>` на:

```tsx
const active = parseReferenceKey(searchParams.get(REFERENCE_PARAM))
const hrefFor = useCallback(
  (key: ReferenceKey) => `${pathname}?${referenceQuery(new URLSearchParams(searchParams.toString()), key)}`,
  [pathname, searchParams],
)
const group = referenceGroupOf(active)
```

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

Импорты `SystemReferentialScreen`, `ProgressWeightsScreen`, `SupabaseWpsTab`, `Tabs*`, `CardHeader`, `CardTitle`
из экрана убрать (WPS теперь в `welding-references.tsx`).

`setup-readiness-panel.tsx` — проп `onNavigateTab` заменить на `hrefForReference`; пункт:

```tsx
const access = useOptionalAccess()
const activityCode = useSupabaseAuth().access?.activityCode ?? ""
// …
const target = readinessTarget(code)
const href =
  target?.kind === "reference"
    ? hrefForReference(target.key)
    : target?.kind === "page" && access && canVisit(target.href, access.can)
      ? withProject(target.href, activityCode)
      : null
const chip = "inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium"
return href ? (
  <Link key={code} href={href} scroll={false} className={`${chip} hover:bg-accent transition-colors`}>
    <span>{label}</span>
    <ArrowRight className="h-3 w-3 text-muted-foreground" />
  </Link>
) : (
  <span key={code} className={chip}>{label}</span>
)
```

Подпись пункта — `t.has(\`requirements.${code}\`)`, как сейчас, но по `code`, не по `req.code`.
Импорты: `useOptionalAccess` из `@/modules/access/ui/access-context`, `useSupabaseAuth` из
`@/contexts/supabase-auth-context`, `canVisit` из `@/components/pipeqc/navigation-model`, `withProject` из
`@/components/pipeqc/project-url`.

`domain/setup-readiness.ts` — удалить `SETUP_REQUIREMENTS` и `getRequirementDetails` (цели теперь в
каталоге); в `setup-readiness.test.ts` удалить их проверки (строки 4–15), проверки
`evaluateReadinessStatus` оставить.

- [ ] **Step 7: PML deep link**

В `material-reference-link.ts` замени `tab: "fabrication", reference: "pml"` на `ref: "pml"`. В
`material-reference-link.test.ts` замени

```ts
  assert.equal(params.get("tab"), "fabrication")
  assert.equal(params.get("reference"), "pml")
```

на

```ts
  assert.equal(params.get("ref"), "pml")
  assert.equal(params.get("tab"), null)
```

- [ ] **Step 8: Messages**

В `projectSetup.projectReferential` (en и ru) переименуй `tabs` в `groups`, удали `tabs.system`,
`tabs.weights`, `wpsCardTitle`, переименуй `fabrication` → `welding`, и добавь:

| Ключ | en | ru |
|---|---|---|
| `navigatorLabel` | Project references | Справочники проекта |
| `chooseReference` | Reference | Справочник |
| `referenceIncomplete` | Not filled in | Не заполнено |
| `groups.general` / `welding` / `testpack` / `spooling` | General / Welding & Quality / Testpack & Tracking / Spooling & Painting | Общие / Сварка и качество / Тест-пакет и перемещения / Раскрой и покраска |
| `references.subcontractors` | Subcontractors | Субподрядчики |
| `references.units` | Units | Технологические узлы |
| `references.area-classifications` | Area Classifications | Классификации зон |
| `references.pds-areas` | PDS Areas | Зоны PDS |
| `references.service-classes` | Service Classes | Классы эксплуатации |
| `references.weld-types` | Weld Types | Типы стыков |
| `references.welders` | Welders | Сварщики |
| `references.wps` | WPS | WPS |
| `references.nde` | NDE Matrix | Матрица NDE |
| `references.thickness` | Thickness & Flanges | Толщины и фланцы |
| `references.pml` | PML Records | Записи PML |
| `references.rework` | Rework Codes | Коды дефектов |
| `references.joint-categories` | Joint Categories | Категории стыков |
| `references.teams` | Teams | Бригады |
| `references.punch-codes` | Punch Codes | Коды замечаний |
| `references.systems` | Systems | Системы |
| `references.subsystems` | Subsystems | Подсистемы |
| `references.line-services` | Line Services | Службы линий |
| `references.unit-time` | Unit of Time | Единицы времени |
| `references.location-categories` | Location Categories | Категории мест хранения |
| `references.locations` | Locations | Места хранения |
| `references.pressure-unit` | Pressure Unit | Единица давления |
| `references.spooling-material-types` | Material Types | Типы материалов |
| `references.spooling-material-classes` | Material Classes | Классы материалов |
| `references.spooling-checklist` | Spooling Checklist | Чек-лист раскроя |
| `references.ral-codes` | RAL Colors | Цвета RAL |
| `references.paint-matrix` | Paint Matrix | Матрица покраски |
| `references.assembly` | Assembly | Сборка |
| `references.devices` | Devices | Устройства |
| `references.pda-users` | PDA Users | Пользователи ТСД |

Ключи `tabs.*` в `projectGeography`, `executionReference`, `extendedReference` перестают использоваться —
удали их из en и ru. `weldingQuality.tabs.*` со счётчиками пока оставь: счётчики вернутся в заголовок
справочника в Task 4.

- [ ] **Step 9: Run checks**

Run: `npm run typecheck && npx eslint app/admin modules/project-setup modules/construction/application i18n && npm run test:unit`
Expected: всё зелёное, включая `reference-layout.test.ts`, `referential-dialogs.test.ts`,
`material-reference-link.test.ts`, детектор английских строк и паритет en/ru.

- [ ] **Step 10: Commit**

```bash
git add modules/project-setup modules/construction/application messages
git commit -m "feat(setup): project references open from one list instead of tabs inside tabs"
```

---

### Task 3: Общая таблица справочника; группа «Общие» на ней

**Files:**
- Create: `modules/project-setup/ui/reference-pane.tsx`
- Modify: `modules/project-setup/ui/general-references.tsx`, `messages/{en,ru}/projectSetup.json`

**Interfaces:**
- Consumes: `DataTable`, `useTableUrlState`, `DataColumn` из `@/components/ui/data-table`.
- Produces: `ReferencePane({ title, description?, count?, status?, actions?, children })`,
  `ReferenceTable<Row>({ columns, rows, rowId, emptyTitle, searchPlaceholder? })`.

- [ ] **Step 1: Pane and table**

```tsx
// modules/project-setup/ui/reference-pane.tsx
"use client"

import type { ReactNode } from "react"

import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"

/** One reference on the right of the list: its name, how many rows, what can be done, the table. */
export function ReferencePane({
  title,
  description,
  count,
  status,
  actions,
  children,
}: {
  title: string
  description?: string
  count?: number
  status?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span>{title}</span>
            {count !== undefined ? (
              <span className="text-muted-foreground text-sm font-normal tabular-nums">{count}</span>
            ) : null}
            {status}
          </h2>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

/**
 * A reference table on the shared worklist table: search once there are more than ten rows, sort by
 * any column, fifty rows a page. Render it with `key={reference}` so moving to another reference
 * starts from a clean search.
 */
export function ReferenceTable<Row>({
  columns,
  rows,
  rowId,
  emptyTitle,
  searchPlaceholder,
}: {
  columns: ReadonlyArray<DataColumn<Row>>
  rows: readonly Row[]
  rowId: (row: Row) => string
  emptyTitle: string
  searchPlaceholder?: string
}) {
  const [state, setState] = useTableUrlState()
  return (
    <DataTable
      variant="compact"
      columns={columns}
      rows={rows}
      rowId={rowId}
      state={state}
      onStateChange={setState}
      emptyTitle={emptyTitle}
      searchPlaceholder={searchPlaceholder}
    />
  )
}
```

- [ ] **Step 2: Port «Общие» — образец**

Субподрядчики. Было — `Card` с полем поиска `subSearch` и ручной `<table>` (`general-references.tsx`,
бывшие строки 383–445). Стало:

```tsx
// Same typing as `FlangeColumnsTranslator` in modules/flange/ui/flange-management-screen.tsx:28.
type GeneralT = ReturnType<typeof useTranslations<"projectSetup.projectGeography">>

function subcontractorColumns(t: GeneralT): ReadonlyArray<DataColumn<Subcontractor>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "contactDetails", header: t("columns.contactDetails"), value: (row) => row.contactDetails ?? "", searchable: true, cell: (row) => row.contactDetails || "—", className: "text-muted-foreground" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}
```

```tsx
{reference === "subcontractors" && (
  <ReferencePane
    title={t("subcontractorsTitle")}
    description={t("subcontractorsDesc")}
    count={geography.subcontractors.length}
    actions={canManage ? (
      <Button size="sm" onClick={() => setIsAddSubOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> {t("addSubcontractor")}
      </Button>
    ) : null}
  >
    <ReferenceTable
      key={reference}
      columns={subcontractorColumns(t)}
      rows={geography.subcontractors}
      rowId={(row) => row.id}
      emptyTitle={t("noSubcontractors")}
      searchPlaceholder={t("searchSubcontractors")}
    />
  </ReferencePane>
)}
```

Удали `subSearch`, `filteredSubs` и поле `<Input>` поиска — поиск теперь в таблице. Функции столбцов —
на уровне модуля, рядом с компонентом; переводчик передаётся аргументом, как в образце.

- [ ] **Step 3: Port the rest of «Общие» by the same pattern**

| Ключ | Строки | Столбцы — те же, что сейчас в `<thead>`, по порядку | Поиск |
|---|---|---|---|
| `units` | `geography.units` | как в карточке `unitsTitle` | код, описание |
| `area-classifications` | `geography.areaClassifications` | как в карточке `areaClassificationsTitle` | код, описание |
| `pds-areas` | `geography.pdsAreas` (сейчас через `filteredPds`) | как в карточке `pdsTitle` | все текстовые; убрать `pdsSearch`/`filteredPds` |

Правило переноса: заголовок столбца — тот же ключ `columns.*`; ячейка — то же содержимое, что в `<td>`
(бейджи — через `cell`); `value` — сырое значение для сортировки и поиска; столбец с кодом — `alwaysVisible`
и `className: "font-mono …"`. Пустое состояние — тот же ключ `empty.*`/`no*`, что сейчас в `colSpan`-строке.
Кнопка «Добавить» — в `actions`, только при `canManage`. `Card*` из файла убрать, если больше не нужны.

- [ ] **Step 4: Run checks**

Run: `npm run typecheck && npx eslint modules/project-setup && npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/project-setup messages
git commit -m "feat(setup): general references are sortable tables with search"
```

---

### Task 4: «Сварка и качество» на общей таблице

**Files:** Modify `modules/project-setup/ui/welding-references.tsx`, `messages/{en,ru}/projectSetup.json`

**Interfaces:** Consumes `ReferencePane`, `ReferenceTable` (Task 3).

- [ ] **Step 1: Port eight references by the Task 3 pattern**

| Ключ | Строки | Особенность |
|---|---|---|
| `service-classes` | `data.serviceClasses` | — |
| `weld-types` | `data.weldTypes` | — |
| `welders` | `data.welderQualifications` | — |
| `nde` | `data.ndeMatrixRules` | проп `status` панели — плашка покрытия матрицы (из Task 2, шаг 4) |
| `thickness` | `data.thicknessFlangeRules` | — |
| `pml` | `data.pipingMaterialRecords` | над таблицей — прежняя плашка фильтра `identFilter` с кнопкой сброса |
| `rework` | `data.reworkCodes` | — |
| `joint-categories` | `data.jointCategories` | — |

`count` каждой панели — длина её массива. После переноса ключи `weldingQuality.tabs.*` со счётчиками
больше не нужны — удали из en и ru (кроме `tabs.ndeIncomplete`/`tabs.ndeComplete`, которые переезжают в
`weldingQuality.ndeCoverageIncomplete`/`ndeCoverageComplete` с теми же значениями).

- [ ] **Step 2: WPS**

`{reference === "wps" && <SupabaseWpsTab />}` — компонент уже рисует свой заголовок и кнопку; внешней
карточки и второго заголовка нет.

- [ ] **Step 3: Run checks** — как в Task 3, Step 4. Открой вручную (dev-сервер) `?ref=pml&ident=<код из
  таблицы>` — плашка фильтра видна, сброс убирает `ident` из адреса.

- [ ] **Step 4: Commit**

```bash
git add modules/project-setup messages
git commit -m "feat(setup): welding and quality references are sortable tables with search"
```

---

### Task 5: «Тест-пакет и перемещения» на общей таблице

**Files:** Modify `modules/project-setup/ui/testpack-references.tsx`, `messages/{en,ru}/projectSetup.json`

- [ ] **Step 1: Port by the Task 3 pattern.** Списки карточек становятся таблицами; столбцы — поля, которые
  сейчас показывает строка-карточка, с заголовками из `columns.*` (недостающие — новые ключи en/ru в
  `executionReference.columns`):

| Ключ | Строки | Столбцы | Действие строки (как сейчас) |
|---|---|---|---|
| `teams` | `data.teams` | как сейчас в таблице бригад; убрать свой поиск | — |
| `punch-codes` | `punchCodes` | код, описание, статус | «Деактивировать» (`handleDeactivatePunchCode`) — столбец `actions`, `sortable: false`, только при `canManage` |
| `systems` | `systems` | код, описание, статус | — |
| `subsystems` | `subsystems` | код, описание, система, статус | — |
| `line-services` | `lineServices` | код, описание, статус | — |
| `unit-time` | `unitTimeReferences` | код, UT, описание, статус | — |
| `location-categories` | `locationCategories` | код, описание, статус | — |
| `locations` | `locations` | как сейчас, включая вместимость | «Вместимость» (`setCapacityLocationId`) — столбец `actions` |
| `pressure-unit` | — | не таблица: `ReferencePane` с прежним содержимым карточки | — |

- [ ] **Step 2: Run checks** — как в Task 3, Step 4.
- [ ] **Step 3: Commit**

```bash
git add modules/project-setup messages
git commit -m "feat(setup): test pack and tracking references are tables, not stacked lists"
```

---

### Task 6: «Раскрой и покраска» на общей таблице

**Files:** Modify `modules/project-setup/ui/spooling-references.tsx`, `messages/{en,ru}/projectSetup.json`

- [ ] **Step 1: Port by the Task 3 pattern**

| Ключ | Строки | Столбцы |
|---|---|---|
| `spooling-material-types` | `spoolingMaterialTypes` | код, описание, статус |
| `spooling-material-classes` | `spoolingMaterialClasses` | код класса, тип материала, статус |
| `spooling-checklist` | `spoolingChecklistItems` | код, текст, обязательность, порядок, статус |
| `ral-codes` | `ralCodes` | как сейчас в строке-карточке |
| `paint-matrix` | `paintMatrixRules` | как сейчас в строке-карточке |
| `devices` | `devices` | как сейчас в таблице устройств |
| `assembly` | — | не таблица: `ReferencePane` с прежней формой и кнопкой сохранения |
| `pda-users` | — | `ReferencePane` с прежней формой назначения; список назначений — `ReferenceTable`, если он есть |

- [ ] **Step 2: Run checks** — как в Task 3, Step 4.
- [ ] **Step 3: Commit**

```bash
git add modules/project-setup messages
git commit -m "feat(setup): spooling and painting references are tables, not stacked lists"
```

---

### Task 7: «Загрузить из Excel» из справочника

**Files:**
- Modify: `modules/imports/ui/import-workbench.tsx`, `app/admin/imports/page.tsx`
- Create: `modules/project-setup/ui/reference-import-link.tsx`
- Modify: `modules/project-setup/ui/welding-references.tsx` (5 справочников с импортом),
  `messages/{en,ru}/projectSetup.json`
- Test: `modules/imports/domain/import-type.test.ts` (новый или существующий)

**Interfaces:**
- Produces: `parseImportType(raw: string | null): ImportType | null` в `modules/imports/domain/import-type.ts`;
  `ImportWorkbench({ …, initialType?: ImportType })`; `ReferenceImportLink({ reference })`.

- [ ] **Step 1: Failing test**

```ts
// modules/imports/domain/import-type.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { parseImportType } from "./import-type"

test("an import type in the address is accepted only when it exists", () => {
  assert.equal(parseImportType("nde_matrix"), "nde_matrix")
  for (const raw of [null, "", "nde", "toString"]) assert.equal(parseImportType(raw), null, String(raw))
})
```

Run: `node --import tsx --test modules/imports/domain/import-type.test.ts` → FAIL (`parseImportType` is not a function).

- [ ] **Step 2: Implement**

```ts
// modules/imports/domain/import-type.ts — после IMPORT_TYPES
export function parseImportType(raw: string | null): ImportType | null {
  return raw && (IMPORT_TYPES as readonly string[]).includes(raw) ? (raw as ImportType) : null
}
```

`import-workbench.tsx`: новый проп `initialType?: ImportType`;
`useState<ImportType>(initialType ?? "piping_material_list")`.
`app/admin/imports/page.tsx`: `const initialType = parseImportType(useSearchParams().get("type"))` и
`<ImportWorkbench … initialType={initialType ?? undefined} />`.

```tsx
// modules/project-setup/ui/reference-import-link.tsx
"use client"

import Link from "next/link"
import { FileSpreadsheet } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { REFERENCE_IMPORT_TYPE, type ReferenceKey } from "./reference-catalog"

export function ReferenceImportLink({ reference }: { reference: ReferenceKey }) {
  const t = useTranslations("projectSetup.projectReferential")
  const access = useOptionalAccess()
  const activityCode = useSupabaseAuth().access?.activityCode ?? ""
  const type = REFERENCE_IMPORT_TYPE[reference]
  if (!type || !access || !access.can("imports.manage") || !canVisit("/admin/imports", access.can)) return null
  return (
    <Button asChild size="sm" variant="outline">
      <Link href={withProject(`/admin/imports?type=${type}`, activityCode)}>
        <FileSpreadsheet className="mr-2 h-4 w-4" /> {t("importFromExcel")}
      </Link>
    </Button>
  )
}
```

Ключ `projectReferential.importFromExcel`: en «Upload from Excel», ru «Загрузить из Excel».
В `actions` панелей `welders`, `nde`, `thickness`, `pml` добавь `<ReferenceImportLink reference={reference} />`
перед кнопкой «Добавить», внутри той же проверки `canManage`. Для `wps` кнопку не добавляем: заголовок и
кнопки WPS рисует `SupabaseWpsTab` — оставить как есть.

- [ ] **Step 3: Run checks** — `npm run typecheck && npx eslint app/admin modules/project-setup modules/imports && npm run test:unit` → PASS.
- [ ] **Step 4: Commit**

```bash
git add modules/imports app/admin/imports modules/project-setup messages
git commit -m "feat(setup): a reference with an Excel import opens it with its type chosen"
```

---

### Task 8: Проверка на стенде и показ владельцу

**Files:** Modify `tasks/project-setup-ux/survey.ts` (обход по `?ref=`), без изменений кода приложения.

- [ ] **Step 1:** В `survey.ts` замени обход вкладок на обход `REFERENCE_GROUPS` из каталога: для каждого
  ключа открыть `/admin/project-referential?p=<код>&ref=<key>`, дождаться исчезновения скелетонов, записать:
  число `[role=tablist]` в основной области (ожидается 0), число таблиц (ожидается не больше одной), есть ли
  на странице сырые ключи сообщений (`projectSetup.`), снимок. Запуск для `UPG-1` и `SHOWCASE-1`, cookie
  `NEXT_LOCALE` = `ru`, затем `en`.

Run: `npx tsx --env-file-if-exists=.env.local tasks/project-setup-ux/survey.ts UPG-1 SHOWCASE-1`
Expected: для каждого из 30 ключей — 0 вкладок, ≤ 1 таблицы, 0 сырых ключей.

- [ ] **Step 2:** Проверь по коду Review Focus п. 5: в `*-references.tsx` каждая кнопка в `actions` и каждый
  столбец `actions` стоят под `canManage`.

- [ ] **Step 3:** Открой владельцу видимое окно Chrome на `/admin/project-referential?p=UPG-1&ref=pml`
  (по образцу `tasks/i18n/show.ts`, только чтение).

---

## Вне плана (отдельные задачи)

- Правка и деактивация строк справочников, где их нет (нужны команды на бэкенде).
- Импорт Excel для справочников, у которых его нет (зоны PDS, подсистемы, бригады).
- Лимит API в 1000 строк (`supabase/config.toml: max_rows = 1000`): все справочники, кроме PML, читаются
  одним запросом и молча обрезаются на 1000-й строке. Сейчас до этого далеко; взяться, когда появится
  справочник такого размера (правило «без пагинации без измеренной нужды»).
- Страницы «Системные справочники» и «Веса прогресса» — по тому же образцу, если владелец захочет.
