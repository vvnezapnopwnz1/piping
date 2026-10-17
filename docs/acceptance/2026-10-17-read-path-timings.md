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
