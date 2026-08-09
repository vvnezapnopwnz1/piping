import type { Capability } from "@/modules/access/domain/capability"

export const ROUTE_CAPABILITIES = [
  ["/admin/system-referential", "system_referential.manage"],
  ["/admin/project-definition", "project.definition.manage"],
  ["/admin/project-referential", "project_referential.manage"],
  ["/admin/access-rights", "access_rights.manage"],
  ["/admin/import-settings", "project_referential.manage"],
  ["/admin/imports", "imports.view"],
  ["/admin", "project_referential.manage"],
  ["/spooling", "spooling.view"],
  ["/fabrication/weld-progress", "fabrication.progress.record"],
  ["/fabrication/material-check", "fabrication.progress.record"],
  ["/fabrication/qc-release", "fabrication.qc.release"],
  ["/fabrication/pwht-release", "fabrication.qc.release"],
  ["/fabrication", "fabrication.view"],
  ["/erection/flange-progress", "flange.view"],
  ["/erection", "erection.view"],
  ["/tracking/data-analysis", "tracking.view"],
  ["/tracking/print-barcodes", "tracking.view"],
  ["/tracking/devices", "tracking.view"],
  ["/tracking", "tracking.view"],
  ["/nde", "nde.view"],
  ["/testpack", "testpack.view"],
  ["/flange", "flange.view"],
  ["/reports", "reports.view"],
  ["/settings", "settings.view"],
  ["/documentation", "settings.view"],
] as const satisfies readonly (readonly [string, Capability])[]

export function requiredCapabilityForPath(pathname: string): Capability | null {
  for (const [prefix, capability] of ROUTE_CAPABILITIES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return capability
    }
  }

  return null
}
