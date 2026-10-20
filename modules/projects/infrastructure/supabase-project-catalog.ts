import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { ProjectCatalogMetadata } from "../domain/project-catalog"

export async function loadProjectCatalogMetadata(
  client: SupabaseClient<Database>,
  projectIds: readonly string[],
): Promise<ProjectCatalogMetadata[]> {
  if (!projectIds.length) return []
  const { data, error } = await client
    .from("projects")
    .select("id, owner_name, contractor_name, contract_number")
    .in("id", [...projectIds])
  if (error) throw new Error("Project details could not be loaded.")
  return data ?? []
}

/** Whether the signed-in user may create projects: the flag the INSERT policy on `projects` checks. */
export async function loadIsPlatformAdmin(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw new Error("Platform admin status could not be loaded.")
  return data?.is_platform_admin === true
}
