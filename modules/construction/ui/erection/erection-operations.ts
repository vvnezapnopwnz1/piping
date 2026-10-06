import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"

export type ErectionOperationId = "to_site" | "material" | "erected" | "welded" | "supported" | "rft"

export interface ErectionOperation {
  id: ErectionOperationId
  title: string
  /** The route that opens the workbench on this operation. */
  href: string
}

/**
 * A field spool's erection sequence. Four milestones are recorded (To Site, Erected,
 * Welded / Bolted, Supported); field material is evidence, not a milestone; Ready for Test is
 * derived from the rest and never set by hand.
 */
export const ERECTION_OPERATIONS: readonly ErectionOperation[] = [
  { id: "to_site", title: "To site", href: "/erection/to-site" },
  { id: "material", title: "Field material", href: "/erection/material-check" },
  { id: "erected", title: "Erected", href: "/erection/erected" },
  { id: "welded", title: "Welded / Bolted", href: "/erection/welded-bolted" },
  { id: "supported", title: "Supported", href: "/erection/supported" },
  // The per-spool view of the readiness gate, opened in the drawer with `?op=rft`; the list
  // across spools stays at /erection/rft.
  { id: "rft", title: "Ready for Test", href: "/erection" },
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
  /** What the step shows instead of a date when it has none. */
  lines: { label: string; value: string | null }[]
  state: "done" | "next" | "later"
}

const day = (value: string | null) => (value ? value.slice(0, 10) : null)
const ratio = (done: number, total: number) => (total ? `${done} of ${total}` : "none")

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
      return { lines: [{ label: "To Site", value: day(row.toSiteOn) }], state: milestone(row.toSiteOn, "to_site") }
    case "material":
      return {
        lines: [{ label: "Lines checked", value: ratio(row.materialLineChecked, row.materialLineTotal) }],
        state:
          row.materialLineTotal > 0 && row.materialLineChecked >= row.materialLineTotal ? "done" : "later",
      }
    case "erected":
      return { lines: [{ label: "Erected", value: day(row.erectedOn) }], state: milestone(row.erectedOn, "erected") }
    case "welded":
      return {
        lines: [
          { label: "Field welds", value: ratio(row.fieldWeldComplete, row.fieldWeldTotal) },
          { label: "Welded / Bolted", value: day(row.weldedBoltedOn) },
        ],
        state: milestone(row.weldedBoltedOn, "welded"),
      }
    case "supported":
      return {
        lines: [
          { label: "Field supports", value: ratio(row.fieldSupportRecorded, row.fieldSupportTotal) },
          { label: "Supported", value: day(row.supportedOn) },
        ],
        state: milestone(row.supportedOn, "supported"),
      }
    case "rft":
      return {
        lines: [{ label: "Ready for Test", value: row.isRft ? (day(row.rftOn) ?? "yes") : null }],
        state: row.isRft ? "done" : next === "rft" ? "next" : "later",
      }
  }
}
