# Единый канонический источник моковых данных PipeQC

**Дата:** 2026-05-26
**Статус:** Design (утверждён, готов к передаче на реализацию)
**Автор:** brainstorming-сессия
**Исполнитель:** отдельный агент (prompt-driven workflow)

---

## 1. Проблема

Демо-данные приложения раздроблены на несколько изолированных «вселенных», которые
физически не пересекаются по ключам. Это видно прямо на презентации:

- **Fabrication → Welded/Bolted**: всего 3 записи, все в статусе `Confirmed`; диалог
  открывается, но действий нет.
- **Fabrication → Laydown**: 4 записи, все в одном статусе.
- **Fabrication → Material Check**: все pieces помечены `not in Project Piping Material
  List`, потому что heat-номера сидов не совпадают с админ-списком.

### Корень проблемы — три+ независимых схемы номеров спулов

| Слой | Файл-источник | Схема spool | heat-номера |
|---|---|---|---|
| Admin / Referential (**источник правды**) | `store/admin-store.ts` | — | `HT-2024-001..008` |
| Erection (welded/bolted, field-MC) | `lib/erection-stage.ts` | `PL-CW200-*`, `PL-FU300-*`, `PL-TK100-*` | `HT-9981`, `HT-4421`, `HT-3301`… (**нет в Piping List**) |
| Laydown / spools | `lib/spool-data.ts` | `SP-1003-A/B` | — |
| Spooling / Testpack | `store/spooling-store.ts`, `lib/testpack-*.ts` | `SP-UT-*`, `SP-PG-*` | — |

Спул, «проходящий» по приложению, в каждом модуле — это разный, не связанный объект.
Поэтому статусы не разнообразны (каждый сид написан вручную и наспех), а ссылки на
Admin/Referential не сходятся.

### Каноническая модель уже есть

`docs/tracks/db_.md` описывает целевой граф сущностей:

```
TEST_PACK ──< ISO_DRAWING ──< SPOOL ──< MATERIAL_PIECE
                   │              └────< WELD ──o NDE_BATCH
                   └──< WELD (field)
TEST_PACK ──< PUNCH_ITEM
```

Это и есть «хребет», вокруг которого строится единый датасет.

---

## 2. Решения (утверждены)

1. **Полная унификация.** Один канонический fixtures-модуль = единственный источник.
   Все стора берут свои срезы из него; старые inline-сиды удаляются. Все
   spool/heat/ISO/weld связаны по хребту `db_.md`.
2. **~14 hero-спулов**, каждый намеренно заморожен на своей стадии жизненного цикла,
   чтобы покрыть все статусы и edge-кейсы.
3. **Каноническая схема имён спулов:** `PL-<система>-<NNN>-<X>` (как в
   `erection-stage.ts`, напр. `PL-CW200-005-A`).

---

## 3. Архитектура

Новый каталог `lib/fixtures/` — **единственный** источник демо-данных:

```
lib/fixtures/
  spine.ts          // 14 hero-спулов: дерево TEST_PACK→ISO→SPOOL→PIECE/WELD→NDE_BATCH→PUNCH
  referential.ts    // реэкспорт админ/референс данных как источника правды
                    //   (heats/pipingMaterialList, WPS_LIST, WELDER_QUALIFICATIONS,
                    //    NDE_MATRIX, subcontractors, PDS areas, teams)
  derive/
    fabrication.ts  // material-check, paint, qc-release, laydown, shop-welds
    erection.ts     // to-site, erected, welded-bolted, field-mc, supports, rft,
                    //   flange-bolt, field-welds
    nde.ts          // NDE-батчи из shop+field welds
    testpack.ts     // test packs, iso, iso↔spool, checking, punch, pressure tests
  validate.ts       // dev-time проверка ссылочной целостности (Секция 6)
  index.ts          // публичный API: прежние имена *_SEED, derived из spine
```

### Принципы

- **Spine описывает каждый спул ОДИН раз** как полный объект жизненного цикла.
  derive-функции «проецируют» его в плоские записи, которые ждёт каждый стор.
- Один спул **не может рассинхронизироваться** между модулями — у него один источник.
- **Сигнатуры стора и доменные типы НЕ меняются.** Меняется только происхождение
  данных. Значит, UI/компоненты трогать не нужно — это требование, а не пожелание.
- derive-функции **чистые**: `derive*(spine, referential) → XXX_SEED[]`. Без побочных
  эффектов, детерминированы.

### Поток данных

```
admin-store seeds ──┐
                    ├─→ referential.ts ──┐
db_.md entity model─┘                    ├─→ derive/*.ts ──→ index.ts (*_SEED) ──→ stores
                    spine.ts ────────────┘                                          │
                                                                                    └─→ UI
```

Мутации стора (confirm, placeOnYard, signOff…) остаются как есть и работают поверх
derived-сида в localStorage. `resetAll()` в `demo-store` пере-derive из spine.

---

## 4. Канонический хребет и ростер из 14 hero-спулов

### Системы

| Код | Описание | Материал | heat-пул (из Piping List) |
|---|---|---|---|
| `CW200` | Cooling Water | CS-A106B | `HT-2024-001`, `HT-2024-002`, `HT-2024-007` |
| `FU300` | Fuel Gas | LTCS-A333 | `HT-2024-006`, `HT-2024-008` |
| `TK100` | Tank Farm | SS-316L | `HT-2024-003`, `HT-2024-004` |

(P91 heat `HT-2024-005` используется опционально для демонстрации alloy/PWHT-кейса.)

### Ростер спулов

Каждый спул заморожен на своей стадии. «Стадия» = самый дальний модуль, в котором у
спула есть данные; во всех предыдущих модулях у него консистентная завершённая история.

| # | Spool | ISO | TestPack | Заморожен на | Демонстрирует |
|---|---|---|---|---|---|
| 1 | `PL-CW200-001-A` | ISO-CW200-01 | — | Spooling/Engineering | ISO на проверке, не в фабрикации |
| 2 | `PL-CW200-002-A` | ISO-CW200-01 | — | Material Check — OK | все pieces валидны, heat ∈ Piping List |
| 3 | `PL-CW200-003-A` | ISO-CW200-01 | — | Material Check — **NC** | 1 piece non-conformance + 1 heat намеренно НЕ в списке (алерт) |
| 4 | `PL-CW200-004-A` | ISO-CW200-02 | — | Fit-up / Shop weld в работе | сварка идёт, NDE ещё нет |
| 5 | `PL-FU300-005-A` | ISO-FU300-01 | — | NDE — **Accepted** | RT-батч принят |
| 6 | `PL-FU300-006-A` | ISO-FU300-01 | — | NDE — **Rejected → rework** | reject + rework code, повторный батч |
| 7 | `PL-FU300-007-A` | ISO-FU300-01 | — | PWHT done / Paint в работе | термообработка завершена, покраска идёт |
| 8 | `PL-TK100-008-A` | ISO-TK100-01 | — | QC Release — **held** | hold по open item |
| 9 | `PL-TK100-009-A` | ISO-TK100-01 | — | Laydown (на складе) | placed on yard, не released |
| 10 | `PL-TK100-010-A` | ISO-TK100-01 | TP-TK100-A | To-site / released | отгружен на площадку |
| 11 | `PL-CW200-011-A` | ISO-CW200-02 | TP-CW200-A | Erection: field MC + field weld | монтаж, полевой стык |
| 12 | `PL-CW200-012-A` | ISO-CW200-02 | TP-CW200-A | Bolted / flange-bolt + supports | болтовые соединения, опоры |
| 13 | `PL-FU300-013-A` | ISO-FU300-02 | TP-FU300-A | Testpack: line-check / blinding | в пакете, готовится к гидротесту |
| 14 | `PL-TK100-014-A` | ISO-TK100-02 | TP-TK100-A | Hydrotested + **punch X/Y/Z** | тест пройден, открытые пунши всех категорий |

### Разнообразие на верхних уровнях

- **ISO** (≈6 шт.): статусы должны различаться — `In Checking`, `Approved`,
  `Released for Fab`, `Superseded` (с revision-конфликтом для демонстрации в Spooling).
- **TestPack** (≈4 шт.): `Not Started`, `In Line Check`, `Blinding`, `Hydrotested`.
- **NDE-батчи**: минимум один `Accepted`, один `Rejected`, один `Pending`.
- **Punch items**: по одному примеру категорий X (test-blocking), Y (post-test),
  Z (post-commissioning).

### Правило heat-номеров

Все pieces всех спулов используют heat строго из `pipingMaterialList`
(`HT-2024-001..008`) — **кроме одного намеренного NC-кейса** (спул #3), где один piece
ссылается на heat вне списка. Этот piece помечается в spine флагом
`intentionallyInvalid: true`, чтобы валидатор (Секция 6) его пропускал, а UI корректно
показывал алерт «not in Project Piping Material List» — это легитимный демо-кейс.

---

## 5. Слой деривации (контракты по сторам)

Для каждого стора — чистая derive-функция, возвращающая ровно тот тип, который стор
импортирует сейчас. **Типы брать из существующих файлов, не переопределять.**

### `derive/fabrication.ts`

| Экспорт (прежнее имя) | Тип | Логика |
|---|---|---|
| `MATERIAL_CHECK_SEED` | `MaterialCheckRecord[]` | по спулам со стадии ≥ MaterialCheck; pieces из spine; статус NC для #3 |
| `PAINT_SEED` | `PaintRecord[]` | по спулам со стадии ≥ Paint |
| `QC_RELEASE_SEED` | `QCReleaseRecord[]` | по спулам со стадии ≥ QCRelease; hold для #8 |
| `LAYDOWN_SEED` | `LaydownRecord[]` | по спулам на Laydown/To-site; placed без release для #9 |
| `WELD_DATA` | `WeldJoint[]` | shop-welds из spine.welds (type=SHOP) |

### `derive/erection.ts`

| Экспорт | Тип | Логика |
|---|---|---|
| `TO_SITE_SEED` | `ToSiteRecord[]` | спулы со стадии ≥ ToSite |
| `ERECTED_SEED` | `ErectedRecord[]` | спулы со стадии ≥ Erected |
| `WELDED_BOLTED_SEED` | `WeldedBoltedRecord[]` | спулы со стадии ≥ Erection; **разные статусы**, не все Confirmed |
| `FIELD_MC_SEED` | `FieldMaterialCheckRecord[]` | pieces из spine с heat ∈ Piping List; `pieces[].status`, `nonConformanceCount` консистентны |
| `SUPPORT_SEED` / `SUPPORTED_SEED` | `SupportItem[]` / `SupportedRecord[]` | по спулам с опорами (#12) |
| `RFT_SEED` | `RFTRecord[]` | ready-for-test флаги по стадии |
| `FLANGE_BOLT_SEED` | `FlangeBoltProgressRecord[]` | болтовые соединения (#12) |
| `FIELD_WELD_DATA` | `FieldWeldJoint[]` | field-welds из spine.welds (type=FIELD) |

### `derive/nde.ts`

| Экспорт | Тип | Логика |
|---|---|---|
| `NDE_BATCHES` | `NdeBatch[]` | группировка welds из spine по батчам; статусы Accepted/Rejected/Pending; метод по `NDE_MATRIX` |

### `derive/testpack.ts`

| Экспорт | Тип | Логика |
|---|---|---|
| `SEED_TEST_PACKS` | `TestPackRecord[]` | 4 пакета из spine |
| `SEED_ISOS` | `ISORecord[]` | 6 ISO из spine; разные статусы |
| `SEED_ISO_SPOOLS` | `{isoId, spoolIds}[]` | связь ISO↔спул из spine |
| `SEED_CHECKING_REQUESTS` / `SEED_PUNCH_ITEMS` | … | line-check (#13), punch X/Y/Z (#14) |
| `PRESSURE_TEST_ACTIVITIES` | `PressureTestActivity[]` | гидротест для #14 |

### Мутации и reset

- Мутации стора не трогаем — они работают поверх derived-сида.
- `demo-store.resetAll()` уже вызывает `resetXxx()` каждого стора; каждый `resetXxx`
  должен пере-derive из spine (т.е. `cloneSeed()` теперь читает derived-константу).

---

## 6. Валидатор ссылочной целостности

`lib/fixtures/validate.ts` — функция `validateFixtures(): ValidationIssue[]`,
запускаемая в dev. Это автоматизация «проверок соответствия правилам Admin/Referential».

### Инварианты

1. Каждый `heatNo` в spine ∈ `pipingMaterialList` — **кроме** pieces с
   `intentionallyInvalid: true`.
2. Каждый `welderId` сварки ∈ активных `WELDER_QUALIFICATIONS`.
3. Каждый `wps` сварки ∈ `WPS_LIST` со `status: Active` и совместим по baseMaterial.
4. Каждый `spoolNo` уникален и принадлежит ровно одному ISO.
5. Каждый ISO принадлежит ≤ одному TestPack; spool наследует TestPack своего ISO.
6. NDE-метод стыка соответствует `NDE_MATRIX` по serviceClass/диаметру/толщине.
7. Каждая ссылка subcontractor/PDS-area/team существует в admin-сидах.
8. Каждый `material` спула ∈ `systemReferentials.materialTypes`.
9. Punch item ссылается на существующий TestPack; категория ∈ {X,Y,Z}.

### Запуск

- Vitest-тест `lib/fixtures/__tests__/validate.test.ts`: `expect(validateFixtures()).toEqual([])`.
- Опционально npm-скрипт `validate:fixtures` (тонкая обёртка над тем же модулем).

Падение = данные рассинхронизированы; сообщение должно называть спул/поле/ожидаемое.

---

## 7. План миграции (для исполнителя)

Выполнять по шагам, проверяя сборку и типы после каждого.

1. **Создать `lib/fixtures/referential.ts`** — реэкспорт админ/референс источников
   правды (импорт из `engineering-references.ts`, `welder-qualifications.ts`, и
   seed-функций admin-store, вынесенных при необходимости в shared-модуль, чтобы не было
   циклической зависимости store↔lib).
2. **Создать `lib/fixtures/spine.ts`** — 14 спулов как полные объекты жизненного цикла
   (типы для spine определить локально; они НЕ заменяют доменные типы сторов).
3. **Написать `derive/*.ts`** — по одному стору за раз, сверяя возвращаемый тип с
   текущим импортом стора. Не менять доменные типы.
4. **`lib/fixtures/index.ts`** — реэкспорт всех `*_SEED` под прежними именами.
5. **Перенаправить источники:** в `lib/*-data.ts` / `lib/*-stage.ts` заменить inline-сид
   на `export { XXX_SEED } from "@/lib/fixtures"` (или перенаправить импорты сторов прямо
   на `@/lib/fixtures`). Прежние имена сохранить, чтобы стора и UI не трогать.
6. **Написать `validate.ts` + тест**, прогнать, починить расхождения.
7. **UI-проверка:** demo-reset → обойти все модули (Admin, Spooling, Fabrication:
   Material Check / Welded-Bolted / Laydown / Paint / QC Release, NDE, Erection, Testpack,
   Tracking, Reports). Убедиться, что статусы разнообразны и алерты корректны.
8. **Удалить мёртвый код** старых inline-сидов.

### Затронуто

~12 lib-сид-файлов и ~28 сторов. Механически и предсказуемо: типы и сигнатуры
неизменны, меняется только происхождение данных.

### Риски

- **Циклические зависимости** store↔lib: seed-функции admin (heats, teams) сейчас живут
  в `store/admin-store.ts`. Если `lib/fixtures/referential.ts` импортирует из store —
  возможен цикл. Решение: вынести чистые seed-данные admin в `lib/` (напр.
  `lib/admin-seed.ts`), а admin-store импортирует их оттуда. Исполнитель проверяет граф
  импортов.
- **Расхождение типов**: derive обязан возвращать точный текущий тип; при несовпадении —
  чинить derive, НЕ менять доменный тип.
- **localStorage**: у пользователя на демо-машине может остаться старый persisted-стейт.
  Шаг 7 начинается с явного demo-reset (или очистки localStorage).

---

## 8. Вне scope

- Изменение доменных типов, схем сторов, UI-компонентов.
- Реальный бэкенд/БД — данные остаются в localStorage.
- Рефакторинг логики мутаций сторов.
- Генерация bulk-датасета (>14 спулов) — отвергнуто в пользу курируемого набора.
