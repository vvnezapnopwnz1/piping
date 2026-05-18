"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  TO_SITE_SEED,
  type AreaSupervisor,
  type ToSiteRecord,
} from "@/lib/erection-stage"

interface ToSiteState {
  records: ToSiteRecord[]

  getRecord: (spoolNo: string) => ToSiteRecord | undefined

  markReceived: (args: {
    spoolNo: string
    receivedBy: AreaSupervisor
    w24FormNo: string
    remark?: string
  }) => void
  resetToSite: () => void
}

const cloneSeed = () => JSON.parse(JSON.stringify(TO_SITE_SEED)) as ToSiteRecord[]

export const useToSiteStore = create<ToSiteState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (spoolNo) => get().records.find((record) => record.spoolNo === spoolNo),

      markReceived: ({ spoolNo, receivedBy, w24FormNo, remark }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existing = state.records.find((record) => record.spoolNo === spoolNo)
          const nextRecord: ToSiteRecord = {
            spoolNo,
            receivedDate: today,
            receivedBy,
            w24FormNo,
            ...(remark ? { remark } : {}),
          }

          if (existing) {
            if (existing.receivedDate !== today) {
              return state
            }
            return {
              records: state.records.map((record) =>
                record.spoolNo === spoolNo ? nextRecord : record
              ),
            }
          }

          return { records: [...state.records, nextRecord] }
        }),

      resetToSite: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-to-site",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    }
  )
)
