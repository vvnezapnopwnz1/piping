import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { selectAllRows } from "@/lib/supabase/select-all-rows"
import type { PackWorkflowRow } from "../domain/pack-steps"

/** Every pack's `test_pack_workflow` row of the project, by pack id: the server's stage, reasons and allowed operations. */
export async function listTestPackWorkflowRows(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<Record<string, PackWorkflowRow>> {
  const rows = await selectAllRows((from, to) =>
    client.from("test_pack_workflow").select("*").eq("project_id", projectId).order("test_pack_id").range(from, to),
  )
  return Object.fromEntries(rows.map((row) => [row.test_pack_id ?? "", row]))
}
