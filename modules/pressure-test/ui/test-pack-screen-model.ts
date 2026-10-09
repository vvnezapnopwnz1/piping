import type { TestPackCatalogRow, TestPackMemberRow } from "../infrastructure/supabase-pressure-test-repository"
import { TEST_PACK_VIEWS, type TestPackView } from "./test-pack-workspace-model"

export { TEST_PACK_VIEWS, type TestPackView }
export const explorerTabs = ["text.general", "text.releaseTracking", "text.operationManagement", "text.progressStatus", "text.spoolStatus", "text.isometricStatus", "text.spool"] as const

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
