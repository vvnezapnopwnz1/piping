import { safeReturnPath } from "@/components/pipeqc/workspace-model"
import { withProject } from "@/components/pipeqc/project-url"
import type { TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"

export const TEST_PACK_VIEWS = ["definition", "composition", "readiness", "workflow"] as const
export type TestPackView = (typeof TEST_PACK_VIEWS)[number]
export const TEST_PACK_OPERATIONS = [
  "line_check",
  "item_clearance",
  "blinding",
  "testing",
  "y_reinstatement",
  "precommissioning",
  "z_reinstatement",
] as const
export type TestPackOperation = (typeof TEST_PACK_OPERATIONS)[number]
export type TestPackMode = "preparation" | "progress"

export function testPackView(value: string | null): TestPackView {
  return TEST_PACK_VIEWS.find((item) => item === value) ?? "readiness"
}

export function testPackOperation(value: string | null): TestPackOperation | null {
  return TEST_PACK_OPERATIONS.find((item) => item === value) ?? null
}

export function testPackMode(value: string | null): TestPackMode | null {
  return value === "preparation" || value === "progress" ? value : null
}

export function selectTestPackRow(
  rows: readonly TestPackCatalogRow[],
  projectId: string,
  id: string | null,
): TestPackCatalogRow | null {
  return id ? rows.find((row) => row.id === id && row.projectId === projectId) ?? null : null
}

export function targetDraftKey(requestId: string, targetId: string): string {
  return JSON.stringify([requestId, targetId])
}

export interface TestPackLinkInput {
  href: string
  projectCode?: string | null
  testPackId?: string | null
  view?: TestPackView
  operation?: TestPackOperation
  mode?: TestPackMode
  spoolRevisionId?: string | null
  from?: string | null
}

export function buildTestPackHref(input: TestPackLinkInput): string {
  const [path, query = ""] = input.href.split("?")
  const params = new URLSearchParams(query)
  for (const name of ["testPackId", "view", "operation", "mode", "spool", "from", "new"]) params.delete(name)
  if (input.testPackId) params.set("testPackId", input.testPackId)
  if (input.view) params.set("view", input.view)
  if (input.operation) params.set("operation", input.operation)
  if (input.mode) params.set("mode", input.mode)
  if (input.spoolRevisionId) params.set("spool", input.spoolRevisionId)
  const from = safeReturnPath(input.from)
  if (from) params.set("from", from)
  const search = params.toString()
  return withProject(search ? `${path}?${search}` : path, input.projectCode)
}
