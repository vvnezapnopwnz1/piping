## #6 Erection — module-specific findings

### Module structure & scope

1. The Erection module is divided into **4 sections** corresponding to on-site activities: **Spool Erection, Welding, NDE, Flange**.
1. Each of the 4 sections has **2 sub-modules**: **Preparation** (workload dispatch) and **Progress** (data entry).
1. **Critical TechnipFMC admission (verbatim):**
   > *"The preparations sub-modules allow the user to prepare the activity. For the moment, only the NDE – preparation is available in this module."*
   So 3 of the 4 Preparation sub-modules (Spool Erection / Welding / Flange) were never built. Only Progress exists for those three. → Directly reinforces CC-1 (incomplete vendor product).
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

| # | Status |
|---|--------|
| 1 | To site |
| 2 | Erected |
| 3 | Welded bolted |
| 4 | Supported |
| 5 | RFT (Ready For Test — auto-calculated) |

**Joint-level status (welding sequence):**

| # | Status |
|---|--------|
| 1 | Cutting |
| 2 | Beveling |
| 3 | Fit-up |
| 4 | Preheat |
| 5 | Welding |
| 6 | NDE |

### Generic Progress-entry pattern (applies across all 4 sub-modules)

1. *"All the progress screen have the same functioning."*
1. Entry is at **isometric or barcode level** via an *"intelligent search field"* (mandatory).
1. After search: summary of the item + grid of corresponding spools/joints. **"-" buttons** hide rows of the grid.
1. **Report section** in every screen — popup with custom options per report.
1. **"default date"** and **"date inputs assistance"** speed-fill controls for date columns.
1. **Excel template** for bulk progress import is available on every progress screen.

### A. Spool Erection sub-module

1. Two-step entry:
   - **A) To site + Erected** — first capture.
   - **B) Welded bolted + Supported** — second capture, after a printed progress form is signed off.
1. Verbatim workflow:
   > *"The progress form can be reprinted anytime with actual value in the system. After signature that all works are completed it will be used to enter the 'welded bolted' and 'supported' status of the spool."*
1. **RFT auto-calculation rule:**
   - Spool is welded-bolted **and** supported, **AND**
   - All joints' NDE and PWHT statuses are released
   - → RFT date is set automatically by the system.

### B. Welding sub-module

1. Scope filter: *"In Erection module, the weld progress screen will show only the field joints."* (Shop joints are excluded — handled in Fabrication module.)
1. Driven by paper form **QC W24** — *"Welding daily progress and joint visual examination result report"*.
1. Form lifecycle: generated right after "Erected" date is recorded → printed → filled by workers → re-keyed into Easy Piping at Weld/Progress screen.
1. **WPS validation rule:** *"The system checks if reported welder is qualified to use the selected WPS … The system will alert the user if he records the incorrect information."*
1. **Multi-welder support per joint:** *"In case of two or more weld points for one joint, the user can enter different information for the two points (multi welder etc.)"*
1. Slide hyperlinks to a sub-document **`Piping weld point process.pptx`** (path `a/Piping%20weld%20point%20process.pptx`) — **not in our 10-deck set**. Flagged below.

### B-bis. Material traceability (inside Welding screen)

1. Heat numbers are filled on the printed progress form by the **foreman**.
1. Weld/Progress screen exposes a **"Material traceability" pop-up window**; clerk types heat numbers in.
1. Validation: *"Easy piping detects heat numbers not available in the referential and do not access these records"* — i.e., system rejects unknown heat numbers.
1. Side effect: when heat numbers are correctly recorded, the **"material check"** status on the corresponding spools is **auto-populated**.

### C. Form QC W24 — "Generate the Form for progress reporting"

1. Generated from the Welding Report section.
1. *"It is the daily progress report form, at isometric level. It should be generated right after 'erected' date has been recorded."*
1. Allows filling field-joint detail for the selected spool.
1. Used as the physical document that ties Material Traceability + Welding Progress.

### D. NDE sub-module — objectives (verbatim)

> *"Insure the good performance of welding and NDE activities"*
> *"Track that NDE are executed on time and in accordance with Test Pack priorities"*
> *"Demonstrate that all control activity meets the requirement of the specifications"*

### D-bis. NDE functionalities (full verbatim list — pitch-deck material)

> *"Daily Progress Reporting"*
> *"Welder statistics and Performance Analysis"*
> *"Validation of the welder's qualification with the selected WPS for every joint"*
> *"Management of multiple welders for a single joint."*
> *"Selection of weld to be examined (progressive sampling of the examination) PSMS suggests welds to be examined considering the NDE percentages required and priorities."*
> *"Repair joint management"*
> *"Penalty shoot management"*
> *"RT film quantity estimations"*
> *"Work order for NDE and PWHT activities"*
> *"Repair Percentage and types of defects Monitoring"*
> *"NDT and PWHT Progress and Backlogs"*
> *"Material traceability records (Traceability number tracking)"*
> *"Spool Final QC Clearance tracking"*
> *"Balance work and bottleneck identification at every stage from fabrication to handover"*

Note: the deck calls the recommender **"PSMS"** — likely an older or sibling brand (Piping System Management Software?). Flagged below.

### D-ter. NDE Batch concept

1. **Definition (verbatim):** *"A batch of weld is made by grouping the welds executed by one welder belonging to a particular NDE category."*
1. **Release rule:** *"If result is accepted, the batch will be 'released'. It means that all joints related to the batch will have status 'released'."*
1. **Spool QC release rule:** *"A spool is 'QC release' when all joints belonging to the spool have a status 'released'."*
1. **Penalty rule (TechnipFMC business logic — verbatim):**
   > *"3 additional joints have to be examined for each weld defect of the welder [i.e. 1 no. for repaired weld + 2 nos. for additional samples (tracer joints)]"*
1. **Sampling specification (verbatim TechnipFMC standard, valuable for pitch deck):**
   > *"Spot or random examination of 10 or 20 % refers respectively to 10 or 20 welds done among 100 weld joints which are entirely examined on the whole circumference for each welder or welding operator. Examination shall be evenly shared between all diameters and thicknesses to be considered."*
1. Tagline:
   > *"Easy piping is managing the full process of NDE"*

### D-quater. NDE joint status enums

**Batch-management context:**

| Code | Meaning |
|------|---------|
| S | Joint to be selected |
| SS | Joint selected and awaiting examination |
| NR | Joint examination result updated |
| ? | Selection of joints completed in a Batch |

**NDE100 context (joints requiring 100 % examination):**

| Code | Meaning |
|------|---------|
| H | Joint to be selected |
| HS | Joint selected and awaiting examination |

**Rejection cascade / Tracer suffixes:**

1. On rejection, Easy Piping **auto-creates a new joint** suffixed `R1`, then `R2`, `R3`, `R4` on further rejection.
1. The new (R*) joint is always placed in the corresponding **NDE100** category. Example: RT10 rejection → new joint in RT100.
1. Batch reverts from "Awaiting NDE" back to **"Joint to Select"**; existing joints in the batch become **T1** (tracer).
1. Second-level tracers: **T1-1, T1-2, T2-1, T2-2**.
1. **Auto-escalation rule (verbatim):**
   > *"In a Batch When 2nd level Tracer (T1-1 ,T1-2, T2-1, T2-2) or 4 joints are rejected in the examination, all the remaining welds in this batch should be examined"*
   → All remaining joints auto-selected, status set to **SS**, surfaced in **Issue Examination** screen, batch status changes from "Joint to Select" to **"Awaiting NDE"**.

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

| Report | What it does |
|--------|--------------|
| Batch status | Released status of each weld regarding NDE |
| Radiographic status | Statistics on % / number of joints / films accepted / rejected & defect types — weekly + cumulative |
| Outstanding Repairs | All joints to be repaired with pending days since NDE done |
| Service class wise NDE status | NDE status per piping class — for examination % compliance check |
| Spool wise NDE status | All spools' NDE status; QC released flag; QC and W10 report numbers |
| Outstanding NDE | Joints awaiting NDE reports + pending days since requested — backlog tracking |
| Radiographic film – Est. qty | Estimated quantity of RT films to be shot |
| Weld History sheet | Document inserted in test pack — full welding + NDE record |

**For welder monitoring:**

| Report | What it does |
|--------|--------------|
| Perf. Control Sheet | Per-welder weekly + cumulative stats: % / # joints welded / accepted / rejected / defect types |
| Rej. and Repaired joint | Per-welder joints to repair / repaired — repair backlog tracking |
| Rej. And Tracers joints | All rejected joints + corresponding tracers — penalty-shoot backlog |
| Batch status | Examination status per welder |

### E. Flange management sub-module

Editable fields per flange joint (search by isometric):

| Field | Source |
|-------|--------|
| Jointing Value | Free entry |
| Joint Date | Free entry (default date / date assistance available) |
| Report number | Free entry |
| Jointer | Dropdown from **project referential** |
| Tag number | Free entry |
| Method | Predefined from project referential |
| Timing | Predefined from project referential |
| Category | Predefined from project referential |
| Reason | Predefined from project referential |

1. **"+"** buttons add multiple joint-point details (multi-bolt-up shifts on the same flange).
1. All fields support bulk update via **Excel Template** (consistent with the cross-cutting pattern).

---

## Cross-cutting findings updates (from #6)

### CC-X. Reinforces CC-1: even the core Erection module is incomplete
TechnipFMC explicitly states only 1 of 4 Preparation sub-modules (NDE) was built. Spool-Erection / Welding / Flange Preparation are missing entirely. This is a vendor admission of incomplete product, on a module that should be the heart of a piping construction tool. Strong pitch material: *"the original vendor never finished even their own flagship workflow."*

### CC-X. The Excel template is the universal bulk-entry escape hatch
Every progress screen in #6 (and seen in #1–#5) exposes an *"excel template to import progress"*. Excel is the de-facto integration layer. **PipeQC parity requirement:** every progress screen needs paste-to-grid + .xlsx upload + dry-run/validation preview.

### CC-X. Universal "isometric or barcode" intelligent search
Every Erection screen anchors on an *"intelligent search field"* keyed on **isometric ID or barcode**. PipeQC implication: global "find by ISO / barcode" autocomplete should be a shared component, not per-screen.

### CC-X. Speed-of-entry pattern: default-date + date-inputs-assistance
Implies users batch-enter many dates (backfill clerical workflow, not real-time). PipeQC: sticky default date, bulk apply to selection, keyboard-only flow.

### CC-X. Paper-form pivot points
The QC W24 form is the canonical Welding handoff between desktop and field. Workflow: desktop generates → print → site/foreman fills (heat numbers, welder IDs, results) → clerk re-keys at desktop. **No mobile / no PDA / no offline capture anywhere in #6.** PipeQC opportunity: digitize the W24 with offline mobile capture + photo of marked-up isometric.

### CC-X. Referential-driven dropdowns
Jointer, Method, Timing, Category, Reason are all *"predefined values come from the project referential"*. Confirms a project-level master-data layer feeds every form. PipeQC: project referential as a first-class admin module (likely consolidates with whatever #2/#3 Project Setup showed).

### CC-X. Internal brand inconsistency: "PSMS"
NDE functionalities slide says *"PSMS suggests welds to be examined"*. This is a different name from "Easy Piping" / "Easy Plant Piping" used everywhere else. Likely a legacy brand for the underlying engine. Useful pitch-deck observation: *"TechnipFMC inconsistently branded the product across its own training material — symptom of a tool that lost ownership internally."*

### CC-X. Hidden 11th+ deck — referenced sub-document not in our set
Slide hyperlinks to **`Piping weld point process.pptx`** (relative path `a/Piping%20weld%20point%20process.pptx`). This is a separate technical doc not in the 10 we have. Worth asking the user / searching Drive folder `1Ml-7gCf-mJ5YQ92hOr7I1lPw80_QzAH2` for it.

### CC-X. Tracer / penalty-shoot business logic = real competitive moat
The R1/R2/R3/R4 auto-suffixing + T1-1…T2-2 tracer cascade + 4-rejections-auto-escalation is non-trivial industry logic — not the kind of thing a generic ERP captures. Capturing this correctly is a PipeQC differentiator vs. "build it in Excel".

---

## Open questions resolved by #6

| Open Q (from #5 and prior) | Resolution |
|---|---|
| Construction surveillance PDA checklists — covered in #6 Erection? | ❌ **Not in #6.** No PDA, no handheld, no scanning, no checklist-on-device anywhere in the Erection module. Erection is desktop-only, isometric/barcode lookup, manual entry or Excel import. Paper QC W24 is the only field artifact. Keep open through #7 Test Pack and #8/#9/#10. |
| Assembly vs Erection distinction — modular projects? | ⚠️ **Partial.** Org-chart unambiguously places **Assembly** under **Fabrication** (alongside Spool Fabrication / Welding / NDE / Painting), while **Spool Erection** sits under the on-site **Erection** module. Strong inference: Assembly = pre-assembly of spool sub-groups in a shop/yard (modular work); Erection = on-site placement. Definitive answer expected in #9 Assembly. |
| Any PDA / mobile / GPS / map view in field ops? | ❌ **None visible in #6.** |
| Welder qualification + multi-welder per joint | ✅ **Confirmed.** WPS vs welder validated automatically; multi-weld-points per joint with independent welders. |
| Material traceability via heat numbers | ✅ **Confirmed.** Heat-number popup at weld/progress; system rejects unknown heat numbers; auto-populates spool "material check" status. |
| Spool Tracking (#5) → Erection handoff | ✅ **Confirmed unidirectional.** "To site" is the entry status into Erection — i.e., the handoff point from Spool Tracking. |
| Forward link to Test Pack (#7) | ✅ **Confirmed.** NDE generates **"Weld History sheet"** explicitly described as *"Document to insert in test pack — records of all welding and NDE"*. NDE outputs feed Test Pack. |

---

## Open questions to answer in remaining presentations (updated)

- ~~PDA construction surveillance checklists — covered in #6?~~ → ❌ Not in #6. Now likely #7 Test Pack, or it was simply never built. **Keep alive through #7–#10.**
- Assembly vs Erection — definitive answer expected in **#9 Assembly**. #6 places Assembly under Fabrication branch (shop/yard pre-assembly hypothesis).
- Test Pack readiness criteria — #6 confirms NDE feeds **Weld History sheet** into test pack; full test-pack rules expected in **#7**.
- **NEW: "PSMS"** — older brand or sibling product? Watch for the name in other decks.
- **NEW: `Piping weld point process.pptx`** — referenced sub-deck, not in our 10. Search Drive folder `1Ml-7gCf-mJ5YQ92hOr7I1lPw80_QzAH2` for it before #7 read.
- **NEW: W10 report number** — referenced under "Spool wise NDE status" but never defined. Likely a Technip QC form code; should surface in #7.
- **NEW: PWHT (Post-Weld Heat Treatment)** screens — referenced as a status released gate ("All joints NDE and PWHT status are released") and as a functionality ("Work order for NDE and PWHT activities") but no PWHT-specific screen shown in #6. Where is PWHT entered? Possibly a sub-screen of NDE not screenshotted, or in #8.
- **NEW: Penalty-shoot management UI** — described as a functionality but no UI screenshot. Look for in any QC-focused deck.

---

## Update the source files table

| # | File | Status |
|---|------|--------|
| 6 | `6.EasyPiping Erection_10032021.pptx` | ✅ **Read 2026-05-20** |

**Next read = #7 Test Pack.**

---

### Length / investment signal

#6 is a **moderately detailed** deck — substantial on NDE (batch concept, tracer logic, ~8 reports, ~4 preparation screens) but **noticeably thin** on Spool Erection itself (just 2 sub-screens A/B) and on Flange (one screen). Welding gets 3 screens but leans on QC W24 paper form. This investment skew matches CC-1: TechnipFMC's R&D went into the inspection/QC side of erection (where regulatory pressure is highest), while the actual physical-progress workflows were left as thin clerical screens. **Pitch implication:** PipeQC's biggest UX wins are on Spool Erection / Flange / Welding progress (huge upside over EP), while NDE is where we have to be at-least-on-par with EP's batch and tracer logic (no shortcuts).