import assert from "node:assert/strict"
import { SPOOLING_BUCKET, SPOOLING_BUCKET_MEDIA_TYPES, loadJobIssues, recordSpoolingValidation, spoolingObjectPath, toPreviewChangeItem, uploadSpoolgenFile } from "./supabase-engineering-repository"

assert.equal(SPOOLING_BUCKET, "project-spooling")
// One folder per role; the index keeps many files of one role apart and the name is made safe for a storage key.
assert.equal(spoolingObjectPath("p", "j", "pcf", 7, "ISO 1001.pcf"), "p/j/pcf/007-ISO_1001.pcf")
assert.equal(spoolingObjectPath("p", "j", "weld", 0, "weld.txt"), "p/j/weld/000-weld.txt")
const spool = toPreviewChangeItem({ iso_number: "ISO-A", entity_type: "spool", entity_key: "SP-1", change_type: "revised", requires_decision: true, decision: null, previous_payload: { sequence_number: "1" }, next_payload: { sequence_number: "1" } })
assert.equal(spool.spoolNumber, "SP-1")
assert.equal(spool.requiresDecision, true)
const removedWeld = toPreviewChangeItem({ iso_number: "ISO-A", entity_type: "weld_joint", entity_key: "W-9", change_type: "removed", requires_decision: false, decision: "cancelled", previous_payload: { spool_number: "SP-2" }, next_payload: null })
assert.equal(removedWeld.spoolNumber, "SP-2")
assert.equal(removedWeld.decision, "cancelled")

// Every issue sends the name of its file, and reads it back.
async function issuesKeepTheirFile() {
  const calls: { name: string; args: any }[] = []
  const stored = [{ row_number: 12, column_name: "spool_number", severity: "warning", code: "PCF_SPOOL_FROM_FILE_NAME", message: "PCF_SPOOL_FROM_FILE_NAME", file_name: "ISO-1001.pcf" }]
  const client: any = { rpc: async (name: string, args: any) => { calls.push({ name, args }); return { data: { id: "j", project_id: "p", status: "validated" }, error: null } }, from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: stored, error: null }) }) }) }) }
  await recordSpoolingValidation(client, "j", [], [{ rowNumber: 12, columnName: "spool_number", severity: "warning", code: "X", message: "X", fileName: "ISO-1001.pcf" }, { rowNumber: 1, columnName: null, severity: "blocker", code: "Y", message: "Y", fileName: null }])
  assert.deepEqual(calls[0].args.parsed_issues.map((issue: any) => issue.file_name), ["ISO-1001.pcf", null])
  assert.equal((await loadJobIssues(client, "j"))[0].fileName, "ISO-1001.pcf")
}
void issuesKeepTheirFile()

// The browser takes a file's type from the OS: Linux calls a .pcf a font, Windows calls a .csv an Excel file. The
// bucket refuses a type it does not list, so anything outside its list is uploaded as octet-stream.
async function uploadTypeIsOneTheBucketTakes() {
  const types: string[] = []
  const client: any = { storage: { from: () => ({ upload: async (_path: string, _file: File, options: { contentType: string }) => { types.push(options.contentType); return { error: null } } }) } }
  const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  await uploadSpoolgenFile(client, "p/j/pcf/000-ISO-1.pcf", new File(["ISOGEN-FILES"], "ISO-1.pcf", { type: "application/x-font-pcf" }))
  await uploadSpoolgenFile(client, "p/j/weld/000-welds.xlsx", new File(["x"], "welds.xlsx", { type: xlsx }))
  await uploadSpoolgenFile(client, "p/j/pcf/001-ISO-2.pcf", new File(["ISOGEN-FILES"], "ISO-2.pcf"))
  assert.deepEqual(types, ["application/octet-stream", xlsx, "application/octet-stream"])
  assert.ok(SPOOLING_BUCKET_MEDIA_TYPES.includes(xlsx))
}
void uploadTypeIsOneTheBucketTakes()
