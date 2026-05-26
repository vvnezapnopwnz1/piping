# Единый канонический источник моковых данных PipeQC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Свести все демо-данные приложения к одному каноническому источнику (`lib/fixtures/`), где 14 hero-спулов описаны один раз и проецируются в срезы каждого модуля, так что данные консистентны между модулями и покрывают все статусы.

**Architecture:** `lib/fixtures/spine.ts` хранит дерево `TEST_PACK→ISO→SPOOL→PIECE/WELD→NDE_BATCH→PUNCH` (db_.md). `lib/fixtures/referential.ts` реэкспортирует источники правды (Admin/Referential). Чистые `derive/*.ts` проецируют spine в плоские `*_SEED`-константы прежних имён через `lib/fixtures/index.ts`. Стора и доменные типы не меняются — меняется только происхождение данных. `validate.ts` (запуск через `npm run validate:fixtures`) проверяет ссылочную целостность — это автоматизация «проверок соответствия правилам Admin/Referential».

**Tech Stack:** TypeScript, Next.js (App Router), Zustand-стора (localStorage persist), `tsx` для запуска валидатора. Тест-фреймворка в проекте нет — валидатор-скрипт играет роль теста в TDD-петле.

**Спецификация:** `docs/superpowers/specs/2026-05-26-unified-mock-data-fixtures-design.md` (читать перед началом).

---

## Важные инварианты (соблюдать во всех задачах)

1. **Не менять доменные типы и сигнатуры стора.** Если derive не сходится по типу — чинить derive, НЕ тип.
2. **Прежние имена `*_SEED` сохранить.** Стора и UI импортируют их; перенаправляется только источник.
3. **Каждый heat в spine ∈ `pipingMaterialList`** — кроме pieces с `intentionallyInvalid: true`.
4. **Каноническая схема spool:** `PL-<система>-<NNN>-<X>`, системы `CW200`/`FU300`/`TK100`.
5. **Коммитить часто** — после каждой зелёной задачи.

## Карта файлов

**Создать:**
- `lib/admin-seed.ts` — чистые seed-данные Admin, вынесенные из `store/admin-store.ts` (разрыв цикла store↔lib)
- `lib/fixtures/spine.ts` — типы спайна + 14 hero-спулов
- `lib/fixtures/referential.ts` — реэкспорт источников правды
- `lib/fixtures/derive/fabrication.ts`
- `lib/fixtures/derive/erection.ts`
- `lib/fixtures/derive/nde.ts`
- `lib/fixtures/derive/testpack.ts`
- `lib/fixtures/index.ts` — публичный API (`*_SEED` под прежними именами)
- `lib/fixtures/validate.ts` — функция `validateFixtures()`
- `lib/fixtures/validate.run.ts` — CLI-обёртка для `npm run validate:fixtures`

**Модифицировать:**
- `store/admin-store.ts` — импортировать seeds из `lib/admin-seed.ts`; расширить `pipingMaterialList`
- `lib/spool-data.ts`, `lib/erection-stage.ts`, `lib/weld-data.ts`, `lib/erection-weld-data.ts`, `lib/nde-data.ts`, `lib/testpack-seed.ts`, `lib/pressure-test-data.ts` — заменить inline-сиды реэкспортом из `@/fixtures` (или удалить, перенаправив импорты сторов)
- `package.json` — devDependency `tsx` + скрипт `validate:fixtures`

**НЕ трогать:** `components/**`, файлы сторов в `store/**` (кроме admin-store), доменные типы.

---

## Phase A — Каркас и валидатор-харнесс (TDD-гейт)

### Task A1: Подключить tsx и npm-скрипт валидатора

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Установить tsx как dev-зависимость**

Run:
```bash
npm install --save-dev tsx
```
Expected: `tsx` появляется в `devDependencies`, `package-lock.json` обновлён.

- [ ] **Step 2: Добавить скрипт в package.json**

В блок `"scripts"` добавить строку:
```json
"validate:fixtures": "tsx lib/fixtures/validate.run.ts"
```

- [ ] **Step 3: Проверить, что скрипт зарегистрирован**

Run: `npm run validate:fixtures` 
Expected: FAIL — `Cannot find module '.../lib/fixtures/validate.run.ts'` (файла ещё нет). Это ожидаемый «красный» старт.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add tsx and validate:fixtures script"
```

---

### Task A2: Валидатор-скелет и CLI-обёртка (контракт целостности)

Валидатор пишется ДО данных — он задаёт контракт. На пустых данных он вернёт ошибки → красный → данные строятся, пока не позеленеет.

**Files:**
- Create: `lib/fixtures/validate.ts`
- Create: `lib/fixtures/validate.run.ts`

- [ ] **Step 1: Написать `validate.ts` с полным набором инвариантов**

```ts
// lib/fixtures/validate.ts
import { SPINE } from "./spine"
import {
  PIPING_MATERIAL_LIST,
  MATERIAL_TYPE_CODES,
  ACTIVE_WELDER_CODES,
  ACTIVE_WPS,
  NDE_MATRIX_RULES,
  SUBCONTRACTOR_CODES,
  PDS_AREA_CODES,
} from "./referential"

export interface ValidationIssue {
  spoolNo: string
  field: string
  message: string
}

export function validateFixtures(): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const heats = new Set(PIPING_MATERIAL_LIST.map((h) => h.heatNo))
  const welders = new Set(ACTIVE_WELDER_CODES)
  const wpsCodes = new Set(ACTIVE_WPS.map((w) => w.code))
  const materials = new Set(MATERIAL_TYPE_CODES)
  const subs = new Set(SUBCONTRACTOR_CODES)
  const pdsAreas = new Set(PDS_AREA_CODES)

  const seenSpools = new Set<string>()
  const isoToTestPack = new Map<string, string | undefined>()

  for (const spool of SPINE) {
    const at = (field: string, message: string) =>
      issues.push({ spoolNo: spool.spoolNo, field, message })

    // (4) уникальность spoolNo
    if (seenSpools.has(spool.spoolNo)) at("spoolNo", "duplicate spoolNo")
    seenSpools.add(spool.spoolNo)

    // naming convention PL-<sys>-<NNN>-<X>
    if (!/^PL-(CW200|FU300|TK100)-\d{3}-[A-Z]$/.test(spool.spoolNo)) {
      at("spoolNo", `does not match PL-<system>-<NNN>-<X>`)
    }

    // (8) material ∈ materialTypes
    if (!materials.has(spool.material)) {
      at("material", `material "${spool.material}" not in systemReferentials.materialTypes`)
    }

    // (5) ISO → ровно один TestPack
    if (isoToTestPack.has(spool.isoNo)) {
      const existing = isoToTestPack.get(spool.isoNo)
      if (existing !== spool.testPackNo) {
        at("testPackNo", `ISO ${spool.isoNo} maps to conflicting test packs`)
      }
    } else {
      isoToTestPack.set(spool.isoNo, spool.testPackNo)
    }

    // (1) heat ∈ pipingMaterialList (кроме intentionallyInvalid)
    for (const piece of spool.pieces) {
      if (piece.intentionallyInvalid) continue
      if (!heats.has(piece.heatNo)) {
        at("pieces.heatNo", `heat "${piece.heatNo}" (piece ${piece.id}) not in pipingMaterialList`)
      }
    }

    // (2,3,6) welds
    for (const weld of spool.welds) {
      if (!welders.has(weld.welderId)) {
        at("welds.welderId", `welder "${weld.welderId}" (weld ${weld.weldNo}) not an active qualification`)
      }
      if (!wpsCodes.has(weld.wps)) {
        at("welds.wps", `WPS "${weld.wps}" (weld ${weld.weldNo}) not active`)
      }
      if (weld.ndeMethod) {
        const allowed = new Set(NDE_MATRIX_RULES.flatMap((r) => [r.primaryMethod, r.secondaryMethod].filter(Boolean)))
        if (!allowed.has(weld.ndeMethod)) {
          at("welds.ndeMethod", `NDE method "${weld.ndeMethod}" (weld ${weld.weldNo}) not in NDE_MATRIX`)
        }
      }
      if (weld.ndeResult === "Rejected" && !weld.reworkCode) {
        at("welds.reworkCode", `rejected weld ${weld.weldNo} has no reworkCode`)
      }
    }

    // (7) ссылки subcontractor / PDS area
    if (spool.subcontractorCode && !subs.has(spool.subcontractorCode)) {
      at("subcontractorCode", `subcontractor "${spool.subcontractorCode}" not in admin`)
    }
    if (spool.pdsAreaCode && !pdsAreas.has(spool.pdsAreaCode)) {
      at("pdsAreaCode", `PDS area "${spool.pdsAreaCode}" not in admin`)
    }

    // (9) punch items
    for (const punch of spool.punches ?? []) {
      if (!["X", "Y", "Z"].includes(punch.category)) {
        at("punches.category", `punch ${punch.punchId} category must be X/Y/Z`)
      }
      if (!spool.testPackNo) {
        at("punches", `punch ${punch.punchId} on spool without testPackNo`)
      }
    }
  }

  return issues
}
```

- [ ] **Step 2: Написать `validate.run.ts` (CLI)**

```ts
// lib/fixtures/validate.run.ts
import { validateFixtures } from "./validate"

const issues = validateFixtures()
if (issues.length === 0) {
  console.log("✓ fixtures valid — 0 issues")
  process.exit(0)
}
console.error(`✗ ${issues.length} fixture issue(s):`)
for (const i of issues) {
  console.error(`  [${i.spoolNo}] ${i.field}: ${i.message}`)
}
process.exit(1)
```

- [ ] **Step 3: Запустить — ожидаем падение из-за отсутствующих spine/referential**

Run: `npm run validate:fixtures`
Expected: FAIL — ошибка импорта `./spine` / `./referential` (модулей ещё нет). Красный гейт установлен; далее строим данные.

- [ ] **Step 4: Commit**

```bash
git add lib/fixtures/validate.ts lib/fixtures/validate.run.ts
git commit -m "test: add fixture referential-integrity validator"
```

---

## Phase B — Источники правды (referential)

### Task B1: Вынести inline-сиды Admin в `lib/admin-seed.ts` (разрыв цикла)

`store/admin-store.ts` сейчас определяет seed-данные inline. `lib/fixtures/referential.ts` не может импортировать из `store/` без риска цикла (стора уже импортируют `lib/`). Выносим чистые данные в `lib/`.

**Files:**
- Create: `lib/admin-seed.ts`
- Modify: `store/admin-store.ts` (строки ~200-470 — определения SEED_* и seed*-функций)

- [ ] **Step 1: Перенести в `lib/admin-seed.ts` следующие сущности из `store/admin-store.ts`**

Перенести БЕЗ изменения значений (вырезать из admin-store, вставить в admin-seed, экспортировать):
`SEED_SUBCONTRACTORS`, `SEED_PROJECT_DEFINITION`, `SEED_SYSTEM_REFERENTIALS`, функции `seedTeams`, `seedPdsAreas`, `seedPipingMaterialList`, `seedAccessRights`, и связанные хелперы (`entry`, `ALPHA_NAMES`). Также перенести типы, которые они используют, если те объявлены в admin-store и нигде больше (`Subcontractor`, `ProjectDefinition`, `SystemReferentials`, `SysRefEntry`, `PdsArea`, `HeatRecord`, `Team`, `TeamType`, `AccessRightsRow`) — ЛИБО оставить типы в admin-store и импортировать их в admin-seed. Выбрать вариант с наименьшим числом правок импортов; проверить `npx tsc --noEmit`.

- [ ] **Step 2: В `store/admin-store.ts` заменить inline-определения импортом**

```ts
import {
  SEED_SUBCONTRACTORS,
  SEED_PROJECT_DEFINITION,
  SEED_SYSTEM_REFERENTIALS,
  seedTeams,
  seedPdsAreas,
  seedPipingMaterialList,
  seedAccessRights,
} from "@/lib/admin-seed"
```
Удалить перенесённые определения из admin-store. Остальной код стора (actions, persist) не трогать.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS (0 ошибок). Если есть ошибки импортов типов — поправить пути, не значения.

- [ ] **Step 4: Commit**

```bash
git add lib/admin-seed.ts store/admin-store.ts
git commit -m "refactor: extract admin seed data to lib/admin-seed (break store<->lib cycle)"
```

---

### Task B2: Расширить Piping Material List под все heat спайна

Spine использует реалистичные heat (`HT-CS-A106B-44210` и т.п.). Чтобы Material Check показывал «in Project Piping Material List», admin-список должен их содержать. Здесь задаётся каноничный пул heat, на который будет ссылаться spine (Task C2).

**Files:**
- Modify: `lib/admin-seed.ts` (`seedPipingMaterialList`)

- [ ] **Step 1: Заменить тело `seedPipingMaterialList` на расширенный пул**

Каждая запись — `Omit<HeatRecord,"active"|"createdAt">`. Покрыть 3 системы. `material` обязан совпадать с кодами `SEED_SYSTEM_REFERENTIALS.materialTypes` (`CS-A106B`, `SS-316L`, `CS-P91`, `LTCS-A333`).

```ts
const rows: Omit<HeatRecord, "active" | "createdAt">[] = [
  // CW200 — Cooling Water (CS-A106B)
  { heatNo: "HT-CS-A106B-44210", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2203", supplier: "Gulf Steel Trading" },
  { heatNo: "HT-CS-A106B-44211", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2204", supplier: "Gulf Steel Trading" },
  { heatNo: "HT-CS-A106B-44212", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2205", supplier: "Arabian Pipe Mills" },
  { heatNo: "HT-CS-A106B-44213", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2206", supplier: "Arabian Pipe Mills" },
  { heatNo: "HT-CS-A106B-44214", material: "CS-A106B", grade: "Grade B", millCertRef: "MILL-2026-2211", supplier: "Gulf Steel Trading" },
  // FU300 — Fuel Gas (LTCS-A333) + опц. P91 для alloy/PWHT-кейса
  { heatNo: "HT-LTCS-A333-60010", material: "LTCS-A333", grade: "Gr. 6", millCertRef: "MILL-2026-6001", supplier: "Cryo Pipe Industries" },
  { heatNo: "HT-LTCS-A333-60011", material: "LTCS-A333", grade: "Gr. 6", millCertRef: "MILL-2026-6002", supplier: "Cryo Pipe Industries" },
  { heatNo: "HT-CS-P91-99814", material: "CS-P91", grade: "P91", millCertRef: "MILL-2026-1105", supplier: "HighTemp Metals Co." },
  { heatNo: "HT-CS-P91-99815", material: "CS-P91", grade: "P91", millCertRef: "MILL-2026-1106", supplier: "HighTemp Metals Co." },
  // TK100 — Tank Farm (SS-316L)
  { heatNo: "HT-SS-316L-55120", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3841", supplier: "Stainless Gulf LLC" },
  { heatNo: "HT-SS-316L-55140", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3848", supplier: "Stainless Gulf LLC" },
  { heatNo: "HT-SS-316L-55141", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3849", supplier: "Euro Alloy Supply" },
  { heatNo: "HT-SS-316L-55150", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3851", supplier: "Euro Alloy Supply" },
  { heatNo: "HT-SS-316L-55151", material: "SS-316L", grade: "316L", millCertRef: "MILL-2026-3852", supplier: "Stainless Gulf LLC" },
]
```
> Точный набор heat должен совпасть с тем, что реально использует spine (Task C2). Если в C2 появится новый heat — добавить его сюда. Валидатор это и ловит.

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/admin-seed.ts
git commit -m "feat: expand piping material list to cover hero-spool heats"
```

---

### Task B3: `referential.ts` — реэкспорт источников правды

**Files:**
- Create: `lib/fixtures/referential.ts`

- [ ] **Step 1: Написать модуль**

```ts
// lib/fixtures/referential.ts — единый доступ к источникам правды (Admin/Referential)
import { WPS_LIST, NDE_MATRIX, REWORK_CODES } from "@/lib/engineering-references"
import { WELDER_QUALIFICATIONS } from "@/lib/welder-qualifications"
import {
  SEED_SUBCONTRACTORS,
  SEED_SYSTEM_REFERENTIALS,
  seedPdsAreas,
  seedPipingMaterialList,
} from "@/lib/admin-seed"

export const PIPING_MATERIAL_LIST = seedPipingMaterialList()
export const MATERIAL_TYPE_CODES = SEED_SYSTEM_REFERENTIALS.materialTypes.map((e) => e.code)
export const ACTIVE_WPS = WPS_LIST.filter((w) => w.status === "Active")
export const NDE_MATRIX_RULES = NDE_MATRIX
export const REWORK_CODE_LIST = REWORK_CODES
export const ACTIVE_WELDER_CODES = WELDER_QUALIFICATIONS.map((w) => w.welderCode)
export const SUBCONTRACTOR_CODES = SEED_SUBCONTRACTORS.map((s) => s.code)
export const PDS_AREA_CODES = seedPdsAreas().map((a) => a.code)
```
> Проверить точное имя поля кода сварщика в `WELDER_QUALIFICATIONS` (`welderCode`) — открыть `lib/welder-qualifications.ts` и при необходимости поправить.

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/fixtures/referential.ts
git commit -m "feat: add fixtures referential source-of-truth module"
```

---

## Phase C — Spine (14 hero-спулов)

### Task C1: Типы спайна

**Files:**
- Create: `lib/fixtures/spine.ts` (только типы на этом шаге)

- [ ] **Step 1: Объявить типы спайна**

```ts
// lib/fixtures/spine.ts
import type { SpoolFabStage } from "@/lib/spool-data"
import type { SpoolErectionStage } from "@/lib/erection-stage"

export type SpineSystem = "CW200" | "FU300" | "TK100"

export interface SpinePiece {
  id: string
  tag: string
  kind: "Pipe Stub" | "Fitting" | "Flange" | "Weld Stub" | "Pipe"
  heatNo: string
  millCertRef?: string
  mcStatus: "Pending" | "Cleared" | "Non-conformance"
  ncRemark?: string
  /** true → валидатор пропускает heat-проверку (намеренный демо-кейс «not in list») */
  intentionallyInvalid?: boolean
}

export interface SpineWeld {
  weldNo: string
  type: "SHOP" | "FIELD"
  jointType: "Butt Weld" | "Socket Weld" | "Flange Bolt"
  welderId: string
  wps: string
  ndeBatchId?: string
  ndeMethod?: "RT" | "UT" | "PT" | "MT" | "VT"
  ndeResult?: "Accepted" | "Rejected" | "Pending"
  reworkCode?: string
}

export interface SpinePunch {
  punchId: string
  category: "X" | "Y" | "Z"
  description: string
}

export interface SpineSpool {
  spoolNo: string
  system: SpineSystem
  material: string            // код из materialTypes: CS-A106B / SS-316L / CS-P91 / LTCS-A333
  isoNo: string
  testPackNo?: string
  fabStage: SpoolFabStage
  erectionStage?: SpoolErectionStage
  /** true → есть hold на QC Release (демо-кейс #8) */
  qcHold?: boolean
  subcontractorCode?: string  // ∈ admin SUBCONTRACTOR_CODES
  pdsAreaCode?: string        // ∈ admin PDS_AREA_CODES
  pieces: SpinePiece[]
  welds: SpineWeld[]
  punches?: SpinePunch[]
}

export const SPINE: SpineSpool[] = [] // наполняется в Task C2
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/fixtures/spine.ts
git commit -m "feat: add spine entity types"
```

---

### Task C2: Наполнить SPINE 14 спулами

Транскрибировать ростер из спеки (§4) в объекты `SpineSpool`. Это механическая работа, гейт корректности — валидатор (Task A2) и typecheck. Ниже — два полностью прописанных спула как образец паттерна; остальные 12 строить по тому же паттерну согласно таблице ростера в спеке. Каждый heat (кроме `intentionallyInvalid`) обязан присутствовать в `lib/admin-seed.ts` `seedPipingMaterialList` (Task B2) — если добавляете heat, добавьте его и туда.

**Files:**
- Modify: `lib/fixtures/spine.ts` (заполнить массив `SPINE`)

- [ ] **Step 1: Заполнить `SPINE`. Образцы (спулы #2 OK и #3 NC):**

```ts
export const SPINE: SpineSpool[] = [
  // #1 PL-CW200-001-A — Spooling/Engineering (в фабрикацию не вошёл)
  {
    spoolNo: "PL-CW200-001-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Not Started",
    pieces: [], welds: [],
  },
  // #2 PL-CW200-002-A — Material Check OK
  {
    spoolNo: "PL-CW200-002-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Material Check",
    pieces: [
      { id: "P-CW200-002-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-A106B-44210", millCertRef: "MILL-2026-2203", mcStatus: "Cleared" },
      { id: "P-CW200-002-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-CS-A106B-44211", millCertRef: "MILL-2026-2204", mcStatus: "Cleared" },
    ],
    welds: [],
  },
  // #3 PL-CW200-003-A — Material Check с NC + намеренно невалидный heat
  {
    spoolNo: "PL-CW200-003-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Material Check",
    pieces: [
      { id: "P-CW200-003-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-A106B-44212", millCertRef: "MILL-2026-2205", mcStatus: "Cleared" },
      { id: "P-CW200-003-A-2", tag: "FIT-1", kind: "Fitting", heatNo: "HT-UNREGISTERED-9999",
        mcStatus: "Non-conformance", ncRemark: "Mill cert missing — heat not in piping material list",
        intentionallyInvalid: true },
    ],
    welds: [],
  },
  // #4..#14 — по паттерну, согласно таблице ростера спеки §4.
  // Для каждого: pieces с heat ∈ pipingMaterialList; welds с welderId ∈ ACTIVE_WELDER_CODES,
  // wps ∈ ACTIVE_WPS; для NDE-кейсов задать ndeBatchId/ndeMethod/ndeResult (+reworkCode при Rejected);
  // для #8 qcHold:true; для #10..#14 testPackNo; для #14 punches X/Y/Z.
]
```

- [ ] **Step 2: Запустить валидатор — чинить до зелёного**

Run: `npm run validate:fixtures`
Expected: вначале возможны ошибки (heat не в списке, welder/wps неизвестны). Чинить данные: добавить heat в `lib/admin-seed.ts` (Task B2) или поправить ссылку в spine. Повторять до `✓ fixtures valid — 0 issues`.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/fixtures/spine.ts lib/admin-seed.ts
git commit -m "feat: populate spine with 14 hero spools"
```

---

## Phase D — Derive-функции и публичный API

> **Перед каждой derive-задачей:** открыть файл-источник типа (указан в задаче), скопировать точную сигнатуру возвращаемого типа. derive ОБЯЗАН вернуть ровно этот тип. Гейт — `npx tsc --noEmit` + `npm run validate:fixtures` + ручная сверка количества записей.

### Task D1: derive/fabrication.ts

**Files:**
- Create: `lib/fixtures/derive/fabrication.ts`
- Reference types: `lib/spool-data.ts` (`MaterialCheckRecord`/`HeatPiece` :43-60, `PaintRecord` :179-189, `QCReleaseRecord` ~:317, `LaydownRecord` ~:382), `lib/weld-data.ts` (`WeldJoint` :28)

- [ ] **Step 1: Реализовать derive для Material Check (полный образец)**

```ts
// lib/fixtures/derive/fabrication.ts
import { SPINE } from "../spine"
import {
  type MaterialCheckRecord,
  type HeatPiece,
  STAGE_ORDER,
} from "@/lib/spool-data"

const fabRank = (stage: string) => STAGE_ORDER.indexOf(stage as never)

export function deriveMaterialCheckSeed(): MaterialCheckRecord[] {
  return SPINE
    .filter((s) => fabRank(s.fabStage) >= fabRank("Material Check") && s.pieces.length > 0)
    .map((s) => {
      const pieces: HeatPiece[] = s.pieces.map((p, i) => ({
        id: `HP-${s.spoolNo}-${i + 1}`,
        heatNumber: p.heatNo,
        materialGrade: s.material,
        diaInch: '6"',
        lengthM: 6.0,
        millCertRef: p.millCertRef,
        status: p.mcStatus,
        ncRemark: p.ncRemark,
      }))
      const nc = pieces.filter((p) => p.status === "Non-conformance").length
      const signedOff = fabRank(s.fabStage) > fabRank("Material Check") && nc === 0
      return {
        spoolNo: s.spoolNo,
        pieces,
        inspector: signedOff ? "QC-ENG-01" : undefined,
        signedOffDate: signedOff ? "2025-05-10" : undefined,
        nonConformanceCount: nc,
      }
    })
}
```

- [ ] **Step 2: Реализовать `derivePaintSeed`, `deriveQCReleaseSeed`, `deriveLaydownSeed`, `deriveShopWeldData`**

По тому же паттерну, возвращая точные типы из файлов-источников:
- `derivePaintSeed(): PaintRecord[]` — спулы `fabRank >= "Sent to Paint"`; для `Painted/Laydown` заполнить `returnDate`/`dftMicrons`/`finalQCSignedOffDate`.
- `deriveQCReleaseSeed(): QCReleaseRecord[]` — спулы `fabRank >= "QC Release"`; для `qcHold:true` (#8) оставить запись в held-состоянии (свериться с полями `QCReleaseRecord`).
- `deriveLaydownSeed(): LaydownRecord[]` — спулы на `Laydown` и далее; #9 `placedDate` без `releasedToSiteDate`; #10 — с `releasedToSiteDate`.
- `deriveShopWeldData(): WeldJoint[]` — из `s.welds.filter(w => w.type === "SHOP")`, маппинг в `WeldJoint`.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/fixtures/derive/fabrication.ts
git commit -m "feat: derive fabrication seeds from spine"
```

---

### Task D2: derive/erection.ts

**Files:**
- Create: `lib/fixtures/derive/erection.ts`
- Reference types: `lib/erection-stage.ts` (`ToSiteRecord` :71, `ErectedRecord` :91, `WeldedBoltedRecord` :101, `SupportItem` :114, `SupportedRecord` :153, `FieldMaterialCheckRecord`/`FieldHeatPiece` :168-188, `RFTRecord` :122, `FlangeBoltProgressRecord` ~:788), `lib/erection-weld-data.ts` (`FieldWeldJoint`)

- [ ] **Step 1: Реализовать `deriveFieldMCSeed` (полный образец — это «болевая точка» из жалобы)**

```ts
// lib/fixtures/derive/erection.ts
import { SPINE } from "../spine"
import {
  type FieldMaterialCheckRecord,
  type FieldHeatPiece,
  type SpoolErectionStage,
  ERECTION_STAGE_ORDER,
} from "@/lib/erection-stage"

const erRank = (s?: SpoolErectionStage) =>
  s ? ERECTION_STAGE_ORDER.indexOf(s) : -1

export function deriveFieldMCSeed(): FieldMaterialCheckRecord[] {
  return SPINE
    .filter((s) => erRank(s.erectionStage) >= ERECTION_STAGE_ORDER.indexOf("Field Material Check"))
    .map((s, idx) => {
      const fieldJointId = `fj-${s.spoolNo}`
      const pieces: FieldHeatPiece[] = s.pieces.map((p, i) => ({
        id: `FHP-${fieldJointId}-${i + 1}`,
        fieldJointId,
        tag: p.tag,
        type: p.kind === "Pipe" ? "Pipe Stub" : (p.kind === "Weld Stub" ? "Weld Stub" : p.kind),
        heatNumber: p.heatNo,            // ∈ pipingMaterialList → панель покажет «in list»
        millCertRef: p.millCertRef,
        status: p.mcStatus,
        ncRemark: p.ncRemark,
      }))
      const nc = pieces.filter((p) => p.status === "Non-conformance").length
      const cleared = nc === 0 && erRank(s.erectionStage) > ERECTION_STAGE_ORDER.indexOf("Field Material Check")
      return {
        fieldJointId,
        spoolNo: s.spoolNo,
        pieces,
        inspector: cleared ? "QC-ENG-01" : undefined,
        signedOffDate: cleared ? "2025-05-16" : undefined,
        wmcFormNo: cleared ? `WMC-2025-${140 + idx}` : undefined,
        nonConformanceCount: nc,
      }
    })
}
```

- [ ] **Step 2: Реализовать остальные derive эрекции**

Возвращая точные типы:
- `deriveToSiteSeed(): ToSiteRecord[]` — `erRank >= "To Site"`.
- `deriveErectedSeed(): ErectedRecord[]` — `erRank >= "Erected"`; `erectedBy` ∈ `AREA_SUPERVISORS`, `placementLocation` ∈ `PLACEMENT_LOCATIONS`.
- `deriveWeldedBoltedSeed(): WeldedBoltedRecord[]` — `erRank >= "Welded/Bolted"`; **разные сочетания** `weldedJointCount`/`boltedJointCount` (вычислять из `s.welds` type=FIELD: Butt/Socket → welded, Flange Bolt → bolted). Так уходит проблема «3 записи все Confirmed».
- `deriveSupportSeed(): SupportItem[]` / `deriveSupportedSeed(): SupportedRecord[]` — для #12.
- `deriveRFTSeed(): RFTRecord[]` — для спулов на `RFT`.
- `deriveFlangeBoltSeed(): FlangeBoltProgressRecord[]` — для #12.
- `deriveFieldWeldData(): FieldWeldJoint[]` — из `s.welds.filter(w => w.type==="FIELD")`; `erectionStatus` ∈ `ErectionStatus`, `fieldJointType` согласовать с `jointType`.

- [ ] **Step 3: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/fixtures/derive/erection.ts
git commit -m "feat: derive erection seeds from spine"
```

---

### Task D3: derive/nde.ts

**Files:**
- Create: `lib/fixtures/derive/nde.ts`
- Reference types: `lib/nde-data.ts` (`NdeBatch` — открыть и скопировать тип; учесть, что текущий `NDE_BATCHES` строится из `blueprints.map`)

- [ ] **Step 1: Реализовать `deriveNdeBatches(): NdeBatch[]`**

Сгруппировать `welds` всех спулов с `ndeBatchId` по батчам. Для каждого батча: статус из `ndeResult` (Accepted/Rejected/Pending), метод из `ndeMethod`, список weldNo. Свериться с точной формой `NdeBatch` (поля дат, статуса, weld-ссылок) перед написанием. Покрыть минимум: один Accepted (#5), один Rejected+rework (#6), один Pending.

```ts
// lib/fixtures/derive/nde.ts
import { SPINE } from "../spine"
import { type NdeBatch } from "@/lib/nde-data"
// маппинг: см. точную форму NdeBatch в lib/nde-data.ts
```

- [ ] **Step 2: Проверить типы + валидатор**

Run: `npx tsc --noEmit && npm run validate:fixtures`
Expected: PASS + `✓ fixtures valid`.

- [ ] **Step 3: Commit**

```bash
git add lib/fixtures/derive/nde.ts
git commit -m "feat: derive NDE batches from spine"
```

---

### Task D4: derive/testpack.ts

**Files:**
- Create: `lib/fixtures/derive/testpack.ts`
- Reference types: `lib/testpack-seed.ts` (`TestPackRecord` :173, `ISORecord` :258, `SEED_ISO_SPOOLS` форма :432, `CheckingRequest` :457, `PunchItem` :470), `lib/pressure-test-data.ts` (`PressureTestActivity` :43)

- [ ] **Step 1: Реализовать derive для testpack-слоя**

- `deriveTestPacks(): TestPackRecord[]` — уникальные `testPackNo` из spine; статусы Not Started / In Line Check / Blinding / Hydrotested по спулам внутри.
- `deriveISOs(): ISORecord[]` — уникальные `isoNo`; разные статусы (In Checking / Approved / Released for Fab / Superseded).
- `deriveIsoSpools(): {isoId; spoolIds}[]` — связь из spine.
- `deriveCheckingRequests(): CheckingRequest[]` — line-check для #13.
- `derivePunchItems(): PunchItem[]` — из `s.punches` (#14), категории X/Y/Z.
- `derivePressureTests(): PressureTestActivity[]` — гидротест для #14.

> Сверять каждую форму с источником; не выдумывать поля.

- [ ] **Step 2: Проверить типы + валидатор**

Run: `npx tsc --noEmit && npm run validate:fixtures`
Expected: PASS + `✓ fixtures valid`.

- [ ] **Step 3: Commit**

```bash
git add lib/fixtures/derive/testpack.ts
git commit -m "feat: derive testpack/ISO/punch/pressure seeds from spine"
```

---

### Task D5: index.ts — публичный API под прежними именами

**Files:**
- Create: `lib/fixtures/index.ts`

- [ ] **Step 1: Реэкспорт всех `*_SEED` под именами, которые ждут стора**

```ts
// lib/fixtures/index.ts — единственный публичный вход для сидов
import { deriveMaterialCheckSeed, derivePaintSeed, deriveQCReleaseSeed, deriveLaydownSeed, deriveShopWeldData } from "./derive/fabrication"
import { deriveToSiteSeed, deriveErectedSeed, deriveWeldedBoltedSeed, deriveSupportSeed, deriveSupportedSeed, deriveFieldMCSeed, deriveRFTSeed, deriveFlangeBoltSeed, deriveFieldWeldData } from "./derive/erection"
import { deriveNdeBatches } from "./derive/nde"
import { deriveTestPacks, deriveISOs, deriveIsoSpools, deriveCheckingRequests, derivePunchItems, derivePressureTests } from "./derive/testpack"

// Fabrication
export const MATERIAL_CHECK_SEED = deriveMaterialCheckSeed()
export const PAINT_SEED = derivePaintSeed()
export const QC_RELEASE_SEED = deriveQCReleaseSeed()
export const LAYDOWN_SEED = deriveLaydownSeed()
export const WELD_DATA = deriveShopWeldData()
// Erection
export const TO_SITE_SEED = deriveToSiteSeed()
export const ERECTED_SEED = deriveErectedSeed()
export const WELDED_BOLTED_SEED = deriveWeldedBoltedSeed()
export const SUPPORT_SEED = deriveSupportSeed()
export const SUPPORTED_SEED = deriveSupportedSeed()
export const FIELD_MC_SEED = deriveFieldMCSeed()
export const RFT_SEED = deriveRFTSeed()
export const FLANGE_BOLT_SEED = deriveFlangeBoltSeed()
export const FIELD_WELD_DATA = deriveFieldWeldData()
// NDE
export const NDE_BATCHES = deriveNdeBatches()
// Testpack
export const SEED_TEST_PACKS = deriveTestPacks()
export const SEED_ISOS = deriveISOs()
export const SEED_ISO_SPOOLS = deriveIsoSpools()
export const SEED_CHECKING_REQUESTS = deriveCheckingRequests()
export const SEED_PUNCH_ITEMS = derivePunchItems()
export const PRESSURE_TEST_ACTIVITIES = derivePressureTests()
```

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/fixtures/index.ts
git commit -m "feat: expose unified fixture seeds via index"
```

---

## Phase E — Перенаправление источников и удаление мёртвых сидов

> Подход: в каждом lib-файле-источнике заменить inline-сид на реэкспорт из `@/lib/fixtures`, СОХРАНЯЯ имя константы. Тогда стора и UI не трогаются. Делать по одному файлу, между ними — `npx tsc --noEmit`.

### Task E1: Перенаправить fabrication-сиды

**Files:**
- Modify: `lib/spool-data.ts` (`MATERIAL_CHECK_SEED` :89, `PAINT_SEED` :198, `QC_RELEASE_SEED`, `LAYDOWN_SEED`), `lib/weld-data.ts` (`WELD_DATA` :28)

- [ ] **Step 1: Заменить определение каждой константы реэкспортом**

В `lib/spool-data.ts` удалить старый литерал `MATERIAL_CHECK_SEED` (и `makeRecord`, если больше не используется) и заменить на:
```ts
export { MATERIAL_CHECK_SEED } from "@/lib/fixtures"
```
То же для `PAINT_SEED`, `QC_RELEASE_SEED`, `LAYDOWN_SEED`. В `lib/weld-data.ts` — для `WELD_DATA`. **Типы и хелперы, которые ещё используются другими местами, оставить.** Если реэкспорт конфликтует с локальным объявлением типа в том же файле — оставить `export type`, удалить только литерал данных.

> Осторожно с циклом: `lib/fixtures/derive/fabrication.ts` импортирует ТИПЫ из `@/lib/spool-data`. Реэкспорт значения из fixtures обратно в spool-data создаёт `spool-data → fixtures → spool-data`, но только по типам (`import type`) в обратную сторону — это не runtime-цикл и допустимо для TS. Если tsc/eslint ругается на цикл — перенести импорт типов в derive на отдельный `import type` и убедиться, что он `import type`, а не значение.

- [ ] **Step 2: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS (build завершается без ошибок).

- [ ] **Step 3: Commit**

```bash
git add lib/spool-data.ts lib/weld-data.ts
git commit -m "refactor: source fabrication seeds from fixtures"
```

---

### Task E2: Перенаправить erection-сиды

**Files:**
- Modify: `lib/erection-stage.ts` (`TO_SITE_SEED` :297, `ERECTED_SEED` :335, `WELDED_BOLTED_SEED` :365, `SUPPORT_SEED` :486, `SUPPORTED_SEED` :569, `FIELD_MC_SEED` :580, `RFT_SEED` :665, `FLANGE_BOLT_SEED` :788), `lib/erection-weld-data.ts` (`FIELD_WELD_DATA` :57)

- [ ] **Step 1: Заменить каждый литерал реэкспортом из `@/lib/fixtures`**

```ts
export { TO_SITE_SEED, ERECTED_SEED, WELDED_BOLTED_SEED, SUPPORT_SEED, SUPPORTED_SEED, FIELD_MC_SEED, RFT_SEED, FLANGE_BOLT_SEED } from "@/lib/fixtures"
```
В `lib/erection-weld-data.ts` — `export { FIELD_WELD_DATA } from "@/lib/fixtures"`. Оставить все `export type`/функции-хелперы (`computeSpool*Rollup`, `deriveSpoolErectionStage` и т.п.).

- [ ] **Step 2: Проверить типы и сборку**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/erection-stage.ts lib/erection-weld-data.ts
git commit -m "refactor: source erection seeds from fixtures"
```

---

### Task E3: Перенаправить NDE и testpack/pressure-сиды

**Files:**
- Modify: `lib/nde-data.ts` (`NDE_BATCHES` :266), `lib/testpack-seed.ts` (`SEED_TEST_PACKS` :173, `SEED_ISOS` :258, `SEED_ISO_SPOOLS` :432, `SEED_CHECKING_REQUESTS` :457, `SEED_PUNCH_ITEMS` :470), `lib/pressure-test-data.ts` (`PRESSURE_TEST_ACTIVITIES` :43)

- [ ] **Step 1: Заменить литералы реэкспортами**

```ts
// lib/nde-data.ts
export { NDE_BATCHES } from "@/lib/fixtures"
```
```ts
// lib/testpack-seed.ts
export { SEED_TEST_PACKS, SEED_ISOS, SEED_ISO_SPOOLS, SEED_CHECKING_REQUESTS, SEED_PUNCH_ITEMS } from "@/lib/fixtures"
```
```ts
// lib/pressure-test-data.ts
export { PRESSURE_TEST_ACTIVITIES } from "@/lib/fixtures"
```
Удалить связанные `blueprints`/builder-литералы, если они больше не используются. Оставить типы и константы команд (`LINE_CHECKER_TEAMS` и т.п.), которые потребляет admin-store.

- [ ] **Step 2: Проверить типы, валидатор и сборку**

Run: `npx tsc --noEmit && npm run validate:fixtures && npm run build`
Expected: всё PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/nde-data.ts lib/testpack-seed.ts lib/pressure-test-data.ts
git commit -m "refactor: source NDE/testpack/pressure seeds from fixtures"
```

---

## Phase F — Проверка в UI и финал

### Task F1: Сквозная UI-проверка с demo-reset

**Files:** нет (ручная проверка)

- [ ] **Step 1: Запустить dev-сервер и сбросить демо-данные**

Run: `npm run dev`
В браузере: открыть приложение → выполнить master reset (demo-store `resetAll`, кнопка demo-reset в TopNav) ИЛИ очистить localStorage (DevTools → Application → Clear storage), чтобы убрать старый persisted-стейт.

- [ ] **Step 2: Обойти все модули и подтвердить чек-лист**

Подтвердить визуально:
- [ ] **Admin → Piping Material List** — содержит все heat hero-спулов.
- [ ] **Fabrication → Material Check** — pieces показаны «in Project Piping Material List» (кроме намеренного NC-кейса PL-CW200-003-A, где показан алерт).
- [ ] **Fabrication → Welded/Bolted** — записи в РАЗНЫХ сочетаниях welded/bolted, не все одинаковые; диалог открывается и отражает данные.
- [ ] **Fabrication → Laydown** — есть placed-но-не-released (#9) и released (#10).
- [ ] **Fabrication → Paint / QC Release** — #8 в held-состоянии.
- [ ] **NDE** — есть Accepted, Rejected (+rework), Pending батчи.
- [ ] **Erection** — field MC, field weld, bolted, supports, RFT присутствуют у соответствующих спулов.
- [ ] **Testpack** — пакеты с разными статусами; punch items категорий X/Y/Z у #14; гидротест.
- [ ] **Spooling** — ISO с разными статусами.
- [ ] **Tracking / Reports** — открываются без пустых/битых ссылок.

- [ ] **Step 3: Зафиксировать результат проверки**

Если какой-то модуль показывает пусто/битое — вернуться к соответствующей derive-задаче, поправить, прогнать `npm run validate:fixtures` и `npx tsc --noEmit`, повторить обход. Коммит правок:
```bash
git add -A
git commit -m "fix: align derived seeds after UI sweep"
```

---

### Task F2: Удалить мёртвый код и финальная проверка

**Files:**
- Modify: любые lib-файлы, где остались неиспользуемые хелперы/литералы после перенаправления

- [ ] **Step 1: Найти мёртвый код**

Run: `npm run lint`
Найти предупреждения о неиспользуемых переменных/импортах в перенаправленных файлах (старые `makeRecord`, `blueprints`, неиспользуемые константы). Удалить только заведомо мёртвое; не трогать то, что импортируется в других местах.

- [ ] **Step 2: Финальная полная проверка**

Run: `npx tsc --noEmit && npm run validate:fixtures && npm run build && npm run lint`
Expected: typecheck PASS, `✓ fixtures valid`, build OK, lint без новых ошибок.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove dead seed code after fixtures migration"
```

---

## Definition of Done

- [ ] `lib/fixtures/` — единственный источник демо-данных; все `*_SEED` derived из `SPINE`.
- [ ] `npm run validate:fixtures` → `✓ fixtures valid — 0 issues`.
- [ ] `npx tsc --noEmit` и `npm run build` — без ошибок.
- [ ] UI-обход (Task F1) пройден: статусы разнообразны, Material Check/Field MC ссылаются на Piping List, Welded/Bolted и Laydown показывают разные статусы.
- [ ] Старые inline-сиды удалены; доменные типы и компоненты не изменены.
