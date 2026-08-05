"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { FlangeManagementScreen } from "@/modules/flange/ui/flange-management-screen"

export default function FlangePage() {
  const auth = useSupabaseAuth()
  const projectId = auth?.access?.projectId
  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to manage flange progress.</p>
  return <FlangeManagementScreen projectId={projectId} canManage={false} mode="browse" />
}
