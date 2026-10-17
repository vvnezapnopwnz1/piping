/**
 * demo:project-setup — the referentials of an existing UPG-1 project.
 *
 *   --phase references    referentials without an Excel import (run after the project is created)
 *   --phase backdate-wps  WPS approval dates to before the project started (run after 02-wps.xlsx)
 *
 * The WPS import has no approval column and stamps today (apply_import_commands.sql:461), while
 * record_weld_progress refuses a weld dated before its WPS approval. A real contractor approves
 * procedures before work starts, so the date is set back to that; the walkthrough journal records
 * the missing column as a finding.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { assertHostedSupabaseTarget } from "../demo/hosted-target"
import { assertLocalSupabaseTarget } from "../demo/local-target"
import {
  createHostedSupabaseDemoStandCore,
  createSupabaseDemoStandCore,
} from "../demo/supabase-demo-stand"
import { UPG_PROJECT } from "./dataset"
import { UPG_FIXTURE_DIR, addDays } from "./files"
import { readUpgEnv, upgTargetFromArgv, type UpgTarget } from "./operator"
import { UPG_REFERENCES } from "./references"

export interface ServiceEnv {
  readonly url: string
  readonly serviceRoleKey: string
  readonly target?: UpgTarget
}

async function projectIdOf(env: ServiceEnv, projectCode: string): Promise<string> {
  const admin = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false } })
  const { data, error } = await admin.from("projects").select("id").eq("activity_code", projectCode).maybeSingle()
  if (error) throw new Error(`Reading project ${projectCode} failed: ${error.message}`)
  if (!data) throw new Error(`Project ${projectCode} does not exist. Create it in Project Setup → Definition first.`)
  return (data as { id: string }).id
}

export async function prepareUpgReferences(env: ServiceEnv, projectCode: string): Promise<void> {
  const target = env.target ?? "local"
  if (target === "hosted") {
    assertHostedSupabaseTarget(env.url)
  } else {
    assertLocalSupabaseTarget(env.url)
  }
  const projectId = await projectIdOf(env, projectCode)
  const core = target === "hosted"
    ? createHostedSupabaseDemoStandCore(env.url, env.serviceRoleKey)
    : createSupabaseDemoStandCore(env.url, env.serviceRoleKey)
  await core.resolveShowcasePrerequisiteIds()
  await core.prepareProjectReferencesFor(projectId, UPG_REFERENCES, new Date())
}

export async function backdateUpgWps(env: ServiceEnv, projectCode: string, approvedOn: string): Promise<number> {
  const target = env.target ?? "local"
  if (target === "hosted") {
    assertHostedSupabaseTarget(env.url)
  } else {
    assertLocalSupabaseTarget(env.url)
  }
  const projectId = await projectIdOf(env, projectCode)
  const admin = createClient(env.url, env.serviceRoleKey, { auth: { persistSession: false } })
  const { data, error } = await admin
    .from("project_welding_procedures")
    .update({ approved_on: approvedOn })
    .eq("project_id", projectId)
    .select("id")
  if (error) throw new Error(`Backdating WPS approval failed: ${error.message}`)
  return (data ?? []).length
}

export function startDateFromManifest(): string {
  return (JSON.parse(readFileSync(join(UPG_FIXTURE_DIR, "manifest.json"), "utf8")) as { startDate: string }).startDate
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<void> {
  const target = upgTargetFromArgv(process.argv)
  const env = readUpgEnv(process.env, target)
  if (target === "hosted") {
    console.log(`Target: ${env.url} (hosted)`)
  }
  const projectCode = argument("--project") ?? UPG_PROJECT.activityCode
  const phase = argument("--phase")
  if (phase === "references") {
    await prepareUpgReferences(env, projectCode)
    console.log(`Referentials prepared for ${projectCode}.`)
  } else if (phase === "backdate-wps") {
    const approvedOn = addDays(startDateFromManifest(), -14)
    const count = await backdateUpgWps(env, projectCode, approvedOn)
    console.log(`${count} WPS of ${projectCode} approved on ${approvedOn}.`)
  } else {
    throw new Error("Use --phase references or --phase backdate-wps.")
  }
}

if (process.argv[1]?.endsWith("setup-references.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
