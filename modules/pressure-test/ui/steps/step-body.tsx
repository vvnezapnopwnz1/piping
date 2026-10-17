"use client"

import type { ReactNode } from "react"

import type { PackStep } from "../../domain/pack-steps"
import type { TestPackCatalogRow } from "../../infrastructure/supabase-pressure-test-repository"

export interface StepBodyContext {
  projectId: string
  pack: TestPackCatalogRow
  canManage: boolean
  onChanged: () => void
}

/** What a step shows when it is open. Each task of the plan adds its steps here. */
export function StepBody({ step }: { step: PackStep; context: StepBodyContext }): ReactNode {
  switch (step.id) {
    default:
      return null
  }
}
