## Роль: QC Engineer

**One-line:** Контролёр сварочного качества shop + field. Принимает решение
"годен / не годен" по weld'у, spool'у и материалу. Подписывает release-точки
от welding до handoff в hydrotest.

**Lifecycle scope:** Активен с момента первого weld'а в fab shop до closeout
test pack'а. Пиковая нагрузка — fabrication peak (shop weld throughput) и
pre-test phase (line check + item clearance). Самая ответственная роль в
ежедневном цикле: издержки от пропущенного дефекта — миллионы USD на rework

- schedule slippage.

**Source:**

- Manual: §7 (Weld point progress definitions), §7.1 (Weld entry by ISO/Spool/Joint),
  §7.1.4 (Send to NDE), §8 (Material traceability), §9 (Spool Final QC clearance),
  §11.7 (Joint Fab KPI), §11.8 (Welder performance, Welder-wise rejected & tracers),
  §12.1–12.5 (Erection welding parallel to shop), §13 (Line check), §14 (Item clearance).
- Presentations: #1 (15 W&NDE functions enumerated — see CC-... in research log),
  #2 (CC-3 role tier: _"Welds, NDE, QC sign-off"_), #4 (Fabrication module deep dive),
  #6 (Erection module — same welding pattern), #9 (Assembly — same again),
  CC-28 (two-tier validation BLOCK vs WARN — daily reality for QC).
- IA sitemap: `r1` chip (QC Eng) появляется на 14+ экранах — больше любой
  другой editor-роли.

---

### A. Real-world responsibilities (вне приложения)

QC Engineer на EPC piping construction:

- **Authorize welder-to-WPS pairing** — перед каждым weld'ом сверяет
  qualification record (бумажная папка / qualification log) с requested
  WPS. Welder qualified только на определённые material types, thickness
  range, position. Mismatch = stop work.
- **Visual inspection** root and cap pass on each weld — VT per ASME IX
  / project spec. Подписывает W24 form.
- **Heat number traceability** — за каждый piece спула должна быть
  mill certificate. QC сверяет heat number на материале с записью в
  W24 + mill cert PDF. Если piece без heat — материал нельзя ставить
  на spool (это **hard block** в реальности и в системе).
- **NDE batch composition** — координирует с NDE inspector что и в
  каком объёме отправляется на RT/UT/PT/MT. Sampling rate определяется
  NDE Matrix (Admin referential), но pragmatic decisions (приоритеты,
  client witnessing requirements) — это QC.
- **Rework cycle ownership** — когда NDE возвращает rejection, QC
  оформляет rework: rework code, welder reassignment, repair WPS,
  repair sequence. Tracer обязательство (penalty shoot): после 1
  rejection welder'а — следующий weld идёт 100% NDE; после 4 — все
  его welds в проекте идут 100% (status SS).
- **PWHT release** — для CrMo/CS heavy thickness joints требуется
  пост-сварочная термообработка. QC release weld for PWHT, потом
  re-release after PWHT за heat treatment lab confirmation.
- **Spool final QC clearance (W24 / Spool QC)** — за всю spool как
  unit. 4-item checklist: visual all welds OK, dimensional, NDE
  complete, heat traceability complete. Подписывает QC release →
  spool может идти на paint и laydown.
- **Field counterpart** — те же activities на site после To Site
  transfer. Site welds, field material check, field QC release before
  Supported. Иногда это другой QC engineer (split shop QC vs site QC),
  иногда тот же.
- **Line check walkdown** — pre-hydrotest physical inspection вместе
  с line check team и client representative. Записывает punch items.
- **Item clearance** — закрытие Cat X items (mandatory before
  hydrotest). QC sign-off часто на cleared items.
- **Reports up** to Project Manager (NDE acceptance rates, rejection
  patterns, welder performance trends, bottlenecks).
- **Reports to client QC** — weekly QC meeting, monthly NDE acceptance
  report для client, ad-hoc для rejections с обсуждением root cause.

Ключевая характеристика: QC — это **edit-heavy** роль. В отличие от
PM (watcher), QC Engineer трогает данные каждые 5 минут весь день.

---

### B. Application functions (PipeQC scope)

16 функций. Status legend выше — ✅ live · ⚠ partial · ❌ missing · 📋 planned.

1. **✅ Shop weld progress entry** — welder, WPS, root/cap %, foreman confirm
2. **⚠ Shop material check sign-off** per spool — route/UI/store persist exist,
   but no hard validation against Project Piping Material List referential yet.
3. **⚠ Shop QC release sign-off** per spool — 4-item checklist persists, but no
   Fail / Reject-to-Rework path and no real heat-trace hard block yet.
4. **✅ Send completed welds to NDE batch** (shop)
5. **⚠ Review NDE batch results** — `/nde` receives batch results, but current
   row action bulk-accepts and does not expose full per-weld defect entry dialog.
6. **⚠ Mark welds for rework** with rework code — batch-level rework state
   exists, but NDE result receive does not yet cascade rejected welds into
   `welds-store` Rework with full repair workflow.
7. **❌ Acknowledge tracer obligations** on rejected welds (penalty shoot
   trigger after 1 rejection; auto SS after 4) — **MISSING**, referenced
   в `lib/welder-qual.ts` но flow нет. Candidate for **Track N (NDE upgrade)**.
8. **✅ Field weld progress entry** (erection-side, same fields as shop)
9. **✅ Field material check** per spool (erection-side)
10. **✅ Field QC release** sign-off — actually this is folded into
    Erection RFT flow currently; in EasyPiping it's separate erection-side
    spool QC. **⚠ partial** — RFT screen does QC checks but doesn't have
    explicit 4-item checklist analogous to fab QC Release.
11. **✅ Line check findings entry** (punch items, Cat X/Y/Z)
12. **✅ Item clearance sign-off** (Cat X items blocking testpack)
13. **⚠ PWHT release** per joint — referenced в weld panel как field,
    но dedicated PWHT progress screen / release flow отсутствует.
    Candidate for **Track N**.
14. **⚠ Welder qualification validation** at weld entry — lib
    (`lib/welder-qual.ts`) существует, validation logic есть, но **не
    surfaced** в UI. Smart alert per CC-28 not wired. Candidate for
    **Track N** quick win.
15. **❌ Multiple welders per joint** (root by one welder, cap by
    another) — schema допускает single welder field. EasyPiping supports
    via #1 enumeration _"Multiple welders for single joint"_. Candidate
    for **Track N**.
16. **❌ NDE 100% override** — per IA sitemap (`Sec: Examination process /
NDE 100% override`), allows QC + Prj Admin to override sampling
    rate. Не реализовано. Niche feature, low priority.

**Gap summary:** 5 функций ✅ live, 7 ⚠ partial, 4 ❌ missing.

**Gap density observation:** все 4 missing функции + 3 partial — про
welding/NDE management deeper features. Это объясняет почему мы оценили
welding coverage как **~10/15 partial** в #1 presentation findings. Если
делать **Track N (NDE / welder qual upgrade)**, он закроет 7 функций
QC Engineer одновременно. Это самый высокий ROI track для роли QC Engineer.

**Gap triage (consolidated):**

| #   | Function                        | St  | Pr  | Decision | Track   |
| --- | ------------------------------- | --- | --- | -------- | ------- |
| B1  | Shop weld progress entry        | ✅  | P0  | build    | —       |
| B2  | Shop material check sign-off    | ⚠   | P0  | build    | Track A |
| B3  | Shop QC release sign-off        | ⚠   | P0  | build    | Track G |
| B4  | Send completed welds to NDE     | ✅  | P0  | build    | —       |
| B5  | Review NDE batch results        | ⚠   | P0  | build    | Track N |
| B6  | Mark welds for rework           | ⚠   | P0  | build    | Track N |
| B7  | Tracer obligations / penalty    | ❌  | P1  | build    | Track N |
| B8  | Field weld progress entry       | ✅  | P0  | build    | —       |
| B9  | Field material check            | ✅  | P0  | build    | —       |
| B10 | Field QC release                | ⚠   | P0  | build    | Track E |
| B11 | Line check findings entry       | ✅  | P0  | build    | —       |
| B12 | Item clearance sign-off         | ✅  | P0  | build    | —       |
| B13 | PWHT release                    | ⚠   | P1  | build    | Track N |
| B14 | Welder qualification validation | ⚠   | P1  | build    | Track N |
| B15 | Multiple welders per joint      | ❌  | P2  | defer    | Track N |
| B16 | NDE 100% override               | ❌  | P3  | defer    | Track N |

---

### C. Function → Screen → Interaction

| #   | St  | Функция                       | Экран                                                          | Что нажимает / делает                                                                                                                                                                                                                                                                                                                       |
| --- | --- | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | ✅  | Shop weld progress entry      | `/fabrication/weld-progress`                                   | Filter chip "Spool" → выбирает spool ID → row click на joint → side panel справа → welder dropdown → WPS dropdown → root % input → cap % input → "Foreman confirmed" checkbox → Save (~700ms) → toast "Weld saved". Row переходит в Completed.                                                                                              |
| B2  | ⚠   | Shop material check           | `/fabrication/material-check`                                  | Filter "Pending" → row click на spool → side panel → heat # + mill cert ref + status per piece → Save Draft / Sign off (~700ms) → store persists + notification. **Сейчас:** no hard validation against Project Piping Material List; heat # referential BLOCK not implemented.                                                             |
| B3  | ⚠   | Shop QC release               | `/fabrication/qc-release`                                      | Filter "Awaiting Release" → row click → side panel → 4-item checklist (visual / dimensional / NDE complete / heat trace) каждый Pending/Pass/Pass-with-remark → comment required for remark → "Sign QC Release" (~700ms) → store persists + notification. **Сейчас:** no Fail state / Reject-to-Rework path; no real heat-trace hard block. |
| B4  | ✅  | Send welds to NDE             | weld detail panel → CreateBatchDialog                          | В weld panel "Send to NDE" → Step 1 dialog: method (RT/UT/PT/MT) + subcontractor + NDE matrix coverage → Step 2: select welds checkboxes → "Create batch" (~700ms) → notification feed update.                                                                                                                                              |
| B5  | ⚠   | Review NDE batch results      | `/nde` batch row action / detail panel                         | Batch list has Issue / Receive Results / Close row actions and persisted batch history. **Сейчас:** dropdown "Receive Results" bulk-accepts all welds; full per-weld Accept/Reject + defect code dialog is not implemented.                                                                                                                 |
| B6  | ⚠   | Mark welds for rework         | `/nde` batch workflow                                          | Batch store has Rework status and rejected weld fields. **Сейчас:** rejected results do not cascade into `welds-store` Rework status from the row action; full repair dispatch workflow remains Track N.                                                                                                                                    |
| B7  | ❌  | Acknowledge tracer obligation | (no screen yet — planned `/nde/penalty-shoot` или modal)       | После rejection в B5 — welder counter ++. На N=1 — banner в weld panel при следующем выборе того же welder'а _"Tracer obligation active: next weld 100% NDE"_. На N=4 — welder dropdown в weld entry получает chip _"SS — all welds 100% NDE forced"_. **NOT IMPLEMENTED.**                                                                 |
| B8  | ✅  | Field weld progress           | `/erection/weld-progress`                                      | Same UX as B1, source tag = Erection. Все same edge cases.                                                                                                                                                                                                                                                                                  |
| B9  | ✅  | Field material check          | `/erection/material-check`                                     | Same UX as B2, source = Erection. Field welds typically smaller scope (только closure welds + tie-ins on site).                                                                                                                                                                                                                             |
| B10 | ⚠   | Field QC release              | `/erection/rft` (currently)                                    | Сейчас RFT screen derived field — auto fires когда Supported. Нет explicit 4-item field QC checklist. **Gap для будущего Track:** add field QC release screen analogous to shop QC release.                                                                                                                                                 |
| B11 | ✅  | Line check findings           | `/testpack/pressure-test/line-check/progress`                  | Открывает CR-XXXX (assigned to LC team) → row click → "Add punch item" → code + category X/Y/Z + localization (ISO or spool) → assigned-to team → Save (~700ms).                                                                                                                                                                            |
| B12 | ✅  | Item clearance sign-off       | `/testpack/pressure-test/item-clearance/progress`              | Открывает CR-XXXX → punch item row → status select "Cleared" + inspector sig + closure comment → Save → cascade: если все Cat-X cleared → TP_RFT может widen.                                                                                                                                                                               |
| B13 | ⚠   | PWHT release                  | (currently in weld panel as field, no dedicated screen)        | В weld panel — `PWHT required` flag + `PWHT released by` field. Нет workflow screen для batch PWHT release. **Gap для Track N:** dedicated `/pwht` или PWHT tab в NDE module.                                                                                                                                                               |
| B14 | ⚠   | Welder qual validation        | Logic в `lib/welder-qual.ts`, UI not wired                     | Validation function существует. Нужно: в weld entry (B1, B8) при выборе welder + WPS пары — call validator → если mismatch yellow banner в side panel _"Welder qualification mismatch (expired / different material)"_ → Save остаётся active per CC-28 soft alert.                                                                         |
| B15 | ❌  | Multiple welders per joint    | Schema-level limitation                                        | weld entry support только single `welderId`. Need: extend schema → `welderRoot` + `welderCap` (optional) + UI: split welder selection в side panel. **Track N candidate.**                                                                                                                                                                  |
| B16 | ❌  | NDE 100% override             | (no screen — would be admin-section в Examination process tab) | Planned per IA sitemap. Override sampling rate для конкретного welder / WPS / period. **Low priority — niche feature.**                                                                                                                                                                                                                     |

---

### D. Deep dive — user stories

Самые consequential функции для QC Engineer ежедневно: **B1** (shop
weld progress — основной daily input) и **B3** (QC release — самая
ответственная подпись в shop QC). Обе ✅ live, edge cases в обеих
богатые и заякорены в реальной практике.

---

#### Story для B1: Shop weld progress entry

**Context:** Foreman принёс утром W24 forms для 6 welds, выполненных
в shop'е вчера в смене. QC engineer садится за десктоп в QC office,
вбивает progress по очереди.

**Happy path:**

1. Открывает `/fabrication/weld-progress`
2. В filter bar выбирает Spool = SP-PG-001-A-03 (первый в стопке forms)
3. Видит 4 joint rows для этого spool'а; кликает на J-1029
4. Side panel открывается справа
5. Welder dropdown — выбирает WLD-005
6. WPS dropdown — выбирает WPS-001
7. Root % input — 100
8. Cap % input — 100
9. "Foreman confirmed" checkbox — ON
10. Click Save → ~700ms delay → toast _"Weld J-1029 saved"_
11. Row в таблице обновляется на status "Completed"
12. Side panel закрывается → QC engineer переходит к следующему joint
13. После всех 6 welds — переключается на новый spool в filter

**Edge cases (status-conditional):**

- **Welder qualification mismatch** (B14 partial — planned): на шаге
  5–6 после выбора пары WLD-099 + WPS-001 — yellow banner в side panel
  _"WLD-099 qualification expired (or not certified for WPS-001 material:
  CS A106B)"_. Save **остаётся активным** (CC-28 soft alert). Если QC
  saves — в toast приписка _"saved with override"_ и audit entry в weld
  history. На сегодня banner не показывается — это gap для Track N.

- **Joint в активном NDE batch**: если J-1029 уже отправлен в BTH-105
  (status open), в side panel banner _"Joint already in batch BTH-105
  (open since 2026-05-18) — edit restricted to status fields only"_.
  Welder/WPS fields disabled. Root%/Cap% editable (если поправка была
  сделана). Send-to-NDE button hidden — нельзя в два batch одновременно.

- **Spool QC released**: если SP-PG-001-A-03 уже прошёл QC release
  (B3 done) — на верху side panel banner _"Spool already QC released
  on 2026-05-20 by [QC Engineer name] — edits require unlock"_. Все
  fields disabled. Чтобы редактировать: PM или System Admin должен
  возвратить spool в Fabricated через QC Release screen. После unlock
  edit возможен, но создаёт audit entry "edit after QC release".

- **Joint в rework cycle (R1, R2, R3)**: weld имеет суффикс на ID
  (J-1029-R1). В table показывается с amber chip _"Rework R1"_. Side
  panel показывает previous rejection: rework code (RW-002 Crack),
  NDE inspector name + date, comment. Save теперь tracks R1 progress.
  В weld history accumulated все cycles visible.

- **4th rejection — penalty shoot trigger** (B7 missing): если welder
  WLD-099 уже имеет 3 rejected welds в проекте и сейчас идёт 4-й
  reject — auto-cascade: status WLD-099 → SS. Все welds WLD-099 в
  будущем automatic 100% NDE. **На сегодня:** этого нет в коде. Когда
  будет сделано (Track N): на weld entry панели для WLD-099 — red
  banner _"Welder SS — all welds 100% NDE forced"_ + welder dropdown
  показывает chip SS возле его ID.

- **Heat number missing from material referential** (CC-28 hard block):
  если spool содержит pieces с heat # которого нет в project material
  list — в B1 это не surface'ится (B1 не работает с heat numbers).
  Surface'ится в B2 (material check) и B3 (QC release heat trace
  checkbox). См. Story B3.

- **Multiple welders для joint** (B15 missing): сегодня single welder
  field — root и cap обязательно одним welder'ом. EasyPiping
  поддерживает split (root by WLD-A, cap by WLD-B — typical для PWHT
  workflow где разные специалисты). На сегодня нельзя записать —
  forced single. Track N будет добавлять `welderRoot` + `welderCap`
  optional fields.

- **PWHT required joint** (B13 partial): если joint класс материала
  требует PWHT (CrMo, heavy CS thickness) — в weld panel есть field
  "PWHT required" toggle. После cap weld → joint status flips на
  _"Awaiting PWHT"_, не Completed. Send-to-NDE button disabled до
  PWHT release. PWHT release сейчас вводится как простое поле "PWHT
  released by + date" — нет dedicated workflow screen. Track N gap.

- **Joint от Erection (field weld)**: QC ошибочно открыл shop weld
  progress для field weld'а (J-1029 имеет source = Erection). Row
  не появится в shop /fabrication/weld-progress filter — он будет
  только в /erection/weld-progress. Cross-source visibility — это
  важная UX boundary, не bug.

---

#### Story для B3: Shop QC release sign-off

**Context:** Spool SP-PG-001-A-03 имеет все 4 joints completed, NDE
released (BTH-105 acceptance done), material checked (B2 done). Это
финальная QC release point. Spool после release уходит в paint и
laydown, потом на site. Подпись QC engineer'а здесь — последняя
defensive line перед field.

**Happy path:**

1. Открывает `/fabrication/qc-release`
2. Filter "Awaiting Release" (default active)
3. Видит row SP-PG-001-A-03 с status "Ready" + 4 of 4 joints green
4. Row click → side panel
5. 4 checklist items, каждый radio Pass / Fail / Pass-with-remark:
   - Visual inspection — Pass
   - Dimensional check — Pass
   - NDE complete — Pass
   - Heat trace verified — Pass
6. Comment field — оставляет пустым (no remarks)
7. Click "Release" → ~700ms → toast _"SP-PG-001-A-03 QC released"_
8. Row уходит из Awaiting Release в Released bucket
9. Funnel в dashboard обновляется: Awaiting Release -1, Released +1
10. Notification создаётся: _"SP-PG-001-A-03 ready for Paint"_

**Edge cases (status-conditional):**

- **Один checklist item = Fail**: Release button становится "Reject to
  Rework". При клике → spool возвращается в Fabricated bucket, joint(s)
  с relevant issue получают rework status (e.g. dimensional fail на
  joint J-1029 → J-1029-R1 created). Notification welder'у через
  notification feed. Spool НЕ попадает в Released — необходимо
  re-execute fab cycle.

- **Открытый NDE batch (joints awaiting result)**: на верху side panel
  banner _"3 joints still awaiting NDE results in batch BTH-107 —
  release blocked until acceptance"_. Release button disabled с
  tooltip объясняющий причину. QC должен подождать NDE acceptance.

- **Heat number missing from material referential** (CC-28 hard block):
  на heat trace checkbox tooltip _"Heat HT-9999 (piece P-3) missing
  from project material list — fix in Admin → Material list → Add HT-9999
  with mill cert ref"_. Pass на heat trace **недоступен** (radio disabled).
  Без Pass на heat trace → Release недоступен. **Hard block.** Manager
  unlock не помогает — нужно физически добавить heat в referential.

- **Previously released, attempted re-open**: если spool уже released
  ранее и кто-то open'ит row снова — banner _"Previously released on
  2026-04-18 by [QC name] · view-only — unlock requires PM approval"_.
  Side panel в read-only. Чтобы редактировать: PM action на отдельном
  screen (`/admin/audit-unlock` planned для Track J / multi-tenant).

- **Paint cycle uncertainty** (G4 logic): если spool требует paint, но
  paint dispatch не configured (e.g. paint subcontractor не определён
  для этого PDS area) — banner _"Paint dispatch unconfigured for area
  AR-2 — release possible, but Paint stage will require manual assignment"_.
  Release proceeds, downstream paint dispatch получает manual queue.

- **Spool с CrMo PWHT joints (B13 partial)**: если spool содержит joints
  с PWHT required и хотя бы один не имеет PWHT released — `NDE complete`
  checkbox показывает sub-status _"PWHT pending on J-1031, J-1032"_.
  Pass недоступен. Этот subcheck сейчас простой — будет улучшен в
  Track N с dedicated PWHT progress integration.

- **Comment поле для Pass-with-remark**: если любой checklist item =
  "Pass with remark" — comment field **обязателен** (минимум 10 chars).
  Submit без comment → inline validation error _"Remarks require
  comment explanation"_. Это soft enforcement, hard validation на
  serverside.

- **Two-source spool conflict**: если spool содержит joints разного
  source (часть shop, часть erection field weld) — это рассматривается
  как shop QC scope только в shop-fab modules. Field welds spool'а
  идут через erection QC. На сегодня нет cross-source spool в seed,
  но edge case существует для real projects (e.g. tie-in spool fab'd
  in shop с одним field weld for closure).

- **Final reject after multiple rework cycles**: если spool прошёл 3
  rework cycles и сейчас 4-я попытка release с одним Fail — система
  показывает warning banner _"This spool has 3 prior rework cycles —
  consider scrap & re-fab decision"_. Это soft prompt, не block.
  Manager involvement рекомендуется. **Planned** для Track N — пока
  banner не показывается.
