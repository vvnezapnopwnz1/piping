📋 Мануал — проверка I2 (To Site screen) руками

▎ Время выполнения: ~3 минуты. Цель — убедиться что spool,
▎ отпущенный из Laydown, появляется в To Site, можно подтвердить
▎ приёмку по W-24, и воронка Erection Dashboard обновляется.

Часть 0. Подготовка чистого старта

1. Открой терминал в корне проекта, выполни `npm run dev`. Должна
   стартовать страница на http://localhost:3000.
2. Нажми **Reset Demo** в правом верхнем углу шапки (или удали в
   DevTools → Application → Local Storage все ключи с префиксом `pipeqc-`).
3. Обнови страницу (Ctrl+R / Cmd+R).

---

Часть 1. Laydown — проверяем что spool отпущен на площадку

4. В левом сайдбаре: CONSTRUCTION → Fabrication → Laydown.
   URL: /fabrication/laydown
5. Переключи chip на **Released to Site**.
6. В таблице должно быть **4 spool-а**:
   - PL-CW200-005-A
   - PL-TK100-002-B
   - PL-TK100-003-A
   - PL-TK100-004-A
7. Найди строку **PL-TK100-002-B** и кликни по ней.
8. В detail sheet убедись:
   - Yard location: YARD-B-04
   - Placed: 2025-05-16
   - Released: 2025-05-17
   - Released by: QC-ENG-04
   - Статус в шапке: Laydown
9. Закрой sheet (кликни вне или нажми Esc).

---

Часть 2. To Site — приёмка spool-а на площадке (§12.4)

10. В левом сайдбаре: CONSTRUCTION → Erection → **To Site**.
    URL: /erection/to-site
11. Сверху — три chip-фильтра: **All / Awaiting Receipt / Received**.
    По умолчанию активен **All**.
12. Проверь счётчики:
    - All: 4
    - Awaiting Receipt: 1 (PL-TK100-002-B)
    - Received: 3 (PL-CW200-005-A, PL-TK100-003-A, PL-TK100-004-A)
13. Нажми chip **Awaiting Receipt**.
    - URL должен измениться на `/erection/to-site?status=Awaiting`.
    - В таблице останется одна строка: PL-TK100-002-B.
14. В строке PL-TK100-002-B проверь колонки:
    - Released from Laydown: 2025-05-17 · QC-ENG-04
    - Receipt status: 🟡 Awaiting Receipt
    - W-24 No: —
    - Area supervisor: —
15. Кликни по строке PL-TK100-002-B — откроется detail sheet справа.
    - URL: `/erection/to-site?status=Awaiting&spool=PL-TK100-002-B`
16. В sheet проверь **Laydown bridge**:
    - Yard location: YARD-B-04
    - Placed: 2025-05-16 by QC-ENG-01
    - Released: 2025-05-17 by QC-ENG-04
17. Форма ввода должна быть активна (не read-only).
    Заполни:
    - W-24 QC form number: `W24-2025-0150`
    - Area supervisor: **SUP-02**
    - Remark (опционально): `Delivered to Area A north rack`
18. Нажми **Mark Received**.
    - Кнопка покажет "Marking…" ~600–800 мс (искусственная задержка).
    - Появится зелёный тост: "PL-TK100-002-B received at site".
    - На домашней странице (/home) появится уведомление:
      severity: success, title: "PL-TK100-002-B: received at site",
      description содержит W-24 номер и SUP-02.
19. Sheet автоматически закроется.
    - Таблица обновится: PL-TK100-002-B пропадёт из Awaiting.
20. Переключи chip на **Received**.
    - Счётчик Received должен стать **4**.
    - В таблице появится PL-TK100-002-B со статусом 🟢 Received,
      W-24 No: W24-2025-0150, Area supervisor: SUP-02.

---

Часть 3. URL-sync и поиск

21. Скопируй URL `/erection/to-site?status=Received` и открой в новой
    вкладке (или просто обнови страницу).
    - Chip "Received" должен остаться активным.
    - Таблица должна показать 4 строки.
22. В поле поиска введи `PL-TK100`.
    - Должны остаться только spool-ы с совпадением: PL-TK100-002-B,
      PL-TK100-003-A, PL-TK100-004-A (3 строки).
23. Очисти поиск — вернутся все 4 строки.

---

Часть 4. Erection Dashboard — воронка обновилась

24. Перейди в левом сайдбаре: CONSTRUCTION → Erection → Dashboard.
    URL: /erection/dashboard
25. Прокрути вверх до секции **Spool erection pipeline** (6 tile-ов).
26. Найди tile **To Site** (второй слева, жёлтый/amber).
    - Убедись что он **кликабелен** (cursor: pointer).
    - Кликни по нему — должен произойти переход на `/erection/to-site`.
27. Вернись назад на Dashboard.
28. Остальные tile-ы (Erected, Welded/Bolted, Supported, RFT):
    - cursor: not-allowed
    - title: "Coming in I3/I4/I5/I6"
    - Клик по ним НЕ должен никуда вести.
29. Плитка **Not Started** (слева, серый) остаётся неактивной.

---

Часть 5. Reset восстанавливает seed

30. Нажми **Reset Demo** в шапке.
31. Перейди на `/erection/to-site`.
32. Проверь счётчики:
    - All: 4
    - Awaiting Receipt: 1 (PL-TK100-002-B)
    - Received: 3
33. Это подтверждает что `resetAll()` корректно восстанавливает
    `TO_SITE_SEED` и `LAYDOWN_SEED`.

---

✅ Чеклист пройден. Если хотя бы один пункт не совпал —
   проверь localStorage (должны быть pipeqc-to-site и pipeqc-laydown
   с seed-записями) и консоль браузера на ошибки.