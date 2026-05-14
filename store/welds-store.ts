"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { WELD_DATA, type WeldJoint, type WeldStatus } from "@/lib/weld-data"

/**
 * Welds store — central source of truth for all weld joints.
 *
 * IMPORTANT: this is a demo store. It persists to localStorage so that
 * changes survive page reloads, but it's not a real backend. Use the
 * `resetDemo()` action before showing the prototype to a new audience.
 */

interface WeldsState {
  welds: WeldJoint[]

  // Selectors that components use for derived data
  getById: (id: string) => WeldJoint | undefined
  getByJointNo: (jointNo: string) => WeldJoint | undefined
  getBySpool: (spoolNo: string) => WeldJoint[]
  getByStatus: (status: WeldStatus) => WeldJoint[]

  // Mutations
  updateWeld: (id: string, updates: Partial<WeldJoint>) => void
  updateStatus: (id: string, status: WeldStatus) => void
  markForRework: (id: string, reason: string) => void
  markAccepted: (id: string, rtNo?: string) => void
  markRejected: (id: string, reason: string) => void
  lockWeld: (id: string) => void
  unlockWeld: (id: string) => void

  // Bulk operations (used when sending to NDE, receiving results, etc.)
  bulkUpdateStatus: (ids: string[], status: WeldStatus) => void

  // Demo-mode helpers
  resetDemo: () => void
  hydrateDemoScenario: () => void
}

export const useWeldsStore = create<WeldsState>()(
  persist(
    (set, get) => ({
      welds: WELD_DATA,

      getById: (id) => get().welds.find((w) => w.id === id),
      getByJointNo: (jointNo) => get().welds.find((w) => w.jointNo === jointNo),
      getBySpool: (spoolNo) => get().welds.filter((w) => w.spoolNo === spoolNo),
      getByStatus: (status) => get().welds.filter((w) => w.status === status),

      updateWeld: (id, updates) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id ? { ...w, status } : w
          ),
        })),

      markForRework: (id, reason) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id
              ? {
                ...w,
                status: "Rework",
                isLocked: false,
                remarks: reason,
              }
              : w
          ),
        })),

      markAccepted: (id, rtNo) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id
              ? {
                ...w,
                status: "Completed",
                rtResult: "Accepted",
                rtNo: rtNo ?? w.rtNo,
                isLocked: true,
              }
              : w
          ),
        })),

      markRejected: (id, reason) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id
              ? {
                ...w,
                status: "Rejected",
                rtResult: "Rejected",
                remarks: reason,
                isLocked: false,
              }
              : w
          ),
        })),

      lockWeld: (id) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id ? { ...w, isLocked: true } : w
          ),
        })),

      unlockWeld: (id) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            w.id === id ? { ...w, isLocked: false } : w
          ),
        })),

      bulkUpdateStatus: (ids, status) =>
        set((state) => ({
          welds: state.welds.map((w) =>
            ids.includes(w.id) ? { ...w, status } : w
          ),
        })),

      resetDemo: () => set({ welds: WELD_DATA }),

      hydrateDemoScenario: () => {
        // Resets to known initial state — exactly the same as WELD_DATA.
        // Kept as a separate method in case we want to enrich the demo
        // scenario later (e.g. inject extra "freshly added" welds).
        set({ welds: WELD_DATA })
      },
    }),
    {
      name: "pipeqc-welds",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)

// ---------------------------------------------------------------------------
// Convenience hooks — for cleaner usage in components
// ---------------------------------------------------------------------------

/** Get a specific weld by id. Returns undefined if not found. */
export const useWeld = (id: string) =>
  useWeldsStore((s) => s.welds.find((w) => w.id === id))

/** Get all welds with a particular status (memoized via Zustand selector). */
export const useWeldsByStatus = (status: WeldStatus) =>
  useWeldsStore((s) => s.welds.filter((w) => w.status === status))

/** KPI counts for dashboards — uses useMemo for stable reference.
 *  Hook to be used inside components.
 */
export const useWeldsKPIs = () => {
  const welds = useWeldsStore((s) => s.welds)

  return useMemo(() => {
    const total = welds.length
    const completed = welds.filter((w) => w.status === "Completed").length
    const rejected = welds.filter((w) => w.status === "Rejected").length
    const rework = welds.filter((w) => w.status === "Rework").length
    const inProgress = welds.filter((w) => w.status === "In Progress").length
    const onHold = welds.filter((w) => w.status === "On Hold").length
    const notStarted = welds.filter((w) => w.status === "Not Started").length

    const judged = completed + rejected
    const acceptanceRate = judged > 0 ? (completed / judged) * 100 : 0

    return {
      total,
      completed,
      rejected,
      rework,
      inProgress,
      onHold,
      notStarted,
      acceptanceRate: Number(acceptanceRate.toFixed(1)),
    }
  }, [welds])
}
