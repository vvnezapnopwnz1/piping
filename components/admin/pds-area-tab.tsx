"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { toast } from "sonner"

import { useAdminStore } from "@/store/admin-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const CLEAR_ASSIGNMENT = "__none__"

export function PdsAreaTab() {
  const pdsAreas = useAdminStore((s) => s.pdsAreas)
  const subcontractors = useAdminStore((s) => s.subcontractors)
  const addPdsArea = useAdminStore((s) => s.addPdsArea)
  const assignPdsArea = useAdminStore((s) => s.assignPdsArea)
  const togglePdsAreaActive = useAdminStore((s) => s.togglePdsAreaActive)

  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [assignAreaCode, setAssignAreaCode] = useState<string | null>(null)
  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")
  const [newSub, setNewSub] = useState<string>(CLEAR_ASSIGNMENT)
  const [assignSub, setAssignSub] = useState<string>(CLEAR_ASSIGNMENT)
  const [isSaving, setIsSaving] = useState(false)

  const activeSubs = useMemo(
    () => subcontractors.filter((s) => s.active),
    [subcontractors]
  )

  const subByCode = useMemo(() => {
    const map = new Map<string, string>()
    subcontractors.forEach((s) => map.set(s.code, s.name))
    return map
  }, [subcontractors])

  const kpis = useMemo(() => {
    const total = pdsAreas.length
    const assigned = pdsAreas.filter((a) => a.assignedSubCode).length
    return { total, assigned, unassigned: total - assigned }
  }, [pdsAreas])

  const filtered = useMemo(() => {
    if (!search.trim()) return pdsAreas
    const q = search.toLowerCase()
    return pdsAreas.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.assignedSubCode &&
          subByCode.get(a.assignedSubCode)?.toLowerCase().includes(q))
    )
  }, [pdsAreas, search, subByCode])

  const handleAddArea = async () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error("Area code and name are required")
      return
    }
    if (pdsAreas.some((a) => a.code === newCode.trim())) {
      toast.error("Area code must be unique")
      return
    }
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    const code = newCode.trim()
    addPdsArea({ code, name: newName.trim() })
    if (newSub !== CLEAR_ASSIGNMENT) {
      assignPdsArea(code, newSub)
    }
    toast.success(`PDS area ${code} added`)
    setIsSaving(false)
    setAddOpen(false)
    setNewCode("")
    setNewName("")
    setNewSub(CLEAR_ASSIGNMENT)
  }

  const handleAssign = async () => {
    if (!assignAreaCode) return
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    const subCode = assignSub === CLEAR_ASSIGNMENT ? null : assignSub
    assignPdsArea(assignAreaCode, subCode)
    toast.success(
      subCode
        ? `Area ${assignAreaCode} assigned to ${subByCode.get(subCode)}`
        : `Assignment cleared for ${assignAreaCode}`
    )
    setIsSaving(false)
    setAssignAreaCode(null)
  }

  const handleToggleActive = async (areaCode: string) => {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    togglePdsAreaActive(areaCode)
    toast.success(`Area ${areaCode} updated`)
  }

  const openAssign = (areaCode: string, current: string | null) => {
    setAssignAreaCode(areaCode)
    setAssignSub(current ?? CLEAR_ASSIGNMENT)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        PDS Area × Subcontractor assignment — CC-4 scope lock source. Each area
        maps to exactly one subcontractor for operational filtering.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Total Areas" value={kpis.total} />
        <Kpi label="Assigned" value={kpis.assigned} valueClass="text-emerald-600" />
        <Kpi label="Unassigned" value={kpis.unassigned} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search area code, name, subcontractor…"
            className="h-8 w-72 pl-8 text-xs"
          />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add PDS Area
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Add PDS Area</DialogTitle>
              <DialogDescription>
                Register a new plant area and optionally assign a subcontractor.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Area Code</Label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. PR-02"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Area Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Process Area 02"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Initial assignment (optional)</Label>
                <Select value={newSub} onValueChange={setNewSub}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_ASSIGNMENT}>
                      — Unassigned
                    </SelectItem>
                    {activeSubs.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddArea} disabled={isSaving}>
                {isSaving ? "Adding…" : "Add area"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                {[
                  "Area Code",
                  "Area Name",
                  "Assigned Subcontractor",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((area, i) => (
                <tr
                  key={area.code}
                  className={cn(
                    "border-b border-slate-100",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    !area.active && "opacity-60"
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs">{area.code}</td>
                  <td className="px-3 py-2 text-xs">{area.name}</td>
                  <td className="px-3 py-2">
                    {area.assignedSubCode ? (
                      <Badge
                        variant="outline"
                        className="bg-sky-50 text-sky-700 border-sky-200 text-xs"
                      >
                        {subByCode.get(area.assignedSubCode) ??
                          area.assignedSubCode}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-500 border-slate-200 text-xs"
                      >
                        — Unassigned
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {area.active ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-600 border-slate-300 text-xs"
                      >
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            openAssign(area.code, area.assignedSubCode)
                          }
                        >
                          Assign / Reassign
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(area.code)}
                        >
                          {area.active ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!assignAreaCode}
        onOpenChange={(next) => !next && setAssignAreaCode(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign subcontractor</DialogTitle>
            <DialogDescription>
              Area {assignAreaCode} — select subcontractor or clear assignment.
            </DialogDescription>
          </DialogHeader>
          <Select value={assignSub} onValueChange={setAssignSub}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLEAR_ASSIGNMENT}>Clear assignment</SelectItem>
              {activeSubs.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignAreaCode(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({
  label,
  value,
  valueClass,
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}:</span>
      <span className={cn("font-semibold text-slate-900", valueClass)}>
        {value}
      </span>
    </div>
  )
}
