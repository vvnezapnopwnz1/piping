import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

import {
  PIPEQC_HOSTED_DEMO_PROJECT_REF,
  assertHostedSupabaseTarget,
} from "./demo/hosted-target"
import {
  prepareDemoStand,
  type DemoStandPort,
} from "./demo/prepare"
import { type DemoCheckResult } from "./demo/preflight"
import { createHostedSupabaseDemoStandCore } from "./demo/supabase-demo-stand"
import { type PrepareDemoInput, type SpawnSyncLike } from "./prepare-track12-demo"

const CONFIRMATION_ERROR =
  "Pass --confirm-hosted-reset to replace the hosted demo database."
const HOSTED_TARGET_ERROR =
  "Demo preparation requires the configured PipeQC hosted demo origin."
const SERVICE_KEY_ERROR =
  "A nonblank Supabase service role key is required."
const PASSWORD_ERROR =
  "TRACK01_FIXTURE_PASSWORD must contain at least 12 characters."

export interface PrepareHostedDemoDependencies {
  readonly spawn: SpawnSyncLike
  readonly createPort: (
    url: string,
    serviceRoleKey: string,
  ) => DemoStandPort
  readonly writeLine: (line: string) => void
}

type PrepareStage =
  | "users"
  | "projects"
  | "access"
  | "system references"
  | "project references"
  | "preflight"

export function hostedAdminKeyFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): string | undefined {
  return environment.SUPABASE_SECRET_KEY?.trim()
    ? environment.SUPABASE_SECRET_KEY
    : environment.SUPABASE_SERVICE_ROLE_KEY
}

export function parseHostedPrepareArguments(
  argv: readonly string[],
): { confirmed: true } {
  if (argv.length !== 1 || argv[0] !== "--confirm-hosted-reset") {
    throw new Error(CONFIRMATION_ERROR)
  }
  return { confirmed: true }
}

function runCommand(spawn: SpawnSyncLike, args: string[]): void {
  let result
  try {
    result = spawn("supabase", args, { stdio: "inherit" })
  } catch {
    throw new Error("The hosted database reset failed.")
  }
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("The hosted database reset failed.")
  }
}

export function runHostedReset(spawn: SpawnSyncLike): void {
  runCommand(spawn, ["link", "--project-ref", PIPEQC_HOSTED_DEMO_PROJECT_REF])
  runCommand(spawn, ["db", "reset", "--linked", "--yes"])
}

function safeCheckId(id: string): string {
  const knownId = /^(?:projects|users\/access|preparation-anchor|readiness|isolation|spoolgen-package|reference:[A-Za-z]+|empty:TRACK01-[AB]:[a-z0-9_]+)$/
  return knownId.test(id) ? id : "unknown-check"
}

export function formatHostedDemoCheck(check: DemoCheckResult): string {
  const status = check.ok ? "PASS" : "FAIL"
  const recovery = check.ok
    ? ""
    : " recovery=npm run demo:prepare:hosted -- --confirm-hosted-reset"
  return `${status} check=${safeCheckId(check.id)}${recovery}`
}

function utcPreparationDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function stagedPort(
  port: DemoStandPort,
  setStage: (stage: PrepareStage) => void,
): DemoStandPort {
  return {
    async prepareUsers(password) {
      setStage("users")
      await port.prepareUsers(password)
    },
    async prepareProjects() {
      setStage("projects")
      await port.prepareProjects()
    },
    async prepareAccess() {
      setStage("access")
      await port.prepareAccess()
    },
    async prepareSystemReferences() {
      setStage("system references")
      await port.prepareSystemReferences()
    },
    async prepareProjectReferences(preparedOn) {
      setStage("project references")
      await port.prepareProjectReferences(preparedOn)
    },
    async readSnapshot() {
      setStage("preflight")
      return port.readSnapshot()
    },
  }
}

export async function runPrepareHostedDemo(
  input: PrepareDemoInput,
  dependencies: PrepareHostedDemoDependencies,
): Promise<0 | 1> {
  try {
    parseHostedPrepareArguments(input.argv)
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
  if (!input.password || input.password.trim().length < 12) {
    dependencies.writeLine(PASSWORD_ERROR)
    return 1
  }

  dependencies.writeLine(`Preparing hosted demo target ${target.origin}.`)
  dependencies.writeLine(
    "WARNING: hosted demo data will be replaced by the Track 12 demo stand.",
  )

  try {
    runHostedReset(dependencies.spawn)
  } catch {
    dependencies.writeLine("FAIL reset: hosted database reset failed.")
    return 1
  }

  let port: DemoStandPort
  try {
    port = dependencies.createPort(target.origin, input.serviceRoleKey)
  } catch {
    dependencies.writeLine("FAIL preflight: demo adapter creation failed.")
    return 1
  }

  let stage: PrepareStage = "users"
  try {
    const report = await prepareDemoStand(
      stagedPort(port, (nextStage) => {
        stage = nextStage
      }),
      input.password,
      utcPreparationDay(input.now),
    )
    for (const check of report.checks) {
      dependencies.writeLine(formatHostedDemoCheck(check))
    }
    return report.ok ? 0 : 1
  } catch {
    dependencies.writeLine(`FAIL ${stage}: demo preparation failed.`)
    return 1
  }
}

async function main(): Promise<0 | 1> {
  return runPrepareHostedDemo(
    {
      argv: process.argv.slice(2),
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: hostedAdminKeyFromEnvironment(process.env),
      password: process.env.TRACK01_FIXTURE_PASSWORD,
      now: new Date(),
    },
    {
      spawn: (command, args, options) => spawnSync(command, args, options),
      createPort: createHostedSupabaseDemoStandCore,
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
      console.error("FAIL preflight: hosted demo preparation command failed.")
      process.exitCode = 1
    },
  )
}
