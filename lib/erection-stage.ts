import type { ErectionStatus, FieldWeldJoint } from "@/lib/erection-weld-data"

export type SpoolErectionStage =
  | "Not Started"
  | "To Site"
  | "Erected"
  | "Welded/Bolted"
  | "Supported"
  | "RFT"

export const ERECTION_STAGE_ORDER: SpoolErectionStage[] = [
  "Not Started",
  "To Site",
  "Erected",
  "Welded/Bolted",
  "Supported",
  "RFT",
]

export const ERECTION_STAGE_COLOR: Record<
  SpoolErectionStage,
  { bg: string; text: string; rail: string }
> = {
  "Not Started": {
    bg: "bg-slate-50",
    text: "text-slate-600",
    rail: "bg-slate-300",
  },
  "To Site": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    rail: "bg-amber-500",
  },
  Erected: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    rail: "bg-sky-500",
  },
  "Welded/Bolted": {
    bg: "bg-violet-50",
    text: "text-violet-700",
    rail: "bg-violet-500",
  },
  Supported: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    rail: "bg-emerald-500",
  },
  RFT: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    rail: "bg-emerald-700",
  },
}

export interface ToSiteRecord {
  spoolNo: string
  receivedDate: string
  receivedBy: string
  w24FormNo: string
  remark?: string
}

export const AREA_SUPERVISORS = [
  "SUP-01",
  "SUP-02",
  "SUP-03",
  "SUP-04",
] as const

export type AreaSupervisor = (typeof AREA_SUPERVISORS)[number]

export const TO_SITE_SEED: ToSiteRecord[] = [
  {
    spoolNo: "PL-TK100-003-A",
    receivedDate: "2025-05-16",
    receivedBy: "SUP-02",
    w24FormNo: "W24-2025-0142",
    remark: "Unloaded near compressor skid south access.",
  },
  {
    spoolNo: "PL-TK100-004-A",
    receivedDate: "2025-05-16",
    receivedBy: "SUP-03",
    w24FormNo: "W24-2025-0146",
    remark: "Supervisor confirmed supports available at Area A.",
  },
  {
    spoolNo: "PL-CW200-005-A",
    receivedDate: "2025-05-15",
    receivedBy: "SUP-01",
    w24FormNo: "W24-2025-0138",
    remark: "Delivered with insulation clearance hold note resolved on site.",
  },
]

const ERECTION_STATUS_RANK: Record<ErectionStatus, number> = {
  "Not Started": 0,
  "To Site": 1,
  Erected: 2,
  Welded: 3,
  Bolted: 3,
  Supported: 4,
  RFT: 5,
}

export function deriveSpoolErectionStage(
  spoolNo: string,
  fieldWelds: Pick<FieldWeldJoint, "spoolNo" | "erectionStatus">[],
  toSiteRecord?: ToSiteRecord,
): SpoolErectionStage {
  const statuses = fieldWelds
    .filter((fieldWeld) => fieldWeld.spoolNo === spoolNo)
    .map((fieldWeld) => fieldWeld.erectionStatus)

  if (statuses.length === 0) {
    return toSiteRecord ? "To Site" : "Not Started"
  }

  if (statuses.every((status) => ERECTION_STATUS_RANK[status] >= 5)) {
    return "RFT"
  }

  if (statuses.every((status) => ERECTION_STATUS_RANK[status] >= 4)) {
    return "Supported"
  }

  if (statuses.every((status) => ERECTION_STATUS_RANK[status] >= 3)) {
    return "Welded/Bolted"
  }

  if (statuses.every((status) => ERECTION_STATUS_RANK[status] >= 2)) {
    return "Erected"
  }

  if (toSiteRecord) {
    return "To Site"
  }

  if (statuses.some((status) => ERECTION_STATUS_RANK[status] >= 1)) {
    return "To Site"
  }

  return "Not Started"
}
