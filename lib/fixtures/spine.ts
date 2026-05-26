/**
 * The canonical spine — the single source of demo truth.
 *
 * Each hero spool is described ONCE here as a full lifecycle object following
 * the entity model in docs/tracks/db_.md
 * (TEST_PACK -> ISO -> SPOOL -> PIECE/WELD -> NDE_BATCH -> PUNCH). The derive/*
 * functions project these into the flat per-module seed shapes each store
 * expects, so a spool can never drift between modules.
 *
 * Domain types are imported type-only (erased at runtime) so this module has
 * no runtime dependency on the seed files that re-export from fixtures —
 * keeping the runtime import graph acyclic.
 *
 * Roster and stages: docs/superpowers/specs/2026-05-26-unified-mock-data-fixtures-design.md §4
 */
import type { SpoolFabStage } from "@/lib/spool-data"
import type { SpoolErectionStage } from "@/lib/erection-stage"

export type SpineSystem = "CW200" | "FU300" | "TK100"

export interface SpinePiece {
  id: string
  tag: string
  kind: "Pipe Stub" | "Fitting" | "Flange" | "Weld Stub" | "Pipe"
  heatNo: string
  millCertRef?: string
  mcStatus: "Pending" | "Cleared" | "Non-conformance"
  ncRemark?: string
  /** true -> validator skips the heat check (deliberate "not in list" demo case) */
  intentionallyInvalid?: boolean
}

export interface SpineWeld {
  weldNo: string
  type: "SHOP" | "FIELD"
  jointType: "Butt Weld" | "Socket Weld" | "Flange Bolt"
  welderId: string
  wps: string
  ndeBatchId?: string
  ndeMethod?: "RT" | "UT" | "PT" | "MT" | "VT"
  ndeResult?: "Accepted" | "Rejected" | "Pending"
  reworkCode?: string
}

export interface SpinePunch {
  punchId: string
  category: "X" | "Y" | "Z"
  description: string
}

export interface SpineSpool {
  spoolNo: string
  system: SpineSystem
  material: string
  isoNo: string
  testPackNo?: string
  fabStage: SpoolFabStage
  erectionStage?: SpoolErectionStage
  /** true -> QC Release is held (demo case #8) */
  qcHold?: boolean
  subcontractorCode?: string
  pdsAreaCode?: string
  pieces: SpinePiece[]
  welds: SpineWeld[]
  punches?: SpinePunch[]
}

export const SPINE: SpineSpool[] = [
  // #1 — Spooling / Engineering: ISO in checking, not yet in fabrication
  {
    spoolNo: "PL-CW200-001-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Not Started",
    pieces: [], welds: [],
  },

  // #2 — Material Check OK
  {
    spoolNo: "PL-CW200-002-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Material Check",
    subcontractorCode: "SUB-001", pdsAreaCode: "PR-01",
    pieces: [
      { id: "P-CW200-002-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-A106B-44210", millCertRef: "MILL-2026-2203", mcStatus: "Cleared" },
      { id: "P-CW200-002-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-CS-A106B-44211", millCertRef: "MILL-2026-2204", mcStatus: "Cleared" },
    ],
    welds: [],
  },

  // #3 — Material Check with NC + deliberately unregistered heat (alert demo)
  {
    spoolNo: "PL-CW200-003-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-01", fabStage: "Material Check",
    subcontractorCode: "SUB-001", pdsAreaCode: "PR-01",
    pieces: [
      { id: "P-CW200-003-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-A106B-44212", millCertRef: "MILL-2026-2205", mcStatus: "Cleared" },
      {
        id: "P-CW200-003-A-2", tag: "FIT-1", kind: "Fitting", heatNo: "HT-UNREGISTERED-9999",
        mcStatus: "Non-conformance",
        ncRemark: "Mill cert missing — heat not in project piping material list",
        intentionallyInvalid: true,
      },
    ],
    welds: [],
  },

  // #4 — Fit-up / Shop weld in progress (no NDE yet)
  {
    spoolNo: "PL-CW200-004-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-02", fabStage: "Weld Progress",
    subcontractorCode: "SUB-001", pdsAreaCode: "PR-01",
    pieces: [
      { id: "P-CW200-004-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-A106B-44213", millCertRef: "MILL-2026-2206", mcStatus: "Cleared" },
      { id: "P-CW200-004-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-CS-A106B-44214", millCertRef: "MILL-2026-2211", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-CW200-004-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-033", wps: "WPS-003" },
    ],
  },

  // #5 — NDE Accepted
  {
    spoolNo: "PL-FU300-005-A", system: "FU300", material: "LTCS-A333",
    isoNo: "ISO-FU300-01", fabStage: "Fabricated",
    subcontractorCode: "SUB-001", pdsAreaCode: "CA-02",
    pieces: [
      { id: "P-FU300-005-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-LTCS-A333-60010", millCertRef: "MILL-2026-6001", mcStatus: "Cleared" },
      { id: "P-FU300-005-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-LTCS-A333-60011", millCertRef: "MILL-2026-6002", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-FU300-005-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-042", wps: "WPS-003", ndeBatchId: "NDE-B-001", ndeMethod: "RT", ndeResult: "Accepted" },
      { weldNo: "PL-FU300-005-A-W2", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-042", wps: "WPS-003", ndeBatchId: "NDE-B-001", ndeMethod: "RT", ndeResult: "Accepted" },
    ],
  },

  // #6 — NDE Rejected -> rework -> re-test accepted
  {
    spoolNo: "PL-FU300-006-A", system: "FU300", material: "LTCS-A333",
    isoNo: "ISO-FU300-01", fabStage: "Weld Progress",
    subcontractorCode: "SUB-001", pdsAreaCode: "CA-02",
    pieces: [
      { id: "P-FU300-006-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-LTCS-A333-60010", millCertRef: "MILL-2026-6001", mcStatus: "Cleared" },
      { id: "P-FU300-006-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-LTCS-A333-60011", millCertRef: "MILL-2026-6002", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-FU300-006-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-054", wps: "WPS-003", ndeBatchId: "NDE-B-002", ndeMethod: "RT", ndeResult: "Rejected", reworkCode: "RW-001" },
      { weldNo: "PL-FU300-006-A-W1R", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-061", wps: "WPS-003", ndeBatchId: "NDE-B-003", ndeMethod: "RT", ndeResult: "Accepted" },
    ],
  },

  // #7 — PWHT done / Paint in progress (alloy P91)
  {
    spoolNo: "PL-FU300-007-A", system: "FU300", material: "CS-P91",
    isoNo: "ISO-FU300-01", fabStage: "Sent to Paint",
    subcontractorCode: "SUB-001", pdsAreaCode: "CA-02",
    pieces: [
      { id: "P-FU300-007-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-CS-P91-99814", millCertRef: "MILL-2026-1105", mcStatus: "Cleared" },
      { id: "P-FU300-007-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-CS-P91-99815", millCertRef: "MILL-2026-1106", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-FU300-007-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-007", wps: "WPS-001", ndeBatchId: "NDE-B-004", ndeMethod: "UT", ndeResult: "Accepted" },
    ],
  },

  // #8 — QC Release held
  {
    spoolNo: "PL-TK100-008-A", system: "TK100", material: "SS-316L",
    isoNo: "ISO-TK100-01", fabStage: "QC Release", qcHold: true,
    subcontractorCode: "SUB-002", pdsAreaCode: "RA-01",
    pieces: [
      { id: "P-TK100-008-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-SS-316L-55120", millCertRef: "MILL-2026-3841", mcStatus: "Cleared" },
      { id: "P-TK100-008-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-SS-316L-55140", millCertRef: "MILL-2026-3848", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-TK100-008-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-015", wps: "WPS-002", ndeBatchId: "NDE-B-005", ndeMethod: "PT", ndeResult: "Accepted" },
    ],
  },

  // #9 — Laydown (placed on yard, not released)
  {
    spoolNo: "PL-TK100-009-A", system: "TK100", material: "SS-316L",
    isoNo: "ISO-TK100-01", fabStage: "Laydown",
    subcontractorCode: "SUB-002", pdsAreaCode: "RA-01",
    pieces: [
      { id: "P-TK100-009-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-SS-316L-55141", millCertRef: "MILL-2026-3849", mcStatus: "Cleared" },
      { id: "P-TK100-009-A-2", tag: "PIPE-2", kind: "Pipe", heatNo: "HT-SS-316L-55150", millCertRef: "MILL-2026-3851", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-TK100-009-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-015", wps: "WPS-002", ndeBatchId: "NDE-B-006", ndeMethod: "PT", ndeResult: "Accepted" },
    ],
  },

  // #10 — To site / released
  {
    spoolNo: "PL-TK100-010-A", system: "TK100", material: "SS-316L",
    isoNo: "ISO-TK100-01", testPackNo: "TP-TK100-A", fabStage: "Laydown",
    erectionStage: "To Site",
    subcontractorCode: "SUB-002", pdsAreaCode: "RA-01",
    pieces: [
      { id: "P-TK100-010-A-1", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-SS-316L-55151", millCertRef: "MILL-2026-3852", mcStatus: "Cleared" },
      { id: "P-TK100-010-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-SS-316L-55120", millCertRef: "MILL-2026-3841", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-TK100-010-A-W1", type: "SHOP", jointType: "Butt Weld", welderId: "WLD-015", wps: "WPS-002", ndeBatchId: "NDE-B-007", ndeMethod: "PT", ndeResult: "Accepted" },
    ],
  },

  // #11 — Erection: field material check + field weld
  {
    spoolNo: "PL-CW200-011-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-02", testPackNo: "TP-CW200-A", fabStage: "Laydown",
    erectionStage: "Field Material Check",
    subcontractorCode: "SUB-002", pdsAreaCode: "VS-01",
    pieces: [
      { id: "P-CW200-011-A-1", tag: "STUB-1", kind: "Pipe Stub", heatNo: "HT-CS-A106B-44210", millCertRef: "MILL-2026-2203", mcStatus: "Cleared" },
      { id: "P-CW200-011-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-CS-A106B-44211", millCertRef: "MILL-2026-2204", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-CW200-011-A-FW1", type: "FIELD", jointType: "Butt Weld", welderId: "WLD-F01", wps: "WPS-003", ndeBatchId: "NDE-B-008", ndeMethod: "RT", ndeResult: "Accepted" },
    ],
  },

  // #12 — Bolted / flange-bolt + supports
  {
    spoolNo: "PL-CW200-012-A", system: "CW200", material: "CS-A106B",
    isoNo: "ISO-CW200-02", testPackNo: "TP-CW200-A", fabStage: "Laydown",
    erectionStage: "Supported",
    subcontractorCode: "SUB-002", pdsAreaCode: "VS-01",
    pieces: [
      { id: "P-CW200-012-A-1", tag: "STUB-1", kind: "Pipe Stub", heatNo: "HT-CS-A106B-44212", millCertRef: "MILL-2026-2205", mcStatus: "Cleared" },
      { id: "P-CW200-012-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-CS-A106B-44213", millCertRef: "MILL-2026-2206", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-CW200-012-A-FB1", type: "FIELD", jointType: "Flange Bolt", welderId: "WLD-F02", wps: "WPS-003" },
      { weldNo: "PL-CW200-012-A-FB2", type: "FIELD", jointType: "Flange Bolt", welderId: "WLD-F02", wps: "WPS-003" },
    ],
  },

  // #13 — Test pack: line check / blinding
  {
    spoolNo: "PL-FU300-013-A", system: "FU300", material: "LTCS-A333",
    isoNo: "ISO-FU300-02", testPackNo: "TP-FU300-A", fabStage: "Laydown",
    erectionStage: "RFT",
    subcontractorCode: "SUB-002", pdsAreaCode: "VS-01",
    pieces: [
      { id: "P-FU300-013-A-1", tag: "STUB-1", kind: "Pipe Stub", heatNo: "HT-LTCS-A333-60010", millCertRef: "MILL-2026-6001", mcStatus: "Cleared" },
      { id: "P-FU300-013-A-2", tag: "PIPE-1", kind: "Pipe", heatNo: "HT-LTCS-A333-60011", millCertRef: "MILL-2026-6002", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-FU300-013-A-FW1", type: "FIELD", jointType: "Butt Weld", welderId: "WLD-F03", wps: "WPS-003", ndeBatchId: "NDE-B-009", ndeMethod: "RT", ndeResult: "Accepted" },
    ],
  },

  // #14 — Hydrotested + punch items X / Y / Z
  {
    spoolNo: "PL-TK100-014-A", system: "TK100", material: "SS-316L",
    isoNo: "ISO-TK100-02", testPackNo: "TP-TK100-A", fabStage: "Laydown",
    erectionStage: "RFT",
    subcontractorCode: "SUB-002", pdsAreaCode: "RA-01",
    pieces: [
      { id: "P-TK100-014-A-1", tag: "STUB-1", kind: "Pipe Stub", heatNo: "HT-SS-316L-55140", millCertRef: "MILL-2026-3848", mcStatus: "Cleared" },
      { id: "P-TK100-014-A-2", tag: "FLG-1", kind: "Flange", heatNo: "HT-SS-316L-55141", millCertRef: "MILL-2026-3849", mcStatus: "Cleared" },
    ],
    welds: [
      { weldNo: "PL-TK100-014-A-FW1", type: "FIELD", jointType: "Butt Weld", welderId: "WLD-F04", wps: "WPS-002", ndeBatchId: "NDE-B-010", ndeMethod: "PT", ndeResult: "Accepted" },
    ],
    punches: [
      { punchId: "PCH-TK100-014-X1", category: "X", description: "Defective weld on pressure boundary — must clear before hydrotest" },
      { punchId: "PCH-TK100-014-Y1", category: "Y", description: "Minor flange leak observed after test — close before pre-commissioning" },
      { punchId: "PCH-TK100-014-Z1", category: "Z", description: "Line labeling incomplete — close before final handover" },
    ],
  },
]
