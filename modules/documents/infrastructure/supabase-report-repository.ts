import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import type {
  FabricationProgressSnapshot,
  TestPackRftSnapshot,
} from "../domain/report"

type Client = SupabaseClient<Database>

export interface ReportSnapshotRequest {
  projectId: string
  projectCode: string
  generatedAt: Date
}

const FABRICATION_PROGRESS_SELECT = "spool_number, weld_number, weld_location, wps_code, welders, weld_on, obligation_pending, obligation_total" as const

const TEST_PACK_RFT_SELECT = "test_pack_number, lifecycle, is_rft, rft_on, member_count, spool_total, weld_or_support_pending_count, nde_pending_count, pwht_pending_count, flange_pending_count, line_check_pending_count, x_open_count" as const

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || "Unable to load report data")
}

export async function loadFabricationProgressSnapshot(
  client: Client,
  request: ReportSnapshotRequest,
): Promise<FabricationProgressSnapshot> {
  const { data, error } = await client
    .from("weld_progress_summary")
    .select(FABRICATION_PROGRESS_SELECT)
    .eq("project_id", request.projectId)
    .order("spool_number")
  fail(error)

  return {
    projectCode: request.projectCode,
    generatedAt: request.generatedAt,
    rows: (data ?? []).map((row) => ({
      spoolNumber: row.spool_number ?? "",
      weldNumber: row.weld_number ?? "",
      weldLocation: row.weld_location ?? "",
      wpsCode: row.wps_code ?? "",
      welders: row.welders ?? [],
      weldedOn: row.weld_on,
      ndePending: row.obligation_pending ?? 0,
      ndeTotal: row.obligation_total ?? 0,
    })),
  }
}

export async function loadTestPackRftSnapshot(
  client: Client,
  request: ReportSnapshotRequest,
): Promise<TestPackRftSnapshot> {
  const { data, error } = await client
    .from("test_pack_readiness")
    .select(TEST_PACK_RFT_SELECT)
    .eq("project_id", request.projectId)
    .order("test_pack_number")
  fail(error)

  return {
    projectCode: request.projectCode,
    generatedAt: request.generatedAt,
    rows: (data ?? []).map((row) => ({
      testPackNumber: row.test_pack_number ?? "",
      lifecycle: row.lifecycle ?? "",
      isRft: row.is_rft === true,
      rftOn: row.rft_on,
      memberCount: row.member_count ?? 0,
      spoolTotal: row.spool_total ?? 0,
      weldOrSupportPendingCount: row.weld_or_support_pending_count ?? 0,
      ndePendingCount: row.nde_pending_count ?? 0,
      pwhtPendingCount: row.pwht_pending_count ?? 0,
      flangePendingCount: row.flange_pending_count ?? 0,
      lineCheckPendingCount: row.line_check_pending_count ?? 0,
      xOpenCount: row.x_open_count ?? 0,
    })),
  }
}
