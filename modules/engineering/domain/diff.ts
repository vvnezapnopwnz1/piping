import type { EngineeringEntityType } from "./entity"
import type { RevisionDecision } from "./revision"
export const CHANGE_TYPES = ["new", "revised", "unchanged", "removed"] as const
export type ChangeType = (typeof CHANGE_TYPES)[number]
export interface PreviewChangeItem { isoNumber: string; entityType: EngineeringEntityType; entityKey: string; spoolNumber: string | null; changeType: ChangeType; requiresDecision: boolean; decision: RevisionDecision | null }
export interface ChangeSummary { new: number; revised: number; unchanged: number; removed: number }
export function summarizeChanges(items: readonly PreviewChangeItem[]): ChangeSummary { const summary: ChangeSummary = { new: 0, revised: 0, unchanged: 0, removed: 0 }; for (const item of items) summary[item.changeType] += 1; return summary }
