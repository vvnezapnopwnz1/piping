import { jointStatusLabel, type NdeObligation } from "./nde-batch"

export type JointState = "waiting_batch" | "in_batch" | "waiting_result" | "done"

/** Where a joint stands in the work, in the words the NDE screens group by. */
export function jointState(obligation: Pick<NdeObligation, "disposition" | "batchNumber">): JointState {
  if (obligation.disposition === "issued") return "waiting_result"
  if (obligation.disposition === "pending") return obligation.batchNumber ? "in_batch" : "waiting_batch"
  return "done"
}

export const NDE_TABS = ["joints", "waiting_result", "waiting_batch", "closed", "summary"] as const
export type NdeTab = (typeof NDE_TABS)[number]

export function ndeTab(value: string | null): NdeTab {
  return NDE_TABS.find((tab) => tab === value) ?? "joints"
}

/** The manual's joint status code as a message key (the words live in the nde message files), with the cycle number if any. */
export function jointStatusMessage(obligation: Parameters<typeof jointStatusLabel>[0]): { key: string; values?: { n: string } } {
  const code = jointStatusLabel(obligation)
  const n = String(obligation.cycleOrdinal)
  if (/^T\d+S$/.test(code)) return { key: "jointStatus.tracerSelected", values: { n } }
  if (/^T\d+$/.test(code)) return { key: "jointStatus.tracer", values: { n } }
  if (/^R\d+$/.test(code)) return { key: "jointStatus.repair", values: { n } }
  return { key: `jointStatus.${code}` }
}
