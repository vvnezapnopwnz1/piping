"use client"

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  hasNdeChartData,
  toNdeMethodSeries,
  toNdeOutcomeTrendSeries,
  toNdeWorkflowSeries,
} from "../domain/nde-charts"
import type { NdeChartData } from "../infrastructure/supabase-quality-repository"

const outcomeConfig = {
  accepted: { label: "Accepted", color: "var(--success-fg)" },
  rejected: { label: "Rejected", color: "var(--destructive)" },
} satisfies ChartConfig

const methodConfig = {
  pending: { label: "Pending allocation", color: "var(--neutral-fg)" },
  allocated: { label: "Allocated", color: "var(--info-fg)" },
  issued: { label: "Issued", color: "var(--warning-fg)" },
  accepted: { label: "Accepted", color: "var(--success-fg)" },
  rejected: { label: "Rejected", color: "var(--destructive)" },
} satisfies ChartConfig

const workflowColors: Record<string, string> = {
  pending: "var(--neutral-fg)",
  allocated: "var(--info-fg)",
  issued: "var(--warning-fg)",
  result_recorded: "var(--success-fg)",
}

function EmptyChart({ detail }: { detail: string }) {
  return (
    <div className="text-muted-foreground flex h-72 items-center justify-center rounded-md border border-dashed px-6 text-center text-sm">
      <div>
        <p className="font-medium">No NDE activity recorded yet.</p>
        <p className="mt-1 text-xs">{detail}</p>
      </div>
    </div>
  )
}

export function NdeChartsPanel({
  data,
  loading,
}: {
  data: NdeChartData | null
  loading: boolean
}) {
  if (loading || !data) return <Skeleton className="h-[38rem] w-full" />

  const outcomes = toNdeOutcomeTrendSeries(data.outcomes)
  const workflow = toNdeWorkflowSeries(data.workflow)
  const methods = toNdeMethodSeries(data.methods)
  const hasOutcomes = hasNdeChartData(outcomes)
  const hasWorkflow = workflow.some((step) => step.count > 0)
  const hasMethods = methods.some(
    (method) => method.pending + method.allocated + method.issued + method.accepted + method.rejected > 0,
  )

  return (
    <section className="space-y-4" aria-label="NDE quality charts">
      <Card>
        <CardHeader>
          <CardTitle>Weekly examination outcomes</CardTitle>
          <CardDescription>
            Accepted and rejected results recorded in each ISO week. This is actual inspection activity, not a forecast.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasOutcomes ? (
            <ChartContainer config={outcomeConfig} className="h-80 w-full">
              <LineChart data={outcomes} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="accepted" type="monotone" stroke="var(--color-accepted)" strokeWidth={2.5} dot={false} />
                <Line dataKey="rejected" type="monotone" stroke="var(--color-rejected)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart detail="Record an NDE result to see its weekly outcome trend." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inspection workflow</CardTitle>
            <CardDescription>Current obligations by their next operational step.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasWorkflow ? (
              <ChartContainer config={{ count: { label: "Obligations" } }} className="h-80 w-full">
                <BarChart data={workflow} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={118} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="count" radius={4}>
                    {workflow.map((step) => (
                      <Cell key={step.status} fill={workflowColors[step.status] ?? "var(--neutral-fg)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart detail="Workflow positions appear after NDE obligations are generated." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NDT method distribution</CardTitle>
            <CardDescription>Each method split into mutually exclusive inspection positions.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasMethods ? (
              <ChartContainer config={methodConfig} className="h-80 w-full">
                <BarChart data={methods} margin={{ left: 4, right: 16 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="pending" stackId="method" fill="var(--color-pending)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="allocated" stackId="method" fill="var(--color-allocated)" />
                  <Bar dataKey="issued" stackId="method" fill="var(--color-issued)" />
                  <Bar dataKey="accepted" stackId="method" fill="var(--color-accepted)" />
                  <Bar dataKey="rejected" stackId="method" fill="var(--color-rejected)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart detail="Method distribution appears after the first NDE obligation is generated." />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
