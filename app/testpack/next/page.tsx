"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TestPacksScreen } from "@/modules/pressure-test/ui/test-packs-screen"

// Temporary address for the new screen until the old /testpack pages are switched over (plan task 7).
export default function TestPackNextPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <TestPacksScreen projectId={projectId} /> : null
}
