# Fabrication drawer: понятные операции и следующий шаг — Implementation Plan

> **Для исполняющего агента:** выполняй задачи последовательно, используя `executing-plans`, если этот навык доступен. Отмечай выполненные пункты. Пользователь передаёт этот документ другому агенту; самостоятельный запуск дополнительных агентов, Git-операции и публикация не входят в поручение.

**Goal:** Сделать работу внутри Fabrication drawer понятной: что уже записано, что мешает продолжить и какое действие нужно выполнить сейчас, без длинной прокрутки всей карточки спула.

**Architecture:** Сохранить существующий overlay drawer и пять групп производственных операций. Статусы строить по данным сервера, доступность записи — по существующим application gates и RPC. Добавить представление причин блокировки и переходы к их устранению; формы и производственный контракт сохранить.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, существующие компоненты UI, Supabase repository, `node:test` через `tsx`.

---

## 1. Контекст и границы

Рабочий каталог:

```text
/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
```

Прочитать `AGENTS.md` и `docs/superpowers/specs/2026-10-06-fabrication-drawer-design.md`. Затем сверить исходники: документ дизайна фиксирует предыдущий проход, исходники определяют текущее поведение.

В текущем коде drawer уже расположен поверх страницы: `position: fixed`, справа, на всю высоту viewport, ширина 70vw на desktop; Expand открывает его на весь экран. На ширине до 1023px он полноэкранный. Таблица спулов сохраняет ширину. Есть backdrop, закрытие, Escape, удержание фокуса и возврат фокуса. Это база, а не задача на повторную реализацию.

Сохранить:

- Пять групп: Material → Shop welds → QC release → Paint → Laydown.
- Все восемь доменных стадий и их даты. `fabricated` вычисляется; ручную кнопку «Fabricated» не добавлять.
- Постоянную навигацию процесса и отдельную прокрутку рабочей области операции.
- Header спула, Close и Expand вне длинного содержимого.
- URL-контекст `spool` и `op`, существующие маршруты и права доступа.
- Возможность открыть доступную пользователю группу для просмотра: этапность не превращать в мастер с принудительным Next.
- Существующие guards при закрытии, переходе между операциями и выборе другого объекта.

В этот проход входят только Fabrication и необходимая узкая поддержка его незаписанного ввода. Не переделывать Erection, глобальную навигацию портала, таблицу спулов, права, SQL/RLS, RPC или модель стадий. Erection — отдельная последующая задача.

ROMS служит визуальным ориентиром поведения overlay. Его исходники не переносить; реализация остаётся на компонентах PipeQC.

Не выполнять commit, branch, stash, reset, push, PR, deploy. Не откатывать чужие локальные изменения. Для сверки использовать чтение файлов и сохранённые копии затрагиваемых файлов, без Git-команд.

Не сбрасывать и не пересевать локальную или hosted БД. Не запускать `demo:prepare`, `demo:showcase` или fixture bootstrap ради UI-проверки. Не записывать производственные данные в существующие проекты ради проверки интерфейса. Секреты из `.env.local` не печатать и не передавать inline; следовать `AGENTS.md`.

## 2. Карта файлов

| Файл | Назначение и допустимое изменение |
| --- | --- |
| `modules/construction/ui/spool-drawer.tsx` | Существующий overlay и процесс; менять только если новая компоновка выявит конкретную регрессию |
| `modules/construction/ui/spool-workbench.module.css` | Компактные статусы, блокеры, адаптивная раскладка, видимость действий |
| `modules/construction/ui/fabrication/fabrication-workbench.tsx` | Передача разрешённых переходов к операциям внутрь экранов |
| `modules/construction/ui/fabrication/use-context-spool.ts` | Расширить `EmbeddedSpool` обратными вызовами навигации |
| `modules/construction/ui/fabrication/fabrication-operations.ts` | Прочитать и сохранить существующую группировку; новый порядок не вводить |
| **Создать:** `modules/construction/ui/fabrication/release-checks.ts` | Чистая проекция readiness в строки проверки, без новой бизнес-валидации |
| **Создать:** `modules/construction/ui/fabrication/release-checks.test.ts` | Смысловые проверки проекции, включая нулевые totals и неактуальную ревизию |
| `modules/construction/ui/fabrication/qc-release-screen.tsx` | Статус решения, отдельные причины блокировки, действия, evidence и загрузка |
| `modules/construction/ui/fabrication/material-check-screen.tsx` | Записанные traces отдельно от текущего ввода, ясный следующий шаг |
| `modules/construction/ui/fabrication/weld-progress-screen.tsx` | Состояние выбранного joint, актуальный результат записи, ошибки загрузки |
| `modules/construction/ui/fabrication/paint-laydown-screen.tsx` | Записанные даты, условия перехода, ясные даты команд |
| `components/pipeqc/unsaved-input-guard.tsx` | Узкий opt-in: считать Fabrication-ввод записанным после успешного RPC |
| `modules/quality/ui/nde-batch-screen.tsx` | Только прочитать: уже поддерживает фильтр по `spool`; расширение NDE не требуется |
| `components/pipeqc/workspace-model.ts` | Использовать существующий `linkFrom`, не менять контракт возврата |

Авторитетные правила для чтения:

- `modules/construction/domain/quality-release.ts` — `FabricationReadiness`, `evaluateReleaseEligibility`.
- `modules/construction/application/release-spool.ts` — `describeReleaseGate`, `describePaintGate`.
- `modules/construction/application/record-material-check.ts` — частичная запись traces допустима; пустой BOM не означает выполненную проверку.
- `modules/construction/application/record-weld-progress.ts` — квалификации, WPS, locked joint и phase.
- `modules/construction/infrastructure/supabase-construction-repository.ts` — существующие данные и payload, без добавления запросов к выдуманным полям.

## 3. Задача 1 — представить QC release как проверку готовности

**Файлы:** создать `release-checks.ts`, `release-checks.test.ts`; изменить `qc-release-screen.tsx` и CSS.

- [ ] Прочитать `evaluateReleaseEligibility`: принятый revision, материал, сварка, опоры, NDE и PWHT проверяются независимо. Ноль BOM блокирует release; ноль joints/supports сам по себе не блокирует.
- [ ] Добавить следующую чистую проекцию. Не разбирать английские строки `gate.reason`, не использовать её вместо существующего gate для разрешения RPC.

```ts
import type { FabricationReadiness } from "../../domain/quality-release"

export type ReleaseCheckId = "revision" | "material" | "welds" | "supports" | "nde" | "pwht"
export interface ReleaseCheck {
  id: ReleaseCheckId
  label: string
  complete: boolean
  detail: string
}

export function releaseChecks(r: FabricationReadiness): ReleaseCheck[] {
  return [
    { id: "revision", label: "Revision", complete: r.revisionStatus === "accepted", detail: r.revisionStatus },
    { id: "material", label: "Material traces", complete: r.lineTotal > 0 && r.lineChecked >= r.lineTotal,
      detail: r.lineTotal === 0 ? "No bill of materials" : `${r.lineChecked} of ${r.lineTotal} lines traced` },
    { id: "welds", label: "Shop welds", complete: r.weldComplete >= r.weldTotal,
      detail: r.weldTotal === 0 ? "No weld joints required" : `${r.weldComplete} of ${r.weldTotal} joints welded` },
    { id: "supports", label: "Supports", complete: r.supportRecorded >= r.supportTotal,
      detail: r.supportTotal === 0 ? "No supports required" : `${r.supportRecorded} of ${r.supportTotal} installed` },
    { id: "nde", label: "NDE", complete: r.ndePending === 0, detail: `${r.ndePending} obligations outstanding` },
    { id: "pwht", label: "PWHT", complete: r.pwhtPending === 0, detail: `${r.pwhtPending} results outstanding` },
  ]
}
```

- [ ] Написать тесты до подключения UI. Минимальное содержимое тестового файла:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { evaluateReleaseEligibility, type FabricationReadiness } from "../../domain/quality-release"
import { releaseChecks } from "./release-checks"

const ready: FabricationReadiness = {
  revisionStatus: "accepted", lineTotal: 2, lineChecked: 2,
  weldTotal: 2, weldComplete: 2, supportTotal: 1, supportRecorded: 1,
  ndePending: 0, pwhtPending: 0,
}

test("each independent blocker stays visible", () => {
  const r = { ...ready, lineChecked: 1, weldComplete: 1, supportRecorded: 0, ndePending: 2, pwhtPending: 1 }
  assert.deepEqual(releaseChecks(r).filter(c => !c.complete).map(c => c.id),
    ["material", "welds", "supports", "nde", "pwht"])
})

test("checklist agrees with the existing domain gate", () => {
  const cases = [ready, { ...ready, lineTotal: 0, lineChecked: 0 },
    { ...ready, weldTotal: 0, weldComplete: 0, supportTotal: 0, supportRecorded: 0 },
    { ...ready, revisionStatus: "superseded" }, { ...ready, ndePending: 1 }, { ...ready, pwhtPending: 1 }]
  for (const r of cases)
    assert.equal(releaseChecks(r).every(c => c.complete), evaluateReleaseEligibility(r).isReleasable)
  assert.equal(releaseChecks(cases[1]).find(c => c.id === "material")?.detail, "No bill of materials")
})
```

Запуск: `node --import tsx --test modules/construction/ui/fabrication/release-checks.test.ts`. Ожидание: все тесты проходят. При выполнении через TDD сначала запуск должен показать отсутствие проекции, затем успешный результат.

- [ ] В начале QC release показать один из статусов: `Loading release checks…`, `Release checks could not be loaded`, `Blocked`, `Ready for QC release`, `QC released on <date>`. Ошибка имеет Retry. Дата `spool.dates.qc_release` означает выполненную запись; `isReleasable` означает только готовность.
- [ ] Отрисовать компактные строки `releaseChecks(readiness)`: название, значение, статус, действие только для незавершённых доступных проверок. Не дублировать длинный объединённый `gate.reason` под теми же строками.
- [ ] Для непринятой ревизии показать явную причину без кнопки, обещающей её исправить в drawer.
- [ ] Сохранить `describeReleaseGate(readiness)` для disabled и ранней проверки обработчика QC release; также проверять успешную загрузку и уже записанную дату. Строки готовности не разрешают запись самостоятельно.
- [ ] Существующие Supports/NDE/PWHT оставить вторым уровнем внутри release. При переключении скрывать панели через `hidden`, сохраняя mount и введённый Chart number. Не возвращать три длинные таблицы в одну вертикальную колонку.

**Приёмка:** при двух блокерах видно оба, а действие каждого ведёт к нужной работе. При loading/error нет ложного `0 open`, `No supports` или `Ready`. Уже выпущенный спул показывает дату вместо приглашения снова выполнить release.

## 4. Задача 2 — переходы к устранению блокеров

**Файлы:** `use-context-spool.ts`, `fabrication-workbench.tsx`, `qc-release-screen.tsx`.

- [ ] Расширить `EmbeddedSpool` двумя необязательными callbacks; остальные embedded-потребители не обязаны их передавать:

```ts
import type { FabricationOperationId } from "./fabrication-operations"

// Добавить в существующий EmbeddedSpool:
onOpenOperation?: (id: FabricationOperationId) => void
canOpenOperation?: (id: FabricationOperationId) => boolean
```

- [ ] В workbench передать существующий guarded `openStep` как `onOpenOperation`; `canOpenOperation` определить через registry и текущий `canOpen`:

```ts
embedded={{
  spool,
  onSpoolChange,
  onOpenOperation: openStep,
  canOpenOperation: (id) => {
    const target = FABRICATION_OPERATIONS.find(item => item.id === id)
    return Boolean(target && canOpen(target.href))
  },
}}
```

- [ ] Material → вызвать callback с `material`; Shop welds → с `welds`. Это сохраняет страницу, спул и таблицу, меняет `op`, проходит через `useRequestLeave` ровно один раз. Если нет доступа — показать текст `Not available with your project access`, без активного CTA.
- [ ] Supports → `setEvidence("supports")`, PWHT → `setEvidence("pwht")`. После выбора направить focus к заголовку соответствующей панели с `tabIndex={-1}`; прокручивать только рабочую область, не весь drawer. Формы не сбрасывать.
- [ ] Для NDE использовать поддерживаемый контекст спула и `from`. Прочитать `useWorkContextParam("spool")` в `modules/quality/ui/nde-batch-screen.tsx`: отдельного контракта `obligationId` сейчас нет, не добавлять неподдерживаемый параметр.

```ts
import { usePathname, useSearchParams } from "next/navigation"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

// В теле QcReleaseScreen:
const pathname = usePathname()
const query = useSearchParams().toString()
const here = query ? `${pathname}?${query}` : pathname
const can = useOptionalAccess()?.can
const ndeHref = spool && can && canVisit("/nde", can)
  ? linkFrom(`/nde?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
  : null
```

- [ ] Использовать `ndeHref` и в строке NDE-блокера, и вместо каждого текущего `href="/nde"` в evidence. Render — один styled Link, без вложенного интерактивного Button. При отсутствии доступа только текст. Существующий Link guard защищает уход с незаписанным вводом; проект сохраняется текущим workspace, выдуманный query-параметр проекта не вводить.
- [ ] Сохранить корректное standalone-поведение: если embedded отсутствует, Material/Shop welds resolution — ссылки на существующие routes с `spool` и `from`, проверенные тем же `canVisit`. Список стадий и picker не дублировать в embedded-режиме.

**Приёмка:** Material и Shop welds открываются внутри того же drawer; NDE показывает obligations только выбранного спула, возврат восстанавливает исходный `spool` и `op`. Роль без NDE не получает активную ссылку.

## 5. Задача 3 — loading, запись и сохранность ввода

**Файлы:** четыре operation-screen и узкий opt-in в `unsaved-input-guard.tsx`.

- [ ] Для каждого набора данных различать `loading`, успешный пустой ответ и ошибку. В QC это readiness + evidence; в Material BOM + existing traces + QC-13; в Welds joints и referentials; в Paint/Laydown paint options и locations. Retry повторяет соответствующий load. Ошибка не превращается в «на спуле ничего нет».
- [ ] Привязать загрузку к идентификатору спула/проекта, а не к целому обновляющемуся объекту `spool`. Отменённый effect не публикует результат. Такой шаблон применять с конкретным repository-вызовом экрана:

```ts
const spoolRevisionId = spool?.spoolRevisionId ?? null
const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
const [loadError, setLoadError] = useState<string | null>(null)

useEffect(() => {
  if (!spoolRevisionId) return
  let cancelled = false
  setLoadState("loading")
  setLoadError(null)
  void loadReadiness(getSupabaseBrowserClient(), spoolRevisionId)
    .then(value => {
      if (cancelled) return
      setReadiness(value)
      setLoadState("ready")
    })
    .catch((error: unknown) => {
      if (cancelled) return
      setLoadError(error instanceof Error ? error.message : "Release checks could not be loaded.")
      setLoadState("error")
    })
  return () => { cancelled = true }
}, [spoolRevisionId, refreshToken])
```

Для QC сохранить атомарный `Promise.all` существующего `reload`, а не заменить его одним `loadReadiness`. Шаблон показывает lifecycle; публиковать все пять результатов только после проверки актуального request. При ошибке refresh не стирать drafts.

- [ ] Защитить и результат команды после ухода с объекта: хранить request generation в ref экрана и текущий revision id в ref workbench; перед публикацией проверять актуальность. `onSpoolChange` от уже закрытой/заменённой operation не должен заново открывать прежний спул. При смене проекта старые загрузки referentials также игнорируются. Pending-команду считать завершившейся на сервере только по ответу RPC; закрытие drawer само по себе не означает отмену RPC.

- [ ] Все команды защищать синхронным ref и состоянием pending, а не только disabled: Start Fab, Issue QC-13, Record traces, Record weld, QC release, Support installed, PWHT accepted, Sent to Paint, Record painting, Laydown. Внутри одного экрана сериализовать команды, подпись выполняемой кнопки — `Recording…` / `Issuing…`.

```ts
const pendingRef = useRef(false)
const [pendingAction, setPendingAction] = useState<string | null>(null)

// В начале конкретного обработчика, после проверки spool и существующего gate:
if (pendingRef.current) return
pendingRef.current = true
setPendingAction("release")
try {
  await releaseQualityRecord(getSupabaseBrowserClient(), spool.spoolRevisionId,
    releasedOn, null, crypto.randomUUID())
  // RPC подтверждён; пометить относящиеся к команде поля записанными.
  await reload()
} finally {
  pendingRef.current = false
  setPendingAction(null)
}
```

Сохранить catch с понятной ошибкой и toast. Если RPC прошёл, а refresh упал, писать `Recorded; status could not be refreshed. Retry refresh.`; не предлагать повторить саму запись и не сообщать, что RPC не состоялся. Во время pending не давать менять payload-поля. Обновление сначала меняет серверный статус, затем UI.

- [ ] Исправить ограничение существующего guard для этих форм: сейчас клик по Record/Issue немедленно меняет baseline даже при отклонённом RPC. Добавить отдельный context/hook `useMarkInputsRecorded(): (fields: readonly HTMLElement[]) => void`, который обновляет baseline только указанных tracked input/select/textarea. В `UnsavedInputGuard` callback должен использовать существующий `valueOf` и `baseline.current`; вне provider callback — no-op.

```ts
const RecordedContext = React.createContext<(fields: readonly HTMLElement[]) => void>(() => {})
export function useMarkInputsRecorded() {
  return React.useContext(RecordedContext)
}

// Внутри UnsavedInputGuard:
const markRecorded = React.useCallback((fields: readonly HTMLElement[]) => {
  for (const field of fields) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) continue
    if (baseline.current.has(field)) baseline.current.set(field, valueOf(field))
  }
}, [])
```

Оборачивать существующий GuardContext.Provider в RecordedContext.Provider с `value={markRecorded}`. В ветке автоматического `isCommitLabel` пропускать автоматическое обновление baseline для opt-in форм:

```ts
if (command?.closest('[data-explicit-unsaved-commit="true"]')) return
```

Эту проверку поставить внутри ветки commit-команды до `window.setTimeout`. На корневой элемент Fabrication operation-form добавить `data-explicit-unsaved-commit="true"`. Остальные экраны продолжают прежнее поведение.

- [ ] После успешного RPC вызвать `markRecorded` только с полями отправленного payload, полученными через refs. Не очищать весь guard: например, запись опоры не должна считать скрытый незаписанный PWHT Chart number сохранённым. Ошибка RPC не вызывает `markRecorded` и не сбрасывает values. Не менять browser Back и чужие формы в этой задаче.

**Приёмка:** двойной клик отправляет один RPC. Ошибка оставляет введённые значения; последующее закрытие спрашивает о незаписанном вводе. Успешная запись конкретной операции не очищает предупреждение о другой незаписанной форме.

## 6. Задача 4 — Material и Shop welds

**Файлы:** `material-check-screen.tsx`, `weld-progress-screen.tsx`, CSS.

- [ ] В Material разместить компактную сводку сверху: Start Fab с серверной датой; проверенные строки `spool.lineChecked / spool.lineTotal`; актуальный номер QC-13 при наличии. Существующий `checkedOn` подписать `Recording date`, поскольку он используется несколькими командами.
- [ ] Следующее действие выбирать без изменения gate: нет Start Fab → `Record Start Fab`; есть Start Fab и проверка неполная → заполнить heat/trace и `Record traces`; полная серверная проверка → показать завершение и доступную ссылку `Open Shop welds`. Переход добровольный, автоматического переключения после save нет.
- [ ] Разделить загруженные traces и drafts. При загрузке создать `recordedTraces` отдельно от редактируемого `traces`; рядом со строкой показывать `Recorded`, `Edited, not recorded` или `Not recorded` по сравнению с загруженным значением. Сводный счётчик completion брать из `SpoolStatus`, а не из количества заполненных input.

```ts
const recordedValue = recordedTraces[line.identCode] ?? ""
const draftValue = traces[line.identCode] ?? ""
const traceState = draftValue !== recordedValue
  ? "Edited, not recorded"
  : recordedValue ? "Recorded" : "Not recorded"
```

Не менять текущую адресацию traces по ident code и не изобретать поддержку нескольких trace numbers на одну строку. После подтверждённой записи перечитать accepted evidence. Partial traces остаются допустимыми по `describeMaterialCheckGate`; не делать заполнение всех строк новым условием сохранения.

- [ ] Не добавлять обязательность QC-13, которой нет в текущем payload/gate. Существующие Issue QC-13 и Record traces остаются отдельными командами с видимыми результатами.
- [ ] В Welds над формой выбранного joint показать именно серверные факты: номер, `weldOn`, `wpsCode`, `welders`, `isLocked`, `obligationPending`, `pwhtRequired` / `pwhtAccepted`. Пустое значение — «не записано», а не значение из текущего draft.
- [ ] Сохранить folded joint table, Change joint, mounted hidden форму при поиске другого joint и текущую адаптивную сетку. Возврат к тому же joint сохраняет draft; выбор другого проходит guard и после подтверждения получает новый чистый draft, без переноса WPS/welders предыдущего joint.
- [ ] После успешного `recordWeldProgress` перечитать joints, обновить `selected` по тому же `weldJointRevisionId`, затем `loadSpoolStatus` и `setSpool`. Сейчас обновление списка само по себе не гарантирует обновление выбранной карточки и родительского процесса.
- [ ] В locked joint оставить явную причину и disabled записи. Не вводить запрет по одному только `weldOn`: текущее право корректировки определяется действующим gate/RPC, а не новым UI-правилом.

**Приёмка:** заполненные поля не объявляются выполненной стадией до серверной записи. После refresh выбранный joint и процесс показывают новое подтверждённое состояние. Длинная BOM-таблица не прячет действие сохранения; поиск joint не заставляет пролистывать его форму.

## 7. Задача 5 — Paint и Laydown

**Файлы:** `paint-laydown-screen.tsx`, CSS.

- [ ] В Paint сверху показать три существующих стадии и их серверные даты: Sent to Paint, Painted, Final QC. Под ними — условие следующей команды. Если нет QC release, предложить доступный переход к QC release через тот же callback/standalone-link контракт.
- [ ] Развести дату отправки и дату окраски. Добавить state `sentToPaintOn` с тем же исходным `today()`, отдельное поле `Sent to Paint on`; отправлять его только в существующий `recordConstructionProgress(..., "sent_to_paint", sentToPaintOn, ...)`. Сейчас туда передаётся `paintedOn`, что неочевидно для пользователя. Payload RPC не меняется.
- [ ] Сохранить правило `describePaintGate`: без Sent to Paint нельзя записать painting; введённый DFT ниже нормы блокирует; при введённом DFT нужен W10P. Пустой DFT остаётся `null`. Не делать DFT, W10P или Final QC обязательными всегда.
- [ ] Существующий `recordPaintProgress` продолжает получать `painted_on` и только введённые optional-поля `final_qc_on`, `measured_dft_microns`, `w10p_form_number`. Не добавлять независимую команду Final QC или оптимистическую дату, которых сейчас нет.
- [ ] Разместить Record Sent to Paint рядом с его датой; Record painting — в доступной панели действий рабочей области. Завершённые стадии показывать как факты, а разрешённые повторные действия определять действующим контрактом, без новых запретов.
- [ ] В Laydown показать Final QC с датой или blocker `Record final QC before laydown` с переходом в Paint. Location и Stored on держать рядом с Record laydown. После записи показывать `spool.dates.laydown` и понятное завершение Fabrication.
- [ ] Не выдавать выбранную в draft location за записанную серверную location: `SpoolStatus` содержит дату Laydown, но не location. Новый ledger-запрос ради этой сводки не нужен.

**Приёмка:** пользователь различает отправку, окраску и финальный QC. До Final QC Laydown заблокирован с понятным действием. Существующие partial painting payload остаются допустимыми.

## 8. Задача 6 — компоновка и проверка результата

**Файлы:** CSS, при выявленной необходимости `spool-drawer.tsx`; обновить текущую design-spec фактическим результатом.

- [ ] Использовать текущие paper-токены, типографику и плотность. Статусы обозначать текстом и цветом, blockers — компактными строками, не набором больших карточек на каждый факт.
- [ ] На desktop статусы release и форма решения видны без длинного вертикального вступления. Длинные таблицы листаются в рабочей области; header и процесс остаются на месте. Sticky action strip не перекрывает последнюю строку формы: дать необходимый нижний padding.
- [ ] На узких/низких экранах сохранить компактную process rail. Не создавать вторую длинную вертикальную timeline внутри operation. При 390×844, 1280×720 и 1728×907 нет горизонтального overflow страницы, Close достижим, focused input и CTA не закрыты sticky-панелью.
- [ ] Проверить overlay-геометрию: при desktop ширина таблицы до/после открытия одинакова; drawer top=0, right=viewport width, bottom=viewport height; Expand/Restore не меняют размеры таблицы. На mobile drawer равен viewport.
- [ ] Проверить Tab/Shift+Tab, Escape, backdrop, Close, Stay/Leave в guard и возврат фокуса. При открытом AlertDialog фокус и Escape принадлежат ему; drawer не должен закрываться второй раз вслед за диалогом.

Технические проверки из корня проекта:

```zsh
npm run typecheck
npx eslint modules/construction/ui/spool-drawer.tsx modules/construction/ui/fabrication/fabrication-workbench.tsx modules/construction/ui/fabrication/use-context-spool.ts modules/construction/ui/fabrication/release-checks.ts modules/construction/ui/fabrication/release-checks.test.ts modules/construction/ui/fabrication/qc-release-screen.tsx modules/construction/ui/fabrication/material-check-screen.tsx modules/construction/ui/fabrication/weld-progress-screen.tsx modules/construction/ui/fabrication/paint-laydown-screen.tsx components/pipeqc/unsaved-input-guard.tsx
npm run test:unit
npm run build
```

Ожидание: exit 0, без новых lint warnings в изменённых строках. Текущее количество unit-тестов не фиксировать как контракт: важны отсутствие регрессий и новые смысловые проверки. Старые предупреждения отдельно указать, не скрывать и не исправлять чужие подсистемы заодно. `npm run verify` с pgTAP и database reset для этого UI-прохода не требуются.

Браузерная приёмка — обязательная отдельная проверка, typecheck/build её не заменяют. Использовать имеющуюся авторизованную локальную сессию и существующие данные только для чтения. Ошибку и pending RPC проверять сетевым перехватом в выделенной QA-вкладке: request не должен достигнуть БД. Для успешной записи использовать полностью изолированную mock-сессию с согласованными mock-ответами чтения; такую проверку описывать как mock, не как реальную DB-приёмку. Если нет подходящих данных/среды, честно отметить конкретные сценарии непроверенными, без самовольного seed/reset.

| Сценарий | Ожидаемый результат |
| --- | --- |
| Неполные material + NDE + PWHT | Три самостоятельных blocker-действия |
| Пустой BOM | Release заблокирован, показан `No bill of materials` |
| Нулевые supports/joints | Они не дают ложные блокеры |
| Superseded revision | Причина видна, запись недоступна |
| Loading / ошибка evidence | Нет ложного завершения; доступен Retry |
| Ready, ещё не released | Дата и QC release доступны по gate |
| Уже QC released | Показана серверная дата, повторный release недоступен |
| Material/weld resolution | Тот же спул, guarded смена `op` |
| NDE и возврат | Фильтр текущего спула; исходный URL восстановлен |
| Недоступная операция по роли | Пояснение, без активного перехода |
| Ошибка RPC после ввода | Draft остаётся, guard при уходе остаётся |
| Быстрый двойной клик | Один запрос команды |
| Успех RPC / ошибка refresh | Запись не предлагается повторять, предлагается refresh |
| Смена evidence | Скрытый PWHT-ввод сохранён |
| Запись supports при PWHT draft | PWHT draft всё ещё считается незаписанным |
| Смена joint и спула | Нет чужого draft, stale response не попадает в новый объект |
| Paint: пустой DFT / низкий DFT / DFT без W10P | Существующие правила сохранены |
| Нет Final QC / есть Final QC | Laydown соответственно заблокирован / доступен |
| Desktop/mobile и длинная таблица | Overlay, постоянный процесс, доступные действия |

## 9. Отчёт исполнителя и завершение

- [ ] Обновить `docs/superpowers/specs/2026-10-06-fabrication-drawer-design.md`: что реально изменено, команды проверок, результаты браузера и ограничения.
- [ ] Передать список затронутых файлов и краткое описание итогового поведения каждой операции.
- [ ] Приложить скриншоты QC release с блокерами, формы выбранного joint, Paint/Laydown и mobile drawer. Секреты и данные аутентификации в кадр не включать.
- [ ] Отдельно перечислить реальные browser-проверки, mock-проверки и непроверенные сценарии. Создание файлов или сообщение `task_complete` без результатов проверок не означает завершение.
- [ ] Подтвердить: overlay сохранён, таблица не сжимается, восемь стадий сохранены, gates/RPC не изменены, БД и ROMS не изменялись, Git-операций/публикации не было.

Результат этого плана — законченный локальный проход по Fabrication drawer. Erection и дальнейший редизайн портала в отчёт как выполненные задачи не включать.
