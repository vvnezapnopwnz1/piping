"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { ForbiddenScreen } from "@/components/auth/forbidden-screen"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useAccess } from "@/modules/access/ui/access-context"
import { AccessRightsScreen } from "@/modules/access/ui/access-rights-screen"

export default function AccessRightsPage() {
  const { access, can } = useAccess()
  const auth = useSupabaseAuth()

  if (!can("access_rights.manage")) {
    return (
      <ForbiddenScreen
        projectCode={auth.access?.activityCode ?? "current project"}
        sectionLabel="Access Rights"
      />
    )
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Access Rights"
        description="Manage project memberships, access roles, functional roles and explicit subcontractor/PDS scope."
      />
      <AccessRightsScreen projectId={access.projectId} isPlatformAdmin={access.isPlatformAdmin} />
    </div>
  )
}
