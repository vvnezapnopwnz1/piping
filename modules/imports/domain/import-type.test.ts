import assert from "node:assert/strict"
import {
  IMPORT_TYPES,
  getImportJobTypeLabel,
  getImportTypeDefinition,
  templateHeaderRow,
  requiredColumnKeys,
} from "./import-type"

function run() {
  assert.deepEqual(
    [...IMPORT_TYPES],
    [
      "piping_material_list",
      "welding_procedure",
      "welder_qualification",
      "thickness_flange",
      "nde_matrix",
    ]
  )

  const pml = getImportTypeDefinition("piping_material_list")
  assert.equal(pml.label, "Project Piping Material List")
  assert.deepEqual(pml.naturalKey, ["ident_code", "trace_number"])
  assert.deepEqual(templateHeaderRow("piping_material_list"), [
    "MRR Number",
    "Ident Code",
    "Trace Number",
  ])
  assert.deepEqual(requiredColumnKeys("piping_material_list"), [
    "mrr_number",
    "ident_code",
    "trace_number",
  ])

  // Dossier 11.10: all four thickness/flange fields are mandatory.
  assert.deepEqual(requiredColumnKeys("thickness_flange"), [
    "service_class",
    "diameter_inch",
    "thickness_mm",
    "flange_rating",
  ])

  assert.throws(() => getImportTypeDefinition("nope" as never), /Unknown import type/)

  assert.equal(getImportJobTypeLabel("spooling_definition"), "SpoolGen definition")
  assert.equal(getImportJobTypeLabel("future_import_type"), "Unknown import type: future_import_type")

  console.log("All import-type.test.ts assertions passed!")
}

run()
