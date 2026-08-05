"use client"

import { ErectionReadinessScreen } from "@/modules/construction/ui/erection/erection-readiness-screen"

export default function ErectionDashboardPage() {
  return (
    <ErectionReadinessScreen
      title="Erection Dashboard"
      description="Live field-spool progress from the Supabase construction ledger."
    />
  )
}
