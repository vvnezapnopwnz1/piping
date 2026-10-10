import { validateReferenceIdentity, type ReferenceValidation, type ReferenceStatus, type SetupFieldIssue } from "./reference"

export interface ServiceClassInput {
  code: string
  description: string | null
  materialTypeId: string
}

export interface ServiceClass {
  id: string
  projectId: string
  code: string
  description: string | null
  materialTypeId: string
  status: ReferenceStatus
}

export interface WeldTypeInput {
  code: string
  description: string
  countsInDiaInch: boolean
}

export interface WeldType {
  id: string
  projectId: string
  code: string
  description: string
  countsInDiaInch: boolean
  status: ReferenceStatus
}

export interface WelderQualificationInput {
  welderCode: string
  fullName: string
  subcontractorId: string
  certificateNumber: string | null
  expiresOn: string
  wpsIds: string[]
}

export interface WelderQualification {
  id: string
  projectId: string
  welderCode: string
  fullName: string
  subcontractorId: string
  subcontractorCode?: string
  certificateNumber: string | null
  expiresOn: string
  isCurrentlyQualified: boolean
  wpsIds: string[]
  status: ReferenceStatus
}

export interface NdeMatrixRuleInput {
  serviceClassId: string
  weldTypeId: string
  weldLocation: "shop" | "assembly" | "field"
  rtCoverage: number
  utCoverage: number
  mtCoverage: number
  ptCoverage: number
  pmiCoverage: number
  htCoverage: number
  pwhtRequired: boolean
  pwhtThicknessThreshold: number | null
  materialTraceabilityRequired: boolean
}

export interface NdeMatrixRule {
  id: string
  projectId: string
  serviceClassId: string
  serviceClassCode?: string
  weldTypeId: string
  weldTypeCode?: string
  weldLocation: "shop" | "assembly" | "field"
  rtCoverage: number
  utCoverage: number
  mtCoverage: number
  ptCoverage: number
  pmiCoverage: number
  htCoverage: number
  pwhtRequired: boolean
  pwhtThicknessThreshold: number | null
  materialTraceabilityRequired: boolean
  status: ReferenceStatus
}

export interface ThicknessFlangeRuleInput {
  serviceClassId: string
  diameterInch: number
  thicknessMm: number
  flangeRating: string
}

export interface ThicknessFlangeRule {
  id: string
  projectId: string
  serviceClassId: string
  serviceClassCode?: string
  diameterInch: number
  thicknessMm: number
  flangeRating: string
  status: ReferenceStatus
}

export interface PipingMaterialRecordInput {
  mrrNumber: string
  identCode: string
  traceNumber: string
}

export interface PipingMaterialRecord {
  id: string
  projectId: string
  mrrNumber: string
  identCode: string
  traceNumber: string
  status: ReferenceStatus
}

export interface ReworkCodeInput {
  code: string
  description: string
}

export interface ReworkCode {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface JointCategoryInput {
  jointDefinition: string
  timing: "before_pressure_test" | "before_precommissioning" | "after_precommissioning"
  categoryCode: string
  reason: string
  coefficient: number | null
}

export interface JointCategory {
  id: string
  projectId: string
  jointDefinition: string
  timing: "before_pressure_test" | "before_precommissioning" | "after_precommissioning"
  categoryCode: string
  reason: string
  coefficient: number | null
  status: ReferenceStatus
}

export function validateServiceClassInput(input: ServiceClassInput): ReferenceValidation<ServiceClassInput, SetupFieldIssue> {
  const base = validateReferenceIdentity({ code: input.code, description: input.description || input.code })
  if (!base.ok) return base
  const errors: Record<string, SetupFieldIssue> = {}

  if (!input.materialTypeId) {
    errors.materialTypeId = { code: "required" }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      code: base.value.code,
      description: input.description ? input.description.trim() : null,
      materialTypeId: input.materialTypeId,
    },
    errors: {},
  }
}

export function validateWeldTypeInput(input: WeldTypeInput): ReferenceValidation<WeldTypeInput, SetupFieldIssue> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base

  return {
    ok: true,
    value: {
      code: base.value.code,
      description: base.value.description,
      countsInDiaInch: input.countsInDiaInch,
    },
    errors: {},
  }
}

export function validateWelderQualificationInput(input: WelderQualificationInput): ReferenceValidation<WelderQualificationInput, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  const code = input.welderCode.trim().toUpperCase()
  const name = input.fullName.trim()

  if (!code) errors.welderCode = { code: "required" }
  if (!name) errors.fullName = { code: "required" }
  if (!input.subcontractorId) errors.subcontractorId = { code: "required" }
  if (!input.expiresOn) errors.expiresOn = { code: "required" }

  const normalizedWps = Array.from(new Set(input.wpsIds.filter((id) => !!id)))
  if (normalizedWps.length === 0) {
    errors.wpsIds = { code: "at_least_one_wps" }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      welderCode: code,
      fullName: name,
      subcontractorId: input.subcontractorId,
      certificateNumber: input.certificateNumber ? input.certificateNumber.trim() || null : null,
      expiresOn: input.expiresOn,
      wpsIds: normalizedWps,
    },
    errors: {},
  }
}

export function validateNdeMatrixRuleInput(input: NdeMatrixRuleInput): ReferenceValidation<NdeMatrixRuleInput, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  if (!input.serviceClassId) errors.serviceClassId = { code: "required" }
  if (!input.weldTypeId) errors.weldTypeId = { code: "required" }
  if (!["shop", "assembly", "field"].includes(input.weldLocation)) {
    errors.weldLocation = { code: "invalid_location" }
  }

  const coverages = [
    { name: "rtCoverage", val: input.rtCoverage },
    { name: "utCoverage", val: input.utCoverage },
    { name: "mtCoverage", val: input.mtCoverage },
    { name: "ptCoverage", val: input.ptCoverage },
    { name: "pmiCoverage", val: input.pmiCoverage },
    { name: "htCoverage", val: input.htCoverage },
  ]

  for (const c of coverages) {
    if (typeof c.val !== "number" || isNaN(c.val) || c.val < 0 || c.val > 100) {
      errors[c.name] = { code: "range", min: 0, max: 100 }
    }
  }

  if (input.pwhtThicknessThreshold !== null && (typeof input.pwhtThicknessThreshold !== "number" || input.pwhtThicknessThreshold <= 0)) {
    errors.pwhtThicknessThreshold = { code: "positive" }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      ...input,
      pwhtThicknessThreshold: input.pwhtRequired ? input.pwhtThicknessThreshold : null,
    },
    errors: {},
  }
}

export function validateThicknessFlangeRuleInput(input: ThicknessFlangeRuleInput): ReferenceValidation<ThicknessFlangeRuleInput, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  if (!input.serviceClassId) errors.serviceClassId = { code: "required" }
  if (typeof input.diameterInch !== "number" || input.diameterInch <= 0) {
    errors.diameterInch = { code: "positive" }
  }
  if (typeof input.thicknessMm !== "number" || input.thicknessMm < 0) {
    errors.thicknessMm = { code: "non_negative" }
  }
  const rating = input.flangeRating.trim()
  if (!rating) errors.flangeRating = { code: "required" }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      serviceClassId: input.serviceClassId,
      diameterInch: input.diameterInch,
      thicknessMm: input.thicknessMm,
      flangeRating: rating,
    },
    errors: {},
  }
}

export function validatePipingMaterialRecordInput(input: PipingMaterialRecordInput): ReferenceValidation<PipingMaterialRecordInput, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  const mrr = input.mrrNumber.trim()
  const ident = input.identCode.trim().toUpperCase()
  const trace = input.traceNumber.trim()

  if (!mrr) errors.mrrNumber = { code: "required" }
  if (!ident) errors.identCode = { code: "required" }
  if (!trace) errors.traceNumber = { code: "required" }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: { mrrNumber: mrr, identCode: ident, traceNumber: trace },
    errors: {},
  }
}

export function validateReworkCodeInput(input: ReworkCodeInput): ReferenceValidation<ReworkCodeInput, SetupFieldIssue> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  return { ok: true, value: base.value, errors: {} }
}

export function validateJointCategoryInput(input: JointCategoryInput): ReferenceValidation<JointCategoryInput, SetupFieldIssue> {
  const errors: Record<string, SetupFieldIssue> = {}
  const def = input.jointDefinition.trim()
  const code = input.categoryCode.trim().toUpperCase()
  const reason = input.reason.trim()

  if (!def) errors.jointDefinition = { code: "required" }
  if (!code) errors.categoryCode = { code: "required" }
  if (!reason) errors.reason = { code: "required" }
  if (!["before_pressure_test", "before_precommissioning", "after_precommissioning"].includes(input.timing)) {
    errors.timing = { code: "invalid_timing" }
  }
  if (input.coefficient !== null && (typeof input.coefficient !== "number" || input.coefficient < 0)) {
    errors.coefficient = { code: "non_negative" }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      jointDefinition: def,
      timing: input.timing,
      categoryCode: code,
      reason,
      coefficient: input.coefficient,
    },
    errors: {},
  }
}

export function isWelderCurrentlyQualified(expiresOn: string): boolean {
  const expiryDate = new Date(expiresOn)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return expiryDate >= today
}

export function evaluateNdeMatrixCoverage(
  serviceClassIds: string[],
  weldTypeIds: string[],
  assemblyEnabled: boolean,
  activeRules: { serviceClassId: string; weldTypeId: string; weldLocation: "shop" | "assembly" | "field" }[]
): { missingTuples: { serviceClassId: string; weldTypeId: string; weldLocation: "shop" | "assembly" | "field" }[] } {
  const existingSet = new Set(
    activeRules.map((r) => `${r.serviceClassId}:${r.weldTypeId}:${r.weldLocation}`)
  )
  const locations: ("shop" | "assembly" | "field")[] = assemblyEnabled
    ? ["shop", "assembly", "field"]
    : ["shop", "field"]

  const missingTuples: { serviceClassId: string; weldTypeId: string; weldLocation: "shop" | "assembly" | "field" }[] = []

  for (const scId of serviceClassIds) {
    for (const wtId of weldTypeIds) {
      for (const loc of locations) {
        if (!existingSet.has(`${scId}:${wtId}:${loc}`)) {
          missingTuples.push({ serviceClassId: scId, weldTypeId: wtId, weldLocation: loc })
        }
      }
    }
  }

  return { missingTuples }
}
