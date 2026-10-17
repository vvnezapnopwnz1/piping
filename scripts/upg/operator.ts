import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Database } from "../../lib/supabase/database.types"
import { assertHostedSupabaseTarget } from "../demo/hosted-target"
import { hostedAdminKeyFromEnvironment } from "../prepare-hosted-demo"
import { isLocalhost } from "../spoolgen-fixture-import"
import { UPG_FIXTURE_DIR } from "./files"

/** The account that creates UPG-1 in the UI, and so its project admin. */
export const UPG_OPERATOR_EMAIL = "track01.platform-admin@example.test"

export type UpgTarget = "local" | "hosted"

export const UPG_HOSTED_CONFIRMATION = "--confirm-hosted-upg"

export interface UpgEnv {
  readonly url: string
  readonly publishableKey: string
  readonly password: string
  readonly serviceRoleKey: string
  readonly target: UpgTarget
}

export function upgTargetFromArgv(argv: readonly string[]): UpgTarget {
  return argv.includes(UPG_HOSTED_CONFIRMATION) ? "hosted" : "local"
}

export function readUpgEnv(
  env: NodeJS.ProcessEnv = process.env,
  target: UpgTarget = "local",
): UpgEnv {
  if (target === "hosted") {
    const targetUrl = assertHostedSupabaseTarget(env.SUPABASE_URL ?? "")
    const url = targetUrl.origin
    const serviceRoleKey = hostedAdminKeyFromEnvironment(env)?.trim() ?? ""
    const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? ""
    const password = env.TRACK01_FIXTURE_PASSWORD ?? ""

    const missing: string[] = []
    if (!serviceRoleKey) missing.push("SUPABASE_SECRET_KEY")
    if (!publishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY")
    if (!password) missing.push("TRACK01_FIXTURE_PASSWORD")

    if (missing.length > 0) {
      throw new Error(
        `${missing.join(", ")} must be set in ~/.pipeqc-hosted.env.`,
      )
    }

    return { url, publishableKey, password, serviceRoleKey, target }
  }

  const url = env.SUPABASE_URL ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
  const password = env.TRACK01_FIXTURE_PASSWORD ?? ""
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!publishableKey || !password || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.")
  }
  return { url, publishableKey, password, serviceRoleKey, target }
}

export async function signInOperator(env: UpgEnv): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(env.url, env.publishableKey, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: UPG_OPERATOR_EMAIL, password: env.password })
  if (error) throw new Error(`Could not sign in as ${UPG_OPERATOR_EMAIL}: ${error.message}`)
  return client
}

export async function findProjectId(client: SupabaseClient<Database>, activityCode: string): Promise<string | null> {
  const { data, error } = await client.from("projects").select("id").eq("activity_code", activityCode).maybeSingle()
  if (error) throw new Error(`Reading project ${activityCode} failed: ${error.message}`)
  return (data as { id: string } | null)?.id ?? null
}

export const readFixtureText = (relative: string): string => readFileSync(join(UPG_FIXTURE_DIR, relative), "utf8")
export const readFixtureBytes = (relative: string): Uint8Array => new Uint8Array(readFileSync(join(UPG_FIXTURE_DIR, relative)))
