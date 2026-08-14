import { pathToFileURL } from "node:url"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../lib/supabase/database.types"
import { assertLocalSupabaseTarget } from "./demo/local-target"
import { signInFixtureOperator } from "./spoolgen-fixture-import"

const COMPARED_FIELDS = [
  "line_total",
  "line_checked",
  "weld_total",
  "weld_complete",
  "support_total",
  "support_recorded",
  "nde_pending",
  "pwht_pending",
  "is_fabricated",
  "is_releasable",
] as const

type ComparableRow = Record<(typeof COMPARED_FIELDS)[number], unknown>
type LegacyRow = Database["public"]["Views"]["spool_fabrication_readiness"]["Row"]
type ProjectionRow = Database["public"]["Functions"]["list_fabrication_spools"]["Returns"][number]

export function compareFabricationProjectionRows(
  legacy: ComparableRow,
  projection: ComparableRow,
): string[] {
  return COMPARED_FIELDS.filter((field) => legacy[field] !== projection[field])
}

async function main(): Promise<void> {
  const target = assertLocalSupabaseTarget(process.env.SUPABASE_URL ?? "")
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!publishableKey || !password) {
    throw new Error("Local fixture credentials are required.")
  }
  const client = await signInFixtureOperator(
    target.origin,
    publishableKey,
    password,
  ) as SupabaseClient<Database>
  const { data: projects, error: projectError } = await client
    .from("projects")
    .select("id, activity_code")
    .in("activity_code", ["TRACK01-A", "TRACK01-B", "SHOWCASE-1"])
    .order("activity_code")
  if (projectError) throw new Error("Unable to read the demonstration projects.")

  let mismatches = 0
  for (const project of projects ?? []) {
    const [readiness, projections] = await Promise.all([
      client
        .from("spool_fabrication_readiness")
        .select([
          "spool_revision_id",
          "line_total",
          "line_checked",
          "weld_total",
          "weld_complete",
          "support_total",
          "support_recorded",
          "nde_pending",
          "pwht_pending",
          "is_fabricated",
          "is_releasable",
        ].join(","))
        .eq("project_id", project.id)
        .eq("revision_status", "accepted"),
      client.rpc("list_fabrication_spools", {
        target_project_id: project.id,
        page_limit: 100,
      }),
    ])
    if (readiness.error || projections.error) {
      throw new Error(`Unable to compare ${project.activity_code}.`)
    }
    // The fixture helper intentionally returns an untyped client. The generated database
    // contract keeps both query results explicit in this local-only verification script.
    const readinessRows = (readiness.data ?? []) as unknown as LegacyRow[]
    const projectionRows = (projections.data ?? []) as unknown as ProjectionRow[]
    const legacyById = new Map(
      readinessRows
        .filter((row): row is LegacyRow & { spool_revision_id: string } => row.spool_revision_id !== null)
        .map((row) => [row.spool_revision_id, row]),
    )
    const projectionById = new Map(
      projectionRows.map((row) => [row.spool_revision_id, row]),
    )
    const ids = new Set([...legacyById.keys(), ...projectionById.keys()])
    for (const id of ids) {
      const legacy = legacyById.get(id)
      const projection = projectionById.get(id)
      const fields = legacy && projection
        ? compareFabricationProjectionRows(legacy, projection)
        : [legacy ? "projection_missing" : "legacy_missing"]
      if (fields.length) {
        mismatches += 1
        console.log(`FAIL project=${project.activity_code} spool_revision=${id} fields=${fields.join(",")}`)
      }
    }
    console.log(`PASS project=${project.activity_code} compared=${ids.size} mismatches=${[...ids].filter((id) => {
      const legacy = legacyById.get(id)
      const projection = projectionById.get(id)
      return !legacy || !projection || compareFabricationProjectionRows(legacy, projection).length > 0
    }).length}`)
  }
  await client.auth.signOut()
  if (mismatches) process.exitCode = 1
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  void main().catch(() => {
    console.error("Fabrication projection parity check failed.")
    process.exitCode = 1
  })
}
