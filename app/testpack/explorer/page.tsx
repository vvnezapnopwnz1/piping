"use client"

import { useSearchParams } from "next/navigation"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TestPackExplorerScreen } from "@/modules/pressure-test/ui/test-pack-explorer-screen"

export default function TestPackExplorerPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  const testPackId = useSearchParams().get("testPackId") ?? undefined
  return projectId ? <TestPackExplorerScreen projectId={projectId} testPackId={testPackId} /> : <p className="text-sm text-muted-foreground">Select a project to open Explorer.</p>
}
