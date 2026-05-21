# Обновлённый список треков (свежий audit по main, 2026-05-18)

> Источник истины: `git log --oneline` репо `vvnezapnopwnz1/piping` + `docs/PIPEQC_CONTEXT.md` merge log + `docs/MANUAL_COVERAGE_MATRIX.md`. Предыдущий track_list (тот, который лежал у тебя локально) был синхронизирован примерно по состоянию до коммитов `3b896c4`, `f8e631c`, `a4c3ab7`, `7e05719`, `101c029`, `3591385` — все они уже на main и **в старом файле не отражены**. Этот файл переписан с нуля.

---

## ✅ Merged (closed) — что реально лежит в main

| #   | Track / Phase  | Что                                                                              | Подтверждение в репо                                                   |
| --- | -------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | A1             | Line Check Preparation + Progress                                                | `app/testpack/pressure-test/line-check/*`                              |
| 2   | A2             | Item Clearance Preparation + Progress                                            | `app/testpack/pressure-test/item-clearance/*`                          |
| 3   | A3             | Explorer live gates (Release Tracking)                                           | `lib/testpack-release-tracking.ts` + Explorer wired                    |
| 4   | A4             | Blinding Preparation + Progress                                                  | `app/testpack/pressure-test/blinding/*`                                |
| 5   | A5             | Testing & Pre-comm Progress                                                      | `app/testpack/pressure-test/testing-precomm/*`                         |
| 6   | A6             | Reinstatement Preparation + Progress (теперь на flange Y/Z, не punch)            | `components/testpack/reinstatement/*` (после `a4c3ab7`)                |
| 7   | B1             | Admin shell + Teams + Subcontractors + Welder Qualifications                     | `app/admin` + `store/admin-store.ts`                                   |
| 8   | B2             | WPS / NDE Matrix / Rework Codes / Joint Categories (read-only)                   | `components/admin/*-tab.tsx`                                           |
| 9   | E2.1           | Erection store (persistence)                                                     | `store/erection-store.ts`                                              |
| 10  | E2.3           | Spool readiness gate (F↔E handoff)                                               | `useSpoolReadiness()` selector                                         |
| 11  | E2.5           | **ISO weld rollup + Track A bridge** (было #13 в Next — закрыто)                 | `store/iso-rollup.ts` + `components/iso-watcher-mount.tsx`             |
| 12  | N1             | Create Batch wizard                                                              | `components/nde/create-batch-dialog.tsx`                               |
| 13  | N2             | Per-weld Receive Results                                                         | `components/nde/receive-results-panel.tsx`                             |
| 14  | F2             | **Send to NDE из weld detail panel + Send entire spool** (было #14 в Next)       | коммит `3b896c4`                                                       |
| 15  | E2.4           | **Send field weld to NDE (source=field)** (было #15 в Next)                      | коммит `3b896c4`                                                       |
| 16  | G1             | Spool fabrication funnel + 8-stage derivation                                    | `lib/spool-data.ts` + `store/spool-stage.ts`                           |
| 17  | G1.1           | Funnel navigation cleanup                                                        |                                                                        |
| 18  | G2             | Material Check screen + persisted spools store                                   | `app/fabrication/material-check`                                       |
| 19  | G3             | QC Release screen + Fabricated→Released                                          | `app/fabrication/qc-release`                                           |
| 20  | G4             | Paint stages — dispatch, sign-off, DFT                                           | `app/fabrication/paint`                                                |
| 21  | G5             | Laydown — yard placement + release to site + funnel deep-link cleanup            | `app/fabrication/laydown`                                              |
| 22  | C1             | **Reports module (Fabrication / Erection / Testpack / NDE)** (был полный TODO)   | коммит `f8e631c`                                                       |
| 23  | P0–P2 align    | Manual-alignment pass: flange-store, live release gates, NDE tracer, spooling sh | коммит `a4c3ab7` + `docs/MANUAL_COVERAGE_MATRIX.md`                    |
| 24  | F1 (частично)  | Fabrication dashboard теперь читает `useWeldsKPIs` + funnel                      | `components/fabrication-dashboard.tsx:294`                             |
| 25  | N3             | Source column (Shop/Site) + chip-filter (All/Shop/Field) в /nde table            | коммит `3b896c4` (column) + filter добавлен сейчас                     |
| 26  | Spooling shell | Import / validation / latest-history / revision panels                           | `components/spooling/*`, `store/spooling-store.ts`                     |
| 27  | Flange store   | Persisted flange-store (§19.x частично)                                          | `store/flange-store.ts`                                                |
| 28  | Devlog page    | 4-tab documentation page (`/documentation`)                                      | коммит `3591385`                                                       |
| 29  | F3             | `/fabrication` → `/fabrication/dashboard` redirect + collapsed sidebar nav fix   | `app/fabrication/page.tsx` + `components/pipeqc/sidebar-nav.tsx`       |
| 30  | I8             | Field Flange Bolt Progress — §19.2.1 torque assign / record / verify per joint   | `app/erection/flange-progress` + `store/flange-bolt-progress-store.ts` |

**Итого:** все 5 пунктов из «🔜 Next priority order» твоего предыдущего файла (E2.5, F2, E2.4, частично F1, N3) уже на main. Старый track_list, мягко говоря, отстал.

---

## 🔜 Next — рекомендуемый порядок на следующий спринт

Группирую по тому, что **обязательно** для презентационного нарратива vs. что **полировка**. Цель — закрыть upstream→downstream цикл так, чтобы он переживал live walkthrough без оговорок типа «это пока статика».

### Sprint Goal: "Demo-rehearsable end-to-end в обе стороны"

**P0 — Без этого live walkthrough не убедительный**

| #   | Phase | Что                                                                                                                                                                                               | Почему сейчас                                                                                                                                          | Размер |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | E2.2  | Live erection dashboard — `useErectionKPIs` + drill-down. Сейчас `components/erection-dashboard.tsx` (892 LOC) на статике; на live walkthrough это будет первый вопрос «а здесь цифры настоящие?» | Hassan-нарратив в шаге 7 и 10 опирается на этот экран. Если рядом с live fabrication-dashboard стоит статичный erection-dashboard — диссонанс заметен. | 0.5 д  |

**P1 — Закрывают слабые места которые ловит индустриальная аудитория**

| #   | Phase     | Что                                                                                                                                                                                                                              | Размер |
| --- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 4   | N4        | Enriched NDE notifications — на receive-results если есть rejected: «BTH-XXX: N welds rejected — rework cascaded»; на receive-results-all-accepted: «BTH-XXX: closed clean». Сейчас цепочка реализована частично, текста бедные. | 0.25 д |
| 5   | N5 (опц.) | §11.6 Client Examination Progress — owner's rep signs off N2 results. Это вторая подпись после inspector'а. EPC-аудитория узнает паттерн «owner's representative» сразу.                                                         | 0.5 д  |
| 6   | B3        | Systems / Subsystems / Material Class admin tabs (read-only). 7 → 10 вкладок в admin. Покрытие §3 поднимается с 7/26 до 10/26.                                                                                                   | 0.5 д  |
| 7   | §19.2     | ~~Flange torquing progress~~ — **I8 merged** (`/erection/flange-progress`). Remaining: gate I4 on `allVerified` + feed into RFT eligibility (I9).                                                                                | 0.5 д  |

**P2 — Новые треки, опциональны для следующего спринта**

| #   | Phase   | Что                                                                                                                                                                                     | Размер |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 8   | Track H | **Testpack Builder** (§15). Сейчас testpack'и — seed-only. По manual'у это UI где QC вручную собирает ISO в testpack. Если в demo попадёт QC manager — спросит первым.                  | 1.5 д  |
| 9   | Track D | Углубить spooling: ident code lookup + bolting report import (fake dialog) + manual revision lifecycle. P0-P2 alignment уже сделал shell; здесь — наполнение.                           | 1 д    |
| 10  | §12     | Workflow per erection stage (Spool Erection / Material Check / To Site / Welded / Bolted / Supported / RFT). Сейчас живёт как badges на field welds, manual описывает отдельные стадии. | 1 д    |

**P3 — НЕ в этом спринте, явно за горизонтом**

- §5 Import settings (NDE Matrix import, PMC import) — выходит за рамки демо
- §1–§2 Project Definition / System Referential — single-project demo не нуждается
- Real auth / multi-tenancy / backend — не demo-цель

### Если выбирать «минимум для следующего спринта»

**MVP-набор P0:** E2.2 = ~0.5 дня работы. С этим набором live walkthrough проходит без визуальных диссонансов.

**Расширенный набор P0+P1:** + N4 + N5 + B3 + §19.2 = ~2.5 дня работы. С этим набором демо переживает индустриального аудитора (бывший QC manager EPC), а не только VC.

**Полный спринт (рекомендую):** P0 + P1 + Track H (testpack builder) = ~4 дня. Дальше идёт фаза подготовки к презентации (см. ниже).

---

## 🎯 Стратегия подготовки к демонстрации и презентации (Track E — Demo Polish, переименован в «Demo Prep»)

Это не код-трек. Это блок задач, который должен идти **параллельно** последней неделе разработки, не **после** неё.

### Demo Prep — список задач

**DP1. Deployment harden (1 день)**

- Vercel deploy `main`. Проверить:
  - все Zustand stores персистятся в localStorage браузера зрителя
  - `resetAll()` (в top-nav) восстанавливает seed в один клик — это спасение в момент когда что-то пошло не так на live
  - SSR hydration: `7fda1c9` уже починил date formatting, но прогнать ещё раз на /reports после `f8e631c`
- Завести два URL: `pipeqc.vercel.app` (prod) и `pipeqc-stage.vercel.app` (дублирующий стенд на случай если первый ляжет). Это 2-минутная страховка.

**DP2. Demo script v1 (0.5 дня)**

- 8–10 минутный narrative по 11 шагам из `track-upstream.md §3`. Это уже готовый сценарий — нужно только **переписать формулировки** под аудиторию (см. presentation_strategy.md).
- Один cue card per role switch: Михаил / Сергей / Хассан / Анна. Чёткое «передаю микрофон» в каждый момент.
- **Anti-Murphy чеклист** (что делать если):
  - F5 — `resetAll()` и продолжить с шага 1
  - случайный клик на пустую страницу — открыть `/documentation` (devlog) и потянуть time
  - вопрос «а где X из manual'а» — есть `docs/MANUAL_COVERAGE_MATRIX.md`, можно показать

**DP3. Pre-recorded fallback (1 день)**

- Записать 5-минутный screencast по тому же 11-шаговому сценарию (Loom или OBS).
- Хранить в slides как backup slide — если live упадёт или сеть подведёт, переключаешься без потери ритма.
- Это стандартная практика для enterprise B2B демо (см. источники ниже).

**DP4. Seed data hardening (0.5 дня)**

- Прогнать `resetAll()` → пройти полный demo flow → убедиться что ни одна цифра не «ноль из-за того что seed не покрывает этот case». Сейчас seed в track_list упоминает «4 Material Check, 7 Weld Progress, 4 Fabricated, 3 QC Release, 1 Sent to Paint, 1 Painted, 1 Laydown» — этого хватает для воронки, но проверь Anna's flow тоже.
- Добавить пару «красивых» imperfections: один rejected weld c понятным rework code, один overdue NDE batch, один testpack который вот-вот станет RFLC. Это даёт визуальный «жизненный» tone вместо «всё green».

**DP5. Role-switch rehearsal (0.5 дня)**

- Прогнать 3 раза подряд, переключая роли в top-nav. Засечь время. Цель — 8–10 минут чистого walkthrough + 5–10 минут Q&A.
- Записать ответы на 5 самых вероятных вопросов (см. presentation_strategy.md).

**DP6. Pitch deck v1 (1.5 дня)** — см. ниже отдельный документ.

### Целевой состав времени на спринт

Если спринт 7 дней:

- День 1–4: P0 + P1 (или P0 + Track H, на выбор)
- День 5: DP1 (deploy) + DP4 (seed hardening) — параллельно с финальным тестированием
- День 6: DP2 (script) + DP6 (pitch deck v1)
- День 7: DP3 (screencast) + DP5 (rehearsal) + буфер

Если спринт 10 дней — добавляем P2 (Track H) и больше rehearsal'ов.

---

## 📊 Дельта против старого track_list — что изменилось в реальности

Чтобы было понятно почему этот файл другой:

1. **«Next priority» #1–5 закрыты:** E2.5, F2, E2.4, N3 — все в main. F1 частично (KPI цифры live, но drill-down chip ещё не на всех tiles).
2. **Track C появился из ниоткуда:** в твоём файле C1–C4 были все «⛔ TODO». В main лежит полная reports-view с 12 отчётами, 5 KPI tiles, search, download mock-flow.
3. **Track D шагнул из placeholder в shell:** spooling-view + import / validation / revision panels + persisted store. Это не полный §6, но уже не «placeholder header only».
4. **Manual-alignment pass:** reinstatement переехал с punch X/Y на flange Y/Z (это правильнее по §17.5); testpack release gates стали live-derived из welds/flange/NDE; NDE получил manual-facing vocabulary и tracer demo (NDE100 warning seam).
5. **In-app `/documentation` тоже устарел:** Tab 4 (Tracks & Stories) в `app/documentation/page.tsx` всё ещё показывает E2.5/F2/E2.4 как «Next», хотя они merged. Это надо подправить — `mergedTracks` array на строках ~270–280, `nextTracks` array на строках ~284–293.

---

## 🆕 Гэпы, которые НЕ закрыты и не на радаре спринта (для прозрачности)

1. §11.6 Client Examination Progress — owner's rep подпись (N5)
2. §15 Testpack Builder (Track H)
3. §12 полный erection workflow per stage
4. ~~§19.2 flange torquing input~~ — I8 merged; I9 = gate widening + RFT eligibility
5. Heat-treatment (PWHT) workflow — упомянут в weld panel, flow нет
6. Material traceability (heat number → mill certificate) — поля есть, flow нет
7. Welder qualifications mismatch validation как user story (есть в `lib/welder-qualifications.ts`, не оформлено)

Эти семь — потенциальный «Upstream-2» pass если получится pilot и поедем углублять.
