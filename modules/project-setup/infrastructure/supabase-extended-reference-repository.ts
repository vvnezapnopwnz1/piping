import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  Device,
  DeviceInput,
  DeviceUser,
  DeviceUserCandidate,
  DeviceUserInput,
  SpoolingMaterialType,
  SpoolingMaterialClass,
  SpoolingChecklistItem,
  RalCode,
  PaintMatrixRule,
  AssemblySettings,
} from "../domain/extended-reference"
import { validateDeviceUserInput } from "../domain/extended-reference"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"
import { normalizeReferenceCode } from "../domain/reference"

export interface LoadedExtendedReferences {
  devices: Device[]
  deviceUsers: DeviceUser[]
  spoolingMaterialTypes: SpoolingMaterialType[]
  spoolingMaterialClasses: SpoolingMaterialClass[]
  spoolingChecklistItems: SpoolingChecklistItem[]
  ralCodes: RalCode[]
  paintMatrixRules: PaintMatrixRule[]
  assemblySettings: AssemblySettings
}

export async function loadExtendedReferences(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedExtendedReferences> {
  const [devRes, devUserRes, spoolMatRes, spoolClassRes, checklistRes, ralRes, paintRes, assemblyRes] = await Promise.all([
    client
      .from("project_devices")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_device_users")
      .select("id, project_id, membership_id, device_id, status, project_devices(code)")
      .eq("project_id", projectId)
      .order("id", { ascending: true }),
    client
      .from("project_spooling_material_types")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_spooling_material_classes")
      .select("id, project_id, external_class_code, material_type_id, status, project_spooling_material_types(code)")
      .eq("project_id", projectId)
      .order("external_class_code", { ascending: true }),
    client
      .from("project_spooling_checklist_items")
      .select("id, project_id, code, description, sort_order, is_required, status")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    client
      .from("project_ral_codes")
      .select("id, project_id, line_service_id, color_code, ral_code, status, project_line_services(code)")
      .eq("project_id", projectId)
      .order("color_code", { ascending: true }),
    client
      .from("project_paint_matrix_rules")
      .select("id, project_id, line_service_id, ral_code_id, blasting_required, primer_required, intermediate_coat_count, final_coat_count, required_final_dft_microns, status, project_line_services(code), project_ral_codes(ral_code)")
      .eq("project_id", projectId)
      .order("id", { ascending: true }),
    client
      .from("project_assembly_settings")
      .select("project_id, enabled, default_subcontractor_id, project_subcontractors(code)")
      .eq("project_id", projectId)
      .maybeSingle(),
  ])

  if (devRes.error) throw new Error(mapSupabaseReferenceError(devRes.error))
  if (devUserRes.error) throw new Error(mapSupabaseReferenceError(devUserRes.error))
  if (spoolMatRes.error) throw new Error(mapSupabaseReferenceError(spoolMatRes.error))
  if (spoolClassRes.error) throw new Error(mapSupabaseReferenceError(spoolClassRes.error))
  if (checklistRes.error) throw new Error(mapSupabaseReferenceError(checklistRes.error))
  if (ralRes.error) throw new Error(mapSupabaseReferenceError(ralRes.error))
  if (paintRes.error) throw new Error(mapSupabaseReferenceError(paintRes.error))
  if (assemblyRes.error) throw new Error(mapSupabaseReferenceError(assemblyRes.error))

  const devices: Device[] = (devRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const deviceUsers: DeviceUser[] = (devUserRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    membershipId: row.membership_id,
    deviceId: row.device_id,
    deviceCode: row.project_devices?.code,
    status: row.status,
  }))

  const spoolingMaterialTypes: SpoolingMaterialType[] = (spoolMatRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const spoolingMaterialClasses: SpoolingMaterialClass[] = (spoolClassRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    externalClassCode: row.external_class_code,
    materialTypeId: row.material_type_id,
    materialTypeCode: row.project_spooling_material_types?.code,
    status: row.status,
  }))

  const spoolingChecklistItems: SpoolingChecklistItem[] = (checklistRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    sortOrder: row.sort_order,
    isRequired: row.is_required,
    status: row.status,
  }))

  const ralCodes: RalCode[] = (ralRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    lineServiceId: row.line_service_id,
    lineServiceCode: row.project_line_services?.code,
    colorCode: row.color_code,
    ralCode: row.ral_code,
    status: row.status,
  }))

  const paintMatrixRules: PaintMatrixRule[] = (paintRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    lineServiceId: row.line_service_id,
    lineServiceCode: row.project_line_services?.code,
    ralCodeId: row.ral_code_id,
    ralCode: row.project_ral_codes?.ral_code,
    blastingRequired: row.blasting_required,
    primerRequired: row.primer_required,
    intermediateCoatCount: row.intermediate_coat_count,
    finalCoatCount: row.final_coat_count,
    requiredFinalDftMicrons: Number(row.required_final_dft_microns),
    status: row.status,
  }))

  const assemblySettings: AssemblySettings = assemblyRes.data
    ? {
        projectId: assemblyRes.data.project_id,
        enabled: assemblyRes.data.enabled,
        defaultSubcontractorId: assemblyRes.data.default_subcontractor_id,
        defaultSubcontractorCode: (assemblyRes.data as any).project_subcontractors?.code,
      }
    : {
        projectId,
        enabled: false,
        defaultSubcontractorId: null,
      }

  return {
    devices,
    deviceUsers,
    spoolingMaterialTypes,
    spoolingMaterialClasses,
    spoolingChecklistItems,
    ralCodes,
    paintMatrixRules,
    assemblySettings,
  }
}

export async function createDevice(
  client: SupabaseClient<Database>,
  projectId: string,
  input: DeviceInput
): Promise<Device> {
  const { data, error } = await client
    .from("project_devices")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
    })
    .select("id, project_id, code, description, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    status: data.status,
  }
}

export async function listDeviceUserCandidates(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<DeviceUserCandidate[]> {
  const { data, error } = await client.rpc("list_tracking_device_user_candidates", { p_project_id: projectId })
  if (error) throw new Error(mapSupabaseReferenceError(error))
  return (data ?? []).map((row) => ({
    membershipId: row.membership_id,
    fullName: row.full_name,
    email: row.email,
    deviceUserId: row.device_user_id,
    deviceId: row.device_id,
    deviceCode: row.device_code,
    isAssigned: row.is_assigned,
  }))
}

export async function assignDeviceUser(
  client: SupabaseClient<Database>,
  projectId: string,
  input: DeviceUserInput,
): Promise<void> {
  const validation = validateDeviceUserInput(input)
  if (!validation.ok) throw new Error(Object.values(validation.errors)[0] ?? "Invalid device assignment")
  const { error } = await client
    .from("project_device_users")
    .upsert({
      project_id: projectId,
      membership_id: validation.value.membershipId,
      device_id: validation.value.deviceId,
      status: "active",
    }, { onConflict: "project_id,membership_id" })
  if (error) throw new Error(mapSupabaseReferenceError(error))
}

export async function saveAssemblySettings(
  client: SupabaseClient<Database>,
  projectId: string,
  enabled: boolean,
  defaultSubcontractorId: string | null
): Promise<AssemblySettings> {
  const { data, error } = await client
    .from("project_assembly_settings")
    .upsert({
      project_id: projectId,
      enabled,
      default_subcontractor_id: defaultSubcontractorId,
      updated_at: new Date().toISOString(),
    })
    .select("project_id, enabled, default_subcontractor_id")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    projectId: data.project_id,
    enabled: data.enabled,
    defaultSubcontractorId: data.default_subcontractor_id,
  }
}
