"use client"

import { useLocale, useTranslations } from "next-intl"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"

import { formatWeekLabel } from "@/i18n/format"
import { codeLabel, type CodesTranslator } from "@/i18n/translator"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  hasFabricationChartData,
  toFabricationCurveSeries,
  toPdsAreaProgressSeries,
  toStageDistributionSeries,
} from "../../domain/fabrication-charts"
import type { FabricationChartData } from "../../infrastructure/supabase-construction-repository"

/** Series labels in the current language: shop stages and progress words from `codes`. */
function chartConfigs(tc: CodesTranslator) {
  const curveConfig = {
    startFab: { label: tc("fabricationStage.start_fab"), color: "var(--info-fg)" },
    fabricated: { label: tc("fabricationStage.fabricated"), color: "var(--primary)" },
    qcRelease: { label: tc("fabricationStage.qc_release"), color: "var(--warning-fg)" },
    laydown: { label: tc("fabricationStage.laydown"), color: "var(--success-fg)" },
  } satisfies ChartConfig
  const areaConfig = {
    complete: { label: tc("status.complete"), color: "var(--success-fg)" },
    inProgress: { label: tc("status.in_progress"), color: "var(--info-fg)" },
    notStarted: { label: tc("status.not_started"), color: "var(--neutral-fg)" },
  } satisfies ChartConfig
  return { curveConfig, areaConfig }
}

const stageColors: Record<string, string> = {
  not_started: "var(--neutral-fg)",
  start_fab: "var(--info-fg)",
  material_check: "var(--warning-fg)",
  fabricated: "var(--primary)",
  qc_release: "var(--warning-fg)",
  sent_to_paint: "var(--info-fg)",
  painted: "var(--success-fg)",
  final_qc: "var(--success-fg)",
  laydown: "var(--success-fg)",
}

function EmptyChart({ detail }: { detail: string }) {
  const t = useTranslations("fabrication.charts")
  return (
    <div className="text-muted-foreground flex h-72 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm">
      <div>
        <p className="font-medium">{t("noFabricationProgressRecordedYet")}</p>
        <p className="mt-1 text-xs">{detail}</p>
      </div>
    </div>
  )
}

export function FabricationChartsPanel({
  data,
  loading,
}: {
  data: FabricationChartData | null
  loading: boolean
}) {
  const t = useTranslations("fabrication.charts")
  const tc = useTranslations("codes")
  const locale = useLocale()
  const { curveConfig, areaConfig } = chartConfigs(tc)
  if (loading || !data) {
    return <Skeleton className="h-[38rem] w-full" />
  }

  const curve = toFabricationCurveSeries(data.curve, (week) => formatWeekLabel(week, locale))
  const stages = toStageDistributionSeries(data.stages, (code) => codeLabel(tc, "fabricationStage", code))
  const areas = toPdsAreaProgressSeries(data.pdsAreas)
  const hasCurve = hasFabricationChartData(curve)
  const hasStages = stages.some((stage) => stage.count > 0)
  const hasAreas = areas.some((area) => area.complete + area.inProgress + area.notStarted > 0)

  return (
    <section className="space-y-4" aria-label={t("fabricationProgressCharts")}>
      <Card>
        <CardHeader>
          <CardTitle>{t("cumulativeFabricationProgress")}</CardTitle>
          <CardDescription>
            {t("actualCountOfSpoolsThat")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCurve ? (
            <ChartContainer config={curveConfig} className="h-80 w-full">
              <LineChart data={curve} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="startFab" type="monotone" stroke="var(--color-startFab)" strokeWidth={2} dot={false} />
                <Line dataKey="fabricated" type="monotone" stroke="var(--color-fabricated)" strokeWidth={2} dot={false} />
                <Line dataKey="qcRelease" type="monotone" stroke="var(--color-qcRelease)" strokeWidth={2} dot={false} />
                <Line dataKey="laydown" type="monotone" stroke="var(--color-laydown)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart detail={t("recordFabricationActivityToSee")} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("stageDistribution")}</CardTitle>
            <CardDescription>{t("currentSpoolPositionInFabrication")}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasStages ? (
              <ChartContainer config={{ count: { label: "Spools" } }} className="h-80 w-full">
                <BarChart data={stages} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={104} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={4}>
                    {stages.map((stage) => (
                      <Cell key={stage.stage} fill={stageColors[stage.stage] ?? "var(--neutral-fg)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart detail={t("thePipelineDistributionAppearsAfter")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("progressByPdsArea")}</CardTitle>
            <CardDescription>{t("completedActiveAndUntouchedSpools")}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasAreas ? (
              <ChartContainer config={areaConfig} className="h-80 w-full">
                <BarChart data={areas} margin={{ left: 4, right: 16 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="area" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="complete" stackId="progress" fill="var(--color-complete)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" stackId="progress" fill="var(--color-inProgress)" />
                  <Bar dataKey="notStarted" stackId="progress" fill="var(--color-notStarted)" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart detail={t("areaProgressAppearsAfterA")} />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
