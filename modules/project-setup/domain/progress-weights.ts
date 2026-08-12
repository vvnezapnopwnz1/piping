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
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (phase === "assembly" && !assemblyEnabled) {
    errors.phase = "Assembly phase is not enabled for this project"
    return { ok: false, errors }
  }

  if (items.length === 0) {
    errors.items = "At least one activity weight is required"
    return { ok: false, errors }
  }

  let total = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item.activity || !item.activity.trim()) {
      errors[`item_${i}_activity`] = "Activity code cannot be blank"
    }
    if (typeof item.weight !== "number" || isNaN(item.weight) || item.weight < 0 || item.weight > 100) {
      errors[`item_${i}_weight`] = "Weight must be between 0 and 100"
    } else {
      total += item.weight
    }
  }

  if (Math.abs(total - 100) > 0.0001) {
    errors.total = `Progress weights total must be exactly 100% (current total: ${total.toFixed(2)}%)`
  }

  return { ok: Object.keys(errors).length === 0, errors }
}
