import assert from "node:assert/strict"
import test from "node:test"
import { getTrackingDataDump, loadTrackingDeviceManagement, loadTrackingOccupancy, loadTrackingWorklist, recordTrackingEvent } from "./supabase-tracking-repository"

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
