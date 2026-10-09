import type { PreviewChangeItem } from "../domain/diff"
// The database reports SRV_WPS_MISSING as a warning. warningCount is accepted for the
// complete validation summary but deliberately never closes this gate.
export interface RevisionApplyGate { status: string; alreadyApplied: boolean; blockerCount: number; unresolvedCount: number; warningCount?: number }
/** Why the import cannot be applied yet. The screen turns the code into a sentence, in the user's language. */
export type RevisionApplyReason =
  | { code: "alreadyApplied" | "closed" | "notValidated" }
  | { code: "blockers" | "unresolved"; count: number }
export interface RevisionApplyGateDescription { allowed: boolean; reason: RevisionApplyReason | null }
export function unresolvedItems(items: readonly PreviewChangeItem[]): PreviewChangeItem[] { return items.filter((item) => item.requiresDecision && item.decision === null) }
export function groupByIsometric(items: readonly PreviewChangeItem[]): Map<string, PreviewChangeItem[]> { const grouped = new Map<string, PreviewChangeItem[]>(); for (const item of items) { const bucket = grouped.get(item.isoNumber); if (bucket) bucket.push(item); else grouped.set(item.isoNumber, [item]) }; return grouped }
export function weldItemsForSpool(items: readonly PreviewChangeItem[], isoNumber: string, spoolNumber: string): PreviewChangeItem[] { return items.filter((item) => item.entityType === "weld_joint" && item.isoNumber === isoNumber && item.spoolNumber === spoolNumber) }
export function describeRevisionApplyGate(gate: RevisionApplyGate): RevisionApplyGateDescription {
  if (gate.alreadyApplied || gate.status === "applied") return { allowed: false, reason: { code: "alreadyApplied" } }
  if (gate.status === "failed" || gate.status === "canceled") return { allowed: false, reason: { code: "closed" } }
  if (gate.status !== "validated") return { allowed: false, reason: { code: "notValidated" } }
  if (gate.blockerCount > 0) return { allowed: false, reason: { code: "blockers", count: gate.blockerCount } }
  // unresolvedItems() counts items whose decision is still null, which includes an Unchanged
  // spool that requires one — so the count is of items, not of revised spools.
  if (gate.unresolvedCount > 0) return { allowed: false, reason: { code: "unresolved", count: gate.unresolvedCount } }
  return { allowed: true, reason: null }
}
