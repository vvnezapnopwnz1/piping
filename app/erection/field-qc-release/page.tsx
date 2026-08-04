"use client"

import { Suspense } from "react"
import { FieldQCReleaseView } from "@/components/erection/field-qc-release-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function FieldQCReleasePage() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Field QC Release" description="Read-only RFT gate; no manual release flag is stored." action="gate" />
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <FieldQCReleaseView />
    </Suspense>
  )
}
