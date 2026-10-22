# Плитка Excel: скачать шаблон, загрузить заполненный — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на плитке «Excel» две кнопки — «Скачать шаблон Excel» и «Загрузить заполненный шаблон»; одна книга читается целиком (листы `weld`, `trace`, `bolt`, `supp`) и проверяется сразу после выбора, а список замечаний после проверки показывает одну запись на причину с листом, колонкой и номерами строк, как их показывает Excel, по-русски и по-английски.

**Архитектура:** книга читается один раз новой функцией `readNumberedSheets`, которая рядом с каждой строкой хранит номер строки Excel (`readSheetMatrix` не меняется). Эти номера становятся `lineNumber` записей, а каждая строка задания запоминает записи, из которых собрана (`rowSources`). Отправляемые строки и замечания не меняются. Список после проверки строится в браузере функцией `buildIssueEntries` из того, что ушло на сервер (`submission`), и серверных `SRV_*` из `import_job_issues`. Клиент переводит код в слова, правил не выводит.

**Tech Stack:** TypeScript, Next.js (клиентские компоненты), next-intl, SheetJS `xlsx` 0.20.3 (уже в зависимостях), `node:test` + `tsx`.

**Spec:** `docs/prompts/PipeQC_Excel_Import_Simplify_Plan.md` (решения владельца, не переобсуждать). Предыдущие планы: `docs/superpowers/plans/2026-10-20-import-templates.md`, `2026-10-21-import-template-downloads.md`.

**Дата:** 2026-10-22. **Ветка:** `feat/unified-workspace` (текущая, новых веток и worktree не заводить). Исходное состояние: `npm run test:unit` — 911 тестов, все зелёные (с чужими незакоммиченными файлами в дереве).

---

## 0. Решения по вопросам из задания

| # | Вопрос | Решение | Почему |
|---|---|---|---|
| 1 | Как сохранить номер строки Excel | Новая `readNumberedSheets(bytes, names)` в `modules/imports/infrastructure/xlsx-workbook.ts` читает книгу **один раз** и отдаёт `{ rows, rowNumbers }` для каждого найденного листа. Внутри `sheet_to_json(ws, { header: "A", blankrows: false, defval: "" })`: при любом `header`, кроме `1`, SheetJS кладёт в строку неперечисляемое `__rowNum__` (номер строки от 0). Номер Excel — `__rowNum__ + 1`, колонки — от `!ref.s.c` до `!ref.e.c`. Пустые строки отбрасываются так же, как в `readSheetMatrix`, но следующая строка сохраняет свой номер. Листа нет — его нет в ответе, первый лист не подставляется. `readSheetMatrix` и `readFirstSheetMatrix` не трогаем | Проверено в Node на 0.20.3: лист с началом в `C4` и пустой строкой 6 даёт номера `[4, 5, 7]`. Справочные импорты читают через `readFirstSheetMatrix`, их поведение не меняется. `blankrows: true` не годится: лист с одним значением в строке 1 048 576 развернётся в миллион массивов |
| 2 | Где живёт соответствие «замечание → лист, колонка, строки» | (а) Записи книги получают `lineNumber` = строка Excel и `sheet` = имя листа (`buildTableSubmission` переводит индекс через `rowNumbers`). (б) Замечание, которое указывает на запись, несёт `role` её файла: в одной книге номер строки повторяется на разных листах. (в) `buildStagingEntries` отдаёт к каждой строке задания записи, из которых она собрана: изометрия — все строки `weld` этой изометрии, катушка — строки `weld` этой катушки, стык, материал, фланец, опора — своя строка. `SpoolgenSubmission.rowSources[i]` — записи строки `rows[i]`. (г) `buildIssueEntries(submission, stored)` в `modules/engineering/application/issue-entries.ts`: замечания браузера берёт из `submission.issues` (в памяти, с `role`), серверные — из `stored`, это коды не из `SPOOLGEN_ISSUE_CODES`. Серверная строка задания ищется по `rows`, браузерная запись — по ключу `role · fileName · lineNumber`. Записи с одинаковыми кодом, значениями, листом и колонкой сливаются, строки объединяются | Отправляемые строки и замечания не меняются, сервер и база не меняются. Замечания видны только сразу после проверки, поэтому соответствию достаточно жить в состоянии экрана рядом с `submission`. Записанные в базу замечания браузера совпадают с `submission.issues` один в один (`record_spooling_validation` вставляет их как есть, `revalidate` удаляет только `SRV_*`). Поэтому вместо них берём те, что в памяти: у них есть `role`, у записанных его нет |
| 3а | Два варианта `SRV_THICKNESS_MISSING` | **Не различаем**: у двух вариантов одинаковы код, колонка и строка, а по данным строки их отличить нельзя. Второй вариант («правило добавили после проверки») возникает, только если правило толщины добавили в промежутке между `record_spooling_validation` (там заполнение толщины и первая перепроверка идут в одной транзакции) и вторым вызовом `revalidate_spooling_import_job` из `submitSpoolingImport`, то есть в доли секунды. Текст подходит к обоим вариантам: «При проверке не нашлось правила толщины для класса сервиса «X» и диаметра Y″. Добавьте правило, если его нет, и загрузите файл снова» | Различить можно только по английскому сообщению, а это запрещено. Если же проверять правило толщины в TypeScript, правило окажется во втором месте (CLAUDE.md, правило 4). Повторная загрузка лечит оба варианта |
| 3б | `SRV_SPOOLING_JOB_TOO_LARGE`, лимит знает только сервер | Лимит не показываем. В тексте число стыков, которое отправил браузер (строки `weld_joint` в `submission.rows`, ровно это число сервер сравнивает с лимитом), и совет: «N стыков — больше, чем принимает одно задание. Разделите файл по зонам PDS и загрузите части по очереди» | `spooling_job_joint_limit()` закрыта от `authenticated` (`20261018130000`), RPC на чтение запрещены (правило 1), копия числа 7500 в TypeScript — второе место для правила |
| 4 | Как разделить `table-import-panel.tsx` | Две панели без общей ветки: новая `excel-import-panel.tsx` (две кнопки, одно поле `.xlsx`, проверка сразу после выбора) и `spoolgen-import-panel.tsx` (это `git mv` старого файла, из которого вырезано всё, что было под `mappable`: шаблоны, коды проекта, редактор, `ImportTemplateBar`). Общие функции чтения остаются в `application/import-table.ts`. Параметр `source` у панелей пропадает | Каждой плитке свой файл, флагов нет. SpoolGen выглядит и работает, как раньше |
| 5 | Что удалить | Таблица в Task 7 и Task 5, у каждого имени команда `grep` с ожидаемым пустым ответом | Правило задания |
| — | Какой список меняем | Новый `IssueEntryList` (`modules/engineering/ui/issue-entry-list.tsx`) — общий список после проверки для всех плиток (Excel, SpoolGen, PCF). `ImportIssueList` остаётся как есть: им пользуются справочные импорты (`modules/imports/ui/import-workbench.tsx`) и списки до проверки в панелях SpoolGen и PCF | Справочные импорты не трогаем. SpoolGen и PCF после проверки получают «бесплатно» файл, строку и русский текст |
| — | Номера строк SpoolGen и PCF | Как сейчас: PCF — номер строки файла (`pcf-welds.ts`), SpoolGen — номер строки данных (1 — первая после заголовка; `parseDelimited` выбрасывает пустые строки, номера строки файла у него нет). В списке вместо листа — имя файла: «weld.txt, колонка PDS_AREA, строки 1–40» | «Отдельно этого не добиваться». Серверные ошибки SpoolGen и PCF теперь привязаны к своему файлу и строкам, а раньше показывались как «Строка 1» |
| — | Параметр `sheetName` у `readSheetMatrix` | **Оставляем.** После изменения его вызывают только тесты, но задание запрещает менять `readSheetMatrix`. Если владелец разрешит, параметр можно убрать отдельным коммитом | Буква задания |

Чего **не** делаем: файл со списком ошибок; показ ошибок в истории импорта; изменения сервера, миграции и pgTAP; чтение сохранённых шаблонов таблиц (строки `source = 'table'` в `import_templates` остаются, `parseTemplateSettings` их по-прежнему разбирает); точные строки файла у SpoolGen.

## Global Constraints

- Все строки, которые читает человек, только в `messages/en/spooling.json` и `messages/ru/spooling.json`. Термины — по `docs/i18n/glossary-ru.md`: катушка, стык, цеховой/монтажный, класс сервиса, зона PDS, NDE (не «НК»). Стиль: заглавная только первая буква, кавычки «», буква «ё», кнопка — глагол в инфинитиве. `npm run test:unit` ловит литералы в `modules/engineering/{ui,application,domain}` и `app/spooling`, а также пропуски ключей, аргументов и веток plural в русском файле.
- Клиент переводит код в слова и не выводит правило заново (CLAUDE.md, правило 4).
- Без новых зависимостей, миграций, RPC и правок в `supabase/`.
- **Живой стенд не сбрасывать:** не запускать `demo:prepare`, `demo:showcase`, `supabase db reset`, `npm run verify`, `npm run test:db`. Ворота каждой задачи — `npm run test:unit`, `npm run typecheck`, `npm run lint`.
- Проверка в браузере только в **UPG-1**. Задание создаётся сразу при выборе файла, поэтому в `TRACK01-A`, `TRACK01-B` и `SHOWCASE-1` файлы не выбирать вообще. Ничего не применять, созданные задания отменить в истории импорта.
- Работать в текущем каталоге и ветке. Чужие файлы в дереве (`scripts/upg/*`, `modules/home/*`, `messages/{en,ru}/home.json`, `tsconfig.tsbuildinfo`, `public/.DS_Store`, `docs/prompts/*.md`) в коммиты не добавлять: в `git add` — только файлы задачи.
- Секреты из `.env.local` не печатать и не писать в файлы.
- Стиль кода как у соседей: короткие JSDoc-комментарии на английском, плотные однострочники в `domain/`, сообщения коммитов `feat(import): …` / `refactor(import): …` с подписью `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Длинный рваный список строк.** 7500 стыков, ошибка в каждой второй строке. Заголовок записи не должен разрастаться на экран: не больше 10 диапазонов, дальше «и ещё N строк» (тест в Task 4, `formatRowRanges`).
2. **Одинаковый номер строки на разных листах.** Катушка-сирота в строке 5 листа `trace` и в строке 5 листа `bolt` — две записи, каждая на своём листе, без смешения (тест в Task 4).
3. **Лист не с `A1` и имя листа в другом регистре.** Если Excel сохранил лист как `Weld` или ` WELD `, а данные начинаются ниже первой строки, номера всё равно совпадают с Excel (тест в Task 1).
4. **Необязательный лист очищен целиком.** Человек стёр лист `trace` вместе с заголовком. Такой лист пропускается, как будто его нет, и не даёт ошибки `EMPTY_FILE`. Пустой `weld` даёт то же сообщение, что отсутствующий (тест в Task 3).
5. **Повторный выбор файла.** Человек поправил книгу в Excel и выбрал тот же файл ещё раз: проверка запускается снова. Если второй файл выбран, пока читается первый, отправляется только второй (билеты `createPickTickets` и сброс `input.value` в Task 6, проверка в браузере в Task 8).

---

## File Structure

**Создаётся**

| Файл | Ответственность |
|---|---|
| `modules/engineering/application/issue-entries.ts` (+ `.test.ts`) | замечания браузера и сервера → записи списка: код, значения для текста, место (лист или файл, колонка, строки Excel); слияние, дубли, порядок, счёт |
| `modules/engineering/ui/issue-entry-text.ts` (+ `.test.ts`) | слова записи: заголовок по коду, строка места, диапазоны строк |
| `modules/engineering/ui/issue-entry-list.tsx` | список после проверки: строка итога и записи |
| `modules/engineering/ui/excel-import-panel.tsx` | плитка Excel: две кнопки, чтение книги, сообщения «нет листа weld» и «нет колонки», отправка |

**Меняется**

| Файл | Что |
|---|---|
| `modules/imports/infrastructure/xlsx-workbook.ts` (+ `.test.ts`) | `NumberedSheet`, `readNumberedSheets` |
| `modules/engineering/domain/definition.ts` | `StagingEntry`, `buildStagingEntries`; `buildStagingRows` строится из него |
| `modules/engineering/domain/parsers/spoolgen-parser.ts` | `SpoolgenRecord.sheet?` (Task 2); без `columnMap` (Task 7) |
| `modules/engineering/domain/spoolgen-issue.ts` | `SpoolgenIssue.role?`, опция `role`; `SPOOLING_SERVER_ISSUE_CODES` и `FILE_CODES` (Task 4) |
| `modules/engineering/ui/spoolgen-issue-text.ts` | берёт `FILE_CODES` из домена (Task 4), остальное без изменений |
| `modules/engineering/domain/parsers/cross-file.ts` | замечания несут `role` записи |
| `modules/engineering/domain/spoolgen-contract.ts` | `resolveColumns` без `columnMap` (Task 7) |
| `modules/engineering/application/import-spooling.ts` | `SpoolgenSubmission.rowSources` |
| `modules/engineering/application/import-table.ts` | `TableSource.sheet?/rowNumbers?`, `readWorkbookUpload`; без функций сопоставления (Task 7) |
| `modules/engineering/ui/spooling-import.tsx` | две панели, состояние «что отправили + что вернул сервер», `IssueEntryList` |
| `modules/engineering/ui/table-import-panel.tsx` → `spoolgen-import-panel.tsx` | `git mv`, только SpoolGen |
| `modules/engineering/ui/import-template-download.tsx` | у плитки Excel одна кнопка |
| `modules/engineering/infrastructure/import-template-files.ts` (+ `.test.ts`) | без CSV |
| `modules/engineering/domain/import-template.ts` | плитка называется `Excel` |
| `modules/imports/ui/import-issue-list.tsx` | экспорт `SEVERITY_TONE`, `SEVERITY_STYLE` для нового списка |
| `scripts/i18n/find-ui-literals.ts` | `NAMES`: `"Excel"` вместо `"Excel / CSV"` |
| `messages/{en,ru}/spooling.json` | новые `excel.*`, `issueTitles.*`, `issuePlace.*`, `issueSummary.*`; правка `sources.table.hint`; удаление ключей пути сопоставления |
| тесты | `import-template-roundtrip.test.ts`, `import-table.test.ts`, `import-samples.test.ts`, `cross-file.test.ts`, `import-pcf.test.ts`, `pcf-unmapped.test.ts`, `spoolgen-contract.test.ts`, `engineering-i18n.test.ts` |
| `fixtures/import-samples/README.md` | без раздела CSV |

**Удаляется:** `modules/engineering/ui/column-mapping-editor.tsx`, `fixtures/import-samples/table/weld-register-cp1251.csv`.

Порядок задач выбран так, чтобы после каждого коммита ворота были зелёными: сначала добавляем новое (Task 1–4), потом убираем CSV (Task 5), меняем экран (Task 6), удаляем ставший мёртвым код (Task 7) и проверяем в браузере (Task 8).

---

### Task 1: Читать листы книги с номерами строк Excel

**Files:**
- Modify: `modules/imports/infrastructure/xlsx-workbook.ts` (новое после `readSheetMatrix`, строки 35–48 не трогать)
- Test: `modules/imports/infrastructure/xlsx-workbook.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** A sheet as Excel shows it: the rows that hold a value, and beside each the row number Excel prints on its left. */
  export interface NumberedSheet { rows: SheetMatrix; rowNumbers: readonly number[] }
  export function readNumberedSheets(bytes: ArrayBuffer | Uint8Array, names: readonly string[]): Partial<Record<string, NumberedSheet>>
  ```
  Ключ ответа — имя из `names` в том виде, в каком его передали. Лист ищется без учёта регистра и пробелов по краям. Если листа нет, ключа нет.

- [ ] **Step 1: Write the failing tests** (дописать в `xlsx-workbook.test.ts`)

```ts
test("a blank row and a sheet that starts at C4 keep the row numbers Excel shows", () => {
  const sheet = XLSX.utils.aoa_to_sheet([])
  XLSX.utils.sheet_add_aoa(sheet, [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-1", "W-1"], [], ["ISO-1", "W-2"]], { origin: "C4" })
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, " Weld ")
  const read = readNumberedSheets(XLSX.write(book, { bookType: "xlsx", type: "array" }) as Uint8Array, ["weld"])
  assert.deepEqual(read.weld?.rowNumbers, [4, 5, 7])
  assert.deepEqual(read.weld?.rows.map((row) => row.filter((cell) => cell !== "")), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-1", "W-1"], ["ISO-1", "W-2"]])
})

test("only the asked sheets are read, a missing one is left out, and dates read as the calendar day", () => {
  const bytes = buildWorkbook([{ name: "weld", rows: [["ISO_NUMBER"], ["ISO-1"]] }, { name: "Help", rows: [["note"]] }])
  const read = readNumberedSheets(bytes, ["weld", "trace"])
  assert.deepEqual(Object.keys(read), ["weld"])
  assert.deepEqual(read.weld, { rows: [["ISO_NUMBER"], ["ISO-1"]], rowNumbers: [1, 2] })
  // a dated cell: build it as in the existing "date cell" test of this file and expect "2026-09-01"
})
```

Тест на дату писать по образцу уже существующего теста с `cellDates` в этом же файле (строки 20–30).

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test modules/imports/infrastructure/xlsx-workbook.test.ts`
Expected: FAIL — `readNumberedSheets is not a function` (или ошибка импорта).

- [ ] **Step 3: Implement `readNumberedSheets` в `xlsx-workbook.ts`**

`XLSX.read(bytes, { type: "array", cellDates: true })` вызывается один раз на все имена. Для каждого найденного листа: `sheet_to_json<Record<string, unknown>>(ws, { header: "A", blankrows: false, defval: "" })`, колонки `encode_col(c)` для `c` от `decode_range(ws["!ref"]).s.c` до `.e.c`, ячейка-дата → `dateCellToIso` (функция уже есть в файле), номер строки — `(row as { __rowNum__: number }).__rowNum__ + 1`. Лист без `!ref` даёт `{ rows: [], rowNumbers: [] }`. В комментарии к функции сказать, почему `header: "A"`: только при нём SheetJS отдаёт `__rowNum__`.

- [ ] **Step 4: Run the file and the gates**

Run: `node --import tsx --test modules/imports/infrastructure/xlsx-workbook.test.ts && npm run typecheck && npm run lint`
Expected: PASS. Старые тесты `readSheetMatrix` и `readFirstSheetMatrix` проходят без правок.

- [ ] **Step 5: Commit**

```bash
git add modules/imports/infrastructure/xlsx-workbook.ts modules/imports/infrastructure/xlsx-workbook.test.ts
git commit -m "feat(import): read workbook sheets with the row numbers Excel shows"
```

---

### Task 2: Строка задания и замечание знают, откуда они

**Files:**
- Modify: `modules/engineering/domain/definition.ts`, `modules/engineering/domain/parsers/spoolgen-parser.ts:6`, `modules/engineering/domain/spoolgen-issue.ts:29-46`, `modules/engineering/domain/parsers/cross-file.ts:10,16`, `modules/engineering/application/import-spooling.ts:7-14`, `modules/engineering/application/import-table.ts:10,28-43`
- Test: `modules/engineering/application/import-spooling.test.ts`, `modules/engineering/application/import-table.test.ts`, `modules/engineering/domain/parsers/cross-file.test.ts:8,16`, `modules/engineering/application/import-pcf.test.ts:37`, `modules/engineering/application/pcf-unmapped.test.ts:10`

**Interfaces:**
- Consumes: ничего из Task 1 (номера строк приходят через `TableSource.rowNumbers`).
- Produces:
  ```ts
  // definition.ts
  /** A staging row and the records it is built from: an isometric from every weld row of it, a spool from the weld rows of the spool, anything else from its own row. */
  export interface StagingEntry { row: StagingRow; records: readonly SpoolgenRecord[] }
  export function buildStagingEntries(set: SpoolgenFileSet): StagingEntry[]
  export function buildStagingRows(set: SpoolgenFileSet): StagingRow[]   // = buildStagingEntries(set).map((entry) => entry.row), rows unchanged
  // spoolgen-parser.ts
  export interface SpoolgenRecord { role; lineNumber; fileName; values; /** The workbook sheet the record was read from; absent for a text or PCF file. */ sheet?: string }
  // spoolgen-issue.ts
  export interface SpoolgenIssue { /* … */ /** The file role of the record the issue points at: in one workbook a row number repeats on every sheet. */ role?: SpoolgenFileRole }
  export function spoolgenIssue(code, rowNumber, columnName, options: { fileName?: string | null; severity?: ImportIssueSeverity; role?: SpoolgenFileRole } = {}): SpoolgenIssue
  // import-spooling.ts
  export interface SpoolgenSubmission { rows: StagingRow[]; rowSources: readonly (readonly SpoolgenRecord[])[]; issues; summary; canSubmit }
  // import-table.ts
  export interface TableSource { role: SpoolgenFileRole; fileName: string; matrix: readonly (readonly unknown[])[]; sheet?: string; rowNumbers?: readonly number[] }
  ```
  `rowSources[i]` — записи строки `rows[i]`. `role` попадает в замечание, только если передан: литералы в старых тестах без `role` остаются верными. `sheet` есть только у записей, прочитанных из листа книги.

- [ ] **Step 1: Write the failing tests**

В `import-spooling.test.ts`:

```ts
test("every staging row names the records it is built from, and the rows stay as they were", () => {
  const set = { ...emptyFileSet(), weld: [weldRecord(1, "ISO-A", "SP-1", "W-1"), weldRecord(2, "ISO-A", "SP-2", "W-2"), weldRecord(3, "ISO-B", "SP-1", "W-3")], trace: [traceRecord(1, "ISO-A", "SP-1")] }
  const entries = buildStagingEntries(set)
  assert.deepEqual(entries.map((entry) => entry.row), buildStagingRows(set))
  const linesOf = (kind: string) => entries.filter((entry) => entry.row.normalizedValues.entity_type === kind).map((entry) => entry.records.map((record) => `${record.role}:${record.lineNumber}`))
  assert.deepEqual(linesOf("isometric"), [["weld:1", "weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("spool"), [["weld:1"], ["weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("weld_joint"), [["weld:1"], ["weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("material"), [["trace:1"]])
})
```

(`weldRecord`/`traceRecord` — локальные фабрики `SpoolgenRecord` в тесте; ключ катушки — `iso_number::spool_number`, как в `definition.ts:9`.)

В `import-table.test.ts`:

```ts
test("a workbook sheet gives Excel's row numbers to records and issues, and the role to each issue", () => {
  const header = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"]
  const sheet: TableSource = { role: "weld", fileName: "book.xlsx", sheet: "weld", matrix: [header, ["ISO-1", "R0", "A", "C", "S-1", "W-1", "BW", 6], ["ISO-1", "R0", "A", "C", "S-1", "", "BW", 6]], rowNumbers: [1, 2, 4] }
  const submission = buildTableSubmission([sheet], { kind: "table", columns: {} })
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.rowNumber, issue.role]), [["MISSING_VALUE", 4, "weld"]])
  const welds = submission.rowSources.filter((records, index) => submission.rows[index].normalizedValues.entity_type === "weld_joint")
  assert.deepEqual(welds.map(([record]) => [record.lineNumber, record.sheet]), [[2, "weld"], [4, "weld"]])
})
```

В `cross-file.test.ts` (строки 8 и 16) добавить `role: "bolt"` и `role: "weld"` в ожидаемые литералы. Новая строка: катушка-сирота из `trace` даёт `role: "trace"`. В `import-pcf.test.ts:37` ожидаемое становится `spoolgenIssue("ISO_MIXED_LINE", 9, "line_number", { fileName: "ISO-M.pcf", role: "weld" })`. В `pcf-unmapped.test.ts:10` литерал `SpoolgenSubmission` получает `rowSources: rows.map(() => [])`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test modules/engineering/application/import-spooling.test.ts modules/engineering/application/import-table.test.ts modules/engineering/domain/parsers/cross-file.test.ts`
Expected: FAIL — `buildStagingEntries` не экспортирован, `rowSources` undefined, нет `role`.

- [ ] **Step 3: Implement**

- `definition.ts`: обход, который сейчас строит строки, начинает строить `StagingEntry`. Для изометрии берутся все записи `weld` с её `iso_number`, для катушки — записи с её `iso_number::spool_number`. Порядок и номера строк не меняются. `buildStagingRows` возвращает `.map((entry) => entry.row)`.
- `spoolgenIssue`: `...(options.role === undefined ? {} : { role: options.role })`.
- `cross-file.ts`: в обеих функциях `role: record.role` (для изометрии — `records[0].role`).
- `buildSubmissionFromSet`: `rows` и `rowSources` из одного `buildStagingEntries(set)`.
- `buildTableSubmission`: если у источника есть `rowNumbers`, то `lineNumber` записи и `rowNumber` замечания (не `null`) переводятся в `rowNumbers[n]`. Записи получают `sheet: source.sheet`. Замечания разбора получают `role: source.role` рядом с уже существующим `fileName`. Остальное поведение то же.

- [ ] **Step 4: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS. Если где-то ещё сравнивается литерал замечания из `checkCrossFileConsistency` или `checkIsoUniformity`, в ожидаемое добавить `role` (это единственная причина падений, которую стоит ждать).

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/domain/definition.ts modules/engineering/domain/parsers/spoolgen-parser.ts modules/engineering/domain/spoolgen-issue.ts modules/engineering/domain/parsers/cross-file.ts modules/engineering/domain/parsers/cross-file.test.ts modules/engineering/application/import-spooling.ts modules/engineering/application/import-spooling.test.ts modules/engineering/application/import-table.ts modules/engineering/application/import-table.test.ts modules/engineering/application/import-pcf.test.ts modules/engineering/application/pcf-unmapped.test.ts
git commit -m "feat(import): each staging row and issue knows the rows it came from"
```

---

### Task 3: Одна книга — все листы ролей, лист weld обязателен

**Files:**
- Modify: `modules/engineering/application/import-table.ts`
- Test: `modules/engineering/application/import-table.test.ts`, `modules/engineering/application/import-template-roundtrip.test.ts:29-56`

**Interfaces:**
- Consumes: `readNumberedSheets`, `NumberedSheet` (Task 1); `TableSource.sheet/rowNumbers`, `rowSources` (Task 2).
- Produces:
  ```ts
  /** What one picked workbook gives: nothing to send without a weld sheet or with a required column missing, else the submission. */
  export type WorkbookReading =
    | { kind: "noWeldSheet" }
    | { kind: "missingColumns"; sheets: { sheet: SpoolgenFileRole; headers: string[] }[] }
    | { kind: "ready"; submission: SpoolgenSubmission }
  export function readWorkbookUpload(fileName: string, sheets: Partial<Record<SpoolgenFileRole, { rows: readonly (readonly unknown[])[]; rowNumbers: readonly number[] }>>): WorkbookReading
  ```
  Правила. Листа `weld` нет, или в нём ноль строк → `noWeldSheet`. Необязательный лист без строк пропускается, как будто его нет. Каждый лист становится `TableSource { role, fileName, sheet: role, matrix: rows, rowNumbers }`. Если в каком-то листе нет обязательной колонки → `missingColumns`: листы идут в порядке `SPOOLGEN_FILE_ROLES`, заголовки — `canonicalHeader` из `SPOOLGEN_CONTRACT` в порядке контракта. Иначе `ready`. Пока параметр `settings` у `buildTableSubmission` существует, передаётся `{ kind: "table", columns: {} }` (уйдёт в Task 7).

- [ ] **Step 1: Write the failing tests**

В `import-table.test.ts`:

```ts
const rowsOf = (rows: unknown[][]) => ({ rows, rowNumbers: rows.map((_, index) => index + 1) })
const WELD = [["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"], ["ISO-1", "R0", "A", "C", "S-1", "W-1", "BW", 6]]

test("a workbook without a weld sheet, or with an empty one, is not sent", () => {
  assert.deepEqual(readWorkbookUpload("b.xlsx", { trace: rowsOf([["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], ["ISO-1", "S-1", "P"]]) }), { kind: "noWeldSheet" })
  assert.deepEqual(readWorkbookUpload("b.xlsx", { weld: rowsOf([]) }), { kind: "noWeldSheet" })
})

test("a sheet without a required column names it by the template header", () => {
  const noArea = WELD.map((row) => row.filter((_, index) => index !== 2))
  assert.deepEqual(readWorkbookUpload("b.xlsx", { weld: rowsOf(noArea) }), { kind: "missingColumns", sheets: [{ sheet: "weld", headers: ["PDS_AREA"] }] })
})

test("an optional sheet cleared to nothing is skipped, not an empty-file error", () => {
  const reading = readWorkbookUpload("b.xlsx", { weld: rowsOf(WELD), trace: rowsOf([]) })
  assert.equal(reading.kind, "ready")
  assert.deepEqual(reading.kind === "ready" ? reading.submission.issues : null, [])
})
```

В `import-template-roundtrip.test.ts` переписать первые два теста (строки 29–56) под одну книгу:

```ts
for (const locale of ["en", "ru"] as const) {
  test(`the downloaded workbook uploads in one pick with all four sheets and no issue (${locale})`, () => {
    const bytes = buildWorkbook(tableTemplateSheets(translatorFor(locale), REFERENCES))
    const reading = readWorkbookUpload("spooling-template.xlsx", readNumberedSheets(bytes, SPOOLGEN_FILE_ROLES))
    assert.equal(reading.kind, "ready", locale)
    if (reading.kind !== "ready") return
    assert.deepEqual(reading.submission.issues, [], locale)
    assert.equal(reading.submission.rows.length, 6, locale) // isometric, spool, weld, support, flange joint, material
    assert.deepEqual(rowsOf(reading.submission, "weld_joint").map(/* the same tuple as now */), [WELD], locale)
    assert.deepEqual(reading.submission.rowSources.flat().map((record) => [record.sheet, record.lineNumber]).filter(([sheet]) => sheet !== "weld"), [["supp", 2], ["bolt", 2], ["trace", 2]], locale)
  })
}

test("the help and the codes sheets are never read as data", () => {
  const read = readNumberedSheets(buildWorkbook(tableTemplateSheets(translatorFor("en"), REFERENCES)), SPOOLGEN_FILE_ROLES)
  assert.deepEqual(Object.keys(read).sort(), [...SPOOLGEN_FILE_ROLES].sort())
  for (const role of SPOOLGEN_FILE_ROLES) assert.deepEqual(read[role]?.rowNumbers, [1, 2], role)
})
```

Тест CSV в этом файле (строки 58–65) пока остаётся, его уберёт Task 5. Импорты `readSheetMatrix`, `buildTableSubmission`, `TableSource`, `NO_MAPPING`, ставшие лишними после переписывания, удалить.

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test modules/engineering/application/import-table.test.ts modules/engineering/application/import-template-roundtrip.test.ts`
Expected: FAIL — `readWorkbookUpload is not a function`.

- [ ] **Step 3: Implement `readWorkbookUpload` в `import-table.ts`**

- [ ] **Step 4: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/application/import-table.ts modules/engineering/application/import-table.test.ts modules/engineering/application/import-template-roundtrip.test.ts
git commit -m "feat(import): one workbook upload reads every role sheet, weld required"
```

---

### Task 4: Записи списка: одна причина — одна запись, лист, колонка, строки Excel

**Files:**
- Create: `modules/engineering/application/issue-entries.ts`, `modules/engineering/application/issue-entries.test.ts`, `modules/engineering/ui/issue-entry-text.ts`, `modules/engineering/ui/issue-entry-text.test.ts`, `modules/engineering/ui/issue-entry-list.tsx`
- Modify: `modules/engineering/domain/spoolgen-issue.ts`, `modules/engineering/ui/spoolgen-issue-text.ts:6` (`FILE_CODES` переезжает в домен), `modules/imports/ui/import-issue-list.tsx:14-24` (только `export` у двух констант), `messages/en/spooling.json`, `messages/ru/spooling.json`

**Interfaces:**
- Consumes: `SpoolgenSubmission.rowSources`, `SpoolgenIssue.role`, `SpoolgenRecord.sheet` (Task 2); `readWorkbookUpload`, `readNumberedSheets` (тесты).
- Produces:
  ```ts
  // spoolgen-issue.ts — the codes the server's spooling check can store; the screen has one sentence per code
  export const SPOOLING_SERVER_ISSUE_CODES = ["SRV_PDS_MISSING", "SRV_SERVICE_CLASS_MISSING", "SRV_WELD_TYPE_MISSING", "SRV_THICKNESS_MISSING", "SRV_NDE_MATRIX_MISSING", "SRV_WPS_MISSING", "SRV_ISO_MIXED_LINE", "SRV_ISO_MIXED_SERVICE_CLASS", "SRV_ORPHAN_SPOOL", "SRV_SPOOLING_SPINE_MISSING", "SRV_SPOOLING_JOB_TOO_LARGE"] as const
  export type SpoolingServerIssueCode = (typeof SPOOLING_SERVER_ISSUE_CODES)[number]
  // application/issue-entries.ts
  export interface IssuePlace { sheet: string | null; file: string | null; column: string | null; rows: readonly number[] }
  export interface IssueEntry { severity: ImportIssueSeverity; code: string; args: Readonly<Record<string, string | number>>; message: string; place: IssuePlace }
  export function buildIssueEntries(submission: SpoolgenSubmission, stored: readonly StoredImportIssue[]): IssueEntry[]
  export function countIssueEntries(entries: readonly IssueEntry[]): { errors: number; warnings: number }
  // ui/issue-entry-text.ts
  export function formatRowRanges(rows: readonly number[]): { text: string; more: number }
  export function describeIssueEntry(t: SpoolingTranslator, entry: IssueEntry): string
  export function describeIssuePlace(t: SpoolingTranslator, place: IssuePlace): string
  // ui/issue-entry-list.tsx
  export function IssueEntryList({ entries }: { entries: readonly IssueEntry[] }): JSX.Element
  ```

**Как `buildIssueEntries` строит записи** (тесты не определяют порядок шагов, поэтому они расписаны здесь):

1. Замечания браузера — `submission.issues`. Серверные — элементы `stored`, у которых `!isSpoolgenIssueCode(code)`. Записанные в базу замечания браузера не используются: они те же, но без `role`.
2. Каждое замечание превращается в список записей-источников:
   - код о файле целиком (`FILE_CODES` из `spoolgen-issue-text.ts` — вынести в `spoolgen-issue.ts` и импортировать оттуда в обоих местах): записей нет, `place = { file: fileName, sheet: null, column: null, rows: [] }`, `columnName` (в нём роль) не показывается;
   - замечание браузера: запись ищется по ключу `${role}|${fileName ?? ""}|${rowNumber}` среди `rowSources.flat()`. Для `ISO_MIXED_*` источники — все записи `weld` с тем же `iso_number`. Если запись не найдена (например, у PCF нет `role`), `place = { file: fileName, rows: rowNumber === null ? [] : [rowNumber] }`;
   - серверное замечание со строкой: строка задания с этим `rowNumber` в `submission.rows`, её источники — `rowSources` того же индекса; без строки — источников нет.
3. Близнецы: `SRV_ORPHAN_SPOOL` → `ORPHAN_SPOOL`, `SRV_ISO_MIXED_LINE` → `ISO_MIXED_LINE`, `SRV_ISO_MIXED_SERVICE_CLASS` → `ISO_MIXED_SERVICE_CLASS`. Серверный близнец без строки отбрасывается, если браузер сообщил тот же код: оба правила одинаково группируют стыки по изометрии. Если браузер этого кода не сообщил, близнец остаётся под своим `SRV_`-кодом, без места.
4. Значения для текста (`args`) — по таблице ниже. Для серверных берутся из `normalizedValues` строки задания, для браузерных — из `values` записи.
5. Место: источники делятся по паре (лист, файл): `sheet = record.sheet ?? null`, `file = record.sheet ? null : record.fileName`. `column` — `canonicalHeader` поля `columnName` в `SPOOLGEN_CONTRACT[record.role]` (если поля нет — `columnName` как есть), `rows` — `lineNumber` источников.
6. Записи с одинаковыми `severity · code · sheet · file · column · args` сливаются: строки объединяются, сортируются по возрастанию, повторы убираются.
7. Порядок: `blocker` → `conflict` → `warning`. Внутри: сначала записи без строк, затем по листу (`weld`, `trace`, `bolt`, `supp`), потом по файлу (по имени), потом по первой строке.
8. `countIssueEntries` считает записи `blocker` и `warning`.

| Код | `args` | Откуда |
|---|---|---|
| `SRV_PDS_MISSING` | `pdsArea` | `pds_area` |
| `SRV_SERVICE_CLASS_MISSING` | `serviceClass` | `service_class` |
| `SRV_WELD_TYPE_MISSING` | `weldType` | `weld_type` |
| `SRV_THICKNESS_MISSING` | `serviceClass`, `diameter` | `service_class`, `diameter_inch` |
| `SRV_NDE_MATRIX_MISSING` | `serviceClass`, `weldType`, `location` | `service_class`, `weld_type`, `weld_location` |
| `SRV_WPS_MISSING` | `diameter`, `thickness`, `hasThickness` (`"yes"`/`"no"`) | `diameter_inch`, `thickness_mm` (толщину, которую сервер взял из правила, браузер не знает: тогда `hasThickness: "no"`) |
| `ORPHAN_SPOOL` (и близнец) | `iso`, `spool` | `iso_number`, `spool_number` |
| `ISO_MIXED_LINE`, `ISO_MIXED_SERVICE_CLASS`, `ISO_MIXED_REVISION` | `iso` | `iso_number` записи |
| `MISSING_VALUE`, `MISSING_COLUMN` | `column` | заголовок шаблона для `columnName` |
| `INVALID_NUMBER` | `column`, `value` | заголовок; `values[columnName]` записи |
| `SRV_SPOOLING_JOB_TOO_LARGE` | `count` | число строк `weld_joint` в `submission.rows` |
| остальные | — | — |

- [ ] **Step 1: Write the failing tests** — `issue-entries.test.ts`

Все тесты, кроме сквозного, строят `submission` через `buildTableSubmission` по `TableSource` с `sheet: "weld"` и явными `rowNumbers`. `stored` — литералы `StoredImportIssue`.

```ts
test("a server error on an isometric points at every weld row of it, in Excel's numbers, as one entry", () => {
  // weld sheet: header at 1, ISO-A at rows 2–41 and 45 (rows 42–44 blank), PDS_AREA "Z-999" everywhere
  const entries = buildIssueEntries(submission, [stored("SRV_PDS_MISSING", 1, "pds_area")])
  assert.deepEqual(entries, [{ severity: "blocker", code: "SRV_PDS_MISSING", args: { pdsArea: "Z-999" }, message: "m", place: { sheet: "weld", file: null, column: "PDS_AREA", rows: [...range(2, 41), 45] } }])
})
test("two isometrics with the same unknown area are one entry with the rows of both", () => { /* SRV_PDS_MISSING on staging rows 1 and 2 → one entry, rows of ISO-A and ISO-B */ })
test("a weld error points at its row and a spool error at the rows of its spool", () => {
  // stored("SRV_WELD_TYPE_MISSING", <weld_joint row>) → rows [its Excel row]; stored("SRV_X", <spool row>) → rows of that spool, code "SRV_X", message kept
})
test("a problem the browser and the server both find is listed once", () => {
  // trace row 5 orphan: browser ORPHAN_SPOOL + stored SRV_ORPHAN_SPOOL on its material row → one ORPHAN_SPOOL entry, sheet "trace", rows [5]
  // ISO-A mixed classes: browser ISO_MIXED_SERVICE_CLASS + stored SRV_ISO_MIXED_SERVICE_CLASS with row null → one entry, rows = all weld rows of ISO-A
})
test("the same row number on two sheets stays on its own sheet", () => {
  // orphans at row 5 of trace and row 5 of bolt → two ORPHAN_SPOOL entries, sheets "trace" and "bolt"
})
test("errors come before warnings, whole-upload entries first, and the count is per entry", () => {
  // SRV_WPS_MISSING (warning) + SRV_WELD_TYPE_MISSING ×3 rows + SRV_SPOOLING_SPINE_MISSING (row null)
  assert.deepEqual(entries.map((entry) => entry.code), ["SRV_SPOOLING_SPINE_MISSING", "SRV_WELD_TYPE_MISSING", "SRV_WPS_MISSING"])
  assert.deepEqual(countIssueEntries(entries), { errors: 2, warnings: 1 })
})
test("the job-size error counts the welds this file sent", () => {
  assert.deepEqual(buildIssueEntries(submission, [stored("SRV_SPOOLING_JOB_TOO_LARGE", null, null)])[0].args, { count: /* weld_joint rows */ 3 })
})
test("a workbook with a blank row between the data names the Excel row of the error after it", () => {
  const bytes = buildWorkbook([{ name: "weld", rows: [WELD_HEADER, goodRow, [], rowWithoutWeldNumber] }])
  const reading = readWorkbookUpload("book.xlsx", readNumberedSheets(bytes, ["weld"]))
  assert.equal(reading.kind, "ready")
  if (reading.kind !== "ready") return
  assert.deepEqual(buildIssueEntries(reading.submission, []).map((entry) => [entry.code, entry.place.sheet, entry.place.column, entry.place.rows]), [["MISSING_VALUE", "weld", "WELD_NUMBER", [4]]])
})
test("a PCF issue without a record keeps its file and line", () => {
  // { ...submission, issues: [spoolgenIssue("PCF_BORE_UNKNOWN", 12, "diameter_inch", { fileName: "ISO-1.pcf" })] } → place { sheet: null, file: "ISO-1.pcf", rows: [12] }
})
```

`issue-entry-text.test.ts`:

```ts
test("rows read as ranges, at most ten of them", () => {
  assert.deepEqual(formatRowRanges([...range(2, 41), 45]), { text: "2–41, 45", more: 0 })
  assert.deepEqual(formatRowRanges([7]), { text: "7", more: 0 })
  assert.deepEqual(formatRowRanges([3, 4]), { text: "3–4", more: 0 })
  assert.deepEqual(formatRowRanges(range(1, 15).map((n) => n * 2)), { text: "2, 4, 6, 8, 10, 12, 14, 16, 18, 20", more: 5 })
})
test("a place reads as Excel shows it", () => {
  const ru = translatorFor("ru")
  assert.equal(describeIssuePlace(ru, { sheet: "weld", file: null, column: "PDS_AREA", rows: [...range(2, 41), 45] }), "Лист weld, колонка PDS_AREA, строки 2–41, 45")
  assert.equal(describeIssuePlace(ru, { sheet: "weld", file: null, column: null, rows: [7] }), "Лист weld, строка 7")
  assert.equal(describeIssuePlace(ru, { sheet: null, file: "weld.txt", column: "PDS_AREA", rows: [1] }), "weld.txt, колонка PDS_AREA, строка 1")
  assert.equal(describeIssuePlace(translatorFor("en"), { sheet: "weld", file: null, column: "PDS_AREA", rows: [2, 3] }), "Sheet weld, column PDS_AREA, rows 2–3")
  assert.match(describeIssuePlace(ru, { sheet: "weld", file: null, column: null, rows: range(1, 15).map((n) => n * 2) }), /и ещё 5 строк$/)
})
for (const locale of ["en", "ru"] as const) {
  test(`every browser and server code has a title in ${locale}`, () => {
    for (const code of [...SPOOLGEN_ISSUE_CODES, ...SPOOLING_SERVER_ISSUE_CODES]) {
      const text = describeIssueEntry(translatorFor(locale), { severity: "blocker", code, args: SAMPLE_ARGS, message: "server sentence", place: EMPTY_PLACE })
      assert.ok(text.length > 0 && text !== "server sentence" && !/^spooling\./.test(text), code)
      assert.doesNotMatch(text, /\{|\}/, code)
    }
  })
}
test("every server code reaches the screen in Russian, through the entries", () => {
  // for each SPOOLING_SERVER_ISSUE_CODES: a stored issue on the row kind it is raised on (PDS, SERVICE_CLASS → isometric row;
  // WELD_TYPE, THICKNESS, NDE, WPS → weld_joint row; ORPHAN → material row; ISO_MIXED_*, SPINE, TOO_LARGE → null),
  // buildIssueEntries → describeIssueEntry(ru) differs from describeIssueEntry(en) and holds no "{"
})
test("an unknown server code keeps the server's own sentence", () => {
  assert.equal(describeIssueEntry(translatorFor("ru"), { severity: "warning", code: "SRV_NEW", args: {}, message: "New check", place: EMPTY_PLACE }), "New check")
})
test("the summary counts errors in Russian plurals and says what to do", () => { /* t("issueSummary.errors", { count: 1 | 2 | 5 }) differ; t("issueSummary.none") */ })
```

`SAMPLE_ARGS = { pdsArea: "A", serviceClass: "C", weldType: "BW", diameter: "4", thickness: "6", hasThickness: "yes", location: "shop", iso: "ISO-1", spool: "S-1", column: "PDS_AREA", value: "x", count: 8000 }`, `EMPTY_PLACE = { sheet: null, file: null, column: null, rows: [] }`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test modules/engineering/application/issue-entries.test.ts modules/engineering/ui/issue-entry-text.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: Implement `issue-entries.ts`, `issue-entry-text.ts`, `SPOOLING_SERVER_ISSUE_CODES`**

`describeIssueEntry`: если код есть в `SPOOLGEN_ISSUE_CODES` или `SPOOLING_SERVER_ISSUE_CODES`, возвращается `t(\`issueTitles.${code}\`, entry.args)`. Иначе — `entry.message`. Ключ приводится к типу так же, как в `importTypeLabel` (`import-issue-text.ts:41`). `describeIssuePlace` склеивает через `", "`: `place.sheet ? t("issuePlace.sheet") : place.file`, затем `issuePlace.column`, затем `issuePlace.rows` (`several: rows.length > 1 ? "yes" : "no"`, `list: formatRowRanges(rows).text`), а при `more > 0` — ещё `" " + t("issuePlace.more", { count: more })`. Пустые части пропускаются. Диапазон пишется через «–» (U+2013), части — через `", "`.

- [ ] **Step 4: Add the messages** — новые ключи в `spooling` (en и ru, тексты дословно):

```json
"issueTitles": {
  "EMPTY_FILE": "The file has no rows.",
  "MISSING_COLUMN": "The required column {column} is missing.",
  "MISSING_VALUE": "The required column {column} is empty.",
  "INVALID_NUMBER": "\"{value}\" in {column} is not a number.",
  "ORPHAN_SPOOL": "Spool \"{spool}\" of isometric \"{iso}\" is not in the weld list.",
  "ISO_MIXED_SERVICE_CLASS": "Isometric \"{iso}\" has more than one service class.",
  "ISO_MIXED_LINE": "Isometric \"{iso}\" has more than one line number.",
  "ISO_MIXED_REVISION": "Isometric \"{iso}\" has more than one revision.",
  "FILE_EMPTY": "The file is empty.",
  "FILE_TOO_LARGE": "The file is over the size limit.",
  "MISSING_REQUIRED_FILE": "The weld file is required.",
  "PCF_UNKNOWN_UNITS": "The file was not read: UNITS-BORE is missing or is not INCH, MM or INCH-SIXTEENTH.",
  "PCF_NO_WELDS": "The file has no WELD block; welds not written as a WELD block are not read.",
  "PCF_BORE_UNKNOWN": "The weld's bore in millimetres is not a standard DN, so it has no size in inches.",
  "PCF_SPOOL_FROM_FILE_NAME": "No SPOOL-IDENTIFIER: all welds of the file are put in one spool named after the file.",
  "DUPLICATE_FILE": "A file with this name was added more than once.",
  "SRV_PDS_MISSING": "PDS area \"{pdsArea}\" does not exist in the project.",
  "SRV_SERVICE_CLASS_MISSING": "Service class \"{serviceClass}\" does not exist in the project.",
  "SRV_WELD_TYPE_MISSING": "Weld type \"{weldType}\" does not exist in the project.",
  "SRV_THICKNESS_MISSING": "The check found no thickness rule for service class \"{serviceClass}\" at {diameter}″. Add the rule if it is missing, and upload the file again.",
  "SRV_NDE_MATRIX_MISSING": "No NDE matrix rule covers service class \"{serviceClass}\", weld type \"{weldType}\" and {location, select, field {field welds} assembly {assembly welds} other {shop welds}}.",
  "SRV_WPS_MISSING": "No approved WPS covers welds of {diameter}″{hasThickness, select, yes { and {thickness} mm} other {}}. The import may still proceed.",
  "SRV_ISO_MIXED_LINE": "An isometric has more than one line number.",
  "SRV_ISO_MIXED_SERVICE_CLASS": "An isometric has more than one service class.",
  "SRV_ORPHAN_SPOOL": "A spool is not in the weld list.",
  "SRV_SPOOLING_SPINE_MISSING": "There are no welds: isometrics and spools are made from the weld rows.",
  "SRV_SPOOLING_JOB_TOO_LARGE": "{count, plural, one {# weld is} other {# welds are}} more than one job takes. Split the file by PDS area and upload the parts one after another."
},
"issuePlace": { "sheet": "Sheet {sheet}", "column": "column {column}", "rows": "{several, select, yes {rows {list}} other {row {list}}}", "more": "{count, plural, one {and # more row} other {and # more rows}}" },
"issueSummary": { "errors": "{count, plural, one {# error} other {# errors}}: fix the file and upload it again.", "none": "No errors: review the changes below and apply the import." }
```

```json
"issueTitles": {
  "EMPTY_FILE": "В файле нет ни одной строки.",
  "MISSING_COLUMN": "Нет обязательной колонки {column}.",
  "MISSING_VALUE": "Не заполнена обязательная колонка {column}.",
  "INVALID_NUMBER": "«{value}» в колонке {column} — не число.",
  "ORPHAN_SPOOL": "Катушки «{spool}» изометрии «{iso}» нет в списке стыков.",
  "ISO_MIXED_SERVICE_CLASS": "У изометрии «{iso}» больше одного класса сервиса.",
  "ISO_MIXED_LINE": "У изометрии «{iso}» больше одного номера линии.",
  "ISO_MIXED_REVISION": "У изометрии «{iso}» больше одной ревизии.",
  "FILE_EMPTY": "Файл пуст.",
  "FILE_TOO_LARGE": "Файл больше допустимого размера.",
  "MISSING_REQUIRED_FILE": "Нет обязательного файла стыков.",
  "PCF_UNKNOWN_UNITS": "Файл не прочитан: UNITS-BORE не задан или не равен INCH, MM или INCH-SIXTEENTH.",
  "PCF_NO_WELDS": "В файле нет ни одного блока WELD; стыки без блока WELD не читаются.",
  "PCF_BORE_UNKNOWN": "Диаметр стыка в миллиметрах не входит в ряд стандартных DN, поэтому его нельзя перевести в дюймы.",
  "PCF_SPOOL_FROM_FILE_NAME": "Нет SPOOL-IDENTIFIER: все стыки файла отнесены к одной катушке, названной по имени файла.",
  "DUPLICATE_FILE": "Файл с этим именем добавлен больше одного раза.",
  "SRV_PDS_MISSING": "Зоны PDS «{pdsArea}» нет в проекте.",
  "SRV_SERVICE_CLASS_MISSING": "Класса сервиса «{serviceClass}» нет в проекте.",
  "SRV_WELD_TYPE_MISSING": "Типа стыка «{weldType}» нет в проекте.",
  "SRV_THICKNESS_MISSING": "При проверке не нашлось правила толщины для класса сервиса «{serviceClass}» и диаметра {diameter}″. Добавьте правило, если его нет, и загрузите файл снова.",
  "SRV_NDE_MATRIX_MISSING": "Нет правила матрицы NDE для класса сервиса «{serviceClass}», типа стыка «{weldType}» и {location, select, field {монтажных стыков} assembly {сборочных стыков} other {цеховых стыков}}.",
  "SRV_WPS_MISSING": "Ни одна одобренная WPS не покрывает стыки диаметром {diameter}″{hasThickness, select, yes { и толщиной {thickness} мм} other {}}. Импорт можно продолжить.",
  "SRV_ISO_MIXED_LINE": "У одной из изометрий больше одного номера линии.",
  "SRV_ISO_MIXED_SERVICE_CLASS": "У одной из изометрий больше одного класса сервиса.",
  "SRV_ORPHAN_SPOOL": "Катушки нет в списке стыков.",
  "SRV_SPOOLING_SPINE_MISSING": "Нет ни одного стыка: изометрии и катушки создаются из строк стыков.",
  "SRV_SPOOLING_JOB_TOO_LARGE": "{count, plural, one {# стык} few {# стыка} many {# стыков} other {# стыка}} — больше, чем принимает одно задание. Разделите файл по зонам PDS и загрузите части по очереди."
},
"issuePlace": { "sheet": "Лист {sheet}", "column": "колонка {column}", "rows": "{several, select, yes {строки {list}} other {строка {list}}}", "more": "{count, plural, one {и ещё # строка} few {и ещё # строки} many {и ещё # строк} other {и ещё # строки}}" },
"issueSummary": { "errors": "{count, plural, one {# ошибка} few {# ошибки} many {# ошибок} other {# ошибки}} — исправьте файл и загрузите его снова.", "none": "Ошибок нет — проверьте изменения ниже и примените импорт." }
```

- [ ] **Step 5: Build `IssueEntryList`**

Сверху одна строка итога: если ошибок больше нуля — `issueSummary.errors` с `count = countIssueEntries(entries).errors`, иначе `issueSummary.none`. Ниже `<ul>`, один `<li>` на запись. В записи значок важности (`StatusBadge` с `SEVERITY_TONE` и `t("severity.…")`), заголовок `describeIssueEntry`, под ним мелким шрифтом `describeIssuePlace` (если строка непустая). Фон записи — `SEVERITY_STYLE`, как у `ImportIssueList`. Обе константы экспортировать из `import-issue-list.tsx`, больше в этом файле ничего не менять. Ключ `<li>` — `entry.code` плюс индекс. Компонент пока никто не вызывает, его включит Task 6.

- [ ] **Step 6: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS, в том числе `i18n/messages.test.ts`: аргументы en и ru совпадают, у русских plural есть ветки one, few, many и other, «НК» нигде нет.

- [ ] **Step 7: Commit**

```bash
git add modules/engineering/application/issue-entries.ts modules/engineering/application/issue-entries.test.ts modules/engineering/ui/issue-entry-text.ts modules/engineering/ui/issue-entry-text.test.ts modules/engineering/ui/issue-entry-list.tsx modules/engineering/ui/spoolgen-issue-text.ts modules/engineering/domain/spoolgen-issue.ts modules/imports/ui/import-issue-list.tsx messages/en/spooling.json messages/ru/spooling.json
git commit -m "feat(import): issues grouped by reason with sheet, column and Excel rows"
```

---

### Task 5: Убрать CSV: шаблон, кнопку и образец реестра

**Files:**
- Modify: `modules/engineering/ui/import-template-download.tsx:60-69`, `modules/engineering/infrastructure/import-template-files.ts:9-10,17-29`, `modules/engineering/infrastructure/import-template-files.test.ts:25-48`, `modules/engineering/application/import-template-roundtrip.test.ts:58-65`, `modules/engineering/application/import-samples.test.ts:5-11,163-230`, `fixtures/import-samples/README.md`, `messages/{en,ru}/spooling.json` (`templates.download.tableCsv`)
- Delete: `fixtures/import-samples/table/weld-register-cp1251.csv`

**Interfaces:**
- Produces: у плитки «table» `ImportTemplateDownload` отдаёт одну кнопку `templates.download.tableXlsx` (без обёртки `div`: ряд кнопок собирает панель в Task 6).

- [ ] **Step 1: Удалить и проверить, что имена больше никто не вызывает**

Из `import-template-files.ts` убрать `CSV_TEMPLATE_ROLE` и `buildTemplateCsv`. Из `import-template-files.test.ts` — два теста про CSV. Из `import-template-roundtrip.test.ts` — тест «the CSV template uploads…» и ставшие лишними импорты (`buildTemplateCsv`, `decodeText`, `parseDelimited`). Из `import-samples.test.ts` — четыре теста `CSV: …`, `REGISTER_HEADERS`, `REGISTER_SETTINGS`, `register` и импорты, которые использовались только ими. Удалить ключ `templates.download.tableCsv` в обоих языках, кнопку CSV и файл образца (`git rm`).

Run: `grep -rnE "buildTemplateCsv|CSV_TEMPLATE_ROLE|tableCsv|weld-register-cp1251|REGISTER_SETTINGS" modules app scripts fixtures messages`
Expected: пусто.

- [ ] **Step 2: Поправить `fixtures/import-samples/README.md`**

Заголовок: «Образцы файлов для импорта (PCF)». В «Тест читает файлы так же, как экран» остаются `decodeText` и `buildPcfSubmission`. Удалить строку `table/weld-register-cp1251.csv` из таблицы «Что взято откуда», весь раздел `**table/weld-register-cp1251.csv**` вместе с таблицей сопоставления, пункт про `iconv` в «Как менять образцы». В последнем разделе написать «Excel» вместо «Excel/CSV» и одну фразу: свой реестр в его собственном виде больше не загружается, только через шаблон, а сквозной тест проверяет, что скачанная книга загружается одним выбором файла.

- [ ] **Step 3: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS. Сопоставление колонок старой панели в этот момент ещё работает (`table-import-panel.tsx` не тронут).

- [ ] **Step 4: Commit**

```bash
git add modules/engineering/ui/import-template-download.tsx modules/engineering/infrastructure/import-template-files.ts modules/engineering/infrastructure/import-template-files.test.ts modules/engineering/application/import-template-roundtrip.test.ts modules/engineering/application/import-samples.test.ts fixtures/import-samples/README.md fixtures/import-samples/table/weld-register-cp1251.csv messages/en/spooling.json messages/ru/spooling.json
git commit -m "refactor(import): drop the CSV template and the CSV register sample"
```

---

### Task 6: Плитка Excel: скачать шаблон и загрузить заполненный; список после проверки

**Files:**
- Create: `modules/engineering/ui/excel-import-panel.tsx`
- Rename + modify: `git mv modules/engineering/ui/table-import-panel.tsx modules/engineering/ui/spoolgen-import-panel.tsx`
- Modify: `modules/engineering/ui/spooling-import.tsx`, `modules/engineering/domain/import-template.ts:30,87`, `scripts/i18n/find-ui-literals.ts:28`, `messages/{en,ru}/spooling.json`, `modules/engineering/ui/engineering-i18n.test.ts`

**Interfaces:**
- Consumes: `readNumberedSheets` (Task 1), `readWorkbookUpload` (Task 3), `buildIssueEntries`, `countIssueEntries`, `IssueEntryList` (Task 4), `ImportTemplateDownload` (Task 5).
- Produces:
  ```ts
  export function ExcelImportPanel({ projectId, canManage, busy, onEdit, onSubmit }: { projectId: string; canManage: boolean; busy: boolean; onEdit: () => void; onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void })
  export function SpoolgenImportPanel({ canManage, busy, onEdit, onSubmit }: { canManage: boolean; busy: boolean; onEdit: () => void; onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void })
  ```

- [ ] **Step 1: Write the failing test** — в `engineering-i18n.test.ts`, рядом с «the table hint names the sheet…» (его удалит Task 7):

```ts
test("the Excel panel tells to download the template when the weld sheet or a column is missing", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    assert.ok(t("excel.noWeldSheet").includes("weld"), locale)
    const missing = t("excel.missingColumns", { sheet: "weld", count: 2, columns: "PDS_AREA, WELD_TYPE" })
    assert.ok(missing.includes("weld") && missing.includes("PDS_AREA, WELD_TYPE"), `${locale}: ${missing}`)
  }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test modules/engineering/ui/engineering-i18n.test.ts`
Expected: FAIL — ключей `excel.*` нет.

- [ ] **Step 3: Messages** (en и ru, дословно; `sources.table.hint` заменить)

```json
"excel": {
  "hint": "Download the template, move your data into it and upload it back. The weld sheet is required; trace, bolt and supp are optional. The file is limited to {limit} MB.",
  "upload": "Upload the filled-in template",
  "noWeldSheet": "The workbook has no weld sheet, or it is empty. Download the template and move your data into it.",
  "missingColumns": "The {sheet} sheet {count, plural, one {has no required column} other {has no required columns}} {columns}. Download the template and move your data into it."
}
"sources.table.hint": "Welds, materials, flange joints and supports in our Excel template: download it, fill it in and upload it back."
```

```json
"excel": {
  "hint": "Скачайте шаблон, перенесите в него свои данные и загрузите обратно. Лист weld обязателен, листы trace, bolt и supp — по желанию. Размер файла — не больше {limit} МБ.",
  "upload": "Загрузить заполненный шаблон",
  "noWeldSheet": "В книге нет листа weld или он пуст. Скачайте шаблон и перенесите данные в него.",
  "missingColumns": "В листе {sheet} {count, plural, one {нет обязательной колонки} few {нет обязательных колонок} many {нет обязательных колонок} other {нет обязательных колонок}} {columns}. Скачайте шаблон и перенесите данные в него."
}
"sources.table.hint": "Стыки, материалы, фланцевые соединения и опоры в нашем шаблоне Excel: скачайте его, заполните и загрузите обратно."
```

Run: `node --import tsx --test modules/engineering/ui/engineering-i18n.test.ts`
Expected: PASS.

- [ ] **Step 4: `ExcelImportPanel`**

- Подсказка `excel.hint` (`limit = SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024)`).
- Один ряд: `<ImportTemplateDownload source="table" references={references} disabled={busy} />`, скрытый `<input type="file" accept=".xlsx">` и кнопка `excel.upload` (`disabled={busy || !canManage}`, `loading` во время чтения). Рядом во время чтения — `table.reading`. Больше кнопок в блоке нет.
- Коды проекта для листа «Коды проекта» загружаются, как в старой панели (`loadImportReferences`, при ошибке тост `templates.codesFailed`). Шаблоны проекта (`loadImportTemplates`) не грузить.
- Выбор файла: сразу `onEdit()` и сбросить прошлое сообщение. `addPickedFiles("weld", [], [file], 0).refused` → тост `describeSpoolgenIssue`, дальше не идти. Выдать билет (`createPickTickets<"weld">()`) и прочитать: `readWorkbookUpload(file.name, readNumberedSheets(await file.arrayBuffer(), SPOOLGEN_FILE_ROLES))`. Если билет устарел, ничего не делать. `ready` → `onSubmit(reading.submission, [{ role: "weld", file }])`. `noWeldSheet` и `missingColumns` → сообщение под рядом кнопок (`role="alert"`, `text-danger-fg`): `excel.noWeldSheet` или по одной строке `excel.missingColumns` на лист (`columns = headers.join(", ")`, `count = headers.length`). В этих двух случаях `onSubmit` не вызывается, задание не создаётся. Ошибка чтения → тост `table.readFailed` с `errorDetail`. `event.target.value = ""` после каждого выбора, чтобы тот же файл можно было выбрать снова.

- [ ] **Step 5: `SpoolgenImportPanel`** (бывший `table-import-panel.tsx`)

Оставить только ветку SpoolGen. Удалить `source`, `mappable`, `ACCEPT` (остаётся `".txt,.csv,.tsv"`), `projectId`, `settings`/`drafts`/`opened`/`templates`/`references`/`chosenId`/`touched`, `useEffect` с загрузкой, `ImportTemplateBar`, `ColumnMappingEditor`, ветку `readSheetMatrix` в `readMatrix` (остаётся `parseDelimited((await readSourceFile(file)).text)`). Тексты как сейчас без `mappable`: подсказка `importScreen.hint`, подписи `tc("spoolgenRole.…")` и `tc("spoolgenUpload.…")`, `reason` — `table.weldRequired` или `table.columnsLeftToServer`, ниже прежний `ImportIssueList` с `MISSING_COLUMN`. Вызов: `buildTableSubmission(sources, { kind: "table", columns: {} }, { strictColumns: false })` — до Task 7.

- [ ] **Step 6: `SpoolingImport`**

- Состояние `checked: { submission: SpoolgenSubmission; stored: StoredImportIssue[] } | null` вместо `issues`. `clearIssues` сбрасывает его в `null`.
- После `submitSpoolingImport`: `setChecked({ submission, stored: result.issues })`. Тост `importScreen.validated` с `rows: submission.rows.length` и числами из `countIssueEntries(buildIssueEntries(submission, result.issues))`, чтобы тост и строка итога не расходились.
- Рендер: `source === "table"` → `<ExcelImportPanel key="table" …>`, `source === "spoolgen"` → `<SpoolgenImportPanel key="spoolgen" …>`, PCF без изменений (`validated={checked !== null}`). Под панелями `{entries ? <IssueEntryList entries={entries} /> : null}`, где `entries = useMemo(() => (checked ? buildIssueEntries(checked.submission, checked.stored) : null), [checked])`. Строку `importScreen.jobCreated` и `ImportIssueList` с экрана убрать.

- [ ] **Step 7: Название плитки**

`import-template.ts:87`: `name: "Excel"`, комментарий на строке 30 — «an Excel workbook». `find-ui-literals.ts:28`: в `NAMES` вместо `"Excel / CSV"` — `"Excel"`.

- [ ] **Step 8: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS. Функции сопоставления в `import-table.ts`, `column-mapping-editor.tsx` и ключи `table.hint`, `mapping.title` и другие пока на месте, но их никто не вызывает. Это убирает Task 7.

- [ ] **Step 9: Commit**

```bash
git add modules/engineering/ui/excel-import-panel.tsx modules/engineering/ui/spoolgen-import-panel.tsx modules/engineering/ui/table-import-panel.tsx modules/engineering/ui/spooling-import.tsx modules/engineering/domain/import-template.ts scripts/i18n/find-ui-literals.ts messages/en/spooling.json messages/ru/spooling.json modules/engineering/ui/engineering-i18n.test.ts
git commit -m "feat(import): the Excel tile downloads the template and uploads it back"
```

---

### Task 7: Удалить путь сопоставления колонок

**Files:**
- Delete: `modules/engineering/ui/column-mapping-editor.tsx`
- Modify: `modules/engineering/application/import-table.ts`, `modules/engineering/application/import-table.test.ts`, `modules/engineering/domain/spoolgen-contract.ts:17-26`, `modules/engineering/domain/spoolgen-contract.test.ts:21-24,31`, `modules/engineering/domain/parsers/spoolgen-parser.ts:16,19,31`, `modules/engineering/infrastructure/import-template-data.ts:27-31` (комментарий), `modules/engineering/ui/spoolgen-import-panel.tsx`, `modules/engineering/ui/engineering-i18n.test.ts`, `messages/{en,ru}/spooling.json`

**Interfaces:**
- Produces (итоговые сигнатуры):
  ```ts
  export function buildTableSubmission(sources: readonly TableSource[]): TableSubmission   // canSubmit = the weld file is there
  export type MissingColumns = Partial<Record<SpoolgenFileRole, string[]>>                  // contract keys
  export function resolveColumns(role: SpoolgenFileRole, headerRow: readonly string[]): ResolvedColumns
  export function parseSpoolgenMatrix(role: SpoolgenFileRole, matrix: readonly (readonly unknown[])[]): SpoolgenParseResult
  export function parseSpoolgenFile(role: SpoolgenFileRole, text: string): SpoolgenParseResult
  ```
  `readWorkbookUpload` сам решает, что колонки не хватает (это уже так, Task 3). SpoolGen отправляет файлы и при нехватке колонок, как раньше.

- [ ] **Step 1: Удалить**

| Что | Где | Кто вызывал |
|---|---|---|
| `ColumnMappingEditor`, файл целиком | `ui/column-mapping-editor.tsx` | только старая панель |
| `TableColumnChoice`, `columnMapOf`, `ColumnDrafts`, `UNMAPPED`, `mergeColumnMaps`, `withColumnChoice`, `applyColumnDrafts`, `hasMappedColumn`, `describeTableColumns`, `offeredHeaders` | `application/import-table.ts` | редактор и старая панель |
| параметры `settings` и `options.strictColumns` у `buildTableSubmission`, `headers` в `MissingColumns` | `application/import-table.ts` | старая панель, `readWorkbookUpload`, тесты |
| параметр `columnMap` | `resolveColumns`, `parseSpoolgenMatrix`, `parseSpoolgenFile` | только `buildTableSubmission` с сопоставлением |
| ключи `table.hint`, `table.choose`, `table.mapColumns`, `table.unmatched`, `mapping.title`, `mapping.hint`, `mapping.chooseColumn`, `mapping.notInFile`, `mapping.recheck`, `importScreen.jobCreated` | `messages/{en,ru}/spooling.json` | старая панель, редактор, экран |
| тесты сопоставления | `import-table.test.ts` (строки 17, 62, 73, 78, 83, 92, 98, 111 — по названиям из текущего файла), `spoolgen-contract.test.ts:21-24,31`, `engineering-i18n.test.ts`: «a column list of the mapping editor…» и «the table hint names the sheet…» | — |

**Оставить:** `mapping.fields` (подписи листа «Справка»); `table.role.*` (там же); `table.reading`, `table.remove`, `table.readFailed`, `table.replaced`, `table.weldRequired`, `table.columnsLeftToServer` (SpoolGen и PCF); `templates.label/name/saveAs/saved/loadFailed` и `ImportTemplateBar` (PCF); `pickTableFile` (SpoolGen); `pickInitialTemplate`, `TableTemplateSettings`, разбор `kind: "table"` в `parseTemplateSettings` (база хранит такие шаблоны); `BUILT_IN_TEMPLATES` для `table` и `spoolgen` (названия плиток); `readSheetMatrix` целиком (см. раздел 0).

Остальные тесты `import-table.test.ts` перевести на `buildTableSubmission(sources)`. «without a mapping the unmatched required columns…» превращается в «a missing required column is listed by its key and the weld file alone decides canSubmit», «a source with a fixed contract can be sent…» — в «a file set with a column missing can still be sent: the server reports it». Тест «every contract field has a label for the mapping editor» оставить и переименовать в «…for the help sheet».

- [ ] **Step 2: Доказать, что никто не вызывает**

Run:
```zsh
grep -rnE "ColumnMappingEditor|column-mapping-editor|withColumnChoice|columnMapOf|ColumnDrafts|mergeColumnMaps|applyColumnDrafts|hasMappedColumn|describeTableColumns|TableColumnChoice|offeredHeaders|strictColumns|columnMap" modules app scripts components lib
grep -rnE "\"table\.(hint|choose|mapColumns|unmatched)\"|table\.(hint|choose|mapColumns|unmatched)\b|importScreen\.jobCreated|spooling\.mapping\"|chooseColumn|notInFile|recheck" modules app scripts
```
Expected: обе команды пусты. Единственное исключение — `pcf.mapping.*` в `pcf-mapping-editor.tsx`, это другой ключ. Если всплыло другое место, сначала разобраться, кто его вызывает, и только потом удалять.

- [ ] **Step 3: Run the gates**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A modules/engineering/ui/column-mapping-editor.tsx
git add modules/engineering/application/import-table.ts modules/engineering/application/import-table.test.ts modules/engineering/domain/spoolgen-contract.ts modules/engineering/domain/spoolgen-contract.test.ts modules/engineering/domain/parsers/spoolgen-parser.ts modules/engineering/infrastructure/import-template-data.ts modules/engineering/ui/spoolgen-import-panel.tsx modules/engineering/ui/engineering-i18n.test.ts messages/en/spooling.json messages/ru/spooling.json
git commit -m "refactor(import): remove the column mapping path"
```

---

### Task 8: Проверка в браузере на UPG-1 и журнал

**Files:**
- Modify: этот план (раздел «Журнал»)
- Scratchpad (не коммитить): скрипт и книги для проверки

- [ ] **Step 1: Стенд**

Стенд не сбрасывать. На 2026-10-22 он не отвечал: `127.0.0.1:54321` и `:3000` — отказ соединения. Если так и осталось — запустить Docker, `npx supabase start` (без `reset`, данные сохраняются) и `npm run dev`. Войти так же, как в прошлых проверках (журнал плана от 2026-10-21). Пароль не печатать, в файлы и снимки не записывать. Проект **UPG-1**, экран `/spooling/import`.

- [ ] **Step 2: Книги для проверки** (скрипт в scratchpad, через `tsx`, по `buildWorkbook` и `templateRowsFor`)

- `upg-bad-pds.xlsx`. Лист `weld`: строка 1 — заголовок шаблона, строка 2 — строка-пример с `ISO_NUMBER=ISO-4901`, `SPOOL_NUMBER=ISO-4901-S1`, `WELD_NUMBER=4901-S1-W01`, `PDS_AREA=Z-999`, строка 3 пустая, строка 4 — та же изометрия и катушка, стык `4901-S1-W02`, `PDS_AREA=Z-999`. Остальные листы — как в шаблоне, но с `ISO-4901` / `ISO-4901-S1`.
- `no-weld.xlsx`: только лист `trace` из шаблона.

- [ ] **Step 3: Пройти по порядку** (записывать, что видно)

1. Плитка называется «Excel». В блоке ровно две кнопки, «Скачать шаблон Excel» и «Загрузить заполненный шаблон». Нет строки «Шаблон», «Сохранить как шаблон», «Сопоставить колонки», «Проверить файлы», кнопки CSV.
2. «Скачать шаблон Excel» → книга с листами `weld`, `trace`, `bolt`, `supp`, «Справка», «Коды проекта». Её же, не меняя, выбрать в «Загрузить заполненный шаблон» → проверка начинается сама, итог «Ошибок нет — проверьте изменения ниже и примените импорт», ниже, в решениях по ревизиям, видна изометрия `ISO-4001`. Если сервер выдал ошибку по строке-примеру (в UPG-1 не хватает справочника) — записать её текст и место: это расхождение примера со справочниками UPG-1, в этом плане его не чинить.
3. `upg-bad-pds.xlsx` → запись «Зоны PDS «Z-999» нет в проекте» и под ней «Лист weld, колонка PDS_AREA, строки 2, 4». Номера совпадают с Excel (открыть книгу или прочитать её в Node). Итог «1 ошибка — исправьте файл и загрузите его снова». Ошибок «Строка 1» и английских текстов нет.
4. `no-weld.xlsx` → сообщение «В книге нет листа weld или он пуст…». В истории импорта не появилось нового задания (сравнить число заданий до и после).
5. Тот же файл выбрать дважды подряд → проверка запускается оба раза.
6. Плитка SpoolGen: четыре поля и «Проверить файлы» на месте. Плитка PCF: строка «Шаблон» на месте. Файлы туда не выбирать.
7. Ничего не применять. Все задания, созданные шагами 2–5, отменить в истории импорта.

- [ ] **Step 4: Журнал и коммит**

Дописать в «Журнал» ниже: что проверено, какие задания созданы и отменены, расхождения. Скриншоты, если делались, сохранять в `docs/superpowers/specs/screenshots/` (каталог в `.gitignore`).

```bash
git add docs/superpowers/plans/2026-10-22-excel-import-simplify.md
git commit -m "docs(import): journal of the Excel tile check on UPG-1"
```

- [ ] **Step 5: Показать результат владельцу**

Открыть экран импорта UPG-1 на локальном стенде в видимом окне браузера, плитка Excel выбрана. Новых файлов не выбирать.

---

## Готово, когда (сверка с заданием)

| Пункт задания | Где |
|---|---|
| Ровно две кнопки, одна книга, все четыре листа, roundtrip под одну книгу | Task 3 (тест), Task 5 (без CSV), Task 6 (панель), Task 8 п. 1–2 |
| Пустая строка + ошибка после неё → строка Excel | Task 1, Task 2, Task 4 (сквозной тест), Task 8 п. 3 |
| Серверная ошибка на изометрии → все строки `weld` диапазонами | Task 4 |
| Книга без листа `weld` → сообщение, задание не создаётся | Task 3 (тест), Task 6 (панель), Task 8 п. 4 |
| Текст у каждого кода на ru и en | Task 4 |
| Одна проблема от браузера и сервера — один раз | Task 4 |
| `test:unit`, `typecheck`, `lint` зелёные | ворота каждой задачи |
| Браузер только в UPG-1, задания отменены, в конце открыт экран | Task 8 |
| Коммиты на текущей ветке, только свои файлы | каждый Step «Commit» |

## Журнал

- 2026-10-22: план составлен. Проверено до начала работ: `npm run test:unit` — 911 тестов, все зелёные; SheetJS 0.20.3 отдаёт `__rowNum__` при `header: "A"`: лист с началом в `C4` и пустой строкой 6 даёт номера `[4, 5, 7]`, книга `buildWorkbook` с пустым массивом во второй строке данных даёт `[1, 2, 4]`; локальный стенд не отвечает (порты 54321 и 3000).
- 2026-10-22: задачи 1–7 выполнены (коммиты `88ec316`..`3375a74`), после каждой `npm run test:unit`, `typecheck`, `lint` зелёные (в конце 919 тестов, lint — 0 ошибок, 139 прежних предупреждений).
- 2026-10-22, браузер, **UPG-1**, `localhost:3107` (Supabase уже был запущен, приложение поднято `npm run dev -- -p 3107`; вход — уже открытая сессия браузера, пароль не вводился). Книги собраны в scratchpad тем же кодом, что вызывают кнопки (`buildWorkbook(tableTemplateSheets(...))`), сама кнопка скачивания не нажималась: сохранение в папку пользователя требует его разрешения.
  1. Плитка называется «Excel». В блоке ровно две кнопки — «Скачать шаблон Excel» и «Загрузить заполненный шаблон», одно поле `accept=".xlsx"`; строки «Шаблон», сопоставления, «Проверить файлы» и CSV нет.
  2. Шаблон без изменений (листы `weld | trace | bolt | supp | Справка | Коды проекта`) → проверка запустилась сама, итог «Ошибок нет — проверьте изменения ниже и примените импорт», в решениях по ревизиям `ISO-4001` (4 новых объекта).
  3. `upg-bad-pds.xlsx` (данные `weld` в строках 2 и 4, строка 3 пустая; прочитано в Node: номера 1, 2, 4) → «1 ошибка — исправьте файл и загрузите его снова», запись «Зоны PDS «Z-999» нет в проекте.», под ней «Лист weld, колонка PDS_AREA, строки 2, 4». Английских текстов и «Строка 1» нет. «Применить импорт» заблокирован.
  4. `no-weld.xlsx` → «В книге нет листа weld или он пуст. Скачайте шаблон и перенесите данные в него.» Заданий до и после: проверенных 2 и 2 — новое не создано.
  5. `upg-bad-pds.xlsx` выбран дважды подряд → проверка прошла оба раза (проверенных заданий 2 → 4).
  6. SpoolGen: «Скачать файлы SpoolGen», четыре поля `.txt,.csv,.tsv`, «Проверить файлы». PCF (AVEVA): строка «Шаблон / Название шаблона / Сохранить как шаблон» на месте. Файлы туда не выбирались.
  7. Ничего не применялось. Четыре задания этой проверки (`spooling-template.xlsx`, трижды `upg-bad-pds.xlsx`) отменены в «Настройка проекта → Импорт → История импорта»; итог по UPG-1: применённых 7 (как было), отменённых 13 (было 9), проверенных 0.
  Снимки: `docs/superpowers/specs/screenshots/2026-10-22-excel-bad-pds.jpg`, `…-excel-no-weld.jpg` (локально, каталог в `.gitignore`). Расхождений с планом нет.
- 2026-10-22, итоговое ревью всей ветки свежим ревьюером: три важных замечания и одно мелкое, переоценённое в важное, исправлены в `642beae`, каждое через падающий тест. Слияние записей было квадратичным: на 7500 стыках — 1,3 с, теперь укладывается в 400 мс теста. Замечания PCF не несли роль `weld`, и список терял поле. Замечания задания читались без постраничной загрузки при лимите в 1000 строк. Лист `weld` с одним заголовком создавал задание. Повторная проверка в браузере на UPG-1: книга, где на листах только заголовки, даёт «В книге нет листа weld или он пуст…» без нового задания. `upg-bad-pds.xlsx` показывает ту же запись «Лист weld, колонка PDS_AREA, строки 2, 4». Созданное задание отменено. Итог по UPG-1: применённых 7, отменённых 14, проверенных 0.
