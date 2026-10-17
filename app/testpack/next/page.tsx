"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { SpikeTestPacksNext } from "@/modules/pressure-test/ui/spike-test-packs-next"

// THROWAWAY SPIKE (2026-10-17): the "list left, step timeline right" Test Packs screen, on real data,
// to feel whether it is easier to use. Not the design; nothing else links here.
export default function TestPackNextPage() {
  const projectId = useSupabaseAuth()?.access?.projectId
  return projectId ? <SpikeTestPacksNext projectId={projectId} /> : null
}
