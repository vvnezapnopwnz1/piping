"use client"

import { TrackingInconsistencyPanel } from "./tracking-inconsistency-panel"
import { TrackingTransitOutPanel } from "./tracking-transit-out-panel"

interface Props {
  onSelectSpool: (spoolNo: string) => void
}

export function TrackingDataAnalysisConsolidationTab({ onSelectSpool }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <TrackingInconsistencyPanel onSelectSpool={onSelectSpool} />
      <TrackingTransitOutPanel onSelectSpool={onSelectSpool} />
    </div>
  )
}
