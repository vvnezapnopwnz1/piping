import assert from "node:assert/strict"
import { SPOOLING_BUCKET, SPOOLING_BUCKET_MEDIA_TYPES, loadJobIssues, recordSpoolingValidation, spoolingObjectPath, toIsometricRow, toPreviewChangeItem, toSpoolDetail, uploadSpoolgenFile } from "./supabase-engineering-repository"

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
  const client: any = { rpc: async (name: string, args: any) => { calls.push({ name, args }); return { data: { id: "j", project_id: "p", status: "validated" }, error: null } }, from: () => { const page = { order: () => page, range: async (from: number) => ({ data: stored.slice(from), error: null }) }; return { select: () => ({ eq: () => page }) } } }
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

// The list shows the accepted revision and counts only what that revision still holds.
const listed = toIsometricRow({ id: "i1", iso_number: "ISO-1", isometric_revisions: [
  { id: "r0", revision_number: "R0", revision_ordinal: 0, status: "superseded", spool_revisions: [{ is_removed: false, weld_joint_revisions: [{ is_removed: false }] }] },
  { id: "r1", revision_number: "R1", revision_ordinal: 1, status: "accepted", spool_revisions: [
    { is_removed: false, weld_joint_revisions: [{ is_removed: false }, { is_removed: true }, { is_removed: false }] },
    { is_removed: true, weld_joint_revisions: [{ is_removed: false }] },
  ] },
] })
assert.deepEqual(listed, { id: "i1", isoNumber: "ISO-1", revisionId: "r1", revisionNumber: "R1", revisionStatus: "accepted", spoolCount: 1, weldCount: 2 })
// An isometric with only a draft still lists, at its latest revision.
const draftOnly = toIsometricRow({ id: "i2", iso_number: "ISO-2", isometric_revisions: [
  { id: "d0", revision_number: "A", revision_ordinal: 0, status: "draft", spool_revisions: [] },
  { id: "d1", revision_number: "B", revision_ordinal: 1, status: "draft", spool_revisions: [] },
] })
assert.equal(draftOnly.revisionId, "d1")
assert.equal(draftOnly.revisionStatus, "draft")
assert.deepEqual(toIsometricRow({ id: "i3", iso_number: "ISO-3", isometric_revisions: [] }), { id: "i3", isoNumber: "ISO-3", revisionId: null, revisionNumber: null, revisionStatus: null, spoolCount: 0, weldCount: 0 })

// A spool keeps removed items (the pane marks them) and lists everything in natural number order.
const detail = toSpoolDetail({ id: "sr1", is_removed: false, weight_kg: 124.5, material_class: "CS150", spools: { spool_number: "S1" },
  weld_joint_revisions: [
    { id: "w10", weld_location: "field", diameter_inch: 8, thickness_mm: 6.35, is_removed: false, weld_joints: { weld_number: "W10" }, project_weld_types: { code: "BW" } },
    { id: "w2", weld_location: "shop", diameter_inch: 8, thickness_mm: null, is_removed: true, weld_joints: { weld_number: "W2" }, project_weld_types: null },
  ],
  support_revisions: [{ id: "s1", support_type: null, quantity: 1, is_removed: false, supports: { support_number: "SUP1" } }],
  flange_joint_revisions: [{ id: "f1", flange_rating: "150#", diameter_inch: 8, is_removed: false, flange_joints: { flange_number: "F1" } }],
  spool_revision_materials: [{ id: "m2", ident_code: "PIPE-8", description: "Pipe 8\"", quantity: 6, unit: "m" }, { id: "m1", ident_code: "ELB-8", description: null, quantity: 2, unit: null }],
})
assert.deepEqual(detail.welds.map((weld) => [weld.weldNumber, weld.location, weld.typeCode, weld.isRemoved]), [["W2", "shop", null, true], ["W10", "field", "BW", false]])
assert.deepEqual(detail.materials.map((material) => material.identCode), ["ELB-8", "PIPE-8"])
assert.equal(detail.spoolNumber, "S1")
assert.equal(detail.weightKg, 124.5)
assert.equal(detail.supports[0].supportNumber, "SUP1")
assert.equal(detail.flanges[0].rating, "150#")
