"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { FlangeManagementScreen } from "@/modules/flange/ui/flange-management-screen"

export default function FlangeProgressPage() {
  const auth = useSupabaseAuth()
  const projectId = auth?.access?.projectId
  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to record flange progress.</p>
  return <FlangeManagementScreen projectId={projectId} canManage={auth.access?.capabilities.includes("flange.manage") ?? false} mode="operate" />
}
