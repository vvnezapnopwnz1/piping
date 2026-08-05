"use client"

import { ErectionReadinessScreen } from "@/modules/construction/ui/erection/erection-readiness-screen"

export default function FieldQCReleasePage() {
  return (
    <ErectionReadinessScreen
      title="Field QC Release"
      description="Read-only RFT gate; no manual release flag is stored."
    />
  )
}
