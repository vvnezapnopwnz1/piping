# PipeQC

Система учёта трубопроводных работ и контроля качества: от раскроя на катушки (SpoolGen) через цех,
NDE и монтаж до тест-пакетов и испытания давлением. Бизнес-правила следуют руководству Easy Piping
(`docs/marker-output/manual.md`, разбор — `docs/research/2026-07-30-easy-piping-documentation-dossier.md`).

## Устройство

- **Next.js 16** (App Router), весь интерфейс — клиентские компоненты; тексты на английском и
  русском в `messages/{en,ru}/`.
- **Supabase**: Postgres 17 — единственный источник истины. Доступ — только RLS-политики; запись —
  SQL-команды (`rpc`) в транзакции с идемпотентностью и аудитом; чтение — `select` из таблиц и view.
- Код разбит по модулям `modules/<контекст>/{domain,application,infrastructure,ui}`; правила для
  бэкенда — в `CLAUDE.md` / `AGENTS.md`.

## Локальный запуск

Нужны Node 22+, Docker и Supabase CLI (`npx supabase`). Значения для локального стенда лежат в
`.env.local` (не в git); скрипты читают его сами.

```zsh
npm install
npx supabase start                              # локальный Supabase
npm run dev                                     # http://localhost:3000
```

Пустой стенд с пользователями и справочниками — `npm run demo:prepare -- --confirm-local-reset`
(сбрасывает базу; порядок с `verify` и `demo:showcase` — в `CLAUDE.md`). Подробно —
`docs/qa/local-supabase-browser-runbook.md`.

## Проверки

```zsh
npm run lint && npm run typecheck && npm run test:unit   # то же гоняет CI на каждый PR
npm run test:db                                           # pgTAP, нужен пустой стенд
```

## Hosted-стенд

Production собирается Vercel из ветки `main`; база — отдельный проект Supabase. Выкладка, миграции и
проверка — `docs/runbooks/hosted-stand-operations.md`.

## Где что лежит

| Что | Где |
|---|---|
| Состояние проекта и роадмап | `docs/audits/2026-10-14-project-review-and-roadmap.md` |
| Планы исполнения | `docs/superpowers/plans/` |
| Аудиты и приёмка | `docs/audits/`, `docs/acceptance/` |
| Отложенная работа | `docs/deferred-work.md` |
| Глоссарий русского интерфейса | `docs/i18n/glossary-ru.md` |
