"use client"

import { usePathname } from "next/navigation"

import { ForbiddenScreen } from "@/components/auth/forbidden-screen"
import { requiredCapabilityForPath } from "@/config/route-capabilities"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useAccess } from "@/modules/access/ui/access-context"

const CAPABILITY_SECTION_LABELS = {
  "project.view": "Project",
  "project.definition.manage": "Project Definition",
  "system_referential.view": "System Referential",
  "system_referential.manage": "System Referential",
  "project_referential.view": "Project Referential",
  "project_referential.manage": "Project Referential",
  "access_rights.manage": "Access Rights",
  "spooling.view": "Spooling",
  "spooling.manage": "Spooling",
  "fabrication.view": "Fabrication",
  "fabrication.progress.record": "Fabrication",
  "fabrication.qc.release": "Fabrication",
  "nde.view": "NDE",
  "nde.batch.manage": "NDE",
  "nde.result.record": "NDE",
  "erection.view": "Erection",
  "erection.progress.record": "Erection",
  "tracking.view": "Tracking",
  "tracking.event.record": "Tracking",
  "testpack.view": "Testpack",
  "testpack.manage": "Testpack",
  "flange.view": "Flange Management",
  "flange.manage": "Flange Management",
  "reports.view": "Reports",
  "reports.export": "Reports",
  "settings.view": "Settings",
  "imports.view": "Imports",
  "imports.manage": "Imports",
} as const

export function RouteCapabilityGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { can } = useAccess()
  const { access } = useSupabaseAuth()
  const capability = requiredCapabilityForPath(pathname)

  if (!capability || can(capability)) {
    return children
  }

  return (
    <ForbiddenScreen
      projectCode={access?.activityCode ?? "current project"}
      sectionLabel={CAPABILITY_SECTION_LABELS[capability]}
    />
  )
}
