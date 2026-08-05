"use client"

import { ErectionReadinessScreen } from "@/modules/construction/ui/erection/erection-readiness-screen"

export default function FlangeProgressPage() {
  return (
    <ErectionReadinessScreen
      title="Flange / Bolt Progress"
      description="Field spool readiness and support evidence."
      note="Flange and bolt-up progress itself is built in Track 09; this route shows the erection readiness it will hang off."
    />
  )
}
