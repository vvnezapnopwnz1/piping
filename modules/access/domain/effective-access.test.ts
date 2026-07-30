import assert from "node:assert/strict"

import {
  hasCapability,
  hasFunctionalRole,
  isPdsAreaInScope,
  isSubcontractorInScope,
  type EffectiveAccess,
} from "./effective-access"

const reader: EffectiveAccess = {
  projectId: "project-a",
  membershipId: "membership-reader",
  isPlatformAdmin: false,
  accessRole: "project_reader",
  functionalRoles: ["qc_engineer"],
  capabilities: ["project.view", "fabrication.view"],
  subcontractorIds: [],
  pdsAreaIds: [],
}

assert.equal(hasCapability(reader, "fabrication.view"), true)
assert.equal(hasCapability(reader, "fabrication.progress.record"), false)
assert.equal(hasFunctionalRole(reader, "qc_engineer"), true)

const scoped: EffectiveAccess = {
  ...reader,
  accessRole: "subcontractor",
  functionalRoles: ["nde_inspector"],
  capabilities: ["project.view", "nde.view", "nde.result.record"],
  subcontractorIds: ["sub-a"],
  pdsAreaIds: ["pds-a"],
}

assert.equal(isSubcontractorInScope(scoped, "sub-a"), true)
assert.equal(isSubcontractorInScope(scoped, "sub-b"), false)
assert.equal(isSubcontractorInScope(scoped, undefined), false)
assert.equal(isPdsAreaInScope(scoped, "pds-a"), true)
assert.equal(isPdsAreaInScope(scoped, undefined), false)

const platformAdmin: EffectiveAccess = {
  ...reader,
  membershipId: null,
  isPlatformAdmin: true,
  accessRole: null,
  functionalRoles: [],
  capabilities: [],
}

assert.equal(hasCapability(platformAdmin, "access_rights.manage"), true)
assert.equal(isSubcontractorInScope(platformAdmin, undefined), true)
assert.equal(isPdsAreaInScope(platformAdmin, undefined), true)
