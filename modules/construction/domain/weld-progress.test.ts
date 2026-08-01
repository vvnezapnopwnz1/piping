import assert from "node:assert/strict"

import {
  validateAllocation,
  validateProcedure,
  validateWeldProgress,
  validateWelder,
  type JointDefinition,
  type PointAssignment,
  type WelderQualification,
  type WeldingProcedure,
} from "./weld-progress"

const joint: JointDefinition = {
  weldLocation: "shop",
  diameterInch: 6,
  thicknessMm: 12,
  availablePointTypes: ["root", "cap"],
}

const wps: WeldingProcedure = {
  id: "wps-1",
  code: "WPS-1",
  status: "active",
  subcontractorId: "sub-1",
  materialTypeId: "mat-1",
  diameterFrom: 1,
  diameterTo: 12,
  thicknessFrom: 2,
  thicknessTo: 20,
  approvedOn: "2026-01-01",
}

const welderOne: WelderQualification = {
  id: "welder-1",
  welderCode: "W-1",
  status: "active",
  subcontractorId: "sub-1",
  expiresOn: "2027-01-01",
  wpsIds: ["wps-1"],
}

const welderTwo: WelderQualification = { ...welderOne, id: "welder-2", welderCode: "W-2" }

const points: PointAssignment[] = [
  { pointType: "root", welderQualificationId: "welder-1", completionPercent: 50, weldedOn: "2026-08-05" },
  { pointType: "cap", welderQualificationId: "welder-2", completionPercent: 50, weldedOn: "2026-08-05" },
]

// Dossier 7.3: Root + Cap = 100, Heat + Fill is 0 or 100, one welder per point.
assert.deepEqual(validateAllocation(points, true), [])
assert.deepEqual(validateAllocation([], false), [])
assert.equal(validateAllocation([], true).length, 1)
assert.equal(
  validateAllocation(
    [
      { ...points[0], completionPercent: 50 },
      { ...points[1], completionPercent: 70 },
    ],
    true,
  ).length,
  1,
)
assert.equal(
  validateAllocation(
    [
      ...points,
      { pointType: "hot", welderQualificationId: "welder-3", completionPercent: 40, weldedOn: "2026-08-05" },
    ],
    true,
  ).length,
  1,
)
assert.deepEqual(
  validateAllocation(
    [
      ...points,
      { pointType: "hot", welderQualificationId: "welder-3", completionPercent: 60, weldedOn: "2026-08-05" },
      { pointType: "fill", welderQualificationId: "welder-4", completionPercent: 40, weldedOn: "2026-08-05" },
    ],
    true,
  ),
  [],
)
// The second point requires a different welder.
assert.equal(
  validateAllocation(
    [points[0], { ...points[1], welderQualificationId: "welder-1" }],
    true,
  ).length,
  1,
)

// Dossier 11.6
assert.deepEqual(validateProcedure(wps, joint, "sub-1", "2026-08-05"), [])
assert.equal(validateProcedure({ ...wps, status: "archived" }, joint, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, { ...joint, diameterInch: 24 }, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, { ...joint, thicknessMm: 30 }, "sub-1", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, joint, "sub-2", "2026-08-05").length, 1)
assert.equal(validateProcedure(wps, joint, "sub-1", "2025-12-31").length, 1)

// Dossier 11.7 — expiry is checked against the point's own date.
assert.deepEqual(validateWelder(welderOne, wps, "sub-1", "2026-08-05"), [])
assert.equal(validateWelder({ ...welderOne, expiresOn: "2026-08-04" }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, wpsIds: [] }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, subcontractorId: "sub-2" }, wps, "sub-1", "2026-08-05").length, 1)
assert.equal(validateWelder({ ...welderOne, status: "inactive" }, wps, "sub-1", "2026-08-05").length, 1)

// The whole record
assert.deepEqual(
  validateWeldProgress({
    joint,
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }),
  [],
)
// Dossier 16.5: shop joints only.
assert.equal(
  validateWeldProgress({
    joint: { ...joint, weldLocation: "field" },
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }).length,
  1,
)
// A point the definition does not have.
assert.equal(
  validateWeldProgress({
    joint: { ...joint, availablePointTypes: ["root"] },
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: false,
  }).length,
  1,
)
// Dossier 30 prohibition 4.
assert.equal(
  validateWeldProgress({
    joint,
    procedure: wps,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders: [welderOne, welderTwo],
    isLocked: true,
  }).length,
  1,
)
