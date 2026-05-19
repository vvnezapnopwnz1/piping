# Track I, Phase I9 — Erection Module Manual Reconciliation (backlog)

This is a **scoping document**, not an executable implementation prompt. It captures findings from the post-I8 audit (2026-05-19) where the user asked: *"проверь весь erection — соответствует ли мануалу, что не соответствует, заложить в I9"*. Each item below is a candidate scope cut for I9; pick a subset and write a focused implementation prompt per slice before executing.

## Audit source

- Manual reference: Easy Piping §12 (Spool Erection lifecycle), §19.2 (Bolted joint installation).
- Current state in working tree (post-I7 + I8): full Track I lens up to `Verified` flange bolts, but several manual gaps + UX inconsistencies surfaced during the audit.

---

## Backlog items

### I9.1 — Gate I4 Confirm on flange-bolt verification (§12.6 ↔ §19.2.1 closure)

**Finding.** I8 added the audit lens but kept the I4 Confirm button display-only against `flangeRollup.allVerified`. A spool can be marked `Welded/Bolted` Confirmed even with un-verified flange bolts. Manual §12.6 mandates flange bolting is part of the Welded/Bolted sign-off.

**Required work.**

- Widen the `validation` predicate in `welded-bolted-detail-panel.tsx` to require `flangeRollup.totalBolts === 0 || flangeRollup.allVerified`.
- Re-seed `WELDED_BOLTED_SEED` so every Confirmed spool has matching `Verified` records in `FLANGE_BOLT_SEED` (today `PL-TK100-003-A`, `PL-CW200-005-A`, `PL-FU300-007-A` are Confirmed in I4 seed — `PL-CW200-005-A` doesn't have a flange-bolt joint, OK; `PL-FU300-007-A`'s `fj-2007` is currently only `Torque Assigned`, must be upgraded to `Verified` in the seed).
- Re-run I6 RFT watcher dry-run — confirm seed transitions still close cleanly.

**Risk.** Touches three seeds. Must be a single atomic slice.

---

### I9.2 — Surface `Non-conformance` chip on Field Material Check (§12.2)

**Finding.** I7 view chips are `All / Awaiting MC / Ready to Sign / Cleared`. Per-piece status `Non-conformance` is collapsed into `Awaiting MC` at the spool-level rollup. Manual §12.2 treats NC as a distinct status requiring explicit resolution.

**Required work.**

- Add a fifth chip `Non-conformance` to `MCStatus` union in `field-material-check-view.tsx`.
- Update `deriveSpoolMCStatus`: if any record has `nonConformanceCount > 0` AND `!signedOffDate` → return `"Non-conformance"` (before `"Awaiting MC"`).
- URL param `?status=NC`. Empty-state copy *"No spools with open non-conformances."*
- Update dashboard funnel tile colour or sub-indicator so NC spools surface in the `Field Material Check` tile with a warning dot (optional).

**Risk.** Cosmetic + one selector tweak. Safe.

---

### I9.3 — Expand `FIELD_WELD_DATA` Flange Bolt coverage for I8 demo

**Finding.** Only **3** Flange Bolt joints exist in `FIELD_WELD_DATA` (`fj-2006`/`fj-2007` per offset reads + `fj-2010` + `fj-2011`; verify via `grep -c 'fieldJointType: "Flange Bolt"' lib/erection-weld-data.ts`). All 3 are seeded in `FLANGE_BOLT_SEED` (2 Verified + 1 Assigned). Result: chip `Awaiting Torque` is **empty on cold load** — violates I8 AC #2 (*"≥1 Awaiting Torque joint on first render"*).

**Required work.**

- Add 3–5 new `Flange Bolt` joints to `FIELD_WELD_DATA`, distributed across at least two spools that already exist in `ERECTED_SEED` / `WELDED_BOLTED_SEED`.
- Leave at least 2 of the new joints **unseeded** in `FLANGE_BOLT_SEED` so `Awaiting Torque` lights up.
- Re-validate that `boltedJointCount` in I4 `WELDED_BOLTED_SEED` still equals the spool's current flange-bolt count (otherwise the I4 read-only joints rollup table shows count drift on first paint).

**Risk.** Touches `FIELD_WELD_DATA` — the read-only spine of multiple I-screens. Run all 21 I8 AC and all I3/I4/I5 AC after this change.

---

### I9.4 — Move `Site Weld Progress` into the pipeline order or split into "Analytics" group

**Finding.** Current sidebar order:

```
Dashboard → To Site → Field Material Check → Erected → Welded/Bolted →
Flange Progress → Supported → RFT → Site Weld Progress
```

`Site Weld Progress` (the legacy `/erection/weld-progress` joint-level browse from manual §12.3) sits **after RFT**, breaking visual pipeline grouping. It's a cross-stage joint-level browse, not a stage-confirm screen — so it doesn't belong inline with the pipeline.

**Two options to evaluate (pick one in the I9 slice prompt):**

A. **Move adjacent to Welded/Bolted.** Insert between `Welded / Bolted` and `Flange Progress` — i.e. peer-screen for §12.3 weld activity.

B. **Split sidebar into two sections.** Add a labelled separator after `RFT`:

```
[Stages]      Dashboard / To Site / Field Material Check / Erected /
              Welded / Bolted / Flange Progress / Supported / RFT
[Analytics]   Site Weld Progress
```

Recommended: **B** — keeps stage pipeline visually linear, surfaces analytics as a distinct affordance. `config/navigation.ts` already supports nested groups; check whether a same-group separator is supported, or split into a third Erection-Analytics group.

**Risk.** Sidebar UX-only. Reversible.

---

### I9.5 — Reconsider order: `Flange Progress` vs `Welded / Bolted`

**Finding.** Current order is `Welded / Bolted` → `Flange Progress`. The spool-level **confirm** (I4) comes before the joint-level **detail** (I8). Reading top-down, a user lands on the confirm screen first, then drills into the bolt-up activity that feeds it. Inverted information flow.

**Required work.**

- Swap to `Erected → Flange Progress → Welded / Bolted` so joint-level torque activity precedes the spool-level confirm.
- Update `ERECTION_STAGE_ORDER` if a corresponding stage is added (deferred to I9.7).

**Risk.** Pure nav re-ordering. Must be agreed with the demo narrative — the current Hassan walk-through (To Site → Erected → Welded/Bolted → Supported → RFT) flows naturally; inserting Flange Progress in the middle adds one stop. May not be worth the change for a 0-NN-line UX win; flag and decide.

---

### I9.6 — Unify Site Weld Progress filter pattern with I-screens

**Finding.** Every Track-I screen uses a lightweight chip + search pattern (`All / Status1 / Status2 / …`). `Site Weld Progress` uses a heavy `FieldFilterBar` sidebar with 9 fields (PDS Area, Subcontractor, Material, Service Class, Status multi-select, Erection Status multi-select, Area Zone, Date From, Date To). Visual + interaction inconsistency.

**Required work.**

- Decide intent: is Site Weld Progress an *advanced analytics* screen (sidebar OK) or a *standard pipeline* screen (chips required)?
- Option C: keep the FieldFilterBar but add a top chip row mirroring `Erection Status` multi-select as quick-pick chips, preserving the sidebar for full filter control. Best-of-both.
- Option D: rip out the sidebar, replace with chips + a single search field, matching I-pattern. Risk: lose filter expressivity that downstream users rely on.

**Risk.** Touches a widely-used screen with established UX. Spend a design-review pass before coding.

---

### I9.7 — Optional: insert `Flange Verification` stage into `ERECTION_STAGE_ORDER`

**Finding.** I8 deferred adding a funnel tile (no breaking change to `SpoolErectionStage`). If the manual walkthrough expects torque verification to appear as a distinct stage milestone on the dashboard funnel (between Erected and Welded/Bolted), add it now.

**Required work.**

- Add `"Flange Verification"` to `SpoolErectionStage` union + `ERECTION_STAGE_ORDER` + `ERECTION_STAGE_COLOR`.
- Insert a new gate in `deriveSpoolErectionStage`: between Erected and Welded/Bolted, if a spool has any `Flange Bolt` joints and `flangeRollup.allVerified === false` → return `"Flange Verification"`.
- Funnel tile clickable → `/erection/flange-progress`.
- Re-verify: every existing seed transitions cleanly under the new gate, no stage downgrade.

**Risk.** Mutates the stage enum. Cascades into dashboard counters, funnel colour map, navigation order. **Only do this if manual-fidelity demands it.** Otherwise leave the lens-only I8 design.

---

### I9.8 — Feed `flangeRollup.allVerified` into `isSpoolRFTEligible` (§12.8)

**Finding.** I6 RFT eligibility today keys off Supported sign-off only. Per manual §12.8, RFT (Ready for Test) requires all field joints to be physically complete — including torque verification on every flange bolt. Today a spool can reach RFT with un-verified flange bolts.

**Required work.**

- Widen `isSpoolRFTEligible(...)` with a `flangeRollup?: SpoolFlangeBoltRollup` parameter.
- Block RFT when `flangeRollup && !flangeRollup.allVerified`.
- Re-seed `RFT_SEED` predecessors so the existing RFT spool (`PL-TK100-003-A`) has all its Flange Bolt joints `Verified` in `FLANGE_BOLT_SEED` (`fj-2011` already does).
- Update I6 RFT watcher hook to pass the flange rollup.

**Risk.** Cross-store dependency change. Tight coupling. Run all I6 AC after.

---

## Suggested slicing for I9 implementation prompts

Do not bundle all 8 items into one slice. Suggested cuts:

1. **I9a — seed coverage + chip surfacing**: I9.3 + I9.2 (data-only changes, low risk, immediate demo improvement).
2. **I9b — gate widening**: I9.1 + I9.8 (cross-store gates, single thematic slice, run full Track-I AC after).
3. **I9c — sidebar UX**: I9.4 + I9.5 + I9.6 (pure UX, no data changes, ship behind a screenshot review).
4. **I9d — stage enum expansion (optional)**: I9.7 alone (the only slice that mutates the stage enum; gate behind a user decision).

Each cut should produce a dedicated `docs/prompts/PipeQC_Track_I_Phase_I9X.md` prompt before coding, matching the G5/I8 prompt template.

---

## Pre-implementation checklist (any I9 slice)

Before writing a slice prompt:

- Re-read Easy Piping §12 (full chapter) and §19.2 in the user's reference docs.
- Re-read this backlog — confirm the finding still holds (the working tree changes daily).
- For any slice that touches a seed (`FIELD_WELD_DATA`, `WELDED_BOLTED_SEED`, `FLANGE_BOLT_SEED`, `RFT_SEED`), enumerate the cascade of affected acceptance criteria across I3/I4/I5/I6/I8 and include them in the new prompt's AC list.
- For any slice that changes `ERECTION_STAGE_ORDER`, audit `components/erection-dashboard.tsx` funnel render + every existing `deriveSpoolErectionStage` consumer.
