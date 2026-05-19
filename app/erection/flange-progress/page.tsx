"use client"

import { Suspense } from "react"
import { FlangeProgressView } from "@/components/erection/flange-progress-view"

export default function FlangeProgressPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <FlangeProgressView />
    </Suspense>
  )
}
