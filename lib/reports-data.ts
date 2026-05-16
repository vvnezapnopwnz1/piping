export type ReportCategory = "Fabrication" | "Erection" | "Testpack" | "NDE"
export type ReportFormat = "xlsx" | "pdf" | "csv"

export interface ReportDef {
  id: string
  title: string
  description: string
  category: ReportCategory
  format: ReportFormat
  sizeBytes: number
  lastGeneratedISO: string
  owner: string
  manualSection?: string
  liveCountKey?:
    | "welds.total"
    | "welds.rework"
    | "batches.active"
    | "batches.overdue"
    | "testpack.rflc"
    | "testpack.total"
    | "erection.rft"
    | "fieldWelds.total"
}

export const REPORTS_SEED: ReportDef[] = [
  // Fabrication (4) — §9.x
  {
    id: "RPT-F-001",
    title: "Fabrication Progress Summary",
    description: "Shop weld completion rates by WBU, spool and ISO.",
    category: "Fabrication",
    format: "xlsx",
    sizeBytes: 1_200_000,
    lastGeneratedISO: "2026-05-15T08:42:00Z",
    owner: "QC-ENG-01",
    manualSection: "§9.2",
    liveCountKey: "welds.total",
  },
  {
    id: "RPT-F-002",
    title: "Rework Queue Report",
    description: "Open rework items with welder codes and root causes.",
    category: "Fabrication",
    format: "xlsx",
    sizeBytes: 320_000,
    lastGeneratedISO: "2026-05-12T14:30:00Z",
    owner: "QC-ENG-02",
    manualSection: "§9.4",
    liveCountKey: "welds.rework",
  },
  {
    id: "RPT-F-003",
    title: "Welder Performance Log",
    description: "Individual welder acceptance rates and WPS coverage.",
    category: "Fabrication",
    format: "pdf",
    sizeBytes: 980_000,
    lastGeneratedISO: "2026-05-10T09:15:00Z",
    owner: "QC-ENG-01",
    manualSection: "§9.5",
  },
  {
    id: "RPT-F-004",
    title: "Joint History (DWIR)",
    description: "Complete weld joint traceability including NDE history.",
    category: "Fabrication",
    format: "csv",
    sizeBytes: 2_100_000,
    lastGeneratedISO: "2026-05-08T16:00:00Z",
    owner: "QC-ENG-03",
    manualSection: "§9.3",
  },

  // Erection (3) — §13.x
  {
    id: "RPT-E-001",
    title: "Erection Progress Dashboard",
    description: "Field construction status by area and elevation.",
    category: "Erection",
    format: "pdf",
    sizeBytes: 1_500_000,
    lastGeneratedISO: "2026-05-14T11:20:00Z",
    owner: "QC-ENG-02",
    manualSection: "§13.1",
    liveCountKey: "erection.rft",
  },
  {
    id: "RPT-E-002",
    title: "Field Weld Status by Area",
    description: "Site weld completion and inspection pass rates.",
    category: "Erection",
    format: "xlsx",
    sizeBytes: 640_000,
    lastGeneratedISO: "2026-05-11T07:45:00Z",
    owner: "QC-ENG-04",
    manualSection: "§13.2",
    liveCountKey: "fieldWelds.total",
  },
  {
    id: "RPT-E-003",
    title: "Spool Delivery Readiness",
    description: "Spools cleared for shipment from shop to site.",
    category: "Erection",
    format: "xlsx",
    sizeBytes: 410_000,
    lastGeneratedISO: "2026-05-05T13:10:00Z",
    owner: "QC-ENG-01",
    manualSection: "§13.4",
  },

  // Testpack (3) — §20.x
  {
    id: "RPT-T-001",
    title: "Testpack Readiness Matrix",
    description: "ISO-level line check and punch list clearance status.",
    category: "Testpack",
    format: "xlsx",
    sizeBytes: 880_000,
    lastGeneratedISO: "2026-05-13T10:00:00Z",
    owner: "QC-ENG-03",
    manualSection: "§20.1",
    liveCountKey: "testpack.rflc",
  },
  {
    id: "RPT-T-002",
    title: "Pressure Test Log",
    description: "Hydrostatic and pneumatic test records with dates.",
    category: "Testpack",
    format: "pdf",
    sizeBytes: 1_800_000,
    lastGeneratedISO: "2026-05-09T15:30:00Z",
    owner: "QC-ENG-02",
    manualSection: "§20.3",
  },
  {
    id: "RPT-T-003",
    title: "ISO Status Report",
    description: "Isometric drawing release and welding close-out status.",
    category: "Testpack",
    format: "csv",
    sizeBytes: 1_300_000,
    lastGeneratedISO: "2026-05-06T08:20:00Z",
    owner: "QC-ENG-04",
    manualSection: "§20.2",
    liveCountKey: "testpack.total",
  },

  // NDE (2) — cross-§11
  {
    id: "RPT-N-001",
    title: "NDE Batch Summary",
    description: "Active RT/UT/MT batches with weld counts and subcontractors.",
    category: "NDE",
    format: "xlsx",
    sizeBytes: 720_000,
    lastGeneratedISO: "2026-05-14T09:00:00Z",
    owner: "QC-ENG-01",
    manualSection: "§11.6",
    liveCountKey: "batches.active",
  },
  {
    id: "RPT-N-002",
    title: "NDE Overdue Report",
    description: "Batches past target turnaround with aging analysis.",
    category: "NDE",
    format: "pdf",
    sizeBytes: 220_000,
    lastGeneratedISO: "2026-05-07T12:45:00Z",
    owner: "QC-ENG-03",
    manualSection: "§11.7",
    liveCountKey: "batches.overdue",
  },
]

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1).replace(/\.0$/, "")} MB`
  }
  return `${Math.round(bytes / 1_000)} KB`
}

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "in the future"
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}
