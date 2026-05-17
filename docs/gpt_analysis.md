Я буду оценивать не “завершён ли продукт”, а именно **соответствует ли уже сделанное мануалу**, с учётом что Claude Code мог реализовать только демо-срезы и не закрыть весь scope. Дочитаю ещё несколько критичных участков реализации, чтобы не гадать.

## Короткий вердикт

**Направление проекта правильное для демо**, но **не всё сделанное соответствует Easy Piping Manual буквально**. Claude Code реализовал много “демо-срезов”, но местами упростил доменную логику так, что приложение может показывать **ложную готовность** — особенно в NDE, Testpack Release Tracking, Flange/Reinstatement и Fabrication QC Release.

Самая важная мысль: сейчас PipeQC выглядит как хороший интерактивный прототип, но не как точная модель Easy Piping. Если цель — демо инвестору, часть упрощений допустима. Если цель — соответствие мануалу, нужны доработки.

---

## Что уже в целом соответствует мануалу

### 1. Общая карта модулей выбрана правильно

В мануале основной поток такой:

- Setup / Referential
- Spooling / Preparation
- Fabrication
- Spool Tracking
- NDE
- Erection
- Testpack / Pressure Test
- Flange
- Reports

Это видно в оглавлении мануала: §6 Spooling, §7 Fabrication, §10 Spool Tracking, §11 NDE, §12 Erection, §14–18 Testpack/Pressure Test, §19 Flange, §20 Reports. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="132-156" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="179-256" />

В приложении навигация примерно повторяет эту карту: Setup, Preparation, Construction, Reports, Testing, Configuration. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/config/navigation.ts" lines="35-166" />

### 2. Pressure Test workflow в широком смысле сделан правильно

Мануал говорит, что Pressure Test состоит из:

- Line Check
- Item Clearance
- Blinding
- Testing and Pre-commissioning
- Reinstatement

и почти каждая активность делится на Preparation / Progress. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="4874-4932" />

В приложении эти routes действительно есть:

- `/testpack/pressure-test/line-check/preparation`
- `/testpack/pressure-test/line-check/progress`
- `/item-clearance/preparation`
- `/item-clearance/progress`
- `/blinding/preparation`
- `/blinding/progress`
- `/testing-precomm/progress`
- `/reinstatement/preparation`
- `/reinstatement/progress`

То есть Track A сделан близко к мануалу по структуре.

### 3. Material Check как идея реализован верно

Мануал говорит, что Material Check связан с heat numbers / material traceability и после корректной проверки обновляет material check status spool-а. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="2454-2458" />

Текущий `MaterialCheckView` действительно работает вокруг heat number / spool / signed off. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/fabrication/material-check-view.tsx" lines="187-260" />

### 4. Часть Project Referential реализована правильно как демо-срез

В мануале §3 Project Referential включает много справочников: Subcontractor, WPS, Welder Qualification, NDE Matrix, Rework Code, Joint Category, Teams и т.д. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="656-714" />

В приложении есть часть этих табов: Teams, Subcontractors, Welder Qualifications, WPS, NDE Matrix, Rework Codes, Joint Categories. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/app/admin/admin-tabs.tsx" lines="15-89" />

Это **не полный Setup**, но направление правильное.

---

## Главные несоответствия и возможные ошибки Claude Code

### P0. NDE workflow сейчас наиболее сильно расходится с мануалом

Это главный риск.

#### Что говорит мануал

NDE batch в Easy Piping:

- создаётся автоматически после записи weld progress;
- группируется по welder / location / NDE category;
- размер batch зависит от NDE percentage;
- статусы batch: **Joint to Select**, **Awaiting NDE**, **Released**;
- статусы joints внутри batch: `S`, `SS`, `NR`, `?`, `T1`, `T2`, `T1S`, `T2S`;
- при rejection включается tracer logic: система предлагает 2 tracer joints, потом следующие уровни tracer-а;
- если 4+ rejected weld points, batch уходит в 100% examination. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="3178-3224" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="3230-3250" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="3344-3396" />

#### Что сделано сейчас

В приложении NDE batch создаётся вручную через wizard из выбранных welds. Статусы такие:

- Created
- Issued
- In Progress
- Results Received
- Closed
- Rework

<ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/store/batches-store.ts" lines="21-31" />

Create Batch wizard выбирает welds из Completed/Rework вручную. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/nde/create-batch-dialog.tsx" lines="156-170" />

#### Оценка

Это **не точная логика Easy Piping**, а демо-упрощение. Для demo это может быть допустимо, но если пользователь знает Easy Piping, он заметит:

- нет Joint to Select;
- нет S/SS/NR/T1/T2;
- нет tracer/penalty shoot;
- нет автоматического batch creation по NDE Matrix;
- нет 10% / 20% логики;
- нет NDE 100;
- rejection просто cascade-ит weld в Rework, но не запускает tracer selection.

**Это не просто “не завершено”, это другая модель NDE.**

---

### P0. Testpack Release Tracking сейчас может показывать ложную готовность

#### Что говорит мануал

Release Tracking должен показывать:

- welded joints still to be welded;
- flange joints still to be bolted;
- welded joints still to be NDE tested;
- isometrics to complete;
- isometrics to return from line checking;
- item category X to clear;
- isometrics to QC release;
- isometrics Ready For Test. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5378-5398" />

#### Что сделано сейчас

В `LiveReleaseTracking` первые три gate-а просто hardcoded green / metric 0:

- Welded joints to be welded = 0
- Flange joints to be bolted = 0
- Welded joints still to be NDE-tested = 0

<ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/testpack/testpack-explorer.tsx" lines="654-675" />

`QC released for test` считается так:

```ts
const qcReleased = lineCheckRemaining === 0 && openXItems === 0;
```

<ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/testpack/testpack-explorer.tsx" lines="616-621" />

#### Почему это ошибка

По мануалу QC Release для testpack требует, чтобы welded joints были NDE/PWHT released, а не только line check done + X cleared. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5392-5397" />

Сейчас Explorer может показать testpack как готовый, даже если:

- flange joints не bolted;
- welds не NDE-tested;
- upstream construction incomplete;
- QC release не прошёл реально.

Это **самое опасное место для демо**, потому что зритель может кликнуть Release Tracking и увидеть “зелёную” готовность, которая не соответствует мануалу.

---

### P0. Reinstatement сейчас, похоже, моделирует punch items вместо flange joints

#### Что говорит мануал

Testing / Pre-commissioning dates нужны, чтобы управлять reinstatement для **flange joints category Y and Z**:

- Category Y: after testing, before pre-commissioning;
- Category Z: after pre-commissioning. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5154-5173" />

Reinstatement Preparation говорит именно про flange joints. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5178-5200" />

#### Что сделано сейчас

В `testpack-store` reinstatement eligibility берётся из `punchItems` category Y/Z. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/store/testpack-store.ts" lines="292-303" />

#### Оценка

Это концептуальная подмена:

- Punch items — замечания line check.
- Flange joints Y/Z — bolting / reinstatement entities.

Для демо это может выглядеть нормально, но по мануалу Reinstatement должен быть связан с Flange Management, jointer, joint date, report no, tag no. Сейчас связь с `/flange` фактически отсутствует.

---

### P0. Fabrication lifecycle не завершён и местами неверно “автоматизирован”

#### Что говорит мануал

Fabrication spool lifecycle:

1. Start Fab
2. Material Check
3. Weld Progress
4. Fabricated
5. QC Release
6. Sent to Paint
7. Painted
8. Final QC
9. Laydown

<ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="2396-2415" />

`Fabricated` должен обновляться после dimensional check и подписей. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="2556-2559" />

`QC Release` должен быть только когда все joints конкретного spool-а NDE completed. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="2564-2567" />

#### Что сделано сейчас

В `SpoolFabStage` стадии перечислены, но stage derivation реально ведёт только до `Fabricated`; `QC Release`, `Sent to Paint`, `Painted`, `Laydown` пока почти не имеют workflow. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/lib/spool-data.ts" lines="3-22" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/lib/spool-data.ts" lines="164-189" />

Dashboard funnel ведёт только на Material Check и Weld Progress. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/fabrication-dashboard.tsx" lines="212-215" />

#### Оценка

Это не ошибка, если Claude Code остановился до Track G3/G4/G5. Но если текущий UI где-то намекает, что QC Release / Paint / Laydown уже реализованы, это будет misleading.

Особенно важно: `Fabricated` сейчас выводится как производное от “all welds completed + material check signed”, но в мануале Fabricated — это отдельный шаг после dimensional check. Значит текущий `Fabricated` — **условно правильный demo shortcut**, но не точное соответствие.

---

### P0. Spooling почти полностью отсутствует, хотя в мануале это фундамент

#### Что говорит мануал

Spooling import — это источник weld / iso / spool data. Он валидирует:

- PDS Area;
- Service Class;
- Weld Type;
- Thickness;
- NDE Matrix;
- WPS;
- pipeline consistency per ISO;
- service class consistency per ISO;
- revision management. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="1780-1850" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="1856-1889" />

#### Что сделано сейчас

`/spooling` — placeholder. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/app/spooling/page.tsx" lines="1-10" />

#### Оценка

Это не “баг” Claude Code, но это крупный незакрытый модуль. Пока его нет:

- данные в welds-store/testpack-store/flange-data существуют отдельно;
- нет настоящего source of truth;
- revision management отсутствует;
- Browse Latest / Browse History отсутствуют.

Если цель — объяснить бизнес-логику Easy Piping, Spooling нужно делать раньше многих downstream вещей.

---

### P1. Flange Management сделан только как Browse, без настоящего progress / import / persistence

#### Что говорит мануал

Flange Management должен:

- import bolting report data;
- revision management;
- browse flange;
- progress import;
- progress input method;
- jointing method/value;
- joint period;
- joint category X/Y/Z;
- jointer;
- report no;
- tag no;
- UT calculation. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5598-5625" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5826-5901" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="5948-5976" />

#### Что сделано сейчас

`FlangeBrowse` использует локальный `useState(seedJoints)`, то есть изменения не являются общим persisted store. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/flange/flange-browse.tsx" lines="46-63" />

#### Оценка

Browse-фильтры похожи на мануал, но доменная часть Flange Management ещё не реализована:

- нет `flange-store`;
- нет связи с Testpack Release Tracking;
- нет real bolting/reinstatement gate;
- нет import/progress workflow;
- нет revision management.

---

### P1. Erection реализован частично и не полностью следует мануалу

#### Что говорит мануал

Erection module включает:

- Spool Erection Preparation / Progress;
- Material Check;
- Weld Progress;
- To Site;
- Erected;
- Welded/Bolted;
- Supported;
- RFT automatic. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="4118-4170" /> <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="4306-4353" />

#### Что сделано сейчас

Есть field weld store и field weld progress. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/store/erection-store.ts" lines="15-34" />

Но нет полноценного Spool Erection Preparation/Progress. `ErectionStatus` хранится на field weld entity, хотя в мануале To Site / Erected / Supported — это скорее spool/ISO-level progression. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/lib/erection-weld-data.ts" lines="3-21" />

#### Оценка

Это хороший demo shortcut, но модель смешивает уровни:

- spool status;
- field joint status;
- NDE status;
- RFT.

По мануалу эти уровни должны быть разделены.

---

### P1. Access Rights почти не соответствуют мануалу

#### Что говорит мануал

Access rights:

- project-based roles;
- user can access multiple projects with different rights;
- subcontractor role sees only own PDS area;
- subcontractor dropdowns are disabled and fixed to logged-in subcontractor. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="1510-1521" />

#### Что сделано сейчас

Есть role-based navigation visibility, но нет project/user permission model и data scoping. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/config/navigation.ts" lines="35-166" />

#### Оценка

Для демо нормально. Для соответствия мануалу — не реализовано.

---

### P1. Project Referential реализован только частично

Мануал §3 содержит 26+ справочников. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="656-714" />

Сейчас реализованы только:

- teams;
- subcontractors;
- welder qualifications;
- WPS;
- NDE matrix;
- rework codes;
- joint categories.

Нет:

- Progress Weight Factor;
- Area Classification;
- PDS Area/Subcontractor;
- Service class / Material type;
- Weld Type;
- Thickness;
- Project Piping Material Class;
- Unit of Time Reference;
- System / Subsystem;
- Location Category / Location;
- Pressure Unit;
- Line Service;
- Devices / PDA Users.

Это влияет на валидность spooling import, reports, dashboard filters и subcontractor scoping.

---

### P1. Reports есть, но это shell, не точная копия reports из мануала

Reports module сейчас уже не placeholder: есть `ReportsView`, фильтры и mock download. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/components/reports/reports-view.tsx" lines="73-160" />

Но:

- report names/sections местами взяты как demo definitions;
- NDE reports в мануале имеют конкретные filenames вроде `Welders_Perf_Control_Sheet.xls`, `Batch_Status_Report.xls`, `Radiographic_Film_Status_Report.xls`, `Outstanding_Repairs_Report.xls`. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/marker-output/Easy Piping User Manual.md" lines="3978-4063" />
- Reports не строятся из реальных фильтров/данных.

Это нормальный shell, но не полноценное соответствие.

---

### P2. Документация проекта устарела и местами вводит в заблуждение

`PIPEQC_CONTEXT.md` говорит, что stack — Next.js 14. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/PIPEQC_CONTEXT.md" lines="24-37" />

Но `package.json` показывает Next 16.2.6 и React 19. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/package.json" lines="49-61" />

Также `PIPEQC_CONTEXT.md` всё ещё говорит, что `/reports` placeholder, хотя Reports уже реализован. <ref_snippet file="/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/PIPEQC_CONTEXT.md" lines="96-100" />

Это не runtime bug, но будущие AI agents могут продолжить работу по устаревшему контексту и наделать неправильных изменений.

---

## Итоговая оценка по модулям

| Модуль              | Соответствие мануалу | Комментарий                                                 |
| ------------------- | -------------------: | ----------------------------------------------------------- |
| Navigation / IA     |                  75% | Общая структура правильная                                  |
| Admin / Referential |               30–35% | Реализован полезный subset, но не весь §2–§3                |
| Access Rights       |                  10% | Только role nav, нет project/user/data scoping              |
| Spooling            |                   5% | Placeholder, хотя это фундамент                             |
| Fabrication         |                  40% | Weld Progress + Material Check есть, но lifecycle неполный  |
| NDE                 |                  30% | UI хороший, но batch logic не соответствует Easy Piping     |
| Spool Tracking      |               40–50% | Визуально похоже, но barcode/PDA/offline sync не закрыты    |
| Erection            |               35–45% | Field weld progress есть, spool erection/RFT model упрощены |
| Pressure Test       |               65–75% | Наиболее близкий модуль, но upstream gates неверные         |
| Testpack Explorer   |               50–60% | UI сильный, но Release Tracking hardcoded/упрощён           |
| Flange              |               25–35% | Browse есть, но нет real progress/import/store              |
| Reports             |               45–55% | Shell хороший, но не точные report definitions/filters      |

---

# План доработок

## P0 — исправить критичные расхождения, которые дают ложную готовность

### 1. Переделать Release Tracking gates в Testpack Explorer

**Почему:** сейчас первые 3 gate-а hardcoded green, а QC Release считается неправильно.

**Что сделать:**

- Подключить gates к реальным источникам:
  - welds-store / erection-store для welded joints still to be welded;
  - flange-store для flange joints still to be bolted;
  - batches-store для welded joints still to be NDE tested;
  - testpack-store для line check, X items, blinding, testing, reinstatement.
- Убрать hardcoded `metric: 0`.
- `QC released for test` считать по мануалу: all welded joints NDE/PWHT released.
- `Ready For Test` считать как:
  - ISO complete;
  - QC released;
  - line check done;
  - all category X cleared.

**Файлы:**

- `components/testpack/testpack-explorer.tsx`
- `store/testpack-store.ts`
- возможно `store/iso-rollup.ts`
- новый `store/flange-store.ts`

---

### 2. Исправить концепцию Reinstatement: punch items vs flange joints

**Почему:** мануал говорит про flange joints category Y/Z, а код использует punchItems Y/Z.

**Что сделать:**

- Ввести `flange-store` как источник flange joints.
- Добавить поля:
  - jointCategory: X/Y/Z;
  - jointPeriod: Before Test / Before PMC / After PMC;
  - jointDate;
  - reportNo;
  - jointer;
  - tagNo;
  - reinstatement status.
- Reinstatement Preparation должен выбирать flange joints:
  - Y после `testingDoneDate`;
  - Z после `preCommDate`.
- Punch items оставить для Line Check / Item Clearance.

**Файлы:**

- новый `store/flange-store.ts`
- `lib/flange-data.ts`
- `components/flange/*`
- `components/testpack/reinstatement/*`
- `store/testpack-store.ts`

---

### 3. Согласовать NDE batch model с мануалом хотя бы на уровне демо

**Почему:** текущая NDE model слишком отличается от Easy Piping.

**Минимальный вариант для демо:**

- Добавить понятия:
  - `Joint to Select`
  - `Awaiting NDE`
  - `Released`
  - joint statuses `S`, `SS`, `NR`, `T1`, `T2`, `?`
- При reject не просто отправлять weld в Rework, а создавать tracer selection step.
- Добавить визуальный tracer panel в Batch Detail.
- Добавить NDE 100 marker, если rejected count превышает threshold.

**Полный вариант:**

- Автоматическое batch allocation при weld progress based on:
  - welder;
  - location Shop/Field;
  - NDE Matrix;
  - NDE percentage;
  - piping class;
  - weld type.

**Файлы:**

- `store/batches-store.ts`
- `components/nde/batch-management-view.tsx`
- `components/nde/batch-detail-panel.tsx`
- `components/nde/receive-results-panel.tsx`
- `lib/engineering-references.ts`
- `components/weld-detail-panel.tsx`
- `components/erection/field-weld-detail-panel.tsx`

---

## P1 — закрыть основные незавершённые manual sections

### 4. Реализовать Spooling module как источник данных

**Почему:** без Spooling нет настоящего source of truth.

**Что сделать в демо-формате:**

- `/spooling` заменить placeholder на экран с tabs:
  - Import Spooling;
  - Ident Code;
  - Bolting Report;
  - Browse Latest;
  - Browse History;
  - Manual Revision Management.
- Добавить mock import preview:
  - success rows;
  - validation errors;
  - export error file mock.
- Реализовать validation checklist из мануала:
  - PDS Area exists;
  - Service Class exists;
  - Weld Type exists;
  - Thickness exists;
  - NDE Matrix exists;
  - WPS warning;
  - pipeline consistency;
  - service class consistency.
- Добавить revision conflict wizard.

**Файлы:**

- `app/spooling/page.tsx`
- новый `components/spooling/*`
- новый `store/spooling-store.ts`
- расширить `lib/engineering-references.ts`

---

### 5. Достроить Fabrication lifecycle: QC Release, Paint, Laydown

**Почему:** сейчас stages есть в enum, но нет workflow.

**Очередность:**

1. **QC Release**
   - checklist:
     - dimensional check;
     - visual inspection;
     - documentation;
     - heat-number traceability;
   - inspector sign-off;
   - stage moves Fabricated → QC Release.

2. **Sent to Paint**
   - W10P form mock;
   - sent date;
   - paint subcontractor / location.

3. **Painted / Final QC**
   - paint done date;
   - final QC date;
   - remarks.

4. **Laydown**
   - laydown location;
   - ready for site flag;
   - link to Tracking/Erection.

**Файлы:**

- `lib/spool-data.ts`
- `store/spool-stage.ts`
- новый `store/qc-release-store.ts`
- новый `store/paint-store.ts`
- `components/fabrication-dashboard.tsx`
- `config/navigation.ts`
- `store/demo-store.ts`

---

### 6. Разделить Erection на spool-level и field-weld-level

**Почему:** сейчас `erectionStatus` живёт на field weld, но в мануале To Site / Erected / Supported — spool-level или ISO-level.

**Что сделать:**

- Создать `erection-spools-store`:
  - To Site;
  - Erected;
  - Welded/Bolted;
  - Supported;
  - RFT.
- Field welds оставить отдельно:
  - weld progress;
  - root/cap;
  - welder/WPS;
  - NDE.
- RFT делать auto-derived, а не ручным status.

**Файлы:**

- новый `store/erection-spools-store.ts`
- `store/erection-store.ts`
- `components/erection-dashboard.tsx`
- `components/erection/*`

---

### 7. Достроить Flange Management

**Почему:** Flange влияет на testpack readiness и reinstatement.

**Что сделать:**

- Перевести `FlangeBrowse` с локального `useState` на persisted `flange-store`.
- Добавить:
  - import bolting report mock;
  - manual revision management;
  - flange progress input;
  - joint method/value;
  - joint period;
  - category X/Y/Z;
  - jointer/report/tag;
  - UT value display.
- Подключить flange blockers к Testpack Explorer.

**Файлы:**

- `store/flange-store.ts`
- `components/flange/flange-browse.tsx`
- `components/flange/flange-detail-panel.tsx`
- `components/testpack/testpack-explorer.tsx`

---

## P2 — улучшить fidelity и документацию

### 8. Обновить `PIPEQC_CONTEXT.md`

**Почему:** будущий AI agent сейчас будет читать устаревшую информацию.

**Что исправить:**

- Next.js 16 вместо Next.js 14.
- Reports уже реализован.
- Spooling всё ещё placeholder.
- Fabrication G3/G4/G5 не реализованы.
- Flange store отсутствует.
- NDE model — demo simplified, not manual-accurate.
- Testpack gates — частично hardcoded, требуют исправления.

---

### 9. Сделать Manual Coverage Matrix

Создать таблицу:

| Manual section | Required by manual | Current implementation | Status | Risk |
| -------------- | ------------------ | ---------------------- | ------ | ---- |

Это поможет не терять контекст и не давать следующему AI agent делать “красивые, но неправильные” экраны.

---

### 10. Добавить demo badges “manual-accurate” vs “demo-simplified”

Не обязательно в UI для пользователя, но полезно в dev/docs:

- Manual-accurate:
  - Pressure Test basic flow;
  - Material Check concept;
  - Admin subset.

- Demo-simplified:
  - NDE;
  - Release Tracking;
  - Flange;
  - Erection RFT;
  - Reports.

---

## Рекомендуемая очередность работ

### Сначала обязательно

1. **Fix Testpack Release Tracking gates**
2. **Fix Reinstatement source: flange joints, not punch items**
3. **Add flange-store**
4. **Update docs/context so future agents do not continue wrong assumptions**

### Затем

5. **NDE tracer / Joint to Select model**
6. **Fabrication QC Release screen**
7. **Spooling import shell + revision management**

### Потом

8. **Paint / Laydown**
9. **Erection spool-level model**
10. **Reports fidelity**

---

## Главный вывод

Claude Code сделал хороший интерактивный прототип, но местами **подменил доменную модель Easy Piping более простой SaaS/QC-моделью**.

Самые опасные несоответствия:

1. **NDE batch lifecycle не соответствует manual.**
2. **Testpack Release Tracking сейчас может показывать ложную готовность.**
3. **Reinstatement должен идти от flange joints Y/Z, а не от punch items Y/Z.**
4. **Spooling отсутствует, хотя это фундамент данных.**
5. **Fabrication stages после Material Check/Weld Progress пока в основном декларативные.**

Если цель — “выглядит как enterprise demo”, текущий проект уже неплох.  
Если цель — “соответствует Easy Piping Manual”, нужно сначала закрывать P0 выше.
