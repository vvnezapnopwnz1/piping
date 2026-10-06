# PipeQC: связи модулей, источники полей и выбор из справочников

Дата: 6 октября 2026. Тип работы: исследование текущего кода, контрактов и миграций. Код приложения, данные стендов и права пользователей в рамках исследования не менялись.

## Главный вывод

Следующий полезный блок — связать существующие рабочие формы со справочниками, ограничениями и контекстом конкретного объекта. Основной разрыв: сервер знает, какие значения допустимы, но интерфейс не всегда предоставляет эти варианты и не объясняет происхождение значения. Поэтому оператор должен искать данные в другом модуле, помнить код или разбираться с отказом после сохранения.

Начать следует с общей связки **PML → BOM → Material Check в Fabrication и Erection**, включая права чтения и идентичность строки материала. Затем — **подрядчик → WPS → квалификация сварщика** и **справочники устройств/мест → Tracking**. Это ограниченные задачи на существующем продукте, которые непосредственно уменьшают ошибки ввода.

**Assembly исключён из развития по уточнению владельца продукта в этой сессии.** Упоминания Assembly ниже относятся только к оставшимся настройкам и возможной путанице в интерфейсе. Создание рабочего модуля, его справочников или сценариев не предлагается.

## Метод и границы достоверности

Исследованы формы Fabrication, Erection, NDE, Flange, Tracking, Test Packs, Project/System Referentials, WPS, Engineering и Imports. Для ключевых полей прослежена цепочка JSX → application/domain → repository → SQL-команда/таблица → политика чтения. ROMS проверен по текущим файлам autocomplete как пример поведения.

Уровни доказательств:

- **Код:** поведение прямо следует из текущего компонента или запроса. Это не утверждение о воспроизведении в браузере.
- **Проверено функцией:** выполнен безопасный вызов существующей чистой функции с синтетическими данными; без обращения к БД.
- **Контракт:** правило подтверждено миграцией; фактический набор применённых миграций и настроек конкретного стенда в этом исследовании не проверялся.
- **Предложение / вопрос:** рекомендуемое поведение, для которого ещё нужна предметная договорённость или отдельная реализация.

Computer Use не предоставил доступных браузеров/приложений. Поэтому здесь нет утверждений о визуальном воспроизведении, клавиатурной доступности текущих форм, реальных данных стенда или успешном сквозном сценарии. Reset, seed, hosted-команды и проверки, требующие пустой БД, не запускались.

Roadmap не использован как доказательство отсутствия функции. Во время исследования появились новые файлы Test Pack workspace/editor. При заключительной сверке **Builder уже подключил Definition/Composition editors и параметры URL, а сообщение о создании стало отражать частичный результат**. Explorer/Preparation/Progress на момент их чтения оставались прежними. Пункты Test Pack ниже обновлены с учётом этого изменения; их обязательно пересверить после завершения текущего плана agy. Наличие нового helper само по себе не означает, что каждый экран его использует.

Сопутствующий `2026-10-06-module-connections-fields.csv` содержит **192 точки объявления JSX-контролов в 30 файлах**: файл, строку, компонент, значение, тип и подсказку. Это не число уникальных бизнес-полей: `.map()` может создавать много полей из одного объявления; условный компонент может вообще не отображаться. Инвентаризация не заменяет таблицу предметных решений ниже.

Эвристическая оценка именно связанности и понятности источников: **5/10**. Это экспертная оценка по коду, а не результат пользовательского тестирования. Для 10/10 необходимы: понятное происхождение значения, допустимые варианты с причинами исключения, различимые состояния загрузки/ошибки/отсутствия доступа, сохранение выбранного объекта и черновика, проверенная работа обычных ролей и браузерная приёмка.

Приоритеты: **P1** — мешает корректно записать/интерпретировать работу; **P2** — замедляет, заставляет искать и помнить; **P3** — улучшение масштаба или расширение контрактов. Severity 0–4 — оценка UX-влияния, а не подтверждённый production incident. Максимальный балл без пользовательского воспроизведения не присваивается.

## 1. Ответ на пример Field Material

Поле называется **Heat / trace number**. Источник уже существует: **Piping Material List**, таблица `piping_material_records`, поля `project_id`, `ident_code`, `trace_number`, `mrr_number`, `status`.

Где оно заполняется:

- Project Referentials → Welding & Quality → PML Records: форма добавления MRR, Ident Code, Trace/Heat Number.
- Imports → Project Piping Material List: импорт с естественным ключом `(ident_code, trace_number)` внутри проекта.

В обеих формах Material Check сейчас загружаются BOM, ранее принятые material check items и последняя QC-13. **Варианты PML для нового выбора не загружаются.** Placeholder с ожидаемым trace из BOM не является ни справочником, ни подтверждением физической проверки материала.

### Реальное правило допуска

SQL `record_material_check` для field-фазы требует:

1. Допустимую текущую spool revision и право `erection.progress.record`.
2. Предыдущий этап To Site; для fabrication вместо этого требуется Start Fab.
3. Строку BOM с совпадающим Ident code; если BOM содержит trace, он должен совпасть с введённым.
4. Активную PML-запись **этого проекта** с тем же Ident code и trace.
5. Для уже принятой строки — прежнюю PML-запись и прежнее принятое количество. Переписать доказательство обычным повторным сохранением нельзя.

Один и тот же номер плавки у другого Ident code или другого проекта не подходит. Нельзя выдавать все traces проекта без фильтра по строке BOM. Нельзя автоматически считать ожидаемый номер из импорта доказательством проверки.

### Предлагаемое поведение

Для непроверенной строки — поисковый выбор **допустимой PML-записи**. Вариант показывает `Trace/heat · MRR`, рядом остаются Ident code, описание и количество из BOM. Поиск может находить trace и MRR. Если BOM жёстко задаёт trace, выбор сужается до него; даже единственный кандидат должен быть осознанно подтверждён оператором.

Для принятой строки — значение и источник в режиме чтения с сообщением «Recorded; material evidence is locked». Повторное подтверждение общей даты проверки должно быть отдельным, понятным действием в рамках существующего контракта. Autocomplete не является командой сохранения.

При отсутствии кандидата различать: PML не заполнен; записи для этого Ident нет; запись есть, но не совпадает с ожидаемым BOM trace; запись неактивна; нет права чтения; запрос завершился ошибкой. RLS может вернуть пустой список без ошибки — один только `options.length === 0` не устанавливает причину. Право доступа должно быть известно отдельно.

Для администратора с нужным capability — переход в точный справочник/импорт с возвратом в прежний spool и операцию. Для оператора без права управления — показать, каких данных не хватает и кто должен их подготовить; не предлагать недоступную кнопку создания записи.

**Текущий RPC принимает `ident_code + trace_number`, а не PML ID.** В UI можно хранить выбранную запись и её ID, но нельзя незаметно заменить формат команды. Сначала согласовать правило нормализации и идентичность строки BOM; до этого простой autocomplete поверх старого payload оставит ошибки M04/M05.

Источники: [S01], [S02], [S03], [S04], [S05], [S06], [S07].

## 2. Каталог 40 наблюдений

Каждая запись описывает конкретный разрыв, результат для пользователя и направление исправления. Записи с предметным вопросом не следует автоматически превращать в задачи кодирования.

### Материалы и QC-13

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| M01 | P1 / 3 | Heat/trace в двух Material Check — свободный Input; допустимые данные уже есть в PML, проверка возникает при команде. | Общий поиск PML-кандидатов по разрешённому spool/BOM, trace + MRR; явный выбор без автоматической записи. | Код + контракт: S01–S05 |
| M02 | P2 / 2 | Operational lookup и восстановление evidence зависят от чтения PML/WPS/welders: `loadMaterialCheckItems` делает inner join PML. Пустой ответ RLS нельзя диагностировать как отсутствие материала. При этом стандартные access-роли project_editor/project_reader уже имеют `project_referential.view`; функциональная роль сама по себе не определяет это право. | Проверить реальные effective capabilities и scoped-пользователей; различать пустой справочник, scope и недоступное чтение. Использовать существующее право чтения; новый read-path нужен только при доказанном ограничении. Не выдавать manage/admin ради dropdown. | Контракт: S03, S08, S09; конкретный стенд не проверен |
| M03 | P1 / 3 | Принятый trace отображается редактируемым. Сервер запрещает замену PML evidence и количества. Поле приглашает к операции, которую выполнить нельзя. | Принятые строки read-only; явное разделение новой проверки, подтверждения даты и возможной отдельной процедуры исправления. | Код + контракт: S01, S02, S04 |
| M04 | P1 / 3 | Черновики/refs и восстановление Material Check индексируются по Ident code; BOM допускает несколько строк одного Ident с разными trace. Команда разрешает один Ident на вызов. `reconcileMaterialCheck` на двух таких строках вернул `lineTotal=2`, `checkedCount=1`, `isComplete=true`. | Уточнить бизнес-единицу проверки: строка BOM или Ident. Согласовать UI, reconciliation, RPC и счётчики; черновик по устойчивому ID строки. Не исправлять только React key. | Проверено функцией + контракт: S01–S04, S10 |
| M05 | P1 / 3 | PML create сохраняет регистр trace; Material Check uppercases его. `Heat-ab12` превращается в `HEAT-AB12`, SQL ищет точное равенство. Выбранная существующая запись может быть отвергнута. | Единый контракт нормализации creation/import/command/lookup. Учесть уже существующие записи и возможные коллизии; не делать массовую нормализацию без анализа. | Проверено функцией + контракт: S04, S07, S11 |
| M06 | P2 / 2 | QC-13 связывается автоматически с последней формой и показывается преимущественно номером. Оператор не видит происхождение выбора и историю связи. | Показать принадлежность spool/revision, дату выдачи, использованную форму и источник. Выбор формы вводить только при реальной потребности и согласованном правиле. | Код: S01, S02, S03 |

### Подрядчик, WPS и сварщики

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| W01 | P1 / 3 | Формы сварки показывают все активные WPS и welders проекта. Проверка уже учитывает подрядчика, диаметр, толщину, дату, WPS coverage сварщика; неподходящий выбор приходится разбирать после него. | Зависимый выбор: subcontractor + joint + date → WPS → root/cap welders. При смене родителя/даты перепроверять выбор, объяснять исключение. | Код + domain/SQL: S12–S14 |
| W02 | P2 / 2 | Operational варианты показывают WPS code и welder code, хотя для различения нужны подрядчик, диапазоны, срок и квалификация. Эти данные есть частично в loader/domain и в setup. | Поисковые варианты с вторичной строкой. Для исторической записи сохранять старое название и статус; не превращать неактивный ID в пустое поле. | Код: S12, S13, S15 |
| W03 | P1 / 3 | SQL дополнительно проверяет Material class → project material mapping → system Material Type → WPS. Browser gate JointDefinition не содержит material class/type; форма может казаться допустимой, а сервер отказать. | Подключить read-only контекст материала и причину отсутствующего mapping; вести в нужный Spooling Material Class справочник. SQL остаётся окончательным решением. | Контракт + код: S13, S14 |

### NDE и связь с швом

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| N01 | P2 / 2 | Переход из QC Release/RFT несёт spool, но не конкретную obligation/joint/cycle. На целевой странице приходится повторно выбирать строку. | Адресуемая конкретная obligation и batch; заголовок ISO/spool/joint/method/cycle; безопасный возврат. Не открывать другой объект при недоступном ID. | Код: S16, S17, S18 |
| N02 | P1 / 3 | NDE Record Result определяется disposition, а Create/Issue и другие действия не разделены по клиентским capabilities. Доступ к чтению не означает право выполнить каждую команду; сервер отказывает позже. | Разделить `nde.view`, `nde.batch.manage`, `nde.result.record` в интерфейсе и сохранении. Это UX-пробел, не доказательство обхода server authorization. | Код + контракт: S09, S17 |
| N03 | P2 / 2 | Responsible welder уже ограничен сварщиками шва — правильная связь. Но option строится пересечением joint IDs и только активных qualifications. Исторический участник шва после деактивации может исчезнуть. | Предметно проверить допустимость указания исторического исполнителя в NDE result. Если сервер позволяет — label lookup по участникам, без превращения inactive в нового доступного исполнителя сварки. | Код: S17, S19; допустимость требует проверки RPC |
| N04 | P1 / 3 | `reload` и асинхронная загрузка joint welder IDs не имеют проверки актуального target/generation; результат предыдущего запроса может подменить варианты после другого выбора/смены проекта. Save Result также не имеет общего pending lock. | Ключ загрузки project/obligation/joint, отмена или generation check; запрет записи при неактуальных refs, pending lock; preserve draft on error. | Код: S17 |

### Flange

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| F01 | P1 / 3 | Выбор нового flange меняет только selectedId. Category, requirement, report, tag, value, jointers/date остаются общими state. Ввод для A может быть отправлен для B. История загружается без target guard. | Черновик/initial values по project + flange revision; guard смены цели; актуальность истории; correction предзаполнять из подтверждённого effective record, а не прошлого черновика. | Код: S20 |
| F02 | P2 / 2 | Category option показывает code + reason, но loader уже имеет `joint_definition`, `timing`, `coefficient`; relation к Y/Z reinstatement теряется. | Выбор с расшифровкой category, timing и влиянием на последующие работы. Не ограничивать category текущей definition без отдельного серверного/предметного правила. | Код: S20, S21 |
| F03 | P1 / 3 | Запись flange требует проектный Unit Time `FLANGE_JOINTING` и расчётные referentials. Worklist показывает «Not configured», но форма не ведёт к конкретной настройке, ошибка появляется на submit. | Проверка доступности расчётных настроек до записи, список missing dependencies и разрешённые ссылки в project/system setup. | Контракт + код: S20, S22 |
| F04 | P2 / 2 | Jointing value — без единицы и методического контекста; выбор Torquing requirement сам по себе не поясняет смысл числа. В текущем system entry нет явного контракта единиц в форме. | Уточнить единицы по методу. Показать их только из согласованного контракта; не автоматически подписывать все значения «Nm». Это не задача одного autocomplete. | Код + предметный вопрос: S20–S22 |

### Tracking

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| T01 | P1 / 3 | Device selector строится из `tracking_device_usage` — агрегата прошлых событий. Зарегистрированное устройство без истории отсутствует, историческое неактивное может оставаться. | Справочник допустимых активных/назначенных devices; usage только вторичная статистика. Проверить ограничения оператора и nullable «No device» по command contract. | Код + SQL view: S23, S24 |
| T02 | P1 / 3 | При открытии события Location автоматически берётся из первой occupancy row, а не из осознанного выбора или семантики In/Out. | Пустой выбор либо доказанное контекстное предложение с подтверждением. Показывать описание/category/remaining capacity. Для Out проверить связь с текущим местом. | Код: S23; source occupancy корректно включает активные пустые места: S25 |
| T03 | P2 / 2 | Tracking выбирает stable spool ID локально; общий контекст `spool` означает revision ID. Экран не принимает этот контекст и refresh обнуляет selectedSpoolId. Переход из производства требует повторного поиска. | Явное разрешение revision → stable spool в scope проекта, URL selected target, обратный переход к текущей ревизии; сохранить выбор после записи/refresh. Не смешивать два вида ID. | Код: S23, S26 |
| T04 | P2 / 2 | В Consolidation/transit/inconsistency представлены технические issue/event/spool IDs и агрегаты, без полноценного пути к конкретному событию и коррекции. | Business labels + переход в spool history с выделением события, расшифровка issue и допустимого следующего действия. Correction capability сохранять. | Код: S23, S24 |

### Test Packs — сверить с текущей работой agy

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| P01 | P2 / 2 | Открываемый Explorer выводит System/Subsystem/Service Class и ISO IDs без business labels; Spool берётся как `spools[0]`. Новые reference labels/workspace loader уже появились отдельно. | Подключить labels и явный объект/выбор. Использовать текущий Test Pack plan, не создавать второй параллельный workbench. | Код: S27, S28 |
| P02 | P1 / 3 | Explorer → Edit composition / Pressure Test home теряет packId. Builder page уже читает ID/view/new и передаёт их в новый редактор; отсутствие URL-resolution Builder больше не считать открытым долгом. Разрыв остаётся у ссылки-отправителя. | Единые адресуемые ссылки project + pack + section/operation + return, ownership check на получателе; проверить после завершения текущего плана. | Код: S27, S29, S30 |
| P03 | P1 / 3 | `pressureUnit` уже добавлен в catalog mapping, подключённый DefinitionEditor использует dynamic fields для существующего pack. Форма **создания нового pack** в Builder всё ещё рендерит `TEST_PACK_FIELDS` с `bar`, Explorer пишет `(project unit)`. | Довести реальную единицу до создания и read views. У существующего pack есть snapshot unit; project unit — для создания/предметного правила обновления. | Код + контракт: S28, S29, S31 |
| P04 | P1 / 3 | Старый Preparation использует все member history rows без `removed_at` и широкий `listFlangeJointReadiness`, затем фильтрует локально. Новый scoped helper уже есть, но этот экран его ещё не импортирует. | Активные members; подключить scoped targets по ISO members. Не добавлять `.eq(project_id)` к view, где такой колонки нет. | Код: S28, S30 |
| P05 | P1 / 3 | Line Check draft keyed только requestId при нескольких ISO; Reinstatement хранит report/tag в чужих draft properties и подставляет `REPORT-T10` / `TAG-T10`, если пользователь ничего не ввёл. Team автоматически выбирается первым. | Черновики по конкретной цели/request, отдельные semantic fields, явный team, реальные обязательные report/tag без подстановок. Ни один пустой external evidence field не заполнять фиктивной строкой. | Код: S30, S32 |
| P06 | P1 / 3 | Testing/Precomm действие выводится из трёх дат, не из всех workflow eligibility facts; Home переносит packId в ссылки, но считает project-wide worklists и при ошибке может показать 0. | Один фактический workflow/readiness context; scoped counts или явная подпись «весь проект», отдельные error/unknown. Включено в текущий plan. | Код: S32, S33 |

### Настройка справочников

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| S01 | P2 / 2 | Locations Progress columns вводятся строкой через запятую (`start_fab, erected`), сохраняются строковыми значениями без списка допустимых колонок. | Сначала установить реального потребителя и допустимые значения. Если поддержаны — multiple select с именами этапов; если consumer отсутствует — не обещать поведение этой настройки. | Код + контракт: S34 |
| S02 | P2 / 2 | Progress Weight Activity — свободный code. Frontend принимает неизвестную activity с весом 100%, если сумма корректна. Это не подтверждает связь с каким-либо этапом выполнения. | Установить каталог поддержанных activity по фазам и read consumers; selector для существующих activity. Новые коды разрешать только при реальном расширяемом контракте. | Проверено функцией: S35 |
| S03 | P2 / 2 | PDS Custom Fields имеют metadata `date/text/number/boolean`, но редактор рендерит всем обычный Input и строковое значение. | Тип контрола/serialization по `dataType`; Label htmlFor/id; валидация и чтение того же типа. | Код + схема: S36 |
| S04 | P2 / 2 | Внешний Project Referential tab адресуем, но внутренние PML/Welders/NDE/Locations tabs — локальный state. Нельзя надёжно направить оператора сразу в нужный каталог. | Канонические outer + inner tab URL с возвратом и project code. Не создавать произвольные ссылки `?tab=pml`: текущий outer tab этого значения не принимает. | Код: S06, S37 |
| S05 | P1 / 3 | Для welder qualification есть UI создания и server RPC обновления, но нет edit-path для продления expiresOn/coverage. Operational выбор зависит от этих данных. | Приоритетный lifecycle редактор квалификации/coverage с concurrency и историческими ссылками; не создавать дубликат вместо продления. Остальные catalogs проверять индивидуально. | Код: S15 |

### Engineering и Imports

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| I01 | P2 / 2 | Engineering Browser показывает spools/welds/Ident списком без переходов к материалам, Fabrication/Erection, NDE и Flange. Выбранные ISO/revision локальны; при быстрых сменах нет проверки актуальности запросов. | URL-связь и разрешённые переходы по revision identity; search для ISO, актуальность загрузок; историческую ревизию показывать read-only. | Код: S38 |
| I02 | P1 / 3 | Revision decision предлагается по Entity/Number/Spool/Change, без before/after конкретных атрибутов. `PreviewChangeItem` не содержит этих значений. | Read-only diff деталей и связанных progress/evidence перед решением. Потребуется дополнение read contract; dropdown решений уже есть. | Код: S39 |
| I03 | P2 / 2 | ImportIssueList сообщает row/column/message, но не даёт путь к конкретному справочнику и допустимым reference codes. XLSX template описывает поля, но не гарантирует знание актуальных кодов. | Для reference ошибок — разрешённые каталоги/кодовые варианты и возврат к job. Скачать справочные коды проекта рядом с template; создание refs оставлять администратору. | Код: S40, S41 |

### Общие механизмы и ограничения продукта

| ID | Приоритет / severity | Наблюдение и следствие | Предлагаемое решение | Доказательство |
| --- | --- | --- | --- | --- |
| G01 | P2 / 2 | Есть Radix Select, Command, RecordSelectTable, но нет общего domain reference autocomplete для рабочих полей. Формы используют разные native/Radix choices и подписи. | Один доступный primitive searchable reference choice и domain wrappers; сохранить маленькие enum Select и большие record tables. Поведение по образцу ROMS, без копирования MUI stack. | Код: S42, S43 |
| G02 | P1 / 3 | `max_rows=1000`; PML/WPS/NDE и многие reference loaders читают списки без paging. Client-side search ищет только полученное подмножество; наличие pagination UI не доказывает полноту данных. | Scoped server search/page со стабильным ordering и признаком продолжения/полноты. Проверять lookup выбранной записи отдельно от текущей страницы. Для нового Test Pack loader уже есть отдельные заготовки. | Код + конфиг: S03, S12, S19, S28, S44 |
| G03 | P1 / 3 | Dirty-state registration уже добавлен, guard охватывает shell и clear-context. Но DOM-baseline отслеживает поля внутри main; portal dialogs/переходы target в Flange/Tracking не подключены к semantic dirty hook. Click по Save может сбросить baseline до успешного RPC. | Подключать существующий semantic hook для autocomplete/dialogs/target drafts; guard закрытия/смены объекта; successful save очищает только сохранённый draft. Не считать ввод поискового текста изменением бизнес-значения. | Код: S20, S23, S45 |
| A01 | P2 / 2 | Assembly исключён из продукта, но вкладка Assembly Configuration, поле Default Subcontractor ID, Assembly phase weights и роли в PDS остаются в настройках. | Зафиксировать продуктовую недоступность в UI: убрать/скрыть неподдержанный сценарий либо ясно обозначить legacy metadata. Не развивать Assembly и не удалять DB/history автоматически. | Код + решение владельца: S46 |
| D01 | P3 / 2 | Report/Chart/W10P/Tag вводятся как номера внешних доказательств; Documents сейчас — exports progress/RFT, а не реестр NDE/PWHT/paint/flange evidence. Номер похож на ссылку, но по нему нельзя открыть исходный документ. | Сейчас — пояснение источника/формата и required/optional. Реестр evidence и attachment/open-document — отдельное последующее расширение. Не выдавать экспортируемые reports за справочник внешних QC-документов. | Код: S17, S20, S32, S47 |

## 3. Какие поля выбирать, а какие вводить

| Поле / группа | Существующий источник | Рекомендуемый control | Важное ограничение |
| --- | --- | --- | --- |
| Heat/trace при проверке материала | PML + конкретная BOM line + accepted evidence | Searchable constrained choice / read-only принятой записи | Natural-key RPC, casing, duplicate Ident, active status, scope |
| Subcontractor в сварке | `project_subcontractors` | Autocomplete по code/name | Active + разрешённый subcontractor scope; предложенный PDS default не равен подтверждённому выбору |
| WPS при записи сварки | `project_welding_procedures` + material mapping | Зависимый autocomplete | Подрядчик, диапазоны, дата утверждения, материал |
| Root/Cap welder | `welder_qualifications` + `welder_wps_qualifications` | Зависимый autocomplete | Дата выполнения, expiry, subcontractor, WPS coverage; уникальность участников по контракту |
| NDE responsible welder | Фактические участники этого шва | Небольшой Select / поиск при большой группе | Уже подключено; проверить historical inactive labels |
| NDE defect code | `project_rework_codes` | Select / autocomplete | Required при rejection; code + description |
| Method, Outcome, Coverage regime | Enum/domain | Обычный Select | Поиск не нужен для короткого списка |
| Paint Line service | `project_line_services` + paint matrix + RAL | Select/autocomplete по размеру каталога | Loader уже возвращает rule/RAL/required DFT, не вводить заново вручную |
| Measured DFT | Фактическое измерение | Number + µm | Это не справочник и не required DFT из матрицы |
| Laydown/Tracking location | `project_locations` + category/occupancy | Autocomplete | Код + описание + capacity; контекст In/Out; не первый элемент по умолчанию |
| Tracking device | `project_devices` + assignments | Autocomplete | Не `tracking_device_usage`; read permission и назначение оператору |
| Event to compensate | История конкретного stable spool | Select/table | Время + direction + location + business identity; append-only correction |
| Flange category | `project_joint_categories` | Select/autocomplete | Code + definition + timing + reason |
| Torquing requirement | `system_reference_entries(kind=torquing_requirement)` | Select | Единица jointing value пока требует предметного контракта |
| Jointers | `project_teams(team_type=jointer)` | Searchable multi-select | Это команды с этим типом, а не автоматически registry людей/сварщиков |
| System/Subsystem | `project_systems`, `project_subsystems` | Зависимый autocomplete | Subsystem принадлежит выбранному System; эта связь уже есть в Builder |
| Service Class/Line Service pack | Project referentials | Select/autocomplete | Scope проекта; не вводить UUID; refs уже есть |
| Request Team | `project_teams` нужного team_type | Select/autocomplete | Line Check/finishing/blinding/reinstatement различать; явный выбор |
| ISO/Spool/Test Pack как рабочая цель | Scoped business catalogs/worklists | RecordSelectTable или autocomplete для короткой формы | Stable ID/revision ID различаются; ID из URL проверяется в scope |
| Punch code | `project_punch_codes` | Select/autocomplete | Уже подключён; не создавать новый Punch Code каталог |
| Punch description, correction reason | Описание факта пользователем | Text/Textarea | Подсказка и required semantics; не список случайных старых описаний |
| Test Pack Location | Сейчас `test_packs.location text` | Text с ясным смыслом; optional suggestions только после уточнения | Нет FK к project_locations. Не запрещать произвольную площадку без решения о контракте |
| NDE report / PWHT chart / W10P / flange report/tag | Номер внешнего документа/маркировки | Text + описание источника/валидация | Общего supporting document registry не обнаружено в этих формах |
| Dates, проценты, volume, pressure, weight | Событие/измерение/параметр | Date/Number с единицами | Не autocomplete; проверять интервалы, chronology и проектные единицы |
| Создание нового code/name/MRR/trace в master data | Новый справочный объект | Text | Здесь ручной ввод правилен; duplicate check и hints, а не запрет нового значения |
| WPS process / flange rating в setup | В текущем контракте text, не FK на отдельный каталог | Text/предложения после предметного уточнения | Не изобретать registry welding_process или flange_rating |
| Custom PDS field | `data_type` metadata | Text/Date/Number/Boolean | Рендерить и сохранять согласно metadata |
| Assembly default contractor | Legacy настройки исключённого блока | За рамками развития | Не включать в autocomplete rollout |

## 4. Что действительно взять из ROMS

Прочитаны `RHFAutocompleteWithAsyncOptions`, `ProjectAutocomplete`, `UserAutocomplete`, `RiskAutocomplete` и helper pagination в рабочем ROMS UI.

Подтверждённые полезные свойства:

- Отдельные display label и значение формы; сравнение option/value по идентичности, а не подписи.
- Async загрузка при открытии, loading, helperText/error, clear, поддержка single/multiple.
- `UserAutocomplete` связывает search input с запросом серверу.
- `RiskAutocomplete` имеет paging при прокрутке, дедупликацию добавляемых страниц и сохранение вариантов во время загрузки продолжения.

Это не единый совершенный reference implementation: `ProjectAutocomplete` загружает список при открытии, а не обязательно выполняет server search; разные компоненты имеют разные стратегии. Нельзя обещать, что копирование wrapper решит stale requests, RLS, выбранный объект вне страницы и incomplete datasets.

Для PipeQC нужно перенести **поведение**, адаптируя его к существующим Radix/Command/Input и guard. Отдельное добавление MUI или React Hook Form ради одного поля не требуется. Крупный каталог целей остаётся таблицей; autocomplete применяется прежде всего к reference inputs внутри формы.

## 5. Предлагаемый общий контракт выбора

Это эскиз для будущего плана, а не существующий API:

```ts
type ReferenceOption = {
  id: string
  code: string
  label: string
  secondary?: string
  status?: "active" | "inactive" | "archived"
  disabledReason?: string
}

type ReferencePage = {
  options: ReferenceOption[]
  nextCursor: string | null
}
```

1. **Идентичность:** committed ID/object и search text отдельны. Очистка строки поиска не должна менять accepted evidence. Для natural-key команды сериализовать именно согласованные поля выбранной записи.
2. **Контекст:** каждый domain loader знает project, target/revision, родителей выбора, дату, role/scope. Ключ кэша и актуальности включает эти параметры; смена контекста отменяет/игнорирует старый ответ.
3. **Поиск:** короткие гарантированно полные enum/local lists можно фильтровать локально; большие reference catalogs искать сервером с paging и stable ordering. Специальные символы query обрабатывать безопасно, без прямой сборки PostgREST filter из произвольного текста.
4. **Выбранное значение:** resolve по ID отдельно, если его нет на текущей странице. Исторический inactive объект виден в чтении, но не становится доступным для нового события без предметного основания.
5. **Допуск:** существующие SQL-команды остаются источником истины. Client фильтр предотвращает очевидный неверный выбор, но не заменяет authorization и command validation.
6. **Состояния:** loading, searching, ready, no matches, no eligible options, forbidden, failed, unavailable historical value различаются. «Нет совпадений» не значит «справочник пуст».
7. **Создание:** freeSolo запрещён для настоящей связи, если backend требует существующую запись. Для нового master-data code и номера внешнего документа ручной ввод остаётся разрешённым. «Добавить» показывается только роли с manage.
8. **Запись:** выбор не вызывает RPC. Сохранение выполняется отдельной командой с одним pending lock; ошибки сохраняют пользовательский черновик, успех очищает только записанные значения.
9. **Unsaved:** поиск не dirty; committed value/draft dirty. Использовать существующие `useRegisterUnsavedState`, `useRequestLeave`, `useMarkInputsRecorded`, учитывая portal и target transitions.
10. **Доступность:** label, role combobox/listbox, keyboard arrows/Enter/Escape, visible focus, no hover-only essential metadata, доступный clear, no silent selection on blur. Проверить поведение внутри Drawer/Dialog и длинные labels.

Отдельные wrappers: `MaterialTraceChoice`, `EligibleWpsChoice`, `EligibleWelderChoice`, `ProjectLocationChoice`, `AllowedTrackingDeviceChoice`, `ProjectTeamChoice`, `ProjectReferenceChoice`. Один визуальный primitive не должен заставлять все эти источники использовать одинаковые фильтры или права.

### Безопасная граница чтения

Operational lookup не должен требовать service-role key в браузере или глобального read-all. **В текущем каталоге прав project_editor/project_reader уже имеют reference-view; у этого capability нет требования функциональной роли.** Поэтому отсутствие `project_referential.view` в списке qc_engineer/erection_contributor не доказывает, что оператор не видит справочник: effective capability вычисляется из access role и отдельного functional gate. Начать с существующих RLS-запросов и проверки реального scope, а не с расширения полномочий.

Если конкретной разрешённой рабочей роли всё же недостаточно текущего read contract, возможны специально ограниченная read policy либо capability-gated read-only RPC с минимальными полями. Это отдельное обоснованное изменение, не обязательный компонент подключения autocomplete.

Проект для материала желательно выводить сервером из разрешённой spool revision, а не принимать пользовательский `projectId` как доверенное ограничение. Подрядчик/PDS scope сохраняется. Наращивание PERMISSIVE read-path не должно отменять narrowing checks: ограничения, предназначенные сужать доступ, остаются **RESTRICTIVE**, как требует AGENTS.md и миграция `20260817091000_pds_area_scope_restrictive_guard.sql`.

RLS и guards требуют проверки с ordinary browser role, а не только с site_admin/service_role. Для исторического evidence источник должен оставаться видимым разрешённому viewer без возможности менять master data.

## 6. Маршруты, которые нужно связать

| Откуда → куда | Контекст | Ожидаемый результат |
| --- | --- | --- |
| Field/Fabrication Material → PML | project + spool revision + BOM identity + return | Нужный PML catalog/filter, возврат к тому же draft; capability-aware |
| Weld Progress → WPS / qualification / material mapping | project + joint revision + subcontractor + date | Точная недостающая зависимость, а не главная страница Admin |
| QC Release / Erection RFT → NDE | project + spool revision + obligation/joint/method/cycle + return | Конкретная проблема выделена; нельзя записать другой cycle по fallback |
| Engineering → рабочие модули | accepted revision + spool/joint/flange identity | Тот же объект и действующие права; старые revisions только для чтения |
| Fabrication Laydown / Erection → Tracking | revision ID → разрешённый stable spool ID | Его местоположение/история, без повторного поиска |
| Tracking Exception → history/correction | stable spool + event ID | Понятная причина и точное компенсируемое событие |
| Flange ↔ Test Pack Reinstatement | project + flange revision + pack/request | Видны категория, timing и записанные связанные факты |
| Test Pack → readiness / upstream work | project + pack + spool revision + operation + return | Снять конкретный blocker и вернуться к тому же pack |
| Import issue → нужный reference | project + job + import type + offending code + return | Исправить справочник, затем повторно проверить импорт |

Расширить имеющийся context/link layer и проверку на получателе, а не заводить второй глобальный контекст. В текущем общем work context адресуются spool revision и Test Pack; obligation/event/flange требуют явных локальных параметров и resolution, а не помещения любого UUID в `spool`.

## 7. Порядок работ для следующих планов

### Первая очередь: материалы и доступ к operational references

Объединить M01–M05 и минимальную часть G01/G02/G03. Сначала устранить неоднозначность Ident/строки и регистр trace, затем подключать общий selector в обе фазы.

Результат: оператор видит допустимую PML-запись, источник MRR, ожидаемый trace и принятый trace; новая проверка требует осознанного подтверждения; принятые строки не предлагают невозможное изменение. Обычная рабочая роль видит минимально необходимые данные внутри своего scope.

Зависимости/границы: не seedить engineering в TRACK01; не менять текущие capabilities обходом; не выдумывать credential; не делать миграцию данных без списка affected rows/коллизий и отдельной реализации. Assembly не затрагивать.

### Вторая очередь: сварка и рабочие справочники

W01–W03, S05, T01–T02, F02–F03. Подключить eligible WPS/welders, жизненный цикл qualification, настоящий device source и осмысленный location choice. Маленькие enum оставить Select.

Результат: пользователь видит подходящие варианты и знает, почему остальных нет; новая запись справочника становится доступной после refresh; изменение parent/date не оставляет невалидный скрытый ID.

### Третья очередь: конкретная цель и сохранение контекста

N01/N04, F01, T03/T04, I01/I03, S04. Точные переходы blocker → работа → назад, target-bound drafts, актуальность асинхронных данных, semantic dirty protection.

Test Packs интегрировать с уже выполняемым планом `docs/superpowers/plans/2026-10-06-test-pack-workbench.md`; P01–P06 служат проверкой завершения и совместимости, а не новой параллельной реализацией.

### Четвёртая очередь: уточнение контрактов и доказательства

S01/S02/S03, I02, F04 и D01. Здесь часть работ требует read/schema/domain contract, а не только смены виджета. Supporting evidence registry — самостоятельная инициатива после доведения текущих связей; её объём не смешивать с первой очередью.

A01 — отдельно убрать ложное обещание Assembly из видимого UX в соответствии с принятым продуктовым scope; это не разработка Assembly и не разрешение удалять исторические данные.

## 8. Проверяемая приёмка

| Сценарий | Что должно быть подтверждено |
| --- | --- |
| PML содержит нужный trace для этого Ident | Вариант найден по trace/MRR; выбор сохраняет источник, запись только по Record |
| Такой trace есть у другого Ident/проекта | Не предлагается и не принимается server command |
| BOM задаёт ожидаемый trace | Несовместимые варианты не доступны; источник ожидания подписан |
| Только один допустимый trace | Не возникает записанного факта без подтверждения оператором |
| PML хранит mixed-case trace | Lookup/выбор/command используют согласованную идентичность; отказ не возникает из-за разной нормализации |
| Два BOM материала с одним Ident | UI, reconciliation, RPC и server counters согласованно отражают выбранную бизнес-единицу |
| Ранее принятый trace | Видим даже как historical evidence; обычное изменение запрещено и объяснено |
| Оператор без reference-manage | Рабочий выбор доступен по разрешённому read path, создание/редактирование каталога недоступно |
| Scoped подрядчик/PDS | Lookup и command не раскрывают/не принимают чужие данные |
| Есть refs, но нет eligible WPS | Причина отличается от «справочник пуст»; ведёт к нужному mapping/qualification |
| Дата сварки меняется | Expiry/approval eligibility перепроверяется именно на дату события |
| Выбраны WPS/root/cap, затем сменён subcontractor | Неподходящие значения сброшены/явно признаны невалидными; сохранение блокируется |
| Новый tracking device без usage | Появляется в допустимых вариантах независимо от статистики |
| Открыт Tracking event | Первое место из списка не становится незаметным выбором для записи |
| Быстро A → B, ответ A запаздывает | Форма, options и история остаются у B; команда A не получает draft B |
| Закрытие Drawer/Dialog, target change, clear context | Dirty бизнес-значение защищено; один search text не вызывает ложное предупреждение |
| RPC отказал | Draft сохранён, ошибка привязана к полю/причине; повторный submit не создаёт параллельную команду |
| >1000 reference rows | Поиск находит запись за первой API-страницей; выбранное значение не исчезает при другой query |
| Reference деактивировали между выбором и записью | Сервер отказывает предсказуемо; UI refresh объясняет причину и не заменяет выбор другим |
| Переход Material → PML → назад | Сохраняются project, spool revision, operation и draft/guard semantics |
| Report/chart/tag пусты | Нет автоматического `REPORT-T10`, `TAG-T10` или чужого прошлого значения |
| Keyboard внутри Erection Drawer | Найти, выбрать, очистить, закрыть без потери focus/непреднамеренного save |
| Старый deep link и сохранённая вкладка | Разрешённая цель восстановлена или показана unavailable; нет fallback к первой другой цели |
| Assembly исключён | Видимый UI не предлагает запуск/настройку неподдержанного рабочего сценария |

Не ограничивать приёмку проверкой наличия слова Autocomplete в JSX. Для lookup/RLS — contract tests и проверка разных ролей; для формы — meaningful component tests; для связи модулей — браузерный сценарий с реальными чтениями и безопасным режимом проверки команд. Стенд не сбрасывать ради визуального обхода.

## 9. Что уже сделано и не является новым пробелом

- Fabrication/Erection используют реальные BOM и material evidence, а не выдуманный каталог. Field Material имеет loading/error/retry и shared-record пояснение; To Site blocker ведёт к операции.
- Erection имеет workbench/операции и защиту основных команд. Задача не требует его очередной полной перестройки.
- В сварке уже есть подрядчик, WPS, Root/Cap selectors и domain gates. Требуются eligibility и labels, а не замена ручных UUID, которых там уже нет.
- NDE уже имеет таблицу obligations, фильтр по spool, allocation preview, real allocated count и ограничение Responsible Welder по шву. Эти функции не помечены отсутствующими.
- Builder уже имеет project System/Subsystem/Service Class/Line Service choices, dependent subsystem reset, pending save и composition confirmations. При заключительной сверке подключены URL-параметры и новые Definition/Composition editors; сообщение о создании больше не заявляет атомарность. Важно довести оставшихся потребителей и создание.
- Есть создание Location/Category, capacity editing; Material Type edit/archive; Punch Code creation/deactivation; PDA member/device selectors. Общий тезис «справочниками нельзя управлять» неверен.
- Есть outer-tab URL для Project Referentials, setup-readiness panel, safe return/context helpers и programmatic leave guard. Dirty registration и shell wrapping уже расширены; повторно создавать их не надо.
- Tracking occupancy view включает active locations с нулевым заполнением. Проблема T01 относится к source устройств, а не к отсутствию пустых мест в occupancy.

## 10. Источники и указатели для исполнителя

Номера строк — места чтения на момент исследования; при дальнейших изменениях искать названную функцию/компонент. Hash-снимок исходников рядом с CSV помогает заметить изменения. Источники являются текущим кодом/миграциями, не roadmap.

| Ref | Файл : строка / символ |
| --- | --- |
| S01 | `modules/construction/ui/erection/field-material-check-screen.tsx:113,139,155,280,365` |
| S02 | `modules/construction/ui/fabrication/material-check-screen.tsx:99,107,143,207,447` |
| S03 | `modules/construction/infrastructure/supabase-construction-repository.ts:340,353,589` — loadBillOfMaterials/loadMaterialCheckItems/loadLatestQc13Form |
| S04 | `supabase/migrations/20260810093000_erection_progress_commands.sql:141,165,215,227,235,241` — record_material_check / record_field_material_check |
| S05 | `supabase/migrations/20260727145210_project_settings_and_referentials.sql:350` — PML schema; `modules/imports/domain/import-type.ts:32` — PML import |
| S06 | `modules/project-setup/ui/welding-quality-tabs.tsx:84,890,1573` — local tabs/PML |
| S07 | `modules/project-setup/domain/welding-quality-reference.ts:289`; `modules/project-setup/infrastructure/supabase-welding-quality-reference-repository.ts:424` |
| S08 | `supabase/migrations/20260801091000_referential_invariants.sql:125,179,185`; `supabase/migrations/20260801095000_security_and_policy_cleanup.sql:139` |
| S09 | `supabase/migrations/20260731090000_access_capability_catalog.sql:62,87,114` — access/functional role_capabilities; `supabase/migrations/20260731091000_access_capability_security.sql:1` — effective capability calculation; `supabase/migrations/20260809092000_nde_repair_supersedes_parent.sql:187` — result capability |
| S10 | `supabase/migrations/20260803090000_engineering_entities.sql:150`; `modules/construction/domain/material-check.ts:35` — reconcileMaterialCheck |
| S11 | `modules/construction/application/record-material-check.ts:61` — toMaterialCheckPayload; `modules/construction/domain/material-check.ts:23` — normalizeTrace |
| S12 | `modules/construction/infrastructure/supabase-construction-repository.ts:156,171,395` — execution references and mappers |
| S13 | `modules/construction/ui/fabrication/weld-progress-screen.tsx:178,419`; `modules/construction/ui/erection/field-weld-progress-screen.tsx:195,464`; `modules/construction/domain/weld-progress.ts:21,120` |
| S14 | `supabase/migrations/20260804092100_record_weld_progress.sql:151,180,259` — WPS/material/qualification validation |
| S15 | `modules/project-setup/ui/welding-quality-tabs.tsx:290,697,1246` — qualification create/coverage |
| S16 | `modules/construction/ui/fabrication/qc-release-screen.tsx:96,594` — NDE links |
| S17 | `modules/quality/ui/nde-batch-screen.tsx:135,161,187,208,223,313,618` — reload/result/capabilities |
| S18 | `modules/construction/ui/erection/erection-rft-panel.tsx:33`; `components/pipeqc/workspace-model.ts:68` |
| S19 | `modules/quality/infrastructure/supabase-quality-repository.ts:290,329` — references and joint welder IDs |
| S20 | `modules/flange/ui/flange-management-screen.tsx:60,93,98,137,174` |
| S21 | `modules/flange/infrastructure/supabase-flange-repository.ts:70` — category/requirements/jointer options |
| S22 | `supabase/migrations/20260812092000_flange_progress_commands.sql:85,100,109`; `modules/flange/domain/flange-progress.ts:26` |
| S23 | `modules/tracking/ui/tracking-data-analysis-screen.tsx:67,87,91,115,147,149` |
| S24 | `modules/tracking/infrastructure/supabase-tracking-repository.ts:98,104,109`; `supabase/migrations/20260814093000_tracking_read_models.sql:177` |
| S25 | `supabase/migrations/20260814095200_tracking_active_occupancy.sql:1` |
| S26 | `components/pipeqc/workspace-model.ts:68,76`; `components/pipeqc/work-context.tsx` |
| S27 | `modules/pressure-test/ui/test-pack-explorer-screen.tsx:18,31,44`; `app/testpack/explorer/page.tsx` |
| S28 | `modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts:94,319,326`; `modules/pressure-test/ui/test-pack-workspace-loader.ts` |
| S29 | `modules/pressure-test/ui/test-pack-builder-screen.tsx:139,307,543,586` — Builder props/create/edit consumers; `modules/pressure-test/ui/test-pack-builder-model.ts:24,35`; `app/testpack/builder/page.tsx` |
| S30 | `modules/pressure-test/ui/request-preparation-screen.tsx:20,25,26,28` |
| S31 | `modules/pressure-test/ui/test-pack-definition-editor.tsx:132,136`; `supabase/migrations/20260813091000_test_pack_core.sql:19,25,109` |
| S32 | `modules/pressure-test/ui/pressure-test-progress-screen.tsx:29,30,33,34,38` |
| S33 | `modules/pressure-test/ui/pressure-test-home-screen.tsx:17` |
| S34 | `modules/project-setup/ui/execution-reference-tabs.tsx:211,779`; `modules/project-setup/domain/execution-reference.ts:166` |
| S35 | `modules/project-setup/ui/progress-weights-screen.tsx:242`; `modules/project-setup/domain/progress-weights.ts:23` |
| S36 | `modules/project-setup/ui/project-geography-tabs.tsx:937`; `modules/project-setup/infrastructure/supabase-project-geography-repository.ts:16,123`; `supabase/migrations/20260727145210_project_settings_and_referentials.sql:132` |
| S37 | `modules/project-setup/ui/project-referential-screen.tsx:35`; `modules/project-setup/ui/setup-readiness-panel.tsx:54`; nested reference tabs |
| S38 | `modules/engineering/ui/engineering-browser.tsx:24,28,47,115` |
| S39 | `modules/engineering/domain/diff.ts:5`; `modules/engineering/ui/revision-decision-table.tsx:59,90` |
| S40 | `modules/imports/ui/import-issue-list.tsx:29`; `modules/imports/ui/import-workbench.tsx:155` |
| S41 | `modules/imports/domain/import-type.ts:32,43,57,79,95` |
| S42 | `components/ui/command.tsx`; `components/ui/select.tsx`; `components/ui/data-table/record-select-table.tsx`; `components/pipeqc/page-finder.tsx:41` |
| S43 | `/Users/vvnezapnopwnz/Documents/Files/files/roms/ui/src/shared/ui/hook-form/RHFAutocompleteWithAsyncOptions.tsx`; `/Users/vvnezapnopwnz/Documents/Files/files/roms/ui/src/entities/roms/Projects/ui/ProjectAutocomplete.tsx`; `/Users/vvnezapnopwnz/Documents/Files/files/roms/ui/src/entities/User/ui/UserAutocomplete.tsx`; `/Users/vvnezapnopwnz/Documents/Files/files/roms/ui/src/entities/roms/RO/ui/RiskAutocomplete.tsx` |
| S44 | `supabase/config.toml:18` — max_rows; reference repositories; `modules/pressure-test/ui/test-pack-workspace-loader.ts:27` — new complete scoped read helper |
| S45 | `components/pipeqc/unsaved-input-guard.tsx:38,94,123,165`; `components/pipeqc/app-shell.tsx:42`; `components/pipeqc/work-context.tsx:113` |
| S46 | `modules/project-setup/ui/extended-reference-tabs.tsx:327`; `modules/project-setup/ui/progress-weights-screen.tsx:180`; `modules/project-setup/ui/project-geography-tabs.tsx:842` |
| S47 | `modules/documents/domain/report.ts:3,57`; `modules/construction/ui/fabrication/qc-release-screen.tsx:624`; `modules/construction/ui/fabrication/paint-laydown-screen.tsx:453` |

### Воспроизведённые чистыми функциями примеры

Использованы реальные `validatePipingMaterialRecordInput`, `toMaterialCheckPayload`, `reconcileMaterialCheck`, `validatePhaseWeights` через локальный tsx. Выдуманные идентификаторы/номера исключительно синтетические; ни одна команда БД не вызывалась.

```text
PML create validation: traceNumber = "Heat-ab12" → "Heat-ab12"
Material Check payload: traceNumber = "Heat-ab12" → "HEAT-AB12"

BOM: ID-1/H1 и ID-1/H2
Entry: ID-1/H1
reconcileMaterialCheck:
  lineTotal: 2
  checkedCount: 1
  isComplete: true
  outstanding: []

validatePhaseWeights("erection", [{activity: "UNKNOWN_AUDIT_ACTIVITY", weight: 100}], false):
  ok: true
```

Следующий отдельный план для исполнителя разумно ограничить первой очередью. Все 40 наблюдений не следует отдавать одним неделимым поручением: часть пересекается с текущим Test Pack plan, часть требует предметного решения, а основная первая задача имеет самостоятельную проверяемую приёмку.
