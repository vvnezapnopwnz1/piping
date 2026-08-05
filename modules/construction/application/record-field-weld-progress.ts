import type { WeldProgressInput } from "../domain/weld-progress"
import type { Gate } from "./record-material-check"
import { describeWeldProgressGate } from "./record-weld-progress"

/**
 * The field counterpart of `describeWeldProgressGate`. `record_weld_progress` with phase
 * `erection` adds exactly two rules to the shared weld validation: it needs
 * `erection.progress.record`, and it refuses a spool that is not yet To Site (PQC54). Point
 * allocation, WPS range and welder qualification are identical to shop work — `071` pins that
 * parity — so they are not restated here.
 */
export function describeFieldWeldProgressGate(input: {
  weld: WeldProgressInput
  toSiteOn: string | null
  canRecord: boolean
}): Gate {
  if (!input.canRecord) {
    return {
      allowed: false,
      reason: "Recording a field weld needs the erection.progress.record capability.",
    }
  }
  if (!input.toSiteOn) {
    return { allowed: false, reason: "Record To Site before recording field welds." }
  }
  return describeWeldProgressGate(input.weld)
}
