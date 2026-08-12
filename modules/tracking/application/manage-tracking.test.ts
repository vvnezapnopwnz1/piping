import assert from "node:assert/strict"
import test from "node:test"
import { buildTrackingDashboard, createLatestProjectLoader, normalizeTrackingError } from "./manage-tracking"

test("dashboard accepts open shared values and computes real metrics", () => {
  const worklist = [
    { projectId: "p", spoolId: "s1", spoolRevisionId: "r1", isoNumber: "ISO", spoolNumber: "S1", pdsAreaCode: null, constructionStatus: "future_status", currentLocationId: null, currentLocationCode: null, isInTransit: true, hasEverScanned: true, isActive: true, lastEventAt: "2026-08-01T00:00:00Z" },
    { projectId: "p", spoolId: "s2", spoolRevisionId: "r2", isoNumber: "ISO", spoolNumber: "S2", pdsAreaCode: null, constructionStatus: "active", currentLocationId: "l", currentLocationCode: "YARD", isInTransit: false, hasEverScanned: false, isActive: true, lastEventAt: null },
  ]
  const events = [{ id: "e", projectId: "p", spoolId: "s1", spoolRevisionId: "r1", locationId: "l", locationCode: "YARD", deviceId: "d", operatorMembershipId: "m", direction: "out" as const, occurredAt: "2026-08-05T00:00:00Z", source: "manual", compensatesEventId: null, reason: null, recordedAt: "2026-08-05T00:00:00Z" }]
  const usage = [{ projectId: "p", deviceId: "d", deviceCode: "PDA-1", operatorMembershipId: "m", locationId: "l", locationCode: "YARD", scanCount: 4, lastUsedAt: "2026-08-05T00:00:00Z" }]
  const dashboard = buildTrackingDashboard(worklist, events, usage, 1, new Date("2026-08-09T00:00:00Z"))
  assert.equal(dashboard.activeSpools, 2)
  assert.equal(dashboard.distinctSpoolsScanned, 1)
  assert.equal(dashboard.scansThisMonth, 1)
  assert.equal(dashboard.overdue, 1)
  assert.equal(dashboard.mostUsedDevice, "PDA-1")
})

test("latest-project loader suppresses a stale project response", async () => {
  const commits: string[] = []
  let releaseA!: (value: string) => void
  const loader = createLatestProjectLoader<string>()
  const a = loader.run("a", () => new Promise((resolve) => { releaseA = resolve }), (value) => commits.push(value))
  await loader.run("b", async () => "project-b", (value) => commits.push(value))
  releaseA("project-a")
  await a
  assert.deepEqual(commits, ["project-b"])
})

test("tracking database errors have stable user messages", () => {
  assert.equal(normalizeTrackingError({ code: "PQS04" }).message, "Departure requires the spool at the selected location.")
  assert.equal(normalizeTrackingError({ code: "PQS09" }).message, "Tracking history is append-only.")
  assert.equal(normalizeTrackingError(new Error("network unavailable")).message, "network unavailable")
})
