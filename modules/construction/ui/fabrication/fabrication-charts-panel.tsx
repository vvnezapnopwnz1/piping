"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"

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

const curveConfig = {
  startFab: { label: "Start Fab", color: "var(--info-fg)" },
  fabricated: { label: "Fabricated", color: "var(--primary)" },
  qcRelease: { label: "QC Release", color: "var(--warning-fg)" },
  laydown: { label: "Laydown", color: "var(--success-fg)" },
} satisfies ChartConfig

const areaConfig = {
  complete: { label: "Complete", color: "var(--success-fg)" },
  inProgress: { label: "In progress", color: "var(--info-fg)" },
  notStarted: { label: "Not started", color: "var(--neutral-fg)" },
} satisfies ChartConfig

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
  return (
    <div className="text-muted-foreground flex h-72 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm">
      <div>
        <p className="font-medium">No fabrication progress recorded yet.</p>
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
  if (loading || !data) {
    return <Skeleton className="h-[38rem] w-full" />
  }

  const curve = toFabricationCurveSeries(data.curve)
  const stages = toStageDistributionSeries(data.stages)
  const areas = toPdsAreaProgressSeries(data.pdsAreas)
  const hasCurve = hasFabricationChartData(curve)
  const hasStages = stages.some((stage) => stage.count > 0)
  const hasAreas = areas.some((area) => area.complete + area.inProgress + area.notStarted > 0)

  return (
    <section className="space-y-4" aria-label="Fabrication progress charts">
      <Card>
        <CardHeader>
          <CardTitle>Cumulative fabrication progress</CardTitle>
          <CardDescription>
            Actual count of spools that reached each key milestone by the end of the ISO week.
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
            <EmptyChart detail="Record fabrication activity to see the actual S-curve." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stage distribution</CardTitle>
            <CardDescription>Current spool position, in fabrication pipeline order.</CardDescription>
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
              <EmptyChart detail="The pipeline distribution appears after the first spool is recorded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress by PDS area</CardTitle>
            <CardDescription>Completed, active and untouched spools by responsible area.</CardDescription>
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
              <EmptyChart detail="Area progress appears after a spool is added to an active PDS area." />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
