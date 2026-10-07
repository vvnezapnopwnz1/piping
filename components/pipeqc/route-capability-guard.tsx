"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"

import { ForbiddenScreen } from "@/components/auth/forbidden-screen"
import type { NavKey } from "@/config/navigation"
import { requiredCapabilityForPath } from "@/config/route-capabilities"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useAccess } from "@/modules/access/ui/access-context"

import { useNavName } from "./nav-name"

/** The navigation title of the section a capability guards (keys of the `nav` messages). */
const CAPABILITY_SECTION_LABELS = {
  "project.view": "project",
  "project.definition.manage": "projectDefinition",
  "system_referential.view": "systemReferential",
  "system_referential.manage": "systemReferential",
  "project_referential.view": "projectReferential",
  "project_referential.manage": "projectReferential",
  "access_rights.manage": "accessRights",
  "spooling.view": "spooling",
  "spooling.manage": "spooling",
  "fabrication.view": "fabrication",
  "fabrication.progress.record": "fabrication",
  "fabrication.qc.release": "fabrication",
  "nde.view": "nde",
  "nde.batch.manage": "nde",
  "nde.result.record": "nde",
  "erection.view": "erection",
  "erection.progress.record": "erection",
  "tracking.view": "tracking",
  "tracking.event.record": "tracking",
  "testpack.view": "testpack",
  "testpack.manage": "testpack",
  "flange.view": "flangeManagement",
  "flange.manage": "flangeManagement",
  "reports.view": "reports",
  "reports.export": "reports",
  "settings.view": "settings",
  "imports.view": "imports",
  "imports.manage": "imports",
} as const satisfies Record<string, NavKey>

export function RouteCapabilityGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth.forbidden")
  const name = useNavName()
  const pathname = usePathname()
  const { can } = useAccess()
  const { access } = useSupabaseAuth()
  const capability = requiredCapabilityForPath(pathname)

  if (!capability || can(capability)) {
    return children
  }

  return (
    <ForbiddenScreen
      projectCode={access?.activityCode ?? t("currentProject")}
      sectionLabel={name(CAPABILITY_SECTION_LABELS[capability])}
    />
  )
}
