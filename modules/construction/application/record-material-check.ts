import {
  normalizeTrace,
  reconcileMaterialCheck,
  type BillLine,
  type TraceEntry,
} from "../domain/material-check"

export interface MaterialCheckDraft {
  spoolRevisionId: string
  checkedOn: string
  qc13FormId: string | null
  entries: TraceEntry[]
}

export interface Gate {
  allowed: boolean
  reason: string | null
}

export interface MaterialCheckPayload {
  target_spool_revision_id: string
  checked_on: string
  items: { ident_code: string; trace_number: string; quantity: number | null }[]
  qc13_form_id: string | null
}

export function describeMaterialCheckGate(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
  startFabOn: string | null,
): Gate {
  if (lines.length === 0) {
    return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  }
  if (!startFabOn) {
    return { allowed: false, reason: "Record Start Fab before recording material traces." }
  }
  if (entries.length === 0) {
    return { allowed: false, reason: "Enter at least one material trace." }
  }

  const reconciliation = reconcileMaterialCheck(lines, entries)
  if (reconciliation.unknownIdentCodes.length > 0) {
    return {
      allowed: false,
      reason: `${reconciliation.unknownIdentCodes[0]} is not on this spool revision bill of materials.`,
    }
  }

  return { allowed: true, reason: null }
}

export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload {
  return {
    target_spool_revision_id: draft.spoolRevisionId,
    checked_on: draft.checkedOn,
    items: draft.entries.map((entry) => ({
      ident_code: normalizeTrace(entry.identCode),
      trace_number: normalizeTrace(entry.traceNumber),
      quantity: entry.quantity,
    })),
    qc13_form_id: draft.qc13FormId,
  }
}
