import type { Target } from "./step-actions"

export type TestingAction = "testing_start" | "testing_complete" | "precommissioning"
const ALL: readonly TestingAction[] = ["testing_start", "testing_complete", "precommissioning"]

/** The one operation the server allows next among those a step owns (`available_operations` decides, not the client). */
export function nextTestingAction(available: readonly string[], owned: readonly TestingAction[] = ALL): TestingAction | null {
  return owned.find((action) => available.includes(action)) ?? null
}

/** The flange joints of one category, only while the server allows that reinstatement. */
export function reinstatementTargets(
  flanges: readonly { category_code: string | null; flange_joint_revision_id: string | null; flange_number: string | null }[],
  available: readonly string[],
  category: "Y" | "Z",
): Target[] {
  const operation = category === "Y" ? "y_reinstatement" : "z_reinstatement"
  if (!available.includes(operation)) return []
  return flanges
    .filter((flange) => flange.category_code === category && flange.flange_joint_revision_id)
    .map((flange) => ({ id: flange.flange_joint_revision_id as string, label: flange.flange_number ?? (flange.flange_joint_revision_id as string) }))
}

/** Missing fields of a reinstatement record, by field, so the message sits next to the box. */
export function reinstatementDraftErrors(draft: { report: string; tag: string }): { report?: true; tag?: true } {
  return { ...(draft.report.trim() === "" ? { report: true as const } : {}), ...(draft.tag.trim() === "" ? { tag: true as const } : {}) }
}
