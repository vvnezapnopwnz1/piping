// scripts/upg/ids.ts
/** Number → id lookups for one run. reload() after anything that changes revisions. */
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"

type Client = SupabaseClient<Database>

export interface UpgIds {
  readonly projectId: string
  spoolRevision(spoolNumber: string): string | undefined
  spool(spoolNumber: string): string | undefined
  weldJointRevision(weldNumber: string): string | undefined
  flangeJointRevision(flangeNumber: string): string | undefined
  iso(isoNumber: string): string | undefined
  testPack(testPackNumber: string): string | undefined
  subcontractor(code: string): string
  wps(code: string): string
  welders(subcontractorCode: string, wpsCode: string): string[]
  team(teamType: "line_check" | "finishing" | "blinding" | "reinstatement" | "jointer"): string
  location(code: string): string
  reworkCode(code: string): string
  punchCode(): string
  jointCategory(code: "X" | "Y" | "Z"): string
  torquing(code: string): string
  lineService(code: string): string
  reload(): Promise<void>
}

const fail = (what: string, error: { message: string } | null): void => {
  if (error) throw new Error(`Reading ${what} failed: ${error.message}`)
}
const need = (map: Map<string, string>, key: string, what: string): string => {
  const value = map.get(key)
  if (!value) throw new Error(`${what} ${key} is missing in the project.`)
  return value
}

export async function loadIds(client: Client, projectId: string): Promise<UpgIds> {
  const maps = {
    spoolRevision: new Map<string, string>(), spool: new Map<string, string>(), weld: new Map<string, string>(),
    flange: new Map<string, string>(), iso: new Map<string, string>(), pack: new Map<string, string>(),
    subcontractor: new Map<string, string>(), wps: new Map<string, string>(), team: new Map<string, string>(),
    location: new Map<string, string>(), rework: new Map<string, string>(), category: new Map<string, string>(),
    torquing: new Map<string, string>(), lineService: new Map<string, string>(),
  }
  let welderPool: { id: string; subcontractor_id: string; wps: string[] }[] = []
  let punchCodeId = ""

  async function reload(): Promise<void> {
    for (const map of Object.values(maps)) map.clear()

    const revisions = await client.from("spool_erection_readiness").select("spool_revision_id, spool_number").eq("project_id", projectId).eq("revision_status", "accepted")
    fail("spool revisions", revisions.error)
    for (const row of revisions.data ?? []) if (row.spool_number && row.spool_revision_id) maps.spoolRevision.set(row.spool_number, row.spool_revision_id)

    const spools = await client.from("spools").select("id, spool_number").eq("project_id", projectId)
    fail("spools", spools.error)
    for (const row of spools.data ?? []) maps.spool.set(row.spool_number, row.id)

    const revisionIds = [...maps.spoolRevision.values()]
    const welds = await client.from("weld_joint_revisions").select("id, spool_revision_id, is_removed, weld_joints!inner(weld_number)").in("spool_revision_id", revisionIds)
    fail("weld joints", welds.error)
    for (const row of (welds.data ?? []) as unknown as { id: string; is_removed: boolean; weld_joints: { weld_number: string } }[]) {
      if (!row.is_removed) maps.weld.set(row.weld_joints.weld_number, row.id)
    }

    const isos = await client.from("isometrics").select("id, iso_number").eq("project_id", projectId)
    fail("isometrics", isos.error)
    for (const row of isos.data ?? []) maps.iso.set(row.iso_number, row.id)

    const flanges = await client.from("flange_joint_readiness").select("flange_joint_revision_id, flange_number, revision_status, is_removed").in("isometric_id", [...maps.iso.values()])
    fail("flange joints", flanges.error)
    for (const row of flanges.data ?? []) {
      if (row.revision_status === "accepted" && !row.is_removed && row.flange_number && row.flange_joint_revision_id) maps.flange.set(row.flange_number, row.flange_joint_revision_id)
    }

    const packs = await client.from("test_packs").select("id, test_pack_number").eq("project_id", projectId)
    fail("test packs", packs.error)
    for (const row of packs.data ?? []) maps.pack.set(row.test_pack_number, row.id)

    const subs = await client.from("project_subcontractors").select("id, code").eq("project_id", projectId)
    fail("subcontractors", subs.error)
    for (const row of subs.data ?? []) maps.subcontractor.set(row.code, row.id)

    const wps = await client.from("project_welding_procedures").select("id, code").eq("project_id", projectId)
    fail("WPS", wps.error)
    for (const row of wps.data ?? []) maps.wps.set(row.code, row.id)

    const welders = await client.from("welder_qualifications").select("id, subcontractor_id, welder_code, welder_wps_qualifications(wps_id)").eq("project_id", projectId).order("welder_code")
    fail("welders", welders.error)
    welderPool = ((welders.data ?? []) as unknown as { id: string; subcontractor_id: string; welder_wps_qualifications: { wps_id: string }[] }[]).map((row) => ({
      id: row.id, subcontractor_id: row.subcontractor_id, wps: row.welder_wps_qualifications.map((link) => link.wps_id),
    }))

    const teams = await client.from("project_teams").select("id, team_type, code").eq("project_id", projectId).eq("status", "active").order("code")
    fail("teams", teams.error)
    for (const row of teams.data ?? []) if (!maps.team.has(row.team_type)) maps.team.set(row.team_type, row.id)

    const locations = await client.from("project_locations").select("id, code").eq("project_id", projectId)
    fail("locations", locations.error)
    for (const row of locations.data ?? []) maps.location.set(row.code, row.id)

    const rework = await client.from("project_rework_codes").select("id, code").eq("project_id", projectId)
    fail("rework codes", rework.error)
    for (const row of rework.data ?? []) maps.rework.set(row.code, row.id)

    const punch = await client.from("project_punch_codes").select("id").eq("project_id", projectId).eq("status", "active").order("code").limit(1)
    fail("punch codes", punch.error)
    punchCodeId = (punch.data ?? [])[0]?.id ?? ""

    const categories = await client.from("project_joint_categories").select("id, category_code").eq("project_id", projectId).eq("status", "active")
    fail("joint categories", categories.error)
    for (const row of categories.data ?? []) maps.category.set(row.category_code, row.id)

    const torquing = await client.from("system_reference_entries").select("id, code").eq("kind", "torquing_requirement").eq("status", "active")
    fail("torquing requirements", torquing.error)
    for (const row of torquing.data ?? []) maps.torquing.set(row.code, row.id)

    const services = await client.from("project_line_services").select("id, code").eq("project_id", projectId)
    fail("line services", services.error)
    for (const row of services.data ?? []) maps.lineService.set(row.code, row.id)
  }

  await reload()

  return {
    projectId,
    spoolRevision: (number) => maps.spoolRevision.get(number),
    spool: (number) => maps.spool.get(number),
    weldJointRevision: (number) => maps.weld.get(number),
    flangeJointRevision: (number) => maps.flange.get(number),
    iso: (number) => maps.iso.get(number),
    testPack: (number) => maps.pack.get(number),
    subcontractor: (code) => need(maps.subcontractor, code, "Subcontractor"),
    wps: (code) => need(maps.wps, code, "WPS"),
    welders: (subcontractorCode, wpsCode) => {
      const subcontractorId = need(maps.subcontractor, subcontractorCode, "Subcontractor")
      const wpsId = need(maps.wps, wpsCode, "WPS")
      return welderPool.filter((welder) => welder.subcontractor_id === subcontractorId && welder.wps.includes(wpsId)).map((welder) => welder.id)
    },
    team: (teamType) => need(maps.team, teamType, "Team"),
    location: (code) => need(maps.location, code, "Location"),
    reworkCode: (code) => need(maps.rework, code, "Rework code"),
    punchCode: () => {
      if (!punchCodeId) throw new Error("No active punch code in the project.")
      return punchCodeId
    },
    jointCategory: (code) => need(maps.category, code, "Joint category"),
    torquing: (code) => need(maps.torquing, code, "Torquing requirement"),
    lineService: (code) => need(maps.lineService, code, "Line service"),
    reload,
  }
}
