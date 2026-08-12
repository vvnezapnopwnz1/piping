"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TestPackDashboard } from "@/modules/pressure-test/ui/test-pack-dashboard"

export default function TestPackPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <TestPackDashboard projectId={projectId} /> : <p className="text-sm text-muted-foreground">Select a project to view Test Packs.</p>
}
