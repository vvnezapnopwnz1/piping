import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

/**
 * Track 12 Demo Lite release blocker: the Builder asked the presenter to type four referential
 * UUIDs and listed candidate ISOs by `isometric_id`, so the documented demo path could not be
 * walked from the UI after a clean `demo:prepare`. Nothing but the rendered screen can show that,
 * so it is pinned here the same way `referential-dialogs.test.ts` pins its dialog defects.
 */
const source = readFileSync(new URL("./test-pack-builder-screen.tsx", import.meta.url), "utf8")

test("free-text Builder fields carry no referential ids", () => {
  const textFields = /const TEXT_FIELDS = \[([^\]]*)\]/.exec(source)
  assert.ok(textFields, "the Builder must name the fields it still renders as free text")
  for (const field of ["systemId", "subsystemId", "serviceClassId", "lineServiceId"]) {
    assert.equal(
      textFields[1].includes(field),
      false,
      `${field} is a project reference and must not be a typed text input`,
    )
  }
  for (const field of ["testPackNumber", "location", "priority", "plannedStartOn", "plannedEndOn", "pressure", "volumeM3"]) {
    assert.ok(textFields[1].includes(field), `${field} must stay a typed Builder field`)
  }
})

test("the four project references are rendered as project-scoped selects", () => {
  const referenceFields = /const REFERENCE_FIELDS = \[([\s\S]*?)\]\s*as const/.exec(source)
  assert.ok(referenceFields, "the Builder must declare its referential select fields")
  for (const field of ["systemId", "subsystemId", "serviceClassId", "lineServiceId"]) {
    assert.ok(referenceFields[1].includes(field), `${field} must be offered as a select`)
  }
  for (const loader of [
    "listProjectSystems",
    "listProjectSubsystems",
    "listProjectServiceClasses",
    "listProjectLineServices",
  ]) {
    assert.ok(source.includes(loader), `the Builder must load ${loader} for the current project`)
  }
  assert.ok(
    source.includes("subsystemOptionsForSystem"),
    "Subsystem options must depend on the selected System",
  )
  assert.ok(
    source.includes('keepSelectedOption(current.subsystemId'),
    "changing System must drop a Subsystem that the new System does not own",
  )
})

test("available ISOs are listed by their business ISO number with the id kept as the value", () => {
  assert.ok(source.includes("listProjectIsometricNumbers"), "the Builder must resolve ISO numbers")
  assert.ok(source.includes("isometricOptions("), "the Builder must map readiness rows to labelled options")
  assert.equal(
    /<span>\{item\.isometric_id\}<\/span>/.test(source),
    false,
    "an ISO must never be presented to the presenter as a UUID",
  )
  assert.ok(
    source.includes("value={option.id}") || source.includes("checked={selectedAvailable.includes(option.id)"),
    "the checkbox must still submit the ISO id the compose RPC expects",
  )
})

// `disabled` was tied only to `canManage`, and `submit` is async with no reentrancy guard, so
// clicks landing before the first request settles re-enter it. Because `selected` is set as soon
// as the create resolves, clicks 2+ take the `update` branch instead, bumping `rev N` and writing
// no-op audit rows. The server's unique constraint stops real duplication; the UI noise is real.
test("the submit button carries an in-flight guard, not just the capability check", () => {
  assert.ok(source.includes("submitting"), "the Builder must track a submitting/in-flight state")
  assert.ok(
    /disabled=\{!canManage \|\| submitting\}/.test(source) ||
      /disabled=\{submitting \|\| !canManage\}/.test(source),
    "the submit button must disable while a submit is in flight, not only when the user lacks capability",
  )
  assert.ok(
    /if \(!canManage \|\| submitting\) return/.test(source),
    "submit must refuse re-entry while a previous submit is still in flight",
  )
  assert.ok(
    /finally \{ setSubmitting\(false\) \}/.test(source),
    "the in-flight flag must clear even when the mutation throws",
  )
})

test("server-side validation, idempotency, and the existing composition RPCs are untouched", () => {
  for (const call of [
    "createManagedTestPack",
    "composeManagedTestPack",
    "updateManagedTestPack",
    "browser-create-",
  ]) {
    assert.ok(source.includes(call), `${call} must survive the selector change`)
  }
})
