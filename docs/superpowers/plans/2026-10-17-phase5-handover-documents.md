# Фаза 5: исполнительные документы — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PipeQC выдаёт по данным проекта четыре реестра в Excel и сдаточное досье тест-пакета в PDF и Excel. Досье
содержит заготовку акта гидроиспытания и Weld History, на русском и английском. На TP-100-01 из UPG-1 комплект
можно показать заказчику.

**Architecture:**
- Сервер собирает строки документов в трёх представлениях `security_invoker`. Клиент читает их целиком, страницами
  через `.range`, без обрезки на 1 000 строк.
- Чистые функции превращают строки в таблицы документа. Тонкие рендереры рисуют XLSX (SheetJS) и PDF (jsPDF +
  `jspdf-autotable` со встроенным PT Sans).
- Все слова в документе приходят из `messages/{ru,en}/documents.json`.
- Хранения документов нет: файл собирается в браузере и скачивается.

**Tech Stack:** TypeScript, Next.js, Supabase JS, PostgreSQL views, pgTAP, `xlsx` 0.20.3, `jspdf` 4.2.1,
`jspdf-autotable` 5.0.8, `node --test`, next-intl.

**Spec:**
- роадмап `docs/audits/2026-10-14-project-review-and-roadmap.md`, §5, фаза 5;
- решения владельца 17.10 — ниже.

Отчёты §20 мануала: `docs/marker-output/manual.md`, строки 6068–6130.

## Решения владельца 17.10

| # | Решение |
|---|---|
| D1 | Шесть документов. Проектные реестры (XLSX): журнал сварочных работ, реестр NDE, реестр замечаний, сводка по тест-пакетам. Досье тест-пакета (PDF + XLSX): состав, Weld History, NDE пакета, замечания, заготовка акта. |
| D2 | Акт — заготовка, построенная по приложению 21 Инструкции МЧС РК № 359 от 27.07.2021 («Акт испытания трубопроводов на прочность и герметичность»): строка на каждую линию пакета. PipeQC вписывает линию, среду, вид испытания, Ри и дату. Рабочие P/T, продолжительность, падение давления и подписи вписывают от руки. Результат испытания в PipeQC не записывается: решение 09.10 в силе. |
| D3 | Замечания — только категория X. A/B/C не вводим. |
| D4 | Журнал сварки — только то, что PipeQC записывает. Пустых колонок под электроды, подогрев и отметки прораба нет. |
| D5 | Шифры QC-13 и W10P сейчас убираются только из текстов интерфейса. Префикс номеров `QC13-`, таблица `qc13_progress_forms` и английские тексты ошибок сервера меняются после фазы 2, отдельной задачей. |
| D6 | Storage `generated-documents` и история по объекту из `audit_events` в эту фазу не входят. |
| D7 | Ссылка на норму стоит только у акта, и звучит так: «Структура — прил. 21 Инструкции, приказ МЧС РК № 359». Номера СП РК в документы не ставить, пока не прочитано приложение В СП РК 3.05-103-2014. «СП РК 3.05-101-2013» не существует: не использовать. |
| D8 | RPT-F-001 (ход изготовления) и RPT-T-001 (готовность пакетов) удаляются. Журнал сварки и сводка по пакетам их перекрывают. |

## Global Constraints

- **Фаза 2 идёт параллельно в той же папке и ветке.**
  - Не трогать: `scripts/upg/**`, `tasks/phase2/**`, `docs/superpowers/plans/2026-10-17-phase2*`, а также
    существующие файлы `docs/acceptance/**`.
  - Если гейт падает в файлах фазы 2, это записывается в отчёт и не исправляется.
- **Живой локальный стенд принадлежит фазе 2.**
  - Здесь запрещены `demo:prepare`, `demo:showcase`, `npm run verify` и `npm run test:db`: они работают с живым
    стеком.
  - pgTAP запускается только через `bash tasks/material-check/pgtap.sh test <файлы>` и `... check`, на `.pgtap-stack`.
  - На живой стек схема попадает только через `npx supabase migration up` и только после зелёного pgTAP.
- **Гейт задачи:** `npm run lint && npm run typecheck && npm run test:unit`. Задача не заканчивается с падающим
  тестом в дереве: фаза 2 в любой момент может запустить `verify`.
- **Коммиты только по своим путям:** `git commit -m "…" -- <пути>`. Никогда `git add -A` или `git add .`.
  - Перед коммитом выполнить `git status --short` и сверить список.
  - `package.json` и `package-lock.json` коммитятся, только если `git diff` в них содержит одни свои строки. Иначе
    ждать коммита фазы 2.
- **Без новых веток, worktree и пуша.** KZ-стенд не трогать. Выкладка — отдельно владельцем по
  `docs/runbooks/hosted-stand-operations.md`: миграции раньше образа приложения.
- **Секреты** — по `CLAUDE.md`: значения не печатать, inline не передавать.
- **Правила бэкенда из `CLAUDE.md`.**
  - Чтения — select из представлений `security_invoker`, без `SECURITY DEFINER`.
  - Клиент не вычисляет готовность и стадии. Он печатает то, что отдал сервер: `disposition`, `is_rft`, даты
    стадий.
- **i18n.** Каждое слово документа — заголовки, колонки, подписи значений, текст акта — лежит в
  `messages/en/documents.json` и `messages/ru/documents.json`. Рендерер получает готовые подписи. Термины RU —
  по `docs/i18n/glossary-ru.md`.
- **Зависимость** — ровно `jspdf-autotable@5.0.8`. 5.0.9 вышла 15.10, ей меньше двух недель; peer `jspdf ^4`.
- **Шрифт** — PT Sans Regular и Bold (OFL) из `google/fonts`, в `public/fonts/` вместе с `OFL.txt`.
- **Бюджет — 2 недели, режется объём, а не срок.** Порядок резки:
  1. реестр замечаний проекта;
  2. сводка по пакетам;
  3. XLSX досье.
- **Конец каждой задачи** — результат открыт в браузере.

## Review Focus

1. **Проект больше 1 000 стыков.** Журнал и реестр содержат все строки, хотя PostgREST отдаёт не больше
   `max_rows`. Тест в задаче 1 — `selectAllRows` с ограничением страницы; в задаче 3 — загрузчик через пейджер.
2. **ISO с замещённой ревизией и удалённым стыком.** В документах только стыки принятой ревизии, удалённых нет.
   Тест — pgTAP в задаче 2.
3. **Чужой проект или субподрядчик с ограниченной областью PDS.** Представления отдают только строки, которые
   пропускает RLS. Тест — pgTAP в задаче 2.
4. **Кириллица в многостраничном PDF.** Русский текст набран встроенным PT Sans, Helvetica нет. На каждой
   странице шапка и «стр. N из M». Тест — задача 1.
5. **Пакет без стыков, NDE и замечаний и ещё не испытанный.** Досье собирается, в пустых разделах написано «Записей
   нет», дата испытания в акте пустая. Тест — задача 4.

---

### Task 1: Основа документов — чтение без обрезки, шрифт, PDF и XLSX

**Files:**
- Create: `lib/supabase/select-all-rows.ts`, `lib/supabase/select-all-rows.test.ts`
- Create: `modules/documents/domain/document.ts`
- Create: `modules/documents/infrastructure/renderers/pdf-document.ts`, `pdf-document.test.ts`
- Create: `modules/documents/infrastructure/renderers/xlsx-document.ts`, `xlsx-document.test.ts`
- Create: `public/fonts/PTSans-Regular.ttf`, `public/fonts/PTSans-Bold.ttf`, `public/fonts/OFL.txt`
- Modify: `package.json`, `package-lock.json`

**Interfaces — Produces:**
- `selectAllRows<Row>(fetchPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message?: string } | null }>, pageSize = 1000): Promise<Row[]>`.
  - Запрашивает `[from, from + pageSize - 1]`, сдвигает `from` на число **полученных** строк и останавливается на
    пустой странице. Так сервер с меньшим `max_rows` ничего не теряет.
  - Ошибку бросает как `Error(error.message)`.
- `document.ts`:
  - `type DocumentLocale = "ru" | "en"`;
  - `interface DocumentHeader { title: string; projectCode: string; projectTitle: string; generatedAt: Date; author: string; locale: DocumentLocale }`;
  - `interface DocumentChrome { generatedLabel: string; authorLabel: string; page: (n: number, total: number) => string; noRecords: string }`;
  - `type Cell = string | number | null`;
  - `interface DocumentTable { head: string[]; body: Cell[][] }`;
  - `compareCodes(a: string, b: string): number` — `a.localeCompare(b, "ru", { numeric: true })`, чтобы `W-2`
    шёл раньше `W-10`.
- `pdf-document.ts`:
  - `interface PdfFonts { regular: Uint8Array; bold: Uint8Array }`;
  - `loadPdfFonts(fetchImpl: typeof fetch = fetch): Promise<PdfFonts>` — `/fonts/PTSans-Regular.ttf`,
    `/fonts/PTSans-Bold.ttf`;
  - `createPdf(fonts: PdfFonts, orientation: "portrait" | "landscape"): jsPDF` — A4, pt. Регистрирует семейство
    `PTSans` (normal, bold) через `addFileToVFS` + `addFont` и включает его;
  - `drawSection(doc: jsPDF, title: string, table: DocumentTable, chrome: DocumentChrome): void` — заголовок
    раздела и `autoTable` шрифтом PTSans. Шапка таблицы повторяется. Пустой `body` печатает `chrome.noRecords`;
  - `finishPdf(doc: jsPDF, header: DocumentHeader, chrome: DocumentChrome): Blob` — на каждой странице шапка
    (название, проект, время среза, автор) и низ `chrome.page(n, total)`.
- `xlsx-document.ts`:
  - `documentSheet(header: DocumentHeader, chrome: DocumentChrome, table: DocumentTable, widths?: number[]): XLSX.WorkSheet`
    — первые строки: название, проект, срез, автор; пустая строка; затем таблица;
  - `xlsxBlob(sheets: readonly { name: string; sheet: XLSX.WorkSheet }[]): Blob`.

- [ ] **Step 1:** `npm install --save-exact jspdf-autotable@5.0.8`. Скачать шрифты:
  `curl -fL -o public/fonts/PTSans-Regular.ttf https://github.com/google/fonts/raw/main/ofl/ptsans/PT_Sans-Web-Regular.ttf`,
  так же `PT_Sans-Web-Bold.ttf` → `PTSans-Bold.ttf` и `OFL.txt`. Проверить: `file public/fonts/*.ttf` → TrueType.
- [ ] **Step 2: тесты.**
  - `selectAllRows returns every row when the server caps a page`. Фейковый пейджер отдаёт не больше 3 строк из 7.
    Итог — 7 строк. Вызовы: `(0,999)`, `(3,1002)`, `(6,1005)`, `(7,1006)`.
  - `selectAllRows throws the server message`. Пейджер возвращает `{ data: null, error: { message: "boom" } }` →
    reject с `/boom/`.
  - `pdf embeds PT Sans and never falls back to Helvetica`. Шрифты читаются с диска через `readFileSync`. Текст
    `"Журнал сварочных работ"`. В `doc.output()` есть `/FontFile2` и `PTSans`, нет `/Helvetica`.
  - `finishPdf numbers every page`. В таблице 120 строк, `chrome.page` вызван с `(1,N)…(N,N)`, где
    `N === doc.getNumberOfPages()` и `N > 1`.
  - `xlsx keeps Cyrillic`. После `XLSX.read` ячейка `A1` равна `"Журнал сварочных работ"`, шапка таблицы стоит в
    строке 6.
- [ ] **Step 3:** `node --import tsx --test lib/supabase/select-all-rows.test.ts modules/documents/infrastructure/renderers/*.test.ts`
  → FAIL: модулей нет.
- [ ] **Step 4:** реализовать по Interfaces.
- [ ] **Step 5:** те же тесты → PASS. Затем гейт задачи.
- [ ] **Step 6:** коммит `feat(documents): paged reads, embedded Cyrillic font, PDF and XLSX primitives` по путям
  задачи.
- [ ] **Step 7:** одноразовый `tasks/phase5/sample-pdf.ts` (вне git) собирает `createPdf` + `drawSection` +
  `finishPdf` на 120 строках в `tasks/phase5/samples/sample.pdf`. Открыть его в браузере: кириллица читается, страницы
  пронумерованы.

### Task 2: Представления документов на сервере

Перед задачей загрузить `supabase-postgres-best-practices`.

**Files:**
- Create: `supabase/migrations/20261018090000_document_projections.sql`
- Create: `supabase/tests/database/118_document_projections.test.sql`
- Modify: `lib/supabase/database.types.ts`

**Interfaces — Produces.** Три представления `with (security_invoker = true)`. Для каждого
`revoke all … from anon, authenticated; grant select … to authenticated`.

- `weld_log_rows` — строка на стык текущей ревизии: `isometric_revisions.status = 'accepted'`, катушка и стык не
  `is_removed`. Можно строить поверх `weld_progress_summary`. Колонки:
  - идентификаторы: `weld_joint_revision_id`, `project_id`, `isometric_id`;
  - ISO: `iso_number`, `revision_number`, `line_number`;
  - стык: `spool_number`, `weld_number`, `weld_location`, `weld_type_code`, `diameter_inch`, `thickness_mm`;
  - сварка: `wps_code`, `welder_codes text[]`, `weld_on`;
  - NDE: `nde_methods text[]` — методы обязательств, `nde_pending int`, `nde_rejected int`;
  - PWHT: `pwht_required`, `pwht_accepted`;
  - материал: `trace_numbers text[]` — плавки из Material Check катушки;
  - пакет: `test_pack_id`, `test_pack_number` — активное членство ISO, `removed_at is null`.
- `nde_register_rows` — строка на `nde_obligations` стыка текущей ревизии. Колонки:
  - идентификаторы: `obligation_id`, `project_id`, `isometric_id`;
  - стык: `iso_number`, `spool_number`, `weld_number`, `weld_location`, `welder_codes text[]`;
  - обязательство: `method`, `selection_mode`, `required_coverage`, `disposition`;
  - партия: `batch_number`, `batch_status`, `ndt_subcontractor_name`;
  - результат: `examined_on`, `outcome`, `report_number` = `coalesce(result.report_number, batch.report_number)`,
    `defect_code`;
  - пакет: `test_pack_id`, `test_pack_number`.
- `test_pack_document_rows` — строка на пакет. Колонки:
  - пакет: `test_pack_id`, `project_id`, `test_pack_number`, `revision_no`, `lifecycle`;
  - система: `system_code`, `system_description`, `subsystem_code`, `subsystem_description`, `service_class_code`,
    `line_service_code`;
  - испытание: `test_medium`, `test_pressure`, `pressure_unit`, `location`, `planned_start_on`, `planned_end_on`;
  - готовность: `is_rft`, `rft_on` — из `test_pack_readiness`;
  - стадии: `testing_started_on`, `testing_completed_on`, `precommissioning_completed_on` — из
    `pressure_test_stage_events`;
  - состав: `iso_count`, `line_numbers text[]` (различные, по назначенным ревизиям активных ISO), `weld_total`,
    `weld_done`, `open_x_count`.

- [ ] **Step 1: `118_document_projections.test.sql`.** Фикстуры — по образцу `117_*.test.sql` и `104_*.test.sql`.
  Проверки:
  - у трёх представлений `reloptions` содержит `security_invoker=true`;
  - у `anon` нет `select`, у `authenticated` есть;
  - у ISO ревизия A замещена ревизией B: `weld_log_rows` отдаёт стыки только B, удалённого стыка нет;
  - `nde_register_rows.report_number` берётся из результата, а без результата — из партии;
  - стык ISO из пакета несёт `test_pack_number`. После `removed_at` у членства `test_pack_id is null`;
  - `test_pack_document_rows.testing_started_on` равен дате события `testing_started`;
  - пользователь без членства в проекте видит 0 строк во всех трёх представлениях.
- [ ] **Step 2:** `bash tasks/material-check/pgtap.sh test supabase/tests/database/118_document_projections.test.sql`
  → FAIL: `relation … does not exist`.
- [ ] **Step 3:** написать миграцию.
- [ ] **Step 4:** тот же запуск → PASS. Затем `bash tasks/material-check/pgtap.sh check` →
  `OK   pgTAP suite: no failures beyond …`.
- [ ] **Step 5: типы.** `npx supabase gen types typescript --local --workdir .pgtap-stack > lib/supabase/database.types.ts`.
  - В diff только три новых представления.
  - Файл остаётся без точек с запятой. Если стиль поменялся, выполнить
    `npx prettier --no-semi --write lib/supabase/database.types.ts`.
- [ ] **Step 6:** гейт задачи. Затем `npx supabase migration up` на живом стеке: добавляет только представления,
  данные UPG-1 не трогает.
- [ ] **Step 7:** коммит `feat(db): weld log, NDE register and test pack document projections` по путям задачи.
- [ ] **Step 8:** в браузере (Studio `http://127.0.0.1:54323`) выполнить
  `select count(*) from weld_log_rows where project_id = <UPG-1>`. Число сравнить с количеством стыков в UPG-1.

### Task 3: Проектные реестры вместо RPT-F-001 и RPT-T-001

**Files:**
- Modify: `modules/documents/domain/report.ts` (определения и строки)
- Create: `modules/documents/domain/registers.ts` + `registers.test.ts` (чистые построители таблиц)
- Create: `modules/documents/application/generate-document.ts` + `generate-document.test.ts`
- Delete: `generate-demo-report.ts`, `renderers/fabrication-progress.ts`, `renderers/test-pack-rft.ts` и их тесты
- Modify: `modules/documents/infrastructure/supabase-report-repository.ts` + тест,
  `modules/documents/ui/reports-screen.tsx`, `app/reports/page.tsx`, `messages/{en,ru}/documents.json`

**Interfaces:**
- Consumes: всё из задачи 1; представления из задачи 2.
- Produces:
  - `type DocumentCode = "RPT-W-001" | "RPT-N-001" | "RPT-P-001" | "RPT-T-002" | "DOS-T-001"`;
  - `interface DocumentDefinition { code: DocumentCode; scope: "project" | "testPack"; formats: readonly ("xlsx" | "pdf")[]; requiredCapability: Capability; fileNameStem: string }`
    — stems: `weld-log`, `nde-register`, `punch-register`, `test-pack-summary`, `test-pack-dossier`;
  - строки `WeldLogRow`, `NdeRegisterRow`, `PunchRow`, `TestPackDocumentRow` — camelCase колонок представлений.
    `PunchRow` берётся из `punch_items` с `project_punch_codes(code)` и `isometrics(iso_number)`;
  - `weldLogTable(rows, labels: WeldLogLabels): DocumentTable` и так же `ndeRegisterTable`, `punchTable`,
    `testPackSummaryTable`. Сортировка — `compareCodes` по ISO, катушке и стыку. Коды (`shop`, `rt`, `accepted`,
    `H`) переводятся через подписи;
  - `generateDocument(repository: DocumentRepository, input: GenerateDocumentInput): Promise<GenerateDocumentResult>`
    — `GenerateDocumentInput = { code; format; projectId; projectCode; projectTitle; author; locale; generatedAt; testPackId?; labels }`.
    Результат тот же, что у прежнего `GenerateDemoReportResult`;
  - имя файла `buildReportFileName` → `UPG-1-weld-log-2026-10-18.xlsx`;
  - загрузчики используют `selectAllRows` с порядком по уникальному ключу (`weld_joint_revision_id`,
    `obligation_id`, `id`). Автор — `profiles.full_name` текущего пользователя, если пусто — email.

- [ ] **Step 1: тесты.**
  - `weld log sorts ISO, spool and weld in natural order`: `W-2` перед `W-10`.
  - `weld log prints locations and PWHT through labels, never raw codes`: в RU-таблице нет `field` и `shop`.
  - `NDE register shows the report number and defect for a rejected weld`.
  - `NDE register leaves the result empty for a pending obligation`.
  - `test pack summary has one row per pack with stage dates`.
  - `loader reads past the row cap`: фейковый клиент отдаёт страницы по 2 из 5 → 5 строк.
  - `generateDocument`:
    - неизвестный код → `unknownReport`;
    - ошибка загрузчика → `failed` с `detail`;
    - имя файла по образцу выше.
- [ ] **Step 2:** запуск тестов `modules/documents/**/*.test.ts` → FAIL.
- [ ] **Step 3: реализовать.** На экране «Отчёты» — четыре проектных документа, по одной кнопке XLSX. Подписи
  строятся в UI из `useTranslations("documents")`. Заметку `note` в обоих языках переписать: «Файл собирается из
  текущих данных проекта и не сохраняется в PipeQC».
- [ ] **Step 4:** тесты → PASS, гейт задачи. `documents-i18n.test.ts` (литералы в `modules/documents/ui`) и
  `i18n/messages.test.ts` (ключи RU) зелёные.
- [ ] **Step 5:** коммит `feat(documents): weld log, NDE, punch and test pack registers` по путям задачи.
- [ ] **Step 6:** `http://localhost:3000/reports`, проект UPG-1, RU. Скачать журнал сварки. Число строк сверить со
  `select count(*)` задачи 2. Скриншот экрана и файлы — в `tasks/phase5/samples/`.

### Task 4: Сдаточное досье тест-пакета и кнопка в карточке пакета

**Files:**
- Create: `modules/documents/domain/test-pack-dossier.ts` + тест (снимок и построители разделов)
- Create: `modules/documents/infrastructure/renderers/test-pack-dossier.ts` + тест (PDF и XLSX)
- Create: `modules/documents/ui/test-pack-dossier-button.tsx`
- Modify: `modules/documents/infrastructure/supabase-report-repository.ts`,
  `modules/pressure-test/ui/test-pack-workbench.tsx`, `messages/{en,ru}/documents.json`

**Interfaces:**
- Consumes: задачи 1–3.
- Produces:
  - `interface TestPackDossierSnapshot { pack: TestPackDocumentRow; isos: { isoNumber: string; revisionNumber: string; lineNumber: string | null }[]; welds: WeldLogRow[]; nde: NdeRegisterRow[]; punch: PunchRow[] }`;
  - `loadTestPackDossier(client, { projectId, testPackId }): Promise<TestPackDossierSnapshot>`. Пять чтений с
    фильтром `test_pack_id`:
    - `test_pack_document_rows`;
    - состав ISO — `test_pack_iso_status`. Если в нём нет номера ревизии или линии, читать активные
      `test_pack_isometrics` с `isometric_revisions(revision_number, line_number)` и `isometrics(iso_number)`;
    - `weld_log_rows`, `nde_register_rows`, `punch_items`;
  - `toMegapascal(value: number, unit: "bar" | "psi"): number` — bar / 10, psi × 0.00689476, три знака;
  - `actTable(snapshot, labels): DocumentTable`. Колонки приложения 21:
    - № п/п, трубопровод (линия и её ISO);
    - рабочие P, МПа | T, °C | среда;
    - прочность: вид | Ри, МПа | продолжительность;
    - герметичность: Ри, МПа | продолжительность | падение, % | допустимое, %.

    Строка — одна на `line_numbers` пакета. Заполнены только трубопровод, среда, вид (`H` → гидравлическое,
    `P` → пневматическое, `V` → пусто) и Ри прочности. Остальные ячейки пустые;
  - `isoTable`, `weldHistoryTable` (все стыки пакета: цех и монтаж, плавки, WPS, клейма, дата, методы и номера
    заключений, PWHT), `ndeTable`, `punchTable` — переиспользуют построители задачи 3;
  - `renderTestPackDossierPdf(snapshot, fonts, header, chrome, labels): Blob` — A4 альбом. Разделы:
    1. титул пакета;
    2. акт (заготовка): шапка с проектом, пакетом и датой `testing_completed_on` или пустой; таблица;
       заключение; три строки «должность / ФИО / подпись / дата»; сноска D7;
    3. ISO;
    4. Weld History;
    5. NDE;
    6. замечания X.
  - `renderTestPackDossierXlsx(snapshot, header, chrome, labels): Blob` — листы «Пакет», «ISO», «Weld History»,
    «NDE», «Замечания». Акта в XLSX нет: это документ под подпись;
  - `TestPackDossierButton({ projectId, testPackId, testPackNumber })` — две кнопки, «Досье PDF» и «Досье XLSX».
    Видны при `access.can("reports.view")`. Ставится в `status` у `RecordDrawer` рядом с `statusNode`.

- [ ] **Step 1: тесты.**
  - `act has one row per line of the pack and blank measured fields`. В пакете 2 линии, 3 ISO → 2 строки. Ячейки
    P/T и продолжительности — `null`.
  - `act prints hydraulic for medium H and pneumatic for medium P`.
  - `toMegapascal converts bar and psi`: `(10,"bar") === 1`, `(145.0377,"psi") ≈ 1`.
  - `weld history covers shop and field welds of every ISO in the pack`.
  - `empty untested pack still builds a dossier`. Без стыков, NDE и замечаний PDF собирается, в разделах — подпись
    `noRecords`, дата испытания в шапке акта пустая.
  - `dossier PDF uses PT Sans on every page`: как в задаче 1.
- [ ] **Step 2:** запуск → FAIL.
- [ ] **Step 3:** реализовать. PDF открывается в новой вкладке (blob URL) и скачивается под именем
  `UPG-1-test-pack-dossier-TP-100-01-<дата>.pdf`.
- [ ] **Step 4:** тесты → PASS, гейт задачи.
- [ ] **Step 5:** коммит `feat(documents): test pack handover dossier with a pressure test act blank` по путям задачи.
- [ ] **Step 6:** UPG-1 → Test Packs → TP-100-01 → «Досье PDF». Показать PDF в браузере: акт, Weld History и
  русский текст.

### Task 5: Убрать шифры QC-13 и W10P из текстов интерфейса

**Files:**
- Modify: `messages/{en,ru}/fabrication.json`, `messages/{en,ru}/erection.json`, `docs/i18n/glossary-ru.md`
- Create: `i18n/form-codes.test.ts`

Меняются только значения строк, ключи остаются. Термины:
- QC-13 → EN «spool fabrication sheet», RU «лист изготовления катушки»;
- W10P → EN «coating inspection report», RU «акт контроля покрытия».

Номер формы (`{form}`) печатается как есть. Префикс `QC13-` меняется позже (D5).

- [ ] **Step 1:** тест `ui text carries no foreign form codes`. Значения всех `messages/{en,ru}/*.json` не
  совпадают с `/\bQC-?13\b|\bW-?10P\b|\bW-?2[34]\b/i`.
- [ ] **Step 2:** запуск → FAIL: список строк.
- [ ] **Step 3:** заменить значения, добавить термины в глоссарий.
- [ ] **Step 4:** тест → PASS, гейт задачи.
- [ ] **Step 5:** коммит `fix(i18n): neutral names for the fabrication sheet and coating report` по путям задачи.
- [ ] **Step 6:** в браузере — рабочее место катушки в изготовлении (RU): кнопка выдачи листа без «QC-13».

### Task 6: Комплект на TP-100-01 и приёмка владельцем

**Files:** Create `docs/acceptance/2026-10-phase5-documents.md`. Это новый файл; файлы фазы 2 не трогать.

- [ ] **Step 1:** проверить, что на живом стенде есть UPG-1 и TP-100-01 испытан:
  `select testing_completed_on from test_pack_document_rows where test_pack_number = 'TP-100-01'` не пусто.
  Если фаза 2 в это время сбросила стенд, данные не создавать: дождаться её и записать это в отчёт.
- [ ] **Step 2:** собрать в RU досье TP-100-01 (PDF и XLSX) и четыре реестра UPG-1. Положить в
  `tasks/phase5/samples/`: в git не попадают.
- [ ] **Step 3: записать приёмку.**
  - Что в каждом документе.
  - Что вписывается от руки.
  - Что не сделано и почему: D3–D6, приложение В СП РК не прочитано.
  - Замечания владельца.
- [ ] **Step 4: роадмап §5, фаза 5.** Статус одной строкой. Следующее:
  - выкладка на KZ (миграция `20261018090000`, затем образ);
  - префикс `QC13-` и таблица (D5);
  - лендинг — только после приёмки, примеры на данных UPG-1.
- [ ] **Step 5:** коммит `docs(acceptance): phase five documents on TP-100-01` по путям задачи. Показать
  владельцу досье в браузере.

---

**Готово, когда:**
1. Владелец открыл досье TP-100-01 и сказал, что его можно показать заказчику.
2. Журнал сварки UPG-1 содержит все стыки проекта.
3. В текстах интерфейса нет QC-13 и W10P.
4. Гейты зелёные. pgTAP-набор на `.pgtap-stack` — `OK`.
