"use client"

import { useState, useMemo } from "react"
import { MoreHorizontal, Search } from "lucide-react"

import { useAdminStore, type Subcontractor } from "@/store/admin-store"
import { AddSubcontractorDialog } from "./add-subcontractor-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const SCOPE_LABELS: Record<Subcontractor["scope"][number], string> = {
  fabrication: "Fabrication",
  erection: "Erection",
  lineCheck: "Line Check",
  blinding: "Blinding",
  finishing: "Finishing",
  reinstatement: "Reinstatement",
  nde: "NDE",
}

export function SubcontractorsTab() {
  const subcontractors = useAdminStore((s) => s.subcontractors)
  const toggleSubcontractorActive = useAdminStore((s) => s.toggleSubcontractorActive)

  const [search, setSearch] = useState("")

  const kpis = useMemo(() => {
    const total = subcontractors.length
    const active = subcontractors.filter((s) => s.active).length
    const scopes = new Set<Subcontractor["scope"][number]>()
    subcontractors.forEach((s) => {
      if (s.active) {
        s.scope.forEach((sc) => scopes.add(sc))
      }
    })
    return { total, active, scopes }
  }, [subcontractors])

  const filtered = useMemo(() => {
    let rows = [...subcontractors]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.contact.toLowerCase().includes(q)
      )
    }
    return rows
  }, [subcontractors, search])

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Total:</span>
          <span className="font-semibold text-slate-900">{kpis.total}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Active:</span>
          <span className="font-semibold text-emerald-600">{kpis.active}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Scopes covered:</span>
          <span className="font-semibold text-slate-900">
            {kpis.scopes.size > 0
              ? Array.from(kpis.scopes)
                  .map((s) => SCOPE_LABELS[s])
                  .join(", ")
              : "—"}
          </span>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subcontractors…"
            className="h-8 w-72 pl-8 text-xs"
          />
        </div>
        <AddSubcontractorDialog />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Code
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Scope
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Contact
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap w-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-slate-500"
                  >
                    No subcontractors match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((sub, i) => (
                <tr
                  key={sub.code}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  )}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                    {sub.code}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-700 font-medium">
                    {sub.name}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {sub.scope.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="text-[10px] border-slate-200 text-slate-600 bg-slate-50"
                        >
                          {SCOPE_LABELS[scope]}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600 max-w-[180px] truncate">
                    {sub.contact}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {sub.active ? (
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
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                    {new Date(sub.createdAt).toLocaleDateString()}
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
                          onClick={() => toggleSubcontractorActive(sub.code)}
                        >
                          {sub.active ? "Deactivate" : "Reactivate"}
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
