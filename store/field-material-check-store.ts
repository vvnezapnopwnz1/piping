"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  FIELD_MC_SEED,
  type FieldHeatPiece,
  type FieldMaterialCheckRecord,
} from "@/lib/erection-stage"

interface FieldMaterialCheckState {
  records: FieldMaterialCheckRecord[]

  getRecord: (fieldJointId: string) => FieldMaterialCheckRecord | undefined
  getRecordsBySpool: (spoolNo: string) => FieldMaterialCheckRecord[]

  updatePiece: (
    spoolNo: string,
    fieldJointId: string,
    pieceId: string,
    patch: Partial<FieldHeatPiece>,
  ) => void

  signOffSpoolMC: (args: {
    spoolNo: string
    inspector: string
    wmcFormNo: string
    remark?: string
  }) => void

  resetFieldMC: () => void
}

const cloneSeed = () => JSON.parse(JSON.stringify(FIELD_MC_SEED)) as FieldMaterialCheckRecord[]

export const useFieldMaterialCheckStore = create<FieldMaterialCheckState>()(
  persist(
    (set, get) => ({
      records: cloneSeed(),

      getRecord: (fieldJointId) =>
        get().records.find((record) => record.fieldJointId === fieldJointId),

      getRecordsBySpool: (spoolNo) =>
        get().records.filter((record) => record.spoolNo === spoolNo),

      updatePiece: (spoolNo, fieldJointId, pieceId, patch) =>
        set((state) => {
          const next = state.records.map((record) => {
            if (record.fieldJointId !== fieldJointId || record.spoolNo !== spoolNo) {
              return record
            }
            const pieces = record.pieces.map((p) =>
              p.id === pieceId ? { ...p, ...patch } : p,
            )
            const ncCount = pieces.filter((p) => p.status === "Non-conformance").length
            return { ...record, pieces, nonConformanceCount: ncCount }
          })
          return { records: next }
        }),

      signOffSpoolMC: ({ spoolNo, inspector, wmcFormNo, remark }) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0]
          const next = state.records.map((record) => {
            if (record.spoolNo !== spoolNo) return record
            return {
              ...record,
              inspector,
              signedOffDate: today,
              wmcFormNo,
              ...(remark ? { remark } : {}),
            }
          })
          return { records: next }
        }),

      resetFieldMC: () => set({ records: cloneSeed() }),
    }),
    {
      name: "pipeqc-field-material-check",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    },
  ),
)
