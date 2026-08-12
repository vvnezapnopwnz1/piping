import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { normalizeTrackingError } from "../application/manage-tracking"
import {
  normalizeTrackingDirection,
  type RecordTrackingEventInput,
  type TrackingDataDump,
  type TrackingDeviceManagementRow,
  type TrackingDeviceUsageRow,
  type TrackingEventRow,
  type TrackingInconsistencyRow,
  type TrackingOccupancyRow,
  type TrackingTransitAlertRow,
  type TrackingWorklistRow,
} from "../domain/tracking"

type Row = Record<string, unknown>
type QueryResult = { data: Row[] | null; error: unknown }
interface QueryLike extends PromiseLike<QueryResult> {
  select(columns: string): QueryLike
  eq(field: string, value: string): QueryLike
  order(field: string, options?: { ascending?: boolean }): QueryLike
}
interface TrackingClient {
  from(table: string): QueryLike
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

function trackingClient(client: SupabaseClient<Database>): TrackingClient {
  return client as unknown as TrackingClient
}

function fail(error: unknown): void {
  if (error) throw normalizeTrackingError(error)
}

function text(row: Row, field: string): string {
  const value = row[field]
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value)
}

function nullableText(row: Row, field: string): string | null {
  const value = row[field]
  return value === null || value === undefined ? null : String(value)
}

function number(row: Row, field: string): number {
  const value = Number(row[field] ?? 0)
  return Number.isFinite(value) ? value : 0
}

async function loadRows(client: SupabaseClient<Database>, table: string, columns: string, projectId: string, orderField?: string): Promise<Row[]> {
  let query = trackingClient(client).from(table).select(columns).eq("project_id", projectId)
  if (orderField) query = query.order(orderField, { ascending: false })
  const { data, error } = await query
  fail(error)
  return data ?? []
}

export async function loadTrackingWorklist(client: SupabaseClient<Database>, projectId: string): Promise<TrackingWorklistRow[]> {
  const rows = await loadRows(client, "spool_tracking_worklist", "project_id, spool_id, spool_revision_id, iso_number, spool_number, pds_area_code, construction_status, current_location_id, current_location_code, is_in_transit, has_ever_scanned, is_active, last_event_at", projectId)
  return rows.map((row) => ({
    projectId: text(row, "project_id"), spoolId: text(row, "spool_id"), spoolRevisionId: text(row, "spool_revision_id"),
    isoNumber: text(row, "iso_number"), spoolNumber: text(row, "spool_number"), pdsAreaCode: nullableText(row, "pds_area_code"),
    constructionStatus: text(row, "construction_status"), currentLocationId: nullableText(row, "current_location_id"),
    currentLocationCode: nullableText(row, "current_location_code"), isInTransit: row.is_in_transit === true,
    hasEverScanned: row.has_ever_scanned === true, isActive: row.is_active === true, lastEventAt: nullableText(row, "last_event_at"),
  }))
}

export async function loadTrackingEvents(client: SupabaseClient<Database>, projectId: string): Promise<TrackingEventRow[]> {
  const rows = await loadRows(client, "spool_location_events", "id, project_id, spool_id, spool_revision_id, location_id, project_locations(code), device_id, operator_membership_id, direction, occurred_at, source, compensates_event_id, reason, recorded_at", projectId, "occurred_at")
  return rows.map((row) => ({
    id: text(row, "id"), projectId: text(row, "project_id"), spoolId: text(row, "spool_id"), spoolRevisionId: text(row, "spool_revision_id"),
    locationId: text(row, "location_id"),
    locationCode: (row.project_locations as { code?: string } | null)?.code ?? text(row, "location_id"),
    deviceId: nullableText(row, "device_id"), operatorMembershipId: text(row, "operator_membership_id"),
    direction: normalizeTrackingDirection(row.direction) ?? "manual", occurredAt: text(row, "occurred_at"), source: text(row, "source"),
    compensatesEventId: nullableText(row, "compensates_event_id"), reason: nullableText(row, "reason"), recordedAt: text(row, "recorded_at"),
  }))
}

export async function loadTrackingOccupancy(client: SupabaseClient<Database>, projectId: string): Promise<TrackingOccupancyRow[]> {
  const rows = await loadRows(client, "tracking_location_occupancy", "project_id, location_id, category_code, location_code, location_description, capacity, current_count, remaining_capacity", projectId)
  return rows.map((row) => ({
    projectId: text(row, "project_id"), locationId: text(row, "location_id"), categoryCode: text(row, "category_code"), locationCode: text(row, "location_code"),
    locationDescription: text(row, "location_description"), capacity: row.capacity === null || row.capacity === undefined ? null : number(row, "capacity"),
    currentCount: number(row, "current_count"), remainingCapacity: row.remaining_capacity === null || row.remaining_capacity === undefined ? null : number(row, "remaining_capacity"),
  }))
}

export async function loadTrackingTransitAlerts(client: SupabaseClient<Database>, projectId: string): Promise<TrackingTransitAlertRow[]> {
  const rows = await loadRows(client, "spool_transit_alerts", "project_id, spool_id, iso_number, spool_number, departure_location_code, transit_started_at, transit_days, maximum_transit_time_days, is_overdue", projectId, "transit_started_at")
  return rows.map((row) => ({ projectId: text(row, "project_id"), spoolId: text(row, "spool_id"), isoNumber: text(row, "iso_number"), spoolNumber: text(row, "spool_number"), departureLocationCode: nullableText(row, "departure_location_code"), transitStartedAt: text(row, "transit_started_at"), transitDays: number(row, "transit_days"), maximumTransitTimeDays: number(row, "maximum_transit_time_days"), isOverdue: row.is_overdue === true }))
}

export async function loadTrackingDeviceUsage(client: SupabaseClient<Database>, projectId: string): Promise<TrackingDeviceUsageRow[]> {
  const rows = await loadRows(client, "tracking_device_usage", "project_id, device_id, device_code, operator_membership_id, location_id, location_code, scan_count, last_used_at", projectId, "last_used_at")
  return rows.map((row) => ({ projectId: text(row, "project_id"), deviceId: text(row, "device_id"), deviceCode: text(row, "device_code"), operatorMembershipId: text(row, "operator_membership_id"), locationId: text(row, "location_id"), locationCode: text(row, "location_code"), scanCount: number(row, "scan_count"), lastUsedAt: text(row, "last_used_at") }))
}

export async function loadTrackingDeviceManagement(client: SupabaseClient<Database>, projectId: string): Promise<TrackingDeviceManagementRow[]> {
  const rows = await loadRows(client, "tracking_device_management", "project_id, device_id, device_code, device_description, device_status, assigned_membership_id, assignment_status, scan_count, most_frequent_operator_membership_id, most_frequent_location_code, last_used_at", projectId)
  return rows.map((row) => ({ projectId: text(row, "project_id"), deviceId: text(row, "device_id"), deviceCode: text(row, "device_code"), deviceDescription: text(row, "device_description"), deviceStatus: text(row, "device_status"), assignedMembershipId: nullableText(row, "assigned_membership_id"), assignmentStatus: nullableText(row, "assignment_status"), scanCount: number(row, "scan_count"), mostFrequentOperatorMembershipId: nullableText(row, "most_frequent_operator_membership_id"), mostFrequentLocationCode: nullableText(row, "most_frequent_location_code"), lastUsedAt: nullableText(row, "last_used_at") }))
}

export async function loadTrackingInconsistencies(client: SupabaseClient<Database>, projectId: string): Promise<TrackingInconsistencyRow[]> {
  const rows = await loadRows(client, "spool_tracking_inconsistencies", "project_id, spool_id, event_id, occurred_at, issue_code", projectId, "occurred_at")
  return rows.map((row) => ({ projectId: text(row, "project_id"), spoolId: text(row, "spool_id"), eventId: text(row, "event_id"), occurredAt: text(row, "occurred_at"), issueCode: text(row, "issue_code") }))
}

function eventFromRpc(value: unknown): TrackingEventRow {
  const row = (Array.isArray(value) ? value[0] : value) as Row
  if (!row) throw new Error("Tracking command returned no event.")
  return {
    id: text(row, "id"), projectId: text(row, "project_id"), spoolId: text(row, "spool_id"), spoolRevisionId: text(row, "spool_revision_id"), locationId: text(row, "location_id"),
    // The command RPCs return the bare event row, with no location embed to resolve a code from;
    // the screen reloads the worklist after a successful command anyway.
    locationCode: text(row, "location_id"),
    deviceId: nullableText(row, "device_id"), operatorMembershipId: text(row, "operator_membership_id"), direction: normalizeTrackingDirection(row.direction) ?? "manual",
    occurredAt: text(row, "occurred_at"), source: text(row, "source"), compensatesEventId: nullableText(row, "compensates_event_id"), reason: nullableText(row, "reason"), recordedAt: text(row, "recorded_at"),
  }
}

export async function recordTrackingEvent(client: SupabaseClient<Database>, input: RecordTrackingEventInput): Promise<TrackingEventRow> {
  const { data, error } = await trackingClient(client).rpc("record_location_event", {
    p_project_id: input.projectId, p_spool_id: input.spoolId, p_location_id: input.locationId,
    p_device_id: input.deviceId, p_direction: input.direction, p_occurred_at: input.occurredAt,
    p_reason: input.reason, p_compensates_event_id: input.compensatesEventId, p_idempotency_key: input.idempotencyKey,
  })
  fail(error)
  return eventFromRpc(data)
}

export async function getTrackingDataDump(client: SupabaseClient<Database>, projectId: string): Promise<TrackingDataDump> {
  const { data, error } = await trackingClient(client).rpc("get_tracking_data_dump", { p_project_id: projectId })
  fail(error)
  const value = data as Partial<TrackingDataDump> | null
  return { active_spools: value?.active_spools ?? [], sub_locations: value?.sub_locations ?? [], pda_users: value?.pda_users ?? [] }
}
