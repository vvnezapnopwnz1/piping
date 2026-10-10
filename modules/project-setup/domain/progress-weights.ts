import type { SetupFieldIssue } from "./issue"

export type ProgressWeightPhase = "prefabrication" | "painting" | "assembly" | "erection"

export interface ProgressWeightItem {
  activity: string
  weight: number
}

export interface ProgressWeightRow {
  id: string
  projectId: string
  phase: ProgressWeightPhase
  activity: string
  weight: number
  status: "active" | "inactive" | "archived"
}

export function validatePhaseWeights(
  phase: ProgressWeightPhase,
  items: ProgressWeightItem[],
  assemblyEnabled: boolean
): { ok: boolean; errors: Record<string, SetupFieldIssue> } {
  const errors: Record<string, SetupFieldIssue> = {}

  if (phase === "assembly" && !assemblyEnabled) {
    errors.phase = { code: "phase_not_enabled", phase }
    return { ok: false, errors }
  }

  if (items.length === 0) {
    errors.items = { code: "at_least_one_item" }
    return { ok: false, errors }
  }

  let total = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item.activity || !item.activity.trim()) {
      errors[`item_${i}_activity`] = { code: "activity_blank" }
    }
    if (typeof item.weight !== "number" || isNaN(item.weight) || item.weight < 0 || item.weight > 100) {
      errors[`item_${i}_weight`] = { code: "weight_range" }
    } else {
      total += item.weight
    }
  }

  if (Math.abs(total - 100) > 0.0001) {
    errors.total = { code: "total_not_hundred", currentTotal: total }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

