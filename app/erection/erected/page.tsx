"use client"

import { ErectionStageScreen } from "@/modules/construction/ui/erection/erection-stage-screen"

export default function ErectedPage() {
  return (
    <ErectionStageScreen
      stage="erected"
      title="Erected"
      description="Record the erection milestone for a spool that has reached site."
    />
  )
}
