# D · Claude: принять UX-решение и собрать итоговый кандидат

Пользователь после запроса нескольких подробных интерактивных вариантов попросил: «Что предлагаешь? Поставь задачу claude решить финальный более подходящий вариант или взять лучшее из нескольких». Ты — Claude через agy. Нужно критически оценить и РЕАЛЬНО СОБРАТЬ итоговый кандидат, а не просто ответить рекомендациями. Это отдельный прототип D для просмотра, НЕ интеграция с действующим приложением.

## Разрешённая область

- Читать целиком ../brief.md, ../reference.md, этот task.md. Затем текущие index.html/styles.css/app.js/report.md вариантов ../a и ../b. Вариант ../c сейчас проходит точечную доработку; читать его можно, но не считать его report доказательством успешных проверок. Прочитай ../c/final-fixes.md как список уже замеченных проблем.
- Писать ТОЛЬКО в этой папке d. Создать index.html, styles.css, app.js, report.md, decision.md. Никаких изменений A/B/C, приложения, реального Supabase, .env, auth, Git, конфигурации, зависимостей, сети, серверов, browser automation. Основной агент проверит в браузере.
- Можно node --check app.js для синтаксиса. Не подключать внешние библиотеки/шрифты. Только автономные HTML/CSS/JS, inline SVG. Не eval/inlineonclick/fetch/API. Все данные синтетические.

## Критическое решение

## Приоритетное уточнение пользователя

«Да и чтобы не собрал что-то крайне сумбурное или не пересобрал то что уже есть». Это СТРОГИЙ критерий, важнее механического заимствования из A/B/C. Не делать Frankenstein из трёх макетов; не выдавать перекраску текущего overview+sidebar за новое решение. Выбрать ОДНУ ясную mental model и описать её одним предложением. Элементы других вариантов допустимы только когда подчиняются этой модели. Можно отвергнуть предложенный синтез.

Перед реализацией зафиксируй в decision.md: (1) выбранную единственную модель, (2) максимум три устойчивые зоны экрана с задачей каждой, (3) что именно решает дублирование process overview/навигации, (4) список явно УДАЛЁННЫХ конкурирующих входов/каталогов/инструкций, (5) сравнение с текущим приложением — поведенческие изменения, не палитра. Не запрашивай новое согласование: пользователь уже разрешил прототип.

Anti-chaos acceptance: пользователь без Help знает текущий проект/объект/операцию; ровно один главный CTA в рабочей операции; не одновременно full stage rail + полная карта + sidebar + все-modulechips; выбор проекта отличается от возврата к обзору; local object list не становится вторым глобальным меню; shared NDE имеет один осмысленный глобальный вход и связанные переходы по блокеру; рядом со стрелками реально работающие переходы; объяснения только там, где нужны constraints, пустое состояние или запрос помощи. Без лишней графики и информационных панелей ради количества. Нельзя воспроизвести текущую независимую process overview + sidebar архитектуру.

Предложение основного агента НЕ догма: взять процессную навигацию B, сохранение object context C и attention queue A. Оцени, не получится ли из этого перегруженный гибрид. В decision.md коротко по-русски:

1. Главные пользовательские задачи и противоречия текущей модели.
2. Почему выбрал одну концепцию или синтез; что взял/что явно отбросил из A/B/C.
3. 5–7 конкретных UX-решений, tradeoffs, как переносить после согласования.
4. Что прототип показывает, а что пока нельзя считать пользовательски валидированным или интегрированным.

## Рекомендуемая архитектура кандидата

- ОДНА глобальная навигация: компактная связанная rail Engineering → Fabrication → Erection → Test Packs, плюс общие сервисы NDE/Tracking сбоку rail (NDE не ложный линейный этап).
- Overview раскрывает ЭТУ ЖЕ модель как процессную карту состояния с рабочими счётчиками и компактной attention queue. Никакого полного sidebar параллельно карте, плюс chips плюс ещё каталог модулей. Rail на overview может быть минимальной/свёрнутой, чтобы не дублировать карту одновременно.
- В рабочем экране rail сжимается; под ней контекст выбранного spool и локальные операции. Список спулов / центральная операция / readiness-evidence справа нужны только для рабочих views, не пустая workbench на overview/projects.
- Сохранение SP-1001-A при переходах Material → NDE → RFT, linked W-04/RT-006, прямой переход к TP-014. NDE как общий сервис сохраняет originating stage/object и явный back.
- Projects отдельная карточная страница с descriptions/Open project/Return to current project. Project title/code всегда видимы. Ничего от P104 в P207 empty view.
- Обзор НЕ инструкция о программе, а рабочее состояние. Следующий шаг следует из блокера/стадии, не из текста how to.

## Уровень качества

Пользователь просит красивые, подробные варианты как корпсервис. Это цельный polished industrial B2B workbench, а не wireframe с двумя большими карточками. Warm paper, charcoal identity, sage status, terracotta blocker, тонкие technical/editor connections, маленькая сетка только в meaningful diagram zone, плотная таблица, precise typography и spacing. Рабочие панели не растягивать пустыми до всей ширины. Используй разумный max-width и компактную evidence pane. SVG иконки, не emoji. Georgia заголовки сдержанно, системный sans UI, monospace object IDs. Интерактивные состояния приятные, readable visiblefocus.

Все 7 views из brief обязательны: overview/projects/fabrication/material/nde/rft/testpack. Desktop1440/mobile390. Не запускать браузер самому.

## Обязательные gates после уроков A/B/C

- Один NAV registry строит карту/rail/local nav/active state/labels/routes. Engineering/Tracking вне prototype disabled с visible Outside this prototype; Erection/RFT доступен. Все реальные CTA работают.
- Общий agreed data: P10416spools (5–6 illustrative rows, не total6!),4Laydown25%,1RFTinitial,85NDE63resultrecorded19issued. Accepted →64recorded18issued2RFT; Rejected НЕ снимает blocker. Не называй63/85 accepted rate.
- Material 3identcodes2tracefilled. Пустой trace не сохраняется; actual entered value persists. Entered form values НЕ исчезают при открытии Help. Никакого autofill heattrace.
- NDE: report,date,outcome required and associated labels, Rejected shows requireddefect upfront; missingdefect inlineerror and blocked remains; validRejected records rejected evidence and pendingblocker; Accepted exactlyonce updateslocalstate. Никаких delayed rerender/setTimeout造成 doubleincrements. Save commands labelled Simulate…, persistent status Prototype only — no project data was saved.
- TP014 ISO1001 membership withtargetspoolvisible, currentstate AwaitingRFT→Readyforblinding→Readyfortesting, Simulateblinding then Simulatestarttesting (НЕ фальшивый полный Tested без результата). Blocker directs RFT/NDE.
- Reader via native role select запрещает поля/записи + visible access explanation, navigation readable. Defensive eventguard, notjust opacity.
- Browser history includes project/view/spool/tp; Back/Forward andreload preserve context. No pushwhenhandlingpopstate. Switchingprojects closeshelp,resetsquery/selection/unsavedforms. Emptyproject≠nomatches; clearsearch works; queries escapedbeforeHTML.
- Help perview targetedonecoachmark, nonmodal, caret actually tovisibletarget, Close/Escape/Don'tsuggestagain unique storagepref and manualreopen. Never describe illustrative data aslive. Scope target toactiveview; mobile clamp x/y and noheaderoverlap/targetoffscreen. Help doesn't performbusinesscommands. Required rules stayvisible.
- Initial banner on EVERY view: UX prototype · Illustrative data · Not connected to Supabase. Comparison ../review/index.html.
- Use data-view onactivecontainer and data-action onmaincontrols; source assets relative. Hidden views truly hidden at allbreakpoints.
- Formslabels, semanticbuttons, keyboardselection, stickycontext, no docoverflow390(tableinternalokay), targettouchminimum40px.

Создай 5 файлов, проверь синтаксис и своё соответствие brief. В report.md перечисли implemented paths/limitations, НЕ утверждай browser tested. Итоговый ответ короткий. Это одобренная реализация прототипа — не останавливайся на плане.

