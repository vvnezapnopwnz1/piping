import assert from "node:assert/strict"

import type { WelderQualification, WeldingProcedure } from "../domain/weld-progress"
import { weldFormChoices } from "./weld-form-choices"

const wps = (id: string, subcontractorId: string | null): WeldingProcedure => ({
  id,
  code: id,
  status: "active",
  subcontractorId,
  materialTypeId: "mat",
  diameterFrom: 1,
  diameterTo: 12,
  thicknessFrom: 2,
  thicknessTo: 20,
  approvedOn: "2026-01-01",
})
const welder = (id: string, subcontractorId: string): WelderQualification => ({
  id,
  welderCode: id,
  status: "active",
  subcontractorId,
  expiresOn: "2027-01-01",
  wpsIds: [],
})
const procedures = [wps("wps-shop", "shop"), wps("wps-field", "field"), wps("wps-any", null)]
const welders = [welder("w-shop", "shop"), welder("w-field", "field")]
const area = { shopSubcontractorId: "shop", fieldSubcontractorId: "field" }

const shop = weldFormChoices({ weldLocation: "shop", area, pickedSubcontractorId: "field", procedures, welders })
assert.equal(shop.subcontractorId, "shop")
assert.equal(shop.isFixedByArea, true)
assert.deepEqual(shop.procedures.map((p) => p.id), ["wps-shop", "wps-any"])
assert.deepEqual(shop.welders.map((w) => w.id), ["w-shop"])

const field = weldFormChoices({ weldLocation: "field", area, pickedSubcontractorId: "", procedures, welders })
assert.equal(field.subcontractorId, "field")
assert.deepEqual(field.procedures.map((p) => p.id), ["wps-field", "wps-any"])
assert.deepEqual(field.welders.map((w) => w.id), ["w-field"])

// An area that names none for this location leaves the choice to the person, and the lists follow it.
const open = weldFormChoices({
  weldLocation: "field",
  area: { shopSubcontractorId: "shop", fieldSubcontractorId: null },
  pickedSubcontractorId: "shop",
  procedures,
  welders,
})
assert.equal(open.isFixedByArea, false)
assert.equal(open.subcontractorId, "shop")
assert.deepEqual(open.welders.map((w) => w.id), ["w-shop"])

const nothingPicked = weldFormChoices({ weldLocation: "shop", area: null, pickedSubcontractorId: "", procedures, welders })
assert.equal(nothingPicked.subcontractorId, "")
assert.equal(nothingPicked.procedures.length, 3)
assert.equal(nothingPicked.welders.length, 2)
