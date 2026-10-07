"use client"

import { useTranslations } from "next-intl"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { FlangeManagementScreen } from "@/modules/flange/ui/flange-management-screen"

export default function FlangePage() {
  const t = useTranslations("flange.pages")
  const auth = useSupabaseAuth()
  const projectId = auth?.access?.projectId
  if (!projectId) return <p className="text-sm text-muted-foreground">{t("selectAProjectToManage")}</p>
  return <FlangeManagementScreen projectId={projectId} canManage={false} mode="browse" />
}
