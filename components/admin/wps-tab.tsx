"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal, Search } from "lucide-react"
import { toast } from "sonner"

import { AddWpsDialog } from "@/components/admin/add-wps-dialog"
import { useAdminStore } from "@/store/admin-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatDate } from "@/lib/utils"

export function WpsTab() {
  const wpsList = useAdminStore((s) => s.wpsList)
  const supersededWps = useAdminStore((s) => s.supersededWps)

  const [search, setSearch] = useState("")
  const [editingCode, setEditingCode] = useState<string | null>(null)

  const kpis = useMemo(() => {
    const total = wpsList.length
    const active = wpsList.filter((w) => w.status === "Active").length
    const superseded = wpsList.filter((w) => w.status === "Superseded").length
    return { total, active, superseded }
  }, [wpsList])

  const filtered = useMemo(() => {
    if (!search.trim()) return wpsList
    const q = search.toLowerCase()
    return wpsList.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.baseMaterial.toLowerCase().includes(q) ||
        w.fillerMaterial.toLowerCase().includes(q)
    )
  }, [wpsList, search])

  const editingWps = useMemo(
    () => wpsList.find((w) => w.code === editingCode) ?? null,
    [wpsList, editingCode]
  )

  const handleSupersede = async (code: string) => {
    if (!window.confirm(`Mark ${code} as Superseded?`)) return
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    supersededWps(code)
    toast.success(`WPS ${code} superseded`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Total WPS" value={kpis.total} />
        <Kpi label="Active" value={kpis.active} valueClass="text-emerald-600" />
        <Kpi label="Superseded" value={kpis.superseded} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, base material, filler…"
            className="h-8 w-72 pl-8 text-xs"
          />
        </div>
        <AddWpsDialog />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                {[
                  "Code",
                  "Process",
                  "Base Material",
                  "Filler",
                  "Positions",
                  "Thickness",
                  "Diameter",
                  "Revision",
                  "Approved",
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No WPS records match the current search.
                  </td>
                </tr>
              )}
              {filtered.map((w, i) => {
                const visiblePos = w.positions.slice(0, 4)
                const remaining = w.positions.length - 4
                const isSuperseded = w.status === "Superseded"
                return (
                  <tr
                    key={w.code}
                    className={cn(
                      "border-b border-slate-100 transition-colors",
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                      isSuperseded && "opacity-60"
                    )}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                      {w.code}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                      {w.process}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700">
                      {w.baseMaterial}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.fillerMaterial}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {visiblePos.map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-600 bg-slate-50"
                          >
                            {p}
                          </Badge>
                        ))}
                        {remaining > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-slate-200 text-slate-500 bg-slate-50"
                          >
                            +{remaining} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.thicknessRange}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.diameterRange}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {w.revision}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(w.approvedDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {w.status === "Active" ? (
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
                          Superseded
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingCode(w.code)}
                          >
                            Edit
                          </DropdownMenuItem>
                          {w.status === "Active" && (
                            <DropdownMenuItem
                              onClick={() => handleSupersede(w.code)}
                            >
                              Supersede
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingWps && (
        <AddWpsDialog
          mode="edit"
          initial={editingWps}
          open={!!editingCode}
          onOpenChange={(next) => {
            if (!next) setEditingCode(null)
          }}
          trigger={null}
        />
      )}
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
