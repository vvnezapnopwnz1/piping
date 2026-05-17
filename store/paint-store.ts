"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  PAINT_SEED,
  type PaintRecord,
  type PaintSystem,
  type PaintSubcontractor,
} from "@/lib/spool-data"

interface PaintState {
  records: PaintRecord[]

  getRecord: (spoolNo: string) => PaintRecord | undefined

  // Mutations
  dispatch: (args: {
    spoolNo: string
    paintSystem: PaintSystem
    subcontractor: PaintSubcontractor
    remark?: string
  }) => void
  signOffPaint: (args: {
    spoolNo: string
    dftMicrons: number
    finalQCInspector: string
  }) => void
  resetPaint: () => void
}

const SEED = JSON.parse(JSON.stringify(PAINT_SEED)) as PaintRecord[]

export const usePaintStore = create<PaintState>()(
  persist(
    (set, get) => ({
      records: SEED,

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      dispatch: ({ spoolNo, paintSystem, subcontractor, remark }) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          const today = new Date().toISOString().split("T")[0]
          if (existing) {
            // Idempotent: overwrite only if not yet returned
            if (existing.returnDate) return state
            const next = state.records.map((r) =>
              r.spoolNo === spoolNo
                ? {
                    ...r,
                    paintSystem,
                    subcontractor,
                    dispatchDate: today,
                    dispatchRemark: remark,
                  }
                : r
            )
            return { records: next }
          }
          const newRecord: PaintRecord = {
            spoolNo,
            paintSystem,
            subcontractor,
            dispatchDate: today,
            dispatchRemark: remark,
          }
          return { records: [...state.records, newRecord] }
        }),

      signOffPaint: ({ spoolNo, dftMicrons, finalQCInspector }) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          if (!existing || !existing.dispatchDate) return state
          const today = new Date().toISOString().split("T")[0]
          const next = state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  dftMicrons,
                  finalQCInspector,
                  returnDate: today,
                  finalQCSignedOffDate: today,
                }
              : r
          )
          return { records: next }
        }),

      resetPaint: () => set({ records: JSON.parse(JSON.stringify(PAINT_SEED)) }),
    }),
    {
      name: "pipeqc-paint",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    }
  )
)
