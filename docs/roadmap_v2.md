# PipeQC Roadmap v2 — derived from role matrices

> **Why this rewrite.** Прошлая версия (`gapmap_and_roadmap.md`)
> группировала gaps по 4 capabilities (Welding/NDE, Testpack/RFT,
> Access, Logistics) и предлагала 4 phases, ориентированные на
> demo-readiness. После сверки с шестью ролевыми матрицами выявлено
> что покрытие — только ~60% gaps, выявленных матрицами. Не покрыты
> или недорыты: весь Admin module (16 функций, 0/16 ✅ live),
> Spooling lifecycle (12 функций, 7 missing), Reports module (12+
> отчётов NDE + per-welder), PDF/print form generation (CC-17),
> material traceability с heat numbers, welder qualification expiry,
> notification system. Этот документ переписан с нуля от ролевых
> матриц вверх. Старые треки в `docs/tracks/archive/` не
> учитываются — это reset to first principles.

> **Source of truth:** `docs/role_matrix/{qc_engineer,nde_inspector,
> project_manager,spooling_team,system_admin,subcontractor}.md` +
> `docs/research/presentation_findings.md`.

---

## 1. Coverage check — что прошлый gap_map пропустил

Сверка по каждой матрице. ✅ = покрыто в `gapmap_and_roadmap.md`,
❌ = не упомянуто или упомянуто без привязки к треку.

### QC Engineer (16 функций, gap density: 7 ⚠ + 4 ❌)

| Gap                            | В gap_map_v1?     | Комментарий                                                            |
| ------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| Per-weld Receive Results       | ✅ Phase 2.1      | P0, ОК                                                                 |
| NDE Rework Cascade             | ✅ Phase 2.1      | P0, ОК                                                                 |
| Penalty Shoot & Tracer         | ✅ Phase 2.2      | P1, ОК                                                                 |
| Welder Qualification Alert     | ✅ Capability     | Упомянуто, но без привязки к фазе                                      |
| PWHT Release Flow              | ✅ Capability     | Упомянуто, но без привязки к фазе                                      |
| **Heat-number traceability**   | ❌                | B2 ⚠ partial — нет валидации против Project Piping Material List      |
| **Shop QC release checklist**  | ❌                | B3 ⚠ partial — нет 4-item explicit checklist                          |
| **Field QC release**           | ❌                | B10 ⚠ partial — folded в RFT, без отдельного checklist                |
| Multiple welders per joint     | ✅ P2 defer       | ОК                                                                     |
| NDE 100% override              | ❌                | B16 ❌ missing — niche, но domain-релевантно                          |

**Пропущено: 4 gaps.**

### NDE Inspector (14 функций, gap density: 3 ⚠ + 7 ❌)

| Gap                              | В gap_map_v1?     | Комментарий                                                            |
| -------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| Per-weld results dialog          | ✅ Phase 2.1      | дублирует QC B5                                                        |
| Penalty Shoot                    | ✅ Phase 2.2      | ОК                                                                     |
| Tracer cascade R1/R2/R3          | ✅ Phase 2.2      | ОК                                                                     |
| **Issue Examination PDF (CC-17)** | ❌                | B8 ⚠ partial — формальный dispatch к лаборатории, отсутствует         |
| **8 NDE management reports**     | ❌                | B10 ❌ — Batch status, Radiographic, Outstanding Repairs, Service class, Spool-wise, Outstanding NDE, RT film qty, **Weld History sheet** (последний — обязательный документ в test pack dossier) |
| **4 welder monitoring reports**  | ❌                | B11 ❌ — Perf Control Sheet, Rej. and Repaired, Rej. and Tracers, Batch status per welder |
| **NDE dashboard / KPI**          | ❌                | B12 ⚠ partial — нет dedicated `/nde/dashboard` с acceptance rate trends, lab perf, defect Pareto |
| **Examination History per joint** | ❌                | B14 ❌ missing — timeline view (original + R1 + R2 + R3) с per-cycle accept/reject, inspector, defect codes |
| NDE 100% override                | ❌                | B13 ❌ niche                                                           |

**Пропущено: 5 gaps. Самое значимое — весь Reports блок (12 отчётов).**

### Project Manager (12 функций, gap density: 5 ⚠ + 3 🧪 + 1 ❌)

| Gap                              | В gap_map_v1?     | Комментарий                                                            |
| -------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| PM Read-Only Lock                | ✅ Phase 2.4      | P0, ОК                                                                 |
| Spool Tracking Dashboard         | ✅ Phase 4.1      | P1, ОК                                                                 |
| Dossier Handover Reports         | ✅ Phase 4.2      | P1, ОК                                                                 |
| **Notification system upgrade**  | ❌                | B1 ⚠ partial — acknowledge / archive / grouping / role-routing отсутствует. Phase 1.2 в старом roadmap трогает только тексты NDE notifications, но не сам fabric notification system |
| **NDE bottleneck check screen**  | ❌                | B5 ⚠ partial — KPI mixed с fab dashboard, нет dedicated drill-down    |
| **Release worklist / export**    | ❌                | B8 🧪 demo-only — popup и экспорт сейчас mock-toast                   |
| **Weekly fab summary reports**   | ❌                | B9 🧪 demo-only — Reports row есть, но генерация — mock                |
| **Spooling pipeline health**     | ❌                | B12 ⚠ partial — Spooling Home dashboard без S-curve / live feed       |

**Пропущено: 5 gaps. Notification system — самое чувствительное (вход для PM в любую сессию).**

### Spooling Team (12 функций, gap density: 3 ⚠ + 7 ❌ + 1 📋)

| Gap                                  | В gap_map_v1?     | Комментарий                                                            |
| ------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| Iso Lifecycle & Transmittal Engine   | ✅ Phase 3.3      | P1 — но в gap_map это **одна строка**; в матрице это **7 missing функций** (B3 transmittal receipt, B4 checkout, B5 multi-round checking, B6 hold mgmt, B7 outbound, B2 revision cascade) |
| **Real SpoolGen parser (4 files)**   | ❌                | B1 ⚠ partial — `weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt`        |
| **Marian CSV material import**       | ❌                | B10 ❌ missing — material readiness sync                              |
| **Browser sub-module / file bridge** | ❌                | B8 ❌ missing — filtering by Spl. Trans. No / Iso No / Type, archive history |
| **Spooling Home S-curve + live feed** | ❌               | B11 ⚠ partial — KPI cards есть, нет S-curve trend и live activity feed (per CC-23) |
| SpoolGen auto-poll connector         | ❌                | B12 📋 planned — differentiator vs EasyPiping (CC-25); defer-OK       |

**Пропущено: 5 gaps. Spooling — самый "тонкий" модуль; gap_map_v1 закрывает его одной строкой.**

### System Admin (16 функций, gap density: 0 ✅ live / 9 ⚠ / 3 📋 / 2 ❌)

| Gap                                  | В gap_map_v1?     | Комментарий                                                            |
| ------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| **All Admin module CRUD operations** | ❌                | 14 функций из 16 — partial / planned / missing. Целый модуль (`app/admin/*`) построен как thin shells |
| **Project Definition form**          | ❌                | B1 ⚠                                                                  |
| **WPS CRUD (add/edit/expire)**       | ❌                | B5 ⚠ — сейчас read-only                                               |
| **Welder Qualification CRUD**        | ❌                | B5 ⚠ — expiry alerts отсутствуют                                      |
| **NDE Matrix CRUD + audit**          | ❌                | B6 ⚠ + B15 ❌ — P0 в матрице                                          |
| **Subcontractor + PDS Area editor**  | ❌                | B4 ⚠ — partial assignment logic                                       |
| **Project Piping Material List**     | ❌                | B7 ⚠ — heat numbers registry; нужен для QC B2 (heat traceability)    |
| **System Referential (4 items)**     | ❌                | B3 📋 — Material Type / Film Qty / UT Calc / Torquing                |
| **Import Settings (3 core)**         | ❌                | B13 📋 — PML, NDE Matrix, Weld Thickness                              |
| **User CRUD + scope lock setup UI**  | ⚠ Phase 2.3       | Только runtime scope lock в Phase 2.3; **setup UI отсутствует** в roadmap. То есть в Phase 2 lock работает, но настроить нельзя |

**Пропущено: 14 gaps. Полное отсутствие Track A в старом roadmap.**

### Subcontractor (10 функций, gap density: 0 ✅ live / 6 ⚠ / 2 ❌ / 2 📋)

| Gap                                  | В gap_map_v1?     | Комментарий                                                            |
| ------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| Subcontractor Scope Lock             | ✅ Phase 2.3      | P0, ОК                                                                 |
| **Activity-type scope filter**       | ❌                | NDE sub vs Fab sub vs Erection sub — `scope` enum в `admin-store` есть, но nav visibility не применяет его |
| **Issue examination program PDF**    | ❌                | B7 ❌ missing — overlap с NDE Inspector B8                            |
| **QC forms PDF generation (W24/QC13/W10P)** | ❌         | B9 ⚠ partial — CC-17 PDF dispatch pattern                            |
| **Scope-locked spool tracking**      | ❌                | B8 ❌ — barcode scanning + own area movement log                      |
| PDA scanning offline                 | ❌                | B10 📋 — defer-OK                                                     |

**Пропущено: 4 gaps. PDF/print form generation — целый capability отсутствует в roadmap.**

---

### Сводка пропущенного

Из ~30 уникальных gap items в матрицах, старый roadmap **не покрывает** ~12:

- Весь Admin module CRUD (~7 функций)
- 12 отчётов NDE + welder monitoring (Track C)
- PDF form generation (W24, QC13, Issue Examination — Track P, новый)
- Notification system upgrade (acknowledge/archive/route)
- Heat number traceability (depends on Admin PML CRUD)
- 4–6 функций Spooling (transmittal receipt, checkout, checking, holds, outbound, real SpoolGen parser)
- Scope lock **setup UI** (есть только runtime в старом roadmap)

Поэтому новый roadmap строится с нуля, по capability-based трекам,
с привязкой каждой phase к конкретным B-номерам в role matrices.

---

## 2. Capability-based track inventory

Восемь треков. Каждый трек ссылается на функции в матрицах по
формату `{role}.B{n}` (например `qc.B7` = QC Engineer function B7).

### Track A — Admin / Referentials / Setup

> **Покрывает:** все 16 функций System Admin matrix, плюс
> backbone для QC heat-traceability (qc.B2), Subcontractor
> scope assignment, NDE Matrix sampling overrides.
>
> **Status (your input):** в работе у другого агента. В новом
> roadmap отмечено как "concurrent" — точное содержание прокидывается
> через checkpoint после завершения текущего sprint.

| Phase | Что | Closes |
| ----- | --- | ------ |
| A-1 | Project Definition form + persist + project switcher | sa.B1, sa.B2 |
| A-2 | WPS CRUD (add / edit / supersede / expire) | sa.B5 |
| A-3 | Welder Qualification CRUD + expiry banner | sa.B5, qc.B14 (depends) |
| A-4 | **NDE Matrix CRUD (sampling % edit) + audit trail** | sa.B6, sa.B15 (P0) |
| A-5 | Subcontractor + PDS Area editor (assignment matrix) | sa.B4 |
| A-6 | Project Piping Material List CRUD + heat number registry | sa.B7, qc.B2 (depends) |
| A-7 | System Referential CRUD (4 items: Material Type, Film Qty, UT Calc, Torquing) | sa.B3 |
| A-8 | Rework Codes / Service Class / Joint Cat CRUD (lower priority) | sa.B8 |
| A-9 | Testpack team refs CRUD (Blinding / Finishing / Reinstatement / Line Checker) | sa.B9 |
| A-10 | Import Settings — 3 core templates (PML, NDE Matrix, Weld Thickness) | sa.B13 |
| A-11 | Project archive / close-out (defer) | sa.B16 (P3) |

### Track J — Roles / Access / Subcontractor Scope

> **Покрывает:** Subcontractor matrix (6 функций scope-filtered),
> PM design gap (write-lock), Admin user CRUD + scope setup,
> notification routing.

| Phase | Что | Closes |
| ----- | --- | ------ |
| J-1 | User CRUD form (username, role select, conditional sub-ID, PDS area multi-select) | sa.B11 |
| J-2 | Scope lock — UI layer: subcontractor dropdown disabled + forced to logged-in sub ID, на всех screens | sub.B1–B6 (UI side) |
| J-3 | Scope lock — data layer: filter tables / batches / spools by `subcontractorId` × `pdsAreaFilter` on every store selector | sub.B1–B6 (data side) |
| J-4 | Activity-type scope filter (NDE sub видит NDE screens, Fab sub видит Fab screens, etc) | sub matrix lifecycle note |
| J-5 | PM write-lock — Save buttons hidden / disabled for role=project_manager on all progress entry screens | pm.B11, pm design gap |
| J-6 | Notification system upgrade — acknowledge / archive / grouping / role-routing | pm.B1 |
| J-7 | Project Reader role implementation (read-only across all modules) | (CC-3 unmapped tier) |

### Track N — NDE / Welding Quality Upgrade

> **Самый домен-богатый track. Flagship demo moment.**
>
> **Покрывает:** глубокая NDE логика (per-weld → cascade → tracer
> → penalty shoot), welder qualification soft alert, PWHT, defect
> codes, examination history.

| Phase | Что | Closes |
| ----- | --- | ------ |
| N-1 | Per-weld Accept/Reject dialog (replaces bulk-accept) + Defect Code (POR/CRK/LOF/SLG) + Location of defect | nde.B3 ⚠→✅, qc.B5 ⚠→✅, sub.B3 |
| N-2 | Rework cascade — rejected weld → store status flip + auto-create `-R1` joint в NDE100 category | nde.B5 ⚠→✅, qc.B6 ⚠→✅ |
| N-3 | Tracer logic — first level T1 + second level (T1-1, T1-2, T2-1, T2-2) с auto-creation | nde.B7 ❌→✅, qc.B7 ❌→✅ |
| N-4 | **Penalty Shoot auto-trigger** — 4 rejections в batch OR 2nd-level tracer → все remaining welds flip в SS | nde.B6 ❌→✅, qc.B7 ❌→✅ |
| N-5 | Welder qualification soft alert (mismatch detection, expired, wrong material) | qc.B14 ⚠→✅ |
| N-6 | PWHT release flow + thickness threshold (Y / N / numeric) | qc.B13 ⚠→✅ |
| N-7 | Examination History per joint — timeline view (original + R1 + R2 + R3) | nde.B14 ❌→✅ |
| N-8 | NDE100 vs NDE10/20 dual state machine — separate status enums (H/HS vs S/SS) | nde.B6 deeper |
| N-9 | Multiple welders per joint (root vs cap) — schema extension | qc.B15 ❌ defer-able |
| N-10 | NDE 100% override (admin function) | qc.B16, nde.B13 — defer-able |

### Track K — Iso Lifecycle / Spooling

> **Покрывает:** 7 missing функций Spooling Team, plus Spool Team
> hold management surface для PM (pm.B12).

| Phase | Что | Closes |
| ----- | --- | ------ |
| K-1 | Engineering Transmittal receipt screen (batch metadata + iso list CSV) | sp.B3 ❌→✅ |
| K-2 | Iso state machine + Checkout to spooler (junior/mid drafter assignment) | sp.B4 ❌→✅ |
| K-3 | Multi-round checking (round counter, reject reasons, re-review loop) | sp.B5 ❌→✅ |
| K-4 | Hold management (Spool Team hold vs Engineering hold, reason + holder, release SLA) | sp.B6 ❌→✅, pm.B12 |
| K-5 | Outbound transmittal to site (batch grouping by PDS area + Spl. Trans. No.) | sp.B7 ❌→✅ |
| K-6 | Revision cascade impact analysis (R0→R1→R2 with affected spools/welds preview) | sp.B2 ⚠→✅ |
| K-7 | Spooling Home dashboard — S-curve (Received / Spooled / Transmitted by date) + live activity feed (per CC-23) | sp.B11 ⚠→✅, pm.B12 ⚠→✅ |
| K-8 | Real SpoolGen 4-file parser (`weld.txt`, `trace.txt`, `bolt.txt`, `supp.txt`) | sp.B1 ⚠→✅ |
| K-9 | Marian CSV material status import (FAH CODE, Run Number, Completion Status, Completion Date) | sp.B10 ❌→✅ |
| K-10 | Browser sub-module (filtering by Spl. Trans. No / Iso No / File Type) + archive history | sp.B8 ❌→✅ |
| K-11 | SpoolGen auto-poll connector (differentiator vs EasyPiping; per CC-25) | sp.B12 📋 — defer-OK |

### Track H — Testpack & RFT

> **Покрывает:** Testpack Builder (центральная missing), Flange→RFT
> gate, Dossier handover, Client examination.

| Phase | Что | Closes |
| ----- | --- | ------ |
| H-1 | Testpack Builder — ручная сборка из дерева ISO + system / sub-system mapping | pm.B7 deeper, new builder |
| H-2 | Flange Torquing → RFT linkage (closed bolted joints → RFT eligibility gate I9) | gap_map_v1 capability #2 |
| H-3 | Pressure Test nested navigation polish (sub-sections breadcrumbs + state machine) | (manual §17 alignment) |
| H-4 | **Dossier Handover PDF** — Weld History sheet + NDE Clearance + Punch lists в единый print form (per §20) | pm.B10 🧪→✅, sub QC forms |
| H-5 | Client examination coordination — owner's rep sign-off на N2 results (CC-N5) | nde.B11 owner workflow |
| H-6 | Release Tracking drill-downs upgrade (already partial — extend gates 1–3 stubs) | pm.B7 deeper |

### Track S — Spool Tracking

> **Покрывает:** placeholder `/tracking` route → полноценный dashboard +
> map + inconsistency flags. Все 5 функций — для PM, Subcontractor scope.

| Phase | Что | Closes |
| ----- | --- | ------ |
| S-1 | `/tracking` dashboard with KPI strip + filter chips | pm.B4 ❌→✅ |
| S-2 | Yard / shop map view (visual location markers per spool) | pm.B4 deeper |
| S-3 | Inconsistency flags (transit-out, overdue per max transit time setting from sa.B1) | gap_map_v1 capability #4 |
| S-4 | Movement audit log (Location OUT / Location IN history) | sub.B8 ❌→✅ |
| S-5 | Subcontractor scope lock applied к spool tracking | sub.B8 + Track J |
| S-6 | Barcode export to Zebra label printer (per manual §16) — defer | (low ROI) |

### Track C — Reports

> **Покрывает:** 12 NDE reports + welder monitoring + fab/erection/
> testpack отчёты. Сейчас `/reports` — shell с 12 mock rows (Track
> C-1 merged по архивному track_list).

| Phase | Что | Closes |
| ----- | --- | ------ |
| C-1 | 8 NDE management reports (Batch status, Radiographic, Outstanding Repairs, Service class, Spool-wise, Outstanding NDE, RT film qty, **Weld History sheet**) | nde.B10 ❌→✅ |
| C-2 | 4 welder monitoring reports (Perf Control Sheet, Rej & Repaired, Rej & Tracers, Batch status per welder) | nde.B11 ❌→✅ |
| C-3 | Real per-welder / per-sub acceptance rate computation (заменяет mock) | nde.B9 ⚠→✅ |
| C-4 | Dedicated NDE dashboard `/nde/dashboard` (acceptance rate trends, lab performance, defect Pareto) | nde.B12 ⚠→✅ |
| C-5 | Spooling Team reports (progress curves, hold backlog) | sp.A reports up |
| C-6 | PM weekly fab / summary reports — real generation (не mock) | pm.B9 🧪→✅ |

### Track P — PDF / Print / Forms Generation

> **Новый track.** Покрывает CC-17 PDF dispatch pattern, который
> в Easy Piping везде: W24, QC13, W10P, Issue Examination Program.
> Сейчас все PDF — mock toasts.

| Phase | Что | Closes |
| ----- | --- | ------ |
| P-1 | W24 form PDF (Welding daily progress per spool) | qc field-side, sub.B9 |
| P-2 | Issue Examination Program PDF (CC-17 dispatch к lab, unique Request No) | nde.B8 ⚠→✅, sub.B7 ❌→✅ |
| P-3 | QC13 PDF (Spool Final QC clearance form) | qc.B3 deeper |
| P-4 | W10P PDF (Welding NDE clearance per joint) | qc field, sub.B9 |
| P-5 | Generate Request / Work Order PDF (per CC-17) | NDE Inspector workflow |
| P-6 | Release worklist PDF / Excel export (PM B8) | pm.B8 🧪→✅ |

---

## 3. Phasing — рекомендованный порядок

Семь фаз. Длительность каждой — оценка в "слайсах" (один слайс ≈
0.5–1.5 дня работы агента, что коррелирует с привычным форматом
prompts в `docs/prompts/`).

### Phase I — Foundation: Admin backbone (Track A)

> **Status:** в работе у другого агента. Подразумеваю что
> минимально закроется A-1 + A-2 + A-3 + A-4 + A-5 + A-6
> (Project Definition / WPS CRUD / Welder Qual CRUD /
> NDE Matrix CRUD / PDS Area editor / Project Piping
> Material List). Это 6 phases.

| Slice | Что |
| ----- | --- |
| A-1 | Project Definition |
| A-2 | WPS CRUD |
| A-3 | Welder Qualification CRUD + expiry |
| A-4 | NDE Matrix CRUD + audit |
| A-5 | Subcontractor + PDS Area editor |
| A-6 | Project Piping Material List + heat numbers |

**Зачем сначала:** без NDE Matrix CRUD нельзя нормально показать
Penalty Shoot (Track N зависит от matrix sampling). Без PML +
heat numbers QC heat-traceability (qc.B2) не работает. Без PDS Area
editor (A-5) Track J scope lock некуда привязать. Track A — это
backbone, на который опирается всё остальное.

### Phase II — Multi-tenant Security (Track J, core)

| Slice | Что |
| ----- | --- |
| J-1 | User CRUD form (зависит от A-5 для PDS Area picker) |
| J-2 | Scope lock UI layer (dropdown disable + force value) |
| J-3 | Scope lock data layer (selector-level filtering) |
| J-5 | PM write-lock |

**Зачем сейчас:** enterprise story. После Phase I (Admin готов
настроить scope) включается runtime enforcement. PM write-lock
закрывает design gap, обнаруженный в audit. J-4 (activity-type
filter), J-6 (notification system), J-7 (Project Reader) уходят
в Phase VII (polish).

**Что НЕ делаем сейчас:** activity-type filter (J-4) можно
отложить — это niche refinement scope lock-а. Notification
upgrade (J-6) перенесён в Phase VII потому что это не блокер
для demo flow.

### Phase III — Domain Flagship: NDE Quality Upgrade (Track N core)

| Slice | Что |
| ----- | --- |
| N-1 | Per-weld Accept/Reject dialog + defect codes |
| N-2 | Rework cascade -R1/-R2/-R3 |
| N-3 | Tracer logic T1, T1-1, T1-2, T2-1, T2-2 |
| N-4 | Penalty Shoot auto-trigger |
| N-5 | Welder qualification soft alert |
| N-6 | PWHT release flow |

**Зачем сейчас:** **flagship demo moment** (CC-N4 — "watch this
welder's 4th joint fail, no human intervention, all remaining
welds auto-selected"). Это самый сильный pitch argument против
"build it in Excel". Также закрывает 6 функций QC + 5 функций
NDE + 3 функции Subcontractor одной фазой.

**Что НЕ делаем сейчас:** N-7 (Examination History timeline),
N-8 (NDE100 dual state machine), N-9 (multiple welders per joint),
N-10 (NDE 100% override) — переносятся в Phase VII.

### Phase IV — Testpack Closure (Track H core)

| Slice | Что |
| ----- | --- |
| H-1 | Testpack Builder (manual ISO selection from tree) |
| H-2 | Flange Torquing → RFT linkage (I9 gate) |
| H-4 | Dossier Handover PDF (feeds от Track P later) |

**Зачем сейчас:** замыкает full e2e demo flow от engineering до
client handoff. После Phase III (NDE upgrade) Dossier PDF
включает реальную Weld History — domain depth видна на финальной
печатной форме.

**Что НЕ делаем сейчас:** H-3 (Pressure Test nav polish), H-5
(Client examination coordination), H-6 (Release Tracking drill-down
extension) — Phase VII.

### Phase V — Upstream Completion (Track K core)

| Slice | Что |
| ----- | --- |
| K-1 | Engineering Transmittal receipt |
| K-2 | Iso state machine + Checkout to spooler |
| K-3 | Multi-round checking |
| K-4 | Hold management (two sources) |
| K-5 | Outbound transmittal to site |
| K-7 | Spooling Home S-curve + live activity feed |

**Зачем сейчас:** объясняет инвестору / клиенту откуда берутся
ISO/spools/welds в системе. До этого момента в demo есть
"волшебный" upstream — seed data. После Phase V цепочка
engineering → spooling → fabrication → erection → testpack
полностью видна.

**Что НЕ делаем сейчас:** K-6 (revision cascade), K-8 (real
SpoolGen parser), K-9 (Marian import), K-10 (Browser), K-11
(auto-poll connector) — Phase VII или Phase VIII (data ingestion
specialised).

### Phase VI — Physical Layer (Track S core)

| Slice | Что |
| ----- | --- |
| S-1 | `/tracking` dashboard with KPI strip |
| S-2 | Yard / shop map view |
| S-3 | Inconsistency flags + transit-out warnings |
| S-4 | Movement audit log |

**Зачем сейчас:** visual demo, PM story ("где физически находится
каждый spool"). До этого момента `/tracking` — это пустая
страница в сайдбаре, что бросается в глаза при role switch
на Project Manager.

**Что НЕ делаем сейчас:** S-5 (scope lock в tracking), S-6
(barcode export Zebra) — Phase VII.

### Phase VII — Polish / Reports / Forms / Edge cases

Всё что осталось:

- Track C (Reports — все 12 NDE отчётов + welder monitoring +
  acceptance rate real computation + dedicated NDE dashboard)
- Track P (PDF form generation — W24, QC13, W10P, Issue Examination,
  Release worklist export)
- N-7, N-8 (Examination History, NDE100 dual state machine)
- K-6, K-8, K-9, K-10 (Spooling deeper: revision cascade, real
  SpoolGen parser, Marian, Browser)
- J-4, J-6, J-7 (activity-type filter, notification upgrade,
  Project Reader role)
- S-5, S-6 (scope lock в tracking, barcode export)
- H-3, H-5, H-6 (Testpack polish)
- A-7, A-8, A-9, A-10 (Admin deeper refs + Import Settings)

**Зачем последним:** к этому моменту core demo flow готов end-to-end
(I → II → III → IV → V → VI). Phase VII — это enterprise
maturity полировка: отчёты, PDF, edge cases, scope refinement.
Можно дробить на slices по приоритету в зависимости от feedback
после live demo.

---

## 4. Critical path — что именно блокирует demo

Если нужно демонстрировать **завтра**, минимально-достаточный
набор:

- **Phase I** (Track A core) — без admin backbone весь продукт
  выглядит как mock
- **Phase III** (Track N core, N-1 + N-2 + N-4) — flagship moment
- **Phase II** (Track J core, J-2 + J-3 + J-5) — enterprise story

Это ~14 slices, ≈ 14–18 рабочих дней одного агента (или
параллельно — 7–10 дней с двумя агентами на изолированных треках).

Phase IV–VI (Testpack closure, Upstream, Spool Tracking) добавляют
e2e нарратив но не "новые wow moments". Phase VII — для serious
pilot, не для investor pitch.

---

## 5. Что defer / reject / redesign

Эксплицитный список — это критика старого подхода "всё надо
построить".

### Defer (build later, not blocking demo)

- K-11 SpoolGen auto-poll connector (pitch slide differentiator,
  не demo-критичен)
- S-6 Barcode export Zebra (industry parity, ничего не добавляет
  визуально)
- N-9 Multiple welders per joint (schema extension, niche)
- N-10 NDE 100% override (admin function, niche)
- A-11 Project archive (close-out ceremony, низкая frequency)
- sa.B14 Import Spooling Images ZIP (binary upload complexity)
- sub.B10 PDA scanning offline (требует PDA User role, отдельный
  mobile track)

### Reject — НЕ строить как Easy Piping

- Construction surveillance PDA checklists per CC-30 — Easy Piping
  никогда не построил это. Если делать — то как PipeQC
  differentiator (future mobile track), не parity gap.
- Assembly как отдельный duplicated module — Easy Piping дублировал
  Erection. PipeQC использует `stage = assembly | erection`, не
  отдельный модуль.
- All Preparation pages для всего подряд (Spool / Welding / Flange)
  — Easy Piping построил только NDE Preparation, остальное было
  structural promise. Не строить пустые страницы.

### Redesign — строить, но лучше чем Easy Piping

- Notification system — Easy Piping имел static notification list
  на home page. PipeQC: acknowledge / archive / role-routing /
  severity grouping (J-6).
- NDE dashboard — Easy Piping смешивал NDE side с Fabrication
  dashboard. PipeQC: dedicated `/nde/dashboard` с acceptance rate
  trends (C-4).
- Hold management — Easy Piping имел просто status flag. PipeQC:
  two sources (Spool Team / Engineering) + reason + holder + SLA
  tracking (K-4).
- Spool Tracking — Easy Piping имел list view. PipeQC: yard map
  view с visual location markers (S-2).

---

## 6. Backlog hygiene

Чтобы не повторять ошибку gap_map_v1:

1. **Каждый track phase** должен ссылаться на конкретный B-номер
   в role matrix. Если не ссылается — это не доменная функция,
   а tech debt, и в roadmap не идёт.
2. **Каждая matrix function** при закрытии phase обновляется:
   ✅ live + ссылка на merged track phase в Source. Это
   замыкает loop matrix ↔ backlog.
3. **Каждые 4–6 недель** — coverage check: пройти все 6 матриц,
   проверить что новых missing функций не появилось из дальнейшего
   reading presentation_findings.md.
4. **Capability triage table** в каждой role matrix (Gap Triage
   section) — это live document. Обновляется при каждом merge.

---

## 7. Open questions / parking lot

- Track A (Admin) в работе у другого агента — какой именно scope?
  После завершения текущего sprint нужен checkpoint: что merged,
  что остаётся в Phase I.
- Notification system upgrade (J-6) — приоритет может вырасти,
  если на live demo PM сразу landing на Home (notifications feed).
  Тогда J-6 переезжает в Phase II.
- PDA User role и mobile track — не в roadmap v2. Если pilot
  клиент требует — добавляем Phase VIII (future mobile).
- Track P (PDF generation) — может быть выделено в самостоятельную
  параллельную работу, потому что не зависит ни от чего кроме
  данных в store. Можно делать в Phase IV–V параллельно с другими
  треками.

---

> **Next action:** определить точный scope Phase I (Admin agent's
> work) → запустить Phase II (Track J core, 4 slices) либо параллельно
> Phase III (Track N core, 6 slices) в зависимости от capacity.
