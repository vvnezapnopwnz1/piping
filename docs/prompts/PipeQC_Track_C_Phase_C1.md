# Task: PipeQC Track C, Phase C1 — Reports module (§9 + §13 + §20)

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first.
Tracks A (A1–A6), B (B1–B2), E2 (E2.1, E2.3, E2.5), N (N1+N2), F2 + E2.4 are merged. The MVP upstream demo narrative runs end-to-end.

This is **Phase C1 of Track C — Reports** (per `docs/PIPEQC_CONTEXT.md` §"Track C — Reports"). C1 closes `/reports`, a 10-line placeholder today.

**Important: this slice is independent of Track G (Spool Fabrication Lifecycle) and Track D (Spooling).** Do not touch any spool-stage data model or any `/spooling` files. Do not refactor `config/navigation.ts` except to confirm `/reports` is already there (it is).

## Why this slice exists

Today `app/reports/page.tsx` is **10 lines** — `<h1>Reports</h1>` + one muted-text sentence. Three Easy Piping Manual sections (§9 Fabrication reports, §13 Erection reports, §20 Testpack reports) all map to this single screen, and on the demo a viewer who clicks **Reports** in the sidebar sees an empty page. That single click kills the *"complete enterprise platform"* line in the pitch — six modules look real, this one looks like a wireframe.

C1 closes the gap with a pure shell screen: a list of ~12 report definitions grouped by category, each row with metadata (last generated, size, format) and a `Download` action that toasts `"Generating mock.xlsx…"` → `"Downloaded fabrication-progress-2026-05-17.xlsx"`. No actual files. No backend. ~0.5 day.

Manual coverage:

| Manual § | Topic | What lands on the page |
| --- | --- | --- |
| §9 | Fabrication reports | Fabrication Progress, Rework Queue, Welder Performance, NDE Summary |
| §13 | Erection reports | Erection Progress, Field Weld Status, Spool Delivery, Area Completion |
| §20 | Testpack reports | Testpack Readiness, Pressure Test Log, ISO Status, Punch List Summary |

12 rows total. Some rows can have live counts (e.g. "Fabrication Progress — 15 welds tracked" pulled from `useWeldsStore`), making the screen feel less static.

---

## Goal

1. Replace `app/reports/page.tsx` (10 lines) with a populated reports module: page header + filter chips + table of 12 reports grouped by category.
2. New seed file `lib/reports-data.ts` with the 12 report definitions (id, title, category, description, format, sizeBytes, lastGeneratedISO, owner, optional `liveCount` selector hint).
3. New component `components/reports/reports-view.tsx` (the table + actions). Page file becomes a thin shell that mounts the view.
4. Each row's `Download` button: 800–1200 ms toast `"Generating <filename>…"`, then a follow-up `toast.success("Downloaded <filename>")` with a `View again` action that just re-shows the toast. Optionally also offer a `Preview` action that opens a `Sheet` with mock chart/numbers (skip if it bloats the slice).
5. Filter chips at the top: `All` / `Fabrication` / `Erection` / `Testpack` / `NDE`. Single-select. Default `All`. URL synced via `?category=`.
6. Search input above the table — filters by title + description.
7. Per-category KPIs in a row of 4 small tiles above the filter chips: `<n> reports` per category, with the count tied to filtered visibility.

**Do not** introduce a Zustand store. Reports are read-only seed data — `lib/reports-data.ts` is enough. No persistence, no mutations.

---

## Files to read first (mandatory context)

| File | Why |
| --- | --- |
| `app/reports/page.tsx` | The current 10-line placeholder. This is what you replace. |
| `app/admin/page.tsx` + `app/admin/admin-tabs.tsx` | Reference for page shell + `?param=` URL sync pattern (admin uses `?tab=`, you'll use `?category=`). |
| `components/weld-table.tsx` | Reference table density / spacing / row height. **Match exactly.** |
| `components/fabrication-dashboard.tsx` | Reference for the small-KPI-tile pattern at the top of the page. |
| `components/erection-dashboard.tsx` | The 5-tile KPI strip added in E2.3 — reuse the same visual rhythm. |
| `lib/engineering-references.ts` | Pattern for a read-only seed module (no store, just an exported const array). C1 mirrors this shape. |
| `docs/PIPEQC_CONTEXT.md` design tokens table (lines 42–55) | Use sky/emerald/amber/violet exactly as defined. |
| `store/welds-store.ts`, `store/batches-store.ts`, `store/testpack-store.ts`, `store/erection-store.ts` | If you wire live counts on a few rows, these are the read sources. **Read only**, never mutate. |

---

## 1. Seed data — `lib/reports-data.ts`

`"use client"` is NOT needed (lib file, pure data). Export shape:

```ts
export type ReportCategory = "Fabrication" | "Erection" | "Testpack" | "NDE"
export type ReportFormat = "xlsx" | "pdf" | "csv"

export interface ReportDef {
  id: string                  // "RPT-F-001"
  title: string               // "Fabrication Progress Summary"
  description: string         // 1 sentence, ≤90 chars
  category: ReportCategory
  format: ReportFormat
  sizeBytes: number           // 50_000 .. 2_500_000
  lastGeneratedISO: string    // "2026-05-15T08:42:00Z"
  owner: string               // "QC-ENG-01" / "QC-ENG-02" / etc.
  manualSection?: string      // "§9.2" — for tooltip
  liveCountKey?: "welds.total" | "welds.rework" | "batches.active" | "batches.overdue" | "testpack.rflc" | "testpack.total" | "erection.rft" | "fieldWelds.total"
}

export const REPORTS_SEED: ReportDef[] = [ ... 12 entries ... ]
```

Twelve entries, distributed:

**Fabrication (4) — §9.x**
1. `RPT-F-001` Fabrication Progress Summary · xlsx · 1.2 MB · §9.2 · liveCount `welds.total`
2. `RPT-F-002` Rework Queue Report · xlsx · 320 KB · §9.4 · liveCount `welds.rework`
3. `RPT-F-003` Welder Performance Log · pdf · 980 KB · §9.5 · no liveCount
4. `RPT-F-004` Joint History (DWIR) · csv · 2.1 MB · §9.3 · no liveCount

**Erection (3) — §13.x**
5. `RPT-E-001` Erection Progress Dashboard · pdf · 1.5 MB · §13.1 · liveCount `erection.rft`
6. `RPT-E-002` Field Weld Status by Area · xlsx · 640 KB · §13.2 · liveCount `fieldWelds.total`
7. `RPT-E-003` Spool Delivery Readiness · xlsx · 410 KB · §13.4 (cross-ref to E2.3)

**Testpack (3) — §20.x**
8. `RPT-T-001` Testpack Readiness Matrix · xlsx · 880 KB · §20.1 · liveCount `testpack.rflc`
9. `RPT-T-002` Pressure Test Log · pdf · 1.8 MB · §20.3 · no liveCount
10. `RPT-T-003` ISO Status Report · csv · 1.3 MB · §20.2 · liveCount `testpack.total`

**NDE (2) — (cross-§11)**
11. `RPT-N-001` NDE Batch Summary · xlsx · 720 KB · §11.6 · liveCount `batches.active`
12. `RPT-N-002` NDE Overdue Report · pdf · 220 KB · §11.7 · liveCount `batches.overdue`

`lastGeneratedISO` values should look realistic — most within the last 5–10 days, one or two from earlier this month. Use absolute ISO strings, not `new Date()` calls (the screen must render identically on every reload, no hydration mismatch).

Helper at bottom of the file:

```ts
export function formatBytes(bytes: number): string { /* "1.2 MB" / "640 KB" */ }
export function formatRelativeDate(iso: string, now: Date = new Date()): string { /* "2 days ago" / "today" */ }
```

`formatRelativeDate` must be **stable across SSR** — pass `now` from a `useEffect`-set state in the component, not from `new Date()` at render time. Or render the absolute date initially and replace with relative in a `useEffect`. **Re-check the E2.5 fix in commit `7fda1c9`** ("SSR hydration mismatch on date formatting") — apply the same pattern here. This was the bug that already bit us once.

---

## 2. Live counts — `useReportsLiveCounts` selector

In `lib/reports-data.ts` or a sibling `components/reports/use-reports-live-counts.ts`:

```ts
"use client"
import { useWeldsStore, useBatchesStore, useTestpackStore, useErectionStore } from "@/store"

export function useReportsLiveCounts(): Record<NonNullable<ReportDef["liveCountKey"]>, number> {
  const welds = useWeldsStore((s) => s.welds)
  const batches = useBatchesStore((s) => s.batches)
  const testpacks = useTestpackStore((s) => s.packs) // adjust to real key
  const fieldWelds = useErectionStore((s) => s.fieldWelds)

  return useMemo(() => ({
    "welds.total": welds.length,
    "welds.rework": welds.filter(w => w.status === "Rework").length,
    "batches.active": batches.filter(b => b.status === "Issued" || b.status === "Created").length,
    "batches.overdue": batches.filter(b => b.isOverdue).length,
    "testpack.rflc": testpacks.filter(t => t.readyForTest).length,
    "testpack.total": testpacks.length,
    "erection.rft": fieldWelds.filter(w => w.erectionStatus === "RFT").length,
    "fieldWelds.total": fieldWelds.length,
  }), [welds, batches, testpacks, fieldWelds])
}
```

Adjust the actual selector keys to whatever the stores expose today — read each store file first. If a key would require derived calc beyond a one-liner, **drop the `liveCountKey` from that report** rather than complicating the slice.

Where rendered in the row: small muted text under the title, e.g. `"Fabrication Progress Summary — 15 welds tracked"`. If no `liveCountKey`, omit.

---

## 3. Page + view

### `app/reports/page.tsx`

Replace entirely. New body:

```tsx
"use client"
import { Suspense } from "react"
import { ReportsView } from "@/components/reports/reports-view"

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading reports…</div>}>
      <ReportsView />
    </Suspense>
  )
}
```

`Suspense` is required because `ReportsView` uses `useSearchParams()` for the `?category=` sync. Look at how `app/fabrication/weld-progress/page.tsx` did this after E2.3 (the `?spool=` chip).

### `components/reports/reports-view.tsx`

`"use client"`. Composition:

1. **Page header** (top, ~64px tall):
   - Title `Reports` · `text-2xl font-semibold text-slate-900`
   - Subtitle `Generate and export project reports, analytics, and documentation` · `text-sm text-slate-500`
2. **KPI strip** (row of 4 tiles, same density as E2.3 dashboard cards):
   - `12 reports total` (or filtered count)
   - `4 Fabrication`
   - `3 Erection`
   - `3 Testpack` + `2 NDE` — actually use 5 tiles if needed; match the rhythm but don't cram
3. **Filter strip** (sticky-ish, below KPIs):
   - Left: filter chips `All / Fabrication / Erection / Testpack / NDE`. Active chip gets `bg-sky-600 text-white`; inactive `bg-white border-slate-300 text-slate-700`.
   - Right: search input (`Search reports…`, ~280px, leading magnifier icon).
4. **Table**: columns `Title` · `Category` (pill) · `Format` (pill) · `Size` · `Last generated` · `Owner` · `` (Download button, right-aligned).
   - Title cell: bold title + 1-line muted description + optional live-count suffix.
   - Format pill: xlsx → emerald, pdf → red, csv → slate.
   - Category pill: Fabrication → sky, Erection → amber, Testpack → violet, NDE → emerald.
   - Last generated: relative date (`"2 days ago"`) with tooltip showing absolute ISO.
   - Empty state: *"No reports match your filters. Clear filters or try a different search."*

### Download flow

```ts
const handleDownload = async (report: ReportDef) => {
  const filename = buildFilename(report) // "fabrication-progress-2026-05-17.xlsx"
  const t = toast.loading(`Generating ${filename}…`, { duration: 900 + Math.random() * 200 })
  await new Promise(r => setTimeout(r, 900 + Math.random() * 200))
  toast.success(`Downloaded ${filename}`, {
    id: t,
    description: `${report.format.toUpperCase()} · ${formatBytes(report.sizeBytes)}`,
    duration: 4000,
  })
}

function buildFilename(r: ReportDef): string {
  const slug = r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const today = new Date().toISOString().slice(0, 10)
  return `${slug}-${today}.${r.format}`
}
```

The `toast.loading(...)` + `toast.success(..., { id })` pattern updates the same toast in place — confirm this is how `sonner` is wired (check existing toasts in `weld-detail-panel.tsx`; if they use a different pattern, match it).

### URL sync

`useSearchParams()` + `useRouter()` for `?category=Fabrication` etc. Match the pattern from `app/fabrication/weld-progress/page.tsx` (`?spool=` chip). Filter chip click → `router.replace(\`/reports?category=\${cat}\`, { scroll: false })`. Loading the page with `?category=Erection` activates the Erection chip. `?category=All` or missing param → All.

Search input is **not** URL-synced (it's transient).

---

## 4. Layout / responsiveness

- Page max width: same as `/admin` and `/fabrication/dashboard` (likely `max-w-7xl mx-auto` — check existing).
- Table doesn't horizontally scroll on 1280×800. If width is tight, drop the `Owner` column to a tooltip on `Last generated` ("Owned by QC-ENG-01").
- Mobile not required (no other module is mobile-responsive — match that). Just don't break the layout.

---

## 5. Constraints

1. No new npm dependencies.
2. No Zustand store. No persistence.
3. No real file downloads. No `<a download>` tricks. Toast only.
4. `"use client"` on the view, not on the lib.
5. Smallest possible change everywhere outside the new files + the page file.
6. **No changes to `config/navigation.ts`** unless `/reports` is missing (it's not — confirm before claiming).
7. **No changes to any other placeholder page** (`/spooling`, `/documentation`, `/settings`, `/testpack`). Those are Track D / future slices, owned by other agents.
8. No SSR hydration warnings (apply the `7fda1c9` date-formatting pattern).
9. Sidebar nav must continue to show "Reports" — confirm `config/navigation.ts:Reports` is present and visible to the same role(s) as today.

---

## 6. Acceptance criteria

Fresh `localStorage`, `npm run dev`, role `qc_engineer`:

1. Click **Reports** in the sidebar. Page loads. URL is `/reports`. No console errors.
2. Header reads `Reports`. Subtitle is the existing copy.
3. KPI tiles show the right counts (12 / 4 / 3 / 3 / 2).
4. 12 rows render in the table, ordered Fabrication → Erection → Testpack → NDE (or by `id` — your call, but consistent).
5. Row 1 (`RPT-F-001`) shows the title, description, live count suffix `"15 welds tracked"` (or whatever `useWeldsStore` reports today), `xlsx` pill, `1.2 MB`, `Fabrication` pill, relative date, owner, Download button.
6. Click `Fabrication` chip. URL becomes `/reports?category=Fabrication`. Table filters to 4 rows. KPI tile `Fabrication` highlights or stays the same; others muted (visual choice — pick one and stick with it).
7. Refresh on `/reports?category=Erection`. Erection chip is active; table shows 3 erection reports.
8. Type `progress` in search. Table filters to rows whose title or description contains "progress" — should match `RPT-F-001`, `RPT-E-001`. Clear search → all rows back.
9. Click `Download` on `RPT-F-001`. Toast `"Generating fabrication-progress-summary-2026-05-17.xlsx…"` (or current date). After ~1s the **same toast** updates to `"Downloaded fabrication-progress-summary-2026-05-17.xlsx"` with `xlsx · 1.2 MB` description. No double-toast.
10. Format pills: `xlsx` rows show emerald pill, `pdf` rows show red pill, `csv` rows show slate pill. Verify on at least one of each.
11. Hover the `Last generated` cell. Tooltip shows the absolute ISO date.
12. Hover the title. Tooltip shows the manual section reference if present (`§9.2`).
13. Empty-state path: filter `Fabrication` + search `xyz`. Table renders empty-state copy.
14. Switch role to `project_manager` from the top-nav. Page still loads (if Reports is visible to that role). KPI tiles still render.
15. Reload the page 3 times. Render is identical each time — no hydration mismatch warning in the console (this means the relative-date formatting is client-only-mounted, per the §7fda1c9 fix).
16. `Reset Demo` from the top nav. Live counts on the Reports page update (e.g. if rework count was 3, now back to the seed value). Refresh — counts persist.

### Regression

17. `/admin` still loads, all 7 tabs work.
18. `/fabrication/weld-progress?spool=TC-001` still loads with the chip from E2.3.
19. F2 regression: open a weld detail panel, click `Send to NDE` — wizard opens on Step 2 with preselect intact.
20. Sidebar nav: `/reports` link is visible and active when on the page.

### Build

21. `npx tsc --noEmit` clean.
22. `npm run build` clean — no new warnings, especially no `useSearchParams() should be wrapped in suspense boundary` warnings (the `Suspense` is mandatory).
23. No new console errors or hydration warnings on first load.

---

## 7. Definition of done

- New files:
  - `lib/reports-data.ts` — types + `REPORTS_SEED` (12 entries) + `formatBytes` + `formatRelativeDate` helpers.
  - `components/reports/reports-view.tsx` — the full view.
  - Optionally `components/reports/use-reports-live-counts.ts` — only if extracted from the view.
- Modified files:
  - `app/reports/page.tsx` — replaced with thin Suspense + view mount.
  - `docs/PIPEQC_CONTEXT.md` — flip `/reports` from `⚠ placeholder` to `✅` in the file-structure section + add merge log entry.
- All 23 acceptance criteria pass.
- PR description lists: which `liveCountKey`s were wired vs dropped, and which existing patterns were referenced (admin URL-sync, weld-table density, etc.).

---

## 8. Manual self-check before reporting done

1. **The hydration test** (step 15): hard refresh 3 times with DevTools console open. Zero hydration warnings. If you see *"Text content does not match server-rendered HTML"*, the relative-date formatting is rendering during SSR — fix it before claiming done.
2. **The "no other placeholder touched" check**: `git diff --stat main` must show modifications only in `app/reports/`, `components/reports/`, `lib/reports-data.ts`, `docs/PIPEQC_CONTEXT.md`. If `app/spooling/` or any other placeholder shows up — revert it. Those are other agents' lanes.
3. **The size sanity check**: ~300–450 LOC net added. If over 600, you over-engineered the live-counts or built a store (don't).
4. **The toast-update test** (step 9): the `toast.loading` → `toast.success({ id })` pattern updates the same toast row. If you see two toasts stacked, you didn't pass the `id`.
5. **Visual parity with E2.3 dashboard**: open `/erection/dashboard` and `/reports` side by side. KPI tiles should look like siblings, not cousins. Same padding, same icon sizes, same typography weights.

Report files created/modified, the live-count keys wired, and any acceptance step that needed a browser to verify (steps 1–20 do; flag if running terminal-only).
