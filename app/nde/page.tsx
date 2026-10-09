"use client"

import { useTranslations } from "next-intl"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeBatchScreen } from "@/modules/quality/ui/nde-batch-screen"

export default function NDEPage() {
  const t = useTranslations("nde.pages")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground p-6 text-sm">{t("selectAProjectToManage")}</p>
    )
  }

  return <NdeBatchScreen projectId={projectId} />
}
