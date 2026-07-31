"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { ProgressWeightsScreen } from "@/modules/project-setup/ui/progress-weights-screen"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

export default function ProgressWeightsPage() {
  const { access } = useSupabaseAuth()
  const projectId = access?.projectId || "proj-1"

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Progress Weights"
        description="Configure progress weight allocations across project phases."
      />

      <ProgressWeightsScreen projectId={projectId} />
    </div>
  )
}
