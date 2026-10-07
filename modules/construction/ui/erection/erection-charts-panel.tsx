"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale, useTranslations } from "next-intl"

import { formatWeekLabel } from "@/i18n/format"
import { codeLabel, type CodesTranslator } from "@/i18n/translator"
import { toErectionBlockerSeries, toErectionCurveSeries, toErectionStageSeries } from "../../domain/erection-charts"
import type { ErectionChartData } from "../../infrastructure/supabase-erection-repository"

/** Series labels in the current language: the field stages from `codes`. */
const curveConfigFor = (tc: CodesTranslator) => ({ toSite: { label: tc("erectionStage.to_site"), color: "var(--info-fg)" }, erected: { label: tc("erectionStage.erected"), color: "var(--primary)" }, weldedBolted: { label: tc("erectionStage.welded_bolted"), color: "var(--warning-fg)" }, supported: { label: tc("erectionStage.supported"), color: "var(--success-fg)" }, rft: { label: tc("erectionStage.rft"), color: "var(--success-fg)" } }) satisfies ChartConfig
const stageColors: Record<string, string> = { not_started: "var(--neutral-fg)", to_site: "var(--info-fg)", erected: "var(--primary)", welded_bolted: "var(--warning-fg)", supported: "var(--success-fg)", rft: "var(--success-fg)" }

function Empty({ detail }: { detail: string }) {
  const t = useTranslations("erection.charts")
  return <div className="text-muted-foreground flex h-72 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm"><div><p className="font-medium">{t("noErectionProgressRecordedYet")}</p><p className="mt-1 text-xs">{detail}</p></div></div>
}

export function ErectionChartsPanel({ data, loading }: { data: ErectionChartData | null; loading: boolean }) {
  const t = useTranslations("erection.charts")
  const tc = useTranslations("codes")
  const locale = useLocale()
  const curveConfig = curveConfigFor(tc)
  if (loading || !data) return <Skeleton className="h-[38rem] w-full" />
  const curve = toErectionCurveSeries(data.curve, (week) => formatWeekLabel(week, locale))
  const stages = toErectionStageSeries(data.stages, (code) => codeLabel(tc, "erectionStage", code))
  const blockers = toErectionBlockerSeries(data.blockers, (code) => codeLabel(tc, "erectionBlocker", code))
  return <section className="space-y-4" aria-label={t("erectionProgressCharts")}>
    <Card><CardHeader><CardTitle>{t("cumulativeErectionProgress")}</CardTitle><CardDescription>{t("actualSpoolsReachingEachField")}</CardDescription></CardHeader><CardContent>{curve.length ? <ChartContainer config={curveConfig} className="h-80 w-full"><LineChart data={curve}><CartesianGrid vertical={false}/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28}/><ChartTooltip content={<ChartTooltipContent indicator="line"/>}/><ChartLegend content={<ChartLegendContent/>}/><Line dataKey="toSite" stroke="var(--color-toSite)" dot={false}/><Line dataKey="erected" stroke="var(--color-erected)" dot={false}/><Line dataKey="weldedBolted" stroke="var(--color-weldedBolted)" dot={false}/><Line dataKey="supported" stroke="var(--color-supported)" dot={false}/><Line dataKey="rft" stroke="var(--color-rft)" strokeWidth={2.5} dot={false}/></LineChart></ChartContainer> : <Empty detail={t("recordAToSiteEvent")}/>}</CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>{t("fieldStageDistribution")}</CardTitle><CardDescription>{t("currentFurthestFieldStageFor")}</CardDescription></CardHeader><CardContent>{stages.some((s) => s.count > 0) ? <ChartContainer config={{ count: { label: t("spools") } }} className="h-80 w-full"><BarChart data={stages} layout="vertical"><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false}/><ChartTooltip content={<ChartTooltipContent hideLabel/>}/><Bar dataKey="count" radius={4}>{stages.map((s) => <Cell key={s.stage} fill={stageColors[s.stage] ?? "var(--neutral-fg)"}/>)}</Bar></BarChart></ChartContainer> : <Empty detail={t("acceptedFieldSpoolsAppearAfter")}/>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{t("rftBlockers")}</CardTitle><CardDescription>{t("oneSpoolCanHaveSeveral")}</CardDescription></CardHeader><CardContent>{blockers.some((b) => b.count > 0) ? <ChartContainer config={{ count: { label: t("spools") } }} className="h-80 w-full"><BarChart data={blockers} layout="vertical"><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="label" width={160} tickLine={false} axisLine={false}/><ChartTooltip content={<ChartTooltipContent hideLabel/>}/><Bar dataKey="count" fill="var(--warning-fg)" radius={4}/></BarChart></ChartContainer> : <Empty detail={t("thereAreNoOutstandingRft")}/>}</CardContent></Card>
    </div>
  </section>
}
