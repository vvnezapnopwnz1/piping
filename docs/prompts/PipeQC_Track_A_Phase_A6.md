# Анализ работы агента — Phase A4+A5 + Nav fixes

Перечитал все файлы. **Сделано хорошо**, есть одна важная семантическая ошибка по бизнес-правилу. Покажу.

## ✅ Что отработано безупречно

| Чек                                                                                                                                      | Файл / строка                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Лейблы крошек в Title Case (13 новых)                                                                                                    | `top-nav.tsx:51-63`                                                                                                   |
| 5 редирект-страниц на промежуточных сегментах                                                                                            | `app/.../line-check\|item-clearance\|blinding\|testing-precomm\|reinstatement/page.tsx` — все используют `redirect()` |
| «← Back to Pressure Test» во всех 7 sub-screens                                                                                          | проверил в 4 vier'ах напрямую — есть                                                                                  |
| Blinding store: `assignBlinding`, `recordBlindingDate`, `useBlindingKPIs`, `BLINDING_TEAMS` (BT-01..BT-04)                               | `testpack-store.ts`, `testpack-seed.ts`                                                                               |
| Testing & Pre-comm screen с **каскадными датами** (test done заблокирован пока нет test start; pre-comm заблокирован пока нет test done) | `testing-precomm/progress-view.tsx:447-473`                                                                           |
| Notification cascade на climax: `"TP-205: hydrotest passed (pressure held — ready for pre-commissioning)"`                               | `testing-precomm/progress-view.tsx:177-185`                                                                           |
| Homepage прячет кнопку Preparation у Testing-карточки                                                                                    | `pressure-test-homepage.tsx:349` (`!isTesting`)                                                                       |
| persist v3 + migrate (full reset)                                                                                                        | `testpack-store.ts:287-288`                                                                                           |
| `recomputeBlindingEligibility` вызывается после `recordLineCheck` и `markPunchItemsCleared`                                              | в сторе                                                                                                               |

## ⚠ Один реальный баг (важно для демо)

Агент сам это пометил, и это **не косметика**, а **бизнес-логика**.

Правило eligibility для Blinding у агента упрощено до `openX == 0 на ISO тестпака`. Но в seed TP-201 содержит ISO-1003 (на котором висят 2 исторических X-замечания), а его остальные ISO (1001, 1002, 1020) — `NotEligible` (не поддержаны / не сварены).

**Что произойдёт в демо:** после того как Анна закроет все 3 X-замечания на ISO-1003 в шаге A2, **и TP-205, и TP-201 одновременно станут «Blinding Eligible»**. Это путает — TP-201 не должен быть готов к заглушке, потому что его линия даже не проверена.

Правильное правило (по мануалу §18.2 «Release Tracking»): тестпак готов к Blinding только когда **ВСЕ его ISO имеют `lineCheckStatus === "Done"`** _И_ `openX == 0`. Это правило мы пофиксим в следующей фазе вместе с A6.

---

# 📋 Мануал — продолжение, проверка A4 + A5 в браузере

> Это **продолжение** мануала A1+A2. Выполни сначала шаги 1–53 из предыдущего мануала, после чего ты должен быть в состоянии «TP-205: все X-замечания закрыты, карточка Item Clearance больше не амбер». Дальше:

## Часть 9. Карточка Blinding ожила

54. Сайдбар → **Pressure Test**.
55. Найди карточку **Blinding** (заглушение — установка временных заглушек на торцы тестпака перед опрессовкой).
56. На карточке должно быть **Eligible: 2** (это и есть тот баг из предыдущего раздела — TP-205 + TP-201). В норме демо мы хотим показывать **Eligible: 1**. После следующей фазы будет правильно.
57. Жми **«Open Preparation →»**.

## Часть 10. Blinding Preparation — назначаем бригаду заглушки

58. URL: `/testpack/pressure-test/blinding/preparation`.
59. Увидишь таблицу строк-**тестпаков** (не ISO!) — TP-205, возможно TP-201.
60. Колонки: `Testpack No · System · Subsystem · Location · Priority · # ISOs · # Welds`.
61. Чекни только **TP-205** (если есть TP-201 — оставь его пока).
62. Плавающая панель: `"1 testpack selected · Assign to: [BT select] · [Generate Blinding Request]"`.
63. В выпадашке выбери **BT-01** (Blinding Team Alpha — бригада заглушки №1).
64. Жми **«Generate Blinding Request»** (фиолетовая кнопка — Blinding в дизайне получил `violet-600` акцент).
65. ~700 мс → тост `"Blinding Request BR-2026-001 created · 1 testpack assigned to BT-01"` с кнопкой **«View in Progress»**.
66. Жми **«View in Progress»**.

## Часть 11. Blinding Progress — бригада BT-01 отчитывается

67. URL: `/testpack/pressure-test/blinding/progress?request=BR-2026-001`.
68. Видишь строку TP-205 со статусом `Assigned`.
69. **Кликни по строке TP-205**.
70. Справа открывается боковая панель:
    - Readonly: Testpack No, System, Location, Priority, Assigned to (BT-01), Assigned on
    - Date input: **Blinding date** (дата установки заглушек) — поставь сегодняшнюю
71. Жми **«Save blinding record»**.
72. ~700 мс → строка пропадает из основной таблицы → тост `"TP-205: blinding recorded"` → внизу появилась секция **«Recently blinded»** с TP-205 (затемнённая).

## Часть 12. Уведомление + KPI Testing активировался

73. Иди на главную (`/`).
74. **Должно появиться новое уведомление (success / зелёное):**
    - `"TP-205: blinded — ready for hydrotest"`.
    - hydrotest = гидроиспытание — закачивают воду под давлением выше рабочего, держат 2–4 часа, смотрят не падает ли давление.
75. Pressure Test → проверь карточки:
    - **Blinding**: Eligible 1 (или 0 если уже всё назначил), Assigned 0, Done **1**
    - **Testing & Pre-comm**: **Ready for testing: 1** (TP-205 теперь готов к опрессовке)
76. У карточки Testing & Pre-comm **есть только одна кнопка «Open Progress →»** (Preparation скрыта по дизайну — Easy Piping не управляет подготовкой к опрессовке).

## Часть 13. Testing & Pre-comm — кульминация демо 🎯

77. Жми **«Open Progress →»** на карточке Testing & Pre-comm.
78. URL: `/testpack/pressure-test/testing-precomm/progress`.
79. KPI-полоска: `Ready for testing: 1 · In test: 0 · Tested: 0 · Pre-commissioned: 0`.
80. Таблица с TP-205, колонки: `Testpack · System · Location · Blinded on (заполнено) · Test start (—) · Test done (—) · Pre-comm (—)`.
81. **Кликни по строке TP-205**.
82. Справа панель с тремя датами:
    - **Testing start date** — поставь сегодняшнюю.
    - **Testing done date** — пока заблокировано (правильно — нельзя закончить тест не начав).
    - **Pre-commissioning date** — пока заблокировано.
83. Жми **«Save dates»**. ~700 мс → тост `"TP-205: dates updated"` → панель закрывается.

### Микро-шаг — закрываем тест

84. Снова кликни по строке TP-205. Поля раскрываются с уже сохранёнными значениями.
85. **Testing done date** — теперь активно. Поставь сегодняшнюю.
86. **Pre-commissioning date** — всё ещё заблокировано (откроется после сохранения done date).
87. Жми **«Save dates»**.
88. ~700 мс. Иди на главную (`/`).
89. 🎯 **Должно появиться уведомление-кульминация:**
    - `"TP-205: hydrotest passed (pressure held — ready for pre-commissioning)"`.
    - Severity: success / зелёное.
    - **Это и есть тот момент, ради которого вся 13-частная цепочка существует** — труба прошла испытание давлением. Озвучь это на питче.

### Микро-шаг — пусконаладка

90. Pressure Test → Testing & Pre-comm Open Progress → TP-205. Все три даты раскрываются, последняя (**Pre-commissioning date**) теперь активна.
91. Поставь сегодня + Save.
92. Уведомление: `"TP-205: pre-commissioning complete"`.
93. Pressure Test → Testing & Pre-comm: KPI **Pre-commissioned: 1**.

## Часть 14. Проверка крошек и навигации

94. Открой `/testpack/pressure-test/blinding/preparation`.
95. Крошки сверху должны читаться: **`Testpack › Pressure Test › Blinding › Preparation`** (Title Case, не kebab-case).
96. **Кликни по слову «Blinding»** в крошках. Должно вернуть на `/testpack/pressure-test` (без 404).
97. Открой любой sub-screen — слева сверху виден линк `← Back to Pressure Test`. Клик → возврат на homepage.
98. Повтори для `Line Check`, `Item Clearance`, `Testing & Pre-comm`, `Reinstatement` (последний — placeholder для A6, тоже редирект).

## ⚠ Что важно отметить во время демо

- **TP-201 может появиться в Blinding** как «случайный гость». Если это случилось — игнорируй, оно пофиксится в следующей фазе.
- После hydrotest passed остаётся одно Y-замечание из Анны-шага A1 (PC-04 rust on support). Оно по бизнес-логике должно быть закрыто через **Reinstatement** (восстановление) — это и есть фаза A6.

---

# 🚀 Что дальше — Phase A6 + readiness-gate fix

Это будет **последняя обязательная фаза business flow Анны**. После неё демо замкнётся: TP-205 прошёл от утреннего уведомления до полной готовности к commissioning. Y-замечание закрыто, фланцы восстановлены, тестпак подписан.

## Промпт для агента (A6 + gate fix)

````markdown
# Task: PipeQC Track A, Phase A6 — Reinstatement + readiness-gate tightening

Read `docs/PIPEQC_CONTEXT.md` first. Phases A1–A5 are merged. This slice has two parts:

- **Part 1 — Fix Blinding eligibility rule** (small but important for demo)
- **Part 2 — Reinstatement workflow (A6)** — closes the business flow

## Part 1 — Tighten Blinding readiness gate

The current `recomputeBlindingEligibility` in `store/testpack-store.ts` only checks `openX == 0` per testpack. This wrongly marks TP-201 eligible because its ISO-1003 has the historical X items (which get cleared in the A2 flow), even though TP-201's other ISOs are not line-checked.

Tighten the rule:

```ts
// A testpack becomes eligible for Blinding when:
//   1) all its ISOs have lineCheckStatus === "Done"
//   2) AND the testpack has 0 open category-X punch items across all its ISOs
//   3) AND its current blindingStatus is "NotEligible" or "Eligible" (don't demote Assigned/Done)
//
// If a testpack was "Eligible" but a condition becomes false (e.g. a new X item),
// demote back to "NotEligible". Don't touch Assigned/Done.
```

Apply this rule inside `recomputeBlindingEligibility`. Call it also after `assignLineCheck` (no — that doesn't change Done status; skip) and after `recordLineCheck` and `markPunchItemsCleared` (already wired). No additional call sites needed.

**Acceptance for Part 1:**

- Run A1 → A2 to completion. Only **TP-205 becomes Blinding Eligible** (not TP-201). Verify on `/testpack/pressure-test` Blinding card: `Eligible: 1`.

## Part 2 — Reinstatement workflow (manual §16.8–16.9)

### Business context (explain to yourself before coding)

After hydrotest passes, the temporary blind plates installed during Blinding need to come off. Flange joints that were "Y" category (rusted gaskets, supports etc. — punch items deferred till after test) get reinstated — permanent gasket installed, bolts torqued to spec, joint signed off by a named **jointer**. Category Z items wait till after pre-commissioning. Per §16.8, only Y flange joints attached to a testpack that has been **tested** appear in Reinstatement Preparation. Z joints appear only after pre-comm.

For this demo we'll keep it simple: a **Reinstatement work item** is "any open Y or Z punch item attached to a testpack". It's eligible for reinstatement when:

- category Y: testpack's `testingDoneDate` is set (testpack has been tested)
- category Z: testpack's `preCommDate` is set (testpack pre-commissioned)

(We're treating punch items as proxies for "flange joints to reinstate" — simplification OK for demo.)

### Store changes (`store/testpack-store.ts` + `lib/testpack-seed.ts`)

Add to types in `testpack-seed.ts`:

```ts
export interface ReinstatementRequest {
  id: string; // "RR-YYYY-NNN"
  createdAt: string;
  assignedTo: string; // reinstatement team code, e.g. "RT-01"
  punchItemIds: string[];
}

// Extend PunchItem (already exists) with:
//   reinstatedAt?: string
//   reinstatedBy?: string         // reinstatement team code
//   reinstatementRequestId?: string
//   jointerNo?: string            // jointer code from JOINTER_LIST
//   reportNo?: string             // free text
//   tagNo?: string                // free text
```

Add seed referentials:

```ts
export const REINSTATEMENT_TEAMS = [
  { code: "RT-01", name: "Reinstatement Team Alpha" },
  { code: "RT-02", name: "Reinstatement Team Bravo" },
  { code: "RT-03", name: "Reinstatement Team Charlie" },
];
export const JOINTER_LIST = ["J-001", "J-002", "J-003", "J-004", "J-005"];
export const SEED_REINSTATEMENT_REQUESTS: ReinstatementRequest[] = [];
```

Add to store state: `reinstatementRequests: ReinstatementRequest[]`.

New selectors:

- `getReinstatementEligibleItems()` — open punch items where category is Y and the testpack of the ISO they belong to has `testingDoneDate` set; OR category is Z and the testpack has `preCommDate` set; AND `reinstatementRequestId` is not set; AND `reinstatedAt` is not set; AND `clearedAt` is set (i.e. NOT still in Item Clearance — they were already cleared during A2, but now need physical reinstatement). **Hmm — re-read the rule.** Actually punch items in our model don't have a clean separation between "cleared" and "needs reinstatement". For demo purposes, simplify:
  - Eligible for reinstatement = open Y items on tested testpacks + open Z items on pre-commed testpacks, where `reinstatementRequestId` is not set.
  - When you "clear" a Y item in A2 it stays open in our model. That's fine for demo.
- `getAssignedReinstatementItems(team?: string)`
- `getCompletedReinstatementItems()`
- `getNextReinstatementRequestId()` — format `RR-YYYY-NNN`

New mutations:

- `assignReinstatement(punchItemIds: string[], team: string) => { requestId: string }` — same shape as `assignItemClearance`.
- `markReinstated(punchItemId: string, payload: { date: string; jointerNo: string; reportNo: string; tagNo: string; reinstatedBy: string })` — record completion **per-item** (not batched — each reinstatement has unique jointer/tag).

New KPI hook:

- `useReinstatementKPIs()` → `{ eligibleY, eligibleZ, assignedCount, doneCount }`.

Bump persist `version: 4` with `migrate: return undefined`.

Wire `resetDemo` and demo-store's `resetAll`.

### Seed adjustment

In A1 flow, when Anna marks ISO-1004 line check done she adds 1 Y punch item (PC-04 "Rust on support"). After A5 the testpack TP-205 is tested. That Y item is now eligible for reinstatement — perfect for the demo.

In the seed file there's also one historical Y item (PI-001 on ISO-1003, already `clearedAt` set). Leave it — it won't show in reinstatement queue because its testpack (TP-201) isn't tested.

No further seed changes.

### Screens

#### Reinstatement — Preparation

- Route: `/testpack/pressure-test/reinstatement/preparation`
- Component: `components/testpack/reinstatement/preparation-view.tsx`
- Pattern: clone `item-clearance/preparation-view.tsx` (rows = punch items).
- Sidebar filters: Category (Y/Z multi-select, default both ticked), Test Pack, System, Area Classification.
- KPI strip: `Eligible Y: N · Eligible Z: N · Assigned: N · Done: N`.
- Table columns: `Punch ID · Code · Description · Cat · ISO · Testpack · Originator · Created`.
- Floating action bar: `{n} items selected · Assign to: [RT select] · [Generate Reinstatement Request]` → 600–800 ms → toast `"Reinstatement Request RR-2026-001 created · 1 items assigned to RT-01"` with action `View in Progress`.

**IMPORTANT:** the preparation route must also be reachable from the homepage (currently the Reinstatement card fires `toast.info`). Wire it.

#### Reinstatement — Progress

- Route: `/testpack/pressure-test/reinstatement/progress`
- Component: `components/testpack/reinstatement/progress-view.tsx`
- Reads `?request=` and `?team=`.
- KPI strip same as Prep but tilted toward in-progress.
- Table of assigned punch items, click row → side panel:
  - readonly: Punch ID, Code, Description, Cat badge, ISO, Testpack, Assigned to, Assigned on
  - form (all required):
    - **Joint date** (date picker, default today)
    - **Report No** (text, free-form)
    - **Jointer No** (select from `JOINTER_LIST`)
    - **Tag No** (text, free-form)
  - "Save reinstatement record" — disabled until all 4 fields filled.
- 600–800 ms delay → store mutation → row leaves table → toast `"Punch PI-{id} reinstated"`.
- Notification cascade: when the **last open Y or Z item** of a testpack is reinstated, fire a **success** notification `"TP-{no}: reinstatement complete — ready for commissioning"`.
- Below: "Recently reinstated" section.

### Wire homepage

In `components/testpack/pressure-test-homepage.tsx`:

- Reinstatement card: live numbers from `useReinstatementKPIs()`. Show `Eligible Y + Eligible Z` as "Ready", `assignedCount` as "Ongoing", `doneCount` as "Done".
- Replace toast.info for the two Reinstatement buttons with `router.push`.

### Replace the `/reinstatement/page.tsx` redirect

Currently this is a redirect. Now it has children — but the segment itself still shouldn't be a destination. Keep the redirect.

### Constraints (unchanged)

1. No new npm deps.
2. `"use client"`.
3. Reuse patterns.
4. 600–800 ms delay before mutations.
5. No backend, no fetch.
6. Don't break A1–A5 regression.

### Acceptance test (full A1 → A6 flow)

Fresh localStorage:

1–11. Run A1+A2 to clear all X items on TP-205. Verify: Blinding Eligible: **1** (only TP-205, not TP-201 — Part 1 fix).
12–15. Run A4 Blinding: assign TP-205 to BT-01, save blinding date. Notification "TP-205: blinded — ready for hydrotest".
16–19. Run A5 Testing: set test start, save → set test done, save → climax notification "TP-205: hydrotest passed". Set pre-comm date, save → "TP-205: pre-commissioning complete". 20. `/testpack/pressure-test` — Reinstatement card now shows `Ready: 1` (the Y item from ISO-1004 created during A1). 21. Click **Open Preparation →** on Reinstatement. 22. Sees the Y item in the table. 23. Select it, pick RT-01, click "Generate Reinstatement Request". Toast `RR-2026-001` with action. 24. View in Progress → row visible. 25. Click row → side panel. Fill: Joint date today, Report No "RPT-001", Jointer No J-001, Tag No "T-001". Save. 26. ~700 ms → row leaves → toast → notification fires on `/`: **"TP-205: reinstatement complete — ready for commissioning"**. 27. `/testpack/pressure-test` — Reinstatement Done: 1. 28. Navigation regression: breadcrumb labels Title Case, "Reinstatement" segment redirects to homepage, Back link on both new screens works. 29. Reset Demo from top nav → all counts return. 30. `npx tsc --noEmit` and `npm run build` clean.

### Definition of done

- All 30 acceptance steps pass.
- A1–A5 regression intact (full chain works).
- TP-201 no longer leaks into Blinding eligibility.
- `docs/PIPEQC_CONTEXT.md` file-structure updated.

Report files created/modified, deviations, steps you couldn't verify manually.
````

---

После выполнения A6:

- Business flow Анны замкнётся: утреннее уведомление → 7 этапов → testpack готов к commissioning.
- TP-201 перестанет «лезть» в Blinding-очередь.
- Останется фаза **A3 — Testpack Explorer Release Tracking** (manager view, 7 readiness-gates кликабельные → ссылаются на A1–A6 экраны). Это финальный «вау» для инвестора — показать сводный экран PM-а.

Передавай промпт A6. После проверки сделаем мануал «полный демо-сценарий от А до Я» (30+ шагов) для рехёрсала.
