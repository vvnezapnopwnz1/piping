# N2: замеры вьюх, которые читает приложение

Дата 17.10.2026. Проект UPG-1 (94 катушки в R0, 96 ревизий катушек), локальный стенд (PostgreSQL 17.6).
Читает оператор `track01.platform-admin` (`set local role authenticated`, `request.jwt.claims` с его `sub`),
запрос `select count(*) from <вьюха> where project_id = <UPG-1>` в одной транзакции, одно измерение после прогрева.

| Вьюха | Экран (читатель) | Объём | Строк | Локально, мс | KZ, мс | Основные затраты |
|---|---|---|---|---|---|---|
| `test_pack_workflow` | испытания: список и карточка пакета (`supabase-pressure-test-repository.ts:134`) | проект | 6 | **5 504** | не снято | RLS по цепочке вьюх готовности пакета |
| `weld_log_rows` | журнал сварки (`supabase-report-repository.ts:109`) | проект | 578 | **2 320** | не снято | `current_user_has_capability` на каждой строке каждой таблицы |
| `nde_register_rows` | реестр НК (`supabase-report-repository.ts:117`) | проект | 492 | **1 935** | не снято | то же, зависит от `weld_log_rows` |
| `spool_fabrication_readiness` | нет прямого чтения; вердикты берёт `fabrication_spool_projections` | проект | 96 | 2 188 | не снято | подзапросы по сварке, опорам, НК и PWHT |
| `spool_erection_readiness` | монтаж: `loadErectionReadinessForProject` (`supabase-erection-repository.ts:101,115`) | проект | 96 | **1 387–1 606** | 11 500 (из отчёта) | на каждую катушку 6 `lateral`-блоков, в каждом RLS таблицы; `current_user_has_capability` и `spool_revision_project_id` на каждой строке |
| `test_pack_document_rows` | досье пакета (`supabase-report-repository.ts:125`) | один пакет | 6 | 1 323 | не снято | зависит от `test_pack_readiness` |
| `test_pack_readiness` | главная и испытания (`supabase-home-overview-repository.ts:67`, `supabase-pressure-test-repository.ts:122,163`) | проект | 6 | 82 | не снято | — |
| `isometric_readiness` | испытания (`supabase-pressure-test-repository.ts:278`) | проект | 40 | 28 | не снято | — |
| `fabrication_spool_projections` | основа вердиктов готовности | проект | 96 | 13 | не снято | таблица, вердикты уже посчитаны |

## Что видно

- Время уходит в RLS: план `spool_erection_readiness` показывает на каждой из 96 катушек вызовы
  `current_user_has_capability` и `current_user_in_pds_scope` в фильтрах каждой присоединённой таблицы
  (`weld_joint_revisions`, `nde_obligations`, `pwht_requirements`, `pwht_results` и так далее). Один вызов стоит
  доли миллисекунды, но их тысячи.
- `fabrication_spool_projections` читается за 13 мс: вердикты хранятся, пересчёт на чтении не нужен.
- Самая медленная вьюха не `spool_erection_readiness`, а `test_pack_workflow` (5,5 с локально). План Task 3 её покрывает.
- Цель плана 2 с на KZ. Локально выше 2 с: `test_pack_workflow`, `weld_log_rows`, `spool_fabrication_readiness`.
  Коэффициент KZ к локальному по `spool_erection_readiness` около 8, поэтому на KZ выше 2 с будут все вьюхи от 250 мс.

## Статус замера на KZ

Не снят: подключение агента к серверу KZ запрещено правилами сессии. Владелец снимает колонку «KZ, мс» тем же
скриптом (`explain (analyze)` от оператора на `app` базе) или разрешает агенту доступ только на чтение.

## После Task 2 (миграция `20261018100000_erection_readiness_speed.sql`, локально, UPG-1)

| Вьюха | До, мс | После, мс |
|---|---|---|
| `spool_erection_readiness` | 1 387 | **18** |
| `isometric_readiness` | 28 | 16 |
| `test_pack_readiness` | 82 | 53 |
| `test_pack_workflow` | 5 504 | 3 527 |

Строки `spool_erection_readiness` до и после сверены построчно по всем проектам стенда (UPG-1 и SHOWCASE-1, 112 строк): расхождений нет.

**Причина.** `spool_revision_project_id()` работает с правами вызывающего, поэтому на каждой строке `weld_joint_revisions`,
`spool_revision_materials` и других таблиц заново считается RLS таблицы `spool_revisions` (около 2 мс за вызов).
Вьюха теперь читает `fabrication_spool_projections` (одна проверка права на проект на строку); пять фактов, которые она считала
на лету, проекция хранит сама (`recompute_erection_spool_projection`).

**Остаются выше 250 мс локально (кандидаты Task 3):** `test_pack_workflow` 3,5 с, `weld_log_rows` 2,3 с,
`nde_register_rows` 2,0 с, `spool_fabrication_readiness` 2,3 с (приложение не читает), `test_pack_document_rows` 1,4 с (один пакет).
Все они читают таблицы через `spool_revision_project_id()` и аналоги. Общая правка помощников нужна только с решением
владельца: если они перестанут работать с правами вызывающего, срезы по PDS-зонам перестанут идти через `spool_revisions`.

## Поправка: замер `count(*)` занижал вьюхи с соединениями

`select count(*) from <вьюха>` позволяет планировщику отбросить соединения, колонки которых не нужны. Приложение читает
колонки (`is_rft`, `rft_on` и другие), поэтому честный замер берёт строку целиком:
`select count(md5(t::text)) from <вьюха> t where project_id = …` (скрипт в сессии, `time-full.sql`).
По нему `test_pack_readiness` и `isometric_readiness` были медленными (по 2,9 и 3,0 с), хотя `count(*)` показывал 82 и 28 мс.
Именно это видно на KZ: запрос `test_pack_readiness?select=test_pack_id,is_rft` оставался медленным после первой миграции.

Миграция `20261018101000_isometric_readiness_speed.sql`: `isometric_readiness` берёт пять фактов из `fabrication_spool_projections`
вместо `spool_fabrication_readiness`. Строки до и после совпадают (48 строк обоих проектов; тест `120`).

| Вьюха (строка целиком, UPG-1, локально) | До Task 2, мс | После Task 2, мс | После `…101000`, мс |
|---|---|---|---|
| `spool_erection_readiness` | 1 387 | 27 | 15 |
| `isometric_readiness` | 3 017 | 3 017 | **317** |
| `test_pack_readiness` | 2 867 | 2 867 | **433** |
| `test_pack_workflow` | 3 282 | 3 282 | **804** |
| `weld_log_rows` | 4 327 | 4 327 | 4 108 |
| `nde_register_rows` | 2 090 | 2 090 | 1 984 |
| `test_pack_document_rows` | 4 327 | 4 327 | 2 279 |
| `spool_fabrication_readiness` (приложение не читает) | 2 466 | 2 466 | 2 386 |

Остаток `isometric_readiness` (около 290 из 317 мс) — `flange_joint_readiness`: `flange_joint_revisions` читается через
`spool_revision_project_id()`, около 2 мс на катушку. Проекции для фланцев нет. `test_pack_workflow` считает `isometric_readiness`
дважды, поэтому его время почти равно двум таким чтениям.

**Общая правка помощников прав не сделана.** Сделать `spool_revision_project_id()` и `isometric_revision_project_id()`
`SECURITY DEFINER` ускоряет всё (в пробе `weld_joint_revisions` 1,8 с → 58 мс), но снимает ограничение по PDS-зоне, которое сейчас
доходит до таблиц сварки, опор и материалов через вложенный RLS `spool_revisions` и `isometric_revisions`. Нужны отдельные
RESTRICTIVE-политики на этих таблицах и тест на PDS-субподрядчика. Это отдельное решение.

## После миграции `20261018102000_spool_level_policies_set_read.sql` (локально, UPG-1, строка целиком)

Политики чтения `weld_joint_revisions`, `support_revisions`, `spool_revision_materials`, `weld_points`, `flange_joint_revisions`
вызывали помощник `spool_revision_project_id()` на каждой строке. Теперь они читают множество видимых катушек одним подзапросом
по вьюхе `spool_revision_projects` (`security_invoker`): те же права вызывающего, без `SECURITY DEFINER`, ограничение по зонам
не теряется. Тест `121` фиксирует видимые строки для админа, субподрядчика в PDS-зоне, читателя и постороннего: до и после одинаково.
Хеш всех строк девяти вьюх (админ, оба проекта стенда) до и после совпадает.

| Вьюха | Было, мс | Стало, мс |
|---|---|---|
| `spool_erection_readiness` | 1 387 | 16 |
| `isometric_readiness` | 3 017 | 138 |
| `test_pack_readiness` | 2 867 | 249 |
| `test_pack_workflow` | 3 282 | 357 |
| `test_pack_document_rows` | 4 327 | 456 |
| `nde_register_rows` | 2 090 | 697 |
| `spool_fabrication_readiness` | 2 466 | 733 |
| `weld_log_rows` | 4 327 | 3 095 |

`weld_log_rows` остаётся медленной: три агрегирующих подзапроса соединяются так, что при устаревшей статистике планировщик
перезапускает их для каждой из 578 строк. После `analyze` по базе вьюха читается за 0,98 с, то есть причина в оценках планировщика.
Это отчёт (журнал сварки), а не экран, который открывается при входе.

## KZ после релиза (17.10, REST, оператор UPG-1, три прогона, `npm run demo:read-timings:hosted`)

Миграции `20261018100000`…`20261018104000`. Помимо перечисленных выше:
- `…103000`: помощники `current_user_can_read_fabrication_spool`, `construction_spool_project_id`, `flange_revision_in_pds_scope`
  переписаны с SQL на plpgsql с теми же ответами (3,5 мс → 0,29 мс на вызов на KZ: тело SQL-функции планируется заново на каждый вызов).
  Тест `122` фиксирует ответы для админа, субподрядчика в PDS-зоне, читателя и постороннего.
- `…104000`: `test_pack_workflow` считает фланцы один раз на изометрик, а не по разу на участника пакета.

| Чтение | До, мс | После, медиана, мс |
|---|---|---|
| `spool_erection_readiness` | 11 500 | 151 |
| `isometric_readiness` | не снято | 423 |
| `test_pack_readiness` (`test_pack_id,is_rft`) | не снято (медленный) | 490 |
| `test_pack_workflow` | 3 059 | 893 |
| `test_pack_document_rows` | 1 179 | 959 |
| `nde_register_rows` | 1 834 | 1 934 |
| `weld_log_rows` | 4 424 | 1 926 |

Остаток: `nde_register_rows` и `weld_log_rows` около 1,9 с, то есть вплотную к 2 с. Планы этих вьюх зависят от статистики:
после массового импорта нужен `analyze` (миграции его делают). Следующий шаг при росте данных — те же агрегаты по проекции.
