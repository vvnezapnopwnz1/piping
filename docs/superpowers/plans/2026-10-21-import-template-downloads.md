# Скачивание шаблонов на плитках импорта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на каждой плитке экрана импорта спулинга (`/spooling/import`) появляется кнопка, которая скачивает шаблон или образец файла для этой плитки; скачанный файл, заполненный по строке-примеру, читается тем же кодом, что и загрузка, без ошибок и без ручного сопоставления колонок.

**Архитектура:** всё, что скачивается, собирается в браузере из данных домена (`SPOOLGEN_CONTRACT`, `BUILT_IN_TEMPLATES`) плюс подписи из `messages/*` — как уже собирается книга справочных импортов (`buildTemplateWorkbook`). Новых зависимостей, миграций и серверных вызовов нет. Заголовки в файлах — канонические (`ISO_NUMBER`), русские подписи живут на листе «Справка» и в уже существующем сопоставлении колонок. Отдельный сквозной тест собирает ровно те байты, которые отдаёт экран, и прогоняет их через `buildTableSubmission` / `buildSpoolgenSubmission` / `buildPcfSubmission`, поэтому шаблон и читатель не могут разойтись.

**Tech Stack:** TypeScript, Next.js (client components), next-intl, SheetJS `xlsx` 0.20.3 (уже в зависимостях), `node:test` + `tsx`.

**Дата:** 2026-10-21. **Ветка:** `feat/unified-workspace` (текущая, новых веток не заводить). **Spec:** `docs/superpowers/specs/2026-10-20-import-templates-design.md`, предыдущие планы — `docs/superpowers/plans/2026-10-20-import-templates.md` и `2026-10-21-import-templates-review-fixes.md`.

---

## 0. Решения, которые этот план принимает (вопросы из задания)

| Вопрос | Решение | Почему |
| --- | --- | --- |
| Одна книга XLSX или книга на роль | **Одна книга**, листы `weld`, `trace`, `bolt`, `supp`, затем «Справка» и «Коды проекта». При загрузке панель читает **лист с именем роли**, а не первый (`readSheetMatrix(bytes, role)`); нет такого листа — первое поведение (первый лист) | Одна кнопка вместо четырёх, одна «Справка» и один список кодов на все роли, строка-пример во всех четырёх листах — одна и та же (катушка и изометрия совпадают, поэтому четыре файла SpoolGen и книга согласованы). Выбор листа закрывает риск «человек сунул книгу в слот `trace`, а прочитался `weld`» |
| Откуда образец PCF | **Собирается в коде**: `modules/engineering/infrastructure/pcf-sample.ts`, одна константа, имя файла `ISO-5001.pcf` | Нет копии в `public/` (значит, нет расхождения с `fixtures/`), не нужен ни build-loader, ни правка `Dockerfile`, ни route handler, читающий файл с диска (в standalone-образе `fixtures/` нет). Тест `pcf-sample.test.ts` прогоняет её через `buildPcfSubmission`, поэтому расхождение с `pcf-welds.ts` ловится сразу. Один образец на все три PCF-плитки: владелец описал их одной строкой, а пресеты у них пока одинаковые (spec §8) |
| Заголовки шаблона | **Канонические** (`ISO_NUMBER`, `PDS_AREA`, …), русские подписи — на листе «Справка» и в сопоставлении колонок | (1) `resolveColumns` ищет сначала сохранённое сопоставление, а если его нет — канонический заголовок или синоним: канонический заголовок находится **всегда**, даже когда в проекте сохранён шаблон с русскими именами; (2) русские синонимы покрывают не всё: `ДИАМЕТР` в контракте нет, поэтому «русский» шаблон потребовал бы ручного сопоставления — прямо против обещания «без ручного сопоставления»; (3) один и тот же файл одинаково работает в обеих локалях |
| Согласованность шаблона и импорта | Сквозной тест `modules/engineering/application/import-template-roundtrip.test.ts` собирает книгу, CSV, четыре TXT и образец PCF **тем же кодом, что экран**, и грузит их обратно теми же читателями | Требование задания 3; заодно ловит: переименование листа, потерю колонки, лишнюю строку-примечание в листе данных (её читатель принял бы за данные и выдал `MISSING_VALUE`) |

Что **не** делаем (совпадает с решением владельца): ZIP-архива, XLS/ODS, выпадающих списков в ячейках Excel, отдельных образцов на каждую PCF-плитку, CSV для ролей `trace`/`bolt`/`supp`.

## Global Constraints

- Все строки, которые читает человек, — только в `messages/en/spooling.json` и `messages/ru/spooling.json`; русские термины по `docs/i18n/glossary-ru.md` (катушка, стык, цеховой/монтажный, зона PDS, класс сервиса). Тест `modules/engineering/ui/engineering-i18n.test.ts` сканирует `modules/engineering/{ui,application,domain}` и `app/spooling` — литерал в этих путях валит `npm run test:unit`. Поэтому **данные шаблона (заголовки, единицы, коды, пример) лежат в `modules/engineering/infrastructure/`**, а слова — в `ui/`.
- Правила бэкенда из `AGENTS.md` не затрагиваются: чтения остаются обычными `select` (`loadImportReferences` уже такой), миграций нет, новых RPC нет.
- Новых зависимостей не добавлять. `xlsx` и `lucide-react` уже есть.
- **Живой локальный стенд не сбрасывать**: не запускать `demo:prepare`, `demo:showcase`, `supabase db reset`, `npm run verify`, `npm run test:db`. Для проверки хватает `npm run test:unit`, `npm run typecheck`, `npm run lint`. pgTAP не нужен (SQL не меняется).
- Данные в проектах `TRACK01-A`, `TRACK01-B`, `SHOWCASE-1` не создавать. Проверка — в **UPG-1**, без нажатия «Проверить файлы» (как просил владелец). Созданные задания, если появятся, отменять в истории импорта.
- Работать в текущем каталоге и ветке. В рабочем дереве есть чужие правки (`messages/{en,ru}/home.json`, `modules/home/ui/*`, `scripts/upg/*`, `tsconfig.tsbuildinfo`, `public/.DS_Store`) — **в коммиты не добавлять**, `git add` только перечисленные в задаче файлы.
- Одно изменение — один коммит; сообщения в стиле репозитория: `feat(import): …`.

## File Structure

**Создаётся**

| Файл | Ответственность |
| --- | --- |
| `lib/download-blob.ts` | одна функция «сохранить сгенерированный файл через временную ссылку» (перенос из `modules/documents/ui/download-blob.ts`, чтобы `engineering` не зависел от `documents`) |
| `modules/engineering/infrastructure/import-template-data.ts` | поля шаблона по роли: контрактный ключ, канонический заголовок, обязательность, единицы, допустимые значения, откуда берётся, и строка-пример |
| `modules/engineering/infrastructure/import-template-files.ts` | сериализация: строки листа роли, текст SpoolGen (табуляция), CSV (BOM, `;`, CRLF, кавычки) |
| `modules/engineering/infrastructure/pcf-sample.ts` | образец PCF, который отдают плитки AVEVA / Smart 3D / Plant 3D |
| `modules/engineering/ui/import-template-sheets.ts` | листы книги из подписей: листы ролей, «Справка», «Коды проекта» |
| `modules/engineering/ui/import-template-download.tsx` | кнопки скачивания для плитки (Excel/CSV, SpoolGen-меню, образец PCF + список того, что читаем) |
| тесты | `modules/engineering/infrastructure/import-template-data.test.ts`, `import-template-files.test.ts`, `pcf-sample.test.ts`, `modules/engineering/application/import-template-roundtrip.test.ts` |

**Меняется**

| Файл | Что |
| --- | --- |
| `modules/imports/infrastructure/xlsx-workbook.ts` (+ `.test.ts`) | `buildWorkbook(sheets)`, `readSheetMatrix(bytes, sheetName?)`; `readFirstSheetMatrix` становится обёрткой |
| `modules/engineering/ui/table-import-panel.tsx` | читать лист по роли, загружать коды проекта для листа «Коды проекта», показать кнопки скачивания |
| `modules/engineering/ui/pcf-import-panel.tsx` | показать кнопку образца PCF и список того, что читаем |
| `messages/en/spooling.json`, `messages/ru/spooling.json` | `templates.download.*`, `templates.codesFailed` (вместо `pcf.referencesFailed`) |
| `modules/documents/ui/test-pack-dossier-button.tsx`, `modules/documents/ui/reports-screen.tsx` | импорт `downloadBlob` из `@/lib/download-blob` |
| `fixtures/import-samples/README.md` | короткий раздел «Чем скачанный шаблон отличается от образцов в этой папке» |

---

### Task 1: Читать лист по имени и писать книгу из строк

**Files:**
- Modify: `modules/imports/infrastructure/xlsx-workbook.ts`
- Test: `modules/imports/infrastructure/xlsx-workbook.test.ts`
- Move: `modules/documents/ui/download-blob.ts` → `lib/download-blob.ts`
- Modify: `modules/documents/ui/test-pack-dossier-button.tsx:19`, `modules/documents/ui/reports-screen.tsx:21`

- [ ] **Step 1: Write the failing test**

В `modules/imports/infrastructure/xlsx-workbook.test.ts` заменить импорт и добавить проверки в конец `run()` (перед `console.log(...)`):

```ts
import { buildTemplateWorkbook, buildWorkbook, readFirstSheetMatrix, readSheetMatrix, type WorkbookSheet } from "./xlsx-workbook"
```

```ts
  // A template carries one sheet per role next to its help and code sheets, so a role reads its own sheet.
  const sheets: WorkbookSheet[] = [
    { name: "weld", rows: [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]] },
    { name: "trace", rows: [["IDENT_CODE"], ["PIPE100"]] },
    { name: "numbers", rows: [["THICKNESS_MM"], [6.02]] },
  ]
  const built = buildWorkbook(sheets)
  assert.ok(built.byteLength > 0, "a workbook built from rows has content")
  assert.deepEqual(readSheetMatrix(built, "weld"), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]])
  assert.deepEqual(readSheetMatrix(built, " WELD "), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]], "the sheet name is compared in any case and with padding")
  assert.deepEqual(readSheetMatrix(built, "help"), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]], "a workbook without that sheet keeps the old first-sheet behaviour")
  assert.deepEqual(readFirstSheetMatrix(built), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]])
  assert.deepEqual(readSheetMatrix(built, "numbers")[1], [6.02], "a number stays a number")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/imports/infrastructure/xlsx-workbook.test.ts`
Expected: FAIL — `SyntaxError: The requested module './xlsx-workbook' does not provide an export named 'buildWorkbook'`.

- [ ] **Step 3: Write minimal implementation**

В `modules/imports/infrastructure/xlsx-workbook.ts` перед `readFirstSheetMatrix` добавить:

```ts
/** A sheet of a workbook the app writes: the tab name and its rows, the first row being the headers. */
export interface WorkbookSheet { name: string; rows: readonly (readonly unknown[])[] }

/** A workbook of plain rows. A sheet name is what a reader looks for, so it is never translated. */
export function buildWorkbook(sheets: readonly WorkbookSheet[]): Uint8Array {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows.map((row) => [...row])), sheet.name)
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as Uint8Array
}
```

и заменить тело `readFirstSheetMatrix` на делегирование:

```ts
/**
 * The rows of one sheet: the sheet named like `sheetName` (in any case, without padding) when the workbook has one,
 * else the first sheet. A template carries one sheet per file role beside its help and code sheets, and the import
 * reads the role's own sheet; a workbook of one sheet reads as before.
 */
export function readSheetMatrix(bytes: ArrayBuffer | Uint8Array, sheetName?: string): SheetMatrix {
  // cellDates: Excel stores 2026-09-01 as the serial 46266; without it the importer would see 46266.
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true })
  const wanted = sheetName?.trim().toLowerCase()
  const name = (wanted === undefined ? undefined : workbook.SheetNames.find((sheet) => sheet.trim().toLowerCase() === wanted)) ?? workbook.SheetNames[0]
  const worksheet = name === undefined ? undefined : workbook.Sheets[name]
  if (worksheet === undefined) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
  return rows.map((row) => row.map((cell) => (cell instanceof Date ? dateCellToIso(cell) : cell)))
}

export function readFirstSheetMatrix(bytes: ArrayBuffer | Uint8Array): SheetMatrix { return readSheetMatrix(bytes) }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/imports/infrastructure/xlsx-workbook.test.ts`
Expected: PASS — `All xlsx-workbook.test.ts assertions passed!`

- [ ] **Step 5: Move the download helper and point its two callers at it**

```bash
git mv modules/documents/ui/download-blob.ts lib/download-blob.ts
```

В `modules/documents/ui/test-pack-dossier-button.tsx` и `modules/documents/ui/reports-screen.tsx` заменить `import { downloadBlob } from "./download-blob"` на `import { downloadBlob } from "@/lib/download-blob"`.

- [ ] **Step 6: Run the gates and commit**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add lib/download-blob.ts modules/imports/infrastructure/xlsx-workbook.ts modules/imports/infrastructure/xlsx-workbook.test.ts modules/documents/ui/test-pack-dossier-button.tsx modules/documents/ui/reports-screen.tsx
git commit -m "feat(import): read a workbook sheet by role and build a workbook from rows"
```

---

### Task 2: Данные шаблона — поля, единицы, допустимые значения, строка-пример

**Files:**
- Create: `modules/engineering/infrastructure/import-template-data.ts`
- Test: `modules/engineering/infrastructure/import-template-data.test.ts`

- [ ] **Step 1: Write the failing test**

`modules/engineering/infrastructure/import-template-data.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { parseSpoolgenMatrix } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import type { WeldLocation } from "../domain/import-template"
import { templateFieldsFor, templateSampleRow } from "./import-template-data"

// The downloaded file is the thing people compare their own file with, so each assertion here is about a promise the
// screen makes: the same columns the import reads, the canonical headers it matches by name, a sample row it accepts.

const headersOf = (role: SpoolgenFileRole) => templateFieldsFor(role).map((field) => field.header)
const matrixOf = (role: SpoolgenFileRole) => [headersOf(role), templateSampleRow(role)]
const valuesOf = (role: SpoolgenFileRole) => parseSpoolgenMatrix(role, matrixOf(role)).records[0].values

test("a role's template carries every contract column once, in contract order", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const fields = templateFieldsFor(role)
    assert.deepEqual(fields.map((field) => field.key), SPOOLGEN_CONTRACT[role].map((column) => column.key), role)
    for (const field of fields) {
      const column = SPOOLGEN_CONTRACT[role].find((entry) => entry.key === field.key)!
      assert.equal(field.header, column.canonicalHeader, `${role}.${field.key}`)
      assert.equal(field.required, column.required, `${role}.${field.key}`)
    }
    assert.equal(new Set(fields.map((field) => field.header)).size, fields.length, `${role} headers are unique`)
    assert.deepEqual(templateSampleRow(role).filter((value) => value === ""), [], `${role}: every column has an example value`)
  }
})

test("the parser itself reads the header row and the example row with no issue", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const parsed = parseSpoolgenMatrix(role, matrixOf(role))
    assert.deepEqual(parsed.issues, [], role)
    assert.equal(parsed.records.length, 1, role)
  }
})

test("the four files describe one isometric and one spool, so they belong together", () => {
  const values = SPOOLGEN_FILE_ROLES.map(valuesOf)
  assert.deepEqual([...new Set(values.map((entry) => entry.iso_number))], ["ISO-4001"])
  assert.deepEqual([...new Set(values.map((entry) => entry.spool_number))], ["ISO-4001-S1"])
})

test("the place of a weld is one of the three the server stores", () => {
  const fields = templateFieldsFor("weld")
  const index = fields.findIndex((entry) => entry.key === "weld_location")
  const field = fields[index]
  const sample = templateSampleRow("weld")[index]
  assert.equal(field.allowedValues, "weldLocation")
  assert.ok((["shop", "assembly", "field"] as readonly WeldLocation[]).includes(sample as WeldLocation))
})

test("a quantity is a count where it counts, and an amount in the row's own unit elsewhere", () => {
  const unitOf = (role: SpoolgenFileRole, key: string) => templateFieldsFor(role).find((field) => field.key === key)?.unit
  assert.equal(unitOf("weld", "diameter_inch"), "inch")
  assert.equal(unitOf("weld", "thickness_mm"), "mm")
  assert.equal(unitOf("weld", "spool_weight_kg"), "kg")
  assert.equal(unitOf("bolt", "diameter_inch"), "inch")
  assert.equal(unitOf("bolt", "bolt_quantity"), "count")
  assert.equal(unitOf("trace", "ident_code"), null)
  assert.equal(unitOf("supp", "quantity"), "count", "a support count is in pieces")
  assert.equal(unitOf("trace", "quantity"), null, "a material's quantity is an amount, its unit is the row's UNIT column")
})

test("the help sheet's provenance is pinned where it is not the file itself", () => {
  assert.deepEqual(templateFieldsFor("weld").filter((field) => field.source !== "file").map((field) => [field.key, field.source]), [
    ["iso_number", "drawing"], ["revision_number", "drawing"], ["pds_area", "projectCodes"], ["service_class", "projectCodes"], ["weld_type", "projectCodes"],
  ])
  assert.equal(templateFieldsFor("trace").find((field) => field.key === "ident_code")?.source, "file", "a column with no special source falls back to the file itself")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/engineering/infrastructure/import-template-data.test.ts`
Expected: FAIL — `Cannot find module './import-template-data'`.

- [ ] **Step 3: Write minimal implementation**

`modules/engineering/infrastructure/import-template-data.ts`:

```ts
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import type { SpoolgenFileRole } from "../domain/spoolgen-file"

/** The unit a person fills a column in, as a word the interface translates. */
export type TemplateUnit = "inch" | "mm" | "kg" | "count"
/** Where the value is found, so the help sheet can say it: in the file being filled, on the drawing, or in the project's codes. */
export type TemplateFieldSource = "file" | "drawing" | "projectCodes"
/** The only closed list in the contract: where a weld is made. */
export type TemplateAllowedValues = "weldLocation"

/** One column of a template: the header the import matches by name, and what the help sheet says about the cell. */
export interface TemplateField {
  key: string
  header: string
  required: boolean
  unit: TemplateUnit | null
  allowedValues: TemplateAllowedValues | null
  source: TemplateFieldSource
}

const UNITS: Readonly<Partial<Record<string, TemplateUnit>>> = { diameter_inch: "inch", thickness_mm: "mm", spool_weight_kg: "kg", bolt_quantity: "count" }
/** Per role, the unit of a column whose meaning differs between roles: a material's quantity is an amount, and its unit is the row's own UNIT column. */
const UNITS_BY_ROLE: Readonly<Partial<Record<SpoolgenFileRole, Readonly<Partial<Record<string, TemplateUnit>>>>>> = { supp: { quantity: "count" } }
const SOURCES: Readonly<Partial<Record<string, TemplateFieldSource>>> = { iso_number: "drawing", revision_number: "drawing", pds_area: "projectCodes", service_class: "projectCodes", weld_type: "projectCodes" }
const ALLOWED: Readonly<Partial<Record<string, TemplateAllowedValues>>> = { weld_location: "weldLocation" }

/**
 * The columns of one role, in contract order, with the canonical header: the download needs no column mapping because
 * the reader matches exactly these headers (`resolveColumns` falls back to the canonical name even when the project's
 * saved template maps other ones).
 */
export function templateFieldsFor(role: SpoolgenFileRole): TemplateField[] {
  return SPOOLGEN_CONTRACT[role].map((column) => ({
    key: column.key,
    header: column.canonicalHeader,
    required: column.required,
    unit: UNITS_BY_ROLE[role]?.[column.key] ?? UNITS[column.key] ?? null,
    allowedValues: ALLOWED[column.key] ?? null,
    source: SOURCES[column.key] ?? "file",
  }))
}

/**
 * One row of plausible values, the same for all four files: the isometric and spool names match, so the four SpoolGen
 * files and the four sheets of the workbook belong together when uploaded as downloaded. The values are tokens, not
 * sentences, except the description of a material, which is prose in a real register too.
 */
const SAMPLE_VALUES: Readonly<Record<string, string | number>> = {
  iso_number: "ISO-4001", revision_number: "R0", pds_area: "A-100", service_class: "CS150",
  line_number: "4-NG-4001-CS150", sheet_number: 1, spool_number: "ISO-4001-S1", spool_weight_kg: 125.5,
  material_class: "A1A", weld_number: "4001-S1-W01", weld_type: "BW", weld_location: "shop",
  diameter_inch: 4, thickness_mm: 6.02, ident_code: "PIPE100", description: "PIPE SEAMLESS, DN100, SCH 40",
  quantity: 1, unit: "M", trace_number: "H-2401", flange_number: "FL-4001-01", flange_rating: "CL150",
  bolt_size: "M16", bolt_quantity: 8, joint_type: "WN RF", support_number: "SUP-4001-01", support_type: "SHOE",
}

/** The example row of a role in the order of its columns; a column with no example stays empty. */
export function templateSampleRow(role: SpoolgenFileRole): (string | number)[] {
  return templateFieldsFor(role).map((field) => SAMPLE_VALUES[field.key] ?? "")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/engineering/infrastructure/import-template-data.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/infrastructure/import-template-data.ts modules/engineering/infrastructure/import-template-data.test.ts
git commit -m "feat(import): the fields and the example row each import template carries"
```

---

### Task 3: Текст SpoolGen и CSV

**Files:**
- Create: `modules/engineering/infrastructure/import-template-files.ts`
- Test: `modules/engineering/infrastructure/import-template-files.test.ts`

- [ ] **Step 1: Write the failing test**

`modules/engineering/infrastructure/import-template-files.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { buildTableSubmission } from "../application/import-table"
import { parseDelimited } from "../domain/parsers/delimited"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { decodeText } from "./spoolgen-file-reader"
import { buildTemplateCsv, buildTemplateText, templateRowsFor } from "./import-template-files"

// The CSV is the file a Russian Excel writes: UTF-8 with its mark, ';' between cells, CRLF between rows. The reader
// strips the mark in parseDelimited, so the header is matched by name and no mapping is needed.

test("a SpoolGen file is tab separated with the headers first and one example row", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const lines = buildTemplateText(role).trimEnd().split("\n")
    assert.equal(lines.length, 2, role)
    assert.equal(lines[0].split("\t").length, templateRowsFor(role)[0].length, role)
    assert.deepEqual(parseSpoolgenFile(role, buildTemplateText(role)).issues, [], role)
    assert.equal(parseSpoolgenFile(role, buildTemplateText(role)).records.length, 1, role)
  }
})

test("the CSV starts with the byte order mark, uses semicolons and CRLF, and the reader reads it", () => {
  const csv = buildTemplateCsv(templateRowsFor("weld"))
  assert.ok(csv.startsWith("\uFEFFISO_NUMBER;ISO_REVISION;"), csv.slice(0, 40))
  assert.ok(csv.endsWith("\r\n"))
  assert.equal(csv.trimEnd().split("\r\n").length, 2)
  const { text, encoding } = decodeText(new TextEncoder().encode(csv))
  assert.equal(encoding, "utf-8")
  const submission = buildTableSubmission([{ role: "weld", fileName: "weld-template.csv", matrix: parseDelimited(text) }], { kind: "table", columns: {} })
  assert.deepEqual(submission.issues, [])
  assert.deepEqual(submission.missingColumns, {})
  assert.equal(submission.canSubmit, true)
})

test("a cell holding a semicolon or a quote is quoted, so the row keeps its columns", () => {
  const csv = buildTemplateCsv([["a", "b"], ["one; two", 'say "hi"']])
  assert.equal(csv, `\uFEFFa;b\r\n"one; two";"say ""hi"""\r\n`)
  assert.deepEqual(parseDelimited(csv), [["a", "b"], ["one; two", 'say "hi"']])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/engineering/infrastructure/import-template-files.test.ts`
Expected: FAIL — `Cannot find module './import-template-files'`.

- [ ] **Step 3: Write minimal implementation**

`modules/engineering/infrastructure/import-template-files.ts`:

```ts
import type { SpoolgenFileRole } from "../domain/spoolgen-file"
import { templateFieldsFor, templateSampleRow } from "./import-template-data"

/** The header row the import matches by name and one example row: exactly what a role's sheet or file holds. */
export function templateRowsFor(role: SpoolgenFileRole): (string | number)[][] {
  return [templateFieldsFor(role).map((field) => field.header), templateSampleRow(role)]
}

/** A SpoolGen file: tab separated, a header row, one example row, a line break at the end. */
export function buildTemplateText(role: SpoolgenFileRole): string {
  return `${templateRowsFor(role).map((row) => row.join("\t")).join("\n")}\n`
}

/**
 * A CSV the reader takes as it is: UTF-8 with a byte order mark (Excel needs it to see UTF-8), ';' between cells as a
 * Russian Excel writes it, CRLF between rows. A cell holding ';', a quote or a line break is quoted, as Excel does.
 */
export function buildTemplateCsv(rows: readonly (readonly (string | number)[])[]): string {
  const cell = (value: string | number) => { const text = String(value); return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
  return `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/engineering/infrastructure/import-template-files.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/infrastructure/import-template-files.ts modules/engineering/infrastructure/import-template-files.test.ts
git commit -m "feat(import): the SpoolGen text files and the CSV a tile hands out"
```

---

### Task 4: Образец PCF

**Files:**
- Create: `modules/engineering/infrastructure/pcf-sample.ts`
- Test: `modules/engineering/infrastructure/pcf-sample.test.ts`

- [ ] **Step 1: Write the failing test**

`modules/engineering/infrastructure/pcf-sample.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { buildPcfSubmission } from "../application/import-pcf"
import { DEFAULT_PCF_SETTINGS } from "../domain/import-template"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "./pcf-sample"

// The sample is what a customer compares their own export with, so it must be everything the reader accepts and
// nothing it quietly drops: units, one pipeline, parts, WELD blocks that carry a number, a place and a type.

const rowsOf = (submission: SpoolgenSubmission, kind: string) => submission.rows.filter((row) => row.normalizedValues.entity_type === kind).map((row) => row.normalizedValues)
const read = () => buildPcfSubmission([{ fileName: PCF_SAMPLE_FILE_NAME, text: PCF_SAMPLE }], { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })

test("the sample PCF reads as one isometric, two spools and three welds, with no issue", () => {
  const submission = read()
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(rowsOf(submission, "isometric").map((v) => [v.iso_number, v.revision_number, v.pds_area, v.service_class, v.line_number]), [["ISO-5001", "B", "A-100", "CS150", "4-NG-5001-CS150"]])
  assert.deepEqual(rowsOf(submission, "spool").map((v) => [v.spool_number, v.sequence_number]), [["5001-S1", "1"], ["5001-S2", "2"]])
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch]), [
    ["5001-S1", "1", "BW", "shop", "4"],
    ["5001-S1", "2", "BW", "field", "4"],
    ["5001-S2", "3", "BW", "shop", "4"],
  ])
  assert.equal(submission.rows.length, 6)
})

test("the sample says its units and is indented with spaces, as a PCF must be", () => {
  assert.match(PCF_SAMPLE, /^UNITS-BORE MM$/m)
  assert.match(PCF_SAMPLE, /^ {4}PIPING-SPEC CS150$/m)
  assert.doesNotMatch(PCF_SAMPLE, /\t/)
})

test("the sample names its file so the isometric number comes out as the file name", () => {
  assert.equal(PCF_SAMPLE_FILE_NAME, "ISO-5001.pcf")
  assert.equal(rowsOf(read(), "isometric")[0].iso_number, "ISO-5001")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test modules/engineering/infrastructure/pcf-sample.test.ts`
Expected: FAIL — `Cannot find module './pcf-sample'`.

- [ ] **Step 3: Write minimal implementation**

`modules/engineering/infrastructure/pcf-sample.ts`:

```ts
/**
 * The sample PCF the three CAD tiles hand out: a sample, not a form, because a PCF is written by the CAD system. It is
 * the smallest file the reader accepts — the units, one pipeline, four parts and three WELD blocks that carry a number
 * (`REPEAT-WELD-IDENTIFIER`), a place (`SKEY` WW or WS) and a type (the end type of the part at the weld) — and
 * `pcf-sample.test.ts` runs it through `buildPcfSubmission`, so it cannot drift from what `pcf-welds.ts` reads.
 * It lives in infrastructure, not in domain: the material descriptions are prose, and a domain file may not hold it.
 */
export const PCF_SAMPLE_FILE_NAME = "ISO-5001.pcf"

export const PCF_SAMPLE = `ISOGEN-FILES ISOGEN.FLS
UNITS-BORE MM
UNITS-CO-ORDS MM
UNITS-WEIGHT KGS
PIPELINE-REFERENCE 4-NG-5001-CS150
    PIPING-SPEC CS150
    REVISION B
PIPE
    COMPONENT-IDENTIFIER 1
    END-POINT 0.0 0.0 0.0 100 BW
    END-POINT 1500.0 0.0 0.0 100 BW
    ITEM-CODE PIPE100
    SPOOL-IDENTIFIER 5001-S1
WELD
    COMPONENT-IDENTIFIER 2
    MASTER-COMPONENT-IDENTIFIER 1
    END-POINT 1500.0 0.0 0.0 100
    SKEY WW
    REPEAT-WELD-IDENTIFIER 1
ELBOW
    COMPONENT-IDENTIFIER 3
    END-POINT 1500.0 0.0 0.0 100 BW
    END-POINT 1728.6 228.6 0.0 100 BW
    CENTRE-POINT 1500.0 228.6 0.0
    ANGLE 9000
    SKEY ELBW
    ITEM-CODE ELB100LR90
    SPOOL-IDENTIFIER 5001-S1
WELD
    COMPONENT-IDENTIFIER 4
    MASTER-COMPONENT-IDENTIFIER 3
    END-POINT 1728.6 228.6 0.0 100
    SKEY WS
    REPEAT-WELD-IDENTIFIER 2
PIPE
    COMPONENT-IDENTIFIER 5
    END-POINT 1728.6 228.6 0.0 100 BW
    END-POINT 1728.6 1028.6 0.0 100 BW
    ITEM-CODE PIPE100
    SPOOL-IDENTIFIER 5001-S2
WELD
    COMPONENT-IDENTIFIER 6
    MASTER-COMPONENT-IDENTIFIER 5
    END-POINT 1728.6 1028.6 0.0 100
    SKEY WW
    REPEAT-WELD-IDENTIFIER 3
FLANGE
    COMPONENT-IDENTIFIER 7
    END-POINT 1728.6 1028.6 0.0 100 BW
    END-POINT 1788.6 1028.6 0.0 100 FL
    SKEY FLWN
    ITEM-CODE FLWN100
    SPOOL-IDENTIFIER 5001-S2
MATERIALS
MATERIAL-IDENTIFIER 1
    ITEM-CODE PIPE100
    DESCRIPTION PIPE SEAMLESS, DN100, SCH 40, API 5L GR B
MATERIAL-IDENTIFIER 2
    ITEM-CODE ELB100LR90
    DESCRIPTION ELBOW 90 LR BW, DN100, SCH 40, A234 WPB
MATERIAL-IDENTIFIER 3
    ITEM-CODE FLWN100
    DESCRIPTION FLANGE WN RF CL150, DN100, A105
`
```

Замечание для исполнителя: `SKEY PIPE` у труб **не** ставить — `pcf-welds.ts:56` берёт тип с конца `SKEY` детали, и `PIPE` дал бы `PE`. У фланца `SKEY FLWN` дал бы `WN`, но у стыка 3 деталью становится труба `5001-S2` с типом конца `BW`, поэтому тип `BW`. Если тест даёт другой порядок катушек, проверить порядок `WELD`-блоков: катушки нумеруются в порядке появления стыков (Task 8 в `definition.ts:9`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/engineering/infrastructure/pcf-sample.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/infrastructure/pcf-sample.ts modules/engineering/infrastructure/pcf-sample.test.ts
git commit -m "feat(import): a sample PCF the reader accepts, kept next to the reader's test"
```

---

### Task 5: Подписи в messages (en и ru)

**Files:**
- Modify: `messages/en/spooling.json`
- Modify: `messages/ru/spooling.json`
- Modify: `modules/engineering/ui/pcf-import-panel.tsx:89` (ключ `pcf.referencesFailed` → `templates.codesFailed`)

- [ ] **Step 1: Найти все места, где используется старый ключ**

Run: `grep -rn "referencesFailed" modules messages`
Expected: `messages/en/spooling.json`, `messages/ru/spooling.json`, `modules/engineering/ui/pcf-import-panel.tsx` — три файла, других нет. Если нашлось ещё — поправить и там.

- [ ] **Step 2: Добавить английские ключи**

В `messages/en/spooling.json` внутрь `"templates"` (рядом с `label`, `name`, `saveAs`, `saved`, `saveFailed`, `loadFailed`) добавить объект:

```json
"download": {
  "tableXlsx": "Download the Excel template",
  "tableCsv": "Download the CSV template (welds)",
  "spoolgen": "Download the SpoolGen files",
  "pcf": "Download a sample PCF",
  "pcfReads": "This is a sample, not a form: a PCF is written by your CAD system. We read UNITS-BORE for the units, PIPELINE-REFERENCE, PIPING-SPEC, REVISION, SPOOL-IDENTIFIER, and WELD blocks with SKEY, CATEGORY, REPEAT-WELD-IDENTIFIER and WELD-TYPE.",
  "required": "Required",
  "optional": "Optional",
  "exampleRow": "The second row is an example: replace its values with yours before uploading.",
  "unit": { "inch": "inches", "mm": "mm", "kg": "kg", "count": "pieces" },
  "allowed": { "weldLocation": "shop or assembly for a shop weld, field for a site weld" },
  "source": {
    "file": "From your own file",
    "drawing": "From the isometric drawing",
    "projectCodes": "A code of the project, from the \"Project codes\" sheet"
  },
  "help": {
    "sheet": "Help",
    "field": "Field",
    "header": "Header in the file",
    "required": "Is it required",
    "unit": "Units",
    "allowed": "Allowed values",
    "source": "Where the value comes from"
  },
  "codes": {
    "sheet": "Project codes",
    "group": "Codes of the project",
    "code": "Code",
    "pdsArea": "PDS area",
    "serviceClass": "Service class",
    "weldType": "Weld type",
    "unavailable": "The project's codes were not loaded, so this sheet is empty. Open the import screen again to download a template with them."
  }
},
"codesFailed": "The project's codes could not be loaded."
```

И удалить из `"pcf"` ключ `"referencesFailed": "The project's codes could not be loaded."`.

- [ ] **Step 3: Добавить русские ключи**

В `messages/ru/spooling.json` в тот же объект `"templates"`:

```json
"download": {
  "tableXlsx": "Скачать шаблон Excel",
  "tableCsv": "Скачать шаблон CSV (стыки)",
  "spoolgen": "Скачать файлы SpoolGen",
  "pcf": "Скачать образец PCF",
  "pcfReads": "Это образец, а не бланк: PCF выгружает система проектирования. Мы читаем UNITS-BORE — единицы, PIPELINE-REFERENCE, PIPING-SPEC, REVISION, SPOOL-IDENTIFIER и блоки WELD с SKEY, CATEGORY, REPEAT-WELD-IDENTIFIER и WELD-TYPE.",
  "required": "Обязательно",
  "optional": "По желанию",
  "exampleRow": "Вторая строка — пример: замените её значения своими перед загрузкой.",
  "unit": { "inch": "дюймы", "mm": "мм", "kg": "кг", "count": "шт." },
  "allowed": { "weldLocation": "цеховой стык — shop или assembly, монтажный — field" },
  "source": {
    "file": "Из вашего файла",
    "drawing": "С изометрии",
    "projectCodes": "Код проекта, из листа «Коды проекта»"
  },
  "help": {
    "sheet": "Справка",
    "field": "Поле",
    "header": "Заголовок в файле",
    "required": "Обязательно",
    "unit": "Единицы",
    "allowed": "Допустимые значения",
    "source": "Откуда берётся"
  },
  "codes": {
    "sheet": "Коды проекта",
    "group": "Коды проекта",
    "code": "Код",
    "pdsArea": "Зона PDS",
    "serviceClass": "Класс сервиса",
    "weldType": "Тип стыка",
    "unavailable": "Коды проекта не загрузились, поэтому лист пуст. Откройте экран импорта заново, чтобы скачать шаблон с кодами."
  }
},
"codesFailed": "Не удалось загрузить коды проекта."
```

И удалить из `"pcf"` ключ `"referencesFailed": "Не удалось загрузить коды проекта."`.

- [ ] **Step 4: Перевести панель PCF на новый ключ**

В `modules/engineering/ui/pcf-import-panel.tsx:89` заменить `t("pcf.referencesFailed")` на `t("templates.codesFailed")`.

- [ ] **Step 5: Run the i18n tests**

Run: `node --import tsx --test i18n/messages.test.ts modules/engineering/ui/engineering-i18n.test.ts`
Expected: PASS. Если упало «finished namespaces have every English key in Russian» — забыт русский ключ; если «take the same arguments» — в русском тексте другие `{…}`.

- [ ] **Step 6: Commit**

```bash
git add messages/en/spooling.json messages/ru/spooling.json modules/engineering/ui/pcf-import-panel.tsx
git commit -m "feat(import): the words of the template downloads, in both languages"
```

---

### Task 6: Листы книги из подписей и кнопки скачивания

**Files:**
- Create: `modules/engineering/ui/import-template-sheets.ts`
- Create: `modules/engineering/ui/import-template-download.tsx`

- [ ] **Step 1: Собрать листы книги (кода-теста нет: это подписи, их проверяет Task 8 и `engineering-i18n.test.ts`)**

`modules/engineering/ui/import-template-sheets.ts`:

```ts
import type { WorkbookSheet } from "@/modules/imports/infrastructure/xlsx-workbook"
import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import type { ImportReferences } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { templateFieldsFor } from "../infrastructure/import-template-data"
import { templateRowsFor } from "../infrastructure/import-template-files"

/**
 * The tab a role's data sits in: the role itself, never translated, so an upload finds its sheet in either language.
 * `readSheetMatrix` compares it without case or padding.
 */
export function roleSheetName(role: SpoolgenFileRole): string { return role }

/**
 * The help sheet: for every role its columns, in contract order, with the label a person knows from the mapping screen,
 * the header to keep in the file, whether the cell is required, and what goes in it. The only place a note may live:
 * a note row inside a role's sheet would be read as a data row and block the upload.
 */
export function helpSheet(t: SpoolingTranslator): WorkbookSheet {
  const header = [
    t("templates.download.help.field"), t("templates.download.help.header"), t("templates.download.help.required"),
    t("templates.download.help.unit"), t("templates.download.help.allowed"), t("templates.download.help.source"),
  ]
  const rows: (string | number)[][] = []
  for (const role of SPOOLGEN_FILE_ROLES) {
    if (rows.length > 0) rows.push([""])
    rows.push([t(`table.role.${role}`)], header)
    for (const field of templateFieldsFor(role)) {
      rows.push([
        t(`mapping.fields.${field.key}`),
        field.header,
        field.required ? t("templates.download.required") : t("templates.download.optional"),
        field.unit === null ? "" : t(`templates.download.unit.${field.unit}`),
        field.allowedValues === null ? "" : t(`templates.download.allowed.${field.allowedValues}`),
        t(`templates.download.source.${field.source}`),
      ])
    }
  }
  rows.push([""], [t("templates.download.exampleRow")])
  return { name: t("templates.download.help.sheet"), rows }
}

/** The codes sheet: the project's active codes, one per row, so a person copies them instead of guessing. */
export function codesSheet(t: SpoolingTranslator, references: ImportReferences | null): WorkbookSheet {
  const rows: (string | number)[][] = [[t("templates.download.codes.group"), t("templates.download.codes.code")]]
  const groups = references === null ? [] : [
    { label: t("templates.download.codes.pdsArea"), codes: references.pdsAreas },
    { label: t("templates.download.codes.serviceClass"), codes: references.serviceClasses },
    { label: t("templates.download.codes.weldType"), codes: references.weldTypes },
  ]
  if (groups.every((group) => group.codes.length === 0)) rows.push([t("templates.download.codes.unavailable")])
  else for (const group of groups) for (const code of group.codes) rows.push([group.label, code])
  return { name: t("templates.download.codes.sheet"), rows }
}

/** The workbook the Excel/CSV tile hands out: a sheet per role, then the help and the project's codes. */
export function tableTemplateSheets(t: SpoolingTranslator, references: ImportReferences | null): WorkbookSheet[] {
  return [
    ...SPOOLGEN_FILE_ROLES.map((role) => ({ name: roleSheetName(role), rows: templateRowsFor(role) })),
    helpSheet(t),
    codesSheet(t, references),
  ]
}
```

- [ ] **Step 2: Собрать кнопки**

`modules/engineering/ui/import-template-download.tsx`:

```tsx
"use client"

import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadBlob } from "@/lib/download-blob"
import { buildWorkbook } from "@/modules/imports/infrastructure/xlsx-workbook"
import { templateKindOf, type ImportReferences, type ImportSourceId } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { buildTemplateCsv, buildTemplateText, templateRowsFor } from "../infrastructure/import-template-files"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "../infrastructure/pcf-sample"
import { tableTemplateSheets } from "./import-template-sheets"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * What a tile hands out before anything is picked: for Excel/CSV the workbook (a sheet per role, the help and the
 * project's codes) and a CSV of the weld table; for SpoolGen the four tab-separated files; for a CAD source the sample
 * PCF and the keywords we read. Every file is built from the same data the import reads, so the two cannot drift.
 */
export function ImportTemplateDownload({ source, references, disabled }: {
  source: ImportSourceId
  references: ImportReferences | null
  disabled: boolean
}) {
  const t = useTranslations("spooling")
  const tc = useTranslations("codes")

  if (templateKindOf(source) === "pcf") {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => downloadBlob(new Blob([PCF_SAMPLE], { type: "text/plain;charset=utf-8" }), PCF_SAMPLE_FILE_NAME)}>
          <Download />{t("templates.download.pcf")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("templates.download.pcfReads")}</p>
      </div>
    )
  }

  if (source === "spoolgen") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <Download />{t("templates.download.spoolgen")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SPOOLGEN_FILE_ROLES.map((role) => (
            <DropdownMenuItem key={role} onClick={() => downloadBlob(new Blob([buildTemplateText(role)], { type: "text/plain;charset=utf-8" }), `${role}.txt`)}>
              {tc(`spoolgenRole.${role}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => downloadBlob(new Blob([buildWorkbook(tableTemplateSheets(t, references))], { type: XLSX_TYPE }), "spooling-template.xlsx")}>
        <Download />{t("templates.download.tableXlsx")}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => downloadBlob(new Blob([buildTemplateCsv(templateRowsFor("weld"))], { type: "text/csv;charset=utf-8" }), "weld-template.csv")}>
        <Download />{t("templates.download.tableCsv")}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Run the gates**

Run: `node --import tsx --test modules/engineering/ui/engineering-i18n.test.ts && npm run typecheck && npm run lint`
Expected: PASS без ошибок. `engineering-i18n.test.ts` (литералы в `modules/engineering/ui`) пройдёт, потому что все строки идут через `t(...)`; `roleSheetName` и `${role}.txt` — не проза.

- [ ] **Step 4: Commit**

```bash
git add modules/engineering/ui/import-template-sheets.ts modules/engineering/ui/import-template-download.tsx
git commit -m "feat(import): one button per tile that hands out its template"
```

---

### Task 7: Подключить кнопки к панелям

**Files:**
- Modify: `modules/engineering/ui/table-import-panel.tsx`
- Modify: `modules/engineering/ui/pcf-import-panel.tsx`

- [ ] **Step 1: Читать лист по роли в панели Excel/CSV**

В `modules/engineering/ui/table-import-panel.tsx`:

1. Импорт: `readFirstSheetMatrix` → `readSheetMatrix` (строка 11).
2. `readMatrix` (строки 34–38) получает роль:

```ts
/** A workbook gives the sheet of the role it is being uploaded for; anything else is text in any encoding the reader knows. */
async function readMatrix(source: TableSourceId, role: Role, file: File): Promise<SheetMatrix> {
  if (source === "table" && /\.xlsx?$/i.test(file.name)) return readSheetMatrix(await file.arrayBuffer(), role)
  return parseDelimited((await readSourceFile(file)).text)
}
```

3. Вызов в `pick` (строка 104): `const matrix = await readMatrix(source, role, taken)`.

- [ ] **Step 2: Загрузить коды проекта для листа «Коды проекта»**

В том же файле, рядом с `const [templates, setTemplates] = useState<ImportTemplate[]>([])`:

```ts
const [references, setReferences] = useState<ImportReferences | null>(null)
```

Импорт типов из домена: добавить `type ImportReferences` в строку 16 (`import { BUILT_IN_TEMPLATES, pickInitialTemplate, type ImportTemplate, type ImportReferences, type TableTemplateSettings } from "../domain/import-template"`), репозиторий — в строку 20: `loadImportReferences, loadImportTemplates`.

В существующий `useEffect` (строки 76–91), внутрь после `loadImportTemplates(...)…`, добавить:

```ts
    loadImportReferences(client, projectId)
      .then((loaded) => { if (live) setReferences(loaded) })
      .catch((error: unknown) => { if (live) toast.error(t("templates.codesFailed"), { description: errorDetail(error) }) })
```

`client` там сейчас создаётся внутри вызова: `loadImportTemplates(getSupabaseBrowserClient(), projectId)`. Вынести в начало эффекта:

```ts
    const client = getSupabaseBrowserClient()
```

и звать `loadImportTemplates(client, projectId)`.

- [ ] **Step 3: Показать кнопки скачивания**

В разметке сразу под `<p className="text-sm text-muted-foreground">…` (строка 135):

```tsx
      <ImportTemplateDownload source={source} references={mappable ? references : null} disabled={busy} />
```

и импорт: `import { ImportTemplateDownload } from "./import-template-download"`.

- [ ] **Step 4: Показать кнопку и список того, что читаем, в панели PCF**

В `modules/engineering/ui/pcf-import-panel.tsx` сразу под `<p className="text-sm text-muted-foreground">{t("pcf.hint", …)}</p>` (строка 134):

```tsx
      <ImportTemplateDownload source={source} references={references} disabled={busy} />
```

и импорт: `import { ImportTemplateDownload } from "./import-template-download"`.

- [ ] **Step 5: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS. `engineering-i18n.test.ts` остаётся зелёным (новых литералов нет).

- [ ] **Step 6: Commit**

```bash
git add modules/engineering/ui/table-import-panel.tsx modules/engineering/ui/pcf-import-panel.tsx
git commit -m "feat(import): each tile offers its template, and the Excel tile reads the role's sheet"
```

---

### Task 8: Сквозной тест «что скачали — то и загружается»

**Files:**
- Create: `modules/engineering/application/import-template-roundtrip.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { messagesFor } from "@/i18n/messages"
import { buildWorkbook, readSheetMatrix } from "@/modules/imports/infrastructure/xlsx-workbook"
import { DEFAULT_PCF_SETTINGS, type ImportReferences } from "../domain/import-template"
import { parseDelimited } from "../domain/parsers/delimited"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { buildTemplateCsv, buildTemplateText, templateRowsFor } from "../infrastructure/import-template-files"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "../infrastructure/pcf-sample"
import { decodeText } from "../infrastructure/spoolgen-file-reader"
import { tableTemplateSheets } from "../ui/import-template-sheets"
import { buildPcfSubmission } from "./import-pcf"
import { buildSpoolgenSubmission, type SpoolgenSubmission } from "./import-spooling"
import { buildTableSubmission, type TableSource } from "./import-table"

// What the tiles hand out is what the import reads. Every file below is built by the screen's own code, then run
// through the readers and builders the upload uses: a column renamed, a note row left in a data sheet, a sheet name
// translated, or a sample that stops being read fails here, before a person ever downloads it.
const NO_MAPPING = { kind: "table", columns: {} } as const
// The codes the sheet lists are not read back; an empty project is enough to prove the sheets are ignored.
const REFERENCES: ImportReferences = { pdsAreas: ["A-100"], serviceClasses: ["CS150"], weldTypes: ["BW", "SW"] }
const translatorFor = (locale: "en" | "ru") => createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })

const rowsOf = (submission: SpoolgenSubmission, kind: string) => submission.rows.filter((row) => row.normalizedValues.entity_type === kind).map((row) => row.normalizedValues)

const WELD = ["ISO-4001", "ISO-4001-S1", "4001-S1-W01", "BW", "shop", "4", "6.02"]

for (const locale of ["en", "ru"] as const) {
  test(`the Excel template uploads into all four roles with no mapping and no issue (${locale})`, () => {
    const t = translatorFor(locale)
    const bytes = buildWorkbook(tableTemplateSheets(t, REFERENCES))
    const sources: TableSource[] = SPOOLGEN_FILE_ROLES.map((role) => ({ role, fileName: `spooling-template-${role}.xlsx`, matrix: readSheetMatrix(bytes, role) }))
    const submission = buildTableSubmission(sources, NO_MAPPING)
    assert.deepEqual(submission.missingColumns, {}, locale)
    assert.deepEqual(submission.issues, [], locale)
    assert.equal(submission.canSubmit, true, locale)
    // One isometric, one spool, one weld, one support, one flange joint and one material row.
    assert.equal(submission.rows.length, 6, locale)
    assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch, v.thickness_mm]), [WELD], locale)
    assert.deepEqual(rowsOf(submission, "isometric").map((v) => [v.iso_number, v.revision_number, v.pds_area, v.service_class, v.line_number]), [["ISO-4001", "R0", "A-100", "CS150", "4-NG-4001-CS150"]], locale)
  })
}

test("the workbook holds the data sheets first, so a plain one-sheet read still finds the welds", () => {
  const t = translatorFor("en")
  const bytes = buildWorkbook(tableTemplateSheets(t, REFERENCES))
  assert.deepEqual(readSheetMatrix(bytes, "weld"), readSheetMatrix(bytes))
  assert.equal(readSheetMatrix(bytes, "weld")[0][0], "ISO_NUMBER")
  assert.equal(readSheetMatrix(bytes, "codes")[0][0], "ISO_NUMBER", "a name that is not a sheet keeps the first sheet, which is the welds")
  // The help and the codes are sheets of their own: a note inside a data sheet would be read as a data row.
  assert.equal(readSheetMatrix(bytes, "weld").length, 2)
  assert.equal(readSheetMatrix(bytes, "trace").length, 2)
  assert.equal(readSheetMatrix(bytes, "bolt").length, 2)
  assert.equal(readSheetMatrix(bytes, "supp").length, 2)
})

test("the CSV template uploads into the weld role with no mapping and no issue", () => {
  const { text, encoding } = decodeText(new TextEncoder().encode(buildTemplateCsv(templateRowsFor("weld"))))
  assert.equal(encoding, "utf-8")
  const submission = buildTableSubmission([{ role: "weld", fileName: "weld-template.csv", matrix: parseDelimited(text) }], NO_MAPPING)
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch, v.thickness_mm]), [WELD])
})

test("the four SpoolGen files upload together with no issue", () => {
  const files = Object.fromEntries(SPOOLGEN_FILE_ROLES.map((role) => [role, buildTemplateText(role)])) as Record<SpoolgenFileRole, string>
  const submission = buildSpoolgenSubmission(files)
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.equal(submission.rows.length, 6)
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch, v.thickness_mm]), [WELD])
})

test("one SpoolGen file alone still uploads: the weld file is the only required one", () => {
  const submission = buildSpoolgenSubmission({ weld: buildTemplateText("weld") })
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.equal(submission.rows.length, 3)
})

test("the sample PCF reads with no issue", () => {
  const submission = buildPcfSubmission([{ fileName: PCF_SAMPLE_FILE_NAME, text: PCF_SAMPLE }], { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch]), [
    ["5001-S1", "1", "BW", "shop", "4"],
    ["5001-S1", "2", "BW", "field", "4"],
    ["5001-S2", "3", "BW", "shop", "4"],
  ])
})
```

- [ ] **Step 2: Run the test**

Run: `node --import tsx --test modules/engineering/application/import-template-roundtrip.test.ts`
Expected до Task 6: FAIL — `Cannot find module '../ui/import-template-sheets'`. Если задачи 1–7 уже сделаны, тест может пройти сразу: тогда он не «падающий тест», а контракт, и его ценность — в Step 3 при следующей правке шаблона. Убедиться, что он действительно проверяет обещание: временно убрать один обязательный столбец из `templateFieldsFor` (например, `filter((field) => field.key !== "pds_area")`) — тест обязан упасть на `missingColumns`; вернуть как было.

- [ ] **Step 3: Довести расхождения**

Если тест падает на `missingColumns` — в шаблоне нет колонки, которую требует контракт (`templateFieldsFor` обязан отдавать все колонки роли): сверить с `SPOOLGEN_CONTRACT`. Если падает на `issues` с `MISSING_VALUE` — в строке-примере пустое обязательное поле. Если на числе строк — в лист роли попала заметка (в листе данных может быть только заголовок и одна строка-пример). Ничего в продакшн-коде не «подгонять» под тест: тест описывает обещание экрана.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test modules/engineering/application/import-template-roundtrip.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the whole unit suite and commit**

Run: `npm run test:unit`
Expected: PASS (было 878 тестов до этой работы; станет больше).

```bash
git add modules/engineering/application/import-template-roundtrip.test.ts
git commit -m "test(import): the file a tile hands out is the file the import reads"
```

---

### Task 9: Приёмка в браузере, README и журнал

**Files:**
- Modify: `fixtures/import-samples/README.md`
- Modify: этот план (раздел «Журнал»)

- [ ] **Step 1: Проверка в браузере на локальном стенде**

Стенд не сбрасывать. Приложение уже запущено (в прошлом журнале — `localhost:3107`); если нет — `npm run dev`. Проект **UPG-1** (в нём есть зона PDS `A-100`, классы `CS150`/`CS300`, типы стыков `BW`/`SW`), экран `/spooling/import`.

1. Плитка **Excel / CSV**: «Скачать шаблон Excel». Открыть файл: листы `weld`, `trace`, `bolt`, `supp`, «Справка», «Коды проекта»; на листе `weld` первая строка — `ISO_NUMBER`, `ISO_REVISION`, `PDS_AREA`, …, вторая — пример; на «Кодах проекта» — коды UPG-1.
2. Вернуть этот же файл в слот `weld` (и, для полноты, в `trace`, `bolt`, `supp`): под слотом **не** должно появиться «Сопоставить колонки», внизу не должно быть «Сопоставьте все обязательные колонки».
3. «Скачать шаблон CSV (стыки)» → вернуть в слот `weld`: то же самое, без сопоставления.
4. Плитка **SpoolGen**: меню «Скачать файлы SpoolGen» → по очереди `weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt` → вернуть все четыре в свои слоты: замечаний нет.
5. Плитка **AVEVA E3D / PDMS** (и по одной из двух других — кнопка та же): «Скачать образец PCF» → выбрать зону PDS `A-100` → вернуть `ISO-5001.pcf`: в списке файлов он читается, замечаний при чтении нет.
6. **Не нажимать** «Проверить файлы» в `TRACK01-A`/`TRACK01-B`/`SHOWCASE-1` и не применять ничего в UPG-1. Если случайно создалось задание — отменить в истории импорта.
7. Снимки экрана: `docs/superpowers/specs/screenshots/2026-10-21-import-downloads-*.png` (плитки с кнопками, лист «Справка», меню SpoolGen).

- [ ] **Step 2: Дописать README образцов**

В `fixtures/import-samples/README.md` в конец добавить раздел:

```md
## Чем скачанный шаблон отличается от образцов в этой папке

Образцы в этой папке — то, что **читает** импорт: выгрузки систем проектирования и реестр из русской Windows. Их
проверяет `modules/engineering/application/import-samples.test.ts`.

Шаблоны, которые экран отдаёт кнопками на плитках, собираются в коде и в папке не лежат:

- Excel/CSV — `modules/engineering/infrastructure/import-template-data.ts` (какие колонки и что в них) и
  `modules/engineering/ui/import-template-sheets.ts` (листы «Справка» и «Коды проекта»);
- SpoolGen — тот же файл данных плюс `modules/engineering/infrastructure/import-template-files.ts`;
- PCF — `modules/engineering/infrastructure/pcf-sample.ts`.

Их общее обещание проверяет `modules/engineering/application/import-template-roundtrip.test.ts`: скачанное,
заполненное по строке-примеру, загружается без ошибок и без ручного сопоставления. Меняя образец здесь, сверьтесь с
этим тестом: он держит и шаблон, и образцы.
```

- [ ] **Step 3: Дописать журнал**

Дописать в конец этого файла раздел:

```md
## Журнал

- 2026-10-21: план составлен. Задачи 1–8 — код и тесты, задача 9 — приёмка в браузере и README.

## Проверка (заполняется исполнителем)

- [ ] `npm run test:unit` — PASS (число тестов — из вывода)
- [ ] `npm run typecheck` — чисто
- [ ] `npm run lint` — без новых ошибок
- [ ] Браузер, UPG-1: все пять плиток отдают файл, каждый файл читается обратно без сопоставления
- [ ] Снимки экрана: `docs/superpowers/specs/screenshots/2026-10-21-import-downloads-*.png`
```

- [ ] **Step 4: Run the gates and commit**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS.

```bash
git add fixtures/import-samples/README.md docs/superpowers/plans/2026-10-21-import-template-downloads.md docs/superpowers/specs/screenshots/2026-10-21-import-downloads-*.png
git commit -m "docs(import): how to get a template from a tile, and what the samples are for"
```

---

## Что осталось за планом (осознанно)

1. **CSV только для стыков.** Остальные три роли в CSV не отдаются: они необязательны, а книга Excel даёт все четыре листа сразу. Если понадобится — это та же функция `buildTemplateCsv` с `templateRowsFor(role)`, то есть меню вместо кнопки.
2. **Образец PCF один на все три плитки.** Пресеты у них пока одинаковые (spec §8); когда появится настоящий файл E3D или Smart 3D, образцы можно развести по диалектам, не меняя ни экран, ни тест.
3. **Строка-пример в шаблоне — данные.** Кто загрузит шаблон, не заменив пример, получит одну демонстрационную катушку `ISO-4001`; сервер отклонит её, если в проекте нет кода `A-100`/`CS150`. Так и задумано: лист «Справка» прямо просит заменить значения, а придумывать «пустой» шаблон, который читатель считает ошибкой, хуже.
4. **Лист роли — имя роли.** `weld`, `trace`, `bolt`, `supp` не переводятся: читатель ищет лист по ним, поэтому русская книга и английская читаются одинаково. Русское название роли стоит заголовком раздела на листе «Справка».
5. **Шаблон не подставляет сопоставление проекта.** Заголовки всегда канонические, даже когда в проекте сохранён шаблон с русскими именами: `resolveColumns` находит каноническое имя в любом случае, а сохранённое сопоставление продолжает работать со своим файлом. Обещать «скачали шаблон — он же и ваш сохранённый шаблон» не нужно.

## Журнал

- 2026-10-21: план составлен. Задачи 1–8 — код и тесты, задача 9 — приёмка в браузере и README.
- 2026-10-21: задачи 1–4 выполнил первый исполнитель (`3074e67`, `2b27f94`, `218b048` + `35f4225`, `971d238`). Качественное ревью задачи 4 вернуло «With fixes».
- 2026-10-21, ~23:40: исполнение принял второй исполнитель (inline). Между задачами 4 и 5 на ветку легли правки после ревью шаблонов (`d522f59..000eb25`, `e9b8680`), поэтому:
  - задача 4, правки ревью (`39985b6`): отвод DN100 — 152.4 мм по обеим осям, как отвод DN100 в `fixtures/import-samples/aveva/ISO-1001.pcf`; все точки после него сдвинуты на −76.2, фланец продолжает трубу по +y и кончается в `1652.4 1012.4 0.0` (координата из ревью `1728.6 1088.6` была посчитана для старого отвода 228.6). Добавлены проверки связности, вылета отвода и направления фланца; исправлены две неточные фразы;
  - задача 5 (`ae04c7d`): `pcf.referencesFailed` уже использовался не в тосте на `:89`, а в сообщении с кнопкой «Повторить» и в `engineering-i18n.test.ts` — ключ переведён в обоих местах (тест теперь `t.has(...)`, иначе отсутствующий ключ проходил бы по возвращённому пути). `templates.saveFailed` к этому моменту уже заменён на `templateErrors.*`;
  - задача 6 (`88da3fd`): `t(\`mapping.fields.${field.key}\`)` не проходил typecheck — приведение к `FieldKey`, как в `column-mapping-editor.tsx`;
  - задача 7 (`b36e589`), задача 8 (`a095efe`): по плану; мутация из шага 2 задачи 8 (убрать `pds_area` из `templateFieldsFor`) роняет 5 из 7 тестов, после возврата — 7/7;
  - сверх плана (`d9b174f`): подсказка панели Excel/CSV говорила «читается первый лист книги», после задачи 7 читается лист роли — текст и тест поправлены.

## Проверка (заполняется исполнителем)

- [x] `npm run test:unit` — PASS, 911 тестов
- [x] `npm run typecheck` — чисто
- [x] `npm run lint` — 0 ошибок, 139 прежних предупреждений
- [x] Браузер, UPG-1 (`localhost:3107`): все пять плиток показывают кнопку; файлы собраны тем же кодом, что вызывает кнопка (`buildWorkbook(tableTemplateSheets(...))`, `buildTemplateCsv`, `buildTemplateText`, `PCF_SAMPLE`), сами кнопки в браузере не нажимались — скачивание в папку пользователя требует его разрешения. Книга — во все четыре слота без сопоставления (в проекте выбран шаблон «UPG таблица 21.10» с русскими заголовками), сервер: 6 строк, 0 замечаний; CSV с заменёнными значениями (ISO-9001, стык 9001-S1-W07) — без сопоставления, сервер: 0 замечаний, в предпросмотре новая катушка и стык; четыре TXT SpoolGen — без замечаний; `ISO-5001.pcf` с зоной A-100 — без замечаний при чтении. «Проверить файлы» нажата только в UPG-1 (исходное задание владельца ограничивает TRACK01-A/B и SHOWCASE-1); оба задания отменены в истории импорта, ничего не применялось.
- [x] Снимки экрана: `docs/superpowers/specs/screenshots/2026-10-21-import-downloads-*.png` — сохранены локально, в коммит не входят: каталог в `.gitignore`. Лист «Справка» проверен чтением книги в Node (листы `weld | trace | bolt | supp | Справка | Коды проекта`, коды UPG-1 на последнем), снимка Excel нет.
