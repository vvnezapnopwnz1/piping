# Phase 2 — Fabrication (Shop) Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Fabrication gaps from roadmap_v3 Phase 2 slices 2.1–2.4, **plus** introduce two cross-cutting nits (PM write-lock and scope-lock UI wiring) that will be reused by Phases 3–6. The Fabrication module is the strongest in PipeQC today (Track G complete) — Phase 2 is about hardening, not building new screens from scratch.

**Critical context discovered during code audit:**
- Welder qualification soft alert (roadmap slice 2.1) is **already live** in `components/weld-detail-panel.tsx:342` and `components/erection/field-weld-detail-panel.tsx:373` via `validateWelder()`. **No work needed** — but we surface it visually in the weld-progress table row for demo punch.
- Heat number validation (slice 2.2) is the **real** gap. `useActivePipingMaterialList()` exists in admin-store (line 778) and is consumed **nowhere**. Per CC-28 / presentation findings #4 + #9, this is a **HARD BLOCK** (record rejected at input), not a soft warning — this is the first hard-block validation in the system.
- PWHT (slice 2.3): per presentation_findings_append_10 #193, PWHT is **resolved by elimination — not a separate screen** in Easy Piping. The `pwhtRequired` flag + `pwhtDate` field already exist on `weld-detail-panel`. Phase 2 work = a focused PWHT release queue (spools with at least one PWHT-required weld awaiting `pwhtDate`), not a new module.
- QC release checklist (slice 2.4): `QC_CHECKLIST` in `lib/spool-data.ts:272` already has 4 items (Dimensional / Visual / Documentation / Traceability). Gap: rename "Documentation review" → "NDE complete" to match Easy Piping verbatim (per role_matrix qc.B3), and surface a **Fail / Reject-to-Rework** state alongside today's Pass / Pass-with-remark / Pending.

**Architecture:** Add `useHeatNumberValidator()` lib hook to centralize PML lookup. Extend `weld-progress` table row to surface welder qualification chip. Add `pwht-release-view.tsx` queue at `/fabrication/pwht-release` (new route — sibling of qc-release). Extend `QC_CHECKLIST` with a `Fail`/`Reject` outcome that routes the spool back to Weld Progress. Add a thin `usePmWriteLock()` hook for role gating + visual banner; same for `useScopeLock()`.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Zustand 5 + persist · Tailwind CSS · shadcn/ui (new-york) · lucide-react · sonner (toasts) · jsPDF (already in deps — for QC13 stub).

> **Read before writing code:**
> - `docs/PIPEQC_CONTEXT.md` — full stack, store patterns
> - `docs/roadmap_v3.md` Phase 2 section + Closure criteria
> - `docs/role_matrix/qc_engineer.md` B2 / B3 / B13 / B14 details
> - `docs/research/presentation_findings.md` §4 "Spool fabrication progress flow", "Material traceability popup", "QC13"
> - `docs/research/presentation_findings_append_09.md` CC-28 (BLOCK vs WARN taxonomy)
> - `lib/welder-qualifications.ts` `validateWelder()` shape
> - `lib/spool-data.ts` `QC_CHECKLIST`, `MaterialCheckRecord`, `HeatPiece`
> - `store/admin-store.ts:778` `useActivePipingMaterialList()` — already exists, never consumed
> - `components/weld-detail-panel.tsx` shop weld entry — welder validation already live
> - `components/erection/field-weld-detail-panel.tsx` field weld entry — same pattern
> - `components/fabrication/material-check-detail-panel.tsx` Material Check screen
> - `components/fabrication/qc-release-detail-panel.tsx` QC Release screen
> - `store/notifications-store.ts` `pushNotification({severity, category, title, description, href})` shape

---

## Design conventions (critical — match existing screens)

| Pattern | Where to copy from |
|---|---|
| Table + status chips | `components/weld-table.tsx`, `components/fabrication/material-check-view.tsx` |
| Detail Sheet | `components/fabrication/qc-release-detail-panel.tsx` |
| Mutation delay | `await new Promise(r => setTimeout(r, 700))` before store update |
| Toast on mutation | `import { toast } from "sonner"; toast.success("...")` |
| Notification feed | `useNotificationsStore.getState().pushNotification({...})` — note this is **different** from spooling-store; uses `category`/`description` instead of `message` |
| Hard block UI | Red border + below-input message: `"Heat HT-XYZ not in Project Piping Material List. Add it in Admin or correct the entry."` — input refuses to accept on save |
| Soft alert UI | Existing pattern in `weld-detail-panel.tsx:342-348` — amber/red banner, Save remains enabled |
| Colors | sky=info, amber=pending, emerald=done/released, red=blocked/rejected, slate=read-only |
| All components | `"use client"` — no server components |

---

## File structure

### New files
- **Create:** `lib/heat-validator.ts` — `validateHeatNumber()` + `useHeatNumberValidator()` hook (returns BLOCK if heat not in active PML)
- **Create:** `lib/pm-write-lock.ts` — `usePmWriteLock()` returns `{locked: boolean, banner: ReactNode}` based on current role (read from `contexts/user-context` or hardcoded for now)
- **Create:** `lib/scope-lock.ts` — `useScopeLock(modulePath)` returns active subcontractor filter; `applies(subcontractorId)` predicate
- **Create:** `components/fabrication/pwht-release-view.tsx` + `pwht-release-detail-panel.tsx`
- **Create:** `app/fabrication/pwht-release/page.tsx`
- **Create:** `components/fabrication/qc13-pdf-button.tsx` — generates a minimal Daily Progress Report PDF stub (demo artifact)
- **Create:** `store/pwht-store.ts` — track per-weld PWHT release state (pwhtReleasedDate, pwhtReleasedBy, pwhtLabRef) since `welds-store` only has the flag

### Modified files
- **Modify:** `components/fabrication/material-check-detail-panel.tsx` — enforce heat number HARD BLOCK via `useHeatNumberValidator()`
- **Modify:** `components/fabrication/qc-release-detail-panel.tsx` — add `Fail / Reject-to-Rework` outcome; rename "Documentation review" → "NDE complete"
- **Modify:** `lib/spool-data.ts` — `QC_CHECKLIST` rename + new `Fail` status; new types for PWHT
- **Modify:** `components/weld-table.tsx` — surface a welder-qualification mismatch chip on table rows where weld has invalid welder/WPS pairing
- **Modify:** `components/weld-detail-panel.tsx` — extract WelderQualificationBanner inline component; add "Generate QC13" button when status=Completed
- **Modify:** `config/navigation.ts` — add `/fabrication/pwht-release` to sidebar §7 group
- **Modify:** `store/qc-release-store.ts` — accept `Fail` outcome that resets spool stage to "Weld Progress" + records reject reason
- **Modify:** `store/demo-store.ts` — wire `usePwhtStore.getState().resetDemo()` cascade

---

## Task 1 — Heat Number HARD BLOCK validator (Slice 2.2)

**Files:**
- Create: `lib/heat-validator.ts`
- Modify: `components/fabrication/material-check-detail-panel.tsx`
- Modify: `components/erection/field-material-check-detail-panel.tsx` (mirror)

**What this builds:** Per CC-28, heat numbers not in the active Project Piping Material List (PML) are **rejected at input** (HARD BLOCK). The current Material Check accepts any heat number string. We need: (a) a centralized validator hook, (b) red border + below-input error message when blocked, (c) Save Draft + Sign Off buttons disabled if any blocked rows exist.

- [ ] **Step 1: Create `lib/heat-validator.ts`**

```typescript
"use client"

import { useMemo } from "react"
import { useActivePipingMaterialList } from "@/store/admin-store"
import type { HeatRecord } from "@/store/admin-store"

export interface HeatValidation {
  valid: boolean
  match?: HeatRecord
  message?: string  // present when valid===false
}

export function validateHeatNumber(
  heatNo: string,
  activePml: HeatRecord[]
): HeatValidation {
  const trimmed = heatNo.trim()
  if (!trimmed) {
    // Empty heat — not a BLOCK yet; just incomplete. Caller decides whether to block save.
    return { valid: false, message: "Heat number required" }
  }
  const match = activePml.find((h) => h.heatNo === trimmed)
  if (!match) {
    return {
      valid: false,
      message: `Heat ${trimmed} not in Project Piping Material List. Add it in Admin → Heat Registry or correct the entry.`,
    }
  }
  return { valid: true, match }
}

export function useHeatNumberValidator() {
  const activePml = useActivePipingMaterialList()
  return useMemo(
    () => ({
      validate: (heatNo: string) => validateHeatNumber(heatNo, activePml),
      activeHeats: activePml.map((h) => h.heatNo),
    }),
    [activePml]
  )
}
```

- [ ] **Step 2: Wire HARD BLOCK in `material-check-detail-panel.tsx`**

Open `components/fabrication/material-check-detail-panel.tsx`. Add import + use the validator, then derive per-piece blocked state and gate the Save / Sign-off buttons.

Add near other imports (line ~14):
```typescript
import { useHeatNumberValidator } from "@/lib/heat-validator"
```

Inside the `MaterialCheckDetailPanel` component, after the existing `useEffect` for `setForm`, add:
```typescript
const { validate: validateHeat, activeHeats } = useHeatNumberValidator()

const heatValidations = useMemo(() => {
  if (!form) return new Map<string, ReturnType<typeof validateHeat>>()
  const m = new Map()
  for (const p of form.pieces) {
    if (p.heatNumber.trim()) {
      m.set(p.id, validateHeat(p.heatNumber))
    }
  }
  return m
}, [form, validateHeat])

const blockedCount = useMemo(
  () => Array.from(heatValidations.values()).filter((v) => !v.valid).length,
  [heatValidations]
)
```

Update the `validation` useMemo (currently at line 114) — replace the `if (clearedCount === 0)` block with an additional block:
```typescript
if (blockedCount > 0) {
  return {
    ok: false,
    message: `${blockedCount} heat number${blockedCount === 1 ? "" : "s"} not in Project Piping Material List. Fix before sign-off.`,
  }
}
// ... existing checks below
```

In the table body, wrap the heat-number `<Input>` cell to display red border + error message when blocked. Replace the existing heat number TableCell (line ~260) with:
```tsx
<TableCell>
  <Input
    className={cn(
      "h-8 text-xs font-mono",
      heatValidations.get(piece.id)?.valid === false && piece.heatNumber.trim()
        ? "border-red-400 bg-red-50"
        : ""
    )}
    value={piece.heatNumber}
    disabled={piece.status !== "Pending"}
    list={`pml-${piece.id}`}
    onChange={(e) =>
      updatePiece(piece.id, { heatNumber: e.target.value })
    }
  />
  <datalist id={`pml-${piece.id}`}>
    {activeHeats.slice(0, 50).map((h) => (
      <option key={h} value={h} />
    ))}
  </datalist>
  {piece.heatNumber.trim() && heatValidations.get(piece.id)?.valid === false && (
    <p className="mt-1 text-[10px] text-red-700 leading-tight">
      {heatValidations.get(piece.id)?.message}
    </p>
  )}
</TableCell>
```

- [ ] **Step 3: Wire same HARD BLOCK in field material check**

Open `components/erection/field-material-check-detail-panel.tsx`. Add same import. Find the heat number input(s) (use grep for `heatNumber` — lines 254, 276, 438, 443, 446 per earlier search). Apply the same `heatValidations` map pattern. Gate the sign-off button.

> **If the field panel structure differs significantly:** Add only the validator import + a per-piece red border + below-message; mirror the parent panel's pattern. Do NOT block save if the field uses a different sign-off model — just warn. (Verify by reading the file first.)

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/heat-validator.ts components/fabrication/material-check-detail-panel.tsx components/erection/field-material-check-detail-panel.tsx
git commit -m "feat(fabrication): hard-block heat numbers absent from PML (Phase 2.2, CC-28 BLOCK)"
```

---

## Task 2 — Welder Qualification chip on Weld Progress table (Slice 2.1 demo polish)

**Files:**
- Modify: `components/weld-table.tsx`

**What this builds:** The welder-qualification validation (`validateWelder`) is **already live** in the weld detail panel banner (line 342). For demo punch, surface a small ⚠ chip on table rows where the welder/WPS pair is invalid, so the user sees the issue at a glance before clicking in. This is purely visual — no save-gating change (CC-28 confirms soft alert).

- [ ] **Step 1: Read current weld-table.tsx structure**

```bash
grep -n "welderCode\|wpsNo\|TableRow" components/weld-table.tsx | head -30
```

- [ ] **Step 2: Add qualification chip on rows with invalid pair**

In the table row map, alongside the existing welder code cell, add a conditional chip when `validateWelder(...)` returns `isValid: false`. Use `useActiveWelderQualifications()` and call `validateWelder` for each row.

Add imports at top:
```typescript
import { AlertTriangle } from "lucide-react"
import { validateWelder } from "@/lib/welder-qualifications"
import { useActiveWelderQualifications } from "@/store/admin-store"
```

Add inside the component (before the table render):
```typescript
const activeWelders = useActiveWelderQualifications()
```

In the row rendering (find the cell that shows `welder` or `welderCode`), append:
```tsx
{(() => {
  const v = validateWelder(weld.welderCode, weld.wpsNo, weld.materialType, weld.diaInch, activeWelders)
  if (!v.isValid && weld.welderCode) {
    return (
      <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <AlertTriangle className="h-2.5 w-2.5" />
        WPS
      </span>
    )
  }
  return null
})()}
```

> If `weld.materialType` / `weld.diaInch` aren't part of the row data shape, fall back to `validateWelder(weld.welderCode, weld.wpsNo, "", "", activeWelders)` — the function returns `{ isValid: true }` on incomplete forms (see line 186) so this is safe.

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/weld-table.tsx
git commit -m "feat(fabrication): surface welder qualification mismatch chip on weld-progress table (Phase 2.1 polish)"
```

---

## Task 3 — PWHT Release queue (Slice 2.3)

**Files:**
- Create: `store/pwht-store.ts`
- Create: `components/fabrication/pwht-release-view.tsx`
- Create: `components/fabrication/pwht-release-detail-panel.tsx`
- Create: `app/fabrication/pwht-release/page.tsx`
- Modify: `config/navigation.ts`
- Modify: `store/demo-store.ts`

**What this builds:** A focused queue of welds with `pwhtRequired === true` and missing `pwhtDate`. Per presentation_findings_append_10 #193: PWHT is **not a separate module screen** in Easy Piping — it's embedded in the NDE batch workflow. PipeQC differentiates by giving QC engineers a dedicated dashboard view of "what's awaiting PWHT release" so they can batch-process post-PWHT-lab confirmations without hunting through weld-progress.

The PWHT Release flow per spool:
1. Welder completes weld → marks `pwhtRequired: true`.
2. Spool gets transferred to PWHT lab (lab is external).
3. Lab returns heat-treatment certificate with `labRef` and `pwhtDate`.
4. QC engineer opens this screen, finds the spool, opens detail, enters `pwhtDate` + `labRef` + their name → Sign release.
5. Weld's `pwhtDate` is set; spool is unblocked for downstream QC release.

- [ ] **Step 1: Create `store/pwht-store.ts`**

```typescript
"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface PwhtReleaseRecord {
  weldId: string         // matches WeldJoint.id
  spoolNo: string
  pwhtDate: string       // ISO date set on release
  labRef: string
  releasedBy: string
  releasedAt: string     // ISO timestamp
}

interface PwhtState {
  releases: PwhtReleaseRecord[]
  releasePwht: (record: Omit<PwhtReleaseRecord, "releasedAt">) => void
  getRelease: (weldId: string) => PwhtReleaseRecord | undefined
  resetDemo: () => void
}

export const usePwhtStore = create<PwhtState>()(
  persist(
    (set, get) => ({
      releases: [],
      releasePwht: (record) =>
        set((state) => ({
          releases: [
            ...state.releases.filter((r) => r.weldId !== record.weldId),
            { ...record, releasedAt: new Date().toISOString() },
          ],
        })),
      getRelease: (weldId) => get().releases.find((r) => r.weldId === weldId),
      resetDemo: () => set({ releases: [] }),
    }),
    { name: "pipeqc-pwht-v1", version: 1 }
  )
)
```

- [ ] **Step 2: Create `components/fabrication/pwht-release-detail-panel.tsx`**

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { usePwhtStore } from "@/store/pwht-store"
import { useWeldsStore } from "@/store"
import { useNotificationsStore } from "@/store"
import { QC_INSPECTORS } from "@/lib/spool-data"
import type { WeldJoint } from "@/lib/weld-data"

interface Props {
  weld: WeldJoint | null
  open: boolean
  onClose: () => void
}

export function PwhtReleaseDetailPanel({ weld, open, onClose }: Props) {
  const [pwhtDate, setPwhtDate] = useState("")
  const [labRef, setLabRef] = useState("")
  const [releasedBy, setReleasedBy] = useState(QC_INSPECTORS[0])
  const [saving, setSaving] = useState(false)
  const releasePwht = usePwhtStore((s) => s.releasePwht)
  const updateWeld = useWeldsStore((s) => s.updateWeld)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  if (!weld) return null

  const canSubmit = pwhtDate && labRef.trim() && releasedBy

  async function handleRelease() {
    if (!canSubmit || !weld) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 700))
    releasePwht({ weldId: weld.id, spoolNo: weld.spoolNo, pwhtDate, labRef, releasedBy })
    updateWeld(weld.id, { pwhtDate })
    pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${weld.jointNo}: PWHT released`,
      description: `Lab ref ${labRef} · released by ${releasedBy}`,
      href: "/fabrication/pwht-release",
    })
    toast.success(`PWHT released for ${weld.jointNo}`)
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">{weld.jointNo}</SheetTitle>
          <SheetDescription>
            Spool {weld.spoolNo} · {weld.materialType} · {weld.diaInch}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 mt-4 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="font-medium mb-1">Awaiting PWHT lab confirmation</div>
            Enter heat treatment lab certificate details to release this weld for downstream QC.
          </div>

          <div className="space-y-2">
            <Label className="text-xs">PWHT Completion Date</Label>
            <Input type="date" value={pwhtDate} onChange={(e) => setPwhtDate(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Lab Certificate Reference</Label>
            <Input
              placeholder="PWHT-LAB-2026-XXXX"
              value={labRef}
              onChange={(e) => setLabRef(e.target.value)}
              className="h-9 text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Released by</Label>
            <Select value={releasedBy} onValueChange={setReleasedBy}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {QC_INSPECTORS.map((i) => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleRelease} disabled={!canSubmit || saving}>
            {saving ? "Releasing..." : "Release PWHT"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Create `components/fabrication/pwht-release-view.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { Search, Flame } from "lucide-react"
import { useWeldsStore } from "@/store"
import { usePwhtStore } from "@/store/pwht-store"
import type { WeldJoint } from "@/lib/weld-data"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { PwhtReleaseDetailPanel } from "./pwht-release-detail-panel"

type PwhtFilter = "All" | "Awaiting" | "Released"
const FILTERS: PwhtFilter[] = ["All", "Awaiting", "Released"]

export function PwhtReleaseView() {
  const welds = useWeldsStore((s) => s.welds)
  const releases = usePwhtStore((s) => s.releases)
  const [filter, setFilter] = useState<PwhtFilter>("Awaiting")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<WeldJoint | null>(null)

  const releaseMap = useMemo(() => new Map(releases.map((r) => [r.weldId, r])), [releases])

  const rows = useMemo(() => {
    const pwhtWelds = welds.filter((w) => w.pwhtRequired)
    return pwhtWelds.filter((w) => {
      const released = !!w.pwhtDate || releaseMap.has(w.id)
      if (filter === "Awaiting" && released) return false
      if (filter === "Released" && !released) return false
      if (search) {
        const term = search.toLowerCase()
        if (!w.jointNo.toLowerCase().includes(term) && !w.spoolNo.toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [welds, releaseMap, filter, search])

  const counts = useMemo(() => {
    const pwhtWelds = welds.filter((w) => w.pwhtRequired)
    const released = pwhtWelds.filter((w) => !!w.pwhtDate || releaseMap.has(w.id)).length
    return {
      All: pwhtWelds.length,
      Awaiting: pwhtWelds.length - released,
      Released: released,
    }
  }, [welds, releaseMap])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[720px] gap-4 overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-2">
        <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-600" />
          PWHT Release
        </h1>
        <p className="text-sm text-slate-500">
          Post-Weld Heat Treatment release queue. Enter lab certificate to unblock downstream QC.
        </p>
      </div>

      <div className="shrink-0 px-6 flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f}
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold ${
              filter === f ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      <div className="shrink-0 px-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search joint or spool..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-sm">No welds at this filter.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Joint No</TableHead>
                <TableHead>Spool No</TableHead>
                <TableHead>Material / Dia</TableHead>
                <TableHead>WPS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PWHT date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => {
                const rel = releaseMap.get(w.id)
                const released = !!w.pwhtDate || !!rel
                return (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => !released && setSelected(w)}
                  >
                    <TableCell className="font-mono text-sm">{w.jointNo}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{w.spoolNo}</TableCell>
                    <TableCell className="text-xs text-slate-600">{w.materialType} · {w.diaInch}</TableCell>
                    <TableCell className="text-xs font-mono">{w.wpsNo}</TableCell>
                    <TableCell>
                      {released ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">Released</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">Awaiting</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {w.pwhtDate ?? rel?.pwhtDate ?? "—"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PwhtReleaseDetailPanel weld={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/fabrication/pwht-release/page.tsx`**

```tsx
import { PwhtReleaseView } from "@/components/fabrication/pwht-release-view"

export default function PwhtReleasePage() {
  return <PwhtReleaseView />
}
```

- [ ] **Step 5: Add to sidebar navigation**

Open `config/navigation.ts`. Find the Fabrication group (§7 peer sections — should already have `weld-progress`, `material-check`, `qc-release`, `paint`, `laydown`). Add a new child entry for PWHT Release between QC Release and Paint:

```typescript
{
  label: "PWHT Release",
  href: "/fabrication/pwht-release",
  icon: Flame,  // from lucide-react — add to imports
},
```

- [ ] **Step 6: Wire reset in demo-store.ts**

Open `store/demo-store.ts`. Find `resetAll()`. Add a line:
```typescript
usePwhtStore.getState().resetDemo()
```
Add the import at top: `import { usePwhtStore } from "./pwht-store"`.

- [ ] **Step 7: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add store/pwht-store.ts components/fabrication/pwht-release-view.tsx components/fabrication/pwht-release-detail-panel.tsx app/fabrication/pwht-release/page.tsx config/navigation.ts store/demo-store.ts
git commit -m "feat(fabrication): PWHT release queue for post-heat-treatment lab confirmation (Phase 2.3)"
```

---

## Task 4 — QC Release: rename + Fail-to-Rework outcome (Slice 2.4)

**Files:**
- Modify: `lib/spool-data.ts` (rename `QC_CHECKLIST` item, add Fail status)
- Modify: `components/fabrication/qc-release-detail-panel.tsx` (Fail UI + reject reason)
- Modify: `store/qc-release-store.ts` (handle Fail outcome)

**What this builds:** Per role_matrix qc.B3, the canonical 4-item shop QC release checklist is **Visual / Dimensional / NDE complete / Heat traceability**. PipeQC currently has "Documentation review" instead of "NDE complete" — rename. Plus: today the only outcomes are Pass / Pass-with-remark / Pending. Per real-world QC practice (and qc.B3 note in role matrix), there must be a **Fail** path that routes the spool back to Weld Progress for rework.

- [ ] **Step 1: Update `lib/spool-data.ts`**

Find `QC_CHECKLIST` (line 272). Rename the `documentation` entry:

```typescript
export const QC_CHECKLIST: QCChecklistItem[] = [
  { key: "dimensional", label: "Dimensional check", description: "Length, flange face, bolt-hole orientation against ISO" },
  { key: "visual", label: "Visual inspection", description: "Surface defects, weld spatter, alignment" },
  { key: "nde_complete", label: "NDE complete", description: "All required NDE batches accepted; no outstanding rejections" },
  { key: "traceability", label: "Heat-number traceability", description: "All pieces match the Material Check record" },
]
```

Update the `QCChecklistKey` type:
```typescript
export type QCChecklistKey = "dimensional" | "visual" | "nde_complete" | "traceability"
```

Update `QCChecklistStatus` to include `Fail`:
```typescript
export type QCChecklistStatus = "Pending" | "Pass" | "Pass with remark" | "Fail"
```

> **Migration note:** existing persisted state uses `documentation` key. Existing records will need migration or seed reset. Bump persist version in `qc-release-store.ts` (Step 3).

- [ ] **Step 2: Update QC Release seed records (if any reference `documentation`)**

```bash
grep -rn "documentation" lib/spool-data.ts store/qc-release-store.ts | head -20
```

If any seed records use `"documentation"`, rename to `"nde_complete"`.

- [ ] **Step 3: Update store + migration**

Open `store/qc-release-store.ts`. Bump persist version to 2 and migrate:
```typescript
{
  name: "pipeqc-qc-release-v1",  // keep name OR bump to v2 — see below
  version: 2,
  migrate: (persisted: any, version: number) => {
    if (version < 2 && persisted?.records) {
      persisted.records = persisted.records.map((rec: any) => ({
        ...rec,
        entries: rec.entries.map((e: any) =>
          e.key === "documentation" ? { ...e, key: "nde_complete" } : e
        ),
      }))
    }
    return persisted
  },
}
```

Add an action `failQCRelease`:
```typescript
failQCRelease: (spoolNo: string, inspector: string, reason: string) =>
  set((state) => ({
    records: state.records.map((r) =>
      r.spoolNo === spoolNo
        ? { ...r, inspector, signedOffDate: undefined, failReason: reason, failedAt: new Date().toISOString() }
        : r
    ),
  })),
```

Add to interface and `QCReleaseRecord` type in `lib/spool-data.ts`:
```typescript
export interface QCReleaseRecord {
  spoolNo: string
  entries: QCChecklistEntry[]
  inspector?: string
  signedOffDate?: string
  failReason?: string
  failedAt?: string
}
```

When `failQCRelease` is called, the spool stage should revert via the rollup. Check `store/spool-stage.ts` to confirm — Fabricated status is derived; if QC checklist has any `Fail`, the rollup should NOT advance to `QC Release`. Verify by reading `spool-stage.ts`:

```bash
grep -n "Fabricated\|QC Release\|signOffQCRelease" store/spool-stage.ts
```

If `spool-stage.ts` checks `signedOffDate` only, the Fail path (which leaves `signedOffDate` undefined and sets `failReason`) automatically holds the spool at Fabricated. No changes needed to spool-stage.ts.

- [ ] **Step 4: Update detail panel UI**

Open `components/fabrication/qc-release-detail-panel.tsx`. Update the `STATUS_OPTIONS` constant:
```typescript
const STATUS_OPTIONS: QCChecklistStatus[] = [
  "Pending",
  "Pass",
  "Pass with remark",
  "Fail",
]
```

Update `StatusSegmented` rendering to include Fail with red styling:
```tsx
className={cn(
  "px-2 py-1 text-[10px] font-medium transition-colors",
  value === s ? (s === "Fail" ? "bg-red-600 text-white" : "bg-sky-600 text-white") : "bg-white text-slate-600 hover:bg-slate-50",
)}
```

Update the `validation` useMemo (line ~124) — if any entry is `Fail`, the panel must require a reject reason and offer a Reject button instead of Sign-off:
```typescript
const validation = useMemo(() => {
  if (!form) return { ok: false, message: "" }
  const failCount = form.entries.filter((e) => e.status === "Fail").length
  if (failCount > 0) {
    // Fail path: separate validation
    return { ok: false, message: "Resolve fails or use Reject to Rework." }
  }
  const pendingCount = form.entries.filter((e) => e.status === "Pending").length
  const emptyRemark = form.entries.some((e) => e.status === "Pass with remark" && !e.remark?.trim())
  if (pendingCount > 0) return { ok: false, message: "Resolve all checklist items before sign-off." }
  if (emptyRemark) return { ok: false, message: "Add a remark for every Pass-with-remark entry." }
  return { ok: true, message: "" }
}, [form])
```

Add a `rejectReason` local state + a Reject button when any entry is Fail:
```typescript
const [rejectReason, setRejectReason] = useState("")
const hasFail = form?.entries.some((e) => e.status === "Fail") ?? false

async function handleReject() {
  if (!form || !rejectReason.trim() || !hasFail) return
  setIsSigning(true)
  await new Promise((r) => setTimeout(r, 700))
  useQCReleaseStore.getState().failQCRelease(form.spoolNo, inspector, rejectReason)
  setIsSigning(false)
  onOpenChange(false)
  toast.error(`${form.spoolNo} sent back to Weld Progress for rework`)
  useNotificationsStore.getState().pushNotification({
    severity: "warning",
    category: "weld_progress",
    title: `${form.spoolNo}: QC Release rejected`,
    description: `Routed back to Weld Progress. Reason: ${rejectReason}`,
    href: "/fabrication/weld-progress",
  })
  router.replace("/fabrication/qc-release?status=Awaiting")
}
```

In the JSX footer area, when `hasFail` is true, replace Sign-off button with a Reject path:
```tsx
{hasFail && (
  <div className="space-y-2 mt-2">
    <Label className="text-xs text-red-700">Reject reason (sent to Weld Progress)</Label>
    <Textarea
      value={rejectReason}
      onChange={(e) => setRejectReason(e.target.value)}
      placeholder="Welder did not address visual defect on root pass..."
      className="text-xs min-h-[60px]"
    />
    <Button
      variant="destructive"
      size="sm"
      onClick={handleReject}
      disabled={!rejectReason.trim() || isSigning}
      className="w-full"
    >
      {isSigning ? "Rejecting..." : "Reject to Rework"}
    </Button>
  </div>
)}
```

Disable the Sign-off button when `hasFail` is true (alongside existing `!validation.ok`).

- [ ] **Step 5: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add lib/spool-data.ts store/qc-release-store.ts components/fabrication/qc-release-detail-panel.tsx
git commit -m "feat(fabrication): rename checklist item to 'NDE complete' + Fail-to-Rework outcome (Phase 2.4)"
```

---

## Task 5 — PM Write-Lock cross-cutting nit (CC: built once, reused Phases 3-6)

**Files:**
- Create: `lib/pm-write-lock.ts`
- Modify: `components/fabrication/material-check-detail-panel.tsx`
- Modify: `components/fabrication/qc-release-detail-panel.tsx`
- Modify: `components/fabrication/pwht-release-detail-panel.tsx`
- Modify: `components/weld-detail-panel.tsx`

**What this builds:** Per role_matrix project_manager, PM is a **watcher** role — has read access to all QC screens but **cannot save** (no edit rights). Today nothing enforces this. We add a thin hook `usePmWriteLock()` that returns `{locked, banner}` and a tiny helper component for the banner. The current "role" comes from a stub global (no auth yet) — we'll read it from `contexts/user-context` if present, else default to `qc_engineer` (so existing behaviour preserved).

- [ ] **Step 1: Inspect existing user context**

```bash
ls contexts/; cat contexts/*.tsx 2>&1 | head -60
```

If `contexts/user-context.tsx` exists with a role enum, use it. Otherwise, create a minimal version:

- [ ] **Step 2: Create `lib/pm-write-lock.ts`**

```typescript
"use client"

import type { ReactNode } from "react"

// Minimal role enum until auth is wired
type AppRole = "project_manager" | "qc_engineer" | "spooling_team" | "nde_inspector" | "subcontractor" | "system_admin" | "project_reader"

// TEMP: read from localStorage or default to qc_engineer
// When contexts/user-context exists, replace with proper consumer.
export function useCurrentRole(): AppRole {
  if (typeof window === "undefined") return "qc_engineer"
  const stored = window.localStorage.getItem("pipeqc-role") as AppRole | null
  return stored ?? "qc_engineer"
}

export function usePmWriteLock(): {
  locked: boolean
  reason: string
} {
  const role = useCurrentRole()
  if (role === "project_manager" || role === "project_reader") {
    return { locked: true, reason: "Project Manager has read-only access. Switch to QC role to edit." }
  }
  return { locked: false, reason: "" }
}
```

- [ ] **Step 3: Create banner component `components/pm-write-lock-banner.tsx`**

```tsx
"use client"

import { Lock } from "lucide-react"
import { usePmWriteLock } from "@/lib/pm-write-lock"

export function PmWriteLockBanner() {
  const { locked, reason } = usePmWriteLock()
  if (!locked) return null
  return (
    <div className="mx-4 mt-3 px-3 py-2 rounded border border-slate-300 bg-slate-100 flex items-center gap-2 flex-shrink-0">
      <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
      <p className="text-xs text-slate-600">{reason}</p>
    </div>
  )
}
```

- [ ] **Step 4: Wire into Material Check, QC Release, PWHT Release detail panels**

In each detail panel:
1. Import `usePmWriteLock` + `PmWriteLockBanner`.
2. Add `const { locked: pmLocked } = usePmWriteLock()` near top.
3. Add `<PmWriteLockBanner />` near the SheetHeader.
4. Disable save / sign-off / release buttons: `disabled={... || pmLocked}`.

For `components/weld-detail-panel.tsx`, the existing `isLocked` already gates UI — extend it: `const isLocked = form.isLocked || pmLocked`.

- [ ] **Step 5: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add lib/pm-write-lock.ts components/pm-write-lock-banner.tsx components/fabrication/material-check-detail-panel.tsx components/fabrication/qc-release-detail-panel.tsx components/fabrication/pwht-release-detail-panel.tsx components/weld-detail-panel.tsx
git commit -m "feat(fabrication): PM write-lock cross-cutting nit (Phase 2 reusable for 3-6)"
```

---

## Task 6 — Scope Lock cross-cutting nit (CC-4 reuse from Phase 1)

**Files:**
- Create: `lib/scope-lock.ts`
- Modify: `components/weld-table.tsx` (filter by sub scope)
- Modify: `components/fabrication/material-check-view.tsx` (filter rows by sub scope)
- Modify: `components/fabrication/qc-release-view.tsx` (filter rows by sub scope)

**What this builds:** Phase 1 left scope lock as "foundation only — store data exists, no UI filtering". Phase 2 wires it: when a Subcontractor user is active, all Fabrication tables show only spools whose PDS area is assigned to that sub.

- [ ] **Step 1: Create `lib/scope-lock.ts`**

```typescript
"use client"

import { useMemo } from "react"
import { useCurrentRole } from "@/lib/pm-write-lock"
import { useAdminStore } from "@/store/admin-store"

export function useActiveSubcontractor(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("pipeqc-active-sub")
}

export function useScopeLock() {
  const role = useCurrentRole()
  const activeSub = useActiveSubcontractor()
  const pdsAreas = useAdminStore((s) => s.pdsAreas)

  const isSubcontractorRole = role === "subcontractor"
  const subPdsAreas = useMemo(() => {
    if (!isSubcontractorRole || !activeSub) return null
    return new Set(
      pdsAreas.filter((a) => a.assignedSubCode === activeSub && a.active).map((a) => a.code)
    )
  }, [pdsAreas, activeSub, isSubcontractorRole])

  return {
    active: subPdsAreas !== null,
    subCode: activeSub,
    isInScope: (pdsAreaCode: string | undefined): boolean => {
      if (!subPdsAreas) return true
      if (!pdsAreaCode) return false
      return subPdsAreas.has(pdsAreaCode)
    },
  }
}
```

- [ ] **Step 2: Wire into Material Check + QC Release + Weld Progress views**

In each view file, near where rows are filtered, add:
```typescript
const scope = useScopeLock()
// In the existing filter chain (.filter((row) => {...}))
// add: if (!scope.isInScope(row.pdsAreaCode)) return false
```

> **Note:** Spool records may not currently carry `pdsAreaCode` as a top-level field. Check `lib/spool-data.ts` for `MaterialCheckRecord` / `WeldJoint` shape; if `pdsAreaCode` is absent, the scope lock filter is a no-op for now (returns `true` from `isInScope` since `pdsAreaCode` is undefined → fails the second guard, but `subPdsAreas` is null so `return true`). This is acceptable for Phase 2: scope lock is **wired but inactive** until rows carry the field. A roadmap_v3 note already flagged scope-lock as "foundation, reuse later".
>
> If you want a meaningful filter for the demo, add an optional `pdsAreaCode` derived from spool naming convention (e.g. `PR-01` prefix). Skip if there's no clear pattern.

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add lib/scope-lock.ts components/weld-table.tsx components/fabrication/material-check-view.tsx components/fabrication/qc-release-view.tsx
git commit -m "feat(fabrication): scope-lock hook + opt-in filter wiring (Phase 2 reusable for 3-6)"
```

---

## Task 7 — QC13 Daily Progress Report PDF stub (demo artifact)

**Files:**
- Create: `components/fabrication/qc13-pdf-button.tsx`
- Modify: `components/weld-detail-panel.tsx` (button when status=Completed)

**What this builds:** Per presentation_findings #4, **QC13** is the canonical paper artifact bridging shop reality and Easy Piping. It's high perceived fidelity for demo with low engineering cost. We add a "Generate QC13" button on the weld detail panel that opens a printable PDF stamped with project header, spool ID, weld details, date, and a signature block.

`jspdf` is already in `package.json` (verify with `grep jspdf package.json`).

- [ ] **Step 1: Verify jsPDF availability**

```bash
grep -i "jspdf\|pdf" package.json
```

If `jspdf` is NOT in deps, install it:
```bash
pnpm add jspdf
```

- [ ] **Step 2: Create `components/fabrication/qc13-pdf-button.tsx`**

```tsx
"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import type { WeldJoint } from "@/lib/weld-data"

export function Qc13PdfButton({ joint }: { joint: WeldJoint }) {
  const projectDef = useAdminStore((s) => s.projectDefinition)

  function handleGenerate() {
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin

    // Header
    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("QC13 — Daily Progress Report", margin, y)
    y += 18
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`Project: ${projectDef.projectName ?? "—"} · Activity ${projectDef.activityCode ?? "—"}`, margin, y)
    y += 12
    doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, margin, y)
    y += 12
    doc.text(`QC13 No: QC13-${joint.spoolNo}-${joint.jointNo}-${Date.now().toString().slice(-6)}`, margin, y)
    y += 20

    // Identification block
    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Identification", margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    const rows = [
      ["Spool No", joint.spoolNo],
      ["Joint No", joint.jointNo],
      ["ISO No", joint.isoNo],
      ["DWIR No", joint.dwirNo],
      ["Material", joint.materialType],
      ["Diameter", joint.diaInch],
      ["WPS", joint.wpsNo],
      ["Heat No", joint.heatNo ?? "—"],
    ]
    rows.forEach(([k, v]) => {
      doc.text(`${k}:`, margin, y)
      doc.text(String(v ?? "—"), margin + 100, y)
      y += 11
    })
    y += 8

    // Welding block
    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Welding", margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`Welder code: ${joint.welderCode ?? "—"}`, margin, y); y += 11
    doc.text(`Weld date: ${joint.weldDate ?? "—"}`, margin, y); y += 11
    doc.text(`PWHT required: ${joint.pwhtRequired ? "Yes" : "No"}${joint.pwhtRequired ? ` · Date: ${joint.pwhtDate ?? "pending"}` : ""}`, margin, y); y += 20

    // Sign-off block
    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 30
    const colWidth = (doc.internal.pageSize.getWidth() - 2 * margin) / 3
    ;["Foreman", "QC Engineer", "Sub-contractor rep"].forEach((label, i) => {
      const x = margin + i * colWidth
      doc.line(x, sigY, x + colWidth - 10, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`QC13-${joint.spoolNo}-${joint.jointNo}.pdf`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className="h-9 text-xs gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      <FileText className="h-4 w-4" />
      Generate QC13 PDF
    </Button>
  )
}
```

- [ ] **Step 3: Mount the button in `components/weld-detail-panel.tsx`**

Open `components/weld-detail-panel.tsx`. Near the existing "Send to NDE" button (around line 569), add the QC13 button when `joint.status === "Completed"`:

```tsx
{joint.status === "Completed" && (
  <Qc13PdfButton joint={joint} />
)}
```

Add the import: `import { Qc13PdfButton } from "@/components/fabrication/qc13-pdf-button"`.

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/fabrication/qc13-pdf-button.tsx components/weld-detail-panel.tsx
git commit -m "feat(fabrication): QC13 Daily Progress Report PDF stub on completed welds (demo artifact)"
```

---

## Task 8 — Final integration: ensure all gates fire in demo flow

**Files:**
- Verify only — no code changes unless something fails

**What this checks:** End-to-end demo flow from spool delivery → QC release works after all changes.

- [ ] **Step 1: Build + dev server smoke test**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30
```

Expected: no type errors, build succeeds.

- [ ] **Step 2: Manual demo flow checklist**

Start dev server (`npm run dev`) and walk through:

1. `/admin` → confirm Heat Registry has at least 10 active heat numbers.
2. `/fabrication/material-check` → open a Pending spool detail → try typing a heat number NOT in registry → see red border + error message → Sign-off button disabled.
3. Type a valid heat number from the datalist → red goes away → Sign-off enabled → Sign-off → spool advances to Weld Progress.
4. `/fabrication/weld-progress` → open a joint → assign a welder whose qualification doesn't match the WPS → see amber warning in panel **and** chip in table row.
5. Mark `pwhtRequired: true` on a Completed weld → save.
6. `/fabrication/pwht-release` → see that weld in Awaiting → click → enter PWHT date + lab ref → release.
7. `/fabrication/qc-release` → open a Fabricated spool → mark one checklist item as Fail → see Sign-off button replaced by Reject panel → enter reason → Reject → spool moves back to Weld Progress, notification appears in feed.
8. Switch role to `project_manager` via `localStorage.setItem("pipeqc-role", "project_manager"); location.reload()` → open any Fabrication detail panel → see PM write-lock banner + Save buttons disabled.
9. Open a Completed weld → click "Generate QC13 PDF" → PDF downloads with project header + spool/joint details + signature block.

- [ ] **Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore(fabrication): Phase 2 demo flow polish + integration"
```

---

## Self-review

**Spec coverage check:**

| Roadmap slice | Covered in task | Real gap closed |
|---|---|---|
| 2.1 Welder qualification soft alert | Task 2 (chip in table — banner already existed) | Surface invalid pair on list view |
| 2.2 Heat Number → PML validation | Task 1 (HARD BLOCK per CC-28) | `useActivePipingMaterialList` was orphaned — now consumed |
| 2.3 PWHT release flow | Task 3 (dedicated `/fabrication/pwht-release` queue) | No PWHT tracking existed beyond a free-text date field |
| 2.4 4-item QC release checklist | Task 4 (rename + Fail-to-Rework) | Checklist existed but missing Fail outcome |
| Cross-cutting PM write-lock | Task 5 (new hook, applied to 4 panels) | Built once for reuse in Phases 3-6 |
| Cross-cutting Scope lock | Task 6 (hook + opt-in filter) | Built foundation in Phase 1, wired in Phase 2 |
| Demo artifact: QC13 PDF | Task 7 (stub on Completed welds) | Adds high-perceived-fidelity demo moment |

**Adjustments from roadmap_v3 based on code audit:**

- **Slice 2.1 (welder qual)** was claimed as "to build" in roadmap but `validateWelder` is already live in both shop + field weld panels with a red banner. Task 2 only adds the visual chip to the table row — a polish, not a new feature.
- **Slice 2.4 (4-item checklist)** was claimed as "to build" but `QC_CHECKLIST` already has 4 items. Task 4 renames one item to match the role matrix verbatim AND adds the missing Fail-to-Rework path (which the role matrix mentioned but was not in roadmap).
- **PWHT (slice 2.3)** in roadmap suggested a "PWHT release flow" without specifics. Per presentation_findings_append_10 #193, PWHT is **not a separate screen** in Easy Piping (resolved by elimination). PipeQC differentiates by giving QC a focused queue view — Task 3.

**Deferred (per roadmap_v3 Phase 2 explicit defers + audit findings):**

- B15 Multiple welders per joint — Phase 7 (schema extension)
- B16 NDE 100% override — Phase 7 (admin function)
- Real role-based auth (currently localStorage stub for PM write-lock + scope lock) — Phase 7
- Scope lock UI filtering depends on spool records carrying `pdsAreaCode` — Task 6 wires the hook opt-in; meaningful filter only after spool data extension (Phase 7 / data model work)
- Heat number datalist UX could become a full searchable combobox — current `<datalist>` is good-enough for Phase 2

**Placeholder scan:** No TBD, TODO, or "implement later" phrases. All steps have real code.

**Type consistency check:** `useHeatNumberValidator`, `validateHeatNumber`, `usePwhtStore`, `PwhtReleaseRecord`, `usePmWriteLock`, `PmWriteLockBanner`, `useScopeLock`, `Qc13PdfButton` — all defined once and imported by exact name across consumers.

**Cross-cutting nits status after Phase 2:**

| Nit | Status after Phase 2 |
|---|---|
| Subcontractor scope lock (CC-4) | ✅ Hook built (Task 6); UI filter opt-in based on spool data shape |
| PM write-lock | ✅ Hook + banner + 4 panels wired (Task 5) |
| Welder qualification soft alert (CC-28 WARN) | ✅ Banner already live; chip added in Task 2 |
| Heat number traceability (CC-28 BLOCK) | ✅ Wired in Task 1 |
| NDE rework cascade | ⏳ Phase 3 (not in scope here) |
| Notification system upgrade | ⏳ Phase 7 |

---

## Open questions for the next session

- Should the QC13 PDF be issued automatically on weld completion (Easy Piping verbatim) or stay manual-on-demand as built in Task 7? Verbatim behaviour would be a 1-line change in weld save handler.
- The scope-lock UI filter is opt-in (Task 6 leaves it inactive until spool records carry `pdsAreaCode`). Should Phase 2 also extend `lib/spool-data.ts` to add a derived `pdsAreaCode` field from spool naming convention? Decision deferred to Phase 7 / data model task.
- Phase 2 closes 4 of 7 ⚠/❌ QC Engineer matrix items. The remaining 3 (B7 tracer obligations, B15 multi-welder, B16 NDE 100% override) all land in Phase 3 (NDE) or Phase 7 (defer). Confirm at Phase 2 close.
