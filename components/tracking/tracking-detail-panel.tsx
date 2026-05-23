"use client"

import { useState } from "react"
import { MapPin, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TRACKING_LOCATIONS } from "@/lib/spool-tracking"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { useNotificationsStore } from "@/store/notifications-store"
import { STAGE_COLOR } from "@/lib/spool-data"
import { ActiveSpoolChip } from "./active-spool-chip"
import { cn } from "@/lib/utils"
import type { TrackingEnrichedRow } from "./use-tracking-rows"

interface Props {
  row: TrackingEnrichedRow | null
  open: boolean
  onClose: () => void
}

export function TrackingDetailPanel({ row, open, onClose }: Props) {
  const [newLocation, setNewLocation] = useState("")
  const [by, setBy] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const { locked: pmLocked } = usePmWriteLock()
  const getEventsForSpool = useSpoolTrackingStore((s) => s.getEventsForSpool)
  const manualRelocate = useSpoolTrackingStore((s) => s.manualRelocate)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)

  if (!row) return null

  const events = getEventsForSpool(row.spool.spoolNo).slice().reverse()
  const stageColor = row.fabStage ? STAGE_COLOR[row.fabStage] : null
  const canSave = newLocation.trim() && by.trim() && reason.trim()

  async function handleRelocate() {
    if (!canSave || !row) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    manualRelocate(row.spool.spoolNo, newLocation, by, reason)
    pushNotification({
      severity: "info",
      category: "tracking",
      title: `${row.spool.spoolNo} relocated`,
      description: `Manual move to ${newLocation} · by ${by} · ${reason}`,
      href: "/tracking",
    })
    toast.success(`Relocated ${row.spool.spoolNo} to ${newLocation}`)
    setNewLocation("")
    setBy("")
    setReason("")
    setSaving(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle className="font-mono text-sky-600">{row.spool.spoolNo}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{row.spool.isoNo || "—"}</span>
            {row.fabStage && stageColor ? (
              <Badge className={cn("text-xs", stageColor.bg, stageColor.text)}>
                {row.fabStage}
              </Badge>
            ) : null}
            <ActiveSpoolChip isActive={row.isActive} />
          </div>
        </SheetHeader>

        <PmWriteLockBanner />

        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPin className="h-4 w-4 text-slate-500" /> Current location
          </div>
          <p className="mt-2 text-lg font-medium text-slate-900">
            {row.cur?.location ?? "—"}
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              Days in location: <strong>{row.cur?.daysInLocation ?? "—"}</strong>
            </span>
            <span>
              Last scan: <strong>{row.cur?.lastScan?.slice(0, 10) ?? "—"}</strong>
            </span>
          </div>
          {row.transitOut.isTransitOut ? (
            <Badge className="mt-2 bg-red-100 text-red-800 border-red-300">
              Transit out from {row.transitOut.fromLocation} · {row.transitOut.outFor}d
            </Badge>
          ) : row.inconsistency.isInconsistent ? (
            <Badge className="mt-2 bg-amber-100 text-amber-800 border-amber-300">
              {row.inconsistency.reason}
            </Badge>
          ) : null}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700">Movement history</h3>
          <div className="mt-2 space-y-2">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500">No movement events yet.</p>
            ) : (
              events.map((e) => (
                <div
                  key={e.id}
                  className="rounded-md border border-slate-200 bg-white p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-slate-900">
                      {e.location}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        e.eventType === "IN"
                          ? "bg-emerald-100 text-emerald-800"
                          : e.eventType === "OUT"
                            ? "bg-red-100 text-red-800"
                            : "bg-violet-100 text-violet-800",
                      )}
                    >
                      {e.eventType}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-600">
                    By {e.by} · {new Date(e.at).toLocaleString("en-GB")}
                  </p>
                  {e.reason ? (
                    <p className="mt-1 italic text-slate-500">{e.reason}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Manual relocate</h3>
          <p className="text-xs text-slate-500">
            Append-only audit record — does not overwrite history.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <Label className="text-xs">New location</Label>
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger className="h-9 text-sm" disabled={pmLocked}>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_LOCATIONS.map((l) => (
                    <SelectItem key={l.name} value={l.name}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">By</Label>
              <Input
                value={by}
                onChange={(e) => setBy(e.target.value)}
                placeholder="e.g. SITE-FM-01"
                disabled={pmLocked}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Reason (required)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Found at Erection North after manual count"
                disabled={pmLocked}
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleRelocate}
              disabled={!canSave || saving || pmLocked}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Record relocation"}
            </Button>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  )
}
