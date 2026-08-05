# PipeQC Supabase Working Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить текущий PipeQC из интерактивного demo-shell с частично подключенным Supabase в полностью рабочий, аудируемый и проектно-изолированный прототип современной системы piping construction/QC, воспроизводящей существенные процессы Easy Piping без копирования legacy-интерфейса.

**Architecture:** Модульный монолит на Next.js App Router и Supabase. Postgres является единственным источником истины; RLS и grants обеспечивают project/PDS/subcontractor isolation; транзакционные бизнес-команды выполняются SQL RPC; Storage хранит исходные файлы и артефакты; короткие файловые задачи выполняются Edge Functions. Доменное и application-ядро не зависит от React, Zustand и Supabase SDK.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase Auth/Postgres/RLS/Storage/Edge Functions, PostgreSQL 17, Zod, Zustand только для локального UI-state, Vitest, React Testing Library, Playwright, pgTAP, XLSX, jsPDF.

---

## 0. Назначение и статус документа

Это мастер-анализ и программа реализации. Он:

- фиксирует проверенное состояние checkout `feat/supabase-real-mode` на commit `0a78ccd` с учетом незакоммиченных пользовательских изменений;
- сравнивает код, миграции, тесты и проверенное runtime-поведение с документационным dossier;
- определяет целевую архитектуру и единый набор доменных решений;
- разбивает дальнейшую работу на зависимые треки;
- задает критерии, по которым экран или модуль можно назвать действительно рабочим.

Этот документ заменяет старые roadmap-файлы как источник **будущего порядка реализации**, но не удаляет их. Старые `docs/roadmap_v3.md`, `docs/tracks/*`, `docs/prompts/archive/*` и `docs/SUPABASE_*` остаются историей решений и частичным контекстом.

При расхождении источников используется следующий порядок доверия:

1. `docs/research/2026-07-30-easy-piping-documentation-dossier.md` как консолидированный domain baseline;
2. `docs/Easy Piping User Manual.pdf` и оригинальные презентации для спорных деталей;
3. текущие миграции, код и проверенное runtime-поведение как доказательство текущей реализации;
4. старые PipeQC roadmap/context-файлы только как история или намерение.

`docs/PROJECT_OVERVIEW.md` намеренно не использовался.

## 1. Executive verdict

Текущее приложение нельзя считать рабочим аналогом Easy Piping. Его правильнее описывать как:

- качественный интерактивный UI/domain prototype;
- полезный набор демонстрационных производственных сценариев;
- начатый Supabase configuration foundation;
- но не согласованную multi-user систему с общей операционной БД.

Главная проблема не в количестве недостающих экранов. Главная проблема — **двойная реальность**:

- в Supabase живут Auth, проекты и несколько setup-срезов;
- производственные модули продолжают читать и изменять 23 persisted Zustand-store в `localStorage`;
- один и тот же активный проект в top nav не ограничивает операционные данные;
- derived-состояния считаются разными формулами в разных store/helper;
- межмодульные watcher-компоненты изменяют demo-store даже в Supabase mode.

Поэтому прямое «подключение каждого существующего store к таблице» закрепит ошибки. Нужен постепенный переход вертикальными доменными срезами:

`migration/RLS → domain invariant → application command/query → Supabase adapter → UI → audit → tests`.

### 1.1. Что уже можно переиспользовать

- существующую визуальную оболочку, таблицы, detail panels, dialogs и большую часть route map;
- Auth flow и выбор активного Supabase-проекта;
- базовые project/referential таблицы и cross-tenant triggers;
- Project Definition, System Referential и WPS Supabase adapters;
- чистые helpers, которые действительно выражают корректные правила;
- fixture spine как отправную точку для единого pilot dataset;
- четыре настоящих генератора отчетов;
- локальный Supabase CLI и pgTAP harness.

### 1.2. Что нельзя переносить как production-domain

- Zustand store как authoritative persistence;
- ручные derived-флаги `readyForTest`, `qcReleased`, `rft`;
- cross-store watcher side effects;
- текущую роль `project_manager` как универсальный admin;
- fail-open subcontractor scope;
- revision через дублирование записи с тем же ID;
- NDE cascade без транзакционных ограничений;
- fallback toast «Downloaded» без файла;
- route visibility как единственную проверку доступа;
- разрозненные test-pack модели.

## 2. Проверенный baseline

### 2.1. Репозиторий и стек

| Факт | Проверенное состояние |
| --- | --- |
| Checkout | `/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout` |
| Branch | `feat/supabase-real-mode` |
| HEAD | `0a78ccd` |
| Framework | Next.js `16.2.6`, App Router |
| UI | React `19`, Tailwind 4, Radix/shadcn patterns |
| Language | TypeScript `5.7.3`, strict |
| Client state | Zustand `5.0.13` |
| Backend foundation | Supabase JS `2.110.8`, local Postgres 17 |
| App routes | 61 `page.tsx` |
| Zustand store files | 27 |
| Persisted Zustand stores | 23 |
| Base DB tables | 32 |
| Unit assertion files | 13 |
| Repository files | 467 |

`NEXT_PUBLIC_PIPEQC_MODE=supabase` включает Supabase mode; любое другое значение оставляет demo mode.

### 2.2. Проверки на момент аудита

| Проверка | Результат |
| --- | --- |
| `node --import tsx --test components/pipeqc/*.test.ts contexts/*.test.ts lib/*.test.ts lib/supabase/*.test.ts` | PASS, 13/13 |
| `npx tsc --noEmit --incremental false` | PASS |
| `/opt/homebrew/bin/supabase test db` | PASS, 49/49 |
| `npm run validate:fixtures` | PASS, 0 issues |
| `npm run lint` | FAIL: `eslint: command not found` |
| Проверенный Supabase runtime | Authenticated System Admin, реальный project selector и setup-срезы работают |
| Проверенный route behavior | прямые скрытые routes доступны; `/fabrication/spool-fabrication` возвращает 404 |

Lint failure — baseline/tooling gap, а не найденная lint-ошибка в исходниках.

### 2.3. Незакоммиченное состояние

В checkout уже находились пользовательские tracked/untracked изменения вокруг:

- Supabase active-project selection;
- System Referential;
- WPS CRUD;
- grants/RLS migrations;
- pgTAP и TypeScript tests;
- `docs/SUPABASE_*`.

Дальнейшие сессии должны:

- начинать с `git status --short`;
- не перезаписывать эти изменения широким restore/reset;
- не commit/stage/push без прямого указания пользователя;
- считать рабочее дерево общей средой.

## 3. Текущая архитектура

### 3.1. Фактический поток данных

```text
Supabase mode
  ├─ Auth + project memberships ──> Supabase Postgres
  ├─ Project Definition ──────────> Supabase Postgres
  ├─ System Referential ──────────> Supabase Postgres
  ├─ WPS ─────────────────────────> Supabase Postgres
  └─ остальные routes ────────────> Zustand persist ──> browser localStorage
                                      ▲
                                      ├─ ISO watcher
                                      └─ Spool RFT watcher
```

Это не adapter architecture: mode выбирается внутри UI-компонентов, а большинство модулей вообще не имеет Supabase adapter.

### 3.2. Реально подключенные Supabase-срезы

| Срез | Состояние |
| --- | --- |
| Login/session/access pending | Реальный |
| Multi-membership project selection | Реальный |
| Project Definition read/update | Реальный |
| System Referential read | Реальный |
| Material Type mutation | Реальная и дополнительно ограничена RLS |
| Film Quantity / UT / Torquing mutation | Намеренно read-only в текущем срезе |
| WPS list/create/update/status | Реальный в текущем рабочем дереве |
| Project Referential остальные tabs | Demo store |
| Access Rights | Demo store, несмотря на реальный login |
| Import Settings | Demo store |
| Все operational modules | Demo store |
| Reports | Читают demo stores |

В коде Supabase-запросы ограничены несколькими файлами:

- `contexts/supabase-auth-context.tsx`;
- `lib/supabase/project-definition.ts`;
- `lib/supabase/system-referentials.ts`;
- `lib/supabase/welding-procedures.ts`;
- соответствующими UI adapters.

### 3.3. Dependency Rule

Текущая зависимость в большинстве модулей выглядит так:

```text
React component → Zustand store → другие stores/helpers → demo fixtures
```

Бизнес-правила живут одновременно:

- в click handlers;
- в store actions;
- в watcher-компонентах;
- в helper-функциях;
- в вычислениях отчетов;
- иногда в seed data.

Из-за этого:

- UI validation можно обойти прямым store action;
- один transition изменяет несколько store неатомарно;
- невозможно надежно воспроизвести actor/time/reason;
- нет единого места для RFT, QC Release или NDE escalation;
- unit test helper не доказывает корректность реальной mutation.

### 3.4. Оценка DDD и Clean Architecture

#### Domain model score: **3/10**

Плюсы:

- ubiquitous terms Easy Piping уже хорошо видны в именах;
- модули Spooling, Fabrication, NDE, Erection, Tracking, Test Pack и Flange различимы;
- в helpers есть зачатки правил и derived calculations;
- UI позволяет предметно обсуждать workflow с пользователем.

Почему не выше:

- bounded contexts не закреплены кодовой структурой и контрактами;
- aggregate roots отсутствуют;
- entity identity смешана с display number и revision;
- доменные transitions не защищены;
- одинаковые понятия представлены несовместимыми типами;
- derived facts сохраняются как изменяемые flags;
- domain events подменены React watchers;
- persistence/framework types протекают в бизнес-логику.

Чтобы достичь **10/10**:

1. закрепить context map и ownership каждого понятия;
2. разделить stable identity и revision identity;
3. ввести aggregate roots и команды с явными invariants;
4. заменить primitive strings value objects для ISO/spool/weld/revision/status;
5. оставить единственного владельца RFT, QC Release и NDE obligation;
6. описать published contracts между контекстами;
7. генерировать domain events транзакционно;
8. убрать дублирующие модели Test Pack/Flange/ISO;
9. тестировать truth tables на уровне domain и DB;
10. не позволять React/Supabase SDK зависимостям входить в domain/application layers.

#### Clean Architecture score: **3/10**

Плюсы:

- новые Supabase helpers отделены от некоторых компонентов;
- присутствуют чистые функции и их assertion tests;
- database types централизованы.

Основные разрывы:

- framework и store сейчас фактически являются архитектурой;
- use cases не выделены;
- repository ports отсутствуют;
- транзакционные границы не определены;
- UI знает детали persistence mode;
- нет server-side command boundary;
- side effects не инвертированы через interfaces.

Целевое правило:

```text
UI/framework → application use case → domain
                         ↓
                 repository/clock/id ports
                         ↑
        Supabase/Storage/Edge adapters
```

## 4. Анализ текущей БД

### 4.1. Сильные стороны foundation

Base migration создает 32 таблицы и правильно задает несколько важных основ:

- UUID project tenant root;
- `project_id` в project-owned referentials;
- global System Referential;
- FK `on delete restrict`;
- active/inactive/archive lifecycle;
- WPS ranges, revision, approval date и subcontractor;
- NDE Matrix coverage/PWHT/trace columns;
- cross-project FK triggers;
- immutable `project_id`;
- RLS на exposed tables;
- ограниченные column grants;
- audit/import placeholders.

Эту основу надо эволюционировать forward migrations, а не переписывать задним числом.

### 4.2. Главные schema gaps

| Область | Текущее состояние | Необходимое изменение |
| --- | --- | --- |
| Operational core | Таблиц ISO/spool/weld/progress нет | Ввести stable entities, revisions и progress records |
| Roles | Один enum из 6 функциональных ролей | Capability model + manual admin/reader hierarchy |
| System Admin | Смешан platform и project admin | Оставить platform flag отдельно от project membership |
| PDS phase | Только shop/field | Добавить assembly и явный phase ownership |
| Custom fields | Нет max-3 invariant | Constraint/trigger на scope |
| Progress weights | Нет Assembly и sum=100 | Полный набор фаз + deferred constraint/command validation |
| Import | Один skeleton `import_jobs` | Files/rows/issues/conflicts/decisions/applications |
| Audit | Таблица без writers | Транзакционная запись actor/action/before/after/reason |
| Scopes | Scope rows видят только admins | Член должен видеть собственный effective scope |
| Operational RLS | Отсутствует | Capability + subcontractor/PDS predicates |
| Referential gaps | Нет PDA/devices, paint, spooling checklist/class | Добавить недостающие catalogs |
| Storage | Пути логотипов без buckets/policies | Private project-scoped buckets и signed access |

### 4.3. Тестовый разрыв БД

Текущие 49 pgTAP assertions полезны, но в основном проверяют:

- наличие таблиц/колонок;
- grants;
- наличие policy по текстовым признакам;
- наличие triggers.

Они пока не доказывают:

- чтение и запись двумя пользователями из разных проектов;
- subcontractor/PDS isolation;
- реальное отклонение cross-tenant FK;
- невозможность обойти state transition;
- audit insertion;
- idempotency;
- concurrency;
- корректный NDE/RFT truth table.

Каждый следующий DB track обязан добавлять behavioral pgTAP с JWT claims и реальными rows.

## 5. Сопоставление модулей с документацией

Легенда:

- **соответствует** — существенная логика подтверждена;
- **частично** — присутствует полезная часть, но нет полной семантики;
- **противоречит** — текущий результат нарушает зафиксированное правило;
- **отсутствует** — только UI placeholder или нет реализации;
- **модернизация** — сознательно современное решение без потери правила.

| Модуль | Текущее состояние | Вердикт | Ключевой разрыв |
| --- | --- | --- | --- |
| Project/Auth | Реальные Auth, membership, project switch | Частично | Активный project не фильтрует operational data |
| Project Definition | Реальный Supabase CRUD slice | Частично | Logos не в Storage; custom columns не завершены |
| System Referential | Реальные reads, Material Type CRUD | Частично | Остальные kinds read-only, attributes не моделированы |
| Project Referential | Сильный demo UI + schema skeleton | Частично | Почти все UI writes идут в `admin-store` |
| Access Rights | Demo matrix | Противоречит | Показывает mutation controls, но не меняет Auth/RLS |
| Import Settings | XLSX dry-run в браузере | Частично | Нет source retention, atomic apply, job history |
| Spooling Import | Demo rows/issues/conflicts | Частично | Нет 4 файлов, 4 MB gate, parser и domain apply |
| Revision | Demo dialog/store action | Противоречит | Дублируется тот же ID, history не immutable |
| Fabrication | Хорошие стадии и detail panels | Частично | Нет durable signed records и derived QC Release |
| Material trace | Demo heat data | Частично | Не связано транзакционно с project PML |
| Shop welding | WPS/welder UI | Частично | Нет корректных root/cap/multi-welder point records |
| NDE | Batch/rework/tracer concepts | Частично/противоречит | Нет one-welder×category invariant; penalty condition ошибочен |
| PWHT | Demo release store | Частично | Нет obligations/results и QC Release dependency |
| Assembly | Нет first-class module | Отсутствует | Документация требует отдельную фазу |
| Erection | Полный визуальный funnel | Частично | Store actions обходят gates; RFT не authoritative |
| Tracking | Append-like events, capacity, barcode UI | Частично | Hardcoded locations, нет devices/offline sync, scope fail-open |
| Test Pack | Богатый UI, builder и pressure steps | Противоречит | Несколько моделей и формул RFT; blinding ошибочно входит в RFT |
| Flange | Categories/torque/reinstatement UI | Частично | Нет bolting import, revision gate, multi-jointer, dynamic UT |
| Reports | 12 карточек, 4 генератора | Противоречит | 8 действий сообщают об успехе без файла |
| Audit | Таблица skeleton | Отсутствует | Ни UI, ни commands не пишут audit |

## 6. Critical findings

### P0-01 — Hybrid source of truth

Supabase mode не изолирован от demo stores. Пока это не исправлено, любая «реальная» operational feature может показывать данные другого проекта или локального браузера.

**Решение:** на границе каждого модуля один data adapter; завершенный Supabase module не читает demo stores ни прямо, ни через watcher/report helper.

### P0-02 — Нет operational relational model

Без stable ISO/spool/weld identity невозможно корректно построить revision, NDE, Tracking, Test Pack и Flange.

**Решение:** Engineering Definition & Revision — обязательный upstream track до operational wiring.

### P0-03 — Access model не соответствует manual

Текущий enum смешивает административные и функциональные роли. System Admin в навигации видит меньше, чем Project Manager, хотя источник дает ему полный доступ. Direct routes не защищены.

**Решение:** capability model, global System Admin, project roles, functional roles, route guards и RLS из одного catalog.

### P0-04 — Revision identity повреждает историю

`applyRevision` добавляет новую запись с тем же `id`, а отправка transmittal помечает ISO как `Superseded`. Это не соответствует legacy semantics и ломает внешние ссылки.

**Решение:** stable entity + immutable revision rows + controlled decision/copy workflow.

### P0-05 — Test Pack readiness не authoritative

Есть несколько несовместимых `readyForTest`; пустой test pack может стать ready; blinding ошибочно участвует в RFT; `recordSpoolRFT` размножает spool между ISO.

**Решение:** единый DB view/function с truth table из dossier; RFT не хранится как свободно изменяемый checkbox.

### P0-06 — NDE escalation не защищена

Batch может собираться произвольно; tracer/penalty логика частично зависит от наличия assignment, а не результата; cascade не атомарен.

**Решение:** NDE obligation aggregate и SQL commands с one-welder×one-category invariant, repair/tracer lineage и behavioral tests.

### P0-07 — UI gates не равны domain gates

Большинство store actions не проверяет те же условия, которые disable UI button.

**Решение:** UI только объясняет доступность; use case/RPC повторно и окончательно проверяет invariant.

### P0-08 — Ложные успешные действия

Reports и часть imports могут показать success без durable outcome.

**Решение:** success только после подтвержденного DB/file result; fake branches удалить.

### P0-09 — Нет audit trail

В construction/QC системе actor, timestamp, reason, revision и source file являются частью результата.

**Решение:** audit и command receipt пишутся в одной транзакции с business mutation.

## 7. Определение «полностью рабочий прототип»

Прототип считается рабочим только если выполнены все условия:

1. Все operational данные выбранного проекта хранятся в Supabase.
2. Refresh, другой браузер и другой пользователь видят согласованное состояние.
3. RLS не позволяет прочитать или изменить чужой project/PDS/subcontractor scope.
4. Direct URL не дает функциональность без capability, даже если route известен.
5. ISO/spool/weld/support/flange имеют stable identity и immutable revision history.
6. Spooling import принимает реальные файлы, показывает issues/conflicts и атомарно применяет данные.
7. Fabrication/Erection/Assembly progress записывается как durable work records.
8. NDE Matrix создает obligations; rejection создает repair/tracer lineage; penalty shoot следует truth table.
9. Tracking хранит append-only location events и корректно синхронизирует offline scans.
10. Test Pack RFT вычисляется из authoritative gates; pressure-test workflow продолжается после RFT.
11. Flange workflow поддерживает revisions, multiple jointers и dynamic UT.
12. Каждый advertised report/form реально генерирует и сохраняет артефакт.
13. Каждая существенная mutation имеет actor/time/reason/source и audit event.
14. Pilot seed позволяет пройти golden path и negative paths без ручной правки БД.
15. Unit, integration, pgTAP и Playwright suites проходят на чистом local reset.

### 7.1. Не входит в критерий прототипа

- pixel-perfect копирование Easy Piping;
- использование исходного бренда, логотипов или текстов legacy-продукта;
- нативное PDA-приложение: для прототипа достаточно installable offline PWA;
- real-time integration со SpoolGen/Marian: реальные поддержанные file imports достаточны;
- enterprise SSO/AD/Keycloak;
- microservices;
- regulatory-qualified electronic signature;
- multi-region HA и промышленный disaster-recovery SLA.

Перед внешней публикацией отдельно проверяется происхождение и допустимость использования полученных материалов. UI, тексты, бренд и demo data должны быть самостоятельными.

## 8. Целевая архитектура

### 8.1. Главные решения

#### AD-01 — Modular monolith

Next.js остается единственным web-приложением, Supabase — backend platform. Контексты разделяются модулями и контрактами, но не сетевыми сервисами.

Причина: workflows сильно транзакционно связаны, команда небольшая, а prototype не выигрывает от distributed consistency.

#### AD-02 — Postgres как source of truth

Zustand разрешен только для:

- открытых dialogs/sheets;
- выбранных filters/tabs;
- draft до submit;
- ephemeral optimistic state, который можно восстановить из query.

Zustand запрещен для:

- accepted progress;
- RFT/QC Release;
- revision decisions;
- NDE results;
- current location;
- permissions;
- audit.

#### AD-03 — Browser reads, RPC commands

- Простые reads и безопасный referential CRUD выполняются через Supabase client под RLS.
- Multi-row state transitions выполняются именованными Postgres functions через `rpc()`.
- Function проверяет capability, version, scope и invariant, изменяет rows, пишет audit/outbox и возвращает projection.
- `security invoker` используется по умолчанию.
- `security definer` допускается только для узкой helper/command function с пустым `search_path`, fully-qualified names и отдельным pgTAP.

#### AD-04 — Server-side session, RLS как final authority

В Next.js 16:

- `@supabase/ssr` хранит session в cookies;
- root `proxy.ts` только обновляет session/делает optimistic redirect;
- protected route layout проверяет authenticated membership;
- route capability map управляет UX/direct-route response;
- RLS и grants остаются окончательной защитой данных.

Proxy не должен выполнять медленные project/capability queries на каждый asset request.

#### AD-05 — Durable records + event ledger, не full event sourcing

Хранятся:

- нормализованное текущее состояние;
- immutable work/result/revision rows;
- append-only domain/audit events.

Не требуется восстанавливать всю БД исключительно replay событий.

#### AD-06 — Storage для файлов

Private buckets:

- `project-imports`;
- `project-drawings`;
- `quality-evidence`;
- `generated-documents`;
- `project-branding`.

Object path начинается с `project_id/`. Policies проверяют project membership/capability, а file metadata связывается с business row.

#### AD-07 — Short Edge Functions only

Edge Functions используются для:

- чтения небольших import files из Storage;
- parser/validation orchestration;
- генерации документов;
- внешних webhooks в будущем.

Atomic apply остается SQL RPC. Долгие задачи не держатся в одном HTTP request; для prototype достаточно persisted job + polling, затем при необходимости подключается durable queue.

#### AD-08 — Optimistic concurrency и idempotency

Mutable aggregate roots получают `version integer`.

Каждая command принимает:

- `expected_version`;
- `idempotency_key`;
- actor из `auth.uid()`;
- optional reason/comment.

`command_receipts` не позволяет повторному offline/retry запросу создать дубль.

### 8.2. Целевая структура кода

```text
app/
  (auth)/
  (protected)/
  api/
modules/
  shared/
    domain/
    application/
    infrastructure/
  access/
    domain/
    application/
    infrastructure/
    ui/
  project-setup/
  imports/
  engineering/
  construction/
  quality/
  tracking/
  pressure-test/
  flange/
  documents/
lib/
  supabase/
    client.ts
    server.ts
    proxy.ts
supabase/
  migrations/
  functions/
  tests/
    database/
    integration/
```

Правила:

- `modules/*/domain` импортирует только domain/shared domain;
- `modules/*/application` импортирует domain и ports;
- `modules/*/infrastructure` реализует ports через Supabase;
- `modules/*/ui` вызывает application facade/hooks;
- `app/**/page.tsx` композирует screen и route guard, но не содержит mutation rules;
- существующие `store/*` удаляются из Supabase path по мере миграции контекстов;
- `lib/supabase/database.types.ts` всегда генерируется из примененных migrations.

### 8.3. Bounded contexts и ownership

| Context | Владеет | Не владеет |
| --- | --- | --- |
| Access | User, Membership, Role, Capability, Scope | Production progress |
| Project Setup | Project Definition, system/project referentials | ISO revisions |
| Imports | File, validation issue, conflict, apply decision | Final domain semantics |
| Engineering | ISO, spool, weld, support, flange definition и revisions | Выполненный weld/NDE |
| Construction | Material check, weld point progress, spool activities, releases | NDE sampling decisions |
| Quality | NDE obligations/batches/results/repair/tracer/PWHT | Test Pack ownership |
| Tracking | Location event, device, sync batch, current-location projection | Erection stage |
| Pressure Test | Test Pack composition, line check, punch, blinding, test, reinstatement | Weld result |
| Flange | Flange progress, jointers, UT, revision resolution | ISO revision creation |
| Documents | Templates, requests, report runs, artifacts | Authoritative source records |

Published contracts:

- Engineering публикует active revision graph.
- Construction публикует immutable progress/release facts.
- Quality публикует outstanding/accepted obligations.
- Flange публикует joint readiness.
- Pressure Test потребляет эти facts и вычисляет RFT.
- Documents читает projections/snapshots, но не меняет source contexts.

### 8.4. Канонические business decisions

1. System Admin — global platform role и имеет полный module access.
2. Project/Site Admin, Editor, Reader и Subcontractor моделируются отдельно от функциональных QC/NDE/Spooling roles.
3. Subcontractor scope является deny-by-default; отсутствующий PDS у scoped record — data error, а не доступ.
4. Project delete в prototype заменяется archive; referentials in use архивируются, но не hard-delete.
5. `Assembly` — first-class construction phase между Fabrication и Erection.
6. Missing WPS при Spooling import — warning; запись фактической сварки без разрешенного WPS/qualification блокируется.
7. Spooling base import — до четырех файлов `weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt`, каждый не больше 4 MB.
8. Import всегда проходит preview/validation/conflict confirmation до apply.
9. Old revision immutable; перенос progress возможен только явным decision record.
10. NDE batch = один welder × одна NDE category × один method.
11. Rejected original weld создает repair R1/R2 lineage и tracer obligations.
12. Четыре rejection или rejected second-level tracer создают 100% escalation для remaining eligible welds.
13. Current spool location выводится из append-only events.
14. ISO RFT = complete + QC released + line check done + X cleared; blinding начинается **после** RFT и не входит в формулу.
15. Success notification показывается только после durable result.

## 9. Целевая схема данных

Имена ниже являются утвержденным schema map. Каждый трек может разбить migration на несколько файлов, но не должен изобретать параллельную модель.

### 9.1. Access

Сохраняются:

- `profiles`;
- `projects`;
- `project_memberships`;
- `membership_subcontractor_scopes`;
- `membership_pds_area_scopes`.

Добавляются/эволюционируют:

- `roles`;
- `capabilities`;
- `role_capabilities`;
- `project_membership_roles`;
- `command_receipts`;
- helper functions `current_user_has_capability`, `current_user_in_pds_scope`, `current_user_in_subcontractor_scope`.

`profiles.is_platform_admin` остается источником global System Admin. Один membership может иметь admin/access role и несколько functional roles.

### 9.2. Project Setup

Существующие referential tables сохраняются. Добавляются:

- `project_devices`;
- `project_device_users`;
- `project_spooling_material_types`;
- `project_spooling_material_classes`;
- `project_spooling_checklist_items`;
- `project_ral_codes`;
- `project_paint_matrix_rules`;
- `project_assembly_settings`.

Изменения:

- `project_pds_areas` получает assembly assignment;
- `nde_matrix_rules.location` поддерживает shop/assembly/field;
- `project_progress_weights.phase` поддерживает Assembly;
- custom fields получают max-three-per-scope invariant;
- progress weights применяются только через command, проверяющую сумму 100.

### 9.3. Imports

- `import_jobs`;
- `import_files`;
- `import_rows`;
- `import_issues`;
- `import_conflicts`;
- `import_decisions`;
- `import_applications`.

Lifecycle:

```text
draft → uploaded → validating → validated → applying → applied
                   └──────────→ failed
validated → canceled
```

Applied/canceled/failed job immutable. Повторный apply с тем же idempotency key возвращает предыдущий receipt.

### 9.4. Engineering Definition & Revision

- `isometrics`;
- `isometric_revisions`;
- `spools`;
- `spool_revisions`;
- `weld_joints`;
- `weld_joint_revisions`;
- `weld_points`;
- `supports`;
- `support_revisions`;
- `flange_joints`;
- `flange_joint_revisions`;
- `revision_change_items`;
- `revision_decisions`;
- `revision_progress_copies`.

Stable tables содержат project identity/number. Revision tables содержат изменяемое engineering definition. Одновременно active только одна accepted revision на stable entity.

### 9.5. Construction

- `material_check_records`;
- `material_check_items`;
- `weld_progress_records`;
- `weld_point_assignments`;
- `construction_progress_events`;
- `quality_release_records`;
- `pwht_requirements`;
- `pwht_results`;
- `paint_progress_records`;
- `laydown_records`;
- `support_progress_records`.

`construction_phase` принимает `fabrication`, `assembly`, `erection`. Общие компоненты переиспользуются, но допустимые stage transitions задаются phase-specific policy.

### 9.6. Quality/NDE

- `nde_obligations`;
- `nde_batches`;
- `nde_batch_items`;
- `nde_results`;
- `weld_repairs`;
- `nde_tracer_obligations`;
- `nde_tracer_assignments`;
- `nde_penalty_escalations`;
- `client_examinations`.

`nde_obligations` — authoritative список того, что должно быть выполнено. Result без obligation не принимается, кроме отдельной authorized 100% override command.

### 9.7. Tracking

- `spool_location_events`;
- `tracking_sync_batches`;
- `tracking_sync_items`;
- view `spool_current_locations`;
- view `spool_tracking_inconsistencies`;
- view `spool_transit_alerts`.

`spool_location_events` append-only. Исправление ошибочного scan — compensating event, а не update/delete.

### 9.8. Pressure Test

- `test_packs`;
- `test_pack_isometrics`;
- `line_check_requests`;
- `line_check_request_items`;
- `punch_items`;
- `clearance_requests`;
- `clearance_request_items`;
- `blinding_requests`;
- `blinding_request_items`;
- `pressure_tests`;
- `precommissioning_records`;
- `reinstatement_requests`;
- `reinstatement_request_items`;
- view `isometric_readiness`;
- view `test_pack_readiness`.

`ready_for_test` не является изменяемой колонкой.

### 9.9. Flange

- engineering definition находится в `flange_joints`/`flange_joint_revisions`;
- `flange_progress_records`;
- `flange_jointer_assignments`;
- `flange_ut_readings`;
- `flange_revision_resolutions`.

UT row сохраняет raw readings, formula version, coefficients и calculated result, чтобы отчет воспроизводился после изменения referential.

### 9.10. Documents, reports и audit

- `document_templates`;
- `document_requests`;
- `document_files`;
- `report_definitions`;
- `report_runs`;
- `report_artifacts`;
- `domain_events`;
- `audit_events`;
- `outbox_events`.

`audit_events` append-only и недоступна для browser insert/update/delete. Business command пишет ее сама.

## 10. API и command catalog

Минимальный публичный RPC catalog:

| RPC | Ответственность |
| --- | --- |
| `apply_import_job` | Атомарно применить validated import |
| `accept_isometric_revision` | Активировать revision и создать decision backlog |
| `resolve_revision_change` | Not Done/Cancelled/Done/Rework + progress copy |
| `record_material_check` | Проверить PML/heat и записать check |
| `record_weld_progress` | Проверить revision, WPS, welder, points и Root/Cap |
| `release_quality_record` | Проверить NDE/PWHT и выпустить spool/ISO |
| `create_nde_batch` | Проверить welder/category/method/candidates |
| `record_nde_results` | Result, repair и tracer obligations одной транзакцией |
| `assign_nde_tracers` | Выбрать допустимых T1/T2 и создать obligations |
| `record_construction_progress` | Проверить phase transition |
| `record_spool_location_event` | Append scan с idempotency/scope |
| `compose_test_pack` | Атомарно назначить ISO одному Test Pack |
| `assign_line_check` | Создать request только для eligible ISO |
| `record_line_check_result` | Done/punch X и пересчет projection |
| `assign_blinding` | Только для RFT Test Pack |
| `record_pressure_test` | Test/precommission state transition |
| `record_reinstatement` | Y/Z completion |
| `record_flange_progress` | Revision/jointer/torque/UT gate |
| `request_report_run` | Зафиксировать snapshot parameters и job |

Все commands возвращают:

```ts
type CommandResult<T> =
  | { ok: true; data: T; version: number; receiptId: string }
  | {
      ok: false
      code: string
      message: string
      fieldErrors?: Record<string, string>
      currentVersion?: number
    }
```

UI не показывает raw PostgREST/SQL error.

## 11. Track map и зависимости

| Track | Название | Зависит от | Разблокирует |
| --- | --- | --- | --- |
| T0 | Foundation & Architecture Guardrails | — | Все |
| T1 | Identity, Project Access & Capabilities | T0 | Все project-owned modules |
| T2 | Project/System Referential Completion | T1 | Imports, Construction, NDE, Tracking, Test Pack |
| T3 | Import Platform & Storage | T1, часть T2 | Engineering, referential/progress imports |
| T4 | Engineering Definition & Revision | T2, T3 | Все operational contexts |
| T5 | Fabrication & Material Traceability | T4 | NDE, Erection, Test Pack |
| T6 | NDE, Repair, Tracer & PWHT | T5 | QC Release, Erection, Test Pack |
| T7 | Assembly & Erection | T4, T6 | Tracking, Test Pack |
| T8 | Tracking & Offline PWA | T4, T7 | Logistics reports |
| T9 | Flange Management | T4, T7 | Test Pack readiness |
| T10 | Test Pack & Pressure Test | T6, T7, T9 | Handover dossier |
| T11 | Documents, Forms & Reports | T5–T10 | Working prototype release |
| T12 | Hardening, Pilot Data & Release | T0–T11 | Pilot |

Критический путь:

```text
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T9 → T10 → T11 → T12
                                      └────→ T8 ────────────────┘
```

После T4 допустима ограниченная параллельная работа, но shared schema/contracts не меняются без синхронизации master plan.

## 12. T0 — Foundation & Architecture Guardrails

**Цель:** создать проверяемую архитектурную рамку и прекратить смешение demo и Supabase persistence.

**Отдельный execution plan:** `docs/superpowers/plans/2026-07-31-track-00-foundation.md`.

### Deliverables

- `docs/architecture/context-map.md`;
- `docs/architecture/domain-glossary.md`;
- `docs/architecture/adr/0001-modular-monolith.md`;
- `docs/architecture/adr/0002-supabase-command-boundary.md`;
- `docs/architecture/adr/0003-durable-records-and-events.md`;
- `docs/architecture/adr/0004-demo-isolation.md`;
- `modules/shared/domain/result.ts`;
- `modules/shared/domain/errors.ts`;
- `modules/shared/application/command.ts`;
- `modules/shared/application/repository.ts`;
- `lib/supabase/client.ts`;
- `lib/supabase/server.ts`;
- `lib/supabase/proxy.ts`;
- root `proxy.ts`;
- `vitest.config.ts`;
- `playwright.config.ts`;
- `.eslintrc` или актуальный flat-config для установленного Next.js/ESLint;
- нормализованные scripts в `package.json`.

### Tasks

- [ ] Зафиксировать current route/data-source inventory в `docs/architecture/context-map.md`.
- [ ] Утвердить glossary: ISO, spool, weld joint, weld point, revision, obligation, result, repair, tracer, RFT, QC Release.
- [ ] Добавить `@supabase/ssr`; разделить browser/server clients.
- [ ] Добавить cookie session refresh в `proxy.ts`, без полномасштабной authorization query в Proxy.
- [ ] Установить и настроить ESLint так, чтобы `npm run lint` реально работал.
- [ ] Добавить Vitest/RTL и Playwright scripts.
- [ ] Добавить общие `Result`, typed error и command port types без импорта Supabase/React.
- [ ] Ограничить `IsoWatcherMount` и `SpoolRFTWatcherMount` только demo mode.
- [ ] Добавить test, доказывающий отсутствие demo watcher mutations в Supabase shell.
- [ ] Добавить CI-equivalent local command `npm run verify`.
- [ ] Зафиксировать правило: новые migrations только forward; generated types обновляются после migration.

### Required checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run validate:fixtures
npm run test:e2e -- --project=chromium --grep @smoke
```

Ожидание: все команды существуют и exit `0`.

### Exit criteria

- Supabase Auth работает через cookie-compatible clients.
- Browser client больше не является единственной auth/session точкой.
- Demo watchers не монтируются в Supabase mode.
- Чистый clone/local reset имеет одну документированную verify command.
- Новая feature может быть размещена по dependency rule без импорта `store/*` в domain/application.

## 13. T1 — Identity, Project Access & Capabilities

**Цель:** привести Auth/RBAC/scope к manual и сделать project isolation реальным на UI и DB уровнях.

**Отдельный execution plan:** `docs/superpowers/plans/2026-07-31-track-01-access-capabilities.md`.

### Database

- `supabase/migrations/20260731090000_access_capabilities.sql`;
- `supabase/migrations/20260731091000_access_capability_rls.sql`;
- `supabase/tests/database/010_access_capabilities.test.sql`;
- `supabase/tests/database/011_project_scope_isolation.test.sql`.

### Application/UI

- `modules/access/domain/capability.ts`;
- `modules/access/domain/effective-access.ts`;
- `modules/access/application/load-access-context.ts`;
- `modules/access/infrastructure/supabase-access-repository.ts`;
- `modules/access/ui/capability-guard.tsx`;
- `modules/access/ui/access-rights-screen.tsx`;
- `config/route-capabilities.ts`;
- `app/(protected)/layout.tsx`;
- миграция protected pages в route group без изменения публичных URL.

### Tasks

- [ ] Ввести `roles`, `capabilities`, `role_capabilities`, `project_membership_roles`.
- [ ] Seed canonical roles: Project Admin, Site Admin, Project Editor, Subcontractor, Project Reader и functional QC/NDE/Spooling/Fabrication/Tracking/Test Pack roles.
- [ ] Оставить System Admin global через `profiles.is_platform_admin`.
- [ ] Перенести current single `role` enum к compatibility column, затем убрать его из authorization decisions.
- [ ] Реализовать `current_user_has_capability(project_id, capability)`.
- [ ] Реализовать deny-by-default PDS/subcontractor scope helpers.
- [ ] Разрешить membership читать собственные scope rows.
- [ ] Заменить `lib/scope-lock.ts` на access context из Supabase.
- [ ] Вынести navigation visibility в `config/route-capabilities.ts`.
- [ ] Добавить protected layout/direct-route guard для корректного 403 UX.
- [ ] Переподключить Access Rights screen к реальным membership/role/scope rows.
- [ ] Убрать demo role switcher в Supabase mode окончательно.
- [ ] Добавить audit для membership/role/scope changes.
- [ ] Проверить System Admin: видит все проекты и все modules.
- [ ] Проверить Project Reader: может читать, не может мутировать.
- [ ] Проверить Subcontractor: не видит записи без своего PDS/subcontractor scope.

### Behavioral test matrix

| Actor | Project A | Project B | Mutation |
| --- | --- | --- | --- |
| System Admin | Read/write | Read/write | Да |
| Project Admin A | Read/write | No rows | Только A |
| Reader A | Read | No rows | Нет |
| Subcontractor A/PDS-1 | Только scoped rows | No rows | Только разрешенные commands |
| User without membership | No rows | No rows | Нет |

### Exit criteria

- Скрытый route и прямой URL дают одинаковую capability semantics.
- Ни один operational query не использует localStorage subcontractor code.
- Cross-project и out-of-scope reads/writes доказуемо отклоняются pgTAP/integration tests.
- Access Rights UI действительно меняет Supabase/RLS outcome.

## 14. T2 — Project/System Referential Completion

**Цель:** завершить setup dependencies до начала operational entry.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-01-track-02-project-referentials.md`.

### Database

- `supabase/migrations/20260801090000_complete_project_referentials.sql`;
- `supabase/migrations/20260801091000_referential_invariants.sql`;
- `supabase/migrations/20260801092000_project_storage_buckets.sql`;
- `supabase/tests/database/020_project_referentials.test.sql`;
- `supabase/tests/database/021_referential_usage_guards.test.sql`.

### Modules

- `modules/project-setup/domain/`;
- `modules/project-setup/application/`;
- `modules/project-setup/infrastructure/`;
- `modules/project-setup/ui/`;
- adapters для существующих `app/admin/**`.

### Tasks

- [ ] Завершить CRUD для всех четырех System Referential kinds.
- [ ] Смоделировать typed attributes Film Quantity, UT Calculation и Torquing Requirement, не оставляя произвольный unvalidated JSON.
- [ ] Подключить к Supabase все существующие Project Referential tabs.
- [ ] Добавить отсутствующие Devices/PDA Users.
- [ ] Добавить Spooling Material Type/Class/Checklist.
- [ ] Добавить RAL и Paint Matrix.
- [ ] Добавить Assembly setup/assignment.
- [ ] Добавить max-three custom fields per scope.
- [ ] Добавить progress weight set command с суммой 100 и Assembly.
- [ ] Привести WPS, welder qualifications, NDE Matrix, rework, thickness/flange и joint categories к dossier constraints.
- [ ] Реализовать archive-in-use behavior вместо unsafe hard delete.
- [ ] Создать private bucket `project-branding`; перевести owner/contractor logo с внешнего URL на Storage object.
- [ ] Удалить Supabase mode imports из `store/admin-store.ts`.
- [ ] Добавить referential usage error с понятным списком blockers.

### Exit criteria

- Каждый setup dropdown operational modules получает данные из выбранного project.
- В Supabase mode Project Referential не читает `admin-store`.
- Нельзя удалить используемый reference или создать cross-project reference.
- Progress weights и custom fields соблюдают source constraints.
- Setup completion projection показывает, чего не хватает до import/progress entry.

## 15. T3 — Import Platform & Storage

**Цель:** построить один reusable import lifecycle вместо отдельных browser-only XLSX dialogs.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-02-track-03-import-platform.md`.

### Database and Storage

- `supabase/migrations/20260802090000_import_platform.sql`;
- `supabase/migrations/20260802091000_import_storage_policies.sql`;
- `supabase/migrations/20260802092000_apply_import_commands.sql`;
- `supabase/functions/process-import/index.ts`;
- `supabase/functions/_shared/import-contract.ts`;
- `supabase/tests/database/030_import_lifecycle.test.sql`;
- `supabase/tests/integration/import-storage.test.ts`.

### Application/UI

- `modules/imports/domain/import-job.ts`;
- `modules/imports/domain/import-issue.ts`;
- `modules/imports/application/create-import.ts`;
- `modules/imports/application/apply-import.ts`;
- `modules/imports/infrastructure/supabase-import-repository.ts`;
- `modules/imports/ui/import-workbench.tsx`;
- `modules/imports/ui/import-history.tsx`;
- `modules/imports/ui/import-conflict-dialog.tsx`.

### Tasks

- [x] Эволюционировать `import_jobs` к утвержденному lifecycle.
- [x] Создать private `project-imports` bucket и project-scoped Storage policies.
- [x] Сохранять checksum, media type, size, original filename и Storage path.
- [x] Ввести parser registry по `import_type`.
- [x] Реализовать template download.
- [x] Реализовать file upload → validation job → preview.
- [x] Представлять red blocker, yellow overwrite confirmation и warning разными типами issue.
- [x] Запретить apply при unresolved blocker/conflict.
- [x] Выполнять apply одной SQL transaction.
- [x] Хранить примененные row counts и affected entity IDs.
- [x] Сделать applied/canceled/failed history read-only.
- [x] Перевести PML/WPS/Welder imports с `admin-store` на platform.
- [x] Добавить retry, который не создает duplicate apply.
- [x] Не выводить raw parser/SQL errors пользователю.

*Note: The `supabase/functions/process-import/` edge function was deliberately not built; synchronous client-side parsing + atomic database RPC `apply_import_job` was implemented as specified in plan §3.6 to avoid multi-region network latency.*

### Exit criteria

- Исходный файл можно скачать из history при наличии capability.
- Preview не меняет domain tables.
- Apply либо применяет все разрешенные rows, либо ни одной.
- Один job нельзя применить дважды.
- PML/WPS/Welder import после refresh показывает тот же durable result.

## 16. T4 — Engineering Definition & Revision

**Цель:** создать upstream operational spine, на который безопасно ссылаются все downstream contexts.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-03-track-04-engineering-revisions.md`.

### Database

- `supabase/migrations/20260803090000_engineering_entities.sql`;
- `supabase/migrations/20260803091000_engineering_revisions.sql`;
- `supabase/migrations/20260803092000_spooling_import_apply.sql`;
- `supabase/migrations/20260803093000_revision_commands.sql`;
- `supabase/tests/database/040_engineering_identity.test.sql`;
- `supabase/tests/database/041_revision_workflow.test.sql`;
- `supabase/tests/database/042_spooling_apply.test.sql`.

### Modules

- `modules/engineering/domain/isometric.ts`;
- `modules/engineering/domain/revision.ts`;
- `modules/engineering/domain/spool.ts`;
- `modules/engineering/domain/weld-joint.ts`;
- `modules/engineering/application/import-spooling.ts`;
- `modules/engineering/application/resolve-revision.ts`;
- `modules/engineering/infrastructure/supabase-engineering-repository.ts`;
- `modules/engineering/ui/spooling-import-screen.tsx`;
- `modules/engineering/ui/revision-workbench.tsx`;
- `modules/engineering/ui/engineering-browser.tsx`.

### Tasks

- [ ] Ввести stable и revision tables для ISO/spool/weld/support/flange.
- [ ] Зафиксировать uniqueness project + business number и одну active accepted revision.
- [ ] Реализовать до четырех SpoolGen files и 4 MB limit на каждый.
- [ ] Проверить PDS, Service Class, Weld Type, Thickness и NDE Matrix как blockers.
- [ ] Оставить missing WPS warning.
- [ ] Реализовать cross-file consistency `weld/trace/bolt/supp`.
- [ ] Создать import preview new/revised/unchanged/removed.
- [ ] Ввести spool/weld/support/flange revision change items.
- [ ] Реализовать решения Not Done, Cancelled, Done without Modification, Rework.
- [ ] Реализовать controlled progress copy с provenance.
- [ ] Сделать old revisions read-only.
- [ ] Убрать `composeAndSendTransmittal` side effect, помечающий ISO superseded.
- [ ] Убрать duplicate same-ID revision pattern из `store/spooling-store.ts`.
- [ ] Подключить Engineering Transmittal/ISO Workflow/Spooling Transmittal к новой модели.
- [ ] Добавить Browse hierarchy ISO → spool → weld/support/flange и revision history.
- [ ] Добавить Assembly ownership в PDS mapping.

### Exit criteria

- Реальный import создает связный revision graph.
- Повторный import одинаковых файлов идемпотентен.
- Revision не меняет old rows.
- Downstream record всегда ссылается на конкретную revision.
- Revision mismatch блокирует progress command и объясняется пользователю.

## 17. T5 — Fabrication & Material Traceability

**Цель:** реализовать первый полный production vertical slice от active spool revision до durable Fabrication QC Release.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-04-track-05-fabrication.md`.

### Database

- `supabase/migrations/20260804090000_fabrication_progress.sql`;
- `supabase/migrations/20260804091000_material_traceability.sql`;
- `supabase/migrations/20260804092000_weld_progress_commands.sql`;
- `supabase/migrations/20260804093000_fabrication_release.sql`;
- `supabase/tests/database/050_material_traceability.test.sql`;
- `supabase/tests/database/051_weld_progress.test.sql`;
- `supabase/tests/database/052_fabrication_release.test.sql`.

### Modules

- `modules/construction/domain/construction-phase.ts`;
- `modules/construction/domain/material-check.ts`;
- `modules/construction/domain/weld-progress.ts`;
- `modules/construction/domain/quality-release.ts`;
- `modules/construction/application/record-material-check.ts`;
- `modules/construction/application/record-weld-progress.ts`;
- `modules/construction/application/release-spool.ts`;
- `modules/construction/infrastructure/supabase-construction-repository.ts`;
- `modules/construction/ui/fabrication/`.

### Tasks

- [x] Ввести Fabrication progress/event tables и commands.
- [x] Связать material items с конкретной spool revision и project PML.
- [x] Валидировать heat number/material type/spec и сохранять checked evidence.
- [x] Смоделировать weld points Root/Cap и multiple welders per joint.
- [x] Валидировать WPS range/material/date (WPS position is explicitly outside scope; see track plan §6).
- [x] Валидировать welder qualification на дату work record.
- [x] Проверять Root/Cap percentage totals.
- [x] После первого accepted NDE запретить редактирование защищенных weld fields; correction выполнять отдельной command.
- [x] Генерировать NDE obligations из Matrix после weld completion.
- [x] Реализовать Fabricated stage как derived completion, а не ручной flag.
- [x] Реализовать QC-13 request/progress record.
- [x] Блокировать QC Release при outstanding NDE/PWHT.
- [x] Подключить Paint и Laydown durable records.
- [x] Перевести все `app/fabrication/**` screens на Supabase adapter.
- [x] Удалить Supabase mode usage `spools-store`, `welds-store`, `qc-release-store`, `paint-store`, `laydown-store`, `pwht-store`.

### Golden path

```text
Active spool revision
→ material checked against PML
→ root/cap weld points recorded by qualified welders/WPS
→ fabricated derived
→ NDE obligations created
→ accepted obligations/PWHT
→ QC Release
→ paint
→ laydown
```

### Negative paths

- invalid heat;
- expired welder qualification;
- WPS out of diameter/thickness range;
- Root/Cap total over 100%;
- progress on superseded revision;
- QC Release with pending NDE/PWHT;
- duplicate retry.

### Exit criteria

- Один spool проходит полный path только через Supabase.
- Refresh/second user видит результат.
- Каждый step имеет actor/date/revision/evidence/audit.
- UI disable и RPC rejection выражают одинаковый invariant.
- Fabrication dashboard строится из DB projections, не fixtures.

## 18. T6 — NDE, Repair, Tracer & PWHT

**Цель:** реализовать канонический Quality/NDE aggregate и закрыть самый рискованный набор QC правил.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-07-track-06-nde-quality.md`.

### Database

> **Проверено 2026-08-06 против дерева.** Прежний список неисполним: `20260805090000_nde_obligations.sql` конфликтует с уже применённой `20260805090000_track05_remediation.sql`, а три перечисленные таблицы уже созданы Track 05.

Уже существует — Track 06 **изменяет, а не создаёт**:

- `nde_obligations` (`20260804092000_weld_progress_commands.sql:47`) — `disposition text check (in ('pending','satisfied','waived'))`, `unique (weld_joint_revision_id, method)`;
- `pwht_requirements` (`20260804092000_weld_progress_commands.sql:65`);
- `pwht_results` (`20260804093000_fabrication_release.sql:18`);
- `record_nde_obligation_outcome(uuid, text, text)` (`20260804092200_weld_progress_locks.sql:137`) — **interim**, подлежит удалению и замене, а не расширению.

Два блокера, которые Track 06 обязан снять в первой же миграции:

1. **`unique (weld_joint_revision_id, method)`** запрещает второе obligation на тот же шов и метод. Repair R1/R2 и tracer T1/T2 — это именно дополнительные obligations на тот же шов и метод, поэтому вся модель Track 06 упирается в это ограничение. Его нужно расширить (например до `unique (weld_joint_revision_id, method, cycle_kind, cycle_ordinal)`), а не обходить новой таблицей.
2. **`spool_fabrication_readiness.nde_pending` считает `disposition = 'pending'`**, и от неё зависят `is_releasable` и отказ `PQC37`. Любое изменение словаря `disposition` меняет release gate, поэтому view заменяется в той же миграции — иначе QC release молча начнёт пропускать спулы с открытым NDE.

Новые файлы Track 06 (таймстемпы после `20260805091000`):

- `supabase/migrations/20260807090000_nde_obligation_lifecycle.sql` — расширение `nde_obligations`, снятие блокера 1, замена `spool_fabrication_readiness` (блокер 2), удаление `record_nde_obligation_outcome`;
- `supabase/migrations/20260807091000_nde_batches_results.sql`;
- `supabase/migrations/20260807092000_nde_repair_tracer.sql`;
- `supabase/migrations/20260807093000_nde_penalty_commands.sql`;
- `supabase/migrations/20260807094000_pwht_quality_gate.sql`;
- `supabase/tests/database/060_nde_batch_invariants.test.sql`;
- `supabase/tests/database/061_nde_repair_tracer_truth_table.test.sql`;
- `supabase/tests/database/062_nde_penalty.test.sql`;
- `supabase/tests/database/063_pwht_release.test.sql`.

Track 05 занимает коды `PQC30`–`PQC39`; Track 06 начинает с `PQC40`.

> **Обязательно для Track 06.** Каждый новый экран проходится в браузере по `docs/qa/local-supabase-browser-runbook.md` до объявления трека завершённым. Прогон 2026-08-02 нашёл в Track 05 запрос, который ломал весь fabrication golden path и при этом проходил `typecheck`, pgTAP и unit-тесты: `@supabase/supabase-js` 2.110.8 не типизирует строки `.select()`. `modules/construction/infrastructure/construction-select-columns.test.ts` закрывает этот класс для construction — для новых модулей Track 06 нужен свой аналог.

### Modules

- `modules/quality/domain/nde-obligation.ts`;
- `modules/quality/domain/nde-batch.ts`;
- `modules/quality/domain/repair-cycle.ts`;
- `modules/quality/domain/tracer.ts`;
- `modules/quality/domain/penalty-escalation.ts`;
- `modules/quality/application/create-batch.ts`;
- `modules/quality/application/record-results.ts`;
- `modules/quality/application/assign-tracers.ts`;
- `modules/quality/infrastructure/supabase-quality-repository.ts`;
- `modules/quality/ui/`.

### Tasks

- [ ] Создавать obligations из active NDE Matrix snapshot.
- [ ] Сохранять category `S`, `SS`, `NR`, `H`, `HS`, `NDE100` явно.
- [ ] Запретить batch из разных welders/categories/methods.
- [ ] Реализовать automatic candidate allocation до требуемого percentage/count.
- [ ] Поддержать issued/returned/results received/closed lifecycle.
- [ ] Записывать result per joint, а не bulk-accept без выбора.
- [ ] На rejection создать mandatory repair R1, затем R2 при повторном rejection.
- [ ] Связать repair с original weld и defect/rework code.
- [ ] Создать T1/T2 candidates с documented restrictions.
- [ ] Запретить выбирать уже использованный/неподходящий tracer.
- [ ] Триггерить 100% только после четвертого rejection или rejected second-level tracer.
- [ ] Не считать наличие T2 assignment rejection.
- [ ] Реализовать NDE100 remaining eligible population snapshot.
- [ ] Реализовать Examination Request и Client Examination progress.
- [ ] Реализовать PWHT obligation/result и связь с quality release.
- [ ] Перевести NDE dashboard/batch management/history на Supabase.
- [ ] Удалить Supabase mode usage `batches-store` и NDE mutation в `welds-store`.

### Mandatory truth-table tests

1. Accepted original: obligation closed, repair/tracer отсутствуют.
2. Rejected original: R1 + two first-level tracer obligations.
3. Rejected R1: R2 создается согласно policy.
4. Accepted T1/T2: escalation не создается.
5. Rejected second-level tracer: NDE100 escalation создается.
6. Four total rejections for welder/category population: NDE100 создается.
7. Three rejections: NDE100 не создается.
8. Result другого project/superseded revision отклоняется.

### Exit criteria

- Batch selection воспроизводим и объясним.
- Repair/tracer lineage виден от original до current result.
- Quality Release использует obligations, а не ad hoc status.
- Shop/Assembly/Field используют один Quality context.
- Truth table проходит domain unit и pgTAP behavioral suites.

## 19. T7 — Erection (Assembly — опциональный, отложенный модуль)

**Цель:** завершить construction chain через first-class Erection, переиспользуя Construction/Quality contracts.

> **Assembly в объём T7 не входит.** Оригинальный Easy Piping (Technip) поставлялся без него — модуль был только в планах. Схема это уже отражает: `project_assembly_settings.enabled` по умолчанию `false` (`20260801090000_complete_project_referentials.sql:155`), а `assert_project_setup_ready` требует `nde_matrix_assembly` и веса фазы `assembly` **только** при включённом флаге. Экраны `modules/construction/ui/assembly/` не пишутся, команды фазы `assembly` не реализуются; фаза остаётся в enum `construction_phase` как точка расширения.
>
> При этом `weld_location` допускает `shop`, `assembly`, `field`: SpoolGen может прислать монтажный стык независимо от флага. Такой шов не должен блокировать цеховую готовность — сужение счёта в `spool_fabrication_readiness` до `weld_location = 'shop'` выполняется в Track 06 Task 1, где эта view и так заменяется.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-06-track-07-assembly-erection.md`.

### Database

- `supabase/migrations/20260806090000_construction_phase_progress.sql`;
- `supabase/migrations/20260806091000_assembly_erection_commands.sql`;
- `supabase/migrations/20260806092000_erection_readiness.sql`;
- `supabase/tests/database/070_construction_phase_transitions.test.sql`;
- `supabase/tests/database/071_erection_rft.test.sql`.

### Application/UI

- `modules/construction/domain/phase-policy.ts`;
- `modules/construction/application/record-construction-progress.ts`;
- `modules/construction/application/release-erection-spool.ts`;
- `modules/construction/ui/shared/`;
- `modules/construction/ui/assembly/`;
- `modules/construction/ui/erection/`;
- `app/(protected)/assembly/**`;
- существующие `app/erection/**` adapters.

### Tasks

- [x] Решение Track 07: Assembly остаётся отключённой extension point; в этот трек входит только Erection.
- [ ] Реализовать phase policy для Fabrication/Erection.
- [ ] Реализовать Erection sequence To Site → Erected → Welded/Bolted → Supported.
- [ ] Связать Field Material Check с PML.
- [ ] Писать field root/cap/multiple-welder progress через общий weld command.
- [ ] Создавать field NDE/PWHT obligations через Quality context.
- [ ] Реализовать W-24/W-23 work form records.
- [ ] Вычислять Erection QC Release/RFT из progress + accepted Quality obligations.
- [ ] Запретить ручной RFT flag.
- [ ] Перевести все `app/erection/**` screens на Supabase.
- [ ] Удалить Supabase mode usage `to-site-store`, `erected-store`, `welded-bolted-store`, `supports-store`, `field-material-check-store`, `field-qc-release-store`, `rft-store`, `erection-store`.
- [ ] Исправить navigation parent routes, чтобы collapsed sidebar не вел на 404.

### Exit criteria

- Assembly отсутствует в UI и командах Track 07, а включение остаётся отдельным будущим решением.
- Field weld использует тот же Quality context, что shop weld.
- RFT spool выводится из authoritative records.
- Ни один Erection store не является persistence в Supabase mode.
- `/fabrication/spool-fabrication` и `/erection/spool-erection` имеют рабочие landing routes или корректные non-link branches.

## 20. T8 — Tracking & Offline PWA

**Цель:** реализовать append-only spool movement history, device access и безопасную offline synchronization.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-07-track-08-tracking-pwa.md`.

### Database

- `supabase/migrations/20260807090000_tracking_events.sql`;
- `supabase/migrations/20260807091000_tracking_devices_sync.sql`;
- `supabase/migrations/20260807092000_tracking_projections.sql`;
- `supabase/tests/database/080_tracking_append_only.test.sql`;
- `supabase/tests/database/081_tracking_scope_sync.test.sql`.

### Application/PWA

- `modules/tracking/domain/location-event.ts`;
- `modules/tracking/domain/tracking-inconsistency.ts`;
- `modules/tracking/application/record-scan.ts`;
- `modules/tracking/application/synchronize-scans.ts`;
- `modules/tracking/infrastructure/supabase-tracking-repository.ts`;
- `modules/tracking/infrastructure/offline-scan-queue.ts`;
- `modules/tracking/ui/`;
- `app/manifest.ts`;
- PWA service worker/build integration;
- IndexedDB/Dexie-backed offline queue.

### Tasks

- [ ] Ввести append-only `spool_location_events`.
- [ ] Разрешить correction только compensating event.
- [ ] Вычислять current location по последнему accepted event.
- [ ] Определять active spool по Start Fabrication/Erection facts из published contracts.
- [ ] Реализовать IN/OUT/MANUAL semantics и inconsistency rules.
- [ ] Реализовать transit-out по project maximum days.
- [ ] Перенести locations/capacity из hardcoded `lib/spool-tracking.ts` в project referential.
- [ ] Подключить Devices/PDA Users и device revocation.
- [ ] Добавить QR/barcode payload с stable spool/revision identity.
- [ ] Реализовать offline queue с client event UUID/idempotency key.
- [ ] Реализовать sync batch с per-item accepted/rejected/conflict result.
- [ ] При revision/scope conflict не терять scan, а показывать resolution.
- [ ] Сделать PWA installable и ограничить cached data effective scope.
- [ ] Перевести tracking dashboard/data analysis/barcode screens на Supabase.
- [ ] Удалить fail-open `pdsAreaCode: undefined`.
- [ ] Удалить Supabase mode usage `spool-tracking-store`.

### Exit criteria

- Два устройства не создают duplicate event при retry.
- Out-of-scope device не скачивает и не отправляет чужие spools.
- Offline scan синхронизируется после reconnect с понятным item result.
- Current location, inconsistencies, transit alerts и capacity строятся из DB projections.
- Event history нельзя переписать browser update/delete.

## 21. T9 — Flange Management

**Цель:** реализовать bolting definition/progress, revision safety, multiple jointers и dynamic UT.

**Статус на 2026-08-05:** Track 09 реализован в текущем checkout: referentials, append-only
progress ledger, single progress command, revision carry-over/readiness, import path и две
Supabase UI-рoutes. Automated gates PASS (108 unit tests, 621 database assertions, build и
diff-check); browser walkthrough остаётся BLOCKED до подключения browser backend и безопасного
local fixture bootstrap.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-08-track-09-flange.md`.

### Database

- `supabase/migrations/20260808090000_flange_progress.sql`;
- `supabase/migrations/20260808091000_flange_revision_ut.sql`;
- `supabase/migrations/20260808092000_flange_commands.sql`;
- `supabase/tests/database/090_flange_revision_gate.test.sql`;
- `supabase/tests/database/091_flange_ut_jointers.test.sql`.

### Modules

- `modules/flange/domain/flange-progress.ts`;
- `modules/flange/domain/ut-calculation.ts`;
- `modules/flange/application/import-bolting.ts`;
- `modules/flange/application/record-flange-progress.ts`;
- `modules/flange/infrastructure/supabase-flange-repository.ts`;
- `modules/flange/ui/`.

### Tasks

- [ ] Применить bolting import через T3 platform.
- [ ] Связать flange definition с stable joint и active revision.
- [ ] Реализовать documented joint categories/timing rules.
- [ ] Поддержать несколько jointers на один joint.
- [ ] Запретить progress с revision mismatch.
- [ ] Реализовать explicit revision resolution/copy.
- [ ] Считать UT по current referential, но сохранять coefficient/formula snapshot.
- [ ] Валидировать torque/bolt completion до readiness.
- [ ] Связать flange joint с Y/Z reinstatement ownership.
- [ ] Перевести `/flange` и `/erection/flange-progress` на Supabase.
- [ ] Удалить alias-поля `testPackId/testpackId`, `isoNo/isoNumber`.
- [ ] Удалить Supabase mode usage `flange-store`, `flange-bolt-progress-store`.

### Exit criteria

- Bolting import создает versioned flange definitions.
- Несовпадающая revision блокирует progress.
- Multiple jointers сохраняются и отображаются.
- UT result воспроизводится из сохраненных raw inputs/snapshot.
- Test Pack получает единственный published flange readiness fact.

## 22. T10 — Test Pack & Pressure Test

**Цель:** заменить конфликтующие test-pack stores одним aggregate и реализовать канонический Pressure Test workflow.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-09-track-10-test-pack.md`.

### Database

- `supabase/migrations/20260809090000_test_pack_core.sql`;
- `supabase/migrations/20260809091000_line_check_punch.sql`;
- `supabase/migrations/20260809092000_pressure_test_workflow.sql`;
- `supabase/migrations/20260809093000_test_pack_readiness_views.sql`;
- `supabase/tests/database/100_test_pack_composition.test.sql`;
- `supabase/tests/database/101_rft_truth_table.test.sql`;
- `supabase/tests/database/102_pressure_test_transitions.test.sql`.

### Modules

- `modules/pressure-test/domain/test-pack.ts`;
- `modules/pressure-test/domain/readiness.ts`;
- `modules/pressure-test/domain/punch-item.ts`;
- `modules/pressure-test/domain/pressure-test-workflow.ts`;
- `modules/pressure-test/application/compose-test-pack.ts`;
- `modules/pressure-test/application/assign-line-check.ts`;
- `modules/pressure-test/application/record-pressure-test.ts`;
- `modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts`;
- `modules/pressure-test/ui/`.

### Tasks

- [ ] Создать stable Test Pack aggregate и composition.
- [ ] Запретить одному active ISO принадлежать нескольким active Test Pack.
- [ ] Реализовать manual builder и import через T3.
- [ ] Удалить статическую explorer model и оставить одну DB model.
- [ ] Реализовать Line Check eligibility.
- [ ] Реализовать Preparation → assigned request → Progress.
- [ ] Создать punch X во время Line Check.
- [ ] Реализовать X clearance requests/progress.
- [ ] Создать authoritative `isometric_readiness` view.
- [ ] Создать authoritative `test_pack_readiness` view.
- [ ] Формула ISO RFT: complete + QC released + line check done + X cleared.
- [ ] Явно исключить blinding из RFT.
- [ ] Разрешить Blinding только после Test Pack RFT.
- [ ] Реализовать Testing и Precommissioning transitions.
- [ ] Реализовать Y/Z reinstatement requests/progress.
- [ ] Включить Flange published readiness в соответствующие pressure-test gates.
- [ ] Переподключить Builder/Explorer и все pressure-test screens.
- [ ] Исправить remove/move ISO consistency.
- [ ] Удалить `recordSpoolRFT` watcher и ручные `readyForTest`.
- [ ] Удалить Supabase mode usage `testpack-store`.

### Mandatory RFT truth table

| Complete | QC Released | Line Check | X open | Blinding | RFT |
| --- | --- | --- | ---: | --- | --- |
| Да | Да | Done | 0 | Not started | Да |
| Нет | Да | Done | 0 | Done | Нет |
| Да | Нет | Done | 0 | Done | Нет |
| Да | Да | Pending | 0 | Done | Нет |
| Да | Да | Done | 1 | Done | Нет |
| Да | Да | Done | 0 | Done | Да |

Пустой Test Pack не является RFT.

### Exit criteria

- Builder и Explorer читают одну модель.
- Изменение upstream weld/NDE/flange/progress меняет readiness projection без watcher mutation.
- Невалидный переход отклоняется RPC.
- Pressure Test workflow проходит Line Check → X → RFT → Blinding → Test/Precomm → Y/Z.
- Print forms ссылаются на durable request IDs.

## 23. T11 — Documents, Forms & Reports

**Цель:** сделать forms/reports частью workflow и устранить fake download paths.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-10-track-11-documents-reports.md`.

### Database/Storage/Functions

- `supabase/migrations/20260810090000_documents_reports.sql`;
- `supabase/migrations/20260810091000_generated_documents_storage.sql`;
- `supabase/functions/generate-document/index.ts`;
- `supabase/functions/_shared/report-snapshot.ts`;
- `supabase/tests/database/110_report_runs.test.sql`;
- `supabase/tests/integration/generated-documents.test.ts`.

### Modules

- `modules/documents/domain/document-request.ts`;
- `modules/documents/domain/report-run.ts`;
- `modules/documents/application/request-report.ts`;
- `modules/documents/application/get-artifact.ts`;
- `modules/documents/infrastructure/supabase-document-repository.ts`;
- `modules/documents/ui/`.

### Tasks

- [ ] Создать `generated-documents` private bucket.
- [ ] Зафиксировать report definitions и required capabilities.
- [ ] Перенести четыре существующих генератора на DB snapshot input.
- [ ] Реализовать остальные восемь advertised reports или удалить карточку до реализации.
- [ ] Генерировать W24/W23/QC13/Examination/Line Check/Blinding/Reinstatement forms из durable records.
- [ ] Сохранять report parameters, source version/snapshot timestamp, actor и artifact checksum.
- [ ] Сделать report run lifecycle requested/running/completed/failed.
- [ ] Показывать success только при completed artifact.
- [ ] Добавить history/re-download по Storage policy.
- [ ] Реализовать Test Pack dossier/handover bundle.
- [ ] Добавить audit export для Project Admin/System Admin.
- [ ] Заменить `REAL_REPORT_GENERATORS` + fallback toast единым registry без fake branch.
- [ ] Проверить PDF/XLSX content against pilot dataset.

### Exit criteria

- Каждая видимая report card создает файл.
- Report воспроизводим и привязан к source snapshot.
- Пользователь не может скачать artifact чужого проекта.
- Forms используют durable request/progress records.
- Test Pack dossier содержит traceable ISO/spool/weld/NDE/flange/pressure-test evidence.

- Домашний дашборд `/` в Supabase-режиме показывает демо-цифры: браузерный прогон 2026-08-02 при `spools=0` увидел «Welds requiring action 1», «NDE batches active 4» и уведомления `PL-FU300-007-A`. Он читает `welds-store`/`batches-store`. Временно закрыт баннером; перевод на `spool_construction_status` и реальные уведомления — задача T11.

## 24. T12 — Hardening, Pilot Data & Release

**Цель:** собрать воспроизводимый рабочий prototype и доказать end-to-end сценарии.

**Отдельный execution plan:** `docs/superpowers/plans/2026-08-11-track-12-prototype-release.md`.

### Deliverables

- `supabase/seed.sql`;
- `supabase/tests/database/120_full_rls_matrix.test.sql`;
- `supabase/tests/database/121_audit_immutability.test.sql`;
- `supabase/tests/integration/golden-project.test.ts`;
- `tests/e2e/golden-path.spec.ts`;
- `tests/e2e/negative-paths.spec.ts`;
- `tests/e2e/role-isolation.spec.ts`;
- `docs/runbooks/local-prototype.md`;
- `docs/runbooks/backup-restore.md`;
- `docs/runbooks/pilot-demo.md`;
- `docs/acceptance/prototype-acceptance.md`.

### Pilot dataset

Один самостоятельный проект `PQ-DEMO-001`:

- два subcontractors;
- shop/assembly/field PDS assignments;
- полный referential minimum;
- две ISO с revision history;
- минимум три spools;
- material trace records;
- минимум восемь weld joints;
- один normal accepted NDE path;
- один rejection → R1 → accepted path;
- один T1/T2 escalation path;
- один tracked spool с offline scan retry;
- flange с двумя jointers и UT;
- один Test Pack, проходящий полный pressure-test workflow;
- completed report/dossier artifacts.

### Tasks

- [ ] Удалить operational fixture fallback из Supabase mode.
- [ ] Оставить demo fixtures только как отдельный demo/story environment.
- [ ] Проверить все RLS policies разными JWT users.
- [ ] Проверить audit immutable и actor не spoofable.
- [ ] Добавить indexes для `project_id`, active revision, scope, status, event time и policy predicates.
- [ ] Проверить query plans на основные dashboards.
- [ ] Добавить pagination/filter contracts; не полагаться на Data API max 1000.
- [ ] Проверить optimistic concurrency двумя браузерами.
- [ ] Проверить offline sync conflict/retry.
- [ ] Проверить object Storage isolation.
- [ ] Добавить structured error logging без секретов/PII payload.
- [ ] Документировать local reset/seed/start/verify.
- [ ] Документировать backup/restore, отдельно отметив Storage.
- [ ] Запустить complete Playwright role matrix.
- [ ] Провести ручной audit всех visible actions: ни одного fake success.
- [ ] Провести accessibility keyboard/focus audit critical forms.
- [ ] Зафиксировать known limitations prototype.

### Exit criteria

- Чистый local reset + seed поднимает готовый prototype.
- Golden path проходит в Playwright.
- Negative paths доказуемо блокируются.
- Второй project/user не видит данные первого.
- Все visible actions имеют durable outcome или честно disabled.
- `npm run verify` проходит.
- Acceptance checklist подписан результатами, а не плановыми утверждениями.

## 25. Release gates

### Gate A — Trustworthy setup

Треки: T0–T2.

Демонстрируется:

- real Auth/project selection;
- real roles/scopes;
- complete referentials;
- no demo mutations in Supabase mode setup.

### Gate B — Golden production thread

Треки: T3–T6.

Демонстрируется:

```text
real files → import preview/apply → ISO/spool/weld revision
→ material/weld progress → NDE → repair/tracer → QC Release
```

Это первый момент, когда продукт представляет технически честную end-to-end ценность.

### Gate C — Site and test readiness

Треки: T7–T10 плюс T8.

Демонстрируется:

```text
Assembly/Erection → Tracking → Flange → Test Pack RFT
→ Blinding → Pressure Test/Precomm → Reinstatement
```

### Gate D — Working prototype

Треки: T11–T12.

Демонстрируется:

- реальные forms/reports/dossier;
- repeatable seed;
- role/project isolation;
- audit;
- browser E2E;
- no fake actions.

## 26. Общая test strategy

### 26.1. Domain unit tests

Проверяют pure truth tables без React/Supabase:

- revision decisions;
- Root/Cap totals;
- NDE candidate/escalation;
- construction transitions;
- tracking derivation;
- RFT;
- dynamic UT.

Путь: `modules/*/domain/*.test.ts`.

### 26.2. Application tests

Проверяют use case через fake ports:

- authorization requested;
- version/idempotency passed;
- domain failure mapped to typed error;
- audit/outbox intent emitted.

Путь: `modules/*/application/*.test.ts`.

### 26.3. pgTAP

Проверяет:

- schema constraints;
- functions;
- RLS с JWT actors;
- transaction atomicity;
- immutable history;
- cross-tenant/scope denial;
- command idempotency;
- DB truth tables.

Путь: `supabase/tests/database/`.

### 26.4. Supabase integration

Проверяет реальный JS client:

- Auth/session;
- RPC payload/result mapping;
- Storage policies;
- Edge Function invocation;
- generated types compatibility.

Путь: `supabase/tests/integration/`.

### 26.5. Browser E2E

Проверяет только critical user journeys и role/direct-route behavior. Playwright не заменяет DB tests.

Путь: `tests/e2e/`.

### 26.6. Definition of Done для любой mutation

- [ ] Domain invariant имеет unit test.
- [ ] DB/RLS behavior имеет pgTAP.
- [ ] Application adapter не принимает raw `any`.
- [ ] UI показывает pending/success/error.
- [ ] Success следует после durable result.
- [ ] Audit row создан в той же transaction.
- [ ] Retry idempotent.
- [ ] Wrong project/scope test присутствует.
- [ ] Generated types обновлены.
- [ ] Existing fixture/demo path не используется в Supabase mode.

## 27. Миграционная стратегия

### 27.1. Не делать big-bang UI rewrite

Существующий UI мигрируется screen by screen внутри трека, но Supabase adapter подключается только после готовности domain/schema.

### 27.2. Не смешивать adapters внутри завершенного модуля

Временное состояние допустимо только на уровне разных модулей:

- Fabrication может быть уже real;
- Tracking еще demo.

Но внутри real Fabrication нельзя брать WPS из Supabase, а weld progress из localStorage.

### 27.3. Demo mode

До Gate D demo mode можно сохранить:

- как отдельный adapter;
- для visual regression/story;
- с явной маркировкой.

Он не является fallback при ошибке Supabase. Ошибка backend должна показываться как ошибка.

### 27.4. Existing migration safety

- Не менять уже примененную base migration.
- Добавлять forward-only migrations.
- Локальный `supabase db reset` допустим только для disposable local DB.
- Не запускать `db reset --linked` на shared/corporate environment.
- После каждой migration: reset/test/types/diff check.

## 28. Риски и меры

| Риск | Последствие | Мера |
| --- | --- | --- |
| Неясное право использования исходных материалов | Блок внешней публикации/продажи | Самостоятельный бренд/UI/data; provenance review отдельно |
| Hybrid mode сохраняется слишком долго | Данные выглядят real, но локальны | Module-level adapter gate и E2E second-browser test |
| Enum roles трудно мигрировать | Authorization drift | Compatibility migration + capability tables |
| Revision model недооценен | Downstream orphan/history loss | T4 до operational wiring, immutable revision tests |
| NDE ambiguity (`NR`, percentages) | Неверные QC решения | Decision records со ссылкой на source section; configurable rule |
| RLS policy complexity | Leakage или медленные dashboards | Behavioral tests, indexes, explicit `TO authenticated`, query plans |
| Offline duplicate/conflict | Ложные движения spool | UUID idempotency, sync receipts, compensating events |
| Edge Function timeout | Stuck imports/reports | Small jobs, persisted lifecycle, retry; queue только при необходимости |
| Storage не входит в DB backup | Неполное восстановление | Отдельный Storage backup/runbook |
| Fake UI переживет migration | Ложная готовность | Visible-action audit в T12 |
| Параллельные изменения shared schema | Migration conflicts | T0–T4 sequential; context ownership после T4 |

## 29. Правила будущих сессий

Каждая implementation session:

1. читает этот master plan и соответствующий dossier section;
2. проверяет `pwd`, branch, HEAD, package manager и `git status --short`;
3. открывает отдельный execution plan указанного track;
4. выбирает один вертикальный slice с demonstrable exit criterion;
5. пишет failing test до implementation;
6. применяет migration и обновляет generated types;
7. проверяет wrong-project/wrong-role path;
8. запускает focused checks и общий baseline;
9. обновляет checkbox/status только по факту;
10. не commit/stage/push без прямого запроса.

Нельзя закрывать трек на основании:

- наличия UI;
- зеленого TypeScript;
- успешного toast;
- созданной таблицы без RLS behavior;
- unit helper без integration;
- старого roadmap status.

## 30. Рекомендуемый первый следующий заход

Следующая implementation session должна начать **T0**, а не очередной business screen.

Первый bounded slice:

1. исправить lint/test scripts;
2. добавить shared domain/application skeleton;
3. ввести SSR-compatible Supabase clients;
4. отключить demo watchers в Supabase mode;
5. добавить smoke test, доказывающий isolation;
6. создать T1 execution plan на capability model.

После этого T1 и T2 создадут безопасную основу для всех последующих operational migrations.

## 31. Официальные технические опоры

Архитектурные решения по framework/platform сверены с актуальной документацией:

- Supabase SSR: `https://supabase.com/docs/guides/auth/server-side`;
- Supabase Next.js clients: `https://supabase.com/nextjs`;
- Supabase RLS: `https://supabase.com/docs/guides/database/postgres/row-level-security`;
- Database Functions: `https://supabase.com/docs/guides/database/functions`;
- Edge Functions: `https://supabase.com/docs/guides/functions`;
- Supabase Storage: `https://supabase.com/docs/guides/storage`;
- Next.js 16 Proxy: `https://nextjs.org/docs/app/getting-started/proxy`.

Важные ограничения:

- `@supabase/ssr` рекомендован Supabase, но API помечен beta; dependency обновляется контролируемо.
- Next.js Proxy не используется как полная authorization system.
- RLS включается на каждой exposed table и тестируется поведением.
- Data-intensive atomic commands выполняются Database Functions; Edge Functions остаются короткими и idempotent.

## 32. Итоговая готовность плана

План готов к исполнению, когда:

- [x] документационный domain baseline зафиксирован;
- [x] checkout/framework/package manager подтверждены;
- [x] current code/data source split зафиксирован;
- [x] текущая DB и тесты проанализированы;
- [x] главные противоречия manual определены;
- [x] target architecture и context ownership определены;
- [x] target schema map определен;
- [x] track dependencies и release gates определены;
- [x] Definition of Done и test strategy определены;
- [ ] T0 execution plan создан в отдельной implementation session;
- [ ] реализация начата.
