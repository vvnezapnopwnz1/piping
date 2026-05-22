"use client"

import { SpoolingTransmittalView } from "@/components/spooling/spooling-transmittal-view"

export default function SpoolingTransmittalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Spooling Transmittal</h1>
        <p className="mt-1 text-sm text-slate-500">
          Outbound ISO batches dispatched to Fabrication. Compose from Released ISOs.
        </p>
      </div>
      <SpoolingTransmittalView />
    </div>
  )
}
