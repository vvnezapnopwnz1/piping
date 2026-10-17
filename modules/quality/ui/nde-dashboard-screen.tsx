"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
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
    <div className="space-y-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm">
        {(
          [
            ["totalBatches", kpis?.totalBatches],
            ["openBatches", kpis?.openBatches],
            ["pendingObligations", kpis?.pendingObligations],
            ["satisfiedObligations", kpis?.satisfiedObligations],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">{t(key)}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value ?? 0}</dd>
          </div>
        ))}
      </dl>

      <NdeChartsPanel data={charts} loading={chartsLoadedProjectId !== projectId} />
    </div>
  )
}
