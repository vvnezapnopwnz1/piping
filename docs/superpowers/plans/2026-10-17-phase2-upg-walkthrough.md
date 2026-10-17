# Фаза 2: UPG-1 на KZ-стенде и сквозной проход через интерфейс — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на рабочем KZ-стенде появляется населённый демо-проект UPG-1 с тест-пакетами на разных шагах, а
сквозной проход B1–B4 по мануалу Easy Piping даёт журнал с вердиктами — вход в план исправлений.

**Architecture:** сначала полный скриптовый прогон UPG-1 повторяется на локальном стенде по правилам фазы 1.
Затем UPG-скрипты получают hosted-режим с фиксированным адресом KZ, и тот же прогон загружает UPG-1 на KZ.
Проход B1–B4 идёт на локальном стенде вместе с владельцем, по спецификации. Приложение не меняется:
меняются только демо-скрипты, их тесты и документы.

**Tech Stack:** TypeScript (`tsx`, `node --test`), Supabase JS, локальный Supabase CLI, self-hosted Supabase
на сервере `mextech` (hoster.kz), Playwright для браузера.

**Spec:** `docs/superpowers/specs/2026-10-09-e2e-walkthrough-design.md`. Контекст:
- роадмап `docs/audits/2026-10-14-project-review-and-roadmap.md`, §5, фаза 2;
- проверочный прогон этапа A `docs/acceptance/2026-10-09-upg-dry-run.md`;
- находки F08 и F11 — `docs/audits/2026-10-14-project-design-and-roadmap.md`.

## Global Constraints

- **Что можно менять.** Только демо-скрипты (`scripts/upg/`), их тесты, `package.json` (скрипты), документы
  в `docs/`. Схема, правила, миграции и интерфейс не меняются. Исключение — поломка, без которой дальше не
  пройти: её сразу обсуждают с владельцем и записывают решение в журнал.
- **Локальный стенд сбрасывается только после подтверждения владельца в этот момент**, каждый раз отдельно.
  `npm run demo:prepare -- --confirm-local-reset` выполняет `supabase db reset` именно на живом
  локальном стеке.
- **KZ-стенд никогда не сбрасывается и не пересоздаётся.** На KZ пишутся только данные проекта `UPG-1`.
  Инженерные таблицы `TRACK01-A` и `TRACK01-B` не трогаются. Перед первой записью снимается серверный
  бэкап. Облачный проект `lmjkqcdmxehknipeoeye` и Vercel заморожены: никаких `--linked`, `link`, `vercel`.
- **Секреты.** Значения не печатаются, не передаются в командной строке и не пишутся в файлы и коммиты.
  Локальные скрипты читают `.env.local` сами. Hosted-команды берут переменные из
  `set -a; . ~/.pipeqc-hosted.env; set +a`. Пароль фикстур не придумывать: если переменной нет, остановиться
  и спросить владельца.
- **Без новых веток и worktree.** Коммиты в текущую ветку. Пуш — только с разрешения владельца.
- **Вердикты** — ровно четыре: «совпадает», «нарушено», «лишнее у нас», «нет у нас». Каждая проверка
  ссылается на раздел мануала `docs/marker-output/manual.md` или досье
  `docs/research/2026-07-30-easy-piping-documentation-dossier.md` (§29, §30).
- **Во время прохода ничего не исправлять и не предлагать нового.** Отклонены владельцем, не поднимать:
  - результат испытания или сертификат;
  - состояние «сдан»;
  - неблокирующие замечания;
  - ворота «выпуск перед отправкой»;
  - подписанный выпуск ISO;
  - пометка ревизии.
- **Скриншоты** лежат локально в `docs/acceptance/e2e/w<N>-<модуль>-<n>.png`. `*.png` в `.gitignore`, в
  репозиторий они не попадают, журнал ссылается на путь.
- **В проходе не проверяются** роли и права субподрядчика, PDA и офлайн-синхронизация, качество перевода.
  Непереведённый текст отмечается в журнале одной строкой.
- **Бюджет фазы — 1–1,5 недели.** Если не помещается, режется объём, а не срок.
- **Конец каждой задачи** — результат открыт в браузере, а не только в тексте отчёта.

## Review Focus

1. Hosted-запуск с устаревшим `~/.pipeqc-hosted.env`, где лежит облачный адрес или localhost. Должен
   отказать до любого сетевого вызова. Тест — задача 2.
2. Запуск `demo:week:hosted` без `--confirm-hosted-upg`, когда в shell экспортированы KZ-переменные. Должен
   считаться локальным и отказать. Тест — задача 2.
3. Ошибка в ошибке: сообщение об отсутствующей или неверной переменной не содержит её значения. Тест —
   задача 2.
4. Повтор недели после сбоя посередине. Повтор продолжает с места сбоя без дублей и без `PQC60`: ключи
   идемпотентности и параметры команд при повторе те же. Проверка — шаг 6 задачи 1.
5. Пароль фикстур на KZ не совпадает с `TRACK01_FIXTURE_PASSWORD`. Вход оператора падает с именем аккаунта.
   Исполнитель останавливается и спрашивает владельца, пароли в `auth.users` не трогает. Проверка — шаг 1
   задачи 3.

---

## Перед началом (владелец)

- [ ] `~/.pipeqc-hosted.env` (права 600) содержит значения **KZ**, а не облака:
  - `SUPABASE_URL=https://supabase.piping-qc-work.shop`;
  - `SUPABASE_SECRET_KEY` — service role из `/opt/supabase/.env`;
  - `SUPABASE_PUBLISHABLE_KEY` — anon/publishable оттуда же;
  - `TRACK01_FIXTURE_PASSWORD` — пароль демо-пользователей KZ.

  Исполнитель проверяет только имена: `cut -d= -f1 ~/.pipeqc-hosted.env`.
- [ ] Владелец на связи для подтверждений: сбросы в задачах 1 и 5, приёмка модулей в задачах 5–8.

---

### Task 1: Повторный прогон UPG-1 на локальном стенде по правилам фазы 1

Последний прогон был 10.10, до фазы 1. С тех пор сервер отказывает:
- в Welded/Bolted без всех монтажных стыков (L1);
- в RFT ISO без RFT каждой катушки (L2);
- в начале испытания без заглушек (F7);
- в повторе команды с другими параметрами (`PQC60`).

Прежде чем писать на KZ, нужно доказать, что 8 недель проходят на текущих правилах.

**Files:**
- Modify (только если скрипт неверен по мануалу): `scripts/upg/weeks.ts`, `scripts/upg/execute.ts` и
  соседний `*.test.ts`
- Create: `docs/acceptance/2026-10-17-upg-rerun.md`

- [ ] **Step 1:** спросить владельца: «Сбросить локальный стенд? SHOWCASE-1 будет восстановлен в шаге 3». Без
  «да» не продолжать.
- [ ] **Step 2:** `npm run demo:prepare -- --confirm-local-reset` → `PASS`, 84 из 84.
- [ ] **Step 3:** `npm run verify` → зелёный (pgTAP требует пустую базу). Затем `npm run demo:showcase`.
- [ ] **Step 4:** `npm run demo:project-load -- --project UPG-1 --create-project` → итог как в §1 dry-run:
  - справочники загружены;
  - набор с ошибкой `blocked`, 3 блокера;
  - R0 `applied`;
  - `06-test-packs.xlsx` — 6 пакетов, 40 ISO.
- [ ] **Step 5:** для N = 1…8 выполнить `npm run demo:week -- --project UPG-1 --week N --include-manual`.
  Ожидание: код 0 на каждой неделе. Отказ разбирается по правилу спецификации §6:
  - если скрипт делает то, чего не сделал бы пользователь по мануалу, исправляется скрипт, с тестом в
    `scripts/upg/*.test.ts`;
  - если сервер отказывает в корректном по мануалу действии, это находка, скрипт её не обходит.
- [ ] **Step 6:** повторить неделю 8 той же командой → 0 отказов, без `PQC60`.
- [ ] **Step 7:** сверить конечное состояние со спецификацией §3 (неделя 8):

  | Пакет | Ожидание |
  |---|---|
  | TP-100-01, TP-100-02 | до Z |
  | TP-200-01 | испытан, ждёт Y. В прогоне 10.10 упирался в F3, F3 исправлен в фазе 1 |
  | TP-200-02 | готов к испытанию |
  | TP-300-01 | не RFT, монтаж |
  | TP-300-02 | в цеху |

  В пути (`spool_transit_alerts`, просрочено) ровно одна катушка — `UPG-300-3009-S1`.
- [ ] **Step 8:** записать `docs/acceptance/2026-10-17-upg-rerun.md`:
  - таблица недель: выполнено, пропущено, отказов, ситуации;
  - конечное состояние;
  - что изменилось против 10.10: F3, F5, F6, F7 должны исчезнуть;
  - новые находки.
- [ ] **Step 9:** `npm run typecheck && npm run lint && npm run test:unit`, затем коммит:
  `test(upg): UPG-1 passes all eight weeks on phase-one rules`.
- [ ] **Step 10:** открыть `http://localhost:3000`, проект UPG-1 → Test Packs, показать владельцу шесть
  пакетов на разных шагах.

### Task 2: Hosted-режим UPG-скриптов с фиксированным адресом KZ

**Files:**
- Modify: `scripts/upg/operator.ts`, `scripts/upg/setup-references.ts`, `scripts/upg/load-project.ts`,
  `scripts/upg/run-week.ts`, `package.json`
- Test: `scripts/upg/operator.test.ts`

**Interfaces:**
- Consumes:
  - `assertHostedSupabaseTarget(value: string): URL` и `PIPEQC_HOSTED_DEMO_ORIGIN` из
    `scripts/demo/hosted-target.ts`;
  - `hostedAdminKeyFromEnvironment(env)` из `scripts/prepare-hosted-demo.ts`;
  - `createHostedSupabaseDemoStandCore(url, key)` из `scripts/demo/supabase-demo-stand.ts`.
- Produces:
  - `export type UpgTarget = "local" | "hosted"`;
  - `export const UPG_HOSTED_CONFIRMATION = "--confirm-hosted-upg"`;
  - `export function upgTargetFromArgv(argv: readonly string[]): UpgTarget` — `"hosted"` только при точном
    флаге;
  - `export function readUpgEnv(env?: NodeJS.ProcessEnv, target?: UpgTarget): UpgEnv`, по умолчанию `"local"`.
    Для `"hosted"`:
    - адрес проходит `assertHostedSupabaseTarget`;
    - admin-ключ берётся из `hostedAdminKeyFromEnvironment`;
    - publishable-ключ — из `SUPABASE_PUBLISHABLE_KEY`;
    - пароль — из `TRACK01_FIXTURE_PASSWORD`.

- [ ] **Step 1: тесты в `scripts/upg/operator.test.ts`.** Значения фейковые:
  - `local target refuses the KZ origin`: `readUpgEnv({SUPABASE_URL: PIPEQC_HOSTED_DEMO_ORIGIN, …}, "local")`
    бросает `/non-local/`.
  - `hosted target accepts only the KZ origin`: проходит `PIPEQC_HOSTED_DEMO_ORIGIN`. Бросают
    `https://lmjkqcdmxehknipeoeye.supabase.co`, `http://127.0.0.1:54321` и
    `https://supabase.piping-qc-work.shop/`.
  - `hosted target prefers SUPABASE_SECRET_KEY over SUPABASE_SERVICE_ROLE_KEY`: `serviceRoleKey === "FAKE-SECRET"`.
  - `missing hosted variables are named, never echoed`: при пустом пароле и `SUPABASE_SECRET_KEY: "FAKE-SECRET-VALUE"`
    сообщение содержит `TRACK01_FIXTURE_PASSWORD` и не содержит `FAKE-SECRET-VALUE`.
  - `upgTargetFromArgv requires the exact flag`: `[]` даёт `"local"`, `["--confirm-hosted"]` даёт `"local"`,
    `["--week","1","--confirm-hosted-upg"]` даёт `"hosted"`.
- [ ] **Step 2:** `node --import tsx --test scripts/upg/operator.test.ts` → FAIL, функций ещё нет.
- [ ] **Step 3: реализовать `upgTargetFromArgv` и `readUpgEnv(env, target)` в `operator.ts`.** Локальная ветка
  без изменений, включая текст ошибки про `.env.local`. В hosted-ошибках указывать
  `~/.pipeqc-hosted.env`.
- [ ] **Step 4: провести цель через точки входа.**
  - `load-project.ts` и `run-week.ts` передают `upgTargetFromArgv(process.argv)` в `readUpgEnv`.
  - `setup-references.ts` по цели выбирает пару «guard + core»: `assertLocalSupabaseTarget` +
    `createSupabaseDemoStandCore` либо `assertHostedSupabaseTarget` + `createHostedSupabaseDemoStandCore`.
    Admin-ключ берётся из той же `readUpgEnv`.
  - В начале hosted-запуска печатается строка `Target: https://supabase.piping-qc-work.shop (hosted)`.
- [ ] **Step 5: скрипты `package.json`, без `--env-file`, как прочие `:hosted`.**
  - `"demo:project-setup:hosted": "tsx scripts/upg/setup-references.ts"`;
  - `"demo:project-load:hosted": "tsx scripts/upg/load-project.ts"`;
  - `"demo:week:hosted": "tsx scripts/upg/run-week.ts"`.
- [ ] **Step 6:** `node --import tsx --test scripts/upg/*.test.ts` → PASS. Затем
  `npm run typecheck && npm run lint && npm run test:unit` → зелёные.
- [ ] **Step 7:** `npm run demo:week -- --project UPG-1 --week 8` на локальном стенде даёт 0 отказов: локальный
  путь не сломан.
- [ ] **Step 8:** коммит `feat(upg): hosted mode pinned to the KZ stand, behind --confirm-hosted-upg`.

### Task 3: Загрузить UPG-1 на KZ-стенд

**Interfaces:** consumes `demo:project-load:hosted` и `demo:week:hosted` из задачи 2.

- [ ] **Step 1:** в новом shell выполнить `set -a; . ~/.pipeqc-hosted.env; set +a`, затем
  `npm run demo:check:hosted`. Записать результат как есть. Если вход оператора падает, остановиться и спросить
  владельца.
- [ ] **Step 2:** снять серверный снимок: `ssh mextech 'sudo systemctl start mextech-backup.service'`, затем
  `ssh mextech 'ls -1 /opt/mextech/backups | tail -1'`. Записать имя снимка.
- [ ] **Step 3:** `npm run demo:project-load:hosted -- --project UPG-1 --create-project --confirm-hosted-upg`.
  Итог должен совпасть с шагом 4 задачи 1.
- [ ] **Step 4:** для N = 1…8 выполнить
  `npm run demo:week:hosted -- --project UPG-1 --week N --include-manual --confirm-hosted-upg`. Цифры по
  неделям должны совпасть с задачей 1. Если на какой-то неделе сбой, повторить ту же команду. Стенд не
  сбрасывать.
- [ ] **Step 5:** в браузере открыть `https://app.piping-qc-work.shop` под `track01.platform-admin`, проект
  UPG-1 → Test Packs, затем рабочее место катушки и NDE. Шесть пакетов на шагах из таблицы шага 7 задачи 1.
  Сделать скриншоты.
- [ ] **Step 6:** дописать в `docs/acceptance/2026-10-17-upg-rerun.md` раздел «KZ»: снимок, итог загрузки,
  недели, расхождения с локальным прогоном. В роадмапе §5, «Статус», одна строка: «UPG-1 на KZ — закрывает
  L13».
- [ ] **Step 7:** коммит `docs(upg): UPG-1 loaded on the KZ stand`. Показать владельцу стенд в браузере.

### Task 4: Журнал прохода и проверки из мануала

**Files:** Create `docs/acceptance/2026-10-09-e2e-walkthrough.md` (имя из спецификации §5).

- [ ] **Step 1:** вверху журнала — блок «Где остановились»: неделя —, шаг нити —, открытые вопросы.
- [ ] **Step 2: таблицы проверок по модулям.** Восемь модулей в порядке спецификации §4. Строка:
  `# | § мануала | как должно быть | как есть в PipeQC | вердикт | скриншот`. Первые три колонки заполняются
  из мануала, остальные пустые. На модуль 6–15 проверок, только то, что мануал описывает явно.
- [ ] **Step 3: таблица «Входные находки».**
  - L1–L13, F3–F7, N1, F08, F11. Статус на 17.10: исправлено (коммит), отклонено владельцем 09.10 или
    открыто.
  - Для F08 и F11 выписать, что говорит мануал: §11.1–11.2 (выборочный NDE: выборка, выпуск остальных,
    расширение при браке) и §16.1 (готовность к Line Check). Ожидаемый вердикт — гипотеза, проверяется в
    проходе.
- [ ] **Step 4:** показать владельцу таблицы модулей 1–2 до начала B1. Поправки владельца внести.
- [ ] **Step 5:** коммит `docs(acceptance): walkthrough journal with manual checks`.

### Tasks 5–8: Сессии B1–B4 (локальный стенд, вместе с владельцем)

Одна задача — одна сессия. Новая сессия начинается с чтения спецификации и блока «Где остановились». Роль
«Claude» из спецификации выполняет исполнитель.

**Цикл модуля (во всех сессиях):**
1. Проверить переход в модуль на сквозной нити: объект открывается без повторного выбора.
2. Пройти проверки модуля из журнала через интерфейс `http://localhost:3000` (Playwright), со скриншотами.
3. Заполнить «как есть» и вердикт.
4. Показать владельцу скриншоты и таблицу, дождаться подтверждения или поправки.
5. Обновить «Где остановились».

**Task 5 (B1).** Настройка и спулинг через интерфейс, шаги спецификации §2.
- [ ] Спросить владельца о сбросе. Затем `npm run demo:prepare -- --confirm-local-reset`, `npm run verify`,
  `npm run demo:showcase`.
- [ ] Выполнить шаги §2.3.1–8 руками:
  - создать проект UPG-1 в интерфейсе;
  - `npm run demo:project-setup -- --project UPG-1`;
  - доступ;
  - импорт `01`–`05`;
  - правило PWHT формой;
  - `--phase backdate-wps`;
  - сначала набор с ошибкой, затем R0;
  - `06-test-packs.xlsx`.
- [ ] Цикл модулей 1 и 2. Коммит журнала.

**Task 6 (B2), недели 1–4.**
- [ ] Для каждой недели запустить `npm run demo:week -- --project UPG-1 --week N` без `--include-manual`.
  Ручные работы по ISO нити, которые печатает команда, выполнить через интерфейс в ту же неделю.
- [ ] На неделе 3 импортировать R1 `UPG-200-2005` руками в Revision workbench с решениями.
- [ ] Цикл модулей 3 и 4. Коммит журнала.

**Task 7 (B3), недели 5–6.**
- [ ] Недели 5–6 тем же порядком.
- [ ] Цикл модулей 5 и 6. Вручную по мануалу разобрать «место не совпадает со статусом» и монтажную проверку
  материалов (спецификация §3).
- [ ] Коммит журнала.

**Task 8 (B4), недели 7–8 и сводка.**
- [ ] Недели 7–8 тем же порядком.
- [ ] Цикл модулей 7 и 8: отчёты показывают данные UPG-1.
- [ ] **Сводка журнала:**
  - счёт вердиктов по модулям;
  - список «лишнее у нас» — кандидаты на удаление, без новых механизмов;
  - список «нарушено» и «нет у нас» со ссылками на мануал.
- [ ] Обновить в роадмапе §5 статус фазы 2.
- [ ] Коммит. Показать владельцу сводку и TP-100-01 до Z в браузере.

---

**Готово, когда:**
1. На KZ есть UPG-1 с шестью пакетами на разных шагах.
2. Журнал содержит вердикт по каждой проверке восьми модулей, каждый модуль подтверждён владельцем.
3. Сводка даёт список «лишнее у нас» и список нарушений — вход в план исправлений (этап C пишет Claude).
