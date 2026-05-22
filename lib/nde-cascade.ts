import type { NdeBatch, WeldResultInput } from "@/store/batches-store"
import type { WeldJoint } from "@/lib/weld-data"
import type { TracerSelection } from "@/lib/nde-status"

export interface CascadeOutcome {
  r1JointsToCreate: Array<{
    parentWeldId: string
    parentJointNo: string
    spoolNo: string
    isoNo: string
    welder: string
    dwirNo: string
    materialType: string
    diaInch: string
    wpsNo: string
    defectCode?: string
    defectLocation?: string
  }>
  tracerAssignments: Array<{
    sourceRejectedWeldId: string
    candidateWeldIds: string[]
    level: TracerSelection["level"]
  }>
  penaltyShootTriggered: boolean
  penaltyShootReason: "FOUR_REJECTIONS" | "SECOND_LEVEL_TRACER" | null
  ssEligibleWeldIds: string[]
}

export function processRejections(
  batch: NdeBatch,
  results: WeldResultInput[],
  allShopWelds: WeldJoint[],
  allFieldWelds: WeldJoint[],
): CascadeOutcome {
  const sourceWelds = batch.source === "field" ? allFieldWelds : allShopWelds
  const rejectedResults = results.filter((r) => r.result === "Rejected")

  const r1JointsToCreate: CascadeOutcome["r1JointsToCreate"] = rejectedResults.flatMap((r) => {
    const batchWeld = batch.welds.find((w) => w.id === r.weldId)
    if (!batchWeld) return []
    return [
      {
        parentWeldId: r.weldId,
        parentJointNo: batchWeld.jointNo,
        spoolNo: batchWeld.spoolNo,
        isoNo: batchWeld.isoNo,
        welder: batchWeld.welder,
        dwirNo: batchWeld.dwirNo,
        materialType: batchWeld.materialType,
        diaInch: batchWeld.diaInch,
        wpsNo: batchWeld.wpsNo,
        defectCode: r.defectCode,
        defectLocation: r.defectLocation,
      },
    ]
  })

  const existingT1ByWelder = new Set(
    (batch.tracerSelections ?? []).filter((t) => t.level === "T1").map((t) => t.sourceRejectedWeldId),
  )
  const tracerAssignments: CascadeOutcome["tracerAssignments"] = rejectedResults.flatMap((r) => {
    const batchWeld = batch.welds.find((w) => w.id === r.weldId)
    if (!batchWeld) return []
    const inBatch = new Set(batch.welds.map((w) => w.id))
    const candidates = sourceWelds
      .filter((w) => w.welderCode === batchWeld.welder && !inBatch.has(w.id))
      .slice(0, 2)
      .map((w) => w.id)
    const isResumeAfterT1Reject = existingT1ByWelder.has(r.weldId)
    const level: TracerSelection["level"] = isResumeAfterT1Reject ? "T1-1" : "T1"
    return [{ sourceRejectedWeldId: r.weldId, candidateWeldIds: candidates, level }]
  })

  const totalRejections =
    batch.welds.filter((w) => w.result === "Rejected").length + rejectedResults.length
  const has2ndLevelTracer =
    (batch.tracerSelections ?? []).some(
      (t) => t.level === "T1-1" || t.level === "T1-2" || t.level === "T2-1" || t.level === "T2-2",
    ) ||
    tracerAssignments.some(
      (t) => t.level === "T1-1" || t.level === "T1-2" || t.level === "T2-1" || t.level === "T2-2",
    )

  let penaltyShootTriggered = false
  let penaltyShootReason: CascadeOutcome["penaltyShootReason"] = null
  if (totalRejections >= 4) {
    penaltyShootTriggered = true
    penaltyShootReason = "FOUR_REJECTIONS"
  } else if (has2ndLevelTracer) {
    penaltyShootTriggered = true
    penaltyShootReason = "SECOND_LEVEL_TRACER"
  }

  let ssEligibleWeldIds: string[] = []
  if (penaltyShootTriggered) {
    const batchWelder = batch.welds[0]?.welder
    if (batchWelder) {
      const inBatch = new Set(batch.welds.map((w) => w.id))
      ssEligibleWeldIds = sourceWelds
        .filter((w) => w.welderCode === batchWelder && !inBatch.has(w.id))
        .map((w) => w.id)
    }
  }

  return {
    r1JointsToCreate,
    tracerAssignments,
    penaltyShootTriggered,
    penaltyShootReason,
    ssEligibleWeldIds,
  }
}

export function buildRnJointNo(parentJointNo: string): string {
  const match = parentJointNo.match(/^(.*?)-R(\d+)$/)
  if (match) {
    const base = match[1]
    const next = Number(match[2]) + 1
    return `${base}-R${next}`
  }
  return `${parentJointNo}-R1`
}

export function buildRnWeldId(parentWeldId: string): string {
  const match = parentWeldId.match(/^(.*?)-r(\d+)$/i)
  if (match) {
    const base = match[1]
    const next = Number(match[2]) + 1
    return `${base}-r${next}`
  }
  return `${parentWeldId}-r1`
}

export function isSecondLevelTracer(level: TracerSelection["level"]): boolean {
  return level === "T1-1" || level === "T1-2" || level === "T2-1" || level === "T2-2"
}
