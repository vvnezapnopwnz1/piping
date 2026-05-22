"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAdminStore, type WPSRecord } from "@/store/admin-store"
import { cn } from "@/lib/utils"

const PROCESSES: WPSRecord["process"][] = [
  "GTAW",
  "SMAW",
  "GMAW",
  "FCAW",
  "SAW",
]
const POSITION_OPTIONS = ["1G", "2G", "3G", "4G", "5G", "6G"] as const

interface AddWpsDialogProps {
  mode?: "add" | "edit"
  initial?: WPSRecord
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function AddWpsDialog({
  mode: modeProp = "add",
  initial,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddWpsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const mode = initial ? "edit" : modeProp

  const wpsList = useAdminStore((s) => s.wpsList)
  const addWps = useAdminStore((s) => s.addWps)
  const updateWps = useAdminStore((s) => s.updateWps)

  const [code, setCode] = useState("")
  const [process, setProcess] = useState<WPSRecord["process"]>("GTAW")
  const [baseMaterial, setBaseMaterial] = useState("")
  const [fillerMaterial, setFillerMaterial] = useState("")
  const [positions, setPositions] = useState<string[]>([])
  const [thicknessRange, setThicknessRange] = useState("")
  const [diameterRange, setDiameterRange] = useState("")
  const [revision, setRevision] = useState("Rev.0")
  const [approvedDate, setApprovedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [codeError, setCodeError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const existingCodes = useMemo(
    () =>
      new Set(
        wpsList
          .filter((w) => (mode === "edit" && initial ? w.code !== initial.code : true))
          .map((w) => w.code)
      ),
    [wpsList, mode, initial]
  )

  useEffect(() => {
    if (!open) return
    if (initial) {
      setCode(initial.code)
      setProcess(initial.process)
      setBaseMaterial(initial.baseMaterial)
      setFillerMaterial(initial.fillerMaterial)
      setPositions([...initial.positions])
      setThicknessRange(initial.thicknessRange)
      setDiameterRange(initial.diameterRange)
      setRevision(initial.revision)
      setApprovedDate(initial.approvedDate)
    } else {
      setCode("")
      setProcess("GTAW")
      setBaseMaterial("")
      setFillerMaterial("")
      setPositions([])
      setThicknessRange("")
      setDiameterRange("")
      setRevision("Rev.0")
      setApprovedDate(new Date().toISOString().slice(0, 10))
    }
    setCodeError("")
  }, [open, initial])

  const togglePosition = (pos: string) => {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    )
  }

  const validateCode = (value: string) => {
    if (mode === "edit") return true
    if (!value.trim()) {
      setCodeError("Code is required")
      return false
    }
    if (existingCodes.has(value.trim())) {
      setCodeError("Code must be unique")
      return false
    }
    setCodeError("")
    return true
  }

  const handleSave = async () => {
    if (mode === "add" && !validateCode(code)) return
    if (!baseMaterial.trim() || !fillerMaterial.trim()) {
      toast.error("Base and filler material are required")
      return
    }
    if (positions.length === 0) {
      toast.error("Select at least one position")
      return
    }

    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))

    const payload = {
      process,
      baseMaterial: baseMaterial.trim(),
      fillerMaterial: fillerMaterial.trim(),
      positions,
      thicknessRange: thicknessRange.trim() || "—",
      diameterRange: diameterRange.trim() || "—",
      revision: revision.trim() || "Rev.0",
      approvedDate,
    }

    if (mode === "edit" && initial) {
      updateWps(initial.code, payload)
      toast.success(`WPS ${initial.code} updated`)
    } else {
      addWps({ code: code.trim(), ...payload })
      toast.success(`WPS ${code.trim()} added`)
    }

    setIsSaving(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add WPS
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit WPS" : "Add WPS"}</DialogTitle>
          <DialogDescription>
            Welding Procedure Specification — project referential §3.5.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="wps-code">Code</Label>
            <Input
              id="wps-code"
              value={code}
              disabled={mode === "edit"}
              onChange={(e) => {
                setCode(e.target.value)
                if (codeError) validateCode(e.target.value)
              }}
              onBlur={() => validateCode(code)}
              placeholder="e.g. WPS-009"
              className={codeError ? "border-red-500" : ""}
            />
            {codeError && <p className="text-xs text-red-500">{codeError}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label>Process</Label>
            <Select
              value={process}
              onValueChange={(v) => setProcess(v as WPSRecord["process"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wps-base">Base Material</Label>
              <Input
                id="wps-base"
                value={baseMaterial}
                onChange={(e) => setBaseMaterial(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wps-filler">Filler Material</Label>
              <Input
                id="wps-filler"
                value={fillerMaterial}
                onChange={(e) => setFillerMaterial(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Positions</Label>
            <div className="flex flex-wrap gap-1.5">
              {POSITION_OPTIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  className="focus:outline-none"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer text-xs",
                      positions.includes(pos)
                        ? "bg-sky-50 text-sky-700 border-sky-300"
                        : "bg-white text-slate-600"
                    )}
                  >
                    {pos}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wps-thickness">Thickness Range</Label>
              <Input
                id="wps-thickness"
                value={thicknessRange}
                onChange={(e) => setThicknessRange(e.target.value)}
                placeholder="3–25 mm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wps-diameter">Diameter Range</Label>
              <Input
                id="wps-diameter"
                value={diameterRange}
                onChange={(e) => setDiameterRange(e.target.value)}
                placeholder="DN 25–DN 300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="wps-revision">Revision</Label>
              <Input
                id="wps-revision"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wps-approved">Approved Date</Label>
              <Input
                id="wps-approved"
                type="date"
                value={approvedDate}
                onChange={(e) => setApprovedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving ||
              (mode === "add" && !code.trim()) ||
              !baseMaterial.trim() ||
              !fillerMaterial.trim()
            }
          >
            {isSaving ? "Saving…" : mode === "edit" ? "Save changes" : "Add WPS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
