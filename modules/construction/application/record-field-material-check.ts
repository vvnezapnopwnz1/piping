import type { BillLine, TraceEntry } from "../domain/material-check"
import type { Gate } from "./record-material-check"

/**
 * Why Record is unavailable. It differs from the shop gate only in the To Site prerequisite and the capability.
 */
export function describeFieldMaterialCheckGate(input: {
  lines: readonly BillLine[]
  entries: readonly TraceEntry[]
  toSiteOn: string | null
  canRecord: boolean
}): Gate {
  if (!input.canRecord) return { allowed: false, reason: "Recording a field material check needs the erection.progress.record capability." }
  if (input.lines.length === 0) return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  if (!input.toSiteOn) return { allowed: false, reason: "Record To Site before checking field material." }
  if (input.entries.length === 0) return { allowed: false, reason: "Select at least one registered material trace." }
  return { allowed: true, reason: null }
}
