import type { PreviewChangeItem } from "../domain/diff"
// The database reports SRV_WPS_MISSING as a warning. warningCount is accepted for the
// complete validation summary but deliberately never closes this gate.
export interface RevisionApplyGate { status: string; alreadyApplied: boolean; blockerCount: number; unresolvedCount: number; warningCount?: number }
export interface RevisionApplyGateDescription { allowed: boolean; reason: string | null }
export function unresolvedItems(items: readonly PreviewChangeItem[]): PreviewChangeItem[] { return items.filter((item) => item.requiresDecision && item.decision === null) }
export function groupByIsometric(items: readonly PreviewChangeItem[]): Map<string, PreviewChangeItem[]> { const grouped = new Map<string, PreviewChangeItem[]>(); for (const item of items) { const bucket = grouped.get(item.isoNumber); if (bucket) bucket.push(item); else grouped.set(item.isoNumber, [item]) }; return grouped }
export function weldItemsForSpool(items: readonly PreviewChangeItem[], isoNumber: string, spoolNumber: string): PreviewChangeItem[] { return items.filter((item) => item.entityType === "weld_joint" && item.isoNumber === isoNumber && item.spoolNumber === spoolNumber) }
export function describeRevisionApplyGate(gate: RevisionApplyGate): RevisionApplyGateDescription {
  if (gate.alreadyApplied || gate.status === "applied") return { allowed: false, reason: "This import has already been applied. Start a new import to load the files again." }
  if (gate.status === "failed" || gate.status === "canceled") return { allowed: false, reason: "This import is closed and can no longer be applied." }
  if (gate.status !== "validated") return { allowed: false, reason: "Upload and validate the SpoolGen files before applying them." }
  if (gate.blockerCount > 0) return { allowed: false, reason: `${gate.blockerCount} blocking issues must be fixed in the source files before this import can be applied.` }
  // unresolvedItems() counts items whose decision is still null, which includes an Unchanged
  // spool that requires one — so the sentence says "items", not "revised spools".
  if (gate.unresolvedCount > 0) return { allowed: false, reason: gate.unresolvedCount === 1 ? "1 item still needs a decision before this import can be applied." : `${gate.unresolvedCount} items still need a decision before this import can be applied.` }
  return { allowed: true, reason: null }
}
