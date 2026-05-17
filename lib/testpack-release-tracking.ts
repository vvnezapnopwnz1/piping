import type { NdeBatch } from "@/store"
import type { WeldJoint } from "@/lib/weld-data"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"
import type { FlangeJoint } from "@/lib/flange-data"
import type { ISORecord, PunchItem, TestPackRecord } from "@/lib/testpack-seed"

export interface ReleaseTrackingMetrics {
  jointsToBeWelded: number
  flangeJointsToBeBolted: number
  jointsAwaitingNde: number
  isosToComplete: number
  isosToReturnFromLineCheck: number
  itemsCatXToClear: number
  isosToQcRelease: number
  isosReadyForTest: number
  qcReleased: boolean
  readyForTest: boolean
  confidence: {
    welded: "high" | "low"
    flange: "high" | "low"
    nde: "high" | "low"
  }
}

interface ComputeInput {
  testpack: TestPackRecord
  isos: ISORecord[]
  punchItems: PunchItem[]
  welds: WeldJoint[]
  fieldWelds: FieldWeldJoint[]
  batches: NdeBatch[]
  flangeJoints: FlangeJoint[]
}

const normalizeIso = (value: string) =>
  value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/R\d+$/g, "")
    .replace(/[^A-Z0-9-]/g, "")

const isFieldWeldDone = (weld: FieldWeldJoint) => {
  const statusDone = weld.erectionStatus === "Welded" || weld.erectionStatus === "Supported" || weld.erectionStatus === "RFT"
  const progressDone = weld.rootPercent + weld.capPercent >= 100
  return statusDone && progressDone
}

const isNdeClear = (weld: WeldJoint, batches: NdeBatch[]) => {
  const fromRt = weld.rtResult?.toLowerCase() === "accepted"
  const pwhtBlocked = weld.pwhtRequired && !weld.pwhtDate

  const batchWeld = batches.flatMap((b) => b.welds).find((bw) => bw.id === weld.id)
  const fromBatch = batchWeld?.result === "Accepted"

  if ((fromRt || fromBatch) && !pwhtBlocked) return true
  return false
}

export function computeReleaseTrackingMetrics({
  testpack,
  isos,
  punchItems,
  welds,
  fieldWelds,
  batches,
  flangeJoints,
}: ComputeInput): ReleaseTrackingMetrics {
  const tpIsoIds = new Set(testpack.isoIds)
  const tpIsoNorm = new Set(testpack.isoIds.map(normalizeIso))

  const linkedShopWelds = welds.filter((w) => tpIsoIds.has(w.isoNo) || tpIsoNorm.has(normalizeIso(w.isoNo)))
  const linkedFieldWelds = fieldWelds.filter((w) => tpIsoIds.has(w.isoNo) || tpIsoNorm.has(normalizeIso(w.isoNo)))
  const linkedFlanges = flangeJoints.filter((j) => {
    const tp = j.testpackId ?? j.testPackId
    const iso = j.isoId ?? j.isoNo
    return tp === testpack.id || tpIsoIds.has(iso) || tpIsoNorm.has(normalizeIso(iso))
  })

  const jointsToBeWelded =
    linkedShopWelds.filter((w) => w.status !== "Completed").length +
    linkedFieldWelds.filter((w) => !isFieldWeldDone(w)).length

  const flangeJointsToBeBolted = linkedFlanges.filter((joint) => {
    const category = joint.category ?? joint.jointCategory
    if (category !== "X") return false
    return !["Bolted", "Torque Verified", "Reinstated"].includes(joint.boltingStatus)
  }).length

  const weldedShopJoints = linkedShopWelds.filter((w) => w.status === "Completed" || w.status === "Rejected" || w.status === "Rework")
  const jointsAwaitingNde = weldedShopJoints.filter((w) => !isNdeClear(w, batches)).length

  const tpIsos = isos.filter((iso) => tpIsoIds.has(iso.id))
  const isosToComplete = tpIsos.filter((iso) => !(iso.allWeldsWelded && iso.spoolsSupported)).length
  const isosToReturnFromLineCheck = tpIsos.filter((iso) => iso.lineCheckStatus === "Assigned" || iso.lineCheckStatus === "InProgress").length
  const itemsCatXToClear = punchItems.filter((pi) => !pi.clearedAt && pi.category === "X" && tpIsoIds.has(pi.isoId)).length

  const isoBlockers = new Map<string, number>()
  for (const isoId of tpIsoIds) isoBlockers.set(isoId, 0)
  for (const weld of weldedShopJoints) {
    if (!isNdeClear(weld, batches)) {
      const key = tpIsoIds.has(weld.isoNo) ? weld.isoNo : testpack.isoIds.find((id) => normalizeIso(id) === normalizeIso(weld.isoNo))
      if (key) isoBlockers.set(key, (isoBlockers.get(key) ?? 0) + 1)
    }
  }
  const isosToQcRelease = Array.from(isoBlockers.values()).filter((v) => v > 0).length

  const qcReleased =
    jointsToBeWelded === 0 &&
    flangeJointsToBeBolted === 0 &&
    jointsAwaitingNde === 0 &&
    isosToReturnFromLineCheck === 0 &&
    itemsCatXToClear === 0

  const readyForTest =
    qcReleased &&
    (testpack.blindingStatus === "Eligible" || testpack.blindingStatus === "Assigned" || testpack.blindingStatus === "Done")

  const isosReadyForTest = readyForTest ? tpIsos.length : 0

  return {
    jointsToBeWelded,
    flangeJointsToBeBolted,
    jointsAwaitingNde,
    isosToComplete,
    isosToReturnFromLineCheck,
    itemsCatXToClear,
    isosToQcRelease,
    isosReadyForTest,
    qcReleased,
    readyForTest,
    confidence: {
      welded: linkedShopWelds.length + linkedFieldWelds.length > 0 ? "high" : "low",
      flange: linkedFlanges.length > 0 ? "high" : "low",
      nde: weldedShopJoints.length > 0 ? "high" : "low",
    },
  }
}
