// scripts/upg/time-import.ts
/**
 * demo:time-import — how long applying a spooling import takes at pilot size.
 *
 *   npm run demo:time-import -- --copies 5 [--per-job 5]   local stand only; --per-job puts that many copies in one job
 *   npm run demo:time-import -- --isos 1400 [--per-job 5]  the same, sized by a target ISO count
 *
 * Creates (or reuses) the project PERF-1, loads the UPG references into it, and imports the 40 UPG
 * ISOs `copies` times under renumbered ISOs (copies 5 = 200 ISOs, about 2,900 joints). Prints the
 * time of each phase (register, validate, apply); apply and validate have to fit the role's statement_timeout. PERF-1 is a
 * measurement project: nothing reads it but this script, and a second run imports only what is missing.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { createProjectDefinition } from "../../lib/supabase/project-definition"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import {
  applySpoolingImportJob,
  createSpoolingImportJob,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  uploadSpoolgenFile,
} from "../../modules/engineering/infrastructure/supabase-engineering-repository"
import { isoNumberOf, isosOf } from "./builders"
import { UPG_SPEC } from "./dataset"
import { importSheets, spoolgenFiles } from "./files"
import { createPwhtRules, importExcelFile } from "./load-project"
import type { UpgIso } from "./spec"
import { parseTimeImportArgs } from "./time-import-args"
import { findProjectId, readUpgEnv, signInOperator, upgTargetFromArgv } from "./operator"
import { prepareUpgReferences, startDateFromManifest } from "./setup-references"

const PROJECT_CODE = "PERF-1"

/** The UPG ISOs again under other numbers: every ISO, spool, weld, support and flange number is renamed. */
function renumbered(copy: number): UpgIso[] {
  return isosOf(UPG_SPEC).map((iso) => {
    const seq = iso.seq + copy * 10_000
    const text = JSON.stringify(iso)
      .replaceAll(iso.isoNumber, isoNumberOf(UPG_SPEC, seq))
      .replaceAll(new RegExp(`\\b${iso.seq}-`, "g"), `${seq}-`)
    return { ...(JSON.parse(text) as UpgIso), seq }
  })
}

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

interface PhaseTimes {
  readonly registerMs: number
  readonly validateMs: number
  readonly applyMs: number
}

async function importOnce(client: SupabaseClient<Database>, projectId: string, copy: number, perJob: number): Promise<PhaseTimes> {
  const registerStarted = Date.now()
  const files = spoolgenFiles(UPG_SPEC, Array.from({ length: perJob }, (_, offset) => renumbered(copy + offset)).flat())
  const submission = buildSpoolgenSubmission(files)
  const job = await createSpoolingImportJob(client, projectId, `PERF copy ${copy}`)
  for (const role of Object.keys(files) as (keyof typeof files)[]) {
    const text = files[role]
    if (text === undefined) continue
    const file = new File([text], `${role}.txt`, { type: "text/plain" })
    const objectPath = `${projectId}/${job.id}/${role}.txt`
    await uploadSpoolgenFile(client, objectPath, file)
    await registerSpoolgenFile(client, job.id, role, file, await sha256Hex(text), objectPath)
  }
  await recordSpoolingValidation(client, job.id, submission.rows, submission.issues)
  const registerMs = Date.now() - registerStarted
  const validateStarted = Date.now()
  const counts = await revalidateSpoolingImportJob(client, job.id)
  const validateMs = Date.now() - validateStarted
  if (counts.blockerCount > 0) {
    const { data } = await client.from("import_job_issues").select("code, message, row_number").eq("job_id", job.id).eq("severity", "blocker").limit(3)
    throw new Error(`Copy ${copy}: ${counts.blockerCount} blockers, e.g. ${JSON.stringify(data)}`)
  }
  const started = Date.now()
  await applySpoolingImportJob(client, job.id)
  return { registerMs, validateMs, applyMs: Date.now() - started }
}

async function main(): Promise<void> {
  if (upgTargetFromArgv(process.argv) !== "local") throw new Error("demo:time-import runs on the local stand only.")
  const { copies, perJob } = parseTimeImportArgs(process.argv)

  const env = readUpgEnv(process.env, "local")
  const client = await signInOperator(env)
  let projectId = await findProjectId(client, PROJECT_CODE)
  if (!projectId) {
    const { data } = await client.auth.getUser()
    const created = await createProjectDefinition(client, data.user!.id, {
      activityCode: PROJECT_CODE,
      projectTitle: "Замер импорта",
      owner: UPG_SPEC.project.owner,
      contractor: UPG_SPEC.project.contractor,
      contractNumber: "",
      maxTransitTimeDays: UPG_SPEC.project.maxTransitTimeDays,
    })
    projectId = created.id
    console.log(`Created ${PROJECT_CODE}.`)
    await prepareUpgReferences(env, UPG_SPEC, PROJECT_CODE)
    for (const sheet of importSheets(UPG_SPEC, startDateFromManifest(UPG_SPEC)).filter((candidate) => candidate.importType !== "test_pack_composition")) {
      await importExcelFile(client, UPG_SPEC, projectId, sheet.importType, sheet.fileName)
    }
  }

  await createPwhtRules(client, UPG_SPEC, projectId)

  for (let copy = 1; copy <= copies; copy += perJob) {
    const { count } = await client.from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", projectId).like("iso_number", `${UPG_SPEC.isoPrefix}-${Math.floor((1001 + copy * 10_000) / 1000)}00-%`)
    if ((count ?? 0) > 0) { console.log(`copy ${copy}: already imported`); continue }
    const times = await importOnce(client, projectId, copy, perJob)
    console.log(`copies ${copy}-${copy + perJob - 1}: register ${times.registerMs} ms, validate ${times.validateMs} ms, apply ${times.applyMs} ms`)
  }
  const { count: isoCount } = await client.from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", projectId)
  console.log(`${PROJECT_CODE}: ${isoCount} ISOs`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
