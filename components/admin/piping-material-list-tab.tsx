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

export function PipingMaterialListTab() {
  const pipingMaterialList = useAdminStore((s) => s.pipingMaterialList)
  const systemReferentials = useAdminStore((s) => s.systemReferentials)
  const addHeatRecord = useAdminStore((s) => s.addHeatRecord)
  const toggleHeatRecordActive = useAdminStore((s) => s.toggleHeatRecordActive)

  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [heatNo, setHeatNo] = useState("")
  const [material, setMaterial] = useState("")
  const [grade, setGrade] = useState("")
  const [millCertRef, setMillCertRef] = useState("")
  const [supplier, setSupplier] = useState("")
  const [heatError, setHeatError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const materialOptions = useMemo(
    () =>
      systemReferentials.materialTypes
        .filter((m) => m.active)
        .map((m) => m.code),
    [systemReferentials.materialTypes]
  )

  const kpis = useMemo(() => {
    const total = pipingMaterialList.length
    const active = pipingMaterialList.filter((h) => h.active).length
    return { total, active, inactive: total - active }
  }, [pipingMaterialList])

  const filtered = useMemo(() => {
    if (!search.trim()) return pipingMaterialList
    const q = search.toLowerCase()
    return pipingMaterialList.filter(
      (h) =>
        h.heatNo.toLowerCase().includes(q) ||
        h.material.toLowerCase().includes(q) ||
        h.supplier.toLowerCase().includes(q)
    )
  }, [pipingMaterialList, search])

  const handleAdd = async () => {
    if (!heatNo.trim()) {
      setHeatError("Heat number is required")
      return
    }
    if (pipingMaterialList.some((h) => h.heatNo === heatNo.trim())) {
      setHeatError("Heat number must be unique")
      return
    }
    setHeatError("")
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    addHeatRecord({
      heatNo: heatNo.trim(),
      material: material.trim() || "—",
      grade: grade.trim() || "—",
      millCertRef: millCertRef.trim() || "—",
      supplier: supplier.trim() || "—",
    })
    toast.success(`Heat ${heatNo.trim()} added`)
    setIsSaving(false)
    setOpen(false)
    setHeatNo("")
    setMaterial("")
    setGrade("")
    setMillCertRef("")
    setSupplier("")
  }

  const handleDeactivate = async (no: string) => {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    toggleHeatRecordActive(no)
    toast.success(`Heat ${no} updated`)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Project Piping Material List — approved heat numbers for material check
        validation (§3.7).
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Total Heat Records" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} valueClass="text-emerald-600" />
        <Kpi label="Inactive" value={kpis.inactive} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search heat no, material, supplier…"
            className="h-8 w-72 pl-8 text-xs"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Heat Record
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Add Heat Record</DialogTitle>
              <DialogDescription>
                Register mill heat number and certificate reference.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Heat No</Label>
                <Input
                  value={heatNo}
                  onChange={(e) => {
                    setHeatNo(e.target.value)
                    if (heatError) setHeatError("")
                  }}
                  placeholder="HT-2024-009"
                  className={heatError ? "border-red-500" : ""}
                />
                {heatError && (
                  <p className="text-xs text-red-500">{heatError}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Material</Label>
                {materialOptions.length > 0 ? (
                  <Select
                    value={material || undefined}
                    onValueChange={setMaterial}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material type" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOptions.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="CS-A106B"
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Grade</Label>
                <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Mill Cert Ref</Label>
                <Input
                  value={millCertRef}
                  onChange={(e) => setMillCertRef(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Supplier</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isSaving || !heatNo.trim()}>
                {isSaving ? "Adding…" : "Add record"}
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
                  "Heat No",
                  "Material",
                  "Grade",
                  "Mill Cert Ref",
                  "Supplier",
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
              {filtered.map((h, i) => (
                <tr
                  key={h.heatNo}
                  className={cn(
                    "border-b border-slate-100",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    !h.active && "opacity-60"
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs">{h.heatNo}</td>
                  <td className="px-3 py-2 text-xs">{h.material}</td>
                  <td className="px-3 py-2 text-xs">{h.grade}</td>
                  <td className="px-3 py-2 text-xs">{h.millCertRef}</td>
                  <td className="px-3 py-2 text-xs">{h.supplier}</td>
                  <td className="px-3 py-2">
                    {h.active ? (
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
                          onClick={() => handleDeactivate(h.heatNo)}
                        >
                          {h.active ? "Deactivate" : "Reactivate"}
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
