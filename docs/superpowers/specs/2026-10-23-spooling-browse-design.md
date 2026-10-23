# Spooling → Browse: one list, one isometric, one spool

Date: 2026-10-23. Owner decisions taken the same day.

## What the tab is for

After the spooling import, the engineer checks what landed: which isometrics the project holds, at
which revision, and what each spool carries (welds, supports, flange joints, materials). From a
spool they go on to the shop.

## Audit of the current tab (ux-heuristics, live UPG-1, 1440 / 1024 / 390 px)

Score: **4/10**. Screenshots: `tasks/ui-audit/spooling-browse/` (git-excluded).

| # | Sev | Finding |
|---|-----|---------|
| F1 | 3 | «Просмотр» and «История ревизий» render the same component (`EngineeringBrowser`). Two tabs, one screen; the user cannot tell them apart. |
| F2 | 3 | Three equal cards. Two of them are empty on arrival, with no hint. The revision card spends a third of the width on one row («R0 · Принят») for every UPG-1 isometric. |
| F3 | 3 | The isometric list has no search, no count, no sizes. 40 rows already run past the fold; a pilot site holds about a thousand. 40 identical «R0» badges are noise. |
| F4 | 3 | A spool is a card of comma-joined strings («Стыки: 1003-S1-FW1, 1003-S1-W01, …»). Nothing can be counted or compared; weld type, size, thickness, shop/field, spool weight, material class, material description and quantity are in the database and never shown. |
| F5 | 2 | Line, sheet, PDS area, service class and the acceptance date of the revision are not shown. |
| F6 | 2 | The selection lives in `useState`: reload or Back loses it, the view cannot be linked. |
| F7 | 2 | No path forward: a spool cannot be opened in Fabrication; an empty project does not point to Import. No loading state. |
| F8 | 2 | Phone: the 40-row list comes first and the selected isometric's spools land 2,000 px below, out of sight. |
| F9 | 1 | The page heading «Просмотр» repeats the active tab. |

## Decisions (owner, 2026-10-23)

1. **Merge the tabs.** «История ревизий» stops being a tab. Its address `/spooling/revisions`
   stays as an alias of Browse (same screen, Browse tab lit). Revisions become a switcher in the
   isometric header, shown only when the isometric has more than one.
2. **Layout: isometric list + spool table + spool drawer.**
3. **Executor:** opencode, model `opencode/deepseek-v4.1-flash-free`. Claude reviews, runs the
   gates, checks in the browser and commits.

## Target screen

```
┌ Изометрии  40 ─────────────┐ ┌ UPG-100-1003   [R0 ▾]  ✓ Принята ─────────────────┐
│ [Поиск по номеру изометрии] │ │ Линия 4-NG-1001-CS150 · Зона A-100 · Класс CS150   │
│ Изометрия     Рев. Кат. Ст. │ │ Принята 12.10.2026, 10:15                          │
│ UPG-100-1001  R0    2   12  │ │ 2 катушки · 11 стыков (цех 9 · монтаж 2) · 2 опоры │
│▌UPG-100-1003  R0    2   11  │ ├────────────────────────────────────────────────────┤
│ UPG-100-1004  R0    3   14  │ │ Катушка   Стыки Опоры Фланцы Материалы Вес,кг Класс│
│ …                           │ │ …-1003-S1    7     1      1        3    124  CS150 │
└─────────────────────────────┘ └────────────────────────────────────────────────────┘
      click a spool row → right drawer: welds / supports / flange joints / materials
                                        + «Открыть в Цехе» (accepted revision only)
```

- Left: the shared `DataTable` (compact), searchable by isometric number, sortable, the selected
  row highlighted. Revision cell shows a status badge only when the revision is not accepted.
- Right, nothing selected: one muted line «Выберите изометрию в списке». Project with no
  isometrics: the table's empty state points to Import.
- Selection is in the address bar: `iso` (isometric id), `rev` (revision id, only when it is not
  the current one), `spoolRev` (open drawer). Opening the drawer pushes a history entry, so Back
  closes it.
- Below `lg`, the panes stack; picking an isometric scrolls its pane into view.
- No page `h2` above the panes; the isometric number is the heading.

## Out of scope

- Any migration, view or RPC. Reads are plain selects on existing tables (CLAUDE.md rule 1).
- A project-wide revision feed (the owner chose the merge instead).
- Comparing two revisions side by side.
