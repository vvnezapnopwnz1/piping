import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import {
  toExecutiveOverview,
  type ExecutiveOverview,
  type ErectionStageCount,
  type FabricationStageCount,
  type NdeWorkflowCount,
} from "../domain/executive-overview"

const fail = (error: { message: string } | null): void => {
  if (error) throw new Error(error.message)
}

export async function loadHomeFabricationSummary(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<ExecutiveOverview["fabrication"]> {
  const fabrication = await client.rpc("fabrication_spool_stage_counts", { target_project_id: projectId })
  fail(fabrication.error)
  return toExecutiveOverview({
    fabricationStages: (fabrication.data ?? []) as FabricationStageCount[],
    ndeWorkflow: [],
    erectionStages: [],
  }).fabrication
}

export async function loadHomeNdeSummary(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<ExecutiveOverview["nde"]> {
  const nde = await client.rpc("nde_inspection_workflow_distribution", { target_project_id: projectId })
  fail(nde.error)
  return toExecutiveOverview({
    fabricationStages: [],
    ndeWorkflow: (nde.data ?? []) as NdeWorkflowCount[],
    erectionStages: [],
  }).nde
}

export async function loadHomeErectionSummary(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<ExecutiveOverview["erection"]> {
  const erection = await client.rpc("erection_stage_distribution", { target_project_id: projectId })
  fail(erection.error)
  return toExecutiveOverview({
    fabricationStages: [],
    ndeWorkflow: [],
    erectionStages: (erection.data ?? []) as ErectionStageCount[],
  }).erection
}
