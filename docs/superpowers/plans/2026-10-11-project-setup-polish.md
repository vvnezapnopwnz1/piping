# Справочники проекта — доводка после разбора удобства

> **For agentic workers:** шаги выполняются по одному (`tasks/project-setup-ux/cline2/P1..P3`), у каждого своя
> автоматическая проверка. План — только для чтения.

**Goal:** убрать то, что ещё мешает заполнять справочники проекта: смесь языков в подсказках, потерянный текущий пункт
списка, громоздкие кнопки в строках, разнобой полей в формах и повторное открытие формы ради каждой записи.

**Architecture:** только интерфейс. Новых команд, запросов и миграций нет. Меняются общая таблица
(`components/ui/data-table/data-table.tsx`, одна строка), список справочников, файлы четырёх групп и сообщения en/ru.

**Tech Stack:** Next.js 16, React 19, next-intl 4, Tailwind 4, shadcn/ui.

**Предыдущий план:** `docs/superpowers/plans/2026-10-10-project-setup-references.md` (выполнен, ece020b).

## Что нашли (разбор 11.10 по эвристикам Нильсена и Круга, оценка 7/10)

Стенд UPG-1, 1440×900 и 390 px, только чтение: открыты все 30 справочников и 9 форм «Добавить» (без сохранения).

| # | Находка | Эвристика | Серьёзность |
|---|---|---|---|
| 1 | Поиск в таблице подписан по-английски и строчными: «Search номер mrr, код ident…». Строка собирается в `components/ui/data-table/data-table.tsx:246` и попадает во все таблицы приложения без своей подсказки | Соответствие языку пользователя, единообразие | 3 |
| 2 | В формах «e.g. U-100», «e.g. W-101», «e.g. 150#» рядом с «например, PDS-100» | Единообразие | 2 |
| 3 | 30 пунктов списка не помещаются в экран (1088 px при 868 px окна); открытый по ссылке нижний справочник (например, «Пользователи ТСД») подсвечен за краем | Видимость состояния, «где я» | 2 |
| 4 | «Изменить вместимость» и «Деактивировать» — полноразмерные кнопки в каждой строке, шумнее данных | Минимализм | 1 |
| 5 | Выпадающие списки в формах шириной по тексту — поля формы с рваным правым краем | Эстетика, сканирование | 1 |
| 6 | Чтобы внести 20 подсистем или зон PDS, форму открывают 20 раз: после «Добавить» она закрывается | Гибкость и эффективность | 2 |
| 7 | Шапка (модули, вкладки настройки, заголовок с описанием) занимает ~250 px до таблицы | Минимализм | 1 — вне плана |

Решение по №6 — флажок «Добавить ещё» в подвале формы (как «Create another» в Jira): включён — после сохранения форма
остаётся открытой, текстовые поля очищены, выбранные списки (система, категория, субподрядчик) сохраняются. Состояние
флажка — одно на группу справочников, пока открыта страница. Сохранение и уведомление прежние.

## Global Constraints

- Только интерфейс: `supabase/`, `lib/supabase/`, `modules/*/infrastructure/`, `package.json` не трогать.
- Каждая строка для человека — в `messages/en/*.json` и `messages/ru/*.json`, не в `.tsx`; термины — `docs/i18n/glossary-ru.md`.
- Стенд не менять: ни одной записи через формы, никаких `demo:*`, `supabase db reset`, `npm run verify`, `test:db`.
- Ветка `feat/unified-workspace`, без новых веток и push.
- DOM приложения не переписывать ради проверки (`document.querySelector`, `setAttribute`, `removeAttribute`).

## Review Focus

1. Таблица с подсказкой, заданной экраном (`searchPlaceholder`), показывает её, а не новую — меняется только запасной вариант.
2. Таблица без столбцов для поиска показывает «Поиск…», а не «Поиск: ».
3. Клик по видимому пункту списка не прокручивает ни список, ни страницу.
4. «Добавить ещё» выключен — форма закрывается после сохранения, как раньше; ошибка сохранения не закрывает форму в любом режиме.
5. Форма «Изменить вместимость» — не форма добавления, флажка в ней нет.

---

### Task 1: Один язык в подсказках

**Files:**
- Modify: `components/ui/data-table/data-table.tsx:246`
- Modify: `modules/project-setup/ui/general-references.tsx` (`placeholder="e.g. U-100"`)
- Modify: `modules/project-setup/ui/welding-references.tsx` (`placeholder="e.g. W-101"`)
- Modify: `modules/project-setup/ui/system-referential-screen.tsx` (`placeholder="e.g. 150#"`)
- Modify: `messages/{en,ru}/common.json`, `messages/{en,ru}/projectSetup.json`

- [ ] **Step 1: запасная подсказка поиска из сообщений.** В `data-table.tsx` строку 246 заменить на

```tsx
          searchPlaceholder={searchPlaceholder ?? (searchable.length > 0 ? tt('searchIn', { columns: searchable.map((c) => c.header).join(', ') }) : tt('search'))}
```

`tt` уже объявлен в компоненте (`useTranslations('common.table')`). Заголовки не переводить в нижний регистр.

- [ ] **Step 2: ключ `common.table.searchIn`** — сразу после `search`:

| файл | значение |
|---|---|
| `messages/en/common.json` | `"searchIn": "Search: {columns}"` |
| `messages/ru/common.json` | `"searchIn": "Поиск: {columns}"` |

- [ ] **Step 3: подсказки форм из сообщений.**

| файл и место | станет | ключ (рядом с соседним) | en | ru |
|---|---|---|---|---|
| `general-references.tsx`, `placeholder="e.g. U-100"` | `placeholder={t("dialogs.unitCodePlaceholder")}` | `projectGeography.dialogs.unitCodePlaceholder` (рядом с `pdsCodePlaceholder`) | `e.g. U-100` | `например, U-100` |
| `welding-references.tsx`, `placeholder="e.g. W-101"` | `placeholder={t("dialogs.welderStencilPlaceholder")}` | `weldingQuality.dialogs.welderStencilPlaceholder` (рядом с `welderNamePlaceholder`) | `e.g. W-101` | `например, W-101` |
| `system-referential-screen.tsx`, `placeholder="e.g. 150#"` | `placeholder={t("flangeRatingPlaceholder")}` | `systemReferential.flangeRatingPlaceholder` (рядом с `flangeRatingOptional`) | `e.g. 150#` | `например, 150#` |

- [ ] **Step 4: проверки** `npm run typecheck`, `npx eslint` по изменённым файлам, `npm run test:unit`.
- [ ] **Step 5: коммит** `fix(setup): table search and form hints speak the reader's language`

### Task 2: Текущий справочник на виду, строки и формы спокойнее

**Files:**
- Modify: `modules/project-setup/ui/reference-navigator.tsx` (целиком, код ниже)
- Modify: `modules/project-setup/ui/testpack-references.tsx` (две кнопки в строках)
- Modify: `modules/project-setup/ui/{general,welding,testpack}-references.tsx` (все `<SelectTrigger`)

- [ ] **Step 1: список.** Пункты плотнее (`py-1` вместо `py-1.5`, группы `space-y-3`), текущий пункт прокручивается
  в видимую область (`block: "nearest"` — видимый пункт не двигает ни список, ни страницу; скрытый список на телефоне
  не прокручивается). Файл целиком:

```tsx
// modules/project-setup/ui/reference-navigator.tsx
"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { REFERENCE_GROUPS, type ReferenceKey } from "./reference-catalog"

export function ReferenceNavigator({
  active,
  missing,
  hrefFor,
}: {
  active: ReferenceKey
  missing: ReadonlySet<ReferenceKey>
  hrefFor: (key: ReferenceKey) => string
}) {
  const t = useTranslations("projectSetup.projectReferential")
  const router = useRouter()
  const activeLink = useRef<HTMLAnchorElement>(null)

  // Thirty links are taller than a screen: a reference opened by its address must not be highlighted out of sight.
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest" })
  }, [active])

  return (
    <>
      {/* A phone has no room for thirty links above the table: one select instead. */}
      <div className="lg:hidden">
        <Select value={active} onValueChange={(key) => router.replace(hrefFor(key as ReferenceKey), { scroll: false })}>
          <SelectTrigger aria-label={t("chooseReference")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERENCE_GROUPS.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{t(`groups.${group.id}`)}</SelectLabel>
                {group.keys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`references.${key}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav
        aria-label={t("navigatorLabel")}
        className="hidden space-y-3 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
        {REFERENCE_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium uppercase tracking-wide">
              {t(`groups.${group.id}`)}
            </p>
            <ul>
              {group.keys.map((key) => (
                <li key={key}>
                  <Link
                    ref={key === active ? activeLink : undefined}
                    href={hrefFor(key)}
                    replace
                    scroll={false}
                    aria-current={key === active ? "page" : undefined}
                    className={cn(
                      "hover:bg-accent flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm",
                      key === active && "bg-accent font-medium",
                    )}
                  >
                    <span>{t(`references.${key}`)}</span>
                    {missing.has(key) ? (
                      <span role="img" aria-label={t("referenceIncomplete")} className="bg-warning-fg size-2 shrink-0 rounded-full" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: кнопки в строках тише.** В `testpack-references.tsx` кнопки «Деактивировать» (`handleDeactivatePunchCode`)
  и «Изменить вместимость» (`onEditCapacity`) — `variant="ghost"` вместо `variant="outline"`, `size="sm"` остаётся.
- [ ] **Step 3: поля форм одной ширины.** В `general-references.tsx`, `welding-references.tsx`, `testpack-references.tsx`
  у каждого `<SelectTrigger` в `className` есть `w-full` (дописать к имеющимся классам или добавить `className="w-full"`).
- [ ] **Step 4: проверки** — как в Task 1.
- [ ] **Step 5: коммит** `fix(setup): the open reference stays in view, row actions and form fields are calmer`

### Task 3: «Добавить ещё» в формах добавления

**Files:**
- Create: `modules/project-setup/ui/add-another-toggle.tsx`
- Modify: `modules/project-setup/ui/{general,welding,testpack,spooling}-references.tsx`
- Modify: `messages/{en,ru}/projectSetup.json`

- [ ] **Step 1: флажок.**

```tsx
// modules/project-setup/ui/add-another-toggle.tsx
"use client"

import { useTranslations } from "next-intl"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/** Keeps an "Add" dialog open after a successful save, so a list is typed in without reopening the form. */
export function AddAnotherToggle({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const t = useTranslations("projectSetup.projectReferential")
  return (
    <div className="flex items-center gap-2 sm:mr-auto">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <Label htmlFor={id} className="text-sm font-normal">
        {t("addAnother")}
      </Label>
    </div>
  )
}
```

- [ ] **Step 2: ключ** `projectSetup.projectReferential.addAnother`: en `Add another`, ru `Добавить ещё`.
- [ ] **Step 3: состояние — одно на файл группы.** В каждом из четырёх компонентов групп рядом с остальными `useState`:

```tsx
  const [addAnother, setAddAnother] = useState(false)
```

- [ ] **Step 4: флажок в каждой форме добавления** — первым элементом её `<DialogFooter>`:

```tsx
<AddAnotherToggle id="<ключ справочника>-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
```

Форм добавления 21: general — 4 (субподрядчик, узел, классификация зоны, зона PDS), welding — 8 (класс эксплуатации,
тип стыка, сварщик, толщины, правило NDE, запись PML, код дефекта, категория стыка), testpack — 8 (категория места,
место хранения, бригада, система, подсистема, служба линии, единица времени, код замечания), spooling — 1 (устройство).
Форма «Изменить вместимость» (`dialogs.editCapacityTitle`) — **не** форма добавления, флажок в неё не ставить.

- [ ] **Step 5: форма не закрывается, когда флажок включён.** В обработчике сохранения каждой из 21 форм строку,
  закрывающую форму после успешного сохранения, обернуть условием. Пример (`general-references.tsx`, `handleCreateUnit`):

```tsx
      if (!addAnother) setIsAddUnitOpen(false)
      setUnitCode("")
      setUnitDesc("")
      toast.success(t("unitAdded", { code: newUnit.code }))
```

Текстовые поля после сохранения очищаются (где не очищались — очистить), выбранные значения списков не сбрасывать.
Кнопки «Отмена» и закрытие крестиком не менять. Ветку ошибки (`catch`) не менять.
- [ ] **Step 6: проверки** — как в Task 1.
- [ ] **Step 7: коммит** `feat(setup): add another record without reopening the form`

## Вне плана

- Шапка раздела (находка 7): три уровня навигации над таблицей — отдельное решение по всему приложению.
- Правка и деактивация записей справочников — новые команды в базе.
- Excel для зон PDS, подсистем и бригад.
