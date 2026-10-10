"use client"

import { useTranslations } from "next-intl"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { ProjectReferentialScreen } from "@/modules/project-setup/ui/project-referential-screen"

export default function ProjectReferentialPage() {
  const t = useTranslations("projectSetup.adminPages")
  const auth = useSupabaseAuth()
  const activeProjectId = auth?.access?.projectId

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("projectReferentialTitle")}
        description={t("projectReferentialDesc")}
      />

      {activeProjectId ? (
        <ProjectReferentialScreen
          projectId={activeProjectId}
          canManage={
            auth.access?.capabilities.includes("project_referential.manage") ?? false
          }
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("selectProjectReferential")}
        </p>
      )}
    </div>
  )
}

