import { pathToFileURL } from "node:url"

import { assertLocalSupabaseTarget } from "./demo/local-target"
import {
  evaluateDemoStand,
  type DemoPreflightReport,
  type DemoStandSnapshot,
} from "./demo/preflight"
import { createSupabaseDemoStandCore } from "./demo/supabase-demo-stand"
import { formatDemoCheck } from "./prepare-track12-demo"

interface ReadOnlyDemoStandPort {
  readSnapshot(): Promise<DemoStandSnapshot>
}

export interface CheckDemoInput {
  readonly supabaseUrl: string | undefined
  readonly serviceRoleKey: string | undefined
}

export interface CheckDemoDependencies {
  readonly createPort: (
    url: string,
    serviceRoleKey: string,
  ) => ReadOnlyDemoStandPort
  readonly evaluate: (snapshot: DemoStandSnapshot) => DemoPreflightReport
  readonly writeLine: (line: string) => void
}

export async function runCheckDemo(
  input: CheckDemoInput,
  dependencies: CheckDemoDependencies,
): Promise<0 | 1> {
  let target: URL
  try {
    target = assertLocalSupabaseTarget(input.supabaseUrl ?? "")
  } catch {
    dependencies.writeLine(
      "Demo check requires an exact local Supabase HTTP origin.",
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
      dependencies.writeLine(formatDemoCheck(check))
    }
    return report.ok ? 0 : 1
  } catch {
    dependencies.writeLine("FAIL preflight: demo state check failed.")
    return 1
  }
}

async function main(): Promise<0 | 1> {
  return runCheckDemo(
    {
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      createPort: createSupabaseDemoStandCore,
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
      console.error("FAIL preflight: demo check command failed.")
      process.exitCode = 1
    },
  )
}
