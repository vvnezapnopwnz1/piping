"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
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
  const t = useTranslations("nde.dashboard")
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
      toast.error(t("errors.failedToLoadNdeKpis"), { description: errorDetail(err) })
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

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
        toast.error(t("errors.theNdeChartsCouldNot"), { description: errorDetail(err) }),
      )
      .finally(() => {
        if (!cancelled) setChartsLoadedProjectId(projectId)
      })
    return () => { cancelled = true }
  }, [projectId, t])

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("ndeQualityDashboard")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("realTimeMetricsDerivedFrom")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalBatches")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.totalBatches ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("openBatches")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.openBatches ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingObligations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pendingObligations ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("satisfiedObligations")}</CardTitle>
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
