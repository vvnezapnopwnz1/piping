"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  WELDED_BOLTED_SEED,
  type WeldedBoltedRecord,
} from "@/lib/erection-stage"

interface WeldedBoltedState {
  records: WeldedBoltedRecord[]

  getRecord: (spoolNo: string) => WeldedBoltedRecord | undefined

  confirmWeldedBolted: (args: {
    spoolNo: string
    confirmedBy: string
    w24FormNo: string
    weldedJointCount: number
    boltedJointCount: number
    remark?: string
  }) => void

  resetWeldedBolted: () => void
}

const cloneSeed = () =>
  JSON.parse(JSON.stringify(WELDED_BOLTED_SEED)) as WeldedBoltedRecord[]

export const useWeldedBoltedStore = create<WeldedBoltedState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (spoolNo) =>
        get().records.find((record) => record.spoolNo === spoolNo),

      confirmWeldedBolted: ({
        spoolNo,
        confirmedBy,
        w24FormNo,
        weldedJointCount,
        boltedJointCount,
        remark,
      }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existing = state.records.find(
            (record) => record.spoolNo === spoolNo,
          )
          const nextRecord: WeldedBoltedRecord = {
            spoolNo,
            confirmedDate: today,
            confirmedBy,
            w24FormNo,
            weldedJointCount,
            boltedJointCount,
            ...(remark ? { remark } : {}),
          }

          if (existing) {
            return {
              records: state.records.map((record) =>
                record.spoolNo === spoolNo ? nextRecord : record,
              ),
            }
          }

          return { records: [...state.records, nextRecord] }
        }),

      resetWeldedBolted: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-welded-bolted",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
