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

// The screen's own "notice" was a useState rendered as a static paragraph at the very top. On a
// scrolled worklist that message lands off-screen from the row just acted on, so a durably-correct
// write produces feedback the operator never sees. Every other mutating screen uses the shared
// toaster mounted in components/pipeqc/app-shell.tsx.
test("the screen uses the real toast system for its success notices, not a static paragraph", () => {
  assert.ok(source.includes('from "sonner"'), "the screen must import the shared toast system")
  assert.ok(source.includes("toast.success("), "a successful record must raise a real toast")
  assert.equal(
    /text-emerald-700/.test(source),
    false,
    "the static emerald notice paragraph must be removed once toast() replaces it",
  )
  assert.equal(
    /setNotice\(/.test(source),
    false,
    "no setNotice call site may survive the swap",
  )
})

test("every durable action on this screen reports through a toast", () => {
  assert.equal(
    (source.match(/toast\.success\(/g) ?? []).length,
    5,
    "line check, punch clearance, blinding, stage and reinstatement each report their outcome",
  )
})

// One page-wide Event date is applied to whichever row action runs next, which is not discoverable
// from a bare "Event date" label sitting above a list of rows.
test("the Event date field explains it is shared across every row action", () => {
  assert.ok(
    /Event date[\s\S]{0,400}applies to whichever row/i.test(source),
    "a caption must tell the user the date field is not per-row",
  )
})

test("the error paragraph is left alone", () => {
  assert.ok(
    source.includes('className="text-sm text-destructive"'),
    "errors keep their inline paragraph; only the success notice moves to a toast",
  )
})

// Item 7's cross-screen pattern: the worklist views now carry the business code beside the id, so
// a row must read "ISO ISO-DEMO-2001", not "ISO 6f3c…". The id stays as the fallback in case a
// referenced row is gone, and stays as the React key either way.
test("worklist rows render business codes rather than raw UUIDs", () => {
  for (const [code, id] of [
    ["iso_number", "isometric_id"],
    ["item_number", "punch_item_id"],
    ["test_pack_number", "test_pack_id"],
    ["flange_number", "flange_joint_revision_id"],
  ]) {
    assert.ok(
      source.includes(`row.${code} ?? row.${id}`),
      `${code} must be rendered in place of ${id}, falling back to the id`,
    )
  }
})

test("no worklist row prints a bare id in its visible label", () => {
  for (const bare of [
    "ISO {row.isometric_id}",
    "punch {row.punch_item_id}",
    "Test Pack {row.test_pack_id}",
    "· {row.flange_joint_revision_id}",
  ]) {
    assert.equal(source.includes(bare), false, `"${bare}" must no longer be rendered`)
  }
})
