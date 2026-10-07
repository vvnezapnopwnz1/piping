export type PanelMode = "done" | "blocked" | "actionable"

export function panelMode(input: { allRecorded: boolean; blockedBy: string | null }): PanelMode {
  if (input.allRecorded) return "done"
  if (input.blockedBy !== null) return "blocked"
  return "actionable"
}
