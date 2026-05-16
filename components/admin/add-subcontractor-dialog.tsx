"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAdminStore, type Subcontractor } from "@/store/admin-store"
import { Plus } from "lucide-react"

const SCOPE_OPTIONS: Subcontractor["scope"][number][] = [
  "fabrication",
  "erection",
  "lineCheck",
  "blinding",
  "finishing",
  "reinstatement",
  "nde",
]

const SCOPE_LABELS: Record<Subcontractor["scope"][number], string> = {
  fabrication: "Fabrication",
  erection: "Erection",
  lineCheck: "Line Check",
  blinding: "Blinding",
  finishing: "Finishing",
  reinstatement: "Reinstatement",
  nde: "NDE",
}

export function AddSubcontractorDialog() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<Subcontractor["scope"][number][]>([])
  const [contact, setContact] = useState("")
  const [codeError, setCodeError] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const subcontractors = useAdminStore((s) => s.subcontractors)
  const addSubcontractor = useAdminStore((s) => s.addSubcontractor)

  const existingCodes = useMemo(
    () => new Set(subcontractors.map((sc) => sc.code)),
    [subcontractors]
  )

  const resetForm = () => {
    setCode("")
    setName("")
    setScopes([])
    setContact("")
    setCodeError("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const validateCode = (value: string) => {
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

  const toggleScope = (scope: Subcontractor["scope"][number]) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleAdd = async () => {
    if (!validateCode(code)) return
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsAdding(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))

    addSubcontractor({
      code: code.trim(),
      name: name.trim(),
      scope: scopes,
      contact: contact.trim(),
    })

    setIsAdding(false)
    toast.success(`Subcontractor ${code.trim()} added`)
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Subcontractor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Subcontractor</DialogTitle>
          <DialogDescription>
            Register a new subcontractor company and assign scopes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Code */}
          <div className="grid gap-1.5">
            <Label htmlFor="sub-code">Code</Label>
            <Input
              id="sub-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (codeError) validateCode(e.target.value)
              }}
              onBlur={() => validateCode(code)}
              placeholder="e.g. SUB-006"
              className={codeError ? "border-red-500" : ""}
            />
            {codeError && (
              <p className="text-xs text-red-500">{codeError}</p>
            )}
          </div>

          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reliable QC Services"
            />
          </div>

          {/* Scope */}
          <div className="grid gap-2">
            <Label>Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((scope) => (
                <div key={scope} className="flex items-center gap-2">
                  <Checkbox
                    id={`scope-${scope}`}
                    checked={scopes.includes(scope)}
                    onCheckedChange={() => toggleScope(scope)}
                  />
                  <Label
                    htmlFor={`scope-${scope}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {SCOPE_LABELS[scope]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="grid gap-1.5">
            <Label htmlFor="sub-contact">Contact</Label>
            <Input
              id="sub-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. Jane Doe / +971 50 666 6666"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!code.trim() || !name.trim() || isAdding}
          >
            {isAdding ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </span>
            ) : (
              "Add Subcontractor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
