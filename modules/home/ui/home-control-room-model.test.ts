import assert from "node:assert/strict"
import test from "node:test"
import { decodeTableState } from "@/components/ui/data-table/table-state"
import {
  ISSUED_NDE_HREF,
  NOT_READY_FOR_TEST_HREF,
  attentionItems,
  canOpenRoute,
  projectIdentity,
  shareLabel,
  shareWidth,
} from "./home-control-room-model"
import type { EffectiveAccess } from "@/modules/access/domain/effective-access"

test("an empty denominator is not displayed as zero percent complete", () => {
  assert.equal(shareLabel(0, 0), null)
  assert.equal(shareWidth(0, 0), 0)
  assert.equal(shareLabel(0, 3), "0%")
  assert.equal(shareLabel(1, 3), "33%")
})

test("rounding does not announce completion while work remains", () => {
  assert.equal(shareLabel(999, 1000), ">99%")
  assert.equal(shareLabel(1, 1000), "<1%")
  assert.equal(shareLabel(1000, 1000), "100%")
  assert.equal(shareWidth(4, 3), 100)
})

test("route checks read the path, not the query that narrows it", () => {
  const ndeOnly = (capability: string) => capability === "nde.view"
  assert.equal(canOpenRoute(ISSUED_NDE_HREF, ndeOnly), true)
  assert.equal(canOpenRoute(NOT_READY_FOR_TEST_HREF, ndeOnly), false)
  assert.equal(canOpenRoute("/nde", undefined), false)
})

test("project heading uses the selected access row rather than fixture text", () => {
  const access = { projectId: "p1", activityCode: "LIVE-42", title: "Selected project" } as unknown as EffectiveAccess
  assert.deepEqual(projectIdentity(access), { code: "LIVE-42", title: "Selected project" })
  assert.deepEqual(projectIdentity(undefined), { code: null, title: null })
})

test("attention links open the target table already narrowed to the counted rows", () => {
  const nde = new URL(ISSUED_NDE_HREF, "http://x")
  assert.equal(nde.pathname, "/nde")
  const ob = new URLSearchParams()
  for (const [key, value] of nde.searchParams) if (key.startsWith("ob_")) ob.set(key.slice(3), value)
  assert.deepEqual(decodeTableState(ob).filters, [{ id: "disposition", kind: "select", values: ["issued"] }])

  const rft = new URL(NOT_READY_FOR_TEST_HREF, "http://x")
  const own = new URLSearchParams()
  for (const [key, value] of rft.searchParams) if (key.startsWith("rft_")) own.set(key.slice(4), value)
  assert.deepEqual(decodeTableState(own).filters, [{ id: "isRft", kind: "boolean", value: false }])
})

test("only real open work becomes an attention row, upstream first", () => {
  assert.deepEqual(attentionItems({}), [])
  assert.deepEqual(
    attentionItems({ nde: { issued: 0 }, erection: { remaining: 0, total: 4 }, testPacks: { blocked: 0, total: 2 } }),
    [],
  )
  const items = attentionItems({
    nde: { issued: 1 },
    erection: { remaining: 3, total: 4 },
    testPacks: { blocked: 2, total: 2 },
  })
  assert.deepEqual(items.map((item) => item.id), ["nde", "erection", "testpacks"])
  assert.equal(items[0].title, "1 NDE obligation awaiting a result")
  assert.equal(items[1].title, "3 of 4 spools not Ready for Test")
})
