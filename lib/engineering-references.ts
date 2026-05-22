/**
 * Engineering reference data — read-only project referentials from §3.
 *
 * These datasets represent imported engineering documents:
 * - WPS list (§3.5)
 * - NDE Matrix (§3.9)
 * - Rework Codes (§3.10)
 * - Joint Categories X/Y/Z (§3.13)
 *
 * Static — never mutated. In production these are imported from IDS or
 * contract documents, not edited per project.
 */

// ─── WPS (§3.5) ─────────────────────────────────────────────────────────────

export interface WPSRecord {
  code: string
  process: "GTAW" | "SMAW" | "GMAW" | "FCAW" | "SAW"
  baseMaterial: string
  fillerMaterial: string
  positions: string[]
  thicknessRange: string
  diameterRange: string
  revision: string
  approvedDate: string
  status: "Active" | "Superseded"
}

export const WPS_LIST: WPSRecord[] = [
  {
    code: "WPS-001",
    process: "GTAW",
    baseMaterial: "P91",
    fillerMaterial: "ER90S-B9",
    positions: ["1G", "2G", "5G", "6G"],
    thicknessRange: "3.0–25.0 mm",
    diameterRange: "DN 25–300",
    revision: "Rev. 2",
    approvedDate: "2025-01-15",
    status: "Active",
  },
  {
    code: "WPS-002",
    process: "GTAW",
    baseMaterial: "316L SS",
    fillerMaterial: "ER316L",
    positions: ["1G", "2G", "5G"],
    thicknessRange: "2.0–12.0 mm",
    diameterRange: "DN 25–150",
    revision: "Rev. 1",
    approvedDate: "2025-02-20",
    status: "Active",
  },
  {
    code: "WPS-003",
    process: "SMAW",
    baseMaterial: "A106-Gr.B",
    fillerMaterial: "E7018",
    positions: ["1G", "2G", "5G"],
    thicknessRange: "4.0–30.0 mm",
    diameterRange: "DN 50–600",
    revision: "Rev. 3",
    approvedDate: "2024-11-10",
    status: "Active",
  },
  {
    code: "WPS-004",
    process: "GMAW",
    baseMaterial: "A106-Gr.B",
    fillerMaterial: "ER70S-6",
    positions: ["1G", "2G"],
    thicknessRange: "3.0–20.0 mm",
    diameterRange: "DN 100–800",
    revision: "Rev. 1",
    approvedDate: "2025-03-05",
    status: "Active",
  },
  {
    code: "WPS-005",
    process: "FCAW",
    baseMaterial: "Duplex 2205",
    fillerMaterial: "ER2209",
    positions: ["1G", "2G", "5G"],
    thicknessRange: "5.0–25.0 mm",
    diameterRange: "DN 80–400",
    revision: "Rev. 1",
    approvedDate: "2025-01-28",
    status: "Active",
  },
  {
    code: "WPS-006",
    process: "SAW",
    baseMaterial: "A106-Gr.B",
    fillerMaterial: "EM12K + OK Flux 10.62",
    positions: ["1G"],
    thicknessRange: "10.0–50.0 mm",
    diameterRange: "DN 300–1200",
    revision: "Rev. 2",
    approvedDate: "2024-09-15",
    status: "Active",
  },
  {
    code: "WPS-007",
    process: "GTAW",
    baseMaterial: "304L SS",
    fillerMaterial: "ER308L",
    positions: ["1G", "2G", "5G", "6G"],
    thicknessRange: "2.0–10.0 mm",
    diameterRange: "DN 25–200",
    revision: "Rev. 1",
    approvedDate: "2025-04-10",
    status: "Active",
  },
  {
    code: "WPS-008",
    process: "SMAW",
    baseMaterial: "P22",
    fillerMaterial: "E8018-B2",
    positions: ["1G", "2G", "5G"],
    thicknessRange: "4.0–25.0 mm",
    diameterRange: "DN 50–350",
    revision: "Rev. 1",
    approvedDate: "2024-06-20",
    status: "Superseded",
  },
]

// ─── NDE Matrix (§3.9) ──────────────────────────────────────────────────────

export interface NDEMatrixRecord {
  id: string
  serviceClass: "Class 1" | "Class 2" | "Class 3" | "Utility"
  diameterRange: string
  thicknessRange: string
  primaryMethod: "RT" | "UT" | "PT" | "MT" | "VT"
  primaryCoverage: string
  secondaryMethod?: "RT" | "UT" | "PT" | "MT" | "VT"
  secondaryCoverage?: string
  acceptanceCriterion: string
}

export const NDE_MATRIX: NDEMatrixRecord[] = [
  {
    id: "NDE-MTX-001",
    serviceClass: "Class 1",
    diameterRange: "DN 25–50",
    thicknessRange: "≤ 10 mm",
    primaryMethod: "RT",
    primaryCoverage: "100%",
    secondaryMethod: "PT",
    secondaryCoverage: "100%",
    acceptanceCriterion: "ASME B31.3 §341.3.2",
  },
  {
    id: "NDE-MTX-002",
    serviceClass: "Class 1",
    diameterRange: "DN 80–150",
    thicknessRange: "10–25 mm",
    primaryMethod: "UT",
    primaryCoverage: "100%",
    secondaryMethod: "MT",
    secondaryCoverage: "10%",
    acceptanceCriterion: "ASME B31.3 §341.3.2",
  },
  {
    id: "NDE-MTX-003",
    serviceClass: "Class 2",
    diameterRange: "DN 25–100",
    thicknessRange: "≤ 20 mm",
    primaryMethod: "RT",
    primaryCoverage: "10%",
    acceptanceCriterion: "ASME B31.3 §341.3.3",
  },
  {
    id: "NDE-MTX-004",
    serviceClass: "Class 2",
    diameterRange: "DN 150–400",
    thicknessRange: "20–40 mm",
    primaryMethod: "UT",
    primaryCoverage: "10%",
    secondaryMethod: "MT",
    secondaryCoverage: "Spot",
    acceptanceCriterion: "ASME B31.3 §341.3.3",
  },
  {
    id: "NDE-MTX-005",
    serviceClass: "Class 3",
    diameterRange: "DN 50–300",
    thicknessRange: "≤ 30 mm",
    primaryMethod: "VT",
    primaryCoverage: "100%",
    acceptanceCriterion: "ASME B31.3 §341.3.4",
  },
  {
    id: "NDE-MTX-006",
    serviceClass: "Utility",
    diameterRange: "DN 25–600",
    thicknessRange: "All",
    primaryMethod: "VT",
    primaryCoverage: "100%",
    acceptanceCriterion: "ASME B31.3 §341.3.5",
  },
]

// ─── Rework Codes (§3.10) ───────────────────────────────────────────────────

export interface ReworkCode {
  code: string
  shortName: string
  description: string
  category: "Surface defect" | "Internal defect" | "Geometry" | "Material" | "Procedure"
  severity: "Minor" | "Major" | "Critical"
  defaultAction: "Grind & re-weld" | "Cut-out" | "Re-test" | "Repair-weld" | "Document & accept"
}

export const REWORK_CODES: ReworkCode[] = [
  {
    code: "RW-001",
    shortName: "Porosity",
    description: "Gas pockets or voids in the weld metal caused by trapped gases during solidification.",
    category: "Internal defect",
    severity: "Major",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-002",
    shortName: "Crack",
    description: "A fracture in the weld or heat-affected zone that may propagate under stress.",
    category: "Internal defect",
    severity: "Critical",
    defaultAction: "Cut-out",
  },
  {
    code: "RW-003",
    shortName: "Slag inclusion",
    description: "Non-metallic solid material entrapped in the weld metal or between weld passes.",
    category: "Internal defect",
    severity: "Major",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-004",
    shortName: "Undercut",
    description: "A groove melted into the base metal adjacent to the weld toe that is not filled by weld metal.",
    category: "Surface defect",
    severity: "Minor",
    defaultAction: "Repair-weld",
  },
  {
    code: "RW-005",
    shortName: "Incomplete fusion",
    description: "Lack of union between weld metal and base metal or between successive weld passes.",
    category: "Internal defect",
    severity: "Major",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-006",
    shortName: "Incomplete penetration",
    description: "Weld metal does not extend through the full thickness of the joint.",
    category: "Geometry",
    severity: "Major",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-007",
    shortName: "Excess reinforcement",
    description: "Weld metal deposited beyond the specified height on the face of the weld.",
    category: "Geometry",
    severity: "Minor",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-008",
    shortName: "Underfill",
    description: "Insufficient weld metal in the joint below the specified profile.",
    category: "Geometry",
    severity: "Major",
    defaultAction: "Repair-weld",
  },
  {
    code: "RW-009",
    shortName: "Arc strike",
    description: "Accidental arc damage to the base metal outside the intended weld area.",
    category: "Surface defect",
    severity: "Minor",
    defaultAction: "Grind & re-weld",
  },
  {
    code: "RW-010",
    shortName: "Misalignment",
    description: "Offset between pipe sections exceeding the permitted tolerance for the joint.",
    category: "Geometry",
    severity: "Major",
    defaultAction: "Document & accept",
  },
]

// ─── Defect Codes (NDE finding taxonomy — distinct from Rework Codes) ────────

export interface DefectCode {
  code: string
  shortName: string
  description: string
  severity: "Minor" | "Major" | "Critical"
}

export const DEFECT_CODES: DefectCode[] = [
  { code: "POR", shortName: "Porosity", description: "Gas pockets or voids in weld metal — root, cap, or fill", severity: "Major" },
  { code: "CRK", shortName: "Crack", description: "Fracture in weld or HAZ — longitudinal, transverse, or branching", severity: "Critical" },
  { code: "LOF", shortName: "Lack of Fusion", description: "No metallurgical bond between weld passes or weld and base metal", severity: "Major" },
  { code: "SLG", shortName: "Slag inclusion", description: "Non-metallic solid trapped in weld metal between passes", severity: "Major" },
  { code: "UNC", shortName: "Undercut", description: "Groove melted into base metal not filled by weld metal", severity: "Minor" },
  { code: "INC", shortName: "Incomplete Penetration", description: "Weld metal does not extend through full joint thickness", severity: "Major" },
  { code: "OTH", shortName: "Other", description: "Free-text defect not in standard taxonomy — inspector remarks required", severity: "Major" },
]

// ─── Joint Categories X / Y / Z (§3.13) ─────────────────────────────────────

export interface JointCategory {
  code: "X" | "Y" | "Z"
  name: string
  description: string
  examples: string[]
  resolutionRequired: string
  enforcedIn: string[]
}

export const JOINT_CATEGORIES: JointCategory[] = [
  {
    code: "X",
    name: "Test-blocking",
    description:
      "Items that must be resolved before hydrotest can proceed. Any open Category X item blocks the test pack from advancing to testing.",
    examples: [
      "Defective weld on pressure boundary",
      "Missing support or restraint",
      "Unapproved deviation from piping spec",
    ],
    resolutionRequired: "Before hydrotest",
    enforcedIn: ["Item Clearance", "Blinding eligibility gate"],
  },
  {
    code: "Y",
    name: "Post-test",
    description:
      "Items discovered during or after hydrotest that must be closed before pre-commissioning. These do not block the test itself, but block handover.",
    examples: [
      "Minor leak at flange after test",
      "Missing insulation post-test",
      "Paint touch-up required",
    ],
    resolutionRequired: "After hydrotest, before pre-commissioning",
    enforcedIn: ["Reinstatement Preparation"],
  },
  {
    code: "Z",
    name: "Post-commissioning",
    description:
      "Items that can remain open during pre-commissioning but must be closed before final commissioning and handover to operations.",
    examples: [
      "Labeling incomplete",
      "As-built documentation pending",
      "Spare parts not yet delivered",
    ],
    resolutionRequired: "After pre-commissioning",
    enforcedIn: ["Reinstatement Preparation"],
  },
]
