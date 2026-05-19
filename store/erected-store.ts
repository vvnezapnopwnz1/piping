"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  ERECTED_SEED,
  type AreaSupervisor,
  type ErectedRecord,
  type PlacementLocation,
} from "@/lib/erection-stage"

interface ErectedState {
  records: ErectedRecord[]

  getRecord: (spoolNo: string) => ErectedRecord | undefined

  markErected: (args: {
    spoolNo: string
    erectedBy: AreaSupervisor
    w24FormNo: string
    placementLocation: PlacementLocation
    elevation?: string
    remark?: string
  }) => void
  resetErected: () => void
}

const cloneSeed = () => JSON.parse(JSON.stringify(ERECTED_SEED)) as ErectedRecord[]

export const useErectedStore = create<ErectedState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (spoolNo) =>
        get().records.find((record) => record.spoolNo === spoolNo),

      markErected: ({
        spoolNo,
        erectedBy,
        w24FormNo,
        placementLocation,
        elevation,
        remark,
      }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existing = state.records.find((record) => record.spoolNo === spoolNo)
          const nextRecord: ErectedRecord = {
            spoolNo,
            erectedDate: today,
            erectedBy,
            w24FormNo,
            placementLocation,
            ...(elevation ? { elevation } : {}),
            ...(remark ? { remark } : {}),
          }

          if (existing) {
            if (existing.erectedDate !== today) {
              return state
            }
            return {
              records: state.records.map((record) =>
                record.spoolNo === spoolNo ? nextRecord : record,
              ),
            }
          }

          return { records: [...state.records, nextRecord] }
        }),

      resetErected: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-erected",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
