import type { SupabaseClient } from "@supabase/supabase-js"

import {
  toProjectDefinition,
  toProjectDefinitionUpdate,
  type ProjectDefinition,
  type ProjectDefinitionInput,
} from "../project-definition"
import type { Database } from "./database.types"

const PROJECT_DEFINITION_SELECT =
  "activity_code, title, owner_name, contractor_name, owner_logo_path, contractor_logo_path, maximum_transit_time_days, updated_at"

export interface LoadedProjectDefinition {
  projectDefinition: ProjectDefinition
  canEdit: boolean
}

function toError(
  error: { message: string } | null,
  fallbackMessage: string,
): Error {
  return new Error(error?.message ?? fallbackMessage)
}

export async function loadProjectDefinition(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<LoadedProjectDefinition> {
  const [projectResponse, capabilityResponse] = await Promise.all([
    client
      .from("projects")
      .select(PROJECT_DEFINITION_SELECT)
      .eq("id", projectId)
      .single(),
    client.rpc("can_administer_project", { target_project_id: projectId }),
  ])

  if (projectResponse.error) {
    throw toError(projectResponse.error, "Unable to load project definition")
  }
  if (!projectResponse.data) {
    throw new Error("Project definition was not found")
  }
  if (capabilityResponse.error) {
    throw toError(
      capabilityResponse.error,
      "Unable to determine project edit capability",
    )
  }

  return {
    projectDefinition: toProjectDefinition(projectResponse.data),
    canEdit: capabilityResponse.data === true,
  }
}

export async function saveProjectDefinition(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ProjectDefinitionInput,
): Promise<ProjectDefinition> {
  const response = await client
    .from("projects")
    .update(toProjectDefinitionUpdate(input))
    .eq("id", projectId)
    .select(PROJECT_DEFINITION_SELECT)
    .single()

  if (response.error) {
    throw toError(response.error, "Unable to save project definition")
  }
  if (!response.data) {
    throw new Error("Project definition was not found after saving")
  }

  return toProjectDefinition(response.data)
}
