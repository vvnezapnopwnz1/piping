# Easy Piping: полная модель предметной области по документации

**Дата исследования:** 30 июля 2026
**Статус:** документация изучена; dossier готов как эталон для отдельного аудита реализации
**Главный источник:** Easy Piping User Manual, version 4.7.3, 156 страниц
**Важно:** в этом файле нет сравнения с текущим кодом PipeQC
**Исключено по просьбе владельца:** `docs/PROJECT_OVERVIEW.md`

---

## 1. Зачем нужен этот файл

Этот dossier фиксирует не отдельные экраны legacy-продукта, а его предметную модель:

- какие сущности существуют;
- как они связаны;
- какие справочники обязательны;
- какие статусы являются вводимыми, а какие вычисляются;
- что блокирует import или progress;
- как устроены revisions;
- как работает NDE sampling, tracer и penalty shoot;
- как spool проходит fabrication, tracking, erection и pressure test;
- как Test Pack связывает construction, line check, punch, flange и testing;
- какие роли и scope предполагает система;
- какие отчёты являются частью операционного процесса.

Файл предназначен для следующего отдельного шага: глубокого сравнения этой модели со схемой БД, архитектурой, кодом и интерфейсом PipeQC.

---

## 2. Источники и степень доверия

### 2.1. Первичный источник

[Easy Piping User Manual.pdf](../Easy%20Piping%20User%20Manual.pdf)

- 156 страниц;
- версия 4.7.3;
- титульная дата исходного документа относится к 2014 году;
- PDF модифицирован в 2023 году;
- содержит Setup, Spooling, Fabrication, Tracking, NDE, Erection, Test Pack, Flange и Reports;
- parsed text: [manual.md](../marker-output/manual.md).

Manual используется как главный источник бизнес-правил.

### 2.2. Оригинальные презентации в репозитории

| Источник | Объём | Что уточняет |
|---|---:|---|
| [Administration](../2.EasyPiping%20Administration_1511017.pptx) | 50 slides | роли, referentials, поздние additions Setup |
| [Preparation](../3.EasyPiping%20Preparation_1511017.pptx) | 13 slides | четыре preparation sections и четыре Spooling files |
| [Fabrication](../4.EasyPiping%20Fabrication%20_10032021.pptx) | 30 slides | forms, multi-welder, NDE batch concept и reports |
| [Spool Tracking](../5.EasyPiping%20Spool%20tracking_10032021.pptx) | 12 slides | dashboard, locations, inconsistencies, transit-out, PDA |

Все четыре презентации прочитаны напрямую из PPTX и выборочно проверены визуально после локального рендера.

### 2.3. Вторичные research-материалы

В [presentation_findings.md](presentation_findings.md) сведены результаты серии из десяти презентаций:

1. PSMS overview.
2. Administration.
3. Preparation.
4. Fabrication.
5. Spool Tracking.
6. Erection.
7. Test Pack.
8. SpoolingDB.
9. Assembly.
10. Painting.

Для decks 6-10 оригиналов в текущей папке нет, поэтому связанные с ними выводы в этом dossier помечены как **secondary presentation evidence**. Manual остаётся приоритетнее.

### 2.4. Правило разрешения расхождений

1. Manual — обязательная базовая семантика.
2. Оригинальная презентация — уточнение или более позднее расширение.
3. Secondary research — гипотеза высокой уверенности, пока нет оригинала.
4. Если источники расходятся, расхождение сохраняется как открытый design decision, а не молча сглаживается.

---

## 3. Суть Easy Piping

Easy Piping — не просто weld register и не набор QC-форм. Это project-scoped construction control system, соединяющая:

```text
Engineering / SpoolGen
          │
          ▼
ISO → spool → weld/support/flange definition
          │
          ├── material availability and traceability
          ├── fabrication progress
          ├── NDE / PWHT / rework
          ├── painting and laydown
          ├── physical spool tracking
          ├── assembly / erection
          ├── Test Pack and pressure testing
          └── reports and handover records
```

Основная ценность системы — в связях и derived gates:

- import нельзя завершить без обязательных referentials;
- weld progress порождает NDE obligations;
- NDE rejection порождает rework и tracers;
- spool QC release зависит от release всех joints;
- spool/ISO RFT зависит от construction и QC;
- Test Pack activities доступны только после predecessor gates;
- flange category задаёт момент выполнения относительно test/precommissioning;
- revisions не должны уничтожать или молча переносить progress.

---

## 4. Контекст внешних систем

По overview и presentation research Easy Piping находится после engineering/material systems:

```text
3D Model
  → SmartPlant / SpoolGen
      → spool definition files
      → material data from Marian / SmartPlant Material
          → Easy Piping
              → QC forms, progress, NDE, tracking, test packs, reports
```

Основные integrations:

| Внешний источник/consumer | Данные |
|---|---|
| SpoolGen | ISO, spool, weld, support, bolting definition |
| Marian / SP Mat | material availability и material records |
| PDA/Kalipso | physical location scans |
| Zebra/другое barcode ПО | печать barcode из exported spool list |
| Excel templates | bulk import/export progress и referentials |
| QC paper forms | фактическая полевая первичка, затем re-key в систему |

Это важно: Easy Piping не всегда является местом первичного ввода. Во многих процессах оно:

1. формирует request/form/template;
2. работа выполняется на площадке;
3. подписанная форма возвращается;
4. progress переносится в систему;
5. система проверяет referentials и пересчитывает downstream state.

---

## 5. Карта модулей

### 5.1. Основная последовательность

```text
Administration
   ↓
Preparation / Spooling
   ↓
Fabrication
   ↓
Painting / Laydown
   ↓
Tracking
   ↓
Assembly (если применимо)
   ↓
Erection
   ↓
Pressure Test / Test Pack
   ↓
Pre-commissioning / Reinstatement
```

NDE, Reports и Tracking являются transversal:

- NDE существует для shop, assembly и field joints;
- Reports собирают данные разных стадий;
- Tracking пересекает fabrication, paint, transport и erection;
- Administration задаёт правила для всех downstream modules.

### 5.2. Подробный состав

| Модуль | Подмодули |
|---|---|
| Administration | Project Definition, System Referential, Project Referential, Access Rights, Import Settings |
| Preparation | Spooling, Material/Marian, Browse, Test Pack Builder |
| Fabrication | Spool Fabrication, Welding, NDE, Painting |
| Spool Tracking | Dashboard, Data Analysis, Barcode Printing, Mobile Device Management, Sync |
| Erection | Spool Erection, Welding, NDE, Flange |
| Assembly | по secondary evidence: тот же shape, что Erection, на другой стадии |
| Pressure Test | Line Check, Item Clearance, Blinding, Testing/Precomm, Reinstatement |
| Test Pack | Builder/Import, Homepage, Explorer |
| Flange | Bolting Import, Revision/Browse, Progress Import/Input |
| Reports | Fabrication, Erection, NDE/Welder, Tracking dumps, Test Pack |

---

## 6. Роли и доступ

### 6.1. Native hierarchy

Administration presentation slide 4 задаёт ясную модель:

| Роль | Scope |
|---|---|
| System Admin | полный доступ ко всем функциям всех проектов |
| Project Admin | выбранный проект; нет create project и system referential |
| Site Admin | выбранный проект; аналогичное admin-ограничение |
| Project Editor | production data, без Administration |
| Subcontractor | только данные своего scope, без Administration |
| Project Reader | read-only, без Administration |

В Setup также фигурируют PDA Users с функцией `admin` или `user`.

### 6.2. Project-specific membership

Manual §4:

- user может иметь доступ к нескольким проектам;
- роль назначается отдельно для каждого проекта;
- роль можно изменить или удалить;
- access matrix не является глобальной ролью пользователя.

### 6.3. Subcontractor scope

Критическое правило:

- при роли Subcontractor выбирается один из subcontractors проекта;
- пользователь видит только данные, относящиеся к его PDS areas;
- во всех screens поле Subcontractor должно быть disabled;
- значение принудительно равно logged-in subcontractor.

Это не только UI affordance. Семантически система не должна позволять subcontractor читать или изменять данные чужого design area.

### 6.4. Особые административные права

- создать project может только System Admin;
- system referential изменяет только System Admin;
- удалить project может System Admin, находясь в другом project;
- NDE 100 rollback/unselect доступен ограниченным ролям: System Admin/Project Admin;
- offline PDA import/export доступен только System Admin/Project Admin.

---

## 7. Центральная иерархия данных

### 7.1. Основное дерево

```text
Project
└── Unit classification
    └── Area classification
        └── PDS / Design area
            └── Isometric (ISO)
                ├── Spool
                │   ├── Weld joint
                │   │   ├── Weld point(s)
                │   │   ├── NDE obligations
                │   │   ├── Examination(s)
                │   │   └── Rework R1/R2/R3...
                │   ├── Support
                │   ├── Flange joint
                │   └── Tracking history
                └── Revision history
```

Параллельная test hierarchy:

```text
System
└── Subsystem
    └── Test Pack
        ├── selected ISO/spools
        ├── Line Check
        ├── Punch items X/Y/Z
        ├── Flange joints
        ├── Blinding
        ├── Testing / Precomm
        └── Reinstatement
```

### 7.2. Identity и revision

Документация различает:

- логическую identity ISO/spool/joint;
- номер текущей revision;
- старую definition;
- новую definition;
- history предыдущих revisions;
- progress, который может или не может быть перенесён.

Следовательно, `revision` не является просто строкой на mutable row. Revision management — отдельный workflow.

### 7.3. Weld joint и weld points

Один physical joint может иметь:

- один weld point и одного welder;
- два и более weld points;
- разные welders по points;
- один общий WPS для points;
- распределение Root/Cap и при необходимости Heat/Fill.

Manual:

- Root + Cap обязательно равно 100;
- Heat + Fill может быть 0 или 100;
- для второго point требуется другой welder;
- WPS второго point наследуется и становится read-only;
- WPS/welder нельзя менять после NDE selection или examination.

---

## 8. Setup как dependency graph

Setup следует выполнять не в произвольном порядке.

### 8.1. Step 1

Можно определить независимо:

- subcontractors;
- service class/material type;
- weld types;
- rework codes;
- thickness;
- progress weights;
- area classification;
- WPS;
- PML;
- joint category;
- UT reference;
- jointers;
- pressure-test teams;
- systems;
- pressure unit;
- line service;
- location categories;
- devices;
- PDA users.

### 8.2. Step 2

Требуют predecessors:

| Настройка | Зависит от |
|---|---|
| NDE Matrix | service class + weld type + thickness/location context |
| PDS Area/Subcontractor | subcontractor + area classification |
| Welder Qualification | subcontractor + WPS |
| Subsystem | System |
| Location | Location Category |

### 8.3. До каких операций обязательно определить

| Referential | Нужен до |
|---|---|
| Weld Type | weld progress |
| Welder Qualification | weld progress |
| PML | weld/material trace progress |
| Joint Category | bolting progress |
| UT Reference | bolting progress |
| Jointer | bolting progress |
| Blinding Team | Test Pack progress |
| Finishing Team | Item Clearance |
| Reinstatement Team | Reinstatement |
| System/Subsystem | Test Pack assignment |
| Line Checker Team | Line Check |
| Pressure Unit | Test Pack creation |
| Line Service | Test Pack creation |

---

## 9. Project Definition

### 9.1. Поля проекта

- Activity Code, alphanumeric, пример `9833N`;
- Project Title;
- Owner;
- Contractor;
- Owner Logo;
- Contractor Logo;
- Maximum Transit Time, default 1 day.

Ограничения logos:

- `.bmp` или `.jpg`;
- меньше 200 KB.

Maximum Transit Time используется не декоративно: текущая дата сравнивается с последним tracking event, и spool, превысивший limit в transit, попадает в `Transit out`.

### 9.2. Custom progress columns

Project Definition задаёт progress schema:

- Spool Prefabrication;
- Spool Erection;
- Spool Weld Progress;
- PDS Area/Subcontractor;
- Spool Category Definition.

Для Prefabrication и Erection:

- можно добавить до трёх custom columns;
- значения являются dates;
- задаётся принадлежность к Fabrication или Painting;
- порядок можно менять;
- этот порядок используется в progress screens.

Для PDS Area:

- до трёх custom attributes;
- они появляются в PDS referential;
- используются как filters в reports.

Для Spool Category:

- до трёх custom attributes;
- обновляются bulk import;
- становятся filters в fabrication/erection reports.

### 9.3. Изменение и удаление

- project fields можно редактировать;
- custom columns можно добавить позднее;
- удаление custom column уничтожает все связанные значения;
- System Admin может удалить project только из другого active project;
- project deletion удаляет project referentials, ISO, spools, joints, batches, progress и examinations.

Последнее — legacy hard-delete behavior. При современной реализации его следует отдельно оценить с точки зрения compliance и archival requirements.

### 9.4. Assembly extension

Administration deck добавляет project-level `Assembly welds requirement`. Это позднее расширение, отсутствующее в основной форме Manual, но согласующееся с более поздним Assembly module.

---

## 10. System Referential

System Referential:

- cross-project;
- задаётся один раз для всей установки;
- редактируется только System Admin.

| Referential | Semantics | Mutability по источникам |
|---|---|---|
| Material Type | material categories | add/edit/delete, если не используется |
| Film Quantity per Diameter | films по diameter/thickness | static/reference |
| UT Calculation | diameter/rating coefficients | static/reference |
| Torquing Requirement/Method | tightening methods/values | system-level |

### 10.1. Material Type

- Code и Description обязательны;
- используется service classes, WPS и reports;
- нельзя удалить, если связан с service class;
- можно редактировать.

### 10.2. Film Quantity

- зависит от pipe diameter и thickness range;
- показывает ожидаемое число films;
- используется в RT progress/reporting;
- manual говорит, что reference static;
- фактическое число films можно скорректировать в RT progress.

### 10.3. UT coefficients

- `Coefficient Diameter`;
- `Coefficient Rating`;
- основаны на Technip standards;
- используются в dynamic flange UT.

### 10.4. Torquing

Administration deck называет это method list; manual связывает с jointing method/value. Нужна domain clarification:

- является ли value частью system referential;
- может ли project переопределять значения;
- как method связан с rating/diameter.

---

## 11. Project Referential

### 11.1. Полный каталог

| № | Referential | Ключевые поля | Использование |
|---:|---|---|---|
| 1 | Subcontractor | code, description | PDS, WPS, welder, reports |
| 2 | Progress Weight Factor | phase, activity, weight | weighted progress |
| 3 | Area Classification | code, description, unit | grouping/report filters |
| 4 | PDS Area/Subcontractor | design area, shop/assembly/field sub, class, AG/UG | scope and ownership |
| 5 | WPS | material, dia range, thickness range, subcontractor | weld validation |
| 6 | Welder Qualification | welder, subcontractor, WPS | weld validation |
| 7 | Service Class/Material | service class, material | import/NDE/WPS/reports |
| 8 | Weld Type | code, description, dia-inch factor | import/NDE/reports |
| 9 | NDE Matrix | service class, type, location, coverages, PWHT, trace | NDE allocation |
| 10 | Rework Code | code, description | weld progress |
| 11 | Thickness/Flange | class, dia, thickness, rating | import/flange |
| 12 | Project Piping Material List | MRR, ident, trace/heat | material trace |
| 13 | Joint Category | definition, timing, category, reason, coefficient | flange/test sequence |
| 14 | Unit of Time Reference | activity, project UT, standard | flange work volume |
| 15 | Jointer | code, description | flange progress/history |
| 16 | Blinding Team | code, description | blinding assignment |
| 17 | Finishing Team | code, description | item clearance |
| 18 | Reinstatement Team | code, description | Y/Z reinstatement |
| 19 | System | code, description | Test Pack hierarchy |
| 20 | Subsystem | code, description, system | Test Pack hierarchy |
| 21 | Line Checker Team | code, description | Line Check |
| 22 | Location Category | code, description | Tracking |
| 23 | Location | code, category, mapped statuses | Tracking consistency |
| 24 | Pressure Unit | one per project, bar/psi | Test Pack |
| 25 | Line Service | code, description | Test Pack and ISO mapping |
| 26 | Unit Classification | code, hierarchy | area/report grouping |

### 11.2. Additions из Administration deck

- Devices;
- PDA Users;
- Spooling Material Type;
- Spooling Piping Class ↔ Material Type;
- Spooling Checklist;
- RAL Code by fluid service;
- Paint Code Matrix;
- Assembly subcontractor mapping.

### 11.3. Referential deletion principle

Повторяющийся pattern:

- entry можно удалить, пока оно не используется;
- после использования delete запрещён;
- code/description часто можно редактировать;
- duplicate codes запрещены;
- downstream screens используют dropdown, а не свободный text.

При современной модели это ближе к `inactive/archive`, чем к physical delete.

### 11.4. Progress weights

Phases:

- Prefabrication;
- Painting;
- Erection.

Для каждой phase:

- activities имеют weights;
- сумма должна быть 100;
- report может показать phase или overall progress;
- изменение weights ретроспективно меняет результаты reports;
- документация предупреждает о расхождениях reports до/после изменения.

Это означает, что для воспроизводимости нужен либо versioned calculation basis, либо явное признание, что legacy reports пересчитываются на текущих weights.

### 11.5. PDS area

Базовый Manual:

- Shop Subcontractor;
- Field Subcontractor;
- Area Classification;
- AG/UG;
- Unit/Rack;
- custom attributes.

Administration deck:

- добавляет Assembly Subcontractor.

Subcontractor обычно назначается design-area-wise, но Browse Latest разрешает override на ISO level.

### 11.6. WPS

Обязательные dimensions:

- Material Type;
- Diameter From/To;
- Thickness From/To;
- Subcontractor;
- WPS number/code.

Rules:

- все поля mandatory;
- ranges numeric;
- `to >= from`;
- во время spooling import отсутствие covering WPS вызывает warning;
- import при этом может продолжиться.

WPS — диапазонный qualification rule, а не простой список codes.

### 11.7. Welder Qualification

- welder code/name;
- subcontractor;
- один или несколько WPS;
- запись нельзя удалить после появления progress;
- используется в dropdown progress;
- создаётся только после WPS.

Later presentation evidence также предполагает validity/expiry и более богатый qualification scope, но Manual явно фиксирует прежде всего связь welder ↔ subcontractor ↔ WPS.

### 11.8. Service Class и Weld Type

Service Class:

- поступает из spooling data;
- связан с Material Type;
- не удаляется после определения;
- участвует в WPS, NDE, thickness и reports.

Weld Type:

- code из SpoolGen;
- description;
- Dia Inch Factor yes/no;
- factor определяет включение joint в dia-inch report metrics.

### 11.9. NDE Matrix

Dimension key:

```text
Service/Piping Class
× Weld Type
× Weld Location (shop / assembly / field)
```

Values:

- RT %;
- UT %;
- MT %;
- PT %;
- PMI %;
- HT %;
- PWHT required yes/no;
- PWHT thickness threshold;
- Material Traceability required yes/no.

Behavior:

- missing combination blocks spooling import;
- spot percentage используется при weld progress для batch allocation;
- 100% requirement создаёт NDE100 obligation уже при import;
- matrix импортируется template-wise.

### 11.10. Thickness и Flange Rating

Fields:

- Service Class;
- Dia Inch;
- Thickness;
- Flange Rating.

Rules:

- все mandatory;
- numeric;
- для одной `service class + diameter` thickness должен быть уникальным;
- для `service class + diameter + thickness` одна flange rating entry;
- отсутствие thickness блокирует spooling import;
- отсутствие rating блокирует bolting import.

### 11.11. PML

Fields:

- MRR number;
- Ident code;
- Trace number: heat number или file number.

PML используется для проверки:

- существует ли heat/trace;
- соответствует ли он ident code;
- можно ли принять material traceability entry.

Источник может быть SP Mat.

### 11.12. Joint Category

Joint Category связывает flange с pressure-test sequence.

Fields:

- Joint Definition;
- Timing;
- Category;
- Reason;
- Coefficient Category.

Типовые semantics:

| Категория | Timing |
|---|---|
| X | до Pressure Test |
| Y | после test, до precommissioning |
| Z | после precommissioning |

Manual допускает project-specific codes вместо X/Y/Z, но далее pressure-test workflow использует X/Y/Z как канонические.

### 11.13. Unit Time

```text
UT =
  Reference Point Quantity
  × Diameter Coefficient
  × Rating Coefficient
  × Category/Punch Coefficient
```

Если punch/category coefficient не определён, UT должен быть null, а не zero.

### 11.14. Teams

Teams — отдельные referentials, потому что workload dispatch является частью процесса:

- Line Checker;
- Finishing;
- Blinding;
- Reinstatement;
- Jointer как индивидуальный execution actor.

---

## 12. Общая семантика imports

### 12.1. Универсальный flow

```text
Generate/download template
  → user fills or selects source file
  → upload
  → preview
  → validate referentials/formats
  → red errors block
  → yellow conflicts require confirmation
  → explicit apply
  → database overwrite/import
```

### 12.2. Ошибки и конфликты

- invalid values отображаются красным;
- import не выполняется, пока ошибки не исправлены;
- конфликт с DB отображается жёлтым;
- Excel value обычно supersedes DB value;
- overwrite требует подтверждения;
- пользователь может export validation result.

### 12.3. Import Settings

Manual и Administration deck перечисляют:

- Weld Thickness/Flange;
- NDE Matrix;
- Project Piping Material List;
- Spooling Images ZIP, max 4 MB;
- Spooling Material Type;
- Spooling Class Material.

### 12.4. Progress imports

Поддерживаются:

- Prefabrication progress;
- Erection progress;
- Weld progress;
- Spool Definition Category.

Rules:

- template сначала генерируется из системы;
- dates имеют заданный format;
- spreadsheet values supersede DB после confirmation;
- progressed/NDE-selected joints имеют ограничения на изменение;
- errors должны быть исправлены до apply;
- результат можно смотреть на screen или в Excel.

### 12.5. Atomicity как вытекающее требование

Manual не использует слово «transaction», но workflow требует:

- либо применить validated set целиком;
- либо не применять ничего;
- revision conflicts должны быть разрешены до завершения;
- пользователь может отменить entire import.

---

## 13. Preparation

Preparation presentation делит модуль на:

1. Spooling.
2. Material.
3. Browse.
4. Test Pack Builder.

### 13.1. Spooling files

Когда automatic integration со SpoolGen отсутствует, загружаются:

| Файл | Содержимое |
|---|---|
| `weld.txt` | ISO/spool/weld structure |
| `trace.txt` | ident codes/material trace |
| `bolt.txt` | flange/bolting joints |
| `supp.txt` | supports |

Presentation явно требует четыре tabs.

Manual старее и описывает три основных tabs плюс Marian; это source evolution, а не повод игнорировать `supp.txt`.

### 13.2. Material/Marian

Material file содержит:

- run metadata;
- unit/area/line/sheet;
- ISO/spool;
- issue status;
- weight;
- completion status/date.

Смысл статусов:

- materials already issued/reserved;
- currently complete;
- incomplete;
- date availability определяется материалами с максимальным сроком.

Material availability влияет на fabrication preparation и reports.

### 13.3. Browse

Browse — operational explorer:

- Latest;
- History;
- Manual Revision Management;
- flange data;
- ISO → spool → weld navigation;
- search/filter;
- ограниченное редактирование по rights.

Это не обычная таблица; Browse является местом:

- просмотра definition;
- корректировки project assignments;
- истории revisions;
- ручного revision workflow.

### 13.4. Test Pack Builder

- create/modify Test Pack вручную;
- import из Excel template;
- выбрать System/Subsystem;
- выбрать ISO/spools;
- summary выбранного contents;
- link line service, pressure, location, priority и test parameters.

---

## 14. Spooling import

### 14.1. Base validation

`weldsumm`/spooling data проверяется на:

- существование PDS Area;
- Service Class;
- Weld Type;
- Thickness по class + diameter;
- NDE Matrix по class + location + weld type;
- covering WPS;
- единый pipeline number внутри ISO;
- единый service class внутри ISO.

### 14.2. Severity

| Validation | Severity |
|---|---|
| PDS missing | blocker |
| Service Class missing | blocker |
| Weld Type missing | blocker |
| Thickness missing | blocker |
| NDE Matrix combination missing | blocker |
| WPS coverage missing | warning, import may proceed |
| mixed pipeline/service class in ISO | alert; требует resolution |

### 14.3. Size

Manual §6.1: import file не должен превышать 4 MB.

### 14.4. New vs revised ISO

- если previous revision нет — import straightforward;
- если previous revision есть — запускается Revision Management;
- пользователь может cancel entire import;
- все conflicts по ISO должны быть resolved до завершения.

---

## 15. Revision Management

### 15.1. Импортная revision

Wizard сравнивает:

- old definition и progress сверху;
- new definition снизу;
- prefabrication и erection progress;
- при Rework — weld-level changes.

### 15.2. Spool decisions

| Decision | Semantics | Weld review |
|---|---|---|
| Not Done | progress нет; новая версия остаётся пустой | нет |
| Cancelled | spool исключён из новой revision | нет |
| Done without Modification | definition не изменилась; progress копируется | нет |
| Rework | fabricated/started spool изменился; часть progress переносится | да |

Для Rework:

- копируются Fabrication Start, Sent to Paint и Paint;
- spool revision меняется на new ISO revision;
- пользователь обязан проверить welds по одному.

### 15.3. Weld decisions

Для weld внутри Rework:

- Not Done;
- Cancelled;
- Done without Modification;
- modified/rework semantics по wizard.

Если пользователь меняет weld definition, spool автоматически считается Rework.

### 15.4. Completion

- conflict resolution status хранится для каждого ISO;
- import нельзя завершить, пока все ISO не resolved;
- после success новые revision numbers назначаются affected spools;
- history предыдущих revisions остаётся browseable.

### 15.5. Manual revision

- тот же semantic workflow без нового `.txt`;
- ISO находится search;
- new revision number вводится вручную;
- duplicate revision number запрещён;
- comments могут быть recorded;
- old revision уходит в Browse History.

### 15.6. Derived design requirements

Из источника прямо следуют:

- immutable old revision;
- explicit old→new mapping;
- decision per spool/weld;
- controlled progress copying;
- ability to cancel operation;
- history with user/date/comment;
- protection progressed objects.

---

## 16. Fabrication

### 16.1. Структура

Fabrication:

- Spool Fabrication;
- Welding;
- NDE;
- Painting.

Каждая activity концептуально имеет Preparation и Progress. Fabrication presentation честно уточняет: из preparation screens реально была доступна только NDE Preparation; остальные могли оставаться legacy gaps.

Для modern reproduction надо отделять:

- domain requirement;
- реально существовавший legacy screen.

### 16.2. Spool stages

Каноническая последовательность:

```text
Start Fab
  → Material Check
  → Fabricated
  → QC Release
  → Sent to Paint
  → Painted
  → Final QC
  → Laydown
```

Project может добавить до трёх date-based custom stages.

### 16.3. QC-13 form loop

1. Record Start Fab.
2. Generate unique QC-13 daily progress form.
3. Workers/foreman record material trace and welding.
4. Signed form возвращается.
5. Данные вводятся в Easy Piping.
6. После dimensional/signature spool становится Fabricated.

Form может быть generated:

- для одного ISO/spool через search;
- bulk через Excel, до 50 spools.

### 16.4. Material Check

- heat numbers вводятся из QC-13;
- проверяются по PML;
- invalid heat не принимается;
- после корректного material trace spool Material Check обновляется автоматически.

То есть Material Check по смыслу derived from validated heat records, а не независимая произвольная дата.

### 16.5. Shop Weld Progress

Scope: только shop joints.

Fields:

- Cutting Date;
- Beveling Date;
- Fit-up Date;
- Preheat Date;
- Weld Date;
- DWIR/QC form number;
- Subcontractor read-only;
- Rework Code;
- Weld Point No.;
- WPS No.;
- Welder Code;
- Root/Cap;
- Heat/Fill.

Rules:

- welder существует в project referential;
- welder qualified for WPS;
- WPS подходит material/dia/thickness/subcontractor;
- multi-welder joint поддерживается;
- Root + Cap = 100;
- Heat + Fill = 0 или 100;
- после NDE selection/examination WPS и Welder менять нельзя.

### 16.6. Fabricated

Spool получает status после:

- dimensional check;
- validation всей информации;
- signatures responsible persons.

### 16.7. QC Release

Manual формулирует жёстко:

> QC Release обновляется только когда все joints spool имеют completed NDE.

Fabrication presentation добавляет:

- batch acceptance releases all corresponding joints;
- spool QC released, когда all joints имеют released status.

Для PWHT-required joints release также должен учитывать PWHT, что явно подтверждено Test Pack Explorer.

### 16.8. Painting

- Sent to Paint после QC declaration и signed W10P;
- Painted/Final QC/Laydown вводятся после painting activities;
- secondary Painting deck говорит, что DFT фиксируется через W10P, а не отдельным сложным workflow;
- Paint Matrix и RAL codes задаются referentials.

---

## 17. Progress Import

### 17.1. Template-first

Пользователь:

1. генерирует template;
2. выбирает нужные filters/PDS;
3. заполняет даты;
4. импортирует;
5. исправляет red errors;
6. подтверждает yellow overwrites.

### 17.2. Date rules

Для fabrication/flange progress часто используется `dd-MMM-yyyy`; для Test Pack import Manual отдельно указывает `dd-MM-yyyy`.

Нельзя вводить единый format без уточнения конкретного import contract.

### 17.3. Locked weld fields

Если joint:

- already welded;
- selected for NDE;
- examined;

определённые fields нельзя менять через import.

---

## 18. Spool Tracking

### 18.1. Purpose

- locate project spools;
- хранить location history;
- показывать spool image;
- находить status/location inconsistencies;
- анализировать scan data;
- учитывать location capacity;
- готовить barcode list;
- управлять PDA;
- выполнять online/offline sync.

### 18.2. Tracking event

Минимальные facts:

- spool/barcode;
- location;
- scan direction IN/OUT;
- timestamp;
- device/user;
- source: PDA/manual/import;
- history.

Manual relocation создаёт новый record, а не переписывает старый.

### 18.3. Active spool

Для PDA export:

```text
Start Fab date is not null
AND Erection date is null
```

Spool до fabrication и spool после erection не являются active.

### 18.4. Current location

Current location выводится из последних scan events.

Data Analysis показывает:

- ISO/spool/barcode;
- location;
- duration;
- history;
- material/WBU description;
- image;
- inconsistency flag.

Erected spools обычно исключаются из location/design-area lists.

### 18.5. Inconsistency

Inconsistency возникает, когда:

- progress status не соответствует location;
- пример: Painted spool всё ещё в Fab Shop;
- после erection появляется поздний location scan.

Location referential имеет `Mapped Progress Columns`, то есть consistency rule data-driven.

### 18.6. Transit out

Spool:

- scanned OUT;
- не scanned IN в другую location;
- находится вне location дольше Maximum Transit Time.

Tracking presentation приводит пример двух дней; Project Definition задаёт configurable limit. Project parameter должен иметь приоритет.

### 18.7. Capacity

Location имеет capacity, dashboard показывает:

- current quantity;
- capacity usage;
- распределение после fabrication/painting.

Документация не говорит однозначно, блокирует ли превышение capacity scan. Это открытый вопрос.

### 18.8. Barcode

Easy Piping экспортирует Excel spool basket. Физическая печать выполняется другим ПО, пример — Zebra.

### 18.9. PDA

Referentials:

- device number;
- connectivity;
- optional image;
- PDA user;
- credentials;
- function admin/user.

Usage analysis:

- кто чаще использует device;
- где device чаще используется;
- sync trends.

### 18.10. Sync

Online:

- PDA внутри Technip network;
- direct database sync.

Offline:

1. PDA генерирует `.txt`;
2. user переносит файл на компьютер;
3. Easy Piping preview/validates;
4. inconsistencies исправляются;
5. data imports;
6. обратно на PDA экспортируются:
   - Active Spool List;
   - Sub Locations;
   - PDA Users.

Manual допускает Excel import для manual tracking без PDA.

---

## 19. NDE Management

### 19.1. Основные функции

- автоматическое batch allocation;
- выбор joints;
- NDE100;
- issue examination request/program;
- result progress;
- client examination;
- rework;
- tracer/penalty shoot;
- dashboards;
- quality/welder reports.

### 19.2. NDE category

Category определяется combination:

```text
NDE method/rule
× service class
× weld type
× weld location
× required percentage
```

Batch:

```text
one welder
× one NDE category
```

### 19.3. Batch size

Manual:

- 10%: один выбранный weld из десяти;
- 20%: два выбранных welds из десяти;
- wording также упоминает batch size 10 или 20 в зависимости от rate;
- точная general formula для 5% требует domain clarification.

### 19.4. Автоматическое создание

При записи weld progress:

1. система читает NDE Matrix;
2. определяет category/rate;
3. ищет open batch того же welder/category/location;
4. если capacity есть — добавляет weld;
5. иначе создаёт новый batch;
6. initial joint status `S`;
7. batch status `Joint to Select`.

### 19.5. Batch statuses

| Status | Color | Meaning |
|---|---|---|
| Joint to Select | red | selection ещё не завершён |
| Awaiting NDE | orange | selected joints ожидают examination/result |
| Released | green | obligation закрыта |

### 19.6. Joint statuses

| Code | Meaning |
|---|---|
| `S` | candidate, joint to select |
| `SS` | selected and awaiting examination |
| `NR` | оставшийся joint после release; Manual text неоднозначен |
| `?` | selection completed / unavailable candidate |
| `H` | mandatory 100% joint, not selected |
| `HS` | mandatory 100% selected/awaiting |
| `T1`, `T2` | first-level tracer candidates |
| `T1S`, `T2S` | selected first-level tracers |
| `T1-1`, `T1-2`... | second-level tracer candidates |
| `T1-1S`, ... | selected second-level tracers |

`NR` в Manual расшифрован неудачно: после accepted selected joint остальные получают NR, хотя физически не examined. Вероятный смысл — `Not Required`/released by batch. Это необходимо подтвердить у SME.

### 19.7. Normal accepted path

```text
Batch S...
  → select SS
  → issue examination request
  → Accepted
  → selected joint result recorded
  → remaining joints NR
  → batch Released
```

### 19.8. Rejection

Для rejected examined joint:

- result `R`;
- defect code;
- defect location;
- автоматически создаётся repaired joint с suffix `R1`;
- при повторном rejection: `R2`, `R3`, `R4`...;
- каждый repaired joint попадает в mandatory NDE100 для соответствующего method.

### 19.9. Tracers

После rejection:

1. другие candidates получают tracer states;
2. Easy Piping предлагает два tracers;
3. пользователь может принять suggestion или выбрать другие в batch;
4. первый selected → `T1S`;
5. второй selected → `T2S`;
6. если tracer rejected, для него выбираются ещё два second-level tracers.

### 19.10. Penalty shoot / 100% escalation

Весь batch становится 100% selected (`SS`), если:

- rejected weld points в batch стало 4 или больше; или
- rejected любой second-level tracer.

После escalation:

- все remaining welds automatically selected;
- новые welds, добавленные в batch, тоже получают `SS`;
- batch status `Awaiting NDE`.

### 19.11. Candidate restrictions

Нельзя выбрать:

- weld, rejected в другом batch;
- weld, sibling которого rejected;
- related weld, если связанный weld rejected.

Sibling relation в источнике показана icon, но точная data semantics требует уточнения.

### 19.12. NDE100

Используется для:

- 100% requirement из NDE Matrix;
- repaired R1/R2/R3;
- escalated batch;
- RT/MT/PWHT и других categories.

Limited admins могут rollback erroneous selection/progress.

### 19.13. Examination request

- selected joints группируются по NDE category;
- создаётся numbered request/report;
- request печатается и передаётся исполнителю;
- result позже вводится в Examination Progress.

### 19.14. Client Examination

Отдельный progress path:

- client может потребовать examination сверх обычного selection;
- joint marked as client request;
- result recorded отдельно;
- это не то же самое, что client witness Test Pack.

### 19.15. QC Release

Chain:

```text
NDE selected/examined
  → batch/joint released
  → all spool joints released
  → spool QC Release
  → all ISO joints NDE/PWHT released
  → ISO QC Released for Test
```

---

## 20. Erection

### 20.1. Structure

- Spool Erection;
- Welding;
- NDE;
- Flange.

Концептуально каждая activity имеет Preparation и Progress, но secondary Erection deck отмечает, что в legacy product только NDE Preparation была реально построена.

### 20.2. Spool-level stages

```text
To Site
  → Erected
  → Welded/Bolted
  → Supported
  → RFT
```

Project может добавлять custom date stages.

### 20.3. W-24/W-23 form loop

- W-24 — daily spool/field joint progress;
- создаётся через search или bulk Excel, до 50 spools;
- содержит material trace и welding;
- To Site/Erected/Welded-Bolted обновляются по signed field forms;
- Supported связывается с W-23 в Manual;
- form можно reprint с current values.

### 20.4. Field Material Check

По аналогии Fabrication:

- foreman записывает heat numbers;
- система валидирует PML;
- material check derived after valid records.

В Manual есть copy-paste ссылка на QC-13, хотя Erection использует W-24. Это редакционная ошибка документа.

### 20.5. Field Weld Progress

Scope: только field joints.

Fields и multi-welder rules те же, что shop welding:

- cutting/beveling/fit-up/preheat/weld;
- form number;
- rework;
- weld points;
- WPS/welder;
- Root/Cap;
- Heat/Fill;
- post-NDE lock.

### 20.6. RFT

Manual: automatic, когда completed all predecessor steps.

Secondary Erection deck уточняет:

```text
Welded/Bolted
AND Supported
AND all joint NDE/PWHT released
→ spool RFT
```

Это derived status, не ручное поле.

---

## 21. Assembly

**Secondary presentation evidence.**

Assembly:

- pre-erection joining of spools into larger assemblies;
- выполняется shop/yard для modular construction;
- имеет ту же структуру, что Erection:
  - Spool Erection;
  - Welding;
  - NDE;
  - Flange;
- работает с тем же spool record;
- отличается stage/scope и downstream meaning.

Канонический design implication:

```text
Construction Stage = Assembly | Erection
```

Но решение «сделать один parameterized module» является современной интерпретацией research, а не буквальной формой legacy UI.

Открытые вопросы:

- как Assembly участвует в Test Pack RFT;
- отдельная ли NDE matrix location;
- какие projects отключают Assembly;
- как mapped PDS subcontractor наследуется на ISO.

---

## 22. Test Pack Management

### 22.1. Назначение

Test Pack объединяет:

- selected ISO/spools;
- construction readiness;
- line check;
- punch items;
- flange joints;
- blinding;
- pressure testing;
- precommissioning;
- reinstatement;
- handover reports.

### 22.2. General fields

- System;
- Subsystem;
- Test Pack number;
- Location;
- Revision, auto-generated;
- Planned Test Date;
- Priority;
- Test Medium;
- Test Pressure;
- Pressure Unit;
- Unit of Time;
- Volume;
- Line Service.

### 22.3. Builder

- manual creation;
- edit at any stage;
- ISO/spool selection;
- hierarchy filters;
- Excel import;
- template generation.

### 22.4. Test Pack import

Rules:

- ISO/spool must exist in Easy Piping;
- invalid objects rejected;
- dates `dd-MM-yyyy`;
- additional spools to existing Test Pack may require manual add;
- Excel conflicts require confirmation;
- errors block import.

### 22.5. Ownership nuance

Explorer explicitly говорит:

> ISO-level Test Pack status рассчитывается по spools, которые реально входят в выбранный Test Pack, а не просто по всей ISO.

Следовательно, одна ISO может быть split между Test Packs или по крайней мере расчёт не должен blindly включать все её spools.

---

## 23. Pressure Test workflow

### 23.1. Activities

| Activity | Preparation | Progress | Level |
|---|:---:|:---:|---|
| Line Check | yes | yes | Test Pack / ISO |
| Item Clearance | yes | yes | Test Pack / ISO / punch |
| Blinding | yes | yes | Test Pack |
| Testing & Precommissioning | no | yes | Test Pack |
| Reinstatement | yes | yes | flange joint |

Easy Piping не управляет preparation самого pressure test. Оно только записывает dates.

### 23.2. Line Check eligibility

ISO/Test Pack появляется для assignment, когда:

- spools Supported;
- weld joints Welded.

Line checker выбирается из referential.

Результат preparation:

- assignment;
- generated checking request;
- list ISO/Test Packs.

### 23.3. Line Check Progress

Fields:

- automatic item number;
- checking date;
- punch category X/Y/Z;
- location: ISO/spool;
- punch code;
- description;
- originator.

Line Check Completed Date mandatory before next step.

### 23.4. Item Clearance

Preparation:

- assign Finish Team;
- ISO/Test Pack level;
- generated clearance request.

Progress:

- clearance date;
- cleared by team.

Line Check completion remains predecessor.

### 23.5. Blinding

Preparation filters включают Date RFT. Это подтверждает порядок:

```text
RFT
  → Blinding assignment
  → Blinding progress
```

Progress:

- Blinding Date.

### 23.6. Testing and Precommissioning

Easy Piping records:

- Testing Start Date;
- Testing Done Date;
- Pre-commissioning Date.

Эти dates управляют eligibility flange categories:

- Y after testing and before precommissioning;
- Z after precommissioning.

### 23.7. Reinstatement

Preparation:

- select eligible flange joints;
- select team;
- generate request.

Eligibility:

- category Y только для tested Test Pack;
- category Z только для precommissioned Test Pack.

Progress:

- Joint Date;
- Report Number;
- Jointer;
- Tag Number.

---

## 24. Ready For Test и release logic

### 24.1. ISO Complete

Manual Explorer:

```text
all spools Supported
AND all spool joints Welded/Bolted
```

### 24.2. ISO QC Released

```text
all welded joints NDE released
AND all required PWHT released
```

### 24.3. ISO Ready For Test

Каноническая formula:

```text
ISO QC Released
AND ISO Complete
AND Line Check Done
AND all Category X items Cleared
→ ISO Ready For Test
```

### 24.4. Test Pack Ready

Test Pack Release Tracking показывает backlog:

- joints still to weld;
- flange joints still to bolt;
- joints awaiting NDE;
- ISO not complete;
- ISO not returned from Line Check;
- open X items;
- ISO not QC released;
- ISO not RFT.

Test Pack RFT следует из readiness входящих ISO/spools и gates, а не из manual toggle.

### 24.5. Что не входит в RFT

Blinding не является prerequisite RFT. Оно начинается после RFT.

Testing/Precomm также downstream.

---

## 25. Test Pack Homepage и Explorer

### 25.1. Homepage

Для activities показывает:

- Ready: eligible, ещё не assigned;
- Ongoing: assigned, ещё не completed;
- quantities на Test Pack/ISO/flange levels;
- curves и backlogs;
- global filters;
- print;
- link в Explorer.

### 25.2. Explorer hierarchy

```text
System / Subsystem
  → Test Pack
      → Isometric
          → Spool
```

### 25.3. Test Pack-level tabs

| Tab | Content |
|---|---|
| General | definition и planning |
| Release Tracking | readiness/backlogs |
| Operation Management | blinding/testing/reinstatement dates |
| Progress Status | Construction/Line Check/Testing/Reinstatement % |

### 25.4. ISO-level tabs

- Spool Status:
  - numeric status code;
  - tooltip;
  - red/orange/green;
  - status каждого spool.
- Isometric Status:
  - complete date;
  - line check assignment/return;
  - open X;
  - weld/flange/NDE backlog;
  - QC Release date;
  - RFT date.

### 25.5. Spool level

- detailed current status;
- RAG;
- sibling navigation;
- breadcrumb-like return to upper level.

### 25.6. Drill-down

Release backlog numbers clickable:

- ISO to send → Line Check Preparation;
- ISO to return → Line Check Progress;
- X items → Item Clearance Preparation;
- worklist export.

Explorer — operational control center, а не read-only report.

---

## 26. Flange Management

### 26.1. Purpose

- bolt torquing/tensioning;
- work quantities;
- timing relative to test/precomm;
- gasket/joint requirements;
- tightening method/value;
- execution traceability;
- resource forecasting through UT;
- torquing program;
- backlog/history reports;
- Test Pack handover records.

### 26.2. Bolting import

Flow:

- strict agreed template;
- preview;
- validation;
- user confirmation;
- import.

Rules:

- related spool/revision must exist;
- fractional diameter such as `2.1/2` преобразуется в `2.5`;
- BT No starts with `BT`;
- Bolt No minimum three characters;
- duplicate BT/Bolt No prohibited;
- diameter/quantity numeric;
- rating must exist for diameter;
- missing spool data prompts prerequisite import.

### 26.3. Flange revision

Есть manual revision без revised bolting file.

Default decision:

- Done without Modification.

Также:

- Not Done;
- Cancelled;
- copied progress when unchanged;
- new ISO revision required;
- duplicate revision prohibited;
- history preserved.

### 26.4. Browse Flange

Hierarchy:

```text
ISO
  → flange joints
```

Filters:

- PDS Area;
- Line;
- ISO;
- Priority;
- Type;
- Service Class;
- Subcontractor;
- Area Classification.

Manual add supports more than one flange joint per ISO.

### 26.5. Progress template

Read-only definition:

- Test Pack;
- ISO;
- Revision;
- Sheet;
- BT No;
- Diameter;
- Bolt size/ident/qty/length;
- dynamic UT.

Editable/configured:

- Rating;
- Jointing Method;
- Jointing Value;
- Joint Period;
- Category;
- Reason;
- Joint Date;
- Report Number;
- Jointer;
- Tag Number.

### 26.6. Multiple jointers

Если один jointer — progress вводится inline.

Если два или больше:

- отдельный popup;
- несколько progress rows;
- одна flange identity, несколько execution records.

### 26.7. Revision mismatch gate

При открытии erection flange progress:

- spool revision сравнивается с flange data revision;
- при mismatch grid disabled;
- пользователь получает warning.

### 26.8. Dynamic UT

UT вычисляется при export. Он не является свободно вводимым static value.

---

## 27. Reports

### 27.1. Fabrication

- Project Fabrication Progress;
- Weekly/Cumulative Fabrication;
- Summary Report через material availability → fabrication → painting → erection → RFT.

Filters:

- PDS;
- Area Classification;
- Subcontractor;
- Material Type;
- ISO;
- LB/SB;
- custom project attributes.

### 27.2. Erection

- Project Erection Progress;
- Weekly Erection Progress;
- PDS/area/material/subcontractor/LB-SB filters.

### 27.3. NDE management

- Batch Status;
- Radiographic Film Status;
- Outstanding Repairs;
- Service Class-wise NDE Status;
- Spool-wise NDE Status;
- Outstanding NDE;
- Estimated Radiographic Film Quantity.

### 27.4. Welder monitoring

- Welder Performance Control Sheet;
- Rejected and Tracer Joints;
- Rejected and Repaired Joints;
- Welder-wise Batch Status;
- Welder Production.

### 27.5. Test Pack

- Weld History Sheet;
- System-wise Summary;
- Test Pack-wise Summary;
- System-wise Details;
- Test Pack-wise Details including punch items.

### 27.6. Tracking

- Active Spool List;
- Locations;
- PDA Users;
- inconsistency/transit-out print/export;
- barcode spool basket.

### 27.7. Reports как часть workflow

Некоторые reports не просто analytics:

- Examination Request;
- QC-13/W-24/W10P;
- Line Check Request;
- Item Clearance Request;
- Blinding Request;
- Reinstatement Request;
- Weld History for dossier.

Следовательно, report/document generation требует:

- unique numbering;
- author/date;
- source snapshot;
- reproducibility;
- printable/exportable format;
- возможно signatures.

---

## 28. Повторяющиеся UX patterns

### 28.1. Preparation / Progress

Повторяемая модель:

```text
Preparation
  → search/filter eligible work
  → select team/vendor/items
  → Generate Request

Progress
  → search request/item
  → enter dates/results
  → validate
  → downstream eligibility
```

### 28.2. Intelligent search

Progress screens:

- entry на ISO или barcode level;
- intelligent search;
- summary выбранного object;
- child grid;
- hide rows;
- default date/date assistance;
- report section;
- Excel template.

### 28.3. RAG

- red: action required/blocker;
- orange: ongoing/awaiting;
- green: released/completed.

В некоторых Explorer views numeric status code сопровождается tooltip и RAG.

### 28.4. Preview before commit

Используется для:

- referential imports;
- spooling;
- flange;
- progress;
- PDA sync.

### 28.5. Controlled dropdowns

Большинство business fields выбираются из referentials. Свободный ввод допустим только для явно текстовых полей.

---

## 29. Канонические derived states

Следующие значения по документации должны вычисляться:

| Derived state | Facts |
|---|---|
| Material Check | valid heat/ident trace records |
| NDE obligation | NDE Matrix + joint definition |
| Batch assignment | welder + category + capacity |
| Batch Released | selected examinations accepted/closed |
| Spool QC Release | all required joint NDE/PWHT released |
| Active Spool | Start Fab set, Erection not set |
| Current Location | latest valid tracking events |
| Transit Out | OUT without IN beyond project limit |
| Tracking Inconsistency | progress status vs mapped location |
| Spool RFT | welded/bolted + supported + NDE/PWHT released |
| ISO Complete | all included spools supported and welded/bolted |
| ISO QC Released | all included welds NDE/PWHT released |
| ISO RFT | QC + Complete + Line Check + X clear |
| Y eligibility | Test Done |
| Z eligibility | Precommissioning Done |
| Flange UT | reference quantity × coefficients |

Derived state может materialize для performance, но не должен становиться независимым truth.

---

## 30. Канонические запреты

1. Нельзя импортировать spooling с missing PDS/service/weld type/thickness/NDE matrix.
2. Missing WPS не блокирует сам spooling import, но создаёт warning.
3. Нельзя принять invalid heat/ident trace.
4. Нельзя менять WPS/welder после NDE selection/examination.
5. Нельзя удалить referential, если оно используется.
6. Нельзя завершить revision import, пока все conflicts не resolved.
7. Нельзя потерять old revision history.
8. Нельзя произвольно QC-release spool до NDE/PWHT.
9. Нельзя начать next Pressure Test step без predecessor.
10. Нельзя progress flange при revision mismatch.
11. Нельзя использовать jointer вне referential.
12. Subcontractor не может выйти за свой PDS scope.
13. Offline PDA sync ограничен admin roles.

---

## 31. Source contradictions и неоднозначности

### 31.1. Manual vs later Administration

Later deck добавляет:

- Assembly;
- Devices/PDA Users как полноценные tabs;
- Spooling materials;
- checklist;
- RAL;
- Paint Matrix.

Их следует считать extension, но при проектировании нужно решить, входят ли они в целевой scope.

### 31.2. Количество Spooling files

- Manual core section визуально говорит о трёх tabs;
- Preparation deck явно требует четыре files и четыре tabs, включая `supp.txt`.

Для target contract приоритет у более позднего deck: четыре files.

### 31.3. `NR`

Manual description конфликтует с поведением. Нужен SME answer: `Not Required`, `No Result` или другое официальное значение.

### 31.4. NDE percentages

Manual хорошо объясняет 10%/20% и говорит о 5%, но general batch-size formula не полностью формализована.

Нужны examples для:

- 5%;
- incomplete batch at project close;
- welder/category changes;
- time windows;
- cross-revision joint.

### 31.5. WPS warning

Spooling import точно soft-warning. Weld progress говорит «alert on incorrect WPS/welder», но не всегда явно говорит, можно ли сохранить. Secondary Assembly research трактует как soft alert. Это нужно подтвердить бизнесом, потому что QC system часто должна hard-block invalid qualification.

### 31.6. Project deletion

Legacy manual разрешает destructive project deletion. Современный compliance product, вероятно, должен archive, а не физически удалять audit history.

### 31.7. Preparation modules

Презентации показывают Preparation/Progress symmetry, но признают, что часть Preparation screens legacy vendor не реализовал. Нужно различать:

- intended operating model;
- фактический legacy feature.

### 31.8. Assembly

Secondary evidence сильное, но оригинальный deck отсутствует локально. До финального DDL желательно получить оригинал.

### 31.9. Construction Surveillance

Overview упоминает transversal module, но серия decks не показывает рабочий flow. Research закрывает его как likely never built. Не следует считать его обязательной функцией без дополнительного источника.

### 31.10. Forms

Полное перечисление W-form family отсутствует. Известны:

- QC-13;
- W-24;
- W-23;
- W10/W10P;
- DWIR;
- NDE examination requests.

Нужна таблица реальных corporate forms и ownership.

---

## 32. Что можно модернизировать, не нарушая модель

Не нужно копировать legacy UI буквально.

Допустимые modernizations:

- один parameterized Assembly/Erection module;
- web/mobile PWA вместо Kalipso/PDA file exchange;
- direct digital signature вместо re-key paper form;
- archive вместо hard delete;
- capability-based permissions вместо фиксированных monolithic roles;
- event-sourced tracking и progress;
- async import job с сохранённым preview;
- real-time dashboards;
- generated documents из immutable snapshot;
- API integration вместо manual four-file upload, сохранив file fallback.

Нельзя модернизацией ослабить:

- referential validation;
- project/PDS isolation;
- revision history;
- NDE sampling/tracer rules;
- QC/RFT gates;
- auditability;
- report reproducibility.

---

## 33. Bounded contexts для будущего проектирования

### 33.1. Project Setup

- project identity;
- memberships;
- roles/capabilities;
- global/project referentials;
- custom progress schema.

### 33.2. Engineering Definition

- ISO/spool/weld/support/flange;
- imported source;
- revision lifecycle;
- hierarchy.

### 33.3. Material

- availability;
- MRR/ident/trace;
- material check;
- Marian integration.

### 33.4. Construction Progress

- fabrication;
- painting;
- assembly;
- erection;
- forms;
- spool/joint progress.

### 33.5. Quality/NDE

- matrix obligations;
- batches;
- selections;
- examinations;
- rework;
- tracer/penalty;
- QC release.

### 33.6. Tracking

- location events;
- devices/users;
- capacity;
- sync;
- consistency.

### 33.7. Pressure Test

- Test Packs;
- line check;
- punch;
- blinding;
- testing/precomm;
- reinstatement;
- RFT.

### 33.8. Flange

- bolting definition;
- categories;
- jointer progress;
- UT;
- revisions.

### 33.9. Documents/Reports

- requests;
- forms;
- progress reports;
- dossiers;
- numbering;
- snapshots.

---

## 34. Checklist для следующего аудита кода

Этот раздел не содержит результатов сравнения. Он фиксирует, что надо проверить в следующей сессии.

### 34.1. Data model

- project tenant root;
- ISO/spool/weld identity vs revision;
- weld points/multi-welder;
- supports;
- flange joints;
- NDE obligations/batches/results;
- tracking events;
- Test Pack ownership;
- punch X/Y/Z;
- forms/requests;
- immutable history.

### 34.2. Constraints

- same-project foreign references;
- referential use/delete rules;
- unique thickness/rating;
- WPS ranges;
- NDE Matrix combination;
- Root/Cap totals;
- post-NDE locks;
- revision mismatch locks;
- derived-state protection.

### 34.3. Security

- System/Project/Site Admin distinctions;
- Editor/Reader;
- functional roles;
- subcontractor PDS scope;
- route and data enforcement;
- own-project selection;
- audit actor.

### 34.4. Import

- four Spooling files;
- 4 MB;
- preview;
- red/yellow;
- atomic apply;
- revision resolution;
- source retention;
- history;
- overwrite confirmation.

### 34.5. Workflows

- Fabrication form loop;
- NDE batch/tracer truth table;
- Erection RFT;
- Test Pack RFT;
- Y/Z reinstatement;
- flange multiple jointers;
- PDA sync;
- report generation.

### 34.6. UI

- module map;
- hierarchical explorers;
- Preparation/Progress split;
- drill-down backlog;
- RAG semantics;
- disabled states;
- role-specific affordances;
- explicit warnings vs blockers.

---

## 35. Основные требования в коротком виде

Если свести всю документацию к пятнадцати обязательным принципам:

1. Project — корень isolation.
2. System referentials глобальны; project referentials локальны.
3. Setup dependencies должны быть выполнены до production entry.
4. ISO/spool/weld имеют first-class revision lifecycle.
5. Import всегда template/file → preview → validation → confirmation → apply.
6. Red blocks; yellow asks overwrite; missing WPS при spooling — warning.
7. Fabrication и Erection progress основаны на signed work records.
8. Material trace проверяется по project PML.
9. Welder/WPS qualification проверяется на каждом joint/point.
10. NDE obligation выводится из Matrix.
11. Batch = one welder × one NDE category.
12. Rejection создаёт R1/R2 и tracer obligations; second-level rejection или 4 rejects ведут к 100%.
13. Tracking — append-only location history с derived current location и inconsistencies.
14. RFT — derived gate, а не ручной checkbox.
15. Reports/forms являются частью управляемого процесса и audit trail.

---

## 36. Готовность к следующей сессии

Документационная модель зафиксирована. Для следующего сравнения следует использовать:

1. этот dossier как domain baseline;
2. Manual для точной проверки спорных правил;
3. оригинальные decks для более поздних additions;
4. research только там, где оригинал отсутствует;
5. код, migrations, фактическую БД и runtime как единственное доказательство текущей реализации.

При сравнении важно отдельно маркировать:

- **совпадает с источником**;
- **частично**;
- **противоречит**;
- **отсутствует**;
- **сознательная модернизация**;
- **источник сам неоднозначен**.

Так можно избежать двух одинаково плохих крайностей: слепого копирования legacy UI и незаметной потери критических construction/QC rules.
