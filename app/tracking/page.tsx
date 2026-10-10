"use client"

import { useTranslations } from "next-intl"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingDashboardScreen } from "@/modules/tracking/ui/tracking-dashboard-screen"

export default function TrackingPage() {
  const t = useTranslations("tracking.routes")
  const projectId = useSupabaseAuth().access?.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">{t("selectProject")}</p>
  return <TrackingDashboardScreen projectId={projectId} />
}
