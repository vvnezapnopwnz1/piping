"use client"

import { Suspense } from "react"
import { FieldQCReleaseView } from "@/components/erection/field-qc-release-view"

export default function FieldQCReleasePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <FieldQCReleaseView />
    </Suspense>
  )
}
