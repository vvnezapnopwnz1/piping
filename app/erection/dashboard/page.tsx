"use client"

import { ErectionDashboard } from "@/components/erection-dashboard"
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export const metadata = {
  title: "Erection Dashboard | PipeQC",
  description: "Track site installation and field activities",
};

export default function DashboardPage() {
  const mode = useAppMode()
  if (mode === "demo") return <ErectionDashboard />
  return <ErectionSupabaseScreen title="Erection Dashboard" description="Live field-spool progress from the Supabase construction ledger." action="gate" />
}
