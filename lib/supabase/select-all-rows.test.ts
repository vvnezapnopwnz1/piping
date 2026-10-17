import assert from "node:assert/strict"
import test from "node:test"

import { selectAllRows } from "./select-all-rows"

test("selectAllRows returns every row when the server caps a page", async () => {
  const rows = [1, 2, 3, 4, 5, 6, 7]
  const calls: Array<[number, number]> = []

  const result = await selectAllRows(async (from, to) => {
    calls.push([from, to])
    return { data: rows.slice(from, Math.min(to + 1, from + 3)), error: null }
  })

  assert.deepEqual(result, rows)
  assert.deepEqual(calls, [[0, 999], [3, 1002], [6, 1005], [7, 1006]])
})

test("selectAllRows throws the server message", async () => {
  await assert.rejects(
    selectAllRows(async () => ({ data: null, error: { message: "boom" } })),
    /boom/,
  )
})
