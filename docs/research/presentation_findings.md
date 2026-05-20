# Easy Piping Presentations — Research Findings Log

> Durable record of domain insights extracted from the 10 Easy Piping
> presentations in the user’s Google Drive (folder “Piping”). Designed to
> survive across chat sessions — if continued in a new chat,
> `project_knowledge_search` should surface this file.
> 
> **Drop into `docs/research/presentation_findings.md` of the PipeQC repo
> after each session that appends new findings.**

-----

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

-----

## Methodology

- Read presentations **sequentially** (1 → 10) — do not skip. Each
  presentation builds on the previous (the user’s directive 2026-05-20).
- For each: three buckets — cross-cutting findings, module-specific
  findings, gaps in PipeQC.
- Append to this file after every read. **Do not overwrite.**

-----

## Source files

Google Drive folder ID: `1Ml-7gCf-mJ5YQ92hOr7I1lPw80_QzAH2`

|# |File                                       |Status           |
|--|-------------------------------------------|-----------------|
|1 |`1.PSMS overview_1511017.pptx`             |✅ Read 2026-05-20|
|2 |`2.EasyPiping Administration_1511017.pptx` |✅ Read 2026-05-20|
|3 |`3.EasyPiping Preparation_1511017.pptx`    |✅ Read 2026-05-20|
|4 |`4.EasyPiping Fabrication _10032021.pptx`  |✅ Read 2026-05-20|
|5 |`5.EasyPiping Spool tracking_10032021.pptx`|✅ Read 2026-05-20|
|6 |`6.EasyPiping Erection_10032021.pptx`      |⏳ Pending        |
|7 |`7.Easy Piping Test Pack_10032021.pptx`    |⏳ Pending        |
|8 |`8.PSMS_SpoolingDB_10032021.pptx`          |⏳ Pending        |
|9 |`9.EasyPiping Assembly_09022020.pptx`      |⏳ Pending        |
|10|`10.EasyPiping Painting_10032021 (1).pptx` |⏳ Pending        |

-----

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

|Tier               |Role           |Scope                             |PipeQC current                   |
|-------------------|---------------|----------------------------------|---------------------------------|
|Admin              |System Admin   |Cross-project + system referential|✅ `system_admin` (merged)        |
|Admin              |Project Admin  |One project, no system ref        |⚠️ merged into `system_admin`     |
|Admin              |Site Admin     |Parallel to Project Admin         |⚠️ merged into `system_admin`     |
|Editor             |Project Editor |Production data, no admin         |Split into functional sub-roles  |
|Editor (functional)|QC Engineer    |Welds, NDE, QC sign-off           |✅ `qc_engineer`                  |
|Editor (functional)|NDE Inspector  |Batches, results                  |✅ `nde_inspector`                |
|Editor (functional)|Project Manager|Reports, dashboards               |✅ `project_manager`              |
|Editor (functional)|Spooling Team  |Spooling, revisions               |✅ `spooling_team`                |
|Editor (functional)|PDA User       |Mobile barcode/checklists         |❌ not implemented                |
|Restricted         |Subcontractor  |PDS area locked                   |✅ `subcontractor` (no scope lock)|
|Restricted         |Project Reader |Read-only                         |❌ not implemented                |

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

|Metric             |Total  |Largest unit|
|-------------------|-------|------------|
|Spooled ISOs issued|5,003  |2,447       |
|Spools             |23,168 |12,105      |
|Shop Dia Inch      |325,970|158,599     |
|Assembly Dia Inch  |59,382 |29,614      |
|Field Dia Inch     |30,599 |11,886      |
|Total Dia Inch     |415,951|200,099     |
|Prefab % of DI     |78%    |79%         |

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

|Activity                                                              |Owner             |
|----------------------------------------------------------------------|------------------|
|Project setup (Piping class, NDE matrix, weld type, rework, thickness)|Spooling Team (TP)|
|Define WPS, welder qualifications                                     |Subcontractor     |
|Import spool data from SpoolGen                                       |Spooling Team (TP)|
|Import material/paint from SPMAT                                      |TP                |
|ISO modifications (HO rev)                                            |Spooling Team     |
|ISO modifications (Site rev)                                          |TP + Subcontractor|
|Daily reports (welding, painting, spools, NDE)                        |Subcontractor     |
|Report analysis                                                       |TP + Subcontractor|
|Weekly spool selection                                                |TP                |
|Daily manhours + progress                                             |Subcontractor     |
|Productivity calc                                                     |TP + Subcontractor|
|NDE weld selection per system suggestions                             |Subcontractor     |
|Progressive sampling / penalty shoot                                  |Subcontractor     |
|Examination program                                                   |Subcontractor     |
|Material traceability records                                         |Subcontractor     |
|QC forms, weld history register                                       |Subcontractor     |
|Welder statistics                                                     |TP + Subcontractor|
|Backlog tracking                                                      |TP + Subcontractor|
|Surveillance via PDA                                                  |TP                |
|Statistics analysis (surveillance)                                    |TP                |
|Area Mapping (Spool Tracking)                                         |Subcontractor     |
|System setup (Spool Tracking)                                         |TP                |
|Barcode + scanning                                                    |Subcontractor     |
|Movement analysis                                                     |TP + Subcontractor|

**Use for role × function matrix when we build it (after all 10
presentations are read).**

### CC-9. Preparation/Progress sub-module split (universal pattern)

From #4: every fabrication activity in Easy Piping is divided into two
sub-modules:

|Sub-module     |Purpose                                             |
|---------------|----------------------------------------------------|
|**Preparation**|Workload dispatch — prepare the activity            |
|**Progress**   |Data entry — record progress of the activity        |

Applies to: Spool fabrication, Welding, NDE, Painting (also Assembly
and Erection activities).

**Status in Easy Piping itself:** only **NDE-Preparation** is fully
implemented. Welding, Spool fab, Painting — Preparation tabs exist
structurally but functionality not delivered. This is a “module under
development” situation acknowledged by TechnipFMC.

**PipeQC implication:**

- This is the right IA pattern to adopt for activity pages. Spool
  fabrication / Welding / NDE / Painting each should have two tabs:
  *Preparation* and *Progress*.
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

But the comment is explicit: *“Definition of each steps to agreed
before project start.”*

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

-----

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

- *“A tool to manage the entire life cycle of piping construction
  activities, by monitoring and controlling step by step, each and every
  fabrication and QC activity in sequence.”*
- *“Improve the overall piping performance. Technip and Subcontractor(s)
  to work in close collaboration.”*
- *“Construction surveillance: do what we can / do what we should do.”*
- *“Auditable readiness.”*
- *“Manhours and progress.”*

-----

## #2 Administration — module-specific findings

### Admin module = 5 sub-sections

1. **Project definition** — create project, project list (system admin only)
1. **System referential** — cross-project parameters (system admin only)
1. **Project referential** — 26 items, project admin
1. **Define access rights** — user roles per project (system admin)
1. **Import settings** — Excel templates per referential (project admin)

### System referential (4 items, system admin only)

|§  |Item                       |Notes                                              |
|---|---------------------------|---------------------------------------------------|
|2.1|Material type              |Add/edit/delete                                    |
|2.2|Film quantity per diameter |Read-only matrix, by pipe size × thickness         |
|2.3|UT calculation coefficients|Coef diam by diameter, Coef rating by flange rating|
|2.4|Torquing method            |Used by Flange management                          |

PipeQC status: **0/4 — none of these are surfaced.**

### Project referential (26 items, project admin)

Full list with PipeQC coverage status:

|§   |Item                          |PipeQC          |
|----|------------------------------|----------------|
|3.1 |Subcontractor List            |✅ B1            |
|3.2 |Progress Weight Factor        |❌               |
|3.3 |Area Classification           |❌               |
|3.4 |PDS Area / Subcontractor      |❌               |
|3.5 |WPS List                      |✅ B2 (read-only)|
|3.6 |Welder Qualification          |✅ B1 (read-only)|
|3.7 |Service Class / Material Type |❌               |
|3.8 |Weld Type List                |❌               |
|3.9 |NDE Matrix                    |✅ B2 (read-only)|
|3.10|Rework Code                   |✅ B2            |
|3.11|Thickness                     |❌               |
|3.12|Project Piping Material List  |❌ (seed only)   |
|3.13|Joint Category Definition     |✅ B2 (read-only)|
|3.14|Unit of time reference        |❌               |
|3.15|Jointer List                  |✅ B1            |
|3.16|Blinding Team                 |✅ B1            |
|3.17|Finishing Team                |✅ B1            |
|3.18|Reinstatement Team            |✅ B1            |
|3.19|System                        |❌ (B3 candidate)|
|3.20|Sub System                    |❌ (B3 candidate)|
|3.21|Line Checker Team             |✅ B1            |
|3.22|Location Category             |❌               |
|3.23|Location                      |❌               |
|3.24|Devices (mobile)              |❌               |
|3.25|PDA Users                     |❌               |
|3.26|Unit Classification           |❌               |
|—   |Pressure unit                 |❌               |
|—   |Line service                  |❌               |
|—   |RAL Code                      |❌               |
|—   |Paint Code Matrix             |❌               |
|—   |Spooling Material Type        |❌               |
|—   |Spooling Piping Class Material|❌               |
|—   |Spooling Check List           |❌               |

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

-----

## #3 Preparation — module-specific findings

### Preparation module = 4 sub-sections

1. Spooling (file imports)
1. Material (Marian file imports)
1. Browse (data exploration + revision management)
1. Test pack builder

### Spooling — 4 file imports from SpoolGen

When SpoolGen export is not auto-pulled, manual upload via 4 tabs:

|File       |Content                                 |
|-----------|----------------------------------------|
|`weld.txt` |Spooling file — ISO/spool/weld structure|
|`trace.txt`|Ident code file — material traceability |
|`bolt.txt` |Bolting file — flange joints            |
|`supp.txt` |Support file — pipe supports            |

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

|Field            |ISO-level           |Spool-level            |
|-----------------|--------------------|-----------------------|
|Iso No           |`2P9-28-HCX-1000-01`|`S2P9-28-HCX-1000-01`  |
|Spool No         |`03`                |`SP01..SP05`           |
|Issue Status     |`INCOMPLETE`        |`03`                   |
|Weight (kg)      |empty               |`2342.99`, `4155.91`, …|
|Completion Status|empty               |`TO COMPLETE`          |

**Data hierarchy confirmed:** ISO has N spools; weight + completion live
at spool level; ISO carries top-level metadata only.

**PipeQC implication:** material data is **upstream**. We seed manually
today; in real product would integrate Marian via CSV. Useful for
“integrations” pitch slide.

### Browse — explore + revision management

Two parallel browse trees:

|Tree          |Levels                    |
|--------------|--------------------------|
|ISO/Spool/Weld|Latest data + History data|
|Flange joint  |Single browse             |

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

-----

## #4 Fabrication — module-specific findings

### Fabrication module = 4 sub-sections × 2 sub-modules

|Activity         |Preparation       |Progress|
|-----------------|------------------|--------|
|Spool fabrication|empty (not built) |✅      |
|Welding          |empty (not built) |✅      |
|NDE              |✅ (full)          |✅      |
|Painting         |empty (not built) |✅      |

Only NDE has a complete Preparation experience in Easy Piping. The
others are structural stubs.

### Fabrication progresses at two levels

|Level             |Statuses (customizable)                                                              |
|------------------|-------------------------------------------------------------------------------------|
|**Spool level**   |Start fabrication → MIR issued → Material checked → Fabricated → Fab QC released → Send to Site → Painting|
|**Joint level**   |Cutting → Beveling → Fit-up → Preheat → Welding → NDE → QC                           |

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

|Status      |Trigger                                                          |Auto/Manual|
|------------|-----------------------------------------------------------------|-----------|
|Start fab   |User enters date                                                 |Manual     |
|MIR issued  |Material Issue Request delivered to subcontractor                |Manual     |
|Material check|Heat numbers in QC13 form match referential                   |**Auto**   |
|Fabricated  |QC13 form signed by all parties                                  |Manual     |
|QC release  |All joints in spool have NDE status “released”                   |**Auto**   |

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

Per #4 verbatim: *“In case of two weld points for one joint, the user
can enter different information for the two points (multi welder etc.)”*

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

|Report                  |Granularity     |Use                                |
|------------------------|----------------|-----------------------------------|
|Weekly progress – Fab   |Cumulative      |By Type (LB/SB) × Material         |
|Fabrication             |Per design area |Spooling / Material / Fab steps in DI|
|Summary                 |Per spool       |Achievement dates for each step    |
|Spool                   |Per spool       |Trace graph for step analysis      |
|Welders Production      |Per welder      |Production between selected dates  |

**PipeQC has:** Fabrication Dashboard (KPI cards, charts) + reports
catalog. We cover 2/5 conceptually (Fabrication Progress, Welder
Performance Log). Missing: design-area breakdown report, trace-graph
per spool, weekly LB/SB/Material breakdown.

These are low-cost additions to the reports catalog. Worth adding 1–2
to flesh out the “reports” section before demo.

-----

## #4 NDE — deep-dive findings (most important section)

### NDE Batch concept (DEFINITIVE)

Per #4 verbatim: *“A batch of weld is made by grouping the welds
executed by **one welder** belonging to a **particular NDE category**.”*

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

Per #4 verbatim: *“3 additional joints have to be examined for each
weld defect of the welder \[i.e. 1 no. for repaired weld + 2 nos. for
additional samples (tracer joints)\].”*

This is the **economic argument** for QC: every weld defect costs you
3× the NDE examination work. Strong pitch-deck material:

> “One bad weld doesn’t cost one re-examination. It costs four:
> the original, the repair, and two tracer joints. PipeQC makes
> welder performance visible the day it happens — before tracer
> overhead compounds.”

### NDE100 vs sampled (NDE10/20) — distinct flows

|Category type     |Statuses                                                                |Preparation flow            |
|------------------|------------------------------------------------------------------------|----------------------------|
|Sampled (NDE10/20)|S (to select), SS (selected, awaiting), NR (result updated), ? (selection complete)|Batch management |
|100% (NDE100)     |H (to select), HS (selected, awaiting)                                  |NDE100 screen               |

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

Per #4 verbatim: *“In a Batch When 2nd level Tracer (T1-1, T1-2, T2-1,
T2-2) **or** 4 joints are rejected in the examination, all the
remaining welds in this batch should be examined. All the remaining
joints are automatically selected by Easy Piping and joint status
changed to ‘SS’.”*

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
the demo narrative becomes: *“Watch what happens when this welder’s
4th joint fails in the same batch — the system pre-selects all
remaining welds for examination, no human intervention.”*

Add as candidate: **Track N4 — Penalty shoot automation.**

### NDE Quality reports (8 reports)

|Report                       |Pivot          |Purpose                                              |
|-----------------------------|---------------|-----------------------------------------------------|
|Batch status                 |Batch          |Released status per weld                             |
|Radiographic status          |Period         |% accepted/rejected/defects (weekly + cumulative)    |
|Outstanding Repairs          |Joint          |Joints awaiting repair + pending days                |
|Service class wise NDE status|Piping class   |Examination percentage compliance check              |
|Spool wise NDE status        |Spool          |QC released? + corresponding QC/W10 report numbers   |
|Outstanding NDE              |Joint          |Joints awaiting NDE + pending days                   |
|Radiographic film – Est. qty |Joint          |Estimated RT films to shoot                          |
|Weld History sheet           |Spool          |Document for test pack — all welding + NDE records   |

**Open questions answered:**

- “RT film quantity estimation — algorithm + UI?” → it’s **a report**,
  not a live UI element. Likely uses film quantity matrix (referential
  2.2) × joint count. Lower priority than I thought.

### NDE Welder monitoring reports (4 reports)

|Report                  |Use                                       |
|------------------------|------------------------------------------|
|Perf. Control Sheet     |Per-welder weekly/cumulative stats        |
|Rej. and Repaired joints|Repair backlog per welder                 |
|Rej. and Tracers joints |Penalty shoot backlog (T-series joints)   |
|Batch status (per welder)|Examination status for a welder           |

**PipeQC coverage:** Welder Performance Log report covers ~25% of
Perf. Control Sheet. Other three are unimplemented.

### PipeQC gaps summary after #4 (NDE module)

|Easy Piping feature        |PipeQC status     |Build effort   |Demo impact|
|---------------------------|------------------|---------------|-----------|
|Batch grouping logic       |Implicit          |None (document)|Low        |
|S/SS/NR vs H/HS dual flow  |Mixed enum        |Half day       |Medium     |
|Easy Piping suggestion btn |Missing           |Half day (mock)|High       |
|Issue examination program  |Missing           |1 day (PDF gen)|Medium     |
|Auto-R1/R2 joint creation  |Missing           |1 day          |High       |
|Tracer joint hierarchy     |Missing           |1–2 days       |High       |
|Penalty shoot auto-trigger |Missing           |1 day          |**Highest**|
|8 quality reports          |1/8               |2 days for 3   |Medium     |

-----

## Open questions resolved by #4

|Open Q                                  |Resolution                                                |
|----------------------------------------|----------------------------------------------------------|
|Penalty shoot — exact flow              |✅ Resolved: 2nd-level tracer OR 4 rejections → auto-SS all|
|RT film quantity estimation             |✅ Resolved: it’s a report, not a live UI element          |
|Multiple welders per joint — UX shape   |✅ Resolved: joint has N weld points, each with own welder |
|NDE batch S/SS/NR/T1/T2 transitions     |✅ Resolved: dual-flow (sampled vs 100%) with tracer chain |
|Tracer joint logic                      |✅ Resolved: R1/R2/R3/R4 suffix + T1/T2 + T1-1/T1-2 levels |
|PWHT workflow                           |⚠️ Partial: PWHT is listed in NDE functionalities but no specific flow described in #4. Likely covered later (Painting #10 or Test Pack #7) |

-----

## #5 Spool Tracking — module-specific findings

### Module structure (definitive)

Spool tracking is a **transversal module** (not site-activity-based).
It has 3 sections + a dashboard on the homepage:

|Section                       |Purpose                                              |
|------------------------------|-----------------------------------------------------|
|**Dashboard**                 |Auto-shown on entering the module                    |
|**Data analysis**             |Spool/location/design-area exploration + flag reports|
|**Barcode printing**          |Export Excel list for external Zebra printing        |
|**Mobile device management**  |PDA usage analytics                                  |

### Dashboard — 3 widget groups + 2 buttons

Top-level buttons: **Refresh** (update displayed data), **Print**
(print dashboard).

|Group                |Widgets                                                                          |
|---------------------|---------------------------------------------------------------------------------|
|**Tracking**         |Cumulative % spools scanned (≥1 scan / total project spools)                     |
|                     |# spools currently in scope (PSMS status "Start Fab" → "Erected") + trend arrow  |
|                     |Avg PDA-computer sync count per day (last week) + trend arrow                    |
|                     |Curve of spool scans during the running month                                    |
|**Usage analysis**   |Spools scanned out of fabshop (red) vs all fabricated (PSMS status)              |
|                     |Repartition of spools across areas right after fabrication                       |
|                     |Spools scanned in paintshop (red) vs all painted (PSMS status)                   |
|**Area capacity map**|Map of locations filled with current quantities vs capacity                      |

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

|Flag type        |Trigger                                                                                |
|-----------------|---------------------------------------------------------------------------------------|
|**Inconsistency**|PSMS status of spool ≠ expected location (e.g., painted spool still in fabshop)        |
|**Inconsistency**|Erected spool has location scan AFTER erection date                                    |
|**Transit out** |Spool scanned OUT a location but NOT scanned IN somewhere else, **>2 days**            |

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

|Integration|Direction|Purpose                                  |
|-----------|---------|-----------------------------------------|
|**Kalipso**|bi-dir   |PDA scanning app (text-file sync)        |
|**Zebra**  |export   |Barcode printing (consumes Excel list)   |

PipeQC doesn't claim these today — but they're worth marking on the
pitch deck's "integrations" slide as "industry-standard endpoints."

### PipeQC gaps summary after #5 (Spool Tracking module)

|Easy Piping feature                                       |PipeQC status              |Effort           |
|----------------------------------------------------------|---------------------------|-----------------|
|Dashboard: cumulative % scanned KPI                       |Missing                    |XS               |
|Dashboard: trend arrows on KPIs                           |Missing                    |S                |
|Dashboard: fabshop/paintshop usage analysis               |Missing                    |M                |
|Data analysis: 4-tab IA                                   |Flat view only             |M                |
|Spool location tab: history + image + add-location button |Missing                    |M                |
|Design area tab + design area image                       |Missing                    |M                |
|Inconsistency rule engine (PSMS vs location)              |Flag column exists; no rule|M                |
|2-day transit-out rule                                    |Flag column exists; no rule|XS               |
|Barcode printing: 2-column basket → Excel                 |Missing                    |S                |
|Mobile device mgmt: most-frequent user/loc                |Missing                    |XS               |
|Offline sync: text-file import/export                     |Missing                    |M (skip for demo)|

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

-----

## Open questions resolved by #5

|Open Q                                  |Resolution                                                |
|----------------------------------------|----------------------------------------------------------|
|Spool tracking PDA workflow shape       |✅ Resolved: 3 sections + dashboard, 4-tab data analysis  |
|Inconsistency flag logic                |✅ Resolved: PSMS status vs location mismatch (rule-based)|
|Transit-out flag threshold              |✅ Resolved: hardcoded 2-day window                        |
|"Active spool" definition               |✅ Resolved: Start Fab ≠ NULL AND Erection date = NULL    |
|Barcode printing — in-product or export?|✅ Resolved: Excel export → external Zebra software        |
|Construction surveillance PDA checklists|⚠️ NOT resolved by #5 — separate module, look in #6        |

-----

## Open questions to answer in remaining presentations

Track these across #5–#10 reads:

1. ~~**PWHT workflow**~~ — *Partially answered #4. PWHT mentioned as
   NDE functionality but flow not detailed. Likely in #7 Test Pack or
   #10 Painting.*
1. ~~**Penalty shoot**~~ → **✅ RESOLVED #4** (2nd-level tracer OR 4
   rejections → auto-SS all remaining)
1. ~~**RT film quantity estimation**~~ → **✅ RESOLVED #4** (it’s a
   report, uses film qty matrix × joint count)
1. ~~**Multiple welders per joint**~~ → **✅ RESOLVED #4** (N weld points
   per joint, each with own welder)
1. ~~**NDE batch S/SS/NR/T1/T2 statuses**~~ → **✅ RESOLVED #4** (dual
   flow: sampled vs 100%, with tracer chain)
1. ~~**Tracer joint logic**~~ → **✅ RESOLVED #4** (R1/R2/R3/R4 + T1/T2
   + T1-1/T1-2 hierarchy)
1. **Construction surveillance PDA checklists** — *NOT covered by #5
   (separate transversal module). Try #6 Erection next.*
1. **Assembly vs Erection distinction** — what’s modular project? #9
   Assembly.
1. **Painting DFT measurement workflow** — #10 Painting.
1. **Test pack data model details** — #7 Test Pack.
1. **PSMS SpoolingDB schema** — entity relationships? #8 SpoolingDB.
1. **WPS qualification alert** — soft warning or hard block? Not
   specified in #4. Likely in #7 Test Pack or domain interviews.

-----

## How to use this file in a new chat session

If continuing in a new chat:

1. Run `project_knowledge_search` with query `presentation findings research log`.
1. Read this file fully before continuing presentation reads.
1. Resume from the first ⏳ row in the source files table.
1. Append findings to this file after each read. **Do not
   restructure** — only append within existing sections or add new
   ones for cross-cutting findings.

-----

*Last updated: 2026-05-20. Next read: #6 EasyPiping Erection.*