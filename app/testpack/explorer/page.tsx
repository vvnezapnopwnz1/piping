"use client"

import { useTestPackTranslations } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useSearchParams } from "next/navigation"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TestPackExplorerScreen } from "@/modules/pressure-test/ui/test-pack-explorer-screen"

export default function TestPackExplorerPage() {
  const t = useTestPackTranslations()

  const projectId = useSupabaseAuth()?.access?.projectId
  const testPackId = useSearchParams().get("testPackId") ?? undefined
  return projectId ? <TestPackExplorerScreen projectId={projectId} testPackId={testPackId} /> : <p className="text-sm text-muted-foreground">{t("text.selectAProjectToOpenExplorer")}</p>
}
