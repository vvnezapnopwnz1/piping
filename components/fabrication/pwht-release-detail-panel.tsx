"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePwhtStore } from "@/store/pwht-store"
import { useWeldsStore, useNotificationsStore } from "@/store"
import { useErectionStore } from "@/store/erection-store"
import { QC_INSPECTORS } from "@/lib/spool-data"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import type { WeldJoint } from "@/lib/weld-data"
import type { FieldWeldJoint } from "@/lib/erection-weld-data"

interface Props {
  weld:
    | ((WeldJoint | FieldWeldJoint) & { source?: "shop" | "field" })
    | null
  open: boolean
  onClose: () => void
}

export function PwhtReleaseDetailPanel({ weld, open, onClose }: Props) {
  const [pwhtDate, setPwhtDate] = useState("")
  const [labRef, setLabRef] = useState("")
  const [releasedBy, setReleasedBy] = useState(QC_INSPECTORS[0])
  const [saving, setSaving] = useState(false)
  const releasePwht = usePwhtStore((s) => s.releasePwht)
  const updateShopWeld = useWeldsStore((s) => s.updateWeld)
  const updateFieldWeld = useErectionStore((s) => s.updateFieldWeld)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const { locked: pmLocked } = usePmWriteLock()

  if (!weld) return null

  const source = weld.source ?? "shop"
  const canSubmit = pwhtDate && labRef.trim() && releasedBy

  async function handleRelease() {
    if (!canSubmit || !weld) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 700))
    releasePwht({
      weldId: weld.id,
      spoolNo: weld.spoolNo,
      source,
      pwhtDate,
      labRef,
      releasedBy,
    })
    if (source === "field") {
      updateFieldWeld(weld.id, { pwhtDate })
    } else {
      updateShopWeld(weld.id, { pwhtDate })
    }
    pushNotification({
      severity: "success",
      category: "weld_progress",
      title: `${weld.jointNo}: PWHT released`,
      description: `${source === "field" ? "Field weld" : "Shop weld"} · lab ref ${labRef} · released by ${releasedBy}`,
      href: "/fabrication/pwht-release",
    })
    toast.success(`PWHT released for ${weld.jointNo}`)
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="font-mono text-base">{weld.jointNo}</SheetTitle>
            <Badge
              className={
                source === "field"
                  ? "bg-violet-100 text-violet-800"
                  : "bg-sky-100 text-sky-800"
              }
            >
              {source === "field" ? "Field weld" : "Shop weld"}
            </Badge>
          </div>
          <SheetDescription>
            Spool {weld.spoolNo} · {weld.materialType} · {weld.diaInch}
          </SheetDescription>
        </SheetHeader>
        <PmWriteLockBanner />

        <div className="flex-1 mt-4 space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="font-medium mb-1">Awaiting PWHT lab confirmation</div>
            Enter heat treatment lab certificate details to release this weld for
            downstream QC.
          </div>

          <div className="space-y-2">
            <Label className="text-xs">PWHT Completion Date</Label>
            <Input
              type="date"
              value={pwhtDate}
              onChange={(e) => setPwhtDate(e.target.value)}
              className="h-9 text-sm"
              disabled={pmLocked}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Lab Certificate Reference</Label>
            <Input
              placeholder="PWHT-LAB-2026-XXXX"
              value={labRef}
              onChange={(e) => setLabRef(e.target.value)}
              className="h-9 text-sm font-mono"
              disabled={pmLocked}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Released by</Label>
            <Select
              value={releasedBy}
              onValueChange={setReleasedBy}
              disabled={pmLocked}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QC_INSPECTORS.map((i) => (
                  <SelectItem key={i} value={i} className="text-xs">
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleRelease}
            disabled={!canSubmit || saving || pmLocked}
          >
            {saving ? "Releasing..." : "Release PWHT"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
