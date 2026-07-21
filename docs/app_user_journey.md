# PipeQC — путь пользователя по приложению

> **Цель документа.** Последовательно, фаза за фазой, показать: **кто** (роль) **на какой странице** **что делает**, **что при этом видит** (компоненты / данные / диалоги) и **зачем** — со ссылками на разделы [`pipeline_construction_guide.md`](pipeline_construction_guide.md), где объяснён бизнес-контекст. Документ — заготовка под слайды презентации: каждая строка ≈ один скриншот + подпись.
>
> **Логика чтения.** Фазы идут в том же порядке, что и в гайде:
> Setup (Часть 3) → Spooling (Часть 4) → Fabrication (Часть 5) → Erection (Часть 6) → Test Pack (там же, конец Части 6). Внутри фазы — экраны слева направо по sidebar-меню приложения.
>
> **Связь с гайдом.** Каждая фаза начинается с напоминания «зачем это вообще нужно» и ссылки на соответствующую часть `pipeline_construction_guide.md`. Внутри экранов — точечные отсылки к терминам и схемам из гайда.

---

## Условные обозначения

- **Маршрут** — путь в Next.js (`app/<route>/page.tsx`).
- **Контейнер** — что именно открывает пользователь: страница, sheet (выезжающая боковая панель), dialog (модальное окно), tab.
- **Видит** — ключевые элементы UI и данные на экране.
- **Делает** — действие (клик, ввод, drag).
- **Зачем** — какую боль из реальной стройки это закрывает, со ссылкой на гайд.

### Роли (consolidated из `docs/role_matrix/`)

| Роль | Кто это в жизни | Где живёт в приложении |
|---|---|---|
| **System Admin** | Project Admin + Site Admin + System Admin (объединены в PipeQC) | `app/admin/*` — вся фаза setup |
| **Spooling Team** | Lead drafter / engineer-spooler в офисе EPC | `app/spooling/*` |
| **QC Engineer** | QA/QC отдел EPC (внутренний контролёр) | сквозной — `fabrication/qc-release`, `erection/field-qc-release`, NDE, Testpack |
| **NDE Inspector** | Subcontractor — лаборатория неразрушающего контроля | `app/nde/*` |
| **Fabrication Subcontractor** | Бригадир / мастер в цеху | `app/fabrication/*` (welder progress + paint + laydown) |
| **Erection Subcontractor** | Бригадир / монтажник на стройплощадке | `app/erection/*` |
| **Test Pack Coordinator** | Coordinator со стороны EPC, ведёт гидроиспытания | `app/testpack/*` |
| **Test Pack Teams** | Blinding / Line Check / Reinstatement (отдельные бригады) | `testpack/pressure-test/<sub-stage>` |
| **Project Manager** | PM проекта со стороны EPC | сквозной — `dashboard`-страницы каждого модуля + `app/reports` |
| **Owner Inspector** | Инспектор заказчика | read-only во всех модулях, активный на client-examination в Testpack |

> Кто и где «прописан» в коде ролей и scope-lock — см. `app/admin/access-rights/page.tsx` и [`docs/role_matrix/system_admin.md`](role_matrix/system_admin.md).

---

## Фаза 0 — Точка входа и навигация

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Любая роль | `/` (`app/page.tsx`) | Главный экран — **PipeQC Shell** | Левый sidebar c 7 модулями (Admin, Spooling, Fabrication, NDE, Erection, Testpack, Reports), верхняя строка с проектом + ролью, центральная плитка модулей с KPI | Кликает по модулю или плитке | Каждый день каждый пользователь стартует здесь. Это «оглавление» завода в цифре — см. финальную mind-map в [Части 8 гайда](pipeline_construction_guide.md). |
| Любая роль | `/documentation` | Страница | Встроенная документация / онбординг | Читает | Снимает страх «я не понимаю что нажимать» — первый день нового инженера на стройке. |

---

## Фаза 1 — SETUP / Admin (фундамент правил)

> **Бизнес-смысл фазы** — см. [«Часть 3. Модуль 1 — Setup (Admin). Установка правил вселенной»](pipeline_construction_guide.md) в гайде: первые 2–4 недели проекта заполняем справочники; без этого приложение не знает, что хорошо, а что плохо. Аналогия — открытие казино: дилеры, правила, лимиты.

**Один пользователь:** `System Admin` (объединяет Project / Site / System admin).

### 1.1 Project Definition

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| System Admin | `/admin/project-definition` | Страница-форма | Поля: Project code, Owner, EPC Contractor, договорный номер, **Maximum transit time** (дни до флага «overdue» в spool tracking), логотипы Owner / EPC | Заполняет identity проекта, загружает логотипы | Это «gate #1» — без записи о проекте система не примет ни одного ISO. Логотипы будут на всех QC-формах (W24, QC-13), которые поедут к Owner-инспектору на подпись. |

### 1.2 System Referential (глобальные справочники компании)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| System Admin | `/admin/system-referential` | Страница с **AdminTabs** | Таблицы: **Material Type** (CS, LTCS, SS304/316, CrMo P11/P22, PVC, FRP), **Film Quantity per Diameter** (RT: сколько плёнок на диаметр × толщину), **UT Calculation** (коэффициенты), **Torquing Requirement** (момент затяжки фланцев Н·м) | Заполняет master-таблицы, общие для всех проектов | Эти данные не зависят от стройки → живут глобально. Когда на гидроиспытаниях команда затягивает фланец, момент берётся отсюда. См. [«Два уровня справочников» в Части 3](pipeline_construction_guide.md). |

### 1.3 Project Referential (правила одного проекта)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| System Admin | `/admin/project-referential` | Страница с **AdminTabs** (7 вкладок) | Вкладки: **Teams**, **Subcontractors** (live CRUD), **Welder Qualifications**, **WPS**, **NDE Matrix**, **Rework Codes**, **Joint Categories** | Открывает диалог «Add Subcontractor» / «Add Welder» / «Add WPS» — вводит сертификат, дату истечения, PDS area | Это сердце правил проекта. Без NDE Matrix приложение не знает, какие швы просвечивать. Без Welder Qualifications нельзя зарегистрировать шов. См. [«Что лежит в Project Referential»](pipeline_construction_guide.md). |
| System Admin | тот же | Диалог «Edit Welder Qualification» | Поля: Welder ID + stamp, WPS coverage (какие процедуры допущен варить), expiry date | Продлевает / отзывает допуск | Если у сварщика истёк допуск, а он продолжает варить — это [боль №2 из «Часть 5 — Что часто болит»](pipeline_construction_guide.md). PipeQC заблокирует регистрацию шва. |
| System Admin | тот же | NDE Matrix tab | Матрица: service class × тип шва × метод (RT/UT/PT/MT) × % выборки | Настраивает sampling | По этой матрице автоматически выставляется план NDE для каждого шва на стройке. См. таблицу классов опасности в [Части 1 гайда](pipeline_construction_guide.md). |

### 1.4 Access Rights

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| System Admin | `/admin/access-rights` | Страница — матрица «User × Role × Scope» | Список юзеров, ролевые чипы (r0 Admin, r4 Spooling, r3 QC, r5 Fab, r6 Erection, …), scope-lock (subcontractor / area) | Назначает роль и заперает scope на свой subcontractor | **Critical pattern: subcontractor scope lock** — когда subcontractor-юзер логинится, dropdown подрядчика заблокирован на его ID. Без этого один подрядчик увидит чужие косяки. |

### 1.5 Import Settings

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| System Admin | `/admin/import-settings` | Страница — 6 placeholder-карточек | Шаблоны импорта: **Weld Thickness / Flange**, **NDE Matrix**, **Project Piping Material List (PML)**, **Spooling Images ZIP**, **Spooling Material Type**, **Spooling Class Material** | Загружает Excel/ZIP подготовленный инженерией | Это мост между AVEVA / SmartPlant (где спроектирован завод) и PipeQC (где он строится). См. [«Чем вы отличаетесь от AVEVA?» в Части 7 гайда](pipeline_construction_guide.md). |

> ⚠ **Сюжет для слайда:** «Первые 2–4 недели проекта эта роль одна — наполняет систему. Все остальные роли ждут. Это и есть инвестиция в строгий контроль на 3 года.» — Часть 3 гайда, финальный absztrakt.

---

## Фаза 2 — SPOOLING / Preparation (ISO → катушки)

> **Бизнес-смысл фазы** — см. [«Часть 4. Модуль 2 — Preparation (Spooling)»](pipeline_construction_guide.md): инженерия выдаёт ISO-чертёж (изометрия одной линии), его невозможно привезти целиком, поэтому Spool Designer режет линию на катушки (≤ 12 м). На стыках появляются Field Welds.

### 2.1 Spooling Home

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Spooling Lead | `/spooling` | Дашборд (`spooling-home-dashboard.tsx`) | KPI: ISOs received / in-checkout / on-hold / released; график rounds; live activity feed | Открывает один из 3 sub-модулей | Pulse-экран: «что я сегодня делаю как Spooling Lead?» |

### 2.2 Engineering Transmittals (входящий поток ISO)

| Кто           | Маршрут                              | Контейнер                                              | Видит                                                                                         | Делает                                                                      | Зачем                                                                                                                                                                                                    |
| ------------- | ------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spooling Lead | `/spooling/engineering-transmittals` | Список + side-panel `eng-transmittal-detail-panel.tsx` | Колонки: Trans. No, Source team, Date, # of ISOs, Rev, Status (Pending / Accepted / Rejected) | Открывает transmittal → видит список ISO внутри → нажимает **Accept Batch** | Engineering выпускает ISO пачками по 5–50 штук daily-to-weekly. Это формальный handoff в Spooling. На крупном НПЗ — 5000+ ISO за проект (см. [масштаб в Части 1 гайда](pipeline_construction_guide.md)). |

### 2.3 ISO Workflow (главный экран spool-team)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Spooling Lead | `/spooling/iso-workflow` | Таблица ISO + `iso-detail-panel.tsx` (Sheet шириной 520px справа) | Колонки: ISO No, Rev, Line, Pipe Class, Status (Received / Checkout / Checking / Hold / Released), Rounds counter, Hold reason | Клик по строке открывает sheet | Это backlog spooler'ов. ISO-чертёж = одна линия от насоса до теплообменника (см. псевдо-картинку в [Части 4 гайда](pipeline_construction_guide.md)). |
| Spooling Lead | тот же | Внутри Sheet: tabs «Header», «Spools», «Welds», «History» | Метаданные ISO, BOM, превью PDF; список spools; список welds (Shop / Field); revision history | Нажимает **Checkout to spooler** | Назначает ISO конкретному junior-drafter'у. Тот откроет SpoolGen (внешний CAD), порежет линию, вернёт 4 файла. |
| Spool Designer | тот же | Sheet → action **Mark as Checked** | Поля для замечаний checker'а, кнопка Reject → возврат на новый round | Senior spooler ревьюит, либо отправляет на исправление | Multi-round verification: типичный ISO — 1–3 раунда, проблемный — 5+. Без этого ошибки в spool drawings (несошедшиеся диаметры, неверные heat numbers) уезжают в цех. |
| Spooling Lead | тот же | Sheet → **Hold** dialog | Два radio: «Spool Team hold» (мы нашли несоответствие) / «Engineering hold» (engineering сами reissue). Поле reason + holder name | Ставит hold | Разделение источников hold'а — чтобы потом видеть SLA: сколько engineering держит наши вопросы. |
| Spooling Lead | тот же | `RevisionCascadeDialog` (поверх ISO Workflow) | Раздаёт impact analysis: какие spools уже в fab, какие в shipping, какие ещё актуальны; чек-листы по каждому | Закрывает старую rev, открывает новую | **Самая болезненная операция в lifecycle** ([Часть 4 — что часто болит](pipeline_construction_guide.md)): инженерия выпустила R1 на ISO, где половина spools уже сварена. Кого режем в скрап, кого модифицируем? |

### 2.4 Spooling Transmittal (исходящая партия в цех)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Spooling Lead | `/spooling/spooling-transmittal` | Список + side-panel `spooling-transmittal-detail-panel.tsx` | Партии released ISO, сгруппированные по target system / PDS area / target completion date; колонка `Spl. Trans. No.` | Создаёт новый transmittal, прикладывает PDF, отправляет в Fabrication module | Это формальный handoff на shop floor — момент, когда «бумажная» работа Spooling-команды превращается в физический workload цеха. |

> 🎬 **Сюжет для слайда:** Сравнение «было/стало» — раньше Spooling Lead держал в Excel мэппинг 4000 ISO × 3 raunds × 2 типа hold'а. Сейчас — один экран с фильтрами и SLA-чартами.

---

## Фаза 3 — FABRICATION (цех)

> **Бизнес-смысл фазы** — см. [«Часть 5. Модуль 3 — Construction: Fabrication. Цех»](pipeline_construction_guide.md): в ангаре 5–10 тыс. м² катушка живёт цикл receiving → cutting → fit-up → welding → NDE → PWHT → paint → marking → ready for dispatch. Главная сущность здесь — **Joint Card** (паспорт шва).

### 3.1 Fabrication Home / Dashboard

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Project Manager / Fab Supervisor | `/fabrication`, `/fabrication/dashboard` | `fabrication-dashboard.tsx` | KPI cards: Spools in production / weld backlog / NDE pending / paint pending / ready-for-dispatch; chart «daily welded inches»; per-subcontractor breakdown | Кликает в drill-down к конкретному экрану | Pulse-экран фабрикации: куда упёрся workflow. На утренней планёрке PM открывает это и говорит «почему сегодня welds меньше, чем вчера». |

### 3.2 Material Check (приёмка материалов на spool)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| QC Engineer | `/fabrication/material-check` | Таблица + `material-check-detail-panel.tsx` (Sheet) | Список спулов в статусе «pending material check», в детали — BOM (фланцы, отводы, прокладки), Heat No каждой детали, ссылка на **MTC** (Mill Test Certificate) | Сверяет физические детали с BOM, **сканирует/вводит Heat No**, нажимает Accept или Reject | Если хоть одна деталь не из PML или без MTC — попадёт некачественная сталь и через 5 лет лопнет шов. Это [«паспорт на каждый шов»](pipeline_construction_guide.md), про который Часть 5 гайда. |

### 3.3 Weld Progress (главный экран сварщика-мастера)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Fabrication Subcontractor | `/fabrication/weld-progress` | `weld-table.tsx` + `weld-detail-panel.tsx` (Sheet) | Колонки: Spool, Joint ID (например `SP-001-A/W-03`), Joint Type (BW/SW/FL), Pipe Class, WPS, Welder, VT result, NDE required, Status. Фильтры по spool / welder / WPS | Открывает Joint Card → вписывает фактического сварщика (выбор из dropdown welders с активным допуском), дату, результат VT | Это и есть **Joint Card** из [Части 5 гайда](pipeline_construction_guide.md) — «паспорт шва». Система не даст выбрать сварщика без допуска на этот WPS. |
| Fabrication Subcontractor | тот же | Внутри Sheet: «Repair Weld» action | Поле — reason; счётчик «3-я попытка → blocker» | Регистрирует ремонтный шов | По нормам после 3 ремонтов шов вырезают и переваривают полностью — система сама это покажет. Боль из [«что часто болит» в Части 5](pipeline_construction_guide.md). |

### 3.4 QC Release (визуальная инспекция шва)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| QC Engineer | `/fabrication/qc-release` | `qc-release-view.tsx` + `qc-release-detail-panel.tsx` | Очередь свежесваренных швов, статус VT, чек-лист критериев (зазоры, центровка, проплав), кнопка **Generate W24 PDF** (через `w24-pdf-button.tsx`) | Принимает VT, формирует QC-13 / W24 отчёт | Каждый шов проходит визуальный контроль. **W24** и **QC-13** — формы для Owner-инспектора (их видит он). |

### 3.5 PWHT Release (термообработка)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Fabrication Subcontractor / QC | `/fabrication/pwht-release` | Sheet `pwht-release-detail-panel.tsx` | Очередь spools со швами, для которых требуется PWHT по NDE Matrix; график «температура × время» (chart recording); приложенный протокол печи | Принимает результат PWHT, либо отправляет на повтор | Толстостенные / легированные стали после сварки обязательно «отпускают» — иначе шов хрупкий. Без протокола катушка не уезжает на площадку ([Часть 5 — когда катушка готова](pipeline_construction_guide.md)). |

### 3.6 Paint (покраска)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Fabrication Subcontractor | `/fabrication/paint` | Sheet `paint-detail-panel.tsx` | Spool, paint spec (цвет / толщина грунта / финиша), DFT (Dry Film Thickness) измерения | Регистрирует слои покраски и DFT | Цвет — это по контракту с клиентом, толщина — это коррозионная защита. Без правильного DFT через 5 лет ржавчина. |

### 3.7 Laydown (готовая зона цеха)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Fabrication Subcontractor | `/fabrication/laydown` | Sheet `laydown-detail-panel.tsx` | Готовые спулы со статусом **Ready for Dispatch**: spool ID, размеры, вес, location | Печатает barcode (через `/tracking/print-barcodes`), готовит к отгрузке | Спул проходит все 5 чек-пунктов «когда катушка считается готовой» из [Части 5](pipeline_construction_guide.md) → status auto-меняется на Ready for Dispatch. |

---

## Фаза 4 — NDE (неразрушающий контроль)

> **Бизнес-смысл фазы** — встроена в Fabrication и Erection, но имеет отдельный модуль, потому что выполняет subcontractor-лаборатория. План работы для них берётся из **NDE Matrix** (System Referential). См. [таблицу методов RT/UT/PT/MT в Части 1](pipeline_construction_guide.md).

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| NDE Inspector / NDE Coordinator | `/nde`, `/nde/dashboard` | Дашборд + табличный экран | KPI: швы pending по RT / UT / PT / MT; rejection rate per welder; per-WPS pass rate; график «films issued vs. consumed» | Видит свой backlog | Это «полицейский внутри полицейского» — лаборатория физически просвечивает швы рентгеном. |
| NDE Inspector | `/nde` | Sheet «Joint Card → NDE result» | Joint ID, метод, требуемый %, кнопки **Accept** / **Reject + defect type**, прикладывает скан RT report (#RT-345) | Регистрирует результат | Если ≥ 3 reject подряд у одного welder'а → система алертит [(Welder Traceability в Части 5)](pipeline_construction_guide.md). Сварщика временно отстраняют. |

---

## Фаза 5 — ERECTION (стройплощадка)

> **Бизнес-смысл фазы** — см. [«Часть 6. Модуль 4 — Construction: Erection. Стройплощадка»](pipeline_construction_guide.md): спул приехал на улицу, его монтируют между постаментами и оборудованием, варят полевые швы (Field Welds), фланцуют с моментом затяжки, обходят с Punch List, готовят к гидроиспытаниям.

### 5.1 Erection Home / Dashboard

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| PM / Erection Supervisor | `/erection`, `/erection/dashboard` | `erection-dashboard.tsx` | KPI: spools on-site / supported / welded / bolted / RFT-ready; chart per PDS area; per-system progress | Drill-down в подэкраны | Зеркало fab-дашборда, но для площадки. PM видит, где «затор»: спулы на площадке есть, но не на стойках. |

### 5.2 To Site (приёмка спула на площадке)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Erection Subcontractor | `/erection/to-site` | Sheet `to-site-detail-panel.tsx` | Список спулов в пути или принятых; spool ID, PDS Area назначение, дата ETA, паспорт спула | Сканирует barcode, ставит «Received on site», фиксирует Laydown Yard cell | Этап A на схеме [Erection workflow в гайде](pipeline_construction_guide.md): выгрузка в Laydown Yard, привязка к зоне. |

### 5.3 Material Check (полевая приёмка)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| QC Engineer (Field) | `/erection/material-check` | Sheet `field-material-check-detail-panel.tsx` | Спул + список деталей; чек-лист повреждений после транспортировки; фото-док | Принимает спул либо отправляет в reject (отказ от приёмки) | Иначе ржавый/гнутый спул поедет на высоту и его придётся снимать назад — а это дороже сварки в [3-5 раз](pipeline_construction_guide.md) (таблица «Цеховые vs полевые швы»). |

### 5.4 Supported (установка на постаменты)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Erection Subcontractor | `/erection/supported` | Sheet `supported-detail-panel.tsx` | Spool + статус подготовленности опор (supports готовы / нет), список крепежа | «Lifted & positioned» — отмечает установку | Pre-erection check из workflow гайда: без готовых опор кран не приедет. |

### 5.5 Weld Progress (полевые швы)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Erection Subcontractor | `/erection/weld-progress` | `field-weld-table.tsx` + `field-weld-detail-panel.tsx` | Field Welds (FW) между спулами; та же Joint Card что в цеху, но с маркером «position 5G/6G», условиями (дождь, ветер) | Регистрирует welder, дату, VT | Полевые швы — самые дорогие и ответственные ([Часть 6, таблица отличий fab/erection](pipeline_construction_guide.md)). Тот же [Welder Traceability](pipeline_construction_guide.md) работает на высоте. |

### 5.6 Flange Progress (фланцевые соединения)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Erection Subcontractor | `/erection/flange-progress`, `/flange` | Sheet `flange-progress-detail-panel.tsx` | Список фланцев: spec, диаметр, нужный момент затяжки (из System Referential Torquing), gasket type | Регистрирует bolt-up: момент, инструмент (динамометрический ключ ID), подпись | Перетянул — сорвал; не дотянул — потечёт ([Часть 3 — Torquing Requirement](pipeline_construction_guide.md)). |

### 5.7 Welded / Bolted summary

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| QC Engineer | `/erection/welded-bolted` | Sheet `welded-bolted-detail-panel.tsx` | Сводка по линии: все швы зарегистрированы? все фланцы затянуты? | Принимает линию к **Line Walk** | Чек-лист перед обходом инспектором. |

### 5.8 Field QC Release (Punch List)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Owner Inspector + QC Engineer | `/erection/field-qc-release` | Sheet `field-qc-release-detail-panel.tsx` | **Punch List**: список «хвостов» с категориями **A** (блокирует) / **B** (косметика) | Owner inspector ходит, добавляет пункты; QC Engineer закрывает | До закрытия всех A-пунктов линию **нельзя** перевести в RFT. См. [«Punch List» в Части 6](pipeline_construction_guide.md). |

### 5.9 RFT / Erected

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| QC Engineer | `/erection/rft` | `rft-view.tsx` | Линии, готовые к Hydrotest: фильтр по системе / area | Помечает «Ready for Hydrotest» | После этого линия попадает в **Test Pack Builder**. |
| QC Engineer | `/erection/erected` | `erected-detail-panel.tsx` | Линии в финальном состоянии «erected» | Финальный handoff | Связка с Testpack-фазой. |

---

## Фаза 6 — TEST PACK (гидроиспытания)

> **Бизнес-смысл фазы** — см. [«Test Pack — гидроиспытания» в конце Части 6](pipeline_construction_guide.md): группа связанных линий объединяется в Test Pack, в неё закачивают воду под давлением в 1.5× от рабочего. Чтобы не сломать оборудование — ставят временные blinds (заглушки). После теста — Reinstatement Team их снимает. **Баланс blind in / blind out — жёсткий контроль PipeQC.**

### 6.1 Test Pack Builder

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator | `/testpack/builder` | `testpack-builder-iso-picker.tsx` + `testpack-builder-sheet.tsx` (Sheet) | Список RFT линий → drag-and-drop в группу → автоопределение isolation points (где ставить blinds), test pressure | Собирает Test Pack | Решает «вот эти 7 линий идут одной партией». Это инженерная задача: что физически можно изолировать. |

### 6.2 Test Pack Explorer

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator / PM / Owner | `/testpack/explorer` | `testpack-explorer.tsx` с 4 tabs: **General**, **Release**, **Operations**, **Progress** | Метаданные пакета, статус релизов, список операций, прогресс-бар | Drill-down в конкретную фазу | Это «оглавление» Test Pack. На Operations tab — состояния четырёх sub-фаз ниже. |

### 6.3 Pressure Test Home

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator | `/testpack/pressure-test` | `pressure-test-homepage.tsx` (tabs: 7D/30D/90D/YTD + Test pack / Isometric / Flange joint) | Активити-лента (`testpack-activity-feed.tsx`), KPI прогресса, фильтры по времени | Открывает sub-фазу | Pulse-экран гидроиспытаний. |

### 6.4 Blinding (установка заглушек)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Blinding Team | `/testpack/pressure-test/blinding/preparation` | Преп-страница | Список fланцев, в которые надо поставить blinds; spec заглушек | Формирует request | Снимок до выхода в поле. |
| Blinding Team | `/testpack/pressure-test/blinding/progress` | Прогресс-страница | Чек-лист точек, фото, подпись бригадира | Отмечает «blind installed at FL-12» — **каждый blind регистрируется** | См. [«1. Blinding Team» в Части 6 гайда](pipeline_construction_guide.md). |
| Blinding Team | `/testpack/print/blinding/[requestId]` | Печатная форма (PDF) | Сводный отчёт | Печатает | Бумажная подпись по требованию Owner. |

### 6.5 Line Check (предтестовый обход)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Line Checker Team | `/testpack/pressure-test/line-check/preparation`, `.../progress` | Преп + прогресс | Полный список швов / опор / blinds на тестовом участке | Идёт по линии и тикает: все швы зарегистрированы, опоры на месте, blinds установлены | См. [«2. Line Checker Team» в Части 6](pipeline_construction_guide.md). Без этого тест может разорвать неготовую трубу. |
| Line Checker Team | `/testpack/print/line-check/[requestId]` | PDF | Walk-down report | Печатает + подписывает | — |

### 6.6 Testing / Pre-commissioning

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator + Owner Inspector | `/testpack/pressure-test/testing-precomm` + `.../progress` | Страница теста | График давления во времени (chart recording), параметры теста (рабочее давление × 1.5), pass / fail | Запускает закачку, держит давление, фиксирует результат | Сам момент истины. Если где-то подтекло — fail, переделка. |
| Owner Inspector | `testpack/client-examination-panel.tsx` | Side-panel | Чек-лист со стороны клиента | Подписывает «принято» | Это «приёмка с заказчиком». |

### 6.7 Reinstatement (снятие заглушек) — **критическая сверка**

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Reinstatement Team | `/testpack/pressure-test/reinstatement/preparation`, `.../progress` | Преп + прогресс с **balance counter** | Счётчик «blinds installed: 24 / blinds removed: 21 / **3 missing**» (красным) | Снимает каждый blind, ставит постоянную прокладку | **Самый жёсткий контроль PipeQC.** Забыли blind → завод пускают → где-то рванёт. См. финал [Части 6 — «3. Reinstatement Team»](pipeline_construction_guide.md). |
| Reinstatement Team | `/testpack/print/reinstatement/[requestId]` | PDF | Balance report (in vs out) | Печатает + подписывает | — |

### 6.8 Item Clearance (доп. операции вокруг теста)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator | `/testpack/pressure-test/item-clearance/preparation`, `.../progress` | Преп + прогресс | Список items, которые надо «расчистить» (временные опоры, лишние gaskets) | Закрывает по чек-листу | Финальный clean-up. |

### 6.9 Release Work (передача линии в эксплуатацию)

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| Test Pack Coordinator + Owner | внутри `/testpack/explorer` | `release-work-dialog.tsx` (Dialog) | Финальный пакет документов: VT/NDE/PWHT/torquing/blind balance/Punch List закрыт | Owner подписывает | Линия переходит в Commissioning. Это handoff из стройки в эксплуатацию. |
| Test Pack Coordinator | внутри `/testpack/explorer` | `dossier-pdf-button.tsx` | Один большой dossier PDF | Печатает финальное досье | То самое «при аудите Owner'а готовят пачку 2 недели вручную» (из [«какие боли вы решаете» в Части 7](pipeline_construction_guide.md)) — сейчас в один клик. |

---

## Фаза 7 — Tracking (логистика спулов между фазами)

> **Бизнес-смысл фазы** — поддерживающий модуль для физического перемещения catushek между зонами (фab shop → laydown → site → erected position). Maximum transit time из Project Definition управляет флагом «overdue».

| Кто                              | Маршрут                    | Контейнер                      | Видит                                                                        | Делает             | Зачем                                                                                                                     |
| -------------------------------- | -------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Material Coordinator / Logistics | `/tracking`                | `spool-tracking-dashboard.tsx` | Карта перемещений: spools в пути, в Laydown Yard, on-site, overdue (красным) | Drill-down к spool | Чтобы катушки не лежали 9 месяцев под дождём ([боль «годами лежат во дворе» из Части 4](pipeline_construction_guide.md)). |
| Material Coordinator             | `/tracking/data-analysis`  | Аналитика                      | Median transit time, чартs per subcontractor                                 | Анализирует        | Для биллинга и претензий.                                                                                                 |
| Material Coordinator             | `/tracking/print-barcodes` | Печать                         | Barcode labels для спулов                                                    | Печатает           | Для физического сканирования на каждой фазе.                                                                              |
|                                  |                            |                                |                                                                              |                    |                                                                                                                           |

---

## Фаза 8 — Reports (на стол Owner и PM)

> **Бизнес-смысл фазы** — см. [«какие боли решаем» в Части 7 гайда](pipeline_construction_guide.md): один из главных продаваемых сценариев. Owner раньше ждал отчёт 2 недели — теперь выгружает за минуту.

| Кто | Маршрут | Контейнер | Видит | Делает | Зачем |
|---|---|---|---|---|---|
| PM | `/reports` | Список pre-built reports + конструктор | Welding progress, NDE pass-rate, Punch List status, Test Pack readiness, Subcontractor billing | Запускает отчёт, экспортирует Excel/PDF | Для weekly с Owner'ом и monthly с боссом. Прогресс по швам ↔ % выполнения подрядчика ↔ счёт. |
| Owner Inspector | `/reports` (read-only) | тот же | Те же отчёты, но только просмотр | Скачивает | Для аудита и приёмки. |

---

## Сквозные паттерны (нужны на одном «обзорном» слайде)

| Паттерн | Где встречается | Почему важен | Ссылка в гайд |
|---|---|---|---|
| **Side-panel (Sheet)** для деталей | Везде: `iso-detail-panel`, `weld-detail-panel`, `flange-progress-detail-panel`, etc. | Сохраняет контекст списка слева; на ноуте инженера и на планшете в поле — одинаково | — |
| **Status badges** | `status-badge.tsx`, `erection-status-badge.tsx` | Универсальный язык: один цвет означает одно состояние во всех модулях | [«One source of truth» из Части 7 гайда](pipeline_construction_guide.md) |
| **Subcontractor scope lock** | `/admin/access-rights` → действует на каждом subcontractor-экране | Подрядчик не видит чужих косяков | [«Главное про Admin» в Части 3](pipeline_construction_guide.md) |
| **Activity feed** | `testpack-activity-feed.tsx`, `iso-watcher-mount.tsx`, `spool-rft-watcher-mount.tsx` | Live-лента того, что только что произошло на проекте | — |
| **Generated PDFs** | `w24-pdf-button.tsx` (cварной паспорт), `qc13-pdf-button.tsx` (QC release), `w10p-pdf-button.tsx`, `dossier-pdf-button.tsx` (Test Pack досье) | Owner-инспектор живёт в PDF — мы умеем выдавать его одним кликом | [«отчёт выгружается в один клик» в Части 7](pipeline_construction_guide.md) |
| **PM Write-Lock Banner** | `pm-write-lock-banner.tsx` | Когда PM закрывает фазу — никто внутри не может изменить данные задним числом | Аудит и compliance |

---

## Краткая карта «роль → главные 3 экрана» (для одного быстрого слайда)

| Роль | Экран №1 (где живёт) | Экран №2 | Экран №3 |
|---|---|---|---|
| **System Admin** | `/admin/project-referential` | `/admin/access-rights` | `/admin/import-settings` |
| **Spooling Lead** | `/spooling/iso-workflow` | `/spooling/engineering-transmittals` | `/spooling/spooling-transmittal` |
| **Fabrication Subcontractor** | `/fabrication/weld-progress` | `/fabrication/paint` | `/fabrication/laydown` |
| **QC Engineer** | `/fabrication/qc-release` | `/erection/field-qc-release` | `/testpack/explorer` |
| **NDE Inspector** | `/nde/dashboard` | `/nde` | (drill-in в Joint Card) |
| **Erection Subcontractor** | `/erection/weld-progress` | `/erection/flange-progress` | `/erection/to-site` |
| **Test Pack Coordinator** | `/testpack/builder` | `/testpack/explorer` | `/testpack/pressure-test` |
| **Reinstatement Team** | `/testpack/pressure-test/reinstatement/progress` | (balance counter) | `print/reinstatement/[id]` |
| **PM** | `/fabrication/dashboard` | `/erection/dashboard` | `/reports` |
| **Owner Inspector** | `/erection/field-qc-release` (Punch List) | `client-examination-panel` в Testpack | `/reports` (read-only) |

---

*Документ — рабочий черновик. Под каждую строку из таблиц можно делать отдельный скриншот. Если для слайдов потребуется углубление по конкретному UI-блоку — детальное описание ответственности роли уже есть в [`docs/role_matrix/`](role_matrix/) (по одному файлу на роль).*
