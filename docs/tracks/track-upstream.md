# Upstream Tracks — Fabrication / NDE / Erection

(план)

## 1. Контекст

Track A покрывает downstream: pressure test pipeline
(от line check до commissioning).
Fabrication / NDE / Erection — это **upstream**: всё
что происходит до того, как
тестпак становится "Ready For Line Check".

На данный момент эти три модуля **частично
реализованы**: что-то работает
end-to-end, что-то отображается, но не сохраняется,
что-то стоит заглушкой.
Цель этого документа — зафиксировать что есть, что
чинить, и в каком порядке.

После закрытия upstream-треков демо-нарратив
замыкается:

> \*\*Spool сварен в цеху → проверен NDE → отгружен на
> площадку →
> установлен → сделаны field welds → проверены NDE на
> площадке →
> ISO становится "Welded" → testpack становится RFLC
> → [Track A: Anna
>
> > начинает]\*\*

## 2. Три персоны (upstream)

### Sergey — Fabrication Shop Foreman

▎ "У меня 30 welds в работе. Двое welder-ов в
отпуске, трое welds
▎ вернулись с NDE на rework, и мне надо понять —
какие spools
▎ блокируют отгрузку на site. Excel-таблица
обновляется раз в день и
▎ к моменту совещания уже неактуальна."

### Mikhail — QC Engineer (NDE)

▎ "RT-плёнки пришли из лаборатории, 8 welds в batch
BTH-2025-0153.
▎ Один rejected — porosity. По мануалу я должен
запустить rework,
▎ уведомить welder-а, привязать новый weld к новому
batch-у. Сейчас
▎ это 4 разных Excel-файла и пара звонков."

### Hassan — Erection Superintendent

▎ "Spool TC-001 приехал на площадку. Я не знаю — все
ли его welds
▎ accepted, не лежит ли он в rework на складе
фабрикации. Если
▎ установлю и потом окажется что один weld открыт,
придётся резать
▎ и переваривать. Стоит 3 дня и злого PM-а."

## 3. Сводный демо-сценарий (upstream → Track A

handoff)

#: 1
Персона: Mikhail
Экран: `/nde`
Действие: Видит batch BTH-2025-0153 в статусе
"Results Received", 1 weld
rejected (WLD-099, code POR)
Демо-фраза: "Михаил начинает день с проверки того что
вчера пришло
из лаборатории"

#: 2
Экран: NDE Batch Detail (BTH-2025-0153)
Действие: Reviewer per-weld results → подтверждает
rejection → нажимает
"Mark for Rework"
Демо-фраза: "Один клик — и weld автоматически уходит
в rework на стороне
фабрикации, welder уведомлён"

#: 3
Персона: Sergey
Экран: Home (welder)
Действие: Видит уведомление "WLD-099 marked for
rework (POR — porosity)"
Демо-фраза: "Сергей узнаёт о проблеме через минуту, а
не через 3 дня"

#: 4
Экран: `/fabrication/weld-progress`
Действие: Открывает WLD-099 → detail panel →
перезаписывает welder

- weld date → mark Completed
  Демо-фраза: "Зафиксировал что переваривали, новый
  welder, новая дата"

#: 5
Персона: Mikhail
Экран: `/nde` → "+ Create New Batch"
Действие: Выбирает re-welded WLD-099 + ещё 4 welds на
RT → создаёт
BTH-2025-0157
Демо-фраза: "Создание нового batch-а как assemble —
пометил welds,
подписал inspector-а"

#: 6
Экран: NDE Batch Detail (BTH-2025-0157)
Действие: Issue → Receive results (per-weld: 5
Accepted) → Close
Демо-фраза: "На этот раз все welds приняты"

#: 7
Персона: Hassan
Экран: `/erection/dashboard`
Действие: Spool TC-001 → статус "Ready for delivery"
(все его welds
Accepted)
Демо-фраза: "Только теперь TC-001 разрешён к отгрузке
на площадку.
Раньше бы повезли вслепую"

#: 8
Экран: `/erection/weld-progress` (field welds)
Действие: TC-001 erected, field weld FW-022 made →
fitter + welder + date
→ Save
Демо-фраза: "Field weld отслеживается отдельно —
другая бригада,
другие условия"

#: 9
Экран: `/nde` → field weld batch BTH-2025-0158
Действие: FW-022 в новом batch-е, RT, Accepted, Close
Демо-фраза: "Site NDE — те же экраны что и shop NDE,
единая воронка"

#: 10
Экран: `/erection/dashboard`
Действие: ISO-1004 KPI → "Welded: ✓" (все spools
установлены, все
welds приняты)
Демо-фраза: "ISO готова — и это значит testpack
TP-205 становится
RFLC, что мы видели у Анны"

#: 11
Экран: `/` (Home)
Действие: Появилось уведомление "TP-205: 5 ISOs ready
for line check"
Демо-фраза: "Передаём микрофон Анне — Track A
начинается отсюда"

**Ключевая фраза:** "PipeQC объединяет три бригады
которые сейчас
работают параллельно с почтой и Excel-ом, в одну
воронку с
auditable handoff-ами. Каждый rejection виден всем
сразу, каждый
spool отгружается только когда документально готов."

---

## 4. Track F — Fabrication

**Что уже работает:**

- `/fabrication/weld-progress` — фильтрация, выбор
  weld-а, edit через
  detail panel, store-backed (`useWeldsStore`,
  persisted).
- KPI хук `useWeldsKPIs` → home page widget "Welds
  requiring action".
- Rework cascade: при NDE reject `markForRework()`
  вызывается на
  welds-store автоматически.

**Что сломано / отсутствует:**

- `/fabrication/dashboard` — KPI и графики
  **захардкожены**. Фильтры
  не фильтруют данные.
- `/fabrication/page.tsx` — placeholder, нет
  landing-страницы модуля.
- Нет "Send to NDE" в weld detail panel.
- Нет drill-down с dashboard на weld-progress.

| Фаза | Что                                          | Текущее состояние | Демо-вес |
| ---- | -------------------------------------------- | ----------------- | -------- |
| F1   | Wire fabrication-dashboard на `useWeldsKPIs` |

(8 цифр live: total, completed, rejected, rework,
acceptance rate, by-area split). Drill-down: клик по
KPI → `/fabrication/weld-progress?status=Rework` |
dashboard статичный | ⭐⭐ |
| F2 | "Send to NDE" в weld detail panel: выбор
welds (single или from spool) → переход в NDE
create-batch с пред-выбранными ID-шками | кнопки нет
| ⭐⭐⭐ ключевой handoff F→N |
| F3 | Заменить `/fabrication/page.tsx` placeholder
на module landing: 4 карточки (Dashboard / Weld
Progress / Rework Queue / Production Plan) с live
counts | placeholder | ⭐ |

**Экраны затрагиваемые:**

- `components/fabrication-dashboard.tsx` (871 LOC —
  рефакторинг под live data)
- `components/weld-detail-panel.tsx` (добавить
  Send-to-NDE action)
- `app/fabrication/page.tsx` (новый landing)

---

## 5. Track N — NDE

**Что уже работает:**

- `/nde` — batch management view, store-backed
  (`useBatchesStore`, persisted).
- Issue batch → Receive results (auto-accept all) →
  Close — работает.
- Mark for rework cascade в Fabrication welds-store.
- KPI хук `useBatchesKPIs` → home widgets "Active" +
  "Overdue".
- 4 категории уведомлений: `nde_overdue`,
  `nde_result`, `weld_progress`, `rework`.

**Что сломано / отсутствует:**

- **"Create New Batch" — стоит `toast.info("Coming 
soon")`** (это блокирует
  шаг 5 демо-сценария).
- **"Receive Results" auto-accept-ит все welds** —
  нет per-weld result
  entry (это блокирует шаг 2 демо: Mikhail не может
  реально
  reject-нуть конкретный weld). Сейчас работает
  только если seed-данные
  уже содержат rejected weld.
- "Mark for rework" rework codes выбираются
  автоматически — нужен picker
  из `lib/engineering-references.ts` (RW-001..RW-010
  уже есть после B2).
- Нет field-weld batches как отдельной категории (NDE
  matrix есть, но
  filter по shop/site нет).

| Фаза | Что                                         | Текущее состояние | Демо-вес |
| ---- | ------------------------------------------- | ----------------- | -------- |
| N1   | Create Batch wizard: 2-step dialog (Step 1: |

метод + service class + inspector + subcontractor;
Step 2: выбор welds через filtered table из
welds-store) → `createBatch()` мутация | toast.info |
⭐⭐⭐ блокирует шаг 5 |
| N2 | Receive Results: side panel с per-weld
picker (Accepted / Rejected). На Rejected —
обязательный выбор Rework Code из `REWORK_CODES`
(B2). 600–800 мс delay. Cascade на welds-store
сохраняется | auto-accept all | ⭐⭐⭐ блокирует шаг
2 |
| N3 | Source filter (Shop / Field) в batch table —
отделяем shop welds от field welds. Field welds
читаем из будущего erection-store (см. Track E2) |
смешано | ⭐ полезно после E2 |
| N4 | Уведомление при receive results если есть
rejected: "BTH-XXX: N welds rejected — rework
cascaded to fabrication" | реализовано частично | ⭐
|

**Экраны затрагиваемые:**

- `components/nde/batch-management-view.tsx` (706 LOC
  — добавить Create wizard)
- `components/nde/batch-detail-panel.tsx` (Receive
  Results side panel)
- Новые: `components/nde/create-batch-dialog.tsx`,
  `components/nde/receive-results-panel.tsx`

---

## 6. Track E2 — Erection

(E2 потому что Track E в PIPEQC_CONTEXT уже занят
"Demo polish".)

**Что уже работает:**

- `/erection/weld-progress` — field weld table,
  filter sidebar, detail panel.
  Edit field weld status работает.
- `/erection/dashboard` — отображает progress (spools
  by-status, field
  welds by-method, area completion).
- Erection status badge система (To Site / Erected /
  Welded / Bolted /
  Supported / RFT).

**Что сломано / отсутствует (КРИТИЧНО):**

- ❌ **НЕТ store-а.** `FIELD_WELD_DATA` загружается в
  `useState`,
  изменения теряются при перезагрузке. Это убивает
  демо если
  кто-то случайно нажмёт F5.
- Erection dashboard — статичные графики, не отражают
  реальные данные.
- Нет интеграции с NDE: невозможно сделать field NDE
  batch из erection.
- Нет связки с Fabrication: spool TC-001 не знает
  свой текущий статус
  (все ли welds Accepted?) — `erectionStatus` живёт
  изолированно.
- ISO-level rollup (когда ISO становится "Welded")
  отсутствует —
  Track A считает это из seed-флага.

| Фаза | Что                               | Текущее состояние | Демо-вес |
| ---- | --------------------------------- | ----------------- | -------- |
| E2.1 | Создать `store/erection-store.ts` |

(persisted, mirror того что есть в welds-store).
Перевести `field-weld-detail-panel` с `setWelds()` на
store mutations. KPI хук `useErectionKPIs` | ✅ Merged | ⭐⭐⭐ блокер для демо |
| E2.2 | Wire erection-dashboard на `useErectionKPIs`

- drill-down (клик по "5 RFT" →
  weld-progress?status=RFT) | статичный | ⭐⭐ |
  | E2.3 | Spool readiness gate: для каждого spool из
  `welds-store` (group by spoolNo) — derive
  `spoolReadyForSite = все его welds Accepted`.
  Показать pill "Ready for delivery" на dashboard.
  **Это бизнес-смысл связки F↔E** | связки нет | ⭐⭐⭐
  ключевой momentum шаг 7 |
  | E2.4 | "Send Field Weld to NDE" в
  field-weld-detail-panel — аналогично F2, но создаёт
  batch со source=field | кнопки нет | ⭐⭐ блокирует
  шаг 9 |
  | E2.5 | ISO weld completion rollup: derive
  `iso.weldStatus = "Done"` когда все spools ISO
  erected И все их welds Accepted. Эмитит уведомление
  "ISO-1004: welded — ready for line check" в
  testpack-store | hardcode в seed | ⭐⭐⭐ замыкает
  upstream→Track A handoff (шаг 11) |

**Экраны затрагиваемые:**

- Новые: `store/erection-store.ts`
- `app/erection/weld-progress/page.tsx` (свитч с
  useState на store)
- `components/erection/field-weld-detail-panel.tsx`
  (731 LOC — store mutations)
- `components/erection-dashboard.tsx` (769 LOC — live
  KPI)

---

## 7. Связь с Track A (handoff contract)

Только две точки соприкосновения нужно реально
реализовать:

1. **`recordIsoWelded(isoNo)` мутация в
   testpack-store** — вызывается из
   E2.5 когда ISO становится Welded. Внутри: эмитит
   уведомление,
   triggers recompute eligibility (если все ISO
   testpack-а Welded,
   testpack помечается `lineCheckEligibility = 
"Eligible"`).
2. **Reset Demo** должен сбрасывать welds-store +
   batches-store +
   erection-store (новый) — сейчас демо-store
   сбрасывает только
   testpack + admin.

Всё остальное — это handoff через нарратив, не через
код.

## 8. Приоритет реализации

Рекомендованный порядок (по убыванию демо-риска):

| Спринт                                 | Фаза                                      | Почему              | Время   |
| -------------------------------------- | ----------------------------------------- | ------------------- | ------- |
| 1                                      | **E2.1** Erection store                   | блокер демо (потеря |
| данных на F5)                          | 0.5 дня                                   |
| 2                                      | **N1** Create Batch wizard                | блокер шага 5       |
| демо-сценария                          | 1 день                                    |
| 3                                      | **N2** Per-weld Receive Results           | блокер шага 2       |
| — Михаил не может reject вручную       | 0.5 дня                                   |
| 4                                      | **E2.3** Spool readiness gate             | ключевой момент     |
| шага 7 — без него F→E handoff не виден | 0.5 дня                                   |
| 5                                      | **E2.5** ISO weld rollup + Track A bridge |
| замыкает upstream → Anna               | 0.5 дня                                   |
| 6                                      | **F2** Send-to-NDE из fabrication         | ключевой            |
| handoff F→N (шаг 5 будет красивее)     | 0.5 дня                                   |
| 7                                      | **E2.4** Send field-weld to NDE           | шаг 9 демо          |
| 0.5 дня                                |
| 8                                      | **F1** Live fabrication dashboard         | полирует,           |
| не блокирует demo                      | 1 день                                    |
| 9                                      | **E2.2** Live erection dashboard          | то же               | 0.5     |
| дня                                    |
| 10                                     | F3, N3, N4                                | косметика           | 0.5 дня |

**Минимально-демо-достаточный набор (MVP upstream):**
E2.1 + N1 + N2 + E2.3 + E2.5.
**С этим набором демо-нарратив проходит end-to-end за
8-10 минут.**

Полный объём (всё в таблицах) — 6 дней работы. MVP —
2.5 дня.

---

## 9. Что НЕ покрыто этим документом

- Spool fabrication preparation (`/spooling`) — это
  Track D в PIPEQC_CONTEXT.
- Welder qualifications mismatch validation на weld
  create — частично
  есть в `lib/welder-qualifications.ts`, но как user
  story не оформлено.
- Heat-treatment (PWHT) workflow — упоминается в weld
  panel поле
  `pwhtRequired`, но flow не существует.
- Material traceability (heat number → mill
  certificate) — поля есть,
  flow нет.

Эти 4 темы — потенциальный Track Upstream-2 если
останется время после
основных треков.

1. Самое срочное здесь — E2.1 (erection store).
   Сейчас если кто-то на питче случайно ткнёт F5 на
   /erection/weld-progress, все изменения исчезнут. Это
   не «гипотетический баг» — это реально может случиться
   во время демо.
2. N1 + N2 связаны: имеет смысл их делать одним
   промптом — модальное окно Create Batch и side-panel
   Receive Results используют одни и те же примитивы
   (выбор welds, picker rework codes из B2).
3. Сводный сценарий в секции 3 — это то что я бы
   повесил как «opening narrative» питча. Anna's flow из
   Track A работает только если перед этим зритель
   понял откуда взялся TP-205. Эти 11 шагов это
   объясняют.
4. Что не включил намеренно: дизайн-детали отдельных
   экранов (поля, колонки, layout) — для каждой фазы они
   выводятся аналогично Track A промптам и пишутся уже
   на этапе самого промпта-задания агенту.

Как двигаемся дальше — пишу промпт для E2.1 (erection
store, самый высокий риск)? Или сначала хочешь
что-то в этом документе поправить?
