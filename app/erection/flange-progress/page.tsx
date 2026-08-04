"use client"

import { Suspense } from "react"
import { FlangeProgressView } from "@/components/erection/flange-progress-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function FlangeProgressPage() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Flange / Bolt Progress" description="Field spool readiness and support evidence." action="gate" />
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <FlangeProgressView />
    </Suspense>
  )
}
