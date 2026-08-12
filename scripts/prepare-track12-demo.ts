import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

import { assertLocalSupabaseTarget } from "./demo/local-target"
import {
  prepareDemoStand,
  type DemoStandPort,
} from "./demo/prepare"
import {
  DEMO_RECOVERY_COMMAND,
  type DemoCheckResult,
} from "./demo/preflight"
import { createSupabaseDemoStandCore } from "./demo/supabase-demo-stand"

const CONFIRMATION_ERROR =
  "Pass --confirm-local-reset to replace the local demo database."
const LOCAL_TARGET_ERROR =
  "Demo preparation requires an exact local Supabase HTTP origin."
const SERVICE_KEY_ERROR =
  "A nonblank Supabase service role key is required."
const PASSWORD_ERROR =
  "TRACK01_FIXTURE_PASSWORD must contain at least 12 characters."

export interface SpawnResult {
  readonly status: number | null
  readonly error?: unknown
}

export type SpawnSyncLike = (
  command: string,
  args: string[],
  options: { readonly stdio: "inherit" },
) => SpawnResult

export interface PrepareDemoInput {
  readonly argv: readonly string[]
  readonly supabaseUrl: string | undefined
  readonly serviceRoleKey: string | undefined
  readonly password: string | undefined
  readonly now: Date
}

export interface PrepareDemoDependencies {
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

export function parsePrepareArguments(
  argv: readonly string[],
): { confirmed: true } {
  if (argv.length !== 1 || argv[0] !== "--confirm-local-reset") {
    throw new Error(CONFIRMATION_ERROR)
  }
  return { confirmed: true }
}

export function runLocalReset(spawn: SpawnSyncLike): void {
  let result: SpawnResult
  try {
    result = spawn("supabase", ["db", "reset"], {
      stdio: "inherit",
    })
  } catch {
    throw new Error("The local database reset failed.")
  }
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("The local database reset failed.")
  }
}

function safeCheckId(id: string): string {
  const knownId = /^(?:projects|users\/access|preparation-anchor|readiness|isolation|spoolgen-package|reference:[A-Za-z]+|empty:TRACK01-[AB]:[a-z0-9_]+)$/
  return knownId.test(id) ? id : "unknown-check"
}

export function formatDemoCheck(check: DemoCheckResult): string {
  const status = check.ok ? "PASS" : "FAIL"
  const recovery = check.ok ? "" : ` recovery=${DEMO_RECOVERY_COMMAND}`
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

export async function runPrepareDemo(
  input: PrepareDemoInput,
  dependencies: PrepareDemoDependencies,
): Promise<0 | 1> {
  try {
    parsePrepareArguments(input.argv)
  } catch {
    dependencies.writeLine(CONFIRMATION_ERROR)
    return 1
  }

  let target: URL
  try {
    target = assertLocalSupabaseTarget(input.supabaseUrl ?? "")
  } catch {
    dependencies.writeLine(LOCAL_TARGET_ERROR)
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

  dependencies.writeLine(`Preparing local demo target ${target.origin}.`)
  dependencies.writeLine(
    "WARNING: local data will be replaced by the Track 12 demo stand.",
  )

  try {
    runLocalReset(dependencies.spawn)
  } catch {
    dependencies.writeLine("FAIL reset: local database reset failed.")
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
      dependencies.writeLine(formatDemoCheck(check))
    }
    return report.ok ? 0 : 1
  } catch {
    dependencies.writeLine(`FAIL ${stage}: demo preparation failed.`)
    return 1
  }
}

async function main(): Promise<0 | 1> {
  return runPrepareDemo(
    {
      argv: process.argv.slice(2),
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      password: process.env.TRACK01_FIXTURE_PASSWORD,
      now: new Date(),
    },
    {
      spawn: (command, args, options) =>
        spawnSync(command, args, options),
      createPort: createSupabaseDemoStandCore,
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
      console.error("FAIL preflight: demo preparation command failed.")
      process.exitCode = 1
    },
  )
}
