# Phase 4 — Erection (Field) Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Erection gaps from roadmap_v3 Phase 4 slices 4.1–4.6. Erection module is **already substantial** (I1–I10 merged: full lifecycle Not Started → To Site → Field Material Check → Erected → Welded/Bolted → Supported → RFT; field weld pipeline live; field material check live; Send to NDE live; flange progress + gates live). Per roadmap_v3: *"Это и есть phase — almost вся работа = reuse"*. So Phase 4 is mostly **wiring the Phase 2 + Phase 3 cross-cutting nits into Erection** plus filling the **one structural gap** that does not yet exist (Field QC Release sign-off, qc.B10).

**Critical context discovered during code audit:**

- **Heat number HARD BLOCK (slice 4.2)** is **already live** in [field-material-check-detail-panel.tsx:110](components/erection/field-material-check-detail-panel.tsx#L110) via `useHeatNumberValidator()` — wired during Phase 2 Task 1 Step 3. **No work needed** beyond verification.
- **Welder qualification soft alert (slice 4.1)** is **already live in the panel** at [field-weld-detail-panel.tsx:160](components/erection/field-weld-detail-panel.tsx#L160) via `validateWelder()`. The **gap** is the same table-row chip parity that Phase 2 Task 2 added to `weld-table.tsx` — [field-weld-table.tsx](components/erection/field-weld-table.tsx) does not yet surface the chip.
- **PWHT release for field welds (slice 4.4)** — the queue at [/fabrication/pwht-release](app/fabrication/pwht-release/page.tsx) only reads `useWeldsStore` (shop welds). Field welds in `erection-store` with `pwhtRequired: true` (e.g. fj-2004, fj-2007, fj-2014 per [erection-weld-data.ts](lib/erection-weld-data.ts)) are **invisible to the PWHT release queue**. This is the real PWHT gap.
- **NDE rework cascade for field welds (slice 4.3)** depends on Phase 3 having shipped `source: 'shop' | 'field'` handling for cascade. **Per roadmap_v3 line 36:** *"NDE — один модуль … `source: 'shop' \| 'field'` уже введено в G6 / E2.4"*. Phase 4 work is to **verify** the field cascade end-to-end (R1 joint creation, tracer flip, penalty shoot trigger) and add a small smoke-test trail; if Phase 3 ships before this plan starts, just verify.
- **PM write-lock + scope lock (slice 4.6)** — both hooks exist (`lib/pm-write-lock.ts`, `lib/scope-lock.ts`) from Phase 2 Tasks 5 + 6 but are **not wired into any Erection panel**: `to-site`, `erected`, `welded-bolted`, `supported`, `field-weld`, `field-material-check`, `flange-progress` all save unconditionally and never render the `<PmWriteLockBanner />`. Direct reuse opportunity.
- **Field QC Release (slice 4.5, qc.B10)** is the **one structural gap that doesn't already exist**. Per [docs/role_matrix/qc_engineer.md:162](docs/role_matrix/qc_engineer.md#L162): *"Сейчас RFT screen derived field — auto fires когда Supported. Нет explicit 4-item field QC checklist."* We add a sibling of `/fabrication/qc-release` at `/erection/field-qc-release` — same 4-item checklist (visual / dimensional / NDE complete / heat traceability) but operating on spools that have reached Supported but not yet RFT, scoped to field welds.
- **QC13 PDF parity** (Phase 2 Task 7 demo polish) — the Qc13PdfButton is wired into [weld-detail-panel.tsx](components/weld-detail-panel.tsx) but not into [field-weld-detail-panel.tsx](components/erection/field-weld-detail-panel.tsx). One import + one render.
- **W24 PDF generation** (CC-12 per [Erection_presentation_research.md:229](docs/research/Erection_presentation_research.md#L229)) — the QC W24 form is *"the canonical paper-form pivot point between desktop and field"*. Three Erection panels (`to-site-detail-panel.tsx:210`, `erected-detail-panel.tsx:306`, `welded-bolted-detail-panel.tsx:418`) have `w24FormNo` as a plain text field. A printable W24 stub PDF analogous to QC13 is a high-perceived-fidelity demo moment with low engineering cost; we add it as Task 7 (parallel to Phase 2 Task 7's QC13). Per role_matrix this is an optional demo polish, not a hard slice.

**Architecture:** Reuse — no new stores beyond `field-qc-release-store.ts` (parallel to `qc-release-store.ts`). New components live under `components/erection/`. New route `/erection/field-qc-release`. The PWHT release queue is **extended** to read both shop welds and field welds; the file stays in `components/fabrication/` for now (single source of truth) but the data shape unifies.

**Tech Stack:** Next.js 15 App Router · TypeScript strict · Zustand 5 + persist · Tailwind CSS · shadcn/ui (new-york) · lucide-react · sonner (toasts) · jsPDF (already in deps from Phase 2 Task 7).

> **Read before writing code:**
> - `docs/PIPEQC_CONTEXT.md` — full stack, store patterns
> - `docs/roadmap_v3.md` Phase 4 section (4.1–4.6 + Closure criteria)
> - `docs/role_matrix/qc_engineer.md` B10 / B13 / B14 sections (field side)
> - `docs/role_matrix/project_manager.md` watcher access details (relevant for PM write-lock targeting)
> - `docs/research/Erection_presentation_research.md` §A Spool Erection sub-module, §B Welding sub-module, §B-bis Material traceability, §C QC W24 form, §E Flange management
> - `docs/research/presentation_findings_append_09.md` CC-26 (Assembly = Erection at different stage), two-level state model
> - `docs/research/presentation_findings.md` CC-18 (RFT gate composition), §6 Erection summary
> - `lib/heat-validator.ts` — Phase 2 Task 1 validator (already used in field-material-check-detail-panel)
> - `lib/welder-qualifications.ts` — `validateWelder()` (already used in field-weld-detail-panel)
> - `lib/pm-write-lock.ts` — Phase 2 Task 5 hook + `components/pm-write-lock-banner.tsx`
> - `lib/scope-lock.ts` — Phase 2 Task 6 hook
> - `lib/spool-data.ts` — `QC_CHECKLIST`, `QCChecklistKey`, `QCChecklistStatus` (Phase 2 Task 4 added Fail)
> - `store/qc-release-store.ts` — pattern to copy verbatim for field-qc-release-store
> - `store/pwht-store.ts` — Phase 2 Task 3 store (extend to support field-weld release records)
> - `store/erection-store.ts` — field welds source of truth
> - `lib/erection-weld-data.ts` — `FieldWeldJoint` (extends `WeldJoint`, has `pwhtRequired`, `pwhtDate`)
> - `lib/erection-stage.ts` — `SpoolErectionStage`, `isSpoolRFTEligible`, two-level state machine
> - `components/erection/erected-detail-panel.tsx` etc. — pattern for write-lock injection
> - `components/erection/field-weld-table.tsx` — table to extend with welder qualification chip
> - `components/fabrication/qc-release-detail-panel.tsx` — pattern for field-qc-release-detail-panel
> - `components/fabrication/pwht-release-view.tsx` — to extend with field welds
> - `components/fabrication/qc13-pdf-button.tsx` — pattern for W24 PDF button
> - `store/notifications-store.ts` — `pushNotification({severity, category, title, description, href})` shape

---

## Design conventions (critical — match existing screens)

| Pattern | Where to copy from |
|---|---|
| Detail Sheet | `components/erection/erected-detail-panel.tsx`, `components/fabrication/qc-release-detail-panel.tsx` |
| KPI strip + filter chips | `components/fabrication/pwht-release-view.tsx`, `components/erection/rft-view.tsx` |
| Mutation delay | `await new Promise(r => setTimeout(r, 700))` before store update |
| Toast on mutation | `import { toast } from "sonner"; toast.success("...")` |
| Notification feed | `useNotificationsStore.getState().pushNotification({...})` — uses `category`/`description` (not `message`) |
| Welder qual chip on row | `components/weld-table.tsx` (Phase 2 Task 2 pattern — amber chip + `AlertTriangle` icon) |
| PM write-lock banner | `<PmWriteLockBanner />` near SheetHeader; `disabled={... || pmLocked}` on Save / Sign-off buttons |
| Scope lock filter | `const scope = useScopeLock(); if (!scope.isInScope(record.pdsAreaCode)) return false` inside row filter chain (opt-in — passes through when row has no `pdsAreaCode`) |
| Colors | sky=info, amber=pending, emerald=done/released, red=blocked/rejected, violet=in-review, slate=read-only |
| All components | `"use client"` — no server components |

---

## File structure

### New files
- **Create:** `store/field-qc-release-store.ts` — sibling of `store/qc-release-store.ts` for field-side QC release records
- **Create:** `components/erection/field-qc-release-view.tsx` + `field-qc-release-detail-panel.tsx`
- **Create:** `app/erection/field-qc-release/page.tsx`
- **Create:** `components/erection/w24-pdf-button.tsx` — printable W24 Welding Daily Progress Report stub (parity with `qc13-pdf-button.tsx`)

### Modified files
- **Modify:** `components/erection/field-weld-table.tsx` — surface welder qualification mismatch chip on table rows (Phase 2.1 parity)
- **Modify:** `components/erection/field-weld-detail-panel.tsx` — mount `<Qc13PdfButton />` when status=Completed; add `<PmWriteLockBanner />` + button gating
- **Modify:** `components/erection/field-material-check-detail-panel.tsx` — add `<PmWriteLockBanner />` + gating (heat validator already wired in Phase 2)
- **Modify:** `components/erection/to-site-detail-panel.tsx` — add write-lock banner + gating + mount `<W24PdfButton />`
- **Modify:** `components/erection/erected-detail-panel.tsx` — add write-lock banner + gating + mount `<W24PdfButton />`
- **Modify:** `components/erection/welded-bolted-detail-panel.tsx` — add write-lock banner + gating + mount `<W24PdfButton />`
- **Modify:** `components/erection/supported-detail-panel.tsx` — add write-lock banner + gating
- **Modify:** `components/erection/flange-progress-detail-panel.tsx` — add write-lock banner + gating
- **Modify:** `components/fabrication/pwht-release-view.tsx` — unify shop + field welds; show `source` column; route detail panel to correct weld store on release
- **Modify:** `components/fabrication/pwht-release-detail-panel.tsx` — accept a `source: 'shop' | 'field'` discriminant; update correct store (`useWeldsStore` or `useErectionStore`) when releasing
- **Modify:** `store/pwht-store.ts` — extend `PwhtReleaseRecord` with `source: 'shop' | 'field'`
- **Modify:** `lib/erection-stage.ts` + `store/erection-rollup.ts` — RFT eligibility gate now also requires field QC release sign-off (gate insertion point — see Task 5 Step 2)
- **Modify:** `config/navigation.ts` — add `/erection/field-qc-release` sidebar entry
- **Modify:** `store/demo-store.ts` — wire `useFieldQCReleaseStore.getState().resetField()` cascade
- **Modify:** `components/erection/field-weld-table.tsx`, `components/erection/field-material-check-view.tsx`, `components/erection/field-qc-release-view.tsx`, `components/erection/flange-progress-view.tsx` — opt-in scope-lock filter

---

## Task 1 — Welder Qualification chip on Field Weld Progress table (Slice 4.1 parity)

**Files:**
- Modify: `components/erection/field-weld-table.tsx`

**What this builds:** Phase 2 Task 2 added an amber `WPS ⚠` chip to the shop weld table for rows whose welder/WPS pair fails `validateWelder()`. Field welds use the same validator (already wired in `field-weld-detail-panel.tsx:160`) but the field weld table never renders the chip. This is direct parity — copy the shop-side pattern verbatim.

- [ ] **Step 1: Inspect the current row rendering**

```bash
grep -n "welderCode\|wpsNo\|TableRow\|<tr" components/erection/field-weld-table.tsx | head -30
```

- [ ] **Step 2: Add imports near the top of the file**

```typescript
import { AlertTriangle } from "lucide-react"
import { validateWelder } from "@/lib/welder-qualifications"
import { useActiveWelderQualifications } from "@/store/admin-store"
```

(`AlertTriangle` may already be present; add only the missing imports.)

- [ ] **Step 3: Read the active welders inside the component**

Inside `FieldWeldTable`, after the existing `useState` hooks, add:
```typescript
const activeWelders = useActiveWelderQualifications()
```

- [ ] **Step 4: Render the qualification chip beside the welder code on each row**

Find the cell that renders `joint.welderCode` (likely a `<TableCell>` near the welder column). Append the chip inline:

```tsx
{(() => {
  const v = validateWelder(
    joint.welderCode,
    joint.wpsNo,
    joint.materialType,
    joint.diaInch,
    activeWelders,
  )
  if (!v.isValid && joint.welderCode) {
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

The `validateWelder` signature is identical between shop and field; for incomplete forms it returns `{ isValid: true }` (see [lib/welder-qualifications.ts](lib/welder-qualifications.ts)).

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/vvnezapnopwnz/Documents/Docs/EasyPlant/pipe-qc-shell-layout
npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/erection/field-weld-table.tsx
git commit -m "feat(erection): surface welder qualification mismatch chip on field weld table (Phase 4.1 parity)"
```

---

## Task 2 — Heat Number HARD BLOCK on Field Material Check (Slice 4.2 verification only)

**Files:**
- Verify only: `components/erection/field-material-check-detail-panel.tsx`

**What this verifies:** Phase 2 Task 1 Step 3 explicitly applied `useHeatNumberValidator()` to the field material check panel. The validator is at line 110, the validation map at lines 112–122, and `blockedCount` is in the validation chain at line 216. **No work needed** if these lines exist as documented.

- [ ] **Step 1: Confirm validator is wired**

```bash
grep -n "useHeatNumberValidator\|heatValidations\|blockedCount" components/erection/field-material-check-detail-panel.tsx
```

Expected output: at least 4 lines (import + hook call + validation map + blocked usage in `validation` memo). If any of these are missing — restore them following Phase 2 Task 1 Step 3 instructions in [docs/superpowers/plans/2026-05-22-phase2-fabrication.md](docs/superpowers/plans/2026-05-22-phase2-fabrication.md).

- [ ] **Step 2: Manual smoke check**

Start dev server, open `/erection/material-check`, click a spool with at least one Pending piece, type a heat number not in the active PML (e.g. `HT-INVALID-9999`) → confirm red border + inline error appears + Sign-off disabled. Type a valid heat number from the datalist → red goes away + Sign-off enabled.

If verification passes: no commit. If a regression is found and fixed in this task: commit with message `fix(erection): restore heat number HARD BLOCK on field material check (Phase 4.2 verify)`.

---

## Task 3 — Extend PWHT Release queue to include field welds (Slice 4.4)

**Files:**
- Modify: `store/pwht-store.ts`
- Modify: `components/fabrication/pwht-release-view.tsx`
- Modify: `components/fabrication/pwht-release-detail-panel.tsx`

**What this builds:** The PWHT Release queue at [/fabrication/pwht-release](app/fabrication/pwht-release/page.tsx) was built in Phase 2 Task 3 reading only `useWeldsStore` (shop welds). Field welds with `pwhtRequired: true` (3 in seed: fj-2004, fj-2007, fj-2014; the second and third already have `pwhtDate` populated) never appear. Phase 4 unifies the view: shop **and** field welds with `pwhtRequired === true && !pwhtDate` show in one queue, with a Source column distinguishing the two. The detail panel writes back to the correct store.

- [ ] **Step 1: Extend `PwhtReleaseRecord` with `source`**

Open [store/pwht-store.ts](store/pwht-store.ts). Add `source` to the interface:

```typescript
export interface PwhtReleaseRecord {
  weldId: string         // matches WeldJoint.id (shop) or FieldWeldJoint.id (field)
  spoolNo: string
  source: "shop" | "field"   // <— NEW
  pwhtDate: string
  labRef: string
  releasedBy: string
  releasedAt: string
}
```

Update the `releasePwht` action signature to require `source` (just include it in the existing `Omit<…, "releasedAt">` — TypeScript will enforce). Bump persist version:

```typescript
{ name: "pipeqc-pwht-v1", version: 2,
  migrate: (persisted: any, version: number) => {
    if (version < 2 && persisted?.releases) {
      persisted.releases = persisted.releases.map((r: any) => ({
        ...r,
        source: r.source ?? "shop",
      }))
    }
    return persisted
  },
}
```

- [ ] **Step 2: Unify shop + field welds in `pwht-release-view.tsx`**

Open [components/fabrication/pwht-release-view.tsx](components/fabrication/pwht-release-view.tsx). Add the erection store import:

```typescript
import { useErectionStore } from "@/store/erection-store"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"
import type { WeldJoint } from "@/lib/weld-data"
```

Introduce a unified row type at the top of the component body, just below the existing imports:

```typescript
type PwhtRow = (WeldJoint | FieldWeldJoint) & { source: "shop" | "field" }
```

Replace the `useWeldsStore` line — keep it and add an erection store call:

```typescript
const shopWelds = useWeldsStore((s) => s.welds)
const fieldWelds = useErectionStore((s) => s.fieldWelds)
```

Build the unified PWHT-required list:

```typescript
const unified = useMemo<PwhtRow[]>(
  () => [
    ...shopWelds.filter((w) => w.pwhtRequired).map((w) => ({ ...w, source: "shop" as const })),
    ...fieldWelds.filter((w) => w.pwhtRequired).map((w) => ({ ...w, source: "field" as const })),
  ],
  [shopWelds, fieldWelds],
)
```

Replace every reference to `welds.filter((w) => w.pwhtRequired)` with `unified`. Update the `rows` and `counts` useMemos to iterate `unified`. The release map check keys on `w.id` — collision-safe because shop weld ids (`w-…`) and field weld ids (`fj-…`) are disjoint.

Add a "Source" column to the table header and body:

```tsx
<TableHead>Source</TableHead>
```

```tsx
<TableCell>
  <Badge className={w.source === "field" ? "bg-violet-100 text-violet-800 text-xs" : "bg-sky-100 text-sky-800 text-xs"}>
    {w.source === "field" ? "Field" : "Shop"}
  </Badge>
</TableCell>
```

Place the column between "Spool No" and "Material / Dia" so it's prominent.

Update the `selected` state and `setSelected` calls to pass the `source` along — since `PwhtRow` already carries `source`, no extra plumbing needed; just type the selected state as `PwhtRow | null`.

- [ ] **Step 3: Update `pwht-release-detail-panel.tsx` to write to the correct store**

Open [components/fabrication/pwht-release-detail-panel.tsx](components/fabrication/pwht-release-detail-panel.tsx). Replace the `Props` interface to accept the new union shape:

```typescript
import type { WeldJoint } from "@/lib/weld-data"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"

interface Props {
  weld: ((WeldJoint | FieldWeldJoint) & { source?: "shop" | "field" }) | null
  open: boolean
  onClose: () => void
}
```

Add the erection store import alongside `useWeldsStore`:

```typescript
import { useErectionStore } from "@/store/erection-store"
```

Inside the component, branch the update call based on `weld.source`:

```typescript
const updateShopWeld = useWeldsStore((s) => s.updateWeld)
const updateFieldWeld = useErectionStore((s) => s.updateFieldWeld)

async function handleRelease() {
  if (!canSubmit || !weld) return
  setSaving(true)
  await new Promise((r) => setTimeout(r, 700))
  const source = weld.source ?? "shop"
  releasePwht({
    weldId: weld.id,
    spoolNo: weld.spoolNo,
    source,
    pwhtDate,
    labRef,
    releasedBy,
  })
  if (source === "field") {
    updateFieldWeld(weld.id, { pwhtDate })
  } else {
    updateShopWeld(weld.id, { pwhtDate })
  }
  pushNotification({
    severity: "success",
    category: "weld_progress",
    title: `${(weld as WeldJoint).jointNo}: PWHT released`,
    description: `${source === "field" ? "Field weld" : "Shop weld"} · lab ref ${labRef} · released by ${releasedBy}`,
    href: "/fabrication/pwht-release",
  })
  toast.success(`PWHT released for ${(weld as WeldJoint).jointNo}`)
  setSaving(false)
  onClose()
}
```

Add a small Source chip in the SheetHeader area so the QC engineer sees field vs shop while filling the form:

```tsx
<Badge className={(weld.source ?? "shop") === "field" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"}>
  {(weld.source ?? "shop") === "field" ? "Field weld" : "Shop weld"}
</Badge>
```

- [ ] **Step 4: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add store/pwht-store.ts components/fabrication/pwht-release-view.tsx components/fabrication/pwht-release-detail-panel.tsx
git commit -m "feat(erection): PWHT release queue unifies shop + field welds with Source column (Phase 4.4)"
```

---

## Task 4 — Verify NDE rework cascade for field welds (Slice 4.3)

**Files:**
- Verify only: NDE batch + welds-store flow
- Documentation: append a verification note to `docs/PIPEQC_CONTEXT.md`

**What this verifies:** Phase 3 builds the NDE rework cascade (slice 3.2), tracer logic (3.3), and penalty shoot trigger (3.4). The store already discriminates batches by `source: 'shop' | 'field'` (introduced in G6 / E2.4). Phase 4 needs to confirm that:

1. A rejected **field** weld auto-creates a `-R1` joint in NDE100, same as shop.
2. Tracer flips for field batches use the same store path.
3. Penalty shoot trigger fires identically.

This task is **purely verification + smoke-test**. If Phase 3 has not yet shipped at the time this plan runs, mark the task `[ ] BLOCKED: Phase 3 not yet merged — return to this task after Phase 3 close` and move on to Task 5. The actual rework cascade code lives in `store/batches-store.ts` / `store/welds-store.ts` / `store/erection-store.ts` — Phase 3's responsibility.

- [ ] **Step 1: Confirm Phase 3 cascade actions exist**

```bash
grep -n "createReworkJoint\|cascadeRework\|R1\|tracerFlip\|penaltyShoot" store/batches-store.ts store/welds-store.ts store/erection-store.ts 2>&1 | head -20
```

If output is empty or sparse → Phase 3 not shipped yet → mark task BLOCKED and skip.

- [ ] **Step 2: Manual smoke test (field cascade)**

1. Open `/erection/weld-progress`, click on a field weld with status=Completed.
2. Click "Send to Site NDE" → batch created with `source: 'field'`.
3. Open `/nde`, find the batch, open the per-weld Accept/Reject dialog.
4. Reject the weld with a defect code (POR / CRK / LOF / SLG).
5. Confirm:
   - A new field-weld joint with `-R1` suffix appears in `useErectionStore` (visible at `/erection/weld-progress` filter by R1).
   - The remaining welds in the batch become Tracer (T1).
   - If 4 rejections accumulate → all remaining batch welds flip to SS, welder status flips to SS.

- [ ] **Step 3: Document the verification**

Add a short note to `docs/PIPEQC_CONTEXT.md` under the merge log (or wherever Phase 4 sign-off lives):

```markdown
- 2026-XX-XX: Phase 4.3 — verified NDE rework cascade for field welds end-to-end.
  Field weld FJ-XXXX rejected → -R1 joint auto-created in erection-store,
  batch BTH-XXX flipped to Tracer T1, no penalty shoot triggered (3 rejections cumulative).
```

(Replace `XX-XX` and IDs with actual values from the smoke test.)

- [ ] **Step 4: Commit**

```bash
git add docs/PIPEQC_CONTEXT.md
git commit -m "docs(erection): verify Phase 3 NDE cascade applies to field welds (Phase 4.3 verify)"
```

If you hit a real cascade bug for field welds during smoke test, **stop and surface to the user before patching** — the cascade is Phase 3's contract and a fix likely needs to be made in `store/batches-store.ts` rather than in Erection code.

---

## Task 5 — Field QC Release sign-off screen (Slice 4.5, qc.B10)

**Files:**
- Create: `store/field-qc-release-store.ts`
- Create: `components/erection/field-qc-release-view.tsx`
- Create: `components/erection/field-qc-release-detail-panel.tsx`
- Create: `app/erection/field-qc-release/page.tsx`
- Modify: `lib/erection-stage.ts` (add `Field QC Released` gate to RFT eligibility)
- Modify: `store/erection-rollup.ts` (RFT watcher consumes new gate)
- Modify: `config/navigation.ts` (add sidebar entry)
- Modify: `store/demo-store.ts` (wire reset cascade)

**What this builds:** A sibling of `/fabrication/qc-release` that operates on spools at the Erection module. Same 4-item checklist (Dimensional / Visual / NDE complete / Heat traceability) but at field level: spool must have reached `Supported` (welded-bolted + supported confirmed, all field joints' NDE released, all PWHT released) before it can be field-QC-released. Today the RFT auto-gate at [store/erection-rollup.ts:88](store/erection-rollup.ts#L88) fires the moment `isSpoolRFTEligible()` returns true. We **insert** Field QC Release as the **final gate before RFT** — RFT auto-fires only when `isSpoolRFTEligible()` **AND** Field QC Release signed off.

Per [docs/role_matrix/qc_engineer.md:162](docs/role_matrix/qc_engineer.md#L162) this is qc.B10 ⚠→✅.

### Sub-task 5.1 — Create the store

- [ ] **Step 1: Create `store/field-qc-release-store.ts`**

```typescript
"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  QC_CHECKLIST,
  type QCChecklistEntry,
  type QCChecklistKey,
  type QCReleaseRecord,
} from "@/lib/spool-data"

interface FieldQCReleaseState {
  records: QCReleaseRecord[]
  getRecord: (spoolNo: string) => QCReleaseRecord | undefined
  upsertEntry: (spoolNo: string, key: QCChecklistKey, patch: Partial<QCChecklistEntry>) => void
  signOffFieldQCRelease: (spoolNo: string, inspector: string) => void
  failFieldQCRelease: (spoolNo: string, inspector: string, reason: string) => void
  resetField: () => void
}

export const useFieldQCReleaseStore = create<FieldQCReleaseState>()(
  persist(
    (set, get) => ({
      records: [],

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      upsertEntry: (spoolNo, key, patch) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          if (existing) {
            return {
              records: state.records.map((r) =>
                r.spoolNo === spoolNo
                  ? {
                      ...r,
                      entries: r.entries.map((e) =>
                        e.key === key ? { ...e, ...patch } : e,
                      ),
                    }
                  : r,
              ),
            }
          }
          const newRecord: QCReleaseRecord = {
            spoolNo,
            entries: QC_CHECKLIST.map((item) => ({
              key: item.key,
              status: "Pending",
            })),
          }
          return {
            records: [
              ...state.records,
              {
                ...newRecord,
                entries: newRecord.entries.map((e) =>
                  e.key === key ? { ...e, ...patch } : e,
                ),
              },
            ],
          }
        }),

      signOffFieldQCRelease: (spoolNo, inspector) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  inspector,
                  signedOffDate: new Date().toISOString().split("T")[0],
                  failReason: undefined,
                  failedAt: undefined,
                }
              : r,
          ),
        })),

      failFieldQCRelease: (spoolNo, inspector, reason) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  inspector,
                  signedOffDate: undefined,
                  failReason: reason,
                  failedAt: new Date().toISOString(),
                }
              : r,
          ),
        })),

      resetField: () => set({ records: [] }),
    }),
    {
      name: "pipeqc-field-qc-release-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
```

- [ ] **Step 2: Re-export from `store/index.ts`**

Open [store/index.ts](store/index.ts) and add:

```typescript
export * from "./field-qc-release-store"
```

- [ ] **Step 3: Wire reset cascade in `store/demo-store.ts`**

Find `resetAll()`. Add:

```typescript
useFieldQCReleaseStore.getState().resetField()
```

Import at top: `import { useFieldQCReleaseStore } from "./field-qc-release-store"`.

### Sub-task 5.2 — Insert Field QC Release into the RFT gate

Today `isSpoolRFTEligible()` in [lib/erection-stage.ts](lib/erection-stage.ts) returns true when To Site + Erected + Welded-Bolted + Supported records exist (and flange progress is complete). We make Field QC Release the final gate.

- [ ] **Step 4: Find and extend `isSpoolRFTEligible`**

```bash
grep -n "isSpoolRFTEligible" lib/erection-stage.ts
```

Add a new optional parameter `fieldQcReleased: boolean` and gate on it:

```typescript
export function isSpoolRFTEligible(
  spoolNo: string,
  toSite: ToSiteRecord | undefined,
  erected: ErectedRecord | undefined,
  weldedBolted: WeldedBoltedRecord | undefined,
  supported: SupportedRecord | undefined,
  flangeRollup: SpoolFlangeBoltRollup,
  fieldQcReleased: boolean = false,   // <— NEW (default keeps backward-compat for any callers)
): boolean {
  if (!toSite || !erected || !weldedBolted || !supported) return false
  if (flangeRollup.totalFlanges > 0 && flangeRollup.boltedCount < flangeRollup.totalFlanges) return false
  if (!fieldQcReleased) return false
  return true
}
```

- [ ] **Step 5: Update `useSpoolRFTWatcher` in `store/erection-rollup.ts`**

Read [store/erection-rollup.ts](store/erection-rollup.ts) (already showed lines 1-120 during research). In `useSpoolRFTWatcher`, import the new store and gate the loop:

```typescript
import { useFieldQCReleaseStore } from "@/store/field-qc-release-store"

// inside useSpoolRFTWatcher:
const fieldQcRecords = useFieldQCReleaseStore((s) => s.records)

// in the effect, before isSpoolRFTEligible:
const fieldQc = fieldQcRecords.find((r) => r.spoolNo === spoolNo)
const isFieldQcReleased = !!fieldQc?.signedOffDate

if (!isSpoolRFTEligible(spoolNo, ts, er, wb, sup, flangeRollup, isFieldQcReleased)) continue
```

Add `fieldQcRecords` to the effect's dependency array.

- [ ] **Step 6: Extend `deriveSpoolErectionStage` to include "Field QC Released" between Supported and RFT**

Open `lib/erection-stage.ts`. Find `SpoolErectionStage`:

```typescript
export type SpoolErectionStage =
  | "Awaiting Release"
  | "To Site"
  | "Field Material Check"
  | "Erected"
  | "Welded/Bolted"
  | "Supported"
  | "Field QC Released"    // <— NEW
  | "RFT"
```

Update `ERECTION_STAGE_ORDER` to include it in the right position (after "Supported", before "RFT"). Add a color row in `ERECTION_STAGE_COLOR`:

```typescript
"Field QC Released": {
  bg: "bg-teal-50",
  text: "text-teal-700",
  rail: "bg-teal-500",
},
```

Update `deriveSpoolErectionStage` to insert the new stage. The function currently treats Supported → RFT as adjacent; add a branch: if Supported but no field QC release signed off → stage is "Supported"; if Supported + field QC release signed off → stage is "Field QC Released"; RFT only fires after `isSpoolRFTEligible()` returns true (which now requires field QC release).

> **Implementation hint:** the simplest patch is to add a 5th lookup like the existing maps (e.g. `fieldQcMap`) and pass it into `deriveSpoolErectionStage` from the caller. The caller is `useSpoolErectionStages` in `store/erection-rollup.ts`. Mirror the existing `mcRollup` pattern: build a `fieldQcMap` in `useSpoolErectionStages`, pass it through to `deriveSpoolErectionStage`.

### Sub-task 5.3 — Create the Sheet detail panel

- [ ] **Step 7: Create `components/erection/field-qc-release-detail-panel.tsx`**

This panel mirrors [components/fabrication/qc-release-detail-panel.tsx](components/fabrication/qc-release-detail-panel.tsx) (Phase 2 Task 4) but operates against `useFieldQCReleaseStore` instead of `useQCReleaseStore` and uses `QC_INSPECTORS` for the inspector dropdown. The form structure (4-item checklist, status segmented control with Pending / Pass / Pass with remark / Fail, remark required for Pass-with-remark, Reject-to-Rework path when any Fail) is identical — copy verbatim and substitute store + notification text.

Key adaptations:
- Read the spool stage via `useSpoolErectionStages` to display the current Erection lifecycle position in the SheetHeader (helpful context).
- On Sign-off success notification: `category: "weld_progress"`, `title: "${spoolNo}: field QC released"`, `description: "Ready for RFT auto-gate"`, `href: "/erection/rft"`.
- On Fail (Reject to Rework): `severity: "warning"`, `title: "${spoolNo}: Field QC rejected"`, `description: "Routed back to Welded/Bolted. Reason: ${rejectReason}"`, `href: "/erection/welded-bolted"`.
- Mount `<PmWriteLockBanner />` near the SheetHeader; disable Save / Sign-off / Reject when `pmLocked === true`.

Use the verbatim `STATUS_OPTIONS`, `StatusSegmented`, validation memo, and Sheet layout from the shop-side panel.

- [ ] **Step 8: Create `components/erection/field-qc-release-view.tsx`**

This view mirrors [components/fabrication/qc-release-view.tsx](components/fabrication/qc-release-view.tsx). Filter the spool list to those in `Supported` or `Field QC Released` stage (so the inspector sees the queue + can re-open already-released records). Use the same KPI strip pattern (Awaiting Release · Released · Rejected) and table layout. The row's onClick opens the new detail panel.

Add a scope lock filter chain:

```typescript
const scope = useScopeLock()
const filtered = spoolList.filter((s) => {
  if (!scope.isInScope(s.pdsAreaCode)) return false
  // ... rest of filter chain
})
```

(`s.pdsAreaCode` will likely be undefined on demo spools — the scope hook returns `true` in that case, so this is a no-op until spool data carries the field. This matches Phase 2 Task 6.)

- [ ] **Step 9: Create the route**

`app/erection/field-qc-release/page.tsx`:

```tsx
import { FieldQCReleaseView } from "@/components/erection/field-qc-release-view"

export default function FieldQCReleasePage() {
  return <FieldQCReleaseView />
}
```

- [ ] **Step 10: Add to sidebar navigation**

Open [config/navigation.ts](config/navigation.ts). Find the Erection group (children include To Site, Field Material Check, Erected, Welded-Bolted, Supported, RFT). Add a new entry **between Supported and RFT**:

```typescript
{
  label: "Field QC Release",
  href: "/erection/field-qc-release",
  icon: ClipboardCheck,  // import from lucide-react if not already present
},
```

- [ ] **Step 11: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add store/field-qc-release-store.ts store/index.ts store/demo-store.ts \
        lib/erection-stage.ts store/erection-rollup.ts \
        components/erection/field-qc-release-view.tsx components/erection/field-qc-release-detail-panel.tsx \
        app/erection/field-qc-release/page.tsx config/navigation.ts
git commit -m "feat(erection): Field QC Release sign-off + RFT gate (Phase 4.5, qc.B10)"
```

---

## Task 6 — Wire PM Write-Lock + Scope Lock into every Erection panel (Slice 4.6)

**Files:**
- Modify: `components/erection/to-site-detail-panel.tsx`
- Modify: `components/erection/erected-detail-panel.tsx`
- Modify: `components/erection/welded-bolted-detail-panel.tsx`
- Modify: `components/erection/supported-detail-panel.tsx`
- Modify: `components/erection/field-material-check-detail-panel.tsx`
- Modify: `components/erection/field-weld-detail-panel.tsx`
- Modify: `components/erection/flange-progress-detail-panel.tsx`
- Modify: `components/erection/field-weld-table.tsx` (scope-lock filter)
- Modify: `components/erection/field-material-check-view.tsx` (scope-lock filter)
- Modify: `components/erection/flange-progress-view.tsx` (scope-lock filter)
- Modify: `components/erection/field-qc-release-view.tsx` (added in Task 5; already includes scope filter)

**What this builds:** Phase 2 Tasks 5 + 6 built `usePmWriteLock()` + `<PmWriteLockBanner />` and `useScopeLock()` but wired only the **Fabrication** panels. Phase 4 propagates both to every Erection panel and list view, matching the cross-cutting principle in roadmap_v3 Phase 4: *"reuse Phase 2 / Phase 3 nits"*.

### Sub-task 6.1 — PM Write-Lock on detail panels

For **each** of the 7 detail panels listed in Files:

- [ ] **Step 1 (repeat per panel): Add imports**

```typescript
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
```

- [ ] **Step 2 (repeat per panel): Consume the hook near top of component**

```typescript
const { locked: pmLocked } = usePmWriteLock()
```

- [ ] **Step 3 (repeat per panel): Render banner near the SheetHeader**

```tsx
<SheetHeader>...</SheetHeader>
<PmWriteLockBanner />
```

For panels that don't use `<Sheet>` (e.g. `field-weld-detail-panel.tsx` uses `<aside>`), mount the banner just below the header div — match the original Phase 2 wiring in `weld-detail-panel.tsx` where the banner is the first child after the title block.

- [ ] **Step 4 (repeat per panel): Gate the save / confirm / sign-off buttons**

For every `<Button onClick={handleSomething} disabled={...}>` that performs a mutation, extend the `disabled` expression:

```tsx
disabled={existingDisabledExpression || pmLocked}
```

If a panel uses an `isLocked` derived flag (as in `field-weld-detail-panel.tsx:157`), update it instead:

```typescript
const isLocked = form.isLocked || pmLocked
```

— that propagates the lock to every conditional render that already keys on `isLocked`.

### Sub-task 6.2 — Scope-lock filter on list views

For **each** list view (`field-weld-table.tsx`, `field-material-check-view.tsx`, `flange-progress-view.tsx`):

- [ ] **Step 5 (repeat per view): Add scope hook**

```typescript
import { useScopeLock } from "@/lib/scope-lock"

// inside component
const scope = useScopeLock()
```

- [ ] **Step 6 (repeat per view): Add the predicate to the filter chain**

Find the existing `.filter(...)` that builds visible rows. Add:

```typescript
if (!scope.isInScope(row.pdsAreaCode)) return false
```

(`pdsAreaCode` likely undefined on demo data → no-op filter, identical to Phase 2 Task 6.)

- [ ] **Step 7: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/erection/to-site-detail-panel.tsx components/erection/erected-detail-panel.tsx \
        components/erection/welded-bolted-detail-panel.tsx components/erection/supported-detail-panel.tsx \
        components/erection/field-material-check-detail-panel.tsx components/erection/field-weld-detail-panel.tsx \
        components/erection/flange-progress-detail-panel.tsx \
        components/erection/field-weld-table.tsx components/erection/field-material-check-view.tsx \
        components/erection/flange-progress-view.tsx
git commit -m "feat(erection): wire PM write-lock + scope lock into every Erection panel and list (Phase 4.6)"
```

---

## Task 7 — QC13 PDF parity + W24 Daily Progress Report PDF stub (demo polish)

**Files:**
- Modify: `components/erection/field-weld-detail-panel.tsx` (mount existing `Qc13PdfButton`)
- Create: `components/erection/w24-pdf-button.tsx`
- Modify: `components/erection/to-site-detail-panel.tsx`, `components/erection/erected-detail-panel.tsx`, `components/erection/welded-bolted-detail-panel.tsx` (mount W24 button)

**What this builds:**

**(a) QC13 parity:** Phase 2 Task 7 added a "Generate QC13 PDF" button on shop-weld completion (`components/weld-detail-panel.tsx`). Field welds use the same `WeldJoint` shape and the `Qc13PdfButton` component accepts a `joint: WeldJoint` prop — `FieldWeldJoint extends WeldJoint`, so it's a one-line mount.

**(b) W24 form:** Per [Erection_presentation_research.md:229](docs/research/Erection_presentation_research.md#L229) (CC-12), the QC W24 *"Welding daily progress and joint visual examination result report"* is *"the canonical paper-form pivot point between desktop and field"*. The W24 form number is already a free-text field across the 3 lifecycle stages (`to-site` / `erected` / `welded-bolted` detail panels). A printable W24 PDF stamped with project header, spool ID, area zone, today's date, and field joint inventory is a high-perceived-fidelity demo moment with low engineering cost. Pattern-match `components/fabrication/qc13-pdf-button.tsx` exactly.

### Sub-task 7.1 — Mount Qc13PdfButton on field weld panel

- [ ] **Step 1: Add import**

In [components/erection/field-weld-detail-panel.tsx](components/erection/field-weld-detail-panel.tsx), near other imports:

```typescript
import { Qc13PdfButton } from "@/components/fabrication/qc13-pdf-button"
```

- [ ] **Step 2: Render conditionally near the existing Send-to-NDE button**

Inside the action row that already contains `<Button onClick={handleSendToNDE}>` (near line 710), add **above** Send-to-NDE:

```tsx
{form.status === "Completed" && (
  <Qc13PdfButton joint={form} />
)}
```

(`form` already has the full `FieldWeldJoint` shape; assignment-compatible with `WeldJoint` argument.)

### Sub-task 7.2 — Create the W24 PDF button

- [ ] **Step 3: Create `components/erection/w24-pdf-button.tsx`**

```tsx
"use client"

import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import { Button } from "@/components/ui/button"
import { useAdminStore } from "@/store/admin-store"
import { useErectionStore } from "@/store/erection-store"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"

interface Props {
  spoolNo: string
  w24FormNo: string
  areaZone?: string
  receivedDate?: string
  erectedDate?: string
}

export function W24PdfButton({ spoolNo, w24FormNo, areaZone, receivedDate, erectedDate }: Props) {
  const projectDef = useAdminStore((s) => s.projectDefinition)
  const fieldWelds = useErectionStore((s) =>
    s.fieldWelds.filter((w) => w.spoolNo === spoolNo),
  )

  function handleGenerate() {
    const doc = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    let y = margin

    doc.setFont("helvetica", "bold").setFontSize(14)
    doc.text("W24 — Welding Daily Progress & Visual Examination", margin, y)
    y += 18
    doc.setFont("helvetica", "normal").setFontSize(9)
    doc.text(`Project: ${projectDef.projectName ?? "—"} · Activity ${projectDef.activityCode ?? "—"}`, margin, y); y += 12
    doc.text(`Issued: ${new Date().toLocaleDateString("en-GB")}`, margin, y); y += 12
    doc.text(`W24 No: ${w24FormNo || `W24-${spoolNo}-${Date.now().toString().slice(-6)}`}`, margin, y); y += 20

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Spool", margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(9)
    ;[
      ["Spool No", spoolNo],
      ["Area Zone", areaZone ?? "—"],
      ["Received Date", receivedDate ?? "—"],
      ["Erected Date", erectedDate ?? "—"],
    ].forEach(([k, v]) => {
      doc.text(`${k}:`, margin, y)
      doc.text(String(v ?? "—"), margin + 100, y)
      y += 11
    })
    y += 8

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text(`Field Joints (${fieldWelds.length})`, margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    doc.text("Joint No   Welder   WPS    Status     Visual    Heat", margin, y); y += 10
    doc.line(margin, y - 2, doc.internal.pageSize.getWidth() - margin, y - 2)
    fieldWelds.forEach((w) => {
      const line = `${w.jointNo.padEnd(10)} ${(w.welderCode ?? "—").padEnd(8)} ${w.wpsNo.padEnd(6)} ${w.status.padEnd(10)} ${"___".padEnd(8)} ${w.heatNo ?? "—"}`
      doc.text(line, margin, y); y += 10
    })
    y += 14

    doc.setFont("helvetica", "bold").setFontSize(10)
    doc.text("Sign-off", margin, y); y += 14
    doc.setFont("helvetica", "normal").setFontSize(8)
    const sigY = y + 30
    const colWidth = (doc.internal.pageSize.getWidth() - 2 * margin) / 3
    ;["Foreman", "Area Supervisor", "QC Engineer"].forEach((label, i) => {
      const x = margin + i * colWidth
      doc.line(x, sigY, x + colWidth - 10, sigY)
      doc.text(label, x, sigY + 12)
      doc.text("Name / Date / Signature", x, sigY + 22)
    })

    doc.save(`W24-${spoolNo}.pdf`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      className="h-9 text-xs gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      <FileText className="h-4 w-4" />
      Generate W24 PDF
    </Button>
  )
}
```

### Sub-task 7.3 — Mount W24 button in the three lifecycle panels

- [ ] **Step 4: Mount in `to-site-detail-panel.tsx`**

Add import at top of file:

```typescript
import { W24PdfButton } from "./w24-pdf-button"
```

Inside the panel, in the footer action area, add:

```tsx
<W24PdfButton
  spoolNo={form.spoolNo}
  w24FormNo={form.w24FormNo}
  receivedDate={form.receivedDate}
/>
```

(Adjust `form` reference to whatever the panel actually uses — typically the local form state.)

- [ ] **Step 5: Mount in `erected-detail-panel.tsx`**

Same import. Add the button near the Confirm action, passing `erectedDate` and `areaZone`:

```tsx
<W24PdfButton
  spoolNo={form.spoolNo}
  w24FormNo={form.w24FormNo}
  areaZone={form.areaZone}
  erectedDate={form.erectedDate}
/>
```

- [ ] **Step 6: Mount in `welded-bolted-detail-panel.tsx`**

```tsx
<W24PdfButton
  spoolNo={form.spoolNo}
  w24FormNo={form.w24FormNo}
/>
```

- [ ] **Step 7: TypeScript check + commit**

```bash
npx tsc --noEmit 2>&1 | head -50
git add components/erection/field-weld-detail-panel.tsx components/erection/w24-pdf-button.tsx \
        components/erection/to-site-detail-panel.tsx components/erection/erected-detail-panel.tsx \
        components/erection/welded-bolted-detail-panel.tsx
git commit -m "feat(erection): QC13 button on field welds + W24 PDF stub on lifecycle panels (Phase 4 demo polish)"
```

---

## Task 8 — Final integration: end-to-end Erection demo flow

**Files:**
- Verify only — no code changes unless something fails

**What this checks:** End-to-end demo flow from spool dispatch (Phase 5 hand-off) → To Site → Field Material Check → Erected → Welded/Bolted → Supported → Field QC Released → RFT.

- [ ] **Step 1: Build + dev server smoke test**

```bash
npx tsc --noEmit 2>&1 | head -50
npm run build 2>&1 | tail -30
```

Expected: no type errors, build succeeds.

- [ ] **Step 2: Manual demo flow checklist**

Start dev server (`npm run dev`) and walk through:

1. `/erection/to-site` → open a spool detail → confirm To Site receipt → see W24 PDF button → click → PDF downloads with project header + spool ID + signature block.
2. `/erection/material-check` → open a Pending spool → type an invalid heat number (e.g. `HT-INVALID-9999`) → see red border + inline error + Sign-off disabled (Phase 2 Task 1 wiring confirmed).
3. Type valid heat number → red goes away → Sign-off enabled → spool advances to Erected stage.
4. `/erection/weld-progress` → spot a field weld whose welder/WPS pair is invalid → see amber `WPS ⚠` chip in the row.
5. Open the same weld → mark Completed → click "Generate QC13 PDF" → PDF downloads.
6. `/erection/welded-bolted` → confirm a spool → see W24 button.
7. `/erection/supported` → confirm a spool → spool advances to "Supported" stage (NOT RFT yet — Field QC Release gate inserted).
8. `/erection/field-qc-release` → see the same spool in Awaiting Release → open detail → walk the 4-item checklist → Sign-off.
9. Confirm RFT auto-fires for the spool: notification appears, spool stage advances to "RFT", `/erection/rft` shows the record.
10. Mark one checklist item Fail → Reject-to-Rework → spool drops back to Supported, warning notification appears.
11. `/fabrication/pwht-release` → see both shop and field welds in the queue → filter shows Source column → open a field weld → enter PWHT date + lab ref → release → confirm `erection-store` was updated (verify by opening the field weld panel and checking the PWHT Date field).
12. Switch role to PM: `localStorage.setItem("pipeqc-role", "project_manager"); location.reload()` → open any Erection detail panel → see `<PmWriteLockBanner />` + Save buttons disabled across every Erection screen.

- [ ] **Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore(erection): Phase 4 demo flow polish + integration"
```

---

## Self-review

**Spec coverage check:**

| Roadmap slice | Covered in task | Real gap closed |
|---|---|---|
| 4.1 Welder qualification soft alert (reuse) | Task 1 (chip in field weld table; panel banner already live from Phase 2) | Surface invalid welder/WPS pair on field weld list view |
| 4.2 Heat Number → PML validation (reuse) | Task 2 (verification only — Phase 2 Task 1 already wired field material check) | Confirms HARD BLOCK still active for field side |
| 4.3 NDE rework cascade (reuse Phase 3) | Task 4 (verification + smoke test only) | Confirms field welds cascade identically to shop welds |
| 4.4 PWHT release (reuse + extend) | Task 3 (unify shop + field welds in the PWHT queue) | Field welds with `pwhtRequired` were invisible — now appear with Source column |
| 4.5 Field QC release 4-item checklist | Task 5 (new store + view + detail panel + RFT gate insertion) | qc.B10 ⚠→✅ — first field-side QC release sign-off |
| 4.6 PM write-lock + scope lock (reuse) | Task 6 (wire into 7 panels + 3 list views) | Built once in Phase 2, applied to Erection here |
| Demo artifact: QC13 PDF on field welds | Task 7 sub-task 7.1 | Parity with Phase 2 Task 7 |
| Demo artifact: W24 PDF on lifecycle panels | Task 7 sub-tasks 7.2 + 7.3 | New stub for CC-12 paper-form parity |

**Adjustments from roadmap_v3 based on code audit:**

- **Slice 4.1 (welder qual)** roadmap claimed *"apply Phase 2.1 pattern"* — turns out the panel banner was already extended into field-weld-detail-panel during Phase 2 Task 2, but the **table-row chip** was not. Task 1 adds only the chip.
- **Slice 4.2 (heat validation)** roadmap claimed *"apply Phase 2.2 pattern"* — turns out Phase 2 Task 1 Step 3 already applied the validator to `field-material-check-detail-panel.tsx`. Task 2 is verification only.
- **Slice 4.4 (PWHT)** roadmap claimed *"apply Phase 2.3 pattern"* — turns out the PWHT queue at `/fabrication/pwht-release` only reads shop welds. Task 3 unifies it rather than building a separate field-PWHT queue (single source of truth, lower maintenance burden, and Source column gives the QC engineer a unified view).
- **Slice 4.5 (field QC release)** is the **only structural slice in Phase 4**. The roadmap's *"reuse Phase 2.4 pattern"* phrasing understates the work — RFT gate insertion + new stage in the lifecycle enum is non-trivial. Task 5 handles it carefully.
- **Slice 4.6 (PM write-lock + scope lock)** roadmap claimed *"apply to Erection screens"* — turns out none of the 7 Erection panels render the banner or gate buttons. Direct application: Task 6.
- **Bonus task 7 (W24 PDF)** was not in roadmap_v3 but is explicitly called out by CC-12 in research as *"the canonical paper-form pivot point"*. Added as a demo polish (parallel to Phase 2 Task 7 QC13 polish). Trivial to remove if scope pressure.

**Deferred (per roadmap_v3 Phase 4 explicit defers + audit findings):**

- Erection reports (§13) — Phase 7 Track C
- Multiple welders per joint (qc.B15) — Phase 7
- W24 form auto-poll / SpoolGen integration (sp.B12 sibling) — defer indefinitely
- W24 PDF auto-generation on stage transition (Easy Piping verbatim) — currently manual-on-demand; trivial 1-line change if pitch needs it
- Real role-based auth — Phase 7 (currently localStorage stub for PM write-lock + scope lock)
- Scope-lock UI filter is opt-in (passes through when `pdsAreaCode` undefined on demo data) — meaningful filter only after spool data extension (Phase 7)

**Placeholder scan:** No TBD, TODO, or "implement later" phrases inside code. All steps have real code. Task 4 has an explicit BLOCKED-skip path if Phase 3 hasn't merged — that's intentional handling of the cross-phase dependency, not a placeholder.

**Type consistency check:** `FieldQCReleaseState`, `useFieldQCReleaseStore`, `SpoolErectionStage` (extended with `"Field QC Released"`), `PwhtReleaseRecord` (extended with `source`), `W24PdfButton`, `isSpoolRFTEligible` (extended with `fieldQcReleased` arg) — all defined once and imported by exact name across consumers.

**Cross-cutting nits status after Phase 4:**

| Nit | Status after Phase 4 |
|---|---|
| Subcontractor scope lock (CC-4) | ✅ Hook wired into all 4 Erection list views (Task 6) |
| PM write-lock | ✅ Banner + gating on all 7 Erection panels (Task 6) + new field-qc-release panel (Task 5) |
| Welder qualification soft alert (CC-28 WARN) | ✅ Panel banner already live (Phase 2); table chip on field side added (Task 1) |
| Heat number traceability (CC-28 BLOCK) | ✅ Wired in Phase 2; verified in Phase 4 (Task 2) |
| NDE rework cascade | ✅ Phase 3 cascade verified for field welds end-to-end (Task 4) |
| PWHT release for field welds | ✅ Unified queue (Task 3) |
| Field QC Release sign-off | ✅ New (Task 5) — qc.B10 ⚠→✅ |
| Notification system upgrade | ⏳ Phase 7 |

---

## Open questions for the next session

- Should the W24 PDF auto-generate the moment "Erected" date is recorded (Easy Piping verbatim per Erection_research §C) or stay manual-on-demand? Verbatim behaviour would be a 1-line call in `erected-store.confirmErected()`.
- The Field QC Release fail-to-rework currently routes the spool back to "Supported" stage (clears `signedOffDate`, sets `failReason`). Should it instead trigger a per-joint rework loop on specific field joints (more granular, more like Phase 3 NDE cascade)? Decision deferred — current behaviour is intentional (mirrors Phase 2 Task 4 shop-side semantics).
- Phase 3 has not necessarily merged yet at the time this plan runs. Task 4 has an explicit BLOCKED-skip; if Phase 3 ships during Phase 4 execution, return to Task 4 before closing the Phase.
- Scope-lock filter (Task 6) is opt-in and effectively a no-op while spool data lacks `pdsAreaCode`. Phase 7 should extend `lib/spool-data.ts` and `lib/erection-stage.ts` rollup record shapes to derive `pdsAreaCode` from spool naming convention (e.g. `PR-01` prefix in `spoolNo`). Confirm at Phase 4 close that this is acceptable.
