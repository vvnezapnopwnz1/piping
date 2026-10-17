# N2: скорость вьюх готовности — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** экраны, читающие вьюхи готовности фазы 1, открываются быстрее 2 с на UPG-1 (94 катушки) на KZ-стенде и
не растут линейно с числом катушек так круто, как сейчас.

**Architecture:** сначала замер всех вьюх и проекций, которые читает приложение, затем оптимизация только тех,
что дольше 2 с, без изменения вердиктов и кодов причин. Правила остаются на сервере (CLAUDE.md, правила 1–5),
клиент не получает новых вычислений. Приложение читает вьюху с фильтром или одной проекцией, а не склейкой из
десятка таблиц с RLS на каждой.

**Tech Stack:** PostgreSQL 17, Supabase (RLS, `security_invoker`), pgTAP, TypeScript.

**Spec:** `docs/acceptance/2026-10-17-upg-rerun.md` §6–7 (находка N2).
Контекст: `docs/audits/2026-10-14-project-review-and-roadmap.md` §4.3 «Путь чтения».

## Global Constraints

- Перед работой с `supabase/` загрузить навык `supabase-postgres-best-practices` (CLAUDE.md).
- Вердикты, `blockers`, `available_operations` и коды причин не меняются: pgTAP 115–117, 104 и 071 остаются зелёными
  без правки ожиданий.
- Новая миграция вместо правки старой; формат `YYYYMMDDHHMMSS_name.sql`, позже `20261017124000`.
- Читающие функции `SECURITY DEFINER` не добавлять (CLAUDE.md, правило 2). Вьюхи — `security_invoker = true`.
- pgTAP только на изолированном стенде `.pgtap-stack`. На живой локальный стенд — `migration up`. Сброс
  стенда — только с подтверждения владельца. На KZ — через `pipeqc-release.sh` (сухой прогон, затем `--apply`).
- Лимит `statement_timeout` на KZ (30 с) не трогать: это временное прикрытие, цель — укладываться в 2 с.
- **Вьюхи фазы 5 зависят от вьюх готовности** (миграция `20261018090000_document_projections.sql`):
  `test_pack_document_rows` от `test_pack_readiness`, `nde_register_rows` от `weld_log_rows`. Вьюхи готовности
  менять только через `create or replace view` с теми же колонками, их типами и порядком. `drop view … cascade` не
  использовать: он молча удаляет зависимые вьюхи. Если пересоздание неизбежно, в той же миграции пересоздать
  `test_pack_document_rows` и остальные зависимые вьюхи из `20261018090000`. После миграции pgTAP `118_document_projections`
  остаётся зелёным.
- Номер pgTAP `118` занят фазой 5; тесты N2 нумеруются с `119`.
- `pipeqc-release.sh` повезёт на KZ и миграцию фазы 5: она добавляет только вьюхи, откат не нужен.
- Секреты не печатать.

## Review Focus

1. Проект с 0 катушек и проект с одной катушкой без ревизии: вьюха отвечает пустым набором, не ошибкой.
2. Пользователь с ограничением по субподрядчику или PDS-зоне: видит те же строки, что до оптимизации
   (тест `014_pds_area_scope_rls`).
3. Катушка без принятой ревизии и катушка с двумя ревизиями: в наборе ровно одна строка на катушку.
4. Тот же набор строк до и после оптимизации на SHOWCASE-1 и UPG-1: сверка построчно.

---

### Task 1: Замер

**Files:** Create `docs/acceptance/2026-10-17-read-path-timings.md`.

- [ ] **Step 1:** выписать из кода все чтения вьюх и проекций фазы 1: `grep -rn "spool_erection_readiness\|spool_fabrication_readiness\|test_pack_workflow\|fabrication_spool_projections\|isometric_readiness" modules lib app`.
  Для каждой указать экран и объём (весь проект или одна сущность).
- [ ] **Step 2:** для каждой вьюхи замерить на UPG-1 (`demo:project-load`, 8 недель) локально и на KZ: `explain (analyze, timing on)` от имени оператора
  (`set local role authenticated`, `request.jwt.claims` с `sub` оператора). Методика — как в разделе 7 отчёта.
- [ ] **Step 3:** таблица в файле замеров: вьюха | экран | строк | локально, мс | KZ, мс | основные затраты (какие
  таблицы и сколько раз вызывается `current_user_has_capability`).
- [ ] **Step 4:** коммит `docs: read-path timings for the readiness views`. Показать таблицу владельцу.

### Task 2: Оптимизация вьюхи `spool_erection_readiness`

**Files:** Create `supabase/migrations/<ts>_erection_readiness_speed.sql`; Test `supabase/tests/database/119_erection_readiness_same_rows.test.sql`; Modify `modules/construction/infrastructure/supabase-erection-repository.ts` только если Task 1 покажет, что экрану нужно чтение с фильтром.

**Interfaces:**
- Consumes: определение вьюхи из `20261017124000_server_readiness_canonical_projections.sql:81`, проекции `fabrication_spool_projections`.
- Produces: та же вьюха с тем же набором и порядком колонок (`database.types.ts` не меняется).

- [ ] **Step 1: pgTAP-тест `119`.** Строки вьюхи по UPG-1 (или фикстуре из теста `104`) совпадают построчно с `expected`,
  снятыми до миграции: `results_eq` по `(spool_revision_id, release_blockers, rft_blockers, verdict)`.
  Отдельные проверки на пункты Review Focus 1–3.
- [ ] **Step 2:** запустить на `.pgtap-stack`, тест зелёный на старой вьюхе (фиксирует поведение).
- [ ] **Step 3:** переписать определение так, чтобы RLS-проверки прав выполнялись один раз на проект, а не на каждую
  катушку для каждой таблицы. Допустимые приёмы: читать готовность из `fabrication_spool_projections`, где
  вердикты уже хранятся; соединять с таблицами через ключи, а не повторять фильтры прав; добавить индекс, если замер
  Task 1 показывает seq scan. Какой приём — выбирает исполнитель по замеру, итог записывает в комментарий миграции.
- [ ] **Step 4:** повторить замер на UPG-1 локально: цель до 400 мс на 94 катушки (было 1 350 мс).
- [ ] **Step 5:** `npm run typecheck && npm run lint && npm run test:unit`, pgTAP целиком на `.pgtap-stack`.
- [ ] **Step 6:** коммит `perf(db): spool_erection_readiness reads without per-row rights checks`.

### Task 3: Остальные вьюхи дольше 2 с

Для каждой вьюхи из таблицы Task 1 с временем выше 2 с на KZ повторить Task 2 (тест на те же строки, миграция,
замер). Если такой вьюхи нет, записать в файл замеров «остальные укладываются» и закрыть задачу.

### Task 4: Релиз на KZ и проверка

- [ ] **Step 1:** на сервере `pipeqc-release.sh` без флага: показывает новые миграции.
- [ ] **Step 2:** после подтверждения владельца `--apply`.
- [ ] **Step 3:** замер `spool_erection_readiness` оператором на KZ: цель ниже 2 с. Если цель достигнута, предложить
  владельцу вернуть таймаут `authenticated` к 8 с и проверить импорт спулинга отдельно (не входит в этот план).
- [ ] **Step 4:** открыть `https://app.piping-qc-work.shop`, проект UPG-1, экран монтажа: время открытия на глаз и
  скриншот. Строку в роадмап §5: «N2 закрыта».
