import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"

export function selectErectionRow(
  rows: readonly ErectionReadiness[],
  projectId: string | null,
  selectedId: string | null,
): ErectionReadiness | null {
  if (!projectId || !selectedId) return null
  return rows.find((row) => row.projectId === projectId && row.spoolRevisionId === selectedId) ?? null
}
