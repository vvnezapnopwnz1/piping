import {
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

export type MaterialCheckItemPayload = {
  spool_revision_material_id: string
  piping_material_record_id: string
  ident_code: string
  trace_number: string
  quantity: number | null
}

export interface MaterialCheckPayload {
  target_spool_revision_id: string
  checked_on: string
  items: MaterialCheckItemPayload[]
  qc13_form_id: string | null
}

export function describeMaterialCheckGate(
  lines: readonly BillLine[],
  entries: readonly TraceEntry[],
  startFabOn: string | null,
  options?: { allowEmptyWhenAllAccepted?: boolean; acceptedLineIds?: readonly string[] },
): Gate {
  if (lines.length === 0) {
    return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  }
  if (!startFabOn) {
    return { allowed: false, reason: "Record Start Fab before recording material traces." }
  }
  if (entries.length === 0) {
    if (
      options?.allowEmptyWhenAllAccepted &&
      options.acceptedLineIds &&
      options.acceptedLineIds.length >= lines.length
    ) {
      return { allowed: true, reason: null }
    }
    return { allowed: false, reason: "Select at least one registered material trace." }
  }

  const reconciliation = reconcileMaterialCheck(lines, entries, options?.acceptedLineIds)
  if (reconciliation.invalidEntries.length > 0) {
    return {
      allowed: false,
      reason: reconciliation.invalidEntries[0].reason,
    }
  }

  return { allowed: true, reason: null }
}

export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload {
  return {
    target_spool_revision_id: draft.spoolRevisionId,
    checked_on: draft.checkedOn,
    items: draft.entries.map((entry) => ({
      spool_revision_material_id: entry.spoolRevisionMaterialId,
      piping_material_record_id: entry.pipingMaterialRecordId,
      ident_code: entry.identCode.trim(),
      trace_number: entry.traceNumber.trim(),
      quantity: entry.quantity,
    })),
    qc13_form_id: draft.qc13FormId,
  }
}
