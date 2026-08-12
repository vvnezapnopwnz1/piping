import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Two defect classes that only appear when a human opens a dialog, so neither the type checker
 * nor ESLint nor the pgTAP suite can see them. Both were found in this screen family and both
 * are cheap to pin here.
 *
 * 1. `<SelectItem value="">` — Radix Select *throws* during render, because the empty string is
 *    reserved for clearing a Select. Three of these sat in the Add PDS Area dialog, so opening
 *    it crashed the tab. TypeScript is happy: `value` is a string.
 *
 * 2. An Add button whose dialog was never built. `setIsAddNdeOpen(true)` and
 *    `setIsAddPmlOpen(true)` were wired to buttons that no `<Dialog open={…}>` read, so clicking
 *    them did nothing at all. The state was "used", so even `no-unused-vars` only caught it
 *    indirectly, via the submit handler it left orphaned.
 */

const ROOTS = ["app", "components", "modules"]

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const sources = ROOTS.flatMap(walk).filter(
  (path) => path.endsWith(".tsx") && !path.endsWith(".test.tsx"),
)

/** Comments quote the very patterns these assertions forbid, so they are removed before scanning. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

for (const path of sources) {
  const source = withoutComments(readFileSync(path, "utf8"))

  assert.equal(
    /<SelectItem\s+value=""/.test(source),
    false,
    `${path} gives a SelectItem an empty value; Radix throws on render. Use a sentinel and map it back to null.`,
  )

  // `open={…}` is what makes a dialog reachable. Every piece of state a control sets to true
  // must be read by one.
  const opened = new Set(
    [...source.matchAll(/set(Is[A-Za-z0-9]*Open)\(true\)/g)].map(
      (match) => match[1].charAt(0).toLowerCase() + match[1].slice(1),
    ),
  )
  const read = new Set([...source.matchAll(/open=\{(\w+)/g)].map((match) => match[1]))

  for (const flag of opened) {
    assert.ok(
      read.has(flag),
      `${path} sets ${flag} to true but no component reads it as open={${flag}} — the control opens nothing.`,
    )
  }
}

// The dialogs a project cannot be configured without. Each of these referentials blocks a
// documented server-side check when it is absent, so a screen that cannot create one makes the
// product unusable without a seeding script (T02-D2).
{
  const welding = withoutComments(
    readFileSync("modules/project-setup/ui/welding-quality-tabs.tsx", "utf8"),
  )
  for (const handler of [
    "handleCreateServiceClass",
    "handleCreateWeldType",
    "handleCreateWelder",
    "handleCreateThicknessRule",
    "handleCreateNdeRule",
    "handleCreatePml",
    "handleCreateReworkCode",
  ]) {
    assert.ok(
      welding.includes(`onSubmit={${handler}}`),
      `welding-quality-tabs.tsx defines ${handler} but no form submits it`,
    )
  }

  for (const [label, handler] of [
    ["joint category", "handleCreateJointCategory"],
  ] as const) {
    assert.ok(
      welding.includes(`onSubmit={${handler}}`),
      `welding-quality-tabs.tsx defines ${handler} but no form submits it (${label})`,
    )
  }

  // Assembly is a disabled extension point (PQC50 refuses an assembly weld), and the coverage
  // check on this screen only expects shop and field. Offering it would invite a rule for work
  // the project can never record.
  assert.equal(
    /SelectItem value="assembly"/.test(welding),
    false,
    "the NDE matrix rule dialog must not offer the assembly weld location",
  )
}

// Track 09 prerequisites must be creatable from the existing referential screens. These are
// deliberately create-only controls: edit/archive remains outside the flange slice.
{
  const system = withoutComments(
    readFileSync("modules/project-setup/ui/system-referential-screen.tsx", "utf8"),
  )
  for (const [label, handler] of [
    ["torquing requirement", "handleAddTorquingRequirement"],
    ["UT rule", "handleAddUtCalculationRule"],
  ] as const) {
    assert.ok(system.includes(`onSubmit={${handler}}`), `system referential has no ${label} create form`)
  }

  const execution = withoutComments(
    readFileSync("modules/project-setup/ui/execution-reference-tabs.tsx", "utf8"),
  )
  assert.ok(
    execution.includes("onSubmit={handleAddUnitTimeReference}"),
    "execution references have no flange unit-time create form",
  )
  assert.ok(
    execution.includes("FLANGE_JOINTING"),
    "flange unit-time form must use the canonical activity",
  )
  assert.ok(
    execution.includes("onClick={handleAddLocationCategory}"),
    "execution references have no location-category create action",
  )
  assert.ok(
    execution.includes("onClick={handleAddLocation}"),
    "execution references have no capacity-aware location create action",
  )
  assert.ok(
    execution.includes("onClick={handleUpdateLocationCapacity}"),
    "execution references have no legacy-capacity repair action",
  )

  const extended = withoutComments(
    readFileSync("modules/project-setup/ui/extended-reference-tabs.tsx", "utf8"),
  )
  assert.ok(
    extended.includes("onClick={handleAssignDeviceUser}"),
    "extended references have no PDA-user assignment action",
  )
}

// PDS area is a scoping dimension for access rights, so its dialog must let the user say what
// the area actually is rather than silently submitting the defaults (T02-D1).
{
  const geography = withoutComments(
    readFileSync("modules/project-setup/ui/project-geography-tabs.tsx", "utf8"),
  )
  // A control, not a setter call: `setAreaClassId` was already being *reset* after submit, which
  // is why `no-unused-vars` stayed silent about a field the dialog never offered. What matters is
  // that something on screen is bound to the value.
  for (const [state, binding] of [
    ["env", "value={env}"],
    ["areaClassId", "value={areaClassId}"],
    ["isUnitFlag", "checked={isUnitFlag}"],
    ["isRackFlag", "checked={isRackFlag}"],
  ] as const) {
    assert.ok(
      geography.includes(binding),
      `project-geography-tabs.tsx submits ${state} but binds no control to it — the value would always be its default`,
    )
  }

  // The Units & Area Classifications tab rendered a table and nothing else, so a project
  // configured through the screens could never populate the Area Classification select in Add
  // PDS Area — it offered "(None)" and nothing more. Both links of the chain need a writer.
  for (const [label, handler] of [
    ["unit", "handleCreateUnit"],
    ["area classification", "handleCreateAreaClassification"],
  ] as const) {
    assert.ok(
      geography.includes(`onSubmit={${handler}}`),
      `project-geography-tabs.tsx has no ${label} create form`,
    )
  }

  // An area classification with no unit is refused by the domain, so the dialog has to let the
  // operator pick one from the units of this project.
  assert.ok(
    geography.includes("value={acUnitId}"),
    "the Add Area Classification dialog binds no control to the unit it links to",
  )
  assert.ok(
    geography.includes("activeUnits.map("),
    "the Add Area Classification dialog offers no project units to choose from",
  )
}

console.log("All referential-dialogs.test.ts assertions passed!")
