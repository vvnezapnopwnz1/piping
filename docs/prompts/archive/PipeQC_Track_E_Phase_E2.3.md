# Task: PipeQC Track E2, Phase E2.3 — Spool readiness gate (F↔E handoff)

Read `docs/PIPEQC_CONTEXT.md` and `docs/tracks/track-upstream.md` first. Tracks A (A1–A6), B (B1–B2), E2.1, and N1+N2 are merged.

This slice implements the **F → E handoff** that is currently invisible in the UI. Today the fabrication welds-store and the erection module are disconnected: a spool's `erectionStatus` lives in `erection-store.ts` regardless of whether any of its welds have been Accepted. Hassan (the Erection Superintendent) has no way to know *"is this spool safe to install or am I about to weld a piece that still has an open rejection in fabrication?"* — exactly the persona pain captured in `track-upstream.md` §2.

This is **demo step 7** of the upstream narrative (`track-upstream.md` §3):

> Hassan opens `/erection/dashboard`. Spool TC-001 shows **"Ready for delivery"** because all its welds are Accepted. The other 18 spools sitting at site for &gt; 7 days are still **Blocked** because they have open rejections. *"Раньше бы повезли вслепую."*

The doc lists E2.3 as ⭐⭐⭐ — *"ключевой бизнес-смысл связки F↔E"*. This is a small slice (~0.5 day) but it's the slice that makes the whole upstream demo *mean something*.

## Goal

A pure derived selector that rolls weld-level Accepted state up to spool-level, plus a visible widget on the erection dashboard that surfaces it.

1. New selector `useSpoolReadiness()` in `store/welds-store.ts` (or a new `store/spool-readiness.ts` if you prefer — pick one, justify in PR). Groups `welds-store` records by `spoolNo`, returns `SpoolReadiness[]` with status pill per spool.
2. New widget on `components/erection-dashboard.tsx`: a card titled **"Spool delivery readiness"** showing one row per spool — spool no, weld counts (total / accepted / rejected / rework / in-progress), and a status pill.
3. A KPI tile **"Spools ready for delivery"** added as a 5th tile in the existing KPI strip — or, if the strip is locked to 4 columns, replace the most-static existing tile (`Total Spools (Site Scope) — 2,418`). Prefer addition over replacement; only swap if it visibly breaks the layout.
4. Click-through: clicking a spool row deep-links to `/fabrication/weld-progress?spool=<spoolNo>` (the page must accept this query param and pre-filter — see "Wire-up" §3 below).

**No** mutations, no new UI state, no new dependencies. This is purely **a read-side derivation** + **two new presentational chunks**.

**Do not** rewrite the erection dashboard charts (E2.2's job). Do not touch testpack / NDE / admin / Track A flows.

## Reference — existing files to read first

- `store/welds-store.ts` — `WeldJoint` shape (note `spoolNo: string`, `status: WeldStatus`). Seed welds have spools like `PL-TK100-001-A`, `PL-CW200-003-A`, etc. (15 seed welds across ~9 spools — small enough that the readiness table fits on one screen.)
- `lib/weld-data.ts` — actual spool naming convention (`PL-<system>-<run>-<segment>`). The demo narrative says *"TC-001"* hypothetically; the real seed uses `PL-...`. Use the real names.
- `components/erection-dashboard.tsx` — the current dashboard. KPI strip is around lines 254–331 (`Total Spools / Spools Erected / Field Joints Welded / RFT Achieved`). Charts begin at line 333. Add the new section **between** the KPI strip and the charts, or above the existing "Critical Spools at Site" section (whichever flows better visually).
- `components/status-badge.tsx` — use this for the pill. Do not roll your own. If none of the existing variants match, add a `delivery_ready / delivery_blocked / delivery_in_fab / delivery_idle` variant set with the colors below.
- `components/erection/field-weld-table.tsx` — reference density for the spool table.
- `app/fabrication/weld-progress/page.tsx` — already has filter state for status. The `?spool=` query-param handler is the only change needed there.

## Selector design — `useSpoolReadiness()`

Place it at the bottom of `store/welds-store.ts`, near `useWeldsKPIs`. Export it alongside.

```ts
export type SpoolReadinessStatus =
  | "Ready for delivery"     // every weld in the spool has status "Completed"
  | "Blocked"                // any weld is "Rejected" or "Rework"
  | "In fabrication"         // no rejects, but some welds are "In Progress" / "On Hold"
  | "Not started"            // every weld is "Not Started"

export interface SpoolReadiness {
  spoolNo: string
  total: number
  completed: number
  rejected: number
  rework: number
  inProgress: number   // includes "In Progress" + "On Hold"
  notStarted: number
  status: SpoolReadinessStatus
  isoNo: string        // pick from the first weld; spool belongs to exactly one ISO
}

export const useSpoolReadiness = (): SpoolReadiness[] => {
  const welds = useWeldsStore((s) => s.welds)
  return useMemo(() => {
    const map = new Map<string, WeldJoint[]>()
    for (const w of welds) {
      const list = map.get(w.spoolNo) ?? []
      list.push(w)
      map.set(w.spoolNo, list)
    }

    const rows: SpoolReadiness[] = []
    for (const [spoolNo, group] of map) {
      const c = group.filter((w) => w.status === "Completed").length
      const r = group.filter((w) => w.status === "Rejected").length
      const rw = group.filter((w) => w.status === "Rework").length
      const ip = group.filter((w) => w.status === "In Progress" || w.status === "On Hold").length
      const ns = group.filter((w) => w.status === "Not Started").length

      let status: SpoolReadinessStatus
      if (r > 0 || rw > 0) status = "Blocked"
      else if (c === group.length) status = "Ready for delivery"
      else if (ns === group.length) status = "Not started"
      else status = "In fabrication"

      rows.push({
        spoolNo,
        total: group.length,
        completed: c,
        rejected: r,
        rework: rw,
        inProgress: ip,
        notStarted: ns,
        status,
        isoNo: group[0]?.isoNo ?? "",
      })
    }

    // Sort: Ready first (newest demo-relevant), then Blocked, then In fabrication, then Not started.
    // Within each group, sort by spoolNo ascending.
    const order: Record<SpoolReadinessStatus, number> = {
      "Ready for delivery": 0,
      "Blocked": 1,
      "In fabrication": 2,
      "Not started": 3,
    }
    return rows.sort((a, b) => order[a.status] - order[b.status] || a.spoolNo.localeCompare(b.spoolNo))
  }, [welds])
}
```

If you split this into a new file, the new file is `"use client"`, imports `useWeldsStore` + `WeldJoint`, and is re-exported from `store/index.ts`. State the rationale in the PR; either choice is acceptable.

## UI — `components/erection-dashboard.tsx`

### 1. KPI tile

Find the 4-tile KPI grid (around lines 254–331). Add a 5th tile **before** the existing `Total Spools` tile (so it reads left-to-right: *Ready for delivery → Total Spools → Spools Erected → Field Joints Welded → RFT Achieved*).

The grid's column class is `lg:grid-cols-4`. Bump to `lg:grid-cols-5 xl:grid-cols-5`. Verify visually that on a 1280px viewport the tiles still breathe — if they look cramped, fall back to `lg:grid-cols-5 2xl:grid-cols-5` and let smaller screens wrap.

Tile contents:

- Description (small caps muted): `Spools ready for delivery`
- Icon: `Truck` or `PackageCheck` from `lucide-react` (already a dep)
- Title (3xl bold): `{readyCount}` where `readyCount = spoolReadiness.filter(s => s.status === "Ready for delivery").length`
- Body: `{blockedCount} blocked · {inFabCount} in fab` (muted)
- Footer: emerald-600 link `View details ↓` that scrolls to the new "Spool delivery readiness" card (anchor `#spool-readiness`)

### 2. Spool delivery readiness card

Insert between the KPI strip and the existing charts (around line 332, before the `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` that contains the two big charts).

```tsx
<Card id="spool-readiness">
  <CardHeader>
    <CardTitle className="text-sm font-medium">Spool delivery readiness</CardTitle>
    <CardDescription>
      Every shop spool must have all its welds Accepted before site delivery. Live view from fabrication QC.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Spool</TableHead>
          <TableHead>ISO</TableHead>
          <TableHead className="text-right">Welds</TableHead>
          <TableHead className="text-right">Accepted</TableHead>
          <TableHead className="text-right">Rejected</TableHead>
          <TableHead className="text-right">Rework</TableHead>
          <TableHead className="text-right">In progress</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {readiness.map(row => (
          <TableRow
            key={row.spoolNo}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => router.push(`/fabrication/weld-progress?spool=${encodeURIComponent(row.spoolNo)}`)}
          >
            <TableCell className="font-mono">{row.spoolNo}</TableCell>
            <TableCell className="font-mono text-slate-600">{row.isoNo}</TableCell>
            <TableCell className="text-right">{row.total}</TableCell>
            <TableCell className="text-right text-emerald-700">{row.completed}</TableCell>
            <TableCell className={`text-right ${row.rejected > 0 ? "text-red-600 font-medium" : "text-slate-400"}`}>{row.rejected}</TableCell>
            <TableCell className={`text-right ${row.rework > 0 ? "text-amber-700 font-medium" : "text-slate-400"}`}>{row.rework}</TableCell>
            <TableCell className="text-right text-slate-600">{row.inProgress}</TableCell>
            <TableCell><SpoolReadinessPill status={row.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

Pill colors (use `status-badge.tsx` variants):

| Status | Bg / text | Existing variant if available |
| --- | --- | --- |
| Ready for delivery | `bg-emerald-50 text-emerald-700 border-emerald-200` | reuse `accepted` / `completed` |
| Blocked | `bg-red-50 text-red-700 border-red-200` | reuse `rejected` |
| In fabrication | `bg-sky-50 text-sky-700 border-sky-200` | reuse `in_progress` |
| Not started | `bg-slate-50 text-slate-600 border-slate-200` | reuse `not_started` |

If `status-badge.tsx` doesn't have suitable variants, add a thin `SpoolReadinessPill` component co-located in `erection-dashboard.tsx` rather than expanding the global badge component. Keep it ≤ 25 LOC.

`router.push` comes from `next/navigation` — top of file: `import { useRouter } from "next/navigation"`. If the dashboard is currently a server component, mark it `"use client"` (read first to confirm; the rest of the codebase is client-only by convention, so it likely already is).

## Wire-up

### 1. `store/welds-store.ts`

Add `SpoolReadinessStatus`, `SpoolReadiness`, `useSpoolReadiness` as shown above. Re-exports flow through `store/index.ts` automatically (it does `export * from "./welds-store"`).

### 2. `components/erection-dashboard.tsx`

- Add the 5th KPI tile.
- Add the `<Card id="spool-readiness">` table card.
- Import `useSpoolReadiness`, `useRouter`, `Truck` / `PackageCheck`, `Table*` from shadcn, `Card*` already imported.
- Wrap the KPI tile's `View details` footer link in an `<a href="#spool-readiness">` so it works without JS too.

### 3. `app/fabrication/weld-progress/page.tsx`

The page currently has a status filter via `useState` (or similar). Add a one-time URL-param hydration on mount:

```ts
const searchParams = useSearchParams()
useEffect(() => {
  const spool = searchParams.get("spool")
  if (spool) {
    setSpoolFilter(spool)  // whatever the existing filter state hook is called
  }
}, [searchParams])
```

If the page does not currently support a spool filter (only status / area / welder), add a minimum `spoolFilter: string | null` to the filter sidebar — a single-string match against `weld.spoolNo`. Render a clearable chip near the top of the filtered table: `Spool: PL-TK100-001-A ✕`.

Look at `filter-sidebar.tsx` to see whether adding a Spool filter input fits the existing UI. If it requires &gt; 30 LOC of UI changes to expose a permanent filter, **skip the sidebar control** and instead:

- Apply the `?spool=` filter silently on mount
- Show only the clearable chip above the table
- Removing the chip clears the filter

This keeps the slice small. The full sidebar Spool filter can be added later if needed.

### 4. (Optional) Home page

If `useSpoolReadiness().filter(s => s.status === "Ready for delivery").length > 0` AND there is no existing seed notification of category `weld_progress` for those spools, do **NOT** auto-create one in this slice. Notifications are seed-managed elsewhere; adding a derived notification here would be scope creep.

## Constraints

1. No new npm dependencies.
2. `"use client"` on the dashboard (verify, don't blindly add).
3. The new selector must NOT cause infinite re-renders. Use `useMemo` with `welds` as the dependency. Don't call selectors inside render that re-create the array on every paint.
4. Do not touch `erection-store.ts`, `testpack-store.ts`, NDE files, Track A/B screens.
5. Do not refactor the existing 4-tile KPI strip styling beyond the column-count change.
6. Smallest possible change to `app/fabrication/weld-progress/page.tsx` — preserve the existing filter behavior.
7. No backend, no fetch.
8. Tile + table both must work with **0 spools, 1 spool, and the full seed set** — no empty-state crashes.

## Acceptance criteria

Fresh localStorage, `npm run dev`:

1. `/erection/dashboard` loads. The KPI strip now shows 5 tiles. The leftmost is "Spools ready for delivery" with a non-zero count derived from the welds-store seed.
2. The body shows a new card "Spool delivery readiness" listing every distinct spool from the welds-store. Ready-status rows appear at the top; Blocked rows next; In fabrication and Not started below.
3. Counts per row reconcile: `accepted + rejected + rework + inProgress + notStarted === total`.
4. Status pill matches the rule: all Completed → Ready; any Rejected/Rework → Blocked; otherwise In fabrication / Not started.
5. Click a "Ready for delivery" spool row → navigates to `/fabrication/weld-progress?spool=<spoolNo>`. Page loads with the filter applied. A clearable chip shows `Spool: <spoolNo>`. Clicking ✕ on the chip clears the filter and removes the query param from the URL.
6. Click a "Blocked" spool row → same navigation, same filter. Page shows the same spool's welds, including the rejected one.
7. Go to `/nde`, open seed batch `BTH-2025-0151` (which has 2 Rejected welds in spool `PL-TK100-001-B` and `PL-TK100-004-A` per the seed data). Open the new Receive-Results panel from N2 on a different batch and reject one of its welds with cascade → return to `/erection/dashboard` → that spool's status flips from "Ready" / "In fabrication" to "Blocked", live, without a refresh.
8. Refresh `/erection/dashboard`. The new card persists state correctly (because welds-store is already persisted).
9. `Reset Demo` from top nav. Card returns to the initial seed-derived view.
10. **Regression — E2.1**: `/erection/weld-progress` — edit a field weld erection status, refresh, edit persists. Untouched.
11. **Regression — N1**: `/nde` → `+ Create new batch` → wizard still opens and creates batches. Untouched.
12. **Regression — A1 + Track B**: `/admin?tab=teams` → add a team → it appears in the Line-Check Preparation team picker. Untouched.
13. `npx tsc --noEmit` — clean.
14. `npm run build` — clean.

### Numeric sanity check

Run a manual count against `WELD_DATA` in `lib/weld-data.ts`:

- Distinct spools in seed ≈ 9 (sample: `PL-TK100-001-A`, `PL-TK100-001-B`, `PL-CW200-003-A`, `PL-CW200-003-B`, `PL-FU300-007-A`, `PL-TK100-002-A`, `PL-TK100-002-B`, `PL-CW200-005-A`, ...).
- The card should show that many rows. If it shows fewer, your grouping is wrong; if more, you're rendering empty groups or duplicates.

Confirm the actual numbers against the seed when verifying — don't trust this estimate.

## Definition of done

- New code: `useSpoolReadiness` + `SpoolReadiness` + `SpoolReadinessStatus` exported from `store/welds-store.ts` (or new `store/spool-readiness.ts` if you chose that).
- Modified: `components/erection-dashboard.tsx` (5th KPI tile + new card), `app/fabrication/weld-progress/page.tsx` (URL-param hydration + chip), possibly `components/filter-sidebar.tsx` (skip if it bloats the slice — chip-only is fine).
- `docs/PIPEQC_CONTEXT.md` merge log: append an `E2.3` entry noting the new selector + dashboard widget + `?spool=` deep-link.
- `docs/tracks/track-upstream.md` Track E2 table: mark E2.3 ✅ Merged.
- All 14 acceptance criteria pass.
- PR description states: (a) whether the selector lives in `welds-store.ts` or a new file, and why; (b) whether the spool filter was added to the sidebar or stays as a URL-param-only chip; (c) screenshot of the new dashboard widget if running with browser access.

## Self-check before reporting done

1. Acceptance step 7 (live cross-store recompute) is the demo-killer — if the dashboard doesn't reflect a NDE Reject without refresh, the F↔E story falls apart. Run it manually.
2. Step 5 (deep-link with chip) is the second-most-important — Hassan must be able to click into the rejection. Verify the chip clears cleanly.
3. Size sanity: this slice should add ~120–180 LOC (selector + tile + table card) + ~20 LOC for the URL-param hydration. If you are touching erection-store, testpack-store, or any A/B/N files, you are out of scope.
4. `npm run build` clean — no `useSearchParams` warnings about missing `Suspense` boundary (Next.js 14 requires `useSearchParams` to be inside `<Suspense>` for static export — wrap the affected page section if the build complains).

Report files created/modified, the two PR choices listed above, and any acceptance step you could not verify manually (steps 1–9 require a browser; flag honestly if running terminal-only).
