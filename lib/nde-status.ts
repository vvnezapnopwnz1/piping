import type { NdeBatch, NdeBatchStatus, NdeBatchWeld, NdeWeldResult } from "@/store"

export type ManualNdeBatchState = "Joint to Select" | "Awaiting NDE" | "Released"
export type ManualNdeJointCode =
  | "S"
  | "SS"
  | "NR"
  | "T1"
  | "T2"
  | "T1S"
  | "T2S"
  | "T1-1"
  | "T1-2"
  | "T2-1"
  | "T2-2"
  | "SS-PENALTY"

export interface TracerSelection {
  sourceRejectedWeldId: string
  tracerWeldId: string
  level: "T1" | "T2" | "T1-1" | "T1-2" | "T2-1" | "T2-2"
  selectedAt: string
  selectedBy: string
  result?: "Accepted" | "Rejected"
}

export const mapBatchStatusToManual = (status: NdeBatchStatus): ManualNdeBatchState => {
  if (status === "Created") return "Joint to Select"
  if (status === "Closed") return "Released"
  return "Awaiting NDE"
}

export const mapResultToJointCode = (
  weld: NdeBatchWeld,
  tracerSelections: TracerSelection[] | undefined,
): ManualNdeJointCode => {
  const tracer = tracerSelections?.find((t) => t.tracerWeldId === weld.id)
  if (tracer) {
    if (tracer.level === "T1") return tracer.result ? "T1S" : "T1"
    if (tracer.level === "T2") return tracer.result ? "T2S" : "T2"
    return tracer.level
  }
  if (weld.category === "NDE100" && !weld.parentWeldId) return "SS-PENALTY"
  if (weld.result === "Pending") return "S"
  if (weld.result === "Accepted") return "NR"
  return "SS"
}

export const needsTracer = (result: NdeWeldResult) => result === "Rejected"

export const hasNde100Requirement = (batch: NdeBatch, tracerSelections: TracerSelection[] | undefined) => {
  const rejected = batch.welds.filter((w) => w.result === "Rejected").length
  const rejectedTracers = (tracerSelections ?? []).filter((t) => t.result === "Rejected").length
  return rejected + rejectedTracers >= 4
}
