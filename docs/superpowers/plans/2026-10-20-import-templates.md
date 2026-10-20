# Импорт катушек и стыков по шаблонам источников — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кнопка импорта спулинга открывает плитки источников (AVEVA E3D/PDMS, Smart 3D и CADWorx, Plant 3D, Excel/CSV, 4 файла); файлы PCF, Excel и CSV в любой кодировке превращаются в те же строки контракта, что и сегодня, а несовпавшие колонки человек сопоставляет сам и сохраняет как шаблон проекта.

**Architecture:** Два читателя в браузере — PCF и таблица (XLSX/CSV/TXT) — выдают записи `SpoolgenRecord` той же формы, что сегодняшний разбор четырёх файлов; дальше `buildStagingRows`, `record_spooling_validation`, предпросмотр и применение не меняются. Шаблон — данные (`jsonb`), встроенные пресеты лежат в коде, шаблоны проекта — в новой таблице под RLS. Сервер получает две правки: толщина стенки выводится из правила проекта, если её нет в строке; одна загрузка принимает много файлов, у ошибки есть имя файла.

**Tech Stack:** Next.js (App Router, клиентские компоненты), TypeScript, next-intl, `xlsx` (уже в зависимостях), Supabase Postgres (миграции SQL, pgTAP), `node --test` через `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-20-import-templates-design.md`

## Global Constraints

- Правила бэкенда из `CLAUDE.md`: чтение — обычные `select` по таблицам под RLS; доступ только в политиках RLS; не добавлять `SECURITY DEFINER`, который возвращает данные; одна полезная нагрузка на команду, без отката на старый формат; сервер владеет правилом и причиной, клиент только переводит коды; без пагинации без измеренной нужды.
- Все строки, которые читает человек, — только в `messages/en/spooling.json` и `messages/ru/spooling.json`; русские термины по `docs/i18n/glossary-ru.md`. `npm run test:unit` падает на литерале в `.tsx` и на расхождении ключей ru/en.
- Живой локальный стенд не сбрасывать: никогда не запускать `demo:prepare`, `demo:showcase`, `supabase db reset`, `npm run verify`, `npm run test:db` против портов 543xx. Новые миграции на живой стенд — `npx supabase migration up --local`. pgTAP — только на изолированном стеке: `bash tasks/material-check/pgtap.sh test`.
- Уже применённые миграции не переписывать; каждое изменение функции — новая миграция поверх, тело копировать из последнего определения.
- Не создавать данные в проектах `TRACK01-A`, `TRACK01-B`, `SHOWCASE-1`. Хостинговый стенд KZ не трогать. Секреты не печатать.
- Новых зависимостей не добавлять.
- Лимиты: 4 МБ на файл (как сейчас), не больше 300 файлов в одной загрузке, лимит 7500 стыков на загрузку остаётся (`20261018130000_spooling_job_joint_limit.sql`).
- Работать в текущем каталоге и ветке `feat/unified-workspace`, без новых веток. В рабочем дереве уже есть чужие правки (`Dockerfile`, `docker-compose.yml`, `components/auth/login-screen.tsx`, `components/pipeqc/app-shell.tsx`, `tsconfig.tsbuildinfo`) — не добавлять их в коммиты, `git add` только своих файлов.
- Плитки PCF в интерфейсе помечены «настроено по документации, не проверено на файле заказчика».

## Review Focus

1. CSV, сохранённый русским Excel: Windows-1251, разделитель `;`, десятичная запятая, ячейка в кавычках с `;` внутри — должна прочитаться как одна ячейка, число `8,2` как `8.2` (Task 1).
2. Кириллические заголовки: сегодня `normalizeHeader` вырезает всё, кроме `A-Z0-9`, и «Номер стыка» превращается в пустую строку — сопоставление и русские синонимы должны работать (Task 1).
3. Диаметр в PCF в миллиметрах: DN 100 должен стать ровно `4` дюйма, а не `3.937`, иначе правило толщины и проверка WPS по точному диаметру не найдутся (Task 5).
4. PCF без `SPOOL-IDENTIFIER` или без `REPEAT-WELD-IDENTIFIER`: предупреждение или ошибка с файлом и строкой; номера никогда не придумываются (Task 5).
5. Повторная загрузка тех же файлов, в любом порядке выбора, даёт те же строки — иначе сравнение ревизий покажет ложные изменения (Task 5, Task 8).

---

### Task 1: Чтение текста и таблиц без потерь

**Files:**
- Modify: `modules/engineering/infrastructure/spoolgen-file-reader.ts`
- Modify: `modules/engineering/domain/parsers/delimited.ts`, `modules/engineering/domain/parsers/delimited.test.ts`
- Modify: `modules/engineering/domain/spoolgen-contract.ts`
- Modify: `modules/engineering/domain/parsers/spoolgen-parser.ts`, `modules/engineering/domain/parsers/spoolgen-parser.test.ts`
- Create: `modules/engineering/infrastructure/spoolgen-file-reader.test.ts`, `modules/engineering/domain/spoolgen-contract.test.ts`

**Interfaces:**
- Produces:
  - `decodeText(bytes: Uint8Array): { text: string; encoding: "utf-8" | "utf-16le" | "windows-1251" }`
  - `readSourceFile(file: File): Promise<{ text: string; encoding: "utf-8" | "utf-16le" | "windows-1251" }>` (заменяет `readTextFile`; `computeFileChecksum` остаётся)
  - `detectDelimiter(firstLine: string): "\t" | ";" | ","`; `parseDelimited(text: string): string[][]`
  - `normalizeHeader(header: string): string`; `resolveColumns(role, headerRow, columnMap?: Readonly<Record<string, string>>): ResolvedColumns`
  - `parseSpoolgenMatrix(role: SpoolgenFileRole, matrix: readonly (readonly unknown[])[], columnMap?: Readonly<Record<string, string>>): SpoolgenParseResult`
  - `parseSpoolgenFile(role, text, columnMap?)` — то же через `parseDelimited`
  - `SpoolgenRecord` получает поле `fileName: string | null`; `ResolvedColumns` — поле `headers: string[]` (исходные заголовки, для экрана сопоставления)

- [ ] **Step 1: Write the failing tests**

`spoolgen-file-reader.test.ts`:
```ts
assert.deepEqual(decodeText(new Uint8Array([0xef,0xbb,0xbf,0x41])), { text: "A", encoding: "utf-8" })
assert.deepEqual(decodeText(new Uint8Array([0xff,0xfe,0x41,0x00])), { text: "A", encoding: "utf-16le" })
assert.deepEqual(decodeText(new Uint8Array([0xcd,0xee,0xec,0xe5,0xf0])), { text: "Номер", encoding: "windows-1251" })
assert.equal(decodeText(new TextEncoder().encode("Стык")).encoding, "utf-8")
```
`delimited.test.ts`:
```ts
assert.equal(detectDelimiter("ISO;SPOOL;WELD"), ";")
assert.deepEqual(parseDelimited('A;B\n"x;y";"say ""hi"""\n'), [["A","B"],["x;y",'say "hi"']])
assert.deepEqual(parseDelimited('A,B\r\n"line\nbreak",2'), [["A","B"],["line\nbreak","2"]])
```
`spoolgen-contract.test.ts`:
```ts
assert.equal(normalizeHeader("Номер стыка"), "НОМЕРСТЫКА")
assert.equal(normalizeHeader("Weld No."), "WELDNO")
assert.equal(resolveColumns("weld", ["Номер изометрии","Номер катушки","Номер стыка"]).indexes.get("weld_number"), 2)
assert.equal(resolveColumns("weld", ["Шов"], { weld_number: "Шов" }).indexes.get("weld_number"), 0)
```
`spoolgen-parser.test.ts` (добавить):
```ts
const csv = "ISO_NUMBER;ISO_REVISION;PDS_AREA;SERVICE_CLASS;SPOOL_NUMBER;WELD_NUMBER;WELD_TYPE;DIAMETER_INCH;THICKNESS_MM;WELD_LOCATION\nISO-A;R0;PDS-A;SC-A;SP-1;W-1;BW;6;8,2;монтаж"
const parsed = parseSpoolgenFile("weld", csv)
assert.equal(parsed.issues.length, 0)
assert.equal(parsed.records[0].values.thickness_mm, "8.2")
assert.equal(parsed.records[0].values.weld_location, "field")
assert.equal(parseSpoolgenMatrix("weld", [["ISO_NUMBER","DIAMETER_INCH"],["ISO-A", 6]]).records[0].values.diameter_inch, "6")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test modules/engineering/infrastructure/spoolgen-file-reader.test.ts modules/engineering/domain/parsers/delimited.test.ts modules/engineering/domain/spoolgen-contract.test.ts modules/engineering/domain/parsers/spoolgen-parser.test.ts`
Expected: FAIL (`decodeText` not exported, `;` not detected, Cyrillic header normalised to "").

- [ ] **Step 3: Implement**
  - `decodeText`: BOM `EF BB BF` → utf-8, `FF FE` → utf-16le; иначе `new TextDecoder("utf-8", { fatal: true })`, при исключении — `new TextDecoder("windows-1251")`. BOM из текста убирается.
  - `detectDelimiter`: больше всего из `\t`, `;`, `,` в первой строке; при равенстве порядок `\t`, `;`, `,`.
  - `parseDelimited`: посимвольный разбор с кавычками (`"` открывает поле, `""` внутри — кавычка, разделитель и перевод строки внутри кавычек — часть поля); пустые строки отбрасываются, ячейки `trim`.
  - `normalizeHeader`: `toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")`.
  - Русские синонимы в `SPOOLGEN_CONTRACT` (дописать к существующим): ISO — `НОМЕРИЗОМЕТРИИ`, `ИЗОМЕТРИЯ`; spool — `НОМЕРКАТУШКИ`, `КАТУШКА`; weld — `НОМЕРСТЫКА`, `СТЫК`, `НОМЕРСВАРНОГОСОЕДИНЕНИЯ`; revision — `РЕВИЗИЯ`; line — `ЛИНИЯ`, `НОМЕРЛИНИИ`; diameter — `ДИАМЕТР`, `ДУ`; thickness — `ТОЛЩИНА`, `ТОЛЩИНАСТЕНКИ`; weld_type — `ТИПСТЫКА`, `ТИПСОЕДИНЕНИЯ`; weld_location — `ЦЕХМОНТАЖ`, `МЕСТОСВАРКИ`.
  - `resolveColumns(role, headerRow, columnMap)`: сначала `columnMap[key]` (сравнение через `normalizeHeader`), затем канонический заголовок и синонимы.
  - `parseSpoolgenMatrix`: ячейки приводятся к строке (`String(cell)`, `null`/`undefined` → `""`); числовое поле вида `/^-?\d+,\d+$/` → запятая на точку; `weld_location` в нижнем регистре: `цех`, `заводской`, `shop`, `s` → `shop`; `монтаж`, `монтажный`, `field`, `f`, `site` → `field`; `assembly` остаётся; прочее — как есть (сервер отвергнет). `fileName` записей — `null` (заполняет вызывающий).
  - Все вызывающие `readTextFile` переводятся на `readSourceFile` (экран спулинга; скрипты читают файлы сами и не меняются).

- [ ] **Step 4: Run tests to verify they pass**

Run: та же команда, затем `npm run test:unit`
Expected: PASS; существующие тесты `scripts/upg/files.test.ts`, `scripts/demo/spoolgen-package.test.ts` зелёные.

- [ ] **Step 5: Commit**

```bash
git add modules/engineering/infrastructure/spoolgen-file-reader.ts modules/engineering/infrastructure/spoolgen-file-reader.test.ts modules/engineering/domain/parsers modules/engineering/domain/spoolgen-contract.ts modules/engineering/domain/spoolgen-contract.test.ts modules/engineering/ui/spooling-import-screen.tsx
git commit -m "feat(import): read CP1251, semicolon CSV, quoted cells and Cyrillic headers"
```

---

### Task 2: Сервер выводит толщину стенки из правила проекта

**Files:**
- Create: `supabase/migrations/20261020100000_spooling_thickness_from_rule.sql`
- Create: `supabase/tests/database/135_spooling_thickness_from_rule.test.sql`
- Modify: `modules/engineering/domain/spoolgen-contract.ts` (`thickness_mm` → `required: false`), `modules/engineering/domain/parsers/spoolgen-parser.test.ts`

**Interfaces:**
- Produces: `public.spooling_staging(target_job_id uuid)` с той же сигнатурой; для строки `weld_joint` с пустым `thickness_mm` в `entity_values` подставляется `project_thickness_flange_rules.thickness_mm` активного правила того же проекта, класса сервиса (`project_service_classes.code = entity_values->>'service_class'`) и диаметра (`diameter_inch = engineering_numeric(entity_values->>'diameter_inch')`); толщина из файла, если есть, не меняется. Все проверки, предпросмотр и применение читают строки через эту функцию.

- [ ] **Step 1: Write the failing pgTAP test** `135_spooling_thickness_from_rule.test.sql` (по образцу `134_import_wps_coverage.test.sql`: пользователь-админ, проект, класс `SC-135`, тип `BW`, правило толщины `SC-135` / 6" / 7.11 мм, зона PDS, задание импорта с двумя строками `weld_joint`: без толщины и с `thickness_mm = '9'`). Утверждения:
  - `spooling_staging` отдаёт `7.110` (через `engineering_numeric`) для первой строки и `9` для второй;
  - `revalidate_spooling_import_job` не даёт `SRV_THICKNESS_MISSING` для первой строки;
  - после `apply_spooling_import_job` у стыка без толщины в файле `weld_joint_revisions.thickness_mm = 7.11`;
  - строка без толщины и без правила получает `SRV_THICKNESS_MISSING`, как раньше.

- [ ] **Step 2: Run to verify it fails**

Run: `bash tasks/material-check/pgtap.sh test`
Expected: FAIL в `135_spooling_thickness_from_rule` (толщина пустая).

- [ ] **Step 3: Implement** миграцию: `create or replace function public.spooling_staging` — `language sql stable`, `join public.import_jobs j on j.id = r.job_id`, для подстановки `normalized_values || jsonb_build_object('thickness_mm', rule.thickness_mm::text)` через `left join lateral` к правилу; гранты как у исходной функции. В контракте `thickness_mm` — необязательный; тест парсера: строка без колонки толщины проходит без `MISSING_COLUMN`.

- [ ] **Step 4: Run to verify it passes**

Run: `bash tasks/material-check/pgtap.sh test`, затем `npm run test:unit`
Expected: PASS всех pgTAP, включая `127_spooling_job_joint_limit` и `134_import_wps_coverage`.

- [ ] **Step 5: Apply to the live stand and commit**

```bash
npx supabase migration up --local
git add supabase/migrations/20261020100000_spooling_thickness_from_rule.sql supabase/tests/database/135_spooling_thickness_from_rule.test.sql modules/engineering/domain/spoolgen-contract.ts modules/engineering/domain/parsers/spoolgen-parser.test.ts
git commit -m "feat(import): a weld without a thickness takes the project's rule for its class and diameter"
```

---

### Task 3: Много файлов на загрузку, роль PCF, файл у ошибки

**Files:**
- Create: `supabase/migrations/20261020101000_spoolgen_file_role_pcf.sql` (только `alter type public.spoolgen_file_role add value if not exists 'pcf';` — отдельный файл, чтобы новое значение было зафиксировано до использования)
- Create: `supabase/migrations/20261020102000_spooling_import_many_files.sql`
- Create: `supabase/tests/database/136_spooling_import_many_files.test.sql`
- Modify: `lib/supabase/database.types.ts` (перегенерировать)
- Modify: `modules/engineering/domain/spoolgen-file.ts`, `modules/engineering/domain/spoolgen-issue.ts`, `modules/imports/domain/stored-import-issue.ts`, `modules/imports/ui/import-issue-list.tsx`, `modules/engineering/ui/spoolgen-issue-text.ts`
- Modify: `modules/engineering/infrastructure/supabase-engineering-repository.ts`, `modules/engineering/infrastructure/supabase-engineering-repository.test.ts`
- Modify: единственный вызывающий `spoolingObjectPath` — `modules/engineering/ui/spooling-import-screen.tsx` (скрипты `scripts/upg/*` строят путь сами и не меняются; `registerSpoolgenFile` у них работает как раньше)

**Interfaces:**
- Produces (SQL):
  - `import_files`: ограничение `unique (job_id, file_role)` заменено на `unique (job_id, file_role, file_name)`;
  - `register_spooling_import_file(...)` — сигнатура прежняя, `on conflict (job_id, file_role, file_name)`; новая проверка: не больше 300 файлов на задание (`raise ... errcode '23514'`);
  - `record_spooling_validation(uuid, jsonb, jsonb)` — сигнатура прежняя; требует файл роли `weld` **или** `pcf` (код `PQC25`, сообщение `A weld file or a PCF file is required before validation`); пишет `nullif(entry ->> 'file_name', '')` в новую колонку;
  - `import_job_issues.file_name text` (nullable);
  - бакет `project-spooling`: `allowed_mime_types` дополнен `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`.
- Produces (TS):
  - `type SpoolingFileRole = SpoolgenFileRole | "pcf"` в `spoolgen-file.ts`; `SPOOLING_MAX_FILES = 300`;
  - `spoolgenIssue(code, rowNumber, columnName, options?: { fileName?: string | null; severity?: ImportIssueSeverity })`; `SpoolgenIssue` и `StoredImportIssue` получают `fileName: string | null`;
  - `spoolingObjectPath(projectId: string, jobId: string, role: SpoolingFileRole, index: number, fileName: string): string` → `${projectId}/${jobId}/${role}/${index.toString().padStart(3, "0")}-${fileName.replace(/[^\w.-]/g, "_")}`;
  - `uploadSpoolgenFile` ставит `contentType: file.type || "application/octet-stream"`; `registerSpoolgenFile(client, jobId, role: SpoolingFileRole, file, checksum, objectPath)`; `recordSpoolingValidation` передаёт `file_name`; `loadJobIssues` читает `file_name` в `fileName`.
  - `ImportIssueList` показывает `fileName · Row N · column`, если `fileName` есть.

- [ ] **Step 1: Write the failing pgTAP test** `136_spooling_import_many_files.test.sql`:
  - два файла роли `pcf` с разными именами регистрируются в одном задании; повтор с тем же именем обновляет запись, а не добавляет;
  - `record_spooling_validation` проходит при одном файле `pcf` без `weld`; без файлов — исключение `PQC25`;
  - `file_name` из `parsed_issues` сохраняется в `import_job_issues.file_name`;
  - 301-й файл — исключение `23514`.
- [ ] **Step 2: Write the failing unit test** в `supabase-engineering-repository.test.ts`: `spoolingObjectPath("p", "j", "pcf", 7, "ISO 1001.pcf") === "p/j/pcf/007-ISO_1001.pcf"`; путь `weld` с индексом 0: `"p/j/weld/000-weld.txt"`.
- [ ] **Step 3: Run to verify they fail**

Run: `bash tasks/material-check/pgtap.sh test`; `node --import tsx --test modules/engineering/infrastructure/supabase-engineering-repository.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement** обе миграции (тела `register_spooling_import_file` и `record_spooling_validation` копировать из `20260803092000_spooling_import_apply.sql` — более поздних определений нет; проверить `grep` перед копированием), TS-изменения и все вызывающие. Перегенерировать типы после `npx supabase migration up --local`: `npx supabase gen types typescript --local > lib/supabase/database.types.ts`; в диффе типов — только новые объекты.
- [ ] **Step 5: Run to verify they pass**

Run: `bash tasks/material-check/pgtap.sh test`; `npm run typecheck`; `npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261020101000_spoolgen_file_role_pcf.sql supabase/migrations/20261020102000_spooling_import_many_files.sql supabase/tests/database/136_spooling_import_many_files.test.sql lib/supabase/database.types.ts modules/engineering modules/imports
git commit -m "feat(import): one spooling import takes many files, PCF among them, and every issue names its file"
```

---

### Task 4: Читатель PCF

**Files:**
- Create: `modules/engineering/domain/parsers/pcf.ts`, `modules/engineering/domain/parsers/pcf.test.ts`

**Interfaces:**
- Consumes: ничего (текст уже декодирован `decodeText` из Task 1).
- Produces:
```ts
export type PcfBoreUnit = "INCH" | "MM" | "INCH-SIXTEENTH"
export interface PcfRecord { keyword: string; value: string; line: number }
export interface PcfBlock { keyword: string; value: string; line: number; attributes: PcfRecord[] }
export interface PcfPoint { x: number; y: number; z: number; bore: number | null; endType: string | null }
export interface PcfFile { header: PcfRecord[]; pipelines: PcfBlock[]; components: PcfBlock[]; materials: PcfBlock[]; boreUnit: PcfBoreUnit | null }
export function parsePcf(text: string): PcfFile
export function attribute(block: PcfBlock, keyword: string): string | null   // первое значение, без учёта регистра ключа
export function endPoints(block: PcfBlock): PcfPoint[]                         // все END-POINT блока
```

- [ ] **Step 1: Write the failing test** `pcf.test.ts`. Образец — строки ниже (выдержка из примера Hexagon PCF Reference Guide; колонка 1 — элемент, колонка 5 — атрибут):
```ts
const sample = [
  "ISOGEN-FILES ISOGEN.FLS", "UNITS-BORE MM", "UNITS-CO-ORDS MM",
  "PIPELINE-REFERENCE 100-P-1001", "    REVISION 2", "    PIPING-SPEC CS150",
  "PIPE", "    COMPONENT-IDENTIFIER 1", "    END-POINT 0.0000 0.0000 0.0000 100 BW", "    END-POINT 2500.0000 0.0000 0.0000 100 BW", "    SPOOL-IDENTIFIER 100-P-1001-S01",
  "WELD", "    COMPONENT-IDENTIFIER 2", "    MASTER-COMPONENT-IDENTIFIER 1", "    END-POINT 2500.0000 0.0000 0.0000 100", "    END-POINT 2500.0000 0.0000 0.0000 100", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 5",
  "MATERIALS", "MATERIAL-IDENTIFIER 1", "    ITEM-CODE PA5BSTD", "    DESCRIPTION PIPE, CS API 5L SML, GRD B, STD WT",
].join("\n")
const file = parsePcf(sample)
assert.equal(file.boreUnit, "MM")
assert.equal(file.pipelines[0].value, "100-P-1001")
assert.equal(attribute(file.pipelines[0], "REVISION"), "2")
assert.deepEqual(file.components.map((c) => c.keyword), ["PIPE", "WELD"])
assert.equal(file.components[1].line, 12)
assert.deepEqual(endPoints(file.components[0])[0], { x: 0, y: 0, z: 0, bore: 100, endType: "BW" })
assert.equal(attribute(file.materials[0], "DESCRIPTION"), "PIPE, CS API 5L SML, GRD B, STD WT")
// Plant 3D style: pipeline attributes at column 1, tabs instead of spaces
const p3d = parsePcf("UNITS-BORE INCH\nPIPELINE-REFERENCE L-1\nPIPING-SPEC CS150\nREVISION 0\nPIPE\n\tEND-POINT 0 0 0 4\n\tEND-POINT 10 0 0 4")
assert.equal(attribute(p3d.pipelines[0], "PIPING-SPEC"), "CS150")
assert.equal(p3d.components.length, 1)
assert.equal(parsePcf("UNITS-BORE FEET\nPIPE\n    END-POINT 0 0 0 4").boreUnit, null)
assert.equal(endPoints(parsePcf("PIPE\n    END-POINT 0 0 0 4,0000").components[0])[0].bore, null)
```
- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test modules/engineering/domain/parsers/pcf.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `parsePcf`. Правила:
  - табуляция в начале строки равна отступу; пустые строки пропускаются; ключ — первый токен, значение — остаток строки после `trim`;
  - строка без отступа начинает элемент, строки с отступом — его атрибуты;
  - элемент без атрибутов (одна строка) до первого `PIPELINE-REFERENCE` — заголовок; после `PIPELINE-REFERENCE` и до следующего элемента с атрибутами — атрибут этого трубопровода (добавляется в его `attributes`);
  - `PIPELINE-REFERENCE` всегда открывает трубопровод (в файле их может быть несколько); строка `MATERIALS` сама не сохраняется и переключает все следующие элементы в `materials`;
  - остальные элементы — `components`, в порядке файла; незнакомые ключи сохраняются как есть;
  - `boreUnit` — значение `UNITS-BORE`, если оно одно из `INCH | MM | INCH-SIXTEENTH`, иначе `null`;
  - число в `END-POINT` разбирается только с точкой (`Number`, `NaN` → `null`); пятый токен — `endType`.
- [ ] **Step 4: Run to verify it passes** — та же команда. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering/domain/parsers/pcf.ts modules/engineering/domain/parsers/pcf.test.ts
git commit -m "feat(import): read Isogen PCF files into header, pipelines, components and materials"
```

---

### Task 5: PCF в строки стыков

**Files:**
- Create: `modules/engineering/domain/import-template.ts` (только типы и пресеты PCF; таблица — в Task 6)
- Create: `modules/engineering/domain/pcf-welds.ts`, `modules/engineering/domain/pcf-welds.test.ts`
- Create: `modules/engineering/application/import-pcf.ts`, `modules/engineering/application/import-pcf.test.ts`
- Modify: `modules/engineering/application/import-spooling.ts` (общая часть), `modules/engineering/domain/spoolgen-issue.ts` (новые коды)

**Interfaces:**
- Consumes: `parsePcf`, `attribute`, `endPoints` (Task 4); `spoolgenIssue(..., { fileName, severity })`, `SpoolgenRecord.fileName` (Task 1, 3).
- Produces:
```ts
// import-template.ts
export type WeldLocation = "shop" | "assembly" | "field"
export interface PcfTemplateSettings {
  kind: "pcf"
  weldLocationBySkey: Record<string, WeldLocation>   // ключ — SKEY стыка
  weldTypeByCode: Record<string, string>            // сырой код (WELD-TYPE или окончание SKEY детали) → код проекта
  serviceClassBySpec: Record<string, string>         // PIPING-SPEC → код класса проекта
  isoNumberFrom: "fileName" | "pipelineReference"
  defaultRevision: string | null
}
export const DEFAULT_PCF_SETTINGS: PcfTemplateSettings  // { WW: shop, WS: field, WF: field, WO: field }, { WN: "BW" }, {}, "fileName", null
// pcf-welds.ts
export function boreToInch(value: number, unit: PcfBoreUnit): number | null
export function pcfToWeldRecords(file: PcfFile, fileName: string, context: { pdsArea: string; settings: PcfTemplateSettings }): { records: SpoolgenRecord[]; issues: SpoolgenIssue[] }
// import-pcf.ts
export interface PcfSource { fileName: string; text: string }
export function buildPcfSubmission(sources: readonly PcfSource[], context: { pdsArea: string; settings: PcfTemplateSettings }): SpoolgenSubmission
// import-spooling.ts
export function buildSubmissionFromSet(set: SpoolgenFileSet, issues: readonly SpoolgenIssue[], canSubmit: boolean): SpoolgenSubmission
```
- Новые коды в `SPOOLGEN_ISSUE_CODES`: `PCF_UNKNOWN_UNITS` (ошибка, на файл), `PCF_NO_WELDS` (ошибка, на файл), `PCF_BORE_UNKNOWN` (ошибка, строка стыка), `PCF_SPOOL_FROM_FILE_NAME` (предупреждение, на файл), `DUPLICATE_FILE` (ошибка, на файл). Отсутствующие значения — существующий `MISSING_VALUE` с `columnName` = ключ контракта.

- [ ] **Step 1: Write the failing tests** `pcf-welds.test.ts`:
```ts
assert.equal(boreToInch(100, "MM"), 4); assert.equal(boreToInch(15, "MM"), 0.5); assert.equal(boreToInch(65, "MM"), 2.5)
assert.equal(boreToInch(96, "INCH-SIXTEENTH"), 6); assert.equal(boreToInch(4, "INCH"), 4); assert.equal(boreToInch(101, "MM"), null)
const { records, issues } = pcfToWeldRecords(parsePcf(sample), "ISO-1001.pcf", { pdsArea: "PDS-A", settings: DEFAULT_PCF_SETTINGS })
assert.deepEqual(records[0].values, { iso_number: "ISO-1001", revision_number: "2", pds_area: "PDS-A", service_class: "CS150", line_number: "100-P-1001", sheet_number: "", spool_number: "100-P-1001-S01", spool_weight_kg: "", material_class: "", weld_number: "5", weld_type: "BW", weld_location: "shop", diameter_inch: "4", thickness_mm: "" })
assert.equal(records[0].lineNumber, 12); assert.equal(records[0].fileName, "ISO-1001.pcf"); assert.equal(issues.length, 0)
```
плюс случаи (каждый — отдельное утверждение):
  - нет ни одного `SPOOL-IDENTIFIER` в файле → `spool_number = "ISO-1001"` и одно предупреждение `PCF_SPOOL_FROM_FILE_NAME`;
  - стык без `REPEAT-WELD-IDENTIFIER` → `MISSING_VALUE` по `weld_number` со строкой стыка и именем файла, запись не создаётся;
  - нет `REVISION` и `defaultRevision = "0"` → `revision_number = "0"`; нет и того и другого → `MISSING_VALUE` по `revision_number`;
  - `WELD-TYPE SW` у стыка → `weld_type = "SW"`; `serviceClassBySpec: { CS150: "SC-01" }` → `service_class = "SC-01"`;
  - `SKEY WS` → `field`; неизвестный `SKEY` и `CATEGORY ERECTION` → `field`; ни того ни другого → `MISSING_VALUE` по `weld_location`;
  - `UNITS-BORE FEET` → `PCF_UNKNOWN_UNITS`; ни одного блока `WELD` → `PCF_NO_WELDS`;
  - `isoNumberFrom: "pipelineReference"` → `iso_number = "100-P-1001"`.

`import-pcf.test.ts`:
  - `buildPcfSubmission([b, a])` и `buildPcfSubmission([a, b])` дают `deepEqual` строки (файлы сортируются по имени);
  - два источника с одинаковым именем → `DUPLICATE_FILE`, `canSubmit === false`;
  - один файл с двумя разными `PIPELINE-REFERENCE` (по стыку в каждом) → `ISO_MIXED_LINE` из существующей `checkIsoUniformity`;
  - `canSubmit === false`, если `pdsArea === ""`.

- [ ] **Step 2: Run to verify they fail**

Run: `node --import tsx --test modules/engineering/domain/pcf-welds.test.ts modules/engineering/application/import-pcf.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** Правила, которые тесты не выводят однозначно:
  - **Таблица DN → дюймы** (`boreToInch`, `MM`): 6→0.125, 8→0.25, 10→0.375, 15→0.5, 20→0.75, 25→1, 32→1.25, 40→1.5, 50→2, 65→2.5, 80→3, 90→3.5, 100→4, 125→5, 150→6, 200→8, 250→10, 300→12, 350→14, 400→16, 450→18, 500→20, 550→22, 600→24, 650→26, 700→28, 750→30, 800→32, 850→34, 900→36, 1000→40, 1050→42, 1200→48; иначе `null` и `PCF_BORE_UNKNOWN`.
  - **Связанная деталь стыка:** компонент, чей `COMPONENT-IDENTIFIER` равен `MASTER-COMPONENT-IDENTIFIER` стыка; если его нет — ближайший предыдущий не-`WELD` компонент в порядке файла; если и его нет — ближайший следующий.
  - **Катушка:** `SPOOL-IDENTIFIER` стыка → связанной детали → ближайшего предыдущего компонента, у которого он есть → ближайшего следующего; если в файле нет ни одного — имя файла без расширения и предупреждение.
  - **Тип стыка:** `WELD-TYPE` стыка; иначе `endType` того `END-POINT` связанной детали, координаты которого совпадают с первой точкой стыка (в образце `PIPE ... 2500 0 0 100 BW` → `BW`); иначе последние два символа `SKEY` связанной детали (`FLWN` → `WN`); затем `weldTypeByCode[код] ?? код`.
  - **Класс сервиса:** `PIPING-SPEC` стыка → связанной детали → трубопровода; затем `serviceClassBySpec[spec] ?? spec`.
  - **Место:** `weldLocationBySkey[SKEY]`, иначе `CATEGORY` стыка (`FABRICATION` → shop, `ERECTION` → field).
  - **Диаметр:** `bore` первого `END-POINT` стыка, иначе связанной детали.
  - **Трубопровод стыка:** последний `PIPELINE-REFERENCE` перед стыком в файле (его `REVISION`, `PIPING-SPEC`, значение — `line_number`).
  - Подразумеваемые стыки (без блока `WELD`), муфты `COCP` и врезки без `WELD` в первой версии не превращаются в стыки.
  - `buildSpoolgenSubmission(texts)` остаётся с прежней сигнатурой и вызывает `buildSubmissionFromSet` — скрипты и демо не меняются.
- [ ] **Step 4: Run to verify they pass** — та же команда и `npm run test:unit`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering/domain/import-template.ts modules/engineering/domain/pcf-welds.ts modules/engineering/domain/pcf-welds.test.ts modules/engineering/application/import-pcf.ts modules/engineering/application/import-pcf.test.ts modules/engineering/application/import-spooling.ts modules/engineering/domain/spoolgen-issue.ts
git commit -m "feat(import): turn PCF welds into spooling rows with spool, class, type and nominal size"
```

---

### Task 6: Шаблоны проекта и встроенные пресеты

**Files:**
- Create: `supabase/migrations/20261020103000_spooling_import_templates.sql`, `supabase/tests/database/137_spooling_import_templates.test.sql`
- Modify: `modules/engineering/domain/import-template.ts`; Create: `modules/engineering/domain/import-template.test.ts`
- Create: `modules/engineering/infrastructure/supabase-import-template-repository.ts`
- Modify: `lib/supabase/database.types.ts`

**Interfaces:**
- Produces (SQL): таблица `public.spooling_import_templates` (`id uuid pk default gen_random_uuid()`, `project_id uuid not null references projects on delete cascade`, `source text not null check (source in ('aveva','hexagon','plant3d','table'))`, `name text not null check (length(trim(name)) between 1 and 120)`, `settings jsonb not null check (jsonb_typeof(settings) = 'object')`, `created_by uuid default auth.uid() references profiles on delete set null`, `created_at`, `updated_at` с триггером `public.set_updated_at()`, `unique (project_id, name)`); RLS включён; политики: `select` — `current_user_has_capability(project_id, 'spooling.view')`; `insert`/`update`/`delete` — `'spooling.manage'` (`using` и `with check`); `grant select, insert, update, delete ... to authenticated`.
- Produces (TS):
```ts
export type ImportSourceId = "aveva" | "hexagon" | "plant3d" | "table" | "spoolgen"
export interface TableTemplateSettings { kind: "table"; columns: Partial<Record<SpoolgenFileRole, Record<string, string>>> }
export type ImportTemplateSettings = PcfTemplateSettings | TableTemplateSettings
export interface ImportTemplate { id: string | null; source: ImportSourceId; name: string; settings: ImportTemplateSettings }  // id null — встроенный
export const BUILT_IN_TEMPLATES: readonly ImportTemplate[]       // по одному на источник; "spoolgen" и "table" — kind "table" с пустым columns
export function parseTemplateSettings(value: unknown): ImportTemplateSettings | null
export async function loadImportTemplates(client, projectId: string): Promise<ImportTemplate[]>
export async function saveImportTemplate(client, projectId: string, template: ImportTemplate): Promise<ImportTemplate> // id null → insert, иначе update
export async function deleteImportTemplate(client, templateId: string): Promise<void>
export interface ImportReferences { pdsAreas: string[]; serviceClasses: string[]; weldTypes: string[] }
export async function loadImportReferences(client, projectId: string): Promise<ImportReferences> // активные коды из project_pds_areas, project_service_classes, project_weld_types
```

- [ ] **Step 1: Write the failing tests.** pgTAP `137`: пользователь с `spooling.view` без `spooling.manage` видит шаблон и не может вставить, изменить или удалить (`throws_ok`/`is_empty` по образцу `014_pds_area_scope_rls.test.sql`); пользователь с `spooling.manage` вставляет; пользователь другого проекта ничего не видит; `settings = '[]'` отвергается. Unit `import-template.test.ts`: `parseTemplateSettings({ kind: "table", columns: { weld: { weld_number: "Шов" } } })` возвращает объект; `parseTemplateSettings({ kind: "pcf" })` дополняет пропуски значениями `DEFAULT_PCF_SETTINGS`; `parseTemplateSettings({ kind: "x" })` и `parseTemplateSettings(null)` → `null`; `BUILT_IN_TEMPLATES.map((t) => t.source)` равно `["aveva","hexagon","plant3d","table","spoolgen"]`.
- [ ] **Step 2: Run to verify they fail** — `bash tasks/material-check/pgtap.sh test`; `node --import tsx --test modules/engineering/domain/import-template.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** миграцию, типы, `parseTemplateSettings` (строгая проверка формы, значения — строки), репозиторий (обычные `select`/`insert`/`update`/`delete`, ошибки через `mapSupabaseEngineeringError`), `npx supabase migration up --local`, перегенерация типов.
- [ ] **Step 4: Run to verify they pass** — те же команды, `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261020103000_spooling_import_templates.sql supabase/tests/database/137_spooling_import_templates.test.sql modules/engineering/domain/import-template.ts modules/engineering/domain/import-template.test.ts modules/engineering/infrastructure/supabase-import-template-repository.ts lib/supabase/database.types.ts
git commit -m "feat(import): project import templates under RLS, with built-in presets per source"
```

---

### Task 7: Экран плиток и панель таблиц (Excel/CSV и 4 файла)

**Files:**
- Create: `modules/engineering/infrastructure/submit-spooling-import.ts`
- Create: `modules/engineering/ui/spooling-import.tsx`, `modules/engineering/ui/import-source-picker.tsx`, `modules/engineering/ui/table-import-panel.tsx`, `modules/engineering/ui/column-mapping-editor.tsx`
- Create: `modules/engineering/application/import-table.ts`, `modules/engineering/application/import-table.test.ts`
- Delete: `modules/engineering/ui/spooling-import-screen.tsx` (перенести смысл `spooling-import-screen.test.ts` в `import-table.test.ts` и удалить его)
- Modify: `app/spooling/import/page.tsx`, `messages/en/spooling.json`, `messages/ru/spooling.json`, `modules/engineering/ui/spoolgen-issue-text.ts`

**Interfaces:**
- Consumes: `readSourceFile`, `parseSpoolgenMatrix`, `resolveColumns` (Task 1); `spoolingObjectPath`, `registerSpoolgenFile`, `SpoolingFileRole` (Task 3); `buildSubmissionFromSet` (Task 5); `BUILT_IN_TEMPLATES`, `loadImportTemplates`, `saveImportTemplate`, `TableTemplateSettings` (Task 6); `readFirstSheetMatrix` из `modules/imports/infrastructure/xlsx-workbook.ts`.
- Produces:
```ts
// submit-spooling-import.ts
export interface SpoolingUpload { role: SpoolingFileRole; file: File }
export async function submitSpoolingImport(client, projectId: string, submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]): Promise<{ jobId: string; issues: StoredImportIssue[]; counts: ValidationCounts }>
// import-table.ts
export interface TableSource { role: SpoolgenFileRole; fileName: string; matrix: readonly (readonly unknown[])[] }
export function buildTableSubmission(sources: readonly TableSource[], settings: TableTemplateSettings): SpoolgenSubmission & { missingColumns: Partial<Record<SpoolgenFileRole, { key: string; headers: string[] }[]>> }
// spooling-import.tsx
export function SpoolingImport(props: { projectId: string; canManage: boolean; onValidated: (jobId: string) => void }): JSX.Element
```
- `submitSpoolingImport` делает ровно то, что сейчас делает `validate` в `spooling-import-screen.tsx` (создать задание, загрузить и зарегистрировать каждый файл с индексом по порядку, `recordSpoolingValidation`, `revalidateSpoolingImportJob`, `loadJobIssues`).
- Плитки: пять, в порядке `aveva`, `hexagon`, `plant3d`, `table`, `spoolgen`; у каждой — название, строка «какие файлы нужны», у трёх PCF — пометка «не проверено на файле заказчика». В этой задаче плитки PCF показаны неактивными; Task 8 их включает.
- Панель таблиц: четыре слота ролей (`weld` обязателен); для `spoolgen` — `accept=".txt,.csv,.tsv"` и сопоставление выключено; для `table` — `accept=".xlsx,.xls,.csv,.txt"`; выбор шаблона: встроенный + шаблоны проекта того же `source`. Если у роли есть `missingColumns`, под слотом — `ColumnMappingEditor` (для каждого ключа выпадающий список исходных заголовков); «Проверить ещё раз» пересобирает отправку; «Сохранить как шаблон» (имя) — `saveImportTemplate`. Кнопка «Проверить файлы» неактивна, пока `canSubmit === false` или есть несопоставленные обязательные колонки.

- [ ] **Step 1: Write the failing test** `import-table.test.ts`:
  - матрица XLSX с заголовками `["Изометрия","Ревизия","Зона","Класс","Катушка","Шов","Тип","Диаметр"]` и сопоставлением `{ weld: { iso_number: "Изометрия", revision_number: "Ревизия", pds_area: "Зона", service_class: "Класс", spool_number: "Катушка", weld_number: "Шов", weld_type: "Тип", diameter_inch: "Диаметр" } }` → ноль ошибок, одна строка `weld_joint`;
  - без сопоставления → `missingColumns.weld` содержит `{ key: "weld_number", headers: [...] }` и `canSubmit === false`;
  - перенесённые утверждения из `spooling-import-screen.test.ts`.
- [ ] **Step 2: Run to verify it fails** — `node --import tsx --test modules/engineering/application/import-table.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** модули выше, ключи сообщений (`spooling.sources.<id>.title|hint`, `spooling.sources.unverified`, `spooling.table.*`, `spooling.mapping.*`, `spooling.templates.*`, новые `spooling.spoolgenIssues.<код>` из Task 5) в en и ru; `describeSpoolgenIssue` берёт `issue.fileName ?? \`${column}.txt\`` для файловых кодов. `page.tsx` рендерит `SpoolingImport` вместо `SpoolingImportScreen`.
- [ ] **Step 4: Run to verify it passes** — `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS (включая `scripts/i18n/find-ui-literals` и `i18n/messages.test.ts`).
- [ ] **Step 5: Commit**

```bash
git add modules/engineering app/spooling/import/page.tsx messages/en/spooling.json messages/ru/spooling.json
git commit -m "feat(import): source tiles and a table import with column mapping saved as a project template"
```

---

### Task 8: Панель PCF

**Files:**
- Create: `modules/engineering/ui/pcf-import-panel.tsx`, `modules/engineering/ui/pcf-mapping-editor.tsx`
- Create: `modules/engineering/application/pcf-unmapped.ts`, `modules/engineering/application/pcf-unmapped.test.ts`
- Modify: `modules/engineering/ui/import-source-picker.tsx`, `messages/en/spooling.json`, `messages/ru/spooling.json`

**Interfaces:**
- Consumes: `buildPcfSubmission`, `PcfTemplateSettings` (Task 5); `loadImportReferences`, `loadImportTemplates`, `saveImportTemplate` (Task 6); `submitSpoolingImport` (Task 7); `readSourceFile` (Task 1).
- Produces: `findUnmappedCodes(submission: SpoolgenSubmission, references: ImportReferences): { serviceClasses: string[]; weldTypes: string[] }` — значения `service_class` и `weld_type` из строк `weld_joint`, которых нет среди кодов проекта, отсортированные, без повторов.

Панель: множественный выбор файлов `accept=".pcf"` (до 300, по 4 МБ, повтор имени заменяет файл); обязательный выбор зоны PDS из `references.pdsAreas`; выбор шаблона (встроенный для плитки + шаблоны проекта того же `source`); после разбора — `PcfMappingEditor` для `findUnmappedCodes`: для каждого кода выпадающий список кодов проекта, результат пишется в `serviceClassBySpec` / `weldTypeByCode` и пересобирает отправку; «Сохранить как шаблон»; список ошибок с именами файлов; кнопка «Проверить файлы» — через `submitSpoolingImport` с ролью `pcf` у каждого файла.

- [ ] **Step 1: Write the failing test** `pcf-unmapped.test.ts`: отправка со стыками `service_class: "CS150"`, `"SC-01"` и `weld_type: "WN"`, `"BW"` при `references = { pdsAreas: [], serviceClasses: ["SC-01"], weldTypes: ["BW"] }` → `{ serviceClasses: ["CS150"], weldTypes: ["WN"] }`.
- [ ] **Step 2: Run to verify it fails** — `node --import tsx --test modules/engineering/application/pcf-unmapped.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** функцию, панель, редактор, включить плитки PCF в `import-source-picker.tsx`, ключи `spooling.pcf.*` в en и ru.
- [ ] **Step 4: Run to verify it passes** — `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering messages/en/spooling.json messages/ru/spooling.json
git commit -m "feat(import): PCF panel with PDS area, code mapping and saved templates"
```

---

### Task 9: Образцы файлов, сквозная проверка, показ в браузере

**Files:**
- Create: `fixtures/import-samples/README.md` (откуда взят каждый образец и что он проверяет)
- Create: `fixtures/import-samples/aveva/ISO-1001.pcf` (мм, `SPOOL-IDENTIFIER`, явные `WELD` с `REPEAT-WELD-IDENTIFIER`, `MASTER-COMPONENT-IDENTIFIER`, `SKEY WW/WS`, без `WELD-TYPE`)
- Create: `fixtures/import-samples/aveva/ISO-1002.pcf` (без `SPOOL-IDENTIFIER`)
- Create: `fixtures/import-samples/hexagon/ISO-2001.pcf` (по примеру Hexagon: `UCI`, `WELD-TYPE BW/SW`, `CATEGORY`)
- Create: `fixtures/import-samples/plant3d/ISO-3001.pcf` (дюймы, атрибуты трубопровода в колонке 1, табуляции)
- Create: `fixtures/import-samples/table/weld-register-cp1251.csv` (сделать из UTF-8: `iconv -f UTF-8 -t CP1251`; `;`, десятичная запятая, русские заголовки, одна ячейка в кавычках с `;`)
- Create: `modules/engineering/application/import-samples.test.ts`

**Interfaces:**
- Consumes: `decodeText`, `parseDelimited` (Task 1); `buildPcfSubmission` (Task 5); `buildTableSubmission` (Task 7); `DEFAULT_PCF_SETTINGS`.

- [ ] **Step 1: Write the test** `import-samples.test.ts`: читает файлы через `fs.readFileSync` + `decodeText`; для каждого набора PCF — ожидаемое число стыков и катушек, ноль ошибок (кроме `ISO-1002`: одно предупреждение `PCF_SPOOL_FROM_FILE_NAME`); `buildPcfSubmission` дважды на перевёрнутом порядке файлов → одинаковые строки; CSV — кодировка `windows-1251`, ноль ошибок после сопоставления из README, `thickness_mm` с точкой.
- [ ] **Step 2: Run** — `node --import tsx --test modules/engineering/application/import-samples.test.ts`. Expected: PASS (если FAIL — чинить код задачи, к которой относится сбой, не образец).
- [ ] **Step 3: Full gates** — `npm run lint`, `npm run typecheck`, `npm run test:unit`, `bash tasks/material-check/pgtap.sh test`. Expected: всё зелёное.
- [ ] **Step 4: Browser check on the live local stand.** `npx supabase migration up --local`; запустить приложение (`npm run dev`); в проекте **UPG-1** (не `TRACK01-A/B`, не `SHOWCASE-1`) открыть «Импорт»: проверить каждую плитку на образцах из `fixtures/import-samples/` до шага предпросмотра, **не применять**; сохранить шаблон таблицы и убедиться, что он подхватывается при повторной загрузке; затем отменить созданные задания кнопкой «Отменить» в истории импорта. Снимки экрана — в `docs/superpowers/specs/screenshots/2026-10-20-import-*.png`. Оставить вкладку открытой для владельца.
- [ ] **Step 5: Commit**

```bash
git add fixtures/import-samples modules/engineering/application/import-samples.test.ts docs/superpowers/specs/screenshots/2026-10-20-import-*.png
git commit -m "test(import): synthetic PCF and CP1251 samples run end to end"
```
