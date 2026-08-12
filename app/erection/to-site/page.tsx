"use client"

import { ErectionStageScreen } from "@/modules/construction/ui/erection/erection-stage-screen"

export default function ToSitePage() {
  return (
    <ErectionStageScreen
      stage="to_site"
      title="To Site"
      description="Record the field delivery milestone for an accepted spool. Every later erection step depends on it."
    />
  )
}
