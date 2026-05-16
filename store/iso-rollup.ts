"use client"

import { useEffect, useMemo, useRef } from "react"
import { useWeldsStore } from "./welds-store"
import { useErectionStore } from "./erection-store"
import { useTestpackStore } from "./testpack-store"
import { useNotificationsStore } from "./notifications-store"

export type IsoRollupStatus = "Welded" | "In progress" | "Not started" | "Blocked"

export interface IsoWeldRollup {
  isoNo: string
  shopWeldsTotal: number
  shopWeldsAccepted: number
  shopWeldsBlocking: number // Rejected + Rework
  fieldWeldsTotal: number
  fieldWeldsDone: number // erectionStatus in {Welded, Supported, RFT}
  fieldWeldsBlocking: number // erectionStatus in {Not Started, To Site, Erected, Bolted} count as not-done
  status: IsoRollupStatus
}

export const useIsoWeldRollup = (): IsoWeldRollup[] => {
  const welds = useWeldsStore((s) => s.welds)
  const fieldWelds = useErectionStore((s) => s.fieldWelds)

  return useMemo(() => {
    const map = new Map<string, IsoWeldRollup>()

    const seed = (isoNo: string) => {
      if (!map.has(isoNo)) {
        map.set(isoNo, {
          isoNo,
          shopWeldsTotal: 0,
          shopWeldsAccepted: 0,
          shopWeldsBlocking: 0,
          fieldWeldsTotal: 0,
          fieldWeldsDone: 0,
          fieldWeldsBlocking: 0,
          status: "Not started",
        })
      }
      return map.get(isoNo)!
    }

    for (const w of welds) {
      const r = seed(w.isoNo)
      r.shopWeldsTotal++
      if (w.status === "Completed") r.shopWeldsAccepted++
      else if (w.status === "Rejected" || w.status === "Rework") r.shopWeldsBlocking++
    }

    for (const fw of fieldWelds) {
      const r = seed(fw.isoNo)
      r.fieldWeldsTotal++
      const done =
        fw.erectionStatus === "Welded" ||
        fw.erectionStatus === "Supported" ||
        fw.erectionStatus === "RFT"
      if (done) r.fieldWeldsDone++
      else r.fieldWeldsBlocking++
    }

    for (const r of map.values()) {
      const totalWelds = r.shopWeldsTotal + r.fieldWeldsTotal
      if (r.shopWeldsBlocking > 0) r.status = "Blocked"
      else if (
        totalWelds > 0 &&
        r.shopWeldsAccepted === r.shopWeldsTotal &&
        r.fieldWeldsDone === r.fieldWeldsTotal
      )
        r.status = "Welded"
      else if (r.shopWeldsAccepted > 0 || r.fieldWeldsDone > 0)
        r.status = "In progress"
      else r.status = "Not started"
    }

    return Array.from(map.values()).sort((a, b) => a.isoNo.localeCompare(b.isoNo))
  }, [welds, fieldWelds])
}

// The watcher: runs once per ISO transition.
// Mount this in the root layout (app/layout.tsx) or in a small client wrapper.
export const useIsoWeldedWatcher = () => {
  const rollup = useIsoWeldRollup()
  const recordIsoWelded = useTestpackStore((s) => s.recordIsoWelded)
  const isos = useTestpackStore((s) => s.isos)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const seenWelded = useRef<Set<string>>(new Set())

  // Pre-seed the ref on first run with whatever's already true in the store,
  // so we don't emit notifications for the seed state.
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    for (const iso of isos) if (iso.allWeldsWelded) seenWelded.current.add(iso.id)
    initialized.current = true
  }, [isos])

  useEffect(() => {
    if (!initialized.current) return
    for (const r of rollup) {
      if (r.status !== "Welded") continue
      if (seenWelded.current.has(r.isoNo)) continue
      const matching = isos.find((iso) => iso.id === r.isoNo)
      if (!matching) continue // ISO exists in welds but not in testpack store — ignore
      if (matching.allWeldsWelded) {
        seenWelded.current.add(r.isoNo)
        continue
      }
      seenWelded.current.add(r.isoNo)
      recordIsoWelded(r.isoNo, "rollup")
      pushNotification({
        severity: "success",
        category: "weld_progress",
        title: `${r.isoNo}: welded`,
        description: `All welds accepted. Ready for line check on ${matching.testpackId}.`,
        timestamp: new Date().toISOString(),
      })
    }
  }, [rollup, isos, recordIsoWelded, pushNotification])
}
