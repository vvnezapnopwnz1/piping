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

/**
 * What the NDE matrix rule demands of a joint: a spot rate (10 %, 20 %) or
 * mandatory 100 % coverage. This is the population an obligation belongs to.
 *
 * It replaced `category_code`, which held S / SS / NR / H / HS / NDE100. Those
 * are not populations: per the Easy Piping manual (dossier section 19.6) they
 * are the *selection status of a joint inside a batch* - a candidate becomes
 * selected becomes released. jointStatusLabel below derives them.
 */
export type CoverageRegime = "spot" | "mandatory_100"

export const COVERAGE_REGIMES: { value: CoverageRegime; label: string }[] = [
  { value: "spot", label: "Spot rate (10 % / 20 %)" },
  { value: "mandatory_100", label: "Mandatory 100 %" },
]

/**
 * The manual's joint status, mirroring public.nde_joint_status_label. Derived
 * from disposition and cycle, never stored, so it cannot contradict them.
 */
export function jointStatusLabel(obligation: {
  disposition: ObligationDisposition
  cycleKind: CycleKind
  cycleOrdinal: number
  coverageRegime: CoverageRegime
}): string {
  const { disposition, cycleKind, cycleOrdinal, coverageRegime } = obligation
  if (cycleKind === "tracer") {
    return `T${cycleOrdinal}${disposition === "pending" ? "" : "S"}`
  }
  if (cycleKind === "repair") return `R${cycleOrdinal}`
  if (coverageRegime === "mandatory_100") return disposition === "pending" ? "H" : "HS"
  if (disposition === "satisfied") return "NR"
  if (disposition === "pending") return "S"
  return "SS"
}

export interface NdeObligation {
  id: string
  projectId: string
  weldJointRevisionId: string
  spoolRevisionId: string
  method: NdtMethod
  requiredCoverage: number
  selectionMode: string
  coverageRegime: CoverageRegime
  disposition: ObligationDisposition
  cycleKind: CycleKind
  cycleOrdinal: number
  parentObligationId: string | null
  responsibleWelderQualificationId: string | null
  /**
   * The joint and spool this obligation is about. Without them the table is a list of
   * indistinguishable rows: a repair, a tracer and an original all carry the same method
   * and coverage, and only the joint number says which weld an inspector is looking at.
   */
  weldNumber: string
  spoolNumber: string
  /**
   * The batch that allocated this obligation, or null while it is still unallocated. Without it
   * the Batches and Obligations tables sit side by side with nothing tying a row in one to a row
   * in the other.
   */
  batchNumber: string | null
}

export interface NdeBatch {
  id: string
  projectId: string
  batchNumber: string
  method: NdtMethod
  coverageRegime: CoverageRegime
  responsibleWelderQualificationId: string | null
  ndtSubcontractorId: string | null
  status: BatchStatus
  issuedOn: string | null
  returnedOn: string | null
  closedOn: string | null
  reportNumber: string | null
  createdAt: string
  /** Manual 19.10: set when the batch was escalated to 100 % control. */
  escalatedAt: string | null
  escalationReason: "four_rejections" | "second_level_tracer" | null
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
