import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import type { StagingEntityKind } from "../../modules/engineering/domain/entity"
import {
  SPOOLGEN_FILE_ROLES,
  type SpoolgenFileRole,
} from "../../modules/engineering/domain/spoolgen-file"
import {
  DEMO_MANIFEST,
  EMPTY_AT_DEMO_START,
  EXEMPT_FROM_EMPTY_AT_DEMO_START,
  SHOWCASE_PROJECT_CODE,
  type DemoMembership,
  type DemoProject,
  type DemoProjectRole,
  type DemoReferences,
  type DemoStatus,
  resolveDemoDates,
} from "./manifest"
import { assertLocalSupabaseTarget } from "./local-target"
import { assertHostedSupabaseTarget } from "./hosted-target"
import type {
  DemoSpoolgenSnapshot,
  DemoStandSnapshot,
  ObservedDemoMembership,
  ObservedDemoProject,
  ObservedDemoReferences,
  ObservedDemoUser,
} from "./preflight"

type EmptyTable = (typeof EMPTY_AT_DEMO_START)[number]
type DirectEmptyTable = Exclude<EmptyTable, "pwht_results">
type DemoProjectCode =
  | typeof DEMO_MANIFEST.projects.golden.activityCode
  | typeof DEMO_MANIFEST.projects.isolation.activityCode
  | typeof DEMO_MANIFEST.projects.showcase.activityCode
/**
 * Projects the empty-at-start rule applies to. The showcase project is excluded at the type
 * level so a future reader cannot quietly start counting its deliberately non-empty tables.
 */
type EmptyCheckedProjectCode = Exclude<
  DemoProjectCode,
  (typeof EXEMPT_FROM_EMPTY_AT_DEMO_START)[number]
>
type LegacyRole = Database["public"]["Enums"]["app_role"]
type PublicTables = Database["public"]["Tables"]
type TableInsert<Table extends keyof PublicTables> =
  PublicTables[Table]["Insert"]
type TableRow<Table extends keyof PublicTables> = PublicTables[Table]["Row"]

export interface DemoReferenceResolvedIds {
  readonly goldenProjectId: string
  readonly membershipIds: {
    readonly projectAdminA: string
    readonly qcEditor: string
    readonly ndeSubcontractor: string
  }
}

export interface PlannedReference<Insert, Manifest> {
  readonly key: string
  readonly status: DemoStatus
  readonly insert: Insert
  readonly manifest: Manifest
}

export interface PlannedDependentReference<Insert, Manifest, Parents>
  extends PlannedReference<Insert, Manifest> {
  readonly parents: Parents
}

type ReferenceRow<Family extends keyof DemoReferences> =
  DemoReferences[Family][number]

interface PlannedProgressWeightManifest {
  readonly key: string
  readonly status: DemoStatus
  readonly phase: ReferenceRow<"progressWeights">
  readonly item: ReferenceRow<"progressWeights">["items"][number]
}

interface PlannedMembershipScopeManifest {
  readonly userKey: "nde_subcontractor"
  readonly projectCode: typeof DEMO_MANIFEST.projects.golden.activityCode
}

export interface DemoReferencePlan {
  readonly system_reference_entries: readonly PlannedReference<
    TableInsert<"system_reference_entries">,
    ReferenceRow<"systemMaterialTypes"> | ReferenceRow<"torquingRequirements">
  >[]
  readonly system_film_quantity_rules: readonly PlannedReference<
    TableInsert<"system_film_quantity_rules">,
    ReferenceRow<"filmQuantityRules">
  >[]
  readonly system_ut_calculation_rules: readonly PlannedReference<
    TableInsert<"system_ut_calculation_rules">,
    ReferenceRow<"utCalculationRules">
  >[]
  readonly project_subcontractors: readonly PlannedReference<
    TableInsert<"project_subcontractors">,
    ReferenceRow<"subcontractors">
  >[]
  readonly project_units: readonly PlannedReference<
    TableInsert<"project_units">,
    ReferenceRow<"units">
  >[]
  readonly project_weld_types: readonly PlannedReference<
    TableInsert<"project_weld_types">,
    ReferenceRow<"weldTypes">
  >[]
  readonly project_line_services: readonly PlannedReference<
    TableInsert<"project_line_services">,
    ReferenceRow<"lineServices">
  >[]
  readonly project_location_categories: readonly PlannedReference<
    TableInsert<"project_location_categories">,
    ReferenceRow<"locationCategories">
  >[]
  readonly project_systems: readonly PlannedReference<
    TableInsert<"project_systems">,
    ReferenceRow<"systems">
  >[]
  readonly project_teams: readonly PlannedReference<
    TableInsert<"project_teams">,
    ReferenceRow<"teams">
  >[]
  readonly project_punch_codes: readonly PlannedReference<
    TableInsert<"project_punch_codes">,
    ReferenceRow<"punchCodes">
  >[]
  readonly project_rework_codes: readonly PlannedReference<
    TableInsert<"project_rework_codes">,
    ReferenceRow<"reworkCodes">
  >[]
  readonly project_unit_time_references: readonly PlannedReference<
    TableInsert<"project_unit_time_references">,
    ReferenceRow<"unitTimeReferences">
  >[]
  readonly project_pressure_units: readonly PlannedReference<
    TableInsert<"project_pressure_units">,
    ReferenceRow<"pressureUnits">
  >[]
  readonly project_spooling_material_types: readonly PlannedReference<
    TableInsert<"project_spooling_material_types">,
    ReferenceRow<"spoolingMaterialTypes">
  >[]
  readonly project_spooling_checklist_items: readonly PlannedReference<
    TableInsert<"project_spooling_checklist_items">,
    ReferenceRow<"spoolingChecklistItems">
  >[]
  readonly piping_material_records: readonly PlannedReference<
    TableInsert<"piping_material_records">,
    ReferenceRow<"pipingMaterialRecords">
  >[]
  readonly project_assembly_settings: readonly PlannedReference<
    TableInsert<"project_assembly_settings">,
    ReferenceRow<"assemblySettings">
  >[]
  readonly project_devices: readonly PlannedReference<
    TableInsert<"project_devices">,
    ReferenceRow<"devices">
  >[]
  readonly project_area_classifications: readonly PlannedDependentReference<
    Omit<TableInsert<"project_area_classifications">, "unit_id">,
    ReferenceRow<"areaClassifications">,
    { readonly unitCode: string }
  >[]
  readonly project_pds_areas: readonly PlannedDependentReference<
    Omit<
      TableInsert<"project_pds_areas">,
      | "area_classification_id"
      | "assembly_subcontractor_id"
      | "field_subcontractor_id"
      | "shop_subcontractor_id"
    >,
    ReferenceRow<"pdsAreas">,
    {
      readonly areaCode: string
      readonly shopSubcontractorCode: string
      readonly fieldSubcontractorCode: string
    }
  >[]
  readonly project_service_classes: readonly PlannedDependentReference<
    Omit<TableInsert<"project_service_classes">, "material_type_id">,
    ReferenceRow<"serviceClasses">,
    { readonly materialTypeCode: string }
  >[]
  readonly project_welding_procedures: readonly PlannedDependentReference<
    Omit<
      TableInsert<"project_welding_procedures">,
      "material_type_id" | "subcontractor_id"
    >,
    ReferenceRow<"weldingProcedures">,
    {
      readonly subcontractorCode: string
      readonly materialTypeCode: string
    }
  >[]
  readonly welder_qualifications: readonly PlannedDependentReference<
    Omit<TableInsert<"welder_qualifications">, "subcontractor_id">,
    ReferenceRow<"welders">,
    { readonly subcontractorCode: string }
  >[]
  readonly welder_wps_qualifications: readonly PlannedDependentReference<
    Omit<
      TableInsert<"welder_wps_qualifications">,
      "welder_qualification_id" | "wps_id"
    >,
    ReferenceRow<"welderWpsQualifications">,
    {
      readonly projectId: string
      readonly welderCode: string
      readonly wpsCode: string
    }
  >[]
  readonly project_thickness_flange_rules: readonly PlannedDependentReference<
    Omit<TableInsert<"project_thickness_flange_rules">, "service_class_id">,
    ReferenceRow<"thicknessFlangeRules">,
    { readonly serviceClassCode: string }
  >[]
  readonly nde_matrix_rules: readonly PlannedDependentReference<
    Omit<
      TableInsert<"nde_matrix_rules">,
      "service_class_id" | "weld_type_id"
    >,
    ReferenceRow<"ndeMatrixRules">,
    { readonly serviceClassCode: string; readonly weldTypeCode: string }
  >[]
  readonly project_subsystems: readonly PlannedDependentReference<
    Omit<TableInsert<"project_subsystems">, "system_id">,
    ReferenceRow<"subsystems">,
    { readonly systemCode: string }
  >[]
  readonly project_locations: readonly PlannedDependentReference<
    Omit<TableInsert<"project_locations">, "category_id">,
    ReferenceRow<"locations">,
    { readonly categoryCode: string }
  >[]
  readonly project_spooling_material_classes: readonly PlannedDependentReference<
    Omit<TableInsert<"project_spooling_material_classes">, "material_type_id">,
    ReferenceRow<"spoolingMaterialClasses">,
    { readonly materialTypeCode: string }
  >[]
  readonly project_ral_codes: readonly PlannedDependentReference<
    Omit<TableInsert<"project_ral_codes">, "line_service_id">,
    ReferenceRow<"ralCodes">,
    { readonly lineServiceCode: string }
  >[]
  readonly project_paint_matrix_rules: readonly PlannedDependentReference<
    Omit<
      TableInsert<"project_paint_matrix_rules">,
      "line_service_id" | "ral_code_id"
    >,
    ReferenceRow<"paintMatrixRules">,
    { readonly lineServiceCode: string; readonly ralCode: string }
  >[]
  readonly project_joint_categories: readonly PlannedReference<
    TableInsert<"project_joint_categories">,
    ReferenceRow<"jointCategories">
  >[]
  readonly project_device_users: readonly PlannedDependentReference<
    Omit<TableInsert<"project_device_users">, "device_id">,
    ReferenceRow<"deviceAssignments">,
    { readonly deviceCode: string }
  >[]
  readonly project_progress_weights: readonly PlannedReference<
    TableInsert<"project_progress_weights">,
    PlannedProgressWeightManifest
  >[]
  readonly membership_subcontractor_scopes: readonly PlannedDependentReference<
    Omit<TableInsert<"membership_subcontractor_scopes">, "subcontractor_id">,
    PlannedMembershipScopeManifest,
    { readonly subcontractorCode: string }
  >[]
  readonly membership_pds_area_scopes: readonly PlannedDependentReference<
    Omit<TableInsert<"membership_pds_area_scopes">, "pds_area_id">,
    PlannedMembershipScopeManifest,
    { readonly pdsAreaCode: string }
  >[]
}

export type DemoReferenceBatchTable = Exclude<
  keyof DemoReferencePlan,
  "membership_subcontractor_scopes" | "membership_pds_area_scopes"
>

export type DemoReferenceWriteBatch = {
  readonly [Table in DemoReferenceBatchTable]: {
    readonly table: Table
    readonly rows: DemoReferencePlan[Table]
  }
}[DemoReferenceBatchTable]

export interface DemoScopeReplacement {
  readonly subcontractorScopes:
    DemoReferencePlan["membership_subcontractor_scopes"]
  readonly pdsAreaScopes: DemoReferencePlan["membership_pds_area_scopes"]
}

export interface DemoReferenceGateway {
  reconcileReferenceBatch(batch: DemoReferenceWriteBatch): Promise<void>
  replaceMembershipScopes(replacement: DemoScopeReplacement): Promise<void>
  readReferences(projectId: string): Promise<ObservedDemoReferences>
  readSetupReadiness(projectId: string): Promise<{
    readonly ready: boolean
    readonly missing: readonly string[]
  }>
  readReferenceKeys(
    projectId: string,
  ): Promise<Readonly<Record<keyof DemoReferences, readonly string[]>>>
}

export const MANIFEST_ONLY_REFERENCE_FIELDS = [
  "filmQuantityRules.description",
  "filmQuantityRules.status",
  "utCalculationRules.description",
  "utCalculationRules.status",
  "welders.description",
  "welderWpsQualifications.status",
  "ndeMatrixRules.description",
  "pipingMaterialRecords.description",
  "thicknessFlangeRules.description",
  "jointCategories.description",
  "pressureUnits.description",
  "pressureUnits.status",
  "unitTimeReferences.description",
  "progressWeights.description",
  "progressWeights.items.description",
  "assemblySettings.status",
  "spoolingMaterialClasses.description",
  "ralCodes.description",
  "paintMatrixRules.description",
] as const

export interface DemoReferenceDatabaseRows {
  readonly system_reference_entries: readonly Pick<
    TableRow<"system_reference_entries">,
    "id" | "kind" | "code" | "description" | "status"
  >[]
  readonly system_film_quantity_rules: readonly Pick<
    TableRow<"system_film_quantity_rules">,
    | "diameter_from_inch"
    | "diameter_to_inch"
    | "thickness_from_mm"
    | "thickness_to_mm"
    | "film_count"
  >[]
  readonly system_ut_calculation_rules: readonly Pick<
    TableRow<"system_ut_calculation_rules">,
    | "diameter_from_inch"
    | "diameter_to_inch"
    | "flange_rating"
    | "coefficient_diameter"
    | "coefficient_rating"
  >[]
  readonly project_subcontractors: readonly Pick<
    TableRow<"project_subcontractors">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_units: readonly Pick<
    TableRow<"project_units">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_area_classifications: readonly Pick<
    TableRow<"project_area_classifications">,
    "id" | "code" | "description" | "status" | "unit_id"
  >[]
  readonly project_pds_areas: readonly Pick<
    TableRow<"project_pds_areas">,
    | "id"
    | "code"
    | "description"
    | "status"
    | "area_classification_id"
    | "shop_subcontractor_id"
    | "field_subcontractor_id"
  >[]
  readonly project_service_classes: readonly Pick<
    TableRow<"project_service_classes">,
    "id" | "code" | "description" | "status" | "material_type_id"
  >[]
  readonly project_weld_types: readonly Pick<
    TableRow<"project_weld_types">,
    "id" | "code" | "description" | "status" | "counts_in_dia_inch"
  >[]
  readonly project_welding_procedures: readonly Pick<
    TableRow<"project_welding_procedures">,
    | "id"
    | "code"
    | "description"
    | "status"
    | "subcontractor_id"
    | "material_type_id"
    | "process"
    | "revision"
    | "diameter_from"
    | "diameter_to"
    | "thickness_from"
    | "thickness_to"
    | "approved_on"
  >[]
  readonly welder_qualifications: readonly Pick<
    TableRow<"welder_qualifications">,
    | "id"
    | "welder_code"
    | "full_name"
    | "status"
    | "subcontractor_id"
    | "expires_on"
  >[]
  readonly welder_wps_qualifications: readonly Pick<
    TableRow<"welder_wps_qualifications">,
    "welder_qualification_id" | "wps_id"
  >[]
  readonly nde_matrix_rules: readonly Pick<
    TableRow<"nde_matrix_rules">,
    | "service_class_id"
    | "weld_type_id"
    | "weld_location"
    | "rt_coverage"
    | "ut_coverage"
    | "mt_coverage"
    | "pt_coverage"
    | "pmi_coverage"
    | "ht_coverage"
    | "material_traceability_required"
    | "pwht_required"
    | "status"
  >[]
  readonly piping_material_records: readonly Pick<
    TableRow<"piping_material_records">,
    "ident_code" | "trace_number" | "mrr_number" | "status"
  >[]
  readonly project_thickness_flange_rules: readonly Pick<
    TableRow<"project_thickness_flange_rules">,
    | "service_class_id"
    | "diameter_inch"
    | "thickness_mm"
    | "flange_rating"
    | "status"
  >[]
  readonly project_rework_codes: readonly Pick<
    TableRow<"project_rework_codes">,
    "code" | "description" | "status"
  >[]
  readonly project_joint_categories: readonly Pick<
    TableRow<"project_joint_categories">,
    | "category_code"
    | "joint_definition"
    | "timing"
    | "reason"
    | "coefficient"
    | "status"
  >[]
  readonly project_teams: readonly Pick<
    TableRow<"project_teams">,
    "code" | "description" | "team_type" | "status"
  >[]
  readonly project_punch_codes: readonly Pick<
    TableRow<"project_punch_codes">,
    "code" | "description" | "status"
  >[]
  readonly project_systems: readonly Pick<
    TableRow<"project_systems">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_subsystems: readonly Pick<
    TableRow<"project_subsystems">,
    "code" | "description" | "status" | "system_id"
  >[]
  readonly project_line_services: readonly Pick<
    TableRow<"project_line_services">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_pressure_units: readonly Pick<
    TableRow<"project_pressure_units">,
    "unit"
  >[]
  readonly project_location_categories: readonly Pick<
    TableRow<"project_location_categories">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_locations: readonly Pick<
    TableRow<"project_locations">,
    "code" | "description" | "status" | "category_id"
  >[]
  readonly project_unit_time_references: readonly Pick<
    TableRow<"project_unit_time_references">,
    "activity" | "project_ut" | "standard_reference" | "status"
  >[]
  readonly project_progress_weights: readonly Pick<
    TableRow<"project_progress_weights">,
    "phase" | "activity" | "weight" | "status"
  >[]
  readonly project_assembly_settings: readonly Pick<
    TableRow<"project_assembly_settings">,
    "enabled"
  >[]
  readonly project_spooling_material_types: readonly Pick<
    TableRow<"project_spooling_material_types">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_spooling_material_classes: readonly Pick<
    TableRow<"project_spooling_material_classes">,
    "external_class_code" | "material_type_id" | "status"
  >[]
  readonly project_spooling_checklist_items: readonly Pick<
    TableRow<"project_spooling_checklist_items">,
    "code" | "description" | "sort_order" | "is_required" | "status"
  >[]
  readonly project_ral_codes: readonly Pick<
    TableRow<"project_ral_codes">,
    "id" | "line_service_id" | "color_code" | "ral_code" | "status"
  >[]
  readonly project_paint_matrix_rules: readonly Pick<
    TableRow<"project_paint_matrix_rules">,
    | "line_service_id"
    | "ral_code_id"
    | "blasting_required"
    | "primer_required"
    | "intermediate_coat_count"
    | "final_coat_count"
    | "required_final_dft_microns"
    | "status"
  >[]
  readonly project_devices: readonly Pick<
    TableRow<"project_devices">,
    "id" | "code" | "description" | "status"
  >[]
  readonly project_device_users: readonly Pick<
    TableRow<"project_device_users">,
    "membership_id" | "device_id" | "status"
  >[]
  readonly project_memberships: readonly Pick<
    TableRow<"project_memberships">,
    "id" | "user_id"
  >[]
  readonly profiles: readonly Pick<
    TableRow<"profiles">,
    "id" | "email"
  >[]
}

function indexedCodes<Row extends { readonly id: string }>(
  rows: readonly Row[],
  codeFor: (row: Row) => string,
  operation: string,
): ReadonlyMap<string, string> {
  const codes = new Map<string, string>()
  for (const row of rows) {
    if (codes.has(row.id)) {
      throw new Error(`${operation} found duplicate database IDs.`)
    }
    codes.set(row.id, codeFor(row))
  }
  return codes
}

function relatedCode(
  codes: ReadonlyMap<string, string>,
  id: string | null,
): string | null {
  return id === null ? null : codes.get(id) ?? null
}

function manifestDescription(
  rows: readonly { readonly key: string; readonly description: string }[],
  key: string,
): string {
  return (
    rows.find((row) => row.key === key)?.description ??
    "[manifest label unavailable]"
  )
}

function manifestStatus(
  rows: readonly { readonly key: string; readonly status: DemoStatus }[],
  key: string,
): string {
  return rows.find((row) => row.key === key)?.status ?? "unmapped"
}

function ruleRangeKey(
  from: number,
  to: number,
  unit: "in" | "mm",
): string {
  return `${from}-${to}${unit}`
}

function normalizedNdeCoverage(
  row: DemoReferenceDatabaseRows["nde_matrix_rules"][number],
  key: string,
): { readonly method: string; readonly coveragePercent: number } {
  const expected = DEMO_MANIFEST.references.ndeMatrixRules.find(
    (candidate) => candidate.key === key,
  )
  const coverages = [
    { method: "RT", value: row.rt_coverage },
    { method: "UT", value: row.ut_coverage },
    { method: "MT", value: row.mt_coverage },
    { method: "PT", value: row.pt_coverage },
    { method: "PMI", value: row.pmi_coverage },
    { method: "HT", value: row.ht_coverage },
  ]
  const nonzero = coverages.filter((coverage) => coverage.value !== 0)
  if (nonzero.length === 0) {
    return {
      method: expected?.method ?? "NONE",
      coveragePercent: 0,
    }
  }
  if (nonzero.length === 1) {
    return {
      method: nonzero[0].method,
      coveragePercent: nonzero[0].value,
    }
  }
  return {
    method: `MULTIPLE:${nonzero
      .map((coverage) => `${coverage.method}=${coverage.value}`)
      .join("+")}`,
    coveragePercent: nonzero.reduce(
      (total, coverage) => total + coverage.value,
      0,
    ),
  }
}

export function normalizeDemoReferenceRows(
  rows: DemoReferenceDatabaseRows,
): ObservedDemoReferences {
  const materialTypes = rows.system_reference_entries.filter(
    (row) => row.kind === "material_type",
  )
  const torquingRequirements = rows.system_reference_entries.filter(
    (row) => row.kind === "torquing_requirement",
  )
  const materialCodes = indexedCodes(
    materialTypes,
    (row) => row.code,
    "Normalizing material types",
  )
  const subcontractorCodes = indexedCodes(
    rows.project_subcontractors,
    (row) => row.code,
    "Normalizing subcontractors",
  )
  const unitCodes = indexedCodes(
    rows.project_units,
    (row) => row.code,
    "Normalizing units",
  )
  const areaCodes = indexedCodes(
    rows.project_area_classifications,
    (row) => row.code,
    "Normalizing area classifications",
  )
  const serviceClassCodes = indexedCodes(
    rows.project_service_classes,
    (row) => row.code,
    "Normalizing service classes",
  )
  const weldTypeCodes = indexedCodes(
    rows.project_weld_types,
    (row) => row.code,
    "Normalizing weld types",
  )
  const wpsCodes = indexedCodes(
    rows.project_welding_procedures,
    (row) => row.code,
    "Normalizing welding procedures",
  )
  const welderCodes = indexedCodes(
    rows.welder_qualifications,
    (row) => row.welder_code,
    "Normalizing welder qualifications",
  )
  const systemCodes = indexedCodes(
    rows.project_systems,
    (row) => row.code,
    "Normalizing project systems",
  )
  const lineServiceCodes = indexedCodes(
    rows.project_line_services,
    (row) => row.code,
    "Normalizing line services",
  )
  const locationCategoryCodes = indexedCodes(
    rows.project_location_categories,
    (row) => row.code,
    "Normalizing location categories",
  )
  const spoolingMaterialTypeCodes = indexedCodes(
    rows.project_spooling_material_types,
    (row) => row.code,
    "Normalizing spooling material types",
  )
  const ralCodes = indexedCodes(
    rows.project_ral_codes,
    (row) => row.ral_code,
    "Normalizing RAL codes",
  )
  const deviceCodes = indexedCodes(
    rows.project_devices,
    (row) => row.code,
    "Normalizing project devices",
  )
  const userIdsByMembership = new Map(
    rows.project_memberships.map((row) => [row.id, row.user_id]),
  )
  const emailByUserId = new Map(rows.profiles.map((row) => [row.id, row.email]))
  const userKeyByEmail = new Map<string, string>(
    DEMO_MANIFEST.users.map((user) => [user.email, user.key]),
  )

  const progressByPhase = new Map<
    string,
    DemoReferenceDatabaseRows["project_progress_weights"]
  >()
  for (const row of rows.project_progress_weights) {
    const current = progressByPhase.get(row.phase) ?? []
    progressByPhase.set(row.phase, [...current, row])
  }

  return {
    systemMaterialTypes: materialTypes.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    filmQuantityRules: rows.system_film_quantity_rules.map((row) => {
      const key = `${ruleRangeKey(
        row.diameter_from_inch,
        row.diameter_to_inch,
        "in",
      )}|${ruleRangeKey(
        row.thickness_from_mm,
        row.thickness_to_mm,
        "mm",
      )}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.filmQuantityRules,
          key,
        ),
        minDiameterInches: row.diameter_from_inch,
        maxDiameterInches: row.diameter_to_inch,
        minThicknessMm: row.thickness_from_mm,
        maxThicknessMm: row.thickness_to_mm,
        filmCount: row.film_count,
        status: manifestStatus(
          DEMO_MANIFEST.references.filmQuantityRules,
          key,
        ),
      }
    }),
    utCalculationRules: rows.system_ut_calculation_rules.map((row) => {
      const pressureClass = row.flange_rating ?? "*"
      const key = `${ruleRangeKey(
        row.diameter_from_inch,
        row.diameter_to_inch,
        "in",
      )}|${pressureClass}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.utCalculationRules,
          key,
        ),
        minDiameterInches: row.diameter_from_inch,
        maxDiameterInches: row.diameter_to_inch,
        pressureClass,
        coefficientA: row.coefficient_diameter,
        coefficientB: row.coefficient_rating,
        status: manifestStatus(
          DEMO_MANIFEST.references.utCalculationRules,
          key,
        ),
      }
    }),
    torquingRequirements: torquingRequirements.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    subcontractors: rows.project_subcontractors.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    units: rows.project_units.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    areaClassifications: rows.project_area_classifications.map((row) => {
      const unitCode = relatedCode(unitCodes, row.unit_id)
      return {
        key: `${unitCode ?? "missing-unit"}|${row.code}`,
        code: row.code,
        description: row.description,
        unitCode,
        status: row.status,
      }
    }),
    pdsAreas: rows.project_pds_areas.map((row) => {
      const areaCode = relatedCode(areaCodes, row.area_classification_id)
      return {
        key: `${areaCode ?? "missing-area"}|${row.code}`,
        code: row.code,
        description: row.description,
        areaCode,
        shopSubcontractorCode: relatedCode(
          subcontractorCodes,
          row.shop_subcontractor_id,
        ),
        fieldSubcontractorCode: relatedCode(
          subcontractorCodes,
          row.field_subcontractor_id,
        ),
        status: row.status,
      }
    }),
    serviceClasses: rows.project_service_classes.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      materialTypeCode:
        relatedCode(materialCodes, row.material_type_id) ??
        "missing-material-type",
      status: row.status,
    })),
    weldTypes: rows.project_weld_types.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      countsDiameterInch: row.counts_in_dia_inch,
      status: row.status,
    })),
    weldingProcedures: rows.project_welding_procedures.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      subcontractorCode:
        relatedCode(subcontractorCodes, row.subcontractor_id) ??
        "missing-subcontractor",
      materialTypeCode:
        relatedCode(materialCodes, row.material_type_id) ??
        "missing-material-type",
      process: row.process,
      revision: row.revision,
      minDiameterInches: row.diameter_from,
      maxDiameterInches: row.diameter_to,
      minThicknessMm: row.thickness_from,
      maxThicknessMm: row.thickness_to,
      approvedOn: row.approved_on,
      status: row.status,
    })),
    welders: rows.welder_qualifications.map((row) => ({
      key: row.welder_code,
      code: row.welder_code,
      description: manifestDescription(
        DEMO_MANIFEST.references.welders,
        row.welder_code,
      ),
      fullName: row.full_name,
      subcontractorCode:
        relatedCode(subcontractorCodes, row.subcontractor_id) ??
        "missing-subcontractor",
      expiresOn: row.expires_on,
      status: row.status,
    })),
    welderWpsQualifications: rows.welder_wps_qualifications.map((row) => {
      const welderCode =
        relatedCode(welderCodes, row.welder_qualification_id) ??
        "missing-welder"
      const wpsCode = relatedCode(wpsCodes, row.wps_id) ?? "missing-wps"
      const key = `${welderCode}|${wpsCode}`
      return {
        key,
        welderCode,
        wpsCode,
        status: manifestStatus(
          DEMO_MANIFEST.references.welderWpsQualifications,
          key,
        ),
      }
    }),
    ndeMatrixRules: rows.nde_matrix_rules.map((row) => {
      const serviceClassCode =
        relatedCode(serviceClassCodes, row.service_class_id) ??
        "missing-service-class"
      const weldTypeCode =
        relatedCode(weldTypeCodes, row.weld_type_id) ?? "missing-weld-type"
      const key = `${serviceClassCode}|${weldTypeCode}|${row.weld_location}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.ndeMatrixRules,
          key,
        ),
        serviceClassCode,
        weldTypeCode,
        locationType: row.weld_location,
        ...normalizedNdeCoverage(row, key),
        materialTraceability: row.material_traceability_required,
        pwhtRequired: row.pwht_required,
        status: row.status,
      }
    }),
    pipingMaterialRecords: rows.piping_material_records.map((row) => {
      const key = `${row.ident_code}|${row.trace_number}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.pipingMaterialRecords,
          key,
        ),
        identCode: row.ident_code,
        heatNumber: row.trace_number,
        mrrNumber: row.mrr_number,
        status: row.status,
      }
    }),
    thicknessFlangeRules: rows.project_thickness_flange_rules.map((row) => {
      const serviceClassCode =
        relatedCode(serviceClassCodes, row.service_class_id) ??
        "missing-service-class"
      const key = `${serviceClassCode}|${row.diameter_inch}in|${row.flange_rating}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.thicknessFlangeRules,
          key,
        ),
        serviceClassCode,
        diameterInches: row.diameter_inch,
        thicknessMm: row.thickness_mm,
        pressureClass: row.flange_rating,
        status: row.status,
      }
    }),
    reworkCodes: rows.project_rework_codes.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    jointCategories: rows.project_joint_categories.map((row) => ({
      key: row.category_code,
      code: row.category_code,
      description: manifestDescription(
        DEMO_MANIFEST.references.jointCategories,
        row.category_code,
      ),
      completionStage: row.timing,
      jointDefinition: row.joint_definition,
      reason: row.reason,
      coefficient: row.coefficient,
      status: row.status,
    })),
    teams: rows.project_teams.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      teamType: row.team_type,
      status: row.status,
    })),
    punchCodes: rows.project_punch_codes.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    systems: rows.project_systems.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    subsystems: rows.project_subsystems.map((row) => {
      const systemCode =
        relatedCode(systemCodes, row.system_id) ?? "missing-system"
      return {
        key: `${systemCode}|${row.code}`,
        code: row.code,
        description: row.description,
        systemCode,
        status: row.status,
      }
    }),
    lineServices: rows.project_line_services.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    pressureUnits: rows.project_pressure_units.map((row) => ({
      key: row.unit,
      code: row.unit,
      description: manifestDescription(
        DEMO_MANIFEST.references.pressureUnits,
        row.unit,
      ),
      status: manifestStatus(DEMO_MANIFEST.references.pressureUnits, row.unit),
    })),
    locationCategories: rows.project_location_categories.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    locations: rows.project_locations.map((row) => {
      const categoryCode =
        relatedCode(locationCategoryCodes, row.category_id) ??
        "missing-category"
      return {
        key: `${categoryCode}|${row.code}`,
        code: row.code,
        description: row.description,
        categoryCode,
        status: row.status,
      }
    }),
    unitTimeReferences: rows.project_unit_time_references.map((row) => ({
      key: row.activity,
      code: row.activity,
      description: manifestDescription(
        DEMO_MANIFEST.references.unitTimeReferences,
        row.activity,
      ),
      hours: row.project_ut,
      standard: row.standard_reference,
      status: row.status,
    })),
    progressWeights: [...progressByPhase].map(([phase, items]) => ({
      key: phase,
      phase,
      description: manifestDescription(
        DEMO_MANIFEST.references.progressWeights,
        phase,
      ),
      status:
        items.find((item) => item.status !== items[0]?.status)?.status ??
        items[0]?.status ??
        "unmapped",
      items: items.map((item) => {
        const key = `${phase}|${item.activity}`
        const expectedPhase = DEMO_MANIFEST.references.progressWeights.find(
          (candidate) => candidate.key === phase,
        )
        return {
          key,
          code: item.activity,
          description: manifestDescription(expectedPhase?.items ?? [], key),
          weight: item.weight,
          status: item.status,
        }
      }),
    })),
    assemblySettings: rows.project_assembly_settings.map((row) => ({
      key: "assembly",
      enabled: row.enabled,
      status: manifestStatus(
        DEMO_MANIFEST.references.assemblySettings,
        "assembly",
      ),
    })),
    spoolingMaterialTypes: rows.project_spooling_material_types.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    spoolingMaterialClasses: rows.project_spooling_material_classes.map(
      (row) => ({
        key: row.external_class_code,
        code: row.external_class_code,
        description: manifestDescription(
          DEMO_MANIFEST.references.spoolingMaterialClasses,
          row.external_class_code,
        ),
        materialTypeCode:
          relatedCode(spoolingMaterialTypeCodes, row.material_type_id) ??
          "missing-material-type",
        status: row.status,
      }),
    ),
    spoolingChecklistItems: rows.project_spooling_checklist_items.map(
      (row) => ({
        key: row.code,
        code: row.code,
        description: row.description,
        required: row.is_required,
        sortOrder: row.sort_order,
        status: row.status,
      }),
    ),
    ralCodes: rows.project_ral_codes.map((row) => {
      const lineServiceCode =
        relatedCode(lineServiceCodes, row.line_service_id) ??
        "missing-line-service"
      const key = `${lineServiceCode}|${row.ral_code}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.ralCodes,
          key,
        ),
        lineServiceCode,
        colorCode: row.color_code,
        ralCode: row.ral_code,
        status: row.status,
      }
    }),
    paintMatrixRules: rows.project_paint_matrix_rules.map((row) => {
      const lineServiceCode =
        relatedCode(lineServiceCodes, row.line_service_id) ??
        "missing-line-service"
      const ralCode = relatedCode(ralCodes, row.ral_code_id) ?? "missing-ral"
      const key = `${lineServiceCode}|${ralCode}`
      return {
        key,
        description: manifestDescription(
          DEMO_MANIFEST.references.paintMatrixRules,
          key,
        ),
        lineServiceCode,
        ralCode,
        blastingRequired: row.blasting_required,
        primerRequired: row.primer_required,
        intermediateCoats: row.intermediate_coat_count,
        finalCoats: row.final_coat_count,
        totalDftMicrons: row.required_final_dft_microns,
        status: row.status,
      }
    }),
    devices: rows.project_devices.map((row) => ({
      key: row.code,
      code: row.code,
      description: row.description,
      status: row.status,
    })),
    deviceAssignments: rows.project_device_users.map((row) => {
      const deviceCode = relatedCode(deviceCodes, row.device_id)
      const userId = userIdsByMembership.get(row.membership_id)
      const email = userId ? emailByUserId.get(userId) : null
      const userKey =
        (email ? userKeyByEmail.get(email) : undefined) ??
        "unmapped-user"
      return {
        key: `${deviceCode ?? "unassigned"}|${userKey}`,
        deviceCode,
        userKey,
        status: row.status,
      }
    }),
  }
}

function emptyObservedDemoReferences(): ObservedDemoReferences {
  return {
    systemMaterialTypes: [],
    filmQuantityRules: [],
    utCalculationRules: [],
    torquingRequirements: [],
    subcontractors: [],
    units: [],
    areaClassifications: [],
    pdsAreas: [],
    serviceClasses: [],
    weldTypes: [],
    weldingProcedures: [],
    welders: [],
    welderWpsQualifications: [],
    ndeMatrixRules: [],
    pipingMaterialRecords: [],
    thicknessFlangeRules: [],
    reworkCodes: [],
    jointCategories: [],
    teams: [],
    punchCodes: [],
    systems: [],
    subsystems: [],
    lineServices: [],
    pressureUnits: [],
    locationCategories: [],
    locations: [],
    unitTimeReferences: [],
    progressWeights: [],
    assemblySettings: [],
    spoolingMaterialTypes: [],
    spoolingMaterialClasses: [],
    spoolingChecklistItems: [],
    ralCodes: [],
    paintMatrixRules: [],
    devices: [],
    deviceAssignments: [],
  }
}

function emptyDemoReferenceKeys(): Readonly<
  Record<keyof DemoReferences, readonly string[]>
> {
  return {
    systemMaterialTypes: [],
    filmQuantityRules: [],
    utCalculationRules: [],
    torquingRequirements: [],
    subcontractors: [],
    units: [],
    areaClassifications: [],
    pdsAreas: [],
    serviceClasses: [],
    weldTypes: [],
    weldingProcedures: [],
    welders: [],
    welderWpsQualifications: [],
    ndeMatrixRules: [],
    pipingMaterialRecords: [],
    thicknessFlangeRules: [],
    reworkCodes: [],
    jointCategories: [],
    teams: [],
    punchCodes: [],
    systems: [],
    subsystems: [],
    lineServices: [],
    pressureUnits: [],
    locationCategories: [],
    locations: [],
    unitTimeReferences: [],
    progressWeights: [],
    assemblySettings: [],
    spoolingMaterialTypes: [],
    spoolingMaterialClasses: [],
    spoolingChecklistItems: [],
    ralCodes: [],
    paintMatrixRules: [],
    devices: [],
    deviceAssignments: [],
  }
}

function plannedReference<
  Insert,
  Manifest extends { readonly key: string; readonly status: DemoStatus },
>(manifest: Manifest, insert: Insert): PlannedReference<Insert, Manifest> {
  return {
    key: manifest.key,
    status: manifest.status,
    insert,
    manifest,
  }
}

function plannedDependentReference<
  Insert,
  Manifest extends { readonly key: string; readonly status: DemoStatus },
  Parents,
>(
  manifest: Manifest,
  insert: Insert,
  parents: Parents,
): PlannedDependentReference<Insert, Manifest, Parents> {
  return {
    ...plannedReference(manifest, insert),
    parents,
  }
}

function assertDemoProgressWeightTotals(): void {
  for (const phase of DEMO_MANIFEST.references.progressWeights) {
    const total = phase.items.reduce(
      (sum, item) => sum + item.weight,
      0,
    )
    if (total !== 100) {
      throw new Error(
        `Progress weights for ${phase.phase} must total exactly 100.`,
      )
    }
  }
}

function assignmentMembershipId(
  userKey: string,
  resolvedIds: DemoReferenceResolvedIds,
): string {
  if (userKey === "qc_editor") return resolvedIds.membershipIds.qcEditor
  if (userKey === "project_admin_a") {
    return resolvedIds.membershipIds.projectAdminA
  }
  throw new Error(`No prepared membership exists for ${userKey}.`)
}

type DemoSystemReferencePlan = Pick<
  DemoReferencePlan,
  | "system_reference_entries"
  | "system_film_quantity_rules"
  | "system_ut_calculation_rules"
>

function buildDemoSystemReferencePlan(): DemoSystemReferencePlan {
  assertDemoProgressWeightTotals()
  const references = DEMO_MANIFEST.references

  return {
    system_reference_entries: [
      ...references.systemMaterialTypes.map((row) =>
        plannedReference(row, {
          kind: "material_type" as const,
          code: row.code,
          description: row.description,
          status: row.status,
        }),
      ),
      ...references.torquingRequirements.map((row) =>
        plannedReference(row, {
          kind: "torquing_requirement" as const,
          code: row.code,
          description: row.description,
          status: row.status,
        }),
      ),
    ],
    system_film_quantity_rules: references.filmQuantityRules.map((row) =>
      plannedReference(row, {
        diameter_from_inch: row.minDiameterInches,
        diameter_to_inch: row.maxDiameterInches,
        thickness_from_mm: row.minThicknessMm,
        thickness_to_mm: row.maxThicknessMm,
        film_count: row.filmCount,
      }),
    ),
    system_ut_calculation_rules: references.utCalculationRules.map((row) =>
      plannedReference(row, {
        diameter_from_inch: row.minDiameterInches,
        diameter_to_inch: row.maxDiameterInches,
        flange_rating: row.pressureClass,
        coefficient_diameter: row.coefficientA,
        coefficient_rating: row.coefficientB,
      }),
    ),
  }
}

export function buildDemoReferencePlan(
  resolvedIds: DemoReferenceResolvedIds,
  preparedOn: Date,
  /**
   * Which project the referential rows are addressed to. Defaults to golden, so every existing
   * call site is unchanged; the showcase project passes its own id to get the same 36 families.
   * Membership scopes are deliberately NOT parameterized — they stay bound to the golden
   * project's memberships, because showcase members are unscoped on purpose.
   */
  targetProjectId: string = resolvedIds.goldenProjectId,
): DemoReferencePlan {
  assertDemoProgressWeightTotals()
  const references = DEMO_MANIFEST.references
  const projectId = targetProjectId
  const dates = resolveDemoDates(preparedOn)
  const scopedUser = DEMO_MANIFEST.users.find(
    (user) => user.key === "nde_subcontractor",
  )
  const scopedMembership = scopedUser?.memberships.find(
    (membership) =>
      membership.projectCode === DEMO_MANIFEST.projects.golden.activityCode,
  )
  if (!scopedMembership?.scopes) {
    throw new Error("The NDE demo membership must define exact scopes.")
  }
  const scopeManifest: PlannedMembershipScopeManifest = {
    userKey: "nde_subcontractor",
    projectCode: DEMO_MANIFEST.projects.golden.activityCode,
  }

  return {
    ...buildDemoSystemReferencePlan(),
    project_subcontractors: references.subcontractors.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_units: references.units.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_weld_types: references.weldTypes.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        counts_in_dia_inch: row.countsDiameterInch,
        status: row.status,
      }),
    ),
    project_line_services: references.lineServices.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_location_categories: references.locationCategories.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_systems: references.systems.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_teams: references.teams.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        team_type: row.teamType,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_punch_codes: references.punchCodes.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_rework_codes: references.reworkCodes.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_unit_time_references: references.unitTimeReferences.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        activity: row.code,
        project_ut: row.hours,
        standard_reference: row.standard,
        status: row.status,
      }),
    ),
    project_pressure_units: references.pressureUnits.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        unit: row.code,
      }),
    ),
    project_spooling_material_types: references.spoolingMaterialTypes.map(
      (row) =>
        plannedReference(row, {
          project_id: projectId,
          code: row.code,
          description: row.description,
          status: row.status,
        }),
    ),
    project_spooling_checklist_items: references.spoolingChecklistItems.map(
      (row) =>
        plannedReference(row, {
          project_id: projectId,
          code: row.code,
          description: row.description,
          is_required: row.required,
          sort_order: row.sortOrder,
          status: row.status,
        }),
    ),
    piping_material_records: references.pipingMaterialRecords.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        ident_code: row.identCode,
        trace_number: row.heatNumber,
        mrr_number: row.mrrNumber,
        status: row.status,
      }),
    ),
    project_assembly_settings: references.assemblySettings.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        enabled: row.enabled,
        default_subcontractor_id: null,
      }),
    ),
    project_devices: references.devices.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        code: row.code,
        description: row.description,
        status: row.status,
      }),
    ),
    project_area_classifications: references.areaClassifications.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          status: row.status,
        },
        { unitCode: row.unitCode },
      ),
    ),
    project_pds_areas: references.pdsAreas.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          status: row.status,
        },
        {
          areaCode: row.areaCode,
          shopSubcontractorCode: row.shopSubcontractorCode,
          fieldSubcontractorCode: row.fieldSubcontractorCode,
        },
      ),
    ),
    project_service_classes: references.serviceClasses.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          status: row.status,
        },
        { materialTypeCode: row.materialTypeCode },
      ),
    ),
    project_welding_procedures: references.weldingProcedures.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          process: row.process,
          revision: row.revision,
          diameter_from: row.minDiameterInches,
          diameter_to: row.maxDiameterInches,
          thickness_from: row.minThicknessMm,
          thickness_to: row.maxThicknessMm,
          approved_on: dates.approvedOn,
          status: row.status,
        },
        {
          subcontractorCode: row.subcontractorCode,
          materialTypeCode: row.materialTypeCode,
        },
      ),
    ),
    welder_qualifications: references.welders.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          welder_code: row.code,
          full_name: row.fullName,
          certificate_number: null,
          expires_on: dates.welderExpiresOn,
          status: row.status,
        },
        { subcontractorCode: row.subcontractorCode },
      ),
    ),
    welder_wps_qualifications: references.welderWpsQualifications.map((row) =>
      plannedDependentReference(
        row,
        {},
        {
          projectId,
          welderCode: row.welderCode,
          wpsCode: row.wpsCode,
        },
      ),
    ),
    project_thickness_flange_rules: references.thicknessFlangeRules.map(
      (row) =>
        plannedDependentReference(
          row,
          {
            project_id: projectId,
            diameter_inch: row.diameterInches,
            thickness_mm: row.thicknessMm,
            flange_rating: row.pressureClass,
            status: row.status,
          },
          { serviceClassCode: row.serviceClassCode },
        ),
    ),
    nde_matrix_rules: references.ndeMatrixRules.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          weld_location: row.locationType,
          rt_coverage: row.method === "RT" ? row.coveragePercent : 0,
          ut_coverage: 0,
          mt_coverage: 0,
          pt_coverage: row.method === "PT" ? row.coveragePercent : 0,
          pmi_coverage: 0,
          ht_coverage: 0,
          material_traceability_required: row.materialTraceability,
          pwht_required: row.pwhtRequired,
          pwht_thickness_threshold: null,
          status: row.status,
        },
        {
          serviceClassCode: row.serviceClassCode,
          weldTypeCode: row.weldTypeCode,
        },
      ),
    ),
    project_subsystems: references.subsystems.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          status: row.status,
        },
        { systemCode: row.systemCode },
      ),
    ),
    project_locations: references.locations.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          code: row.code,
          description: row.description,
          mapped_progress_columns: [],
          status: row.status,
        },
        { categoryCode: row.categoryCode },
      ),
    ),
    project_spooling_material_classes: references.spoolingMaterialClasses.map(
      (row) =>
        plannedDependentReference(
          row,
          {
            project_id: projectId,
            external_class_code: row.code,
            status: row.status,
          },
          { materialTypeCode: row.materialTypeCode },
        ),
    ),
    project_ral_codes: references.ralCodes.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          color_code: row.colorCode,
          ral_code: row.ralCode,
          status: row.status,
        },
        { lineServiceCode: row.lineServiceCode },
      ),
    ),
    project_paint_matrix_rules: references.paintMatrixRules.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          blasting_required: row.blastingRequired,
          primer_required: row.primerRequired,
          intermediate_coat_count: row.intermediateCoats,
          final_coat_count: row.finalCoats,
          required_final_dft_microns: row.totalDftMicrons,
          status: row.status,
        },
        {
          lineServiceCode: row.lineServiceCode,
          ralCode: row.ralCode,
        },
      ),
    ),
    project_joint_categories: references.jointCategories.map((row) =>
      plannedReference(row, {
        project_id: projectId,
        category_code: row.code,
        joint_definition: row.jointDefinition,
        timing: row.completionStage,
        reason: row.reason,
        coefficient: row.coefficient,
        status: row.status,
      }),
    ),
    project_device_users: references.deviceAssignments.map((row) =>
      plannedDependentReference(
        row,
        {
          project_id: projectId,
          membership_id: assignmentMembershipId(row.userKey, resolvedIds),
          status: row.status,
        },
        { deviceCode: row.deviceCode },
      ),
    ),
    project_progress_weights: references.progressWeights.flatMap((phase) =>
      phase.items.map((item) =>
        plannedReference(
          {
            key: item.key,
            status: phase.status,
            phase,
            item,
          },
          {
            project_id: projectId,
            phase: phase.phase,
            activity: item.code,
            weight: item.weight,
            status: phase.status,
          },
        ),
      ),
    ),
    membership_subcontractor_scopes:
      scopedMembership.scopes.subcontractorCodes.map((subcontractorCode) =>
        plannedDependentReference(
          { key: subcontractorCode, status: "active" as const, ...scopeManifest },
          { membership_id: resolvedIds.membershipIds.ndeSubcontractor },
          { subcontractorCode },
        ),
      ),
    membership_pds_area_scopes: scopedMembership.scopes.pdsAreaCodes.map(
      (pdsAreaCode) =>
        plannedDependentReference(
          { key: pdsAreaCode, status: "active" as const, ...scopeManifest },
          { membership_id: resolvedIds.membershipIds.ndeSubcontractor },
          { pdsAreaCode },
        ),
    ),
  }
}

function systemReferenceBatches(
  plan: DemoSystemReferencePlan,
): readonly DemoReferenceWriteBatch[] {
  return [
    {
      table: "system_reference_entries",
      rows: plan.system_reference_entries,
    },
    {
      table: "system_film_quantity_rules",
      rows: plan.system_film_quantity_rules,
    },
    {
      table: "system_ut_calculation_rules",
      rows: plan.system_ut_calculation_rules,
    },
  ]
}

function projectReferenceBatches(
  plan: DemoReferencePlan,
): readonly DemoReferenceWriteBatch[] {
  return [
    { table: "project_subcontractors", rows: plan.project_subcontractors },
    { table: "project_units", rows: plan.project_units },
    { table: "project_weld_types", rows: plan.project_weld_types },
    { table: "project_line_services", rows: plan.project_line_services },
    {
      table: "project_location_categories",
      rows: plan.project_location_categories,
    },
    { table: "project_systems", rows: plan.project_systems },
    { table: "project_teams", rows: plan.project_teams },
    { table: "project_punch_codes", rows: plan.project_punch_codes },
    { table: "project_rework_codes", rows: plan.project_rework_codes },
    {
      table: "project_unit_time_references",
      rows: plan.project_unit_time_references,
    },
    { table: "project_pressure_units", rows: plan.project_pressure_units },
    {
      table: "project_spooling_material_types",
      rows: plan.project_spooling_material_types,
    },
    {
      table: "project_spooling_checklist_items",
      rows: plan.project_spooling_checklist_items,
    },
    { table: "piping_material_records", rows: plan.piping_material_records },
    {
      table: "project_assembly_settings",
      rows: plan.project_assembly_settings,
    },
    { table: "project_devices", rows: plan.project_devices },
    {
      table: "project_area_classifications",
      rows: plan.project_area_classifications,
    },
    { table: "project_pds_areas", rows: plan.project_pds_areas },
    {
      table: "project_service_classes",
      rows: plan.project_service_classes,
    },
    {
      table: "project_welding_procedures",
      rows: plan.project_welding_procedures,
    },
    { table: "welder_qualifications", rows: plan.welder_qualifications },
    {
      table: "welder_wps_qualifications",
      rows: plan.welder_wps_qualifications,
    },
    {
      table: "project_thickness_flange_rules",
      rows: plan.project_thickness_flange_rules,
    },
    { table: "nde_matrix_rules", rows: plan.nde_matrix_rules },
    { table: "project_subsystems", rows: plan.project_subsystems },
    { table: "project_locations", rows: plan.project_locations },
    {
      table: "project_spooling_material_classes",
      rows: plan.project_spooling_material_classes,
    },
    { table: "project_ral_codes", rows: plan.project_ral_codes },
    {
      table: "project_paint_matrix_rules",
      rows: plan.project_paint_matrix_rules,
    },
    {
      table: "project_joint_categories",
      rows: plan.project_joint_categories,
    },
    { table: "project_device_users", rows: plan.project_device_users },
    {
      table: "project_progress_weights",
      rows: plan.project_progress_weights,
    },
  ]
}

export interface DemoAuthUserAttributes {
  readonly password: string
  readonly emailConfirm: true
  readonly banDuration: "none"
  readonly userMetadata: {
    readonly full_name: string
  }
}

export interface DemoAuthUserRecord {
  readonly id: string
  readonly email: string | null
  readonly bannedUntil: string | null
}

export interface AuthAdminListGateway {
  listUsers(parameters: {
    readonly page: number
    readonly perPage: number
  }): Promise<{
    readonly data: {
      readonly users: readonly {
        readonly id: string
        readonly email?: string
        readonly banned_until?: string | null
      }[]
      readonly nextPage: number | null
    }
    readonly error: { readonly message?: string } | null
  }>
}

export async function listAllAuthUsers(
  gateway: AuthAdminListGateway,
): Promise<readonly DemoAuthUserRecord[]> {
  const users: DemoAuthUserRecord[] = []
  const visitedPages = new Set<number>()
  let page: number | null = 1

  while (page !== null) {
    if (visitedPages.has(page)) {
      throw new Error(`Listing auth users repeated page ${page}.`)
    }
    visitedPages.add(page)
    let result: Awaited<ReturnType<AuthAdminListGateway["listUsers"]>>
    try {
      result = await gateway.listUsers({ page, perPage: 1000 })
    } catch {
      throw new Error(`Listing auth users page ${page} failed.`)
    }
    if (result.error) {
      throw new Error(`Listing auth users page ${page} failed.`)
    }
    users.push(
      ...result.data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        bannedUntil: user.banned_until ?? null,
      })),
    )
    page = result.data.nextPage
  }

  return users
}

export interface DemoProfileRecord {
  readonly id: string
  readonly email: string | null
  readonly fullName: string
  readonly isPlatformAdmin: boolean
}

export interface DemoProfileWrite {
  readonly email: string
  readonly fullName: string
  readonly isPlatformAdmin: boolean
}

export interface DemoProjectWrite {
  readonly activityCode: string
  readonly title: string
  readonly ownerName: string
  readonly contractorName: string
  readonly contractNumber: string
  readonly transitDays: number
  readonly status: DemoStatus
  readonly createdBy: string
}

export interface DemoProjectRecord {
  readonly id: string
  readonly activityCode: string
  readonly title: string
  readonly ownerName: string
  readonly contractorName: string
  readonly contractNumber: string | null
  readonly transitDays: number
  readonly status: string
  readonly createdBy: string
  readonly createdAt: string
}

export interface DatabaseObservedProjectRow {
  readonly id: string
  readonly activity_code: string
  readonly title: string
  readonly owner_name: string
  readonly contractor_name: string
  readonly contract_number: string | null
  readonly maximum_transit_time_days: number
  readonly status: string
  readonly created_by: string
  readonly created_at: string
}

export function observedProjectRecordFromDatabase(
  project: DatabaseObservedProjectRow,
): DemoProjectRecord {
  return {
    id: project.id,
    activityCode: project.activity_code,
    title: project.title,
    ownerName: project.owner_name,
    contractorName: project.contractor_name,
    contractNumber: project.contract_number,
    transitDays: project.maximum_transit_time_days,
    status: project.status,
    createdBy: project.created_by,
    createdAt: project.created_at,
  }
}

export interface DemoMembershipWrite {
  readonly projectId: string
  readonly userId: string
  readonly accessRoleCode: DemoProjectRole
  readonly legacyRole: LegacyRole
  readonly isActive: true
}

export interface MembershipRecord {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly accessRoleCode: string
  readonly legacyRole: LegacyRole
  readonly isActive: boolean
}

export interface FunctionalRoleRecord {
  readonly membershipId: string
  readonly roleCode: string
}

export interface SubcontractorScopeRecord {
  readonly membershipId: string
  readonly code: string
}

export interface PdsAreaScopeRecord {
  readonly membershipId: string
  readonly code: string
}

export type EmptyTableCountStrategy =
  | {
      readonly kind: "direct"
      readonly table: DirectEmptyTable
    }
  | {
      readonly kind: "child"
      readonly table: "pwht_results"
      readonly parentTable: "pwht_requirements"
      readonly childForeignKey: "pwht_requirement_id"
    }

export const EMPTY_TABLE_STRATEGIES = {
  import_jobs: { kind: "direct", table: "import_jobs" },
  isometrics: { kind: "direct", table: "isometrics" },
  construction_progress_events: {
    kind: "direct",
    table: "construction_progress_events",
  },
  material_check_records: {
    kind: "direct",
    table: "material_check_records",
  },
  weld_progress_records: {
    kind: "direct",
    table: "weld_progress_records",
  },
  pwht_results: {
    kind: "child",
    table: "pwht_results",
    parentTable: "pwht_requirements",
    childForeignKey: "pwht_requirement_id",
  },
  paint_progress_records: {
    kind: "direct",
    table: "paint_progress_records",
  },
  quality_release_records: {
    kind: "direct",
    table: "quality_release_records",
  },
  laydown_records: { kind: "direct", table: "laydown_records" },
  support_progress_records: {
    kind: "direct",
    table: "support_progress_records",
  },
  nde_batches: { kind: "direct", table: "nde_batches" },
  nde_results: { kind: "direct", table: "nde_results" },
  spool_location_events: {
    kind: "direct",
    table: "spool_location_events",
  },
  flange_progress_records: {
    kind: "direct",
    table: "flange_progress_records",
  },
  flange_reinstatement_records: {
    kind: "direct",
    table: "flange_reinstatement_records",
  },
  test_packs: { kind: "direct", table: "test_packs" },
  line_check_results: {
    kind: "direct",
    table: "line_check_results",
  },
  punch_items: { kind: "direct", table: "punch_items" },
  blinding_records: { kind: "direct", table: "blinding_records" },
  pressure_test_requests: {
    kind: "direct",
    table: "pressure_test_requests",
  },
  pressure_test_stage_events: {
    kind: "direct",
    table: "pressure_test_stage_events",
  },
} as const satisfies Record<EmptyTable, EmptyTableCountStrategy>

export interface DemoAdminGateway {
  listAuthUsers(): Promise<readonly DemoAuthUserRecord[]>
  updateAuthUser(
    userId: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<void>
  createAuthUser(
    email: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<{ readonly id: string | null }>
  reconcileProfile(
    userId: string,
    profile: DemoProfileWrite,
  ): Promise<{ readonly ids: readonly string[] }>
  listProjects(): Promise<readonly DemoProjectRecord[]>
  createProject(
    project: DemoProjectWrite,
  ): Promise<{ readonly id: string | null }>
  updateProject(
    projectId: string,
    project: DemoProjectWrite,
  ): Promise<{ readonly ids: readonly string[] }>
  upsertMembership(
    membership: DemoMembershipWrite,
  ): Promise<{ readonly id: string | null }>
  replaceFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void>
  readProfiles(): Promise<readonly DemoProfileRecord[]>
  readMemberships(): Promise<readonly MembershipRecord[]>
  readFunctionalRoles(): Promise<readonly FunctionalRoleRecord[]>
  readSubcontractorScopes(): Promise<readonly SubcontractorScopeRecord[]>
  readPdsAreaScopes(): Promise<readonly PdsAreaScopeRecord[]>
  countDirectProjectRows(
    table: DirectEmptyTable,
    projectId: string,
  ): Promise<number>
  countChildProjectRows(
    strategy: Extract<
      EmptyTableCountStrategy,
      { readonly kind: "child" }
    >,
    projectId: string,
  ): Promise<number>
}

function isDemoReferenceGateway(
  gateway: DemoAdminGateway,
): gateway is DemoAdminGateway & DemoReferenceGateway {
  return (
    "reconcileReferenceBatch" in gateway &&
    typeof gateway.reconcileReferenceBatch === "function" &&
    "replaceMembershipScopes" in gateway &&
    typeof gateway.replaceMembershipScopes === "function" &&
    "readReferences" in gateway &&
    typeof gateway.readReferences === "function" &&
    "readSetupReadiness" in gateway &&
    typeof gateway.readSetupReadiness === "function" &&
    "readReferenceKeys" in gateway &&
    typeof gateway.readReferenceKeys === "function"
  )
}

export interface DemoClientOptions {
  readonly auth: {
    readonly autoRefreshToken: false
    readonly persistSession: false
  }
}

export interface FunctionalRoleReconciliationGateway {
  upsertFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void>
  listFunctionalRoles(membershipId: string): Promise<readonly string[]>
  deleteFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[] | null,
  ): Promise<void>
}

export async function reconcileMembershipFunctionalRoles(
  gateway: FunctionalRoleReconciliationGateway,
  membershipId: string,
  desiredRoleCodes: readonly string[],
): Promise<void> {
  const desired = [...new Set(desiredRoleCodes)]
  if (desired.length === 0) {
    await gateway.deleteFunctionalRoles(membershipId, null)
    return
  }

  await gateway.upsertFunctionalRoles(membershipId, desired)
  const current = await gateway.listFunctionalRoles(membershipId)
  const desiredSet = new Set(desired)
  const obsolete = current.filter((roleCode) => !desiredSet.has(roleCode))
  if (obsolete.length > 0) {
    await gateway.deleteFunctionalRoles(membershipId, obsolete)
  }
}

export type DemoAdminGatewayFactory = (
  url: string,
  serviceRoleKey: string,
  options: DemoClientOptions,
) => DemoAdminGateway

const CLIENT_OPTIONS: DemoClientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
}
const PROJECT_DEFINITIONS = [
  DEMO_MANIFEST.projects.golden,
  DEMO_MANIFEST.projects.isolation,
  DEMO_MANIFEST.projects.showcase,
] as const

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export type DemoSpoolgenTexts = Partial<
  Record<SpoolgenFileRole, string>
>

function sortedSpoolgenRows<Row extends { readonly key: string }>(
  rows: readonly Row[],
): Row[] {
  return [...rows].sort((left, right) =>
    compareText(left.key, right.key),
  )
}

export function buildObservedDemoSpoolgenSnapshot(
  texts: DemoSpoolgenTexts,
): DemoSpoolgenSnapshot {
  const presentRoles = SPOOLGEN_FILE_ROLES.filter(
    (role) => texts[role] !== undefined,
  )
  const submission = buildSpoolgenSubmission({
    weld: texts.weld ?? "",
    trace: texts.trace ?? "",
    bolt: texts.bolt ?? "",
    supp: texts.supp ?? "",
  })
  const rowsFor = (entityType: StagingEntityKind) =>
    submission.rows.filter(
      (row) => row.normalizedValues.entity_type === entityType,
    )
  const revisionByIso = new Map(
    rowsFor("isometric").map((row) => [
      row.normalizedValues.iso_number,
      row.normalizedValues.revision_number,
    ]),
  )
  const revisionFor = (isoNumber: string): string =>
    revisionByIso.get(isoNumber) ?? ""
  const hashFor = (role: SpoolgenFileRole): string | null => {
    const text = texts[role]
    return text === undefined
      ? null
      : createHash("sha256").update(text, "utf8").digest("hex")
  }

  return {
    roles: presentRoles,
    hashes: {
      weld: hashFor("weld"),
      trace: hashFor("trace"),
      bolt: hashFor("bolt"),
      supp: hashFor("supp"),
    },
    expectedStagingRows: submission.rows.length,
    expectedCounts: {
      isometric: rowsFor("isometric").length,
      spool: rowsFor("spool").length,
      weld_joint: rowsFor("weld_joint").length,
      support: rowsFor("support").length,
      flange_joint: rowsFor("flange_joint").length,
      material: rowsFor("material").length,
    },
    entities: {
      isometrics: sortedSpoolgenRows(
        rowsFor("isometric").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${row.normalizedValues.revision_number}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: row.normalizedValues.revision_number,
          pdsAreaCode: row.normalizedValues.pds_area,
          serviceClassCode: row.normalizedValues.service_class,
          lineNumber: row.normalizedValues.line_number,
          sheetNumber: row.normalizedValues.sheet_number,
        })),
      ),
      spools: sortedSpoolgenRows(
        rowsFor("spool").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: revisionFor(row.normalizedValues.iso_number),
          spoolNumber: row.normalizedValues.spool_number,
          sequenceNumber: row.normalizedValues.sequence_number,
          spoolWeightKg: row.normalizedValues.weight_kg,
          materialClass: row.normalizedValues.material_class,
        })),
      ),
      weldJoints: sortedSpoolgenRows(
        rowsFor("weld_joint").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.weld_number}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: revisionFor(row.normalizedValues.iso_number),
          spoolNumber: row.normalizedValues.spool_number,
          weldNumber: row.normalizedValues.weld_number,
          weldTypeCode: row.normalizedValues.weld_type,
          locationType: row.normalizedValues.weld_location,
          serviceClassCode: row.normalizedValues.service_class,
          diameterInches: row.normalizedValues.diameter_inch,
          thicknessMm: row.normalizedValues.thickness_mm,
        })),
      ),
      supports: sortedSpoolgenRows(
        rowsFor("support").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.support_number}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: revisionFor(row.normalizedValues.iso_number),
          spoolNumber: row.normalizedValues.spool_number,
          supportNumber: row.normalizedValues.support_number,
          supportType: row.normalizedValues.support_type,
          quantity: row.normalizedValues.quantity,
        })),
      ),
      flangeJoints: sortedSpoolgenRows(
        rowsFor("flange_joint").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.flange_number}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: revisionFor(row.normalizedValues.iso_number),
          spoolNumber: row.normalizedValues.spool_number,
          flangeNumber: row.normalizedValues.flange_number,
          pressureClass: row.normalizedValues.flange_rating,
          diameterInches: row.normalizedValues.diameter_inch,
          boltSize: row.normalizedValues.bolt_size,
          boltQuantity: row.normalizedValues.bolt_quantity,
          jointType: row.normalizedValues.joint_type,
        })),
      ),
      materials: sortedSpoolgenRows(
        rowsFor("material").map((row) => ({
          key: `${row.normalizedValues.iso_number}|${revisionFor(row.normalizedValues.iso_number)}|${row.normalizedValues.spool_number}|${row.normalizedValues.ident_code}`,
          isometricNumber: row.normalizedValues.iso_number,
          revision: revisionFor(row.normalizedValues.iso_number),
          spoolNumber: row.normalizedValues.spool_number,
          identCode: row.normalizedValues.ident_code,
          description: row.normalizedValues.description,
          quantity: row.normalizedValues.quantity,
          unit: row.normalizedValues.unit,
          traceNumber: row.normalizedValues.trace_number,
        })),
      ),
    },
  }
}

export type DemoSpoolgenPackageReader = () => Promise<DemoSpoolgenSnapshot>

type DemoSpoolgenRoleReader = (
  role: SpoolgenFileRole,
) => Promise<string | null>

function errorCode(error: unknown): string | null {
  if (!(error instanceof Error) || !("code" in error)) return null
  return typeof error.code === "string" ? error.code : null
}

async function readDemoSpoolgenRole(
  role: SpoolgenFileRole,
): Promise<string | null> {
  try {
    return await readFile(
      new URL(`../../demo-data/spoolgen/${role}.txt`, import.meta.url),
      "utf8",
    )
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") return null
    throw new Error(`Reading demo SpoolGen role ${role} failed.`)
  }
}

export async function readObservedDemoSpoolgenPackage(
  readRole: DemoSpoolgenRoleReader = readDemoSpoolgenRole,
): Promise<DemoSpoolgenSnapshot> {
  const texts: DemoSpoolgenTexts = {}
  await Promise.all(
    SPOOLGEN_FILE_ROLES.map(async (role) => {
      const text = await readRole(role)
      if (text !== null) texts[role] = text
    }),
  )
  return buildObservedDemoSpoolgenSnapshot(texts)
}

function safeFailure(stage: string, subject: string): Error {
  return new Error(`${stage} failed for ${subject}.`)
}

function utcCalendarDate(value: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

async function safely<T>(
  stage: string,
  subject: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch {
    throw safeFailure(stage, subject)
  }
}

function projectWrite(
  project: DemoProject,
  createdBy: string,
): DemoProjectWrite {
  return {
    activityCode: project.activityCode,
    title: project.title,
    ownerName: project.ownerName,
    contractorName: project.contractorName,
    contractNumber: project.contractNumber,
    transitDays: project.transitDays,
    status: project.status,
    createdBy,
  }
}

function legacyRoleFor(membership: DemoMembership): LegacyRole {
  if (membership.role === "project_admin") return "system_admin"
  if (membership.role === "subcontractor") return "subcontractor"
  if (membership.role === "project_reader") return "project_manager"
  if (membership.functionalRoles.includes("qc_engineer")) {
    return "qc_engineer"
  }
  if (membership.functionalRoles.includes("nde_inspector")) {
    return "nde_inspector"
  }
  if (membership.functionalRoles.includes("spooling_team")) {
    return "spooling_team"
  }
  return "project_manager"
}

function statusFromAuth(user: DemoAuthUserRecord): DemoStatus {
  if (!user.bannedUntil) return "active"
  const bannedUntil = Date.parse(user.bannedUntil)
  if (Number.isNaN(bannedUntil)) return "inactive"
  return bannedUntil > Date.now() ? "inactive" : "active"
}

function userMemberships(
  userId: string,
  memberships: readonly MembershipRecord[],
  projectsById: ReadonlyMap<string, DemoProjectRecord>,
  functionalRoles: readonly FunctionalRoleRecord[],
  subcontractorScopes: readonly SubcontractorScopeRecord[],
  pdsAreaScopes: readonly PdsAreaScopeRecord[],
): ObservedDemoMembership[] {
  return memberships
    .filter((membership) => membership.userId === userId)
    .map((membership) => {
      const project = projectsById.get(membership.projectId)
      const roleCodes = functionalRoles
        .filter((role) => role.membershipId === membership.id)
        .map((role) => role.roleCode)
        .sort(compareText)
      const subcontractorCodes = subcontractorScopes
        .filter((scope) => scope.membershipId === membership.id)
        .map((scope) => scope.code)
        .sort(compareText)
      const pdsAreaCodes = pdsAreaScopes
        .filter((scope) => scope.membershipId === membership.id)
        .map((scope) => scope.code)
        .sort(compareText)
      const hasScopes =
        subcontractorCodes.length > 0 || pdsAreaCodes.length > 0

      return {
        projectCode:
          project?.activityCode ??
          `missing-project:${membership.projectId}`,
        role: membership.accessRoleCode,
        source:
          project?.createdBy === userId
            ? ("creator" as const)
            : ("direct" as const),
        isActive: membership.isActive,
        functionalRoles: roleCodes,
        scopes: hasScopes
          ? { subcontractorCodes, pdsAreaCodes }
          : undefined,
      }
    })
    .sort((left, right) => compareText(left.projectCode, right.projectCode))
}

// The three golden-project (TRACK01-A) manifest users whose ids and memberships
// `resolveShowcasePrerequisiteIds` must resolve, because `referenceResolvedIds()` structurally
// requires them even for a flow that never writes to TRACK01-A.
const GOLDEN_REFERENCE_MEMBERSHIP_KEYS = [
  "project_admin_a",
  "qc_editor",
  "nde_subcontractor",
] as const

export class SupabaseDemoStandCore {
  private readonly userIds = new Map<string, string>()
  private readonly projectIds = new Map<string, string>()
  private readonly membershipIds = new Map<string, string>()
  private preparedOn: string | null = null

  constructor(
    private readonly gateway: DemoAdminGateway,
    private readonly spoolgenPackageReader: DemoSpoolgenPackageReader =
      readObservedDemoSpoolgenPackage,
  ) {}

  private referenceGateway(): DemoReferenceGateway {
    if (!isDemoReferenceGateway(this.gateway)) {
      throw new Error("The demo reference gateway is unavailable.")
    }
    return this.gateway
  }

  private referenceResolvedIds(): DemoReferenceResolvedIds {
    const goldenProjectId = this.projectIds.get(
      DEMO_MANIFEST.projects.golden.activityCode,
    )
    const projectAdminA = this.membershipIds.get(
      `${DEMO_MANIFEST.projects.golden.activityCode}/project_admin_a`,
    )
    const qcEditor = this.membershipIds.get(
      `${DEMO_MANIFEST.projects.golden.activityCode}/qc_editor`,
    )
    const ndeSubcontractor = this.membershipIds.get(
      `${DEMO_MANIFEST.projects.golden.activityCode}/nde_subcontractor`,
    )
    if (!goldenProjectId || !projectAdminA || !qcEditor || !ndeSubcontractor) {
      throw new Error(
        "Demo projects and access must be prepared before project references.",
      )
    }
    return {
      goldenProjectId,
      membershipIds: { projectAdminA, qcEditor, ndeSubcontractor },
    }
  }

  private async reconcileReferenceBatches(
    batches: readonly DemoReferenceWriteBatch[],
  ): Promise<void> {
    const gateway = this.referenceGateway()
    for (const batch of batches) {
      await safely("Preparing demo reference table", batch.table, () =>
        gateway.reconcileReferenceBatch(batch),
      )
    }
  }

  async prepareUsers(password: string): Promise<void> {
    if (password.trim() === "") {
      throw new Error("Demo user preparation requires a nonblank password.")
    }

    const existingUsers = await safely(
      "Preparing demo users",
      "auth user list",
      () => this.gateway.listAuthUsers(),
    )

    for (const user of DEMO_MANIFEST.users) {
      const attributes: DemoAuthUserAttributes = {
        password,
        emailConfirm: true,
        banDuration: "none",
        userMetadata: { full_name: user.fullName },
      }
      const existing = existingUsers.find(
        (candidate) => candidate.email === user.email,
      )
      let userId: string | null

      if (existing) {
        await safely("Preparing demo user", user.email, () =>
          this.gateway.updateAuthUser(existing.id, attributes),
        )
        userId = existing.id
      } else {
        const created = await safely("Preparing demo user", user.email, () =>
          this.gateway.createAuthUser(user.email, attributes),
        )
        userId = created.id
      }

      if (!userId) {
        throw safeFailure("Preparing demo user", user.email)
      }
      this.userIds.set(user.key, userId)
      const reconciledProfile = await safely(
        "Preparing demo profile",
        user.email,
        () =>
        this.gateway.reconcileProfile(userId, {
          email: user.email,
          fullName: user.fullName,
          isPlatformAdmin: user.platformAdmin,
        }),
      )
      if (
        reconciledProfile.ids.length !== 1 ||
        reconciledProfile.ids[0] !== userId
      ) {
        throw safeFailure("Preparing demo profile", user.email)
      }
    }
  }

  async prepareProjects(): Promise<void> {
    const creatorId = this.userIds.get("platform_admin")
    if (!creatorId) {
      throw new Error(
        "platform_admin must be resolved by prepareUsers before prepareProjects.",
      )
    }
    const existingProjects = await safely(
      "Preparing demo projects",
      "project list",
      () => this.gateway.listProjects(),
    )

    for (const definition of PROJECT_DEFINITIONS) {
      const projectId = await this.writeProjectRow(
        definition,
        creatorId,
        existingProjects,
      )
      this.projectIds.set(definition.activityCode, projectId)
    }
  }

  // Shared create-or-update body for a single project row: finds any existing row by
  // activityCode, writes it via createProject/updateProject, and validates the write actually
  // touched that one row. Returns the resolved project id. Callers own the `listProjects()` fetch
  // (so they can batch it once per manifest sweep) and the `this.projectIds.set(...)` afterward.
  private async writeProjectRow(
    definition: DemoProject,
    creatorId: string,
    existingProjects: readonly DemoProjectRecord[],
  ): Promise<string> {
    const existing = existingProjects.find(
      (project) => project.activityCode === definition.activityCode,
    )
    const payload = projectWrite(definition, creatorId)
    let projectId: string | null

    if (existing) {
      const updated = await safely(
        "Preparing demo project",
        definition.activityCode,
        () => this.gateway.updateProject(existing.id, payload),
      )
      if (updated.ids.length !== 1 || updated.ids[0] !== existing.id) {
        throw safeFailure("Preparing demo project", definition.activityCode)
      }
      projectId = existing.id
    } else {
      const created = await safely(
        "Preparing demo project",
        definition.activityCode,
        () => this.gateway.createProject(payload),
      )
      projectId = created.id
    }

    if (!projectId) {
      throw safeFailure("Preparing demo project", definition.activityCode)
    }
    return projectId
  }

  async prepareAccess(): Promise<void> {
    for (const user of DEMO_MANIFEST.users) {
      const userId = this.userIds.get(user.key)
      if (!userId) {
        throw new Error(
          `${user.key} must be resolved by prepareUsers before prepareAccess.`,
        )
      }

      for (const membership of user.memberships) {
        const projectId = this.projectIds.get(membership.projectCode)
        if (!projectId) {
          throw new Error(
            `${membership.projectCode} must be resolved by prepareProjects before prepareAccess.`,
          )
        }
        const subject = `${membership.projectCode}/${user.key}`
        const created = await safely("Preparing demo access", subject, () =>
          this.gateway.upsertMembership({
            projectId,
            userId,
            accessRoleCode: membership.role,
            legacyRole: legacyRoleFor(membership),
            isActive: true,
          }),
        )
        if (!created.id) {
          throw safeFailure("Preparing demo access", subject)
        }
        this.membershipIds.set(subject, created.id)
        await safely("Preparing demo functional roles", subject, () =>
          this.gateway.replaceFunctionalRoles(
            created.id as string,
            membership.functionalRoles,
          ),
        )
      }
    }
  }

  async prepareSystemReferences(): Promise<void> {
    const plan = buildDemoSystemReferencePlan()
    await this.reconcileReferenceBatches(systemReferenceBatches(plan))
  }

  async prepareProjectReferences(preparedOn: Date): Promise<void> {
    const plan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
    )
    await this.reconcileReferenceBatches(projectReferenceBatches(plan))
    await safely(
      "Preparing demo membership scopes",
      "NDE-A/PDS-100",
      () =>
        this.referenceGateway().replaceMembershipScopes({
          subcontractorScopes: plan.membership_subcontractor_scopes,
          pdsAreaScopes: plan.membership_pds_area_scopes,
        }),
    )

    // The showcase project gets the same 36 referential families, addressed to its own id. The
    // SpoolGen import and every downstream command validate against them, so without this the
    // seeded dataset cannot be built. No scope replacement: see buildDemoReferencePlan.
    const showcaseProjectId = this.projectIds.get(SHOWCASE_PROJECT_CODE)
    if (!showcaseProjectId) {
      throw new Error(
        `${SHOWCASE_PROJECT_CODE} was not created before its referentials.`,
      )
    }
    const showcasePlan = buildDemoReferencePlan(
      this.referenceResolvedIds(),
      preparedOn,
      showcaseProjectId,
    )
    await this.reconcileReferenceBatches(
      projectReferenceBatches({
        ...showcasePlan,
        // `project_device_users` is the one family that links a project-scoped row to a
        // membership id, and the resolved ids are golden's memberships — a SHOWCASE-1 device
        // cannot be assigned to a TRACK01-A membership. PDA device assignment is a tracking
        // concern the showcase dataset does not cover, so the family is dropped rather than
        // re-resolved against showcase memberships.
        project_device_users: [],
        // An empty batch is not a no-op: the reconciler derives the target project from the
        // rows it is given, so it must never see one.
      }).filter((batch) => batch.rows.length > 0),
    )
  }

  // Resolves the ids of every manifest user `resolveShowcasePrerequisiteIds` needs: the
  // golden-project reference memberships plus any user with a SHOWCASE-1 membership.
  private async resolveShowcaseUserIds(): Promise<void> {
    const existingUsers = await safely(
      "Resolving demo users",
      "auth user list",
      () => this.gateway.listAuthUsers(),
    )
    const requiredUserKeys = new Set<string>(GOLDEN_REFERENCE_MEMBERSHIP_KEYS)
    for (const user of DEMO_MANIFEST.users) {
      if (
        user.memberships.some(
          (membership) => membership.projectCode === SHOWCASE_PROJECT_CODE,
        )
      ) {
        requiredUserKeys.add(user.key)
      }
    }

    for (const key of requiredUserKeys) {
      const user = DEMO_MANIFEST.users.find(
        (candidate) => candidate.key === key,
      )
      if (!user) throw new Error(`${key} is not a known demo user.`)
      const existing = existingUsers.find(
        (candidate) => candidate.email === user.email,
      )
      if (!existing) {
        throw new Error(
          `${user.email} must already exist on this stand before SHOWCASE-1 can be prepared.`,
        )
      }
      this.userIds.set(user.key, existing.id)
    }
  }

  /**
   * Read-only. Populates the ids `prepareShowcaseProject`, `prepareShowcaseAccess`, and
   * `prepareShowcaseProjectReferences` need, without ever calling a create/update/upsert
   * gateway method — so this is safe to call against a stand that already holds curated
   * TRACK01-A/B data. Never writes a TRACK01-A/B row.
   */
  async resolveShowcasePrerequisiteIds(): Promise<void> {
    await this.resolveShowcaseUserIds()

    const existingProjects = await safely(
      "Resolving demo projects",
      "project list",
      () => this.gateway.listProjects(),
    )
    const golden = existingProjects.find(
      (project) =>
        project.activityCode === DEMO_MANIFEST.projects.golden.activityCode,
    )
    if (!golden) {
      throw new Error(
        `${DEMO_MANIFEST.projects.golden.activityCode} must already exist before SHOWCASE-1 can be prepared.`,
      )
    }
    this.projectIds.set(golden.activityCode, golden.id)

    const memberships = await safely(
      "Resolving demo memberships",
      "membership list",
      () => this.gateway.readMemberships(),
    )
    for (const key of GOLDEN_REFERENCE_MEMBERSHIP_KEYS) {
      const userId = this.userIds.get(key)
      if (!userId) {
        throw new Error(
          `${key} must be resolved before its TRACK01-A membership.`,
        )
      }
      const membership = memberships.find(
        (candidate) =>
          candidate.projectId === golden.id && candidate.userId === userId,
      )
      if (!membership) {
        throw new Error(
          `${golden.activityCode}/${key} must already exist before SHOWCASE-1 can be prepared.`,
        )
      }
      this.membershipIds.set(`${golden.activityCode}/${key}`, membership.id)
    }
  }

  async prepareShowcaseProject(): Promise<void> {
    const creatorId = this.userIds.get("platform_admin")
    if (!creatorId) {
      throw new Error(
        "platform_admin must be resolved by resolveShowcasePrerequisiteIds before prepareShowcaseProject.",
      )
    }
    const definition = DEMO_MANIFEST.projects.showcase
    const existingProjects = await safely(
      "Preparing demo projects",
      "project list",
      () => this.gateway.listProjects(),
    )
    const projectId = await this.writeProjectRow(
      definition,
      creatorId,
      existingProjects,
    )
    this.projectIds.set(definition.activityCode, projectId)
  }

  async readSnapshot(): Promise<DemoStandSnapshot> {
    const core = await this.readCoreSnapshot()
    const goldenProjectId = this.projectIds.get(
      DEMO_MANIFEST.projects.golden.activityCode,
    )
    const isolationProjectId = this.projectIds.get(
      DEMO_MANIFEST.projects.isolation.activityCode,
    )
    const gateway = this.referenceGateway()
    const references = goldenProjectId
      ? await safely(
          "Reading demo snapshot",
          "TRACK01-A references",
          () => gateway.readReferences(goldenProjectId),
        )
      : emptyObservedDemoReferences()
    const observedReadiness = goldenProjectId
      ? await safely(
          "Reading demo snapshot",
          "TRACK01-A readiness",
          () => gateway.readSetupReadiness(goldenProjectId),
        )
      : {
          ready: false,
          missing: [
            `project:${DEMO_MANIFEST.projects.golden.activityCode}`,
          ],
        }
    const isolationReferenceKeys = isolationProjectId
      ? await safely(
          "Reading demo snapshot",
          "TRACK01-B references",
          () => gateway.readReferenceKeys(isolationProjectId),
        )
      : emptyDemoReferenceKeys()
    const spoolgen = await safely(
      "Reading demo snapshot",
      "SpoolGen package",
      this.spoolgenPackageReader,
    )

    return {
      ...core,
      preparedOn: this.preparedOn,
      references,
      readiness: {
        projectCode: DEMO_MANIFEST.projects.golden.activityCode,
        ready: observedReadiness.ready,
        missing: observedReadiness.missing,
      },
      isolationReferenceKeys,
      spoolgen,
    }
  }

  async readCoreSnapshot(): Promise<
    Pick<DemoStandSnapshot, "projects" | "users" | "emptyCounts">
  > {
    const authUsers = await safely(
      "Reading demo snapshot",
      "auth users",
      () => this.gateway.listAuthUsers(),
    )
    const profiles = await safely(
      "Reading demo snapshot",
      "profiles",
      () => this.gateway.readProfiles(),
    )
    const projectRecords = await safely(
      "Reading demo snapshot",
      "projects",
      () => this.gateway.listProjects(),
    )
    const memberships = await safely(
      "Reading demo snapshot",
      "project_memberships",
      () => this.gateway.readMemberships(),
    )
    const functionalRoles = await safely(
      "Reading demo snapshot",
      "project_membership_functional_roles",
      () => this.gateway.readFunctionalRoles(),
    )
    const subcontractorScopes = await safely(
      "Reading demo snapshot",
      "membership_subcontractor_scopes",
      () => this.gateway.readSubcontractorScopes(),
    )
    const pdsAreaScopes = await safely(
      "Reading demo snapshot",
      "membership_pds_area_scopes",
      () => this.gateway.readPdsAreaScopes(),
    )

    const observedProjects = [...projectRecords].sort((left, right) =>
      compareText(left.activityCode, right.activityCode),
    )
    const goldenProject = observedProjects.find(
      (project) =>
        project.activityCode ===
        DEMO_MANIFEST.projects.golden.activityCode,
    )
    this.preparedOn = goldenProject
      ? utcCalendarDate(goldenProject.createdAt)
      : null
    for (const definition of PROJECT_DEFINITIONS) {
      const project = observedProjects.find(
        (candidate) => candidate.activityCode === definition.activityCode,
      )
      if (project) this.projectIds.set(definition.activityCode, project.id)
      else this.projectIds.delete(definition.activityCode)
    }
    const projects: ObservedDemoProject[] = observedProjects.map((project) => ({
      key:
        PROJECT_DEFINITIONS.find(
          (definition) => definition.activityCode === project.activityCode,
        )?.key ?? project.activityCode,
      activityCode: project.activityCode,
      title: project.title,
      ownerName: project.ownerName,
      contractorName: project.contractorName,
      contractNumber: project.contractNumber,
      transitDays: project.transitDays,
      status: project.status,
    }))
    const projectsById = new Map(
      observedProjects.map((project) => [project.id, project]),
    )
    const profilesById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    )
    const definitionByEmail = new Map<
      string,
      { readonly definition: (typeof DEMO_MANIFEST.users)[number]; readonly index: number }
    >(
      DEMO_MANIFEST.users.map((definition, index) => [
        definition.email,
        { definition, index },
      ]),
    )
    const users = authUsers.flatMap((authUser) => {
      const profile = profilesById.get(authUser.id)
      const observedEmail =
        authUser.email ??
        profile?.email ??
        `missing-email:${authUser.id}`
      const known = definitionByEmail.get(observedEmail)
      const user: ObservedDemoUser = {
        key: known?.definition.key ?? `auth-user:${authUser.id}`,
        email: observedEmail,
        fullName: profile?.fullName ?? "[profile unavailable]",
        platformAdmin: profile?.isPlatformAdmin ?? false,
        status: statusFromAuth(authUser),
        memberships: userMemberships(
          authUser.id,
          memberships,
          projectsById,
          functionalRoles,
          subcontractorScopes,
          pdsAreaScopes,
        ),
      }
      return [{ user, knownIndex: known?.index }]
    })
      .sort((left, right) => {
        if (left.knownIndex !== undefined && right.knownIndex !== undefined) {
          return left.knownIndex - right.knownIndex
        }
        if (left.knownIndex !== undefined) return -1
        if (right.knownIndex !== undefined) return 1
        return compareText(left.user.email, right.user.email)
      })
      .map(({ user }) => user)

    const emptyCounts = {} as Record<
      EmptyCheckedProjectCode,
      Record<EmptyTable, number | null>
    >
    for (const definition of PROJECT_DEFINITIONS) {
      // The showcase project holds seeded progress on purpose. Counting its tables would be a
      // round-trip per table whose only use would be to assert the opposite of its purpose.
      if (
        (EXEMPT_FROM_EMPTY_AT_DEMO_START as readonly string[]).includes(
          definition.activityCode,
        )
      ) {
        continue
      }
      const activityCode = definition.activityCode as EmptyCheckedProjectCode
      const project = observedProjects.find(
        (candidate) =>
          candidate.activityCode === definition.activityCode,
      )
      if (!project) {
        emptyCounts[activityCode] = Object.fromEntries(
          EMPTY_AT_DEMO_START.map((table) => [table, null]),
        ) as Record<EmptyTable, null>
        continue
      }
      const counts = {} as Record<EmptyTable, number | null>
      for (const table of EMPTY_AT_DEMO_START) {
        const strategy = EMPTY_TABLE_STRATEGIES[table]
        counts[table] =
          strategy.kind === "direct"
            ? await safely("Reading empty table count", table, () =>
                this.gateway.countDirectProjectRows(
                  strategy.table,
                  project.id,
                ),
              )
            : await safely("Reading empty table count", table, () =>
                this.gateway.countChildProjectRows(strategy, project.id),
              )
      }
      emptyCounts[activityCode] = counts
    }

    return { projects, users, emptyCounts }
  }
}

function databaseProjectWrite(project: DemoProjectWrite) {
  return {
    activity_code: project.activityCode,
    title: project.title,
    owner_name: project.ownerName,
    contractor_name: project.contractorName,
    contract_number: project.contractNumber,
    maximum_transit_time_days: project.transitDays,
    status: project.status,
    created_by: project.createdBy,
  }
}

function resultError(
  error: { readonly message?: string } | null,
  operation: string,
): void {
  if (error) throw new Error(`${operation} failed.`)
}

function assertAffectedRows(
  rows: readonly unknown[] | null,
  expectedCount: number,
  operation: string,
): void {
  if (rows?.length !== expectedCount) {
    throw new Error(`${operation} returned an unexpected row count.`)
  }
}

function assertCleanReferenceKeys(
  actualKeys: readonly string[],
  expectedKeys: readonly string[],
  operation: string,
): void {
  const expected = new Set(expectedKeys)
  const seen = new Set<string>()
  for (const key of actualKeys) {
    if (!expected.has(key) || seen.has(key)) {
      throw new Error(`${operation} found unexpected reference rows.`)
    }
    seen.add(key)
  }
}

interface ExistingDemoUtRule {
  readonly id: string
  readonly diameter_from_inch: number
  readonly diameter_to_inch: number
  readonly flange_rating: string | null
}

function utRuleKey(row: {
  readonly diameter_from_inch: number
  readonly diameter_to_inch: number
  readonly flange_rating?: string | null
}): string {
  return `${row.diameter_from_inch}|${row.diameter_to_inch}|${row.flange_rating?.trim().toUpperCase() ?? "*"}`
}

export type DemoUtRuleWrite =
  | {
      readonly kind: "update"
      readonly id: string
      readonly row: DemoReferencePlan["system_ut_calculation_rules"][number]
    }
  | {
      readonly kind: "insert"
      readonly row: DemoReferencePlan["system_ut_calculation_rules"][number]
    }

export function planDemoUtRuleWrites(
  existing: readonly ExistingDemoUtRule[],
  desired: DemoReferencePlan["system_ut_calculation_rules"],
): readonly DemoUtRuleWrite[] {
  assertCleanReferenceKeys(
    existing.map(utRuleKey),
    desired.map((row) => utRuleKey(row.insert)),
    "Planning UT calculation rule writes",
  )
  const idsByKey = new Map(
    existing.map((row) => [utRuleKey(row), row.id]),
  )
  return desired.map((row) => {
    const id = idsByKey.get(utRuleKey(row.insert))
    return id
      ? { kind: "update" as const, id, row }
      : { kind: "insert" as const, row }
  })
}

interface ExistingDemoPunchCode {
  readonly id: string
  readonly code: string
}

/**
 * `project_punch_codes` is unique on `(project_id, upper(btrim(code)))`, an expression index that
 * PostgREST cannot be given as an `on_conflict` target, so this family is reconciled by identity
 * the same way the UT rules are.
 */
function punchCodeKey(row: { readonly code: string }): string {
  return row.code.trim().toUpperCase()
}

export type DemoPunchCodeWrite =
  | {
      readonly kind: "update"
      readonly id: string
      readonly row: DemoReferencePlan["project_punch_codes"][number]
    }
  | {
      readonly kind: "insert"
      readonly row: DemoReferencePlan["project_punch_codes"][number]
    }

export function planDemoPunchCodeWrites(
  existing: readonly ExistingDemoPunchCode[],
  desired: DemoReferencePlan["project_punch_codes"],
): readonly DemoPunchCodeWrite[] {
  assertCleanReferenceKeys(
    existing.map(punchCodeKey),
    desired.map((row) => punchCodeKey(row.insert)),
    "Planning project punch code writes",
  )
  const idsByKey = new Map(existing.map((row) => [punchCodeKey(row), row.id]))
  return desired.map((row) => {
    const id = idsByKey.get(punchCodeKey(row.insert))
    return id
      ? { kind: "update" as const, id, row }
      : { kind: "insert" as const, row }
  })
}

interface ExistingDemoProgressWeight {
  readonly id: string
  readonly phase: string
  readonly activity: string
}

export interface DemoProgressWeightWritePolicy {
  readonly archiveIds: readonly string[]
  readonly updates: readonly {
    readonly id: string
    readonly row: DemoReferencePlan["project_progress_weights"][number]
  }[]
  readonly inserts: DemoReferencePlan["project_progress_weights"]
}

export function planDemoProgressWeightWrites(
  existing: readonly ExistingDemoProgressWeight[],
  desired: DemoReferencePlan["project_progress_weights"],
): DemoProgressWeightWritePolicy {
  const existingByKey = new Map<string, string>()
  for (const row of existing) {
    const key = `${row.phase}|${row.activity}`
    if (existingByKey.has(key)) {
      throw new Error(
        "Planning project progress weights found duplicate active rows.",
      )
    }
    existingByKey.set(key, row.id)
  }
  const desiredKeys = new Set(desired.map((row) => row.key))
  const archiveIds = [...existingByKey]
    .filter(([key]) => !desiredKeys.has(key))
    .map(([, id]) => id)
  const updates: DemoProgressWeightWritePolicy["updates"][number][] = []
  const inserts: DemoReferencePlan["project_progress_weights"][number][] = []
  for (const row of desired) {
    const id = existingByKey.get(row.key)
    if (id) updates.push({ id, row })
    else inserts.push(row)
  }
  return { archiveIds, updates, inserts }
}

function requiredResolvedId(
  ids: ReadonlyMap<string, string>,
  code: string,
  operation: string,
): string {
  const id = ids.get(code)
  if (!id) throw new Error(`${operation} could not resolve a required parent.`)
  return id
}

function referenceProjectId(
  rows: readonly { readonly insert: { readonly project_id: string } }[],
  operation: string,
): string {
  const ids = new Set(rows.map((row) => row.insert.project_id))
  if (ids.size !== 1) {
    throw new Error(`${operation} requires exactly one project.`)
  }
  const projectId = rows[0]?.insert.project_id
  if (!projectId) throw new Error(`${operation} has no project rows.`)
  return projectId
}

class SupabaseAdminGateway
  implements
    DemoAdminGateway,
    FunctionalRoleReconciliationGateway,
    DemoReferenceGateway
{
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async resolveProjectCodes(
    table:
      | "project_units"
      | "project_area_classifications"
      | "project_pds_areas"
      | "project_subcontractors"
      | "project_service_classes"
      | "project_welding_procedures"
      | "welder_qualifications"
      | "project_weld_types"
      | "project_systems"
      | "project_location_categories"
      | "project_spooling_material_types"
      | "project_line_services"
      | "project_devices",
    projectId: string,
    codes: readonly string[],
    operation: string,
  ): Promise<ReadonlyMap<string, string>> {
    const uniqueCodes = [...new Set(codes)]
    if (uniqueCodes.length === 0) return new Map()
    if (table === "welder_qualifications") {
      const result = await this.client
        .from("welder_qualifications")
        .select("id,welder_code")
        .eq("project_id", projectId)
        .in("welder_code", uniqueCodes)
      resultError(result.error, operation)
      const ids = new Map<string, string>()
      for (const row of result.data ?? []) {
        if (ids.has(row.welder_code)) {
          throw new Error(`${operation} found duplicate parent rows.`)
        }
        ids.set(row.welder_code, row.id)
      }
      if (ids.size !== uniqueCodes.length) {
        throw new Error(`${operation} could not resolve every parent.`)
      }
      return ids
    }
    const result = await this.client
      .from(table)
      .select("id,code")
      .eq("project_id", projectId)
      .in("code", uniqueCodes)
    resultError(result.error, operation)
    const ids = new Map<string, string>()
    for (const row of result.data ?? []) {
      if (ids.has(row.code)) {
        throw new Error(`${operation} found duplicate parent rows.`)
      }
      ids.set(row.code, row.id)
    }
    if (ids.size !== uniqueCodes.length) {
      throw new Error(`${operation} could not resolve every parent.`)
    }
    return ids
  }

  private async resolveMaterialTypes(
    codes: readonly string[],
    operation: string,
  ): Promise<ReadonlyMap<string, string>> {
    const uniqueCodes = [...new Set(codes)]
    if (uniqueCodes.length === 0) return new Map()
    const result = await this.client
      .from("system_reference_entries")
      .select("id,code")
      .eq("kind", "material_type")
      .in("code", uniqueCodes)
    resultError(result.error, operation)
    const ids = new Map<string, string>()
    for (const row of result.data ?? []) {
      if (ids.has(row.code)) {
        throw new Error(`${operation} found duplicate parent rows.`)
      }
      ids.set(row.code, row.id)
    }
    if (ids.size !== uniqueCodes.length) {
      throw new Error(`${operation} could not resolve every parent.`)
    }
    return ids
  }

  private async resolveRalCodes(
    projectId: string,
    ralCodes: readonly string[],
    operation: string,
  ): Promise<ReadonlyMap<string, string>> {
    const uniqueCodes = [...new Set(ralCodes)]
    if (uniqueCodes.length === 0) return new Map()
    const result = await this.client
      .from("project_ral_codes")
      .select("id,ral_code")
      .eq("project_id", projectId)
      .in("ral_code", uniqueCodes)
    resultError(result.error, operation)
    const ids = new Map<string, string>()
    for (const row of result.data ?? []) {
      if (ids.has(row.ral_code)) {
        throw new Error(`${operation} found duplicate parent rows.`)
      }
      ids.set(row.ral_code, row.id)
    }
    if (ids.size !== uniqueCodes.length) {
      throw new Error(`${operation} could not resolve every parent.`)
    }
    return ids
  }

  private async reconcileSystemEntries(
    rows: DemoReferencePlan["system_reference_entries"],
  ): Promise<void> {
    const existing = await this.client
      .from("system_reference_entries")
      .select("kind,code")
      .in("kind", ["material_type", "torquing_requirement"])
    resultError(existing.error, "Inspecting system reference entries")
    assertCleanReferenceKeys(
      (existing.data ?? []).map((row) => `${row.kind}|${row.code}`),
      rows.map((row) => `${row.insert.kind}|${row.insert.code}`),
      "Inspecting system reference entries",
    )
    const result = await this.client
      .from("system_reference_entries")
      .upsert(rows.map((row) => row.insert), { onConflict: "kind,code" })
      .select("id")
    resultError(result.error, "Reconciling system reference entries")
    assertAffectedRows(
      result.data,
      rows.length,
      "Reconciling system reference entries",
    )
  }

  private async reconcileFilmRules(
    rows: DemoReferencePlan["system_film_quantity_rules"],
  ): Promise<void> {
    const key = (row: {
      readonly diameter_from_inch: number
      readonly diameter_to_inch: number
      readonly thickness_from_mm: number
      readonly thickness_to_mm: number
    }) =>
      [
        row.diameter_from_inch,
        row.diameter_to_inch,
        row.thickness_from_mm,
        row.thickness_to_mm,
      ].join("|")
    const existing = await this.client
      .from("system_film_quantity_rules")
      .select(
        "diameter_from_inch,diameter_to_inch,thickness_from_mm,thickness_to_mm",
      )
    resultError(existing.error, "Inspecting film quantity rules")
    assertCleanReferenceKeys(
      (existing.data ?? []).map(key),
      rows.map((row) => key(row.insert)),
      "Inspecting film quantity rules",
    )
    const result = await this.client
      .from("system_film_quantity_rules")
      .upsert(rows.map((row) => row.insert), {
        onConflict:
          "diameter_from_inch,diameter_to_inch,thickness_from_mm,thickness_to_mm",
      })
      .select("id")
    resultError(result.error, "Reconciling film quantity rules")
    assertAffectedRows(
      result.data,
      rows.length,
      "Reconciling film quantity rules",
    )
  }

  private async reconcileUtRules(
    rows: DemoReferencePlan["system_ut_calculation_rules"],
  ): Promise<void> {
    const existing = await this.client
      .from("system_ut_calculation_rules")
      .select("id,diameter_from_inch,diameter_to_inch,flange_rating")
    resultError(existing.error, "Inspecting UT calculation rules")
    const writes = planDemoUtRuleWrites(existing.data ?? [], rows)
    for (const write of writes) {
      const result = write.kind === "update"
        ? await this.client
            .from("system_ut_calculation_rules")
            .update(write.row.insert)
            .eq("id", write.id)
            .select("id")
        : await this.client
            .from("system_ut_calculation_rules")
            .insert(write.row.insert)
            .select("id")
      resultError(result.error, "Reconciling UT calculation rule")
      assertAffectedRows(
        result.data,
        1,
        "Reconciling UT calculation rule",
      )
    }
  }

  private async reconcilePunchCodes(
    rows: DemoReferencePlan["project_punch_codes"],
  ): Promise<void> {
    const projectId = referenceProjectId(
      rows,
      "Reconciling project punch codes",
    )
    const existing = await this.client
      .from("project_punch_codes")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(existing.error, "Inspecting project punch codes")
    const writes = planDemoPunchCodeWrites(existing.data ?? [], rows)
    for (const write of writes) {
      const result = write.kind === "update"
        ? await this.client
            .from("project_punch_codes")
            .update(write.row.insert)
            .eq("id", write.id)
            .select("id")
        : await this.client
            .from("project_punch_codes")
            .insert(write.row.insert)
            .select("id")
      resultError(result.error, "Reconciling project punch code")
      assertAffectedRows(result.data, 1, "Reconciling project punch code")
    }
  }

  private async reconcileProgressWeights(
    rows: DemoReferencePlan["project_progress_weights"],
  ): Promise<void> {
    const projectId = referenceProjectId(
      rows,
      "Reconciling project progress weights",
    )
    const existing = await this.client
      .from("project_progress_weights")
      .select("id,phase,activity")
      .eq("project_id", projectId)
      .eq("status", "active")
    resultError(existing.error, "Inspecting project progress weights")
    const policy = planDemoProgressWeightWrites(existing.data ?? [], rows)
    if (policy.archiveIds.length > 0) {
      const archived = await this.client
        .from("project_progress_weights")
        .update({ status: "archived" })
        .in("id", [...policy.archiveIds])
        .select("id")
      resultError(archived.error, "Archiving obsolete progress weights")
      assertAffectedRows(
        archived.data,
        policy.archiveIds.length,
        "Archiving obsolete progress weights",
      )
    }
    for (const update of policy.updates) {
      const result = await this.client
        .from("project_progress_weights")
        .update(update.row.insert)
        .eq("id", update.id)
        .select("id")
      resultError(result.error, "Reconciling project progress weight")
      assertAffectedRows(
        result.data,
        1,
        "Reconciling project progress weight",
      )
    }
    for (const insert of policy.inserts) {
      const result = await this.client
        .from("project_progress_weights")
        .insert(insert.insert)
        .select("id")
      resultError(result.error, "Reconciling project progress weight")
      assertAffectedRows(
        result.data,
        1,
        "Reconciling project progress weight",
      )
    }
    const verified = await this.client
      .from("project_progress_weights")
      .select("phase,activity")
      .eq("project_id", projectId)
      .eq("status", "active")
    resultError(verified.error, "Verifying project progress weights")
    assertCleanReferenceKeys(
      (verified.data ?? []).map((row) => `${row.phase}|${row.activity}`),
      rows.map((row) => row.key),
      "Verifying project progress weights",
    )
    assertAffectedRows(
      verified.data,
      rows.length,
      "Verifying project progress weights",
    )
  }

  async reconcileReferenceBatch(
    batch: DemoReferenceWriteBatch,
  ): Promise<void> {
    if (batch.table === "system_reference_entries") {
      await this.reconcileSystemEntries(batch.rows)
      return
    }
    if (batch.table === "system_film_quantity_rules") {
      await this.reconcileFilmRules(batch.rows)
      return
    }
    if (batch.table === "system_ut_calculation_rules") {
      await this.reconcileUtRules(batch.rows)
      return
    }
    if (batch.table === "project_progress_weights") {
      await this.reconcileProgressWeights(batch.rows)
      return
    }

    if (batch.table === "project_subcontractors") {
      const result = await this.client
        .from("project_subcontractors")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project subcontractors")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_units") {
      const result = await this.client
        .from("project_units")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project units")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_weld_types") {
      const result = await this.client
        .from("project_weld_types")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project weld types")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_line_services") {
      const result = await this.client
        .from("project_line_services")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project line services")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_location_categories") {
      const result = await this.client
        .from("project_location_categories")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling location categories")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_systems") {
      const result = await this.client
        .from("project_systems")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project systems")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_teams") {
      const result = await this.client
        .from("project_teams")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,team_type,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project teams")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_punch_codes") {
      await this.reconcilePunchCodes(batch.rows)
      return
    }
    if (batch.table === "project_rework_codes") {
      const result = await this.client
        .from("project_rework_codes")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling rework codes")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_unit_time_references") {
      const result = await this.client
        .from("project_unit_time_references")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,activity",
        })
        .select("id")
      resultError(result.error, "Reconciling unit-time references")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_pressure_units") {
      const result = await this.client
        .from("project_pressure_units")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id",
        })
        .select("project_id")
      resultError(result.error, "Reconciling pressure units")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_spooling_material_types") {
      const result = await this.client
        .from("project_spooling_material_types")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling spooling material types")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_spooling_checklist_items") {
      const result = await this.client
        .from("project_spooling_checklist_items")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling spooling checklist items")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "piping_material_records") {
      const result = await this.client
        .from("piping_material_records")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,ident_code,trace_number",
        })
        .select("id")
      resultError(result.error, "Reconciling piping material records")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_assembly_settings") {
      const result = await this.client
        .from("project_assembly_settings")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id",
        })
        .select("project_id")
      resultError(result.error, "Reconciling assembly settings")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_devices") {
      const result = await this.client
        .from("project_devices")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,code",
        })
        .select("id")
      resultError(result.error, "Reconciling project devices")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }

    if (batch.table === "project_area_classifications") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling area classifications",
      )
      const units = await this.resolveProjectCodes(
        "project_units",
        projectId,
        batch.rows.map((row) => row.parents.unitCode),
        "Resolving area classification units",
      )
      const result = await this.client
        .from("project_area_classifications")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            unit_id: requiredResolvedId(
              units,
              row.parents.unitCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling area classifications")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_pds_areas") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling PDS areas",
      )
      const areas = await this.resolveProjectCodes(
        "project_area_classifications",
        projectId,
        batch.rows.map((row) => row.parents.areaCode),
        "Resolving PDS classifications",
      )
      const subcontractors = await this.resolveProjectCodes(
        "project_subcontractors",
        projectId,
        batch.rows.flatMap((row) => [
          row.parents.shopSubcontractorCode,
          row.parents.fieldSubcontractorCode,
        ]),
        "Resolving PDS subcontractors",
      )
      const result = await this.client
        .from("project_pds_areas")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            area_classification_id: requiredResolvedId(
              areas,
              row.parents.areaCode,
              batch.table,
            ),
            shop_subcontractor_id: requiredResolvedId(
              subcontractors,
              row.parents.shopSubcontractorCode,
              batch.table,
            ),
            assembly_subcontractor_id: null,
            field_subcontractor_id: requiredResolvedId(
              subcontractors,
              row.parents.fieldSubcontractorCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling PDS areas")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_service_classes") {
      const materialTypes = await this.resolveMaterialTypes(
        batch.rows.map((row) => row.parents.materialTypeCode),
        "Resolving service-class materials",
      )
      const result = await this.client
        .from("project_service_classes")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            material_type_id: requiredResolvedId(
              materialTypes,
              row.parents.materialTypeCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling service classes")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_welding_procedures") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling welding procedures",
      )
      const subcontractors = await this.resolveProjectCodes(
        "project_subcontractors",
        projectId,
        batch.rows.map((row) => row.parents.subcontractorCode),
        "Resolving WPS subcontractors",
      )
      const materialTypes = await this.resolveMaterialTypes(
        batch.rows.map((row) => row.parents.materialTypeCode),
        "Resolving WPS materials",
      )
      const result = await this.client
        .from("project_welding_procedures")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            subcontractor_id: requiredResolvedId(
              subcontractors,
              row.parents.subcontractorCode,
              batch.table,
            ),
            material_type_id: requiredResolvedId(
              materialTypes,
              row.parents.materialTypeCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling welding procedures")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "welder_qualifications") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling welder qualifications",
      )
      const subcontractors = await this.resolveProjectCodes(
        "project_subcontractors",
        projectId,
        batch.rows.map((row) => row.parents.subcontractorCode),
        "Resolving welder subcontractors",
      )
      const result = await this.client
        .from("welder_qualifications")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            subcontractor_id: requiredResolvedId(
              subcontractors,
              row.parents.subcontractorCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,welder_code" },
        )
        .select("id")
      resultError(result.error, "Reconciling welder qualifications")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "welder_wps_qualifications") {
      const projectIds = new Set(
        batch.rows.map((row) => row.parents.projectId),
      )
      if (projectIds.size !== 1) {
        throw new Error("Welder-WPS links require exactly one project.")
      }
      const projectId = batch.rows[0]?.parents.projectId
      if (!projectId) throw new Error("Welder-WPS links have no project.")
      const welders = await this.resolveProjectCodes(
        "welder_qualifications",
        projectId,
        batch.rows.map((row) => row.parents.welderCode),
        "Resolving qualified welders",
      )
      const procedures = await this.resolveProjectCodes(
        "project_welding_procedures",
        projectId,
        batch.rows.map((row) => row.parents.wpsCode),
        "Resolving qualified WPS rows",
      )
      const result = await this.client
        .from("welder_wps_qualifications")
        .upsert(
          batch.rows.map((row) => ({
            welder_qualification_id: requiredResolvedId(
              welders,
              row.parents.welderCode,
              batch.table,
            ),
            wps_id: requiredResolvedId(
              procedures,
              row.parents.wpsCode,
              batch.table,
            ),
          })),
          { onConflict: "welder_qualification_id,wps_id" },
        )
        .select("welder_qualification_id,wps_id")
      resultError(result.error, "Reconciling welder-WPS links")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_thickness_flange_rules") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling thickness rules",
      )
      const serviceClasses = await this.resolveProjectCodes(
        "project_service_classes",
        projectId,
        batch.rows.map((row) => row.parents.serviceClassCode),
        "Resolving thickness-rule service classes",
      )
      const result = await this.client
        .from("project_thickness_flange_rules")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            service_class_id: requiredResolvedId(
              serviceClasses,
              row.parents.serviceClassCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,service_class_id,diameter_inch" },
        )
        .select("id")
      resultError(result.error, "Reconciling thickness rules")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "nde_matrix_rules") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling NDE matrix rules",
      )
      const serviceClasses = await this.resolveProjectCodes(
        "project_service_classes",
        projectId,
        batch.rows.map((row) => row.parents.serviceClassCode),
        "Resolving NDE service classes",
      )
      const weldTypes = await this.resolveProjectCodes(
        "project_weld_types",
        projectId,
        batch.rows.map((row) => row.parents.weldTypeCode),
        "Resolving NDE weld types",
      )
      const result = await this.client
        .from("nde_matrix_rules")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            service_class_id: requiredResolvedId(
              serviceClasses,
              row.parents.serviceClassCode,
              batch.table,
            ),
            weld_type_id: requiredResolvedId(
              weldTypes,
              row.parents.weldTypeCode,
              batch.table,
            ),
          })),
          {
            onConflict:
              "project_id,service_class_id,weld_type_id,weld_location",
          },
        )
        .select("id")
      resultError(result.error, "Reconciling NDE matrix rules")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_subsystems") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling project subsystems",
      )
      const systems = await this.resolveProjectCodes(
        "project_systems",
        projectId,
        batch.rows.map((row) => row.parents.systemCode),
        "Resolving subsystem systems",
      )
      const result = await this.client
        .from("project_subsystems")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            system_id: requiredResolvedId(
              systems,
              row.parents.systemCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling project subsystems")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_locations") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling project locations",
      )
      const categories = await this.resolveProjectCodes(
        "project_location_categories",
        projectId,
        batch.rows.map((row) => row.parents.categoryCode),
        "Resolving location categories",
      )
      const result = await this.client
        .from("project_locations")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            category_id: requiredResolvedId(
              categories,
              row.parents.categoryCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,code" },
        )
        .select("id")
      resultError(result.error, "Reconciling project locations")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_spooling_material_classes") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling spooling material classes",
      )
      const materialTypes = await this.resolveProjectCodes(
        "project_spooling_material_types",
        projectId,
        batch.rows.map((row) => row.parents.materialTypeCode),
        "Resolving spooling material types",
      )
      const result = await this.client
        .from("project_spooling_material_classes")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            material_type_id: requiredResolvedId(
              materialTypes,
              row.parents.materialTypeCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,external_class_code" },
        )
        .select("id")
      resultError(result.error, "Reconciling spooling material classes")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_ral_codes") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling RAL codes",
      )
      const services = await this.resolveProjectCodes(
        "project_line_services",
        projectId,
        batch.rows.map((row) => row.parents.lineServiceCode),
        "Resolving RAL line services",
      )
      const result = await this.client
        .from("project_ral_codes")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            line_service_id: requiredResolvedId(
              services,
              row.parents.lineServiceCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,line_service_id" },
        )
        .select("id")
      resultError(result.error, "Reconciling RAL codes")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_paint_matrix_rules") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling paint matrix rules",
      )
      const services = await this.resolveProjectCodes(
        "project_line_services",
        projectId,
        batch.rows.map((row) => row.parents.lineServiceCode),
        "Resolving paint line services",
      )
      const ralCodes = await this.resolveRalCodes(
        projectId,
        batch.rows.map((row) => row.parents.ralCode),
        "Resolving paint RAL codes",
      )
      const result = await this.client
        .from("project_paint_matrix_rules")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            line_service_id: requiredResolvedId(
              services,
              row.parents.lineServiceCode,
              batch.table,
            ),
            ral_code_id: requiredResolvedId(
              ralCodes,
              row.parents.ralCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,line_service_id" },
        )
        .select("id")
      resultError(result.error, "Reconciling paint matrix rules")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_joint_categories") {
      const result = await this.client
        .from("project_joint_categories")
        .upsert(batch.rows.map((row) => row.insert), {
          onConflict: "project_id,category_code,reason",
        })
        .select("id")
      resultError(result.error, "Reconciling joint categories")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
      return
    }
    if (batch.table === "project_device_users") {
      const projectId = referenceProjectId(
        batch.rows,
        "Reconciling device assignments",
      )
      const devices = await this.resolveProjectCodes(
        "project_devices",
        projectId,
        batch.rows.map((row) => row.parents.deviceCode),
        "Resolving assigned devices",
      )
      const result = await this.client
        .from("project_device_users")
        .upsert(
          batch.rows.map((row) => ({
            ...row.insert,
            device_id: requiredResolvedId(
              devices,
              row.parents.deviceCode,
              batch.table,
            ),
          })),
          { onConflict: "project_id,membership_id" },
        )
        .select("id")
      resultError(result.error, "Reconciling device assignments")
      assertAffectedRows(result.data, batch.rows.length, batch.table)
    }
  }

  async replaceMembershipScopes(
    replacement: DemoScopeReplacement,
  ): Promise<void> {
    const membershipIds = new Set([
      ...replacement.subcontractorScopes.map(
        (row) => row.insert.membership_id,
      ),
      ...replacement.pdsAreaScopes.map((row) => row.insert.membership_id),
    ])
    if (membershipIds.size !== 1) {
      throw new Error("Replacing demo scopes requires one membership.")
    }
    const membershipId = [...membershipIds][0]
    if (!membershipId) {
      throw new Error("Replacing demo scopes requires scoped rows.")
    }
    const membership = await this.client
      .from("project_memberships")
      .select("project_id")
      .eq("id", membershipId)
      .limit(2)
    resultError(membership.error, "Resolving scoped membership")
    assertAffectedRows(
      membership.data,
      1,
      "Resolving scoped membership",
    )
    const projectId = membership.data?.[0]?.project_id
    if (!projectId) throw new Error("Resolving scoped membership failed.")

    const subcontractors = await this.resolveProjectCodes(
      "project_subcontractors",
      projectId,
      replacement.subcontractorScopes.map(
        (row) => row.parents.subcontractorCode,
      ),
      "Resolving subcontractor scopes",
    )
    const pdsAreas = await this.resolveProjectCodes(
      "project_pds_areas",
      projectId,
      replacement.pdsAreaScopes.map((row) => row.parents.pdsAreaCode),
      "Resolving PDS area scopes",
    )

    const deletedSubcontractors = await this.client
      .from("membership_subcontractor_scopes")
      .delete()
      .eq("membership_id", membershipId)
    resultError(
      deletedSubcontractors.error,
      "Replacing subcontractor scopes",
    )
    const deletedPdsAreas = await this.client
      .from("membership_pds_area_scopes")
      .delete()
      .eq("membership_id", membershipId)
    resultError(deletedPdsAreas.error, "Replacing PDS area scopes")

    if (replacement.subcontractorScopes.length > 0) {
      const inserted = await this.client
        .from("membership_subcontractor_scopes")
        .insert(
          replacement.subcontractorScopes.map((row) => ({
            ...row.insert,
            subcontractor_id: requiredResolvedId(
              subcontractors,
              row.parents.subcontractorCode,
              "Replacing subcontractor scopes",
            ),
          })),
        )
        .select("membership_id,subcontractor_id")
      resultError(inserted.error, "Replacing subcontractor scopes")
      assertAffectedRows(
        inserted.data,
        replacement.subcontractorScopes.length,
        "Replacing subcontractor scopes",
      )
    }
    if (replacement.pdsAreaScopes.length > 0) {
      const inserted = await this.client
        .from("membership_pds_area_scopes")
        .insert(
          replacement.pdsAreaScopes.map((row) => ({
            ...row.insert,
            pds_area_id: requiredResolvedId(
              pdsAreas,
              row.parents.pdsAreaCode,
              "Replacing PDS area scopes",
            ),
          })),
        )
        .select("membership_id,pds_area_id")
      resultError(inserted.error, "Replacing PDS area scopes")
      assertAffectedRows(
        inserted.data,
        replacement.pdsAreaScopes.length,
        "Replacing PDS area scopes",
      )
    }

    const verifiedSubcontractors = await this.client
      .from("membership_subcontractor_scopes")
      .select("subcontractor_id")
      .eq("membership_id", membershipId)
    resultError(
      verifiedSubcontractors.error,
      "Verifying subcontractor scopes",
    )
    assertCleanReferenceKeys(
      (verifiedSubcontractors.data ?? []).map(
        (row) => row.subcontractor_id,
      ),
      replacement.subcontractorScopes.map((row) =>
        requiredResolvedId(
          subcontractors,
          row.parents.subcontractorCode,
          "Verifying subcontractor scopes",
        ),
      ),
      "Verifying subcontractor scopes",
    )
    assertAffectedRows(
      verifiedSubcontractors.data,
      replacement.subcontractorScopes.length,
      "Verifying subcontractor scopes",
    )
    const verifiedPdsAreas = await this.client
      .from("membership_pds_area_scopes")
      .select("pds_area_id")
      .eq("membership_id", membershipId)
    resultError(verifiedPdsAreas.error, "Verifying PDS area scopes")
    assertCleanReferenceKeys(
      (verifiedPdsAreas.data ?? []).map((row) => row.pds_area_id),
      replacement.pdsAreaScopes.map((row) =>
        requiredResolvedId(
          pdsAreas,
          row.parents.pdsAreaCode,
          "Verifying PDS area scopes",
        ),
      ),
      "Verifying PDS area scopes",
    )
    assertAffectedRows(
      verifiedPdsAreas.data,
      replacement.pdsAreaScopes.length,
      "Verifying PDS area scopes",
    )
  }

  private async readReferenceDatabaseRows(
    projectId: string,
  ): Promise<DemoReferenceDatabaseRows> {
    const systemEntries = await this.client
      .from("system_reference_entries")
      .select("id,kind,code,description,status")
      .in("kind", ["material_type", "torquing_requirement"])
    resultError(systemEntries.error, "Reading system reference entries")
    const filmRules = await this.client
      .from("system_film_quantity_rules")
      .select(
        "diameter_from_inch,diameter_to_inch,thickness_from_mm,thickness_to_mm,film_count",
      )
    resultError(filmRules.error, "Reading film quantity rules")
    const utRules = await this.client
      .from("system_ut_calculation_rules")
      .select(
        "diameter_from_inch,diameter_to_inch,flange_rating,coefficient_diameter,coefficient_rating",
      )
    resultError(utRules.error, "Reading UT calculation rules")

    const subcontractors = await this.client
      .from("project_subcontractors")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(subcontractors.error, "Reading project subcontractors")
    const units = await this.client
      .from("project_units")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(units.error, "Reading project units")
    const areaClassifications = await this.client
      .from("project_area_classifications")
      .select("id,code,description,status,unit_id")
      .eq("project_id", projectId)
    resultError(areaClassifications.error, "Reading area classifications")
    const pdsAreas = await this.client
      .from("project_pds_areas")
      .select(
        "id,code,description,status,area_classification_id,shop_subcontractor_id,field_subcontractor_id",
      )
      .eq("project_id", projectId)
    resultError(pdsAreas.error, "Reading PDS areas")
    const serviceClasses = await this.client
      .from("project_service_classes")
      .select("id,code,description,status,material_type_id")
      .eq("project_id", projectId)
    resultError(serviceClasses.error, "Reading service classes")
    const weldTypes = await this.client
      .from("project_weld_types")
      .select("id,code,description,status,counts_in_dia_inch")
      .eq("project_id", projectId)
    resultError(weldTypes.error, "Reading weld types")
    const weldingProcedures = await this.client
      .from("project_welding_procedures")
      .select(
        "id,code,description,status,subcontractor_id,material_type_id,process,revision,diameter_from,diameter_to,thickness_from,thickness_to,approved_on",
      )
      .eq("project_id", projectId)
    resultError(weldingProcedures.error, "Reading welding procedures")
    const welders = await this.client
      .from("welder_qualifications")
      .select(
        "id,welder_code,full_name,status,subcontractor_id,expires_on",
      )
      .eq("project_id", projectId)
    resultError(welders.error, "Reading welder qualifications")
    const welderIds = (welders.data ?? []).map((row) => row.id)
    const welderWpsLinks =
      welderIds.length === 0
        ? null
        : await this.client
            .from("welder_wps_qualifications")
            .select("welder_qualification_id,wps_id")
            .in("welder_qualification_id", welderIds)
    if (welderWpsLinks) {
      resultError(welderWpsLinks.error, "Reading welder-WPS links")
    }
    const ndeRules = await this.client
      .from("nde_matrix_rules")
      .select(
        "service_class_id,weld_type_id,weld_location,rt_coverage,ut_coverage,mt_coverage,pt_coverage,pmi_coverage,ht_coverage,material_traceability_required,pwht_required,status",
      )
      .eq("project_id", projectId)
    resultError(ndeRules.error, "Reading NDE matrix rules")
    const pipingMaterials = await this.client
      .from("piping_material_records")
      .select("ident_code,trace_number,mrr_number,status")
      .eq("project_id", projectId)
    resultError(pipingMaterials.error, "Reading piping material records")
    const thicknessRules = await this.client
      .from("project_thickness_flange_rules")
      .select(
        "service_class_id,diameter_inch,thickness_mm,flange_rating,status",
      )
      .eq("project_id", projectId)
    resultError(thicknessRules.error, "Reading thickness flange rules")
    const reworkCodes = await this.client
      .from("project_rework_codes")
      .select("code,description,status")
      .eq("project_id", projectId)
    resultError(reworkCodes.error, "Reading rework codes")
    const jointCategories = await this.client
      .from("project_joint_categories")
      .select(
        "category_code,joint_definition,timing,reason,coefficient,status",
      )
      .eq("project_id", projectId)
    resultError(jointCategories.error, "Reading joint categories")
    const teams = await this.client
      .from("project_teams")
      .select("code,description,team_type,status")
      .eq("project_id", projectId)
    resultError(teams.error, "Reading project teams")
    const punchCodes = await this.client
      .from("project_punch_codes")
      .select("code,description,status")
      .eq("project_id", projectId)
    resultError(punchCodes.error, "Reading project punch codes")
    const systems = await this.client
      .from("project_systems")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(systems.error, "Reading project systems")
    const subsystems = await this.client
      .from("project_subsystems")
      .select("code,description,status,system_id")
      .eq("project_id", projectId)
    resultError(subsystems.error, "Reading project subsystems")
    const lineServices = await this.client
      .from("project_line_services")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(lineServices.error, "Reading line services")
    const pressureUnits = await this.client
      .from("project_pressure_units")
      .select("unit")
      .eq("project_id", projectId)
    resultError(pressureUnits.error, "Reading pressure units")
    const locationCategories = await this.client
      .from("project_location_categories")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(locationCategories.error, "Reading location categories")
    const locations = await this.client
      .from("project_locations")
      .select("code,description,status,category_id")
      .eq("project_id", projectId)
    resultError(locations.error, "Reading project locations")
    const unitTimeReferences = await this.client
      .from("project_unit_time_references")
      .select("activity,project_ut,standard_reference,status")
      .eq("project_id", projectId)
    resultError(unitTimeReferences.error, "Reading unit-time references")
    const progressWeights = await this.client
      .from("project_progress_weights")
      .select("phase,activity,weight,status")
      .eq("project_id", projectId)
    resultError(progressWeights.error, "Reading progress weights")
    const assemblySettings = await this.client
      .from("project_assembly_settings")
      .select("enabled")
      .eq("project_id", projectId)
    resultError(assemblySettings.error, "Reading assembly settings")
    const spoolingMaterialTypes = await this.client
      .from("project_spooling_material_types")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(
      spoolingMaterialTypes.error,
      "Reading spooling material types",
    )
    const spoolingMaterialClasses = await this.client
      .from("project_spooling_material_classes")
      .select("external_class_code,material_type_id,status")
      .eq("project_id", projectId)
    resultError(
      spoolingMaterialClasses.error,
      "Reading spooling material classes",
    )
    const spoolingChecklistItems = await this.client
      .from("project_spooling_checklist_items")
      .select("code,description,sort_order,is_required,status")
      .eq("project_id", projectId)
    resultError(
      spoolingChecklistItems.error,
      "Reading spooling checklist items",
    )
    const ralCodes = await this.client
      .from("project_ral_codes")
      .select("id,line_service_id,color_code,ral_code,status")
      .eq("project_id", projectId)
    resultError(ralCodes.error, "Reading RAL codes")
    const paintMatrixRules = await this.client
      .from("project_paint_matrix_rules")
      .select(
        "line_service_id,ral_code_id,blasting_required,primer_required,intermediate_coat_count,final_coat_count,required_final_dft_microns,status",
      )
      .eq("project_id", projectId)
    resultError(paintMatrixRules.error, "Reading paint matrix rules")
    const devices = await this.client
      .from("project_devices")
      .select("id,code,description,status")
      .eq("project_id", projectId)
    resultError(devices.error, "Reading project devices")
    const deviceUsers = await this.client
      .from("project_device_users")
      .select("membership_id,device_id,status")
      .eq("project_id", projectId)
    resultError(deviceUsers.error, "Reading device assignments")
    const memberships = await this.client
      .from("project_memberships")
      .select("id,user_id")
      .eq("project_id", projectId)
    resultError(memberships.error, "Reading project members for devices")
    const userIds = [...new Set((memberships.data ?? []).map((row) => row.user_id))]
    const profiles =
      userIds.length === 0
        ? null
        : await this.client
            .from("profiles")
            .select("id,email")
            .in("id", userIds)
    if (profiles) resultError(profiles.error, "Reading assigned device users")

    return {
      system_reference_entries: systemEntries.data ?? [],
      system_film_quantity_rules: filmRules.data ?? [],
      system_ut_calculation_rules: utRules.data ?? [],
      project_subcontractors: subcontractors.data ?? [],
      project_units: units.data ?? [],
      project_area_classifications: areaClassifications.data ?? [],
      project_pds_areas: pdsAreas.data ?? [],
      project_service_classes: serviceClasses.data ?? [],
      project_weld_types: weldTypes.data ?? [],
      project_welding_procedures: weldingProcedures.data ?? [],
      welder_qualifications: welders.data ?? [],
      welder_wps_qualifications: welderWpsLinks?.data ?? [],
      nde_matrix_rules: ndeRules.data ?? [],
      piping_material_records: pipingMaterials.data ?? [],
      project_thickness_flange_rules: thicknessRules.data ?? [],
      project_rework_codes: reworkCodes.data ?? [],
      project_joint_categories: jointCategories.data ?? [],
      project_teams: teams.data ?? [],
      project_punch_codes: punchCodes.data ?? [],
      project_systems: systems.data ?? [],
      project_subsystems: subsystems.data ?? [],
      project_line_services: lineServices.data ?? [],
      project_pressure_units: pressureUnits.data ?? [],
      project_location_categories: locationCategories.data ?? [],
      project_locations: locations.data ?? [],
      project_unit_time_references: unitTimeReferences.data ?? [],
      project_progress_weights: progressWeights.data ?? [],
      project_assembly_settings: assemblySettings.data ?? [],
      project_spooling_material_types: spoolingMaterialTypes.data ?? [],
      project_spooling_material_classes: spoolingMaterialClasses.data ?? [],
      project_spooling_checklist_items: spoolingChecklistItems.data ?? [],
      project_ral_codes: ralCodes.data ?? [],
      project_paint_matrix_rules: paintMatrixRules.data ?? [],
      project_devices: devices.data ?? [],
      project_device_users: deviceUsers.data ?? [],
      project_memberships: memberships.data ?? [],
      profiles: profiles?.data ?? [],
    }
  }

  async readReferences(projectId: string): Promise<ObservedDemoReferences> {
    return normalizeDemoReferenceRows(
      await this.readReferenceDatabaseRows(projectId),
    )
  }

  async readSetupReadiness(projectId: string): Promise<{
    readonly ready: boolean
    readonly missing: readonly string[]
  }> {
    const result = await this.client.rpc("get_project_setup_readiness", {
      target_project_id: projectId,
    })
    resultError(result.error, "Reading project setup readiness")
    assertAffectedRows(result.data, 1, "Reading project setup readiness")
    const row = result.data?.[0]
    if (!row) throw new Error("Reading project setup readiness failed.")
    return {
      ready: row.admin_complete,
      missing: row.missing_codes,
    }
  }

  async readReferenceKeys(
    projectId: string,
  ): Promise<Readonly<Record<keyof DemoReferences, readonly string[]>>> {
    const subcontractors = await this.client
      .from("project_subcontractors")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(subcontractors.error, "Reading isolation subcontractor keys")
    const units = await this.client
      .from("project_units")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(units.error, "Reading isolation unit keys")
    const areas = await this.client
      .from("project_area_classifications")
      .select("id,code,unit_id")
      .eq("project_id", projectId)
    resultError(areas.error, "Reading isolation area keys")
    const pdsAreas = await this.client
      .from("project_pds_areas")
      .select("code,area_classification_id")
      .eq("project_id", projectId)
    resultError(pdsAreas.error, "Reading isolation PDS keys")
    const serviceClasses = await this.client
      .from("project_service_classes")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(serviceClasses.error, "Reading isolation service-class keys")
    const weldTypes = await this.client
      .from("project_weld_types")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(weldTypes.error, "Reading isolation weld-type keys")
    const procedures = await this.client
      .from("project_welding_procedures")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(procedures.error, "Reading isolation WPS keys")
    const welders = await this.client
      .from("welder_qualifications")
      .select("id,welder_code")
      .eq("project_id", projectId)
    resultError(welders.error, "Reading isolation welder keys")
    const welderIds = (welders.data ?? []).map((row) => row.id)
    const welderWpsLinks =
      welderIds.length === 0
        ? null
        : await this.client
            .from("welder_wps_qualifications")
            .select("welder_qualification_id,wps_id")
            .in("welder_qualification_id", welderIds)
    if (welderWpsLinks) {
      resultError(welderWpsLinks.error, "Reading isolation welder-WPS keys")
    }
    const ndeRules = await this.client
      .from("nde_matrix_rules")
      .select("service_class_id,weld_type_id,weld_location")
      .eq("project_id", projectId)
    resultError(ndeRules.error, "Reading isolation NDE keys")
    const pipingMaterials = await this.client
      .from("piping_material_records")
      .select("ident_code,trace_number")
      .eq("project_id", projectId)
    resultError(pipingMaterials.error, "Reading isolation PML keys")
    const thicknessRules = await this.client
      .from("project_thickness_flange_rules")
      .select("service_class_id,diameter_inch,flange_rating")
      .eq("project_id", projectId)
    resultError(thicknessRules.error, "Reading isolation thickness keys")
    const reworkCodes = await this.client
      .from("project_rework_codes")
      .select("code")
      .eq("project_id", projectId)
    resultError(reworkCodes.error, "Reading isolation rework keys")
    const jointCategories = await this.client
      .from("project_joint_categories")
      .select("category_code")
      .eq("project_id", projectId)
    resultError(jointCategories.error, "Reading isolation joint keys")
    const teams = await this.client
      .from("project_teams")
      .select("code")
      .eq("project_id", projectId)
    resultError(teams.error, "Reading isolation team keys")
    const punchCodes = await this.client
      .from("project_punch_codes")
      .select("code")
      .eq("project_id", projectId)
    resultError(punchCodes.error, "Reading isolation punch code keys")
    const systems = await this.client
      .from("project_systems")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(systems.error, "Reading isolation system keys")
    const subsystems = await this.client
      .from("project_subsystems")
      .select("code,system_id")
      .eq("project_id", projectId)
    resultError(subsystems.error, "Reading isolation subsystem keys")
    const lineServices = await this.client
      .from("project_line_services")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(lineServices.error, "Reading isolation line-service keys")
    const pressureUnits = await this.client
      .from("project_pressure_units")
      .select("unit")
      .eq("project_id", projectId)
    resultError(pressureUnits.error, "Reading isolation pressure-unit keys")
    const locationCategories = await this.client
      .from("project_location_categories")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(
      locationCategories.error,
      "Reading isolation location-category keys",
    )
    const locations = await this.client
      .from("project_locations")
      .select("code,category_id")
      .eq("project_id", projectId)
    resultError(locations.error, "Reading isolation location keys")
    const unitTimes = await this.client
      .from("project_unit_time_references")
      .select("activity")
      .eq("project_id", projectId)
    resultError(unitTimes.error, "Reading isolation unit-time keys")
    const progressWeights = await this.client
      .from("project_progress_weights")
      .select("phase")
      .eq("project_id", projectId)
    resultError(progressWeights.error, "Reading isolation progress keys")
    const assemblySettings = await this.client
      .from("project_assembly_settings")
      .select("project_id")
      .eq("project_id", projectId)
    resultError(assemblySettings.error, "Reading isolation assembly keys")
    const spoolingMaterialTypes = await this.client
      .from("project_spooling_material_types")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(
      spoolingMaterialTypes.error,
      "Reading isolation spooling-material-type keys",
    )
    const spoolingMaterialClasses = await this.client
      .from("project_spooling_material_classes")
      .select("external_class_code")
      .eq("project_id", projectId)
    resultError(
      spoolingMaterialClasses.error,
      "Reading isolation spooling-material-class keys",
    )
    const spoolingChecklistItems = await this.client
      .from("project_spooling_checklist_items")
      .select("code")
      .eq("project_id", projectId)
    resultError(
      spoolingChecklistItems.error,
      "Reading isolation checklist keys",
    )
    const ralCodes = await this.client
      .from("project_ral_codes")
      .select("id,line_service_id,ral_code")
      .eq("project_id", projectId)
    resultError(ralCodes.error, "Reading isolation RAL keys")
    const paintRules = await this.client
      .from("project_paint_matrix_rules")
      .select("line_service_id,ral_code_id")
      .eq("project_id", projectId)
    resultError(paintRules.error, "Reading isolation paint keys")
    const devices = await this.client
      .from("project_devices")
      .select("id,code")
      .eq("project_id", projectId)
    resultError(devices.error, "Reading isolation device keys")
    const assignments = await this.client
      .from("project_device_users")
      .select("membership_id,device_id")
      .eq("project_id", projectId)
    resultError(assignments.error, "Reading isolation assignment keys")
    const memberships = await this.client
      .from("project_memberships")
      .select("id,user_id")
      .eq("project_id", projectId)
    resultError(memberships.error, "Reading isolation member keys")
    const userIds = [...new Set((memberships.data ?? []).map((row) => row.user_id))]
    const profiles =
      userIds.length === 0
        ? null
        : await this.client
            .from("profiles")
            .select("id,email")
            .in("id", userIds)
    if (profiles) resultError(profiles.error, "Reading isolation user keys")

    const unitCodeById = indexedCodes(
      units.data ?? [],
      (row) => row.code,
      "Mapping isolation unit keys",
    )
    const areaCodeById = indexedCodes(
      areas.data ?? [],
      (row) => row.code,
      "Mapping isolation area keys",
    )
    const serviceCodeById = indexedCodes(
      serviceClasses.data ?? [],
      (row) => row.code,
      "Mapping isolation service-class keys",
    )
    const weldTypeCodeById = indexedCodes(
      weldTypes.data ?? [],
      (row) => row.code,
      "Mapping isolation weld-type keys",
    )
    const wpsCodeById = indexedCodes(
      procedures.data ?? [],
      (row) => row.code,
      "Mapping isolation WPS keys",
    )
    const welderCodeById = indexedCodes(
      welders.data ?? [],
      (row) => row.welder_code,
      "Mapping isolation welder keys",
    )
    const systemCodeById = indexedCodes(
      systems.data ?? [],
      (row) => row.code,
      "Mapping isolation system keys",
    )
    const lineServiceCodeById = indexedCodes(
      lineServices.data ?? [],
      (row) => row.code,
      "Mapping isolation line-service keys",
    )
    const locationCategoryCodeById = indexedCodes(
      locationCategories.data ?? [],
      (row) => row.code,
      "Mapping isolation location-category keys",
    )
    const ralCodeById = indexedCodes(
      ralCodes.data ?? [],
      (row) => row.ral_code,
      "Mapping isolation RAL keys",
    )
    const deviceCodeById = indexedCodes(
      devices.data ?? [],
      (row) => row.code,
      "Mapping isolation device keys",
    )
    const userIdByMembership = new Map(
      (memberships.data ?? []).map((row) => [row.id, row.user_id]),
    )
    const emailByUserId = new Map(
      (profiles?.data ?? []).map((row) => [row.id, row.email]),
    )
    const userKeyByEmail = new Map<string, string>(
      DEMO_MANIFEST.users.map((user) => [user.email, user.key]),
    )

    return {
      systemMaterialTypes: [],
      filmQuantityRules: [],
      utCalculationRules: [],
      torquingRequirements: [],
      subcontractors: (subcontractors.data ?? []).map((row) => row.code),
      units: (units.data ?? []).map((row) => row.code),
      areaClassifications: (areas.data ?? []).map(
        (row) =>
          `${relatedCode(unitCodeById, row.unit_id) ?? "missing-unit"}|${row.code}`,
      ),
      pdsAreas: (pdsAreas.data ?? []).map(
        (row) =>
          `${relatedCode(areaCodeById, row.area_classification_id) ?? "missing-area"}|${row.code}`,
      ),
      serviceClasses: (serviceClasses.data ?? []).map((row) => row.code),
      weldTypes: (weldTypes.data ?? []).map((row) => row.code),
      weldingProcedures: (procedures.data ?? []).map((row) => row.code),
      welders: (welders.data ?? []).map((row) => row.welder_code),
      welderWpsQualifications: (welderWpsLinks?.data ?? []).map((row) =>
        [
          relatedCode(welderCodeById, row.welder_qualification_id) ??
            "missing-welder",
          relatedCode(wpsCodeById, row.wps_id) ?? "missing-wps",
        ].join("|"),
      ),
      ndeMatrixRules: (ndeRules.data ?? []).map((row) =>
        [
          relatedCode(serviceCodeById, row.service_class_id) ??
            "missing-service-class",
          relatedCode(weldTypeCodeById, row.weld_type_id) ??
            "missing-weld-type",
          row.weld_location,
        ].join("|"),
      ),
      pipingMaterialRecords: (pipingMaterials.data ?? []).map(
        (row) => `${row.ident_code}|${row.trace_number}`,
      ),
      thicknessFlangeRules: (thicknessRules.data ?? []).map((row) =>
        [
          relatedCode(serviceCodeById, row.service_class_id) ??
            "missing-service-class",
          `${row.diameter_inch}in`,
          row.flange_rating,
        ].join("|"),
      ),
      reworkCodes: (reworkCodes.data ?? []).map((row) => row.code),
      jointCategories: (jointCategories.data ?? []).map(
        (row) => row.category_code,
      ),
      teams: (teams.data ?? []).map((row) => row.code),
      punchCodes: (punchCodes.data ?? []).map((row) => row.code),
      systems: (systems.data ?? []).map((row) => row.code),
      subsystems: (subsystems.data ?? []).map(
        (row) =>
          `${relatedCode(systemCodeById, row.system_id) ?? "missing-system"}|${row.code}`,
      ),
      lineServices: (lineServices.data ?? []).map((row) => row.code),
      pressureUnits: (pressureUnits.data ?? []).map((row) => row.unit),
      locationCategories: (locationCategories.data ?? []).map(
        (row) => row.code,
      ),
      locations: (locations.data ?? []).map(
        (row) =>
          `${relatedCode(locationCategoryCodeById, row.category_id) ?? "missing-category"}|${row.code}`,
      ),
      unitTimeReferences: (unitTimes.data ?? []).map(
        (row) => row.activity,
      ),
      progressWeights: [
        ...new Set((progressWeights.data ?? []).map((row) => row.phase)),
      ],
      assemblySettings: (assemblySettings.data ?? []).map(() => "assembly"),
      spoolingMaterialTypes: (spoolingMaterialTypes.data ?? []).map(
        (row) => row.code,
      ),
      spoolingMaterialClasses: (spoolingMaterialClasses.data ?? []).map(
        (row) => row.external_class_code,
      ),
      spoolingChecklistItems: (spoolingChecklistItems.data ?? []).map(
        (row) => row.code,
      ),
      ralCodes: (ralCodes.data ?? []).map((row) =>
        [
          relatedCode(lineServiceCodeById, row.line_service_id) ??
            "missing-line-service",
          row.ral_code,
        ].join("|"),
      ),
      paintMatrixRules: (paintRules.data ?? []).map((row) =>
        [
          relatedCode(lineServiceCodeById, row.line_service_id) ??
            "missing-line-service",
          relatedCode(ralCodeById, row.ral_code_id) ?? "missing-ral",
        ].join("|"),
      ),
      devices: (devices.data ?? []).map((row) => row.code),
      deviceAssignments: (assignments.data ?? []).map((row) => {
        const userId = userIdByMembership.get(row.membership_id)
        const email = userId ? emailByUserId.get(userId) : null
        const userKey =
          (email ? userKeyByEmail.get(email) : undefined) ?? "unmapped-user"
        return `${relatedCode(deviceCodeById, row.device_id) ?? "unassigned"}|${userKey}`
      }),
    }
  }

  async listAuthUsers(): Promise<readonly DemoAuthUserRecord[]> {
    return listAllAuthUsers({
      listUsers: async (parameters) => {
        const { data, error } =
          await this.client.auth.admin.listUsers(parameters)
        return {
          data: {
            users: data.users,
            nextPage: "nextPage" in data ? data.nextPage ?? null : null,
          },
          error,
        }
      },
    })
  }

  async updateAuthUser(
    userId: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<void> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      password: attributes.password,
      email_confirm: attributes.emailConfirm,
      ban_duration: attributes.banDuration,
      user_metadata: attributes.userMetadata,
    })
    resultError(error, "Updating auth user")
  }

  async createAuthUser(
    email: string,
    attributes: DemoAuthUserAttributes,
  ): Promise<{ readonly id: string | null }> {
    const { data, error } = await this.client.auth.admin.createUser({
      email,
      password: attributes.password,
      email_confirm: attributes.emailConfirm,
      ban_duration: attributes.banDuration,
      user_metadata: attributes.userMetadata,
    })
    resultError(error, "Creating auth user")
    return { id: data.user?.id ?? null }
  }

  async reconcileProfile(
    userId: string,
    profile: DemoProfileWrite,
  ): Promise<{ readonly ids: readonly string[] }> {
    const { data, error } = await this.client
      .from("profiles")
      .upsert({
        id: userId,
        email: profile.email,
        full_name: profile.fullName,
        is_platform_admin: profile.isPlatformAdmin,
      }, { onConflict: "id" })
      .select("id")
    resultError(error, "Reconciling demo profile")
    return { ids: (data ?? []).map((row) => row.id) }
  }

  async listProjects(): Promise<readonly DemoProjectRecord[]> {
    // Clean-reset demo relational data is intentionally bounded below one PostgREST page.
    const { data, error } = await this.client
      .from("projects")
      .select(
        "id,activity_code,title,owner_name,contractor_name,contract_number,maximum_transit_time_days,status,created_by,created_at",
      )
    resultError(error, "Reading projects")
    return (data ?? []).map(observedProjectRecordFromDatabase)
  }

  async createProject(
    project: DemoProjectWrite,
  ): Promise<{ readonly id: string | null }> {
    const { data, error } = await this.client
      .from("projects")
      .insert(databaseProjectWrite(project))
      .select("id")
      .single()
    resultError(error, `Creating project ${project.activityCode}`)
    return { id: data?.id ?? null }
  }

  async updateProject(
    projectId: string,
    project: DemoProjectWrite,
  ): Promise<{ readonly ids: readonly string[] }> {
    const { data, error } = await this.client
      .from("projects")
      .update(databaseProjectWrite(project))
      .eq("id", projectId)
      .select("id")
    resultError(error, `Updating project ${project.activityCode}`)
    return { ids: (data ?? []).map((row) => row.id) }
  }

  async upsertMembership(
    membership: DemoMembershipWrite,
  ): Promise<{ readonly id: string | null }> {
    const { data, error } = await this.client
      .from("project_memberships")
      .upsert(
        {
          project_id: membership.projectId,
          user_id: membership.userId,
          access_role_code: membership.accessRoleCode,
          role: membership.legacyRole,
          is_active: membership.isActive,
        },
        { onConflict: "project_id,user_id" },
      )
      .select("id")
      .single()
    resultError(error, "Upserting project membership")
    return { id: data?.id ?? null }
  }

  async replaceFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void> {
    await reconcileMembershipFunctionalRoles(this, membershipId, roleCodes)
  }

  async upsertFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[],
  ): Promise<void> {
    const result = await this.client
      .from("project_membership_functional_roles")
      .upsert(
        roleCodes.map((roleCode) => ({
          membership_id: membershipId,
          role_code: roleCode,
        })),
        { onConflict: "membership_id,role_code" },
      )
    resultError(result.error, "Upserting membership functional roles")
  }

  async listFunctionalRoles(
    membershipId: string,
  ): Promise<readonly string[]> {
    const { data, error } = await this.client
      .from("project_membership_functional_roles")
      .select("role_code")
      .eq("membership_id", membershipId)
    resultError(error, "Reading membership functional roles")
    return (data ?? []).map((row) => row.role_code)
  }

  async deleteFunctionalRoles(
    membershipId: string,
    roleCodes: readonly string[] | null,
  ): Promise<void> {
    let query = this.client
      .from("project_membership_functional_roles")
      .delete()
      .eq("membership_id", membershipId)
    if (roleCodes !== null) {
      query = query.in("role_code", [...roleCodes])
    }
    const { error } = await query
    resultError(error, "Deleting membership functional roles")
  }

  async readProfiles(): Promise<readonly DemoProfileRecord[]> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id,email,full_name,is_platform_admin")
    resultError(error, "Reading profiles")
    return (data ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      isPlatformAdmin: profile.is_platform_admin,
    }))
  }

  async readMemberships(): Promise<readonly MembershipRecord[]> {
    const { data, error } = await this.client
      .from("project_memberships")
      .select(
        "id,project_id,user_id,access_role_code,role,is_active",
      )
    resultError(error, "Reading project memberships")
    return (data ?? []).map((membership) => ({
      id: membership.id,
      projectId: membership.project_id,
      userId: membership.user_id,
      accessRoleCode: membership.access_role_code,
      legacyRole: membership.role,
      isActive: membership.is_active,
    }))
  }

  async readFunctionalRoles(): Promise<readonly FunctionalRoleRecord[]> {
    const { data, error } = await this.client
      .from("project_membership_functional_roles")
      .select("membership_id,role_code")
    resultError(error, "Reading membership functional roles")
    return (data ?? []).map((role) => ({
      membershipId: role.membership_id,
      roleCode: role.role_code,
    }))
  }

  async readSubcontractorScopes(): Promise<
    readonly SubcontractorScopeRecord[]
  > {
    const scopes = await this.client
      .from("membership_subcontractor_scopes")
      .select("membership_id,subcontractor_id")
    resultError(scopes.error, "Reading membership subcontractor scopes")
    const ids = [...new Set((scopes.data ?? []).map((row) => row.subcontractor_id))]
    if (ids.length === 0) return []
    const references = await this.client
      .from("project_subcontractors")
      .select("id,code")
      .in("id", ids)
    resultError(references.error, "Reading scoped subcontractors")
    const codesById = new Map(
      (references.data ?? []).map((row) => [row.id, row.code]),
    )
    return (scopes.data ?? []).flatMap((scope) => {
      const code = codesById.get(scope.subcontractor_id)
      return code ? [{ membershipId: scope.membership_id, code }] : []
    })
  }

  async readPdsAreaScopes(): Promise<readonly PdsAreaScopeRecord[]> {
    const scopes = await this.client
      .from("membership_pds_area_scopes")
      .select("membership_id,pds_area_id")
    resultError(scopes.error, "Reading membership PDS area scopes")
    const ids = [...new Set((scopes.data ?? []).map((row) => row.pds_area_id))]
    if (ids.length === 0) return []
    const references = await this.client
      .from("project_pds_areas")
      .select("id,code")
      .in("id", ids)
    resultError(references.error, "Reading scoped PDS areas")
    const codesById = new Map(
      (references.data ?? []).map((row) => [row.id, row.code]),
    )
    return (scopes.data ?? []).flatMap((scope) => {
      const code = codesById.get(scope.pds_area_id)
      return code ? [{ membershipId: scope.membership_id, code }] : []
    })
  }

  async countDirectProjectRows(
    table: DirectEmptyTable,
    projectId: string,
  ): Promise<number> {
    const { count, error } = await this.client
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
    resultError(error, `Counting ${table}`)
    if (count === null) throw new Error(`Counting ${table} returned no count.`)
    return count
  }

  async countChildProjectRows(
    strategy: Extract<
      EmptyTableCountStrategy,
      { readonly kind: "child" }
    >,
    projectId: string,
  ): Promise<number> {
    const parents = await this.client
      .from(strategy.parentTable)
      .select("id")
      .eq("project_id", projectId)
    resultError(parents.error, `Reading parent rows for ${strategy.table}`)
    const parentIds = (parents.data ?? []).map((row) => row.id)
    if (parentIds.length === 0) return 0
    const { count, error } = await this.client
      .from(strategy.table)
      .select("id", { count: "exact", head: true })
      .in(strategy.childForeignKey, parentIds)
    resultError(error, `Counting ${strategy.table}`)
    if (count === null) {
      throw new Error(`Counting ${strategy.table} returned no count.`)
    }
    return count
  }
}

const createGateway: DemoAdminGatewayFactory = (
  url,
  serviceRoleKey,
  options,
) =>
  new SupabaseAdminGateway(
    createClient<Database>(url, serviceRoleKey, options),
  )

export function createSupabaseDemoStandCore(
  url: string,
  serviceRoleKey: string,
  gatewayFactory: DemoAdminGatewayFactory = createGateway,
  assertTarget: (value: string) => URL = assertLocalSupabaseTarget,
): SupabaseDemoStandCore {
  assertTarget(url)
  if (serviceRoleKey.trim() === "") {
    throw new Error("A nonblank Supabase service role key is required.")
  }
  try {
    return new SupabaseDemoStandCore(
      gatewayFactory(url, serviceRoleKey, CLIENT_OPTIONS),
    )
  } catch {
    throw new Error("Creating the Supabase demo gateway failed.")
  }
}

export function createHostedSupabaseDemoStandCore(
  url: string,
  serviceRoleKey: string,
): SupabaseDemoStandCore {
  return createSupabaseDemoStandCore(
    url,
    serviceRoleKey,
    createGateway,
    assertHostedSupabaseTarget,
  )
}
