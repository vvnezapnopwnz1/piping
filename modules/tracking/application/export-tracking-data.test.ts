import assert from "node:assert/strict"
import { buildTrackingDataDumpFiles, toCsv } from "./export-tracking-data"

assert.equal(
  toCsv(["Code", "Description"], [["LOC-1", "Yard, north"], ["LOC-2", "A \"quoted\" yard"]]),
  '\uFEFFCode,Description\r\nLOC-1,"Yard, north"\r\nLOC-2,"A ""quoted"" yard"',
)

const files = buildTrackingDataDumpFiles("TRACK 08/A", {
  active_spools: [{ iso_number: "ISO-1", spool_number: "SP-1", pds_area_code: null, construction_status: "active", current_location_code: "LOC-1", last_event_at: null }],
  sub_locations: [{ location_code: "LOC-1", location_description: "Yard", category_code: "YARD", capacity: 10, current_count: 1 }],
  pda_users: [{ membership_id: "member-1", full_name: "Operator", email: "operator@example.test", device_code: "PDA-1", last_used_at: null }],
})
assert.deepEqual(files.map((file) => file.filename), [
  "TRACK-08-A-active-spools.csv",
  "TRACK-08-A-sub-locations.csv",
  "TRACK-08-A-pda-users.csv",
])
assert.equal(files.every((file) => file.mimeType === "text/csv;charset=utf-8"), true)

const empty = buildTrackingDataDumpFiles("TRACK-08", { active_spools: [], sub_locations: [], pda_users: [] })
assert.equal(empty[0].content.split("\r\n").length, 1)
