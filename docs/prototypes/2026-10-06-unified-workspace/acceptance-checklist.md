# Независимая приёмка прототипов

Не является проверкой действующего PipeQC или интеграции с Supabase.

Для A/B/C проверить в браузере:

- Один видимый экран, понятный project identity и модель навигации.
- Fabrication: реальный поиск, отсутствие совпадений, очистка, переход на целевой объект.
- Material: 2/3 trace, пустой ввод не проходит, введённое значение отражается в состоянии.
- NDE: связанный SP-1001-A/W-04/RT-006; report/date/outcome видимы.
- Rejected без defect code не снимает blocker.
- Accepted локально меняет NDE, RFT, TP согласованно.
- TP: Awaiting RFT → Ready for blinding → следующий этап.
- Help рядом с действием, закрывается, Escape, ручное возвращение.
- Reader: записи disabled/readonly, навигация доступна.
- Projects: отдельный каталог, явный выбор и возврат; P207 пуст, P104 контекст не протекает; Back/Forward.
- 390px: нет переполнения документа, помощь в границах экрана, экран работы доступен.
- Синтаксис JS и отсутствие внешних API/ресурсов: verify.mjs.

Первый проход: структурный gate пройден, браузерная приёмка НЕ пройдена. Обнаружены CSS visibility bug C и некорректное закрытие NDE blocker при Rejected B. Агентам переданы ограниченные revision.md, результаты требуют повторной проверки.

## Повторная проверка

- A: пройдены поиск/no matches/clear, Material → NDE с выбранным SP-1001-A, Rejected без defect вызывает ошибку, Accepted → NDE clear → TP Ready for blinding → Start Testing. Reader показывает read-only и запрещает TP command. P207 empty Fabrication не показывает P104 rows; Browser Back восстанавливает P104 project catalog. Mobile Fabrication390: document width390. UI header contrast исправлен Gemini по browser screenshot.
- B: TypeError в renderNav устранена Claude, карта и rail теперь отрисованы, entryRoute Erection → RFT. NDE floating overlay устранено; общий RFT counter1initial/2afterAccepted. Rejected безdefect остаётся issued; Accepted → RFT → TP Ready forBlinding →ReadyforTesting. Reader projectOpen/Return/search не скрыты после отдельной регрессионной правки; P207 empty не показывает чужиеrows, BrowserBack returns P104. Mobile overview390: docwidth390. Внешние assets/API не используются. Это предметные smoke checks, не полный UX/accessibility аудит.
- C: hidden workbench наoverview устранена. Реальный поиск/clear; Material пустойtrace вызываетinlineerror; введённыйtrace сохраняется приHelp open/Escape; NDE Rejected требуетdefect, Accepted→ReadyforTest→TPreadyforblinding→Starttesting. Help TP теперьу реальнойкнопки (неheader). Reader не видиткомандыизменений. P207 scopedempty; BrowserBack projectcontext; mobileMaterial390 documentwidth390. Наmobileверхняяglobalnavгоризонтальная; её discoverability ещё UXtradeoff, не доказанноеудобство.
- D: structural gate пройден. В браузере проверены карта без дублирующего rail на обзоре; scoped stage navigation в работе; поиск/no matches/clear; Material required trace и сохранение ввода при Help/Escape; NDE required report/date/outcome/defect; Rejected сохраняет blocker и даёт recorded64/issued18/RFT1; Accepted после него сохраняет64/18 и даётRFT2. TP-014 проходит Ready for blinding → Ready for testing → Testing started, без ложного Tested. Reader запрещает TP action и Material inputs/save, навигация доступна. P207 overview/NDE пустые, без P104 data. Browser Back/Forward и reload сохраняют проектный маршрут; reload намеренно сбрасывает симулированные бизнес-данные. Help можно скрыть и вручную вернуть. Mobile overview/material390: document390; coach left8/right382 и видимая стрелка у поля IC-5527. Ограничения: это focused smoke checks, не полный аудит accessibility/всех экранов; данные иллюстративные; перенос и пользовательская приёмка ещё не выполнены.

Проверки никак не затрагивали приложение на3000 или реальный Supabase. Все записи выше — локальная симуляция в автономных HTML-прототипах.

