/** One line of the spool bill of materials, imported from `trace.txt` by Track 04. */
export interface BillLine {
  spoolRevisionMaterialId: string
  identCode: string
  description: string | null
  quantity: number | null
  unit: string | null
  expectedTraceNumber: string | null
}

/** One heat/trace transcribed from a returned QC-13 and selected from registered PML. */
export interface TraceEntry {
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  identCode: string
  traceNumber: string
  quantity: number | null
}

export interface MaterialCandidate {
  id: string
  identCode: string
  traceNumber: string
  mrrNumber: string
  status: "active"
}

export interface AcceptedMaterialEvidence {
  materialCheckItemId: string
  spoolRevisionMaterialId: string
  pipingMaterialRecordId: string
  traceNumber: string | null
  mrrNumber: string | null
  status: "active" | "inactive" | "archived" | null
  quantity: number | null
}

export interface MaterialCheckReconciliation {
  lineTotal: number
  checkedCount: number
  isComplete: boolean
  outstanding: BillLine[]
  invalidEntries: { spoolRevisionMaterialId: string; reason: string }[]
}

export function reconcileMaterialCheck(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
  acceptedLineIds: readonly string[] = [],
): MaterialCheckReconciliation {
  const byId = new Map(lines.map((line) => [line.spoolRevisionMaterialId, line]))
  const satisfied = new Set(acceptedLineIds.filter((id) => byId.has(id)))
  const submitted = new Set<string>()
  const invalidEntries: MaterialCheckReconciliation["invalidEntries"] = []

  for (const entry of entries) {
    const id = entry.spoolRevisionMaterialId
    const line = byId.get(id)
    let reason: string | null = null
    if (!line) {
      reason = "The material row is not in this spool revision BOM."
    } else if (submitted.has(id)) {
      reason = "Select one trace per BOM row."
    } else if (!entry.pipingMaterialRecordId || !entry.traceNumber.trim()) {
      reason = "Select a registered PML trace."
    } else if (entry.identCode.trim() !== line.identCode) {
      reason = "The selected trace belongs to a different Ident code."
    } else if (
      line.expectedTraceNumber !== null &&
      entry.traceNumber.trim() !== line.expectedTraceNumber
    ) {
      reason = "The selected trace does not match the BOM trace."
    } else if (
      entry.quantity !== null &&
      (!Number.isFinite(entry.quantity) || entry.quantity < 0)
    ) {
      reason = "Material quantity must be a non-negative finite number."
    }

    submitted.add(id)
    if (reason) {
      invalidEntries.push({ spoolRevisionMaterialId: id, reason })
    } else {
      satisfied.add(id)
    }
  }

  const outstanding = lines.filter((line) => !satisfied.has(line.spoolRevisionMaterialId))

  return {
    lineTotal: lines.length,
    checkedCount: satisfied.size,
    isComplete: lines.length > 0 && outstanding.length === 0 && invalidEntries.length === 0,
    outstanding,
    invalidEntries,
  }
}
