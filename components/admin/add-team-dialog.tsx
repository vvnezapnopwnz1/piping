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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminStore, type TeamType, getTeamTypeLabel } from "@/store/admin-store"
import { Plus } from "lucide-react"

const TEAM_TYPES: TeamType[] = [
  "lineCheck",
  "blinding",
  "finishing",
  "reinstatement",
  "jointer",
]

export function AddTeamDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TeamType | "">("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [codeError, setCodeError] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const teams = useAdminStore((s) => s.teams)
  const addTeam = useAdminStore((s) => s.addTeam)

  const isJointer = type === "jointer"

  const existingCodes = useMemo(() => new Set(teams.map((t) => t.code)), [teams])

  const resetForm = () => {
    setType("")
    setCode("")
    setName("")
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

  const handleAdd = async () => {
    if (!type) return
    if (!validateCode(code)) return
    if (!isJointer && !name.trim()) {
      setCodeError("") // clear code error if any
      // We don't have a dedicated name error state; use codeError position for simplicity
      // Actually let's just use a toast for name error
      toast.error("Name is required")
      return
    }

    setIsAdding(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))

    addTeam({
      code: code.trim(),
      name: isJointer ? code.trim() : name.trim(),
      type,
    })

    setIsAdding(false)
    toast.success(`Team ${code.trim()} added`)
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Team</DialogTitle>
          <DialogDescription>
            Create a new work crew. The team code must be unique.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Type */}
          <div className="grid gap-1.5">
            <Label htmlFor="team-type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as TeamType)
                if (v === "jointer") setName("")
              }}
            >
              <SelectTrigger id="team-type" className="w-full">
                <SelectValue placeholder="Select team type" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {getTeamTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Code */}
          <div className="grid gap-1.5">
            <Label htmlFor="team-code">Code</Label>
            <Input
              id="team-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (codeError) validateCode(e.target.value)
              }}
              onBlur={() => validateCode(code)}
              placeholder="e.g. BT-05"
              className={codeError ? "border-red-500" : ""}
            />
            {codeError && (
              <p className="text-xs text-red-500">{codeError}</p>
            )}
          </div>

          {/* Name (hidden for jointer) */}
          {!isJointer && (
            <div className="grid gap-1.5">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blinding Team Echo"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!type || !code.trim() || isAdding}
          >
            {isAdding ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </span>
            ) : (
              "Add Team"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
