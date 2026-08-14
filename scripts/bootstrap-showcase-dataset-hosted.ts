import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

import {
  seedShowcaseEngineeringData,
  type ShowcaseSeedContext,
} from "./bootstrap-showcase-dataset"
import {
  PIPEQC_HOSTED_DEMO_PROJECT_REF,
  assertHostedSupabaseTarget,
} from "./demo/hosted-target"
import { createHostedSupabaseDemoStandCore } from "./demo/supabase-demo-stand"
import type { ShowcaseSeedPort } from "./demo/supabase-demo-stand"
import { hostedAdminKeyFromEnvironment } from "./prepare-hosted-demo"

const CONFIRMATION_ERROR =
  "Pass --confirm-hosted-showcase-seed to seed SHOWCASE-1 on the hosted demo database."
const HOSTED_TARGET_ERROR =
  "Demo preparation requires the configured PipeQC hosted demo origin."
const SERVICE_KEY_ERROR = "A nonblank Supabase service role key is required."
const PASSWORD_ERROR = "TRACK01_FIXTURE_PASSWORD must be set."

export interface SeedHostedShowcaseInput {
  readonly argv: readonly string[]
  readonly supabaseUrl: string | undefined
  readonly serviceRoleKey: string | undefined
  readonly password: string | undefined
}

export interface SeedHostedShowcaseDependencies {
  createPort: (url: string, serviceRoleKey: string) => ShowcaseSeedPort
  fetchPublishableKey: () => string
  seedEngineeringData: (
    context: ShowcaseSeedContext,
    log: (line: string) => void,
  ) => Promise<void>
  readonly writeLine: (line: string) => void
}

export function parseHostedShowcaseSeedArguments(
  argv: readonly string[],
): { confirmed: true } {
  if (argv.length !== 1 || argv[0] !== "--confirm-hosted-showcase-seed") {
    throw new Error(CONFIRMATION_ERROR)
  }
  return { confirmed: true }
}

export type SpawnCaptureLike = (
  command: string,
  args: readonly string[],
) => { readonly status: number | null; readonly stdout: string }

export function fetchHostedPublishableKey(
  spawn: SpawnCaptureLike = (command, args) =>
    spawnSync(command, args, { encoding: "utf8" }),
): string {
  const result = spawn("supabase", [
    "projects",
    "api-keys",
    "--project-ref",
    PIPEQC_HOSTED_DEMO_PROJECT_REF,
    "--output-format",
    "json",
  ])
  if (result.status !== 0 || !result.stdout) {
    throw new Error("Fetching the hosted publishable key failed.")
  }
  let parsed: {
    readonly keys: readonly { readonly type: string; readonly api_key: string }[]
  }
  try {
    parsed = JSON.parse(result.stdout) as {
      readonly keys: readonly { readonly type: string; readonly api_key: string }[]
    }
  } catch {
    throw new Error("The hosted publishable key response was not valid JSON.")
  }
  const publishable = parsed.keys.find((key) => key.type === "publishable")
  if (!publishable) {
    throw new Error("The hosted project has no publishable API key.")
  }
  return publishable.api_key
}

export async function runSeedHostedShowcase(
  input: SeedHostedShowcaseInput,
  dependencies: SeedHostedShowcaseDependencies,
): Promise<0 | 1> {
  try {
    parseHostedShowcaseSeedArguments(input.argv)
  } catch {
    dependencies.writeLine(CONFIRMATION_ERROR)
    return 1
  }

  let target: URL
  try {
    target = assertHostedSupabaseTarget(input.supabaseUrl ?? "")
  } catch {
    dependencies.writeLine(HOSTED_TARGET_ERROR)
    return 1
  }
  if (!input.serviceRoleKey || input.serviceRoleKey.trim() === "") {
    dependencies.writeLine(SERVICE_KEY_ERROR)
    return 1
  }
  if (!input.password || input.password.trim() === "") {
    dependencies.writeLine(PASSWORD_ERROR)
    return 1
  }

  dependencies.writeLine(`Seeding SHOWCASE-1 on hosted target ${target.origin}.`)

  let port: ShowcaseSeedPort
  try {
    port = dependencies.createPort(target.origin, input.serviceRoleKey)
  } catch {
    dependencies.writeLine("FAIL preflight: demo adapter creation failed.")
    return 1
  }

  try {
    await port.resolveShowcasePrerequisiteIds()
    await port.prepareShowcaseProject()
    await port.prepareShowcaseAccess()
    await port.prepareShowcaseProjectReferences(new Date())
  } catch {
    dependencies.writeLine("FAIL project-setup: preparing SHOWCASE-1 failed.")
    return 1
  }

  let publishableKey: string
  try {
    publishableKey = dependencies.fetchPublishableKey()
  } catch {
    dependencies.writeLine("FAIL preflight: fetching the publishable key failed.")
    return 1
  }

  try {
    await dependencies.seedEngineeringData(
      {
        url: target.origin,
        serviceKey: input.serviceRoleKey,
        publishableKey,
        password: input.password,
        resetFlagPresent: false,
      },
      dependencies.writeLine,
    )
  } catch {
    dependencies.writeLine("FAIL engineering-data: seeding the showcase dataset failed.")
    return 1
  }

  dependencies.writeLine("SHOWCASE-1 seeded on the hosted demo stand.")
  return 0
}

async function main(): Promise<0 | 1> {
  return runSeedHostedShowcase(
    {
      argv: process.argv.slice(2),
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: hostedAdminKeyFromEnvironment(process.env),
      password: process.env.TRACK01_FIXTURE_PASSWORD,
    },
    {
      createPort: createHostedSupabaseDemoStandCore,
      fetchPublishableKey: fetchHostedPublishableKey,
      seedEngineeringData: seedShowcaseEngineeringData,
      writeLine: (line) => console.log(line),
    },
  )
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  void main().then(
    (status) => {
      process.exitCode = status
    },
    () => {
      console.error("FAIL preflight: hosted showcase seed command failed.")
      process.exitCode = 1
    },
  )
}
