# Phase 5 — Spool Tracking: from mock dashboard to live tracking module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully-mock `/tracking` dashboard with a **derived-from-real-stores** Spool Tracking module that closes roadmap_v3 Phase 5 slices 5.1–5.5 **plus** the Easy Piping module-specific findings from `presentation_findings.md` §#5 that v3 omitted (4-tab Data Analysis IA per CC-11, manual relocate with audit-preserving history per CC-12, Excel-then-Zebra barcode printing basket per CC-13, "active spool" derived flag).

Phase 5 closes **PM matrix B4** (`❌ Spool Tracking dashboard` → ✅) and **Subcontractor matrix B8** (`❌ Scope-locked barcode / spool tracking` → ✅ core).

**Critical context discovered during code audit:**

- **`/tracking` today is mock-only.** [components/spool-tracking-dashboard.tsx](components/spool-tracking-dashboard.tsx) is 1132 lines of hardcoded `spoolRows`, `locationTiles`, `inconsistencies`, `transitAlerts`, `devices`, `scanTrendData` arrays. **No** connection to `useSpoolsStore`, `useLaydownStore`, `useToSiteStore`, `useErectedStore`, `useWeldsStore`. It's a Figma-fidelity preview, not a working module. The shape (KPI strip → site location map → spool list → inconsistencies + transit-out panels) is **good** and should be preserved; only the data sources need to be swapped to real derivation + a new tracking-events store.
- **No location-events store exists.** Yard placement is in `useLaydownStore` (`yardLocation: YardLocation`), site receipt is in `useToSiteStore` (`receivedDate`), but **there is no per-spool location history** ("Location OUT at T → Location IN at T+Δ"). Per [presentation_findings.md:944](docs/research/presentation_findings.md#L944) "Add" button on Spool Location tab "**creates a new history record** (audit-preserving, not destructive overwrite)" — we need a fresh `useSpoolTrackingStore` to hold these movement events and derive Current Location + Days In Location + Transit-Out flag from them.
- **Roadmap_v3 v3 vs. presentation_findings #5 — v3 missed 4 substantive items.** v3 lists 5 slices (KPI strip; yard/shop map; inconsistency/transit-out flags; movement audit log; scope lock). Presentation #5 adds: (a) **4-tab Data Analysis IA** — Spool Location / Location / Design Area / Consolidation Reports tabs (each a different lens on the same data); (b) **"Active spool" derived flag** (CC-11: `Start Fab IS NOT NULL AND Erection IS NULL`) used to gate the dashboard count + exclude erected spools from active views; (c) **Manual relocate creates a new history record** — append-only audit trail, not overwrite; (d) **Barcode printing = Excel-then-Zebra two-column basket** (CC-13). We bundle all four into this phase rather than deferring to Phase 7 because they're **structurally part of the module**, not polish.
- **The `Print barcodes` button at line 851 of the current dashboard is mocked.** Per CC-13, real Easy Piping flow is a separate basket screen (left = search by iso / barcode, right = selected spools, click "Export" → Excel). We build it as Sub-task 4 — a stand-alone `/tracking/print-barcodes` route — rather than a header button, matching the Easy Piping module structure.
- **PM B4 vs Subcontractor B8 — same screen, different scope.** PM sees **all** spools, all PDS areas. Subcontractor sees only spools whose `pdsAreaCode` belongs to their assigned areas (existing `useScopeLock()` hook from Phase 2 Task 6). The dashboard, location tiles, spool table, and inconsistencies all opt into `scope.isInScope(spool.pdsAreaCode)` filter chain. We do NOT carry over the "Print barcodes" demo button into the subcontractor view — Easy Piping reserves barcode export to System/Project Admin; the basket screen is gated behind the same role check.
- **PDA device cards are pure fantasy on demo data.** PipeQC has no `pda_user` role (per [docs/role_matrix/subcontractor.md:177](docs/role_matrix/subcontractor.md#L177)) and no scan ingestion. The current mock with battery + last-sync looks great in screenshots but represents zero implementation. Decision: keep the PDA card as **explicit demo-data with a "Demo data" chip** in the corner — honesty marker against the rest of the dashboard being live. Per CC-12 + roadmap_v3 explicit defers (`PDA scanning offline (sub.B10) — defer indefinitely`), we don't try to wire PDA flows here.
- **"Active spool" filter (CC-11) requires a `is_active` derivation.** Easy Piping definition: spool has `Start Fab date` AND not yet `Erection date`. PipeQC equivalent: derive `isActive` from `useSpoolFabStage()` + `useErectedStore`. A spool is **active** if its fab stage has progressed past "Awaiting Material" (≈ Start Fab) AND it has no `erected-store` confirmation yet. Active count = dashboard headline; non-active spools (erected) hidden from Location and Design Area tabs but still queryable via Spool Location search.
- **No `pdsAreaCode` on spool data today.** [lib/spool-data.ts](lib/spool-data.ts) ships `Spool` records without a `pdsAreaCode` field. Scope-lock filter from Phase 2 Task 6 is opt-in and passes through when undefined — same pattern continues here. Phase 7 / Phase 0 (admin agent) will extend `Spool` shape with `pdsAreaCode` derived from spool naming convention; until then, the scope-lock filter is a documented no-op on demo data.
- **`maxTransitTime` already lives on `useAdminStore.projectDefinition`.** Per [docs/role_matrix/system_admin.md](docs/role_matrix/system_admin.md) sa.B1 (✅ Phase 0). The current dashboard hard-codes "> 2 days" — we replace this with `projectDefinition.maxTransitTime` (default 2 days if unset). This is the **only** Phase 0 dependency for Phase 5.
- **Notifications are not wired.** A spool flipping into Transit-Out state should push a notification (per Phase 4 patterns + CC-21 transit-out is investigative). Add `useNotificationsStore.getState().pushNotification()` calls when a fresh transit-out flag fires.

**Architecture:** New `store/spool-tracking-store.ts` holds `LocationEvent[]` (per-spool append-only history) + `SpoolLocation` derivation. The 1132-line `spool-tracking-dashboard.tsx` is **decomposed** into modular components matching Easy Piping's 4-tab IA. PDA card stays cosmetic. Scope-lock + PM write-lock are wired throughout.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Zustand 5 + persist · Tailwind CSS · shadcn/ui (new-york) · lucide-react · sonner (toasts) · recharts (already used) · `xlsx` (NEW — for barcode export; install via `npm install xlsx @types/xlsx`)

> **Read before writing code:**
> - `docs/PIPEQC_CONTEXT.md` — full stack, store patterns
> - `docs/roadmap_v3.md` Phase 5 section (5.1–5.5 + Closure criteria)
> - `docs/research/presentation_findings.md` §#5 Spool Tracking (lines 890–1080) — module-specific findings, 4-tab IA, CC-11 active flag, CC-12 offline, CC-13 Zebra integration
> - `docs/role_matrix/project_manager.md` B4 spec (lines 111, 137)
> - `docs/role_matrix/subcontractor.md` B8 spec (lines 159–166, 223)
> - `docs/role_matrix/system_admin.md` sa.B1 `maxTransitTime` field
> - `components/spool-tracking-dashboard.tsx` — current 1132-line mock (to be decomposed; keep visual fidelity)
> - `lib/spool-data.ts` — `Spool`, `YARD_LOCATIONS`, `LaydownRecord`
> - `store/spools-store.ts` — `useSpoolsStore`
> - `store/laydown-store.ts` — `useLaydownStore` (yard placement)
> - `store/to-site-store.ts` — `useToSiteStore` (site receipt)
> - `store/erected-store.ts` — used by `isActive` derivation
> - `store/spool-stage.ts` — `deriveSpoolFabStage()` (already in lib/spool-data.ts re-exported)
> - `lib/scope-lock.ts` — `useScopeLock()` hook (Phase 2 Task 6)
> - `lib/pm-write-lock.ts` — `usePmWriteLock()` hook (Phase 2 Task 5)
> - `store/admin-store.ts` — `useAdminStore((s) => s.projectDefinition.maxTransitTime)`, `usePdsAreas()`
> - `store/notifications-store.ts` — `pushNotification({severity, category, title, description, href})`
> - `components/erection/erected-detail-panel.tsx` — Sheet pattern reference for new spool-tracking-detail-panel
> - `components/pm-write-lock-banner.tsx` — banner mount pattern

---

## Design conventions (critical — match existing screens)

| Pattern | Where to copy from |
|---|---|
| KPI strip cards | current `components/spool-tracking-dashboard.tsx:91–124` (already good — re-use as `<TrackingKpiStrip />`) |
| Site location map (capacity tiles) | current `getCapacityTone()` + tile loop (lines 134–172, 603–675) — re-use verbatim, swap data source |
| Detail Sheet | `components/erection/erected-detail-panel.tsx`, `components/fabrication/qc-release-detail-panel.tsx` |
| Tab navigation (4-tab Data Analysis) | `components/spool-explorer.tsx` or shadcn `<Tabs>` |
| Mutation delay | `await new Promise(r => setTimeout(r, 500))` before store update (matches manual-relocate UX) |
| Toast on mutation | `import { toast } from "sonner"; toast.success("...")` |
| Notification feed | `useNotificationsStore.getState().pushNotification({...})` — uses `category`/`description` |
| PM write-lock banner | `<PmWriteLockBanner />` near SheetHeader; `disabled={... || pmLocked}` on Manual Relocate / Export buttons |
| Scope lock filter | `const scope = useScopeLock(); if (!scope.isInScope(spool.pdsAreaCode)) return false` inside row filter chain |
| Colors | sky=info, amber=pending/inconsistency, emerald=done/active, red=transit-out/blocked, violet=in-review, slate=erected/read-only |
| All components | `"use client"` — no server components |

---

## File structure

### New files
- **Create:** `store/spool-tracking-store.ts` — `LocationEvent[]` history + actions (`recordMovement`, `manualRelocate`) + selectors (`getCurrentLocation`, `getMovementHistory`, `getActiveSpools`, `getInconsistencyFlags`, `getTransitOutFlags`)
- **Create:** `lib/spool-tracking.ts` — pure derivation helpers (`deriveCurrentLocation`, `deriveIsActive`, `deriveInconsistencyFlag`, `deriveTransitOutFlag`)
- **Create:** `components/tracking/tracking-kpi-strip.tsx` — top 4 KPI cards (derived)
- **Create:** `components/tracking/tracking-location-map.tsx` — capacity tiles (derived)
- **Create:** `components/tracking/tracking-scan-trend.tsx` — 14-day scan trend chart (cosmetic, demo-data chip)
- **Create:** `components/tracking/tracking-pda-card.tsx` — PDA device list (cosmetic, demo-data chip)
- **Create:** `components/tracking/tracking-spool-table.tsx` — live spool location list (replaces lines 796–1023)
- **Create:** `components/tracking/tracking-detail-panel.tsx` — Sheet: spool location history + manual relocate
- **Create:** `components/tracking/tracking-inconsistency-panel.tsx` — derived inconsistency list (replaces lines 1063–1095)
- **Create:** `components/tracking/tracking-transit-out-panel.tsx` — derived transit-out list (replaces lines 1097–1129)
- **Create:** `components/tracking/tracking-data-analysis-tabs.tsx` — 4-tab IA wrapper (Spool Location / Location / Design Area / Consolidation Reports)
- **Create:** `components/tracking/tracking-data-analysis-location-tab.tsx` — Tab 2: by-location drill-down
- **Create:** `components/tracking/tracking-data-analysis-design-area-tab.tsx` — Tab 3: by-design-area drill-down
- **Create:** `components/tracking/tracking-data-analysis-consolidation-tab.tsx` — Tab 4: flag reports
- **Create:** `components/tracking/tracking-barcode-basket-view.tsx` — 2-column basket → Excel export
- **Create:** `app/tracking/print-barcodes/page.tsx` — basket route
- **Create:** `app/tracking/data-analysis/page.tsx` — 4-tab Data Analysis route
- **Create:** `components/tracking/active-spool-chip.tsx` — small chip indicating CC-11 active status

### Modified files
- **Modify:** `components/spool-tracking-dashboard.tsx` — decompose into wrappers around new components (or replace entirely)
- **Modify:** `app/tracking/page.tsx` — wire to decomposed dashboard
- **Modify:** `config/navigation.ts` — add sub-nav for `/tracking`, `/tracking/data-analysis`, `/tracking/print-barcodes`
- **Modify:** `store/demo-store.ts` — cascade `useSpoolTrackingStore.getState().resetTracking()`
- **Modify:** `store/index.ts` — re-export new store
- **Modify:** `lib/spool-data.ts` — add optional `pdsAreaCode?: string` to `Spool` shape (no-op until populated; harmless type extension)
- **Modify:** `package.json` — add `xlsx` and `@types/xlsx` deps

---

## Task 1 — New `spool-tracking-store.ts` + derivation helpers

**Files:**
- Create: `lib/spool-tracking.ts`
- Create: `store/spool-tracking-store.ts`
- Modify: `store/index.ts`
- Modify: `store/demo-store.ts`

**What this builds:** The data backbone of Phase 5. A `LocationEvent` is an append-only entry like `{ spoolNo, location, eventType: "IN" | "OUT" | "MANUAL", at, by, reason? }`. Pure derivations in `lib/spool-tracking.ts` compute the per-spool current location, active flag (CC-11), inconsistency flag, and transit-out flag without touching React. The store wraps the events array + actions + a small selector layer for performance. We **seed** the store with events synthesized from existing `useLaydownStore` + `useToSiteStore` records on first load, so the demo immediately has movement history without manual setup.

- [ ] **Step 1: Create `lib/spool-tracking.ts` with derivation helpers**

```typescript
import type { Spool } from "@/lib/spool-data"
import type { SpoolFabStage } from "@/lib/spool-data"

export type TrackingLocationCategory =
  | "Fab shop"
  | "Paint shop"
  | "Laydown"
  | "Erection area"
  | "Transit"

export interface LocationDef {
  name: string
  category: TrackingLocationCategory
  capacity: number
}

export const TRACKING_LOCATIONS: LocationDef[] = [
  { name: "Fab Shop A", category: "Fab shop", capacity: 350 },
  { name: "Fab Shop B", category: "Fab shop", capacity: 250 },
  { name: "QC Hold Area", category: "Fab shop", capacity: 60 },
  { name: "Paint Shop", category: "Paint shop", capacity: 200 },
  { name: "Laydown Yard 1", category: "Laydown", capacity: 400 },
  { name: "Laydown Yard 2", category: "Laydown", capacity: 400 },
  { name: "Final QC Yard", category: "Laydown", capacity: 100 },
  { name: "Pre-erection", category: "Erection area", capacity: 200 },
  { name: "Erection North", category: "Erection area", capacity: 120 },
  { name: "Erection East", category: "Erection area", capacity: 150 },
  { name: "Erection South", category: "Erection area", capacity: 120 },
  { name: "Erection West", category: "Erection area", capacity: 120 },
]

export type LocationEventType = "IN" | "OUT" | "MANUAL"

export interface LocationEvent {
  id: string
  spoolNo: string
  location: string             // free text + must match TRACKING_LOCATIONS.name for capacity computation
  eventType: LocationEventType
  at: string                   // ISO datetime
  by: string                   // user id / role label
  reason?: string              // required when eventType === "MANUAL"
}

export interface CurrentLocationResult {
  location: string             // "Transit out" if last event was OUT with no later IN
  daysInLocation: number
  lastScan: string             // ISO datetime
  isTransitOut: boolean
}

/**
 * Reduce events for a single spool to the current location + days held.
 * Append-only: never mutates the events list. Events ordered ASC by `at` upstream.
 */
export function deriveCurrentLocation(events: LocationEvent[], now: Date = new Date()): CurrentLocationResult | null {
  if (events.length === 0) return null
  const last = events[events.length - 1]
  const isTransitOut = last.eventType === "OUT"
  const millis = now.getTime() - new Date(last.at).getTime()
  const daysInLocation = Math.max(0, Math.floor(millis / (1000 * 60 * 60 * 24)))
  return {
    location: isTransitOut ? "Transit out" : last.location,
    daysInLocation,
    lastScan: last.at,
    isTransitOut,
  }
}

/**
 * CC-11 "active spool" — Easy Piping definition: Start Fab IS NOT NULL AND Erection IS NULL.
 * PipeQC mapping: fab stage past "Awaiting Material" AND no erected record.
 */
export function deriveIsActive(fabStage: SpoolFabStage | undefined, hasErected: boolean): boolean {
  if (hasErected) return false
  if (!fabStage || fabStage === "Awaiting Material") return false
  return true
}

/**
 * Inconsistency: PSMS status of spool ≠ expected location.
 * Examples: status=Painted but location is Fab Shop; status=Erected but location is Laydown.
 */
export function deriveInconsistencyFlag(
  fabStage: SpoolFabStage | undefined,
  location: string | undefined,
): { isInconsistent: boolean; reason?: string } {
  if (!fabStage || !location) return { isInconsistent: false }
  if (fabStage === "Painted" && location.toLowerCase().includes("fab shop")) {
    return { isInconsistent: true, reason: `Status 'Painted' but located in ${location}` }
  }
  if (fabStage === "Erected" && (location.toLowerCase().includes("laydown") || location.toLowerCase().includes("fab"))) {
    return { isInconsistent: true, reason: `Status 'Erected' but located in ${location}` }
  }
  if (fabStage === "Final QC" && location.toLowerCase().includes("paint shop")) {
    return { isInconsistent: true, reason: `Status 'Final QC' but located in ${location}` }
  }
  return { isInconsistent: false }
}

/**
 * Transit-out: last event is OUT, no matching IN within `maxTransitDays` (from admin projectDefinition).
 */
export function deriveTransitOutFlag(
  events: LocationEvent[],
  maxTransitDays: number,
  now: Date = new Date(),
): { isTransitOut: boolean; outFor?: number; fromLocation?: string } {
  if (events.length === 0) return { isTransitOut: false }
  const last = events[events.length - 1]
  if (last.eventType !== "OUT") return { isTransitOut: false }
  const days = Math.floor((now.getTime() - new Date(last.at).getTime()) / (1000 * 60 * 60 * 24))
  if (days < maxTransitDays) return { isTransitOut: false }
  return { isTransitOut: true, outFor: days, fromLocation: last.location }
}
```

- [ ] **Step 2: Create `store/spool-tracking-store.ts`**

```typescript
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { LocationEvent, LocationEventType } from "@/lib/spool-tracking"
import { LAYDOWN_SEED } from "@/lib/spool-data"
import { TO_SITE_SEED } from "@/lib/spool-data"

function seedFromExistingRecords(): LocationEvent[] {
  const events: LocationEvent[] = []
  // Yard placement → IN on yardLocation
  LAYDOWN_SEED.forEach((r) => {
    events.push({
      id: `evt-yard-${r.spoolNo}`,
      spoolNo: r.spoolNo,
      location: r.yardLocation,
      eventType: "IN",
      at: `${r.placedDate}T08:00:00Z`,
      by: r.placedBy,
    })
    if (r.releasedToSiteDate) {
      events.push({
        id: `evt-yard-out-${r.spoolNo}`,
        spoolNo: r.spoolNo,
        location: r.yardLocation,
        eventType: "OUT",
        at: `${r.releasedToSiteDate}T16:00:00Z`,
        by: r.releasedBy ?? r.placedBy,
      })
    }
  })
  // To-site receipt → IN on Pre-erection
  TO_SITE_SEED.forEach((r) => {
    events.push({
      id: `evt-site-${r.spoolNo}`,
      spoolNo: r.spoolNo,
      location: "Pre-erection",
      eventType: "IN",
      at: `${r.receivedDate}T09:00:00Z`,
      by: r.receivedBy ?? "ERECTION-FM",
    })
  })
  // Sort ASC by at
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return events
}

interface SpoolTrackingState {
  events: LocationEvent[]
  // append-only — never mutates earlier entries
  recordMovement: (e: Omit<LocationEvent, "id" | "at"> & { at?: string }) => void
  manualRelocate: (spoolNo: string, location: string, by: string, reason: string) => void
  getEventsForSpool: (spoolNo: string) => LocationEvent[]
  resetTracking: () => void
}

export const useSpoolTrackingStore = create<SpoolTrackingState>()(
  persist(
    (set, get) => ({
      events: seedFromExistingRecords(),

      recordMovement: (e) =>
        set((state) => ({
          events: [
            ...state.events,
            {
              ...e,
              id: `evt-${e.spoolNo}-${Date.now()}`,
              at: e.at ?? new Date().toISOString(),
            },
          ],
        })),

      manualRelocate: (spoolNo, location, by, reason) =>
        set((state) => ({
          events: [
            ...state.events,
            {
              id: `evt-manual-${spoolNo}-${Date.now()}`,
              spoolNo,
              location,
              eventType: "MANUAL",
              at: new Date().toISOString(),
              by,
              reason,
            },
          ],
        })),

      getEventsForSpool: (spoolNo) =>
        get().events.filter((e) => e.spoolNo === spoolNo)
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),

      resetTracking: () => set({ events: seedFromExistingRecords() }),
    }),
    {
      name: "pipeqc-tracking-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
```

- [ ] **Step 3: Re-export from `store/index.ts`**

```typescript
export * from "./spool-tracking-store"
```

- [ ] **Step 4: Wire reset cascade in `store/demo-store.ts`**

Find `resetAll()`. Add the import at top:
```typescript
import { useSpoolTrackingStore } from "./spool-tracking-store"
```
Add the call in `resetAll`:
```typescript
useSpoolTrackingStore.getState().resetTracking()
```

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npx tsc --noEmit 2>&1 | head -50
git add lib/spool-tracking.ts store/spool-tracking-store.ts store/index.ts store/demo-store.ts
git commit -m "feat(tracking): location-event store + derivation helpers (Phase 5 Task 1)"
```

---

## Task 2 — Live KPI strip + Site Location Map (Slice 5.1, 5.2)

**Files:**
- Create: `components/tracking/tracking-kpi-strip.tsx`
- Create: `components/tracking/tracking-location-map.tsx`
- Create: `components/tracking/tracking-scan-trend.tsx`
- Create: `components/tracking/tracking-pda-card.tsx`
- Create: `components/tracking/active-spool-chip.tsx`

**What this builds:** The top half of the dashboard goes live. KPI strip reads from real stores (active spool count, scans-today derived from events, inconsistencies count, transit-out count). The Site Location Map uses `TRACKING_LOCATIONS` capacity definitions but counts come from the events store. The scan-trend chart and PDA card stay cosmetic with a small "Demo data" chip honesty marker.

- [ ] **Step 1: Create `components/tracking/active-spool-chip.tsx`**

```tsx
"use client"
import { Badge } from "@/components/ui/badge"

export function ActiveSpoolChip({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={
        isActive
          ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
          : "bg-slate-100 text-slate-600 border-slate-300 text-[10px]"
      }
    >
      {isActive ? "Active" : "Erected"}
    </Badge>
  )
}
```

- [ ] **Step 2: Create `components/tracking/tracking-kpi-strip.tsx`**

```tsx
"use client"

import { useMemo } from "react"
import { TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useErectedStore } from "@/store/erected-store"
import { useAdminStore } from "@/store/admin-store"
import { useScopeLock } from "@/lib/scope-lock"
import { deriveCurrentLocation, deriveIsActive, deriveInconsistencyFlag, deriveTransitOutFlag } from "@/lib/spool-tracking"
import { deriveSpoolFabStage } from "@/lib/spool-data"
import { useWeldsStore } from "@/store/welds-store"
import { cn } from "@/lib/utils"

export function TrackingKpiStrip() {
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useSpoolsStore((s) => s.spools)
  const erectedRecords = useErectedStore((s) => s.records)
  const welds = useWeldsStore((s) => s.welds)
  const maxTransitDays = useAdminStore((s) => s.projectDefinition?.maxTransitTime ?? 2)
  const scope = useScopeLock()

  const computed = useMemo(() => {
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })

    const todayIso = new Date().toISOString().slice(0, 10)
    const scansToday = events.filter((e) => e.at.startsWith(todayIso)).length

    let active = 0
    let inconsistent = 0
    let transitOut = 0
    spools.forEach((s) => {
      if (!scope.isInScope((s as any).pdsAreaCode)) return
      const spoolEvents = eventsBySpool.get(s.spoolNo) ?? []
      const cur = deriveCurrentLocation(spoolEvents)
      const fabStage = deriveSpoolFabStage(welds.filter((w) => w.spoolNo === s.spoolNo))
      const hasErected = erectedRecords.some((r) => r.spoolNo === s.spoolNo)
      if (deriveIsActive(fabStage, hasErected)) active++
      if (deriveInconsistencyFlag(fabStage, cur?.location).isInconsistent) inconsistent++
      if (deriveTransitOutFlag(spoolEvents, maxTransitDays).isTransitOut) transitOut++
    })

    return { active, scansToday, inconsistent, transitOut, totalSpools: spools.length }
  }, [events, spools, erectedRecords, welds, maxTransitDays, scope])

  const stats = [
    {
      title: "Spools tracked",
      value: computed.active.toLocaleString(),
      subtitle: "Currently active (Start Fab → Erected)",
      bottom: `${computed.scansToday} scanned today`,
      tone: "default" as const,
      icon: TrendingUp,
      bottomClassName: "text-emerald-600",
    },
    {
      title: "Total spools in project",
      value: computed.totalSpools.toLocaleString(),
      subtitle: "All spools across all lifecycle stages",
      bottom: scope.active ? `Scope: ${scope.subCode}` : "All areas",
      tone: "default" as const,
      icon: TrendingUp,
      bottomClassName: "text-slate-600",
    },
    {
      title: "Inconsistencies",
      value: computed.inconsistent.toString(),
      subtitle: "Status vs location mismatches",
      bottom: computed.inconsistent > 0 ? "Action needed" : "All clean",
      tone: computed.inconsistent > 0 ? "amber" as const : "default" as const,
      icon: AlertTriangle,
      bottomClassName: computed.inconsistent > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      title: "Transit out",
      value: computed.transitOut.toString(),
      subtitle: `Spools not scanned in > ${maxTransitDays} days`,
      bottom: computed.transitOut > 0 ? "Investigate" : "All in transit OK",
      tone: computed.transitOut > 0 ? "red" as const : "default" as const,
      icon: ArrowUpRight,
      bottomClassName: computed.transitOut > 0 ? "text-red-600" : "text-emerald-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.title}
            className={cn(
              stat.tone === "amber" && "border-l-4 border-l-amber-500",
              stat.tone === "red" && "border-l-4 border-l-red-500",
            )}
          >
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                {stat.title}
              </CardDescription>
              <CardTitle className="text-[30px] font-semibold tracking-tight">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
              <div className={cn("flex items-center gap-1 text-sm font-medium", stat.bottomClassName)}>
                <Icon className="h-3.5 w-3.5" />
                <span>{stat.bottom}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/tracking/tracking-location-map.tsx`**

This component owns the capacity-tile grid (formerly lines 134–172 + 603–675 of the old dashboard). Use `TRACKING_LOCATIONS` from `lib/spool-tracking.ts` for the definitions; count current occupants from the events store. Provide a `selectedLocation` controlled prop so the parent can lift the state up when the table needs to filter on it.

```tsx
"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TRACKING_LOCATIONS, deriveCurrentLocation, type TrackingLocationCategory } from "@/lib/spool-tracking"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useScopeLock } from "@/lib/scope-lock"

type ZoneFilter = "All zones" | TrackingLocationCategory

const ZONE_FILTERS: ZoneFilter[] = ["All zones", "Fab shop", "Paint shop", "Laydown", "Erection area"]

function getCapacityTone(count: number, capacity: number) {
  const ratio = (count / capacity) * 100
  if (ratio > 90) return { cardClassName: "border-red-200 bg-red-50", progressClassName: "bg-red-500", textClassName: "text-red-700" }
  if (ratio >= 70) return { cardClassName: "border-amber-200 bg-amber-50", progressClassName: "bg-amber-500", textClassName: "text-amber-700" }
  return { cardClassName: "border-emerald-200 bg-emerald-50", progressClassName: "bg-emerald-500", textClassName: "text-emerald-700" }
}

interface Props {
  selectedLocation: string | null
  onSelectLocation: (location: string | null) => void
}

export function TrackingLocationMap({ selectedLocation, onSelectLocation }: Props) {
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("All zones")
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useSpoolsStore((s) => s.spools)
  const scope = useScopeLock()

  const counts = useMemo(() => {
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })
    const result = new Map<string, number>()
    spools.forEach((s) => {
      if (!scope.isInScope((s as any).pdsAreaCode)) return
      const cur = deriveCurrentLocation(eventsBySpool.get(s.spoolNo) ?? [])
      if (cur && !cur.isTransitOut) {
        result.set(cur.location, (result.get(cur.location) ?? 0) + 1)
      }
    })
    return result
  }, [events, spools, scope])

  const visibleTiles = useMemo(
    () => TRACKING_LOCATIONS.filter((tile) => zoneFilter === "All zones" || tile.category === zoneFilter),
    [zoneFilter],
  )

  return (
    <Card>
      <CardHeader className="gap-4 pb-2 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Site location map</CardTitle>
          <CardDescription>Capacity monitoring across all tracked locations</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {ZONE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => { setZoneFilter(filter); onSelectLocation(null) }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                zoneFilter === filter
                  ? "border-sky-300 bg-sky-100 text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleTiles.map((tile) => {
            const count = counts.get(tile.name) ?? 0
            const tone = getCapacityTone(count, tile.capacity)
            const percentage = Math.min(Math.round((count / tile.capacity) * 100), 100)
            const isSelected = selectedLocation === tile.name
            return (
              <button
                key={tile.name}
                type="button"
                onClick={() => onSelectLocation(isSelected ? null : tile.name)}
                className={cn(
                  "min-h-[100px] rounded-lg border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  tone.cardClassName,
                  isSelected && "ring-2 ring-sky-500 ring-offset-2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tile.name}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{count}</p>
                  </div>
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{count} / {tile.capacity} capacity</span>
                    <span className={cn("font-medium", tone.textClassName)}>{percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div className={cn("h-full rounded-full", tone.progressClassName)} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create `components/tracking/tracking-scan-trend.tsx`** (cosmetic, marked as demo data)

Copy the AreaChart block (lines 678–746 of old dashboard) verbatim into a separate component. Add a small chip in the card header:

```tsx
<Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] uppercase tracking-wider">Demo data</Badge>
```

This is honesty: scan trends would need real PDA ingestion which PipeQC doesn't have. Demo-data chip is the explicit marker.

- [ ] **Step 5: Create `components/tracking/tracking-pda-card.tsx`** (cosmetic, marked as demo data)

Copy the PDA device card block (lines 748–793 of old dashboard) verbatim with the same "Demo data" chip. Per [docs/role_matrix/subcontractor.md:177](docs/role_matrix/subcontractor.md#L177) PDA scanning is deferred indefinitely; this card is a pitch-deck illustration only.

- [ ] **Step 6: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/tracking/tracking-kpi-strip.tsx components/tracking/tracking-location-map.tsx \
        components/tracking/tracking-scan-trend.tsx components/tracking/tracking-pda-card.tsx \
        components/tracking/active-spool-chip.tsx
git commit -m "feat(tracking): live KPI strip + capacity-tile map derived from spool-tracking events (Phase 5.1, 5.2)"
```

---

## Task 3 — Spool table + detail panel with manual relocate (Slices 5.4, partial 5.3)

**Files:**
- Create: `components/tracking/tracking-spool-table.tsx`
- Create: `components/tracking/tracking-detail-panel.tsx`

**What this builds:** The main spool list (currently lines 796–1023 of the mock) becomes live. Each row derives current location + days held from real events; flag column shows the inconsistency / transit-out chips computed by `lib/spool-tracking.ts`. Clicking a row opens a Sheet that shows the full movement history and exposes a Manual Relocate form (append-only, audit-preserving per CC-12). PM write-lock + scope lock are wired.

- [ ] **Step 1: Create `components/tracking/tracking-spool-table.tsx`**

Read the existing table render block (`spool-tracking-dashboard.tsx:796–1023`) as your visual reference. Re-implement against live data:

- Read `spools` from `useSpoolsStore`, `welds` from `useWeldsStore`, `erectedRecords` from `useErectedStore`, `events` from `useSpoolTrackingStore`, `maxTransitDays` from `useAdminStore`.
- For each spool, compute: `fabStage` (via `deriveSpoolFabStage`), `cur` (via `deriveCurrentLocation`), `isActive`, `inconsistency`, `transitOut`.
- Filter chain in this order:
  1. `scope.isInScope(spool.pdsAreaCode)` (no-op until pdsAreaCode populated; matches Phase 2 Task 6)
  2. Search query (spoolNo, isoNo, barcode — but our `Spool` shape may not have isoNo or barcode; treat barcode as `BC-${spoolNo.slice(-6)}` derived; isoNo from spool.isoNo if exists else "—")
  3. `selectedLocation` filter from the location map (when set)
- Row columns identical to current mock: Spool No · ISO No · Barcode · Current location · Status (fab stage badge) · Days · Last scan · Flag · Active chip · Actions (DropdownMenu).
- Replace the hardcoded "In Transit" status with the actual `cur.isTransitOut` flag — when true, color the location cell red and show the transit-out flag.
- Pagination: keep the "Showing 1-N of M spools" footer but make it real (slice by page).

Mark each row with `<ActiveSpoolChip isActive={isActive} />` from Task 2 — small visual indicator.

```tsx
"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowUpRight, Filter, MapPin, MoreHorizontal, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useWeldsStore } from "@/store/welds-store"
import { useErectedStore } from "@/store/erected-store"
import { useAdminStore } from "@/store/admin-store"
import { useScopeLock } from "@/lib/scope-lock"
import { deriveCurrentLocation, deriveIsActive, deriveInconsistencyFlag, deriveTransitOutFlag } from "@/lib/spool-tracking"
import { deriveSpoolFabStage, STAGE_COLOR } from "@/lib/spool-data"
import { ActiveSpoolChip } from "./active-spool-chip"
import { TrackingDetailPanel } from "./tracking-detail-panel"

interface Props {
  selectedLocation: string | null
}

const PAGE_SIZE = 25

export function TrackingSpoolTable({ selectedLocation }: Props) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null)

  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useSpoolsStore((s) => s.spools)
  const welds = useWeldsStore((s) => s.welds)
  const erectedRecords = useErectedStore((s) => s.records)
  const maxTransitDays = useAdminStore((s) => s.projectDefinition?.maxTransitTime ?? 2)
  const scope = useScopeLock()

  const enriched = useMemo(() => {
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })
    return spools.map((s) => {
      const spoolEvents = eventsBySpool.get(s.spoolNo) ?? []
      const fabStage = deriveSpoolFabStage(welds.filter((w) => w.spoolNo === s.spoolNo))
      const hasErected = erectedRecords.some((r) => r.spoolNo === s.spoolNo)
      return {
        spool: s,
        fabStage,
        isActive: deriveIsActive(fabStage, hasErected),
        cur: deriveCurrentLocation(spoolEvents),
        inconsistency: deriveInconsistencyFlag(fabStage, deriveCurrentLocation(spoolEvents)?.location),
        transitOut: deriveTransitOutFlag(spoolEvents, maxTransitDays),
      }
    })
  }, [events, spools, welds, erectedRecords, maxTransitDays])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((row) => {
      if (!scope.isInScope((row.spool as any).pdsAreaCode)) return false
      if (selectedLocation && row.cur?.location !== selectedLocation) return false
      if (q && !row.spool.spoolNo.toLowerCase().includes(q) && !(row.spool.isoNo ?? "").toLowerCase().includes(q)) return false
      return true
    })
  }, [enriched, scope, selectedLocation, search])

  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const selectedRow = selectedSpool ? enriched.find((r) => r.spool.spoolNo === selectedSpool) ?? null : null

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="gap-2 border-b border-slate-200 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Spool locations</CardTitle>
              <CardDescription>
                Real-time location tracking — {filtered.length} spools
                {selectedLocation ? ` at ${selectedLocation}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search by spool no, ISO no..."
                  className="h-9 border-slate-300 bg-slate-50 pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-100">
                  {["Spool No", "ISO No", "Barcode", "Current location", "Fab stage", "Days", "Last scan", "Flag", "Active", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const isSelected = selectedSpool === row.spool.spoolNo
                  const stageColor = row.fabStage ? STAGE_COLOR[row.fabStage] : null
                  const barcode = `BC-${row.spool.spoolNo.replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`
                  return (
                    <tr
                      key={row.spool.spoolNo}
                      onClick={() => setSelectedSpool(row.spool.spoolNo)}
                      className={cn(
                        "cursor-pointer border-b border-slate-200 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50",
                        isSelected ? "border-sky-300 bg-sky-100" : "hover:bg-slate-100",
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap"><span className="font-mono text-[13px] font-semibold text-sky-600">{row.spool.spoolNo}</span></td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">{row.spool.isoNo ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[13px] text-slate-700">{barcode}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5 text-[13px]", row.transitOut.isTransitOut ? "text-red-700" : "text-slate-700")}>
                          <MapPin className={cn("h-3.5 w-3.5", row.transitOut.isTransitOut ? "text-red-500" : "text-slate-400")} />
                          {row.cur?.location ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {row.fabStage && stageColor ? (
                          <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium", stageColor.bg, stageColor.text)}>{row.fabStage}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={cn("px-3 py-2.5 whitespace-nowrap text-[13px] font-medium", (row.cur?.daysInLocation ?? 0) > 14 ? "text-red-600" : (row.cur?.daysInLocation ?? 0) > 7 ? "text-amber-600" : "text-slate-700")}>{row.cur?.daysInLocation ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[13px] text-slate-600">{row.cur?.lastScan?.slice(0, 10) ?? "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {row.transitOut.isTransitOut ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50">
                                <ArrowUpRight className="h-4 w-4 text-red-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={8}>
                              Out from {row.transitOut.fromLocation} for {row.transitOut.outFor} days
                            </TooltipContent>
                          </Tooltip>
                        ) : row.inconsistency.isInconsistent ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={8}>{row.inconsistency.reason}</TooltipContent>
                          </Tooltip>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><ActiveSpoolChip isActive={row.isActive} /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" onClick={(e) => e.stopPropagation()} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedSpool(row.spool.spoolNo)}>View history</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSelectedSpool(row.spool.spoolNo)}>Manual relocate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} spools</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 border-slate-300 px-3 text-xs" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">{page}</span>
            <Button variant="outline" size="sm" className="h-8 border-slate-300 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>
      <TrackingDetailPanel row={selectedRow} open={!!selectedRow} onClose={() => setSelectedSpool(null)} />
    </>
  )
}
```

- [ ] **Step 2: Create `components/tracking/tracking-detail-panel.tsx`**

This is the Sheet for one spool. Shows:
- Header: spool no + ISO no + Fab stage badge + Active chip
- PM write-lock banner near header
- Current location card (location, days held, last scan, flag chips)
- Movement history timeline (events sorted DESC) — each event shows location · eventType · by · at · reason (if MANUAL)
- Manual Relocate form (4 fields: New location dropdown from `TRACKING_LOCATIONS`, By inputs, Reason textarea (required), Save button)
- On Save: `manualRelocate(spoolNo, location, by, reason)` + `await new Promise((r) => setTimeout(r, 500))` + `toast.success(...)` + `pushNotification({severity: "info", category: "tracking", title: "${spoolNo} relocated", description: "to ${location} by ${by}", href: "/tracking"})`
- Save button `disabled={!canSave || pmLocked}` — PM write-lock blocks relocate

```tsx
"use client"

import { useState } from "react"
import { MapPin, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRACKING_LOCATIONS } from "@/lib/spool-tracking"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { useNotificationsStore } from "@/store/notifications-store"
import { STAGE_COLOR } from "@/lib/spool-data"
import { ActiveSpoolChip } from "./active-spool-chip"
import { cn } from "@/lib/utils"

interface Props {
  row: any | null
  open: boolean
  onClose: () => void
}

export function TrackingDetailPanel({ row, open, onClose }: Props) {
  const [newLocation, setNewLocation] = useState("")
  const [by, setBy] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const { locked: pmLocked } = usePmWriteLock()
  const getEventsForSpool = useSpoolTrackingStore((s) => s.getEventsForSpool)
  const manualRelocate = useSpoolTrackingStore((s) => s.manualRelocate)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  if (!row) return null

  const events = getEventsForSpool(row.spool.spoolNo).slice().reverse()
  const stageColor = row.fabStage ? STAGE_COLOR[row.fabStage] : null
  const canSave = newLocation.trim() && by.trim() && reason.trim()

  async function handleRelocate() {
    if (!canSave) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    manualRelocate(row.spool.spoolNo, newLocation, by, reason)
    pushNotification({
      severity: "info",
      category: "tracking",
      title: `${row.spool.spoolNo} relocated`,
      description: `Manual move to ${newLocation} · by ${by} · ${reason}`,
      href: "/tracking",
    })
    toast.success(`Relocated ${row.spool.spoolNo} to ${newLocation}`)
    setNewLocation(""); setBy(""); setReason("")
    setSaving(false)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle className="font-mono text-sky-600">{row.spool.spoolNo}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{row.spool.isoNo ?? "—"}</span>
            {row.fabStage && stageColor ? (
              <Badge className={cn("text-xs", stageColor.bg, stageColor.text)}>{row.fabStage}</Badge>
            ) : null}
            <ActiveSpoolChip isActive={row.isActive} />
          </div>
        </SheetHeader>

        <PmWriteLockBanner />

        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPin className="h-4 w-4 text-slate-500" /> Current location
          </div>
          <p className="mt-2 text-lg font-medium text-slate-900">{row.cur?.location ?? "—"}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>Days in location: <strong>{row.cur?.daysInLocation ?? "—"}</strong></span>
            <span>Last scan: <strong>{row.cur?.lastScan?.slice(0, 10) ?? "—"}</strong></span>
          </div>
          {row.transitOut.isTransitOut ? (
            <Badge className="mt-2 bg-red-100 text-red-800 border-red-300">Transit out from {row.transitOut.fromLocation} · {row.transitOut.outFor}d</Badge>
          ) : row.inconsistency.isInconsistent ? (
            <Badge className="mt-2 bg-amber-100 text-amber-800 border-amber-300">{row.inconsistency.reason}</Badge>
          ) : null}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700">Movement history</h3>
          <div className="mt-2 space-y-2">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500">No movement events yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="rounded-md border border-slate-200 bg-white p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-900">{e.location}</span>
                    <Badge className={cn(
                      "text-[10px]",
                      e.eventType === "IN" ? "bg-emerald-100 text-emerald-800" :
                      e.eventType === "OUT" ? "bg-red-100 text-red-800" :
                      "bg-violet-100 text-violet-800"
                    )}>{e.eventType}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600">By {e.by} · {new Date(e.at).toLocaleString("en-GB")}</p>
                  {e.reason ? <p className="mt-1 italic text-slate-500">{e.reason}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Manual relocate</h3>
          <p className="text-xs text-slate-500">Append-only audit record — does not overwrite history.</p>
          <div className="mt-3 space-y-3">
            <div>
              <Label className="text-xs">New location</Label>
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger className="h-9 text-sm" disabled={pmLocked}><SelectValue placeholder="Select location..." /></SelectTrigger>
                <SelectContent>
                  {TRACKING_LOCATIONS.map((l) => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">By</Label>
              <Input value={by} onChange={(e) => setBy(e.target.value)} placeholder="e.g. SITE-FM-01" disabled={pmLocked} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Reason (required)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Found at Erection North after manual count" disabled={pmLocked} className="text-sm" />
            </div>
            <Button onClick={handleRelocate} disabled={!canSave || saving || pmLocked} className="gap-2">
              <Save className="h-4 w-4" />{saving ? "Saving..." : "Record relocation"}
            </Button>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/tracking/tracking-spool-table.tsx components/tracking/tracking-detail-panel.tsx
git commit -m "feat(tracking): live spool table + manual relocate detail panel with audit history (Phase 5.4)"
```

---

## Task 4 — Derived inconsistency + transit-out panels (Slice 5.3)

**Files:**
- Create: `components/tracking/tracking-inconsistency-panel.tsx`
- Create: `components/tracking/tracking-transit-out-panel.tsx`

**What this builds:** Replace the bottom-of-dashboard mock panels (lines 1063–1129) with live-computed lists. Each panel reads from the same derivation helpers (`deriveInconsistencyFlag`, `deriveTransitOutFlag`) and shows the affected spools sorted by severity. Clicking a spool opens the same `<TrackingDetailPanel />` used by the main table (lift selectedSpool state up to the dashboard root in Task 6).

Additionally — when a fresh transit-out flag flips (event store mutation pushes a spool past `maxTransitDays`), push a notification. Implement this as a `useEffect` watcher inside the parent dashboard that diffs the previous transit-out set against the new one.

- [ ] **Step 1: Create `components/tracking/tracking-inconsistency-panel.tsx`**

```tsx
"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useWeldsStore } from "@/store/welds-store"
import { useScopeLock } from "@/lib/scope-lock"
import { deriveCurrentLocation, deriveInconsistencyFlag } from "@/lib/spool-tracking"
import { deriveSpoolFabStage } from "@/lib/spool-data"

interface Props {
  onSelectSpool: (spoolNo: string) => void
}

export function TrackingInconsistencyPanel({ onSelectSpool }: Props) {
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useSpoolsStore((s) => s.spools)
  const welds = useWeldsStore((s) => s.welds)
  const scope = useScopeLock()

  const rows = useMemo(() => {
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })
    const result: { spoolNo: string; reason: string; time: string }[] = []
    spools.forEach((s) => {
      if (!scope.isInScope((s as any).pdsAreaCode)) return
      const spoolEvents = eventsBySpool.get(s.spoolNo) ?? []
      const cur = deriveCurrentLocation(spoolEvents)
      const fabStage = deriveSpoolFabStage(welds.filter((w) => w.spoolNo === s.spoolNo))
      const flag = deriveInconsistencyFlag(fabStage, cur?.location)
      if (flag.isInconsistent) {
        result.push({ spoolNo: s.spoolNo, reason: flag.reason!, time: cur?.lastScan?.slice(0, 10) ?? "—" })
      }
    })
    return result
  }, [events, spools, welds, scope])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent inconsistencies</CardTitle>
        <CardDescription>Spools with status and scan mismatches ({rows.length})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No inconsistencies — all spools tracked correctly.</p>
        ) : rows.map((item) => (
          <div key={item.spoolNo} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <button onClick={() => onSelectSpool(item.spoolNo)} className="font-mono text-[13px] font-semibold text-sky-600 hover:underline">{item.spoolNo}</button>
              <p className="mt-1 text-sm text-slate-700">{item.reason}</p>
              <p className="mt-1 text-xs text-slate-500">{item.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `components/tracking/tracking-transit-out-panel.tsx`**

Mirror the inconsistency panel but using `deriveTransitOutFlag` + `useAdminStore((s) => s.projectDefinition?.maxTransitTime ?? 2)`. Display `Out from ${fromLocation}, ${outFor} days ago`. Sort DESC by `outFor`.

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/tracking/tracking-inconsistency-panel.tsx components/tracking/tracking-transit-out-panel.tsx
git commit -m "feat(tracking): live inconsistency + transit-out flag panels (Phase 5.3)"
```

---

## Task 5 — 4-tab Data Analysis IA (gap from presentation #5 not in roadmap_v3)

**Files:**
- Create: `app/tracking/data-analysis/page.tsx`
- Create: `components/tracking/tracking-data-analysis-tabs.tsx`
- Create: `components/tracking/tracking-data-analysis-location-tab.tsx`
- Create: `components/tracking/tracking-data-analysis-design-area-tab.tsx`
- Create: `components/tracking/tracking-data-analysis-consolidation-tab.tsx`

**What this builds:** Per [presentation_findings.md:929–981](docs/research/presentation_findings.md#L929) Easy Piping's Spool Tracking has a **4-tab Data Analysis area** distinct from the dashboard. Roadmap_v3 v3 collapsed this into the dashboard, but the IA shape is significant for parity. We add it as a separate route `/tracking/data-analysis` with 4 tabs:

1. **Tab 1 — Spool location** (search by spool / iso / barcode → details with history). This already exists in our detail panel (Task 3); the tab repackages it as a primary search experience.
2. **Tab 2 — Location** (list of all locations → click → spools at that location). Each row clickable.
3. **Tab 3 — Design area** (list of design areas — derived from `useAdminStore.pdsAreas` — click → location intersection grid).
4. **Tab 4 — Consolidation reports** (flag reports: inconsistencies + transit-out, grouped by location). Reuses Task 4 panels.

- [ ] **Step 1: Create the wrapper `components/tracking/tracking-data-analysis-tabs.tsx`**

Use shadcn `<Tabs>` with 4 trigger tabs. Default to Tab 1.

```tsx
"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrackingSpoolTable } from "./tracking-spool-table"
import { TrackingDataAnalysisLocationTab } from "./tracking-data-analysis-location-tab"
import { TrackingDataAnalysisDesignAreaTab } from "./tracking-data-analysis-design-area-tab"
import { TrackingDataAnalysisConsolidationTab } from "./tracking-data-analysis-consolidation-tab"

export function TrackingDataAnalysisTabs() {
  const [tab, setTab] = useState("spool-location")
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="spool-location">Spool location</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="design-area">Design area</TabsTrigger>
        <TabsTrigger value="consolidation">Consolidation reports</TabsTrigger>
      </TabsList>
      <TabsContent value="spool-location"><TrackingSpoolTable selectedLocation={null} /></TabsContent>
      <TabsContent value="location"><TrackingDataAnalysisLocationTab /></TabsContent>
      <TabsContent value="design-area"><TrackingDataAnalysisDesignAreaTab /></TabsContent>
      <TabsContent value="consolidation"><TrackingDataAnalysisConsolidationTab /></TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Create `tracking-data-analysis-location-tab.tsx`**

List all `TRACKING_LOCATIONS` as cards. Each card shows location name + count + capacity progress. Click a card → expands a panel showing the spool list at that location (reuse `TrackingSpoolTable` with the `selectedLocation` prop preset). Erected spools excluded (per CC-11 "active view only").

- [ ] **Step 3: Create `tracking-data-analysis-design-area-tab.tsx`**

Read `pdsAreas` from `useAdminStore`. Render as cards. Click an area → shows the locations where spools from this area sit + the spool list (filtered to `spool.pdsAreaCode === selectedArea.code`). For demo data (no `pdsAreaCode` yet on spools), show an empty-state message: "Spools will be linked to design areas once spool data carries pdsAreaCode (Phase 7)." Honesty marker — don't fake the intersection.

- [ ] **Step 4: Create `tracking-data-analysis-consolidation-tab.tsx`**

Embed Task 4's `<TrackingInconsistencyPanel />` + `<TrackingTransitOutPanel />` side-by-side in this tab. Same data, different presentation context. Provide a placeholder `onSelectSpool` (open detail panel inline) or surface a small toast.

- [ ] **Step 5: Create `app/tracking/data-analysis/page.tsx`**

```tsx
import { TrackingDataAnalysisTabs } from "@/components/tracking/tracking-data-analysis-tabs"

export default function TrackingDataAnalysisPage() {
  return <TrackingDataAnalysisTabs />
}
```

- [ ] **Step 6: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add app/tracking/data-analysis/page.tsx components/tracking/tracking-data-analysis-*.tsx
git commit -m "feat(tracking): 4-tab Data Analysis IA per Easy Piping #5 (Phase 5 — adds CC-11 gap)"
```

---

## Task 6 — Barcode printing basket → Excel export (gap from CC-13 not in roadmap_v3)

**Files:**
- Modify: `package.json` (add xlsx)
- Create: `components/tracking/tracking-barcode-basket-view.tsx`
- Create: `app/tracking/print-barcodes/page.tsx`

**What this builds:** Per [presentation_findings.md:986–1003](docs/research/presentation_findings.md#L986) Easy Piping does **not print barcodes itself** — it produces an Excel sheet that Zebra software prints externally. The pattern is a **two-column basket**: left = search-by-iso-or-barcode, right = selected spools. Click "Export" → downloads `.xlsx`.

PipeQC current "Print barcodes" button in the dashboard header is just a button; we replace it with a real basket screen at `/tracking/print-barcodes`. This is a recurring UX pattern (also useful for Test Pack builder per CC-13 note) — implementing it here pays for itself in Phase 6 too.

Gating: PM write-lock disables Export; scope lock filters available spools.

- [ ] **Step 1: Install `xlsx`**

```bash
npm install xlsx @types/xlsx
```

- [ ] **Step 2: Create `components/tracking/tracking-barcode-basket-view.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Download, Search } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useSpoolsStore } from "@/store/spools-store"
import { useScopeLock } from "@/lib/scope-lock"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { deriveCurrentLocation } from "@/lib/spool-tracking"

export function TrackingBarcodeBasketView() {
  const [search, setSearch] = useState("")
  const [basket, setBasket] = useState<string[]>([])
  const spools = useSpoolsStore((s) => s.spools)
  const events = useSpoolTrackingStore((s) => s.events)
  const scope = useScopeLock()
  const { locked: pmLocked } = usePmWriteLock()

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return spools.filter((s) => {
      if (!scope.isInScope((s as any).pdsAreaCode)) return false
      if (basket.includes(s.spoolNo)) return false
      if (!q) return true
      return s.spoolNo.toLowerCase().includes(q) || (s.isoNo ?? "").toLowerCase().includes(q)
    }).slice(0, 50)
  }, [spools, search, basket, scope])

  function exportExcel() {
    if (basket.length === 0) return
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })
    const rows = basket.map((spoolNo) => {
      const s = spools.find((sp) => sp.spoolNo === spoolNo)
      const cur = deriveCurrentLocation(eventsBySpool.get(spoolNo) ?? [])
      return {
        "Spool No": spoolNo,
        "ISO No": s?.isoNo ?? "",
        "Barcode": `BC-${spoolNo.replace(/[^0-9]/g, "").slice(-6).padStart(6, "0")}`,
        "Current Location": cur?.location ?? "",
        "Material": s?.material ?? "",
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Barcodes")
    XLSX.writeFile(wb, `barcodes-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Exported ${basket.length} barcodes to Excel`)
  }

  return (
    <div className="space-y-4">
      <PmWriteLockBanner />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Available spools</CardTitle>
            <CardDescription>Search by spool no or ISO no</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-9 pl-9" />
            </div>
            <div className="max-h-[480px] space-y-1 overflow-y-auto">
              {available.map((s) => (
                <button
                  key={s.spoolNo}
                  type="button"
                  onClick={() => setBasket((b) => [...b, s.spoolNo])}
                  disabled={pmLocked}
                  className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                >
                  <span className="font-mono text-[13px] text-sky-700">{s.spoolNo}</span>
                  <Plus className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Basket ({basket.length})</CardTitle>
              <Button onClick={exportExcel} disabled={basket.length === 0 || pmLocked} className="gap-2" size="sm">
                <Download className="h-4 w-4" /> Export to Excel
              </Button>
            </div>
            <CardDescription>Selected spools → Excel for external Zebra printing (CC-13)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[510px] overflow-y-auto">
            {basket.length === 0 ? (
              <p className="text-sm text-slate-500">Click spools on the left to add them.</p>
            ) : (
              basket.map((spoolNo) => (
                <div key={spoolNo} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-mono text-[13px] text-slate-800">{spoolNo}</span>
                  <button onClick={() => setBasket((b) => b.filter((x) => x !== spoolNo))} disabled={pmLocked} className="text-slate-400 hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/tracking/print-barcodes/page.tsx`**

```tsx
import { TrackingBarcodeBasketView } from "@/components/tracking/tracking-barcode-basket-view"

export default function PrintBarcodesPage() {
  return <TrackingBarcodeBasketView />
}
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add package.json package-lock.json components/tracking/tracking-barcode-basket-view.tsx app/tracking/print-barcodes/page.tsx
git commit -m "feat(tracking): barcode basket + Excel export per Easy Piping CC-13 Zebra workflow"
```

---

## Task 7 — Rewire `/tracking` page + navigation + scope-lock/PM-write-lock wiring (Slice 5.5)

**Files:**
- Modify: `components/spool-tracking-dashboard.tsx` (full replace with composition wrapper)
- Modify: `app/tracking/page.tsx` (no changes needed if wrapper kept; verify)
- Modify: `config/navigation.ts` (add sub-nav children for `/tracking`)

**What this builds:** The composed dashboard. `<SpoolTrackingDashboard />` becomes a thin wrapper that lays out the new components in the same visual order as the old mock — KPI strip on top, capacity map + (scan trend + PDA card) in the middle, spool table below, inconsistencies + transit-out at the bottom. Lift `selectedLocation` state up. Add a transit-out notification watcher (useEffect that diffs previous + current transit-out spools and pushes notifications for new ones).

- [ ] **Step 1: Replace `components/spool-tracking-dashboard.tsx`**

Delete the existing 1132-line content and replace with:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { TrackingKpiStrip } from "./tracking/tracking-kpi-strip"
import { TrackingLocationMap } from "./tracking/tracking-location-map"
import { TrackingScanTrend } from "./tracking/tracking-scan-trend"
import { TrackingPdaCard } from "./tracking/tracking-pda-card"
import { TrackingSpoolTable } from "./tracking/tracking-spool-table"
import { TrackingInconsistencyPanel } from "./tracking/tracking-inconsistency-panel"
import { TrackingTransitOutPanel } from "./tracking/tracking-transit-out-panel"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useAdminStore } from "@/store/admin-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { deriveTransitOutFlag } from "@/lib/spool-tracking"

export function SpoolTrackingDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  // Transit-out notification watcher — push notification when a new spool flips into transit-out
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useSpoolsStore((s) => s.spools)
  const maxTransitDays = useAdminStore((s) => s.projectDefinition?.maxTransitTime ?? 2)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const prevTransitOutRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const eventsBySpool = new Map<string, typeof events>()
    events.forEach((e) => {
      const list = eventsBySpool.get(e.spoolNo) ?? []
      list.push(e)
      eventsBySpool.set(e.spoolNo, list)
    })
    const currentTransitOut = new Set<string>()
    spools.forEach((s) => {
      const flag = deriveTransitOutFlag(eventsBySpool.get(s.spoolNo) ?? [], maxTransitDays)
      if (flag.isTransitOut) currentTransitOut.add(s.spoolNo)
    })
    const newEntries = [...currentTransitOut].filter((id) => !prevTransitOutRef.current.has(id))
    if (newEntries.length > 0 && prevTransitOutRef.current.size > 0) {
      newEntries.forEach((spoolNo) => {
        pushNotification({
          severity: "warning",
          category: "tracking",
          title: `${spoolNo}: transit out > ${maxTransitDays} days`,
          description: "Spool scanned OUT but not yet scanned IN at destination",
          href: "/tracking",
        })
      })
    }
    prevTransitOutRef.current = currentTransitOut
  }, [events, spools, maxTransitDays, pushNotification])

  return (
    <div className="space-y-6">
      <TrackingKpiStrip />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TrackingLocationMap selectedLocation={selectedLocation} onSelectLocation={setSelectedLocation} />
        </div>
        <div className="grid gap-4 xl:col-span-2">
          <TrackingScanTrend />
          <TrackingPdaCard />
        </div>
      </div>

      <TrackingSpoolTable selectedLocation={selectedLocation} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TrackingInconsistencyPanel onSelectSpool={() => { /* lift selectedSpool if you want global link */ }} />
        <TrackingTransitOutPanel onSelectSpool={() => { /* same */ }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `config/navigation.ts`**

Find the existing `/tracking` entry. Wrap it as a parent with children:

```typescript
{
  label: "Spool Tracking",
  href: "/tracking",
  icon: MapPin,
  children: [
    { label: "Dashboard", href: "/tracking" },
    { label: "Data Analysis", href: "/tracking/data-analysis" },
    { label: "Print Barcodes", href: "/tracking/print-barcodes" },
  ],
},
```

(Match whatever the existing nav schema is — children, items, sub, etc. — by inspecting `config/navigation.ts` first.)

- [ ] **Step 3: TypeScript check + build + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30
git add components/spool-tracking-dashboard.tsx config/navigation.ts
git commit -m "feat(tracking): compose live dashboard + sub-nav (Dashboard / Data Analysis / Print Barcodes) (Phase 5.5)"
```

---

## Task 8 — Final integration: end-to-end Spool Tracking demo flow

**Files:**
- Verify only — no code changes unless something fails

**What this checks:** End-to-end demo flow proving PM B4 ✅ and Subcontractor B8 ✅ (core, scope-locked).

- [ ] **Step 1: Build + dev server smoke test**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30
```

Expected: no type errors, build succeeds.

- [ ] **Step 2: Manual demo flow checklist**

Start dev server (`npm run dev`) and walk through:

1. `/tracking` → see KPI strip with real counts (active spools derived from welds-store + erected-store; not 2847 mock).
2. Verify "Inconsistencies" tile matches the inconsistency panel count at the bottom.
3. Click a capacity tile (e.g. "Laydown Yard 1") → spool table below filters to that location.
4. Type a spool no in the search box → table filters live.
5. Click a spool row → detail Sheet opens with movement history (events from `LAYDOWN_SEED` + `TO_SITE_SEED` seed).
6. Fill out Manual Relocate form (location = "Erection North", by = "FM-TEST", reason = "Counted manually") → click "Record relocation" → toast + notification appears + spool's row updates with new location + history adds a MANUAL event.
7. Verify the new MANUAL event appears at the top of the spool's history timeline (events sorted DESC in Sheet, ASC in store).
8. `/tracking/data-analysis` → 4 tabs visible. Spool Location tab shows full table. Location tab shows clickable location cards. Design Area tab shows pdsAreas with honest empty-state. Consolidation Reports tab shows the same flag panels.
9. `/tracking/print-barcodes` → search → click spools to add to basket → click Export → `barcodes-YYYY-MM-DD.xlsx` downloads with Spool No / ISO No / Barcode / Location / Material columns.
10. Switch role to PM: `localStorage.setItem("pipeqc-role", "project_manager"); location.reload()` → open spool detail → see `<PmWriteLockBanner />` + Manual Relocate button disabled. Open Print Barcodes → Export button disabled.
11. Switch role to Subcontractor: `localStorage.setItem("pipeqc-role", "subcontractor"); localStorage.setItem("pipeqc-active-sub", "BV"); location.reload()` → table shows only own scope (no-op on demo data without pdsAreaCode — verify chip displays correctly).
12. Reset demo: `useDemoStore.getState().resetAll()` → tracking events reset to seed.

- [ ] **Step 3: Update merge log**

Append a note to `docs/PIPEQC_CONTEXT.md` under the merge log:

```markdown
- 2026-XX-XX: Phase 5 complete — Spool Tracking module live.
  - PM matrix B4 ❌→✅ (dashboard with KPIs, capacity map, spool table, flag panels).
  - Subcontractor matrix B8 ❌→✅ core (scope-locked tracking + barcode basket; PDA scanning deferred per matrix).
  - Adds CC-11 (active spool flag), CC-12 (manual relocate audit history), CC-13 (Excel-then-Zebra basket).
  - 4-tab Data Analysis IA (Spool Location / Location / Design Area / Consolidation Reports) per Easy Piping #5.
```

- [ ] **Step 4: Commit closure**

```bash
git add docs/PIPEQC_CONTEXT.md
git commit -m "docs(tracking): Phase 5 closure — Spool Tracking module live (PM B4 + Sub B8 closed)"
```

---

## Self-review

**Spec coverage check:**

| Roadmap_v3 slice | Covered in task | Real gap closed |
|---|---|---|
| 5.1 `/tracking` dashboard with KPI strip + filter chips | Task 2 (`<TrackingKpiStrip />` + `<TrackingLocationMap />`) | Live counts replace mock 2847 / 23 / 7 |
| 5.2 Yard / shop map view (location markers per spool) | Task 2 (`<TrackingLocationMap />` with derived counts) | Capacity tiles wired to real events store |
| 5.3 Inconsistency flags + transit-out warnings | Task 4 (`<TrackingInconsistencyPanel />` + `<TrackingTransitOutPanel />`) + transit-out notification watcher in Task 7 | First real flag engine — was hardcoded |
| 5.4 Movement audit log (Location OUT / Location IN history) | Task 1 (store) + Task 3 (detail panel history timeline + Manual Relocate) | Closes Sub B8 core |
| 5.5 Apply scope lock | Tasks 2, 3, 4, 6 all add `useScopeLock()` filter | Reuses Phase 2 Task 6 nit |
| **CC-11 active spool flag** (gap from #5 v3 didn't include) | Task 1 (`deriveIsActive`) + Task 2 (KPI uses it) + Task 3 (`<ActiveSpoolChip />` on rows) | First time PipeQC has Easy Piping's "active" definition |
| **CC-12 manual relocate audit history** (gap from #5 v3 didn't include) | Task 1 (`manualRelocate` append-only action) + Task 3 (Sheet form) | Append-only pattern matches Easy Piping audit-preserving design |
| **CC-13 Excel-then-Zebra basket** (gap from #5 v3 didn't include) | Task 6 (basket route + XLSX export) | Industry-standard pattern; reusable for Test Pack builder |
| **4-tab Data Analysis IA** (gap from #5 v3 collapsed) | Task 5 (separate route with 4 tabs) | Parity with Easy Piping module IA |
| PM write-lock applied to relocate + export | Tasks 3, 6 | Reuses Phase 2 Task 5 |
| Transit-out notification push | Task 7 `useEffect` watcher | New notification category `tracking` |

**Adjustments from roadmap_v3 based on research + code audit:**

- **Slice 5.1** roadmap claimed *"dashboard with KPI strip"* — turns out the entire existing dashboard is mock. The work is **decompose + rewire to real stores**, not "add KPIs to existing live dashboard." Task 2 handles the decomposition; old monolithic file deleted in Task 7.
- **Slice 5.2** roadmap claimed *"yard / shop map view"* — already exists as capacity tiles in the mock (lines 134–172). We **preserve the visual** and swap data sources to derived events. No new map UI needed.
- **Slice 5.3** roadmap claimed *"inconsistency flags + transit-out warnings"* — these are derived flags, not stored. Task 4 builds the derivation; Task 1 builds the engine; the rules (Painted-but-in-fab, Erected-but-in-laydown, transit > maxTransitTime) come from [presentation_findings.md:975–977](docs/research/presentation_findings.md#L975).
- **Slice 5.4** roadmap claimed *"movement audit log"* — this is the **heart** of Phase 5. Task 1 + Task 3 build a fresh append-only `LocationEvent[]` store with a Manual Relocate UI. Decision: seed from existing `LAYDOWN_SEED` + `TO_SITE_SEED` so the demo has movement history from minute one without manual entry; matches roadmap_v3 "demo-aware" tone of Phases 2–4.
- **Slice 5.5** roadmap claimed *"apply scope lock"* — wired into 5 separate components (KPI strip, location map, table, basket, inconsistency panel). Same opt-in no-op-on-demo-data pattern as Phase 2/4. Will become meaningful filter once `pdsAreaCode` is added to spool data (Phase 7).
- **Bonus 4-tab Data Analysis IA** (Task 5) was **not in roadmap_v3** but is explicit in [presentation_findings.md:929–981](docs/research/presentation_findings.md#L929). Without it Phase 5 only covers the dashboard, not the **module**. Added as separate route to keep the dashboard from getting noisy. Trivial to drop if scope pressure.
- **Bonus CC-13 barcode basket** (Task 6) was **not in roadmap_v3** but is required for parity with Easy Piping's documented Zebra workflow + lays groundwork for Test Pack builder in Phase 6.
- **Decision: PDA card + scan trend stay cosmetic with "Demo data" chips.** Roadmap_v3 line: *"Barcode export to Zebra label printer (low ROI). PDA scanning offline (sub.B10) — defer indefinitely."* Per CC-12 the actual `pda_user` role doesn't exist in PipeQC code, so any "live" PDA wiring would be theatrical. Honesty marker via chip beats fake data.

**Deferred (per roadmap_v3 Phase 5 explicit defers + audit findings):**

- Barcode export to Zebra label printer (sub.B10 defer-indefinitely) — **partially closed** by Task 6 Excel export, but no Zebra integration
- PDA scanning offline (sub.B10) — defer indefinitely (no `pda_user` role)
- Spool image + design area image (visual elements per #5 Tab 1 + Tab 3) — Phase 7 if assets become available
- Cumulative % scanned KPI + trend arrows — KPI strip currently shows active count, not cumulative %; Phase 7 polish if needed
- Mobile device mgmt most-frequent user/location analytics — depends on real PDA ingestion; defer
- Real `pdsAreaCode` on spool data — Phase 7 / Phase 0 spool data extension
- 3-file text export for Kalipso offline sync (CC-12) — defer indefinitely

**Placeholder scan:** No TBD, TODO, or "implement later" phrases inside code. Task 5 Design Area tab has an explicit empty-state until `pdsAreaCode` is populated — that's intentional honesty, not a placeholder. PDA card has explicit "Demo data" chip — same.

**Type consistency check:** `LocationEvent`, `LocationEventType`, `CurrentLocationResult`, `LocationDef`, `TrackingLocationCategory`, `TRACKING_LOCATIONS`, `useSpoolTrackingStore`, `deriveCurrentLocation`, `deriveIsActive`, `deriveInconsistencyFlag`, `deriveTransitOutFlag` — all defined once in `lib/spool-tracking.ts` or `store/spool-tracking-store.ts` and imported by exact name.

**Cross-cutting nits status after Phase 5:**

| Nit | Status after Phase 5 |
|---|---|
| Subcontractor scope lock (CC-4) | ✅ Wired into 5 tracking components (Tasks 2, 3, 4, 6) |
| PM write-lock | ✅ Banner + gating on Manual Relocate (Task 3) + Export (Task 6) |
| Notification system | ✅ New `tracking` category — transit-out flips push warning notifications (Task 7) |
| Active spool definition (CC-11) | ✅ First-class derivation + chip across tracking module |
| Manual relocate audit history (CC-12) | ✅ Append-only events store |
| Barcode basket → Excel (CC-13) | ✅ Reusable pattern in `/tracking/print-barcodes` |

---

## Open questions for the next session

- Should the `/tracking` dashboard auto-refresh on a timer (e.g. every 30s) to feel "live" during a demo? Currently re-derives only on store mutation. Trivial addition with `setInterval` if needed.
- The Design Area tab (Task 5 Step 3) is intentionally empty-state until `pdsAreaCode` is populated on spools. Should Phase 5 instead synthesize `pdsAreaCode` from spool naming convention (`PL-CW200-…` → area `CW200`) to populate the tab now, deferring proper admin-side wiring to Phase 7? Decision deferred — synthesizing here would duplicate Phase 7's logic.
- Notifications for inconsistency flag flips — currently we only notify transit-out. Should fresh inconsistencies also push warnings? Probably yes for parity; trivial to add a second `useEffect` block in Task 7's wrapper.
- Manual Relocate currently writes a single MANUAL event (representing both OUT-old-loc and IN-new-loc in one entry, since the location field is the destination). Easy Piping in #5 emits a paired OUT/IN. Phase 7 refinement candidate — current single-entry shape is simpler and meets the audit requirement.
- The `xlsx` library adds ~400KB to the bundle. Acceptable for an internal tool but consider lazy-loading via dynamic import if Phase 7 bundle-size pass needs it.
- PDA + scan-trend card cosmetics — should they be removed entirely to avoid implying functionality that doesn't exist? Current decision: keep with explicit "Demo data" chip. Open to dropping if user feels it weakens trust.
