# Admin Module — Track A core (B1, B3, B5, B6)

**Date:** 2026-05-22
**Source matrix:** `docs/role_matrix/system_admin.md`
**Scope decision:** ramp-up backbone — Project Definition + System Referential + Welder Qualifications (add) + NDE Matrix CRUD. Cuts 4 P0/P1 placeholders into working CRUD.
**Out of scope:** B2 active project switch, B4 PDS area mapping, B7–B14 (other refs / access rights / imports), B15 amendment audit, B16 archive.

---

## 1. Architecture

Extend the existing `store/admin-store.ts` (already holds `teams` + `subcontractors`). Single store, four new slices. Bump persist `version: 1 → 2`; migration sets defaults for new slices on hydration.

| Slice | Shape | Seed |
|---|---|---|
| `projectDefinition` | `ProjectDefinition \| null` | hardcoded demo (PipeQC Demo Project / PQ-001) |
| `systemReferentials` | `{ materialTypes: SysRefEntry[]; filmQty: SysRefEntry[]; utCalc: SysRefEntry[]; torquing: SysRefEntry[] }` | small seed arrays per slice |
| `welderQualifications` | `WelderQualification[]` (now incl. `active: boolean`) | seeded from current `WELDER_QUALIFICATIONS` lib constant |
| `ndeMatrix` | `NDEMatrixRecord[]` | seeded from current `NDE_MATRIX` lib constant |

```ts
interface ProjectDefinition {
  activityCode: string
  projectTitle: string
  owner: string
  contractor: string
  ownerLogoUrl: string
  contractorLogoUrl: string
  maxTransitTimeDays: number
  updatedAt: string
}

interface SysRefEntry {
  code: string
  description: string
  active: boolean
  createdAt: string
}

type SysRefSlice = "materialTypes" | "filmQty" | "utCalc" | "torquing"
```

**Actions added:**
- `setProjectDefinition(payload)` — full upsert
- `addSysRefEntry(slice, { code, description })`, `toggleSysRefEntryActive(slice, code)`
- `addWelderQualification(payload)`, `updateWelderExpiry(code, expiryIso)`, `toggleWelderActive(code)`
- `addNdeRule(payload)`, `updateNdeRule(id, patch)`, `deleteNdeRule(id)`

`resetAdmin()` resets the 4 new slices alongside teams/subcontractors.

---

## 2. UX pattern (canonical — `subcontractors-tab.tsx`)

Reused across every new surface:

1. KPI strip (3 chips) on top.
2. Search input + primary Add button on a single flex row.
3. Sticky-header table with alternating row bg, status badges.
4. Row actions via `DropdownMenu` (`MoreHorizontal` trigger).
5. Add/Edit lives in a `Dialog`; `400–600ms` simulated delay before commit; `toast.success` after; reset form on close.
6. Destructive ops (delete, not deactivate) get an inline confirm — `AlertDialog` (use shadcn).

---

## 3. B1 — Project Definition form

**File:** `app/admin/project-definition/page.tsx` (replace placeholder).

Layout:
- `AdminPageHeader` (unchanged)
- Summary card top — shows current saved values (or `—` if none). Renders activity code + title + owner/contractor + transit time.
- Form card — 7 controlled inputs:
  - Activity Code (required, regex `^[A-Z0-9-]+$`)
  - Project Title (required)
  - Owner / Contractor (required)
  - Owner Logo URL / Contractor Logo URL (optional, URL field — no real upload in scope; URL-based image preview if non-empty)
  - Maximum Transit Time (number input, days, min 1, default 14)
- Save button → `setProjectDefinition()` after ~500ms, `toast.success("Project definition saved")`, summary card updates immediately (controlled by store subscription).

`"use client"` page (form needs state).

---

## 4. B3 — System Referential CRUD

**File:** `app/admin/system-referential/page.tsx` (replace placeholder).
**New component:** `components/admin/system-referential-card.tsx` — generic, takes `slice: SysRefSlice` + `title` + `description`.

Layout: 4 cards in a `grid md:grid-cols-2` (matches current layout). Each `SystemReferentialCard`:
- Compact table: Code / Description / Status / Actions.
- Bottom row: inline Add form — 2 short inputs (`Code`, `Description`) + Add button.
- Validation: unique code per slice (toast.error on duplicate), required fields.
- Row action dropdown: Deactivate / Reactivate (toggle `active`).

Seed (~3 rows per slice, e.g. for `materialTypes`: `CS`, `SS316L`, `P91`).

---

## 5. B5 — Welder Qualifications

**Store migration:** move WELDER_QUALIFICATIONS into `admin-store`. Add `active: boolean` field (default `true`).
**Lib refactor:** `lib/welder-qualifications.ts`
  - `validateWelder(weld, welders)` — accepts welders list (was reading the module-level constant).
  - `determineNDEMethods(weld, welders)` — same change.
  - Export `WELDER_QUALIFICATIONS` retained as the seed for the store.

**Tab:** `components/admin/welder-qualifications-tab.tsx` — read from `useAdminStore`, add KPI strip identical to current but on store data, add Search input, Add Welder button, row actions (Renew Expiry / Deactivate).

**New dialogs:**
- `components/admin/add-welder-dialog.tsx`: welderCode (unique check vs store), fullName, qualifiedWPS multi-select sourced from `WPS_LIST`, qualifiedMaterials text, qualifiedDiameters text (default `all`), expiry date input (HTML `type="date"`), optional notes.
- `components/admin/edit-welder-expiry-dialog.tsx`: triggered from row dropdown — single date picker + endorsement ref text, Save.

**Validator consumers updated** to read welders from store hook and pass into helpers:
- `components/weld-detail-panel.tsx`
- `components/erection/field-weld-detail-panel.tsx`

Deactivated welders are filtered out of the welder list passed to validators (so they cannot be selected for new welds), but remain visible in the Admin tab.

---

## 6. B6 — NDE Matrix CRUD

**Store migration:** move NDE_MATRIX into `admin-store`.
**Tab:** `components/admin/nde-matrix-tab.tsx` — read from store, add Search (by service class / method), Add Rule button, row actions Edit / Delete.

**New dialog:** `components/admin/nde-matrix-rule-dialog.tsx` (single component, prop `mode: "add" | "edit"`, optional `initial`):
- serviceClass `Select` (`Class 1` / `Class 2` / `Class 3` / `Utility`)
- diameterRange input (e.g. `DN 25–50`)
- thicknessRange input (e.g. `≤ 10 mm`)
- primaryMethod `Select` (RT/UT/PT/MT/VT)
- primaryCoverage input (e.g. `100%`)
- secondaryMethod `Select` with `none` option
- secondaryCoverage input (disabled if secondary = none)
- acceptanceCriterion input (default `ASME B31.3 §341.3.2`)
- Auto-generated `id` for new rules: next `NDE-MTX-NNN`.

Delete uses an `AlertDialog` confirm (destructive, irreversible).

No audit trail (out of scope — B15).

---

## 7. Cross-cutting

- **Persist migration v1→v2:** `migrate` callback fills missing slices with seeds; preserves existing `teams` + `subcontractors`.
- **`resetAdmin()`** must reset all 6 slices.
- **Tab routing:** `welder-qualifications` and `nde-matrix` tabs in `app/admin/admin-tabs.tsx` need no changes (only the tab bodies change).
- **No new shadcn components required** — use existing Dialog, Input, Select, Checkbox, Label, AlertDialog, DropdownMenu, Badge, Button.

---

## 8. Risks / explicit non-goals

- **Validator refactor blast radius:** two panels read from `validateWelder`. After the change, all weld-entry forms read from the store. If store data is empty (unlikely — seeded), validators behave as if no welders exist. Mitigated by seed.
- **Persist migration:** users with `localStorage["pipeqc-admin"]` v1 keep their teams/subcontractors; new slices populated from seed on first hydration. No data loss.
- **No real file upload** for logos (`B1`) — URL fields only; matches the placeholder-grade scope set for demo work.
- **No audit log** for NDE Matrix changes — B15 is separate Track N.
- **Active project switch (B2) deferred** — single project record edited in place.

---

## 9. File inventory

New / modified:

```
store/admin-store.ts                                      MOD (extend)
lib/welder-qualifications.ts                              MOD (signature change)
app/admin/project-definition/page.tsx                     MOD (rewrite)
app/admin/system-referential/page.tsx                     MOD (rewrite)
components/admin/system-referential-card.tsx              NEW
components/admin/welder-qualifications-tab.tsx            MOD (rewrite)
components/admin/add-welder-dialog.tsx                    NEW
components/admin/edit-welder-expiry-dialog.tsx            NEW
components/admin/nde-matrix-tab.tsx                       MOD (rewrite)
components/admin/nde-matrix-rule-dialog.tsx               NEW
components/weld-detail-panel.tsx                          MOD (pass welders)
components/erection/field-weld-detail-panel.tsx           MOD (pass welders)
```

12 files total. ~600–800 LoC net add.
