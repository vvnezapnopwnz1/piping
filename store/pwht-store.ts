"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface PwhtReleaseRecord {
  weldId: string
  spoolNo: string
  source: "shop" | "field"
  pwhtDate: string
  labRef: string
  releasedBy: string
  releasedAt: string
}

interface PwhtState {
  releases: PwhtReleaseRecord[]
  releasePwht: (record: Omit<PwhtReleaseRecord, "releasedAt">) => void
  getRelease: (weldId: string) => PwhtReleaseRecord | undefined
  resetDemo: () => void
}

export const usePwhtStore = create<PwhtState>()(
  persist(
    (set, get) => ({
      releases: [],
      releasePwht: (record) =>
        set((state) => ({
          releases: [
            ...state.releases.filter((r) => r.weldId !== record.weldId),
            { ...record, releasedAt: new Date().toISOString() },
          ],
        })),
      getRelease: (weldId) => get().releases.find((r) => r.weldId === weldId),
      resetDemo: () => set({ releases: [] }),
    }),
    {
      name: "pipeqc-pwht-v1",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { releases?: PwhtReleaseRecord[] }
        if (version < 2 && state?.releases) {
          state.releases = state.releases.map((r) => ({
            ...r,
            source: r.source ?? "shop",
          }))
        }
        return persisted
      },
    },
  ),
)
