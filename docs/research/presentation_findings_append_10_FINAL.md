<!--
  APPEND BLOCK FOR presentation_findings.md — Presentation #10 (FINAL)
  Read date: 2026-05-21
  Source: 10.EasyPiping Painting_10032021 (1).pptx (slide-deck titled "Part 10 - Painting")

  This is the final read in the 10-presentation sequence.

  Integration instructions:
  1. Update the source-files table row #10 to ✅ Read 2026-05-21
  2. Insert the "#10 Painting — module-specific findings" section after the #9 Assembly section
  3. Append CC-30 through CC-33 to the cross-cutting findings updates
  4. Replace the "Open questions to answer in remaining presentations" with the final-closeout "Final status of all open questions" section
  5. Add the new bottom section "Research project closeout — summary across all 10 reads"
  6. Update footer date and mark "Next read: NONE — series complete"
-->

## Source files table — row update

| 10 | `10.EasyPiping Painting_10032021 (1).pptx` | ✅ Read 2026-05-21 |

---

## #10 Painting — module-specific findings

### Module structure — 2 sections (not 4)

The Painting module is **structurally lighter** than the construction modules. Just 2 sections:

1. **Project Definition** — the painting referentials (RAL codes + Paint Matrix)
2. **Painting Progress** — spool-level state entry

This is in contrast to #6 Erection / #9 Assembly (4 sub-modules each) and reflects that Painting is conceptually a single activity, not a multi-activity construction phase.

**Note on double-location:** Painting also appears as a sub-module inside Fabrication (#4) — meaning painting work that happens at the fab shop. The Painting module here covers the **paint-shop workflow** specifically. Two flavors of painting, one referential, one progress engine, two entry points. Worth simplifying in PipeQC IA.

### Project Definition — two referentials

**1. RAL Code referential**

Per project, define color codes by fluid service:

| Field | Source |
| -- | -- |
| Color Code | Free entry / lookup |
| Fluid service | Free entry / lookup |
| RAL code | Free entry (standard RAL color code) |

Then each `(isometric, fluid service)` is linked to a RAL code. This is a 2-level lookup: iso has fluid service, fluid service has RAL code → iso gets its color.

**2. Paint Code Matrix referential**

Per isometric, define the painting system:

| Field | Type | Meaning |
| -- | -- | -- |
| Blasting | Y/N | Whether blasting is required |
| Primer | Y/N | Whether primer is required |
| Intermediate coat | numeric | How many intermediate coats |
| Final coat | numeric | How many final coats |
| Final thickness | numeric | Required DFT |

**This matrix is the most sophisticated parameter-driven UI in all of Easy Piping** — see CC-31.

### Painting state machine — 9 states at spool level

```
Sent to paint
  → Received in paint
    → Primer
      → Intermediate Coat (×N, where N from Paint Matrix)
        → Final Coat (×M, where M from Paint Matrix)
          → Painted
            → Final QC
              → Laydown
                → Send to Site
```

This is the most state-rich workflow in any single module — 9 distinct states with **dynamic step counts** for intermediate/final coats determined by the Paint Matrix.

Two of these are split off into a separate screen — `Sent to paint`, `Painted`, `Final QC`, `Laydown` are entered in one screen (overall progress); `Received in paint`, `Primer`, `Intermediate coat`, `Final coat` in another (in-shop progress). The split mirrors the operational reality: outbound/inbound logistics vs in-shop work.

### W10P form — the painting QC form

The deck shows `W10P` as the QC form generated when a spool is NDE-released. Notable mechanics:

- **Report number is unique and automatically assigned** by the system
- Form is printed, filled on paper by QC personnel after all NDE done, signed
- Then re-keyed into Easy Piping → QC release → "Sent to paint" status set

This is **the third W-form in the system**:

| Form | Module | Purpose |
| -- | -- | -- |
| **W24** | Erection / Assembly | Daily progress report at isometric level (per #6) |
| **W10P** | Painting | QC form, gates "sent to paint" |
| (W10 family) | (other variants likely exist) | Form family, naming convention not fully documented |

**Resolution of the "W10 report number" open question:** W10 is a **form family**, W10P is the Painting variant. Other variants likely exist (W10W for welding? W10E? — not seen in any deck). The naming convention is TechnipFMC-internal and not fully decoded in the 10 decks. Mostly resolved, fully closeable.

### Painting reports

Single named report: **Weekly progress – Painting**. Cumulative quantities between two dates, broken down by:

- Type of spool (**LB / SB** — large bore / small bore)
- Material

This is the painting-specific reporting axis. Other modules reported by sub-area, sub-contractor, etc.; painting reports by physical pipe size and material — reflecting that paint consumption and cycle time scale with both.

### Vendor-incomplete pattern — confirmed yet again, with sloppy boilerplate

The deck literally states *"For the moment, only the NDE – preparation is available in this module"* — even though the Painting module has just **one** activity (Painting), with no NDE sub-activity at all. This sentence is a **copy-paste leftover from #6 Erection / #9 Assembly**. Two interpretations, both unflattering to the vendor:

1. **Sloppy documentation** — the deck author didn't proofread per-module boilerplate
2. **Painting Preparation was also vaporware** — and they reused the standard disclaimer without bothering to correct it

Most likely both. See CC-32 below.

### Length / investment signal

#10 is **short** — only 2 sections vs 4 in construction modules — but the **Paint Matrix dynamic-UI mechanic is substantive** and disproportionately interesting per slide. The deck is thin overall but the matrix idea is heavy. **PipeQC build estimate:** Painting module is small (1–2 days for Project Definition + state machine + W10P form generation) but should be done **after** establishing a parameterized-step UI pattern (Paint Matrix is the highest-leverage example to seed it).

---

## Cross-cutting findings updates (from #10)

### CC-30. Construction surveillance PDA checklists — definitively NEVER BUILT

After **six consecutive presentations** (#5 Spool Tracking, #6 Erection, #7 Test Pack, #8 Spooling, #9 Assembly, #10 Painting) with zero PDA evidence, the construction-surveillance feature explicitly listed as a transversal module in #1 is **closed out as vaporware**. Reasonable confidence: 95%+. The 5% is reserved for the possibility that this feature lived in a deck that wasn't shared (the missing `Piping weld point process.pptx` is the only candidate).

**PipeQC implications:**

- **Not a parity gap.** PipeQC does not need to match this. EP never shipped it.
- **Clear opportunity for differentiation.** Mobile-first field checklists (the actual functionality construction surveillance was meant to deliver) is now uncontested whitespace in this product category.
- **Pitch framing:** *"the only competitor explicitly promised PDA-based field surveillance and never delivered it across 10+ years of development. PipeQC ships it as a foundational feature."*

This finding alone, combined with CC-1 (TechnipFMC exited the market), is sufficient pitch material for a "why now" slide.

### CC-31. Paint Matrix = the only fully parameterized-step UI in Easy Piping

The Paint Matrix is the only place in the entire system where the UI's **required steps** are dynamically determined by a referential, per item. Three coats for one spool, one coat for another, all on the same screen. Step count is data-driven.

Other parts of the system are referential-driven for **values** (welder dropdowns from the welder list, RAL codes from RAL list, etc.) but the **structure of the workflow** is hard-coded. Paint Matrix breaks that pattern — its referential drives the workflow shape itself.

**PipeQC architectural implication:** worth designing a **generic parameterized-step UI** pattern early. Useful contexts:

- Paint Matrix (intermediate / final coats — direct port)
- NDE Matrix (already partially used; could go further — different inspection types per joint material)
- Test pack reinstatement (Y/Z categories trigger different reinstatement step sequences)
- Custom project-specific QC steps

Implementation pattern: a `WorkflowDefinition` referential per item type, with steps as data not code. UI renders the steps dynamically. The Paint Matrix becomes one instance of this generic pattern.

### CC-32. Module-level documentation boilerplate copy-paste = vendor sloppiness signal

The "For the moment, only the NDE – preparation is available" sentence appears verbatim in #6 Erection, #9 Assembly, AND #10 Painting — even though Painting has no NDE sub-activity. This is **mechanical copy-paste** without per-module review.

**Significance:** the documentation was not maintained as a living artifact per module. It was authored once (likely for the Erection module) and dragged across other modules with minimal editing.

**PipeQC implications:**

- Write module docs **per-module from day one** — no shared boilerplate
- Internal style: per-module README in the repo, each independently maintained
- Customer-facing: per-module how-to in product, no generic "modules and sub-modules" preamble
- Pitch payoff (mild): "documentation tailored to each module, not boilerplate"

A small differentiator, but the kind of small differentiator that signals product care in an enterprise B2B evaluation.

### CC-33. Form numbering — shared service, per-template namespace

The W-form family (W24, W10P, others) shares two patterns across modules:

1. **Forms have stable codes** (W24, W10P) — these are TechnipFMC template identifiers, fixed per form type
2. **Report numbers are unique and auto-assigned** by the system — per the W10P slide explicitly, and implied for W24 too

Together: the system has a **shared form-numbering service** that assigns unique sequential numbers per form template. Each form template has its own numbering namespace (W24 numbers don't collide with W10P numbers).

**PipeQC implications:**

- One shared `FormNumberingService` with `(template_code, project_id) → next_number`
- Per-template, per-project sequence
- Hard-coded form templates initially (W24-style daily progress, W10P-style QC form), template engine later

This partially answers the previously-open "shared print-template engine" question. There's no shared **template engine** described in any of the 10 decks — but there IS a shared **numbering service** behind the templates. The templates themselves are likely module-local; the numbering is shared.

---

## Open questions resolved by #10

| Open Q | Resolution |
| -- | -- |
| **Painting DFT measurement workflow** | ✅ **Resolved (workflow level).** Final thickness defined per iso in Paint Matrix. Measurement happens via the QC form (W10P or similar). No dedicated DFT entry screen — DFT recording is part of the QC form workflow. |
| **W10 report number** | ✅ **Resolved.** W10 is a form family; W10P is the Painting variant. Other variants likely exist (W10W, W10E, etc.) but their existence is not documented in the 10 decks. Form-naming convention is TechnipFMC-internal. |
| **PWHT entry screen** | ✅ **Resolved (by elimination).** Not in any of the 10 decks. PWHT date is almost certainly entered as part of the NDE batch workflow (#4), not in a dedicated screen. |
| **Penalty-shoot management UI** | ✅ **Resolved (by elimination).** Not shown in any deck. Penalty-shoot logic (4 rejections → auto-SS) runs in the NDE batch workflow (#4) as a derived behavior; there is no separate "penalty-shoot management" UI. |
| **Construction surveillance PDA checklists** | ✅ **Resolved as NEVER BUILT.** Six consecutive decks with zero PDA evidence. See CC-30. |
| **Shared print-template engine** | ⚠️ **Partially resolved.** No shared **template** engine described. There IS a shared **numbering** service (CC-33). Templates are likely module-local. |
| **SpoolGen file types accepted (Browser sub-module)** | ❌ Not addressed in #10. Likely lives in domain interviews or missing `Piping weld point process.pptx`. Closed as "domain interviews needed." |
| **Inquiry sub-module functionality** | ❌ Not addressed in #10. Closed as "domain interviews needed." |
| **`Piping weld point process.pptx`** | ❌ Still missing from Drive folder. Closed as "search Drive separately." |

---

## Research project closeout — summary across all 10 reads

The 10-deck Easy Piping presentation set has been read sequentially per the agreed methodology. This section summarizes the state of the research project at closeout.

### Reads completed

| # | File | Status |
| -- | -- | -- |
| 1 | PSMS overview | ✅ Read 2026-05-20 |
| 2 | EasyPiping Administration | ✅ Read 2026-05-20 |
| 3 | EasyPiping Preparation | ✅ Read 2026-05-20 |
| 4 | EasyPiping Fabrication | ✅ Read 2026-05-20 |
| 5 | EasyPiping Spool tracking | ✅ Read 2026-05-20 |
| 6 | EasyPiping Erection | ✅ Read 2026-05-21 |
| 7 | Easy Piping Test Pack | ✅ Read 2026-05-21 |
| 8 | PSMS SpoolingDB (Spooling) | ✅ Read 2026-05-21 |
| 9 | EasyPiping Assembly | ✅ Read 2026-05-21 |
| 10 | EasyPiping Painting | ✅ Read 2026-05-21 |

**Total:** 10/10. **Series complete.**

### Cross-cutting findings inventory — 33 in total

| # | Title | Pitch / build impact |
| -- | -- | -- |
| CC-1 | TechnipFMC exited the market | High — pitch foundation |
| CC-2 | System architecture (3D → SpoolGen → EP) | High — pitch integration diagram |
| CC-3 | Role hierarchy (8 effective roles) | High — drives role × function matrix |
| CC-4 | Subcontractor scope lock | High — multi-tenant requirement (Track J) |
| CC-5 | Module dependency map | Medium — build sequencing |
| CC-6 | PMP project benchmark (scale) | High — pitch TAM slide |
| CC-7 | "Production" module never finished | High — pitch material |
| CC-8 | Even Erection module incomplete | High — pitch material |
| CC-9–16 | (from #6/#7 — see file) | Mixed |
| CC-17 | "Generate Request" PDF dispatch pattern | Medium — universal pattern |
| CC-18 | RFT gate = central business logic | **Highest** — Track H critical path |
| CC-19 | Numeric status code + tooltip + RAG | Medium — design system pattern |
| CC-20 | Punch X/Y/Z = post-fab sequencer | High — Track H critical path |
| CC-21 | Iso revision lifecycle = first-class state machine | Medium — entity modeling |
| CC-22 | "Spooling" = engineering doc handoff, NOT shop floor | **High** — IA reframe |
| CC-23 | Live activity feed = recurring pattern | Low — shared component |
| CC-24 | French copy leaks → translation cleanup signal | Low — small pitch differentiator |
| CC-25 | SpoolGen integration is operator-mediated (NOT API) | Medium — opportunity for diff |
| CC-26 | Assembly = Erection at different stage (single param module) | **Highest** — saves significant build effort |
| CC-27 | Preparation never finished across 3 modules (pattern) | High — pitch tightening |
| CC-28 | Two-tier validation: BLOCK vs WARN | High — UX taxonomy |
| CC-29 | Shared spool aggregate across modules | High — data architecture |
| CC-30 | Construction surveillance PDA = NEVER BUILT | **Highest** — uncontested whitespace |
| CC-31 | Paint Matrix = only parameterized-step UI in EP | High — generic pattern opportunity |
| CC-32 | Documentation boilerplate copy-paste = vendor sloppy | Low — minor differentiator |
| CC-33 | Form numbering = shared service, per-template namespace | Medium — infra component |

**Top 5 highest-impact findings (subjective ranking):**

1. **CC-30** — Construction surveillance never built → uncontested whitespace
2. **CC-26** — Assembly = Erection-at-stage → 50% module-build reduction
3. **CC-18** — RFT gate logic → Track H critical path
4. **CC-22** — Spooling IA reframe → avoids demo-day confusion
5. **CC-1 / CC-7 / CC-8 / CC-27** (vendor-incomplete cluster) → pitch foundation

### Settled facts (questions closed across the series)

- **Assembly vs Erection** — same module, different stage parameter
- **WPS qualification** — soft alert, not hard block (CC-28)
- **Heat number validation** — hard block (CC-28)
- **RFT gate composition** — fully specified in #7 (CC-18)
- **Test pack data model** — fully specified in #7
- **Tracer / penalty-shoot logic** — fully specified in #4 (4 rejections → auto-SS)
- **Construction surveillance PDA** — never built (CC-30)
- **PWHT entry** — embedded in NDE batch workflow (not a separate screen)
- **Penalty-shoot management UI** — does not exist as a standalone screen
- **W-form family** — TechnipFMC template codes with shared numbering service (CC-33)
- **Painting DFT entry** — via QC form, no dedicated screen
- **Material check status** — derived from heat number validation, not separate workflow
- **Multi-welder per joint** — N weld points per joint, each with own welder/WPS
- **Two hold sources for isos** — Engineering (new rev) or Spooling Team (inconsistency)
- **SpoolGen integration** — operator-mediated file import (manual), not API

### Permanently open — requires domain interviews or external sources

- `Piping weld point process.pptx` — missing sub-deck
- SpoolGen file types accepted — Browser sub-module filter
- Inquiry sub-module (#8) — read-only lookup inferred
- Full W-form family enumeration (W10E? W10W? others?)

These are not blocking. PipeQC can be built without them; they would only sharpen specific implementation details.

### Recommended next steps (out of scope for this log)

1. **Role × function × interface × state matrix** — per the user's revised methodology, the natural next product-spec activity given the new domain understanding.
2. **IA restructuring** — apply CC-22 (Spooling reframe) and CC-26 (Assembly = Erection at stage) to the PipeQC information architecture before any further screen builds.
3. **Track H — Test Pack builder** — informed by RFT gate (CC-18), X/Y/Z punch sequencer (CC-20), reinstatement triggers (#7). Now substantially de-risked vs pre-research state.
4. **Pitch deck refresh** — fold in the vendor-incomplete cluster, CC-30 whitespace finding, CC-26 architectural-superiority story.
5. **Design system codification** — RAG + numeric code status badges (CC-19), two-tier validation (CC-28), shared activity feed component (CC-23).

---

_Last updated: 2026-05-21. **Research series complete (10/10). No next read.**_
