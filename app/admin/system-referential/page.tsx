"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { SystemReferentialScreen } from "@/modules/project-setup/ui/system-referential-screen"

export default function SystemReferentialPage() {
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · System Referential"
        description="Cross-project referentials maintained at system-admin scope."
      />
      <SystemReferentialScreen />
    </div>
  )
}
