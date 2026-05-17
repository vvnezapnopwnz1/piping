"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  LAYDOWN_SEED,
  type LaydownRecord,
  type YardLocation,
} from "@/lib/spool-data"

interface LaydownState {
  records: LaydownRecord[]

  getRecord: (spoolNo: string) => LaydownRecord | undefined

  // Mutations
  placeOnYard: (args: {
    spoolNo: string
    yardLocation: YardLocation
    placedBy: string
  }) => void
  releaseToSite: (args: {
    spoolNo: string
    releasedBy: string
  }) => void
  resetLaydown: () => void
}

const SEED = JSON.parse(JSON.stringify(LAYDOWN_SEED)) as LaydownRecord[]

export const useLaydownStore = create<LaydownState>()(
  persist(
    (set, get) => ({
      records: SEED,

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      placeOnYard: ({ spoolNo, yardLocation, placedBy }) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          const today = new Date().toISOString().split("T")[0]
          if (existing) {
            // Idempotent: overwrite only if not yet released
            if (existing.releasedToSiteDate) return state
            const next = state.records.map((r) =>
              r.spoolNo === spoolNo
                ? {
                    ...r,
                    yardLocation,
                    placedDate: today,
                    placedBy,
                  }
                : r
            )
            return { records: next }
          }
          const newRecord: LaydownRecord = {
            spoolNo,
            yardLocation,
            placedDate: today,
            placedBy,
          }
          return { records: [...state.records, newRecord] }
        }),

      releaseToSite: ({ spoolNo, releasedBy }) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          if (!existing || !existing.placedDate || existing.releasedToSiteDate) return state
          const today = new Date().toISOString().split("T")[0]
          const next = state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  releasedToSiteDate: today,
                  releasedBy,
                }
              : r
          )
          return { records: next }
        }),

      resetLaydown: () => set({ records: JSON.parse(JSON.stringify(LAYDOWN_SEED)) }),
    }),
    {
      name: "pipeqc-laydown",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    }
  )
)
