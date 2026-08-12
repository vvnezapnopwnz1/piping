import { pathToFileURL } from "node:url"

import { assertHostedSupabaseTarget } from "./demo/hosted-target"
import {
  evaluateDemoStand,
  type DemoPreflightReport,
  type DemoStandSnapshot,
} from "./demo/preflight"
import { createHostedSupabaseDemoStandCore } from "./demo/supabase-demo-stand"
import {
  formatHostedDemoCheck,
  hostedAdminKeyFromEnvironment,
} from "./prepare-hosted-demo"

interface ReadOnlyDemoStandPort {
  readSnapshot(): Promise<DemoStandSnapshot>
}

export interface CheckHostedDemoInput {
  readonly supabaseUrl: string | undefined
  readonly serviceRoleKey: string | undefined
}

export interface CheckHostedDemoDependencies {
  readonly createPort: (
    url: string,
    serviceRoleKey: string,
  ) => ReadOnlyDemoStandPort
  readonly evaluate: (snapshot: DemoStandSnapshot) => DemoPreflightReport
  readonly writeLine: (line: string) => void
}

export async function runHostedCheckDemo(
  input: CheckHostedDemoInput,
  dependencies: CheckHostedDemoDependencies,
): Promise<0 | 1> {
  let target: URL
  try {
    target = assertHostedSupabaseTarget(input.supabaseUrl ?? "")
  } catch {
    dependencies.writeLine(
      "Demo check requires the configured PipeQC hosted demo origin.",
    )
    return 1
  }
  if (!input.serviceRoleKey || input.serviceRoleKey.trim() === "") {
    dependencies.writeLine(
      "A nonblank Supabase service role key is required.",
    )
    return 1
  }

  let port: ReadOnlyDemoStandPort
  try {
    port = dependencies.createPort(target.origin, input.serviceRoleKey)
  } catch {
    dependencies.writeLine("FAIL preflight: demo adapter creation failed.")
    return 1
  }

  try {
    const snapshot = await port.readSnapshot()
    const report = dependencies.evaluate(snapshot)
    for (const check of report.checks) {
      dependencies.writeLine(formatHostedDemoCheck(check))
    }
    return report.ok ? 0 : 1
  } catch {
    dependencies.writeLine("FAIL preflight: demo state check failed.")
    return 1
  }
}

async function main(): Promise<0 | 1> {
  return runHostedCheckDemo(
    {
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: hostedAdminKeyFromEnvironment(process.env),
    },
    {
      createPort: createHostedSupabaseDemoStandCore,
      evaluate: evaluateDemoStand,
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
      console.error("FAIL preflight: hosted demo check command failed.")
      process.exitCode = 1
    },
  )
}
