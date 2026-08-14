"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { ProjectReferentialScreen } from "@/modules/project-setup/ui/project-referential-screen"

export default function ProjectReferentialPage() {
  const auth = useSupabaseAuth()
  const activeProjectId = auth?.access?.projectId

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Project Referential"
        description="Project-level master data for spooling, fabrication, erection, testpack, tracking, and painting."
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
          Select a project to manage its referentials.
        </p>
      )}
    </div>
  )
}
