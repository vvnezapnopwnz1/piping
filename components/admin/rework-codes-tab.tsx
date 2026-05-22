"use client"

import { useMemo, useState } from "react"
import { MoreHorizontal, Search } from "lucide-react"
import { toast } from "sonner"

import { AddReworkCodeDialog } from "@/components/admin/add-rework-code-dialog"
import { useAdminStore, type ReworkCodeRecord } from "@/store/admin-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const CATEGORY_OPTIONS: ("All" | ReworkCodeRecord["category"])[] = [
  "All",
  "Surface defect",
  "Internal defect",
  "Geometry",
  "Material",
  "Procedure",
]

const SEVERITY_STYLES: Record<string, string> = {
  Minor: "bg-slate-100 text-slate-600 border-slate-300",
  Major: "bg-amber-50 text-amber-700 border-amber-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
}

export function ReworkCodesTab() {
  const reworkCodes = useAdminStore((s) => s.reworkCodes)
  const toggleReworkCodeActive = useAdminStore((s) => s.toggleReworkCodeActive)

  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<
    "All" | ReworkCodeRecord["category"]
  >("All")
  const [editingCode, setEditingCode] = useState<string | null>(null)

  const kpis = useMemo(() => {
    const active = reworkCodes.filter((r) => r.active)
    return {
      total: reworkCodes.length,
      critical: active.filter((r) => r.severity === "Critical").length,
      major: active.filter((r) => r.severity === "Major").length,
      minor: active.filter((r) => r.severity === "Minor").length,
    }
  }, [reworkCodes])

  const filtered = useMemo(() => {
    let rows = [...reworkCodes]
    if (filterCategory !== "All") {
      rows = rows.filter((r) => r.category === filterCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      )
    }
    return rows
  }, [reworkCodes, search, filterCategory])

  const editingRecord = useMemo(
    () => reworkCodes.find((r) => r.code === editingCode) ?? null,
    [reworkCodes, editingCode]
  )

  const handleToggle = async (code: string) => {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200))
    toggleReworkCodeActive(code)
    toast.success("Rework code updated")
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Weld rework reasons — §3.10. Used by QC engineers when rejecting an NDE
        batch.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Kpi label="Total codes" value={kpis.total} />
        <Kpi label="Critical" value={kpis.critical} />
        <Kpi label="Major" value={kpis.major} />
        <Kpi label="Minor" value={kpis.minor} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {CATEGORY_OPTIONS.map((cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "h-7 text-xs",
                filterCategory === cat
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : "text-slate-600"
              )}
            >
              {cat}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, or description…"
              className="h-8 w-64 pl-8 text-xs"
            />
          </div>
          <AddReworkCodeDialog />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                {[
                  "Code",
                  "Short Name",
                  "Description",
                  "Category",
                  "Severity",
                  "Default Action",
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
              {filtered.map((r, i) => (
                <tr
                  key={r.code}
                  className={cn(
                    "border-b border-slate-100",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                    !r.active && "opacity-60"
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-2 text-xs font-medium">{r.shortName}</td>
                  <td className="px-3 py-2 text-xs max-w-md">{r.description}</td>
                  <td className="px-3 py-2 text-xs">{r.category}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", SEVERITY_STYLES[r.severity])}
                    >
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.defaultAction}</td>
                  <td className="px-3 py-2">
                    {r.active ? (
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
                          onClick={() => setEditingCode(r.code)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(r.code)}>
                          {r.active ? "Deactivate" : "Reactivate"}
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

      {editingRecord && (
        <AddReworkCodeDialog
          initial={editingRecord}
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
