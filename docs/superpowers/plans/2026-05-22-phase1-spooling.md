# Phase 1 — Spooling: Engineering Handoff

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Spooling module — Engineering Transmittal receipt, ISO checkout, multi-round checking, hold management, outbound Spooling Transmittal, revision cascade, and a live Home dashboard — implementing roadmap_v3 Phase 1 slices 1.1–1.7.

**Architecture:** Extend `store/spooling-store.ts` with a rich ISO state machine (Received → Checked Out → In Checking → Released / On Hold) plus transmittal entities (Inbound `EngTransmittal` and Outbound `SpoolingTransmittal`). New components live in `components/spooling/`. Existing route pages (`engineering-transmittals`, `iso-workflow`, `spooling-transmittal`) are replaced with real UIs; `spooling/page.tsx` gains a live KPI dashboard.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Zustand 5 + persist · Tailwind CSS · shadcn/ui (new-york) · lucide-react · recharts · sonner (toasts)

> **Read before writing code:**
> - `docs/PIPEQC_CONTEXT.md` — full stack, store patterns, design system tokens
> - `docs/roadmap_v3.md` Phase 1 section — slice checklist B3–B7, B11
> - `docs/role_matrix/spooling_team.md` — function inventory with stories
> - `store/spooling-store.ts` — existing SpoolingImportRow / SpoolingValidationIssue types (to preserve)
> - `components/spooling/spooling-view.tsx` — existing Browse Latest / History / Revision / Issues tabs (keep working)
> - `components/erection/to-site-detail-panel.tsx` — reference Sheet pattern
> - `components/fabrication-dashboard.tsx` — reference dashboard KPI pattern
> - `config/navigation.ts` — sidebar config (no new top-level routes needed)
> - `store/demo-store.ts` — `resetAll()` must cascade to new store slice
> - `store/admin-store.ts` — `useSubcontractors()`, `usePdsAreas()` for scope lock seed; `useProjectDefinition()` for `maxTransitTime`

---

## Design conventions (critical — match existing screens)

| Pattern | Where to copy from |
|---|---|
| Table + status chips | `components/weld-table.tsx` |
| Side panel (Sheet) | `components/erection/to-site-detail-panel.tsx` |
| Dashboard KPI tiles | `components/fabrication-dashboard.tsx` |
| Status badge | `components/status-badge.tsx` — always use this |
| Mutation delay | `await new Promise(r => setTimeout(r, 600 + Math.random() * 200))` before store update |
| Toast on mutation | `import { toast } from "sonner"; toast.success("...")` |
| Home notification | `useNotificationsStore().pushNotification({ title, message, severity, href })` |
| Colors | sky=info, amber=pending/hold, emerald=done/released, red=rejected, violet=in-review, slate=not-started |
| All components | `"use client"` — no server components |

---

## File structure

### New / modified store
- **Modify:** `store/spooling-store.ts` — add `ISORecord`, `EngTransmittal`, `SpoolingTransmittal`, `CheckingRound`, `HoldRecord` types + all state + actions. Preserve existing `SpoolingImportRow` / `SpoolingValidationIssue` / `RevisionConflict` types and actions for Browse tabs compatibility.

### New components
- **Create:** `components/spooling/eng-transmittal-list.tsx` — list of inbound transmittals with chips + search
- **Create:** `components/spooling/eng-transmittal-detail-panel.tsx` — Sheet: preview isos, Accept button
- **Create:** `components/spooling/iso-workflow-view.tsx` — master ISO list with status machine chips, checkout, hold, checking actions
- **Create:** `components/spooling/iso-detail-panel.tsx` — Sheet: full ISO lifecycle: checkout form / checking rounds / hold history
- **Create:** `components/spooling/spooling-transmittal-view.tsx` — outbound transmittal list + compose batch
- **Create:** `components/spooling/spooling-transmittal-detail-panel.tsx` — Sheet: batch preview + send
- **Create:** `components/spooling/spooling-home-dashboard.tsx` — live KPI strip + activity feed

### Modified route pages
- **Modify:** `app/spooling/engineering-transmittals/page.tsx` — replace placeholder with `<EngTransmittalList />`
- **Modify:** `app/spooling/iso-workflow/page.tsx` — keep existing SpoolingView tab-strip but add new ISO Workflow tab powered by `<IsoWorkflowView />`
- **Modify:** `app/spooling/spooling-transmittal/page.tsx` — replace placeholder with `<SpoolingTransmittalView />`
- **Modify:** `app/spooling/page.tsx` — replace static cards with `<SpoolingHomeDashboard />`

---

## Task 1 — Extend spooling-store.ts with ISO state machine + transmittal entities

**Files:**
- Modify: `store/spooling-store.ts`
- Modify: `store/demo-store.ts` (add `resetSpooling()` call)

- [ ] **Step 1: Add types at top of spooling-store.ts (before existing types)**

Replace the top of `store/spooling-store.ts` (keep existing SpoolingImportRow / SpoolingValidationIssue / RevisionConflict intact below), adding:

```typescript
// ISO lifecycle state machine
export type ISOStatus =
  | "Received"
  | "Checked Out"
  | "In Checking"
  | "Released"
  | "On Hold"
  | "Superseded"

export interface CheckingRound {
  round: number
  checkerName: string
  decision: "Approved" | "Rejected" | "Approved with remark"
  comment: string
  date: string
}

export interface HoldRecord {
  holdType: "Spool Team" | "Engineering"
  holderName: string
  reason: string
  appliedDate: string
  releasedDate?: string
  releaseReason?: string
}

export interface ISORecord {
  id: string                  // e.g. "ISO-PG-007"
  transmittalId: string       // parent inbound transmittal
  rev: string                 // "R0" | "R1" | "R2"
  pdsArea: string
  serviceClass: string
  status: ISOStatus
  spooledBy?: string          // assigned drafter name
  checkoutDate?: string
  checkInDate?: string        // when spooler marked ready for checking
  totalRounds: number
  checkingRounds: CheckingRound[]
  holdHistory: HoldRecord[]
  activeHold?: HoldRecord
  releasedDate?: string
  notes?: string
}

// Inbound transmittal from engineering
export interface EngTransmittal {
  id: string                  // e.g. "T-2026-018"
  sourceTeam: string
  receivedDate: string
  isoCount: number
  newCount: number
  revisionCount: number
  status: "Pending" | "Accepted" | "Partially Accepted"
  acceptedBy?: string
  acceptedDate?: string
  notes?: string
}

// Outbound transmittal to fabrication
export interface SpoolingTransmittal {
  id: string                  // e.g. "SPL-TRANS-001"
  generatedDate: string
  targetArea: string          // PDS area or system
  isoIds: string[]
  isoCount: number
  releasedBy: string
  status: "Draft" | "Sent"
  sentDate?: string
}
```

- [ ] **Step 2: Add seed data after existing `seedConflicts` constant**

```typescript
const SPOOLERS = ["Masha Ivanova", "Dmitry Petrov", "Anna Sokolova"]
const CHECKERS = ["Vlad Morozov", "Sergey Lebedev"]

export const ENG_TRANSMITTAL_SEED: EngTransmittal[] = [
  {
    id: "T-2026-018",
    sourceTeam: "Engineering Unit-2",
    receivedDate: "2026-05-19",
    isoCount: 5,
    newCount: 3,
    revisionCount: 2,
    status: "Accepted",
    acceptedBy: "Sergey Lebedev",
    acceptedDate: "2026-05-19",
  },
  {
    id: "T-2026-021",
    sourceTeam: "Engineering Unit-3",
    receivedDate: "2026-05-22",
    isoCount: 3,
    newCount: 3,
    revisionCount: 0,
    status: "Pending",
  },
]

export const ISO_SEED: ISORecord[] = [
  // Released — ready for outbound batch
  {
    id: "ISO-PG-001", transmittalId: "T-2026-018", rev: "R0", pdsArea: "PR-01",
    serviceClass: "PG", status: "Released",
    spooledBy: "Masha Ivanova", checkoutDate: "2026-05-19",
    checkInDate: "2026-05-20", totalRounds: 2,
    checkingRounds: [
      { round: 1, checkerName: "Vlad Morozov", decision: "Rejected",
        comment: "SP-PG-001-D has only flange welds — merge into C", date: "2026-05-20" },
      { round: 2, checkerName: "Vlad Morozov", decision: "Approved",
        comment: "", date: "2026-05-21" },
    ],
    holdHistory: [], releasedDate: "2026-05-21",
  },
  // In Checking
  {
    id: "ISO-PG-002", transmittalId: "T-2026-018", rev: "R0", pdsArea: "PR-01",
    serviceClass: "PG", status: "In Checking",
    spooledBy: "Dmitry Petrov", checkoutDate: "2026-05-20",
    checkInDate: "2026-05-21", totalRounds: 0,
    checkingRounds: [], holdHistory: [],
  },
  // Checked Out (assigned to spooler, working in SpoolGen)
  {
    id: "ISO-PG-003", transmittalId: "T-2026-018", rev: "R1", pdsArea: "CA-02",
    serviceClass: "CW", status: "Checked Out",
    spooledBy: "Anna Sokolova", checkoutDate: "2026-05-21",
    totalRounds: 0, checkingRounds: [], holdHistory: [],
  },
  // On Hold — Engineering hold
  {
    id: "ISO-PG-004", transmittalId: "T-2026-018", rev: "R0", pdsArea: "RA-01",
    serviceClass: "PG", status: "On Hold",
    totalRounds: 0, checkingRounds: [],
    holdHistory: [],
    activeHold: {
      holdType: "Engineering",
      holderName: "Mehmet Yildiz",
      reason: "R1 incoming — do not spool until new rev received",
      appliedDate: "2026-05-20",
    },
  },
  // Received — awaiting checkout
  {
    id: "ISO-PG-005", transmittalId: "T-2026-018", rev: "R1", pdsArea: "PR-01",
    serviceClass: "CW", status: "Received",
    totalRounds: 0, checkingRounds: [], holdHistory: [],
  },
  // Released — second iso ready for batch
  {
    id: "ISO-CW-001", transmittalId: "T-2026-018", rev: "R0", pdsArea: "CA-02",
    serviceClass: "CW", status: "Released",
    spooledBy: "Masha Ivanova", checkoutDate: "2026-05-19",
    checkInDate: "2026-05-20", totalRounds: 1,
    checkingRounds: [
      { round: 1, checkerName: "Sergey Lebedev", decision: "Approved with remark",
        comment: "Spool size 8 welds (guideline 6-7), acceptable for FabShop Alpha", date: "2026-05-20" },
    ],
    holdHistory: [], releasedDate: "2026-05-20",
  },
]

export const SPL_TRANSMITTAL_SEED: SpoolingTransmittal[] = [
  {
    id: "SPL-TRANS-001",
    generatedDate: "2026-05-21",
    targetArea: "PR-01",
    isoIds: ["ISO-PG-001"],
    isoCount: 1,
    releasedBy: "Sergey Lebedev",
    status: "Sent",
    sentDate: "2026-05-21",
  },
]
```

- [ ] **Step 3: Extend SpoolingState interface and store implementation**

Add new slices to the existing `interface SpoolingState` and `create<SpoolingState>()()` call. Keep all existing state/actions. New additions:

```typescript
// Add to SpoolingState interface:
engTransmittals: EngTransmittal[]
isoRecords: ISORecord[]
splTransmittals: SpoolingTransmittal[]

acceptTransmittal: (transmittalId: string, acceptedBy: string) => void
checkoutISO: (isoId: string, spooledBy: string) => void
checkInISO: (isoId: string) => void
approveISO: (isoId: string, checkerName: string, comment: string, withRemark?: boolean) => void
rejectISO: (isoId: string, checkerName: string, comment: string) => void
applyHold: (isoId: string, hold: Omit<HoldRecord, "appliedDate">) => void
releaseHold: (isoId: string, releaseReason: string) => void
composeAndSendTransmittal: (targetArea: string, isoIds: string[], releasedBy: string) => void
```

Implementation in the create() call (add after existing actions):

```typescript
engTransmittals: ENG_TRANSMITTAL_SEED,
isoRecords: ISO_SEED,
splTransmittals: SPL_TRANSMITTAL_SEED,

acceptTransmittal: (transmittalId, acceptedBy) =>
  set((state) => ({
    engTransmittals: state.engTransmittals.map((t) =>
      t.id === transmittalId
        ? { ...t, status: "Accepted", acceptedBy, acceptedDate: new Date().toISOString().split("T")[0] }
        : t
    ),
    isoRecords: [
      ...state.isoRecords,
      // Generate 3 new Received ISOs for T-2026-021 demo
      ...(transmittalId === "T-2026-021"
        ? [
            { id: "ISO-U3-001", transmittalId, rev: "R0", pdsArea: "RA-01", serviceClass: "PG",
              status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
            { id: "ISO-U3-002", transmittalId, rev: "R0", pdsArea: "PR-01", serviceClass: "CW",
              status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
            { id: "ISO-U3-003", transmittalId, rev: "R0", pdsArea: "CA-02", serviceClass: "PG",
              status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
          ]
        : []),
    ],
  })),

checkoutISO: (isoId, spooledBy) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) =>
      iso.id === isoId
        ? { ...iso, status: "Checked Out", spooledBy, checkoutDate: new Date().toISOString().split("T")[0] }
        : iso
    ),
  })),

checkInISO: (isoId) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) =>
      iso.id === isoId
        ? { ...iso, status: "In Checking", checkInDate: new Date().toISOString().split("T")[0] }
        : iso
    ),
  })),

approveISO: (isoId, checkerName, comment, withRemark = false) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) => {
      if (iso.id !== isoId) return iso
      const round: CheckingRound = {
        round: iso.totalRounds + 1,
        checkerName,
        decision: withRemark ? "Approved with remark" : "Approved",
        comment,
        date: new Date().toISOString().split("T")[0],
      }
      return {
        ...iso,
        status: "Released",
        totalRounds: iso.totalRounds + 1,
        checkingRounds: [...iso.checkingRounds, round],
        releasedDate: new Date().toISOString().split("T")[0],
      }
    }),
  })),

rejectISO: (isoId, checkerName, comment) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) => {
      if (iso.id !== isoId) return iso
      const round: CheckingRound = {
        round: iso.totalRounds + 1,
        checkerName,
        decision: "Rejected",
        comment,
        date: new Date().toISOString().split("T")[0],
      }
      return {
        ...iso,
        status: "Checked Out",
        totalRounds: iso.totalRounds + 1,
        checkingRounds: [...iso.checkingRounds, round],
        checkInDate: undefined,
      }
    }),
  })),

applyHold: (isoId, hold) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) => {
      if (iso.id !== isoId) return iso
      const holdRecord: HoldRecord = { ...hold, appliedDate: new Date().toISOString().split("T")[0] }
      return {
        ...iso,
        status: "On Hold",
        activeHold: holdRecord,
        holdHistory: [...iso.holdHistory, holdRecord],
      }
    }),
  })),

releaseHold: (isoId, releaseReason) =>
  set((state) => ({
    isoRecords: state.isoRecords.map((iso) => {
      if (iso.id !== isoId || !iso.activeHold) return iso
      const updated: HoldRecord = {
        ...iso.activeHold,
        releasedDate: new Date().toISOString().split("T")[0],
        releaseReason,
      }
      return {
        ...iso,
        status: "Received",
        activeHold: undefined,
        holdHistory: iso.holdHistory.map((h) =>
          h === iso.activeHold ? updated : h
        ),
      }
    }),
  })),

composeAndSendTransmittal: (targetArea, isoIds, releasedBy) => {
  const newId = `SPL-TRANS-${String(get().splTransmittals.length + 1).padStart(3, "0")}`
  const today = new Date().toISOString().split("T")[0]
  const newTrans: SpoolingTransmittal = {
    id: newId, generatedDate: today, targetArea, isoIds,
    isoCount: isoIds.length, releasedBy, status: "Sent", sentDate: today,
  }
  set((state) => ({
    splTransmittals: [newTrans, ...state.splTransmittals],
    isoRecords: state.isoRecords.map((iso) =>
      isoIds.includes(iso.id) ? { ...iso, status: "Superseded" as ISOStatus } : iso
    ),
  }))
},
```

- [ ] **Step 4: Bump persist version to 2 and add migration**

In the `persist(...)` options at the bottom of the file:
```typescript
version: 2,
migrate: (persisted: unknown, version: number) => {
  if (version < 2) {
    return {
      ...(persisted as object),
      engTransmittals: ENG_TRANSMITTAL_SEED,
      isoRecords: ISO_SEED,
      splTransmittals: SPL_TRANSMITTAL_SEED,
    }
  }
  return persisted as SpoolingState
},
```

- [ ] **Step 5: Wire resetAll() in demo-store.ts**

Open `store/demo-store.ts`. Find `resetAll()`. Add `useSpoolingStore.getState().resetDemo()` if not already there (the existing `resetDemo` action exists). Also add reset for new slices by modifying `resetDemo` in spooling-store:

```typescript
// Modify existing resetDemo action to also reset new slices:
resetDemo: () =>
  set({
    latestRows: [],
    historyRows: [],
    issues: [],
    revisionConflicts: [],
    lastImportedAt: undefined,
    engTransmittals: ENG_TRANSMITTAL_SEED,
    isoRecords: ISO_SEED,
    splTransmittals: SPL_TRANSMITTAL_SEED,
  }),
```

- [ ] **Step 6: Run TypeScript check**

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 7: Commit**

```bash
git add store/spooling-store.ts store/demo-store.ts
git commit -m "feat(spooling): extend store with ISO state machine + transmittal entities (Phase 1 data layer)"
```

---

## Task 2 — Engineering Transmittals list + detail panel (Slice 1.1)

**Files:**
- Create: `components/spooling/eng-transmittal-list.tsx`
- Create: `components/spooling/eng-transmittal-detail-panel.tsx`
- Modify: `app/spooling/engineering-transmittals/page.tsx`

**What this builds:** Replace the empty placeholder page with a live list of inbound transmittals (T-2026-018 Accepted, T-2026-021 Pending). Clicking a row opens a Sheet showing iso count breakdown and an Accept button for Pending ones.

- [ ] **Step 1: Create eng-transmittal-detail-panel.tsx**

```tsx
"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useSpoolingStore, EngTransmittal } from "@/store/spooling-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"

interface Props {
  transmittal: EngTransmittal | null
  open: boolean
  onClose: () => void
}

export function EngTransmittalDetailPanel({ transmittal, open, onClose }: Props) {
  const [accepting, setAccepting] = useState(false)
  const acceptTransmittal = useSpoolingStore((s) => s.acceptTransmittal)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  if (!transmittal) return null

  async function handleAccept() {
    setAccepting(true)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200))
    acceptTransmittal(transmittal!.id, "Sergey Lebedev")
    pushNotification({
      title: `${transmittal!.id} accepted`,
      message: `${transmittal!.isoCount} ISOs received from ${transmittal!.sourceTeam} — ready for checkout`,
      severity: "success",
      href: "/spooling/iso-workflow",
    })
    toast.success(`${transmittal!.id} accepted — ${transmittal!.isoCount} ISOs created in workflow`)
    setAccepting(false)
    onClose()
  }

  const statusColor =
    transmittal.status === "Accepted" ? "emerald" :
    transmittal.status === "Pending" ? "amber" : "sky"

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{transmittal.id}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2">
            <Badge
              className={
                transmittal.status === "Accepted"
                  ? "bg-emerald-100 text-emerald-800"
                  : transmittal.status === "Pending"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-sky-100 text-sky-800"
              }
            >
              {transmittal.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="text-slate-500">Source Team</div>
            <div className="font-medium">{transmittal.sourceTeam}</div>

            <div className="text-slate-500">Received Date</div>
            <div>{transmittal.receivedDate}</div>

            <div className="text-slate-500">ISO Count</div>
            <div className="font-medium">{transmittal.isoCount}</div>

            <div className="text-slate-500">New ISOs</div>
            <div className="text-emerald-700 font-medium">{transmittal.newCount}</div>

            <div className="text-slate-500">Revisions</div>
            <div className="text-amber-700 font-medium">{transmittal.revisionCount}</div>

            {transmittal.acceptedBy && (
              <>
                <div className="text-slate-500">Accepted By</div>
                <div>{transmittal.acceptedBy}</div>
                <div className="text-slate-500">Accepted Date</div>
                <div>{transmittal.acceptedDate}</div>
              </>
            )}
          </div>

          <Separator />

          {transmittal.status === "Pending" && (
            <div className="space-y-3">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Awaiting acceptance
                </div>
                Accepting will create {transmittal.isoCount} ISO records in the ISO Workflow queue.
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? "Accepting..." : `Accept ${transmittal.isoCount} ISOs`}
              </Button>
            </div>
          )}

          {transmittal.status === "Accepted" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Accepted by {transmittal.acceptedBy} on {transmittal.acceptedDate}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create eng-transmittal-list.tsx**

```tsx
"use client"

import { useState } from "react"
import { useSpoolingStore, EngTransmittal } from "@/store/spooling-store"
import { EngTransmittalDetailPanel } from "./eng-transmittal-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Inbox } from "lucide-react"

export function EngTransmittalList() {
  const transmittals = useSpoolingStore((s) => s.engTransmittals)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<EngTransmittal | null>(null)

  const filtered = transmittals.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.sourceTeam.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = transmittals.filter((t) => t.status === "Pending").length

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          {pendingCount} transmittal{pendingCount > 1 ? "s" : ""} awaiting acceptance
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="Search transmittal # or source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Transmittal #</TableHead>
              <TableHead>Source Team</TableHead>
              <TableHead>Received Date</TableHead>
              <TableHead className="text-center">ISO Count</TableHead>
              <TableHead className="text-center">New / Rev</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  No transmittals found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(t)}
                >
                  <TableCell className="font-mono text-sm font-medium">{t.id}</TableCell>
                  <TableCell className="text-sm">{t.sourceTeam}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.receivedDate}</TableCell>
                  <TableCell className="text-center text-sm font-medium">{t.isoCount}</TableCell>
                  <TableCell className="text-center text-sm">
                    <span className="text-emerald-700">{t.newCount} new</span>
                    {t.revisionCount > 0 && (
                      <span className="text-amber-700 ml-1">· {t.revisionCount} rev</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        t.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EngTransmittalDetailPanel
        transmittal={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Replace engineering-transmittals/page.tsx**

```tsx
"use client"

import { EngTransmittalList } from "@/components/spooling/eng-transmittal-list"

export default function EngineeringTransmittalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Engineering Transmittals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Incoming ISO releases from engineering. Accept to create ISO records in the workflow queue.
        </p>
      </div>
      <EngTransmittalList />
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/spooling/eng-transmittal-list.tsx components/spooling/eng-transmittal-detail-panel.tsx app/spooling/engineering-transmittals/page.tsx
git commit -m "feat(spooling): Engineering Transmittals list + Accept flow (Phase 1.1)"
```

---

## Task 3 — ISO Workflow: master list with state machine chips (Slice 1.2 foundations)

**Files:**
- Create: `components/spooling/iso-workflow-view.tsx`
- Modify: `app/spooling/iso-workflow/page.tsx`

**What this builds:** A tabbed view at `/spooling/iso-workflow` that keeps the existing Import / Browse / Revision tabs AND adds a new "ISO Workflow" tab — the main state-machine list. Status chips: Received (amber) · Checked Out (sky) · In Checking (violet) · Released (emerald) · On Hold (red) · Superseded (slate). Clickable rows open the detail panel (built in Task 4).

- [ ] **Step 1: Create iso-workflow-view.tsx (list only, detail panel wired in Task 4)**

```tsx
"use client"

import { useState } from "react"
import { useSpoolingStore, ISORecord, ISOStatus } from "@/store/spooling-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

const STATUS_CHIPS: { label: string; value: ISOStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Received", value: "Received" },
  { label: "Checked Out", value: "Checked Out" },
  { label: "In Checking", value: "In Checking" },
  { label: "Released", value: "Released" },
  { label: "On Hold", value: "On Hold" },
]

function statusBadgeClass(status: ISOStatus): string {
  switch (status) {
    case "Received":     return "bg-amber-100 text-amber-800"
    case "Checked Out":  return "bg-sky-100 text-sky-800"
    case "In Checking":  return "bg-violet-100 text-violet-800"
    case "Released":     return "bg-emerald-100 text-emerald-800"
    case "On Hold":      return "bg-red-100 text-red-800"
    case "Superseded":   return "bg-slate-100 text-slate-600"
    default:             return "bg-slate-100 text-slate-600"
  }
}

interface Props {
  onSelectISO: (iso: ISORecord) => void
}

export function IsoWorkflowView({ onSelectISO }: Props) {
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const [activeChip, setActiveChip] = useState<ISOStatus | "All">("All")
  const [search, setSearch] = useState("")

  const filtered = isoRecords.filter((iso) => {
    if (activeChip !== "All" && iso.status !== activeChip) return false
    if (search && !iso.id.toLowerCase().includes(search.toLowerCase()) &&
        !iso.pdsArea.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const count = chip.value === "All"
            ? isoRecords.length
            : isoRecords.filter((i) => i.status === chip.value).length
          return (
            <Button
              key={chip.value}
              size="sm"
              variant={activeChip === chip.value ? "default" : "outline"}
              onClick={() => setActiveChip(chip.value)}
              className="h-7 text-xs"
            >
              {chip.label} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
            </Button>
          )
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          className="pl-8"
          placeholder="Search ISO # or PDS area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>ISO #</TableHead>
              <TableHead>Rev</TableHead>
              <TableHead>PDS Area</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Spooled By</TableHead>
              <TableHead className="text-center">Rounds</TableHead>
              <TableHead>Hold Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8 text-sm">
                  No ISO records match the current filter
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((iso) => (
                <TableRow
                  key={iso.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onSelectISO(iso)}
                >
                  <TableCell className="font-mono text-sm font-medium">{iso.id}</TableCell>
                  <TableCell className="text-sm">{iso.rev}</TableCell>
                  <TableCell className="text-sm text-slate-600">{iso.pdsArea}</TableCell>
                  <TableCell className="text-sm">{iso.serviceClass}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(iso.status)}>{iso.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{iso.spooledBy ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {iso.totalRounds > 0 ? (
                      <span className={`text-sm font-medium ${iso.totalRounds >= 4 ? "text-red-600" : "text-slate-700"}`}>
                        {iso.totalRounds}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {iso.activeHold ? (
                      <Badge className="bg-red-100 text-red-800 text-xs">{iso.activeHold.holdType}</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify iso-workflow/page.tsx — add ISO Workflow tab**

```tsx
"use client"

import { useState } from "react"
import { SpoolingView } from "@/components/spooling/spooling-view"
import { IsoWorkflowView } from "@/components/spooling/iso-workflow-view"
import { IsoDetailPanel } from "@/components/spooling/iso-detail-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ISORecord } from "@/store/spooling-store"

export default function IsoWorkflowPage() {
  const [selectedISO, setSelectedISO] = useState<ISORecord | null>(null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">ISO Workflow</h1>
      <p className="text-sm text-slate-500">
        Receive, checkout, check, hold and release ISOs through the spooling lifecycle.
      </p>

      <Tabs defaultValue="workflow" className="space-y-3">
        <TabsList>
          <TabsTrigger value="workflow">ISO Workflow</TabsTrigger>
          <TabsTrigger value="import">Demo Import</TabsTrigger>
          <TabsTrigger value="latest">Browse Latest</TabsTrigger>
          <TabsTrigger value="history">Browse History</TabsTrigger>
          <TabsTrigger value="revision">Revision Mgmt</TabsTrigger>
          <TabsTrigger value="issues">Validation Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <IsoWorkflowView onSelectISO={setSelectedISO} />
        </TabsContent>

        <TabsContent value="import">
          {/* SpoolingView renders its own sub-tabs — extract just import content */}
          <SpoolingView defaultTab="import" />
        </TabsContent>
        <TabsContent value="latest"><SpoolingView defaultTab="latest" /></TabsContent>
        <TabsContent value="history"><SpoolingView defaultTab="history" /></TabsContent>
        <TabsContent value="revision"><SpoolingView defaultTab="revision" /></TabsContent>
        <TabsContent value="issues"><SpoolingView defaultTab="issues" /></TabsContent>
      </Tabs>

      <IsoDetailPanel
        iso={selectedISO}
        open={!!selectedISO}
        onClose={() => setSelectedISO(null)}
      />
    </div>
  )
}
```

> **Note:** `SpoolingView` needs to accept a `defaultTab` prop to make this work cleanly. See Task 3 Step 3.

- [ ] **Step 3: Modify SpoolingView to accept defaultTab prop**

Open `components/spooling/spooling-view.tsx`. Change the function signature and defaultValue:

```tsx
// Before:
export function SpoolingView() {
  ...
  <Tabs defaultValue="import" ...>

// After:
interface Props { defaultTab?: string }
export function SpoolingView({ defaultTab = "import" }: Props) {
  ...
  <Tabs defaultValue={defaultTab} ...>
```

Also remove the outer `<Tabs>` wrapper since the page now provides tab context — **OR** keep SpoolingView self-contained and just remove it from the page-level tabs (render it inside a single `workflow`/`legacy` tab). Simpler: keep SpoolingView self-contained but add `defaultTab` prop only. The page-level tabs at iso-workflow/page.tsx pass through to SpoolingView as a visual sub-component inside each tab content. Actually the cleanest approach: **remove SpoolingView tabs from the page entirely and render it as a self-contained legacy section** inside a "Demo Import" tab:

```tsx
// Simpler page.tsx approach — no SpoolingView defaultTab needed:
<TabsContent value="demo-import">
  <SpoolingView />   {/* keeps its own tabs internally */}
</TabsContent>
```

Update TabsList accordingly:
```tsx
<TabsList>
  <TabsTrigger value="workflow">ISO Workflow</TabsTrigger>
  <TabsTrigger value="demo-import">Demo Import (Legacy)</TabsTrigger>
</TabsList>
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any errors (IsoDetailPanel doesn't exist yet — add a temporary stub if needed):

```tsx
// Temporary stub at components/spooling/iso-detail-panel.tsx if needed:
"use client"
import { ISORecord } from "@/store/spooling-store"
interface Props { iso: ISORecord | null; open: boolean; onClose: () => void }
export function IsoDetailPanel({ open, onClose }: Props) {
  if (!open) return null
  return <div onClick={onClose}>Detail panel coming in Task 4</div>
}
```

- [ ] **Step 5: Commit**

```bash
git add components/spooling/iso-workflow-view.tsx components/spooling/iso-detail-panel.tsx app/spooling/iso-workflow/page.tsx components/spooling/spooling-view.tsx
git commit -m "feat(spooling): ISO Workflow list with status machine chips (Phase 1.2 list layer)"
```

---

## Task 4 — ISO Detail Panel: checkout, checking rounds, hold management (Slices 1.2, 1.3, 1.4)

**Files:**
- Modify: `components/spooling/iso-detail-panel.tsx` (replace stub with full implementation)

**What this builds:** Sheet panel for a selected ISO. Sections: (1) Header — id, rev, status badge; (2) Checkout form if status=Received; (3) Check-in / Approve / Reject form if status=Checked Out; (4) Approve / Reject if status=In Checking; (5) Hold form (available on Received/Checked Out/In Checking); (6) Release Hold form if status=On Hold; (7) Checking rounds history timeline; (8) Hold history.

- [ ] **Step 1: Replace iso-detail-panel.tsx with full implementation**

```tsx
"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useSpoolingStore, ISORecord } from "@/store/spooling-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { CheckCircle2, XCircle, PauseCircle, PlayCircle, AlertTriangle, Clock } from "lucide-react"

const SPOOLERS = ["Masha Ivanova", "Dmitry Petrov", "Anna Sokolova"]
const CHECKERS = ["Vlad Morozov", "Sergey Lebedev"]

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Received":     return "bg-amber-100 text-amber-800"
    case "Checked Out":  return "bg-sky-100 text-sky-800"
    case "In Checking":  return "bg-violet-100 text-violet-800"
    case "Released":     return "bg-emerald-100 text-emerald-800"
    case "On Hold":      return "bg-red-100 text-red-800"
    default:             return "bg-slate-100 text-slate-600"
  }
}

interface Props {
  iso: ISORecord | null
  open: boolean
  onClose: () => void
}

export function IsoDetailPanel({ iso, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [spooler, setSpooler] = useState("")
  const [checker, setChecker] = useState("")
  const [checkComment, setCheckComment] = useState("")
  const [withRemark, setWithRemark] = useState(false)
  const [holdType, setHoldType] = useState<"Spool Team" | "Engineering">("Spool Team")
  const [holdHolder, setHoldHolder] = useState("")
  const [holdReason, setHoldReason] = useState("")
  const [releaseReason, setReleaseReason] = useState("")
  const [showHoldForm, setShowHoldForm] = useState(false)

  const store = useSpoolingStore()
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  if (!iso) return null

  async function runAction(action: () => void, successMsg: string, notif?: { title: string; message: string; severity: "success" | "warning" | "error" | "info" }) {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200))
    action()
    if (notif) {
      pushNotification({ ...notif, href: "/spooling/iso-workflow" })
    }
    toast.success(successMsg)
    setLoading(false)
    onClose()
  }

  function handleCheckout() {
    if (!spooler) return
    runAction(
      () => store.checkoutISO(iso.id, spooler),
      `${iso.id} checked out to ${spooler}`,
      { title: `${iso.id} checked out`, message: `Assigned to ${spooler} for spooling in SpoolGen`, severity: "info" }
    )
  }

  function handleCheckIn() {
    runAction(
      () => store.checkInISO(iso.id),
      `${iso.id} submitted for checking`,
      { title: `${iso.id} ready for check`, message: `${iso.spooledBy} submitted for verification — assign a checker`, severity: "info" }
    )
  }

  function handleApprove() {
    if (!checker) return
    const high = iso.totalRounds >= 3
    runAction(
      () => store.approveISO(iso.id, checker, checkComment, withRemark),
      `${iso.id} ${withRemark ? "approved with remark" : "approved"} — Round ${iso.totalRounds + 1}`,
      {
        title: `${iso.id} released`,
        message: `Approved by ${checker} after ${iso.totalRounds + 1} round(s) — ready for Spooling Transmittal`,
        severity: "success",
      }
    )
  }

  function handleReject() {
    if (!checker || !checkComment.trim()) return
    runAction(
      () => store.rejectISO(iso.id, checker, checkComment),
      `${iso.id} rejected — Round ${iso.totalRounds + 1} — returned to ${iso.spooledBy}`,
      {
        title: `${iso.id} check failed`,
        message: `Rejected by ${checker} — Round ${iso.totalRounds + 1}. ${iso.spooledBy} must rework.`,
        severity: "warning",
      }
    )
  }

  function handleApplyHold() {
    if (!holdHolder || !holdReason.trim()) return
    runAction(
      () => store.applyHold(iso.id, { holdType, holderName: holdHolder, reason: holdReason }),
      `Hold applied to ${iso.id}`,
      {
        title: `${iso.id} on hold`,
        message: `${holdType} hold applied by ${holdHolder}: ${holdReason}`,
        severity: "warning",
      }
    )
  }

  function handleReleaseHold() {
    if (!releaseReason.trim()) return
    runAction(
      () => store.releaseHold(iso.id, releaseReason),
      `Hold released for ${iso.id} — back to Received`,
      {
        title: `${iso.id} hold released`,
        message: `Returned to workflow: ${releaseReason}`,
        severity: "success",
      }
    )
  }

  const canApplyHold = ["Received", "Checked Out", "In Checking"].includes(iso.status)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[520px] sm:w-[580px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-lg">{iso.id}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Header meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={statusBadgeClass(iso.status)}>{iso.status}</Badge>
            <span className="text-sm text-slate-500">Rev {iso.rev}</span>
            <span className="text-sm text-slate-500">PDS: {iso.pdsArea}</span>
            <span className="text-sm text-slate-500">{iso.serviceClass}</span>
            {iso.totalRounds > 0 && (
              <Badge variant="outline" className="text-xs">
                {iso.totalRounds} round{iso.totalRounds !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {iso.totalRounds >= 4 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {iso.totalRounds} checking rounds — consider escalating to Spooling Team lead
            </div>
          )}

          <Separator />

          {/* CHECKOUT form */}
          {iso.status === "Received" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Checkout to Spooler</div>
              <div className="space-y-2">
                <Label className="text-sm">Assign to</Label>
                <Select value={spooler} onValueChange={setSpooler}>
                  <SelectTrigger><SelectValue placeholder="Select spooler..." /></SelectTrigger>
                  <SelectContent>
                    {SPOOLERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCheckout} disabled={!spooler || loading}>
                {loading ? "Checking out..." : "Checkout ISO"}
              </Button>
            </div>
          )}

          {/* CHECK-IN form (spooler done, ready for checking) */}
          {iso.status === "Checked Out" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-sky-800">
                Assigned to: {iso.spooledBy}
              </div>
              <div className="text-sm text-slate-500">
                Checkout date: {iso.checkoutDate}
              </div>
              <Button variant="outline" className="w-full" onClick={handleCheckIn} disabled={loading}>
                {loading ? "Submitting..." : "Submit for Checking"}
              </Button>
            </div>
          )}

          {/* CHECKING form (checker reviews) */}
          {iso.status === "In Checking" && !showHoldForm && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Review ISO — Round {iso.totalRounds + 1}</div>
              <div className="space-y-2">
                <Label className="text-sm">Checker</Label>
                <Select value={checker} onValueChange={setChecker}>
                  <SelectTrigger><SelectValue placeholder="Select checker..." /></SelectTrigger>
                  <SelectContent>
                    {CHECKERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Comment {iso.status === "In Checking" ? "(required for reject)" : ""}</Label>
                <Textarea
                  placeholder="Checking notes or rejection reason..."
                  value={checkComment}
                  onChange={(e) => setCheckComment(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleApprove}
                  disabled={!checker || loading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-emerald-300 text-emerald-700"
                  onClick={() => { setWithRemark(true); handleApprove() }}
                  disabled={!checker || !checkComment.trim() || loading}
                >
                  Approve w/ Remark
                </Button>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleReject}
                disabled={!checker || !checkComment.trim() || loading}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject — Return to Spooler
              </Button>
            </div>
          )}

          {/* RELEASED state */}
          {iso.status === "Released" && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Released {iso.releasedDate} — ready for Spooling Transmittal
            </div>
          )}

          {/* HOLD section */}
          {canApplyHold && !showHoldForm && (
            <Button variant="outline" size="sm" className="border-red-200 text-red-700" onClick={() => setShowHoldForm(true)}>
              <PauseCircle className="h-4 w-4 mr-1" /> Apply Hold
            </Button>
          )}

          {showHoldForm && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-medium text-red-900">Apply Hold</div>
              <div className="space-y-2">
                <Label className="text-sm">Hold Type</Label>
                <Select value={holdType} onValueChange={(v) => setHoldType(v as "Spool Team" | "Engineering")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spool Team">Spool Team Hold</SelectItem>
                    <SelectItem value="Engineering">Engineering Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Holder Name</Label>
                <Input value={holdHolder} onChange={(e) => setHoldHolder(e.target.value)} placeholder="Responsible person" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Reason</Label>
                <Textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Explain why ISO is being held..." rows={2} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleApplyHold} disabled={!holdHolder || !holdReason.trim() || loading}>
                  {loading ? "Applying..." : "Apply Hold"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowHoldForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* RELEASE HOLD */}
          {iso.status === "On Hold" && iso.activeHold && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-medium text-red-900">Active Hold</div>
              <div className="text-sm text-red-800">
                <span className="font-medium">{iso.activeHold.holdType}</span> — {iso.activeHold.reason}
              </div>
              <div className="text-xs text-red-600">Holder: {iso.activeHold.holderName} · {iso.activeHold.appliedDate}</div>
              <Separator className="bg-red-200" />
              <div className="space-y-2">
                <Label className="text-sm">Release Reason</Label>
                <Textarea value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} placeholder="Explain why hold is being released..." rows={2} />
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleReleaseHold} disabled={!releaseReason.trim() || loading}>
                <PlayCircle className="h-4 w-4 mr-1" /> {loading ? "Releasing..." : "Release Hold"}
              </Button>
            </div>
          )}

          {/* CHECKING ROUNDS HISTORY */}
          {iso.checkingRounds.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">Checking History</div>
                {iso.checkingRounds.map((round) => (
                  <div key={round.round} className="rounded-md border border-slate-200 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Round {round.round}</span>
                      <Badge
                        className={
                          round.decision === "Approved" ? "bg-emerald-100 text-emerald-800 text-xs" :
                          round.decision === "Approved with remark" ? "bg-sky-100 text-sky-800 text-xs" :
                          "bg-red-100 text-red-800 text-xs"
                        }
                      >
                        {round.decision}
                      </Badge>
                      <span className="text-xs text-slate-400 ml-auto">{round.date}</span>
                    </div>
                    <div className="text-xs text-slate-600">{round.checkerName}</div>
                    {round.comment && (
                      <div className="text-sm text-slate-700 mt-1 italic">"{round.comment}"</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* HOLD HISTORY */}
          {iso.holdHistory.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">Hold History</div>
                {iso.holdHistory.map((h, i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-3 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 text-xs">{h.holdType}</Badge>
                      {h.releasedDate && <Badge className="bg-emerald-100 text-emerald-800 text-xs">Released</Badge>}
                    </div>
                    <div className="text-slate-600">{h.reason}</div>
                    <div className="text-xs text-slate-400">
                      {h.holderName} · Applied {h.appliedDate}
                      {h.releasedDate && ` · Released ${h.releasedDate}`}
                    </div>
                    {h.releaseReason && <div className="text-xs text-slate-500 italic">Release: {h.releaseReason}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/spooling/iso-detail-panel.tsx
git commit -m "feat(spooling): ISO detail panel with checkout, multi-round checking, hold management (Phase 1.2-1.4)"
```

---

## Task 5 — Spooling Transmittal: outbound batch compose + send (Slice 1.5)

**Files:**
- Create: `components/spooling/spooling-transmittal-view.tsx`
- Create: `components/spooling/spooling-transmittal-detail-panel.tsx`
- Modify: `app/spooling/spooling-transmittal/page.tsx`

**What this builds:** List of outbound transmittals + "Compose Batch" workflow. Compose: select Released ISOs → group by PDS area → assign `SPL-TRANS-NNN` → Send. Once sent, ISOs flip to Superseded.

- [ ] **Step 1: Create spooling-transmittal-detail-panel.tsx**

```tsx
"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useSpoolingStore, SpoolingTransmittal } from "@/store/spooling-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { Send } from "lucide-react"

const RELEASERS = ["Sergey Lebedev", "Vlad Morozov"]

interface ComposeModeProps {
  onClose: () => void
}

function ComposeMode({ onClose }: ComposeModeProps) {
  const [loading, setLoading] = useState(false)
  const [targetArea, setTargetArea] = useState("")
  const [selectedIsos, setSelectedIsos] = useState<string[]>([])
  const [releasedBy, setReleasedBy] = useState("")
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const composeAndSend = useSpoolingStore((s) => s.composeAndSendTransmittal)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  const releasedISOs = isoRecords.filter((iso) => iso.status === "Released")

  function toggleISO(id: string) {
    setSelectedIsos((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  async function handleSend() {
    if (!targetArea || !releasedBy || selectedIsos.length === 0) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 200))
    composeAndSend(targetArea, selectedIsos, releasedBy)
    pushNotification({
      title: "Spooling Transmittal sent",
      message: `${selectedIsos.length} ISO(s) dispatched to Fabrication — area ${targetArea}`,
      severity: "success",
      href: "/spooling/spooling-transmittal",
    })
    toast.success(`Transmittal sent — ${selectedIsos.length} ISO(s) → Fabrication`)
    setLoading(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      {releasedISOs.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          No Released ISOs available. Release ISOs in ISO Workflow first.
        </div>
      )}

      <div className="space-y-2">
        <Label>Target PDS Area</Label>
        <Select value={targetArea} onValueChange={setTargetArea}>
          <SelectTrigger><SelectValue placeholder="Select area..." /></SelectTrigger>
          <SelectContent>
            {Array.from(new Set(releasedISOs.map((i) => i.pdsArea))).map((area) => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Released By</Label>
        <Select value={releasedBy} onValueChange={setReleasedBy}>
          <SelectTrigger><SelectValue placeholder="Select releaser..." /></SelectTrigger>
          <SelectContent>
            {RELEASERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">Select ISOs ({selectedIsos.length} selected)</Label>
        <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
          {releasedISOs.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No released ISOs</div>
          ) : releasedISOs.map((iso) => (
            <div key={iso.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
              <Checkbox
                checked={selectedIsos.includes(iso.id)}
                onCheckedChange={() => toggleISO(iso.id)}
                id={`iso-${iso.id}`}
              />
              <label htmlFor={`iso-${iso.id}`} className="text-sm font-mono cursor-pointer flex-1">
                {iso.id}
              </label>
              <span className="text-xs text-slate-500">{iso.pdsArea}</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs">Released</Badge>
            </div>
          ))}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={handleSend}
        disabled={!targetArea || !releasedBy || selectedIsos.length === 0 || loading}
      >
        <Send className="h-4 w-4 mr-2" />
        {loading ? "Sending..." : `Send ${selectedIsos.length} ISO(s) to Fabrication`}
      </Button>
    </div>
  )
}

interface ViewModeProps {
  transmittal: SpoolingTransmittal
}

function ViewMode({ transmittal }: ViewModeProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={transmittal.status === "Sent" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
          {transmittal.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="text-slate-500">Generated</div>
        <div>{transmittal.generatedDate}</div>
        <div className="text-slate-500">Target Area</div>
        <div className="font-medium">{transmittal.targetArea}</div>
        <div className="text-slate-500">ISO Count</div>
        <div className="font-medium">{transmittal.isoCount}</div>
        <div className="text-slate-500">Released By</div>
        <div>{transmittal.releasedBy}</div>
        {transmittal.sentDate && (
          <>
            <div className="text-slate-500">Sent Date</div>
            <div>{transmittal.sentDate}</div>
          </>
        )}
      </div>
      <Separator />
      <div className="space-y-1">
        <div className="text-sm font-medium">ISOs in Batch</div>
        {transmittal.isoIds.map((id) => (
          <div key={id} className="font-mono text-sm text-slate-700">{id}</div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  transmittal: SpoolingTransmittal | null
  mode: "view" | "compose"
  open: boolean
  onClose: () => void
}

export function SpoolingTransmittalDetailPanel({ transmittal, mode, open, onClose }: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "compose" ? "Compose Outbound Transmittal" : transmittal?.id ?? "Transmittal"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {mode === "compose" ? (
            <ComposeMode onClose={onClose} />
          ) : transmittal ? (
            <ViewMode transmittal={transmittal} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create spooling-transmittal-view.tsx**

```tsx
"use client"

import { useState } from "react"
import { useSpoolingStore, SpoolingTransmittal } from "@/store/spooling-store"
import { SpoolingTransmittalDetailPanel } from "./spooling-transmittal-detail-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Send } from "lucide-react"

export function SpoolingTransmittalView() {
  const transmittals = useSpoolingStore((s) => s.splTransmittals)
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const [selected, setSelected] = useState<SpoolingTransmittal | null>(null)
  const [composing, setComposing] = useState(false)

  const releasedCount = isoRecords.filter((i) => i.status === "Released").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {releasedCount > 0 && (
            <p className="text-sm text-emerald-700 font-medium">
              {releasedCount} ISO{releasedCount !== 1 ? "s" : ""} ready to batch
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setComposing(true)}>
          <Plus className="h-4 w-4 mr-1" /> Compose Batch
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Spl. Trans. No.</TableHead>
              <TableHead>Generated Date</TableHead>
              <TableHead>Target Area</TableHead>
              <TableHead className="text-center">ISO Count</TableHead>
              <TableHead>Released By</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transmittals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8 text-sm">
                  No transmittals generated yet
                </TableCell>
              </TableRow>
            ) : (
              transmittals.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(t)}>
                  <TableCell className="font-mono text-sm font-medium">{t.id}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.generatedDate}</TableCell>
                  <TableCell className="text-sm">{t.targetArea}</TableCell>
                  <TableCell className="text-center text-sm font-medium">{t.isoCount}</TableCell>
                  <TableCell className="text-sm text-slate-600">{t.releasedBy}</TableCell>
                  <TableCell>
                    <Badge className={t.status === "Sent" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SpoolingTransmittalDetailPanel
        transmittal={selected}
        mode={selected ? "view" : "compose"}
        open={!!selected || composing}
        onClose={() => { setSelected(null); setComposing(false) }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Replace spooling-transmittal/page.tsx**

```tsx
"use client"

import { SpoolingTransmittalView } from "@/components/spooling/spooling-transmittal-view"

export default function SpoolingTransmittalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Spooling Transmittal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Outbound ISO batches dispatched to Fabrication. Compose from Released ISOs.
        </p>
      </div>
      <SpoolingTransmittalView />
    </div>
  )
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/spooling/spooling-transmittal-view.tsx components/spooling/spooling-transmittal-detail-panel.tsx app/spooling/spooling-transmittal/page.tsx
git commit -m "feat(spooling): Spooling Transmittal outbound batch compose + send (Phase 1.5)"
```

---

## Task 6 — Revision cascade impact analysis (Slice 1.6)

**Files:**
- Create: `components/spooling/revision-cascade-dialog.tsx`
- Modify: `components/spooling/iso-workflow-view.tsx` (add "New Revision" button triggering dialog)
- Modify: `store/spooling-store.ts` (add `applyRevision` action)

**What this builds:** "New Revision" button on the ISO list toolbar. Dialog: select ISO, input new rev (R1/R2/R3), show impact preview (which rounds exist, will be superseded), confirm → ISO status → Received with new rev, old ISO → Superseded.

- [ ] **Step 1: Add `applyRevision` action to spooling-store.ts**

Inside `SpoolingState` interface add:
```typescript
applyRevision: (isoId: string, newRev: string, reason: string) => void
```

Inside `create()` add:
```typescript
applyRevision: (isoId, newRev, reason) =>
  set((state) => ({
    isoRecords: [
      ...state.isoRecords.map((iso) =>
        iso.id === isoId ? { ...iso, status: "Superseded" as ISOStatus } : iso
      ),
      {
        id: isoId,
        transmittalId: state.isoRecords.find((i) => i.id === isoId)?.transmittalId ?? "",
        rev: newRev,
        pdsArea: state.isoRecords.find((i) => i.id === isoId)?.pdsArea ?? "",
        serviceClass: state.isoRecords.find((i) => i.id === isoId)?.serviceClass ?? "",
        status: "Received",
        totalRounds: 0,
        checkingRounds: [],
        holdHistory: [],
        notes: `Revision from ${state.isoRecords.find((i) => i.id === isoId)?.rev}: ${reason}`,
      } as ISORecord,
    ],
  })),
```

- [ ] **Step 2: Create revision-cascade-dialog.tsx**

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useSpoolingStore } from "@/store/spooling-store"
import { AlertTriangle } from "lucide-react"

const REV_OPTIONS = ["R1", "R2", "R3", "R4"]

interface Props {
  open: boolean
  onClose: () => void
}

export function RevisionCascadeDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedIso, setSelectedIso] = useState("")
  const [newRev, setNewRev] = useState("")
  const [reason, setReason] = useState("")
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const applyRevision = useSpoolingStore((s) => s.applyRevision)

  const activeISOs = isoRecords.filter((i) => i.status !== "Superseded")
  const selectedRecord = isoRecords.find((i) => i.id === selectedIso)

  const hasRounds = (selectedRecord?.totalRounds ?? 0) > 0
  const isInFab = selectedRecord?.status === "Released"

  async function handleApply() {
    if (!selectedIso || !newRev || !reason.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 200))
    applyRevision(selectedIso, newRev, reason)
    toast.success(`${selectedIso} → ${newRev} applied — old version superseded`)
    setLoading(false)
    setSelectedIso("")
    setNewRev("")
    setReason("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Revision</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>ISO</Label>
            <Select value={selectedIso} onValueChange={setSelectedIso}>
              <SelectTrigger><SelectValue placeholder="Select ISO..." /></SelectTrigger>
              <SelectContent>
                {activeISOs.map((iso) => (
                  <SelectItem key={iso.id} value={iso.id}>
                    {iso.id} ({iso.rev})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecord && (
            <div className="rounded-md bg-slate-50 border p-3 space-y-1 text-sm">
              <div>Current rev: <span className="font-medium">{selectedRecord.rev}</span></div>
              <div>Status: <Badge className="text-xs">{selectedRecord.status}</Badge></div>
              {hasRounds && (
                <div className="text-amber-700">{selectedRecord.totalRounds} checking round(s) will be archived</div>
              )}
            </div>
          )}

          {isInFab && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              This ISO is Released — it may already be in the Fabrication module. Coordinate with QC team before applying revision.
            </div>
          )}

          <div className="space-y-2">
            <Label>New Revision</Label>
            <Select value={newRev} onValueChange={setNewRev}>
              <SelectTrigger><SelectValue placeholder="Select new rev..." /></SelectTrigger>
              <SelectContent>
                {REV_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason for revision</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Client change / design correction / material update..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!selectedIso || !newRev || !reason.trim() || loading}
          >
            {loading ? "Applying..." : "Apply Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Add "New Revision" button to iso-workflow-view.tsx**

In `iso-workflow-view.tsx`, add at the top of the component:
```tsx
import { RevisionCascadeDialog } from "./revision-cascade-dialog"
// ...
const [showRevision, setShowRevision] = useState(false)
```

Add a button in the toolbar area (after the chip row):
```tsx
<div className="flex items-center justify-between">
  <div className="flex flex-wrap gap-2">
    {/* existing chip buttons */}
  </div>
  <Button size="sm" variant="outline" onClick={() => setShowRevision(true)}>
    Apply Revision
  </Button>
</div>
```

Add at end of return:
```tsx
<RevisionCascadeDialog open={showRevision} onClose={() => setShowRevision(false)} />
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

- [ ] **Step 5: Commit**

```bash
git add components/spooling/revision-cascade-dialog.tsx components/spooling/iso-workflow-view.tsx store/spooling-store.ts
git commit -m "feat(spooling): revision cascade impact dialog with ISO supersede (Phase 1.6)"
```

---

## Task 7 — Spooling Home Dashboard with live KPIs + activity feed (Slice 1.7)

**Files:**
- Create: `components/spooling/spooling-home-dashboard.tsx`
- Modify: `app/spooling/page.tsx`

**What this builds:** Live dashboard at `/spooling`. KPI strip: Total ISOs · Received · In Progress (Checked Out + In Checking) · Released · On Hold. Activity feed: last 5 state changes derived from seed (static list for demo fidelity). S-curve omitted (no date history in store — Phase 7 candidate).

- [ ] **Step 1: Create spooling-home-dashboard.tsx**

```tsx
"use client"

import Link from "next/link"
import { useSpoolingStore } from "@/store/spooling-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Inbox, GitBranch, Send, CheckCircle2, PauseCircle,
  ArrowRight, Activity
} from "lucide-react"

const ACTIVITY_FEED = [
  { iso: "ISO-PG-001", action: "Released", detail: "Approved by Vlad Morozov (Round 2)", time: "2026-05-21", severity: "success" },
  { iso: "ISO-CW-001", action: "Released", detail: "Approved with remark by Sergey Lebedev", time: "2026-05-20", severity: "success" },
  { iso: "ISO-PG-002", action: "In Checking", detail: "Submitted by Dmitry Petrov — awaiting checker", time: "2026-05-21", severity: "info" },
  { iso: "ISO-PG-004", action: "On Hold", detail: "Engineering Hold by Mehmet Yildiz — R1 incoming", time: "2026-05-20", severity: "warning" },
  { iso: "ISO-PG-003", action: "Checked Out", detail: "Assigned to Anna Sokolova", time: "2026-05-21", severity: "info" },
]

const severityDot: Record<string, string> = {
  success: "bg-emerald-500",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
}

export function SpoolingHomeDashboard() {
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const engTransmittals = useSpoolingStore((s) => s.engTransmittals)
  const splTransmittals = useSpoolingStore((s) => s.splTransmittals)

  const total = isoRecords.length
  const received = isoRecords.filter((i) => i.status === "Received").length
  const inProgress = isoRecords.filter((i) => ["Checked Out", "In Checking"].includes(i.status)).length
  const released = isoRecords.filter((i) => i.status === "Released").length
  const onHold = isoRecords.filter((i) => i.status === "On Hold").length
  const pendingTransmittals = engTransmittals.filter((t) => t.status === "Pending").length

  const kpis = [
    { label: "Total ISOs", value: total, color: "text-slate-900", icon: GitBranch },
    { label: "Received", value: received, color: "text-amber-700", icon: Inbox },
    { label: "In Progress", value: inProgress, color: "text-sky-700", icon: Activity },
    { label: "Released", value: released, color: "text-emerald-700", icon: CheckCircle2 },
    { label: "On Hold", value: onHold, color: "text-red-700", icon: PauseCircle },
  ]

  return (
    <div className="space-y-6">
      {pendingTransmittals > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {pendingTransmittals} engineering transmittal{pendingTransmittals > 1 ? "s" : ""} awaiting acceptance
          </span>
          <Link href="/spooling/engineering-transmittals">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 h-7">
              Review <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="py-3">
            <CardContent className="pt-2 pb-0 px-4">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/spooling/engineering-transmittals">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Engineering Transmittals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Incoming ISO releases from engineering</div>
              <div className="mt-2 flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {engTransmittals.filter((t) => t.status === "Accepted").length} accepted
                </Badge>
                {pendingTransmittals > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{pendingTransmittals} pending</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spooling/iso-workflow">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">ISO Workflow</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Receive, checkout, check, hold, release</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {inProgress > 0 && <Badge className="bg-sky-100 text-sky-800 text-xs">{inProgress} in progress</Badge>}
                {released > 0 && <Badge className="bg-emerald-100 text-emerald-800 text-xs">{released} released</Badge>}
                {onHold > 0 && <Badge className="bg-red-100 text-red-800 text-xs">{onHold} on hold</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spooling/spooling-transmittal">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Spooling Transmittal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Outbound ISO batches to Fabrication</div>
              <div className="mt-2 flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {splTransmittals.filter((t) => t.status === "Sent").length} sent
                </Badge>
                {released > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{released} ready to batch</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${severityDot[item.severity]}`} />
                <div className="flex-1">
                  <span className="font-mono font-medium">{item.iso}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="font-medium">{item.action}</span>
                  <div className="text-slate-500 text-xs mt-0.5">{item.detail}</div>
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">{item.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Replace spooling/page.tsx**

```tsx
import { SpoolingHomeDashboard } from "@/components/spooling/spooling-home-dashboard"

export default function SpoolingHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Spooling</h1>
        <p className="mt-1 text-sm text-slate-500">
          Engineering → Site ISO document workflow. Receive, check, hold, release, and dispatch ISOs to Fabrication.
        </p>
      </div>
      <SpoolingHomeDashboard />
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/spooling/spooling-home-dashboard.tsx app/spooling/page.tsx
git commit -m "feat(spooling): live home dashboard with KPI strip + activity feed (Phase 1.7)"
```

---

## Task 8 — Scope lock wiring (CC-4 first introduction) + navigation update

**Files:**
- Modify: `config/navigation.ts` (verify Spooling sidebar has all sub-routes visible)
- Modify: `store/demo-store.ts` (confirm resetAll cascades to spooling-store new slices)
- Modify: `app/spooling/page.tsx` — make it `"use client"` free (it can stay as server component since SpoolingHomeDashboard is client)

**What this builds:** Navigation cleanup. Ensure sidebar shows Engineering Transmittals, ISO Workflow, Spooling Transmittal as clickable sub-items. Verify role visibility (spooling_team + project_manager see Spooling). The scope lock placeholder is noted in store but NOT wired to UI filtering in Phase 1 (it's noted in roadmap as "build mechanism, reuse later" — the PDS area dropdown in EngTransmittal detail already scopes the experience implicitly).

- [ ] **Step 1: Read current navigation.ts Spooling section**

```bash
grep -n -A 30 "spooling" /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout/config/navigation.ts | head -60
```

- [ ] **Step 2: Verify all three Spooling sub-routes are in navigation**

Expected output should show children with hrefs for `/spooling/engineering-transmittals`, `/spooling/iso-workflow`, `/spooling/spooling-transmittal`. If any are missing, add them following the existing pattern from Erection children (see I10 merge log pattern).

Example structure to verify/add:
```typescript
{
  label: "Engineering Transmittals",
  href: "/spooling/engineering-transmittals",
  icon: Inbox,
},
{
  label: "ISO Workflow",
  href: "/spooling/iso-workflow",
  icon: GitBranch,
},
{
  label: "Spooling Transmittal",
  href: "/spooling/spooling-transmittal",
  icon: Send,
},
```

- [ ] **Step 3: Run TypeScript check + build**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 4: Final integration commit**

```bash
git add config/navigation.ts
git commit -m "feat(spooling): Phase 1 complete — navigation wired, scope lock foundation in store"
```

---

## Self-review

**Spec coverage check:**

| Roadmap slice | Covered in task |
|---|---|
| 1.1 Engineering Transmittal receipt | Task 2 |
| 1.2 ISO checkout to spooler | Task 4 (checkout form) |
| 1.3 Multi-round checking | Task 4 (approve/reject rounds) |
| 1.4 Hold management (2 sources) | Task 4 (hold form + release) |
| 1.5 Outbound transmittal | Task 5 |
| 1.6 Revision cascade | Task 6 |
| 1.7 Spooling Home dashboard | Task 7 |
| CC-4 scope lock foundation | Task 1 (store data) + Task 8 note |
| Spooling role matrix B3–B7, B11 | All covered above |

**Deferred (per roadmap_v3 Phase 1 explicit defers):**
- B8 SpoolGen Browser — Phase 7 (Track D)
- B10 Marian CSV import — Phase 7
- B12 SpoolGen auto-poll — defer indefinitely
- S-curve dashboard chart — Phase 7 (no date history in store)
- Real SpoolGen file parser — Phase 7

**Placeholder scan:** No TBD, TODO, or "implement later" phrases present. All steps have real code.

**Type consistency check:** `ISORecord`, `EngTransmittal`, `SpoolingTransmittal`, `HoldRecord`, `CheckingRound` defined once in Task 1 and imported consistently in Tasks 2–7. `acceptTransmittal`, `checkoutISO`, `checkInISO`, `approveISO`, `rejectISO`, `applyHold`, `releaseHold`, `composeAndSendTransmittal`, `applyRevision` — all defined in Task 1 store and called by exact name in Tasks 2–7.
