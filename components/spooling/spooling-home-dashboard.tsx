"use client"

import Link from "next/link"
import { useSpoolingStore } from "@/store/spooling-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Inbox, GitBranch, Send, CheckCircle2, PauseCircle,
  ArrowRight, Activity
} from "lucide-react"

const ACTIVITY_FEED = [
  { iso: "ISO-PG-001", action: "Released", detail: "Approved by Vlad Morozov (Round 2)", time: "2026-05-21", severity: "success" },
  { iso: "ISO-CW-001", action: "Released", detail: "Approved with remark by Sergey Lebedev", time: "2026-05-20", severity: "success" },
  { iso: "ISO-PG-002", action: "In Checking", detail: "Submitted by Dmitry Petrov — awaiting checker", time: "2026-05-21", severity: "info" },
  { iso: "ISO-PG-004", action: "On Hold", detail: "Engineering Hold by Mehmet Yildiz — R1 incoming", time: "2026-05-20", severity: "warning" },
  { iso: "ISO-PG-003", action: "Checked Out", detail: "Assigned to Anna Sokolova", time: "2026-05-21", severity: "info" },
]

const severityDot: Record<string, string> = {
  success: "bg-emerald-500",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
}

export function SpoolingHomeDashboard() {
  const isoRecords = useSpoolingStore((s) => s.isoRecords)
  const engTransmittals = useSpoolingStore((s) => s.engTransmittals)
  const splTransmittals = useSpoolingStore((s) => s.splTransmittals)

  const total = isoRecords.length
  const received = isoRecords.filter((i) => i.status === "Received").length
  const inProgress = isoRecords.filter((i) => ["Checked Out", "In Checking"].includes(i.status)).length
  const released = isoRecords.filter((i) => i.status === "Released").length
  const onHold = isoRecords.filter((i) => i.status === "On Hold").length
  const pendingTransmittals = engTransmittals.filter((t) => t.status === "Pending").length

  const kpis = [
    { label: "Total ISOs", value: total, color: "text-slate-900", icon: GitBranch },
    { label: "Received", value: received, color: "text-amber-700", icon: Inbox },
    { label: "In Progress", value: inProgress, color: "text-sky-700", icon: Activity },
    { label: "Released", value: released, color: "text-emerald-700", icon: CheckCircle2 },
    { label: "On Hold", value: onHold, color: "text-red-700", icon: PauseCircle },
  ]

  return (
    <div className="space-y-6">
      {pendingTransmittals > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {pendingTransmittals} engineering transmittal{pendingTransmittals > 1 ? "s" : ""} awaiting acceptance
          </span>
          <Link href="/spooling/engineering-transmittals">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 h-7">
              Review <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="py-3">
            <CardContent className="pt-2 pb-0 px-4">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/spooling/engineering-transmittals">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Engineering Transmittals</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Incoming ISO releases from engineering</div>
              <div className="mt-2 flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {engTransmittals.filter((t) => t.status === "Accepted").length} accepted
                </Badge>
                {pendingTransmittals > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{pendingTransmittals} pending</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spooling/iso-workflow">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">ISO Workflow</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Receive, checkout, check, hold, release</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {inProgress > 0 && <Badge className="bg-sky-100 text-sky-800 text-xs">{inProgress} in progress</Badge>}
                {released > 0 && <Badge className="bg-emerald-100 text-emerald-800 text-xs">{released} released</Badge>}
                {onHold > 0 && <Badge className="bg-red-100 text-red-800 text-xs">{onHold} on hold</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/spooling/spooling-transmittal">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Spooling Transmittal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-slate-500">Outbound ISO batches to Fabrication</div>
              <div className="mt-2 flex gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {splTransmittals.filter((t) => t.status === "Sent").length} sent
                </Badge>
                {released > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{released} ready to batch</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {ACTIVITY_FEED.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${severityDot[item.severity]}`} />
                <div className="flex-1">
                  <span className="font-mono font-medium">{item.iso}</span>
                  <span className="text-slate-500 mx-1">→</span>
                  <span className="font-medium">{item.action}</span>
                  <div className="text-slate-500 text-xs mt-0.5">{item.detail}</div>
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">{item.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
