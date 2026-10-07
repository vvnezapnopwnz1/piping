import type { ConstructionPhase } from "./construction-phase"
import { constructionPhaseForWeldLocation } from "./phase-policy"

export const WELD_POINT_TYPES = ["root", "hot", "fill", "cap"] as const
export type WeldPointType = (typeof WELD_POINT_TYPES)[number]

/** Why weld progress cannot be recorded. The interface words it from `code` (fabrication.weldIssue). */
export type WeldIssueCode =
  | "points_required" | "root_cap_total" | "hot_fill_total" | "distinct_welders" | "point_once"
  | "wps_inactive" | "wps_other_subcontractor" | "wps_diameter" | "wps_thickness" | "wps_approved_after"
  | "welder_inactive" | "welder_other_subcontractor" | "welder_expired" | "welder_not_qualified"
  | "accepted_nde" | "joint_other_phase" | "assembly_disabled" | "unknown_location"
  | "no_point_in_definition" | "welder_unregistered"

export interface ValidationIssue {
  field: string
  code: WeldIssueCode
  values?: Record<string, string | number>
}

export interface PointAssignment {
  pointType: WeldPointType
  welderQualificationId: string
  completionPercent: number
  weldedOn: string
}

export interface JointDefinition {
  weldLocation: string
  diameterInch: number | null
  thicknessMm: number | null
  availablePointTypes: WeldPointType[]
}

export interface WeldingProcedure {
  id: string
  code: string
  status: string
  subcontractorId: string | null
  materialTypeId: string
  diameterFrom: number
  diameterTo: number
  thicknessFrom: number
  thicknessTo: number
  approvedOn: string
}

export interface WelderQualification {
  id: string
  welderCode: string
  status: string
  subcontractorId: string
  expiresOn: string
  wpsIds: string[]
}

export interface WeldProgressInput {
  joint: JointDefinition
  procedure: WeldingProcedure
  subcontractorId: string
  weldOn: string | null
  points: readonly PointAssignment[]
  welders: readonly WelderQualification[]
  isLocked: boolean
  /**
   * Which phase is recording. Required rather than defaulted: `record_weld_progress` refuses a
   * joint whose location does not match the phase, and a default here would let one screen's
   * joints pass another screen's gate.
   */
  phase: ConstructionPhase
}

const sum = (points: readonly PointAssignment[], types: readonly WeldPointType[]): number =>
  points
    .filter((point) => types.includes(point.pointType))
    .reduce((total, point) => total + point.completionPercent, 0)

/**
 * Dossier 7.3. The totals only bind once the joint claims to be welded — a fit-up-only
 * record carries no points and stays valid.
 */
export function validateAllocation(
  points: readonly PointAssignment[],
  isWelded: boolean,
): ValidationIssue[] {
  if (!isWelded) return []

  const issues: ValidationIssue[] = []

  if (points.length === 0) {
    issues.push({ field: "points", code: "points_required" })
    return issues
  }

  const rootCap = sum(points, ["root", "cap"])
  if (rootCap !== 100) {
    issues.push({
      field: "points",
      code: "root_cap_total",
      values: { total: rootCap },
    })
  }

  const hotFill = sum(points, ["hot", "fill"])
  if (hotFill !== 0 && hotFill !== 100) {
    issues.push({
      field: "points",
      code: "hot_fill_total",
      values: { total: hotFill },
    })
  }

  const welderIds = points.map((point) => point.welderQualificationId)
  if (new Set(welderIds).size !== welderIds.length) {
    issues.push({
      field: "points",
      code: "distinct_welders",
    })
  }

  const pointTypes = points.map((point) => point.pointType)
  if (new Set(pointTypes).size !== pointTypes.length) {
    issues.push({ field: "points", code: "point_once" })
  }

  return issues
}

/** Dossier 11.6. A WPS is a range qualification, not a code from a list. */
export function validateProcedure(
  procedure: WeldingProcedure,
  joint: JointDefinition,
  subcontractorId: string,
  weldOn: string | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (procedure.status !== "active") {
    issues.push({
      field: "weldingProcedureId",
      code: "wps_inactive",
      values: { wps: procedure.code },
    })
  }
  if (procedure.subcontractorId && procedure.subcontractorId !== subcontractorId) {
    issues.push({
      field: "weldingProcedureId",
      code: "wps_other_subcontractor",
      values: { wps: procedure.code },
    })
  }
  if (
    joint.diameterInch === null ||
    joint.diameterInch < procedure.diameterFrom ||
    joint.diameterInch > procedure.diameterTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      code: "wps_diameter",
      values: { wps: procedure.code, diameter: joint.diameterInch ?? "—" },
    })
  }
  if (
    joint.thicknessMm === null ||
    joint.thicknessMm < procedure.thicknessFrom ||
    joint.thicknessMm > procedure.thicknessTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      code: "wps_thickness",
      values: { wps: procedure.code, thickness: joint.thicknessMm ?? "—" },
    })
  }
  if (weldOn && procedure.approvedOn > weldOn) {
    issues.push({
      field: "weldingProcedureId",
      code: "wps_approved_after",
      values: { wps: procedure.code, date: procedure.approvedOn },
    })
  }

  return issues
}

/** Dossier 11.7. Expiry is judged on the date the point was welded, not today. */
export function validateWelder(
  welder: WelderQualification,
  procedure: WeldingProcedure,
  subcontractorId: string,
  weldedOn: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (welder.status !== "active") {
    issues.push({
      field: "welderQualificationId",
      code: "welder_inactive",
      values: { welder: welder.welderCode },
    })
  }
  if (welder.subcontractorId !== subcontractorId) {
    issues.push({
      field: "welderQualificationId",
      code: "welder_other_subcontractor",
      values: { welder: welder.welderCode },
    })
  }
  if (welder.expiresOn < weldedOn) {
    issues.push({
      field: "welderQualificationId",
      code: "welder_expired",
      values: { welder: welder.welderCode, date: welder.expiresOn },
    })
  }
  if (!welder.wpsIds.includes(procedure.id)) {
    issues.push({
      field: "welderQualificationId",
      code: "welder_not_qualified",
      values: { welder: welder.welderCode, wps: procedure.code },
    })
  }

  return issues
}

/**
 * The browser's copy of every rule the `record_weld_progress` RPC enforces. It exists to
 * disable the Save button and name the offending field; the database still decides.
 */
export function validateWeldProgress(input: WeldProgressInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (input.isLocked) {
    issues.push({
      field: "record",
      code: "accepted_nde",
    })
  }

  // Dossier 16.5: a phase records its own joints only — shop work in fabrication, field work
  // in erection. This mirrors `record_weld_progress`, which raises PQC51 when the joint's
  // location does not match the phase, and PQC50 for an assembly joint on a project where
  // assembly is not enabled (`constructionPhaseForWeldLocation` returns null for it).
  const jointPhase = constructionPhaseForWeldLocation(input.joint.weldLocation)
  if (jointPhase !== input.phase) {
    issues.push({
      field: "joint",
      ...(jointPhase !== null
        ? { code: "joint_other_phase" as const, values: { location: input.joint.weldLocation, phase: jointPhase } }
        : input.joint.weldLocation === "assembly"
          ? { code: "assembly_disabled" as const }
          : { code: "unknown_location" as const, values: { location: input.joint.weldLocation } }),
    })
  }

  issues.push(
    ...validateProcedure(input.procedure, input.joint, input.subcontractorId, input.weldOn),
  )

  const byId = new Map(input.welders.map((welder) => [welder.id, welder]))
  for (const point of input.points) {
    if (!input.joint.availablePointTypes.includes(point.pointType)) {
      issues.push({
        field: "points",
        code: "no_point_in_definition",
        values: { point: point.pointType },
      })
      continue
    }
    const welder = byId.get(point.welderQualificationId)
    if (!welder) {
      issues.push({ field: "points", code: "welder_unregistered" })
      continue
    }
    issues.push(
      ...validateWelder(welder, input.procedure, input.subcontractorId, point.weldedOn),
    )
  }

  issues.push(...validateAllocation(input.points, input.weldOn !== null))

  return issues
}
