"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingDashboardScreen } from "@/modules/tracking/ui/tracking-dashboard-screen"

export default function TrackingPage() {
  const projectId = useSupabaseAuth().access?.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">Select a project to view Tracking.</p>
  return <TrackingDashboardScreen projectId={projectId} />
}
