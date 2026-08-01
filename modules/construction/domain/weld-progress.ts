export const WELD_POINT_TYPES = ["root", "hot", "fill", "cap"] as const
export type WeldPointType = (typeof WELD_POINT_TYPES)[number]

export interface ValidationIssue {
  field: string
  message: string
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
    issues.push({ field: "points", message: "A welded joint needs at least one weld point." })
    return issues
  }

  const rootCap = sum(points, ["root", "cap"])
  if (rootCap !== 100) {
    issues.push({
      field: "points",
      message: `Root and Cap must total 100 percent, not ${rootCap}.`,
    })
  }

  const hotFill = sum(points, ["hot", "fill"])
  if (hotFill !== 0 && hotFill !== 100) {
    issues.push({
      field: "points",
      message: `Heat and Fill must total either 0 or 100 percent, not ${hotFill}.`,
    })
  }

  const welderIds = points.map((point) => point.welderQualificationId)
  if (new Set(welderIds).size !== welderIds.length) {
    issues.push({
      field: "points",
      message: "Each weld point of a joint needs a different welder.",
    })
  }

  const pointTypes = points.map((point) => point.pointType)
  if (new Set(pointTypes).size !== pointTypes.length) {
    issues.push({ field: "points", message: "A weld point can only be assigned once." })
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
      message: `WPS ${procedure.code} is not active.`,
    })
  }
  if (procedure.subcontractorId && procedure.subcontractorId !== subcontractorId) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} is qualified for a different subcontractor.`,
    })
  }
  if (
    joint.diameterInch === null ||
    joint.diameterInch < procedure.diameterFrom ||
    joint.diameterInch > procedure.diameterTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} does not cover a diameter of ${joint.diameterInch ?? "unknown"}".`,
    })
  }
  if (
    joint.thicknessMm === null ||
    joint.thicknessMm < procedure.thicknessFrom ||
    joint.thicknessMm > procedure.thicknessTo
  ) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} does not cover a thickness of ${joint.thicknessMm ?? "unknown"} mm.`,
    })
  }
  if (weldOn && procedure.approvedOn > weldOn) {
    issues.push({
      field: "weldingProcedureId",
      message: `WPS ${procedure.code} was approved on ${procedure.approvedOn}, after the weld date.`,
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
      message: `Welder ${welder.welderCode} is not active.`,
    })
  }
  if (welder.subcontractorId !== subcontractorId) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} belongs to a different subcontractor.`,
    })
  }
  if (welder.expiresOn < weldedOn) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} qualification expired on ${welder.expiresOn}.`,
    })
  }
  if (!welder.wpsIds.includes(procedure.id)) {
    issues.push({
      field: "welderQualificationId",
      message: `Welder ${welder.welderCode} is not qualified for WPS ${procedure.code}.`,
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
      message: "This joint has an accepted NDE result. Use the correction action instead.",
    })
  }

  // Dossier 16.5: Shop Weld Progress covers shop joints only.
  if (input.joint.weldLocation !== "shop") {
    issues.push({
      field: "joint",
      message: `This is a ${input.joint.weldLocation} weld and belongs to the assembly or erection module.`,
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
        message: `This joint has no ${point.pointType} weld point in its definition.`,
      })
      continue
    }
    const welder = byId.get(point.welderQualificationId)
    if (!welder) {
      issues.push({ field: "points", message: "That welder is not registered on this project." })
      continue
    }
    issues.push(
      ...validateWelder(welder, input.procedure, input.subcontractorId, point.weldedOn),
    )
  }

  issues.push(...validateAllocation(input.points, input.weldOn !== null))

  return issues
}
