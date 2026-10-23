"use client"

import { useTranslations } from "next-intl"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { EngineeringBrowser } from "@/modules/engineering/ui/engineering-browser"

export default function SpoolingBrowsePage() {
  const t = useTranslations("spooling.pages")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">{t("selectBrowse")}</p>
    )
  }

  return <EngineeringBrowser projectId={projectId} />
}
