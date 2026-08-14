"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { toErectionBlockerSeries, toErectionCurveSeries, toErectionStageSeries } from "../../domain/erection-charts"
import type { ErectionChartData } from "../../infrastructure/supabase-erection-repository"

const curveConfig = { toSite: { label: "To Site", color: "var(--info-fg)" }, erected: { label: "Erected", color: "var(--primary)" }, weldedBolted: { label: "Welded / Bolted", color: "var(--warning-fg)" }, supported: { label: "Supported", color: "var(--success-fg)" }, rft: { label: "Ready for Test", color: "var(--success-fg)" } } satisfies ChartConfig
const stageColors: Record<string, string> = { not_started: "var(--neutral-fg)", to_site: "var(--info-fg)", erected: "var(--primary)", welded_bolted: "var(--warning-fg)", supported: "var(--success-fg)", rft: "var(--success-fg)" }

const Empty = ({ detail }: { detail: string }) => <div className="text-muted-foreground flex h-72 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm"><div><p className="font-medium">No erection progress recorded yet.</p><p className="mt-1 text-xs">{detail}</p></div></div>

export function ErectionChartsPanel({ data, loading }: { data: ErectionChartData | null; loading: boolean }) {
  if (loading || !data) return <Skeleton className="h-[38rem] w-full" />
  const curve = toErectionCurveSeries(data.curve)
  const stages = toErectionStageSeries(data.stages)
  const blockers = toErectionBlockerSeries(data.blockers)
  return <section className="space-y-4" aria-label="Erection progress charts">
    <Card><CardHeader><CardTitle>Cumulative erection progress</CardTitle><CardDescription>Actual spools reaching each field milestone by the end of the ISO week.</CardDescription></CardHeader><CardContent>{curve.length ? <ChartContainer config={curveConfig} className="h-80 w-full"><LineChart data={curve}><CartesianGrid vertical={false}/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28}/><ChartTooltip content={<ChartTooltipContent indicator="line"/>}/><ChartLegend content={<ChartLegendContent/>}/><Line dataKey="toSite" stroke="var(--color-toSite)" dot={false}/><Line dataKey="erected" stroke="var(--color-erected)" dot={false}/><Line dataKey="weldedBolted" stroke="var(--color-weldedBolted)" dot={false}/><Line dataKey="supported" stroke="var(--color-supported)" dot={false}/><Line dataKey="rft" stroke="var(--color-rft)" strokeWidth={2.5} dot={false}/></LineChart></ChartContainer> : <Empty detail="Record a To Site event to start the actual curve."/>}</CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Field stage distribution</CardTitle><CardDescription>Current furthest field stage for each accepted spool.</CardDescription></CardHeader><CardContent>{stages.some((s) => s.count > 0) ? <ChartContainer config={{ count: { label: "Spools" } }} className="h-80 w-full"><BarChart data={stages} layout="vertical"><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false}/><ChartTooltip content={<ChartTooltipContent hideLabel/>}/><Bar dataKey="count" radius={4}>{stages.map((s) => <Cell key={s.stage} fill={stageColors[s.stage] ?? "var(--neutral-fg)"}/>)}</Bar></BarChart></ChartContainer> : <Empty detail="Accepted field spools appear after engineering import."/>}</CardContent></Card>
      <Card><CardHeader><CardTitle>RFT blockers</CardTitle><CardDescription>One spool can have several blockers; counts are intentionally not additive.</CardDescription></CardHeader><CardContent>{blockers.some((b) => b.count > 0) ? <ChartContainer config={{ count: { label: "Spools" } }} className="h-80 w-full"><BarChart data={blockers} layout="vertical"><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="label" width={160} tickLine={false} axisLine={false}/><ChartTooltip content={<ChartTooltipContent hideLabel/>}/><Bar dataKey="count" fill="var(--warning-fg)" radius={4}/></BarChart></ChartContainer> : <Empty detail="There are no outstanding RFT blockers in the visible scope."/>}</CardContent></Card>
    </div>
  </section>
}
