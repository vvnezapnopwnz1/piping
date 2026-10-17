"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { NdeScreen } from "@/modules/quality/ui/nde-screen"

// Temporary address for the new NDE screen until /nde is switched over (plan task 9).
export default function NdeNextPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <NdeScreen projectId={projectId} /> : null
}
