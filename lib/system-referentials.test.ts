import assert from "node:assert/strict"
import {
  SYSTEM_REFERENCE_SECTIONS,
  toSystemReferentialSection,
  toSystemReferenceEntry,
  validateMaterialType,
  toMaterialTypeInsert,
  toMaterialTypeUpdate,
} from "./system-referentials"

// Test section mappings
assert.equal(toSystemReferentialSection("material_type"), "materialTypes")
assert.equal(toSystemReferentialSection("film_quantity"), "filmQty")
assert.equal(toSystemReferentialSection("ut_calculation"), "utCalc")
assert.equal(toSystemReferentialSection("torquing_requirement"), "torquing")

// Test section config details
assert.equal(SYSTEM_REFERENCE_SECTIONS.materialTypes.kind, "material_type")
assert.equal(SYSTEM_REFERENCE_SECTIONS.materialTypes.title, "Material Type")
assert.equal(SYSTEM_REFERENCE_SECTIONS.materialTypes.mutable, true)

assert.equal(SYSTEM_REFERENCE_SECTIONS.filmQty.kind, "film_quantity")
assert.equal(SYSTEM_REFERENCE_SECTIONS.filmQty.title, "Film Quantity per Diameter")
assert.equal(SYSTEM_REFERENCE_SECTIONS.filmQty.mutable, false)

assert.equal(SYSTEM_REFERENCE_SECTIONS.utCalc.kind, "ut_calculation")
assert.equal(SYSTEM_REFERENCE_SECTIONS.utCalc.title, "UT Calculation")
assert.equal(SYSTEM_REFERENCE_SECTIONS.utCalc.mutable, false)

assert.equal(SYSTEM_REFERENCE_SECTIONS.torquing.kind, "torquing_requirement")
assert.equal(SYSTEM_REFERENCE_SECTIONS.torquing.title, "Torquing Requirement")
assert.equal(SYSTEM_REFERENCE_SECTIONS.torquing.mutable, false)

// Test validation - valid
const validResult = validateMaterialType({ code: " MAT-01 ", description: " Carbon steel " })
assert.deepEqual(validResult, {
  isValid: true,
  errors: {},
  value: { code: "MAT-01", description: "Carbon steel" },
})

// Test validation - blank code
const invalidCodeResult = validateMaterialType({ code: "  ", description: "Carbon steel" })
assert.equal(invalidCodeResult.isValid, false)
assert.equal(invalidCodeResult.errors.code, "Code is required")

// Test validation - blank description
const invalidDescResult = validateMaterialType({ code: "MAT-01", description: "   " })
assert.equal(invalidDescResult.isValid, false)
assert.equal(invalidDescResult.errors.description, "Description is required")

// Test payload keys for insert
const insertPayload = toMaterialTypeInsert({ code: " MAT-01 ", description: " Carbon steel " })
assert.deepEqual(Object.keys(insertPayload).sort(), ["code", "description", "kind"])
assert.deepEqual(insertPayload, {
  kind: "material_type",
  code: "MAT-01",
  description: "Carbon steel",
})

// Test payload keys for update
const updatePayload = toMaterialTypeUpdate({ code: " MAT-01 ", description: " Carbon steel " })
assert.deepEqual(Object.keys(updatePayload).sort(), ["code", "description"])
assert.deepEqual(updatePayload, {
  code: "MAT-01",
  description: "Carbon steel",
})

// Test toSystemReferenceEntry
const rawRow = {
  id: "sys-123",
  kind: "material_type" as const,
  code: "CS",
  description: "Carbon Steel",
  status: "active" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
}
const entry = toSystemReferenceEntry(rawRow)
assert.deepEqual(entry, {
  id: "sys-123",
  kind: "material_type",
  code: "CS",
  description: "Carbon Steel",
  status: "active",
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
})

const inactiveEntry = toSystemReferenceEntry({ ...rawRow, status: "inactive" })
assert.equal(inactiveEntry.active, false)
assert.equal(inactiveEntry.status, "inactive")

console.log("All lib/system-referentials.test.ts assertions passed!")
