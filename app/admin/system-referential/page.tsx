"use client"

import { useTranslations } from "next-intl"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { SystemReferentialScreen } from "@/modules/project-setup/ui/system-referential-screen"

export default function SystemReferentialPage() {
  const t = useTranslations("projectSetup.adminPages")

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("systemReferentialTitle")}
        description={t("systemReferentialDesc")}
      />
      <SystemReferentialScreen />
    </div>
  )
}

