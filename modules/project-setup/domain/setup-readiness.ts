export interface ProjectSetupReadiness {
  readyForImport: boolean
  adminComplete: boolean
  missingCodes: string[]
}

export const SETUP_REQUIREMENTS = {
  material_types: { label: "Material Types", tab: "system" },
  subcontractors: { label: "Subcontractors", tab: "general" },
  pds_areas: { label: "PDS Areas", tab: "general" },
  service_classes: { label: "Service Classes", tab: "spooling" },
  weld_types: { label: "Weld Types", tab: "fabrication" },
  welding_procedures: { label: "Welding Procedures", tab: "fabrication" },
  welder_qualifications: { label: "Welder Qualifications", tab: "fabrication" },
  nde_matrix_shop: { label: "NDE Matrix — Shop", tab: "fabrication" },
  nde_matrix_assembly: { label: "NDE Matrix — Assembly", tab: "fabrication" },
  nde_matrix_field: { label: "NDE Matrix — Field", tab: "fabrication" },
  thickness_flange_rules: { label: "Thickness / Flange Rules", tab: "spooling" },
  piping_material_records: { label: "Project Piping Material List", tab: "spooling" },
  teams: { label: "Project Teams", tab: "testpack" },
  systems: { label: "Systems", tab: "testpack" },
  subsystems: { label: "Subsystems", tab: "testpack" },
  line_services: { label: "Line Services", tab: "testpack" },
  locations: { label: "Tracking Locations", tab: "tracking" },
  pressure_unit: { label: "Pressure Unit", tab: "testpack" },
  progress_weights_prefabrication: { label: "Prefabrication Weights", tab: "general" },
  progress_weights_painting: { label: "Painting Weights", tab: "general" },
  progress_weights_assembly: { label: "Assembly Weights", tab: "general" },
  progress_weights_erection: { label: "Erection Weights", tab: "general" },
  spooling_material_types: { label: "Spooling Material Types", tab: "spooling" },
  spooling_material_classes: { label: "Spooling Material Classes", tab: "spooling" },
  spooling_checklist: { label: "Spooling Checklist", tab: "spooling" },
  ral_codes: { label: "RAL Codes", tab: "painting" },
  paint_matrix: { label: "Paint Matrix", tab: "painting" },
  devices: { label: "Tracking Devices", tab: "tracking" },
} as const

export function getRequirementDetails(code: string): { label: string; tab: string } {
  if (code in SETUP_REQUIREMENTS) {
    return SETUP_REQUIREMENTS[code as keyof typeof SETUP_REQUIREMENTS]
  }
  return { label: `Unknown setup requirement (${code})`, tab: "general" }
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
