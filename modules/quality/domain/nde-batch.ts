// NDE batch domain types

// Every label of the public.ndt_method enum. "pmi" and "ht" were missing, so a
// PMI or heat-treatment batch could not be typed at all; nde-method-parity.test.ts
// pins this list against the generated types.
export const NDT_METHODS = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"] as const

export type NdtMethod = (typeof NDT_METHODS)[number]
export type BatchStatus = "draft" | "issued" | "returned" | "closed"
export type ObligationDisposition =
  | "pending"
  | "issued"
  | "satisfied"
  | "rejected"
  | "waived"
  | "superseded"
export type CycleKind = "original" | "repair" | "tracer"

export interface NdeObligation {
  id: string
  projectId: string
  weldJointRevisionId: string
  spoolRevisionId: string
  method: NdtMethod
  requiredCoverage: number
  selectionMode: string
  categoryCode: string
  disposition: ObligationDisposition
  cycleKind: CycleKind
  cycleOrdinal: number
  parentObligationId: string | null
  responsibleWelderQualificationId: string | null
}

export interface NdeBatch {
  id: string
  projectId: string
  batchNumber: string
  method: NdtMethod
  categoryCode: string
  responsibleWelderQualificationId: string | null
  ndtSubcontractorId: string | null
  status: BatchStatus
  issuedOn: string | null
  returnedOn: string | null
  closedOn: string | null
  reportNumber: string | null
  createdAt: string
}

export interface NdeBatchItem {
  id: string
  batchId: string
  obligationId: string
}

export interface NdeResult {
  id: string
  projectId: string
  obligationId: string
  batchItemId: string | null
  outcome: "accepted" | "rejected"
  examinedOn: string
  reportNumber: string | null
  defectReworkCodeId: string | null
  responsibleWelderQualificationId: string | null
  comment: string | null
}

export interface NdeKpis {
  totalBatches: number
  openBatches: number
  pendingObligations: number
  satisfiedObligations: number
}
