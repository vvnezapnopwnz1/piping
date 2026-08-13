# Аудит схемы БД PipeQC — 2026-08-13

Источник данных: живая схема локального стенда (`supabase_db_pipe-qc-shell-layout`),
сверено с 93 миграциями в `supabase/migrations/`.
Методика: `supabase/agent-skills@supabase-postgres-best-practices` + `wshobson/agents@postgresql-table-design`.

## Масштаб

| Объект | Кол-во |
|---|---|
| Таблицы | 102 |
| Views | 30 (все `security_invoker = true`) |
| Функции | 136 (297 261 символов ≈ 7 400 строк PL/pgSQL) |
| из них `SECURITY DEFINER` | 105 |
| Foreign keys | 275 |
| RLS-политики | 186 |
| Пользовательские триггеры | 132 |
| Миграции | 93, из них 24 (26%) — `fix / remediation / cleanup / compat` |

---

## Вердикт

**Схема не страдает классическими «галлюцинациями абстракций».** Я проверил каждый
пункт из списка типовых AI-антипаттернов — почти все опровергнуты фактами. Реальная
избыточность лежит не в таблицах, а в процедурном слое.

### Проверено и опровергнуто

| Гипотеза | Факт |
|---|---|
| Лишние справочники вместо ENUM | Справочники **редактируются пользователем per-project** → ENUM неприменим. При этом 20 ENUM-типов уже созданы там, где наборы действительно фиксированы. |
| Избыточные junction-таблицы N:M | Все 25 таблиц с ровно 2 FK — законные N:M (`role_capabilities`, `membership_*_scopes`, `nde_batch_items`) либо содержательные сущности. |
| Over-normalization 1:1 | **0 пар.** Ни одного FK с UNIQUE-ограничением. |
| Полиморфизм / Generic Relations | Не найдено. |
| Лишние soft deletes | **0 колонок** `deleted_at`/`is_deleted`/`archived_at`. Убирать нечего. |
| Плохие типы | 0 `varchar(n)`, 0 `timestamp` без tz, 0 `serial`, 0 `money`. Везде `timestamptz` + `numeric` + `text` + CHECK. |
| Дырявый RLS | RLS включён на 99 из 102 таблиц. 3 без RLS — глобальные каталоги `roles`/`capabilities`/`role_capabilities`, это корректно. |
| Views в обход RLS | Все 30 views имеют `security_invoker = true`. |

102 таблицы для полного домена (engineering → prefab → сварка → NDE → PWHT →
монтаж → фланцы → опрессовка → punch-list) — **пропорционально предметной области**,
а не раздуто. Сокращать количество таблиц ради количества не нужно.

### Где действительно избыточность

**136 функций на 7 400 строк PL/pgSQL, из них 105 `SECURITY DEFINER`.**
Это в разы более тяжёлый актив, чем 102 таблицы: каждая `SECURITY DEFINER`-функция
обходит RLS и должна проверять права самостоятельно. Аудировать 105 таких функций
дороже, чем 102 таблицы. Плюс 96 RLS-политик и 92 триггера, сгенерированных
`do $$ ... $$`-циклами по спискам таблиц.

---

## 1. Критичные проблемы

### C1 — 164 из 275 FK (60%) без индекса, при 210 FK с `ON DELETE RESTRICT`

Распределение правил: `RESTRICT` 210 / `SET NULL` 45 / `CASCADE` 20.

`RESTRICT` без индекса на дочерней колонке означает: **каждое удаление или обновление
родительской строки делает seq scan по каждой дочерней таблице и держит на ней
блокировку.** Дополнительно RLS-политики фильтруют по `project_id`, который не
проиндексирован в 21 таблице, а `profiles`-ссылки — в 32.

Худшие таблицы:

| Таблица | FK без индекса |
|---|---|
| `spool_location_events` | 7 |
| `weld_progress_records` | 7 |
| `flange_progress_records` | 6 |
| `nde_results` | 6 |
| `paint_progress_records` | 6 |
| `test_packs` | 6 |

На текущих данных (1–13 строк) это невидимо. На реальном проекте — сотни тысяч
стыков — это отказ.

**Фикс:** `docs/audits/db-audit-2026-08-13-fix-01-fk-indexes.sql` — 164 готовых
`create index concurrently`, сгенерированы из живой схемы.

### C2 — Пересекающиеся PERMISSIVE-политики обходят scope-ограничение

На `project_pds_areas` действуют одновременно:

```
project_pds_areas capability read   PERMISSIVE SELECT
  → current_user_has_capability(project_id,'project_referential.view')
    AND current_user_in_pds_scope(project_id, id)      ← ограничение по зоне

tracking users read PDS areas       PERMISSIVE SELECT
  → current_user_has_capability(project_id,'tracking.view')   ← БЕЗ проверки зоны
```

PERMISSIVE-политики объединяются по **OR**. Любой пользователь с `tracking.view`
читает **все** PDS-зоны проекта, полностью игнорируя `current_user_in_pds_scope`.
Функция, написанная ради разграничения по зонам, не работает.

Тот же паттерн (вторая PERMISSIVE-политика поверх capability-политики) на
`project_devices`, `project_locations`, `project_location_categories`,
`project_joint_categories`, `project_device_users` — там базовая политика без
scope-проверки, поэтому это расширение доступа, вероятно намеренное, но
незадокументированное.

**Фикс:** scope-проверку вынести в **RESTRICTIVE**-политику — она применяется по AND
поверх всех PERMISSIVE:

```sql
drop policy "project_pds_areas capability read" on public.project_pds_areas;

create policy "project_pds_areas capability read"
  on public.project_pds_areas for select to authenticated
  using (current_user_has_capability(project_id, 'project_referential.view'));

-- AND поверх любой permissive-политики, включая tracking
create policy "project_pds_areas scope guard"
  as restrictive
  on public.project_pds_areas for select to authenticated
  using (current_user_in_pds_scope(project_id, id));
```

### C3 — ~~`command_receipts`: RLS включён, политик 0, но выдан `grant select`~~ СНЯТО

Находка оказалась ошибочной: гранта `SELECT` для `authenticated` у таблицы нет,
только дефолтные `REFERENCES`/`TRIGGER`. Таблица закрыта намеренно.
Разбор — в разделе «T2 выполнен».

---

## 2. Что убрать: оверинжиниринг

### O1 — EAV-подсистема кастомных полей: реализована, но не наполнена

`project_custom_field_definitions` (**0 строк**, 10 колонок, собственные политики,
триггеры и уникальный индекс) + `project_pds_areas.custom_values jsonb`.

**Поправка к первой редакции отчёта:** это не мёртвый код. Подсистема имеет
работающую обвязку:

- `modules/project-setup/infrastructure/supabase-project-geography-repository.ts`
- `modules/project-setup/ui/project-geography-tabs.tsx`
- `lib/supabase/database.types.ts`
- тесты `020_project_referentials.test.sql`, `021_referential_usage_guards.test.sql`

Пусто только хранилище — ни один проект не завёл ни одного кастомного поля.

Поэтому это **не техническая уборка, а продуктовое решение**: удаление означает снос
UI-вкладки, репозитория и двух тестов. Не трогать, пока владелец продукта не
подтвердит, что фича не нужна. Если подтвердит — удалять целиком по всем четырём
слоям, а не только таблицу.

### O2 — 8 структурно идентичных справочников

Восемь таблиц имеют **побайтово одинаковый набор колонок**
(`id, project_id, code, description, status, created_at, updated_at`):

`project_devices`, `project_line_services`, `project_location_categories`,
`project_punch_codes`, `project_rework_codes`, `project_spooling_material_types`,
`project_systems`, `project_units`.

Все 31 `project_*`-справочника вместе содержат ~100 строк, но стоят
**96 RLS-политик + 92 триггера** плюс отдельные RPC и экраны на каждый.

**ENUM здесь неприменим** — это пользовательские справочники, свои в каждом проекте.
Правильный путь — консолидация по образцу уже существующего в проекте
`system_reference_entries (kind, code, description, attributes jsonb)`. Проект уже
владеет этим паттерном и применяет его непоследовательно.

**Честный трейд-офф:** 7 из 8 таблиц имеют входящие FK, и при слиянии типизация
ссылки теряется. Восстанавливается композитным FK:

```sql
create table public.project_reference_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete restrict,
  kind        public.project_reference_kind not null,   -- новый enum-дискриминатор
  code        text not null check (length(trim(code)) > 0),
  description text not null check (length(trim(description)) > 0),
  status      public.project_reference_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, kind, code),
  unique (id, kind)          -- цель для композитного FK, сохраняет типизацию ссылки
);

-- потребитель фиксирует допустимый kind генерируемой колонкой:
alter table public.punch_items
  add column punch_code_kind public.project_reference_kind
    generated always as ('punch_code'::public.project_reference_kind) stored,
  add foreign key (punch_code_id, punch_code_kind)
    references public.project_reference_entries (id, kind) on delete restrict;
```

**Рекомендация — сливать выборочно.** Чем больше входящих FK, тем дороже слияние:

| Сливать (≤1 входящий FK) | Оставить как есть |
|---|---|
| `project_punch_codes` (1) | `project_subcontractors` (9 входящих FK) |
| `project_location_categories` (1) | `project_memberships` (5) |
| `project_units` (1) | `project_line_services` (4), `project_service_classes` (4) |
| `project_spooling_material_types` (1) | `project_teams` (3) |

Выигрыш от слияния четырёх: −4 таблицы, ≈−12 политик, ≈−12 триггеров.
Умеренный. **Это не самая ценная работа в списке** — C1 и C2 важнее.

### O3 — Генерация политик через `do $$` с захардкоженными списками имён

`20260801091000_referential_invariants.sql` дропает старые политики по списку из
12 угаданных исторических имён, прежде чем создать новые. Это источник C2-класса
ошибок: имя, забытое в списке, оставляет живую PERMISSIVE-политику, которая молча
расширяет доступ. Ровно это и произошло с `_members_read` — потребовалась отдельная
миграция `20260801095000_security_and_policy_cleanup.sql`.

Замена: не гадать имена, а снимать все политики таблицы декларативно —

```sql
do $$
declare p record;
begin
  for p in select polname, polrelid::regclass as t from pg_policy
           where polrelid = 'public.project_pds_areas'::regclass
  loop
    execute format('drop policy %I on %s', p.polname, p.t);
  end loop;
end $$;
```

---

## 3. Риски миграций

| Риск | Оценка |
|---|---|
| Идемпотентность | В целом хорошая: `if not exists` / `if exists` используются последовательно. |
| Блокировки | 164 индекса из фикса C1 **нельзя** применять через Supabase CLI: он оборачивает миграцию в транзакцию, а `create index concurrently` в транзакции запрещён. Применять `psql -f` напрямую, либо убрать `concurrently`, пока таблицы малы — сейчас это дешевле всего. |
| Churn | 24 из 93 миграций (26%) — исправления предыдущих. Признак того, что схема писалась без прогонов на реальных объёмах. |
| `NOT NULL` без DEFAULT | Критичных случаев на больших таблицах не найдено. |
| `ON DELETE` | 210 `RESTRICT` — консервативно и осознанно для аудируемого домена. Менять не надо, но см. C1: без индексов это дорого. |

---

## T3 сведён к минимуму — намеренно

Исходный план (переписать генерацию политик) невыполним: миграции уже применены,
историю не переписывают. Рассматривались два замещения — тест-инвариант «нет
PERMISSIVE-расширения поверх scope-проверки» и конвенция в `CLAUDE.md`.

**Инвариант делать не стали.** Прогон показал, что он бы срабатывал ещё на трёх
таблицах, где это не дефект (см. ниже), то есть давал бы три ложных срабатывания на
каждом прогоне и требовал бы списка исключений. Постоянно шумящий тест — ровно тот
инструмент, который потом тормозит работу.

Регрессия C2 и так закрыта **поведенческим** тестом
`014_pds_area_scope_rls.test.sql`: он проверяет фактически видимые строки, а не форму
политики, и это строже структурной проверки. Отдельный структурный тест был бы
дублированием.

**Сделана только запись в `CLAUDE.md`** — раздел «RLS: a narrowing check must be
RESTRICTIVE», 8 строк, нулевая стоимость сопровождения.

### Открытый продуктовый вопрос (не дефект)

`construction_progress_events`, `isometric_revisions`, `spool_revisions` имеют по две
PERMISSIVE-политики на чтение, и scope-проверка есть только в одной. Но, в отличие от
`project_pds_areas`, scope там **и не был** ограничителем:

```
spooling.view  OR  (flange.view AND current_user_in_pds_scope(...))
```

У роли `subcontractor` есть `spooling.view`, поэтому первая ветка и так открывает все
строки — независимо от tracking-политики. Проверка по зонам на этих таблицах
декоративна с самого начала.

Навесить сюда `RESTRICTIVE` означало бы **сузить** текущий доступ пользователям
spooling и tracking, то есть изменить продуктовое поведение и рискнуть экранами
фланцев и трекинга. Это решение владельца продукта, а не техническая уборка,
поэтому оставлено как есть.

Вопрос к продукту: должна ли зона PDS ограничивать чтение изометрических ревизий,
ревизий катушек и событий прогресса — или широкий доступ там осознан?

## Развёрнуто на хостед-стенде

Обе миграции применены на `lmjkqcdmxehknipeoeye` через `supabase db push`
(без `reset` — данные стенда сохранены).

- До пуша: удалённая база синхронизирована по `20260816090000`, дрейфа нет.
- Объёмы стенда проверены перед пушем: максимум 5 строк в таблице, поэтому
  `create index` без `concurrently` безопасен.
- После пуша: `20260817090000` и `20260817091000` числятся применёнными.
- `npm run demo:check:hosted` → **79 PASS / 5 FAIL**, что совпадает с ожидаемым
  baseline стенда (эти 5 — курируемые приёмочные данные, а не поломка). Регрессии нет.

Локально `supabase db reset` прогнан с нуля: все 95 миграций накатываются на пустую
базу, `test:db` зелёный. Остаточный риск из раздела T1 снят.

## T2 выполнен: scope-гвард починен, C3 снят

### C2 — подтверждён, воспроизведён, исправлен

Дыра оказалась **достижимой**, а не теоретической:

- `current_user_in_pds_scope()` ограничивает строки только для `access_role_code = 'subcontractor'`;
- у роли `subcontractor` **есть** `tracking.view` — через функциональную роль
  `tracking_operator`, поскольку `bypasses_functional_gate = false`;
- значит субподрядчик, ограниченный зоной A, читал и зону B.

Сначала написан падающий тест `supabase/tests/database/014_pds_area_scope_rls.test.sql`,
который зафиксировал дыру до правки:

```
# Failed test 4: "scoped subcontractor reads only the PDS area it is scoped to"
#     Extra records:
#         (AREA-B)
```

Пункты 1–3 при этом проходили: право `tracking.view` есть, зона A в скоупе, зона B — нет.
То есть проверка работала, а RLS её игнорировал.

Фикс — `supabase/migrations/20260817091000_pds_area_scope_restrictive_guard.sql`:

```sql
create policy "project_pds_areas scope guard"
  on public.project_pds_areas
  as restrictive          -- AND поверх всех PERMISSIVE, а не OR вместе с ними
  for select to authenticated
  using (public.current_user_in_pds_scope(project_id, id));
```

Только на SELECT: `project_referential.manage` выдана лишь `project_admin` и
`site_admin`, поэтому пути insert/update для субподрядчика недостижимы.

Проверено также, что `project_pds_areas` — **единственная** scope-таблица с лишней
четвёртой политикой: у `project_subcontractors`, `project_welding_procedures` и
`welder_qualifications` по три политики, обхода нет.

### C3 — находка снята как ошибочная

В первой редакции отчёта утверждалось, что `command_receipts` имеет RLS без политик
**и при этом** `grant select to authenticated`. Проверка привилегий в живой БД это
не подтвердила:

```
command_receipts:  anon/authenticated -> REFERENCES, TRIGGER   (дефолты Supabase)
audit_events:      authenticated      -> SELECT                (для сравнения)
```

Гранта `SELECT` у клиента нет. Таблица закрыта намеренно и последовательно: пишется
только через `SECURITY DEFINER`-функции, которые работают от владельца. RLS без политик —
это второй слой защиты, а не забытая политика.

Проверен весь класс проблемы: таблиц с включённым RLS, нулём политик и DML-грантом
клиенту — **ноль**. Единственные три таблицы без RLS с грантом `SELECT`
(`roles`, `capabilities`, `role_capabilities`) — глобальные каталоги модели прав,
проектных данных не содержат.

**Итог T2:** `lint=0, typecheck=0, test:unit=0, test:db=0`, 52 файла, 894 теста.

## T1 выполнен: FK покрыты индексами

Миграция `supabase/migrations/20260817090000_fk_supporting_indexes.sql` — 164
индекса, сгенерированы из живой схемы.

| Замер | До | После |
|---|---|---|
| FK всего | 275 | 275 |
| FK без ведущего индекса | **164 (60%)** | **0** |
| Индексов в `public` | 227 | 391 |

`npm run verify` по стадиям: `lint=0, typecheck=0, test:unit=0, test:db=0`
(51 файл, 890 тестов).

Решения по реализации:

- **Без `concurrently`.** Supabase CLI выполняет миграцию в транзакции, где
  `create index concurrently` запрещён. Таблицы сейчас малы (0–13 строк), блокировка
  ничтожна. Если эту миграцию придётся накатывать на нагруженную базу — разбить и
  применять `psql -f` с `concurrently`.
- **`if not exists`** — миграция идемпотентна.
- Проверено: дубликатов имён нет, максимальная длина имени 60 символов (лимит 63,
  молчаливого обрезания не будет).

Остаточный риск: применение проверено накатом на существующую БД
(`supabase migration up`), но **не** прогоном `supabase db reset` с нуля — сброс
уничтожил бы локальные фикстуры. Учитывая `if not exists` и то, что миграция идёт
последней, риск минимален.

## T0 выполнен: сетка зелёная

**Итог:** `npm run test:db` — 51 файл, **890 тестов, PASS**. Было: 733 теста, 9 файлов
красных.

### Корневая причина (одна на все 9 файлов)

Тесты предполагали, что база **пустая**, а локальная БД несёт данные, засеянные
скриптами `scripts/bootstrap-track0*-browser-fixtures.ts`. `system_reference_entries` —
таблица **глобальная**, не привязанная к проекту, поэтому её содержимое не убирается
между прогонами и переживает любые чистки на уровне проекта.

Механизм отказа:

```sql
insert into public.system_reference_entries (id, kind, code, description)
values ('53000000-…-511', 'material_type', 'CS', 'Carbon steel')
on conflict do nothing;          -- ← unique (kind, code) уже занят фикстурой
```

Доказательство (транзакция с откатом, ничего не менялось):

```
INSERT 0 0                        ← ноль строк, молча
row_with_test_uuid_after_insert = 0
kind_seen_by_guard = <НЕТ СТРОКИ>
```

`on conflict do nothing` **проглатывает** коллизию по `unique (kind, code)`. Строка с
ожидаемым UUID не создаётся, а падает всё пятью строками ниже — в
`assert_system_reference_kind()` с сообщением «material_type_id must reference a
material_type system referential», которое уводит от настоящей причины.

### Почему падали не все

В кодовой базе **уже была правильная конвенция** — уникальный код на каждый тест:
`CS2` (052), `CS-PWHT` (063), `CS-07` (071), `MAT-101`…`MAT-105`, `TORQUE-090`…`TORQUE-105`.
Все эти файлы зелёные. Красными были ровно шесть файлов с голым кодом `CS`, которые
до конвенции не дожили: 042, 051, 060, 061, 062, 064.

### Что исправлено

| Файл | Правка |
|---|---|
| 042, 051, 060, 061, 062, 064 | код материала → уникальный на файл (`CS-042` … `CS-064`) |
| 020 | тест перестал брать **произвольный** проект из БД (`select id from projects limit 1`) и создаёт свой |

Правки только в `supabase/tests/database/*.sql`. **Схема и продакшн-код не тронуты** —
падения были дефектом изоляции тестов, а не логики.

### Побочная находка: связь справочников по строковому коду

Разбор выявил в `record_weld_progress()` (продакшн-функция) вот такое соединение:

```sql
join public.system_reference_entries entry on entry.code = mtype.code
```

Глобальный справочник соединяется с проектным `project_spooling_material_types`
**по равенству строк кода**, а не по внешнему ключу. Следствия:

- переименование кода в одном из двух справочников молча ломает квалификацию WPS;
- на это нет ни одного индекса (`entry.code` не проиндексирован отдельно от `unique (kind, code)`);
- проверка не может быть выражена ограничением БД и держится на процедурном коде.

Это тот же класс хрупкости, что и в O2: **инварианты держатся на коде, а не на связях.**
Аргумент против расширения generic-подхода на новые справочники.

## Состояние страховочной сетки до T0 (замер 2026-08-13)

`npm run test:db` — **51 файл, 733 ассерта, Result: FAIL**. Красный до любых
правок, на чистом committed-состоянии (`git status supabase/` пуст).

| Файл | Статус |
|---|---|
| `020_project_referentials` | 1 из 24 упал |
| `042_spooling_apply` | обрыв на старте (0 из 40) |
| `050_material_traceability` | обрыв (51 из 86, 2 падения) |
| `051_weld_progress` | обрыв (0 из 36) |
| `060_nde_batch_invariants` | обрыв (0 из 12) |
| `061_nde_repair_tracer_truth_table` | обрыв (0 из 12) |
| `062_nde_penalty` | обрыв (0 из 9) |
| `064_track06_corrections` | обрыв (0 из 13) |
| `092_flange_progress_commands` | 2 из 18 упали |

Общая причина обрывов:

```
ERROR: material_type_id must reference a material_type system referential
CONTEXT: PL/pgSQL function assert_system_reference_kind() line 7
```

Типизация ссылок в `system_reference_entries` держится не на FK, а на
**триггере-гварде**, и он срабатывает на данных, которые сеет тест. Это же
подтверждает риск консолидации из O2: чем больше справочников уезжает в generic-таблицу
с дискриминатором `kind`, тем больше инвариантов держится на триггерах вместо FK
и тем хрупче тесты.

**Пока сетка красная, рефакторинг схемы вести нельзя** — невозможно отличить
собственную поломку от унаследованной.

## Порядок работ

Треки сгруппированы **по обратимости и риску для логики, а не по объёму**.

| Трек | Содержание | Строк | Риск для логики | Откат |
|---|---|---|---|---|
| ~~**T0**~~ ✅ | Починить 9 красных тестовых файлов | +22/−13 | — | — |
| ~~**T1**~~ ✅ | C1: 164 индекса на FK | 164 | **нулевой** | `drop index` |
| ~~**T2**~~ ✅ | C2: RESTRICTIVE-политика (C3 снят) | ~10 + тест | **высокий** | `drop policy` |
| ~~**T3**~~ ✅ | O3: сведён к записи в `CLAUDE.md` (8 строк) | 8 | нулевой | — |
| **T4** | O2: слияние 4 справочников | ~300 + код | **высокий** | тяжёлый |
| **T5** | O1: судьба EAV кастомных полей | — | продуктовое решение | — |

**T0 первым и обязательно.** Красная сетка = невозможно доказать, что рефакторинг
ничего не сломал.

**T1 не требует разбиения.** 164 строки — это объём, а не риск: индекс не меняет
результат запроса, только план выполнения. Один коммит, прогон `verify`, готово.

**T2 — самый маленький и самый опасный.** Меняет видимость строк. Делать
тест-первым: сперва падающий pgTAP-тест, доказывающий, что пользователь с
`tracking.view` видит чужие PDS-зоны, затем `RESTRICTIVE`-политика, затем тот же
тест зелёный. Сейчас `tracking.view` не встречается **ни в одном** из 733 ассертов —
именно поэтому дыра и дожила до аудита.

**T4 — единственный трек, который стоит дробить** (по одному справочнику на шаг) и
единственный, который допустимо не делать вовсе.
