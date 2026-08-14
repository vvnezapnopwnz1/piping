import { pathToFileURL } from "node:url"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { assertLocalSupabaseTarget } from "./demo/local-target"

export interface FabricationProjectionBackfillPort {
  listSpoolRevisionIds(afterId: string | null, limit: number): Promise<readonly string[]>
  recompute(spoolRevisionId: string): Promise<void>
}

/**
 * Rebuilds the stored read model without touching the event ledger or detail records. UUID
 * ordering is stable, so a completed page never needs to be repeated after an interrupted run.
 */
export async function backfillFabricationSpoolProjection(
  port: FabricationProjectionBackfillPort,
  pageSize = 500,
): Promise<number> {
  let afterId: string | null = null
  let refreshed = 0

  for (;;) {
    const ids = await port.listSpoolRevisionIds(afterId, pageSize)
    if (ids.length === 0) return refreshed
    for (const spoolRevisionId of ids) {
      await port.recompute(spoolRevisionId)
      refreshed += 1
    }
    afterId = ids.at(-1) ?? null
  }
}

function createBackfillPort(client: SupabaseClient): FabricationProjectionBackfillPort {
  return {
    async listSpoolRevisionIds(afterId, limit) {
      let query = client
        .from("spool_revisions")
        .select("id")
        .order("id")
        .limit(limit)
      if (afterId) query = query.gt("id", afterId)
      const { data, error } = await query
      if (error) throw new Error("Unable to read spool revisions for projection backfill.")
      return (data ?? []).map((row) => row.id)
    },
    async recompute(spoolRevisionId) {
      const { error } = await client.rpc("recompute_fabrication_spool_projection", {
        target_spool_revision_id: spoolRevisionId,
      })
      if (error) throw new Error("Unable to refresh a fabrication spool projection.")
    },
  }
}

async function main(): Promise<void> {
  const target = assertLocalSupabaseTarget(process.env.SUPABASE_URL ?? "")
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!serviceRoleKey.trim()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }
  const refreshed = await backfillFabricationSpoolProjection(
    createBackfillPort(createClient(target.origin, serviceRoleKey)),
  )
  console.log(`Fabrication projection backfill completed: ${refreshed} spool revisions refreshed.`)
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  void main().catch(() => {
    console.error("Fabrication projection backfill failed.")
    process.exitCode = 1
  })
}
