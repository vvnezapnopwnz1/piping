"use client"

import { useTranslations } from "next-intl"
import { ErectionReadinessScreen } from "@/modules/construction/ui/erection/erection-readiness-screen"

export default function FieldQCReleasePage() {
  const t = useTranslations("erection.pages")
  return (
    <ErectionReadinessScreen
      title={t("fieldQcRelease")}
      description={t("readOnlyRftGateNo")}
    />
  )
}
