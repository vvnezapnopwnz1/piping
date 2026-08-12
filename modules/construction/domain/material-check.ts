/** One line of the spool bill of materials, imported from `trace.txt` by Track 04. */
export interface BillLine {
  spoolRevisionMaterialId: string
  identCode: string
  description: string | null
  quantity: number | null
  unit: string | null
  expectedTraceNumber: string | null
}

/** One heat/trace transcribed from a returned QC-13. */
export interface TraceEntry {
  identCode: string
  traceNumber: string
  quantity: number | null
}

export interface MaterialCheckReconciliation {
  lineTotal: number
  checkedCount: number
  isComplete: boolean
  outstanding: BillLine[]
  unknownIdentCodes: string[]
}

export function normalizeTrace(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Dossier 16.4: Material Check is derived from valid traces, not entered as a date.
 * A line counts as checked as soon as one trace names its ident code — a single line may be
 * satisfied by several heats.
 */
export function reconcileMaterialCheck(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
): MaterialCheckReconciliation {
  const byIdentCode = new Map(lines.map((line) => [normalizeTrace(line.identCode), line]))
  const satisfied = new Set<string>()
  const unknown = new Set<string>()

  for (const entry of entries) {
    const identCode = normalizeTrace(entry.identCode)
    if (byIdentCode.has(identCode)) {
      satisfied.add(identCode)
    } else {
      unknown.add(entry.identCode.trim())
    }
  }

  const outstanding = lines.filter((line) => !satisfied.has(normalizeTrace(line.identCode)))

  return {
    lineTotal: lines.length,
    checkedCount: satisfied.size,
    isComplete: lines.length > 0 && outstanding.length === 0,
    outstanding,
    unknownIdentCodes: [...unknown],
  }
}
