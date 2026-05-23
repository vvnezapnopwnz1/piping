# PipeQC Phase 7 — Cross-cutting Polish

> Read `docs/PIPEQC_CONTEXT.md` + `docs/roadmap_v3.md` §Phase 7 first.
> Phases 0–6 are complete on `main`. This is the final phase before the
> investor demo — its job is to **fill the polish gaps** that make the
> product feel enterprise-grade, not to add new domain modules.
>
> Keep changes **small and surgical**. Reuse existing patterns
> (`status-badge`, `weld-table`, `Sheet` panels, `jspdf`, `xlsx`,
> persisted Zustand stores). No new dependencies. No refactors of
> existing Phase 0–6 code unless required to fix a real bug.

---

## 0. Scope summary

Phase 7 has 4 deliverables. Ship them in this order so each one
gives a visible demo win on its own:

| Slice | Deliverable | Why it matters for the demo |
| --- | --- | --- |
| 7.1 | Reports — real generation for 4 key reports | `/reports` today is a shell with mock-toast downloads. Generating real `.xlsx` / `.pdf` for the 4 most-demoed reports closes the biggest "fake" surface in the app |
| 7.2 | Notifications upgrade — acknowledge / archive / group | Home page feed today is read-only. PM workflow story (acknowledge + assign) is shown but not real; this slice makes it real |
| 7.3 | Admin polish — Access Rights editor + Import Settings dry-run | Two admin pages still show static `AdminDemoTable` placeholders. Both are visible in the System Admin demo path |
| 7.4 | Dossier Handover PDF + W10P stub | One real "client handoff" artifact (Dossier PDF combining weld history + NDE + punch lists per testpack) + W10P painting QC form stub |

**Explicitly out of scope** (defer to post-demo):

- Real SpoolGen 4-file parser, Marian CSV ingest, SpoolGen auto-poll
- PDA scan ingestion / Kalipso sync
- Multiple welders per joint schema extension
- Project Reader role (skip — current 6 roles are enough for the demo)
- Project archive flow
- Activity-type scope filter (NDE-sub vs Fab-sub vs Erection-sub)
- 8 NDE reports + 4 welder-monitoring reports as **separate** report rows
  (we cover the 4 highest-leverage ones in 7.1; the rest stay as
  shell rows in `REPORTS_SEED` with mock-toast downloads — that is OK
  for the demo)

---

## 1. Slice 7.1 — Real report generation (the 4 hero reports)

**Current state.** `/reports` (`components/reports/reports-view.tsx`)
has KPI strip, category filters, search, table, and a Download button
that fires a 900 ms `toast.loading` → `toast.success` with no real file.
`REPORTS_SEED` in `lib/reports-data.ts` defines ~12 report rows across
4 categories. `useReportsLiveCounts()` already wires live counts from
`welds-store`, `batches-store`, `testpack-store`, `erection-store`.

**Build:** real downloadable file generation for exactly these 4 reports
(pick by `report.id` in `handleDownload`). Leave all other reports on
the existing mock-toast path.

| Report | Format | Source | Approximate columns |
| --- | --- | --- | --- |
| `RPT-F-001` Fabrication Progress Summary | `.xlsx` (use `xlsx`) | `welds-store` | Joint No · Spool · ISO · WPS · Welder · Status · Heat # · Date completed |
| `RPT-F-003` Welder Performance Log | `.pdf` (use `jspdf`) | `welds-store` + `batches-store` | Welder ID grouped: total welds · accepted · rejected · acceptance % · tracer joints |
| `RPT-N-001` NDE Batch Status (add this row to `REPORTS_SEED` if not present) | `.xlsx` | `batches-store` | Batch No · Method · Subcontractor · Issued · Returned · Total welds · Accepted · Rejected · Status |
| `RPT-T-001` Testpack RFT Pursuit (add row if not present) | `.pdf` | `testpack-store` + `useTestpackRollup` | Per testpack: ISO list · Release Tracking gates (8 nums) · RFT date / blockers |

**Implementation pattern.** Add a `generateReport(report, stores)` helper
in `lib/report-generators.ts` that returns a `Blob`. Inside the existing
`handleDownload`, branch:

```ts
const REAL_GENERATORS: Record<string, (stores) => Promise<Blob>> = {
  "RPT-F-001": genFabProgressXlsx,
  "RPT-F-003": genWelderPerfPdf,
  "RPT-N-001": genNdeBatchStatusXlsx,
  "RPT-T-001": genTestpackRftPdf,
}
if (REAL_GENERATORS[report.id]) {
  const blob = await REAL_GENERATORS[report.id](stores)
  // trigger browser download via URL.createObjectURL + <a download>
} else {
  // existing mock-toast path
}
```

Reuse the existing 700–900 ms artificial delay before the download so
the toast UX matches. Update `lastGeneratedISO` on the report row in
local state (not persisted) so the table reflects "just now".

**Notification side-effect.** After a real report is generated, push
one info notification: _"Report {title} downloaded by {currentRole}"_.

**Done when:** clicking Download on those 4 rows produces a real file
in the browser, the file opens cleanly in Excel / a PDF reader, and the
data inside matches the current store state.

---

## 2. Slice 7.2 — Notifications upgrade

**Current state.** `store/notifications-store.ts` already has `severity`
(`info | warning | error | success`), `category`, `markRead`,
`markAllRead`, `dismiss`. The home feed (`app/page.tsx`) and the top-nav
bell show counts. Notifications can be `pushed` from anywhere with an
`href`. What is **missing** is the PM workflow shown in the
`project_manager.md` B1 story:

- **Acknowledge** (different from "read") — _"Acknowledged by Maria (QC)
  · 2h ago"_ chip on the notification, so a second PM sees the item is
  already in someone's hands
- **Archive** — soft-delete: hide from default view, surface with an
  "Include archived" filter
- **Grouping by severity** — group adjacent error/warning notifications
  in the feed with a single header row (`3 errors · oldest 2h ago`)
- **Filter strip** on the home feed — `All / Errors / Warnings / Info /
  Archived` chips with counts

**Build:**

1. Extend `Notification` interface with:
   - `acknowledged?: { actor: string; at: string }` (replaces nothing —
     read remains, this is a second axis)
   - `archived?: boolean`
2. Add actions in the store: `acknowledge(id, actor)`, `unacknowledge(id)`,
   `archive(id)`, `unarchive(id)`. Bump persist version to 3 with a
   migration that defaults the new fields.
3. New component `components/notifications/notifications-feed.tsx` that
   replaces the current home-page feed (one component, used on `app/page.tsx`).
   It owns: filter strip, severity grouping (collapse same-severity runs
   ≥3 into one expandable block), acknowledge button (current role becomes
   the actor), archive button, "Include archived" toggle.
4. Keep the top-nav bell as-is (it already counts unread); just make it
   skip archived notifications.

**Demo flow this enables:**
- PM opens home → sees 3 errors grouped → expands → acknowledges
  BTH-2025-0156 with role chip "Acknowledged by project_manager · just now"
- Switches to QC Engineer role → sees the same notification with the PM's
  acknowledge chip → does not duplicate the call
- Archives an old info notification → it leaves the default view →
  toggles "Include archived" → it reappears

**Done when:** the 3 actions (acknowledge, archive, filter) work, persist
across reload, and the grouping pattern visually compresses noisy feeds.

---

## 3. Slice 7.3 — Admin polish (Access Rights + Import Settings)

Both pages are currently static `AdminDemoTable` placeholders. Make them
**look real** without building a real RBAC backend or real Excel ingest.

### 7.3.a — Access Rights editor (`app/admin/access-rights/page.tsx`)

Replace the static role table + scope-lock banner with an interactive
matrix backed by `admin-store`.

**Data model addition in `admin-store.ts`:**

```ts
interface AccessRightsRow {
  userId: string         // e.g. "U-001"
  fullName: string       // e.g. "Maria Garcia"
  email: string
  role: Role             // existing 6 roles only
  subcontractorId?: string  // populated only when role = "subcontractor"
  pdsAreaCodes?: string[]   // populated only when role = "subcontractor", subset of admin PDS areas
  active: boolean
}
```

Seed 8–12 users covering all 6 roles + 3–4 subcontractor users assigned
to specific PDS areas (use the PDS areas already defined in
`admin-store.pdsAreas`). Persist key `pipeqc-admin` v4 with migration.

**UI:**
- Table with columns `Name · Email · Role (Select) · Scope (PDS chips
  for subs, "All" for others) · Status · Actions`
- "Add user" dialog mirroring the existing `add-team-dialog.tsx` style
- Edit / Deactivate / Reactivate actions
- When `role = subcontractor` → Scope cell becomes a multi-select of
  active PDS areas; otherwise it shows the `Badge` "Full project scope"
- Bottom banner stays: explains CC-4 scope lock is enforced by
  `lib/scope-lock.ts` (already wired Phase 2–6)

**Notes:**
- No real authentication. This is configuration display, not auth.
- Do not change the role-switcher in top-nav. The Access Rights table
  is informational + configures `pdsAreaCodes` per subcontractor user
  (which `lib/scope-lock.ts` already consumes for the active sub).

### 7.3.b — Import Settings dry-run (`app/admin/import-settings/page.tsx`)

Today the page shows 6 `ImportPlaceholder` cards with no behavior.
Make 3 of them work as a **dry-run preview**:

| Template | Source columns it expects | What "Import" does |
| --- | --- | --- |
| Project Piping Material List | Heat # · Material Type · Spec · Qty · Cert # | Parse uploaded `.xlsx` → preview table → on Confirm, `addHeatRecord` for each row into `admin-store.pipingMaterialList` |
| WPS List | WPS No · Process · Material · Position · Thickness range · Status | Parse → preview → on Confirm, `addWps` per row |
| Welder Qualifications | Welder ID · Name · WPS list · Position · Material · Qualification date · Expiry date | Parse → preview → `addWelderQualification` per row |

Use the same `xlsx` package already added in Phase 5. Each card has:
- File input (`.xlsx, .xls`)
- "Preview" button → opens a `Sheet` with the parsed rows and a
  validation column (row-level errors: missing columns, duplicate keys,
  expired dates)
- "Confirm import" button → commits rows to `admin-store`, shows
  toast `Imported N rows`, closes the sheet

The remaining 3 cards (Weld Thickness/Flange, Spooling Images ZIP,
Spooling Material Type, Spooling Class Material) stay as
`ImportPlaceholder` with a "Coming soon" tag — explicitly out of scope.

**Provide 3 sample `.xlsx` files** under `public/sample-imports/` that
the user can download from the page ("Download template") and re-upload
to demo the round trip.

**Done when:** uploading a sample PML/WPS/Welder file shows a parsed
preview, Confirm writes to `admin-store`, and the corresponding
referential tab in `/admin/project-referential` shows the new rows.

---

## 4. Slice 7.4 — Dossier Handover PDF + W10P stub

Two final PDF artifacts to close the "client handoff" story.

### 7.4.a — Dossier Handover PDF (per testpack)

Add a "Generate Dossier" button on `/testpack/explorer` testpack detail
view (and on `/testpack/pressure-test` per-TP row action menu).
Mirrors the existing `qc13-pdf-button.tsx` / `issue-examination-pdf-button.tsx`
pattern.

The dossier PDF must include, per testpack:
1. Cover page: project header, TP-ID, ISOs, test medium, planned date,
   client witness, rev
2. Weld History table: every shop + field weld in this testpack —
   joint no · spool · WPS · welder · NDE method · NDE result · date
3. NDE Clearance table: each batch involving these welds — batch no ·
   method · accepted/rejected counts · date received
4. Punch Items: X / Y / Z categories grouped, status per item
5. Sign-off block: "QC Engineer · Project Manager · Client Witness"

Use existing data from `useWeldsStore`, `useErectionStore`,
`useBatchesStore`, `useTestpackStore`. No new store.

Component: `components/testpack/dossier-pdf-button.tsx`.

### 7.4.b — W10P (Painting QC) PDF stub

On `/fabrication/paint` detail panel, when a spool is in `Painted`
status, add a "W10P PDF" button (mirror `qc13-pdf-button.tsx`).

Single-page PDF with: project header, spool ID, paint system (from
`paint-record.paintSystem`), DFT measurement (from
`paint-record.dryFilmThickness`), inspector, sign-off date, signature
block. Number prefix: `W10P-{spoolId}-{YYMMDD}`.

Component: `components/fabrication/w10p-pdf-button.tsx`.

**Done when:** Dossier button on TP-205 produces a 3–5 page PDF
that opens cleanly, contains real store data, and looks acceptable
for a client handoff demo moment. W10P button produces a single
clean page per painted spool.

---

## 5. Implementation order + checkpoints

Recommended sequencing (each item is one PR; check in with the user
after each):

1. **7.2 Notifications upgrade** — smallest, highest visibility on
   home page, no new deps.
2. **7.1 Reports — 4 hero reports** — visible from `/reports`, ties
   directly to PM and QC stories.
3. **7.4 Dossier + W10P PDF stubs** — short, mirror existing PDF
   buttons, closes the "client handoff" loop.
4. **7.3 Admin polish (Access Rights + Import Settings dry-run)** —
   largest of the four, do it last because it touches `admin-store`
   persist version.

After each PR: update `docs/PIPEQC_CONTEXT.md` merge log + Phase 7
row in module status table. After all 4 PRs: update `roadmap_v3.md`
Phase 7 section to mark slices done; everything not in scope stays
listed as deferred.

---

## 6. Constraints (read these — they decide design choices)

1. **No new dependencies.** `jspdf`, `xlsx`, `zustand`, `sonner`,
   `lucide-react` are sufficient. Do not pull in `react-pdf`,
   `pdfmake`, `papaparse`, etc.
2. **Reuse existing components.** Use `Sheet`, `Dialog`, `Table` from
   `components/ui/`. Use existing badge / chip / detail-panel patterns.
3. **All work is client-side.** No API routes, no server actions, no
   backend.
4. **Persist version bumps need migrations.** `admin-store` and
   `notifications-store` versions both go up — include `migrate` that
   defaults the new fields, never throws.
5. **No refactor of Phase 0–6 code** unless required to fix a real
   regression. If you find one, fix it minimally and note it in the
   PR description.
6. **Reset must still work.** Every new persist key must cascade in
   `demo-store.resetAll()`.
7. **Role visibility:** Reports + Notifications visible to all 6
   roles. Admin pages stay visible only to `system_admin` (existing
   nav filter handles this).
8. **Scope lock + PM write-lock** continue to apply: PM can read
   reports + acknowledge notifications but cannot edit Access Rights
   (admin-only). Subcontractor cannot see Access Rights or Import
   Settings.

---

## 7. Closure criteria for Phase 7

Phase 7 is **closed** when:

- `/reports` produces 4 real downloadable files (xlsx + pdf) that open
  cleanly and reflect current store state.
- Home notifications support acknowledge / archive / severity grouping
  / archived filter, persisted across reloads.
- `/admin/access-rights` is an interactive user × role × scope matrix
  backed by `admin-store` v4.
- `/admin/import-settings` has 3 working dry-run imports (PML / WPS /
  Welder) + 3 sample `.xlsx` templates under `public/sample-imports/`.
- A "Generate Dossier" button on a testpack produces a multi-page PDF
  with weld history, NDE clearance, and punch items.
- W10P PDF button on painted spools produces a single-page paint QC form.
- `docs/PIPEQC_CONTEXT.md` merge log + module status table updated.
- `docs/roadmap_v3.md` Phase 7 section marked complete with explicit
  list of deferred items (SpoolGen parser, Marian CSV, PDA, Project
  Reader role, project archive, the remaining 11 report rows).
- All existing demos (Phase 0–6) still work end-to-end after Phase 7
  changes; `npm run build` + `tsc --noEmit` clean.

---

## 8. Sanity check before you start

Before writing any code, verify these are still true (they were on
2026-05-23):

- `npm run build` clean on `main`
- `/reports` page renders with mock-toast downloads
- `/admin/access-rights` and `/admin/import-settings` render as static
  pages with no interaction
- Home notifications feed renders 7 seeded notifications and the bell
  count works
- `qc13-pdf-button.tsx`, `w24-pdf-button.tsx`, `issue-examination-pdf-button.tsx`
  all produce valid PDFs when clicked

If any of these are broken, stop and report — Phase 7 assumes Phase
0–6 are green.
