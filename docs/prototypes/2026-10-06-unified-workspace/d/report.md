# Отчёт D

## Что решено
Одна модель: горизонтальная процессная навигация. На overview она раскрыта картой состояния P-104 (с очередью внимания), в рабочих экранах сжата в stage rail (Engineering → Fabrication → Erection → Test Packs; NDE и Tracking — отдельные shared services, не ложные этапы). Выбранный объект (SP-1001-A / TP-014) сохраняется при переходах, NDE имеет явный Back к источнику. Подробности — в `decision.md`.

## Файлы
`index.html`, `styles.css`, `app.js`, `report.md`, `decision.md` (исправлен).

## Реализовано
- 7 экранов: overview, projects, fabrication, material, nde, rft, testpack; `data-view` на `#screen`; один реестр `NAV` для карты, rail, вкладок и active state.
- Данные: 16 spool (показано 6), 4 Laydown (25%), 1 RFT, 85 NDE / 63 recorded / 19 issued; любой записанный результат (Accepted или Rejected) → recorded 64 / issued 18; RFT 2 только при Accepted. Accepted после Rejected остаётся 64 / 18 (не 65 / 17), повторное сохранение идемпотентно. Счётчики вычисляются из состояния; 63/85 не подаётся как accepted rate.
- Gate-правки: счётчики по факту результата; убраны HOWTO-подзаголовки Fabrication/RFT/NDE (trace/NDE-правила, причины блокеров, Reader-пояснение и empty-state остались); aria-label «Heat/trace for IC-…» у трёх полей Material (видимая подпись «Heat/trace», поля при Help не перерисовываются).
- Material: 3 ident codes, 2 trace заполнены; пустой trace не сохраняется, введённое значение сохраняется.
- NDE: report/date/outcome обязательны, Rejected требует defect code (правило видно), Rejected записывает evidence и оставляет блокер, Accepted закрывает W-04 один раз.
- TP-014: Awaiting RFT → Ready for blinding → Ready for testing → Testing started (Simulate blinding / Simulate start testing).
- Reader (select роли): поля и команды disabled + защита в обработчиках + видимое пояснение.
- Hash-history (`#/проект/экран?spool=&tp=&from=`), popstate без push; смена проекта сбрасывает поиск, выбор, черновики, Help. P-207 — пустые состояния; поиск «No matches» отличается от пустого проекта.
- Help: один немодальный coach mark с caret, Esc / Close / «Don’t suggest again» (localStorage `pipeqc-ux-d.help.v1`), ручное повторное открытие; открытие не перерисовывает формы.
- Баннер prototype на каждом экране со ссылкой `../review/index.html`; нет fetch/eval/inline-обработчиков/внешних ресурсов.

## Ограничения
- Браузерная проверка и `node --check` в этой сессии не выполнялись (только Read/Edit/Write); основное браузерное тестирование ещё идёт. Три правки независимого gate внесены по коду и в браузере не перепроверены.
- Для спулов кроме SP-1001-A Material/NDE показывают «Outside the demo path».
- Engineering и Tracking отключены; полный Erection, реальные данные, права и пользовательская валидация отсутствуют.
- Размещение coach mark на 390px рассчитано по коду, визуально не проверено.

