import assert from "node:assert/strict"
import test from "node:test"
import {
  clearSavedMaterialDrafts,
  createMaterialRequestOwner,
  type MaterialDrafts,
} from "./material-check-draft"
import type { TraceEntry } from "../domain/material-check"

test("clearSavedMaterialDrafts removes only matching submitted entries", () => {
  const currentDrafts: MaterialDrafts = {
    "bom-1": {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-1",
      identCode: "ID-1",
      traceNumber: "Heat-ab12",
      quantity: 1,
      mrrNumber: "MRR-101",
    },
    "bom-2": {
      spoolRevisionMaterialId: "bom-2",
      pipingMaterialRecordId: "pml-2",
      identCode: "ID-2",
      traceNumber: "H2",
      quantity: 2,
      mrrNumber: "MRR-102",
    },
  }

  const submitted: TraceEntry[] = [
    {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-1",
      identCode: "ID-1",
      traceNumber: "Heat-ab12",
      quantity: 1,
    },
  ]

  const next = clearSavedMaterialDrafts(currentDrafts, submitted)
  assert.equal(next["bom-1"], undefined)
  assert.deepEqual(next["bom-2"], currentDrafts["bom-2"])
})

test("clearSavedMaterialDrafts preserves newer draft if user changed choice during async save", () => {
  const currentDrafts: MaterialDrafts = {
    "bom-1": {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-newer",
      identCode: "ID-1",
      traceNumber: "Heat-newer",
      quantity: 1,
      mrrNumber: "MRR-999",
    },
  }

  const previouslySubmitted: TraceEntry[] = [
    {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-older",
      identCode: "ID-1",
      traceNumber: "Heat-older",
      quantity: 1,
    },
  ]

  const next = clearSavedMaterialDrafts(currentDrafts, previouslySubmitted)
  assert.deepEqual(next["bom-1"], currentDrafts["bom-1"])
})

test("clearSavedMaterialDrafts preserves draft if quantity changed", () => {
  const currentDrafts: MaterialDrafts = {
    "bom-1": {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-1",
      identCode: "ID-1",
      traceNumber: "Heat-1",
      quantity: 5,
      mrrNumber: "MRR-1",
    },
  }

  const previouslySubmitted: TraceEntry[] = [
    {
      spoolRevisionMaterialId: "bom-1",
      pipingMaterialRecordId: "pml-1",
      identCode: "ID-1",
      traceNumber: "Heat-1",
      quantity: 2,
    },
  ]

  const next = clearSavedMaterialDrafts(currentDrafts, previouslySubmitted)
  assert.deepEqual(next["bom-1"], currentDrafts["bom-1"])
})

test("createMaterialRequestOwner manages request generation and invalidation", () => {
  const owner = createMaterialRequestOwner()
  const token1 = owner.begin()
  assert.equal(owner.isCurrent(token1), true)

  const token2 = owner.begin()
  assert.equal(owner.isCurrent(token1), false)
  assert.equal(owner.isCurrent(token2), true)

  owner.invalidate()
  assert.equal(owner.isCurrent(token2), false)
})

test("createMaterialRequestOwner handles out-of-order deferred responses", async () => {
  const owner = createMaterialRequestOwner()

  let resolveA!: (value: string) => void
  let resolveB!: (value: string) => void

  const promiseA = new Promise<string>((resolve) => {
    resolveA = resolve
  })
  const promiseB = new Promise<string>((resolve) => {
    resolveB = resolve
  })

  // Start request A
  const tokenA = owner.begin()

  // Start request B
  const tokenB = owner.begin()

  let appliedResult: string | null = null

  // Process results when promises resolve
  const handleA = promiseA.then((res) => {
    if (owner.isCurrent(tokenA)) {
      appliedResult = res
    }
  })

  const handleB = promiseB.then((res) => {
    if (owner.isCurrent(tokenB)) {
      appliedResult = res
    }
  })

  // Resolve B first, then A (out of order completion)
  resolveB("result-B")
  await handleB
  assert.equal(appliedResult, "result-B")

  resolveA("result-A")
  await handleA
  // Result A was ignored because tokenA is stale
  assert.equal(appliedResult, "result-B")
})
