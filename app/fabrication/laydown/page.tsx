"use client"
import { Suspense } from "react"
import { LaydownView } from "@/components/fabrication/laydown-view"

export default function LaydownPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <LaydownView />
    </Suspense>
  )
}
