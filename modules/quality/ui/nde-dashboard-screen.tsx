"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { NdeChartsPanel } from "./nde-charts-panel"
import {
  loadNdeChartData,
  loadNdeKpis,
  type NdeChartData,
  type NdeKpis,
} from "../infrastructure/supabase-quality-repository"

export function NdeDashboardScreen({ projectId }: { projectId: string }) {
  const [kpis, setKpis] = useState<NdeKpis | null>(null)
  const [charts, setCharts] = useState<NdeChartData | null>(null)
  const [chartsLoadedProjectId, setChartsLoadedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient()
      const data = await loadNdeKpis(client, projectId)
      setKpis(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load NDE KPIs")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    let cancelled = false
    void loadNdeChartData(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setCharts(data)
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "The NDE charts could not be loaded."),
      )
      .finally(() => {
        if (!cancelled) setChartsLoadedProjectId(projectId)
      })
    return () => { cancelled = true }
  }, [projectId])

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">NDE Quality Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Real-time metrics derived from project NDE batches and obligations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalBatches ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.openBatches ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendingObligations ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfied Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.satisfiedObligations ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <NdeChartsPanel data={charts} loading={chartsLoadedProjectId !== projectId} />
    </div>
  )
}
