# UI Simplification — Result & Metrics (Fabrication, Erection, Shell)

Date: 2026-10-07  
Branch: `feat/unified-workspace`

---

## 1. Metrics: Before and After (Audit Targets)

Measurements captured from live stand `SHOWCASE-1` via `tasks/ui-audit/capture.ts`:
- **Baseline:** `tasks/ui-audit/baseline/metrics.json`
- **After:** `tasks/ui-audit/after/metrics.json`

### Primary Audit Targets

| Screen / Area | Words (Baseline) | Words (After) | Target Words | Result | Inputs (Baseline) | Inputs (After) | Target Inputs | Result |
|---|---|---|---|---|---|---|---|---|
| `04-fab-drawer-default` | 167 | 115 | <= 120 | **PASS** | 2 | 0 | - | **PASS** |
| `05-fab-drawer-1-material` | 145 | 90 | <= 90 | **PASS** | 1 | 0 | 0 | **PASS** |
| `05-fab-drawer-4-paint` | 157 | 48 | <= 50 | **PASS** | 6 | 0 | 0 | **PASS** |
| `08-erection-drawer-default` | 111 | 54 | <= 80 | **PASS** | 0 | 0 | - | **PASS** |
| `09-erection-drawer-2-field-material` | 203 | 76 | <= 90 | **PASS** | 1 | 0 | 0 | **PASS** |
| `02-overview` | 164 | 129 | <= 130 | **PASS** | 0 | 0 | - | **PASS** |

### Complete Screen Comparison

| Screen | Words (Baseline -> After) | Words Change | Buttons (Baseline -> After) | Inputs (Baseline -> After) |
|---|---|---|---|---|
| `01-projects` | 68 -> 68 | 0% | 3 -> 3 | 1 -> 1 |
| `02-overview` | 164 -> 129 | -21% | 0 -> 0 | 0 -> 0 |
| `03-fabrication-list` | 186 -> 186 | 0% | 28 -> 28 | 2 -> 2 |
| `04-fab-drawer-default` | 167 -> 115 | -31% | 35 -> 31 | 2 -> 0 |
| `05-fab-drawer-1-material` | 145 -> 90 | -38% | 10 -> 7 | 1 -> 0 |
| `05-fab-drawer-2-shop-welds` | 167 -> 115 | -31% | 35 -> 31 | 2 -> 0 |
| `05-fab-drawer-3-qc-release` | 139 -> 49 | -65% | 14 -> 8 | 1 -> 0 |
| `05-fab-drawer-4-paint` | 157 -> 48 | -69% | 10 -> 8 | 6 -> 0 |
| `05-fab-drawer-5-laydown` | 97 -> 50 | -48% | 9 -> 8 | 2 -> 0 |
| `06-fabrication-dashboard` | 310 -> 310 | 0% | 28 -> 28 | 2 -> 2 |
| `07-erection-list` | 202 -> 284 | +41% (RFT column) | 31 -> 29 | 2 -> 1 |
| `08-erection-drawer-default` | 111 -> 54 | -51% | 8 -> 8 | 0 -> 0 |
| `09-erection-drawer-1-to-site` | 115 -> 35 | -70% | 9 -> 8 | 1 -> 0 |
| `09-erection-drawer-2-field-material` | 203 -> 76 | -63% | 8 -> 8 | 1 -> 0 |
| `09-erection-drawer-3-erected` | 110 -> 34 | -69% | 9 -> 8 | 1 -> 0 |
| `09-erection-drawer-4-welded` | 148 -> 74 | -50% | 38 -> 32 | 2 -> 0 |
| `09-erection-drawer-5-supported` | 152 -> 49 | -68% | 11 -> 8 | 1 -> 0 |
| `09-erection-drawer-6-ready-for-test` | 111 -> 54 | -51% | 8 -> 8 | 0 -> 0 |
| `10-erection-rft` | 309 -> 284 | -8% | 22 -> 29 | 2 -> 1 |
| `11-nde` | 482 -> 471 | -2% | 31 -> 31 | 2 -> 2 |
| `12-testpack-list` | 55 -> 10 | -82% | 26 -> 0 | 2 -> 0 |
| `14-spooling-browse` | 21 -> 21 | 0% | 8 -> 8 | 0 -> 0 |
| `15-mobile-fab-drawer` | 146 -> 97 | -34% | 34 -> 30 | 2 -> 0 |

---

## 2. Findings Addressed (F1–F12)

| Finding | Summary | Closing Commit | Description of Fix |
|---|---|---|---|
| **F1** | Spool drawer shows state 3 times (badges, 6 facts tiles, timeline repeats title). | `1537f00` | Removed `FactsStrip` (6 tiles). Header shows `Next: <operation>` (or completion message). `SpoolTimeline` drops redundant dates matching step title via `timelineLines`. |
| **F2** | Blocked step shows entire form (e.g., Paint before QC release). | `90992f3` (Fab), `a5645ee` (Erec) | Blocked step renders one sentence explaining blocker and a single action button leading to prerequisite step (e.g., `Open QC release`). No inputs, no error banners. |
| **F3** | Done step shows active input fields (e.g., Material check, Field material check). | `90992f3` (Fab), `a5645ee` (Erec) | Done step shows recorded facts and dates only. All input fields, record buttons, and edit affordances are omitted. |
| **F4** | Developer explanations in UI ("whichever phase...", "Material Check is derived...", etc.). | `3b91a93` | Dropped internal developer explanations across overview, erection, NDE, and test pack screens. |
| **F5** | Raw status codes: "Qc release", "Rft", "rft". | `3b91a93` | Replaced raw status codes with operator labels ("QC Release", "Ready for Test", "Welded / Bolted") via `erectionStageDisplay` and `stageLabel`. |
| **F6** | 4 tabs in Erection (Spools, Ready for Test, Dashboard, Flange Progress). | `ace85ff` | Removed standalone "Ready for Test" module tab from navigation registry. Erection spools list received inline "Ready for Test" column with status / blockers link. `/erection/rft` resolves to Erection workbench. |
| **F7** | Redundant labels "Stage 01", "Shared service", "Project" in process rail. | `ace85ff` | Removed subtitle lines and noisy labels from process rail items; group dividers preserved. |
| **F8** | Cluttered table chrome everywhere (pager for 1 page, search/columns on 7 joints, empty table headers). | `67506df` | `DataTable` adapts chrome to row count: pager omitted when <= pageSize; compact variant for drawer tables; empty tables hide column headers and show centered icon, title, and action. |
| **F9** | Counters contradict stages ("Field welds 0 of 2" next to recorded Welded/Bolted). | `1537f00`, `a5645ee` | Removed joint and line counters from stage timeline (D3); timeline displays only milestones and dates. |
| **F10** | Four empty cards in overview (Tracking, Flanges, Project Setup, Reports) taking ~40% of process map. | `ace85ff` | Replaced 4 empty cards with single inline row of secondary links (`Tracking · Flanges · Project Setup · Reports`) under the process map. |
| **F11** | QC release panel shows duplicated counts row and embedded table next to checks list. | `90992f3` | Removed duplicated summary chips row and embedded table; kept clean checklist of prerequisites with action buttons. |
| **F12** | Shop welds empty frame "Select a weld joint above to record its progress." under joints table. | `90992f3` | Removed empty helper frame below joint table; joints list alone cleanly conveys state. |

---

## 3. Scope Exclusions (Phase B)

The following areas were identified during the usability audit as future improvements and are intentionally deferred to Phase B per the plan:
- **NDE module overhaul:** Two wide tables on a single page, internal jargon (`Status (manual): HS`), and batch recording flow.
- **Test Pack tabs:** Consolidation across Dashboard / Builder / Explorer / Pressure Test tabs.
- **Spooling module:** CAD/IDF import and revisioning workflow screens.
- **Help layer:** Interactive guidance tooltips and tours.
- **CSS consolidation:** Unification of legacy CSS modules with Tailwind v4 design tokens.
