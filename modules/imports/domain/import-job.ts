export const IMPORT_JOB_STATUSES = [
  "draft",
  "uploaded",
  "validating",
  "validated",
  "applying",
  "applied",
  "failed",
  "canceled",
] as const

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number]

const TERMINAL_STATUSES: ReadonlySet<ImportJobStatus> = new Set([
  "applied",
  "failed",
  "canceled",
])

const ALLOWED_TRANSITIONS: Record<ImportJobStatus, readonly ImportJobStatus[]> = {
  draft: ["uploaded", "canceled", "failed"],
  uploaded: ["validating", "validated", "canceled", "failed"],
  validating: ["validated", "failed", "canceled"],
  validated: ["validating", "applying", "canceled", "failed"],
  applying: ["applied", "failed"],
  applied: [],
  failed: [],
  canceled: [],
}

export interface ImportJob {
  id: string
  projectId: string
  importType: string
  status: ImportJobStatus
  sourceFileName: string | null
  sourceMediaType: string | null
  sourceSizeBytes: number | null
  sourceChecksum: string | null
  storagePath: string | null
  conflictsConfirmed: boolean
  appliedRowCount: number
  affectedEntityIds: string[]
  failureReason: string | null
  createdAt: string
  validatedAt: string | null
  appliedAt: string | null
  canceledAt: string | null
}

export function isTerminalStatus(status: ImportJobStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function canTransition(from: ImportJobStatus, to: ImportJobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export interface ApplyGate {
  status: ImportJobStatus
  blockerCount: number
  conflictCount: number
  conflictsConfirmed: boolean
}

export function canApply(gate: ApplyGate): boolean {
  if (gate.status !== "validated") return false
  if (gate.blockerCount > 0) return false
  if (gate.conflictCount > 0 && !gate.conflictsConfirmed) return false
  return true
}
