import type { FabricationReadiness, ReleaseBlocker } from "../../domain/quality-release"

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
  const blockers = r.releaseBlockers
  const hasBlocker = (code: ReleaseBlocker["code"]): boolean =>
    blockers.some((b) => b.code === code)

  return [
    {
      id: "revision",
      complete: !hasBlocker("revision_not_accepted"),
      detail: { key: "revisionStatus", values: { status: r.revisionStatus } },
    },
    {
      id: "material",
      complete: !hasBlocker("material_incomplete"),
      detail: r.lineTotal === 0 ? { key: "noBom" } : { key: "linesTraced", values: { checked: r.lineChecked, total: r.lineTotal } },
    },
    {
      id: "welds",
      complete: !hasBlocker("welding_incomplete"),
      detail: r.weldTotal === 0 ? { key: "noWelds" } : { key: "jointsWelded", values: { complete: r.weldComplete, total: r.weldTotal } },
    },
    {
      id: "supports",
      complete: !hasBlocker("supports_incomplete"),
      detail: r.supportTotal === 0 ? { key: "noSupports" } : { key: "supportsInstalled", values: { recorded: r.supportRecorded, total: r.supportTotal } },
    },
    {
      id: "nde",
      complete: !hasBlocker("nde_open"),
      detail: { key: "ndeOutstanding", values: { count: r.ndePending } },
    },
    {
      id: "pwht",
      complete: !hasBlocker("pwht_open"),
      detail: { key: "pwhtOutstanding", values: { count: r.pwhtPending } },
    },
  ]
}
