
## SOURCE docs/superpowers/plans/2026-10-06-unified-workspace-ux-discovery.md
# PipeQC — единое рабочее пространство и контекстная помощь

> План проектирования и проверки UX, а не разрешение на реализацию. Сейчас меняется только этот документ. После согласования модели и прототипа составить отдельный пошаговый план реализации; не начинать с массовой замены текстов всплывающими подсказками. Git, база данных, пароли и hosted-стенд не входят в работу.

**Цель:** пользователь понимает, где находится, что можно сделать с выбранным объектом, почему действие недоступно и куда ведёт следующий переход — без предварительного чтения инструкции.

**Архитектурное направление:** одна модель доступных разделов и действий проекта, несколько согласованных представлений: обзор, боковая навигация, breadcrumbs и поиск страниц. Обучение — дополнительный контекстный слой, а не вторая система навигации. Состояния и допустимость бизнес-действий берутся из существующих доменных правил и серверных данных, а не из схемы меню или прохождения тура.

**Текущий стек:** React 19, Next.js 16, TypeScript, существующие компоненты Radix/shadcn, Supabase и RLS. На этапе проектирования новые зависимости не требуются.

## 1. Что проверено в текущем коде

- `config/navigation.ts` описывает дерево разделов, подпунктов и planned-страниц; `getVisibleNavigation` фильтрует его по доступу.
- `modules/home/ui/home-control-room-model.ts` отдельно описывает этапы, названия, назначения, переходы и вспомогательные модули. `home-process-map.tsx` отображает эту самостоятельную структуру. Например, главная использует Preparation/Spooling и NDE, меню — Spooling и NDE Module; NDE на схеме является общей функцией двух стадий, в меню — отдельным пунктом Construction.
- `components/pipeqc/navigation-model.ts` уже связывает поиск и breadcrumbs с меню, но отдельно добавляет страницы Pressure Test и related-work связи. Единого каталога для всех поверхностей пока нет.
- `app/fabrication/page.tsx` и `app/spooling/page.tsx` перенаправляют на dashboard/browse. Это не доказательство сломанных переходов: проблема — самостоятельные структуры, повторение выбора и разные способы объяснения одного пространства.
- `app-shell.tsx` сохраняет полный sidebar рядом с обзором, на котором одновременно есть строка всех модулей, большая карта процесса и повторяющиеся ссылки на подробные dashboards.
- В `request-preparation-screen.tsx` встречаются Server-scoped assignment, server-projected targets и пояснение про RPC. Это язык реализации, а не оператора.
- `erection-readiness-screen.tsx` объясняет RFT длинным общим абзацем; `material-check-screen.tsx` уже имеет полезный `gate.reason`, но рядом остаётся статичное объяснение вычисляемого статуса.
- `SpoolingImportScreen` уже разделяет выбор файлов и Validate; обязательность weld.txt и лимит 4 MB нельзя спрятать в подсказку. Индикатор 4 of 4 files не должен заставлять считать обязательными все четыре файла.
- Для Pressure Test существуют `PressureTestWorkflowFacts`, `derivePressureTestState` и `summarizeWorkflow`; для NDE — реальные состояния batch/obligation/cycle. Их нужно изучить перед проектированием «следующего действия», а не придумывать новый workflow на клиенте.

Предварительная эвристическая оценка понятности просмотренных рабочих экранов: **6/10**. Это экспертная гипотеза по коду, не результат пользовательского исследования. Не переносить её на всё приложение. Главные риски: дублирующиеся точки выбора, техническая терминология, действие без явной причины недоступности.

## 2. Проверенные источники и выводы

1. [NN/g, Why So Many Info Tips Are Bad, 23 января 2026](https://www.nngroup.com/articles/info-tips-bad/): дополнительные подсказки полезны, но не должны скрывать необходимые условия или компенсировать плохие названия. Для PipeQC: обязательные данные, ограничения и QC-блокеры остаются видимыми.
2. [NN/g, Onboarding Tutorials vs. Contextual Help](https://www.nngroup.com/articles/onboarding-tutorials/): помощь в момент задачи предпочтительнее навязанной экскурсии; её должно быть легко закрыть и снова найти. Для PipeQC: помощь привязывается к текущей операции и запускается по запросу.
3. [Adobe Spectrum, Coach mark guidelines](https://spectrum.adobe.com/fragments/components/coach-mark/usage-guidelines): короткий текст, связь с конкретным элементом, элемент остаётся видимым; при зависимом от действия шаге всегда есть выход. Для PipeQC: стрелка и спокойная подсветка объясняют один контрол, не перекрывая работу.
4. [IBM Carbon, Toggletip guidelines, обновление 30 сентября 2026](https://www.carbondesignsystem.com/building-blocks/core/components/toggletip/guidelines): раскрытие по клику с интерактивным содержимым отличается от короткого tooltip по hover/focus. Для PipeQC: закрываемая помощь с кнопками — popover, не tooltip.
5. [NN/g, Empty states in complex applications](https://www.nngroup.com/articles/empty-state-interface-design/): пустое состояние должно объяснять ситуацию и давать прямой вход в задачу. Для PipeQC: различать отсутствие записей, результат фильтра, загрузку, ошибку и ограничения доступа.
6. [W3C, Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): появляющийся контент должен быть доступен для чтения и закрытия. Проверять клавиатуру, Esc, focus, touch и отсутствие зависимости от hover.

Это применимые рекомендации разных лет, проверенные сейчас; не выдавать все источники за новые исследования 2026 года. Предложения ниже — наша проектная интерпретация, а не готовая схема из этих источников.

## 3. Варианты, которые нужно сравнить

| Вариант | Польза | Риск | Позиция |
| --- | --- | --- | --- |
| Обзор проекта как центр работы + постоянное компактное меню | Состояние и входы в задачи видны на главной; эксперт переходит напрямую | Дублирование вернётся, если обзор снова станет каталогом всех ссылок | Рекомендуемый кандидат для прототипа |
| Только меню и модульные dashboards, без общей главной | Меньше повторений | Теряется межмодульная картина и объяснение блокировок между стадиями | Проверить как альтернативный компактный вариант |
| Один пошаговый wizard вместо меню | Подходит для конкретной последовательной операции | Не подходит для параллельных ролей, разных спулов и повторных циклов NDE | Не использовать как оболочку приложения |

Не принимать «один экран вместо двух» за критерий успеха. Обзор и меню могут сосуществовать, если решают разные задачи и используют одну модель. Нельзя принудительно превратить процессный граф с общими функциями NDE/Tracking в линейное дерево.

## 4. План принятия решения

### Этап A — аудит реальных задач и переходов

- [ ] Зафиксировать текущую точку отсчёта в браузере: Projects, обзор проекта, Fabrication/Material Check, NDE, RFT, Test Pack Explorer и Pressure Test; desktop и 390px. Только чтение существующих записей.
- [ ] Для каждой поверхности заполнить таблицу: цель пользователя → объект → исходное состояние → разрешённые действия → результат → возврат → видимый проект → права → нужная помощь.
- [ ] Разделить роли: инженер подготовки, исполнитель фабрикации/монтажа, инспектор NDE, QC и руководитель. Проверять фактические capabilities; проектная роль и функциональная роль не взаимозаменяемы.
- [ ] Найти повторения одной ссылки, различающиеся названия одного понятия, необоснованные переходы на общие списки и потерю выбранного объекта.
- [ ] Каждый поясняющий блок отнести к одному классу: лишний текст; полезное описание; обязательное условие; актуальный блокер; дополнительная справка; временное обучение. Опасные условия не переносить в скрытый слой.

**Результат:** карта задач и список конкретных UX-проблем с тяжестью, подтверждением и вариантом исправления. Не считать отсутствие объяснения само по себе улучшением.

### Этап B — единая информационная модель

- [ ] Зафиксировать три уровня: все доступные проекты → рабочее пространство выбранного проекта → раздел/объект/операция.
- [ ] Для каждого раздела определить стабильный id, единое название, канонический адрес входа, дочерние операции и условия видимости. Алиасы маршрутов не создают новые сущности меню.
- [ ] Отдельно определить связи процесса: Fabrication ↔ NDE ↔ Erection, Tracking как общая функция, Test Packs и их реальные readiness-gates. Связь процесса не равна родителю в меню.
- [ ] Разделить ответственность: обзор отвечает «что происходит и какую работу открыть», меню — «как быстро попасть в раздел», экран объекта — «что можно сделать сейчас», помощь — «что означает непривычное правило».
- [ ] Описать контекст перехода: projectId обязателен; выбранный spool/ISO/batch/testPack передаётся только там, где маршрут и репозиторий действительно поддерживают его. Если передача не поддерживается, явно показать выбор, а не заявлять готовую фильтрованную очередь.

**Результат:** согласованная карта разделов, действий и контекста. Один реестр навигационных сущностей; состояния объектов остаются в домене/серверных данных, чтобы реестр не стал монолитом бизнес-логики.

### Этап C — новый обзор и синхронная навигация

- [ ] Нарисовать два low-fidelity варианта: компактный рабочий обзор и вариант без отдельной процессной карты. Сравнить на одинаковых задачах, а не по декоративности.
- [ ] В рекомендуемом варианте заменить длинные назначения модулей на реальные показатели, состояние и явный вход в работу. Не требовать одновременно читать строку модулей, карту и sidebar.
- [ ] Определить, остаётся ли схема постоянной компактной картой состояния или раскрываемым «Процесс проекта». Она не должна выглядеть как отдельный режим обучения.
- [ ] Один смысловой раздел в карте и меню имеет одно название и ведёт в одно рабочее пространство. Вход через карту раскрывает и выделяет соответствующую ветку меню; прямой URL даёт ту же ориентацию.
- [ ] На странице задачи показывать местную навигацию и относящиеся к задаче переходы, не вторую копию глобального меню. Не добавлять третью постоянную навигационную панель.
- [ ] Сохранить прямой доступ и Cmd/Ctrl K для экспертов. Ничего не блокировать из-за «непройденного обучения».

**Результат:** интерактивный прототип согласованной оболочки в стилистике corpservice: paper/ink/sage, спокойные связи, очевидные кнопки, без маркетинговых абзацев на рабочем экране.

### Этап D — помощь как дополнение к понятным действиям

- [ ] Сначала улучшить названия, приоритет кнопок, состояние выбора, feedback и видимые причины блокировки. Подсказка не заменяет эти исправления.
- [ ] Оставить tooltip для кратких неинтерактивных пояснений. Для «Как это работает» использовать popover по клику с заголовком, коротким текстом, стрелкой к источнику и закрытием.
- [ ] Предусмотреть «Показать подсказки для этого экрана». Не запускать обязательный tour при входе; новичку можно однократно предложить помощь без раскрытия её автоматически.
- [ ] В режиме помощи показывать один контекстный coach mark за раз. Без бесконечной пульсации, общего затемнения и таймеров, которые трактуют паузу пользователя как замешательство.
- [ ] Закрытие прекращает текущую подсказку, отключение останавливает предложения, повторный запуск доступен всегда. Сохранять предпочтение по пользователю и версии помощи, не сбрасывать при каждом переключении проекта.
- [ ] Для «что сделать дальше» использовать реальные состояние объекта и права. Если данных нет, показать загрузку/ошибку, а не выдуманный следующий этап. Если нужный контрол скрыт или отсутствует, подсказку не показывать.
- [ ] При смене проекта/объекта закрывать старую подсказку. Помощь никогда не нажимает бизнес-кнопки, не заполняет результаты QC и не отправляет команды вместо пользователя.
- [ ] На мобильном сохранять связь с контролом; если popover перекрывает операцию, раскрывать краткую помощь рядом с ней. Проверить клавиатуру, screen reader, touch, reduced motion и восстановление focus после закрытия.

**Результат:** единая политика помощи с примерами «видимо всегда / по запросу / coach mark / удалить», а не набор всплывашек для всех кнопок.

### Этап E — пилот на связанном рабочем сценарии

- [ ] В прототипе пройти: Projects → обзор выбранного проекта → Fabrication → выбранный spool → Material Check → относящееся к работе NDE → RFT → Test Pack. Брать только поддержанные связи и существующие записи; нельзя притворяться, что один batch покрывает весь путь.
- [ ] Отдельно проверить роль инспектора: открыть выданные обязательства и найти Record Result, не проходя подготовительные стадии за другую роль.
- [ ] Проверить роль читателя: те же понятия и ориентация, отсутствие команд изменения и честное объяснение ограничений.
- [ ] Сравнить с текущей версией: начало работы без подсказок; возвращение в обзор; смена проекта; понимание причины блокировки; запуск, закрытие и повторный вызов помощи.

**Результат:** один согласованный сквозной прототип. Не распространение недоказанного паттерна сразу на все модули.

### Этап F — проверка удобства и решение о реализации

- [ ] Дать 3–5 представителям разных ролей одинаковые задания, без предварительной экскурсии. Если доступны только оператор и разработчик, прямо назвать это предварительной проверкой, не пользовательской валидацией.
- [ ] Фиксировать: первый правильный переход, успешность задачи, возвраты из ошибочного раздела, необходимость вмешательства, сохранение project/object-контекста, понимание disabled-действий. Не сводить удобство к числу кликов.
- [ ] Цели пилота: задачи достижимы с полностью выключенной помощью; нет тупиков; причины блокировки понятны без открытия tip; проект и выбранный объект очевидны; карта и меню не расходятся.
- [ ] Проверить прохождение с клавиатуры, мобильную ширину и отсутствие повторного навязанного обучения.
- [ ] Согласовать выбранный вариант с пользователем и только затем составить технический TDD-план: реестр → shell → обзор → пилотные экраны → контекстная помощь → остальные модули.

**Результат:** решение с наблюдениями и списком оставшихся рисков. Этап реализации требует отдельного согласования, без Git-публикации или deployment по умолчанию.

## 5. Предварительные примеры изменений

| Сейчас | Проектный кандидат |
| --- | --- |
| Обзор объясняет назначение каждого модуля, sidebar повторяет входы | Обзор показывает состояние и работу; sidebar обеспечивает прямой доступ к тем же разделам |
| Общий абзац «Material Check is derived» | Видимое состояние проверки и недостающие trace-поля; подробное правило — по запросу |
| RFT описан длинным текстом под таблицей | У спула видны конкретные незавершённые условия и доступные переходы к исправлению |
| Canonical order в Pressure Test | Компактные этапы для выбранного Test Pack, текущая стадия, доступное действие и реальные блокеры |
| Server-scoped assignment / RPC eligibility | Назначение бригады, выбор объектов, человекочитаемая причина недоступности |
| Просто No rows после фильтра | Нет совпадений + очистить фильтр; не путать с пустым проектом или ошибкой загрузки |
| weld.txt и 4 MB в общей инструкции | Required/Optional возле каждого файла, лимит возле выбора; это не скрываемая справка |

## 6. Границы будущего технического плана

- Точки интеграции: `config/navigation.ts`, `components/pipeqc/navigation-model.ts`, `sidebar-nav.tsx`, `module-context-nav.tsx`, `page-finder.tsx`, `top-nav.tsx`, `app-shell.tsx`, `modules/home/ui/*`.
- Пилотные экраны: `modules/construction/ui/fabrication/material-check-screen.tsx`, `modules/quality/ui/nde-batch-screen.tsx`, `modules/construction/ui/erection/erection-readiness-screen.tsx`, `modules/pressure-test/ui/*`. Изменять только согласованные части, без массового переписывания репозиториев.
- Повторно использовать `components/ui/popover.tsx` и `tooltip.tsx`; не выбирать tour-библиотеку до подтверждения необходимости.
- Поведенческие проверки: одинаковый module id/адрес входа на всех поверхностях; корректный active/expanded state при прямой навигации; права дочернего пункта не разрешают запрещённого родителя; смена проекта не оставляет старую очередь/coach mark; нет фиктивного completed при закрытии помощи; пропуск отсутствующего target; ручной повторный запуск и изоляция настроек пользователей.
- Финальные проверки реализации: `npm run typecheck`, целевой ESLint, профильные unit-тесты, `npm run build`, затем реальные browser-сценарии. Не использовать `demo:prepare`/db reset ради UI-проверки: текущие данные сохраняются. Исторический сбой access-repository не выдавать за результат новой проверки.

## Самопроверка плана

- [x] Различены проверенные факты, рекомендации и ещё не принятые решения.
- [x] План объединяет навигацию, обзор и помощь; не подменяет проблему установкой tour-пакета.
- [x] Процессный граф не принудительно сделан линейным меню; действия разных ролей не смешаны.
- [x] Обязательные ограничения, QC-условия и ошибки не спрятаны в подсказки.
- [x] Есть конкретные артефакты каждого этапа, пользовательская проверка и gate перед реализацией.


## SOURCE config/navigation.ts
import {
  Shield,
  Database,
  FileCog,
  FolderCog,
  KeyRound,
  Box,
  Wrench,
  MapPin,
  Scan,
  FileText,
  Settings,
  LayoutDashboard,
  Activity,
  type LucideIcon,
  HardHat,
  CircleDot,
  Gauge,
  FolderTree,
  FlaskConical,
  ClipboardCheck,
  ShieldCheck,
  Paintbrush,
  Warehouse,
  Truck,
  Anchor,
  Combine,
  CheckCircle2,
  Bolt,
  Flame,
  Inbox,
  GitBranch,
  Send,
  ListPlus,
} from 'lucide-react'
import type { Capability } from '@/modules/access/domain/capability'

import { requiredCapabilityForPath } from './route-capabilities'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
  /**
   * The track that will build this module. Set means the route renders `NotOnSupabaseYet`, so
   * the sidebar leaves it out: an entry that leads only to "not built" is a dead end. The route
   * itself stays reachable by URL, and `app/page.tsx` lists what is planned.
   */
  planned?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigationConfig: NavSection[] = [
  {
    title: 'SETUP',
    items: [
      {
        title: 'Admin Module',
        href: '/admin',
        icon: Shield,
        children: [
          {
            title: 'Home',
            href: '/admin',
            icon: LayoutDashboard,
          },
          {
            title: 'Project Definition',
            href: '/admin/project-definition',
            icon: FileCog,
          },
          {
            title: 'System Referential',
            href: '/admin/system-referential',
            icon: Database,
          },
          {
            title: 'Project Referential',
            href: '/admin/project-referential',
            icon: FolderCog,
          },
          {
            title: 'Access Rights',
            href: '/admin/access-rights',
            icon: KeyRound,
          },
          {
            title: 'Imports',
            href: '/admin/imports',
            icon: Inbox,
          },
          {
            title: 'Progress Weights',
            href: '/admin/progress-weights',
            icon: FileCog,
          },
        ],
      },
    ],
  },
  {
    title: 'PREPARATION',
    items: [
      {
        title: 'Spooling',
        href: '/spooling',
        icon: Box,
        children: [
          {
            title: 'Home',
            href: '/spooling',
            icon: LayoutDashboard,
          },
          { title: 'SpoolGen Import', href: '/spooling/import', icon: Inbox },
          { title: 'Browse', href: '/spooling/browse', icon: GitBranch },
          { title: 'Revision History', href: '/spooling/revisions', icon: GitBranch },
          {
            title: 'Engineering Transmittals',
            href: '/spooling/engineering-transmittals',
            planned: 'Track 04',
            icon: Inbox,
          },
          {
            title: 'ISO Workflow',
            href: '/spooling/iso-workflow',
            planned: 'Track 04',
            icon: GitBranch,
          },
          {
            title: 'Spooling Transmittal',
            href: '/spooling/spooling-transmittal',
            planned: 'Track 04',
            icon: Send,
          },
        ],
      },
    ],
  },
  {
    title: 'CONSTRUCTION',
    items: [
      {
        title: 'Fabrication',
        href: '/fabrication',
        icon: Wrench,
        children: [
          {
            title: 'Dashboard',
            href: '/fabrication/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Spool Fabrication',
            href: '/fabrication/spool-fabrication',
            icon: Box,
            children: [
              {
                title: 'Material Check',
                href: '/fabrication/material-check',
                icon: ClipboardCheck,
              },
              {
                title: 'QC Release',
                href: '/fabrication/qc-release',
                icon: ShieldCheck,
              },
              {
                title: 'PWHT Release',
                href: '/fabrication/pwht-release',
                icon: Flame,
              },
              {
                title: 'Paint',
                href: '/fabrication/paint',
                icon: Paintbrush,
              },
              {
                title: 'Laydown',
                href: '/fabrication/laydown',
                icon: Warehouse,
              },
            ],
          },
          {
            title: 'Shop Weld Progress',
            href: '/fabrication/weld-progress',
            icon: Activity,
          },
        ],
      }, {
        title: 'Erection',
        href: '/erection',
        icon: HardHat, // или Construction из lucide
        children: [
          {
            title: 'Dashboard',
            href: '/erection/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Spool Erection',
            href: '/erection/spool-erection',
            icon: MapPin,
            children: [
              {
                title: 'To Site',
                href: '/erection/to-site',
                icon: Truck,
              },
              {
                title: 'Field Material Check',
                href: '/erection/material-check',
                icon: ClipboardCheck,
              },
              {
                title: 'Erected',
                href: '/erection/erected',
                icon: MapPin,
              },
              {
                title: 'Welded / Bolted',
                href: '/erection/welded-bolted',
                icon: Combine,
              },
              {
                title: 'Supported',
                href: '/erection/supported',
                icon: Anchor,
              },
              {
                title: 'Field QC Release',
                href: '/erection/field-qc-release',
                icon: ClipboardCheck,
              },
              {
                title: 'RFT',
                href: '/erection/rft',
                icon: CheckCircle2,
              },
            ],
          },
          {
            title: 'Site Weld Progress',
            href: '/erection/weld-progress',
            icon: Activity,
          },
          {
            title: 'Flange Progress',
            href: '/erection/flange-progress',
            icon: Bolt,
          },
        ],
      },
      {
        title: 'Tracking',
        href: '/tracking',
        icon: MapPin,
        children: [
          {
            title: 'Dashboard',
            href: '/tracking',
            icon: LayoutDashboard,
          },
          {
            title: 'Data Analysis',
            href: '/tracking/data-analysis',
            icon: Activity,
          },
          {
            title: 'Barcode Printing',
            href: '/tracking/print-barcodes',
            icon: Scan,
          },
          {
            title: 'Mobile Device Management',
            href: '/tracking/devices',
            icon: Gauge,
          },
        ],
      },
      {
        title: 'NDE Module',
        href: '/nde',
        icon: Scan,
        children: [
          {
            title: 'Batch Management',
            href: '/nde',
            icon: Scan,
          },
          {
            title: 'Dashboard',
            href: '/nde/dashboard',
            icon: Activity,
          },
        ],
      },
    ],
  },
  {
    title: 'TESTING',
    items: [
      {
        title: 'Testpack',
        href: '/testpack',
        icon: FlaskConical, // или TestTube2
        children: [
          {
            title: 'Overview',
            href: '/testpack',
            icon: FlaskConical,
          },
          {
            title: 'Builder',
            href: '/testpack/builder',
            icon: ListPlus,
          },
          {
            title: 'Explorer',
            href: '/testpack/explorer',
            icon: FolderTree,
          },
          {
            title: 'Pressure Test',
            href: '/testpack/pressure-test',
            icon: Gauge,
          },
        ],
      },
      {
        title: 'Flange Management',
        href: '/flange',
        icon: CircleDot,
      },
    ],
  },
  {
    title: 'REPORTS',
    items: [{ title: 'Reports', href: '/reports', icon: FileText }],
  },
  {
    title: 'CONFIGURATION',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
]

function getVisibleItem(
  item: NavItem,
  can: (capability: Capability) => boolean,
): NavItem | null {
  // A route whose module is not built has nothing to navigate to.
  if (item.planned) return null

  const children = item.children
    ?.map((child) => getVisibleItem(child, can))
    .filter((child): child is NavItem => child !== null)
  const capability = requiredCapabilityForPath(item.href)

  if (!capability || can(capability) || children?.length) {
    return {
      ...item,
      ...(children ? { children } : {}),
    }
  }

  return null
}

export function getVisibleNavigation(
  can: (capability: Capability) => boolean,
): NavSection[] {
  return navigationConfig
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => getVisibleItem(item, can))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0)
}


## SOURCE modules/home/ui/home-control-room-model.ts
import { requiredCapabilityForPath } from "@/config/route-capabilities";
import type { Capability } from "@/modules/access/domain/capability";
import type { EffectiveAccess } from "@/modules/access/domain/effective-access";

export interface HomeRoute {
  href: string;
  label: string;
}

export type HomeReadoutKey = "fabrication" | "erection" | "nde";

export interface ProcessCard {
  id: string;
  step?: string;
  kicker: string;
  title: string;
  purpose: string;
  handoff?: string;
  readout?: HomeReadoutKey;
  routes: readonly HomeRoute[];
}

export const MODULE_HOMES: readonly HomeRoute[] = [
  { href: "/admin", label: "Administration" },
  { href: "/spooling/browse", label: "Spooling" },
  { href: "/fabrication/dashboard", label: "Fabrication" },
  { href: "/nde", label: "NDE" },
  { href: "/erection/dashboard", label: "Erection" },
  { href: "/tracking", label: "Spool tracking" },
  { href: "/flange", label: "Flange management" },
  { href: "/testpack", label: "Test packs" },
  { href: "/reports", label: "Reports & forms" },
];

export const PROJECT_RULES: ProcessCard = {
  id: "rules",
  kicker: "Project rules · shared by every stage",
  title: "Administration",
  purpose:
    "Project definition, referentials, access rights, imports and progress weights. Every stage below works to the same rules.",
  routes: [
    { href: "/admin/project-definition", label: "Project definition" },
    { href: "/admin/project-referential", label: "Referentials" },
    { href: "/admin/access-rights", label: "Access rights" },
    { href: "/admin/imports", label: "Imports" },
    { href: "/admin/progress-weights", label: "Progress weights" },
  ],
};

export const PROCESS_STAGES: readonly ProcessCard[] = [
  {
    id: "preparation",
    step: "01",
    kicker: "Spooling",
    title: "Preparation",
    purpose:
      "Imports SpoolGen data and keeps isometrics, spools and revisions as the engineering baseline.",
    handoff: "spools to fabrication",
    routes: [
      { href: "/spooling/browse", label: "Browse spools" },
      { href: "/spooling/import", label: "Import" },
      { href: "/spooling/revisions", label: "Revisions" },
    ],
  },
  {
    id: "fabrication",
    step: "02",
    kicker: "Shop",
    title: "Fabrication",
    purpose:
      "Shop record for each spool: material check, shop welds, PWHT, painting, Laydown and QC release.",
    handoff: "spools to site",
    readout: "fabrication",
    routes: [
      { href: "/fabrication/material-check", label: "Material check" },
      { href: "/fabrication/weld-progress", label: "Shop welds" },
      { href: "/fabrication/qc-release", label: "QC release" },
    ],
  },
  {
    id: "erection",
    step: "03",
    kicker: "Site",
    title: "Erection",
    purpose:
      "Site record for each spool: to site, erected, field welds and material, supports. Ready for Test is derived from these steps.",
    handoff: "Ready for Test spools to test packs",
    readout: "erection",
    routes: [
      { href: "/erection/to-site", label: "To site" },
      { href: "/erection/weld-progress", label: "Field welds" },
      { href: "/erection/rft", label: "Ready for Test" },
    ],
  },
  {
    id: "testpacks",
    step: "04",
    kicker: "Testing",
    title: "Test packs",
    purpose:
      "Builds test packs and runs the pressure-test workflow: line check, item clearance, blinding, testing and reinstatement.",
    routes: [
      { href: "/testpack/explorer", label: "Explorer" },
      { href: "/testpack/builder", label: "Builder" },
      { href: "/testpack/pressure-test", label: "Pressure test" },
    ],
  },
];

export const NDE_SERVICE: ProcessCard = {
  id: "nde",
  kicker: "Serves fabrication and erection",
  title: "NDE",
  purpose:
    "Inspection obligations for shop and field welds, from batching and issue to the inspector through results, repairs and tracers.",
  readout: "nde",
  routes: [{ href: "/nde", label: "NDE workspace" }],
};

export const NDE_FLOW = [
  "Batch",
  "Issue to inspector",
  "Record result",
  "Repair / tracer if required",
] as const;

export const SUPPORTING_RECORDS: readonly ProcessCard[] = [
  {
    id: "tracking",
    kicker: "Connection · shop to site",
    title: "Spool tracking",
    purpose:
      "Movement history, current location and transit alerts as spools travel between shop, laydown and site.",
    routes: [
      { href: "/tracking", label: "Tracking" },
      { href: "/tracking/data-analysis", label: "Data analysis" },
      { href: "/tracking/print-barcodes", label: "Print barcodes" },
    ],
  },
  {
    id: "flange",
    kicker: "Connection · joints",
    title: "Flange management",
    purpose:
      "Flange joints, bolt-up progress and torque records from erection through test packs.",
    routes: [
      { href: "/flange", label: "Flange joints" },
      { href: "/erection/flange-progress", label: "Flange progress" },
    ],
  },
  {
    id: "reports",
    kicker: "Output",
    title: "Reports & forms",
    purpose: "Reports and forms generated from the records each stage keeps.",
    routes: [{ href: "/reports", label: "Open reports" }],
  },
];

export function canOpenRoute(
  href: string,
  can: ((capability: Capability) => boolean) | undefined,
): boolean {
  const capability = requiredCapabilityForPath(href);
  if (!capability) return true;
  return can ? can(capability) : false;
}

export interface ProjectIdentity {
  code: string | null;
  title: string | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

// The shell hands AccessProvider the selected project's access row, which also carries its code and title.
export function projectIdentity(
  access: EffectiveAccess | undefined,
): ProjectIdentity {
  if (!access) return { code: null, title: null };
  return {
    code: "activityCode" in access ? text(access.activityCode) : null,
    title: "title" in access ? text(access.title) : null,
  };
}

/** Percentage label for part of a positive total; null when there is nothing to divide by. */
export function shareLabel(part: number, total: number): string | null {
  if (total <= 0) return null;
  if (part >= total) return "100%";
  const percent = Math.round((part / total) * 100);
  if (part > 0 && percent === 0) return "<1%";
  if (percent === 100) return ">99%";
  return `${percent}%`;
}

export function shareWidth(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(part / total, 0), 1) * 100;
}


## SOURCE modules/construction/domain/rft.ts
export interface RftInputs {
  weldedBoltedOn: string | null
  supportedOn: string | null
  ndePending: number
  pwhtPending: number
  /** Phase-agnostic: one material check per spool revision, from either phase (T07-D2). */
  materialCheckedOn?: string | null
  lastFieldWeldOn?: string | null
  lastFieldSupportOn?: string | null
}

export interface RftResult {
  isRft: boolean
  rftOn: string | null
}

export function deriveRft(input: RftInputs): RftResult {
  const isRft =
    Boolean(input.weldedBoltedOn) &&
    Boolean(input.supportedOn) &&
    input.ndePending === 0 &&
    input.pwhtPending === 0

  if (!isRft) return { isRft: false, rftOn: null }

  const dates = [
    input.weldedBoltedOn,
    input.supportedOn,
    input.materialCheckedOn ?? null,
    input.lastFieldWeldOn ?? null,
    input.lastFieldSupportOn ?? null,
  ].filter((date): date is string => Boolean(date))

  return { isRft: true, rftOn: dates.sort().at(-1) ?? null }
}


## SOURCE modules/pressure-test/domain/pressure-test-workflow.ts
export type PressureTestState =
  | "awaiting_rft"
  | "blinding_assigned"
  | "blinded"
  | "testing"
  | "tested"
  | "awaiting_y_reinstatement"
  | "ready_for_precommissioning"
  | "precommissioned"
  | "awaiting_z_reinstatement"
  | "complete"

export interface PressureTestWorkflowFacts {
  isRft: boolean
  blindingAssigned: boolean
  blindingCompleted: boolean
  testingStarted: boolean
  testingCompleted: boolean
  yEligible: boolean
  yReinstated: boolean
  precommissioned: boolean
  zEligible: boolean
  zReinstated: boolean
}
export type PressureTestEvent = "testing_started" | "testing_completed" | "precommissioning_completed"

export function derivePressureTestState(facts: PressureTestWorkflowFacts): PressureTestState {
  if (!facts.isRft) return "awaiting_rft"
  if (!facts.blindingAssigned) return "blinding_assigned"
  if (!facts.blindingCompleted) return "blinding_assigned"
  if (!facts.testingStarted) return "blinded"
  if (!facts.testingCompleted) return "testing"
  if (facts.yEligible && !facts.yReinstated) return "awaiting_y_reinstatement"
  if (!facts.precommissioned) return "ready_for_precommissioning"
  if (facts.zEligible && !facts.zReinstated) return "awaiting_z_reinstatement"
  return "complete"
}

export function canRecordPressureTestEvent(state: PressureTestState, event: PressureTestEvent): boolean {
  if (event === "testing_started") return state === "blinded"
  if (event === "testing_completed") return state === "testing"
  return state === "ready_for_precommissioning"
}

export function isMonotonicDate(previous: string | null, next: string): boolean {
  return previous === null || next >= previous
}



