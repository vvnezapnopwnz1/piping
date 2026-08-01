import assert from "node:assert/strict"
import { useSpoolingStore } from "./spooling-store"
const store = useSpoolingStore.getState(); const first = store.isoRecords[0]
assert.ok(first)
store.composeAndSendTransmittal("PDS-A", [first.id], "tester")
let records = useSpoolingStore.getState().isoRecords.filter((iso) => iso.id === first.id)
assert.equal(records.length, 1); assert.equal(records[0].status, "Released")
useSpoolingStore.getState().applyRevision(first.id, "R9", "engineering change")
records = useSpoolingStore.getState().isoRecords
assert.equal(records.filter((iso) => iso.id === first.id).length, 1)
assert.equal(records.find((iso) => iso.id === first.id)?.status, "Superseded")
assert.equal(records.find((iso) => iso.rev === "R9" && iso.id !== first.id)?.status, "Received")
