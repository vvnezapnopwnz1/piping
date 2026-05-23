"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { systems, subsystems } from "@/lib/testpack-data"
import { useTestpackStore } from "@/store/testpack-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { TestpackBuilderIsoPicker } from "./testpack-builder-iso-picker"
import type { TestPackRecord, TestMedium } from "@/lib/testpack-seed"

type Mode = { kind: "create" } | { kind: "edit"; tp: TestPackRecord }

interface Props {
  open: boolean
  onClose: () => void
  mode: Mode
}

export function TestpackBuilderSheet({ open, onClose, mode }: Props) {
  const router = useRouter()
  const createTestpack = useTestpackStore((s) => s.createTestpack)
  const updateTestpackGeneral = useTestpackStore((s) => s.updateTestpackGeneral)
  const assignIsoToTestpack = useTestpackStore((s) => s.assignIsoToTestpack)
  const removeIsoFromTestpack = useTestpackStore((s) => s.removeIsoFromTestpack)
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const { locked: pmLocked } = usePmWriteLock()

  const initial = mode.kind === "edit" ? mode.tp : null

  const [no, setNo] = useState(initial?.no ?? "")
  const [rev, setRev] = useState(initial?.rev ?? "Rev 1")
  const [testPlannedDate, setTestPlannedDate] = useState(
    initial?.testPlannedDate ?? "",
  )
  const [testMedium, setTestMedium] = useState<TestMedium>(
    initial?.testMedium ?? "Hydro",
  )
  const [unitOfTime, setUnitOfTime] = useState(initial?.unitOfTime ?? "24 h")
  const [volumeM3, setVolumeM3] = useState(initial?.volumeM3?.toString() ?? "")
  const [testPressureBar, setTestPressureBar] = useState(
    initial?.testPressureBar?.toString() ?? "",
  )
  const [system, setSystem] = useState(initial?.system ?? systems[0]?.id ?? "")
  const [subsystem, setSubsystem] = useState(initial?.subsystem ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [areaClassification, setAreaClassification] = useState(
    initial?.areaClassification ?? "Class 1",
  )
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">(
    initial?.priority ?? "Medium",
  )
  const [selectedIsoIds, setSelectedIsoIds] = useState<string[]>(
    initial?.isoIds ?? [],
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const tp = mode.kind === "edit" ? mode.tp : null
    setNo(tp?.no ?? "")
    setRev(tp?.rev ?? "Rev 1")
    setTestPlannedDate(tp?.testPlannedDate ?? "")
    setTestMedium(tp?.testMedium ?? "Hydro")
    setUnitOfTime(tp?.unitOfTime ?? "24 h")
    setVolumeM3(tp?.volumeM3?.toString() ?? "")
    setTestPressureBar(tp?.testPressureBar?.toString() ?? "")
    setSystem(tp?.system ?? systems[0]?.id ?? "")
    setSubsystem(tp?.subsystem ?? "")
    setLocation(tp?.location ?? "")
    setAreaClassification(tp?.areaClassification ?? "Class 1")
    setPriority(tp?.priority ?? "Medium")
    setSelectedIsoIds(tp?.isoIds ?? [])
  }, [open, mode])

  useEffect(() => {
    const subs = subsystems.filter((s) => s.systemId === system)
    if (subs.length > 0 && !subs.some((s) => s.id === subsystem)) {
      setSubsystem(subs[0].id)
    }
  }, [system, subsystem])

  const valid =
    selectedIsoIds.length > 0 && system && subsystem && location.trim()

  const handleSave = async () => {
    if (!valid || pmLocked) return
    setBusy(true)
    try {
      if (mode.kind === "create") {
        const { id } = await createTestpack({
          no: no.trim() || undefined,
          system,
          subsystem,
          location: location.trim(),
          areaClassification,
          priority,
          rev,
          testPlannedDate: testPlannedDate || undefined,
          testMedium,
          unitOfTime,
          volumeM3: volumeM3 ? Number(volumeM3) : undefined,
          testPressureBar: testPressureBar ? Number(testPressureBar) : undefined,
          isoIds: selectedIsoIds,
          createdBy: "PM-USER",
        })
        toast.success(`${id} created with ${selectedIsoIds.length} ISO(s)`)
        pushNotification({
          severity: "info",
          category: "testpack",
          title: `${id} test pack created`,
          description: `${selectedIsoIds.length} ISO(s) assigned · planned ${testPlannedDate || "TBD"}`,
          href: `/testpack/explorer?tp=${id}`,
        })
        router.push(`/testpack/explorer?tp=${id}`)
      } else {
        const tp = mode.tp
        updateTestpackGeneral(tp.id, {
          rev,
          testPlannedDate: testPlannedDate || undefined,
          testMedium,
          unitOfTime,
          volumeM3: volumeM3 ? Number(volumeM3) : undefined,
          testPressureBar: testPressureBar ? Number(testPressureBar) : undefined,
          priority,
          location: location.trim(),
          areaClassification,
        })
        const oldSet = new Set(tp.isoIds)
        const newSet = new Set(selectedIsoIds)
        for (const id of newSet) {
          if (!oldSet.has(id)) assignIsoToTestpack(tp.id, id)
        }
        for (const id of oldSet) {
          if (!newSet.has(id)) removeIsoFromTestpack(tp.id, id)
        }
        toast.success(`${tp.id} updated`)
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[640px]">
        <SheetHeader className="space-y-1">
          <SheetTitle>
            {mode.kind === "create" ? "New Test Pack" : `Edit ${mode.tp.id}`}
          </SheetTitle>
          <SheetDescription>
            {mode.kind === "create"
              ? "Define general info, location, and assign ISOs from the available pool."
              : "Update general/location info and adjust ISO assignment."}
          </SheetDescription>
        </SheetHeader>

        {pmLocked ? (
          <div className="my-3">
            <PmWriteLockBanner />
          </div>
        ) : null}

        <div className="space-y-6 py-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              General
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {mode.kind === "create" ? (
                <div className="col-span-2">
                  <Label htmlFor="tp-no" className="text-xs">
                    TP number (leave blank to auto-assign)
                  </Label>
                  <Input
                    id="tp-no"
                    value={no}
                    onChange={(e) => setNo(e.target.value)}
                    placeholder="TP-XXX"
                    className="h-9 text-sm"
                    disabled={pmLocked}
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="tp-rev" className="text-xs">
                  Revision
                </Label>
                <Input
                  id="tp-rev"
                  value={rev}
                  onChange={(e) => setRev(e.target.value)}
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-planned" className="text-xs">
                  Planned test date
                </Label>
                <Input
                  id="tp-planned"
                  type="date"
                  value={testPlannedDate}
                  onChange={(e) => setTestPlannedDate(e.target.value)}
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-medium" className="text-xs">
                  Test medium
                </Label>
                <Select
                  value={testMedium}
                  onValueChange={(v) => setTestMedium(v as TestMedium)}
                  disabled={pmLocked}
                >
                  <SelectTrigger id="tp-medium" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hydro">Hydro</SelectItem>
                    <SelectItem value="Pneumatic">Pneumatic</SelectItem>
                    <SelectItem value="Vacuum">Vacuum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-unit" className="text-xs">
                  Unit of time (calc)
                </Label>
                <Input
                  id="tp-unit"
                  value={unitOfTime}
                  onChange={(e) => setUnitOfTime(e.target.value)}
                  placeholder="24 h"
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-volume" className="text-xs">
                  Volume (m³, optional)
                </Label>
                <Input
                  id="tp-volume"
                  type="number"
                  step="0.1"
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(e.target.value)}
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-pressure" className="text-xs">
                  Test pressure (bar)
                </Label>
                <Input
                  id="tp-pressure"
                  type="number"
                  step="0.5"
                  value={testPressureBar}
                  onChange={(e) => setTestPressureBar(e.target.value)}
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Location & priority
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tp-system" className="text-xs">
                  System
                </Label>
                <Select
                  value={system}
                  onValueChange={setSystem}
                  disabled={pmLocked}
                >
                  <SelectTrigger id="tp-system" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.id} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-subsystem" className="text-xs">
                  Subsystem
                </Label>
                <Select
                  value={subsystem}
                  onValueChange={setSubsystem}
                  disabled={pmLocked}
                >
                  <SelectTrigger id="tp-subsystem" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subsystems
                      .filter((s) => s.systemId === system)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.id} — {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tp-loc" className="text-xs">
                  Location
                </Label>
                <Input
                  id="tp-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pipe Rack PR-01"
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-area" className="text-xs">
                  Area class.
                </Label>
                <Input
                  id="tp-area"
                  value={areaClassification}
                  onChange={(e) => setAreaClassification(e.target.value)}
                  className="h-9 text-sm"
                  disabled={pmLocked}
                />
              </div>
              <div>
                <Label htmlFor="tp-priority" className="text-xs">
                  Priority
                </Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as typeof priority)}
                  disabled={pmLocked}
                >
                  <SelectTrigger id="tp-priority" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              ISOs in this Test Pack
            </h3>
            <TestpackBuilderIsoPicker
              selectedIsoIds={selectedIsoIds}
              onChange={setSelectedIsoIds}
              editingTpId={mode.kind === "edit" ? mode.tp.id : undefined}
            />
          </section>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid || pmLocked || busy}>
            <Save className="mr-2 h-4 w-4" />
            {mode.kind === "create" ? "Create test pack" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
