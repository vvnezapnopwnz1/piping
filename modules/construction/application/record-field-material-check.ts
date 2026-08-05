import { reconcileMaterialCheck, type BillLine, type TraceEntry } from "../domain/material-check"
import type { Gate } from "./record-material-check"

/**
 * The field counterpart of `describeMaterialCheckGate`. It differs from the shop gate in one
 * rule only — `record_material_check` with phase `erection` requires To Site rather than
 * Start Fab (PQC54) — and in the capability it needs. The reconciliation itself is shared.
 */
export function describeFieldMaterialCheckGate(input: {
  lines: readonly BillLine[]
  entries: readonly TraceEntry[]
  toSiteOn: string | null
  canRecord: boolean
}): Gate {
  const { lines, entries, toSiteOn, canRecord } = input

  if (!canRecord) {
    return {
      allowed: false,
      reason: "Recording a field material check needs the erection.progress.record capability.",
    }
  }
  if (lines.length === 0) {
    return { allowed: false, reason: "This spool revision has no bill of materials to check." }
  }
  if (!toSiteOn) {
    return { allowed: false, reason: "Record To Site before checking field material." }
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
