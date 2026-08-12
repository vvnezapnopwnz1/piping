import type { TestPackCatalogRow, TestPackMemberRow } from "../infrastructure/supabase-pressure-test-repository"

export const explorerTabs = ["General", "Release Tracking", "Operation Management", "Progress Status", "Spool Status", "Isometric Status", "Spool"] as const

export function filterTestPackCatalog(rows: TestPackCatalogRow[], query: string): TestPackCatalogRow[] {
  const normalized = query.trim().toLowerCase()
  return normalized ? rows.filter((row) => row.testPackNumber.toLowerCase().includes(normalized)) : rows
}

export function canMutateTestPack(canManage: boolean, lifecycle: string): boolean {
  return canManage && lifecycle !== "archived"
}

export function eligibleMemberRemoval(member: Pick<TestPackMemberRow, "removed_at">): boolean {
  return member.removed_at === null
}
