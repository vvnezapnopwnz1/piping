import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"

export async function loadProjectSetupReadiness(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectSetupReadiness> {
  const { data, error } = await client.rpc("get_project_setup_readiness", {
    target_project_id: projectId,
  })

  if (error) throw new Error(mapSupabaseReferenceError(error))

  const row = (Array.isArray(data) ? data[0] : data) as any
  return {
    readyForImport: row?.ready_for_import === true,
    adminComplete: row?.admin_complete === true,
    missingCodes: row?.missing_codes ?? [],
  }
}
