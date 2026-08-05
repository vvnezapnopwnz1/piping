import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  Subcontractor,
  SubcontractorInput,
  Unit,
  AreaClassification,
  PdsArea,
  PdsAreaInput,
} from "../domain/project-geography"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"
import { normalizeReferenceCode } from "../domain/reference"

export interface CustomFieldDefinition {
  id: string
  projectId: string
  scope: string
  fieldKey: string
  label: string
  dataType: string
  sortOrder: number
  status: "active" | "inactive" | "archived"
}

export interface LoadedProjectGeography {
  units: Unit[]
  areaClassifications: AreaClassification[]
  subcontractors: Subcontractor[]
  pdsAreas: PdsArea[]
  customFields: CustomFieldDefinition[]
}

export async function loadProjectGeography(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedProjectGeography> {
  const [unitsRes, areaClassRes, subsRes, pdsRes, customRes] = await Promise.all([
    client
      .from("project_units")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_area_classifications")
      .select("id, project_id, unit_id, code, description, status, project_units(code)")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_subcontractors")
      .select("id, project_id, code, description, contact_details, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_pds_areas")
      .select(`
        id, project_id, code, description,
        shop_subcontractor_id, assembly_subcontractor_id, field_subcontractor_id,
        area_classification_id, environment, is_unit, is_rack, custom_values, status,
        shop_sub:project_subcontractors!shop_subcontractor_id(code),
        assembly_sub:project_subcontractors!assembly_subcontractor_id(code),
        field_sub:project_subcontractors!field_subcontractor_id(code),
        area_classification:project_area_classifications!area_classification_id(code)
      `)
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_custom_field_definitions")
      .select("id, project_id, scope, field_key, label, data_type, sort_order, status")
      .eq("project_id", projectId)
      .in("scope", ["prefabrication", "assembly", "erection", "pds_area"])
      .order("sort_order", { ascending: true }),
  ])

  if (unitsRes.error) throw new Error(mapSupabaseReferenceError(unitsRes.error))
  if (areaClassRes.error) throw new Error(mapSupabaseReferenceError(areaClassRes.error))
  if (subsRes.error) throw new Error(mapSupabaseReferenceError(subsRes.error))
  if (pdsRes.error) throw new Error(mapSupabaseReferenceError(pdsRes.error))
  if (customRes.error) throw new Error(mapSupabaseReferenceError(customRes.error))

  const units: Unit[] = (unitsRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const areaClassifications: AreaClassification[] = (areaClassRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    unitId: row.unit_id,
    unitCode: row.project_units?.code,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const subcontractors: Subcontractor[] = (subsRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    contactDetails: row.contact_details,
    status: row.status,
  }))

  const pdsAreas: PdsArea[] = (pdsRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    shopSubcontractorId: row.shop_subcontractor_id,
    shopSubcontractorCode: row.shop_sub?.code,
    assemblySubcontractorId: row.assembly_subcontractor_id,
    assemblySubcontractorCode: row.assembly_sub?.code,
    fieldSubcontractorId: row.field_subcontractor_id,
    fieldSubcontractorCode: row.field_sub?.code,
    areaClassificationId: row.area_classification_id,
    areaClassificationCode: row.area_classification?.code,
    environment: row.environment,
    isUnit: row.is_unit,
    isRack: row.is_rack,
    customValues: (row.custom_values as Record<string, any>) || {},
    status: row.status,
  }))

  const customFields: CustomFieldDefinition[] = (customRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    scope: row.scope,
    fieldKey: row.field_key,
    label: row.label,
    dataType: row.data_type,
    sortOrder: row.sort_order,
    status: row.status,
  }))

  return {
    units,
    areaClassifications,
    subcontractors,
    pdsAreas,
    customFields,
  }
}

export async function createSubcontractor(
  client: SupabaseClient<Database>,
  projectId: string,
  input: SubcontractorInput
): Promise<Subcontractor> {
  const { data, error } = await client
    .from("project_subcontractors")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
      contact_details: input.contactDetails,
    })
    .select("id, project_id, code, description, contact_details, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    contactDetails: data.contact_details,
    status: data.status,
  }
}

export async function updateSubcontractorStatus(
  client: SupabaseClient<Database>,
  projectId: string,
  id: string,
  status: "active" | "inactive" | "archived"
): Promise<Subcontractor> {
  const { data, error } = await client
    .from("project_subcontractors")
    .update({ status })
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id, project_id, code, description, contact_details, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    contactDetails: data.contact_details,
    status: data.status,
  }
}

export async function createPdsArea(
  client: SupabaseClient<Database>,
  projectId: string,
  input: PdsAreaInput
): Promise<PdsArea> {
  const { data, error } = await client
    .from("project_pds_areas")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
      shop_subcontractor_id: input.shopSubcontractorId,
      assembly_subcontractor_id: input.assemblySubcontractorId,
      field_subcontractor_id: input.fieldSubcontractorId,
      area_classification_id: input.areaClassificationId,
      environment: input.environment,
      is_unit: input.isUnit,
      is_rack: input.isRack,
      custom_values: input.customValues,
    })
    .select(`
      id, project_id, code, description,
      shop_subcontractor_id, assembly_subcontractor_id, field_subcontractor_id,
      area_classification_id, environment, is_unit, is_rack, custom_values, status
    `)
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    shopSubcontractorId: data.shop_subcontractor_id,
    assemblySubcontractorId: data.assembly_subcontractor_id,
    fieldSubcontractorId: data.field_subcontractor_id,
    areaClassificationId: data.area_classification_id,
    environment: data.environment,
    isUnit: data.is_unit,
    isRack: data.is_rack,
    customValues: (data.custom_values as Record<string, any>) || {},
    status: data.status,
  }
}
