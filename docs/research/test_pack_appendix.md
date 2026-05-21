<!--
INSTRUCTIONS FOR PASTING:
1. In docs/research/presentation_findings.md, find the line that says
   "*Last updated: 2026-05-21. Next read: #7 Easy Piping Test Pack.*"
   (currently at ~line 1434).
2. Paste everything BELOW this comment block immediately AFTER that line,
   BEFORE the "## How to use this file in a new chat session" section.
3. ALSO update the Source files table at the top:
   row #7 → change "⏳ Pending" to "✅ Read 2026-05-21"
4. ALSO update the very last line of the file (line ~1451, currently
   stale at "2026-05-20. Next read: #6") to match the new state, or
   delete it if redundant.
-->

-----

## #7 Test Pack — module-specific findings

### Module structure & scope

1. The Pressure Tests module is divided into **5 sections** corresponding to on-site activities: **Line Check, Item Clearance, Blinding, Testing & Pre-commissioning, Reinstatement**.
1. **Sub-module split is non-uniform** — breaks the universal Prep+Progress pattern (CC-9) in one place:

| Section                       | Preparation | Progress |
|-------------------------------|:-----------:|:--------:|
| Line check                    | ✅           | ✅        |
| Item clearance                | ✅           | ✅        |
| Blinding                      | ✅           | ✅        |
| Testing & pre-commissioning   | ❌ **none**  | ✅        |
| Reinstatement                 | ✅           | ✅        |

Vendor explicitly states *"Easy piping does not manage the preparation of the testing and pre-commissioning"* — only date entry. The actual test execution is an external workflow (handled by commissioning team / 3rd-party); Easy Piping just records dates that gate downstream Y/Z reinstatement.

1. **Multi-level follow-up** — different activities tracked at different granularities (a deliberate data-model choice, not an accident):

| Activity            | Tracked at level   |
|---------------------|--------------------|
| Line checking       | TP + isometric     |
| Item clearance      | TP + isometric     |
| Blinding            | Test pack          |
| Testing             | Test pack          |
| Pre-commissioning   | Test pack          |
| Reinstatement (Y/Z) | **Flange joint**   |

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
|----------------------|--------------------------------------------------------------------------------------|
| General              | Rev # (auto), Test planned date, Test medium, Unit of time (calc), Volume (optional) |
| Release tracking     | Backlog quantities + clickable drilldowns to weld/bolt/NDE/line-check screens        |
| Operation management | Dates for blinding/testing/reinstatement + category Y/Z item counts                  |
| Progress status      | % completion: Construction / Line check / Testing / Reinstatement                    |

**Iso level (2 tabs):**

| Tab              | Content                                                                                       |
|------------------|-----------------------------------------------------------------------------------------------|
| Spool status     | Status of each spool in TP, by iso. Numeric code (e.g. `12 = Ready For Test`) + tooltip + RAG |
| Isometric status | Per-iso dates + per-iso quantities — computed from spools that actually belong to this TP     |

**Spool level (1 tab):**

| Tab                   | Content                                  |
|-----------------------|------------------------------------------|
| Spool status detailed | Per-spool detailed status, RAG-coded     |

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

| Cat | Meaning                                            | Gate / trigger                                |
|-----|----------------------------------------------------|-----------------------------------------------|
| X   | To be cleared **before** testing                   | **Blocks RFT** until all X cleared            |
| Y   | Reinstatement **after testing, before** pre-com    | Triggered when "Testing done" date entered    |
| Z   | Reinstatement **after** pre-commissioning          | Triggered when "Pre-commissioning" date entered |

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

-----

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

-----

## Open questions resolved by #7

| Open Q                                        | Resolution                                                                                                                                                                                                            |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Test pack data model details                  | ✅ **Resolved.** TP = (rev #, planned date, medium, unit-of-time, volume). TP contains isometrics; isometrics contain spools; flange joints belong to isometrics. Punch items keyed on (iso, spool, TP) with Cat X/Y/Z.|
| PWHT workflow — where entered?                | ⚠️ **Still partial.** #7 confirms PWHT is a gate input (`all welded joints NDE/PWHT released`) but no PWHT entry screen shown. Likely embedded in NDE batch screens (#4) or in #10 Painting. Keep open.                  |
| Construction surveillance PDA checklists      | ❌ **Still not found.** No PDA / mobile in Test Pack module either. Pattern continues — increasingly looks like never-built (CC-7 / CC-8 vendor-incomplete pattern).                                                    |
| WPS qualification alert — hard block or soft? | ❌ Not addressed in #7. Try #8.                                                                                                                                                                                        |

-----

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

-----

*Last updated: 2026-05-21. Next read: #8 PSMS SpoolingDB.*
