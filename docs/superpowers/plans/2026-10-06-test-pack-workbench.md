# Test Packs: связанный workbench и сохранение выбранного пакета — Implementation Plan

> **Для исполняющего агента agy:** выполняй последовательно, отмечая checkbox-пункты только по факту; используй `executing-plans`, если навык доступен. Пользователь передаёт этот план другому агенту. Самостоятельная делегация, Git-операции и публикация не входят в поручение. Перед реализацией повторно прочитай исходники: если часть задачи уже выполнена, проверь её контракт и сохрани результат, не реализуй второй раз.

**Goal:** Выбранный Test Pack остаётся одним объектом в URL, шапке, составе, readiness и всех операциях; основной workbench позволяет пройти существующий процесс без повторного выбора и потери ввода.

**Architecture:** `/testpack/explorer` — полноширинный список с overlay пакета и четырьмя областями. Общие editors/operations работают как embedded и standalone; существующие repository/application/RPC остаются источником правил и команд. Project/pack-scoped snapshot и generation ownership защищают загрузки, один lock защищает запись.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, DataTable, RecordSelectTable, Supabase JS, node:test через tsx, Playwright для приёмки.

---

## 0. Поручение и ограничения

Каталог: `/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout`.

- [ ] Прочитать `AGENTS.md` и `docs/superpowers/specs/2026-10-06-test-pack-workbench-design.md`.
- [ ] Сверить перечисленные ниже исходники; старый roadmap не использовать как status checklist.

**Разрешено:** UI Test Packs, адресация/ownership, выделение общих UI editors, дополнительные read-only selectors уже существующих tables/views, совместимое выделение нейтрального drawer, узкая интеграция существующего unsaved guard.

**Не входит:** SQL/RLS/grants/RPC migrations; изменение доменных правил и формул RFT; NDE/Tracking/Flanges redesign; handover, audit history, новые reports, offline/PWA; глобальная серверная пагинация; новый router/state framework или UI-библиотека.

Не выполнять Git-команды, worktree, commit, push, PR, deploy. Не откатывать чужие изменения. Не менять локальную или hosted БД ради UI-приёмки: не запускать `demo:prepare`, `demo:showcase`, bootstrap и SQL writes. Credentials читаются существующими npm/tsx средствами из `.env.local`; не экспортировать, не подставлять inline, не печатать. При отсутствующем обязательном секрете остановить зависимую проверку и сообщить о missing value без его значения.

План даёт локальную реализацию Test Packs, а не статус production-ready. Браузерные mock-команды не являются DB acceptance.

## 1. Проверенное исходное состояние и источники

На момент составления прочитаны:

| Источник | Что использовать |
|---|---|
| `modules/pressure-test/ui/test-pack-explorer-screen.tsx` | Семь локальных вкладок; потеря ID в переходах; `spools[0]`; текущие cross-module links |
| `modules/pressure-test/ui/test-pack-builder-screen.tsx` и `test-pack-builder-parts.tsx` | Уже есть metadata/composition, подтверждения Move/Remove/Archive, referential selects, submitting |
| `modules/pressure-test/ui/request-preparation-screen.tsx` | Четыре типа assignment, targets, команды и Print request |
| `modules/pressure-test/ui/pressure-test-progress-screen.tsx` | Пять семейств результатов; текущие drafts и shared Event date |
| `modules/pressure-test/ui/pressure-test-home-screen.tsx` | Ссылки передают query pack, но counts сейчас project-wide |
| `modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts` | Catalog/readiness/members/ISO/spools/worklists/ref selectors и RPC wrappers |
| `modules/pressure-test/application/manage-test-pack.ts`, `manage-line-check.ts`, `manage-pressure-test.ts` | Existing validation и команды |
| `modules/pressure-test/domain/pressure-test-workflow.ts`, `readiness.ts` | Existing domain helpers; не менять формулы |
| `lib/supabase/database.types.ts` | Фактические поля views/tables |
| `supabase/migrations/20260813091000_test_pack_core.sql` | Pressure unit из настройки проекта, отдельные create/compose; только читать |
| `supabase/migrations/20260813095000_pressure_test_workflow.sql`, `20260814101000_track10_browser_gate_fixes.sql` | Assignment, Y gate, stage commands; только читать вместе с последующими migrations этих функций |
| `components/pipeqc/work-context.tsx`, `workspace-model.ts`, `project-url.ts`, `project-url-sync.tsx` | URL authority, safe return, `p`, контекстные подписи |
| `components/pipeqc/unsaved-input-guard.tsx`, `app-shell.tsx` | Existing guard и placement providers |
| `modules/construction/ui/spool-drawer.tsx`, `spool-workbench.module.css` | Проверенный drawer behaviour; сохранить совместимость |

Не повторять закрытые задачи: Builder submitting, справочники Builder, NDE candidate preview. Новый файл `docs/superpowers/specs/2026-10-06-test-pack-workbench-result.md` будет **отчётом исполнения**, не заменой design spec.

## 2. Целевая поверхность и URL-контракт

Dashboard `/testpack` остаётся аналитическим входом. Release backlog ведёт в Explorer выбранного пакета. Dashboard counters/formulas не переписывать.

Explorer: DataTable всех видимых пакетов, поиск/фильтры/сортировка через existing table URL state (`namespace="tp"`), без автоматического выбора. Строка открывает overlay: desktop 70vw, Expand 100vw, mobile fullscreen. Таблица остаётся прежней ширины. Header содержит number, revision, lifecycle, RFT; facts — ISO count и подтверждённые blockers. Четыре области:

1. `definition` — metadata;
2. `composition` — ISO membership;
3. `readiness` — server verdict, ISO/spool breakdown и resolution actions;
4. `workflow` — подготовительные работы и существующий процесс испытаний.

Все области можно просматривать; право записи и gates определяются отдельно. Default для выбранного пакета без `view` — Readiness. Без `testPackId` drawer закрыт. `new=1` применяется только в Builder для явного create mode; при конфликте валидный `testPackId` имеет приоритет.

| Query | Значение |
|---|---|
| `p` | Код проекта через existing ProjectUrlSync/withProject |
| `testPackId` | ID пакета, проверенный в активном project |
| `view` | definition/composition/readiness/workflow |
| `operation` | line_check/item_clearance/blinding/testing/y_reinstatement/precommissioning/z_reinstatement |
| `mode` | preparation/progress; для testing/precommissioning только progress |
| `spool` | Конкретный spool revision из `test_pack_spool_status` этого пакета |
| `from` | safe in-app return path |

Примеры адресов (ID здесь описательные, не реальные fixtures):

```text
/testpack/explorer?p=SHOWCASE-1&testPackId=<pack-id>&view=readiness
/testpack/explorer?p=SHOWCASE-1&testPackId=<pack-id>&view=workflow&operation=line_check&mode=preparation
/testpack/builder?p=SHOWCASE-1&testPackId=<pack-id>&view=composition
/testpack/pressure-test/testing-precomm/progress?p=SHOWCASE-1&testPackId=<pack-id>&operation=precommissioning
```

Существующие routes сохранить. Для legacy pressure routes операция берётся из route, а `operation` допускает уточнение testing/precommissioning и Y/Z. На shared `testing-precomm` default testing; на shared reinstatement без уточнения показывать оба набора Y/Z с явными категориями. Ошибочный operation не разрешает запись другой команды. Clean reload/Back/Forward восстанавливают объект и область.

## 3. Карта файлов

**Создать:**

- `components/ui/record-drawer.tsx`, `record-drawer.module.css` — нейтральная геометрия;
- `modules/pressure-test/ui/test-pack-workbench.tsx`, `test-pack-workbench.module.css` — list/overlay и композиция;
- `modules/pressure-test/ui/test-pack-workspace-model.ts`, `.test.ts` — URL, selection, draft keys;
- `modules/pressure-test/ui/test-pack-workspace-context.tsx` — scoped snapshot и command context;
- `modules/pressure-test/ui/use-test-pack-workspace.ts` — ownership, reads/refresh;
- `modules/pressure-test/ui/test-pack-definition-editor.tsx`, `test-pack-composition-editor.tsx` — existing формы без второго picker;
- `modules/pressure-test/ui/test-pack-readiness-panel.tsx`, `test-pack-workflow-panel.tsx` — facts, resolution и process;
- `modules/pressure-test/ui/test-pack-workflow-model.ts`, `.test.ts` — presentation facts и применимость Y/Z;
- `modules/pressure-test/ui/test-pack-workspace-loader.ts`, `.test.ts` — загрузка выбранного пакета через testable repository contract;
- `scripts/verify-test-pack-workbench.ts` — проверка с настоящими assertions, без DB writes;
- `docs/superpowers/specs/2026-10-06-test-pack-workbench-result.md` — фактический итог.

**Изменить по задачам ниже:** Explorer, Builder, Preparation, Progress, PressureTestHome, links Dashboard, repository + его test, builder/reference models + tests, route pages Builder/Explorer, `config/navigation.ts` + test, `components/pipeqc/{app-shell,work-context,unsaved-input-guard}.tsx`, `modules/construction/ui/spool-drawer.tsx` и только необходимую часть CSS.

Не превращать два редактора в независимые копии Builder. Presentation units получают один authoritative snapshot; повторное получение тех же данных ради второй шапки не требуется.

## 4. Задача 1 — URL, selection и независимый draft target

**Файлы:** новый `test-pack-workspace-model.ts`/test; navigation/test; Builder/Explorer routes; `test-pack-screen-model.ts`/test.

- [ ] Добавить чистые контракты. Базовая реализация:

```ts
import { safeReturnPath } from "@/components/pipeqc/workspace-model"
import { withProject } from "@/components/pipeqc/project-url"
import type { TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"

export const TEST_PACK_VIEWS = ["definition", "composition", "readiness", "workflow"] as const
export type TestPackView = (typeof TEST_PACK_VIEWS)[number]
export const TEST_PACK_OPERATIONS = ["line_check", "item_clearance", "blinding", "testing", "y_reinstatement", "precommissioning", "z_reinstatement"] as const
export type TestPackOperation = (typeof TEST_PACK_OPERATIONS)[number]
export type TestPackMode = "preparation" | "progress"

export function testPackView(value: string | null): TestPackView {
  return TEST_PACK_VIEWS.find((item) => item === value) ?? "readiness"
}
export function selectTestPackRow(
  rows: readonly TestPackCatalogRow[], projectId: string, id: string | null,
): TestPackCatalogRow | null {
  return id ? rows.find((row) => row.id === id && row.projectId === projectId) ?? null : null
}
export function targetDraftKey(requestId: string, targetId: string): string {
  return JSON.stringify([requestId, targetId])
}
export interface TestPackLinkInput {
  href: string
  projectCode?: string | null
  testPackId?: string | null
  view?: TestPackView
  operation?: TestPackOperation
  mode?: TestPackMode
  spoolRevisionId?: string | null
  from?: string | null
}
export function buildTestPackHref(input: TestPackLinkInput): string {
  const [path, query = ""] = input.href.split("?")
  const params = new URLSearchParams(query)
  for (const name of ["testPackId", "view", "operation", "mode", "spool", "from", "new"]) params.delete(name)
  if (input.testPackId) params.set("testPackId", input.testPackId)
  if (input.view) params.set("view", input.view)
  if (input.operation) params.set("operation", input.operation)
  if (input.mode) params.set("mode", input.mode)
  if (input.spoolRevisionId) params.set("spool", input.spoolRevisionId)
  const from = safeReturnPath(input.from)
  if (from) params.set("from", from)
  const search = params.toString()
  return withProject(search ? `${path}?${search}` : path, input.projectCode)
}
```

`buildTestPackHref` не копирует фильтры исходной страницы в чужой route. Для смены области на **той же** странице использовать `useWorkContextParam("testPack")` с extra; он сохраняет table state. Возврат передаёт полный внутренний URL исходной страницы через safe `from`.

- [ ] Добавить unit cases: no ID → null; чужой project → null; unknown view → readiness; два ISO одной заявки имеют разные keys; ссылке переданы p/pack/op; unsafe from отвергнут; view сменён без потери table query.

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { buildTestPackHref, selectTestPackRow, targetDraftKey, testPackView } from "./test-pack-workspace-model"
test("selection never substitutes the first or a foreign pack", () => {
  const rows = [{ id: "a", projectId: "p1", testPackNumber: "TP-A", revisionNo: 0, lifecycle: "active", activeIsoCount: 2 }]
  assert.equal(selectTestPackRow(rows, "p1", null), null)
  assert.equal(selectTestPackRow(rows, "p2", "a"), null)
  assert.equal(selectTestPackRow(rows, "p1", "missing"), null)
  assert.equal(selectTestPackRow(rows, "p1", "a")?.id, "a")
})
test("links retain project and reject external return paths", () => {
  const href = buildTestPackHref({ href: "/testpack/builder", projectCode: "P A", testPackId: "id/1", view: "composition", from: "//evil.test" })
  const url = new URL(href, "http://pipeqc.local")
  assert.equal(url.searchParams.get("p"), "P A")
  assert.equal(url.searchParams.get("testPackId"), "id/1")
  assert.equal(url.searchParams.get("view"), "composition")
  assert.equal(url.searchParams.has("from"), false)
  assert.equal(testPackView("obsolete"), "readiness")
})
test("one request cannot share drafts between different ISO targets", () => {
  assert.notEqual(targetDraftKey("req", "iso1"), targetDraftKey("req", "iso2"))
})
```

- [ ] Builder page читает `testPackId`, `view`, `new`; screen принимает query ID как controlled selection, без второго локального authority. Picker изменяет query через guard. Preparation синхронизируется с query при **каждом** изменении, не `current || queryPackId`.
- [ ] Добавить Builder `context: TEST_PACK` в navigation **после** реализации чтения. Explorer и Pressure Test уже context-aware в registry; сохранить.
- [ ] Убрать из `test-pack-screen-model.test.ts` требование ровно семи вкладок. Вместо него проверять четыре целевые области и сохранение доступности Definition/Composition/Readiness/Workflow. Сохранить unrelated filtering/permission tests.

Run: `node --import tsx --test modules/pressure-test/ui/test-pack-workspace-model.test.ts modules/pressure-test/ui/test-pack-screen-model.test.ts config/navigation.test.ts`. Ожидание: exit 0; до изменения контрактов новый тест должен выявлять соответствующую ошибку.

## 5. Задача 2 — scoped reads и ownership загрузок

**Файлы:** repository/test; новый loader/test, hook/context.

- [ ] Не определять доступность URL-пакета только через ограниченный list query. Добавить direct lookup по `project_id` + `id` и direct readiness по `project_id` + `test_pack_id`:

```ts
export async function getTestPackCatalogRow(client: Client, projectId: string, id: string): Promise<TestPackCatalogRow | null> {
  const { data, error } = await client.from("test_pack_catalog").select(TEST_PACK_SELECT)
    .eq("project_id", projectId).eq("id", id).maybeSingle()
  fail(error)
  return data ? toCatalog(data) : null
}
export async function getTestPackReadinessRow(client: Client, projectId: string, id: string): Promise<TestPackReadinessRow | null> {
  const { data, error } = await client.from("test_pack_readiness").select(READINESS_SELECT)
    .eq("project_id", projectId).eq("test_pack_id", id).maybeSingle()
  fail(error)
  return data ? toReadiness(data) : null
}
```

- [ ] В loader определить `TestPackWorkspaceSnapshot`: pack, readiness (nullable), members, ISO status, spools, scoped worklists, reference labels, pressureUnit. Вход — projectId и packId; отсутствие pack возвращает unavailable, error не превращается в пустой snapshot. Сначала проверить direct pack, потом загружать его detail. Нет ID → нет detail reads.
- [ ] Все list worklists в выбранном пакете вызываются с `testPackId`; worklists project-wide допустимы только на standalone странице без выбора, явно обозначенной как project worklist. Members/current targets фильтруются по действующему server read contract, не по предположению из заголовка.
- [ ] Hook использует `createRequestVersion` и ownership `{projectId, packId}`. Каждый refresh начинает token, публикует только current result; cleanup вызывает invalidate. Не сохранять error/loading из прошлого запроса.

```ts
const token = version.start()
const next = await loadSelectedPack(projectId, packId)
if (!token.isCurrent()) return
// Публикуется snapshot с этими projectId/packId; consumer также проверяет owner.
```

`loadSelectedPack` — adapter к loader из этой задачи. Не ограничиваться этим check вокруг `setLoading`: **все** setters данных и ошибок должны находиться за token. Builder refresh/loadReferences тоже не могут записывать данные самостоятельно после ухода владельца.

- [ ] Context API включает `snapshot`, `loading`, `error`, `dataCurrent`, `refresh(): Promise<void>`, commands. На initial error — Retry; на refresh error — последние подтверждённые факты с пометкой stale, записи disabled. Retry не меняет URL.
- [ ] При смене project/pack синхронно не рендерить старый snapshot; сбросить выбранные targets, dialogs и drafts после разрешённого guard перехода. Не сбрасывать draft при обычном background refresh того же владельца.
- [ ] Loader unit tests через fake repository: чужой ID; pack отсутствует при непустом общем каталоге; пакет вне первой страницы; отказ detail read не становится readiness=true. Existing `lib/request-version.test.ts` проверяет primitive; browser delayed responses проверят hook wiring.

Run: `node --import tsx --test modules/pressure-test/ui/test-pack-workspace-loader.test.ts modules/pressure-test/infrastructure/supabase-pressure-test-repository.test.ts lib/request-version.test.ts`.

## 6. Задача 3 — нейтральный drawer без регрессии спулов

**Файлы:** RecordDrawer/CSS; SpoolDrawer/CSS; новый workbench/CSS.

- [ ] Выделить из SpoolDrawer только overlay/focus/scroll/expand. Контракт:

```ts
export interface RecordDrawerProps {
  kicker: string
  title: string
  meta: string
  status?: React.ReactNode
  returnLabel: string
  closeLabel: string
  recordKind: "spool" | "test-pack"
  onClose: () => void
  children: React.ReactNode
}
```

RecordDrawer устанавливает `data-record-drawer`, для spool также `data-spool-drawer`, для пакета `data-test-pack-drawer`. SpoolDrawer остаётся wrapper с прежним публичным signature, returnLabel `Spools`, closeLabel `Close spool ${title}`. Сохранить `data-expanded`, scroll lock, focus restoration, Escape/backdrop и nested dialog scope. Не переносить SpoolTimeline в нейтральный компонент.

- [ ] Нейтральный CSS содержит geometry и generic header/body. Скопировать нужные переменные из `.split` в нейтральную область/tokens с прежними значениями для spool; иначе компонент потеряет inherited CSS после extraction. Не менять общую палитру. Пакетные view/process styles остаются в pressure-test CSS.
- [ ] Workbench всегда монтирует list; drawer не изменяет grid columns списка. Контракт использования:

```tsx
<RecordDrawer
  kicker="Test Pack" title={pack.testPackNumber}
  meta={`rev ${pack.revisionNo} · ${pack.activeIsoCount} ISO`}
  returnLabel="Test Packs" closeLabel={`Close Test Pack ${pack.testPackNumber}`}
  recordKind="test-pack" onClose={close}
>
  {children}
</RecordDrawer>
```

В workbench `pack` — подтверждённый current-owner snapshot; `close` — `requestLeave` + clear selected query; `children` — view navigation + выбранная область. Держать drawer внутри `main-content`; portal с полями вне main сломает existing guard tracking.

- [ ] Explorer route использует новый workbench. Default view Readiness, заголовок/facts/nav постоянные, операция скроллится отдельно. Overview `/testpack` сохраняется.
- [ ] Header не показывает готовность при отсутствии readiness snapshot; показать `Readiness unavailable` и Retry. Archived виден до формы.

Проверка этой задачи — typecheck и browser width/focus после всех задач. Unit source-regex не считать доказательством геометрии.

## 7. Задача 4 — общие Definition и Composition editors

**Файлы:** Builder, новые editors, builder-parts, builder/reference models/tests, repository/test.

- [ ] Вынести существующие формы и таблицы, оставив один use-case путь. Editors получают `projectId`, `pack`, authoritative snapshot/refresh и commands из scoped context. Builder — standalone host со списком/explicit create; workbench — embedded host без второго picker/header.
- [ ] В workbench Definition редактирует существующий pack, Composition показывает те же Add/Move/Remove. Сохранить confirmations и server отказ после workflow evidence. Reader/archived/stale отключают mutations с понятной причиной.
- [ ] `TestPackCatalogRow` получает `pressureUnit?: Database["public"]["Enums"]["pressure_unit"]`; `toCatalog` передаёт `row.pressure_unit ?? undefined`. Для existing пакета отображать именно сохранённую unit, без conversion. Для create прочитать `project_pressure_units` scoped `.eq("project_id", projectId).maybeSingle()`. Missing unit — `Pressure unit is not configured`, никаких guessed bar. Hardcoded bar в `TEST_PACK_FIELDS` заменить динамической подписью в editor.
- [ ] Reference display использует existing project-scoped loaders и code/description. Не показывать UUID как нормальную подпись. Неактивная/недоступная ссылка — `Reference unavailable`; её ID остаётся внутренним, не подменять другим option.
- [ ] Create success фиксирует createdId до compose в project-owned `CompositionAttempt`. До завершения всей попытки create/compose lock и drafts остаются в том же host: не переводить URL так, чтобы посреди команды remount сбросил lock. После успеха или частичного отказа безопасно перечитать createdId, завершить pending и записать createdId в URL. Refresh читает createdId, а не старый `selected=null`. Если refresh отказал, ID всё равно сохраняется, но факт состава помечен stale и повторный compose до Retry read запрещён. Existing create RPC возвращает только пакет, compose выполняется отдельно.
- [ ] Удалить утверждение `composed atomically`. Для create/add нескольких ISO использовать подтверждённые results; при частичном отказе UI показывает созданный pack, добавленные ISO и оставшиеся IDs по business number. Retry добавляет только ещё отсутствующие ISO, не создаёт пакет заново. Не имитировать rollback/transaction.
- [ ] Metadata Save, Add, Move, Remove, Archive имеют общий pending lock; success не стирает несохранённый ввод другой области. После Move перечитать источник и destination catalog revision; если destination сейчас не открыт — достаточно scoped catalog refresh.

Представление partial result должно быть явным:

```ts
export interface CompositionAttempt {
  testPackId: string
  confirmedIsoIds: string[]
  remainingIsoIds: string[]
  failure: string | null
}
```

Этот UI result не меняет серверный контракт. Отдельный отказ refresh после подтверждённого compose не означает, что ISO не добавлен: сначала безопасное перечитывание, затем определение remaining; до него Retry write disabled.

- [ ] Сохранить/адаптировать meaningful existing tests (labels, references, submitting, commands). При переносе формы test читает editor тоже; не удалять assertions из-за нового filename. Добавить mapping test pressure_unit psi и unit missing; partial-create/compose UI подтвердить mock browser.

Run: `node --import tsx --test modules/pressure-test/ui/test-pack-builder-screen.test.ts modules/pressure-test/ui/test-pack-reference-model.test.ts modules/pressure-test/infrastructure/supabase-pressure-test-repository.test.ts modules/pressure-test/application/manage-test-pack.test.ts`.

## 8. Задача 5 — Readiness и переход к конкретному blocker

**Файлы:** новый readiness panel, workspace model, Explorer, links Dashboard.

- [ ] Использовать server `is_rft`, counts и ISO `blocker_counts`. Не вызывать локальную derive-функцию как замену server verdict. Отдельно показывать no members, missing current revision/no spools, weld/support, flange, NDE, PWHT, Line Check, X. Если server false при нулевых доступных counts — `Readiness could not be explained from these facts` + refresh, не Ready.
- [ ] ISO table показывает business ISO number из members/number mapping. Spool table требует явного выбранного `spool_revision_id`, без `spools[0]`. Query `spool` проверяется внутри scoped `test_pack_spool_status`; чужой spool не открывает detail/command. Spool readiness неизвестен при null, не false/true по умолчанию.
- [ ] Resolution table:

| Blocker | Action |
|---|---|
| Line Check | Workflow → line_check, preparation/progress по реальным assignments |
| X open | Workflow → item_clearance |
| Weld/support | Для явно выбранного спула — `/erection?...&spool=<revision>`; без спула раскрыть список |
| NDE | `/nde` с проверенным spool и safe from |
| PWHT | Existing `/fabrication/qc-release` с проверенным spool и safe from |
| Flange | Existing operate `/erection/flange-progress`, только при доступной capability; не обещать flange selection, пока получатель его не поддерживает |
| Missing engineering/current revision | Existing Spooling/Engineering вход с safe return; не добавлять неподдерживаемый ISO query |

Перед переходом использовать existing capability/navigation helpers. Нет доступа — видимое объяснение вместо кнопки заведомого отказа. Не изменять recipient modules ради этих links.

- [ ] `from` хранит полный URL пакета и его view/filter. Возврат из NDE/QC показывает тот же pack и перечитывает readiness; refresh при возврате не стирает draft. Raw UUID не превращать в input оператора.
- [ ] Dashboard backlog links передают project code/packId через helper. Stage summary остаётся project-wide и явно отделён от выбранного пакета.

## 9. Задача 6 — существующий workflow в контексте пакета

**Файлы:** новый workflow model/test/panel; repository/test; Preparation, Progress, Home.

- [ ] Выделить внутри выбранного пакета подготовительные Line Check / Item Clearance, затем реальный process: RFT → Blinding → Testing → Y → Pre-commissioning → Z. Не называть Definition/Composition стадиями. RFT read-only, assignment/result/print — разные действия.
- [ ] Worklist facts ограничены packId. PressureTestHome с queryPackId фильтрует и counts, и links; без него остаётся project overview. Load failures показывать, не `.catch(() => undefined)` с нулями как успешный result.
- [ ] Не выводить eligibility Y/Z только из `reinstatement_worklist`: unassigned required flange там отсутствует. Добавить read-only загрузку current member flanges и effective records. Current targets: `revision_status === "accepted"`, `is_removed === false`, `requires_reinstatement === true`, ISO в active members, категория Y/Z. Если любое обязательное поле unknown — состояние Unknown, не N/A.
- [ ] Existing `listFlangeJointReadiness` содержит `void projectId`, а `flange_joint_readiness` не имеет поля `project_id`. Не добавлять туда несуществующий `.eq("project_id", ...)`. Новый selector `listTestPackReinstatementTargets(client, projectId, testPackId)` сначала читает complete active members через project/pack, затем запрашивает view с `.in("isometric_id", memberIsoIds)`, current-revision filters и stable order `flange_joint_revision_id`. Разбивать большой набор memberIsoIds на ограниченные chunks, а результаты каждого chunk читать полностью. Empty members → empty targets без общего project-wide запроса. Сохранить RLS; принадлежность проекту доказана scoped members. Preparation использует этот же selector, не старый общий список. Unit selector test проверяет upstream project/pack и downstream ISO filters.
- [ ] Effective records читаются из существующей `flange_reinstatement_records`, scoped project + `.in("flange_joint_revision_id", targetIds).is("superseded_at", null)`; empty targetIds → empty result без запроса. Types брать из generated Database; SQL/RLS не менять. При отсутствии read permission блокировать соответствующие presentation facts, не обходить через service role.
- [ ] Даты testing/precomm берутся из `testing_precomm_worklist`; blinding assignment/completion — из неотменённых `blinding_worklist`; Y/Z completion — effective records текущих required targets. Использовать `summarizeWorkflow`/`derivePressureTestState` только с **полным** подтверждённым набором facts. Empty worklist сам по себе не доказывает отсутствие required targets.
- [ ] Для Y/Z stage state `not_applicable` допустим только после успешного полного чтения targets с нулём нужной категории. В остальных состояниях — recorded/ready/ongoing/blocked/unknown. Новый model выражает presentation, не меняет каноническую формулу.
- [ ] Tests model: Y отсутствует vs Y read failed; unassigned Y не считается complete; required Z после precomm; superseded record не закрывает target; несколько required targets, часть completed; archived/stale/view-only запрещают UI writes.

Практический фильтр targets (после успешной scoped загрузки):

```ts
const memberIsoIds = new Set(members.filter((item) => item.removed_at === null).map((item) => item.isometric_id))
const currentTargets = flanges.filter((item) =>
  memberIsoIds.has(item.isometric_id) && item.revision_status === "accepted" &&
  item.is_removed === false && item.requires_reinstatement === true &&
  (item.category_code === "Y" || item.category_code === "Z"),
)
```

Null fields проверять до фильтра: иначе отсутствие данных будет ошибочно выглядеть N/A. Read selectors должны возвращать достаточно данных для проверки полноты; лимитированный/неполный target list не даёт Complete. Для **выбранного пакета** все reads, из которых доказывается N/A/Complete, выполнять постранично с exact count и стабильным unique order (members, flange targets и effective records); это scoped read correctness, а не глобальная пагинация UI каталогов. Пример сборщика в loader:

```ts
export interface ScopedPage<T> { rows: readonly T[]; total: number }
export async function readCompleteScopedRows<T>(
  loadPage: (from: number, to: number) => Promise<ScopedPage<T>>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("Page size must be positive.")
  const rows: T[] = []
  let expected: number | null = null
  for (let offset = 0; ; offset += pageSize) {
    const page = await loadPage(offset, offset + pageSize - 1)
    if (expected !== null && expected !== page.total) throw new Error("Worklist changed while loading; retry refresh.")
    expected = page.total
    rows.push(...page.rows)
    if (rows.length === expected) return rows
    if (rows.length > expected || page.rows.length !== pageSize) throw new Error("Worklist is incomplete; retry refresh.")
  }
}
```

Adapter `loadPage` использует существующий scoped select `{ count: "exact" }`, `.range(from, to)`, `.order` по уникальному ID; конкретные поля scope берутся из настоящей view, как описано выше для flange targets. Если count недоступен, честный Unknown + Retry вместо fabricated completeness. Unit cases сборщика: 0 rows, 1001 rows за несколько страниц, изменившийся count, silent API cap, invalid page size. Detail panel не объявляется готовым к произвольному project scale только из этого теста.

Run: `node --import tsx --test modules/pressure-test/ui/test-pack-workflow-model.test.ts modules/pressure-test/ui/pressure-test-ui-model.test.ts modules/pressure-test/domain/pressure-test-workflow.test.ts modules/pressure-test/infrastructure/supabase-pressure-test-repository.test.ts`.

## 10. Задача 7 — embedded/standalone операции и безопасные команды

**Файлы:** Preparation, Progress, workspace context; existing application wrappers читать/переиспользовать.

- [ ] Разделить route wrappers и контент операции. Embedded props/context фиксируют project/pack, скрывают второй Test Pack picker и повторный page header. Standalone может выбирать пакет, но selection записывается в URL и валидируется. Данные/команды не дублируются отдельным новым компонентом.
- [ ] Existing Prep props дополнить optional `embedded`, `testPackId`, `onRecorded`; Progress аналогично плюс `operation`. URL query — fallback только в standalone. В embedded controlled ID имеет единственный приоритет; если prop и URL не совпали, host исправляет URL, command disabled до согласования.
- [ ] В Preparation отображать лишь targets текущего пакета. Reinstatement preparation team type остаётся `reinstatement`; result jointer team type остаётся `jointer`. Y/Z UI разделение не меняет эти контракты. Явно выбрать team, не автоматически подставлять первую при смене проекта.
- [ ] Shared Date переносится к выполняемой операции/выбранному target. Line Check draft использовать `targetDraftKey(requestId, isoId)` во всех readers/writers; reinstatement — `targetDraftKey(requestId, flangeRevisionId)`. Не переносить один черновик между targets одной заявки.
- [ ] Не переиспользовать `punchCodeId` как reportNumber и `description` как tagNumber: раздельные typed drafts. Убрать `REPORT-T10`/`TAG-T10` fallback; поля Report number/Tag number вводятся явно, server validation сохраняется.
- [ ] Stage action выбирается из выбранного operation и подтверждённых facts; precommissioning не подставляет `ready_for_precommissioning` только потому, что testing date существует. При открытом Y объяснить блокировку и дать переход; сервер остаётся окончательным gate.
- [ ] Любая команда захватывает current project/pack/target в начале. Никакого `selected!` после await/смены строки. Один ref-based lock + state защищают от double click ещё до rerender:

```ts
const pendingRef = useRef(false)
const [pending, setPending] = useState(false)
const runCommand = async <T,>(action: () => Promise<T>): Promise<T> => {
  if (pendingRef.current) throw new Error("An operation is already in progress.")
  pendingRef.current = true
  setPending(true)
  try { return await action() }
  finally { pendingRef.current = false; setPending(false) }
}
```

Этот lock создаётся один раз в scoped context. Standalone host предоставляет такой же context; не отдельный lock в каждом дочернем editor. Pending блокирует новые writes, payload inputs и смену owner; unrelated browsing допустим только если не меняет command target.

- [ ] Command отказ сохраняет draft и не вызывает success toast. Success показывает бизнес-действие, не RPC name; затем refresh. Refresh refusal показывает `Recorded, but current status could not be refreshed` и Retry read, не новое сообщение «запись не удалась». При сетевой неопределённости — refresh прежде повторной записи, существующий idempotency key сохраняется для безопасного retry того же intent.
- [ ] После assignment выводить request number/print link из подтверждённого результата. Print route path с requestId сохранить, links передают project и safe return. Если RPC вернул только id, business request number перечитать existing request details, не придумывать его.

## 11. Задача 8 — unsaved guard и совместимость навигации

**Файлы:** app-shell, work-context, unsaved-input-guard, editors, операции; navigation/test.

- [ ] Поднять существующий UnsavedInputGuard над WorkContextProvider в PipeQCShell, убрать внутренний duplicate. Сам guard использует только auth, поэтому цикла с WorkContext нет. Поля остаются внутри main, общий toaster и help сохраняются.
- [ ] В WorkContextProvider `clear` использует `useRequestLeave` перед изменением memory/URL. Clear pack chip при dirty form спрашивает; Cancel оставляет chip, ID и draft. Это совместимое изменение проверяется также на spool chip.
- [ ] Close/Escape/backdrop, смена pack/view/operation/target, Cancel creation и локальные переключения editors используют `useRequestLeave`. Не считать query replace автоматической защитой. Clean opening может push, смена операции replace; режимы Back/Forward проверить.
- [ ] На command container поставить `data-explicit-unsaved-commit="true"`; вызвать `useMarkInputsRecorded()` для полей только подтверждённой команды. Enter submit и click проходят один handler. Отказ RPC не сбрасывает dirty baseline.

```ts
const markRecorded = useMarkInputsRecorded()
const fields = Array.from(formElement.querySelectorAll<HTMLElement>("input, select, textarea"))
// fields принадлежат конкретному успешному payload; остальные drafts не отмечаются.
markRecorded(fields)
```

- [ ] Добавить к existing guard регистрацию React-state dirty sources. Она нужна для selected ISO/targets, Radix controls и portal inputs, которые DOM tracking внутри main может не увидеть. Пример hook/context в `unsaved-input-guard.tsx`:

```ts
type DirtySource = () => boolean
const DirtySourceContext = React.createContext<(source: DirtySource) => () => void>(() => () => {})
export function useRegisterUnsavedState(dirty: boolean) {
  const register = React.useContext(DirtySourceContext)
  const current = React.useRef(dirty)
  current.current = dirty
  React.useEffect(() => register(() => current.current), [register])
}
```

В `UnsavedInputGuard` держать `useRef(new Set<DirtySource>())`; стабильный register добавляет source и возвращает cleanup `() => { sources.current.delete(source) }`. `isDirty` проверяет sources наряду с DOM baseline, Provider охватывает children. Каждый editor/operation регистрирует boolean отличия draft от последнего подтверждённого baseline. Ошибка команды сохраняет boolean=true; success снимает только dirty соответствующей формы. При подтверждённом discard host сбрасывает покидаемые drafts/selected ISO **до** смены view/owner, а не только очищает DOM map. Hidden/mounted формы не должны остаться с выброшенным, но всё ещё dirty вводом. Context chip Clear использует тот же owner-transition reset после подтверждения. При удалении query ID host сбрасывает registered drafts, даже если смены pathname не было.

Не создавать второй общий guard framework. Проверить новую registration интеграцию браузером, включая Cancel и popup fields; существующие `components/pipeqc/unsaved-input.test.ts` сохраняются.

- [ ] WorkContext label обновлять только после подтверждения current pack через `useNameWorkContext`. Unavailable ID не получает подпись прошлой записи. Смена проекта сбрасывает старый owner/dialog/draft.
- [ ] Сохранить старые routes, direct links, печать, view-only access и archived. Старые seven-view возможности распределены по четырём областям; ни одна операция не исчезает.
- [ ] Не вводить новый popstate/history-blocking механизм в этом проходе. Обещаем clean Back/Forward, guarded UI transitions и существующий beforeunload. Dirty browser Back limitation отдельно указать в отчёте, если она сохраняется.

## 12. Задача 9 — технические проверки

- [ ] Запустить целевые existing/new tests после каждой группы изменений. Новые тесты нужны для URL/ownership/draft isolation/facts, не для каждого цвета или строки JSX.
- [ ] После изменения source layout адаптировать existing source-reading tests, сохранив смысл. Например Line Check punch assignment assertion должен использовать targetDraftKey вместо старого request-only key; число отдельных toast callsites не является инвариантом нового command context.
- [ ] Финальные команды из корня:

```zsh
npm run typecheck
node --import tsx --test modules/pressure-test/ui/test-pack-workspace-model.test.ts modules/pressure-test/ui/test-pack-workspace-loader.test.ts modules/pressure-test/ui/test-pack-workflow-model.test.ts modules/pressure-test/ui/test-pack-builder-screen.test.ts modules/pressure-test/ui/test-pack-reference-model.test.ts modules/pressure-test/ui/pressure-test-progress-screen.test.ts modules/pressure-test/ui/pressure-test-ui-model.test.ts modules/pressure-test/ui/test-pack-screen-model.test.ts modules/pressure-test/application/manage-test-pack.test.ts modules/pressure-test/application/manage-pressure-test.test.ts modules/pressure-test/infrastructure/supabase-pressure-test-repository.test.ts config/navigation.test.ts components/pipeqc/workspace-model.test.ts lib/request-version.test.ts
npx eslint modules/pressure-test components/ui/record-drawer.tsx components/pipeqc/app-shell.tsx components/pipeqc/work-context.tsx components/pipeqc/unsaved-input-guard.tsx modules/construction/ui/spool-drawer.tsx config/navigation.ts config/navigation.test.ts app/testpack/builder/page.tsx app/testpack/explorer/page.tsx scripts/verify-test-pack-workbench.ts
npm run test:unit
npm run build
```

Ожидание: exit 0, без новых warnings в изменённых файлах. Старые baseline warnings описать с файлами; не отключать правила широко ради зелёного результата. Не запускать `verify`/pgTAP/reset на populated SHOWCASE-1 ради UI-проверки. Схема не меняется.

## 13. Задача 10 — браузерная приёмка с доказательствами

**Файл:** `scripts/verify-test-pack-workbench.ts`. Использовать текущий локальный стенд и реальные read-only данные. Пароль только из `.env.local` существующим tsx env loading, без inline/exports. Приёмку mock-команд проводить в изолированной QA context; все mutation endpoints перехвачены, неожиданные writes abort. Не подключаться к hosted для этих проверок.

- [ ] Assertions обязательны: нужного элемента нет → FAIL или явно NOT TESTED с причиной. `if (isVisible) { click }` + итоговый PASS без проверки результата запрещён. Проверять выбранный ID, visible business number, scope запроса и state после действия; screenshot сам по себе не PASS.
- [ ] Найти доступные реальные пакеты/роли без изменения данных. Не предполагать конкретные ID/номера/состояния. Для недостающих состояний использовать согласованные mocked reads, отмечая их как mock. Не bootstrap ради красивого screenshot.

| ID | Сценарий | Проверяемый результат |
|---|---|---|
| TP-01 | Explorer без ID | Список, drawer закрыт, no auto-selection |
| TP-02 | Direct pack URL, reload, clean Back/Forward | Тот же project/pack/view, business number в header/editor |
| TP-03 | Explorer → Builder → Pressure Test → return | ID и project сохранены; нет второго выбора |
| TP-04 | Два пакета, затем чужой/несуществующий ID | Никакого fallback первого; unavailable, Clear работает |
| TP-05 | Старый deferred response после pack/project change | Старый snapshot/error не опубликован |
| TP-06 | Catalog initial error; detail refresh error | Retry read; URL сохранён, writes disabled, draft не очищен |
| TP-07 | Unknown pressure unit, existing psi | Не guessed bar; существующий psi отображается без conversion |
| TP-08 | Reader, archived, отсутствие recipient capability | Просмотр; запись disabled с причиной; запрещённые resolution links не предлагаются |
| TP-09 | Dirty Definition/Composition, close/Escape/backdrop/view/target/chip clear | Guard; Cancel сохраняет поля/URL; Confirm меняет owner |
| TP-10 | Mock create success + second compose refused | Created ID в URL, подтверждённый ISO есть, оставшиеся показаны; никакого atomically/success-all |
| TP-11 | Mock double click / metadata + compose | Только одна command execution; pending payload locked |
| TP-12 | Mock RPC refusal; success + refresh refusal | Draft/dirty остаётся при отказе; записанный intent не повторяется после refresh error |
| TP-13 | Два ISO одной Line Check request | Раздельные date/punch/description и правильный request+ISO payload |
| TP-14 | Assignment → result → print | Разные действия, scoped target, durable Print URL и project |
| TP-15 | Readiness blockers и spool selection | Явный spool из текущего pack; NDE/QC return открывает тот же pack |
| TP-16 | Required Y не assigned, Y completed, Y отсутствует, Y read failed | Blocked/Completed/N-A/Unknown различаются; precomm не получает ложное разрешение |
| TP-17 | Required Z и completed/superseded result | Реальный progress; отсутствие данных не Complete |
| TP-18 | Legacy pressure/preparation/progress routes | Те же команды/права, query смена реально обновляет selectedPack |
| TP-19 | 1728×907, 1280×720, 390×844 | 70vw/Expand, fullscreen; list width delta ≤1px; page overflow=0 |
| TP-20 | Keyboard/focus и nested Confirm/Move/unsaved dialog | Focus trap, Escape закрывает верхний dialog, возврат focus к инициатору |
| TP-21 | Fabrication + Erection после drawer extraction | Прежние process labels, groups, width, Expand, dirty guard |

- [ ] Для TP-10–17 mock successful reads должны отражать результат записи во всех зависимых snapshot/worklists, а отказ — сохранять исходные факты. Нельзя показать success только за счёт мокнутого toast.
- [ ] Сделать screenshots: Explorer list, selected pack Readiness, Composition, workflow с Y-blocker, mobile drawer. Не включать secrets/DevTools/auth payload. Сохранять вне дерева runtime traces с потенциальными headers; приложить только безопасные screenshots и текстовые verdicts.

Run после реализации script:

```zsh
npx tsx --env-file-if-exists=.env.local scripts/verify-test-pack-workbench.ts
```

Ожидание: non-zero на failed mandatory assertion. При NOT TESTED в обязательной матрице задача приёмки остаётся открытой, даже если unit/build green.

## 14. Задача 11 — отчёт и завершение

- [ ] Заполнить `docs/superpowers/specs/2026-10-06-test-pack-workbench-result.md`: changed files, решения, точные команды/exit results, browser TP-01–21 PASS/FAIL/NOT TESTED с evidence.
- [ ] Разделить code implemented, real read-only UI acceptance, mocked command scenarios и непроверенные live DB writes. Не перенести августовский Demo Lite sign-off на новый UI.
- [ ] Перечислить ограничения: масштаб каталогов/общая пагинация вне scope; нет handover/history/offline; dirty browser Back не объявлен решённым; неизменённые server contracts.
- [ ] Подтвердить: один выбранный pack, четыре рабочие области, сохранённые preparation/result/print, derived RFT, применимость Y/Z, корректная pressure unit, независимые target drafts, safe partial-create result, Fabrication/Erection без регрессий.
- [ ] Явно записать отсутствие SQL/RLS/RPC changes, DB reset/reseed, Git и публикации.

**Definition of Done:** один проект и пакет совпадают в адресе, шапке, editors и command target; все существующие операции доступны с теми же правами; данные и draft не перескакивают при загрузках/переходах; обязательная приёмка подтверждена. Наличие новых файлов, чекбоксов или `task_complete` без evidence не закрывает проход.
