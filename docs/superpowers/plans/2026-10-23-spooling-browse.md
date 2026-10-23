# Spooling Browse Redesign Implementation Plan

> **For agentic workers:** execute the tasks in order, in this checkout and on the current branch
> (`feat/unified-workspace`). Do **not** create branches, worktrees or commits: Claude reviews,
> runs the gates and commits. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-card Spooling → Browse tab with an isometric list, an isometric pane
with a spool table, and a spool drawer; fold the duplicate «История ревизий» tab into it.

**Architecture:** Two plain selects in the engineering repository (the isometric list with counts,
one revision with everything under it) feed three focused client components. The selection lives
in the address bar. No migration, view or RPC.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, supabase-js, the app's shared
`DataTable` and `RecordDrawer`, Tailwind, `node --test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-23-spooling-browse-design.md` — read it first.

## Global Constraints

- Never read, print or open `.env`, `.env.local` or any `*.env*` file. Never run `supabase`,
  `docker`, `psql`, `npm run demo:*`, `npm run verify`, `npm run test:db`, `git commit`,
  `git stash`, `git checkout`, `git reset`. The only commands you need are the three gates below.
- Another session works in this checkout at the same time (on `scripts/demo/`, `scripts/upg/`,
  `scripts/nps/`). Touch only the files this plan lists. If a gate fails in a file you did not
  touch, report it and do not edit that file.
- Every string a person reads lives in `messages/en/spooling.json` and `messages/ru/spooling.json`
  (namespace `spooling.browser`), never in a `.tsx`. Russian copy is given verbatim below; use it.
- Reads are plain `client.from(<table>).select(...)` on existing tables. No new SQL.
- Match the surrounding style: the repository file writes each function on one line; UI files use
  double quotes and no semicolons only where the file already does (`engineering-browser.tsx` uses
  semicolons — new UI files follow `modules/project-setup/ui/reference-pane.tsx`: no semicolons).
- Gates, all must exit 0: `npm run lint`, `npm run typecheck`, `npm run test:unit`.

## Review Focus

- An isometric with no accepted revision (only a draft) must still list, showing its latest
  revision with a status badge — pinned by a test in Task 1.
- Removed spools and removed welds must not be counted, but must still be visible (badge) in the
  pane and the drawer — pinned by tests in Task 1.
- `?iso=` pointing at an id that is not in the project (stale link) must show the "pick an
  isometric" line, not a crash or an endless skeleton — Task 3 step.
- A spool of a superseded or draft revision must not offer «Открыть в Цехе» (Fabrication works
  on current spools only) — Task 4 step.
- A project with no isometrics shows the empty state with a link to Import, not two empty panes
  — Task 3 step.

---

### Task 1: Repository reads

**Files:**
- Modify: `modules/engineering/infrastructure/supabase-engineering-repository.ts` (replace
  `IsometricSummary`, `loadIsometrics`, `SpoolNode`, `loadRevisionGraph`; keep
  `RevisionSummary` and `loadRevisionHistory` unchanged)
- Test: `modules/engineering/infrastructure/supabase-engineering-repository.test.ts` (append; the
  file uses top-level `assert` calls, no `test()` blocks)

**Interfaces — Produces:**

```ts
export interface IsometricRow { id: string; isoNumber: string; revisionId: string | null; revisionNumber: string | null; revisionStatus: RevisionStatus | null; spoolCount: number; weldCount: number }
export function toIsometricRow(row: Row): IsometricRow
export async function loadIsometrics(client: SupabaseClient<Database>, projectId: string): Promise<IsometricRow[]>

export interface WeldDetail { id: string; weldNumber: string; typeCode: string | null; location: "shop" | "field" | null; diameterInch: number | null; thicknessMm: number | null; isRemoved: boolean }
export interface SupportDetail { id: string; supportNumber: string; supportType: string | null; quantity: number | null; isRemoved: boolean }
export interface FlangeDetail { id: string; flangeNumber: string; rating: string | null; diameterInch: number | null; isRemoved: boolean }
export interface MaterialDetail { id: string; identCode: string; description: string | null; quantity: number | null; unit: string | null }
export interface SpoolDetail { spoolRevisionId: string; spoolNumber: string; isRemoved: boolean; weightKg: number | null; materialClass: string | null; welds: WeldDetail[]; supports: SupportDetail[]; flanges: FlangeDetail[]; materials: MaterialDetail[] }
export interface RevisionDetail { id: string; revisionNumber: string; status: RevisionStatus; lineNumber: string | null; sheetNumber: string | null; areaCode: string | null; serviceClassCode: string | null; acceptedAt: string | null; comment: string | null; spools: SpoolDetail[] }
export function toSpoolDetail(row: Row): SpoolDetail
export async function loadRevisionDetail(client: SupabaseClient<Database>, revisionId: string): Promise<RevisionDetail>
```

- [ ] **Step 1: Write the failing tests** (append to the test file, add the three names to its
  import line)

```ts
// The list shows the accepted revision and counts only what that revision still holds.
const listed = toIsometricRow({ id: "i1", iso_number: "ISO-1", isometric_revisions: [
  { id: "r0", revision_number: "R0", revision_ordinal: 0, status: "superseded", spool_revisions: [{ is_removed: false, weld_joint_revisions: [{ is_removed: false }] }] },
  { id: "r1", revision_number: "R1", revision_ordinal: 1, status: "accepted", spool_revisions: [
    { is_removed: false, weld_joint_revisions: [{ is_removed: false }, { is_removed: true }, { is_removed: false }] },
    { is_removed: true, weld_joint_revisions: [{ is_removed: false }] },
  ] },
] })
assert.deepEqual(listed, { id: "i1", isoNumber: "ISO-1", revisionId: "r1", revisionNumber: "R1", revisionStatus: "accepted", spoolCount: 1, weldCount: 2 })
// An isometric with only a draft still lists, at its latest revision.
const draftOnly = toIsometricRow({ id: "i2", iso_number: "ISO-2", isometric_revisions: [
  { id: "d0", revision_number: "A", revision_ordinal: 0, status: "draft", spool_revisions: [] },
  { id: "d1", revision_number: "B", revision_ordinal: 1, status: "draft", spool_revisions: [] },
] })
assert.equal(draftOnly.revisionId, "d1")
assert.equal(draftOnly.revisionStatus, "draft")
assert.deepEqual(toIsometricRow({ id: "i3", iso_number: "ISO-3", isometric_revisions: [] }), { id: "i3", isoNumber: "ISO-3", revisionId: null, revisionNumber: null, revisionStatus: null, spoolCount: 0, weldCount: 0 })

// A spool keeps removed items (the pane marks them) and lists everything in natural number order.
const detail = toSpoolDetail({ id: "sr1", is_removed: false, weight_kg: 124.5, material_class: "CS150", spools: { spool_number: "S1" },
  weld_joint_revisions: [
    { id: "w10", weld_location: "field", diameter_inch: 8, thickness_mm: 6.35, is_removed: false, weld_joints: { weld_number: "W10" }, project_weld_types: { code: "BW" } },
    { id: "w2", weld_location: "shop", diameter_inch: 8, thickness_mm: null, is_removed: true, weld_joints: { weld_number: "W2" }, project_weld_types: null },
  ],
  support_revisions: [{ id: "s1", support_type: null, quantity: 1, is_removed: false, supports: { support_number: "SUP1" } }],
  flange_joint_revisions: [{ id: "f1", flange_rating: "150#", diameter_inch: 8, is_removed: false, flange_joints: { flange_number: "F1" } }],
  spool_revision_materials: [{ id: "m2", ident_code: "PIPE-8", description: "Pipe 8\"", quantity: 6, unit: "m" }, { id: "m1", ident_code: "ELB-8", description: null, quantity: 2, unit: null }],
})
assert.deepEqual(detail.welds.map((weld) => [weld.weldNumber, weld.location, weld.typeCode, weld.isRemoved]), [["W2", "shop", null, true], ["W10", "field", "BW", false]])
assert.deepEqual(detail.materials.map((material) => material.identCode), ["ELB-8", "PIPE-8"])
assert.equal(detail.spoolNumber, "S1")
assert.equal(detail.weightKg, 124.5)
assert.equal(detail.supports[0].supportNumber, "SUP1")
assert.equal(detail.flanges[0].rating, "150#")
```

- [ ] **Step 2: Run** `node --import tsx --test modules/engineering/infrastructure/supabase-engineering-repository.test.ts`
  — expected FAIL: `toIsometricRow` is not exported.

- [ ] **Step 3: Implement** in the repository file, one function per line like its neighbours.
  - `toIsometricRow`: current revision = the one with `status === "accepted"`, else the highest
    `revision_ordinal`, else none. `spoolCount` = its spool revisions with `is_removed !== true`;
    `weldCount` = weld revisions with `is_removed !== true` inside those spools.
  - `loadIsometrics`: keep `selectAllRows` and the ordering; select
    `"id, iso_number, isometric_revisions(id, revision_number, revision_ordinal, status, spool_revisions(is_removed, weld_joint_revisions(is_removed)))"`; map with `toIsometricRow`.
  - `toSpoolDetail`: sort every list with `a.localeCompare(b, undefined, { numeric: true })` on
    its number (`W2` before `W10`); `location` is `"shop" | "field"` or `null` for anything else.
  - `loadRevisionDetail`: one query, `client.from("isometric_revisions").select("id, revision_number, status, line_number, sheet_number, accepted_at, comment, project_pds_areas(code), project_service_classes(code), spool_revisions(id, is_removed, weight_kg, material_class, spools(spool_number), weld_joint_revisions(id, weld_location, diameter_inch, thickness_mm, is_removed, weld_joints(weld_number), project_weld_types(code)), support_revisions(id, support_type, quantity, is_removed, supports(support_number)), flange_joint_revisions(id, flange_rating, diameter_inch, is_removed, flange_joints(flange_number)), spool_revision_materials(id, ident_code, description, quantity, unit))").eq("id", revisionId).single()`; `fail(error)`, `required(data)`; spools sorted by number the same way.
  - Delete `IsometricSummary`, `SpoolNode`, `loadRevisionGraph` (their only caller is rewritten in
    Task 3).

- [ ] **Step 4: Run** the same command — expected PASS. Then `npm run typecheck` — the only
  errors allowed are in `modules/engineering/ui/engineering-browser.tsx` (fixed in Task 3).

---

### Task 2: Copy (en + ru)

**Files:**
- Modify: `messages/en/spooling.json`, `messages/ru/spooling.json` — replace the whole `browser`
  object; in `pages` delete `browse`, `revisions`, `selectRevisions` (check with
  `git grep -n "selectRevisions\|pages.revisions"` that nothing else uses them).

**Interfaces — Produces:** keys under `spooling.browser`, used by Tasks 3–4 exactly as named.

- [ ] **Step 1: Replace `browser` in `messages/ru/spooling.json` with:**

```json
"browser": {
  "isometrics": "Изометрии",
  "search": "Поиск по номеру изометрии",
  "column": { "iso": "Изометрия", "revision": "Рев.", "spools": "Катушки", "welds": "Стыки" },
  "empty": "В проекте ещё нет изометрий",
  "emptyHint": "Раскрой загружается на вкладке «Импорт».",
  "openImport": "Открыть импорт",
  "pick": "Выберите изометрию в списке",
  "notFound": "Изометрия не найдена в этом проекте",
  "chooseRevision": "Ревизия",
  "revision": "Ревизия {number}",
  "line": "Линия {value}",
  "sheet": "Лист {value}",
  "area": "Зона PDS {value}",
  "serviceClass": "Класс эксплуатации {value}",
  "acceptedOn": "Принята {date}",
  "spoolCount": "{count, plural, one {# катушка} few {# катушки} many {# катушек} other {# катушки}}",
  "weldCount": "{count, plural, one {# стык} few {# стыка} many {# стыков} other {# стыка}}",
  "weldSplit": "цех {shop} · монтаж {field}",
  "supportCount": "{count, plural, one {# опора} few {# опоры} many {# опор} other {# опоры}}",
  "flangeCount": "{count, plural, one {# фланцевое соединение} few {# фланцевых соединения} many {# фланцевых соединений} other {# фланцевого соединения}}",
  "noSpools": "В этой ревизии нет катушек",
  "spoolColumn": { "spool": "Катушка", "welds": "Стыки", "supports": "Опоры", "flanges": "Фланцы", "materials": "Материалы", "weight": "Вес, кг", "materialClass": "Класс материала" },
  "removed": "Удалена",
  "removedItem": "Удалено",
  "drawer": {
    "kicker": "Катушка",
    "meta": "{iso} · ревизия {revision}",
    "back": "Катушки",
    "close": "Закрыть катушку {spool}",
    "welds": "Стыки",
    "supports": "Опоры",
    "flanges": "Фланцевые соединения",
    "materials": "Материалы",
    "none": "Нет",
    "openInFabrication": "Открыть в Цехе",
    "weld": { "number": "Стык", "type": "Тип", "diameter": "Ø, дюйм", "thickness": "Толщина, мм", "location": "Место" },
    "location": { "shop": "цех", "field": "монтаж" },
    "support": { "number": "Опора", "type": "Тип", "quantity": "Кол-во" },
    "flange": { "number": "Соединение", "rating": "Класс давления", "diameter": "Ø, дюйм" },
    "material": { "ident": "Ident-код", "description": "Описание", "quantity": "Кол-во" }
  },
  "revisionFailed": "Не удалось загрузить ревизию.",
  "isometricsFailed": "Не удалось загрузить изометрии.",
  "historyFailed": "Не удалось загрузить историю ревизий."
}
```

- [ ] **Step 2: Same keys in `messages/en/spooling.json`** with: Isometrics · Search isometric
  number · Isometric / Rev. / Spools / Welds · No isometrics in this project yet · Spooling is
  loaded on the Import tab. · Open Import · Pick an isometric from the list · Isometric not found
  in this project · Revision · Revision {number} · Line {value} · Sheet {value} · PDS area {value}
  · Service class {value} · Accepted {date} · `{count, plural, one {# spool} other {# spools}}`,
  `… {# weld} … {# welds}`, `shop {shop} · field {field}`, `… {# support} … {# supports}`,
  `… {# flange joint} … {# flange joints}` · No spools in this revision · Spool / Welds / Supports
  / Flanges / Materials / Weight, kg / Material class · Removed · Removed · drawer: Spool ·
  `{iso} · revision {revision}` · Spools · `Close spool {spool}` · Welds · Supports · Flange
  joints · Materials · None · Open in Fabrication · Weld / Type / Ø, in / Thickness, mm /
  Location · shop / field · Support / Type / Qty · Joint / Rating / Ø, in · Ident code /
  Description / Qty · the three error sentences unchanged.

- [ ] **Step 3: Run** `node --import tsx --test i18n/messages.test.ts` — expected PASS (the
  Russian file has every key, argument and plural branch of the English one).

---

### Task 3: Isometric list and pane

**Files:**
- Rewrite: `modules/engineering/ui/engineering-browser.tsx` — layout, address-bar state, the
  isometric table (≤ 150 lines)
- Create: `modules/engineering/ui/isometric-pane.tsx` — header, revision switcher, spool table
  (≤ 200 lines)
- Modify: `app/spooling/browse/page.tsx` — drop the `<h2>` and the `refreshToken` prop
- Modify: `app/spooling/revisions/page.tsx` — whole file becomes
  `export { default } from "../browse/page"`
- Modify: `config/navigation.ts` — remove the `revisionHistory` child of `spooling`; add
  `aliases: [{ title: 'revisionHistory', href: '/spooling/revisions' }]` to the `browse` child
  (`config/navigation.test.ts` already accepts an alias as reachable; do not edit the test)

**Interfaces:**
- Consumes: Task 1 (`loadIsometrics`, `loadRevisionHistory`, `loadRevisionDetail`, the row
  types), Task 2 keys.
- Produces: `export function EngineeringBrowser({ projectId }: { projectId: string })`;
  `export function IsometricPane({ iso, revisionId, onRevisionChange, spoolRevisionId, onOpenSpool }: { iso: IsometricRow; revisionId: string | null; onRevisionChange: (id: string) => void; spoolRevisionId: string | null; onOpenSpool: (spool: SpoolDetail | null) => void })`
  — `revisionId === null` means "the iso's current revision".

- [ ] **Step 1: `EngineeringBrowser`.**
  - Address bar: read `iso`, `rev`, `spoolRev` with `useSearchParams`. Write them by copying
    `window.location.search`, setting/deleting the keys and calling `router.replace(href, { scroll: false })`
    (`router.push` when opening the drawer) — the same steps as `useWorkContextParam` in
    `components/pipeqc/work-context.tsx`, so `p` and the table params survive. Picking an
    isometric sets `iso` and deletes `rev` and `spoolRev`. Picking a revision sets `rev` (deletes it
    when it equals the iso's current `revisionId`) and deletes `spoolRev`.
  - Layout: `grid gap-6 lg:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] lg:items-start`. Left: a
    `<section>` with `<h2 className="text-lg font-semibold">` «Изометрии» and the count beside it
    in `text-muted-foreground text-sm font-normal tabular-nums` (as `ReferencePane` does), then the
    `DataTable` (`variant="compact"`, `useTableUrlState({ namespace: "iso" })`, `loading` until the
    first load ends, `onRowClick`, `selectedRowId={iso}`). Columns: `iso` (mono, `searchable`,
    `alwaysVisible`), `revision` (the number; `StatusBadge` next to it only when the status is not
    `accepted`), `spools` and `welds` (`numeric`). Empty state: `emptyTitle` `browser.empty`,
    `emptyDescription` `browser.emptyHint`, `emptyAction` a `Button` `asChild` `variant="outline"`
    `size="sm"` wrapping `<Link href={withProject("/spooling/import", activityCode)}>` with
    `browser.openImport` (`const activityCode = useSupabaseAuth().access?.activityCode` from
    `@/contexts/supabase-auth-context`; `withProject` from `@/components/pipeqc/project-url`).
  - Right: when no `iso`, or `iso` not found among loaded rows: a
    `rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm` box with
    `browser.pick` (or `browser.notFound` when the id is set but missing, after loading ended).
    Otherwise `<IsometricPane key={iso.id} …/>` inside a `div` with a ref; when the user picks an
    isometric and `window.matchMedia("(max-width: 1023px)").matches`, call
    `ref.current?.scrollIntoView({ block: "start", behavior: "smooth" })`.
  - Errors: keep the `toast.error(t("browser.isometricsFailed"), { description: errorDetail(e) })` pattern.

- [ ] **Step 2: `IsometricPane`.**
  - Loads `loadRevisionHistory(iso.id)` once and `loadRevisionDetail(revisionId ?? iso.revisionId)`
    whenever that id changes; shows `Skeleton` blocks while loading; toasts `historyFailed` /
    `revisionFailed` on error. If `iso.revisionId` is null, show `browser.noSpools` and stop.
  - Header (`flex flex-wrap items-start justify-between gap-3`): `<h2 className="font-mono text-lg font-semibold">`
    iso number; beside it the revision — a `Select` (`aria-label` `browser.chooseRevision`, items
    `R1`, `R0`… each with its `StatusBadge`) when history has more than one revision, otherwise
    plain text `browser.revision`; then `StatusBadge` of the shown revision.
  - Facts line (`text-muted-foreground text-sm`, parts joined with ` · `, empty ones skipped):
    `line`, `sheet`, `area`, `serviceClass`, `acceptedOn` (date via `formatMoment` from
    `@/i18n/format` with `useLocale()`). The revision `comment`, when present, on its own muted line.
  - Summary line (`text-sm`): `spoolCount` · `weldCount` (`weldSplit`) · `supportCount` ·
    `flangeCount`, counting only items with `isRemoved === false` in spools with `isRemoved === false`.
  - Spool table: `DataTable` compact, `useTableUrlState({ namespace: "isoSpool" })`, rows = all
    spools, `rowId` = `spoolRevisionId`, `onRowClick={onOpenSpool}`, `selectedRowId={spoolRevisionId}`,
    `emptyTitle` `browser.noSpools`. Columns `spool` (mono; `Badge variant="outline"`
    `browser.removed` after it when removed; `searchable`, `alwaysVisible`), `welds`, `supports`,
    `flanges`, `materials` (non-removed counts, `numeric`), `weight` (`Intl.NumberFormat(locale, { maximumFractionDigits: 1 })`,
    `numeric`), `materialClass`. Removed spool rows get `text-muted-foreground` via the cell.
  - Renders `SpoolContentsDrawer` (Task 4) for the spool whose `spoolRevisionId` equals the
    prop, passing `onClose={() => onOpenSpool(null)}`.

- [ ] **Step 3: Gates** `npm run lint`, `npm run typecheck`, `npm run test:unit` — expected exit 0
  (Task 4's component may be stubbed to `return null` until Task 4; remove the stub there).

---

### Task 4: Spool drawer

**Files:**
- Create: `modules/engineering/ui/spool-contents-drawer.tsx` (≤ 170 lines)

**Interfaces:**
- Consumes: `SpoolDetail`, `RecordDrawer` from `@/components/ui/record-drawer`
  (props `kicker`, `title`, `meta`, `status?`, `returnLabel`, `closeLabel`, `recordKind`,
  `onClose`, `children`).
- Produces: `export function SpoolContentsDrawer({ spool, isoNumber, revisionNumber, isCurrent, onClose }: { spool: SpoolDetail; isoNumber: string; revisionNumber: string; isCurrent: boolean; onClose: () => void })`
  — `isCurrent` is `revision.status === "accepted"`.

- [ ] **Step 1: Implement.** `RecordDrawer` with `recordKind="spool"`, kicker `drawer.kicker`,
  title spool number, meta `drawer.meta`, `returnLabel` `drawer.back`, `closeLabel` `drawer.close`,
  `status` = `Badge` `browser.removed` when removed. Body, four `<section className="space-y-2">`
  each with an `<h3 className="text-sm font-medium">` title and its count in muted tabular nums:
  welds (columns number mono, type, diameter, thickness, location label from `drawer.location.*`
  or `—`), supports (number, type, quantity), flanges (number, rating, diameter), materials (ident
  mono, description, quantity + unit). Use the plain `Table` primitives from
  `@/components/ui/table` (lists are short; no search). Removed rows: `text-muted-foreground line-through`
  on the number cell plus `Badge variant="outline"` `browser.removedItem`. An empty section shows
  `drawer.none` in muted text. Missing numbers show `—`.
- [ ] **Step 2: Fabrication link.** Only when `isCurrent && !spool.isRemoved`: a `Button` `asChild`
  `size="sm"` above the sections wrapping `<Link href={linkFrom(withProject(`/fabrication?spool=${encodeURIComponent(spool.spoolRevisionId)}`, activityCode), here)}>`
  with `drawer.openInFabrication` and a `lucide-react` `ArrowRight` icon; `linkFrom` from
  `@/components/pipeqc/workspace-model`; `activityCode` as in Task 3; `here` is
  `query ? `${pathname}?${query}` : pathname` with `usePathname()` and
  `useSearchParams().toString()`, as `modules/construction/ui/erection/erection-workbench.tsx:73` builds it.
- [ ] **Step 3: Gates** `npm run lint`, `npm run typecheck`, `npm run test:unit` — expected exit 0.

---

### Task 5: Report

- [ ] Write `tasks/spooling-browse/REPORT.md`: files changed, gate output (last lines of each),
  anything you could not do or decided differently from this plan, with the reason. Do not start
  the dev server or a browser; Claude checks the screen on the local stand.
