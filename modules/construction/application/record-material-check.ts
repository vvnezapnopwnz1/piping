import type { BillLine, TraceEntry } from "../domain/material-check"
import type { ReleaseBlocker } from "../domain/quality-release"
import type { ValidationIssue } from "../domain/weld-progress"

export interface MaterialCheckDraft { spoolRevisionId: string; checkedOn: string; qc13FormId: string | null; entries: TraceEntry[] }
/** Whether a command may run now, and if not, why — as a code the interface puts into words. */
export type Gate<Reason> = { allowed: true; reason: null } | { allowed: false; reason: Reason }

/** Why a shop or field command is not available yet (fabrication.gate in the messages). */
export type FabricationGateReason =
  | { code: "no_bom" }
  | { code: "start_fab_first" }
  | { code: "no_trace" }
  | { code: "no_access_field_material" }
  | { code: "to_site_first_material" }
  | { code: "no_access_field_weld" }
  | { code: "to_site_first_weld" }
  | { code: "weld_issues"; issues: ValidationIssue[] }
  | { code: "release_blockers"; blockers: ReleaseBlocker[] }
  | { code: "sent_to_paint_first" }
  | { code: "dft_below"; measured: number; required: number }
  | { code: "w10p_required" }
  | { code: "select_joint_wps" }
  | { code: "select_line_service" }
  | { code: "select_field_joint_wps" }

export type FabricationGate = Gate<FabricationGateReason>
export type MaterialCheckItemPayload = { spool_revision_material_id: string; piping_material_record_id: string }
export interface MaterialCheckPayload { target_spool_revision_id: string; checked_on: string; items: MaterialCheckItemPayload[]; qc13_form_id: string | null }

/** Why Record is unavailable. Eligibility of a trace is the server's rule: the picker only offers eligible ones. */
export function describeMaterialCheckGate(lines: readonly BillLine[], entries: readonly TraceEntry[], startFabOn: string | null): FabricationGate {
  if (lines.length === 0) return { allowed: false, reason: { code: "no_bom" } }
  if (!startFabOn) return { allowed: false, reason: { code: "start_fab_first" } }
  if (entries.length === 0) return { allowed: false, reason: { code: "no_trace" } }
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
