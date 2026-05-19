"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  SUPPORT_SEED,
  SUPPORTED_SEED,
  type SupportItem,
  type SupportStatus,
  type SupportedRecord,
  type AreaSupervisor,
} from "@/lib/erection-stage"

interface SupportsState {
  items: SupportItem[]
  records: SupportedRecord[]

  getItemsBySpool: (spoolNo: string) => SupportItem[]
  getRecord: (spoolNo: string) => SupportedRecord | undefined

  setSupportStatus: (id: string, status: SupportStatus) => void
  confirmSupported: (args: {
    spoolNo: string
    confirmedBy: AreaSupervisor
    w23FormNo: string
    totalSupports: number
    remark?: string
  }) => void

  resetSupports: () => void
}

const cloneItems = () => JSON.parse(JSON.stringify(SUPPORT_SEED)) as SupportItem[]
const cloneRecords = () => JSON.parse(JSON.stringify(SUPPORTED_SEED)) as SupportedRecord[]

export const useSupportsStore = create<SupportsState>()(
  persist(
    (set, get) => ({
      items: cloneItems(),
      records: cloneRecords(),

      getItemsBySpool: (spoolNo) =>
        get().items.filter((item) => item.spoolNo === spoolNo),

      getRecord: (spoolNo) =>
        get().records.find((record) => record.spoolNo === spoolNo),

      setSupportStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
        })),

      confirmSupported: ({ spoolNo, confirmedBy, w23FormNo, totalSupports, remark }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existing = state.records.find((record) => record.spoolNo === spoolNo)
          const nextRecord: SupportedRecord = {
            spoolNo,
            confirmedDate: today,
            confirmedBy,
            w23FormNo,
            totalSupports,
            ...(remark ? { remark } : {}),
          }

          if (existing) {
            if (existing.confirmedDate !== today) {
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

      resetSupports: () =>
        set({ items: cloneItems(), records: cloneRecords() }),
    }),
    {
      name: "pipeqc-supports",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
