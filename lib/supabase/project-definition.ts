import type { SupabaseClient } from "@supabase/supabase-js"

import {
  toProjectCreationInsert,
  toProjectDefinition,
  toProjectDefinitionUpdate,
  type ProjectCreationInput,
  type ProjectDefinition,
  type ProjectDefinitionInput,
} from "../project-definition"
import type { Database } from "./database.types"

const PROJECT_DEFINITION_SELECT =
  "activity_code, title, owner_name, contractor_name, owner_logo_path, contractor_logo_path, maximum_transit_time_days, updated_at"

const CREATED_PROJECT_SELECT = `id, ${PROJECT_DEFINITION_SELECT}`

export interface CreatedProject extends ProjectDefinition {
  id: string
}

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

/**
 * `creatorId` comes from the authenticated session, never from the form: the INSERT policy
 * compares it to `auth.uid()`, and the `projects_add_creator_as_admin` trigger turns it into the
 * new project's Project Admin membership.
 */
export async function createProjectDefinition(
  client: SupabaseClient<Database>,
  creatorId: string,
  input: ProjectCreationInput,
): Promise<CreatedProject> {
  const insert = toProjectCreationInsert(input, creatorId)

  const response = await client
    .from("projects")
    .insert(insert)
    .select(CREATED_PROJECT_SELECT)
    .single()

  if (response.error) {
    throw toCreationError(response.error)
  }
  if (!response.data) {
    throw new Error("The project was not returned after creation")
  }

  const row = response.data as typeof response.data & { id: string }
  return { id: row.id, ...toProjectDefinition(row) }
}

function toCreationError(error: { code?: string; message?: string }): Error {
  switch (error.code) {
    case "23505":
      return new Error("A project with this activity code already exists.")
    case "42501":
      return new Error("You do not have permission to create projects.")
    default:
      return new Error(error.message ?? "Unable to create the project")
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
