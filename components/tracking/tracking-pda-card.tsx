"use client"

import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Device = {
  id: string
  operator: string
  status: "Online" | "Offline"
  lastSync: string
  battery: "high" | "medium" | "low"
}

const devices: Device[] = [
  { id: "PDA-001", operator: "M. Hassan", status: "Online", lastSync: "2 min ago", battery: "high" },
  { id: "PDA-002", operator: "S. Kim", status: "Online", lastSync: "15 min ago", battery: "medium" },
  { id: "PDA-003", operator: "T. Olsen", status: "Offline", lastSync: "1 hr ago", battery: "low" },
  { id: "PDA-004", operator: "R. Patel", status: "Online", lastSync: "6 min ago", battery: "high" },
  { id: "PDA-005", operator: "A. Costa", status: "Online", lastSync: "22 min ago", battery: "medium" },
]

function getBatteryIcon(level: Device["battery"]) {
  if (level === "high") return <BatteryFull className="h-5 w-5 text-emerald-600" />
  if (level === "medium") return <BatteryMedium className="h-5 w-5 text-amber-600" />
  return <BatteryLow className="h-5 w-5 text-red-600" />
}

export function TrackingPdaCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Active PDA devices</CardTitle>
          <CardDescription>Field sync health and operator activity</CardDescription>
        </div>
        <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] uppercase tracking-wider shrink-0">
          Demo data
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs font-semibold text-slate-900">{device.id}</p>
                <Badge
                  className={cn(
                    "border text-[11px] hover:bg-transparent",
                    device.status === "Online"
                      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border-slate-300 bg-slate-200 text-slate-700",
                  )}
                >
                  {device.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-700">{device.operator}</p>
              <p className="text-xs text-slate-500">Last sync {device.lastSync}</p>
            </div>
            <div className="flex items-center gap-2">{getBatteryIcon(device.battery)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
