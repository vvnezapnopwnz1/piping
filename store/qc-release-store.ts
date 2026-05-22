"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  QC_CHECKLIST,
  QC_RELEASE_SEED,
  type QCChecklistEntry,
  type QCChecklistKey,
  type QCReleaseRecord,
} from "@/lib/spool-data"

interface QCReleaseState {
  records: QCReleaseRecord[]

  getRecord: (spoolNo: string) => QCReleaseRecord | undefined

  // Mutations
  upsertEntry: (spoolNo: string, key: QCChecklistKey, patch: Partial<QCChecklistEntry>) => void
  signOffQCRelease: (spoolNo: string, inspector: string) => void
  failQCRelease: (spoolNo: string, inspector: string, reason: string) => void
  resetQCRelease: () => void
}

const SEED = JSON.parse(JSON.stringify(QC_RELEASE_SEED)) as QCReleaseRecord[]

export const useQCReleaseStore = create<QCReleaseState>()(
  persist(
    (set, get) => ({
      records: SEED,

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      upsertEntry: (spoolNo, key, patch) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          if (existing) {
            const next = state.records.map((r) => {
              if (r.spoolNo !== spoolNo) return r
              const entries = r.entries.map((e) =>
                e.key === key ? { ...e, ...patch } : e
              )
              return { ...r, entries }
            })
            return { records: next }
          }
          // Auto-create record with Pending entries if missing
          const newRecord: QCReleaseRecord = {
            spoolNo,
            entries: QC_CHECKLIST.map((item) => ({
              key: item.key,
              status: "Pending",
            })),
          }
          const entries = newRecord.entries.map((e) =>
            e.key === key ? { ...e, ...patch } : e
          )
          return { records: [...state.records, { ...newRecord, entries }] }
        }),

      signOffQCRelease: (spoolNo, inspector) =>
        set((state) => {
          const next = state.records.map((r) => {
            if (r.spoolNo !== spoolNo) return r
            return {
              ...r,
              inspector,
              signedOffDate: new Date().toISOString().split("T")[0],
              failReason: undefined,
              failedAt: undefined,
            }
          })
          return { records: next }
        }),

      failQCRelease: (spoolNo, inspector, reason) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  inspector,
                  signedOffDate: undefined,
                  failReason: reason,
                  failedAt: new Date().toISOString(),
                }
              : r,
          ),
        })),

      resetQCRelease: () => set({ records: JSON.parse(JSON.stringify(QC_RELEASE_SEED)) }),
    }),
    {
      name: "pipeqc-qc-release",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { records?: QCReleaseRecord[] }
        if (version < 2 && state?.records) {
          state.records = state.records.map((rec) => ({
            ...rec,
            entries: rec.entries.map((e) =>
              (e.key as string) === "documentation"
                ? { ...e, key: "nde_complete" as QCChecklistKey }
                : e,
            ),
          }))
        }
        return persisted
      },
    }
  )
)
