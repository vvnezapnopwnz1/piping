"use client"

import { useTestPackTranslations } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TestPackDashboard } from "@/modules/pressure-test/ui/test-pack-dashboard"

export default function TestPackPage() {
  const t = useTestPackTranslations()

  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <TestPackDashboard projectId={projectId} /> : <p className="text-sm text-muted-foreground">{t("text.selectAProjectToViewTestPacks")}</p>
}
