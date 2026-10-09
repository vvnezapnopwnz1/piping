// scripts/upg/execute.ts
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { materialCheckItemsFor } from "../demo/material-check-items"
import { FIELD_SUBCONTRACTOR, LINE_SERVICE, REVISION_WELD, SERVICE_CLASSES, SHOP_SUBCONTRACTOR, WPS_BY_MATERIAL, spoolByNumber } from "./dataset"
import { addDays } from "./files"
import type { UpgIds } from "./ids"
import { importSpoolgenPackage } from "./import-spooling"
import { readFixtureText } from "./operator"
import { weekOfDay, type Situation, type UpgAction } from "./weeks"

type Client = SupabaseClient<Database>

export interface RunContext {
  readonly client: Client
  readonly ids: UpgIds
  readonly startDate: string
}

export interface ActionResult {
  readonly action: UpgAction
  readonly outcome: "done" | "skipped" | "refused"
  readonly code?: string
  readonly message?: string
  readonly expected?: boolean
}

/** Refusals that document a known finding instead of failing the run. */
export const EXPECTED_REFUSALS: Partial<Record<UpgAction["kind"], string>> = {
  field_support_probe: "L3: support progress is UNIQUE per support revision, so a support recorded in the shop cannot be recorded on site",
}

const targetOf = (action: UpgAction): string => {
  switch (action.kind) {
    case "weld": return action.weld
    case "flange": return action.flange
    case "nde_round": return action.label
    case "revision": return action.iso
    case "pressure_stage": return `${action.testPack}-${action.stage}`
    case "reinstatement": return `${action.testPack}-${action.category}`
    case "stage": return `${action.spool}-${action.stage}`
    case "tracking": return `${action.spool}-${action.location}-${action.direction}`
    default: return "testPack" in action ? action.testPack : action.spool
  }
}

export function actionKey(week: number, action: UpgAction, suffix?: string): string {
  return ["upg", `w${week}`, action.kind, targetOf(action), suffix].filter(Boolean).join("-")
}

export function summarizeRun(results: readonly ActionResult[]) {
  const refused = results.filter((result) => result.outcome === "refused")
  return {
    done: results.filter((result) => result.outcome === "done").length,
    skipped: results.filter((result) => result.outcome === "skipped").length,
    refused: refused.length,
    unexpected: refused.filter((result) => !result.expected),
    situations: [...new Set(results.filter((result) => result.outcome === "done" && result.action.situation).map((result) => result.action.situation as Situation))],
  }
}

class Skip extends Error {}

async function rpc(client: Client, fn: string, args: Record<string, unknown>): Promise<any> {
  const { data, error } = await client.rpc(fn as never, args as never)
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data
}

const required = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Skip(`${what} is not in the project yet`)
  return value
}

async function weld(ctx: RunContext, action: Extract<UpgAction, { kind: "weld" }>, key: string, date: string): Promise<void> {
  const found = spoolByNumber(action.spool)
  if (!found) throw new Error(`${action.spool} is not in the dataset.`)
  const material = SERVICE_CLASSES[found.iso.serviceClass].materialTypeCode
  const field = action.phase === "erection"
  const subcontractor = field ? FIELD_SUBCONTRACTOR : SHOP_SUBCONTRACTOR
  const wpsCode = field ? WPS_BY_MATERIAL[material].field : WPS_BY_MATERIAL[material].shop
  const pool = ctx.ids.welders(subcontractor, wpsCode)
  if (pool.length < 2) throw new Error(`Fewer than two welders qualified for ${wpsCode}.`)
  const ordinal = Number(action.weld.replace(/.*-(W|FW)/, "")) || 0
  await rpc(ctx.client, "record_weld_progress", {
    ...(field ? { target_phase: "erection" } : {}),
    target_weld_joint_revision_id: required(ctx.ids.weldJointRevision(action.weld), action.weld),
    subcontractor_id: ctx.ids.subcontractor(subcontractor),
    welding_procedure_id: ctx.ids.wps(wpsCode),
    points: [
      { point_type: "root", welder_qualification_id: pool[ordinal % pool.length], completion_percent: 50, welded_on: date },
      { point_type: "cap", welder_qualification_id: pool[(ordinal + 1) % pool.length], completion_percent: 50, welded_on: date },
    ],
    dates: { weld_on: date },
    idempotency_key: key,
  })
}

async function ndeRound(ctx: RunContext, action: Extract<UpgAction, { kind: "nde_round" }>, week: number, date: string): Promise<boolean> {
  const revisions = action.spools.map((spool) => ctx.ids.spoolRevision(spool)).filter((id): id is string => Boolean(id))
  const { data, error } = await ctx.client.from("nde_obligations")
    .select("id, method, coverage_regime, weld_joint_revision_id, cycle_kind")
    .eq("project_id", ctx.ids.projectId).eq("disposition", "pending").in("spool_revision_id", revisions)
  if (error) throw new Error(error.message)
  const obligations = (data ?? []) as { id: string; method: string; coverage_regime: string; weld_joint_revision_id: string; cycle_kind: string }[]
  if (obligations.length === 0) return false
  const rejectIds = new Set(action.reject.map((weldNumber) => ctx.ids.weldJointRevision(weldNumber)).filter(Boolean))
  const pairs = [...new Set(obligations.map((row) => `${row.method}|${row.coverage_regime}`))]
  const batches: string[] = []
  for (const pair of pairs) {
    const [method, coverageRegime] = pair.split("|")
    const batch = await rpc(ctx.client, "create_nde_batch", { target_project_id: ctx.ids.projectId, method, coverage_regime: coverageRegime, idempotency_key: actionKey(week, action, `batch-${pair}`) })
    await rpc(ctx.client, "allocate_nde_batch_candidates", { target_batch_id: batch.id, target_percentage: 100, idempotency_key: actionKey(week, action, `allocate-${pair}`) })
    await rpc(ctx.client, "issue_nde_batch", { target_batch_id: batch.id, idempotency_key: actionKey(week, action, `issue-${pair}`) })
    batches.push(batch.id)
  }
  let n = 0
  for (const obligation of obligations) {
    const rejected = obligation.cycle_kind === "original" && rejectIds.has(obligation.weld_joint_revision_id)
    n += 1
    await rpc(ctx.client, "record_nde_result", {
      target_obligation_id: obligation.id,
      outcome: rejected ? "rejected" : "accepted",
      examined_on: date,
      report_number: `RT-${week}-${String(n).padStart(3, "0")}`,
      ...(rejected ? { defect_rework_code_id: ctx.ids.reworkCode("POR") } : {}),
      idempotency_key: actionKey(week, action, `result-${obligation.id}`),
    })
  }
  for (const batchId of batches) {
    await rpc(ctx.client, "close_nde_batch", { target_batch_id: batchId, returned_on_date: date, idempotency_key: actionKey(week, action, `close-${batchId}`) })
  }
  return true
}

async function packMembers(ctx: RunContext, testPackId: string): Promise<string[]> {
  const { data, error } = await ctx.client.from("test_pack_isometrics").select("isometric_id").eq("test_pack_id", testPackId).is("removed_at", null)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.isometric_id as string)
}

export async function executeAction(ctx: RunContext, action: UpgAction): Promise<ActionResult> {
  const week = weekOfDay(action.day)
  const key = actionKey(week, action)
  const date = addDays(ctx.startDate, action.day)
  const client = ctx.client
  const spoolRevision = (spool: string) => required(ctx.ids.spoolRevision(spool), spool)
  try {
    switch (action.kind) {
      case "stage":
        if (action.phase === "fabrication") {
          await rpc(client, "record_construction_progress", { target_spool_revision_id: spoolRevision(action.spool), target_phase: "fabrication", target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        } else {
          await rpc(client, "record_erection_progress", { target_spool_revision_id: spoolRevision(action.spool), target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        }
        break
      case "material_check": {
        const revision = spoolRevision(action.spool)
        await rpc(client, "record_material_check", { target_spool_revision_id: revision, target_checked_on: date, target_items: await materialCheckItemsFor(client, revision), target_idempotency_key: key })
        break
      }
      case "weld":
        if (action.requiresRevision && !ctx.ids.weldJointRevision(action.weld)) throw new Skip("revision R1 is not imported yet")
        await weld(ctx, action, key, date)
        break
      case "support":
      case "field_support_probe": {
        const { data, error } = await client.from("support_revisions").select("id").eq("spool_revision_id", spoolRevision(action.spool)).eq("is_removed", false)
        if (error) throw new Error(error.message)
        for (const support of data ?? []) {
          await rpc(client, action.kind === "support" ? "record_support_progress" : "record_field_support_progress", { target_support_revision_id: support.id, installed_on: date, idempotency_key: actionKey(week, action, support.id) })
        }
        break
      }
      case "pwht": {
        const revision = spoolRevision(action.spool)
        const requirements = await client.from("pwht_requirements").select("id").eq("spool_revision_id", revision)
        if (requirements.error) throw new Error(requirements.error.message)
        const accepted = await client.from("pwht_results").select("pwht_requirement_id").eq("outcome", "accepted").in("pwht_requirement_id", (requirements.data ?? []).map((row) => row.id))
        if (accepted.error) throw new Error(accepted.error.message)
        const done = new Set((accepted.data ?? []).map((row) => row.pwht_requirement_id))
        const open = (requirements.data ?? []).filter((row) => !done.has(row.id))
        if (open.length === 0) throw new Skip("no open PWHT requirement")
        for (const [index, requirement] of open.entries()) {
          await rpc(client, "record_pwht_result", { target_requirement_id: requirement.id, chart_number: `PWHT-${action.spool}-${index + 1}`, performed_on: date, outcome: "accepted", idempotency_key: actionKey(week, action, requirement.id) })
        }
        break
      }
      case "qc_release":
        await rpc(client, "release_quality_record", { target_spool_revision_id: spoolRevision(action.spool), released_on: date, idempotency_key: key })
        break
      case "paint":
        await rpc(client, "record_paint_progress", {
          target_spool_revision_id: spoolRevision(action.spool),
          line_service_id: ctx.ids.lineService(LINE_SERVICE),
          details: { painted_on: date, final_qc_on: addDays(ctx.startDate, action.finalQcDay), measured_dft_microns: 260, w10p_form_number: `W10P-${action.spool}` },
          idempotency_key: key,
        })
        break
      case "laydown":
        await rpc(client, "record_laydown", { target_spool_revision_id: spoolRevision(action.spool), location_id: ctx.ids.location("LAYDOWN-A"), stored_on: date, idempotency_key: key })
        break
      case "tracking":
        await rpc(client, "record_location_event", {
          p_project_id: ctx.ids.projectId, p_spool_id: required(ctx.ids.spool(action.spool), action.spool), p_location_id: ctx.ids.location(action.location),
          p_device_id: null, p_direction: action.direction, p_occurred_at: `${date}T${action.direction === "in" ? "08" : "16"}:00:00Z`,
          p_reason: null, p_compensates_event_id: null, p_idempotency_key: key,
        })
        break
      case "flange":
        await rpc(client, "record_flange_progress", {
          target_project_id: ctx.ids.projectId, target_flange_joint_revision_id: required(ctx.ids.flangeJointRevision(action.flange), action.flange),
          target_joint_category_id: ctx.ids.jointCategory(action.category), target_torquing_requirement_id: ctx.ids.torquing("MANUAL-TORQUE"),
          target_jointing_value: 450, target_joint_date: date, target_report_number: `BT-${action.flange}`, target_tag_number: `TAG-${action.flange}`,
          target_jointer_ids: [ctx.ids.team("jointer")], target_idempotency_key: key,
        })
        break
      case "nde_round":
        if (action.requiresRevision && !ctx.ids.weldJointRevision(REVISION_WELD)) throw new Skip("revision R1 is not imported yet")
        if (!(await ndeRound(ctx, action, week, date))) throw new Skip("no pending NDE obligations")
        break
      case "line_check": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const request = await rpc(client, "assign_line_check", { target_test_pack_id: packId, target_isometric_ids: await packMembers(ctx, packId), target_team_id: ctx.ids.team("line_check"), target_assigned_on: date, target_idempotency_key: key })
        const resultDate = addDays(ctx.startDate, action.resultDay)
        for (const isometricId of await packMembers(ctx, packId)) {
          const isoNumber = [...action.punches.map((punch) => punch.iso)].find((number) => ctx.ids.iso(number) === isometricId)
          const punches = action.punches.filter((punch) => punch.iso === isoNumber).map((punch) => ({ punch_code_id: ctx.ids.punchCode(), description: punch.description, checking_date: resultDate }))
          await rpc(client, "record_line_check_result", { target_request_id: request.id, target_isometric_id: isometricId, target_completed_on: resultDate, target_punches: punches, target_idempotency_key: actionKey(week, action, isometricId) })
        }
        break
      }
      case "item_clearance": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const punches = await client.from("punch_items").select("id").eq("test_pack_id", packId)
        if (punches.error) throw new Error(punches.error.message)
        const cleared = await client.from("punch_item_clearances").select("punch_item_id").in("punch_item_id", (punches.data ?? []).map((row) => row.id))
        if (cleared.error) throw new Error(cleared.error.message)
        const done = new Set((cleared.data ?? []).map((row) => row.punch_item_id))
        const open = (punches.data ?? []).map((row) => row.id).filter((id) => !done.has(id))
        if (open.length === 0) throw new Skip("no open punch items")
        const request = await rpc(client, "assign_item_clearance", { target_test_pack_id: packId, target_punch_item_ids: open, target_team_id: ctx.ids.team("finishing"), target_assigned_on: date, target_idempotency_key: key })
        for (const punchId of open) {
          await rpc(client, "record_punch_clearance", { target_request_id: request.id, target_punch_item_id: punchId, target_cleared_on: addDays(ctx.startDate, action.clearDay), target_idempotency_key: actionKey(week, action, punchId) })
        }
        break
      }
      case "blinding": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const request = await rpc(client, "assign_blinding", { target_test_pack_id: packId, target_team_id: ctx.ids.team("blinding"), target_assigned_on: date, target_idempotency_key: key })
        await rpc(client, "record_blinding", { target_request_id: request.id, target_completed_on: addDays(ctx.startDate, action.recordDay), target_idempotency_key: actionKey(week, action, "record") })
        break
      }
      case "pressure_stage":
        await rpc(client, "record_pressure_test_stage", { target_test_pack_id: required(ctx.ids.testPack(action.testPack), action.testPack), target_stage: action.stage, target_occurred_on: date, target_idempotency_key: key })
        break
      case "reinstatement": {
        const packId = required(ctx.ids.testPack(action.testPack), action.testPack)
        const members = await packMembers(ctx, packId)
        const targets = await client.from("flange_joint_readiness").select("flange_joint_revision_id, flange_number")
          .in("isometric_id", members).eq("revision_status", "accepted").eq("is_removed", false).eq("requires_reinstatement", true).eq("category_code", action.category)
        if (targets.error) throw new Error(targets.error.message)
        const rows = (targets.data ?? []) as { flange_joint_revision_id: string; flange_number: string }[]
        if (rows.length === 0) throw new Skip(`no ${action.category} flanges in the pack`)
        const request = await rpc(client, "assign_reinstatement", { target_test_pack_id: packId, target_flange_joint_revision_ids: rows.map((row) => row.flange_joint_revision_id), target_team_id: ctx.ids.team("reinstatement"), target_assigned_on: date, target_idempotency_key: key })
        for (const row of rows) {
          await rpc(client, "record_reinstatement", {
            target_request_id: request.id, target_flange_joint_revision_id: row.flange_joint_revision_id, target_joint_date: addDays(ctx.startDate, action.recordDay),
            target_report_number: `RI-${row.flange_number}`, target_jointer_team_id: ctx.ids.team("jointer"), target_tag_number: `TAG-${row.flange_number}`,
            target_idempotency_key: actionKey(week, action, row.flange_joint_revision_id),
          })
        }
        break
      }
      case "revision": {
        const files = { weld: readFixtureText("revision/weld.txt"), trace: readFixtureText("revision/trace.txt"), bolt: readFixtureText("revision/bolt.txt"), supp: readFixtureText("revision/supp.txt") }
        await importSpoolgenPackage(client, ctx.ids.projectId, files, "UPG-1 R1", { decision: "done_without_modification" })
        await ctx.ids.reload()
        break
      }
    }
    return { action, outcome: "done" }
  } catch (error) {
    if (error instanceof Skip) return { action, outcome: "skipped", message: error.message }
    const code = (error as { code?: string }).code
    const expected = EXPECTED_REFUSALS[action.kind] !== undefined
    return { action, outcome: "refused", code, message: error instanceof Error ? error.message : String(error), expected }
  }
}
