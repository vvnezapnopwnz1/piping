"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { SpikeNdeNext } from "@/modules/quality/ui/spike-nde-next"

// THROWAWAY SPIKE (2026-10-17): the NDE "work queue" screen on real data. Not the design; nothing links here.
export default function NdeNextPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <SpikeNdeNext projectId={projectId} /> : null
}
