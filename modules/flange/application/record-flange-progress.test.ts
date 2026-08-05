import assert from "node:assert/strict"
import test from "node:test"
import { recordFlangeProgress, type FlangeRepository } from "./record-flange-progress"

test("use case normalizes the draft before calling the repository", async () => {
  const calls: unknown[] = []
  const repository: FlangeRepository = {
    listFlangeWorklist: async () => [],
    listFlangeHistory: async () => [],
    listFlangeFormOptions: async () => ({ categories: [], torquingRequirements: [], jointers: [] }),
    recordFlangeProgress: async (input) => {
      calls.push(input)
      return { id: "progress-1", ...input }
    },
    materializeFlangeProgressCopies: async () => ({ createdCount: 0 }),
  }

  const result = await recordFlangeProgress(repository, {
    projectId: " project-1 ",
    flangeJointRevisionId: "revision-1",
    jointCategoryId: "category-1",
    torquingRequirementId: "method-1",
    jointingValue: 120,
    jointDate: "2026-08-04",
    reportNumber: " R-1 ",
    tagNumber: " TAG-1 ",
    jointerIds: ["J-1", "J-2"],
    idempotencyKey: " action-1 ",
  })

  assert.equal(result.ok, true)
  assert.deepEqual(calls[0], {
    projectId: "project-1",
    flangeJointRevisionId: "revision-1",
    jointCategoryId: "category-1",
    torquingRequirementId: "method-1",
    jointingValue: 120,
    jointDate: "2026-08-04",
    reportNumber: "R-1",
    tagNumber: "TAG-1",
    jointerIds: ["J-1", "J-2"],
    idempotencyKey: "action-1",
  })
})

test("use case returns domain validation without calling the repository", async () => {
  let called = false
  const repository = { recordFlangeProgress: async () => { called = true; throw new Error("must not call") } } as unknown as FlangeRepository
  const result = await recordFlangeProgress(repository, {
    projectId: "project-1", flangeJointRevisionId: "revision-1", jointCategoryId: "category-1",
    torquingRequirementId: "method-1", jointingValue: 0, jointDate: "2026-08-04", reportNumber: "R", tagNumber: "T",
    jointerIds: [], idempotencyKey: "action-1",
  })
  assert.equal(result.ok, false)
  assert.equal(called, false)
})
