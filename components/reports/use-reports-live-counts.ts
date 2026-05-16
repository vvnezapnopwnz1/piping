"use client"

import { useMemo } from "react"
import {
  useWeldsStore,
  useBatchesStore,
  useTestpackStore,
  useErectionStore,
} from "@/store"
import type { ReportDef } from "@/lib/reports-data"

export function useReportsLiveCounts(): Record<
  NonNullable<ReportDef["liveCountKey"]>,
  number
> {
  const welds = useWeldsStore((s) => s.welds)
  const batches = useBatchesStore((s) => s.batches)
  const testpacks = useTestpackStore((s) => s.testPacks)
  const fieldWelds = useErectionStore((s) => s.fieldWelds)

  return useMemo(
    () => ({
      "welds.total": welds.length,
      "welds.rework": welds.filter((w) => w.status === "Rework").length,
      "batches.active": batches.filter(
        (b) => b.status === "Issued" || b.status === "Created"
      ).length,
      "batches.overdue": batches.filter((b) => b.isOverdue).length,
      "testpack.rflc": testpacks.filter((t) => t.readyForTest).length,
      "testpack.total": testpacks.length,
      "erection.rft": fieldWelds.filter((w) => w.erectionStatus === "RFT")
        .length,
      "fieldWelds.total": fieldWelds.length,
    }),
    [welds, batches, testpacks, fieldWelds]
  )
}
