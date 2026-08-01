import assert from "node:assert/strict"
import { buildSpoolgenSubmission } from "./import-spooling"

const weld = "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tLINE_NUMBER\tSPOOL_NUMBER\tSPOOL_WEIGHT_KG\tWELD_NUMBER\tWELD_TYPE\tWELD_LOCATION\tDIAMETER_INCH\tTHICKNESS_MM\nISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-1\tBW\tshop\t6\t8.2\nISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-2\tBW\tshop\t6\t8.2"
const supp = "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\tSUPPORT_TYPE\tQUANTITY\nISO-A\tSP-1\tSU-1\tSHOE\t2"
const submission = buildSpoolgenSubmission({ weld, supp })
assert.equal(submission.canSubmit, true)
assert.equal(submission.summary.blockerCount, 0)
assert.deepEqual(submission.rows.map((row) => row.normalizedValues.entity_type), ["isometric", "spool", "weld_joint", "weld_joint", "support"])
assert.deepEqual(submission.rows.map((row) => row.rowNumber), [1, 2, 3, 4, 5])
assert.equal(submission.rows[0].normalizedValues.revision_number, "R0")
assert.equal(submission.rows[1].normalizedValues.sequence_number, "1")
for (const row of submission.rows) for (const value of Object.values(row.normalizedValues)) assert.equal(typeof value, "string")
assert.equal(buildSpoolgenSubmission({ supp }).canSubmit, false)
assert.ok(buildSpoolgenSubmission({ weld, supp: "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-9\tSU-9" }).issues.some((issue) => issue.code === "ORPHAN_SPOOL"))
