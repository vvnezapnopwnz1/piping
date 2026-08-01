import assert from "node:assert/strict"

import type {
  JointDefinition,
  WelderQualification,
  WeldingProcedure,
} from "../domain/weld-progress"
import { describeWeldProgressGate, toWeldProgressPayload } from "./record-weld-progress"

const joint: JointDefinition = {
  weldLocation: "shop",
  diameterInch: 6,
  thicknessMm: 12,
  availablePointTypes: ["root", "cap"],
}
const procedure: WeldingProcedure = {
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
const welders: WelderQualification[] = [
  {
    id: "welder-1",
    welderCode: "W-1",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
  {
    id: "welder-2",
    welderCode: "W-2",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
]
const points = [
  { pointType: "root" as const, welderQualificationId: "welder-1", completionPercent: 50, weldedOn: "2026-08-05" },
  { pointType: "cap" as const, welderQualificationId: "welder-2", completionPercent: 50, weldedOn: "2026-08-05" },
]

assert.deepEqual(
  describeWeldProgressGate({
    joint,
    procedure,
    subcontractorId: "sub-1",
    weldOn: "2026-08-05",
    points,
    welders,
    isLocked: false,
  }),
  { allowed: true, reason: null },
)

const blocked = describeWeldProgressGate({
  joint,
  procedure,
  subcontractorId: "sub-1",
  weldOn: "2026-08-05",
  points: [{ ...points[0], completionPercent: 30 }, points[1]],
  welders,
  isLocked: false,
})
assert.equal(blocked.allowed, false)
assert.match(blocked.reason ?? "", /Root and Cap/)

assert.deepEqual(
  toWeldProgressPayload({
    weldJointRevisionId: "wjr-1",
    subcontractorId: "sub-1",
    weldingProcedureId: "wps-1",
    points,
    dates: {
      cuttingOn: "2026-08-01",
      bevelingOn: null,
      fitupOn: "2026-08-03",
      preheatOn: null,
      weldOn: "2026-08-05",
      dwirNumber: " DWIR-1 ",
      qcFormNumber: null,
      qc13FormId: null,
      reworkCodeId: null,
    },
  }),
  {
    target_weld_joint_revision_id: "wjr-1",
    subcontractor_id: "sub-1",
    welding_procedure_id: "wps-1",
    points: [
      { point_type: "root", welder_qualification_id: "welder-1", completion_percent: 50, welded_on: "2026-08-05" },
      { point_type: "cap", welder_qualification_id: "welder-2", completion_percent: 50, welded_on: "2026-08-05" },
    ],
    dates: {
      cutting_on: "2026-08-01",
      fitup_on: "2026-08-03",
      weld_on: "2026-08-05",
      dwir_number: "DWIR-1",
    },
  },
)
