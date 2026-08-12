## Роль: Project Manager (PM)

> Authorization note: PM is a functional persona; Project Reader is the safe default access role, not an immutable tier.

**One-line:** Owner of P&L, schedule, and client relationship на piping-пакете
EPC-проекта. В приложении — **watcher, не editor**: смотрит на дашборды,
drill'ится в блокеры, генерирует отчёты для клиента и руководства.
Данные сам почти не вводит.

**Lifecycle scope:** Активен всю стройку от engineering ramp до
commissioning. Самая интенсивная вовлечённость — в Testing phase
(RFT pursuit), где он координирует cross-team unblocking.

**Source:**

- Manual: §11 (Fabrication dashboard + KPI), §11.7 (Spool/Joint Fab KPI),
  §11.8 (NDE reports — Welder perf, Welder-wise rejected & tracers),
  §17 (Testpack Homepage), §18.2 (Release Tracking with clickable
  drilldowns), §20 (Testpack Management Reports).
- Presentations: #1 PSMS overview (role mentioned в pitch language —
  _"Improve overall piping performance"_ для leadership audience),
  #2 Administration / CC-3 (Editor tier: _"Reports, dashboards"_),
  #5 Spool tracking (Overview dashboard r3=Manager), #6 Erection
  Dashboard, #7 Test Pack Homepage, #8 Spooling Home dashboard.
- IA sitemap: `r3` chip (Manager) появляется на 12+ экранах —
  все дашборды и большинство отчётов.

---

> This role matrix describes target-state PipeQC behavior derived from Easy Piping manual + presentation research.
> It is not limited to currently implemented app screens.
> Each function is tagged with implementation status and product decision.
>
> Status: ✅ live — implemented and working in current app · ⚠ partial — route/UI exists but behavior is incomplete · ❌ missing — no implemented screen/flow · 📋 planned — assigned to a named future track · 🧪 demo-only — mocked/demo behavior, not production-complete.
> Priority: P0 — core lifecycle gate · P1 — high demo/domain leverage · P2 — parity/nice-to-have · P3 — archive/defer/reject.
> Decision: build / defer / reject / redesign / document-only.

---

### A. Real-world responsibilities (вне приложения)

PM на EPC-проекте уровня LNG/refinery:

- **Owner of P&L** для piping construction package — обычно $50M–$500M
  scope из $5B+ overall project budget
- **Schedule owner** — committed completion dates перед клиентом
  (ExxonMobil, QatarEnergy, Aramco, etc), accountable за slippage
- **Resource orchestrator** — координирует 5–15 subcontractor teams
  параллельно (fab shops, erection crews, NDE labs, hydrotest teams,
  reinstatement teams)
- **Client interface** — weekly progress meetings, monthly board
  reviews, change orders, RFI's, client QC representative escalations
- **Risk owner** — идентифицирует bottleneck'и, эскалирует блокеры
  EPC leadership, принимает scope tradeoffs (e.g. "режем 3 test pack'а
  из июньского scope, переносим на июль чтобы освободить QC ресурсы")
- **Reports up** to Project Director / EPC company leadership
- **Coordinates down** через QC Engineer, NDE Inspector, Site Admin,
  Spooling Team, и subcontractor leads
- **Sign-off** на test pack delivery to client (handoff moment) —
  это формальный milestone в проекте

Ключевая характеристика: PM **никогда не вбивает welder ID, не
подписывает W24, не assign'ит NDE batch**. Это работа editor-ролей
ниже него. PM **смотрит итог**, **drill'ится в проблему**, **звонит
кому надо** (вне приложения).

---

### B. Application functions (PipeQC scope)

12 функций — все в основном read-oriented. Status legend выше — ✅ live · ⚠ partial · ❌ missing · 📋 planned · 🧪 demo-only.

1. **⚠ Morning notification review** — `/` имеет notification feed и links,
   но acknowledgement / archived / grouped escalation logic отсутствует.
2. **✅ Fabrication dashboard monitoring** — `/fabrication/dashboard` имеет KPI,
   funnel, charts и кликабельные переходы на stage screens.
3. **✅ Erection dashboard monitoring** — `/erection/dashboard` имеет KPI,
   funnel, per-stage drill-through и site NDE status widgets.
4. **❌ Spool Tracking dashboard monitoring** — `/tracking` route отсутствует.
   Track S candidate.
5. **⚠ NDE bottleneck check** — `/nde` имеет batch list, filters, overdue KPI,
   row detail; dedicated PM acceptance-rate / lab-performance dashboard отсутствует.
6. **✅ Testpack / Pressure Test homepage monitoring** — `/testpack/pressure-test`
   существует как RFT pursuit overview.
7. **✅ Testpack Explorer drill-down** — `/testpack/explorer` реализует TP-level
   drill-down и release tracking inspection.
8. **🧪 Release Tracking worklist popup / export** — popup flow есть как demo,
   Excel export остаётся mock-toast.
9. **🧪 Weekly Fabrication / Summary reports download** — `/reports` имеет
   category filter и download mock-toast; real report generation отсутствует.
10. **🧪 NDE / Testpack client handoff reports** — `/reports` покрывает shell,
    но §20 dossier-grade reports не генерируются.
11. **⚠ Read-only deep-dive mode** — detail screens существуют, но `project_manager`
    пока имеет edit-access как `qc_engineer`; PM write-lock отсутствует.
12. **⚠ Spooling pipeline health** — `/spooling` и `/spooling/iso-workflow`
    существуют, но показывают thin shell / demo import, не full lifecycle.

**Gap summary:** 4 функции ✅ live, 5 ⚠ partial, 3 🧪 demo-only, 1 ❌ missing.

**Gap density observation:** PM роль mostly covered at dashboard/navigation shell
level, но weakest zones — **Track J** (PM read-only / write-lock), **Track S**
(actual spool tracking dashboard), **Track K** (real iso lifecycle), and **Track C/H**
(real report/export generation). PM matrix intentionally stays watcher-oriented:
no weld editing, no NDE result entry, no batch assignment.

**Gap triage (consolidated):**

| #   | Function                         | St  | Pr  | Decision | Track   |
| --- | -------------------------------- | --- | --- | -------- | ------- |
| B1  | Morning notification review      | ⚠   | P1  | build    | Track J |
| B2  | Fabrication dashboard monitoring | ✅  | P1  | build    | —       |
| B3  | Erection dashboard monitoring    | ✅  | P1  | build    | —       |
| B4  | Spool Tracking dashboard         | ❌  | P1  | build    | Track S |
| B5  | NDE bottleneck check             | ⚠   | P1  | build    | Track N |
| B6  | Testpack RFT homepage            | ✅  | P0  | build    | —       |
| B7  | Testpack Explorer drill-down     | ✅  | P0  | build    | —       |
| B8  | Release worklist popup / export  | 🧪  | P1  | build    | Track H |
| B9  | Weekly fab / summary reports     | 🧪  | P2  | build    | Track C |
| B10 | Client handoff reports           | 🧪  | P1  | build    | Track H |
| B11 | PM read-only deep-dive           | ⚠   | P0  | build    | Track J |
| B12 | Spooling pipeline health         | ⚠   | P1  | build    | Track K |

**Design gap flag:** в текущем коде `project_manager` имеет тот же
edit-access что и `qc_engineer` на многих screens. Это **gap** против
EasyPiping role design. Track J (Subcontractor scope) — естественное
место заодно сузить PM до read-mostly. Sub-task для Track J:
_PM write-lock на progress entry screens, retain only filter/export/
drill-down actions._

---

### C. Function → Screen → Interaction

| #   | St  | Функция                                  | Экран                                 | Что нажимает / делает                                                                                                                                             |
| --- | --- | ---------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ⚠   | Утренний обход                           | `/` (Home)                            | Открывает app → видит notifications feed → клик на warning → deep-link на problem screen → back. **Сейчас:** feed есть, но no acknowledge/archive/grouping logic. |
| B2  | ✅  | Fab health check                         | `/fabrication/dashboard`              | Смотрит KPI tiles + 8-tile funnel widget → клик на stage tile → stage screen с filtered context.                                                                  |
| B3  | ✅  | Erection health check                    | `/erection/dashboard`                 | То же что B2 для erection side: KPI tiles + funnel (To Site → Erected → Welded/Bolted → Supported → RFT) + per-system progress.                                   |
| B4  | ❌  | Spool location overview                  | (no route — planned `/tracking`)      | Planned: map/table where physically each spool is; filters for inconsistency flags and transit-out warnings. **NOT IMPLEMENTED.**                                 |
| B5  | ⚠   | NDE bottleneck check                     | `/nde`                                | Filter chips → oldest pending batches → row click → batch detail. **Сейчас:** batch operational list есть; dedicated PM trend dashboard отсутствует.              |
| B6  | ✅  | Testpack RFT pursuit overview            | `/testpack/pressure-test`             | Видит RFT pursuit overview для pressure-test phases и понимает bottleneck by phase.                                                                               |
| B7  | ✅  | Drill-down "что блокирует TP-205"        | `/testpack/explorer`                  | TP row click → Release Tracking tab → clickable RFT gate numerics / detail inspection.                                                                            |
| B8  | 🧪  | Read worklist popup                      | Release Work Dialog popup             | Клик на RFT numeric → popup со списком конкретных welds/joints/items → Excel export. **Сейчас:** export is mock-toast, not real file generation.                  |
| B9  | 🧪  | Weekly fab report для client meeting     | `/reports`                            | Category filter "Fabrication" → report row → Download → mock-toast. **Сейчас:** report shell only.                                                                |
| B10 | 🧪  | NDE acceptance rate / handoff reports    | `/reports`                            | Category "NDE" / "Testpack" → report row → Download. **Сейчас:** mock reports, no dossier-grade §20 generation.                                                   |
| B11 | ⚠   | Read-only deep-dive в weld для контекста | `/fabrication/weld-progress` etc.     | Filter by problem spool → side panel opens. **Сейчас:** PM read-only mode не enforced; fields/actions still editable according to current app role model.         |
| B12 | ⚠   | Spooling pipeline health                 | `/spooling`, `/spooling/iso-workflow` | Проверяет KPI cards, Latest/Issues/History from demo import. **Сейчас:** no real transmittal receipt / checkout / hold state machine.                             |

---

### D. Deep dive — user stories

Самые важные функции для PM: **B1** (utреннюю notifications проверку
делает каждый день) и **B7** (drill-down Release Tracking — это
"мускул" RFT-pursuit, без него PM не может реально управлять
готовностью TP к hydrotest).

---

#### Story для B1: Утренний обход — что горит сегодня

**Context:** Anna открывает приложение в понедельник утром. У неё 47
test pack'ов в графике на этот месяц. За weekend NDE lab закрыла 12
batch'ей результатами, в пятницу вечером Line Check team выдала 3
walkdown report'а с punch items.

**Happy path:**

1. Anna открывает app → landing на `/`
2. Notifications feed отсортирован по severity (red → amber → blue)
3. Top notification (red): _"BTH-105: 3 welds rejected — TP-205 RFT blocked"_
4. Клик → deep-link на `/nde/BTH-105`
5. Видит batch detail: 3 rejected welds с rework codes
   (RW-002 Crack × 2, RW-005 Lack of fusion × 1)
6. Делает мысленную пометку: "позвонить QC engineer Maria,
   обсудить rework planning"
7. Browser back → Home
8. Next notification (amber): _"TP-209: 2 Cat-X items blocking —
   assigned to FT-02 Finishing Team"_
9. Клик → `/testpack/pressure-test/item-clearance/progress` filtered by TP-209
10. Видит что FT-02 взяла на себя 2 item'а, но ни один ещё не cleared
11. Записывает себе в личный план: "позвонить FT-02 leader"
12. Back → Home
13. Next notification (blue / info): _"SP-PG-001-A-03 ready for delivery
    to site"_ — это успех, никаких действий не нужно
14. Финал: клик на header link "Testpack" → `/testpack/pressure-test`
15. Видит overall picture: Ready 12 / Ongoing 5 / Done 30 — нормальный
    темп для понедельника

**Edge cases (status-conditional):**

- **Если notification feed пустой** (idle state): на месте feed
  показан banner _"All clear — no blockers in last 24h"_. Редкое
  состояние; обычно есть amber notifications.

- **Если notification уже acknowledged QC engineer'ом ранее**: на
  notification есть chip _"Acknowledged by Maria (QC) · 2h ago"_.
  Anna понимает что вопрос в работе, не звонит дублирующе. Это сейчас
  не реализовано в коде — planned для Track J / future enhancement.

- **Если notification про TP, не входящий в её zone of responsibility**
  (multi-PM проект): на multi-tenant pilot будет filter chip
  "My TPs only" (по subcontractor scope или project-area). В demo
  режиме PM видит всё — это OK для demo, но flag для Track J.

- **Если notification устаревший** (старше 14 дней + acknowledged):
  в feed помечено chip _"Archived"_, по умолчанию скрыто. Filter
  "Include archived" показывает. Не реализовано сейчас.

- **Если NDE rejection cascade продолжается** (после Anna увидела
  BTH-105, через 30 минут пришёл BTH-106 с теми же welder'ами):
  система должна group'ить notifications: _"BTH-105, BTH-106: 5 welds
  rejected (same welder WLD-099 × 4) — pattern detected"_. Это
  planned для Track N (NDE upgrade) — penalty shoot trigger pattern.

---

#### Story для B7: Drill-down "что именно блокирует TP-205"

**Context:** TP-205 был запланирован на hydrotest в этот четверг.
Сегодня среда утром. Anna проверяет: всё ли реально готово, или
есть скрытые блокеры? Hydrotest нельзя начать если хотя бы один из
RFT gates не закрыт.

**Happy path:**

1. Anna → `/testpack/explorer`
2. Filter by system "SYS-002 Process Gas" / location "Block A" →
   находит TP-205 в таблице
3. Клик на TP-205 row → entries level navigation, breadcrumb
   обновляется на "System → Subsystem → TP-205"
4. Видит 4 tabs над details: General / Release Tracking /
   Operation Management / Progress Status
5. Клик на **"Release Tracking"** tab
6. Видит 8 кликабельных нумериков (the RFT gate breakdown):
   - Joints to be welded: **0** ✓
   - Flanges to be bolted: **0** ✓
   - Joints awaiting NDE: **0** ✓
   - ISOs to complete: **0** ✓
   - ISOs to return from line check: **0** ✓
   - Items Cat-X to clear: **1** ⚠️ ← блокер!
   - ISOs to QC release: **0** ✓
   - ISOs ready for test: **4 / 5** ← не все RFT
7. Клик на "1" (Items Cat-X to clear) — открывается popup
8. Видит punch item:
   `PI-009 · Cat X · ISO-1004 · originator LC-01 ·
opened 2026-05-15 · assigned to FT-02 · status Open`
9. Anna теперь знает причину: ждёт FT-02. Звонит FT-02 leader
   (телефон, не в приложении), выясняет: _"closure будет завтра
   к 14:00, инспектор уже в пути"_
10. Закрывает popup → клик на **"Progress Status"** tab
11. Видит % completion по 4 категориям:
    Construction **100%** · Line check **100%** · Testing **0%** ·
    Reinstatement **0%**
12. Решает: четверг как hydrotest target сохраняем. Записывает в
    swag plan: "follow up FT-02 на завтра 14:00, готовлю hydrotest
    crew на чтв 09:00".

**Edge cases (status-conditional):**

- **Если TP-205 имеет несколько Cat-X items** (например 3): popup
  показывает все, отсортированные по age (старейший сверху). Manager
  сразу видит самый старый blocker — это типично "тот, который
  упустили".

- **Если TP-205 ещё в Construction phase** (isosToComplete > 0):
  кнопки в Operation Management tab disabled с tooltip
  _"Cannot set testing dates until RFT achieved"_. Это enforcement
  RFT gate (CC-18). Manager не может пере-prom'ить расписание в
  обход реальности — это **по дизайну**, защищает от wishful
  thinking при планировании.

- \*\*Если в Release Tracking нумерик "isosToReturnFromLineCheck"

  > 0\*\* (line check assigned, не вернулся): нумерик amber, клик
  > показывает который ISO и какой LC team. Типичный pattern когда
  > LC team взяла walkdown но ещё не сдала report (на бумаге уже
  > готов, в систему не вбит).

- **Если TP-205 уже Tested** (testingDoneDate set): Release Tracking
  tab показывает все нули, статус TP = _"Testing Complete"_. Manager
  переключается на Reinstatement progress — видит flange Y joints
  requiring reinstatement, статусы per joint.

- **Если Anna кликает на нумерик "ISOs Ready For Test: 4 / 5"**:
  popup показывает все 5 ISO в TP-205 с их статусами. 4 со статусом
  RFT (зелёные badges), 1 со статусом _"Awaiting Cat-X clearance"_
  (amber). Это тот же ISO-1004 что и в Cat-X popup — **cross-reference
  сходится**. Это хорошая validation для PM: один и тот же blocker
  виден из двух разных мест.

- **Если в Spooling есть HOLD на одном из ISO для TP-205** (engineering
  готовит новый Rev 3 incoming): banner на верху TP detail
  _"⚠️ ISO-1004 held by Engineering team — incoming Rev 3 will affect
  this testpack. Hold opened 2026-05-19."_. Manager должен
  переоценить hydrotest target. Сейчас не surface'ится — будет
  реализовано когда сделаем Track K (Iso lifecycle state machine).

- **Если PM пытается переключить subcontractor на screen где он
  ограничен** (после Track J): subcontractor dropdown disabled,
  показывает "All subcontractors" (PM scope), не один. Это инверсия
  ограничения для Subcontractor роли.

- **Если TP-205 уже Reinstated и closed** (final handoff to client):
  banner _"Test pack handed over to [Client name] on 2026-XX-XX —
  view-only"_. Никаких action buttons, чисто audit view.
