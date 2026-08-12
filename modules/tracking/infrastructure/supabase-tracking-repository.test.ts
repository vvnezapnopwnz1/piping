import assert from "node:assert/strict"
import test from "node:test"
import { getTrackingDataDump, loadTrackingDeviceManagement, loadTrackingEvents, loadTrackingOccupancy, loadTrackingWorklist, recordTrackingEvent } from "./supabase-tracking-repository"

function queryClient(data: Record<string, unknown>[], calls: unknown[]) {
  return {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(columns: string) { calls.push(["select", columns]); return query },
        eq(field: string, value: string) { calls.push(["eq", field, value]); return query },
        order(field: string) { calls.push(["order", field]); return query },
        then(resolve: (value: unknown) => void) { resolve({ data, error: null }) },
      }
      return query
    },
  } as never
}

test("worklist and occupancy reads always add the visible project filter", async () => {
  const calls: unknown[] = []
  const client = queryClient([], calls)
  await loadTrackingWorklist(client, "project-a")
  await loadTrackingOccupancy(client, "project-a")
  assert.equal(calls.filter((call) => JSON.stringify(call) === JSON.stringify(["eq", "project_id", "project-a"])).length, 2)
})

test("occupancy preserves legacy null capacity", async () => {
  const rows = await loadTrackingOccupancy(queryClient([{
    project_id: "p", location_id: "l", category_code: "YARD", location_code: "L-1",
    location_description: "Legacy", capacity: null, current_count: 3, remaining_capacity: null,
  }], []), "p")
  assert.equal(rows[0]?.capacity, null)
  assert.equal(rows[0]?.currentCount, 3)
})

test("record command does not accept client-supplied provenance", async () => {
  const calls: unknown[] = []
  const client = { rpc(name: string, args: Record<string, unknown>) { calls.push([name, args]); return Promise.resolve({ data: { id: "event-1", project_id: "p", spool_id: "s", spool_revision_id: "r", location_id: "l", device_id: null, operator_membership_id: "m", direction: "in", occurred_at: "2026-08-09T00:00:00Z", source: "manual", compensates_event_id: null, reason: null, recorded_at: "2026-08-09T00:00:00Z" }, error: null }) } } as never
  await recordTrackingEvent(client, { projectId: "p", spoolId: "s", locationId: "l", deviceId: null, direction: "in", occurredAt: "2026-08-09T00:00:00Z", reason: null, compensatesEventId: null, idempotencyKey: "key" })
  const rpcCall = calls[0] as [string, Record<string, unknown>]
  const payload = rpcCall[1]
  assert.equal(rpcCall[0], "record_location_event")
  assert.equal("p_source" in payload, false)
  assert.equal("p_operator_membership_id" in payload, false)
  assert.equal("p_recorded_by" in payload, false)
})

test("data dump calls the project-scoped RPC", async () => {
  const calls: unknown[] = []
  const client = { rpc(name: string, args: Record<string, unknown>) { calls.push([name, args]); return Promise.resolve({ data: { active_spools: [], sub_locations: [], pda_users: [] }, error: null }) } } as never
  const dump = await getTrackingDataDump(client, "project-a")
  assert.deepEqual(calls[0], ["get_tracking_data_dump", { p_project_id: "project-a" }])
  assert.deepEqual(dump.active_spools, [])
})

test("device management includes unassigned devices through its project view", async () => {
  const rows = await loadTrackingDeviceManagement(queryClient([{ project_id: "p", device_id: "d", device_code: "PDA", device_description: "Spare", device_status: "active", assigned_membership_id: null, assignment_status: null, scan_count: 0, most_frequent_operator_membership_id: null, most_frequent_location_code: null, last_used_at: null }], []), "p")
  assert.equal(rows[0]?.assignedMembershipId, null)
  assert.equal(rows[0]?.scanCount, 0)
})

// The spool history table printed `event.locationId` — a raw UUID — under its Location column.
// loadTrackingWorklist two functions above already solves this by carrying both the id and the
// code; the event read follows the same shape, via a PostgREST embed since spool_location_events
// is a base table rather than a view.
test("loadTrackingEvents exposes a location code alongside the location id", async () => {
  const calls: unknown[] = []
  const rows = await loadTrackingEvents(queryClient([{
    id: "event-1", project_id: "p", spool_id: "s", spool_revision_id: "r",
    location_id: "11111111-1111-1111-1111-111111111111",
    project_locations: { code: "LAYDOWN-A" },
    device_id: null, operator_membership_id: "m", direction: "in",
    occurred_at: "2026-08-11T00:00:00Z", source: "manual",
    compensates_event_id: null, reason: null, recorded_at: "2026-08-11T00:00:00Z",
  }], calls), "p")
  assert.equal(rows[0]?.locationCode, "LAYDOWN-A")
  assert.equal(rows[0]?.locationId, "11111111-1111-1111-1111-111111111111")
  assert.ok(
    calls.some((call) => Array.isArray(call) && call[0] === "select" && String(call[1]).includes("project_locations(code)")),
    "the read must ask PostgREST for the location code",
  )
})

// A location row that has since been removed must degrade to the id, never render "undefined".
test("loadTrackingEvents falls back to the id when no location row is embedded", async () => {
  const rows = await loadTrackingEvents(queryClient([{
    id: "event-2", project_id: "p", spool_id: "s", spool_revision_id: "r",
    location_id: "22222222-2222-2222-2222-222222222222",
    project_locations: null,
    device_id: null, operator_membership_id: "m", direction: "out",
    occurred_at: "2026-08-11T00:00:00Z", source: "manual",
    compensates_event_id: null, reason: null, recorded_at: "2026-08-11T00:00:00Z",
  }], []), "p")
  assert.equal(rows[0]?.locationCode, "22222222-2222-2222-2222-222222222222")
})
