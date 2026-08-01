import assert from "node:assert/strict"

import { requiredCapabilityForPath } from "./route-capabilities"

assert.equal(
  requiredCapabilityForPath("/admin/system-referential"),
  "system_referential.manage",
)
assert.equal(requiredCapabilityForPath("/fabrication"), "fabrication.view")
assert.equal(requiredCapabilityForPath("/fabrication/dashboard"), "fabrication.view")
assert.equal(requiredCapabilityForPath("/fabrication/material-check"), "fabrication.progress.record")
assert.equal(requiredCapabilityForPath("/fabrication/weld-progress"), "fabrication.progress.record")
assert.equal(requiredCapabilityForPath("/fabrication/qc-release"), "fabrication.qc.release")
assert.equal(requiredCapabilityForPath("/fabrication/pwht-release"), "fabrication.qc.release")
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
