import { validateReferenceIdentity, type ReferenceValidation, type ReferenceStatus } from "./reference"

export interface Subcontractor {
  id: string
  projectId: string
  code: string
  description: string
  contactDetails: string | null
  status: ReferenceStatus
}

export interface SubcontractorInput {
  code: string
  description: string
  contactDetails: string | null
}

export interface Unit {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface AreaClassification {
  id: string
  projectId: string
  unitId: string | null
  unitCode?: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface AreaClassificationInput {
  code: string
  description: string
  unitId: string | null
}

export interface PdsArea {
  id: string
  projectId: string
  code: string
  description: string
  shopSubcontractorId: string | null
  shopSubcontractorCode?: string
  assemblySubcontractorId: string | null
  assemblySubcontractorCode?: string
  fieldSubcontractorId: string | null
  fieldSubcontractorCode?: string
  areaClassificationId: string | null
  areaClassificationCode?: string
  environment: "above_ground" | "underground" | null
  isUnit: boolean | null
  isRack: boolean | null
  customValues: Record<string, string | number | boolean | null>
  status: ReferenceStatus
}

export interface PdsAreaInput {
  code: string
  description: string
  shopSubcontractorId: string | null
  assemblySubcontractorId: string | null
  fieldSubcontractorId: string | null
  areaClassificationId: string | null
  environment: "above_ground" | "underground" | null
  isUnit: boolean | null
  isRack: boolean | null
  customValues: Record<string, string | number | boolean | null>
}

export function validateSubcontractorInput(input: SubcontractorInput): ReferenceValidation<SubcontractorInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  return {
    ok: true,
    value: {
      code: base.value.code,
      description: base.value.description,
      contactDetails: input.contactDetails ? input.contactDetails.trim() || null : null,
    },
    errors: {},
  }
}

export function validateAreaClassificationInput(input: AreaClassificationInput): ReferenceValidation<AreaClassificationInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  return {
    ok: true,
    value: {
      code: base.value.code,
      description: base.value.description,
      unitId: input.unitId || null,
    },
    errors: {},
  }
}

export function validatePdsAreaInput(
  input: PdsAreaInput,
  allowedCustomKeys: string[] = []
): ReferenceValidation<PdsAreaInput> {
  const base = validateReferenceIdentity(input)
  const errors: Record<string, string> = base.ok ? {} : { ...base.errors }

  const hasSubcontractor = !!(input.shopSubcontractorId || input.assemblySubcontractorId || input.fieldSubcontractorId)
  if (!hasSubcontractor) {
    errors.subcontractors = "At least one ownership subcontractor (Shop, Assembly, or Field) is required"
  }

  const sanitizedCustomValues: Record<string, string | number | boolean | null> = {}
  if (input.customValues) {
    for (const key of allowedCustomKeys) {
      if (key in input.customValues) {
        sanitizedCustomValues[key] = input.customValues[key]
      }
    }
  }

  if (!base.ok || Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      code: base.value.code,
      description: base.value.description,
      shopSubcontractorId: input.shopSubcontractorId || null,
      assemblySubcontractorId: input.assemblySubcontractorId || null,
      fieldSubcontractorId: input.fieldSubcontractorId || null,
      areaClassificationId: input.areaClassificationId || null,
      environment: input.environment || null,
      isUnit: input.isUnit ?? null,
      isRack: input.isRack ?? null,
      customValues: sanitizedCustomValues,
    },
    errors: {},
  }
}
