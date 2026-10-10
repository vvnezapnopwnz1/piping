"use client"

import { useTranslations } from "next-intl"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { ForbiddenScreen } from "@/components/auth/forbidden-screen"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useAccess } from "@/modules/access/ui/access-context"
import { AccessRightsScreen } from "@/modules/access/ui/access-rights-screen"

export default function AccessRightsPage() {
  const t = useTranslations("access.page")
  const { access, can } = useAccess()
  const auth = useSupabaseAuth()

  if (!can("access_rights.manage")) {
    return (
      <ForbiddenScreen
        projectCode={auth.access?.activityCode ?? "current project"}
        sectionLabel={t("sectionLabel")}
      />
    )
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
      />
      <AccessRightsScreen projectId={access.projectId} isPlatformAdmin={access.isPlatformAdmin} />
    </div>
  )
}
