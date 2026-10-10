"use client"

import { useTranslations } from "next-intl"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { ProgressWeightsScreen } from "@/modules/project-setup/ui/progress-weights-screen"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

export default function ProgressWeightsPage() {
  const t = useTranslations("projectSetup.adminPages")
  const { access } = useSupabaseAuth()
  const activeProjectId = access?.projectId

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("progressWeightsTitle")}
        description={t("progressWeightsDesc")}
      />

      {activeProjectId ? (
        <ProgressWeightsScreen
          projectId={activeProjectId}
          canManage={access?.capabilities.includes("project_referential.manage") ?? false}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("selectProjectWeights")}
        </p>
      )}
    </div>
  )
}

