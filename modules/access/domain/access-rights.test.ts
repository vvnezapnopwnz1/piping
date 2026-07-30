import assert from "node:assert/strict"

import {
  normalizeAccessMemberEmail,
  validateAccessMemberInput,
} from "./access-rights"

const editor = validateAccessMemberInput({
  accessRole: "project_editor",
  functionalRoles: ["qc_engineer", "qc_engineer"],
  subcontractorIds: ["sub-b", "sub-a", "sub-b"],
  pdsAreaIds: ["pds-b", "pds-a", "pds-b"],
})
assert.equal(editor.ok, true)
if (editor.ok) {
  assert.deepEqual(editor.value, {
    accessRole: "project_editor",
    functionalRoles: ["qc_engineer"],
    subcontractorIds: [],
    pdsAreaIds: [],
  })
}

for (const input of [
  {
    accessRole: "subcontractor" as const,
    functionalRoles: [],
    subcontractorIds: ["sub-a"],
    pdsAreaIds: ["pds-a"],
    field: "functionalRoles",
  },
  {
    accessRole: "subcontractor" as const,
    functionalRoles: ["nde_inspector" as const],
    subcontractorIds: [],
    pdsAreaIds: ["pds-a"],
    field: "subcontractorIds",
  },
  {
    accessRole: "subcontractor" as const,
    functionalRoles: ["nde_inspector" as const],
    subcontractorIds: ["sub-a"],
    pdsAreaIds: [],
    field: "pdsAreaIds",
  },
] as const) {
  const result = validateAccessMemberInput(input)
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.fieldErrors[input.field])
}

const subcontractor = validateAccessMemberInput({
  accessRole: "subcontractor",
  functionalRoles: ["nde_inspector", "nde_inspector"],
  subcontractorIds: ["sub-b", "sub-a", "sub-b"],
  pdsAreaIds: ["pds-b", "pds-a", "pds-b"],
})
assert.equal(subcontractor.ok, true)
if (subcontractor.ok) {
  assert.deepEqual(subcontractor.value, {
    accessRole: "subcontractor",
    functionalRoles: ["nde_inspector"],
    subcontractorIds: ["sub-b", "sub-a"],
    pdsAreaIds: ["pds-b", "pds-a"],
  })
}

assert.equal(normalizeAccessMemberEmail(" Person@Example.COM "), "person@example.com")
