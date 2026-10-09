// scripts/upg/weeks.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { OVERDUE_SPOOL, REJECT_WELD, THREAD_ISOS, UPG_ISOS } from "./dataset"
import { SITUATIONS, UPG_WEEK_COUNT, buildProjectPlan, buildWeekPlan, describeAction, weekOfDay, type UpgAction } from "./weeks"

const plan = buildProjectPlan()
const automatic = plan.filter((action) => !action.manual)
const spoolOf = (action: UpgAction): string | undefined => ("spool" in action ? action.spool : undefined)

test("the plan is deterministic", () => {
  assert.deepEqual(buildProjectPlan(), buildProjectPlan())
})

test("every action falls inside the eight weeks", () => {
  for (const action of plan) {
    assert.ok(action.day >= 0 && weekOfDay(action.day) <= UPG_WEEK_COUNT, `${action.kind} on day ${action.day}`)
  }
})

test("week plans partition the project plan", () => {
  const weeks = Array.from({ length: UPG_WEEK_COUNT }, (_, index) => buildWeekPlan(index + 1, true))
  assert.equal(weeks.flat().length, plan.length)
  for (const [index, week] of weeks.entries()) {
    assert.ok(week.every((action) => weekOfDay(action.day) === index + 1))
    assert.deepEqual(week.map((action) => action.day), [...week].map((action) => action.day).sort((a, b) => a - b))
  }
})

test("without --include-manual the week plan skips the thread, TP-100-01 and the revision", () => {
  for (let week = 1; week <= UPG_WEEK_COUNT; week += 1) {
    for (const action of buildWeekPlan(week, false)) {
      assert.equal(action.manual, false)
      const spool = spoolOf(action)
      if (spool) assert.ok(!THREAD_ISOS.some((iso) => spool.startsWith(`${iso}-`)), spool)
      if ("testPack" in action) assert.notEqual(action.testPack, "TP-100-01")
      assert.notEqual(action.kind, "revision")
    }
  }
})

test("each spool's own steps keep the order the commands enforce", () => {
  const order = ["start_fab", "material_check", "weld", "support", "pwht", "qc_release", "sent_to_paint", "paint", "laydown", "to_site", "erected", "welded_bolted", "supported"]
  const stepOf = (action: UpgAction): string => (action.kind === "stage" ? action.stage : action.kind)
  const bySpool = new Map<string, UpgAction[]>()
  for (const action of plan) {
    const spool = spoolOf(action)
    if (!spool || action.kind === "tracking" || action.kind === "flange" || action.kind === "field_support_probe") continue
    if (action.kind === "weld" && action.phase === "erection") continue
    bySpool.set(spool, [...(bySpool.get(spool) ?? []), action])
  }
  for (const [spool, actions] of bySpool) {
    const firstDay = new Map<string, number>()
    for (const action of actions) {
      const step = stepOf(action)
      if (!firstDay.has(step)) firstDay.set(step, action.day)
    }
    const days = order.filter((step) => firstDay.has(step)).map((step) => firstDay.get(step)!)
    assert.deepEqual(days, [...days].sort((a, b) => a - b), spool)
  }
})

test("automatic actions cover every action-driven situation", () => {
  const seen = new Set(automatic.map((action) => action.situation).filter(Boolean))
  const actionDriven = SITUATIONS.filter((situation) => !["revision_during_fabrication", "partial_welding", "pack_blocked_upstream"].includes(situation))
  for (const situation of actionDriven) assert.ok(seen.has(situation), situation)
})

test("state-driven situations hold: the revision is manual, D welds half, C and D packs never start", () => {
  assert.ok(plan.some((action) => action.kind === "revision" && action.manual))
  const dWelds = UPG_ISOS.filter((iso) => iso.cohort === "D").flatMap((iso) => iso.spools.flatMap((spool) => spool.welds.filter((weld) => weld.location === "shop")))
  const dWelded = automatic.filter((action) => action.kind === "weld" && dWelds.some((weld) => weld.weldNumber === action.weld))
  assert.ok(dWelded.length > 0 && dWelded.length < dWelds.length)
  assert.ok(!plan.some((action) => "testPack" in action && ["TP-300-01", "TP-300-02"].includes(action.testPack)))
})

test("the rejected weld is in a shop NDE round and a repair round follows", () => {
  const rounds = plan.filter((action): action is Extract<UpgAction, { kind: "nde_round" }> => action.kind === "nde_round")
  const rejecting = rounds.find((round) => round.reject.includes(REJECT_WELD))
  assert.ok(rejecting)
  assert.ok(rounds.some((round) => round.day > rejecting.day && round.situation === "nde_reject_repair_tracer"))
})

test("the overdue spool leaves the laydown and never arrives on site", () => {
  const moves = plan.filter((action) => action.kind === "tracking" && action.spool === OVERDUE_SPOOL)
  assert.ok(moves.some((action) => action.kind === "tracking" && action.direction === "out"))
  assert.ok(!moves.some((action) => action.kind === "tracking" && action.location === "SITE-A"))
  assert.ok(!plan.some((action) => action.kind === "stage" && action.spool === OVERDUE_SPOOL && action.phase === "erection"))
})

test("every action has a Russian description", () => {
  for (const action of plan) assert.match(describeAction(action), /[а-яё]/i)
})

test("the shop NDE round of a cohort examines the thread spools too, so a thread spool can be released", () => {
  const thread = UPG_ISOS.filter((iso) => iso.thread).flatMap((iso) => iso.spools.map((spool) => spool.spoolNumber))
  const shopRounds = plan.filter((action): action is Extract<UpgAction, { kind: "nde_round" }> => action.kind === "nde_round" && action.label.endsWith("-shop"))
  for (const spool of thread) assert.ok(shopRounds.some((round) => round.spools.includes(spool)), spool)
})

test("only the overdue spool leaves the laydown without arriving on site", () => {
  const tracking = plan.filter((action): action is Extract<UpgAction, { kind: "tracking" }> => action.kind === "tracking")
  const left = tracking.filter((action) => action.location === "LAYDOWN-A" && action.direction === "out").map((action) => action.spool)
  const arrived = new Set(tracking.filter((action) => action.location === "SITE-A" && action.direction === "in").map((action) => action.spool))
  assert.deepEqual(left.filter((spool) => !arrived.has(spool)), [OVERDUE_SPOOL])
})
