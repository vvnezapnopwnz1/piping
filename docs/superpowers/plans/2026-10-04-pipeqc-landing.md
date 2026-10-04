# PipeQC — инвесторский лендинг: план реализации

> **Заменено 2026-10-04.** Лендинг встроен в портал «Веха Технологии» как страница продукта `/products/pipeqc/`. Действующие документы — в репозитории `corpservice`: `docs/superpowers/specs/2026-10-04-pipeqc-product.md` и `docs/superpowers/plans/2026-10-04-pipeqc-product.md`. Здесь остаются содержательные решения, тексты и таблица проверенных фактов, на которые ссылается новая спецификация; место, стек, палитра и деплой из этого файла больше не действуют.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать одностраничный русскоязычный лендинг PipeQC для инвестора (отдельный репозиторий `pipeqc-site`), задеплоить превью на Vercel.

**Architecture:** Статический сайт на Astro 5 + Tailwind 3. Все тексты лежат в одном YAML, проверяются zod-схемой при сборке и в юнит-тестах. Изометрия линии — один Astro-компонент `Drawing`, который рисует SVG по именованному состоянию (первый экран + шесть шагов «живого чертежа»). Схемы процессов — Astro-компоненты со встроенным SVG на десктопе и HTML-вариантом на телефоне. Клиентский JS только для анимаций появления, переключения состояния чертежа и лайтбокса; без JS страница читается целиком.

**Tech Stack:** Node ≥ 22, Astro ^5.18.2, @astrojs/tailwind ^5.1.5, tailwindcss ^3.4.19, zod ^3.25.76, yaml ^2.9.1, @fontsource-variable/onest, @fontsource/ibm-plex-mono, vitest ^3.2.4, @playwright/test ^1.63.0, sharp ^0.33.5, Vercel CLI.

**Spec:** `docs/superpowers/specs/2026-10-04-pipeqc-landing-design.md` (в репозитории PipeQC `/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout`). Утверждённые макеты: `docs/superpowers/specs/2026-10-04-pipeqc-landing/` там же — `mockup-hero-variants.html` (вариант AC-2, вторая карточка), `mockup-diagrams.html`, `mockup-page-map.html`. Открывать в браузере как визуальный эталон.

## Global Constraints

- Репозиторий сайта: `/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipeqc-site` (новый, свой git). Код приложения PipeQC не меняется.
- Язык страницы — русский, `<html lang="ru">`.
- Запрещено где угодно в `src/` и `public/`: `Technip`, `Easy Piping`, `EasyPlant`, `Qatar`, `Train 7` (любой регистр). Проверяет `npm run copy:check`.
- Заглушка `[ЗАПОЛНИТЬ…]` допустима при разработке и запрещена при публикации: `npm run release:check` падает, пока она есть.
- Никаких выдуманных метрик: ни денег, ни процентов экономии, ни «в N раз». Все данные в примерах вымышленные.
- Цвета — только токены: `--paper #F6F4EE`, `--surface #FFFFFF`, `--ink #14213D`, `--muted #4A5568`, `--line #E3DFD4`, `--done #0F766E`, `--work #E07A1F`, `--alert #C2410C`, `--grid rgba(20,33,61,.07)` (шаг сетки 22px). Смысл: бирюзовый — готово/принято, янтарный — в работе/держит, кирпичный — брак/потеря.
- Шрифты: Onest (`'Onest Variable'`) для текста, IBM Plex Mono для кодов и надзаголовков; только через `@fontsource`, без CDN.
- Ширина от 360px, боковые поля 16px, горизонтальной прокрутки нет ни на какой ширине.
- Без JS страница читается целиком; `prefers-reduced-motion: reduce` отключает все переходы.
- Страница помечена `noindex` (её отправляют лично; снять — одна строка в `index.astro`).
- Учётные данные стенда PipeQC: значения из `.env.local` не читать, не печатать, не передавать в командной строке; стенд — только npm-скриптами PipeQC. `npm run demo:prepare -- --confirm-local-reset` сбрасывает локальную базу — запускать только после явного «да» владельца.

## Review Focus

1. **Скрипт не отработал (ошибка JS, блокировщик) — контент не должен пропасть.** Ожидание: всё видно без класса `html.js`. Тест — Task 15 («без JS видны все заголовки разделов и карточки»).
2. **Телефон 360px с длинными русскими словами и широкими схемами — горизонтальная прокрутка.** Ожидание: её нет, широкие схемы заменены HTML-вариантом. Тест — Task 15 (360/768/1280) и проверки в Task 7, 9, 10.
3. **Переход по ссылке цепочки стадий сразу на `#story-s5` — чертёж показывает не тот шаг.** Ожидание: `data-active="s5"` сразу после загрузки. Тест — Task 8.
4. **Превью ссылки в Telegram с `og:image` на `127.0.0.1`, если на Vercel не задан `SITE_URL`.** Ожидание: сборка для публикации отказывается выдать локальный адрес. Тест — Task 16, шаг проверки `dist/index.html`.
5. **Текст в YAML стал длиннее, и подпись вылезла за плашку в SVG.** Ожидание: схема контента ограничивает длину коротких подписей схем, сборка падает. Тест — Task 3 (`rejects too-long diagram labels`).

---

## Карта файлов

```
pipeqc-site/
├─ package.json, astro.config.mjs, tailwind.config.mjs, tsconfig.json
├─ vitest.config.ts, playwright.config.ts, .gitignore, README.md
├─ public/favicon.svg, public/og.png (Task 14), public/screens/*.webp (Task 13)
├─ scripts/
│  ├─ copy-rules.mjs (+ .test.mjs)      правила текста, чистая функция
│  ├─ check-copy.mjs                    CLI: обходит src/ и public/
│  ├─ prepare-screens.mjs (+ .test.mjs) PNG стенда → WebP 1600px
│  └─ gen-og.mjs                        снимок /og-card/ → public/og.png
├─ src/
│  ├─ content/schema.ts                 zod-схема всего контента
│  ├─ content/landing.ru.yaml           ВСЕ тексты страницы
│  ├─ lib/rich.ts (+ .test.ts)          разметка терминов {слово|id}
│  ├─ lib/content.ts (+ .test.ts)       загрузка и проверка YAML
│  ├─ lib/drawing/geometry.ts (+ .test.ts)  координаты линии
│  ├─ lib/drawing/states.ts (+ .test.ts)    7 состояний чертежа
│  ├─ styles/global.css                 токены, сетка, типографика, reveal
│  ├─ layouts/Base.astro                head, превью ссылки
│  ├─ scripts/scroll-story.ts, reveal.ts, lightbox.ts
│  ├─ components/drawing/Drawing.astro
│  ├─ components/ui/  SiteHeader, SiteFooter, Rich, Glossary, PassportCard, WelderGuardCard, StageIcon
│  ├─ components/diagrams/  StageLine, LanesDiagram, ModuleMap, CascadeDiagram, GatesDiagram
│  ├─ components/sections/  Hero, Construction, Journey, Story, Why, Modules, How, Helps, Proof, Status, Contacts
│  └─ pages/index.astro, pages/og-card.astro
└─ tests/  *.spec.ts (Playwright)
```

---

### Task 1: Каркас репозитория

**Files:**
- Create: все файлы конфигурации из карты, `src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/index.astro`, `public/favicon.svg`, `tests/smoke.spec.ts`

**Interfaces:**
- Produces: `Base.astro` с пропсами `{ title: string; description: string; ogImage?: string; noindex?: boolean }`; глобальные классы `.wrap`, `.section`, `.over`, `.h2`, `.lead`, `.grid-paper`, `.dark`, `.sheet`, `.btn`, `.btn--ink`, `.btn--done`, `.btn--ghost`; CSS-токены из Global Constraints; псевдоним импорта `@/` → `src/`.

- [ ] **Step 1: Создать репозиторий и установить зависимости**

```bash
mkdir -p /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipeqc-site && cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipeqc-site
git init -b main
npm init -y >/dev/null
npm install astro@^5.18.2 @astrojs/tailwind@^5.1.5 tailwindcss@^3.4.19 @astrojs/check@^0.9.4 typescript@^5.7.3 zod@^3.25.76 yaml@^2.9.1 @fontsource-variable/onest @fontsource/ibm-plex-mono
npm install -D vitest@^3.2.4 @playwright/test@^1.63.0 sharp@^0.33.5
npx playwright install chromium
```

- [ ] **Step 2: Заменить `package.json` на этот (зависимости оставить те, что записал npm)**

Скопировать блоки `dependencies`/`devDependencies` из файла, созданного npm, и задать остальное:

```json
{
  "name": "pipeqc-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview --host 127.0.0.1 --port 4321",
    "check": "astro check",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "copy:check": "node scripts/check-copy.mjs",
    "release:check": "node scripts/check-copy.mjs --publish",
    "og": "node scripts/gen-og.mjs",
    "screens": "node scripts/prepare-screens.mjs",
    "verify": "npm run copy:check && npm run check && npm run test:unit && npm run test:e2e"
  }
}
```

- [ ] **Step 3: Конфигурация**

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // SITE_URL даёт абсолютные адреса превью ссылки (og:image). На Vercel задаётся переменной окружения.
  site: process.env.SITE_URL || 'http://127.0.0.1:4321',
  output: 'static',
  integrations: [tailwind({ applyBaseStyles: false })],
});
```

`tailwind.config.mjs`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,ts,md}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', surface: 'var(--surface)', ink: 'var(--ink)', muted: 'var(--muted)',
        line: 'var(--line)', done: 'var(--done)', work: 'var(--work)', alert: 'var(--alert)',
      },
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
    },
  },
  plugins: [],
};
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'], environment: 'node', passWithNoTests: true },
});
```

`playwright.config.ts` (сервер каждый раз пересобирается, чтобы тесты не шли по старой сборке):
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4321' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
});
```

`.gitignore`:
```
node_modules/
dist/
.astro/
test-results/
playwright-report/
.vercel/
.env*
```

`README.md`:
```md
# pipeqc-site

Одностраничный лендинг PipeQC для инвестора. Тексты — `src/content/landing.ru.yaml`.

- `npm run dev` — разработка
- `npm run verify` — проверка текстов, типов, юнит- и браузерные тесты
- `npm run release:check` — проверка перед отправкой ссылки (падает на `[ЗАПОЛНИТЬ…]`)
- `npm run og` — пересоздать картинку превью (нужен запущенный `npm run preview`)
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#14213D" stroke-width="3"/><circle cx="16" cy="16" r="5.5" fill="#0F766E"/></svg>
```

- [ ] **Step 4: Глобальные стили**

`src/styles/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #F6F4EE; --surface: #FFFFFF; --ink: #14213D; --muted: #4A5568; --line: #E3DFD4;
  --done: #0F766E; --work: #E07A1F; --alert: #C2410C; --grid: rgba(20, 33, 61, .07);
  --font-sans: 'Onest Variable', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
html { background: var(--paper); color: var(--ink); font-family: var(--font-sans); scroll-behavior: smooth; scroll-padding-top: 84px; -webkit-text-size-adjust: 100%; }
body { background: var(--paper); margin: 0; }
/* overflow-x на body не прячем: тесты ширины должны ловить настоящие вылеты, а не маскировать их */
.wrap { width: min(1240px, 100% - 32px); margin-inline: auto; }
.section { padding-block: clamp(64px, 9vw, 120px); }
.over { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--done); margin: 0 0 12px; }
.h2 { font-weight: 800; letter-spacing: -.03em; line-height: 1.08; font-size: clamp(28px, 4vw, 44px); margin: 0 0 14px; text-wrap: balance; }
.lead { color: var(--muted); font-size: clamp(16px, 1.6vw, 18px); line-height: 1.55; max-width: 760px; margin: 0 0 32px; }
.grid-paper { background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size: 22px 22px; }
.dark { background: var(--ink); color: #E8EEF6; }
.dark .lead { color: #AEB9CC; }
.dark .over { color: #5EEAD4; }
.sheet { background: var(--paper); color: var(--ink); border-radius: 20px; padding: clamp(16px, 2.4vw, 32px); }
.btn { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; padding: 13px 20px; border-radius: 12px; text-decoration: none; border: 1px solid transparent; }
.btn--done { background: var(--done); color: #fff; }
.btn--ink { background: var(--ink); color: var(--paper); font-size: 14px; padding: 9px 16px; border-radius: 10px; }
.btn--ghost { background: #fff; border-color: #E2DFD5; color: var(--ink); }
.btn:focus-visible, a:focus-visible, button:focus-visible { outline: 3px solid var(--done); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 5: Базовый шаблон и временная главная**

`src/layouts/Base.astro`:
```astro
---
import '@fontsource-variable/onest';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@/styles/global.css';

interface Props { title: string; description: string; ogImage?: string; noindex?: boolean }
const { title, description, ogImage = '/og.png', noindex = false } = Astro.props;
const site = Astro.site ?? new URL('http://127.0.0.1:4321');
const canonical = new URL(Astro.url.pathname, site).href;
const ogUrl = new URL(ogImage, site).href;
---
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script is:inline>document.documentElement.classList.add('js')</script>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    {noindex && <meta name="robots" content="noindex, nofollow" />}
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

`src/pages/index.astro` (временная, заменяется в Task 5):
```astro
---
import Base from '@/layouts/Base.astro';
---
<Base title="PipeQC" description="Контроль качества монтажа трубопроводов" noindex>
  <main id="top" class="wrap"><h1>PipeQC</h1></main>
</Base>
```

- [ ] **Step 6: Смоук-тест**

`tests/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('главная отдаётся и размечена как русская', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page).toHaveTitle(/PipeQC/);
});
```

- [ ] **Step 7: Прогнать**

Run: `npm run check && npm run test:unit && npm run test:e2e`
Expected: `astro check` — 0 errors; vitest — «No test files found», выход 0; Playwright — 1 passed.

- [ ] **Step 8: Коммит и рабочая ветка**

```bash
git add -A
git commit -m "chore: scaffold Astro site with tokens, fonts and test harness"
git checkout -b landing-v1
```

---

### Task 2: Проверка правил текста

**Files:**
- Create: `scripts/copy-rules.mjs`, `scripts/copy-rules.test.mjs`, `scripts/check-copy.mjs`

**Interfaces:**
- Produces: `findViolations(text: string, opts?: { publish?: boolean }): { rule: string; message: string; line: number; excerpt: string }[]`; npm-скрипты `copy:check` и `release:check` начинают работать.

- [ ] **Step 1: Написать падающий тест**

`scripts/copy-rules.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { findViolations } from './copy-rules.mjs';

describe('findViolations', () => {
  it('ловит запрещённые имена в любом регистре и с номером строки', () => {
    const v = findViolations('по образцу Easy Piping\nTECHNIP\nEasyPlant\nQatar LNG Train 7');
    expect(v.map((x) => x.rule)).toEqual(['easy-piping', 'technip', 'easyplant', 'real-project']);
    expect(v[1].line).toBe(2);
  });

  it('пропускает чистый текст', () => {
    expect(findViolations('Стык J-1029 принят, пакет TP-12 ждёт испытания')).toEqual([]);
  });

  it('заглушка допустима при разработке и запрещена при публикации', () => {
    const t = 'почта: [ЗАПОЛНИТЬ: почта]';
    expect(findViolations(t)).toEqual([]);
    expect(findViolations(t, { publish: true }).map((x) => x.rule)).toEqual(['placeholder']);
  });
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run scripts/copy-rules.test.mjs`
Expected: FAIL — `Failed to load url ./copy-rules.mjs`.

- [ ] **Step 3: Реализация**

`scripts/copy-rules.mjs`:
```js
// Правила текста из спецификации лендинга: запрещённые имена и незаполненные заглушки.
export const BANNED = [
  { id: 'technip', pattern: /technip/i, message: 'имя Technip запрещено' },
  { id: 'easy-piping', pattern: /easy\s*-?\s*piping/i, message: 'название Easy Piping запрещено' },
  { id: 'easyplant', pattern: /easy\s*-?\s*plant/i, message: 'название EasyPlant запрещено' },
  { id: 'real-project', pattern: /qatar|train\s*7/i, message: 'название реального проекта запрещено' },
];
export const PLACEHOLDER = { id: 'placeholder', pattern: /\[ЗАПОЛНИТЬ[^\]]*\]/, message: 'незаполненная заглушка' };

export function findViolations(text, { publish = false } = {}) {
  const rules = publish ? [...BANNED, PLACEHOLDER] : BANNED;
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const r of rules) {
      if (r.pattern.test(line)) out.push({ rule: r.id, message: r.message, line: i + 1, excerpt: line.trim().slice(0, 120) });
    }
  });
  return out;
}
```

`scripts/check-copy.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
import { findViolations } from './copy-rules.mjs';

const publish = process.argv.includes('--publish');
const root = path.resolve(import.meta.dirname, '..');
const exts = new Set(['.yaml', '.yml', '.astro', '.ts', '.md', '.svg', '.html', '.json']);
let failed = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name))) {
      for (const v of findViolations(fs.readFileSync(p, 'utf8'), { publish })) {
        failed++;
        console.error(`${path.relative(root, p)}:${v.line} ${v.message} — ${v.excerpt}`);
      }
    }
  }
}

for (const d of ['src', 'public']) {
  const dir = path.join(root, d);
  if (fs.existsSync(dir)) walk(dir);
}
if (failed) {
  console.error(`\nПроверка текстов: нарушений — ${failed}${publish ? ' (режим публикации)' : ''}`);
  process.exit(1);
}
console.log(`Проверка текстов пройдена${publish ? ' (режим публикации)' : ''}`);
```

- [ ] **Step 4: Тесты проходят**

Run: `npx vitest run scripts/copy-rules.test.mjs`
Expected: 3 passed.

- [ ] **Step 5: Проверить CLI на живом нарушении**

```bash
echo 'Technip' > src/__probe.md && npm run copy:check; echo "exit=$?"; rm src/__probe.md && npm run copy:check
```
Expected: первый запуск печатает `src/__probe.md:1 имя Technip запрещено` и `exit=1`; второй — «Проверка текстов пройдена».

- [ ] **Step 6: Коммит**

```bash
git add scripts && git commit -m "feat: copy rules check for banned names and unfilled placeholders"
```

---

### Task 3: Контент — схема, загрузка, разметка терминов и все тексты

Эта задача — отдельный предмет ревью для владельца: все тексты страницы в одном файле.

**Files:**
- Create: `src/content/schema.ts`, `src/content/landing.ru.yaml`, `src/lib/rich.ts`, `src/lib/rich.test.ts`, `src/lib/content.ts`, `src/lib/content.test.ts`

**Interfaces:**
- Produces: `landingSchema` и тип `Landing` (`src/content/schema.ts`); `loadLanding(file?: string): Landing` и `collectTermRefs(value: unknown): string[]` (`src/lib/content.ts`); `parseRich(input: string): RichSegment[]`, тип `RichSegment = { kind: 'text'; text: string } | { kind: 'term'; text: string; id: string }` (`src/lib/rich.ts`). Синтаксис термина в YAML: `{видимый текст|id-термина}`.

- [ ] **Step 1: Падающие тесты разметки терминов**

`src/lib/rich.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseRich } from './rich';

describe('parseRich', () => {
  it('выделяет термин внутри текста', () => {
    expect(parseRich('Линию режут на {катушки|spool}.')).toEqual([
      { kind: 'text', text: 'Линию режут на ' },
      { kind: 'term', text: 'катушки', id: 'spool' },
      { kind: 'text', text: '.' },
    ]);
  });
  it('текст без терминов — один сегмент', () => {
    expect(parseRich('без терминов')).toEqual([{ kind: 'text', text: 'без терминов' }]);
  });
  it('два термина подряд', () => {
    expect(parseRich('{А|a}{Б|b}')).toEqual([{ kind: 'term', text: 'А', id: 'a' }, { kind: 'term', text: 'Б', id: 'b' }]);
  });
  it('фигурные скобки без идентификатора остаются текстом', () => {
    expect(parseRich('{не термин}')).toEqual([{ kind: 'text', text: '{не термин}' }]);
  });
});
```

- [ ] **Step 2: Падает**

Run: `npx vitest run src/lib/rich.test.ts` — Expected: FAIL, модуль `./rich` не найден.

- [ ] **Step 3: Реализация разметки**

`src/lib/rich.ts`:
```ts
export type RichSegment = { kind: 'text'; text: string } | { kind: 'term'; text: string; id: string };

const TERM = /\{([^{}|]+)\|([a-z0-9-]+)\}/g;

export function parseRich(input: string): RichSegment[] {
  const out: RichSegment[] = [];
  let last = 0;
  for (const m of input.matchAll(TERM)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: input.slice(last, at) });
    out.push({ kind: 'term', text: m[1], id: m[2] });
    last = at + m[0].length;
  }
  if (last < input.length) out.push({ kind: 'text', text: input.slice(last) });
  return out;
}
```

Run: `npx vitest run src/lib/rich.test.ts` — Expected: 4 passed.

- [ ] **Step 4: Схема контента**

`src/content/schema.ts`:
```ts
import { z } from 'zod';

const t = z.string().min(1);
// Короткие подписи, которые стоят на плашках фиксированной ширины в SVG-схемах.
const label = (max: number) => z.string().min(1).max(max);
const stepId = z.enum(['s1', 's2', 's3', 's4', 's5', 's6']);
const status = z.enum(['works', 'partial', 'planned']);

export const landingSchema = z.object({
  meta: z.object({ title: t, description: t }),
  nav: z.object({
    items: z.array(z.object({ href: z.string().regex(/^#[a-z-]+$/), label: t })).length(4),
    contact: t,
  }),
  hero: z.object({
    over: t, line1: t, line2Prefix: t, line2Accent: t, lead: t,
    ctaPrimary: t, ctaSecondary: t, drawingTitle: t, drawingCaption: t,
    passport: z.object({
      title: t, tag: t,
      rows: z.array(z.object({ label: t, meta: t, date: t, done: z.boolean() })).length(4),
    }),
    chain: z.array(z.object({ label: t, step: stepId })).length(6),
  }),
  construction: z.object({ over: t, title: t, lead: t, cards: z.array(z.object({ title: t, body: t })).length(3) }),
  journey: z.object({
    over: t, title: t, lead: t, recordsLabel: t, externalLabel: t, handoffPrefix: t, after: t,
    stages: z.array(z.object({
      icon: z.enum(['iso', 'spool', 'shop', 'nde', 'site', 'test']),
      num: t, name: t, what: t, records: z.array(t).min(1).max(3),
      handoff: t.optional(), external: z.boolean(),
    })).length(6),
  }),
  story: z.object({
    over: t, title: t, lead: t, noteLabel: t, drawingTitle: t,
    legend: z.array(z.object({ kind: z.enum(['done', 'work', 'accepted', 'rejected', 'tracer']), label: t })).min(3),
    steps: z.array(z.object({ id: stepId, rail: t, title: t, body: t, note: t })).length(6),
  }),
  why: z.object({
    over: t, title: t, lead: t, todayLabel: label(34), withLabel: label(34), baseLabel: label(12), lossNote: label(90),
    lanes: z.array(label(18)).length(5), files: z.array(label(5)).length(5), handoffs: z.array(label(18)).length(5),
    writes: z.array(label(20)).length(5), outputs: z.array(label(24)).length(3),
    pains: z.array(z.object({ title: t, body: t })).length(4),
  }),
  modules: z.object({
    over: t, title: t, lead: t,
    labels: z.object({ works: t, partial: t, planned: t, gate: t, handoff: t, roles: t }),
    setup: z.object({ code: t, title: t, note: t, chips: z.array(t).min(4) }),
    flow: z.array(z.object({
      code: t, title: t, roles: t, status,
      steps: z.array(z.object({ text: t, planned: z.boolean().default(false) })).min(3),
      gate: t, handoff: t.optional(),
    })).length(4),
    tracking: z.object({ code: t, title: t, body: t, status }),
    nde: z.object({ code: t, title: t, roles: t, status, steps: z.array(t).min(3), up: t }),
    reports: z.object({ code: t, title: t, status, chips: z.array(t).min(2) }),
  }),
  how: z.object({
    over: t, title: t, lead: t,
    guard: z.object({
      title: t, body: t,
      card: z.object({
        joint: t, field: t,
        options: z.array(z.object({ code: t, meta: t, ok: z.boolean() })).length(3),
        message: t,
      }),
    }),
    cascade: z.object({
      title: t, lead: t,
      input: z.object({ label: label(30), joint: label(14), status: label(10), defect: label(34), note: label(42) }),
      node: z.object({ title: label(10), sub: label(14) }),
      repair: z.object({ tag: label(3), title: label(24), body: label(48) }),
      repair2: z.object({ title: label(28), note: label(30) }),
      tracers: z.object({ tags: z.array(label(3)).length(2), title: label(18), body: label(52) }),
      penalty: z.object({ condition: label(48), title: label(30), body: label(48) }),
      aside: z.object({ label: label(20), text: label(140) }),
    }),
  }),
  helps: z.object({
    over: t, title: t, lead: t,
    conditions: z.array(z.object({ label: label(26), value: label(18), ok: z.boolean() })).length(8),
    gate: z.array(label(12)).length(2),
    result: z.object({
      label: label(36), status: label(12), count: label(14),
      reasons: z.array(z.object({ code: label(8), text: label(28), owner: label(14) })).min(1).max(2),
      foot: z.array(label(56)).length(2),
    }),
    access: z.object({ title: t, body: t, roles: z.array(z.object({ name: t, scope: t })).min(3) }),
  }),
  proof: z.object({
    over: t, title: t, lead: t, caption: t, open: t,
    shots: z.array(z.object({ file: z.string().regex(/^\/screens\/[a-z0-9-]+\.webp$/), title: t, alt: t })).length(3),
  }),
  status: z.object({
    over: t, title: t, lead: t,
    now: z.object({ title: t, items: z.array(t).min(3) }),
    next: z.object({ title: t, items: z.array(t).min(1) }),
  }),
  contacts: z.object({ over: t, title: t, lead: t, team: t, email: t, telegram: t, emailLabel: t, telegramLabel: t }),
  footer: z.object({ note: t }),
  terms: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), term: t, body: t })).min(10),
});

export type Landing = z.infer<typeof landingSchema>;
```

- [ ] **Step 5: Тексты страницы**

`src/content/landing.ru.yaml`:
```yaml
meta:
  title: "PipeQC — паспорт каждого сварного стыка"
  description: "Как строят трубопроводы на заводе, через какие стадии проходит каждая линия и как PipeQC ведёт историю каждого стыка от чертежа до гидроиспытания."

nav:
  items:
    - { href: "#construction", label: "Как строят" }
    - { href: "#journey", label: "Стадии" }
    - { href: "#modules", label: "Продукт" }
    - { href: "#status", label: "Что готово" }
  contact: "Связаться"

hero:
  over: "Контроль качества трубопроводов"
  line1: "Сто тысяч стыков."
  line2Prefix: "У каждого — "
  line2Accent: "паспорт."
  lead: "PipeQC ведёт трубопровод от чертежа до гидроиспытания: кто варил стык, по какой процедуре, что показал рентген и что ещё мешает испытанию."
  ctaPrimary: "Как это устроено"
  ctaSecondary: "Что уже работает"
  drawingTitle: "Изометрия линии: три катушки, полевой стык, фланец и выделенный стык J-1029"
  drawingCaption: "ЛИНИЯ 6\"-P-2041-A1 · ISO · REV 3"
  passport:
    title: "Стык J-1029"
    tag: "Принят"
    rows:
      - { label: "Материал", meta: "плавка H-58812", date: "02.09", done: true }
      - { label: "Сварка", meta: "WLD-14 · WPS-07", date: "04.09", done: true }
      - { label: "Рентген", meta: "отчёт RT-0412", date: "09.09", done: true }
      - { label: "Гидроиспытание", meta: "пакет TP-12", date: "ждёт", done: false }
  chain:
    - { label: "Изометрия", step: s1 }
    - { label: "Катушки", step: s2 }
    - { label: "Цех", step: s3 }
    - { label: "NDE", step: s4 }
    - { label: "Монтаж", step: s5 }
    - { label: "Испытание", step: s6 }

construction:
  over: "01 · Как строят завод"
  title: "Речь о трубах внутри завода, а не о магистрали"
  lead: "Нефтеперерабатывающий завод, газовый комплекс, химкомбинат, электростанция. По их трубам под давлением идут пар, газ, нефть и кислоты. Уберите трубы — останется оборудование, которое ничего не делает."
  cards:
    - title: "Масштаб"
      body: "Крупный завод — это тысячи {изометрий|isometric} и десятки тысяч сварных {стыков|joint}. Стройка идёт годами, и на площадке одновременно работают разные подрядчики."
    - title: "Цена ошибки"
      body: "Сварной шов нельзя разобрать и переделать после пуска. Поэтому у каждого стыка должен быть паспорт: кто варил, по какой {процедуре|wps}, что показал контроль. Его хранят десятилетиями."
    - title: "Строгость задаёт среда"
      body: "От того, что течёт по трубе, зависят сталь, толщина стенки и доля стыков, которые уйдут на {неразрушающий контроль|nde}. На воде проверяют выборку, на опасной среде — каждый стык."

journey:
  over: "02 · Стадии"
  title: "Путь одной трубы: от чертежа до испытания"
  lead: "У каждой линии один и тот же путь. На каждой стадии работу ведёт другой участник, и на каждой передаче теряются данные. PipeQC ведёт стадии со второй по шестую."
  recordsLabel: "PipeQC фиксирует"
  externalLabel: "Приходит в PipeQC"
  handoffPrefix: "передаёт"
  after: "дальше пусконаладка"
  stages:
    - icon: iso
      num: "01"
      name: "Изометрия"
      what: "Проектировщики выдают чертёж каждой линии: все детали, стыки и материалы с номерами."
      records: ["импорт", "ревизии"]
      handoff: "чертежи"
      external: true
    - icon: spool
      num: "02"
      name: "Катушки"
      what: "Линию режут на катушки размером с фуру. Каждый разрез станет полевым стыком на площадке."
      records: ["катушки", "стыки цех/поле"]
      handoff: "катушки"
      external: false
    - icon: shop
      num: "03"
      name: "Цех"
      what: "Материал сверяют по номеру плавки. Катушку режут, собирают и варят по утверждённой процедуре, каждый шов осматривают."
      records: ["плавка", "сварщик", "WPS"]
      handoff: "стыки на контроль"
      external: false
    - icon: nde
      num: "04"
      name: "Контроль NDE"
      what: "Шов просвечивают, не разрушая. Сколько стыков проверить, задаёт класс среды: от выборки на воде до каждого стыка на опасной среде."
      records: ["объём контроля", "результат", "брак"]
      handoff: "катушки на площадку"
      external: false
    - icon: site
      num: "05"
      name: "Монтаж"
      what: "Катушки ставят на опоры, варят полевые стыки, затягивают фланцы. Инспектор обходит линию и записывает недоделки."
      records: ["полевые стыки", "опоры", "фланцы"]
      handoff: "линии в пакет"
      external: false
    - icon: test
      num: "06"
      name: "Испытание"
      what: "Связанные линии объединяют в пакет и держат под давлением воды выше рабочего. После испытания снимают каждую заглушку."
      records: ["готовность", "заглушки"]
      external: false

story:
  over: "03 · Путь трубы подробно"
  title: "Один чертёж проходит все шесть стадий"
  lead: "Слева — изометрия одной линии. Прокручивайте: на каждой стадии чертёж меняется так же, как меняется запись о линии в системе."
  noteLabel: "На чертеже"
  drawingTitle: "Изометрия линии 6\"-P-2041-A1"
  legend:
    - { kind: done, label: "катушка изготовлена" }
    - { kind: work, label: "в работе" }
    - { kind: accepted, label: "стык принят" }
    - { kind: rejected, label: "брак" }
    - { kind: tracer, label: "назначен системой" }
  steps:
    - id: s1
      rail: "Изометрия"
      title: "Изометрия — паспорт одной линии, а не план завода"
      body: "Проектировщики выдают на стройку {изометрический чертёж|isometric}: путь одной трубы от насоса до теплообменника. На нём пронумерованы каждый прямой участок, колено, тройник и фланец, а внизу — спецификация деталей. На средний завод таких чертежей тысячи."
      note: "Линия 6\"-P-2041-A1: стыки J-01…J-11 и фланец FL-03. Пока это только чертёж."
    - id: s2
      rail: "Катушки"
      title: "Линию режут на катушки: двадцать метров трубы не привезти целиком"
      body: "{Катушка|spool} — заранее собранный в цеху кусок линии, который помещается в фуру. Место разреза между катушками станет {полевым стыком|field-joint}: его сварят уже на площадке. Чем больше швов удалось увести в цех, тем дешевле и надёжнее стройка."
      note: "Линия разрезана на три катушки: SP-01, SP-02, SP-03. Стык FW-07 станет полевым."
    - id: s3
      rail: "Цех"
      title: "В цеху катушку проводят через цепочку проверок"
      body: "Материал сверяют по {номеру плавки|heat}: труба и колено должны быть теми, что заложены в проект. Варит только сварщик с действующим {допуском|qualification} на эту процедуру. Каждый шов осматривают, при необходимости проводят {термообработку|pwht}."
      note: "SP-01 и SP-02 изготовлены, SP-03 ещё в работе. У каждого стыка записаны сварщик и процедура."
    - id: s4
      rail: "Контроль"
      title: "Шов нельзя разобрать. Поэтому его просвечивают"
      body: "Шов проверяют, не разрушая его: рентгеном или ультразвуком. Просвечивают долю стыков, которую задаёт класс среды, — от выборки до каждого стыка. У каждого сварщика своё клеймо, поэтому по снимку видно, кто варил."
      note: "J-02 и J-05 приняты. J-1029 не прошёл рентген, и система сама назначила ремонт и два {трассера|tracer} — J-11 и J-01, стыки того же сварщика."
    - id: s5
      rail: "Монтаж"
      title: "На площадке варят только то, что нельзя было сварить в цеху"
      body: "Катушки везут на площадку, поднимают краном и ставят на {опоры|support}. Полевые стыки варят на высоте и в любую погоду — отсюда их цена и риск. {Фланцы|flange} затягивают с заданным моментом, а инспектор обходит линию и записывает {недоделки|punch}."
      note: "Полевой стык FW-07 сварен, J-1029 после ремонта принят. У фланца FL-03 нет записи о затяжке, поэтому линия ещё не готова к испытанию."
    - id: s6
      rail: "Испытание"
      title: "Испытывают не трубу, а пакет линий — водой выше рабочего давления"
      body: "Связанные линии объединяют в {пакет испытаний|test-pack} и проверяют одним гидроиспытанием. Оборудование на пути отсекают временными {заглушками|blind}, иначе давление его повредит. После испытания каждую заглушку снимают."
      note: "Линия вошла в пакет TP-12, на обоих концах стоят заглушки. Сколько поставили, столько должно быть снято."

why:
  over: "04 · Зачем"
  title: "Стадий шесть, участников пять, а стык один"
  lead: "Сегодня каждый участник ведёт свой файл и передаёт данные письмом, звонком или бумагой. С PipeQC все пишут в одну базу, а выводы система делает сама."
  todayLabel: "СЕГОДНЯ · У КАЖДОГО СВОЙ ФАЙЛ"
  withLabel: "С PIPEQC · ОДНА БАЗА"
  baseLabel: "ОДНА БАЗА"
  lossNote: "✕ данные теряются: брак не дошёл до цеха, о блокерах узнали в день испытания"
  lanes: ["Проектный офис", "Цех", "Лаборатория NDE", "Монтаж", "Испытания"]
  files: ["xlsx", "xlsx", "pdf", "бум.", "xlsx"]
  handoffs: ["чертёж · почта", "заявка · бумага", "брак · звонок", "катушки · накладная", "сводка · Excel"]
  writes: ["импорт чертежей", "плавка · сварщик", "результат контроля", "стыки · опоры", "видит готовность"]
  outputs: ["Паспорт каждого стыка", "Каскад при браке", "Готовность к испытанию"]
  pains:
    - title: "У каждой бригады свой Excel"
      body: "Чтобы узнать, готов ли пакет к испытанию, руководитель обходит пять человек и сводит их таблицы руками. К вечеру сводка уже устарела."
    - title: "О блокерах узнают в день испытания"
      body: "Бригада приезжает, разворачивает насосы — и выясняется, что один стык ещё не просвечен. Испытание переносят."
    - title: "Сварщик без допуска на ответственном стыке"
      body: "Срок допуска истёк, или допуск выдан на другую процедуру. На бумаге это видно, только если кто-то сверил вручную."
    - title: "Брак не дошёл до цеха"
      body: "Лаборатория отметила брак в своём журнале и позвонила. Ремонт и проверка других стыков того же сварщика держатся на памяти одного инженера."

modules:
  over: "05 · Как устроена программа"
  title: "Модули повторяют стадии стройки и передают работу друг другу"
  lead: "Каждый участник работает в своём модуле, а пишут все в одну базу. Правила проекта действуют везде, а контроль NDE обслуживает и цех, и площадку."
  labels: { works: "работает", partial: "частично", planned: "в планах", gate: "Замок", handoff: "передаёт", roles: "Кто работает" }
  setup:
    code: "SETUP"
    title: "Правила проекта"
    note: "задаются до первой записи и действуют во всех модулях"
    chips: ["Процедуры сварки (WPS)", "Допуски сварщиков", "Матрица контроля NDE", "Список материалов проекта", "Зоны и субподрядчики", "Роли и доступы"]
  flow:
    - code: "SPOOLING"
      title: "Подготовка"
      roles: "спулинг-инженер"
      status: works
      steps:
        - { text: "Импорт пакета чертежей: стыки, материалы, фланцы, опоры" }
        - { text: "Каждая строка проверяется по справочникам проекта" }
        - { text: "Изометрии и катушки с историей ревизий" }
        - { text: "Новая ревизия не затирает прогресс — конфликт уходит на решение" }
        - { text: "Трансмитталы и HOLD изменённых чертежей", planned: true }
      gate: "Строка, которая противоречит справочникам, не станет работой"
      handoff: "катушки в цех"
    - code: "FABRICATION"
      title: "Цех"
      roles: "субподрядчик цеха · QC-инженер"
      status: works
      steps:
        - { text: "Проверка материала по номеру плавки" }
        - { text: "Сварка: сварщик с действующим допуском, процедура WPS" }
        - { text: "Опоры катушки" }
        - { text: "Термообработка, если её требует процедура" }
        - { text: "Выпуск катушки, покраска, склад готовой продукции" }
      gate: "Катушку выпускают, только когда материал сверен, все стыки и опоры записаны, контроль и термообработка закрыты"
      handoff: "катушки на площадку"
    - code: "ERECTION"
      title: "Площадка"
      roles: "монтажный субподрядчик · QC · инспектор заказчика"
      status: works
      steps:
        - { text: "Приёмка катушки на площадке" }
        - { text: "Проверка материала и повреждений" }
        - { text: "Монтаж, полевые стыки и фланцы на болтах" }
        - { text: "Опоры" }
        - { text: "Готовность к испытанию ({RFT|rft})" }
      gate: "Готовность не ставят вручную: сварено, на опорах, контроль и термообработка закрыты"
      handoff: "линии в пакет"
    - code: "TEST PACK"
      title: "Испытание"
      roles: "координатор испытаний · бригады заглушек и обхода"
      status: works
      steps:
        - { text: "Сборка пакета из готовых линий" }
        - { text: "Установка заглушек" }
        - { text: "Обход линии, недоделки категории X" }
        - { text: "Гидроиспытание и снятие заглушек" }
      gate: "Пакет не допускают к испытанию, пока открыто хоть одно условие готовности"
  tracking: { code: "TRACKING", title: "Перемещения катушек", body: "штрихкоды, склад, площадка", status: partial }
  nde:
    code: "NDE"
    title: "Контроль стыков"
    roles: "лаборатория"
    status: works
    steps: ["Объём по матрице проекта", "Партия стыков в лабораторию", "Результат по каждому стыку", "При браке — ремонт и трассеры"]
    up: "стыки цеха и площадки"
  reports: { code: "REPORTS", title: "Сводки и формы", status: partial, chips: ["прогресс сварки", "результаты контроля", "готовность пакетов"] }

how:
  over: "06 · Как работает"
  title: "Правила проекта вместо переписки"
  lead: "PipeQC не просто хранит записи. Правила проекта задаются один раз, и дальше система не принимает то, что им противоречит, и сама назначает следующие шаги."
  guard:
    title: "Сварщика без допуска нельзя записать на стык"
    body: "Допуск сварщика привязан к процедуре и имеет срок. Если на дату сварки допуск истёк или выдан на другую процедуру, запись не примется. Процедура, в свою очередь, должна быть допущена для материала катушки."
    card:
      joint: "Стык J-1029 · сварка"
      field: "Сварщик"
      options:
        - { code: "WLD-14", meta: "WPS-07 · допуск до 12.2026", ok: true }
        - { code: "WLD-09", meta: "WPS-07 · допуск до 03.2027", ok: true }
        - { code: "WLD-22", meta: "допуск истёк 30.04.2026", ok: false }
      message: "Запись не примется: допуск WLD-22 истёк до даты сварки"
  cascade:
    title: "Одна запись лаборатории — три следствия"
    lead: "Инспектор отмечает брак и обязан указать код дефекта. Всё остальное система назначает по правилам проекта, без писем и без памяти QC-инженера."
    input: { label: "ЛАБОРАТОРИЯ · ОДНА ЗАПИСЬ", joint: "J-1029 · RT", status: "Отклонён", defect: "Дефект: непровар корня, 6 мм", note: "без кода дефекта запись не принимается" }
    node: { title: "PipeQC", sub: "по правилам" }
    repair: { tag: "R1", title: "Ремонт этого стыка", body: "Обязательный повторный контроль после ремонта" }
    repair2: { title: "R2, если не прошёл R1", note: "третьего ремонта не бывает" }
    tracers: { tags: ["T1", "T2"], title: "Два трассера", body: "Ещё два стыка того же сварщика уходят на контроль" }
    penalty: { condition: "ЕСЛИ 4 БРАКА ИЛИ БРАК НА ТРАССЕРЕ 2-ГО УРОВНЯ", title: "Сварщик на 100% контроль", body: "Проверяется каждый его стык, а не выборка" }
    aside: { label: "БЕЗ СИСТЕМЫ", text: "Эта цепочка живёт в переписке и в памяти QC-инженера. Один пропущенный трассер — непроверенный шов на работающем заводе." }

helps:
  over: "07 · Чем помогает"
  title: "О блокерах известно до приезда испытательной бригады"
  lead: "Пакет допускают к гидроиспытанию, только когда закрыты все условия. PipeQC пересчитывает их при каждой записи и называет, что именно держит пакет и чья это зона."
  conditions:
    - { label: "Сварка в цеху", value: "48 / 48", ok: true }
    - { label: "Полевые стыки", value: "12 / 12", ok: true }
    - { label: "Опоры", value: "31 / 31", ok: true }
    - { label: "Контроль NDE", value: "1 ждёт · J-1031", ok: false }
    - { label: "Термообработка", value: "не требуется", ok: true }
    - { label: "Выпуск катушек из цеха", value: "9 / 9", ok: true }
    - { label: "Фланцы затянуты", value: "FL-03 без записи", ok: false }
    - { label: "Недоделки категории X", value: "0 открыто", ok: true }
  gate: ["готов", "к испытанию?"]
  result:
    label: "TEST PACK TP-12 · 7 ЛИНИЙ"
    status: "Не готов"
    count: "· 2 причины"
    reasons:
      - { code: "J-1031", text: "ждёт рентгена", owner: "лаборатория" }
      - { code: "FL-03", text: "нет записи о затяжке", owner: "монтаж" }
    foot: ["Готовность — следствие записей, а не галочка.", "Закроют оба пункта — пакет станет готов сам."]
  access:
    title: "Каждый видит свой участок"
    body: "Субподрядчик видит только свою зону площадки. Ограничение задано на уровне строк базы, а не кнопок в интерфейсе, поэтому обойти его через другой экран нельзя."
    roles:
      - { name: "Руководитель проекта", scope: "весь проект" }
      - { name: "Субподрядчик", scope: "только своя зона площадки" }
      - { name: "Лаборатория NDE", scope: "партии и результаты контроля" }

proof:
  over: "08 · Это настоящий продукт"
  title: "Работающая система, а не концепт"
  lead: "Экраны демонстрационной версии PipeQC на демо-проекте. Правила со схем выше — каскад брака, расчёт готовности, проверка допусков — в ней уже работают."
  caption: "Экран демонстрационной версии · данные вымышлены"
  open: "Открыть на весь экран"
  shots:
    - { file: "/screens/nde-cascade.webp", title: "Каскад после брака: ремонт и трассеры", alt: "Экран модуля NDE: отклонённый стык, назначенный ремонт и трассеры того же сварщика" }
    - { file: "/screens/testpack-readiness.webp", title: "Готовность пакета испытаний", alt: "Экран пакета испытаний: условия готовности и что ещё держит испытание" }
    - { file: "/screens/fabrication-dashboard.webp", title: "Динамика цеха", alt: "Дашборд цеха: накопительная кривая по стадиям и распределение катушек" }

status:
  over: "09 · Что готово"
  title: "Что работает сегодня — и что дальше"
  lead: "Незакрытое названо незакрытым. Каждый пункт сверен с кодом системы."
  now:
    title: "Работает сегодня"
    items:
      - "Справочники проекта, роли и разграничение доступа по зонам"
      - "Импорт пакета чертежей с проверкой строк и историей ревизий"
      - "Цех: проверка материала, сварка с проверкой допусков, выпуск, покраска, склад"
      - "Контроль NDE: объём по матрице, партии, результат по стыку, каскад ремонта и трассеров"
      - "Монтаж и автоматический расчёт готовности к испытанию"
      - "Пакеты испытаний: сборка, заглушки, обход линии, испытание, снятие заглушек"
  next:
    title: "Следующее"
    items:
      - "Формы для заказчика и досье пакета одной кнопкой"
      - "Учёт перемещений катушек по штрихкоду"
      - "Трансмитталы инженерии и статус HOLD для изменённых чертежей"

contacts:
  over: "10 · Контакты"
  title: "Обсудим проект"
  lead: "Покажем систему вживую и ответим на вопросы о продукте и рынке."
  team: "[ЗАПОЛНИТЬ: две строки о команде]"
  email: "[ЗАПОЛНИТЬ: почта]"
  telegram: "[ЗАПОЛНИТЬ: Telegram]"
  emailLabel: "Почта"
  telegramLabel: "Telegram"

footer:
  note: "PipeQC · все данные на схемах и экранах вымышлены"

terms:
  - id: isometric
    term: "Изометрия"
    body: "Объёмный чертёж одной линии, развёрнутый на плоскость. На нём пронумерованы все детали и стыки, внизу — их спецификация."
  - id: joint
    term: "Стык"
    body: "Место, где две детали трубы соединены сваркой. На крупном заводе их десятки тысяч, и у каждого свой номер."
  - id: wps
    term: "Процедура сварки (WPS)"
    body: "Утверждённый «рецепт» сварки: материалы, режим, подогрев, нужна ли термообработка. Варить можно только по допущенной процедуре."
  - id: nde
    term: "Неразрушающий контроль (NDE)"
    body: "Проверка шва без его разрушения: рентген, ультразвук, капиллярный и магнитный методы."
  - id: spool
    term: "Катушка (spool)"
    body: "Заранее собранный в цеху кусок линии с собственным номером, который помещается в фуру."
  - id: field-joint
    term: "Полевой стык"
    body: "Стык между катушками, который варят на площадке при монтаже, а не в цеху. Он дороже и сложнее цехового."
  - id: heat
    term: "Номер плавки"
    body: "Номер партии металла, из которой сделана деталь. По нему деталь сверяют с сертификатом и списком материалов проекта."
  - id: qualification
    term: "Допуск сварщика"
    body: "Подтверждённое право варить по конкретной процедуре, со сроком действия. Без действующего допуска сварщик варить не может."
  - id: pwht
    term: "Термообработка (PWHT)"
    body: "Нагрев шва после сварки, чтобы снять напряжения в металле. Нужна не всегда — это задаёт процедура."
  - id: tracer
    term: "Трассер"
    body: "Дополнительный стык того же сварщика, который отправляют на контроль после брака, чтобы проверить, не системная ли это ошибка."
  - id: support
    term: "Опоры"
    body: "Конструкции, на которых лежит и к которым крепится труба. Без готовых опор катушку не поднимают."
  - id: flange
    term: "Фланец"
    body: "Болтовое соединение труб или трубы с оборудованием. Болты затягивают с заданным моментом: перетянешь — сорвёшь резьбу, недотянешь — потечёт."
  - id: punch
    term: "Недоделка (punch)"
    body: "Замечание инспектора при обходе линии. Блокирующие недоделки закрывают до испытания."
  - id: test-pack
    term: "Пакет испытаний (test pack)"
    body: "Группа связанных линий, которую испытывают одним гидроиспытанием."
  - id: blind
    term: "Заглушка (blind)"
    body: "Временная пластина во фланце, которая отсекает оборудование на время испытания. После испытания её обязательно снимают."
  - id: rft
    term: "Готовность к испытанию (RFT)"
    body: "Ready for test: катушка сварена, стоит на опорах, контроль и термообработка закрыты. В PipeQC это расчёт, а не отметка."
```

- [ ] **Step 6: Падающие тесты загрузки контента**

`src/lib/content.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { loadLanding, collectTermRefs } from './content';
import { landingSchema } from '@/content/schema';

const landing = loadLanding();

describe('контент лендинга', () => {
  it('файл проходит схему', () => {
    expect(landing.meta.title).toContain('PipeQC');
  });
  it('каждый термин в тексте определён в словаре', () => {
    const defined = new Set(landing.terms.map((t) => t.id));
    for (const id of collectTermRefs(landing)) expect(defined, `термин «${id}»`).toContain(id);
  });
  it('каждый термин словаря где-то используется', () => {
    const used = new Set(collectTermRefs(landing));
    for (const t of landing.terms) expect(used, `термин «${t.id}» не используется`).toContain(t.id);
  });
  it('идентификаторы терминов уникальны', () => {
    const ids = landing.terms.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('шаги живого чертежа идут по порядку s1…s6', () => {
    expect(landing.story.steps.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);
  });
  it('у последней стадии нет передачи, у остальных есть', () => {
    const st = landing.journey.stages;
    expect(st.at(-1)?.handoff).toBeUndefined();
    st.slice(0, -1).forEach((s) => expect(s.handoff).toBeTruthy());
  });
  it('rejects too-long diagram labels', () => {
    const broken = structuredClone(landing);
    broken.why.handoffs[0] = 'очень длинная подпись передачи';
    expect(landingSchema.safeParse(broken).success).toBe(false);
  });
});
```

Run: `npx vitest run src/lib/content.test.ts` — Expected: FAIL, модуль `./content` не найден.

- [ ] **Step 7: Загрузчик**

`src/lib/content.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { landingSchema, type Landing } from '@/content/schema';
import { parseRich } from '@/lib/rich';

export const LANDING_FILE = path.resolve(process.cwd(), 'src/content/landing.ru.yaml');

export function loadLanding(file = LANDING_FILE): Landing {
  return landingSchema.parse(parse(fs.readFileSync(file, 'utf8')));
}

export function collectTermRefs(value: unknown): string[] {
  if (typeof value === 'string') return parseRich(value).flatMap((s) => (s.kind === 'term' ? [s.id] : []));
  if (Array.isArray(value)) return value.flatMap(collectTermRefs);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectTermRefs);
  return [];
}
```

- [ ] **Step 8: Тесты проходят**

Run: `npm run test:unit && npm run copy:check && npm run check`
Expected: все юнит-тесты зелёные; «Проверка текстов пройдена»; `astro check` — 0 errors.

- [ ] **Step 9: Коммит**

```bash
git add src/content src/lib && git commit -m "feat: landing copy, content schema and term markup"
```

---

### Task 4: Модель чертежа и компонент Drawing

**Files:**
- Create: `src/lib/drawing/geometry.ts`, `src/lib/drawing/geometry.test.ts`, `src/lib/drawing/states.ts`, `src/lib/drawing/states.test.ts`, `src/components/drawing/Drawing.astro`

**Interfaces:**
- Produces: `Drawing.astro` с пропсами `{ state: StateId; title: string; caption?: string; leader?: boolean; class?: string }`. Рисует `<svg role="img" aria-label={title} data-drawing-state={state}>`, каждый стык — `<g data-joint="J-1029" class="dw-joint dw-joint--<status>">`. Фон бумаги под трубой берётся из CSS-переменной `--dw-bg` (по умолчанию `--paper`). `StateId = 'hero' | 's1' | … | 's6'`; `VIEW_HEIGHT = 330`.

- [ ] **Step 1: Падающие тесты**

`src/lib/drawing/geometry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toPath } from './geometry';

describe('toPath', () => {
  it('собирает ломаную', () => expect(toPath([[0, 0], [10, 5], [20, 0]])).toBe('M0 0 L10 5 L20 0'));
});
```

`src/lib/drawing/states.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { STATES, STATE_IDS } from './states';
import { JOINT_IDS, SPOOL_IDS } from './geometry';

describe('состояния чертежа', () => {
  it('у каждого состояния заданы все катушки и все стыки', () => {
    for (const id of STATE_IDS) {
      expect(Object.keys(STATES[id].spools).sort()).toEqual([...SPOOL_IDS].sort());
      expect(Object.keys(STATES[id].joints).sort()).toEqual([...JOINT_IDS].sort());
    }
  });
  it('подписи ссылаются только на существующие стыки и фланец', () => {
    const allowed = new Set<string>([...JOINT_IDS, 'FL-03']);
    for (const id of STATE_IDS) for (const k of Object.keys(STATES[id].labels)) expect(allowed).toContain(k);
  });
  it('шаг «Контроль»: брак J-1029 и ровно два трассера', () => {
    expect(STATES.s4.joints['J-1029']).toBe('rejected');
    expect(Object.values(STATES.s4.joints).filter((j) => j === 'tracer')).toHaveLength(2);
  });
  it('до разреза полевого стыка нет, после — есть', () => {
    expect(STATES.s1.joints['FW-07']).toBe('plain');
    expect(STATES.s2.joints['FW-07']).toBe('field-open');
  });
  it('испытание: пакет, заглушки, фланец затянут', () => {
    expect(STATES.s6.testPack).toBeTruthy();
    expect(STATES.s6.blinds).toBe(true);
    expect(STATES.s6.flange).toBe('done');
  });
  it('первый экран выделяет J-1029', () => expect(STATES.hero.highlight).toBe('J-1029'));
});
```

Run: `npx vitest run src/lib/drawing` — Expected: FAIL, модули не найдены.

- [ ] **Step 2: Геометрия**

`src/lib/drawing/geometry.ts`:
```ts
export type Point = readonly [number, number];

export const VIEWBOX = '0 0 640 330';
export const VIEW_HEIGHT = 330;

const P = {
  p0: [30, 300], p1: [168.6, 220], p2: [168.6, 120], p3: [281.2, 55],
  p4: [385.1, 115], p5: [385.1, 205], p6: [471.7, 255], p7: [566.9, 200],
} as const satisfies Record<string, Point>;

export const LINE: readonly Point[] = [P.p0, P.p1, P.p2, P.p3, P.p4, P.p5, P.p6, P.p7];

export type SpoolId = 'SP-01' | 'SP-02' | 'SP-03';
export const SPOOL_IDS: readonly SpoolId[] = ['SP-01', 'SP-02', 'SP-03'];
export const SPOOLS: Record<SpoolId, { path: readonly Point[]; tag: Point }> = {
  'SP-01': { path: [P.p0, P.p1, P.p2], tag: [40, 214] },
  'SP-02': { path: [P.p2, P.p3, P.p4], tag: [244, 90] },
  'SP-03': { path: [P.p4, P.p5, P.p6, P.p7], tag: [488, 262] },
};

export type JointId = 'J-01' | 'J-02' | 'FW-07' | 'J-05' | 'J-1029' | 'J-11';
export const JOINT_IDS: readonly JointId[] = ['J-01', 'J-02', 'FW-07', 'J-05', 'J-1029', 'J-11'];
export interface JointGeometry { at: Point; leader: readonly [Point, Point]; text: Point }
export const JOINTS: Record<JointId, JointGeometry> = {
  'J-01': { at: [99.3, 260], leader: [[99.3, 260], [112, 296]], text: [116, 310] },
  'J-02': { at: P.p1, leader: [[168.6, 220], [204, 242]], text: [208, 246] },
  'FW-07': { at: P.p2, leader: [[156, 112], [96, 80]], text: [22, 74] },
  'J-05': { at: P.p3, leader: [[281.2, 55], [281.2, 26]], text: [252, 20] },
  'J-1029': { at: P.p5, leader: [[396, 198], [430, 176]], text: [434, 174] },
  'J-11': { at: P.p6, leader: [[482, 262], [496, 292]], text: [500, 306] },
};

export const FLANGE = {
  ticks: [[[374, 121], [396, 108]], [[374, 128], [396, 115]]] as const,
  leader: [[396, 108], [440, 84]] as const,
  text: [444, 82] as Point,
};
export const BLINDS: readonly (readonly [Point, Point])[] = [
  [[24, 289.6], [36, 310.4]],
  [[560.9, 189.6], [572.9, 210.4]],
];
export const END_LABEL: Point = [580, 226];
export const PACK_RECT = { x: 8, y: 8, w: 624, h: 314 } as const;

export function toPath(points: readonly Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}
```

- [ ] **Step 3: Состояния**

`src/lib/drawing/states.ts`:
```ts
import type { JointId, SpoolId } from './geometry';

export type StateId = 'hero' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
export type SpoolStatus = 'outline' | 'done' | 'work';
export type JointStatus = 'plain' | 'welded' | 'accepted' | 'rejected' | 'tracer' | 'field-open' | 'field-done';
export type FlangeStatus = 'plain' | 'pending' | 'done';

export interface DrawingState {
  spools: Record<SpoolId, SpoolStatus>;
  spoolTags: boolean;
  joints: Record<JointId, JointStatus>;
  labels: Partial<Record<JointId | 'FL-03', string>>;
  highlight?: JointId;
  flange: FlangeStatus;
  testPack: string | false;
  blinds: boolean;
}

export const STATE_IDS: readonly StateId[] = ['hero', 's1', 's2', 's3', 's4', 's5', 's6'];

const all = (s: JointStatus): Record<JointId, JointStatus> =>
  ({ 'J-01': s, 'J-02': s, 'FW-07': s, 'J-05': s, 'J-1029': s, 'J-11': s });

export const STATES: Record<StateId, DrawingState> = {
  hero: {
    spools: { 'SP-01': 'done', 'SP-02': 'done', 'SP-03': 'work' }, spoolTags: true,
    joints: { ...all('plain'), 'FW-07': 'field-open' },
    labels: { 'FW-07': 'FW-07 · полевой', 'FL-03': 'FL-03 · фланец', 'J-1029': 'J-1029' },
    highlight: 'J-1029', flange: 'plain', testPack: false, blinds: false,
  },
  s1: {
    spools: { 'SP-01': 'outline', 'SP-02': 'outline', 'SP-03': 'outline' }, spoolTags: false,
    joints: all('plain'),
    labels: { 'J-02': 'J-02', 'J-05': 'J-05', 'J-1029': 'J-1029', 'FL-03': 'FL-03 · фланец' },
    flange: 'plain', testPack: false, blinds: false,
  },
  s2: {
    spools: { 'SP-01': 'outline', 'SP-02': 'outline', 'SP-03': 'outline' }, spoolTags: true,
    joints: { ...all('plain'), 'FW-07': 'field-open' },
    labels: { 'FW-07': 'FW-07 · полевой стык', 'FL-03': 'FL-03 · фланец' },
    flange: 'plain', testPack: false, blinds: false,
  },
  s3: {
    spools: { 'SP-01': 'done', 'SP-02': 'done', 'SP-03': 'work' }, spoolTags: true,
    joints: { ...all('welded'), 'FW-07': 'field-open' },
    labels: { 'J-02': 'J-02 · сварен', 'J-05': 'J-05 · сварен', 'FW-07': 'FW-07 · полевой' },
    flange: 'plain', testPack: false, blinds: false,
  },
  s4: {
    spools: { 'SP-01': 'done', 'SP-02': 'done', 'SP-03': 'work' }, spoolTags: true,
    joints: { 'J-01': 'tracer', 'J-02': 'accepted', 'FW-07': 'field-open', 'J-05': 'accepted', 'J-1029': 'rejected', 'J-11': 'tracer' },
    labels: {
      'J-02': 'J-02 · RT принят', 'J-05': 'J-05 · RT принят', 'J-1029': 'J-1029 · брак',
      'J-11': 'J-11 · трассер T1', 'J-01': 'J-01 · трассер T2',
    },
    flange: 'plain', testPack: false, blinds: false,
  },
  s5: {
    spools: { 'SP-01': 'done', 'SP-02': 'done', 'SP-03': 'done' }, spoolTags: true,
    joints: { ...all('accepted'), 'FW-07': 'field-done' },
    labels: { 'FW-07': 'FW-07 · сварен на месте', 'J-1029': 'J-1029 · R1 принят', 'FL-03': 'FL-03 · нет записи затяжки' },
    flange: 'pending', testPack: false, blinds: false,
  },
  s6: {
    spools: { 'SP-01': 'done', 'SP-02': 'done', 'SP-03': 'done' }, spoolTags: true,
    joints: { ...all('accepted'), 'FW-07': 'field-done' },
    labels: { 'FL-03': 'FL-03 · затянут' },
    flange: 'done', testPack: 'ПАКЕТ TP-12', blinds: true,
  },
};
```

Run: `npx vitest run src/lib/drawing` — Expected: 7 passed.

- [ ] **Step 4: Компонент**

`src/components/drawing/Drawing.astro`:
```astro
---
import { VIEWBOX, VIEW_HEIGHT, LINE, SPOOLS, SPOOL_IDS, JOINTS, JOINT_IDS, FLANGE, BLINDS, END_LABEL, PACK_RECT, toPath, type SpoolId } from '@/lib/drawing/geometry';
import { STATES, type StateId, type JointStatus, type SpoolStatus } from '@/lib/drawing/states';

interface Props { state: StateId; title: string; caption?: string; leader?: boolean; class?: string }
const { state, title, caption, leader = false, class: className } = Astro.props;
const s = STATES[state];
const line = toPath(LINE);

const tagText = (id: SpoolId, st: SpoolStatus) => (st === 'done' ? `${id} ✓` : st === 'work' ? `${id} в работе` : id);
const tagWidth = (text: string) => Math.round(text.length * 6.2 + 14);
const tone = (st: JointStatus, hl: boolean) =>
  st === 'rejected' ? 'alert' : st === 'tracer' || hl ? 'accent' : st === 'field-open' ? 'work' : 'plain';
const flangeTone = s.flange === 'pending' ? 'work' : s.flange === 'done' ? 'accent' : 'plain';
const ringed = (st: JointStatus) => st === 'accepted' || st === 'rejected' || st === 'tracer';
const hl = s.highlight ? JOINTS[s.highlight].at : undefined;
---
<svg viewBox={VIEWBOX} role="img" aria-label={title} class:list={['drawing', className]} data-drawing-state={state} fill="none">
  {caption && <text class="dw-caption" x="30" y="30">{caption}</text>}
  {s.testPack && (
    <g>
      <rect class="dw-pack" x={PACK_RECT.x} y={PACK_RECT.y} width={PACK_RECT.w} height={PACK_RECT.h} rx="14" />
      <text class="dw-pack-label" x={PACK_RECT.x + PACK_RECT.w - 12} y={PACK_RECT.y + 20} text-anchor="end">{s.testPack}</text>
    </g>
  )}
  <path class="dw-outline" d={line} />
  <path class="dw-paper" d={line} />
  {SPOOL_IDS.filter((id) => s.spools[id] !== 'outline').map((id) => (
    <path class={`dw-fill dw-fill--${s.spools[id]}`} d={toPath(SPOOLS[id].path)} />
  ))}
  <g class={`dw-flange dw-flange--${s.flange}`}>
    {FLANGE.ticks.map(([a, b]) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />)}
  </g>
  {s.blinds && BLINDS.map(([a, b]) => <line class="dw-blind" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />)}
  {leader && hl && <line class="dw-leader-accent" x1={hl[0]} y1={hl[1] + 14} x2={hl[0]} y2={VIEW_HEIGHT} />}
  {JOINT_IDS.map((id) => {
    const st = s.joints[id];
    const isHl = s.highlight === id;
    const [x, y] = JOINTS[id].at;
    return (
      <g class:list={['dw-joint', `dw-joint--${st}`, { 'is-highlight': isHl }]} data-joint={id}>
        {st === 'rejected' && <circle class="dw-halo dw-halo--alert" cx={x} cy={y} r="16" />}
        {isHl && <circle class="dw-halo" cx={x} cy={y} r="17" />}
        {(ringed(st) || isHl) && <circle class="dw-ring" cx={x} cy={y} r={isHl ? 11 : 10} />}
        {(st === 'field-open' || st === 'field-done') && <circle class="dw-ring" cx={x} cy={y} r="12" />}
        <circle class="dw-core" cx={x} cy={y} r={st === 'tracer' ? 4.5 : 5.5} />
        {st === 'rejected' && <path class="dw-cross" d={`M${x - 4.5} ${y - 4.5} l9 9 M${x + 4.5} ${y - 4.5} l-9 9`} />}
      </g>
    );
  })}
  {JOINT_IDS.filter((id) => s.labels[id]).map((id) => {
    const g = JOINTS[id];
    return (
      <g>
        <line class="dw-leader" x1={g.leader[0][0]} y1={g.leader[0][1]} x2={g.leader[1][0]} y2={g.leader[1][1]} />
        <text class={`dw-label dw-label--${tone(s.joints[id], s.highlight === id)}`} x={g.text[0]} y={g.text[1]}>{s.labels[id]}</text>
      </g>
    );
  })}
  {s.labels['FL-03'] && (
    <g>
      <line class="dw-leader" x1={FLANGE.leader[0][0]} y1={FLANGE.leader[0][1]} x2={FLANGE.leader[1][0]} y2={FLANGE.leader[1][1]} />
      <text class={`dw-label dw-label--${flangeTone}`} x={FLANGE.text[0]} y={FLANGE.text[1]}>{s.labels['FL-03']}</text>
    </g>
  )}
  <text class="dw-label dw-label--muted" x={END_LABEL[0]} y={END_LABEL[1]}>→ E-104</text>
  {s.spoolTags && SPOOL_IDS.map((id) => {
    const st = s.spools[id];
    const text = tagText(id, st);
    const [tx, ty] = SPOOLS[id].tag;
    return (
      <g>
        <rect class={`dw-tag-bg dw-tag-bg--${st}`} x={tx} y={ty} width={tagWidth(text)} height="18" />
        <text class={`dw-tag dw-tag--${st}`} x={tx + 7} y={ty + 13}>{text}</text>
      </g>
    );
  })}
</svg>

<style>
  .drawing { width: 100%; height: auto; display: block; overflow: visible; }
  .dw-outline { stroke: var(--ink); stroke-width: 15; stroke-linejoin: round; }
  .dw-paper { stroke: var(--dw-bg, var(--paper)); stroke-width: 10.5; stroke-linejoin: round; }
  .dw-fill { stroke-width: 10.5; stroke-linejoin: round; }
  .dw-fill--done { stroke: var(--done); }
  .dw-fill--work { stroke: var(--work); opacity: .9; }
  .dw-core { fill: var(--dw-bg, var(--paper)); stroke: var(--ink); stroke-width: 1.6; }
  .dw-ring { stroke: var(--ink); stroke-width: 2; }
  .dw-joint--welded .dw-core { fill: var(--ink); }
  .dw-joint--accepted .dw-core, .dw-joint--field-done .dw-core, .is-highlight .dw-core { fill: var(--done); }
  .dw-joint--accepted .dw-ring, .dw-joint--field-done .dw-ring, .is-highlight .dw-ring { stroke: var(--done); }
  .dw-joint--tracer .dw-ring { stroke: var(--done); stroke-width: 1.8; stroke-dasharray: 3 2.5; }
  .dw-joint--tracer .dw-core { stroke: var(--done); }
  .dw-joint--rejected .dw-ring { stroke: var(--alert); stroke-width: 2.2; }
  .dw-joint--rejected .dw-core { stroke: var(--alert); }
  .dw-joint--field-open .dw-ring { stroke: var(--work); stroke-width: 1.8; stroke-dasharray: 3 3; }
  .dw-joint--field-open .dw-core { fill: var(--work); }
  .dw-cross { stroke: var(--alert); stroke-width: 2.2; stroke-linecap: round; }
  .dw-halo { fill: var(--done); opacity: .12; }
  .dw-halo--alert { fill: var(--work); opacity: .16; }
  .dw-flange line { stroke: var(--ink); stroke-width: 2.4; }
  .dw-flange--pending line { stroke: var(--work); stroke-width: 3; }
  .dw-flange--done line { stroke: var(--done); }
  .dw-blind { stroke: var(--work); stroke-width: 5; stroke-linecap: round; }
  .dw-pack { stroke: var(--done); stroke-width: 1.4; stroke-dasharray: 6 5; }
  .dw-leader { stroke: var(--ink); stroke-width: .8; }
  .dw-leader-accent { stroke: var(--done); stroke-width: 1.4; stroke-dasharray: 4 3; }
  .dw-caption, .dw-pack-label, .dw-label, .dw-tag { font-family: var(--font-mono); }
  .dw-caption { font-size: 10px; fill: var(--ink); opacity: .55; letter-spacing: .06em; }
  .dw-pack-label { font-size: 10.5px; fill: var(--done); font-weight: 600; letter-spacing: .08em; }
  .dw-label { font-size: 10.5px; fill: var(--ink); }
  .dw-label--alert { fill: var(--alert); font-weight: 600; }
  .dw-label--accent { fill: var(--done); font-weight: 600; }
  .dw-label--work { fill: #B45309; font-weight: 600; }
  .dw-label--muted { opacity: .55; }
  .dw-tag { font-size: 9.5px; font-weight: 600; }
  .dw-tag-bg--done { fill: var(--done); }
  .dw-tag-bg--work { fill: var(--work); }
  .dw-tag-bg--outline { fill: var(--dw-bg, var(--paper)); stroke: var(--ink); stroke-width: 1.2; }
  .dw-tag--done, .dw-tag--work { fill: #fff; }
  .dw-tag--outline { fill: var(--ink); }
</style>
```

- [ ] **Step 5: Типы и тесты**

Run: `npm run check && npm run test:unit`
Expected: 0 errors; все тесты зелёные. Компонент проверяется визуально и браузерными тестами в Task 5 и Task 8.

- [ ] **Step 6: Коммит**

```bash
git add src/lib/drawing src/components/drawing && git commit -m "feat: isometric drawing model with seven states"
```

---

### Task 5: Шапка и первый экран (раздел 00)

**Files:**
- Create: `src/components/ui/SiteHeader.astro`, `src/components/ui/PassportCard.astro`, `src/components/sections/Hero.astro`, `tests/hero.spec.ts`
- Modify: `src/pages/index.astro` (полная замена)

**Interfaces:**
- Consumes: `loadLanding()`, `Landing['nav' | 'hero']`, `Drawing` (`state="hero" leader`).
- Produces: `index.astro` в форме, в которую следующие задачи добавляют разделы внутрь `<main id="top">`; якоря цепочки стадий `#story-s1…#story-s6` (появятся в Task 8).

- [ ] **Step 1: Падающий тест**

`tests/hero.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('первый экран: заголовок, чертёж и паспорт стыка', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Сто тысяч стыков. У каждого — паспорт.');
  await expect(page.getByRole('img', { name: /Изометрия линии/ })).toBeVisible();
  const card = page.locator('[data-passport]');
  await expect(card).toContainText('Стык J-1029');
  await expect(card.getByRole('listitem')).toHaveCount(4);
  await expect(page.locator('[data-chain] a')).toHaveCount(6);
});

test('превью ссылки: абсолютный og:image и описание', async ({ page }) => {
  await page.goto('/');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/^https?:\/\/.+\/og\.png$/);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /стык/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('на телефоне паспорт под чертежом и нет горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.locator('[data-passport]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
```

Run: `npx playwright test tests/hero.spec.ts` — Expected: FAIL (нет `h1` с этим текстом).

- [ ] **Step 2: Шапка**

`src/components/ui/SiteHeader.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { nav: Landing['nav'] }
const { nav } = Astro.props;
---
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="hdr__logo" href="#top" aria-label="PipeQC — в начало"><span class="hdr__mark" aria-hidden="true"></span>PipeQC</a>
    <nav aria-label="Разделы страницы" class="hdr__nav">
      <ul>{nav.items.map((it) => <li><a href={it.href}>{it.label}</a></li>)}</ul>
    </nav>
    <a class="btn btn--ink" href="#contacts">{nav.contact}</a>
  </div>
</header>

<style>
  .hdr { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--paper) 88%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid #E6E3DA; }
  .hdr__in { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .hdr__logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: -.02em; color: var(--ink); text-decoration: none; }
  .hdr__mark { width: 20px; height: 20px; border: 2px solid var(--ink); border-radius: 50%; position: relative; box-sizing: border-box; }
  .hdr__mark::after { content: ''; position: absolute; inset: 3px; background: var(--done); border-radius: 50%; }
  .hdr__nav ul { display: flex; gap: 26px; list-style: none; margin: 0; padding: 0; }
  .hdr__nav a { color: var(--muted); text-decoration: none; font-size: 14px; }
  .hdr__nav a:hover { color: var(--ink); }
  @media (max-width: 899px) { .hdr__nav { display: none; } }
</style>
```

- [ ] **Step 3: Паспорт стыка**

`src/components/ui/PassportCard.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { passport: Landing['hero']['passport'] }
const { passport } = Astro.props;
---
<div class="pass" data-passport>
  <div class="pass__h"><b>{passport.title}</b><span class="pass__tag">{passport.tag}</span></div>
  <ul class="pass__rows">
    {passport.rows.map((r) => (
      <li class="pass__row">
        <span class:list={['pass__dot', { 'is-wait': !r.done }]} aria-hidden="true"></span>
        <span>{r.label} <small>· {r.meta}</small></span>
        <em>{r.date}</em>
      </li>
    ))}
  </ul>
</div>

<style>
  .pass { background: #fff; border-radius: 14px; border: 1px solid #E6E3DA; box-shadow: 0 1px 2px rgba(20,33,61,.05), 0 22px 50px -16px rgba(20,33,61,.3); padding: 12px 16px; }
  .pass__h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .pass__h b { font-size: 15px; }
  .pass__tag { font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #E3F4EF; color: var(--done); font-weight: 600; }
  .pass__rows { list-style: none; margin: 0; padding: 0; }
  .pass__row { display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; align-items: center; padding: 6px 0; border-top: 1px solid #F0EEE7; font-size: 13px; }
  .pass__row small { color: #8A93A3; font-size: 12px; }
  .pass__row em { font-style: normal; font-family: var(--font-mono); font-size: 11px; color: #8A93A3; }
  .pass__dot { width: 14px; height: 14px; border-radius: 50%; background: var(--done); position: relative; }
  .pass__dot::after { content: ''; position: absolute; left: 4.5px; top: 2.5px; width: 3.5px; height: 6.5px; border: solid #fff; border-width: 0 1.7px 1.7px 0; transform: rotate(45deg); }
  .pass__dot.is-wait { background: transparent; border: 1.6px solid #D3CFC3; box-sizing: border-box; }
  .pass__dot.is-wait::after { display: none; }
</style>
```

- [ ] **Step 4: Первый экран**

`src/components/sections/Hero.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import Drawing from '@/components/drawing/Drawing.astro';
import PassportCard from '@/components/ui/PassportCard.astro';
interface Props { hero: Landing['hero'] }
const { hero } = Astro.props;
---
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap hero__in">
    <div class="hero__copy">
      <p class="over">{hero.over}</p>
      <h1 id="hero-title" class="hero__h">{hero.line1}{' '}<br />{hero.line2Prefix}<span>{hero.line2Accent}</span></h1>
      <p class="hero__lead">{hero.lead}</p>
      <div class="hero__btns">
        <a class="btn btn--done" href="#construction">{hero.ctaPrimary}</a>
        <a class="btn btn--ghost" href="#status">{hero.ctaSecondary}</a>
      </div>
      <nav class="hero__chain" data-chain aria-label="Стадии">
        {hero.chain.map((c, i) => (
          <>
            {i > 0 && <i aria-hidden="true">→</i>}
            <a href={`#story-${c.step}`}>{c.label}</a>
          </>
        ))}
      </nav>
    </div>
    <div class="hero__art">
      <div class="hero__grid grid-paper" aria-hidden="true"></div>
      <Drawing state="hero" title={hero.drawingTitle} caption={hero.drawingCaption} leader class="hero__drawing" />
      <div class="hero__card"><PassportCard passport={hero.passport} /></div>
    </div>
  </div>
</section>

<style>
  .hero { padding-block: clamp(32px, 6vw, 72px) clamp(48px, 7vw, 96px); }
  .hero__in { display: grid; grid-template-columns: .9fr 1.1fr; gap: 32px; align-items: center; }
  .hero__h { font-size: clamp(38px, 5.4vw, 60px); line-height: 1.02; font-weight: 800; letter-spacing: -.035em; margin: 0 0 20px; }
  .hero__h span { color: var(--done); }
  .hero__lead { font-size: clamp(16px, 1.6vw, 18px); line-height: 1.5; color: var(--muted); max-width: 470px; margin: 0; }
  .hero__btns { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
  .hero__chain { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 40px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; }
  .hero__chain a { padding: 5px 8px; border: 1px solid #D9D5C9; border-radius: 6px; background: #fff; color: var(--muted); text-decoration: none; }
  .hero__chain a:hover { border-color: var(--done); color: var(--done); }
  .hero__chain i { font-style: normal; color: #A3A9B5; }
  .hero__art { position: relative; padding: 12px 8px 0; }
  .hero__grid { position: absolute; inset: -24px 0; -webkit-mask-image: radial-gradient(ellipse 85% 80% at 55% 45%, #000 50%, transparent 100%); mask-image: radial-gradient(ellipse 85% 80% at 55% 45%, #000 50%, transparent 100%); }
  .hero__art :global(.hero__drawing) { position: relative; }
  .hero__card { position: relative; width: min(340px, 100%); margin-left: calc(60.2% - 170px); }
  @media (max-width: 1023px) {
    .hero__in { grid-template-columns: 1fr; }
    .hero__card { margin-left: auto; margin-right: auto; }
  }
</style>
```

- [ ] **Step 5: Главная страница**

`src/pages/index.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
import SiteHeader from '@/components/ui/SiteHeader.astro';
import Hero from '@/components/sections/Hero.astro';
import { loadLanding } from '@/lib/content';

const landing = loadLanding();
---
<Base title={landing.meta.title} description={landing.meta.description} noindex>
  <SiteHeader nav={landing.nav} />
  <main id="top">
    <Hero hero={landing.hero} />
  </main>
</Base>
```

`tests/smoke.spec.ts` остаётся как есть: он проверяет `lang` и заголовок страницы.

- [ ] **Step 6: Тесты и визуальная сверка с макетом**

Run: `npx playwright test tests/hero.spec.ts tests/smoke.spec.ts`
Expected: 4 passed.

Визуальная сверка: запустить `npm run build && npm run preview` в фоне, затем
```bash
npx playwright screenshot --viewport-size=1280,900 http://127.0.0.1:4321/ /tmp/pipeqc-hero.png
```
Открыть снимок и сравнить с карточкой AC-2 в `mockup-hero-variants.html`: стык J-1029 выделен бирюзовым кольцом, от него вниз пунктирная выноска упирается в верх карточки паспорта; подписи на чертеже не налезают друг на друга. Остановить preview.

- [ ] **Step 7: Коммит**

```bash
git add -A && git commit -m "feat: header and hero with drawing linked to joint passport"
```

---

### Task 6: Раздел 01 «Как строят» и пояснения терминов

**Files:**
- Create: `src/components/ui/Rich.astro`, `src/components/ui/Glossary.astro`, `src/components/sections/Construction.astro`, `tests/construction.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `parseRich`, `Landing['construction' | 'terms']`.
- Produces: `<Rich text={string} />` — выводит текст, термины превращает в `<button class="term" popovertarget="term-<id>">`; `<Glossary terms={…} />` — один раз на странице, после `</main>`; карточки помечены `data-card`, анимируемые элементы — `data-reveal`.

- [ ] **Step 1: Падающий тест**

`tests/construction.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('раздел 01: три карточки и пояснение термина', async ({ page }) => {
  await page.goto('/');
  const sec = page.locator('#construction');
  await expect(sec.getByRole('heading', { level: 2 })).toHaveText('Речь о трубах внутри завода, а не о магистрали');
  await expect(sec.locator('[data-card]')).toHaveCount(3);
  await sec.getByRole('button', { name: 'изометрий' }).click();
  const pop = page.locator('#term-isometric');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Объёмный чертёж одной линии');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
});
```

Run: `npx playwright test tests/construction.spec.ts` — Expected: FAIL (`#construction` не найден).

- [ ] **Step 2: Компоненты терминов**

`src/components/ui/Rich.astro`:
```astro
---
import { parseRich } from '@/lib/rich';
interface Props { text: string }
const segments = parseRich(Astro.props.text);
---
{segments.map((s) => (s.kind === 'text' ? s.text : <button type="button" class="term" popovertarget={`term-${s.id}`}>{s.text}</button>))}
```

`src/components/ui/Glossary.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { terms: Landing['terms'] }
const { terms } = Astro.props;
---
<div class="glossary">
  {terms.map((t) => (
    <div id={`term-${t.id}`} popover class="term-pop" role="note">
      <p class="term-pop__t">{t.term}</p>
      <p class="term-pop__b">{t.body}</p>
      <button type="button" class="term-pop__x" popovertarget={`term-${t.id}`} popovertargetaction="hide" aria-label="Закрыть пояснение">×</button>
    </div>
  ))}
</div>

<style is:global>
  .term { font: inherit; color: inherit; background: none; border: 0; padding: 0; border-bottom: 1.5px dotted var(--done); cursor: help; }
  .dark .term { border-bottom-color: #5EEAD4; }
  .term-pop { position: fixed; inset: auto 16px 16px 16px; margin: 0 auto; max-width: 440px; border: 1px solid var(--line); border-radius: 14px; background: #fff; color: var(--ink); padding: 14px 44px 14px 16px; box-shadow: 0 24px 60px -18px rgba(20,33,61,.4); }
  .term-pop__t { font-weight: 700; margin: 0 0 4px; }
  .term-pop__b { margin: 0; font-size: 14px; line-height: 1.5; color: var(--muted); }
  .term-pop__x { position: absolute; top: 8px; right: 10px; border: 0; background: none; font-size: 22px; line-height: 1; color: var(--muted); cursor: pointer; }
</style>
```

- [ ] **Step 3: Раздел**

`src/components/sections/Construction.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import Rich from '@/components/ui/Rich.astro';
interface Props { s: Landing['construction'] }
const { s } = Astro.props;
---
<section id="construction" class="section">
  <div class="wrap">
    <p class="over">{s.over}</p>
    <h2 class="h2">{s.title}</h2>
    <p class="lead">{s.lead}</p>
    <div class="cards">
      {s.cards.map((c, i) => (
        <article class="card" data-card data-reveal style={`--d:${i * 100}ms`}>
          <p class="card__n">{String(i + 1).padStart(2, '0')}</p>
          <h3>{c.title}</h3>
          <p><Rich text={c.body} /></p>
        </article>
      ))}
    </div>
  </div>
</section>

<style>
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px; box-shadow: 0 14px 30px -22px rgba(20,33,61,.3); }
  .card__n { font-family: var(--font-mono); font-size: 11px; color: var(--done); letter-spacing: .1em; margin: 0 0 10px; }
  .card h3 { font-size: 19px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 8px; }
  .card p:last-child { margin: 0; font-size: 15px; line-height: 1.55; color: #2D3748; }
  @media (max-width: 899px) { .cards { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 4: Подключить на страницу**

В `src/pages/index.astro` добавить импорты `Construction` и `Glossary`; внутри `<main>` после `<Hero …/>` вставить `<Construction s={landing.construction} />`; после `</main>` вставить `<Glossary terms={landing.terms} />`.

- [ ] **Step 5: Тесты**

Run: `npx playwright test tests/construction.spec.ts && npm run check`
Expected: 1 passed; 0 errors.

- [ ] **Step 6: Коммит**

```bash
git add -A && git commit -m "feat: construction section and glossary popovers"
```

---

### Task 7: Раздел 02 «Путь трубы» — линия стадий (P-A)

**Files:**
- Create: `src/components/ui/StageIcon.astro`, `src/components/diagrams/StageLine.astro`, `src/components/sections/Journey.astro`, `tests/journey.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['journey']`.
- Produces: станции `[data-stage]`, первая с `data-external`; `StageIcon` с пропсом `name: 'iso' | 'spool' | 'shop' | 'nde' | 'site' | 'test'`.

- [ ] **Step 1: Падающий тест**

`tests/journey.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('раздел 02: шесть станций, первая приходит извне', async ({ page }) => {
  await page.goto('/');
  const st = page.locator('#journey [data-stage]');
  await expect(st).toHaveCount(6);
  await expect(st.nth(0)).toHaveAttribute('data-external', '');
  await expect(st.nth(3)).toContainText('Контроль NDE');
  await expect(st.nth(5)).toContainText('дальше пусконаладка');
});

test('на телефоне линия вертикальная и без прокрутки вбок', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const boxes = await page.locator('#journey [data-stage]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  expect(boxes[1]).toBeGreaterThan(boxes[0]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
```

Run: `npx playwright test tests/journey.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Пиктограммы**

`src/components/ui/StageIcon.astro` (рисунки перенесены из макета P-A):
```astro
---
interface Props { name: 'iso' | 'spool' | 'shop' | 'nde' | 'site' | 'test' }
const { name } = Astro.props;
---
<svg width="74" height="50" viewBox="0 0 74 50" fill="none" aria-hidden="true">
  {name === 'iso' && (<>
    <rect x="10" y="4" width="42" height="42" rx="2" stroke="#8A93A3" stroke-width="1.5" /><path d="M44 4 v8 h8" stroke="#8A93A3" stroke-width="1.5" />
    <path d="M16 36 l10 -6 v-10 l10 -6 l8 5" stroke="#14213D" stroke-width="2.2" stroke-linejoin="round" />
    <circle cx="26" cy="30" r="2" fill="#F6F4EE" stroke="#14213D" stroke-width="1.2" /><circle cx="36" cy="14" r="2" fill="#F6F4EE" stroke="#14213D" stroke-width="1.2" />
    <path d="M40 40 h8 M40 36 h8" stroke="#8A93A3" stroke-width="1.2" />
  </>)}
  {name === 'spool' && (<>
    <path d="M6 34 l18 -10" stroke="#0F766E" stroke-width="6" stroke-linecap="round" /><path d="M32 20 l18 -10" stroke="#0F766E" stroke-width="6" stroke-linecap="round" />
    <path d="M50 10 l16 9" stroke="#14213D" stroke-width="6" stroke-linecap="round" opacity=".25" />
    <circle cx="28" cy="22" r="5.5" stroke="#B45309" stroke-width="1.3" stroke-dasharray="2 2" />
  </>)}
  {name === 'shop' && (<>
    <rect x="6" y="20" width="26" height="12" rx="2" stroke="#14213D" stroke-width="1.6" /><rect x="40" y="20" width="26" height="12" rx="2" stroke="#14213D" stroke-width="1.6" />
    <path d="M33 18 v16 M36 18 v16 M39 18 v16" stroke="#0F766E" stroke-width="1.8" />
    <path d="M36 14 l-4 -6 M38 13 l3 -7 M40 15 l6 -4" stroke="#E07A1F" stroke-width="1.4" stroke-linecap="round" />
  </>)}
  {name === 'nde' && (<>
    <rect x="4" y="28" width="66" height="10" rx="2" stroke="#14213D" stroke-width="1.6" /><path d="M37 28 v10" stroke="#0F766E" stroke-width="3" />
    <path d="M27 18 q10 -8 20 0 M30 13 q7 -6 14 0 M33 8 q4 -3 8 0" stroke="#0F766E" stroke-width="1.5" stroke-linecap="round" />
    <rect x="31" y="40" width="12" height="7" rx="1" fill="#E7F3F1" stroke="#0F766E" stroke-width="1" />
  </>)}
  {name === 'site' && (<>
    <path d="M18 4 v14" stroke="#14213D" stroke-width="1.4" /><path d="M18 18 q0 5 4 5" stroke="#14213D" stroke-width="1.6" />
    <path d="M8 26 h36" stroke="#14213D" stroke-width="6" stroke-linecap="round" opacity=".85" /><path d="M44 26 h20" stroke="#14213D" stroke-width="6" stroke-linecap="round" opacity=".25" />
    <circle cx="44" cy="26" r="4" stroke="#E07A1F" stroke-width="1.4" stroke-dasharray="2 1.6" />
    <path d="M14 30 v14 M38 30 v14 M10 44 h8 M34 44 h8" stroke="#8A93A3" stroke-width="1.5" />
  </>)}
  {name === 'test' && (<>
    <path d="M4 38 h66" stroke="#14213D" stroke-width="6" stroke-linecap="round" opacity=".85" /><path d="M37 35 v-8" stroke="#14213D" stroke-width="2" />
    <circle cx="37" cy="17" r="11" fill="#fff" stroke="#14213D" stroke-width="1.6" /><path d="M37 17 l6 -5" stroke="#E07A1F" stroke-width="1.8" stroke-linecap="round" />
    <path d="M29 21 a9 9 0 0 1 16 -9" stroke="#0F766E" stroke-width="1.4" /><rect x="62" y="31" width="4" height="14" fill="#E07A1F" />
  </>)}
</svg>
```

- [ ] **Step 3: Линия стадий**

`src/components/diagrams/StageLine.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import StageIcon from '@/components/ui/StageIcon.astro';
interface Props { j: Landing['journey'] }
const { j } = Astro.props;
const last = j.stages.length - 1;
---
<ol class="metro">
  {j.stages.map((st, i) => (
    <li class:list={['st', { 'st--ext': st.external }]} data-stage data-external={st.external ? '' : undefined} data-reveal style={`--d:${i * 120}ms`}>
      <div class="st__rail" aria-hidden="true"><span class="st__node"></span></div>
      <div class="st__body">
        <p class="st__num">{st.num}</p>
        <h3 class="st__name">{st.name}</h3>
        <div class="st__box">
          <div class="st__pic"><StageIcon name={st.icon} /></div>
          <p class="st__what">{st.what}</p>
          <div class="st__rec">
            <p class="st__rec-l">{st.external ? j.externalLabel : j.recordsLabel}</p>
            <ul>{st.records.map((r) => <li>{r}</li>)}</ul>
          </div>
        </div>
        <p class="st__hand">
          {i === last ? <>{j.after} ⋯</> : <>{j.handoffPrefix} <b>{st.handoff}</b> →</>}
        </p>
      </div>
    </li>
  ))}
</ol>

<style>
  .metro { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
  .st__rail { position: relative; height: 34px; margin-bottom: 6px; }
  .st__rail::before { content: ''; position: absolute; left: -14px; right: 0; top: 16px; height: 3px; background: var(--ink); }
  .st:first-child .st__rail::before { left: 50%; }
  .st:last-child .st__rail::before { right: 50%; }
  .st:last-child .st__rail::after { content: ''; position: absolute; left: 50%; right: -16px; top: 16px; height: 3px; background: repeating-linear-gradient(90deg, #B8BFCB 0 6px, transparent 6px 11px); }
  .st__node { position: absolute; left: 50%; top: 6px; width: 23px; height: 23px; margin-left: -11.5px; border-radius: 50%; background: #fff; border: 3px solid var(--done); box-sizing: border-box; z-index: 1; }
  .st__node::after { content: ''; position: absolute; inset: 4px; background: var(--done); border-radius: 50%; }
  .st--ext .st__node { border-style: dashed; border-color: #8A93A3; }
  .st--ext .st__node::after { display: none; }
  .st__num { font-family: var(--font-mono); font-size: 10.5px; color: #8A93A3; text-align: center; letter-spacing: .08em; margin: 0; }
  .st__name { text-align: center; font-weight: 700; font-size: 16px; letter-spacing: -.01em; margin: 2px 0 12px; }
  .st__box { background: #fff; border: 1px solid #E6E3DA; border-radius: 14px; padding: 14px 14px 12px; box-shadow: 0 14px 30px -18px rgba(20,33,61,.25); height: 300px; box-sizing: border-box; display: flex; flex-direction: column; }
  .st--ext .st__box { background: transparent; border-style: dashed; box-shadow: none; }
  .st__pic { height: 64px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; background: #FAF9F5; border-radius: 10px; border: 1px solid #F0EDE4; }
  .st__what { font-size: 12.8px; line-height: 1.45; color: #2D3748; margin: 0; }
  .st__rec { margin-top: auto; padding-top: 10px; border-top: 1px solid #F0EDE4; }
  .st__rec-l { font-family: var(--font-mono); font-size: 9.5px; color: var(--done); letter-spacing: .1em; text-transform: uppercase; margin: 0 0 6px; }
  .st--ext .st__rec-l { color: #8A93A3; }
  .st__rec ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
  .st__rec li { font-family: var(--font-mono); font-size: 10px; padding: 3px 6px; border-radius: 5px; background: #EEF6F4; color: #0F5F58; }
  .st--ext .st__rec li { background: #EFEDE6; color: #5A6476; }
  .st__hand { font-family: var(--font-mono); font-size: 10px; color: #8A93A3; margin: 9px 0 0; text-align: center; }
  .st__hand b { color: #B45309; font-weight: 600; }
  @media (max-width: 1023px) {
    .metro { grid-template-columns: 1fr; gap: 0; }
    .st { display: grid; grid-template-columns: 34px 1fr; gap: 12px; }
    .st__rail { height: auto; margin: 0; }
    .st__rail::before, .st:first-child .st__rail::before, .st:last-child .st__rail::before { left: 16px; right: auto; top: 0; bottom: 0; width: 3px; height: auto; }
    .st:first-child .st__rail::before { top: 18px; }
    .st:last-child .st__rail::before { bottom: auto; height: 18px; }
    .st:last-child .st__rail::after { display: none; }
    .st__node { left: 17.5px; top: 6px; }
    .st__num, .st__name, .st__hand { text-align: left; }
    .st__box { height: auto; }
    .st__body { padding-bottom: 22px; }
  }
</style>
```

- [ ] **Step 4: Раздел и подключение**

`src/components/sections/Journey.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import StageLine from '@/components/diagrams/StageLine.astro';
interface Props { j: Landing['journey'] }
const { j } = Astro.props;
---
<section id="journey" class="section">
  <div class="wrap">
    <p class="over">{j.over}</p>
    <h2 class="h2">{j.title}</h2>
    <p class="lead">{j.lead}</p>
    <StageLine j={j} />
  </div>
</section>
```

В `index.astro` после `<Construction …/>` добавить `<Journey j={landing.journey} />` (с импортом).

- [ ] **Step 5: Тесты и визуальная сверка**

Run: `npx playwright test tests/journey.spec.ts`
Expected: 2 passed. Снять `npx playwright screenshot --viewport-size=1280,1200 http://127.0.0.1:4321/#journey /tmp/pipeqc-journey.png` при запущенном preview и сравнить с карточкой P-A в `mockup-diagrams.html`.

- [ ] **Step 6: Коммит**

```bash
git add -A && git commit -m "feat: journey stage line with vertical mobile layout"
```

---

### Task 8: Раздел 03 «Живой чертёж» (P-B)

**Files:**
- Create: `src/scripts/scroll-story.ts`, `src/components/sections/Story.astro`, `tests/story.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Drawing` (`state="s1"…"s6"`), `Rich`, `Landing['story']`.
- Produces: корень `[data-story]` с атрибутом `data-active="s1"…"s6"`; шаги `li#story-s1…#story-s6[data-step]`; слои `.story__layer[data-layer]`; `initScrollStory(root: HTMLElement): void`.

- [ ] **Step 1: Падающий тест**

`tests/story.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test.describe('без JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('каждый шаг показывает свой чертёж', async ({ page }) => {
    await page.goto('/');
    const inline = page.locator('#story .story__inline svg');
    await expect(inline).toHaveCount(6);
    for (const svg of await inline.all()) await expect(svg).toBeVisible();
  });
});

test('при прокрутке чертёж переключается на шаг «Контроль»', async ({ page }) => {
  await page.goto('/');
  await page.locator('#story-s4 h3').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(page.locator('[data-story]')).toHaveAttribute('data-active', 's4');
  const layer = page.locator('.story__layer[data-layer="s4"]');
  await expect(layer).toHaveCSS('opacity', '1');
  await expect(layer.locator('[data-joint="J-1029"]')).toHaveClass(/dw-joint--rejected/);
});

test('переход по ссылке сразу на шаг 5 показывает его состояние', async ({ page }) => {
  await page.goto('/#story-s5');
  await expect(page.locator('[data-story]')).toHaveAttribute('data-active', 's5');
});

test('на телефоне чертёж стоит в каждом шаге, закреплённой панели нет', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('#story-s2 .story__inline svg')).toBeVisible();
  await expect(page.locator('.story__stage')).toBeHidden();
});
```

Run: `npx playwright test tests/story.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Скрипт переключения**

`src/scripts/scroll-story.ts`:
```ts
export function initScrollStory(root: HTMLElement): void {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  if (!steps.length) return;
  const set = (id: string) => {
    root.dataset.active = id;
    root.querySelectorAll<HTMLElement>('[data-rail]').forEach((el) => {
      if (el.dataset.rail === id) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) set((e.target as HTMLElement).dataset.step!);
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  steps.forEach((s) => io.observe(s));
  const fromHash = steps.find((s) => `#${s.id}` === location.hash);
  set((fromHash ?? steps[0]).dataset.step!);
}
```

- [ ] **Step 3: Раздел**

`src/components/sections/Story.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import Drawing from '@/components/drawing/Drawing.astro';
import Rich from '@/components/ui/Rich.astro';
interface Props { s: Landing['story'] }
const { s } = Astro.props;
---
<section id="story" class="section">
  <div class="wrap">
    <p class="over">{s.over}</p>
    <h2 class="h2">{s.title}</h2>
    <p class="lead">{s.lead}</p>
  </div>
  <div class="wrap story" data-story data-active="s1">
    <div class="story__stage" aria-hidden="true">
      <ol class="story__rail">{s.steps.map((st) => <li data-rail={st.id}>{st.rail}</li>)}</ol>
      <div class="story__canvas grid-paper">
        {s.steps.map((st) => (
          <div class="story__layer" data-layer={st.id}><Drawing state={st.id} title={s.drawingTitle} /></div>
        ))}
      </div>
      <ul class="story__legend">{s.legend.map((l) => <li><i class={`lg lg--${l.kind}`}></i>{l.label}</li>)}</ul>
    </div>
    <ol class="story__steps">
      {s.steps.map((st, i) => (
        <li id={`story-${st.id}`} class="story__step" data-step={st.id}>
          <p class="over">{String(i + 1).padStart(2, '0')} · {st.rail}</p>
          <h3>{st.title}</h3>
          <p class="story__body"><Rich text={st.body} /></p>
          <div class="story__inline grid-paper"><Drawing state={st.id} title={`${s.drawingTitle}: ${st.rail}`} /></div>
          <p class="story__note"><b>{s.noteLabel}.</b> <Rich text={st.note} /></p>
        </li>
      ))}
    </ol>
  </div>
</section>

<script>
  import { initScrollStory } from '@/scripts/scroll-story';
  document.querySelectorAll<HTMLElement>('[data-story]').forEach(initScrollStory);
</script>

<style>
  .story__stage { display: none; }
  .story__steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 40px; }
  .story__step h3 { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; letter-spacing: -.025em; line-height: 1.15; margin: 0 0 12px; }
  .story__body { font-size: 16px; line-height: 1.6; color: var(--muted); margin: 0 0 16px; }
  .story__inline { --dw-bg: #fff; background-color: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 10px; margin-bottom: 14px; }
  .story__note { font-size: 14px; line-height: 1.55; background: #FFF7ED; border: 1px solid #FBD9B5; color: #7C3A0A; border-radius: 12px; padding: 12px 14px; margin: 0; }
  .story__canvas { --dw-bg: #fff; position: relative; aspect-ratio: 640 / 330; border-radius: 16px; border: 1px solid var(--line); background-color: #fff; }
  .story__layer { position: absolute; inset: 14px; opacity: 0; transition: opacity .45s ease; }
  .story[data-active="s1"] .story__layer[data-layer="s1"],
  .story[data-active="s2"] .story__layer[data-layer="s2"],
  .story[data-active="s3"] .story__layer[data-layer="s3"],
  .story[data-active="s4"] .story__layer[data-layer="s4"],
  .story[data-active="s5"] .story__layer[data-layer="s5"],
  .story[data-active="s6"] .story__layer[data-layer="s6"] { opacity: 1; }
  .story__rail { list-style: none; margin: 0 0 12px; padding: 0; display: flex; gap: 6px; flex-wrap: wrap; font-size: 12.5px; }
  .story__rail li { padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line); color: #8A93A3; background: #fff; }
  .story__rail li[aria-current] { border-color: var(--done); color: var(--done); font-weight: 700; }
  .story__legend { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 14px; font-family: var(--font-mono); font-size: 10.5px; color: var(--muted); }
  .lg { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: -2px; }
  .lg--done { background: var(--done); border-radius: 3px; }
  .lg--work { background: var(--work); border-radius: 3px; }
  .lg--accepted { background: var(--done); }
  .lg--rejected { border: 2px solid var(--alert); box-sizing: border-box; }
  .lg--tracer { border: 1.6px dashed var(--done); box-sizing: border-box; }
  @media (min-width: 1024px) {
    :global(html.js) .story { display: grid; grid-template-columns: 1.25fr 1fr; gap: 48px; align-items: start; }
    :global(html.js) .story__stage { display: block; position: sticky; top: 96px; }
    :global(html.js) .story__inline { display: none; }
    :global(html.js) .story__steps { gap: 0; }
    :global(html.js) .story__step { min-height: 78vh; display: flex; flex-direction: column; justify-content: center; }
  }
</style>
```

В `index.astro` после `<Journey …/>` добавить `<Story s={landing.story} />` (с импортом).

- [ ] **Step 4: Тесты**

Run: `npx playwright test tests/story.spec.ts`
Expected: 4 passed.

- [ ] **Step 5: Визуальная сверка**

При запущенном preview снять `npx playwright screenshot --viewport-size=1280,900 "http://127.0.0.1:4321/#story-s4" /tmp/pipeqc-story.png` и сравнить с карточкой P-B в `mockup-diagrams.html`: брак J-1029 кирпичным крестом, T1 и T2 пунктирными кольцами, подписи читаются.

- [ ] **Step 6: Коммит**

```bash
git add -A && git commit -m "feat: scroll story with pinned drawing and no-JS fallback"
```

---

### Task 9: Раздел 04 «Зачем» — схема участников

**Files:**
- Create: `src/components/diagrams/LanesDiagram.astro`, `src/components/sections/Why.astro`, `tests/why.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['why']`.
- Produces: `svg[data-diagram="lanes"]` (≥ 900px) и `[data-diagram-mobile="lanes"]` (< 900px); боли `[data-pain]`.

- [ ] **Step 1: Падающий тест**

`tests/why.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('десктоп: схема участников и четыре боли', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('#why svg[data-diagram="lanes"]');
  await expect(svg).toBeVisible();
  await expect(svg).toContainText('Проектный офис');
  await expect(svg).toContainText('✕ брак · звонок');
  await expect(page.locator('#why [data-diagram-mobile="lanes"]')).toBeHidden();
  await expect(page.locator('#why [data-pain]')).toHaveCount(4);
});

test('телефон: вместо SVG — список', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.locator('#why svg[data-diagram="lanes"]')).toBeHidden();
  await expect(page.locator('#why [data-diagram-mobile="lanes"]')).toContainText('Лаборатория NDE → Цех');
});
```

Run: `npx playwright test tests/why.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Схема**

`src/components/diagrams/LanesDiagram.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { why: Landing['why'] }
const { why } = Astro.props;
const LANE_Y = [92, 156, 220, 284, 348];
// Передачи между дорожками: откуда, куда, где стоит линия, потерялись ли данные, плашка [x, y, ширина].
const FLOWS = [
  { from: 0, to: 1, x: 262, lost: false, pill: [214, 113, 96] },
  { from: 1, to: 2, x: 370, lost: false, pill: [318, 177, 104] },
  { from: 2, to: 1, x: 478, lost: true, pill: [430, 177, 96] },
  { from: 1, to: 3, x: 574, lost: false, pill: [508, 241, 132] },
  { from: 3, to: 4, x: 640, lost: true, pill: [586, 305, 100] },
] as const;
const OUT_FROM = [130, 220, 310];
const OUT_Y = [110, 220, 330];
---
<svg class="lanes" data-diagram="lanes" viewBox="0 0 1240 420" role="img" aria-label={`${why.todayLabel}. ${why.withLabel}.`} fill="none">
  <defs>
    <marker id="lanes-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4A5568" /></marker>
    <marker id="lanes-ahr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#C2410C" /></marker>
    <marker id="lanes-aht" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0F766E" /></marker>
  </defs>
  {[0, 2, 4].map((i) => <rect x="0" y={LANE_Y[i] - 32} width="1240" height="64" fill="#14213D" opacity=".025" />)}
  {[60, 124, 188, 252, 316, 380].map((y) => <line x1="0" y1={y} x2="1240" y2={y} stroke="#E3DFD4" />)}
  {why.lanes.map((lane, i) => <text x="8" y={LANE_Y[i] + 5} font-size="13.5" font-weight="600" fill="#14213D">{lane}</text>)}
  <line x1="692" y1="20" x2="692" y2="400" stroke="#14213D" stroke-dasharray="2 4" opacity=".35" />
  <text class="m" x="170" y="36" font-size="11" letter-spacing="1.4" fill="#8A93A3">{why.todayLabel}</text>
  <text class="m" x="716" y="36" font-size="11" letter-spacing="1.4" fill="#0F766E">{why.withLabel}</text>
  {why.files.map((f, i) => (
    <g transform={`translate(176 ${LANE_Y[i] - 16})`}>
      <path d="M0 0 h18 l8 8 v24 h-26 z" fill="#fff" stroke="#8A93A3" stroke-width="1.3" />
      <path d="M18 0 v8 h8" stroke="#8A93A3" stroke-width="1.3" />
      <text class="m" x="13" y="25" font-size="7" fill="#4A5568" text-anchor="middle">{f}</text>
    </g>
  ))}
  {FLOWS.map((fl, i) => {
    const down = fl.to > fl.from;
    const y1 = LANE_Y[fl.from] + (down ? 8 : -8);
    const y2 = LANE_Y[fl.to] + (down ? -10 : 10);
    const [px, py, pw] = fl.pill;
    return (
      <g>
        <circle cx={fl.x} cy={LANE_Y[fl.from]} r="4" fill={fl.lost ? '#C2410C' : '#14213D'} />
        <path d={`M${fl.x} ${y1} V${y2}`} stroke={fl.lost ? '#C2410C' : '#4A5568'} stroke-width={fl.lost ? 1.7 : 1.5} stroke-dasharray="5 4" marker-end={`url(#${fl.lost ? 'lanes-ahr' : 'lanes-ah'})`} />
        <rect x={px} y={py} width={pw} height="20" rx="6" fill={fl.lost ? '#FFF1E6' : '#fff'} stroke={fl.lost ? '#F4B183' : '#D9D5C9'} />
        <text class="m" x={px + pw / 2} y={py + 14} font-size="10" text-anchor="middle" fill={fl.lost ? '#C2410C' : '#4A5568'} font-weight={fl.lost ? 600 : 400}>{fl.lost ? `✕ ${why.handoffs[i]}` : why.handoffs[i]}</text>
      </g>
    );
  })}
  <text class="m" x="176" y="404" font-size="10.5" fill="#C2410C">{why.lossNote}</text>
  <rect x="944" y="66" width="56" height="308" rx="14" fill="#0F766E" />
  <text class="m" x="972" y="226" font-size="11" fill="#fff" text-anchor="middle" letter-spacing="1.5" transform="rotate(-90 972 222)">{why.baseLabel}</text>
  {why.writes.map((w, i) => (
    <g>
      <circle cx="720" cy={LANE_Y[i]} r="6" fill="#14213D" />
      <path d={`M728 ${LANE_Y[i]} H940`} stroke="#0F766E" stroke-width="2" marker-end="url(#lanes-aht)" />
      <rect x="756" y={LANE_Y[i] - 12} width="150" height="24" rx="6" fill="#F6F4EE" />
      <text x="766" y={LANE_Y[i] + 4} font-size="12.5" fill="#14213D">{w}</text>
    </g>
  ))}
  {why.outputs.map((o, i) => (
    <g>
      <path d={`M1002 ${OUT_FROM[i]} C 1026 ${OUT_FROM[i]}, 1022 ${OUT_Y[i]}, 1044 ${OUT_Y[i]}`} stroke="#0F766E" stroke-width="1.6" marker-end="url(#lanes-aht)" />
      <rect x="1048" y={OUT_Y[i] - 20} width="186" height="40" rx="10" fill="#fff" stroke="#E3DFD4" />
      <text x="1062" y={OUT_Y[i] + 5} font-size="13" font-weight="600" fill="#14213D">{o}</text>
    </g>
  ))}
</svg>

<div class="lanes-m" data-diagram-mobile="lanes">
  <p class="lanes-m__h">{why.todayLabel}</p>
  <ul class="lanes-m__list">
    {FLOWS.map((fl, i) => (
      <li class:list={{ 'is-lost': fl.lost }}>{why.lanes[fl.from]} → {why.lanes[fl.to]}: {fl.lost ? '✕ ' : ''}{why.handoffs[i]}</li>
    ))}
  </ul>
  <p class="lanes-m__loss">{why.lossNote}</p>
  <p class="lanes-m__h lanes-m__h--with">{why.withLabel}</p>
  <ul class="lanes-m__list">{why.lanes.map((lane, i) => <li><b>{lane}</b> → {why.writes[i]}</li>)}</ul>
  <ul class="lanes-m__out">{why.outputs.map((o) => <li>{o}</li>)}</ul>
</div>

<style>
  .lanes { width: 100%; height: auto; display: block; }
  .lanes text { font-family: var(--font-sans); }
  .lanes .m { font-family: var(--font-mono); }
  .lanes-m { display: none; }
  .lanes-m__h { font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; color: #8A93A3; margin: 0 0 8px; }
  .lanes-m__h--with { color: var(--done); margin-top: 20px; }
  .lanes-m__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 14px; }
  .lanes-m__list li { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
  .lanes-m__list li.is-lost { background: #FFF1E6; border-color: #F4B183; color: var(--alert); }
  .lanes-m__loss { font-size: 13px; color: var(--alert); margin: 8px 0 0; }
  .lanes-m__out { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .lanes-m__out li { background: var(--done); color: #fff; border-radius: 8px; padding: 6px 10px; font-size: 13px; font-weight: 600; }
  @media (max-width: 899px) { .lanes { display: none; } .lanes-m { display: block; } }
</style>
```

- [ ] **Step 3: Раздел**

`src/components/sections/Why.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import LanesDiagram from '@/components/diagrams/LanesDiagram.astro';
interface Props { why: Landing['why'] }
const { why } = Astro.props;
---
<section id="why" class="section dark">
  <div class="wrap">
    <p class="over">{why.over}</p>
    <h2 class="h2">{why.title}</h2>
    <p class="lead">{why.lead}</p>
    <div class="sheet" data-reveal><LanesDiagram why={why} /></div>
    <div class="pains">
      {why.pains.map((p, i) => (
        <article class="pain" data-pain data-reveal style={`--d:${i * 100}ms`}>
          <h3>{p.title}</h3>
          <p>{p.body}</p>
        </article>
      ))}
    </div>
  </div>
</section>

<style>
  .pains { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 24px; }
  .pain { border: 1px solid #2C3D60; border-radius: 14px; padding: 18px; background: #1A2A4A; }
  .pain h3 { font-size: 16px; font-weight: 700; margin: 0 0 8px; color: #fff; }
  .pain p { font-size: 14px; line-height: 1.5; margin: 0; color: #AEB9CC; }
  @media (max-width: 1023px) { .pains { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 599px) { .pains { grid-template-columns: 1fr; } }
</style>
```

В `index.astro` после `<Story …/>` добавить `<Why why={landing.why} />` (с импортом).

- [ ] **Step 4: Тесты и сверка с макетом**

Run: `npx playwright test tests/why.spec.ts`
Expected: 2 passed. Сравнить снимок `#why` на 1280px с карточкой «Зачем» в `mockup-diagrams.html`.

- [ ] **Step 5: Коммит**

```bash
git add -A && git commit -m "feat: why section with participant lanes diagram and pains"
```

---

### Task 10: Раздел 05 «Модули» — карта программы

Макета нет; языки схем — как у 2a–2c. Карта — HTML/CSS-сетка (адаптивна сама), не SVG.

**Files:**
- Create: `src/components/diagrams/ModuleMap.astro`, `src/components/sections/Modules.astro`, `tests/modules.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Rich`, `Landing['modules']`.
- Produces: `[data-diagram="modules"]`; модули `[data-module]` (атрибут — код модуля); шаги в планах `.mm__step.is-planned`; замки `.mm__gate`.

- [ ] **Step 1: Падающий тест**

`tests/modules.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('карта модулей: поток, полосы и статусы', async ({ page }) => {
  await page.goto('/');
  const map = page.locator('#modules [data-diagram="modules"]');
  for (const code of ['SPOOLING', 'FABRICATION', 'ERECTION', 'TEST PACK', 'TRACKING', 'NDE', 'REPORTS']) {
    await expect(map.locator(`[data-module="${code}"]`)).toBeVisible();
  }
  await expect(map.locator('.mm__gate')).toHaveCount(4);
  await expect(map.locator('.mm__step.is-planned')).toContainText('в планах');
  await expect(map.locator('[data-module="TRACKING"]')).toContainText('частично');
});

test('на телефоне карта в одну колонку без прокрутки вбок', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const tops = await page.locator('#modules [data-module]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(tops.length);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
```

Run: `npx playwright test tests/modules.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Карта**

`src/components/diagrams/ModuleMap.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import Rich from '@/components/ui/Rich.astro';
interface Props { m: Landing['modules'] }
const { m } = Astro.props;
const AREAS = ['spool', 'fab', 'erect', 'test'] as const;
---
<div class="mm" data-diagram="modules">
  <section class="mm__setup mm__band" data-module={m.setup.code}>
    <p class="mm__code">{m.setup.code}</p>
    <h3 class="mm__title">{m.setup.title} <span class="mm__note">— {m.setup.note}</span></h3>
    <ul class="mm__chips">{m.setup.chips.map((c) => <li>{c}</li>)}</ul>
  </section>

  {m.flow.map((mod, i) => (
    <article class={`mm__mod mm__mod--${AREAS[i]}`} data-module={mod.code} data-reveal style={`--d:${i * 100}ms`}>
      <p class="mm__code">{mod.code} <span class={`mm__status mm__status--${mod.status}`}>{m.labels[mod.status]}</span></p>
      <h3 class="mm__title">{mod.title}</h3>
      <p class="mm__roles"><span>{m.labels.roles}:</span> {mod.roles}</p>
      <ol class="mm__steps">
        {mod.steps.map((st) => (
          <li class:list={['mm__step', { 'is-planned': st.planned }]}>
            <Rich text={st.text} />
            {st.planned && <span class="mm__status mm__status--planned">{m.labels.planned}</span>}
          </li>
        ))}
      </ol>
      <p class="mm__gate"><span class="mm__gate-l">{m.labels.gate}</span>{mod.gate}</p>
      {mod.handoff && <p class="mm__handoff">{m.labels.handoff} <b>{mod.handoff}</b> →</p>}
    </article>
  ))}

  <div class="mm__arrow mm__arrow--a1" aria-hidden="true"></div>
  <div class="mm__arrow mm__arrow--a2" aria-hidden="true"></div>

  <aside class="mm__track" data-module={m.tracking.code}>
    <p class="mm__code">{m.tracking.code}</p>
    <p class="mm__track-t">{m.tracking.title}</p>
    <p class="mm__track-b">{m.tracking.body}</p>
    <span class={`mm__status mm__status--${m.tracking.status}`}>{m.labels[m.tracking.status]}</span>
  </aside>

  <section class="mm__nde mm__band" data-module={m.nde.code}>
    <p class="mm__code">{m.nde.code} <span class={`mm__status mm__status--${m.nde.status}`}>{m.labels[m.nde.status]}</span></p>
    <h3 class="mm__title">{m.nde.title} <span class="mm__note">· {m.nde.roles} · {m.nde.up}</span></h3>
    <ol class="mm__chain">{m.nde.steps.map((s) => <li>{s}</li>)}</ol>
  </section>

  <section class="mm__reports mm__band" data-module={m.reports.code}>
    <p class="mm__code">{m.reports.code} <span class={`mm__status mm__status--${m.reports.status}`}>{m.labels[m.reports.status]}</span></p>
    <h3 class="mm__title">{m.reports.title}</h3>
    <ul class="mm__chips">{m.reports.chips.map((c) => <li>{c}</li>)}</ul>
  </section>
</div>

<style>
  .mm { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "setup" "spool" "a1" "fab" "nde" "track" "erect" "a2" "test" "reports"; }
  @media (min-width: 1100px) {
    .mm { grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr) 104px minmax(0, 1fr) 24px minmax(0, 1fr); column-gap: 10px; row-gap: 18px;
      grid-template-areas:
        "setup setup setup setup setup setup setup"
        "spool a1 fab track erect a2 test"
        ". . nde nde nde . ."
        "reports reports reports reports reports reports reports"; }
  }
  .mm__setup { grid-area: setup; } .mm__mod--spool { grid-area: spool; } .mm__mod--fab { grid-area: fab; }
  .mm__mod--erect { grid-area: erect; } .mm__mod--test { grid-area: test; } .mm__track { grid-area: track; }
  .mm__nde { grid-area: nde; } .mm__reports { grid-area: reports; } .mm__arrow--a1 { grid-area: a1; } .mm__arrow--a2 { grid-area: a2; }
  .mm__band { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; }
  .mm__setup { background: var(--ink); color: #E8EEF6; border-color: var(--ink); }
  .mm__setup .mm__code { color: #5EEAD4; }
  .mm__setup .mm__note { color: #AEB9CC; }
  .mm__setup .mm__chips li { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.18); color: #E8EEF6; }
  .mm__mod { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 14px 30px -20px rgba(20,33,61,.3); }
  .mm__code { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; color: var(--done); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0; }
  .mm__title { font-size: 19px; font-weight: 800; letter-spacing: -.02em; margin: 0; }
  .mm__note { font-weight: 400; font-size: 14px; color: var(--muted); letter-spacing: 0; }
  .mm__roles { font-size: 12.5px; color: var(--muted); margin: 0; }
  .mm__roles span { font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
  .mm__steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .mm__step { position: relative; padding-left: 20px; font-size: 13.5px; line-height: 1.4; }
  .mm__step::before { content: ''; position: absolute; left: 0; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--done); }
  .mm__step.is-planned { color: var(--muted); }
  .mm__step.is-planned::before { background: transparent; border: 1.5px dashed #8A93A3; box-sizing: border-box; }
  .mm__gate { margin: auto 0 0; font-size: 12.5px; line-height: 1.45; background: #FFF8F1; border: 1px solid #F4B183; border-radius: 10px; padding: 10px 12px; }
  .mm__gate-l { display: block; font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #B45309; margin-bottom: 4px; }
  .mm__handoff { font-family: var(--font-mono); font-size: 10.5px; color: #8A93A3; margin: 0; }
  .mm__handoff b { color: #B45309; font-weight: 600; }
  .mm__status { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .04em; text-transform: none; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
  .mm__status--works { background: #E3F4EF; color: var(--done); }
  .mm__status--partial { background: #FFF1E6; color: #B45309; }
  .mm__status--planned { border: 1px dashed #A3A9B5; color: #6B778A; margin-left: 6px; }
  .mm__chips { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .mm__chips li { font-size: 12.5px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); }
  .mm__arrow { display: flex; align-items: center; justify-content: center; min-height: 20px; }
  .mm__arrow::after { content: '↓'; font-size: 20px; color: var(--done); }
  .mm__track { border: 1.5px dashed #C9C3B5; border-radius: 16px; padding: 14px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; background: rgba(255,255,255,.5); }
  .mm__track p { margin: 0; }
  .mm__track-t { font-weight: 700; font-size: 13px; }
  .mm__track-b { font-size: 11.5px; color: var(--muted); }
  .mm__nde { background: #EEF6F4; border-color: #BFE0DA; position: relative; }
  .mm__chain { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .mm__chain li { font-size: 13px; background: #fff; border: 1px solid #BFE0DA; border-radius: 8px; padding: 5px 10px; }
  .mm__chain li:not(:last-child)::after { content: ' →'; color: var(--done); }
  @media (min-width: 1100px) {
    .mm__arrow::after { content: '→'; }
    .mm__nde::before { content: '↑ ↓'; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 14px; color: var(--done); letter-spacing: .4em; }
  }
</style>
```

- [ ] **Step 3: Раздел и подключение**

`src/components/sections/Modules.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import ModuleMap from '@/components/diagrams/ModuleMap.astro';
interface Props { m: Landing['modules'] }
const { m } = Astro.props;
---
<section id="modules" class="section">
  <div class="wrap">
    <p class="over">{m.over}</p>
    <h2 class="h2">{m.title}</h2>
    <p class="lead">{m.lead}</p>
    <ModuleMap m={m} />
  </div>
</section>
```

В `index.astro` после `<Why …/>` добавить `<Modules m={landing.modules} />` (с импортом).

- [ ] **Step 4: Тесты и визуальная проверка**

Run: `npx playwright test tests/modules.spec.ts`
Expected: 2 passed. Снять раздел на 1280 и 360 px и показать владельцу как новый раздел без макета: просмотреть, что полоса NDE стоит под цехом, Tracking и площадкой, стрелки направлены по потоку, статусы «частично» и «в планах» отличимы.

- [ ] **Step 5: Коммит**

```bash
git add -A && git commit -m "feat: module map section showing the end-to-end flow"
```

---

### Task 11: Раздел 06 «Как работает» — допуск сварщика и каскад брака

**Files:**
- Create: `src/components/ui/WelderGuardCard.astro`, `src/components/diagrams/CascadeDiagram.astro`, `src/components/sections/How.astro`, `tests/how.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['how']`.
- Produces: `[data-guard-card]` с опциями `[role="option"]`, заблокированная — `aria-disabled="true"`; `svg[data-diagram="cascade"]` и `[data-diagram-mobile="cascade"]`.

- [ ] **Step 1: Падающий тест**

`tests/how.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('сварщик с истёкшим допуском заблокирован', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#how [data-guard-card]');
  await expect(card.getByRole('option', { name: /WLD-22/ })).toHaveAttribute('aria-disabled', 'true');
  await expect(card.getByRole('status')).toContainText('Запись не примется');
});

test('каскад брака на десктопе', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('#how svg[data-diagram="cascade"]');
  await expect(svg).toBeVisible();
  for (const text of ['R1', 'T1', 'T2', 'Сварщик на 100% контроль', 'R2, если не прошёл R1']) await expect(svg).toContainText(text);
});

test('каскад брака на телефоне — карточками', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.locator('#how svg[data-diagram="cascade"]')).toBeHidden();
  await expect(page.locator('#how [data-diagram-mobile="cascade"]')).toContainText('Два трассера');
});
```

Run: `npx playwright test tests/how.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Карточка допуска**

`src/components/ui/WelderGuardCard.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { card: Landing['how']['guard']['card'] }
const { card } = Astro.props;
---
<div class="wg" data-guard-card>
  <p class="wg__head">{card.joint}</p>
  <p class="wg__label">{card.field}</p>
  <div class="wg__select" aria-hidden="true">{card.options[0].code}<span>▾</span></div>
  <ul class="wg__list" role="listbox" aria-label={card.field}>
    {card.options.map((o, i) => (
      <li role="option" aria-selected={i === 0 ? 'true' : 'false'} aria-disabled={o.ok ? undefined : 'true'} class:list={['wg__opt', { 'is-blocked': !o.ok }]}>
        <b>{o.code}</b><span>{o.meta}</span><i aria-hidden="true">{o.ok ? '✓' : '×'}</i>
      </li>
    ))}
  </ul>
  <p class="wg__msg" role="status">{card.message}</p>
</div>

<style>
  .wg { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; box-shadow: 0 22px 50px -18px rgba(20,33,61,.3); max-width: 420px; }
  .wg__head { font-weight: 700; margin: 0 0 12px; }
  .wg__label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #8A93A3; margin: 0 0 6px; }
  .wg__select { display: flex; justify-content: space-between; border: 1.5px solid var(--done); border-radius: 10px; padding: 9px 12px; font-weight: 600; }
  .wg__list { list-style: none; margin: 6px 0 0; padding: 6px; border: 1px solid var(--line); border-radius: 10px; display: grid; gap: 2px; }
  .wg__opt { display: grid; grid-template-columns: 64px 1fr 16px; gap: 8px; align-items: center; padding: 8px; border-radius: 8px; font-size: 13.5px; }
  .wg__opt[aria-selected="true"] { background: #EEF6F4; }
  .wg__opt span { color: var(--muted); font-size: 12.5px; }
  .wg__opt i { font-style: normal; color: var(--done); font-weight: 700; }
  .wg__opt.is-blocked { color: #A3A9B5; background: repeating-linear-gradient(135deg, #FAF9F5 0 6px, #F3F1EA 6px 12px); }
  .wg__opt.is-blocked b { text-decoration: line-through; }
  .wg__opt.is-blocked i { color: var(--alert); }
  .wg__msg { margin: 10px 0 0; font-size: 13px; color: var(--alert); background: #FFF1E6; border: 1px solid #F4B183; border-radius: 10px; padding: 9px 12px; }
</style>
```

- [ ] **Step 3: Схема каскада**

`src/components/diagrams/CascadeDiagram.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { c: Landing['how']['cascade'] }
const { c } = Astro.props;
---
<svg class="cascade" data-diagram="cascade" viewBox="0 0 1240 360" role="img" aria-label={c.title} fill="none">
  <defs><marker id="cascade-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0F766E" /></marker></defs>
  <rect x="10" y="96" width="300" height="170" rx="16" fill="#fff" stroke="#E3DFD4" />
  <text class="m" x="30" y="126" font-size="10.5" letter-spacing="1.3" fill="#8A93A3">{c.input.label}</text>
  <text x="30" y="160" font-size="22" font-weight="800" fill="#14213D">{c.input.joint}</text>
  <rect x="30" y="176" width="104" height="26" rx="7" fill="#FFF1E6" stroke="#F4B183" />
  <text x="42" y="194" font-size="13" font-weight="600" fill="#C2410C">{c.input.status}</text>
  <text x="30" y="226" font-size="13" fill="#4A5568">{c.input.defect}</text>
  <text class="m" x="30" y="248" font-size="10" fill="#8A93A3">{c.input.note}</text>
  <path d="M312 181 H372" stroke="#0F766E" stroke-width="2" marker-end="url(#cascade-ah)" />
  <rect x="378" y="146" width="124" height="70" rx="35" fill="#0F766E" />
  <text x="440" y="176" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">{c.node.title}</text>
  <text class="m" x="440" y="196" font-size="10" fill="#BFE6DF" text-anchor="middle">{c.node.sub}</text>
  <g stroke="#0F766E" stroke-width="2">
    <path d="M502 170 C 548 170, 540 66, 590 66" marker-end="url(#cascade-ah)" />
    <path d="M502 181 H588" marker-end="url(#cascade-ah)" />
  </g>
  <path d="M502 194 C 548 194, 540 296, 590 296" stroke="#E07A1F" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#cascade-ah)" />
  <rect x="596" y="26" width="330" height="82" rx="14" fill="#fff" stroke="#E3DFD4" />
  <rect x="614" y="44" width="38" height="24" rx="6" fill="#0F766E" />
  <text class="m" x="633" y="61" font-size="12" font-weight="600" fill="#fff" text-anchor="middle">{c.repair.tag}</text>
  <text x="664" y="61" font-size="15" font-weight="700" fill="#14213D">{c.repair.title}</text>
  <text x="614" y="90" font-size="12.5" fill="#4A5568">{c.repair.body}</text>
  <path d="M926 67 H966" stroke="#8A93A3" stroke-width="1.4" stroke-dasharray="4 3" />
  <rect x="970" y="40" width="250" height="56" rx="12" fill="#F6F4EE" stroke="#D9D5C9" stroke-dasharray="4 3" />
  <text x="986" y="63" font-size="12.5" fill="#14213D">{c.repair2.title}</text>
  <text class="m" x="986" y="82" font-size="10" fill="#8A93A3">{c.repair2.note}</text>
  <rect x="596" y="140" width="330" height="82" rx="14" fill="#fff" stroke="#E3DFD4" />
  {c.tracers.tags.map((tag, i) => (
    <g>
      <rect x={614 + i * 44} y="158" width="38" height="24" rx="6" fill="#fff" stroke="#0F766E" stroke-width="1.5" stroke-dasharray="3 2" />
      <text class="m" x={633 + i * 44} y="175" font-size="12" font-weight="600" fill="#0F766E" text-anchor="middle">{tag}</text>
    </g>
  ))}
  <text x="708" y="175" font-size="15" font-weight="700" fill="#14213D">{c.tracers.title}</text>
  <text x="614" y="204" font-size="12.5" fill="#4A5568">{c.tracers.body}</text>
  <rect x="596" y="254" width="330" height="96" rx="14" fill="#FFF8F1" stroke="#F4B183" stroke-dasharray="6 4" />
  <text class="m" x="614" y="282" font-size="9.5" letter-spacing=".4" fill="#B45309">{c.penalty.condition}</text>
  <text x="614" y="308" font-size="15" font-weight="700" fill="#14213D">{c.penalty.title}</text>
  <text x="614" y="330" font-size="12.5" fill="#4A5568">{c.penalty.body}</text>
  <rect x="970" y="150" width="250" height="196" rx="14" fill="#14213D" />
  <text class="m" x="990" y="180" font-size="10" letter-spacing="1.2" fill="#8FB5AC">{c.aside.label}</text>
  <foreignObject x="990" y="192" width="214" height="146">
    <p xmlns="http://www.w3.org/1999/xhtml" class="cascade__aside">{c.aside.text}</p>
  </foreignObject>
</svg>

<div class="cascade-m" data-diagram-mobile="cascade">
  <div class="cm cm--in"><p class="cm__l">{c.input.label}</p><p class="cm__t">{c.input.joint} · <span>{c.input.status}</span></p><p>{c.input.defect}</p><p class="cm__n">{c.input.note}</p></div>
  <p class="cm__node">↓ {c.node.title} {c.node.sub} ↓</p>
  <div class="cm"><p class="cm__t">{c.repair.tag} · {c.repair.title}</p><p>{c.repair.body}</p><p class="cm__n">{c.repair2.title}; {c.repair2.note}</p></div>
  <div class="cm"><p class="cm__t">{c.tracers.tags.join(' · ')} · {c.tracers.title}</p><p>{c.tracers.body}</p></div>
  <div class="cm cm--warn"><p class="cm__l">{c.penalty.condition}</p><p class="cm__t">{c.penalty.title}</p><p>{c.penalty.body}</p></div>
  <div class="cm cm--dark"><p class="cm__l">{c.aside.label}</p><p>{c.aside.text}</p></div>
</div>

<style>
  .cascade { width: 100%; height: auto; display: block; }
  .cascade text { font-family: var(--font-sans); }
  .cascade .m { font-family: var(--font-mono); }
  .cascade__aside { margin: 0; color: #E8EEF6; font: 14px/1.45 var(--font-sans); }
  .cascade-m { display: none; }
  .cm { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; font-size: 14px; }
  .cm p { margin: 0 0 4px; } .cm p:last-child { margin: 0; }
  .cm__l { font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; color: #8A93A3; }
  .cm__t { font-weight: 700; } .cm__t span { color: var(--alert); }
  .cm__n { font-size: 12.5px; color: #8A93A3; }
  .cm--warn { background: #FFF8F1; border: 1px dashed #F4B183; } .cm--warn .cm__l { color: #B45309; }
  .cm--dark { background: var(--ink); color: #E8EEF6; border-color: var(--ink); }
  .cm__node { text-align: center; font-weight: 700; color: var(--done); margin: 0 0 10px; }
  @media (max-width: 899px) { .cascade { display: none; } .cascade-m { display: block; } }
</style>
```

- [ ] **Step 4: Раздел**

`src/components/sections/How.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import WelderGuardCard from '@/components/ui/WelderGuardCard.astro';
import CascadeDiagram from '@/components/diagrams/CascadeDiagram.astro';
interface Props { h: Landing['how'] }
const { h } = Astro.props;
---
<section id="how" class="section">
  <div class="wrap">
    <p class="over">{h.over}</p>
    <h2 class="h2">{h.title}</h2>
    <p class="lead">{h.lead}</p>
    <div class="guard" data-reveal>
      <div><h3>{h.guard.title}</h3><p>{h.guard.body}</p></div>
      <WelderGuardCard card={h.guard.card} />
    </div>
    <h3 class="sub">{h.cascade.title}</h3>
    <p class="lead">{h.cascade.lead}</p>
    <div class="sheet grid-paper" data-reveal><CascadeDiagram c={h.cascade} /></div>
  </div>
</section>

<style>
  .guard { display: grid; grid-template-columns: 1fr 420px; gap: 40px; align-items: center; margin-bottom: 64px; }
  .guard h3, .sub { font-size: clamp(22px, 2.4vw, 28px); font-weight: 800; letter-spacing: -.025em; margin: 0 0 12px; }
  .guard p { font-size: 16px; line-height: 1.6; color: var(--muted); margin: 0; max-width: 560px; }
  @media (max-width: 899px) { .guard { grid-template-columns: 1fr; } }
</style>
```

В `index.astro` после `<Modules …/>` добавить `<How h={landing.how} />` (с импортом).

- [ ] **Step 5: Тесты и сверка**

Run: `npx playwright test tests/how.spec.ts`
Expected: 3 passed. Сравнить каскад на 1280px с карточкой «Как работает» в `mockup-diagrams.html`.

- [ ] **Step 6: Коммит**

```bash
git add -A && git commit -m "feat: how section with welder guard card and reject cascade"
```

---

### Task 12: Раздел 07 «Чем помогает» — готовность и доступ

**Files:**
- Create: `src/components/diagrams/GatesDiagram.astro`, `src/components/sections/Helps.astro`, `tests/helps.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['helps']`.
- Produces: `svg[data-diagram="gates"]` с группами `[data-condition="ok"|"blocking"]` и `[data-reason]`; `[data-diagram-mobile="gates"]`; роли `[data-role]`.

- [ ] **Step 1: Падающий тест**

`tests/helps.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('восемь условий, два держат пакет', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('#helps svg[data-diagram="gates"]');
  await expect(svg.locator('[data-condition]')).toHaveCount(8);
  await expect(svg.locator('[data-condition="blocking"]')).toHaveCount(2);
  await expect(svg.locator('[data-reason]')).toHaveCount(2);
  await expect(svg).toContainText('Не готов');
  await expect(page.locator('#helps [data-role]')).toHaveCount(3);
});

test('на телефоне — список условий', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.locator('#helps svg[data-diagram="gates"]')).toBeHidden();
  await expect(page.locator('#helps [data-diagram-mobile="gates"] li')).toHaveCount(8 + 2);
});
```

Run: `npx playwright test tests/helps.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Схема готовности**

`src/components/diagrams/GatesDiagram.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { h: Landing['helps'] }
const { h } = Astro.props;
const rowY = (i: number) => 18 + i * 46;
---
<svg class="gates" data-diagram="gates" viewBox="0 0 1240 400" role="img" aria-label={`${h.result.label}: ${h.result.status}`} fill="none">
  <defs><marker id="gates-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#14213D" /></marker></defs>
  {h.conditions.map((c, i) => {
    const y = rowY(i);
    const cy = y + 18;
    return (
      <g data-condition={c.ok ? 'ok' : 'blocking'}>
        <path d={`M380 ${cy} C 500 ${cy}, 520 198, 600 198`} stroke={c.ok ? '#0F766E' : '#E07A1F'} stroke-width={c.ok ? 1.6 : 2.4} opacity={c.ok ? 0.55 : 1} />
        <rect x="10" y={y} width="370" height="36" rx="10" fill={c.ok ? '#fff' : '#FFF8F1'} stroke={c.ok ? '#E3DFD4' : '#F4B183'} />
        <circle cx="30" cy={cy} r="8" fill={c.ok ? '#0F766E' : '#E07A1F'} />
        {c.ok
          ? <path d={`M26.5 ${cy} l2.5 2.5 l4.5 -5`} stroke="#fff" stroke-width="1.8" />
          : <text x="30" y={cy + 4.5} font-size="12" font-weight="800" fill="#fff" text-anchor="middle">!</text>}
        <text x="48" y={cy + 5} font-size="13.5" fill="#14213D">{c.label}</text>
        <text class="m" x="366" y={cy + 5} font-size="11.5" fill={c.ok ? '#8A93A3' : '#C2410C'} text-anchor="end">{c.value}</text>
      </g>
    );
  })}
  <g transform="translate(650 198)">
    <rect x="-48" y="-48" width="96" height="96" rx="18" transform="rotate(45)" fill="#fff" stroke="#14213D" stroke-width="2" />
    <text y="-4" font-size="12.5" font-weight="700" fill="#14213D" text-anchor="middle">{h.gate[0]}</text>
    <text y="13" font-size="12.5" font-weight="700" fill="#14213D" text-anchor="middle">{h.gate[1]}</text>
  </g>
  <path d="M720 198 H770" stroke="#14213D" stroke-width="2" marker-end="url(#gates-ah)" />
  <rect x="776" y="70" width="450" height="256" rx="18" fill="#fff" stroke="#E3DFD4" />
  <text class="m" x="800" y="104" font-size="10.5" letter-spacing="1.3" fill="#8A93A3">{h.result.label}</text>
  <text x="800" y="144" font-size="30" font-weight="800" fill="#C2410C" letter-spacing="-0.6">{h.result.status}<tspan font-size="15" font-weight="400" fill="#4A5568" dx="12">{h.result.count}</tspan></text>
  <line x1="800" y1="164" x2="1202" y2="164" stroke="#F0EDE4" />
  {h.result.reasons.map((r, i) => (
    <g data-reason>
      <circle cx="808" cy={190 + i * 34} r="5" fill="#E07A1F" />
      <text x="824" y={195 + i * 34} font-size="14" fill="#14213D"><tspan font-weight="700">{r.code}</tspan>{' '}{r.text}</text>
      <text class="m" x="1202" y={195 + i * 34} font-size="11" fill="#8A93A3" text-anchor="end">{r.owner}</text>
    </g>
  ))}
  <line x1="800" y1="254" x2="1202" y2="254" stroke="#F0EDE4" />
  <text x="800" y="282" font-size="12.5" fill="#4A5568">{h.result.foot[0]}</text>
  <text x="800" y="302" font-size="12.5" fill="#4A5568">{h.result.foot[1]}</text>
</svg>

<div class="gates-m" data-diagram-mobile="gates">
  <ul class="gates-m__list">
    {h.conditions.map((c) => <li class:list={{ 'is-block': !c.ok }}><span>{c.ok ? '✓' : '!'}</span>{c.label}<em>{c.value}</em></li>)}
  </ul>
  <div class="gates-m__res">
    <p class="gates-m__l">{h.result.label}</p>
    <p class="gates-m__s">{h.result.status} <small>{h.result.count}</small></p>
    <ul class="gates-m__list">{h.result.reasons.map((r) => <li class="is-block"><b>{r.code}</b>&nbsp;{r.text}<em>{r.owner}</em></li>)}</ul>
  </div>
</div>

<style>
  .gates { width: 100%; height: auto; display: block; }
  .gates text { font-family: var(--font-sans); }
  .gates .m { font-family: var(--font-mono); }
  .gates-m { display: none; }
  .gates-m__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .gates-m__list li { display: grid; grid-template-columns: 20px 1fr auto; gap: 8px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 14px; }
  .gates-m__list li span { color: var(--done); font-weight: 800; }
  .gates-m__list li em { font-style: normal; font-family: var(--font-mono); font-size: 11px; color: #8A93A3; }
  .gates-m__list li.is-block { background: #FFF8F1; border-color: #F4B183; }
  .gates-m__list li.is-block span, .gates-m__list li.is-block em { color: var(--alert); }
  .gates-m__res { margin-top: 14px; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .gates-m__l { font-family: var(--font-mono); font-size: 10px; color: #8A93A3; letter-spacing: .08em; margin: 0; }
  .gates-m__s { font-size: 24px; font-weight: 800; color: var(--alert); margin: 4px 0 10px; }
  .gates-m__s small { font-size: 14px; font-weight: 400; color: var(--muted); }
  @media (max-width: 899px) { .gates { display: none; } .gates-m { display: block; } }
</style>
```

- [ ] **Step 3: Раздел**

`src/components/sections/Helps.astro`:
```astro
---
import type { Landing } from '@/content/schema';
import GatesDiagram from '@/components/diagrams/GatesDiagram.astro';
interface Props { h: Landing['helps'] }
const { h } = Astro.props;
---
<section id="helps" class="section">
  <div class="wrap">
    <p class="over">{h.over}</p>
    <h2 class="h2">{h.title}</h2>
    <p class="lead">{h.lead}</p>
    <div class="sheet" data-reveal><GatesDiagram h={h} /></div>
    <div class="access" data-reveal>
      <div><h3>{h.access.title}</h3><p>{h.access.body}</p></div>
      <ul>{h.access.roles.map((r) => <li data-role><b>{r.name}</b><span>{r.scope}</span></li>)}</ul>
    </div>
  </div>
</section>

<style>
  .access { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; align-items: start; }
  .access h3 { font-size: 22px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 10px; }
  .access p { color: var(--muted); line-height: 1.6; margin: 0; }
  .access ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .access li { display: flex; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: 14px; }
  .access li span { color: var(--muted); text-align: right; }
  @media (max-width: 899px) { .access { grid-template-columns: 1fr; } }
</style>
```

В `index.astro` после `<How …/>` добавить `<Helps h={landing.helps} />` (с импортом).

- [ ] **Step 4: Тесты**

Run: `npx playwright test tests/helps.spec.ts`
Expected: 2 passed.

- [ ] **Step 5: Коммит**

```bash
git add -A && git commit -m "feat: helps section with readiness gates and access roles"
```

---

### Task 13: Раздел 08 «Это настоящий продукт» — скриншоты

**Files:**
- Create: `scripts/prepare-screens.mjs`, `scripts/prepare-screens.test.mjs`, `src/scripts/lightbox.ts`, `src/components/sections/Proof.astro`, `public/screens/*.webp`, `tests/proof.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['proof']`.
- Produces: `convertScreen(src: string, dest: string, width?: number): Promise<sharp.Metadata>`; ссылки `a[data-lightbox]`; `dialog#lightbox`; `initLightbox(dialog: HTMLDialogElement): void`.

- [ ] **Step 1: Падающий тест конвертации**

`scripts/prepare-screens.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { convertScreen } from './prepare-screens.mjs';

describe('convertScreen', () => {
  it('ужимает кадр стенда до 1600px в WebP', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'screens-'));
    const src = path.join(dir, 'in.png');
    await sharp({ create: { width: 3840, height: 2160, channels: 3, background: '#ffffff' } }).png().toFile(src);
    const meta = await convertScreen(src, path.join(dir, 'out', 'shot.webp'));
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(900);
  });
});
```

Run: `npx vitest run scripts/prepare-screens.test.mjs` — Expected: FAIL.

- [ ] **Step 2: Конвертер**

`scripts/prepare-screens.mjs`:
```js
// PNG со стенда PipeQC → public/screens/<имя>.webp шириной 1600px.
// Запуск: node scripts/prepare-screens.mjs <png> <имя> [<png> <имя> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function convertScreen(src, dest, width = 1600) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 86 }).toFile(dest);
  return sharp(dest).metadata();
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (!args.length || args.length % 2) {
    console.error('Использование: node scripts/prepare-screens.mjs <png> <имя> [<png> <имя> ...]');
    process.exit(1);
  }
  for (let i = 0; i < args.length; i += 2) {
    const dest = path.resolve('public/screens', `${args[i + 1]}.webp`);
    const meta = await convertScreen(path.resolve(args[i]), dest);
    console.log(`${path.relative(process.cwd(), dest)} — ${meta.width}×${meta.height}`);
  }
}
```

Run: `npx vitest run scripts/prepare-screens.test.mjs` — Expected: 1 passed.

- [ ] **Step 3: Снять кадры со стенда (нужно согласие владельца)**

Спросить владельца: «Для скриншотов нужно пересобрать локальный стенд PipeQC — это сбросит локальную базу (`demo:prepare`). Запускать?». Только после «да», в репозитории PipeQC:

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npm run demo:prepare -- --confirm-local-reset
npm run verify
npm run demo:showcase
npm run deck:cascade
npm run dev   # в отдельном терминале или в фоне; дождаться готовности
npm run deck:screens
```

Скрипты сами читают `.env.local`; значения не печатать и не передавать в команде. Кадры появятся в `docs/presentations/deck-screens/`.

- [ ] **Step 4: Проверить кадры глазами и сконвертировать**

Открыть `13-nde-cascade.png`, `18-testpack-explorer.png`, `06-fabrication-dashboard.png`. На каждом не должно быть Technip, Easy Piping, названий реальных проектов, сырых UUID, экрана входа. Если кадр не годится — показать владельцу и выбрать другой из той же папки, поправив `proof.shots` в YAML. Затем в `pipeqc-site`:

```bash
P=/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/docs/presentations/deck-screens
npm run screens -- $P/13-nde-cascade.png nde-cascade $P/18-testpack-explorer.png testpack-readiness $P/06-fabrication-dashboard.png fabrication-dashboard
```
Expected: три строки `public/screens/<имя>.webp — 1600×900`.

- [ ] **Step 5: Падающий браузерный тест**

`tests/proof.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('три скриншота грузятся и подписаны', async ({ page }) => {
  await page.goto('/');
  const imgs = page.locator('#proof img');
  await expect(imgs).toHaveCount(3);
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator('#proof figcaption').first()).toContainText('данные вымышлены');
});

test('скриншот открывается на весь экран и закрывается', async ({ page }) => {
  await page.goto('/');
  await page.locator('#proof a[data-lightbox]').first().click();
  await expect(page.locator('dialog#lightbox')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#lightbox')).not.toHaveAttribute('open', '');
});
```

Run: `npx playwright test tests/proof.spec.ts` — Expected: FAIL (`#proof` нет).

- [ ] **Step 6: Лайтбокс и раздел**

`src/scripts/lightbox.ts`:
```ts
export function initLightbox(dialog: HTMLDialogElement): void {
  const img = dialog.querySelector('img');
  if (!img) return;
  document.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      img.src = a.href;
      img.alt = a.querySelector('img')?.alt ?? '';
      dialog.showModal();
    });
  });
  dialog.addEventListener('click', () => dialog.close());
}
```

`src/components/sections/Proof.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { p: Landing['proof'] }
const { p } = Astro.props;
---
<section id="proof" class="section dark">
  <div class="wrap">
    <p class="over">{p.over}</p>
    <h2 class="h2">{p.title}</h2>
    <p class="lead">{p.lead}</p>
    <div class="shots">
      {p.shots.map((s, i) => (
        <figure class="shot" data-reveal style={`--d:${i * 120}ms`}>
          <a href={s.file} data-lightbox aria-label={`${s.title}. ${p.open}`}>
            <img src={s.file} alt={s.alt} width="1600" height="900" loading="lazy" decoding="async" />
          </a>
          <figcaption><b>{s.title}</b><span>{p.caption}</span></figcaption>
        </figure>
      ))}
    </div>
  </div>
  <dialog id="lightbox" class="lightbox"><img alt="" /></dialog>
</section>

<script>
  import { initLightbox } from '@/scripts/lightbox';
  const d = document.getElementById('lightbox');
  if (d instanceof HTMLDialogElement) initLightbox(d);
</script>

<style>
  .shots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .shot { margin: 0; }
  .shot a { display: block; border-radius: 12px; overflow: hidden; border: 1px solid #2C3D60; box-shadow: 0 30px 60px -30px rgba(0,0,0,.6); }
  .shot img { display: block; width: 100%; height: auto; }
  .shot figcaption { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; font-size: 14px; }
  .shot figcaption span { font-family: var(--font-mono); font-size: 10.5px; color: #8FA0B8; }
  .lightbox { border: 0; padding: 0; background: transparent; max-width: min(1600px, 96vw); }
  .lightbox::backdrop { background: rgba(5, 10, 20, .85); }
  .lightbox img { display: block; width: 100%; height: auto; border-radius: 10px; }
  @media (max-width: 899px) { .shots { grid-template-columns: 1fr; } }
</style>
```

В `index.astro` после `<Helps …/>` добавить `<Proof p={landing.proof} />` (с импортом).

- [ ] **Step 7: Тесты**

Run: `npx playwright test tests/proof.spec.ts && npm run copy:check`
Expected: 2 passed; проверка текстов пройдена.

- [ ] **Step 8: Коммит**

```bash
git add -A && git commit -m "feat: proof section with stand screenshots and lightbox"
```

---

### Task 14: Разделы 09–10, подвал и картинка превью

**Files:**
- Create: `src/components/sections/Status.astro`, `src/components/sections/Contacts.astro`, `src/components/ui/SiteFooter.astro`, `src/pages/og-card.astro`, `scripts/gen-og.mjs`, `public/og.png`, `tests/closing.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Landing['status' | 'contacts' | 'footer' | 'hero' | 'meta']`, `Drawing`.
- Produces: `#status`, `#contacts`; `/og.png` 1200×630.

- [ ] **Step 1: Падающий тест**

`tests/closing.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('что готово: две колонки', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status [data-col="now"] li')).toHaveCount(6);
  await expect(page.locator('#status [data-col="next"] li')).toHaveCount(3);
});

test('контакты: почта и Telegram — ссылкой, если заполнены, иначе видна заглушка', async ({ page }) => {
  await page.goto('/');
  const c = page.locator('#contacts');
  await expect(c).toContainText('Почта');
  await expect(c).toContainText('Telegram');
  const mail = c.locator('[data-contact="email"]');
  const text = (await mail.textContent()) ?? '';
  if (text.startsWith('[')) await expect(mail.locator('a')).toHaveCount(0);
  else await expect(mail.locator('a')).toHaveAttribute('href', /^mailto:/);
});

test('картинка превью отдаётся', async ({ request }) => {
  const res = await request.get('/og.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});
```

Run: `npx playwright test tests/closing.spec.ts` — Expected: FAIL.

- [ ] **Step 2: Разделы**

`src/components/sections/Status.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { s: Landing['status'] }
const { s } = Astro.props;
---
<section id="status" class="section">
  <div class="wrap">
    <p class="over">{s.over}</p>
    <h2 class="h2">{s.title}</h2>
    <p class="lead">{s.lead}</p>
    <div class="cols">
      <div class="col col--now" data-col="now" data-reveal><h3>{s.now.title}</h3><ul>{s.now.items.map((i) => <li>{i}</li>)}</ul></div>
      <div class="col col--next" data-col="next" data-reveal><h3>{s.next.title}</h3><ul>{s.next.items.map((i) => <li>{i}</li>)}</ul></div>
    </div>
  </div>
</section>

<style>
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .col { border-radius: 16px; padding: 22px; }
  .col--now { background: #EEF6F4; border: 1px solid #BFE0DA; }
  .col--next { background: var(--paper); border: 1.5px dashed #D3CFC3; }
  .col h3 { font-size: 18px; font-weight: 800; margin: 0 0 12px; }
  .col--now h3 { color: var(--done); }
  .col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .col li { position: relative; padding-left: 22px; line-height: 1.45; font-size: 15px; }
  .col--now li::before { content: '✓'; position: absolute; left: 0; color: var(--done); font-weight: 800; }
  .col--next li::before { content: '○'; position: absolute; left: 0; color: #8A93A3; }
  @media (max-width: 899px) { .cols { grid-template-columns: 1fr; } }
</style>
```

`src/components/sections/Contacts.astro`:
```astro
---
import type { Landing } from '@/content/schema';
interface Props { c: Landing['contacts'] }
const { c } = Astro.props;
const filled = (v: string) => !v.startsWith('[');
const tgHref = (v: string) => `https://t.me/${v.replace(/^@/, '')}`;
---
<section id="contacts" class="section dark">
  <div class="wrap contacts">
    <div>
      <p class="over">{c.over}</p>
      <h2 class="h2">{c.title}</h2>
      <p class="lead">{c.lead}</p>
      <p class="team">{c.team}</p>
    </div>
    <dl class="ways">
      <div data-contact="email"><dt>{c.emailLabel}</dt><dd>{filled(c.email) ? <a href={`mailto:${c.email}`}>{c.email}</a> : c.email}</dd></div>
      <div data-contact="telegram"><dt>{c.telegramLabel}</dt><dd>{filled(c.telegram) ? <a href={tgHref(c.telegram)}>{c.telegram}</a> : c.telegram}</dd></div>
    </dl>
  </div>
</section>

<style>
  .contacts { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: end; }
  .team { color: #E8EEF6; font-size: 16px; line-height: 1.6; margin: 0; }
  .ways { margin: 0; display: grid; gap: 12px; }
  .ways div { border: 1px solid #2C3D60; border-radius: 14px; padding: 16px 18px; background: #1A2A4A; }
  .ways dt { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #5EEAD4; margin-bottom: 4px; }
  .ways dd { margin: 0; font-size: 18px; font-weight: 600; }
  .ways a { color: #fff; }
  @media (max-width: 899px) { .contacts { grid-template-columns: 1fr; } }
</style>
```

`src/components/ui/SiteFooter.astro`:
```astro
---
interface Props { note: string }
---
<footer class="ftr"><div class="wrap">{Astro.props.note}</div></footer>
<style>
  .ftr { background: var(--ink); color: #8FA0B8; border-top: 1px solid #2C3D60; padding: 20px 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: .06em; }
</style>
```

В `index.astro`: внутри `<main>` после `<Proof …/>` добавить `<Status s={landing.status} />` и `<Contacts c={landing.contacts} />`; после `</main>` и перед `<Glossary …/>` добавить `<SiteFooter note={landing.footer.note} />` (с импортами).

- [ ] **Step 3: Страница-источник превью и генератор**

`src/pages/og-card.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
import Drawing from '@/components/drawing/Drawing.astro';
import { loadLanding } from '@/lib/content';
const { hero, meta } = loadLanding();
---
<Base title={meta.title} description={meta.description} noindex>
  <div class="og">
    <div class="og__copy">
      <p class="over">{hero.over}</p>
      <p class="og__h">{hero.line1}<br />{hero.line2Prefix}<span>{hero.line2Accent}</span></p>
      <p class="og__brand"><i aria-hidden="true"></i>PipeQC</p>
    </div>
    <div class="og__draw grid-paper"><Drawing state="hero" title={hero.drawingTitle} caption={hero.drawingCaption} /></div>
  </div>
</Base>

<style>
  .og { width: 1200px; height: 630px; display: grid; grid-template-columns: 500px 1fr; background: var(--paper); overflow: hidden; }
  .og__copy { padding: 72px 0 56px 64px; display: flex; flex-direction: column; }
  .og__h { font-size: 58px; line-height: 1.02; font-weight: 800; letter-spacing: -.035em; margin: 0; }
  .og__h span { color: var(--done); }
  .og__brand { margin-top: auto; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 24px; }
  .og__brand i { width: 22px; height: 22px; border: 2.5px solid var(--ink); border-radius: 50%; position: relative; box-sizing: border-box; }
  .og__brand i::after { content: ''; position: absolute; inset: 3.5px; background: var(--done); border-radius: 50%; }
  .og__draw { display: flex; align-items: center; padding: 24px 40px 24px 8px; }
</style>
```

`scripts/gen-og.mjs`:
```js
// Снимает /og-card/ в public/og.png. Нужен запущенный `npm run preview`.
import { chromium } from '@playwright/test';

const base = process.env.OG_BASE_URL ?? 'http://127.0.0.1:4321';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${base}/og-card/`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png готов');
```

- [ ] **Step 4: Сгенерировать превью**

```bash
npm run build && (npm run preview > /tmp/pipeqc-preview.log 2>&1 &) && sleep 4 && npm run og; pkill -f "astro preview"
```
Expected: «public/og.png готов». Открыть `public/og.png`: заголовок в две строки, справа чертёж, ничего не обрезано.

- [ ] **Step 5: Тесты**

Run: `npx playwright test tests/closing.spec.ts`
Expected: 3 passed.

- [ ] **Step 6: Коммит**

```bash
git add -A && git commit -m "feat: status, contacts, footer and link preview image"
```

---

### Task 15: Появление при прокрутке, reduced-motion и проверки всей страницы

**Files:**
- Create: `src/scripts/reveal.ts`, `tests/page.spec.ts`
- Modify: `src/styles/global.css` (добавить блок в конец), `src/layouts/Base.astro` (подключить скрипт)

**Interfaces:**
- Consumes: атрибуты `data-reveal` и `style="--d:…"`, расставленные в Task 6–14.
- Produces: класс `.is-visible` на элементах `[data-reveal]`.

- [ ] **Step 1: Падающие тесты**

`tests/page.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const SECTIONS = ['construction', 'journey', 'story', 'why', 'modules', 'how', 'helps', 'proof', 'status', 'contacts'];

test('все якорные ссылки ведут на существующие элементы', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  for (const h of new Set(hrefs)) expect(await page.locator(h).count(), `якорь ${h}`).toBe(1);
});

for (const width of [360, 768, 1280]) {
  test(`нет горизонтальной прокрутки на ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test.describe('без JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('видны все разделы и анимируемые элементы', async ({ page }) => {
    await page.goto('/');
    for (const id of SECTIONS) await expect(page.locator(`#${id} h2`)).toBeVisible();
    for (const el of await page.locator('[data-reveal]').all()) await expect(el).toHaveCSS('opacity', '1');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('элементы видны сразу, переходов нет', async ({ page }) => {
    await page.goto('/');
    const el = page.locator('[data-reveal]').first();
    await expect(el).toHaveCSS('opacity', '1');
    await expect(el).toHaveCSS('transition-duration', '0s');
  });
});

test('с JavaScript элемент появляется при прокрутке', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#status [data-col="now"]');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-visible/);
  await expect(card).toHaveCSS('opacity', '1');
});
```

Run: `npx playwright test tests/page.spec.ts` — Expected: FAIL на последнем тесте (класса `is-visible` нет).

- [ ] **Step 2: Скрипт и стили**

`src/scripts/reveal.ts`:
```ts
export function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  els.forEach((el) => io.observe(el));
}
```

В конец `src/layouts/Base.astro` перед `</body>` добавить:
```astro
    <script>
      import { initReveal } from '@/scripts/reveal';
      initReveal();
    </script>
```

В конец `src/styles/global.css`:
```css
html.js [data-reveal] { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease; transition-delay: var(--d, 0ms); }
html.js [data-reveal].is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  html.js [data-reveal] { opacity: 1; transform: none; }
}
```

- [ ] **Step 3: Полный прогон**

Run: `npm run verify`
Expected: проверка текстов пройдена; `astro check` — 0 errors; все юнит-тесты и все Playwright-тесты зелёные.

- [ ] **Step 4: Снимки всей страницы для владельца**

При запущенном preview:
```bash
npx playwright screenshot --full-page --viewport-size=1280,900 http://127.0.0.1:4321/ /tmp/pipeqc-1280.png
npx playwright screenshot --full-page --viewport-size=375,812 http://127.0.0.1:4321/ /tmp/pipeqc-375.png
```
Элементы `data-reveal` ниже первого экрана на таких снимках могут быть ещё прозрачными: снимки проверяют раскладку, а не анимацию. Просмотреть оба на наложения и обрезанные подписи.

- [ ] **Step 5: Коммит**

```bash
git add -A && git commit -m "feat: reveal-on-scroll with reduced-motion and page-wide checks"
```

---

### Task 16: Сверка фактов с кодом и деплой на Vercel

**Files:**
- Create: `docs/fact-check.md` (в `pipeqc-site`)
- Modify: `src/content/landing.ru.yaml` (только если факт не подтвердился)

**Interfaces:**
- Consumes: всё готовое.
- Produces: адрес превью на Vercel; таблица сверки.

- [ ] **Step 1: Сверить утверждения о продукте**

Для каждого утверждения ниже найти подтверждение в репозитории PipeQC (`/Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout`) и записать в `docs/fact-check.md` строку `| утверждение | файл:строка | подтверждено / исправлено на … |`. Уже подтверждённые спецификацией (каскад R1/R2/трассеры, NDE100 при 4 браках или браке T2, допуск сварщика и WPS, выпуск катушки, RFT, готовность пакета, недоделки X, порядок испытания, RESTRICTIVE-изоляция зоны) — перепроверить тем же `grep`, код мог измениться. Обязательно проверить:

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
grep -n "defect_rework_code_id is null" supabase/migrations/*.sql                         # «без кода дефекта запись не принимается»
grep -ln "paint\|laydown" supabase/migrations/*.sql | head                                # покраска и склад в цеху
grep -n -i "conflict" supabase/migrations/*import*.sql | head                             # «новая ревизия не затирает прогресс»
grep -n -i "readiness\|is_ready\|not ready" supabase/migrations/20260813095000_pressure_test_workflow.sql | head   # «пакет не допускают к испытанию»
grep -n -i "heat\|pml\|material_list" supabase/migrations/*material_check*.sql | head     # «проверка материала по номеру плавки»
grep -rn "project_manager" supabase/migrations/*.sql | grep -i "policy\|capab" | head      # область роли «Руководитель проекта»
```

Правило: если запрет не найден в коде, переписать фразу так, чтобы она говорила только то, что подтверждено (например, гейт Test Pack → «PipeQC показывает все условия готовности и называет, что держит испытание»), и отметить это в таблице.

- [ ] **Step 2: Повторный прогон после правок текста**

Run: `npm run verify`
Expected: всё зелёное.

- [ ] **Step 3: Контакты**

Попросить владельца прислать две строки о команде, почту и Telegram и вписать их в `contacts` в YAML. До этого `npm run release:check` падает — это ожидаемо, и ссылку инвестору отправлять нельзя.

- [ ] **Step 4: Превью на Vercel**

Если CLI не авторизован, попросить владельца выполнить в сессии `! npx vercel@latest login`. Затем:
```bash
npx vercel@latest link --yes
npx vercel@latest deploy --yes
```
Expected: адрес вида `https://pipeqc-site-<hash>.vercel.app`.

- [ ] **Step 5: Задать SITE_URL и проверить превью ссылки**

Узнать постоянный адрес проекта (`npx vercel@latest project ls` или из вывода деплоя), например `https://pipeqc-site.vercel.app`, и задать:
```bash
printf '%s' 'https://pipeqc-site.vercel.app' | npx vercel@latest env add SITE_URL production
printf '%s' 'https://pipeqc-site.vercel.app' | npx vercel@latest env add SITE_URL preview
npx vercel@latest deploy --prod --yes
curl -s https://pipeqc-site.vercel.app/ | grep -o 'og:image" content="[^"]*'
```
Expected: `og:image" content="https://pipeqc-site.vercel.app/og.png` — без `127.0.0.1`. Если там локальный адрес — переменная не применилась, повторить деплой.

- [ ] **Step 6: Финальная проверка перед отправкой**

Run: `npm run release:check`
Expected: «Проверка текстов пройдена (режим публикации)». Только после этого адрес можно отдавать владельцу для отправки.

- [ ] **Step 7: Коммит**

```bash
git add -A && git commit -m "docs: fact check against PipeQC code; content corrections"
```
