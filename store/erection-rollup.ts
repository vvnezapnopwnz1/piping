"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  deriveSpoolErectionStage,
  computeSpoolFieldMCRollup,
  ERECTION_STAGE_ORDER,
  isSpoolRFTEligible,
  type SpoolErectionStage,
} from "@/lib/erection-stage"
import { useErectionStore } from "@/store/erection-store"
import { FIELD_WELD_DATA } from "@/lib/erection-weld-data"
import { useToSiteStore } from "@/store/to-site-store"
import { useErectedStore } from "@/store/erected-store"
import { useWeldedBoltedStore } from "@/store/welded-bolted-store"
import { useSupportsStore } from "@/store/supports-store"
import { useRFTStore } from "@/store/rft-store"
import { useFieldMaterialCheckStore } from "@/store/field-material-check-store"
import { useFlangeBoltProgressStore } from "@/store/flange-bolt-progress-store"
import { useFieldQCReleaseStore } from "@/store/field-qc-release-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { useTestpackStore } from "@/store/testpack-store"
import {
  computeSpoolFlangeBoltRollup,
  type SpoolFlangeBoltRollup,
} from "@/lib/erection-stage"

export function useSpoolErectionStages(): Array<{
  spoolNo: string
  stage: SpoolErectionStage
}> {
  const fieldWelds = useErectionStore((state) => state.fieldWelds)
  const toSiteRecords = useToSiteStore((state) => state.records)
  const erectedRecords = useErectedStore((state) => state.records)
  const weldedBoltedRecords = useWeldedBoltedStore((state) => state.records)
  const supportedRecords = useSupportsStore((state) => state.records)
  const rftRecords = useRFTStore((state) => state.records)
  const mcRecords = useFieldMaterialCheckStore((state) => state.records)
  const fieldQcRecords = useFieldQCReleaseStore((state) => state.records)

  return useMemo(() => {
    const spoolNos = [
      ...new Set([
        ...fieldWelds.map((fieldWeld) => fieldWeld.spoolNo),
        ...toSiteRecords.map((record) => record.spoolNo),
        ...erectedRecords.map((record) => record.spoolNo),
        ...weldedBoltedRecords.map((record) => record.spoolNo),
        ...supportedRecords.map((record) => record.spoolNo),
        ...rftRecords.map((record) => record.spoolNo),
      ]),
    ].sort()
    const toSiteMap = new Map(toSiteRecords.map((record) => [record.spoolNo, record]))
    const erectedMap = new Map(erectedRecords.map((record) => [record.spoolNo, record]))
    const weldedBoltedMap = new Map(weldedBoltedRecords.map((record) => [record.spoolNo, record]))
    const supportedMap = new Map(supportedRecords.map((record) => [record.spoolNo, record]))
    const rftMap = new Map(rftRecords.map((record) => [record.spoolNo, record]))
    const fieldQcMap = new Map(
      fieldQcRecords.map((record) => [record.spoolNo, record]),
    )

    return spoolNos.map((spoolNo) => {
      const mcRollup = computeSpoolFieldMCRollup(spoolNo, fieldWelds, mcRecords)
      const fieldQc = fieldQcMap.get(spoolNo)
      return {
        spoolNo,
        stage: deriveSpoolErectionStage(
          spoolNo,
          fieldWelds,
          toSiteMap.get(spoolNo),
          erectedMap.get(spoolNo),
          weldedBoltedMap.get(spoolNo),
          supportedMap.get(spoolNo),
          rftMap.get(spoolNo),
          mcRollup.totalJoints > 0 ? mcRollup : undefined,
          !!fieldQc?.signedOffDate,
        ),
      }
    })
  }, [fieldWelds, toSiteRecords, erectedRecords, weldedBoltedRecords, supportedRecords, rftRecords, mcRecords, fieldQcRecords])
}

export function useSpoolRFTWatcher() {
  const toSiteRecords = useToSiteStore((s) => s.records)
  const erectedRecords = useErectedStore((s) => s.records)
  const wbRecords = useWeldedBoltedStore((s) => s.records)
  const supportedRecords = useSupportsStore((s) => s.records)
  const rftRecords = useRFTStore((s) => s.records)
  const flangeRecords = useFlangeBoltProgressStore((s) => s.records)
  const recordRFT = useRFTStore((s) => s.recordRFT)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const recordSpoolRFT = useTestpackStore((s) => s.recordSpoolRFT)
  const fieldQcRecords = useFieldQCReleaseStore((s) => s.records)

  const initialized = useRef(false)
  useEffect(() => {
    initialized.current = true
  }, [])

  useEffect(() => {
    if (!initialized.current) return

    const toSiteMap = new Map(toSiteRecords.map((r) => [r.spoolNo, r]))
    const erectedMap = new Map(erectedRecords.map((r) => [r.spoolNo, r]))
    const wbMap = new Map(wbRecords.map((r) => [r.spoolNo, r]))
    const supportedMap = new Map(supportedRecords.map((r) => [r.spoolNo, r]))

    for (const sr of supportedRecords) {
      const spoolNo = sr.spoolNo
      if (rftRecords.some((r) => r.spoolNo === spoolNo)) continue

      const ts = toSiteMap.get(spoolNo)
      const er = erectedMap.get(spoolNo)
      const wb = wbMap.get(spoolNo)
      const sup = supportedMap.get(spoolNo)
      const flangeRollup = computeSpoolFlangeBoltRollup(spoolNo, FIELD_WELD_DATA, flangeRecords)
      const fieldQc = fieldQcRecords.find((r) => r.spoolNo === spoolNo)
      const isFieldQcReleased = !!fieldQc?.signedOffDate

      if (!isSpoolRFTEligible(spoolNo, ts, er, wb, sup, flangeRollup, isFieldQcReleased)) continue

      const today = new Date().toISOString().split("T")[0]
      recordRFT({
        spoolNo,
        rftDate: today,
        autoGenerated: true,
        predecessors: {
          toSiteDate: ts!.receivedDate,
          erectedDate: er!.erectedDate,
          weldedBoltedDate: wb!.confirmedDate,
          supportedDate: sup!.confirmedDate,
        },
      })

      pushNotification({
        severity: "success",
        category: "weld_progress",
        title: `Spool ${spoolNo}: RFT — Ready For Test`,
        description:
          "All erection predecessors complete (To Site / Erected / Welded·Bolted / Supported)",
        href: "/erection/rft",
        timestamp: new Date().toISOString(),
      })

      recordSpoolRFT(spoolNo)
    }
  }, [toSiteRecords, erectedRecords, wbRecords, supportedRecords, rftRecords, flangeRecords, fieldQcRecords, recordRFT, pushNotification, recordSpoolRFT])
}

export function useSpoolErectionStageCounts(): Record<SpoolErectionStage, number> {
  const stages = useSpoolErectionStages()

  return useMemo(() => {
    const counts = Object.fromEntries(
      ERECTION_STAGE_ORDER.map((stage) => [stage, 0]),
    ) as Record<SpoolErectionStage, number>

    for (const spool of stages) {
      counts[spool.stage] += 1
    }

    return counts
  }, [stages])
}

export function useSpoolsAtErectionStage(stage: SpoolErectionStage): string[] {
  const stages = useSpoolErectionStages()

  return useMemo(
    () =>
      stages
        .filter((spool) => spool.stage === stage)
        .map((spool) => spool.spoolNo)
        .sort(),
    [stage, stages],
  )
}

export function useFieldMaterialCheckByJoint(fieldJointId: string) {
  return useFieldMaterialCheckStore((state) => state.getRecord(fieldJointId))
}

export function useSpoolFlangeBoltRollup(spoolNo: string): SpoolFlangeBoltRollup {
  const records = useFlangeBoltProgressStore((state) => state.records)
  return computeSpoolFlangeBoltRollup(spoolNo, FIELD_WELD_DATA, records)
}

export function useFlangeBoltProgressByJoint(fieldJointId: string) {
  return useFlangeBoltProgressStore((state) => state.getRecord(fieldJointId))
}

export function useFleetFlangeBoltCounts(): { total: number; assigned: number; bolted: number; verified: number } {
  const records = useFlangeBoltProgressStore((state) => state.records)
  const allFlangeJoints = FIELD_WELD_DATA.filter((w) => w.fieldJointType === "Flange Bolt")
  const total = allFlangeJoints.length
  const validJointIds = new Set(allFlangeJoints.map((j) => j.id))

  let assigned = 0, bolted = 0, verified = 0
  for (const r of records) {
    if (!validJointIds.has(r.fieldJointId)) continue
    if (r.verifiedDate) { verified++; bolted++; assigned++; continue }
    if (r.boltedDate) { bolted++; assigned++; continue }
    if (r.targetTorqueNm && r.boltingMethod && r.assignedBy) assigned++
  }
  return { total, assigned, bolted, verified }
}
