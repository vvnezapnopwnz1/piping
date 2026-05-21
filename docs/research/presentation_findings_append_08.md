<!--
  APPEND BLOCK FOR presentation_findings.md — Presentation #8
  Read date: 2026-05-21
  Source: 8.PSMS_SpoolingDB_10032021.pptx (slide-deck titled "Part 9 – Spooling")

  Integration instructions:
  1. Update the source-files table row #8 to ✅ Read 2026-05-21
  2. Insert the "#8 Spooling — module-specific findings" section after the #7 Test Pack module-specific section
  3. Append CC-21, CC-22, CC-23 to the cross-cutting findings updates
  4. Replace the "Open questions to answer in remaining presentations" list with the updated version below
  5. Update the footer date and "Next read" pointer
-->

## Source files table — row update

| 8 | `8.PSMS_SpoolingDB_10032021.pptx` | ✅ Read 2026-05-21 |

> **Naming caveat:** the file is `PSMS_SpoolingDB` but the deck self-titles as **"Part 9 – Spooling"**. The "DB" in the filename is misleading — this is a **UI walkthrough of the Spooling module**, not a database schema or ERD. The schema is inferable from the screens only.

---

## #8 Spooling — module-specific findings

### Important semantic reframe — "Spooling" here is NOT shop-floor work

Easy Piping uses "Spooling" to mean **the engineering-to-construction document handoff workflow** — receiving isometrics from engineering, assigning them to spoolers, verifying, holding when needed, and transmitting completed isos to site as batches. The actual cutting/marking-up of pipe into spools happens in the **Spool Fabrication** module (#4). This is the upstream-most workflow module in Easy Piping.

This corrects a likely IA misconception in PipeQC: the "Spooling" placeholder track should be modelled as a document-handoff workflow, not as shop-floor activity tracking. Shop-floor work already has its home in Fabrication.

### Module structure — 8 sub-modules

1. **Home page** — dashboard with progress curves + live activity feed
2. **Import Engineering** — receive engineering transmittals (isos in)
3. **Isometric to Spool** — assign iso to a spooler for spooling work
4. **Isometric Checking** — multi-round verification after spooling
5. **Hold** — manage holds on isos (2 hold sources)
6. **Inquiry** — read-only lookup screen (not detailed in deck)
7. **Browser** — SpoolGen-file import bridge
8. **Spooling Transmittal** — outbound iso batches to site

### Iso lifecycle (inferred from screens)

```
Engineering issues iso (with rev #)
   → received (via Engineering Transmittal)
   → checked out to spooler  (first_checkout_date)
   → spooled                  (last_checkin_date, spooled_by)
   → verified                 (checking, n rounds, checker_comments)
   → optionally held          (Spooling Team or Engineering)
   → released
   → transmitted to site      (Spooling Transmittal batch)
```

This is the **iso state machine** Easy Piping enforces, end to end, from engineering door to site door. It is the upstream feeder for everything else (Fabrication → Erection → Test Pack).

### Home page — dashboard composition

The Spooling home page is a multi-region dashboard, not unlike the Fabrication dashboard (#4):

| Region                          | Content                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Progress curves                 | Quantities by date for Received / Spooled / Sent to Project (Transmitted)                                                              |
| Display toggle on curves        | **Amont** (periodic bar chart) vs **Cumul** (cumulative S-curve) — note the French label leak; PipeQC should label "Period/Cumulative" |
| KPI panel — Current progress    | Total Received • In spooling process • In Checking                                                                                     |
| KPI panel — Completed           | Completed Isometrics                                                                                                                   |
| KPI panel — Currently under HOLD | Tier-2 breakdown: Held for Reprocess • Held by Spooling team • Held by Engineering                                                     |
| Recent actions feed             | Live log of all actions happening in the Spooling DB — same activity-feed pattern surfaced elsewhere                                   |
| Filters                         | Time period • WBU • PDS • Drawing Type (All / Original / Revised)                                                                      |
| Print                           | Whole-page print                                                                                                                       |
| Entry button                    | "Spooling Explorer" — drills to iso-level grid                                                                                         |

**Filter inheritance:** filter selections apply to both the curves and the Iso Quantity Summary panel — same global-filter pattern PipeQC's Fabrication dashboard uses.

### Spooling Explorer — 4-tab iso-level grid

Reached from the "Spooling Explorer" button on the home page. Top of screen has activity-stage filter chips. Excel export available. Four tabs, each a grid view of the same underlying iso set with stage-specific columns.

**Tab 1 — "Spooling" (spooling progress):**

| Column | Source / meaning |
| -- | -- |
| Rev Number | Iso revision |
| Iso size | Standard iso metadata |
| Process Status | Latest status of iso (driven by state machine above) |
| Transmittal No | Engineering transmittal that delivered this iso |
| Received Date | Date iso received from engineering |
| First Checkout Date | When iso was first assigned to a spooler |
| Spooled By | Spooler name |
| Last Check in Date | Spooling completion date |

**Tab 2 — "Checking" (verification):**

| Column | Meaning |
| -- | -- |
| Rev Number, Iso size, Process Status | (same as above) |
| Check Status | Verification state |
| Tot. Round | **N rounds of checking** — checking is iterative (verifier rejects → spooler fixes → re-checks) |
| Checker | Checker name |
| Last Checking | Last verification completion date |
| Checker Comments | Free-text checker remarks |

**Tab 3 — "Hold Mgmt" (holds):**

| Column | Meaning |
| -- | -- |
| Hold Type | One of two: **Spool Team** (inconsistency in iso from engineering) or **Engineering** (new revision being issued) |
| Holder | Holder name (when Spool Team hold) |
| Hold Date | When hold placed |
| Release Date | When hold lifted |

**Tab 4 — "Spooling Transmittal" (outbound batches):**

| Column | Meaning |
| -- | -- |
| Batch No | Batch identifier |
| Spl. Trans. No. | Spooling transmittal number sent to site |
| Transmit Date | When sent |
| Total Iso | Iso count in this transmittal |
| Transmitter | Person who sent it |

### Browser sub-module — file import bridge

This is the **physical integration point with SpoolGen** referenced in CC-2's architectural diagram. From Spooling main menu → Browser screen. Used to browse and import SpoolGen output and drawing files. Top-of-grid filters:

- Spooling Transmittal Batch no
- Spooling Transmittal no
- Iso Number
- Type of Files (filter by file type for selective import)

This confirms: SpoolGen output is not auto-ingested — a human operator browses and imports files through this screen. This is a **manual integration step**, not a true API/pipeline. (Likely a network folder watched by the Browser tool — typical TechnipFMC pattern.)

### Length / investment signal

#8 is a **short, structurally clean** deck — Spooling is a focused workflow without the complexity sprawl of NDE/Test Pack. The module is bounded and complete (no "under development" markers). This matches the fact that Spooling is a **mature, low-variance workflow** in piping projects — engineering ships isos, you spool them, you transmit them, done. The interesting business logic lives downstream.

**Pitch implication:** PipeQC can match Easy Piping's Spooling module without heavy investment — the screens are mostly standard CRUD over the iso state machine, plus the activity feed and S-curve dashboard. Estimate: 2–3 days of focused build, not weeks.

---

## Cross-cutting findings updates (from #8)

### CC-21. Iso revision lifecycle is a first-class state machine, not a status field

#8 makes it explicit: an iso is not "a row with a status" but a **stateful document** that moves through Received → Checked-out → Spooled → Checked (n rounds) → Held/Released → Transmitted. Each transition has its own actor, date, and audit trail. PipeQC needs to model isos with this state machine explicitly:

- Multi-round checking (Tot. Round counter)
- Two-source hold with reason taxonomy
- Outbound batch transmittal with Spl. Trans. No. and batch grouping

This is more than a `status` enum on the iso table — it's a domain aggregate. Worth a dedicated PipeQC track entry (call it **Track K — Iso lifecycle state machine** if not already covered by Track A/B referentials).

### CC-22. "Spooling" is the engineering-to-construction document handoff — not the shop floor

The single highest-leverage IA insight from #8. PipeQC's "Spooling" module must be reframed as the **iso document workflow** (engineering door → site door), not as shop-floor activity. Shop-floor lives in **Spool Fabrication** (#4). Without this reframe the PipeQC IA will collide with itself on the demo.

Concrete renaming/scoping suggestion:

| Current PipeQC label | Reframe |
| -- | -- |
| Spooling (module) | **Iso Spooling & Transmittal** (or just "Spooling" if context is clear, but the description must lead with "document handoff") |
| Spool Fabrication | unchanged — but make sure copy/tooltips clarify "the cutting and marking of pipe into spools, happens after isos are received from the Spooling module" |

### CC-23. Live activity feed is a recurring module-home pattern

#8 explicitly mentions a "Most recent actions" live feed on the Spooling home page. This is the **third module** where a live activity feed surfaces (also seen in dashboards from #4 and #5). This is a system-wide pattern, not module-local.

**PipeQC implication:** build a shared `ActivityFeed` component fed by a single event stream (one row per domain event with actor / verb / object / timestamp), parameterized by module scope. This component should appear on every module dashboard. Cheaper than building four separate feeds, and gives the product a consistent enterprise feel for the demo.

### CC-24. French/Italian copy leak — translation-layer cleanup required

The "Amont / Cumul" toggle on the Spooling dashboard is untranslated French (literally "upstream / cumulative" — `amont` is a TechnipFMC-internal shorthand for "instantaneous/per-period"). This is the second visible leak of the system's French-engineering origin (first was column labels in #5). Easy Piping never had a clean i18n pass.

**PipeQC implication:** label *every* control in clear English from day one (e.g. "Period vs Cumulative"). Avoids the worst kind of usability friction (users not knowing what a control does) and is a small but meaningful pitch differentiator: "designed in English-first, no industry-jargon leaks."

### CC-25. SpoolGen integration is operator-mediated, not API-driven

The Browser sub-module makes clear that the supposedly-automated `SpoolGen → Easy Piping` pipeline in CC-2 is in fact a **manual import workflow**: an operator opens the Browser screen, filters for files, selects, imports. This is a watched-folder UX, not an API integration.

**PipeQC opportunity:** a true automated SpoolGen webhook / API ingestion is a **clear pitch differentiator** vs the EP baseline. Worth showing on the demo even as a stubbed config screen ("SpoolGen connector — auto-poll every 5 min").

---

## Open questions resolved by #8

| Open Q | Resolution |
| -- | -- |
| **PSMS SpoolingDB schema** | ⚠️ **Partial.** No ERD shown, but iso entity model fully inferable from the 4 explorer tabs: `Isometric(rev#, size, process_status)` ←1:N `CheckingRound(round_no, checker, date, comments)`, `Hold(type, holder, hold_date, release_date)`, `EngineeringTransmittal(no, received_date)` and `SpoolingTransmittal(batch_no, trans_no, transmit_date, transmitter)` 1:N `Isometric`. No deep schema (foreign keys, types) shown. |
| WPS qualification alert — hard block or soft? | ❌ Not addressed in #8. Try #9 Assembly. |
| Construction surveillance PDA checklists | ❌ Still not found. Three modules in a row with no PDA UI (#6/#7/#8). Confidence rising that this is a vendor-incomplete feature per CC-7/CC-8 pattern. Final chances: #9, #10. |
| Shared print-template engine | ❌ Not addressed in depth. Spooling home page has a "Print button" but no template-engine architecture is visible. Increasingly likely each module just has its own print routine — no shared infrastructure. |
| Punch-code referential location | ❌ Not in #8. Re-check #2 admin notes — most likely already covered there. |

---

## Open questions to answer in remaining presentations (updated after #8)

1. ~~**PSMS SpoolingDB schema**~~ → **⚠️ PARTIAL #8** (entity model yes, ERD no)
2. **PWHT entry screen** — still missing. Try #10 Painting.
3. **Construction surveillance PDA checklists** — ❌ not in #5/#6/#7/#8. Last chances: #9, #10. Default assumption now: **never built** (CC-7/CC-8 pattern).
4. **Assembly vs Erection distinction** — definitive answer expected in #9.
5. **Painting DFT measurement workflow** — #10.
6. **WPS qualification alert — hard block or soft warning?** — try #9 or #10.
7. **`Piping weld point process.pptx`** — sub-deck, still missing from Drive folder.
8. **W10 report number** — still undefined.
9. **Penalty-shoot management UI** — still missing.
10. **Punch-code referential location** — re-check #2 admin notes (most likely already covered).
11. **Shared print-template engine?** — likely no shared engine; each module prints its own. To be confirmed in #9/#10 if relevant.
12. **NEW: Inquiry sub-module functionality** — #8 lists "Inquiry" as one of 8 sub-modules but doesn't show its screen. Read-only lookup is the inference, but unverified.
13. **NEW: SpoolGen file types accepted** — #8 mentions "Type of Files to be imported" filter but doesn't enumerate types. Domain interviews or sub-deck `Piping weld point process.pptx` likely.

---

_Last updated: 2026-05-21. Next read: #9 EasyPiping Assembly._
