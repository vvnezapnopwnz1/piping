import type { StepId } from "../domain/pack-steps"

export interface LegacyTarget {
  pack: string | null
  step: StepId | null
}

const BY_OPERATION: Record<string, StepId> = {
  line_check: "line_check",
  item_clearance: "item_clearance",
  blinding: "blinding",
  testing: "testing",
  precommissioning: "precommissioning",
  y_reinstatement: "y_reinstatement",
  z_reinstatement: "z_reinstatement",
}
const BY_VIEW: Record<string, StepId> = { definition: "composition", composition: "composition", readiness: "readiness" }
const BY_PATH: readonly (readonly [string, StepId])[] = [
  ["/testpack/builder", "composition"],
  ["/testpack/pressure-test/line-check", "line_check"],
  ["/testpack/pressure-test/item-clearance", "item_clearance"],
  ["/testpack/pressure-test/blinding", "blinding"],
  ["/testpack/pressure-test/testing-precomm", "testing"],
  ["/testpack/pressure-test/reinstatement", "y_reinstatement"],
]

/**
 * What an old Test Packs address meant, in the new screen's terms. The old drawer's `operation` wins over its
 * `view`, which wins over the page the address pointed at; `view=workflow` means "wherever the pack is now".
 */
export function legacyAddressToTarget(pathname: string, search: URLSearchParams): LegacyTarget {
  const pack = search.get("testPackId") || null
  const operation = BY_OPERATION[search.get("operation") ?? ""]
  if (operation) return { pack, step: operation }
  const view = BY_VIEW[search.get("view") ?? ""]
  if (view) return { pack, step: view }
  const page = BY_PATH.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return { pack, step: page ? page[1] : null }
}
