"use client"

import { Lock } from "lucide-react"
import { usePmWriteLock } from "@/lib/pm-write-lock"

export function PmWriteLockBanner() {
  const { locked, reason } = usePmWriteLock()
  if (!locked) return null
  return (
    <div className="mx-4 mt-3 px-3 py-2 rounded border border-slate-300 bg-slate-100 flex items-center gap-2 flex-shrink-0">
      <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
      <p className="text-xs text-slate-600">{reason}</p>
    </div>
  )
}
