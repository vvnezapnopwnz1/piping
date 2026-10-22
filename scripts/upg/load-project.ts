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
import { specFromArgv } from "./dataset-arg"
import { importSheets } from "./files"
import { findProjectId, readFixtureBytes, readFixtureText, readUpgEnv, signInOperator, upgTargetFromArgv, type UpgEnv } from "./operator"
import { importSpoolgenPackage } from "./import-spooling"
import { prepareUpgReferences, startDateFromManifest } from "./setup-references"
import type { ProjectSpec } from "./spec"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function importExcelFile(
  client: SupabaseClient<Database>,
  spec: ProjectSpec,
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

  const bytes = readFixtureBytes(spec, `imports/${fileName}`)
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

export async function createPwhtRules(client: SupabaseClient<Database>, spec: ProjectSpec, projectId: string): Promise<number> {
  const { data: existing } = await client.from("nde_matrix_rules").select("id").eq("project_id", projectId).eq("pwht_required", true)
  if ((existing ?? []).length > 0) return 0
  for (const rule of spec.pwhtFormRules) {
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
  return spec.pwhtFormRules.length
}

export async function loadUpgProject(env: UpgEnv, spec: ProjectSpec, options: { createProject: boolean }): Promise<void> {
  const client = await signInOperator(env)
  let projectId = await findProjectId(client, spec.project.activityCode)
  if (!projectId) {
    if (!options.createProject) throw new Error(`${spec.project.activityCode} does not exist; pass --create-project.`)
    const { data } = await client.auth.getUser()
    const created = await createProjectDefinition(client, data.user!.id, {
      activityCode: spec.project.activityCode,
      projectTitle: spec.project.projectTitle,
      owner: spec.project.owner,
      contractor: spec.project.contractor,
      contractNumber: spec.project.contractNumber,
      maxTransitTimeDays: spec.project.maxTransitTimeDays,
    })
    projectId = created.id
    console.log(`Created ${spec.project.activityCode}.`)
  }

  await prepareUpgReferences(env, spec, spec.project.activityCode)
  console.log("Referentials prepared.")

  const sheets = importSheets(spec, startDateFromManifest(spec))
  for (const sheet of sheets.filter((candidate) => candidate.importType !== "test_pack_composition")) {
    const result = await importExcelFile(client, spec, projectId, sheet.importType, sheet.fileName)
    console.log(`${sheet.fileName}: ${result.skipped ? "already applied" : `${result.applied} rows`}`)
  }
  console.log(`PWHT form rules created: ${await createPwhtRules(client, spec, projectId)}`)

  if (spec.special.errorIso) {
    const blocked = await importSpoolgenPackage(client, projectId, { weld: readFixtureText(spec, "error/weld.txt") }, `${spec.project.activityCode} error set`, { expectBlockers: true })
    console.log(`Error set: ${blocked.status}, ${blocked.blockerCount} blockers (expected blocked).`)
    if (blocked.status !== "blocked") throw new Error("The error set was applied; it must be blocked by the missing thickness rule.")
  }

  const { count } = await client.from("isometrics").select("id", { count: "exact", head: true }).eq("project_id", projectId)
  if ((count ?? 0) === 0) {
    const main = await importSpoolgenPackage(client, projectId, {
      weld: readFixtureText(spec, "spooling/weld.txt"),
      trace: readFixtureText(spec, "spooling/trace.txt"),
      bolt: readFixtureText(spec, "spooling/bolt.txt"),
      supp: readFixtureText(spec, "spooling/supp.txt"),
    }, `${spec.project.activityCode} R0`)
    console.log(`Spooling R0: ${main.status}, ${main.warningCount} warnings.`)
  } else {
    console.log("Spooling R0: already imported.")
  }

  const composition = sheets.find((candidate) => candidate.importType === "test_pack_composition")!
  const packs = await importExcelFile(client, spec, projectId, composition.importType, composition.fileName)
  console.log(`${composition.fileName}: ${packs.skipped ? "already applied" : `${packs.applied} rows`}`)
}

if (process.argv[1]?.endsWith("load-project.ts")) {
  // Inside the async body so that an unknown --dataset or a missing variable prints a message, not a stack.
  void (async () => {
    const spec = specFromArgv(process.argv)
    const target = upgTargetFromArgv(process.argv)
    const env = readUpgEnv(process.env, target)
    if (target !== "local") {
      console.log(`Target: ${env.url} (${target})`)
    }
    await loadUpgProject(env, spec, { createProject: process.argv.includes("--create-project") })
  })().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
