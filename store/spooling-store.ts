"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface SpoolingImportRow {
  id: string
  isoNo: string
  rev: string
  pdsArea: string
  serviceClass: string
  weldType: string
  thickness: string
  ndeMatrix: string
  wps: string
}

export interface SpoolingValidationIssue {
  id: string
  rowId: string
  severity: "error" | "warning"
  rule:
    | "PDS Area exists"
    | "Service Class exists"
    | "Weld Type exists"
    | "Thickness exists"
    | "NDE Matrix exists"
    | "WPS exists"
    | "Pipeline consistency per ISO"
    | "Service class consistency per ISO"
    | "Revision conflict detected"
  message: string
}

export interface RevisionConflict {
  isoNo: string
  currentRevision: string
  incomingRevision: string
  changedWelds: number
  changedFlanges: number
  removedItems: number
  action: "accept" | "hold" | "reject"
}

interface SpoolingState {
  latestRows: SpoolingImportRow[]
  historyRows: SpoolingImportRow[]
  issues: SpoolingValidationIssue[]
  revisionConflicts: RevisionConflict[]
  lastImportedAt?: string

  loadDemoImport: () => void
  acceptCleanRows: () => void
  setRevisionAction: (isoNo: string, action: "accept" | "hold" | "reject") => void
  resetDemo: () => void
}

const seedRows: SpoolingImportRow[] = [
  { id: "IMP-001", isoNo: "ISO-1001", rev: "R3", pdsArea: "PR-01", serviceClass: "CW", weldType: "BW", thickness: "8", ndeMatrix: "NDE-MTX-001", wps: "WPS-001" },
  { id: "IMP-002", isoNo: "ISO-1002", rev: "R2", pdsArea: "CA-02", serviceClass: "CW", weldType: "BW", thickness: "10", ndeMatrix: "NDE-MTX-002", wps: "WPS-001" },
  { id: "IMP-003", isoNo: "ISO-1003", rev: "R1", pdsArea: "RA-01", serviceClass: "PG", weldType: "SW", thickness: "6", ndeMatrix: "", wps: "WPS-004" },
  { id: "IMP-004", isoNo: "ISO-1005", rev: "R4", pdsArea: "PR-01", serviceClass: "CW", weldType: "BW", thickness: "", ndeMatrix: "NDE-MTX-003", wps: "" },
]

const seedIssues: SpoolingValidationIssue[] = [
  { id: "ISS-001", rowId: "IMP-003", severity: "error", rule: "NDE Matrix exists", message: "No matching NDE Matrix row for service class + weld type." },
  { id: "ISS-002", rowId: "IMP-004", severity: "error", rule: "Thickness exists", message: "Thickness is required for weld definition." },
  { id: "ISS-003", rowId: "IMP-004", severity: "warning", rule: "WPS exists", message: "WPS reference missing; row can be held for engineering review." },
  { id: "ISS-004", rowId: "IMP-002", severity: "warning", rule: "Revision conflict detected", message: "Incoming revision differs from latest accepted revision." },
]

const seedConflicts: RevisionConflict[] = [
  { isoNo: "ISO-1002", currentRevision: "R1", incomingRevision: "R2", changedWelds: 3, changedFlanges: 1, removedItems: 1, action: "hold" },
]

export const useSpoolingStore = create<SpoolingState>()(
  persist(
    (set, get) => ({
      latestRows: [],
      historyRows: [],
      issues: [],
      revisionConflicts: [],

      loadDemoImport: () =>
        set({
          latestRows: seedRows,
          historyRows: get().latestRows.length > 0 ? [...get().latestRows, ...get().historyRows] : get().historyRows,
          issues: seedIssues,
          revisionConflicts: seedConflicts,
          lastImportedAt: new Date().toISOString(),
        }),

      acceptCleanRows: () =>
        set((state) => {
          const blocked = new Set(state.issues.filter((i) => i.severity === "error").map((i) => i.rowId))
          const accepted = state.latestRows.filter((r) => !blocked.has(r.id))
          return {
            latestRows: accepted,
            historyRows: [...state.historyRows, ...state.latestRows.filter((r) => blocked.has(r.id))],
          }
        }),

      setRevisionAction: (isoNo, action) =>
        set((state) => ({
          revisionConflicts: state.revisionConflicts.map((c) => (c.isoNo === isoNo ? { ...c, action } : c)),
        })),

      resetDemo: () =>
        set({
          latestRows: [],
          historyRows: [],
          issues: [],
          revisionConflicts: [],
          lastImportedAt: undefined,
        }),
    }),
    {
      name: "pipeqc-spooling-module",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
