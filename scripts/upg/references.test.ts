import assert from "node:assert/strict"
import test from "node:test"

import { DEMO_MANIFEST } from "../demo/manifest"
import { buildDemoReferencePlan } from "../demo/supabase-demo-stand"
import { PDS_AREAS, SERVICE_CLASSES, SYSTEMS, WELDING_PROCEDURES } from "./dataset"
import { IMPORTED_FAMILIES, UPG_REFERENCES } from "./references"

const ids = {
  goldenProjectId: "00000000-0000-0000-0000-000000000001",
  membershipIds: {
    projectAdminA: "00000000-0000-0000-0000-000000000002",
    qcEditor: "00000000-0000-0000-0000-000000000003",
    ndeSubcontractor: "00000000-0000-0000-0000-000000000004",
  },
}
const UPG_ID = "00000000-0000-0000-0000-0000000000a1"

test("the families imported from Excel are empty, so the reconciler never touches them", () => {
  for (const family of IMPORTED_FAMILIES) {
    assert.deepEqual(UPG_REFERENCES[family], [], family)
  }
})

test("UPG-1 brings its own PDS areas, classes, systems, subsystems, line services and the field subcontractor", () => {
  assert.deepEqual(UPG_REFERENCES.pdsAreas.map((area) => area.code), PDS_AREAS.map((area) => area.code))
  assert.deepEqual(UPG_REFERENCES.serviceClasses.map((row) => row.code).sort(), Object.keys(SERVICE_CLASSES).sort())
  assert.deepEqual(UPG_REFERENCES.systems.map((row) => row.code), SYSTEMS.map((system) => system.code))
  assert.equal(UPG_REFERENCES.subsystems.length, SYSTEMS.flatMap((system) => system.subsystems).length)
  assert.ok(UPG_REFERENCES.subcontractors.some((row) => row.code === "ERC-A"))
  assert.deepEqual(
    UPG_REFERENCES.lineServices.map((row) => ({ code: row.code, description: row.description })),
    [
      { code: "PROCESS", description: "Технологическая среда" },
      { code: "AIR", description: "Сжатый воздух" },
      { code: "WATER", description: "Техническая вода" },
    ],
  )
})

test("spooling material types carry the WPS material codes, so record_weld_progress can match a WPS to the spool", () => {
  const typeCodes = UPG_REFERENCES.spoolingMaterialTypes.map((row) => row.code)
  assert.deepEqual(typeCodes.sort(), [...new Set(WELDING_PROCEDURES.map((wps) => wps.materialType))].sort())
  for (const row of UPG_REFERENCES.spoolingMaterialClasses) assert.ok(typeCodes.includes(row.materialTypeCode), row.code)
})

test("everything else is the manifest's, so teams, punch codes, locations and paint rules exist", () => {
  assert.deepEqual(UPG_REFERENCES.teams, DEMO_MANIFEST.references.teams)
  assert.deepEqual(UPG_REFERENCES.paintMatrixRules, DEMO_MANIFEST.references.paintMatrixRules)
  assert.deepEqual(UPG_REFERENCES.locations, DEMO_MANIFEST.references.locations)
})

test("the reference plan accepts a caller-supplied set and addresses it to the target project", () => {
  const plan = buildDemoReferencePlan(ids, new Date("2026-10-09T00:00:00Z"), UPG_ID, UPG_REFERENCES)
  // Plan entries are PlannedReference { key, status, insert, manifest }; the row is `insert`.
  const rows = Object.values(plan)
    .flat()
    .map((entry) => (entry && typeof entry === "object" && "insert" in entry ? (entry as { insert: unknown }).insert : entry)) as { project_id?: string }[]
  const projectRows = rows.filter((row) => row && typeof row === "object" && "project_id" in row)
  assert.ok(projectRows.length > 0)
  assert.ok(projectRows.filter((row) => row.project_id !== undefined).every((row) => row.project_id === UPG_ID || row.project_id === ids.goldenProjectId))
})

test("without the fourth argument the plan is unchanged", () => {
  const preparedOn = new Date("2026-10-09T00:00:00Z")
  assert.deepEqual(
    buildDemoReferencePlan(ids, preparedOn),
    buildDemoReferencePlan(ids, preparedOn, ids.goldenProjectId, DEMO_MANIFEST.references),
  )
})
