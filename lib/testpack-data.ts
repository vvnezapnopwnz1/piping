export type Priority = "High" | "Medium" | "Low";
export type TestMedium = "Hydro" | "Pneumatic" | "Vacuum";
export type TestpackStatus =
  | "Tested & Reinstated"
  | "Testing In Progress"
  | "Blinding In Progress"
  | "Ready For Test"
  | "Line Checking"
  | "Construction";

export interface Spool {
  spoolNo: string;
  status: "Ready For Test" | "In Progress" | "Not Ready";
  statusCode: number;
}

export interface IsoStatus {
  completedDate?: string;
  lineCheckAssignedDate?: string;
  lineCheckReturnedDate?: string;
  itemsCatXToClear: number;
  jointsToBeWelded: number;
  flangesToBeBolted: number;
  jointsAwaitingNde: number;
  qcReleasedDate?: string;
  readyForTestDate?: string;
}

export interface Iso {
  isoNo: string;
  rev: string;
  spools: Spool[];
  isometricStatus: IsoStatus;
}

export interface ReleaseWorkItem {
  id: string;
  jointNo?: string;
  isoNo: string;
  spoolNo?: string;
  status: string;
}

export type ReleaseTrackingKey =
  | "jointsToBeWelded"
  | "flangesToBeBolted"
  | "jointsAwaitingNde"
  | "isosToComplete"
  | "isosToReturnFromLineCheck"
  | "itemsCatXToClear"
  | "isosToQcRelease"
  | "isosReadyForTest";

export const STATUS_CODE_TOOLTIPS: Record<number, string> = {
  4: "Not Ready — construction incomplete",
  8: "In Progress — work ongoing",
  12: "Ready For Test — cleared for pressure test",
};

export function attachIsoStatus(iso: Omit<Iso, "isometricStatus"> & { isometricStatus?: IsoStatus }): Iso {
  if (iso.isometricStatus) {
    return iso as Iso;
  }
  const notReady = iso.spools.filter((s) => s.statusCode === 4).length;
  const inProgress = iso.spools.filter((s) => s.statusCode === 8).length;
  const ready = iso.spools.filter((s) => s.statusCode === 12).length;
  const allReady = ready === iso.spools.length;
  return {
    ...iso,
    isometricStatus: {
      completedDate: allReady ? "2025-10-20" : inProgress > 0 ? undefined : undefined,
      lineCheckAssignedDate: ready > 0 ? "2025-10-15" : undefined,
      lineCheckReturnedDate: ready > 0 ? "2025-10-22" : undefined,
      itemsCatXToClear: notReady > 0 ? 1 : 0,
      jointsToBeWelded: notReady,
      flangesToBeBolted: inProgress > 0 ? 1 : 0,
      jointsAwaitingNde: inProgress,
      qcReleasedDate: allReady ? "2025-10-25" : undefined,
      readyForTestDate: allReady ? "2025-10-28" : undefined,
    },
  };
}

export function enrichTestpack(tp: Omit<Testpack, "isos"> & { isos: (Omit<Iso, "isometricStatus"> & { isometricStatus?: IsoStatus })[] }): Testpack {
  return {
    ...tp,
    isos: tp.isos.map(attachIsoStatus),
  };
}

export function generateReleaseWorkList(
  testpack: Testpack,
  key: ReleaseTrackingKey,
  count: number,
): ReleaseWorkItem[] {
  if (count === 0) return [];
  const iso = testpack.isos[0];
  const labels: Record<ReleaseTrackingKey, string> = {
    jointsToBeWelded: "To be welded",
    flangesToBeBolted: "To be bolted",
    jointsAwaitingNde: "Awaiting NDE",
    isosToComplete: "ISO incomplete",
    isosToReturnFromLineCheck: "Return from line check",
    itemsCatXToClear: "Cat X outstanding",
    isosToQcRelease: "Pending QC release",
    isosReadyForTest: "Ready for test",
  };
  return Array.from({ length: Math.min(count, 8) }, (_, i) => ({
    id: `${testpack.id}-${key}-${i + 1}`,
    jointNo: key.includes("joint") || key.includes("flange") ? `J-${testpack.id.slice(-3)}-${i + 1}` : undefined,
    isoNo: testpack.isos[i % testpack.isos.length]?.isoNo ?? iso?.isoNo ?? testpack.id,
    spoolNo: iso?.spools[i % (iso?.spools.length || 1)]?.spoolNo,
    status: labels[key],
  }));
}

export interface ReleaseTracking {
  jointsToBeWelded: number;
  flangesToBeBolted: number;
  jointsAwaitingNde: number;
  isosToComplete: number;
  isosToReturnFromLineCheck: number;
  itemsCatXToClear: number;
  isosToQcRelease: number;
  isosReadyForTest: number;
}

export interface Milestone {
  label: string;
  date?: string;
  status: "Done" | "In Progress" | "Pending";
  detail?: string;
}

export interface Operations {
  milestones: Milestone[];
  itemsYCleared: { done: number; total: number };
  itemsZCleared: { done: number; total: number };
}

export interface ProgressStatus {
  construction: number;
  lineChecking: number;
  testing: number;
  reinstatement: number;
}

export interface Testpack {
  id: string;
  name: string;
  subsystemId: string;
  systemId: string;
  location: string;
  areaClassification: string;
  subcontractor: string;
  revNo: string;
  unitOfTime: string;
  priority: Priority;
  testMedium: TestMedium;
  testPressure: string;
  volume: string;
  totalIsos: number;
  totalSpools: number;
  totalWeldJoints: number;
  totalFlangeJoints: number;
  testPlannedDate: string;
  readiness: number;
  status: TestpackStatus;
  releaseTracking: ReleaseTracking;
  operations: Operations;
  progressStatus: ProgressStatus;
  isos: Iso[];
}

export interface Subsystem {
  id: string;
  name: string;
  systemId: string;
  testpackCount: number;
  spoolCount: number;
  progress: number;
  status: TestpackStatus;
}

export interface PipingSystem {
  id: string;
  name: string;
  subsystemCount: number;
  testpackCount: number;
  progress: number;
  tested: number;
  inProgress: number;
  blocked: number;
}

export const systems: PipingSystem[] = [
  {
    id: "SYS-001",
    name: "Cooling Water System",
    subsystemCount: 4,
    testpackCount: 12,
    progress: 45,
    tested: 3,
    inProgress: 5,
    blocked: 4,
  },
  {
    id: "SYS-002",
    name: "Process Gas System",
    subsystemCount: 3,
    testpackCount: 8,
    progress: 28,
    tested: 1,
    inProgress: 3,
    blocked: 4,
  },
  {
    id: "SYS-003",
    name: "Utility Services System",
    subsystemCount: 2,
    testpackCount: 5,
    progress: 62,
    tested: 2,
    inProgress: 2,
    blocked: 1,
  },
];

export const subsystems: Subsystem[] = [
  { id: "SS-001-A", name: "CW Supply Header A", systemId: "SYS-001", testpackCount: 4, spoolCount: 48, progress: 52, status: "Testing In Progress" },
  { id: "SS-001-B", name: "CW Return Header B", systemId: "SYS-001", testpackCount: 3, spoolCount: 36, progress: 38, status: "Line Checking" },
  { id: "SS-001-C", name: "CW Pump Discharge C", systemId: "SYS-001", testpackCount: 3, spoolCount: 42, progress: 41, status: "Ready For Test" },
  { id: "SS-001-D", name: "CW Heat Exchanger D", systemId: "SYS-001", testpackCount: 2, spoolCount: 24, progress: 55, status: "Blinding In Progress" },
  { id: "SS-002-A", name: "PG Main Feed A", systemId: "SYS-002", testpackCount: 3, spoolCount: 56, progress: 22, status: "Construction" },
  { id: "SS-002-B", name: "PG Reactor Loop B", systemId: "SYS-002", testpackCount: 3, spoolCount: 48, progress: 31, status: "Line Checking" },
  { id: "SS-002-C", name: "PG Vent Header C", systemId: "SYS-002", testpackCount: 2, spoolCount: 32, progress: 35, status: "Ready For Test" },
  { id: "SS-003-A", name: "US Steam Distribution A", systemId: "SYS-003", testpackCount: 3, spoolCount: 40, progress: 68, status: "Testing In Progress" },
  { id: "SS-003-B", name: "US Condensate Return B", systemId: "SYS-003", testpackCount: 2, spoolCount: 28, progress: 55, status: "Blinding In Progress" },
];

type RawTestpack = Omit<Testpack, "isos"> & {
  isos: (Omit<Iso, "isometricStatus"> & { isometricStatus?: IsoStatus })[];
};

const rawTestpacks: RawTestpack[] = [
  {
    id: "TP-CW-001",
    name: "TP-CW-001",
    subsystemId: "SS-001-A",
    systemId: "SYS-001",
    location: "Pipe Rack PR-01",
    areaClassification: "Class 1",
    subcontractor: "Primary Fabricator",
    revNo: "Rev 3",
    unitOfTime: "48 h",
    priority: "High",
    testMedium: "Hydro",
    testPressure: "42.5 bar",
    volume: "12.4 m³",
    totalIsos: 3,
    totalSpools: 14,
    totalWeldJoints: 28,
    totalFlangeJoints: 8,
    testPlannedDate: "2025-11-10",
    readiness: 90,
    status: "Testing In Progress",
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 1,
      jointsAwaitingNde: 2,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 0,
      isosReadyForTest: 3,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-10-28", status: "Done" },
        { label: "Blinding assigned", date: "2025-11-01", status: "Done" },
        { label: "Blinding complete", date: "2025-11-03", status: "Done" },
        { label: "Testing start", date: "2025-11-05", status: "In Progress" },
        { label: "Testing done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 5, total: 5 },
      itemsZCleared: { done: 2, total: 3 },
    },
    progressStatus: {
      construction: 98,
      lineChecking: 92,
      testing: 45,
      reinstatement: 0,
    },
    isos: [
      {
        isoNo: "ISO-CW-001-A",
        rev: "R3",
        spools: [
          { spoolNo: "SP-CW-001-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-A-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-A-03", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-CW-001-B",
        rev: "R2",
        spools: [
          { spoolNo: "SP-CW-001-B-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-B-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-B-04", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-CW-001-C",
        rev: "R1",
        spools: [
          { spoolNo: "SP-CW-001-C-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-C-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-C-03", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-001-C-04", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-C-05", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-C-06", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-001-C-07", status: "Ready For Test", statusCode: 12 },
        ],
      },
    ],
  },
  {
    id: "TP-CW-002",
    name: "TP-CW-002",
    subsystemId: "SS-001-B",
    systemId: "SYS-001",
    location: "Compressor Area CA-02",
    areaClassification: "Class 2",
    subcontractor: "Site Erector A",
    revNo: "Rev 2",
    unitOfTime: "36 h",
    priority: "Medium",
    testMedium: "Hydro",
    testPressure: "38.0 bar",
    volume: "8.6 m³",
    totalIsos: 4,
    totalSpools: 18,
    totalWeldJoints: 36,
    totalFlangeJoints: 12,
    testPlannedDate: "2025-11-20",
    readiness: 45,
    status: "Line Checking",
    releaseTracking: {
      jointsToBeWelded: 3,
      flangesToBeBolted: 2,
      jointsAwaitingNde: 5,
      isosToComplete: 1,
      isosToReturnFromLineCheck: 2,
      itemsCatXToClear: 1,
      isosToQcRelease: 2,
      isosReadyForTest: 1,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-10-28", status: "Done" },
        { label: "Blinding assigned", date: "2025-11-01", status: "Done" },
        { label: "Blinding complete", status: "Pending" },
        { label: "Testing start", status: "Pending" },
        { label: "Testing done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 2, total: 5 },
      itemsZCleared: { done: 0, total: 3 },
    },
    progressStatus: {
      construction: 78,
      lineChecking: 45,
      testing: 0,
      reinstatement: 0,
    },
    isos: [
      {
        isoNo: "ISO-CW-002-A",
        rev: "R2",
        spools: [
          { spoolNo: "SP-CW-002-A-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-CW-002-A-02", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-002-A-03", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-CW-002-B",
        rev: "R1",
        spools: [
          { spoolNo: "SP-CW-002-B-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-002-B-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-CW-002-B-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-CW-002-B-04", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-CW-002-C",
        rev: "R0",
        spools: [
          { spoolNo: "SP-CW-002-C-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-002-C-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-002-C-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-002-C-04", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-002-C-05", status: "Ready For Test", statusCode: 12 },
        ],
      },
      {
        isoNo: "ISO-CW-002-D",
        rev: "R1",
        spools: [
          { spoolNo: "SP-CW-002-D-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-002-D-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-CW-002-D-03", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-002-D-04", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-CW-002-D-05", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-002-D-06", status: "In Progress", statusCode: 8 },
        ],
      },
    ],
  },
  {
    id: "TP-CW-003",
    name: "TP-CW-003",
    subsystemId: "SS-001-C",
    systemId: "SYS-001",
    location: "Cooling Tower CT-01",
    areaClassification: "Class 1",
    subcontractor: "Primary Fabricator",
    revNo: "Rev 4",
    unitOfTime: "24 h",
    priority: "High",
    testMedium: "Hydro",
    testPressure: "55.0 bar",
    volume: "6.2 m³",
    totalIsos: 2,
    totalSpools: 10,
    totalWeldJoints: 20,
    totalFlangeJoints: 6,
    testPlannedDate: "2025-10-15",
    readiness: 100,
    status: "Tested & Reinstated",
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 0,
      jointsAwaitingNde: 0,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 0,
      isosReadyForTest: 2,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-10-10", status: "Done" },
        { label: "Blinding assigned", date: "2025-10-12", status: "Done" },
        { label: "Blinding complete", date: "2025-10-14", status: "Done" },
        { label: "Testing start", date: "2025-10-15", status: "Done" },
        { label: "Testing done", date: "2025-10-16", status: "Done" },
        { label: "Pre-commissioning", date: "2025-10-18", status: "Done" },
        { label: "Reinstatement", date: "2025-10-20", status: "Done" },
      ],
      itemsYCleared: { done: 5, total: 5 },
      itemsZCleared: { done: 3, total: 3 },
    },
    progressStatus: {
      construction: 100,
      lineChecking: 100,
      testing: 100,
      reinstatement: 100,
    },
    isos: [
      {
        isoNo: "ISO-CW-003-A",
        rev: "R4",
        spools: [
          { spoolNo: "SP-CW-003-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-A-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-A-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-A-04", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-A-05", status: "Ready For Test", statusCode: 12 },
        ],
      },
      {
        isoNo: "ISO-CW-003-B",
        rev: "R3",
        spools: [
          { spoolNo: "SP-CW-003-B-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-B-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-B-04", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-003-B-05", status: "Ready For Test", statusCode: 12 },
        ],
      },
    ],
  },
  {
    id: "TP-PG-001",
    name: "TP-PG-001",
    subsystemId: "SS-002-A",
    systemId: "SYS-002",
    location: "Reactor Area RA-01",
    areaClassification: "Class 3",
    subcontractor: "Site Erector B",
    revNo: "Rev 1",
    unitOfTime: "72 h",
    priority: "Low",
    testMedium: "Pneumatic",
    testPressure: "15.0 bar",
    volume: "4.8 m³",
    totalIsos: 5,
    totalSpools: 22,
    totalWeldJoints: 44,
    totalFlangeJoints: 16,
    testPlannedDate: "2025-12-05",
    readiness: 20,
    status: "Construction",
    releaseTracking: {
      jointsToBeWelded: 12,
      flangesToBeBolted: 8,
      jointsAwaitingNde: 6,
      isosToComplete: 3,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 4,
      isosToQcRelease: 5,
      isosReadyForTest: 0,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", status: "Pending" },
        { label: "Blinding assigned", status: "Pending" },
        { label: "Blinding complete", status: "Pending" },
        { label: "Testing start", status: "Pending" },
        { label: "Testing done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 0, total: 5 },
      itemsZCleared: { done: 0, total: 3 },
    },
    progressStatus: {
      construction: 35,
      lineChecking: 0,
      testing: 0,
      reinstatement: 0,
    },
    isos: [
      {
        isoNo: "ISO-PG-001-A",
        rev: "R1",
        spools: [
          { spoolNo: "SP-PG-001-A-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-A-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-A-03", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-PG-001-B",
        rev: "R0",
        spools: [
          { spoolNo: "SP-PG-001-B-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-B-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-B-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-B-04", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-PG-001-C",
        rev: "R1",
        spools: [
          { spoolNo: "SP-PG-001-C-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-C-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-C-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-C-04", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-C-05", status: "Not Ready", statusCode: 4 },
        ],
      },
      {
        isoNo: "ISO-PG-001-D",
        rev: "R2",
        spools: [
          { spoolNo: "SP-PG-001-D-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-D-02", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-001-D-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-D-04", status: "Not Ready", statusCode: 4 },
        ],
      },
      {
        isoNo: "ISO-PG-001-E",
        rev: "R1",
        spools: [
          { spoolNo: "SP-PG-001-E-01", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-E-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-E-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-E-04", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-001-E-05", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-001-E-06", status: "Not Ready", statusCode: 4 },
        ],
      },
    ],
  },
  {
    id: "TP-UT-001",
    name: "TP-UT-001",
    subsystemId: "SS-003-A",
    systemId: "SYS-003",
    location: "Utility Building UB-03",
    areaClassification: "Class 2",
    subcontractor: "Site Erector A",
    revNo: "Rev 2",
    unitOfTime: "48 h",
    priority: "Medium",
    testMedium: "Vacuum",
    testPressure: "65.0 bar",
    volume: "3.2 m³",
    totalIsos: 3,
    totalSpools: 12,
    totalWeldJoints: 24,
    totalFlangeJoints: 6,
    testPlannedDate: "2025-11-15",
    readiness: 75,
    status: "Blinding In Progress",
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 2,
      jointsAwaitingNde: 1,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 1,
      itemsCatXToClear: 0,
      isosToQcRelease: 1,
      isosReadyForTest: 2,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-10-28", status: "Done" },
        { label: "Blinding assigned", date: "2025-11-01", status: "Done" },
        { label: "Blinding complete", status: "In Progress", detail: "3 of 5 blinds installed" },
        { label: "Testing start", status: "Pending" },
        { label: "Testing done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 4, total: 5 },
      itemsZCleared: { done: 1, total: 3 },
    },
    progressStatus: {
      construction: 94,
      lineChecking: 78,
      testing: 12,
      reinstatement: 0,
    },
    isos: [
      {
        isoNo: "ISO-UT-001-A",
        rev: "R2",
        spools: [
          { spoolNo: "SP-UT-001-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-A-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-A-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-A-04", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-UT-001-B",
        rev: "R1",
        spools: [
          { spoolNo: "SP-UT-001-B-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-B-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-001-B-04", status: "Ready For Test", statusCode: 12 },
        ],
      },
      {
        isoNo: "ISO-UT-001-C",
        rev: "R0",
        spools: [
          { spoolNo: "SP-UT-001-C-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-UT-001-C-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-UT-001-C-03", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-UT-001-C-04", status: "In Progress", statusCode: 8 },
        ],
      },
    ],
  },
  {
    id: "TP-CW-004",
    name: "TP-CW-004",
    subsystemId: "SS-001-D",
    systemId: "SYS-001",
    location: "Heat Exchanger HX-02",
    areaClassification: "Class 2",
    subcontractor: "Site Erector B",
    revNo: "Rev 1",
    unitOfTime: "48 h",
    priority: "Medium",
    testMedium: "Hydro",
    testPressure: "40.0 bar",
    volume: "5.1 m³",
    totalIsos: 2,
    totalSpools: 8,
    totalWeldJoints: 16,
    totalFlangeJoints: 4,
    testPlannedDate: "2025-11-25",
    readiness: 62,
    status: "Blinding In Progress",
    releaseTracking: {
      jointsToBeWelded: 1,
      flangesToBeBolted: 1,
      jointsAwaitingNde: 0,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 1,
      isosReadyForTest: 1,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-11-01", status: "Done" },
        { label: "Assigned to be blinded", date: "2025-11-10", status: "Done" },
        { label: "Blinding complete", status: "In Progress" },
        { label: "Test done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 3, total: 4 },
      itemsZCleared: { done: 1, total: 2 },
    },
    progressStatus: { construction: 88, lineChecking: 70, testing: 15, reinstatement: 0 },
    isos: [
      {
        isoNo: "ISO-CW-004-A",
        rev: "R1",
        spools: [
          { spoolNo: "SP-CW-004-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-004-A-02", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-CW-004-B",
        rev: "R0",
        spools: [
          { spoolNo: "SP-CW-004-B-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-CW-004-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-004-B-03", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-CW-004-B-04", status: "In Progress", statusCode: 8 },
        ],
      },
    ],
  },
  {
    id: "TP-PG-002",
    name: "TP-PG-002",
    subsystemId: "SS-002-B",
    systemId: "SYS-002",
    location: "Reactor Area RA-01",
    areaClassification: "Class 3",
    subcontractor: "Site Erector B",
    revNo: "Rev 2",
    unitOfTime: "72 h",
    priority: "High",
    testMedium: "Pneumatic",
    testPressure: "18.0 bar",
    volume: "7.2 m³",
    totalIsos: 2,
    totalSpools: 10,
    totalWeldJoints: 20,
    totalFlangeJoints: 6,
    testPlannedDate: "2025-12-01",
    readiness: 55,
    status: "Line Checking",
    releaseTracking: {
      jointsToBeWelded: 2,
      flangesToBeBolted: 1,
      jointsAwaitingNde: 3,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 1,
      itemsCatXToClear: 2,
      isosToQcRelease: 1,
      isosReadyForTest: 0,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", status: "Pending" },
        { label: "Assigned to be blinded", status: "Pending" },
        { label: "Blinding complete", status: "Pending" },
        { label: "Test done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 1, total: 4 },
      itemsZCleared: { done: 0, total: 2 },
    },
    progressStatus: { construction: 72, lineChecking: 40, testing: 0, reinstatement: 0 },
    isos: [
      {
        isoNo: "ISO-PG-002-A",
        rev: "R2",
        spools: [
          { spoolNo: "SP-PG-002-A-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-002-A-02", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-002-A-03", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-PG-002-B",
        rev: "R1",
        spools: [
          { spoolNo: "SP-PG-002-B-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-002-B-02", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-002-B-03", status: "Not Ready", statusCode: 4 },
          { spoolNo: "SP-PG-002-B-04", status: "Not Ready", statusCode: 4 },
        ],
      },
    ],
  },
  {
    id: "TP-PG-003",
    name: "TP-PG-003",
    subsystemId: "SS-002-C",
    systemId: "SYS-002",
    location: "Vent Stack VS-01",
    areaClassification: "Class 2",
    subcontractor: "Primary Fabricator",
    revNo: "Rev 1",
    unitOfTime: "48 h",
    priority: "Medium",
    testMedium: "Pneumatic",
    testPressure: "12.0 bar",
    volume: "3.8 m³",
    totalIsos: 2,
    totalSpools: 8,
    totalWeldJoints: 16,
    totalFlangeJoints: 4,
    testPlannedDate: "2025-11-28",
    readiness: 82,
    status: "Ready For Test",
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 0,
      jointsAwaitingNde: 0,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 0,
      isosReadyForTest: 2,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-11-20", status: "Done" },
        { label: "Assigned to be blinded", date: "2025-11-22", status: "Done" },
        { label: "Blinding complete", date: "2025-11-24", status: "Done" },
        { label: "Test done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 4, total: 4 },
      itemsZCleared: { done: 2, total: 2 },
    },
    progressStatus: { construction: 95, lineChecking: 90, testing: 5, reinstatement: 0 },
    isos: [
      {
        isoNo: "ISO-PG-003-A",
        rev: "R1",
        spools: [
          { spoolNo: "SP-PG-003-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-PG-003-A-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-PG-003-A-03", status: "Ready For Test", statusCode: 12 },
        ],
      },
      {
        isoNo: "ISO-PG-003-B",
        rev: "R0",
        spools: [
          { spoolNo: "SP-PG-003-B-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-PG-003-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-PG-003-B-03", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-PG-003-B-04", status: "Ready For Test", statusCode: 12 },
        ],
      },
    ],
  },
  {
    id: "TP-UT-002",
    name: "TP-UT-002",
    subsystemId: "SS-003-B",
    systemId: "SYS-003",
    location: "Utility Building UB-03",
    areaClassification: "Class 1",
    subcontractor: "Primary Fabricator",
    revNo: "Rev 1",
    unitOfTime: "36 h",
    priority: "Low",
    testMedium: "Hydro",
    testPressure: "32.0 bar",
    volume: "2.8 m³",
    totalIsos: 2,
    totalSpools: 6,
    totalWeldJoints: 12,
    totalFlangeJoints: 3,
    testPlannedDate: "2025-11-18",
    readiness: 68,
    status: "Blinding In Progress",
    releaseTracking: {
      jointsToBeWelded: 0,
      flangesToBeBolted: 1,
      jointsAwaitingNde: 0,
      isosToComplete: 0,
      isosToReturnFromLineCheck: 0,
      itemsCatXToClear: 0,
      isosToQcRelease: 0,
      isosReadyForTest: 1,
    },
    operations: {
      milestones: [
        { label: "Ready for test date", date: "2025-11-05", status: "Done" },
        { label: "Assigned to be blinded", date: "2025-11-08", status: "Done" },
        { label: "Blinding complete", status: "In Progress", detail: "2 of 3 blinds" },
        { label: "Test done", status: "Pending" },
        { label: "Pre-commissioning", status: "Pending" },
        { label: "Reinstatement", status: "Pending" },
      ],
      itemsYCleared: { done: 3, total: 4 },
      itemsZCleared: { done: 1, total: 2 },
    },
    progressStatus: { construction: 90, lineChecking: 65, testing: 8, reinstatement: 0 },
    isos: [
      {
        isoNo: "ISO-UT-002-A",
        rev: "R1",
        spools: [
          { spoolNo: "SP-UT-002-A-01", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-002-A-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-002-A-03", status: "In Progress", statusCode: 8 },
        ],
      },
      {
        isoNo: "ISO-UT-002-B",
        rev: "R0",
        spools: [
          { spoolNo: "SP-UT-002-B-01", status: "In Progress", statusCode: 8 },
          { spoolNo: "SP-UT-002-B-02", status: "Ready For Test", statusCode: 12 },
          { spoolNo: "SP-UT-002-B-03", status: "In Progress", statusCode: 8 },
        ],
      },
    ],
  },
];

export const testpacks: Testpack[] = rawTestpacks.map((tp) => enrichTestpack(tp));

export const filterOptions = {
  systems: ["All Systems", ...systems.map((s) => s.id)],
  locations: [
    "All Locations",
    "Pipe Rack PR-01",
    "Compressor Area CA-02",
    "Cooling Tower CT-01",
    "Heat Exchanger HX-02",
    "Reactor Area RA-01",
    "Vent Stack VS-01",
    "Utility Building UB-03",
  ],
  areaClassifications: ["All Areas", "Class 1", "Class 2", "Class 3"],
  subcontractors: ["All Subcontractors", "Primary Fabricator", "Site Erector A", "Site Erector B"],
  priorities: ["All", "High", "Medium", "Low"] as const,
};
