export interface ProjectSetupReadiness {
  readyForImport: boolean
  adminComplete: boolean
  missingCodes: string[]
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


