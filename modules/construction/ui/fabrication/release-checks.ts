import type { FabricationReadiness } from "../../domain/quality-release"

export type ReleaseCheckId = "revision" | "material" | "welds" | "supports" | "nde" | "pwht"

/** What a check says about itself; the screen words it from `fabrication.releaseCheck.detail`. */
export interface ReleaseCheckDetail {
  key: "revisionStatus" | "noBom" | "linesTraced" | "noWelds" | "jointsWelded" | "noSupports" | "supportsInstalled" | "ndeOutstanding" | "pwhtOutstanding"
  values?: Record<string, string | number>
}

export interface ReleaseCheck {
  id: ReleaseCheckId
  complete: boolean
  detail: ReleaseCheckDetail
}

export function releaseChecks(r: FabricationReadiness): ReleaseCheck[] {
  return [
    {
      id: "revision",
      complete: r.revisionStatus === "accepted",
      detail: { key: "revisionStatus", values: { status: r.revisionStatus } },
    },
    {
      id: "material",
      complete: r.lineTotal > 0 && r.lineChecked >= r.lineTotal,
      detail: r.lineTotal === 0 ? { key: "noBom" } : { key: "linesTraced", values: { checked: r.lineChecked, total: r.lineTotal } },
    },
    {
      id: "welds",
      complete: r.weldComplete >= r.weldTotal,
      detail: r.weldTotal === 0 ? { key: "noWelds" } : { key: "jointsWelded", values: { complete: r.weldComplete, total: r.weldTotal } },
    },
    {
      id: "supports",
      complete: r.supportRecorded >= r.supportTotal,
      detail: r.supportTotal === 0 ? { key: "noSupports" } : { key: "supportsInstalled", values: { recorded: r.supportRecorded, total: r.supportTotal } },
    },
    {
      id: "nde",
      complete: r.ndePending === 0,
      detail: { key: "ndeOutstanding", values: { count: r.ndePending } },
    },
    {
      id: "pwht",
      complete: r.pwhtPending === 0,
      detail: { key: "pwhtOutstanding", values: { count: r.pwhtPending } },
    },
  ]
}
