// scripts/nps/weeks.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { isosOf, spoolByNumber } from "../upg/builders"
import { NPS_SPEC } from "./dataset"
import {
  UPG_WEEK_COUNT,
  buildProjectPlan,
  buildWeekPlan,
  describeAction,
  weekOfDay,
  type UpgAction,
} from "../upg/weeks"

const plan = buildProjectPlan(NPS_SPEC)
const spoolOf = (action: UpgAction): string | undefined => ("spool" in action ? action.spool : undefined)

test("buildProjectPlan is deterministic", () => {
  assert.deepEqual(buildProjectPlan(NPS_SPEC), buildProjectPlan(NPS_SPEC))
})

test("every action falls inside the eight weeks", () => {
  for (const action of plan) {
    assert.ok(action.day >= 0 && weekOfDay(action.day) <= UPG_WEEK_COUNT, `${action.kind} on day ${action.day}`)
  }
})

test("each spool's own steps keep the order the commands enforce", () => {
  const order = [
    "start_fab",
    "material_check",
    "weld",
    "support",
    "pwht",
    "qc_release",
    "sent_to_paint",
    "paint",
    "laydown",
    "to_site",
    "erected",
    "welded_bolted",
    "supported",
  ]
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

test("PWHT actions exist and only for CS300H spools with welds >= 19 mm", () => {
  const pwhtActions = plan.filter((action) => action.kind === "pwht")
  assert.ok(pwhtActions.length > 0, "PWHT actions exist")
  for (const action of pwhtActions) {
    const found = spoolByNumber(NPS_SPEC, action.spool)!
    assert.ok(found, `spool ${action.spool} exists`)
    assert.equal(found.iso.serviceClass, "CS300H", "PWHT only on CS300H spools")
    const hasThick = found.spool.welds.some((w) => w.thicknessMm >= NPS_SPEC.pwhtThresholdMm)
    assert.ok(hasThick, `spool ${action.spool} has weld >= threshold`)
  }
  const cs300h12Spools = isosOf(NPS_SPEC)
    .filter((iso) => iso.serviceClass === "CS300H" && iso.mainDiameter === 12)
    .flatMap((iso) => iso.spools.map((s) => s.spoolNumber))
  assert.ok(cs300h12Spools.length > 0)
  for (const spool of cs300h12Spools) {
    assert.ok(!pwhtActions.some((a) => a.spool === spool), `12" spool ${spool} must not have PWHT`)
  }
})

test("week 5 has no pack steps and C/D packs never have steps", () => {
  const packActions = plan.filter((action): action is Extract<UpgAction, { testPack: string }> => "testPack" in action)
  const week5PackActions = packActions.filter((action) => weekOfDay(action.day) === 5)
  assert.equal(week5PackActions.length, 0, "week 5 has no pack steps")

  const cdPacks = NPS_SPEC.isoGroups
    .filter((group) => group.cohort === "C" || group.cohort === "D")
    .map((group) => group.testPack)
  for (const action of packActions) {
    assert.ok(!cdPacks.includes(action.testPack), `${action.testPack} must not have steps`)
  }
})

test("the reject weld is in a shop NDE round and a repair round follows", () => {
  const rounds = plan.filter((action): action is Extract<UpgAction, { kind: "nde_round" }> => action.kind === "nde_round")
  const rejecting = rounds.find((round) => round.reject.includes(NPS_SPEC.special.rejectWeld!))
  assert.ok(rejecting, "rejection round found")
  assert.ok(rounds.some((round) => round.day > rejecting.day && round.situation === "nde_reject_repair_tracer"))
})

test("the overdue spool leaves LAYDOWN-A and never reaches SITE-A", () => {
  const overdue = NPS_SPEC.special.overdueSpool!
  const moves = plan.filter((action) => action.kind === "tracking" && action.spool === overdue)
  assert.ok(moves.some((action) => action.kind === "tracking" && action.direction === "out" && action.location === "LAYDOWN-A"))
  assert.ok(!moves.some((action) => action.kind === "tracking" && action.location === "SITE-A"))
  assert.ok(!plan.some((action) => action.kind === "stage" && action.spool === overdue && action.phase === "erection"))
})

test("every action has a Russian description", () => {
  for (const action of plan) {
    assert.match(describeAction(action), /[а-яё]/i)
  }
})

test("the revision action exists and is manual", () => {
  const revision = plan.find((action) => action.kind === "revision")
  assert.ok(revision)
  assert.equal(revision.manual, true)
  assert.equal(revision.iso, NPS_SPEC.special.revision!.iso)
})

test("manual actions are only thread spools, the TP-100-01 pack and the revision", () => {
  const manualActions = plan.filter((action) => action.manual)
  for (const action of manualActions) {
    if (action.kind === "revision") {
      assert.equal(action.iso, NPS_SPEC.special.revision!.iso)
    } else if ("testPack" in action) {
      assert.equal(action.testPack, NPS_SPEC.manualPack)
    } else if ("spool" in action) {
      const isThread = NPS_SPEC.special.threadIsos.some((iso) => action.spool.startsWith(`${iso}-`))
      assert.ok(isThread, `${action.spool} must belong to a thread ISO`)
    } else {
      assert.fail(`unexpected manual action: ${JSON.stringify(action)}`)
    }
  }
})

test("week plans partition the project plan, and the first five weeks hold no pack step", () => {
  const weeks = Array.from({ length: UPG_WEEK_COUNT }, (_, index) => buildWeekPlan(NPS_SPEC, index + 1, true))
  assert.equal(weeks.flat().length, plan.length)
  for (const [index, week] of weeks.entries()) assert.ok(week.every((action) => weekOfDay(action.day) === index + 1))
  // The NPS run stops after week 5: tests of the packs belong to the weeks that are described but not run.
  assert.ok(weeks.slice(0, 5).flat().every((action) => !("testPack" in action)))
})
