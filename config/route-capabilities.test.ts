import assert from "node:assert/strict"

import { requiredCapabilityForPath } from "./route-capabilities"

assert.equal(
  requiredCapabilityForPath("/admin/system-referential"),
  "system_referential.manage",
)
assert.equal(
  requiredCapabilityForPath("/fabrication/weld-progress"), "fabrication.view")
assert.equal(requiredCapabilityForPath("/nde/batch/123"), "nde.view")
assert.equal(
  requiredCapabilityForPath("/admin/access-rights"),
  "access_rights.manage",
)
assert.equal(requiredCapabilityForPath("/admin/imports"), "imports.view")
assert.equal(requiredCapabilityForPath("/admin/project-referential"), "project_referential.manage")
assert.equal(requiredCapabilityForPath("/spooling/import"), "spooling.view")
assert.equal(requiredCapabilityForPath("/spooling/browse"), "spooling.view")
assert.equal(requiredCapabilityForPath("/unknown"), null)
assert.equal(requiredCapabilityForPath("/"), null)
