"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingDataAnalysisScreen } from "@/modules/tracking/ui/tracking-data-analysis-screen"

export default function TrackingDataAnalysisPage() {
  const access = useOptionalAccess()
  const activeProject = useSupabaseAuth().access
  const projectId = activeProject?.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">Select a project to view Tracking Data Analysis.</p>
  return <TrackingDataAnalysisScreen projectId={projectId} projectCode={activeProject.activityCode} canRecord={access?.can("tracking.event.record") ?? false} canAdmin={access?.can("project_referential.manage") ?? false} />
}
