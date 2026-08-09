"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { TestPackBuilderScreen } from "@/modules/pressure-test/ui/test-pack-builder-screen"

export default function TestPackBuilderPage() {
  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const projectId = auth?.access?.projectId
  return projectId ? <TestPackBuilderScreen projectId={projectId} canManage={access?.can("testpack.manage") ?? false} /> : <p className="text-sm text-muted-foreground">Select a project to open the Builder.</p>
}
