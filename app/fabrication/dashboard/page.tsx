"use client"

import { useTranslations } from "next-intl"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { FabricationOverview } from "@/modules/construction/ui/fabrication/fabrication-overview"

export default function FabricationDashboardPage() {
  const t = useTranslations("fabrication.dashboardPage")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("selectAProjectToSee")}
      </p>
    )
  }

  return <FabricationOverview projectId={projectId} />
}
