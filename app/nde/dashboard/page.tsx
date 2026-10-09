"use client"

import { useTranslations } from "next-intl"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeDashboardScreen } from "@/modules/quality/ui/nde-dashboard-screen"

export default function NdeDashboardPage() {
  const t = useTranslations("nde.pages")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground p-6 text-sm">{t("selectAProjectToView")}</p>
    )
  }

  return <NdeDashboardScreen projectId={projectId} />
}
