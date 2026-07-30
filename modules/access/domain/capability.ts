export const PROJECT_ACCESS_ROLES = [
  "project_admin",
  "site_admin",
  "project_editor",
  "subcontractor",
  "project_reader",
] as const

export type ProjectAccessRole = (typeof PROJECT_ACCESS_ROLES)[number]

export const FUNCTIONAL_ROLES = [
  "project_manager",
  "qc_engineer",
  "nde_inspector",
  "spooling_team",
  "fabrication_contributor",
  "erection_contributor",
  "tracking_operator",
] as const

export type FunctionalRole = (typeof FUNCTIONAL_ROLES)[number]

export const CAPABILITIES = [
  "project.view",
  "project.definition.manage",
  "system_referential.view",
  "system_referential.manage",
  "project_referential.view",
  "project_referential.manage",
  "access_rights.manage",
  "spooling.view",
  "spooling.manage",
  "fabrication.view",
  "fabrication.progress.record",
  "fabrication.qc.release",
  "nde.view",
  "nde.batch.manage",
  "nde.result.record",
  "erection.view",
  "erection.progress.record",
  "tracking.view",
  "tracking.event.record",
  "testpack.view",
  "testpack.manage",
  "flange.view",
  "flange.manage",
  "reports.view",
  "reports.export",
  "settings.view",
] as const

export type Capability = (typeof CAPABILITIES)[number]
