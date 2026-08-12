"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { ProgressWeightsScreen } from "@/modules/project-setup/ui/progress-weights-screen"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

export default function ProgressWeightsPage() {
  const { access } = useSupabaseAuth()
  const activeProjectId = access?.projectId

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Progress Weights"
        description="Configure progress weight allocations across project phases."
      />

      {activeProjectId ? (
        <ProgressWeightsScreen
          projectId={activeProjectId}
          canManage={access?.capabilities.includes("project_referential.manage") ?? false}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
          Select a project to manage its progress weights.
        </p>
      )}
    </div>
  )
}
