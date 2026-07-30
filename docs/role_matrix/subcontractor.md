> **Matrix discipline:** This role matrix describes target-state PipeQC
> behavior derived from Easy Piping manual + presentation research.
> It is **not** limited to currently implemented app screens.
> Each function tagged with implementation status.
> Triage decisions (Priority / Decision / Track) consolidated in Gap
> triage table at end of B-section — not duplicated per function.
>
> **Status discipline:** ✅ live = route + UI + described interaction +
> state persistence в store. Anything less = ⚠ partial.

## Роль: Subcontractor

> Authorization note: Subcontractor is restricted; commands require explicit functional roles and subcontractor/PDS scope, not automatic QC and NDE access.

**One-line:** Restricted Project Editor с forced scope lock (CC-4). NDE
subcontractor (BV / SGS / TÜV / Intertek) или Fabrication / Erection
subcontractor — видит только свои PDS areas, только свои batches. Выполняет
те же операции, что QC Engineer и NDE Inspector, но исключительно в рамках
назначенного ему scope. Главная demo-история роли: **CC-4 scope lock** —
когда Subcontractor залогинен, система автоматически прячет/отключает всё
не-своё.

**Lifecycle scope:** Активен с момента первого assigned batch / spool в
своём scope до завершения своей sub-scope. NDE subcontractor — с первого
выданного RT/UT batch до последнего rework re-examination. Fabrication
subcontractor — от первого weld в assigned area до QC release всех спулов.
Роль **никогда** не видит полную картину проекта — только свой slice.

**Source:**

- Manual: §3.1 Subcontractor List, §3.4 PDS Area/Subcontractor (scope
  assignment — Admin function, Subcontractor только experiences результат),
  §7 Fabrication (weld progress, material check, QC forms), §11 NDE
  Management (batch receipt, examination results, rework), §9 Fabrication
  Reports (daily progress, welder stats).
- Presentations: #2 Administration CC-3 (_"Restricted"_ tier — below Editor),
  CC-4 (definitive scope lock: _"Subcontractor dropdown lists in all screens
  to be disabled and set the selected value as logged-in subcontractor"_),
  CC-8 SOW matrix (most operational activities = Subcontractor owner: daily
  reports, daily manhours, NDE weld selection, penalty shoot, examination
  program, material traceability, QC forms, barcode scanning, area mapping);
  #4 Fabrication (_"Technip and Subcontractor(s) to work in close
  collaboration"_ — verbatim customer pitch language).
- IA sitemap: Subcontractor has access to CONSTRUCTION section in nav
  (`qc_engineer, nde_inspector, subcontractor, project_manager` — per
  `config/navigation.ts`). No SETUP / PREPARATION sections.
- Code: `role-context.tsx` includes `subcontractor` role. `batches-store.ts`
  has `subcontractor` field on every NDE batch + `useBatchesBySubcontractor`
  selector. Nav confirms CONSTRUCTION visibility. Scope lock mechanism:
  **not implemented** — `subcontractor` in `contexts/role-context.tsx` is
  treated identically to any other role; no forced filtering applied.

---

### A. Real-world responsibilities (вне приложения)

Subcontractor на EPC piping construction project:

- **Daily weld progress reporting** — Fabrication subcontractor ежедневно
  записывает welds выполненные его рабочими: welder code, WPS, root%, cap%,
  foreman confirmation. Это основной daily input — форма QC13 заполняется
  на бумаге в shop'е, потом вбивается в систему его представителем. Per
  CC-8 SOW matrix: _"Daily manhours + progress"_ — Subcontractor owner.
- **Material traceability records** — Subcontractor отвечает за отслеживание
  heat numbers. Per CC-8: _"Material traceability records"_ — Subcontractor
  owner. Его foreman пишет heat # на QC13; представитель sub'а вводит в
  систему, система верифицирует против Project Piping Material List.
- **NDE weld selection (per system suggestions)** — Subcontractor NDE
  определяет какие welds идут в batch в рамках своей area. Per CC-8: _"NDE
  weld selection per system suggestions"_ — Subcontractor owner. PSMS
  (Easy Piping suggestion button) предлагает welds per sampling rules, но
  финальный отбор — Subcontractor/NDE Inspector.
- **Examination program** — NDE subcontractor (BV/SGS/TÜV) генерирует
  формальный examination request (Work Order) для своей lab. Per CC-8:
  _"Examination program"_ — Subcontractor owner. Это printable PDF из
  системы с уникальным Request No.
- **Record NDE results** — после выполнения RT/UT/PT/MT — записывает
  per-weld результаты: Accept (A) / Reject (R). На rejection: Defect Code
  - Location of Defect (required). Per CC-8: _"Progressive sampling /
    penalty shoot"_ — Subcontractor owner (знает об escalation поскольку это
    его batches).
- **QC forms and weld history register** — ведёт paper + digital records
  для клиентского QC. Per CC-8: _"QC forms, weld history register"_ —
  Subcontractor owner. W24 / QC13 / W10P forms — его responsibility
  per-contract.
- **Daily reports** — per CC-8: _"Daily reports (welding, painting, spools,
  NDE)"_ — Subcontractor owner. Смотрит свои stats, не чужие.
- **Barcode scanning + area mapping (Spool Tracking scope)** — если
  sub занимается spool tracking в своём area: barcode scan при transit,
  movement recording. Per CC-8: _"Area Mapping"_ и _"Barcode + scanning"_
  — Subcontractor owner. Ограничен своим PDS area set.
- **Report analysis + productivity calc** — per CC-8: _"Report analysis"_
  и _"Productivity calc"_ — TP + Subcontractor shared. Sub смотрит свою
  performance, не всего проекта.

Ключевая характеристика: Subcontractor — это **operationally identical
to QC Engineer + NDE Inspector**, но со **scope filter на всех экранах**.
Те же actions, те же buttons — но видит только свои spools, только свои
batches, только свою area. Это модель multi-tenant в рамках одного проекта.

---

### B. Application functions (PipeQC scope)

10 функций. Status legend: ✅ live · ⚠ partial · ❌ missing · 📋 planned.

1. **⚠ Scope-filtered weld progress entry** — те же actions что QC Engineer
   B1/B8 (shop/field weld progress), но subcontractor видит только welds в
   своём assigned PDS area. Subcontractor dropdown disabled и forced к его
   ID. Weld entry экраны `/fabrication/weld-progress` и
   `/erection/weld-progress` существуют и функционируют для других ролей.
   **Scope lock не реализован** — Subcontractor сейчас видит всё и может
   выбирать любой subcontractor в dropdown. Core mechanics (weld entry,
   Save, toast) работают. Scope filtering = gap.

2. **⚠ Scope-filtered material check sign-off** — material check по
   spools в своём area (heat numbers → mill cert). Экран
   `/fabrication/material-check` и `/erection/material-check` работают
   для QC Engineer. Subcontractor должен видеть только spools своего
   assigned subcontractor = своего sub ID. **Scope lock не реализован.**
   Material check logic (heat traceability popup) также ⚠ partial (по QC
   matrix B2).

3. **⚠ NDE batch receipt and queue** — получает assigned NDE batch
   (created by QC Engineer, issued to sub). Видит список своих batches:
   только те, где `batch.subcontractor = currentSubcontractorId`. Экран
   `/nde/batches` существует; `useBatchesBySubcontractor` selector
   существует в `batches-store.ts`. **Scope filtering через роль не
   применяется** — сейчас все роли видят все batches. Batch data model
   с `subcontractor` полем корректен, фильтрация по нему не wired к
   роли.

4. **⚠ NDE batch examination progress entry** — `/nde` row action can receive
   results and persist batch status/history, but current flow bulk-accepts all
   welds. Full per-weld Accept / Reject + rework code dialog and rejected-weld
   cascade are not implemented yet.

5. **⚠ Daily progress report access** — просмотр своей дневной статистики:
   welds done, batches status, rejections. Fabrication Dashboard `/fabrication/
dashboard` существует с KPI cards и charts. Subcontractor должен видеть
   только свой slice — по своему sub ID filter. **Сейчас:** dashboard не
   фильтрует по subcontractor — показывает проектные totals. Scope filter
   отсутствует. Структура экрана работает.

6. **⚠ Welder performance report (own welders only)** — статистика по
   welders своего sub'а: rejection rate, tracer count, SS status welders.
   В UI присутствует Welder Performance Log в reports section. **Сейчас:**
   не фильтруется по sub ID — показывает всех welders проекта.
   Subcontractor должен видеть только welders, квалифицированных под его
   sub ID. Scope filter = gap.

7. **❌ Issue examination program (Work Order PDF)** — генерация формального
   examination request для NDE lab. Subcontractor NDE pick'ит joints из
   assigned batch → "Issue Examination Program" → PDF с уникальным Request
   No (auto-assigned) + batch details + inspector assignment + date. Per CC-8
   _"Examination program"_ = Subcontractor owner. Per #4/#6 research:
   это "Issue examination program" в NDE Preparation → 4th sub-function.
   **Не реализовано вообще.** Нет экрана, нет PDF генерации, нет Request
   No assignment. Candidate **Track N**.

8. **❌ Scope-locked barcode scanning / spool tracking** — если subcontractor
   отвечает за spool tracking в своём area: сканирует barcodes при transit
   (out of fabshop, into paintshop, to site), видит только свои area
   locations. Per CC-8: _"Barcode + scanning"_ и _"Area Mapping"_ —
   Subcontractor owner. **Не реализовано:** `/tracking` (spool tracking
   module) сейчас placeholder/missing. Scope lock на spool tracking для
   sub role = track S + track J combined gap.

9. **⚠ QC forms — view own scope** — просмотр QC forms (W24, QC13, W10P)
   для своих spools/joints. Subcontractor должен иметь read access к formам,
   сгенерированным по его scope. **Сейчас:** QC forms как генерируемые
   PDF не реализованы (candidate Track G5). Weld history panel в NDE batch
   detail существует и показывает partial history — частичный просмотр.
   Full form генерация = Track G5.

10. **📋 PDA scanning (offline mobile flow)** — Per CC-8: _"Barcode + scanning"_
    — Subcontractor owner. Offline PDA scan → sync to server. Per CC-12:
    только System Admin и Project Admin могут выполнять offline sync import,
    но **сам scanning** на PDA = Subcontractor. Per CC-3: `PDA User` role
    — отдельный role tier (❌ not implemented). **Planned** как отдельный
    track (Track J / future mobile). Не строить сейчас — PDA User role
    не существует в коде.

**Gap summary:** 0 функций ✅ live, 6 ⚠ partial, 2 ❌ missing, 2 📋 planned.

**Gap density observation:** почти все gaps в этой роли — одной природы:
**CC-4 scope lock не реализован**. Это системная проблема, не точечная.
Если реализовать scope lock (Track J), то B1/B2/B3/B5/B6 автоматически
переходят из ⚠ в ✅ или ⚠+close — без изменения самой бизнес-логики
экранов. Это отличает Subcontractor от QC Engineer или Admin: там gaps =
отсутствующая функциональность, здесь gaps = отсутствующий security layer
поверх уже работающей функциональности. Второй gap cluster: B7 (examination
program PDF) + B8 (spool tracking) — это настоящие missing features,
не связанные со scope lock. Главный track для роли — **Track J —
Subcontractor scope enforcement**, который закроет 5 из 10 функций за один
цикл.

**Gap triage (consolidated):**

| #   | Function                              | St  | Pr  | Decision | Track   |
| --- | ------------------------------------- | --- | --- | -------- | ------- |
| B1  | Scope-filtered weld progress entry    | ⚠   | P0  | build    | Track J |
| B2  | Scope-filtered material check         | ⚠   | P0  | build    | Track J |
| B3  | Scope-filtered NDE batch queue        | ⚠   | P0  | build    | Track J |
| B5  | Scope-filtered daily progress report  | ⚠   | P1  | build    | Track J |
| B6  | Scope-filtered welder perf. report    | ⚠   | P1  | build    | Track J |
| B7  | Issue examination program (PDF)       | ❌  | P1  | build    | Track N |
| B8  | Scope-locked barcode / spool tracking | ❌  | P2  | build    | Track S |
| B9  | QC forms — view own scope             | ⚠   | P2  | build    | Track G |
| B10 | PDA scanning offline                  | 📋  | P3  | defer    | —       |

---

### C. Function → Screen → Interaction

| #   | St  | Функция                           | Экран                                                     | Что нажимает / делает                                                                                                                                                                                                                                                                                                         |
| --- | --- | --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ⚠   | Scope-filtered weld entry         | `/fabrication/weld-progress`, `/erection/weld-progress`   | Открывает экран → **все spool/ISO rows видны только в assigned PDS areas** (scope filter applied) → row click → side panel → welder dropdown (populated with welders of own sub only) → subcontractor dropdown **disabled + forced to "BV"** → WPS / root% / cap% → Save. **Сейчас:** все rows видны, все dropdowns editable. |
| B2  | ⚠   | Scope-filtered material check     | `/fabrication/material-check`, `/erection/material-check` | Same flow as QC Engineer B2 — но видит только spools своего area. Heat number input → validation → Sign off → spool material check status flips. **Сейчас:** scope filter absent.                                                                                                                                             |
| B3  | ⚠   | NDE batch queue (own batches)     | `/nde/batches`                                            | Открывает batch list → видит только batches где `subcontractor = "Bureau Veritas"` (собственный sub ID) → click batch row → batch detail. **Сейчас:** `useBatchesBySubcontractor` selector существует в store но не wired к роли — все видят все batches.                                                                     |
| B4  | ⚠   | NDE result entry                  | `/nde` row action                                         | "Receive Results" persists batch status/history, but currently bulk-accepts all welds. Full per-weld Accept/Reject + defect code dialog and rejected-weld cascade remain Track N gaps, same as NDE Inspector B3.                                                                                                              |
| B5  | ⚠   | Daily progress report             | `/fabrication/dashboard`                                  | Открывает dashboard → KPI cards (welds done, batches, rejections) → все цифры **scope-filtered** к собственному sub area. **Сейчас:** dashboard показывает проектные totals без scope.                                                                                                                                        |
| B6  | ⚠   | Welder performance (own welders)  | Reports section в `/nde` или `/fabrication`               | Открывает welder report → видит только welders квалифицированных под `subcontractor = BV` → rejection rate, tracer count, SS status per welder. **Сейчас:** не фильтруется по sub.                                                                                                                                            |
| B7  | ❌  | Issue examination program         | (no screen — planned `/nde/examination-program`)          | В NDE Preparation → "Issue Examination Program" sub-function → pick NDE category → grid of joints (selected/SS status) → "Print" button → system assigns unique Request No → generates printable PDF: project header, batch #, joint list, inspector name, date, signature block. **NOT IMPLEMENTED.**                        |
| B8  | ❌  | Barcode scanning / spool tracking | (no screen — planned `/tracking` with scope lock)         | Opens spool tracking module → scope filtered to own PDS areas → scans spool barcode (or manually enters) → registers movement: Location OUT / Location IN → history record created (audit-preserving). Inconsistency flags visible for own area only. **NOT IMPLEMENTED.**                                                    |
| B9  | ⚠   | QC forms — view own scope         | weld history panel in `/nde/{batchId}` (partial)          | В batch detail → "Weld History" tab → per-weld history entries (partial). Full form view: click "View W24" → PDF generation of QC W24 for that spool, own sub's scope only. **Сейчас:** weld history partial; W24/QC13 PDF генерация = Track G5.                                                                              |
| B10 | 📋  | PDA offline scanning              | (no screen — future mobile app or mobile web)             | PDA User scans barcodes offline → local queue → sync to server via MCL Link equivalent. Requires `pda_user` role, offline-first app, sync mechanism. **Deferred.** Not building now.                                                                                                                                          |

---

### D. Deep dive — user stories

Самые consequential функции для Subcontractor роли — **B3 + B4** (NDE batch
receipt и result entry — core daily operation для NDE subcontractor) и
**B1** (weld progress entry с scope lock — core daily operation для
Fabrication subcontractor). Выбираем **B3 + B4** как связанный сценарий:
он лучше всего раскрывает CC-4 scope lock pattern и является главным
аргументом для **Track J multi-tenant story**.

---

#### Story для B3 + B4: NDE batch receipt and result entry (Bureau Veritas NDE sub)

**Context:** Bureau Veritas (BV) — NDE subcontractor на проекте. Их
inspector залогинен в PipeQC как `Subcontractor` с assigned scope
`subcontractorId = "BV"`, `pdsAreaFilter = ["AR-2", "AR-3"]`. QC Engineer
создал и выдал batch BTH-2025-0168 (RT, 3 welds в AR-2) — issued to
Bureau Veritas. BV inspector открывает систему утром чтобы принять batch
и ввести результаты вечера прошлого дня.

**Happy path (target-state после Track J):**

1. BV Inspector открывает `/nde/batches`
2. Batch list **автоматически scope-filtered** к BV: только batches с
   `subcontractor = "Bureau Veritas"` показаны — 3 active batches.
   Batches SGS Industrial / TÜV Rheinland **не видны вообще** — не в
   списке, не через поиск.
3. Subcontractor chip/label вверху banner: _"Viewing as: Bureau Veritas
   (AR-2, AR-3)"_ — явное UI подтверждение scope.
4. Click BTH-2025-0168 (status: Issued, RT, 3 welds)
5. Batch detail открывается. Header: Batch №, method RT, issued date,
   **subcontractor = "Bureau Veritas" (disabled chip, не dropdown)**.
6. Click "Receive Results" → panel открывается справа
7. Per-weld table: J-1081 / J-1082 / J-1083 — каждый с радио Accept /
   Reject
8. J-1081: Accept → radio click
9. J-1082: Accept → radio click
10. J-1083: Reject → radio click → сразу appear: Defect Code dropdown
    (POR/CRK/LOF/SLG/UNC/INC/OTH) + Location of Defect dropdown (Root /
    Cap / Fill / Side)
11. Defect Code: `CRK` (Crack), Location: `Root`
12. Inspector signature field: `NDE-INS-04 / BV` (pre-filled or typed)
13. Click Submit → ~700ms → toast _"Results recorded — BTH-2025-0168:
    2 accepted, 1 rejected"_
14. Cascade автоматически:
    - J-1083 статус → Rework (R1 created, new joint J-1083-R1 в NDE100)
    - Remaining welds в batch flip → T1 (tracer status)
    - Batch статус → "Results Received"
    - Notification созданное для QC Engineer: _"BTH-2025-0168: 1 rejection
      by BV, rework dispatched"_
15. BV Inspector возвращается к batch list → BTH-2025-0168 показывается
    как "Results Received" с amber chip

**Edge cases (status-conditional):**

- **Попытка открыть batch другого sub**: BV inspector вручную вводит URL
  `/nde/BTH-2025-0151` (batch SGS Industrial). Ответ: redirect с banner
  _"This batch is not within your assigned scope (SGS Industrial, AR-1)"_ →
  возврат к `/nde/batches`. **Server-side enforcement** — не только UI
  скрытие. **Сейчас:** этого нет — любой role может открыть любой batch.
  Track J must address both UI filtering AND server-side guard.

- **Batch в другой area (BV имеет только AR-2, AR-3)**: QC Engineer
  ошибочно выдал batch с welds из AR-4 к BV. При попытке BV открыть —
  batch не появляется в его list (AR-4 не в его scope). QC Engineer
  видит уведомление _"BTH-2025-0169 issued to BV but contains joints
  outside BV scope (AR-4) — review assignment"_. Это cross-reference
  integrity check между scope assignment и batch contents.

- **Двое BV inspectors, одна зона**: BV отправил двух инспекторов.
  Оба залогинены как `subcontractor / BV`. Оба видят одинаковый batch
  list. Один начинает вводить результаты в BTH-2025-0168. Другой
  одновременно открывает тот же batch → panel показывает banner _"Results
  entry in progress by NDE-INS-04 — changes may conflict. Last updated:
  2 minutes ago."_ Optimistic concurrency warning, не hard lock. Second
  inspector может видеть, но Save показывает diff и требует confirmation.

- **Rejection без defect code**: Inspector кликает Reject для J-1083 и
  пытается Submit без выбора Defect Code. Inline validation: _"Defect
  code required for rejection"_ → Submit disabled. Defect Code field
  получает red border + tooltip. Hard validation — нельзя submit rejection
  без defect code per domain rule (B5 в NDE Inspector matrix).

- **Batch overdue (не введены результаты >N дней)**: BTH-2025-0153
  (MT batch, issued 7 days ago, SGS Industrial — из seed data: _"OVERDUE
  7 days, escalation needed"_). Аналогичная ситуация для BV: если BV
  не вводит результаты в течение configurable threshold (project referential:
  "Unit of time reference") → batch row в list получает red chip _"Overdue
  5 days"_ + PM notification созданное. BV Inspector при открытии видит
  same red chip в header. **Сейчас:** overdue detection нет в коде — seed
  данные имеют comment но no runtime rule. Track N candidate.

- **Penalty shoot trigger (batch-level escalation)**: BV Inspector вводит
  rejection для J-1083-R1 (already a rework joint, so это 2-й rejection
  в batch). Система проверяет: это T1 level → T1-1, T1-2 auto-created AND
  все remaining welds в batch флипают → SS. Banner в batch header:
  _"Penalty shoot triggered — all remaining welds in BTH-2025-0168 now
  awaiting examination (3 joints added to batch)"_. BV Inspector видит
  expanded batch с 3 новыми SS joints. **Сейчас:** auto-cascade логика
  не реализована — Track N flagship feature.

- **NDE subcontractor vs Fabrication subcontractor — разный scope видности**:
  BV = NDE sub. Они видят NDE batches + NDE progress экраны. Они **не
  должны** видеть weld progress entry экраны (это Fabrication sub scope).
  В target-state scope lock — не только по PDS area, но и по activity
  type. BV → NDE sections enabled; Fabrication weld entry disabled или
  hidden. Это более тонкая scope модель чем просто area filter. В Easy
  Piping это решается через scope enum на subcontractor record (из
  `admin-store.ts`: `scope: ['fabrication' | 'erection' | 'lineCheck' |
'blinding' | 'finishing' | 'reinstatement' | 'nde']`). **Сейчас:**
  scope enum в store существует, но не применяется к nav visibility или
  screen access. Track J нужно учитывать этот scope enum как источник
  activity-level filtering дополнительно к area filtering.
