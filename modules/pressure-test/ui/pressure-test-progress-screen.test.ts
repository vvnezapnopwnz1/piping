import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

/**
 * Track 12 Demo Lite release blocker: completing a Line Check with a Category X punch required
 * typing the `project_punch_codes` UUID into a free-text box, so the X → Item Clearance path was
 * not reproducible from the UI after a clean `demo:prepare`.
 */
const source = readFileSync(new URL("./pressure-test-progress-screen.tsx", import.meta.url), "utf8")

test("the Line Check punch code is chosen from the project catalogue, not typed", () => {
  assert.equal(
    /placeholder="Punch code \(optional\)"/.test(source),
    false,
    "a punch code UUID must never be a free-text input",
  )
  assert.ok(source.includes("listProjectPunchCodes"), "the screen must load project-scoped punch codes")
  assert.ok(
    source.includes("toReferenceOptions(punchCodes).map"),
    "the punch codes must be rendered as code-and-description options",
  )
  assert.ok(
    source.includes("<option key={option.id} value={option.id}>{option.label}</option>"),
    "the option label must be the business code while its value stays the punch code id",
  )
  assert.ok(
    source.includes('updateDraft(row.request_id ?? "", "punchCodeId"'),
    "the selected option must still feed the punchCodeId sent to the RPC",
  )
})

test("Line Check keeps its optional-punch semantics", () => {
  assert.ok(
    source.includes('<option value="">'),
    "an empty option must let a Line Check complete without raising a punch",
  )
  assert.ok(
    source.includes("draft.punchCodeId.trim() ?"),
    "an unselected punch code must still produce an empty punch array",
  )
})

test("the reinstatement report number stays a free-text field", () => {
  assert.ok(
    source.includes('placeholder="Report number"'),
    "reinstatement reuses the draft shape but its report number is not a referential id",
  )
})
