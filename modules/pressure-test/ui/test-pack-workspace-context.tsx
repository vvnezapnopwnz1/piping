"use client"

import React, { createContext, useContext } from "react"
import {
  useTestPackWorkspace,
  type TestPackWorkspaceState,
  type UseTestPackWorkspaceOptions,
} from "./use-test-pack-workspace"

const TestPackWorkspaceContext = createContext<TestPackWorkspaceState | null>(null)

export function TestPackWorkspaceProvider({
  projectId,
  testPackId,
  repo,
  children,
}: UseTestPackWorkspaceOptions & { children: React.ReactNode }) {
  const state = useTestPackWorkspace({ projectId, testPackId, repo })
  return (
    <TestPackWorkspaceContext.Provider value={state}>
      {children}
    </TestPackWorkspaceContext.Provider>
  )
}

export function useTestPackWorkspaceContext(): TestPackWorkspaceState {
  const context = useContext(TestPackWorkspaceContext)
  if (!context) {
    throw new Error(
      "useTestPackWorkspaceContext must be used within a TestPackWorkspaceProvider",
    )
  }
  return context
}

export function useOptionalTestPackWorkspaceContext(): TestPackWorkspaceState | null {
  return useContext(TestPackWorkspaceContext)
}
