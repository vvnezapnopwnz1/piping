import assert from "node:assert/strict"
import { loadProjectSetupReadiness } from "./supabase-setup-readiness-repository"

function createFakeReadinessClient() {
  const queries: string[] = []

  const client: any = {
    rpc(fnName: string, args: any) {
      queries.push(`rpc:${fnName}:${JSON.stringify(args)}`)
      return Promise.resolve({
        data: [
          {
            ready_for_import: true,
            admin_complete: false,
            missing_codes: ["ral_codes"],
          },
        ],
        error: null,
      })
    },
  }

  return { client, queries }
}

async function runReadinessRepositoryTests() {
  const { client, queries } = createFakeReadinessClient()

  const readiness = await loadProjectSetupReadiness(client, "proj-1")
  assert.equal(readiness.readyForImport, true)
  assert.equal(readiness.adminComplete, false)
  assert.deepEqual(readiness.missingCodes, ["ral_codes"])
  assert.ok(queries.some((q) => q.includes("rpc:get_project_setup_readiness")))

  console.log("All supabase-setup-readiness-repository.test.ts assertions passed!")
}

runReadinessRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
