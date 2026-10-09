import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import type { RevisionApplyReason } from "../application/resolve-revision"

export function describeRevisionReason(t: SpoolingTranslator, reason: RevisionApplyReason): string {
  switch (reason.code) {
    case "blockers":
    case "unresolved":
      return t(`revision.reason.${reason.code}`, { count: reason.count })
    default:
      return t(`revision.reason.${reason.code}`)
  }
}
