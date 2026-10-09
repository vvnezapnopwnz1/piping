import type { ApplyGateReason } from "../application/apply-import"
import type { SpoolingTranslator } from "./spooling-translator"

export function describeApplyReason(t: SpoolingTranslator, reason: ApplyGateReason): string {
  switch (reason.code) {
    case "blockers":
    case "conflictsUnconfirmed":
      return t(`applyReason.${reason.code}`, { count: reason.count })
    default:
      return t(`applyReason.${reason.code}`)
  }
}
