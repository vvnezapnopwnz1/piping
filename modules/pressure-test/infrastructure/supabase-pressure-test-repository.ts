import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { CreateTestPackInput, UpdateTestPackInput } from "../domain/test-pack"
import type { ItemClearanceAssignment, LineCheckAssignment, PunchItemInput } from "../domain/punch-item"
import { mapSupabasePressureTestError } from "./supabase-pressure-test-errors"

type Client = SupabaseClient<Database>
type Views = Database["public"]["Views"]
type ViewRow<Name extends keyof Views> = Views[Name]["Row"]
type Row = Record<string, unknown>

export interface TestPackCatalogRow {
  id: string
  projectId: string
  testPackNumber: string
  revisionNo: number
  lifecycle: string
  activeIsoCount: number
  systemId?: string
  subsystemId?: string
  serviceClassId?: string
  lineServiceId?: string
  location?: string
  priority?: string
  medium?: "H" | "P" | "V"
  pressure?: number
  volumeM3?: number
  plannedStartOn?: string
  plannedEndOn?: string
}

export interface TestPackReadinessRow extends ViewRow<"test_pack_readiness"> {
  testPackId: string
  projectId: string
  testPackNumber: string
  revisionNo: number
  memberCount: number
  isRft: boolean
}

export type TestPackMemberRow = ViewRow<"test_pack_member_worklist">
export type TestPackIsoStatusRow = ViewRow<"test_pack_iso_status">
export type TestPackSpoolStatusRow = ViewRow<"test_pack_spool_status">
export type LineCheckWorklistRow = ViewRow<"line_check_worklist">
export type ItemClearanceWorklistRow = ViewRow<"item_clearance_worklist">
export type BlindingWorklistRow = ViewRow<"blinding_worklist">
export type TestingPrecommWorklistRow = ViewRow<"testing_precomm_worklist">
export type ReinstatementWorklistRow = ViewRow<"reinstatement_worklist">
export type RequestDetailsRow = ViewRow<"pressure_test_request_details">
export type IsometricReadinessRow = ViewRow<"isometric_readiness">
export type FlangeJointReadinessRow = ViewRow<"flange_joint_readiness">

export interface ProjectTeamRow {
  id: string
  code: string
  description: string
  team_type: string
  status: string
}

/** A project referential offered to the user by its business code, submitted to the RPC by id. */
export interface ProjectReferenceOptionRow {
  id: string
  code: string
  description: string | null
}

export interface ProjectSubsystemOptionRow extends ProjectReferenceOptionRow {
  systemId: string
}

export interface IsometricNumberRow {
  id: string
  isoNumber: string
}

const TEST_PACK_SELECT = "*"
const READINESS_SELECT = "*"

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(mapSupabasePressureTestError(error as { code?: string }))
}

function toCatalog(row: ViewRow<"test_pack_catalog">): TestPackCatalogRow {
  return {
    id: row.id ?? "",
    projectId: row.project_id ?? "",
    testPackNumber: row.test_pack_number ?? "",
    revisionNo: row.revision_no ?? 0,
    lifecycle: row.lifecycle ?? "active",
    activeIsoCount: row.active_iso_count ?? 0,
    systemId: row.system_id ?? undefined,
    subsystemId: row.subsystem_id ?? undefined,
    serviceClassId: row.service_class_id ?? undefined,
    lineServiceId: row.line_service_id ?? undefined,
    location: row.location ?? undefined,
    priority: row.priority ?? undefined,
    medium: row.test_medium ?? undefined,
    pressure: row.test_pressure ?? undefined,
    volumeM3: row.volume_m3 ?? undefined,
    plannedStartOn: row.planned_start_on ?? undefined,
    plannedEndOn: row.planned_end_on ?? undefined,
  }
}

function toReadiness(row: ViewRow<"test_pack_readiness">): TestPackReadinessRow {
  return { ...row, testPackId: row.test_pack_id ?? "", projectId: row.project_id ?? "", testPackNumber: row.test_pack_number ?? "", revisionNo: row.revision_no ?? 0, memberCount: row.member_count ?? 0, isRft: row.is_rft === true }
}

export async function listTestPackCatalog(client: Client, projectId: string): Promise<TestPackCatalogRow[]> {
  const { data, error } = await client.from("test_pack_catalog").select(TEST_PACK_SELECT).eq("project_id", projectId).order("test_pack_number")
  fail(error)
  return (data ?? []).map(toCatalog)
}

export async function listTestPackReadiness(client: Client, projectId: string): Promise<TestPackReadinessRow[]> {
  const { data, error } = await client.from("test_pack_readiness").select(READINESS_SELECT).eq("project_id", projectId).order("test_pack_number")
  fail(error)
  return (data ?? []).map(toReadiness)
}

export async function listTestPackReleaseBacklog(client: Client, projectId: string): Promise<TestPackReadinessRow[]> {
  const { data, error } = await client.from("test_pack_release_backlog").select(READINESS_SELECT).eq("project_id", projectId).order("test_pack_number")
  fail(error)
  return (data ?? []).map(toReadiness)
}

export async function listTestPackMembers(client: Client, projectId: string, testPackId: string): Promise<TestPackMemberRow[]> {
  const { data, error } = await client.from("test_pack_member_worklist").select("*").eq("project_id", projectId).eq("test_pack_id", testPackId).order("iso_number")
  fail(error)
  return data ?? []
}

export async function listTestPackIsoStatus(client: Client, projectId: string, testPackId: string): Promise<TestPackIsoStatusRow[]> {
  const { data, error } = await client.from("test_pack_iso_status").select("*").eq("project_id", projectId).eq("test_pack_id", testPackId).order("isometric_id")
  fail(error)
  return data ?? []
}

export async function listTestPackSpoolStatus(client: Client, projectId: string, testPackId: string): Promise<TestPackSpoolStatusRow[]> {
  const { data, error } = await client.from("test_pack_spool_status").select("*").eq("project_id", projectId).eq("test_pack_id", testPackId).order("spool_number")
  fail(error)
  return data ?? []
}

async function rpc<Name extends keyof Database["public"]["Functions"]>(client: Client, name: Name, args: Database["public"]["Functions"][Name]["Args"]): Promise<Database["public"]["Functions"][Name]["Returns"]> {
  const { data, error } = await client.rpc(name, args as never)
  fail(error)
  return data as Database["public"]["Functions"][Name]["Returns"]
}

export const createTestPack = (client: Client, projectId: string, input: CreateTestPackInput, idempotencyKey: string) =>
  rpc(client, "create_test_pack", { target_project_id: projectId, target_test_pack_number: input.testPackNumber, target_system_id: input.systemId, target_subsystem_id: input.subsystemId, target_service_class_id: input.serviceClassId, target_line_service_id: input.lineServiceId, target_planned_start_on: input.plannedStartOn, target_planned_end_on: input.plannedEndOn, target_priority: input.priority, target_test_medium: input.medium as "H" | "P" | "V", target_test_pressure: input.pressure, target_location: input.location, target_volume_m3: input.volumeM3, target_idempotency_key: idempotencyKey })

export const updateTestPack = (client: Client, testPackId: string, input: UpdateTestPackInput, idempotencyKey: string) =>
  rpc(client, "update_test_pack", { target_test_pack_id: testPackId, target_system_id: input.systemId, target_subsystem_id: input.subsystemId, target_service_class_id: input.serviceClassId, target_line_service_id: input.lineServiceId, target_planned_start_on: input.plannedStartOn, target_planned_end_on: input.plannedEndOn, target_priority: input.priority, target_test_medium: input.medium as "H" | "P" | "V", target_test_pressure: input.pressure, target_location: input.location, target_volume_m3: input.volumeM3, target_idempotency_key: idempotencyKey })

export const composeTestPack = (client: Client, testPackId: string, isometricId: string, idempotencyKey: string) =>
  rpc(client, "compose_test_pack", { target_test_pack_id: testPackId, target_isometric_id: isometricId, target_source_kind: "manual", target_source_import_job_id: undefined, target_idempotency_key: idempotencyKey })

export const removeTestPackIsometric = (client: Client, testPackId: string, isometricId: string, idempotencyKey: string) =>
  rpc(client, "remove_test_pack_isometric", { target_test_pack_id: testPackId, target_isometric_id: isometricId, target_idempotency_key: idempotencyKey })

export const archiveTestPack = (client: Client, testPackId: string, idempotencyKey: string) =>
  rpc(client, "archive_test_pack", { target_test_pack_id: testPackId, target_idempotency_key: idempotencyKey })

export const moveTestPackIsometric = (client: Client, testPackId: string, isometricId: string, destinationTestPackId: string, idempotencyKey: string) =>
  rpc(client, "move_test_pack_isometric", { target_target_test_pack_id: destinationTestPackId, target_isometric_id: isometricId, target_idempotency_key: idempotencyKey })

export const assignLineCheck = (client: Client, input: LineCheckAssignment, idempotencyKey: string) =>
  rpc(client, "assign_line_check", { target_test_pack_id: input.testPackId, target_isometric_ids: input.isometricIds, target_team_id: input.teamId, target_assigned_on: input.assignedDate, target_idempotency_key: idempotencyKey })

export const recordLineCheckResult = (client: Client, requestId: string, isometricId: string, completedDate: string, punches: PunchItemInput[], idempotencyKey: string) =>
  rpc(client, "record_line_check_result", { target_request_id: requestId, target_isometric_id: isometricId, target_completed_on: completedDate, target_punches: punches.map((p) => ({ ...p })), target_idempotency_key: idempotencyKey })

export const assignItemClearance = (client: Client, input: ItemClearanceAssignment, idempotencyKey: string) =>
  rpc(client, "assign_item_clearance", { target_test_pack_id: input.testPackId, target_punch_item_ids: input.punchItemIds, target_team_id: input.teamId, target_assigned_on: input.assignedDate, target_idempotency_key: idempotencyKey })

export const recordPunchClearance = (client: Client, requestId: string, punchItemId: string, clearedOn: string, idempotencyKey: string) =>
  rpc(client, "record_punch_clearance", { target_request_id: requestId, target_punch_item_id: punchItemId, target_cleared_on: clearedOn, target_idempotency_key: idempotencyKey })

export const recordPressureTestStage = (client: Client, testPackId: string, stage: string, occurredOn: string, idempotencyKey: string) =>
  rpc(client, "record_pressure_test_stage", { target_test_pack_id: testPackId, target_stage: stage, target_occurred_on: occurredOn, target_idempotency_key: idempotencyKey })

export const assignBlinding = (client: Client, testPackId: string, teamId: string, assignedOn: string, idempotencyKey: string) =>
  rpc(client, "assign_blinding", { target_test_pack_id: testPackId, target_team_id: teamId, target_assigned_on: assignedOn, target_idempotency_key: idempotencyKey })

export const recordBlinding = (client: Client, requestId: string, completedOn: string, idempotencyKey: string) =>
  rpc(client, "record_blinding", { target_request_id: requestId, target_completed_on: completedOn, target_idempotency_key: idempotencyKey })

export const assignReinstatement = (client: Client, testPackId: string, flangeJointRevisionIds: string[], teamId: string, assignedOn: string, idempotencyKey: string) =>
  rpc(client, "assign_reinstatement", { target_test_pack_id: testPackId, target_flange_joint_revision_ids: flangeJointRevisionIds, target_team_id: teamId, target_assigned_on: assignedOn, target_idempotency_key: idempotencyKey })

export const recordReinstatement = (client: Client, requestId: string, flangeJointRevisionId: string, jointDate: string, reportNumber: string, jointerTeamId: string, tagNumber: string, idempotencyKey: string) =>
  rpc(client, "record_reinstatement", { target_request_id: requestId, target_flange_joint_revision_id: flangeJointRevisionId, target_joint_date: jointDate, target_report_number: reportNumber, target_jointer_team_id: jointerTeamId, target_tag_number: tagNumber, target_idempotency_key: idempotencyKey })

export async function listProjectTeams(client: Client, projectId: string, teamType?: string): Promise<ProjectTeamRow[]> {
  let query = client.from("project_teams").select("id, code, description, team_type, status").eq("project_id", projectId).eq("status", "active")
  if (teamType) query = query.eq("team_type", teamType as "line_check" | "blinding" | "finishing" | "reinstatement" | "jointer")
  const { data, error } = await query.order("code")
  fail(error)
  return (data ?? []) as ProjectTeamRow[]
}

const REFERENCE_OPTION_SELECT = "id, code, description"

async function listReferenceOptions(client: Client, table: "project_systems" | "project_service_classes" | "project_line_services" | "project_punch_codes", projectId: string): Promise<ProjectReferenceOptionRow[]> {
  const { data, error } = await client.from(table).select(REFERENCE_OPTION_SELECT).eq("project_id", projectId).eq("status", "active").order("code")
  fail(error)
  return (data ?? []).map((row) => ({ id: row.id, code: row.code, description: row.description }))
}

export const listProjectSystems = (client: Client, projectId: string) => listReferenceOptions(client, "project_systems", projectId)
export const listProjectServiceClasses = (client: Client, projectId: string) => listReferenceOptions(client, "project_service_classes", projectId)
export const listProjectLineServices = (client: Client, projectId: string) => listReferenceOptions(client, "project_line_services", projectId)
export const listProjectPunchCodes = (client: Client, projectId: string) => listReferenceOptions(client, "project_punch_codes", projectId)

export async function listProjectSubsystems(client: Client, projectId: string): Promise<ProjectSubsystemOptionRow[]> {
  const { data, error } = await client.from("project_subsystems").select(`${REFERENCE_OPTION_SELECT}, system_id`).eq("project_id", projectId).eq("status", "active").order("code")
  fail(error)
  return (data ?? []).map((row) => ({ id: row.id, code: row.code, description: row.description, systemId: row.system_id }))
}

/** Readiness carries no business ISO number, so the label is resolved from the owning project. */
export async function listProjectIsometricNumbers(client: Client, projectId: string): Promise<IsometricNumberRow[]> {
  const { data, error } = await client.from("isometrics").select("id, iso_number").eq("project_id", projectId).order("iso_number")
  fail(error)
  return (data ?? []).map((row) => ({ id: row.id, isoNumber: row.iso_number }))
}

export async function listAvailableIsometricReadiness(client: Client, projectId: string): Promise<IsometricReadinessRow[]> {
  const { data, error } = await client.from("isometric_readiness").select("*").eq("project_id", projectId).order("isometric_id")
  fail(error)
  return data ?? []
}

export async function listLineCheckWorklist(client: Client, projectId: string, testPackId?: string): Promise<LineCheckWorklistRow[]> {
  let query = client.from("line_check_worklist").select("*").eq("project_id", projectId)
  if (testPackId) query = query.eq("test_pack_id", testPackId)
  const { data, error } = await query.order("assigned_on")
  fail(error)
  return data ?? []
}

export async function listItemClearanceWorklist(client: Client, projectId: string, testPackId?: string): Promise<ItemClearanceWorklistRow[]> {
  let query = client.from("item_clearance_worklist").select("*").eq("project_id", projectId)
  if (testPackId) query = query.eq("test_pack_id", testPackId)
  const { data, error } = await query.order("assigned_on")
  fail(error)
  return data ?? []
}

export async function listBlindingWorklist(client: Client, projectId: string, testPackId?: string): Promise<BlindingWorklistRow[]> {
  let query = client.from("blinding_worklist").select("*").eq("project_id", projectId)
  if (testPackId) query = query.eq("test_pack_id", testPackId)
  const { data, error } = await query.order("assigned_on")
  fail(error)
  return data ?? []
}

export async function listTestingPrecommWorklist(client: Client, projectId: string, testPackId?: string): Promise<TestingPrecommWorklistRow[]> {
  let query = client.from("testing_precomm_worklist").select("*").eq("project_id", projectId)
  if (testPackId) query = query.eq("test_pack_id", testPackId)
  const { data, error } = await query.order("test_pack_id")
  fail(error)
  return data ?? []
}

export async function listReinstatementWorklist(client: Client, projectId: string, testPackId?: string): Promise<ReinstatementWorklistRow[]> {
  let query = client.from("reinstatement_worklist").select("*").eq("project_id", projectId)
  if (testPackId) query = query.eq("test_pack_id", testPackId)
  const { data, error } = await query.order("request_number")
  fail(error)
  return data ?? []
}

export async function listRequestDetails(client: Client, projectId: string, requestId: string): Promise<RequestDetailsRow | null> {
  const { data, error } = await client.from("pressure_test_request_details").select("*").eq("project_id", projectId).eq("id", requestId).maybeSingle()
  fail(error)
  return data
}

export async function listPunchItems(client: Client, projectId: string, testPackId: string): Promise<Row[]> {
  const { data, error } = await client.from("punch_items").select("id, item_number, isometric_id, spool_id, punch_code_id, description, checking_date, completion_date").eq("project_id", projectId).eq("test_pack_id", testPackId).order("item_number")
  fail(error)
  return (data ?? []) as Row[]
}

export async function listFlangeJointReadiness(client: Client, projectId: string): Promise<FlangeJointReadinessRow[]> {
  void projectId
  const { data, error } = await client.from("flange_joint_readiness").select("*").eq("requires_reinstatement", true).eq("is_removed", false).eq("revision_status", "accepted").order("flange_number")
  fail(error)
  return data ?? []
}
