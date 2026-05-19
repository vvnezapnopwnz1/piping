"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { RFT_SEED, type RFTRecord } from "@/lib/erection-stage"

interface RFTState {
  records: RFTRecord[]

  getRecord: (spoolNo: string) => RFTRecord | undefined
  recordRFT: (record: RFTRecord) => void
  resetRFT: () => void
}

const cloneSeed = () => JSON.parse(JSON.stringify(RFT_SEED)) as RFTRecord[]

export const useRFTStore = create<RFTState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      recordRFT: (record) =>
        set((state) => {
          if (state.records.some((r) => r.spoolNo === record.spoolNo)) {
            return state
          }
          return { records: [...state.records, record] }
        }),

      resetRFT: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-rft",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
