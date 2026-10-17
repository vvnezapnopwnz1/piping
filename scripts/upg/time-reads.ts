/**
 * Times the readiness views the way the app reads them (REST, signed in as the UPG operator, one project).
 * Read-only. `--confirm-hosted-upg` targets the hosted stand from ~/.pipeqc-hosted.env.
 * Output: view, rows, fastest and median of RUNS reads in ms. No secret is printed.
 */
import { findProjectId, readUpgEnv, signInOperator, upgTargetFromArgv } from "./operator"

const RUNS = 3
const PROJECT = "UPG-1"

// Reads as the screens issue them: `*` where the app takes whole rows, a short list where it takes two columns.
const READS: readonly (readonly [view: string, columns: string])[] = [
  ["spool_erection_readiness", "*"],
  ["isometric_readiness", "*"],
  ["test_pack_readiness", "test_pack_id,is_rft"],
  ["test_pack_readiness", "*"],
  ["test_pack_workflow", "*"],
  ["test_pack_document_rows", "*"],
  ["nde_register_rows", "*"],
  ["weld_log_rows", "*"],
]

const median = (values: readonly number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

async function main(): Promise<void> {
  const env = readUpgEnv(process.env, upgTargetFromArgv(process.argv.slice(2)))
  const client = await signInOperator(env)
  const projectId = await findProjectId(client, PROJECT)
  if (!projectId) throw new Error(`Project ${PROJECT} not found on ${env.target}.`)

  console.log(`target: ${env.target} (${new URL(env.url).host}), project ${PROJECT}, ${RUNS} runs each`)
  for (const [view, columns] of READS) {
    const times: number[] = []
    let rows = 0
    let failure = ""
    for (let run = 0; run < RUNS; run += 1) {
      const started = performance.now()
      // The generated types do not list every view name used here; the read is dynamic by design.
      const { data, error } = await (client as unknown as {
        from: (name: string) => { select: (list: string) => { eq: (column: string, value: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> } }
      }).from(view).select(columns).eq("project_id", projectId)
      times.push(Math.round(performance.now() - started))
      if (error) { failure = error.message; break }
      rows = data?.length ?? 0
    }
    const label = `${view}(${columns === "*" ? "*" : columns})`.padEnd(48)
    console.log(failure
      ? `${label} FAILED: ${failure}`
      : `${label} rows ${String(rows).padStart(4)}  fastest ${String(Math.min(...times)).padStart(6)} ms  median ${String(median(times)).padStart(6)} ms`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
