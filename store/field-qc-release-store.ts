"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  QC_CHECKLIST,
  type QCChecklistEntry,
  type QCChecklistKey,
  type QCReleaseRecord,
} from "@/lib/spool-data"

interface FieldQCReleaseState {
  records: QCReleaseRecord[]
  getRecord: (spoolNo: string) => QCReleaseRecord | undefined
  upsertEntry: (
    spoolNo: string,
    key: QCChecklistKey,
    patch: Partial<QCChecklistEntry>,
  ) => void
  signOffFieldQCRelease: (spoolNo: string, inspector: string) => void
  failFieldQCRelease: (spoolNo: string, inspector: string, reason: string) => void
  resetField: () => void
}

export const useFieldQCReleaseStore = create<FieldQCReleaseState>()(
  persist(
    (set, get) => ({
      records: [],

      getRecord: (spoolNo) => get().records.find((r) => r.spoolNo === spoolNo),

      upsertEntry: (spoolNo, key, patch) =>
        set((state) => {
          const existing = state.records.find((r) => r.spoolNo === spoolNo)
          if (existing) {
            return {
              records: state.records.map((r) =>
                r.spoolNo === spoolNo
                  ? {
                      ...r,
                      entries: r.entries.map((e) =>
                        e.key === key ? { ...e, ...patch } : e,
                      ),
                    }
                  : r,
              ),
            }
          }
          const newRecord: QCReleaseRecord = {
            spoolNo,
            entries: QC_CHECKLIST.map((item) => ({
              key: item.key,
              status: "Pending",
            })),
          }
          return {
            records: [
              ...state.records,
              {
                ...newRecord,
                entries: newRecord.entries.map((e) =>
                  e.key === key ? { ...e, ...patch } : e,
                ),
              },
            ],
          }
        }),

      signOffFieldQCRelease: (spoolNo, inspector) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.spoolNo === spoolNo
              ? {
                  ...r,
                  inspector,
                  signedOffDate: new Date().toISOString().split("T")[0],
                  failReason: undefined,
                  failedAt: undefined,
                }
              : r,
          ),
        })),

      failFieldQCRelease: (spoolNo, inspector, reason) =>
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

      resetField: () => set({ records: [] }),
    }),
    {
      name: "pipeqc-field-qc-release-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
