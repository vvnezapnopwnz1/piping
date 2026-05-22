# PipeQC Roadmap v3 — module-by-module, по производственной последовательности

> **Зачем v3.** v2 был построен capability-first (8 cross-cutting треков:
> A / J / N / K / H / S / C / P). Это правильно архитектурно, но плохо
> для понимания продукта: пользователь не видит "как живёт один модуль
> от начала до конца". v3 переставляет ту же работу в порядке физического
> производства — Admin → Spooling → Fabrication → NDE → Erection →
> Spool Tracking → Test Pack — и каждый модуль закрывает целиком прежде
> чем перейти к следующему. Cross-cutting нити (scope lock, PM write-lock,
> notifications, reports, PDF) тоже работают по модулям: они "приземляются"
> в первый модуль где появляются, и переиспользуются в следующих.

> **Source of truth:** `docs/role_matrix/*` + `presentation_findings.md`
> + текущее состояние main (`docs/PIPEQC_CONTEXT.md` merge log).

---

## 1. Контекст: производственная цепочка vs. карта модулей

Объяснение от другого агента описывает **5 шагов физического производства**
+ невидимый шаг 0 (admin setup). Цепочка:

```
0. Admin Setup → 1. Spooling → 2. Fabrication → 3. NDE (shop) →
   4. Erection → 5. NDE (field) → 6. Spool Tracking → 7. Test Pack
```

Важный нюанс: **NDE в этой цепочке появляется дважды** — для shop welds
(после Fab) и для field welds (внутри Erection). В коде PipeQC NDE —
**один модуль**, который обслуживает оба источника (`source: 'shop' |
'field'` уже введено в G6 / E2.4). То есть в roadmap мы строим NDE
один раз, между Fabrication и Erection, и переиспользуем для field
welds в Erection phase.

Поэтому итоговый порядок phases в roadmap **семь модулей, не восемь**:

```
Phase 0: Admin
Phase 1: Spooling
Phase 2: Fabrication (Shop)
Phase 3: NDE Management (вся NDE логика — общая для shop и field)
Phase 4: Erection (Field) — reuse Phase 3 для field welds NDE
Phase 5: Spool Tracking
Phase 6: Test Pack
Phase 7: Cross-cutting polish (Reports, PDF forms, notifications, edge cases)
```

---

## 2. Cross-cutting нити — куда они приземляются

Шесть механик работают на нескольких модулях. Чтобы не делать их
дважды, каждая нить **строится в одной phase и переиспользуется в
последующих**:

| Нить | Где строится впервые | Где переиспользуется |
| --- | --- | --- |
| Subcontractor scope lock (CC-4) | Phase 1 (Spooling — первый screen с subcontractor dropdown) | Phase 2, 3, 4, 5, 6 |
| PM write-lock | Phase 2 (Fabrication — первые progress entry screens) | Phase 3, 4, 5, 6 |
| NDE rework cascade + tracer | Phase 3 (NDE) | Phase 4 (field welds) |
| Welder qualification soft alert | Phase 2 (Fabrication weld entry) | Phase 4 (Erection field weld entry) |
| Heat number traceability | Phase 2 (Fabrication material check) | Phase 4 (Erection field material check) |
| Notification system upgrade | Phase 7 (polish — не блокер для модулей) | глобально |

**Правило:** в каждой module phase секция "Cross-cutting touches"
явно перечисляет какие нити в этой фазе **строятся**, какие
**переиспользуются**, и какие **пока не нужны** (откладываются).

---

## 3. Текущее состояние модулей (что уже live на main)

Снимок на 2026-05-21 по `docs/PIPEQC_CONTEXT.md` merge log:

| Модуль | Текущий статус | Что merged | Что осталось |
| --- | --- | --- | --- |
| **Admin** | ⚠ partial — B1+B2 read-only | Teams / Subcontractors / Welder Qualifications tabs (CRUD на 3 из 7); WPS / NDE Matrix / Rework Codes / Joint Categories read-only display | 14 функций из system_admin matrix остаются partial / planned / missing. **В работе у другого агента (concurrent).** |
| **Spooling** | ⚠ partial — D + IA1 | `<SpoolingView>` с demo import + validation/revision panels; sidebar restructure (Home / Engineering In / ISO Workflow / Spooling Out); persisted store | 7 из 12 функций missing (transmittal receipt, checkout, multi-round check, holds, outbound batch, real SpoolGen parser, Marian, Browser, S-curve dashboard) |
| **Fabrication** | ✅ substantial — F1-F3 + G1-G6 | Weld Progress, Dashboard funnel (live KPIs), Material Check, QC Release, Paint, Laydown — Track G complete (7/7 stages live); sidebar realigned to §7 peer sections; shop-only filter on weld-progress | Welder qualification soft alert (B14), Heat number → PML validation (B2 deeper), PWHT release flow (B13), explicit 4-item QC release checklist (B3) |
| **NDE** | ⚠ partial — N1-N3 | Create Batch wizard; per-weld Receive Results (но bulk-accept behaviour); source filter Shop/Field; basic batch list | Real per-weld Accept/Reject dialog с defect codes (B3), Rework cascade R1/R2/R3 (B5), Tracer T1/T1-1/T2-1 (B6), Penalty Shoot (B6), Examination History timeline (B14), Issue Examination PDF (B8), 8 NDE reports (B10), 4 welder monitoring reports (B11), dedicated /nde/dashboard (B12) |
| **Erection** | ✅ substantial — E2.1-E2.5 + I1-I7 | Erection store persistence; field-weld page; live dashboard funnel; To Site receipt; Erected; Welded/Bolted; Supported; RFT auto-derivation; Field Material Check; Send Field Weld to NDE | Reuse Phase 3 NDE upgrade для field welds; scope lock applied; PM write-lock applied |
| **Spool Tracking** | ✅ shell — /tracking exists | Базовая страница `/tracking` существует, но это shell без deep dashboard | Yard / shop map view (B4 deeper), inconsistency flags + transit-out, movement audit log, scope lock applied, barcode export Zebra (defer) |
| **Test Pack** | ✅ substantial — A1-A6 | Pressure Test homepage + 8 sub-screens: Line Check (prep+progress), Item Clearance (prep+progress), Blinding (prep+progress), Testing & Pre-comm, Reinstatement; Explorer live gates (release tracking); flange Y/Z reinstatement | Testpack Builder (H1 — manual ISO selection), Flange Torquing → RFT linkage (H2), Dossier Handover PDF (H4), Client examination coordination (H5), Release Tracking drill-down extension к gates 1-3 stubs (H6) |
| **Reports** | ✅ shell — C1 | `/reports` shell с 12 mock rows | Real generation (8 NDE + 4 welder monitoring); per-welder/per-sub acceptance rate (C3); dedicated NDE dashboard (C4); spooling reports (C5); PM weekly fab summary (C6) |

Summary: 3 модуля substantial (Fab / Erection / Test Pack), 2 partial
(Admin / Spooling), 2 shell-only (Spool Tracking / Reports), 1 partial
с критичным domain gap (NDE — bulk-accept вместо per-weld).

---

## 4. Phases

### Phase 0 — Admin Setup (concurrent, в работе у другого агента)

**Бизнес-контекст.** "Перед стройкой нужно сказать системе: какой
проект, какие сварочные процедуры (WPS) разрешены, какие сварщики
квалифицированы на какие WPS, какие subcontractors участвуют, какая
NDE Matrix (сколько процентов сварных швов идёт на рентген по каждому
service class), какие heat numbers (партии металла) разрешены".
Без этого setup'а в Phase 1 (Spooling) некуда импортировать ISO —
нет referential на которые сослаться.

**Что строим.** Полный CRUD по 9 ключевым referentials. Без чего
дальше нельзя двигаться:

| Slice | Что | Closes | Зачем критично для следующих phases |
| --- | --- | --- | --- |
| 0.1 | Project Definition form + persist + project switcher | sa.B1, sa.B2 | identity всего проекта; activity code, owner/contractor, max transit time |
| 0.2 | WPS CRUD (add / edit / supersede) | sa.B5 | Phase 2 weld entry dropdown — список разрешённых WPS |
| 0.3 | Welder Qualification CRUD + expiry banner | sa.B5, qc.B14 | Phase 2 welder dropdown filtered by qualification valid date + material + position |
| 0.4 | **NDE Matrix CRUD (sampling % edit) + audit trail** | sa.B6, sa.B15 (P0) | Phase 3 Create Batch wizard читает sampling % отсюда; Penalty Shoot полагается на корректный matrix |
| 0.5 | Subcontractor + PDS Area editor (assignment matrix) | sa.B4 | Phase 1 scope lock берёт `subcontractorId × pdsAreaFilter` отсюда |
| 0.6 | Project Piping Material List + heat number registry | sa.B7, qc.B2 | Phase 2 Material Check валидирует heat numbers против этого registry |
| 0.7 | System Referential CRUD (Material Type / Film Qty / UT Calc / Torquing) | sa.B3 | Cross-project master data, low frequency но широко используется |
| 0.8 | Rework Codes / Service Class / Joint Cat CRUD | sa.B8 | Phase 3 rework dialog читает rework codes отсюда |
| 0.9 | Testpack team refs CRUD (Blinding / Finishing / Reinstatement / Line Checker) | sa.B9 | Phase 6 prep screens читают team dropdowns отсюда |

**Cross-cutting touches.** Phase 0 ничего не строит из cross-cutting
нитей — Admin module sees scope lock как "subject" (admin настраивает
другим), не как "object" (сам admin не scoped).

**Defer / out of scope.** Import Settings (sa.B13 — 3 core Excel
templates) переносится в Phase 7 — это niche feature, не блокирует
демо. Project archive (sa.B16) — Phase 7. Import Spooling Images ZIP
(sa.B14) — defer indefinitely.

**Closure criteria.** Все 9 slices merged, system_admin matrix
обновлена: 9 функций ✅ live (вместо 0/16 на старте), 5 ⚠/📋 remain
(Phase 7 candidates), 2 ❌ deferred. PR-checkpoint после завершения
Phase 0 — нужен для синка с этим документом.

---

### Phase 1 — Spooling: Engineering Handoff

**Бизнес-контекст.** Engineering office рисует завод в 3D, генерирует
isometric'и (ISO) и режет их на spools. SpoolGen экспортирует 4 текстовых
файла (`weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt`) с метаданными:
номера ISO, spools, welds, sizes, materials. Spooling Team в PipeQC
**принимает эти файлы**, проверяет на ошибки, обрабатывает revisions
(R0 → R1 → R2 — engineering меняет чертёж после первой выдачи), и
формирует исходящие transmittal'ы на стройку — пачки ISO которые
готовы к производству в Fab Shop.

Если в Spooling есть холд (Engineering hold по техническим вопросам,
или Spool Team hold по drafting issues) — spool не уходит дальше и
блокирует downstream.

**Текущее состояние.** Есть demo import (mock parser), validation
table, revision conflict panel, persisted store. Sidebar разделён на
4 sub-страницы (Home / Engineering In / ISO Workflow / Spooling Out)
по IA1. Но 3 из 4 sub-страниц — placeholders.

**Что строим:**

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 1.1 | Engineering Transmittal receipt screen (batch metadata + iso list) | sp.B3 ❌→✅ | §6 Spooling |
| 1.2 | Iso state machine + Checkout to spooler (assignment к junior/mid drafter) | sp.B4 ❌→✅ | §6.5 Manual revision mgmt |
| 1.3 | Multi-round checking (round counter, reject reasons, re-review loop) | sp.B5 ❌→✅ | §6.5 |
| 1.4 | Hold management (Spool Team hold vs Engineering hold, reason + holder, release SLA) | sp.B6 ❌→✅, pm.B12 ⚠→✅ | §6.5 |
| 1.5 | Outbound transmittal to site (batch grouping by PDS area + Spl. Trans. No.) | sp.B7 ❌→✅ | §6.1 |
| 1.6 | Revision cascade impact analysis (R0→R1→R2 с affected spools/welds preview) | sp.B2 ⚠→✅ | §6.5 |
| 1.7 | Spooling Home dashboard — S-curve + live activity feed (per CC-23) | sp.B11 ⚠→✅, pm.B12 ⚠→✅ | §6.6 dashboard |

**Cross-cutting touches.**
- **Scope lock (CC-4)** — строится впервые здесь, потому что Spooling
  имеет subcontractor dropdown на Engineering Transmittal receipt
  (e.g. "Engineering Office Reliance" vs "Engineering Office MEL").
  Закладываем механизм filter selector + dropdown disable в общий
  `lib/scope-lock.ts`. В дальнейших phases — `import` + apply.
- **PM write-lock** — НЕ строится здесь (Spooling — это spooling team
  scope, PM имеет watcher access по умолчанию).

**Defer.** Real SpoolGen 4-file parser (sp.B1 deeper) — Phase 7 если
будет нужен для pilot. Marian CSV (sp.B10) — Phase 7. Browser
sub-module (sp.B8) — Phase 7. SpoolGen auto-poll (sp.B12) — defer
indefinitely (differentiator, не parity gap).

**Closure criteria.** Spooling matrix обновлена: 8 функций ✅ live,
4 ⚠/📋 в Phase 7. Vertical demo flow: engineering transmittal
received → ISO checked out to spooler → checking round → hold
released → outbound transmittal к Fab Shop. Это полный narrative для
шага 1 ("Загрузка") в объяснении.

---

### Phase 2 — Fabrication (Shop)

**Бизнес-контекст.** Готовый ISO ушёл с outbound transmittal в Fab
Shop. Там цеховой foreman берёт прямые трубы + фитинги (heat numbers
сверяются с PML из Phase 0), варит сваркой по WPS, формирует spool.
После Final QC checklist'а spool готов к покраске, lay-down, и
дальше — на стройку.

**Текущее состояние.** Track G **complete** — все 7 active stages
работают (Material Check / Weld Progress / QC Release / Paint /
Laydown). Sidebar выровнен по §7 peer sections. Shop-only filter
на weld-progress (после G6). Это сильнейший модуль в PipeQC сейчас.

**Что осталось (~4 функции):**

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 2.1 | Welder Qualification soft alert (на weld entry: warning если welder не qualified для WPS / material / position / thickness) | qc.B14 ⚠→✅ | §7.1 + CC-28 |
| 2.2 | Heat Number → PML validation (на Material Check: heat не в PML → red border + error _"Unknown heat — add to PML first"_) | qc.B2 ⚠→✅ | §7.2 + §5.3 |
| 2.3 | PWHT release flow (для thick CS/CrMo joints — после welding но до NDE: PWHT release date, lab confirmation) | qc.B13 ⚠→✅ | §8 Material trace |
| 2.4 | 4-item Shop QC release checklist (Visual / Dimensional / NDE Complete / Heat Traceability — explicit checkboxes) | qc.B3 ⚠→✅ | §9 Spool QC clearance |

**Cross-cutting touches.**
- **PM write-lock** — строится впервые здесь. На всех 7 fab progress
  screens добавляется guard: если role=project_manager → Save buttons
  hidden + read-only banner. В дальнейших phases — pattern reuse.
- **Scope lock (CC-4)** — переиспользуется из Phase 1. Подключаем
  Fabrication weld-progress + material-check + qc-release к scope
  lock selector. Subcontractor видит только spools своих PDS areas.
- **Welder Qualification soft alert (2.1)** — строится впервые
  здесь, в Phase 4 переиспользуется для field welds.
- **Heat Number traceability (2.2)** — строится впервые здесь, в
  Phase 4 переиспользуется для field material check.

**Defer.** Multiple welders per joint (qc.B15 ❌) — schema extension,
niche, Phase 7. NDE 100% override (qc.B16) — admin function, defer.

**Closure criteria.** QC Engineer matrix: 9 функций ✅ live (вместо
5), 3 ⚠ remain (Phase 7 / 3 / 4 reuse). Demo flow: spool delivered →
material check с heat validation → weld entry с welder qual alert →
PWHT (если CS thick) → QC release с 4-item checklist → к Paint /
Laydown.

---

### Phase 3 — NDE Management

> **Flagship phase.** Самая глубокая доменная логика в продукте.
> Это competitive moat — penalty shoot + tracer cascade нельзя
> построить в Excel.

**Бизнес-контекст.** После shop welding (Phase 2) и field welding
(Phase 4) каждый сварной шов должен быть проверен NDE-методом (RT /
UT / PT / MT). Шов попадает в batch (группа из welds одного welder в
одной NDE category). Lab возвращает Accept или Reject per joint. При
Reject — auto-cascade:
- Создаётся `-R1` дубликат joint'а в NDE100 category (100% контроль)
- Все остальные welds в этом batch становятся Tracer (T1)
- При 4-х rejection'ах в batch ИЛИ 2-м уровне tracer (T1-1, T2-1) —
  Penalty Shoot: все remaining welds в batch авто-флипают в SS,
  welder переводится на 100% контроль (status SS).

**Текущее состояние.** Bulk-accept без per-weld dialog. Нет defect
codes. Нет rework cascade. Нет tracer logic. Нет penalty shoot.
То есть все 5 ключевых механик NDE — отсутствуют.

**Что строим:**

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 3.1 | Per-weld Accept/Reject dialog (заменяет bulk-accept) + Defect Code dropdown (POR/CRK/LOF/SLG) + Location of defect input | nde.B3 ⚠→✅, qc.B5 ⚠→✅, sub.B3 ⚠→✅ | §11.5 |
| 3.2 | Rework cascade — rejected weld → welds-store status flip + auto-create `-R1` joint в NDE100 category | nde.B5 ⚠→✅, qc.B6 ⚠→✅ | §11.7 D-quater |
| 3.3 | Tracer logic — first level T1 + second level (T1-1, T1-2, T2-1, T2-2) с auto-creation | nde.B7 ❌→✅, qc.B7 ❌→✅ | §11.7 D-quater |
| 3.4 | **Penalty Shoot auto-trigger** — 4 rejection в batch OR 2nd-level tracer → все remaining welds flip в SS + welder status SS | nde.B6 ❌→✅, qc.B7 ❌→✅ | §11.7 D-quater |
| 3.5 | Examination History per joint — timeline view (original + R1 + R2 + R3 + R4) | nde.B14 ❌→✅ | §11.6 |
| 3.6 | NDE100 vs NDE10/20 dual state machine — separate status enums (H/HS vs S/SS) | nde.B6 deeper | §11.7 D-quater |

**Cross-cutting touches.**
- **NDE logic itself** — строится впервые здесь, в Phase 4
  **переиспользуется без изменений** для field welds (welds-store
  не различает shop / field на уровне cascade).
- **Scope lock** — apply к NDE batch list (sub видит только свои
  batches), per-weld dialog (sub видит только свои welds).
- **PM write-lock** — apply к Receive Results dialog (PM read-only).

**Defer.** Multiple welders per joint (qc.B15) — Phase 7. NDE 100%
override admin function (qc.B16, nde.B13) — Phase 7. Issue Examination
PDF (nde.B8) — Phase 7 (Track P). 8 NDE reports + 4 welder monitoring
reports — Phase 7 (Track C).

**Closure criteria.** NDE Inspector matrix: 8 функций ✅ live (вместо
0). QC Engineer matrix: B5/B6/B7 → ✅. Subcontractor matrix: B3 → ✅
core (scope-locked). Demo flow: weld из Phase 2 sent to NDE → batch
created → lab inspects → per-weld Accept/Reject → on Reject:
auto-cascade R1 + tracers + (eventually) penalty shoot.

---

### Phase 4 — Erection (Field)

**Бизнес-контекст.** Готовые spools везут на стройплощадку. To Site
receipt → Erected (placed on supports) → Welded (field welds сваривают
spool'ы друг с другом) → Bolted (фланцевые соединения) → Supported
(постоянные опоры установлены) → RFT (Ready for Test, auto-derived
когда все условия выполнены). Field welds **идут на тот же NDE
module** что и shop welds (см. Phase 3).

**Текущее состояние.** I1-I7 merged — substantial. Erection store
persisted, dashboard funnel live, все 7 lifecycle stages (Not Started
→ To Site → Erected → Welded/Bolted → Supported → RFT) работают.
Field Material Check работает. Send Field Weld to NDE работает (E2.4).

**Что осталось.** В основном — **подключение cross-cutting нитей**,
а не новый функционал. Erection module практически готов, нужно
applies того что построено в Phases 2-3.

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 4.1 | Apply Welder Qualification soft alert (reuse Phase 2.1 pattern) к Erection weld-progress | qc.B14 для field side | §12 + CC-28 |
| 4.2 | Apply Heat Number validation (reuse Phase 2.2 pattern) к Erection field-material-check | qc.B2 для field side | §12 |
| 4.3 | Apply NDE rework cascade (reuse Phase 3.2-3.4) к field welds — verify field welds with `-R1` suffix correctly cascade | nde.B5+B6 field side | §12 + §11.7 |
| 4.4 | Apply PWHT release к field welds (reuse Phase 2.3) | qc.B13 field side | §12 |
| 4.5 | Apply Field QC release 4-item checklist (reuse Phase 2.4) | qc.B10 ⚠→✅ | §13 |
| 4.6 | Apply PM write-lock и scope lock к Erection screens (reuse) | global | — |

**Cross-cutting touches.** **Это и есть phase — almost вся работа =
reuse.** Уникальной Erection-only логики мало; field vs shop different
location но identical mechanics (per CC-26).

**Defer.** Erection reports (§13) — Phase 7 (Track C).

**Closure criteria.** QC Engineer matrix: B10 → ✅. Все cross-cutting
нити из Phase 2-3 распространены на Erection. Vertical demo: PHS-001
spool To Site → Erected → field weld → NDE batch (field) → cascade
если Reject → field QC release → RFT.

---

### Phase 5 — Spool Tracking

**Бизнес-контекст.** Физический tracking где находится spool в
текущий момент: yard, transit, shop, на стройке. Important для PM
(spool overdue в transit > max transit time → red flag) и для
subcontractor (свои spools, свой area). Per CC-8 — subcontractor
owns barcode scanning + area mapping.

**Текущее состояние.** `/tracking` route существует как shell.
Никакой реальной visualization. PM matrix B4 = ❌ missing.

**Что строим:**

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 5.1 | `/tracking` dashboard с KPI strip (Total Spools / In Yard / In Transit / At Site / Overdue) + filter chips by area / status | pm.B4 ❌→✅ | §10 |
| 5.2 | Yard / shop map view — visual location markers per spool, group by yard location code (Y1, Y2, ...) | pm.B4 deeper | §10 |
| 5.3 | Inconsistency flags + transit-out warnings (overdue per max transit time setting from sa.B1) | gap_map_v1 capability #4 | §10 |
| 5.4 | Movement audit log (Location OUT / Location IN history per spool) | sub.B8 ❌→✅ | §10 |
| 5.5 | Apply scope lock к Spool Tracking (sub видит только свои PDS areas) | reuse Phase 1 nit | sub.B8 |

**Cross-cutting touches.** Reuse scope lock from Phase 1.

**Defer.** Barcode export to Zebra label printer (low ROI). PDA
scanning offline (sub.B10) — defer indefinitely.

**Closure criteria.** PM matrix B4 → ✅. Spool Tracking visually
alive at demo. Sub matrix B8 → ✅.

---

### Phase 6 — Test Pack

**Бизнес-контекст.** Финальная сдача. Группируешь связанные ISO в
testpack (контур который можно опрессовать одним хитом). Line Check
(ходишь ногами, ищешь дефекты → punch items X/Y/Z). Item Clearance
(закрываешь X — block для теста). Blinding (заглушки). Testing
(гидравлика). Reinstatement (снимаешь заглушки, ставишь permanent
prokladki).

**Текущее состояние.** A1-A6 merged — substantial. Все 5
preparation+progress sub-screens работают. Explorer live gates. Это
второй сильнейший модуль после Fabrication.

**Что строим:**

| Slice | Что | Closes | Manual ref |
| --- | --- | --- | --- |
| 6.1 | Testpack Builder — ручная сборка testpack из дерева ISO + system / sub-system mapping (manual entry за пределами explorer) | pm.B7 deeper, new | §15 Testpack mgmt |
| 6.2 | Flange Torquing → RFT linkage (closed bolted joints → RFT eligibility gate I9) | gap_map_v1 capability #2 | §19.2 |
| 6.3 | Pressure Test nested navigation polish (sub-sections breadcrumbs + state machine refinement) | (manual §17 alignment) | §17 |
| 6.4 | Client examination coordination — owner's rep sign-off на N2 results (CC-N5) | nde.B11 owner workflow | §11.6 |
| 6.5 | Release Tracking drill-downs upgrade — extend gates 1-3 stubs to real (3 stub gates в Explorer Release Tracking tab) | pm.B7 deeper | §18.2 |
| 6.6 | Apply PM write-lock + scope lock к Test Pack screens (reuse) | global | — |

**Cross-cutting touches.** Reuse all nits.

**Defer.** Dossier Handover PDF (pm.B10) — Phase 7 (Track P). Dossier
зависит от готовности Track P PDF generation infrastructure.

**Closure criteria.** PM matrix B6/B7 → ✅. PM matrix B10 still 🧪
(Phase 7). Testpack Builder live, Flange→RFT linkage closed, Pressure
Test polished. Full e2e demo flow closed: engineering → fab → NDE →
erection → tracking → testpack → ready for handover.

---

### Phase 7 — Cross-cutting polish

Всё что НЕ блокирует модульный narrative, но добавляет enterprise
maturity:

**7.A — Reports module (Track C).** 8 NDE management reports
(Batch status, Radiographic, Outstanding Repairs, Service class,
Spool-wise, Outstanding NDE, RT film qty, **Weld History sheet**)
+ 4 welder monitoring reports (Perf Control Sheet, Rej & Repaired,
Rej & Tracers, Batch status per welder) + real per-welder/per-sub
acceptance rate computation + dedicated `/nde/dashboard` + Spooling
reports + PM weekly fab summary. Closes nde.B9/B10/B11/B12 + sp
reports + pm.B9. ~6-8 slices.

**7.B — PDF / Print / Forms (Track P).** W24 (Welding daily progress
per spool), Issue Examination Program (CC-17 dispatch к lab, unique
Request No), QC13 (Spool Final QC clearance form), W10P (Welding NDE
clearance per joint), Generate Work Order PDF, Release worklist
Excel export, **Dossier Handover PDF** (Weld History + NDE Clearance
+ Punch lists в единый print form per §20). Closes pm.B8/B10, sub.B9,
nde.B8, qc field forms. ~6 slices.

**7.C — Notification system upgrade (J-6).** Acknowledge / archive /
grouping by severity / role-routing. Closes pm.B1. 1 slice.

**7.D — Remaining Admin polish.** Import Settings 3 core templates
(sa.B13). Project archive (sa.B16). Remaining sub-tabs (sa.B14
Import Spooling Images ZIP — может быть defer indefinitely).

**7.E — Remaining Spooling depth.** Real SpoolGen 4-file parser
(sp.B1). Marian CSV (sp.B10). Browser sub-module (sp.B8). SpoolGen
auto-poll (sp.B12 — defer).

**7.F — NDE edge cases.** Multiple welders per joint (qc.B15).
NDE 100% override admin function (qc.B16, nde.B13). Activity-type
scope filter (NDE sub vs Fab sub vs Erection sub).

**7.G — Roles.** Project Reader role implementation (read-only across
all modules — CC-3 unmapped tier).

Phase 7 — это **backlog**, не sequential roadmap. Slices берутся
в зависимости от feedback после live demo. Ожидаемый объём — 20-25
slices если делать всё; minimum-viable enterprise pilot — 10-12
slices (7.A core + 7.B core + 7.C + 7.G).

---

## 5. Critical path для демо

Если demo через ~1 месяц, **минимально достаточно**:

```
Phase 0 (Admin) → Phase 3 (NDE upgrade) → Phase 4 reuse →
[Phase 2 cross-cutting nit injection] → polish
```

Это 0.1-0.9 + 3.1-3.4 + 4.1-4.6 + 2.1+2.2+PM write-lock = ~20 slices.
Phases 1 (Spooling deep), 5 (Spool Tracking), 6 (Test Pack new
features), 7 (polish) — могут идти параллельно или после демо если
feedback это требует.

**Если demo блочный (только core domain story)**, минимум:

```
Phase 0.4 (NDE Matrix CRUD) → Phase 3.1-3.4 (Penalty Shoot end-to-end)
```

7 slices. Закрывает flagship demo moment (CC-N4) с настраиваемой
sampling rate.

---

## 6. Что в roadmap **не входит** (явный reject)

Из presentation_findings и matrices:

- **PDA construction surveillance checklists (CC-30)** — Easy Piping
  никогда не построил это. PipeQC differentiator candidate (future
  mobile track), не parity gap. Не строить как Easy Piping.
- **Assembly как отдельный duplicated module** — Easy Piping дублировал
  Erection. PipeQC использует `stage = assembly | erection`. Решено
  архитектурно в IA1, не строить отдельный module.
- **All Preparation screens для всего подряд (Spool / Welding /
  Flange Preparation)** — Easy Piping построил только NDE Preparation,
  остальное structural promise. Не строить пустые страницы.
- **Real SpoolGen auto-poll connector (sp.B12)** — differentiator
  на pitch slide, не demo-критичен. Defer indefinitely.
- **Barcode export to Zebra label printer** — industry parity, ничего
  не добавляет визуально. Defer indefinitely.

---

## 7. Backlog hygiene rules (carry over from v2)

1. **Каждый slice** ссылается на конкретный B-номер в matrix. Если
   slice ни на что не ссылается — это tech debt, не доменная функция.
2. **При merge slice** соответствующая matrix function обновляется:
   статус ⚠/❌/📋 → ✅ live, + ссылка на merged slice в Source.
3. **Каждые 4-6 недель** — coverage check: пройти все 6 матриц,
   проверить что новых missing функций не появилось из дальнейшего
   reading presentation_findings.md (особенно presentations #8-10
   которые ещё не прочитаны полностью).
4. **Module closure criteria** — phase считается closed когда matrix
   coverage достигает threshold (например ≥70% функций ✅ live для
   modules с substantial work, ≥50% для shells).

---

## 8. Open questions

- **Phase 0 scope checkpoint** — другой агент работает над Admin
  module. Какие именно slices (0.1-0.9) он закрывает в текущем
  sprint? Нужен sync после его finish, чтобы Phase 1 начался без
  blocking dependencies.
- **NDE Matrix CRUD (0.4)** — это **P0 для всего**. Phase 3 (Penalty
  Shoot) без editable matrix теряет half the demo punch. Подтвердить
  что 0.4 включён в текущий sprint Admin agent'а.
- **PM write-lock в Phase 2** vs **отдельная Phase для всех roles** —
  в v2 это был отдельный Phase II. В v3 PM write-lock встроен в Fab
  как cross-cutting nit. Альтернатива — выделить J-track в отдельный
  pre-phase между Phase 0 и Phase 1. **Решение to be confirmed.**
- **Phase order vs critical path** — формально Phase 1 (Spooling
  deep) идёт раньше Phase 3 (NDE), но для demo critical path Phase 3
  важнее. Если capacity ограничен — можно делать Phase 0 → Phase 3 →
  Phase 1 → Phase 4 → ..., нарушая strict sequential order но
  сохраняя dependency integrity.

---

> **Next action.** Confirm Phase 0 scope с Admin agent, затем выбрать
> между: (a) strict sequential — Phase 1 next, или (b) demo critical
> path — Phase 3 next.
