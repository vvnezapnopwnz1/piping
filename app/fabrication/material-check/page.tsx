"use client"

import { Suspense } from "react"
import { MaterialCheckView } from "@/components/fabrication/material-check-view"

export default function MaterialCheckPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <MaterialCheckView />
    </Suspense>
  )
}
