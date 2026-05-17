"use client"

import { Suspense } from "react"
import { QCReleaseView } from "@/components/fabrication/qc-release-view"

export default function QCReleasePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <QCReleaseView />
    </Suspense>
  )
}
