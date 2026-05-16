"use client"

import { useEffect, useState } from "react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Batches store — NDE batch management state.
 *
 * Types match the NDE component (Nde*) for zero-friction integration.
 * Store is the source of truth for batches across the app:
 *   - NDE Batch Management screen reads from here
 *   - "Send to NDE" button in Weld Progress writes here
 *   - Home page notifications derive overdue / results-received from here
 */

// ============================================================================
// Types — synchronized with NDE component
// ============================================================================

export type NdeMethod = "RT" | "UT" | "MT" | "PT" | "PMI" | "HT"

export type NdeBatchStatus =
  | "Created"
  | "Issued"
  | "In Progress"
  | "Results Received"
  | "Closed"
  | "Rework"

export type NdeWeldResult = "Pending" | "Accepted" | "Rejected"

export type ReworkCode = string

export type NdeBatchSource = "shop" | "field"

export interface NdeBatchWeld {
  id: string
  jointNo: string
  spoolNo: string
  isoNo: string
  welder: string
  result: NdeWeldResult
  reworkCode?: ReworkCode
  inspector?: string
  date?: string
  remarks?: string
  dwirNo: string
  materialType: string
  diaInch: string
  wpsNo: string
  photos: string[]
}

export interface NdeBatchHistoryEvent {
  id: string
  title: string
  detail: string
  actor: string
  timestamp: string
  status: NdeBatchStatus
}

export interface NdeBatch {
  id: string
  batchNo: string
  method: NdeMethod
  status: NdeBatchStatus
  subcontractor: string
  matrixRef: string
  createdDate: string
  issuedDate?: string
  resultsReceivedDate?: string
  closedDate?: string
  isOverdue?: boolean
  source: NdeBatchSource
  welds: NdeBatchWeld[]
  history: NdeBatchHistoryEvent[]
}

// ============================================================================
// Store interface
// ============================================================================

export interface CreateBatchInput {
  method: NdeMethod
  welds: Omit<NdeBatchWeld, "result" | "photos">[]
  subcontractor?: string
  createdBy?: string
  matrixRef?: string
  source?: NdeBatchSource
}

export interface WeldResultInput {
  weldId: string
  result: NdeWeldResult
  reworkCode?: ReworkCode
  remarks?: string
  inspector?: string
}

interface BatchesState {
  batches: NdeBatch[]

  // Selectors
  getById: (id: string) => NdeBatch | undefined
  getByBatchNo: (batchNo: string) => NdeBatch | undefined
  getByStatus: (status: NdeBatchStatus) => NdeBatch[]
  getOverdueBatches: (daysThreshold?: number) => NdeBatch[]
  getReworkQueueWelds: () => NdeBatchWeld[]
  getNextBatchNo: () => string

  // Mutations
  createBatch: (input: CreateBatchInput) => NdeBatch
  issueBatch: (id: string, subcontractor: string, inspector?: string) => void
  receiveResults: (id: string, results: WeldResultInput[]) => void
  updateWeldResult: (
    batchId: string,
    weldId: string,
    result: NdeWeldResult,
    reworkCode?: ReworkCode,
    remarks?: string
  ) => void
  markForRework: (id: string) => void
  closeBatch: (id: string) => void
  deleteBatch: (id: string) => void

  // Demo helpers
  resetDemo: () => void
  hydrateDemoScenario: () => void
}

// ============================================================================
// Initial demo data
// ============================================================================

const now = new Date()
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

export const INITIAL_BATCHES: NdeBatch[] = [
  {
    id: "btch-148",
    batchNo: "BTH-2025-0148",
    method: "RT",
    status: "Closed",
    subcontractor: "Bureau Veritas",
    matrixRef: "NDE-M-CS-A106B",
    createdDate: daysAgo(14),
    issuedDate: daysAgo(13),
    resultsReceivedDate: daysAgo(10),
    closedDate: daysAgo(10),
    source: "shop",
    welds: [
      { id: "1", jointNo: "J-1024", spoolNo: "PL-TK100-001-A", isoNo: "ISO-TK100-P-001 R2", welder: "WLD-042", result: "Accepted", inspector: "NDE-INS-04", date: daysAgo(10), dwirNo: "DWIR-2025-0847", materialType: "CS A106B", diaInch: '6"', wpsNo: "GTAW-P1-1G", photos: [] },
      { id: "6", jointNo: "J-1029", spoolNo: "PL-TK100-002-A", isoNo: "ISO-TK100-P-002 R2", welder: "WLD-007", result: "Accepted", inspector: "NDE-INS-04", date: daysAgo(10), dwirNo: "DWIR-2025-0801", materialType: "CS A335 P91", diaInch: '8"', wpsNo: "GTAW-P91-1G", photos: [] },
      { id: "10", jointNo: "J-1033", spoolNo: "PL-TK100-003-A", isoNo: "ISO-TK100-P-003 R1", welder: "WLD-007", result: "Accepted", inspector: "NDE-INS-04", date: daysAgo(10), dwirNo: "DWIR-2025-0795", materialType: "CS A335 P91", diaInch: '10"', wpsNo: "GTAW-P91-1G", photos: [] },
    ],
    history: [
      { id: "h-148-1", title: "Batch created", detail: "3 welds bundled for RT examination", actor: "QC-ENG-01", timestamp: daysAgo(14), status: "Created" },
      { id: "h-148-2", title: "Issued to Bureau Veritas", detail: "Subcontractor notified, hard copy delivered", actor: "QC-ENG-01", timestamp: daysAgo(13), status: "Issued" },
      { id: "h-148-3", title: "Results received", detail: "All 3 welds accepted, no findings", actor: "NDE-INS-04", timestamp: daysAgo(10), status: "Results Received" },
      { id: "h-148-4", title: "Batch closed", detail: "QC sign-off, spools released for paint", actor: "QC-ENG-01", timestamp: daysAgo(10), status: "Closed" },
    ],
  },
  {
    id: "btch-151",
    batchNo: "BTH-2025-0151",
    method: "RT",
    status: "Closed",
    subcontractor: "SGS Industrial",
    matrixRef: "NDE-M-CS-A335-P91",
    createdDate: daysAgo(11),
    issuedDate: daysAgo(10),
    resultsReceivedDate: daysAgo(8),
    closedDate: daysAgo(6),
    source: "shop",
    welds: [
      { id: "2", jointNo: "J-1025", spoolNo: "PL-TK100-001-B", isoNo: "ISO-TK100-P-001 R2", welder: "WLD-042", result: "Rejected", reworkCode: "RW-001", inspector: "NDE-INS-07", date: daysAgo(8), remarks: "Porosity cluster at 3 o'clock position, root pass. Requires grinding and re-weld.", dwirNo: "DWIR-2025-0848", materialType: "CS A106B", diaInch: '6"', wpsNo: "GTAW-P1-1G", photos: [] },
      { id: "13", jointNo: "J-1036", spoolNo: "PL-TK100-004-A", isoNo: "ISO-TK100-P-004 R2", welder: "WLD-061", result: "Rejected", reworkCode: "RW-003", inspector: "NDE-INS-07", date: daysAgo(8), remarks: "Slag inclusion and incomplete fusion. Full cut-out required.", dwirNo: "DWIR-2025-0780", materialType: "CS A106B", diaInch: '16"', wpsNo: "SAW-P1-1G", photos: [] },
    ],
    history: [
      { id: "h-151-1", title: "Batch created", detail: "2 welds bundled for RT examination", actor: "QC-ENG-02", timestamp: daysAgo(11), status: "Created" },
      { id: "h-151-2", title: "Issued to SGS Industrial", detail: "Subcontractor notified", actor: "QC-ENG-02", timestamp: daysAgo(10), status: "Issued" },
      { id: "h-151-3", title: "Results received", detail: "2 of 2 welds Rejected — RW-001, RW-003", actor: "NDE-INS-07", timestamp: daysAgo(8), status: "Results Received" },
      { id: "h-151-4", title: "Rework dispatched", detail: "J-1025 (RW-001), J-1036 (RW-003) sent back to fabrication", actor: "QC-ENG-02", timestamp: daysAgo(8), status: "Rework" },
      { id: "h-151-5", title: "Re-examined and Accepted", detail: "Batch closed after successful rework", actor: "NDE-INS-07", timestamp: daysAgo(6), status: "Closed" },
    ],
  },
  {
    id: "btch-156",
    batchNo: "BTH-2025-0156",
    method: "RT",
    status: "Results Received",
    subcontractor: "Bureau Veritas",
    matrixRef: "NDE-M-CS-A106B",
    createdDate: daysAgo(5),
    issuedDate: daysAgo(4),
    resultsReceivedDate: daysAgo(1),
    source: "shop",
    welds: [
      { id: "5", jointNo: "J-1028", spoolNo: "PL-FU300-007-A", isoNo: "ISO-FU300-P-007 R0", welder: "WLD-019", result: "Rejected", reworkCode: "RW-004", inspector: "NDE-INS-04", date: daysAgo(1), remarks: "Undercut on external bead, depth 1.2mm. Grinding and re-weld required.", dwirNo: "DWIR-2025-0820", materialType: "CS A106B", diaInch: '4"', wpsNo: "SMAW-P1-2G", photos: [] },
    ],
    history: [
      { id: "h-156-1", title: "Batch created", detail: "1 weld bundled for RT examination", actor: "QC-ENG-01", timestamp: daysAgo(5), status: "Created" },
      { id: "h-156-2", title: "Issued to Bureau Veritas", detail: "Subcontractor notified", actor: "QC-ENG-01", timestamp: daysAgo(4), status: "Issued" },
      { id: "h-156-3", title: "Results received", detail: "1 weld Rejected (RW-004) — awaiting disposition", actor: "NDE-INS-04", timestamp: daysAgo(1), status: "Results Received" },
    ],
  },
  {
    id: "btch-162",
    batchNo: "BTH-2025-0162",
    method: "UT",
    status: "In Progress",
    subcontractor: "TÜV Rheinland",
    matrixRef: "NDE-M-SS-316L",
    createdDate: daysAgo(3),
    issuedDate: daysAgo(2),
    source: "shop",
    welds: [
      { id: "11", jointNo: "J-1034", spoolNo: "PL-CW200-006-A", isoNo: "ISO-CW200-P-006 R1", welder: "WLD-033", result: "Pending", inspector: "NDE-INS-09", dwirNo: "DWIR-2025-0843", materialType: "SS 316L", diaInch: '6"', wpsNo: "GTAW-P8-1G", photos: [] },
      { id: "14", jointNo: "J-1037", spoolNo: "PL-CW200-008-A", isoNo: "ISO-CW200-P-008 R0", welder: "WLD-028", result: "Pending", inspector: "NDE-INS-09", dwirNo: "DWIR-2025-0852", materialType: "SS 316L", diaInch: '3"', wpsNo: "GTAW-P8-5G", photos: [] },
    ],
    history: [
      { id: "h-162-1", title: "Batch created", detail: "2 welds bundled for UT examination", actor: "QC-ENG-03", timestamp: daysAgo(3), status: "Created" },
      { id: "h-162-2", title: "Issued to TÜV Rheinland", detail: "Subcontractor notified", actor: "QC-ENG-03", timestamp: daysAgo(2), status: "Issued" },
      { id: "h-162-3", title: "Inspection started on-site", detail: "Inspector NDE-INS-09 on shop floor", actor: "NDE-INS-09", timestamp: daysAgo(1), status: "In Progress" },
    ],
  },
  {
    id: "btch-153",
    batchNo: "BTH-2025-0153",
    method: "MT",
    status: "Issued",
    subcontractor: "SGS Industrial",
    matrixRef: "NDE-M-CS-A106B",
    createdDate: daysAgo(8),
    issuedDate: daysAgo(7),
    isOverdue: true,
    source: "shop",
    welds: [
      { id: "3", jointNo: "J-1026", spoolNo: "PL-CW200-003-A", isoNo: "ISO-CW200-P-003 R1", welder: "WLD-015", result: "Pending", inspector: "NDE-INS-11", dwirNo: "DWIR-2025-0831", materialType: "SS 316L", diaInch: '12"', wpsNo: "GTAW-P8-1G", photos: [] },
      { id: "7", jointNo: "J-1030", spoolNo: "PL-TK100-002-B", isoNo: "ISO-TK100-P-002 R2", welder: "WLD-007", result: "Pending", inspector: "NDE-INS-11", dwirNo: "DWIR-2025-0810", materialType: "CS A335 P91", diaInch: '8"', wpsNo: "GTAW-P91-1G", photos: [] },
      { id: "12", jointNo: "J-1035", spoolNo: "PL-FU300-009-A", isoNo: "ISO-FU300-P-009 R0", welder: "WLD-054", result: "Pending", inspector: "NDE-INS-11", dwirNo: "DWIR-2025-0851", materialType: "CS A106B", diaInch: '2"', wpsNo: "SMAW-P1-5G", photos: [] },
    ],
    history: [
      { id: "h-153-1", title: "Batch created", detail: "3 welds bundled for MT examination", actor: "QC-ENG-02", timestamp: daysAgo(8), status: "Created" },
      { id: "h-153-2", title: "Issued to SGS Industrial", detail: "Subcontractor notified — OVERDUE 7 days, escalation needed", actor: "QC-ENG-02", timestamp: daysAgo(7), status: "Issued" },
    ],
  },
  {
    id: "btch-168",
    batchNo: "BTH-2025-0168",
    method: "RT",
    status: "Created",
    subcontractor: "Bureau Veritas",
    matrixRef: "NDE-M-CS-A335-P91",
    createdDate: daysAgo(0),
    source: "shop",
    welds: [
      { id: "15", jointNo: "J-1038", spoolNo: "PL-FU300-011-A", isoNo: "ISO-FU300-P-011 R1", welder: "WLD-007", result: "Pending", dwirNo: "DWIR-2025-0836", materialType: "CS A335 P91", diaInch: '8"', wpsNo: "GTAW-P91-5G", photos: [] },
    ],
    history: [
      { id: "h-168-1", title: "Batch created from Weld Progress", detail: "J-1038 sent to NDE from QC Engineer panel", actor: "QC-ENG-01", timestamp: daysAgo(0), status: "Created" },
    ],
  },
]

// ============================================================================
// Store
// ============================================================================

let historyIdCounter = 1000
const nextHistoryId = () => {
  historyIdCounter++
  return `h-evt-${historyIdCounter}`
}

export const useBatchesStore = create<BatchesState>()(
  persist(
    (set, get) => ({
      batches: INITIAL_BATCHES,

      getById: (id) => get().batches.find((b) => b.id === id),
      getByBatchNo: (batchNo) => get().batches.find((b) => b.batchNo === batchNo),
      getByStatus: (status) => get().batches.filter((b) => b.status === status),

      getOverdueBatches: (daysThreshold = 5) => {
        const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000
        return get().batches.filter(
          (b) =>
            (b.status === "Issued" || b.status === "In Progress") &&
            b.issuedDate &&
            new Date(b.issuedDate).getTime() < threshold
        )
      },

      getReworkQueueWelds: () => {
        const rework: NdeBatchWeld[] = []
        for (const batch of get().batches) {
          if (batch.status === "Results Received" || batch.status === "Rework") {
            for (const weld of batch.welds) {
              if (weld.result === "Rejected") rework.push(weld)
            }
          }
        }
        return rework
      },

      getNextBatchNo: () => {
        const seqs = get().batches.map((b) => {
          const m = b.batchNo.match(/BTH-\d{4}-(\d{4})/)
          return m ? Number(m[1]) : 0
        })
        const maxSeq = seqs.length > 0 ? Math.max(...seqs) : 0
        const next = (maxSeq + 1).toString().padStart(4, "0")
        return `BTH-2025-${next}`
      },

      createBatch: (input) => {
        const batchNo = get().getNextBatchNo()
        const id = `btch-${batchNo.split("-")[2]}`
        const timestamp = new Date().toISOString()

        const newBatch: NdeBatch = {
          id,
          batchNo,
          method: input.method,
          status: "Created",
          subcontractor: input.subcontractor ?? "Bureau Veritas",
          matrixRef: input.matrixRef ?? "NDE-M-DEFAULT",
          createdDate: timestamp,
          source: input.source ?? "shop",
          welds: input.welds.map((w) => ({
            ...w,
            result: "Pending" as NdeWeldResult,
            photos: [],
          })),
          history: [
            {
              id: nextHistoryId(),
              title: "Batch created",
              detail: `${input.welds.length} weld${input.welds.length === 1 ? "" : "s"} bundled for ${input.method} examination`,
              actor: input.createdBy ?? "QC-ENG-01",
              timestamp,
              status: "Created",
            },
          ],
        }

        set((state) => ({ batches: [newBatch, ...state.batches] }))
        return newBatch
      },

      issueBatch: (id, subcontractor, inspector) =>
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id
              ? {
                ...b,
                status: "Issued",
                subcontractor,
                issuedDate: new Date().toISOString(),
                welds: inspector ? b.welds.map((w) => ({ ...w, inspector })) : b.welds,
                history: [
                  ...b.history,
                  {
                    id: nextHistoryId(),
                    title: `Issued to ${subcontractor}`,
                    detail: inspector ? `Assigned inspector ${inspector}` : "Subcontractor notified",
                    actor: "QC-ENG-01",
                    timestamp: new Date().toISOString(),
                    status: "Issued",
                  },
                ],
              }
              : b
          ),
        })),

      receiveResults: (id, results) =>
        set((state) => ({
          batches: state.batches.map((b) => {
            if (b.id !== id) return b
            const updatedWelds = b.welds.map((w) => {
              const r = results.find((res) => res.weldId === w.id)
              return r
                ? {
                  ...w,
                  result: r.result,
                  reworkCode: r.reworkCode,
                  remarks: r.remarks,
                  inspector: r.inspector ?? w.inspector,
                  date: new Date().toISOString(),
                }
                : w
            })
            const rejected = updatedWelds.filter((w) => w.result === "Rejected").length
            const accepted = updatedWelds.filter((w) => w.result === "Accepted").length
            return {
              ...b,
              status: "Results Received" as NdeBatchStatus,
              welds: updatedWelds,
              resultsReceivedDate: new Date().toISOString(),
              history: [
                ...b.history,
                {
                  id: nextHistoryId(),
                  title: "Results received",
                  detail: `${accepted} Accepted, ${rejected} Rejected`,
                  actor: results[0]?.inspector ?? "NDE-INS",
                  timestamp: new Date().toISOString(),
                  status: "Results Received",
                },
              ],
            }
          }),
        })),

      updateWeldResult: (batchId, weldId, result, reworkCode, remarks) =>
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === batchId
              ? {
                ...b,
                welds: b.welds.map((w) =>
                  w.id === weldId ? { ...w, result, reworkCode, remarks } : w
                ),
              }
              : b
          ),
        })),

      markForRework: (id) =>
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id
              ? {
                ...b,
                status: "Rework",
                history: [
                  ...b.history,
                  {
                    id: nextHistoryId(),
                    title: "Rework dispatched",
                    detail: "Rejected welds returned to fabrication queue",
                    actor: "QC-ENG-01",
                    timestamp: new Date().toISOString(),
                    status: "Rework",
                  },
                ],
              }
              : b
          ),
        })),

      closeBatch: (id) =>
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id
              ? {
                ...b,
                status: "Closed",
                closedDate: new Date().toISOString(),
                history: [
                  ...b.history,
                  {
                    id: nextHistoryId(),
                    title: "Batch closed",
                    detail: "QC sign-off, all welds accepted",
                    actor: "QC-ENG-01",
                    timestamp: new Date().toISOString(),
                    status: "Closed",
                  },
                ],
              }
              : b
          ),
        })),

      deleteBatch: (id) =>
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        })),

      resetDemo: () => {
        historyIdCounter = 1000
        set({ batches: INITIAL_BATCHES })
      },
      hydrateDemoScenario: () => {
        historyIdCounter = 1000
        set({ batches: INITIAL_BATCHES })
      },
    }),
    {
      name: "pipeqc-batches",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      skipHydration: true,
    }
  )
)

// ============================================================================
// Selector hooks
// ============================================================================

export const useHydrateBatchesStore = () => {
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    useBatchesStore.persist.rehydrate()
    setHasHydrated(true)
  }, [])

  return hasHydrated
}

export const useBatchesKPIs = () => {
  const batches = useBatchesStore((s) => s.batches)

  const s = useBatchesStore.getState()
  const active = s.batches.filter((b) => b.status !== "Closed" && b.status !== "Rework").length
  const awaitingResults = s.batches.filter((b) => b.status === "Issued" || b.status === "In Progress").length

  // Skip time-sensitive calculations during SSR to prevent hydration mismatches
  if (typeof window === "undefined") {
    return {
      active,
      awaitingResults,
      overdue: 0,
      acceptanceRate: 0,
      reworkWelds: 0,
      reworkBatches: 0,
    }
  }

  const overdueThreshold = Date.now() - 5 * 24 * 60 * 60 * 1000
  const overdue = s.batches.filter(
    (b) =>
      (b.status === "Issued" || b.status === "In Progress") &&
      b.issuedDate &&
      new Date(b.issuedDate).getTime() < overdueThreshold
  ).length

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  let totalJudged = 0
  let totalAccepted = 0
  let reworkWelds = 0
  const reworkBatchIds = new Set<string>()

  for (const batch of s.batches) {
    if (batch.status === "Closed" && batch.closedDate && new Date(batch.closedDate).getTime() > thirtyDaysAgo) {
      for (const w of batch.welds) {
        if (w.result === "Accepted") {
          totalJudged++
          totalAccepted++
        } else if (w.result === "Rejected") {
          totalJudged++
        }
      }
    }
    if (batch.status === "Results Received" || batch.status === "Rework") {
      for (const w of batch.welds) {
        if (w.result === "Rejected") {
          reworkWelds++
          reworkBatchIds.add(batch.id)
        }
      }
    }
  }

  const acceptanceRate = totalJudged > 0 ? Number(((totalAccepted / totalJudged) * 100).toFixed(1)) : 0

  return {
    active,
    awaitingResults,
    overdue,
    acceptanceRate,
    reworkWelds,
    reworkBatches: reworkBatchIds.size,
  }
}

export const useBatch = (id: string) =>
  useBatchesStore((s) => s.batches.find((b) => b.id === id))

export const useBatchByNo = (batchNo: string) =>
  useBatchesStore((s) => s.batches.find((b) => b.batchNo === batchNo))

export const useBatches = () => useBatchesStore((s) => s.batches)

export const useBatchesByStatus = (status: NdeBatchStatus) =>
  useBatchesStore((s) => s.batches.filter((b) => b.status === status))

export const useBatchesBySubcontractor = (subcontractor: string) =>
  useBatchesStore((s) => s.batches.filter((b) => b.subcontractor === subcontractor))

export const useBatchesByInspector = (inspector: string) =>
  useBatchesStore((s) => s.batches.filter((b) => b.welds.some((w) => w.inspector === inspector)))
