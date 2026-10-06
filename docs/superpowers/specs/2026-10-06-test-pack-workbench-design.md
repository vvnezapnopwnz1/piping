# Test Packs — единый пакет, состав, readiness и испытания

Дата: 2026-10-06. Статус: проектное решение для передаваемого agy плана; приложение не изменено, реализация и браузерная приёмка не выполнены.

## Основание

Пользователь поручил составить план следующей работы после Erection для другого агента. Граница следующего прохода — Test Packs. Текущие исходники проверены непосредственно; старые roadmap и deferred-файлы не являются доказательством открытой задачи.

Подтверждено чтением кода:

- Explorer имеет семь локальных вкладок, выводит UUID некоторых справочников, использует `spools[0]` как выбранный спул. Его ссылки на Builder и Pressure Test не передают пакет.
- Builder имеет формы, состав, Move/Remove/Archive, project-scoped справочники и `submitting`. Это готовые возможности, а не задачи повторной реализации. Выбор пакета остаётся локальным, route не читает `testPackId`.
- Preparation читает query при инициализации, но сохраняет старый непустой `selectedPack` при последующих изменениях query. Progress фильтрует worklists по пакету, но его загрузки не защищены от поздних ответов.
- Line Check draft индексируется только `request_id`, хотя одна заявка содержит несколько ISO. Независимый ввод должен принадлежать паре request/ISO.
- `test_pack_catalog.pressure_unit` существует (`bar | psi`), но `TestPackCatalogRow` и `toCatalog` теряют поле. Builder сейчас жёстко подписывает bar.
- После создания Builder последовательно вызывает compose для ISO. Это отдельные транзакции; сообщение об атомарном создании неверно.
- `testing_precomm_worklist` содержит даты трёх событий, но не готовые флаги eligibility Y/Z. Нельзя выдавать эту проекцию за полный workflow snapshot.
- `listFlangeJointReadiness` сейчас игнорирует projectId; сама view не имеет `project_id`. Для target reads нужна server-side фильтрация по ISO, полученным из scoped active members пакета, а не загрузка общего списка и только последующий client filter.
- Общий `UnsavedInputGuard` охватывает main, но WorkContextProvider расположен снаружи. Программный Clear контекстного chip не проходит через `useRequestLeave`.

## Рассмотренные варианты

1. **Связанный workbench вокруг одного пакета — выбран.** Сначала исправляется URL/ownership; затем объединяются существующие поверхности и команды. Сохраняются aliases и права.
2. Исправить только ссылки и подписи. Малый объём, но состав, readiness и операции продолжают требовать отдельных поверхностей выбора.
3. Переписать весь pressure-test модуль и БД. Не требуется для задачи; увеличивает область регрессий и смешивает UI с новой доменной реализацией.

## Рабочая модель

Dashboard `/testpack` остаётся обзором. `/testpack/explorer` становится основным полноширинным списком пакетов с overlay выбранного пакета: desktop 70vw, Expand 100vw, mobile fullscreen. Подложка не сжимается.

В выбранном пакете четыре области, адресуемые параметром `view`:

- **Definition** — фактические metadata и редактирование по действующему праву;
- **Composition** — текущие ISO, добавление, перенос, удаление;
- **Readiness** — серверный verdict, причины, ISO/spool detail и доступные переходы;
- **Test workflow** — Line Check / Item Clearance как подготовительные работы, далее RFT → Blinding → Testing → Y reinstatement → Pre-commissioning → Z reinstatement.

Четыре области не являются четырьмя производственными стадиями. RFT вычисляется; записи «сделать RFT» нет. Workflow отражает факты и применимость Y/Z, а команды по-прежнему проверяются сервером. Нельзя вводить обязательный мастер Next/Back.

Builder остаётся прямым входом и единственным create-сценарием. При выбранном пакете он использует те же Definition/Composition editors, что workbench. Preparation, Progress и Print сохраняются как совместимые standalone-входы; внутри workbench используются те же операционные компоненты в embedded-режиме.

## URL и идентичность

`p` — код проекта, `testPackId` — ID пакета. `view` задаёт одну из четырёх областей. `operation` задаёт конкретную работу, `mode` — preparation/progress. `spool` означает spool revision ID и допустим только после проверки принадлежности пакету. `from` — проверенный внутренний return path.

URL является authority выбранного объекта. Без ID список не выбирает первый пакет. Неверный/чужой ID даёт unavailable, а ошибка чтения — error + Retry. Выбранный пакет загружается непосредственно по project/id, независимо от ограниченного списка каталога. При смене проекта старые факты и черновики исчезают; поздние ответы старой загрузки игнорируются.

## Данные и команды

Существующие repositories/application/RPC переиспользуются. Разрешены дополнительные read-only selectors существующих таблиц/views: scoped lookup пакета, pressure unit и effective reinstatement facts. SQL, grants, RLS, RPC, доменные формулы не меняются.

Единый command lock действует в пределах выбранного пакета. Он не допускает одновременные metadata/composition/assignment/result-команды. Ошибка команды сохраняет draft. Подтверждённая запись и ошибка последующего refresh имеют разные сообщения; повторная запись автоматически не производится.

Line Check draft key — request/ISO; Reinstatement — request/flange. Report number и Tag number вводятся явно, без demo fallback. Если пакет создан, но часть ISO не добавлена, созданный ID сохраняется и UI показывает подтверждённый состав и оставшиеся ISO. Create intent остаётся владельцем общего lock до окончания попытки compose; переход URL на created ID происходит после завершения попытки, в том числе частично успешной, а не посреди команды с размонтированием её владельца.

## Общие компоненты и сохранность ввода

Нейтральный RecordDrawer выделяется из геометрии SpoolDrawer; SpoolDrawer остаётся совместимым wrapper с прежними атрибутами и подписями. SpoolTimeline и доменная логика construction не переносятся в Test Packs.

Локальный выбор пакета, области, операции, target и закрытие drawer проходят через `useRequestLeave`. Команды используют explicit commit marker и `useMarkInputsRecorded` только после подтверждения соответствующей записи. Выбор ISO/targets и React-state drafts регистрируют dirty state в существующем guard через небольшой дополнительный hook; это защищает и inputs в portal-диалогах. Dirty Browser Back/Forward не объявляется решённым новым history blocker: проверяется чистая история, локальные переходы и beforeunload. Для Clear контекстного chip guard поднимается выше WorkContextProvider, а clear использует тот же hook.

## Границы и приёмка

Вне прохода: NDE redesign, Tracking/Flanges workbench, новый handover/history, offline, общая серверная пагинация, полная production readiness. Новые dashboard-формулы и источники audit history не вводятся.

Техническая проверка: typecheck, lint изменённых файлов, unit suite, production build. Браузерная проверка: реальные read-only данные для layout/URL/Reader; mock network для команд, отказов и refresh errors, без передачи mutations в БД. Нет DB reset, reseed, fixture bootstrap, Git и публикации.

Полный список задач, контрактов и проверок: `../plans/2026-10-06-test-pack-workbench.md`.
