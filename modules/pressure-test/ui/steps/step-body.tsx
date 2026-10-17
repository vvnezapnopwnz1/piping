"use client"

import type { ReactNode } from "react"

import type { PackStep } from "../../domain/pack-steps"
import type { TestPackCatalogRow } from "../../infrastructure/supabase-pressure-test-repository"
import { CompositionStep } from "./composition-step"
import { ReadinessStep } from "./readiness-step"

export interface StepBodyContext {
  projectId: string
  pack: TestPackCatalogRow
  canManage: boolean
  onChanged: () => void
}

/** What a step shows when it is open. Each task of the plan adds its steps here. */
export function StepBody({ step, context }: { step: PackStep; context: StepBodyContext }): ReactNode {
  switch (step.id) {
    case "composition":
      return <CompositionStep projectId={context.projectId} pack={context.pack} canManage={context.canManage} onChanged={context.onChanged} />
    case "readiness":
      return <ReadinessStep projectId={context.projectId} packId={context.pack.id} step={step} />
    default:
      return null
  }
}
