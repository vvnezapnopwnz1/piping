import assert from 'node:assert/strict';
import {
  validateWeldingProcedure,
  toWeldingProcedureInsert,
  toWeldingProcedureUpdate,
  toWeldingProcedure,
  getWeldingProcedureStatusActions,
  toWeldingProcedureErrorMessage,
} from './welding-procedures';

const validInput = {
  code: "WPS-001",
  description: "Root pass",
  process: "GTAW",
  materialTypeId: "material-1",
  subcontractorId: "subcontractor-1",
  diameterFrom: 25,
  diameterTo: 300,
  thicknessFrom: 3,
  thicknessTo: 25,
  revision: "Rev.0",
  approvedOn: "2026-07-29"
};

// Test valid input with trimming
assert.deepEqual(
  validateWeldingProcedure({
    code: " WPS-001 ", description: " Root pass ", process: " GTAW ",
    materialTypeId: "material-1", subcontractorId: "subcontractor-1",
    diameterFrom: "25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25",
    revision: " Rev.0 ", approvedOn: "2026-07-29",
  }),
  {
    isValid: true, errors: {},
    value: {
      code: "WPS-001", description: "Root pass", process: "GTAW",
      materialTypeId: "material-1", subcontractorId: "subcontractor-1",
      diameterFrom: 25, diameterTo: 300, thicknessFrom: 3, thicknessTo: 25,
      revision: "Rev.0", approvedOn: "2026-07-29",
    },
  }
);

// Test blank required fields
assert.deepEqual(
  validateWeldingProcedure({
    code: "  ", description: "", process: "  ",
    materialTypeId: "  ", subcontractorId: "  ",
    diameterFrom: "25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25",
    revision: "  ", approvedOn: "  ",
  }).isValid,
  false
);

// Test invalid ranges (non-numeric, Infinity, negative, reversed)
const invalidRanges = [
  { diameterFrom: "abc", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25" },
  { diameterFrom: "25", diameterTo: "Infinity", thicknessFrom: "3", thicknessTo: "25" },
  { diameterFrom: "-25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25" },
  { diameterFrom: "300", diameterTo: "25", thicknessFrom: "3", thicknessTo: "25" }, // reversed
];
for (const r of invalidRanges) {
  assert.deepEqual(
    validateWeldingProcedure({
      code: "WPS-001", description: "", process: "GTAW",
      materialTypeId: "material-1", subcontractorId: "subcontractor-1",
      revision: "Rev.0", approvedOn: "2026-07-29",
      ...r
    }).isValid,
    false
  );
}

// Test invalid calendar date
assert.deepEqual(
  validateWeldingProcedure({
    code: "WPS-001", description: "", process: "GTAW",
    materialTypeId: "material-1", subcontractorId: "subcontractor-1",
    diameterFrom: "25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25",
    revision: "Rev.0", approvedOn: "2026-13-45", // invalid date
  }).isValid,
  false
);

// Test blank description maps to null
assert.equal(
  validateWeldingProcedure({
    code: "WPS-001", description: "  ", process: "GTAW",
    materialTypeId: "material-1", subcontractorId: "subcontractor-1",
    diameterFrom: "25", diameterTo: "300", thicknessFrom: "3", thicknessTo: "25",
    revision: "Rev.0", approvedOn: "2026-07-29",
  }).value?.description,
  null
);

// Test insert mapping
assert.deepEqual(Object.keys(toWeldingProcedureInsert("project-1", validInput)).sort(), [
  "approved_on", "code", "description", "diameter_from", "diameter_to",
  "material_type_id", "process", "project_id", "revision", "status",
  "subcontractor_id", "thickness_from", "thickness_to",
]);

// Test update mapping
assert.deepEqual(Object.keys(toWeldingProcedureUpdate(validInput)).sort(), [
  "approved_on", "code", "description", "diameter_from", "diameter_to",
  "material_type_id", "process", "revision", "subcontractor_id",
  "thickness_from", "thickness_to",
]);

// Test database row mapping
const row = {
  id: "wps-1",
  project_id: "project-1",
  subcontractor_id: "subcontractor-1",
  material_type_id: "material-1",
  code: "WPS-001",
  description: "Root pass",
  process: "GTAW",
  diameter_from: 25,
  diameter_to: 300,
  thickness_from: 3,
  thickness_to: 25,
  revision: "Rev.0",
  approved_on: "2026-07-29",
  status: "active" as const,
  created_at: "2026-07-29T00:00:00Z",
  updated_at: "2026-07-29T00:00:00Z"
};
assert.deepEqual(toWeldingProcedure(row), {
  id: "wps-1",
  projectId: "project-1",
  subcontractorId: "subcontractor-1",
  materialTypeId: "material-1",
  code: "WPS-001",
  description: "Root pass",
  process: "GTAW",
  diameterFrom: 25,
  diameterTo: 300,
  thicknessFrom: 3,
  thicknessTo: 25,
  revision: "Rev.0",
  approvedOn: "2026-07-29",
  status: "active",
  createdAt: "2026-07-29T00:00:00Z",
  updatedAt: "2026-07-29T00:00:00Z"
});

assert.deepEqual(getWeldingProcedureStatusActions("active"), ["deactivate", "archive"]);
assert.deepEqual(getWeldingProcedureStatusActions("inactive"), ["reactivate", "archive"]);
assert.deepEqual(getWeldingProcedureStatusActions("archived"), ["reactivate"]);
assert.equal(
  toWeldingProcedureErrorMessage(),
  "Unable to save WPS changes. Please try again."
);
console.log('All tests passed.');
