"use client"

import { AlertOctagon } from "lucide-react"
import type { NdeBatch } from "@/store"

interface PenaltyShootBannerProps {
  batch: NdeBatch
}

export function PenaltyShootBanner({ batch }: PenaltyShootBannerProps) {
  const penaltyEvent = batch.history.find((h) => h.title === "PENALTY SHOOT triggered")
  if (!penaltyEvent) return null

  return (
    <div className="rounded-md border-2 border-red-400 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-red-900 uppercase tracking-wide">
            Penalty Shoot Triggered
          </div>
          <div className="mt-1 text-xs text-red-800">{penaltyEvent.detail}</div>
          <div className="mt-2 text-[11px] text-red-700">
            All remaining welds in this batch from the same welder × NDE category have been
            automatically selected (status SS) — no human intervention required.
          </div>
        </div>
      </div>
    </div>
  )
}
