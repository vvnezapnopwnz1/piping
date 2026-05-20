# Easy Piping Presentations — Research Findings Log

> Durable record of domain insights extracted from the 10 Easy Piping
> presentations in the user's Google Drive (folder "Piping"). Designed to
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
  integration shape) the manual doesn't visualize.
- **Real project benchmarks** (PMP project statistics) usable for TAM and
  scale claims.
- **Customer-facing language** for the pitch deck.

This file captures findings the manual alone does not give us.

---

## Methodology

- Read presentations **sequentially** (1 → 10) — do not skip. Each
  presentation builds on the previous (the user's directive 2026-05-20).
- For each: three buckets — cross-cutting findings, module-specific
  findings, gaps in PipeQC.
- Append to this file after every read. **Do not overwrite.**

---

## Source files

Google Drive folder ID: `1Ml-7gCf-mJ5YQ92hOr7I1lPw80_QzAH2`

| # | File | Status |
|---|---|---|
| 1 | `1.PSMS overview_1511017.pptx` | ✅ Read 2026-05-20 |
| 2 | `2.EasyPiping Administration_1511017.pptx` | ✅ Read 2026-05-20 |
| 3 | `3.EasyPiping Preparation_1511017.pptx` | ✅ Read 2026-05-20 |
| 4 | `4.EasyPiping Fabrication _10032021.pptx` | ⏳ Pending |
| 5 | `5.EasyPiping Spool tracking_10032021.pptx` | ⏳ Pending |
| 6 | `6.EasyPiping Erection_10032021.pptx` | ⏳ Pending |
| 7 | `7.Easy Piping Test Pack_10032021.pptx` | ⏳ Pending |
| 8 | `8.PSMS_SpoolingDB_10032021.pptx` | ⏳ Pending |
| 9 | `9.EasyPiping Assembly_09022020.pptx` | ⏳ Pending |
| 10 | `10.EasyPiping Painting_10032021 (1).pptx` | ⏳ Pending |

---

## Cross-cutting findings (apply across multiple modules)

### CC-1. Competitive positioning

- TechnipFMC **exited** the piping QC market. Easy Piping is no longer
  sold or maintained.
- **No direct competitor** to PipeQC currently exists.
- Treat Easy Piping as **domain reference**, not competitive threat.
- "Why now" slide framing: incumbent didn't finish (multiple "modules
  under development") and then left the market entirely.

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

| Tier | Role | Scope | PipeQC current |
|---|---|---|---|
| Admin | System Admin | Cross-project + system referential | ✅ `system_admin` (merged) |
| Admin | Project Admin | One project, no system ref | ⚠️ merged into `system_admin` |
| Admin | Site Admin | Parallel to Project Admin | ⚠️ merged into `system_admin` |
| Editor | Project Editor | Production data, no admin | Split into functional sub-roles |
| Editor (functional) | QC Engineer | Welds, NDE, QC sign-off | ✅ `qc_engineer` |
| Editor (functional) | NDE Inspector | Batches, results | ✅ `nde_inspector` |
| Editor (functional) | Project Manager | Reports, dashboards | ✅ `project_manager` |
| Editor (functional) | Spooling Team | Spooling, revisions | ✅ `spooling_team` |
| Editor (functional) | PDA User | Mobile barcode/checklists | ❌ not implemented |
| Restricted | Subcontractor | PDS area locked | ✅ `subcontractor` (no scope lock) |
| Restricted | Project Reader | Read-only | ❌ not implemented |

**8 effective roles** for PipeQC role × function matrix.

### CC-4. Subcontractor scope lock pattern

**Critical multi-tenant pattern not yet in PipeQC.**

From #2: "Subcontractor dropdown lists in all screens to be disabled and
set the selected value as logged-in subcontractor."

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

| Metric | Total | Largest unit |
|---|---|---|
| Spooled ISOs issued | 5,003 | 2,447 |
| Spools | 23,168 | 12,105 |
| Shop Dia Inch | 325,970 | 158,599 |
| Assembly Dia Inch | 59,382 | 29,614 |
| Field Dia Inch | 30,599 | 11,886 |
| Total Dia Inch | 415,951 | 200,099 |
| Prefab % of DI | 78% | 79% |

Use for pitch slide on **scale** / **TAM bottom-up** / **cost of the
problem**.

### CC-7. "Production" module — never finished by Easy Piping

From #1 (multiple slides mark as "under development"):

Production module was supposed to:

- System set up with erection sequence at spool level
- Calculate equivalent working quantities for "fair" dispatch
- Display remaining qualified workfront
- Display current available qualified workfront
- Issue weekly production schedule per activity

**This was never delivered by Easy Piping.** Potential differentiation
angle for PipeQC if we choose to scope it later.

### CC-8. SOW deployment matrix (who does what, from #1)

Canonical role × work area split from Easy Piping deployment:

| Activity | Owner |
|---|---|
| Project setup (Piping class, NDE matrix, weld type, rework, thickness) | Spooling Team (TP) |
| Define WPS, welder qualifications | Subcontractor |
| Import spool data from SpoolGen | Spooling Team (TP) |
| Import material/paint from SPMAT | TP |
| ISO modifications (HO rev) | Spooling Team |
| ISO modifications (Site rev) | TP + Subcontractor |
| Daily reports (welding, painting, spools, NDE) | Subcontractor |
| Report analysis | TP + Subcontractor |
| Weekly spool selection | TP |
| Daily manhours + progress | Subcontractor |
| Productivity calc | TP + Subcontractor |
| NDE weld selection per system suggestions | Subcontractor |
| Progressive sampling / penalty shoot | Subcontractor |
| Examination program | Subcontractor |
| Material traceability records | Subcontractor |
| QC forms, weld history register | Subcontractor |
| Welder statistics | TP + Subcontractor |
| Backlog tracking | TP + Subcontractor |
| Surveillance via PDA | TP |
| Statistics analysis (surveillance) | TP |
| Area Mapping (Spool Tracking) | Subcontractor |
| System setup (Spool Tracking) | TP |
| Barcode + scanning | Subcontractor |
| Movement analysis | TP + Subcontractor |

**Use for role × function matrix when we build it (after all 10
presentations are read).**

---

## #1 PSMS overview — module-specific findings

### Easy Piping main organization

**Main modules** (site-activity-based):

1. **Preparation**
   - Spooling
   - Material
   - Test pack builder
2. **Fabrication**
   - Spool fabrication
   - Welding
   - NDE
   - Painting
3. **Assembly** (for modular projects — new module post-2020)
   - Spool Erection
   - Welding
   - NDE
   - Flange management
   - Painting Progress
   - Assembly Dashboard
4. **Erection**
   - Spool erection
   - Welding
   - NDE
   - Flange management
   - Erection Dashboard
5. **Pressure test**
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

Use for "module coverage" slide with ✅/⚠️/❌ vs PipeQC.

### Welding & NDE management features (full list from #1)

15 functions explicitly named:

1. Daily Progress Reporting
2. Welder statistics and Performance Analysis
3. Validation of welder's qualification with selected WPS per joint
4. Multiple welders for single joint
5. Selection of weld to be examined (progressive sampling)
6. Repair joint management
7. Penalty shoot management
8. RT film quantity estimations
9. Work order for NDE and PWHT activities
10. Repair Percentage and types of defects Monitoring
11. NDT Progress and Backlogs
12. PWHT Progress and backlogs
13. Material traceability records (Heat number tracking)
14. Spool Final QC Clearance tracking
15. Balance work and bottleneck identification

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

- *"A tool to manage the entire life cycle of piping construction
  activities, by monitoring and controlling step by step, each and every
  fabrication and QC activity in sequence."*
- *"Improve the overall piping performance. Technip and Subcontractor(s)
  to work in close collaboration."*
- *"Construction surveillance: do what we can / do what we should do."*
- *"Auditable readiness."*
- *"Manhours and progress."*

---

## #2 Administration — module-specific findings

### Admin module = 5 sub-sections

1. **Project definition** — create project, project list (system admin only)
2. **System referential** — cross-project parameters (system admin only)
3. **Project referential** — 26 items, project admin
4. **Define access rights** — user roles per project (system admin)
5. **Import settings** — Excel templates per referential (project admin)

### System referential (4 items, system admin only)

| § | Item | Notes |
|---|---|---|
| 2.1 | Material type | Add/edit/delete |
| 2.2 | Film quantity per diameter | Read-only matrix, by pipe size × thickness |
| 2.3 | UT calculation coefficients | Coef diam by diameter, Coef rating by flange rating |
| 2.4 | Torquing method | Used by Flange management |

PipeQC status: **0/4 — none of these are surfaced.**

### Project referential (26 items, project admin)

Full list with PipeQC coverage status:

| § | Item | PipeQC |
|---|---|---|
| 3.1 | Subcontractor List | ✅ B1 |
| 3.2 | Progress Weight Factor | ❌ |
| 3.3 | Area Classification | ❌ |
| 3.4 | PDS Area / Subcontractor | ❌ |
| 3.5 | WPS List | ✅ B2 (read-only) |
| 3.6 | Welder Qualification | ✅ B1 (read-only) |
| 3.7 | Service Class / Material Type | ❌ |
| 3.8 | Weld Type List | ❌ |
| 3.9 | NDE Matrix | ✅ B2 (read-only) |
| 3.10 | Rework Code | ✅ B2 |
| 3.11 | Thickness | ❌ |
| 3.12 | Project Piping Material List | ❌ (seed only) |
| 3.13 | Joint Category Definition | ✅ B2 (read-only) |
| 3.14 | Unit of time reference | ❌ |
| 3.15 | Jointer List | ✅ B1 |
| 3.16 | Blinding Team | ✅ B1 |
| 3.17 | Finishing Team | ✅ B1 |
| 3.18 | Reinstatement Team | ✅ B1 |
| 3.19 | System | ❌ (B3 candidate) |
| 3.20 | Sub System | ❌ (B3 candidate) |
| 3.21 | Line Checker Team | ✅ B1 |
| 3.22 | Location Category | ❌ |
| 3.23 | Location | ❌ |
| 3.24 | Devices (mobile) | ❌ |
| 3.25 | PDA Users | ❌ |
| 3.26 | Unit Classification | ❌ |
| — | Pressure unit | ❌ |
| — | Line service | ❌ |
| — | RAL Code | ❌ |
| — | Paint Code Matrix | ❌ |
| — | Spooling Material Type | ❌ |
| — | Spooling Piping Class Material | ❌ |
| — | Spooling Check List | ❌ |

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
2. NDE Matrix
3. Project Piping Material List
4. Spooling Images (zip, ≤4 MB)
5. Spooling Material Type
6. Spooling Class Material

None implemented in PipeQC. Could be a "data ingestion" slide for the
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
2. Material (Marian file imports)
3. Browse (data exploration + revision management)
4. Test pack builder

### Spooling — 4 file imports from SpoolGen

When SpoolGen export is not auto-pulled, manual upload via 4 tabs:

| File | Content |
|---|---|
| `weld.txt` | Spooling file — ISO/spool/weld structure |
| `trace.txt` | Ident code file — material traceability |
| `bolt.txt` | Bolting file — flange joints |
| `supp.txt` | Support file — pipe supports |

**PipeQC gap:** spooling shell has import/validation for one file
concept. Need 4 separate import tabs OR clear "this matches your
SpoolGen output" framing.

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

| Field | ISO-level | Spool-level |
|---|---|---|
| Iso No | `2P9-28-HCX-1000-01` | `S2P9-28-HCX-1000-01` |
| Spool No | `03` | `SP01..SP05` |
| Issue Status | `INCOMPLETE` | `03` |
| Weight (kg) | empty | `2342.99`, `4155.91`, ... |
| Completion Status | empty | `TO COMPLETE` |

**Data hierarchy confirmed:** ISO has N spools; weight + completion live
at spool level; ISO carries top-level metadata only.

**PipeQC implication:** material data is **upstream**. We seed manually
today; in real product would integrate Marian via CSV. Useful for
"integrations" pitch slide.

### Browse — explore + revision management

Two parallel browse trees:

| Tree | Levels |
|---|---|
| ISO/Spool/Weld | Latest data + History data |
| Flange joint | Single browse |

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

## Open questions to answer in remaining presentations

Track these across #4–#10 reads:

1. **PWHT workflow** — referenced in weld panel today but no flow. #4
   Fabrication likely details it.
2. **Penalty shoot** — what is the exact flow? #4 Fabrication.
3. **RT film quantity estimation** — algorithm + UI? #4 Fabrication.
4. **Multiple welders per joint** — UX shape? #4 Fabrication.
5. **NDE batch S/SS/NR/T1/T2 statuses** — meaning + transitions? #4
   Fabrication or dedicated NDE deep-dive.
6. **Tracer joint logic** — full flow per #4 / #7.
7. **Construction surveillance PDA checklists** — #5 Spool tracking.
8. **Assembly vs Erection distinction** — what's modular project? #9
   Assembly.
9. **Painting DFT measurement workflow** — #10 Painting.
10. **Test pack data model details** — #7 Test Pack.
11. **PSMS SpoolingDB schema** — entity relationships? #8 SpoolingDB.

---

## How to use this file in a new chat session

If continuing in a new chat:

1. Run `project_knowledge_search` with query `presentation findings
   research log`.
2. Read this file fully before continuing presentation reads.
3. Resume from the first ⏳ row in the source files table.
4. Append findings to this file after each read. **Do not
   restructure** — only append within existing sections or add new
   ones for cross-cutting findings.

---

*Last updated: 2026-05-20. Next read: #4 EasyPiping Fabrication.*
