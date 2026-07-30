"use client"

import { ForbiddenScreen } from "@/components/auth/forbidden-screen"
import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { AccessRightsView } from "@/components/admin/access-rights-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useAccess } from "@/modules/access/ui/access-context"
import { AccessRightsScreen } from "@/modules/access/ui/access-rights-screen"

export default function AccessRightsPage() {
  const appMode = useAppMode()
  if (appMode === "demo") return <AccessRightsDemoPage />
  return <SupabaseAccessRightsPage />
}

function AccessRightsDemoPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Access Rights"
        description="User × role × scope matrix for the demo project."
      />
      <AccessRightsView />
    </div>
  )
}

function SupabaseAccessRightsPage() {
  const { access } = useSupabaseAuth()
  const { can } = useAccess()
  if (!access || !can("access_rights.manage")) return <ForbiddenScreen projectCode={access?.activityCode ?? "current project"} sectionLabel="Access Rights" />
  return <div className="space-y-4"><AdminPageHeader title="Admin · Access Rights" description="Manage project memberships, access roles, functional roles and explicit subcontractor/PDS scope." /><AccessRightsScreen projectId={access.projectId} isPlatformAdmin={access.isPlatformAdmin} /></div>
}
