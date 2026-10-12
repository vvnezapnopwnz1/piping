// modules/project-setup/ui/reference-catalog.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_REFERENCE,
  REFERENCE_GROUPS,
  REFERENCE_IMPORT_TYPE,
  parseReferenceKey,
  readinessTarget,
  referenceGroupOf,
  referenceQuery,
  referencesMissingData,
  setupStepStatus,
} from "./reference-catalog"
import { IMPORT_TYPES } from "@/modules/imports/domain/import-type"

const allKeys = REFERENCE_GROUPS.flatMap((group) => [...group.keys])

test("every reference key is unique and belongs to exactly one group", () => {
  assert.equal(new Set(allKeys).size, allKeys.length)
  for (const key of allKeys) {
    assert.equal(REFERENCE_GROUPS.filter((g) => (g.keys as readonly string[]).includes(key)).length, 1, key)
  }
  assert.equal(referenceGroupOf("pml"), "welding")
  assert.equal(referenceGroupOf("locations"), "testpack")
})

test("an unknown, empty or inherited key opens the default reference", () => {
  assert.equal(parseReferenceKey("welders"), "welders")
  for (const raw of [null, undefined, "", "fabrication", "toString", "__proto__"]) {
    assert.equal(parseReferenceKey(raw), DEFAULT_REFERENCE, String(raw))
  }
})

test("moving to another reference keeps the project and drops the previous reference's state", () => {
  const current = new URLSearchParams("p=UPG-1&ref=welders&q=ivanov&sort=code&ident=A1&spool=s&material=m&from=%2Ffabrication")
  const next = new URLSearchParams(referenceQuery(current, "pds-areas"))
  assert.deepEqual([...next.entries()], [["p", "UPG-1"], ["ref", "pds-areas"]])
  assert.equal(referenceQuery(new URLSearchParams(""), "teams"), "ref=teams")
})

test("every import type a reference points at exists", () => {
  for (const type of Object.values(REFERENCE_IMPORT_TYPE)) {
    assert.ok((IMPORT_TYPES as readonly string[]).includes(type!), type)
  }
})

test("every readiness code leads to a reference or an admin page", () => {
  assert.deepEqual(readinessTarget("piping_material_records"), { kind: "reference", key: "pml" })
  assert.deepEqual(readinessTarget("service_classes"), { kind: "reference", key: "service-classes" })
  assert.deepEqual(readinessTarget("locations"), { kind: "reference", key: "locations" })
  assert.deepEqual(readinessTarget("material_types"), { kind: "page", href: "/admin/system-referential" })
  assert.deepEqual(readinessTarget("progress_weights_erection"), { kind: "page", href: "/admin/progress-weights" })
  assert.equal(readinessTarget("no_such_code"), null)
  assert.equal(readinessTarget("toString"), null)
})

test("the three NDE matrix codes mark one reference", () => {
  const missing = referencesMissingData(["nde_matrix_shop", "nde_matrix_field", "material_types", "teams"])
  assert.deepEqual([...missing].sort(), ["nde", "teams"])
})

test("setupStepStatus counts missing items per step and finds the first missing reference", () => {
  // all complete
  assert.deepEqual(setupStepStatus([]), {
    systemReferential: 0,
    projectReferential: { missing: 0, first: null },
    progressWeights: 0,
  })

  // only a system code
  assert.deepEqual(setupStepStatus(["material_types"]), {
    systemReferential: 1,
    projectReferential: { missing: 0, first: null },
    progressWeights: 0,
  })

  // NDE shop+assembly+field count as one reference
  assert.deepEqual(
    setupStepStatus(["nde_matrix_shop", "nde_matrix_assembly", "nde_matrix_field"]),
    {
      systemReferential: 0,
      projectReferential: { missing: 1, first: "nde" },
      progressWeights: 0,
    },
  )

  // first missing follows REFERENCE_GROUPS order (welding before testpack, general before welding)
  const status = setupStepStatus(["teams", "weld_types", "subcontractors"])
  assert.deepEqual(status, {
    systemReferential: 0,
    projectReferential: { missing: 3, first: "subcontractors" },
    progressWeights: 0,
  })

  const statusWithoutGeneral = setupStepStatus(["teams", "weld_types"])
  assert.deepEqual(statusWithoutGeneral, {
    systemReferential: 0,
    projectReferential: { missing: 2, first: "weld-types" },
    progressWeights: 0,
  })

  // an unknown code is ignored
  assert.deepEqual(
    setupStepStatus(["unknown_code", "progress_weights_prefabrication"]),
    {
      systemReferential: 0,
      projectReferential: { missing: 0, first: null },
      progressWeights: 1,
    },
  )
})

