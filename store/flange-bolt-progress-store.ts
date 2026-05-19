"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  FLANGE_BOLT_SEED,
  type FlangeBoltProgressRecord,
  type BoltingMethod,
  type TorqueTool,
} from "@/lib/erection-stage"

interface FlangeBoltProgressState {
  records: FlangeBoltProgressRecord[]

  getRecord: (fieldJointId: string) => FlangeBoltProgressRecord | undefined
  getRecordsBySpool: (spoolNo: string) => FlangeBoltProgressRecord[]

  assignTorque: (args: {
    fieldJointId: string
    spoolNo: string
    targetTorqueNm: number
    boltingMethod: BoltingMethod
    assignedBy: string
  }) => void

  recordBoltUp: (args: {
    fieldJointId: string
    jointer: string
    tagNo: string
    reportNo: string
  }) => void

  verifyTorque: (args: {
    fieldJointId: string
    verifiedBy: string
    torqueTool: TorqueTool
    remark?: string
  }) => void

  resetFlangeBoltProgress: () => void
}

const cloneSeed = () => JSON.parse(JSON.stringify(FLANGE_BOLT_SEED)) as FlangeBoltProgressRecord[]

export const useFlangeBoltProgressStore = create<FlangeBoltProgressState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (fieldJointId) =>
        get().records.find((record) => record.fieldJointId === fieldJointId),

      getRecordsBySpool: (spoolNo) =>
        get().records.filter((record) => record.spoolNo === spoolNo),

      assignTorque: ({ fieldJointId, spoolNo, targetTorqueNm, boltingMethod, assignedBy }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existingIndex = state.records.findIndex((r) => r.fieldJointId === fieldJointId)
          if (existingIndex >= 0) {
            const next = [...state.records]
            const existing = next[existingIndex]
            // Only patch assignment fields; never overwrite boltedDate or verifiedDate
            next[existingIndex] = {
              ...existing,
              targetTorqueNm,
              boltingMethod,
              assignedBy,
              assignedDate: today,
            }
            return { records: next }
          }
          const record: FlangeBoltProgressRecord = {
            fieldJointId,
            spoolNo,
            targetTorqueNm,
            boltingMethod,
            assignedBy,
            assignedDate: today,
          }
          return { records: [...state.records, record] }
        }),

      recordBoltUp: ({ fieldJointId, jointer, tagNo, reportNo }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existingIndex = state.records.findIndex((r) => r.fieldJointId === fieldJointId)
          if (existingIndex < 0) return state
          const existing = state.records[existingIndex]
          if (!existing.targetTorqueNm || !existing.boltingMethod || existing.boltedDate) {
            return state
          }
          const next = [...state.records]
          next[existingIndex] = {
            ...existing,
            boltedDate: today,
            jointer,
            tagNo,
            reportNo,
          }
          return { records: next }
        }),

      verifyTorque: ({ fieldJointId, verifiedBy, torqueTool, remark }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const existingIndex = state.records.findIndex((r) => r.fieldJointId === fieldJointId)
          if (existingIndex < 0) return state
          const existing = state.records[existingIndex]
          if (!existing.boltedDate || existing.verifiedDate) {
            return state
          }
          const next = [...state.records]
          next[existingIndex] = {
            ...existing,
            verifiedDate: today,
            verifiedBy,
            torqueTool,
            ...(remark ? { remark } : {}),
          }
          return { records: next }
        }),

      resetFlangeBoltProgress: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-flange-bolt",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
