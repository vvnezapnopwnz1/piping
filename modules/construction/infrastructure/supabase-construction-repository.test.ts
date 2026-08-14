import assert from "node:assert/strict"

import {
  toBillLine,
  toFabricationSpoolCursor,
  toReadiness,
  toSpoolStatus,
  toSupportRow,
  toWeldSummary,
  toWelderQualification,
  toWeldingProcedure,
} from "./supabase-construction-repository"

const status = toSpoolStatus({
  spool_revision_id: "spool-rev-1",
  project_id: "project-1",
  iso_number: "ISO-A",
  spool_number: "SP-1",
  revision_number: "R0",
  pds_area_id: "pds-1",
  start_fab_on: "2026-08-04",
  material_check_on: null,
  fabricated_on: null,
  qc_release_on: null,
  sent_to_paint_on: null,
  painted_on: null,
  final_qc_on: null,
  laydown_on: null,
  current_stage: "start_fab",
  is_fabricated: false,
  is_releasable: false,
  line_total: 2,
  line_checked: 0,
  weld_total: 1,
  weld_complete: 0,
  support_total: 0,
  support_recorded: 0,
  nde_pending: 0,
  pwht_pending: 0,
})
assert.equal(status.spoolNumber, "SP-1")
assert.equal(status.currentStage, "start_fab")
assert.equal(status.dates.start_fab, "2026-08-04")
assert.equal(status.dates.material_check, null)
assert.equal(status.isReleasable, false)

assert.deepEqual(toFabricationSpoolCursor(status), {
  isoNumber: "ISO-A",
  spoolNumber: "SP-1",
  spoolRevisionId: "spool-rev-1",
})

const weld = toWeldSummary({
  weld_joint_revision_id: "wjr-1",
  project_id: "project-1",
  spool_revision_id: "spool-rev-1",
  weld_number: "W-1",
  spool_number: "SP-1",
  weld_location: "shop",
  diameter_inch: "6",
  thickness_mm: "12",
  wps_code: "WPS-1",
  welders: ["W-1", "W-2"],
  weld_on: "2026-08-05",
  is_locked: true,
  obligation_total: 2,
  obligation_pending: 1,
  pwht_required: true,
  pwht_accepted: false,
})
assert.equal(weld.diameterInch, 6)
assert.equal(weld.thicknessMm, 12)
assert.deepEqual(weld.welders, ["W-1", "W-2"])
assert.equal(weld.isLocked, true)
assert.equal(weld.obligationPending, 1)

// A joint with no progress yet comes back with nulls, not zeros.
const bare = toWeldSummary({
  weld_joint_revision_id: "wjr-2",
  project_id: "project-1",
  spool_revision_id: "spool-rev-1",
  weld_number: "W-2",
  spool_number: "SP-1",
  weld_location: "shop",
  diameter_inch: null,
  thickness_mm: null,
  wps_code: null,
  welders: null,
  weld_on: null,
  is_locked: false,
  obligation_total: 0,
  obligation_pending: 0,
  pwht_required: false,
  pwht_accepted: false,
})
assert.equal(bare.diameterInch, null)
assert.deepEqual(bare.welders, [])

const line = toBillLine({
  id: "line-1",
  ident_code: "IDN-100",
  description: "Pipe",
  quantity: "3",
  unit: "m",
  trace_number: "HEAT-100",
})
assert.equal(line.spoolRevisionMaterialId, "line-1")
assert.equal(line.quantity, 3)
assert.equal(line.expectedTraceNumber, "HEAT-100")

const procedure = toWeldingProcedure({
  id: "wps-1",
  code: "WPS-1",
  status: "active",
  subcontractor_id: null,
  material_type_id: "mat-1",
  diameter_from: "1",
  diameter_to: "12",
  thickness_from: "2",
  thickness_to: "20",
  approved_on: "2026-01-01",
})
assert.equal(procedure.diameterTo, 12)
assert.equal(procedure.subcontractorId, null)

const welder = toWelderQualification({
  id: "welder-1",
  welder_code: "W-1",
  status: "active",
  subcontractor_id: "sub-1",
  expires_on: "2027-01-01",
  welder_wps_qualifications: [{ wps_id: "wps-1" }, { wps_id: "wps-2" }],
})
assert.deepEqual(welder.wpsIds, ["wps-1", "wps-2"])

const readiness = toReadiness({
  line_total: 2,
  line_checked: 2,
  weld_total: 1,
  weld_complete: 1,
  support_total: 0,
  support_recorded: 0,
  nde_pending: 1,
  pwht_pending: 0,
  revision_status: "accepted",
})
assert.equal(readiness.ndePending, 1)
assert.equal(readiness.revisionStatus, "accepted")

// PostgREST embeds support_progress_records as a to-one object (or null), not an array, because
// support_progress_records.support_revision_id carries a unique constraint
// (supabase/migrations/20260804093000_fabrication_release.sql:15). Indexing [0] on that object is
// always undefined, which is why the Installed column read back empty for supports that had
// durably been marked installed.
const installedSupport = toSupportRow({
  id: "support-rev-1",
  support_type: "GUIDE",
  quantity: 2,
  supports: { support_number: "SUP-DEMO-1001-01" },
  support_progress_records: { installed_on: "2026-08-11", phase: "fabrication" },
})
assert.equal(installedSupport.installedOn, "2026-08-11")
assert.equal(installedSupport.installedPhase, "fabrication")
assert.equal(installedSupport.supportNumber, "SUP-DEMO-1001-01")
assert.equal(installedSupport.quantity, 2)

// A support with no progress record yet embeds as null, not [], and must read back not-installed.
const pendingSupport = toSupportRow({
  id: "support-rev-2",
  support_type: "GUIDE",
  quantity: 1,
  supports: { support_number: "SUP-DEMO-2001-01" },
  support_progress_records: null,
})
assert.equal(pendingSupport.installedOn, null)
assert.equal(pendingSupport.installedPhase, null)
