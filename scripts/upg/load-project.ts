import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { createProjectDefinition } from "../../lib/supabase/project-definition"
import { toStoredIssues, validateSheet } from "../../modules/imports/application/create-import"
import type { ImportType } from "../../modules/imports/domain/import-type"
import {
  applyImportJob,
  createImportJob,
  importObjectPath,
  markImportJobUploaded,
  recordImportValidation,
  uploadImportFile,
} from "../../modules/imports/infrastructure/supabase-import-repository"
import { computeChecksum, readFirstSheetMatrix } from "../../modules/imports/infrastructure/xlsx-workbook"
import { createNdeMatrixRule } from "../../modules/project-setup/infrastructure/supabase-welding-quality-reference-repository"
import { PWHT_FORM_RULES, UPG_PROJECT } from "./dataset"
import { addDays, importSheets } from "./files"
import { findProjectId, readFixtureBytes, readFixtureText, readUpgEnv, signInOperator, upgTargetFromArgv, type UpgEnv } from "./operator"
import { importSpoolgenPackage } from "./import-spooling"
import { backdateUpgWps, prepareUpgReferences, startDateFromManifest } from "./setup-references"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function importExcelFile(
  client: SupabaseClient<Database>,
  projectId: string,
  importType: ImportType,
  fileName: string,
): Promise<{ jobId: string; applied: number; skipped: boolean }> {
  const { data: done } = await client
    .from("import_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("import_type", importType)
    .eq("status", "applied")
    .limit(1)
  if ((done ?? []).length > 0) return { jobId: (done as { id: string }[])[0].id, applied: 0, skipped: true }

  const bytes = readFixtureBytes(`imports/${fileName}`)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const outcome = validateSheet(importType, readFirstSheetMatrix(buffer))
  const blockers = outcome.issues.filter((issue) => issue.severity === "blocker")
  if (blockers.length > 0) throw new Error(`${fileName}: ${blockers.length} blockers before upload.`)
  const job = await createImportJob(client, {
    projectId,
    importType,
    fileName,
    mediaType: XLSX_TYPE,
    sizeBytes: bytes.byteLength,
    checksum: await computeChecksum(buffer),
  })
  const objectPath = importObjectPath(projectId, job.id, fileName)
  await uploadImportFile(client, objectPath, new File([bytes], fileName, { type: XLSX_TYPE }))
  await markImportJobUploaded(client, job.id, objectPath)
  await recordImportValidation(client, job.id, outcome.rows, toStoredIssues(outcome.issues))
  const applied = await applyImportJob(client, job.id, false, importType)
  return { jobId: job.id, applied: applied.appliedRowCount, skipped: false }
}

async function idByCode(client: SupabaseClient<Database>, table: "project_service_classes" | "project_weld_types", projectId: string, code: string): Promise<string> {
  const { data, error } = await client.from(table).select("id").eq("project_id", projectId).eq("code", code).maybeSingle()
  if (error || !data) throw new Error(`${table} ${code} is missing in the project.`)
  return (data as { id: string }).id
}

async function createPwhtRules(client: SupabaseClient<Database>, projectId: string): Promise<number> {
  const { data: existing } = await client.from("nde_matrix_rules").select("id").eq("project_id", projectId).eq("pwht_required", true)
  if ((existing ?? []).length > 0) return 0
  for (const rule of PWHT_FORM_RULES) {
    await createNdeMatrixRule(client, projectId, {
      serviceClassId: await idByCode(client, "project_service_classes", projectId, rule.serviceClass),
      weldTypeId: await idByCode(client, "project_weld_types", projectId, rule.weldType),
      weldLocation: rule.location,
      rtCoverage: rule.rt,
      utCoverage: 0,
      mtCoverage: rule.mt,
      ptCoverage: rule.pt,
      pmiCoverage: 0,
      htCoverage: 0,
      pwhtRequired: true,
      pwhtThicknessThreshold: rule.pwhtThresholdMm,
      materialTraceabilityRequired: false,
    })
  }
  return PWHT_FORM_RULES.length
}

export async function loadUpgProject(env: UpgEnv, options: { createProject: boolean }): Promise<void> {
  const client = await signInOperator(env)
  let projectId = await findProjectId(client, UPG_PROJECT.activityCode)
  if (!projectId) {
    if (!options.createProject) throw new Error(`${UPG_PROJECT.activityCode} does not exist; pass --create-project.`)
    const { data } = await client.auth.getUser()
    const created = await createProjectDefinition(client, data.user!.id, {
      activityCode: UPG_PROJECT.activityCode,
      projectTitle: UPG_PROJECT.projectTitle,
      owner: UPG_PROJECT.owner,
      contractor: UPG_PROJECT.contractor,
      contractNumber: UPG_PROJECT.contractNumber,
      maxTransitTimeDays: UPG_PROJECT.maxTransitTimeDays,
    })
    projectId = created.id
    console.log(`Created ${UPG_PROJECT.activityCode}.`)
  }

  await prepareUpgReferences(env, UPG_PROJECT.activityCode)
  console.log("Referentials prepared.")

  const sheets = importSheets(startDateFromManifest())
  for (const sheet of sheets.filter((candidate) => candidate.importType !== "test_pack_composition")) {
    const result = await importExcelFile(client, projectId, sheet.importType, sheet.fileName)
    console.log(`${sheet.fileName}: ${result.skipped ? "already applied" : `${result.applied} rows`}`)
  }
  console.log(`PWHT form rules created: ${await createPwhtRules(client, projectId)}`)
  console.log(`WPS backdated: ${await backdateUpgWps(env, UPG_PROJECT.activityCode, addDays(startDateFromManifest(), -14))}`)

  const blocked = await importSpoolgenPackage(client, projectId, { weld: readFixtureText("error/weld.txt") }, "UPG-1 error set", { expectBlockers: true })
  console.log(`Error set: ${blocked.status}, ${blocked.blockerCount} blockers (expected blocked).`)
  if (blocked.status !== "blocked") throw new Error("The error set was applied; it must be blocked by the missing thickness rule.")

  const { count } = await client.from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", projectId)
  if ((count ?? 0) === 0) {
    const main = await importSpoolgenPackage(client, projectId, {
      weld: readFixtureText("spooling/weld.txt"),
      trace: readFixtureText("spooling/trace.txt"),
      bolt: readFixtureText("spooling/bolt.txt"),
      supp: readFixtureText("spooling/supp.txt"),
    }, "UPG-1 R0")
    console.log(`Spooling R0: ${main.status}, ${main.warningCount} warnings.`)
  } else {
    console.log("Spooling R0: already imported.")
  }

  const composition = sheets.find((candidate) => candidate.importType === "test_pack_composition")!
  const packs = await importExcelFile(client, projectId, composition.importType, composition.fileName)
  console.log(`${composition.fileName}: ${packs.skipped ? "already applied" : `${packs.applied} rows`}`)
}

if (process.argv[1]?.endsWith("load-project.ts")) {
  const target = upgTargetFromArgv(process.argv)
  const env = readUpgEnv(process.env, target)
  if (target === "hosted") {
    console.log(`Target: ${env.url} (hosted)`)
  }
  loadUpgProject(env, { createProject: process.argv.includes("--create-project") }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
