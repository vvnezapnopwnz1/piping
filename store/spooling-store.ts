"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ISO lifecycle state machine
export type ISOStatus =
  | "Received"
  | "Checked Out"
  | "In Checking"
  | "Released"
  | "On Hold"
  | "Superseded"

export interface CheckingRound {
  round: number
  checkerName: string
  decision: "Approved" | "Rejected" | "Approved with remark"
  comment: string
  date: string
}

export interface HoldRecord {
  holdType: "Spool Team" | "Engineering"
  holderName: string
  reason: string
  appliedDate: string
  releasedDate?: string
  releaseReason?: string
}

export interface ISORecord {
  id: string
  transmittalId: string
  rev: string
  pdsArea: string
  serviceClass: string
  status: ISOStatus
  spooledBy?: string
  checkoutDate?: string
  checkInDate?: string
  totalRounds: number
  checkingRounds: CheckingRound[]
  holdHistory: HoldRecord[]
  activeHold?: HoldRecord
  releasedDate?: string
  notes?: string
}

export interface EngTransmittal {
  id: string
  sourceTeam: string
  receivedDate: string
  isoCount: number
  newCount: number
  revisionCount: number
  status: "Pending" | "Accepted" | "Partially Accepted"
  acceptedBy?: string
  acceptedDate?: string
  notes?: string
}

export interface SpoolingTransmittal {
  id: string
  generatedDate: string
  targetArea: string
  isoIds: string[]
  isoCount: number
  releasedBy: string
  status: "Draft" | "Sent"
  sentDate?: string
}

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
  engTransmittals: EngTransmittal[]
  isoRecords: ISORecord[]
  splTransmittals: SpoolingTransmittal[]

  loadDemoImport: () => void
  acceptCleanRows: () => void
  setRevisionAction: (isoNo: string, action: "accept" | "hold" | "reject") => void
  resetDemo: () => void
  acceptTransmittal: (transmittalId: string, acceptedBy: string) => void
  checkoutISO: (isoId: string, spooledBy: string) => void
  checkInISO: (isoId: string) => void
  approveISO: (isoId: string, checkerName: string, comment: string, withRemark?: boolean) => void
  rejectISO: (isoId: string, checkerName: string, comment: string) => void
  applyHold: (isoId: string, hold: Omit<HoldRecord, "appliedDate">) => void
  releaseHold: (isoId: string, releaseReason: string) => void
  composeAndSendTransmittal: (targetArea: string, isoIds: string[], releasedBy: string) => void
  applyRevision: (isoId: string, newRev: string, reason: string) => void
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

export const ENG_TRANSMITTAL_SEED: EngTransmittal[] = [
  {
    id: "T-2026-018",
    sourceTeam: "Engineering Unit-2",
    receivedDate: "2026-05-19",
    isoCount: 5,
    newCount: 3,
    revisionCount: 2,
    status: "Accepted",
    acceptedBy: "Sergey Lebedev",
    acceptedDate: "2026-05-19",
  },
  {
    id: "T-2026-021",
    sourceTeam: "Engineering Unit-3",
    receivedDate: "2026-05-22",
    isoCount: 3,
    newCount: 3,
    revisionCount: 0,
    status: "Pending",
  },
]

export const ISO_SEED: ISORecord[] = [
  {
    id: "ISO-PG-001", transmittalId: "T-2026-018", rev: "R0", pdsArea: "PR-01",
    serviceClass: "PG", status: "Released",
    spooledBy: "Masha Ivanova", checkoutDate: "2026-05-19",
    checkInDate: "2026-05-20", totalRounds: 2,
    checkingRounds: [
      { round: 1, checkerName: "Vlad Morozov", decision: "Rejected",
        comment: "SP-PG-001-D has only flange welds — merge into C", date: "2026-05-20" },
      { round: 2, checkerName: "Vlad Morozov", decision: "Approved",
        comment: "", date: "2026-05-21" },
    ],
    holdHistory: [], releasedDate: "2026-05-21",
  },
  {
    id: "ISO-PG-002", transmittalId: "T-2026-018", rev: "R0", pdsArea: "PR-01",
    serviceClass: "PG", status: "In Checking",
    spooledBy: "Dmitry Petrov", checkoutDate: "2026-05-20",
    checkInDate: "2026-05-21", totalRounds: 0,
    checkingRounds: [], holdHistory: [],
  },
  {
    id: "ISO-PG-003", transmittalId: "T-2026-018", rev: "R1", pdsArea: "CA-02",
    serviceClass: "CW", status: "Checked Out",
    spooledBy: "Anna Sokolova", checkoutDate: "2026-05-21",
    totalRounds: 0, checkingRounds: [], holdHistory: [],
  },
  {
    id: "ISO-PG-004", transmittalId: "T-2026-018", rev: "R0", pdsArea: "RA-01",
    serviceClass: "PG", status: "On Hold",
    totalRounds: 0, checkingRounds: [],
    holdHistory: [],
    activeHold: {
      holdType: "Engineering",
      holderName: "Mehmet Yildiz",
      reason: "R1 incoming — do not spool until new rev received",
      appliedDate: "2026-05-20",
    },
  },
  {
    id: "ISO-PG-005", transmittalId: "T-2026-018", rev: "R1", pdsArea: "PR-01",
    serviceClass: "CW", status: "Received",
    totalRounds: 0, checkingRounds: [], holdHistory: [],
  },
  {
    id: "ISO-CW-001", transmittalId: "T-2026-018", rev: "R0", pdsArea: "CA-02",
    serviceClass: "CW", status: "Released",
    spooledBy: "Masha Ivanova", checkoutDate: "2026-05-19",
    checkInDate: "2026-05-20", totalRounds: 1,
    checkingRounds: [
      { round: 1, checkerName: "Sergey Lebedev", decision: "Approved with remark",
        comment: "Spool size 8 welds (guideline 6-7), acceptable for FabShop Alpha", date: "2026-05-20" },
    ],
    holdHistory: [], releasedDate: "2026-05-20",
  },
]

export const SPL_TRANSMITTAL_SEED: SpoolingTransmittal[] = [
  {
    id: "SPL-TRANS-001",
    generatedDate: "2026-05-21",
    targetArea: "PR-01",
    isoIds: ["ISO-PG-001"],
    isoCount: 1,
    releasedBy: "Sergey Lebedev",
    status: "Sent",
    sentDate: "2026-05-21",
  },
]

export const useSpoolingStore = create<SpoolingState>()(
  persist(
    (set, get) => ({
      latestRows: [],
      historyRows: [],
      issues: [],
      revisionConflicts: [],
      engTransmittals: ENG_TRANSMITTAL_SEED,
      isoRecords: ISO_SEED,
      splTransmittals: SPL_TRANSMITTAL_SEED,

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
          engTransmittals: ENG_TRANSMITTAL_SEED,
          isoRecords: ISO_SEED,
          splTransmittals: SPL_TRANSMITTAL_SEED,
        }),

      acceptTransmittal: (transmittalId, acceptedBy) =>
        set((state) => ({
          engTransmittals: state.engTransmittals.map((t) =>
            t.id === transmittalId
              ? { ...t, status: "Accepted", acceptedBy, acceptedDate: new Date().toISOString().split("T")[0] }
              : t
          ),
          isoRecords: [
            ...state.isoRecords,
            ...(transmittalId === "T-2026-021"
              ? [
                  { id: "ISO-U3-001", transmittalId, rev: "R0", pdsArea: "RA-01", serviceClass: "PG",
                    status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
                  { id: "ISO-U3-002", transmittalId, rev: "R0", pdsArea: "PR-01", serviceClass: "CW",
                    status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
                  { id: "ISO-U3-003", transmittalId, rev: "R0", pdsArea: "CA-02", serviceClass: "PG",
                    status: "Received" as ISOStatus, totalRounds: 0, checkingRounds: [], holdHistory: [] },
                ]
              : []),
          ],
        })),

      checkoutISO: (isoId, spooledBy) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) =>
            iso.id === isoId
              ? { ...iso, status: "Checked Out", spooledBy, checkoutDate: new Date().toISOString().split("T")[0] }
              : iso
          ),
        })),

      checkInISO: (isoId) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) =>
            iso.id === isoId
              ? { ...iso, status: "In Checking", checkInDate: new Date().toISOString().split("T")[0] }
              : iso
          ),
        })),

      approveISO: (isoId, checkerName, comment, withRemark = false) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) => {
            if (iso.id !== isoId) return iso
            const round: CheckingRound = {
              round: iso.totalRounds + 1,
              checkerName,
              decision: withRemark ? "Approved with remark" : "Approved",
              comment,
              date: new Date().toISOString().split("T")[0],
            }
            return {
              ...iso,
              status: "Released",
              totalRounds: iso.totalRounds + 1,
              checkingRounds: [...iso.checkingRounds, round],
              releasedDate: new Date().toISOString().split("T")[0],
            }
          }),
        })),

      rejectISO: (isoId, checkerName, comment) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) => {
            if (iso.id !== isoId) return iso
            const round: CheckingRound = {
              round: iso.totalRounds + 1,
              checkerName,
              decision: "Rejected",
              comment,
              date: new Date().toISOString().split("T")[0],
            }
            return {
              ...iso,
              status: "Checked Out",
              totalRounds: iso.totalRounds + 1,
              checkingRounds: [...iso.checkingRounds, round],
              checkInDate: undefined,
            }
          }),
        })),

      applyHold: (isoId, hold) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) => {
            if (iso.id !== isoId) return iso
            const holdRecord: HoldRecord = { ...hold, appliedDate: new Date().toISOString().split("T")[0] }
            return {
              ...iso,
              status: "On Hold",
              activeHold: holdRecord,
              holdHistory: [...iso.holdHistory, holdRecord],
            }
          }),
        })),

      releaseHold: (isoId, releaseReason) =>
        set((state) => ({
          isoRecords: state.isoRecords.map((iso) => {
            if (iso.id !== isoId || !iso.activeHold) return iso
            const updated: HoldRecord = {
              ...iso.activeHold,
              releasedDate: new Date().toISOString().split("T")[0],
              releaseReason,
            }
            return {
              ...iso,
              status: "Received",
              activeHold: undefined,
              holdHistory: iso.holdHistory.map((h) =>
                h === iso.activeHold ? updated : h
              ),
            }
          }),
        })),

      composeAndSendTransmittal: (targetArea, isoIds, releasedBy) => {
        const newId = `SPL-TRANS-${String(get().splTransmittals.length + 1).padStart(3, "0")}`
        const today = new Date().toISOString().split("T")[0]
        const newTrans: SpoolingTransmittal = {
          id: newId, generatedDate: today, targetArea, isoIds,
          isoCount: isoIds.length, releasedBy, status: "Sent", sentDate: today,
        }
        set((state) => ({
          splTransmittals: [newTrans, ...state.splTransmittals],
          isoRecords: state.isoRecords.map((iso) =>
            isoIds.includes(iso.id) ? { ...iso, status: "Released" as ISOStatus } : iso
          ),
        }))
      },

      applyRevision: (isoId, newRev, reason) =>
        set((state) => {
          const existing = state.isoRecords.find((i) => i.id === isoId)
          if (!existing) return state
          const successorId = `${isoId}-${newRev}`
          return {
            isoRecords: [
              ...state.isoRecords.map((iso) =>
                iso.id === isoId ? { ...iso, status: "Superseded" as ISOStatus } : iso
              ),
              {
                id: successorId,
                transmittalId: existing.transmittalId,
                rev: newRev,
                pdsArea: existing.pdsArea,
                serviceClass: existing.serviceClass,
                status: "Received",
                totalRounds: 0,
                checkingRounds: [],
                holdHistory: [],
                notes: `Revision from ${existing.rev}: ${reason}`,
              } as ISORecord,
            ],
          }
        }),
    }),
    {
      name: "pipeqc-spooling-module",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          return {
            ...(persisted as object),
            engTransmittals: ENG_TRANSMITTAL_SEED,
            isoRecords: ISO_SEED,
            splTransmittals: SPL_TRANSMITTAL_SEED,
          }
        }
        return persisted as SpoolingState
      },
    }
  )
)
