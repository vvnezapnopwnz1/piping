import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"

export type ErectionOperationId = "to_site" | "material" | "erected" | "welded" | "supported" | "rft"

export interface ErectionOperation {
  id: ErectionOperationId
  /** The route that opens the workbench on this operation. */
  href: string
}

/**
 * A field spool's erection sequence. Four milestones are recorded (To Site, Erected,
 * Welded / Bolted, Supported); field material is evidence, not a milestone; Ready for Test is
 * derived from the rest and never set by hand.
 */
export const ERECTION_OPERATIONS: readonly ErectionOperation[] = [
  { id: "to_site", href: "/erection/to-site" },
  { id: "material", href: "/erection/material-check" },
  { id: "erected", href: "/erection/erected" },
  { id: "welded", href: "/erection/welded-bolted" },
  { id: "supported", href: "/erection/supported" },
  // The per-spool view of the readiness gate, opened in the drawer with `?op=rft`; the list
  // across spools stays at /erection/rft.
  { id: "rft", href: "/erection" },
]

const isOperation = (value: string | null): value is ErectionOperationId =>
  ERECTION_OPERATIONS.some((operation) => operation.id === value)

/**
 * Which step an address opens: `?op=` when the drawer switched steps on the page it is on,
 * otherwise the operation route. `/erection/weld-progress` is the Welded / Bolted screen.
 */
export function erectionOperationForPath(
  pathname: string,
  op: string | null,
  legacyStep: string | null = null,
): ErectionOperationId | null {
  if (isOperation(op)) return op
  if (isOperation(legacyStep)) return legacyStep
  if (pathname === "/erection/weld-progress") return "welded"
  if (pathname === "/erection") return null
  return ERECTION_OPERATIONS.find((operation) => operation.href === pathname)?.id ?? null
}

export interface ErectionStep {
  /** The step's line: `label` is the operation it belongs to (erection.line), `value` a date or "yes". */
  lines: { label: ErectionOperationId; value: string | null }[]
  state: "done" | "next" | "later"
}

const day = (value: string | null) => (value ? value.slice(0, 10) : null)

/** The milestone the spool needs next, in the order the readiness view evaluates them. */
export function nextErectionOperation(row: ErectionReadiness): ErectionOperationId {
  if (!row.toSiteOn) return "to_site"
  if (!row.erectedOn) return "erected"
  if (!row.weldedBoltedOn) return "welded"
  if (!row.supportedOn) return "supported"
  return "rft"
}

export function erectionStep(operation: ErectionOperationId, row: ErectionReadiness): ErectionStep {
  const next = nextErectionOperation(row)
  const milestone = (date: string | null, id: ErectionOperationId): ErectionStep["state"] =>
    date ? "done" : id === next ? "next" : "later"
  switch (operation) {
    case "to_site":
      return { lines: [{ label: "to_site", value: day(row.toSiteOn) }], state: milestone(row.toSiteOn, "to_site") }
    case "material":
      return {
        lines: [{ label: "material", value: day(row.materialCheckedOn) }],
        state:
          row.materialCheckedOn || (row.materialLineTotal > 0 && row.materialLineChecked >= row.materialLineTotal)
            ? "done"
            : "later",
      }
    case "erected":
      return { lines: [{ label: "erected", value: day(row.erectedOn) }], state: milestone(row.erectedOn, "erected") }
    case "welded":
      return {
        lines: [{ label: "welded", value: day(row.weldedBoltedOn) }],
        state: milestone(row.weldedBoltedOn, "welded"),
      }
    case "supported":
      return {
        lines: [{ label: "supported", value: day(row.supportedOn) }],
        state: milestone(row.supportedOn, "supported"),
      }
    case "rft":
      return {
        lines: [{ label: "rft", value: row.isRft ? (day(row.rftOn) ?? "yes") : null }],
        state: row.isRft ? "done" : next === "rft" ? "next" : "later",
      }
  }
}
