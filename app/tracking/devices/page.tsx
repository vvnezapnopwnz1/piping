"use client"

import { useTranslations } from "next-intl"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { TrackingDeviceScreen } from "@/modules/tracking/ui/tracking-device-screen"

export default function TrackingDevicesPage() {
  const t = useTranslations("tracking.routes")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId
  if (!projectId) return <p className="p-6 text-sm text-muted-foreground">{t("selectProjectDevices")}</p>
  return <TrackingDeviceScreen projectId={projectId} canManage={access.can("project_referential.manage")} />
}
