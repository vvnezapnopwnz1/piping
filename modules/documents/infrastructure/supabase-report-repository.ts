import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { selectAllRows } from "@/lib/supabase/select-all-rows"
import type { NdeRegisterRow, PunchRow, TestPackDocumentRow, WeldLogRow } from "../domain/report"

type Client = SupabaseClient<Database>
type ViewRow<Name extends keyof Database["public"]["Views"]> = Database["public"]["Views"][Name]["Row"]

export interface DocumentScope {
  projectId: string
  testPackId?: string
}

const WELD_LOG_SELECT = "weld_joint_revision_id, isometric_id, iso_number, revision_number, line_number, spool_number, weld_number, weld_location, weld_type_code, diameter_inch, thickness_mm, wps_code, welder_codes, weld_on, nde_methods, nde_pending, nde_rejected, pwht_required, pwht_accepted, trace_numbers, test_pack_id, test_pack_number" as const

const NDE_REGISTER_SELECT = "obligation_id, isometric_id, iso_number, spool_number, weld_number, weld_location, welder_codes, method, selection_mode, required_coverage, disposition, batch_number, batch_status, ndt_subcontractor_name, examined_on, outcome, report_number, defect_code, test_pack_id, test_pack_number" as const

const TEST_PACK_SELECT = "test_pack_id, test_pack_number, revision_no, lifecycle, system_code, system_description, subsystem_code, subsystem_description, service_class_code, line_service_code, test_medium, test_pressure, pressure_unit, location, planned_start_on, planned_end_on, is_rft, rft_on, testing_started_on, testing_completed_on, precommissioning_completed_on, iso_count, line_numbers, weld_total, weld_done, open_x_count" as const

const PUNCH_SELECT = "id, item_number, description, checking_date, completion_date, test_packs(test_pack_number), isometrics(iso_number), spools(spool_number), project_punch_codes(code)" as const

function toWeldLogRow(row: Omit<ViewRow<"weld_log_rows">, "project_id">): WeldLogRow {
  return {
    weldJointRevisionId: row.weld_joint_revision_id ?? "",
    isometricId: row.isometric_id ?? "",
    isoNumber: row.iso_number ?? "",
    revisionNumber: row.revision_number ?? "",
    lineNumber: row.line_number,
    spoolNumber: row.spool_number ?? "",
    weldNumber: row.weld_number ?? "",
    weldLocation: row.weld_location ?? "",
    weldTypeCode: row.weld_type_code,
    diameterInch: row.diameter_inch,
    thicknessMm: row.thickness_mm,
    wpsCode: row.wps_code,
    welderCodes: row.welder_codes ?? [],
    weldOn: row.weld_on,
    ndeMethods: row.nde_methods ?? [],
    ndePending: row.nde_pending ?? 0,
    ndeRejected: row.nde_rejected ?? 0,
    pwhtRequired: row.pwht_required === true,
    pwhtAccepted: row.pwht_accepted === true,
    traceNumbers: row.trace_numbers ?? [],
    testPackId: row.test_pack_id,
    testPackNumber: row.test_pack_number,
  }
}

function toNdeRegisterRow(row: Omit<ViewRow<"nde_register_rows">, "project_id">): NdeRegisterRow {
  return {
    obligationId: row.obligation_id ?? "",
    isometricId: row.isometric_id ?? "",
    isoNumber: row.iso_number ?? "",
    spoolNumber: row.spool_number ?? "",
    weldNumber: row.weld_number ?? "",
    weldLocation: row.weld_location ?? "",
    welderCodes: row.welder_codes ?? [],
    method: row.method ?? "",
    selectionMode: row.selection_mode ?? "",
    requiredCoverage: row.required_coverage ?? 0,
    disposition: row.disposition ?? "",
    batchNumber: row.batch_number,
    batchStatus: row.batch_status,
    ndtSubcontractorName: row.ndt_subcontractor_name,
    examinedOn: row.examined_on,
    outcome: row.outcome,
    reportNumber: row.report_number,
    defectCode: row.defect_code,
    testPackId: row.test_pack_id,
    testPackNumber: row.test_pack_number,
  }
}

function toTestPackDocumentRow(row: Omit<ViewRow<"test_pack_document_rows">, "project_id">): TestPackDocumentRow {
  return {
    testPackId: row.test_pack_id ?? "",
    testPackNumber: row.test_pack_number ?? "",
    revisionNo: row.revision_no ?? 0,
    lifecycle: row.lifecycle ?? "",
    systemCode: row.system_code ?? "",
    systemDescription: row.system_description ?? "",
    subsystemCode: row.subsystem_code ?? "",
    subsystemDescription: row.subsystem_description ?? "",
    serviceClassCode: row.service_class_code ?? "",
    lineServiceCode: row.line_service_code ?? "",
    testMedium: row.test_medium ?? "",
    testPressure: row.test_pressure ?? 0,
    pressureUnit: row.pressure_unit ?? "",
    location: row.location ?? "",
    plannedStartOn: row.planned_start_on,
    plannedEndOn: row.planned_end_on,
    isRft: row.is_rft === true,
    rftOn: row.rft_on,
    testingStartedOn: row.testing_started_on,
    testingCompletedOn: row.testing_completed_on,
    precommissioningCompletedOn: row.precommissioning_completed_on,
    isoCount: row.iso_count ?? 0,
    lineNumbers: row.line_numbers ?? [],
    weldTotal: row.weld_total ?? 0,
    weldDone: row.weld_done ?? 0,
    openXCount: row.open_x_count ?? 0,
  }
}

export async function loadWeldLog(client: Client, scope: DocumentScope): Promise<WeldLogRow[]> {
  const rows = await selectAllRows((from, to) => {
    let query = client.from("weld_log_rows").select(WELD_LOG_SELECT).eq("project_id", scope.projectId)
    if (scope.testPackId) query = query.eq("test_pack_id", scope.testPackId)
    return query.order("weld_joint_revision_id").range(from, to)
  })
  return rows.map(toWeldLogRow)
}

export async function loadNdeRegister(client: Client, scope: DocumentScope): Promise<NdeRegisterRow[]> {
  const rows = await selectAllRows((from, to) => {
    let query = client.from("nde_register_rows").select(NDE_REGISTER_SELECT).eq("project_id", scope.projectId)
    if (scope.testPackId) query = query.eq("test_pack_id", scope.testPackId)
    return query.order("obligation_id").range(from, to)
  })
  return rows.map(toNdeRegisterRow)
}

export async function loadTestPackSummary(client: Client, scope: DocumentScope): Promise<TestPackDocumentRow[]> {
  const rows = await selectAllRows((from, to) => {
    let query = client.from("test_pack_document_rows").select(TEST_PACK_SELECT).eq("project_id", scope.projectId)
    if (scope.testPackId) query = query.eq("test_pack_id", scope.testPackId)
    return query.order("test_pack_id").range(from, to)
  })
  return rows.map(toTestPackDocumentRow)
}

export async function loadPunchRegister(client: Client, scope: DocumentScope): Promise<PunchRow[]> {
  const rows = await selectAllRows((from, to) => {
    let query = client.from("punch_items").select(PUNCH_SELECT).eq("project_id", scope.projectId)
    if (scope.testPackId) query = query.eq("test_pack_id", scope.testPackId)
    return query.order("id").range(from, to)
  })
  return rows.map((row) => ({
    id: row.id,
    testPackNumber: row.test_packs?.test_pack_number ?? "",
    itemNumber: row.item_number,
    isoNumber: row.isometrics?.iso_number ?? "",
    spoolNumber: row.spools?.spool_number ?? null,
    punchCode: row.project_punch_codes?.code ?? "",
    description: row.description,
    checkingDate: row.checking_date,
    completionDate: row.completion_date,
  }))
}

/** The name printed as the document's author: the profile name, or the e-mail when the profile has none. */
export async function loadAuthorName(client: Client, userId: string, fallback: string): Promise<string> {
  const { data } = await client.from("profiles").select("full_name").eq("id", userId).maybeSingle()
  return data?.full_name?.trim() || fallback
}
