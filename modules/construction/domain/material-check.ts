export interface BillLine {
  spoolRevisionMaterialId: string
  identCode: string
  description: string | null
  quantity: number | null
  unit: string | null
  expectedTraceNumber: string | null
}
/** A PML record chosen for one BOM row; the command needs only these two ids. */
export interface TraceEntry {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
}
/** One eligible PML record for a BOM row, from `material_trace_candidates`. */
export interface MaterialCandidate {
  id: string
  traceNumber: string
  mrrNumber: string
}
/** Evidence already recorded for a BOM row; labels are null when the PML row is not readable. */
export interface AcceptedMaterialEvidence {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  traceNumber: string | null
  mrrNumber: string | null
  status: "active" | "inactive" | "archived" | null
}
