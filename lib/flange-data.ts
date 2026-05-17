export type JointPeriod = "Before Test" | "Before PMC" | "After PMC";
export type JointCategory = "X" | "Y" | "Z";
export type BoltingStatus =
  | "Not Started"
  | "Bolted"
  | "Torque Verified"
  | "Reinstatement Required"
  | "Reinstated";

export interface FlangeJoint {
  id: string;
  isoId?: string;
  isoNo: string;
  rev: string;
  sheetNo: string;
  lineNo: string;
  btNo: string;
  diamInch: number;
  rating: string;
  boltSize: number;
  boltQty: number;
  boltLength: number;
  testPackId: string;
  testpackId?: string;
  pdsArea: string;
  serviceClass: string;
  priority: "High" | "Medium" | "Low";
  type: string;
  subcontractor: string;
  areaClassification: string;
  jointPeriod: JointPeriod;
  jointCategory: JointCategory;
  category?: JointCategory;
  reason: string;
  jointingMethod: string;
  jointingValue: number;
  jointDate?: string;
  reportNbr?: string;
  reportNo?: string;
  jointer?: string;
  tagNbr?: string;
  tagNo?: string;
  boltingStatus: BoltingStatus;
  reinstatedAt?: string;
  reinstatementRequestId?: string;
  ut?: number;
}

export interface FlangeIsoGroup {
  isoNo: string;
  rev: string;
  lineNo: string;
  pdsArea: string;
  joints: FlangeJoint[];
}

export const flangeJoints: FlangeJoint[] = [
  {
    id: "FJ-001",
    isoNo: "ISO-CW-001-A",
    rev: "R3",
    sheetNo: "1",
    lineNo: "L-1201",
    btNo: "BT01",
    diamInch: 6,
    rating: "150#",
    boltSize: 0.75,
    boltQty: 8,
    boltLength: 95,
    testPackId: "TP-CW-001",
    pdsArea: "PR-01",
    serviceClass: "CW",
    priority: "High",
    type: "RF",
    subcontractor: "Primary Fabricator",
    areaClassification: "Class 1",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "Vent point",
    jointingMethod: "Torque",
    jointingValue: 420,
    jointDate: "2025-10-28",
    reportNbr: "BR-2401",
    jointer: "JTR-03",
    tagNbr: "TAG-8812",
    boltingStatus: "Torque Verified",
    ut: 2.4,
  },
  {
    id: "FJ-002",
    isoNo: "ISO-CW-001-A",
    rev: "R3",
    sheetNo: "1",
    lineNo: "L-1201",
    btNo: "BT02",
    diamInch: 4,
    rating: "150#",
    boltSize: 0.625,
    boltQty: 8,
    boltLength: 80,
    testPackId: "TP-CW-001",
    pdsArea: "PR-01",
    serviceClass: "CW",
    priority: "High",
    type: "RF",
    subcontractor: "Primary Fabricator",
    areaClassification: "Class 1",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 280,
    jointDate: "2025-10-29",
    reportNbr: "BR-2402",
    jointer: "JTR-03",
    tagNbr: "TAG-8813",
    boltingStatus: "Torque Verified",
    ut: 1.8,
  },
  {
    id: "FJ-003",
    isoNo: "ISO-CW-001-A",
    rev: "R3",
    sheetNo: "2",
    lineNo: "L-1201",
    btNo: "BT03",
    diamInch: 8,
    rating: "300#",
    boltSize: 0.875,
    boltQty: 12,
    boltLength: 110,
    testPackId: "TP-CW-001",
    pdsArea: "PR-01",
    serviceClass: "CW",
    priority: "Medium",
    type: "RF",
    subcontractor: "Primary Fabricator",
    areaClassification: "Class 1",
    jointPeriod: "Before Test",
    jointCategory: "Y",
    reason: "Test blind",
    jointingMethod: "Torque",
    jointingValue: 510,
    boltingStatus: "Bolted",
    ut: 3.1,
  },
  {
    id: "FJ-004",
    isoNo: "ISO-CW-001-B",
    rev: "R2",
    sheetNo: "1",
    lineNo: "L-1202",
    btNo: "BT01",
    diamInch: 10,
    rating: "150#",
    boltSize: 1,
    boltQty: 12,
    boltLength: 120,
    testPackId: "TP-CW-001",
    pdsArea: "PR-01",
    serviceClass: "CW",
    priority: "High",
    type: "RF",
    subcontractor: "Site Erector A",
    areaClassification: "Class 2",
    jointPeriod: "Before PMC",
    jointCategory: "Y",
    reason: "Drain point",
    jointingMethod: "Torque",
    jointingValue: 680,
    jointDate: "2025-11-01",
    jointer: "JTR-07",
    boltingStatus: "Bolted",
    ut: 4.2,
  },
  {
    id: "FJ-005",
    isoNo: "ISO-CW-002-A",
    rev: "R2",
    sheetNo: "1",
    lineNo: "L-2201",
    btNo: "BT01",
    diamInch: 6,
    rating: "150#",
    boltSize: 0.75,
    boltQty: 8,
    boltLength: 95,
    testPackId: "TP-CW-002",
    pdsArea: "CA-02",
    serviceClass: "CW",
    priority: "Medium",
    type: "RF",
    subcontractor: "Site Erector A",
    areaClassification: "Class 2",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 420,
    boltingStatus: "Not Started",
    ut: 2.4,
  },
  {
    id: "FJ-006",
    isoNo: "ISO-CW-002-A",
    rev: "R2",
    sheetNo: "1",
    lineNo: "L-2201",
    btNo: "BT02",
    diamInch: 4,
    rating: "150#",
    boltSize: 0.625,
    boltQty: 8,
    boltLength: 80,
    testPackId: "TP-CW-002",
    pdsArea: "CA-02",
    serviceClass: "CW",
    priority: "Medium",
    type: "RF",
    subcontractor: "Site Erector A",
    areaClassification: "Class 2",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "Vent point",
    jointingMethod: "Torque",
    jointingValue: 280,
    boltingStatus: "Not Started",
  },
  {
    id: "FJ-007",
    isoNo: "ISO-PG-001-A",
    rev: "R1",
    sheetNo: "1",
    lineNo: "L-3301",
    btNo: "BT01",
    diamInch: 12,
    rating: "300#",
    boltSize: 1.125,
    boltQty: 16,
    boltLength: 140,
    testPackId: "TP-PG-001",
    pdsArea: "RA-01",
    serviceClass: "PG",
    priority: "Low",
    type: "RTJ",
    subcontractor: "Site Erector B",
    areaClassification: "Class 3",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "Blowing point",
    jointingMethod: "Torque",
    jointingValue: 890,
    boltingStatus: "Not Started",
    ut: 5.6,
  },
  {
    id: "FJ-008",
    isoNo: "ISO-PG-001-A",
    rev: "R1",
    sheetNo: "1",
    lineNo: "L-3301",
    btNo: "BT02",
    diamInch: 8,
    rating: "300#",
    boltSize: 0.875,
    boltQty: 12,
    boltLength: 110,
    testPackId: "TP-PG-001",
    pdsArea: "RA-01",
    serviceClass: "PG",
    priority: "Low",
    type: "RTJ",
    subcontractor: "Site Erector B",
    areaClassification: "Class 3",
    jointPeriod: "After PMC",
    jointCategory: "Z",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 510,
    boltingStatus: "Not Started",
  },
  {
    id: "FJ-009",
    isoNo: "ISO-PG-003-A",
    rev: "R1",
    sheetNo: "1",
    lineNo: "L-4401",
    btNo: "BT01",
    diamInch: 6,
    rating: "150#",
    boltSize: 0.75,
    boltQty: 8,
    boltLength: 95,
    testPackId: "TP-PG-003",
    pdsArea: "VS-01",
    serviceClass: "PG",
    priority: "Medium",
    type: "RF",
    subcontractor: "Primary Fabricator",
    areaClassification: "Class 2",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 420,
    jointDate: "2025-11-18",
    reportNbr: "BR-2510",
    jointer: "JTR-05",
    tagNbr: "TAG-9021",
    boltingStatus: "Torque Verified",
    ut: 2.4,
  },
  {
    id: "FJ-010",
    isoNo: "ISO-UT-001-A",
    rev: "R2",
    sheetNo: "1",
    lineNo: "L-5501",
    btNo: "BT01",
    diamInch: 4,
    rating: "150#",
    boltSize: 0.625,
    boltQty: 8,
    boltLength: 80,
    testPackId: "TP-UT-001",
    pdsArea: "UB-03",
    serviceClass: "STM",
    priority: "Medium",
    type: "RF",
    subcontractor: "Site Erector A",
    areaClassification: "Class 2",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 280,
    jointDate: "2025-11-10",
    jointer: "JTR-02",
    boltingStatus: "Torque Verified",
    ut: 1.8,
  },
  {
    id: "FJ-011",
    isoNo: "ISO-UT-001-B",
    rev: "R1",
    sheetNo: "1",
    lineNo: "L-5502",
    btNo: "BT01",
    diamInch: 6,
    rating: "150#",
    boltSize: 0.75,
    boltQty: 8,
    boltLength: 95,
    testPackId: "TP-UT-001",
    pdsArea: "UB-03",
    serviceClass: "STM",
    priority: "Medium",
    type: "RF",
    subcontractor: "Site Erector A",
    areaClassification: "Class 2",
    jointPeriod: "Before PMC",
    jointCategory: "Y",
    reason: "Drain point",
    jointingMethod: "Torque",
    jointingValue: 420,
    boltingStatus: "Bolted",
  },
  {
    id: "FJ-012",
    isoNo: "ISO-CW-004-A",
    rev: "R1",
    sheetNo: "1",
    lineNo: "L-6601",
    btNo: "BT01",
    diamInch: 8,
    rating: "150#",
    boltSize: 0.875,
    boltQty: 8,
    boltLength: 105,
    testPackId: "TP-CW-004",
    pdsArea: "HX-02",
    serviceClass: "CW",
    priority: "Medium",
    type: "RF",
    subcontractor: "Site Erector B",
    areaClassification: "Class 2",
    jointPeriod: "Before Test",
    jointCategory: "X",
    reason: "NA",
    jointingMethod: "Torque",
    jointingValue: 480,
    boltingStatus: "Not Started",
    ut: 2.9,
  },
];

export function groupFlangesByIso(joints: FlangeJoint[]): FlangeIsoGroup[] {
  const map = new Map<string, FlangeIsoGroup>();
  for (const joint of joints) {
    const existing = map.get(joint.isoNo);
    if (existing) {
      existing.joints.push(joint);
    } else {
      map.set(joint.isoNo, {
        isoNo: joint.isoNo,
        rev: joint.rev,
        lineNo: joint.lineNo,
        pdsArea: joint.pdsArea,
        joints: [joint],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.isoNo.localeCompare(b.isoNo));
}

export const flangeFilterOptions = {
  pdsAreas: ["All Areas", "PR-01", "CA-02", "RA-01", "VS-01", "UB-03", "HX-02"],
  lines: ["All Lines", "L-1201", "L-1202", "L-2201", "L-3301", "L-4401", "L-5501", "L-5502", "L-6601"],
  isos: ["All ISOs", ...new Set(flangeJoints.map((j) => j.isoNo))],
  priorities: ["All", "High", "Medium", "Low"] as const,
  types: ["All Types", "RF", "RTJ"],
  serviceClasses: ["All Classes", "CW", "PG", "STM"],
  subcontractors: ["All Subcontractors", "Primary Fabricator", "Site Erector A", "Site Erector B"],
  areaClassifications: ["All Areas", "Class 1", "Class 2", "Class 3"],
  boltingStatuses: [
    "All Statuses",
    "Not Started",
    "Bolted",
    "Torque Verified",
    "Reinstatement Required",
    "Reinstated",
  ] as const,
};

export const flangeKpis = {
  total: flangeJoints.length,
  bolted: flangeJoints.filter((j) => j.boltingStatus !== "Not Started").length,
  torqueVerified: flangeJoints.filter((j) => j.boltingStatus === "Torque Verified").length,
  get outstanding() {
    return this.total - this.bolted;
  },
};
