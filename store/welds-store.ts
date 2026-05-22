"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { buildRnJointNo, buildRnWeldId } from "@/lib/nde-cascade"
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
  createR1Weld: (
    parent: WeldJoint,
    defectCode: string | undefined,
    defectLocation: string | undefined,
  ) => void
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

      createR1Weld: (parent, defectCode, defectLocation) =>
        set((state) => {
          const newJointNo = buildRnJointNo(parent.jointNo)
          const newId = buildRnWeldId(parent.id)
          if (state.welds.some((w) => w.id === newId)) return state
          const r1: WeldJoint = {
            ...parent,
            id: newId,
            jointNo: newJointNo,
            status: "Rework",
            rtResult: undefined,
            rtNo: undefined,
            isLocked: false,
            parentJointId: parent.id,
            ndeCategory: "NDE100",
            remarks: defectCode
              ? `R1 created from ${parent.jointNo}: ${defectCode}${defectLocation ? " @ " + defectLocation : ""}`
              : `R1 created from ${parent.jointNo}`,
          }
          return { welds: [...state.welds, r1] }
        }),

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
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2 && persisted && typeof persisted === "object" && "welds" in persisted) {
          const state = persisted as { welds: WeldJoint[] }
          state.welds = state.welds.map((w) => ({
            ...w,
            parentJointId: w.parentJointId,
            ndeCategory: w.ndeCategory,
          }))
        }
        return persisted
      },
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

// ---------------------------------------------------------------------------
// Spool readiness — rolls weld-level status up to spool-level for F↔E handoff
// ---------------------------------------------------------------------------

export type SpoolReadinessStatus =
  | "Ready for delivery"
  | "Blocked"
  | "In fabrication"
  | "Not started"

export interface SpoolReadiness {
  spoolNo: string
  total: number
  completed: number
  rejected: number
  rework: number
  inProgress: number
  notStarted: number
  status: SpoolReadinessStatus
  isoNo: string
}

export const useSpoolReadiness = (): SpoolReadiness[] => {
  const welds = useWeldsStore((s) => s.welds)
  return useMemo(() => {
    const map = new Map<string, WeldJoint[]>()
    for (const w of welds) {
      const list = map.get(w.spoolNo) ?? []
      list.push(w)
      map.set(w.spoolNo, list)
    }

    const rows: SpoolReadiness[] = []
    for (const [spoolNo, group] of map) {
      const c = group.filter((w) => w.status === "Completed").length
      const r = group.filter((w) => w.status === "Rejected").length
      const rw = group.filter((w) => w.status === "Rework").length
      const ip = group.filter((w) => w.status === "In Progress" || w.status === "On Hold").length
      const ns = group.filter((w) => w.status === "Not Started").length

      let status: SpoolReadinessStatus
      if (r > 0 || rw > 0) status = "Blocked"
      else if (c === group.length) status = "Ready for delivery"
      else if (ns === group.length) status = "Not started"
      else status = "In fabrication"

      rows.push({
        spoolNo,
        total: group.length,
        completed: c,
        rejected: r,
        rework: rw,
        inProgress: ip,
        notStarted: ns,
        status,
        isoNo: group[0]?.isoNo ?? "",
      })
    }

    const order: Record<SpoolReadinessStatus, number> = {
      "Ready for delivery": 0,
      "Blocked": 1,
      "In fabrication": 2,
      "Not started": 3,
    }
    return rows.sort((a, b) => order[a.status] - order[b.status] || a.spoolNo.localeCompare(b.spoolNo))
  }, [welds])
}
