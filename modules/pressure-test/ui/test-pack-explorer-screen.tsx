"use client"

import { TestPackWorkbench } from "./test-pack-workbench"

export function TestPackExplorerScreen({
  projectId,
  testPackId,
}: {
  projectId: string
  testPackId?: string
}) {
  return <TestPackWorkbench projectId={projectId} testPackId={testPackId} />
}
