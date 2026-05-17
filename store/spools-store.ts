"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  MATERIAL_CHECK_SEED,
  type MaterialCheckRecord,
  type HeatPiece,
} from "@/lib/spool-data"

interface SpoolsState {
  records: MaterialCheckRecord[]

  // Selectors
  getRecord: (spoolNo: string) => MaterialCheckRecord | undefined
  getPieces: (spoolNo: string) => HeatPiece[]

  // Mutations
  updatePiece: (spoolNo: string, pieceId: string, patch: Partial<HeatPiece>) => void
  flagNC: (spoolNo: string, pieceId: string, remark: string) => void
  clearPiece: (spoolNo: string, pieceId: string) => void
  signOffMaterialCheck: (spoolNo: string, inspector: string) => void
  resetSpools: () => void
}

const SEED = JSON.parse(JSON.stringify(MATERIAL_CHECK_SEED)) as MaterialCheckRecord[]

export const useSpoolsStore = create<SpoolsState>()(
  persist(
    (set, get) => ({
      records: SEED,

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),
      getPieces: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo)?.pieces ?? [],

      updatePiece: (spoolNo, pieceId, patch) =>
        set((state) => {
          const next = state.records.map((r) => {
            if (r.spoolNo !== spoolNo) return r
            const pieces = r.pieces.map((p) =>
              p.id === pieceId ? { ...p, ...patch } : p
            )
            const ncCount = pieces.filter((p) => p.status === "Non-conformance").length
            return { ...r, pieces, nonConformanceCount: ncCount }
          })
          return { records: next }
        }),

      flagNC: (spoolNo, pieceId, remark) =>
        set((state) => {
          const next = state.records.map((r) => {
            if (r.spoolNo !== spoolNo) return r
            const pieces = r.pieces.map((p) =>
              p.id === pieceId
                ? { ...p, status: "Non-conformance" as const, ncRemark: remark }
                : p
            )
            const ncCount = pieces.filter((p) => p.status === "Non-conformance").length
            return { ...r, pieces, nonConformanceCount: ncCount }
          })
          return { records: next }
        }),

      clearPiece: (spoolNo, pieceId) =>
        set((state) => {
          const next = state.records.map((r) => {
            if (r.spoolNo !== spoolNo) return r
            const pieces = r.pieces.map((p) =>
              p.id === pieceId ? { ...p, status: "Cleared" as const } : p
            )
            const ncCount = pieces.filter((p) => p.status === "Non-conformance").length
            return { ...r, pieces, nonConformanceCount: ncCount }
          })
          return { records: next }
        }),

      signOffMaterialCheck: (spoolNo, inspector) =>
        set((state) => {
          const next = state.records.map((r) => {
            if (r.spoolNo !== spoolNo) return r
            return {
              ...r,
              inspector,
              signedOffDate: new Date().toISOString().split("T")[0],
            }
          })
          return { records: next }
        }),

      resetSpools: () => set({ records: JSON.parse(JSON.stringify(MATERIAL_CHECK_SEED)) }),
    }),
    {
      name: "pipeqc-spools",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    }
  )
)
