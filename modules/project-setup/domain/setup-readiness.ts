export interface ProjectSetupReadiness {
  readyForImport: boolean
  adminComplete: boolean
  missingCodes: string[]
}

export const SETUP_REQUIREMENTS = {
  material_types: { code: "material_types", tab: "system" },
  subcontractors: { code: "subcontractors", tab: "general" },
  pds_areas: { code: "pds_areas", tab: "general" },
  service_classes: { code: "service_classes", tab: "spooling" },
  weld_types: { code: "weld_types", tab: "fabrication" },
  welding_procedures: { code: "welding_procedures", tab: "fabrication" },
  welder_qualifications: { code: "welder_qualifications", tab: "fabrication" },
  nde_matrix_shop: { code: "nde_matrix_shop", tab: "fabrication" },
  nde_matrix_assembly: { code: "nde_matrix_assembly", tab: "fabrication" },
  nde_matrix_field: { code: "nde_matrix_field", tab: "fabrication" },
  thickness_flange_rules: { code: "thickness_flange_rules", tab: "spooling" },
  piping_material_records: { code: "piping_material_records", tab: "spooling" },
  teams: { code: "teams", tab: "testpack" },
  systems: { code: "systems", tab: "testpack" },
  subsystems: { code: "subsystems", tab: "testpack" },
  line_services: { code: "line_services", tab: "testpack" },
  locations: { code: "locations", tab: "tracking" },
  pressure_unit: { code: "pressure_unit", tab: "testpack" },
  progress_weights_prefabrication: { code: "progress_weights_prefabrication", tab: "general" },
  progress_weights_painting: { code: "progress_weights_painting", tab: "general" },
  progress_weights_assembly: { code: "progress_weights_assembly", tab: "general" },
  progress_weights_erection: { code: "progress_weights_erection", tab: "general" },
  spooling_material_types: { code: "spooling_material_types", tab: "spooling" },
  spooling_material_classes: { code: "spooling_material_classes", tab: "spooling" },
  spooling_checklist: { code: "spooling_checklist", tab: "spooling" },
  ral_codes: { code: "ral_codes", tab: "painting" },
  paint_matrix: { code: "paint_matrix", tab: "painting" },
  devices: { code: "devices", tab: "tracking" },
} as const

export function getRequirementDetails(code: string): { code: string; tab: string } {
  if (code in SETUP_REQUIREMENTS) {
    return SETUP_REQUIREMENTS[code as keyof typeof SETUP_REQUIREMENTS]
  }
  return { code, tab: "general" }
}

const GATE_B_REQUIRED_CODES = new Set([
  "material_types",
  "subcontractors",
  "pds_areas",
  "service_classes",
  "weld_types",
  "welding_procedures",
  "welder_qualifications",
  "nde_matrix_shop",
  "nde_matrix_assembly",
  "nde_matrix_field",
  "thickness_flange_rules",
  "piping_material_records",
])

export function evaluateReadinessStatus(missingCodes: string[]): {
  isGateBReady: boolean
  isAdminDone: boolean
} {
  const isGateBReady = !missingCodes.some((code) => GATE_B_REQUIRED_CODES.has(code))
  const isAdminDone = missingCodes.length === 0
  return { isGateBReady, isAdminDone }
}

