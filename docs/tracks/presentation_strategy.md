# PipeQC — стратегия презентации для инвесторов

> Это — **обсуждение и каркас**, а не сама презентация. Цель: до того как сесть рисовать слайды, договориться о структуре, тоне, и о том как встроить live walkthrough.

---

## 1. Главный вопрос: для кого мы делаем эту презентацию?

Ты отметил четыре аудитории — **EPC strategics + industry experts + pilot customers + VC**. У них критически разные ожидания. Один и тот же deck им показывать **нельзя**. Я предлагаю один backbone, но три варианта top-loaded слайдов и три варианта demo emphasis.

### Что у этих четырёх общего

- Все понимают, что piping construction QC — это десятки тысяч welds, сотни ISO, и сотни Excel-таблиц + email + телефонных звонков. Они уже сами с этим жили или видели вблизи.
- Все хотят увидеть **где конкретно** ты заменяешь Excel-цикл живой системой, и сколько rework это сэкономит.
- Всем интересно качество исполнения UI — потому что вертикальный SaaS в industrial-сегменте часто страдает «1995-год дизайном», и просто современный shadcn/ui-look уже создаёт wow-эффект.

### Где они расходятся

| Аудитория             | Что им важно ВПЕРВУЮ                                                                                                                | Где они начнут скучать                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **EPC strategics** (TechnipFMC, Bechtel, Saipem, Worley, Petrofac) | Domain accuracy + manual alignment. Они узнают свой workflow или нет за 60 секунд. | Если ты будешь объяснять что такое NDE.                                                           |
| **Industry experts / advisors** (бывшие QC managers EPC проектов) | Где ты решил domain-сложности (rejection cascade, owner's rep, NDE matrix). | Если ты будешь говорить про TAM/CAGR. Они хотят слышать про joint categories X/Y/Z. |
| **Pilot customers** (компания, которая может купить пилот за $50K–$200K) | Что они получат в первые 30/60/90 дней. ROI на конкретном проекте. Кто внедряет.            | Vision на 5 лет вперёд.                                                                          |
| **VC (general tech)** | TAM, traction (даже LOI), unit economics, защитимость, команда. Стандартный SaaS-pitch.                                              | Глубокие domain-детали без «зачем это рынку».                                                    |

**Рекомендация:** сделай **один master deck** на 18–22 слайда, и три варианта первых 5 слайдов (intro/positioning). Demo middle остаётся общим. Финал (Ask + Roadmap) тоже три варианта.

---

## 2. Презентация — что должна включать (master deck)

Я ниже дам структуру на 20 слайдов и отдельно скажу для каждого слайда что туда положить и **где НЕ нужны user stories**. Ты прав, что User Story в виде «Как Анна я хочу...» в инвестор-deck'е смотрится слабо. Они хороши внутри команды и в demo skript, но не на слайдах перед чужими.

Вместо «As Anna, I want to...» используй два паттерна, которые работают сильно лучше:

- **Before / After workflow** — две колонки, слева Excel+email+звонки, справа PipeQC. Цифры (clicks, hours, people). Это узнается мгновенно.
- **«One rejected weld traversal»** — анимированная диаграмма как один rejection в NDE прокатывается через 4 системы за 5 минут вместо 3 дней. Это и есть «единица ценности» продукта.

### Структура master deck (20 слайдов)

| #   | Слайд                                  | Что на нём                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cover**                              | PipeQC. One-line tagline («QC management for industrial piping construction — built from the Easy Piping manual, modernised»). Логотипы 2–3 «inspired by» компаний если уместно, или skip.                                                                                  |
| 2   | **The problem in 30 seconds**          | Один скриншот реального Excel'а (можно найти открытый пример NDE batch tracker'а) рядом с цитатой PM-а EPC проекта про «3 дня от rejection до rework». **БЕЗ User Story** — просто факт + изображение.                                                                       |
| 3   | **Cost of the problem**                | Сухие цифры: rework в EPC piping = 5–15% project value, 22% reduction at firms using integrated platforms (источник Bessemer/Autodesk). LNG проект на $5B → $250M–$750M rework cost → 22% saving = $55M–$165M. Этот слайд для VC и pilot customers. Для experts — skip.    |
| 4   | **Why now**                            | Три bullet: (1) Easy Piping и аналоги — 20+ лет, legacy desktop. (2) shadcn/ui + zustand + Vercel — стало можно за 8 недель собирать domain-rich UI. (3) AI-native enrichment (см. Bessemer 2026): дальше можно ассистировать в NDE matrix lookup, welder mismatch и т.п.   |
| 5   | **What we built** (one image)          | Скриншот hero page (`/`) или Pressure Test Homepage. Подпись: «5 модулей, 7 ролей, 20+ screens, end-to-end в browser'е». Никаких bullets.                                                                                                                                    |
| 6   | **The narrative — 11 steps**           | Диаграмма (не текст!) одна на весь слайд: 11 шагов из `track-upstream.md §3`, кружочки с иконками. Это слайд-«мост» в demo.                                                                                                                                                  |
| 7   | **LIVE DEMO** (или video-fallback)     | Только cover-слайд «Demo». В этот момент ты переходишь в браузер. Длительность 8–10 минут. Цели demo: см. раздел 3 ниже.                                                                                                                                                       |
| 8   | **Before / After table**               | Левая колонка: Excel + email + 4 системы + телефон. Правая колонка: PipeQC. Метрики: time-to-rework-notification, audit trail completeness, single-source-of-truth для testpack release.                                                                                    |
| 9   | **Manual coverage map**                | Скриншот / diagram из `docs/MANUAL_COVERAGE_MATRIX.md` или его очищенный вариант. 20 модулей Easy Piping → сколько закрыто. Сильно работает на EPC strategics: «он реально прочитал manual».                                                                                |
| 10  | **Architecture (technical confidence)** | Один диаграммный слайд: Next.js 16 / TypeScript strict / Zustand + persist / Tailwind + shadcn. Подпись: «No backend yet — but every store is API-ready». Это для VC + technical advisors.                                                                                  |
| 11  | **Market**                             | Vertical SaaS for construction management: $16.3B (2025) → $29.5B (2030), CAGR 12.6% (источник Marqstats). Кусок «industrial piping QC» внутри — оценим bottom-up: ~5K крупных проектов EPC активны в любой момент × $50–200K per project = $250M–$1B SAM. Для VC — основной слайд. Для EPC strategics и experts — пропустить. |
| 12  | **Competitive landscape**              | 2×2: «manual-faithful vs modern UX». TechnipFMC Easy Piping в нижнем-правом (manual-faithful, legacy UX). Procore в верхнем-левом (modern UX, generic construction). PipeQC в верхнем-правом. Bentley/Aveva/Hexagon — серая зона.                                            |
| 13  | **GTM plan**                           | Три stage: (1) Pilot — 1 EPC project, 60 дней, $50K–$200K. (2) Multi-project rollout внутри одного EPC. (3) Cross-EPC. Озвучить первый pilot candidate если есть.                                                                                                            |
| 14  | **Pricing hypothesis**                 | Two-axis: per project × per active user. Бенчмарк: Procore ~$5–7K/project/year base. PipeQC: $50K–$200K per LNG-scale project — это десятки welders × 18 месяцев × value-based. Не финальное, hypothesis.                                                                  |
| 15  | **Traction (или Conviction)**          | Если есть LOI или интерес от 1–2 EPC — здесь. Если нет — переименовать в «Conviction» и положить: 3 интервью с QC managers, цитаты, signals из manual coverage progress. Честность важнее, чем accurate fake metrics.                                                       |
| 16  | **Roadmap (12 months)**                | Now / Next / Later. Now — то что показано в demo. Next — Track H (testpack builder), Track C deep reports, multi-project. Later — real backend + auth, mobile (барcode + PDA), AI assist (welder qualification mismatch, NDE matrix lookup).                                |
| 17  | **Team**                               | Кто ты + кого ищешь / кто advisors. Если соло — честно «solo founder + 2 industry advisors». Не выдумывай co-founders.                                                                                                                                                       |
| 18  | **The ask**                            | Один из трёх вариантов: (a) Pilot @ $XX K, (b) Pre-seed $X M to reach $X ARR by Q1 2027, (c) Strategic partnership / acquihire conversation. Для каждой аудитории слайд другой.                                                                                              |
| 19  | **What I want from you, specifically** | На этом слайде — одно предложение. Для VC: «50-min follow-up after you've used the live demo for 10 minutes». Для pilot customer: «60-day paid pilot on one of your active LNG projects». Для experts: «один час критики — что я упустил в Easy Piping coverage». Это слайд который радикально повышает conversion на «следующий звонок». |
| 20  | **Thank you + contact**                | Email, GitHub (если open), календарь.                                                                                                                                                                                                                                       |

### Что менять под каждую аудиторию

- **VC**: слайды 3, 11, 14, 15 — обязательны. Слайд 9 (manual coverage) можно сжать.
- **EPC strategics**: слайды 2, 8, 9, 12 — обязательны. 11, 14 — сжать или убрать.
- **Industry experts / advisors**: слайды 2, 6, 8, 9, 12 — обязательны. 11, 14, 15 — убрать. Добавить deep-dive слайд после live demo с конкретными domain-вопросами «Где мы упростили реальность» (Client Examination не покрыт, NDE auto-allocation simplified, и т.д. — это **сильнее**, чем умалчивание).
- **Pilot customers**: слайды 2, 7 (demo), 8, 13, 18 (ask). Остальное — на втором звонке. Им нужно увидеть **их собственный workflow** на экране, не теорию.

---

## 3. Live walkthrough — стратегия

Ты пишешь «слайды и live walkthrough». Я тоже считаю это правильно, но давай разберём **почему именно гибрид**, и какие есть ловушки.

### Почему гибрид (slides + live demo) — правильный выбор

1. **Pre-recorded demo даёт consistency**, но в industrial-аудитории воспринимается как маркетинговое видео. Доверие к продукту падает («наверняка это монтаж»).
2. **Live demo даёт credibility**, но в pure-live режиме у тебя нет страховки если упадёт интернет / браузер / Vercel. И зрители не успевают усвоить контекст в начале.
3. **Slides + live в нужных местах** — стандарт enterprise B2B. Слайды дают рамку и cool-down моменты; live показывает что продукт работает; pre-recorded screencast в backup-slide — страховка.

### Структура live walkthrough внутри презентации

Длительность: **8–10 минут**. Сценарий — те 11 шагов из `track-upstream.md §3`. Они уже расписаны. Я бы делал так:

1. Слайды 1–6 (вводная) — 6–8 минут
2. **Слайд 7 «LIVE DEMO» → переключение в браузер** — 8–10 минут
3. **Возврат в deck**, слайд 8 (Before/After) — фиксация того что только что показал
4. Слайды 9–20 — 10–15 минут

Итого 30–35 минут pitch + Q&A.

### Что показывать в live (а что НЕ показывать)

**Показывать (hero flow):**

1. Home → notification «NDE batch rejected» (Михаил)
2. NDE batch detail → mark for rework
3. Свитч роли → Sergey → home notification «WLD-099 marked for rework (POR)»
4. /fabrication/weld-progress → edit WLD-099 (WLD-099 case с welder qualification — это уникальный «aha moment»)
5. Свитч роли → Михаил → создать новый batch с re-welded weld
6. Receive results per-weld
7. Свитч роли → Hassan → /erection/dashboard → spool ready for delivery card
8. Field weld → send to NDE
9. Roll up → ISO welded → testpack RFLC notification (E2.5 bridge)
10. Свитч роли → Анна → /testpack/pressure-test → Line Check Prep на готовом testpack'е
11. Закрытие: показать /documentation Tab 2 — «вот это всё реализовано»

**НЕ показывать (Easy way to lose the room):**

- /spooling (это shell, не до конца наполнен)
- /admin tabs кроме Teams/Subcontractors (B3 ещё не закрыт)
- /settings (placeholder)
- /testpack page.tsx (shell)
- Тёмные углы где state может не персистнуться

### Anti-Murphy чеклист

- **DP1 двойной deploy**: prod + stage URL открыты в двух вкладках до начала
- **F5 страховка**: после `resetAll()` reset работает за <1 сек, у тебя есть top-nav button. Если что-то посыпалось — F5, reset, продолжаешь с шага N.
- **Screencast backup**: записанный 5-минутный screencast лежит как slide 7-альтернатива. Если live не запускается — переключаешься и продолжаешь презентовать поверх видео.
- **Не открывай dev tools на демо** — иногда browser-extensions ломают persist middleware
- **Один монитор**: speaker notes — на телефоне или на печатной cue card. Скрин — только продукт.

---

## 4. Что я НЕ рекомендую делать (и почему)

### ❌ User stories на слайдах
Ты правильно интуитивно почувствовал. «As Анна I want to record line check date» — это внутренний artifact команды. На слайде он выглядит инфантильно. Замени на before/after таблицу + один «traversal» пример.

### ❌ Скриншоты прилива зелёных галочек
Прилично выглядит, но не информативно. Аудитория не понимает что галочка значит. Лучше — **одна таблица с тремя строками** где видна разница «было / стало».

### ❌ Анимированные диаграммы потока (диаграмма с движущейся точкой)
Дорого по времени делать, легко выглядит cheezy. Если очень хочется — статичная диаграмма со стрелками + время рядом с каждой стрелкой («T+0 / T+5 min / T+45 min»).

### ❌ «Мы используем AI» как отдельный слайд
В 2026 у инвесторов аллергия. Используй AI там где оно реально работает (welder qualification mismatch, NDE matrix lookup recommendations — это в Roadmap слайде 16, не на отдельном слайде).

### ❌ Глубокая архитектурная диаграмма для VC
Один слайд достаточен. Для technical advisors — уже на втором звонке.

---

## 5. Что показать ДО deck'а, чтобы получить feedback

Прежде чем рендерить .pptx, я бы прошёл следующие итерации:

1. **Этот документ + track_list.md** — ты сейчас читаешь. Получить feedback от тебя: согласен ли с аудиториями, structure, demo flow, anti-Murphy.
2. **20 заголовков слайдов** в виде markdown списка — 1–2 дня. Без визуала, просто что на каждом слайде. Дать одному industry expert и одному tech-friendly не-domain человеку. Получить обратку «что непонятно, что лишнее».
3. **Draft slides v1** — после итерации заголовков. Сразу в Figma или в .pptx, как удобнее.
4. **Rehearsal с live demo** — 3 прогона минимум. Видеозапись каждого. Смотреть запись, переписывать.

---

## 6. Источники, на которые я опирался

- [What Investors Want in a Pitch Deck in 2026 — DECKO](https://www.getdecko.com/blog/what-investors-want-in-a-pitch-deck-in-2026-and-whats-changed) — изменения 2026: SOM > TAM, LTV:CAC 3:1 как baseline, ask привязан к milestones
- [Best Pitch Deck Structure in 2026 — OGSCapital](https://ogscapital.com/article/best-pitch-deck-structure/) — общий backbone deck'а
- [Bessemer — Ten lessons from a decade of vertical software investing](https://www.bvp.com/atlas/ten-lessons-from-a-decade-of-vertical-software-investing) — почему vertical SaaS работает; ROI focus
- [Construction Tech ROI — Autodesk](https://www.autodesk.com/blogs/construction/construction-tech-roi/) — конкретные цифры по rework reduction (22%)
- [Vertical SaaS Construction Management Market — Marqstats](https://marqstats.com/reports/vertical-saas-construction-management-market/) — TAM/CAGR цифры
- [Live vs Recorded Demos — Arcade Blog](https://www.arcade.software/post/live-vs-recorded-demos) — гибридный подход стандарт enterprise B2B
- [SaaS Demo Best Practices — Arcade](https://www.arcade.software/post/saas-demo-best-practices) — «Demo not Tour», 2–4 a-ha moments, до 30 минут
- [Procore IPO Presentation Deck — Slidebook](https://www.slidebook.io/company/procore/) — структура референсного construction-tech deck'а

---

## 7. Что я предлагаю как следующий шаг

Если ты согласен с этой структурой:

1. Прочитай эти два файла (track_list.md + presentation_strategy.md), пометь где «согласен / переписать / убрать».
2. Дальше я делаю **draft 20 заголовков слайдов** в markdown — 1 итерация feedback'а.
3. После заголовков — выбираем формат: .pptx, Figma, Pitch.com, или Keynote. Я могу собрать .pptx через skill, если хочешь.
4. Параллельно — закрываем спринт по track_list.md (P0 + P1).
5. Финальная rehearsal + screencast — на последней неделе перед демо.

Если в этой структуре что-то не так — давай сначала допилим её. Сам deck без согласованного backbone делать преждевременно.
