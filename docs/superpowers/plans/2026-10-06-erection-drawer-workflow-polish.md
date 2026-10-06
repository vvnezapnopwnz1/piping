# Erection: overlay drawer и понятный путь к Ready for Test — Implementation Plan

> **Для исполняющего агента:** выполняй задачи последовательно, отмечая checkbox-пункты; используй `executing-plans`, если навык доступен. План передаётся пользователем другому агенту. Самостоятельная делегация, Git-операции и публикация не входят в поручение.

**Goal:** Привести Erection к тому же удобному overlay drawer, что уже используется в Fabrication: постоянный процесс, компактная операция, понятные условия записи и действия для устранения RFT-блокеров.

**Architecture:** Переиспользовать `SpoolDrawer`, `SpoolTimeline` и `FactsStrip`, сохранив отдельную модель Erection и общий readiness provider. URL определяет выбранный спул и операцию; серверные projections и существующие gates определяют факты и доступность записи. RFT остаётся вычисляемым состоянием.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, существующие UI-компоненты, Supabase repositories, `node:test` через `tsx`.

---

## 1. Контекст и границы

Каталог работы:

```text
/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
```

Прочитать `AGENTS.md`, предыдущий план `docs/superpowers/plans/2026-10-06-fabrication-drawer-workflow-polish.md` и отчёт `docs/superpowers/specs/2026-10-06-fabrication-drawer-design.md`. Затем сверить исходники. Предыдущий проход выполнен пользователем; наличие нового кода подтверждено чтением файлов, проверки этого прохода здесь заново не запускались.

**Что уже есть:** Fabrication использует fixed drawer справа, 70vw на desktop, fullscreen на mobile, Expand/Restore, backdrop и отдельную прокрутку операции. В guard уже реализованы `useMarkInputsRecorded` и `data-explicit-unsaved-commit`. Не реализовывать эти механизмы повторно.

**Что остаётся в Erection:** picker с folding, горизонтальная stepper и формы под ним; навигация между операциями меняет route. В `erection-operations.ts` описан query `op`, но route-компонент читает `step`. В `SpoolTimeline` видимая подпись пока жёстко задана как `Fabrication process`.

Обязательные ограничения:

- Drawer поверх всей правой части страницы, от верхнего до нижнего края viewport; таблицу не толкает и не сжимает.
- Шесть групп: To site → Field material → Erected → Welded / Bolted → Supported → Ready for Test.
- Четыре записываемых milestones: `to_site`, `erected`, `welded_bolted`, `supported`. Field material — evidence, а не пятый записываемый milestone. `rft` вычисляется, кнопки записи RFT нет.
- `nextErectionOperation` сохраняет текущую логику: выбирает первый отсутствующий milestone, не заставляет повторять общий Material Check.
- Доступные группы можно просматривать до завершения предшественников; запись ограничена текущими gates. Не вводить принудительный мастер Next/Back.
- Никаких изменений SQL/RLS, RPC, прав, моделей стадий, счётчиков или доменных правил.
- Не переделывать NDE, Flange Management, Test Pack, Erection dashboard или общий портал. `/erection/rft` остаётся списком readiness, а не новым drawer-route.
- В Fabrication допустимы только совместимые изменения общего drawer-компонента и проверка отсутствия регрессий.
- Не копировать исходники ROMS; ориентир поведения уже реализован средствами PipeQC.
- Не выполнять Git-команды, worktree, commit, push, PR, deploy. Не откатывать чужие изменения.
- Не сбрасывать, не пересевать и не изменять локальную/hosted БД для UI-проверки. Не запускать `demo:prepare`, `demo:showcase` или fixture bootstrap. Секреты не печатать, не придумывать и не передавать inline.

## 2. Источники правил и карта изменений

Перед компоновкой прочитать:

- `modules/construction/domain/erection-stage.ts` — порядок четырёх milestones и RFT.
- `modules/construction/domain/rft.ts` — четыре условия RFT; material date участвует в вычислении даты, но не добавляет новый blocker.
- `modules/construction/application/record-erection-progress.ts` — `describeErectionStageGate`, `firstMissingPredecessor`, допустимость корректирующих событий.
- `modules/construction/application/describe-erection-readiness.ts` — `listRftShortfall`, `describeRftShortfall`, `currentErectionStageLabel`.
- `modules/construction/application/record-field-material-check.ts`, `record-field-weld-progress.ts` — field-specific gates.
- `modules/construction/infrastructure/supabase-erection-repository.ts` — `ErectionReadiness`, refresh и существующие команды.
- `supabase/migrations/20260810093000_erection_progress_commands.sql` — читать, не менять: запрет ручного RFT и ограничения предшественников.

| Файл | Изменение |
| --- | --- |
| `modules/construction/ui/spool-drawer.tsx` | Совместимые параметры подписи процесса и статусов; геометрия остаётся прежней |
| `modules/construction/ui/spool-workbench.module.css` | Только необходимая адаптация к шести группам, компактные evidence и actions |
| `modules/construction/ui/erection/erection-workbench.tsx` | Overlay, постоянная таблица, guarded выбор/закрытие/смена операции |
| `modules/construction/ui/erection/erection-operations.ts` | Канонический `op` и совместимость `step`, текущая модель шагов |
| `modules/construction/ui/erection/erection-operations.test.ts` | Тесты URL-совместимости и сохранения этапности |
| `modules/construction/ui/erection/use-erection-readiness.ts` | Nullable select, ownership загрузок, Retry, сохранение URL при ошибке |
| **Создать:** `modules/construction/ui/erection/erection-selection.ts` | Чистое разрешение выбранного спула только внутри текущего проекта |
| **Создать:** `modules/construction/ui/erection/erection-selection.test.ts` | Выбор через URL, отсутствие автоматического выбора, чужой проект |
| `modules/construction/ui/erection/erection-screen-shell.tsx` | Embedded navigation context и сохранение standalone-поведения |
| `modules/construction/ui/erection/erection-stage-screen.tsx` | Убрать повторный header спула внутри drawer |
| `modules/construction/ui/erection/erection-stage-card.tsx` | Ясный milestone, переход к предшественнику, корректировки и commit marker |
| `modules/construction/ui/erection/field-material-check-screen.tsx` | Evidence/draft, action strip, загрузки и сохранность ввода |
| `modules/construction/ui/erection/field-weld-progress-screen.tsx` | Folded joint list, отдельный milestone, guarded выбор joint |
| `modules/construction/ui/erection/field-support-progress-screen.tsx` | Field/shop evidence, видимость milestone Supported, загрузки |
| **Создать:** `modules/construction/ui/erection/erection-rft-panel.tsx` | Вынести существующие `RftCriteria`, подключить разрешённые resolution-действия |
| `modules/construction/ui/spool-list-coverage.test.ts` | Заменить устаревшее regex-требование только для изменённой Erection selection |
| **Создать:** `docs/superpowers/specs/2026-10-06-erection-drawer-design.md` | Фактический итог и результаты проверок |

## 3. Задача 1 — URL и безопасное владение выбранным спулом

**Файлы:** операции, тесты, readiness hook, новые selection helper/test.

- [x] Сохранить существующие route aliases. Расширить `erectionOperationForPath` третьим аргументом `legacyStep: string | null = null`: валидный `op` имеет приоритет, затем валидный `step`, затем операция route.

```ts
export function erectionOperationForPath(
  pathname: string,
  op: string | null,
  legacyStep: string | null = null,
): ErectionOperationId | null {
  if (isOperation(op)) return op
  if (isOperation(legacyStep)) return legacyStep
  if (pathname === "/erection/weld-progress") return "welded"
  if (pathname === "/erection") return null
  return ERECTION_OPERATIONS.find(item => item.href === pathname)?.id ?? null
}
```

В `ErectionWorkbenchRoute` прочитать оба параметра:

```tsx
const pathname = usePathname()
const params = useSearchParams()
return <ErectionWorkbench operation={erectionOperationForPath(pathname, params.get("op"), params.get("step"))} />
```

- [x] Добавить в существующий test файл следующие случаи и запустить их до/после изменения функции:

```ts
test("op is canonical while existing step links still open", () => {
  assert.equal(erectionOperationForPath("/erection", "supported", "rft"), "supported")
  assert.equal(erectionOperationForPath("/erection", null, "rft"), "rft")
  assert.equal(erectionOperationForPath("/erection", "invalid", "welded"), "welded")
  assert.equal(erectionOperationForPath("/erection/to-site", "invalid", "invalid"), "to_site")
})
```

Команда: `node --import tsx --test modules/construction/ui/erection/erection-operations.test.ts`. Ожидание: новая проверка сначала FAIL на старой функции, затем PASS; старые route/next-operation тесты продолжают проходить.

- [x] Создать чистый selection helper и использовать его в hook вместо поиска только по id:

```ts
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"

export function selectErectionRow(
  rows: readonly ErectionReadiness[], projectId: string | null, selectedId: string | null,
): ErectionReadiness | null {
  if (!projectId || !selectedId) return null
  return rows.find(row => row.projectId === projectId && row.spoolRevisionId === selectedId) ?? null
}
```

- [x] В `erection-selection.test.ts` проверить отсутствие выбора без id, неизвестный id, чужой проект и точное совпадение. Содержимое нового файла:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { selectErectionRow } from "./erection-selection"

const row = (overrides: Partial<ErectionReadiness> = {}): ErectionReadiness => ({
  spoolRevisionId: "r1", projectId: "p1", isoNumber: "ISO-1", spoolNumber: "SP-1",
  revisionNumber: "R0", revisionStatus: "accepted",
  materialLineTotal: 2, materialLineChecked: 2, materialCheckedOn: null,
  fieldWeldTotal: 2, fieldWeldComplete: 0, lastFieldWeldOn: null,
  fieldSupportTotal: 1, fieldSupportRecorded: 0, lastFieldSupportOn: null,
  toSiteOn: "2026-06-26", erectedOn: "2026-06-29", weldedBoltedOn: null, supportedOn: null,
  ndePending: 0, pwhtPending: 0, isRft: false, rftOn: null,
  ...overrides,
})

test("URL selection cannot fall back to another spool or another project", () => {
  const first = row()
  const second = row({ spoolRevisionId: "r2", projectId: "p2" })
  assert.equal(selectErectionRow([first, second], "p1", null), null)
  assert.equal(selectErectionRow([first, second], "p1", "missing"), null)
  assert.equal(selectErectionRow([first, second], "p1", "r2"), null)
  assert.equal(selectErectionRow([first, second], "p2", "r2"), second)
  assert.equal(selectErectionRow([first, second], null, "r1"), null)
})
```

Запуск: `node --import tsx --test modules/construction/ui/erection/erection-selection.test.ts`; все случаи PASS после реализации helper.

- [x] Расширить `ErectionReadinessState.select` до nullable row с параметрами существующего URL setter:

```ts
select: (row: ErectionReadiness | null, options?: {
  push?: boolean
  extra?: Record<string, string | null>
}) => void
```

Реализация вызывает `setSelectedId(row?.spoolRevisionId ?? null, options)`. Новая selection не выполняет reload проекта. Не выбирать `rows[0]` ни в одном состоянии.

- [x] Добавить request generation/ref и ownership по `projectId` к `refresh`. Старый проект не публикует rows, error или loading-state в новый проект. Пока загрузка нового проекта не завершена, старые rows и selected не отображаются. Когда `enabled` или `canView` false, запрос не выполняется.
- [x] Refresh перечитывает данные, но не переписывает `spool` в URL. Loading/error/исчезнувший объект не должны молча удалять выбранный id. Успешно загруженный список без этого id означает `Selected spool is not available in this project` с guarded Clear selection; это отдельное состояние, не вечный skeleton.
- [x] При background refresh сохранить подтверждённые rows текущего проекта, пометить ошибку обновления и заблокировать запись до успешного Retry. В `ErectionReadinessState` добавить `dataCurrent: boolean`, хранить `loadedProjectId` вместе с принятым snapshot и возвращать `Boolean(projectId && loadedProjectId === projectId && !isLoading && !loadFailed)`. `canRecord` остаётся именно capability и не подменяется состоянием загрузки. Ошибку `refresh()` пробрасывать вызывающей команде, чтобы RPC-success/refresh-failure различались; initial effect ловит её отдельно. Провайдер и standalone-экраны должны продолжать работать без дублирующей загрузки.
- [x] В `spool-list-coverage.test.ts` убрать Erection hook из assertion на буквальную строку `? current : null`, сохранив проверку для Flange. Новый selection test покрывает прежний смысл. Не убирать общие проверки shared-table/folding standalone-shell.

**Приёмка:** старый `step=rft` и новый `op=rft` открывают RFT; reload восстанавливает спул; ошибка чтения не уничтожает URL; другой проект не показывает прежний спул.

## 4. Задача 2 — общий overlay для Erection

**Файлы:** `erection-workbench.tsx`, `spool-drawer.tsx`, CSS, screen shell.

- [x] В `SpoolTimeline` добавить `processTitle?: string` с default `Fabrication process`, заменить жёсткий текст на `{processTitle}`. Для Erection передать `Erection process`. Сохранить старое поведение всех Fabrication-потребителей.
- [x] Добавить в `TimelineStep` необязательные `completedLabel?: string` и `stateLabel?: string`: они переопределяют только текст, не state. В навигации выполненного шага использовать `step.completedLabel ?? "Recorded"`; в header операции — `current.stateLabel ??` существующая строка. Для RFT передавать `completedLabel="Ready"`, `stateLabel` со значением `Ready` или `Evidence required`; для Material `stateLabel="Evidence"` до завершения и `Evidence complete` после. Не писать «Next to record RFT».
- [x] Убрать локальный folding-сценарий workbench и оставить FieldSpoolPicker в постоянном listPane: `browsing`, `onBrowsingChange={() => undefined}`. Standalone `ErectionScreenShell` folding сохраняется. Не менять shared RecordSelectTable.
- [x] В workbench использовать `useRequestLeave` и URL setter через nullable `select`:

```ts
const [spoolParam] = useWorkContextParam("spool")
const requestLeave = useRequestLeave()
const choose = (row: ErectionReadiness) => {
  if (row.spoolRevisionId === selected?.spoolRevisionId) return
  requestLeave(() => select(row, { push: !spoolParam }))
}
const close = () => requestLeave(() => select(null, { extra: { op: null, step: null } }))
const openOperation = (id: ErectionOperationId) => {
  const target = ERECTION_OPERATIONS.find(item => item.id === id)
  if (!selected || !target || !canOpen(target)) return
  requestLeave(() => select(selected, { extra: { op: id, step: null } }))
}
```

Первое открытие push, смена группы replace. Setter сохраняет остальные query-параметры, включая проект, фильтры `fspool` и `from`. Close очищает оба параметра операции, даже на отдельном operation-route.

- [x] Заменить старую stepper/layout/evidence компоновку на общий drawer. Использовать existing `erectionStep` для всех шести групп:

```tsx
<SpoolDrawer
  kicker="Spool in erection"
  title={spool.spoolNumber}
  meta={`rev ${spool.revisionNumber} · ${spool.isoNumber}`}
  status={<span className={styles.stageBadge}>{currentErectionStageLabel(spool)}</span>}
  onClose={close}
>
  <FactsStrip facts={[
    { label: "Material lines", value: `${spool.materialLineChecked} of ${spool.materialLineTotal}` },
    { label: "Field welds", value: `${spool.fieldWeldComplete} of ${spool.fieldWeldTotal}` },
    { label: "Field supports", value: `${spool.fieldSupportRecorded} of ${spool.fieldSupportTotal}` },
    { label: "NDE open", value: String(spool.ndePending) },
    { label: "PWHT open", value: String(spool.pwhtPending) },
    { label: "Ready for Test", value: spool.isRft ? "Yes" : "No" },
  ]} />
  <SpoolTimeline
    label={`Erection of spool ${spool.spoolNumber}`}
    processTitle="Erection process"
    active={current.id}
    onOpen={(id) => openOperation(id as ErectionOperationId)}
    steps={ERECTION_OPERATIONS.map(item => ({
      id: item.id, title: item.title, ...erectionStep(item.id, spool), locked: !canOpen(item),
      completedLabel: item.id === "rft" ? "Ready" : undefined,
      stateLabel: item.id === "rft" ? (spool.isRft ? "Ready" : "Evidence required")
        : item.id === "material" ? (erectionStep(item.id, spool).state === "done" ? "Evidence complete" : "Evidence")
        : undefined,
    }))}
  >
    <ErectionOperationNavigationContext.Provider value={{
      openOperation,
      canOpenOperation: (id) => {
        const target = ERECTION_OPERATIONS.find(item => item.id === id)
        return Boolean(target && canOpen(target))
      },
    }}>
      <ErectionEmbeddedContext.Provider value={true}>
        {canOpen(current) ? current.id === "rft" ? (
          <ErectionRftPanel row={spool} here={here} can={can} />
        ) : (
          <OperationPanel key={`${projectId}:${current.id}:${spool.spoolRevisionId}`} operation={current.id} />
        ) : <p className={styles.notice}>This operation is not part of your project access.</p>}
      </ErectionEmbeddedContext.Provider>
    </ErectionOperationNavigationContext.Provider>
  </SpoolTimeline>
</SpoolDrawer>
```

Новый `ErectionRftPanel` принимает `row: ErectionReadiness`, `here: string` и `can: ((capability: Capability) => boolean) | undefined`; callbacks внутренних переходов получает из navigation context. `activityCode` читает из текущего access. Для RFT также сохраняется `canView`/`canOpen`, записи нет.

- [x] Сохранить `ErectionReadinessProvider value={state}` вокруг picker и drawer. Operation subtree иметь key `${projectId}:${current.id}:${spool.spoolRevisionId}`: новый спул/операция получает свой draft, шаги переключаются только после guard.
- [x] В `erection-screen-shell.tsx` оставить boolean `ErectionEmbeddedContext` для совместимости и добавить отдельный навигационный context:

```ts
import type { ErectionOperationId } from "./erection-operations"

export interface ErectionOperationNavigation {
  openOperation: (id: ErectionOperationId) => void
  canOpenOperation: (id: ErectionOperationId) => boolean
}
export const ErectionOperationNavigationContext = createContext<ErectionOperationNavigation | null>(null)
export function useErectionOperationNavigation() {
  return useContext(ErectionOperationNavigationContext)
}
```

Workbench оборачивает содержимое drawer-операции этим provider, передаёт guarded callbacks и актуальный access. Standalone context равен null: там resolution использует существующие routes с `spool`, `withProject` и `linkFrom`.
- [x] При initial loading с `spool` показывать загрузку выбранного спула. При unavailable/error — явное состояние и Retry/Clear selection, без record-form и без доступа к устаревшему payload. Не рендерить drawer для автоматически выбранной первой строки.

**Приёмка:** desktop table до/после открытия имеет одинаковую ширину; шесть групп остаются в пределах drawer; Expanded/Restore, mobile Spools, Escape и backdrop используют один guarded close.

## 5. Задача 3 — To site, Erected и milestone-команды

**Файлы:** `erection-stage-screen.tsx`, `erection-stage-card.tsx`, screen shell.

- [x] В embedded StageScreen убрать повторную карточку ISO/spool и timeline. В standalone они остаются; использовать существующий `ErectionEmbeddedContext`, не удалять standalone JSX целиком.
- [x] В StageCard сначала показать текущую серверную дату stage или `Not recorded`, затем дату события и действие. Сохранять возможность корректирующей записи: текущий RPC допускает её, `alreadyOn` не становится причиной disabled. Назвать повторное действие `Record correction` и оставить краткое объяснение эффективной даты.
- [x] Если `firstMissingPredecessor(stage, toStageEvidence(row))` вернул stage, предложить доступный переход к нему. Явное отображение stage→operation:

```ts
const operationByStage: Record<RecordableErectionStage, ErectionOperationId> = {
  to_site: "to_site", erected: "erected", welded_bolted: "welded", supported: "supported",
}
```

Действие использует navigation context или permission-checked standalone Link; само разрешение записи продолжает определять `describeErectionStageGate`.
- [x] Сохранить `occurredOn` как дату пользователя с существующим default. Не заменять её временем клика и не менять timezone-правила в этом UI-проходе.
- [x] Подключить existing `useMarkInputsRecorded` через ref date-input и opt-in `data-explicit-unsaved-commit="true"` на форме. Синхронный ref защищает от двойного submit; `Button loading={isSaving}` сохраняет подпись, поля disabled во время RPC. Marker вызывается только после RPC-success, до refresh.
- [x] При успешном RPC и ошибке refresh показать `Recorded; status could not be refreshed. Retry refresh.`. Не заявлять, что запись не состоялась, и не повторять RPC автоматически. Readiness refresh не должен заново открыть закрытый drawer или сменить выбранный спул.
- [x] Добавить `dataCurrent?: boolean` с default `true` в StageCard props и передавать `state.dataCurrent` из StageScreen, Welds и Supports. Disabled и ранняя проверка save используют `!dataCurrent` отдельно от `!gate.allowed`, пояснение — `Refresh spool status before recording.`. Во всех field-screen тот же state блокирует команды при устаревшем snapshot, сохраняя mounted draft и реальные capability-сообщения.

**Приёмка:** Erected без To Site предлагает To site; milestone-коррекция остаётся возможной; ошибка RPC сохраняет dirty-input и guard.

## 6. Задача 4 — Field material, joints и supports без длинной прокрутки

**Файлы:** три field-screen, StageCard и CSS.

- [x] Во всех embedded field-screen убрать дублирование header ISO/spool и timeline. Оставить компактные facts конкретной операции, не скрывая важные phase-пояснения.
- [x] Field Material: раздельные `recordedTraces` и drafts, badges `Recorded` / `Edited, not recorded` / `Not recorded`, server ratio/date/QC-13 сверху и доступное Record traces действие. Существующий material check общий с Fabrication: повторная field-запись подтверждает тот же record и меняет его дату. Не показывать fabricated material как пустую проверку, не делать повторную проверку новым обязательным gate.
- [x] До To Site Field Material предлагает переход в To site; `describeFieldMaterialCheckGate` и частичная запись traces остаются прежними. Не подставлять `expectedTraceNumber` как введённое значение: это только placeholder.
- [x] Field Welds: добавить локальное `browsingJoints`, folded table после выбора, Change joint в `IdentityHeadline`, возврат к той же mounted hidden форме без потери draft. Другой joint выбирается через `useRequestLeave`, затем сбрасываются subcontractor/WPS/welders/date/percent к исходному состоянию формы, а не данным предыдущего joint.
- [x] Сохранить `loadWeldSummaries(..., "field")`, `phase: "erection"`, квалификации и locked gate. Ни shop joints, ни автоматический выбор первых welders не добавлять. Серверные facts joint отделить от draft.
- [x] Разделить подгруппы Welded / Bolted на `Field joints` и `Spool milestone`. Подгруппы переключаются в mounted hidden panels; незаписанные поля сохраняются. StageCard Welded / Bolted доступна без прокрутки через всю joint-таблицу. Запись одного joint не выставляет milestone, milestone не записывает все joints.
- [x] Supported аналогично разделить на `Field supports` и `Spool milestone`. В compact summary показать ratio, Installation date; milestone Supported доступен через переключатель, а не под длинной таблицей. У каждой строки сохранить её Support ID, installed date и `installedPhase`.
- [x] Сохранить существующую семантику support: fabrication installation не считается field evidence, field re-record меняет фазу record. Видимая подпись повторного действия должна объяснять объект: `Record in field` для shop-записи, `Record correction` для field-записи. Не реализовывать перенос фазы молча при выборе строки; только явная команда с пользовательской датой.
- [x] Не добавлять новое UI-условие «все joints/supports обязательно завершены перед milestone», которого нет в текущем stage gate/RPC. Счётчики и milestones показывать отдельно; недостаток evidence объяснять без изменения допустимости существующих команд.

**Приёмка:** joint list не толкает форму ниже экрана; milestone доступен независимо от длины evidence-таблиц; запись evidence и milestone различимы; смена joint не переносит чужой draft.

## 7. Задача 5 — RFT и действия по блокерам

**Файлы:** новый `erection-rft-panel.tsx`, workbench, navigation context.

- [x] Вынести текущий `RftCriteria` из workbench в `ErectionRftPanel`; сохранить четыре строки Welded / Bolted, Supported, NDE, PWHT и серверные `isRft`/`rftOn`. Использовать existing `listRftShortfall` / `describeRftShortfall`, не разбирать текст и не создавать второй domain gate.
- [x] Для отсутствующих Welded / Bolted и Supported использовать guarded `openOperation("welded")` / `openOperation("supported")`, только если callback `canOpenOperation` разрешает. Смена группы остаётся в той же таблице/drawer. Без доступа — пояснение без активного CTA.
- [x] Для NDE использовать permission-checked Link с контекстом спула и точным return URL; отдельный `obligationId` не вводить:

```ts
const ndeHref = can && canVisit("/nde", can)
  ? linkFrom(withProject(`/nde?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode), here)
  : null
const pwhtHref = can && canVisit("/fabrication/qc-release", can)
  ? linkFrom(withProject(`/fabrication/qc-release?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode), here)
  : null
```

`here` строится из текущего pathname и полного query, `activityCode` берётся из текущего access как в существующем workbench. PWHT Link подписать `Open QC release`; не обещать автоматическое открытие PWHT-tab, которого текущий URL-контракт не поддерживает. Один styled Link, без вложенного интерактивного Button.
- [x] При `isRft` true показать `Ready for Test` и серверную дату, если она есть. При false — blockers и resolution. Если сервер сообщает false, но shortfall пуст, показать существующее сообщение рассогласования и Retry refresh, а не «Ready».
- [x] Не добавлять материал, нулевые totals или новые flange-условия в четыре существующих RFT-критерия. Не добавлять кнопку Set/Release RFT. `/erection/rft` и его aliases продолжают существовать как readiness-list.

**Приёмка:** одновременно видны все реальные blockers; два внутренних перехода открывают нужную группу drawer; NDE/QC release сохраняют спул и возвращают в исходную RFT-операцию.

## 8. Задача 6 — загрузки, команды и незаписанный ввод

**Файлы:** readiness hook, StageCard, три field-screen. Shared guard использовать, не переписывать.

- [x] Для BOM, field joints/referentials и supports различать loading, successful-empty и error. Retry выполняет конкретный read; stale results другой operation/спула/проекта игнорируются. Ошибка не подписывается `No joints/supports/BOM`.
- [x] Каждому async-load дать ownership по project/revision и request generation; cleanup invalidates response. Refresh успешной записи не затирает другой mounted draft. Выбор operation не перезагружает весь проект по причине смены selection.
- [x] Внутри операций с evidence и milestone сериализовать команды общим pending lock. В `erection-screen-shell.tsx` добавить scoped API; к существующим React imports добавить `useRef` и `useCallback`:

```tsx
export interface ErectionCommands {
  pending: boolean
  run: (action: () => Promise<void>) => Promise<void>
}
export const ErectionCommandContext = createContext<ErectionCommands | null>(null)

export function useErectionCommands(): ErectionCommands {
  const shared = useContext(ErectionCommandContext)
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setPending(true)
    try {
      await action()
    } finally {
      lock.current = false
      setPending(false)
    }
  }, [])
  return shared ?? { pending, run }
}

export function ErectionCommandProvider({ children }: { children: ReactNode }) {
  const commands = useErectionCommands()
  return <ErectionCommandContext.Provider value={commands}>{children}</ErectionCommandContext.Provider>
}
```

Provider находится внутри keyed operation subtree workbench и охватывает одновременно StageCard и evidence. Полный жизненный цикл команды — RPC, успешный marker, refresh и обработка ошибок — выполняется **внутри** callback `commands.run(...)`: пропущенный повторный вызов не должен запускать marker/refresh снаружи.

- [x] Сохранить общий lock и для standalone: в StageScreen и каждом field-screen получить `const commands = useErectionCommands()` и передать `commands={commands}` в Shell. Добавить `commands?: ErectionCommands` в Shell props; сам Shell также безусловно вызывает `useErectionCommands()` и оборачивает children в `ErectionCommandContext.Provider` с `value={commands ?? ownCommands}`. Таким образом StageCard получает тот же lock, что evidence-команды родителя, при наличии и при отсутствии workbench. Pending блокирует новые команды и изменение payload-полей; browsing остаётся под existing guard.
- [x] Команды используют existing `Button loading` с постоянной подписью. При double click один repository mutation. Guard-marker помечает только поля отправленного payload: запись support/date не делает скрытый weld или другой milestone draft записанным. Никаких blanket-clear baseline.
- [x] Применить `data-explicit-unsaved-commit="true"` к operation-формам и `useMarkInputsRecorded` после успешной записи. RPC failure оставляет ввод и dirty-state; success + refresh failure сообщается отдельно. Refresh не изменяет URL selection.
- [x] Внутренние evidence tabs сохраняют mounted forms. При смене операции/спула guard подтверждает отбрасывание draft; после подтверждения key сбрасывает его. Поиск и table-filters не считать dirty business input.
- [x] Проверить Close, Spools, backdrop, Escape, operation-switch и joint-switch с dirty-input. Existing guard не перехватывает browser Back как полноценный unsaved-navigation barrier: не расширять его глобально и не заявлять такую гарантию в отчёте. Back/Forward обязательно проверить на восстановление URL и selection при чистом вводе.

**Приёмка:** запись milestone и evidence одновременно невозможна; rejected RPC не отключает guard; загрузка прошлого проекта/спула не появляется в новом объекте.

## 9. Задача 7 — проверка интерфейса и регрессий Fabrication

- [x] Использовать текущие paper-токены и плотность. Header, facts, процесс и заголовок операции не уходят вниз вместе с таблицей. Рабочая область скроллится отдельно. Sticky actions не перекрывают последние поля.
- [x] Проверить шесть групп при 1728×907, 1280×720 и 390×844. На compact rail допускается короткая горизонтальная прокрутка только самой навигации; горизонтального overflow всей страницы нет. Active step виден и достижим клавиатурой.
- [x] Desktop: drawer top=0/right=viewport edge/bottom=viewport height; width 70vw, expanded 100vw. Ширина таблицы до/после открытия совпадает с допуском 1px. Mobile: drawer равен viewport, Spools доступна без прокрутки.
- [x] Проверить keyboard focus loop, Escape, backdrop и возврат фокуса; поверх guard AlertDialog должен работать его собственный focus/keyboard scope, без закрытия drawer вторым Escape-событием.
- [x] После изменения общего Timeline проверить Fabrication: прежняя подпись, пять групп, Record/Next labels, overlay, guard, Expand/Restore и завершённый Laydown.

Технические команды из корня:

```zsh
node --import tsx --test modules/construction/ui/erection/erection-operations.test.ts modules/construction/ui/erection/erection-selection.test.ts modules/construction/application/describe-erection-readiness.test.ts
npm run typecheck
npx eslint modules/construction/ui/spool-drawer.tsx modules/construction/ui/erection/erection-workbench.tsx modules/construction/ui/erection/erection-operations.ts modules/construction/ui/erection/erection-operations.test.ts modules/construction/ui/erection/erection-selection.ts modules/construction/ui/erection/erection-selection.test.ts modules/construction/ui/erection/use-erection-readiness.ts modules/construction/ui/erection/erection-screen-shell.tsx modules/construction/ui/erection/erection-stage-screen.tsx modules/construction/ui/erection/erection-stage-card.tsx modules/construction/ui/erection/field-material-check-screen.tsx modules/construction/ui/erection/field-weld-progress-screen.tsx modules/construction/ui/erection/field-support-progress-screen.tsx modules/construction/ui/erection/erection-rft-panel.tsx modules/construction/ui/spool-list-coverage.test.ts
npm run test:unit
npm run build
```

Ожидание: exit 0, без новых lint warnings. Старые отдельные baseline-проблемы описать, не скрывать. Не запускать DB reset или `verify` с pgTAP ради UI-проверки; SQL не меняется.

Браузер — отдельный обязательный gate. Использовать имеющуюся локальную авторизованную сессию и данные только для чтения. Pending/rejection проверять сетевым перехватом в QA-вкладке: mutation request не достигает БД. Успех команды проверять полностью согласованными mock-ответами чтения/записи в изолированной сессии; этот результат обозначать как mock, не DB acceptance. При отсутствии нужного dataset не создавать его самовольно; явно перечислить непроверенные сценарии.

| Сценарий | Ожидаемое поведение |
| --- | --- |
| Без `spool` | Таблица, никакой автоматически открытой формы |
| Валидный spool + `op=rft` / старый `step=rft` | Один спул и одна RFT-операция |
| Существующий operation-route | Открывается соответствующая группа, Close оставляет таблицу |
| Несуществующий/чужой id | Явное unavailable-состояние, не вечный skeleton |
| Refresh error | URL сохранён, запись заблокирована, Retry доступен |
| Поздний ответ прежнего проекта/спула | Не меняет текущие данные или выбор |
| Нет To Site | Gates Material/Weld/Erected объясняют требование и предлагают переход |
| Материал проверен в shop | Shared evidence видна; повторный field check не навязан |
| Выбор joint → Change joint → тот же joint | Draft сохранён |
| Другой joint после dirty-input | Guard, затем новый чистый draft |
| Shop support / field support | Фаза показана; явная соответствующая команда |
| Длинный список joints/supports | Milestone доступен через отдельную подгруппу |
| Корректировка milestone | Доступна по текущему gate; нет нового запрета |
| Double click / evidence + milestone | Одна команда; общий pending lock |
| RPC rejection / success + refresh rejection | Две разные ошибки, draft/commit-marker корректны |
| RFT blockers: welded, supports, NDE, PWHT | Четыре независимых причины и доступные действия |
| `isRft=false`, shortfall пуст | Рассогласование и refresh, никакого ложного Ready |
| Роль view без record / без NDE | Просмотр разрешён, запись/переходы корректно ограничены |
| NDE/QC release и возврат | Тот же проект, спул и RFT URL |
| Clean Back/Forward/reload | Selection соответствует URL |
| Desktop/mobile, Expand/Restore | Overlay, ширина таблицы неизменна, процесс достижим |
| Fabrication после shared-изменений | Поведение предыдущего прохода сохранено |

## 10. Отчёт и завершение

- [x] Создать `docs/superpowers/specs/2026-10-06-erection-drawer-design.md`: итоговые решения, файлы, команды, результаты и ограничения.
- [x] Приложить screenshots: Erection desktop overview, selected field joint, Supported с phase evidence, RFT blockers, mobile drawer. Не включать секреты/аутентификационные данные.
- [x] Если для проверки создаётся временный Playwright-скрипт, обязательные assertions должны throw/давать non-zero exit; console-log `FAIL` не является проваленной проверкой. Отсутствующий dataset означает skip/unverified, не PASS.
- [x] В отчёте разделить реально проверенный UI, mock-команды и непроверенные DB-сценарии. Создание файлов и `task_complete` не заменяют проверку результата.
- [x] Подтвердить: таблица не сжимается; шесть групп и четыре milestones сохранены; Material shared, joints/supports phase-specific; RFT только derived; gates/RPC/БД не менялись; Fabrication не регрессировал; Git и публикация не выполнялись.

Результат этого плана — законченный локальный проход по Erection drawer. Следующие разделы портала в эту задачу не включать.
