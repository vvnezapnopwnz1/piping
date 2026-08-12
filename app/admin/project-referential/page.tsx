"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { SupabaseWpsTab } from "@/components/admin/supabase-wps-tab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <>
          <ProjectReferentialScreen
            projectId={activeProjectId}
            canManage={
              auth.access?.capabilities.includes("project_referential.manage") ?? false
            }
          />
          {/* WPS is a range qualification with its own optimistic-concurrency contract, so it
              keeps its own editor rather than joining the generic referential tabs. */}
          <Card>
            <CardHeader>
              <CardTitle>Welding Procedures (WPS)</CardTitle>
            </CardHeader>
            <CardContent>
              <SupabaseWpsTab />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Select a project to manage its referentials.
        </p>
      )}
    </div>
  )
}
