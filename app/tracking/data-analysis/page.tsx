"use client"

import { useTranslations } from "next-intl"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingDataAnalysisScreen } from "@/modules/tracking/ui/tracking-data-analysis-screen"

export default function TrackingDataAnalysisPage() {
  const t = useTranslations("tracking.routes")
  const access = useOptionalAccess()
  const activeProject = useSupabaseAuth().access
  const projectId = activeProject?.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">{t("selectProjectAnalysis")}</p>
  return <TrackingDataAnalysisScreen projectId={projectId} projectCode={activeProject.activityCode} canRecord={access?.can("tracking.event.record") ?? false} canAdmin={access?.can("project_referential.manage") ?? false} />
}
