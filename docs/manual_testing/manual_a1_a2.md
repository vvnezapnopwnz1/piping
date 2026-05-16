📋 Мануал — проверка A1 + A2 руками

▎ Время выполнения: ~5 минут. Цель — пройти business flow Анны с
▎ самого начала до момента «все блокирующие замечания закрыты, тестпак
▎ готов к заглушке».

Часть 0. Подготовка чистого старта

1. Открой терминал в корне проекта, выполни npm run dev. Должна
   стартовать страница на http://localhost:3000.
2. Открой её. Сразу открой DevTools (F12 в Chrome) → вкладка
   Application → Local Storage → http://localhost:3000.
3. Удали все ключи начинающиеся с pipeqc- (welds, batches,
   notifications, demo, testpack). Это нужно потому что у тебя могло
   остаться состояние с прошлых тестов.
4. Альтернатива пункту 3 — нажми Reset Demo в правом верхнем углу
   шапки (если кнопка есть).
5. Обнови страницу (Ctrl+R / Cmd+R).

---

Часть 1. Стартовая страница — Anna открывает приложение

6. Ты на главной (/). Это лента уведомлений (notifications feed —
   список оповещений системы) — то, что видит руководитель проекта утром.
7. Найди карточку "TP-205: 5 ISOs ready for line check". Иконка слева
   — синяя (info-severity, обычное информационное сообщение).
   - Если карточки нет — значит localStorage не очистился. Вернись к

шагу 3.

---

Часть 2. Pressure Test homepage — обзор по 5 активностям опрессовки

8. В левом сайдбаре найди раздел TESTING → Testpack → разверни → нажми
   Pressure Test.
   - URL: http://localhost:3000/testpack/pressure-test

9. Сверху увидишь несколько KPI-плиток (Test Packs Ready For Test, и
   т.д.). Это глобальные показатели по проекту.
10. Ниже — 5 карточек активностей (5 этапов гидроиспытания):
    - Line Check (линейная проверка трассы)
    - Item Clearance (устранение замечаний)
    - Blinding (заглушение)
    - Testing & Pre-comm (опрессовка и пусконаладка)
    - Reinstatement (восстановление после теста)

11. Проверь цифры на карточке Line Check:
    - Eligible (готово к назначению): 5
    - Assigned (назначено бригаде): 0
    - Done (выполнено): 1 (это историческая запись на ISO-1003)

12. Проверь цифры на карточке Item Clearance:
    - Open X (открытых блокеров): 2 (две исторических X-замечания на

ISO-1003) - Open Y: 0, Open Z: 0 - Карточка должна иметь янтарный (amber) акцент / бордюр — это
сигнал что есть незакрытые блокеры. 13. На остальных трёх карточках (Blinding / Testing / Reinstatement)
цифры пока статические — это нормально, фазы A3–A6 ещё не сделаны.

---

Часть 3. Line Check Preparation — назначаем бригаду на проверку трассы

14. На карточке Line Check жми кнопку «Open Preparation →».
15. Должен открыться URL
    /testpack/pressure-test/line-check/preparation.
16. Что должен увидеть:
    - Слева — сайдбар фильтров (Test Pack, System, Subsystem, PDS Area,

Area Classification). - Сверху сайдбара — KPI-полоска Eligible: 5 · Assigned: 0 · Done: 1. - В основной зоне — таблица из 5 строк (ISO-1004, ISO-1005,
ISO-1006, ISO-1007, ISO-1008 — все из TP-205). 17. Кликни чекбокс в шапке таблицы — все 5 строк выделятся. 18. Внизу экрана появится плавающая панель "5 ISOs selected · Assign
to: [select] · [Generate Checking Request]". 19. В выпадашке «Assign to» выбери LC-01 (Line Checker Team Alpha —
бригада №1 линейных контролёров). 20. Жми «Generate Checking Request». 21. Что должно произойти: - Кнопка покажет спиннер ~700 мс (это искусственная задержка чтобы
демо выглядело реалистично). - Появится зелёный тост (всплывающее уведомление): "Checking Request
CR-2026-014 created · 5 ISOs assigned to LC-01". CR = Checking
Request (запрос на проверку трассы). - В тосте — кнопка «View in Progress». 22. Жми «View in Progress».

---

Часть 4. Line Check Progress — бригада LC-01 возвращает результаты

23. Должен открыться URL
    /testpack/pressure-test/line-check/progress?request=CR-2026-014.
24. Что должен увидеть:
    - Чип фильтра request=CR-2026-014 сверху (можно убрать крестиком).
    - KPI-полоска Assigned: 5 · In Progress: 0 · Done: 0 (или 1 если

показывается история). - Таблица из 5 строк (те же ISO). - Ниже основной таблицы — секция «Completed» (закрытые исторические
записи, в т.ч. ISO-1003). 25. Кликни по строке ISO-1004 (это та ISO, про которую упоминалось в
сценарии Anna). 26. Справа откроется боковая панель с деталями ISO и формой: - Поле «Check date» (дата проверки) — поставь сегодняшнюю. - Список Punch items (замечаний) — пока пустой. 27. Жми «+ Add punch item» (добавить замечание). - Code (код замечания из справочника): выбери PC-01 (Missing gasket
— нет прокладки). - Description: подтянется автоматически, можно оставить. - Category (категория): X (X = блокер опрессовки, должно быть
устранено до теста). - Localization (где): ISO (на изометрии в целом, не на конкретной
катушке). - Originator (кто нашёл): должно автоматически проставиться LC-01. 28. Жми «+ Add punch item» ещё раз. - Code: PC-04 (Rust on support — ржавчина на опоре). - Category: Y (Y = устранять после теста, но до пусконаладки). - Localization: Spool → выбери одну из катушек ISO-1004. - Originator: LC-01. 29. Жми «Save». 30. ~700 мс задержка → тост "ISO-1004 line check recorded" → панель
закрывается → строка ISO-1004 пропадает из таблицы Assigned.

---

Часть 5. Уведомление сработало + KPI пересчитался

31. Вернись на главную (/).
32. Должно появиться новое уведомление наверху ленты:
    - Заголовок: "ISO-1004 line check done — 1 category-X item blocking

TP-205". - Иконка/цвет: янтарный (severity: warning) — потому что есть
X-блокер. 33. Сайдбар → Pressure Test. Проверь цифры: - Line Check: Eligible 0, Assigned 4, Done 2 (1 историческая + 1
сейчас). - Item Clearance: Open X должно вырасти с 2 до 3 (две исторических +
одна новая, которую мы только что создали).

---

Часть 6. Item Clearance Preparation — назначаем закрытие X-блокеров

34. На карточке Item Clearance жми «Open Preparation →».
35. URL: /testpack/pressure-test/item-clearance/preparation.
36. Что должен увидеть:
    - В сайдбаре — фильтр Category (категория замечания). По умолчанию

выбрано только X. - KPI-полоска Open X: 3 · Open Y: 1 · Open Z: 0 · Assigned today: 0. - Таблица из 3 строк — три открытых X-замечания (PI-NNN). 37. Кликни чекбокс в шапке → все 3 выделены. 38. Плавающая панель внизу: "3 punch items selected · Assign to: [FT
select] · [Generate Item Clearance Request]". 39. Выбери FT-01 (Finishing Team Alpha — бригада доделок №1). 40. Жми «Generate Item Clearance Request». 41. ~700 мс → зелёный тост "Item Clearance Request ICR-2026-001
created · 3 items assigned to FT-01" → кнопка «View in Progress». 42. Жми «View in Progress».

---

Часть 7. Item Clearance Progress — бригада доделок отчитывается

43. URL:
    /testpack/pressure-test/item-clearance/progress?request=ICR-2026-001.
44. Что должен увидеть:
    - Чип фильтра request=ICR-2026-001.
    - KPI-полоска с количеством закрытых сегодня.
    - Таблица из 3 строк — три замечания, ожидающих закрытия.

45. Кликни чекбокс в шапке → все 3 выделены.
46. Плавающая панель: "3 items selected · Cleared by: FT-01 · Date:
    today · [Mark Cleared]".
47. Жми «Mark Cleared».
48. ~700 мс → строки исчезают → тост "Marked 3 punch items as
    cleared".
49. Ниже основной таблицы появится секция «Recently cleared» с этими
    тремя пунктами (затемнённые).

---

Часть 8. Финальная проверка — кульминация мини-демо

50. Вернись на главную (/).
51. Должно появиться новое уведомление (зелёное, success):
    - "TP-205: all category-X items cleared — ready for blinding".
    - Это значит: на тестпаке TP-205 закрыто последнее блокирующее

X-замечание, можно ставить заглушки и готовиться к гидроиспытанию. 52. Сайдбар → Pressure Test: - Item Clearance: Open X 0, Open Y 1 (Y-замечание ISO-1004 пока ждёт
после теста), Open Z 0. - Карточка Item Clearance больше не амбер — потому что блокеров нет.

    ⚠️  Что делать если что-то пошло не так

Симптом: Главная пустая, нет уведомления про TP-205
Что проверить: Не очистил localStorage. Шаг 3.
────────────────────────────────────────
Симптом: После клика «Generate» ничего не происходит
Что проверить: DevTools → Console → ищи красные ошибки. Сделай
скриншот.
────────────────────────────────────────
Симптом: Кнопка «Generate» неактивна
Что проверить: Не выбрана команда в выпадашке.
────────────────────────────────────────
Симптом: Карточка ISO-1004 не открывает боковую панель
Что проверить: Проверь что URL содержит ?request=.... Если нет —
попробуй кликнуть на саму строку, не на чекбокс.
────────────────────────────────────────
Симптом: Цифры KPI не обновляются после действия
Что проверить: Нажми F5. Если не помогло — Reset Demo + повтори.
────────────────────────────────────────
Симптом: Y-замечание (PC-04) не появилось в Open Y
Что проверить: Возможно при добавлении забыл сменить категорию с X на
Y.
📋 Мануал — продолжение, проверка A4 + A5 в браузере

▎ Это продолжение мануала A1+A2. Выполни сначала шаги 1–53 из
▎ предыдущего мануала, после чего ты должен быть в состоянии «TP-205:
▎ все X-замечания закрыты, карточка Item Clearance больше не амбер».
▎ Дальше:

Часть 9. Карточка Blinding ожила

54. Сайдбар → Pressure Test.
55. Найди карточку Blinding (заглушение — установка временных заглушек
    на торцы тестпака перед опрессовкой).
56. На карточке должно быть Eligible: 2 (это и есть тот баг из
    предыдущего раздела — TP-205 + TP-201). В норме демо мы хотим
    показывать Eligible: 1. После следующей фазы будет правильно.
57. Жми «Open Preparation →».

Часть 10. Blinding Preparation — назначаем бригаду заглушки

58. URL: /testpack/pressure-test/blinding/preparation.
59. Увидишь таблицу строк-тестпаков (не ISO!) — TP-205, возможно
    TP-201.
60. Колонки: Testpack No · System · Subsystem · Location · Priority ·

# ISOs · # Welds.

61. Чекни только TP-205 (если есть TP-201 — оставь его пока).
62. Плавающая панель: "1 testpack selected · Assign to: [BT select] ·
    [Generate Blinding Request]".
63. В выпадашке выбери BT-01 (Blinding Team Alpha — бригада заглушки
    №1).
64. Жми «Generate Blinding Request» (фиолетовая кнопка — Blinding в
    дизайне получил violet-600 акцент).
65. ~700 мс → тост "Blinding Request BR-2026-001 created · 1 testpack
    assigned to BT-01" с кнопкой «View in Progress».
66. Жми «View in Progress».

Часть 11. Blinding Progress — бригада BT-01 отчитывается

67. URL:
    /testpack/pressure-test/blinding/progress?request=BR-2026-001.
68. Видишь строку TP-205 со статусом Assigned.
69. Кликни по строке TP-205.
70. Справа открывается боковая панель:
    - Readonly: Testpack No, System, Location, Priority, Assigned to

(BT-01), Assigned on - Date input: Blinding date (дата установки заглушек) — поставь
сегодняшнюю 71. Жми «Save blinding record». 72. ~700 мс → строка пропадает из основной таблицы → тост "TP-205:
blinding recorded" → внизу появилась секция «Recently blinded» с
TP-205 (затемнённая).

Часть 12. Уведомление + KPI Testing активировался

73. Иди на главную (/).
74. Должно появиться новое уведомление (success / зелёное):
    - "TP-205: blinded — ready for hydrotest".
    - hydrotest = гидроиспытание — закачивают воду под давлением выше

рабочего, держат 2–4 часа, смотрят не падает ли давление. 75. Pressure Test → проверь карточки: - Blinding: Eligible 1 (или 0 если уже всё назначил), Assigned 0,
Done 1 - Testing & Pre-comm: Ready for testing: 1 (TP-205 теперь готов к
опрессовке) 76. У карточки Testing & Pre-comm есть только одна кнопка «Open
Progress →» (Preparation скрыта по дизайну — Easy Piping не управляет
подготовкой к опрессовке).

Часть 13. Testing & Pre-comm — кульминация демо 🎯

77. Жми «Open Progress →» на карточке Testing & Pre-comm.
78. URL: /testpack/pressure-test/testing-precomm/progress.
79. KPI-полоска: Ready for testing: 1 · In test: 0 · Tested: 0 ·
    Pre-commissioned: 0.
80. Таблица с TP-205, колонки: Testpack · System · Location · Blinded
    on (заполнено) · Test start (—) · Test done (—) · Pre-comm (—).
81. Кликни по строке TP-205.
82. Справа панель с тремя датами:
    - Testing start date — поставь сегодняшнюю.
    - Testing done date — пока заблокировано (правильно — нельзя

закончить тест не начав). - Pre-commissioning date — пока заблокировано. 83. Жми «Save dates». ~700 мс → тост "TP-205: dates updated" → панель
закрывается.

Микро-шаг — закрываем тест

84. Снова кликни по строке TP-205. Поля раскрываются с уже
    сохранёнными значениями.
85. Testing done date — теперь активно. Поставь сегодняшнюю.
86. Pre-commissioning date — всё ещё заблокировано (откроется после
    сохранения done date).
87. Жми «Save dates».
88. ~700 мс. Иди на главную (/).
89. 🎯 Должно появиться уведомление-кульминация:
    - "TP-205: hydrotest passed (pressure held — ready for

pre-commissioning)". - Severity: success / зелёное. - Это и есть тот момент, ради которого вся 13-частная цепочка
существует — труба прошла испытание давлением. Озвучь это на питче.

Микро-шаг — пусконаладка

90. Pressure Test → Testing & Pre-comm Open Progress → TP-205. Все три
    даты раскрываются, последняя (Pre-commissioning date) теперь активна.
91. Поставь сегодня + Save.
92. Уведомление: "TP-205: pre-commissioning complete".
93. Pressure Test → Testing & Pre-comm: KPI Pre-commissioned: 1.

Часть 14. Проверка крошек и навигации

94. Открой /testpack/pressure-test/blinding/preparation.
95. Крошки сверху должны читаться: Testpack › Pressure Test › Blinding
    › Preparation (Title Case, не kebab-case).
96. Кликни по слову «Blinding» в крошках. Должно вернуть на
    /testpack/pressure-test (без 404).
97. Открой любой sub-screen — слева сверху виден линк ← Back to
    Pressure Test. Клик → возврат на homepage.
98. Повтори для Line Check, Item Clearance, Testing & Pre-comm,
    Reinstatement (последний — placeholder для A6, тоже редирект).

⚠ Что важно отметить во время демо

- TP-201 может появиться в Blinding как «случайный гость». Если это
  случилось — игнорируй, оно пофиксится в следующей фазе.
- После hydrotest passed остаётся одно Y-замечание из Анны-шага A1
  (PC-04 rust on support). Оно по бизнес-логике должно быть закрыто
  через Reinstatement (восстановление) — это и есть фаза A6.

🎬 Финальные шаги демо (продолжение мануала)

▎ Это последние шаги после Часть 13 «hydrotest passed» из прошлого
▎ мануала. Если ты только что довёл TP-205 до состояния
▎ «pre-commissioned», начинай со 100.

Часть 15. Reinstatement — закрываем последнее Y-замечание

Контекст для зрителя: после успешного hydrotest и пусконаладки нужно
снять временные заглушки и поставить постоянные прокладки. Y-замечание
PC-04 (rust on support), которое Anna записала ещё на line check,
теперь готово к закрытию.

100. Pressure Test homepage → карточка Reinstatement (восстановление:
     снятие заглушек, постоянные прокладки, момент затяжки фиксируется по
     jointer'у).
101. На карточке должно быть Ready: 1 (Y-замечание PC-04 на ISO-1004
     теперь elegible — testpack TP-205 уже testingDoneDate имеет).
102. Жми «Open Preparation →».
103. URL: /testpack/pressure-test/reinstatement/preparation.
104. В сайдбаре фильтр Category — Y и Z по умолчанию обе включены.
     Видишь 1 строку: PI-NNN, PC-04, кат. Y, ISO-1004, TP-205.
105. Чекни → плавающая панель «1 punch items selected · Assign to: [RT
     select] · [Generate Reinstatement Request]».
106. Выбери RT-01 (Reinstatement Team Alpha — бригада восстановления
     №1).
107. Жми Generate. ~700 мс → тост "Reinstatement Request RR-2026-001
     created · 1 items assigned to RT-01" с «View in Progress».
108. Жми View in Progress.

Часть 16. Reinstatement Progress — jointer подписывает

109. URL:
     /testpack/pressure-test/reinstatement/progress?request=RR-2026-001.
110. Видишь строку PI-NNN. Кликни.
111. Справа панель, форма:

- Joint date (дата фактической установки прокладки) — сегодня.
- Report No (номер монтажного отчёта) — например RPT-001.
- Jointer No (код монтажника) — выбери J-001 из выпадашки.
- Tag No (номер бирки на стыке) — например T-001.

112. Жми «Save reinstatement record».
113. ~700 мс → строка пропадает → тост → внизу появилась секция
     «Recently reinstated» с этой записью (затемнённой).

Часть 17. 🎯 Финальная кульминация (полный замкнутый цикл)

114. Иди на главную (/).
115. Должно появиться последнее уведомление (success / зелёное):

- "TP-205: reinstatement complete — ready for commissioning".
- Это и есть финальный gate в business flow Анны. Testpack TP-205
  прошёл путь от утреннего уведомления до подписания.

116. Pressure Test → Reinstatement card: Done: 1, Ready 0.

Что озвучить на питче: "Этот один testpack TP-205 — это маленькая
часть LNG-проекта. На реальной стройке 47 таких в месяц. Без системы
каждый из них живёт в Excel-файлах пяти разных subcontractors, и PM
узнаёт о блокерах в день испытания. С PipeQC — это auditable pipeline
с автоматическими handoff'ами."
