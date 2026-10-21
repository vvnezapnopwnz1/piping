# Правки после ревью импорта по шаблонам — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** закрыть замечания финального ревью фичи «Импорт катушек и стыков по шаблонам источников»: потеря сохранённого сопоставления колонок, английские тексты пользователю, два тупика в интерфейсе, чужое задание на экране, три незакрытые «мелочи», три недочёта SQL.

**Дата:** 2026-10-21. **Ветка:** `feat/unified-workspace` (коммит `545c7dd` — текущий конец ветки). План работает поверх него, новых веток не заводить.

**Spec:** `docs/superpowers/specs/2026-10-20-import-templates-design.md`, план исходной фичи — `docs/superpowers/plans/2026-10-20-import-templates.md`.

---

## 0. Состояние на 2026-10-21 (прочитать до правок)

Фича реализована полностью: все 9 задач исходного плана закрыты коммитами `bd84ef4..545c7dd` (18 коммитов, 81 файл, +5 251 строка). Ветка не влита в `main`.

Проверено и работает:

- Ворота зелёные: `npm run test:unit` — 878 pass, `npm run typecheck` — чисто, `npm run lint` — 0 ошибок (139 прежних предупреждений), pgTAP на изолированном стеке — 1316 pass (83 файла).
- Шесть новых миграций применены на локальном стенде (`20261020100000`…`20261020105000`).
- Сквозная проверка на локальном стенде в проекте **UPG-1** (проект заведён и загружен: 40 изометрий, 94 катушки, 13 правил толщины, 3 зоны PDS, 3 класса сервиса, 3 типа стыка):
  - CSV в Windows-1251 — кодировка опознана, русские заголовки сопоставлены сами, `Зона PDS` / `Класс трубопровода` / `Диаметр, дюйм` / `Толщина стенки, мм` — вручную; сервер принял, в предпросмотре 10 новых объектов.
  - 4 PCF — 35 строк (4 изометрии, 8 катушек, 23 стыка), одно предупреждение `PCF_SPOOL_FROM_FILE_NAME`, порядок выбора файлов не влияет на строки.
  - Толщина из правила проекта: CS150 6″ → 7.110, 4″ → 6.020, 2″ → 3.910; у CS300 2″ и 0.75″ правила нет → толщина пуста → `SRV_THICKNESS_MISSING`.
- Браузер (Chromium, приложение на `localhost:3107`): плитки, панель Excel/CSV с сопоставлением колонок, панель PCF с выбором зоны PDS — обе дошли до серверной проверки и предпросмотра ревизий.

Не сделано и не входит в этот план: **релиз на production**. На удалённом стенде (`https://app.piping-qc-work.shop/`, `/opt/pipeqc`) работает `main` на коммите `f9806e4`, применено 151 миграция, последняя `20261019090000` — шесть новых миграций не применены, фичи на стенде нет. (Контейнер `pipeqc-app` был остановлен 25 часов и давал 502; его подняли на том же образе, адрес отвечает 200.)

---

## Global Constraints

- Правила бэкенда из `AGENTS.md`: чтение — обычные `select` по таблицам под RLS; доступ только в политиках RLS; **не добавлять `SECURITY DEFINER`-функцию, возвращающую данные пользователю**; одна полезная нагрузка на команду, без отката на старый формат; сервер владеет правилом и причиной, клиент только переводит коды; без пагинации без измеренной нужды.
- Все строки, которые читает человек, — только в `messages/en/*.json` и `messages/ru/*.json`; русские термины по `docs/i18n/glossary-ru.md`. `npm run test:unit` падает на литерале в `.tsx` и на расхождении ключей ru/en.
- **Живой локальный стенд не сбрасывать**: никогда не запускать `demo:prepare`, `demo:showcase`, `supabase db reset`, `npm run verify`, `npm run test:db` против портов 543xx. Новые миграции на живой стенд — `npx supabase migration up --local`. pgTAP — только на изолированном стеке: `bash tasks/material-check/pgtap.sh test`.
- Уже применённые миграции не переписывать; каждое изменение функции — новая миграция поверх, тело копировать из последнего определения (`grep` перед копированием).
- Не создавать данные в проектах `TRACK01-A`, `TRACK01-B`, `SHOWCASE-1`. Свою проверку делать в **UPG-1**. Хостинговый стенд KZ не трогать. Секреты не печатать.
- Новых зависимостей не добавлять.
- Работать в текущем каталоге и ветке `feat/unified-workspace`. В рабочем дереве есть чужие правки (`messages/{en,ru}/home.json`, `modules/home/ui/*`, `scripts/upg/*`, `tsconfig.tsbuildinfo`) — **не добавлять их в коммиты**, `git add` только своих файлов.
- Одно изменение — один коммит; сообщения в стиле репозитория: `fix(import): …`.

---

## Review Focus

Что должно быть верно после правок; каждый пункт проверяется тестом или в браузере.

1. Нажатие «Проверить ещё раз» **не стирает** сохранённое сопоставление колонки, которой нет в текущем файле, и шаблон, который затем сохраняют, сохраняет его.
2. Пользователь на русском не видит английских фраз об ошибках шаблона.
3. Панель PCF не остаётся в тупике, если коды проекта не загрузились: есть сообщение и повтор.
4. Плитка «4 файла» не велит сопоставлять колонки, которые сопоставлять нечем.
5. При выборе нового файла предыдущее задание и его решения по ревизиям исчезают с экрана.
6. Толщина, которую человек проверил, та же самая попадает в применение, даже если правило проекта изменили между проверкой и применением.
7. Один и тот же набор файлов в любом порядке даёт те же строки и те же номера объектов в хранилище.

---

### Task 1: Три незакрытые «мелочи» и мёртвые ключи

**Files:**
- Modify: `messages/en/nav.json`, `messages/ru/nav.json`
- Modify: `messages/en/spooling.json`, `messages/ru/spooling.json`
- Modify: `modules/imports/ui/import-issue-list.tsx`

**Interfaces:**
- Produces: вкладка импорта называется нейтрально («Импорт» / «Import»), а не «Импорт SpoolGen»; запись об ошибке уровня файла показывает только имя файла; подсказка панели PCF говорит, что шаблон сохраняется по команде человека.

**Детали:**

1. **Вкладка.** `messages/ru/nav.json:4` — `"spoolGenImport": "Импорт SpoolGen"`, `messages/en/nav.json:4` — `"SpoolGen Import"`. На экране теперь пять источников, а не один формат SpoolGen → `"Импорт"` / `"Import"`. Ключ оставить прежним, чтобы не трогать `components/pipeqc/top-nav.tsx` и другие места; правится только текст.
2. **Ошибка уровня файла.** Сейчас строка об ошибке печатает `ISO-1002.pcf · Лист · spool_number`: `import-issue-list.tsx` для `issue.rowNumber === null` берёт `t("issueList.sheet")` («Лист» / «Sheet»). Для ошибки, у которой есть имя файла и нет строки, показывать только имя файла: `fileName` → `ISO-1002.pcf`. Строка без файла и без строки («Лист») остаётся как есть — так показываются ошибки всего набора файлов. Правка в `modules/imports/ui/import-issue-list.tsx`: условие на `issue.fileName && issue.rowNumber === null`.
3. **Подсказка панели PCF.** `messages/{en,ru}/spooling.json` → `pcf.mapping.hint`: «Выбор применяется сразу и сохраняется вместе с шаблоном.» — звучит так, будто сохранение происходит само. Заменить на формулировку, где сохранение — команда человека: выбор применяется сразу к загрузке, а в шаблон попадает, когда человек нажимает «Сохранить как шаблон». Русский и английский тексты — разные по форме, одинаковые по смыслу.
4. **Мёртвые ключи — проверить, что их нет.** `spooling.importScreen.title`, `spooling.importScreen.files`, `spooling.importScreen.requiredFile` в текущих `messages/{en,ru}/spooling.json` уже отсутствуют (в `importScreen` остались `hint`, `replace`, `validate`, `jobCreated`, `validated`, `failed`, `tooMany`). Перед тем как закрывать задачу, убедиться `grep -rn "importScreen.title\|importScreen.files\|importScreen.requiredFile" modules app scripts`, что таких ключей нет и в коде; если после правок задачи 1–6 появится неиспользуемый ключ — удалить его из обоих файлов.

- [ ] **Step 1: Write the failing test.** Тест на текст: `modules/engineering/ui/engineering-i18n.test.ts` (файл уже есть) — расширить:
  ```ts
  assert.equal(ru.nav.spoolGenImport, "Импорт")
  assert.equal(en.nav.spoolGenImport, "Import")
  assert.ok(!ru.spooling.pcf.mapping.hint.includes("сохраняется вместе с шаблоном"))
  ```
  Плюс проверка, что в `en.spooling.pcf.mapping.hint` нет утверждения, что сохранение происходит без команды человека (по-английски текст не должен говорить, что выбор сохраняется сам).
- [ ] **Step 2: Run to verify it fails** — `node --import tsx --test modules/engineering/ui/engineering-i18n.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** — правки пунктов 1–4 выше.
- [ ] **Step 4: Run to verify it passes** — `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add messages/en/nav.json messages/ru/nav.json messages/en/spooling.json messages/ru/spooling.json modules/imports/ui/import-issue-list.tsx modules/engineering/ui/engineering-i18n.test.ts
git commit -m "fix(import): the tab, the file-level issue line and the template hint say what the screen does"
```

---

### Task 2: «Проверить ещё раз» не стирает сохранённое сопоставление

**Files:**
- Modify: `modules/engineering/application/import-table.ts`
- Modify: `modules/engineering/ui/table-import-panel.tsx`
- Modify: `modules/engineering/application/import-table.test.ts`

**Interfaces:**
- Consumes: `applyColumnDrafts`, `columnMapOf`, `describeTableColumns` (без изменений в сигнатурах).
- Produces: `mergeColumnMaps(base: Record<string, string>, draft: Record<string, string>): Record<string, string>` — сопоставление полей, которых нет в текущем файле, остаётся как было; поля, которые есть в файле, берутся из черновика.

**Детали (дефект подтверждён прогоном):**

`table-import-panel.tsx:74` строит сохраняемый шаблон как `applyColumnDrafts(settings, { [role]: editor.value })`, где `editor.value` = `drafts[role] ?? columnMapOf(described.columns)`. `columnMapOf` (`import-table.ts:46`) оставляет только поля, которые **нашлись в текущем файле**. Поэтому шаблон `{ weld: { weld_number: "Шов" } }` при файле без синонима этого поля теряет `weld_number` уже при нажатии «Проверить ещё раз», и сохраняемый следом шаблон его тоже не содержит.

Проверка, которая это воспроизводит (шаблон `weld_number → "Шов"`, файл с заголовком `№ шва`): после `applyColumnDrafts(settings, { weld: columnMapOf(described.columns) })` в `settings.columns.weld` ключа `weld_number` нет.

Порядок исправления:

1. В `import-table.ts` добавить `mergeColumnMaps(base, draft)`: для каждого ключа черновика — значение черновика; ключи `base`, которых нет в черновике, **остаются**. Значение `null`/пустая строка в черновике означает «поле убрать из сопоставления» — такое намерение должно быть явным, а не следствием того, что поля нет в файле.
2. В `table-import-panel.tsx:74` (`toSave`) и в `apply` (`:124`) считать результат через `mergeColumnMaps`, а не через `applyColumnDrafts` для одного поля:
   - `toSave` = для каждой роли с открытым редактором — `mergeColumnMaps(settings.columns[role] ?? {}, editor.value)`.
   - `apply(role, columnMap)` = `setSettings` с тем же слиянием для этой роли.
3. Редактор (`column-mapping-editor.tsx`) показывает поле, которого нет в файле, как «Нет в файле» — это верно, но теперь нажатие «Проверить ещё раз» **не удаляет** прежнее сопоставление: оно остаётся в настройках и в сохраняемом шаблоне. Человек может убрать его сам, выбрав «Нет в файле» явно; тогда `mergeColumnMaps` получает явное намерение убрать и сопоставление исчезает.
4. `applyColumnDrafts` оставить (его использует `toSave` в других местах) или заменить на `mergeColumnMaps` — так, чтобы **везде** слияние было «черновик поверх настроек, а не вместо них». Проверить `grep -rn "applyColumnDrafts" modules/` и привести всех вызывающих к новому правилу.

- [ ] **Step 1: Write the failing test** в `modules/engineering/application/import-table.test.ts`:
  ```ts
  const settings = { kind: "table" as const, columns: { weld: { weld_number: "Шов" } } }
  const source = { role: "weld" as const, fileName: "new.csv", matrix: [["Изометрия", "№ шва"], ["ISO-9", "W-1"]] }
  const described = describeTableColumns(source, settings.columns.weld)
  const merged = mergeColumnMaps(settings.columns.weld ?? {}, columnMapOf(described.columns))
  assert.equal(merged.weld_number, "Шов")          // прежнее сопоставление живо
  assert.equal(merged.iso_number, "Изометрия")     // найденное в файле — из черновика
  ```
  и второй случай: явное «Нет в файле» (`delete next[key]` в редакторе) → сопоставление убрано.
- [ ] **Step 2: Run to verify it fails** — `node --import tsx --test modules/engineering/application/import-table.test.ts`. Expected: FAIL (функции нет / поле пропадает).
- [ ] **Step 3: Implement** — пункты 1–4 выше.
- [ ] **Step 4: Run to verify it passes** — та же команда, затем `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering/application/import-table.ts modules/engineering/application/import-table.test.ts modules/engineering/ui/table-import-panel.tsx
git commit -m "fix(import): checking again keeps the mapping of a column this file does not have"
```

---

### Task 3: Ошибки шаблонов — по кодам, а не английским текстом

**Files:**
- Modify: `modules/engineering/domain/import-template.ts`
- Modify: `modules/engineering/infrastructure/supabase-import-template-repository.ts`
- Modify: `modules/engineering/ui/import-template-bar.tsx`
- Modify: `messages/en/spooling.json`, `messages/ru/spooling.json`
- Modify: `modules/engineering/infrastructure/supabase-import-template-repository.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ImportTemplateErrorCode =
    | "TEMPLATE_NAME_TAKEN"      // такое имя уже есть в проекте
    | "TEMPLATE_NAME_INVALID"    // имя или источник не проходят проверку таблицы
    | "TEMPLATE_SETTINGS_INVALID"// настройки не подходят своему источнику
    | "TEMPLATE_REFUSED"         // правило проекта не дало изменить
    | "TEMPLATE_SAVE_FAILED"     // остальное
  export class ImportTemplateError extends Error { readonly code: ImportTemplateErrorCode }
  ```
  Репозиторий бросает `ImportTemplateError` с кодом; экран переводит код в текст (`spooling.templateErrors.<code>`), а текст сервера (`errorDetail`) остаётся под переведённым заголовком — как принято в репозитории.

**Детали:**

`supabase-import-template-repository.ts:18,19,44` бросают английские фразы («A template with this name already exists in this project…»), и `modules/engineering/infrastructure` **не входит** в `I18N_DONE_PATHS` (`i18n/coverage.ts`), поэтому сканер `scripts/i18n/find-ui-literals` их не видит: русский пользователь читает английский текст. Это не серверные сообщения — их пишет клиент, значит перевод обязателен.

1. В `domain/import-template.ts` — тип кода и класс ошибки.
2. В репозитории — `failure(error)` возвращает `new ImportTemplateError("TEMPLATE_NAME_TAKEN", message)` для `23505`, `TEMPLATE_NAME_INVALID` для `23514`, `TEMPLATE_SAVE_FAILED` для остального; `refused()` → `TEMPLATE_REFUSED`; проверка вида настроек (`:44`) → `TEMPLATE_SETTINGS_INVALID`. Текст сервера класть в `cause`/`message`, но **не показывать вместо перевода**.
3. В `import-template-bar.tsx` — `catch` определяет код (`error instanceof ImportTemplateError ? error.code : "TEMPLATE_SAVE_FAILED"`) и показывает `toast.error(t(\`templateErrors.${code}\`), { description: errorDetail(error) })`.
4. Ключи `spooling.templateErrors.*` в `messages/en/spooling.json` и `messages/ru/spooling.json` — по одному на код, в ru и en одинаковый набор ключей и одинаковые подстановки.

- [ ] **Step 1: Write the failing test** в `supabase-import-template-repository.test.ts`: сохранение шаблона с занятым именем → ошибка с кодом `TEMPLATE_NAME_TAKEN` (не строка с текстом); настройки не того вида → `TEMPLATE_SETTINGS_INVALID`.
- [ ] **Step 2: Run to verify it fails** — `node --import tsx --test modules/engineering/infrastructure/supabase-import-template-repository.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** — пункты 1–4.
- [ ] **Step 4: Run to verify it passes** — та же команда, `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering/domain/import-template.ts modules/engineering/infrastructure/supabase-import-template-repository.ts modules/engineering/infrastructure/supabase-import-template-repository.test.ts modules/engineering/ui/import-template-bar.tsx messages/en/spooling.json messages/ru/spooling.json
git commit -m "fix(import): a template error is a code the screen translates, not an English sentence"
```

---

### Task 4: Два тупика и чужое задание на экране

**Files:**
- Modify: `modules/engineering/ui/pcf-import-panel.tsx`
- Modify: `modules/engineering/ui/table-import-panel.tsx`
- Modify: `modules/engineering/ui/spooling-import.tsx`
- Modify: `app/spooling/import/page.tsx`
- Modify: `messages/en/spooling.json`, `messages/ru/spooling.json`

**Interfaces:**
- Produces: `SpoolingImport` получает проп `onJobChange: (jobId: string | null) => void` вместо `onValidated: (jobId: string) => void`; `app/spooling/import/page.tsx` хранит `jobId: string | null` и передаёт `setJobId`.

**Детали:**

1. **Панель PCF — тупик при неудачной загрузке кодов.** `pcf-import-panel.tsx:87-89`: если `loadImportReferences` падает, `references` остаётся `null`, выбор зоны PDS (`:139`) навсегда заблокирован, `canSubmit` не включится, а сигнал — только исчезающий тост `pcf.referencesFailed`. Сделать: состояние `referencesFailed` + сообщение на экране под панелью с кнопкой «Повторить» (`pcf.retry`), которая повторяет загрузку кодов. Пока коды не загружены, подсказка `pcf.pdsAreaHint` не должна утверждать, что всё в порядке.
2. **Плитка «4 файла» — неверная подсказка.** `table-import-panel.tsx:130`: `reason = ... unmatched ? t("table.unmatched")` показывается и для `source === "spoolgen"`, где сопоставление выключено (`mappable === false`) и колонки взять неоткуда. Кнопка «Проверить файлы» при этом не включится никогда, потому что `buildTableSubmission` (`import-table.ts:39`) ставит `canSubmit = … && Object.keys(missingColumns).length === 0`. Для источника «4 файла» текст должен быть про колонки файла (например: «В файле стыков нет колонки … — сервер покажет это при проверке»), а кнопка — **включаться**, чтобы сервер сообщил о проблеме: старый экран отправлял такой файл и показывал `MISSING_COLUMN` от сервера.
   - `buildTableSubmission` не знает, какой источник читает (это понятие экрана), поэтому строгость должна приходить параметром: `buildTableSubmission(sources, settings, options?: { strictColumns?: boolean })`. По умолчанию — строго (Excel/CSV ведут себя как сейчас); для «4 файла» панель передаёт `strictColumns: false`, и тогда `canSubmit` зависит только от наличия файла стыков, а недостающие колонки уходят на сервер.
   - Это откат к поведению старого экрана для одного источника; остальные источники (Excel/CSV) остаются строгими. Отразить это в тесте `import-table.test.ts`: при `strictColumns: false` и файле стыков без обязательной колонки `canSubmit` истинен, а `missingColumns` при этом заполнен (сервер расскажет).
3. **Чужое задание на экране.** Старый экран при выборе файла делал `setJobId(null)`, и рабочая область ревизий скрывалась. Новый `spooling-import.tsx:28` (`clearIssues`) чистит только список замечаний, а `app/spooling/import/page.tsx` продолжает держать `jobId` прошлой загрузки — решения по ревизиям старого задания остаются рядом с новыми файлами, и человек может применить не то. Сделать: `clearIssues` вызывает и `onJobChange(null)`; страница хранит `string | null`.
4. **Второй файл на ту же роль — молчаливая замена.** `table-import-panel.tsx:97` вызывает `addPickedFiles(role, [], [file], others)` — пустой список «уже взятых», поэтому новый файл просто занимает место старого без слова. Планировка задачи 7 исходного плана — один файл на роль (слот на роль), так что менять модель не надо; но замена должна быть видимой: при выборе файла на занятую роль показать сообщение «Файл … заменил …» (`table.replaced`). Передавать в `addPickedFiles` реально взятый список, чтобы потеря файла была обнаружима.

- [ ] **Step 1: Write the failing tests.**
  - `modules/engineering/application/import-table.test.ts`: для источника без сопоставления `canSubmit` истинен при наличии файла стыков, а `missingColumns` при этом заполнен (сервер расскажет).
  - Юнит на `spooling-import.tsx` либо (если тестов на панели нет) — проверка через `engineering-i18n.test.ts` ключей `pcf.retry` и `table.replaced` в ru и en.
- [ ] **Step 2: Run to verify they fail** — `node --import tsx --test modules/engineering/application/import-table.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** — пункты 1–4.
- [ ] **Step 4: Run to verify they pass** — `npm run test:unit`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add modules/engineering app/spooling/import/page.tsx messages/en/spooling.json messages/ru/spooling.json
git commit -m "fix(import): the PCF panel can retry the project codes, the four-file source reports its columns, and a new file hides the previous job"
```

---

### Task 5: SQL — толщина фиксируется при проверке, длина имени файла, restrictive-политика

**Files:**
- Create: `supabase/migrations/20261021100000_spooling_thickness_frozen_at_validation.sql`
- Create: `supabase/migrations/20261021101000_import_job_issue_file_name_length.sql`
- Create: `supabase/migrations/20261021102000_spooling_import_templates_restrictive_policy.sql`
- Modify: `supabase/tests/database/135_spooling_thickness_from_rule.test.sql`
- Create: `supabase/tests/database/138_spooling_thickness_frozen_at_validation.test.sql`

**Interfaces:**
- Produces: `public.spooling_staging(target_job_id uuid)` — та же сигнатура; читает толщину **из сохранённых строк**, без обращения к правилам. Толщину один раз подставляет `record_spooling_validation` при записи строк задания. Файл `20261020101000` продолжает действовать (миграции не переписываются), новая миграция переопределяет функцию поверх.

**Детали:**

1. **Толщина фиксируется при проверке, а не при чтении.** Сейчас `spooling_staging` (`20261020101000:18`) на каждом чтении (проверка, предпросмотр, применение — около двадцати раз за применение) считает толщину по действующему правилу. Значит: правило изменили между проверкой и применением → применяется другое значение, чем то, которое человек видел в предпросмотре; и повторный импорт файла без толщины показывает ложное «изменение толщины».
   - Новая миграция переопределяет `spooling_staging` телом из **последнего определения без заполнения** — `supabase/migrations/20260803092000_spooling_import_apply.sql:220-237` (`select r.row_number, r.normalized_values ->> 'entity_type', r.normalized_values from public.import_job_rows r where r.job_id = target_job_id and r.action <> 'skip' order by r.row_number`), с теми же `language sql stable`, `set search_path = public, pg_temp` и грантами (строки 239-249 того же файла). Перед правкой — `grep -n "create or replace function public.spooling_staging" supabase/migrations/*.sql`, чтобы убедиться, что других определений нет.
   - Новая миграция переопределяет `record_spooling_validation`: тело копируется из последнего определения (`20261020103000`, см. `grep`), и после вставки строк в `public.import_job_rows` выполняется `update`, который для строк `entity_type = 'weld_joint'` с пустой толщиной (`nullif(btrim(normalized_values ->> 'thickness_mm'), '') is null`) дописывает в `normalized_values` толщину активного правила проекта для того же класса сервиса и диаметра. Правило ищется тем же способом, что и сейчас: `project_service_classes.code = normalized_values ->> 'service_class'`, `diameter_inch = engineering_numeric(normalized_values ->> 'diameter_inch')`, `status = 'active'`, `project_id` задания. Толщина из файла не меняется; стык без правила остаётся пустым и блокируется `SRV_THICKNESS_MISSING`.
   - Заполнение делается один раз на задание — группировать по (класс, диаметр) как в `20261020101000`, а не искать правило на каждую строку.
   - **Следствие, которое нужно принять осознанно:** если правило появилось **после** проверки, стык останется без толщины до следующей проверки (новая загрузка). Это и есть «что проверили — то применится».
   - Обновить `135_spooling_thickness_from_rule.test.sql`: тест уже готовит строки через `record_spooling_validation`, поэтому его утверждения (7.110 / 9 / `SRV_THICKNESS_MISSING`) остаются верными; поправить комментарий и добавить проверку, что в `public.import_job_rows` толщина записана (значение **сохранено**, а не посчитано при чтении).
   - Новый тест `138_spooling_thickness_frozen_at_validation.test.sql`: после `record_spooling_validation` изменить правило (например, `7.11` → `9.53`) и убедиться, что `spooling_staging` всё ещё отдаёт `7.110`, а `apply_spooling_import_job` применяет `7.11`.
2. **Длина имени файла в замечании.** `import_job_issues.file_name` — текст без ограничения; клиент может записать любое имя. Новая миграция: `alter table public.import_job_issues add constraint import_job_issues_file_name_length check (file_name is null or length(file_name) <= 255);`.
3. **Restrictive-политика для шаблонов.** `20261020104000:27-42` — все четыре политики `spooling_import_templates` PERMISSIVE; правило из `AGENTS.md` («сужающая проверка должна быть RESTRICTIVE») требует, чтобы проверка права не исчезла, когда появится вторая PERMISSIVE-политика. Новая миграция: оставить широкую базу (`project_id in (select private.user_project_ids('project.view'))`) и добавить сужающую политику с `as restrictive` на `current_user_has_capability(project_id, 'spooling.view')` / `'spooling.manage'`. Проверить по образцу `supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql` и его тесту `supabase/tests/database/014_pds_area_scope_rls.test.sql`; добавить утверждения в `137_spooling_import_templates.test.sql`: пользователь с `spooling.view` читает, но не пишет; пользователь другого проекта не видит ничего.

- [ ] **Step 1: Write the failing pgTAP test** `138_spooling_thickness_frozen_at_validation.test.sql` (по образцу `135`): админ, проект, класс `SC-138`, правило 6″ → 7.11 мм, задание со строкой `weld_joint` без толщины; `record_spooling_validation`; затем `update project_thickness_flange_rules set thickness_mm = 9.53`; утверждения: `spooling_staging` всё ещё `7.110`, в `import_job_rows` записано `7.11`, после `apply_spooling_import_job` у стыка `thickness_mm = 7.11`.
- [ ] **Step 2: Run to verify it fails** — `bash tasks/material-check/pgtap.sh test`. Expected: FAIL (значение меняется на 9.53).
- [ ] **Step 3: Implement** — три миграции выше.
- [ ] **Step 4: Run to verify they pass** — `bash tasks/material-check/pgtap.sh test`, затем `npm run test:unit`. Expected: PASS, включая `127_spooling_job_joint_limit`, `134_import_wps_coverage`, `135`, `136`, `137`.
- [ ] **Step 5: Apply to the live local stand and commit**

```bash
npx supabase migration up --local
git add supabase/migrations/20261021100000_spooling_thickness_frozen_at_validation.sql supabase/migrations/20261021101000_import_job_issue_file_name_length.sql supabase/migrations/20261021102000_spooling_import_templates_restrictive_policy.sql supabase/tests/database/135_spooling_thickness_from_rule.test.sql supabase/tests/database/137_spooling_import_templates.test.sql supabase/tests/database/138_spooling_thickness_frozen_at_validation.test.sql
git commit -m "fix(import): the thickness checked is the thickness applied, and the template policies narrow by capability"
```

---

### Task 6: Мелочи и общая приёмка

**Files:**
- Modify: `modules/engineering/ui/column-mapping-editor.tsx`
- Modify: `modules/engineering/ui/pcf-import-panel.tsx`
- Modify: `modules/engineering/application/pcf-unmapped.ts`
- Modify: `messages/en/spooling.json`, `messages/ru/spooling.json`

**Детали:**

1. **Доступное имя у списков сопоставления.** `column-mapping-editor.tsx:44` — поле подписано `<span>`, а у `SelectTrigger` нет `aria-label`; экранный диктор читает «поле со списком» без указания, что выбирается. Сделать как в `pcf-mapping-editor.tsx:45`: `aria-label={t("chooseColumn", { field: t(\`fields.${column.key}\`) })}` (новый ключ `spooling.mapping.chooseColumn` в en и ru).
2. **Индекс загрузки PCF — по имени файла.** `pcf-import-panel.tsx:123` отправляет файлы в порядке выбора, а `import-pcf.ts:16` читает их по именам. Строки совпадают в любом порядке, а пути в хранилище — нет: одна и та же пачка файлов в двух заданиях лежит под разными именами. Отправлять файлы, отсортированные по имени (тем же порядком, что читает `buildPcfSubmission`).
3. **`findUnmappedCodes` — не решение, а подсказка.** `modules/engineering/application/pcf-unmapped.ts:16-20` повторяет серверное правило «кода нет в проекте» в TypeScript. Сервер всё равно откажет (`SRV_SERVICE_CLASS_MISSING`, `SRV_WELD_TYPE_MISSING`), панель лишь предлагает сопоставление. Оставить поведение, но исправить комментарий и название так, чтобы было видно: это подсказка для человека, а не проверка готовности; сослаться на коды сервера в комментарии.
4. **Проверка в браузере на локальном стенде** (проект **UPG-1**, образцы из `fixtures/import-samples/`, ничего не применять):
   - Плитки, панель Excel/CSV с файлом `table/weld-register-cp1251.csv`: сопоставление `Зона PDS`, `Класс сервиса`, `Диаметр, дюймы`, `Толщина стенки, мм` → «Проверить ещё раз» → «Проверить файлы» → предпросмотр.
   - Панель PCF с `aveva/ISO-1001.pcf` и `aveva/ISO-1002.pcf`, зона PDS `A-100` → «Проверить файлы» → предупреждение `PCF_SPOOL_FROM_FILE_NAME` со строкой `ISO-1002.pcf` (без «Лист») и предпросмотр.
   - Выбрать файл заново → убедиться, что решения по ревизиям прошлого задания исчезли.
   - Сохранить шаблон сопоставления → перезагрузить страницу → выбрать шаблон → сопоставление подхватилось; проверить, что шаблон **не потерял** поле, которого нет в текущем файле (сценарий задачи 2).
   - Созданные задания отменить («Отменить» в истории импорта).
   - Снимки — в `docs/superpowers/specs/screenshots/2026-10-21-import-*.png`.

- [ ] **Step 1:** внести правки пунктов 1–3.
- [ ] **Step 2: Run to verify** — `npm run test:unit`, `npm run typecheck`, `npm run lint`, `bash tasks/material-check/pgtap.sh test`. Expected: всё зелёное.
- [ ] **Step 3: Browser check** — пункт 4; вкладку оставить открытой.
- [ ] **Step 4: Commit**

```bash
git add modules/engineering messages/en/spooling.json messages/ru/spooling.json docs/superpowers/specs/screenshots/2026-10-21-import-*.png
git commit -m "fix(import): named mapping fields, one file order for the upload, and a clearer word for the code hint"
```

---

## Что сказать владельцу (не в коде)

1. **Production не обновлён.** Фича живёт только в ветке `feat/unified-workspace`; на стенде `main` без неё. Порядок выпуска — `docs/runbooks/hosted-stand-operations.md`: слияние в `main` → backup → шесть+три миграций с `ON_ERROR_STOP` → `NOTIFY pgrst, 'reload schema'` → пересборка `pipeqc-app`.
2. **Миграции совместимы со старым UI** (старый экран шлёт роли `weld|trace|bolt|supp`, новая схема их принимает), но после применения `20261021100000` толщина стыка без толщины в файле берётся из правила **при проверке** — это видно в предпросмотре как готовое значение.
3. **Плитки PCF помечены «настроено по документации, не проверено на файле заказчика»** — образцы синтетические; при появлении настоящего файла заказчика пресеты надо подгонять (дизайн, §8).
4. **Отдельное наблюдение по стенду (не связано с фичей):** контейнер `pipeqc-app` был остановлен на 25 часов, публичный адрес отдавал 502; его подняли на том же образе. Стоит решить, почему `restart: unless-stopped` не вернул контейнер (вероятно, `docker stop` вручную помечает контейнер как остановленный пользователем) — иначе такое повторится.
