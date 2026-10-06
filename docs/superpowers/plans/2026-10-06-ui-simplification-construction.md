# UI Simplification — Fabrication, Erection, Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать с экранов всё, что повторяется, не нужно сейчас или объясняет внутреннее устройство. Оператор видит спул, следующий шаг и одно действие.

**Architecture:** Меняется только интерфейс: компоненты React, тексты и одна общая доработка таблицы. Сервер, миграции, репозитории и права не трогаются.

Принцип для каждого экрана:
- **сделанный шаг** — только записанные факты, без полей и кнопок;
- **шаг, заблокированный предыдущим** — одна строка причины и ссылка на этот шаг;
- **шаг, который можно записать** — форма и одна главная кнопка.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4 + существующие CSS-модули, `node:test`, Playwright (только чтение, для снимков). Новых зависимостей нет.

**Spec:** раздел «Аудит» ниже. Его делал Claude 2026-10-06 по навыку `ux-heuristics` на живом стенде SHOWCASE-1; снимки «до» лежат в `tasks/ui-audit/baseline/`. Правила бэкенда — в `AGENTS.md`.

---

## Аудит (2026-10-06)

Оценка по эвристикам: **6/10**. Навигация и выбор спула в панели уже правильные. Что мешает: одно и то же показано по три раза, формы видны там, где действовать нельзя, а на экране остаётся язык разработчиков.

Серьёзность по шкале навыка: 1 — косметика, 2 — замедляет, 3 — мешает выполнить задачу.

| # | Проблема | Где видно (снимок) | Эвристика | Серьёзность |
|---|---|---|---|---|
| F1 | Панель спула показывает состояние трижды: значок в шапке, полоса из 6 плиток (Material lines, Shop welds, Supports, NDE open, PWHT open, Releasable) и шкала этапов. Подписи шкалы повторяют название шага («QC release / QC Release», «Laydown / Laydown», «Erected / Erected»). Справа под заголовком операции даты повторяются ещё раз. **Значок в шапке показывает последний сделанный этап («Material Check»), а шкала — следующий («Shop welds — Next»): это противоречие.** | `04-fab-drawer-default`, `08-erection-drawer-default` | 8 минимализм, 4 согласованность | 3 |
| F2 | Заблокированный шаг показывает всю форму. Paint до QC release: 6 полей, кнопки и красная ошибка «Select the line service so the paint matrix rule can be resolved» до того, как человек что-то ввёл. | `05-fab-drawer-4-paint` | 5 предотвращение ошибок, 8 | 3 |
| F3 | Сделанный шаг показывает поля и подсказки к ним. Material полностью записан, но видны «Recording date», неактивная «Record Start Fab», «Issue QC-13» и строка «Select at least one registered material trace.». Field material записан, но поле «Date checked» можно редактировать. | `05-fab-drawer-1-material`, `09-erection-drawer-2-field-material` | 1 видимость состояния, 8 | 3 |
| F4 | Объяснения на языке разработчиков: «A spool revision carries one material check whichever phase performed it…», «Material Check is derived, not entered…», «Derived from the criteria above, never set by hand.», «Auto-derived from field weld…», «Laydown is not QC release.», «…so this is not an acceptance rate», «No Test Packs visible in this project scope.». | `09-…-field-material`, `08-…`, `10-erection-rft`, `02-overview`, `12-testpack-list` | 2 язык пользователя, закон «убери половину слов» | 2 |
| F5 | Сырые коды статусов: «Qc release», «Rft», «rft». | `03-fabrication-list`, `07-erection-list`, `08-…` | 2, 4 | 2 |
| F6 | В Erection четыре вкладки (Spools, Ready for Test, Dashboard, Flange Progress). «Ready for Test» — тот же список спулов с другой колонкой. | `07-erection-list`, `10-erection-rft` | 8, 4 | 2 |
| F7 | Под каждым пунктом полосы этапов подписи «Stage 01», «Shared service», «Project»; у сервисов — пунктирные рамки. Это шум вокруг 10 пунктов навигации. | все экраны | 8 | 2 |
| F8 | Обвязка таблиц везде одинаковая: поиск, «Default», «Columns», выбор числа строк и пагинация. Так даже для 7 стыков в панели, а у пустой таблицы видны все заголовки колонок. | `04-…`, `12-testpack-list`, `15-mobile-fab-drawer` | 8 | 2 |
| F9 | Счётчики противоречат этапам. «Field welds 0 of 2» стоит рядом с записанным Welded / Bolted и спулом в состоянии Ready for Test. | `08-…`, `10-erection-rft` | 4, 1 | 2 |
| F10 | В обзоре четыре пустые карточки (Tracking, Flanges, Project Setup, Reports) занимают около 40% карты процесса. | `02-overview` | 8 | 1 |
| F11 | В панели QC release, кроме списка проверок с кнопками действий, есть второй ряд «Supports 1 open · NDE 4 open · PWHT 0 open» и встроенная таблица. Одно и то же двумя способами. | `05-fab-drawer-3-qc-release` | 8 | 2 |
| F12 | В Shop welds под таблицей стыков пустая рамка с текстом «Select a weld joint above to record its progress.». | `04-…` | 8 | 1 |

**Позже, отдельным планом (фаза B):** NDE (две большие таблицы на одной странице, жаргон «Status (manual): HS»), вкладки Test Pack (Dashboard / Builder / Explorer / Pressure Test), Spooling, слой подсказок, сведение CSS-модулей. **В этот план не входит.**

**Число слов и кнопок «до»** (`tasks/ui-audit/baseline/metrics.json`; слова и кнопки — внутри панели или `main`):

| Экран | Слова | Кнопки | Поля |
|---|---|---|---|
| 04 панель Fabrication по умолчанию (Shop welds) | 167 | 35 | 2 |
| 05 Material (записан) | 145 | 10 | 1 |
| 05 QC release (заблокирован) | 139 | 14 | 1 |
| 05 Paint (заблокирован) | 157 | 10 | 6 |
| 08 панель Erection по умолчанию (RFT) | 111 | 8 | 0 |
| 09 Field material (записан) | 203 | 8 | 1 |
| 02 обзор | 164 | 0 | 0 |

---

## Решения владельца (по умолчанию — как ниже; владелец может изменить до запуска)

- **D1.** Полоса из 6 плиток удаляется. Её данные остаются: в шкале этапов, в проверках QC release и в шаге Ready for Test.
- **D2.** Вкладка «Ready for Test» в Erection убирается. Её колонка с причинами переезжает в список Spools. Адрес `/erection/rft` продолжает работать и открывает тот же рабочий экран.
- **D3.** Счётчики («Field welds 0 of 2», «Lines checked 2 of 2», «Field supports 0 of 1») уходят из шкалы этапов. Там остаются только даты этапов. Таблицы и счётчики живут внутри своего шага.
- **D4.** Подписи «Stage 0N / Shared service / Project» в полосе этапов убираются. Разделители групп остаются.

---

## Global Constraints

- **Только интерфейс.** Нельзя менять `supabase/**`, `lib/supabase/**`, `modules/*/infrastructure/**`, права, RPC и SQL. В `modules/*/domain` и `modules/*/application` можно добавлять только чистые функции для отображения.
- **Живой стенд (SHOWCASE-1 на 543xx) — только чтение.**
  - Запрещены `demo:prepare`, `demo:showcase`, `supabase db reset`, `npm run verify` и `npm run test:db`.
  - В браузере не нажимать Record, Save, Issue, Mark installed и другие кнопки записи.
- Секреты — по `AGENTS.md`. Пароль для скрипта снимков берётся из `.env.local` через `--env-file-if-exists`. Его нельзя печатать, вводить руками или записывать.
- Тексты интерфейса — на английском, в sentence case. Названия этапов — только из `stageLabel` (`modules/construction/domain/construction-phase.ts`) или из одной функции для Erection (Task 1).
- Старые адреса страниц продолжают работать.
- Новых зависимостей нет.
- Ветка `feat/unified-workspace`. Коммит — после каждой задачи. Без push.
- После каждой задачи: `npm run typecheck`, `npx eslint <изменённые папки>` (0 ошибок), `npm run test:unit` — всё с кодом 0.
- Не трогать `modules/pressure-test/**`, кроме двух текстов из Task 1, пустого состояния из Task 4 и `modules/quality/**` (одна строка в Task 1).

## Review Focus

1. **Частично записанный шаг** (например, Paint: Sent to Paint записан, Painted нет) — это не «сделан». Нужна форма для оставшегося подэтапа. Сделанным считается шаг, у которого записаны **все** его этапы (`operationState === "done"`). Проверка — Task 3a, спул в состоянии Painted или QC release на SHOWCASE-1.
2. **Шаг, у которого открыты собственные условия** (QC release: открытые NDE и Supports) — не то же самое, что «заблокирован предыдущим шагом». Список проверок с кнопками остаётся. Проверка — Task 3a.
3. **Пользователь без права записи** видит записанные данные и уведомление «Recording … is not part of your project access». Ничего из видимого раньше не пропадает. Проверка — Task 3, правило скрывать поля по признаку «можно записать», а не по праву чтения.
4. **Ширина 390 px:** после удаления плиток сразу видна шкала этапов, горизонтальной прокрутки страницы нет. Проверка — Task 6, снимок `15-mobile-fab-drawer`.
5. **Пустые данные** (спул без BOM, без стыков; проект без тест-пакетов): одна строка и, если есть, одно действие. Никакой пустой таблицы с заголовками. Проверка — Task 4.

---

### Task 1: Words and labels

**Files:**
- Modify: `modules/home/ui/home-executive-overview.tsx:252,282`
- Modify: `modules/construction/ui/erection/erection-rft-panel.tsx:164`
- Modify: `modules/construction/ui/erection/field-material-check-screen.tsx:256-258,430-432` (the two explanatory paragraphs)
- Modify: `app/erection/rft/page.tsx:9`
- Modify: `modules/quality/ui/nde-batch-screen.tsx:349`
- Modify: `modules/pressure-test/ui/test-pack-workbench.tsx:398,413`
- Modify: `modules/construction/application/describe-erection-readiness.ts` — add a display helper
- Modify: every place that renders a fabrication or erection stage code with `StatusBadge` (`grep -rn "StatusBadge" modules/construction/ui`)
- Test: `modules/construction/application/describe-erection-readiness.test.ts` (exists — append the new test, keep the existing ones)
- Callers of `currentErectionStageLabel` to switch to the label: `modules/construction/ui/erection/erection-readiness-screen.tsx:128-132`, `modules/construction/ui/erection/field-spool-picker.tsx:59-63`, `modules/construction/ui/erection/erection-workbench.tsx:156`. In list columns `value:` (used by search and filters) returns the label too, so filters show operator words.

**Interfaces:**
- Produces: `export function erectionStageDisplay(facts: ErectionReadinessFacts): { code: string; label: string }`. Codes stay as they are today (`"rft"`, `"supported"`, `"welded/bolted"`, `"erected"`, `"to site"`, `"not started"`). Labels are `"Ready for Test"`, `"Supported"`, `"Welded / Bolted"`, `"Erected"`, `"To site"`, `"Not started"`.

- [ ] **Step 1: Failing test**

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { erectionStageDisplay } from "./describe-erection-readiness"

const base = { toSiteOn: null, erectedOn: null, weldedBoltedOn: null, supportedOn: null, ndePending: 0, pwhtPending: 0, isRft: false, rftOn: null }

test("erection stage has an operator label next to its code", () => {
  assert.deepEqual(erectionStageDisplay({ ...base, isRft: true }), { code: "rft", label: "Ready for Test" })
  assert.deepEqual(erectionStageDisplay({ ...base, weldedBoltedOn: "2026-08-24" }), { code: "welded/bolted", label: "Welded / Bolted" })
  assert.deepEqual(erectionStageDisplay(base), { code: "not started", label: "Not started" })
})
```

Run: `node --import tsx --test modules/construction/application/describe-erection-readiness.test.ts`. Expected: FAIL, because the function does not exist yet.

- [ ] **Step 2: Implement**

In `describe-erection-readiness.ts`:

```ts
const ERECTION_STAGE_LABELS: Record<string, string> = {
  rft: "Ready for Test", supported: "Supported", "welded/bolted": "Welded / Bolted",
  erected: "Erected", "to site": "To site", "not started": "Not started",
}

/** The stage code (for the badge tone) and the operator's word for it. */
export function erectionStageDisplay(facts: ErectionReadinessFacts): { code: string; label: string } {
  const code = currentErectionStageLabel(facts)
  return { code, label: ERECTION_STAGE_LABELS[code] ?? code }
}
```

Everywhere a stage is shown in a badge, the tone keeps the code (`status={code}`) and the text comes from `label`:
- Fabrication: `label={stageLabel(stage)}`.
- Erection: `label={erectionStageDisplay(row).label}`.

That includes the list columns in both workbenches and the drawer header in `erection-workbench.tsx:156`. After this, no screen shows «Qc release», «Rft» or «rft».

- [ ] **Step 3: Remove the developer explanations**

| Where | Change |
|---|---|
| `home-executive-overview.tsx:252` | Delete the `note` (Laydown is not QC release). |
| `home-executive-overview.tsx:282` | The line becomes `${data.issued} awaiting a result`. |
| `erection-rft-panel.tsx:164` | `Ready for Test since <date>.` — drop the second sentence. |
| `field-material-check-screen.tsx` | Delete both paragraphs (the «A spool revision carries…» one and the «Material Check is derived, not entered…» one). |
| `app/erection/rft/page.tsx:9` | Delete the `description`. |
| `nde-batch-screen.tsx:349` | Delete the subtitle paragraph. |
| `test-pack-workbench.tsx:398` | Delete the subtitle paragraph. |
| `test-pack-workbench.tsx:413` | `emptyTitle="No test packs yet."` |

Run `grep -rnE "whichever phase|derived, not entered|never set by hand|Auto-derived|not QC release|acceptance rate|project scope" modules app components`. Expected: no hits.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npx eslint modules/construction modules/home app/erection && npm run test:unit` → exit 0.

```bash
git commit -am "refactor(ui): operator labels for stages, drop developer explanations"
```

---

### Task 2: Drawer header, timeline, no facts strip

**Files:**
- Modify: `modules/construction/ui/spool-drawer.tsx` — `SpoolTimeline` and the operation header; delete `FactsStrip`
- Modify: `modules/construction/ui/spool-workbench.module.css` — delete `.factsStrip` and the `.operationState` / `.operationDates` rules if they become unused
- Modify: `modules/construction/ui/fabrication/fabrication-workbench.tsx:150-200` — remove `<FactsStrip>` and the `spoolFacts` helper; change the header badge
- Modify: `modules/construction/ui/erection/erection-workbench.tsx:150-170` — same
- Create: `modules/construction/ui/timeline-lines.ts`, `modules/construction/ui/timeline-lines.test.ts`

**Interfaces:**
- Produces: `export function timelineLines(title: string, lines: readonly { label: string; value: string | null }[]): { label: string; value: string | null }[]`. It drops lines whose label equals the step title. The comparison ignores case, spaces and the `/` sign.
- Produces: header badge text. Fabrication shows `Next: <operation title>` (from `nextOperation(spool.dates)`), or `Fabrication complete` once Laydown is recorded. Erection shows `Next: <step title>`, or `Ready for Test` once RFT.

- [ ] **Step 1: Failing test** (`timeline-lines.test.ts`)

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { timelineLines } from "./timeline-lines"

test("a line that only repeats the step title is dropped", () => {
  assert.deepEqual(timelineLines("QC release", [{ label: "QC Release", value: null }]), [])
  assert.deepEqual(timelineLines("Welded / Bolted", [{ label: "Welded/Bolted", value: "2026-08-24" }]), [])
})

test("lines that add information stay", () => {
  const lines = [{ label: "Start Fab", value: "2026-08-25" }, { label: "Material Check", value: "2026-08-27" }]
  assert.deepEqual(timelineLines("Material", lines), lines)
})
```

Run: `node --import tsx --test modules/construction/ui/timeline-lines.test.ts`. Expected: FAIL, because the module does not exist yet.

- [ ] **Step 2: Implement**

```ts
const norm = (text: string) => text.toLowerCase().replace(/[\s/]+/g, "")

/** Timeline sub-lines worth showing: a line that only repeats its step's title adds nothing. */
export function timelineLines(title: string, lines: readonly { label: string; value: string | null }[]) {
  return lines.filter((line) => norm(line.label) !== norm(title))
}
```

In `SpoolTimeline`:
- the step renders `timelineLines(step.title, step.lines)`; when the result is empty and the step has a single date, show that date on the title row;
- in the operation header (right column), delete `operationState` («Next to record / Recorded / Not recorded») and `operationDates`. Only the step title remains. The step state is already in the timeline.

- [ ] **Step 3: Workbenches**

- Remove `<FactsStrip …/>` and the `spoolFacts(…)` helper from both workbenches. Delete `FactsStrip` from `spool-drawer.tsx` and its CSS.
- Header badge (D1): `status={<span className={styles.stageBadge}>{nextLabel}</span>}`, with `nextLabel` as described in **Interfaces**.
- Erection timeline (D3): `lines` hold only stage dates. Delete the count lines («Lines checked …», «Field welds …», «Field supports …»).

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npx eslint modules/construction && npm run test:unit` → exit 0. Then: `grep -rn "FactsStrip\|spoolFacts" modules` → no hits.

```bash
git commit -am "refactor(ui): one place for spool state — no facts strip, timeline without repeats"
```

---

### Task 3a: Fabrication operation panels — done, blocked, actionable

**Files:**
- Create: `modules/construction/ui/panel-mode.ts`, `modules/construction/ui/panel-mode.test.ts`
- Modify: `modules/construction/ui/fabrication/material-check-screen.tsx`, `weld-progress-screen.tsx`, `qc-release-screen.tsx`, `paint-laydown-screen.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type PanelMode = "done" | "blocked" | "actionable"
  export function panelMode(input: { allRecorded: boolean; blockedBy: string | null }): PanelMode
  ```
  - `allRecorded` → `"done"`;
  - otherwise `blockedBy !== null` → `"blocked"`;
  - otherwise `"actionable"`.

  `blockedBy` is the title of the earlier step that must be recorded first. It is **not** this step's own open checks (Review Focus 2).

- [ ] **Step 1: Failing test** (`panel-mode.test.ts`)

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { panelMode } from "./panel-mode"

test("panel mode", () => {
  assert.equal(panelMode({ allRecorded: true, blockedBy: "QC release" }), "done")
  assert.equal(panelMode({ allRecorded: false, blockedBy: "QC release" }), "blocked")
  assert.equal(panelMode({ allRecorded: false, blockedBy: null }), "actionable")
})
```

Run: `node --import tsx --test modules/construction/ui/panel-mode.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement `panel-mode.ts`** as described in **Interfaces**: three lines, no React.

- [ ] **Step 3: Apply the three modes**

The rule for every panel: a control that cannot be used right now is not rendered. A red error appears only after an attempt to record.

| Screen | done | blocked | actionable |
|---|---|---|---|
| `material-check-screen.tsx` | The BOM table read-only, plus one line `Start Fab <date> · Material check <date> · QC-13 <number or —>`. Hide «Recording date», «Record Start Fab», «Issue QC-13», the «Material check complete…» banner and the gate reason. | Not applicable: this is the first step. | As today. The gate reason («Select at least one…») is shown only as a hint next to a disabled Record button, and only while unrecorded rows exist. |
| `weld-progress-screen.tsx` | Joint table read-only. | Not applicable. | Remove the empty box «Select a weld joint above…». Without a selected joint nothing is shown under the table. |
| `qc-release-screen.tsx` | Line `QC released <date>`, checks collapsed. | When `fabricated` is not recorded: one line `Shop welds must be complete first` plus the `Open Shop welds` button. | Keep the «Release decision» checks list and its buttons. **Delete the chip row** «Supports · NDE · PWHT» (F11). The embedded Supports panel opens only from the «Resolve in Supports» button on the check row. |
| `paint-laydown-screen.tsx` (Paint) | Line `Sent <date> · Painted <date> · Final QC <date>`. | No QC release: only the line `QC release is required before painting` plus `Open QC release`. No form, no «Not recorded» strip. | Show only the form of the next unrecorded sub-stage (Review Focus 1). The line-service error appears only after a press of Record painting. |
| `paint-laydown-screen.tsx` (Laydown) | Line `Placed in laydown <date>`. | Paint or Final QC missing: one line plus a link to Paint. | Date and the Record button. |

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npx eslint modules/construction && npm run test:unit` → exit 0.

```bash
git commit -am "refactor(ui): fabrication panels show done, blocked or actionable — nothing else"
```

---

### Task 3b: Erection operation panels — same rule

**Files:**
- Modify: `modules/construction/ui/erection/field-material-check-screen.tsx`, `erection-stage-card.tsx`, `erection-stage-screen.tsx`, `field-weld-progress-screen.tsx`, `field-support-progress-screen.tsx`, `erection-rft-panel.tsx`

**Interfaces:**
- Consumes: `panelMode` from Task 3a.

- [ ] **Step 1: Apply**

| Screen | done | blocked | actionable |
|---|---|---|---|
| Field material | The BOM table read-only, plus the line `Checked <date> · QC-13 <number or —>`. Hide «Date checked» and the gate reason. | No To Site: the line `Record To Site first` plus `Open To site`. | As today, but without explanatory paragraphs (already removed in Task 1). |
| To site / Erected / Supported (`erection-stage-card.tsx`, `erection-stage-screen.tsx`) | Line `Recorded <date>`. | Previous milestone not recorded: one line plus a link. | Date and the Record button. |
| Welded / Bolted (`field-weld-progress-screen.tsx`) | Line `Recorded <date>`. The joint table stays read-only, titled «Field weld joints», with no counter in the timeline (D3). | As above. | The milestone is recorded first (primary button). The joint table sits below. |
| Ready for Test (`erection-rft-panel.tsx`) | The four checks and `Ready for Test since <date>.` | — | The open checks with links (as today). |

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npx eslint modules/construction && npm run test:unit` → exit 0.

```bash
git commit -am "refactor(ui): erection panels show done, blocked or actionable — nothing else"
```

---

### Task 4: Table chrome that matches the table

**Files:**
- Create: `components/ui/data-table/table-chrome.ts`, `components/ui/data-table/table-chrome.test.ts`
- Modify: `components/ui/data-table/data-table.tsx` — use it; add `variant` and `emptyAction`
- Modify: `components/ui/data-table/data-table-toolbar.tsx` — accept `showSearch` and `showViewControls`
- Modify: `weld-progress-screen.tsx`, `field-weld-progress-screen.tsx` (and any other `DataTable` inside the spool drawer) — `variant="compact"`
- Modify: `modules/pressure-test/ui/test-pack-workbench.tsx` — `emptyAction` link «Create test pack» to the builder route via the existing `withProject` helper

**Interfaces:**
- Produces:
  ```ts
  export function tableChrome(input: {
    rowCount: number; filteredCount: number; pageSize: number; page: number
    hasQuery: boolean; variant: "full" | "compact"
  }): { showToolbar: boolean; showSearch: boolean; showViewControls: boolean; showPager: boolean; showHeader: boolean }
  ```
  Rules:
  - `rowCount === 0 && !hasQuery` → everything `false`. Only the empty state and `emptyAction` remain.
  - `showPager = filteredCount > pageSize || page > 0`. Without a pager, the footer shows only «N rows».
  - `variant === "compact"` → `showViewControls = false`, and `showSearch = rowCount > 10`.
  - `variant === "full"` → `showSearch = true`, `showViewControls = true`.
  - `showHeader = rowCount > 0 || hasQuery`.
- `DataTable` gets `variant?: "full" | "compact"` (default `"full"`) and `emptyAction?: React.ReactNode`.

- [ ] **Step 1: Failing test** (`table-chrome.test.ts`)

```ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { tableChrome } from "./table-chrome"

const base = { rowCount: 7, filteredCount: 7, pageSize: 25, page: 0, hasQuery: false, variant: "full" as const }

test("an empty table without a query is only its empty state", () => {
  assert.deepEqual(tableChrome({ ...base, rowCount: 0, filteredCount: 0 }),
    { showToolbar: false, showSearch: false, showViewControls: false, showPager: false, showHeader: false })
})
test("one page needs no pager", () => {
  assert.equal(tableChrome(base).showPager, false)
  assert.equal(tableChrome({ ...base, filteredCount: 30 }).showPager, true)
})
test("compact tables drop view controls and search under 11 rows", () => {
  const c = tableChrome({ ...base, variant: "compact" })
  assert.equal(c.showViewControls, false)
  assert.equal(c.showSearch, false)
  assert.equal(tableChrome({ ...base, variant: "compact", rowCount: 40, filteredCount: 40 }).showSearch, true)
})
test("a filtered empty result keeps the toolbar so the query can be cleared", () => {
  const c = tableChrome({ ...base, filteredCount: 0, hasQuery: true })
  assert.equal(c.showToolbar, true)
  assert.equal(c.showHeader, true)
})
```

Run: `node --import tsx --test components/ui/data-table/table-chrome.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement** `table-chrome.ts` by the rules above. Wire it into `DataTable`: the toolbar, the view/Columns buttons, the header row and the pager render according to the result. `hasQuery` is `state.search.trim() !== "" || state.filters.length > 0`.

- [ ] **Step 3: Apply `variant="compact"`** to the tables inside the spool drawer. Add `emptyAction` to the Test Pack list.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npx eslint components/ui modules/construction modules/pressure-test/ui/test-pack-workbench.tsx && npm run test:unit` → exit 0.

```bash
git commit -am "refactor(ui): table chrome follows the table — no pager for one page, compact drawer tables"
```

---

### Task 5: Navigation and overview

**Files:**
- Modify: `components/pipeqc/process-nav.tsx:43` — delete the subtitle line (D4)
- Modify: `config/navigation.ts` (the «Ready for Test» module tab near line 170) and `config/navigation.test.ts`
- Modify: `app/erection/rft/page.tsx` — render the Erection workbench, like the other old addresses
- Modify: the Erection spools list (`erection-workbench.tsx` list columns) — add a «Ready for Test» column. Reuse the cell from the readiness screen: «Ready <date>», or the first open reason as a link.
- Modify: `modules/home/ui/home-process-map.tsx` — Tracking, Flanges, Project Setup and Reports become one row of links under the process map instead of four cards

- [ ] **Step 1: Process rail.** The label under each item is removed. Groups stay, separated as today. Check `config/navigation.test.ts` and any test on `process-nav`: no test may depend on the text «Stage 0N».

- [ ] **Step 2: Erection tabs (D2).** Remove the «Ready for Test» module tab from the registry. `/erection/rft` opens the Erection workbench. The spools list gets the «Ready for Test» column. Update `config/navigation.test.ts`: the module tabs of Erection are Spools, Dashboard and Flange Progress. Old addresses still resolve.

- [ ] **Step 3: Overview.** Show the four secondary areas as one line of links (`Tracking · Flanges · Project Setup · Reports`) under the map, permission-filtered exactly as today. The NDE card stays, because it has data.

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npx eslint components/pipeqc config modules/home modules/construction app/erection && npm run test:unit` → exit 0.

```bash
git commit -am "refactor(ui): quieter process rail, Ready for Test in the spools list, compact overview"
```

---

### Task 6: Evidence — before and after

**Files:**
- Create: `docs/superpowers/specs/2026-10-06-ui-simplification-result.md`
- Create: `docs/superpowers/specs/screenshots/ui-simplification/` (copies of the key «after» shots)

- [ ] **Step 1: Static checks.** Run `npm run lint && npm run typecheck && npm run test:unit && npm run build` → exit 0. Lint warnings are allowed; errors are not.

- [ ] **Step 2: Shots «after»** (read-only; the dev server on :3000 is already running — do not stop it):

```zsh
UI_AUDIT_OUT=after npx tsx --env-file-if-exists=.env.local tasks/ui-audit/capture.ts
```

Expected: exit 0, and `tasks/ui-audit/after/metrics.json` is written.

- [ ] **Step 3: Compare with the targets**

```zsh
python3 - <<'PY'
import json
b = json.load(open("tasks/ui-audit/baseline/metrics.json")); a = json.load(open("tasks/ui-audit/after/metrics.json"))
targets = {"04-fab-drawer-default": 120, "05-fab-drawer-1-material": 90, "05-fab-drawer-4-paint": 50,
           "08-erection-drawer-default": 80, "09-erection-drawer-2-field-material": 90, "02-overview": 130}
ok = True
for k, limit in targets.items():
    w = a.get(k, {}).get("words"); good = w is not None and w <= limit; ok &= good
    print(f"{'OK  ' if good else 'FAIL'} {k}: {b[k]['words']} -> {w} (target <= {limit})")
for k in ("05-fab-drawer-1-material", "05-fab-drawer-4-paint", "09-erection-drawer-2-field-material"):
    i = a.get(k, {}).get("inputs"); good = i == 0; ok &= good
    print(f"{'OK  ' if good else 'FAIL'} {k}: inputs {b[k]['inputs']} -> {i} (target 0)")
raise SystemExit(0 if ok else 1)
PY
```

Expected: every line `OK`, exit 0.

If a target is missed, look at the «after» screenshot and remove what this plan says to remove. **Do not** remove data the operator needs to pass the target.

- [ ] **Step 4: Look at the shots yourself.**
  - `15-mobile-fab-drawer`: the stepper is visible straight away, no tiles, no horizontal scroll.
  - `05-fab-drawer-3-qc-release`: the checks list is present and the chip row is gone.
  - `05-fab-drawer-4-paint`: one line and a link.
  - `12-testpack-list`: «No test packs yet.» and «Create test pack», no table headers.
  - Spools with partial Paint (SHOWCASE-1 rows in state «Qc release» or «Painted») keep a working form for the next sub-stage. Open them in the browser read-only and do not press anything.

- [ ] **Step 5: Result document.** In `2026-10-06-ui-simplification-result.md` write:
  - the before/after metrics table from Step 3;
  - the list of F1–F12 with the commit that closed each;
  - anything not done and why.

  Copy the «after» shots `04`, `05-*`, `08`, `09-*`, `02`, `15` to `docs/superpowers/specs/screenshots/ui-simplification/`.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-10-06-ui-simplification-result.md docs/superpowers/specs/screenshots/ui-simplification
git commit -m "docs(ui): simplification result with before/after metrics"
```

---

## Self-Review

- **Coverage:**
  - F1 → Task 2;
  - F2 and F3 → Task 3a and Task 3b;
  - F4 and F5 → Task 1;
  - F6 and F7 → Task 5;
  - F8 → Task 4;
  - F9 → Task 2 (D3) and Task 3b;
  - F10 → Task 5;
  - F11 and F12 → Task 3a.

  NDE, Test Pack tabs, Spooling, the help layer and CSS are explicitly phase B.
- **Review Focus:**
  - item 1 → Task 3a (Paint actionable) and Task 6, Step 4;
  - item 2 → the QC release row of the Task 3a table;
  - item 3 → the rule «hide what cannot be used now», not «hide what cannot be read»;
  - item 4 → Task 6, Step 4;
  - item 5 → Task 4 (empty state) and Task 6, Step 4.
- **Types:**
  - `panelMode` (Task 3a) is used in Task 3b with the same signature;
  - `tableChrome` is used only inside `DataTable`;
  - `erectionStageDisplay` returns `{ code, label }` everywhere.
