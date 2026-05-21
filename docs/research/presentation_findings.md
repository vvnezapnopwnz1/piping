# Easy Piping Presentations — Research Findings Log

> Durable record of domain insights extracted from the 10 Easy Piping
> presentations in the user’s Google Drive (folder “Piping”). Designed to
> survive across chat sessions — if continued in a new chat,
> `project_knowledge_search` should surface this file.
>
> **Drop into `docs/research/presentation_findings.md` of the PipeQC repo
> after each session that appends new findings.**

---

## Purpose

The Easy Piping User Manual PDF (156 pp) is the canonical source, but the
TechnipFMC sales/training presentations frequently contain:

- **Operational context** absent from the manual (who imports what when,
  who runs SOW, role hierarchies in deployment).
- **Architectural diagrams** (data flows, PDA architecture, Marian
  integration shape) the manual doesn’t visualize.
- **Real project benchmarks** (PMP project statistics) usable for TAM and
  scale claims.
- **Customer-facing language** for the pitch deck.

This file captures findings the manual alone does not give us.

---

## Methodology

- Read presentations **sequentially** (1 → 10) — do not skip. Each
  presentation builds on the previous (the user’s directive 2026-05-20).
- For each: three buckets — cross-cutting findings, module-specific
  findings, gaps in PipeQC.
- Append to this file after every read. **Do not overwrite.**

---

## Source files

Google Drive folder ID: `1Ml-7gCf-mJ5YQ92hOr7I1lPw80_QzAH2`

| #   | File                                        | Status             |
| --- | ------------------------------------------- | ------------------ |
| 1   | `1.PSMS overview_1511017.pptx`              | ✅ Read 2026-05-20 |
| 2   | `2.EasyPiping Administration_1511017.pptx`  | ✅ Read 2026-05-20 |
| 3   | `3.EasyPiping Preparation_1511017.pptx`     | ✅ Read 2026-05-20 |
| 4   | `4.EasyPiping Fabrication _10032021.pptx`   | ✅ Read 2026-05-20 |
| 5   | `5.EasyPiping Spool tracking_10032021.pptx` | ✅ Read 2026-05-20 |
| 6   | `6.EasyPiping Erection_10032021.pptx`       | ✅ Read 2026-05-21 |
| 7   | `7.Easy Piping Test Pack_10032021.pptx`     | ✅ Read 2026-05-21 |
| 8   | `8.PSMS_SpoolingDB_10032021.pptx`           | ⏳ Pending         |
| 9   | `9.EasyPiping Assembly_09022020.pptx`       | ⏳ Pending         |
| 10  | `10.EasyPiping Painting_10032021 (1).pptx`  | ⏳ Pending         |

---

## Cross-cutting findings (apply across multiple modules)

### CC-1. Competitive positioning

- TechnipFMC **exited** the piping QC market. Easy Piping is no longer
  sold or maintained.
- **No direct competitor** to PipeQC currently exists.
- Treat Easy Piping as **domain reference**, not competitive threat.
- “Why now” slide framing: incumbent didn’t finish (multiple “modules
  under development”) and then left the market entirely.

### CC-2. System architecture context

Data pipeline (#1):

```
3D Model → SmartPlant → SpoolGen → SmartPlant Material (Marian)
                                  → Easy Piping (= PipeQC's node)
```

- PipeQC sits at the same node as Easy Piping.
- Upstream feeds: SpoolGen (spooling), Marian (material), PDA (field).
- Downstream consumers: client systems, subcontractor proprietary tools.
- This is the **integration diagram** for the pitch deck.

### CC-3. Role hierarchy (Easy Piping native)

From #2 Administration:

| Tier                | Role            | Scope                              | PipeQC current                     |
| ------------------- | --------------- | ---------------------------------- | ---------------------------------- |
| Admin               | System Admin    | Cross-project + system referential | ✅ `system_admin` (merged)         |
| Admin               | Project Admin   | One project, no system ref         | ⚠️ merged into `system_admin`      |
| Admin               | Site Admin      | Parallel to Project Admin          | ⚠️ merged into `system_admin`      |
| Editor              | Project Editor  | Production data, no admin          | Split into functional sub-roles    |
| Editor (functional) | QC Engineer     | Welds, NDE, QC sign-off            | ✅ `qc_engineer`                   |
| Editor (functional) | NDE Inspector   | Batches, results                   | ✅ `nde_inspector`                 |
| Editor (functional) | Project Manager | Reports, dashboards                | ✅ `project_manager`               |
| Editor (functional) | Spooling Team   | Spooling, revisions                | ✅ `spooling_team`                 |
| Editor (functional) | PDA User        | Mobile barcode/checklists          | ❌ not implemented                 |
| Restricted          | Subcontractor   | PDS area locked                    | ✅ `subcontractor` (no scope lock) |
| Restricted          | Project Reader  | Read-only                          | ❌ not implemented                 |

**8 effective roles** for PipeQC role × function matrix.

### CC-4. Subcontractor scope lock pattern

**Critical multi-tenant pattern not yet in PipeQC.**

From #2: “Subcontractor dropdown lists in all screens to be disabled and
set the selected value as logged-in subcontractor.”

Implementation requirement:

- Every screen with a `subcontractor` dropdown
- When current role = `subcontractor`: dropdown disabled, value forced
- Server-side enforcement on every read (PDS area filter)

Status in PipeQC: **not implemented** anywhere. Required for any
multi-tenant demo or real pilot.

Recommended track name: **Track J — Subcontractor scope enforcement.**

### CC-5. Module dependency map

Dependencies discovered so far:

- **Track H (Testpack Builder)** ← blocks on **B3 (System + Sub-system
  referential)** — confirmed in #3. Test pack import requires
  System/Sub-system pre-defined in admin. Implication: B3 must ship
  before or with Track H.
- **G2 Material Check** depends on **3.12 Project Piping Material
  List** (heat number traceability) — currently seed-only, not a real
  admin referential.
- **N3 NDE batch** depends on **3.9 NDE Matrix** + **3.6 Welder
  Qualifications** (selection logic) — B2 partly covers, but selection
  logic per Easy Piping suggestions is not implemented.

### CC-6. Real project benchmark (from #1)

**PMP project** (real Technip EPC project):

| Metric              | Total   | Largest unit |
| ------------------- | ------- | ------------ |
| Spooled ISOs issued | 5,003   | 2,447        |
| Spools              | 23,168  | 12,105       |
| Shop Dia Inch       | 325,970 | 158,599      |
| Assembly Dia Inch   | 59,382  | 29,614       |
| Field Dia Inch      | 30,599  | 11,886       |
| Total Dia Inch      | 415,951 | 200,099      |
| Prefab % of DI      | 78%     | 79%          |

Use for pitch slide on **scale** / **TAM bottom-up** / **cost of the
problem**.

### CC-7. “Production” module — never finished by Easy Piping

From #1 (multiple slides mark as “under development”):

Production module was supposed to:

- System set up with erection sequence at spool level
- Calculate equivalent working quantities for “fair” dispatch
- Display remaining qualified workfront
- Display current available qualified workfront
- Issue weekly production schedule per activity

**This was never delivered by Easy Piping.** Potential differentiation
angle for PipeQC if we choose to scope it later.

### CC-8. SOW deployment matrix (who does what, from #1)

Canonical role × work area split from Easy Piping deployment:

| Activity                                                               | Owner              |
| ---------------------------------------------------------------------- | ------------------ |
| Project setup (Piping class, NDE matrix, weld type, rework, thickness) | Spooling Team (TP) |
| Define WPS, welder qualifications                                      | Subcontractor      |
| Import spool data from SpoolGen                                        | Spooling Team (TP) |
| Import material/paint from SPMAT                                       | TP                 |
| ISO modifications (HO rev)                                             | Spooling Team      |
| ISO modifications (Site rev)                                           | TP + Subcontractor |
| Daily reports (welding, painting, spools, NDE)                         | Subcontractor      |
| Report analysis                                                        | TP + Subcontractor |
| Weekly spool selection                                                 | TP                 |
| Daily manhours + progress                                              | Subcontractor      |
| Productivity calc                                                      | TP + Subcontractor |
| NDE weld selection per system suggestions                              | Subcontractor      |
| Progressive sampling / penalty shoot                                   | Subcontractor      |
| Examination program                                                    | Subcontractor      |
| Material traceability records                                          | Subcontractor      |
| QC forms, weld history register                                        | Subcontractor      |
| Welder statistics                                                      | TP + Subcontractor |
| Backlog tracking                                                       | TP + Subcontractor |
| Surveillance via PDA                                                   | TP                 |
| Statistics analysis (surveillance)                                     | TP                 |
| Area Mapping (Spool Tracking)                                          | Subcontractor      |
| System setup (Spool Tracking)                                          | TP                 |
| Barcode + scanning                                                     | Subcontractor      |
| Movement analysis                                                      | TP + Subcontractor |

**Use for role × function matrix when we build it (after all 10
presentations are read).**

### CC-9. Preparation/Progress sub-module split (universal pattern)

From #4: every fabrication activity in Easy Piping is divided into two
sub-modules:

| Sub-module      | Purpose                                      |
| --------------- | -------------------------------------------- |
| **Preparation** | Workload dispatch — prepare the activity     |
| **Progress**    | Data entry — record progress of the activity |

Applies to: Spool fabrication, Welding, NDE, Painting (also Assembly
and Erection activities).

**Status in Easy Piping itself:** only **NDE-Preparation** is fully
implemented. Welding, Spool fab, Painting — Preparation tabs exist
structurally but functionality not delivered. This is a “module under
development” situation acknowledged by TechnipFMC.

**PipeQC implication:**

- This is the right IA pattern to adopt for activity pages. Spool
  fabrication / Welding / NDE / Painting each should have two tabs:
  _Preparation_ and _Progress_.
- For Preparation tabs where Easy Piping never finished (Welding,
  Painting Spool fab) — we have a **clean greenfield** to design
  workload dispatch UX. Possible differentiator.
- NDE-Preparation in Easy Piping is the most fleshed-out preparation
  experience. Use it as the reference for our NDE batch flow.

### CC-10. Customizable workflow steps per project

From #4 spool fabrication: **status steps are customizable during
project set up**. Example given in the manual:

- Start fabrication → MIR issued → Material check → Fabricated → QC
  release

But the comment is explicit: _“Definition of each steps to agreed
before project start.”_

**PipeQC current:** statuses are hardcoded enums in
`lib/seed-data.ts`.

**PipeQC implication:**

- For demo, we can leave hardcoded steps. But for real-product
  positioning: status definitions should live in project referential
  (admin-editable per project).
- Add to roadmap section of pitch deck: “configurable workflow
  templates per project type (LNG/refinery/petchem).”
- Possible track: **B4 — Workflow step definition** (project-level
  referential for spool fab / welding / NDE step transitions).

---

## #1 PSMS overview — module-specific findings

### Easy Piping main organization

**Main modules** (site-activity-based):

1. **Preparation**

- Spooling
- Material
- Test pack builder

1. **Fabrication**

- Spool fabrication
- Welding
- NDE
- Painting

1. **Assembly** (for modular projects — new module post-2020)

- Spool Erection
- Welding
- NDE
- Flange management
- Painting Progress
- Assembly Dashboard

1. **Erection**

- Spool erection
- Welding
- NDE
- Flange management
- Erection Dashboard

1. **Pressure test**

- Line check
- Item clearance
- Blinding
- Reinstatement
- Test Pack Explorer

**Transversal modules:**

- Spool tracking
- Construction surveillance (PDA-based)
- Planning, target and alert (under development)
- Revision control (under development)
- Admin

Use for “module coverage” slide with ✅/⚠️/❌ vs PipeQC.

### Welding & NDE management features (full list from #1)

15 functions explicitly named:

1. Daily Progress Reporting
1. Welder statistics and Performance Analysis
1. Validation of welder’s qualification with selected WPS per joint
1. Multiple welders for single joint
1. Selection of weld to be examined (progressive sampling)
1. Repair joint management
1. Penalty shoot management
1. RT film quantity estimations
1. Work order for NDE and PWHT activities
1. Repair Percentage and types of defects Monitoring
1. NDT Progress and Backlogs
1. PWHT Progress and backlogs
1. Material traceability records (Heat number tracking)
1. Spool Final QC Clearance tracking
1. Balance work and bottleneck identification

PipeQC coverage estimate: ~10/15 partial. Missing or stub:

- Penalty shoot (concept exists in admin, no flow)
- RT film quantity estimation (not implemented)
- PWHT progress (referenced in weld panel, no flow)
- Multiple welders per joint (single welder field today)
- Welder qualification validation (lib exists, not surfaced)

### Spool tracking technical architecture (#1)

- Hardware: Motorola MC55 (touch + 1D/2D barcode)
- Middleware: MCL Link connecting PDAs to DB
- 10 PDAs deployed on PMP project
- Construction surveillance via PDA: checklist validation/rejection
- Results plotted on weekly graph

PipeQC: no mobile-specific flows. Spool tracking is desktop-only today.
Mobile-web could be a later differentiation.

### Customer language (#1) — verbatim

For pitch slides 1–3:

- _“A tool to manage the entire life cycle of piping construction
  activities, by monitoring and controlling step by step, each and every
  fabrication and QC activity in sequence.”_
- _“Improve the overall piping performance. Technip and Subcontractor(s)
  to work in close collaboration.”_
- _“Construction surveillance: do what we can / do what we should do.”_
- _“Auditable readiness.”_
- _“Manhours and progress.”_

---

## #2 Administration — module-specific findings

### Admin module = 5 sub-sections

1. **Project definition** — create project, project list (system admin only)
1. **System referential** — cross-project parameters (system admin only)
1. **Project referential** — 26 items, project admin
1. **Define access rights** — user roles per project (system admin)
1. **Import settings** — Excel templates per referential (project admin)

### System referential (4 items, system admin only)

| §   | Item                        | Notes                                               |
| --- | --------------------------- | --------------------------------------------------- |
| 2.1 | Material type               | Add/edit/delete                                     |
| 2.2 | Film quantity per diameter  | Read-only matrix, by pipe size × thickness          |
| 2.3 | UT calculation coefficients | Coef diam by diameter, Coef rating by flange rating |
| 2.4 | Torquing method             | Used by Flange management                           |

PipeQC status: **0/4 — none of these are surfaced.**

### Project referential (26 items, project admin)

Full list with PipeQC coverage status:

| §    | Item                           | PipeQC            |
| ---- | ------------------------------ | ----------------- |
| 3.1  | Subcontractor List             | ✅ B1             |
| 3.2  | Progress Weight Factor         | ❌                |
| 3.3  | Area Classification            | ❌                |
| 3.4  | PDS Area / Subcontractor       | ❌                |
| 3.5  | WPS List                       | ✅ B2 (read-only) |
| 3.6  | Welder Qualification           | ✅ B1 (read-only) |
| 3.7  | Service Class / Material Type  | ❌                |
| 3.8  | Weld Type List                 | ❌                |
| 3.9  | NDE Matrix                     | ✅ B2 (read-only) |
| 3.10 | Rework Code                    | ✅ B2             |
| 3.11 | Thickness                      | ❌                |
| 3.12 | Project Piping Material List   | ❌ (seed only)    |
| 3.13 | Joint Category Definition      | ✅ B2 (read-only) |
| 3.14 | Unit of time reference         | ❌                |
| 3.15 | Jointer List                   | ✅ B1             |
| 3.16 | Blinding Team                  | ✅ B1             |
| 3.17 | Finishing Team                 | ✅ B1             |
| 3.18 | Reinstatement Team             | ✅ B1             |
| 3.19 | System                         | ❌ (B3 candidate) |
| 3.20 | Sub System                     | ❌ (B3 candidate) |
| 3.21 | Line Checker Team              | ✅ B1             |
| 3.22 | Location Category              | ❌                |
| 3.23 | Location                       | ❌                |
| 3.24 | Devices (mobile)               | ❌                |
| 3.25 | PDA Users                      | ❌                |
| 3.26 | Unit Classification            | ❌                |
| —    | Pressure unit                  | ❌                |
| —    | Line service                   | ❌                |
| —    | RAL Code                       | ❌                |
| —    | Paint Code Matrix              | ❌                |
| —    | Spooling Material Type         | ❌                |
| —    | Spooling Piping Class Material | ❌                |
| —    | Spooling Check List            | ❌                |

PipeQC coverage: **~10/30 = 33%.**

### NDE Matrix special rule (#2)

PWHT requirement field accepts:

- `Y` (always required)
- `N` (never required)
- A **thickness threshold number** (e.g. `19.05`)

When threshold is set, system auto-marks PWHT as `Y` for any joint whose
thickness exceeds the threshold.

**Implication for PipeQC NDE Matrix:** the read-only display must show
this tri-state field. Stub today shows Y/N only.

### Import settings (6 Excel templates)

1. Weld thickness/Flange
1. NDE Matrix
1. Project Piping Material List
1. Spooling Images (zip, ≤4 MB)
1. Spooling Material Type
1. Spooling Class Material

None implemented in PipeQC. Could be a “data ingestion” slide for the
pitch (paired with screenshots of Excel templates).

### Paint code matrix (in project referential)

- Per isometric: blasting / primer / intermediate coat / final coat
- Blasting + primer = Y/N each
- RAL Code is **separate referential** (Color Code, Fluid service, RAL
  code, linked to isometric + fluid service)

Implication for G4 paint flow: PAINT_SYSTEMS enum should ideally become
a referential. RAL Code is a missing concept entirely.

---

## #3 Preparation — module-specific findings

### Preparation module = 4 sub-sections

1. Spooling (file imports)
1. Material (Marian file imports)
1. Browse (data exploration + revision management)
1. Test pack builder

### Spooling — 4 file imports from SpoolGen

When SpoolGen export is not auto-pulled, manual upload via 4 tabs:

| File        | Content                                  |
| ----------- | ---------------------------------------- |
| `weld.txt`  | Spooling file — ISO/spool/weld structure |
| `trace.txt` | Ident code file — material traceability  |
| `bolt.txt`  | Bolting file — flange joints             |
| `supp.txt`  | Support file — pipe supports             |

**PipeQC gap:** spooling shell has import/validation for one file
concept. Need 4 separate import tabs OR clear “this matches your
SpoolGen output” framing.

Track D candidate enhancement: surface 4 tabs even if the parsers are
mocked.

### Material — Marian (SmartPlant Material) integration

Marian export CSV format:

```
FAH CODE, Run Number, Run Date, Unit, Area, Line, Sheet,
Iso No, Spool No, Issue Status, Weight, Completion Status,
Completion Date
```

Example rows (#3):

| Field             | ISO-level            | Spool-level             |
| ----------------- | -------------------- | ----------------------- |
| Iso No            | `2P9-28-HCX-1000-01` | `S2P9-28-HCX-1000-01`   |
| Spool No          | `03`                 | `SP01..SP05`            |
| Issue Status      | `INCOMPLETE`         | `03`                    |
| Weight (kg)       | empty                | `2342.99`, `4155.91`, … |
| Completion Status | empty                | `TO COMPLETE`           |

**Data hierarchy confirmed:** ISO has N spools; weight + completion live
at spool level; ISO carries top-level metadata only.

**PipeQC implication:** material data is **upstream**. We seed manually
today; in real product would integrate Marian via CSV. Useful for
“integrations” pitch slide.

### Browse — explore + revision management

Two parallel browse trees:

| Tree           | Levels                     |
| -------------- | -------------------------- |
| ISO/Spool/Weld | Latest data + History data |
| Flange joint   | Single browse              |

Manual revision management (separate flows):

- For isometrics / spools / welded joints
- For flange joints (parallel)

**PipeQC has:** spooling-view with import + validation + revision
panels — partial coverage. No flange revision flow.

### Test pack builder

Functions:

- Excel template export → fill → import
- **HARD PREREQUISITE: System and Sub-system referentials must exist in
  admin BEFORE import** (#3 explicit)
- Manual add/modify supported
- Spool selection by isometric (multi-select tree)
- Summary panel at top

**Dependency confirmed:** Track H ← B3 (System + Sub-system tabs).

PipeQC gap: not built. Track H is the named candidate.

---

## #4 Fabrication — module-specific findings

### Fabrication module = 4 sub-sections × 2 sub-modules

| Activity          | Preparation       | Progress |
| ----------------- | ----------------- | -------- |
| Spool fabrication | empty (not built) | ✅       |
| Welding           | empty (not built) | ✅       |
| NDE               | ✅ (full)         | ✅       |
| Painting          | empty (not built) | ✅       |

Only NDE has a complete Preparation experience in Easy Piping. The
others are structural stubs.

### Fabrication progresses at two levels

| Level           | Statuses (customizable)                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Spool level** | Start fabrication → MIR issued → Material checked → Fabricated → Fab QC released → Send to Site → Painting |
| **Joint level** | Cutting → Beveling → Fit-up → Preheat → Welding → NDE → QC                                                 |

A spool is **“QC release”** only when **all** joints belonging to it
have status “released”. This rollup logic is hardcoded.

### Progress entry — universal UX template

All four Progress screens (spool fab / welding / NDE / painting) share
the **same structure**:

1. Intelligent search field at top (mandatory ★)
1. Item summary panel (selected ISO or spool)
1. Grid of spools (or joints) below the summary
1. “−” buttons to collapse/hide rows of the grid
1. Report section (popup with custom options per report)
1. Excel template download for batch progress import
1. “Default date” and “date inputs assistance” shortcuts

**PipeQC implication:** if we build/refactor multiple progress screens,
they should share a single layout component. Track candidate:
**Track F — Progress Entry shared shell.**

### Spool fabrication progress flow

The status transitions (in default Easy Piping setup):

| Status         | Trigger                                           | Auto/Manual |
| -------------- | ------------------------------------------------- | ----------- |
| Start fab      | User enters date                                  | Manual      |
| MIR issued     | Material Issue Request delivered to subcontractor | Manual      |
| Material check | Heat numbers in QC13 form match referential       | **Auto**    |
| Fabricated     | QC13 form signed by all parties                   | Manual      |
| QC release     | All joints in spool have NDE status “released”    | **Auto**    |

**Two auto-populated transitions** in default flow:

1. Material check ← heat number traceability popup completion
1. QC release ← rollup of joint NDE statuses

PipeQC status: neither implemented.

### QC13 — Daily Progress Report form (canonical paper artifact)

This is **the** physical form that bridges site reality and the system:

- Generated right after “Start fab” date is recorded
- **Unique auto-assigned number** per QC13
- Reprintable anytime with current system values
- Filled by foreman / workers in the shop
- Records: shop joint detail for the selected spool, heat numbers per
  component, weld points per joint, welder code per weld point
- When fully filled + signed → user enters “Fabricated” status in
  Easy Piping; the form is the source of truth

**PipeQC gap:** no QC13 generation today. This is a **strong demo
artifact**: clickable button that produces a PDF stamped with project
header, spool ID, date, signature block. High perceived fidelity for
investor demo, low engineering cost (jsPDF / Puppeteer).

Add as candidate: **Track G5 — QC13 generator.**

### Material traceability popup (heat number flow)

User flow in `weld/progress`:

1. Foreman writes heat numbers on the printed QC13
1. User opens “Material traceability” popup for the spool
1. User enters each heat number
1. System validates against **Project Piping Material List**
   (referential 3.12, currently seed-only in PipeQC)
1. Invalid heat numbers are **rejected at entry** — the record is
   not accepted into the system
1. When all heats are entered + valid, the spool’s “Material check”
   status flips to ✅ automatically

**PipeQC gaps:**

- Project Piping Material List is seed-only; no admin CRUD
- Heat number validation popup doesn’t exist on weld progress screen
- “Material check” status is not derived from heat number completeness

### Welding progress — WPS qualification check (definitive flow)

When user enters welder code + WPS on a joint:

1. System looks up welder qualifications referential (3.6)
1. Checks if welder is qualified for the selected WPS
1. **If not qualified → alert** (per #4 wording: “the system gives an
   alert”)
1. Open question still: is it a soft alert (warning, allows save) or
   hard block? #4 doesn’t specify. Default assumption: warning.

**PipeQC current:** welder qualifications library exists in seed but
this validation is not wired into weld progress entry. Wiring it is a
~half-day task and a strong demo moment.

### Multiple welders per joint (definitive shape)

Per #4 verbatim: _“In case of two weld points for one joint, the user
can enter different information for the two points (multi welder etc.)”_

So the model is:

```
Joint
 ├─ Weld point 1 (welder A, WPS-X, heat-123, …)
 └─ Weld point 2 (welder B, WPS-Y, heat-456, …)
```

Not “two welders on the same weld” but “two weld points on the same
joint, each with its own welder”. This is consistent with the “root +
cap” weld layering common in industry.

**PipeQC current:** single welder field per joint. To support this we’d
need either a sub-table on the joint or a “weld points” entity.
Possible track: **Track G6 — Multi-point weld entry.**

### Fabrication reports (5 production reports)

| Report                | Granularity     | Use                                   |
| --------------------- | --------------- | ------------------------------------- |
| Weekly progress – Fab | Cumulative      | By Type (LB/SB) × Material            |
| Fabrication           | Per design area | Spooling / Material / Fab steps in DI |
| Summary               | Per spool       | Achievement dates for each step       |
| Spool                 | Per spool       | Trace graph for step analysis         |
| Welders Production    | Per welder      | Production between selected dates     |

**PipeQC has:** Fabrication Dashboard (KPI cards, charts) + reports
catalog. We cover 2/5 conceptually (Fabrication Progress, Welder
Performance Log). Missing: design-area breakdown report, trace-graph
per spool, weekly LB/SB/Material breakdown.

These are low-cost additions to the reports catalog. Worth adding 1–2
to flesh out the “reports” section before demo.

---

## #4 NDE — deep-dive findings (most important section)

### NDE Batch concept (DEFINITIVE)

Per #4 verbatim: _“A batch of weld is made by grouping the welds
executed by **one welder** belonging to a **particular NDE category**.”_

So:

```
Batch = (welder × NDE category) → set of welds
```

**Implications:**

- Batch boundaries are derived automatically from welder + NDE category
  fields on welds. Not user-defined.
- A welder can have multiple batches (one per NDE category they touch).
- Selection of welds to examine happens **within a batch**, not across.

**PipeQC current:** batches exist as an entity but the grouping logic
(welder × NDE category) is not surfaced explicitly in the data model
docs. Worth confirming in code + documenting.

### NDE rationale — tracer joint economics (DOMAIN INSIGHT)

Per #4 verbatim: _“3 additional joints have to be examined for each
weld defect of the welder \[i.e. 1 no. for repaired weld + 2 nos. for
additional samples (tracer joints)\].”_

This is the **economic argument** for QC: every weld defect costs you
3× the NDE examination work. Strong pitch-deck material:

> “One bad weld doesn’t cost one re-examination. It costs four:
> the original, the repair, and two tracer joints. PipeQC makes
> welder performance visible the day it happens — before tracer
> overhead compounds.”

### NDE100 vs sampled (NDE10/20) — distinct flows

| Category type      | Statuses                                                                            | Preparation flow |
| ------------------ | ----------------------------------------------------------------------------------- | ---------------- |
| Sampled (NDE10/20) | S (to select), SS (selected, awaiting), NR (result updated), ? (selection complete) | Batch management |
| 100% (NDE100)      | H (to select), HS (selected, awaiting)                                              | NDE100 screen    |

**PipeQC current:** stubs use a mixed status enum without this
distinction. **The dual-track status flow is a real domain rule** —
sampled and 100% categories don’t share the same state machine.

This answers the open question **“NDE batch S/SS/NR/T1/T2 statuses —
meaning + transitions”** definitively.

### NDE Preparation has 4 sub-functions

In NDE → Preparation tab, accessed via the “Joint to select” button
dropdown:

1. **Batch management** — manually pick welds within a batch; “Easy
   Piping suggestion” helper button suggests welds per percentages
1. **NDE100** — pick joints from 100% NDE categories
1. **Batch status** — visualize NDE status of joints ISO-wise; clicking
   a batch number opens it
1. **Issue examination program** — generate the printable request
   (`Request No` auto-assigned) for the lab/inspector

**PipeQC current:** stub. None of the four sub-functions are
implemented. **High-leverage demo build:** the “Easy Piping suggestion”
button. Easy to mock (random sampler weighted by NDE %), visually
striking, scratches the “AI/automation” itch for investors.

### Rejected joint flow (KEY — was not in manual)

When NDE result = R (rejected):

1. User enters: defect code + location of defect
1. Easy Piping **automatically creates a new joint** named with
   suffix `R1` (or `R2`, `R3`, `R4` on further rejection)
1. The new joint goes into the **100% NDE category** for the same
   method. Example: original joint failed RT10 → R1 joint is RT100.
1. The batch status flips back to “Joint to Select”
1. Joints of the batch transition to **T1** status (tracer 1)

**Tracer hierarchy:**

```
Original fail → T1 selected → if T1 fails → T1-1, T1-2 (tracer 1 level 2)
                                          → if T2 path → T2-1, T2-2
```

### Penalty shoot rule (DEFINITIVE — was an open question)

Per #4 verbatim: _“In a Batch When 2nd level Tracer (T1-1, T1-2, T2-1,
T2-2) **or** 4 joints are rejected in the examination, all the
remaining welds in this batch should be examined. All the remaining
joints are automatically selected by Easy Piping and joint status
changed to ‘SS’.”_

So the trigger is:

- **OR (a):** any 2nd-level tracer joint exists (T1-1 / T1-2 / T2-1 / T2-2)
- **OR (b):** 4 rejections within the batch

→ all remaining welds in batch auto-flip to SS, batch status flips
from “Joint to Select” to “Awaiting NDE”.

**PipeQC implication:** the penalty shoot concept exists today as a
referential in admin, but the auto-trigger logic doesn’t exist.
Implementation:

- One scheduled job (or batch-status setter) checks the trigger after
  every NDE result entry
- If trigger fires → bulk update joints in batch to SS

This is **the** flagship demo moment for the NDE module. Once built,
the demo narrative becomes: _“Watch what happens when this welder’s
4th joint fails in the same batch — the system pre-selects all
remaining welds for examination, no human intervention.”_

Add as candidate: **Track N4 — Penalty shoot automation.**

### NDE Quality reports (8 reports)

| Report                        | Pivot        | Purpose                                            |
| ----------------------------- | ------------ | -------------------------------------------------- |
| Batch status                  | Batch        | Released status per weld                           |
| Radiographic status           | Period       | % accepted/rejected/defects (weekly + cumulative)  |
| Outstanding Repairs           | Joint        | Joints awaiting repair + pending days              |
| Service class wise NDE status | Piping class | Examination percentage compliance check            |
| Spool wise NDE status         | Spool        | QC released? + corresponding QC/W10 report numbers |
| Outstanding NDE               | Joint        | Joints awaiting NDE + pending days                 |
| Radiographic film – Est. qty  | Joint        | Estimated RT films to shoot                        |
| Weld History sheet            | Spool        | Document for test pack — all welding + NDE records |

**Open questions answered:**

- “RT film quantity estimation — algorithm + UI?” → it’s **a report**,
  not a live UI element. Likely uses film quantity matrix (referential
  2.2) × joint count. Lower priority than I thought.

### NDE Welder monitoring reports (4 reports)

| Report                    | Use                                     |
| ------------------------- | --------------------------------------- |
| Perf. Control Sheet       | Per-welder weekly/cumulative stats      |
| Rej. and Repaired joints  | Repair backlog per welder               |
| Rej. and Tracers joints   | Penalty shoot backlog (T-series joints) |
| Batch status (per welder) | Examination status for a welder         |

**PipeQC coverage:** Welder Performance Log report covers ~25% of
Perf. Control Sheet. Other three are unimplemented.

### PipeQC gaps summary after #4 (NDE module)

| Easy Piping feature        | PipeQC status | Build effort    | Demo impact |
| -------------------------- | ------------- | --------------- | ----------- |
| Batch grouping logic       | Implicit      | None (document) | Low         |
| S/SS/NR vs H/HS dual flow  | Mixed enum    | Half day        | Medium      |
| Easy Piping suggestion btn | Missing       | Half day (mock) | High        |
| Issue examination program  | Missing       | 1 day (PDF gen) | Medium      |
| Auto-R1/R2 joint creation  | Missing       | 1 day           | High        |
| Tracer joint hierarchy     | Missing       | 1–2 days        | High        |
| Penalty shoot auto-trigger | Missing       | 1 day           | **Highest** |
| 8 quality reports          | 1/8           | 2 days for 3    | Medium      |

---

## Open questions resolved by #4

| Open Q                                | Resolution                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Penalty shoot — exact flow            | ✅ Resolved: 2nd-level tracer OR 4 rejections → auto-SS all                                                                                 |
| RT film quantity estimation           | ✅ Resolved: it’s a report, not a live UI element                                                                                           |
| Multiple welders per joint — UX shape | ✅ Resolved: joint has N weld points, each with own welder                                                                                  |
| NDE batch S/SS/NR/T1/T2 transitions   | ✅ Resolved: dual-flow (sampled vs 100%) with tracer chain                                                                                  |
| Tracer joint logic                    | ✅ Resolved: R1/R2/R3/R4 suffix + T1/T2 + T1-1/T1-2 levels                                                                                  |
| PWHT workflow                         | ⚠️ Partial: PWHT is listed in NDE functionalities but no specific flow described in #4. Likely covered later (Painting #10 or Test Pack #7) |

---

## #5 Spool Tracking — module-specific findings

### Module structure (definitive)

Spool tracking is a **transversal module** (not site-activity-based).
It has 3 sections + a dashboard on the homepage:

| Section                      | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| **Dashboard**                | Auto-shown on entering the module                     |
| **Data analysis**            | Spool/location/design-area exploration + flag reports |
| **Barcode printing**         | Export Excel list for external Zebra printing         |
| **Mobile device management** | PDA usage analytics                                   |

### Dashboard — 3 widget groups + 2 buttons

Top-level buttons: **Refresh** (update displayed data), **Print**
(print dashboard).

| Group                 | Widgets                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| **Tracking**          | Cumulative % spools scanned (≥1 scan / total project spools)                    |
|                       | # spools currently in scope (PSMS status "Start Fab" → "Erected") + trend arrow |
|                       | Avg PDA-computer sync count per day (last week) + trend arrow                   |
|                       | Curve of spool scans during the running month                                   |
| **Usage analysis**    | Spools scanned out of fabshop (red) vs all fabricated (PSMS status)             |
|                       | Repartition of spools across areas right after fabrication                      |
|                       | Spools scanned in paintshop (red) vs all painted (PSMS status)                  |
| **Area capacity map** | Map of locations filled with current quantities vs capacity                     |

**PipeQC current** (`components/spool-tracking-dashboard.tsx`): covers
scan-trend curve, area capacity tiles, PDA list. Missing:

- Cumulative % scanned KPI
- Fabshop/paintshop "scanned out/in (red)" usage analysis
- Repartition-right-after-fab widget
- Trend arrows on KPIs
- Refresh/print buttons (low priority for demo)

### Data analysis — 4 tabs (NEW vs current PipeQC)

The Data Analysis area is split into 4 tabs. PipeQC today has none of
these as a dedicated tab structure — only a flat spool list.

#### Tab 1 — Spool location

- Search by **isometric** (returns first spool of iso, scroll to
  siblings) OR by **barcode** (returns spool directly; click iso # to
  go up)
- Details panel:
  - Location + duration + tracking history
  - Spool description (material, WBU, etc.)
  - **Spool image** (visual UI element)
  - Location is clickable → opens spool list at that location
- "Add" button → manually modify current location → **creates a new
  history record** (audit-preserving, not destructive overwrite)
- Tracking history of **erected** spool is still viewable here
  (history persists; only excluded from active views)
- Print button

#### Tab 2 — Location

- Lists all locations; click → table of spools at that location
- Columns: iso, spool #, barcode, duration, flag
- Iso/spool/barcode all clickable → drill into spool detail
- **Erected spools NOT shown** (active view only)
- Print button

#### Tab 3 — Design area

- Lists all design areas; click → panel showing:
  - List of locations where this design area's spools sit
  - List of spools
  - **Image of the design area** (visual element — design-area map/sketch)
- Click a location within design area → spools at intersection
  (this area × this location)
- Erected spools NOT shown
- Print button

#### Tab 4 — Consolidation reports (flag reports)

Two distinct flag types:

| Flag type         | Trigger                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **Inconsistency** | PSMS status of spool ≠ expected location (e.g., painted spool still in fabshop) |
| **Inconsistency** | Erected spool has location scan AFTER erection date                             |
| **Transit out**   | Spool scanned OUT a location but NOT scanned IN somewhere else, **>2 days**     |

Click a location → table of flagged spools (iso, spool #, barcode,
duration, PSMS status). Print.

**Hardcoded domain rule:** 2-day transit threshold. Configurable per
project? Not stated. Likely candidate for project referential
(B4 — workflow step definition track, or new B5 — tracking rules).

### Barcode printing — Excel-then-Zebra workflow

**Key integration insight:** Easy Piping **does not print barcodes
itself**. It produces an Excel list; printing is done in **Zebra
software** externally.

UX shape (two-column basket pattern):

- Left: search by iso or barcode
- Right: basket (selected spools)
- Click "Export" → Excel sheet with all basket spools

**PipeQC implication:**

- Don't promise in-product barcode rendering. Match the export-to-Zebra
  pattern (industry-standard for thermal label printers).
- Two-column basket is a reusable UX pattern (also useful for Test Pack
  builder Track H — spool selection by iso).

### Mobile device management

Per-PDA analytics, driven by sync data:

- All PDAs from project referential listed
- Per device: most-frequent **user**, most-frequent **location**
- "Edit users" button → jumps to project referential PDA-users screen
- Print button

**PipeQC current:** PDA list shows id, operator, status, last sync,
battery — but **no usage analytics** (most-frequent user/location).
Battery + status are PipeQC additions not in Easy Piping (Easy Piping
relied on raw sync count). Worth keeping; demo-friendly.

### New cross-cutting findings from #5

#### CC-11. "Active spool" definition (formal)

Easy Piping's notion of a spool "currently being tracked":

- `Start Fab date IS NOT NULL` AND
- `Erection date IS NULL`

Used by: dashboard count, "Active Spool List" export to PDA, exclusion
filter on Location/Design Area tabs (erected spools dropped from active
views but their history is still queryable via Spool Location tab).

**PipeQC implication:** introduce an `is_active` derived flag on the
spool model + filter on dashboard/location views. Cheap to add.

#### CC-12. Offline-sync workflow (when no PDAs)

From the manual (cross-ref to #5):

- **Export:** Reports → Data Dump → Spool Tracking → 3 files (Active
  Spool List, Sub Locations, PDA users)
- **Import:** Import → Import Spool Tracking Data → reads `.txt` file
  from `C:\Kalipso Project Updates\TR0001\ToPC\` (Kalipso = PDA app)
- Validation: import dialog with "Export" (errors) and "Import"
  (proceed) buttons
- **Only System Admin and Project Admin** can do offline sync

**PipeQC implication:** offline-mode is an explicit Easy Piping
feature, not just "what if PDA is broken". Worth surfacing as a tile
on the Spool Tracking module for demo (even as static screenshot) —
shows enterprise field reality.

#### CC-13. External integrations in Spool Tracking

| Integration | Direction | Purpose                                |
| ----------- | --------- | -------------------------------------- |
| **Kalipso** | bi-dir    | PDA scanning app (text-file sync)      |
| **Zebra**   | export    | Barcode printing (consumes Excel list) |

PipeQC doesn't claim these today — but they're worth marking on the
pitch deck's "integrations" slide as "industry-standard endpoints."

### PipeQC gaps summary after #5 (Spool Tracking module)

| Easy Piping feature                                       | PipeQC status               | Effort            |
| --------------------------------------------------------- | --------------------------- | ----------------- |
| Dashboard: cumulative % scanned KPI                       | Missing                     | XS                |
| Dashboard: trend arrows on KPIs                           | Missing                     | S                 |
| Dashboard: fabshop/paintshop usage analysis               | Missing                     | M                 |
| Data analysis: 4-tab IA                                   | Flat view only              | M                 |
| Spool location tab: history + image + add-location button | Missing                     | M                 |
| Design area tab + design area image                       | Missing                     | M                 |
| Inconsistency rule engine (PSMS vs location)              | Flag column exists; no rule | M                 |
| 2-day transit-out rule                                    | Flag column exists; no rule | XS                |
| Barcode printing: 2-column basket → Excel                 | Missing                     | S                 |
| Mobile device mgmt: most-frequent user/loc                | Missing                     | XS                |
| Offline sync: text-file import/export                     | Missing                     | M (skip for demo) |

**Recommendation for demo:** add tab structure to Data Analysis (S→M),
plus inconsistency + transit-out rule engine (M). Skip offline sync.
Add cumulative % scanned KPI (XS) — strong demo headline.

### Note: Construction surveillance is NOT covered by #5

Important — per #1, "Spool tracking" and "Construction surveillance
(PDA-based)" are listed as **two separate transversal modules**.
Presentation #5 covers **only spool tracking** (location scanning).
Construction surveillance (checklist validation/rejection on PDA, with
weekly graph plotting per #1) is **still undocumented in the
presentation set so far**. Possibilities:

- Covered in #6 Erection (PDA-based field checks)
- Was a "module under development" — never delivered (per CC-7 pattern)
- Lives in a presentation we don't have

Keep the "Construction surveillance PDA checklists" open question alive
through #6 read.

---

## Open questions resolved by #5

| Open Q                                   | Resolution                                                 |
| ---------------------------------------- | ---------------------------------------------------------- |
| Spool tracking PDA workflow shape        | ✅ Resolved: 3 sections + dashboard, 4-tab data analysis   |
| Inconsistency flag logic                 | ✅ Resolved: PSMS status vs location mismatch (rule-based) |
| Transit-out flag threshold               | ✅ Resolved: hardcoded 2-day window                        |
| "Active spool" definition                | ✅ Resolved: Start Fab ≠ NULL AND Erection date = NULL     |
| Barcode printing — in-product or export? | ✅ Resolved: Excel export → external Zebra software        |
| Construction surveillance PDA checklists | ⚠️ NOT resolved by #5 — separate module, look in #6        |

---

## Open questions to answer in remaining presentations

Track these across #5–#10 reads:

1. ~~**PWHT workflow**~~ — _Partially answered #4. PWHT mentioned as
   NDE functionality but flow not detailed. Likely in #7 Test Pack or
   #10 Painting._
1. ~~**Penalty shoot**~~ → **✅ RESOLVED #4** (2nd-level tracer OR 4
   rejections → auto-SS all remaining)
1. ~~**RT film quantity estimation**~~ → **✅ RESOLVED #4** (it’s a
   report, uses film qty matrix × joint count)
1. ~~**Multiple welders per joint**~~ → **✅ RESOLVED #4** (N weld points
   per joint, each with own welder)
1. ~~**NDE batch S/SS/NR/T1/T2 statuses**~~ → **✅ RESOLVED #4** (dual
   flow: sampled vs 100%, with tracer chain)
1. ~~**Tracer joint logic**~~ → **✅ RESOLVED #4** (R1/R2/R3/R4 + T1/T2
   - T1-1/T1-2 hierarchy)
1. **Construction surveillance PDA checklists** — _NOT covered by #5
   (separate transversal module). Try #6 Erection next._
1. **Assembly vs Erection distinction** — what’s modular project? #9
   Assembly.
1. **Painting DFT measurement workflow** — #10 Painting.
1. **Test pack data model details** — #7 Test Pack.
1. **PSMS SpoolingDB schema** — entity relationships? #8 SpoolingDB.
1. **WPS qualification alert** — soft warning or hard block? Not
   specified in #4. Likely in #7 Test Pack or domain interviews.

---

## #6 Erection — module-specific findings

### Module structure & scope

1. The Erection module is divided into **4 sections** corresponding to on-site activities: **Spool Erection, Welding, NDE, Flange**.
1. Each of the 4 sections has **2 sub-modules**: **Preparation** (workload dispatch) and **Progress** (data entry).
1. **Critical TechnipFMC admission (verbatim):**
   > _"The preparations sub-modules allow the user to prepare the activity. For the moment, only the NDE – preparation is available in this module."_
   > So 3 of the 4 Preparation sub-modules (Spool Erection / Welding / Flange) were never built. Only Progress exists for those three. → Directly reinforces CC-1 (incomplete vendor product).
1. Org-chart positioning (full chain, verbatim from slide):
   - **Preparation** → **Fabrication** → **Erection** → **Pressure test**
   - Under **Preparation**: Spooling, Material, Test pack builder, Browse
   - Under **Fabrication**: Spool fabrication, Welding, NDE, Painting, **Assembly**, Spool Erection, Welding, NDE, Flange mgmt
   - Under **Erection**: Spool erection, Welding, NDE, Flange mgmt
   - Under **Pressure test**: Line check, Item clearance, Blinding, Reinstatement
1. Two-level progress tracking:
   - **Spool level** progress
   - **Welded-joint level** progress

### Status enums

**Spool-level status (Spool Erection screen) — ordered workflow:**

| #   | Status                                 |
| --- | -------------------------------------- |
| 1   | To site                                |
| 2   | Erected                                |
| 3   | Welded bolted                          |
| 4   | Supported                              |
| 5   | RFT (Ready For Test — auto-calculated) |

**Joint-level status (welding sequence):**

| #   | Status   |
| --- | -------- |
| 1   | Cutting  |
| 2   | Beveling |
| 3   | Fit-up   |
| 4   | Preheat  |
| 5   | Welding  |
| 6   | NDE      |

### Generic Progress-entry pattern (applies across all 4 sub-modules)

1. _"All the progress screen have the same functioning."_
1. Entry is at **isometric or barcode level** via an _"intelligent search field"_ (mandatory).
1. After search: summary of the item + grid of corresponding spools/joints. **"-" buttons** hide rows of the grid.
1. **Report section** in every screen — popup with custom options per report.
1. **"default date"** and **"date inputs assistance"** speed-fill controls for date columns.
1. **Excel template** for bulk progress import is available on every progress screen.

### A. Spool Erection sub-module

1. Two-step entry:
   - **A) To site + Erected** — first capture.
   - **B) Welded bolted + Supported** — second capture, after a printed progress form is signed off.
1. Verbatim workflow:
   > _"The progress form can be reprinted anytime with actual value in the system. After signature that all works are completed it will be used to enter the 'welded bolted' and 'supported' status of the spool."_
1. **RFT auto-calculation rule:**
   - Spool is welded-bolted **and** supported, **AND**
   - All joints' NDE and PWHT statuses are released
   - → RFT date is set automatically by the system.

### B. Welding sub-module

1. Scope filter: _"In Erection module, the weld progress screen will show only the field joints."_ (Shop joints are excluded — handled in Fabrication module.)
1. Driven by paper form **QC W24** — _"Welding daily progress and joint visual examination result report"_.
1. Form lifecycle: generated right after "Erected" date is recorded → printed → filled by workers → re-keyed into Easy Piping at Weld/Progress screen.
1. **WPS validation rule:** _"The system checks if reported welder is qualified to use the selected WPS … The system will alert the user if he records the incorrect information."_
1. **Multi-welder support per joint:** _"In case of two or more weld points for one joint, the user can enter different information for the two points (multi welder etc.)"_
1. Slide hyperlinks to a sub-document **`Piping weld point process.pptx`** (path `a/Piping%20weld%20point%20process.pptx`) — **not in our 10-deck set**. Flagged as open question.

### B-bis. Material traceability (inside Welding screen)

1. Heat numbers are filled on the printed progress form by the **foreman**.
1. Weld/Progress screen exposes a **"Material traceability" pop-up window**; clerk types heat numbers in.
1. Validation: _"Easy piping detects heat numbers not available in the referential and do not access these records"_ — i.e., system rejects unknown heat numbers.
1. Side effect: when heat numbers are correctly recorded, the **"material check"** status on the corresponding spools is **auto-populated**.

### C. Form QC W24 — "Generate the Form for progress reporting"

1. Generated from the Welding Report section.
1. _"It is the daily progress report form, at isometric level. It should be generated right after 'erected' date has been recorded."_
1. Allows filling field-joint detail for the selected spool.
1. Used as the physical document that ties Material Traceability + Welding Progress.

### D. NDE sub-module — objectives (verbatim)

> _"Insure the good performance of welding and NDE activities"_
> _"Track that NDE are executed on time and in accordance with Test Pack priorities"_
> _"Demonstrate that all control activity meets the requirement of the specifications"_

### D-bis. NDE functionalities (full verbatim list — pitch-deck material)

> _"Daily Progress Reporting"_
> _"Welder statistics and Performance Analysis"_
> _"Validation of the welder's qualification with the selected WPS for every joint"_
> _"Management of multiple welders for a single joint."_
> _"Selection of weld to be examined (progressive sampling of the examination) PSMS suggests welds to be examined considering the NDE percentages required and priorities."_
> _"Repair joint management"_
> _"Penalty shoot management"_
> _"RT film quantity estimations"_
> _"Work order for NDE and PWHT activities"_
> _"Repair Percentage and types of defects Monitoring"_
> _"NDT and PWHT Progress and Backlogs"_
> _"Material traceability records (Traceability number tracking)"_
> _"Spool Final QC Clearance tracking"_
> _"Balance work and bottleneck identification at every stage from fabrication to handover"_

Note: the deck calls the recommender **"PSMS"** — likely an older or sibling brand (Piping System Management Software?). Flagged as open question.

### D-ter. NDE Batch concept

1. **Definition (verbatim):** _"A batch of weld is made by grouping the welds executed by one welder belonging to a particular NDE category."_
1. **Release rule:** _"If result is accepted, the batch will be 'released'. It means that all joints related to the batch will have status 'released'."_
1. **Spool QC release rule:** _"A spool is 'QC release' when all joints belonging to the spool have a status 'released'."_
1. **Penalty rule (TechnipFMC business logic — verbatim):**
   > _"3 additional joints have to be examined for each weld defect of the welder [i.e. 1 no. for repaired weld + 2 nos. for additional samples (tracer joints)]"_
1. **Sampling specification (verbatim TechnipFMC standard, valuable for pitch deck):**
   > _"Spot or random examination of 10 or 20 % refers respectively to 10 or 20 welds done among 100 weld joints which are entirely examined on the whole circumference for each welder or welding operator. Examination shall be evenly shared between all diameters and thicknesses to be considered."_
1. Tagline:
   > _"Easy piping is managing the full process of NDE"_

### D-quater. NDE joint status enums

**Batch-management context:**

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| S    | Joint to be selected                     |
| SS   | Joint selected and awaiting examination  |
| NR   | Joint examination result updated         |
| ?    | Selection of joints completed in a Batch |

**NDE100 context (joints requiring 100 % examination):**

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| H    | Joint to be selected                    |
| HS   | Joint selected and awaiting examination |

**Rejection cascade / Tracer suffixes:**

1. On rejection, Easy Piping **auto-creates a new joint** suffixed `R1`, then `R2`, `R3`, `R4` on further rejection.
1. The new (R\*) joint is always placed in the corresponding **NDE100** category. Example: RT10 rejection → new joint in RT100.
1. Batch reverts from "Awaiting NDE" back to **"Joint to Select"**; existing joints in the batch become **T1** (tracer).
1. Second-level tracers: **T1-1, T1-2, T2-1, T2-2**.
1. **Auto-escalation rule (verbatim):**
   > _"In a Batch When 2nd level Tracer (T1-1 ,T1-2, T2-1, T2-2) or 4 joints are rejected in the examination, all the remaining welds in this batch should be examined"_
   > → All remaining joints auto-selected, status set to **SS**, surfaced in **Issue Examination** screen, batch status changes from "Joint to Select" to **"Awaiting NDE"**.

### D-5. NDE Preparation — 4 entry modes

All four are accessed from the **"Joint to select"** button → dropdown:

1. **Batch management** — pick NDE category → grid of batches in "batch level" section → select batch (status = S) → grid of joints appears right → checkbox joints (helper: **"Easy Piping suggestion"** button) → Save.
1. **NDE100** — pick NDE category → grid of all NDE100 joints in that category → checkbox → Save.
1. **Batch status** — visualize NDE status of joints **ISO-wise**; clicking a batch number expands it.
1. **Issue examination program** — pick NDE category → grid of selected joints → **Print** to create examination request → **Generate Report** button produces report with **request no.**

### D-6. NDE Progress entry

1. Submenu: **"examination progress"**.
1. Per-joint entry per NDE category tested.
1. **"Client request exam"** button for client-initiated re-examination, then enter progress.
1. Field **"Is Accepted"**: `A` = Accepted, `R` = Rejected.
1. On rejection: **"Defect code"** + **"Location of defect"** become required.

### D-7. NDE Quality Reports (exact report names — capture in full)

**For NDE management:**

| Report                        | What it does                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| Batch status                  | Released status of each weld regarding NDE                                                          |
| Radiographic status           | Statistics on % / number of joints / films accepted / rejected & defect types — weekly + cumulative |
| Outstanding Repairs           | All joints to be repaired with pending days since NDE done                                          |
| Service class wise NDE status | NDE status per piping class — for examination % compliance check                                    |
| Spool wise NDE status         | All spools' NDE status; QC released flag; QC and W10 report numbers                                 |
| Outstanding NDE               | Joints awaiting NDE reports + pending days since requested — backlog tracking                       |
| Radiographic film – Est. qty  | Estimated quantity of RT films to be shot                                                           |
| Weld History sheet            | Document inserted in test pack — full welding + NDE record                                          |

**For welder monitoring:**

| Report                  | What it does                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Perf. Control Sheet     | Per-welder weekly + cumulative stats: % / # joints welded / accepted / rejected / defect types |
| Rej. and Repaired joint | Per-welder joints to repair / repaired — repair backlog tracking                               |
| Rej. And Tracers joints | All rejected joints + corresponding tracers — penalty-shoot backlog                            |
| Batch status            | Examination status per welder                                                                  |

### E. Flange management sub-module

Editable fields per flange joint (search by isometric):

| Field          | Source                                                |
| -------------- | ----------------------------------------------------- |
| Jointing Value | Free entry                                            |
| Joint Date     | Free entry (default date / date assistance available) |
| Report number  | Free entry                                            |
| Jointer        | Dropdown from **project referential**                 |
| Tag number     | Free entry                                            |
| Method         | Predefined from project referential                   |
| Timing         | Predefined from project referential                   |
| Category       | Predefined from project referential                   |
| Reason         | Predefined from project referential                   |

1. **"+"** buttons add multiple joint-point details (multi-bolt-up shifts on the same flange).
1. All fields support bulk update via **Excel Template** (consistent with the cross-cutting pattern).

### Length / investment signal

#6 is a **moderately detailed** deck — substantial on NDE (batch concept, tracer logic, ~8 reports, ~4 preparation screens) but **noticeably thin** on Spool Erection itself (just 2 sub-screens A/B) and on Flange (one screen). Welding gets 3 screens but leans on QC W24 paper form. This investment skew matches CC-1: TechnipFMC's R&D went into the inspection/QC side of erection (where regulatory pressure is highest), while the actual physical-progress workflows were left as thin clerical screens. **Pitch implication:** PipeQC's biggest UX wins are on Spool Erection / Flange / Welding progress (huge upside over EP), while NDE is where we have to be at-least-on-par with EP's batch and tracer logic (no shortcuts).

---

## Cross-cutting findings updates (from #6)

### CC-8. Reinforces CC-1: even the core Erection module is incomplete

TechnipFMC explicitly states only 1 of 4 Preparation sub-modules (NDE) was built. Spool-Erection / Welding / Flange Preparation are missing entirely. This is a vendor admission of incomplete product, on a module that should be the heart of a piping construction tool. Strong pitch material: _"the original vendor never finished even their own flagship workflow."_

### CC-9. The Excel template is the universal bulk-entry escape hatch

Every progress screen in #6 (and seen in #1–#5) exposes an _"excel template to import progress"_. Excel is the de-facto integration layer. **PipeQC parity requirement:** every progress screen needs paste-to-grid + .xlsx upload + dry-run/validation preview.

### CC-10. Universal "isometric or barcode" intelligent search

Every Erection screen anchors on an _"intelligent search field"_ keyed on **isometric ID or barcode**. PipeQC implication: global "find by ISO / barcode" autocomplete should be a shared component, not per-screen.

### CC-11. Speed-of-entry pattern: default-date + date-inputs-assistance

Implies users batch-enter many dates (backfill clerical workflow, not real-time). PipeQC: sticky default date, bulk apply to selection, keyboard-only flow.

### CC-12. Paper-form pivot points — no mobile/PDA in Erection

The QC W24 form is the canonical Welding handoff between desktop and field. Workflow: desktop generates → print → site/foreman fills (heat numbers, welder IDs, results) → clerk re-keys at desktop. **No mobile / no PDA / no offline capture anywhere in #6.** PipeQC opportunity: digitize the W24 with offline mobile capture + photo of marked-up isometric.

### CC-13. Referential-driven dropdowns

Jointer, Method, Timing, Category, Reason are all _"predefined values come from the project referential"_. Confirms a project-level master-data layer feeds every form. PipeQC: project referential as a first-class admin module (consolidates with #2/#3 Project Setup).

### CC-14. Internal brand inconsistency: "PSMS"

NDE functionalities slide says _"PSMS suggests welds to be examined"_. This is a different name from "Easy Piping" / "Easy Plant Piping" used everywhere else. Likely a legacy brand for the underlying engine. Useful pitch-deck observation: _"TechnipFMC inconsistently branded the product across its own training material — symptom of a tool that lost ownership internally."_

### CC-15. Hidden sub-deck — referenced document not in our set

Slide hyperlinks to **`Piping weld point process.pptx`** (relative path `a/Piping%20weld%20point%20process.pptx`). Not in the 10 we have. Worth searching Drive folder for it.

### CC-16. Tracer / penalty-shoot business logic = real competitive moat

The R1/R2/R3/R4 auto-suffixing + T1-1…T2-2 tracer cascade + 4-rejections-auto-escalation is non-trivial industry logic — not the kind of thing a generic ERP captures. Capturing this correctly is a PipeQC differentiator vs. "build it in Excel".

---

## Open questions resolved by #6

| Open Q (from #5 and prior)                                         | Resolution                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Construction surveillance PDA checklists — covered in #6 Erection? | ❌ **Not in #6.** No PDA, no handheld, no scanning, no checklist-on-device anywhere in the Erection module. Erection is desktop-only, isometric/barcode lookup, manual entry or Excel import. Paper QC W24 is the only field artifact. Keep open through #7 Test Pack and #8/#9/#10.                                                                                                   |
| Assembly vs Erection distinction — modular projects?               | ⚠️ **Partial.** Org-chart unambiguously places **Assembly** under **Fabrication** (alongside Spool Fabrication / Welding / NDE / Painting), while **Spool Erection** sits under the on-site **Erection** module. Strong inference: Assembly = pre-assembly of spool sub-groups in a shop/yard (modular work); Erection = on-site placement. Definitive answer expected in #9 Assembly. |
| Any PDA / mobile / GPS / map view in field ops?                    | ❌ **None visible in #6.**                                                                                                                                                                                                                                                                                                                                                             |
| Welder qualification + multi-welder per joint                      | ✅ **Confirmed.** WPS vs welder validated automatically; multi-weld-points per joint with independent welders.                                                                                                                                                                                                                                                                         |
| Material traceability via heat numbers                             | ✅ **Confirmed.** Heat-number popup at weld/progress; system rejects unknown heat numbers; auto-populates spool "material check" status.                                                                                                                                                                                                                                               |
| Spool Tracking (#5) → Erection handoff                             | ✅ **Confirmed unidirectional.** "To site" is the entry status into Erection — i.e., the handoff point from Spool Tracking.                                                                                                                                                                                                                                                            |
| Forward link to Test Pack (#7)                                     | ✅ **Confirmed.** NDE generates **"Weld History sheet"** explicitly described as _"Document to insert in test pack — records of all welding and NDE"_. NDE outputs feed Test Pack.                                                                                                                                                                                                     |

---

## Open questions to answer in remaining presentations (updated after #6)

1. ~~**PWHT workflow**~~ — _Partially answered #4. PWHT mentioned as
   NDE functionality but flow not detailed. #6 confirms PWHT is a gate
   for RFT auto-calculation but no PWHT-specific screen shown. Likely
   in #7 Test Pack or #10 Painting._
1. ~~**Penalty shoot**~~ → **✅ RESOLVED #4** (2nd-level tracer OR 4
   rejections → auto-SS all remaining)
1. ~~**RT film quantity estimation**~~ → **✅ RESOLVED #4** (it's a
   report, uses film qty matrix × joint count)
1. ~~**Multiple welders per joint**~~ → **✅ RESOLVED #4 + confirmed #6**
   (N weld points per joint, each with own welder)
1. ~~**NDE batch S/SS/NR/T1/T2 statuses**~~ → **✅ RESOLVED #4 +
   confirmed #6** (dual flow: sampled vs 100%, with tracer chain)
1. ~~**Tracer joint logic**~~ → **✅ RESOLVED #4 + confirmed #6**
   (R1/R2/R3/R4 + T1/T2 + T1-1/T1-2 hierarchy)
1. **Construction surveillance PDA checklists** — ❌ NOT in #5, NOT in
   #6. Likely never built, or in a deck we don't have. **Try #7–#10.**
1. **Assembly vs Erection distinction** — ⚠️ Partial from #6 (Assembly
   under Fabrication, Erection under site). Definitive: **#9 Assembly.**
1. **Painting DFT measurement workflow** — #10 Painting.
1. **Test pack data model details** — #7 Test Pack.
1. **PSMS SpoolingDB schema** — entity relationships? #8 SpoolingDB.
1. **WPS qualification alert** — soft warning or hard block? #6 says
   _"alert the user"_ but unclear if hard-block. Try #7.
1. **NEW: "PSMS" brand name** — older/sibling brand? Watch in remaining
   decks.
1. **NEW: `Piping weld point process.pptx`** — referenced sub-deck,
   not in our 10. Search Drive folder before #7 read.
1. **NEW: W10 report number** — referenced under "Spool wise NDE
   status" but never defined. Likely a Technip QC form code.
1. **NEW: PWHT entry screen** — #6 references PWHT as RFT gate and as
   NDE functionality ("Work order for NDE and PWHT activities") but
   shows no PWHT-specific UI. Where is PWHT entered?
1. **NEW: Penalty-shoot management UI** — described as functionality
   but no UI screenshot in #6. Look for in QC-focused decks.

---

_Last updated: 2026-05-21. Next read: #7 Easy Piping Test Pack._

---

## #7 Test Pack — module-specific findings

### Module structure & scope

1. The Pressure Tests module is divided into **5 sections** corresponding to on-site activities: **Line Check, Item Clearance, Blinding, Testing & Pre-commissioning, Reinstatement**.
1. **Sub-module split is non-uniform** — breaks the universal Prep+Progress pattern (CC-9) in one place:

| Section                     | Preparation | Progress |
| --------------------------- | :---------: | :------: |
| Line check                  |     ✅      |    ✅    |
| Item clearance              |     ✅      |    ✅    |
| Blinding                    |     ✅      |    ✅    |
| Testing & pre-commissioning | ❌ **none** |    ✅    |
| Reinstatement               |     ✅      |    ✅    |

Vendor explicitly states _"Easy piping does not manage the preparation of the testing and pre-commissioning"_ — only date entry. The actual test execution is an external workflow (handled by commissioning team / 3rd-party); Easy Piping just records dates that gate downstream Y/Z reinstatement.

1. **Multi-level follow-up** — different activities tracked at different granularities (a deliberate data-model choice, not an accident):

| Activity            | Tracked at level |
| ------------------- | ---------------- |
| Line checking       | TP + isometric   |
| Item clearance      | TP + isometric   |
| Blinding            | Test pack        |
| Testing             | Test pack        |
| Pre-commissioning   | Test pack        |
| Reinstatement (Y/Z) | **Flange joint** |

### Test Pack Homepage (the module dashboard)

- Tracks 4 activities: line checking, item clearance, testing, reinstatement.
- For each: quantities at TP / iso / flange-joint level, in two states:
  - **"Ready"** — what is ready to be done (eligible, not yet dispatched)
  - **"Ongoing"** — what has been sent to be done (assigned, not yet completed)
- Progress curves + backlogs per activity.
- Filters at top of page apply globally to both curves and backlogs.
- Print button at top.
- **"Show test pack explorer"** button → drill into a TP.

### Test Pack Explorer — 7 tabs across 3 navigation levels

The Explorer is the central UI of this module. Navigation: click TP # → drill to iso level. Click iso # → drill to spool level. Click system-subsystem → back up. Left/right arrows scroll between siblings at each level.

**TP level (4 tabs):**

| Tab                  | Content                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| General              | Rev # (auto), Test planned date, Test medium, Unit of time (calc), Volume (optional) |
| Release tracking     | Backlog quantities + clickable drilldowns to weld/bolt/NDE/line-check screens        |
| Operation management | Dates for blinding/testing/reinstatement + category Y/Z item counts                  |
| Progress status      | % completion: Construction / Line check / Testing / Reinstatement                    |

**Iso level (2 tabs):**

| Tab              | Content                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Spool status     | Status of each spool in TP, by iso. Numeric code (e.g. `12 = Ready For Test`) + tooltip + RAG |
| Isometric status | Per-iso dates + per-iso quantities — computed from spools that actually belong to this TP     |

**Spool level (1 tab):**

| Tab                   | Content                              |
| --------------------- | ------------------------------------ |
| Spool status detailed | Per-spool detailed status, RAG-coded |

### The RFT (Ready For Test) gate logic — explicitly stated for the first time

This is the single most important business-logic finding in the whole research set so far. The deck spells it out unambiguously:

```
ISO_COMPLETE = (all spools supported) AND (all spools welded & bolted)
QC_RELEASED  = (all welded joints NDE released) AND (all welded joints PWHT released)
ISO_RFT      = QC_RELEASED AND ISO_COMPLETE AND LINE_CHECK_DONE AND (all Cat-X items cleared)
TP_RFT       = ALL(iso ∈ TP).ISO_RFT
```

Every prep sub-module's eligibility filter chains off this:

- Blinding prep shows **only RFT test packs**.
- Item clearance prep shows **only iso/TPs with punch items recorded AND line check completed date**.
- Line check prep shows **only iso/TPs not yet line checked**.

### Punch list categories X / Y / Z — explicit semantics

The deck finally pins down what was previously inferred:

| Cat | Meaning                                         | Gate / trigger                                  |
| --- | ----------------------------------------------- | ----------------------------------------------- |
| X   | To be cleared **before** testing                | **Blocks RFT** until all X cleared              |
| Y   | Reinstatement **after testing, before** pre-com | Triggered when "Testing done" date entered      |
| Z   | Reinstatement **after** pre-commissioning       | Triggered when "Pre-commissioning" date entered |

Punch item structure (recorded during line-check progress):

- Item # (auto-numbered)
- Checking date
- Category (X / Y / Z)
- Localization: isometric + spool
- Punch code (from project referential — auto-fills description; description is editable)

### Recurring sub-module UI patterns

All 4 prep sub-modules (line check / item clearance / blinding / reinstatement) follow the same shape:

1. Search section with activity-specific eligibility filter (see RFT gate logic above)
2. Team selector (line checker / finishing team / blinding team / reinstatement team)
3. Assign one or several iso/TP/joint
4. **"Generate request"** button → printable work order PDF
5. Report section + dashboard at top of every prep screen

The 4 generated documents:

- Line check request
- Item clearance request
- Blinding request
- Reinstatement request

### Testing / pre-commissioning special case

No prep — only a progress screen for date entry on a TP:

- Testing start date
- Testing done date
- Pre-commissioning date

These dates are the **triggers** for the Y/Z reinstatement workflows. They are also the only mechanism by which the testing activity is represented in the system at all.

### Reinstatement progress data

Per flange joint:

- Joint date
- Report number
- Jointer
- Tag number

### Length / investment signal

#7 is a **content-dense, well-developed deck** — substantially more polished than #6 Erection. Test Pack is clearly a heavy-investment module for Easy Piping: complex gate logic, 7-tab explorer, multi-level navigation, 4 work-order generation flows, 3-tier punch categorization, multi-trigger reinstatement. **Pitch implication:** Test Pack is the most complex module PipeQC has to match. This is where Track H needs significant investment — the RFT gate engine alone is non-trivial.

---

## Cross-cutting findings updates (from #7)

### CC-17. The "Generate Request" pattern is universal — print-driven work dispatch

Every prep sub-module in #7 (and #6 per CC-12) follows the same physical loop:

```
Desktop assign work → "Generate Request" → print PDF
  → foreman receives paper → field crew executes
  → foreman returns paper → clerk re-keys in progress sub-module
```

**PipeQC implication:** every prep sub-module needs a "Generate Work Order PDF" action — this is the physical-world bridge Easy Piping users rely on, and skipping it is a parity gap. Digitizing this loop (offline mobile workorder + photo signoff) is also a clear PipeQC opportunity (reinforces CC-12).

### CC-18. RFT (Ready For Test) gate = the central business logic of the entire system

Crystallized in #7 but applies system-wide. The RFT gate calculation is the single most-referenced piece of business logic in Easy Piping. It cuts across every module:

- Spool Erection feeds it (iso complete)
- Welding feeds it (joints welded)
- NDE feeds it (joints released)
- PWHT feeds it (joints PWHT-released)
- Line check feeds it (line check done)
- Item clearance feeds it (X items cleared)

**PipeQC implication:** this should be a first-class derived field on every iso/TP record, recomputed via a domain event handler on every upstream event — not an ad-hoc query. Worth designing for from day one. It is also the **headline KPI on the Test Pack homepage**.

### CC-19. Numeric status code + tooltip + RAG color = universal status display pattern

#7 explicitly shows `12 = Ready For Test` with tooltip. RAG (red/orange/green) color coding reused across multi-level explorer tabs. **PipeQC implication:** standardize on `(numeric_code, label, color)` status triple as a shared badge component across the app. Reduces UI surface area and gives the product its visual signature.

### CC-20. Punch category gating = master sequencer for the post-fab phase

X/Y/Z categories aren't a labeling convention — they're a **sequencer**. Each category's gate state determines whether the next activity can start:

- X: blocks testing
- Y: blocks pre-commissioning
- Z: blocks final closeout

Combined with CC-18 (RFT), this is the second-most-critical piece of business logic in the system. PipeQC must encode X/Y/Z as a typed enum, each with its own gate behavior, not as a generic priority label.

---

## Open questions resolved by #7

| Open Q                                        | Resolution                                                                                                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test pack data model details                  | ✅ **Resolved.** TP = (rev #, planned date, medium, unit-of-time, volume). TP contains isometrics; isometrics contain spools; flange joints belong to isometrics. Punch items keyed on (iso, spool, TP) with Cat X/Y/Z. |
| PWHT workflow — where entered?                | ⚠️ **Still partial.** #7 confirms PWHT is a gate input (`all welded joints NDE/PWHT released`) but no PWHT entry screen shown. Likely embedded in NDE batch screens (#4) or in #10 Painting. Keep open.                 |
| Construction surveillance PDA checklists      | ❌ **Still not found.** No PDA / mobile in Test Pack module either. Pattern continues — increasingly looks like never-built (CC-7 / CC-8 vendor-incomplete pattern).                                                    |
| WPS qualification alert — hard block or soft? | ❌ Not addressed in #7. Try #8.                                                                                                                                                                                         |

---

## Open questions to answer in remaining presentations (updated after #7)

1. ~~**Test pack data model details**~~ → **✅ RESOLVED #7**
1. **PWHT entry screen** — still missing. #7 confirms it as a gate input but no UI. Try #10 Painting.
1. **Construction surveillance PDA checklists** — ❌ not in #5/#6/#7. Try #8 SpoolingDB or #9 Assembly.
1. **Assembly vs Erection distinction** — definitive answer expected in #9.
1. **Painting DFT measurement workflow** — #10.
1. **PSMS SpoolingDB schema** — #8.
1. **WPS qualification alert — hard block or soft warning?** — try #8.
1. **`Piping weld point process.pptx`** — sub-deck, still missing from Drive folder.
1. **W10 report number** — still undefined.
1. **Penalty-shoot management UI** — still missing.
1. **NEW: Where does the punch-code referential live?** — X/Y/Z categories + punch codes need admin somewhere. Probably already covered in #2/#3 Project Setup referential (worth re-checking those notes).
1. **NEW: Shared print-template engine?** — every prep sub-module generates a PDF work order. Is there a shared template engine in the architecture? Worth probing #8 if it covers infra.

---

_Last updated: 2026-05-21. Next read: #8 PSMS SpoolingDB._

---

## How to use this file in a new chat session

If continuing in a new chat:

1. Run `project_knowledge_search` with query `presentation findings research log`.
1. Read this file fully before continuing presentation reads.
1. Resume from the first row in the source files table.
1. Append findings to this file after each read. **Do not
   restructure** — only append within existing sections or add new
   ones for cross-cutting findings.

---
