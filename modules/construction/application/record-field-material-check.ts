import type { BillLine, TraceEntry } from "../domain/material-check"
import type { FabricationGate } from "./record-material-check"

/**
 * Why Record is unavailable. It differs from the shop gate only in the To Site prerequisite and the capability.
 */
export function describeFieldMaterialCheckGate(input: {
  lines: readonly BillLine[]
  entries: readonly TraceEntry[]
  toSiteOn: string | null
  canRecord: boolean
}): FabricationGate {
  if (!input.canRecord) return { allowed: false, reason: { code: "no_access_field_material" } }
  if (input.lines.length === 0) return { allowed: false, reason: { code: "no_bom" } }
  if (!input.toSiteOn) return { allowed: false, reason: { code: "to_site_first_material" } }
  if (input.entries.length === 0) return { allowed: false, reason: { code: "no_trace" } }
  return { allowed: true, reason: null }
}
