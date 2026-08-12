export const REVISION_STATUSES = ["draft", "accepted", "superseded"] as const
export type RevisionStatus = (typeof REVISION_STATUSES)[number]
export const REVISION_DECISIONS = ["not_done", "cancelled", "done_without_modification", "rework"] as const
export type RevisionDecision = (typeof REVISION_DECISIONS)[number]
export const PROGRESS_KINDS = ["fabrication_start", "sent_to_paint", "paint"] as const
export type ProgressKind = (typeof PROGRESS_KINDS)[number]
const DECISION_LABELS: Record<RevisionDecision, string> = { not_done: "Not Done", cancelled: "Cancelled", done_without_modification: "Done without Modification", rework: "Rework" }
export function decisionLabel(decision: RevisionDecision): string { return DECISION_LABELS[decision] }
export function isRevisionEditable(status: RevisionStatus): boolean { return status !== "superseded" }
export function progressKindsFor(decision: RevisionDecision): readonly ProgressKind[] { return decision === "done_without_modification" || decision === "rework" ? PROGRESS_KINDS : [] }
export function keepsEntity(decision: RevisionDecision): boolean { return decision !== "cancelled" }
export function requiresWeldReview(decision: RevisionDecision): boolean { return decision === "rework" }
export function isDuplicateRevisionNumber(existing: readonly string[], candidate: string): boolean { const normalized = candidate.trim().toUpperCase(); return existing.some((value) => value.trim().toUpperCase() === normalized) }
