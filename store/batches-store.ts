"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Batches store — NDE batch management state.
 *
 * A batch groups N welds for non-destructive examination by a single method
 * (RT, UT, MT, PT, PMI, HT). The batch flows through these states:
 *
 *   Created → Issued → In Progress → Results Received → (Rework | Closed)
 *
 * When results come back with rejected welds, those welds get marked for
 * rework in the welds-store (linked via jointNo / id). The "Rework" status
 * here means at least one weld in the batch needs to be re-examined.
 */

export type NDEMethod = "RT" | "UT" | "MT" | "PT" | "PMI" | "HT"

export type BatchStatus =
  | "Created"
  | "Issued"
  | "In Progress"
  | "Results Received"
  | "Rework"
  | "Closed"

export type WeldExamResult = "Pending" | "Accepted" | "Rejected"

export type ReworkCode =
  | "POR" // Porosity
  | "CRK" // Crack
  | "LOF" // Lack of Fusion
  | "SLG" // Slag Inclusion
  | "UNC" // Undercut
  | "INC" // Incomplete penetration
  | "OTH" // Other

export const REWORK_CODE_LABELS: Record<ReworkCode, string> = {
  POR: "Porosity",
  CRK: "Crack",
  LOF: "Lack of Fusion",
  SLG: "Slag Inclusion",
  UNC: "Undercut",
  INC: "Incomplete penetration",
  OTH: "Other",
}

/** A single weld inside a batch with its examination result. */
export interface BatchWeld {
  weldId: string // references WeldJoint.id
  jointNo: string
  spoolNo: string
  isoNo: string
  diaInch: string
  welderCode: string
  result: WeldExamResult
  reworkCode?: ReworkCode
  inspectorRemarks?: string
}

/** Batch state transition entry (for history tab). */
export interface BatchHistoryEntry {
  timestamp: string // ISO
  action: string // free text e.g. "Issued to Bureau Veritas"
  actor: string // user code e.g. "QC-ENG-01"
  fromStatus?: BatchStatus
  toStatus?: BatchStatus
}

export interface NDEBatch {
  id: string // e.g. BTH-2025-0156
  method: NDEMethod
  status: BatchStatus
  welds: BatchWeld[]
  subcontractor: string // e.g. "Bureau Veritas"
  inspector?: string // e.g. NDE-INS-04
  createdBy: string
  createdAt: string // ISO
  issuedAt?: string
  resultsReceivedAt?: string
  closedAt?: string
  ndeMatrixRef?: string // e.g. "NDE-M-CS-API5L-1G"
  notes?: string
  history: BatchHistoryEntry[]
}

interface BatchesState {
  batches: NDEBatch[]

  // Selectors
  getById: (id: string) => NDEBatch | undefined
  getByStatus: (status: BatchStatus) => NDEBatch[]
  getOverdueBatches: (daysThreshold?: number) => NDEBatch[]
  getReworkQueueWelds: () => BatchWeld[]

  // Mutations
  createBatch: (input: CreateBatchInput) => NDEBatch
  issueBatch: (id: string, subcontractor: string, inspector: string) => void
  receiveResults: (id: string, results: WeldResultInput[]) => void
  updateWeldResult: (
    batchId: string,
    weldId: string,
    result: WeldExamResult,
    reworkCode?: ReworkCode,
    remarks?: string
  ) => void
  markForRework: (id: string) => void
  closeBatch: (id: string) => void
  deleteBatch: (id: string) => void

  // Demo helpers
  resetDemo: () => void
  hydrateDemoScenario: () => void
  getNextBatchId: () => string
}

export interface CreateBatchInput {
  method: NDEMethod
  welds: Omit<BatchWeld, "result">[]
  subcontractor?: string
  createdBy?: string
  ndeMatrixRef?: string
  notes?: string
}

export interface WeldResultInput {
  weldId: string
  result: WeldExamResult
  reworkCode?: ReworkCode
  remarks?: string
}

// ---------------------------------------------------------------------------
// Initial demo data — realistic spread for a credible dashboard
// ---------------------------------------------------------------------------

const now = new Date()
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

export const INITIAL_BATCHES: NDEBatch[] = [
  // --- Closed batches (last 2 weeks, healthy acceptance) ----------------
  {
    id: "BTH-2025-0148",
    method: "RT",
    status: "Closed",
    subcontractor: "Bureau Veritas",
    inspector: "NDE-INS-04",
    createdBy: "QC-ENG-01",
    createdAt: daysAgo(14),
    issuedAt: daysAgo(13),
    resultsReceivedAt: daysAgo(10),
    closedAt: daysAgo(10),
    ndeMatrixRef: "NDE-M-CS-A106B",
    welds: [
      {
        weldId: "1",
        jointNo: "J-1024",
        spoolNo: "PL-TK100-001-A",
        isoNo: "ISO-TK100-P-001 R2",
        diaInch: '6"',
        welderCode: "WLD-042",
        result: "Accepted",
      },
      {
        weldId: "6",
        jointNo: "J-1029",
        spoolNo: "PL-TK100-002-A",
        isoNo: "ISO-TK100-P-002 R2",
        diaInch: '8"',
        welderCode: "WLD-007",
        result: "Accepted",
      },
      {
        weldId: "8",
        jointNo: "J-1031",
        spoolNo: "PL-CW200-005-A",
        isoNo: "ISO-CW200-P-005 R0",
        diaInch: '3"',
        welderCode: "WLD-028",
        result: "Accepted",
      },
      {
        weldId: "10",
        jointNo: "J-1033",
        spoolNo: "PL-TK100-003-A",
        isoNo: "ISO-TK100-P-003 R1",
        diaInch: '10"',
        welderCode: "WLD-007",
        result: "Accepted",
      },
    ],
    history: [
      {
        timestamp: daysAgo(14),
        action: "Batch created",
        actor: "QC-ENG-01",
        toStatus: "Created",
      },
      {
        timestamp: daysAgo(13),
        action: "Issued to Bureau Veritas",
        actor: "QC-ENG-01",
        fromStatus: "Created",
        toStatus: "Issued",
      },
      {
        timestamp: daysAgo(10),
        action: "Results received — all 4 welds Accepted",
        actor: "NDE-INS-04",
        fromStatus: "Issued",
        toStatus: "Results Received",
      },
      {
        timestamp: daysAgo(10),
        action: "Batch closed",
        actor: "QC-ENG-01",
        fromStatus: "Results Received",
        toStatus: "Closed",
      },
    ],
  },

  // --- Closed batch with one rejected weld (rework completed) -----------
  {
    id: "BTH-2025-0151",
    method: "RT",
    status: "Closed",
    subcontractor: "SGS Industrial",
    inspector: "NDE-INS-07",
    createdBy: "QC-ENG-02",
    createdAt: daysAgo(11),
    issuedAt: daysAgo(10),
    resultsReceivedAt: daysAgo(8),
    closedAt: daysAgo(6),
    ndeMatrixRef: "NDE-M-CS-A335-P91",
    welds: [
      {
        weldId: "2",
        jointNo: "J-1025",
        spoolNo: "PL-TK100-001-B",
        isoNo: "ISO-TK100-P-001 R2",
        diaInch: '6"',
        welderCode: "WLD-042",
        result: "Rejected",
        reworkCode: "POR",
        inspectorRemarks:
          "Porosity cluster at 3 o'clock position, root pass. Requires grinding and re-weld.",
      },
      {
        weldId: "13",
        jointNo: "J-1036",
        spoolNo: "PL-TK100-004-A",
        isoNo: "ISO-TK100-P-004 R2",
        diaInch: '16"',
        welderCode: "WLD-061",
        result: "Rejected",
        reworkCode: "SLG",
        inspectorRemarks:
          "Slag inclusion and incomplete fusion. Full cut-out required.",
      },
    ],
    history: [
      {
        timestamp: daysAgo(11),
        action: "Batch created",
        actor: "QC-ENG-02",
        toStatus: "Created",
      },
      {
        timestamp: daysAgo(10),
        action: "Issued to SGS Industrial",
        actor: "QC-ENG-02",
        toStatus: "Issued",
      },
      {
        timestamp: daysAgo(8),
        action: "Results received — 2 of 2 welds Rejected",
        actor: "NDE-INS-07",
        toStatus: "Results Received",
      },
      {
        timestamp: daysAgo(8),
        action: "Rework dispatched for J-1025 (POR), J-1036 (SLG)",
        actor: "QC-ENG-02",
        toStatus: "Rework",
      },
      {
        timestamp: daysAgo(6),
        action: "Re-examined and Accepted, batch closed",
        actor: "NDE-INS-07",
        toStatus: "Closed",
      },
    ],
  },

  // --- Results Received, waiting QC decision (1 rejected) ---------------
  {
    id: "BTH-2025-0156",
    method: "RT",
    status: "Results Received",
    subcontractor: "Bureau Veritas",
    inspector: "NDE-INS-04",
    createdBy: "QC-ENG-01",
    createdAt: daysAgo(5),
    issuedAt: daysAgo(4),
    resultsReceivedAt: daysAgo(1),
    ndeMatrixRef: "NDE-M-CS-A106B",
    welds: [
      {
        weldId: "5",
        jointNo: "J-1028",
        spoolNo: "PL-FU300-007-A",
        isoNo: "ISO-FU300-P-007 R0",
        diaInch: '4"',
        welderCode: "WLD-019",
        result: "Rejected",
        reworkCode: "UNC",
        inspectorRemarks:
          "Undercut on external bead, depth 1.2mm. Grinding and re-weld required.",
      },
    ],
    history: [
      {
        timestamp: daysAgo(5),
        action: "Batch created",
        actor: "QC-ENG-01",
        toStatus: "Created",
      },
      {
        timestamp: daysAgo(4),
        action: "Issued to Bureau Veritas",
        actor: "QC-ENG-01",
        toStatus: "Issued",
      },
      {
        timestamp: daysAgo(1),
        action: "Results received — 1 weld Rejected (UNC)",
        actor: "NDE-INS-04",
        toStatus: "Results Received",
      },
    ],
    notes: "Awaiting QC engineer disposition for rework dispatch.",
  },

  // --- In Progress (issued recently, no results yet) --------------------
  {
    id: "BTH-2025-0162",
    method: "UT",
    status: "In Progress",
    subcontractor: "TÜV Rheinland",
    inspector: "NDE-INS-09",
    createdBy: "QC-ENG-03",
    createdAt: daysAgo(3),
    issuedAt: daysAgo(2),
    ndeMatrixRef: "NDE-M-SS-316L",
    welds: [
      {
        weldId: "11",
        jointNo: "J-1034",
        spoolNo: "PL-CW200-006-A",
        isoNo: "ISO-CW200-P-006 R1",
        diaInch: '6"',
        welderCode: "WLD-033",
        result: "Pending",
      },
      {
        weldId: "14",
        jointNo: "J-1037",
        spoolNo: "PL-CW200-008-A",
        isoNo: "ISO-CW200-P-008 R0",
        diaInch: '3"',
        welderCode: "WLD-028",
        result: "Pending",
      },
    ],
    history: [
      {
        timestamp: daysAgo(3),
        action: "Batch created",
        actor: "QC-ENG-03",
        toStatus: "Created",
      },
      {
        timestamp: daysAgo(2),
        action: "Issued to TÜV Rheinland",
        actor: "QC-ENG-03",
        toStatus: "Issued",
      },
      {
        timestamp: daysAgo(1),
        action: "Inspection started on-site",
        actor: "NDE-INS-09",
        toStatus: "In Progress",
      },
    ],
  },

  // --- Issued, overdue (>5 days, no results — escalate!) ----------------
  {
    id: "BTH-2025-0153",
    method: "MT",
    status: "Issued",
    subcontractor: "SGS Industrial",
    inspector: "NDE-INS-11",
    createdBy: "QC-ENG-02",
    createdAt: daysAgo(8),
    issuedAt: daysAgo(7),
    ndeMatrixRef: "NDE-M-CS-A106B",
    welds: [
      {
        weldId: "3",
        jointNo: "J-1026",
        spoolNo: "PL-CW200-003-A",
        isoNo: "ISO-CW200-P-003 R1",
        diaInch: '12"',
        welderCode: "WLD-015",
        result: "Pending",
      },
      {
        weldId: "7",
        jointNo: "J-1030",
        spoolNo: "PL-TK100-002-B",
        isoNo: "ISO-TK100-P-002 R2",
        diaInch: '8"',
        welderCode: "WLD-007",
        result: "Pending",
      },
      {
        weldId: "12",
        jointNo: "J-1035",
        spoolNo: "PL-FU300-009-A",
        isoNo: "ISO-FU300-P-009 R0",
        diaInch: '2"',
        welderCode: "WLD-054",
        result: "Pending",
      },
    ],
    history: [
      {
        timestamp: daysAgo(8),
        action: "Batch created",
        actor: "QC-ENG-02",
        toStatus: "Created",
      },
      {
        timestamp: daysAgo(7),
        action: "Issued to SGS Industrial",
        actor: "QC-ENG-02",
        toStatus: "Issued",
      },
    ],
    notes: "OVERDUE — escalate to NDE coordinator.",
  },

  // --- Newly created, not yet issued -----------------------------------
  {
    id: "BTH-2025-0168",
    method: "RT",
    status: "Created",
    subcontractor: "Bureau Veritas",
    createdBy: "QC-ENG-01",
    createdAt: daysAgo(0),
    ndeMatrixRef: "NDE-M-CS-A335-P91",
    welds: [
      {
        weldId: "15",
        jointNo: "J-1038",
        spoolNo: "PL-FU300-011-A",
        isoNo: "ISO-FU300-P-011 R1",
        diaInch: '8"',
        welderCode: "WLD-007",
        result: "Pending",
      },
    ],
    history: [
      {
        timestamp: daysAgo(0),
        action: "Batch created from Weld Progress (J-1038)",
        actor: "QC-ENG-01",
        toStatus: "Created",
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBatchesStore = create<BatchesState>()(
  persist(
    (set, get) => ({
      batches: INITIAL_BATCHES,

      getById: (id) => get().batches.find((b) => b.id === id),
      getByStatus: (status) => get().batches.filter((b) => b.status === status),

      getOverdueBatches: (daysThreshold = 5) => {
        const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000
        return get().batches.filter(
          (b) =>
            (b.status === "Issued" || b.status === "In Progress") &&
            b.issuedAt &&
            new Date(b.issuedAt).getTime() < threshold
        )
      },

      getReworkQueueWelds: () => {
        const rework: BatchWeld[] = []
        for (const batch of get().batches) {
          if (batch.status === "Results Received" || batch.status === "Rework") {
            for (const weld of batch.welds) {
              if (weld.result === "Rejected") {
                rework.push(weld)
              }
            }
          }
        }
        return rework
      },

      getNextBatchId: () => {
        const existing = get().batches.map((b) => {
          const match = b.id.match(/BTH-(\d{4})-(\d{4})/)
          return match ? Number(match[2]) : 0
        })
        const maxSeq = existing.length > 0 ? Math.max(...existing) : 0
        const next = (maxSeq + 1).toString().padStart(4, "0")
        return `BTH-2025-${next}`
      },

      createBatch: (input) => {
        const id = get().getNextBatchId()
        const newBatch: NDEBatch = {
          id,
          method: input.method,
          status: "Created",
          subcontractor: input.subcontractor ?? "Bureau Veritas",
          createdBy: input.createdBy ?? "QC-ENG-01",
          createdAt: new Date().toISOString(),
          ndeMatrixRef: input.ndeMatrixRef,
          notes: input.notes,
          welds: input.welds.map((w) => ({ ...w, result: "Pending" as const })),
          history: [
            {
              timestamp: new Date().toISOString(),
              action: `Batch created with ${input.welds.length} weld${input.welds.length === 1 ? "" : "s"}`,
              actor: input.createdBy ?? "QC-ENG-01",
              toStatus: "Created",
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
                inspector,
                issuedAt: new Date().toISOString(),
                history: [
                  ...b.history,
                  {
                    timestamp: new Date().toISOString(),
                    action: `Issued to ${subcontractor}`,
                    actor: b.createdBy,
                    fromStatus: b.status,
                    toStatus: "Issued",
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
              const r = results.find((res) => res.weldId === w.weldId)
              return r
                ? {
                  ...w,
                  result: r.result,
                  reworkCode: r.reworkCode,
                  inspectorRemarks: r.remarks,
                }
                : w
            })
            const rejectedCount = updatedWelds.filter(
              (w) => w.result === "Rejected"
            ).length
            return {
              ...b,
              status: "Results Received" as BatchStatus,
              welds: updatedWelds,
              resultsReceivedAt: new Date().toISOString(),
              history: [
                ...b.history,
                {
                  timestamp: new Date().toISOString(),
                  action: `Results received — ${updatedWelds.length - rejectedCount} Accepted, ${rejectedCount} Rejected`,
                  actor: b.inspector ?? "NDE-INS",
                  fromStatus: b.status,
                  toStatus: "Results Received",
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
                  w.weldId === weldId
                    ? { ...w, result, reworkCode, inspectorRemarks: remarks }
                    : w
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
                    timestamp: new Date().toISOString(),
                    action: "Dispatched rejected welds for rework",
                    actor: b.createdBy,
                    fromStatus: b.status,
                    toStatus: "Rework",
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
                closedAt: new Date().toISOString(),
                history: [
                  ...b.history,
                  {
                    timestamp: new Date().toISOString(),
                    action: "Batch closed — all welds Accepted",
                    actor: b.createdBy,
                    fromStatus: b.status,
                    toStatus: "Closed",
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

      resetDemo: () => set({ batches: INITIAL_BATCHES }),
      hydrateDemoScenario: () => set({ batches: INITIAL_BATCHES }),
    }),
    {
      name: "pipeqc-batches",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)

// ---------------------------------------------------------------------------
// Selectors / KPI hooks
// ---------------------------------------------------------------------------

export interface BatchesKPIs {
  active: number
  awaitingResults: number
  overdue: number
  acceptanceRate: number
  reworkWelds: number
  reworkBatches: number
}

export const useBatchesKPIs = (): BatchesKPIs => {
  const batches = useBatchesStore((s) => s.batches)

  return useMemo(() => {
    const active = batches.filter(
      (b) => b.status !== "Closed" && b.status !== "Rework"
    ).length
    const awaitingResults = batches.filter(
      (b) => b.status === "Issued" || b.status === "In Progress"
    ).length

    const overdueThreshold = Date.now() - 5 * 24 * 60 * 60 * 1000
    const overdue = batches.filter(
      (b) =>
        (b.status === "Issued" || b.status === "In Progress") &&
        b.issuedAt &&
        new Date(b.issuedAt).getTime() < overdueThreshold
    ).length

    // Acceptance rate over closed batches in the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    let totalJudged = 0
    let totalAccepted = 0
    let reworkWelds = 0
    let reworkBatches = 0

    for (const batch of batches) {
      if (
        batch.status === "Closed" &&
        batch.closedAt &&
        new Date(batch.closedAt).getTime() > thirtyDaysAgo
      ) {
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
        let hadRework = false
        for (const w of batch.welds) {
          if (w.result === "Rejected") {
            reworkWelds++
            hadRework = true
          }
        }
        if (hadRework) reworkBatches++
      }
    }

    const acceptanceRate =
      totalJudged > 0 ? Number(((totalAccepted / totalJudged) * 100).toFixed(1)) : 0

    return {
      active,
      awaitingResults,
      overdue,
      acceptanceRate,
      reworkWelds,
      reworkBatches,
    }
  }, [batches])
}

export const useBatch = (id: string) =>
  useBatchesStore((s) => s.batches.find((b) => b.id === id))
