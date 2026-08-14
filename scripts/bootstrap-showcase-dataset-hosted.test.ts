import assert from "node:assert/strict"
import test from "node:test"

import {
  parseHostedShowcaseSeedArguments,
  runSeedHostedShowcase,
  type SeedHostedShowcaseDependencies,
  type SeedHostedShowcaseInput,
} from "./bootstrap-showcase-dataset-hosted"
import { PIPEQC_HOSTED_DEMO_PROJECT_REF } from "./demo/hosted-target"
import type { ShowcaseSeedContext } from "./bootstrap-showcase-dataset"
import type { ShowcaseSeedPort } from "./demo/supabase-demo-stand"

test("parseHostedShowcaseSeedArguments requires exactly the confirm flag", () => {
  assert.throws(() => parseHostedShowcaseSeedArguments([]))
  assert.throws(() => parseHostedShowcaseSeedArguments(["--wrong-flag"]))
  assert.doesNotThrow(() =>
    parseHostedShowcaseSeedArguments(["--confirm-hosted-showcase-seed"]),
  )
})

function baseInput(
  overrides: Partial<SeedHostedShowcaseInput> = {},
): SeedHostedShowcaseInput {
  return {
    argv: ["--confirm-hosted-showcase-seed"],
    supabaseUrl: `https://${PIPEQC_HOSTED_DEMO_PROJECT_REF}.supabase.co`,
    serviceRoleKey: "FAKE-SERVICE-KEY",
    password: "FAKE-PASSWORD-12345",
    ...overrides,
  }
}

function recordingDependencies(): SeedHostedShowcaseDependencies & {
  readonly lines: string[]
  readonly portCalls: string[]
  seedCalls: ShowcaseSeedContext[]
} {
  const lines: string[] = []
  const portCalls: string[] = []
  const seedCalls: ShowcaseSeedContext[] = []
  const port: ShowcaseSeedPort = {
    async resolveShowcasePrerequisiteIds() {
      portCalls.push("resolveShowcasePrerequisiteIds")
    },
    async prepareShowcaseProject() {
      portCalls.push("prepareShowcaseProject")
    },
    async prepareShowcaseAccess() {
      portCalls.push("prepareShowcaseAccess")
    },
    async prepareShowcaseProjectReferences() {
      portCalls.push("prepareShowcaseProjectReferences")
    },
  }
  return {
    lines,
    portCalls,
    seedCalls,
    createPort: () => port,
    fetchPublishableKey: () => "FAKE-PUBLISHABLE-KEY",
    seedEngineeringData: async (context) => {
      seedCalls.push(context)
    },
    writeLine: (line) => lines.push(line),
  }
}

test("runSeedHostedShowcase rejects a missing confirmation flag before any network call", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(
    baseInput({ argv: [] }),
    dependencies,
  )
  assert.equal(status, 1)
  assert.equal(dependencies.portCalls.length, 0)
  assert.equal(dependencies.seedCalls.length, 0)
})

test("runSeedHostedShowcase rejects a non-hosted URL before any network call", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(
    baseInput({ supabaseUrl: "http://127.0.0.1:54321" }),
    dependencies,
  )
  assert.equal(status, 1)
  assert.equal(dependencies.portCalls.length, 0)
})

test("runSeedHostedShowcase rejects a blank service key or password before any network call", async () => {
  const dependencies = recordingDependencies()
  assert.equal(
    await runSeedHostedShowcase(
      baseInput({ serviceRoleKey: "" }),
      dependencies,
    ),
    1,
  )
  assert.equal(
    await runSeedHostedShowcase(baseInput({ password: "" }), dependencies),
    1,
  )
  assert.equal(dependencies.portCalls.length, 0)
})

test("runSeedHostedShowcase runs project setup then engineering seeding in order, never leaking the password into a log line", async () => {
  const dependencies = recordingDependencies()
  const status = await runSeedHostedShowcase(baseInput(), dependencies)

  assert.equal(status, 0)
  assert.deepEqual(dependencies.portCalls, [
    "resolveShowcasePrerequisiteIds",
    "prepareShowcaseProject",
    "prepareShowcaseAccess",
    "prepareShowcaseProjectReferences",
  ])
  assert.equal(dependencies.seedCalls.length, 1)
  assert.deepEqual(dependencies.seedCalls[0], {
    url: `https://${PIPEQC_HOSTED_DEMO_PROJECT_REF}.supabase.co`,
    serviceKey: "FAKE-SERVICE-KEY",
    publishableKey: "FAKE-PUBLISHABLE-KEY",
    password: "FAKE-PASSWORD-12345",
    resetFlagPresent: false,
  })
  assert.equal(
    dependencies.lines.some((line) => line.includes("FAKE-PASSWORD")),
    false,
  )
})

test("runSeedHostedShowcase stops before engineering seeding when project setup fails, without a raw error message", async () => {
  const dependencies = recordingDependencies()
  dependencies.createPort = () => ({
    async resolveShowcasePrerequisiteIds() {
      throw new Error(
        "service_role_key=FAKE-SERVICE-KEY leaked-detail=should-not-appear",
      )
    },
    async prepareShowcaseProject() {},
    async prepareShowcaseAccess() {},
    async prepareShowcaseProjectReferences() {},
  })

  const status = await runSeedHostedShowcase(baseInput(), dependencies)

  assert.equal(status, 1)
  assert.equal(dependencies.seedCalls.length, 0)
  assert.equal(
    dependencies.lines.some((line) => line.includes("leaked-detail")),
    false,
  )
})
