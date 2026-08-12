import {
  validateWeldProgress,
  type PointAssignment,
  type WeldProgressInput,
} from "../domain/weld-progress"
import type { Gate } from "./record-material-check"

export interface WeldProgressDates {
  cuttingOn: string | null
  bevelingOn: string | null
  fitupOn: string | null
  preheatOn: string | null
  weldOn: string | null
  dwirNumber: string | null
  qcFormNumber: string | null
  qc13FormId: string | null
  reworkCodeId: string | null
}

export interface WeldProgressDraft {
  weldJointRevisionId: string
  subcontractorId: string
  weldingProcedureId: string
  points: readonly PointAssignment[]
  dates: WeldProgressDates
}

export interface WeldProgressPayload {
  target_weld_joint_revision_id: string
  subcontractor_id: string
  welding_procedure_id: string
  points: {
    point_type: string
    welder_qualification_id: string
    completion_percent: number
    welded_on: string
  }[]
  dates: Record<string, string>
}

export function describeWeldProgressGate(input: WeldProgressInput): Gate {
  const issues = validateWeldProgress(input)
  return issues.length === 0
    ? { allowed: true, reason: null }
    : { allowed: false, reason: issues.map((issue) => issue.message).join(" ") }
}

const DATE_KEYS: readonly (readonly [keyof WeldProgressDates, string])[] = [
  ["cuttingOn", "cutting_on"],
  ["bevelingOn", "beveling_on"],
  ["fitupOn", "fitup_on"],
  ["preheatOn", "preheat_on"],
  ["weldOn", "weld_on"],
  ["dwirNumber", "dwir_number"],
  ["qcFormNumber", "qc_form_number"],
  ["qc13FormId", "qc13_form_id"],
  ["reworkCodeId", "rework_code_id"],
]

/** Null and blank fields are omitted, so the RPC's `nullif(... , '')` guards never fire. */
export function toWeldProgressPayload(draft: WeldProgressDraft): WeldProgressPayload {
  const dates: Record<string, string> = {}
  for (const [key, column] of DATE_KEYS) {
    const value = draft.dates[key]
    if (value === null) continue
    const trimmed = value.trim()
    if (trimmed === "") continue
    dates[column] = trimmed
  }

  return {
    target_weld_joint_revision_id: draft.weldJointRevisionId,
    subcontractor_id: draft.subcontractorId,
    welding_procedure_id: draft.weldingProcedureId,
    points: draft.points.map((point) => ({
      point_type: point.pointType,
      welder_qualification_id: point.welderQualificationId,
      completion_percent: point.completionPercent,
      welded_on: point.weldedOn,
    })),
    dates,
  }
}
