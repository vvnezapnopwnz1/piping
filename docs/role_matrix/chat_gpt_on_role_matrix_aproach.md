> **Authorization update:** the strategy below remains valid as a functional
> domain map. Supabase authorization is now deliberately separate: one access
> role sets the project ceiling, functional roles grant workflow commands, and
> subcontractor/PDS scope narrows records. Capability and RLS behavior—not a
> role-matrix label or browser localStorage—are authoritative.

Согласен с направлением Claude, но я бы уточнил стратегию: матрицу надо вести как target-state + status + priority, иначе она превратится в огромный wish list. Я быстро сверю текущую роль-матрицу/доки и дам практичный процесс: что делать с missing интерфейсами, как не строить лишнее, и как отделить parity от PipeQC-договорённостей.

Коротко
Я согласен с ответом Claude на 80%, но добавил бы важное ограничение:

Ролевая матрица должна быть target-state, но не просто “всё из Easy Piping”.
Она должна быть target-state с приоритетом, статусом реализации и решением: build / defer / reject / redesign.

Иначе мы действительно получим огромную матрицу, где половина пунктов — интерфейсы, которых нет, часть была недоделана даже в Easy Piping, часть не нужна для PipeQC demo, а часть — наоборот критична.

Зачем нам ролевая матрица
Она нужна не как описание текущего кода, а как карта домена.

Правильная функция матрицы:

Functional spec: какие реальные действия делает роль.
Gap map: чего нет в текущем приложении.
Prioritization input: что строить следующим.
Prompt source: будущие промпты для Cursor/агентов должны ссылаться на конкретные функции роли.
Access model: кто может смотреть, кто может редактировать, кто только экспортирует.
Demo story map: какие сценарии показываем инвестору/клиенту.
То есть Claude прав: если экрана нет — это не делает матрицу неполной. Это делает код неполным относительно матрицы.

Но есть риск
Если просто перенести всё из мануала и презентаций, получится:

text
Manual + presentations → 200 функций → 80 missing screens → хаос
Поэтому рядом с каждым пунктом нужен не только status:

text
✅ live
⚠ partial
❌ missing
📋 planned
но ещё два поля:

text
Priority: P0 / P1 / P2 / P3
Decision: build / defer / reject / redesign
Я бы ввёл такую модель
Status
Это про текущее состояние кода.

✅ live — экран есть, поведение реально работает.
⚠ partial — экран есть, но поведение неполное/stub.
❌ missing — экрана/флоу нет.
📋 planned — нет сейчас, но уже привязано к треку.
🧪 demo-only — работает как mock/demo, не production-ready.
Priority
Это про важность.

P0 — Core domain gate
Без этого ломается главный lifecycle.
Пример: RFT gate, X/Y/Z punch gating, NDE acceptance/rejection cascade.
P1 — Demo leverage
Сильно усиливает pitch и выглядит как “real product”.
Пример: penalty shoot automation, Testpack Explorer drilldowns, Spool Tracking flags.
P2 — Parity / nice-to-have
Есть в Easy Piping, но не блокирует demo.
Пример: часть отчётов, bulk Excel import везде, print buttons.
P3 — Archive / don’t build now
Было vaporware, недоделано у Easy Piping, или слабая ценность.
Пример: Construction surveillance PDA как parity gap — не parity, потому что Easy Piping его не построил.
Decision
Это про то, что мы делаем.

build — строим в ближайших треках.
defer — признаём важным, но позже.
reject — не строим как в Easy Piping.
redesign — строим, но лучше, чем Easy Piping.
document only — оставляем в матрице как domain knowledge.
Главное переосмысление
Не все missing интерфейсы равны.

У нас есть 4 типа missing-интерфейсов.

1. Missing, которые обязательно строить
   Это то, без чего PipeQC не становится полноценным piping QC продуктом.

Примеры:

Testpack Builder / Import
RFT gate engine
Testpack Explorer release tracking
X/Y/Z punch category workflows
NDE batch management
NDE acceptance / rejection / rework cascade
Subcontractor scope lock
Project Referential master data
Iso lifecycle / Spooling state machine
Эти надо включать в roadmap.

2. Missing, которые нужны для demo/pitch
   Это может быть не “must-have production”, но сильно показывает глубину продукта.

Примеры:

Penalty shoot automation
Tracer logic
Welder qualification soft alert
Heat number hard block
Spool Tracking inconsistency / transit-out flags
Generate Request / Work Order PDF
W10P / W24 / QC13 mock forms
Live activity feed
Они часто дешевле, чем большие CRUD-модули, но дают сильный эффект.

3. Missing, которые можно отложить
   Это parity с Easy Piping, но без высокого demo ROI.

Примеры:

все 8 NDE reports сразу;
все Fabrication reports сразу;
все Excel import templates сразу;
PDA offline sync;
full barcode export workflow;
full paint weekly report;
every print button.
Их лучше пометить defer.

4. Missing, которые НЕ надо строить как Easy Piping
   Это очень важно.

Некоторые вещи у Easy Piping были:

недоделаны;
только “under development”;
плохо спроектированы;
дублировали модули;
являлись copy-paste boilerplate.
Примеры:

Construction surveillance PDA checklists
В ресерче оно закрыто как “NEVER BUILT”. Значит это не parity gap. Это whitespace opportunity. Если строить — строить как PipeQC differentiation, не как Easy Piping parity.
Assembly as full duplicated module
Easy Piping дублировал Erection. Мы не должны. Лучше stage = assembly | erection.
Preparation для всех Spool/Welding/Flange как огромный набор экранов
У Easy Piping почти везде был реально сделан только NDE Preparation. Остальное было structural promise. Значит нам не надо вслепую создавать 20 preparation pages.
Planning, target and alert / Revision control under development
Не строить сейчас, только учитывать как future opportunity.
Какая стратегия разработки лучше
Я бы выбрал стратегию:

text
Matrix first → Gap map → Track slicing → Build only high-value interfaces
Но с очень строгой фильтрацией.

Предлагаемый workflow
Шаг 1. Доделать role matrix как target-state
Да, доделать все роли.

Но у каждой функции должны быть:

text
Status
Priority
Decision
Track
Source
Пример:

text
B14 Welder qualification validation
Status: ⚠ partial
Priority: P1
Decision: build
Track: N — NDE / Welder Quality Upgrade
Source: presentation #4, #6, #9, CC-28
Или:

text
Construction surveillance PDA checklist
Status: ❌ missing
Priority: P3 / Opportunity
Decision: redesign, not parity
Track: Future Mobile
Source: CC-30 — never built by Easy Piping
Шаг 2. Не создавать экраны просто потому что они в матрице
Матрица не равна backlog.

Матрица отвечает:

text
Что существует в домене?
Backlog отвечает:

text
Что мы строим следующим?
Это разные документы.

Шаг 3. После матрицы собрать consolidated gap map
Не по ролям, а по capability.

Например:

text
Capability: NDE penalty shoot
Roles affected:

- QC Engineer
- NDE Inspector
- Project Manager
- Subcontractor
  Status: missing
  Priority: P1
  Decision: build
  Track: N
  Это важно, потому что одна missing-функция может закрывать 4 роли сразу.

Шаг 4. Приоритизировать не по меню, а по lifecycle leverage
Я бы не шёл “слева направо по навигации”.

Лучше идти по pipeline:

text
Spooling → Fabrication → NDE → Erection → Testpack → Reports
Но строить только те куски, которые дают связный demo flow.

Как поступать с не созданными интерфейсами
Для каждого missing interface принимать одно из решений.

Build now
Если интерфейс:

нужен в основном demo flow;
закрывает несколько ролей;
демонстрирует уникальную доменную логику;
строится относительно быстро.
Примеры:

Testpack Builder basic.
Pressure Test nested nav.
NDE batch management upgrade.
Welder qualification alert.
Heat number hard block.
Subcontractor scope lock.
Build thin shell
Если интерфейс важен для IA, но deep logic можно позже.

Примеры:

Admin System Referential.
Admin Project Referential.
Import Settings.
Reports categories.
Spool Tracking Data Analysis.
Тут достаточно:

route;
page title;
domain explanation;
tabs/cards;
demo table;
“planned” status badges.
Это помогает продукту выглядеть complete, но не съедает недели.

Defer
Если функция важная, но не нужна для ближайшего pitch.

Примеры:

all Excel import flows;
full barcode Zebra export;
all NDE reports;
full Painting matrix dynamic engine;
PDA offline sync.
Reject / redesign
Если Easy Piping делал плохо или не сделал вообще.

Примеры:

Assembly как отдельный duplicated module → redesign as stage.
Construction surveillance PDA → не parity, future mobile differentiator.
Preparation pages для всего подряд → не строить пустые страницы, строить только там, где есть реальная dispatch logic.
Что делать с PM матрицей
Claude прав: PM надо retroactively обновить.

Сейчас в PM matrix функции без явного status flag. Я бы сделал так же, как в qc_engineer.md:

text

1. **✅ Morning notification review**
2. **✅ Fabrication dashboard monitoring**
3. **✅ Erection dashboard monitoring**
4. **❌ Spool Tracking dashboard monitoring**
5. **⚠ NDE bottleneck check**
   ...
   Но важно: ✅ ставить только если реально есть экран и описанное поведение существует.

Например:

/fabrication/dashboard есть → возможно ✅ или ⚠.
/erection/dashboard есть → возможно ✅ или ⚠.
/tracking в меню был, но страницы, похоже, нет → это не ✅, а ❌/📋.
PM read-only mode не реализован → это ⚠/📋 Track J.
notification feed если есть только частично → ⚠.
Важная поправка по статусам
Я бы был осторожен с ✅ live.

В qc_engineer.md некоторые пункты выглядят как ✅, но нужно проверить, действительно ли поведение есть в коде.

Например:

text
Shop material check sign-off per spool (heat numbers → mill cert)
Если экран есть, но нет настоящей heat-number validation against Project Piping Material List — это скорее:

text
⚠ partial
А не ✅ live.

То есть ✅ live должен означать:

text
Route exists + UI exists + described interaction exists + state changes persist in store
Если есть только экран, но нет доменной логики — это ⚠ partial.

Это критично, иначе матрица станет слишком оптимистичной.

Какие треки я бы выбрал после role matrix
На текущем этапе я бы не распылялся. Я бы выбрал 5–6 треков.

Track A — Admin IA / Referentials
Цель: создать backbone master data.

Сюда:

Project Definition
System Referential
Project Referential
Access Rights
Import Settings
Это уже начали.

Track H — Testpack / RFT
Самый важный domain track.

Сюда:

Testpack Builder
Testpack Import
RFT gate
X/Y/Z punch logic
Release Tracking
Pressure Test nested flows
Testpack Explorer upgrades
Почему важно:

это самый сложный и самый pitch-worthy модуль;
PM, QC, Line Check, Reinstatement, Subcontractor роли сходятся здесь.
Track J — Role / Access / Subcontractor Scope
Сюда:

subcontractor forced scope;
PM read-only;
role-specific nav visibility;
disabled dropdowns;
project reader;
PDA user later.
Почему важно:

enterprise credibility;
multi-tenant demo;
security story.
Track K — Iso Lifecycle / Spooling
Сюда:

engineering transmittals;
iso received;
checkout to spooler;
checking rounds;
hold;
transmittal to site;
Browser / SpoolGen bridge.
Почему важно:

upstream data source;
объясняет откуда вообще появляются ISO/spools/welds.
Track N — NDE / Welding Quality Upgrade
Сюда:

welder qualification soft alert;
multi-weld-point;
tracer logic;
penalty shoot;
NDE100;
PWHT release integration;
issue examination program.
Почему важно:

максимальная доменная глубина;
закрывает много gaps QC Engineer / NDE Inspector;
сильный pitch: “это не generic CRUD”.
Track S — Spool Tracking
Сюда:

actual /tracking or /spool-tracking;
dashboard;
data analysis tabs;
inconsistency flags;
transit-out;
barcode export later.
Почему важно:

physical reality layer;
PM story;
easy visual demo.
Что не делать сейчас
Я бы не строил сейчас:

все 30 справочников как полноценный CRUD;
все reports;
full PDA offline sync;
full mobile app;
duplicated Assembly module;
all Preparation pages for every activity;
full Painting dynamic workflow before core Testpack/NDE is stable;
every Excel import template.
Как формулировать матрицу, чтобы она не вводила в заблуждение
Я бы добавил в начало каждого role file такой блок:

md

> This role matrix describes target-state PipeQC behavior derived from Easy Piping manual + presentation research.
> It is not limited to currently implemented app screens.
> Each function is tagged with implementation status and product decision.
> И дальше легенду:

md
Status:
✅ live — implemented and working in current app
⚠ partial — route/UI exists but behavior is incomplete
❌ missing — no implemented screen/flow
📋 planned — assigned to a named future track
🧪 demo-only — mocked/demo behavior, not production-complete

Priority:
P0 — core lifecycle gate
P1 — high demo/domain leverage
P2 — parity/nice-to-have
P3 — archive/defer/reject

Decision:
build / defer / reject / redesign / document-only
Мой вывод
Claude дал правильный общий ответ:

Матрица — target state, код — current state, gap между ними нам и нужен.

Но я бы усилил это так:

Матрица — не backlog.
Матрица — domain map.
Backlog появляется только после triage: priority + decision + track.

Если сделать так, то missing интерфейсы не будут проблемой. Они станут управляемым списком:

что строим;
что откладываем;
что не строим;
что строим иначе, чем Easy Piping.
Рекомендация
Продолжать делать role matrix, но начиная со следующей роли сразу добавлять:

Status
Priority
Decision
Track
Source
А PM и QC Engineer потом пройти audit-pass и привести к этому формату. Особенно аккуратно проверить ✅ live, чтобы он не означал просто “экран примерно есть”.

Статус: стратегия понятна — делать матрицу как complete domain target, но разработку вести через triage и треки, а не автоматически строить все missing пункты из мануала.
