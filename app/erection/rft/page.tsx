"use client"

import { ErectionReadinessScreen } from "@/modules/construction/ui/erection/erection-readiness-screen"

export default function RftPage() {
  return (
    <ErectionReadinessScreen
      title="Ready For Test"
      description="Auto-derived from field weld, support, NDE and PWHT evidence."
    />
  )
}
