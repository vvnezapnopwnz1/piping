import assert from "node:assert/strict"
import { SPOOLING_BUCKET, spoolingObjectPath, toPreviewChangeItem } from "./supabase-engineering-repository"

assert.equal(SPOOLING_BUCKET, "project-spooling")
assert.equal(spoolingObjectPath("30000000-0000-0000-0000-000000000401", "job-1", "weld"), "30000000-0000-0000-0000-000000000401/job-1/weld.txt")
const spool = toPreviewChangeItem({ iso_number: "ISO-A", entity_type: "spool", entity_key: "SP-1", change_type: "revised", requires_decision: true, decision: null, previous_payload: { sequence_number: "1" }, next_payload: { sequence_number: "1" } })
assert.equal(spool.spoolNumber, "SP-1")
assert.equal(spool.requiresDecision, true)
const removedWeld = toPreviewChangeItem({ iso_number: "ISO-A", entity_type: "weld_joint", entity_key: "W-9", change_type: "removed", requires_decision: false, decision: "cancelled", previous_payload: { spool_number: "SP-2" }, next_payload: null })
assert.equal(removedWeld.spoolNumber, "SP-2")
assert.equal(removedWeld.decision, "cancelled")
