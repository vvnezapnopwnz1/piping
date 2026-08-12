import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  ProgressWeightPhase,
  ProgressWeightItem,
  ProgressWeightRow,
} from "../domain/progress-weights"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"

export interface LoadedProgressWeights {
  weightsByPhase: Record<ProgressWeightPhase, ProgressWeightRow[]>
  assemblyEnabled: boolean
  canManage: boolean
}

export async function loadProgressWeights(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedProgressWeights> {
  const [weightsRes, assemblyRes, manageRes] = await Promise.all([
    client
      .from("project_progress_weights")
      .select("id, project_id, phase, activity, weight, status")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("activity", { ascending: true }),
    client
      .from("project_assembly_settings")
      .select("enabled")
      .eq("project_id", projectId)
      .maybeSingle(),
    client.rpc("current_user_has_capability", {
      target_project_id: projectId,
      requested_capability: "project_referential.manage",
    }),
  ])

  if (weightsRes.error) throw new Error(mapSupabaseReferenceError(weightsRes.error))
  if (assemblyRes.error) throw new Error(mapSupabaseReferenceError(assemblyRes.error))

  const weightsByPhase: Record<ProgressWeightPhase, ProgressWeightRow[]> = {
    prefabrication: [],
    painting: [],
    assembly: [],
    erection: [],
  }

  for (const row of weightsRes.data ?? []) {
    const phase = row.phase as ProgressWeightPhase
    if (weightsByPhase[phase]) {
      weightsByPhase[phase].push({
        id: row.id,
        projectId: row.project_id,
        phase,
        activity: row.activity,
        weight: Number(row.weight),
        status: row.status,
      })
    }
  }

  return {
    weightsByPhase,
    assemblyEnabled: assemblyRes.data?.enabled === true,
    canManage: manageRes.data === true,
  }
}

export async function saveProgressWeightsRpc(
  client: SupabaseClient<Database>,
  projectId: string,
  phase: ProgressWeightPhase,
  items: ProgressWeightItem[]
): Promise<ProgressWeightRow[]> {
  const { data, error } = await client.rpc("set_project_progress_weights", {
    target_project_id: projectId,
    target_phase: phase,
    weight_items: items as any,
  })

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    phase: row.phase as ProgressWeightPhase,
    activity: row.activity,
    weight: Number(row.weight),
    status: row.status,
  }))
}
