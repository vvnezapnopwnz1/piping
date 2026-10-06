import type { FabricationReadiness } from "../../domain/quality-release"

export type ReleaseCheckId = "revision" | "material" | "welds" | "supports" | "nde" | "pwht"

export interface ReleaseCheck {
  id: ReleaseCheckId
  label: string
  complete: boolean
  detail: string
}

export function releaseChecks(r: FabricationReadiness): ReleaseCheck[] {
  return [
    {
      id: "revision",
      label: "Revision",
      complete: r.revisionStatus === "accepted",
      detail: r.revisionStatus,
    },
    {
      id: "material",
      label: "Material traces",
      complete: r.lineTotal > 0 && r.lineChecked >= r.lineTotal,
      detail: r.lineTotal === 0 ? "No bill of materials" : `${r.lineChecked} of ${r.lineTotal} lines traced`,
    },
    {
      id: "welds",
      label: "Shop welds",
      complete: r.weldComplete >= r.weldTotal,
      detail: r.weldTotal === 0 ? "No weld joints required" : `${r.weldComplete} of ${r.weldTotal} joints welded`,
    },
    {
      id: "supports",
      label: "Supports",
      complete: r.supportRecorded >= r.supportTotal,
      detail: r.supportTotal === 0 ? "No supports required" : `${r.supportRecorded} of ${r.supportTotal} installed`,
    },
    {
      id: "nde",
      label: "NDE",
      complete: r.ndePending === 0,
      detail: `${r.ndePending} obligations outstanding`,
    },
    {
      id: "pwht",
      label: "PWHT",
      complete: r.pwhtPending === 0,
      detail: `${r.pwhtPending} results outstanding`,
    },
  ]
}
