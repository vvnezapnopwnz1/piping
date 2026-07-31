import assert from "node:assert/strict"
import {
  loadProgressWeights,
  saveProgressWeightsRpc,
} from "./supabase-progress-weights-repository"

function createFakeWeightsClient() {
  const queries: string[] = []

  const client: any = {
    from(table: string) {
      queries.push(`from:${table}`)
      return {
        select(cols: string) {
          queries.push(`select:${table}`)
          return {
            eq(col: string, val: any) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            order(col: string) {
              return Promise.resolve({ data: [], error: null })
            },
            maybeSingle() {
              return Promise.resolve({ data: { enabled: true }, error: null })
            },
          }
        },
      }
    },
    rpc(fnName: string, args: any) {
      queries.push(`rpc:${fnName}:${JSON.stringify(args)}`)
      if (fnName === "set_project_progress_weights") {
        return Promise.resolve({
          data: args.weight_items.map((item: any, i: number) => ({
            id: `pw-${i}`,
            project_id: args.target_project_id,
            phase: args.target_phase,
            activity: item.activity,
            weight: item.weight,
            status: "active",
          })),
          error: null,
        })
      }
      return Promise.resolve({ data: true, error: null })
    },
  }

  return { client, queries }
}

async function runProgressWeightsRepositoryTests() {
  const { client, queries } = createFakeWeightsClient()

  const loaded = await loadProgressWeights(client, "proj-1")
  assert.equal(loaded.assemblyEnabled, true)
  assert.ok(queries.includes("from:project_progress_weights"))
  assert.ok(queries.includes("from:project_assembly_settings"))

  const saved = await saveProgressWeightsRpc(client, "proj-1", "prefabrication", [
    { activity: "FITUP", weight: 40 },
    { activity: "WELD", weight: 60 },
  ])
  assert.equal(saved.length, 2)
  assert.equal(saved[0].activity, "FITUP")
  assert.equal(saved[1].weight, 60)
  assert.ok(queries.some((q) => q.includes("rpc:set_project_progress_weights")))

  console.log("All supabase-progress-weights-repository.test.ts assertions passed!")
}

runProgressWeightsRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
