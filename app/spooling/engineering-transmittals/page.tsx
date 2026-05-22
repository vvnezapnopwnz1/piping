"use client"

import { EngTransmittalList } from "@/components/spooling/eng-transmittal-list"

export default function EngineeringTransmittalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Engineering Transmittals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Incoming ISO releases from engineering. Accept to create ISO records in the workflow queue.
        </p>
      </div>
      <EngTransmittalList />
    </div>
  )
}
