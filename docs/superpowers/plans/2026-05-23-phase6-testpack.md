# Phase 6 — Test Pack: from substantial-workflows to a complete RFT-pursuit module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close roadmap_v3 Phase 6 slices 6.1–6.6 **plus** the presentation #7 module-specific findings that v3 did not bundle (the **General/Iso-level/Spool-level tabs being mock-derived**, CC-17 "Generate Request" PDF dispatch, CC-19 numeric-status-code triple as a shared badge, CC-23 live activity feed on the homepage, CC-29 cross-module write to the shared Spool aggregate — the punch-code referential as Admin-owned data).

Phase 6 closes:

- **PM matrix B6 (Pressure-Test homepage)** — already ✅ but adds activity feed + filter inheritance per CC-23
- **PM matrix B7 (Explorer drill-down)** — already ✅ but General / Iso-status / Spool-status tabs become **derived**, not synthetic
- **PM matrix B8 (Release worklist popup / Excel export)** — 🧪 → ✅ via real `xlsx` export (replaces CSV mock-toast)
- **PM matrix B11 (PM read-only deep-dive)** — ⚠ → ✅ via `<PmWriteLockBanner />` + disable on every Test Pack mutation surface
- **Subcontractor matrix B-scope-leak** — Test Pack screens are the last sub-module without scope lock; close that gap

**Critical context discovered during code audit:**

- **Test Pack is the strongest module in PipeQC already.** Track A (A1–A6) shipped the full Pressure Test 5-section workflow (`/testpack/pressure-test/{line-check,item-clearance,blinding,testing-precomm,reinstatement}` × prep+progress), live RFT engine ([lib/testpack-release-tracking.ts](lib/testpack-release-tracking.ts)), persisted store with eligibility cascade ([store/testpack-store.ts](store/testpack-store.ts#L129-L178)), flange Y/Z reinstatement via `useFlangeStore`. **Most of Phase 6 is targeted enhancement, not greenfield.** The hard part is touching the right files without regressing the existing flow.
- **Testpack Builder (slice 6.1) does not exist.** No `/testpack/builder` route, no UI for manual ISO→TP assignment outside the existing seed. Test packs in [lib/testpack-seed.ts](lib/testpack-seed.ts#L144-L260) have `isoIds: string[]` baked in at seed time. Per [presentation_findings.md:1456-1495](docs/research/presentation_findings.md#L1456-L1495), Easy Piping builds test packs **after construction starts** by manual selection — the deck doesn't show a wizard, it implies an editable list on the TP record. Decision: add a Sheet-based "Edit ISOs" action on every TP in the Explorer (PM-only, write-locked) plus a `/testpack/builder` page that lists unassigned ISOs and lets the user pin them into a TP. **Bonus:** also add "New Test Pack" form (rev, planned date, medium, volume, system/subsystem) — closes pres #7 General-tab gap. Bundled into one route. **Without this slice, Phase 6 is "polish only" — slice 6.1 is the new feature.**
- **TP General tab is half-mock.** [components/testpack/testpack-explorer.tsx:429-500](components/testpack/testpack-explorer.tsx#L429-L500) `TestpackGeneral` reads from the synthetic `Testpack` shape ([lib/testpack-data.ts:84-228](lib/testpack-data.ts#L84-L228)) — `revNo: "Rev 1"`, `unitOfTime: "24 h"`, `testMedium: "Hydro"`, `testPressure: "20.0 bar"`, `volume: "2.0 m³"`, `testPlannedDate: "2025-12-01"` are all hard-coded. Per pres #7 #1499, those are core editable General-tab fields. Decision: extend `TestPackRecord` in [lib/testpack-seed.ts](lib/testpack-seed.ts#L82-L99) with `rev: string`, `testPlannedDate?: string`, `testMedium: "Hydro" | "Pneumatic" | "Vacuum"`, `unitOfTime: string`, `volumeM3?: number`, `testPressureBar?: number`. Slice 6.1 builder writes them; explorer reads them; LiveReleaseTracking ([testpack-explorer.tsx:587-845](components/testpack/testpack-explorer.tsx#L587-L845)) already reads from store — extend the same pattern to General.
- **Iso-level tabs are entirely mock.** `makeSyntheticTestpack` ([testpack-explorer.tsx:130-227](components/testpack/testpack-explorer.tsx#L130-L227)) generates synthetic `Spool[]` (always 2 per iso, hard-coded `spoolNo: "${iso.id}-SP-01"`, `statusCode: 12`). Per pres #7 #1508-#1519, Iso-level "Spool status" tab shows real per-spool status with numeric code + tooltip + RAG color, and "Isometric status" shows per-iso aggregate. Decision: replace synthetic iso/spool data inside the explorer's Iso-level views with a live derivation from `useSpoolsStore` + `useSpoolFabStage()` + `useErectedStore` + `useTestpackStore.isos`. This is **slice 6.5 deeper** than roadmap_v3 named, but it's the natural completion of CC-19 (numeric status code triple).
- **CC-19 numeric status code triple does not exist as a shared badge.** [lib/testpack-data.ts:54-58](lib/testpack-data.ts#L54-L58) defines `STATUS_CODE_TOOLTIPS` for codes 4/8/12 only. PipeQC has no shared `<StatusCodeBadge code={12} tooltip="…" />` component. Decision: build it in `components/shared/status-code-badge.tsx` and use it across Iso-level + Spool-level explorer tabs (and reusable elsewhere). Pres #7 #1512: _"Numeric code (e.g. 12 = Ready For Test) + tooltip + RAG"._
- **Release worklist export is mock-CSV, not Excel.** [components/testpack/release-work-dialog.tsx:38-54](components/testpack/release-work-dialog.tsx#L38-L54) builds a CSV blob client-side via `URL.createObjectURL` + `<a download>`. PM B8 matrix calls this 🧪. The `xlsx` library will already be added in Phase 5 (Task 6 — `npm install xlsx @types/xlsx`); if Phase 5 didn't run first, install here. Decision: swap `Blob([csv])` for `XLSX.writeFile()` with `Spool / ISO / Joint / Status` columns + apply scope-lock filter to the rows.
- **Flange Torquing → RFT linkage (slice 6.2) is already half-built.** [lib/testpack-release-tracking.ts:83-87](lib/testpack-release-tracking.ts#L83-L87) computes `flangeJointsToBeBolted` using only Cat-X joints with status ∈ {Bolted, Torque Verified, Reinstated}. **But:** the **Cat-Y** and **Cat-Z** flange joints don't gate `readyForTest` — only Cat-X does (correct per pres #7 #1521-#1530: `ISO_RFT = ... AND (all Cat-X items cleared)`). What's actually missing: **the RFT gate engine doesn't include PWHT release** as the formula demands. Look at `isNdeClear` ([testpack-release-tracking.ts:48-57](lib/testpack-release-tracking.ts#L48-L57)) — it checks `weld.pwhtRequired && !weld.pwhtDate` and gates accordingly, so `jointsAwaitingNde` covers it transitively. **No new gate to build for 6.2 RFT-side.** But slice 6.2 also names "Flange Torquing → RFT linkage" — that's the **explorer surface**: the Release Tracking tab needs a clickable drill-down on `flangeJointsToBeBolted` that opens the actual flange progress screen filtered to that TP. Currently the 8 numerics open a generic dialog ([testpack-explorer.tsx:847-1003](components/testpack/testpack-explorer.tsx#L847-L1003)) — the flange one needs to navigate to `/erection/flange-progress?spool=${spool}` or `/flange?testpack=${tpId}` to **complete the linkage**, not just show a list. Slice 6.2 is **router glue + 1 filter param**, not domain logic.
- **Pressure Test nested nav is good but breadcrumbs are flat.** [components/testpack/pressure-test-homepage.tsx](components/testpack/pressure-test-homepage.tsx) and the 8 sub-routes work, but jumping from `/testpack/pressure-test/line-check/progress` doesn't tell the user where they are in the section hierarchy. Slice 6.3 = add a 3-level breadcrumb (Pressure Test → Line Check → Progress) component + a "back to pressure-test home" affordance on every prep/progress view. Cosmetic but high-leverage for demo.
- **Client examination coordination (slice 6.4) is unbuilt and ambiguous.** Roadmap_v3 says _"owner's rep sign-off на N2 results (CC-N5)"_ — but the role matrix nor pres #7 explicitly defines a separate _Owner's Representative_ role with sign-off authority on NDE. The closest thing is the dossier handover step in §20 (per [docs/PIPEQC_CONTEXT.md](docs/PIPEQC_CONTEXT.md) merge log). Decision: scope slice 6.4 down to a **Client Examination panel** on the Operation Management tab — a simple toggleable "Client witness present (Y/N) + date + signer name" record per TP. Not a full role. Not a sign-off workflow. Just a record. **This honors v3's intent without building a half-baked sign-off engine.** Full owner workflow → Phase 7.
- **PM write-lock has not touched the Test Pack module yet.** Search confirms no `usePmWriteLock` / `<PmWriteLockBanner />` in `components/testpack/`. Per matrix PM B11, PM should be read-only on `/testpack/*` mutation screens (Assign team, Record line check, Mark cleared, Record blinding date, Set testing dates, Mark reinstated, Save Builder, Generate Request). Each Save/Assign button gets `disabled={... || pmLocked}` + banner. Same pattern as Phases 2/3/4/5.
- **Subcontractor scope lock has not touched Test Pack either.** Search confirms. Per pres #7 the test pack workflow is _site-managed_ (Line Checker / Finishing / Blinding teams own it, not the field welding subs) so scope-lock impact is lower than NDE/Fab — but for parity we wire `useScopeLock()` on the homepage KPIs and the Explorer subsystem filter so a subcontractor PM sees only their PDS area TPs. No-op on demo data until `pdsAreaCode` lands on `TestPackRecord` (Phase 7).
- **Live activity feed (CC-23) is missing on Pressure Test homepage.** Pres #7 #1486-#1493 lists the home page as _"Tracks 4 activities... Print button at top... Show test pack explorer button"_ but does not explicitly mention a feed. **However**, pres #8 (Spooling) explicitly does, and pres #4 (Fab) does — CC-23 is system-wide. For consistency with the existing Fabrication / Erection / Spooling dashboards (which all show recent activity), add a thin recent-activity card to the pressure-test homepage derived from `useTestpackStore.checkingRequests + clearanceRequests + blindingRequests + reinstatementRequests` sorted by `createdAt` DESC. Reusable component: `<TestpackActivityFeed />`. **Decision: bundle into slice 6.3 polish** since it's structurally part of the homepage IA.
- **CC-17 "Generate Request" PDF is mock-toast across all 4 prep screens.** Each prep view ([components/testpack/line-check/preparation-view.tsx](components/testpack/line-check/preparation-view.tsx), `item-clearance/preparation-view.tsx`, `blinding/preparation-view.tsx`, `reinstatement/preparation-view.tsx`) has an "Assign" button that creates a request record (✅ works) but **no printable PDF**. Per CC-17 #1944-#1956, the physical-world bridge is the printed work order. **Decision: defer real PDF generation to Phase 7 Track P (PDF infrastructure) — but add a "Generate Request PDF" button per screen that opens a print-stylesheet view of the request** (browser print → PDF via OS), no jsPDF needed. This honors the CC-17 parity gap without adding a PDF library this phase.
- **Dossier Handover PDF (PM B10 / slice 6.x in v3) is explicitly Phase 7.** Roadmap_v3 line 388: _"Dossier Handover PDF (pm.B10) — Phase 7 (Track P)"._ Do not build here. Note in closure.
- **Punch code referential is hardcoded in `lib/testpack-seed.ts:127-138`.** Per pres #7 #1554 _"Punch code (from project referential — auto-fills description; description is editable)"_ and per [presentation_findings.md:222](docs/research/test_pack_appendix.md#L222) _"NEW: Where does the punch-code referential live?"_, the codes belong in the Admin store. **Decision: leave as a Phase 7 admin polish slice** — moving them now would touch the line-check progress view and the admin module without strong demo payoff. Note in closure.
- **`makeSyntheticTestpack` is a load-bearing seam.** It bridges the **static** `testpacks` array ([lib/testpack-data.ts](lib/testpack-data.ts)) (used by SystemCard / SubsystemTable / TestpackTable for IDs not in store) and the **live** `useTestpackStore` records (used by LiveReleaseTracking). After Phase 6 the live records carry richer metadata; the synthetic shim still falls back for static IDs. Don't remove it — extend its output fields instead.
- **`flange-store` vs `flange-bolt-progress-store` — two flange domains.** Per [docs/PIPEQC_CONTEXT.md:596-597](docs/PIPEQC_CONTEXT.md#L596-L597) testpack browse uses `flange-store` (browse joints / categorize Y/Z); erection field bolts use `flange-bolt-progress-store` (I8/I9b assign torque + verify). Slice 6.2 router glue should target `/flange?testpack=${tpId}` (testpack scope) for browse and `/erection/flange-progress?spool=${spool}` (field scope) for verify — both already exist and accept their respective filters.

**Architecture.** Phase 6 is mostly **shallow edits to existing files** + **one new big feature (Testpack Builder)** + **one new shared component (StatusCodeBadge)** + **two new minor components (TestpackActivityFeed, ClientExaminationPanel)**. The `useTestpackStore` extends with `createTestpack`, `updateTestpackGeneral`, `assignIsoToTestpack`, `recordClientExamination` actions. Print-stylesheet PDF views are plain Next.js routes with `@media print` CSS.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Zustand 5 + persist · Tailwind CSS · shadcn/ui (new-york) · lucide-react · sonner (toasts) · `xlsx` (already added in Phase 5 — verify before reinstalling)

> **Read before writing code:**
> - `docs/PIPEQC_CONTEXT.md` — full stack, store patterns, merge log
> - `docs/roadmap_v3.md` Phase 6 section (6.1–6.6 + Closure criteria)
> - `docs/research/presentation_findings.md` §#7 Test Pack (lines 1456–1594) — module-specific findings, RFT gate logic, X/Y/Z punch semantics, CC-17, CC-18, CC-19, CC-20
> - `docs/research/test_pack_appendix.md` — pure #7 module dump (overlaps with above but standalone)
> - `docs/role_matrix/project_manager.md` B6/B7/B8/B10/B11 specs (lines 81-91, 113-117, 139-145)
> - `docs/role_matrix/qc_engineer.md` B11/B12 (line-check findings + item clearance sign-off — these stay live, just gain scope+PM lock)
> - `docs/role_matrix/subcontractor.md` B-block — scope lock requirement
> - `store/testpack-store.ts` — `useTestpackStore` + `useFlangeStore` integration + `recomputeBlindingEligibility` + `recomputeReadyForTest`
> - `lib/testpack-seed.ts` — `TestPackRecord`, `ISORecord`, `PunchItem`, `PUNCH_CODES`, `SEED_*` data — extend here
> - `lib/testpack-data.ts` — static `systems` / `subsystems` / `testpacks` / `Testpack` synthetic shape — `STATUS_CODE_TOOLTIPS` lives here
> - `lib/testpack-release-tracking.ts` — `computeReleaseTrackingMetrics` (the RFT engine — already correct, just extend tooltips)
> - `components/testpack/testpack-explorer.tsx` — 1993 lines; the explorer (4 TP tabs + 2 iso tabs + spool list)
> - `components/testpack/pressure-test-homepage.tsx` — the activities homepage (5 KPI activities + alerts)
> - `components/testpack/release-work-dialog.tsx` — CSV mock to replace with XLSX
> - `components/testpack/{line-check,item-clearance,blinding,reinstatement}/preparation-view.tsx` — 4 prep screens for CC-17 PDF print buttons
> - `lib/scope-lock.ts` — `useScopeLock()` hook (Phase 2 Task 6)
> - `lib/pm-write-lock.ts` — `usePmWriteLock()` hook (Phase 2 Task 5)
> - `components/pm-write-lock-banner.tsx` — banner mount pattern
> - `store/notifications-store.ts` — `pushNotification({severity, category, title, description, href})` — new `category: "testpack"` for Builder save + Client Examination record events

---

## Design conventions (critical — match existing screens)

| Pattern | Where to copy from |
|---|---|
| Sheet detail panel | [components/erection/erected-detail-panel.tsx](components/erection/erected-detail-panel.tsx), `components/fabrication/qc-release-detail-panel.tsx` |
| Multi-step form in Sheet | [components/spooling/engineering-transmittal-form.tsx](components/spooling/engineering-transmittal-form.tsx) if exists, else build inline matching shadcn patterns |
| Mutation delay | `await new Promise(r => setTimeout(r, 600 + Math.random() * 200))` — match `delay()` helper in `testpack-store.ts` |
| Toast on mutation | `import { toast } from "sonner"; toast.success("...")` |
| Notification feed entry | `useNotificationsStore.getState().pushNotification({...})` |
| PM write-lock banner | `<PmWriteLockBanner />` near header; `disabled={... || pmLocked}` on Save buttons |
| Scope lock filter | `const scope = useScopeLock(); if (!scope.isInScope(tp.pdsAreaCode)) return false` inside row filter chain (no-op until pdsAreaCode lands) |
| Status code badge | NEW shared `<StatusCodeBadge code={12} />` reads `STATUS_CODE_TOOLTIPS` + tone map; reused everywhere code+tooltip+RAG triple appears |
| Activity feed | NEW `<TestpackActivityFeed />` — same shape as Fabrication recent-actions card |
| Builder Sheet | shadcn `<Sheet>` opens right; multi-section form (General → ISOs → Save); 600px wide |
| Colors | emerald=Done/Ready, amber=Eligible/InProgress/Pending, red=Blocker/NotEligible, sky=Assigned, violet=BlindingInProgress, slate=Construction |
| All components | `"use client"` — no server components |
| Print stylesheet | new `app/testpack/print/{kind}/[id]/page.tsx` routes with `<style media="print">` block + body class; user invokes browser print |

---

## File structure

### New files
- **Create:** `components/shared/status-code-badge.tsx` — shared CC-19 numeric+tooltip+RAG badge
- **Create:** `components/testpack/testpack-activity-feed.tsx` — recent actions feed on homepage (CC-23)
- **Create:** `components/testpack/testpack-builder-sheet.tsx` — full New/Edit TP Sheet form
- **Create:** `components/testpack/testpack-builder-iso-picker.tsx` — sub-form: two-column basket (unassigned ISOs → selected ISOs)
- **Create:** `components/testpack/client-examination-panel.tsx` — slice 6.4 record card on Operation Management tab
- **Create:** `app/testpack/builder/page.tsx` — Builder route (list of unassigned ISOs + "New TP" button)
- **Create:** `app/testpack/print/line-check/[requestId]/page.tsx` — Line Check Request print page
- **Create:** `app/testpack/print/item-clearance/[requestId]/page.tsx` — Item Clearance Request print page
- **Create:** `app/testpack/print/blinding/[requestId]/page.tsx` — Blinding Request print page
- **Create:** `app/testpack/print/reinstatement/[requestId]/page.tsx` — Reinstatement Request print page

### Modified files
- **Modify:** `lib/testpack-seed.ts` — extend `TestPackRecord` (rev, testPlannedDate, testMedium, unitOfTime, volumeM3, testPressureBar, clientWitness?) + seed values for existing TPs
- **Modify:** `store/testpack-store.ts` — add `createTestpack`, `updateTestpackGeneral`, `assignIsoToTestpack`, `removeIsoFromTestpack`, `recordClientExamination` actions + getNextTpId selector + bump persist version
- **Modify:** `lib/testpack-data.ts` — extend `STATUS_CODE_TOOLTIPS` to cover full numeric set (4/8/10/12/14/16/20) + export tone map `STATUS_CODE_TONES`
- **Modify:** `components/testpack/testpack-explorer.tsx` — (a) replace synthetic General-tab values with live `TestPackRecord` reads; (b) wire Iso-level "Spool status" tab to live `useSpoolsStore` + `deriveSpoolFabStage()`; (c) add "Edit Test Pack" action button (PM write-lock guarded) opening `TestpackBuilderSheet`; (d) make flange numeric in Release Tracking navigate to `/flange?testpack=${tpId}`; (e) add `<ClientExaminationPanel />` on Operation Management tab; (f) wrap Save / Edit actions in `usePmWriteLock`; (g) apply `useScopeLock` to subsystem TP filter chain
- **Modify:** `components/testpack/pressure-test-homepage.tsx` — (a) add `<TestpackActivityFeed />` card; (b) add filter inheritance polish (filter chip row → feeds both KPIs and feed); (c) apply scope lock to KPI hook results
- **Modify:** `components/testpack/release-work-dialog.tsx` — swap CSV blob for `XLSX.writeFile()` + apply scope filter on rows + PM write-lock disables Export
- **Modify:** `components/testpack/{line-check,item-clearance,blinding,reinstatement}/preparation-view.tsx` — add "Generate Request PDF" button (opens `/testpack/print/{kind}/${requestId}` in new tab); wrap Assign Save in `usePmWriteLock`
- **Modify:** `components/testpack/{line-check,item-clearance,blinding,reinstatement}/progress-view.tsx` — wrap mutation Save buttons in `usePmWriteLock` + `<PmWriteLockBanner />` near header
- **Modify:** `components/testpack/testing-precomm/progress-view.tsx` — same PM write-lock wiring on `setTestingDates`
- **Modify:** `config/navigation.ts` — under existing `/testpack` parent, add child `{ label: "Builder", href: "/testpack/builder" }`
- **Modify:** `app/testpack/page.tsx` — replace placeholder shell with redirect to `/testpack/pressure-test` (or keep as light index card with 3 quick links: Pressure Test / Explorer / Builder)

---

## Task 1 — Shared `<StatusCodeBadge />` + extended status-code tooltips (CC-19)

**Files:**
- Create: `components/shared/status-code-badge.tsx`
- Modify: `lib/testpack-data.ts`

**What this builds:** A reusable badge that takes `code: number` and renders `[code] tooltip` with RAG color tone derived from the code. Replaces 5+ ad-hoc badge implementations across the explorer. Lays the foundation for slice 6.5 (Iso-level Spool status tab) which needs this badge.

- [ ] **Step 1: Extend `lib/testpack-data.ts` status tables**

Find `STATUS_CODE_TOOLTIPS` (currently lines 54-58). Replace with the full mapping derived from pres #7 #1512 and Easy Piping spool-state machine (also per [docs/PIPEQC_CONTEXT.md](docs/PIPEQC_CONTEXT.md) erection 7-state):

```typescript
export const STATUS_CODE_TOOLTIPS: Record<number, string> = {
  2: "Not Started — no construction activity",
  4: "Not Ready — construction incomplete",
  6: "To Site — spool delivered",
  8: "In Progress — work ongoing",
  10: "Welded/Bolted — joints complete",
  12: "Ready For Test — cleared for pressure test",
  14: "Line Check Done — punch items pending",
  16: "Blinding Complete — testing eligible",
  18: "Testing In Progress",
  20: "Tested & Reinstated",
}

export type StatusTone = "red" | "amber" | "emerald" | "sky" | "slate"

export const STATUS_CODE_TONES: Record<number, StatusTone> = {
  2: "slate",
  4: "red",
  6: "sky",
  8: "amber",
  10: "sky",
  12: "emerald",
  14: "amber",
  16: "sky",
  18: "amber",
  20: "emerald",
}
```

- [ ] **Step 2: Create `components/shared/status-code-badge.tsx`**

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { STATUS_CODE_TOOLTIPS, STATUS_CODE_TONES, type StatusTone } from "@/lib/testpack-data"
import { cn } from "@/lib/utils"

const TONE_CLASSES: Record<StatusTone, string> = {
  red:     "border-red-300 bg-red-100 text-red-800",
  amber:   "border-amber-300 bg-amber-100 text-amber-800",
  emerald: "border-emerald-300 bg-emerald-100 text-emerald-800",
  sky:     "border-sky-300 bg-sky-100 text-sky-800",
  slate:   "border-slate-300 bg-slate-100 text-slate-700",
}

interface Props {
  code: number
  label?: string
  className?: string
}

export function StatusCodeBadge({ code, label, className }: Props) {
  const tooltip = STATUS_CODE_TOOLTIPS[code] ?? `Status ${code}`
  const tone = STATUS_CODE_TONES[code] ?? "slate"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("inline-flex items-center gap-1 font-mono text-[11px]", TONE_CLASSES[tone], className)}>
          <span className="font-semibold">{code}</span>
          {label ? <span className="font-medium normal-case">{label}</span> : null}
        </Badge>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npx tsc --noEmit 2>&1 | head -30
git add components/shared/status-code-badge.tsx lib/testpack-data.ts
git commit -m "feat(testpack): shared StatusCodeBadge + full status-code tooltip map (CC-19, Phase 6 Task 1)"
```

---

## Task 2 — Extend `TestPackRecord` schema + store actions for Builder

**Files:**
- Modify: `lib/testpack-seed.ts`
- Modify: `store/testpack-store.ts`

**What this builds:** Adds the missing General-tab fields (`rev`, `testPlannedDate`, `testMedium`, `unitOfTime`, `volumeM3`, `testPressureBar`, `clientWitness`) to `TestPackRecord` so the Builder can write them and the Explorer can read them. Adds 5 new store actions for Builder flow. Bumps persist version to drop stale state.

- [ ] **Step 1: Extend `TestPackRecord` in `lib/testpack-seed.ts`**

Locate `interface TestPackRecord` (currently lines 82-99). Add fields:

```typescript
export type TestMedium = "Hydro" | "Pneumatic" | "Vacuum"

export interface ClientWitnessRecord {
  present: boolean
  date?: string         // ISO date YYYY-MM-DD
  signerName?: string
  recordedBy?: string
  recordedAt?: string   // full ISO datetime
}

export interface TestPackRecord {
  id: string
  no: string
  subsystem: string
  system: string
  location: string
  areaClassification: string
  priority: "High" | "Medium" | "Low"
  isoIds: string[]
  readyForTest: boolean
  blindingStatus: BlindingStatus
  blindingAssignedTo?: string
  blindingRequestId?: string
  blindingDate?: string
  testingStartDate?: string
  testingDoneDate?: string
  preCommDate?: string
  // NEW Phase 6
  rev: string                        // e.g. "Rev 1"
  testPlannedDate?: string           // ISO date
  testMedium: TestMedium
  unitOfTime: string                 // free entry, e.g. "24 h"
  volumeM3?: number
  testPressureBar?: number
  pdsAreaCode?: string               // for scope lock, populated by Admin (Phase 7); leave undefined in seed
  clientWitness?: ClientWitnessRecord
  createdAt?: string                 // ISO datetime — only Builder-created TPs have this
  createdBy?: string
}
```

Then update the `SEED_TEST_PACKS` array (lines 144+) — append the new required fields to every TP entry. Use sensible defaults:

```typescript
{
  id: "TP-201", no: "TP-201", subsystem: "SS-001-A", system: "SYS-001",
  location: "Pipe Rack PR-01", areaClassification: "Class 1", priority: "Medium",
  isoIds: ["ISO-1001", "ISO-1002", "ISO-1003", "ISO-1020"],
  readyForTest: false, blindingStatus: "NotEligible",
  rev: "Rev 1", testPlannedDate: "2025-12-01", testMedium: "Hydro",
  unitOfTime: "24 h", volumeM3: 2.0, testPressureBar: 20.0,
},
// ... apply same pattern to all SEED_TEST_PACKS
```

- [ ] **Step 2: Extend `useTestpackStore` with Builder + Client Witness actions**

In `store/testpack-store.ts`, add to the `TestpackState` interface (after `recordSpoolRFT`):

```typescript
  // Builder mutations (Phase 6)
  getNextTpId: () => string
  createTestpack: (payload: {
    no?: string                  // optional — auto if absent
    subsystem: string
    system: string
    location: string
    areaClassification: string
    priority: "High" | "Medium" | "Low"
    rev?: string                 // default "Rev 1"
    testPlannedDate?: string
    testMedium?: TestMedium       // default "Hydro"
    unitOfTime?: string           // default "24 h"
    volumeM3?: number
    testPressureBar?: number
    isoIds: string[]
    createdBy: string
  }) => Promise<{ id: string }>
  updateTestpackGeneral: (
    tpId: string,
    patch: Partial<Pick<TestPackRecord, "rev" | "testPlannedDate" | "testMedium" | "unitOfTime" | "volumeM3" | "testPressureBar" | "priority" | "location" | "areaClassification">>,
  ) => void
  assignIsoToTestpack: (tpId: string, isoId: string) => void
  removeIsoFromTestpack: (tpId: string, isoId: string) => void
  recordClientExamination: (tpId: string, payload: ClientWitnessRecord) => void
```

Add the implementations inside `create<TestpackState>()(persist((set, get) => ({ ... }), { ... }))`:

```typescript
      getNextTpId: () => {
        const ids = get().testPacks.map((tp) => {
          const m = tp.id.match(/TP-(\d+)/)
          return m ? parseInt(m[1], 10) : 0
        })
        const next = Math.max(200, ...ids) + 1
        return `TP-${next}`
      },

      createTestpack: async (payload) => {
        await delay()
        const id = payload.no ?? get().getNextTpId()
        const newTp: TestPackRecord = {
          id,
          no: id,
          subsystem: payload.subsystem,
          system: payload.system,
          location: payload.location,
          areaClassification: payload.areaClassification,
          priority: payload.priority,
          isoIds: payload.isoIds,
          readyForTest: false,
          blindingStatus: "NotEligible",
          rev: payload.rev ?? "Rev 1",
          testPlannedDate: payload.testPlannedDate,
          testMedium: payload.testMedium ?? "Hydro",
          unitOfTime: payload.unitOfTime ?? "24 h",
          volumeM3: payload.volumeM3,
          testPressureBar: payload.testPressureBar,
          createdAt: now(),
          createdBy: payload.createdBy,
        }
        set((state) => {
          // Also flip any ISO's testpackId to point here
          const updatedIsos = state.isos.map((iso) =>
            payload.isoIds.includes(iso.id) ? { ...iso, testpackId: id } : iso,
          )
          const nextState = { ...state, testPacks: [...state.testPacks, newTp], isos: updatedIsos }
          return { testPacks: recomputeReadyForTest(nextState), isos: updatedIsos }
        })
        return { id }
      },

      updateTestpackGeneral: (tpId, patch) => {
        set((state) => ({
          testPacks: state.testPacks.map((tp) => (tp.id === tpId ? { ...tp, ...patch } : tp)),
        }))
      },

      assignIsoToTestpack: (tpId, isoId) => {
        set((state) => {
          const updatedIsos = state.isos.map((iso) =>
            iso.id === isoId ? { ...iso, testpackId: tpId } : iso,
          )
          const updatedTps = state.testPacks.map((tp) =>
            tp.id === tpId && !tp.isoIds.includes(isoId)
              ? { ...tp, isoIds: [...tp.isoIds, isoId] }
              : tp,
          )
          const nextState = { ...state, isos: updatedIsos, testPacks: updatedTps }
          return { isos: updatedIsos, testPacks: recomputeBlindingEligibility(recomputeReadyForTest(nextState).reduce ? recomputeReadyForTest(nextState) : updatedTps) }
        })
      },

      removeIsoFromTestpack: (tpId, isoId) => {
        set((state) => {
          const updatedTps = state.testPacks.map((tp) =>
            tp.id === tpId ? { ...tp, isoIds: tp.isoIds.filter((id) => id !== isoId) } : tp,
          )
          const nextState = { ...state, testPacks: updatedTps }
          return { testPacks: recomputeBlindingEligibility(recomputeReadyForTest(nextState).reduce ? recomputeReadyForTest(nextState) : updatedTps) }
        })
      },

      recordClientExamination: (tpId, payload) => {
        set((state) => ({
          testPacks: state.testPacks.map((tp) =>
            tp.id === tpId
              ? {
                ...tp,
                clientWitness: {
                  ...payload,
                  recordedAt: payload.recordedAt ?? now(),
                },
              }
              : tp,
          ),
        }))
      },
```

**Important:** the `recomputeBlindingEligibility` and `recomputeReadyForTest` helpers above use `state` shape — pass them the full state object as they do today. Match the existing pattern (look at `markPunchItemsCleared` for example). The pseudocode above is illustrative — implement carefully.

- [ ] **Step 3: Bump persist version + add migration**

In the `persist` config (around line 614), change `version: 5` to `version: 6` and update the migrate function:

```typescript
{
  name: "pipeqc-testpack",
  storage: createJSONStorage(() => localStorage),
  version: 6,
  migrate: (persistedState, version) => {
    if (version < 6) {
      // Drop stale state — seed will re-populate with Phase 6 fields
      return undefined as unknown as TestpackState
    }
    return persistedState as TestpackState
  },
},
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add lib/testpack-seed.ts store/testpack-store.ts
git commit -m "feat(testpack): extend TestPackRecord schema + Builder actions + client witness (Phase 6 Task 2)"
```

---

## Task 3 — Testpack Builder UI: Sheet + ISO picker + page (Slice 6.1)

**Files:**
- Create: `components/testpack/testpack-builder-iso-picker.tsx`
- Create: `components/testpack/testpack-builder-sheet.tsx`
- Create: `app/testpack/builder/page.tsx`
- Modify: `config/navigation.ts`

**What this builds:** The flagship new feature of Phase 6. A dedicated `/testpack/builder` route lists all ISOs and shows their assignment state (assigned to TP-X, or unassigned). A "New Test Pack" button opens a Sheet with a 3-section form: General (rev / date / medium / pressure / volume / unitOfTime), Location (system / subsystem / location / area / priority), and ISO Picker (two-column basket — left: unassigned ISOs filtered by system, right: selected for this TP). Save → `createTestpack` + toast + notification + navigates to the new TP in Explorer. An "Edit" affordance on existing TPs (in the Explorer + the Builder list) opens the same Sheet pre-populated with `updateTestpackGeneral` + `assignIsoToTestpack` / `removeIsoFromTestpack` wiring.

- [ ] **Step 1: Create `components/testpack/testpack-builder-iso-picker.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTestpackStore } from "@/store/testpack-store"
import { cn } from "@/lib/utils"

interface Props {
  selectedIsoIds: string[]
  onChange: (next: string[]) => void
  /** ID of the TP being edited — its current ISOs are NOT shown as "already assigned" in the left list */
  editingTpId?: string
}

export function TestpackBuilderIsoPicker({ selectedIsoIds, onChange, editingTpId }: Props) {
  const isos = useTestpackStore((s) => s.isos)
  const tps = useTestpackStore((s) => s.testPacks)
  const [search, setSearch] = useState("")

  // Build a map of isoId -> assigning TP id (excluding the one being edited)
  const assignmentMap = useMemo(() => {
    const map = new Map<string, string>()
    tps.forEach((tp) => {
      if (tp.id === editingTpId) return
      tp.isoIds.forEach((isoId) => map.set(isoId, tp.id))
    })
    return map
  }, [tps, editingTpId])

  const availableIsos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return isos
      .filter((iso) => !selectedIsoIds.includes(iso.id))
      .filter((iso) => (q ? iso.id.toLowerCase().includes(q) : true))
  }, [isos, selectedIsoIds, search])

  const selectedIsos = useMemo(
    () => selectedIsoIds.map((id) => isos.find((iso) => iso.id === id)).filter(Boolean) as typeof isos,
    [selectedIsoIds, isos],
  )

  const moveRight = (isoId: string) => onChange([...selectedIsoIds, isoId])
  const moveLeft = (isoId: string) => onChange(selectedIsoIds.filter((id) => id !== isoId))

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Available ISOs ({availableIsos.length})</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ISO no..." className="h-9 pl-9 text-sm" />
        </div>
        <ScrollArea className="h-[280px] rounded-md border border-slate-200">
          <ul className="divide-y divide-slate-200">
            {availableIsos.map((iso) => {
              const assignedTo = assignmentMap.get(iso.id)
              return (
                <li
                  key={iso.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 text-sm",
                    assignedTo ? "bg-amber-50" : "bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-[13px] text-slate-900">{iso.id}</span>
                    {assignedTo ? (
                      <span className="text-[10px] text-amber-700">Assigned to {assignedTo} — moving will reassign</span>
                    ) : null}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => moveRight(iso.id)}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </li>
              )
            })}
            {availableIsos.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">No ISOs available</li>
            ) : null}
          </ul>
        </ScrollArea>
      </div>

      <div className="hidden flex-col items-center justify-center md:flex">
        <Badge variant="outline" className="rotate-90 text-[10px] uppercase tracking-wider text-slate-500">Move</Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Selected for this TP ({selectedIsos.length})</p>
        </div>
        <ScrollArea className="h-[316px] rounded-md border border-emerald-200 bg-emerald-50/30">
          <ul className="divide-y divide-emerald-200">
            {selectedIsos.map((iso) => (
              <li key={iso.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => moveLeft(iso.id)}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="flex-1 font-mono text-[13px] text-slate-900">{iso.id}</span>
              </li>
            ))}
            {selectedIsos.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">No ISOs selected yet</li>
            ) : null}
          </ul>
        </ScrollArea>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/testpack/testpack-builder-sheet.tsx`**

A right-opening Sheet with 3 sections (General / Location / ISOs) collected via local form state, validated, then submitted via `createTestpack` or `updateTestpackGeneral` + diff'd `assignIsoToTestpack` / `removeIsoFromTestpack`. Save button:
- Disabled when `pmLocked` (PM read-only) OR when validation fails (no isoIds selected, missing required fields)
- Mounts `<PmWriteLockBanner />` near `<SheetHeader>`
- After save: toast + notification (`category: "testpack"`) + `onClose()` + (if create) navigate to `/testpack/explorer?tp=${id}`

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { systems, subsystems } from "@/lib/testpack-data"
import { useTestpackStore } from "@/store/testpack-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { TestpackBuilderIsoPicker } from "./testpack-builder-iso-picker"
import type { TestPackRecord, TestMedium } from "@/lib/testpack-seed"

type Mode = { kind: "create" } | { kind: "edit"; tp: TestPackRecord }

interface Props {
  open: boolean
  onClose: () => void
  mode: Mode
}

export function TestpackBuilderSheet({ open, onClose, mode }: Props) {
  const router = useRouter()
  const createTestpack = useTestpackStore((s) => s.createTestpack)
  const updateTestpackGeneral = useTestpackStore((s) => s.updateTestpackGeneral)
  const assignIsoToTestpack = useTestpackStore((s) => s.assignIsoToTestpack)
  const removeIsoFromTestpack = useTestpackStore((s) => s.removeIsoFromTestpack)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const { isLocked: pmLocked } = usePmWriteLock()

  const initial = mode.kind === "edit" ? mode.tp : null

  const [no, setNo] = useState(initial?.no ?? "")
  const [rev, setRev] = useState(initial?.rev ?? "Rev 1")
  const [testPlannedDate, setTestPlannedDate] = useState(initial?.testPlannedDate ?? "")
  const [testMedium, setTestMedium] = useState<TestMedium>(initial?.testMedium ?? "Hydro")
  const [unitOfTime, setUnitOfTime] = useState(initial?.unitOfTime ?? "24 h")
  const [volumeM3, setVolumeM3] = useState(initial?.volumeM3?.toString() ?? "")
  const [testPressureBar, setTestPressureBar] = useState(initial?.testPressureBar?.toString() ?? "")
  const [system, setSystem] = useState(initial?.system ?? systems[0]?.id ?? "")
  const [subsystem, setSubsystem] = useState(initial?.subsystem ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [areaClassification, setAreaClassification] = useState(initial?.areaClassification ?? "Class 1")
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">(initial?.priority ?? "Medium")
  const [selectedIsoIds, setSelectedIsoIds] = useState<string[]>(initial?.isoIds ?? [])
  const [busy, setBusy] = useState(false)

  // When system changes, reset subsystem to a valid one
  useEffect(() => {
    const subs = subsystems.filter((s) => s.systemId === system)
    if (subs.length > 0 && !subs.some((s) => s.id === subsystem)) {
      setSubsystem(subs[0].id)
    }
  }, [system, subsystem])

  const valid = selectedIsoIds.length > 0 && system && subsystem && location.trim()

  const handleSave = async () => {
    if (!valid || pmLocked) return
    setBusy(true)
    try {
      if (mode.kind === "create") {
        const { id } = await createTestpack({
          no: no.trim() || undefined,
          system, subsystem, location: location.trim(), areaClassification, priority,
          rev, testPlannedDate: testPlannedDate || undefined, testMedium, unitOfTime,
          volumeM3: volumeM3 ? Number(volumeM3) : undefined,
          testPressureBar: testPressureBar ? Number(testPressureBar) : undefined,
          isoIds: selectedIsoIds,
          createdBy: "PM-USER",
        })
        toast.success(`${id} created with ${selectedIsoIds.length} ISO(s)`)
        pushNotification({
          severity: "info", category: "testpack",
          title: `${id} test pack created`,
          description: `${selectedIsoIds.length} ISO(s) assigned · planned ${testPlannedDate || "TBD"}`,
          href: `/testpack/explorer?tp=${id}`,
        })
        router.push(`/testpack/explorer?tp=${id}`)
      } else {
        const tp = mode.tp
        updateTestpackGeneral(tp.id, {
          rev, testPlannedDate: testPlannedDate || undefined, testMedium, unitOfTime,
          volumeM3: volumeM3 ? Number(volumeM3) : undefined,
          testPressureBar: testPressureBar ? Number(testPressureBar) : undefined,
          priority, location: location.trim(), areaClassification,
        })
        // Diff isoIds
        const oldSet = new Set(tp.isoIds)
        const newSet = new Set(selectedIsoIds)
        for (const id of newSet) if (!oldSet.has(id)) assignIsoToTestpack(tp.id, id)
        for (const id of oldSet) if (!newSet.has(id)) removeIsoFromTestpack(tp.id, id)
        toast.success(`${tp.id} updated`)
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[640px]">
        <SheetHeader className="space-y-1">
          <SheetTitle>{mode.kind === "create" ? "New Test Pack" : `Edit ${mode.tp.id}`}</SheetTitle>
          <SheetDescription>
            {mode.kind === "create"
              ? "Define general info, location, and assign ISOs from the available pool."
              : "Update general/location info and adjust ISO assignment."}
          </SheetDescription>
        </SheetHeader>

        {pmLocked ? <div className="my-3"><PmWriteLockBanner /></div> : null}

        <div className="space-y-6 py-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">General</h3>
            <div className="grid grid-cols-2 gap-3">
              {mode.kind === "create" ? (
                <div className="col-span-2">
                  <Label htmlFor="tp-no" className="text-xs">TP number (leave blank to auto-assign)</Label>
                  <Input id="tp-no" value={no} onChange={(e) => setNo(e.target.value)} placeholder="TP-XXX" className="h-9 text-sm" disabled={pmLocked} />
                </div>
              ) : null}
              <div>
                <Label htmlFor="tp-rev" className="text-xs">Revision</Label>
                <Input id="tp-rev" value={rev} onChange={(e) => setRev(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-planned" className="text-xs">Planned test date</Label>
                <Input id="tp-planned" type="date" value={testPlannedDate} onChange={(e) => setTestPlannedDate(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-medium" className="text-xs">Test medium</Label>
                <Select value={testMedium} onValueChange={(v) => setTestMedium(v as TestMedium)} disabled={pmLocked}>
                  <SelectTrigger id="tp-medium" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hydro">Hydro</SelectItem>
                    <SelectItem value="Pneumatic">Pneumatic</SelectItem>
                    <SelectItem value="Vacuum">Vacuum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-unit" className="text-xs">Unit of time (calc)</Label>
                <Input id="tp-unit" value={unitOfTime} onChange={(e) => setUnitOfTime(e.target.value)} placeholder="24 h" className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-volume" className="text-xs">Volume (m³, optional)</Label>
                <Input id="tp-volume" type="number" step="0.1" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-pressure" className="text-xs">Test pressure (bar)</Label>
                <Input id="tp-pressure" type="number" step="0.5" value={testPressureBar} onChange={(e) => setTestPressureBar(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Location & priority</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tp-system" className="text-xs">System</Label>
                <Select value={system} onValueChange={setSystem} disabled={pmLocked}>
                  <SelectTrigger id="tp-system" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{systems.map((s) => <SelectItem key={s.id} value={s.id}>{s.id} — {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-subsystem" className="text-xs">Subsystem</Label>
                <Select value={subsystem} onValueChange={setSubsystem} disabled={pmLocked}>
                  <SelectTrigger id="tp-subsystem" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{subsystems.filter((s) => s.systemId === system).map((s) => <SelectItem key={s.id} value={s.id}>{s.id} — {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-loc" className="text-xs">Location</Label>
                <Input id="tp-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Pipe Rack PR-01" className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-area" className="text-xs">Area class.</Label>
                <Input id="tp-area" value={areaClassification} onChange={(e) => setAreaClassification(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
              </div>
              <div>
                <Label htmlFor="tp-priority" className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)} disabled={pmLocked}>
                  <SelectTrigger id="tp-priority" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">ISOs in this Test Pack</h3>
            <TestpackBuilderIsoPicker
              selectedIsoIds={selectedIsoIds}
              onChange={setSelectedIsoIds}
              editingTpId={mode.kind === "edit" ? mode.tp.id : undefined}
            />
          </section>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!valid || pmLocked || busy}>
            <Save className="mr-2 h-4 w-4" />
            {mode.kind === "create" ? "Create test pack" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Create `app/testpack/builder/page.tsx`**

A list/table view with two collapsed sections:
1. **Existing Test Packs** — table of `useTestpackStore.testPacks` with cols (ID · System · Subsystem · ISOs · Status · Updated · Actions=Edit) and a "New Test Pack" button in the page header.
2. **Unassigned ISOs** — table of ISOs not in any TP — "Add to Test Pack" action opens the Sheet pre-selecting that iso.

Use shadcn `<Table>`. Header section also exposes a scope-lock chip (no-op until pdsAreaCode present, but visible). Use the `TestpackBuilderSheet` for both create and edit modes.

```tsx
"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTestpackStore } from "@/store/testpack-store"
import { useScopeLock } from "@/lib/scope-lock"
import { TestpackBuilderSheet } from "@/components/testpack/testpack-builder-sheet"
import type { TestPackRecord } from "@/lib/testpack-seed"

export default function TestpackBuilderPage() {
  const tps = useTestpackStore((s) => s.testPacks)
  const isos = useTestpackStore((s) => s.isos)
  const scope = useScopeLock()
  const [sheetMode, setSheetMode] = useState<{ kind: "create" } | { kind: "edit"; tp: TestPackRecord } | null>(null)

  const unassignedIsos = useMemo(() => {
    const assigned = new Set<string>()
    tps.forEach((tp) => tp.isoIds.forEach((id) => assigned.add(id)))
    return isos.filter((iso) => !assigned.has(iso.id))
  }, [tps, isos])

  const scopedTps = tps.filter((tp) => scope.isInScope((tp as any).pdsAreaCode))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Test Pack Builder</h1>
          <p className="text-sm text-muted-foreground">Manually assemble test packs from your unassigned ISO pool.</p>
        </div>
        <div className="flex items-center gap-2">
          {scope.active ? <Badge variant="outline" className="text-xs">Scope: {scope.subCode}</Badge> : null}
          <Button onClick={() => setSheetMode({ kind: "create" })}>
            <Plus className="mr-2 h-4 w-4" /> New Test Pack
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Existing Test Packs ({scopedTps.length})</CardTitle>
          <CardDescription>Click Edit to adjust general info or ISO assignment.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TP No</TableHead><TableHead>System</TableHead><TableHead>Subsystem</TableHead>
                <TableHead>ISOs</TableHead><TableHead>Rev</TableHead><TableHead>Medium</TableHead>
                <TableHead>Planned</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedTps.map((tp) => (
                <TableRow key={tp.id}>
                  <TableCell className="font-mono text-sm font-semibold text-sky-700">{tp.id}</TableCell>
                  <TableCell className="text-sm">{tp.system}</TableCell>
                  <TableCell className="text-sm">{tp.subsystem}</TableCell>
                  <TableCell className="text-sm">{tp.isoIds.length}</TableCell>
                  <TableCell className="text-sm">{tp.rev}</TableCell>
                  <TableCell className="text-sm">{tp.testMedium}</TableCell>
                  <TableCell className="text-sm">{tp.testPlannedDate ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSheetMode({ kind: "edit", tp })}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Unassigned ISOs ({unassignedIsos.length})</CardTitle>
          <CardDescription>ISOs not yet linked to any test pack.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>ISO ID</TableHead><TableHead>Welds done</TableHead><TableHead>Spools supported</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {unassignedIsos.map((iso) => (
                <TableRow key={iso.id}>
                  <TableCell className="font-mono text-sm">{iso.id}</TableCell>
                  <TableCell className="text-sm">{iso.allWeldsWelded ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-sm">{iso.spoolsSupported ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
              {unassignedIsos.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-slate-400">All ISOs are assigned to a test pack</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sheetMode ? <TestpackBuilderSheet open onClose={() => setSheetMode(null)} mode={sheetMode} /> : null}
    </div>
  )
}
```

- [ ] **Step 4: Update `config/navigation.ts`**

Find the existing `/testpack` parent (around line 283). Add a Builder child before Explorer:

```typescript
{
  title: 'Testpack',
  href: '/testpack',
  // ... existing icon and props
  children: [
    { title: 'Builder', href: '/testpack/builder' },
    { title: 'Explorer', href: '/testpack/explorer' },
    { title: 'Pressure Test', href: '/testpack/pressure-test' },
  ],
},
```

(Inspect actual nav schema — the field name may be `items` not `children`; match what other parents use.)

- [ ] **Step 5: Replace placeholder `app/testpack/page.tsx`**

Convert from current placeholder to a 3-card index linking to the three child routes (Builder · Explorer · Pressure Test) — or `redirect("/testpack/pressure-test")` if you prefer minimum-touch. Recommended: small index page so the parent nav node has a useful click target.

```tsx
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ListPlus, Compass, Gauge } from "lucide-react"

export default function TestpackIndexPage() {
  const tiles = [
    { href: "/testpack/builder", title: "Builder", desc: "Assemble test packs from unassigned ISOs", icon: ListPlus },
    { href: "/testpack/explorer", title: "Explorer", desc: "Drill from system → subsystem → TP → ISO → spool", icon: Compass },
    { href: "/testpack/pressure-test", title: "Pressure Test", desc: "Track readiness across line check / item clearance / blinding / testing / reinstatement", icon: Gauge },
  ]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Test Pack</h1>
        <p className="text-sm text-muted-foreground">Pick a sub-module to continue.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Icon className="h-5 w-5 text-sky-600" />
                  <CardTitle className="text-base">{t.title}</CardTitle>
                </CardHeader>
                <CardContent><CardDescription>{t.desc}</CardDescription></CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/testpack/testpack-builder-iso-picker.tsx \
        components/testpack/testpack-builder-sheet.tsx \
        app/testpack/builder/page.tsx app/testpack/page.tsx \
        config/navigation.ts
git commit -m "feat(testpack): Builder Sheet + ISO picker + /testpack/builder route + index (Slice 6.1, Phase 6 Task 3)"
```

---

## Task 4 — Explorer: live General/Iso-status tabs + flange linkage + Edit action (Slices 6.2, 6.5)

**Files:**
- Modify: `components/testpack/testpack-explorer.tsx`

**What this builds:** Replaces the synthetic General-tab + iso-level views with live reads from `useTestpackStore` (now Phase-6-enriched). Adds an "Edit Test Pack" button next to the breadcrumb in the TP-level view. Wires the flange numeric in Release Tracking to navigate to `/flange?testpack=${id}` (closes slice 6.2 router glue). Replaces ad-hoc badges with the new `<StatusCodeBadge />`. Applies `useScopeLock()` to the testpack filter chain.

- [ ] **Step 1: General tab — read live record fields**

Locate `function TestpackGeneral({ testpack }: { testpack: Testpack })` (~line 429). The displayed values currently come from the synthetic `Testpack` shape. Inject a lookup into `useTestpackStore` to find the matching live `TestPackRecord` and prefer its fields when present:

```tsx
function TestpackGeneral({ testpack }: { testpack: Testpack }) {
  const liveTp = useTestpackStore((s) => s.testPacks.find((tp) => tp.id === testpack.id))
  // Use live values when available; fallback to synthetic
  const rev          = liveTp?.rev          ?? testpack.revNo
  const plannedDate  = liveTp?.testPlannedDate ?? testpack.testPlannedDate
  const medium       = liveTp?.testMedium   ?? testpack.testMedium
  const unitOfTime   = liveTp?.unitOfTime   ?? testpack.unitOfTime
  const volumeM3     = liveTp?.volumeM3     ?? Number(testpack.volume?.replace(/[^\d.]/g, "") ?? 0)
  const pressureBar  = liveTp?.testPressureBar ?? Number(testpack.testPressure?.replace(/[^\d.]/g, "") ?? 0)
  // ... render existing card with these values
}
```

- [ ] **Step 2: Iso-level "Spool status" tab — live spool derivation**

Find the iso-level view (search `IsoLevelView` import + `iso-level-view.tsx`). Currently per `makeSyntheticTestpack` it shows 2 hardcoded spools per ISO. Replace with live derivation: for the selected ISO, look up real spools from `useSpoolsStore.spools` filtered by `s.isoNo === iso.isoNo`. For each spool derive `fabStage` via `deriveSpoolFabStage(welds.filter(w => w.spoolNo === spool.spoolNo))` + map fab stage to a numeric status code via a new helper:

In `lib/testpack-data.ts` add:

```typescript
import type { SpoolFabStage } from "@/lib/spool-data"

export function fabStageToStatusCode(stage: SpoolFabStage | undefined, isErected: boolean, isRft: boolean): number {
  if (isRft) return 12
  if (isErected) return 10
  if (!stage || stage === "Awaiting Material") return 4
  if (stage === "Final QC" || stage === "Painted") return 8
  return 6
}
```

Then in the iso-level view body, render the live spool list with `<StatusCodeBadge code={code} label={stage} />`. Drop the synthetic `Spool` shape usage when a live spool exists; fall back to synthetic only when zero live spools match (defensive).

- [ ] **Step 3: Edit Test Pack button at TP-level**

In the testpack-explorer where the breadcrumb / TP detail starts (search `selectedTestpack` JSX block), add next to the breadcrumb:

```tsx
{selectedTestpack ? (
  <Button
    variant="outline" size="sm"
    onClick={() => setBuilderTp(liveTp)}
    disabled={pmLocked || !liveTp}
  >
    <Pencil className="mr-1 h-3 w-3" /> Edit Test Pack
  </Button>
) : null}
```

Mount the Sheet conditionally:
```tsx
{builderTp ? <TestpackBuilderSheet open onClose={() => setBuilderTp(null)} mode={{ kind: "edit", tp: builderTp }} /> : null}
```

Add `usePmWriteLock` import + a small `<PmWriteLockBanner />` near the TP header when locked.

- [ ] **Step 4: Wire flange numeric in Release Tracking → router push (Slice 6.2)**

In `function ReleaseTracking({ testpack, onOpenWorkList })` and/or `function LiveReleaseTracking({ testpackId })`, when the user clicks the `flangeJointsToBeBolted` numeric, instead of opening the worklist dialog, push to the existing flange browse route:

```tsx
const router = useRouter()
// ...
if (item.key === "flangesToBeBolted") {
  router.push(`/flange?testpack=${testpack.id}`)
  return
}
```

(Keep the worklist dialog for the other 7 numerics — only the flange one navigates.) Verify the `/flange` route accepts `?testpack=` filter; if it currently doesn't, add a thin `searchParams.get("testpack")` filter to the existing flange browse — small dependent edit but worth it to close the linkage. If the existing route does NOT exist with that filter and modification is non-trivial, leave the existing dialog and add a "View in Flange Browser" secondary button instead.

- [ ] **Step 5: Apply scope lock to testpack filter chain**

In `filteredTestpacks` (~line 1413), add an early filter:

```tsx
const scope = useScopeLock()
// ... inside the .filter() chain:
.filter((tp) => scope.isInScope((tp as any).pdsAreaCode))
```

Same chip strategy as Phase 5: when `scope.active` show a tiny chip near the filter row indicating "Scope: BV (PDS area xxx)".

- [ ] **Step 6: Replace static spool badges with `<StatusCodeBadge />`**

Search the explorer file for places that render `statusCode` as a styled span. Replace with `<StatusCodeBadge code={spool.statusCode} label={spool.status} />`. Removes ~30 lines of ad-hoc badge styling.

- [ ] **Step 7: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -80
git add components/testpack/testpack-explorer.tsx lib/testpack-data.ts components/testpack/iso-level-view.tsx 2>/dev/null || true
git commit -m "feat(testpack): live General/Iso tabs + flange linkage + Edit action + scope lock (Slices 6.2/6.5, Phase 6 Task 4)"
```

---

## Task 5 — Pressure Test Homepage: activity feed + scope lock + filter inheritance (Slice 6.3 polish)

**Files:**
- Create: `components/testpack/testpack-activity-feed.tsx`
- Modify: `components/testpack/pressure-test-homepage.tsx`

**What this builds:** Adds a recent-actions feed to the homepage (CC-23 parity with Fab/Erection/Spooling dashboards) derived from the 4 request arrays. Applies `useScopeLock` to the KPI hooks. Adds filter chips at top that feed both KPIs and feed (CC-23 + pres #7 "Filters at top apply globally").

- [ ] **Step 1: Create `components/testpack/testpack-activity-feed.tsx`**

```tsx
"use client"

import { formatDistanceToNow } from "date-fns"
import { ClipboardCheck, ListChecks, Shield, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTestpackStore } from "@/store/testpack-store"
import { useMemo } from "react"

interface FeedEntry {
  id: string
  icon: typeof ClipboardCheck
  iconClass: string
  text: string
  at: string
}

export function TestpackActivityFeed() {
  const checkingRequests = useTestpackStore((s) => s.checkingRequests)
  const clearanceRequests = useTestpackStore((s) => s.clearanceRequests)
  const blindingRequests = useTestpackStore((s) => s.blindingRequests)
  const reinstatementRequests = useTestpackStore((s) => s.reinstatementRequests)

  const entries: FeedEntry[] = useMemo(() => {
    const a: FeedEntry[] = []
    checkingRequests.forEach((r) => a.push({
      id: r.id, icon: ClipboardCheck, iconClass: "bg-sky-100 text-sky-600",
      text: `Line check ${r.id} → ${r.assignedTo} · ${r.isoIds.length} ISO(s)`,
      at: r.createdAt,
    }))
    clearanceRequests.forEach((r) => a.push({
      id: r.id, icon: ListChecks, iconClass: "bg-amber-100 text-amber-600",
      text: `Item clearance ${r.id} → ${r.assignedTo} · ${r.punchItemIds.length} item(s)`,
      at: r.createdAt,
    }))
    blindingRequests.forEach((r) => a.push({
      id: r.id, icon: Shield, iconClass: "bg-violet-100 text-violet-600",
      text: `Blinding ${r.id} → ${r.assignedTo} · ${r.testpackIds.length} TP(s)`,
      at: r.createdAt,
    }))
    reinstatementRequests.forEach((r) => a.push({
      id: r.id, icon: RotateCcw, iconClass: "bg-emerald-100 text-emerald-600",
      text: `Reinstatement ${r.id} → ${r.assignedTo} · ${r.punchItemIds.length} joint(s)`,
      at: r.createdAt,
    }))
    return a.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()).slice(0, 12)
  }, [checkingRequests, clearanceRequests, blindingRequests, reinstatementRequests])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        <CardDescription>Live feed of dispatch actions across the test pack workflow.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No recent activity</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const Icon = e.icon
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${e.iconClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 text-sm">
                    <p className="text-slate-800">{e.text}</p>
                    <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(e.at), { addSuffix: true })}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Mount `<TestpackActivityFeed />` in the homepage**

In `components/testpack/pressure-test-homepage.tsx`, find where the activities card grid renders. Add a right sidebar column or a row below the KPI strip:

```tsx
<div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
  <div className="xl:col-span-3">
    {/* existing activity KPI grid */}
  </div>
  <div className="xl:col-span-2">
    <TestpackActivityFeed />
  </div>
</div>
```

- [ ] **Step 3: Apply scope-lock chip to the homepage**

Near the page header, show a scope chip when `useScopeLock().active === true` (purely informational — actual filtering is moot on demo data without `pdsAreaCode`). Same pattern as other modules.

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -40
git add components/testpack/testpack-activity-feed.tsx components/testpack/pressure-test-homepage.tsx
git commit -m "feat(testpack): activity feed + scope-lock chip on Pressure Test homepage (CC-23, Phase 6 Task 5)"
```

---

## Task 6 — Release worklist: real XLSX export + scope lock + PM lock (Slice 6.5 / PM B8)

**Files:**
- Modify: `components/testpack/release-work-dialog.tsx`

**What this builds:** Replaces the CSV mock-blob with real `XLSX.writeFile()` (PM B8 🧪 → ✅). Adds scope filter to rows. Disables Export when PM-locked.

- [ ] **Step 1: Verify `xlsx` is installed**

```bash
node -e "console.log(require('./package.json').dependencies.xlsx ?? 'NOT INSTALLED')"
```

If Phase 5 already added it, you'll see a version. If not:

```bash
npm install xlsx @types/xlsx
```

- [ ] **Step 2: Rewrite the export handler**

In `components/testpack/release-work-dialog.tsx`, replace the `handleExport` function:

```tsx
import * as XLSX from "xlsx"
import { useScopeLock } from "@/lib/scope-lock"
import { usePmWriteLock } from "@/lib/pm-write-lock"

// inside component:
const scope = useScopeLock()
const { isLocked: pmLocked } = usePmWriteLock()

const scopedItems = items.filter((row) => scope.isInScope((row as any).pdsAreaCode))

const handleExport = () => {
  const wb = XLSX.utils.book_new()
  const rows = [
    ["ID", "Joint", "ISO", "Spool", "Status"],
    ...scopedItems.map((r) => [r.id, r.jointNo ?? "", r.isoNo, r.spoolNo ?? "", r.status]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws, "Release Work List")
  XLSX.writeFile(wb, `release-work-${title.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  toast.success(`${scopedItems.length} row(s) exported`)
}
```

In the JSX, gate the Export button:

```tsx
<Button onClick={handleExport} disabled={pmLocked || scopedItems.length === 0}>
  <Download className="mr-2 h-4 w-4" /> Export to Excel
</Button>
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -30
git add components/testpack/release-work-dialog.tsx package.json package-lock.json 2>/dev/null
git commit -m "feat(testpack): real XLSX release-worklist export + scope + PM lock (PM B8, Phase 6 Task 6)"
```

---

## Task 7 — Client Examination panel on Operation Management tab (Slice 6.4)

**Files:**
- Create: `components/testpack/client-examination-panel.tsx`
- Modify: `components/testpack/testpack-explorer.tsx`

**What this builds:** A small editable record card on the Operation Management tab capturing "Client witness present (Y/N) · date · signer name". Honors v3 intent (CC-N5 client examination coordination) without building a full sign-off engine. Writes via `recordClientExamination` action from Task 2. PM-locked.

- [ ] **Step 1: Create `components/testpack/client-examination-panel.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTestpackStore } from "@/store/testpack-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import type { ClientWitnessRecord } from "@/lib/testpack-seed"

interface Props {
  testpackId: string
}

export function ClientExaminationPanel({ testpackId }: Props) {
  const tp = useTestpackStore((s) => s.testPacks.find((t) => t.id === testpackId))
  const recordClientExamination = useTestpackStore((s) => s.recordClientExamination)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const { isLocked: pmLocked } = usePmWriteLock()

  const existing = tp?.clientWitness
  const [present, setPresent] = useState<boolean>(existing?.present ?? false)
  const [date, setDate] = useState<string>(existing?.date ?? "")
  const [signerName, setSignerName] = useState<string>(existing?.signerName ?? "")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPresent(existing?.present ?? false)
    setDate(existing?.date ?? "")
    setSignerName(existing?.signerName ?? "")
  }, [existing?.present, existing?.date, existing?.signerName])

  if (!tp) return null

  const handleSave = async () => {
    if (pmLocked) return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 600))
    const payload: ClientWitnessRecord = {
      present,
      date: present ? date || undefined : undefined,
      signerName: present ? signerName.trim() || undefined : undefined,
      recordedBy: "PM-USER",
      recordedAt: new Date().toISOString(),
    }
    recordClientExamination(testpackId, payload)
    toast.success(`Client examination recorded for ${tp.id}`)
    pushNotification({
      severity: "info", category: "testpack",
      title: `${tp.id} client examination recorded`,
      description: present ? `Witness ${signerName} present on ${date}` : "No client witness required",
      href: `/testpack/explorer?tp=${tp.id}`,
    })
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Client examination</CardTitle>
          <CardDescription>Owner's representative witness record for this test pack.</CardDescription>
        </div>
        {existing?.recordedAt ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Recorded
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox id="cw-present" checked={present} onCheckedChange={(v) => setPresent(v === true)} disabled={pmLocked} />
          <Label htmlFor="cw-present" className="text-sm">Client witness present</Label>
        </div>
        {present ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-date" className="text-xs">Witness date</Label>
              <Input id="cw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" disabled={pmLocked} />
            </div>
            <div>
              <Label htmlFor="cw-signer" className="text-xs">Signer name</Label>
              <Input id="cw-signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="e.g. J. Smith (Client QC)" className="h-9 text-sm" disabled={pmLocked} />
            </div>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={pmLocked || busy}>
            <Save className="mr-2 h-4 w-4" /> Save record
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Mount on Operation Management tab**

In `testpack-explorer.tsx` find `function OperationsTab({ testpack })` (~line 1004). Add at the bottom of the tab body:

```tsx
<div className="mt-4">
  <ClientExaminationPanel testpackId={testpack.id} />
</div>
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -30
git add components/testpack/client-examination-panel.tsx components/testpack/testpack-explorer.tsx
git commit -m "feat(testpack): Client Examination panel on Operation Management (Slice 6.4, Phase 6 Task 7)"
```

---

## Task 8 — PM write-lock + scope-lock across all prep/progress views (Slice 6.6 + PM B11)

**Files:**
- Modify: `components/testpack/line-check/preparation-view.tsx`
- Modify: `components/testpack/line-check/progress-view.tsx`
- Modify: `components/testpack/item-clearance/preparation-view.tsx`
- Modify: `components/testpack/item-clearance/progress-view.tsx`
- Modify: `components/testpack/blinding/preparation-view.tsx`
- Modify: `components/testpack/blinding/progress-view.tsx`
- Modify: `components/testpack/testing-precomm/progress-view.tsx`
- Modify: `components/testpack/reinstatement/preparation-view.tsx`
- Modify: `components/testpack/reinstatement/progress-view.tsx`

**What this builds:** Mechanical pass to wire `<PmWriteLockBanner />` and `disabled={... || pmLocked}` on every mutation surface in the Test Pack module. Closes PM B11. Adds the scope-lock chip to each view header.

- [ ] **Step 1: For each of the 9 files above, apply the pattern**

In each file:

```tsx
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { useScopeLock } from "@/lib/scope-lock"

// inside component:
const { isLocked: pmLocked } = usePmWriteLock()
const scope = useScopeLock()

// near the top of returned JSX (after any page header):
{pmLocked ? <div className="mb-4"><PmWriteLockBanner /></div> : null}

// every Save / Assign / Generate / Confirm / Cleared button:
<Button onClick={handleSave} disabled={pmLocked || /* existing conditions */}>...</Button>
```

For scope, just add the chip to the header (no filter behavior change yet — opt-in on demo data):

```tsx
{scope.active ? <Badge variant="outline" className="text-xs">Scope: {scope.subCode}</Badge> : null}
```

- [ ] **Step 2: Smoke test in dev server**

```bash
npm run dev
# Open each of the 9 routes. Verify:
# 1. As default role (qc_engineer or similar): all Save buttons work, no banner.
# 2. Toggle to PM: localStorage.setItem("pipeqc-role", "project_manager"); reload.
#    -> banner appears, all Save buttons disabled.
```

- [ ] **Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/testpack/line-check components/testpack/item-clearance \
        components/testpack/blinding components/testpack/testing-precomm \
        components/testpack/reinstatement
git commit -m "feat(testpack): PM write-lock + scope-lock chip across all 9 prep/progress views (Slice 6.6, Phase 6 Task 8)"
```

---

## Task 9 — Generate Request PDF print pages (CC-17 parity, partial)

**Files:**
- Create: `app/testpack/print/line-check/[requestId]/page.tsx`
- Create: `app/testpack/print/item-clearance/[requestId]/page.tsx`
- Create: `app/testpack/print/blinding/[requestId]/page.tsx`
- Create: `app/testpack/print/reinstatement/[requestId]/page.tsx`
- Modify: `components/testpack/{line-check,item-clearance,blinding,reinstatement}/preparation-view.tsx`

**What this builds:** Each prep view gains a "Generate Request PDF" button that opens a print-stylesheet route in a new tab (`window.open("/testpack/print/line-check/CR-2026-001", "_blank")`). The route renders a clean white printable layout (project header, request no, request type, date, assigned team, list of items/ISOs/TPs/joints, signature block). User invokes browser print (`Cmd+P`) → save as PDF. **No jsPDF dependency this phase**; defers full PDF generation infrastructure to Phase 7 Track P while closing the parity gap.

- [ ] **Step 1: Create one of the 4 print pages (rest follow same shape)**

`app/testpack/print/line-check/[requestId]/page.tsx`:

```tsx
"use client"

import { useEffect } from "react"
import { useTestpackStore } from "@/store/testpack-store"
import { notFound } from "next/navigation"

interface Props { params: { requestId: string } }

export default function LineCheckPrintPage({ params }: Props) {
  const request = useTestpackStore((s) => s.checkingRequests.find((r) => r.id === params.requestId))
  const isos = useTestpackStore((s) => s.isos)

  useEffect(() => {
    // Auto-open print dialog after page renders
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  if (!request) return <div className="p-8 text-sm text-slate-600">Request not found.</div>

  const linkedIsos = isos.filter((iso) => request.isoIds.includes(iso.id))

  return (
    <div className="mx-auto max-w-4xl bg-white p-12 print:p-6">
      <style media="print">{`
        @page { size: A4; margin: 18mm; }
        body { background: white !important; }
        .print\\:hide { display: none; }
      `}</style>

      <header className="border-b-2 border-slate-900 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">PipeQC · Line Check Request</h1>
            <p className="text-sm text-slate-600">EPC Piping Construction Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">Request No</p>
            <p className="font-mono text-xl font-bold">{request.id}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-x-8 gap-y-2 py-4">
        <div><p className="text-xs uppercase text-slate-500">Issued at</p><p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p></div>
        <div><p className="text-xs uppercase text-slate-500">Assigned to</p><p className="text-sm">{request.assignedTo}</p></div>
        <div><p className="text-xs uppercase text-slate-500">ISO count</p><p className="text-sm">{request.isoIds.length}</p></div>
        <div><p className="text-xs uppercase text-slate-500">Request type</p><p className="text-sm">Line Check Walk-down</p></div>
      </section>

      <section className="border-y border-slate-200 py-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-700">ISOs to walk down</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1 pr-3">ISO ID</th><th className="py-1 pr-3">Test Pack</th>
              <th className="py-1 pr-3">Welds done</th><th className="py-1">Spools supported</th>
            </tr>
          </thead>
          <tbody>
            {linkedIsos.map((iso) => (
              <tr key={iso.id} className="border-b border-slate-200">
                <td className="py-1 pr-3 font-mono">{iso.id}</td>
                <td className="py-1 pr-3">{iso.testpackId}</td>
                <td className="py-1 pr-3">{iso.allWeldsWelded ? "✓" : "—"}</td>
                <td className="py-1">{iso.spoolsSupported ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pt-8 text-sm">
        <p className="mb-1">Findings to be recorded against ISO. Punch items category X must be cleared before testing.</p>
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div>
            <div className="border-b border-slate-900"></div>
            <p className="mt-1 text-xs uppercase text-slate-600">Walk-down inspector signature</p>
          </div>
          <div>
            <div className="border-b border-slate-900"></div>
            <p className="mt-1 text-xs uppercase text-slate-600">Date</p>
          </div>
        </div>
      </section>

      <div className="print:hide mt-8 text-center">
        <button onClick={() => window.print()} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
          Print this request
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Repeat the pattern for the 3 other types**

`item-clearance/[requestId]/page.tsx`: reads from `clearanceRequests`, joins with `punchItems` for the line items.
`blinding/[requestId]/page.tsx`: reads from `blindingRequests`, joins with `testPacks` for the TP list.
`reinstatement/[requestId]/page.tsx`: reads from `reinstatementRequests`, joins with `useFlangeStore.joints` for the flange joint list.

Match the header (project · request type · request no) + content table + signature block.

- [ ] **Step 3: Add the "Generate Request PDF" button to each of the 4 prep views**

In each `components/testpack/{kind}/preparation-view.tsx`, find the existing "Assign" button. After Assign succeeds you already have a `requestId` returned. Add a secondary button (or a Generate column on the request list table — whichever fits the view) that calls:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => window.open(`/testpack/print/${kind}/${requestId}`, "_blank")}
>
  <FileText className="mr-2 h-4 w-4" /> Generate Request PDF
</Button>
```

Where `kind` is `line-check`, `item-clearance`, `blinding`, or `reinstatement` matching the route.

- [ ] **Step 4: TypeScript check + smoke test + commit**

```bash
npx tsc --noEmit 2>&1 | head -40
npm run dev
# Manual test: assign a line check → click Generate Request PDF → tab opens → print dialog auto-fires → cancel → verify rendering.
git add app/testpack/print components/testpack/line-check/preparation-view.tsx \
        components/testpack/item-clearance/preparation-view.tsx \
        components/testpack/blinding/preparation-view.tsx \
        components/testpack/reinstatement/preparation-view.tsx
git commit -m "feat(testpack): Generate Request PDF print pages for 4 prep views (CC-17 parity, Phase 6 Task 9)"
```

---

## Task 10 — Final integration: end-to-end Test Pack demo flow

**Files:**
- Verify only — no code changes unless something fails
- Optional: append to `docs/PIPEQC_CONTEXT.md`

**What this checks:** End-to-end demo flow proving Phase 6 closure.

- [ ] **Step 1: Build + dev server smoke test**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30
```

Expected: no type errors, build succeeds.

- [ ] **Step 2: Manual demo flow checklist**

Start `npm run dev` and walk through:

1. `/testpack` → 3-card index visible (Builder · Explorer · Pressure Test).
2. `/testpack/builder` → see existing TP list with rev / medium / planned date columns; see unassigned ISOs list.
3. Click "New Test Pack" → Sheet opens. Fill in General + Location, move 2 ISOs into the basket, click Create → toast + notification + redirect to `/testpack/explorer?tp=TP-XXX`.
4. In Explorer drill: System → Subsystem → newly-created TP → see live General tab values (rev, medium, planned date from form).
5. Click "Edit Test Pack" → Sheet re-opens prefilled → change medium to "Pneumatic" → Save → toast → General tab updates without page reload.
6. Open the TP's Release Tracking tab → click `flangeJointsToBeBolted` numeric → navigates to `/flange?testpack=${tpId}` (Slice 6.2 verified). Use back to return.
7. Operation Management tab → Client Examination panel visible → check "Client witness present" → fill date + signer → Save → toast + chip "Recorded" appears + notification appears in `/`.
8. `/testpack/pressure-test` → see KPI tiles + activity feed showing recent assigns (line check / item clearance / blinding / reinstatement).
9. `/testpack/pressure-test/line-check/preparation` → assign 1 ISO to LC-01 → click "Generate Request PDF" → new tab opens → print dialog auto-fires → cancel.
10. Drill into one of the Release Tracking dialogs (any non-flange numeric) → click Export to Excel → `release-work-*.xlsx` downloads (not CSV).
11. Switch role to PM: `localStorage.setItem("pipeqc-role", "project_manager"); location.reload()` → re-open the Builder Sheet → all Save/Assign buttons disabled + banner visible. Same on every prep/progress view + Client Examination + Edit Test Pack + Release Worklist Export.
12. Switch role to Subcontractor: `localStorage.setItem("pipeqc-role", "subcontractor"); localStorage.setItem("pipeqc-active-sub", "BV"); location.reload()` → scope chip appears on Pressure Test homepage + Builder + Explorer. No data filtering visible (until `pdsAreaCode` lands in Phase 7).
13. Open `/testpack/explorer` and click a TP → Spool status iso tab → spool rows use `<StatusCodeBadge />` (code + tooltip + RAG color).
14. Reset demo: `useDemoStore.getState().resetAll()` → testpack store rehydrates with extended seed shape.

- [ ] **Step 3: Update merge log**

Append to `docs/PIPEQC_CONTEXT.md` under merge log:

```markdown
- 2026-XX-XX: Phase 6 complete — Test Pack module fully built out.
  - PM matrix B6 polish (activity feed + filter inheritance), B7 (live General/Iso tabs), B8 ✅ real XLSX export, B11 ✅ PM write-lock.
  - Sub matrix scope-lock chip applied across testpack views (data filtering active once pdsAreaCode lands in Phase 7).
  - Slice 6.1 Testpack Builder ✅ — Sheet form + two-column ISO picker + `/testpack/builder` route.
  - Slice 6.2 Flange Torquing → RFT linkage ✅ via Release Tracking router push to `/flange?testpack=`.
  - Slice 6.3 Pressure Test homepage polish ✅ — activity feed + scope chip (CC-23).
  - Slice 6.4 Client Examination ✅ — record card on Operation Management tab (scoped intent; full owner workflow deferred).
  - Slice 6.5 Release Tracking depth ✅ — live Iso/Spool tabs + StatusCodeBadge (CC-19).
  - Slice 6.6 PM write-lock + scope-lock applied across all 9 prep/progress views.
  - Bonus: CC-17 Generate Request PDF print pages for 4 dispatch types (browser-print, no PDF library).
  - Deferred to Phase 7: Dossier Handover PDF (Track P), real jsPDF infra, punch-code referential into Admin, full Owner's Rep sign-off workflow.
```

- [ ] **Step 4: Commit closure**

```bash
git add docs/PIPEQC_CONTEXT.md
git commit -m "docs(testpack): Phase 6 closure — Test Pack module complete (PM B6/B7/B8/B11 + Slices 6.1–6.6)"
```

---

## Self-review

**Spec coverage check:**

| Roadmap_v3 slice | Covered in task | Real gap closed |
|---|---|---|
| 6.1 Testpack Builder | Task 2 (schema + store) + Task 3 (Sheet + page) | First time PipeQC can build a TP manually outside seed |
| 6.2 Flange Torquing → RFT linkage | Task 4 Step 4 (router push from Release Tracking) | Closes structural broken link |
| 6.3 Pressure Test nav polish | Task 5 (activity feed + filter chips); slice intent partially met (full breadcrumb deferred — see Open Questions) | CC-23 parity with Fab/Erection |
| 6.4 Client examination | Task 7 (panel scoped to "record presence", not full sign-off) | Honors intent without overbuild |
| 6.5 Release Tracking drill-down extension | Task 4 (live General/Iso) + Task 1 (StatusCodeBadge) + Task 6 (real XLSX) | Closes PM B7 deeper + PM B8 |
| 6.6 PM write-lock + scope lock | Task 8 (mechanical pass over 9 views) + Tasks 4, 5, 6, 7 also wired locally | Closes PM B11 across module |
| **CC-17 Generate Request PDF** (gap from #7 v3 didn't bundle) | Task 9 (4 print routes via browser-print) | Parity with EP physical-world bridge |
| **CC-19 numeric status code triple** (gap from #7 v3 didn't bundle) | Task 1 (shared `<StatusCodeBadge />`) | Reusable badge replaces ad-hoc styling |
| **CC-23 live activity feed** (gap from #7 v3 didn't bundle) | Task 5 (`<TestpackActivityFeed />`) | Consistency with other module dashboards |
| **TP General-tab live fields** (gap from #7 v3 didn't name) | Task 2 (schema extension) + Task 4 Step 1 (explorer read) | First time General is real-data driven |
| **Iso-level Spool status tab live** (gap from #7 v3 didn't name) | Task 4 Step 2 | Removes 2-hardcoded-spools synthetic shim |

**Adjustments from roadmap_v3 based on research + code audit:**

- **Slice 6.1** roadmap left "Testpack Builder" intentionally vague (_"manual ISO selection"_). Task 3's Builder is full: New + Edit + ISO basket + General/Location form. Decision: build the complete CRUD path so the demo has a clean before/after story.
- **Slice 6.2** roadmap claimed "Flange Torquing → RFT linkage" — the RFT engine already includes flange Cat-X correctly (per `lib/testpack-release-tracking.ts:83-87`). The actual missing piece was a **router link** from the Explorer numeric to the flange progress screen. Slice resolves to ~10 lines, not a domain logic change.
- **Slice 6.3** roadmap claimed "nested navigation polish (breadcrumbs + state machine refinement)" — but the existing structure works. Decision: the high-leverage polish is the activity feed (CC-23 parity) + filter inheritance, not breadcrumbs. Pressure Test breadcrumbs deferred to Phase 7 if user feedback flags them.
- **Slice 6.4** roadmap claimed "client examination coordination — owner's rep sign-off на N2 results". Pres #7 + role matrix don't define an Owner's Rep role with sign-off authority on NDE. Decision: scope down to a **record card** (witness Y/N + date + signer). Real sign-off workflow → Phase 7 with proper role design.
- **Slice 6.5** roadmap pointed at "Release Tracking drill-downs upgrade — extend gates 1-3 stubs to real". Audit shows all 8 numerics already compute real values via `computeReleaseTrackingMetrics`; the stubs are in the synthetic `Testpack` fallback (`testpack-data.ts:197-206`) used only when no live TP exists. Real upgrade is **the General/Iso-level tabs** which were entirely synthetic — Task 4 fixes that.
- **Slice 6.6** roadmap claimed "Apply PM write-lock + scope lock to Test Pack screens (reuse)". Mechanical pass in Task 8; scope-lock is opt-in no-op until `pdsAreaCode` lands.
- **Bonus CC-17 Generate Request PDF** (Task 9) was **not in roadmap_v3 Phase 6 explicitly** but is required for parity with EP's documented workflow. Implemented via browser-print (no jsPDF dependency) — closes the parity gap cheaply, defers full PDF infra to Phase 7.
- **Bonus CC-23 activity feed** (Task 5) not explicitly in v3 but consistency with Fab/Erection/Spooling dashboards make it free.
- **Decision: Punch-code referential stays in `lib/testpack-seed.ts`.** Moving it to Admin module would touch the line-check progress view + the admin store + matrix. Phase 7 polish — noted in PIPEQC_CONTEXT.

**Deferred (per roadmap_v3 Phase 6 explicit defers + audit findings):**

- **Dossier Handover PDF (PM B10)** — explicit Phase 7 (Track P) per roadmap_v3 line 388. Requires jsPDF infrastructure not built here.
- **Real jsPDF PDF generation (Track P infrastructure)** — Phase 7. Task 9 uses browser-print as parity bridge.
- **Punch-code referential migration to Admin** — Phase 7 admin polish, not currently blocking demo.
- **Full Owner's Representative role + NDE sign-off workflow** — needs role design beyond v3 scope. Phase 7 + dependency on Track J role expansion.
- **Pressure Test nested-nav breadcrumb refinement (full slice 6.3 intent)** — Phase 7 if user flags; activity feed bundles the visible polish.
- **`pdsAreaCode` populated on `TestPackRecord`** — Phase 7 / Admin spool data extension. Scope-lock chips visible but no-op until then.
- **System / Subsystem CRUD** — referenced as a future H1 extension (manual system/sub-system mapping); Admin module is responsible, not Testpack.

**Placeholder scan:** No TBD / TODO / "implement later" phrases inside code. Print pages have `print:hide` button class so the user can re-trigger the dialog (intentional UX, not a placeholder). Client Examination saves all fields when "Witness present = false" by clearing optional fields (intentional, not a placeholder).

**Type consistency check:** `TestPackRecord`, `TestMedium`, `ClientWitnessRecord`, `StatusTone`, `STATUS_CODE_TOOLTIPS`, `STATUS_CODE_TONES`, `StatusCodeBadge`, `fabStageToStatusCode`, `TestpackBuilderSheet`, `TestpackBuilderIsoPicker`, `TestpackActivityFeed`, `ClientExaminationPanel`, store actions (`createTestpack`, `updateTestpackGeneral`, `assignIsoToTestpack`, `removeIsoFromTestpack`, `recordClientExamination`, `getNextTpId`) — defined once in `lib/testpack-seed.ts` / `lib/testpack-data.ts` / `store/testpack-store.ts` and imported by exact name.

**Cross-cutting nits status after Phase 6:**

| Nit | Status after Phase 6 |
|---|---|
| Subcontractor scope lock (CC-4) | ✅ Chip applied on 11 testpack surfaces; data filter no-op until `pdsAreaCode` lands (Phase 7) |
| PM write-lock (CC-J6) | ✅ Banner + gating on Builder Save, Edit, Client Examination, all 9 prep/progress Saves, Release Worklist Export |
| Notification system | ✅ New `testpack` category — Builder save, Client Examination, request creates push notifications |
| Generate Request PDF (CC-17) | ✅ Browser-print pages for 4 dispatch types; full PDF infra → Phase 7 |
| Numeric status code triple (CC-19) | ✅ Shared `<StatusCodeBadge />` reusable across module |
| Live activity feed (CC-23) | ✅ Reused pattern; testpack joins Fab/Erection/Spooling dashboards |
| RFT engine (CC-18) | Unchanged — already correct; new General-tab fields integrate cleanly |
| Punch X/Y/Z sequencer (CC-20) | Unchanged — already correct |
| Cross-module write to Spool aggregate (CC-29) | Reinforced — Builder writes both `TestPackRecord.isoIds` and `ISORecord.testpackId` atomically |

---

## Open questions for the next session

- **Should Slice 6.3 also include the Pressure Test breadcrumb component now or defer?** Task 5 ships the activity feed (CC-23 parity); breadcrumb is left as-is. If demo feedback flags nav confusion, add a `<PressureTestBreadcrumb section={"line-check"} step={"preparation"} />` in Phase 7.
- **`fabStageToStatusCode` mapping is a heuristic.** Pres #7 #1512 only shows `12 = Ready For Test` — codes 4/8/14/16/etc are inferred. If we later get the Easy Piping full state-machine doc, revisit the mapping. Decision: ship the inferred set in `STATUS_CODE_TOOLTIPS` as documented choices, not as silently-guessed values.
- **Builder Sheet ISO picker filters by `?` — should it scope to a system when one is selected?** Currently shows all available ISOs across systems. If projects with thousands of ISOs make the basket noisy, add a system filter to the left column (5 minute change). For demo data it's fine.
- **`recordClientExamination` writes once and is editable on every Save.** Should it instead append to a history array? Decision: single-record matches "Cat-Y/Z Reinstatement entry" model (one current record per joint). Append-only audit log → Phase 7 if compliance audit requires it.
- **Print pages use `useTestpackStore` at runtime — they won't show data if the route is opened in a fresh tab without persisted state.** Acceptable for demo (cookie + localStorage persist). If we ever need shareable URLs, server-render with searchParams payload.
- **`pdsAreaCode` on `TestPackRecord` — synthesize from subsystem now, or wait for Admin?** Task 2 leaves it undefined in seed. We could derive `pdsAreaCode = subsystem.split("-")[0]` so scope-lock has something to test on. Deferred to keep Phase 6 scope tight; same trade-off Phase 5 made for spools.
- **XLSX bundle weight** — Phase 5 added `xlsx` (~400KB). Phase 6 imports it in `release-work-dialog.tsx`. If bundle-size pass becomes a concern in Phase 7, lazy-load via dynamic `await import("xlsx")` inside `handleExport`.
- **Should the Builder show RFT status preview before save?** Currently doesn't — user adds ISOs and saves. Showing an inline "If saved, this TP would have RFT = false because ... " preview would be a nice polish for Phase 7 (the engine is already there in `computeReleaseTrackingMetrics`).
