/**
 * Testpack seed data — isolated from testpack-data.ts (explorer data).
 * Used by testpack-store.ts for the Line Check workflow demo.
 */

export type LineCheckStatus =
  | "NotEligible"
  | "Eligible"
  | "Assigned"
  | "InProgress"
  | "Done"

export type BlindingStatus =
  | "NotEligible"
  | "Eligible"
  | "Assigned"
  | "Done"

export type PunchCategory = "X" | "Y" | "Z"

export interface PunchItem {
  id: string
  code: string
  description: string
  category: PunchCategory
  isoId: string
  spoolId?: string
  originator: string
  createdAt: string
  clearedAt?: string
  clearedBy?: string
  clearanceRequestId?: string
  reinstatedAt?: string
  reinstatedBy?: string
  reinstatementRequestId?: string
  jointerNo?: string
  reportNo?: string
  tagNo?: string
}

export interface CheckingRequest {
  id: string
  createdAt: string
  assignedTo: string
  isoIds: string[]
}

export interface ClearanceRequest {
  id: string
  createdAt: string
  assignedTo: string
  punchItemIds: string[]
}

export interface BlindingRequest {
  id: string
  createdAt: string
  assignedTo: string
  testpackIds: string[]
}

export interface ReinstatementRequest {
  id: string
  createdAt: string
  assignedTo: string
  punchItemIds: string[]
}

export interface ISORecord {
  id: string
  testpackId: string
  spoolsSupported: boolean
  allWeldsWelded: boolean
  lineCheckStatus: LineCheckStatus
  lineCheckAssignedTo?: string
  lineCheckRequestId?: string
  lineCheckDate?: string
  punchItemIds: string[]
}

export interface TestPackRecord {
  id: string
  no: string
  subsystem: string
  system: string
  location: string
  areaClassification: string
  priority: "High" | "Medium" | "Low"
  isoIds: string[]
  readyForTest: boolean
  blindingStatus: BlindingStatus
  blindingAssignedTo?: string
  blindingRequestId?: string
  blindingDate?: string
  testingStartDate?: string
  testingDoneDate?: string
  preCommDate?: string
}

export const LINE_CHECKER_TEAMS = ["LC-01", "LC-02", "LC-03", "LC-04"]

export const FINISHING_TEAMS = [
  { code: "FT-01", name: "Finishing Team Alpha" },
  { code: "FT-02", name: "Finishing Team Beta" },
  { code: "FT-03", name: "Finishing Team Gamma" },
  { code: "FT-04", name: "Finishing Team Delta" },
]

export const BLINDING_TEAMS = [
  { code: "BT-01", name: "Blinding Team Alpha" },
  { code: "BT-02", name: "Blinding Team Bravo" },
  { code: "BT-03", name: "Blinding Team Charlie" },
  { code: "BT-04", name: "Blinding Team Delta" },
]

export const REINSTATEMENT_TEAMS = [
  { code: "RT-01", name: "Reinstatement Team Alpha" },
  { code: "RT-02", name: "Reinstatement Team Bravo" },
  { code: "RT-03", name: "Reinstatement Team Charlie" },
]

export const JOINTER_LIST = ["J-001", "J-002", "J-003", "J-004", "J-005"]

export const SEED_REINSTATEMENT_REQUESTS: ReinstatementRequest[] = []

export const PUNCH_CODES: {
  code: string
  description: string
  defaultCategory: PunchCategory
}[] = [
    { code: "PC-01", description: "Missing gasket", defaultCategory: "X" },
    { code: "PC-02", description: "Bolts short", defaultCategory: "X" },
    { code: "PC-03", description: "Wrong torque", defaultCategory: "Y" },
    { code: "PC-04", description: "Rust on support", defaultCategory: "Y" },
    { code: "PC-05", description: "Tag missing", defaultCategory: "Z" },
    { code: "PC-06", description: "Insulation damaged", defaultCategory: "Z" },
  ]

// ---------------------------------------------------------------------------
// Seed test packs
// ---------------------------------------------------------------------------

export const SEED_TEST_PACKS: TestPackRecord[] = [
  {
    id: "TP-201",
    no: "TP-201",
    subsystem: "SS-001-A",
    system: "SYS-001",
    location: "Pipe Rack PR-01",
    areaClassification: "Class 1",
    priority: "Medium",
    isoIds: ["ISO-1001", "ISO-1002", "ISO-1003", "ISO-1020"],
    readyForTest: false,
    blindingStatus: "NotEligible",
  },
  {
    id: "TP-202",
    no: "TP-202",
    subsystem: "SS-001-B",
    system: "SYS-001",
    location: "Compressor Area CA-02",
    areaClassification: "Class 2",
    priority: "Medium",
    isoIds: ["ISO-1005", "ISO-1006", "ISO-1007"],
    readyForTest: false,
    blindingStatus: "NotEligible",
  },
  {
    id: "TP-203",
    no: "TP-203",
    subsystem: "SS-002-A",
    system: "SYS-002",
    location: "Reactor Area RA-01",
    areaClassification: "Class 3",
    priority: "Low",
    isoIds: ["ISO-1008", "ISO-1009", "ISO-1010"],
    readyForTest: false,
    blindingStatus: "NotEligible",
  },
  {
    id: "TP-204",
    no: "TP-204",
    subsystem: "SS-002-B",
    system: "SYS-002",
    location: "Vent Stack VS-01",
    areaClassification: "Class 2",
    priority: "High",
    isoIds: ["ISO-1011", "ISO-1012", "ISO-1019"],
    readyForTest: false,
    blindingStatus: "NotEligible",
  },
  {
    id: "TP-205",
    no: "TP-205",
    subsystem: "SS-001-C",
    system: "SYS-001",
    location: "Cooling Tower CT-01",
    areaClassification: "Class 1",
    priority: "High",
    isoIds: ["ISO-1004", "ISO-1013", "ISO-1014", "ISO-1015", "ISO-1016"],
    readyForTest: false,
    blindingStatus: "NotEligible",
  },
  {
    id: "TP-206",
    no: "TP-206",
    subsystem: "SS-003-A",
    system: "SYS-003",
    location: "Utility Building UB-03",
    areaClassification: "Class 1",
    priority: "Medium",
    isoIds: [],
    readyForTest: true,
    blindingStatus: "NotEligible",
  },
]

// ---------------------------------------------------------------------------
// Seed ISOs — only TP-205 ISOs are Eligible for the hero demo
// ---------------------------------------------------------------------------

export const SEED_ISOS: ISORecord[] = [
  // TP-201 — all NotEligible
  {
    id: "ISO-1001",
    testpackId: "TP-201",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1002",
    testpackId: "TP-201",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1003",
    testpackId: "TP-201",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1020",
    testpackId: "TP-201",
    spoolsSupported: false,
    allWeldsWelded: true,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  // TP-202 — all NotEligible
  {
    id: "ISO-1005",
    testpackId: "TP-202",
    spoolsSupported: false,
    allWeldsWelded: true,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1006",
    testpackId: "TP-202",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1007",
    testpackId: "TP-202",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  // TP-203 — all NotEligible
  {
    id: "ISO-1008",
    testpackId: "TP-203",
    spoolsSupported: false,
    allWeldsWelded: true,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1009",
    testpackId: "TP-203",
    spoolsSupported: false,
    allWeldsWelded: true,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1010",
    testpackId: "TP-203",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  // TP-204 — all NotEligible
  {
    id: "ISO-1011",
    testpackId: "TP-204",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1012",
    testpackId: "TP-204",
    spoolsSupported: true,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1019",
    testpackId: "TP-204",
    spoolsSupported: false,
    allWeldsWelded: false,
    lineCheckStatus: "NotEligible",
    punchItemIds: [],
  },
  // TP-205 — 5 ISOs, all Eligible (hero scenario)
  {
    id: "ISO-1004",
    testpackId: "TP-205",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "Eligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1013",
    testpackId: "TP-205",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "Eligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1014",
    testpackId: "TP-205",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "Eligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1015",
    testpackId: "TP-205",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "Eligible",
    punchItemIds: [],
  },
  {
    id: "ISO-1016",
    testpackId: "TP-205",
    spoolsSupported: true,
    allWeldsWelded: true,
    lineCheckStatus: "Eligible",
    punchItemIds: [],
  },
]

// ---------------------------------------------------------------------------
// Spool lookup for punch-item localization
// ---------------------------------------------------------------------------

export const SEED_ISO_SPOOLS: { isoId: string; spoolIds: string[] }[] = [
  { isoId: "ISO-1001", spoolIds: ["SP-1001-A", "SP-1001-B"] },
  { isoId: "ISO-1002", spoolIds: ["SP-1002-A", "SP-1002-B", "SP-1002-C"] },
  { isoId: "ISO-1003", spoolIds: ["SP-1003-A", "SP-1003-B"] },
  { isoId: "ISO-1020", spoolIds: ["SP-1020-A"] },
  { isoId: "ISO-1005", spoolIds: ["SP-1005-A", "SP-1005-B"] },
  { isoId: "ISO-1006", spoolIds: ["SP-1006-A", "SP-1006-B", "SP-1006-C"] },
  { isoId: "ISO-1007", spoolIds: ["SP-1007-A"] },
  { isoId: "ISO-1008", spoolIds: ["SP-1008-A", "SP-1008-B"] },
  { isoId: "ISO-1009", spoolIds: ["SP-1009-A", "SP-1009-B"] },
  { isoId: "ISO-1010", spoolIds: ["SP-1010-A", "SP-1010-B", "SP-1010-C"] },
  { isoId: "ISO-1011", spoolIds: ["SP-1011-A", "SP-1011-B"] },
  { isoId: "ISO-1012", spoolIds: ["SP-1012-A", "SP-1012-B"] },
  { isoId: "ISO-1019", spoolIds: ["SP-1019-A"] },
  { isoId: "ISO-1004", spoolIds: ["SP-1004-A", "SP-1004-B", "SP-1004-C"] },
  { isoId: "ISO-1013", spoolIds: ["SP-1013-A", "SP-1013-B"] },
  { isoId: "ISO-1014", spoolIds: ["SP-1014-A", "SP-1014-B", "SP-1014-C"] },
  { isoId: "ISO-1015", spoolIds: ["SP-1015-A", "SP-1015-B"] },
  { isoId: "ISO-1016", spoolIds: ["SP-1016-A", "SP-1016-B", "SP-1016-C"] },
]

// ---------------------------------------------------------------------------
// Historical checking request (gives Progress screen non-empty initial state)
// ---------------------------------------------------------------------------

export const SEED_CHECKING_REQUESTS: CheckingRequest[] = [
  {
    id: "CR-2026-013",
    createdAt: "2026-05-01T09:00:00.000Z",
    assignedTo: "LC-02",
    isoIds: ["ISO-1003"],
  },
]

export const SEED_CLEARANCE_REQUESTS: ClearanceRequest[] = []

export const SEED_BLINDING_REQUESTS: BlindingRequest[] = []

export const SEED_PUNCH_ITEMS: PunchItem[] = [
  // Historical cleared punch from ISO-1003 line check
  {
    id: "PI-001",
    code: "PC-04",
    description: "Rust on support",
    category: "Y",
    isoId: "ISO-1003",
    spoolId: "SP-1003-A",
    originator: "LC-02",
    createdAt: "2026-05-02T14:00:00.000Z",
    clearedAt: "2026-05-03T10:00:00.000Z",
    clearedBy: "LC-02",
  },
  // Two open category-X punch items on ISO-1003 for A2 demo
  {
    id: "PI-002",
    code: "PC-01",
    description: "Missing gasket",
    category: "X",
    isoId: "ISO-1003",
    spoolId: "SP-1003-B",
    originator: "LC-02",
    createdAt: "2026-05-02T14:30:00.000Z",
  },
  {
    id: "PI-003",
    code: "PC-02",
    description: "Bolts short",
    category: "X",
    isoId: "ISO-1003",
    spoolId: "SP-1003-A",
    originator: "LC-02",
    createdAt: "2026-05-02T15:00:00.000Z",
  },
]

// Override the seed ISO-1003 to reflect the historical CR
export const applyHistoricalOverrides = (isos: ISORecord[]): ISORecord[] => {
  return isos.map((iso) => {
    if (iso.id === "ISO-1003") {
      return {
        ...iso,
        lineCheckStatus: "Done",
        lineCheckAssignedTo: "LC-02",
        lineCheckRequestId: "CR-2026-013",
        lineCheckDate: "2026-05-02",
        punchItemIds: ["PI-001", "PI-002", "PI-003"],
      }
    }
    return iso
  })
}
