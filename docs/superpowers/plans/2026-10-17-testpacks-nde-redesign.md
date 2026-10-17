# Тест-пакеты и NDE: новый интерфейс — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** один экран «список пакетов слева, шкала шагов справа» под `/testpack` и один экран NDE с вкладками под `/nde`, на существующих серверных чтениях и командах.

**Architecture:** чистая модель шагов (код → состояние, причина, сводка) считает только отображение из `test_pack_workflow`; экран читает уже существующие view и вызывает уже существующие команды. Старые адреса остаются и открывают новый экран через функцию переноса адресов. Строки интерфейса — в `messages/{en,ru}`.

**Tech Stack:** Next.js 16 (client components), TypeScript, next-intl, `components/ui/data-table`, Supabase JS (`selectAllRows`), `node --test` через `tsx`, Playwright (`channel: "chrome"`) для браузерной проверки.

**Spec:** `docs/superpowers/specs/2026-10-17-testpacks-nde-redesign-design.md`. Образцы: `modules/pressure-test/ui/spike-test-packs-next.tsx` и `modules/quality/ui/spike-nde-next.tsx` (одноразовые, удаляются в задаче 9).

## Global Constraints

- Чтения — `select` из таблиц и `security_invoker`-вьюх; записи — только существующие RPC-обёртки (`assignLineCheck`, `recordLineCheckResult`, `assignItemClearance`, `recordPunchClearance`, `assignBlinding`, `recordBlinding`, `recordPressureTestStage` / `recordManagedPressureTestStage`, `assignReinstatement`, `recordReinstatement`, `createTestPack`, `updateTestPack`, `composeTestPack`, `archiveTestPack`; в NDE `createNdeBatch`, `allocateNdeBatchCandidates`, `issueNdeBatch`, `recordNdeResult`, `closeNdeBatch`). Новых миграций и серверных правил нет.
- Клиент не вычисляет готовность, вердикты и права на действие: берёт `canonical_state`, `*_state`, `blockers`, `available_operations` из `test_pack_workflow` (`TESTING_STEP_OPERATIONS` и `canOpenWorkflowOperation` — существующие).
- Каждая строка для человека — в `messages/en/*.json` и `messages/ru/*.json`, код возвращает ключи; `npm run test:unit` падает на английском в `.tsx` и на пропущенном русском ключе. Термины — `docs/i18n/glossary-ru.md`.
- Проектные списки читаются через `selectAllRows` (лимит PostgREST 1000 строк).
- Ключи идемпотентности команд остаются прежними по форме (`browser-pressure-test-stage-<pack>-<stage>` и т. д.).
- Права: `testpack.manage` для действий, `canOperateWorkflow(canManage, lifecycle, dataCurrent)` не меняется.
- Перед релизом `bash tasks/material-check/pgtap.sh check` (изменений SQL нет, прогон — как контроль), стенд не сбрасывать.
- Цвета только токенами темы; закреплённые заголовки — `sticky` внутри прокручиваемого контейнера, без `overflow: hidden` на предках.

## Review Focus

1. Ссылка на пакет, которого нет (`?testPackId=неверный`): экран показывает «Пакет не найден» и список, а не пустую панель.
2. Пакет без изометрик: шкала открывается на «Состав», остальные шаги серые с причиной, без ошибок.
3. Читатель без `testpack.manage` и архивный пакет: шаги видны, кнопок действий нет, причина показана.
4. Массовое принятие NDE: часть стыков отклонена сервером — принятые остаются записанными, ошибочные перечислены, отметка с принятых снята.
5. Брак без кода дефекта, сварщик не с этого стыка: кнопка недоступна, сервер не вызывается.
6. Список пакетов больше 1000 и таблица стыков больше 1000 строк читаются полностью.
7. Узкое окно (до 1023 px): выбор пакета открывает вторую страницу, «назад» возвращает к списку, заголовок шага виден.
8. Глубокие ссылки из других модулей: `?testPackId=`, `?view=`, `?operation=`, `?mode=`, `/nde?spool=` работают.

---

## File Structure

**Тест-пакеты** (`modules/pressure-test/`):
- Create `domain/pack-steps.ts` — чистая модель шкалы: типы `PackStep`, `StepState`, `buildPackSteps`, `currentStepId`, `packStageGroup`.
- Create `ui/test-packs-screen.tsx` — экран (список + панель + узкий режим).
- Create `ui/test-pack-list.tsx` — левый список с поиском и чипами.
- Create `ui/test-pack-steps.tsx` — шкала, `StepCard` с закреплённым заголовком.
- Create `ui/steps/composition-step.tsx`, `readiness-step.tsx`, `line-check-step.tsx`, `blinding-step.tsx`, `testing-step.tsx`, `reinstatement-step.tsx` — содержимое шагов (одна карточка действия на шаг).
- Create `ui/legacy-address.ts` — перенос старых адресов в `{ pack, step }`.
- Create `infrastructure/test-pack-rows.ts` — `listTestPackWorkflowRows` (чтение `test_pack_workflow` целиком).
- Modify `infrastructure/supabase-pressure-test-repository.ts` — удалить `listTestPackStages`, `listTestPackStageStates`, `listAvailableOperations` после замены (задача 3).
- Delete (задача 8): `ui/test-pack-dashboard.tsx`, `ui/test-pack-workbench.tsx`, `ui/test-pack-explorer-screen.tsx`, `ui/test-pack-workflow-panel.tsx`, `ui/pressure-test-home-screen.tsx`, `ui/request-preparation-screen.tsx`, `ui/pressure-test-progress-screen.tsx` и тесты, которые они закрывали, если после замены покрыты новыми.
- Modify `app/testpack/**/page.tsx` — все страницы, кроме `print/**`, рендерят `TestPacksScreen` с переносом адреса.
- Modify `config/navigation.ts` и тесты навигации (`config/navigation.test.ts`, `components/pipeqc/navigation-model.test.ts`, `components/pipeqc/workspace-model.test.ts`).

**NDE** (`modules/quality/`):
- Create `domain/nde-joint-state.ts` — `jointState(ob)`, `NDE_TABS`.
- Create `application/accept-nde-results.ts` — `acceptNdeResults`.
- Create `ui/nde-screen.tsx` и `ui/nde-tabs/{joints,waiting-result,waiting-batch,closed,summary}.tsx`.
- Modify `ui/nde-dashboard-screen.tsx` — сжатые показатели (вкладка «Сводка»).
- Modify `app/nde/page.tsx`, `app/nde/dashboard/page.tsx`; delete `ui/nde-batch-screen.tsx` (задача 8).

---

### Task 1: Модель шкалы шагов пакета

**Files:**
- Create: `modules/pressure-test/domain/pack-steps.ts`
- Test: `modules/pressure-test/domain/pack-steps.test.ts`

**Interfaces:**
- Consumes: `ViewRow<"test_pack_workflow">` (тип строки вьюхи из `database.types.ts`).
- Produces:
  - `type StepId = "composition" | "readiness" | "line_check" | "item_clearance" | "blinding" | "testing" | "y_reinstatement" | "precommissioning" | "z_reinstatement"`
  - `type StepState = "done" | "ready" | "ongoing" | "blocked"`
  - `interface PackStep { id: StepId; state: StepState; summary: { key: string; values?: Record<string, string | number> } | null; reasons: { key: string; values?: Record<string, string | number> }[] }` — `key` — ключи из `messages/*/testPack.json` секции `steps`.
  - `buildPackSteps(row: WorkflowRow): PackStep[]` — порядок как в спецификации; шаги `item_clearance` (если `item_clearance_total` = 0), `y_reinstatement`/`z_reinstatement` (если `*_state` = `not_applicable`) не возвращаются.
  - `currentStepId(steps: PackStep[]): StepId | null` — первый шаг не `done`.
  - `packStageGroup(canonicalState: string): "waiting" | "active" | "done"`.

- [ ] **Step 1: Failing tests** `pack-steps.test.ts`: (a) строка из состояния `awaiting_rft` с `blockers.rft = { NDE_PENDING: 9, LINE_CHECK_PENDING: 10 }` даёт `readiness` = `blocked` с двумя причинами (`steps.reason.ndePending` с `count: 9`, `steps.reason.lineCheckPending` с `count: 10`), следующие шаги `blocked` с причиной `steps.wait.rft`; (b) `canonical_state = awaiting_y_reinstatement`: `currentStepId` = `y_reinstatement`, `testing` = `done`; (c) `item_clearance_total = 0` — шага `item_clearance` нет; (d) `z_state = not_applicable` — шага `z_reinstatement` нет; (e) `complete` — `currentStepId` = `null`; (f) `packStageGroup("awaiting_rft") === "waiting"`, `"complete" === "done"`, остальное `"active"`.
- [ ] **Step 2: Run** `node --import tsx --test modules/pressure-test/domain/pack-steps.test.ts` — FAIL (модуля нет).
- [ ] **Step 3: Implement** `buildPackSteps`, `currentStepId`, `packStageGroup` по сигнатурам выше. Соответствие `mapState`: `completed → done`, `ready → ready`, `ongoing → ongoing`, остальное кроме `not_applicable → blocked`; коды причин берутся из `blockers.<stage>` (массив кодов: `rft_pending`, `blinding_pending`, `testing_pending`, `y_reinstatement_pending`, `precommissioning_pending`) и `blockers.rft` (объект счётчиков: `NO_SPOOLS`, `WELD_OR_SUPPORT_PENDING`, `FLANGE_PENDING`, `NDE_PENDING`, `PWHT_PENDING`, `LINE_CHECK_PENDING`, `X_OPEN`); образец отображения — `stepsOf` в спайке.
- [ ] **Step 4: Run** тот же тест — PASS.
- [ ] **Step 5: Commit** `feat(testpack): pure model of the pack step timeline`.

### Task 2: Чтение списка пакетов с серверными состояниями

**Files:**
- Create: `modules/pressure-test/infrastructure/test-pack-rows.ts`
- Test: `modules/pressure-test/infrastructure/test-pack-rows.test.ts`

**Interfaces:**
- Consumes: `selectAllRows` из `@/lib/supabase/select-all-rows`, `listTestPackCatalog`.
- Produces: `listTestPackWorkflowRows(client, projectId): Promise<Record<string, WorkflowRow>>` (по `test_pack_id`, читает все строки, `order("test_pack_id")` + `range`).

- [ ] **Step 1: Failing test** с фейковым клиентом: отдаёт 2 страницы (1000 + 5 строк) — результат содержит 1005 ключей; ошибка клиента превращается в `Error` с сообщением сервера.
- [ ] **Step 2: Run** `node --import tsx --test modules/pressure-test/infrastructure/test-pack-rows.test.ts` — FAIL.
- [ ] **Step 3: Implement** `listTestPackWorkflowRows`; добавить его в тест `lib/supabase/project-wide-loaders.test.ts` как шестой загрузчик.
- [ ] **Step 4: Run** оба теста — PASS.
- [ ] **Step 5: Commit** `feat(testpack): read every pack's workflow row past the 1,000-row cap`.

### Task 3: Каркас экрана: список, шапка, шкала, закреплённый заголовок

**Files:**
- Create: `modules/pressure-test/ui/test-packs-screen.tsx`, `test-pack-list.tsx`, `test-pack-steps.tsx`
- Modify: `messages/en/testPack.json`, `messages/ru/testPack.json` (секции `screen`, `steps`: заголовки шагов, подписи сводок, причины `steps.reason.*`, ожидания `steps.wait.*`, чипы фильтров, «Пакет не найден», «Выберите пакет»)
- Test: `modules/pressure-test/ui/test-pack-steps.test.ts` (проверка исходников), существующие i18n-тесты

**Interfaces:**
- Consumes: `buildPackSteps`, `currentStepId`, `packStageGroup` (задача 1), `listTestPackWorkflowRows` (задача 2), `listTestPackCatalog`.
- Produces: `resolvePackSelection(packs: { id: string }[], requested: string | null): { kind: "selected"; id: string } | { kind: "not_found" } | { kind: "none" }` (экспорт из `test-packs-screen.tsx`; `none` — выбрать первый); `TestPacksScreen({ projectId: string; initialPack?: string | null; initialStep?: StepId | null })`; `StepCard({ step: PackStep; open: boolean; current: boolean; onToggle(): void; children })` — заголовок раскрытого шага `sticky` с `top` равным высоте шапки пакета (константа `PACK_HEADER_HEIGHT_PX = 76`), цвет: текущий — `bg-primary text-primary-foreground`, завершённый — зелёный токен; адрес хранит `?pack=<id>&step=<StepId>`.

- [ ] **Step 1: Failing test** `test-pack-steps.test.ts` читает `test-pack-steps.tsx` и проверяет: заголовок раскрытого шага имеет `sticky` и `top-[76px]`, шапка пакета — `sticky top-0` и `h-[76px]`, правая панель — `overflow-y-auto`, ни один предок панели не `overflow-hidden`; строки в файле только через `t(`; `resolvePackSelection([{ id: "a" }], "zzz")` даёт `not_found`, `(…, null)` даёт `none`, `(…, "a")` даёт `selected`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** экран по образцу спайка с ключами i18n; узкий режим (до 1023 px) — выбранный пакет открывает вторую страницу с кнопкой «назад» (состояние в `?pack=`); неизвестный `?pack=` показывает «Пакет не найден» и список; пакет без изометрик открывается на `composition`; чтения списка — `listTestPackCatalog` + `listTestPackWorkflowRows`, после действия шага — повторное чтение (`onRecorded`).
- [ ] **Step 4: Run** `npm run typecheck && node --import tsx --test modules/pressure-test/ui/test-pack-steps.test.ts i18n/messages.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(testpack): list and step timeline screen`.

### Task 4: Шаги «Состав» и «Готовность»

**Files:**
- Create: `modules/pressure-test/ui/steps/composition-step.tsx`, `readiness-step.tsx`
- Test: `modules/pressure-test/ui/steps/readiness-step.test.ts`

**Interfaces:**
- Consumes: `TestPackDefinitionEditor` и `TestPackCompositionEditor` (существующие, props `projectId`, `pack`, `canManage`, `dataCurrent`, `onComposed`), `listTestPackIsoStatus`, `listTestPackMembers`, `listTestPackSpoolStatus`, `PackStep.reasons`.
- Produces: `CompositionStep({ projectId, pack, canManage, onChanged })` (параметры + состав; «Новый пакет» открывает тот же редактор пустым через `createTestPack`); `ReadinessStep({ projectId, packId, step })` — причины блокировки словами и список изометрик с их причинами (`blocker_counts` изометрики), каждая со ссылкой на катушку `/fabrication?spool=` / `/erection?spool=` существующим `linkFrom`.

- [ ] **Step 1: Failing test** `readiness-step.test.ts`: функция `isoBlockerLines(blockerCounts)` возвращает для `{ NDE_PENDING: 2, X_OPEN: 0 }` одну строку с ключом `steps.reason.ndePending` и `count: 2`, нулевые счётчики пропускает.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `isoBlockerLines` (экспорт из `readiness-step.tsx`) и оба шага; редакторы переиспользуются как есть, у читателя и архивного пакета они уже read-only.
- [ ] **Step 4: Run** `node --import tsx --test modules/pressure-test/ui/steps/readiness-step.test.ts` и typecheck — PASS.
- [ ] **Step 5: Commit** `feat(testpack): composition and readiness steps`.

### Task 5: Шаги «Проверка линии», «Замечания X», «Заглушки»

**Files:**
- Create: `modules/pressure-test/ui/steps/line-check-step.tsx`, `blinding-step.tsx`
- Test: `modules/pressure-test/ui/steps/step-actions.test.ts`

**Interfaces:**
- Consumes: `assignLineCheck`, `recordLineCheckResult`, `assignItemClearance`, `recordPunchClearance`, `assignBlinding`, `recordBlinding` (репозиторий), `listLineCheckWorklist`, `listItemClearanceWorklist`, `listBlindingWorklist`, `listProjectTeams`, `listProjectPunchCodes`, `listPunchItems`, `listTestPackMembers`.
- Produces: `LineCheckStep`, `ItemClearanceStep` (в одном файле `line-check-step.tsx`), `BlindingStep` — каждый одна карточка: сверху выбор бригады и даты назначения с целями, ниже строки назначенных работ с полями результата и кнопкой записи; `canOperateWorkflow` отключает кнопки; чистые функции `canAssign(state)` и `blindingTargetIsWholePack()` не нужны — цель заглушек всегда весь пакет.

- [ ] **Step 1: Failing test** `step-actions.test.ts`: `lineCheckAssignable(rows, members)` возвращает ISO пакета без активного запроса; `punchDraftValid({ code: "", description: "x" })` возвращает `false` для замечания без кода; результат проверки линии без даты — недействителен.
- [ ] **Step 2: Run** `node --import tsx --test modules/pressure-test/ui/steps/step-actions.test.ts` — FAIL.
- [ ] **Step 3: Implement** модели (чистые функции в `step-actions.ts` рядом) и компоненты; идемпотентные ключи — `crypto.randomUUID()` на запрос, как в существующих экранах (`stageIdempotencyKey` для стадий).
- [ ] **Step 4: Run** тест + typecheck — PASS; браузерная проверка на UPG-1 (`TP-100-01`: проверка линии с замечанием X, закрытие, заглушки) — по `docs/acceptance/2026-10-09-e2e-walkthrough.md` недели 7.
- [ ] **Step 5: Commit** `feat(testpack): line check, item clearance and blinding steps`.

### Task 6: Шаги «Испытание», «Пусконаладка», «Обратная сборка Y и Z»

**Files:**
- Create: `modules/pressure-test/ui/steps/testing-step.tsx`, `reinstatement-step.tsx`
- Test: `modules/pressure-test/ui/steps/testing-actions.test.ts`

**Interfaces:**
- Consumes: `recordManagedPressureTestStage`, `assignReinstatement`, `recordReinstatement`, `listTestPackReinstatementTargets`, `listReinstatementWorklist`, `getTestPackWorkflowRow`/`available_operations`.
- Produces: `TestingStep` (кнопки «Начать», «Завершить» испытание и «Пусконаладка завершена» — доступна та, что есть в `available_operations`: `testing_start`, `testing_complete`, `precommissioning`; остальные не показываются); `ReinstatementStep({ category: "Y" | "Z" })` — цели только те, что разрешает сервер (`y_reinstatement` / `z_reinstatement` в `available_operations`), запись требует номер отчёта и номер метки (поля у строки, ошибка у поля, а не сверху страницы).

- [ ] **Step 1: Failing test** `testing-actions.test.ts`: `nextTestingAction(["testing_complete"])` = `"testing_complete"`; `nextTestingAction([])` = `null`; `reinstatementTargets(targets, ["y_reinstatement"])` оставляет только категорию Y; `reinstatementDraftErrors({ report: "", tag: "" })` даёт ошибки по двум полям.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** чистые функции и компоненты; формула порядка не дублируется — решает `available_operations`.
- [ ] **Step 4: Run** тест + typecheck — PASS; браузерная проверка `TP-200-01` до Y и `TP-100-01` до Z.
- [ ] **Step 5: Commit** `feat(testpack): testing, pre-commissioning and reinstatement steps`.

### Task 7: Перенос старых адресов, навигация, удаление старых экранов тест-пакетов

**Files:**
- Create: `modules/pressure-test/ui/legacy-address.ts`, `legacy-address.test.ts`
- Modify: `app/testpack/page.tsx`, `explorer/page.tsx`, `builder/page.tsx`, `pressure-test/**/page.tsx` (кроме `print/**`), `config/navigation.ts`, тесты навигации
- Delete: `test-pack-dashboard.tsx`, `test-pack-workbench.tsx`, `test-pack-explorer-screen.tsx`, `test-pack-workflow-panel.tsx`, `pressure-test-home-screen.tsx`, `request-preparation-screen.tsx`, `pressure-test-progress-screen.tsx`, `test-pack-readiness-panel.tsx`, `test-pack-workspace-*` (если больше не используются), удаление `listTestPackStages`, `listTestPackStageStates`, `listAvailableOperations`

**Interfaces:**
- Produces: `legacyAddressToTarget(pathname: string, search: URLSearchParams): { pack: string | null; step: StepId | null; mode: "assign" | "record" | null }`. Соответствие: `/testpack/builder` → шаг `composition`; `/testpack/pressure-test/line-check` (+`/preparation`, `/progress`) → `line_check`; `item-clearance` → `item_clearance`; `blinding` → `blinding`; `testing-precomm` → `testing`; `reinstatement` → `y_reinstatement`; `?operation=testing|precommissioning|y_reinstatement|z_reinstatement|line_check|item_clearance|blinding` → одноимённый шаг (`testing` → `testing`, `precommissioning` → `precommissioning`); `?view=definition|composition` → `composition`, `readiness` → `readiness`, `workflow` → первый незавершённый; `?testPackId=` → `pack`.

- [ ] **Step 1: Failing test** `legacy-address.test.ts` — все соответствия выше, плюс «неизвестный путь → всё `null`»; тест навигации: в `workspaceAreas` у «Test Packs» нет вкладок Dashboard/Builder/Explorer/Pressure Test, одна страница `/testpack`, алиасы `/testpack/builder`, `/testpack/explorer`, `/testpack/pressure-test` сохранены (иначе `config/navigation.test.ts` «must stay reachable» падает).
- [ ] **Step 2: Run** `node --import tsx --test modules/pressure-test/ui/legacy-address.test.ts config/navigation.test.ts` — FAIL.
- [ ] **Step 3: Implement** функцию; обновить страницы (каждая — `TestPacksScreen` с `legacyAddressToTarget(usePathname(), useSearchParams())`); изменить `config/navigation.ts` (одна страница с алиасами), поправить тесты `navigation-model.test.ts`, `workspace-model.test.ts` на новые заголовки хлебных крошек; удалить файлы из списка и мёртвые тесты; убрать три функции репозитория.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm run test:unit` — PASS.
- [ ] **Step 5: Commit** `refactor(testpack): one screen under /testpack, old addresses open it`.

### Task 8: NDE — модель, таблица, вкладки

**Files:**
- Create: `modules/quality/domain/nde-joint-state.ts` (+ `.test.ts`), `modules/quality/ui/nde-screen.tsx`, `modules/quality/ui/nde-tabs/joints.tsx`, `closed.tsx`
- Modify: `app/nde/page.tsx`, `app/nde/dashboard/page.tsx`, `messages/{en,ru}/nde.json`

**Interfaces:**
- Produces: `jointState(ob: NdeObligation): "waiting_batch" | "in_batch" | "waiting_result" | "done"`; `NDE_TABS = ["joints", "waiting_result", "waiting_batch", "closed", "summary"] as const`, `ndeTab(value: string | null): NdeTab` (по умолчанию `joints`); `NdeScreen({ projectId })` с вкладками и адресом `?tab=`; `/nde/dashboard` открывает `?tab=summary`; фильтр `?spool=` (рабочий контекст катушки) сохраняется на вкладке «Стыки».

- [ ] **Step 1: Failing test** `nde-joint-state.test.ts`: `pending` без партии → `waiting_batch`; `pending` с партией → `in_batch`; `issued` → `waiting_result`; `satisfied` → `done`; `ndeTab("zzz") === "joints"`.
- [ ] **Step 2: Run** `node --import tsx --test modules/quality/domain/nde-joint-state.test.ts` — FAIL.
- [ ] **Step 3: Implement** модель и экран; таблица — `DataTable` с колонками из спайка (стык, катушка, партия, метод, состояние, статус стыка словами, объём), поиск по стыку, катушке, партии; чтение — `loadNdeObligations` (уже целиком); строки интерфейса в `nde.json` (en и ru), статус стыка словами — существующий `jointStatusText` из `nde-batch-screen.tsx` переезжает в `nde-joint-state.ts`.
- [ ] **Step 4: Run** `npm run typecheck && npm run test:unit` — PASS.
- [ ] **Step 5: Commit** `feat(nde): tabbed screen with the table of every joint`.

### Task 9: NDE — результаты, партии, сводка; удаление черновиков и старого экрана

**Files:**
- Create: `modules/quality/application/accept-nde-results.ts` (+ `.test.ts`), `modules/quality/ui/nde-tabs/waiting-result.tsx`, `waiting-batch.tsx`, `summary.tsx`
- Modify: `modules/quality/ui/nde-dashboard-screen.tsx` (компактные показатели)
- Delete: `modules/quality/ui/nde-batch-screen.tsx`, `modules/pressure-test/ui/spike-test-packs-next.tsx`, `modules/quality/ui/spike-nde-next.tsx`, `app/testpack/next/`, `app/nde/next/`

**Interfaces:**
- Consumes: `recordNdeResult(client, obligationId, outcome, examinedOn, reportNumber, defectReworkCodeId, responsibleWelderQualificationId, idempotencyKey)`, `createNdeBatch`, `allocateNdeBatchCandidates`, `issueNdeBatch`, `closeNdeBatch`, `loadQualityReferentials`, `loadJointWelderIds`.
- Produces: `rejectDraftValid(draft: { defectCodeId: string; welderId: string }, jointWelderIds: string[]): boolean` (там же); `acceptNdeResults(client, obligationIds: string[], examinedOn: string, reportNumber: string | null): Promise<{ accepted: string[]; failed: { id: string; message: string }[] }>` — идёт по стыкам по одному (ключ идемпотентности `nde-accept-<id>`), не останавливается на первой ошибке, номер заключения для нескольких стыков — `<номер>-<порядковый>`.

- [ ] **Step 1: Failing test** `accept-nde-results.test.ts`: `rejectDraftValid({ defectCodeId: "", welderId: "" }, [])` — `false`, а `rejectDraftValid({ defectCodeId: "c", welderId: "w9" }, ["w1"])` — `false` (сварщик не с этого стыка); из трёх стыков второй отклонён фейковым клиентом — результат `accepted` = два id, `failed` = один с сообщением; пустой список не вызывает клиента; номер `R1` даёт `R1-1`, `R1-2`.
- [ ] **Step 2: Run** `node --import tsx --test modules/quality/application/accept-nde-results.test.ts` — FAIL.
- [ ] **Step 3: Implement** `acceptNdeResults`; вкладка «Ждут результата» — выданные партии, раскрытая партия с закреплённым заголовком, дата и номер заключения, «Отметить все», «Принять отмеченные (N)» (принятые снимаются с отметки, ошибочные перечислены), «Закрыть партию» при отсутствии ожидающих, брак на месте (кнопка недоступна без кода дефекта; сварщики — только с этого стыка через `loadJointWelderIds`); «Ждут партию» — группы по методу и режиму, «Создать партию» (создать, разместить, выдать; процент по умолчанию 10 для выборки и 100 для обязательного контроля, меняется в форме) и выдача черновиков; «Сводка» — показатели строкой плюс график; удалить черновики и старый экран.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm run test:unit` и `bash tasks/material-check/pgtap.sh check` — PASS.
- [ ] **Step 5: Commit** `feat(nde): results, batches and summary; remove the spikes and the old NDE screen`.

### Task 10: Проверка в браузере и статус

**Files:**
- Modify: `docs/audits/2026-10-14-project-review-and-roadmap.md` (статус фазы 3), `docs/acceptance/2026-10-09-e2e-walkthrough.md` (замечание о новом экране)
- Test: браузерный сценарий (Playwright `channel: "chrome"`, вход через `.env.local`, без вывода пароля)

- [ ] **Step 1: Сценарий** на UPG-1 при окне 1366×700: пакет `TP-300-01` (шаги серые с причинами), `TP-200-01` (шаг Y раскрыт, заголовок виден при прокрутке), NDE: поиск `3001`, массовое принятие, брак с кодом, создание партии; скриншоты в `docs/acceptance/e2e/`.
- [ ] **Step 2: Проверка узкого окна** 900 px и глубоких ссылок: `/testpack/explorer?testPackId=<id>&view=workflow`, `/testpack/pressure-test/blinding/progress`, `/nde?spool=<id>`, `/nde/dashboard`.
- [ ] **Step 3: Нагрузка** — проект на 480 ISO (`npm run demo:time-import -- --copies 12 --per-job 12` и пакеты), экран пакетов открывается быстрее 1 с; `PERF-1` потом удалить по описанию в `docs/acceptance/2026-10-17-import-timings.md`.
- [ ] **Step 4: Обновить** статус фазы 3 в роадмапе (что сделано, что осталось: правило Spot, выбор стыка в выборке, печать заявок).
- [ ] **Step 5: Commit** `docs: Test Packs and NDE redesign — status and walkthrough notes`.
