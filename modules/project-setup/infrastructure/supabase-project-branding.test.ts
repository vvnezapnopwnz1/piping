import assert from "node:assert/strict"
import { validateLogoFile, getLogoExtension } from "./supabase-project-branding"

// File size limit validation
assert.equal(validateLogoFile({ size: 1000, type: "image/png" }).ok, true)
assert.equal(validateLogoFile({ size: 3 * 1024 * 1024, type: "image/png" }).ok, false)
assert.equal(validateLogoFile({ size: 1000, type: "application/pdf" }).ok, false)

// Extension resolution
assert.equal(getLogoExtension("image/png"), "png")
assert.equal(getLogoExtension("image/jpeg"), "jpg")
assert.equal(getLogoExtension("image/webp"), "webp")
assert.equal(getLogoExtension("image/svg+xml"), "svg")

console.log("All supabase-project-branding.test.ts assertions passed!")
