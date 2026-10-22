// scripts/upg/run-week.ts
/**
 * demo:week — one construction week of UPG-1.
 *
 *   npm run demo:week -- [--dataset upg|nps] --project UPG-1 --week 3 [--include-manual | --manual-kinds flange,tracking]
 *
 * Manual actions (the thread, TP-100-01, the revision import) are listed for the walkthrough,
 * not executed, unless --include-manual (the stage A dry run). Exit code 1 only when a refusal
 * is not one of EXPECTED_REFUSALS.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { specFromArgv } from "./dataset-arg"
import { executeAction, summarizeRun, type ActionResult } from "./execute"
import { addDays } from "./files"
import { loadIds } from "./ids"
import { findProjectId, readUpgEnv, signInOperator, upgTargetFromArgv } from "./operator"
import { UPG_WEEK_COUNT, buildWeekPlan, describeAction } from "./weeks"

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<number> {
  const spec = specFromArgv(process.argv)
  const week = Number(argument("--week"))
  if (!Number.isInteger(week) || week < 1 || week > UPG_WEEK_COUNT) throw new Error(`Use --week 1…${UPG_WEEK_COUNT}.`)
  const includeManual = process.argv.includes("--include-manual")
  // Walkthrough: run only these kinds of the thread's manual actions (the rest is done in the UI).
  const manualKinds = (argument("--manual-kinds") ?? "").split(",").filter(Boolean)
  const projectCode = argument("--project") ?? spec.project.activityCode
  const target = upgTargetFromArgv(process.argv)
  const env = readUpgEnv(process.env, target)
  if (target !== "local") {
    console.log(`Target: ${env.url} (${target})`)
  }
  const client = await signInOperator(env)
  const projectId = await findProjectId(client, projectCode)
  if (!projectId) throw new Error(`Project ${projectCode} does not exist.`)
  const startDate = (JSON.parse(readFileSync(join(spec.fixtureDir, "manifest.json"), "utf8")) as { startDate: string }).startDate
  const ids = await loadIds(client, projectId)

  const plan = buildWeekPlan(spec, week, true)
  const results: ActionResult[] = []
  for (const action of plan) {
    if (action.manual && !includeManual && !manualKinds.includes(action.kind)) {
      results.push({ action, outcome: "skipped", message: "manual" })
      continue
    }
    results.push(await executeAction({ client, ids, startDate, spec }, action))
  }

  const first = addDays(startDate, (week - 1) * 7)
  const last = addDays(startDate, week * 7 - 1)
  const summary = summarizeRun(results)
  console.log(`\nНеделя ${week} (${first} … ${last}), проект ${projectCode}`)
  console.log(`  выполнено ${summary.done}, пропущено ${summary.skipped}, отказов ${summary.refused} (неожиданных ${summary.unexpected.length})`)
  console.log(`  ситуации: ${summary.situations.join(", ") || "—"}`)
  const manual = results.filter((result) => result.message === "manual")
  if (manual.length > 0) {
    console.log("  Руками на этой неделе:")
    for (const result of manual) console.log(`    - ${addDays(startDate, result.action.day)} ${describeAction(result.action)}`)
  }
  const other = results.filter((result) => result.outcome === "skipped" && result.message !== "manual")
  if (other.length > 0) {
    console.log("  Пропущено:")
    for (const result of other) console.log(`    - ${describeAction(result.action)}: ${result.message}`)
  }
  const refusals = results.filter((result) => result.outcome === "refused")
  if (refusals.length > 0) {
    console.log("  Отказы:")
    for (const result of refusals) {
      console.log(`    - ${addDays(startDate, result.action.day)} ${describeAction(result.action)}: ${result.code ?? "?"} ${result.message}${result.expected ? " (ожидаемо)" : ""}`)
    }
  }
  return summary.unexpected.length > 0 ? 1 : 0
}

main().then((code) => process.exit(code)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
