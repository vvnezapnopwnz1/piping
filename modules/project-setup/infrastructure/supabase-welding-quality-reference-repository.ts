import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  ServiceClass,
  ServiceClassInput,
  WeldType,
  WeldTypeInput,
  WelderQualification,
  WelderQualificationInput,
  NdeMatrixRule,
  NdeMatrixRuleInput,
  ThicknessFlangeRule,
  ThicknessFlangeRuleInput,
  PipingMaterialRecord,
  PipingMaterialRecordInput,
  ReworkCode,
  ReworkCodeInput,
  JointCategory,
  JointCategoryInput,
} from "../domain/welding-quality-reference"
import { isWelderCurrentlyQualified } from "../domain/welding-quality-reference"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"
import { normalizeReferenceCode } from "../domain/reference"

export interface LoadedWeldingQualityReferences {
  materialTypes: { id: string; code: string; description: string }[]
  serviceClasses: ServiceClass[]
  weldTypes: WeldType[]
  welderQualifications: WelderQualification[]
  ndeMatrixRules: NdeMatrixRule[]
  thicknessFlangeRules: ThicknessFlangeRule[]
  pipingMaterialRecords: PipingMaterialRecord[]
  reworkCodes: ReworkCode[]
  jointCategories: JointCategory[]
}

export async function loadWeldingQualityReferences(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<LoadedWeldingQualityReferences> {
  const [mtRes, scRes, wtRes, weldersRes, linksRes, ndeRes, thickRes, pmlRes, reworkRes, jcRes] = await Promise.all([
    client
      .from("system_reference_entries")
      .select("id, code, description")
      .eq("kind", "material_type")
      .eq("status", "active")
      .order("code", { ascending: true }),
    client
      .from("project_service_classes")
      .select("id, project_id, material_type_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_weld_types")
      .select("id, project_id, code, description, counts_in_dia_inch, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("welder_qualifications")
      .select("id, project_id, welder_code, full_name, subcontractor_id, certificate_number, expires_on, status, project_subcontractors(code)")
      .eq("project_id", projectId)
      .order("welder_code", { ascending: true }),
    client
      .from("welder_wps_qualifications")
      .select("welder_qualification_id, wps_id"),
    client
      .from("nde_matrix_rules")
      .select("id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, mt_coverage, pt_coverage, pmi_coverage, ht_coverage, pwht_required, pwht_thickness_threshold, material_traceability_required, status, project_service_classes(code), project_weld_types(code)")
      .eq("project_id", projectId)
      .order("weld_location", { ascending: true }),
    client
      .from("project_thickness_flange_rules")
      .select("id, project_id, service_class_id, diameter_inch, thickness_mm, flange_rating, status, project_service_classes(code)")
      .eq("project_id", projectId)
      .order("diameter_inch", { ascending: true }),
    client
      .from("piping_material_records")
      .select("id, project_id, mrr_number, ident_code, trace_number, status")
      .eq("project_id", projectId)
      .order("mrr_number", { ascending: true }),
    client
      .from("project_rework_codes")
      .select("id, project_id, code, description, status")
      .eq("project_id", projectId)
      .order("code", { ascending: true }),
    client
      .from("project_joint_categories")
      .select("id, project_id, joint_definition, timing, category_code, reason, coefficient, status")
      .eq("project_id", projectId)
      .order("category_code", { ascending: true }),
  ])

  if (mtRes.error) throw new Error(mapSupabaseReferenceError(mtRes.error))
  if (scRes.error) throw new Error(mapSupabaseReferenceError(scRes.error))
  if (wtRes.error) throw new Error(mapSupabaseReferenceError(wtRes.error))
  if (weldersRes.error) throw new Error(mapSupabaseReferenceError(weldersRes.error))
  if (linksRes.error) throw new Error(mapSupabaseReferenceError(linksRes.error))
  if (ndeRes.error) throw new Error(mapSupabaseReferenceError(ndeRes.error))
  if (thickRes.error) throw new Error(mapSupabaseReferenceError(thickRes.error))
  if (pmlRes.error) throw new Error(mapSupabaseReferenceError(pmlRes.error))
  if (reworkRes.error) throw new Error(mapSupabaseReferenceError(reworkRes.error))
  if (jcRes.error) throw new Error(mapSupabaseReferenceError(jcRes.error))

  const linksByWelderId = new Map<string, string[]>()
  for (const link of linksRes.data ?? []) {
    const arr = linksByWelderId.get(link.welder_qualification_id) ?? []
    arr.push(link.wps_id)
    linksByWelderId.set(link.welder_qualification_id, arr)
  }

  const serviceClasses: ServiceClass[] = (scRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    materialTypeId: row.material_type_id,
    status: row.status,
  }))

  const weldTypes: WeldType[] = (wtRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    countsInDiaInch: row.counts_in_dia_inch,
    status: row.status,
  }))

  const welderQualifications: WelderQualification[] = (weldersRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    welderCode: row.welder_code,
    fullName: row.full_name,
    subcontractorId: row.subcontractor_id,
    subcontractorCode: row.project_subcontractors?.code,
    certificateNumber: row.certificate_number,
    expiresOn: row.expires_on,
    isCurrentlyQualified: isWelderCurrentlyQualified(row.expires_on),
    wpsIds: linksByWelderId.get(row.id) ?? [],
    status: row.status,
  }))

  const ndeMatrixRules: NdeMatrixRule[] = (ndeRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    serviceClassId: row.service_class_id,
    serviceClassCode: row.project_service_classes?.code,
    weldTypeId: row.weld_type_id,
    weldTypeCode: row.project_weld_types?.code,
    weldLocation: row.weld_location,
    rtCoverage: Number(row.rt_coverage),
    utCoverage: Number(row.ut_coverage),
    mtCoverage: Number(row.mt_coverage),
    ptCoverage: Number(row.pt_coverage),
    pmiCoverage: Number(row.pmi_coverage),
    htCoverage: Number(row.ht_coverage),
    pwhtRequired: row.pwht_required,
    pwhtThicknessThreshold: row.pwht_thickness_threshold ? Number(row.pwht_thickness_threshold) : null,
    materialTraceabilityRequired: row.material_traceability_required,
    status: row.status,
  }))

  const thicknessFlangeRules: ThicknessFlangeRule[] = (thickRes.data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    serviceClassId: row.service_class_id,
    serviceClassCode: row.project_service_classes?.code,
    diameterInch: Number(row.diameter_inch),
    thicknessMm: Number(row.thickness_mm),
    flangeRating: row.flange_rating,
    status: row.status,
  }))

  const pipingMaterialRecords: PipingMaterialRecord[] = (pmlRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    mrrNumber: row.mrr_number,
    identCode: row.ident_code,
    traceNumber: row.trace_number,
    status: row.status,
  }))

  const reworkCodes: ReworkCode[] = (reworkRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    description: row.description,
    status: row.status,
  }))

  const jointCategories: JointCategory[] = (jcRes.data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    jointDefinition: row.joint_definition,
    timing: row.timing as any,
    categoryCode: row.category_code,
    reason: row.reason,
    coefficient: row.coefficient ? Number(row.coefficient) : null,
    status: row.status,
  }))

  const materialTypes = (mtRes.data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
  }))

  return {
    materialTypes,
    serviceClasses,
    weldTypes,
    welderQualifications,
    ndeMatrixRules,
    thicknessFlangeRules,
    pipingMaterialRecords,
    reworkCodes,
    jointCategories,
  }
}

export async function createServiceClass(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ServiceClassInput
): Promise<ServiceClass> {
  const { data, error } = await client
    .from("project_service_classes")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description ? input.description.trim() : null,
      material_type_id: input.materialTypeId,
    })
    .select("id, project_id, code, description, material_type_id, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    materialTypeId: data.material_type_id,
    status: data.status,
  }
}

export async function createWeldType(
  client: SupabaseClient<Database>,
  projectId: string,
  input: WeldTypeInput
): Promise<WeldType> {
  const { data, error } = await client
    .from("project_weld_types")
    .insert({
      project_id: projectId,
      code: normalizeReferenceCode(input.code),
      description: input.description.trim(),
      counts_in_dia_inch: input.countsInDiaInch,
    })
    .select("id, project_id, code, description, counts_in_dia_inch, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    code: data.code,
    description: data.description,
    countsInDiaInch: data.counts_in_dia_inch,
    status: data.status,
  }
}

export async function saveWelderQualificationRpc(
  client: SupabaseClient<Database>,
  projectId: string,
  welderId: string | null,
  input: WelderQualificationInput
): Promise<WelderQualification> {
  const { data, error } = await client.rpc("save_welder_qualification", {
    target_project_id: projectId,
    target_welder_id: (welderId ?? undefined) as any,
    welder_payload: {
      welder_code: normalizeReferenceCode(input.welderCode),
      full_name: input.fullName.trim(),
      subcontractor_id: input.subcontractorId,
      certificate_number: input.certificateNumber ? input.certificateNumber.trim() : null,
      expires_on: input.expiresOn,
    },
    target_wps_ids: input.wpsIds,
  })

  if (error) throw new Error(mapSupabaseReferenceError(error))

  const row = data as any
  return {
    id: row.id,
    projectId: row.project_id,
    welderCode: row.welder_code,
    fullName: row.full_name,
    subcontractorId: row.subcontractor_id,
    certificateNumber: row.certificate_number,
    expiresOn: row.expires_on,
    isCurrentlyQualified: isWelderCurrentlyQualified(row.expires_on),
    wpsIds: input.wpsIds,
    status: row.status,
  }
}

export async function createNdeMatrixRule(
  client: SupabaseClient<Database>,
  projectId: string,
  input: NdeMatrixRuleInput
): Promise<NdeMatrixRule> {
  const { data, error } = await client
    .from("nde_matrix_rules")
    .insert({
      project_id: projectId,
      service_class_id: input.serviceClassId,
      weld_type_id: input.weldTypeId,
      weld_location: input.weldLocation,
      rt_coverage: input.rtCoverage,
      ut_coverage: input.utCoverage,
      mt_coverage: input.mtCoverage,
      pt_coverage: input.ptCoverage,
      pmi_coverage: input.pmiCoverage,
      ht_coverage: input.htCoverage,
      pwht_required: input.pwhtRequired,
      pwht_thickness_threshold: input.pwhtThicknessThreshold,
      material_traceability_required: input.materialTraceabilityRequired,
    })
    .select("id, project_id, service_class_id, weld_type_id, weld_location, rt_coverage, ut_coverage, mt_coverage, pt_coverage, pmi_coverage, ht_coverage, pwht_required, pwht_thickness_threshold, material_traceability_required, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    serviceClassId: data.service_class_id,
    weldTypeId: data.weld_type_id,
    weldLocation: data.weld_location as any,
    rtCoverage: Number(data.rt_coverage),
    utCoverage: Number(data.ut_coverage),
    mtCoverage: Number(data.mt_coverage),
    ptCoverage: Number(data.pt_coverage),
    pmiCoverage: Number(data.pmi_coverage),
    htCoverage: Number(data.ht_coverage),
    pwhtRequired: data.pwht_required,
    pwhtThicknessThreshold: data.pwht_thickness_threshold ? Number(data.pwht_thickness_threshold) : null,
    materialTraceabilityRequired: data.material_traceability_required,
    status: data.status,
  }
}

export async function createThicknessFlangeRule(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ThicknessFlangeRuleInput
): Promise<ThicknessFlangeRule> {
  const { data, error } = await client
    .from("project_thickness_flange_rules")
    .insert({
      project_id: projectId,
      service_class_id: input.serviceClassId,
      diameter_inch: input.diameterInch,
      thickness_mm: input.thicknessMm,
      flange_rating: input.flangeRating.trim(),
    })
    .select("id, project_id, service_class_id, diameter_inch, thickness_mm, flange_rating, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    serviceClassId: data.service_class_id,
    diameterInch: Number(data.diameter_inch),
    thicknessMm: Number(data.thickness_mm),
    flangeRating: data.flange_rating,
    status: data.status,
  }
}

export async function createPipingMaterialRecord(
  client: SupabaseClient<Database>,
  projectId: string,
  input: PipingMaterialRecordInput
): Promise<PipingMaterialRecord> {
  const { data, error } = await client
    .from("piping_material_records")
    .insert({
      project_id: projectId,
      mrr_number: input.mrrNumber.trim(),
      ident_code: normalizeReferenceCode(input.identCode),
      trace_number: input.traceNumber.trim(),
    })
    .select("id, project_id, mrr_number, ident_code, trace_number, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    mrrNumber: data.mrr_number,
    identCode: data.ident_code,
    traceNumber: data.trace_number,
    status: data.status,
  }
}

export async function createReworkCode(
  client: SupabaseClient<Database>,
  projectId: string,
  input: ReworkCodeInput
): Promise<ReworkCode> {
  const { data, error } = await client
    .from("project_rework_codes")
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

export async function createJointCategory(
  client: SupabaseClient<Database>,
  projectId: string,
  input: JointCategoryInput
): Promise<JointCategory> {
  const { data, error } = await client
    .from("project_joint_categories")
    .insert({
      project_id: projectId,
      joint_definition: input.jointDefinition.trim(),
      timing: input.timing,
      category_code: normalizeReferenceCode(input.categoryCode),
      reason: input.reason.trim(),
      coefficient: input.coefficient,
    })
    .select("id, project_id, joint_definition, timing, category_code, reason, coefficient, status")
    .single()

  if (error) throw new Error(mapSupabaseReferenceError(error))

  return {
    id: data.id,
    projectId: data.project_id,
    jointDefinition: data.joint_definition,
    timing: data.timing as any,
    categoryCode: data.category_code,
    reason: data.reason,
    coefficient: data.coefficient ? Number(data.coefficient) : null,
    status: data.status,
  }
}
