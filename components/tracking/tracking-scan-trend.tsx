"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const scanTrendData = [
  { day: "May 01", scans: 320 },
  { day: "May 02", scans: 380 },
  { day: "May 03", scans: 410 },
  { day: "May 04", scans: 290 },
  { day: "May 05", scans: 340 },
  { day: "May 06", scans: 450 },
  { day: "May 07", scans: 520 },
  { day: "May 08", scans: 487 },
  { day: "May 09", scans: 510 },
  { day: "May 10", scans: 478 },
  { day: "May 11", scans: 495 },
  { day: "May 12", scans: 533 },
  { day: "May 13", scans: 502 },
  { day: "May 14", scans: 487 },
]

export function TrackingScanTrend() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Scans by day</CardTitle>
          <CardDescription>14-day scan activity from PDA devices</CardDescription>
        </div>
        <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] uppercase tracking-wider shrink-0">
          Demo data
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={scanTrendData}
              margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scanTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                formatter={(value: number) => [`${value} scans`, "Count"]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "#E2E8F0",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#scanTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
