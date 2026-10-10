import { validateReferenceIdentity, type ReferenceValidation, type ReferenceStatus } from "./reference"

export interface DeviceInput {
  code: string
  description: string
}

export interface Device {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface DeviceUserInput {
  membershipId: string
  deviceId: string | null
}

export interface DeviceUser {
  id: string
  projectId: string
  membershipId: string
  userEmail?: string
  deviceId: string | null
  deviceCode?: string
  status: ReferenceStatus
}

export interface DeviceUserCandidate {
  membershipId: string
  fullName: string
  email: string | null
  deviceUserId: string | null
  deviceId: string | null
  deviceCode: string | null
  isAssigned: boolean
}

export interface SpoolingMaterialTypeInput {
  code: string
  description: string
}

export interface SpoolingMaterialType {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface SpoolingMaterialClassInput {
  externalClassCode: string
  materialTypeId: string
}

export interface SpoolingMaterialClass {
  id: string
  projectId: string
  externalClassCode: string
  materialTypeId: string
  materialTypeCode?: string
  status: ReferenceStatus
}

export interface SpoolingChecklistItemInput {
  code: string
  description: string
  sortOrder: number
  isRequired: boolean
}

export interface SpoolingChecklistItem {
  id: string
  projectId: string
  code: string
  description: string
  sortOrder: number
  isRequired: boolean
  status: ReferenceStatus
}

export interface RalCodeInput {
  lineServiceId: string
  colorCode: string
  ralCode: string
}

export interface RalCode {
  id: string
  projectId: string
  lineServiceId: string
  lineServiceCode?: string
  colorCode: string
  ralCode: string
  status: ReferenceStatus
}

export interface PaintMatrixInput {
  lineServiceId: string
  ralCodeId: string
  blastingRequired: boolean
  primerRequired: boolean
  intermediateCoatCount: number
  finalCoatCount: number
  requiredFinalDftMicrons: number
}

export interface PaintMatrixRule {
  id: string
  projectId: string
  lineServiceId: string
  lineServiceCode?: string
  ralCodeId: string
  ralCode?: string
  blastingRequired: boolean
  primerRequired: boolean
  intermediateCoatCount: number
  finalCoatCount: number
  requiredFinalDftMicrons: number
  status: ReferenceStatus
}

export interface AssemblySettingsInput {
  enabled: boolean
  defaultSubcontractorId: string | null
}

export interface AssemblySettings {
  projectId: string
  enabled: boolean
  defaultSubcontractorId: string | null
  defaultSubcontractorCode?: string
}

export function validateDeviceInput(input: DeviceInput): ReferenceValidation<DeviceInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return { ok: false, errors: { code: base.errors.code?.code || "required", description: base.errors.description?.code || "required" } }
  return { ok: true, value: base.value, errors: {} }
}

export function validateDeviceUserInput(input: DeviceUserInput): ReferenceValidation<DeviceUserInput> {
  if (!input.membershipId) return { ok: false, errors: { membershipId: "required" } }
  if (!input.deviceId) return { ok: false, errors: { deviceId: "required" } }
  return { ok: true, value: input, errors: {} }
}

export function validateSpoolingMaterialClassInput(input: SpoolingMaterialClassInput): ReferenceValidation<SpoolingMaterialClassInput> {
  const ext = input.externalClassCode.trim().toUpperCase()
  if (!ext) return { ok: false, errors: { externalClassCode: "required" } }
  if (!input.materialTypeId) return { ok: false, errors: { materialTypeId: "required" } }
  return { ok: true, value: { externalClassCode: ext, materialTypeId: input.materialTypeId }, errors: {} }
}

export function validatePaintMatrixInput(input: PaintMatrixInput): ReferenceValidation<PaintMatrixInput> {
  const errors: Record<string, string> = {}
  if (!input.lineServiceId) errors.lineServiceId = "required"
  if (!input.ralCodeId) errors.ralCodeId = "required"
  if (typeof input.intermediateCoatCount !== "number" || input.intermediateCoatCount < 0 || input.intermediateCoatCount > 20) {
    errors.intermediateCoatCount = "out_of_range"
  }
  if (typeof input.finalCoatCount !== "number" || input.finalCoatCount < 0 || input.finalCoatCount > 20) {
    errors.finalCoatCount = "out_of_range"
  }
  if (typeof input.requiredFinalDftMicrons !== "number" || input.requiredFinalDftMicrons <= 0) {
    errors.requiredFinalDftMicrons = "positive"
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return { ok: true, value: input, errors: {} }
}

export function validateAssemblySettingsInput(input: AssemblySettingsInput): ReferenceValidation<AssemblySettingsInput> {
  if (input.enabled && !input.defaultSubcontractorId) {
    return { ok: false, errors: { defaultSubcontractorId: "required" } }
  }
  return { ok: true, value: input, errors: {} }
}
