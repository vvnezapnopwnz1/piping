/**
 * demo:project-setup — the referentials of an existing UPG-1 project.
 *
 *   --phase references    referentials without an Excel import (run after the project is created)
 *
 * The WPS and welder dates are columns of 02-wps.xlsx and 03-welders.xlsx (files.ts), taken from the
 * project start date: the server no longer invents them, and nothing sets them back afterwards.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { assertHostedSupabaseTarget } from "../demo/hosted-target"
import { assertLocalSupabaseTarget } from "../demo/local-target"
import { assertPublicDemoSupabaseTarget } from "../demo/public-demo-target"
import {
  createHostedSupabaseDemoStandCore,
  createPublicDemoSupabaseDemoStandCore,
  createSupabaseDemoStandCore,
} from "../demo/supabase-demo-stand"
import { UPG_PROJECT } from "./dataset"
import { UPG_FIXTURE_DIR } from "./files"
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
  if (target === "demo") {
    // The public demo holds no TRACK01 fixture, so the golden-project path cannot run there.
    assertPublicDemoSupabaseTarget(env.url)
    const projectId = await projectIdOf(env, projectCode)
    await createPublicDemoSupabaseDemoStandCore(env.url, env.serviceRoleKey).prepareStandaloneProjectReferences(
      projectId,
      UPG_REFERENCES,
      new Date(),
    )
    return
  }
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
  if (target !== "local") {
    console.log(`Target: ${env.url} (${target})`)
  }
  const projectCode = argument("--project") ?? UPG_PROJECT.activityCode
  const phase = argument("--phase")
  if (phase === "references") {
    await prepareUpgReferences(env, projectCode)
    console.log(`Referentials prepared for ${projectCode}.`)
  } else {
    throw new Error("Use --phase references.")
  }
}

if (process.argv[1]?.endsWith("setup-references.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
