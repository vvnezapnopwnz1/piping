# PipeQC IA Restructuring — Phase IA1

**Spooling Reframe (CC-22) + Assembly Architectural Decision (CC-26)**

> Сохрани файл в `docs/prompts/PipeQC_IA_Phase_IA1.md` репозитория.
> Это первая фаза IA-рестракчуринга по итогам чтения 10 EasyPiping
> презентаций. Дальше идут Role × Function × Interface × State матрица,
> Track H (Testpack Builder) и Track J (Subcontractor scope) — все они
> зависят от того, чтобы IA сначала встала ровно.

---

## Why now (read this first)

Исследование 10 EasyPiping презентаций
(`docs/research/presentation_findings.md`) выявило две **архитектурные
ошибки в текущем IA PipeQC**, которые дешевле починить сейчас, чем после
того как поверх них настроятся новые экраны:

1. **CC-22.** "Spooling" в EasyPiping означает **передачу
   isometric-документов от инжиниринга на стройку** (receive →
   checkout → spooled → checked → held/released → transmitted). НЕ
   "shop-floor работа со spool'ами". Shop-floor живёт в Fabrication
   (§7). Наш текущий `/spooling` — placeholder shell со смешанным
   фреймингом, который на демо вызовет вопрос *"а где у вас по сути
   spool-fabrication, отдельный от fabrication-модуля?"*.

2. **CC-26.** Assembly module в EasyPiping = literal duplicate of
   Erection с параметром `stage`. Тот же spool aggregate, те же 4
   sub-модуля, та же запись. EasyPiping заплатил цену двух модулей
   получив то, что должно было быть одним параметризованным модулем.
   Мы должны принять это как архитектурное решение **до**, а не после
   того, как кто-нибудь начнёт строить отдельный `/assembly` маршрут.

Эта фаза — **IA + docs + sidebar**. Никаких новых stores, никакой новой
business логики, никаких новых seed-данных beyond placeholder header
copy. Цель — 0.5–1 день работы, чисто реверсируемый, никаких
регрессий в Track A/B/C/G/I.

---

## Goal

1. **Spooling reframe:** превратить `/spooling` из single-page shell в
   nested sidebar с 4 sub-страницами, отражающими реальную доменную
   структуру (engineering-to-site document handoff). Существующий
   контент (Import / Browse / Revision) переезжает под правильную
   sub-страницу. Две новые placeholder-страницы (Engineering
   Transmittals + Spooling Transmittal) добавляются как stubs.

2. **Assembly architectural decision:** задокументировать в
   `PIPEQC_CONTEXT.md`, что Assembly = Erection-at-stage с параметром
   `stage ∈ {assembly, erection}`. **Никакого UI не добавлять.** Когда
   придёт time строить Assembly screens, они переиспользуют Erection
   шеллы через `stage` param.

3. **Documentation sync:** `MANUAL_COVERAGE_MATRIX.md` обновить так,
   чтобы §6 (Spooling) отражал sub-модуль структуру; добавить строку
   "Assembly (§ — none, modular projects)" с пометкой "shares Erection
   module".

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `docs/research/presentation_findings.md` § CC-22, CC-26, CC-29 | Доменное обоснование. CC-29 (shared spool aggregate) подкрепляет CC-26. |
| `docs/research/presentation_findings.md` секция "#8 Spooling — module-specific findings" | 8 sub-модулей в EasyPiping. Мы делаем 4 из них (минимально достаточная reframe-структура). |
| `docs/PIPEQC_CONTEXT.md` "File structure" + последние merge log entries про I10 / G6 | Прецеденты nested sidebar restructure. **Точно тот же паттерн** применяется к Spooling. |
| `config/navigation.ts` | Текущая Spooling запись — одна строка под `PREPARATION`. Restructure → nested children. |
| `app/spooling/page.tsx` | Single page рендерит `<SpoolingView>`. После IA1 этот route становится Home dashboard. |
| `components/spooling/spooling-view.tsx` | 5 табов (Import / Browse Latest / Browse History / Manual Revision / Validation Issues). Будут переразделены между двумя sub-страницами. |
| `components/spooling/spooling-import-panel.tsx`, `spooling-validation-table.tsx`, `spooling-revision-panel.tsx` | Существующие компоненты. Все переезжают, ничего НЕ удаляется. |
| `store/spooling-store.ts` | Persisted Zustand store. **НЕ ТРОГАТЬ** — store stays, переезжают только UI mounts. |
| `components/pipeqc/sidebar-nav.tsx` | Recursive `NavTreeItem` / `NavTreeSubItem` уже поддерживают nesting (после I10). Этого достаточно. **НЕ менять** sidebar component. |
| `docs/MANUAL_COVERAGE_MATRIX.md` | Строку §6 обновить под sub-модуль структуру. Добавить строку Assembly. |
| `docs/PROJECT_OVERVIEW.md` секция "Карта модулей" если есть | Если есть mapping модуль ↔ стадия, обновить Spooling row. |
| `docs/easy_piping_ia_sitemap.html` модуль 2 "Preparation · Spooling" | Опционально: визуальный референс target IA из EasyPiping. |

---

## Scope decisions (что мы ДЕЛАЕМ и что НЕ делаем)

### Делаем

- 1 уровень вложенности в sidebar для Spooling (Home / Engineering In / ISO Workflow / Spooling Transmittal Out)
- Placeholder pages для двух новых entries (Engineering Transmittals + Spooling Transmittal) с осмысленным header copy объясняющим что здесь будет
- Переезд существующего `<SpoolingView>` контента под `/spooling/iso-workflow`
- `/spooling` (Home) — small dashboard placeholder с context banner объясняющим что Spooling = engineering→site document handoff, плюс ссылками на 3 child screens
- Архитектурный merge log entry в `PIPEQC_CONTEXT.md` про CC-26 (Assembly)
- Обновление `MANUAL_COVERAGE_MATRIX.md`

### НЕ делаем

- **НЕ создаём** новые stores. `store/spooling-store.ts` остаётся как есть.
- **НЕ строим** реальные screens для Engineering Transmittals или Spooling Transmittal. Placeholder с header + объяснение "Будет построено в Track [TBD]" — достаточно.
- **НЕ трогаем** sidebar component (`components/pipeqc/sidebar-nav.tsx`). Recursive nesting уже работает после I10 / G6.
- **НЕ создаём** Assembly route. CC-26 явно: Assembly = stage param на Erection, не отдельный модуль.
- **НЕ меняем** routing existing screens (Fabrication, Erection, Testpack, Admin, NDE, Reports — всё неизменно).
- **НЕ удаляем** ни один существующий компонент. Только перепривязки mounts.
- **НЕ добавляем** seed-данные beyond placeholder header text.

---

## Target sidebar structure (after IA1)

```
SETUP
  Admin Module

PREPARATION
  Spooling                         ← was "Spooling Module", flat
    Home                           ← was /spooling content
    Engineering Transmittals       ← NEW placeholder
    ISO Workflow                   ← existing <SpoolingView> mounts here
    Spooling Transmittal           ← NEW placeholder

CONSTRUCTION
  Fabrication                       (unchanged — G6 structure)
    Dashboard
    Spool Fabrication
      Material Check
      QC Release
      Paint
      Laydown
    Welding
      Shop Weld Progress
  Erection                          (unchanged — I10 structure)
    Dashboard
    Spool Erection
      To Site
      Field Material Check
      Erected
      Welded / Bolted
      Supported
      RFT
    Welding
      Site Weld Progress
    Flange
      Flange Progress
  Tracking
  NDE Module

REPORTS
  Reports

TESTING
  Testpack
    Explorer
    Pressure Test
  Flange Management

CONFIGURATION
  Settings
  Documentation
```

**Note on Assembly:** не появляется в sidebar в этой фазе. Когда будет
готовность строить — добавится как **stage selector** внутри Erection
module (например, top-right toggle "Assembly | Erection"), не как
отдельная sidebar группа.

---

## Step-by-step

### Step 1 — Sidebar restructure (`config/navigation.ts`)

Заменить flat запись:

```ts
{
  title: 'PREPARATION',
  roles: ['spooling_team', 'project_manager'],
  items: [
    {
      title: 'Spooling Module',
      href: '/spooling',
      icon: Box,
    },
  ],
},
```

на nested структуру с children (точно так же как сделано для Fabrication
и Erection после G6 / I10):

```ts
{
  title: 'PREPARATION',
  roles: ['spooling_team', 'project_manager'],
  items: [
    {
      title: 'Spooling',
      href: '/spooling',
      icon: Box,
      children: [
        {
          title: 'Home',
          href: '/spooling',
          icon: LayoutDashboard,
        },
        {
          title: 'Engineering Transmittals',
          href: '/spooling/engineering-transmittals',
          icon: <pick: Inbox or Mail>,
        },
        {
          title: 'ISO Workflow',
          href: '/spooling/iso-workflow',
          icon: <pick: Workflow or GitBranch>,
        },
        {
          title: 'Spooling Transmittal',
          href: '/spooling/spooling-transmittal',
          icon: <pick: Send or Outbox>,
        },
      ],
    },
  ],
},
```

Выбери lucide-react иконки которые ещё **не использованы** в текущем
navigation.ts (читай import statement в начале файла). Recommended:
`Inbox` для Engineering Transmittals, `Workflow` для ISO Workflow,
`Send` для Spooling Transmittal. Проверь что они есть в lucide-react.

Импорты иконок добавь в существующий import statement в начале файла.

### Step 2 — Home page rewrite (`app/spooling/page.tsx`)

Заменить текущий `<SpoolingView>` mount на small Home dashboard.
Содержимое:

1. **Page header:** "Spooling" (h1) + 1-2 предложения объясняющих
   доменное значение модуля. Recommended copy:

   > "Spooling — это handoff isometric-документов от инжиниринга на
   > строительную площадку: приём, назначение spooler'у, проверка
   > revision, удержание при необходимости и outbound-передача batch'ами
   > на site. Shop-floor работа со spool'ами живёт отдельно в
   > **Fabrication**."

   Включи inline link на `/fabrication/dashboard` в слове Fabrication.

2. **3 navigation cards** (grid 1xl:3, по аналогии с density на других
   home-страницах — посмотри `app/testpack/pressure-test/page.tsx` или
   аналогичный home-card pattern):
   - Engineering Transmittals — *"Incoming iso releases from engineering"*
   - ISO Workflow — *"Receive, assign, check, hold, release isos"*
   - Spooling Transmittal — *"Outbound iso batches to construction site"*

   Каждая card кликабельна (Link на соответствующий route), показывает
   icon из sidebar config, title, описание.

3. **Optional small KPI strip** — если есть данные в `useSpoolingStore`
   (latestRows, issues), показать `Latest accepted: N · Pending issues:
   M · Last imported: <relative>`. Если store пустой — показать
   "No imports yet — load demo import from ISO Workflow."

Не добавляй S-curve chart, activity feed, или что-то ещё что
требует новых данных. Этого достаточно для IA1.

### Step 3 — ISO Workflow page (relocate existing)

Создать `app/spooling/iso-workflow/page.tsx`. Содержимое — точная копия
того, что **сейчас** в `app/spooling/page.tsx` (mount `<SpoolingView>`).

Никаких изменений в самом `<SpoolingView>` компоненте. Никаких
изменений в `<SpoolingImportPanel>`, `<SpoolingValidationTable>`,
`<SpoolingRevisionPanel>`. Никаких изменений в `store/spooling-store.ts`.

`<SpoolingView>` использует store через hooks — store работает
одинаково независимо от того, на каком route он смонтирован.

Опционально (если просто): обнови интро-banner внутри `<SpoolingView>`
(сейчас там — *"Spooling is the source-of-truth module for
weld/ISO/flange seed data in this demo shell"*) на что-то более
точное по CC-22:

> *"ISO Workflow — приём, проверка и outbound-handoff isometric-документов.
> Импорт через SpoolGen browser, валидация, hold/release flow, manual
> revision management. Outbound batches формируются в Spooling
> Transmittal."*

Это опционально и косметика — главное чтобы существующий контент
переехал без потери функциональности.

### Step 4 — Engineering Transmittals placeholder

Создать `app/spooling/engineering-transmittals/page.tsx`. Содержимое:

1. Page header "Engineering Transmittals"
2. Banner с context:
   > *"Здесь будут отображаться входящие transmittal'ы от инжиниринга
   > (новые isos и revision updates). Каждый transmittal — это batch
   > isos с metadata: rev #, дата release, source engineering team. После
   > acceptance isos попадают в ISO Workflow на checkout spooler'ам."*
3. Empty state table с заголовками:
   - Transmittal #
   - Received Date
   - Source (engineering team)
   - ISO Count
   - New / Revision
   - Status (Pending | Accepted | Held)
4. Под таблицей: placeholder "Будет имплементировано в Track [TBD]. См.
   docs/research/presentation_findings.md § Iso lifecycle (CC-21)."

Используй `<Card>` / shadcn-ui компоненты в density соответствующей
другим placeholder-screens в проекте (см. как сделан placeholder
`/testpack` или `/flange` если они есть как референс).

`"use client"` обязательно.

### Step 5 — Spooling Transmittal placeholder

Создать `app/spooling/spooling-transmittal/page.tsx`. Зеркальная
структура Step 4:

1. Page header "Spooling Transmittal"
2. Banner:
   > *"Outbound batches isos на site после Spooling release. Каждый
   > batch получает Spl. Trans. No., группируется по target системе
   > или PDS area, и формирует точку handoff на Fabrication. Это
   > противоположный конец Spooling-pipeline от Engineering Transmittals."*
3. Empty state table:
   - Spl. Trans. No.
   - Generated Date
   - Target System / Area
   - ISO Count
   - Released By
   - Status (Draft | Sent | Confirmed by Site)
4. Placeholder note "Будет имплементировано в Track [TBD]."

### Step 6 — Assembly architectural decision (docs only)

Добавить в `docs/PIPEQC_CONTEXT.md` в существующую секцию merge log
(в конец) новый entry:

````markdown
- **IA1** — Spooling reframe (CC-22) + Assembly architectural
  decision (CC-26). `/spooling` group в navigation сменена с flat
  single-page на nested 4-entry структуру: Home (route `/spooling`,
  rewritten as dashboard), Engineering Transmittals
  (`/spooling/engineering-transmittals`, placeholder), ISO Workflow
  (`/spooling/iso-workflow`, mounts existing `<SpoolingView>` без
  изменений), Spooling Transmittal (`/spooling/spooling-transmittal`,
  placeholder). Доменное значение Spooling explicit'но переформулировано
  как engineering→site document handoff (не shop-floor work — это
  Fabrication). **Architectural decision (Assembly):** Assembly module
  (per CC-26 из исследования EasyPiping #9) будет реализован как
  параметризованный режим Erection module с `stage ∈ {assembly,
  erection}`, а не как отдельный sidebar entry или route. Same spool
  aggregate, same 4 sub-modules, same screens — переключается через
  stage selector внутри Erection. Это решение принято сейчас чтобы
  никто не построил duplicate `/assembly` маршрут. Когда придёт время
  построить Assembly support, expand Erection module's pages с
  `?stage=` query param или контекст-провайдером.
  Никаких UI изменений в этой фазе beyond Spooling restructure.
  Никаких stores/seed/business-logic изменений. `store/spooling-store.ts`,
  `<SpoolingView>` и все его child components не модифицированы.
  Sidebar component (`components/pipeqc/sidebar-nav.tsx`) использует
  существующую recursive nesting поддержку (введена в I10).
````

(Adjust formatting под существующий стиль merge log в файле.)

### Step 7 — Manual Coverage Matrix update

В `docs/MANUAL_COVERAGE_MATRIX.md`, **replace** строку §6 Spooling.
Текущее значение примерно:

> §6 Spooling | Import spooling, validation, revision management |
> Spooling shell with demo import, validation rules table,
> latest/history, revision conflict actions | Demo shell | Medium |
> Add real parser + persistent file history

Заменить на (одна логическая строка может разбиться на 2 строки если
matrix structure требует):

> §6 Spooling — ISO Workflow | Receive, checkout, check, hold, release
> isos | `<SpoolingView>` под `/spooling/iso-workflow`: import demo +
> 5-tab validation/revision shell | Partial | Medium | Real SpoolGen
> import + iso lifecycle state machine (Track K candidate)

И добавить новые строки:

> §6 Spooling — Engineering Transmittals | Receive eng-side batches |
> Placeholder `/spooling/engineering-transmittals` | Placeholder | Low
> | Build out as part of iso lifecycle work
>
> §6 Spooling — Spooling Transmittal | Outbound iso batches to site |
> Placeholder `/spooling/spooling-transmittal` | Placeholder | Low |
> Build out as part of iso lifecycle work
>
> §12 Erection (with stage param) | Assembly = Erection at `stage:
> assembly` per CC-26 | Erection module covers both stages; Assembly
> stage UI not exposed yet | Architectural decision | Low | Add stage
> selector when modular-project demand surfaces

Если файл использует разделители или специфичный синтаксис — match
existing format. Не переформатируй весь matrix.

### Step 8 — PROJECT_OVERVIEW.md (if applicable)

Если в `docs/PROJECT_OVERVIEW.md` есть секция "Карта модулей" или
"Сущности и связи", где упоминается Spooling — обнови описание Spooling
на:

> Spooling — engineering→construction handoff isometric-документов:
> приёмка, назначение, проверка, hold/release, outbound batch'и на site.
> Содержит 4 экрана (Home / Engineering In / ISO Workflow / Spooling Out).
> Shop-floor работа со spool'ами — в Fabrication.

Если файла нет или такой секции нет — skip Step 8.

### Step 9 — documentation page (`app/documentation/page.tsx`)

Если есть таблица модулей с status, добавить/обновить строки:
- Spooling / Home (`/spooling`) — live (dashboard)
- Spooling / Engineering Transmittals — placeholder
- Spooling / ISO Workflow (`/spooling/iso-workflow`) — partial (демо
  import + validation/revision)
- Spooling / Spooling Transmittal — placeholder

Если есть Tracks & Stories tab, добавить IA1 как merged trackEntry.

Если файла нет или схема таблицы другая — skip / adjust.

---

## Constraints — DO NOT VIOLATE

1. **Никаких новых dependencies.** Используй только то что уже
   установлено (zustand, sonner, lucide-react, recharts, shadcn/ui).
2. **Все новые pages — `"use client"`** consistent with rest of app.
3. **НЕ модифицируй** `store/spooling-store.ts`, `<SpoolingView>`,
   `<SpoolingImportPanel>`, `<SpoolingValidationTable>`,
   `<SpoolingRevisionPanel>`. Они переезжают на новый route, не
   меняются.
4. **НЕ модифицируй** `components/pipeqc/sidebar-nav.tsx`. Recursive
   nesting уже работает.
5. **НЕ создавай** новые stores. Никаких новых Zustand персистов.
6. **НЕ добавляй** seed-данные beyond placeholder header text.
7. **НЕ ломай** existing routes. `/spooling` всё ещё валиден (становится
   Home). Существующий контент мигрирует на `/spooling/iso-workflow`.
8. **НЕ создавай** Assembly route, Assembly page, Assembly store. CC-26
   = architectural decision only.
9. **600–800 ms delay перед mutations** не нужен — в этой фазе нет
   mutations. Только nav + placeholder rendering.
10. **Никаких рефакторов вне scope.** Если видишь bug в unrelated
    файле — оставь комментарий, не правь.
11. **Сохраняй существующее role-visibility.** Группа `PREPARATION` уже
    ограничена `['spooling_team', 'project_manager']` — не менять.

---

## Acceptance criteria (manual browser checklist)

После `npm run dev`, fresh localStorage:

1. Sidebar показывает группу `PREPARATION` с одним top-level item
   `Spooling` (иконка Box).
2. Кликая на `Spooling` (или auto-expand если path startsWith
   `/spooling`) видны 4 sub-entries: Home / Engineering Transmittals /
   ISO Workflow / Spooling Transmittal. Каждая со своей иконкой.
3. Клик на `Home` — лендинг на `/spooling`. Заголовок "Spooling",
   context banner с правильным фреймингом, 3 navigation cards (для
   Engineering Transmittals / ISO Workflow / Spooling Transmittal).
4. Клик на любой card — переход на соответствующий sub-route.
5. На `/spooling/iso-workflow` — full `<SpoolingView>` рендерится **точно
   как раньше**: 5 tabs (Import / Browse Latest / Browse History /
   Manual Revision / Validation Issues), все панели работают.
6. На `/spooling/iso-workflow`, клик "Load demo import" (или аналог)
   заполняет latest / history / issues / revisionConflicts. Hard
   refresh — данные сохранились (persistent store работает).
7. На `/spooling/engineering-transmittals` — header + banner + empty
   table + placeholder note. Никаких ошибок в console.
8. На `/spooling/spooling-transmittal` — то же что Step 7 для
   outbound.
9. Sidebar active-state корректен на всех 4 sub-routes (highlight на
   правильной строке).
10. Sidebar `Spooling` parent show active state когда любой child route
    активен (по `isPathUnderItem` логике из I10).
11. Role-switch на `qc_engineer` или `nde_inspector` — Spooling группа
    скрыта (PREPARATION roles unchanged).
12. Role-switch на `spooling_team` — Spooling группа видна, 4
    sub-entries видны.
13. **Track A регрессия:** на role `qc_engineer`, пройти A1 flow
    (`/testpack/pressure-test/line-check/preparation` → assign 5 isos
    → progress → punch item). Ничего не сломалось.
14. **Track G регрессия:** на role `qc_engineer`,
    `/fabrication/dashboard` показывает funnel, KPIs живые. Material
    Check / QC Release / Paint / Laydown все доступны через sidebar.
15. **Track I регрессия:** на role `qc_engineer`, `/erection/dashboard`
    показывает Erection funnel. Spool Erection sub-modules (To Site /
    Field Material Check / etc.) все доступны через nested sidebar.
16. **Reset Demo** из top nav — все Spooling-данные сбрасываются (в
    том числе latest, history, issues, revisionConflicts). Возврат на
    `/spooling` показывает Home с "No imports yet" state.
17. `npx tsc --noEmit` — clean.
18. `npm run build` — clean. No Suspense warnings, no hydration warnings.
19. `git diff --stat store/ lib/` — должен быть пустой или с минимальными
    not-functional изменениями.
20. `git diff --stat components/spooling/` — может быть пустой или 1-2
    строки если ты обновлял intro-banner в `<SpoolingView>` (опционально
    из Step 3).

---

## Definition of done

- **New files** (expected):
  - `app/spooling/iso-workflow/page.tsx`
  - `app/spooling/engineering-transmittals/page.tsx`
  - `app/spooling/spooling-transmittal/page.tsx`
- **Modified files** (expected, exhaustive):
  - `app/spooling/page.tsx` — rewrite as Home dashboard.
  - `config/navigation.ts` — Spooling restructure + new icon imports.
  - `docs/PIPEQC_CONTEXT.md` — append IA1 merge log entry (включая
    Assembly architectural decision).
  - `docs/MANUAL_COVERAGE_MATRIX.md` — §6 Spooling rows update + new
    §12 Erection-with-stage row.
  - `docs/PROJECT_OVERVIEW.md` (only if applicable per Step 8).
  - `app/documentation/page.tsx` (only if applicable per Step 9).
  - Optionally: `components/spooling/spooling-view.tsx` (только intro
    banner, Step 3 optional).
- **NOT modified** (must remain byte-identical):
  - `store/spooling-store.ts`
  - `components/spooling/spooling-import-panel.tsx`
  - `components/spooling/spooling-validation-table.tsx`
  - `components/spooling/spooling-revision-panel.tsx`
  - `components/pipeqc/sidebar-nav.tsx`
  - Любой файл в `store/`, `lib/`, `app/fabrication/`, `app/erection/`,
    `app/testpack/`, `app/admin/`, `app/nde/`, `app/tracking/`,
    `app/reports/`.
- Все 20 acceptance criteria pass.
- PR description содержит:
  - Список созданных и модифицированных файлов.
  - Подтверждение что `git diff --stat store/ lib/ components/spooling/`
    показывает 0 функциональных изменений (или explicit'но 1-2 строки
    intro-banner если Step 3 optional был сделан).
  - Скриншот или ASCII before/after sidebar Spooling группы.
  - Confirmation что Assembly **НЕ создан** как route/page/store —
    только documented в `PIPEQC_CONTEXT.md`.

---

## Manual self-check before reporting done

1. **`grep -rn "from \"@/store/spooling-store\"" app/ components/`** —
   проверь что `<SpoolingView>` (и его дети) всё ещё единственные
   consumer'ы спулинг-store. Если появились новые места — это лишний
   touch.
2. **`grep -rn "/spooling" app/ components/ config/`** — найди все
   ссылки на старый `/spooling`. Убедись что:
   - `/spooling` всё ещё valid route (стал Home)
   - Если где-то была hardcoded ссылка на `/spooling` в смысле "open
     spooling import" — заменить на `/spooling/iso-workflow`. Кандидаты:
     дашборды, notifications, cross-links между модулями.
3. **`grep -rn "Spooling Module" app/ components/ config/ docs/`** —
   replace на `Spooling` (мы поменяли название в sidebar). Документация
   тоже.
4. **Diff scope sanity:** `git diff --stat` должен показать примерно:
   - 4 файла в `app/spooling/`
   - 1 файл `config/navigation.ts`
   - 2-4 файла в `docs/`
   - При большем объёме — это over-scope. Re-read §"Scope decisions" и
     §"Constraints".
5. **Reset Demo round-trip:** в браузере зайди на `/spooling/iso-workflow`,
   "Load demo import", refresh, проверь persistence, "Reset Demo" из
   top nav, refresh, проверь что вернулось к "No imports yet" state.
   Если store сломался — ты что-то таки потрогал в `store/spooling-store.ts`.
6. **Manual fidelity check:** перечитай CC-22 (4 параграфа в
   `presentation_findings.md`). Убедись что твой Home banner и
   sub-pages reflect рамку "engineering→site document handoff", а не
   "shop-floor spool work".
7. **Assembly check:** `find . -name "assembly*" -not -path "*/node_modules/*"
   -not -path "*.git*"` — должно вернуть 0 results в `app/`, `store/`,
   `lib/`, `components/`. Если что-то нашлось — ты случайно создал
   Assembly UI; удали.

Report: список созданных/модифицированных файлов, the diff stats,
выбранные lucide-react иконки для трёх новых entries, и любой acceptance
step который не смог verify в браузере (флаги честно если запускаешь
terminal-only).

---

## Candidates surfaced by IA1 (do NOT do now — next-track material)

1. **Track K — Iso lifecycle state machine** (per CC-21): full iso
   state machine с multi-round checking, two-source hold, outbound
   batch transmittal. Engineering Transmittals + Spooling Transmittal
   placeholders из этой фазы получат реальные screens в Track K.
2. **Spooling Home dashboard upgrade:** S-curve chart (cumulative isos
   received / spooled / transmitted) + live activity feed (по CC-23
   pattern). Сейчас Home = static cards. Можно дополнить в той же
   spring если есть бюджет.
3. **Assembly stage selector в Erection:** когда придёт modular-project
   demand, добавить `?stage=assembly` query param + toggle в Erection
   header. Per CC-26, screens reusable as-is.
4. **CC-25 — SpoolGen connector stub:** на `/spooling/iso-workflow`
   добавить "SpoolGen connector — auto-poll every 5 min" stub config
   screen. Это потенциальный pitch differentiator vs EasyPiping (там
   integration manual). Не сейчас.

---

_Last updated: 2026-05-21. Phase IA1 of IA Restructuring track._
_Estimated effort: 0.5–1 day._
_Reversibility: full (single PR revert)._
_Blocks: nothing in main branch. Blocked by: nothing._
_Unblocks: cleaner foundation for Track H (Testpack Builder), Track J
(Subcontractor scope), Track K (Iso lifecycle state machine), and the
Role × Function × Interface × State matrix work._
