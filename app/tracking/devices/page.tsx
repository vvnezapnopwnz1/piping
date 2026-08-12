"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { TrackingDeviceScreen } from "@/modules/tracking/ui/tracking-device-screen"

export default function TrackingDevicesPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">Select a project to view mobile device usage.</p>
  return <TrackingDeviceScreen projectId={projectId} canManage={access.can("project_referential.manage")} />
}
