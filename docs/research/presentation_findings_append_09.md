<!--
  APPEND BLOCK FOR presentation_findings.md — Presentation #9
  Read date: 2026-05-21
  Source: 9.EasyPiping Assembly_09022020.pptx (slide-deck titled "Part-9 Assembly")

  Integration instructions:
  1. Update the source-files table row #9 to ✅ Read 2026-05-21
  2. Insert the "#9 Assembly — module-specific findings" section after the #8 Spooling module-specific section
  3. Append CC-26, CC-27, CC-28, CC-29 to the cross-cutting findings updates
  4. Replace the "Open questions to answer in remaining presentations" list with the updated version below
  5. Update the footer date and "Next read" pointer (now: #10, the last one)
-->

## Source files table — row update

| 9 | `9.EasyPiping Assembly_09022020.pptx` | ✅ Read 2026-05-21 |

> **Slide-numbering note (same as #8):** the deck self-titles "Part-9 Assembly" even though it is file #9. The slide-numbering in TechnipFMC's source is not aligned 1:1 with our file ordering — but for our purposes, file order is what matters. (Possibly the deck was authored before #8 SpoolingDB was split out, leaving "Part-9" stuck in the title.)

---

## #9 Assembly — module-specific findings

### The Assembly vs Erection question — definitively resolved

The Assembly module is **structurally identical to Erection**. Same 4 sub-modules (Spool erection / Welding / NDE / Flange mgmt), same Preparation+Progress split per sub-module, same screens, same spool-level and joint-level status progressions, same QC W24 paper-form loop, same material-traceability pop-up, same flange-joint editor.

The only difference is the **stage**: Assembly = pre-erection joining of spools into larger sub-assemblies (modular construction, done in shop/yard); Erection = on-site placement and final connection. Both stages use the same verb "Spool erection" in their UI — meaning "erecting spools into assemblies" in the Assembly case, "erecting assemblies into final position" in the Erection case.

**Critical sync semantic:** the deck explicitly states *"Spool level progress entered in this screen will also be updated in erection module."* This is not a copy/sync — it's the **same spool record**, written from either module. Same domain aggregate, two module-level UIs.

### Module structure

1. **4 sub-modules** — Spool erection, Welding, NDE, Flange management
2. **Each sub-module has 2 panels** — Preparation (workload dispatch) + Progress (data entry)
3. **Vendor-incomplete pattern recurs:** explicitly stated in the deck — *"For the moment, only the NDE – preparation is available in this module."* The other three Preparation panels (Spool erection / Welding / Flange) were never built. Identical to #6 Erection and (per memory) #4 Fabrication.

### Spool-level vs joint-level status progressions

The deck nails the two-level state model that #6 Erection only sketched:

**Spool level (5 states):**
```
To site → Erected → Welded bolted → Supported → RFT
```

**Joint level (6 states):**
```
Cutting → Beveling → Fit-up → Preheat → Welding → NDE
```

The two progressions are **orthogonal**: a spool moves through its 5-state lifecycle while its constituent joints independently traverse their 6-state lifecycle. The two are joined at RFT: `spool.RFT = spool.welded_bolted AND spool.supported AND all_joints(NDE_released AND PWHT_released)` — confirms CC-18 gate logic and aligns with the test-pack RFT semantics from #7.

### Shared progress-entry UX pattern (system-wide)

All progress screens in the Assembly module use the **same shape**:

1. **Intelligent search field** (mandatory, autocomplete) — search by isometric or barcode
2. **Item summary** displayed once selected
3. **Grid of spools or joints** with collapse `−` buttons (per-row hide)
4. **Report section** at right/bottom with popup customization
5. **Excel template** for bulk progress import
6. **Date assistance:** "default date" or "date inputs assistance" for fast entry

This is the **canonical progress-entry shell** used across Easy Piping. Worth packaging as a shared PipeQC component (`<ProgressEntryShell>`) — it's reusable across Fabrication, Assembly, Erection, and likely Test Pack progress.

### Spool erection sub-module — 5-step workflow

The deck walks through the 5 progress steps in order:

| Step | What | Resulting record |
| -- | -- | -- |
| 1. To site / Erected | Mark spool as on-site and as erected | Spool dates: to_site, erected |
| 2. Generate QC W24 form | Print daily progress report at isometric level, fill on paper | PDF (paper form) |
| 3. Material traceability | Open popup, enter heat numbers from foreman's filled form | Heat-number records per joint; **material_check** auto-derived |
| 4. Welding progress update | Open weld/progress screen, enter welder + WPS per joint | Weld point records |
| 5. Welded bolted + Supported | Final dates entered from completed form; **RFT auto-calculated** | Spool dates: welded_bolted, supported, RFT |

The QC W24 form is **the same paper artifact** as in #6 Erection (CC-12). Identical loop: print → field crew fills → clerk re-keys.

### Material traceability — heat number validation is a hard block

Explicit in the deck:
> "Easy piping detects heat numbers not available in the referential and **do not access these records**."

Translation: heat numbers not in the project's material referential are **rejected at the input stage**. This is a **hard block**, not an alert. The user cannot enter an unknown heat number — they must add it to the referential first (or correct the typo).

When heat numbers ARE valid, the **material check status of the spool is automatically populated** — confirming that material check is a derived/computed status, not a separately-managed workflow step.

### WPS qualification — soft alert (NOT a hard block) — RESOLVED

The single most-asked open question across reads #4/#5/#6/#7/#8 — now resolved unambiguously:

> "The system checks if reported welder is qualified to use the selected WPS.
> If not, **the system gives an alert**."

The word is "alert". Not "rejects". Not "blocks". This means the user **can proceed** with a non-qualified welder/WPS pairing — they just see a warning. The integrity-vs-process distinction holds: WPS qualification gap is a **process compliance issue** (someone might still need to sign off later), not a **data integrity issue** (the work happened, we record it).

This has direct implications for PipeQC: see CC-28 below.

### Multi-welder per joint — confirmed

Reconfirms #4: "In case of two weld points for one joint, the user can enter different information for the two points (multi welder etc.)" — one joint can have N weld points, each with its own welder and WPS.

### Flange management — identical to #6

Exactly the same screen and field set as #6 Erection's flange management. No new fields, no new behavior. This further reinforces CC-26 (Assembly = Erection at different stage).

### Length / investment signal

#9 is the **shortest, most-redundant** deck of the set — most of it is structurally identical to #6, with only the wrapping module name changed and one explicit data-sync sentence added (the Assembly→Erection spool update). The deck reads like it was written by copy-pasting #6 and editing the title slide.

**Pitch implication (and PipeQC build implication):** Assembly is not a real "second module" — it's the same Erection module re-parameterized for a different project stage. Treat it as such. (See CC-26.)

---

## Cross-cutting findings updates (from #9)

### CC-26. Assembly = Erection-at-different-stage. Single parameterized module.

The single most important architectural finding from #9. Easy Piping built Assembly as a literal duplicate of Erection (same 4 sub-modules, same screens, same workflows) and then synced their data through the shared spool record. They paid the cost of two modules to get what should have been one parameterized module.

**PipeQC implication:** build a **single "Field Activities" (or "Construction Activities") module** with a `stage` parameter (`assembly` | `erection`). All 4 sub-modules (Spool Erection, Welding, NDE, Flange Mgmt) live inside, parameterized by stage. The stage parameter controls:

- Which dates field are recorded (`assembled_date` vs `erected_date`)
- Which downstream calculations trigger (Assembly RFT is informational; Erection RFT feeds Test Pack RFT)
- Per-project visibility (some projects don't have Assembly at all — non-modular fabrication)

Pitch payoff: "one module, configurable for modular and non-modular projects, with shared data" beats "two duplicated modules, manually kept in sync" on any technical-architecture slide.

### CC-27. "Preparation never finished" is now a 3-module pattern

`Preparation` sub-modules are explicitly listed in #4 Fabrication, #6 Erection, and #9 Assembly — but in every case **only the NDE Preparation was actually built**. The other Preparation sub-modules (Spool, Welding, Flange) are vaporware in all three modules.

This raises the EP-vendor-incomplete pattern (CC-7 / CC-8) from "interesting anecdote" to "systemic vendor failure." Pitch framing tightens to: "the original vendor shipped **NDE preparation only** across every construction module — the other 75% of the workflow was never finished."

This is also a **clear PipeQC differentiator**: build out **all** Preparation sub-modules in at least one module (Erection is highest-leverage) for the demo. Even a thin Preparation screen per activity (Spool / Welding / Flange) is more than EP ever shipped.

### CC-28. Two-tier validation taxonomy — hard block vs soft alert

#9 makes the validation model explicit by showing both in one module:

| Validation | Trigger | Behavior |
| -- | -- | -- |
| Heat number not in referential | At entry of heat number | **HARD BLOCK** — record rejected, must fix referential first |
| Welder not qualified for selected WPS | At weld progress entry | **SOFT ALERT** — warning shown, user can proceed anyway |

The principle: **data-integrity violations block, process-compliance violations warn.** This is the right design — it lets work continue in the real world (where compliance gaps get fixed later via punch items) while still preventing untrackable data from entering the system.

**PipeQC implication:** encode validation as a two-tier system with `severity ∈ {BLOCK, WARN}`. Every input rule must declare which tier it belongs to. Default: WARN. BLOCK reserved for data-integrity issues. This avoids the worst form of B2B UX failure ("the system blocks me from recording what already happened").

### CC-29. Cross-module write to a shared spool aggregate

#9 confirms what was previously inferred: there is **one spool record**, written by multiple modules. Assembly's "spool erection" screen writes the same fields that Erection's "spool erection" screen writes. No copying, no eventual consistency — it's the same row.

**PipeQC architectural implication:** the **Spool** is a top-level domain aggregate with cross-module projections, not a module-local entity. Same for Joint, Isometric, Test Pack. The module is a UI projection over these aggregates, not the owner of the data.

This also implies that the **module navigation in PipeQC should be UI-layer only** — the data model underneath is module-flat. Worth documenting in the architecture deck and worth a single shared `useSpool(id)` hook (or equivalent) instead of module-specific repositories.

---

## Open questions resolved by #9

| Open Q | Resolution |
| -- | -- |
| **Assembly vs Erection distinction** | ✅ **Resolved.** Structurally identical (same 4 sub-modules, same screens). Assembly = pre-erection joining of spools into sub-assemblies in shop/yard. Erection = on-site placement. Same UI, different scope, same data store. See CC-26. |
| **WPS qualification alert — hard or soft?** | ✅ **Resolved.** Soft alert. User can proceed with non-qualified welder; a warning is shown. See CC-28. |
| **Material-check workflow** | ✅ **Implicit.** Material check is a derived status, automatically populated when heat numbers are validated against the project's material referential. Not a separately-managed workflow step. |
| **Hard-block on unknown heat numbers** | ✅ **Confirmed.** Heat numbers not in the referential are rejected. This is the first explicit hard-block validation seen in the system. See CC-28. |
| Construction surveillance PDA checklists | ❌ **Still not found.** 5th module without PDA. Final read (#10) is the last chance. Default assumption now solidified: **never built**. |
| Penalty-shoot management UI | ❌ Not in #9. Try #10. |

---

## Open questions to answer in remaining presentations (updated after #9)

Only one read remaining (#10 Painting):

1. **PWHT entry screen** — final chance #10. If not there, the PWHT date is likely entered in the NDE batch screens (#4) and just not shown explicitly.
2. **Construction surveillance PDA checklists** — final chance #10. **Default conclusion if missing: never built (CC-7 / CC-8 / CC-27 pattern).**
3. **Painting DFT measurement workflow** — #10 (the named deck).
4. **Penalty-shoot management UI** — final chance #10.
5. **`Piping weld point process.pptx`** — sub-deck still missing from Drive folder. Worth a separate Drive search.
6. **W10 report number** — likely never defined; not blocking.
7. **Shared print-template engine?** — final chance #10. Increasingly likely each module has its own print routine.
8. **SpoolGen file types accepted** — domain interviews or `Piping weld point process.pptx`.
9. **Inquiry sub-module functionality (Spooling)** — domain interviews. Read-only lookup inferred but unverified.

---

_Last updated: 2026-05-21. Next read: #10 EasyPiping Painting (final)._
