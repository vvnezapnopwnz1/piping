"use client"

import { Suspense } from "react"
import { PaintView } from "@/components/fabrication/paint-view"

export default function PaintPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <PaintView />
    </Suspense>
  )
}
