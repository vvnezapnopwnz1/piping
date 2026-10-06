import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../lib/supabase/database.types"

/**
 * Fixture-only: the first eligible PML record for every BOM row of a spool revision. Operators
 * choose evidence in the UI; seed scripts take the first eligible one so a stage can be seeded.
 */
export async function materialCheckItemsFor(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<{ spool_revision_material_id: string; piping_material_record_id: string }[]> {
  const { data, error } = await client
    .from("material_trace_candidates")
    .select("spool_revision_material_id, piping_material_record_id")
    .eq("spool_revision_id", spoolRevisionId)
    .order("spool_revision_material_id")
    .order("piping_material_record_id")
  if (error) throw new Error(`Material candidates for ${spoolRevisionId}: ${error.message}`)
  const firstByRow = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.spool_revision_material_id && row.piping_material_record_id && !firstByRow.has(row.spool_revision_material_id)) {
      firstByRow.set(row.spool_revision_material_id, row.piping_material_record_id)
    }
  }
  return [...firstByRow].map(([bom, pml]) => ({ spool_revision_material_id: bom, piping_material_record_id: pml }))
}
