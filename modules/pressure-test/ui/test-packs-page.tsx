"use client"

import { usePathname, useSearchParams } from "next/navigation"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { legacyAddressToTarget } from "./legacy-address"
import { useTestPackTranslations } from "./test-pack-i18n"
import { TestPacksScreen } from "./test-packs-screen"

/** Every Test Packs address (the page itself and the old ones) renders the one screen, on the step the address meant. */
export function TestPacksPage() {
  const t = useTestPackTranslations()
  const projectId = useSupabaseAuth()?.access?.projectId
  const target = legacyAddressToTarget(usePathname(), useSearchParams())
  return projectId ? <TestPacksScreen projectId={projectId} initialStep={target.step} /> : <p className="text-sm text-muted-foreground">{t("text.selectAProjectToViewTestPacks")}</p>
}
