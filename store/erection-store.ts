"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { FIELD_WELD_DATA, type FieldWeldJoint } from "@/lib/erection-weld-data"

/**
 * Erection store — central source of truth for all field weld joints.
 *
 * IMPORTANT: this is a demo store. It persists to localStorage so that
 * changes survive page reloads, but it's not a real backend. Use the
 * `resetErection()` action before showing the prototype to a new audience.
 */

interface ErectionState {
  fieldWelds: FieldWeldJoint[]

  // Selectors that components use for derived data
  getById: (id: string) => FieldWeldJoint | undefined
  getByErectionStatus: (status: FieldWeldJoint["erectionStatus"]) => FieldWeldJoint[]
  getBySpool: (spoolNo: string) => FieldWeldJoint[]
  getByAreaZone: (areaZone: string) => FieldWeldJoint[]

  // Mutations
  updateFieldWeld: (id: string, updates: Partial<FieldWeldJoint>) => void
  setErectionStatus: (id: string, status: FieldWeldJoint["erectionStatus"]) => void
  setRootPercent: (id: string, pct: number) => void
  setCapPercent: (id: string, pct: number) => void
  setForemanConfirmed: (id: string, confirmed: boolean) => void
  bulkUpdateErectionStatus: (ids: string[], status: FieldWeldJoint["erectionStatus"]) => void

  // Demo-mode helpers
  resetErection: () => void
}

const SEED = JSON.parse(JSON.stringify(FIELD_WELD_DATA)) as FieldWeldJoint[]

export const useErectionStore = create<ErectionState>()(
  persist(
    (set, get) => ({
      fieldWelds: SEED,

      getById: (id) => get().fieldWelds.find((w) => w.id === id),
      getByErectionStatus: (status) =>
        get().fieldWelds.filter((w) => w.erectionStatus === status),
      getBySpool: (spoolNo) =>
        get().fieldWelds.filter((w) => w.spoolNo === spoolNo),
      getByAreaZone: (areaZone) =>
        get().fieldWelds.filter((w) => w.areaZone === areaZone),

      updateFieldWeld: (id, updates) =>
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),

      setErectionStatus: (id, status) =>
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            w.id === id ? { ...w, erectionStatus: status } : w
          ),
        })),

      setRootPercent: (id, pct) => {
        const clamped = Math.min(100, Math.max(0, Math.round(pct)))
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            w.id === id ? { ...w, rootPercent: clamped } : w
          ),
        }))
      },

      setCapPercent: (id, pct) => {
        const clamped = Math.min(100, Math.max(0, Math.round(pct)))
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            w.id === id ? { ...w, capPercent: clamped } : w
          ),
        }))
      },

      setForemanConfirmed: (id, confirmed) =>
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            w.id === id ? { ...w, foremanConfirmed: confirmed } : w
          ),
        })),

      bulkUpdateErectionStatus: (ids, status) =>
        set((state) => ({
          fieldWelds: state.fieldWelds.map((w) =>
            ids.includes(w.id) ? { ...w, erectionStatus: status } : w
          ),
        })),

      resetErection: () => set({ fieldWelds: JSON.parse(JSON.stringify(FIELD_WELD_DATA)) }),
    }),
    {
      name: "pipeqc-erection",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => undefined,
    }
  )
)

// ---------------------------------------------------------------------------
// Convenience hooks — for cleaner usage in components
// ---------------------------------------------------------------------------

/** Get a specific field weld by id. Returns undefined if not found. */
export const useFieldWeld = (id: string) =>
  useErectionStore((s) => s.fieldWelds.find((w) => w.id === id))

/** Get all field welds with a particular erection status. */
export const useFieldWeldsByErectionStatus = (status: FieldWeldJoint["erectionStatus"]) =>
  useErectionStore((s) => s.fieldWelds.filter((w) => w.erectionStatus === status))

/** KPI counts for erection dashboards. */
export const useErectionKPIs = () => {
  const fieldWelds = useErectionStore((s) => s.fieldWelds)

  const total = fieldWelds.length
  const toSite = fieldWelds.filter((w) => w.erectionStatus === "To Site").length
  const erected = fieldWelds.filter((w) => w.erectionStatus === "Erected").length
  const welded = fieldWelds.filter((w) => w.erectionStatus === "Welded").length
  const bolted = fieldWelds.filter((w) => w.erectionStatus === "Bolted").length
  const supported = fieldWelds.filter((w) => w.erectionStatus === "Supported").length
  const rft = fieldWelds.filter((w) => w.erectionStatus === "RFT").length
  const notStarted = fieldWelds.filter((w) => w.erectionStatus === "Not Started").length
  const foremanConfirmedCount = fieldWelds.filter((w) => w.foremanConfirmed).length

  // average weld completion progress across non-terminal welds
  const inProgress = fieldWelds.filter(
    (w) => w.erectionStatus !== "RFT" && w.erectionStatus !== "Not Started"
  )
  const weldProgressPercent =
    inProgress.length === 0
      ? 0
      : Math.round(
          inProgress.reduce((sum, w) => sum + (w.rootPercent + w.capPercent) / 2, 0) /
            inProgress.length
        )

  return {
    total,
    toSite,
    erected,
    welded,
    bolted,
    supported,
    rft,
    notStarted,
    foremanConfirmedCount,
    weldProgressPercent,
  }
}
