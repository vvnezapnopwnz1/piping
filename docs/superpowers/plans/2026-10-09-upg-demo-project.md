# Демо-проект UPG-1: файлы, справочники и недели стройки — план этапа A

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Задачи 1–6 выполняет исполнитель. Задачу 7 (сброс стенда и проверочный прогон) выполняет Claude после подтверждения владельца — исполнитель на задаче 6 останавливается.

**Goal:** Собрать реалистичный демо-проект «Установка подготовки газа УПГ-1»:
- Excel-файлы и файлы Spoolgen, из которых проект заводится через интерфейс;
- скрипт справочников;
- симулятор восьми недель стройки.

Затем доказать проверочным прогоном, что весь путь от импорта до восстановления Z проходит на настоящих командах.

**Architecture:** Всё выводится из одного чистого описания проекта, `scripts/upg/dataset.ts`. Из него строятся четыре вещи:
- **файлы** (`files.ts` → `write-files.ts` → `fixtures/demo-project/`);
- **справочники**: `references.ts` подаёт свой набор в уже существующий сборщик справочников `scripts/demo/supabase-demo-stand.ts`;
- **план недель** (`weeks.ts`) — список действий с днями;
- **исполнитель недели** (`run-week.ts`): выполняет действия теми же RPC и функциями репозиториев, что вызывает интерфейс.

Прямых вставок в таблицы прогресса нет.

**Tech Stack:** TypeScript, `tsx`, `node:test`, `@supabase/supabase-js`, `xlsx` 0.18.5 (уже в зависимостях), локальный Supabase.

**Spec:** `docs/superpowers/specs/2026-10-09-e2e-walkthrough-design.md` (§1 файлы, §2 загрузка, §3 недели, §6 этап A). Исполнитель читает спецификацию и план вместе.

## Global Constraints

- Работа идёт в текущем каталоге и текущей ветке `feat/unified-workspace`. Новые ветки и worktree не создаются. Коммит — после каждой задачи.
- Меняются только `scripts/upg/**`, `fixtures/demo-project/**`, `package.json` (раздел `scripts`) и `scripts/demo/supabase-demo-stand.ts` (задача 3: одна новая опция и один новый метод).
- Не трогать `app/`, `modules/`, `components/`, `lib/`, `supabase/`. Если без правки там не обойтись — остановиться и описать причину в отчёте задачи.
- Запись прогресса и инженерных данных идёт только через RPC и функции репозиториев, которые вызывает интерфейс. Справочники пишутся через существующий сборщик `SupabaseDemoStandCore`, как это делает `demo:prepare`.
- Каждый скрипт отказывается работать с нелокальным `SUPABASE_URL`, пока не сделал ни одной записи.
- Секреты читаются только через `tsx --env-file-if-exists=.env.local`. Их нельзя печатать, передавать в командной строке или писать в файлы.
- Исполнитель **не запускает** `demo:prepare`, `supabase db reset`, `npm run verify`, `demo:showcase`, `demo:project-load`, `demo:project-setup` и `demo:week` против стенда: это делает задача 7 (Claude). Исполнитель запускает только `npm run test:unit`, `npm run typecheck`, `npx eslint <файлы>` и `npm run demo:project-files`.
- Ключи идемпотентности начинаются с `upg-`.
- Даты: начало проекта — `startDate` из `fixtures/demo-project/manifest.json`. Это дата генерации минус 56 дней. День `d` проекта — `startDate + d`; все дни 0–55 лежат в прошлом.
- Код и комментарии на английском, тексты в файлах проекта и отчёты — на русском.

## Review Focus

1. **Повторный запуск недели** (или запуск после сбоя посередине) не дублирует записи и не падает. Ключи детерминированы, а раунд NDE без ожидающих обязательств пропускается. Тест: `actionKey` и `buildWeekPlan` дают одинаковый результат при двух вызовах (задачи 5, 6).
2. **Повторная генерация файлов посреди прохода не сдвигает даты.** `write-files.ts` сохраняет `startDate` из существующего `manifest.json`, если не передан `--new-start`. Тест на `resolveStartDate` (задача 2).
3. **Отказ команды посреди недели не прерывает остальные действия.** Отчёт перечисляет отказы. Код выхода 1 — только при неожиданных отказах. Тест на `summarizeRun` (задача 6).
4. **Нелокальный URL или нехватка переменных → отказ до первой записи**, и в тексте ошибки нет значений секретов. Тест на `readUpgEnv` (задача 4).
5. **Файл, открытый и пересохранённый в Excel, остаётся валидным:** заголовки совпадают с `templateHeaderRow`, числа записаны числами. Тест: каждая матрица проходит `validateSheet` без блокеров (задача 2).

---

## Карта файлов

| Файл | Ответственность |
|---|---|
| `scripts/upg/dataset.ts` | Описание проекта: системы, классы, ISO, катушки, стыки, опоры, фланцы, материалы, справочники для Excel, правила PWHT для формы |
| `scripts/upg/files.ts` | Чистые сборщики: тексты Spoolgen, матрицы Excel-импортов, листы общей книги |
| `scripts/upg/write-files.ts` | CLI `demo:project-files`: пишет `fixtures/demo-project/` |
| `scripts/upg/references.ts` | `UPG_REFERENCES` — набор справочников без Excel-импорта |
| `scripts/upg/setup-references.ts` | CLI `demo:project-setup`: фаза `references` и фаза `backdate-wps` |
| `scripts/upg/operator.ts` | Окружение, проверка локальности, вход оператора, поиск проекта, чтение файлов |
| `scripts/upg/import-spooling.ts` | Импорт пакета Spoolgen целиком, включая решения по ревизии |
| `scripts/upg/load-project.ts` | CLI `demo:project-load`: скриптовое повторение B1 для проверочного прогона |
| `scripts/upg/weeks.ts` | План недель: действия с днями, ручные отметки, ситуации покрытия |
| `scripts/upg/ids.ts` | Поиск id по номерам (катушки, стыки, фланцы, справочники, пакеты) |
| `scripts/upg/execute.ts` | Выполнение одного действия, ключи, итог прогона |
| `scripts/upg/run-week.ts` | CLI `demo:week` |
| `scripts/demo/supabase-demo-stand.ts` | Изменение: параметр `references` у `buildDemoReferencePlan` и метод `prepareProjectReferencesFor` |

---

### Task 1: Описание проекта UPG-1

**Files:**
- Create: `scripts/upg/dataset.ts`
- Test: `scripts/upg/dataset.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: `UPG_PROJECT`, `SHOP_SUBCONTRACTOR`, `FIELD_SUBCONTRACTOR`, `LINE_SERVICE`, `PWHT_THRESHOLD_MM`, `SERVICE_CLASSES`, `SYSTEMS`, `PDS_AREAS`, `ISO_GROUPS`, `THREAD_ISOS`, `REVISION_ISO`, `REVISION_WELD`, `REJECT_WELD`, `WPS_GAP_ISO`, `ERROR_ISO`, `OVERDUE_SPOOL`, `WELDING_PROCEDURES`, `WELDERS`, `NDE_IMPORT_RULES`, `PWHT_FORM_RULES`, `WPS_BY_MATERIAL`, типы `UpgIso`, `UpgSpool`, `UpgWeld`, `UpgMaterialLine`, `Cohort`, `ServiceClassCode`; функции `buildUpgIsos()`, `UPG_ISOS`, `revisionR1(iso)`, `errorIso()`, `isoNumberOf(seq)`, `heatNumber(cls, kind, dia)`, `materialLines(cls, dia)`, `isoByNumber(number)`, `spoolByNumber(number)`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/dataset.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  ERROR_ISO,
  ISO_GROUPS,
  OVERDUE_SPOOL,
  PWHT_FORM_RULES,
  PWHT_THRESHOLD_MM,
  REJECT_WELD,
  REVISION_ISO,
  REVISION_WELD,
  SERVICE_CLASSES,
  THREAD_ISOS,
  UPG_ISOS,
  WELDING_PROCEDURES,
  WPS_BY_MATERIAL,
  WPS_GAP_ISO,
  buildUpgIsos,
  errorIso,
  revisionR1,
  spoolByNumber,
} from "./dataset"

test("the project has about 40 ISOs, 100 spools and 500 welds", () => {
  const spools = UPG_ISOS.flatMap((iso) => iso.spools)
  const welds = spools.flatMap((spool) => spool.welds)
  assert.equal(UPG_ISOS.length, 40)
  assert.ok(spools.length >= 90 && spools.length <= 100, `spools: ${spools.length}`)
  assert.ok(welds.length >= 500 && welds.length <= 600, `welds: ${welds.length}`)
  assert.ok(welds.filter((weld) => weld.location === "field").length === spools.length)
})

test("the description is deterministic", () => {
  assert.deepEqual(buildUpgIsos(), buildUpgIsos())
})

test("numbers are unique across the project", () => {
  const spools = UPG_ISOS.flatMap((iso) => iso.spools)
  const unique = (values: string[]) => new Set(values).size === values.length
  assert.ok(unique(UPG_ISOS.map((iso) => iso.isoNumber)))
  assert.ok(unique(spools.map((spool) => spool.spoolNumber)))
  assert.ok(unique(spools.flatMap((spool) => spool.welds.map((weld) => weld.weldNumber))))
  assert.ok(unique(spools.map((spool) => spool.supportNumber)))
  assert.ok(unique(spools.map((spool) => spool.flangeNumber)))
})

test("one line number and one service class per ISO", () => {
  for (const iso of UPG_ISOS) {
    assert.match(iso.lineNumber, new RegExp(`-${iso.serviceClass}$`))
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(weld.thicknessMm > 0, `${weld.weldNumber} has a thickness`)
    }
  }
})

test("every test pack holds one system, one subsystem and one service class", () => {
  for (const group of ISO_GROUPS) {
    const isos = UPG_ISOS.filter((iso) => iso.testPack === group.testPack)
    assert.equal(isos.length, group.count)
    assert.equal(new Set(isos.map((iso) => `${iso.systemCode}|${iso.subsystemCode}|${iso.serviceClass}`)).size, 1)
  }
})

test("socket welds only on small bore, never on CS300, never in the field", () => {
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      if (weld.weldType !== "SW") continue
      assert.equal(weld.location, "shop")
      assert.notEqual(iso.serviceClass, "CS300")
      assert.equal(weld.diameterInch, 2)
    }
  }
})

test("the special ISOs and welds exist where the walkthrough expects them", () => {
  for (const number of THREAD_ISOS) {
    const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === number)
    assert.ok(iso?.thread, `${number} is a thread ISO`)
    assert.equal(iso?.testPack, "TP-100-01")
  }
  assert.equal(UPG_ISOS.filter((iso) => iso.thread).length, THREAD_ISOS.length)
  assert.ok(UPG_ISOS.find((iso) => iso.isoNumber === REVISION_ISO))
  assert.ok(spoolByNumber(OVERDUE_SPOOL))
  const rejected = UPG_ISOS.flatMap((iso) => iso.spools).flatMap((spool) => spool.welds).find((weld) => weld.weldNumber === REJECT_WELD)
  assert.equal(rejected?.location, "shop")
  assert.equal(UPG_ISOS.find((iso) => iso.isoNumber === ERROR_ISO), undefined, "the error ISO is not in the main package")
})

test("revision R1 adds exactly one shop weld to spool S1", () => {
  const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === REVISION_ISO)!
  const revised = revisionR1(iso)
  const before = iso.spools[0].welds.map((weld) => weld.weldNumber)
  const after = revised.spools[0].welds.map((weld) => weld.weldNumber)
  assert.deepEqual(after.filter((number) => !before.includes(number)), [REVISION_WELD])
  assert.deepEqual(revised.spools.slice(1), iso.spools.slice(1))
})

test("the error ISO uses a diameter no thickness rule covers", () => {
  const iso = errorIso()
  assert.equal(iso.isoNumber, ERROR_ISO)
  const diameters = iso.spools.flatMap((spool) => spool.welds.map((weld) => weld.diameterInch))
  for (const diameter of diameters) {
    assert.equal(SERVICE_CLASSES[iso.serviceClass].thicknessByDiameter[diameter], undefined)
  }
})

test("exactly one field weld falls outside every field WPS range", () => {
  const uncovered = UPG_ISOS.flatMap((iso) =>
    iso.spools.flatMap((spool) =>
      spool.welds
        .filter((weld) => weld.location === "field")
        .filter((weld) => {
          const wps = WELDING_PROCEDURES.find(
            (procedure) => procedure.code === WPS_BY_MATERIAL[SERVICE_CLASSES[iso.serviceClass].materialTypeCode].field,
          )!
          return weld.diameterInch < wps.diameterFrom || weld.diameterInch > wps.diameterTo
        })
        .map(() => iso.isoNumber),
    ),
  )
  assert.deepEqual(uncovered, [WPS_GAP_ISO])
})

test("CS300 welds at or above the PWHT threshold exist, and PWHT rules cover CS300 only", () => {
  const thick = UPG_ISOS.filter((iso) => iso.serviceClass === "CS300")
    .flatMap((iso) => iso.spools.flatMap((spool) => spool.welds))
    .filter((weld) => weld.thicknessMm >= PWHT_THRESHOLD_MM)
  assert.ok(thick.length > 0)
  assert.deepEqual([...new Set(PWHT_FORM_RULES.map((rule) => rule.serviceClass))], ["CS300"])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/dataset.test.ts`
Expected: FAIL — `Cannot find module './dataset'`.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/upg/dataset.ts
/**
 * UPG-1: a small gas treatment unit described as plain data.
 *
 * Pure and deterministic. The import files (files.ts), the referentials (references.ts) and the
 * weekly plan (weeks.ts) are all derived from this one description, so they cannot disagree
 * about a number.
 */

export const UPG_PROJECT = {
  activityCode: "UPG-1",
  projectTitle: "Установка подготовки газа УПГ-1",
  owner: "ТОО «Демо Газ»",
  contractor: "ТОО «Демо Монтаж»",
  contractNumber: "DM-2026-014",
  maxTransitTimeDays: 3,
} as const

export const SHOP_SUBCONTRACTOR = "FAB-A"
export const FIELD_SUBCONTRACTOR = "ERC-A"
export const LINE_SERVICE = "PROCESS"
/** CS300 welds at or above this wall thickness need PWHT. Entered by hand in the NDE matrix form. */
export const PWHT_THRESHOLD_MM = 12

export type ServiceClassCode = "CS150" | "CS300" | "SS150"
export type MaterialTypeCode = "CS" | "SS316"
export type Cohort = "A" | "B" | "C" | "D"
export type WeldLocation = "shop" | "field"

export interface ServiceClassSpec {
  readonly code: ServiceClassCode
  readonly description: string
  readonly materialTypeCode: MaterialTypeCode
  readonly flangeRating: "150#" | "300#"
  /** Wall thickness by nominal diameter, mm. Every diameter a weld uses must be listed. */
  readonly thicknessByDiameter: Readonly<Record<number, number>>
  /** Main-run diameters, cycled per ISO inside its group. */
  readonly mainDiameters: readonly number[]
  /** Small-bore branch welds are socket welds at this diameter; null when the class has none. */
  readonly branchDiameter: number | null
}

export const SERVICE_CLASSES: Readonly<Record<ServiceClassCode, ServiceClassSpec>> = {
  CS150: {
    code: "CS150",
    description: "Углеродистая сталь, 150#",
    materialTypeCode: "CS",
    flangeRating: "150#",
    thicknessByDiameter: { 2: 3.91, 3: 5.49, 4: 6.02, 6: 7.11, 8: 8.18, 12: 9.53 },
    mainDiameters: [4, 6, 8, 3],
    branchDiameter: 2,
  },
  CS300: {
    code: "CS300",
    description: "Углеродистая сталь, 300#, толстостенная",
    materialTypeCode: "CS",
    flangeRating: "300#",
    thicknessByDiameter: { 6: 10.97, 8: 12.7, 10: 15.09 },
    mainDiameters: [8, 10, 6],
    branchDiameter: null,
  },
  SS150: {
    code: "SS150",
    description: "Нержавеющая сталь 316, 150#",
    materialTypeCode: "SS316",
    flangeRating: "150#",
    thicknessByDiameter: { 2: 2.77, 3: 3.05, 4: 3.05, 6: 3.4 },
    mainDiameters: [3, 4, 6],
    branchDiameter: 2,
  },
}

export interface SystemSpec {
  readonly code: string
  readonly description: string
  readonly subsystems: readonly { readonly code: string; readonly description: string }[]
}

export const SYSTEMS: readonly SystemSpec[] = [
  {
    code: "100",
    description: "Входная сепарация",
    subsystems: [
      { code: "100-01", description: "Сепаратор С-101" },
      { code: "100-02", description: "Узел замера газа" },
    ],
  },
  {
    code: "200",
    description: "Осушка газа",
    subsystems: [
      { code: "200-01", description: "Абсорбер К-201" },
      { code: "200-02", description: "Регенерация гликоля" },
    ],
  },
  {
    code: "300",
    description: "Топливный газ и факел",
    subsystems: [
      { code: "300-01", description: "Топливный газ" },
      { code: "300-02", description: "Факельный коллектор" },
    ],
  },
]

export const PDS_AREAS = [
  { code: "A-100", description: "Площадка входной сепарации" },
  { code: "A-200", description: "Площадка осушки газа" },
  { code: "A-300", description: "Площадка топливного газа и факела" },
] as const

export interface IsoGroup {
  readonly cohort: Cohort
  readonly systemCode: string
  readonly subsystemCode: string
  readonly serviceClass: ServiceClassCode
  readonly pdsArea: string
  readonly firstSeq: number
  readonly count: number
  readonly testPack: string
  readonly testPressureBar: number
  readonly priority: string
}

/**
 * Cohorts set the pace: A finishes the whole process, B ends tested or ready for test, C stops
 * mid-erection, D never leaves the shop. weeks.ts reads the cohort, not the ISO number.
 */
export const ISO_GROUPS: readonly IsoGroup[] = [
  { cohort: "A", systemCode: "100", subsystemCode: "100-01", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1001, count: 5, testPack: "TP-100-01", testPressureBar: 29.5, priority: "Высокий" },
  { cohort: "A", systemCode: "100", subsystemCode: "100-02", serviceClass: "CS150", pdsArea: "A-100", firstSeq: 1006, count: 5, testPack: "TP-100-02", testPressureBar: 29.5, priority: "Высокий" },
  { cohort: "B", systemCode: "200", subsystemCode: "200-01", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2001, count: 6, testPack: "TP-200-01", testPressureBar: 76.6, priority: "Обычный" },
  { cohort: "B", systemCode: "200", subsystemCode: "200-02", serviceClass: "CS300", pdsArea: "A-200", firstSeq: 2007, count: 6, testPack: "TP-200-02", testPressureBar: 76.6, priority: "Обычный" },
  { cohort: "C", systemCode: "300", subsystemCode: "300-01", serviceClass: "SS150", pdsArea: "A-300", firstSeq: 3001, count: 10, testPack: "TP-300-01", testPressureBar: 27.6, priority: "Обычный" },
  { cohort: "D", systemCode: "300", subsystemCode: "300-02", serviceClass: "CS150", pdsArea: "A-300", firstSeq: 3011, count: 8, testPack: "TP-300-02", testPressureBar: 29.5, priority: "Низкий" },
]

/** Recorded by hand in the UI, in step with the weeks. Part of TP-100-01. */
export const THREAD_ISOS: readonly string[] = ["UPG-100-1001", "UPG-100-1002"]
/** Gets revision R1 in week 3, while its spools are in the shop. */
export const REVISION_ISO = "UPG-200-2005"
export const REVISION_WELD = "2005-S1-W09"
/** Rejected in the first shop NDE round; produces a repair and tracers. */
export const REJECT_WELD = "1003-S1-W02"
/** Its S1 field weld is 12" and no field WPS covers it: an import warning, never welded. */
export const WPS_GAP_ISO = "UPG-300-3018"
/** Only in the error file set: CS150 at 14" has no thickness rule, so the server blocks it. */
export const ERROR_ISO = "UPG-300-3099"
/** Leaves the laydown and never arrives on site: a Transit Out alert. */
export const OVERDUE_SPOOL = "UPG-300-3009-S1"

export interface UpgWeld {
  readonly weldNumber: string
  readonly weldType: "BW" | "SW"
  readonly location: WeldLocation
  readonly diameterInch: number
  readonly thicknessMm: number
}

export interface UpgMaterialLine {
  readonly identCode: string
  readonly description: string
  readonly quantity: string
  readonly unit: "M" | "EA"
  readonly traceNumber: string
}

export interface UpgSpool {
  readonly spoolNumber: string
  readonly weightKg: string
  readonly welds: readonly UpgWeld[]
  readonly supportNumber: string
  readonly supportType: string
  readonly flangeNumber: string
  readonly boltSize: string
  readonly boltQuantity: number
  readonly materials: readonly UpgMaterialLine[]
}

export interface UpgIso {
  readonly isoNumber: string
  readonly revision: string
  readonly seq: number
  readonly cohort: Cohort
  /** Position inside its ISO group, from 0. weeks.ts staggers and caps by it. */
  readonly groupIndex: number
  readonly systemCode: string
  readonly subsystemCode: string
  readonly serviceClass: ServiceClassCode
  readonly pdsArea: string
  readonly lineNumber: string
  readonly mainDiameter: number
  readonly testPack: string
  readonly thread: boolean
  readonly spools: readonly UpgSpool[]
}

export interface WeldingProcedureSpec {
  readonly code: string
  readonly subcontractor: string
  readonly materialType: MaterialTypeCode
  readonly diameterFrom: number
  readonly diameterTo: number
  readonly thicknessFrom: number
  readonly thicknessTo: number
}

export const WELDING_PROCEDURES: readonly WeldingProcedureSpec[] = [
  { code: "WPS-CS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 24, thicknessFrom: 2, thicknessTo: 40 },
  { code: "WPS-SS-01", subcontractor: SHOP_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
  { code: "WPS-CS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "CS", diameterFrom: 0.5, diameterTo: 10, thicknessFrom: 2, thicknessTo: 40 },
  { code: "WPS-SS-F01", subcontractor: FIELD_SUBCONTRACTOR, materialType: "SS316", diameterFrom: 0.5, diameterTo: 12, thicknessFrom: 1, thicknessTo: 20 },
]

export const WPS_BY_MATERIAL: Readonly<Record<MaterialTypeCode, { readonly shop: string; readonly field: string }>> = {
  CS: { shop: "WPS-CS-01", field: "WPS-CS-F01" },
  SS316: { shop: "WPS-SS-01", field: "WPS-SS-F01" },
}

export interface WelderSpec {
  readonly code: string
  readonly name: string
  readonly subcontractor: string
  readonly wpsCodes: readonly string[]
}

export const WELDERS: readonly WelderSpec[] = [
  { code: "S-01", name: "Ахметов Ерлан", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-02", name: "Ким Виктор", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-03", name: "Сейткали Арман", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
  { code: "S-04", name: "Петров Игорь", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01"] },
  { code: "S-05", name: "Нурланов Данияр", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-CS-01", "WPS-SS-01"] },
  { code: "S-06", name: "Иванов Сергей", subcontractor: SHOP_SUBCONTRACTOR, wpsCodes: ["WPS-SS-01"] },
  { code: "F-01", name: "Жумабаев Талгат", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
  { code: "F-02", name: "Смирнов Олег", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01"] },
  { code: "F-03", name: "Каримов Руслан", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-CS-F01", "WPS-SS-F01"] },
  { code: "F-04", name: "Ли Андрей", subcontractor: FIELD_SUBCONTRACTOR, wpsCodes: ["WPS-SS-F01"] },
]

export interface NdeRuleSpec {
  readonly serviceClass: ServiceClassCode
  readonly weldType: "BW" | "SW"
  readonly location: WeldLocation
  readonly rt: number
  readonly mt: number
  readonly pt: number
}

/** Rows of the NDE matrix Excel import. CS300 is absent: it carries PWHT, see PWHT_FORM_RULES. */
export const NDE_IMPORT_RULES: readonly NdeRuleSpec[] = [
  { serviceClass: "CS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "CS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "CS150", weldType: "SW", location: "shop", rt: 0, mt: 10, pt: 0 },
  { serviceClass: "SS150", weldType: "BW", location: "shop", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "SS150", weldType: "BW", location: "field", rt: 10, mt: 0, pt: 0 },
  { serviceClass: "SS150", weldType: "SW", location: "shop", rt: 0, mt: 0, pt: 10 },
]

/**
 * The NDE matrix import has no PWHT columns (modules/imports/domain/import-types.json), so these
 * two rules are entered by hand in Project Referential → NDE matrix. load-project.ts creates them
 * through the same repository function the form uses.
 */
export const PWHT_FORM_RULES: readonly (NdeRuleSpec & { readonly pwhtThresholdMm: number })[] = [
  { serviceClass: "CS300", weldType: "BW", location: "shop", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
  { serviceClass: "CS300", weldType: "BW", location: "field", rt: 100, mt: 0, pt: 0, pwhtThresholdMm: PWHT_THRESHOLD_MM },
]

const BOLT_SIZE: Readonly<Record<number, string>> = {
  2: '5/8"', 3: '5/8"', 4: '5/8"', 6: '3/4"', 8: '3/4"', 10: '7/8"', 12: '7/8"', 14: '1"',
}
const SUPPORT_TYPES = ["SHOE", "GUIDE", "ANCHOR"] as const

const boltQuantity = (diameter: number): number => (diameter <= 3 ? 4 : diameter <= 8 ? 8 : 12)
const pad2 = (value: number): string => String(value).padStart(2, "0")

export const isoNumberOf = (seq: number): string => `UPG-${Math.floor(seq / 1000)}00-${seq}`

export const heatNumber = (serviceClass: ServiceClassCode, kind: "PIPE" | "ELB" | "FLG", diameter: number): string =>
  `H-${serviceClass}-${kind}-${diameter}`

export function materialLines(serviceClass: ServiceClassCode, diameter: number): UpgMaterialLine[] {
  const rating = SERVICE_CLASSES[serviceClass].flangeRating
  return [
    { identCode: `${serviceClass}-PIPE-${diameter}`, description: `Труба ${diameter}" ${serviceClass}`, quantity: "6", unit: "M", traceNumber: heatNumber(serviceClass, "PIPE", diameter) },
    { identCode: `${serviceClass}-ELB-${diameter}`, description: `Отвод 90° ${diameter}" ${serviceClass}`, quantity: "2", unit: "EA", traceNumber: heatNumber(serviceClass, "ELB", diameter) },
    { identCode: `${serviceClass}-FLG-${diameter}`, description: `Фланец WN ${diameter}" ${rating}`, quantity: "1", unit: "EA", traceNumber: heatNumber(serviceClass, "FLG", diameter) },
  ]
}

interface WeldContext {
  readonly isoNumber: string
  readonly seq: number
  readonly serviceClass: ServiceClassCode
  readonly mainDiameter: number
}

function weldsFor(iso: WeldContext, spoolIndex: number, globalIndex: number): UpgWeld[] {
  const spec = SERVICE_CLASSES[iso.serviceClass]
  const shopCount = 4 + ((globalIndex + spoolIndex) % 3)
  const welds: UpgWeld[] = []
  for (let ordinal = 1; ordinal <= shopCount; ordinal += 1) {
    const branch = ordinal === 3 && spec.branchDiameter !== null
    const diameter = branch ? (spec.branchDiameter as number) : iso.mainDiameter
    welds.push({
      weldNumber: `${iso.seq}-S${spoolIndex + 1}-W${pad2(ordinal)}`,
      weldType: branch ? "SW" : "BW",
      location: "shop",
      diameterInch: diameter,
      thicknessMm: spec.thicknessByDiameter[diameter],
    })
  }
  const fieldDiameter = iso.isoNumber === WPS_GAP_ISO && spoolIndex === 0 ? 12 : iso.mainDiameter
  welds.push({
    weldNumber: `${iso.seq}-S${spoolIndex + 1}-FW1`,
    weldType: "BW",
    location: "field",
    diameterInch: fieldDiameter,
    thicknessMm: spec.thicknessByDiameter[fieldDiameter],
  })
  return welds
}

function spoolsFor(iso: WeldContext, globalIndex: number): UpgSpool[] {
  const spoolCount = globalIndex % 3 === 0 ? 3 : 2
  const spools: UpgSpool[] = []
  for (let index = 0; index < spoolCount; index += 1) {
    spools.push({
      spoolNumber: `${iso.isoNumber}-S${index + 1}`,
      weightKg: (80 + iso.mainDiameter * 12 + index * 7).toFixed(1),
      welds: weldsFor(iso, index, globalIndex),
      supportNumber: `${iso.seq}-S${index + 1}-SUP1`,
      supportType: SUPPORT_TYPES[(globalIndex + index) % SUPPORT_TYPES.length],
      flangeNumber: `${iso.seq}-S${index + 1}-F1`,
      boltSize: BOLT_SIZE[iso.mainDiameter],
      boltQuantity: boltQuantity(iso.mainDiameter),
      materials: materialLines(iso.serviceClass, iso.mainDiameter),
    })
  }
  return spools
}

export function buildUpgIsos(): UpgIso[] {
  const isos: UpgIso[] = []
  let globalIndex = 0
  for (const group of ISO_GROUPS) {
    const spec = SERVICE_CLASSES[group.serviceClass]
    for (let groupIndex = 0; groupIndex < group.count; groupIndex += 1) {
      const seq = group.firstSeq + groupIndex
      const isoNumber = isoNumberOf(seq)
      const mainDiameter = spec.mainDiameters[groupIndex % spec.mainDiameters.length]
      const context: WeldContext = { isoNumber, seq, serviceClass: group.serviceClass, mainDiameter }
      isos.push({
        isoNumber,
        revision: "R0",
        seq,
        cohort: group.cohort,
        groupIndex,
        systemCode: group.systemCode,
        subsystemCode: group.subsystemCode,
        serviceClass: group.serviceClass,
        pdsArea: group.pdsArea,
        lineNumber: `${mainDiameter}-NG-${seq}-${group.serviceClass}`,
        mainDiameter,
        testPack: group.testPack,
        thread: THREAD_ISOS.includes(isoNumber),
        spools: spoolsFor(context, globalIndex),
      })
      globalIndex += 1
    }
  }
  return isos
}

export const UPG_ISOS: readonly UpgIso[] = buildUpgIsos()

export function isoByNumber(isoNumber: string): UpgIso | undefined {
  return UPG_ISOS.find((iso) => iso.isoNumber === isoNumber)
}

export function spoolByNumber(spoolNumber: string): { iso: UpgIso; spool: UpgSpool } | undefined {
  for (const iso of UPG_ISOS) {
    const spool = iso.spools.find((candidate) => candidate.spoolNumber === spoolNumber)
    if (spool) return { iso, spool }
  }
  return undefined
}

/** Revision R1 of REVISION_ISO: spool S1 gains one shop butt weld. Nothing else changes. */
export function revisionR1(iso: UpgIso): UpgIso {
  const [first, ...rest] = iso.spools
  const spec = SERVICE_CLASSES[iso.serviceClass]
  const added: UpgWeld = {
    weldNumber: REVISION_WELD,
    weldType: "BW",
    location: "shop",
    diameterInch: iso.mainDiameter,
    thicknessMm: spec.thicknessByDiameter[iso.mainDiameter],
  }
  const shop = first.welds.filter((weld) => weld.location === "shop")
  const field = first.welds.filter((weld) => weld.location === "field")
  return { ...iso, revision: "R1", spools: [{ ...first, welds: [...shop, added, ...field] }, ...rest] }
}

/** One ISO, one spool, CS150 at 14": no thickness rule covers it, so the server blocks the job. */
export function errorIso(): UpgIso {
  const seq = 3099
  const spoolNumber = `${ERROR_ISO}-S1`
  const weld = (ordinal: number, location: WeldLocation): UpgWeld => ({
    weldNumber: `${seq}-S1-${location === "shop" ? `W${pad2(ordinal)}` : "FW1"}`,
    weldType: "BW",
    location,
    diameterInch: 14,
    thicknessMm: 11.13,
  })
  return {
    isoNumber: ERROR_ISO,
    revision: "R0",
    seq,
    cohort: "D",
    groupIndex: 0,
    systemCode: "300",
    subsystemCode: "300-02",
    serviceClass: "CS150",
    pdsArea: "A-300",
    lineNumber: `14-NG-${seq}-CS150`,
    mainDiameter: 14,
    testPack: "TP-300-02",
    thread: false,
    spools: [
      {
        spoolNumber,
        weightKg: "260.0",
        welds: [weld(1, "shop"), weld(2, "shop"), weld(1, "field")],
        supportNumber: `${seq}-S1-SUP1`,
        supportType: "SHOE",
        flangeNumber: `${seq}-S1-F1`,
        boltSize: BOLT_SIZE[14],
        boltQuantity: 12,
        materials: materialLines("CS150", 14),
      },
    ],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/upg/dataset.test.ts`
Expected: PASS, все 11 тестов. Если тест объёма падает (катушек или стыков вне диапазона), поправить формулы `shopCount` или `spoolCount` так, чтобы диапазоны выполнились, а не расширять диапазоны.

- [ ] **Step 5: Commit**

```bash
git add scripts/upg/dataset.ts scripts/upg/dataset.test.ts
git commit -m "feat(demo): UPG-1 project description for the manual-driven walkthrough"
```

---

### Task 2: Файлы проекта

**Files:**
- Create: `scripts/upg/files.ts`, `scripts/upg/write-files.ts`
- Test: `scripts/upg/files.test.ts`
- Create (генерируется): `fixtures/demo-project/**`
- Modify: `package.json` — скрипт `"demo:project-files": "tsx scripts/upg/write-files.ts"`

**Interfaces:**
- Consumes: всё из задачи 1; `templateHeaderRow`, `ImportType` из `modules/imports/domain/import-type.ts`; `validateSheet` из `modules/imports/application/create-import.ts`; `buildSpoolgenSubmission` из `modules/engineering/application/import-spooling.ts`.
- Produces:
  - `spoolgenFiles(isos: readonly UpgIso[]): SpoolgenTexts`, где `type SpoolgenTexts = { weld: string; trace: string; supp: string; bolt: string }`;
  - `revisionFiles(): SpoolgenTexts`;
  - `errorFiles(): { weld: string }`;
  - `importSheets(startDate: string): ImportSheet[]`, где `interface ImportSheet { importType: ImportType; fileName: string; title: string; matrix: (string | number)[][] }`;
  - `workbookSheets(startDate: string): { name: string; matrix: (string | number)[][] }[]`;
  - `addDays(isoDate: string, days: number): string`;
  - `resolveStartDate(existing: { startDate: string } | null, today: string, newStart: boolean): string`;
  - `UPG_FIXTURE_DIR = "fixtures/demo-project"`;
  - `fixtures/demo-project/manifest.json`: `{ "generatedOn": "YYYY-MM-DD", "startDate": "YYYY-MM-DD" }`.

Раскладка `fixtures/demo-project/`:

```
manifest.json
README.md                 порядок загрузки (текст ниже)
UPG-1.xlsx                общая книга, все листы
spooling/weld.txt trace.txt bolt.txt supp.txt      основной пакет R0
revision/weld.txt trace.txt bolt.txt supp.txt      только REVISION_ISO, R1
error/weld.txt                                      только ERROR_ISO
imports/01-pml.xlsx 02-wps.xlsx 03-welders.xlsx 04-thickness.xlsx 05-nde-matrix.xlsx 06-test-packs.xlsx
```

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/files.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { validateSheet } from "../../modules/imports/application/create-import"
import { templateHeaderRow } from "../../modules/imports/domain/import-type"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { ERROR_ISO, PWHT_FORM_RULES, UPG_ISOS, WPS_GAP_ISO } from "./dataset"
import { addDays, errorFiles, importSheets, resolveStartDate, revisionFiles, spoolgenFiles, workbookSheets } from "./files"

const START = "2026-08-14"

test("the main SpoolGen package parses with zero client blockers", () => {
  const submission = buildSpoolgenSubmission(spoolgenFiles(UPG_ISOS))
  assert.equal(submission.summary.blockerCount, 0, JSON.stringify(submission.issues.filter((issue) => issue.severity === "blocker").slice(0, 3)))
  const weldRows = spoolgenFiles(UPG_ISOS).weld.trim().split("\n").length - 1
  assert.equal(weldRows, UPG_ISOS.flatMap((iso) => iso.spools.flatMap((spool) => spool.welds)).length)
})

test("the revision and error packages parse on the client", () => {
  assert.equal(buildSpoolgenSubmission(revisionFiles()).summary.blockerCount, 0)
  const error = errorFiles()
  assert.match(error.weld, new RegExp(ERROR_ISO))
  assert.equal(buildSpoolgenSubmission(error).summary.blockerCount, 0, "the error is server-side: no thickness rule")
})

test("every import sheet uses the app template header and validates without blockers", () => {
  for (const sheet of importSheets(START)) {
    assert.deepEqual(sheet.matrix[0], templateHeaderRow(sheet.importType), sheet.fileName)
    const outcome = validateSheet(sheet.importType, sheet.matrix)
    const blockers = outcome.issues.filter((issue) => issue.severity === "blocker")
    assert.equal(blockers.length, 0, `${sheet.fileName}: ${JSON.stringify(blockers.slice(0, 3))}`)
  }
})

test("the six import files are numbered in load order", () => {
  assert.deepEqual(importSheets(START).map((sheet) => sheet.fileName), [
    "01-pml.xlsx", "02-wps.xlsx", "03-welders.xlsx", "04-thickness.xlsx", "05-nde-matrix.xlsx", "06-test-packs.xlsx",
  ])
})

test("every trace number in the package exists in the PML file", () => {
  const pml = importSheets(START).find((sheet) => sheet.importType === "piping_material_list")!
  const traces = new Set(pml.matrix.slice(1).map((row) => String(row[2])))
  for (const line of spoolgenFiles(UPG_ISOS).trace.trim().split("\n").slice(1)) {
    assert.ok(traces.has(line.split("\t")[6]), line)
  }
})

test("every weld combination is covered by the NDE import or the PWHT form rules", () => {
  const nde = importSheets(START).find((sheet) => sheet.importType === "nde_matrix")!
  const covered = new Set(nde.matrix.slice(1).map((row) => `${row[0]}|${row[1]}|${row[2]}`))
  for (const rule of PWHT_FORM_RULES) covered.add(`${rule.serviceClass}|${rule.weldType}|${rule.location}`)
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(covered.has(`${iso.serviceClass}|${weld.weldType}|${weld.location}`), weld.weldNumber)
    }
  }
})

test("every class and diameter in the main package has a thickness rule; the error ISO has none", () => {
  const thickness = importSheets(START).find((sheet) => sheet.importType === "thickness_flange")!
  const rules = new Set(thickness.matrix.slice(1).map((row) => `${row[0]}|${row[1]}`))
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(rules.has(`${iso.serviceClass}|${weld.diameterInch}`), weld.weldNumber)
    }
  }
  assert.ok(!rules.has("CS150|14"))
  assert.ok(UPG_ISOS.some((iso) => iso.isoNumber === WPS_GAP_ISO))
})

test("the composition lists every spool once, R0, with consistent pack metadata and dates in range", () => {
  const composition = importSheets(START).find((sheet) => sheet.importType === "test_pack_composition")!
  const spools = composition.matrix.slice(1).map((row) => String(row[15]))
  assert.equal(new Set(spools).size, spools.length)
  assert.equal(spools.length, UPG_ISOS.flatMap((iso) => iso.spools).length)
  for (const row of composition.matrix.slice(1)) {
    assert.equal(row[6], addDays(START, 42))
    assert.equal(row[7], addDays(START, 55))
  }
})

test("the workbook opens with README and holds every import sheet and the four SpoolGen sheets", () => {
  const names = workbookSheets(START).map((sheet) => sheet.name)
  assert.equal(names[0], "README")
  for (const expected of ["Ввести вручную", "PML", "WPS", "Сварщики", "Толщины", "NDE", "WELD", "TRACE", "BOLT", "SUPP", "Тест-пакеты"]) {
    assert.ok(names.includes(expected), expected)
  }
})

test("regenerating keeps an existing start date unless a new start is asked for", () => {
  assert.equal(resolveStartDate({ startDate: "2026-08-01" }, "2026-10-09", false), "2026-08-01")
  assert.equal(resolveStartDate({ startDate: "2026-08-01" }, "2026-10-09", true), "2026-08-14")
  assert.equal(resolveStartDate(null, "2026-10-09", false), "2026-08-14")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/files.test.ts`
Expected: FAIL — `Cannot find module './files'`.

- [ ] **Step 3: Write the implementation**

Колонки Spoolgen — те же, что в `buildShowcaseSpoolgenFiles` (`scripts/demo/showcase-dataset.ts:313-316`). Порядок колонок Excel-шаблонов — из `templateHeaderRow`. Матрица строится по ключам колонок из `modules/imports/domain/import-types.json`. Состав test pack — одна строка на катушку.

```ts
// scripts/upg/files.ts
/**
 * Pure builders for the UPG-1 files: the four SpoolGen texts the manual prescribes (§13.1), one
 * Excel matrix per import (the import reads only the first sheet), and the sheets of the master
 * workbook a person opens in Excel.
 */
import { templateHeaderRow, type ImportType } from "../../modules/imports/domain/import-type"
import {
  ERROR_ISO,
  ISO_GROUPS,
  LINE_SERVICE,
  NDE_IMPORT_RULES,
  PDS_AREAS,
  PWHT_FORM_RULES,
  REVISION_ISO,
  SERVICE_CLASSES,
  SYSTEMS,
  UPG_ISOS,
  WELDERS,
  WELDING_PROCEDURES,
  errorIso,
  revisionR1,
  type UpgIso,
} from "./dataset"

export const UPG_FIXTURE_DIR = "fixtures/demo-project"
export const START_OFFSET_DAYS = 56

export type Cell = string | number
export type SpoolgenTexts = { weld: string; trace: string; supp: string; bolt: string }

export interface ImportSheet {
  readonly importType: ImportType
  readonly fileName: string
  readonly title: string
  readonly matrix: Cell[][]
}

const WELD_HEADER = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "LINE_NUMBER", "SPOOL_NUMBER", "SPOOL_WEIGHT_KG", "MATERIAL_CLASS", "WELD_NUMBER", "WELD_TYPE", "WELD_LOCATION", "DIAMETER_INCH", "THICKNESS_MM"]
const TRACE_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE", "DESCRIPTION", "QUANTITY", "UNIT", "TRACE_NUMBER"]
const SUPP_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "SUPPORT_NUMBER", "SUPPORT_TYPE", "QUANTITY"]
const BOLT_HEADER = ["ISO_NUMBER", "SPOOL_NUMBER", "FLANGE_NUMBER", "FLANGE_RATING", "DIAMETER_INCH", "BOLT_SIZE", "BOLT_QUANTITY", "JOINT_TYPE"]

export function addDays(isoDate: string, days: number): string {
  const value = new Date(`${isoDate}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function resolveStartDate(existing: { startDate: string } | null, today: string, newStart: boolean): string {
  if (existing && !newStart) return existing.startDate
  return addDays(today, -START_OFFSET_DAYS)
}

function spoolgenMatrices(isos: readonly UpgIso[]): Record<keyof SpoolgenTexts, Cell[][]> {
  const weld: Cell[][] = [WELD_HEADER]
  const trace: Cell[][] = [TRACE_HEADER]
  const supp: Cell[][] = [SUPP_HEADER]
  const bolt: Cell[][] = [BOLT_HEADER]
  for (const iso of isos) {
    const spec = SERVICE_CLASSES[iso.serviceClass]
    for (const spool of iso.spools) {
      for (const w of spool.welds) {
        weld.push([iso.isoNumber, iso.revision, iso.pdsArea, iso.serviceClass, iso.lineNumber, spool.spoolNumber, spool.weightKg, iso.serviceClass, w.weldNumber, w.weldType, w.location, w.diameterInch, w.thicknessMm])
      }
      for (const line of spool.materials) {
        trace.push([iso.isoNumber, spool.spoolNumber, line.identCode, line.description, line.quantity, line.unit, line.traceNumber])
      }
      supp.push([iso.isoNumber, spool.spoolNumber, spool.supportNumber, spool.supportType, "1"])
      bolt.push([iso.isoNumber, spool.spoolNumber, spool.flangeNumber, spec.flangeRating, iso.mainDiameter, spool.boltSize, spool.boltQuantity, "Flange"])
    }
  }
  return { weld, trace, supp, bolt }
}

const toText = (matrix: Cell[][]): string => matrix.map((row) => row.join("\t")).join("\n") + "\n"

export function spoolgenFiles(isos: readonly UpgIso[]): SpoolgenTexts {
  const m = spoolgenMatrices(isos)
  return { weld: toText(m.weld), trace: toText(m.trace), supp: toText(m.supp), bolt: toText(m.bolt) }
}

export function revisionFiles(): SpoolgenTexts {
  const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === REVISION_ISO)
  if (!iso) throw new Error(`${REVISION_ISO} is missing from the dataset.`)
  return spoolgenFiles([revisionR1(iso)])
}

export function errorFiles(): { weld: string } {
  return { weld: spoolgenFiles([errorIso()]).weld }
}

function pmlMatrix(): Cell[][] {
  const seen = new Map<string, Cell[]>()
  let receipt = 1
  for (const iso of UPG_ISOS) {
    for (const line of iso.spools.flatMap((spool) => spool.materials)) {
      const key = `${line.identCode}|${line.traceNumber}`
      if (seen.has(key)) continue
      seen.set(key, [`MRR-UPG-${String(receipt).padStart(3, "0")}`, line.identCode, line.traceNumber])
      receipt += 1
    }
  }
  return [templateHeaderRow("piping_material_list"), ...seen.values()]
}

function wpsMatrix(): Cell[][] {
  return [
    templateHeaderRow("welding_procedure"),
    ...WELDING_PROCEDURES.map((wps) => [wps.code, wps.subcontractor, wps.materialType, wps.diameterFrom, wps.diameterTo, wps.thicknessFrom, wps.thicknessTo]),
  ]
}

function weldersMatrix(): Cell[][] {
  return [
    templateHeaderRow("welder_qualification"),
    ...WELDERS.map((welder) => [welder.code, welder.name, welder.subcontractor, welder.wpsCodes.join(",")]),
  ]
}

function thicknessMatrix(): Cell[][] {
  const rows: Cell[][] = []
  for (const spec of Object.values(SERVICE_CLASSES)) {
    for (const [diameter, thickness] of Object.entries(spec.thicknessByDiameter)) {
      rows.push([spec.code, Number(diameter), thickness, spec.flangeRating])
    }
  }
  return [templateHeaderRow("thickness_flange"), ...rows]
}

function ndeMatrix(): Cell[][] {
  // Column order: Service Class, Weld Type, Weld Location, RT %, UT %, MT %, PT %, PMI %, HT %.
  return [
    templateHeaderRow("nde_matrix"),
    ...NDE_IMPORT_RULES.map((rule) => [rule.serviceClass, rule.weldType, rule.location, rule.rt, 0, rule.mt, rule.pt, 0, 0]),
  ]
}

function compositionMatrix(startDate: string): Cell[][] {
  const rows: Cell[][] = []
  for (const group of ISO_GROUPS) {
    for (const iso of UPG_ISOS.filter((candidate) => candidate.testPack === group.testPack)) {
      for (const spool of iso.spools) {
        rows.push([
          group.systemCode, group.subsystemCode, group.testPack, 0, "H", group.testPressureBar,
          addDays(startDate, 42), addDays(startDate, 55), group.priority, group.serviceClass, LINE_SERVICE,
          2.5, group.pdsArea, iso.isoNumber, iso.revision, spool.spoolNumber, iso.revision,
        ])
      }
    }
  }
  return [templateHeaderRow("test_pack_composition"), ...rows]
}

export function importSheets(startDate: string): ImportSheet[] {
  return [
    { importType: "piping_material_list", fileName: "01-pml.xlsx", title: "PML", matrix: pmlMatrix() },
    { importType: "welding_procedure", fileName: "02-wps.xlsx", title: "WPS", matrix: wpsMatrix() },
    { importType: "welder_qualification", fileName: "03-welders.xlsx", title: "Сварщики", matrix: weldersMatrix() },
    { importType: "thickness_flange", fileName: "04-thickness.xlsx", title: "Толщины", matrix: thicknessMatrix() },
    { importType: "nde_matrix", fileName: "05-nde-matrix.xlsx", title: "NDE", matrix: ndeMatrix() },
    { importType: "test_pack_composition", fileName: "06-test-packs.xlsx", title: "Тест-пакеты", matrix: compositionMatrix(startDate) },
  ]
}

export const README_LINES: readonly string[] = [
  "Демо-проект UPG-1 — порядок загрузки",
  "1. Настройка проекта → Описание: создать проект UPG-1 (код, название, заказчик, подрядчик — лист «Ввести вручную»).",
  "2. В терминале: npm run demo:project-setup -- --project UPG-1 --phase references",
  "3. Настройка проекта → Импорт: файлы imports/01…05 по порядку.",
  "4. Справочники проекта → NDE-матрица: ввести руками два правила CS300 с PWHT (лист «Ввести вручную»).",
  "5. В терминале: npm run demo:project-setup -- --project UPG-1 --phase backdate-wps",
  "6. Спулинг → Импорт: сначала error/weld.txt (ожидаем блокер), затем spooling/weld, trace, bolt, supp.",
  "7. Test Packs → Импорт состава: imports/06-test-packs.xlsx.",
  "8. Неделя 3: Спулинг → Импорт revision/*.txt и решения по ревизии.",
]

function manualSheet(): Cell[][] {
  const rows: Cell[][] = [["Что", "Код", "Описание"]]
  rows.push(["Проект", "UPG-1", "Установка подготовки газа УПГ-1; заказчик ТОО «Демо Газ»; подрядчик ТОО «Демо Монтаж»; договор DM-2026-014; транзит 3 дня"])
  for (const area of PDS_AREAS) rows.push(["PDS-зона", area.code, area.description])
  for (const spec of Object.values(SERVICE_CLASSES)) rows.push(["Класс", spec.code, `${spec.description}; материал ${spec.materialTypeCode}`])
  for (const system of SYSTEMS) {
    rows.push(["Система", system.code, system.description])
    for (const sub of system.subsystems) rows.push(["Подсистема", sub.code, sub.description])
  }
  for (const rule of PWHT_FORM_RULES) {
    rows.push(["NDE-правило с PWHT (форма)", `${rule.serviceClass} ${rule.weldType} ${rule.location}`, `RT ${rule.rt}%, PWHT от ${rule.pwhtThresholdMm} мм`])
  }
  return rows
}

export function workbookSheets(startDate: string): { name: string; matrix: Cell[][] }[] {
  const spooling = spoolgenMatrices(UPG_ISOS)
  return [
    { name: "README", matrix: README_LINES.map((line) => [line]) },
    { name: "Ввести вручную", matrix: manualSheet() },
    ...importSheets(startDate).filter((sheet) => sheet.importType !== "test_pack_composition").map((sheet) => ({ name: sheet.title, matrix: sheet.matrix })),
    { name: "WELD", matrix: spooling.weld },
    { name: "TRACE", matrix: spooling.trace },
    { name: "BOLT", matrix: spooling.bolt },
    { name: "SUPP", matrix: spooling.supp },
    { name: "Тест-пакеты", matrix: compositionMatrix(startDate) },
  ]
}

export { ERROR_ISO }
```

```ts
// scripts/upg/write-files.ts
/**
 * Writes fixtures/demo-project. Keeps the start date of an existing manifest.json so that
 * regenerating mid-walkthrough never moves the project's past; pass --new-start to move it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import * as XLSX from "xlsx"

import { UPG_ISOS } from "./dataset"
import { README_LINES, UPG_FIXTURE_DIR, errorFiles, importSheets, resolveStartDate, revisionFiles, spoolgenFiles, workbookSheets, type Cell } from "./files"

function writeWorkbook(path: string, sheets: { name: string; matrix: Cell[][] }[]): void {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.matrix), sheet.name.slice(0, 31))
  }
  writeFileSync(path, XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer)
}

function writeTexts(dir: string, files: Record<string, string>): void {
  mkdirSync(dir, { recursive: true })
  for (const [role, text] of Object.entries(files)) writeFileSync(join(dir, `${role}.txt`), text)
}

function main(): void {
  const today = new Date().toISOString().slice(0, 10)
  const manifestPath = join(UPG_FIXTURE_DIR, "manifest.json")
  const existing = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { startDate: string }) : null
  const startDate = resolveStartDate(existing, today, process.argv.includes("--new-start"))

  mkdirSync(join(UPG_FIXTURE_DIR, "imports"), { recursive: true })
  writeTexts(join(UPG_FIXTURE_DIR, "spooling"), spoolgenFiles(UPG_ISOS))
  writeTexts(join(UPG_FIXTURE_DIR, "revision"), revisionFiles())
  writeTexts(join(UPG_FIXTURE_DIR, "error"), errorFiles())
  for (const sheet of importSheets(startDate)) {
    writeWorkbook(join(UPG_FIXTURE_DIR, "imports", sheet.fileName), [{ name: sheet.title, matrix: sheet.matrix }])
  }
  writeWorkbook(join(UPG_FIXTURE_DIR, "UPG-1.xlsx"), workbookSheets(startDate))
  writeFileSync(join(UPG_FIXTURE_DIR, "README.md"), `# ${README_LINES[0]}\n\n${README_LINES.slice(1).join("\n")}\n\nНачало проекта: ${startDate}.\n`)
  writeFileSync(manifestPath, JSON.stringify({ generatedOn: existing && !process.argv.includes("--new-start") ? (existing as { generatedOn?: string }).generatedOn ?? today : today, startDate }, null, 2) + "\n")
  console.log(`Wrote ${UPG_FIXTURE_DIR}: ${UPG_ISOS.length} ISOs, start ${startDate}.`)
}

main()
```

Добавить в `package.json` → `scripts`: `"demo:project-files": "tsx scripts/upg/write-files.ts"`.

- [ ] **Step 4: Run tests and generate the files**

Run: `node --import tsx --test scripts/upg/files.test.ts`
Expected: PASS, все 10 тестов.

Если тест «validates without blockers» падает, прочитать код issue:
- `INVALID_VALUE`, `INVALID_DATE` — исправить значение в матрице;
- блокер про отсутствующую колонку — сверить порядок значений строки с `templateHeaderRow` того же типа и переставить значения.

Шаблоны не менять.

Run: `npm run demo:project-files`
Expected: `Wrote fixtures/demo-project: 40 ISOs, start YYYY-MM-DD.`. Затем `ls -R fixtures/demo-project` показывает раскладку выше.

- [ ] **Step 5: Commit**

```bash
git add scripts/upg/files.ts scripts/upg/files.test.ts scripts/upg/write-files.ts fixtures/demo-project package.json
git commit -m "feat(demo): UPG-1 import files — SpoolGen package, revision, error set and Excel imports"
```

---

### Task 3: Справочники без Excel-импорта

**Files:**
- Modify: `scripts/demo/supabase-demo-stand.ts:1363-1376` (`buildDemoReferencePlan`), добавить метод в класс `SupabaseDemoStandCore` рядом с `prepareShowcaseProjectReferences` (около строки 2808).
- Create: `scripts/upg/references.ts`, `scripts/upg/setup-references.ts`
- Test: `scripts/upg/references.test.ts`
- Modify: `package.json` — `"demo:project-setup": "tsx --env-file-if-exists=.env.local scripts/upg/setup-references.ts"`

**Interfaces:**
- Consumes:
  - `DEMO_MANIFEST`, `DemoReferences` из `scripts/demo/manifest.ts`;
  - `createSupabaseDemoStandCore(url, serviceRoleKey)` и метод `resolveShowcasePrerequisiteIds()` из `scripts/demo/supabase-demo-stand.ts`;
  - из задачи 1: `PDS_AREAS`, `SERVICE_CLASSES`, `SYSTEMS`, `SHOP_SUBCONTRACTOR`, `FIELD_SUBCONTRACTOR`, `UPG_PROJECT`.
- Produces:
  - `UPG_REFERENCES: DemoReferences`;
  - `IMPORTED_FAMILIES` — шесть семейств, которые приходят из Excel;
  - `buildDemoReferencePlan(resolvedIds, preparedOn, targetProjectId?, references?)`;
  - `SupabaseDemoStandCore.prepareProjectReferencesFor(targetProjectId: string, references: DemoReferences, preparedOn: Date): Promise<void>`;
  - `prepareUpgReferences(env: { url: string; serviceRoleKey: string }, projectCode: string): Promise<void>`;
  - `backdateUpgWps(env: { url: string; serviceRoleKey: string }, projectCode: string, approvedOn: string): Promise<number>` — возвращает число обновлённых WPS.

Почему так:
- В интерфейсе нет форм для направлений линий, единиц давления, кодов RAL и правил покраски. Без них не пройдут покраска и состав пакетов.
- Остальные справочники — это десятки строк.

Сборщик тот же, что у `demo:prepare` и SHOWCASE-1. Семейства с пустым списком не трогаются, поэтому данные, импортированные из Excel, сборщик не перезапишет.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/references.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { DEMO_MANIFEST } from "../demo/manifest"
import { buildDemoReferencePlan } from "../demo/supabase-demo-stand"
import { PDS_AREAS, SERVICE_CLASSES, SYSTEMS } from "./dataset"
import { IMPORTED_FAMILIES, UPG_REFERENCES } from "./references"

const ids = {
  goldenProjectId: "00000000-0000-0000-0000-000000000001",
  membershipIds: {
    projectAdminA: "00000000-0000-0000-0000-000000000002",
    qcEditor: "00000000-0000-0000-0000-000000000003",
    ndeSubcontractor: "00000000-0000-0000-0000-000000000004",
  },
}
const UPG_ID = "00000000-0000-0000-0000-0000000000a1"

test("the families imported from Excel are empty, so the reconciler never touches them", () => {
  for (const family of IMPORTED_FAMILIES) {
    assert.deepEqual(UPG_REFERENCES[family], [], family)
  }
})

test("UPG-1 brings its own PDS areas, classes, systems, subsystems and the field subcontractor", () => {
  assert.deepEqual(UPG_REFERENCES.pdsAreas.map((area) => area.code), PDS_AREAS.map((area) => area.code))
  assert.deepEqual(UPG_REFERENCES.serviceClasses.map((row) => row.code).sort(), Object.keys(SERVICE_CLASSES).sort())
  assert.deepEqual(UPG_REFERENCES.systems.map((row) => row.code), SYSTEMS.map((system) => system.code))
  assert.equal(UPG_REFERENCES.subsystems.length, SYSTEMS.flatMap((system) => system.subsystems).length)
  assert.ok(UPG_REFERENCES.subcontractors.some((row) => row.code === "ERC-A"))
})

test("everything else is the manifest's, so teams, punch codes, locations and paint rules exist", () => {
  assert.deepEqual(UPG_REFERENCES.teams, DEMO_MANIFEST.references.teams)
  assert.deepEqual(UPG_REFERENCES.paintMatrixRules, DEMO_MANIFEST.references.paintMatrixRules)
  assert.deepEqual(UPG_REFERENCES.locations, DEMO_MANIFEST.references.locations)
})

test("the reference plan accepts a caller-supplied set and addresses it to the target project", () => {
  const plan = buildDemoReferencePlan(ids, new Date("2026-10-09T00:00:00Z"), UPG_ID, UPG_REFERENCES)
  // Plan entries are PlannedReference { key, status, insert, manifest }; the row is `insert`.
  const rows = Object.values(plan)
    .flat()
    .map((entry) => (entry && typeof entry === "object" && "insert" in entry ? (entry as { insert: unknown }).insert : entry)) as { project_id?: string }[]
  const projectRows = rows.filter((row) => row && typeof row === "object" && "project_id" in row)
  assert.ok(projectRows.length > 0)
  assert.ok(projectRows.filter((row) => row.project_id !== undefined).every((row) => row.project_id === UPG_ID || row.project_id === ids.goldenProjectId))
})

test("without the fourth argument the plan is unchanged", () => {
  const preparedOn = new Date("2026-10-09T00:00:00Z")
  assert.deepEqual(
    buildDemoReferencePlan(ids, preparedOn),
    buildDemoReferencePlan(ids, preparedOn, ids.goldenProjectId, DEMO_MANIFEST.references),
  )
})
```

Примечание к четвёртому тесту. Если в плане есть строки области доступа участников (`membership_*`), они по-прежнему привязаны к golden-проекту — это ожидаемо, такие строки метод не применяет. Поэтому проверка допускает оба id.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/references.test.ts`
Expected: FAIL — `Cannot find module './references'`.

- [ ] **Step 3: Make the reference plan accept a reference set**

В `scripts/demo/supabase-demo-stand.ts` у `buildDemoReferencePlan` добавить четвёртый параметр и убрать прямое чтение манифеста:

```ts
export function buildDemoReferencePlan(
  resolvedIds: DemoReferenceResolvedIds,
  preparedOn: Date,
  targetProjectId: string = resolvedIds.goldenProjectId,
  /**
   * Which referential values to plan. Defaults to the manifest, so every existing call site is
   * unchanged; UPG-1 passes its own set (scripts/upg/references.ts).
   */
  references: DemoReferences = DEMO_MANIFEST.references,
): DemoReferencePlan {
  assertDemoProgressWeightTotals()
  const projectId = targetProjectId
```

Строку `const references = DEMO_MANIFEST.references` удалить. Затем `grep -n "DEMO_MANIFEST.references" scripts/demo/supabase-demo-stand.ts` и пройти каждое вхождение **внутри тела `buildDemoReferencePlan` и функций, которые она вызывает**:
- если вхождение читает значения справочников для плана — заменить на `references` (вспомогательной функции передать параметром);
- вхождения вне этого пути не трогать.

Импорт `DemoReferences` добавить из `./manifest`, если его там ещё нет.

Метод класса — рядом с `prepareShowcaseProjectReferences`:

```ts
  /**
   * Referentials for a project an operator created in the UI (UPG-1), from a caller-supplied set.
   * Same reconciler as SHOWCASE-1. Families with no rows are dropped before reconciling, so rows
   * the operator imported from Excel are never reconciled away. Call
   * resolveShowcasePrerequisiteIds() first: the plan needs the golden ids.
   */
  async prepareProjectReferencesFor(
    targetProjectId: string,
    references: DemoReferences,
    preparedOn: Date,
  ): Promise<void> {
    const plan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
      targetProjectId,
      references,
    )
    await this.reconcileReferenceBatches(
      projectReferenceBatches({ ...plan, project_device_users: [] }).filter(
        (batch) => batch.rows.length > 0,
      ),
    )
  }
```

- [ ] **Step 4: Write `references.ts` and `setup-references.ts`**

```ts
// scripts/upg/references.ts
/**
 * UPG-1 referentials that have no Excel import. Starts from the manifest set (teams, punch codes,
 * locations, paint rules, line services, joint categories, progress weights…) and replaces what
 * makes the project its own. The six families that arrive from Excel are empty here on purpose.
 */
import { DEMO_MANIFEST, type DemoReferences } from "../demo/manifest"
import { FIELD_SUBCONTRACTOR, PDS_AREAS, SERVICE_CLASSES, SHOP_SUBCONTRACTOR, SYSTEMS } from "./dataset"

const base = DEMO_MANIFEST.references

export const IMPORTED_FAMILIES = [
  "pipingMaterialRecords",
  "weldingProcedures",
  "welders",
  "welderWpsQualifications",
  "thicknessFlangeRules",
  "ndeMatrixRules",
] as const satisfies readonly (keyof DemoReferences)[]

export const UPG_REFERENCES: DemoReferences = {
  ...base,
  subcontractors: [
    ...base.subcontractors,
    { key: FIELD_SUBCONTRACTOR, code: FIELD_SUBCONTRACTOR, description: "Монтажный субподрядчик", status: "active" },
  ],
  pdsAreas: PDS_AREAS.map((area) => ({
    ...base.pdsAreas[0],
    key: `PROCESS|${area.code}`,
    code: area.code,
    description: area.description,
    status: "active" as const,
    areaCode: "PROCESS",
    shopSubcontractorCode: SHOP_SUBCONTRACTOR,
    fieldSubcontractorCode: FIELD_SUBCONTRACTOR,
  })),
  serviceClasses: Object.values(SERVICE_CLASSES).map((spec) => ({
    ...base.serviceClasses[0],
    key: spec.code,
    code: spec.code,
    description: spec.description,
    status: "active" as const,
    materialTypeCode: spec.materialTypeCode,
  })),
  spoolingMaterialClasses: Object.values(SERVICE_CLASSES).map((spec) => ({
    ...base.spoolingMaterialClasses[0],
    key: spec.code,
    code: spec.code,
    description: spec.description,
    status: "active" as const,
    materialTypeCode: spec.materialTypeCode,
  })),
  systems: SYSTEMS.map((system) => ({ ...base.systems[0], key: system.code, code: system.code, description: system.description, status: "active" as const })),
  subsystems: SYSTEMS.flatMap((system) =>
    system.subsystems.map((sub) => ({ ...base.subsystems[0], key: `${system.code}|${sub.code}`, code: sub.code, description: sub.description, status: "active" as const, systemCode: system.code })),
  ),
  pipingMaterialRecords: [],
  weldingProcedures: [],
  welders: [],
  welderWpsQualifications: [],
  thicknessFlangeRules: [],
  ndeMatrixRules: [],
  deviceAssignments: [],
}
```

Если `typecheck` ругается на форму строк — например, у `subsystems` ключ называется иначе или `status` имеет другой тип — сверить с интерфейсами в `scripts/demo/manifest.ts:40-139` и поправить поля. Набор значений не менять.

```ts
// scripts/upg/setup-references.ts
/**
 * demo:project-setup — the referentials of an existing UPG-1 project.
 *
 *   --phase references    referentials without an Excel import (run after the project is created)
 *   --phase backdate-wps  WPS approval dates to before the project started (run after 02-wps.xlsx)
 *
 * The WPS import has no approval column and stamps today (apply_import_commands.sql:461), while
 * record_weld_progress refuses a weld dated before its WPS approval. A real contractor approves
 * procedures before work starts, so the date is set back to that; the walkthrough journal records
 * the missing column as a finding.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { assertLocalSupabaseTarget } from "../demo/local-target"
import { createSupabaseDemoStandCore } from "../demo/supabase-demo-stand"
import { UPG_PROJECT } from "./dataset"
import { UPG_FIXTURE_DIR, addDays } from "./files"
import { UPG_REFERENCES } from "./references"

export interface ServiceEnv {
  readonly url: string
  readonly serviceRoleKey: string
}

async function projectIdOf(env: ServiceEnv, projectCode: string): Promise<string> {
  const admin = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false } })
  const { data, error } = await admin.from("projects").select("id").eq("activity_code", projectCode).maybeSingle()
  if (error) throw new Error(`Reading project ${projectCode} failed: ${error.message}`)
  if (!data) throw new Error(`Project ${projectCode} does not exist. Create it in Project Setup → Definition first.`)
  return (data as { id: string }).id
}

export async function prepareUpgReferences(env: ServiceEnv, projectCode: string): Promise<void> {
  assertLocalSupabaseTarget(env.url)
  const projectId = await projectIdOf(env, projectCode)
  const core = createSupabaseDemoStandCore(env.url, env.serviceRoleKey)
  await core.resolveShowcasePrerequisiteIds()
  await core.prepareProjectReferencesFor(projectId, UPG_REFERENCES, new Date())
}

export async function backdateUpgWps(env: ServiceEnv, projectCode: string, approvedOn: string): Promise<number> {
  assertLocalSupabaseTarget(env.url)
  const projectId = await projectIdOf(env, projectCode)
  const admin = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false } })
  const { data, error } = await admin
    .from("project_welding_procedures")
    .update({ approved_on: approvedOn })
    .eq("project_id", projectId)
    .select("id")
  if (error) throw new Error(`Backdating WPS approval failed: ${error.message}`)
  return (data ?? []).length
}

export function startDateFromManifest(): string {
  return (JSON.parse(readFileSync(join(UPG_FIXTURE_DIR, "manifest.json"), "utf8")) as { startDate: string }).startDate
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<void> {
  const env = { url: process.env.SUPABASE_URL ?? "", serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" }
  if (!env.serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.")
  assertLocalSupabaseTarget(env.url)
  const projectCode = argument("--project") ?? UPG_PROJECT.activityCode
  const phase = argument("--phase")
  if (phase === "references") {
    await prepareUpgReferences(env, projectCode)
    console.log(`Referentials prepared for ${projectCode}.`)
  } else if (phase === "backdate-wps") {
    const approvedOn = addDays(startDateFromManifest(), -14)
    const count = await backdateUpgWps(env, projectCode, approvedOn)
    console.log(`${count} WPS of ${projectCode} approved on ${approvedOn}.`)
  } else {
    throw new Error("Use --phase references or --phase backdate-wps.")
  }
}

if (process.argv[1]?.endsWith("setup-references.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
```

Добавить в `package.json` → `scripts`: `"demo:project-setup": "tsx --env-file-if-exists=.env.local scripts/upg/setup-references.ts"`.

- [ ] **Step 5: Run tests and the existing demo tests**

Run: `node --import tsx --test scripts/upg/references.test.ts scripts/demo/*.test.ts scripts/*.test.ts`
Expected: PASS. Существующие тесты demo не должны измениться. Если упал тест `scripts/demo/*`, значит замена `DEMO_MANIFEST.references` задела лишнее — вернуть такое вхождение.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/demo/supabase-demo-stand.ts scripts/upg/references.ts scripts/upg/references.test.ts scripts/upg/setup-references.ts package.json
git commit -m "feat(demo): UPG-1 referentials through the demo reconciler; WPS approval backdate"
```

---

### Task 4: Оператор и скриптовая загрузка проекта

**Files:**
- Create: `scripts/upg/operator.ts`, `scripts/upg/import-spooling.ts`, `scripts/upg/load-project.ts`
- Test: `scripts/upg/operator.test.ts`
- Modify: `package.json` — `"demo:project-load": "tsx --env-file-if-exists=.env.local scripts/upg/load-project.ts"`

**Interfaces:**
- Consumes:
  - задачи 1–3;
  - из `modules/imports/infrastructure/supabase-import-repository.ts`: `createImportJob`, `uploadImportFile`, `markImportJobUploaded`, `recordImportValidation`, `applyImportJob`, `importObjectPath`;
  - из `modules/imports/infrastructure/xlsx-workbook.ts`: `readFirstSheetMatrix`, `computeChecksum`;
  - из `modules/imports/application/create-import.ts`: `validateSheet`, `toStoredIssues`;
  - из `modules/engineering/infrastructure/supabase-engineering-repository.ts`: `loadPreview`, `recordRevisionDecision`, `applySpoolingImportJob`, `revalidateSpoolingImportJob`, `createSpoolingImportJob`, `registerSpoolgenFile`, `uploadSpoolgenFile`, `recordSpoolingValidation`;
  - `unresolvedItems` из `modules/engineering/application/resolve-revision.ts`;
  - `buildSpoolgenSubmission`;
  - `createNdeMatrixRule` из `modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.ts`;
  - `createProjectDefinition` из `lib/supabase/project-definition.ts`.
- Produces:
  - `UPG_OPERATOR_EMAIL = "track01.platform-admin@example.test"`;
  - `interface UpgEnv { url: string; publishableKey: string; password: string; serviceRoleKey: string }`;
  - `readUpgEnv(env?: NodeJS.ProcessEnv): UpgEnv`;
  - `signInOperator(env: UpgEnv): Promise<SupabaseClient<Database>>`;
  - `findProjectId(client, activityCode): Promise<string | null>`;
  - `readFixtureText(relative: string): string`, `readFixtureBytes(relative: string): Uint8Array`;
  - `importSpoolgenPackage(client, projectId, files, comment, options?): Promise<SpoolingOutcome>`, где `interface SpoolingOutcome { jobId: string; status: "applied" | "blocked"; blockerCount: number; warningCount: number; decisions: number }`;
  - `importExcelFile(client, projectId, importType, fileName): Promise<{ jobId: string; applied: number; skipped: boolean }>`;
  - `loadUpgProject(env, options: { createProject: boolean }): Promise<void>`.

Оператор — платформенный администратор: в B1 владелец создаёт проект под этой учётной записью, а создатель становится администратором проекта (триггер `projects_add_creator_as_admin`). Проверочный прогон работает так же.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/operator.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { readUpgEnv } from "./operator"

const local = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "publishable-secret-value",
  TRACK01_FIXTURE_PASSWORD: "password-secret-value",
  SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
}

test("a complete local environment is accepted", () => {
  const env = readUpgEnv(local)
  assert.equal(env.url, local.SUPABASE_URL)
  assert.equal(env.publishableKey, local.SUPABASE_PUBLISHABLE_KEY)
})

test("the Next.js publishable key name is accepted too", () => {
  const { SUPABASE_PUBLISHABLE_KEY: _drop, ...rest } = local
  assert.equal(readUpgEnv({ ...rest, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "next-key" }).publishableKey, "next-key")
})

test("a non-local URL is refused and the error names no secret", () => {
  assert.throws(
    () => readUpgEnv({ ...local, SUPABASE_URL: "https://abc.supabase.co" }),
    (error: Error) => /non-local/.test(error.message) && !/secret-value/.test(error.message),
  )
})

test("a missing value is refused and the error names no secret", () => {
  assert.throws(
    () => readUpgEnv({ ...local, TRACK01_FIXTURE_PASSWORD: "" }),
    (error: Error) => /\.env\.local/.test(error.message) && !/secret-value/.test(error.message),
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/operator.test.ts`
Expected: FAIL — `Cannot find module './operator'`.

- [ ] **Step 3: Write `operator.ts`**

```ts
// scripts/upg/operator.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Database } from "../../lib/supabase/database.types"
import { isLocalhost } from "../spoolgen-fixture-import"
import { UPG_FIXTURE_DIR } from "./files"

/** The account that creates UPG-1 in the UI, and so its project admin. */
export const UPG_OPERATOR_EMAIL = "track01.platform-admin@example.test"

export interface UpgEnv {
  readonly url: string
  readonly publishableKey: string
  readonly password: string
  readonly serviceRoleKey: string
}

export function readUpgEnv(env: NodeJS.ProcessEnv = process.env): UpgEnv {
  const url = env.SUPABASE_URL ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
  const password = env.TRACK01_FIXTURE_PASSWORD ?? ""
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!publishableKey || !password || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.")
  }
  return { url, publishableKey, password, serviceRoleKey }
}

export async function signInOperator(env: UpgEnv): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(env.url, env.publishableKey, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: UPG_OPERATOR_EMAIL, password: env.password })
  if (error) throw new Error(`Could not sign in as ${UPG_OPERATOR_EMAIL}: ${error.message}`)
  return client
}

export async function findProjectId(client: SupabaseClient<Database>, activityCode: string): Promise<string | null> {
  const { data, error } = await client.from("projects").select("id").eq("activity_code", activityCode).maybeSingle()
  if (error) throw new Error(`Reading project ${activityCode} failed: ${error.message}`)
  return (data as { id: string } | null)?.id ?? null
}

export const readFixtureText = (relative: string): string => readFileSync(join(UPG_FIXTURE_DIR, relative), "utf8")
export const readFixtureBytes = (relative: string): Uint8Array => new Uint8Array(readFileSync(join(UPG_FIXTURE_DIR, relative)))
```

- [ ] **Step 4: Write `import-spooling.ts`**

Этот импорт повторяет путь экрана «Спулинг → Импорт» (`modules/engineering/ui/spooling-import-screen.tsx`) для всего пакета сразу. Отличия от `importSpoolgenDefinition`:
- нет пропуска по номеру ISO;
- ожидаемые блокеры не роняют скрипт;
- нерешённые пункты ревизии решаются одним выбранным решением, как это сделал бы человек в Revision workbench.

```ts
// scripts/upg/import-spooling.ts
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { unresolvedItems } from "../../modules/engineering/application/resolve-revision"
import type { SpoolgenFileRole } from "../../modules/engineering/domain/spoolgen-file"
import {
  applySpoolingImportJob,
  createSpoolingImportJob,
  loadPreview,
  recordRevisionDecision,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  uploadSpoolgenFile,
} from "../../modules/engineering/infrastructure/supabase-engineering-repository"

export interface SpoolingOutcome {
  readonly jobId: string
  readonly status: "applied" | "blocked"
  readonly blockerCount: number
  readonly warningCount: number
  readonly decisions: number
}

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function importSpoolgenPackage(
  client: SupabaseClient<Database>,
  projectId: string,
  files: Partial<Record<SpoolgenFileRole, string>>,
  comment: string,
  options: { expectBlockers?: boolean; decision?: "done_without_modification" | "rework" | "not_done" | "cancelled" } = {},
): Promise<SpoolingOutcome> {
  const submission = buildSpoolgenSubmission(files)
  if (submission.summary.blockerCount > 0) {
    throw new Error(`The SpoolGen files produced ${submission.summary.blockerCount} client blockers.`)
  }
  const job = await createSpoolingImportJob(client, projectId, comment)
  for (const role of Object.keys(files) as SpoolgenFileRole[]) {
    const text = files[role]
    if (text === undefined) continue
    const file = new File([text], `${role}.txt`, { type: "text/plain" })
    const objectPath = `${projectId}/${job.id}/${role}.txt`
    await uploadSpoolgenFile(client, objectPath, file)
    await registerSpoolgenFile(client, job.id, role, file, await sha256Hex(text), objectPath)
  }
  await recordSpoolingValidation(client, job.id, submission.rows, submission.issues)
  const counts = await revalidateSpoolingImportJob(client, job.id)
  if (counts.blockerCount > 0) {
    if (options.expectBlockers) {
      return { jobId: job.id, status: "blocked", blockerCount: counts.blockerCount, warningCount: counts.warningCount, decisions: 0 }
    }
    throw new Error(`The server revalidation reported ${counts.blockerCount} blockers for "${comment}".`)
  }
  let decisions = 0
  if (counts.unresolvedCount > 0) {
    const pending = unresolvedItems(await loadPreview(client, job.id))
    for (const item of pending) {
      await recordRevisionDecision(client, job.id, item, options.decision ?? "done_without_modification", "UPG-1 dry run")
      decisions += 1
    }
  }
  await applySpoolingImportJob(client, job.id)
  return { jobId: job.id, status: "applied", blockerCount: 0, warningCount: counts.warningCount, decisions }
}
```

Если `typecheck` покажет, что `recordSpoolingValidation` ждёт другой тип строк или issues, взять типы из `buildSpoolgenSubmission` и передать как есть. Так делает экран импорта: сверить с `spooling-import-screen.tsx`.

- [ ] **Step 5: Write `load-project.ts`**

```ts
// scripts/upg/load-project.ts
/**
 * demo:project-load — the scripted twin of session B1, for the stage A dry run only.
 * The walkthrough itself does every one of these steps by hand in the UI.
 *
 *   npm run demo:project-load -- --project UPG-1 --create-project
 */
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { createProjectDefinition } from "../../lib/supabase/project-definition"
import { toStoredIssues, validateSheet } from "../../modules/imports/application/create-import"
import type { ImportType } from "../../modules/imports/domain/import-type"
import {
  applyImportJob,
  createImportJob,
  importObjectPath,
  markImportJobUploaded,
  recordImportValidation,
  uploadImportFile,
} from "../../modules/imports/infrastructure/supabase-import-repository"
import { computeChecksum, readFirstSheetMatrix } from "../../modules/imports/infrastructure/xlsx-workbook"
import { createNdeMatrixRule } from "../../modules/project-setup/infrastructure/supabase-welding-quality-reference-repository"
import { PWHT_FORM_RULES, UPG_PROJECT } from "./dataset"
import { addDays, importSheets } from "./files"
import { findProjectId, readFixtureBytes, readFixtureText, readUpgEnv, signInOperator, type UpgEnv } from "./operator"
import { importSpoolgenPackage } from "./import-spooling"
import { backdateUpgWps, prepareUpgReferences, startDateFromManifest } from "./setup-references"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function importExcelFile(
  client: SupabaseClient<Database>,
  projectId: string,
  importType: ImportType,
  fileName: string,
): Promise<{ jobId: string; applied: number; skipped: boolean }> {
  const { data: done } = await client
    .from("import_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("import_type", importType)
    .eq("status", "applied")
    .limit(1)
  if ((done ?? []).length > 0) return { jobId: (done as { id: string }[])[0].id, applied: 0, skipped: true }

  const bytes = readFixtureBytes(`imports/${fileName}`)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const outcome = validateSheet(importType, readFirstSheetMatrix(buffer))
  const blockers = outcome.issues.filter((issue) => issue.severity === "blocker")
  if (blockers.length > 0) throw new Error(`${fileName}: ${blockers.length} blockers before upload.`)
  const job = await createImportJob(client, {
    projectId,
    importType,
    fileName,
    mediaType: XLSX_TYPE,
    sizeBytes: bytes.byteLength,
    checksum: await computeChecksum(buffer),
  })
  const objectPath = importObjectPath(projectId, job.id, fileName)
  await uploadImportFile(client, objectPath, new File([bytes], fileName, { type: XLSX_TYPE }))
  await markImportJobUploaded(client, job.id, objectPath)
  await recordImportValidation(client, job.id, outcome.rows, toStoredIssues(outcome.issues))
  const applied = await applyImportJob(client, job.id, false, importType)
  return { jobId: job.id, applied: applied.appliedRowCount, skipped: false }
}

async function idByCode(client: SupabaseClient<Database>, table: "project_service_classes" | "project_weld_types", projectId: string, code: string): Promise<string> {
  const { data, error } = await client.from(table).select("id").eq("project_id", projectId).eq("code", code).maybeSingle()
  if (error || !data) throw new Error(`${table} ${code} is missing in the project.`)
  return (data as { id: string }).id
}

async function createPwhtRules(client: SupabaseClient<Database>, projectId: string): Promise<number> {
  const { data: existing } = await client.from("nde_matrix_rules").select("id").eq("project_id", projectId).eq("pwht_required", true)
  if ((existing ?? []).length > 0) return 0
  for (const rule of PWHT_FORM_RULES) {
    await createNdeMatrixRule(client, projectId, {
      serviceClassId: await idByCode(client, "project_service_classes", projectId, rule.serviceClass),
      weldTypeId: await idByCode(client, "project_weld_types", projectId, rule.weldType),
      weldLocation: rule.location,
      rtCoverage: rule.rt,
      utCoverage: 0,
      mtCoverage: rule.mt,
      ptCoverage: rule.pt,
      pmiCoverage: 0,
      htCoverage: 0,
      pwhtRequired: true,
      pwhtThicknessThreshold: rule.pwhtThresholdMm,
      materialTraceabilityRequired: false,
    })
  }
  return PWHT_FORM_RULES.length
}

export async function loadUpgProject(env: UpgEnv, options: { createProject: boolean }): Promise<void> {
  const client = await signInOperator(env)
  let projectId = await findProjectId(client, UPG_PROJECT.activityCode)
  if (!projectId) {
    if (!options.createProject) throw new Error(`${UPG_PROJECT.activityCode} does not exist; pass --create-project.`)
    const { data } = await client.auth.getUser()
    const created = await createProjectDefinition(client, data.user!.id, {
      activityCode: UPG_PROJECT.activityCode,
      projectTitle: UPG_PROJECT.projectTitle,
      owner: UPG_PROJECT.owner,
      contractor: UPG_PROJECT.contractor,
      contractNumber: UPG_PROJECT.contractNumber,
      maxTransitTimeDays: UPG_PROJECT.maxTransitTimeDays,
    })
    projectId = created.id
    console.log(`Created ${UPG_PROJECT.activityCode}.`)
  }

  await prepareUpgReferences(env, UPG_PROJECT.activityCode)
  console.log("Referentials prepared.")

  const sheets = importSheets(startDateFromManifest())
  for (const sheet of sheets.filter((candidate) => candidate.importType !== "test_pack_composition")) {
    const result = await importExcelFile(client, projectId, sheet.importType, sheet.fileName)
    console.log(`${sheet.fileName}: ${result.skipped ? "already applied" : `${result.applied} rows`}`)
  }
  console.log(`PWHT form rules created: ${await createPwhtRules(client, projectId)}`)
  console.log(`WPS backdated: ${await backdateUpgWps(env, UPG_PROJECT.activityCode, addDays(startDateFromManifest(), -14))}`)

  const blocked = await importSpoolgenPackage(client, projectId, { weld: readFixtureText("error/weld.txt") }, "UPG-1 error set", { expectBlockers: true })
  console.log(`Error set: ${blocked.status}, ${blocked.blockerCount} blockers (expected blocked).`)
  if (blocked.status !== "blocked") throw new Error("The error set was applied; it must be blocked by the missing thickness rule.")

  const { count } = await client.from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", projectId)
  if ((count ?? 0) === 0) {
    const main = await importSpoolgenPackage(client, projectId, {
      weld: readFixtureText("spooling/weld.txt"),
      trace: readFixtureText("spooling/trace.txt"),
      bolt: readFixtureText("spooling/bolt.txt"),
      supp: readFixtureText("spooling/supp.txt"),
    }, "UPG-1 R0")
    console.log(`Spooling R0: ${main.status}, ${main.warningCount} warnings.`)
  } else {
    console.log("Spooling R0: already imported.")
  }

  const composition = sheets.find((candidate) => candidate.importType === "test_pack_composition")!
  const packs = await importExcelFile(client, projectId, composition.importType, composition.fileName)
  console.log(`${composition.fileName}: ${packs.skipped ? "already applied" : `${packs.applied} rows`}`)
}

if (process.argv[1]?.endsWith("load-project.ts")) {
  loadUpgProject(readUpgEnv(), { createProject: process.argv.includes("--create-project") }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
```

Добавить в `package.json` → `scripts`: `"demo:project-load": "tsx --env-file-if-exists=.env.local scripts/upg/load-project.ts"`.

- [ ] **Step 6: Run tests, typecheck, lint**

Run: `node --import tsx --test scripts/upg/operator.test.ts`
Expected: PASS, 4 теста.

Run: `npm run typecheck && npx eslint scripts/upg`
Expected: 0 ошибок.

Если импорт из `lib/` или `modules/` тянет `"use client"`, `next/*` или браузерные глобали и падает под `tsx`, не менять эти файлы. Вместо этого повторить в скрипте ту же цепочку `rpc`/`storage` вызовов, что и в функции репозитория, с комментарием, из какой функции она взята. Записать это в отчёт задачи.

- [ ] **Step 7: Commit**

```bash
git add scripts/upg/operator.ts scripts/upg/operator.test.ts scripts/upg/import-spooling.ts scripts/upg/load-project.ts package.json
git commit -m "feat(demo): scripted UPG-1 load through the import and spooling paths the UI uses"
```

---

### Task 5: План недель

**Files:**
- Create: `scripts/upg/weeks.ts`
- Test: `scripts/upg/weeks.test.ts`

**Interfaces:**
- Consumes: задача 1.
- Produces:
  - `UPG_WEEK_COUNT = 8`, `weekOfDay(day)`;
  - `SITUATIONS`, тип `Situation`;
  - тип `UpgAction` (размеченное объединение, ниже);
  - `buildProjectPlan(): UpgAction[]` — все действия проекта;
  - `buildWeekPlan(week: number, includeManual: boolean): UpgAction[]`;
  - `describeAction(action): string` — русская подпись для отчёта и списка «руками».

Общие правила плана:
- **День проекта** `d` — `startDate + d`.
- **Шаги катушки** идут со смещением от старта когорты плюс сдвиг `groupIndex % 3` дня.
- **Шаги когорты** (раунды NDE) и **шаги пакетов** стоят на фиксированных днях.
- **Ручные действия** (`manual: true`): всё по ISO нити, всё по пакету TP-100-01 (в нём нить), импорт ревизии. Исполнитель недели их не выполняет, а печатает в список «руками на этой неделе».
- **Действия, зависящие от ревизии** (`requiresRevision: true`), не ручные, но пропускаются, если сварной шов R1 ещё не импортирован.

Расписание по когортам (дни от начала проекта):

| Когорта | Старт | Цех | Склад и путь | Монтаж | Пакеты |
|---|---|---|---|---|---|
| A (TP-100-01, TP-100-02) | 0 | сварка 2–9, NDE 11 (брак `REJECT_WELD`), ремонт 13, выпуск 15–17, покраска 16–21 | 20–25 | 23–34, NDE монтажа 29 | TP-100-02 до Z (42–54), TP-100-01 руками |
| B (TP-200-01, TP-200-02) | 3 | сварка 5–12, NDE 14, PWHT 17–19, выпуск 18–20; ревизия 15 | 23–28 | 26–37, NDE 32, PWHT 33–35 | TP-200-01 испытан, ждёт Y; TP-200-02 готов к испытанию |
| C (TP-300-01) | 14 | сварка 16–23, NDE 25, выпуск 29–31 | 34–39, `OVERDUE_SPOOL` уходит и не приходит | смонтированы groupIndex<6, монтажная сварка groupIndex<4 | заблокирован выше по процессу |
| D (TP-300-02) | 28 | сварена половина стыков, NDE 39 | — | — | заблокирован, катушки в цеху |

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/weeks.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { OVERDUE_SPOOL, REJECT_WELD, THREAD_ISOS, UPG_ISOS } from "./dataset"
import { SITUATIONS, UPG_WEEK_COUNT, buildProjectPlan, buildWeekPlan, describeAction, weekOfDay, type UpgAction } from "./weeks"

const plan = buildProjectPlan()
const automatic = plan.filter((action) => !action.manual)
const spoolOf = (action: UpgAction): string | undefined => ("spool" in action ? action.spool : undefined)

test("the plan is deterministic", () => {
  assert.deepEqual(buildProjectPlan(), buildProjectPlan())
})

test("every action falls inside the eight weeks", () => {
  for (const action of plan) {
    assert.ok(action.day >= 0 && weekOfDay(action.day) <= UPG_WEEK_COUNT, `${action.kind} on day ${action.day}`)
  }
})

test("week plans partition the project plan", () => {
  const weeks = Array.from({ length: UPG_WEEK_COUNT }, (_, index) => buildWeekPlan(index + 1, true))
  assert.equal(weeks.flat().length, plan.length)
  for (const [index, week] of weeks.entries()) {
    assert.ok(week.every((action) => weekOfDay(action.day) === index + 1))
    assert.deepEqual(week.map((action) => action.day), [...week].map((action) => action.day).sort((a, b) => a - b))
  }
})

test("without --include-manual the week plan skips the thread, TP-100-01 and the revision", () => {
  for (let week = 1; week <= UPG_WEEK_COUNT; week += 1) {
    for (const action of buildWeekPlan(week, false)) {
      assert.equal(action.manual, false)
      const spool = spoolOf(action)
      if (spool) assert.ok(!THREAD_ISOS.some((iso) => spool.startsWith(`${iso}-`)), spool)
      if ("testPack" in action) assert.notEqual(action.testPack, "TP-100-01")
      assert.notEqual(action.kind, "revision")
    }
  }
})

test("each spool's own steps keep the order the commands enforce", () => {
  const order = ["start_fab", "material_check", "weld", "support", "pwht", "qc_release", "sent_to_paint", "paint", "laydown", "to_site", "erected", "welded_bolted", "supported"]
  const stepOf = (action: UpgAction): string => (action.kind === "stage" ? action.stage : action.kind)
  const bySpool = new Map<string, UpgAction[]>()
  for (const action of plan) {
    const spool = spoolOf(action)
    if (!spool || action.kind === "tracking" || action.kind === "flange" || action.kind === "field_support_probe") continue
    if (action.kind === "weld" && action.phase === "erection") continue
    bySpool.set(spool, [...(bySpool.get(spool) ?? []), action])
  }
  for (const [spool, actions] of bySpool) {
    const firstDay = new Map<string, number>()
    for (const action of actions) {
      const step = stepOf(action)
      if (!firstDay.has(step)) firstDay.set(step, action.day)
    }
    const days = order.filter((step) => firstDay.has(step)).map((step) => firstDay.get(step)!)
    assert.deepEqual(days, [...days].sort((a, b) => a - b), spool)
  }
})

test("automatic actions cover every action-driven situation", () => {
  const seen = new Set(automatic.map((action) => action.situation).filter(Boolean))
  const actionDriven = SITUATIONS.filter((situation) => !["revision_during_fabrication", "partial_welding", "pack_blocked_upstream"].includes(situation))
  for (const situation of actionDriven) assert.ok(seen.has(situation), situation)
})

test("state-driven situations hold: the revision is manual, D welds half, C and D packs never start", () => {
  assert.ok(plan.some((action) => action.kind === "revision" && action.manual))
  const dWelds = UPG_ISOS.filter((iso) => iso.cohort === "D").flatMap((iso) => iso.spools.flatMap((spool) => spool.welds.filter((weld) => weld.location === "shop")))
  const dWelded = automatic.filter((action) => action.kind === "weld" && dWelds.some((weld) => weld.weldNumber === action.weld))
  assert.ok(dWelded.length > 0 && dWelded.length < dWelds.length)
  assert.ok(!plan.some((action) => "testPack" in action && ["TP-300-01", "TP-300-02"].includes(action.testPack)))
})

test("the rejected weld is in a shop NDE round and a repair round follows", () => {
  const rounds = plan.filter((action): action is Extract<UpgAction, { kind: "nde_round" }> => action.kind === "nde_round")
  const rejecting = rounds.find((round) => round.reject.includes(REJECT_WELD))
  assert.ok(rejecting)
  assert.ok(rounds.some((round) => round.day > rejecting.day && round.situation === "nde_reject_repair_tracer"))
})

test("the overdue spool leaves the laydown and never arrives on site", () => {
  const moves = plan.filter((action) => action.kind === "tracking" && action.spool === OVERDUE_SPOOL)
  assert.ok(moves.some((action) => action.kind === "tracking" && action.direction === "out"))
  assert.ok(!moves.some((action) => action.kind === "tracking" && action.location === "SITE-A"))
  assert.ok(!plan.some((action) => action.kind === "stage" && action.spool === OVERDUE_SPOOL && action.phase === "erection"))
})

test("every action has a Russian description", () => {
  for (const action of plan) assert.match(describeAction(action), /[а-яё]/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/weeks.test.ts`
Expected: FAIL — `Cannot find module './weeks'`.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/upg/weeks.ts
/**
 * The eight construction weeks of UPG-1 as a list of actions with project days.
 *
 * Pure. Spool steps follow the order the commands enforce (material before release, release
 * before paint, final QC before laydown, To Site before Erected…). Cohort steps (NDE rounds) and
 * test pack steps sit on fixed days. Manual actions are what the walkthrough records by hand.
 */
import {
  OVERDUE_SPOOL,
  PWHT_THRESHOLD_MM,
  REJECT_WELD,
  REVISION_ISO,
  REVISION_WELD,
  UPG_ISOS,
  type Cohort,
  type UpgIso,
  type UpgSpool,
} from "./dataset"

export const UPG_WEEK_COUNT = 8
export const weekOfDay = (day: number): number => Math.floor(day / 7) + 1

export const SITUATIONS = [
  "nde_batch", "nde_reject_repair_tracer", "pwht_required", "qc_release", "paint_dft", "laydown",
  "tracking_in_out", "transit_overdue", "field_welding_nde", "field_supports", "spool_rft",
  "flange_bolting", "flange_y", "flange_z", "line_check_with_x", "x_cleared", "blinding",
  "testing", "y_reinstatement", "precommissioning", "z_reinstatement",
  "revision_during_fabrication", "partial_welding", "pack_blocked_upstream",
] as const
export type Situation = (typeof SITUATIONS)[number]

interface Common {
  readonly day: number
  readonly manual: boolean
  readonly situation?: Situation
  readonly requiresRevision?: boolean
}

export type UpgAction = Common &
  (
    | { kind: "stage"; phase: "fabrication" | "erection"; stage: "start_fab" | "sent_to_paint" | "to_site" | "erected" | "welded_bolted" | "supported"; spool: string }
    | { kind: "material_check"; spool: string }
    | { kind: "weld"; phase: "fabrication" | "erection"; spool: string; weld: string }
    | { kind: "support"; spool: string }
    | { kind: "field_support_probe"; spool: string }
    | { kind: "pwht"; spool: string }
    | { kind: "qc_release"; spool: string }
    | { kind: "paint"; spool: string; finalQcDay: number }
    | { kind: "laydown"; spool: string }
    | { kind: "tracking"; spool: string; location: "LAYDOWN-A" | "SITE-A"; direction: "in" | "out" }
    | { kind: "flange"; spool: string; flange: string; category: "X" | "Y" | "Z" }
    | { kind: "nde_round"; label: string; spools: readonly string[]; reject: readonly string[] }
    | { kind: "line_check"; testPack: string; resultDay: number; punches: readonly { iso: string; description: string }[] }
    | { kind: "item_clearance"; testPack: string; clearDay: number }
    | { kind: "blinding"; testPack: string; recordDay: number }
    | { kind: "pressure_stage"; testPack: string; stage: "testing_started" | "testing_completed" | "precommissioning_completed" }
    | { kind: "reinstatement"; testPack: string; category: "Y" | "Z"; recordDay: number }
    | { kind: "revision"; iso: string }
  )

const COHORT_START: Readonly<Record<Cohort, number>> = { A: 0, B: 3, C: 14, D: 28 }
const MANUAL_PACK = "TP-100-01"

const flangeCategory = (iso: UpgIso, spoolIndex: number): "X" | "Y" | "Z" =>
  spoolIndex !== 0 ? "X" : iso.groupIndex === 1 ? "Y" : iso.groupIndex === 2 ? "Z" : "X"

const hasThickWeld = (iso: UpgIso, spool: UpgSpool, location: "shop" | "field"): boolean =>
  iso.serviceClass === "CS300" && spool.welds.some((weld) => weld.location === location && weld.thicknessMm >= PWHT_THRESHOLD_MM)

function spoolActions(iso: UpgIso, spool: UpgSpool, spoolIndex: number): UpgAction[] {
  const start = COHORT_START[iso.cohort] + (iso.groupIndex % 3)
  const manual = iso.thread
  const s = spool.spoolNumber
  const out: UpgAction[] = []
  const push = (action: UpgAction) => out.push(action)
  const shopWelds = spool.welds.filter((weld) => weld.location === "shop" && weld.weldNumber !== REVISION_WELD)

  push({ kind: "stage", phase: "fabrication", stage: "start_fab", spool: s, day: start, manual })
  push({ kind: "material_check", spool: s, day: start + 1, manual })

  const welded = iso.cohort === "D" ? shopWelds.slice(0, Math.ceil(shopWelds.length / 2)) : shopWelds
  welded.forEach((weld, index) =>
    push({ kind: "weld", phase: "fabrication", spool: s, weld: weld.weldNumber, day: start + 2 + index, manual, situation: iso.cohort === "D" ? "partial_welding" : undefined }),
  )
  if (iso.cohort === "D") return out

  push({ kind: "support", spool: s, day: start + 9, manual })
  if (iso.isoNumber === REVISION_ISO && spoolIndex === 0) {
    push({ kind: "weld", phase: "fabrication", spool: s, weld: REVISION_WELD, day: COHORT_START.B + 13, manual, requiresRevision: true })
  }
  if (hasThickWeld(iso, spool, "shop")) push({ kind: "pwht", spool: s, day: start + 14, manual, situation: "pwht_required" })
  push({ kind: "qc_release", spool: s, day: start + 15, manual, situation: "qc_release" })
  push({ kind: "stage", phase: "fabrication", stage: "sent_to_paint", spool: s, day: start + 16, manual })
  push({ kind: "paint", spool: s, day: start + 18, finalQcDay: start + 19, manual, situation: "paint_dft" })
  push({ kind: "laydown", spool: s, day: start + 20, manual, situation: "laydown" })
  push({ kind: "tracking", spool: s, location: "LAYDOWN-A", direction: "in", day: start + 20, manual, situation: "tracking_in_out" })
  push({ kind: "tracking", spool: s, location: "LAYDOWN-A", direction: "out", day: start + 22, manual, situation: s === OVERDUE_SPOOL ? "transit_overdue" : undefined })
  if (s === OVERDUE_SPOOL) return out

  const erects = iso.cohort === "A" || iso.cohort === "B" || iso.groupIndex < 6
  if (!erects) return out
  push({ kind: "tracking", spool: s, location: "SITE-A", direction: "in", day: start + 23, manual })
  push({ kind: "stage", phase: "erection", stage: "to_site", spool: s, day: start + 23, manual })
  push({ kind: "stage", phase: "erection", stage: "erected", spool: s, day: start + 25, manual })
  const fieldWelds = spool.welds.filter((weld) => weld.location === "field")
  const fieldWelding = iso.cohort === "A" || iso.cohort === "B" || iso.groupIndex < 4
  if (fieldWelding) {
    for (const weld of fieldWelds) push({ kind: "weld", phase: "erection", spool: s, weld: weld.weldNumber, day: start + 26, manual })
  }
  if (iso.cohort === "C") return out

  if (hasThickWeld(iso, spool, "field")) push({ kind: "pwht", spool: s, day: start + 30, manual, situation: "pwht_required" })
  push({ kind: "stage", phase: "erection", stage: "welded_bolted", spool: s, day: start + 31, manual })
  push({ kind: "stage", phase: "erection", stage: "supported", spool: s, day: start + 32, manual, situation: "spool_rft" })
  const category = flangeCategory(iso, spoolIndex)
  push({
    kind: "flange", spool: s, flange: spool.flangeNumber, category, day: start + 32, manual,
    situation: category === "Y" ? "flange_y" : category === "Z" ? "flange_z" : "flange_bolting",
  })
  return out
}

function cohortSpools(cohort: Cohort): string[] {
  return UPG_ISOS.filter((iso) => iso.cohort === cohort && !iso.thread).flatMap((iso) => iso.spools.map((spool) => spool.spoolNumber))
}

function roundActions(): UpgAction[] {
  const round = (label: string, cohort: Cohort, offset: number, situation: Situation, reject: string[] = []): UpgAction =>
    ({ kind: "nde_round", label, spools: cohortSpools(cohort), reject, day: COHORT_START[cohort] + offset, manual: false, situation })
  return [
    round("A-shop", "A", 11, "nde_batch", [REJECT_WELD]),
    round("A-repair", "A", 13, "nde_reject_repair_tracer"),
    round("B-shop", "B", 11, "nde_batch"),
    { kind: "nde_round", label: "B-revision", spools: [`${REVISION_ISO}-S1`], reject: [], day: COHORT_START.B + 14, manual: false, requiresRevision: true },
    round("C-shop", "C", 11, "nde_batch"),
    round("D-shop", "D", 11, "nde_batch"),
    round("A-field", "A", 29, "field_welding_nde"),
    round("B-field", "B", 29, "field_welding_nde"),
  ]
}

function packActions(): UpgAction[] {
  const pack = (testPack: string) => ({ testPack, manual: testPack === MANUAL_PACK })
  const a = (testPack: string): UpgAction[] => [
    { kind: "line_check", ...pack(testPack), day: 42, resultDay: 43, situation: "line_check_with_x",
      punches: testPack === MANUAL_PACK ? [{ iso: "UPG-100-1003", description: "Не установлена бирка на опоре" }] : [{ iso: "UPG-100-1009", description: "Не затянуты болты хомута опоры" }] },
    { kind: "item_clearance", ...pack(testPack), day: 44, clearDay: 45, situation: "x_cleared" },
    { kind: "blinding", ...pack(testPack), day: 46, recordDay: 46, situation: "blinding" },
    { kind: "pressure_stage", ...pack(testPack), stage: "testing_started", day: 47, situation: "testing" },
    { kind: "pressure_stage", ...pack(testPack), stage: "testing_completed", day: 48 },
    { kind: "reinstatement", ...pack(testPack), category: "Y", day: 49, recordDay: 50, situation: "y_reinstatement" },
    { kind: "pressure_stage", ...pack(testPack), stage: "precommissioning_completed", day: 52, situation: "precommissioning" },
    { kind: "reinstatement", ...pack(testPack), category: "Z", day: 53, recordDay: 54, situation: "z_reinstatement" },
  ]
  return [
    ...a("TP-100-01"),
    ...a("TP-100-02"),
    { kind: "line_check", ...pack("TP-200-01"), day: 43, resultDay: 44, punches: [] },
    { kind: "blinding", ...pack("TP-200-01"), day: 45, recordDay: 45 },
    { kind: "pressure_stage", ...pack("TP-200-01"), stage: "testing_started", day: 47 },
    { kind: "pressure_stage", ...pack("TP-200-01"), stage: "testing_completed", day: 50 },
    { kind: "line_check", ...pack("TP-200-02"), day: 44, resultDay: 45,
      punches: [{ iso: "UPG-200-2010", description: "Отсутствует заглушка на дренаже" }, { iso: "UPG-200-2011", description: "Повреждено покрытие у опоры" }] },
    { kind: "item_clearance", ...pack("TP-200-02"), day: 50, clearDay: 51 },
  ]
}

export function buildProjectPlan(): UpgAction[] {
  const actions: UpgAction[] = []
  for (const iso of UPG_ISOS) iso.spools.forEach((spool, index) => actions.push(...spoolActions(iso, spool, index)))
  const probe = UPG_ISOS.find((iso) => iso.cohort === "A" && !iso.thread)!.spools[0].spoolNumber
  actions.push({ kind: "field_support_probe", spool: probe, day: 30, manual: false, situation: "field_supports" })
  actions.push({ kind: "revision", iso: REVISION_ISO, day: COHORT_START.B + 12, manual: true, situation: "revision_during_fabrication" })
  actions.push(...roundActions(), ...packActions())
  return actions.map((action, order) => ({ action, order }))
    .sort((left, right) => left.action.day - right.action.day || left.order - right.order)
    .map(({ action }) => action)
}

export function buildWeekPlan(week: number, includeManual: boolean): UpgAction[] {
  return buildProjectPlan().filter((action) => weekOfDay(action.day) === week && (includeManual || !action.manual))
}

const STAGE_LABEL: Record<string, string> = {
  start_fab: "начало изготовления", sent_to_paint: "отправлена на покраску", to_site: "на площадке",
  erected: "смонтирована", welded_bolted: "сварено/собрано", supported: "закреплена",
}

export function describeAction(action: UpgAction): string {
  switch (action.kind) {
    case "stage": return `${action.spool}: ${STAGE_LABEL[action.stage]}`
    case "material_check": return `${action.spool}: проверка материалов`
    case "weld": return `${action.spool}: ${action.phase === "erection" ? "монтажная" : "цеховая"} сварка стыка ${action.weld}`
    case "support": return `${action.spool}: установка опоры в цеху`
    case "field_support_probe": return `${action.spool}: попытка записать опору на монтаже`
    case "pwht": return `${action.spool}: термообработка (PWHT)`
    case "qc_release": return `${action.spool}: выпуск QC`
    case "paint": return `${action.spool}: покраска и итоговый контроль`
    case "laydown": return `${action.spool}: на склад LAYDOWN-A`
    case "tracking": return `${action.spool}: ${action.direction === "in" ? "приход на" : "уход с"} ${action.location}`
    case "flange": return `${action.spool}: сборка фланца ${action.flange}, категория ${action.category}`
    case "nde_round": return `NDE-раунд ${action.label}: ${action.spools.length} катушек${action.reject.length ? `, брак ${action.reject.join(", ")}` : ""}`
    case "line_check": return `${action.testPack}: проверка линии, замечаний ${action.punches.length}`
    case "item_clearance": return `${action.testPack}: закрытие замечаний X`
    case "blinding": return `${action.testPack}: установка заглушек`
    case "pressure_stage": return `${action.testPack}: ${action.stage === "testing_started" ? "начало испытания" : action.stage === "testing_completed" ? "испытание завершено" : "пусконаладка завершена"}`
    case "reinstatement": return `${action.testPack}: восстановление фланцев ${action.category}`
    case "revision": return `${action.iso}: импорт ревизии R1 и решения по ревизии`
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test scripts/upg/weeks.test.ts`
Expected: PASS, все 10 тестов.

Если тест порядка шагов катушки падает, сдвинуть смещение шага в `spoolActions`. Порядок в тесте отражает проверки команд, его не менять.

- [ ] **Step 5: Commit**

```bash
git add scripts/upg/weeks.ts scripts/upg/weeks.test.ts
git commit -m "feat(demo): UPG-1 eight-week construction plan with coverage of every situation"
```

---

### Task 6: Исполнитель недели

**Files:**
- Create: `scripts/upg/ids.ts`, `scripts/upg/execute.ts`, `scripts/upg/run-week.ts`
- Test: `scripts/upg/execute.test.ts`
- Modify: `package.json` — `"demo:week": "tsx --env-file-if-exists=.env.local scripts/upg/run-week.ts"`

**Interfaces:**
- Consumes: задачи 1, 2 (`addDays`, `UPG_FIXTURE_DIR`), 4 (`readUpgEnv`, `signInOperator`, `findProjectId`, `importSpoolgenPackage`, `readFixtureText`), 5; `materialCheckItemsFor` из `scripts/demo/material-check-items.ts`.
- Produces:
  - `actionKey(week: number, action: UpgAction, suffix?: string): string`;
  - `interface ActionResult { action: UpgAction; outcome: "done" | "skipped" | "refused"; code?: string; message?: string; expected?: boolean }`;
  - `summarizeRun(results: ActionResult[]): { done: number; skipped: number; refused: number; unexpected: ActionResult[]; situations: Situation[] }`;
  - `EXPECTED_REFUSALS: Partial<Record<UpgAction["kind"], string>>` — вид действия → причина (ссылка на находку);
  - `loadIds(client, projectId): Promise<UpgIds>`;
  - `executeAction(ctx: RunContext, action: UpgAction): Promise<ActionResult>`;
  - CLI `demo:week -- --project UPG-1 --week N [--include-manual]`.

Ключ идемпотентности: `upg-w<неделя>-<вид>-<цель>[-<суффикс>]`. Цель — номер катушки, стыка, фланца, пакета или метка раунда. Суффикс используется для шагов внутри действия (ISO в проверке линии, id обязательства). Повторный запуск команды с тем же ключом возвращает сохранённый результат (`claim_command_receipt`), поэтому неделя безопасно перезапускается.

Сопоставление действий с командами. Аргументы — по `pg_get_function_arguments`, проверены 2026-10-09:

| Действие | Команда и аргументы |
|---|---|
| `stage` fabrication | `record_construction_progress { target_spool_revision_id, target_phase: "fabrication", target_stage, target_occurred_on, target_idempotency_key }` |
| `stage` erection | `record_erection_progress { target_spool_revision_id, target_stage, target_occurred_on, target_idempotency_key }` |
| `material_check` | `record_material_check { target_spool_revision_id, target_checked_on, target_items: materialCheckItemsFor(client, rev), target_idempotency_key }` |
| `weld` fabrication | `record_weld_progress { target_weld_joint_revision_id, subcontractor_id, welding_procedure_id, points: [root, cap], dates: { weld_on }, idempotency_key }` (как в `bootstrap-showcase-dataset.ts:237-250`) |
| `weld` erection | то же плюс `target_phase: "erection"`; субподрядчик `ERC-A`, WPS полевой |
| `support` | для каждой `support_revisions` катушки: `record_support_progress { target_support_revision_id, installed_on, idempotency_key }` |
| `field_support_probe` | `record_field_support_progress { target_support_revision_id, installed_on, idempotency_key }` — ожидаемый отказ (одна запись опоры на ревизию, находка L3) |
| `pwht` | для каждого `pwht_requirements` катушки без принятого `pwht_results`: `record_pwht_result { target_requirement_id, chart_number, performed_on, outcome: "accepted", idempotency_key }` |
| `qc_release` | `release_quality_record { target_spool_revision_id, released_on, idempotency_key }` |
| `paint` | `record_paint_progress { target_spool_revision_id, line_service_id (PROCESS), details: { painted_on, final_qc_on, measured_dft_microns: 260, w10p_form_number: "W10P-<катушка>" }, idempotency_key }` |
| `laydown` | `record_laydown { target_spool_revision_id, location_id (LAYDOWN-A), stored_on, idempotency_key }` |
| `tracking` | `record_location_event { p_project_id, p_spool_id (id катушки, не ревизии), p_location_id, p_device_id: null, p_direction, p_occurred_at: "<дата>T08:00:00Z", p_reason: null, p_compensates_event_id: null, p_idempotency_key }` |
| `flange` | `record_flange_progress { target_project_id, target_flange_joint_revision_id, target_joint_category_id (по коду X/Y/Z), target_torquing_requirement_id (MANUAL-TORQUE), target_jointing_value: 450, target_joint_date, target_report_number: "BT-<фланец>", target_tag_number: "TAG-<фланец>", target_jointer_ids: [бригада jointer], target_idempotency_key }` |
| `nde_round` | см. ниже |
| `line_check` | `assign_line_check { target_test_pack_id, target_isometric_ids (члены пакета), target_team_id (line_check), target_assigned_on, target_idempotency_key }` → для каждого ISO `record_line_check_result { target_request_id, target_isometric_id, target_completed_on: resultDay, target_punches: [{ punch_code_id, description, checking_date }], target_idempotency_key }` |
| `item_clearance` | открытые `punch_items` пакета → `assign_item_clearance { target_test_pack_id, target_punch_item_ids, target_team_id (finishing), target_assigned_on, target_idempotency_key }` → `record_punch_clearance { target_request_id, target_punch_item_id, target_cleared_on, target_idempotency_key }` |
| `blinding` | `assign_blinding { target_test_pack_id, target_team_id (blinding), target_assigned_on, target_idempotency_key }` → `record_blinding { target_request_id, target_completed_on, target_idempotency_key }` |
| `pressure_stage` | `record_pressure_test_stage { target_test_pack_id, target_stage, target_occurred_on, target_idempotency_key }` |
| `reinstatement` | цели из `flange_joint_readiness` (ISO пакета, `revision_status = accepted`, не удалён, `requires_reinstatement`, `category_code`) → `assign_reinstatement { target_test_pack_id, target_flange_joint_revision_ids, target_team_id (reinstatement), target_assigned_on, target_idempotency_key }` → `record_reinstatement { target_request_id, target_flange_joint_revision_id, target_joint_date, target_report_number: "RI-<фланец>", target_jointer_team_id (jointer), target_tag_number, target_idempotency_key }` |
| `revision` (только `--include-manual`) | `importSpoolgenPackage(client, projectId, revision/*.txt, "UPG-1 R1", { decision: "done_without_modification" })`, затем `ids.reload()` |

**NDE-раунд.**
1. Читается `nde_obligations` (`id, method, coverage_regime, weld_joint_revision_id, cycle_kind, disposition`) по `spool_revision_id` катушек раунда с `disposition = 'pending'`. Пусто → `skipped`.
2. Обязательства группируются по паре `method|coverage_regime`.
3. Для каждой пары последовательно (как в `bootstrap-showcase-dataset.ts:404-432`):
   - `create_nde_batch { target_project_id, method, coverage_regime, idempotency_key }`;
   - `allocate_nde_batch_candidates { target_batch_id, target_percentage: 100, idempotency_key }`;
   - `issue_nde_batch { target_batch_id, idempotency_key }`.
4. Для каждого обязательства раунда вызывается `record_nde_result { target_obligation_id, outcome, examined_on, report_number: "RT-<неделя>-<n>", defect_rework_code_id, idempotency_key }`:
   - если стык в списке `reject` и `cycle_kind = 'original'`, то `outcome: "rejected"` и `defect_rework_code_id` — код `POR`;
   - иначе `outcome: "accepted"`.
   Брак сам порождает обязательства ремонта и трассеров (`061_nde_repair_tracer_truth_table.test.sql`), их закрывает следующий раунд.
5. Каждая партия закрывается: `close_nde_batch { target_batch_id, returned_on_date, idempotency_key }`.

Дата — день раунда.

**Сварщики.** Пул — `welder_qualifications` субподрядчика, у которых есть `welder_wps_qualifications` на выбранный WPS. Корень — `pool[i % n]`, облицовка — `pool[(i + 1) % n]`, где `i` — порядковый номер стыка на катушке. Сварщики должны различаться (уникальный ключ в `weld_point_assignments`).

- [ ] **Step 1: Write the failing test**

```ts
// scripts/upg/execute.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { EXPECTED_REFUSALS, actionKey, summarizeRun, type ActionResult } from "./execute"
import { buildProjectPlan, type UpgAction } from "./weeks"

const plan = buildProjectPlan()
const weld = plan.find((action) => action.kind === "weld")!
const probe = plan.find((action) => action.kind === "field_support_probe")!

test("keys are deterministic, prefixed and unique per action in a week", () => {
  assert.equal(actionKey(1, weld), actionKey(1, weld))
  assert.match(actionKey(1, weld), /^upg-w1-weld-/)
  const keys = plan.filter((action) => action.day < 7).map((action) => actionKey(1, action))
  assert.equal(new Set(keys).size, keys.length)
})

test("a suffix separates the steps inside one action", () => {
  assert.notEqual(actionKey(7, weld, "a"), actionKey(7, weld, "b"))
})

test("summarizeRun separates expected refusals from unexpected ones", () => {
  const results: ActionResult[] = [
    { action: weld, outcome: "done" },
    { action: probe, outcome: "refused", code: "23505", message: "duplicate", expected: true },
    { action: { ...weld, day: 3 } as UpgAction, outcome: "refused", code: "PQC53", message: "order" },
    { action: weld, outcome: "skipped", message: "manual" },
  ]
  const summary = summarizeRun(results)
  assert.equal(summary.done, 1)
  assert.equal(summary.skipped, 1)
  assert.equal(summary.refused, 2)
  assert.equal(summary.unexpected.length, 1)
  assert.equal(summary.unexpected[0].code, "PQC53")
})

test("the field support probe is the expected refusal and names its finding", () => {
  assert.match(EXPECTED_REFUSALS.field_support_probe ?? "", /L3/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test scripts/upg/execute.test.ts`
Expected: FAIL — `Cannot find module './execute'`.

- [ ] **Step 3: Write `ids.ts`**

```ts
// scripts/upg/ids.ts
/** Number → id lookups for one run. reload() after anything that changes revisions. */
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"

type Client = SupabaseClient<Database>

export interface UpgIds {
  readonly projectId: string
  spoolRevision(spoolNumber: string): string | undefined
  spool(spoolNumber: string): string | undefined
  weldJointRevision(weldNumber: string): string | undefined
  flangeJointRevision(flangeNumber: string): string | undefined
  iso(isoNumber: string): string | undefined
  testPack(testPackNumber: string): string | undefined
  subcontractor(code: string): string
  wps(code: string): string
  welders(subcontractorCode: string, wpsCode: string): string[]
  team(teamType: "line_check" | "finishing" | "blinding" | "reinstatement" | "jointer"): string
  location(code: string): string
  reworkCode(code: string): string
  punchCode(): string
  jointCategory(code: "X" | "Y" | "Z"): string
  torquing(code: string): string
  lineService(code: string): string
  reload(): Promise<void>
}

const fail = (what: string, error: { message: string } | null): void => {
  if (error) throw new Error(`Reading ${what} failed: ${error.message}`)
}
const need = (map: Map<string, string>, key: string, what: string): string => {
  const value = map.get(key)
  if (!value) throw new Error(`${what} ${key} is missing in the project.`)
  return value
}

export async function loadIds(client: Client, projectId: string): Promise<UpgIds> {
  const maps = {
    spoolRevision: new Map<string, string>(), spool: new Map<string, string>(), weld: new Map<string, string>(),
    flange: new Map<string, string>(), iso: new Map<string, string>(), pack: new Map<string, string>(),
    subcontractor: new Map<string, string>(), wps: new Map<string, string>(), team: new Map<string, string>(),
    location: new Map<string, string>(), rework: new Map<string, string>(), category: new Map<string, string>(),
    torquing: new Map<string, string>(), lineService: new Map<string, string>(),
  }
  let welderPool: { id: string; subcontractor_id: string; wps: string[] }[] = []
  let punchCodeId = ""

  async function reload(): Promise<void> {
    for (const map of Object.values(maps)) map.clear()

    const revisions = await client.from("spool_erection_readiness").select("spool_revision_id, spool_number").eq("project_id", projectId).eq("revision_status", "accepted")
    fail("spool revisions", revisions.error)
    for (const row of revisions.data ?? []) if (row.spool_number && row.spool_revision_id) maps.spoolRevision.set(row.spool_number, row.spool_revision_id)

    const spools = await client.from("spools").select("id, spool_number").eq("project_id", projectId)
    fail("spools", spools.error)
    for (const row of spools.data ?? []) maps.spool.set(row.spool_number, row.id)

    const revisionIds = [...maps.spoolRevision.values()]
    const welds = await client.from("weld_joint_revisions").select("id, spool_revision_id, is_removed, weld_joints!inner(weld_number)").in("spool_revision_id", revisionIds)
    fail("weld joints", welds.error)
    for (const row of (welds.data ?? []) as unknown as { id: string; is_removed: boolean; weld_joints: { weld_number: string } }[]) {
      if (!row.is_removed) maps.weld.set(row.weld_joints.weld_number, row.id)
    }

    const isos = await client.from("isometrics").select("id, iso_number").eq("project_id", projectId)
    fail("isometrics", isos.error)
    for (const row of isos.data ?? []) maps.iso.set(row.iso_number, row.id)

    const flanges = await client.from("flange_joint_readiness").select("flange_joint_revision_id, flange_number, revision_status, is_removed").in("isometric_id", [...maps.iso.values()])
    fail("flange joints", flanges.error)
    for (const row of flanges.data ?? []) {
      if (row.revision_status === "accepted" && !row.is_removed && row.flange_number && row.flange_joint_revision_id) maps.flange.set(row.flange_number, row.flange_joint_revision_id)
    }

    const packs = await client.from("test_packs").select("id, test_pack_number").eq("project_id", projectId)
    fail("test packs", packs.error)
    for (const row of packs.data ?? []) maps.pack.set(row.test_pack_number, row.id)

    const subs = await client.from("project_subcontractors").select("id, code").eq("project_id", projectId)
    fail("subcontractors", subs.error)
    for (const row of subs.data ?? []) maps.subcontractor.set(row.code, row.id)

    const wps = await client.from("project_welding_procedures").select("id, code").eq("project_id", projectId)
    fail("WPS", wps.error)
    for (const row of wps.data ?? []) maps.wps.set(row.code, row.id)

    const welders = await client.from("welder_qualifications").select("id, subcontractor_id, welder_code, welder_wps_qualifications(wps_id)").eq("project_id", projectId).order("welder_code")
    fail("welders", welders.error)
    welderPool = ((welders.data ?? []) as unknown as { id: string; subcontractor_id: string; welder_wps_qualifications: { wps_id: string }[] }[]).map((row) => ({
      id: row.id, subcontractor_id: row.subcontractor_id, wps: row.welder_wps_qualifications.map((link) => link.wps_id),
    }))

    const teams = await client.from("project_teams").select("id, team_type, code").eq("project_id", projectId).eq("status", "active").order("code")
    fail("teams", teams.error)
    for (const row of teams.data ?? []) if (!maps.team.has(row.team_type)) maps.team.set(row.team_type, row.id)

    const locations = await client.from("project_locations").select("id, code").eq("project_id", projectId)
    fail("locations", locations.error)
    for (const row of locations.data ?? []) maps.location.set(row.code, row.id)

    const rework = await client.from("project_rework_codes").select("id, code").eq("project_id", projectId)
    fail("rework codes", rework.error)
    for (const row of rework.data ?? []) maps.rework.set(row.code, row.id)

    const punch = await client.from("project_punch_codes").select("id").eq("project_id", projectId).eq("status", "active").order("code").limit(1)
    fail("punch codes", punch.error)
    punchCodeId = (punch.data ?? [])[0]?.id ?? ""

    const categories = await client.from("project_joint_categories").select("id, category_code").eq("project_id", projectId).eq("status", "active")
    fail("joint categories", categories.error)
    for (const row of categories.data ?? []) maps.category.set(row.category_code, row.id)

    const torquing = await client.from("system_reference_entries").select("id, code").eq("kind", "torquing_requirement").eq("status", "active")
    fail("torquing requirements", torquing.error)
    for (const row of torquing.data ?? []) maps.torquing.set(row.code, row.id)

    const services = await client.from("project_line_services").select("id, code").eq("project_id", projectId)
    fail("line services", services.error)
    for (const row of services.data ?? []) maps.lineService.set(row.code, row.id)
  }

  await reload()

  return {
    projectId,
    spoolRevision: (number) => maps.spoolRevision.get(number),
    spool: (number) => maps.spool.get(number),
    weldJointRevision: (number) => maps.weld.get(number),
    flangeJointRevision: (number) => maps.flange.get(number),
    iso: (number) => maps.iso.get(number),
    testPack: (number) => maps.pack.get(number),
    subcontractor: (code) => need(maps.subcontractor, code, "Subcontractor"),
    wps: (code) => need(maps.wps, code, "WPS"),
    welders: (subcontractorCode, wpsCode) => {
      const subcontractorId = need(maps.subcontractor, subcontractorCode, "Subcontractor")
      const wpsId = need(maps.wps, wpsCode, "WPS")
      return welderPool.filter((welder) => welder.subcontractor_id === subcontractorId && welder.wps.includes(wpsId)).map((welder) => welder.id)
    },
    team: (teamType) => need(maps.team, teamType, "Team"),
    location: (code) => need(maps.location, code, "Location"),
    reworkCode: (code) => need(maps.rework, code, "Rework code"),
    punchCode: () => {
      if (!punchCodeId) throw new Error("No active punch code in the project.")
      return punchCodeId
    },
    jointCategory: (code) => need(maps.category, code, "Joint category"),
    torquing: (code) => need(maps.torquing, code, "Torquing requirement"),
    lineService: (code) => need(maps.lineService, code, "Line service"),
    reload,
  }
}
```

Если `typecheck` ругается на вложенный select (`weld_joints!inner(...)`, `welder_wps_qualifications(...)`), значит имя связи в `database.types.ts` другое. Взять его из `Relationships` соответствующей таблицы. Если связи нет — заменить вложенный select двумя запросами.

- [ ] **Step 4: Write `execute.ts`**

```ts
// scripts/upg/execute.ts
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { materialCheckItemsFor } from "../demo/material-check-items"
import { FIELD_SUBCONTRACTOR, LINE_SERVICE, REVISION_WELD, SERVICE_CLASSES, SHOP_SUBCONTRACTOR, WPS_BY_MATERIAL, spoolByNumber } from "./dataset"
import { addDays } from "./files"
import type { UpgIds } from "./ids"
import { importSpoolgenPackage } from "./import-spooling"
import { readFixtureText } from "./operator"
import { weekOfDay, type Situation, type UpgAction } from "./weeks"

type Client = SupabaseClient<Database>

export interface RunContext {
  readonly client: Client
  readonly ids: UpgIds
  readonly startDate: string
}

export interface ActionResult {
  readonly action: UpgAction
  readonly outcome: "done" | "skipped" | "refused"
  readonly code?: string
  readonly message?: string
  readonly expected?: boolean
}

/** Refusals that document a known finding instead of failing the run. */
export const EXPECTED_REFUSALS: Partial<Record<UpgAction["kind"], string>> = {
  field_support_probe: "L3: support progress is UNIQUE per support revision, so a support recorded in the shop cannot be recorded on site",
}

const targetOf = (action: UpgAction): string => {
  switch (action.kind) {
    case "weld": return action.weld
    case "flange": return action.flange
    case "nde_round": return action.label
    case "revision": return action.iso
    case "pressure_stage": return `${action.testPack}-${action.stage}`
    case "reinstatement": return `${action.testPack}-${action.category}`
    case "stage": return `${action.spool}-${action.stage}`
    case "tracking": return `${action.spool}-${action.location}-${action.direction}`
    default: return "testPack" in action ? action.testPack : action.spool
  }
}

export function actionKey(week: number, action: UpgAction, suffix?: string): string {
  return ["upg", `w${week}`, action.kind, targetOf(action), suffix].filter(Boolean).join("-")
}

export function summarizeRun(results: readonly ActionResult[]) {
  const refused = results.filter((result) => result.outcome === "refused")
  return {
    done: results.filter((result) => result.outcome === "done").length,
    skipped: results.filter((result) => result.outcome === "skipped").length,
    refused: refused.length,
    unexpected: refused.filter((result) => !result.expected),
    situations: [...new Set(results.filter((result) => result.outcome === "done" && result.action.situation).map((result) => result.action.situation as Situation))],
  }
}

class Skip extends Error {}

async function rpc(client: Client, fn: string, args: Record<string, unknown>): Promise<any> {
  const { data, error } = await client.rpc(fn as never, args as never)
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data
}

const required = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Skip(`${what} is not in the project yet`)
  return value
}

async function weld(ctx: RunContext, action: Extract<UpgAction, { kind: "weld" }>, key: string, date: string): Promise<void> {
  const found = spoolByNumber(action.spool)
  if (!found) throw new Error(`${action.spool} is not in the dataset.`)
  const material = SERVICE_CLASSES[found.iso.serviceClass].materialTypeCode
  const field = action.phase === "erection"
  const subcontractor = field ? FIELD_SUBCONTRACTOR : SHOP_SUBCONTRACTOR
  const wpsCode = field ? WPS_BY_MATERIAL[material].field : WPS_BY_MATERIAL[material].shop
  const pool = ctx.ids.welders(subcontractor, wpsCode)
  if (pool.length < 2) throw new Error(`Fewer than two welders qualified for ${wpsCode}.`)
  const ordinal = Number(action.weld.replace(/.*-(W|FW)/, "")) || 0
  await rpc(ctx.client, "record_weld_progress", {
    ...(field ? { target_phase: "erection" } : {}),
    target_weld_joint_revision_id: required(ctx.ids.weldJointRevision(action.weld), action.weld),
    subcontractor_id: ctx.ids.subcontractor(subcontractor),
    welding_procedure_id: ctx.ids.wps(wpsCode),
    points: [
      { point_type: "root", welder_qualification_id: pool[ordinal % pool.length], completion_percent: 50, welded_on: date },
      { point_type: "cap", welder_qualification_id: pool[(ordinal + 1) % pool.length], completion_percent: 50, welded_on: date },
    ],
    dates: { weld_on: date },
    idempotency_key: key,
  })
}

async function ndeRound(ctx: RunContext, action: Extract<UpgAction, { kind: "nde_round" }>, week: number, date: string): Promise<boolean> {
  const revisions = action.spools.map((spool) => ctx.ids.spoolRevision(spool)).filter((id): id is string => Boolean(id))
  const { data, error } = await ctx.client.from("nde_obligations")
    .select("id, method, coverage_regime, weld_joint_revision_id, cycle_kind")
    .eq("project_id", ctx.ids.projectId).eq("disposition", "pending").in("spool_revision_id", revisions)
  if (error) throw new Error(error.message)
  const obligations = (data ?? []) as { id: string; method: string; coverage_regime: string; weld_joint_revision_id: string; cycle_kind: string }[]
  if (obligations.length === 0) return false
  const rejectIds = new Set(action.reject.map((weldNumber) => ctx.ids.weldJointRevision(weldNumber)).filter(Boolean))
  const pairs = [...new Set(obligations.map((row) => `${row.method}|${row.coverage_regime}`))]
  const batches: string[] = []
  for (const pair of pairs) {
    const [method, coverageRegime] = pair.split("|")
    const batch = await rpc(ctx.client, "create_nde_batch", { target_project_id: ctx.ids.projectId, method, coverage_regime: coverageRegime, idempotency_key: actionKey(week, action, `batch-${pair}`) })
    await rpc(ctx.client, "allocate_nde_batch_candidates", { target_batch_id: batch.id, target_percentage: 100, idempotency_key: actionKey(week, action, `allocate-${pair}`) })
    await rpc(ctx.client, "issue_nde_batch", { target_batch_id: batch.id, idempotency_key: actionKey(week, action, `issue-${pair}`) })
    batches.push(batch.id)
  }
  let n = 0
  for (const obligation of obligations) {
    const rejected = obligation.cycle_kind === "original" && rejectIds.has(obligation.weld_joint_revision_id)
    n += 1
    await rpc(ctx.client, "record_nde_result", {
      target_obligation_id: obligation.id,
      outcome: rejected ? "rejected" : "accepted",
      examined_on: date,
      report_number: `RT-${week}-${String(n).padStart(3, "0")}`,
      ...(rejected ? { defect_rework_code_id: ctx.ids.reworkCode("POR") } : {}),
      idempotency_key: actionKey(week, action, `result-${obligation.id}`),
    })
  }
  for (const batchId of batches) {
    await rpc(ctx.client, "close_nde_batch", { target_batch_id: batchId, returned_on_date: date, idempotency_key: actionKey(week, action, `close-${batchId}`) })
  }
  return true
}

async function packMembers(ctx: RunContext, testPackId: string): Promise<string[]> {
  const { data, error } = await ctx.client.from("test_pack_isometrics").select("isometric_id").eq("test_pack_id", testPackId).is("removed_at", null)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.isometric_id as string)
}

export async function executeAction(ctx: RunContext, action: UpgAction): Promise<ActionResult> {
  const week = weekOfDay(action.day)
  const key = actionKey(week, action)
  const date = addDays(ctx.startDate, action.day)
  const client = ctx.client
  const spoolRevision = (spool: string) => required(ctx.ids.spoolRevision(spool), spool)
  try {
    switch (action.kind) {
      case "stage":
        if (action.phase === "fabrication") {
          await rpc(client, "record_construction_progress", { target_spool_revision_id: spoolRevision(action.spool), target_phase: "fabrication", target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        } else {
          await rpc(client, "record_erection_progress", { target_spool_revision_id: spoolRevision(action.spool), target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        }
        break
      case "material_check": {
        const revision = spoolRevision(action.spool)
        await rpc(client, "record_material_check", { target_spool_revision_id: revision, target_checked_on: date, target_items: await materialCheckItemsFor(client, revision), target_idempotency_key: key })
        break
      }
      case "weld":
        if (action.requiresRevision && !ctx.ids.weldJointRevision(action.weld)) throw new Skip("revision R1 is not imported yet")
        await weld(ctx, action, key, date)
        break
      case "support":
      case "field_support_probe": {
        const { data, error } = await client.from("support_revisions").select("id").eq("spool_revision_id", spoolRevision(action.spool)).eq("is_removed", false)
        if (error) throw new Error(error.message)
        for (const support of data ?? []) {
          await rpc(client, action.kind === "support" ? "record_support_progress" : "record_field_support_progress", { target_support_revision_id: support.id, installed_on: date, idempotency_key: actionKey(week, action, support.id) })
        }
        break
      }
      case "pwht": {
        const revision = spoolRevision(action.spool)
        const requirements = await client.from("pwht_requirements").select("id").eq("spool_revision_id", revision)
        if (requirements.error) throw new Error(requirements.error.message)
        const accepted = await client.from("pwht_results").select("pwht_requirement_id").eq("outcome", "accepted").in("pwht_requirement_id", (requirements.data ?? []).map((row) => row.id))
        if (accepted.error) throw new Error(accepted.error.message)
        const done = new Set((accepted.data ?? []).map((row) => row.pwht_requirement_id))
        const open = (requirements.data ?? []).filter((row) => !done.has(row.id))
        if (open.length === 0) throw new Skip("no open PWHT requirement")
        for (const [index, requirement] of open.entries()) {
          await rpc(client, "record_pwht_result", { target_requirement_id: requirement.id, chart_number: `PWHT-${action.spool}-${index + 1}`, performed_on: date, outcome: "accepted", idempotency_key: actionKey(week, action, requirement.id) })
        }
        break
      }
      case "qc_release":
        await rpc(client, "release_quality_record", { target_spool_revision_id: spoolRevision(action.spool), released_on: date, idempotency_key: key })
        break
      case "paint":
        await rpc(client, "record_paint_progress", {
          target_spool_revision_id: spoolRevision(action.spool),
          line_service_id: ctx.ids.lineService(LINE_SERVICE),
          details: { painted_on: date, final_qc_on: addDays(ctx.startDate, action.finalQcDay), measured_dft_microns: 260, w10p_form_number: `W10P-${action.spool}` },
          idempotency_key: key,
        })
        break
      case "laydown":
        await rpc(client, "record_laydown", { target_spool_revision_id: spoolRevision(action.spool), location_id: ctx.ids.location("LAYDOWN-A"), stored_on: date, idempotency_key: key })
        break
      case "tracking":
        await rpc(client, "record_location_event", {
          p_project_id: ctx.ids.projectId, p_spool_id: required(ctx.ids.spool(action.spool), action.spool), p_location_id: ctx.ids.location(action.location),
          p_device_id: null, p_direction: action.direction, p_occurred_at: `${date}T${action.direction === "in" ? "08" : "16"}:00:00Z`,
          p_reason: null, p_compensates_event_id: null, p_idempotency_key: key,
        })
        break
      case "flange":
        await rpc(client, "record_flange_progress", {
          target_project_id: ctx.ids.projectId, target_flange_joint_revision_id: required(ctx.ids.flangeJointRevision(action.flange), action.flange),
          target_joint_category_id: ctx.ids.jointCategory(action.category), target_torquing_requirement_id: ctx.ids.torquing("MANUAL-TORQUE"),
          target_jointing_value: 450, target_joint_date: date, target_report_number: `BT-${action.flange}`, target_tag_number: `TAG-${action.flange}`,
          target_jointer_ids: [ctx.ids.team("jointer")], target_idempotency_key: key,
        })
        break
      case "nde_round":
        if (action.requiresRevision && !ctx.ids.weldJointRevision(REVISION_WELD)) throw new Skip("revision R1 is not imported yet")
        if (!(await ndeRound(ctx, action, week, date))) throw new Skip("no pending NDE obligations")
        break
      case "line_check": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const request = await rpc(client, "assign_line_check", { target_test_pack_id: packId, target_isometric_ids: await packMembers(ctx, packId), target_team_id: ctx.ids.team("line_check"), target_assigned_on: date, target_idempotency_key: key })
        const resultDate = addDays(ctx.startDate, action.resultDay)
        for (const isometricId of await packMembers(ctx, packId)) {
          const isoNumber = [...action.punches.map((punch) => punch.iso)].find((number) => ctx.ids.iso(number) === isometricId)
          const punches = action.punches.filter((punch) => punch.iso === isoNumber).map((punch) => ({ punch_code_id: ctx.ids.punchCode(), description: punch.description, checking_date: resultDate }))
          await rpc(client, "record_line_check_result", { target_request_id: request.id, target_isometric_id: isometricId, target_completed_on: resultDate, target_punches: punches, target_idempotency_key: actionKey(week, action, isometricId) })
        }
        break
      }
      case "item_clearance": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const punches = await client.from("punch_items").select("id").eq("test_pack_id", packId)
        if (punches.error) throw new Error(punches.error.message)
        const cleared = await client.from("punch_item_clearances").select("punch_item_id").in("punch_item_id", (punches.data ?? []).map((row) => row.id))
        if (cleared.error) throw new Error(cleared.error.message)
        const done = new Set((cleared.data ?? []).map((row) => row.punch_item_id))
        const open = (punches.data ?? []).map((row) => row.id).filter((id) => !done.has(id))
        if (open.length === 0) throw new Skip("no open punch items")
        const request = await rpc(client, "assign_item_clearance", { target_test_pack_id: packId, target_punch_item_ids: open, target_team_id: ctx.ids.team("finishing"), target_assigned_on: date, target_idempotency_key: key })
        for (const punchId of open) {
          await rpc(client, "record_punch_clearance", { target_request_id: request.id, target_punch_item_id: punchId, target_cleared_on: addDays(ctx.startDate, action.clearDay), target_idempotency_key: actionKey(week, action, punchId) })
        }
        break
      }
      case "blinding": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const request = await rpc(client, "assign_blinding", { target_test_pack_id: packId, target_team_id: ctx.ids.team("blinding"), target_assigned_on: date, target_idempotency_key: key })
        await rpc(client, "record_blinding", { target_request_id: request.id, target_completed_on: addDays(ctx.startDate, action.recordDay), target_idempotency_key: actionKey(week, action, "record") })
        break
      }
      case "pressure_stage":
        await rpc(client, "record_pressure_test_stage", { target_test_pack_id: required(ctx.ids.testPack(action.testPack), action.testPack), target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        break
      case "reinstatement": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const members = await packMembers(ctx, packId)
        const targets = await client.from("flange_joint_readiness").select("flange_joint_revision_id, flange_number")
          .in("isometric_id", members).eq("revision_status", "accepted").eq("is_removed", false).eq("requires_reinstatement", true).eq("category_code", action.category)
        if (targets.error) throw new Error(targets.error.message)
        const rows = (targets.data ?? []) as { flange_joint_revision_id: string; flange_number: string }[]
        if (rows.length === 0) throw new Skip(`no ${action.category} flanges in the pack`)
        const request = await rpc(client, "assign_reinstatement", { target_test_pack_id: packId, target_flange_joint_revision_ids: rows.map((row) => row.flange_joint_revision_id), target_team_id: ctx.ids.team("reinstatement"), target_assigned_on: date, target_idempotency_key: key })
        for (const row of rows) {
          await rpc(client, "record_reinstatement", {
            target_request_id: request.id, target_flange_joint_revision_id: row.flange_joint_revision_id, target_joint_date: addDays(ctx.startDate, action.recordDay),
            target_report_number: `RI-${row.flange_number}`, target_jointer_team_id: ctx.ids.team("jointer"), target_tag_number: `TAG-${row.flange_number}`,
            target_idempotency_key: actionKey(week, action, row.flange_joint_revision_id),
          })
        }
        break
      }
      case "revision": {
        const files = { weld: readFixtureText("revision/weld.txt"), trace: readFixtureText("revision/trace.txt"), bolt: readFixtureText("revision/bolt.txt"), supp: readFixtureText("revision/supp.txt") }
        await importSpoolgenPackage(client, ctx.ids.projectId, files, "UPG-1 R1", { decision: "done_without_modification" })
        await ctx.ids.reload()
        break
      }
    }
    return { action, outcome: "done" }
  } catch (error) {
    if (error instanceof Skip) return { action, outcome: "skipped", message: error.message }
    const code = (error as { code?: string }).code
    const expected = EXPECTED_REFUSALS[action.kind] !== undefined
    return { action, outcome: "refused", code, message: error instanceof Error ? error.message : String(error), expected }
  }
}
```

- [ ] **Step 5: Write `run-week.ts`**

```ts
// scripts/upg/run-week.ts
/**
 * demo:week — one construction week of UPG-1.
 *
 *   npm run demo:week -- --project UPG-1 --week 3 [--include-manual]
 *
 * Manual actions (the thread, TP-100-01, the revision import) are listed for the walkthrough,
 * not executed, unless --include-manual (the stage A dry run). Exit code 1 only when a refusal
 * is not one of EXPECTED_REFUSALS.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { UPG_PROJECT } from "./dataset"
import { addDays, UPG_FIXTURE_DIR } from "./files"
import { executeAction, summarizeRun, type ActionResult } from "./execute"
import { loadIds } from "./ids"
import { findProjectId, readUpgEnv, signInOperator } from "./operator"
import { UPG_WEEK_COUNT, buildWeekPlan, describeAction } from "./weeks"

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<number> {
  const week = Number(argument("--week"))
  if (!Number.isInteger(week) || week < 1 || week > UPG_WEEK_COUNT) throw new Error(`Use --week 1…${UPG_WEEK_COUNT}.`)
  const includeManual = process.argv.includes("--include-manual")
  const projectCode = argument("--project") ?? UPG_PROJECT.activityCode
  const env = readUpgEnv()
  const client = await signInOperator(env)
  const projectId = await findProjectId(client, projectCode)
  if (!projectId) throw new Error(`Project ${projectCode} does not exist.`)
  const startDate = (JSON.parse(readFileSync(join(UPG_FIXTURE_DIR, "manifest.json"), "utf8")) as { startDate: string }).startDate
  const ids = await loadIds(client, projectId)

  const plan = buildWeekPlan(week, true)
  const results: ActionResult[] = []
  for (const action of plan) {
    if (action.manual && !includeManual) {
      results.push({ action, outcome: "skipped", message: "manual" })
      continue
    }
    results.push(await executeAction({ client, ids, startDate }, action))
  }

  const first = addDays(startDate, (week - 1) * 7)
  const last = addDays(startDate, week * 7 - 1)
  const summary = summarizeRun(results)
  console.log(`\nНеделя ${week} (${first} … ${last}), проект ${projectCode}`)
  console.log(`  выполнено ${summary.done}, пропущено ${summary.skipped}, отказов ${summary.refused} (неожиданных ${summary.unexpected.length})`)
  console.log(`  ситуации: ${summary.situations.join(", ") || "—"}`)
  const manual = results.filter((result) => result.message === "manual")
  if (manual.length > 0) {
    console.log("  Руками на этой неделе:")
    for (const result of manual) console.log(`    - ${addDays(startDate, result.action.day)} ${describeAction(result.action)}`)
  }
  const other = results.filter((result) => result.outcome === "skipped" && result.message !== "manual")
  if (other.length > 0) {
    console.log("  Пропущено:")
    for (const result of other) console.log(`    - ${describeAction(result.action)}: ${result.message}`)
  }
  const refusals = results.filter((result) => result.outcome === "refused")
  if (refusals.length > 0) {
    console.log("  Отказы:")
    for (const result of refusals) {
      console.log(`    - ${addDays(startDate, result.action.day)} ${describeAction(result.action)}: ${result.code ?? "?"} ${result.message}${result.expected ? " (ожидаемо)" : ""}`)
    }
  }
  return summary.unexpected.length > 0 ? 1 : 0
}

main().then((code) => process.exit(code)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
```

Добавить в `package.json` → `scripts`: `"demo:week": "tsx --env-file-if-exists=.env.local scripts/upg/run-week.ts"`.

- [ ] **Step 6: Run tests, typecheck, lint, full unit suite**

Run: `node --import tsx --test scripts/upg/execute.test.ts`
Expected: PASS, 4 теста.

Run: `npm run typecheck && npx eslint scripts/upg && npm run test:unit`
Expected: 0 ошибок типов и lint. Unit — все зелёные: было 638, плюс новые тесты `scripts/upg`.

- [ ] **Step 7: Commit and stop**

```bash
git add scripts/upg/ids.ts scripts/upg/execute.ts scripts/upg/execute.test.ts scripts/upg/run-week.ts package.json
git commit -m "feat(demo): demo:week runs one UPG-1 construction week through the UI's commands"
```

Исполнитель здесь останавливается и пишет короткий отчёт:
- коммиты;
- результаты тестов;
- отступления от плана с причинами.

Задачу 7 не начинать.

---

### Task 7: Проверочный прогон (выполняет Claude, после подтверждения владельца)

**Files:**
- Create: `docs/acceptance/2026-10-09-upg-dry-run.md`

Этот шаг стирает данные локального стенда, включая SHOWCASE-1. Перед шагом 1 Claude спрашивает владельца и ждёт явного «да».

- [ ] **Step 1: Reset the stand**

Run: `npm run demo:prepare -- --confirm-local-reset`
Expected: все проверки `PASS`.

- [ ] **Step 2: Load UPG-1 by script**

Run: `npm run demo:project-load -- --project UPG-1 --create-project`
Expected:
- проект создан;
- справочники подготовлены;
- файлы `01`–`05` применены;
- 2 правила PWHT;
- WPS перенесены в прошлое;
- набор с ошибкой `blocked`;
- R0 `applied` с одним предупреждением WPS;
- `06-test-packs.xlsx` применён.

Каждый отказ записать в отчёт. Если отказ не даёт идти дальше — остановиться и обсудить с владельцем.

- [ ] **Step 3: Run the eight weeks with the manual part**

Run: `for week in 1 2 3 4 5 6 7 8; do npm run demo:week -- --project UPG-1 --week $week --include-manual || break; done`
Expected: каждая неделя завершается с кодом 0. Единственный ожидаемый отказ — `field_support_probe` (L3). Неожиданный отказ — остановка: разобрать причину и решить с владельцем:
- если ошибка в данных или плане, исправить скрипт;
- если ошибка в приложении, это находка для журнала. Скрипт её не обходит.

- [ ] **Step 4: Check the end state (read-only SQL)**

```sql
BEGIN READ ONLY;
SELECT test_pack_number, is_rft, weld_or_support_pending_count, x_open_count FROM test_pack_readiness r JOIN projects p ON p.id = r.project_id WHERE p.activity_code = 'UPG-1' ORDER BY 1;
SELECT t.test_pack_number, e.stage, e.occurred_on FROM pressure_test_stage_events e JOIN test_packs t ON t.id = e.test_pack_id ORDER BY 1, 3;
SELECT count(*) FROM flange_reinstatement_records;
COMMIT;
```

Ожидается:
- TP-100-01 и TP-100-02 — пусконаладка записана, Z восстановлены;
- TP-200-01 — испытание завершено, Y нет;
- TP-200-02 — готов к испытанию, заглушек нет;
- TP-300-01 и TP-300-02 — не готовы.

Катушка `UPG-300-3009-S1` есть в оповещениях «в пути» (`loadTrackingTransitAlerts`).

- [ ] **Step 5: Write the report and show it**

В `docs/acceptance/2026-10-09-upg-dry-run.md`:
- итог каждой недели (что выполнено, ситуации, отказы);
- конечное состояние пакетов;
- найденные по пути расхождения с мануалом — заготовка для журнала прохода.

Открыть `http://localhost:3000/?p=UPG-1` в видимом браузере и показать владельцу обзор проекта.

```bash
git add docs/acceptance/2026-10-09-upg-dry-run.md
git commit -m "docs(acceptance): UPG-1 dry run — every week through the real commands"
```

Перед B1 стенд снова сбрасывается, тоже с подтверждением владельца: в проходе проект заводится руками через интерфейс.
