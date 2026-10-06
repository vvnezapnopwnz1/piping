"use client"

import { useSearchParams } from "next/navigation"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { TestPackBuilderScreen } from "@/modules/pressure-test/ui/test-pack-builder-screen"

export default function TestPackBuilderPage() {
  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const searchParams = useSearchParams()
  const projectId = auth?.access?.projectId
  const testPackId = searchParams.get("testPackId") ?? undefined
  const viewParam = searchParams.get("view")
  const initialView = viewParam === "composition" ? "composition" : "definition"
  const isNew = searchParams.get("new") === "1"

  return projectId ? (
    <TestPackBuilderScreen
      projectId={projectId}
      canManage={access?.can("testpack.manage") ?? false}
      testPackId={testPackId}
      initialView={initialView}
      isNew={isNew}
    />
  ) : (
    <p className="text-sm text-muted-foreground">Select a project to open the Builder.</p>
  )
}
