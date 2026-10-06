import type { BillLine, TraceEntry } from "../domain/material-check"

export interface MaterialCheckDraft { spoolRevisionId: string; checkedOn: string; qc13FormId: string | null; entries: TraceEntry[] }
export interface Gate { allowed: boolean; reason: string | null }
export type MaterialCheckItemPayload = { spool_revision_material_id: string; piping_material_record_id: string }
export interface MaterialCheckPayload { target_spool_revision_id: string; checked_on: string; items: MaterialCheckItemPayload[]; qc13_form_id: string | null }

/** Why Record is unavailable. Eligibility of a trace is the server's rule: the picker only offers eligible ones. */
export function describeMaterialCheckGate(lines: readonly BillLine[], entries: readonly TraceEntry[], startFabOn: string | null): Gate {
  if (lines.length === 0) return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  if (!startFabOn) return { allowed: false, reason: "Record Start Fab before recording material traces." }
  if (entries.length === 0) return { allowed: false, reason: "Select at least one registered material trace." }
  return { allowed: true, reason: null }
}

export function toMaterialCheckPayload(draft: MaterialCheckDraft): MaterialCheckPayload {
  return {
    target_spool_revision_id: draft.spoolRevisionId,
    checked_on: draft.checkedOn,
    items: draft.entries.map((entry) => ({
      spool_revision_material_id: entry.spoolRevisionMaterialId,
      piping_material_record_id: entry.pipingMaterialRecordId,
    })),
    qc13_form_id: draft.qc13FormId,
  }
}
