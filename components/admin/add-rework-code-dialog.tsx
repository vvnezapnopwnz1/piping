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
import { Textarea } from "@/components/ui/textarea"
import {
  useAdminStore,
  type ReworkCodeRecord,
} from "@/store/admin-store"

const CATEGORIES: ReworkCodeRecord["category"][] = [
  "Surface defect",
  "Internal defect",
  "Geometry",
  "Material",
  "Procedure",
]
const SEVERITIES: ReworkCodeRecord["severity"][] = [
  "Minor",
  "Major",
  "Critical",
]

interface AddReworkCodeDialogProps {
  initial?: ReworkCodeRecord
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function AddReworkCodeDialog({
  initial,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddReworkCodeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const mode = initial ? "edit" : "add"

  const reworkCodes = useAdminStore((s) => s.reworkCodes)
  const addReworkCode = useAdminStore((s) => s.addReworkCode)
  const updateReworkCode = useAdminStore((s) => s.updateReworkCode)

  const [code, setCode] = useState("")
  const [shortName, setShortName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] =
    useState<ReworkCodeRecord["category"]>("Internal defect")
  const [severity, setSeverity] =
    useState<ReworkCodeRecord["severity"]>("Major")
  const [defaultAction, setDefaultAction] = useState("")
  const [codeError, setCodeError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const existingCodes = useMemo(
    () =>
      new Set(
        reworkCodes
          .filter((r) => (initial ? r.code !== initial.code : true))
          .map((r) => r.code)
      ),
    [reworkCodes, initial]
  )

  useEffect(() => {
    if (!open) return
    if (initial) {
      setCode(initial.code)
      setShortName(initial.shortName)
      setDescription(initial.description)
      setCategory(initial.category)
      setSeverity(initial.severity)
      setDefaultAction(initial.defaultAction)
    } else {
      setCode("")
      setShortName("")
      setDescription("")
      setCategory("Internal defect")
      setSeverity("Major")
      setDefaultAction("")
    }
    setCodeError("")
  }, [open, initial])

  const handleSave = async () => {
    if (mode === "add") {
      if (!code.trim()) {
        setCodeError("Code is required")
        return
      }
      if (existingCodes.has(code.trim())) {
        setCodeError("Code must be unique")
        return
      }
    }
    if (!shortName.trim() || !description.trim()) {
      toast.error("Short name and description are required")
      return
    }

    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))

    const payload = {
      shortName: shortName.trim(),
      description: description.trim(),
      category,
      severity,
      defaultAction: defaultAction.trim() || "Grind & re-weld",
    }

    if (mode === "edit" && initial) {
      updateReworkCode(initial.code, payload)
      toast.success(`Rework code ${initial.code} updated`)
    } else {
      addReworkCode({ code: code.trim(), ...payload })
      toast.success(`Rework code ${code.trim()} added`)
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
            Add Rework Code
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Rework Code" : "Add Rework Code"}
          </DialogTitle>
          <DialogDescription>
            Defect reasons for NDE weld rejection — §3.10.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input
              value={code}
              disabled={mode === "edit"}
              onChange={(e) => {
                setCode(e.target.value)
                setCodeError("")
              }}
              className={codeError ? "border-red-500" : ""}
            />
            {codeError && <p className="text-xs text-red-500">{codeError}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label>Short Name</Label>
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as ReworkCodeRecord["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) =>
                  setSeverity(v as ReworkCodeRecord["severity"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Default Action</Label>
            <Input
              value={defaultAction}
              onChange={(e) => setDefaultAction(e.target.value)}
              placeholder="Grind & re-weld"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : mode === "edit" ? "Save" : "Add code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
